import * as THREE from './assets/three.module.js';
import {makeNewFighter} from './new-fighters.js';
import {getCharacter} from './roster.js';
import {makePowerVisual,disposeVisual} from './power-visuals.js';

const C = {orange:0xff6b21,cyan:0x4ce7da,steel:0x252b30,dark:0x0b1115};
const mat = (color,roughness=.65,metalness=.08,emissive=0x000000,emissiveIntensity=0) => new THREE.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity});
function box(w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.castShadow=true;o.receiveShadow=true;return o;}
function sphere(r,m,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),m);o.scale.set(sx,sy,sz);o.castShadow=true;return o;}
function cyl(r1,r2,h,m,n=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);o.castShadow=true;o.receiveShadow=true;return o;}
function at(o,p,x,y,z){o.position.set(x,y,z);p.add(o);return o;}
function lineBetween(a,b,r,m,parent){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va);const o=cyl(r,r,dir.length(),m,8);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());parent.add(o);return o;}
function labelTexture(text,bg='#111619',fg='#687176',small=''){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,1024,512);x.strokeStyle='#2a3034';x.lineWidth=2;for(let i=0;i<1024;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i,512);x.stroke();}for(let i=0;i<512;i+=64){x.beginPath();x.moveTo(0,i);x.lineTo(1024,i);x.stroke();}x.fillStyle=fg;x.font='900 190px sans-serif';x.textAlign='center';x.fillText(text,512,275);x.font='24px monospace';x.fillStyle='#7e8689';x.fillText(small,512,340);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}

// Procedural wardrobe maps based on the visible reference photographs.
// Tattoo lines are an approximation: the source photo does not resolve the full design.
function wardrobeTexture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const c=canvas.getContext('2d'),W=1024;
 let seed=761;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const fill=(color,y,h)=>{c.fillStyle=color;c.fillRect(0,y,W,h);};
 const steps=(cx,y,hw,hh,color,levels=9)=>{
  c.fillStyle=color;c.beginPath();
  for(let j=0;j<=levels;j++){
   const yy=y-hh+j*hh/levels,xw=hw*j/levels;
   c.lineTo(cx-xw,yy);c.lineTo(cx-xw,yy+hh/levels);
  }
  for(let j=levels;j>=0;j--){
   const yy=y+(levels-j)*hh/levels,xw=hw*j/levels;
   c.lineTo(cx+xw,yy);c.lineTo(cx+xw,yy-hh/levels);
  }
  c.closePath();c.fill();
 };
 if(kind==='victor'){
  fill('#e0d8c6',0,1024);fill('#c7bca6',90,90);fill('#a84437',176,174);fill('#b04b3b',206,96);
  fill('#79634f',340,49);fill('#47616a',389,42);fill('#266274',431,467);fill('#1b5368',865,50);fill('#ab4938',916,108);
  // Heathered fine colored bands visible across the woven jacket.
  for(let y=145;y<440;y+=9){c.fillStyle=y<340?'#874c3c':'#84745f';c.globalAlpha=.43;c.fillRect(0,y,1024,3);}
  c.globalAlpha=1;
  for(let k=-1;k<5;k++){
   const x=k*345+115;
   steps(x,716,179,190,'#e0ddd0');steps(x,716,99,100,'#b6ab96');steps(x,716,41,53,'#8b7660');
   steps(x+172,70,88,78,'#376b78',7);steps(x+172,70,40,39,'#e5e0d0',6);
  }
  // Woven fibers and threads, subtle enough to stay fabric rather than noise.
  for(let i=0;i<40000;i++){
   const x=rnd()*1024,y=rnd()*1024;
   c.strokeStyle=rnd()>.5?'rgba(238,227,208,.13)':'rgba(29,32,29,.13)';
   c.lineWidth=.5+rnd()*.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rnd()>.5?1:4),y+(rnd()>.5?4:1));c.stroke();
  }
  c.globalAlpha=.07;c.strokeStyle='#fff';c.lineWidth=1;
  for(let p=0;p<1024;p+=4){c.beginPath();c.moveTo(p,0);c.lineTo(p,1024);c.stroke();}
  c.globalAlpha=1;
 }else if(kind==='fii-logo'){
  c.clearRect(0,0,1024,1024);c.fillStyle='#e3e2dc';c.textAlign='center';c.textBaseline='alphabetic';
  c.save();c.transform(1,0,-.06,1,30,0);
  c.font='900 280px Arial Black, Impact, sans-serif';c.fillText('CALI',512,280,890);c.fillText('FOR',512,550,890);c.fillText('NIA',512,820,890);
  c.restore();
  // Central California bear silhouette, negative against the printed text.
  c.fillStyle='#161917';c.beginPath();c.moveTo(235,598);c.lineTo(245,536);c.bezierCurveTo(276,499,319,482,348,470);c.bezierCurveTo(400,435,470,429,522,440);c.bezierCurveTo(598,437,640,462,678,481);c.lineTo(738,480);c.lineTo(773,503);c.lineTo(803,508);c.lineTo(805,530);c.lineTo(779,550);c.lineTo(729,548);c.lineTo(711,570);c.lineTo(696,605);c.lineTo(705,650);c.lineTo(665,651);c.lineTo(646,592);c.lineTo(620,570);c.bezierCurveTo(563,591,503,602,445,583);c.lineTo(427,612);c.lineTo(417,660);c.lineTo(378,659);c.lineTo(369,604);c.lineTo(350,580);c.lineTo(307,608);c.lineTo(294,659);c.lineTo(248,657);c.lineTo(260,623);c.closePath();c.fill();
  c.beginPath();c.arc(724,481,15,0,Math.PI*2);c.fill();
  c.fillStyle='#e3e2dc';c.beginPath();c.arc(766,508,5,0,Math.PI*2);c.fill();
  c.strokeStyle='#e3e2dc';c.lineWidth=7;c.beginPath();c.moveTo(302,551);c.bezierCurveTo(387,489,490,471,590,493);c.stroke();
  c.fillStyle='#e3e2dc';c.font='700 60px Arial, sans-serif';c.fillText('CALIFORNIA REPUBLIC',512,930,930);
  // Five-point star above the shoulder of the print.
  c.fillStyle='#151816';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?26:55;c.lineTo(235+Math.cos(a)*r,135+Math.sin(a)*r);}c.closePath();c.fill();
 }else if(kind==='tattoo'){
  c.clearRect(0,0,1024,1024);c.strokeStyle='rgba(29,31,28,.86)';c.fillStyle='rgba(27,30,27,.75)';c.lineCap='round';c.lineJoin='round';
  // Dense floral linework, feathering and ornamental coils.
  for(let r=0;r<7;r++){
   const x=120+(r%3)*320+(rnd()-.5)*60,y=90+Math.floor(r/3)*335;
   for(let ring=0;ring<3;ring++)for(let p=0;p<7;p++){
    const a=p/7*Math.PI*2+ring*.23,rad=44+ring*30;
    c.lineWidth=4-ring*.7;c.beginPath();c.ellipse(x+Math.cos(a)*rad*.5,y+Math.sin(a)*rad*.5,rad*.48,rad*.8,a,0,Math.PI*2);c.stroke();
   }
   c.beginPath();c.arc(x,y,17,0,Math.PI*2);c.fill();
  }
  for(let k=0;k<14;k++){
   const x=rnd()*1024,y=rnd()*1024;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-85,y-120,x+140,y+30,x+70,y+170);c.stroke();
   for(let j=0;j<5;j++){const yy=y+j*27,xx=x+Math.sin(j*.7)*38; c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx-80,yy-42,xx-65,yy-2);c.quadraticCurveTo(xx-25,yy+20,xx,yy);c.fill();}
  }
  c.globalAlpha=.5;c.lineWidth=2;
  for(let k=0;k<100;k++){const x=rnd()*1024,y=rnd()*1024;c.beginPath();c.moveTo(x,y);c.lineTo(x+35,y+55);c.stroke();}c.globalAlpha=1;
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;texture.needsUpdate=true;return texture;
}

function rounded(w,h,d,m,r=.08){const g=new THREE.BoxGeometry(w,h,d,4,4,4);const p=g.attributes.position;const v=new THREE.Vector3();const core=new THREE.Vector3(w/2-r,h/2-r,d/2-r);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const q=new THREE.Vector3(Math.max(-core.x,Math.min(core.x,v.x)),Math.max(-core.y,Math.min(core.y,v.y)),Math.max(-core.z,Math.min(core.z,v.z)));v.sub(q).normalize().multiplyScalar(r).add(q);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function torsoShape(points,material,depth=.68,gap=0){const g=new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),40,gap,Math.PI*2-gap*2);const mesh=new THREE.Mesh(g,material);mesh.scale.z=depth;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function faceSurface(victor){const pos=[],uv=[],indices=[],rings=18,segs=48;for(let r=0;r<=rings;r++){for(let s=0;s<=segs;s++){const a=s/segs*Math.PI*2,k=r/rings;const xn=Math.cos(a)*k,yn=Math.sin(a)*k;const jaw=yn<-.2?1+yn*.15:1;const x=xn*(victor?.225:.246)*jaw,y=yn*.31-.015;const z=.13+Math.sqrt(Math.max(0,1-xn*xn*.9-yn*yn*.5))*.147+.026*Math.exp(-(x*x/.002+(y+.04)**2/.005));pos.push(x,y,z);uv.push(.5+xn*.5,.5+yn*.5);if(r<rings&&s<segs){const a=r*(segs+1)+s,b=a+segs+1;indices.push(a,b,a+1,b,b+1,a+1);}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
function makeFighter(id){
 const victor=id==='camera',accent=new THREE.Color(getCharacter(id).color).getHex();
 const skin=mat(victor?0xd8ae97:0xb8b8b2,.9,0),skinLight=mat(victor?0xe2baa5:0xc5c5be,.87,0),lips=mat(victor?0xb3786e:0x96766e,.8,0);
 const hair=mat(victor?0x3c2b23:0x171717,.97,0),hairLight=mat(victor?0x584439:0x282624,.98,0),beard=mat(victor?0x34251f:0x191919,.97,0);
 const black=mat(0x111213,.96,0),rib=mat(0x1b1c1c,1,0),white=mat(0xe8e6df,.97,0),denim=mat(victor?0x25272a:0x858784,1,0),seam=mat(victor?0x42464a:0xb8b7ae,.97,0),sole=mat(0x343633,.92,0);
 const jacket=mat(0xffffff,.98,0);jacket.map=wardrobeTexture('victor');jacket.needsUpdate=true;
 const group=new THREE.Group(),body=new THREE.Group();group.add(body);
 const hipWidth=victor?.64:.83;
 at(rounded(hipWidth,.3,victor?.38:.52,denim,.10),body,0,1.29,0);
 if(victor){
  const profile=[[.30,1.39],[.33,1.55],[.38,1.94],[.43,2.20],[.32,2.40]];
  const tee=torsoShape(profile,white,.68);body.add(tee);
  const coat=torsoShape(profile.map(([r,y])=>[r+.025,y]),jacket,.73,.24);body.add(coat);
  // Soft folded overshirt collar and placket, matching the photograph's open neck.
  for(const s of [-1,1]){
   const collar=at(rounded(.18,.29,.055,jacket,.015),body,s*.205,2.33,.225);collar.rotation.z=s*.30;collar.rotation.x=-.35;
   const edge=at(rounded(.037,.89,.033,jacket,.012),body,s*.094,1.91,.265);edge.rotation.z=-s*.07;
  }
  const button=mat(0xb9a178,.68,.06),hole=mat(0x605144,.95,0);
  for(const y of [1.57,1.83,2.12]){const b=at(cyl(.033,.033,.012,button,20),body,-.098,y,.296);b.rotation.x=Math.PI/2;for(const sx of [-.009,.009])at(sphere(.004,hole),body,-.098+sx,y,.305);}
  const collarRing=new THREE.Mesh(new THREE.TorusGeometry(.132,.016,8,32,Math.PI),white);collarRing.rotation.x=Math.PI/2;at(collarRing,body,0,2.42,.015);
 }else{
  const hoodie=torsoShape([[.40,1.34],[.46,1.43],[.52,1.65],[.55,1.94],[.52,2.20],[.36,2.42]],black,.77);body.add(hoodie);
  const hem=torsoShape([[.40,1.33],[.41,1.43]],rib,.81);body.add(hem);
  const hood=at(sphere(.35,rib,1.12,.61,.91),body,0,2.38,-.095);at(sphere(.255,black,1.13,.7,.85),body,0,2.41,-.07);
  // Printed white California graphic, not a luminous in-game costume badge.
  const graphic=new THREE.Mesh(new THREE.PlaneGeometry(.71,.70),new THREE.MeshStandardMaterial({map:wardrobeTexture('fii-logo'),transparent:true,roughness:1,metalness:0,depthWrite:false,side:THREE.DoubleSide}));at(graphic,body,0,1.98,.442);
  const pocket=at(rounded(.65,.25,.055,rib,.055),body,0,1.57,.375);
  for(const s of [-1,1]){lineBetween([s*.105,2.37,.29],[s*.13,1.91,.425],.012,black,body);at(cyl(.013,.013,.055,sole,8),body,s*.13,1.89,.427);}
 }
 at(cyl(victor?.125:.155,victor?.145:.18,.24,skin,24),body,0,2.48,0);
 const head=new THREE.Group();at(head,body,0,2.78,0);const faceDetails=new THREE.Group();head.add(faceDetails);
 // Sculpted skull, cheeks and jaw rather than cube heads.
 const skull=at(sphere(.258,skinLight,victor?.87:.96,1.19,.88),head,0,0,-.012);
 at(sphere(.198,skin,victor?.91:1.05,.69,.86),head,0,-.195,.035);
 for(const s of [-1,1]){
  at(sphere(.088,skinLight,.75,.95,.75),head,s*.145,-.06,.154);
  const ear=at(sphere(.056,skin,.62,1.3,.54),head,s*(victor?.235:.254),-.015,-.002);at(sphere(.033,lips,.55,1.15,.5),head,s*(victor?.247:.266),-.013,.017);
  // Eyelids, iris and softly modeled brows give the face natural depth.
  at(sphere(.071,skin,.9,.56,.42),faceDetails,s*.102,.037,.215);
  at(sphere(.055,white,1,.43,.36),faceDetails,s*.102,.038,.239);
  at(sphere(.023,mat(victor?0x514130:0x4b4840,.5,0),.83,1,.40),faceDetails,s*.102,.038,.259);
  at(sphere(.011,black,1,1,.4),faceDetails,s*.102,.038,.268);
  at(sphere(.0038,white),faceDetails,s*.096,.045,.273);
  const brow=at(sphere(.074,hair,1,.21,.35),faceDetails,s*.105,.102,.229);brow.rotation.z=s*.13;
 }
 at(sphere(.056,skinLight,.54,1.36,.64),faceDetails,0,.005,.237);
 at(sphere(.043,skinLight,.8,.55,.85),faceDetails,0,-.04,.277);
 for(const s of [-1,1]){at(sphere(.024,skin,.8,.55,.8),faceDetails,s*.029,-.046,.256);at(sphere(.010,lips,.8,.4,.4),faceDetails,s*.024,-.056,.274);}
 const mouth=at(sphere(.069,lips,1,.26,.28),faceDetails,0,-.126,.245);
 const mouthLine=at(sphere(.060,mat(0x5d3e36,.9,0),1,.045,.15),faceDetails,0,-.127,.259);
 at(sphere(.061,skinLight,1,.24,.27),faceDetails,0,-.147,.237);
 // Beard follows cheeks and jaw, leaving lips visible. Keep sideburns when photo face is used.
 for(const s of [-1,1]){
  const sideburn=at(sphere(.095,beard,.35,1.65,.65),head,s*(victor?.203:.216),-.12,.055);sideburn.rotation.z=s*.10;
  const jawBeard=at(sphere(.158,beard,.58,.70,.65),head,s*.13,-.235,.07);jawBeard.rotation.z=s*.43;
  const cheekBeard=at(sphere(.115,beard,.53,.58,.48),faceDetails,s*.143,-.164,.187);cheekBeard.rotation.z=-s*.2;
  const moustache=at(sphere(.072,beard,1,.26,.32),faceDetails,s*.043,-.092,.252);moustache.rotation.z=-s*.2;
 }
 at(sphere(victor?.14:.16,beard,1,.55,.63),faceDetails,0,-.248,.16);
 at(sphere(.034,beard,.65,.65,.4),faceDetails,0,-.174,.245);
 // Individual swept locks retain the two very different cuts.
 if(victor){
  at(sphere(.257,hair,.89,.57,.88),head,0,.235,-.028);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;const x=Math.sin(a)*(.075+(i%3)*.032),z=Math.cos(a)*.14-.035;const lock=at(sphere(.072,i%3?hair:hairLight,.55,1.38,.60),head,x,.29+(i%4)*.013,z);lock.rotation.z=-.40-(i%3)*.12;lock.rotation.x=.30;}
  // Tortoiseshell round frames, thin bridge and side arms.
  const frame=mat(0x302724,.42,.12),glass=new THREE.MeshPhysicalMaterial({color:0xdce3dc,transparent:true,opacity:.11,roughness:.03,metalness:0,depthWrite:false});
  for(const s of [-1,1]){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.108,.012,10,48),frame);ring.scale.y=.94;at(ring,faceDetails,s*.112,.046,.283);
   const lens=new THREE.Mesh(new THREE.CircleGeometry(.100,40),glass);lens.scale.y=.94;at(lens,faceDetails,s*.112,.046,.281);
   lineBetween([s*.211,.071,.277],[s*.235,.075,-.036],.010,frame,head);
   at(sphere(.008,mat(0xc0a37b,.35,.5)),faceDetails,s*.212,.087,.294);
  }
  const bridge=new THREE.Mesh(new THREE.TorusGeometry(.025,.009,8,20,Math.PI),frame);at(bridge,faceDetails,0,.073,.282);
 }else{
  at(sphere(.258,hair,.96,.68,.91),head,0,.172,-.035);
  // Close sides and short upward quiff.
  for(let i=0;i<19;i++){const x=(i%5-2)*.055,z=Math.floor(i/5)*.053-.11;const spike=at(sphere(.052,i%4?hair:hairLight,.55,1.5,.63),head,x,.291+(i%3)*.012,z);spike.rotation.z=(i%3-1)*.18;spike.rotation.x=-.25;}
  for(const s of [-1,1]){const plug=at(cyl(.034,.034,.025,black,24),head,s*.26,-.064,.011);plug.rotation.z=Math.PI/2;const rim=new THREE.Mesh(new THREE.TorusGeometry(.028,.006,8,24),sole);rim.rotation.y=Math.PI/2;at(rim,head,s*.276,-.064,.011);}
 }
 const photoFace=new THREE.Mesh(faceSurface(victor),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,side:THREE.DoubleSide}));head.add(photoFace);photoFace.visible=false;photoFace.renderOrder=1;
 const joints={body,head};
 for(const [side,s] of [['L',-1],['R',1]]){
  const armRadius=victor?.145:.185;
  const shoulder=new THREE.Group();at(shoulder,body,s*(victor?.435:.535),2.27,0);
  at(sphere(armRadius*(victor?1.12:1.16),victor?jacket:black,1,1.2,1),shoulder,0,-.065,0);
  at(cyl(armRadius,armRadius*.90,.47,victor?jacket:black,28),shoulder,0,-.275,0);
  const elbow=new THREE.Group();at(elbow,shoulder,0,-.51,0);
  at(sphere(armRadius*.88,victor?jacket:black),elbow,0,-.005,0);
  if(victor){at(cyl(.131,.10,.42,jacket,28),elbow,0,-.20,0);at(cyl(.107,.105,.075,jacket,28),elbow,0,-.405,0);}
  else{at(cyl(.16,.133,.22,black,28),elbow,0,-.10,0);at(cyl(.139,.136,.07,rib,28),elbow,0,-.21,0);at(cyl(.133,.102,.22,skin,28),elbow,0,-.32,0);
   const inkMat=new THREE.MeshStandardMaterial({map:wardrobeTexture('tattoo'),transparent:true,roughness:1,metalness:0,depthWrite:false});
   const ink=at(cyl(.134,.104,.215,inkMat,28),elbow,0,-.323,0);ink.rotation.y=s*.4;
  }
  at(cyl(.095,.085,.07,skin,20),elbow,0,-.444,0);
  const hand=at(sphere(victor?.105:.116,skinLight,.9,1.03,.63),elbow,0,-.515,.015);
  // Four rounded knuckles and articulated thumb, ungloved in both references.
  for(let k=0;k<4;k++){at(sphere(.025,skinLight,.75,1.1,.70),elbow,-.060+k*.039,-.575,.035);at(sphere(.029,skin,.66,1.07,.69),elbow,-.060+k*.039,-.541,.078);}
  const thumb=at(sphere(.039,skin,.65,1.4,.73),elbow,-s*.081,-.49,.043);thumb.rotation.z=s*.25;
  if(!victor){
   const handInk=new THREE.Mesh(new THREE.PlaneGeometry(.15,.13),new THREE.MeshStandardMaterial({map:wardrobeTexture('tattoo'),transparent:true,roughness:1,depthWrite:false}));at(handInk,elbow,0,-.52,.085);
   if(side==='L'){const strap=at(cyl(.112,.112,.058,black,24),elbow,0,-.409,0);const watch=at(rounded(.11,.10,.035,sole,.018),elbow,0,-.405,.11);at(rounded(.082,.075,.006,black,.012),elbow,0,-.405,.131);}
  }
  const hip=new THREE.Group();at(hip,body,s*(victor?.195:.25),1.23,0);
  const thighRadius=victor?.18:.235;
  at(cyl(thighRadius,thighRadius*.79,.57,denim,32),hip,0,-.275,0);
  const knee=new THREE.Group();at(knee,hip,0,-.55,0);
  if(victor){at(sphere(.143,denim),knee,0,0,0);at(cyl(.143,.10,.49,denim,28),knee,0,-.22,0);}
  else{at(cyl(.188,.188,.08,seam,28),hip,0,-.54,0);at(sphere(.156,skinLight,1,1.03,1),knee,0,-.012,.015);at(cyl(.151,.098,.45,skin,28),knee,0,-.235,0);at(cyl(.101,.10,.075,black,24),knee,0,-.444,0);}
  // The photographs do not show footwear; unobtrusive neutral shoes are provisional.
  at(rounded(.23,.15,.39,black,.06),knee,0,-.509,.09);at(rounded(.238,.045,.402,sole,.018),knee,0,-.574,.094);
  for(let k=0;k<3;k++)lineBetween([-.07,-.452,.095+k*.04],[.07,-.452,.095+k*.04],.007,seam,knee);
  joints['arm'+side]=shoulder;joints['elbow'+side]=elbow;joints['leg'+side]=hip;joints['knee'+side]=knee;
 }
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(victor?.58:.70,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;group.add(shadow);
 const aura=new THREE.Mesh(new THREE.RingGeometry(.56,.59,48),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false}));aura.rotation.x=-Math.PI/2;aura.position.y=.025;group.add(aura);
 return {group,joints,shadow,aura,accent,photoFace,faceDetails};
}

export class Arena {
 constructor(canvas){
  this.canvas=canvas;this.time=0;this.effects=[];this.shake=0;this.projectilePool=[];
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.35;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x090d10);this.scene.fog=new THREE.FogExp2(0x0b1014,.033);
  this.camera=new THREE.PerspectiveCamera(38,1,.1,80);this.camera.position.set(0,4,18);
  this.scene.add(new THREE.HemisphereLight(0x93b2c3,0x21140b,1.5));
  const key=new THREE.DirectionalLight(0xffc9a4,3.2);key.position.set(-5,9,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.bias=-.0008;this.scene.add(key);
  const fill=new THREE.DirectionalLight(0x7ff7ed,2.1);fill.position.set(6,5,-2);this.scene.add(fill);
  this.buildStage();
  this.models={camera:makeFighter('camera'),frequencia:makeFighter('frequencia')};Object.values(this.models).forEach(f=>this.scene.add(f.group));
  this.resize();
  this.faceSources={};
  const sheets=[
   {url:'./assets/likeness-faces.png',width:1774,height:887,crops:{camera:[230,175,500,705],frequencia:[1090,140,510,740]}},
   {url:'./assets/eric-gigica.png',width:1774,height:887,crops:{gigica:[230,175,465,665],eric:[1100,160,490,710]}},
   {url:'./assets/roster-five.png',width:2172,height:724,crops:{kaka:[72,185,330,445],thai:[515,160,310,440],samuel:[925,190,345,430],gabi:[1375,170,300,465],math:[1805,160,325,475]}},
  ];
  this.faceTextureReady=Promise.all(sheets.map(sheet=>new Promise(resolve=>{
   new THREE.TextureLoader().load(new URL(sheet.url,import.meta.url).href,texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    for(const [id,rect] of Object.entries(sheet.crops)){
     const crop={x:rect[0],y:rect[1],width:rect[2],height:rect[3],imageWidth:sheet.width,imageHeight:sheet.height};
     this.faceSources[id]={texture,crop};if(this.models[id])this.setFaceTexture(id,texture,crop);
    }
    resolve(true);
   },undefined,()=>resolve(false));
  }))).then(results=>results.every(Boolean));
 }
 ensureModel(id){
  if(!this.models[id]){
   const model=makeNewFighter(id);if(!model)return null;
   this.models[id]=model;this.scene.add(model.group);
   if(this.faceSources[id]){const {texture,crop}=this.faceSources[id];this.setFaceTexture(id,texture,crop);}
  }
  return this.models[id];
 }

 setFaceTexture(id,texture,crop){
  const model=this.models[id];if(!model)return;
  const map=texture.clone();const w=crop.imageWidth||texture.image.width,h=crop.imageHeight||texture.image.height;
  map.repeat.set(crop.width/w,crop.height/h);map.offset.set(crop.x/w,1-(crop.y+crop.height)/h);map.needsUpdate=true;
  model.photoFace.material.map=map;model.photoFace.material.emissive.setHex(0xffffff);model.photoFace.material.emissiveMap=map;model.photoFace.material.emissiveIntensity=.12;model.photoFace.material.needsUpdate=true;
  model.photoFace.visible=true;model.faceDetails.visible=false;
 }
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 buildStage(){
  const scene=this.scene,steel=mat(0x2a3136,.46,.7),black=mat(0x10161a,.8),floorMat=mat(0x1b2228,.7,.22);
  const tc=document.createElement('canvas');tc.width=256;tc.height=256;const ctx=tc.getContext('2d'),im=ctx.createImageData(256,256);for(let i=0;i<im.data.length;i+=4){const v=60+Math.random()*20;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);const tx=new THREE.CanvasTexture(tc);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(20,20);floorMat.map=tx;
  const floor=at(box(35,.2,24,floorMat),scene,0,-.13,-3);floor.receiveShadow=true;
  at(box(29,10,.4,mat(0x0a1014)),scene,0,4.9,-9);
  for(let i=-14;i<=14;i+=2){at(box(.08,9,.16,steel),scene,i,4.5,-8.7);}
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(13,5.5),new THREE.MeshBasicMaterial({map:labelTexture('STUDIO 01','#10171c','#303b41','MALOK PICTURES     /     SOUNDSTAGE A')}));at(screen,scene,0,3.7,-8.4);
  const screenFrame=at(box(13.5,6,.22,steel),scene,0,3.7,-8.6);
  // Floor tape and film-set lanes.
  const tape=mat(0x77664d,.9),soft=mat(0x3c454a,.9);
  for(const x of [-8.5,8.5])at(box(.055,.006,7,tape),scene,x,.002,0);
  for(const z of [-3.5,3.5])at(box(17,.008,.05,tape),scene,0,.002,z);
  for(let x=-7;x<=7;x+=2){at(box(.6,.009,.045,soft),scene,x,.006,1.3);at(box(.04,.009,.3,soft),scene,x,.006,1.3);}
  const emissiveOrange=mat(C.orange,.4,.3,C.orange,3),emissiveCyan=mat(C.cyan,.4,.3,C.cyan,3);
  for(const s of [-1,1]){
   const m=s<0?emissiveOrange:emissiveCyan;
   at(box(.055,4.8,.07,m),scene,s*6.2,3.4,-7.95);
   at(box(.055,3.8,.07,m),scene,s*6.42,3.4,-7.95);
   const p=new THREE.PointLight(s<0?C.orange:C.cyan,30,15,2);at(p,scene,s*5,4,-4);
   // Tall truss towers.
   for(const dx of [-.28,.28])for(const dz of [-.22,.22])at(cyl(.045,.045,6.2,steel,8),scene,s*9+dx,3.1,-5+dz);
   for(let y=.2;y<6;y+=.6){lineBetween([s*9-.28,y,-4.78],[s*9+.28,y+.6,-4.78],.025,steel,scene);lineBetween([s*9+.28,y,-5.22],[s*9-.28,y+.6,-5.22],.025,steel,scene);}
   at(box(1.1,.1,1,steel),scene,s*9,.03,-5);
   this.addSpot(s*8,5.7,-4,s<0?C.orange:C.cyan,steel);
   // Speaker stacks.
   for(let k=0;k<2;k++){const cabinet=at(box(1,1.15,.8,black),scene,s*7.5,.58+k*1.16,-6.1);for(const h of [-.25,.25]){const d=at(cyl(.24,.24,.04,steel,24),cabinet,0,h,.42);d.rotation.x=Math.PI/2;at(sphere(.12,black,1,1,.25),cabinet,0,h,.45);}}
   // Cable on floor.
   const points=[];for(let i=0;i<40;i++){const u=i/39;points.push(new THREE.Vector3(s*(7+Math.sin(u*5)*.6),.02,-4+u*6));}const tube=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,.025,5,false);scene.add(new THREE.Mesh(tube,black));
  }
  // Overhead horizontal truss with diagonals.
  for(const y of [6.2,6.65])for(const z of [-4.8,-5.2])lineBetween([-9,y,z],[9,y,z],.05,steel,scene);
  for(let x=-9;x<9;x++){lineBetween([x,6.2,-4.8],[x+1,6.65,-4.8],.025,steel,scene);}
  for(const x of [-5,0,5])this.addSpot(x,6.3,-5,0xffe8cd,steel);
  // Camera with three-legged dolly, lens and monitor.
  const cam=new THREE.Group();cam.position.set(-9.4,0,1.5);cam.rotation.y=.65;scene.add(cam);
  for(const a of [0,2.094,4.188]){const ex=Math.cos(a)*.7,ez=Math.sin(a)*.7;lineBetween([0,1.65,0],[ex,.17,ez],.045,steel,cam);at(sphere(.1,black),cam,ex,.09,ez);}
  at(cyl(.075,.075,.6,steel),cam,0,1.68,0);at(box(.72,.48,.45,black),cam,0,2.1,0);const lens=at(cyl(.19,.22,.45,steel),cam,0,2.1,.38);lens.rotation.x=Math.PI/2;const glass=at(cyl(.15,.15,.02,mat(0x092d3e,.05,.7)),cam,0,2.1,.615);glass.rotation.x=Math.PI/2;
  at(box(.4,.28,.04,mat(0x133548,.3,.3,0x164c59,.7)),cam,-.53,2.2,0);lineBetween([-.3,2.2,0],[-.55,2.2,0],.03,steel,cam);lineBetween([0,2.4,-.1],[0,2.4,.2],.04,steel,cam);
  // Equipment cases and production practicals.
  for(let i=0;i<3;i++){const flight=at(box(1.5,.6,1,mat(0x20262a,.7,.2)),scene,8.5+i*.25,.3+i*.61,-2.7);for(const dx of [-.7,.7])at(box(.035,.59,1.01,steel),flight,dx,0,0);at(box(.3,.1,.02,steel),flight,0,0,.51);}
  const rec=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.6),new THREE.MeshBasicMaterial({map:labelTexture('REC','#160c0a','#ff632d','')}));at(rec,scene,9,4.9,-8.45);
  // Atmospheric particles.
  const positions=new Float32Array(140*3);for(let i=0;i<140;i++){positions[i*3]=(Math.random()-.5)*25;positions[i*3+1]=Math.random()*8;positions[i*3+2]=(Math.random()-.5)*14;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));this.dust=new THREE.Points(g,new THREE.PointsMaterial({color:0xc6ae8c,size:.027,transparent:true,opacity:.36,depthWrite:false}));scene.add(this.dust);
 }
 addSpot(x,y,z,color,steel){
  const stand=new THREE.Group();stand.position.set(x,y,z);stand.rotation.x=.45;this.scene.add(stand);
  at(box(.65,.46,.5,mat(0x151c20)),stand,0,0,0);const face=at(cyl(.19,.19,.035,mat(color,.25,.2,color,5)),stand,0,0,.27);face.rotation.x=Math.PI/2;
  for(const s of [-1,1]){const flap=at(box(.27,.5,.025,steel),stand,s*.42,0,.35);flap.rotation.y=s*.45;}
  const spot=new THREE.SpotLight(color,65,22,Math.PI/7,.8,1.3);spot.position.set(x,y,z+.4);spot.target.position.set(x*.25,0,1);this.scene.add(spot,spot.target);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(2.1,7,28,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.018,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));beam.position.set(x*.65,y/2,z+2.2);beam.rotation.x=-.43;beam.rotation.z=x*.025;this.scene.add(beam);
 }
 burst(x,y,color=C.orange){
  this.shake=.13;const col=typeof color==='string'?new THREE.Color(color):new THREE.Color(color);
  for(let i=0;i<15;i++){const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:1,depthWrite:false});const p=new THREE.Mesh(new THREE.BoxGeometry(.055,.055,.18),m);p.position.set(x,y,.1);const a=Math.random()*Math.PI*2,s=2+Math.random()*4;this.scene.add(p);this.effects.push({mesh:p,v:new THREE.Vector3(Math.cos(a)*s,Math.sin(a)*s,(Math.random()-.5)*4),life:.45,max:.45});}
  const ring=new THREE.Mesh(new THREE.RingGeometry(.1,.15,32),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));ring.position.set(x,y,.2);this.scene.add(ring);this.effects.push({mesh:ring,ring:true,life:.3,max:.3});
 }
 powerEffect(e){
  const color=getCharacter(e.id).color,icon=makePowerVisual(e.visual||'flash',color);icon.position.set(e.x,e.y,.4);
  let life=.65,expand=0;
  if(e.powerType==='beam'){const beam=new THREE.Mesh(new THREE.BoxGeometry(12,.13,.13),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));beam.position.x=e.dir*6;icon.add(beam);life=.4;}
  if(e.powerType==='radial'){expand=5;life=.6;}
  if(e.powerType==='heal'){expand=1.5;life=.85;}
  if(e.powerType==='teleport'){const old=makePowerVisual(e.visual,color);old.position.set(e.fromX,e.y,.3);this.scene.add(old);this.effects.push({mesh:old,life:.4,max:.4,expand:2});expand=2;}
  if(e.powerType==='rain')icon.position.set(e.targetX,4.5,.3);
  this.scene.add(icon);this.effects.push({mesh:icon,life,max:life,expand,icon:true,v:new THREE.Vector3(0,e.powerType==='heal'?1:0,0)});
 }
 animateFighter(f,dt,mode){
  const m=this.models[f.id];if(!m)return;const j=m.joints,t=this.time,atime=f.actionT||0,a=f.action||'idle',walk=a==='walk';
  m.group.position.set(f.x||0,f.y||0,f.z||0);const turn=(f.facing||1)*1.03;m.group.rotation.y+=(turn-m.group.rotation.y)*(1-Math.exp(-dt*22));
  const p={bodyX:Math.sin(t*2.4)*.025,bodyZ:Math.sin(t*2.1)*.025,bodyY:Math.sin(t*4.4)*.045,headX:0,headY:0,armLX:-.75,armLZ:-.24,elbowLX:-1.0,armRX:-.88,armRZ:.2,elbowRX:-1.23,legLX:-.1,legRX:.15,legLZ:-.12,legRZ:.13,kneeLX:.2,kneeRX:.15};
  if(mode!=='fight'){p.armLX=-.1+Math.sin(t*2.3+f.x)*.05;p.armRX=-.3+Math.cos(t*2.1)*.07;p.elbowLX=-.2;p.elbowRX=-.65;p.bodyY+=.02;}
  if(walk){const s=Math.sin(t*12);p.legLX=s*.5;p.legRX=-s*.5;p.kneeLX=Math.max(0,-s)*.65+.1;p.kneeRX=Math.max(0,s)*.65+.1;p.bodyY+=Math.abs(Math.sin(t*12))*.05;p.armLX+=s*.12;p.armRX-=s*.12;}
  const progress=Math.min(1,atime/(f.attackDuration||.34)),strike=Math.sin(progress*Math.PI),step=f.chainStep||1;
  if(f.move){const run=Math.sin(t*14);p.legLX=run*.62;p.legRX=-run*.62;p.kneeLX=Math.max(0,-run)*.85+.13;p.kneeRX=Math.max(0,run)*.85+.13;p.bodyX=.13;p.bodyY+=Math.abs(run)*.05;}
  if(a==='punch'){
   const side=step===2?'L':'R';p['arm'+side+'X']=-.7-strike*(step===3?1.9:1.05);p['elbow'+side+'X']=-1.1+strike*(step===3?.55:1.05);p.bodyZ=(step===2?1:-1)*strike*.2;p.bodyX=-strike*.16;p.bodyY+=step===3?strike*.13:0;
   if(step===3){p.armRZ=.28;p.kneeLX=.35*(1-strike);p.kneeRX=.3*(1-strike);}
  }
  if(a==='kick'){const side=step===2?'L':'R';p['leg'+side+'X']=-strike*(step===3?2.05:step===1?1.15:1.65);p['knee'+side+'X']=.1;p.bodyX=strike*.3;p.bodyZ=(step===2?1:-1)*strike*.15;p.armLX=-1.1;p.armRX=-.15;p.elbowRX=-1.4;}
  if(a==='special'){const k=Math.sin(progress*Math.PI);p.armRX=-1.55;p.armLX=-1.55;p.elbowRX=-.15;p.elbowLX=-.15;p.bodyX=-.15*k;
   if(f.powerType==='dash'){p.bodyX=.36;p.armRX=-1.2;p.armLX=.4;p.legLX=Math.sin(t*20)*.7;p.legRX=-p.legLX;}
   if(f.powerType==='trap'){p.bodyY=-.35*k;p.armRX=-.6;p.elbowRX=-.2;p.kneeRX=.7*k;}
   if(f.powerType==='rain'||f.powerType==='radial'){p.armRX=-2.6*k;p.armLX=-2.6*k;p.armLZ=-.5;p.armRZ=.5;}
   if(f.powerType==='heal'||f.powerType==='shield'){p.armRX=-.8;p.armLX=-.8;p.elbowRX=-1.2;p.elbowLX=-1.2;}
  }
  if(a==='block'){p.armRX=-1.5;p.armLX=-1.5;p.elbowRX=-1.5;p.elbowLX=-1.5;p.bodyX=.1;p.bodyY=-.1;}
  if(a==='crouch'){p.bodyY=-.65;p.legLX=-1;p.legRX=-1;p.kneeLX=1.65;p.kneeRX=1.65;p.bodyX=.18;}
  if(a==='jump'||f.y>.1){p.legLX=-.45;p.legRX=-.3;p.kneeLX=.9;p.kneeRX=.6;if(a==='kick'){p.legRX=-1.7;p.kneeRX=.05;}}
  if(a==='hurt'){p.bodyX=-.3;p.armLX=-.4;p.armRX=-.4;p.headX=-.25;}
  if(a==='win'){p.armLX=-2.7;p.armRX=-2.7;p.armLZ=-.4;p.armRZ=.4;p.elbowLX=-.4;p.elbowRX=-.4;p.bodyY+=Math.sin(t*5)*.035;}
  if(a==='ko'){p.bodyY=-1.12;p.bodyX=-1.4;p.legLX=.1;p.legRX=.2;p.armLX=0;p.armRX=0;p.elbowLX=-.2;p.elbowRX=-.2;}
  const damp=1-Math.exp(-dt*18),set=(obj,axis,v)=>obj.rotation[axis]+=(v-obj.rotation[axis])*damp;
  j.body.position.y+=(p.bodyY-j.body.position.y)*damp;set(j.body,'x',p.bodyX);set(j.body,'z',p.bodyZ);set(j.head,'x',p.headX);set(j.head,'y',Math.sin(t*1.6)*.045);
  if(!m.shieldBubble){m.shieldBubble=new THREE.Mesh(new THREE.SphereGeometry(1.1,20,14),new THREE.MeshBasicMaterial({color:m.accent,transparent:true,opacity:.12,wireframe:true,depthWrite:false}));m.shieldBubble.position.y=1.65;m.shieldBubble.scale.y=1.4;m.group.add(m.shieldBubble);}m.shieldBubble.visible=(f.shield||0)>0;m.shieldBubble.rotation.y=t;
  for(const s of ['L','R']){set(j['arm'+s],'x',p['arm'+s+'X']);set(j['arm'+s],'z',p['arm'+s+'Z']);set(j['elbow'+s],'x',p['elbow'+s+'X']);set(j['leg'+s],'x',p['leg'+s+'X']);set(j['leg'+s],'z',p['leg'+s+'Z']);set(j['knee'+s],'x',p['knee'+s+'X']);}
  m.shadow.position.y=.02-(f.y||0);m.shadow.scale.setScalar(1+(f.y||0)*.15);m.shadow.material.opacity=.3/(1+(f.y||0));m.aura.position.y=.025-(f.y||0);m.aura.material.opacity=a==='special'?.6:.2;
 }
 render(dt,fighters,mode='fight',projectiles=[]){
  dt=Math.min(dt,.05);this.time+=dt;for(const model of Object.values(this.models))model.group.visible=false;for(const f of fighters){const model=this.ensureModel(f.id);if(model){model.group.visible=true;this.animateFighter(f,dt,mode);}}
  this.dust.rotation.y=this.time*.007;
  for(let i=0;i<Math.max(projectiles.length,this.projectilePool.length);i++){
   const p=projectiles[i];let g=this.projectilePool[i];if(!p){if(g)g.visible=false;continue;}
   const kind=p.visual||'sound',color=getCharacter(p.id).color;
   if(!g||g.userData.kind!==kind||g.userData.ownerId!==p.id){if(g){this.scene.remove(g);disposeVisual(g);}g=makePowerVisual(kind,color);g.userData.kind=kind;g.userData.ownerId=p.id;this.scene.add(g);this.projectilePool[i]=g;}
   g.visible=(p.delay||0)<=0;g.position.set(p.x,p.y,.2);g.rotation.set(0,0,p.type==='rain'?this.time*3:Math.sin(this.time*7)*.08);g.scale.setScalar(p.type==='trap'?1.4:1);if(p.type==='trap'){g.rotation.x=-Math.PI/3;g.position.y=.12+Math.sin(this.time*6)*.04;}if(p.type==='wave')g.scale.set(1.5,.9,1);
  }
  for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.life<=0){this.scene.remove(e.mesh);disposeVisual(e.mesh);this.effects.splice(i,1);continue;}e.mesh.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=e.life/e.max;}});if(e.ring||e.expand)e.mesh.scale.setScalar(1+(1-e.life/e.max)*(e.expand||8));else if(e.v){e.mesh.position.addScaledVector(e.v,dt);e.v.y-=e.icon?0:10*dt;e.mesh.rotation.z+=dt*(e.icon?1:8);}}
  const aspect=this.camera.aspect,portrait=aspect<1;let target=new THREE.Vector3(0,1.5,0),pos;
  if(mode==='home'){pos=new THREE.Vector3(1.2,4,portrait?21:14.5);target.set(portrait?-.5:-1.6,1.5,-.5);}else if(mode==='select'){pos=new THREE.Vector3(0,3.1,portrait?18:13.5);target.set(0,1.6,0);}else{const mid=((fighters[0]?.x||0)+(fighters[1]?.x||0))/2;const span=Math.abs((fighters[0]?.x||0)-(fighters[1]?.x||0));const distance=Math.max(15,(span*.6+2.2)/(Math.tan(19*Math.PI/180)*aspect));pos=new THREE.Vector3(mid,4,distance);target.set(mid,1.6,0);}
  this.camera.position.lerp(pos,1-Math.exp(-dt*3));this.camera.lookAt(target);if(this.shake>0&&dt>0){this.shake-=dt;this.camera.position.x+=(Math.random()-.5)*this.shake*.9;this.camera.position.y+=(Math.random()-.5)*this.shake*.5;}
  this.renderer.render(this.scene,this.camera);
 }
}
