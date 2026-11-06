// One source of truth for selectable identities and audiovisual powers.
const entries = [
 {id:'camera',name:'Victor Teo',role:'Luz & impacto',power:'Flash Cinético',color:'#ff773d',description:'Um olhar preciso. Um impacto implacável.',portrait:{url:'./assets/likeness-faces.png',position:'0% 50%',size:'200% 100%'}},
 {id:'frequencia',name:'Fii',role:'Som & movimento',power:'Onda Sônica',color:'#70dccb',description:'Sinta o grave. Antecipe o próximo golpe.',portrait:{url:'./assets/likeness-faces.png',position:'100% 50%',size:'200% 100%'}},
 {id:'eric',portrait:{url:'./assets/eric-gigica.png',position:'100% 50%',size:'200% auto'},name:'Eric',role:'Editor',power:'Corte Seco',color:'#a18aff',description:'Cada corte abre espaço para o próximo golpe.'},
 {id:'gigica',portrait:{url:'./assets/eric-gigica.png',position:'0% 50%',size:'200% auto'},name:'Gigica',role:'Editora',power:'Corte em Loop',color:'#e3a9c5',description:'Encontre o ritmo. Faça a sequência acontecer.'},
 {id:'kaka',portrait:{url:'./assets/roster-five.png',position:'0% 45%',size:'500% auto'},name:'Kaká',role:'Assistente de set',power:'Contra-regra',color:'#d8cc80',description:'Tudo no lugar para uma entrada em cena certeira.'},
 {id:'thai',portrait:{url:'./assets/roster-five.png',position:'25% 45%',size:'500% auto'},name:'Thai',role:'Pré-produção · roupas e cenários',power:'Troca de Cena',color:'#7dcdf1',description:'Transforme o cenário. Mude o rumo da luta.'},
 {id:'samuel',portrait:{url:'./assets/roster-five.png',position:'50% 45%',size:'500% auto'},name:'Samuel',role:'Cinegrafista',power:'Plano Sequência',color:'#c18b80',description:'Uma sequência de golpes, sem perder o enquadramento.'},
 {id:'gabi',portrait:{url:'./assets/roster-five.png',position:'75% 45%',size:'500% auto'},name:'Gabi',role:'Designer gráfica',power:'Vetor de Impacto',color:'#b7df82',description:'Precisão nas formas. Força em cada composição.'},
 {id:'math',portrait:{url:'./assets/roster-five.png',position:'100% 45%',size:'500% auto'},name:'Math',role:'Editor e cinegrafista',power:'Corte de Luz',color:'#e9b773',description:'Do enquadramento ao corte, controle cada movimento.'},
];
export const ROSTER=['camera','math','thai','eric','gigica','kaka','samuel','gabi','frequencia'].map(id=>entries.find(c=>c.id===id));
export const CHARACTERS = Object.fromEntries(ROSTER.map(character=>[character.id,character]));
export const getCharacter = id => CHARACTERS[id] || ROSTER[0];
