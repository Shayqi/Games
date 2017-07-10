window.addEventListener('load',function(){
  Game.initialize('game',sprites,startGame);
});
//效率優化，按位運算
let OBJECT_PLAYER=1, OBJECT_PLAYER_PROJECTILE=2, OBJECT_ENEMY=4,
    OBJECT_ENEMY_PROJECTILE=8, OBJECT_POWERUP=16;

let sprites={
  ship:{sx:0,sy:0,w:37,h:42,frame:1},
  missile:{sx:0,sy:30,w:2,h:10,frame:1},
  enemy_purple:{sx:37,sy:0,w:42,h:43,frame:1},
  enemy_bee:{sx:79,sy:0,w:37,h:43,frame:1},
  enemy_ship:{sx:116,sy:0,w:42,h:43,frame:1},
  enemy_circle:{sx:158,sy:0,w:32,h:33,frame:1},
  explosion:{sx:0,sy:64,w:64,h:64,frames:12},
  enemy_missile:{sx:7,sy:42,w:7,h:22,frame:1}
};
let enemies={
  basic:{x:90,y:-50,sprite:'enemy_purple',B:140,C:3,E:100,health:20},
  straight:{x:0, y:-50, sprite:'enemy_ship',health:10, E:100},
  ltr:{x:0, y:-100, sprite:'enemy_purple',health:10,B:75,C:1,E:100,
            missiles:2},
  circle:{x:250,y:-50,sprite:'enemy_circle',health:10, A:0,B:-100,C:1,
          E:20,F:100,G:1,H:Math.PI/2},
  wiggle:{x:100,y:-50,sprite:'enemy_bee',health:20,B:50,C:4,E:100,
          firePercentage:0.001,missile:2},
  step:{x:0,y:-50,sprite:'enemy_circle',health:10,B:150,C:1.2,E:75},
  meteor:{x:100,y:-50,sprite:'enemy_circle',health:10, A:40,B:-200,C:1,
                                            E:300,F:200,G:1,H:Math.PI/2}
};
let level1=[
  //start,  end,  gap,  type, override
  [0,      4000,  500,  'step' ],
  [6000,  13000,  800,  'ltr'],
  [10000, 16000,  400,  'circle'],
  [17800, 20000,  500,  'straight', {x:50}],
  [18200, 20000,  500,  'straight', {x:90}],
  [18200, 20000,  500,  'straight', {x:10}],
  [22000, 25000,  400,  'wiggle',  {x:150}],
  [22000, 25000,  400,  'wiggle',  {x:100}]
];

let startGame=function(){
  Game.setBoard(0,new Starfield(20,0.4,100,true));
  Game.setBoard(1,new Starfield(50,0.6,100));
  Game.setBoard(2,new Starfield(100,1.0,50));
  Game.setBoard(3,new TitleScreen('Shayqi Invasion',
                                  'press space to start playing',playGame));
};
let playGame=function(){
  let board=new GameBoard();
  //board.add(new Enemy(enemies.circle));
  //board.add(new Enemy(enemies.basic,{x:210}));
  board.add(new PlayerShip());
  board.add(new Level(level1,winGame));
  Game.setBoard(3,board);
  Game.setBoard(5, new GamePoints(0));
};
let winGame=function(){
  Game.setBoard(3,new TitleScreen('You win!','Press fire to play again',playGame))
};
let loseGame=function(){
  Game.setBoard(3,new TitleScreen('You lose!','Press fire to play again',playGame))
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

function PlayerShip(){
  this.setup('ship',{vx:0, reloadTime:0.25, maxVel:300});
  
  this.x=Game.width/2-this.w/2;
  this.y=Game.height-this.h-Game.playerOffset;
  
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
  }
}
PlayerShip.prototype = new Sprite();
PlayerShip.prototype.type=OBJECT_PLAYER;
PlayerShip.prototype.hit=function(damage){
  this.board.add(new Explosion(this.x+this.w/2, this.y+this.h/2));
  this.board.remove(this);
  loseGame();
};

function PlayerMissile(x,y){
  this.setup('missile',{vy:-700,damage:10});
  
  this.x=x-this.w/2;
  //use the passed in y as the bottom of the missile
  this.y=y-this.h;
}
PlayerMissile.prototype=new Sprite();
PlayerMissile.prototype.type=OBJECT_PLAYER_PROJECTILE;
PlayerMissile.prototype.step=function(dt){
  this.y+=this.vy*dt;
  let collision=this.board.collide(this,OBJECT_ENEMY);
  if(collision){
    collision.hit(this.damage);
    this.board.remove(this);
  }else if(this.y< -this.h) this.board.remove(this);
};

//-------------------------------------------------------------------------------
// vx = A + (B * sin(C * t + D))
// vy = E + (F * sin(G * t + H))
//
// A : 水平速度常量
// B : 水平正弦速度的強度
// C : 水平正弦速度的周期
// D : 水平正弦速度的時移
// E : 垂直速度常量
// F : 垂直正弦速度的強度
// G : 垂直正弦速度的周期
// H : 垂直正弦速度的時移
//-------------------------------------------------------------------------------
function Enemy(blueprint,override) {
  this.merge(this.baseParameters);
  this.setup(blueprint.sprite, blueprint);
  this.merge(override);
}
Enemy.prototype = new Sprite();
Enemy.prototype.type=OBJECT_ENEMY;
//避免新建Enemy時，重新創建baseParameters對象
Enemy.prototype.baseParameters= {A:0, B:0, C:0, D:0,
                                 E:0, F:0, G:0, H:0, t:0,
                                 firePercentage:0.01,
                                 reloadTime:0.75, reload:0};
Enemy.prototype.step=function(dt){
  this.t +=dt;
  this.vx = this.A+this.B*Math.sin(this.C*this.t+this.D);
  this.vy =this.E+this.F*Math.sin(this.G*this.t+this.H);
  this.x+=this.vx*dt;
  this.y+=this.vy*dt;
  let collision=this.board.collide(this,OBJECT_PLAYER);
  if(collision){
    collision.hit(this.damage);
    this.board.remove(this);
  }
  if(this.reload<=0 && Math.random()<this.firePercentage){
    this.reload=this.reloadTime;
    if(this.missiles==2){
      this.board.add(new EnemyMissile(this.x+this.w-2, this.y+this.h/2));
      this.board.add(new EnemyMissile(this.x+2, this.y+this.h/2));
    }else this.board.add(new EnemyMissile(this.x+this.w/2, this.y+this.h));
  }
  this.reload-=dt;
  if(this.y>Game.height || this.x<-this.w || this.x>Game.width){
    this.board.remove(this);
  }
};
Enemy.prototype.hit=function(damage){
  this.health-=damage;
  if(this.health<=0){
    if(this.board.remove(this)) {
      Game.points += this.points || 100;
      this.board.add(new Explosion(this.x + this.w / 2, this.y + this.h / 2));
      
    }
  }
};

let Explosion=function(centerX,centerY){
  this.setup('explosion',{frame:0});
  this.x=centerX-this.w/2;
  this.y=centerY-this.h/2;
  //this.subFrame=0;
};
Explosion.prototype=new Sprite();
Explosion.prototype.step=function(dt){
  //this.frame=Math.floor(this.subFrame++/3);
  //if(this.subFrame>=36) this.board.remove(this);
  this.frame++;
  if(this.frame>=12) this.board.remove(this);
};

let EnemyMissile=function(x,y){
  this.setup('enemy_missile',{vy:200, damage:10});
  this.x=x-this.w/2;
  this.y=y;
};
EnemyMissile.prototype=new Sprite();
EnemyMissile.prototype.type=OBJECT_ENEMY_PROJECTILE;
EnemyMissile.prototype.step=function(dt){
  this.y += this.vy *dt;
  let collision=this.board.collide(this,OBJECT_PLAYER);
  if(collision){
    collision.hit(this.damage);
    this.board.remove(this);
  }else if(this.y > Game.height) this.board.remove(this);
};




