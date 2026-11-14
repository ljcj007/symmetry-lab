import {createResourceLoader} from './resource-loader.js?v=20261110-en1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const LEARNING_BRIDGE_HOOKS=Object.freeze({
 hubbard:Object.freeze(['hubbard-basis','manybody-lehmann']),
 quantum:Object.freeze(['density-pure-mixed','density-exchange','spt-schmidt','spt-aklt-parent','su2-coupling-representations']),
 thermal:Object.freeze(['thermal-oscillator']),
 onsager:Object.freeze(['reciprocity-onsager','reciprocity-spatial-response','reciprocity-dissipation']),
 oscillator:Object.freeze(['scattering-temperature','polaron-hamiltonian','polaron-truncation'])
});
const definitions={
 hubbard:{load:()=>import('./hubbard-learning-bridge.js?v=20261113-operations1'),html:'hubbardBridgeHTML',bind:'bindHubbardLearningBridge'},
 quantum:{load:()=>import('./quantum-state-bridge.js?v=20261113-operations1'),html:'quantumStateBridgeHTML',bind:'bindQuantumStateBridge'},
 thermal:{load:()=>import('./thermal-learning-bridge.js?v=20261113-thermal1'),html:'thermalBridgeHTML',bind:'bindThermalLearningBridge'},
 onsager:{load:()=>import('./onsager-learning-bridge.js?v=20261113-thermal1'),html:'onsagerBridgeHTML',bind:'bindOnsagerLearningBridge'},
 oscillator:{load:()=>import('./oscillator-spectra-bridge.js?v=20261114-evidence1'),html:'oscillatorSpectraBridgeHTML',bind:'bindOscillatorSpectraBridge'}
};
const modules=createResourceLoader(family=>definitions[family].load());
export function learningBridgeHTML(family,lessonId){
 if(!LEARNING_BRIDGE_HOOKS[family]?.includes(lessonId))return '';
 return `<div data-learning-bridge="${esc(family)}" data-learning-bridge-lesson="${esc(lessonId)}" aria-busy="true"></div>`;
}
export function bindLearningBridge({root,family,lessonId,isCurrent=()=>true,stateStore,onOpenLab,loadModule=key=>modules.get(key)}={}){
 let alive=true,pending=null,inner=()=>{};
 const host=LEARNING_BRIDGE_HOOKS[family]?.includes(lessonId)?root?.querySelector('[data-learning-bridge="'+family+'"]'):null;
 const current=()=>alive&&host&&host.isConnected!==false&&isCurrent()&&root.querySelector('[data-learning-bridge="'+family+'"]')===host&&host.dataset.learningBridgeLesson===lessonId;
 const cleanup=()=>{if(!alive)return;inner();alive=false;if(host)for(const button of host.querySelectorAll('[data-learning-bridge-retry]'))button.onclick=null;};
 cleanup.snapshot=()=>inner.snapshot?.()||{};
 const start=()=>{
  if(!current())return Promise.resolve();if(pending)return pending;
  pending=(async()=>{
  host.setAttribute('aria-busy','true');
  try{
   const module=await loadModule(family);if(!current())return;
   host.innerHTML=module[definitions[family].html](lessonId);
   inner=module[definitions[family].bind]({root:host,lessonId,isCurrent:current,stateStore,onOpenLab});
   host.setAttribute('aria-busy','false');
  }catch(error){
   if(!current())return;
   host.setAttribute('aria-busy','false');host.innerHTML="<p>The optional demonstration could not be loaded. Please try again.<button type=\"button\" class=\"secondary\" data-learning-bridge-retry>Retry optional demonstration</button></p>";
   host.querySelector('[data-learning-bridge-retry]').onclick=()=>{if(current())cleanup.ready=start();};
  }finally{pending=null;}
  })();return pending;
 };
 cleanup.ready=start();return cleanup;
}
