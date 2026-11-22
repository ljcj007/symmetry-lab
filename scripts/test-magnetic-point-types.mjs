import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const read=name=>readFileSync(new URL(name,edition),'utf8').replaceAll('\r\n','\n');
const {renderSymmetryCourseView}=await import(new URL('symmetry-course-ui.js',edition));
const {parseClassroomRoute,withClassroomNavigationContext}=await import(new URL('classroom-ui.js',edition));
const {buildWorkbenchRoute,parseWorkbenchSelection,parseWorkbenchCoordinate}=await import(new URL('workbench-route.js',edition));
const {createProjectNavigator}=await import(new URL('project-navigation.js',edition));
const {knownTool}=await import(new URL('navigation-ui.js',edition));
const {validateStructureDiffractionHandoff}=await import(new URL('structure-diffraction-handoff.js',edition));
const {points}=JSON.parse(readFileSync(new URL('../dist/data/points.json',import.meta.url),'utf8'));
const course='classroom/spin?tab=learn&lesson=magnetic-03&track=magnetic';
const container=new Container();
const $=selector=>container.querySelector(selector);
const navigation=[];
let courseCalculations=0;
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(read(String(url).split('?')[0]))});
Element.prototype.focus=function(){};
Element.prototype.scrollIntoView=function(){};

const open=async(route=course,options={})=>renderSymmetryCourseView({
 container,selection:{...parseClassroomRoute(route),...options},onNavigate:patch=>navigation.push(patch),
 run(){courseCalculations++;assert.fail('Course navigation must not start Python');},
 openGroup(){assert.fail('A comparison link must use the native manually calculated route');}
});
const dispose=await open();
const comparison=$('#sc-magnetic-point-types');
assert.match(comparison.textContent,english?/Symmetry Operations.*Type IV classifies magnetic space groups/:/对称操作.*IV 型是磁空间群/);
const links=comparison.querySelectorAll('a');
assert.deepEqual(links.map(link=>link.dataset.scMagneticPointType),['3.1','3.2','3.3']);
const routes=links.map(link=>{
 assert.equal(link.onclick,undefined,'Keep ordinary browser navigation and copying');
 const group=points.find(row=>row.id===link.dataset.scMagneticPointType);
 assert.equal(link.querySelector('[data-crystal-kind="hm"]').textContent,group.symbol);
 return link.getAttribute('href').replaceAll('&amp;','&');
});
await $('#sc-lesson-lab').onclick();
assert.equal(navigation.at(-1).experiment,'magnetic');
assert.ok($('#sc-lab-form'));
assert.equal($('#sc-magnetic-point-types'),null);
assert.equal(courseCalculations,0);
dispose();

for(const [route,options] of [
 ['classroom/spin?tab=learn&lesson=magnetic-02&track=magnetic',{}],
 [course,{embeddedOnly:true}],
 [course,{atlasOnly:true}],
 [course,{calculationOnly:true}]
]){
 const cleanup=await open(route,options);
 assert.equal($('#sc-magnetic-point-types'),null);
 cleanup();
}

// Exercise the existing app route transition and its real manual Workbench
// calculation boundary. Only the Python call itself is captured here.
const app=read('app.js');
const viewStart=app.indexOf('function setView('),viewEnd=app.indexOf('\nfunction updateBreadcrumb(',viewStart);
const calcStart=app.indexOf('async function calculate(){'),calcEnd=app.indexOf('\nfunction matrixHTML(',calcStart);
assert.ok(viewStart>=0&&calcStart>=0&&viewEnd>viewStart&&calcEnd>calcStart);
const state={view:'home',route:'home',primary:'home',courseRoute:null,returnCourse:null,
 calculationTicket:0,mode:'sg',doubleValued:true,k:[.25,0,.5]};
const host=new Container(), location={hash:''}, captured=[];
const setHash=(_state,_title,hash)=>{location.hash=hash;};
const context=vm.createContext({
 state,location,history:{pushState:setHash,replaceState:setHash},URLSearchParams,parseClassroomRoute,
 withClassroomNavigationContext,knownTool,projectNavigation:createProjectNavigator(),validateStructureDiffractionHandoff,
 phonopyScatteringVisit:()=>null,esc:String,labels:{academy:['Classroom',''],workbench:['Workbench','']},
 $:selector=>selector==='#view-context'?host:selector==='#group-search'?null:{classList:{toggle(){}}},
 $$:()=>[],rememberRoute(){},updateBreadcrumb(){},render(){},readCoords(){},
 workbenchSource:()=>null,toast(){},showError:message=>assert.fail(message),
 async compute(payload,action){captured.push({action,payload:JSON.parse(JSON.stringify(payload))});return {};}
});
vm.runInContext(app.slice(viewStart,viewEnd),context);
const calculate=vm.runInContext('('+app.slice(calcStart,calcEnd)+')',context);
const payloads={};
for(const [index,href] of routes.entries()){
 const id=links[index].dataset.scMagneticPointType;
 const previous=captured.length;
 context.setView(course);
 context.setView(href);
 assert.equal(state.route,href.slice(1));
 assert.equal(state.returnCourse,course);
 assert.equal(host.querySelector('[data-route="'+course+'"]').getAttribute('href'),'#'+course);
 const selection=parseWorkbenchSelection(state.pendingGroup.query,parseWorkbenchCoordinate);
 assert.deepEqual(selection,{mode:'mpg',id,k:[0,0,0],doubleValued:false,bzType:'',labelK:'Γ'});
 assert.equal(href,'#'+buildWorkbenchRoute(selection));
 assert.equal(captured.length,previous,'Opening each shareable route waits for an explicit Calculate');
 const group=points.find(row=>row.id===id);
 assert.ok(group);
 Object.assign(state,selection,{group});
 assert.equal(await calculate(),true);
 assert.equal(captured.length,previous+1);
 assert.deepEqual(captured.at(-1),{action:'analyze',payload:{operations:group.operations,
  k:[0,0,0],basis:group.basis,doubleValued:false}});
 payloads[id]=captured.at(-1);
}
assert.throws(()=>parseWorkbenchSelection('mpg=3.3&msg=1.3'),undefined,'Point and space catalog selectors cannot be mixed');
assert.equal(parseWorkbenchSelection('msg=1.3').mode,'msg');
assert.equal(parseWorkbenchSelection('mpg=3.3&double=true').doubleValued,true);
if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',['-B','scripts/test-python-magnetic-point-types.py'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(payloads),encoding:'utf8'
 });
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(process.argv.includes('--payloads'))console.log(JSON.stringify(payloads));
else console.log(`Magnetic point-group lesson (${english?'English':'Chinese'}): three manual Γ inputs, original experiment, scope and classroom return passed.`);
