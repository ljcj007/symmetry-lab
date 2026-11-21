import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {languageURL} from '../dist/language-switch.js';

const catalog=name=>JSON.parse(readFileSync(new URL(`../dist/data/${name}.json`,import.meta.url)));
const groups={sg:catalog('space-groups').groups,msg:catalog('magnetic-groups').groups,mpg:catalog('points').points};
const noop=()=>{};

async function appInstance(edition,{hash,selectedId='',priorSelection=false}){
 const address=file=>new URL('../dist/'+edition+file,import.meta.url);
 const app=readFileSync(address('app.js'),'utf8');
 const {buildWorkbenchRoute,parseWorkbenchSelection}=await import(address('workbench-route.js'));
 const {matchMagneticGroupQuery}=await import(address('magnetic-group-query.js'));
 const {spaceGroupNumberForQuery}=await import(address('tool-search.js'));
 const section=(start,end)=>{
  const from=app.indexOf(start),to=app.indexOf(end,from+start.length);
  assert.ok(from>=0&&to>from,start);
  return app.slice(from,to);
 };
 const state={view:'home',route:'home',primary:'home',mode:'sg',group:null,k:[0,0,0],bzType:'',labelK:null,doubleValued:false,dbMode:'sg',dbQuery:'',dbType:'all',dbPage:0};
 if(priorSelection)Object.assign(state,{group:groups.sg[21],k:[.5,0,0],bzType:'OrthFace(a)',labelK:'X',doubleValued:true});
 const gid=(group=state.group,mode=state.mode)=>mode==='sg'?String(group.number):group.id;
 const button={dataset:{openGroup:selectedId}},host={innerHTML:'',dataset:{},classList:{toggle:noop,add:noop}},location={hash};
 const calculations=[],historyWrites=[];
 const context={state,location,URLSearchParams,buildWorkbenchRoute,parseWorkbenchSelection,parseNumber:Number,matchMagneticGroupQuery,spaceGroupNumberForQuery,
  labels:{home:['home',''],database:['database',''],workbench:['workbench','']},knownTool:noop,parseClassroomRoute:noop,withClassroomNavigationContext:noop,
  projectNavigation:{enter:noop,selection:noop,html:()=>'',bind:noop,consumeInput:noop},phonopyScatteringVisit:noop,
  history:{
   pushState(_state,_title,next){historyWrites.push(['push',next]);location.hash=next;},
   replaceState(_state,_title,next){historyWrites.push(['replace',next]);location.hash=next;}
  },
  $:()=>host,$$:selector=>selector==='[data-open-group]'?[button]:[],updateBreadcrumb:noop,rememberRoute:noop,esc:String,
  groupLoader:{peek:()=>true},optionalViews:{peek:()=>true},ensureGroups:async mode=>groups[mode],list:mode=>groups[mode],gid,
  modeButtons:()=>'',gtitle:group=>group.bcSymbol||group.symbol,crystalSpan:String,lattices:{},tableHTML:()=>'',
  resultMatches:()=>false,fraction:String,bindWorkbench:noop,renderResults:noop,renderViz:noop,
  async calculate(){calculations.push([location.hash,gid(),state.mode]);},
  toast:message=>assert.fail(message)
 };
 vm.createContext(context);
 const fragments=[
  ['async function openWorkbench(', '\nconst $='],
  ['function setView(request,', '\nfunction updateBreadcrumb'],
  ['function clearRenderedView(){', '\nfunction bindWorkbench(){'],
  ['function renderDatabase(){', '\nfunction activeContext(){']
 ];
 vm.runInContext('let renderTicket=0,renderedViewCleanup=null,dictionaryController=null;'+fragments.map(args=>section(...args)).join('\n'),context);
 await context.setView(hash,{history:false});
 return {state,button,host,location,calculations,historyWrites,gid};
}

for(const [edition,otherEdition,targetLanguage] of [['','en/','en'],['en/','','zh-CN']]){
 for(const [mode,id,bzType] of [['sg','4',''],['msg','62.448',''],['mpg','2.3',''],['sg','22','OrthFace(a)']]){
  const atlas=await appInstance(edition,{hash:`#atlas/${mode}?q=${id}`,selectedId:id,priorSelection:true});
  assert.equal(atlas.state.view,'database');
  assert.equal(atlas.calculations.length,0);
  await atlas.button.onclick();
  const expected=`#workbench?${mode}=${id}&kx=0&ky=0&kz=0&double=true${bzType?'&bz=OrthFace%28a%29':''}&label=%CE%93`;
  assert.equal(atlas.location.hash,expected);
  assert.deepEqual(atlas.historyWrites,[['push',expected]],'The history entry always contains the selected group');
  assert.deepEqual(atlas.calculations,[[expected,id,mode]],'An explicit row click calculates once after restoration');
  const source='https://example.org/symmetry-lab/'+edition+expected;
  const switched=new URL(languageURL(source,targetLanguage));
  assert.equal(switched.hash,expected);
  for(const [reloadEdition,hash] of [[edition,expected],[otherEdition,switched.hash]]){
   const restored=await appInstance(reloadEdition,{hash});
   assert.equal(restored.state.view,'workbench');
   assert.equal(restored.state.mode,mode);
   assert.equal(restored.gid(),id);
   assert.deepEqual(Array.from(restored.state.k),[0,0,0]);
   assert.equal(restored.state.labelK,'Γ');
   assert.equal(restored.state.doubleValued,true);
   assert.equal(restored.state.bzType,bzType);
   assert.deepEqual(restored.historyWrites,[]);
   assert.deepEqual(restored.calculations,[],'Reload and language switch do not calculate');
  }
 }
 console.log(`Atlas workbench links (${edition?'English':'Chinese'}): all catalogs, clean history, retained compatible BZ and spin, one explicit calculation and safe reload.`);
}
