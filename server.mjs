// Malok Kombat LAN — servidor sem dependências (Node.js 18+).
// Serve a versão original do jogo adaptada para dois jogadores e gerencia salas.
import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const host=process.env.MALOK_HOST||'0.0.0.0';
const port=Number(process.env.PORT||8765);
const production=process.env.NODE_ENV==='production';
const maxRooms=Math.max(1,Number(process.env.MALOK_MAX_ROOMS||250));
const maxConnections=Math.max(2,Number(process.env.MALOK_MAX_CONNECTIONS||600));
const MAX_EVENTS_PER_SECOND=220;
const ids=new Set(['camera','math','thai','eric','gigica','kaka','samuel','gabi','frequencia']);
const rooms=new Map();
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(){let code='';do{code=Array.from(crypto.randomBytes(6),b=>alphabet[b%alphabet.length]).join('');}while(rooms.has(code));return code;}
const appHtml=path.join(root,'index.html');
const typeFor={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp3':'audio/mpeg','.ttf':'font/ttf','.woff2':'font/woff2','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'};
const diagnosticsHtml=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Malok Kombat - Diagnóstico</title><style>body{background:#101611;color:#e9ede5;font:16px system-ui;padding:20px;max-width:700px;margin:auto}h1{color:#ff773d}li{padding:10px;border-bottom:1px solid #334138}button,a{background:#ff773d;color:#101611;border:0;border-radius:5px;padding:11px;display:inline-block;margin-top:12px;text-decoration:none;font-weight:700}code{overflow-wrap:anywhere}small{color:#adb7ab}</style><h1>Malok Kombat · Diagnóstico de conexão</h1><p>Esta página verifica o servidor e as funções do segundo aparelho. Ela não entra em salas e não modifica o jogo.</p><ul id="checks"></ul><button onclick="navigator.clipboard?.writeText(document.getElementById('checks').innerText)">Copiar resultado</button> <a href="/">Voltar ao jogo</a><script>
const list=document.getElementById('checks');function show(k,msg){let l=document.createElement('li');l.textContent=k+': '+msg;list.append(l)};
show('Endereço',location.href);show('Navegador',navigator.userAgent);show('WebSocket',typeof WebSocket==='function'?'Disponível':'INDISPONÍVEL');
try{const c=document.createElement('canvas');show('WebGL',c.getContext('webgl2')?'WebGL2 OK':c.getContext('webgl')?'WebGL1 OK':'INDISPONÍVEL');}catch(e){show('WebGL',String(e))}
Promise.all(['/', '/app.js','/combat.js','/scene.js','/style.css','/assets/likeness-faces.png'].map(async p=>{try{const r=await fetch(p,{cache:'no-store'});show('Arquivo '+p,r.status+' '+r.headers.get('content-type'));}catch(e){show('Arquivo '+p,String(e));}}));
try{const url=new URL('/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';const w=new WebSocket(url);w.onopen=()=>{show('Conexão em tempo real','OK');w.close()};w.onerror=()=>show('Conexão em tempo real','FALHOU');w.onclose=e=>{if(e.code!==1005&&e.code!==1000)show('WebSocket código',e.code)}}catch(e){show('WebSocket erro',String(e))}
</script></html>`;
const server=http.createServer((req,res)=>{
  let url;try{url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);}catch{res.writeHead(400);res.end('Endereço inválido');return;}
  if(req.method==='GET'&&url.pathname==='/health'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({ok:true,roomCount:rooms.size,version:'3.0.0-online'}));return;
  }
  if(req.method==='GET'&&url.pathname==='/diagnostico'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(diagnosticsHtml);return;
  }
  if(req.method==='GET'||req.method==='HEAD'){
    let name;try{name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');}catch{res.writeHead(400);res.end('Caminho inválido');return;}
    const filepath=path.resolve(root,name);
    if(filepath!==root&&!filepath.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    if(!typeFor[path.extname(filepath).toLowerCase()]){res.writeHead(404);res.end('Não encontrado');return;}
    try{
      const stat=fs.statSync(filepath);
      if(!stat.isFile()){res.writeHead(404);res.end('Não encontrado');return;}
      res.writeHead(200,{'Content-Type':typeFor[path.extname(filepath).toLowerCase()],'Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(filepath).pipe(res);
      return;
    }catch{res.writeHead(404);res.end('Arquivo não encontrado');return;}
  }
  res.writeHead(405,{'Content-Type':'text/plain'});res.end('Método não permitido');
});
const connections=new Set();
function sendPacket(client,obj){if(!client||client.socket.destroyed)return;const payload=Buffer.from(JSON.stringify(obj));if(payload.length>65535)return;if(client.socket.writableLength>1024*1024)return;const header=payload.length<126?Buffer.from([0x81,payload.length]):Buffer.from([0x81,126,payload.length>>8,payload.length&255]);client.socket.write(Buffer.concat([header,payload]));}
function frame(client,data,opcode=0x1){if(!client||client.socket.destroyed)return;const payload=Buffer.isBuffer(data)?data:Buffer.from(data);const h=payload.length<126?Buffer.from([0x80|opcode,payload.length]):Buffer.from([0x80|opcode,126,payload.length>>8,payload.length&255]);client.socket.write(Buffer.concat([h,payload]));}
function peer(client){const room=client.room;return room&&room.clients[1-client.slot]||null;}
function lobbyState(room){return {type:'room',code:room.code,match:room.match,players:room.clients.map((c,i)=>c?({slot:i,character:c.character,ready:c.ready}):null)}}
function updateRoom(room){for(const c of room.clients)if(c)sendPacket(c,lobbyState(room));}
function error(client,code,message){sendPacket(client,{type:'error',code,message});}
function leave(client){
  const room=client.room;if(!room)return;
  const oldSlot=client.slot;client.room=null;client.slot=-1;client.ready=false;
  if(room.clients[oldSlot]===client)room.clients[oldSlot]=null;
  room.match=false;
  if(oldSlot===0){
    for(const c of room.clients)if(c){c.room=null;c.slot=-1;c.ready=false;sendPacket(c,{type:'closed',message:'O desafiante saiu. Crie uma sala ou entre em outra.'});}
    rooms.delete(room.code);return;
  }
  room.rematches.clear();
  if(!room.clients[0])rooms.delete(room.code);
  else {room.clients[0].ready=false;sendPacket(room.clients[0],{type:'peer_left',message:'O outro jogador saiu da sala.'});updateRoom(room);}
}
function attachRoom(client,room,slot){leave(client);client.room=room;client.slot=slot;client.ready=false;client.character=slot===0?'camera':([...ids].find(id=>id!==room.clients[0]?.character)||'math');room.clients[slot]=client;room.match=false;room.rematches.clear();sendPacket(client,{type:'assigned',slot});updateRoom(room);}
function validInput(arr){return Array.isArray(arr)?arr.filter(x=>typeof x==='string'&&['left','right','jump','crouch','punch','kick','block','special','power2','power3','power4'].includes(x)).slice(0,20):[]}
function handle(client,msg){
  if(!msg||typeof msg!=='object'||typeof msg.type!=='string')return;
  const room=client.room;
  if(msg.type==='create'){
    if(room){error(client,'already','Saia da sala atual primeiro.');return;}
    if(rooms.size>=maxRooms){error(client,'capacity','Servidor com muitas salas. Tente novamente mais tarde.');return;}
    const code=generateCode(),r={code,clients:[null,null],match:false,rematches:new Set()};rooms.set(code,r);attachRoom(client,r,0);return;
  }
  if(msg.type==='join'){
    if(room){error(client,'already','Você já está em uma sala.');return;}
    const code=String(msg.code||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6),r=rooms.get(code);
    if(!r){error(client,'missing','Sala não encontrada. Confira o código.');return;}
    if(r.clients[1]||r.match){error(client,'full','Sala ocupada. Só são permitidos dois jogadores.');return;}
    attachRoom(client,r,1);return;
  }
  if(msg.type==='leave'){leave(client);sendPacket(client,{type:'left'});return;}
  if(!room){error(client,'no-room','Crie uma sala ou entre com um código.');return;}
  if(msg.type==='select'){
    if(room.match)return;
    if(!ids.has(msg.character)){error(client,'fighter','Personagem não encontrado.');return;}
    if(peer(client)?.character===msg.character){error(client,'taken','O outro jogador já escolheu esse lutador.');return;}
    client.character=msg.character;client.ready=false;room.rematches.clear();updateRoom(room);return;
  }
  if(msg.type==='ready'){
    if(room.match)return;
    client.ready=Boolean(msg.ready);updateRoom(room);return;
  }
  if(msg.type==='start'){
    if(client.slot!==0){error(client,'host','Apenas o desafiante pode iniciar a luta.');return;}
    if(!room.clients.every(Boolean)||!room.clients.every(c=>c.ready)||room.clients[0].character===room.clients[1].character){error(client,'not-ready','Os dois precisam estar prontos, com lutadores diferentes.');return;}
    room.match=true;room.rematches.clear();for(const c of room.clients)c.ready=false;
    const event={type:'start',players:room.clients.map(c=>c.character)};for(const c of room.clients)sendPacket(c,event);return;
  }
  if(msg.type==='input'&&room.match&&client.slot===1){sendPacket(peer(client),{type:'input',actions:validInput(msg.actions),pressed:validInput(msg.pressed)});return;}
  if(msg.type==='state'&&room.match&&client.slot===0){if(msg.state&&typeof msg.state==='object')sendPacket(peer(client),{type:'state',state:msg.state});return;}
  if(msg.type==='event'&&room.match&&client.slot===0){if(msg.event&&typeof msg.event==='object')sendPacket(peer(client),{type:'event',event:msg.event,wins:msg.wins||[0,0]});return;}
  if((msg.type==='pause'||msg.type==='resume')&&room.match){sendPacket(peer(client),{type:msg.type});return;}
  if(msg.type==='rematch'&&room.match){room.rematches.add(client.slot);sendPacket(client,{type:'rematch_status',waiting:room.rematches.size<2});if(room.rematches.size===2){room.rematches.clear();for(const c of room.clients)sendPacket(c,{type:'start',players:room.clients.map(p=>p.character)});}return;}
  if(msg.type==='lobby'){
    room.match=false;room.rematches.clear();for(const c of room.clients)if(c)c.ready=false;
    for(const c of room.clients)if(c)sendPacket(c,{type:'back_to_lobby'});updateRoom(room);return;
  }
}
server.on('upgrade',(req,socket,head)=>{
  if(connections.size>=maxConnections){socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');return;}
  let u;try{u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);}catch{socket.destroy();return;}
  const origin=req.headers.origin;
  let sameOrigin=true;
  if(origin&&origin!=='null'){try{sameOrigin=new URL(origin).host===(req.headers.host||'');}catch{sameOrigin=false;}}
  if(u.pathname!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']||!sameOrigin){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
  const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const client={socket,buffer:Buffer.alloc(0),room:null,slot:-1,ready:false,character:'camera',lastPong:Date.now(),windowStart:Date.now(),packetCount:0};
  connections.add(client);
  function readFrames(){
    let buffer=client.buffer;
    while(buffer.length>=2){
      const op=buffer[0]&15,fin=!!(buffer[0]&128),masked=!!(buffer[1]&128);
      let length=buffer[1]&127,offset=2;
      if(length===126){if(buffer.length<4)break;length=buffer.readUInt16BE(2);offset=4;}
      else if(length===127){if(buffer.length<10)break;const high=buffer.readUInt32BE(2);if(high>0){socket.destroy();return;}length=buffer.readUInt32BE(6);offset=10;}
      if(length>65536||!masked||(!fin&&op===1)){socket.destroy();return;}
      if(buffer.length<offset+4+length)break;
      const mask=buffer.subarray(offset,offset+4),data=Buffer.from(buffer.subarray(offset+4,offset+4+length));
      for(let i=0;i<data.length;i++)data[i]^=mask[i%4];
      buffer=buffer.subarray(offset+4+length);
      if(op===8){socket.end();return;}
      if(op===9){frame(client,data,10);continue;}
      if(op===10){client.lastPong=Date.now();continue;}
      if(op!==1)continue;
      const now=Date.now();if(now-client.windowStart>1000){client.windowStart=now;client.packetCount=0;}
      if(++client.packetCount>MAX_EVENTS_PER_SECOND){socket.destroy();return;}
      try{handle(client,JSON.parse(data.toString('utf8')));}catch{error(client,'bad-message','Mensagem inválida.');}
    }
    client.buffer=buffer;
  }
  socket.on('data',data=>{client.buffer=Buffer.concat([client.buffer,data]);if(client.buffer.length>128*1024){socket.destroy();return;}readFrames();});
  socket.on('close',()=>{leave(client);connections.delete(client);});
  socket.on('error',()=>socket.destroy());
  if(head?.length)socket.emit('data',head);
  sendPacket(client,{type:'hello',message:'Malok Kombat Online pronto.'});
});
const heartbeat=setInterval(()=>{
  const now=Date.now();
  for(const client of connections){
    if(client.socket.destroyed)continue;
    if(now-client.lastPong>90000){client.socket.destroy();continue;}
    frame(client,Buffer.alloc(0),9);
  }
},30000);
heartbeat.unref();
server.listen(port,host,()=>{
  console.log('\nMALOK KOMBAT — MULTIPLAYER ONLINE');
  console.log(`No Mac:       http://localhost:${port}`);
  if(!production)for(const interfaces of Object.values(os.networkInterfaces()))for(const entry of interfaces||[])if(entry.family==='IPv4'&&!entry.internal)console.log(`Na rede local: http://${entry.address}:${port}`);
  console.log('\nSe o outro aparelho apresentar erro, abra /diagnostico no mesmo endereço.');
  console.log(`Salas simultâneas: até ${maxRooms}, jogadores conectados: até ${maxConnections}.`);
  console.log('\nO servidor deve continuar ativo para manter as sessões.');
  console.log('Pressione Ctrl+C para encerrar.\n');
});
