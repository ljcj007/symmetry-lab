import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run the production module against an inert DOM. This isolates loader races and
// stored-progress validation without adding a browser or a test dependency.
const atlas=JSON.parse(fs.readFileSync(new URL('../dist/data/symmetry-course-atlas.json',import.meta.url),'utf8'));
const lessons={
  tracks:[{id:'space',title:'Fixture track',summary:'Fixture'}],
  sources:[{id:'fixture',title:'Fixture source',url:'https://example.org/source'}],
  lessons:[{id:'fixture',track:'space',title:'01 Fixture lesson',summary:'Fixture',objectives:[],sections:[],references:[],
    quiz:Array.from({length:8},(_,i)=>({question:`Question ${i}`,choices:['Correct','Incorrect'],answer:0,explanation:'Fixture explanation'}))}]
};
const materials={materials:[{id:'fixture',name:'Material fixture',formula:'NaCl',category:'Fixture',phase:'Fixture phase',spaceGroup:{number:1,symbol:'P1',setting:'Fixture'},summary:'Fixture',physics:'Fixture',limitations:[],sections:[],sourceIds:[],model:{cell:[[1,0,0],[0,1,0],[0,0,1]],convention:'Fixture',atoms:[{id:'Na1',element:'Na',frac:[0,0,0],moment:[0,0,1]}],operations:[{id:'E',label:'Identity',rotation:[[1,0,0],[0,1,0],[0,0,1]],translation:[0,0,0],timeReversal:false,explanation:'Fixture'}]}}],sources:[]};
const derivations={exercises:[{id:'derive-fixture',track:'space',title:'Derivation fixture',materialId:'fixture',prompt:'Try the derivation',givens:['Given data'],hint:'Hidden hint content',steps:[{title:'First step',explanation:'First revealed content'},{title:'Second step',explanation:'Second revealed content'}],answer:'Hidden final conclusion',pitfall:'Fixture pitfall',check:{question:'Fixture check',choices:['Yes','No'],answer:0,explanation:'Checked derivation explanation'}}]};

const dataResponse=url=>({ok:true,json:async()=>url.includes('symmetry-materials')?materials:url.includes('symmetry-derivations')?derivations:url.includes('lessons')?lessons:atlas});
const camel=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element {
  constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};this.classList={remove:()=>{}};for(const [name,value] of Object.entries(attributes))if(name.startsWith('data-'))this.dataset[camel(name.slice(5))]=value;this.value=attributes.value||'';this.checked=attributes.checked!==undefined;}
  set innerHTML(value){
    for(const child of this.children)child.parentNode=null;
    this.html=value;this.children=[];
    const stack=[this],voidTags=new Set(['input','br','hr','img','meta','link','source','wbr','area','base','col','embed','param','track']);
    for(const match of value.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){
      const tag=match[2].toLowerCase();
      if(match[1]){while(stack.length>1){const closed=stack.pop();if(closed.tag===tag)break;}continue;}
      const attributes={};
      for(const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attributes[attr[1]]=attr[2]??'';
      const parent=stack.at(-1),child=new Element(tag,attributes,parent);parent.children.push(child);
      if(!voidTags.has(tag)&&!match[3].endsWith('/'))stack.push(child);
    }
  }
  get innerHTML(){return this.html||'';}
  matches(selector){
    if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);
    if(selector.startsWith('.'))return String(this.attributes.class||'').split(/\s+/).includes(selector.slice(1));
    if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;
    const attr=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);
    return !!attr&&(!attr[1]||attr[1]===this.tag)&&Object.hasOwn(this.attributes,attr[2])&&(attr[3]===undefined||this.attributes[attr[2]]===attr[3]);
  }
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  focus(){}
  scrollIntoView(){}
  checkValidity(){return true;}
}
class Container {
  set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.html=value;this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}
}

globalThis.localStorage={getItem:()=>'{invalid',setItem:()=>{}};
const waiting=[];
globalThis.fetch=url=>new Promise(resolve=>waiting.push({url,resolve}));
const race=await import('../dist/symmetry-course-ui.js?loader-race');
assert.equal(race.getSymmetryCourseResult(),null,'Export is unavailable until the teaching data has loaded');
const container=new Container();
const pending=race.renderSymmetryCourseView({container});
assert.equal(waiting.length,2);
container.innerHTML='<p>Unrelated scientific tool</p>';
for(const item of waiting)item.resolve(dataResponse(item.url));
await pending;
assert.equal(container.html,'<p>Unrelated scientific tool</p>','A completed background fetch must not replace a different active tool');
const exported=race.getSymmetryCourseResult();
assert.equal(exported.kind,'space-double-magnetic-group-teaching');
assert.equal(exported.selectedGroup.mode,'sg');
assert.equal(exported.selectedGroup.data.number,1);
assert.equal(exported.experiment,null);
assert.deepEqual(exported.sources,lessons.sources);

globalThis.fetch=async()=>({ok:false,status:503});
const retry=await import('../dist/symmetry-course-ui.js?loader-retry');
const errorContainer=new Container();
await retry.renderSymmetryCourseView({container:errorContainer});
assert.match(errorContainer.firstElementChild.innerHTML,/503/);
const retryButton=errorContainer.firstElementChild.querySelector('.sc-retry');
assert.equal(typeof retryButton.onclick,'function');
const retries=[];
globalThis.fetch=url=>new Promise(resolve=>retries.push({url,resolve}));
const retried=retryButton.onclick();
assert.equal(retries.length,2,'A failed fetch must clear the rejected cached promise so the button can retry');
errorContainer.innerHTML='<p>Left during retry</p>';
for(const item of retries)item.resolve(dataResponse(item.url));
await retried;
assert.equal(errorContainer.html,'<p>Left during retry</p>','A late successful retry must respect navigation');
assert.equal(retry.getSymmetryCourseResult().selectedGroup.data.number,1);
retryButton.onclick();
assert.equal(retries.length,2,'A detached retry button must not start another load');

globalThis.fetch=async url=>dataResponse(url);
for(const [index,saved] of ['null','[]','"wrong format"','12','{broken'].entries()){
  globalThis.localStorage={getItem:()=>saved,setItem:()=>{}};
  const module=await import(`../dist/symmetry-course-ui.js?bad-progress-${index}`);
  const page=new Container();
  await module.renderSymmetryCourseView({container:page});
  page.firstElementChild.querySelector('#sc-tab-quiz').onclick();
  assert.match(page.firstElementChild.querySelector('#sc-content').innerHTML,/<strong>0<small> \/ 8<\/small>/,'Malformed stored progress must not produce false completion');
}

let savedProgress;
const mixed={
  'fixture:0':{selected:0,checked:true},
  'fixture:1':{selected:'0',checked:true},
  'fixture:2':{selected:0,checked:'true'},
  'fixture:3':{selected:99,checked:true},
  'fixture:4':{selected:-1,checked:true},
  'fixture:5':{selected:.5,checked:true},
  'fixture:6':{selected:0,checked:false},
  'fixture:7':{selected:1,checked:true},
  'unknown:0':{selected:0,checked:true}
};
globalThis.localStorage={getItem:()=>JSON.stringify(mixed),setItem:(_,value)=>{savedProgress=JSON.parse(value);}};
const progress=await import('../dist/symmetry-course-ui.js?validated-progress');
const progressContainer=new Container(),downloads=[];
await progress.renderSymmetryCourseView({container:progressContainer,download:(content,name)=>downloads.push({content,name})});
const root=progressContainer.firstElementChild;
root.querySelector('#sc-tab-quiz').onclick();
const quizHTML=root.querySelector('#sc-content').innerHTML;
assert.match(quizHTML,/<strong>1<small> \/ 8<\/small>/,'Only a checked, correct, well-typed saved answer counts as mastered');
assert.equal((quizHTML.match(/class="sc-question is-correct"/g)||[]).length,1);
assert.equal((quizHTML.match(/class="sc-question is-incorrect"/g)||[]).length,1);
const changedAnswer=root.querySelectorAll('input[name="sc-answer-0-0"]')[1];
changedAnswer.onchange();
assert.deepEqual(Object.keys(savedProgress).sort(),['fixture:0','fixture:6','fixture:7'],'Unknown questions and malformed answer entries must be discarded before progress is saved again');
assert.deepEqual(savedProgress['fixture:0'],{selected:1,checked:false},'Changing an answer clears its checked status');

root.querySelector('#sc-tab-atlas').onclick();
const selectedCard=root.querySelectorAll('[data-sc-group]').find(button=>button.dataset.scGroup==='2');
assert.ok(selectedCard,'The real 230-space-group catalog includes group 2');
selectedCard.onclick();
root.querySelector('#sc-export-group').onclick();
assert.equal(downloads.length,1);
assert.equal(downloads[0].name,'symmetry-course-sg-2.json');
const downloaded=JSON.parse(downloads[0].content);
assert.equal(downloaded.selectedGroup.data.number,2,'Downloaded teaching data must describe the selected card, not the initial selection');
assert.deepEqual(downloaded.selectedGroup.data,atlas.spaceGroups.find(group=>group.number===2));
assert.deepEqual(downloaded.sources,lessons.sources);

// New lesson assets are lazy: a failure in these files cannot block the
// original 15 lessons or their separate quiz records.
const settle=()=>new Promise(resolve=>setImmediate(resolve));
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.fetch=async url=>dataResponse(url);
const extensionRace=await import('../dist/symmetry-course-ui.js?extension-race');
const extensionContainer=new Container();
await extensionRace.renderSymmetryCourseView({container:extensionContainer});
const extensionRoot=extensionContainer.firstElementChild,extensionWaiting=[];
globalThis.fetch=url=>new Promise(resolve=>extensionWaiting.push({url,resolve}));
extensionRoot.querySelector('#sc-tab-materials').onclick();
assert.equal(extensionWaiting.length,2,'The new assets are requested on entering a new tab');
extensionRoot.querySelector('#sc-tab-quiz').onclick();
for(const item of extensionWaiting)item.resolve(dataResponse(item.url));
await settle();
assert.match(extensionRoot.querySelector('#sc-content').innerHTML,/sc-quizzes/);
assert.doesNotMatch(extensionRoot.querySelector('#sc-content').innerHTML,/sc-material-cards/,'A late material fetch must not overwrite a quiz');

const writes={};
globalThis.localStorage={getItem:key=>key.includes('derivations')?JSON.stringify({'derive-fixture':{revealed:99,hint:'yes',showAnswer:true,selected:20,checked:true},unknown:{revealed:1}}):JSON.stringify({'fixture:0':{selected:0,checked:true}}),setItem:(key,value)=>{writes[key]=JSON.parse(value);}};
globalThis.fetch=async url=>dataResponse(url);
const extensionRetry=await import('../dist/symmetry-course-ui.js?extension-retry');
const derivationContainer=new Container();
let resolveCrystal;
await extensionRetry.renderSymmetryCourseView({container:derivationContainer,run:()=>new Promise(resolve=>{resolveCrystal=resolve;})});
const derivationRoot=derivationContainer.firstElementChild;
globalThis.fetch=async()=>({ok:false,status:503});
derivationRoot.querySelector('#sc-tab-derive').onclick();
await settle();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/503/);
const extensionRetryButton=derivationRoot.querySelector('#sc-extension-retry');
globalThis.fetch=async url=>dataResponse(url);
await extensionRetryButton.onclick();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/已展开 0 \/ 2 步/,'Invalid persisted derivation step counts reset safely');
assert.doesNotMatch(derivationRoot.querySelector('#sc-content').innerHTML,/Hidden final conclusion|First revealed content|Hidden hint content/,'Answers, hints and steps must not be revealed before a deliberate action');
derivationRoot.querySelector('#sc-derive-hint').onclick();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/Hidden hint content/);
derivationRoot.querySelector('#sc-derive-next').onclick();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/First revealed content/);
assert.doesNotMatch(derivationRoot.querySelector('#sc-content').innerHTML,/Second revealed content|Hidden final conclusion/);
derivationRoot.querySelector('#sc-derive-next').onclick();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/Second revealed content/);
assert.doesNotMatch(derivationRoot.querySelector('#sc-content').innerHTML,/Hidden final conclusion/,'Finishing the steps does not automatically reveal the conclusion');
derivationRoot.querySelector('#sc-derive-answer').onclick();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/Hidden final conclusion/);
derivationRoot.querySelectorAll('input[name="sc-derive-choice"]')[0].onchange();
derivationRoot.querySelector('#sc-derive-check').onclick();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/判断正确/);
assert.deepEqual(Object.keys(writes),['symmetry-lab.academy.derivations.v1'],'Derivation work must not overwrite the original quiz storage key');
assert.deepEqual(Object.keys(writes['symmetry-lab.academy.derivations.v1']),['derive-fixture'],'Unknown stored derivations must be discarded');
derivationRoot.querySelector('#sc-tab-quiz').onclick();
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/<strong>1<small> \/ 8<\/small>/,'Original quiz progress survives derivation interactions');

derivationRoot.querySelector('#sc-tab-materials').onclick();
await settle();
const crystalPending=derivationRoot.querySelector('#sc-crystal-form').onsubmit({preventDefault(){}});
assert.equal(typeof resolveCrystal,'function');
derivationRoot.querySelector('#sc-tab-quiz').onclick();
resolveCrystal({lab:'crystal',atoms:[]});
await crystalPending;
assert.match(derivationRoot.querySelector('#sc-content').innerHTML,/sc-quizzes/,'A delayed Python material result cannot overwrite navigation');
assert.equal(extensionRetry.getSymmetryCourseResult().materialExperiment,null,'Discarded material calculations must not enter exports');

const nestedWaiting=[];
globalThis.fetch=url=>new Promise(resolve=>nestedWaiting.push({url,resolve}));
const nested=await import('../dist/symmetry-course-ui.js?nested-hub-race');
const nestedContainer=new Container();nestedContainer.isConnected=true;
const nestedPending=nested.renderSymmetryCourseView({container:nestedContainer});
const nestedRoot=nestedContainer.firstElementChild,beforeNested=nestedRoot.innerHTML;
nestedContainer.isConnected=false;
for(const item of nestedWaiting)item.resolve(dataResponse(item.url));
await nestedPending;
assert.equal(nestedRoot.parentNode,nestedContainer);
assert.equal(nestedRoot.innerHTML,beforeNested,'Detached classroom subtree cannot accept a late lesson load');

// Exercise the real camera with supplied Cartesian data, rather than copying
// the camera formula into the test. Check interaction changes and cleanup.
const {createCrystalViewer}=await import('../dist/crystal-viewer.js');
const viewerData={operation:{label:'Fixture operation'},cellVertices:[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],latticeAxes:[{label:'a',start:[0,0,0],end:[1,0,0]}],atoms:[
  {id:'Na1',element:'Na',cartesian:[.1,.2,.3],moment:[0,0,1],transformed:{cartesianWrapped:[.9,.8,.7],cartesianUnwrapped:[1.9,.8,.7],moment:[0,0,-1]}},
  {id:'Cl1',element:'Cl',cartesian:[.6,.7,.8],moment:[0,0,0],transformed:{cartesianWrapped:[.4,.3,.2],cartesianUnwrapped:[1.4,.3,.2],moment:[0,0,0]}}
]};
const viewerContainer=new Element();let viewerCurrent=true;
const camera=createCrystalViewer({container:viewerContainer,data:viewerData,isCurrent:()=>viewerCurrent});
const cv=name=>viewerContainer.querySelector(`[data-cv="${name}"]`),surface=cv('stage'),scene=surface.querySelector('svg');
const beforeDrag=scene.innerHTML;
let captured=null,released=false;
surface.setPointerCapture=id=>{captured=id;};surface.hasPointerCapture=id=>captured===id;surface.releasePointerCapture=()=>{released=true;captured=null;};
surface.onpointerdown({button:0,pointerId:1,clientX:10,clientY:20,preventDefault(){}});
surface.onpointermove({pointerId:1,clientX:130,clientY:65});
assert.notEqual(scene.innerHTML,beforeDrag,'Dragging must change the projected 3D scene');
assert.notEqual(camera.getView().yaw,-32);
surface.onpointerup();
assert.equal(released,true,'Pointer capture is released after dragging');
const yawBefore=camera.getView().yaw;
surface.onkeydown({key:'ArrowLeft',preventDefault(){}});
assert.equal(camera.getView().yaw,yawBefore-5,'Keyboard rotation provides a pointer-free alternative');
cv('mode').value='transformed';cv('mode').onchange();
assert.match(scene.innerHTML,/stroke="#a67ee2"/);
assert.match(scene.innerHTML,/stroke="#6caa65"/,'Transformed-only atoms retain their element colors');
const wrappedScene=scene.innerHTML;
cv('wrapped').checked=false;cv('wrapped').onchange();
assert.notEqual(scene.innerHTML,wrappedScene,'Wrapping toggles the supplied Cartesian coordinates without recalculating symmetry');
cv('zoom').value='1.5';cv('zoom').oninput();
assert.equal(camera.getView().zoom,1.5);
cv('reset').onclick();
assert.equal(camera.getView().zoom,1);
assert.equal(camera.getView().yaw,-32);
viewerCurrent=false;surface.onpointermove({pointerId:1,clientX:200,clientY:100});
assert.equal(surface.onpointerdown,null);
assert.equal(surface.onpointermove,null,'Leaving the view clears pointer handlers');
camera.destroy();

console.log('Advanced course UI: loader/retry races, separate quiz and derivation progress, hidden sequential answers, selected exports, delayed Python isolation, 3D drag/keyboard/zoom/wrapping, element colors and pointer cleanup passed.');

// These are Python outputs, not JavaScript reconstructions of group algebra.
const groupCases=JSON.parse(fs.readFileSync(new URL('./fixtures/group-extensions-ui.json',import.meta.url),'utf8')).cases;
const realData=Object.fromEntries(['symmetry-course-lessons','symmetry-course-atlas','symmetry-materials','symmetry-derivations'].map(name=>[name,JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'))]));
globalThis.fetch=async url=>({ok:true,json:async()=>realData[url.split('/').at(-1).split('?')[0].replace('.json','')]});
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const groupsUI=await import('../dist/symmetry-course-ui.js?group-extension-fixtures'),groupDownloads=[],groupCalls=[],groupRoutes=[];
for(const [index,fixture] of groupCases.entries()){
  const groupPage=new Container(),input=fixture.input,lesson=realData['symmetry-course-lessons'].lessons.find(item=>item.lab===input.lab&&item.labPreset===input.preset);
  await groupsUI.renderSymmetryCourseView({container:groupPage,selection:{pathway:'spin',tab:'lab',lesson:lesson?.id,experiment:input.lab,preset:input.preset},onNavigate:patch=>groupRoutes.push(patch),run:async(action,payload)=>{groupCalls.push({action,payload});return fixture.result;},download:(text,name)=>groupDownloads.push({data:JSON.parse(text),name})});
  const root=groupPage.firstElementChild,$=selector=>root.querySelector(selector);
  $('#sc-group-preset').value=input.preset;$('#sc-group-steps').value=String(input.steps);
  if(input.lab==='double_group')$('#sc-group-kz').value=input.kz;else $('#sc-group-variant').value=input.variant;
  await $('#sc-lab-form').onsubmit({preventDefault(){}});
  assert.deepEqual(groupCalls.at(-1),{action:'teaching_labs',payload:input});
  assert.ok($('#sc-group-viewer').querySelector('svg'),'Every real Python preset has a 3D rendering');
  assert.match($('#sc-lab-output').innerHTML,/查看有限群表与复合约定/);
  if(fixture.result.dimension==='space')assert.match($('#sc-lab-output').innerHTML,/完整空间对称群是无限群/);
  if(input.lab==='spin_group')assert.match($('#sc-lab-output').innerHTML,/SOC 锁定/);
  if(input.variant==='spatial_only'||input.variant==='internal_only')assert.match($('#sc-lab-output').innerHTML,/这个操作破坏指定图案/,'A control variant opens at step 1, not the misleading identity frame');
  const yaw=root.querySelector('[data-gx="yaw"]');yaw.value='51';yaw.oninput();
  $('#sc-frame').oninput({target:{value:'2'}});
  assert.equal(root.querySelector('[data-gx="yaw"]').value,'51','Changing composition step preserves the camera');
  $('#sc-export-lab').onclick();assert.deepEqual(groupDownloads.at(-1).data.result,fixture.result);assert.deepEqual(groupDownloads.at(-1).data.input,input);assert.equal(groupDownloads.at(-1).data.camera.yaw,51);
  assert.equal(groupDownloads.at(-1).name,'teaching-lab-'+input.lab+'.json');
  const stage=root.querySelector('[data-gx="stage"]'),svg=stage.querySelector('svg'),before=svg.innerHTML;
  stage.onkeydown({key:'ArrowRight',preventDefault(){}});assert.notEqual(svg.innerHTML,before,'Keyboard changes the actual 3D projection');
  $('#sc-tab-quiz').onclick();assert.equal(stage.onpointerdown,null,'Leaving the experiment destroys its camera handlers');
  if(lesson)assert.equal(groupRoutes.at(-1).lesson,lesson.id,'Exercise navigation keeps its teaching lesson');
}
assert.equal(groupCalls.length,23);

const groupLate=await import('../dist/symmetry-course-ui.js?group-late-result'),groupLatePage=new Container();let finishGroup;
await groupLate.renderSymmetryCourseView({container:groupLatePage,selection:{pathway:'spin',tab:'lab',experiment:'spin_group',preset:'af_space'},run:()=>new Promise(resolve=>{finishGroup=resolve;})});
const gl=selector=>groupLatePage.firstElementChild.querySelector(selector);
gl('#sc-group-preset').value='af_space';gl('#sc-group-steps').value='4';gl('#sc-group-variant').value='combined';
const computing=gl('#sc-lab-form').onsubmit({preventDefault(){}});gl('#sc-tab-learn').onclick();finishGroup(groupCases.find(item=>item.input.lab==='spin_group').result);await computing;
assert.equal(groupLate.getSymmetryCourseResult().experiment,null,'Late scientific data does not enter exports after navigation');
assert.ok(gl('#sc-chapter-select'));
const colorLesson=realData['symmetry-course-lessons'].lessons.find(item=>item.lab==='color_group'&&item.labPreset==='translation3_space');
const linked=await import('../dist/symmetry-course-ui.js?deep-linked-lesson'),linkedPage=new Container(),linkedRoutes=[];
await linked.renderSymmetryCourseView({container:linkedPage,selection:{pathway:'spin',track:'color',lesson:colorLesson.id},onNavigate:route=>linkedRoutes.push(route)});
linkedPage.firstElementChild.querySelector('#sc-lesson-lab').onclick();assert.equal(linkedRoutes.at(-1).preset,'translation3_space');assert.equal(linkedRoutes.at(-1).lesson,colorLesson.id);
console.log('Double/colour/spin UI: 23 real Python cases, point/3D controls, negative comparisons, exact exports, camera persistence, keyboard projection, cleanup, lesson presets and late-result isolation passed.');

const materialRoutes=[],materialRouteUI=await import('../dist/symmetry-course-ui.js?material-route-isolation'),materialPage=new Container();
const materialReply={...viewerData,lab:'crystal',chemicalSymmetry:true,magneticSymmetry:false,atomMapping:[],notes:[]};
await materialRouteUI.renderSymmetryCourseView({container:materialPage,selection:{pathway:'crystal',tab:'materials',material:'nacl'},onNavigate:patch=>materialRoutes.push(patch),run:async()=>materialReply});
await settle();assert.equal(materialRoutes.length,0,'Initial asynchronous material render must not add browser history');
await materialPage.firstElementChild.querySelector('#sc-crystal-form').onsubmit({preventDefault(){}});
assert.ok(materialRouteUI.getSymmetryCourseResult().materialExperiment);
await materialRouteUI.renderSymmetryCourseView({container:materialPage,selection:{pathway:'crystal',tab:'materials',material:'nio'},onNavigate:patch=>materialRoutes.push(patch)});
await settle();assert.equal(materialRouteUI.getSymmetryCourseResult().materialExperiment,null,'A material deep link clears the previous material result and export');
assert.match(materialPage.firstElementChild.querySelector('#sc-content').innerHTML,/NiO/);
assert.equal(materialRoutes.length,0);
const deriveRoutes=[],derivePage=new Container();
await materialRouteUI.renderSymmetryCourseView({container:derivePage,selection:{pathway:'spin',tab:'derive',exercise:realData['symmetry-derivations'].exercises.at(-1).id},onNavigate:patch=>deriveRoutes.push(patch)});
await settle();assert.equal(deriveRoutes.length,0,'Opening an explicit derivation creates no normalization history entry');
console.log('Course deep links: initial asynchronous views do not push history; switching material IDs invalidates results and exports.');
