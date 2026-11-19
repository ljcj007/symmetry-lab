import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const base=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {parseClassroomRoute,buildClassroomHash,renderClassroomView}=await import(new URL('classroom-ui.js',base));
const {renderSymmetryCourseView}=await import(new URL('symmetry-course-ui.js',base));
const {findInlineMath,segmentFormula}=await import(new URL('math-notation.js',base));
const {crystalTex}=await import(new URL('../dist/crystal-notation.js',import.meta.url));
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
assert.equal(details.children.find(child=>child.tag==='ol').querySelectorAll('li').length,3);
assert.equal(details.querySelector(`a[href="${practiceRoute}"]`).getAttribute('href'),practiceRoute);
assert.ok(details.querySelector('a[href="docs/cif-setting-practice.md"]'));
assert.ok(details.querySelector('a[href="docs/cif-setting-practice.md#dotted-cif-replay"]'));
const activity=details.querySelector('[data-cif-reciprocal-activity]');
assert.equal(activity.tag,'details');
assert.equal(Object.hasOwn(activity.attributes,'open'),false);
assert.match(activity.children[0].textContent,english?/Three wavevectors/:/三个波矢/);
const steps=activity.querySelector('[data-cif-reciprocal-steps]');
assert.equal(steps.querySelectorAll('li').length,3);
assert.ok(steps.querySelector(`a[href="${practiceRoute}"]`));
assert.equal(steps.querySelector('code').textContent,'-3/4, -1/4');
assert.ok(activity.querySelector('a[href="docs/cif-setting-practice.md#cif-reciprocal-replay"]'));
const answer=activity.querySelector('[data-cif-reciprocal-answer]');
assert.equal(answer.tag,'details');
assert.equal(Object.hasOwn(answer.attributes,'open'),false);
assert.match(answer.children[0].textContent,english?/Reveal the three results/:/查看三个结果/);
assert.equal(activity.querySelector('[data-cif-reciprocal-phase]').textContent,'χ(s)² = exp(−2πi k_z)');
assert.equal(segmentFormula(activity.querySelector('[data-cif-reciprocal-phase]').textContent)[0]?.type,'math');
assert.match(crystalTex(activity.querySelector('[data-crystal-kind="operation"]').getAttribute('data-math-source'),'operation'),/\\mathrm\{2z\}/);
const rows=answer.querySelector('[data-cif-reciprocal-results]').querySelectorAll('li');
assert.deepEqual(rows.map(row=>row.textContent),[
 '1/4 → −1/4 · χ = ±(1+i)/√2 · χ² = +i',
 '−3/4 → 3/4 · χ = ±(1+i)/√2 · χ² = +i',
 '−1/4 → +1/4 · χ = ±(1−i)/√2 · χ² = −i',
]);
for(const row of rows){
 assert.match(findInlineMath(row.querySelector('[data-math-inline]').textContent)[0].tex,/\\sqrt\{2\}/);
}
const branches=answer.querySelector('[data-cif-bc-branches]');
assert.ok(branches);
assert.match(branches.textContent,english?/sets of screw characters agree/:/螺旋特征标集合相同/);
assert.match(branches.textContent,english?/BC labels for the same character value therefore swap/:/同一个特征标在两次结果中的 BC 标签互换/);
assert.match(branches.textContent,english?/D1 and D2 identify rows/:/D1 和 D2 是各次数值表的本地行号/);
const phase=branches.querySelector('[data-cif-bc-branch-phase]').textContent;
assert.equal(phase,'exp(−iπ(u+1)) = −exp(−iπu)');
assert.equal(segmentFormula(phase)[0]?.type,'math');
const labels=branches.querySelectorAll('[data-crystal-kind="irrep"]');
assert.deepEqual(labels.map(label=>label.getAttribute('data-math-source')),['Λ1','Λ2']);
for(const [i,label] of labels.entries()){
 assert.ok(crystalTex(label.getAttribute('data-math-source'),'irrep').includes('_{\\mathrm{'+(i+1)+'}}'));
}
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
assert.equal(page.querySelector('[data-cif-orbit-lesson]'),null,'The orbit exercise belongs to space-04');
picker.value=String(catalogue.lessons.findIndex(row=>row.id==='space-04'));
picker.onchange({target:picker});
const orbit=page.querySelector('[data-cif-orbit-lesson]');
assert.ok(orbit?.querySelector('a[href="#structure?cif-orbit=practice"]'));
assert.match(orbit.textContent,english?/site multiplicity with α-quartz/i:/用 α 石英核对 CIF 位点重数/);
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
const reciprocal=doc.split('<a id="cif-reciprocal-replay"></a>')[1];
assert.ok(reciprocal);
assert.match(reciprocal,/\]\(\.\.\/#structure\?cif-setting=practice\)/);
assert.match(reciprocal,/`-3\/4`、`-1\/4`|`-3\/4` and `-1\/4`/);
assert.match(reciprocal,/`±\(1\+i\)\/√2`/);
assert.match(reciprocal,/`±\(1−i\)\/√2`/);
assert.ok(reciprocal.includes(phase));
assert.match(reciprocal,/Λ₁[^\n]+Λ₂/);
assert.match(reciprocal,english?/the original BC parameter entered in the workbench/:/工作台输入的原 BC 参数/);
assert.match(reciprocal,/\b2\.900608\b/);

console.log(`CIF axis setting lesson (${english?'English':'Chinese'}): canonical classroom handoff, document, and inactive neighboring lesson passed.`);
