window.addEventListener('load',function(){
  Game.initialize('game',sprites,startGame);
});

let sprites={
  ship:{sx:0,sy:0,w:37,h:42,frame:1},
  missile:{sx:0,sy:30,w:2,h:10,frame:1}
};

let startGame=function(){
  Game.setBoard(0,new Starfield(20,0.4,100,true));
  Game.setBoard(1,new Starfield(50,0.6,100));
  Game.setBoard(2,new Starfield(100,1.0,50));
  Game.setBoard(3,new TitleScreen('Shayqi Invasion',
                                  'press space to start playing',playGame));
};
let playGame=function(){
  let board=new GameBoard();
  board.add(new PlayerShip());
  Game.setBoard(3,board);
};

let Starfield =function(speed,opacity,numStars,clear){
  let stars=document.createElement('canvas');
  stars.width=Game.width;
  stars.height=Game.height;
  let starCtx=stars.getContext('2d');
  let offset=0;
  
  if(clear){
    starCtx.fillStyle='#000';
    starCtx.fillRect(0,0,stars.width,stars.height);
  }
  
  starCtx.fillStyle='#fff';
  starCtx.globalAlpha=opacity;
  for(let i=0;i<numStars;i++){
    starCtx.fillRect(Math.floor(Math.random()*stars.width),
      Math.floor(Math.random()*stars.height),
      2,2);
  }
  
  this.draw=function(ctx){
    let intOffset = Math.floor(offset),
        remaining=stars.height-intOffset;
    //Draw the top half of starfield.
    if(intOffset>0){
      ctx.drawImage(stars,
                    0, remaining, stars.width, intOffset,
                    0, 0, stars.width, intOffset);
    }
    //Draw the bottom half of starfield.
    if(remaining>0){
      ctx.drawImage(stars,
                    0, 0, stars.width, remaining,
                    0, intOffset, stars.width, remaining);
    }
  };
  this.step=function(dt){
    offset+=dt*speed;
    offset=offset%stars.height;
  }
};

let PlayerShip=function(){
  this.w=SpriteSheet.map['ship'].w;
  this.h=SpriteSheet.map['ship'].h;
  this.x=Game.width/2-this.w/2;
  this.y=Game.height-this.h-10;
  this.vx=0;
  this.maxVel=300;
  
  this.reloadTime=0.25;
  this.reload=this.reloadTime;
  this.step=function(dt){
    if(Game.keys['left']) this.vx= -this.maxVel;
    else if(Game.keys['right']) this.vx= this.maxVel;
    else this.vx=0;
    
    this.x += this.vx * dt;
    
    if(this.x<0) this.x=0;
    else if(this.x>Game.width-this.w) this.x=Game.width-this.w;
    
    this.reload-=dt;
    if(Game.keys['fire']&&this.reload<0){
      Game.keys['fire']=false;
      this.reload=this.reloadTime;
      this.board.add(new PlayerMissile(this.x, this.y+this.h/2));
      this.board.add(new PlayerMissile(this.x+this.w, this.y+this.h/2));
    }
  };
  this.draw=function(ctx){
    SpriteSheet.draw(ctx, 'ship', this.x, this.y, 0);
  }
};
function PlayerMissile(x,y){
  this.w=SpriteSheet.map['missile'].w;
  this.h=SpriteSheet.map['missile'].h;
  this.x=x-this.w/2;
  //use the passed in y as the bottom of the missile
  this.y=y-this.h;
  this.vy=-700;
  PlayerMissile.prototype.step=function(dt){
    this.y+=this.vy*dt;
    if(this.y< -this.h) this.board.remove(this);
  };
  PlayerMissile.prototype.draw=function(ctx){
    SpriteSheet.draw(ctx,'missile',this.x,this.y);
  }
}
