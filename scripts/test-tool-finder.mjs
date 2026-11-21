import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,flush} from './test-material-research-ui.mjs';
import {finderResults,normalizeFinderText,startToolFinder} from '../dist/tool-finder.js';
import {toolsIndex} from '../dist/navigation-ui.js';
import {learningActivities} from '../dist/learning-activity-search.js';
import {learningActivities as englishActivities} from '../dist/en/learning-activity-search.js';
import {finderResults as findEnglishActivities} from '../dist/en/tool-finder.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/search-index.json',import.meta.url),'utf8')).entries;
const englishCatalog=JSON.parse(fs.readFileSync(new URL('../dist/en/data/search-index.json',import.meta.url),'utf8')).entries;
assert.equal(normalizeFinderText(' C₄v / Clebsch–Gordan '),'c4v / clebsch gordan');
assert.equal(finderResults([...toolsIndex,...catalog],'225',{scope:'groups'})[0].route,'atlas/sg?q=225');
assert.equal(finderResults([...toolsIndex,...catalog],'Clebsch-Gordan')[0].route,'compute/lie/su3_cg');
assert.equal(finderResults([...toolsIndex,...catalog],'SU(3) 27')[0].route,'compute/lie/su3_ninej');
assert.ok(finderResults([...toolsIndex,...catalog],'C₄v',{scope:'all'}).length);
assert.equal(finderResults(catalog,'点群识别',{scope:'courses'})[0].route,'classroom/foundations?lesson=thirty-two');
assert.equal(finderResults(catalog,'平移商群',{scope:'courses'})[0].route,'classroom/crystal?lesson=space-01&track=space');
assert.equal(finderResults(catalog,'旋转与镜面 特征标相同',{scope:'courses'})[0].route,'classroom/foundations?module=demos&experiment=characters');
assert.equal(finderResults(catalog,'turn and mirror same character',{scope:'courses'})[0].route,'classroom/foundations?module=demos&experiment=characters');
assert.equal(finderResults(catalog,'Cu-QHA',{scope:'materials'})[0].route,'atlas/mechanisms?material=cu-qha');
assert.equal(finderResults([...toolsIndex,...catalog],'',{scope:'courses'}).length,0);
assert.equal(finderResults([...toolsIndex,...toolsIndex],'',{scope:'tools',limit:100}).length,75);
assert.equal(finderResults(toolsIndex,'U1')[0].route,'compute/lie/u1');
assert.equal(finderResults(toolsIndex,'interferometer')[0].route,'compute/lie/interferometer');
assert.equal(finderResults(toolsIndex,'Rabi')[0].route,'compute/lie/rabi');
assert.equal(finderResults([{route:'javascript:alert(1)',title:'bad',kind:'计算'}],'bad').length,0);
assert.ok(finderResults([...toolsIndex,...catalog],'Young',{scope:'courses'}).every(x=>x.kind==='课程'));

const activities=[
 ['氧化锌 拉曼','ZnO Raman','compute/phonon-modes?preset=zno-ir'],
 ['Rashba 时间反演','Rashba time reversal','classroom/foundations?module=mini&experiment=bands&preset=rashba-trim-check'],
 ['三顶点 投影矩阵秩','triangle projector rank','classroom/foundations?module=demos&experiment=projection&preset=triangle-permutation'],
 ['双值螺旋 工作台','double screw eigenvalue','classroom/crystal?track=double&lesson=double-06'],
 ['反幺正螺旋','antiunitary screw','classroom/spin?track=magnetic&lesson=magnetic-04'],
 ['石英 位点稳定子','quartz site stabilizer','classroom/crystal?track=space&lesson=space-04']
];
const localEntries=[...toolsIndex,...learningActivities];
assert.deepEqual(englishActivities.map(item=>item.activityAliases),learningActivities.map(item=>item.activityAliases));
for(const activity of englishActivities){
 const indexed=englishCatalog.find(item=>item.route===activity.route&&item.activityAliases);
 assert.deepEqual(indexed?.activityAliases,activity.activityAliases);
 for(const query of activity.activityAliases){
  assert.equal(findEnglishActivities(englishActivities,query)[0]?.route,activity.route);
  assert.equal(findEnglishActivities(englishCatalog,query,{scope:'courses'})[0]?.route,activity.route);
 }
}
for(const [chinese,english,route] of activities){
 for(const query of [chinese,english,`“${english}”`]){
  const results=finderResults(localEntries,query);
  assert.equal(results[0]?.route,route,query+' works before the catalog loads');
  assert.equal(results.filter(item=>item.route===route).length,1);
  assert.deepEqual(finderResults(localEntries,query,{scope:'groups'}),[]);
  assert.deepEqual(finderResults(localEntries,query,{scope:'materials'}),[]);
 }
 assert.equal(finderResults([...localEntries,...catalog],english,{scope:'courses'})[0]?.route,route);
}

for(const edition of process.argv.includes('--source-only')?['']:['','en/']){
 const address=file=>new URL('../dist/'+edition+file,import.meta.url);
 const {toolsIndex:tools}=await import(address('navigation-ui.js'));
 const {finderResults:find}=await import(address('tool-finder.js'));
 const {filterToolDirectory:filter}=await import(address('tool-directory.js'));
 const symbolic='compute/advanced/symbolic_spacegroups';
 const searchCases=[
  {queries:['  LITTLE‑GROUP   IRREPS ','小群不可约表示','small representation'],route:'workbench',arithmetic:'numeric',zh:/BC 原胞/,en:/BC fractional/},
  {queries:['spinful irrep','双值不可约表示','double-valued little-group representations'],route:'workbench',arithmetic:'numeric',zh:/双值表示/,en:/double-valued/},
  {queries:['antiunitary corepresentation','反幺正共表示','magnetic little-group coreps'],route:'workbench',arithmetic:'numeric',zh:/反幺正操作/,en:/antiunitary operations/},
  {queries:['exact symbolic little group irreps','符号小群不可约表示','exact spinful irrep','精确双值不可约表示','symbolic antiunitary corepresentation','精确磁共表示'],
   route:symbolic,arithmetic:'exact',zh:/仿射参数线/,en:/affine parameter lines/}
 ];
 for(const {queries,route,arithmetic,zh,en} of searchCases)for(const query of queries){
  const rows=find(tools,query);
  assert.equal(rows[0]?.route,route,edition+query);
  assert.match(rows[0].summary,edition?en:zh);
  assert.equal(rows.filter(row=>row.route===route).length,1,'Aliases preserve a single entry per tool');
  assert.equal(filter(tools,{query,category:'representation',arithmetic})[0]?.route,route);
  assert.ok(!filter(tools,{query,arithmetic:arithmetic==='exact'?'numeric':'exact'}).some(row=>row.route===route));
  assert.deepEqual(filter(tools,{query,category:'structure'}),[]);
  assert.deepEqual(filter(tools,{query,favorites:[]}),[]);
  assert.deepEqual(find(tools,query,{scope:'groups'}),[]);
 }
 for(const query of ['spinful irrep POSCAR','antiunitary corepresentation Γ unknownfilter','exact magnetic point group corepresentation']){
  assert.deepEqual(find(tools,query),[],edition+query+' keeps additional constraints');
 }
}

// Extend the shared lightweight DOM adapter only for native dialog/event behavior.
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){return selector.includes(',')?this.children.flatMap(child=>[...(selector.split(',').some(s=>child.matches(s))?[child]:[]),...child.querySelectorAll(selector)]):queryAll.call(this,selector);};
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
Element.prototype.addEventListener=function(name,handler){(this.events??={})[name]??=[];this.events[name].push(handler);};
Element.prototype.removeEventListener=function(name,handler){this.events[name]=(this.events?.[name]||[]).filter(x=>x!==handler);};
Element.prototype.fire=function(name,event={}){for(const fn of this.events?.[name]||[])fn({target:this,preventDefault(){},...event});};
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.closest=function(selector){return this.matches(selector)?this:this.parentNode?.closest?.(selector)||null;};
Element.prototype.remove=function(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;};
Element.prototype.showModal=function(){this.setAttribute('open','');};
Element.prototype.close=function(){this.removeAttribute('open');};
const body=new Element('body',{}, {isConnected:true});
const documentEvents={};
globalThis.document={body,activeElement:body,createElement:tag=>new Element(tag),
 addEventListener(name,fn){(documentEvents[name]??=[]).push(fn);},
 removeEventListener(name,fn){documentEvents[name]=(documentEvents[name]||[]).filter(x=>x!==fn);}};
const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
let requests=0,reject=true,release;
globalThis.fetch=async url=>{requests++;assert.match(String(url),/search-index/);if(reject)throw Error('offline');if(release===null)await new Promise(r=>release=r);return {ok:true,json:async()=>({entries:[...catalog,{route:'classroom/foundations?lesson=safe',kind:'课程',title:'<img src=x onerror=bad>',summary:'safe text'}]})};};
const button=body.appendChild(new Element('button')),routes=[];
const controller=startToolFinder({button,onNavigate:route=>routes.push(route)});
const dialog=body.querySelector('dialog'),input=dialog.querySelector('input'),status=dialog.querySelector('#tool-finder-status'),list=dialog.querySelector('#tool-finder-results');
const key=(name,options={})=>{let prevented=false;for(const fn of documentEvents.keydown||[])fn({key:name,preventDefault(){prevented=true;},...options});return prevented;};
const scope=id=>dialog.querySelector(`[data-finder-scope="${id}"]`).fire('click');
const type=value=>{input.value=value;input.fire('input');};

assert.equal(requests,0,'Creating the global finder does not fetch a catalog');
button.focus();button.fire('click');assert.equal(dialog.hidden,false);assert.equal(document.activeElement,input);assert.equal(requests,0);
assert.ok(list.querySelectorAll('[data-finder-result]').length);assert.equal(input.getAttribute('aria-activedescendant'),'tool-finder-result-0');
assert.equal(key('ArrowDown'),true);assert.equal(input.getAttribute('aria-activedescendant'),'tool-finder-result-1');
type('Clebsch-Gordan');assert.match(list.innerHTML,/CG/);assert.equal(requests,0,'Tool-only search uses the local tool catalog');
key('Enter');assert.equal(routes[0],'compute/lie/su3_cg');assert.equal(dialog.hidden,true);assert.equal(document.activeElement,button);
button.fire('click');type('ZnO Born effective charge');assert.match(list.innerHTML,/ZnO Γ 点模式的红外偏振/);
key('Enter');assert.equal(routes.at(-1),'compute/phonon-modes?preset=zno-ir');assert.equal(requests,0);
button.fire('click');type('spinful irrep');assert.match(list.innerHTML,/选择工作台的双值表示/);
assert.equal(routes.at(-1),'compute/phonon-modes?preset=zno-ir','Typing leaves the active tool unchanged');
key('Enter');assert.equal(routes.at(-1),'workbench');assert.equal(requests,0);
button.fire('click');type('精确磁共表示');assert.match(list.innerHTML,/仿射参数线/);
key('Enter');assert.equal(routes.at(-1),'compute/advanced/symbolic_spacegroups');assert.equal(requests,0);
assert.equal(key('k',{metaKey:true}),true);assert.equal(dialog.hidden,false);
type('225');await flush();assert.equal(requests,1,'The initial scope lazily reads the catalogue for an exact group');assert.ok(status.querySelector('[data-finder-retry]'));assert.match(status.innerHTML,/工具/);
type('225.1');await flush();assert.equal(requests,1,'Failed requests wait for explicit retry');
reject=false;release=null;type('225');status.querySelector('[data-finder-retry]').fire('click');await flush();assert.equal(requests,2);assert.match(status.textContent,/正在读取/);
const beforeGroupLookup=routes.length;
type('BNS 1.3');key('Enter');assert.equal(routes.length,beforeGroupLookup,'An exact atlas lookup must not open a similarly named calculator while its catalog loads');
key('Escape');assert.equal(dialog.hidden,true);release();await flush();assert.equal(dialog.hidden,true,'A late catalog response never reopens the finder');assert.equal(document.activeElement,button);
key('k',{ctrlKey:true});type('225');await flush();assert.equal(requests,2);assert.match(list.innerHTML,/空间群 225/);
key('Enter');assert.equal(routes.at(-1),'atlas/sg?q=225');
key('k',{ctrlKey:true});type('P 2_1/c');key('Enter');assert.equal(routes.at(-1),'atlas/sg?q=14');
key('k',{ctrlKey:true});type('BNS 1.3');key('Enter');assert.equal(routes.at(-1),'atlas/msg?q=1.3');
key('k',{ctrlKey:true});scope('tools');type('BNS 1.3');key('Enter');assert.equal(routes.at(-1),'compute/advanced/symbolic_spacegroups','Explicit Tools retains access to the calculation');
key('k',{ctrlKey:true});type('Young');scope('courses');await flush();assert.equal(requests,2,'A loaded shared catalog is reused');assert.match(list.innerHTML,/Young/);
type('<img');assert.match(list.innerHTML,/&lt;img/);assert.doesNotMatch(list.innerHTML,/<img /);
const first=dialog.querySelector('[data-finder-close]'),last=dialog.querySelector('[data-finder-scope="materials"]');
last.focus();key('Tab');assert.equal(document.activeElement,first);first.focus();key('Tab',{shiftKey:true});assert.equal(document.activeElement,last);
key('Escape');assert.equal(dialog.hidden,true);assert.equal(document.activeElement,button);
controller.destroy();assert.equal(body.querySelector('dialog'),null);assert.equal(documentEvents.keydown.length,0);
console.log('Tool finder: 75 tools including all previous tools, normalized queries, exact groups, scopes, lazy/retry/cached catalogs, keyboard selection, focus restoration/trap, safe output and cleanup passed.');
