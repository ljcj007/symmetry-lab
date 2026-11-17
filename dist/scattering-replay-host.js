const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>structuredClone(value);
export const SCATTERING_REPLAY_LESSONS=Object.freeze(['scattering-chain','scattering-phase']);
const labels=Object.freeze({default:'默认双原子链', 'unequal-gamma':'不同质量：Γ 点平移', 'folded-even':'相同约化 q：偶数倒格区', 'folded-odd':'相同约化 q：奇数倒格区', 'zero-projection':'散射向量垂直链轴', 'signed-weights':'有符号的散射权重', 'degenerate-edge':'区边界的完整简并子空间'});
let uiPromise=null,referencePromise=null;
const loadUI=()=>uiPromise??=import('./scattering-replay-ui.js?v=20261117-scattering1').catch(error=>{uiPromise=null;throw error;});
const loadReference=()=>referencePromise??=import('./scattering-replay-reference.js?v=20261117-phonopy1').catch(error=>{referencePromise=null;throw error;});
const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;

function entry(kind){return `<section class="sar-host" data-sar-host="${kind}"><details data-sar-disclosure><summary>${kind==='lesson'?'原子的复振幅怎样相加？':'回放本次计算的逐原子振幅'}</summary><div data-sar-content></div></details></section>`;}
export function scatteringReplayLessonHTML(lessonId){return SCATTERING_REPLAY_LESSONS.includes(lessonId)?entry('lesson'):'';}
export function scatteringReplayResultHTML(result){
 if(!result?.data?.amplitudeReplay)return '<section class="sar-host"><p>这份结果没有保存逐原子振幅推导。原有谱图与结果仍可阅读；勾选“附带逐原子振幅推导”并手动计算后，再回放本次数据。</p></section>';
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
  if(mode==='lesson'&&!selected)throw Error('参考算例没有完整的振幅数据。');
  if(selected)state.caseId=selected.id;
  const replay=mode==='lesson'?selected.replay:result;
  content.innerHTML=(mode==='lesson'?'<p>以下是已计算的教学参考，不是当前实验的结果。打开、切换算例与展开推导不会启动计算。</p><label>选择完整参考算例<select id="sar-host-case">'+refs.map(row=>'<option value="'+esc(row.id)+'"'+(row.id===state.caseId?' selected':'')+'>'+esc(labels[row.id]||row.id)+'</option>').join('')+'</select></label>':'<p>以下推导读取这次手动计算保存的数据；切换步骤与分支不会再次求解动力学矩阵。</p>')+'<div data-sar-view></div>'+(mode==='lesson'&&onOpenLab?'<button type="button" class="secondary" id="sar-host-copy">把完整参考输入复制到原实验</button><p>复制会替换原实验草稿；仍须手动运行。预测、笔记与查看步骤不作为计算参数。</p><p>这是理想链参考；当前材料仅作背景，不是该材料的拟合或导入数据。</p><p id="sar-host-copy-status" role="status"></p>':'')+'<p><a href="docs/scattering-amplitudes.md" target="_blank" rel="noopener">逐原子振幅：方法、单位与适用范围 ↗</a></p>';
  const view=content.querySelector('[data-sar-view]'),caseKey=mode==='lesson'?lessonId+':'+state.caseId:'result';
  child=loaded.ui.bindScatteringReplay({root:view,replay,prefix:mode==='lesson'?'sar-lesson-view':'sar-result-view',stateStore:store,stateKey:'ui:'+caseKey,isCurrent:()=>active()&&content.querySelector('[data-sar-view]')===view,download});
  const selector=content.querySelector('#sar-host-case');if(selector)selector.onchange=()=>{if(!active()||content.querySelector('#sar-host-case')!==selector||!refs.some(row=>row.id===selector.value))return;state.caseId=selector.value;save();draw();};
  const copy=content.querySelector('#sar-host-copy');if(copy)copy.onclick=()=>{if(!active()||content.querySelector('#sar-host-copy')!==copy)return;const copied=onOpenLab({action:'dynamic_scattering_lab',module:'scattering',input:clone(selected.input)});if(active())content.querySelector('#sar-host-copy-status').textContent=copied===false?'参考输入尚未复制，请回到原实验检查。':'完整参考输入已复制，请在原实验中手动计算。';};
  save();
 }
 function start(){
  if(!active()||!readOpen(detail))return Promise.resolve();
  if(pending)return pending;
  if(loaded){draw();return Promise.resolve();}
  content.innerHTML='<p role="status">正在载入振幅推导…</p>';
  pending=(async()=>{
   try{const [ui,reference]=await Promise.all([Promise.resolve().then(()=>loadModule()),mode==='lesson'?Promise.resolve().then(()=>loadReferences()):Promise.resolve(null)]);if(!active())return;loaded={ui,references:reference?.SCATTERING_REPLAY_REFERENCE||reference};draw();}
   catch(error){if(active()){loaded=null;content.innerHTML='<p role="alert">振幅推导暂未载入。<button type="button" class="secondary" data-sar-retry>重试振幅推导</button></p>';content.querySelector('[data-sar-retry]').onclick=()=>{if(active())cleanup.ready=start();};}}
   finally{pending=null;}
  })();return pending;
 }
 detail.ontoggle=()=>{if(!active())return;state.open=readOpen(detail);save();if(state.open)cleanup.ready=start();};
 if(state.open){detail.open=true;cleanup.ready=start();}
 return cleanup;
}
