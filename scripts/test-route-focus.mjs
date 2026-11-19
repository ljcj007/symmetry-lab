import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const app=readFileSync(new URL('app.js',edition),'utf8').replaceAll('\r\n','\n');
const html=readFileSync(new URL('index.html',edition),'utf8');
const {knownTool,renderNavigationHub}=await import(new URL('navigation-ui.js',edition));
const {startToolFinder}=await import(new URL('tool-finder.js',edition));
const {parseClassroomRoute,withClassroomNavigationContext}=await import(new URL('classroom-ui.js',edition));
const {createProjectNavigator}=await import(new URL('project-navigation.js',edition));
function sourceBetween(first,last){
 const start=app.indexOf(first),end=app.indexOf(last,start+1);
 assert.ok(start>=0&&end>start,first);
 return app.slice(start,end);
}

const events=new Map(),historyEvents=new Map();
const shell=new Container();shell.innerHTML=html;
const $=selector=>shell.querySelector(selector);
const $$=selector=>shell.querySelectorAll(selector);
const title=$('#page-title'),finderButton=$('#tool-finder-open'),help=$('#help-button'),body=$('body');
assert.equal(title.tag,'h1');
assert.equal(title.getAttribute('tabindex'),'-1','The heading can receive focus outside the Tab order');
const focusCalls=[],scrollCalls=[];
let y=740;
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){
 return selector.includes(',')?this.children.flatMap(child=>[
  ...(selector.split(',').some(item=>child.matches(item))?[child]:[]),...child.querySelectorAll(selector)
 ]):queryAll.call(this,selector);
};
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
Element.prototype.addEventListener=function(name,handler){(this.events??={})[name]??=[];this.events[name].push(handler);};
Element.prototype.closest=function(selector){return selector.split(',').some(item=>this.matches(item))?this:this.parentNode?.closest?.(selector)||null;};
Element.prototype.focus=function(){document.activeElement=this;if(this===title)focusCalls.push(this.textContent);};
Element.prototype.showModal=function(){this.setAttribute('open','');};
Element.prototype.close=function(){this.removeAttribute('open');};
for(const node of [...$$('.nav-item'),$('#export-top')])node.classList={toggle(){}};
globalThis.document={body,activeElement:finderButton,createElement:tag=>new Element(tag),addEventListener(name,handler){events.set(name,handler);}};
globalThis.fetch=()=>assert.fail('The navigation checks require no calculation or catalogue network request');

const state={view:'home',route:'home',primary:'home'};
const location={hash:'#compute'};
const commitHash=(_state,_title,hash)=>{location.hash=hash;};
const labels=Object.fromEntries(['home','compute','advanced','atlas','docs','dynamics','lie'].map(view=>[view,[view,'']]));
let renderCount=0,holdRender=false,releaseRender;
const render=()=>{
 renderCount++;
 if(holdRender){holdRender=false;return new Promise(resolve=>{releaseRender=resolve;});}
};
const context=vm.createContext({
 $, $$,state,location,render,labels,knownTool,parseClassroomRoute,withClassroomNavigationContext,URLSearchParams,
 document:globalThis.document,startToolFinder,projectNavigation:createProjectNavigator(),esc:String,
 history:{pushState:commitHash,replaceState:commitHash},
 window:{scrollTo(x,top){scrollCalls.push([x,top]);y=top;},addEventListener(name,handler){historyEvents.set(name,handler);}},
 rememberRoute(){},updateBreadcrumb(){},phonopyScatteringVisit:()=>null
});
vm.runInContext([
 sourceBetween('function setView(','\nfunction updateBreadcrumb('),
 sourceBetween('function syncCourseRoute(','\n\nfunction workbenchSource('),
 sourceBetween('function handleSiteClick(',"$('#export-top').onclick="),
 sourceBetween("window.addEventListener('hashchange'",'startMathDisplay(')
].join('\n'),context);
const delegated=events.get('click');
const activate=(target,options={})=>{
 const event={target,button:0,detail:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...options};
 delegated(event);
 return event.defaultPrevented;
};
const stillAt=(element,offset,count)=>{
 assert.equal(document.activeElement,element);
 assert.equal(y,offset);
 assert.equal(focusCalls.length,count);
 assert.equal(scrollCalls.length,count);
};
const movedToTitle=(count)=>{
 stillAt(title,0,count);
 assert.deepEqual(scrollCalls.at(-1),[0,0]);
 assert.equal(focusCalls.at(-1),title.textContent);
};

assert.equal(state.route,'compute','The direct URL was used at startup');
stillAt(finderButton,740,0);
const directory=new Container();
await renderNavigationHub({container:directory,view:'compute'});
const presetRoute='compute/advanced/arithmetic_centralizer?preset=a5';
const example=directory.querySelector('[data-route="'+presetRoute+'"]');
example.focus();
holdRender=true;
assert.equal(activate(example),true);
assert.equal(state.route,presetRoute);
movedToTitle(1);
assert.equal(title.textContent,knownTool(presetRoute.split('?')[0]).title);
help.focus();
releaseRender();
await Promise.resolve();
stillAt(help,0,1);

y=380;
example.focus();
assert.equal(activate(example),true);
stillAt(example,380,1);
assert.equal(activate(example,{ctrlKey:true}),false);
stillAt(example,380,1);
location.hash='#compute';
historyEvents.get('hashchange')();
assert.equal(state.route,'compute','Browser Back and hash changes still render');
stillAt(example,380,1);
help.focus();
assert.equal(activate(example,{detail:1}),true);
stillAt(help,380,1);

const atlasButton=$('[data-view="atlas"]');
assert.equal(atlasButton.tag,'button');
assert.equal(activate(atlasButton,{detail:1}),true,'Main navigation also handles a tap that leaves focus elsewhere');
assert.equal(state.route,'atlas');
movedToTitle(2);
y=560;
help.focus();
help.onclick({currentTarget:help});
assert.equal(state.route,'docs');
movedToTitle(3);

const key=name=>events.get('keydown')({key:name,preventDefault(){}});
const openFinder=()=>{finderButton.focus();finderButton.events.click[0]();};
y=490;
openFinder();
const input=$('#tool-finder-query');
assert.equal(document.activeElement,input);
key('Escape');
stillAt(finderButton,490,3);
openFinder();
input.value='Clebsch-Gordan';
input.events.input[0]();
key('Enter');
assert.equal(state.route,'compute/lie/su3_cg','The active search result follows the real Finder callback');
movedToTitle(4);

const lesson='classroom/structure-dynamics?lesson=phonopy-files&tab=';
context.syncCourseRoute(lesson+'learn');
y=620;
const lessonControl=new Element('button');lessonControl.focus();
const beforeSync=renderCount;
context.syncCourseRoute(lesson+'derive',{render:false,focusTitle:true});
assert.equal(state.route,lesson+'derive');
assert.equal(renderCount,beforeSync);
stillAt(lessonControl,620,4);
context.syncCourseRoute(lesson+'lab');
assert.equal(renderCount,beforeSync+1);
stillAt(lessonControl,620,4);
render();
stillAt(lessonControl,620,4);

console.log('Route focus ('+(english?'English':'Chinese')+'): main heading, mobile menu, focused links, Finder, direct and history routes, and internal updates passed.');
