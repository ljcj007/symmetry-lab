// Read-only regression: actual typesetMath + KaTeX, with a deliberately
// small DOM test double. This is unit evidence, not a browser layout test.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const SITE=path.resolve(HERE,'..');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');
const digest=name=>crypto.createHash('sha256').update(read(name).replace(/\r\n?/g,'\n')).digest('hex');
const monitored=['dist/math-display.js','dist/math-notation.js','dist/en/math-display.js','dist/en/math-notation.js','dist/en/su3-basis-ui.js','dist/en/data/lie-group-lessons.json','dist/en/data/python-messages.json'];
const sourceHashesBefore=Object.fromEntries(monitored.map(name=>[name,digest(name)]));
const {typesetMath,mathSourceText,mathHTML}=await import(pathToFileURL(path.join(SITE,'dist/math-display.js')));
const {typesetMath:typesetEnglishMath}=await import(pathToFileURL(path.join(SITE,'dist/en/math-display.js')));
const {normalizeMath}=await import(pathToFileURL(path.join(SITE,'dist/math-notation.js')));
const {su3BasisResultHTML}=await import(pathToFileURL(path.join(SITE,'dist/en/su3-basis-ui.js')));
const {createResultLocalizer}=await import(pathToFileURL(path.join(SITE,'dist/english-results.js')));

// The shim implements only platform tree/query/mutation operations. It does
// not contain notation recognition, token filtering or rendering rules.
const dataKey=s=>s.replace(/^data-/,'').replace(/-([a-z])/g,(_,x)=>x.toUpperCase());
class Node {
 constructor(type){this.nodeType=type;this.parentElement=null;this.parentNode=null;this.childNodes=[];}
 get isConnected(){return this._connectedRoot||!!this.parentNode?.isConnected;}
 appendChild(node){
  if(node.nodeType===11){for(const child of [...node.childNodes])this.appendChild(child);node.childNodes=[];return node;}
  if(node.parentNode){const old=node.parentNode.childNodes;old.splice(old.indexOf(node),1);}
  this.childNodes.push(node);node.parentNode=this;node.parentElement=this.nodeType===1?this:null;return node;
 }
 replaceChildren(...nodes){for(const child of this.childNodes){child.parentNode=null;child.parentElement=null;}this.childNodes=[];this._html='';for(const n of nodes)this.appendChild(n);}
 replaceWith(node){const parent=this.parentNode;if(!parent)return;const index=parent.childNodes.indexOf(this);parent.childNodes[index]=node;node.parentNode=parent;node.parentElement=parent.nodeType===1?parent:null;this.parentNode=this.parentElement=null;}
 get textContent(){return this.nodeType===3?this.nodeValue:this.childNodes.map(n=>n.textContent).join('');}
 set textContent(text){this.replaceChildren(new Text(String(text)));}
}
class Text extends Node {constructor(value){super(3);this.nodeValue=value;}}
class Element extends Node {
 constructor(tag){super(1);this.tagName=tag.toUpperCase();this.dataset={};this.attrs={};this._className='';this._html='';this.value='';this.clientWidth=600;this.scrollWidth=600;}
 get className(){return this._className;}
 set className(value){this._className=String(value);}
 get classList(){return{add:(...values)=>{this._className=[...new Set([...this._className.split(/\s+/).filter(Boolean),...values])].join(' ');},remove:(...values)=>{this._className=this._className.split(/\s+/).filter(x=>!values.includes(x)).join(' ');},contains:x=>this._className.split(/\s+/).includes(x)};}
 setAttribute(name,value){this.attrs[name]=String(value);if(name==='class')this.className=value;if(name.startsWith('data-'))this.dataset[dataKey(name)]=String(value);}
 getAttribute(name){if(name==='class')return this.className;if(name.startsWith('data-')&&Object.hasOwn(this.dataset,dataKey(name)))return this.dataset[dataKey(name)];return this.attrs[name]??null;}
 hasAttribute(name){return this.getAttribute(name)!==null;}
 removeAttribute(name){delete this.attrs[name];if(name.startsWith('data-'))delete this.dataset[dataKey(name)];}
 get innerHTML(){return this._html;}
 set innerHTML(value){this.replaceChildren();this._html=String(value);}
 getBoundingClientRect(){return{width:this.clientWidth,height:30};}
 simple(selector){
  const tag=selector.match(/^[a-z][\w-]*/i)?.[0];if(tag&&tag.toUpperCase()!==this.tagName)return false;
  for(const [,name] of selector.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(name))return false;
  for(const [,name,,value] of selector.matchAll(/\[([^\]=]+)(?:=(["']?)([^\]"']*)\2)?\]/g))if(!this.hasAttribute(name)||(value!==undefined&&this.getAttribute(name)!==value))return false;
  return true;
 }
 matches(selector){return selector.split(',').some(piece=>{const chain=piece.trim().split(/\s+(?![^\[]*\])/);let node=this;if(!node.simple(chain.pop()))return false;while(chain.length){const wanted=chain.pop();node=node.parentElement;while(node&&!node.simple(wanted))node=node.parentElement;if(!node)return false;}return true;});}
 closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
 querySelectorAll(selector){const out=[];const walk=n=>{for(const child of n.childNodes){if(child.nodeType===1){if(child.matches(selector))out.push(child);walk(child);}}};walk(this);return out;}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 set tabIndex(value){this.attrs.tabindex=String(value);}
 get tabIndex(){return Number(this.attrs.tabindex??-1);}
}
const document={
 createElement:tag=>new Element(tag),createTextNode:value=>new Text(value),createDocumentFragment:()=>new Node(11),
 createTreeWalker(root,what,filter){const nodes=[];const walk=n=>{for(const child of n.childNodes){if(child.nodeType===3&&filter.acceptNode(child)===1)nodes.push(child);walk(child);}};walk(root);let index=-1;return{currentNode:null,nextNode(){this.currentNode=nodes[++index]??null;return!!this.currentNode;}};}
};
globalThis.document=document;
globalThis.NodeFilter={SHOW_TEXT:4,FILTER_REJECT:2,FILTER_ACCEPT:1};
globalThis.getComputedStyle=()=>({display:'block',paddingLeft:'0',paddingRight:'0'});
const main=new Element('main');main._connectedRoot=true;document.body=main;
const make=(tag,source,attrs={})=>{const el=new Element(tag);for(const [name,value] of Object.entries(attrs))el.setAttribute(name,value);el.appendChild(new Text(source));main.appendChild(el);return el;};
const failures=[],checks=[];
const expect=(name,test,detail)=>{checks.push(name);if(!test)failures.push({name,detail});};
const spans=el=>el.querySelectorAll('.sl-math');
const rendered=el=>spans(el).map(n=>({source:n.dataset.mathSource,html:n.innerHTML}));
const wordsOutside=(el,words)=>words.every(word=>spans(el).every(n=>!new RegExp('(?:^|[^A-Za-z])'+word+'(?:[^A-Za-z]|$)').test(n.dataset.mathSource)));

const lesson=JSON.parse(read('dist/en/data/lie-group-lessons.json')).lessons.find(x=>x.id==='su3-cg-change-basis');
if(!lesson?.pitfall.includes('C†. Do not'))throw Error('The actual target lesson changed; review this regression.');
const messages=JSON.parse(read('dist/en/data/python-messages.json'));
const refs=JSON.parse(read('scripts/fixtures/su3-basis.json'));
const octet=refs.cases.find(row=>row.input.p===1&&row.input.q===1);
const localizer=createResultLocalizer({...messages,nativeAnnotations:true});
const sourceResult=structuredClone(octet.result),localized=localizer.result(octet.result);
const generated=su3BasisResultHTML(localized,{stage:2,stateIndex:4});
const sumParagraph=generated.match(/<p>(Sum [^<]+)<\/p>/)?.[1];
if(!sumParagraph)throw Error('The actual generated English sum paragraph changed; review this regression.');
const actual=(name,pointer)=>pointer.split('/').reduce((value,key)=>value[key],JSON.parse(read(name)));
const cases=[
 {name:'actual lesson pitfall paragraph',tag:'p',source:lesson.pitfall,words:['Do','not','infer'],math:'dagger',origin:'dist/en/data/lie-group-lessons.json / su3-cg-change-basis / pitfall'},
 {name:'actual GT generated Sum paragraph',tag:'p',source:sumParagraph,words:['Sum'],math:'subscript',origin:'dist/en/su3-basis-ui.js / su3BasisResultHTML(stage2)'},
 {name:'actual lesson heading',tag:'h2',source:lesson.title,words:['coefficients','decomposition','change','matrix'],math:'group',origin:'dist/en/data/lie-group-lessons.json / su3-cg-change-basis / title'},
 {name:'button anonymous text item',tag:'button',source:'Use C†. Do not invert the phase.',words:['Use','Do','not','invert'],math:'dagger',origin:'platform context regression'},
 {name:'label preceding subscript',tag:'label',source:'Sum n₁ + n₂ + n₃ = 3',words:['Sum'],math:'subscript',origin:'platform context regression'},
 {name:'actual path endpoint label',tag:'label',source:actual('dist/en/data/frontiers-materials.json','modules/2/fields/6/label'),words:['end'],math:'relation',origin:'dist/en/data/frontiers-materials.json / modules/2/fields/6/label'},
 {name:'actual odd-parity answer button',tag:'button',source:actual('dist/en/data/electronic-materials.json','exercises/0/steps/1/choices/1'),words:['Odd'],math:'group',origin:'dist/en/data/electronic-materials.json / exercises/0/steps/1/choices/1'},
 {name:'actual spin preset button',tag:'button',source:actual('dist/en/data/spin-resonance-content.json','modules/0/presets/4/title'),words:['The','same','Add'],math:'group',origin:'dist/en/data/spin-resonance-content.json / modules/0/presets/4/title'},
 {name:'actual contraction question',tag:'p',source:actual('dist/en/data/lie-derivations.json','exercises/26/check/question'),words:["can't"],math:'subscript',origin:'dist/en/data/lie-derivations.json / exercises/26/check/question'}
];
const observed=[];
for(const item of cases){
 if(typeof item.source!=='string')throw Error('Expected a literal text source: '+item.origin);
 const el=make(item.tag,item.source),before=mathSourceText(el);typesetMath(el);
 const first=rendered(el),wrappers=el.querySelectorAll('.sl-inline-text').length;
 expect(item.name+' source reconstruction',mathSourceText(el)===before,{source:item.source,reconstructed:mathSourceText(el)});
 expect(item.name+' prose excluded',wordsOutside(el,item.words),first.map(n=>n.source));
 expect(item.name+' formula still rendered',first.length>0,first);
 if(item.math==='dagger')expect(item.name+' dagger MathML',first.some(n=>/<msup>/.test(n.html)&&/\\dagger/.test(n.html)),first);
 if(item.math==='subscript')expect(item.name+' subscript MathML',first.some(n=>/<msub>|<msubsup>/.test(n.html)),first);
 expect(item.name+' complete accessible source',first.every(n=>/application\/x-tex/.test(n.html)),first);
 typesetMath(el);
 expect(item.name+' repeated rendering stable',JSON.stringify(rendered(el))===JSON.stringify(first)&&el.querySelectorAll('.sl-inline-text').length===wrappers,{first,after:rendered(el),wrappers});
 expect(item.name+' anonymous item preserved',wrappers===1,wrappers);
 observed.push({...item,mathSources:first.map(n=>n.source)});
}
// Verify the actual generated renderer, not just a common source module fed
// English text. A stale generated English parser must fail this regression.
for(const item of cases){
 const el=make(item.tag,item.source),before=mathSourceText(el);typesetEnglishMath(el);
 const first=rendered(el),wrappers=el.querySelectorAll('.sl-inline-text').length;
 expect('generated English '+item.name+' source reconstruction',mathSourceText(el)===before,{source:item.source,reconstructed:mathSourceText(el)});
 expect('generated English '+item.name+' prose excluded',wordsOutside(el,item.words),first.map(n=>n.source));
 expect('generated English '+item.name+' formula retained',first.length>0,first);
 expect('generated English '+item.name+' accessible MathML',first.every(n=>/application\/x-tex/.test(n.html)),first);
 typesetEnglishMath(el);
 expect('generated English '+item.name+' idempotent',JSON.stringify(rendered(el))===JSON.stringify(first)&&el.querySelectorAll('.sl-inline-text').length===wrappers,{first,after:rendered(el),wrappers});
 observed.push({...item,renderer:'dist/en/math-display.js',mathSources:first.map(n=>n.source)});
}

const rawCases=[['textarea',{}],['input',{}],['select',{}],['option',{}],['pre',{}],['code',{}],['kbd',{}],['samp',{}],['script',{}],['style',{}],['div',{'contenteditable':'true'}],['div',{'data-math-ignore':''}],['div',{'class':'research-input'}],['div',{'class':'exact-expression'}]];
for(const [tag,attrs] of rawCases){const original='Raw user filename.cif and C†. Do not rewrite n₁.',el=make(tag,original,attrs);el.value=original;typesetMath(main);expect('opaque '+tag+' '+JSON.stringify(attrs),el.textContent===original&&el.value===original&&spans(el).length===0,{text:el.textContent,value:el.value,rendered:rendered(el)});}
const explicit=make('pre','Tr(C†C)=2',{'class':'lg-formula'});typesetMath(main);expect('declared formula block renders despite pre exclusion',explicit.dataset.mathReady==='true'&&explicit.classList.contains('sl-equation')&&rendered(explicit).some(x=>/<msup>/.test(x.html)),rendered(explicit));
const inlineExact=make('code','x_i^2 + C†',{'data-math-inline':''});typesetMath(main);expect('declared exact inline values render without becoming executable input',inlineExact.dataset.mathReady==='true'&&spans(inlineExact).length>0,rendered(inlineExact));
const typed=make('span','{barC2z|0,0,1/2}',{'data-crystal-kind':'operation'});typesetMath(main);expect('typed Seitz overline preserved',typed.dataset.crystalReady==='true'&&/\\overline/.test(typed.innerHTML)&&/application\/x-tex/.test(typed.innerHTML),typed.innerHTML);
expect('raw API fixture remains immutable',JSON.stringify(octet.result)===JSON.stringify(sourceResult));
expect('literal formula converter remains permissive',normalizeMath('Do + Sum_i')!==null,normalizeMath('Do + Sum_i'));
expect('explicit TeX safety unchanged',!/<a\b/.test(mathHTML('\\href{javascript:alert(1)}{x}')),null);
const sourceHashesAfter=Object.fromEntries(monitored.map(name=>[name,digest(name)]));
expect('production files stable during read-only check',JSON.stringify(sourceHashesAfter)===JSON.stringify(sourceHashesBefore),{sourceHashesBefore,sourceHashesAfter});
const record={status:failures.length?'SEMANTIC_REGRESSION_REPRODUCED':'ACTUAL_RENDERER_UNIT_REGRESSIONS_PASSED',
 scope:'Both common and generated English production typesetMath renderers and KaTeX with a minimal DOM platform shim; actual English lesson and GT paragraph plus button/label contexts. This does not certify native layout, every prose sentence, or all scientific notation.',
 checks:checks.length,failures,observed,sourceHashesBefore,sourceHashesAfter,
 assertionCoverage:['source reconstruction','ordinary words excluded from mathematical fragments','MathML scripts and dagger','anonymous flex/grid text item preservation','idempotence','raw controls/code/import fields excluded','explicit scientific formula and typed operation behavior','unsafe commands inert','API fixture unchanged']};
const report=process.argv.find(value=>value.startsWith('--report='))?.slice('--report='.length);
if(report){const target=path.resolve(report);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(record,null,2)+'\n');}
console.log(JSON.stringify({status:record.status,checks:checks.length,failures:failures.map(x=>({name:x.name,detail:x.detail}))},null,2));
if(failures.length)process.exitCode=1;
