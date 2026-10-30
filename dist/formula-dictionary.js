// A read-only companion to the formula renderer; never rewrites source math.
import {mathHTML} from './math-display.js?v=20261030-bridges1';
import {segmentFormula,findInlineMath} from './math-notation.js?v=20261030-bridges1';
const RELEASE='20261030-bridges1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const selector='span.sl-math[data-math-source],.sl-equation[data-math-source],svg text[aria-label]';
const interactive='button,a,input,select,textarea,code,[contenteditable="true"],[data-math-ignore],.fd-dialog,.fd-page';
const letters=/[\p{L}\p{N}]/u;
const texNames={Gamma:'Γ',Delta:'Δ',Omega:'Ω',Sigma:'Σ',Theta:'Θ',alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',lambda:'λ',mu:'μ',sigma:'σ',omega:'ω',rho:'ρ',chi:'χ',hbar:'ℏ',otimes:'⊗'};
export function normalizeDictionaryText(value){
 // Keep the physical distinction between relaxation T_2 and time reversal T².
 // Protect it before NFKC folds Unicode subscripts and superscripts to digits.
 const typed=String(value??'').replace(/(?<![A-Za-z])T(?:_\{?([12])\}?|([₁₂]))/gu,(_,digit,unicode)=>'Tsub'+(digit||(unicode==='₁'?'1':'2'))).replace(/(?<![A-Za-z])T(?:\^\{?2\}?|²)/gu,'Tsup2');
 // Latin search remains case-insensitive. Greek case is physical notation:
 // Γ/γ (wavevector centre/rate), Ω/ω (curvature or drive/frequency), Δ/δ.
 return typed.normalize('NFKC').replace(/\\([A-Za-z]+)/g,(all,name)=>texNames[name]||(['mathrm','mathbf','mathcal','operatorname','text'].includes(name)?'':name)).replace(/[\s_{}^]/g,'').replace(/[−–]/g,'-').replace(/[A-Z]/g,c=>c.toLowerCase());
}
function includesSymbol(text,symbol){
 const s=normalizeDictionaryText(text),token=normalizeDictionaryText(symbol);if(!token)return false;
 let at=s.indexOf(token);while(at>=0){
  const before=s[at-1]||'',after=s[at+token.length]||'';
  if(!(letters.test(token[0])&&letters.test(before))&&!(letters.test(token.at(-1))&&letters.test(after)))return true;
  at=s.indexOf(token,at+1);
 }return false;
}
const contextScore=(entry,route,context)=>Math.max(0,...(entry.contexts||[]).map(word=>{
 const token=normalizeDictionaryText(word);return token&&normalizeDictionaryText(route).includes(token)?16:token&&normalizeDictionaryText(context).includes(token)?5:0;
}));

// Ambiguous single letters are separate senses, selected only with evidence.
export function resolveFormulaEntries(source,{route='',context='',kind=''}={},catalog={entries:[]}){
 const exact=normalizeDictionaryText(source),rows=[];
 for(const entry of catalog.entries||[]){
  const syntaxHit=entry.syntax==='seitz'&&/\{[^{}|]+\|[^{}]+\}/.test(String(source));
  if(['hm','schoenflies','operation','irrep'].includes(kind)&&!entry.kinds?.includes(kind)&&!(kind==='operation'&&syntaxHit))continue;
  if(kind&&entry.kinds?.length&&!entry.kinds.includes(kind))continue;
  const symbols=entry.symbols||[];
  const exactHit=symbols.some(s=>normalizeDictionaryText(s)===exact);
  const symbolHit=symbols.some(s=>includesSymbol(source,s));
  const formulaHit=syntaxHit||(entry.formulaAliases||[]).some(s=>normalizeDictionaryText(source).includes(normalizeDictionaryText(s)));
  const typed=(entry.kinds||[]).includes(kind)?12:0;
  if(!exactHit&&!symbolHit&&!formulaHit&&!typed)continue;
  const contextual=contextScore(entry,route,context);
  if(entry.requiresContext&&!contextual&&!formulaHit&&!typed)continue;
  rows.push({entry,score:(exactHit?20:formulaHit?12:8)+contextual+typed,contextual,exactHit});
 }
 const matches=[],ambiguous=[],groups=new Map();
 for(const row of rows){if(row.entry.ambiguity){const list=groups.get(row.entry.ambiguity)||[];list.push(row);groups.set(row.entry.ambiguity,list);}else matches.push(row);}
 for(const [symbol,group]of groups){
  group.sort((a,b)=>b.score-a.score);
  if(group.length===1||group[0].score>group[1].score)matches.push(group[0]);
  else ambiguous.push({symbol,entries:group.filter(r=>r.score===group[0].score).map(r=>r.entry)});
 }
 matches.sort((a,b)=>b.score-a.score||a.entry.id.localeCompare(b.entry.id));
 return {matches:matches.map(r=>r.entry),ambiguous,unknown:!matches.length&&!ambiguous.length};
}

export function searchDictionary(query,catalog={entries:[]}){
 const tokens=String(query??'').trim().split(/\s+/).filter(Boolean).map(normalizeDictionaryText);
 if(!tokens.length)return [...(catalog.entries||[])];
 return (catalog.entries||[]).map(entry=>{
  const haystack=normalizeDictionaryText([entry.title,entry.definition,entry.conventions,entry.conditions,...(entry.symbols||[]),...(entry.aliases||[]),...(entry.contexts||[]),...(entry.variables||[]).flatMap(v=>[v.symbol,v.meaning,v.unit])].join(' '));
  const exact=tokens.some(q=>(entry.symbols||[]).some(s=>normalizeDictionaryText(s)===q));
  return {entry,match:tokens.every(t=>haystack.includes(t)),score:exact?10:0};
 }).filter(r=>r.match).sort((a,b)=>b.score-a.score||a.entry.title.localeCompare(b.entry.title,'zh-CN')).map(r=>r.entry);
}

let pendingCatalog;
export function loadFormulaDictionary(){
 if(!pendingCatalog)pendingCatalog=fetch(new URL('./data/formula-dictionary.json?v='+RELEASE,import.meta.url)).then(response=>{
  if(!response.ok)throw new Error('词典暂时未能载入，请重试。');return response.json();
 }).then(data=>{if(!Array.isArray(data.entries)||!Array.isArray(data.sources))throw new Error('词典格式不完整。');return data;}).catch(error=>{pendingCatalog=null;throw error;});
 return pendingCatalog;
}
export function safeDictionaryHref(value,external=false){
 const s=String(value??'');if(external){try{const url=new URL(s);return url.protocol==='https:'&&!url.username&&!url.password?s:null;}catch{return null;}}
 return /^#[A-Za-z0-9][^\s<>"'\\]*$/.test(s)?s:null;
}
const linksHTML=links=>(links||[]).map(([label,url])=>{const href=safeDictionaryHref(url);return href?`<a href="${esc(href)}">${esc(label)} →</a>`:'';}).join('');
// These display aliases are dictionary-specific, not changes to the parser or
// to source records. Each wrapper retains the original spelling for copy/export.
const displayNotation=s=>String(s??'').replace(/\bk([xyz])\b/g,'k_$1').replace(/k([xyz])(?=[)）])/g,'k_$1').replace(/λ±/g,'λ_{±}').replace(/Γ([LR])\b/g,'Γ_$1');
export function dictionaryNotationHTML(source,{symbol=false}={}){
 const raw=String(source??''),display=displayNotation(raw);
 const wordOnly=/^[A-Za-z][A-Za-z -]{3,}$/.test(display)&&!['tanh','exp','sin','cos'].includes(display);
 const segments=symbol&&!wordOnly?segmentFormula(display):findInlineMath(display);
 const html=segments.map(part=>{
  if(part.type!=='math'||!part.tex)return esc(part.source);
  try{return `<span class="sl-math" data-math-source="${esc(part.source)}">${mathHTML(part.tex)}</span>`;}catch{return esc(part.source);}
 }).join('');
 return `<span class="fd-notation" data-math-source="${esc(raw)}">${html}</span>`;
}
const symbolList=entry=>[...new Map((entry.symbols||[]).map(s=>[normalizeDictionaryText(s),s])).values()];
export function dictionaryEntryHTML(entry,catalog,{compact=false}={}){
 const refs=new Map((catalog.sources||[]).map(s=>[s.id,s]));
 const head=`<h3>${dictionaryNotationHTML(entry.title)}</h3><p class="fd-symbols">${symbolList(entry).map(s=>`<span class="fd-symbol">${dictionaryNotationHTML(s,{symbol:true})}</span>`).join(' ')}</p>`;
 const body=`<p>${dictionaryNotationHTML(entry.definition)}</p>${(entry.variables||[]).length?`<dl class="fd-variables">${entry.variables.map(v=>`<div><dt>${dictionaryNotationHTML(v.symbol,{symbol:true})}</dt><dd>${dictionaryNotationHTML(v.meaning)}<span class="fd-unit">单位：${dictionaryNotationHTML(v.unit||'依模块约定')}</span></dd></div>`).join('')}</dl>`:''}<p><strong>约定：</strong>${dictionaryNotationHTML(entry.conventions||'请以当前模块标明的约定为准。')}</p><p><strong>适用条件：</strong>${dictionaryNotationHTML(entry.conditions||'仅在当前模块声明的模型范围内使用。')}</p><div class="fd-links">${linksHTML(entry.links)}</div><div class="fd-sources">${(entry.sources||[]).map(id=>{const s=refs.get(id),href=s&&safeDictionaryHref(s.url,true);return href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:'';}).join('')}</div>`;
 return compact?`<details class="fd-entry"><summary>${dictionaryNotationHTML(entry.title)} <span class="fd-summary-symbols">${symbolList(entry).slice(0,3).map(s=>dictionaryNotationHTML(s,{symbol:true})).join(' · ')}</span></summary>${body}</details>`:`<article class="fd-entry">${head}${body}</article>`;
}
const sourceHTML=source=>`<section class="fd-original"><h3>公式原文</h3><pre data-math-ignore>${esc(source)}</pre></section>`;
const resultHTML=(source,scope,catalog)=>{
 const resolved=resolveFormulaEntries(source,scope,catalog);
 return `${resolved.unknown?'<p class="fd-notice">暂未识别这段公式的可靠释义。原文已保留，请搜索关键词或进入相关课堂核对。</p>':''}${resolved.matches.map(e=>dictionaryEntryHTML(e,catalog)).join('')}${resolved.ambiguous.map(group=>`<section class="fd-ambiguity"><h3>${esc(group.symbol)} 有多个可能含义</h3><p>当前页面和公式不足以唯一确定，请根据所用模型选择；这里不自动指定。</p>${group.entries.map(e=>dictionaryEntryHTML(e,catalog,{compact:true})).join('')}</section>`).join('')}`;
};

export function renderFormulaDictionary({container,selection={}}={}){
 if(!container)throw new Error('词典需要一个页面容器');
 let active=true,form=null,input=null,onInput=null,retryController=null;
 const query=String(selection.q??selection.query??'').slice(0,1000);
 container.innerHTML='<section class="fd-page"><h1>公式与符号词典</h1><p role="status">正在载入定义、单位与约定…</p></section>';
 const ready=loadFormulaDictionary().then(catalog=>{
  if(!active)return;
  container.innerHTML=`<section class="fd-page"><header><span class="eyebrow">FORMULA DICTIONARY</span><h1>公式与符号词典</h1><p>搜索符号、公式或概念。相同字母可以代表不同物理量；每个词条同时列出约定、适用条件和来源。</p></header><form class="fd-search" role="search"><label for="fd-dictionary-query">符号、公式或关键词</label><div><input id="fd-dictionary-query" type="search" value="${esc(query)}" maxlength="1000" placeholder="例如 k、U、螺旋相位、S(Q,ω)" autocomplete="off"><button type="submit">搜索</button></div></form><p class="fd-count" role="status" aria-live="polite"></p><div class="fd-search-results"></div></section>`;
  form=container.querySelector('form');input=container.querySelector('input');
  const output=container.querySelector('.fd-search-results'),count=container.querySelector('.fd-count');
  onInput=event=>{event?.preventDefault();const results=searchDictionary(input.value,catalog);count.textContent=`找到 ${results.length} 个词条。展开查看单位、约定与适用条件。`;output.innerHTML=results.length?results.map(e=>dictionaryEntryHTML(e,catalog,{compact:true})).join(''):'<p class="fd-notice">没有可靠匹配。可改用概念名，或缩短搜索词。</p>';};
  form.addEventListener('submit',onInput);input.addEventListener('input',onInput);onInput();
 }).catch(error=>{if(active){container.innerHTML=`<section class="fd-page"><h1>公式与符号词典</h1><p role="alert">${esc(error.message)}</p><button type="button" class="fd-retry">重新载入</button></section>`;container.querySelector('button').onclick=()=>{if(active){retryController?.destroy();retryController=renderFormulaDictionary({container,selection});}};}});
 return {ready,destroy(){active=false;retryController?.destroy();form?.removeEventListener('submit',onInput);input?.removeEventListener('input',onInput);}};
}

export function formulaDictionarySource(element){return element?.dataset?.mathSource??element?.getAttribute?.('aria-label')??element?.textContent??'';}
function eligible(element,root){
 if(!element?.matches?.(selector)||element.closest(interactive)||!root.contains(element))return false;
 if(element.parentElement?.closest(selector))return false; // one focus stop per formula block
 if(element.tagName?.toLowerCase()==='text'&&element.dataset?.mathSource===undefined&&!/[=Σ∑∫√⊗·ΓΔλΩχσ_{}^₀-₉]/u.test(formulaDictionarySource(element)))return false;
 return !!String(formulaDictionarySource(element)).trim();
}
function scopeFor(element){
 const parent=element.closest('[data-module],[data-route],[data-view]');
 const block=element.closest('.sl-equation[data-math-source]');
 return {route:(globalThis.location?.hash||'')+' '+(parent?.dataset?.module||'')+' '+(parent?.dataset?.route||'')+' '+(parent?.dataset?.view||''),context:block?.dataset?.mathSource||'',kind:element.dataset?.crystalKind||''};
}

export function startFormulaDictionary(root=document.body){
 if(!root?.addEventListener)throw new Error('公式词典需要一个文档容器');
 const records=new Map();let stopped=false,queued=false,job=0,invoker=null,opened=false;
 let dialog=null,content=null;
 const restore=element=>{const old=records.get(element);if(!old)return;for(const [name,value]of old)value===null?element.removeAttribute(name):element.setAttribute(name,value);records.delete(element);};
 const decorate=element=>{
  if(!eligible(element,root)||records.has(element))return;
  const attrs=['tabindex','role','aria-haspopup','aria-description','data-fd-trigger'];
  records.set(element,attrs.map(a=>[a,element.getAttribute(a)]));
  if(!element.hasAttribute('tabindex')||Number(element.getAttribute('tabindex'))<0)element.setAttribute('tabindex','0');
  element.setAttribute('role','button');element.setAttribute('aria-haspopup','dialog');element.setAttribute('aria-description','打开公式与符号释义');element.setAttribute('data-fd-trigger','true');
 };
 const scan=node=>{if(stopped||!node?.querySelectorAll||node.closest?.('.fd-dialog,.fd-page,[data-math-ignore]'))return;decorate(node);for(const el of node.querySelectorAll(selector))decorate(el);};
 const close=()=>{job++;opened=false;if(dialog?.open&&dialog.close)dialog.close();else dialog?.removeAttribute('open');if(invoker?.isConnected)invoker.focus();};
 const ensureDialog=()=>{
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='fd-dialog';dialog.setAttribute('aria-labelledby','fd-dialog-title');
  dialog.innerHTML='<header class="fd-dialog-heading"><h2 id="fd-dialog-title">公式与符号释义</h2><button type="button" class="fd-close" aria-label="关闭公式释义">关闭 ×</button></header><div class="fd-dialog-content"></div>';
  root.appendChild(dialog);content=dialog.querySelector('.fd-dialog-content');dialog.querySelector('.fd-close').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{opened=false;job++;if(invoker?.isConnected)invoker.focus();});
  dialog.addEventListener('click',event=>{if(event.target.closest('a[href^="#"]'))close();});
 };
 const show=async(element)=>{
  ensureDialog();invoker=element;const current=++job,source=String(formulaDictionarySource(element)),scope=scopeFor(element);opened=true;
  const linked=element.closest?.('[data-formula-context]')?.querySelector('.br-current-values');
  const linkedText=linked?Array.from(linked.querySelectorAll('tr')).map(row=>Array.from(row.querySelectorAll('td')).map(cell=>cell.textContent.trim()).join('：')).filter(Boolean).join('\n'):'';
  const calculationContext=linked?`<section class="fd-linked-values"><h3>当前计算中的取值</h3><p>${esc(linkedText.slice(0,6000))}</p><p>对应图形已高亮；关闭释义后可查看。这里的数值只属于当前这次计算。</p></section>`:'';
  content.innerHTML=sourceHTML(source)+'<p role="status">正在查找相关定义…</p>';
  if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}
  dialog.querySelector('.fd-close').focus();
  try{const catalog=await loadFormulaDictionary();if(stopped||!opened||current!==job)return;
   content.innerHTML=sourceHTML(source)+calculationContext+resultHTML(source,scope,catalog)+`<p class="fd-dialog-search"><a href="#docs/dictionary?q=${esc(encodeURIComponent(source))}">在词典中搜索这段公式 →</a></p>`;
  }catch(error){if(!stopped&&opened&&current===job){content.innerHTML=sourceHTML(source)+`<p role="alert">${esc(error.message)}</p><button type="button" class="fd-dialog-retry">重试查词</button><p><a href="#docs/dictionary">打开词典搜索页 →</a></p>`;content.querySelector('button').onclick=()=>show(element);}}
 };
 const targetFor=event=>{const el=event.target?.closest?.('[data-fd-trigger]');return el&&eligible(el,root)?el:null;};
 const onClick=event=>{if(event.defaultPrevented)return;const el=targetFor(event);if(el){event.preventDefault();show(el);}};
 const onKey=event=>{
  if(event.key==='Escape'&&opened){event.preventDefault();close();return;}
  if((event.key==='Enter'||event.key===' ')&&!event.repeat){const el=targetFor(event);if(el){event.preventDefault();show(el);}}
 };
 const pending=new Set();
 const observer=new MutationObserver(changes=>{
  for(const change of changes){if(change.target?.closest?.('.fd-dialog,.fd-page,[data-math-ignore]'))continue;
   if(change.target?.matches?.(selector))pending.add(change.target);
   for(const node of change.addedNodes||[])if(node.nodeType===1)pending.add(node);
  }
  if(!queued&&pending.size){queued=true;queueMicrotask(()=>{queued=false;if(stopped)return;for(const el of records.keys())if(!root.contains(el))restore(el);for(const el of pending)scan(el);pending.clear();});}
 });
 scan(root);root.addEventListener('click',onClick);root.addEventListener('keydown',onKey);observer.observe(root,{childList:true,subtree:true});
 return ()=>{stopped=true;observer.disconnect();pending.clear();root.removeEventListener('click',onClick);root.removeEventListener('keydown',onKey);close();dialog?.remove();for(const el of [...records.keys()])restore(el);};
}
