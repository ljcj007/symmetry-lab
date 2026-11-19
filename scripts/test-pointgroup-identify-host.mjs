import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,renderClassroomView} from '../dist/classroom-ui.js';

const lessonRoute='#classroom/foundations?tab=learn&lesson=thirty-two';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'));
const lessons=read('pointgroup-lessons'),atlas=read('pointgroup-atlas');
const initialFetch=globalThis.fetch;
let fetches=0;
globalThis.fetch=async url=>{
  fetches++;
  return {ok:true,json:async()=>String(url).includes('pointgroup-lessons')?lessons:atlas};
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
let masteryWrites=0;
globalThis.localStorage={getItem:()=>null,setItem:()=>masteryWrites++};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return Object.hasOwn(this.attributes,'open');},set(value){if(value)this.attributes.open='';else delete this.attributes.open;}});
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.scrollIntoView=function(){};
Element.prototype.insertAdjacentHTML=function(where,html){this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;};

const entry=page=>page.querySelector('[data-pointgroup-identify-entry]');
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
function chooseLesson(page,id){
  const picker=page.querySelector('#pg-chapter-select');
  picker.value=String(lessons.lessons.findIndex(l=>l.id===id));
  picker.onchange({target:picker});
}
function workshop(bindings){
  return {bindPointgroupIdentify(options){
    const {root,atlas:received,stateStore,isCurrent}=options;
    assert.equal(received,atlas);
    assert.ok(isCurrent());
    assert.ok(stateStore instanceof Map);
    const binding={options,disposed:0};
    bindings.push(binding);
    root.innerHTML='<input id="identify-draft"><button id="identify-open-atlas">View group</button><button id="identify-open-lab">View experiment</button>';
    const draft=root.querySelector('#identify-draft');
    draft.value=stateStore.get('draft')??'';
    draft.oninput=()=>{if(isCurrent())stateStore.set('draft',draft.value);};
    root.querySelector('#identify-open-atlas').onclick=()=>options.openGroup(15,'atlas');
    root.querySelector('#identify-open-lab').onclick=()=>options.openGroup(7,'lab');
    return ()=>{binding.disposed++;};
  }};
}

// Route through the real classroom shell and point-group renderer. The test
// controls child loading while using the real atlas, tabs and route serializer.
{
  const host=await import('../dist/pointgroup-ui.js?identify-host-normal');
  const page=new Container(),bindings=[],onNavigate=[];
  let imports=0;
  const choice=parseClassroomRoute(lessonRoute);
  assert.equal(choice.section,'pointgroups');
  assert.equal(choice.lesson,'thirty-two');
  const dispose=await renderClassroomView({container:page,route:lessonRoute,onNavigate:(hash,options)=>onNavigate.push({hash,options}),
    loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
    run:()=>assert.fail('Opening or identifying a group must not run the shared calculator'),
    courseRenderers:{pointgroups:options=>host.renderPointgroupView({...options,loadPointgroupIdentify:async()=>{imports++;return workshop(bindings);}})}});
  const sidebar=page.querySelector('.classroom-topics');
  assert.ok(sidebar.querySelectorAll('a').some(link=>link.getAttribute('href')?.replaceAll('&amp;','&')===lessonRoute));
  assert.ok(entry(page));
  assert.equal(entry(page).open,false);
  const lecture=page.querySelector('.pg-lesson').innerHTML;
  const exerciseAt=lecture.indexOf('data-pointgroup-identify-entry');
  assert.ok(lecture.indexOf('pg-objectives')<exerciseAt&&exerciseAt<lecture.indexOf('pg-lesson-section'),'The folded exercise must be visible before the long lesson sections');
  assert.equal(fetches,2,'The workshop uses the same atlas and course catalogs already fetched by the lesson');
  assert.equal(imports,0);
  const before=host.getPointgroupResult();
  await setOpen(page,true);
  assert.equal(imports,1);
  const draft=page.querySelector('#identify-draft');
  draft.value='Check the plane before naming the group.';
  draft.oninput();
  bindings[0].options.openGroup(100,'atlas');
  bindings[0].options.openGroup(15,'quiz');
  assert.equal(onNavigate.length,0,'Only a real atlas ID and atlas/lab target may hand off');
  assert.deepEqual(host.getPointgroupResult(),before);

  click(page,'identify-open-atlas');
  assert.equal(bindings[0].disposed,1);
  assert.equal(bindings[0].options.isCurrent(),false);
  assert.equal(page.querySelector('#pg-group-detail')!==null,true);
  assert.equal(host.getPointgroupResult().pointGroup.id,15);
  assert.equal(document.activeElement,page.querySelector('#pg-content'));
  assert.equal(onNavigate.at(-1).options.render,false);
  assert.equal(parseClassroomRoute(onNavigate.at(-1).hash).tab,'atlas');
  assert.equal(parseClassroomRoute(onNavigate.at(-1).hash).lesson,'thirty-two');
  assert.equal(parseClassroomRoute(onNavigate.at(-1).hash).group,'15');
  bindings[0].options.openGroup(7,'lab');
  assert.equal(host.getPointgroupResult().pointGroup.id,15,'A detached choice cannot navigate');

  click(page,'pg-return-lesson');
  await flush();
  assert.equal(page.querySelector('#identify-draft').value,draft.value);
  click(page,'identify-open-lab');
  assert.equal(parseClassroomRoute(onNavigate.at(-1).hash).tab,'lab');
  assert.equal(host.getPointgroupResult().pointGroup.id,7);
  click(page,'pg-return-lesson');
  await flush();
  setOpen(page,false);
  assert.equal(page.querySelector('#identify-draft'),null);
  const prior=imports;
  chooseLesson(page,'representations');
  assert.equal(entry(page),null);
  assert.ok(page.querySelector('[data-representation-actions-entry]'));
  chooseLesson(page,'group-basics');
  assert.ok(page.querySelector('[data-composition-entry]'));
  chooseLesson(page,'thirty-two');
  await flush();
  assert.equal(entry(page).open,false);
  assert.equal(imports,prior);
  await setOpen(page,true);
  assert.equal(page.querySelector('#identify-draft').value,draft.value);
  dispose();
  assert.equal(bindings.at(-1).disposed,1);
}

// A failed optional import can be retried. Closing, leaving the lesson, or
// disposing the renderer between request and response must suppress late work.
{
  const host=await import('../dist/pointgroup-ui.js?identify-host-retry');
  const page=new Container(),bindings=[];
  let imports=0;
  const dispose=await host.renderPointgroupView({container:page,selection:parseClassroomRoute(lessonRoute),loadPointgroupIdentify:async()=>{
    if(++imports===1)throw Error('Transient failure');
    return workshop(bindings);
  }});
  await setOpen(page,true);
  const retry=page.querySelector('[data-pointgroup-identify-retry]');
  assert.ok(retry);
  await retry.onclick();
  assert.equal(imports,2);
  assert.equal(bindings.length,1);
  dispose();
}
for(const selection of ['close','lesson','dispose','replacement']){
  const host=await import('../dist/pointgroup-ui.js?identify-host-late-'+selection);
  const page=new Container(),bindings=[];
  let release;
  const pendingModule=new Promise(resolve=>{release=resolve;});
  const options={container:page,selection:parseClassroomRoute(lessonRoute),loadPointgroupIdentify:()=>pendingModule};
  const dispose=await host.renderPointgroupView(options);
  const pending=setOpen(page,true);
  await flush();
  if(selection==='close')setOpen(page,false);
  if(selection==='lesson')chooseLesson(page,'projection');
  if(selection==='dispose')dispose();
  if(selection==='replacement')await host.renderPointgroupView({...options,selection:{tab:'learn',lesson:'projection'}});
  release(workshop(bindings));
  await pending;
  assert.equal(bindings.length,0,selection);
  assert.equal(page.querySelector('#identify-draft'),null,selection);
  dispose();
}

// Exercise the shipped binder and data through the default import and the
// real point-group renderer, rather than leaving the route covered by stubs.
{
  const catalog=read('pointgroup-identify'),fetchCourse=globalThis.fetch;
  let catalogFetches=0;
  globalThis.fetch=async url=>{
    if(String(url).includes('pointgroup-identify.json')){
      catalogFetches++;
      return {ok:true,json:async()=>catalog};
    }
    return fetchCourse(url);
  };
  const host=await import('../dist/pointgroup-ui.js?identify-host-shipped');
  const page=new Container(),routes=[];
  const dispose=await host.renderPointgroupView({container:page,selection:parseClassroomRoute(lessonRoute),onNavigate:patch=>routes.push(patch)});
  assert.equal(catalogFetches,0);
  await setOpen(page,true);
  await flush();
  assert.equal(catalogFetches,1);
  assert.equal(page.querySelector('#pgi-atlas'),null);
  click(page,'pgi-full');
  const options=page.querySelector('#pgi-answer');
  const firstExercise=catalog.exercises[0];
  assert.equal(firstExercise.groupId,7,'The introductory first exercise is the atlas mm2 example');
  options.value=String(firstExercise.groupId);
  options.onchange({target:options});
  click(page,'pgi-review');
  assert.ok(page.querySelector('#pgi-review-feedback'));
  click(page,'pgi-atlas');
  assert.equal(routes.at(-1).tab,'atlas');
  assert.equal(routes.at(-1).group,String(firstExercise.groupId));
  assert.equal(host.getPointgroupResult().pointGroup.id,firstExercise.groupId);
  click(page,'pg-return-lesson');
  await flush();
  assert.equal(catalogFetches,1,'Returning may reuse verified teaching data');
  assert.ok(page.querySelector('#pgi-review-feedback'),'Work remains intact on return from the atlas');
  click(page,'pgi-lab');
  assert.equal(routes.at(-1).tab,'lab');
  assert.equal(host.getPointgroupResult().pointGroup.id,firstExercise.groupId);
  dispose();
}
assert.equal(masteryWrites,0);
globalThis.fetch=initialFetch;
console.log('Point-group identification host passed lazy loading, canonical lesson, atlas and lab navigation, draft retention, retries, stale imports and unchanged quiz writes.');
