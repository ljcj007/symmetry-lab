import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,edition),'utf8').replace(/\r\n/g,'\n');
const {renderSymmetryCourseView}=await import(new URL('symmetry-course-ui.js',edition));
const {pMinusOnePracticeFromRoute}=await import(new URL('pminus1-practice.js',edition));
const {parseClassroomRoute,withClassroomNavigationContext}=await import(new URL('classroom-ui.js',edition));
const {createProjectNavigator}=await import(new URL('project-navigation.js',edition));
const {knownTool}=await import(new URL('navigation-ui.js',edition));
const {renderResearchView,setResearchInput}=await import(new URL('research-ui.js',edition));
const {validateStructureDiffractionHandoff}=await import(new URL('structure-diffraction-handoff.js',edition));

globalThis.document={compatMode:'CSS1Compat',activeElement:null,createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(read(String(url).split('?')[0]))});
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.scrollIntoView=function(){};

const lessonRoute=id=>'classroom/crystal?tab=learn&lesson='+id+'&track=space&material=silicon';
const lessonRoutes={orbit:lessonRoute('space-04'),origin:lessonRoute('space-06')};
const teachingPage=new Container(),calcPage=new Container();
calcPage.dataset={};
const school=selector=>teachingPage.querySelector(selector);
const lab=selector=>calcPage.querySelector(selector);
const visits=[];
let classroomCalculations=0;
const mountLesson=async route=>renderSymmetryCourseView({
 container:teachingPage,selection:parseClassroomRoute(route),onNavigate:value=>visits.push(value),
 run(){classroomCalculations++;assert.fail('Opening a lesson or related derivation must not calculate');}
});

const lessonLinks={};
await mountLesson(lessonRoutes.orbit);
const orbitLesson=school('[data-pminus1-lesson="orbit"]');
assert.ok(orbitLesson.querySelector('[data-crystal-kind="hm"]'));
assert.match(orbitLesson.textContent,/1\/5, 3\/10, 2\/5/);
lessonLinks.orbit=orbitLesson.querySelector('a').getAttribute('href').slice(1);
assert.equal(lessonLinks.orbit,'crystkit?preset=pminus1-orbit');
assert.ok(school('#sc-lesson-workbench'),'The group representation workbench still has its own entry');
await school('#sc-chapter-derive').onclick();
assert.equal(school('#sc-derive-select').value,'space-pminus1-orbit-stabilizer');
assert.equal(school('[data-pminus1-lesson="orbit"]').querySelector('a').getAttribute('href'),'#'+lessonLinks.orbit);
assert.equal(visits.at(-1).material,'silicon');

await mountLesson(lessonRoutes.origin);
const originLesson=school('[data-pminus1-lesson="origin"]');
assert.match(originLesson.textContent,/−1\/4, 0, 0/);
lessonLinks.origin=originLesson.querySelector('a').getAttribute('href').slice(1);
assert.equal(lessonLinks.origin,'crystkit?preset=pminus1-origin');
assert.ok(school('[data-cif-setting-practice]'));
assert.ok(school('[data-si-structure-practice]'));
await mountLesson(lessonRoute('space-02'));
assert.equal(school('[data-pminus1-lesson]'),null);
assert.ok(school('a[href="#classroom/crystal?tab=learn&amp;lesson=space-01&amp;track=space"]'));
assert.equal(classroomCalculations,0);

// Exercise the production route transition and the research context the app passes.
const app=read('app.js');
const start=app.indexOf('function setView('),end=app.indexOf('\nfunction updateBreadcrumb(',start);
const marker=app.indexOf('handednessExercise:state.route');
const first=app.lastIndexOf('context:{',marker),last=app.indexOf('}',marker);
assert.ok(start>=0&&end>start&&first>=0&&last>first);
const location={hash:''},history=[],navigationOutput=new Container();
const state={view:'home',route:'home',primary:'home',courseRoute:null,returnCourse:null,mode:'sg',group:{number:19}};
const commitHash=(_state,_title,hash)=>{location.hash=hash;history.push(hash);};
const shell={classList:{toggle(){}}};
const routes={state,location,history:{pushState:commitHash,replaceState:commitHash},URLSearchParams,
 parseClassroomRoute,withClassroomNavigationContext,knownTool,projectNavigation:createProjectNavigator(),validateStructureDiffractionHandoff,
 phonopyScatteringVisit:()=>null,esc:String,labels:{academy:['Classroom',''],crystkit:['CrystKit','']},
 $:selector=>selector==='#view-context'?navigationOutput:shell,$$:()=>[],rememberRoute(){},updateBreadcrumb(){},render(){}
};
vm.runInNewContext(app.slice(start,end),routes);
let dispose=()=>{};
const requests={};
let runCount=0;
const rotation=[[-1,0,0],[0,-1,0],[0,0,-1]];
const general={action:'analyze',group_number:2,point:['1/5','3/10','2/5']};
const center={action:'analyze',group_number:2,point:[0,0,0]};
const shifted={action:'analyze',group_number:2,origin:['1/4',0,0],point:['-1/4',0,0]};
const answers={
 general:{points:[general.point,['4/5','7/10','3/5']],multiplicity:2,stabilizerOrder:1},
 center:{points:[center.point],multiplicity:1,stabilizerOrder:2},
 shifted:{points:[['3/4',0,0]],multiplicity:1,stabilizerOrder:2}
};
function mountCrystKit(route){
 dispose();
 routes.setView(route);
 const context=vm.runInNewContext('('+app.slice(first+'context:'.length,last+1)+')',{preset:null,state});
 dispose=renderResearchView('crystkit',{container:calcPage,context,toast:message=>assert.fail(message),download(){},async run(action,input){
  assert.equal(action,'crystkit');
  const id=input.origin?'shifted':input.point[0]==='1/5'?'general':'center';
  requests[id]=structuredClone(input);runCount++;
  return {action:'analyze',operations:[{rotation,translation:[id==='shifted'?'1/2':0,0,0]}],orbit:{...answers[id],orbitStabilizerVerified:true}};
 }});
}

const existingDraft={action:'analyze',group_number:19,point:['1/7','2/7','3/7']};
setResearchInput('crystkit',existingDraft);
const draft=()=>JSON.parse(lab('#research-json').value);
const loadAndRun=async(id,expected)=>{
 const before=runCount;
 const button=lab(`[data-pminus1-input="${id}"]`);
 assert.ok(button);
 button.onclick();
 assert.deepEqual(draft(),expected);
 assert.equal(document.activeElement,lab('#run-research'));
 assert.equal(runCount,before,'Loading an input waits for manual Run');
 await lab('#run-research').onclick();
 assert.equal(runCount,before+1);
 assert.deepEqual(requests[id],expected);
};

routes.setView(lessonRoutes.orbit);
mountCrystKit(lessonLinks.orbit);
assert.equal(state.returnCourse,lessonRoutes.orbit);
assert.ok(navigationOutput.querySelector('[data-route="'+lessonRoutes.orbit+'"]'));
assert.equal(history.at(-1),'#'+lessonLinks.orbit);
assert.deepEqual(draft(),existingDraft,'Opening a lesson comparison preserves the older input');
const stale=lab('[data-pminus1-input="general"]');
await loadAndRun('general',general);
assert.match(calcPage.firstElementChild.innerHTML,english?/stabilizer order 1/i:/稳定子阶 1/);
await loadAndRun('center',center);
assert.match(calcPage.firstElementChild.innerHTML,english?/stabilizer order 2/i:/稳定子阶 2/);
assert.equal(lab('#crystkit-pminus1-inversion'),null);
location.hash='#'+lessonRoutes.orbit;
routes.setView(lessonRoutes.orbit,{history:false});
assert.equal(state.route,lessonRoutes.orbit);
assert.equal(state.courseRoute.material,'silicon');

routes.setView(lessonRoutes.origin);
mountCrystKit(lessonLinks.origin);
assert.equal(state.returnCourse,lessonRoutes.origin);
stale.onclick();
assert.deepEqual(draft(),center,'Detached controls from another comparison cannot replace the draft');
await loadAndRun('center',center);
assert.equal(lab('[data-pminus1-folded]').textContent,'(0, 0, 0)');
await loadAndRun('shifted',shifted);
assert.equal(lab('[data-pminus1-folded]').textContent,'(1/2, 0, 0)');
assert.match(lab('#crystkit-pminus1-inversion').textContent,/−1\/2, 0, 0/);
assert.match(calcPage.firstElementChild.innerHTML,/x_old = basis × x_new \+ origin/);

for(const route of ['crystkit','crystkit?preset=handedness','crystkit?preset=quartz-handedness',
 'crystkit?preset=pminus1-origin&preset=pminus1-orbit','crystkit?preset=pminus1-missing']){
 assert.equal(pMinusOnePracticeFromRoute(route),null);
 mountCrystKit(route);
 assert.equal(lab('#crystkit-pminus1'),null);
 assert.deepEqual(draft(),shifted);
 if(route==='crystkit?preset=handedness')assert.equal(lab('#crystkit-handedness').open,true);
 if(route==='crystkit?preset=quartz-handedness')assert.equal(lab('#crystkit-quartz-handedness').open,true);
}
assert.equal(runCount,4);
dispose();
if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',
  ['-B','scripts/test-python-pminus1-practice.py'],
  {cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(requests),encoding:'utf8'});
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(process.argv.includes('--emit-requests'))console.log(JSON.stringify(requests));
else console.log(`P-1 lesson and CrystKit handoffs (${english?'English':'Chinese'}): exact inputs, return routes, manual calculations and existing presets passed.`);
