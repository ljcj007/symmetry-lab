import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import vm from 'node:vm';

const english=process.argv.includes('--english');
const reproduce=process.argv.includes('--reproduce');
const adjacent=new URL('../',import.meta.url);
const repo=existsSync(new URL('dist/app.js',adjacent))?adjacent:new URL('../../../sites/symmetry-lab/',import.meta.url);
const edition=new URL(english?'dist/en/':'dist/',repo);
const read=name=>readFileSync(new URL(name,edition),'utf8').replaceAll('\r\n','\n');
const {Container}=await import(new URL('scripts/test-material-research-ui.mjs',repo));
const {parseClassroomRoute,withClassroomNavigationContext}=await import(new URL('classroom-ui.js',edition));
const {createProjectNavigator,prepareProjectNavigation,projectReturnRoute}=await import(new URL('project-navigation.js',edition));
const {knownTool,toolsIndex}=await import(new URL('navigation-ui.js',edition));
const {finderResults}=await import(new URL('tool-finder.js',edition));
const {createStructureDiffractionHandoff,validateStructureDiffractionHandoff}=await import(new URL('structure-diffraction-handoff.js',edition));

const lesson='classroom/crystal?track=space&tab=learn&lesson=space-06';
const practice='structure?cif-setting=practice';
const nextLesson='classroom/foundations?tab=learn&lesson=representations';
const scatter='compute/phonopy-scattering';
const scatterHelp=['#classroom/observables?module=scattering&lesson=scattering-chain','#compute/phonopy'];
assert.ok(read('symmetry-course-ui.js').includes('#'+practice));
const [found]=finderResults(toolsIndex,'Phonopy neutron DSF',{scope:'tools'});
assert.equal(found?.route,scatter);
const app=read('app.js');
const start=app.indexOf('function setView('),end=app.indexOf('\nfunction updateBreadcrumb(',start);
assert.ok(start>=0&&end>start);

function visit(){
 const state={view:'home',route:'home',primary:'home',courseRoute:null,returnCourse:null};
 const location={hash:''},project=createProjectNavigator(),output=new Container();
 const shell={classList:{toggle(){}}};
 const commitHash=(_state,_title,hash)=>{location.hash=hash;};
 const labels=Object.fromEntries(['home','compute','atlas','classroom','docs','projects','structure','academy','pointgroups','dynamics','phonopy-scattering','response-materials'].map(view=>[view,[view,'']]));
 const context={
  state,location,history:{pushState:commitHash,replaceState:commitHash},URLSearchParams,
  parseClassroomRoute,withClassroomNavigationContext,knownTool,projectNavigation:project,validateStructureDiffractionHandoff,
  phonopyScatteringVisit:()=>null,esc:String,labels,
  $:selector=>selector==='#view-context'?output:shell,$$:()=>[],rememberRoute(){},updateBreadcrumb(){},render(){}
 };
 vm.runInNewContext(app.slice(start,end),context);
 const links=()=>[...output.innerHTML.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
 const fromHistory=route=>{location.hash='#'+route;context.setView(route,{history:false});};
 return {state,project,output,links,go:context.setView,fromHistory};
}

const fresh=visit();
fresh.go(scatter);
assert.ok(scatterHelp.every(href=>fresh.links().includes(href)));
const tour=visit();
tour.go(lesson);
tour.go(practice);
assert.equal(tour.state.returnCourse,lesson);
assert.ok(tour.links().includes('#'+lesson));
tour.go('atlas');
tour.go(found.route);
if(reproduce){
 assert.ok(tour.links().includes('#'+lesson),'Old course return leaks through an Atlas visit');
 assert.ok(!scatterHelp.some(href=>tour.links().includes(href)),'Both real Phonopy setup links are hidden');
}else{
 assert.equal(tour.state.returnCourse,null);
 assert.deepEqual(tour.links(),fresh.links(),'After Atlas the Finder opens the same Phonopy guidance as a fresh visit');
 for(const boundary of ['home','docs','classroom']){
  const flow=visit();
  flow.go(lesson);
  flow.go(practice);
  flow.go(boundary);
  assert.equal(flow.state.returnCourse,null,boundary);
  flow.go(found.route);
  assert.deepEqual(flow.links(),fresh.links(),boundary);
 }
 const direct=visit();
 direct.go(lesson);
 direct.go(practice);
 const handoff=createStructureDiffractionHandoff({input_cell:{
  lattice:[[3,0,0],[0,5,0],[0,0,4]],positions:[[.123,.345,.234]],species:['Na']
 }},{format:'cif',filename:'sg4_number_only.cif'});
 assert.ok(handoff);
 direct.go('compute/diffraction',{diffractionHandoff:handoff});
 assert.equal(direct.state.returnCourse,lesson,'A related calculator retains the active course');
 assert.ok(direct.links().includes('#'+lesson));
 assert.deepEqual(direct.state.courseRoute.diffractionHandoff,handoff);
 direct.fromHistory(practice);
 assert.equal(direct.state.returnCourse,lesson);
 direct.fromHistory(lesson);
 assert.equal(direct.state.route,lesson);
 assert.equal(direct.state.returnCourse,null);
 direct.fromHistory(practice);
 assert.equal(direct.state.returnCourse,lesson,'History from the source lesson restores its exact route');
 direct.go(nextLesson);
 assert.equal(direct.state.returnCourse,null);
 direct.go('structure');
 assert.equal(direct.state.returnCourse,nextLesson,'The next lesson records its own return independently');

 const sourceRecord={action:'device_transport_lab',input:{model:'uniform',sites:12,hopping:1,energy:.2,spinDegeneracy:2}};
 const prepared=prepareProjectNavigation({templateId:'normal-andreev',projectId:'copy-two',stepId:'normal',
  mode:'current',route:'#compute/device-transport-lab?preset=device-perfect',record:sourceRecord});
 direct.go('atlas/projects');
 direct.go(prepared.route,{projectContext:prepared.context});
 const projectReturn=projectReturnRoute(prepared.context.source);
 assert.equal(direct.state.returnCourse,null);
 assert.deepEqual(direct.state.courseRoute.projectInput.input,sourceRecord.input);
 assert.notEqual(direct.state.courseRoute.projectInput.input,sourceRecord.input);
 assert.ok(direct.links().includes('#'+projectReturn));
 direct.project.consumeInput();
 const internal='compute/device-transport-lab?material=chain';
 direct.go(internal,direct.project.optionsFor(internal));
 assert.equal(direct.state.courseRoute.projectInput,undefined);
 assert.ok(direct.links().includes('#'+projectReturn));
 direct.output.querySelector('[data-project-return]').onclick({button:0,preventDefault(){}});
 assert.equal(direct.state.route,projectReturn);
 assert.equal(direct.project.snapshot(),null);
}
console.log('Course return ('+(english?'English':'Chinese')+'): '+(reproduce?'reproduced the stale lesson link and missing Phonopy guidance.':'related workbench steps, independent visits, browser history and recorded projects passed.'));
