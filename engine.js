let Game=new function () {
  this.initialize=function(canvasEleId,sprite_data,callback){
    this.canvas=document.getElementById(canvasEleId);
    
    this.playerOffset=10;
    this.canvasMultiplier=1;
    this.setupMobile();
    
    this.width=this.canvas.width;
    this.height=this.canvas.height;
    
    this.ctx=this.canvas.getContext && this.canvas.getContext('2d');
    if(!this.ctx) return alert('Please upgrade your browser to play');
    
    this.setupInput();
    if(this.mobile){
      this.setBoard(4,new TouchControls());
    }
    this.loop();
    SpriteSheet.load(sprite_data,callback);
  };
  
  let KEY_CODES={37:'left',39:'right',32:'fire'};
  this.keys={};
  this.setupInput=function(){
    window.addEventListener('keydown',function(e){
      if(KEY_CODES[e.keyCode]){
        Game.keys[KEY_CODES[e.keyCode]]=true;
        e.preventDefault();
      }
    },false);
    window.addEventListener('keyup',function(e){
      if(KEY_CODES[e.keyCode]){
        Game.keys[KEY_CODES[e.keyCode]]=false;
        e.preventDefault();
      }
    },false);
  };
  
  let boards=[];
  this.loop=function(){
    let dt=30/1000;
    for(let i=0,len=boards.length;i<len;i++){
      if(boards[i]){
        boards[i].step(dt);
        //step可能刪除面板等動作，需再次檢查是否存在以免代碼崩潰
        boards[i] && boards[i].draw(Game.ctx);
      }
    }
    //每30ms調用一次，Timeout確保不留上下文備份，避免奇怪錯位&遊戲速度下降
    setTimeout(Game.loop,30);
  };
  
  this.setBoard=function(num,board){boards[num]=board};
  
  this.setupMobile=function(){
    let container=document.getElementById('container'),
        hasTouch= !!('ontouchstart' in window),
        w=window.innerWidth, h=window.innerHeight;
    if(hasTouch) mobile=true;
    if(screen.width >=1280 || !hasTouch) return false;
    if(w>h){
      alert('Please rotate the device and then click OK');
      w=window.innerWidth; h=window.innerHeight;
    }
    container.style.height=h*2+'px';
    window.scrollTo(0,1);
    
    h=window.innerHeight+2;
    container.style.height=h+'px';
    container.style.width=w+'px';
    container.style.padding=0;
    
    if(h>=this.canvas.height*1.75|| w>=this.canvas.height*1.75){
      this.canvasMultiplier=2;
      this.canvas.width=w/2;
      this.canvas.height=h/2;
      this.canvas.style.width=w+'px';
      this.canvas.style.height=h+'px';
    }else{
      this.canvas.width=w;
      this.canvas.height=h;
    }
    this.canvas.style.position='absolute';
    this.canvas.style.left='0px';
    this.canvas.style.top='0px';
  };
  return this;
};

let SpriteSheet=new function(){
  this.map={};
  this.load=function(spriteData,callback){
    this.map=spriteData;
    this.image=new Image();
    //設置callback之後才設置src以避免圖像被緩存，IE下被緩存可能不會觸發回調
    this.image.onload=callback;
    this.image.src='images/sprites.png';
  };
  this.draw=function(ctx,sprite,x,y,frame){
    let s=this.map[sprite];
    if(!frame) frame=0;
    ctx.drawImage(this.image, s.sx + frame*s.w, s.sy, s.w, s.h,
      x, y, s.w, s.h);
  }
};

let TitleScreen=function(title,subtitle,callback){
  this.step=function(dt){
    if(Game.keys['fire'] && callback) callback();
  };
  this.draw=function(ctx){
    ctx.fillStyle='#fff';
    ctx.textAlign='center';
    ctx.font='bold 40px Abril Fatface';
    ctx.fillText(title,Game.width/2,Game.height/2-40);
    
    ctx.font='bold 20px Abril Fatface';
    ctx.fillText(subtitle,Game.width/2,Game.height/2+40);
  }
};

let GameBoard=function(){
  let board=this;
  this.objects=[];
  this.cnt={};
  
  this.add=function(obj){
    obj.board=this;
    this.objects.push(obj);
    this.cnt[obj.type]=(this.cnt[obj.type]||0) + 1;
    return obj;
  };
  //將要刪除的對象添加至刪除列表
  this.remove=function(obj){
    let wasDead= this.removed.indexOf(obj);
    if(wasDead == -1){
      this.removed.push(obj);
      return true;
    }else return false;
    //this.removed.push(obj)
  };
  
  this.resetRemoved=()=>this.removed=[];
  
  this.finalizeRemoved=()=>{
    for(let i=0,len=this.removed.length;i<len;i++){
      let idx=this.objects.indexOf(this.removed[i]);
      if(idx != -1){
        this.cnt[this.removed[i].type]--;
        this.objects.splice(idx,1);
      }
    }
  };
  
  this.iterate=function(func){
    //將第二個以後參數的arguments轉成真數組
    let args=Array.prototype.slice.call(arguments,1);
    for(let i=0,len=this.objects.length; i<len; i++){
      let obj=this.objects[i];
      obj[func].apply(obj,args);
    }
  };
  
  this.detect=function(func){
    for(let i=0,val=null,len=this.objects.length; i<len; i++){
      if(func.call(this.objects[i])) return this.objects[i];
    }
    return false;
  };
  
  this.step=function(dt){
    this.resetRemoved();
    this.iterate('step',dt);
    this.finalizeRemoved();
  };
  this.draw=function(ctx){
    this.iterate('draw',ctx);
  };
  
  this.overlap=function(o1,o2){
    return !((o1.y+o1.h-1<o2.y)|| (o1.y>o2.y+o2.h-1)||
             (o1.x+o1.w-1<o2.x)|| (o1.x>o2.x+o2.w-1));
  };
  this.collide=function(obj,type){
    return this.detect(function(){
      if(obj!=this){
        let col=(!type || this.type&type)&&board.overlap(obj,this);
        return col?this:false;
      }
    })
  }
};

function Sprite(){}
Sprite.prototype.setup=function(sprite,props){
  this.sprite=sprite;
  this.merge(props);
  this.frame=this.frame||0;
  this.w=SpriteSheet.map[sprite].w;
  this.h=SpriteSheet.map[sprite].h;
};
Sprite.prototype.merge=function(props){
  if(props){
    for(let prop in props) this[prop] = props[prop];
  }
};
Sprite.prototype.draw=function(ctx){
  SpriteSheet.draw(ctx, this.sprite, this.x, this.y, this.frame);
};
Sprite.prototype.hit=function(damage){
  this.board.remove(this);
};

let Level=function(levelData,callback){
  this.levelData=[];
  for(let i=0;i<levelData.length;i++){
    this.levelData.push(Object.create(levelData[i]));
  }
  this.t=0;
  this.callback=callback;
};
Level.prototype.step=function(dt){
  let idx=0,remove=[],curShip;
  this.t += dt*1000;
  //[start, end, gap, type, {override}]
  while((curShip=this.levelData[idx]) && (curShip[0]<this.t+2000)){
    if(this.t > curShip[1]){
      remove.push(curShip);
    }else if(curShip[0]<this.t){
      let enemy=enemies[curShip[3]],
          override=curShip[4];
      this.board.add(new Enemy(enemy,override));
      curShip[0]+=curShip[2];
    }
    idx++;
  }
  //Remove any objects from the levelData that have passed
  for(let i=0,len=remove.length; i<len; i++){
    let remIdx=this.levelData.indexOf(remove[i]);
    if(remIdx!=-1) this.levelData.splice(remIdx,1);
  }
  //If no more enemies on board or in levelData, this level is done.
  if(this.levelData.length==0 && this.board.cnt[OBJECT_ENEMY]==0){
    if(this.callback) this.callback();
  }
};
//dummy method, doesn't draw anything
Level.prototype.draw=function(ctx){};

let TouchControls=function(){
  let gutterWidth=10,
      unitWidth=Game.width/5,
      blockWidth=unitWidth-gutterWidth;
  this.drawSquare=function(ctx, x, y, txt, on){
    ctx.globalAlpha=on?0.9:0.6;
    ctx.fillStyle='#ccc';
    //ctx.fillRect(x, y, blockWidth, blockWidth);
    ctx.beginPath();
    ctx.arc(x, y, blockWidth/1.5, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle='#fff';
    ctx.textAlign='center';
    ctx.globalAlpha=1.0;
    ctx.font='bold'+(3*unitWidth/4)+'px arial';
    
    ctx.fillText(txt, x+blockWidth/2-26, y+3*blockWidth/4-32);
  };
  let yLoc=Game.height-unitWidth;
  this.draw=function(ctx){
    ctx.save();
    this.drawSquare(ctx, unitWidth+gutterWidth*2, yLoc+20, '\u25c0',
                    Game.keys['left']);
    //this.drawSquare(ctx, unitWidth+gutterWidth, yLoc, '\u25B6',
    //               Game.keys['right']);
    this.drawSquare(ctx, Game.width-gutterWidth*4, yLoc+20, '\u25B6',
                    Game.keys['right']);
    this.drawSquare(ctx, unitWidth-20, yLoc-(yLoc/9), 'S', Game.keys['fire']);
    ctx.restore();
  };
  this.step=function(dt){};
  
  this.trackTouch=function(e){
    let touch,x,y;
    e.preventDefault();
    Game.keys['left']=false;
    Game.keys['right']=false;
    for(let i=0;i<e.targetTouches.length;i++){
      touch=e.targetTouches[i];
      x=touch.pageX/Game.canvasMultiplier-Game.canvas.offsetLeft;
      if(x<(unitWidth+gutterWidth*4) && x>gutterWidth) Game.keys['left']=true;
      if(x>Game.width-gutterWidth*4) Game.keys['right']=true;
    }
    if(e.type=='touchstart' || e.type=='touched'){
      for(let i=0;i<e.changedTouches.length;i++){
        touch=e.changedTouches[i];
        x=touch.pageX/Game.canvasMultiplier-Game.canvas.offsetLeft;
        y=touch.pageY/Game.canvasMultiplier-Game.canvas.offsetTop;
        if(x < unitWidth*2 && x > yLoc) Game.keys['fire']=(e.type=='touchstart');
      }
    }
  };
  Game.canvas.addEventListener('touchstart',this.trackTouch,true);
  Game.canvas.addEventListener('touchmove',this.trackTouch,true);
  Game.canvas.addEventListener('touchend',this.trackTouch,true);
  Game.playerOffset=unitWidth+20;
};

let GamePoints=function(){
  Game.points=0;
  let pointLength=8;
  this.draw=function(ctx){
    ctx.save();
    ctx.font='bold 18px arial';
    ctx.fillStyle='#fff';
    
    let txt=''+Game.points;
    
    let i=pointLength-txt.length, zeros='';
    while(i-- > 0) zeros+='0';
    ctx.fillText(zeros+txt,10,20);
    
    ctx.restore();
  };
  this.step=function(dt){}
};
