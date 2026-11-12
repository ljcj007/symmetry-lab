import {toolsIndex,searchEntries,favoriteRoutes,loadNavigationSearch} from './navigation-ui.js?v=20261112-basics3';
import {normalizeSearchText} from './tool-search.js?v=20261112-links1';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const finderScopes=['tools','all','courses','groups','materials'];
const kindFor={tools:'计算',courses:'课程',groups:'群目录',materials:'材料'};
const safeRoute=route=>typeof route==='string'&&/^[a-z0-9_/?=&.%+-]+$/i.test(route);
export const normalizeFinderText=normalizeSearchText;
export function finderResults(entries,query,{scope='tools',limit=16}={}){
 const unique=[...new Map(entries.filter(x=>x&&safeRoute(x.route)&&typeof x.title==='string').map(x=>[x.route,x])).values()];
 const selected=scope==='all'?unique:unique.filter(x=>x.kind===kindFor[scope]);
 const normalized=normalizeFinderText(query);
 if(!normalized)return scope==='tools'?selected.slice(0,limit):[];
 const searchable=selected.map(x=>({...x,title:normalizeFinderText(x.title),summary:normalizeFinderText(x.summary),keywords:normalizeFinderText(x.keywords),original:x}));
 const found=searchEntries(searchable,normalized,selected.length);
 const numeric=/^\d+$/.test(normalized),exactGroup=x=>numeric&&x.original.route==='atlas/sg?q='+encodeURIComponent(normalized);
 return found.sort((a,b)=>Number(exactGroup(b))-Number(exactGroup(a))).slice(0,limit).map(x=>x.original);
}

export function startToolFinder({button,onNavigate}){
 if(!button||typeof onNavigate!=='function')throw Error('查找入口需要导航按钮和打开操作。');
 const dialog=document.createElement('dialog');dialog.className='tool-finder';dialog.hidden=true;dialog.setAttribute('aria-labelledby','tool-finder-title');
 dialog.innerHTML=`<header class="tool-finder-header"><div><h2 id="tool-finder-title">快速查找</h2><p>直接打开工具，或查找课程、群与材料。</p></div><button type="button" data-finder-close aria-label="关闭快速查找">×</button></header>
 <label for="tool-finder-query">输入工具名称、问题或群编号</label><input id="tool-finder-query" type="search" autocomplete="off" placeholder="例如：CG、Clebsch-Gordan、DMI、225" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="tool-finder-results">
 <div class="tool-finder-scopes" role="group" aria-label="查找范围">${[['tools','工具'],['all','全部'],['courses','课程'],['groups','群目录'],['materials','材料']].map(([id,title])=>`<button type="button" data-finder-scope="${id}" aria-pressed="${id==='tools'}">${title}</button>`).join('')}</div>
 <p id="tool-finder-status" role="status"></p><div id="tool-finder-results" role="listbox" aria-label="查找结果"></div><footer>↑ ↓ 选择　Enter 打开　Esc 返回　Ctrl / ⌘ K 随时查找</footer>`;
 document.body.appendChild(dialog);
 const input=dialog.querySelector('#tool-finder-query'),list=dialog.querySelector('#tool-finder-results'),status=dialog.querySelector('#tool-finder-status');
 const scopeButtons=[...dialog.querySelectorAll('[data-finder-scope]')];
 let opened=false,previousFocus=null,scope='tools',selected=0,results=[],extra=null,loading=false,failed=false,destroyed=false;
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
  results=finderResults([...preferred(),...(extra||[])],input.value,{scope});
  selected=Math.min(selected,Math.max(0,results.length-1));
  list.innerHTML=results.length?results.map((item,index)=>`<button type="button" class="tool-finder-result" role="option" id="tool-finder-result-${index}" data-finder-result="${index}" tabindex="-1" aria-selected="${selected===index}"><span>${escapeHTML(item.kind)}</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.summary)}</small></button>`).join(''):`<p class="tool-finder-empty">${input.value.trim()?'没有匹配结果。试试工具缩写、材料名称或完整群编号。':'输入关键词后查找此类内容。'}</p>`;
  if(scope==='tools')status.textContent=input.value.trim()?`找到 ${results.length} 项工具（最多显示 16 项）`:'常用工具与收藏；直接选择即可打开。';
  else if(loading)status.textContent='正在读取精简目录；不会启动计算。';
  else if(failed)status.innerHTML='目录暂不可用。工具仍可在“工具”范围查找。 <button type="button" data-finder-retry>重试目录</button>';
  else if(!extra)status.textContent='输入关键词后按需读取课程、群与材料目录。';
  else status.textContent=`找到 ${results.length} 项（最多显示 16 项）`;
  status.querySelector('[data-finder-retry]')?.addEventListener('click',()=>{failed=false;load();});
  highlight();
 }
 async function load(){
  if(loading||extra||failed||destroyed||scope==='tools'||!input.value.trim())return;
  loading=true;failed=false;render();
  try{extra=await loadNavigationSearch();}
  catch{failed=true;}
  finally{loading=false;render();}
 }
 function close(){
  if(!opened)return;opened=false;input.setAttribute('aria-expanded','false');
  if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
  dialog.hidden=true;
  if(previousFocus?.isConnected!==false)previousFocus?.focus?.();
 }
 function open(){
  if(destroyed)return;
  if(opened){input.focus();return;}
  previousFocus=document.activeElement;opened=true;scope='tools';input.value='';selected=0;input.setAttribute('aria-expanded','true');
  scopeButtons.forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.finderScope===scope)));
  dialog.hidden=false;
  if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.setAttribute('open','');dialog.setAttribute('aria-modal','true');}
  render();input.focus();
 }
 function choose(index){const entry=results[index];if(!entry)return;close();onNavigate(entry.route);}
 const keyboard=event=>{
  if((event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='k'){event.preventDefault();open();return;}
  if(!opened)return;
  if(event.key==='Escape'){event.preventDefault();close();}
  else if(['ArrowDown','ArrowUp'].includes(event.key)&&document.activeElement===input){event.preventDefault();if(results.length)selected=(selected+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;highlight();}
  else if(event.key==='Enter'&&document.activeElement===input){event.preventDefault();choose(selected);}
  else if(event.key==='Tab'){
   const focusable=[...dialog.querySelectorAll('button,input')].filter(x=>!x.disabled&&x.getAttribute('tabindex')!=='-1');
   const first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 };
 const clickButton=()=>open();
 input.addEventListener('input',()=>{selected=0;render();load();});
 scopeButtons.forEach(x=>x.addEventListener('click',()=>{scope=x.dataset.finderScope;selected=0;scopeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===x)));render();load();input.focus();}));
 dialog.addEventListener('click',event=>{if(event.target===dialog){close();return;}const result=event.target.closest('[data-finder-result]');if(result)choose(Number(result.dataset.finderResult));});
 dialog.querySelector('[data-finder-close]').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 button.addEventListener('click',clickButton);document.addEventListener('keydown',keyboard);
 return {destroy(){close();destroyed=true;button.removeEventListener('click',clickButton);document.removeEventListener('keydown',keyboard);dialog.remove();}};
}
