import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDictionaryText,resolveFormulaEntries,searchDictionary,safeDictionaryHref,dictionaryEntryHTML,dictionaryNotationHTML,startFormulaDictionary,renderFormulaDictionary,formulaDictionarySource} from '../dist/formula-dictionary.js';
import {mathSourceText} from '../dist/math-display.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/formula-dictionary.json',import.meta.url),'utf8'));
assert.equal(catalog.release,'20261029-pathways1');assert.ok(catalog.entries.length>=40);
assert.equal(new Set(catalog.entries.map(e=>e.id)).size,catalog.entries.length);
const sources=new Set(catalog.sources.map(s=>s.id));
for(const e of catalog.entries){
 for(const key of ['title','definition','conventions','conditions'])assert.ok(e[key]?.length>(key==='title'?3:8),e.id+' '+key);
 assert.ok(e.variables?.length&&e.variables.every(v=>v.symbol&&v.meaning&&v.unit),e.id);
 assert.ok(e.sources.length&&e.sources.every(id=>sources.has(id)),e.id);
 assert.ok(e.links.length&&e.links.every(([,href])=>safeDictionaryHref(href)),e.id);
}
for(const s of catalog.sources)assert.ok(safeDictionaryHref(s.url,true),s.id);
const ids=(source,route='',context='',kind='')=>resolveFormulaEntries(source,{route,context,kind},catalog).matches.map(e=>e.id);
assert.ok(ids('k','#compute/band-representation-lab').includes('k-fractional'));
assert.ok(!ids('k','#compute/band-representation-lab').includes('k-radian'));
assert.ok(ids('k','#compute/quantum-geometry-lab').includes('k-radian'));
assert.ok(ids('U','#compute/hubbard-cluster-lab').includes('U-hubbard'));
assert.ok(ids('U','#compute/band-representation-lab').includes('U-unitary'));
assert.ok(ids('U','#classroom/spin?track=spin').includes('U-spin'));
assert.ok(ids('Γ','#compute/device-transport-lab').includes('gamma-broadening'));
assert.ok(ids('Γ','#classroom/crystal').includes('gamma-point'));
assert.ok(ids('J','#compute/dynamic-scattering-lab').includes('J-exchange'));
assert.ok(ids('J','#compute/local-multiplet-lab').includes('J-hund'));
assert.ok(ids('J','#compute/atomic-spectra-lab').includes('J-angular'));
assert.ok(ids('U−3J').includes('U-hubbard')&&ids('U−3J').includes('J-hund'));
for(const symbol of ['k','U','Γ','J'])assert.ok(resolveFormulaEntries(symbol,{},catalog).ambiguous.length,symbol+' should not be guessed');
assert.ok(!ids('k_B').includes('k-fractional'),'Boltzmann subscript must not be read as crystal k');
assert.ok(!ids('SU(3)').includes('U-hubbard'),'U inside SU(3) must not be matched');
assert.ok(resolveFormulaEntries('unknown_xyz_987',{},catalog).unknown);
assert.ok(ids('P4_12_12','','','hm').includes('hm'),'typed arbitrary HM has its general syntax entry');
assert.ok(ids('C2z','','','operation').includes('rotation-operator'));
assert.ok(ids('C2','','','hm').includes('hm'));
assert.ok(!ids('C2','','','hm').includes('schoenflies'),'Explicit HM C2 must not be described as Schoenflies C2');
assert.ok(ids('C2','','','schoenflies').includes('schoenflies'));
assert.deepEqual(ids('T2','','','irrep'),['irrep'],'An irrep T2 is not a time-reversal square');
assert.ok(ids('{barC2z|0,0,1/2}','','','operation').includes('seitz'));
assert.ok(resolveFormulaEntries('C2',{},catalog).unknown,'Untyped C2 needs context');
assert.ok(ids('χ','#classroom/foundations').includes('character'));
assert.ok(!ids('χ','#compute/shg-lab').includes('character'));
assert.ok(ids('ω','#compute/phonopy').includes('frequency'));
assert.ok(!ids('ω','#compute/phonopy').includes('berry-curvature'));
assert.ok(ids('Ω','#compute/quantum-geometry-lab').includes('berry-curvature'));
assert.ok(resolveFormulaEntries('κ',{},catalog).unknown,'A context-free coefficient must not be guessed as a wall gradient energy');
assert.equal(normalizeDictionaryText('\\Gamma_{L}'),normalizeDictionaryText('Γ_L'));
assert.ok(searchDictionary('DSF',catalog).some(e=>e.id==='dsf'));
for(const name of ['bandrep','domainwall','Hubbard'])assert.ok(searchDictionary(name,catalog).length,name);
assert.ok(searchDictionary('多重态',catalog).length);
assert.equal(searchDictionary('不存在987654321',catalog).length,0);
for(const bad of ['javascript:alert(1)','data:text/html,a','http://example.org','https://user:pass@example.org'])assert.equal(safeDictionaryHref(bad,true),null);
assert.equal(safeDictionaryHref('https://example.org/paper',true),'https://example.org/paper');
const hostile={...catalog.entries[0],title:'<img src=x onerror=alert(1)>',definition:'<script>bad</script>',variables:[{symbol:'<svg>',meaning:'<iframe>',unit:'<img>'}],links:[['bad','javascript:alert(1)']],sources:['bad']};
const inert=dictionaryEntryHTML(hostile,{sources:[{id:'bad',title:'unsafe',url:'javascript:alert(1)'}]});
assert.doesNotMatch(inert,/<img|<svg|<script|<iframe|javascript:/i);assert.match(inert,/&lt;img/);
assert.match(dictionaryNotationHTML('kz',{symbol:true}),/<msub>/,'Dictionary k_z uses the shared mathematical renderer');
assert.match(dictionaryNotationHTML('λ±',{symbol:true}),/<msub>[\s\S]*<mi>λ<\/mi>[\s\S]*<mo[^>]*>±<\/mo>/,'Eigenvalue branch sign is a subscript');
assert.match(dictionaryNotationHTML('U_S²',{symbol:true}),/<msubsup>/,'Operator subscript and power share one atom');
const screwEntry=dictionaryEntryHTML(catalog.entries.find(e=>e.id==='screw-phase'),catalog);
assert.match(screwEntry,/<math/);assert.doesNotMatch(screwEntry,/<code|data-math-ignore/);
assert.match(dictionaryNotationHTML('λ±',{symbol:true}),/class="fd-notation" data-math-source="λ±"/,'Display aliases retain raw dictionary source');
const css=fs.readFileSync(new URL('../dist/formula-dictionary.css',import.meta.url),'utf8');
assert.doesNotMatch(css,/\.fd-variables dd span\s*\{|\.fd-entry summary span\s*\{/,'Dictionary styles must not restyle every nested KaTeX span');

// A small inert DOM runs the production event, focus, async and observer paths.
const camel=s=>s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
const decode=s=>String(s).replace(/&(?:amp|lt|gt|quot|#39);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[c]));
class Element{
 constructor(tag='div',attrs={}){this.tagName=tag.toUpperCase();this.nodeType=1;this.attrs={};this.dataset={};this.children=[];this.listeners=new Map();this.parentElement=null;this.textContent='';for(const [k,v]of Object.entries(attrs))this.setAttribute(k,v);}
 get childNodes(){return this.children;}get isConnected(){return this===document.body||!!this.parentElement?.isConnected;}
 get className(){return this.getAttribute('class')||'';}set className(v){this.setAttribute('class',v);}
 get open(){return this.hasAttribute('open');}
 setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[camel(k.slice(5))]=String(v);if(k==='value')this.value=decode(v);}
 getAttribute(k){return Object.hasOwn(this.attrs,k)?this.attrs[k]:null;}
 hasAttribute(k){return Object.hasOwn(this.attrs,k);}
 removeAttribute(k){delete this.attrs[k];if(k.startsWith('data-'))delete this.dataset[camel(k.slice(5))];}
 appendChild(child){child.parentElement=this;this.children.push(child);return child;}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}}
 contains(el){return el===this||this.children.some(c=>c.contains(el));}
 matches(selector){return selector.split(',').some(s=>{
  s=s.trim();if(s.includes(' ')){const at=s.lastIndexOf(' ');return this.matches(s.slice(at+1))&&!!this.parentElement?.closest(s.slice(0,at));}
  const tag=s.match(/^[a-z][\w-]*/i)?.[0];if(tag&&this.tagName.toLowerCase()!==tag.toLowerCase())return false;
  for(const [,cls]of s.matchAll(/\.([\w-]+)/g))if(!this.className.split(/\s+/).includes(cls))return false;
  for(const [,id]of s.matchAll(/#([\w-]+)/g))if(this.getAttribute('id')!==id)return false;
  for(const [,name,op,val]of s.matchAll(/\[([\w-]+)(?:(\^?=)"([^"]*)")?\]/g))if(!this.hasAttribute(name)||(op==='='&&this.getAttribute(name)!==val)||(op==='^='&&!this.getAttribute(name).startsWith(val)))return false;
  return true;
 });}
 closest(s){for(let e=this;e;e=e.parentElement)if(e.matches(s))return e;return null;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 addEventListener(name,fn){const set=this.listeners.get(name)||new Set();set.add(fn);this.listeners.set(name,set);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 emit(name,props={}){const e={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...props};for(const f of this.listeners.get(name)||[])f(e);return e;}
 focus(){document.activeElement=this;}
 showModal(){this.setAttribute('open','');}
 close(){this.removeAttribute('open');this.emit('close');}
 set innerHTML(value){this.html=String(value);for(const c of this.children)c.parentElement=null;this.children=[];
  const stack=[this],voidTags=new Set(['input','br','hr','img','meta','link']);
  for(const m of this.html.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){
   const tag=m[2].toLowerCase();if(m[1]){while(stack.length>1){if(stack.pop().tagName.toLowerCase()===tag)break;}continue;}
   const attrs={};for(const a of m[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attrs[a[1]]=decode(a[2]??'');
   const c=new Element(tag,attrs);stack.at(-1).appendChild(c);if(!voidTags.has(tag))stack.push(c);
  }
 }
 get innerHTML(){return this.html||'';}
}
globalThis.document={body:new Element('body'),activeElement:null,createElement:tag=>new Element(tag)};
globalThis.location={hash:'#compute/hubbard-cluster-lab'};
const observers=[];
globalThis.MutationObserver=class{constructor(fn){this.fn=fn;observers.push(this);}observe(root,options){this.options=options;}disconnect(){this.disconnected=true;}};
let resolveFetch;
globalThis.fetch=()=>new Promise(resolve=>{resolveFetch=resolve;});
const body=document.body;
const formula=body.appendChild(new Element('span',{'class':'sl-math','data-math-source':'U'}));
const originalSource=mathSourceText(formula),originalHTML=formula.innerHTML;
const block=body.appendChild(new Element('pre',{'class':'sl-equation','data-math-source':'S(Q,ω)'}));
const nested=block.appendChild(new Element('span',{'class':'sl-math','data-math-source':'ω'}));
const blocked=[];
for(const tag of ['button','a','input','select','code']){const parent=body.appendChild(new Element(tag));blocked.push(parent.appendChild(new Element('span',{'class':'sl-math','data-math-source':'J'})));}
const stop=startFormulaDictionary(body);
assert.equal(formula.getAttribute('tabindex'),'0');assert.equal(formula.getAttribute('role'),'button');assert.equal(block.getAttribute('role'),'button');
assert.equal(nested.getAttribute('role'),null,'Block and inner formula must not be nested interactive controls');
for(const el of blocked)assert.equal(el.getAttribute('data-fd-trigger'),null);
assert.deepEqual(observers[0].options,{childList:true,subtree:true});
body.emit('keydown',{target:formula,key:'Enter'});
const dialog=body.querySelector('dialog');assert.ok(dialog.open);assert.equal(document.activeElement.className,'fd-close');
assert.match(dialog.querySelector('.fd-dialog-content').innerHTML,/公式原文/);
body.emit('keydown',{target:dialog,key:'Escape'});assert.ok(!dialog.open);assert.equal(document.activeElement,formula);
resolveFetch({ok:true,json:async()=>catalog});await new Promise(resolve=>setTimeout(resolve,0));
assert.doesNotMatch(dialog.querySelector('.fd-dialog-content').innerHTML,/在位相互作用能/,'A late response must not repopulate a closed dialog');
const space=body.emit('keydown',{target:formula,key:' '});assert.ok(space.defaultPrevented);await new Promise(resolve=>setTimeout(resolve,0));
assert.match(dialog.querySelector('.fd-dialog-content').innerHTML,/电子在位相互作用能/);
assert.ok(!dialog.hasAttribute('data-math-ignore'),'Definition math is allowed while the source pre stays ignored');
assert.match(dialog.querySelector('.fd-dialog-content').innerHTML,/<pre data-math-ignore>U<\/pre>/);
assert.equal(formulaDictionarySource(formula),'U');assert.equal(mathSourceText(formula),originalSource);assert.equal(formula.innerHTML,originalHTML);
assert.equal(body.querySelectorAll('dialog').length,1,'Repeated opens reuse one dialog');
const late=body.appendChild(new Element('span',{'class':'sl-math','data-math-source':'unknown_xyz_987'}));
observers[0].fn([{target:body,addedNodes:[late]}]);await Promise.resolve();assert.equal(late.getAttribute('role'),'button');
body.emit('click',{target:late});await new Promise(resolve=>setTimeout(resolve,0));
assert.match(dialog.querySelector('.fd-dialog-content').innerHTML,/暂未识别/);assert.match(dialog.querySelector('.fd-dialog-content').innerHTML,/#docs\/dictionary\?q=unknown_xyz_987/);
const ignored=body.emit('click',{target:blocked[0]});assert.equal(ignored.defaultPrevented,false);
stop();assert.equal(formula.getAttribute('role'),null);assert.equal(formula.getAttribute('tabindex'),null);assert.equal(body.querySelector('dialog'),null);assert.ok(observers[0].disconnected);
assert.equal(mathSourceText(formula),originalSource);

const page=body.appendChild(new Element('div'));
const pageControl=renderFormulaDictionary({container:page,selection:{q:'"><img src=x onerror=alert(1)>'}});await pageControl.ready;
assert.equal(page.querySelector('input').value,'"><img src=x onerror=alert(1)>');assert.equal(page.querySelector('img'),null);
const input=page.querySelector('input');input.value='domainwall';input.emit('input');
assert.match(page.querySelector('.fd-search-results').innerHTML,/畴壁与连续序参量剖面/);
assert.match(page.querySelector('.fd-search-results').innerHTML,/<math/,'Search results also typeset their variable symbols');
assert.equal(page.querySelector('.fd-page').getAttribute('data-math-ignore'),null);
const stopAgain=startFormulaDictionary(body);
for(const el of page.querySelectorAll('.sl-math'))assert.equal(el.getAttribute('data-fd-trigger'),null,'Rendered dictionary formulae must not recursively become triggers');
stopAgain();
pageControl.destroy();const before=page.querySelector('.fd-search-results').innerHTML;input.value='Hubbard';input.emit('input');assert.equal(page.querySelector('.fd-search-results').innerHTML,before);
console.log(`Formula dictionary: ${catalog.entries.length} sourced entries, context disambiguation, typed crystal meanings, safe rendering, original-source preservation, delegated mouse/keyboard access, late-load cancellation, cleanup and search passed.`);
