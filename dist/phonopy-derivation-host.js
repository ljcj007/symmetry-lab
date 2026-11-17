import {setPhonopyScatteringTeachingInput} from './phonopy-scattering-handoff.js?v=20261117-derive1';

export const PHONOPY_DERIVATION_LESSON='scattering-phase';
export const PHONOPY_DERIVATION_ROUTE='#classroom/observables?module=scattering&lesson=scattering-phase';
const lessonMemory=new Map();
let modulePromise=null;
const loadUI=()=>modulePromise??=import('./phonopy-derivation-ui.js?v=20261117-derive1').catch(error=>{modulePromise=null;throw error;});
const clone=value=>structuredClone(value);
const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
const navigate=route=>{if(globalThis.location)globalThis.location.hash=route;};

export function phonopyDerivationLessonHTML(lessonId){
 if(lessonId!==PHONOPY_DERIVATION_LESSON)return '';
 return '<section class="pdh-host" data-pdh-host><details data-pdh-disclosure><summary>从同一份 ZnO 文件推导两测点散射：计算、解释与改错</summary><p>把一维链的思路迁到真实三维原胞：先预测，再逐项构造复振幅，最后用第二测点检验公式。教学参考、自己的作答和专家计算分别保存。</p><div data-pdh-content></div><p><a href="docs/phonopy-derivation.md" target="_blank" rel="noopener">两测点推导的约定、来源与参考答案使用 ↗</a></p></details></section>';
}

export function phonopyDerivationLearningLinkHTML(){
 return '<aside class="obs-model-note"><h3>继续：同一份 ZnO 模式，两个测点怎样检验振幅？</h3><p>先核对原胞、质量反加权和相位，再到散射课逐项推导三维投影与原子复振幅。两测点帮助识别一个数值偶然相同仍未暴露的错误。</p><a href="'+PHONOPY_DERIVATION_ROUTE+'">进入原散射课的 ZnO 两测点推导工坊 →</a></aside>';
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
  if(typeof child!=='function')throw Error('三维推导界面未提供可安全关闭的课堂视图。');
 }
 function start(){
  if(!active()||!readOpen(detail))return Promise.resolve();
  if(pending)return pending;
  if(loaded){draw();return Promise.resolve();}
  content.innerHTML='<p role="status">正在准备 ZnO 两测点推导工坊…</p>';
  const owned=(async()=>{
   try{const ui=await Promise.resolve().then(()=>loadModule());if(!active())return;if(typeof ui?.bindPhonopyDerivationLesson!=='function')throw Error('三维推导界面尚未就绪。');loaded=ui;draw();}
   catch(error){if(!active()||!readOpen(detail))return;loaded=null;stopChild();content.innerHTML='<p role="alert">两测点推导暂未载入。<button type="button" class="secondary" data-pdh-retry>重试两测点推导</button></p>';const retry=content.querySelector('[data-pdh-retry]');retry.onclick=()=>{if(active()&&readOpen(detail)&&content.querySelector('[data-pdh-retry]')===retry)cleanup.ready=start();};}
   finally{pending=null;}
  })();
  pending=owned;return owned;
 }
 detail.ontoggle=()=>{if(!active())return;state.open=readOpen(detail);save();if(state.open)cleanup.ready=start();else stopChild();};
 if(state.open){detail.open=true;cleanup.ready=start();}
 return cleanup;
}
