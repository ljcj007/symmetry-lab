import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderClassroomView,parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
const resource=JSON.parse(fs.readFileSync(new URL('data/material-observables.json',edition),'utf8'));
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(resource)});
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Navigation cannot change course progress')};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(position,html){
 const fragment=new Element();fragment.innerHTML=html;
 const parent=position==='afterbegin'?this:this.parentNode;
 const index=position==='afterbegin'?0:parent.children.indexOf(this)+1;
 for(const child of fragment.children)child.parentNode=parent;
 parent.children.splice(index,0,...fragment.children);
};
const runs=[];
async function mount(route){
 const page=new Container(),visited=[];
 await renderClassroomView({container:page,route,onNavigate:hash=>visited.push(hash),run:async(action,input)=>{
  runs.push({action,input:structuredClone(input)});throw Error('Capture only');
 }});
 const ctl=name=>page.querySelector('#obs-'+name);
 return {ctl,visited,link:()=>page.querySelector('[data-obs-tensor-context="neumann"]'),
  update(name,value){const target=ctl(name);target.value=value;ctl('form').oninput({target});},
  values(names){return Object.fromEntries(names.map(name=>[name,ctl(name).value]));},
  submit:async()=>{await ctl('form').onsubmit({preventDefault(){}});await flush();}};
}
const classroom='#classroom/observables?lesson=neumann&material=silicon';
const recipe={lesson:'neumann',exercise:'tensor-constraints',material:'silicon',tensor:'dielectric'};
const generic='#compute/tensors?material=silicon';
const related=view=>(view.link().href??view.link().getAttribute('href')).replaceAll('&amp;','&');
const activation={defaultPrevented:false,button:0};
function altered(route,key,newValue,{duplicate=false}={}){
 const [path,query]=route.split('?'),params=new URLSearchParams(query);
 if(duplicate)params.append(key,newValue);
 else if(newValue===null)params.delete(key);
 else params.set(key,newValue);
 return path+'?'+params;
}
const genericTool=await mount(generic);
assert.equal(genericTool.ctl('tensor').value,'piezoelectric');
const lesson=await mount(classroom);
assert.deepEqual(new URLSearchParams(related(lesson).split('?')[1]).get('tensor'),'dielectric');
lesson.ctl('learn-exercise').onclick();
assert.equal(lesson.ctl('exercise').value,recipe.exercise);
await lesson.ctl('flow-lab').onclick();
assert.deepEqual(lesson.values(['preset','tensor','material']),{preset:'cubic_m3m',tensor:'dielectric',material:'silicon'});
for(const [name,value] of Object.entries({preset:'tetragonal_4mm',plane:'xz',angle:'35',field:'[0, 1, 0]',parameters:'{'})){
 lesson.update(name,value);
}
const draft=lesson.values(['preset','tensor','material','plane','angle','field','parameters']);
const origin=lesson.visited.at(-1),destination=related(lesson);
for(const route of [origin,destination]){
 const context=parseClassroomRoute(route);
 for(const [key,want] of Object.entries({...recipe,preset:draft.preset}))assert.equal(context[key],want,key);
 assert.doesNotMatch(decodeURIComponent(route),/field|parameters|\[0, 1, 0\]/);
}

// A modified click leaves the ordinary hash link usable without copying the local draft.
lesson.link().onclick({...activation,ctrlKey:true});
const fresh=await mount(destination);
assert.equal(fresh.ctl('preset').value,draft.preset);
assert.equal(fresh.ctl('tensor').value,draft.tensor);
assert.equal(fresh.ctl('parameters').value,'{}');

lesson.link().onclick(activation);
const unrelated=await mount(generic);
assert.equal(unrelated.ctl('tensor').value,'piezoelectric');
assert.equal(unrelated.ctl('parameters').value,'{}');
unrelated.ctl('material').onchange({target:{value:'gaas'}});
// Raw selection keys must match, even when the displayed form falls back to
// the same default material, exercise, tensor, or allowed group.
for(const route of [origin,destination]){
 for(const key of ['lesson','exercise','material','preset','tensor']){
  for(const newValue of ['unrecognized',null]){
   const wrong=await mount(altered(route,key,newValue));
   if(wrong.ctl('tensor')){
    assert.equal(wrong.ctl('field').value,'[1,0,0]',key+' must not pick up the exact draft');
    assert.equal(wrong.ctl('parameters').value,'{}',key+' must not pick up the malformed draft');
   }
  }
  const duplicate=await mount(altered(route,key,'unrecognized',{duplicate:true}));
  assert.equal(duplicate.ctl('field').value,'[1,0,0]',key+' duplicate must be isolated');
 }
 for(const [key,newValue] of [['material','gaas'],['exercise','piezo-shear'],['preset','cubic_m3m'],['tensor','elasticity']]){
  const similar=await mount(altered(route,key,newValue));
  assert.equal(similar.ctl('field').value,'[1,0,0]',key+' different registered selection must be isolated');
 }
}
const tool=await mount(destination);
assert.deepEqual(tool.values(Object.keys(draft)),draft);
await tool.submit();
assert.match(tool.ctl('output').innerHTML,/role="alert"/);
assert.equal(runs.length,0);
tool.update('field','[0, 0, 1]');
tool.update('parameters','{"a1":');
const editedTool=tool.values(Object.keys(draft));
const course=await mount(origin);
assert.deepEqual(course.values(Object.keys(draft)),draft,'Back retains the original classroom copy');
course.update('field','[0, 1, 1]');
const editedCourse=course.values(Object.keys(draft));
const forward=await mount(destination);
assert.deepEqual(forward.values(Object.keys(draft)),editedTool,'Forward restores the calculator edits instead of the classroom copy');
tool.update('field','[9, 9, 9]');
const afterOldInput=await mount(destination);
assert.deepEqual(afterOldInput.values(Object.keys(draft)),editedTool,'Older controls cannot change the calculator draft');
await afterOldInput.submit();
assert.equal(runs.length,0);
const secondCourse=await mount(origin);
assert.deepEqual(secondCourse.values(Object.keys(draft)),editedCourse);
secondCourse.link().onclick(activation);
const secondTool=await mount(destination);
assert.deepEqual(secondTool.values(Object.keys(draft)),editedTool,'Opening the same companion link does not replace the calculator draft');
secondTool.ctl('material').onchange({target:{value:'gaas'}});
assert.deepEqual(secondTool.values(['preset','tensor','material','parameters']),
 {preset:'zincblende_td',tensor:'piezoelectric',material:'gaas',parameters:'{"a1":1}'});
const afterReset=await mount(destination);
assert.equal(afterReset.ctl('field').value,'[1,0,0]','The previous calculator draft stays cleared after explicit case change');

const returned=await mount(origin);
assert.deepEqual(returned.values(Object.keys(draft)),editedCourse,'Returning keeps the classroom copy, even after changing the calculator case');
await returned.submit();
assert.equal(runs.length,0,'Invalid JSON remains blocked on the original view');
returned.update('parameters','{}');
await returned.submit();
assert.equal(runs.length,1);
assert.equal(runs[0].action,'tensors');
assert.deepEqual(runs[0].input.field,[0,1,1]);
assert.equal(runs[0].input.tensor,'dielectric');
assert.equal(runs[0].input.preset,'tetragonal_4mm');
assert.equal(runs[0].input.orientation_deg,35);
assert.equal(runs[0].input.plane,'xz');
const reopened=await mount(origin);
assert.equal(reopened.ctl('tensor').value,'dielectric','Copying or reloading the public route still selects its named model');
assert.equal(reopened.ctl('preset').value,'tetragonal_4mm');
assert.equal(reopened.ctl('parameters').value,'{}','The latest classroom edit survives another return');

const seeded=await mount(classroom);
await seeded.ctl('learn-lab').onclick();
seeded.update('field','[0, 0, 9]');
const sameDefault=seeded.visited.at(-1);
seeded.link().onclick(activation);
assert.equal((await mount(related(seeded))).ctl('field').value,'[0, 0, 9]');
const differentLessonCase=await mount(altered(classroom,'material','gaas'));
await differentLessonCase.ctl('learn-lab').onclick();
assert.equal((await mount(sameDefault)).ctl('field').value,'[0, 0, 9]','Explicit reset for another case leaves Silicon untouched');
const freshLecture=await mount(classroom);
await freshLecture.ctl('learn-lab').onclick();
assert.equal(freshLecture.ctl('field').value,'[1,0,0]');
assert.equal(freshLecture.visited.at(-1),sameDefault);
assert.equal((await mount(sameDefault)).ctl('field').value,'[1,0,0]','Reopening the freshly reset route must not revive the former default draft');
assert.equal((await mount(related(seeded))).ctl('field').value,'[1,0,0]');
console.log('Neumann tensor return ('+(english?'English':'Chinese')+'): strict named routes, independent repeated drafts, invalid input, detached owners and material reset passed.');
