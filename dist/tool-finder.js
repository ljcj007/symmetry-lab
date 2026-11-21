import {toolsIndex,searchEntries,favoriteRoutes,loadNavigationSearch} from './navigation-ui.js?v=20261122-quartzclass1';
import {normalizeSearchText,inputFormatSummary,searchCatalogEntries,matchNamedActivities} from './tool-search.js?v=20261122-activity1';
import {learningActivities} from './learning-activity-search.js?v=20261122-quartzclass1';
import {isFullMagneticGroupQuery} from './magnetic-group-query.js?v=20261121-msg-gamma1';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const finderScopes=['tools','all','courses','groups','materials'];
const kindFor={tools:'计算',courses:'课程',groups:'群目录',materials:'材料'};
const safeRoute=route=>typeof route==='string'&&/^[a-z0-9_/?=&.%+-]+$/i.test(route);
export const normalizeFinderText=normalizeSearchText;
const loadTopicModule=()=>import('./lesson-topic-finder.js?v=20261122-quartzclass1');
export function finderResults(entries,query,{scope='tools',limit=16}={}){
 const unique=[...new Map(entries.filter(x=>x&&safeRoute(x.route)&&typeof x.title==='string').map(x=>[x.route,x])).values()];
 const related=scope==='tools'?new Set(matchNamedActivities(unique,query)):null;
 const selected=scope==='all'?unique:unique.filter(x=>x.kind===kindFor[scope]||related?.has(x));
 const normalized=normalizeFinderText(query);
 if(!normalized)return scope==='tools'?selected.slice(0,limit):[];
 return scope==='groups'||scope==='all'
  ?searchCatalogEntries(selected,query,limit)
  :searchEntries(selected,query,limit);
}

export function startToolFinder({button,onNavigate,loadLessonTopic=loadTopicModule}){
 if(!button||typeof onNavigate!=='function')throw Error('查找入口需要导航按钮和打开操作。');
 const dialog=document.createElement('dialog');dialog.className='tool-finder';dialog.hidden=true;dialog.setAttribute('aria-labelledby','tool-finder-title');
 dialog.innerHTML=`<header class="tool-finder-header"><div><h2 id="tool-finder-title">快速查找</h2><p>直接打开工具，或查找课程、群与材料。</p></div><button type="button" data-finder-close aria-label="关闭快速查找">×</button></header>
 <label id="tool-finder-query-label" for="tool-finder-query">输入工具名称、文件名、问题或群编号</label><input id="tool-finder-query" type="search" autocomplete="off" placeholder="例如：band.yaml、CG、DMI、225" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="tool-finder-results">
 <div class="tool-finder-scopes" role="group" aria-label="查找范围">${[['tools','工具'],['all','全部'],['courses','课程'],['groups','群目录'],['materials','材料']].map(([id,title])=>`<button type="button" data-finder-scope="${id}" aria-pressed="${id==='tools'}">${title}</button>`).join('')}<button type="button" data-finder-topic-catalog hidden disabled>在本课程目录查找</button><button type="button" data-finder-topic-expand hidden disabled>查找全部课程</button></div>
 <p id="tool-finder-status" role="status"></p><div id="tool-finder-results" role="listbox" aria-label="查找结果"></div><footer>↑ ↓ 选择　Enter 打开　Esc 返回　Ctrl / ⌘ K 随时查找</footer>`;
 document.body.appendChild(dialog);
 const input=dialog.querySelector('#tool-finder-query'),list=dialog.querySelector('#tool-finder-results'),status=dialog.querySelector('#tool-finder-status');
 const scopeButtons=[...dialog.querySelectorAll('[data-finder-scope]')];
 const queryLabel=dialog.querySelector('#tool-finder-query-label'),expand=dialog.querySelector('[data-finder-topic-expand]');
 const catalogButton=dialog.querySelector('[data-finder-topic-catalog]');
 const courseButton=scopeButtons.find(control=>control.dataset.finderScope==='courses');
 const ordinaryCourseLabel=courseButton.textContent;
 const ordinaryLabel=queryLabel.textContent,ordinaryPlaceholder=input.getAttribute('placeholder');
 let opened=false,previousFocus=null,scope='tools',selected=0,results=[],extra=null,loading=false,failed=false,destroyed=false;
 let topic=null,topicModuleRequest=null;
 const preferred=()=>{const routes=[...favoriteRoutes(),'workbench','structure','products','compute/phonons','compute/tensors','magnetictb','compute/lie/su3_cg','compute/advanced/carat_integral'];return [...routes.map(route=>toolsIndex.find(x=>x.route===route)).filter(Boolean),...toolsIndex];};
 function highlight(){
  const options=[...list.querySelectorAll('[data-finder-result]')];
  options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===selected)));
  const active=options[selected];
  if(active){input.setAttribute('aria-activedescendant',active.id);active.scrollIntoView?.({block:'nearest'});}
  else input.removeAttribute('aria-activedescendant');
 }
 function render(){
  if(!opened||destroyed)return;
  const needsMagneticCatalog=!extra&&scope==='all'&&isFullMagneticGroupQuery(input.value);
  for(const button of scopeButtons)button.hidden=Boolean(topic)&&button.dataset.finderScope!=='courses';
  courseButton.textContent=topic?'本主题课程':ordinaryCourseLabel;
  courseButton.setAttribute('aria-pressed',String(topic?topic.range==='topic':scope==='courses'));
  expand.hidden=!topic?.data;expand.disabled=expand.hidden;
  expand.textContent=topic?.range==='all'?'返回本主题课程':'查找全部课程';
  catalogButton.hidden=!topic?.data||topic.range==='all'||topic.data.catalog.length===topic.data.topic.length;
  catalogButton.disabled=catalogButton.hidden;
  catalogButton.textContent=topic?.range==='catalog'?'返回本主题课程':'在本课程目录查找';
  queryLabel.textContent=topic?'输入课名或主题关键词':ordinaryLabel;
  input.setAttribute('placeholder',topic?'输入关键词，或直接选择课程':ordinaryPlaceholder);
  if(topic){
   const pool=topic.data?.[topic.range]||[];
   results=normalizeFinderText(input.value)?searchEntries(pool,input.value,16):pool.slice(0,16);
  }else results=needsMagneticCatalog?[]:finderResults([...preferred(),...learningActivities,...(extra||[])],input.value,{scope});
  selected=Math.min(selected,Math.max(0,results.length-1));
  list.innerHTML=results.length?results.map((item,index)=>{const purpose=inputFormatSummary(item,input.value);return `<button type="button" class="tool-finder-result" role="option" id="tool-finder-result-${index}" data-finder-result="${index}" tabindex="-1" aria-selected="${selected===index}"><span>${escapeHTML(item.current?'当前课':item.kind)}</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.topicLabel||item.summary)}</small>${purpose?`<small class="tool-finder-file-purpose"><strong>文件用途：</strong> ${escapeHTML(purpose)}</small>`:''}</button>`;}).join(''):needsMagneticCatalog?'':topic?(topic.data?'<p class="tool-finder-empty">在当前范围内没有匹配课程。</p>':''):`<p class="tool-finder-empty">${input.value.trim()?'没有匹配结果。试试工具缩写、材料名称或完整群编号。':'输入关键词后查找此类内容。'}</p>`;
  if(topic){
   if(topic.loading)status.textContent='正在读取课堂主题目录…';
   else if(topic.failed)status.innerHTML='课堂主题目录暂未载入。 <button type="button" data-finder-topic-retry>重试课程目录</button>';
   else if(!topic.data)status.textContent='请在具体课程中使用主题查找。';
   else if(topic.range==='all')status.textContent=`在全部 ${topic.data.all.length} 课中查找，显示 ${results.length} 项（最多 16 项）。`;
   else if(topic.range==='catalog')status.textContent=`${topic.data.catalogTitle} · 本目录共 ${topic.data.catalog.length} 课，显示 ${results.length} 项（最多 16 项）。`;
   else status.textContent=`当前课 · ${topic.data.title} · 本主题共 ${topic.data.topic.length} 课。当前显示 ${results.length}`;
  }else if(scope==='tools')status.textContent=input.value.trim()?`找到 ${results.length} 项结果（最多显示 16 项）`:'常用工具与收藏；直接选择即可打开。';
  else if(loading)status.textContent='正在读取精简目录；不会启动计算。';
  else if(failed)status.innerHTML='目录暂不可用。工具仍可在“工具”范围查找。 <button type="button" data-finder-retry>重试目录</button>';
  else if(!extra)status.textContent='输入关键词后按需读取课程、群与材料目录。';
  else status.textContent=`找到 ${results.length} 项（最多显示 16 项）`;
  status.querySelector('[data-finder-retry]')?.addEventListener('click',()=>{failed=false;load();});
  const pendingTopic=topic;
  status.querySelector('[data-finder-topic-retry]')?.addEventListener('click',()=>{
   if(topic===pendingTopic){input.focus();void loadTopic(pendingTopic);}
  });
  highlight();
 }
 async function load(){
  if(topic||loading||extra||failed||destroyed||scope==='tools'||!input.value.trim())return;
  loading=true;failed=false;render();
  try{extra=await loadNavigationSearch();}
  catch{failed=true;}
  finally{loading=false;render();}
 }
 function close(){
  if(!opened)return;opened=false;topic=null;input.setAttribute('aria-expanded','false');
  if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
  dialog.hidden=true;
  if(previousFocus?.isConnected!==false)previousFocus?.focus?.();
 }
 function updateScopeButtons(){
  scopeButtons.forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.finderScope===scope)));
 }
 function openAt(nextScope,trigger){
  if(!opened)previousFocus=trigger||document.activeElement;
  else if(trigger)previousFocus=trigger;
  scope=nextScope;input.value='';selected=0;input.setAttribute('aria-expanded','true');
  updateScopeButtons();
  if(!opened){
   opened=true;dialog.hidden=false;
   if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.setAttribute('open','');dialog.setAttribute('aria-modal','true');}
  }
  render();input.focus();
 }
 function open(){
  if(destroyed)return;
  if(opened){input.focus();return;}
  topic=null;
  openAt('tools');
 }
 async function loadTopic(request){
  if(!opened||destroyed||topic!==request||request.loading)return false;
  request.loading=true;request.failed=false;render();
  const owns=()=>opened&&!destroyed&&topic===request;
  try{
   if(!topicModuleRequest)topicModuleRequest=Promise.resolve().then(loadLessonTopic).catch(error=>{
    topicModuleRequest=null;
    throw error;
   });
   const module=await topicModuleRequest;
   if(!owns())return false;
   request.data=module.lessonTopicForRoute(request.route);
   return Boolean(request.data);
  }catch{
   if(owns())request.failed=true;
   return false;
  }finally{
   request.loading=false;
   if(owns())render();
  }
 }
 function openLessonTopic(context,trigger){
  const route=typeof context?.route==='string'?context.route.replace(/^#/,''):'';
  if(destroyed||!route.startsWith('classroom/')||!safeRoute(route))return Promise.resolve(false);
  const request={route,range:'topic',data:null,loading:true,failed:false};
  topic=request;openAt('courses',trigger);
  request.loading=false;
  return loadTopic(request);
 }
 function choose(index){const entry=results[index];if(!entry)return;close();onNavigate(entry.route);}
 const keyboard=event=>{
  if((event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='k'){event.preventDefault();open();return;}
  if(!opened)return;
  if(event.key==='Escape'){event.preventDefault();close();}
  else if(['ArrowDown','ArrowUp'].includes(event.key)&&document.activeElement===input){event.preventDefault();if(results.length)selected=(selected+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;highlight();}
  else if(event.key==='Enter'&&document.activeElement===input){event.preventDefault();choose(selected);}
  else if(event.key==='Tab'){
   const focusable=[...dialog.querySelectorAll('button,input')].filter(x=>!x.disabled&&!x.hidden&&x.getAttribute('tabindex')!=='-1');
   const first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 };
 const clickButton=()=>open();
 input.addEventListener('input',()=>{selected=0;render();load();});
 scopeButtons.forEach(x=>x.addEventListener('click',()=>{
  scope=x.dataset.finderScope;
  if(scope!=='courses')topic=null;
  else if(topic)topic.range='topic';
  selected=0;updateScopeButtons();render();load();input.focus();
 }));
 for(const [control,range] of [[catalogButton,'catalog'],[expand,'all']]){
  control.addEventListener('click',()=>{
   if(!opened||control.hidden||!topic?.data)return;
   topic.range=topic.range===range?'topic':range;
   selected=0;render();input.focus();
  });
 }
 dialog.addEventListener('click',event=>{if(event.target===dialog){close();return;}const result=event.target.closest('[data-finder-result]');if(result)choose(Number(result.dataset.finderResult));});
 dialog.querySelector('[data-finder-close]').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 button.addEventListener('click',clickButton);document.addEventListener('keydown',keyboard);
 return {openLessonTopic,destroy(){close();destroyed=true;button.removeEventListener('click',clickButton);document.removeEventListener('keydown',keyboard);dialog.remove();}};
}
