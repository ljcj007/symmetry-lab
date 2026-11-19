import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const base=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {parseClassroomRoute,buildClassroomHash,renderClassroomView}=await import(new URL('classroom-ui.js',base));
const {renderSymmetryCourseView}=await import(new URL('symmetry-course-ui.js',base));
const read=name=>JSON.parse(readFileSync(new URL('data/'+name+'.json',base),'utf8'));
const catalogue=read('symmetry-course-lessons');
const atlas=read('symmetry-course-atlas');
const lessonRoute='#classroom/crystal?tab=learn&lesson=space-06&track=space';
const practiceRoute='#structure?cif-setting=practice';

const parsed=parseClassroomRoute(lessonRoute);
assert.equal(parsed.section,'academy');
assert.equal(parsed.lesson,'space-06');
assert.equal(buildClassroomHash(parsed),lessonRoute);
let fetched=[];
globalThis.fetch=async url=>{
 const path=String(url);
 fetched.push(path);
 if(path.includes('symmetry-course-lessons.json'))return {ok:true,json:async()=>catalogue};
 if(path.includes('symmetry-course-atlas.json'))return {ok:true,json:async()=>atlas};
 assert.fail('Unexpected lesson request: '+path);
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('No mastery state is changed by opening the optional guidance')};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(where,html){this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;};
Element.prototype.scrollIntoView=function(){};

const page=new Container();
const dispose=await renderClassroomView({container:page,route:lessonRoute,
 run:()=>assert.fail('Opening the CIF guidance must not start a calculation'),
 openGroup:()=>assert.fail('Opening the lesson must not open a calculator'),
 loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
 courseRenderers:{academy:renderSymmetryCourseView}});
const lesson=page.querySelector('.sc-lesson');
const details=lesson.querySelector('[data-cif-setting-practice]');
assert.equal(details.tag,'details');
assert.equal(Object.hasOwn(details.attributes,'open'),false);
assert.equal(details.querySelectorAll('li').length,3);
assert.equal(details.querySelector(`a[href="${practiceRoute}"]`).getAttribute('href'),practiceRoute);
assert.ok(details.querySelector('a[href="docs/cif-setting-practice.md"]'));
assert.ok(details.querySelector('a[href="docs/cif-setting-practice.md#dotted-cif-replay"]'));
assert.ok(lesson.querySelector('[data-si-structure-practice]'));
assert.match(details.innerHTML,/101\.2°/);
assert.match(details.innerHTML,/P 2c/);
assert.match(details.innerHTML,/P 2yb/);
assert.match(details.innerHTML,english?/which input basis vector/i:/螺旋轴沿哪个输入基矢/);
assert.ok(fetched.every(path=>path.includes('symmetry-course-')));

const picker=page.querySelector('#sc-chapter-select');
picker.value=String(catalogue.lessons.findIndex(row=>row.id==='space-05'));
picker.onchange({target:picker});
assert.equal(page.querySelector('[data-cif-setting-practice]'),null,'The optional guidance belongs to space-06');
dispose?.();

const doc=readFileSync(new URL('docs/cif-setting-practice.md',base),'utf8');
assert.match(doc,/\]\(\.\.\/#structure\?cif-setting=practice\)/);
assert.match(doc,/\]\(\.\.\/#classroom\/crystal\?track=space&tab=learn&lesson=space-06\)/);
assert.match(doc,/Rᵀ G R = G/);
assert.match(doc,/Ispace_group_IT_number\.html/);
assert.match(doc,/Ispace_group_name_Hall\.html/);
const replay=doc.split('<a id="dotted-cif-replay"></a>')[1];
assert.ok(replay);
assert.match(replay,english?/Load the dotted P 2c CIF/:/载入点号 P 2c CIF/);
assert.match(replay,/_cell_length_a/);
assert.match(replay,/_cell\.length_a/);
assert.match(replay,/github\.com\/COMCIFS\/cif_core\/blob\/v3\.3\.0\/cif_core\.dic/);
assert.match(replay,/source_site_rows/);
assert.match(replay,/SHA-256/);

console.log(`CIF axis setting lesson (${english?'English':'Chinese'}): canonical classroom handoff, document, and inactive neighboring lesson passed.`);
