import katex from "../vendor/katex/katex.mjs";
import {segmentFormula,findInlineMath} from './math-notation.js?v=20261110-en1';
import {svgMathText,layoutSvgMath} from './math-svg.js?v=20261110-en1';
import {crystalTex} from './crystal-notation.js?v=20261110-en1';

const blocks='.pg-formula,.sc-formula,.lg-formula,.obs-formula,[data-math-block]';
const owned='.sl-math,.sl-inline-text,.katex,math,[data-math-ignore],.crystal-symbol[data-crystal-ready]';
const excluded='script,style,textarea,input,select,option,pre,code,kbd,samp,svg,math,[contenteditable="true"],[data-math-ignore],.research-input,.exact-expression';
const opts={throwOnError:true,trust:false,strict:'ignore',output:'htmlAndMathml',maxExpand:1000,maxSize:20};

export function mathHTML(tex,display=false){return katex.renderToString(tex,{...opts,displayMode:display});}

// Use original notation for record titles instead of KaTeX's HTML + MathML text.
export function mathSourceText(node){
 if(!node)return '';
 if(node.dataset?.mathSource!==undefined)return node.dataset.mathSource;
 if(node.nodeType===3)return node.nodeValue||'';
 return [...(node.childNodes||[])].map(mathSourceText).join('');
}

function appendSegments(target,segments,display=false){
 for(const s of segments){
  if(s.type==='math'&&s.tex){
   const span=document.createElement('span');span.className='sl-math';span.dataset.mathSource=s.source;
   try{span.innerHTML=mathHTML(s.tex,display);target.appendChild(span);}
   catch(error){span.className='sl-math-fallback';span.textContent=s.source;span.dataset.mathError=String(error.message);target.appendChild(span);}
  }else target.appendChild(document.createTextNode(s.source));
 }
}

// Keep a wide inline expression intact, on its own scrollable line. Applying
// overflow to every inline formula would change the baseline of short symbols.
export function layoutMathOverflow(root){
 if(!root?.querySelectorAll)return 0;
 const all=selector=>[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
 for(const el of all('.sl-math-scroll'))el.classList.remove('sl-math-scroll');
 for(const el of all('.sl-math')){
  if(el.closest('.sl-equation')||!el.clientWidth)continue;
  // Percent max-width on an inline parent can be indefinite. Compare against
  // the nearest actual content box as well as the element's own scroll width.
  let available=Infinity;
  for(let parent=el.parentElement;parent;parent=parent.parentElement){
   const style=getComputedStyle(parent);
   if(style.display==='inline'||style.display==='contents'||!parent.clientWidth)continue;
   available=parent.clientWidth-parseFloat(style.paddingLeft||0)-parseFloat(style.paddingRight||0);break;
  }
  if(el.scrollWidth>el.clientWidth+2||el.getBoundingClientRect().width>available+2)el.classList.add('sl-math-scroll');
 }
 let count=0;
 for(const el of all('.sl-equation,.sl-math-scroll,[data-math-overflow]')){
  const wide=el.clientWidth>0&&el.scrollWidth>el.clientWidth+2;
  if(wide){
   el.dataset.mathOverflow='true';
   if(!el.hasAttribute('tabindex')){el.tabIndex=0;el.dataset.mathScrollFocus='true';}
   count++;
  }else{
   delete el.dataset.mathOverflow;
   if(el.dataset.mathScrollFocus){if(!el.hasAttribute('data-fd-trigger'))el.removeAttribute('tabindex');delete el.dataset.mathScrollFocus;}
  }
 }
 return count;
}

export function typesetMath(root=document.body){
 if(!root?.isConnected||root.nodeType!==1||root.closest(owned))return;
 for(const el of [...(root.matches('[data-crystal-kind]')?[root]:[]),...root.querySelectorAll('[data-crystal-kind]')]){
  if(el.dataset.crystalReady)continue;const source=el.dataset.mathSource??el.textContent;
  el.dataset.crystalReady='true';el.setAttribute('aria-label',source);
  if(el.dataset.crystalKind==='literal')continue;
  const tex=crystalTex(source,el.dataset.crystalKind,{fullbar:el.dataset.crystalFullbar==='true'});
  if(tex){try{el.innerHTML=mathHTML(tex);el.classList.add('sl-math');}catch(error){el.dataset.crystalError=error.message;}}
  else {el.dataset.crystalFallback='true';const fragment=document.createDocumentFragment();appendSegments(fragment,segmentFormula(source));el.replaceChildren(fragment);}
 }
 const candidates=[...(root.matches(blocks)?[root]:[]),...root.querySelectorAll(blocks)];
 for(const el of candidates){
  if(el.dataset.mathReady||el.querySelector('math,.katex')||el.closest('[data-math-ignore]'))continue;
  const source=el.textContent;el.dataset.mathReady='true';el.dataset.mathSource=source;
  const fragment=document.createDocumentFragment();
  const row=document.createElement('div');row.className='sl-equation-line';appendSegments(row,segmentFormula(source),false);fragment.appendChild(row);
  el.replaceChildren(fragment);el.classList.add('sl-equation');
 }
 // SVG uses native tspans rather than HTML math, so exported figures remain SVG.
 for(const el of [...(root.matches('svg text')?[root]:[]),...root.querySelectorAll('svg text')]){
  if(el.dataset.mathReady||el.querySelector('tspan'))continue;
  const source=el.textContent,html=svgMathText(source);
  el.dataset.mathReady='true';el.setAttribute('aria-label',source);
  if(html!==source){el.innerHTML=html;el.dataset.mathSource=source;}
 }
 layoutSvgMath(root);
 // These code-styled cells contain exact scientific values, not executable input.
 const inlineValues='.sc-result-facts code,.sc-symmetry-tests code,.lg-state-facts code,[data-math-inline]';
 for(const el of [...(root.matches(inlineValues)?[root]:[]),...root.querySelectorAll(inlineValues)]){
  if(el.dataset.mathReady||el.querySelector('.katex'))continue;
  const source=el.textContent,segments=findInlineMath(source);if(!segments.some(s=>s.type==='math'))continue;
  const fragment=document.createDocumentFragment();appendSegments(fragment,segments);el.replaceChildren(fragment);el.dataset.mathReady='true';el.dataset.mathSource=source;
 }
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
  const p=node.parentElement;return !p||p.closest(`${excluded},${owned},.sl-equation`)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
 }});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const segments=findInlineMath(node.nodeValue);
  if(!segments.some(s=>s.type==='math'))continue;
  // A text node is one anonymous flex/grid item. Preserve that item when its
  // contents become text + math; otherwise labels and radio answers split into
  // several columns or rows after typesetting.
  const wrapper=document.createElement('span');wrapper.className='sl-inline-text';
  wrapper.dataset.mathSource=node.nodeValue;appendSegments(wrapper,segments);node.replaceWith(wrapper);
 }
 layoutMathOverflow(root);
}

export function startMathDisplay(root=document.body){
 const pending=new Set();let scheduled=false;
 const flush=()=>{scheduled=false;const roots=[...pending];pending.clear();for(const el of roots){if(el?.isConnected&&!roots.some(other=>other!==el&&other.contains(el)))typesetMath(el);}};
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.target.parentElement?.closest(`${owned},.sl-equation`))continue;
   if(record.type==='characterData')pending.add(record.target.parentElement);
   else for(const node of record.addedNodes){const el=node.nodeType===1?node:node.parentElement;if(el&&!el.closest(`${owned},.sl-equation`))pending.add(el);}
  }
  if(pending.size&&!scheduled){scheduled=true;requestAnimationFrame(flush);}
 });
 typesetMath(root);observer.observe(root,{childList:true,subtree:true,characterData:true});
 const layout=()=>{layoutSvgMath(root);layoutMathOverflow(root);};document.fonts?.ready.then(layout);document.fonts?.addEventListener('loadingdone',layout);window.addEventListener('resize',layout);root.addEventListener('toggle',layout,true);
 return ()=>{observer.disconnect();document.fonts?.removeEventListener('loadingdone',layout);window.removeEventListener('resize',layout);root.removeEventListener('toggle',layout,true);};
}
