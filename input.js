const KEY_ACTIONS={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'jump',ArrowUp:'jump',KeyS:'crouch',ArrowDown:'crouch',KeyJ:'punch',KeyK:'kick',KeyL:'special',KeyU:'power2',KeyI:'power3',KeyO:'power4',Space:'block'};
const ATTACKS=new Set(['punch','kick','special','power2','power3','power4']);
// Uma defesa rápida não pode desaparecer entre duas leituras do input (60 FPS).
// Proteção nasce no pointerdown (sem depender do pointerup), evitando perder o toque.
// A janela de 650 ms só limita o toque rápido; manter o botão pressionado defende sem limite.
const GUARD_TAP_MS=650;
export class InputController{
 constructor(target=window){this.target=target;this.keys=new Set();this.pointers=new Map();this.joystickActions=new Set();this.gamepadActions=new Set();this.pending=[];this.guardUntil=0;this.guardTouches=new Set();this.guardTouchPointers=new Set();this._enabled=false;this._bindings=[];this.mode='touch';this.onModeChange=()=>{};
 this._keydown=e=>{if(!this.enabled||!KEY_ACTIONS[e.code])return;e.preventDefault();this.setMode('keyboard');const a=KEY_ACTIONS[e.code];if(!this.keys.has(e.code)){if(ATTACKS.has(a))this.pending.push(a);if(a==='block')this.armGuard();}this.keys.add(e.code);};
 this._keyup=e=>{if(!KEY_ACTIONS[e.code])return;if(this.enabled)e.preventDefault();this.keys.delete(e.code);};this._blur=()=>this.clear();this._pointerEnd=e=>{if(e.type==='pointercancel'&&this.pointers.get(e.pointerId)==='block'&&this.guardTouches.size)return;this.pointers.delete(e.pointerId);this.guardTouchPointers.delete(e.pointerId);};this._pointerMode=e=>{if(this.enabled&&(e.pointerType==='touch'||e.pointerType==='pen'))this.setMode('touch');};
 target.addEventListener('keydown',this._keydown);target.addEventListener('keyup',this._keyup);target.addEventListener('blur',this._blur);target.addEventListener('pointerup',this._pointerEnd);target.addEventListener('pointercancel',this._pointerEnd);target.addEventListener('pointerdown',this._pointerMode);
 }
 get enabled(){return this._enabled;}set enabled(v){this._enabled=!!v;if(!v)this.clear();}
 setMode(mode){if(mode!==this.mode){this.mode=mode;this.onModeChange(mode);}}
 armGuard(){this.guardUntil=Math.max(this.guardUntil,performance.now()+GUARD_TAP_MS);}
 get actions(){const actions=new Set();if(this.enabled){for(const a of this.pointers.values())actions.add(a);for(const code of this.keys)actions.add(KEY_ACTIONS[code]);for(const a of this.joystickActions)actions.add(a);for(const a of this.gamepadActions)actions.add(a);if(this.guardTouches.size||performance.now()<this.guardUntil)actions.add('block');}Object.defineProperty(actions,'pressed',{value:this.enabled?this.pending.splice(0):[],enumerable:false});return actions;}
 clear(){this.keys.clear();this.pointers.clear();this.pending=[];this.guardUntil=0;this.guardTouches.clear();this.guardTouchPointers.clear();this.joystickActions.clear();this.gamepadActions.clear();this.resetJoystick?.();}
 setGamepad(actions){if(!this.enabled)return;for(const a of actions)if(!this.gamepadActions.has(a)){if(ATTACKS.has(a))this.pending.push(a);if(a==='block')this.armGuard();}this.gamepadActions=new Set(actions);}
 bindButton(element,action){
  const isGuard=action==='block';
  const down=e=>{
   if(!this.enabled)return;
   if(e.cancelable)e.preventDefault();
   if(e.pointerType==='touch'||e.pointerType==='pen')this.setMode('touch');
   this.pointers.set(e.pointerId,action);
   if(ATTACKS.has(action))this.pending.push(action);
   if(isGuard){
    this.armGuard();
    if(e.pointerType!=='mouse'&&e.pointerType!=='pen')this.guardTouchPointers.add(e.pointerId);
   }
   try{element.setPointerCapture(e.pointerId);}catch{}
  };
  const end=e=>{
   // Alguns WebViews perdem/cancelam a captura do pointer antes de o dedo sair.
   // Enquanto o TouchEvent ainda confirma o contato, isso NAO encerra a defesa.
   if(isGuard&&e.type==='pointercancel'&&this.guardTouches.size)return;
   this.pointers.delete(e.pointerId);
   this.guardTouchPointers.delete(e.pointerId);
  };
  const captureLost=e=>{
   // Perder a captura NAO equivale a soltar o dedo. O pointerup global,
   // touchend ou touchcancel fazem a liberacao verdadeira.
   if(!isGuard)end(e);
  };
  element.style.touchAction='none';
  element.addEventListener('pointerdown',down);
  element.addEventListener('pointerup',end);
  element.addEventListener('pointercancel',end);
  element.addEventListener('lostpointercapture',captureLost);
  let touchStart,touchMove,touchEnd;
  if(isGuard){
   touchStart=e=>{
    if(!this.enabled)return;
    if(e.cancelable)e.preventDefault();
    this.setMode('touch');
    for(const t of e.changedTouches||[])this.guardTouches.add(t.identifier);
    this.armGuard();
   };
   touchMove=e=>{
    if(!this.enabled||!this.guardTouches.size)return;
    for(const t of e.changedTouches||e.touches||[]){
     if(this.guardTouches.has(t.identifier)){if(e.cancelable)e.preventDefault();break;}
    }
   };
   touchEnd=e=>{
    if(!this.guardTouches.size)return;
    for(const t of e.changedTouches||[])this.guardTouches.delete(t.identifier);
    if(!this.guardTouches.size){
     // Se o WebView nunca emitir pointerup, ainda assim libera ao soltar.
     for(const id of this.guardTouchPointers)this.pointers.delete(id);
     this.guardTouchPointers.clear();
    }
   };
   element.addEventListener('touchstart',touchStart,{passive:false});
   this.target.addEventListener('touchmove',touchMove,{passive:false});
   this.target.addEventListener('touchend',touchEnd);
   this.target.addEventListener('touchcancel',touchEnd);
  }
  const unbind=()=>{
   element.removeEventListener('pointerdown',down);
   element.removeEventListener('pointerup',end);
   element.removeEventListener('pointercancel',end);
   element.removeEventListener('lostpointercapture',captureLost);
   if(isGuard){
    element.removeEventListener('touchstart',touchStart);
    this.target.removeEventListener('touchmove',touchMove);
    this.target.removeEventListener('touchend',touchEnd);
    this.target.removeEventListener('touchcancel',touchEnd);
   }
  };
  this._bindings.push(unbind);
  return unbind;
 }
 bindJoystick(element,knob){
  let pointer=null,pointerType=null;
  const reset=()=>{
   const previous=pointer;
   pointer=null;pointerType=null;
   this.joystickActions.clear();
   knob.style.transform='translate(-50%,-50%)';
   if(previous!==null){try{if(element.hasPointerCapture?.(previous))element.releasePointerCapture(previous);}catch{}}
  };
  this.resetJoystick=reset;
  element.style.touchAction='none';
  const move=e=>{
   if(!this.enabled||pointer===null||e.pointerId!==pointer)return;
   if(e.cancelable)e.preventDefault();
   const r=element.getBoundingClientRect(),radius=r.width*.35;
   if(!radius)return;
   const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
   const len=Math.hypot(dx,dy),scale=Math.min(1,radius/(len||1)),x=dx*scale,y=dy*scale;
   knob.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
   this.joystickActions.clear();
   if(x>radius*.26)this.joystickActions.add('right');
   if(x<-radius*.26)this.joystickActions.add('left');
   if(y<-radius*.4)this.joystickActions.add('jump');
   if(y>radius*.45)this.joystickActions.add('crouch');
  };
  const down=e=>{
   if(!this.enabled)return;
   if(pointer!==null){
    // Um segundo dedo não pode roubar o joystick do primeiro.
    if(e.pointerId!==pointer&&e.isPrimary===false)return;
    // Nova pressão principal: libera eventual ponteiro antigo sem evento de soltura.
    reset();
   }
   if(e.cancelable)e.preventDefault();
   pointer=e.pointerId;
   pointerType=e.pointerType||null;
   if(e.pointerType==='touch'||e.pointerType==='pen')this.setMode('touch');
   try{element.setPointerCapture(pointer);}catch{}
   move(e);
  };
  const end=e=>{if(e.pointerId===pointer)reset();};
  // O WebView pode perder a captura ao arrastar o dedo para fora do círculo.
  // Janela também recebe movimento/soltura; duplicatas não mudam o estado.
  const host=this.target;
  const events=[
   [element,'pointerdown',down],
   [element,'pointermove',move],
   [element,'pointerup',end],
   [element,'pointercancel',end],
   [element,'lostpointercapture',end],
   [host,'pointermove',move],
   [host,'pointerup',end],
   [host,'pointercancel',end]
  ];
  // Fallback para WebViews que não encaminham o pointerup, mas entregam touchend.
  const touchEnd=e=>{if(pointer!==null&&pointerType==='touch'&&e.touches?.length===0)reset();};
  events.push([host,'touchend',touchEnd],[host,'touchcancel',touchEnd]);
  for(const [node,type,handler] of events)node.addEventListener(type,handler);
  this._bindings.push(()=>{reset();for(const [node,type,handler] of events)node.removeEventListener(type,handler);});
 }
 destroy(){this.clear();this.target.removeEventListener('keydown',this._keydown);this.target.removeEventListener('keyup',this._keyup);this.target.removeEventListener('blur',this._blur);this.target.removeEventListener('pointerup',this._pointerEnd);this.target.removeEventListener('pointercancel',this._pointerEnd);this.target.removeEventListener('pointerdown',this._pointerMode);this._bindings.forEach(f=>f());}
}
