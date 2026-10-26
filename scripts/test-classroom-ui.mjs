import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const {classroomSections,classroomPathways,parseClassroomRoute,buildClassroomHash,resolveClassroomRoute,classroomHash,renderClassroomView}=await import('../dist/classroom-ui.js');
const camel=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element{
  constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};for(const [name,value] of Object.entries(attributes))if(name.startsWith('data-'))this.dataset[camel(name.slice(5))]=value;this.value=attributes.value||'';this.checked=attributes.checked!==undefined;}
  get isConnected(){return !!this.parentNode&&this.parentNode.isConnected!==false;}
  set innerHTML(value){
    for(const child of this.children)child.parentNode=null;this.html=value;this.children=[];const stack=[this],voidTags=new Set(['input','br','hr','img','meta','link','source','wbr','area','base','col','embed','param','track']);
    for(const match of value.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){const tag=match[2].toLowerCase();if(match[1]){while(stack.length>1){const closed=stack.pop();if(closed.tag===tag)break;}continue;}const attributes={};for(const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attributes[attr[1]]=attr[2]??'';const parent=stack.at(-1),child=new Element(tag,attributes,parent);parent.children.push(child);if(tag==='textarea'){const start=match.index+match[0].length,end=value.indexOf('</textarea>',start);child.value=value.slice(start,end).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}if(!voidTags.has(tag)&&!match[3].endsWith('/'))stack.push(child);}
    for(const select of this.querySelectorAll('select')){const options=select.querySelectorAll('option');select.value=(options.find(item=>Object.hasOwn(item.attributes,'selected'))||options[0])?.value||'';}
  }
  get innerHTML(){return this.html||'';}
  matches(selector){if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);if(selector.startsWith('.'))return String(this.attributes.class||'').split(/\s+/).includes(selector.slice(1));if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;const match=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);return !!match&&(!match[1]||match[1]===this.tag)&&Object.hasOwn(this.attributes,match[2])&&(match[3]===undefined||this.attributes[match[2]]===match[3]);}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  focus(){}scrollIntoView(){}
}
class Container{constructor(){this.isConnected=true;}set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.html=value;this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}}

for(const [old,canonical] of [['pointgroups','pointgroups'],['academy','crystal'],['lie','lie']]) {
 assert.equal(resolveClassroomRoute(old),old);assert.equal(resolveClassroomRoute('classroom/'+canonical),old);assert.equal(classroomHash(old),'#classroom/'+canonical);
}
assert.equal(resolveClassroomRoute('classroom','academy'),'academy');
assert.equal(resolveClassroomRoute('workbench'),null);
assert.deepEqual(parseClassroomRoute('#classroom'),{section:'overview',pathway:'overview'});
assert.equal(classroomPathways.length,7);
for(const route of ['classroom/foundations?tab=lab&lesson=representations&group=2','classroom/spin?track=color&tab=lab&experiment=color_group&preset=translation3_space&lesson=color-space','classroom/crystal?tab=materials&material=nacl','classroom/coupling?tab=derive&track=ninej&exercise=9j-test','compute/lie/su3_ninej?preset=ninej-27-complex','classroom/observables?tab=derive&material=si&exercise=phonon-count','compute/phonons?material=si','compute/tensors?material=gaas']){
 const parsed=parseClassroomRoute(route);assert.ok(parsed);assert.deepEqual(parseClassroomRoute(buildClassroomHash(parsed)),parsed,'Route roundtrip preserves context');
}
assert.equal(parseClassroomRoute('compute/lie/su3_ninej?tab=learn').tab,'lab');
assert.equal(parseClassroomRoute('workbench'),null);assert.equal(parseClassroomRoute('classroom/not-a-path'),null);
const c=new Container(),calls=[],opened=[],navigations=[],locations=[];
const courseRenderers=Object.fromEntries(classroomSections.map(s=>[s.id,options=>calls.push({section:s.id,...options})]));
const render=route=>renderClassroomView({container:c,route:parseClassroomRoute(route),onNavigate:(hash,options)=>navigations.push({hash,options}),onLocation:value=>locations.push(value),courseRenderers,openGroup:s=>opened.push(s)});
render('classroom');assert.equal(calls.length,0,'Overview loads no calculation or lesson module');assert.equal(c.firstElementChild.querySelectorAll('.classroom-path-card').length,7);
render('classroom/spin?track=spin&tab=lab&lesson=spin-definition&experiment=spin_group&preset=af_space');
assert.equal(calls.at(-1).section,'academy');assert.equal(calls.at(-1).selection.preset,'af_space');assert.equal(calls.at(-1).selection.lesson,'spin-definition');
calls.at(-1).openGroup(99);assert.deepEqual(opened[0],{mode:'sg',id:99,k:[0,0,0],doubleValued:false});
const magnetic={mode:'msg',id:'1.3',k:[0,0,.5],doubleValued:true};calls.at(-1).openGroup(magnetic);assert.deepEqual(opened[1],magnetic);
calls.at(-1).onNavigate({tab:'quiz'});let route=parseClassroomRoute(navigations.at(-1).hash);assert.equal(route.lesson,'spin-definition');assert.equal(route.track,'spin');assert.deepEqual(navigations.at(-1).options,{render:false},'Local navigation must not remount and clear computed data');
const link=c.firstElementChild.querySelectorAll('[data-course-route]').find(link=>link.dataset.courseRoute==='#classroom/coupling');link.onclick({preventDefault(){}});assert.equal(navigations.at(-1).hash,'#classroom/coupling');
render('compute/lie/su3_ninej');assert.equal(calls.at(-1).section,'lie');assert.equal(calls.at(-1).selection.calculationOnly,true);assert.equal(c.firstElementChild.querySelector('.classroom-directory'),null);
calls.at(-1).onNavigate({experiment:'su3_cg'});assert.equal(parseClassroomRoute(navigations.at(-1).hash).experiment,'su3_cg');
const previous=navigations.length;c.isConnected=false;calls.at(-1).onNavigate({tab:'learn'});assert.equal(navigations.length,previous,'Detached course callbacks cannot change the URL');
assert.ok(locations.some(value=>value.startsWith('计算中心')));
const index=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.doesNotMatch(index,/data-view="(?:pointgroups|academy)"/,'Legacy modules do not become duplicate main navigation items');
console.log('Classroom IA: seven pathways, legacy routes, deep-link roundtrips, context-preserving local navigation, shared full calculation mode, workbench adapters and detached callbacks passed.');
