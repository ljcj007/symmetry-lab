const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>structuredClone(value);
export const SCATTERING_REPLAY_LESSONS=Object.freeze(['scattering-chain','scattering-phase']);
const labels=Object.freeze({default:"Default diatomic chain", 'unequal-gamma':"Unequal masses: translation at Gamma", 'folded-even':"The same reduced q: an even reciprocal zone", 'folded-odd':"The same reduced q: an odd reciprocal zone", 'zero-projection':"Scattering vector perpendicular to the chain", 'signed-weights':"Signed scattering weights", 'degenerate-edge':"The complete degenerate subspace at the zone edge"});
let uiPromise=null,referencePromise=null;
const loadUI=()=>uiPromise??=import('./scattering-replay-ui.js?v=20261117-scattering1').catch(error=>{uiPromise=null;throw error;});
const loadReference=()=>referencePromise??=import('./scattering-replay-reference.js?v=20261117-scattering1').catch(error=>{referencePromise=null;throw error;});
const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;

function entry(kind){return `<section class="sar-host" data-sar-host="${kind}"><details data-sar-disclosure><summary>${kind==='lesson'?"How do the atomic complex amplitudes add?":"Replay the atomic amplitudes from this calculation"}</summary><div data-sar-content></div></details></section>`;}
export function scatteringReplayLessonHTML(lessonId){return SCATTERING_REPLAY_LESSONS.includes(lessonId)?entry('lesson'):'';}
export function scatteringReplayResultHTML(result){
 if(!result?.data?.amplitudeReplay)return "<section class=\"sar-host\"><p>This result does not contain an atomic-amplitude ledger. Its original spectrum and results remain available. Select “Include the atomic-amplitude derivation” and run manually to replay data from that calculation.</p></section>";
 return entry('result');
}

/** Lazy optional view of a calculated ledger. Opening never runs Python. */
export function bindScatteringReplayHost({root,lessonId,result,input,stateStore=new Map(),onOpenLab,download,isCurrent=()=>true,loadModule=loadUI,loadReferences=loadReference}={}){
 const mode=lessonId?'lesson':'result';
 const host=root?.querySelector('[data-sar-host="'+mode+'"]'),detail=host?.querySelector('[data-sar-disclosure]'),content=host?.querySelector('[data-sar-content]');
 const store=stateStore instanceof Map?stateStore:new Map(),hostKey='host:'+(lessonId||'result');
 const saved=store.get(hostKey),state={open:saved?.open===true,caseId:typeof saved?.caseId==='string'?saved.caseId:lessonId==='scattering-chain'?'unequal-gamma':'folded-even'};
 let alive=true,pending=null,child=()=>{},loaded=null;
 const active=()=>alive&&!!host&&host.isConnected!==false&&isCurrent()&&root.querySelector('[data-sar-host="'+mode+'"]')===host;
 const save=()=>{if(active())store.set(hostKey,clone(state));};
 const cleanup=()=>{if(!alive)return;child();if(active()){state.open=readOpen(detail);save();}alive=false;if(detail)detail.ontoggle=null;if(content)for(const node of content.querySelectorAll('button'))node.onclick=null;};
 cleanup.snapshot=()=>clone(state);cleanup.ready=Promise.resolve();
 if(!host||!detail||!content||mode==='lesson'&&!SCATTERING_REPLAY_LESSONS.includes(lessonId))return cleanup;
 function draw(){
  if(!active()||!loaded)return;
  child();child=()=>{};
  const refs=loaded.references?.cases||[],selected=mode==='lesson'?(refs.find(row=>row.id===state.caseId)||refs[0]):null;
  if(mode==='lesson'&&!selected)throw Error("The reference example has no complete amplitude ledger.");
  if(selected)state.caseId=selected.id;
  const replay=mode==='lesson'?selected.replay:result;
  content.innerHTML=(mode==='lesson'?"<p>These are precalculated teaching references, separate from the current experiment. Opening the panel, changing examples and revealing steps do not start a calculation.</p><label>Choose a complete worked reference<select id=\"sar-host-case\">"+refs.map(row=>'<option value="'+esc(row.id)+'"'+(row.id===state.caseId?' selected':'')+'>'+esc(labels[row.id]||row.id)+'</option>').join('')+'</select></label>':"<p>This derivation reads the data saved by this manual calculation. Changing steps or branches does not solve the dynamical matrix again.</p>")+'<div data-sar-view></div>'+(mode==='lesson'&&onOpenLab?"<button type=\"button\" class=\"secondary\" id=\"sar-host-copy\">Copy the complete reference input to the original experiment</button><p>Copying replaces the experiment draft and waits for a manual Run. Predictions, notes and viewed steps are not calculation parameters.</p><p>This is an ideal-chain reference. The current material provides background only; these are not fitted or imported data for that material.</p><p id=\"sar-host-copy-status\" role=\"status\"></p>":'')+"<p><a href=\"docs/scattering-amplitudes.md\" target=\"_blank\" rel=\"noopener\">Atomic amplitudes: method, units and scope ↗</a></p>";
  const view=content.querySelector('[data-sar-view]'),caseKey=mode==='lesson'?lessonId+':'+state.caseId:'result';
  child=loaded.ui.bindScatteringReplay({root:view,replay,prefix:mode==='lesson'?'sar-lesson-view':'sar-result-view',stateStore:store,stateKey:'ui:'+caseKey,isCurrent:()=>active()&&content.querySelector('[data-sar-view]')===view,download});
  const selector=content.querySelector('#sar-host-case');if(selector)selector.onchange=()=>{if(!active()||content.querySelector('#sar-host-case')!==selector||!refs.some(row=>row.id===selector.value))return;state.caseId=selector.value;save();draw();};
  const copy=content.querySelector('#sar-host-copy');if(copy)copy.onclick=()=>{if(!active()||content.querySelector('#sar-host-copy')!==copy)return;const copied=onOpenLab({action:'dynamic_scattering_lab',module:'scattering',input:clone(selected.input)});if(active())content.querySelector('#sar-host-copy-status').textContent=copied===false?"The reference input has not been copied. Please check the original experiment.":"The complete reference input has been copied. Run the original experiment manually.";};
  save();
 }
 function start(){
  if(!active()||!readOpen(detail))return Promise.resolve();
  if(pending)return pending;
  if(loaded){draw();return Promise.resolve();}
  content.innerHTML="<p role=\"status\">Loading the amplitude derivation…</p>";
  pending=(async()=>{
   try{const [ui,reference]=await Promise.all([Promise.resolve().then(()=>loadModule()),mode==='lesson'?Promise.resolve().then(()=>loadReferences()):Promise.resolve(null)]);if(!active())return;loaded={ui,references:reference?.SCATTERING_REPLAY_REFERENCE||reference};draw();}
   catch(error){if(active()){loaded=null;content.innerHTML="<p role=\"alert\">The amplitude derivation could not be loaded.<button type=\"button\" class=\"secondary\" data-sar-retry>Retry the amplitude derivation</button></p>";content.querySelector('[data-sar-retry]').onclick=()=>{if(active())cleanup.ready=start();};}}
   finally{pending=null;}
  })();return pending;
 }
 detail.ontoggle=()=>{if(!active())return;state.open=readOpen(detail);save();if(state.open)cleanup.ready=start();};
 if(state.open){detail.open=true;cleanup.ready=start();}
 return cleanup;
}
