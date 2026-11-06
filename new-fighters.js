import * as THREE from './assets/three.module.js';

const meshMaterial=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const unitSphere=new THREE.SphereGeometry(1,20,14);
const cylinderCache=new Map();
function meshOf(geometry,material){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function ball(r,m,sx=1,sy=1,sz=1){const o=meshOf(unitSphere,m);o.scale.set(r*sx,r*sy,r*sz);return o;}
function tube(r1,r2,h,m,n=24){const key=[r1,r2,h,n].join('/');if(!cylinderCache.has(key))cylinderCache.set(key,new THREE.CylinderGeometry(r1,r2,h,n));return meshOf(cylinderCache.get(key),m);}
function put(o,parent,x,y,z){o.position.set(x,y,z);parent.add(o);return o;}
function softBox(w,h,d,m,r=.035){r=Math.min(r,w/2,h/2,d/2);const g=new THREE.BoxGeometry(w,h,d,4,4,4),p=g.attributes.position,v=new THREE.Vector3(),core=new THREE.Vector3(w/2-r,h/2-r,d/2-r);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const q=new THREE.Vector3(Math.max(-core.x,Math.min(core.x,v.x)),Math.max(-core.y,Math.min(core.y,v.y)),Math.max(-core.z,Math.min(core.z,v.z)));v.sub(q).normalize().multiplyScalar(r).add(q);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return meshOf(g,m);}
function link(a,b,r,m,parent){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),dir=to.clone().sub(from),o=tube(r,r,dir.length(),m,8);o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());parent.add(o);return o;}
function torus(r,th,m,parent,x,y,z,arc=Math.PI*2){return put(meshOf(new THREE.TorusGeometry(r,th,8,40,arc),m),parent,x,y,z);}
function torso(profile,material,depth=.72,gap=0){const o=meshOf(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),32,gap,Math.PI*2-gap*2),material);o.scale.z=depth;return o;}
function patch(width=.225){const vertices=[],uvs=[],indices=[],rings=18,segs=40;for(let r=0;r<=rings;r++)for(let s=0;s<=segs;s++){const a=s/segs*Math.PI*2,k=r/rings,xn=Math.cos(a)*k,yn=Math.sin(a)*k,jaw=yn<-.2?1+yn*.15:1,x=xn*width*jaw,y=yn*.31-.015,z=.136+Math.sqrt(Math.max(0,1-xn*xn*.9-yn*yn*.5))*.147+.026*Math.exp(-(x*x/.002+(y+.04)**2/.005));vertices.push(x,y,z);uvs.push(.5+xn*.5,.5+yn*.5);if(r<rings&&s<segs){const a=r*(segs+1)+s,b=a+segs+1;indices.push(a,b,a+1,b,b+1,a+1);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;}
function decal(texture,w,h,parent,x,y,z){return put(new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:1,metalness:0,depthWrite:false,side:THREE.DoubleSide})),parent,x,y,z);}
const specs={
 eric:{skin:0xd2a98e,hair:0x201a16,shirt:0x121416,pants:0x17191b,accent:0xa18aff,width:.43,hip:.34,arm:.15,face:.229,style:'overshirt'},
 gigica:{skin:0xe0b8a2,hair:0x292320,shirt:0x635c4b,pants:0x272723,accent:0xe3a9c5,width:.42,hip:.34,arm:.135,face:.217,style:'olive-knit',female:true},
 kaka:{skin:0xd7ad93,hair:0x191715,shirt:0x594b3b,pants:0x454743,accent:0xd8cc80,width:.40,hip:.30,arm:.125,face:.213,style:'brown-tee'},
 thai:{skin:0xe0b296,hair:0x60382b,shirt:0xffffff,pants:0xffffff,accent:0x7dcdf1,width:.40,hip:.35,arm:.127,face:.216,style:'jersey',female:true},
 samuel:{skin:0xcba78e,hair:0x181411,shirt:0x131414,pants:0x202120,accent:0xc18b80,width:.45,hip:.34,arm:.15,face:.236,style:'scarf'},
 gabi:{skin:0xe2bba6,hair:0x36251f,shirt:0x121515,pants:0x222323,accent:0xb7df82,width:.38,hip:.33,arm:.128,face:.210,style:'leather',female:true},
 math:{skin:0xd3aa90,hair:0x34251c,shirt:0x1a1b1a,pants:0x222322,accent:0xe9b773,width:.44,hip:.34,arm:.15,face:.226,style:'black-knit'},
};

// Extra garments and jewelry attach to body/head; arm and leg joints stay compatible with every action.
export function makeNewFighter(id){
 const spec=specs[id];if(!spec)throw new Error('Unknown new fighter: '+id);
 const group=new THREE.Group(),body=new THREE.Group();group.add(body);
 const skin=meshMaterial(spec.skin),skinBright=meshMaterial(spec.skin).clone();skinBright.color.multiplyScalar(1.035);
 const lips=meshMaterial(spec.female?0xaf7972:0xa37a6b),hair=meshMaterial(spec.hair,.96),hairLight=meshMaterial(spec.hair,.93);hairLight.color.multiplyScalar(1.17);
 const black=meshMaterial(0x101212,.93),white=meshMaterial(0xe7e5dc),silver=meshMaterial(0xb9bdba,.28,.85),rubber=meshMaterial(0x333633,.95),thread=meshMaterial(0x777a72);
 const shirt=meshMaterial(spec.shirt,spec.style==='leather'?.38:.96,spec.style==='leather'?.1:0),pants=meshMaterial(spec.pants,.97);
 if(spec.style==='olive-knit'||spec.style==='black-knit'){shirt.map=newWardrobeTexture(spec.style==='olive-knit'?'knit-olive':'knit-black');shirt.color.setHex(0xffffff);}
 if(id==='thai'){shirt.map=newWardrobeTexture('jersey');pants.map=newWardrobeTexture('leopard');}
 const profile=[[spec.hip,1.35],[spec.hip+.015,1.53],[spec.width-.02,1.94],[spec.width,2.20],[spec.width*.71,2.40]];
 put(softBox(spec.hip*2,.28,.40,pants,.06),body,0,1.30,0);
 const mainTorso=torso(profile,shirt,.74);body.add(mainTorso);
 // Hem and neckline preserve civilian garment silhouettes.
 const collar=torus(.137,.021,id==='thai'?white:shirt,body,0,2.40,.009);collar.rotation.x=Math.PI/2;
 if(id==='eric'){
  const over=meshMaterial(0x1d2022,.9);body.add(torso(profile.map(([r,y])=>[r+.026,y]),over,.77,.31));
  for(const s of [-1,1]){
   const lapel=put(softBox(.145,.25,.04,over,.015),body,s*.18,2.31,.25);lapel.rotation.z=s*.32;lapel.rotation.x=-.25;
   put(softBox(.17,.19,.027,over,.01),body,s*.267,2.11,.25);
   link([s*.13,1.45,.28],[s*.15,2.23,.32],.011,over,body);
  }
  for(const y of [1.48,1.76,2.04,2.27]){const button=put(tube(.023,.023,.012,silver,16),body,-.153,y,.32);button.rotation.x=Math.PI/2;}
  const chainPoints=[];for(let k=0;k<=24;k++){const x=-.15+k*.3/24;chainPoints.push(new THREE.Vector3(x,2.26+Math.pow(x/.15,2)*.13,.328));}
  body.add(meshOf(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPoints),30,.008,6,false),silver));
 }
 if(id==='kaka'){decal(newWardrobeTexture('kaka-logo'),.52,.19,body,0,1.99,.313);addBag(body,spec,white,0x77715c,.108,true);}
 if(id==='gigica'){
  addBag(body,spec,black,0x151817,.066,false);
  // Explicitly requested black over-ear headphones resting around the neck.
  const band=torus(.209,.024,black,body,0,2.37,.10,Math.PI*1.65);band.rotation.x=Math.PI/2;band.rotation.z=.55;
  for(const s of [-1,1]){const cup=put(softBox(.123,.17,.105,black,.035),body,s*.205,2.29,.18);cup.rotation.z=s*.30;put(softBox(.09,.12,.02,rubber,.025),body,s*.213,2.29,.243);}
 }
 if(id==='thai'){
  // White folded polo collar, club badge and sponsor print from the reference jersey.
  for(const s of [-1,1]){const c=put(softBox(.16,.19,.045,white,.012),body,s*.125,2.335,.237);c.rotation.z=s*.32;}
  decal(newWardrobeTexture('thai-logo'),.66,.62,body,0,1.99,.319);
 }
 if(id==='samuel'){
  const scarf=meshMaterial(0xffffff,.98);scarf.map=newWardrobeTexture('tartan');
  const back=torus(.19,.066,scarf,body,0,2.39,-.015);back.rotation.x=Math.PI/2;
  for(const s of [-1,1]){const tail=put(softBox(.19,1.03,.052,scarf,.018),body,s*.20,1.87,.347);tail.rotation.z=s*.09;for(let i=0;i<6;i++)link([s*.20-.075+i*.03,1.35,.355],[s*.20-.08+i*.03,1.27-(i%2)*.025,.355],.008,black,body);}
 }
 if(id==='gabi'){
  const leather=shirt;const inner=meshMaterial(0x292a25,.94);body.add(torso(profile.map(([r,y])=>[r-.015,y]),inner,.73));body.add(torso(profile.map(([r,y])=>[r+.025,y]),leather,.76,.28));
  for(const s of [-1,1]){const lapel=put(softBox(.15,.42,.045,leather,.018),body,s*.19,2.19,.275);lapel.rotation.z=s*.27;put(ball(.012,silver),body,s*.22,2.28,.305);link([s*.12,1.45,.29],[s*.20,2.20,.30],.007,silver,body);}
 }
 const neck=put(tube(spec.female?.115:.135,spec.female?.125:.145,.23,skin),body,0,2.48,0);
 const head=new THREE.Group();put(head,body,0,2.78,0);const faceDetails=new THREE.Group();head.add(faceDetails);
 // The curved photo surface supplies identifying facial detail after the reference atlas loads.
 put(ball(.257,skinBright,spec.face/.257,1.19,.88),head,0,0,-.012);
 put(ball(.195,skin,spec.female?.86:1,.65,.86),head,0,-.196,.029);
 for(const s of [-1,1]){
  put(ball(.082,skinBright,.75,.95,.73),head,s*.139,-.06,.158);
  put(ball(.053,skin,.6,1.3,.54),head,s*(spec.face+.014),-.015,-.002);
  put(ball(.030,lips,.5,1.1,.45),head,s*(spec.face+.025),-.015,.018);
  put(ball(.053,white,1,.43,.36),faceDetails,s*.097,.039,.24);put(ball(.023,meshMaterial(0x4f3829,.6),.8,1,.35),faceDetails,s*.097,.039,.260);put(ball(.010,black,1,1,.4),faceDetails,s*.097,.039,.270);
  const brow=put(ball(.072,hair,1,spec.female?.26:.22,.3),faceDetails,s*.10,.103,.231);brow.rotation.z=s*.12;
 }
 put(ball(.052,skinBright,.53,1.34,.66),faceDetails,0,0,.242);put(ball(.040,skinBright,.8,.55,.85),faceDetails,0,-.043,.28);
 put(ball(.068,lips,1,spec.female?.36:.26,.3),faceDetails,0,-.127,.246);put(ball(.061,meshMaterial(0x66493e),1,.04,.2),faceDetails,0,-.125,.261);
 addHair(id,head,body,hair,hairLight,spec);
 if(['eric','math'].includes(id)){
  for(const s of [-1,1]){const b=put(ball(id==='math'?.145:.12,hair,.61,.72,.56),head,s*.13,-.216,.081);b.rotation.z=s*.40;put(ball(.07,hair,.95,.25,.32),faceDetails,s*.043,-.092,.252);}
  put(ball(id==='math'?.146:.115,hair,1,.53,.61),faceDetails,0,-.245,.16);
  if(id==='eric')put(ball(.031,hair,.8,.7,.35),faceDetails,0,-.170,.243);
 }else if(id==='kaka'){
  for(const s of [-1,1])put(ball(.053,hair,1,.14,.26),faceDetails,s*.037,-.095,.251);
  put(ball(.092,hair,1,.27,.36),faceDetails,0,-.248,.176);
 }
 if(['gigica','gabi','kaka','samuel'].includes(id)){
  for(const s of [-1,1]){if((id==='kaka'||id==='samuel')&&s<0)continue;const earRing=torus(id==='gigica'?.027:id==='gabi'?.035:.021,.006,silver,head,s*(spec.face+.018),-.093,.01);earRing.rotation.y=s*.45;
   if(id==='gigica'){put(tube(.025,.025,.008,silver,20),head,s*(spec.face+.018),-.158,.01).rotation.x=Math.PI/2;link([s*(spec.face+.018),-.105,.01],[s*(spec.face+.018),-.135,.01],.004,silver,head);}
  }
 }
 if(id==='gigica'){const septum=torus(.019,.0045,silver,faceDetails,0,-.066,.293,Math.PI*1.65);septum.rotation.z=-.40;}
 if(id==='gabi'){const nose=torus(.013,.003,silver,faceDetails,.029,-.043,.284,Math.PI*1.75);nose.rotation.y=.5;}
 if(id==='thai'){
  const frame=meshMaterial(0x28241f,.38),lens=meshMaterial(0xbe922a,.16,.72);
  for(const s of [-1,1]){put(softBox(.215,.155,.033,frame,.03),faceDetails,s*.113,.047,.286);put(softBox(.18,.122,.009,lens,.023),faceDetails,s*.113,.048,.306);link([s*.212,.07,.276],[s*.237,.071,-.035],.011,frame,head);}
  link([-.014,.065,.30],[.014,.065,.30],.011,frame,faceDetails);
 }
 const photoFace=new THREE.Mesh(patch(spec.face),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,side:THREE.DoubleSide}));head.add(photoFace);photoFace.visible=false;photoFace.renderOrder=1;
 const joints={body,head};
 for(const [side,s] of [['L',-1],['R',1]]){
  const shoulder=new THREE.Group();put(shoulder,body,s*(spec.width+.025),2.27,0);
  put(ball(spec.arm*1.12,shirt,1,1.2,1),shoulder,0,-.065,0);
  const shortSleeve=['kaka','thai','samuel'].includes(id);
  put(tube(spec.arm,spec.arm*.88,shortSleeve?.38:.47,shirt),shoulder,0,shortSleeve?-.23:-.275,0);
  if(shortSleeve)put(tube(spec.arm*.85,spec.arm*.78,.14,skin),shoulder,0,-.45,0);
  const elbow=new THREE.Group();put(elbow,shoulder,0,-.51,0);put(ball(spec.arm*.82,shortSleeve?skin:shirt),elbow,0,0,0);
  const rolled=['eric','gigica','math'].includes(id),forearmShirt=id==='gabi';
  if(rolled){put(tube(spec.arm*.89,spec.arm*.85,.14,shirt),elbow,0,-.07,0);put(tube(spec.arm*.89,spec.arm*.89,.055,shirt),elbow,0,-.145,0);put(tube(spec.arm*.78,.087,.27,skin),elbow,0,-.29,0);}
  else put(tube(spec.arm*.82,.087,.43,forearmShirt?shirt:skin),elbow,0,-.215,0);
  put(tube(.088,.082,.07,skin),elbow,0,-.444,0);
  put(ball(spec.female?.095:.105,skinBright,.9,1.03,.65),elbow,0,-.515,.015);
  for(let k=0;k<4;k++){put(ball(.024,skinBright,.75,1.1,.7),elbow,-.056+k*.037,-.570,.035);put(ball(.026,skin,.66,1.07,.69),elbow,-.056+k*.037,-.539,.076);}
  const thumb=put(ball(.036,skin,.65,1.4,.73),elbow,-s*.08,-.493,.042);thumb.rotation.z=s*.25;
  if((id==='gigica'&&side==='R')||id==='thai'||id==='samuel'){
   const kind=id==='gigica'?'tattoo-gigica':id==='thai'?'tattoo-thai':'tattoo-samuel';
   decal(newWardrobeTexture(kind),id==='gigica'?.14:.19,id==='gigica'?.21:.34,elbow,0,-.28,.122);
  }
  if(id==='gigica'&&side==='R')put(tube(.100,.100,.035,black),elbow,0,-.415,0);
  if(id==='thai'){
   for(const y of [-.40,-.435]){const bracelet=torus(.099,.007,silver,elbow,0,y,0);bracelet.rotation.x=Math.PI/2;}
   const ring=torus(.025,.006,silver,elbow,.016,-.54,.04);ring.rotation.x=Math.PI/2;put(ball(.015,meshMaterial(0x3a8583,.3,.3),1,.65,1),elbow,.016,-.537,.09);
  }
  const hip=new THREE.Group();put(hip,body,s*(spec.hip*.59),1.23,0);
  const thigh=spec.female?.177:id==='kaka'?.165:.188;
  put(tube(thigh,thigh*.79,.57,pants),hip,0,-.275,0);
  const knee=new THREE.Group();put(knee,hip,0,-.55,0);put(ball(thigh*.78,pants),knee,0,0,0);put(tube(thigh*.78,.10,.49,pants),knee,0,-.22,0);
  put(softBox(.23,.15,.39,black,.055),knee,0,-.509,.09);put(softBox(.238,.045,.402,id==='eric'?white:rubber,.018),knee,0,-.574,.094);
  for(let k=0;k<3;k++)link([-.068,-.452,.095+k*.04],[.068,-.452,.095+k*.04],.006,id==='eric'?white:thread,knee);
  joints['arm'+side]=shoulder;joints['elbow'+side]=elbow;joints['leg'+side]=hip;joints['knee'+side]=knee;
 }
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.60,32),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;group.add(shadow);
 const aura=new THREE.Mesh(new THREE.RingGeometry(.56,.59,40),new THREE.MeshBasicMaterial({color:spec.accent,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));aura.rotation.x=-Math.PI/2;aura.position.y=.025;group.add(aura);
 return {group,joints,shadow,aura,accent:spec.accent,photoFace,faceDetails};
}

function addBag(body,spec,strapMaterial,bagColor,width,cream){
 const strap=put(softBox(width,1.22,.035,strapMaterial,.01),body,.065,1.95,.365);strap.rotation.z=-.38;
 const bagMat=meshMaterial(bagColor,.92);const bag=put(softBox(.39,.37,.18,bagMat,.045),body,-.33,1.30,.20);bag.rotation.z=-.07;
 put(softBox(.35,.18,.02,bagMat,.018),bag,0,.08,.10);link([-.14,.045,.115],[.14,.045,.115],.007,cream?strapMaterial:meshMaterial(0x696d66,.4,.5),bag);
 const buckle=put(softBox(width+.035,.065,.047,meshMaterial(0x454944,.5,.4),.012),body,-.02,1.77,.39);buckle.rotation.z=-.38;
}
function addHair(id,head,body,hair,highlight,spec){
 if(id==='gigica'){
  put(ball(.265,hair,1.02,.69,1),head,0,.17,-.075);
  // Short loose curtain bob with curled ends, open across forehead and both cheeks.
  for(const s of [-1,1])for(let i=0;i<7;i++){
   const lock=put(ball(.083,i%3?hair:highlight,.77,1.8,.76),head,s*(.19+(i%2)*.035),.10-i*.065,.02-(i%3)*.062);lock.rotation.z=s*(.23+Math.sin(i)*.12);
   if(i>3){const curl=torus(.043,.022,hair,head,s*.238,.04-i*.060,-.03,Math.PI*1.5);curl.rotation.y=s*.5;}
  }
 }else if(id==='thai'||id==='gabi'){
  put(ball(.265,hair,.99,.74,.98),head,0,.18,-.062);
  put(ball(.25,hair,1.03,id==='thai'?3.3:2.7,.65),head,0,id==='thai'?-.47:-.34,-.15);
  for(const s of [-1,1])for(let i=0;i<(id==='thai'?9:7);i++){
   const x=s*(.20+(i%3)*.025),y=.16-i*.145;
   const lock=put(ball(.09,i%3?hair:highlight,.72,1.85,.78),head,x+Math.sin(i*.8)*.02,y,.016+(i>2?.06:0));lock.rotation.z=s*(.16+Math.sin(i)*.13);lock.rotation.x=-.09;
  }
  if(id==='gabi')for(const s of [-1,1]){const fringe=put(ball(.068,highlight,.66,2.0,.50),head,s*.154,.18,.159);fringe.rotation.z=s*.31;}
 }else if(id==='samuel'){
  put(ball(.263,hair,.97,.64,.94),head,0,.185,-.03);
  for(let i=0;i<28;i++){const a=i*2.399963,r=.07+((i*7)%13)*.009;put(ball(.055,i%4?hair:highlight,1,1.03,.94),head,Math.cos(a)*r,.288+(i%4)*.018,Math.sin(a)*r-.023);}
 }else if(id==='kaka'){
  put(ball(.26,hair,.94,.58,.93),head,0,.188,-.04);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const lock=put(ball(.067,i%4?hair:highlight,.75,.76,.9),head,Math.sin(a)*.16,.245+(i%3)*.015,Math.cos(a)*.14-.015);lock.rotation.z=.15*Math.sin(i);}
 }else{
  put(ball(.259,hair,.96,.61,.95),head,0,.19,-.04);
  for(let i=0;i<18;i++){const x=(i%6-2.5)*.055,z=Math.floor(i/6)*.07-.085;const lock=put(ball(.067,i%4?hair:highlight,.62,id==='math'?1.35:1.0,.77),head,x,.275+(i%3)*.01,z);lock.rotation.z=id==='math'?-.28:-.50;lock.rotation.x=-.35;}
 }
}

// Textile maps reconstructed from the visible clothes. Tattoo strokes are reference-based approximations.
const newWardrobeCache=new Map();
function newWardrobeTexture(kind){
 if(newWardrobeCache.has(kind))return newWardrobeCache.get(kind);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const c=canvas.getContext('2d'),S=1024;
 let seed=[...kind].reduce((n,ch)=>n*31+ch.charCodeAt(0),87)>>>0;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const rect=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const weave=(opacity=.10)=>{c.lineWidth=.7;for(let y=0;y<S;y+=4){c.strokeStyle=`rgba(255,255,255,${opacity})`;c.beginPath();c.moveTo(0,y);c.lineTo(S,y);c.stroke();}for(let x=0;x<S;x+=4){c.strokeStyle=`rgba(0,0,0,${opacity})`;c.beginPath();c.moveTo(x,0);c.lineTo(x,S);c.stroke();}};
 if(kind==='knit-olive'||kind==='knit-black'){
  rect(kind==='knit-olive'?'#635c4b':'#1a1b1a',0,0,S,S);
  c.lineCap='round';
  for(let x=0;x<S;x+=18)for(let y=-12;y<S;y+=16){const shift=(Math.floor(y/16)%2)*2;c.strokeStyle='rgba(56,55,50,.28)';c.lineWidth=3;c.beginPath();c.moveTo(x-5+shift,y);c.quadraticCurveTo(x+2,y+10,x+shift,y+16);c.moveTo(x+7+shift,y);c.quadraticCurveTo(x+2,y+10,x+shift,y+16);c.stroke();c.strokeStyle='rgba(255,255,247,.20)';c.lineWidth=1;c.beginPath();c.moveTo(x+5+shift,y+2);c.lineTo(x+shift,y+12);c.stroke();}
  if(kind==='knit-black')for(let x=46;x<S;x+=126){c.lineWidth=7;c.strokeStyle='rgba(55,55,53,.23)';for(let y=-80;y<S;y+=116){c.beginPath();c.moveTo(x-20,y);c.bezierCurveTo(x+26,y+32,x+26,y+78,x-20,y+116);c.stroke();c.beginPath();c.moveTo(x+20,y);c.bezierCurveTo(x-26,y+32,x-26,y+78,x+20,y+116);c.stroke();}}
  weave(.035);
 }else if(kind==='jersey'){
  rect('#8dcced',0,0,S,S);
  for(let x=0;x<S;x+=256){rect('#eeeeea',x+110,0,20,S);rect('#14181d',x+130,0,108,S);rect('#eeeae5',x+238,0,18,S);}
  c.strokeStyle='rgba(209,219,222,.075)';c.lineWidth=3;
  for(let y=70;y<S;y+=117)for(let x=165;x<S;x+=256){c.beginPath();c.ellipse(x,y,33,43,.4,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(x,y,20,27,-.6,0,Math.PI*2);c.stroke();}
  weave(.025);
 }else if(kind==='thai-logo'){
  c.clearRect(0,0,S,S);
  rect('#11151a',0,415,S,246);c.fillStyle='#f6f4ec';c.textAlign='center';c.font='italic 900 210px Arial Black, Arial, sans-serif';c.fillText('RENNER',512,610,990);
  // Supplier mark and club crest visible in the shirt photograph.
  c.fillStyle='#11151a';c.beginPath();c.moveTo(105,160);c.lineTo(310,160);c.lineTo(207,285);c.closePath();c.fill();
  c.strokeStyle='#d9e9ed';c.lineWidth=5;for(let y=174;y<255;y+=13){c.beginPath();c.moveTo(106+(y-160)*.78,y);c.lineTo(310-(y-160)*.78,y);c.stroke();}
  c.fillStyle='#141b21';c.font='italic 800 47px Arial';c.fillText('PENALTY',207,343,210);
  const gx=793,gy=246,gr=118;c.save();c.beginPath();c.arc(gx,gy,gr,0,Math.PI*2);c.clip();rect('#8cc8e8',gx-gr,gy-gr,gr*2,gr*2);rect('#f2efdf',gx-gr,gy-55,gr*2,108);rect('#14191d',gx-gr,gy-37,gr*2,66);c.fillStyle='#f4f1e6';c.font='900 46px Arial';c.fillText('GRÊMIO',gx,gy+12,210);c.fillStyle='#2b3032';c.font='700 28px Arial';c.fillText('1903',gx,gy+86);c.restore();c.strokeStyle='#f4f1e7';c.lineWidth=9;c.beginPath();c.arc(gx,gy,gr,0,Math.PI*2);c.stroke();
  c.fillStyle='#e2c365';for(const sx of [750,793,836]){c.beginPath();for(let p=0;p<10;p++){const a=-Math.PI/2+p*Math.PI/5,r=p%2?6:15;c.lineTo(sx+Math.cos(a)*r,91+Math.sin(a)*r);}c.closePath();c.fill();}
 }else if(kind==='leopard'){
  rect('#b0a08b',0,0,S,S);
  for(let y=-25;y<S+50;y+=88)for(let x=-25;x<S+50;x+=84){const px=x+rand()*35,py=y+rand()*40,rx=15+rand()*20,ry=13+rand()*22;c.fillStyle=rand()>.5?'#897663':'#9a8770';c.beginPath();c.ellipse(px,py,rx*.9,ry*.8,rand()*3,0,Math.PI*2);c.fill();c.strokeStyle=rand()>.5?'#4a4038':'#574c41';c.lineWidth=8+rand()*5;const rot=rand()*Math.PI;c.beginPath();c.ellipse(px,py,rx,ry,rot,.2,Math.PI*1.25);c.stroke();c.beginPath();c.ellipse(px,py,rx,ry,rot,Math.PI*1.5,Math.PI*1.93);c.stroke();}
  for(let i=0;i<180;i++){c.fillStyle='#50493e';c.beginPath();c.ellipse(rand()*S,rand()*S,3+rand()*5,3+rand()*6,rand()*3,0,Math.PI*2);c.fill();}weave(.055);
 }else if(kind==='tartan'){
  rect('#303237',0,0,S,S);
  for(let p=0;p<S;p+=512){rect('#626366',p+154,0,110,S);rect('#777777',0,p+156,S,112);rect('#121519',p+206,0,34,S);rect('#191c20',0,p+210,S,37);rect('#d1cebf',p+271,0,62,S);rect('#bab8ae',0,p+272,S,62);rect('#171a1d',p+288,0,20,S);rect('#202326',0,p+289,S,18);rect('#5c242a',p+405,0,22,S);rect('#672a2c',0,p+406,S,20);rect('#922c36',p+410,0,4,S);rect('#8c353b',0,p+411,S,4);}
  weave(.13);
 }else if(kind==='kaka-logo'){
  c.clearRect(0,0,S,S);c.fillStyle='#b7ad63';c.textAlign='center';c.font='italic 900 375px Arial Black, Arial, sans-serif';c.fillText('Bow',510,575,850);c.strokeStyle='#b7ad63';c.lineWidth=7;c.beginPath();c.moveTo(105,645);c.lineTo(900,645);c.stroke();c.beginPath();c.moveTo(190,248);c.lineTo(48,641);c.lineTo(175,641);c.stroke();
 }else if(kind.startsWith('tattoo-')){
  c.clearRect(0,0,S,S);c.strokeStyle='rgba(42,42,39,.78)';c.fillStyle='rgba(42,42,39,.7)';c.lineCap='round';c.lineJoin='round';c.lineWidth=8;
  const leaf=(x,y,rot,scale=1)=>{c.save();c.translate(x,y);c.rotate(rot);c.scale(scale,scale);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-60,-83,0,-148);c.quadraticCurveTo(56,-75,0,0);c.stroke();c.beginPath();c.moveTo(0,0);c.lineTo(0,-138);c.stroke();c.restore();};
  const flower=(x,y,r)=>{for(let i=0;i<7;i++){const a=i*Math.PI*2/7;c.beginPath();c.ellipse(x+Math.cos(a)*r*.5,y+Math.sin(a)*r*.5,r*.42,r*.78,a,0,Math.PI*2);c.stroke();}c.beginPath();c.arc(x,y,r*.23,0,Math.PI*2);c.stroke();};
  if(kind==='tattoo-gigica'){
   c.lineWidth=9;c.beginPath();c.ellipse(510,540,40,125,.26,0,Math.PI*2);c.stroke();for(const s of [-1,1])for(let i=0;i<3;i++){c.beginPath();c.ellipse(510+s*(95+i*12),490+i*70,98-i*10,35,.4*s,0,Math.PI*2);c.stroke();}c.beginPath();c.moveTo(490,428);c.quadraticCurveTo(440,320,385,347);c.moveTo(522,424);c.quadraticCurveTo(585,330,620,355);c.stroke();
  }else if(kind==='tattoo-thai'){
   c.lineWidth=5;flower(250,280,120);leaf(310,480,.5,.95);leaf(445,690,-.9,.9);
   // Shell fan and flowing ornamental tentacles on the visible forearm.
   c.beginPath();c.moveTo(680,407);c.bezierCurveTo(440,283,491,148,670,155);c.bezierCurveTo(850,139,920,290,680,407);c.stroke();for(let p=0;p<9;p++){const x=510+p*42;c.beginPath();c.moveTo(680,407);c.quadraticCurveTo(x,250,x,190+Math.abs(p-4)*15);c.stroke();}
   c.beginPath();c.ellipse(700,605,72,97,.2,0,Math.PI*2);c.stroke();for(let i=0;i<5;i++){c.beginPath();c.moveTo(654+i*23,667);c.bezierCurveTo(580+i*77,800,820-i*60,830,705+i*39,936);c.stroke();}
  }else{
   c.lineWidth=6;for(let i=0;i<5;i++){const x=i%2?680:220,y=155+i*145;c.save();c.translate(x,y);c.rotate((i%3-1)*.2);if(i%3===0){c.strokeRect(-75,-50,150,100);c.beginPath();c.arc(0,0,31,0,Math.PI*2);c.stroke();c.strokeRect(-38,-72,66,22);}else if(i%3===1){c.beginPath();c.moveTo(-60,45);c.lineTo(0,-60);c.lineTo(65,45);c.closePath();c.stroke();c.beginPath();c.moveTo(0,-60);c.lineTo(13,45);c.stroke();}else{c.strokeRect(-60,-65,120,130);c.beginPath();c.moveTo(-40,-32);c.lineTo(36,-32);c.moveTo(-40,0);c.lineTo(30,0);c.moveTo(-40,32);c.lineTo(12,32);c.stroke();}c.restore();}
  }
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;newWardrobeCache.set(kind,texture);return texture;
}
