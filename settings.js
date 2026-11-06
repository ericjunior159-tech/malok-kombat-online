const defaults={master:true,music:true,musicVolume:.45,ambience:true,ambienceVolume:.65,gamepad:'auto',deadzone:.2,buttons:{},joystick:{x:17,y:80}};
let stored={};try{stored=JSON.parse(localStorage.getItem('malok-settings-v2')||'{}');}catch{}
// Novo layout dos botões: aplica somente na primeira abertura da V1.3.
// Mantém as preferências de áudio, gamepad e a posição já salva do joystick.
// A partir daí, o usuário pode personalizar novamente as posições.
const needsLayoutV3=Number(stored.touchLayoutVersion||0)<3;
export const settings={...defaults,...stored,buttons:needsLayoutV3?{}:(stored.buttons||{}),touchLayoutVersion:3};
if(needsLayoutV3)saveSettings();
export function saveSettings(){try{localStorage.setItem('malok-settings-v2',JSON.stringify(settings));}catch{}}
export function resetLayout(){settings.buttons={};settings.joystick={x:17,y:80};saveSettings();}
export const DEFAULT_BUTTONS={punch:{x:69,y:67},block:{x:80,y:52},kick:{x:91,y:67},special:{x:51,y:88},power2:{x:64,y:88},power3:{x:77,y:88},power4:{x:90,y:88}};
export const GAMEPAD_MAP={0:'jump',1:'kick',2:'punch',3:'special',4:'block',5:'power2',6:'power3',7:'power4',12:'jump',13:'crouch',14:'left',15:'right'};
