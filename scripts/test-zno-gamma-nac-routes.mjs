import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {runInNewContext} from 'node:vm';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const source=name=>readFileSync(new URL(name,edition),'utf8');
const {renderNavigationHub,knownTool}=await import(new URL('navigation-ui.js',edition));
const {startToolFinder}=await import(new URL('tool-finder.js',edition));
const {parseClassroomRoute,buildClassroomHash}=await import(new URL('classroom-ui.js',edition));
const {renderObservablesView}=await import(new URL('observables-ui.js',edition));
const {renderMaterialResearchView}=await import(new URL('material-research-ui.js',edition));
const {createProjectNavigator}=await import(new URL('project-navigation.js',edition));
const tool='compute/phonon-modes';
const activity=tool+'?preset=zno-gamma-nac';
const lesson='#classroom/observables?tab=learn&lesson=ir-raman';
const atlas='#atlas/research?material=zno';
const aliases=['ZnO LO-TO','ZnO 非解析修正'];
const title=english?/ZnO approach directions at Γ and LO–TO splitting/:/ZnO 的 Γ 点方向与 LO–TO 劈裂/;

const listeners=new WeakMap();
const add=function(type,callback){
 const byType=listeners.get(this)||new Map();
 byType.set(type,[...(byType.get(type)||[]),callback]);listeners.set(this,byType);
};
const remove=function(type,callback){
 const byType=listeners.get(this);
 if(byType)byType.set(type,(byType.get(type)||[]).filter(handler=>handler!==callback));
};
function dispatch(target,type,properties={}){
 let handled=false;
 for(const handler of listeners.get(target)?.get(type)||[]){
  handler({target,preventDefault(){handled=true;},...properties});
 }
 return handled;
}
Object.assign(Element.prototype,{
 addEventListener:add,removeEventListener:remove,
 focus(){document.activeElement=this;},
 removeAttribute(name){delete this.attributes[name];},
 remove(){
  if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);
  this.parentNode=null;
 }
});
const body=new Element('body',{}, {isConnected:true});
globalThis.document={body,activeElement:body,compatMode:'CSS1Compat',createElement:tag=>new Element(tag),
 addEventListener:add,removeEventListener:remove};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Opening the activity cannot mark course progress')};

const reads=[],runs=[];
const catalogs=['data/material-observables.json','data/material-research.json'];
globalThis.fetch=async resource=>{
 const pathname=String(resource).split('?')[0];
 reads.push(pathname);
 assert.ok(catalogs.includes(pathname),'Unexpected read while finding or opening the activity: '+pathname);
 return {ok:true,json:async()=>JSON.parse(source(pathname))};
};
const callbacks={run:(...args)=>{runs.push(args);assert.fail('Opening the activity cannot run Python');},
 download:()=>assert.fail('Opening the activity cannot download a result')};
const href=anchor=>anchor?.getAttribute('href')?.replaceAll('&amp;','&');
const nativeLink=(root,target)=>root.querySelectorAll('a').find(anchor=>href(anchor)===target);

const directory=new Container();
await renderNavigationHub({container:directory,view:'compute'});
const filter=directory.querySelector('#site-search');
for(const alias of aliases){
 filter.value=alias;filter.oninput();
 const matches=directory.querySelectorAll('[data-activity-link]');
 assert.deepEqual(matches.map(href),['#'+activity],alias);
 assert.match(matches[0].textContent,title);
}
filter.value='ZnO Raman';filter.oninput();
assert.ok(!directory.querySelectorAll('[data-activity-link]').map(href).includes('#'+activity));

const opened=[];
const button=body.appendChild(new Element('button'));
button.focus();
const finder=startToolFinder({button,onNavigate:route=>opened.push(route)});
const input=body.querySelector('#tool-finder-query');
for(const alias of aliases){
 assert.equal(dispatch(document,'keydown',{key:'k',ctrlKey:true}),true);
 assert.equal(document.activeElement,input);
 input.value=alias;dispatch(input,'input');
 const first=body.querySelector('[data-finder-result]');
 assert.match(first.textContent,title);
 assert.equal(first.getAttribute('aria-selected'),'true');
 assert.equal(dispatch(document,'keydown',{key:'Enter'}),true);
 assert.equal(opened.at(-1),activity);
 assert.equal(document.activeElement,button);
}
finder.destroy();
assert.deepEqual(opened,[activity,activity]);
assert.deepEqual(reads,[],'Named directory and keyboard lookups require no catalog or source fetch');

// Reuse the application route dispatcher, including its atlas-to-classroom mapping.
const app=source('app.js').replaceAll('\r\n','\n');
const from=app.indexOf('function setView('),to=app.indexOf('\nfunction updateBreadcrumb(',from);
assert.ok(from>=0&&to>from);
const state={route:'home',view:'home',primary:'home'};
const shell={textContent:'',innerHTML:'',classList:{toggle(){}}};
const location={hash:''};
const setView=runInNewContext('('+app.slice(from,to)+')',{
 state,location,URLSearchParams,knownTool,parseClassroomRoute,projectNavigation:createProjectNavigator(),
 history:{pushState(_value,_title,hash){location.hash=hash;}},
 labels:{observables:['Observables',''],'material-research':['Materials','']},
 $:()=>shell,$$:()=>[],esc:String,rememberRoute(){},updateBreadcrumb(){},
 withClassroomNavigationContext:course=>course,phonopyScatteringVisit:()=>null
});
function select(hash,primary,view){
 setView(hash,{render:false});
 assert.equal(location.hash,hash.startsWith('#')?hash:'#'+hash);
 assert.equal(state.primary,primary);
 assert.equal(state.view,view);
 return state.courseRoute;
}

const classroom=new Container();
const stopLesson=await renderObservablesView({container:classroom,selection:select(lesson,'classroom','observables'),...callbacks});
const lessonLink=nativeLink(classroom,'#'+activity);
assert.ok(lessonLink,'The IR/Raman selection rules lesson has a native lab link');
assert.match(lessonLink.textContent,english?/approach to Γ changes the optical frequencies of ZnO/:/趋近 Γ 的方向怎样改变 ZnO 光学模频率/);
assert.ok(nativeLink(classroom,'#'+tool+'?preset=zno-ir'),'The adjacent infrared polarization link remains available');
stopLesson?.();

const material=new Container();
const atlasSelection=select(atlas,'atlas','material-research');
assert.equal(atlasSelection.atlasOnly,true);
assert.equal(atlasSelection.material,'zno');
const stopAtlas=await renderMaterialResearchView({container:material,selection:atlasSelection,...callbacks});
const znO=material.querySelector('.obs-case-grid').querySelectorAll('article')[0];
assert.equal(znO.querySelector('.obs-eyebrow').textContent,'ZnO');
const atlasLink=nativeLink(znO,'#'+activity);
assert.ok(atlasLink,'The selected ZnO case has a native lab link');
assert.match(atlasLink.textContent,english?/Open the ZnO LO–TO splitting lab/:/打开 ZnO 的 LO–TO 劈裂实验/);
assert.ok(nativeLink(znO,lesson),'The material case links back to the IR/Raman lesson');
stopAtlas?.();

const detail='[data-mr-zno-nac-entry]',panel='[data-mr-zno-nac-body]';
const generic=new Container();
const stopGeneric=await renderMaterialResearchView({container:generic,selection:select(tool,'compute','material-research'),...callbacks});
await flush();
assert.equal(generic.querySelector(detail).open,false);
assert.equal(generic.querySelector(panel).innerHTML,'');
assert.equal(generic.querySelector('#zgn-form'),null);
assert.ok(generic.querySelector('#mr-form'),'Generic phonon classification remains available');
stopGeneric?.();

for(const target of [opened[0],href(lessonLink),href(atlasLink)]){
 const lab=new Container(),selection=select(target,'compute','material-research');
 assert.equal(selection.calculationOnly,true);
 assert.equal(selection.module,'modes');
 assert.equal(selection.preset,'zno-gamma-nac');
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(selection)),parseClassroomRoute(activity));
 const stop=await renderMaterialResearchView({container:lab,selection,...callbacks});
 assert.equal(lab.querySelector(detail).open,true);
 for(let attempt=0;attempt<100&&!lab.querySelector('#zgn-run');attempt++)await delay(10);
 assert.match(lab.querySelector('#zgn-title')?.textContent||'',english?/LO–TO splitting near Γ in ZnO/:/ZnO 的 Γ 点 LO–TO 劈裂/);
 const run=lab.querySelector('#zgn-run');
 assert.equal(run.type,'submit');
 assert.equal(run.disabled,false);
 assert.ok(lab.querySelector('#mr-form'));
 stop?.();
}

assert.deepEqual(reads,catalogs,'Only the two course and material catalogs were read');
assert.deepEqual(runs,[],'Find, lesson, atlas and labs require the user to start the calculation');
console.log(`ZnO LO–TO routes (${english?'English':'Chinese'}): named activity, keyboard, lesson, material atlas and lazy manual calculation passed.`);
