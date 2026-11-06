import * as THREE from './assets/three.module.js';
import {getPowers, getPower} from './powers.js';
import {settings,saveSettings,resetLayout,DEFAULT_BUTTONS,GAMEPAD_MAP} from './settings.js';
import {ROSTER, getCharacter} from './roster.js';
const $ = id => document.getElementById(id);
const names = Object.fromEntries(ROSTER.map(c=>[c.id,c.name.toLocaleUpperCase('pt-BR')]));
let arena, game, input, screen='home', selected='camera', elapsed=0, previous=performance.now();
let previewId='camera', selectionTarget='player', chosenOpponent=null, playerConfirmed=false;
// V2.0: modos e campanha isolados. O jogador conserva as estatísticas originais.
let gameMode='free',selectedDifficulty='normal',pendingMode='free',pendingDifficulty='normal',championship=null;
const DIFFICULTY_LABELS={easy:'FÁCIL',normal:'NORMAL',expert:'EXPERT'};
const CHAMP_BOSS='frequencia';
function shuffleFighters(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

let soundEnabled=true, audio, toastTimer, flashTimer, helpResume=false;
soundEnabled=settings.master;
const music=new Audio('./assets/fight-music.mp3');music.loop=true;music.preload='auto';
const menuMusic=$('mk-menu-theme');menuMusic.loop=true;menuMusic.preload='auto';
let menuGain,menuSource,lastMenuState=false,menuRetryAt=0;
let ambienceGain,fxBus,musicGain,musicSource,settingsResume=false,settingsFromPause=false,lastMusicState=false,lastPadButtons=[],lastPadNav=0;
music.addEventListener('timeupdate',()=>{if(music.currentTime>=60)music.currentTime=0;});
function updateSound(){ $('sound').classList.toggle('sound-on',soundEnabled);$('sound').setAttribute('aria-label',soundEnabled?'Desativar som':'Ativar som');$('sound').title=soundEnabled?'Desativar som':'Ativar som'; }
// V2.6 — Abre o canal da música do menu antes de ela começar a tocar.
// Assim, entrar na seleção de modos não faz uma segunda mudança de saída/ganho.
function prepareMenuAudio(){
 if(!soundEnabled || menuSource || !(window.AudioContext||window.webkitAudioContext))return;
 try{
  audio ||= new (window.AudioContext||window.webkitAudioContext)();
  // Em leitores que permitem autoplay, não deixe o canal suspenso até o primeiro clique.
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  if(!audio.createMediaElementSource)return;
  menuSource=audio.createMediaElementSource(menuMusic);
  menuGain=audio.createGain();
  // Aplique o volume salvo ANTES de conectar a música ao destino.
  menuGain.gain.value=settings.master&&settings.music?settings.musicVolume:0;
  menuMusic.volume=1;
  menuSource.connect(menuGain);
  menuGain.connect(audio.destination);
 }catch(error){
  console.warn('Malok Kombat: canal de abertura indisponível; usando controle do elemento.',error);
 }
}
function unlockAudio(){if(!soundEnabled)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();if(!fxBus){fxBus=audio.createGain();fxBus.connect(audio.destination);}fxBus.gain.value=settings.master&&settings.ambience?settings.ambienceVolume:0;if(!musicSource&&audio.createMediaElementSource){try{musicSource=audio.createMediaElementSource(music);musicGain=audio.createGain();musicSource.connect(musicGain);musicGain.connect(audio.destination);music.volume=1;}catch(error){console.warn('Malok Kombat: canal independente de música indisponível; usando volume do elemento.',error);}}if(!menuSource&&audio.createMediaElementSource&&menuMusic.paused){prepareMenuAudio();}if(!ambienceGain){const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const source=audio.createBufferSource(),filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=230;ambienceGain=audio.createGain();ambienceGain.gain.value=0;source.buffer=buffer;source.loop=true;source.connect(filter);filter.connect(ambienceGain);ambienceGain.connect(audio.destination);source.start();}}catch{}}
function sound(kind='click',id='camera'){
 if(!soundEnabled||!audio||!settings.ambience||settings.ambienceVolume<=0)return;
 const t=audio.currentTime;
 try{
 const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(fxBus||audio.destination);
 let dur=.09,from=370,to=180,volume=.035;osc.type='sine';
 if(kind==='hit'){dur=.16;from=125;to=38;volume=.12;osc.type='triangle';}
 if(kind==='block'){dur=.08;from=570;to=170;volume=.05;osc.type='square';}
 if(kind==='special'){const n=Math.max(0,ROSTER.findIndex(c=>c.id===id));dur=.38;from=180+n*65;to=50+n*9;volume=.065;osc.type=n%2?'sine':'sawtooth';}
 if(kind==='round'){dur=.5;from=220;to=440;volume=.045;}
 if(kind==='jump'){dur=.11;from=170;to=370;volume=.02;}
 if(kind==='swing'){dur=.07;from=230;to=90;volume=.015;}
 osc.frequency.setValueAtTime(from,t);osc.frequency.exponentialRampToValueAtTime(to,t+dur);gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.009);gain.gain.exponentialRampToValueAtTime(.001,t+dur);osc.start(t);osc.stop(t+dur+.02);
 if(kind==='hit'){
 const length=Math.floor(audio.sampleRate*.085),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
 const noise=audio.createBufferSource(),ng=audio.createGain(),filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1900;ng.gain.value=.09;noise.buffer=buffer;noise.connect(filter);filter.connect(ng);ng.connect(fxBus||audio.destination);noise.start(t);
 }
 }catch{}
}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function clearInput(){input?.clear();document.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));}
function setScreen(next){
 helpResume=false;settingsResume=false;settingsFromPause=false;
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('pause-scrim').hidden=true;clearInput();screen=next;document.body.className=next==='home'?'':next+'-mode';
 clearTimeout(flashTimer);$('hit-flash').classList.remove('active');$('combo').classList.remove('active');
 for(const id of ['home','selection','fight'])$(id).hidden=id!==next;
 if(game)game.paused=next!=='fight';if(next!=='fight'){music.pause();lastMusicState=false;}if(ambienceGain)ambienceGain.gain.value=0;
 if(input)input.enabled=next==='fight';
 if(next==='selection'){refreshSelection();showPreview(selectionTarget==='opponent'&&chosenOpponent?chosenOpponent:selected);document.querySelector(`[data-fighter="${previewId}"]`).focus({preventScroll:true});}
 if(next==='home'){$('start').focus({preventScroll:true});$('championship-fight-hud').hidden=true;}
 if(next!=='selection'&&arena?.models)Object.values(arena.models).forEach(m=>m.group.scale.setScalar(1));
 cinemaStop();
}
function applyPortrait(element,character){
 if(character.portrait){element.style.backgroundImage=`url("${character.portrait.url}")`;element.style.backgroundPosition=character.portrait.position||'50% 50%';element.style.backgroundSize=character.portrait.size||'cover';element.classList.add('has-portrait');}
}
function buildRoster(){
 const grid=$('fighter-choices');grid.replaceChildren();
 ROSTER.forEach((character,index)=>{
  const button=document.createElement('button');button.type='button';button.className='roster-card'+(character.id==='frequencia'?' extra-fighter':'');button.dataset.fighter=character.id;button.style.setProperty('--accent',character.color);button.setAttribute('aria-label',`Selecionar ${character.name}, ${character.role}`);
  const portrait=document.createElement('span');portrait.className='roster-portrait';portrait.setAttribute('aria-hidden','true');portrait.textContent=character.name.split(' ').map(part=>part[0]).join('').slice(0,2);applyPortrait(portrait,character);
  const number=document.createElement('span');number.className='roster-number';number.textContent=character.id==='frequencia'?'EXTRA':String(index+1).padStart(2,'0');
  const caption=document.createElement('span');caption.className='roster-caption';
  const name=document.createElement('strong');name.textContent=names[character.id];
  const role=document.createElement('small');role.textContent=character.role;
  caption.append(name,role);button.append(portrait,number,caption);
  button.onclick=()=>chooseFighter(character.id);button.onmouseenter=()=>showPreview(character.id);button.onfocus=()=>showPreview(character.id);grid.append(button);
 });
}
function showPreview(id){
 previewId=getCharacter(id).id;const character=getCharacter(previewId);
 $('preview-name').textContent=names[previewId];$('preview-role').textContent=character.role.toLocaleUpperCase('pt-BR');$('preview-description').textContent=character.description;$('preview-power').textContent=character.power.toLocaleUpperCase('pt-BR');
 $('selection').style.setProperty('--selection-accent',character.color);$('preview-powers').innerHTML=getPowers(previewId).map(p=>`<span><kbd>${p.key}</kbd> ${p.name}</span>`).join('');updateGuide(previewId);
 document.querySelectorAll('[data-fighter]').forEach(b=>b.classList.toggle('previewing',b.dataset.fighter===previewId));
}
function refreshSelection(){
 if(gameMode==='championship'){
  selectionTarget='player';playerConfirmed=false;chosenOpponent=null;
  document.querySelectorAll('[data-fighter]').forEach(b=>{
   const id=b.dataset.fighter,locked=id===CHAMP_BOSS;
   b.classList.toggle('active',id===selected);b.classList.toggle('chosen-player',id===selected);
   b.classList.remove('chosen-opponent','previewing-opponent');b.classList.toggle('unavailable',locked);b.classList.toggle('champ-boss',locked);
   b.setAttribute('aria-pressed',String(id===selected));b.setAttribute('aria-label',locked?'Fii, chefão do campeonato; não selecionável como jogador':`${getCharacter(id).name}, seu personagem`);
  });
  $('choose-opponent').hidden=true;
  $('choose-player').classList.add('active');$('choose-player').setAttribute('aria-pressed','true');
  $('choose-player').querySelector('small').textContent='01 / SEU LUTADOR';$('selection-player-name').textContent=names[selected];
  $('selection-slot-label').textContent='SELECIONE SEU LUTADOR';
  $('play-selected').innerHTML='INICIAR CAMPEONATO <span>↗</span>';$('play-selected').disabled=selected===CHAMP_BOSS;
  $('play-selected').setAttribute('aria-label',`Iniciar campeonato com ${getCharacter(selected).name}`);
  $('selection-status').textContent=`8 LUTAS · adversários sorteados · Fii é o chefão · ${DIFFICULTY_LABELS[selectedDifficulty]}`;
  document.querySelector('#selection .selection-heading h2').innerHTML='RUMO AO <em>CHEFÃO.</em>';
  document.querySelector('#selection .selection-heading .eyebrow').textContent='02 / CAMPEONATO';
  return;
 }
 document.querySelectorAll('[data-fighter]').forEach(b=>b.classList.remove('champ-boss'));
 $('choose-opponent').hidden=false;
 document.querySelector('#selection .selection-heading h2').innerHTML='QUEM VAI DOMINAR <em>O SET?</em>';
 document.querySelector('#selection .selection-heading .eyebrow').textContent='01 / CONFIRME SEU PERSONAGEM';
 const activeId=selectionTarget==='player'?selected:chosenOpponent;
 document.querySelectorAll('[data-fighter]').forEach(b=>{
  const id=b.dataset.fighter,active=id===activeId;
  b.classList.toggle('active',active);b.classList.toggle('chosen-player',id===selected);b.classList.toggle('chosen-opponent',id===chosenOpponent);
  b.classList.toggle('unavailable',selectionTarget==='opponent'&&id===selected);
  b.setAttribute('aria-pressed',String(active));
  b.setAttribute('aria-label',`${getCharacter(id).name}, ${getCharacter(id).role}${id===selected?', seu personagem':id===chosenOpponent?', adversário escolhido':''}`);
 });
 $('choose-player').classList.toggle('active',selectionTarget==='player');$('choose-opponent').classList.toggle('active',selectionTarget==='opponent');
 $('choose-player').setAttribute('aria-pressed',String(selectionTarget==='player'));$('choose-opponent').setAttribute('aria-pressed',String(selectionTarget==='opponent'));
 $('selection-player-name').textContent=names[selected];$('selection-opponent-name').textContent=chosenOpponent?names[chosenOpponent]:'ESCOLHER ADVERSÁRIO';
 $('selection-slot-label').textContent=selectionTarget==='player'?'ESCOLHA SEU PERSONAGEM':'ESCOLHA SEU ADVERSÁRIO';
 $('choose-opponent').disabled=!playerConfirmed;const ready=!playerConfirmed||Boolean(chosenOpponent&&chosenOpponent!==selected);$('play-selected').innerHTML=(playerConfirmed?'Começar luta':'Escolher jogador')+' <span>↗</span>'; $('choose-player').querySelector('small').textContent=playerConfirmed?'← VOLTAR A ESCOLHER JOGADOR':'01 / SEU PERSONAGEM';
 $('play-selected').disabled=!ready;
 $('play-selected').setAttribute('aria-label',!playerConfirmed?`Confirmar ${getCharacter(selected).name}`:ready?`Começar luta: ${getCharacter(selected).name} contra ${getCharacter(chosenOpponent).name}`:'Escolha o adversário para começar');
 $('selection-status').textContent=!playerConfirmed?'Confirme seu jogador para liberar a escolha do adversário.':chosenOpponent?`${getCharacter(selected).name} × ${getCharacter(chosenOpponent).name} · Tudo pronto.`:'Agora escolha o adversário e aperte Começar luta.';
}
function setSelected(id){
 selected=getCharacter(id).id;if(chosenOpponent===selected)chosenOpponent=null;
 refreshSelection();showPreview(selected);
}
function setSelectionTarget(target){
 if(gameMode==='championship')return;
 if(target==='opponent'&&!playerConfirmed)return;if(target==='player'&&playerConfirmed){playerConfirmed=false;chosenOpponent=null;}selectionTarget=target==='opponent'?'opponent':'player';refreshSelection();showPreview(selectionTarget==='opponent'&&chosenOpponent?chosenOpponent:selected);
}
function chooseFighter(id){
 unlockAudio();
 if(gameMode==='championship'&&id===CHAMP_BOSS){toast('Fii é o chefão final. Escolha outro lutador para o campeonato.');return;}
 if(selectionTarget==='player')setSelected(id);
 else{
  if(id===selected){toast('Escolha um adversário diferente do seu personagem.');return;}
  chosenOpponent=getCharacter(id).id;refreshSelection();showPreview(chosenOpponent);
 }
 sound();
}
function confirmMatch(){
 if(screen!=='selection')return;
 if(gameMode==='championship'){startChampionship();return;}if(!playerConfirmed){playerConfirmed=true;selectionTarget='opponent';chosenOpponent=null;refreshSelection();showPreview(ROSTER.find(c=>c.id!==selected).id);return;}if(!chosenOpponent||chosenOpponent===selected)return;beginFight(selected,chosenOpponent);
}

function enterSelection(){unlockAudio();sound();selectionTarget='player';playerConfirmed=false;chosenOpponent=null;championship=null;if(gameMode==='championship'&&selected===CHAMP_BOSS)selected='camera';setScreen('selection');}
function openModes(){
 if(screen!=='home')return;unlockAudio();sound();pendingMode='free';pendingDifficulty='normal';syncModeDialog();$('mode-dialog').showModal();
}
function syncModeDialog(){
 $('mk-difficulty-block').hidden=pendingMode==='multiplayer';
 document.querySelectorAll('[data-mode-choice]').forEach(b=>{const active=b.dataset.modeChoice===pendingMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 document.querySelectorAll('[data-difficulty-choice]').forEach(b=>{const active=b.dataset.difficultyChoice===pendingDifficulty;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('mode-begin').innerHTML=(pendingMode==='multiplayer'?'CRIAR OU ENTRAR EM UMA SALA':pendingMode==='championship'?'ESCOLHER LUTADOR · CAMPEONATO':'ESCOLHER LUTADORES · LUTA LIVRE')+' <span>↗</span>';
}
function chooseGameMode(){
 if(pendingMode==='multiplayer'){mpOpen();return;}
 gameMode=pendingMode;selectedDifficulty=pendingDifficulty;championship=null;
 $('mode-dialog').close();enterSelection();
}
function startChampionship(){
 if(gameMode!=='championship'||selected===CHAMP_BOSS)return;
 const rivals=shuffleFighters(ROSTER.map(c=>c.id).filter(id=>id!==selected&&id!==CHAMP_BOSS));
 championship={playerId:selected,opponents:[...rivals,CHAMP_BOSS],stage:0};
 showChampionshipLadder();
}
function setTowerPortrait(element,character){
 element.textContent=character.name.split(' ').map(part=>part[0]).join('').slice(0,2);
 element.classList.remove('has-portrait');
 element.style.backgroundImage='';
 element.style.backgroundPosition='50% 50%';
 element.style.backgroundSize='cover';
 if(character.portrait){
  element.style.backgroundImage=`url("${character.portrait.url}")`;
  element.style.backgroundPosition=character.portrait.position||'50% 50%';
  element.style.backgroundSize=character.portrait.size||'cover';
  element.classList.add('has-portrait');
 }
}
function buildTowerStep(id,index,currentStage){
 const character=getCharacter(id);
 const isCurrent=index===currentStage;
 const step=document.createElement(isCurrent?'button':'div');
 if(isCurrent){step.type='button';step.setAttribute('aria-label',`Começar luta contra ${character.name}`);step.addEventListener('click',nextChampionshipFight);}
 step.className='tower-step'+(index<currentStage?' done':'')+(index===currentStage?' current':'')+(id===CHAMP_BOSS?' boss':'');
 step.style.setProperty('--ladder-accent',character.color);
 step.dataset.stage=String(index);
 const rank=document.createElement('span');rank.className='tower-rank';rank.textContent=String(index+1).padStart(2,'0');
 const face=document.createElement('span');face.className='tower-opponent-face';face.setAttribute('aria-hidden','true');setTowerPortrait(face,character);
 const copy=document.createElement('div');copy.className='tower-copy';
 const name=document.createElement('strong');name.textContent=character.name.toLocaleUpperCase('pt-BR');
 const role=document.createElement('small');role.textContent=character.role;
 copy.append(name,role);
 const state=document.createElement('span');state.className='tower-state';
 state.textContent=index<currentStage?'VENCIDO':index===currentStage?(id===CHAMP_BOSS?'CHEFÃO · LUTAR':'TOQUE PARA LUTAR'):(id===CHAMP_BOSS?'CHEFÃO':'BLOCO '+String(index+1).padStart(2,'0'));
 step.append(rank,face,copy,state);
 return step;
}
let ladderAnimationTimer=0,ladderAnimationFrame=0;
function moveTowerMarker(fromStage,toStage){
 const shell=$('ladder-shell'),root=$('ladder-list'),marker=$('ladder-player-marker');
 const target=root.querySelector(`.tower-step[data-stage="${toStage}"]`);
 if(!target)return;
 // Os blocos e o marcador usam o mesmo referencial visual, inclusive no celular.
 const markerH=marker.getBoundingClientRect().height||48;
 const topFor=stage=>{
  if(stage<0)return shell.clientHeight-markerH;
  const el=root.querySelector(`.tower-step[data-stage="${stage}"]`);
  if(!el)return 0;
  const shellBounds=shell.getBoundingClientRect(),stepBounds=el.getBoundingClientRect();
  const centered=stepBounds.top-shellBounds.top+(stepBounds.height-markerH)/2;
  return Math.max(0,Math.min(shell.clientHeight-markerH,centered));
 };
 marker.style.opacity='1';
 marker.style.transition='none';
 marker.style.top=topFor(fromStage)+'px';
 marker.style.transform='scale(.95)';
 void marker.offsetHeight;
 requestAnimationFrame(()=>{
  marker.style.transition='top .75s cubic-bezier(.22,.8,.18,1),transform .75s cubic-bezier(.22,.8,.18,1),opacity .3s';
  marker.style.top=topFor(toStage)+'px';
  marker.style.transform='scale(1)';
 });
}
function showChampionshipLadder(){
 if(!championship)return;
 const {stage,opponents}=championship,total=opponents.length;
 $('ladder-progress').textContent=`DIFICULDADE · ${DIFFICULTY_LABELS[selectedDifficulty]}`;
 $('ladder-title').innerHTML=stage===total-1?'ÚLTIMO BLOCO <em>DO FII.</em>':'SUBA A <em>TORRE.</em>';
 const root=$('ladder-list');root.replaceChildren();
 // Bottom-to-top tower: stage 01 is the bottom step; Fii is always at the top.
 for(let i=total-1;i>=0;i--)root.append(buildTowerStep(opponents[i],i,stage));
 const marker=$('ladder-player-marker');marker.replaceChildren();
 const face=document.createElement('span');face.className='tower-player-face';face.setAttribute('aria-hidden','true');setTowerPortrait(face,getCharacter(championship.playerId));
 const label=document.createElement('strong');label.textContent='VOCÊ';marker.append(face,label);
 const button=$('ladder-go');button.hidden=true;
 if($('result-dialog').open)$('result-dialog').close();
 $('ladder-dialog').showModal();
 syncMenuMusic();
 clearTimeout(ladderAnimationTimer);
 cancelAnimationFrame(ladderAnimationFrame);
 ladderAnimationFrame=requestAnimationFrame(()=>moveTowerMarker(Math.max(-1,stage-1),stage));
 ladderAnimationTimer=0;
}
function nextChampionshipFight(){
 if(!championship||championship.stage>=championship.opponents.length)return;
 clearTimeout(ladderAnimationTimer);
 $('ladder-dialog').close();
 beginFight(championship.playerId,championship.opponents[championship.stage]);
}
function championshipResult(won,score){
 const {stage,opponents}=championship,total=opponents.length;
 if(won)championship.stage++;
 const finished=won&&championship.stage>=total;
 $('result-title').innerHTML=finished?'CAMPEÃO<br><em>DA TORRE.</em>':won?'BLOCO<br><em>VENCIDO.</em>':'TORRE<br><em>ENCERRADA.</em>';
 $('result-subtitle').textContent=finished?`${names[selected]} subiu toda a torre e derrotou Fii, o chefão!`:won?`Prepare-se para subir ao próximo bloco e enfrentar ${names[opponents[championship.stage]]}.`:`Sua campanha acabou neste bloco. Recomece e enfrente uma nova torre.`;
 $('result-score').textContent=`${championship.stage} / ${total} VITÓRIAS · ${score}`;
 $('rematch').innerHTML=(won&&!finished?'SUBIR PARA O PRÓXIMO BLOCO':finished?'NOVO CAMPEONATO':'RECOMEÇAR TORRE')+' <span>↗</span>';
 $('result-select').textContent='TROCAR LUTADOR';
}

function beginFight(id,opponentId){
 selected=getCharacter(id).id;unlockAudio();setScreen('fight');
 const isChamp=gameMode==='championship'&&Boolean(championship);
 const stage=isChamp?championship.stage:0,total=isChamp?championship.opponents.length:1;
 game.setAIDifficulty(selectedDifficulty,stage,total,isChamp&&opponentId===CHAMP_BOSS,isChamp);
 $('championship-fight-hud').hidden=true;
 game.start(selected,opponentId);chosenOpponent=game.opponentId;buildPowerBar(selected);music.currentTime=0;syncAudio();
 const player=getCharacter(game.fighters[0].id),enemy=getCharacter(game.fighters[1].id);
 $('player-name').textContent=names[player.id];$('enemy-name').textContent=names[enemy.id];$('power-label').textContent=player.power.toLocaleUpperCase('pt-BR')+' · L';
 document.body.style.setProperty('--player-accent',player.color);document.body.style.setProperty('--enemy-accent',enemy.color);updateHUD();$('arena').focus({preventScroll:true});
}
// V2.7.3: o clique de mouse pode se perder se o ponteiro for entregue ao
// fundo da página durante o mouseup. Ativar os botões no pointerdown evita
// travar a pausa. O click nativo continua válido para teclado e leitores de tela.
function installReliablePauseMouseClicks(){
 const ids=['pause','resume','pause-settings','pause-home','change-character','settings-close','settings-done'];
 for(const id of ids){
  const button=$(id);
  if(!button||button.dataset.mouseClickSafe==='1')continue;
  button.dataset.mouseClickSafe='1';
  let lastPointerAction=-Infinity;
  // Se um click de mouse também chegar após o pointerdown, não execute duas vezes.
  button.addEventListener('click',e=>{
   if(e.isTrusted&&e.detail>0&&performance.now()-lastPointerAction<650){
    e.preventDefault();e.stopImmediatePropagation();
   }
  },true);
  button.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='mouse'||e.button!==0||button.disabled)return;
   lastPointerAction=performance.now();
   // Sem captura de ponteiro: não interfere em joystick, gamepad ou touchscreen.
   e.preventDefault();
   button.click();
  });
 }
}
// A pausa é não-modal: o painel intercepta o fundo da arena, mas não torna
// a barra superior inerte. Isso permite usar Som, Tela Cheia, Ajuda e Configurações.
function showPauseOverlay(){
 if($('pause-dialog').open)return;
 $('pause-scrim').hidden=false;
 document.body.classList.add('pause-overlay-active');
 $('pause-dialog').show();
 $('resume').focus({preventScroll:true});
}
function hidePauseOverlay(){
 if($('pause-dialog').open)$('pause-dialog').close();
 $('pause-scrim').hidden=true;
 document.body.classList.remove('pause-overlay-active');
}
function pause(){if(screen!=='fight'||game.phase==='finished'||$('help-dialog').open||$('pause-dialog').open)return;if(gameMode==='multiplayer'&&mp?.match&&!mpApplyingPause)mpSend({type:'pause'});game.paused=true;input.enabled=false;clearInput();showPauseOverlay();}
function resume(){if(screen!=='fight')return;if(gameMode==='multiplayer'&&mp?.match&&!mpApplyingPause)mpSend({type:'resume'});hidePauseOverlay();game.paused=false;input.enabled=true;clearInput();$('arena').focus({preventScroll:true});}
function openHelp(){if($('help-dialog').open)return;updateGuide(screen==='fight'?selected:previewId);helpResume=screen==='fight'&&!game.paused&&game.phase!=='finished';if(helpResume){if(gameMode==='multiplayer'&&mp?.match)mpSend({type:'pause'});game.paused=true;input.enabled=false;clearInput();}$('help-dialog').showModal();}
function closeHelp(){ $('help-dialog').close();if(helpResume){if(gameMode==='multiplayer'&&mp?.match)mpSend({type:'resume'});game.paused=false;input.enabled=true;clearInput();}helpResume=false; }
function onEvent(e){
 if(screen!=='fight')return;
 if(gameMode==='multiplayer'&&mp?.match&&mp.slot===0)mpSend({type:'event',event:e,wins:game.wins});
 if(e.type==='hit'){
  arena?.burst(e.x,e.y,e.blocked?'#dce4cb':getCharacter(e.id).color);sound(e.blocked?'block':'hit',e.id);
  if(!e.blocked){$('hit-flash').classList.add('active');clearTimeout(flashTimer);flashTimer=setTimeout(()=>$('hit-flash').classList.remove('active'),90);}
 }else if(e.type==='special'){sound('special',e.id);arena?.powerEffect(e);if(e.owner===(gameMode==='multiplayer'&&mp?.match?mp.slot:0)){$('power-feedback').textContent=e.name;$('power-feedback').classList.add('show');clearTimeout(powerFeedbackTimer);powerFeedbackTimer=setTimeout(()=>$('power-feedback').classList.remove('show'),1000);}}
 else if(e.type==='round'){sound('round');}
 else if(e.type==='jump'||e.type==='swing')sound(e.type,e.id);
 else if(e.type==='end'){
  clearInput();input.enabled=false;const won=e.winner===selected;
  $('result-title').innerHTML=won?'VOCÊ<br><em>VENCEU.</em>':'MAIS UM<br><em>TAKE?</em>';
  $('result-subtitle').textContent=won?`${names[selected]} domina o set. Seu nome nos créditos finais.`:`${names[e.winner]} levou essa. A revanche começa com você.`;
  const score=`${game.wins[0]} — ${game.wins[1]}`;
  if(gameMode==='championship'&&championship)championshipResult(won,score);
  else if(gameMode==='multiplayer'&&mp?.match){$('result-score').textContent=score;$('rematch').innerHTML='PEDIR REVANCHE <span>↗</span>';$('result-select').textContent='TROCAR LUTADOR';}
  else{$('result-score').textContent=score;$('rematch').innerHTML='MAIS UM TAKE <span>↗</span>';$('result-select').textContent='TROCAR PERSONAGEM';}
  $('result-dialog').showModal();
 }
}
function updateHUD(){
 const [p,e]=gameMode==='multiplayer'&&mp?.match&&mp.slot===1?[game.fighters[1],game.fighters[0]]:game.fighters;
 const wins=gameMode==='multiplayer'&&mp?.match&&mp.slot===1?[game.wins[1],game.wins[0]]:game.wins;
 $('player-health').style.width=p.hp+'%';$('enemy-health').style.width=e.hp+'%';
 $('player-energy').style.width=p.energy+'%';$('enemy-energy').style.width=e.energy+'%';
 $('player-health').parentElement.setAttribute('aria-label',`Sua vida: ${Math.ceil(p.hp)} de 100`);
 $('enemy-health').parentElement.setAttribute('aria-label',`Vida do adversário: ${Math.ceil(e.hp)} de 100`);
 $('player-wins').textContent=[0,1].map(i=>wins[0]>i?'◆':'◇').join(' ');$('enemy-wins').textContent=[0,1].map(i=>wins[1]>i?'◆':'◇').join(' ');
 $('timer').textContent=Math.ceil(game.timer).toString().padStart(2,'0');$('timer').style.color=game.timer<10?'#ff773d':'';
 $('round-label').textContent=`ROUND ${game.round.toString().padStart(2,'0')}`;
 $('fight-message').textContent=game.phase==='finished'?'':game.message;
 const localCombo=gameMode==='multiplayer'&&mp?.match?p.combo:game.combo; $('combo').classList.toggle('active',localCombo>=2&&game.phase==='fight');$('combo').querySelector('strong').textContent=localCombo;
 updatePowerBar(p);$('power-label').style.color=p.energy>=getPowers(p.id)[0].cost?'var(--player-accent)':'#7e8972';
}
function loop(now){
 const dt=Math.min((now-previous)/1000,.05);previous=now;elapsed+=dt;pollGamepads(now);syncAudio();
 if(screen==='fight'){
  const held=input.actions;document.querySelectorAll('[data-input]').forEach(b=>b.classList.toggle('pressed',held.has(b.dataset.input)));
  if(gameMode==='multiplayer'&&mp?.match){
   if(mp.slot===0){game.update(dt,held);mpSnapshotTimer+=dt;if(mpSnapshotTimer>=1/24){mpSnapshotTimer=0;mpSend({type:'state',state:mpSnapshot()});}}
   else {mpInputTimer+=dt;if(mpInputTimer>=1/30||held.pressed.length){mpInputTimer=0;mpSend({type:'input',actions:[...held].filter(a=>MP_ACTIONS.has(a)),pressed:held.pressed});}}
  }else game.update(dt,held);
  arena.render(game.paused?0:dt,game.fighters,'fight',game.projectiles);updateHUD();
 }else{
  const portrait=innerWidth<innerHeight;
  const fighters=screen==='selection'?[{id:previewId,x:portrait?0:-2.15,y:0,facing:.12,action:'idle',actionT:elapsed,hp:100,energy:100}]:[];
  if(screen==='selection'){
   // Altera apenas o enquadramento da prévia; nenhuma mudança nos atributos de combate.
   const previewModel=arena.ensureModel(previewId);
   if(previewModel)previewModel.group.scale.setScalar(portrait?1.08:1.23);
  }
  arena.render(dt,fighters,screen==='selection'?'select':'home');
 }
 requestAnimationFrame(loop);
}
async function init(){
 try{
  const [{Arena},{Combat},{InputController}]=await Promise.all([import('./scene.js'),import('./combat.js'),import('./input.js')]);
  arena=new Arena($('arena'));if(!await arena.faceTextureReady)throw new Error('FACE_TEXTURE_UNAVAILABLE');game=new Combat();game.onEvent=onEvent;input=new InputController();input.onModeChange=mode=>document.body.dataset.input=mode;document.body.dataset.input=matchMedia('(pointer:coarse)').matches?'touch':'keyboard';input.mode=document.body.dataset.input;buildRoster();setSelected(selected);
  document.querySelectorAll('[data-input]').forEach(b=>{input.bindButton(b,b.dataset.input);b.addEventListener('contextmenu',e=>e.preventDefault());});
  $('play-selected').onclick=confirmMatch;$('choose-player').onclick=()=>setSelectionTarget('player');$('choose-opponent').onclick=()=>setSelectionTarget('opponent');
  setupSettings();mpSetup();input.bindJoystick($('joystick'),$('joystick-knob'));applyLayout();$('start').onclick=openModes;$('back').onclick=()=>{sound();setScreen('home');};
  document.querySelectorAll('[data-mode-choice]').forEach(b=>b.onclick=()=>{pendingMode=b.dataset.modeChoice;syncModeDialog();sound();});
  document.querySelectorAll('[data-difficulty-choice]').forEach(b=>b.onclick=()=>{pendingDifficulty=b.dataset.difficultyChoice;syncModeDialog();sound();});
  const tryMenuAudio=()=>{if(!settings.master)return;unlockAudio();menuRetryAt=0;syncMenuMusic();};
  document.addEventListener('pointerup',tryMenuAudio,{passive:true});
  document.addEventListener('keydown',tryMenuAudio);
  document.addEventListener('visibilitychange',()=>syncMenuMusic());
  $('mode-begin').onclick=chooseGameMode;$('mode-back').onclick=()=>$('mode-dialog').close();
  $('mode-dialog').addEventListener('cancel',e=>{e.preventDefault();$('mode-dialog').close();});
  $('ladder-go').onclick=nextChampionshipFight;
  $('ladder-back').onclick=()=>{const backToSelection=screen==='selection';$('ladder-dialog').close();if(!backToSelection)setScreen('home');};
  $('ladder-dialog').addEventListener('cancel',e=>e.preventDefault());
  $('brand').onclick=()=>{if(screen==='fight')pause();else setScreen('home');};
  if($('home-help'))$('home-help').onclick=openHelp;if($('help'))$('help').onclick=openHelp;
  document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=closeHelp);
  $('help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
  $('pause').onclick=pause;$('resume').onclick=resume;$('pause-home').onclick=()=>{if(gameMode==='multiplayer')mpLeave();setScreen('home');};
  installReliablePauseMouseClicks();
  $('change-character').onclick=()=>{if(gameMode==='multiplayer'&&mp?.room){mpSend({type:'lobby'});return;}enterSelection();};$('rematch').onclick=()=>{
   if(gameMode==='multiplayer'&&mp?.match){mpSend({type:'rematch'});mpStatus('Aguardando o outro jogador pedir revanche...');$('rematch').disabled=true;return;}
   if(gameMode==='championship'&&championship){if(championship.stage<championship.opponents.length&&game.winner===selected)showChampionshipLadder();else startChampionship();}
   else beginFight(selected,game.opponentId);
  };$('result-select').onclick=()=>{if(gameMode==='multiplayer'&&mp?.room){mpSend({type:'lobby'});return;}enterSelection();};$('result-home').onclick=()=>{if(gameMode==='multiplayer')mpLeave();setScreen('home');};
  $('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume();});$('result-dialog').addEventListener('cancel',e=>{e.preventDefault();enterSelection();});
  $('sound').onclick=()=>{settings.master=!settings.master;saveSettings();applyAudioSettings();unlockAudio();sound();};updateSound();
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Use a opção de tela cheia do seu navegador.');}catch{toast('A tela cheia não está disponível neste navegador.');}};
  window.addEventListener('resize',()=>{arena.resize();applyLayout();});
  document.addEventListener('dblclick',e=>{if(screen==='fight')e.preventDefault();},{passive:false});for(const name of ['gesturestart','gesturechange'])document.addEventListener(name,e=>{if(screen==='fight')e.preventDefault();},{passive:false});document.addEventListener('contextmenu',e=>{if(screen==='fight')e.preventDefault();});
  window.addEventListener('keydown',e=>{
   if(e.repeat)return;
   if(e.code==='Escape'&&screen==='fight'&&$('pause-dialog').open&&!document.querySelector('dialog[open]:not(#pause-dialog)')){e.preventDefault();resume();return;}
   if(document.querySelector('dialog[open]'))return;
   if(e.code==='Escape'&&screen==='fight'){e.preventDefault();pause();return;}
   if(screen==='selection'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS'].includes(e.code)){e.preventDefault();const delta=['ArrowLeft','KeyA'].includes(e.code)?-1:['ArrowRight','KeyD'].includes(e.code)?1:['ArrowUp','KeyW'].includes(e.code)?-3:3;const index=ROSTER.findIndex(c=>c.id===previewId);showPreview(ROSTER[(index+delta+ROSTER.length)%ROSTER.length].id);const button=document.querySelector(`[data-fighter="${previewId}"]`);button.focus({preventScroll:true});button.scrollIntoView({block:'nearest',inline:'nearest'});}
   if(e.code==='Enter'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(screen==='home')openModes();else if(screen==='selection')chooseFighter(previewId);}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='fight'&&!game.paused)pause();});
  window.addEventListener('blur',()=>{if(screen==='fight'&&!game.paused&&!$('result-dialog').open)pause();});
  $('arena').addEventListener('webglcontextlost',e=>{e.preventDefault();if(screen==='fight')pause();toast('A renderização foi interrompida. Recarregue a página para retomar.');});
  $('loading').classList.add('dismiss');setTimeout(()=>$('loading').hidden=true,600);
  cinemaStop();
  prepareMenuAudio();
  requestAnimationFrame(loop);
 }catch(err){
  console.error('Malok Kombat: inicialização indisponível',err);
  $('loading').innerHTML='<div class="load-error"><span class="loading-logo">MK<span>■</span></span><p>Não foi possível abrir a arena 3D. Use um navegador atualizado com WebGL e aceleração gráfica ativados.</p><button id="retry">TENTAR NOVAMENTE</button></div>';if(err.message==='FACE_TEXTURE_UNAVAILABLE')$('loading').querySelector('p').textContent='Não foi possível carregar os rostos do elenco. Confira sua conexão e tente novamente.';$('retry').onclick=()=>location.reload();
  const detail=document.createElement('small');detail.style.cssText='display:block;margin:12px 0;color:#ffad85;word-break:break-word;font:12px Arial';detail.textContent='Detalhe: '+(err?.message||String(err));$('loading').querySelector('.load-error')?.append(detail);const diagnostics=document.createElement('a');diagnostics.href='/diagnostico';diagnostics.textContent='DIAGNÓSTICO DO APARELHO';diagnostics.style.cssText='display:block;margin-top:12px;color:#ff955c';$('loading').querySelector('.load-error')?.append(diagnostics);
 }
}
let powerFeedbackTimer;
function updateGuide(id){$('guide-powers').innerHTML='<h3>'+getCharacter(id).name.toUpperCase()+' · 4 PODERES</h3>'+getPowers(id).map(p=>`<p><kbd>${p.key}</kbd> <b>${p.name}</b><small>${p.cost} energia · recarga ${p.cooldown}s</small><span>${p.description}</span></p>`).join('');}
function buildPowerBar(id){$('power-bar').innerHTML=getPowers(id).map(p=>`<div class="power-slot" data-power="${p.action}"><kbd>${p.key}</kbd><span>${p.name}<small>${p.cost} ENERGIA</small></span><b class="power-state">PRONTO</b></div>`).join('');for(const p of getPowers(id)){const b=document.querySelector(`[data-input="${p.action}"]`);b.title=`${p.name} · ${p.cost} energia`;b.setAttribute('aria-label',p.name);b.querySelector('small').textContent=p.name;}}
function updatePowerBar(f){for(const p of getPowers(f.id)){const left=f.powerCooldowns[p.action]||0,ready=left<=0&&f.energy>=p.cost,slot=document.querySelector(`[data-power="${p.action}"]`),button=document.querySelector(`[data-input="${p.action}"]`);if(slot){slot.classList.toggle('unready',!ready);slot.querySelector('.power-state').textContent=left>0?left.toFixed(1)+'s':f.energy<p.cost?'SEM ENERGIA':'PRONTO';}button.classList.toggle('unready',!ready);
  button.dataset.cooldown=left>0?Math.ceil(left):'';
  // Indicador da protecao ativa: countdown diferente da recarga do poder.
  const protecting=p.type==='shield'&&f.shield>0;
  button.dataset.active=protecting?Math.ceil(f.shield)+'s':'';
  if(protecting)button.title=`${p.name}: protegido por mais ${f.shield.toFixed(1)}s`;else button.title=`${p.name} · ${p.cost} energia`;
 }}
function applyLayout(){for(const button of document.querySelectorAll('.pad-button')){const p=settings.buttons[button.dataset.input]||DEFAULT_BUTTONS[button.dataset.input];button.style.left=p.x+'%';button.style.top=p.y+'%';}const j=settings.joystick||{x:17,y:80};$('joystick').style.left=j.x+'%';$('joystick').style.top=j.y+'%';}
function buildLayoutEditor(){const root=$('layout-editor');root.replaceChildren();const labels={punch:'□ SOCO',kick:'○ CHUTE',block:'△ DEF',special:'L',power2:'U',power3:'I',power4:'O',joystick:'MOVER'};for(const id of [...Object.keys(DEFAULT_BUTTONS),'joystick']){const b=document.createElement('button');b.type='button';b.textContent=labels[id];b.className='layout-token'+(id==='joystick'?' stick':'');b.setAttribute('aria-label',`Mover ${labels[id]}: arraste ou use as setas`);const point=()=>id==='joystick'?settings.joystick:(settings.buttons[id]||DEFAULT_BUTTONS[id]);const refresh=()=>{const p=point();b.style.left=p.x+'%';b.style.top=p.y+'%';};const write=(x,y)=>{const p={x:Math.min(id==='joystick'?84:92,Math.max(id==='joystick'?16:8,x)),y:Math.min(id==='joystick'?85:92,Math.max(id==='joystick'?20:12,y))};if(id==='joystick')settings.joystick=p;else settings.buttons[id]=p;refresh();applyLayout();};let active=null;b.addEventListener('pointerdown',e=>{e.preventDefault();active=e.pointerId;b.setPointerCapture(active);});b.addEventListener('pointermove',e=>{if(e.pointerId!==active)return;const r=root.getBoundingClientRect();write((e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{if(e.pointerId===active){active=null;saveSettings();}});b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;e.preventDefault();const p=point();write(p.x+(e.code==='ArrowRight'?2:e.code==='ArrowLeft'?-2:0),p.y+(e.code==='ArrowDown'?2:e.code==='ArrowUp'?-2:0));saveSettings();});root.append(b);refresh();}}
function applyAudioSettings(){soundEnabled=settings.master;updateSound();if(soundEnabled)unlockAudio();if(fxBus)fxBus.gain.value=settings.master&&settings.ambience?settings.ambienceVolume:0;if(musicGain){music.volume=1;musicGain.gain.value=settings.master&&settings.music?settings.musicVolume:0;}else music.volume=settings.master&&settings.music?settings.musicVolume:0;if(!settings.master){music.pause();lastMusicState=false;if(audio)audio.suspend();}syncAudio();}
function syncMenuMusic(){
 const inMenu=screen==='home'||screen==='selection'||Boolean($('ladder-dialog')?.open);
 const shouldPlay=!!(inMenu&&settings.master&&settings.music&&settings.musicVolume>0&&!document.hidden);
 const vol=settings.master&&settings.music?settings.musicVolume:0;
 if(menuGain){menuMusic.volume=1;menuGain.gain.value=vol;}else menuMusic.volume=vol;
 if(!shouldPlay){if(!menuMusic.paused)menuMusic.pause();lastMenuState=false;try{menuMusic.currentTime=0;}catch{}return;}
 if(lastMenuState&&!menuMusic.paused)return;
 if(performance.now()<menuRetryAt)return;
 lastMenuState=true;
 const result=menuMusic.play();
 if(result?.catch)result.catch(()=>{lastMenuState=false;menuRetryAt=performance.now()+1800;});
}
function syncAudio(){const fighting=screen==='fight'&&game&&!game.paused&&game.phase!=='finished';const playing=!!(fighting&&settings.master&&settings.music&&settings.musicVolume>0);if(musicGain){music.volume=1;musicGain.gain.value=settings.master&&settings.music?settings.musicVolume:0;}else music.volume=settings.master&&settings.music?settings.musicVolume:0;if(fxBus)fxBus.gain.value=settings.master&&settings.ambience?settings.ambienceVolume:0;if(playing!==lastMusicState){lastMusicState=playing;if(playing)music.play().catch(()=>toast('Toque no botão de som para liberar a música neste navegador.'));else music.pause();}if(ambienceGain)ambienceGain.gain.setTargetAtTime(fighting&&settings.master&&settings.ambience?settings.ambienceVolume*.045:0,audio.currentTime,.1);syncMenuMusic();}
function openSettings(){if($('settings-dialog').open)return;settingsResume=screen==='fight'&&!game.paused;settingsFromPause=$('pause-dialog').open;if(settingsFromPause)hidePauseOverlay();if(screen==='fight'){if(settingsResume&&gameMode==='multiplayer'&&mp?.match)mpSend({type:'pause'});game.paused=true;input.enabled=false;clearInput();}fillSettings();buildLayoutEditor();$('settings-dialog').showModal();syncAudio();}
function closeSettings(){$('settings-dialog').close();saveSettings();applyLayout();if(settingsResume&&screen==='fight'){if(gameMode==='multiplayer'&&mp?.match)mpSend({type:'resume'});game.paused=false;input.enabled=true;clearInput();}else if(settingsFromPause&&screen==='fight')showPauseOverlay();settingsResume=false;settingsFromPause=false;syncAudio();}
function fillSettings(){$('audio-master').checked=settings.master;$('audio-music').checked=settings.music;$('audio-ambience').checked=settings.ambience;$('music-volume').value=Math.round(settings.musicVolume*100);$('ambience-volume').value=Math.round(settings.ambienceVolume*100);$('gamepad-mode').value=settings.gamepad;$('gamepad-deadzone').value=Math.round(settings.deadzone*100);$('music-value').textContent=Math.round(settings.musicVolume*100)+'%';$('ambience-value').textContent=Math.round(settings.ambienceVolume*100)+'%';$('deadzone-value').textContent=Math.round(settings.deadzone*100)+'%';}
function setupSettings(){for(const id of ['settings-open','home-settings','pause-settings']){const el=$(id);if(el)el.onclick=openSettings;}$('settings-close').onclick=closeSettings;$('settings-done').onclick=closeSettings;$('settings-dialog').addEventListener('cancel',e=>{e.preventDefault();closeSettings();});for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b===button);$('settings-audio').hidden=button.dataset.tab!=='audio';$('settings-controls').hidden=button.dataset.tab!=='controls';};const bindings={'audio-master':['master',true],'audio-music':['music',true],'audio-ambience':['ambience',true],'music-volume':['musicVolume',false],'ambience-volume':['ambienceVolume',false],'gamepad-deadzone':['deadzone',false]};for(const [id,[key,check]] of Object.entries(bindings))$(id).oninput=()=>{settings[key]=check?$(id).checked:Number($(id).value)/100;saveSettings();fillSettings();applyAudioSettings();if(settings.master)unlockAudio();};$('gamepad-mode').onchange=()=>{settings.gamepad=$('gamepad-mode').value;input.setGamepad(new Set());lastPadButtons=[];saveSettings();};$('reset-layout').onclick=()=>{resetLayout();applyLayout();buildLayoutEditor();};fillSettings();}
function handlePadDialog(dialog,pressed,edge,ax,ay,now){
 if(edge(1)||(edge(9)&&dialog.id==='pause-dialog')){if(dialog.id==='settings-dialog')closeSettings();else if(dialog.id==='help-dialog')closeHelp();else if(dialog.id==='pause-dialog')resume();else if(dialog.id==='result-dialog')enterSelection();else if(dialog.id==='mode-dialog')$('mode-dialog').close();else if(dialog.id==='ladder-dialog')$('ladder-back').click();return;}
 const controls=[...dialog.querySelectorAll('button:not([disabled]),input,select')].filter(e=>!e.closest('[hidden]'));if(!controls.length)return;let index=controls.indexOf(document.activeElement);if(index<0){index=0;controls[0].focus();}
 const dy=pressed[12]||ay<-.5?-1:pressed[13]||ay>.5?1:0,dx=pressed[14]||ax<-.5?-1:pressed[15]||ax>.5?1:0;
 if(dy&&now-lastPadNav>210){lastPadNav=now;index=(index+dy+controls.length)%controls.length;controls[index].focus();controls[index].scrollIntoView({block:'nearest'});}
 const current=controls[index];if(dx&&now-lastPadNav>170){lastPadNav=now;if(current.type==='range'){current.value=Math.max(Number(current.min),Math.min(Number(current.max),Number(current.value)+dx*5));current.dispatchEvent(new Event('input',{bubbles:true}));}else if(current.tagName==='SELECT'){current.selectedIndex=(current.selectedIndex+dx+current.options.length)%current.options.length;current.dispatchEvent(new Event('change',{bubbles:true}));}}
 if(edge(0)&&(current.tagName==='BUTTON'||current.type==='checkbox'))current.click();
}
function pollGamepads(now){let pads=[];try{pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];}catch{}const pad=pads.find(p=>p.mapping==='standard')||pads[0];if($('settings-dialog').open)$('gamepad-status').textContent=!navigator.getGamepads?'Este navegador não oferece a API de gamepad.':pad?`${pad.id}${pad.mapping==='standard'?' · conectado':' · mapeamento pode variar; use um controle padrão'}`:'Conecte via USB/Bluetooth e pressione um botão para o navegador reconhecer.';if(!input||settings.gamepad==='off'||!pad){input?.setGamepad(new Set());lastPadButtons=[];return;}const pressed=pad.buttons.map(b=>b.pressed||b.value>.5),edge=i=>pressed[i]&&!lastPadButtons[i],ax=pad.axes[0]||0,ay=pad.axes[1]||0,active=pressed.some(Boolean)||Math.abs(ax)>settings.deadzone||Math.abs(ay)>settings.deadzone;if(active)input.setMode('gamepad');const actions=new Set();for(const [i,a] of Object.entries(GAMEPAD_MAP))if(pressed[i])actions.add(a);if(ax>settings.deadzone)actions.add('right');if(ax<-settings.deadzone)actions.add('left');if(ay<-.65)actions.add('jump');if(ay>.65)actions.add('crouch');const openDialog=document.querySelector('dialog[open]');if(openDialog){handlePadDialog(openDialog,pressed,edge,ax,ay,now);input.setGamepad(new Set());lastPadButtons=pressed;return;}if(screen==='fight'&&edge(9)&&!$('settings-dialog').open&&!$('help-dialog').open){if($('pause-dialog').open)resume();else pause();}if(screen==='home'&&edge(0)&&!document.querySelector('dialog[open]'))openModes();if(screen==='selection'&&!document.querySelector('dialog[open]')){let delta=pressed[14]||ax<-.5?-1:pressed[15]||ax>.5?1:pressed[12]||ay<-.5?-3:pressed[13]||ay>.5?3:0;if(delta&&now-lastPadNav>210){lastPadNav=now;const i=ROSTER.findIndex(c=>c.id===previewId);showPreview(ROSTER[(i+delta+ROSTER.length)%ROSTER.length].id);document.querySelector(`[data-fighter="${previewId}"]`).scrollIntoView({block:'nearest'});}if(edge(0))chooseFighter(previewId);if(edge(9))confirmMatch();if(edge(1))setSelectionTarget('player');}input.setGamepad(actions);lastPadButtons=pressed;}


// V2.7 — Multiplayer LAN (somente novo modo; demais modos mantidos).
const MP_ACTIONS=new Set(['left','right','jump','crouch','punch','kick','block','special','power2','power3','power4']);
let mp=null,mpApplyingPause=false,mpSnapshotTimer=0,mpInputTimer=0;
function mpSend(data){if(mp?.socket?.readyState===WebSocket.OPEN)try{mp.socket.send(JSON.stringify(data));}catch{}}
function mpStatus(message){const el=$('mp-status');if(el)el.textContent=message;}
function mpOpen(){
 if($('mode-dialog').open)$('mode-dialog').close();
 if(!window.WebSocket){toast('Este leitor não suporta WebSocket. Abra o jogo em um navegador.');return;}
 if(location.protocol==='file:'){toast('Multiplayer precisa do endereço HTTPS do jogo online, não de um arquivo aberto localmente.');return;}
 const roomFromLink=new URLSearchParams(location.search).get('room');
 $('mp-entry').hidden=false;$('mp-room').hidden=true;
 $('mp-code').value=(roomFromLink||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
 mpStatus('Crie uma sala ou digite o código de um amigo. Máximo: dois jogadores.');
 $('multiplayer-dialog').showModal();
}
function mpConnect(command){
 if(mp?.socket?.readyState===WebSocket.OPEN){
  if(mp.room){mpStatus('Você já está em uma sala.');return;}
  const code=$('mp-code').value.trim().toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
  if(command==='join'&&code.length!==6){mpStatus('Digite um código de seis caracteres.');return;}
  mpStatus('Buscando a sala...');mpSend(command==='create'?{type:'create'}:{type:'join',code});return;
 }
 if(mp?.socket?.readyState===WebSocket.CONNECTING){mpStatus('Ainda conectando ao servidor online...');return;}
 const url=new URL('/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
 const code=$('mp-code').value.trim().toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
 if(command==='join'&&code.length!==6){mpStatus('Digite um código de seis caracteres.');return;}
 mp={socket:null,room:null,slot:-1,match:false,awaitingRematch:false,rematchSent:false,ignoreClose:false};
 let socket;
 try{socket=new WebSocket(url.href);}catch(e){mpStatus('Não foi possível conectar ao servidor online.');return;}
 mp.socket=socket;
 mpStatus('Conectando ao servidor online...');
 socket.addEventListener('open',()=>{mpStatus('Conectado. Aguarde os dados da sala...');mpSend(command==='create'?{type:'create'}:{type:'join',code});});
 socket.addEventListener('message',e=>{let data;try{data=JSON.parse(e.data);}catch{return;}mpHandle(data);});
 socket.addEventListener('error',()=>mpStatus('Falha na conexão online. Verifique sua internet e tente novamente.'));
 socket.addEventListener('close',()=>{
  if(mp?.socket!==socket)return;
  const unexpected=!mp.ignoreClose;
  mp.room=null;mp.match=false;game?.setMultiplayer(false);
  if(unexpected){mpStatus('A conexão com o servidor foi encerrada.');if(screen==='fight'){game.paused=true;input.enabled=false;setScreen('home');$('multiplayer-dialog').showModal();}}
 });
}
function mpLeave(){
 if(!mp)return;
 const current=mp;current.ignoreClose=true;
 if(current.socket?.readyState===WebSocket.OPEN){mpSend({type:'leave'});current.socket.close(1000,'Saiu da sala');}
 mp=null;game?.setMultiplayer(false);if(gameMode==='multiplayer')gameMode='free';
}
function mpClose(){if(screen==='fight'&&gameMode==='multiplayer'){game.paused=true;setScreen('home');}mpLeave();if($('multiplayer-dialog').open)$('multiplayer-dialog').close();}
function mpRenderRoom(){
 if(!mp?.room)return;
 $('mp-entry').hidden=true;$('mp-room').hidden=false;
 $('mp-room-code').textContent=mp.room.code;
 const slot=mp.slot,me=mp.room.players[slot],other=mp.room.players[1-slot];
 for(let i=0;i<2;i++){
  const e=$('mp-seat-'+i),p=mp.room.players[i];
  e.classList.toggle('ready',Boolean(p?.ready));
  e.querySelector('strong').textContent=p?getCharacter(p.character).name.toLocaleUpperCase('pt-BR')+(p.ready?' · PRONTO':' · ESCOLHENDO'):'AGUARDANDO AMIGO...';
 }
 const root=$('mp-roster');root.replaceChildren();
 for(const character of ROSTER){
  const button=document.createElement('button');button.type='button';button.className='mk-mp-fighter';button.style.setProperty('--accent',character.color);
  button.classList.toggle('selected',me?.character===character.id);
  button.classList.toggle('taken',other?.character===character.id);
  button.disabled=Boolean(other?.character===character.id||me?.ready);
  button.setAttribute('aria-label',`Selecionar ${character.name}`);
  const face=document.createElement('span');face.className='face';applyPortrait(face,character);
  const name=document.createElement('strong');name.textContent=character.name.toLocaleUpperCase('pt-BR');button.append(face,name);
  button.onclick=()=>mpSend({type:'select',character:character.id});root.append(button);
 }
 $('mp-ready').textContent=me?.ready?'CANCELAR PRONTO':'ESTOU PRONTO';
 $('mp-ready').disabled=!other;
 $('mp-start').hidden=slot!==0||!me?.ready||!other?.ready;
 $('mp-room-tip').textContent=!other?'Envie o código ou link. A sala aceita somente um convidado.':!me?.ready?'Escolha seu personagem e toque em ESTOU PRONTO.':!other?.ready?'Você está pronto. Aguarde o outro jogador.':slot===0?'Ambos prontos! Inicie a luta.':'Ambos prontos! O desafiante vai iniciar a luta.';
 mpStatus(slot===0?'Você é o DESAFIANTE (Jogador 1).':'Você é o DESAFIADO (Jogador 2).');
}
function mpSyncSnapshot(state){
 if(!mp?.match||mp.slot!==1||screen!=='fight'||!state||!Array.isArray(state.fighters))return;
 game.timer=state.timer;game.phase=state.phase;game.phaseTime=state.phaseTime;game.message=state.message;game.round=state.round;
 game.wins=state.wins;game.combo=state.combo;game.paused=state.paused;game.winner=state.winner;
 game.projectiles=state.projectiles||[];
 for(let i=0;i<2;i++)if(game.fighters[i]&&state.fighters[i])Object.assign(game.fighters[i],state.fighters[i]);
}
function mpSnapshot(){
 return {timer:game.timer,phase:game.phase,phaseTime:game.phaseTime,message:game.message,round:game.round,wins:game.wins,combo:game.combo,paused:game.paused,winner:game.winner,
  projectiles:game.projectiles,
  fighters:game.fighters.map(f=>({id:f.id,x:f.x,y:f.y,facing:f.facing,action:f.action,actionT:f.actionT,hp:f.hp,energy:f.energy,vy:f.vy,vx:f.vx,move:f.move,stun:f.stun,cooldown:f.cooldown,combo:f.combo,comboAge:f.comboAge,chainStep:f.chainStep,attackDuration:f.attackDuration,powerType:f.powerType,powerVisual:f.powerVisual,powerCooldowns:f.powerCooldowns,shield:f.shield,blocking:f.blocking,hitFlash:f.hitFlash,attack:f.attack}))};
}
function mpStartFight(players){
 if(!mp||!Array.isArray(players)||players.length!==2)return;
 const myId=players[mp.slot],theirId=players[1-mp.slot];
 mp.match=true;mp.awaitingRematch=false;mp.rematchSent=false;mpInputTimer=0;mpSnapshotTimer=0;
 $('rematch').disabled=false;
 gameMode='multiplayer';championship=null;selected=myId;chosenOpponent=theirId;
 if($('multiplayer-dialog').open)$('multiplayer-dialog').close();
 if($('result-dialog').open)$('result-dialog').close();
 setScreen('fight');
 game.setMultiplayer(mp.slot===0);
 game.start(players[0],players[1]);
 buildPowerBar(myId);music.currentTime=0;syncAudio();
 const p=getCharacter(myId),e=getCharacter(theirId);
 $('player-name').textContent=names[p.id];$('enemy-name').textContent=names[e.id];$('power-label').textContent=p.power.toLocaleUpperCase('pt-BR')+' · L';
 document.body.style.setProperty('--player-accent',p.color);document.body.style.setProperty('--enemy-accent',e.color);
 $('championship-fight-hud').hidden=true;updateHUD();$('arena').focus({preventScroll:true});
}
function mpShowLobby(){
 if(!mp?.room)return;
 mp.match=false;game.setMultiplayer(false);
 if($('result-dialog').open)$('result-dialog').close();
 if($('pause-dialog').open)$('pause-dialog').close();
 setScreen('home');
 $('multiplayer-dialog').showModal();mpRenderRoom();
}
function mpHandle(data){
 if(!mp||!data?.type)return;
 switch(data.type){
  case 'hello':break;
  case 'room':mp.room=data;mpRenderRoom();break;
  case 'assigned':mp.slot=data.slot;break;
  case 'start':mpStartFight(data.players);break;
  case 'input':if(mp.slot===0&&mp.match)game.setRemoteInput(data.actions,data.pressed);break;
  case 'state':mpSyncSnapshot(data.state);break;
  case 'event':if(mp.slot===1&&mp.match){if(Array.isArray(data.wins))game.wins=data.wins;onEvent(data.event);}break;
  case 'pause':mpApplyingPause=true;pause();mpApplyingPause=false;break;
  case 'resume':mpApplyingPause=true;resume();mpApplyingPause=false;break;
  case 'rematch_status':mpStatus(data.waiting?'Aguardando o outro jogador pedir revanche...':'Revanche confirmada!');break;
  case 'peer_left':mpStatus(data.message||'O outro jogador saiu.');mpShowLobby();break;
  case 'closed':mpStatus(data.message||'O desafiante saiu.');mp.room=null;mp.match=false;game?.setMultiplayer(false);if(screen==='fight'){game.paused=true;setScreen('home');}$('mp-room').hidden=true;$('mp-entry').hidden=false;if(!$('multiplayer-dialog').open)$('multiplayer-dialog').showModal();break;
  case 'back_to_lobby':mpShowLobby();break;
  case 'error':mpStatus(data.message||'Erro de conexão.');break;
 }
}
function mpSetup(){
 $('mp-create').onclick=()=>mpConnect('create');
 $('mp-join').onclick=()=>mpConnect('join');
 $('mp-code').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();mpConnect('join');}});
 $('mp-ready').onclick=()=>{const me=mp?.room?.players?.[mp.slot];if(me)mpSend({type:'ready',ready:!me.ready});};
 $('mp-start').onclick=()=>mpSend({type:'start'});
 $('mp-close').onclick=mpClose;
 $('mp-copy').onclick=async()=>{
  const url=location.origin+location.pathname+'?room='+mp.room.code;
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
   else{
    const input=document.createElement('textarea');input.value=url;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
    const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error('Cópia indisponível');
   }
   mpStatus('Link copiado. Envie para seu amigo.');
  }catch{mpStatus('Compartilhe este link: '+url);}
 };
 $('multiplayer-dialog').addEventListener('cancel',e=>{e.preventDefault();mpClose();});
 const code=new URLSearchParams(location.search).get('room');
 if(code){$('mp-code').value=code.toUpperCase().slice(0,6);setTimeout(()=>{if(screen==='home'&&!document.querySelector('dialog[open]'))mpOpen();},850);} 
}

// V1.9 — Apenas camada visual da tela inicial; captura os MODELOS REAIS do jogo.
const CINEMA_POSES={camera:'win',math:'punch',thai:'special',eric:'special',gigica:'win',kaka:'punch',samuel:'win',gabi:'special',frequencia:'special'};
let cinemaFrames=new Map(),cinemaOrder=[],cinemaLast=null,cinemaNow=0,cinemaTicker=0,cinemaPreload=0,cinemaStarted=false;
const cinemaNode=()=>document.getElementById('home-cinema');
function cinemaShuffle(){
  const ids=ROSTER.map(c=>c.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  if(ids.length>1&&ids[0]===cinemaLast)[ids[0],ids[1]]=[ids[1],ids[0]];
  cinemaOrder=ids;
}
function cinemaGetNext(){if(!cinemaOrder.length)cinemaShuffle();const next=cinemaOrder.shift();cinemaLast=next;return next;}
function cinemaCapture(id){
  if(!arena)return null;
  const fighter=arena.ensureModel(id);if(!fighter)return null;
  const W=1152,H=648,renderer=arena.renderer,camera=arena.camera;
  const target=new THREE.WebGLRenderTarget(W,H,{depthBuffer:true,stencilBuffer:false});
  const pixels=new Uint8Array(W*H*4),savedCamera={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,aspect:camera.aspect};
  const prevTarget=renderer.getRenderTarget(),visibility=new Map(Object.values(arena.models).map(m=>[m,m.group.visible]));
  const prevTime=arena.time;
  let result=null;
  try{
    for(const m of Object.values(arena.models))m.group.visible=m===fighter;
    const index=ROSTER.findIndex(c=>c.id===id);
    const data={id,x:1.35,y:0,z:0,facing:index%2?.14:-.12,action:CINEMA_POSES[id]||'win',actionT:.24,attackDuration:.46,chainStep:3,energy:100,powerType:index%2?'radial':'rain'};
    // A pose é feita com as MESMAS juntas e animacoes usadas em combate.
    fighter.group.rotation.y=data.facing*1.03;
    for(let n=0;n<9;n++)arena.animateFighter(data,.05,'select');
    arena.time+=index*.13;
    camera.aspect=W/H;camera.fov=35;camera.position.set(.12,2.30,6.8);camera.lookAt(.14,1.52,-.25);camera.updateProjectionMatrix();
    renderer.setRenderTarget(target);renderer.render(arena.scene,camera);
    renderer.readRenderTargetPixels(target,0,0,W,H,pixels);
    const frame=document.createElement('canvas');frame.width=W;frame.height=H;const context=frame.getContext('2d');
    if(!context)return null;
    const img=context.createImageData(W,H);
    for(let row=0;row<H;row++){
      const source=(H-1-row)*W*4,dest=row*W*4;
      img.data.set(pixels.subarray(source,source+W*4),dest);
    }
    context.putImageData(img,0,0);
    result=frame.toDataURL('image/webp',.84);
  }catch(e){console.warn('Malok Kombat: frame cinematografico indisponivel',id,e);}
  finally{
    renderer.setRenderTarget(prevTarget);camera.position.copy(savedCamera.position);camera.quaternion.copy(savedCamera.quaternion);camera.fov=savedCamera.fov;camera.aspect=savedCamera.aspect;camera.updateProjectionMatrix();arena.time=prevTime;
    for(const [model,visible] of visibility)model.group.visible=visible;
    target.dispose();
  }
  return result;
}
function cinemaEnsure(id){if(cinemaFrames.has(id))return cinemaFrames.get(id);const image=cinemaCapture(id);cinemaFrames.set(id,image||null);return image;}
function cinemaShow(id,first=false){
  const url=cinemaEnsure(id);if(!url)return;
  const root=cinemaNode();if(!root)return;
  const next=1-cinemaNow, frame=document.getElementById(cinemaNow?'cinema-frame-a':'cinema-frame-b');
  const current=document.getElementById(cinemaNow?'cinema-frame-b':'cinema-frame-a');
  const character=getCharacter(id),number=ROSTER.findIndex(c=>c.id===id)+1;
  const pic=frame.querySelector('.home-cinema-picture');
  pic.style.backgroundImage='url('+JSON.stringify(url)+')';
  pic.style.animation='none';void pic.offsetWidth;pic.style.animation='';
  frame.classList.remove('moving-right','moving-zoom');frame.classList.add(number%3===0?'moving-zoom':number%2===0?'moving-right':'moving-left');
  frame.style.setProperty('--cinema-accent',character.color);
  const title=frame.querySelector('.home-cinema-title');title.replaceChildren();
  const scene=document.createElement('span');scene.className='cinema-scene';scene.textContent='EM CENA  /  '+String(number).padStart(2,'0');
  const name=document.createElement('strong');name.textContent=character.name;
  const role=document.createElement('small');role.textContent=character.role;
  title.append(scene,name,role);
  if(first||!root.classList.contains('ready')){current.style.transition='none';current.style.opacity='0';frame.style.transition='none';frame.style.opacity='1';root.classList.add('ready');requestAnimationFrame(()=>{frame.style.transition='';current.style.transition='';});}
  else{frame.style.opacity='0';frame.style.zIndex='2';current.style.zIndex='1';void frame.offsetWidth;frame.style.opacity='1';current.style.opacity='0';}
  cinemaNow=next;root.classList.add('ready');
}
function cinemaClearTimers(){clearTimeout(cinemaTicker);clearTimeout(cinemaPreload);cinemaTicker=0;cinemaPreload=0;}
function cinemaNext(){
  if(screen!=='home'||document.hidden)return;
  const id=cinemaGetNext();cinemaShow(id);cinemaTicker=setTimeout(cinemaNext,6800);
}
function cinemaBackgroundPreload(){
  if(screen!=='home'||document.hidden)return;
  const missing=ROSTER.find(c=>!cinemaFrames.has(c.id));
  if(missing){cinemaEnsure(missing.id);cinemaPreload=setTimeout(cinemaBackgroundPreload,310);}
}
function cinemaStart(){
  if(!arena||screen!=='home'||document.hidden)return;
  cinemaClearTimers();
  if(!cinemaStarted){cinemaStarted=true;const id=cinemaGetNext();cinemaShow(id,true);}
  cinemaTicker=setTimeout(cinemaNext,6800);
  cinemaPreload=setTimeout(cinemaBackgroundPreload,900);
}
function cinemaStop(){cinemaClearTimers();}

init();
