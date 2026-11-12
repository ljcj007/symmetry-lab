import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildWorkbenchRoute,parseWorkbenchSelection} from '../dist/workbench-route.js';
import {languageURL} from '../dist/language-switch.js';

const appSource=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const openSource=appSource.slice(appSource.indexOf('async function openWorkbench('),appSource.indexOf('\nconst $='));
const renderSource=appSource.slice(appSource.indexOf('async function render(){'),appSource.indexOf('\nfunction renderWorkbench(){'));
const workbenchSource=appSource.slice(appSource.indexOf('function renderWorkbench(){'),appSource.indexOf('\nfunction bindWorkbench(){'));
const coordinateSource=appSource.slice(appSource.indexOf('function parseNumber('),appSource.indexOf('\nfunction toast('));
const plain=value=>JSON.parse(JSON.stringify(value));
const parseCoordinate=vm.runInNewContext('('+coordinateSource+')');
assert.equal(parseWorkbenchSelection('other=1'),null);
assert.deepEqual(parseWorkbenchSelection('sg=099&kx=1%2F2&ky=-1%2F4&kz=0&double=true&bz=BCT2&label=X',parseCoordinate),{mode:'sg',id:'99',k:[.5,-.25,0],doubleValued:true,bzType:'BCT2',labelK:'X'});
for(const query of ['sg=0','sg=231','sg=1.5','sg=abc','sg=99&sg=225','sg=99&msg=1.2','msg=wrong','mpg=1','sg=99&kx=Infinity','sg=99&kx=1%2F0','sg=99&kx=101'])assert.throws(()=>parseWorkbenchSelection(query,parseCoordinate),undefined,query);
for(const input of [
 {mode:'sg',id:99,k:[0,0,0],doubleValued:false,bzType:''},
 {mode:'sg',id:225,k:[.5,.25,-.5],doubleValued:true,bzType:'FCC',labelK:'X'},
 {mode:'msg',id:'1.2',k:[.25,0,.5],doubleValued:true,bzType:'',labelK:null},
 {mode:'mpg',id:'1.2',k:[.5,0,0],doubleValued:true,bzType:''}
]){
 const route=buildWorkbenchRoute(input),selection=parseWorkbenchSelection(route.split('?')[1],parseCoordinate);
 assert.equal(selection.mode,input.mode);assert.equal(selection.id,String(input.id));
 assert.deepEqual(selection.k,input.mode==='mpg'?[0,0,0]:input.k);
 assert.equal(selection.doubleValued,input.doubleValued);assert.equal(selection.bzType,input.bzType);
 assert.equal(buildWorkbenchRoute(selection),route,'Canonical route is stable after restoration');
 const english=new URL(languageURL('https://example.org/lab/#'+route,'en'));
 assert.equal(english.hash,'#'+route,'Language switching retains every setting');
}

const catalogs={sg:JSON.parse(fs.readFileSync(new URL('../dist/data/space-groups.json',import.meta.url))).groups,
 msg:JSON.parse(fs.readFileSync(new URL('../dist/data/magnetic-groups.json',import.meta.url))).groups,
 mpg:JSON.parse(fs.readFileSync(new URL('../dist/data/points.json',import.meta.url))).points};
const host={dataset:{},innerHTML:''},retry={},loads=[],notices=[],replaced=[];
const state={view:'workbench',route:'workbench',mode:'sg',group:catalogs.sg[224],k:[0,0,0],doubleValued:false,bzType:'',labelK:null,result:null,tab:'characters',returnCourse:'classroom/foundations?lesson=from-point-to-space'};
let draws=0,calculations=0;
const context={state,renderTicket:0,dictionaryController:null,URLSearchParams,buildWorkbenchRoute,parseWorkbenchSelection,parseNumber:parseCoordinate,
 $:selector=>selector==='#app'?host:retry,groupLoader:{peek:()=>true},optionalViews:{peek:()=>true},
 ensureGroups:async mode=>{loads.push(mode);return catalogs[mode];},list:mode=>catalogs[mode],
 gid:(group=state.group,mode=state.mode)=>mode==='sg'?String(group.number):group.id,
 esc:String,isClassroomView:()=>false,renderWorkbench:()=>{draws++;},
 toast:message=>notices.push(message),calculate:async()=>{calculations++;},
 history:{replaceState:(_state,_title,url)=>replaced.push(url),pushState:()=>assert.fail('Parameter synchronization must not add browser history')},
 gtitle:(group=state.group)=>group.bcSymbol||group.symbol,lattices:{},modeButtons:()=>'',crystalSpan:String,
 resultMatches:()=>false,fraction:String,bindWorkbench:()=>{},renderResults:()=>{},renderViz:()=>{}
};
vm.createContext(context);
const render=vm.runInContext('('+renderSource+')',context);
function pending(query){const params=new URLSearchParams(query);return {mode:['sg','msg','mpg'].find(mode=>params.has(mode)),query:params.toString()};}
for(const [query,mode,id,k,spin,bz,label]of [
 ['sg=99&kx=1%2F2&ky=0&kz=0&double=true&bz=TetrPrim&label=X','sg','99',[.5,0,0],true,'TetrPrim','X'],
 ['msg=1.2&kx=0.25&ky=0&kz=0.5&double=true','msg','1.2',[.25,0,.5],true,'',null],
 ['mpg=1.2&double=true','mpg','1.2',[0,0,0],true,'','Γ']
]){
 state.pendingGroup=pending(query);await render();
 assert.equal(loads.at(-1),mode);assert.equal(state.mode,mode);assert.equal(context.gid(),id);
 assert.deepEqual(plain(state.k),k);assert.equal(state.doubleValued,spin);assert.equal(state.bzType,bz);assert.equal(state.labelK,label);
 assert.equal(state.pendingGroup,null);assert.equal(calculations,0,'A URL reload restores controls without computing');
}
const priorGroup=state.group;
state.pendingGroup=pending('msg=9999.9999');await render();
assert.match(host.innerHTML,/role="alert"/);assert.match(host.innerHTML,/未找到该群/);assert.ok(state.pendingGroup);assert.equal(state.group,priorGroup);
await retry.onclick();assert.ok(state.pendingGroup,'Retry must retain the invalid selection instead of silently using another group');
state.pendingGroup=pending('sg=99&kx=1%2F0');await render();assert.match(host.innerHTML,/role="alert"/);assert.ok(state.pendingGroup);assert.equal(state.group,priorGroup);
state.pendingGroup=pending('sg=99&bz=not-a-BZ');await render();assert.match(host.innerHTML,/BZ 类型/);assert.ok(state.pendingGroup);assert.equal(state.group,priorGroup);

context.setView=async route=>{state.route=route;state.view='workbench';state.pendingGroup=pending(route.split('?')[1]);await render();};
const open=vm.runInContext('('+openSource+')',context);
await open({id:99});assert.equal(calculations,1);assert.equal(state.group.number,99);assert.match(state.route,/^workbench\?sg=99&/);
await open({mode:'msg',id:'1.2',k:[.25,0,.5],doubleValued:true});assert.equal(calculations,2);assert.equal(state.mode,'msg');assert.deepEqual(plain(state.k),[.25,0,.5]);
await open({mode:'mpg',id:'1.2',k:[1,2,3],doubleValued:true});assert.equal(calculations,3);assert.equal(state.mode,'mpg');assert.deepEqual(plain(state.k),[0,0,0]);
await open({id:9999});assert.equal(calculations,3);assert.match(notices.at(-1),/未找到该群/);
await open({id:99,k:[NaN,0,0]});assert.equal(calculations,3);assert.match(notices.at(-1),/有限数值/);
await open({id:99,bzType:'not-a-BZ'});assert.equal(calculations,3);assert.match(notices.at(-1),/BZ 类型/);
const savedEnsure=context.ensureGroups;let release;
context.ensureGroups=()=>new Promise(resolve=>{release=resolve;});const stale=open({id:99});context.renderTicket++;release();await stale;assert.equal(calculations,3,'A navigation during resource loading must not reopen and calculate the old target');context.ensureGroups=savedEnsure;

const renderWorkbench=vm.runInContext('('+workbenchSource+')',context);
state.mode='sg';state.group=catalogs.sg[98];state.k=[.125,.25,0];state.doubleValued=true;state.bzType='TetrPrim';state.labelK='X';state.route='workbench?sg=99';
renderWorkbench();assert.equal(replaced.length,1);assert.equal(replaced[0],'#'+state.route);assert.equal(parseWorkbenchSelection(state.route.split('?')[1]).bzType,'TetrPrim');assert.deepEqual(parseWorkbenchSelection(state.route.split('?')[1]).k,[.125,.25,0]);
renderWorkbench();assert.equal(replaced.length,1,'Rendering an unchanged selection does not rewrite history');
assert.equal(state.returnCourse,'classroom/foundations?lesson=from-point-to-space');assert.equal(calculations,3);
assert.ok(draws>=6);
console.log('Workbench routes: legacy/fractional and SG/MSG/MPG links, BZ/spin/label preservation, language roundtrip, catalogue-specific restoration, invalid-link retry, one automatic calculation, no reload calculation and replace-only parameter synchronization passed.');
