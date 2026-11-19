const waveKeys=['gamma','x-100','x-010','x-001'];
export const siFoldingWaves=Object.freeze([[0,0,0],[1,0,0],[0,1,0],[0,0,1]].map(Object.freeze));

export function siFoldingStructureRoute(waveIndex){
 return Number.isInteger(waveIndex)&&waveIndex>=0&&waveIndex<waveKeys.length
  ?'#structure?si-k='+waveKeys[waveIndex]: '#structure';
}

export function siFoldingSourceWave(query){
 const values=new URLSearchParams(query).getAll('si-k');
 return values.length===1?siFoldingWaves[waveKeys.indexOf(values[0])]??null:null;
}
