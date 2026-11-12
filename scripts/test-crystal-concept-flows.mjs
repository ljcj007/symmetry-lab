import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';
Element.prototype.focus=function(){};Element.prototype.scrollIntoView=function(){};

const saved=new Map(),moves=[];
globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+String(url).split('?')[0].split('/').at(-1),import.meta.url),'utf8'))});
const exercises=JSON.parse(fs.readFileSync(new URL('../dist/data/symmetry-derivations.json',import.meta.url),'utf8')).exercises;
const {renderSymmetryCourseView}=await import('../dist/symmetry-course-ui.js?concept-flows');
const page=new Container(),$=selector=>page.querySelector(selector),progress=id=>JSON.parse(saved.get('symmetry-lab.academy.derivations.v1')||'{}')[id];
for(const [lesson,track,id] of [['space-04','space','space-pminus1-orbit-stabilizer'],['color-03','color','color-swap-antilinear-time-reversal']]){
 await renderSymmetryCourseView({container:page,selection:{pathway:'crystal',lesson,track,tab:'learn'},onNavigate:patch=>moves.push(patch)});
 await $('#sc-chapter-derive').onclick();
 assert.equal($('#sc-derive-select').value,id);assert.equal(moves.at(-1).lesson,lesson);assert.equal(moves.at(-1).exercise,id);
 assert.equal($('#sc-derive-lab'),null);assert.equal($('#sc-derive-material'),null,'Concept-only exercises do not claim an unrelated experiment');
 const exercise=exercises.find(item=>item.id===id);
 assert.equal($('#sc-derive-answer').disabled,true);
 const oldNext=$('#sc-derive-next');oldNext.onclick();assert.equal(progress(id).revealed,1);
 oldNext.onclick();assert.equal(progress(id).revealed,1,'A detached earlier step cannot advance progress twice');
 for(let step=1;step<exercise.steps.length;step++)$('#sc-derive-next').onclick();
 assert.equal(progress(id).revealed,exercise.steps.length);assert.equal($('#sc-derive-answer').disabled,false);
 $('#sc-derive-answer').onclick();assert.ok($('#sc-derive-conclusion'));
 const choose=index=>page.querySelectorAll('input[name="sc-derive-choice"]').find(input=>Number(input.value)===index).onchange();
 choose(exercise.check.answer);$('#sc-derive-check').onclick();assert.equal(progress(id).checked,true);
 const staleCheck=$('#sc-derive-check'),staleReset=$('#sc-derive-reset');
 choose((exercise.check.answer+1)%exercise.check.choices.length);assert.equal(progress(id).checked,false);
 staleCheck.onclick();staleReset.onclick();assert.equal(progress(id).checked,false);assert.equal(progress(id).revealed,exercise.steps.length);
 const staleSelect=$('#sc-derive-select');page.innerHTML='<p>Left the lesson</p>';
 staleSelect.onchange({target:{value:exercises[0].id}});assert.equal(page.innerHTML,'<p>Left the lesson</p>');
}
console.log('Crystal concept flows: both originating lessons, correct exercises, six/seven sequential steps, gated conclusions, check revocation, no false lab links, and detached controls passed.');
