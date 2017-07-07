let Game=new function () {
  this.initialize=function(canvasEleId,sprite_data,callback){
    this.canvas=document.getElementById(canvasEleId);
    this.width=this.canvas.width;
    this.height=this.canvas.height;
    
    this.ctx=this.canvas.getContext && this.canvas.getContext('2d');
    if(!this.ctx) return alert('Please upgrade your browser to play');
    
    this.setupInput();
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
  
  this.setBoard=(num,board)=>boards[num]=board;
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
  this.cnt=[];
  
  this.add=function(obj){
    obj.board=this;
    this.objects.push(obj);
    this.cnt[obj.type]=(this.cnt[obj.type]||0) + 1;
    return obj;
  };
  //將要刪除的對象添加至刪除列表
  this.remove=function(obj){
    let wasDead= this.removed.indexOf(obj) != -1;
    if(wasDead) this.removed.push(obj);
    return wasDead;
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
    return !((o1.y+o1.h-1<o2.y)||(o1.y>o2.y+o2.h-1)||
             (o1.x+o1.w-1<o2.x)|| (o1.x>o2.x+o2.w-1));
  };
  this.collide=function(obj,type){
    return this.detect(function(){
      if(obj!=this){
        let col=(!type||this.type&type)&&board.overlap(obj,this);
        return col?this:false;
      }
    })
  }
};

