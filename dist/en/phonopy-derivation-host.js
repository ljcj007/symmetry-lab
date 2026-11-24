import {setPhonopyScatteringTeachingInput} from './phonopy-scattering-handoff.js?v=20261117-derive1';

export const PHONOPY_DERIVATION_LESSON='scattering-phase';
export const PHONOPY_DERIVATION_ROUTE='#classroom/observables?module=scattering&lesson=scattering-phase';
const lessonMemory=new Map();
let modulePromise=null;
const loadUI=()=>modulePromise??=import('./phonopy-derivation-ui.js?v=20261124-teaching1').catch(error=>{modulePromise=null;throw error;});
const clone=value=>structuredClone(value);
const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
const navigate=route=>{if(globalThis.location)globalThis.location.hash=route;};

export function phonopyDerivationLessonHTML(lessonId){
 if(lessonId!==PHONOPY_DERIVATION_LESSON)return '';
 return "<section class=\"pdh-host\" data-pdh-host><details data-pdh-disclosure><summary>Derive scattering at two points from the same ZnO files: calculate, explain and diagnose</summary><p>Carry the chain model into a real three-dimensional primitive cell: predict, construct each complex amplitude, then test the formula at a second point. Teaching references, your answers and expert calculations remain separate.</p><div data-pdh-content></div><p><a href=\"docs/phonopy-derivation.md\" target=\"_blank\" rel=\"noopener\">Two-point derivation: conventions, sources and use of reference answers ↗</a></p></details></section>";
}

export function phonopyDerivationLearningLinkHTML(){
 return "<aside class=\"obs-model-note\"><h3>Continue: how can two measurement points test amplitudes from the same ZnO modes?</h3><p>First check the primitive cell, mass unweighting and phase. Then derive the three-dimensional projection and complex atomic amplitudes in the scattering lesson. Two points can expose an error hidden by accidental agreement at one point.</p><a href=\""+PHONOPY_DERIVATION_ROUTE+"\">Open the ZnO two-point derivation workshop in the scattering lesson →</a></aside>";
}

/** A native, optional classroom disclosure. Loading the UI never runs Python. */
export function bindPhonopyDerivationHost({root,lessonId,stateStore=lessonMemory,run,download,isCurrent=()=>true,loadModule=loadUI,onNavigateTeaching=navigate}={}){
 const host=root?.querySelector('[data-pdh-host]'),detail=host?.querySelector('[data-pdh-disclosure]'),content=host?.querySelector('[data-pdh-content]');
 const store=stateStore instanceof Map?stateStore:lessonMemory,key='host:'+PHONOPY_DERIVATION_LESSON;
 const state={open:store.get(key)?.open===true};
 let alive=true,pending=null,loaded=null,child=null,observer=null;
 const active=()=>alive&&!!host&&host.isConnected!==false&&isCurrent()&&root.querySelector('[data-pdh-host]')===host;
 const save=()=>{if(active())store.set(key,clone(state));};
 const stopChild=()=>{const owned=child;child=null;if(typeof owned==='function')owned();};
 const cleanup=()=>{if(!alive)return;stopChild();if(active()){state.open=readOpen(detail);save();}alive=false;observer?.disconnect();if(detail)detail.ontoggle=null;};
 cleanup.ready=Promise.resolve();cleanup.snapshot=()=>clone(state);
 if(!host||!detail||!content||lessonId!==PHONOPY_DERIVATION_LESSON)return cleanup;
 if(typeof MutationObserver==='function'){observer=new MutationObserver(()=>{if(!active())cleanup();});observer.observe(root,{childList:true,subtree:true});}
 function draw(){
  if(!active()||!readOpen(detail)||!loaded||child)return;
  content.innerHTML='<div data-pdh-view></div>';
  const view=content.querySelector('[data-pdh-view]');
  child=loaded.bindPhonopyDerivationLesson({root:view,run,download,stateStore:store,stateKey:'ui:'+PHONOPY_DERIVATION_LESSON,isCurrent:()=>active()&&readOpen(detail)&&content.querySelector('[data-pdh-view]')===view,onCopyTeaching:payload=>{
   if(!active()||!readOpen(detail)||content.querySelector('[data-pdh-view]')!==view)return false;
   // This is an explicit complete teaching copy, never a saved project record
   // or the intentionally unfinished original-importer draft.
   setPhonopyScatteringTeachingInput(payload);
   onNavigateTeaching('#compute/phonopy-scattering');
   return true;
  }});
  if(typeof child!=='function')throw Error("The three-dimensional derivation interface did not provide a classroom view that can be closed safely.");
 }
 function start(){
  if(!active()||!readOpen(detail))return Promise.resolve();
  if(pending)return pending;
  if(loaded){draw();return Promise.resolve();}
  content.innerHTML="<p role=\"status\">Preparing the ZnO two-point derivation workshop…</p>";
  const owned=(async()=>{
   try{const ui=await Promise.resolve().then(()=>loadModule());if(!active())return;if(typeof ui?.bindPhonopyDerivationLesson!=='function')throw Error("The three-dimensional derivation interface is not ready.");loaded=ui;draw();}
   catch(error){if(!active()||!readOpen(detail))return;loaded=null;stopChild();content.innerHTML="<p role=\"alert\">The two-point derivation could not be loaded.<button type=\"button\" class=\"secondary\" data-pdh-retry>Retry the two-point derivation</button></p>";const retry=content.querySelector('[data-pdh-retry]');retry.onclick=()=>{if(active()&&readOpen(detail)&&content.querySelector('[data-pdh-retry]')===retry)cleanup.ready=start();};}
   finally{pending=null;}
  })();
  pending=owned;return owned;
 }
 detail.ontoggle=()=>{if(!active())return;state.open=readOpen(detail);save();if(state.open)cleanup.ready=start();else stopChild();};
 if(state.open){detail.open=true;cleanup.ready=start();}
 return cleanup;
}
