import {getPower,getPowers,POWER_ACTIONS} from './powers.js';
export const FIGHTER_IDS=Object.freeze(['camera','math','thai','eric','gigica','kaka','samuel','gabi','frequencia']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const basic=(action,step)=>action==='punch'?{duration:[.30,.33,.44][step-1],impact:[.11,.13,.20][step-1],damage:[6,8,12][step-1],range:[1.9,2.1,2.35][step-1],recovery:step===3?.18:.055}:{duration:[.40,.46,.55][step-1],impact:[.15,.20,.24][step-1],damage:[8,10,15][step-1],range:[2.3,2.5,2.7][step-1],recovery:step===3?.22:.07};
const makeFighter=(id,i)=>({id,x:i?3.4:-3.4,y:0,facing:i?-1:1,action:'idle',actionT:0,hp:100,energy:65,vy:0,vx:0,move:0,cooldown:0,stun:0,attack:null,hitDone:false,buffer:[],prevInput:new Set(),combo:0,comboAge:0,chainStep:0,chainAge:0,chainAction:'',attackDuration:0,powerType:'',powerVisual:'',powerCooldowns:{special:0,power2:0,power3:0,power4:0},shield:0,blocking:false,aiTimer:0,aiInput:new Set(),aiJump:0,aiMode:'engage',aiModeTime:0,aiPressure:0,aiRecentHits:0,aiLastHitAt:-99,aiDefenseCooldown:0,hitFlash:0});
export class Combat{
 constructor(onEvent=()=>{}){this.onEvent=onEvent;this.random=Math.random;this.aiDifficulty='normal';this.aiStage=0;this.aiTotal=1;this.aiChampionship=false;this.aiBoss=false;this.multiplayer=false;this.remoteInput=new Set();this.remotePressed=[];this.start('camera');}
 setMultiplayer(enabled){this.multiplayer=Boolean(enabled);this.remoteInput=new Set();this.remotePressed=[];}
 setRemoteInput(actions=[],pressed=[]){this.remoteInput=new Set(actions);for(const action of pressed)if(this.remotePressed.length<16)this.remotePressed.push(action);}
 setAIDifficulty(level='normal',stage=0,total=1,boss=false,championship=false){
  this.aiDifficulty=['easy','normal','expert'].includes(level)?level:'normal';
  this.aiStage=Math.max(0,Math.floor(stage));this.aiTotal=Math.max(1,Math.floor(total));this.aiBoss=Boolean(boss);this.aiChampionship=Boolean(championship);
 }
 _aiProfile(){
  const levels={easy:{reaction:1.55,attack:.67,defense:.57,power:.60,jump:.75,damage:.83},normal:{reaction:1,attack:1,defense:1,power:1,jump:1,damage:1},expert:{reaction:.72,attack:1.22,defense:1.5,power:1.5,jump:1.25,damage:1.18}};
  const base=levels[this.aiDifficulty]||levels.normal;
  const progress=this.aiChampionship?(this.aiTotal>1?this.aiStage/(this.aiTotal-1):1):.5;
  const ladder=this.aiChampionship?.77+.30*progress+(this.aiBoss?.12:0):1;
  return {reaction:Math.max(.50,base.reaction/ladder),attack:Math.min(1.35,base.attack*ladder),defense:Math.min(1.75,base.defense*ladder),power:Math.min(1.65,base.power*ladder),jump:base.jump*ladder,damage:base.damage*(this.aiChampionship?.82+.32*progress+(this.aiBoss?.10:0):1)};
 }

 start(playerId='camera',opponentId){this.playerId=FIGHTER_IDS.includes(playerId)?playerId:'camera';const others=FIGHTER_IDS.filter(id=>id!==this.playerId);this.opponentId=others.includes(opponentId)?opponentId:others[clamp(Math.floor((this.random()||0)*others.length),0,others.length-1)];this.wins=[0,0];this.round=1;this.paused=false;this.elapsed=0;this.winner=null;this._resetRound();}
 _resetRound(){this.fighters=[makeFighter(this.playerId,0),makeFighter(this.opponentId,1)];this.projectiles=[];this.timer=60;this.phase='intro';this.phaseTime=0;this.combo=0;this.message=`ROUND ${this.round}`;this.onEvent({type:'round',text:this.message,round:this.round});}
 togglePause(){if(this.phase!=='finished')this.paused=!this.paused;return this.paused;}
 update(dt,input=new Set()){if(this.paused||this.phase==='finished')return;dt=clamp(Number.isFinite(dt)?dt:0,0,.15);let presses=input.pressed;while(dt>0){const step=Math.min(dt,1/60);this._step(step,input,presses,this.multiplayer?this.remotePressed.splice(0):undefined);presses=Array.isArray(presses)?[]:undefined;dt-=step;}}
 _step(dt,input,presses,remotePresses){
  this.elapsed+=dt;this.phaseTime+=dt;
  if(this.phase==='intro'){for(const f of this.fighters)f.actionT+=dt;this.message=this.phaseTime>1.15?'AÇÃO!':`ROUND ${this.round}`;if(this.phaseTime>1.85){this.phase='fight';this.phaseTime=0;this.message='';}return;}
  if(this.phase==='roundOver'){for(const f of this.fighters){f.actionT+=dt;f.vy-=22*dt;f.y=Math.max(0,f.y+f.vy*dt);}if(this.phaseTime>2.6){if(this.wins.some(n=>n===2)){this.phase='finished';this.winner=this.fighters[this.wins[0]===2?0:1].id;this.onEvent({type:'end',winner:this.winner});}else{this.round++;this._resetRound();}}return;}
  if(this.phase!=='fight')return;
  this.timer=Math.max(0,this.timer-dt);this._fighterStep(0,input,dt,presses);this._fighterStep(1,this.multiplayer?this.remoteInput:this._ai(dt),dt,remotePresses);
  const [a,b]=this.fighters;
  // Um salto diagonal pode atravessar o oponente enquanto o lutador está no ar.
  // A colisão normal continua ativa no chão e em saltos baixos.
  const overTheTop=(a.y>.66&&a.y>b.y+.55)||(b.y>.66&&b.y>a.y+.55);
  if(!overTheTop&&Math.abs(a.x-b.x)<1.05&&Math.abs(a.y-b.y)<1.8){const dir=a.x<=b.x?1:-1,overlap=(1.05-Math.abs(a.x-b.x))/2;a.x=clamp(a.x-overlap*dir,-7.5,7.5);b.x=clamp(b.x+overlap*dir,-7.5,7.5);}
  for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i];p.delay-=dt;if(p.delay>0)continue;p.x+=p.dir*p.speed*dt;p.y+=(p.vy||0)*dt;p.life-=dt;const target=this.fighters[1-p.owner];const vertical=p.type==='trap'?target.y<.8:p.y>target.y+.12&&p.y<target.y+2.9;
   if(Math.abs(p.x-target.x)<(p.type==='trap'?.9:.67)&&vertical){this._hit(p.owner,p.damage,true,{knockback:p.type==='wave'?(p.pull?3.8:4):2.5,pull:!!p.pull});this.projectiles.splice(i,1);}else if(p.life<=0||Math.abs(p.x)>12||p.y<0)this.projectiles.splice(i,1);
  }
  this.combo=a.comboAge>0?a.combo:0;if(a.hp<=0||b.hp<=0||this.timer<=0)this._endRound();
 }
 _setAction(f,action){if(f.action!==action){f.action=action;f.actionT=0;}}
 _fighterStep(index,input,dt,presses){
  const f=this.fighters[index],other=this.fighters[1-index];f.actionT+=dt;f.cooldown=Math.max(0,f.cooldown-dt);f.stun=Math.max(0,f.stun-dt);f.hitFlash=Math.max(0,f.hitFlash-dt);f.shield=Math.max(0,f.shield-dt);f.energy=Math.min(100,f.energy+dt*7.5);f.comboAge=Math.max(0,f.comboAge-dt);if(!f.comboAge)f.combo=0;f.chainAge=Math.max(0,f.chainAge-dt);for(const key of POWER_ACTIONS)f.powerCooldowns[key]=Math.max(0,f.powerCooldowns[key]-dt);
  f.buffer=f.buffer.map(b=>({...b,age:b.age-dt})).filter(b=>b.age>0);
  // Defesa tem prioridade sobre ataques: ao segurar, interrompe o golpe atual
  // e descarta a fila de golpes, impedindo combos segurados de bloquear a guarda.
  const wantsGuard=input.has('block')&&f.stun===0&&f.y<.1;
  const actions=['punch','kick',...POWER_ACTIONS];const edges=Array.isArray(presses)?presses:actions.filter(a=>input.has(a)&&!f.prevInput.has(a));
  if(wantsGuard){
   f.buffer.length=0;
   if(f.attack){f.attack=null;f.hitDone=false;f.powerType='';f.powerVisual='';f.cooldown=Math.max(f.cooldown,.07);}
  }else for(const action of edges)if(actions.includes(action)&&f.buffer.length<6)f.buffer.push({action,age:1.3});
  if(!f.attack)f.facing=other.x>=f.x?1:-1;
  f.blocking=wantsGuard;
  const crouching=input.has('crouch')&&f.y<.1&&!f.attack;let direction=(input.has('right')?1:0)-(input.has('left')?1:0);if(f.stun>0||f.blocking||crouching)direction=0;f.move=direction;
  const dash=f.attack&&f.powerType==='dash'?f.facing*7.5:0;
  const jumpsToward=direction!==0&&(other.x-f.x)*direction>0&&f.y>.08&&input.has('jump');
  const walkingSpeed=f.attack?2.4:4.8;
  const airStride=jumpsToward?1.35:1; // Direção + pulo: ultrapassa o rival sem alterar a força ou o dano.
  f.x=clamp(f.x+(direction*walkingSpeed*airStride+f.vx+dash)*dt,-7.5,7.5);f.vx*=Math.pow(.012,dt);
  if(input.has('jump')&&!f.prevInput.has('jump')&&f.y<.02&&f.stun<=0&&!f.blocking){f.vy=9.5;this.onEvent({type:'jump',x:f.x,y:0,id:f.id});}f.vy-=23*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y<=0)f.vy=0;
  if(f.attack){const def=f.attackDef;if(!f.hitDone&&f.actionT>=def.impact){f.hitDone=true;if(POWER_ACTIONS.includes(f.attack))this._cast(index,getPower(f.id,f.attack));else if(Math.abs(other.x-f.x)<=def.range&&Math.abs(other.y-f.y)<1.6&&(other.x-f.x)*f.facing>0)this._hit(index,def.damage,false,{finisher:f.chainStep===3,knockback:f.chainStep===3?4.7:1.35});else this.onEvent({type:'swing',id:f.id,attack:f.attack});}if(f.actionT>=def.duration){f.attack=null;f.cooldown=def.recovery;f.chainAge=.85;}}
  if(!f.attack&&f.cooldown<=0&&f.stun<=0&&!f.blocking){
   let next;while(f.buffer.length&&!next){const candidate=f.buffer.shift().action;if(this._available(f,candidate))next=candidate;}
   if(!next)next=[...POWER_ACTIONS,'kick','punch'].find(a=>input.has(a)&&this._available(f,a));
   if(next){const power=getPower(f.id,next);f.attack=next;f.action=power?'special':next;f.actionT=0;f.hitDone=false;
    if(power){f.energy-=power.cost;f.powerCooldowns[next]=power.cooldown;f.powerType=power.type;f.powerVisual=power.visual;f.attackDef={duration:.6,impact:power.type==='dash'?.30:.18,recovery:.15};f.chainStep=0;f.chainAge=0;}
    else{f.chainStep=f.chainAction===next&&f.chainAge>0?f.chainStep%3+1:1;f.chainAction=next;f.powerType='';f.attackDef=basic(next,f.chainStep);this.onEvent({type:'chain',id:f.id,attacker:index,step:f.chainStep,action:next});}
    f.attackDuration=f.attackDef.duration;
   }
  }
  if(!f.attack)this._setAction(f,f.stun>0?'hurt':f.blocking?'block':f.y>.03?'jump':crouching?'crouch':direction?'walk':'idle');if(f.blocking){f.chainAge=0;f.chainStep=0;}f.prevInput=new Set(input);
 }
 _available(f,action){const p=getPower(f.id,action);return !p||(f.energy>=p.cost&&f.powerCooldowns[action]<=0);}
 _cast(index,p){
  const f=this.fighters[index],other=this.fighters[1-index],dir=f.facing,origin=f.x;
  const projectile=(extra={})=>this.projectiles.push({x:f.x+dir*.85,y:f.y+1.5,id:f.id,owner:index,dir,life:2.2,delay:0,speed:11,vy:0,type:p.type,visual:p.visual,damage:p.damage,...extra});
  if(p.type==='projectile')projectile(f.id==='eric'?{speed:15,life:1.65}:{});
  if(p.type==='multishot')for(let i=0;i<3;i++)projectile({delay:i*.14,y:f.y+1.15+i*.32});
  if(p.type==='wave')projectile({y:.48,speed:f.id==='eric'?9:8,life:2.5,pull:f.id==='eric'});
  if(p.type==='rain')for(let i=0;i<3;i++)projectile({x:clamp(other.x+(i-1)*.7,-7.5,7.5),y:5+i*.45,speed:0,vy:-8,delay:i*.12,life:1.4});
  if(p.type==='trap')projectile({x:clamp(f.x+dir*1.8,-7.5,7.5),y:.25,speed:0,life:3});
  if(p.type==='shield')f.shield=p.duration||2.2;
  if(p.type==='heal')f.hp=Math.min(100,f.hp+18);
  if(p.type==='teleport'){
   // Match Cut = troca real de posição, repetível após a recarga, e não apenas um salto lateral.
   const before=f.x;
   f.x=other.x;other.x=before;
   f.facing=other.x>=f.x?1:-1;other.facing=f.x>=other.x?1:-1;
   f.vx=0;other.vx=0;
   if(Math.abs(other.y-f.y)<1.6)this._hit(index,p.damage,false);
  }
  if(p.type==='beam'&&Math.abs(other.x-f.x)<13&&(other.x-f.x)*dir>0&&Math.abs(other.y-f.y)<1.7)this._hit(index,p.damage,true,{knockback:5});
  if(p.type==='radial'&&Math.abs(other.x-f.x)<3.5&&Math.abs(other.y-f.y)<2)this._hit(index,p.damage,false,{knockback:5});
  if(p.type==='dash'){
   // Eric corta a timeline e cruza o alvo; outros lutadores preservam o dash original.
   if(f.id==='eric'&&Math.abs(other.x-f.x)<4.5&&Math.abs(other.y-f.y)<1.7){
    f.x=clamp(other.x+dir*1.25,-7.5,7.5);
    f.facing=other.x>=f.x?1:-1;
    this._hit(index,p.damage,false,{knockback:3.2});
   }else if(Math.abs(other.x-f.x)<2.7&&Math.abs(other.y-f.y)<1.7)this._hit(index,p.damage,false,{knockback:4});
  }
  this.onEvent({type:'special',id:f.id,owner:index,action:p.action,powerType:p.type,visual:p.visual,name:p.name,x:f.x,y:f.y+1.5,fromX:origin,targetX:other.x,dir:f.facing});
 }
 _hit(index,baseDamage,projectile,options={}){
  const a=this.fighters[index],t=this.fighters[1-index];if(t.hp<=0)return false;const frontal=(a.x-t.x)*t.facing>0,blocked=(t.blocking&&frontal)||t.shield>0;
  if(!projectile&&a.attack==='punch'&&a.chainStep<3&&t.action==='crouch')return false;
  const adjustedDamage=index===1?Math.max(1,Math.round(baseDamage*this._aiProfile().damage)):baseDamage;
  const damage=blocked?Math.max(1,Math.round(adjustedDamage*(t.shield>0?.25:.16))):adjustedDamage;
  t.hp=Math.max(0,t.hp-damage);t.hitFlash=.16;
  // A IA acumula memória de golpes recentes. Não altera HP/dano nem o jogador humano.
  if(index===0&&!blocked){
   const inSequence=this.elapsed-t.aiLastHitAt<1.65;
   t.aiRecentHits=inSequence?Math.min(8,t.aiRecentHits+1):1;
   t.aiPressure=Math.min(90,t.aiPressure+damage*(inSequence?1.12:1)+(inSequence?3.5:0));
   t.aiLastHitAt=this.elapsed;
  }
  t.vx=(Math.sign(t.x-a.x)||a.facing)*(blocked?.8:options.pull?-Math.max(1,options.knockback||3):options.knockback||2.8);
  if(!blocked){t.stun=options.finisher?.29:projectile?.23:.14;t.attack=null;t.cooldown=.12;t.chainAge=0;t.chainStep=0;t.buffer=[];this._setAction(t,'hurt');a.combo=a.comboAge>0?a.combo+1:1;a.comboAge=1.4;a.energy=Math.min(100,a.energy+3);}
  this.onEvent({type:'hit',x:t.x,y:t.y+1.5,damage,blocked,combo:a.combo,attacker:index,id:a.id,projectile,finisher:!!options.finisher});return true;
 }
 _ai(dt){
  const f=this.fighters[1],p=this.fighters[0],ai=this._aiProfile();
  // Memória e intervalos independentes do sorteio de ações.
  f.aiTimer-=dt;f.aiJump-=dt;f.aiDefenseCooldown=Math.max(0,f.aiDefenseCooldown-dt);
  f.aiPressure=Math.max(0,f.aiPressure-dt*(this.elapsed-f.aiLastHitAt>1.2?12:2.5));
  if(f.aiModeTime>0&&f.stun<=0)f.aiModeTime=Math.max(0,f.aiModeTime-dt);
  if(f.aiTimer>0)return f.aiInput;
  f.aiTimer=(.18+this.random()*.23)*ai.reaction;
  const input=new Set(),dist=Math.abs(p.x-f.x),toward=p.x>f.x?'right':'left',away=toward==='left'?'right':'left';
  const incomingProjectile=this.projectiles.some(x=>x.owner===0&&Math.abs(x.x-f.x)<3.8);
  const threatening=(Boolean(p.attack)&&dist<3.6)||incomingProjectile;
  const pressureLimit=(this.aiDifficulty==='expert'?12:this.aiDifficulty==='easy'?27:17)*(f.hp<40?.75:1);
  const recentlyHit=this.elapsed-f.aiLastHitAt<2.3;
  const canDefend=f.aiDefenseCooldown<=0&&f.aiMode==='engage'&&f.hp>0;
  const underPressure=recentlyHit&&(f.aiPressure>=pressureLimit||f.aiRecentHits>=3);
  // Depois de apanhar repetidas vezes: proteger -> abrir distância -> contra-atacar.
  // Também pode bloquear um golpe que percebe chegando, mesmo sem apanhar antes.
  if(canDefend&&dist<4.3&&(underPressure||(threatening&&this.random()<Math.min(.78,.39*ai.defense)))){
   f.aiMode='guard';f.aiModeTime=(underPressure?.58:.36)+this.random()*(underPressure?.42:.25);
   f.aiDefenseCooldown=(underPressure?2.25:1.85)/Math.max(.68,ai.defense);
   f.aiPressure*=.26;
   f.aiRecentHits=0;
  }
  if(f.aiMode==='guard'&&f.aiModeTime<=0){
   f.aiMode='retreat';f.aiModeTime=.42+this.random()*.48;
  }
  if(f.aiMode==='retreat'&&(f.aiModeTime<=0||dist>4.6)){
   f.aiMode='counter';f.aiModeTime=.48+this.random()*.52;
  }
  if(f.aiMode==='counter'&&f.aiModeTime<=0)f.aiMode='engage';
  if(f.aiMode==='guard'){
   // Não se desloca durante o bloqueio; a fase seguinte é responsável pelo recuo.
   if(f.stun<=0&&f.y<.1)input.add('block');
  }else if(f.aiMode==='retreat'){
   // O lutador abre espaço. Nos cantos, defende em vez de andar contra a parede.
   if((away==='left'&&f.x>-6.9)||(away==='right'&&f.x<6.9))input.add(away);
   else if(threatening&&f.stun<=0&&f.y<.1)input.add('block');
  }else{
   // IA normal mantém distância de combate, usa ataques variados e não avança sem parar.
   if(dist>2.9)input.add(toward);
   else if(dist>2.1&&this.random()<.66)input.add(toward);
   else if(dist<1.35&&this.random()<Math.min(.60,(f.hp<50?.33:.18)*ai.defense))input.add(away);
   const attackChance=Math.min(.93,(f.aiMode==='counter'?.84:.56)*ai.attack);
   if(this.random()<Math.min(f.aiMode==='counter'?.60:.36,(f.aiMode==='counter'?.24:.14)*ai.power)){
    const choices=getPowers(f.id).filter(x=>this._available(f,x.action)&&(x.type!=='heal'||f.hp<72)&&(x.type!=='radial'||dist<3.5));
    if(choices.length)input.add(choices[Math.floor(this.random()*choices.length)].action);
   }
   if(dist<2.85&&!POWER_ACTIONS.some(action=>input.has(action))&&this.random()<attackChance)input.add(this.random()<.55?'punch':'kick');
   if(f.aiJump<=0&&this.random()<Math.min(.10,.04*ai.jump)){input.add('jump');f.aiJump=2.4;}
  }
  f.aiInput=input;return input;
 }

 _endRound(){const[a,b]=this.fighters;this.phase='roundOver';this.phaseTime=0;this.projectiles=[];if(a.hp===b.hp){this.message='EMPATE • MAIS UM TAKE';for(const f of this.fighters){f.attack=null;this._setAction(f,'idle');}}else{const winner=a.hp>b.hp?0:1;this.wins[winner]++;this.message=winner===0?'VOCÊ VENCEU O ROUND':'ROUND DO ADVERSÁRIO';for(let i=0;i<2;i++){const f=this.fighters[i];f.attack=null;f.action=i===winner?'win':'ko';f.actionT=0;}}this.onEvent({type:'round',text:this.message,round:this.round});}
}
