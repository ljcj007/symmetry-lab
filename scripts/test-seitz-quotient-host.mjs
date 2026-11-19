import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,renderClassroomView} from '../dist/classroom-ui.js';

const lessonRoute='#classroom/crystal?tab=learn&lesson=space-01&track=space';
const pointgroupRoute='#classroom/foundations?tab=learn&lesson=thirty-two';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'));
const lessons=read('symmetry-course-lessons'),atlas=read('symmetry-course-atlas');
const initialFetch=globalThis.fetch;
const fetched=[];
async function fetchCourse(url){
  const path=String(url);
  fetched.push(path);
  if(path.includes('symmetry-course-lessons.json'))return {ok:true,json:async()=>lessons};
  if(path.includes('symmetry-course-atlas.json'))return {ok:true,json:async()=>atlas};
  assert.fail('Unrequested resource: '+path);
}
globalThis.fetch=fetchCourse;
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
let masteryWrites=0;
globalThis.localStorage={getItem:()=>null,setItem:()=>masteryWrites++};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return Object.hasOwn(this.attributes,'open');},set(value){if(value)this.attributes.open='';else delete this.attributes.open;}});
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.scrollIntoView=function(){};
Element.prototype.insertAdjacentHTML=function(where,html){this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;};

const entry=page=>page.querySelector('[data-seitz-quotient-entry]');
function setOpen(page,value){
  const node=entry(page);
  assert.ok(node);
  node.open=value;
  return node.ontoggle();
}
function click(page,id){
  const node=page.querySelector('#'+id);
  assert.ok(node,id);
  return node.onclick({preventDefault(){}});
}
function select(page,id,value){
  const node=page.querySelector('#'+id);
  assert.ok(node,id);
  node.value=String(value);
  return node.onchange({target:node});
}
function chooseLesson(page,id){
  const picker=page.querySelector('#sc-chapter-select');
  picker.value=String(lessons.lessons.findIndex(l=>l.id===id));
  picker.onchange({target:picker});
}
function hasLink(page,href){
  return page.querySelectorAll('a').some(link=>link.getAttribute('href')?.replaceAll('&amp;','&')===href);
}
function workshop(bindings){
  return {bindSeitzQuotient(options){
    const {root,stateStore,isCurrent,openGroup}=options;
    assert.ok(isCurrent());
    assert.ok(stateStore instanceof Map);
    const binding={options,disposed:0};
    bindings.push(binding);
    root.innerHTML='<input id="quotient-draft"><button id="quotient-gamma">View Γ calculation</button><button id="quotient-boundary">View boundary calculation</button>';
    const draft=root.querySelector('#quotient-draft');
    draft.value=stateStore.get('draft')??'';
    draft.oninput=()=>{if(isCurrent())stateStore.set('draft',draft.value);};
    root.querySelector('#quotient-gamma').onclick=()=>openGroup(3);
    root.querySelector('#quotient-boundary').onclick=()=>openGroup(4,{k:[0,0,.5]});
    return ()=>{binding.disposed++;};
  }};
}

// Nest the real crystal course inside its classroom shell. The controlled
// child isolates the host lifecycle and the public calculator handoff.
{
  const host=await import('../dist/symmetry-course-ui.js?seitz-host-normal');
  const page=new Container(),bindings=[],handoffs=[],routes=[];
  let imports=0;
  const selection=parseClassroomRoute(lessonRoute);
  assert.equal(selection.section,'academy');
  assert.equal(selection.lesson,'space-01');
  const dispose=await renderClassroomView({container:page,route:lessonRoute,
    run:()=>assert.fail('Workshop navigation must not start a calculation'),openGroup:spec=>handoffs.push(spec),
    onNavigate:(hash,options)=>routes.push({hash,options}),loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
    courseRenderers:{academy:options=>host.renderSymmetryCourseView({...options,loadSeitzQuotientModule:async()=>{imports++;return workshop(bindings);}})}});
  const lecture=page.querySelector('.sc-lesson').innerHTML;
  const practiceAt=lecture.indexOf('data-seitz-quotient-entry');
  assert.ok(lecture.indexOf('sc-objectives')<practiceAt&&practiceAt<lecture.indexOf('sc-lesson-section'));
  assert.ok(hasLink(page,pointgroupRoute));
  assert.equal(entry(page).open,false);
  assert.equal(fetched.length,2);
  assert.equal(imports,0);
  await setOpen(page,true);
  assert.equal(imports,1);
  const draft=page.querySelector('#quotient-draft');
  draft.value='Both products have the identity linear part.';
  draft.oninput();
  const original=host.getSymmetryCourseResult();
  bindings[0].options.openGroup('4');
  bindings[0].options.openGroup(231);
  bindings[0].options.openGroup(4,{k:[0,NaN,0]});
  bindings[0].options.openGroup(4,{k:[0,0]});
  bindings[0].options.openGroup(4,{k:new Array(3)});
  bindings[0].options.openGroup(4,{k:[0,0,101]});
  assert.equal(handoffs.length,0);
  click(page,'quotient-gamma');
  click(page,'quotient-boundary');
  assert.deepEqual(handoffs,[{mode:'sg',id:3,k:[0,0,0],doubleValued:false,manual:true},{mode:'sg',id:4,k:[0,0,.5],doubleValued:false,manual:true}]);
  assert.deepEqual(host.getSymmetryCourseResult(),original);
  click(page,'sc-tab-quiz');
  assert.equal(entry(page),null);
  assert.equal(bindings[0].disposed,1);
  bindings[0].options.openGroup(4);
  assert.equal(handoffs.length,2);
  assert.equal(parseClassroomRoute(routes.at(-1).hash).lesson,'space-01');
  click(page,'sc-return-lesson');
  await flush();
  assert.equal(page.querySelector('#quotient-draft').value,draft.value);
  for(const id of ['space-02','space-03']){
    chooseLesson(page,id);
    assert.equal(entry(page),null);
    assert.ok(hasLink(page,lessonRoute));
  }
  chooseLesson(page,'space-01');
  await flush();
  assert.equal(page.querySelector('#quotient-draft').value,draft.value);
  setOpen(page,false);
  assert.equal(page.querySelector('#quotient-draft'),null);
  await setOpen(page,true);
  assert.equal(page.querySelector('#quotient-draft').value,draft.value);
  dispose();
  assert.equal(bindings.at(-1).disposed,1);
  bindings.at(-1).options.openGroup(4);
  assert.equal(handoffs.length,2);
}

// The existing shell retains the original renderer's disposer after a failed
// catalogue load. The disposer must retire the visible retry child as well.
{
  const host=await import('../dist/symmetry-course-ui.js?seitz-host-retry');
  const page=new Container(),bindings=[];
  let tryCourse=0,tryWorkshop=0;
  globalThis.fetch=async url=>{
    if(++tryCourse===1)return {ok:false,status:503};
    return fetchCourse(url);
  };
  const dispose=await renderClassroomView({container:page,route:lessonRoute,loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
    courseRenderers:{academy:options=>host.renderSymmetryCourseView({...options,loadSeitzQuotientModule:async()=>{
      if(++tryWorkshop===1)throw Error('Temporary failure');
      return workshop(bindings);
    }})}});
  assert.equal(typeof dispose,'function');
  const courseRetry=page.querySelector('.sc-retry');
  assert.ok(courseRetry);
  await courseRetry.onclick();
  await flush();
  if(entry(page).open===false)await setOpen(page,true);
  const optionalRetry=page.querySelector('[data-seitz-quotient-retry]');
  assert.ok(optionalRetry);
  await optionalRetry.onclick();
  assert.equal(tryWorkshop,2);
  assert.equal(bindings.length,1);
  dispose();
  assert.equal(bindings[0].disposed,1);
  assert.equal(bindings[0].options.isCurrent(),false);
  globalThis.fetch=fetchCourse;
}

for(const destination of ['collapse','lesson','disposal','replacement']){
  const host=await import('../dist/symmetry-course-ui.js?seitz-host-late-'+destination);
  const page=new Container(),bindings=[];
  let finish;
  const loading=new Promise(resolve=>{finish=resolve;});
  const options={container:page,selection:parseClassroomRoute(lessonRoute),loadSeitzQuotientModule:()=>loading};
  const dispose=await host.renderSymmetryCourseView(options);
  const open=setOpen(page,true);
  await flush();
  if(destination==='collapse')setOpen(page,false);
  if(destination==='lesson')chooseLesson(page,'space-02');
  if(destination==='disposal')dispose();
  if(destination==='replacement')await host.renderSymmetryCourseView({...options,selection:{tab:'learn',lesson:'space-02'}});
  finish(workshop(bindings));
  await open;
  assert.equal(bindings.length,0,destination);
  assert.equal(page.querySelector('#quotient-draft'),null,destination);
  dispose();
}

// Exercise the production loader and actual calculator handoff while the
// real module composes BC representatives from the existing space-group data.
{
  const source=read('space-groups'),sourceFetches=[];
  globalThis.fetch=async url=>{
    if(String(url).endsWith('/space-groups.json')){
      sourceFetches.push(String(url));
      return {ok:true,json:async()=>source};
    }
    return fetchCourse(url);
  };
  const host=await import('../dist/symmetry-course-ui.js?seitz-host-shipped');
  const page=new Container(),handoffs=[];
  const dispose=await renderClassroomView({container:page,route:lessonRoute,
    run:()=>assert.fail('The workshop uses the local Seitz module'),openGroup:spec=>handoffs.push(spec),
    loadProgression:async()=>({progressionForSelection:()=>({current:null})}),courseRenderers:{academy:host.renderSymmetryCourseView}});
  await setOpen(page,true);
  assert.equal(sourceFetches.length,0,'Opening the entry does not read the 230 space-group source');
  select(page,'sq-guess','second');
  await click(page,'sq-check-prediction');
  assert.ok(page.querySelector('#sq-starter-result'));
  assert.deepEqual(sourceFetches,['data/space-groups.json']);
  const allGroups=page.querySelector('#sq-tabs');
  allGroups.open=true;
  await allGroups.ontoggle({target:allGroups});
  select(page,'sq-space-group',7);
  select(page,'sq-k-x',2);
  select(page,'sq-k-z',0);
  assert.deepEqual(handoffs,[]);
  click(page,'sq-show-product');
  assert.ok(page.querySelector('#sq-product-result'));
  click(page,'sq-open-calculation');
  assert.deepEqual(handoffs,[{mode:'sg',id:7,k:[.5,0,0],doubleValued:false,manual:true}]);
  const lateHandoff=page.querySelector('#sq-open-calculation').onclick;
  click(page,'sc-tab-quiz');
  lateHandoff();
  assert.equal(handoffs.length,1);
  click(page,'sc-return-lesson');
  await flush();
  assert.ok(page.querySelector('#sq-product-result'),'Work survives browsing away from the lesson');
  assert.equal(sourceFetches.length,1);
  dispose();
}
assert.equal(masteryWrites,0);
globalThis.fetch=initialFetch;
console.log('Seitz quotient host passed nested classroom routing, manual SG handoff at Γ and the boundary, independent drafts, stable retries, stale import retirement and quiz isolation.');
