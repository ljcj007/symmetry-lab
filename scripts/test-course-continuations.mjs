import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url),'utf8'));
const lessons=read('symmetry-course-lessons.json'),derivations=read('symmetry-derivations.json'),materials=read('symmetry-materials.json'),atlas=read('symmetry-course-atlas.json');
const pgLessons=read('pointgroup-lessons.json'),pgAtlas=read('pointgroup-atlas.json');
const saved=new Map();globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('symmetry-materials')?materials:String(url).includes('symmetry-derivations')?derivations:String(url).includes('symmetry-course-lessons')?lessons:String(url).includes('symmetry-course-atlas')?atlas:String(url).includes('pointgroup-lessons')?pgLessons:pgAtlas});
const camel=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element{
 constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};for(const [key,value]of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[camel(key.slice(5))]=value;this.value=attributes.value||'';this.checked=attributes.checked!==undefined;}
 get isConnected(){return !!this.parentNode&&this.parentNode.isConnected!==false;}
 set innerHTML(value){for(const child of this.children)child.parentNode=null;this.html=value;this.children=[];const stack=[this],voids=new Set(['input','br','hr','img','meta','link','source','wbr']);for(const match of value.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){const tag=match[2].toLowerCase();if(match[1]){while(stack.length>1){if(stack.pop().tag===tag)break;}continue;}const attrs={};for(const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attrs[attr[1]]=attr[2]??'';const parent=stack.at(-1),child=new Element(tag,attrs,parent);parent.children.push(child);if(!voids.has(tag)&&!match[3].endsWith('/'))stack.push(child);}for(const select of this.querySelectorAll('select')){const choices=select.querySelectorAll('option');select.value=(choices.find(item=>Object.hasOwn(item.attributes,'selected'))||choices[0])?.value||'';}}
 get innerHTML(){return this.html||'';}
 matches(selector){if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);if(selector.startsWith('.'))return String(this.attributes.class||'').split(/\s+/).includes(selector.slice(1));if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;const m=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);return !!m&&(!m[1]||m[1]===this.tag)&&Object.hasOwn(this.attributes,m[2])&&(m[3]===undefined||m[3]===this.attributes[m[2]]);}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){}scrollIntoView(){}
}
class Container{
 constructor(){this.isConnected=true;}
 set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}
 querySelector(selector){return this.firstElementChild.querySelector(selector);}
 querySelectorAll(selector){return this.firstElementChild.querySelectorAll(selector);}
}
const sc=await import('../dist/symmetry-course-ui.js?course-continuations');
const byId=new Map(derivations.exercises.map(item=>[item.id,item]));
for(const lesson of lessons.lessons){assert.ok(Array.isArray(lesson.derivationIds),lesson.id);for(const id of lesson.derivationIds){assert.ok(byId.has(id),id);assert.equal(byId.get(id).track,lesson.track);}}
const ids=(lesson,exercises=derivations.exercises)=>sc.relatedSymmetryExercises(lesson,exercises).map(item=>item.id);
assert.deepEqual(ids({id:'future',lab:'seitz'}),[],'A lab or track alone cannot select an unrelated exercise');
assert.deepEqual(ids({id:'future',derivationIds:[],lab:'color_group',labPreset:'c3_point'}),[],'A reviewed empty binding overrides a superficially matching preset');
for(const [lessonId,target]of [['space-05','space-si-compose'],['double-04','double-gaas-kramers'],['magnetic-05','magnetic-nio-square'],['spin-04','spin-soc-lock']]){
 const lesson=lessons.lessons.find(item=>item.id===lessonId);assert.equal(ids(lesson)[0],target);
 const container=new Container(),moves=[];
 await sc.renderSymmetryCourseView({container,selection:{pathway:lesson.track==='space'?'crystal':'spin',track:lesson.track,lesson:lessonId,tab:'learn'},onNavigate:patch=>moves.push(patch)});
 await container.querySelector('#sc-chapter-derive').onclick();
 assert.equal(container.querySelector('#sc-derive-select').value,target,lessonId);
 assert.equal(moves.at(-1).exercise,target,lessonId);
 assert.equal(moves.at(-1).lesson,lessonId,'The related exercise keeps its originating lesson');
 assert.equal(moves.at(-1).track,lesson.track);
}
const empty=lessons.lessons.find(item=>item.id==='space-04'),bank=new Container(),bankMoves=[];
await sc.renderSymmetryCourseView({container:bank,selection:{pathway:'crystal',track:'space',lesson:empty.id,tab:'learn'},onNavigate:patch=>bankMoves.push(patch)});
assert.equal(bank.querySelector('#sc-chapter-derive').textContent,'浏览分步推导题库 →');
await bank.querySelector('#sc-chapter-derive').onclick();
assert.match(bank.querySelector('#sc-content').innerHTML,/本节尚无一一对应/);
assert.equal(bank.querySelector('#sc-derive-select'),null,'No previous or first exercise is silently opened');
assert.equal(bankMoves.at(-1).exercise,null);
const picked=bank.querySelectorAll('[data-sc-exercise]').find(button=>button.dataset.scExercise==='space-si-gaas-inversion');picked.onclick();
assert.equal(bank.querySelector('#sc-derive-select').value,'space-si-gaas-inversion');
assert.equal(bankMoves.at(-1).exercise,'space-si-gaas-inversion');
assert.equal(bankMoves.at(-1).lesson,'space-04');
assert.deepEqual(ids(lessons.lessons.find(item=>item.id==='double-03')),['double-si-c2','double-gaas-c3'],'A lesson may have multiple reviewed related exercises');

const pg=await import('../dist/pointgroup-ui.js?course-continuations'),page=new Container(),opened=[];
await pg.renderPointgroupView({container:page,selection:{pathway:'foundations',tab:'learn',lesson:'from-point-to-space'},openGroup:spec=>opened.push(spec)});
assert.ok(page.querySelectorAll('a').some(item=>item.attributes.href==='#structure'));
const next=page.querySelectorAll('a').find(item=>item.attributes.href?.includes('lesson=space-01'));assert.ok(next);assert.match(next.attributes.href,/classroom\/crystal\?track=space/);
assert.ok(lessons.lessons.some(item=>item.id==='space-01'));
const sg99=atlas.spaceGroups.find(item=>item.number===99);assert.ok(sg99);assert.equal(sg99.pointGroupNumber,13);
const open=page.querySelector('#pg-open-sg99');open.onclick();assert.deepEqual(opened,[{mode:'sg',id:99,k:[0,0,0],doubleValued:false}]);
page.querySelector('#pg-chapter-select').onchange({target:{value:'0'}});open.onclick();assert.equal(opened.length,1,'A previous lesson button cannot open the workbench after changing chapters');
page.innerHTML='<p>Different page</p>';open.onclick();assert.equal(opened.length,1,'A detached continuation cannot open a workbench');
console.log('Course continuations: 24 explicit lesson decisions, genuine Bloch/Kramers/antiferromagnetic/SOC targets, honest exercise-bank selection, origin context, multiple bindings and BC/SG99/space-01 handoffs passed.');
