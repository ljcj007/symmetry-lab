import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as advanced from '../dist/advanced-ui.js';
import {languageURL} from '../dist/language-switch.js';
import {knownTool} from '../dist/navigation-ui.js';
import {createProjectNavigator} from '../dist/project-navigation.js';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
function sourceBetween(start,end){
 const first=app.indexOf(start),last=app.indexOf(end,first+1);
 assert.ok(first>=0&&last>first,start);
 return app.slice(first,last);
}

class Host {
 dataset={};
 set innerHTML(value){
  this.html=value;
  this.nodes=new Map(Array.from(value.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g),match=>['#'+match[1],{
   value:'',
   disabled:/\sdisabled(?:\s|>)/.test(match[0]),
   addEventListener(type,handler){this['on'+type]=handler;}
  }]));
  this.tabs=Array.from(value.matchAll(/data-exact-tool="([^"]+)"/g),match=>({dataset:{exactTool:match[1]}}));
 }
 get innerHTML(){return this.html;}
 querySelector(selector){return selector==='#exact-coverage'?null:this.nodes.get(selector)||null;}
 querySelectorAll(selector){return selector==='[data-exact-tool]'?this.tabs:[];}
}

const host=new Host(),shell={textContent:'',innerHTML:'',classList:{toggle(){}}};
const state={route:'home',view:'home',primary:'home',mode:'sg',group:{number:1},k:[0,0,0]};
const location={hash:''},writes=[],recent=[],requested=[],renders=[],notices=[],researchCalls=[];
let cleanupCount=0,heldModule,runCount=0;
const research={
 renderResearchView(){host.innerHTML='<p>MagneticTB</p>';},
 setResearchInput:(...args)=>researchCalls.push(args)
};
const page={
 ...advanced,
 renderAdvancedView(options){
  renders.push(options);
  const cleanup=advanced.renderAdvancedView(options);
  assert.equal(typeof cleanup,'function');
  return ()=>{cleanupCount++;cleanup();};
 }
};
const modules={advanced:page,research};
const optionalViews={
 peek:key=>heldModule?.key===key?null:modules[key],
 get(key){requested.push(key);return heldModule?.key===key?heldModule.pending:Promise.resolve(modules[key]);}
};
function holdModule(key){
 let resolve;
 const pending=new Promise(done=>{resolve=done;});
 heldModule={key,pending};
 return ()=>{heldModule=null;resolve(modules[key]);};
}
const commitHash=method=>(_state,_title,hash)=>{writes.push({method,hash});location.hash=hash;};
const context={
 state,location,URLSearchParams,renderTicket:0,dictionaryController:null,optionalViews,
 groupLoader:{peek:()=>true},ensureGroups:async()=>{},databases:{},
 history:{pushState:commitHash('push'),replaceState:commitHash('replace')},
 knownTool,labels:Object.fromEntries(['home','advanced','magnetictb','classroom'].map(view=>[view,[view,'']])),
 parseClassroomRoute:()=>null,withClassroomNavigationContext:value=>value,isClassroomView:()=>false,
 projectNavigation:createProjectNavigator(),phonopyScatteringVisit:()=>null,
 $:selector=>selector==='#app'?host:selector==='#resource-retry'?host.querySelector(selector):shell,
 $$:()=>[],esc:String,rememberRoute:route=>recent.push(route),updateBreadcrumb:()=>{},
 renderNavigationHub:()=>{host.innerHTML='<p>Home</p>';},
 runPythonTask:async()=>{runCount++;return {};},
 toast:value=>notices.push(value),download:()=>{}
};
vm.createContext(context);
vm.runInContext([
 'let renderedViewCleanup=null;',
 sourceBetween('function setView(','\nfunction updateBreadcrumb('),
 sourceBetween('function clearRenderedView(){','\nfunction renderWorkbench(){')
].join('\n'),context);

const advancedPath=tool=>'compute/advanced/'+tool;
const share=(tool,id)=>advancedPath(tool)+'?preset='+id;
const shown=()=>renders.at(-1);
const get=selector=>host.querySelector(selector);
const tab=tool=>host.tabs.find(item=>item.dataset.exactTool===tool);
const visit=async route=>{location.hash='#'+route;await context.setView(route,{history:false});};
const assertReady=()=>assert.doesNotMatch(host.innerHTML,/id="resource-retry"/);
const arithmetic=advancedPath('arithmetic_centralizer');
const a5=share('arithmetic_centralizer','a5');

const originalFetch=globalThis.fetch;
const reads=[];
globalThis.fetch=(...args)=>{reads.push(args);return Promise.reject(new Error('Unexpected automatic fetch'));};
try{
 await visit('home');
 assert.deepEqual(requested,[],'The advanced tool is not requested by the home route');
 await visit('advanced');
 assert.equal(state.route,advancedPath('carat_integral'),'Legacy advanced entry still opens the integral classifier');
 assert.equal(shown().sharedPreset,null);
 assertReady();

 for(const [tool,id] of [
  ['carat_integral','noncyclic-affine'],
  ['integral_normalizer','glued6'],
  ['arithmetic_centralizer','a5'],
  ['symbolic_spacegroups','magnetic']
 ]){
  const link=share(tool,id),start=writes.length;
  await visit(link);
  assert.equal(state.route,link);
  assert.deepEqual(JSON.parse(JSON.stringify(shown().sharedPreset)),{tool,id});
  assert.ok(get('#exact-load-shared'),'A genuine named preset offers an explicit load control');
  assert.equal(writes.length,start,'A canonical shared link does not rewrite browser history');
  assert.equal(new URL(languageURL('https://example.org/lab/#'+link,'en')).hash,'#'+link);
  assertReady();
 }
 assert.equal(reads.length,0,'Visiting a shared preset must not fetch example data');
 assert.equal(runCount,0,'Visiting a shared preset must not run a Python task');

 for(const [supplied,expected] of [
  [arithmetic+'?preset=missing',arithmetic],
  [arithmetic+'?preset=glued6',arithmetic],
  [arithmetic+'?preset=a5&preset=a5',arithmetic],
  [arithmetic+'?preset=a5&preset=glued6',arithmetic],
  [arithmetic+'?preset=',arithmetic],
  [arithmetic+'?preset=%7B%22local-input%22%3A1%7D',arithmetic],
  [arithmetic+'?preset=a5?raw=local-input',arithmetic],
  [arithmetic+'?draft=local-input',arithmetic],
  [arithmetic+'?draft=local-input&preset=%61%35',a5]
 ]){
  const start=writes.length,recents=recent.length;
  await visit(supplied);
  assert.equal(state.route,expected,supplied);
  assert.deepEqual(writes.slice(start),[{method:'replace',hash:'#'+expected}]);
  assert.deepEqual(recent.slice(recents),[expected],'Only the verified canonical route reaches recent history');
  assert.equal(Boolean(get('#exact-load-shared')),expected===a5);
  assertReady();
 }

 await visit(arithmetic);
 const draft='{"action":"order","rotations":[],"localNote":"CUSTOM_ONLY"}';
 get('#exact-input').oninput({target:{value:draft}});
 await visit(a5);
 assert.match(host.innerHTML,/CUSTOM_ONLY/,'A share link leaves an existing editor draft intact');
 assert.ok(get('#exact-load-shared'));
 const cleanupBefore=cleanupCount;
 tab('integral_normalizer').onclick();
 assert.equal(state.route,advancedPath('integral_normalizer'),'An advanced tab still produces its ordinary tool URL');
 assert.deepEqual(writes.at(-1),{method:'push',hash:'#'+state.route});
 assert.equal(cleanupCount,cleanupBefore,'The tab stays within the mounted advanced view');
 assert.equal(get('#exact-load-shared'),null);
 await visit(a5);
 assert.match(host.innerHTML,/CUSTOM_ONLY/);
 get('#exact-example').onchange({target:{value:'order'}});
 await get('#exact-load').onclick();
 assert.equal(state.route,arithmetic,'Explicit normal example loading clears the prior share identity');
 assert.doesNotMatch(host.innerHTML,/CUSTOM_ONLY/);
 assert.equal(get('#exact-load-shared'),null);
 assert.equal(reads.length,0,'The ordinary inline example does not use the network');
 assert.equal(runCount,0,'Explicit example loading still waits for Run');

 await visit(a5);
 const mounted=shown();
 await visit('home');
 assert.equal(mounted.isCurrent(),false);
 const recentBefore=recent.length,cleanupAfter=cleanupCount;
 mounted.onToolChange('arithmetic_centralizer','a5');
 await mounted.sendToBands({id:'stale'});
 assert.equal(state.route,'home');
 assert.equal(recent.length,recentBefore);
 assert.equal(researchCalls.length,0);

 const resolveAdvanced=holdModule('advanced'),draws=renders.length;
 location.hash='#'+a5;
 const pending=context.setView(a5,{history:false});
 assert.deepEqual(recent.slice(recentBefore),[],'The pending lazy view records no unchecked route');
 await visit('home');
 resolveAdvanced();
 await pending;
 assert.equal(renders.length,draws,'A deferred advanced module cannot mount after another page owns the app');
 assert.equal(cleanupCount,cleanupAfter);
 assert.match(host.innerHTML,/Home/);

 await visit(share('symbolic_spacegroups','magnetic'));
 const finishResearch=holdModule('research');
 const pendingResearch=shown().sendToBands({id:'from old tab'});
 tab('arithmetic_centralizer').onclick();
 finishResearch();
 await pendingResearch;
 assert.deepEqual(researchCalls,[],'A delayed handoff does not override a newer advanced tab selection');
 await visit(advancedPath('symbolic'));
 await shown().sendToBands({id:'current result'});
 assert.equal(state.route,'magnetictb','The current exact-model handoff still selects MagneticTB');
 assert.deepEqual(researchCalls,[['magnetictb',{id:'current result'}]]);
 assert.equal(notices.length,1);
 assert.ok(writes.every(({hash})=>!/CUSTOM_ONLY|local-input/.test(hash)));
 assert.ok(recent.every(route=>!/CUSTOM_ONLY|local-input/.test(route)));
 assert.equal(runCount,0);
}finally{
 globalThis.fetch=originalFetch;
}
console.log('Advanced preset host: actual app and renderer preserve stable links and drafts, normalize invalid URLs, restore old tabs and handoff, and guard delayed loads.');
