import assert from 'node:assert/strict';
import {Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {startToolFinder}=await import(prefix+'tool-finder.js');
const topicModule=await import(prefix+'lesson-topic-finder.js');
const {progressionLessons}=await import(prefix+'lesson-progression-index.js');
const {parseClassroomRoute}=await import(prefix+'classroom-ui.js');
const resolveTopic=topicModule.lessonTopicForRoute;
const foundation='#classroom/foundations?tab=learn&lesson=representations';
const lie='#classroom/coupling?tab=learn&lesson=representations&track=representations';
const scattering='#classroom/observables?module=scattering&tab=learn&lesson=scattering-chain';
const ordinary=resolveTopic(foundation),continuous=resolveTopic(lie),specific=resolveTopic(scattering);
assert.equal(progressionLessons.length,197);
assert.equal(ordinary.all.length,197);
assert.equal(new Set(ordinary.all.map(row=>row.route)).size,197);
const topics=new Set();
const topicKey=lesson=>JSON.stringify([lesson.catalog,lesson.module?'module':lesson.track?'track':'catalog',lesson.module||lesson.track||null]);
for(const lesson of progressionLessons){
 const expectedKey=topicKey(lesson);
 const resolved=resolveTopic(lesson.route);
 topics.add(expectedKey);
 assert.equal(resolved.current,`${lesson.catalog}::${lesson.lessonId}`);
 assert.deepEqual(resolved.topic.map(row=>row.route),progressionLessons.filter(row=>topicKey(row)===expectedKey).map(row=>row.route.slice(1)));
 assert.equal(resolved.topic.filter(row=>row.current).length,1);
 assert.ok(resolved.topic.length>=3&&resolved.topic.length<=9);
}
assert.equal(topics.size,51);
assert.equal(ordinary.current,'pointgroup-lessons::representations');
assert.equal(continuous.current,'lie-group-lessons::representations');
assert.equal(ordinary.topic.length,ordinary.catalog.length);
assert.ok(continuous.topic.length<continuous.catalog.length);
assert.ok(ordinary.topic.some(row=>row.route===foundation.slice(1)&&row.current));
assert.ok(!ordinary.topic.some(row=>row.route===lie.slice(1)));
assert.ok(continuous.topic.some(row=>row.route===lie.slice(1)&&row.current));
assert.ok(!continuous.catalog.some(row=>row.route===foundation.slice(1)));
assert.equal(specific.topic.length,3);
assert.ok(specific.catalog.length>specific.topic.length);
assert.ok(specific.topic.every(row=>parseClassroomRoute(row.route).module==='scattering'));
assert.deepEqual(resolveTopic(scattering+'&track=space&level=point').topic,specific.topic);
assert.equal(resolveTopic('#compute/phonons'),null);
assert.equal(resolveTopic('#classroom/foundations?lesson=su2-spinor'),null);

// Use the same native-dialog test adapter as the ordinary finder suite.
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){
 return selector.includes(',')?this.children.flatMap(child=>[
  ...(selector.split(',').some(part=>child.matches(part))?[child]:[]),...child.querySelectorAll(selector)
 ]):queryAll.call(this,selector);
};
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
Element.prototype.addEventListener=function(name,handler){(this.events??={})[name]??=[];this.events[name].push(handler);};
Element.prototype.removeEventListener=function(name,handler){this.events[name]=(this.events?.[name]||[]).filter(value=>value!==handler);};
Element.prototype.fire=function(name,event={}){for(const fn of this.events?.[name]||[])fn({target:this,preventDefault(){},...event});};
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.closest=function(selector){return this.matches(selector)?this:this.parentNode?.closest?.(selector)||null;};
Element.prototype.remove=function(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;};
Element.prototype.showModal=function(){this.setAttribute('open','');};
Element.prototype.close=function(){this.removeAttribute('open');};
const body=new Element('body',{}, {isConnected:true}),events={};
globalThis.document={
 body,activeElement:null,createElement:tag=>new Element(tag),
 addEventListener(name,fn){(events[name]??=[]).push(fn);},
 removeEventListener(name,fn){events[name]=(events[name]||[]).filter(value=>value!==fn);}
};
let network=0,loads=0,rejectLoad=false;
globalThis.fetch=async()=>{network++;throw Error('Contextual finder should not read the mixed search catalog');};
const top=body.appendChild(new Element('button')),trigger=body.appendChild(new Element('button')),routes=[];
function start(loader){
 return startToolFinder({button:top,onNavigate:route=>routes.push(route),loadLessonTopic:loader||(()=>{
  loads++;
  if(rejectLoad)throw Error('Unavailable');
  return topicModule;
 })});
}
const key=(name,options={})=>{for(const handler of events.keydown||[])handler({key:name,preventDefault(){},...options});};
let controller=start();
const dialog=()=>body.querySelector('dialog');
const find=selector=>dialog().querySelector(selector);
const query=()=>find('#tool-finder-query'),list=()=>find('#tool-finder-results'),status=()=>find('#tool-finder-status');
const expansion=()=>find('[data-finder-topic-expand]'),catalog=()=>find('[data-finder-topic-catalog]');
const topicButton=()=>find('[data-finder-scope="courses"]');
const results=()=>list().querySelectorAll('[data-finder-result]');
const type=value=>{query().value=value;query().fire('input');};

top.focus();key('K',{ctrlKey:true});
assert.equal(find('[data-finder-scope="tools"]').getAttribute('aria-pressed'),'true');
assert.equal(expansion().hidden,true);
assert.equal(catalog().hidden,true);
assert.equal(loads,0);
assert.equal(network,0);
type('CG');assert.ok(results().length);
key('Escape');assert.equal(document.activeElement,top);
assert.equal(await controller.openLessonTopic({route:'https://example.org'},trigger),false);
assert.equal(dialog().hidden,true);

trigger.focus();
assert.equal(await controller.openLessonTopic({route:scattering},trigger),true);
assert.equal(loads,1);
assert.equal(topicButton().getAttribute('aria-pressed'),'true');
assert.match(topicButton().textContent,english?/This topic/:/本主题课程/);
assert.equal(find('[data-finder-scope="tools"]').hidden,true,'Context records only present course scopes');
assert.equal(document.activeElement,query());
assert.equal(query().value,'');
assert.equal(results().length,3);
assert.match(list().innerHTML,english?/Current lesson/:/当前课/);
assert.equal(catalog().hidden,false);
const siteSearch=english?'real space':'实空间位点';
type(siteSearch);
assert.equal(results().length,0);
catalog().fire('click');
assert.equal(query().value,siteSearch);
assert.ok(results().length);
assert.match(status().textContent,english?/catalog/:/本目录/);
assert.equal(topicButton().getAttribute('aria-pressed'),'false');
topicButton().fire('click');
assert.equal(query().value,siteSearch,'Selecting the topic keeps the existing search term');
assert.equal(results().length,0);
assert.equal(topicButton().getAttribute('aria-pressed'),'true');
catalog().fire('click');
type('acoustic optical');
assert.equal(results().length,0);
expansion().fire('click');
assert.equal(query().value,'acoustic optical');
assert.match(status().textContent,/197/);
assert.ok(results().length);
assert.equal(catalog().hidden,true);
key('Enter');
assert.equal(parseClassroomRoute(routes.at(-1)).lesson,'acoustic-optical');
assert.equal(document.activeElement,trigger);
assert.equal(dialog().hidden,true);
assert.equal(network,0);

await controller.openLessonTopic({route:foundation},trigger);
assert.equal(catalog().hidden,true,'Catalog-only topics need no intermediate choice');
assert.equal(results().length,ordinary.topic.length);
expansion().fire('click');
assert.equal(query().value,'');
assert.equal(results().length,16);
expansion().fire('click');
assert.equal(results().length,ordinary.topic.length);
key('Escape');
assert.equal(document.activeElement,trigger);
key('K',{ctrlKey:true});
assert.equal(find('[data-finder-scope="tools"]').getAttribute('aria-pressed'),'true');
assert.equal(find('[data-finder-scope="tools"]').hidden,false,'Ordinary quick search restores the tool scope');
assert.equal(expansion().hidden,true);
assert.equal(query().value,'');
key('Escape');
controller.destroy();

rejectLoad=true;
controller=start();
assert.equal(await controller.openLessonTopic({route:scattering},trigger),false);
assert.ok(find('[data-finder-topic-retry]'));
rejectLoad=false;
find('[data-finder-topic-retry]').fire('click');
await flush();
assert.equal(results().length,3);
controller.destroy();

let resolveDelayed;
controller=start(()=>new Promise(resolve=>{resolveDelayed=resolve;}));
const late=controller.openLessonTopic({route:foundation},trigger);
await flush();
const second=controller.openLessonTopic({route:scattering},trigger);
type('scattering chain');
resolveDelayed(topicModule);
assert.equal(await late,false);
assert.equal(await second,true);
assert.equal(query().value,'scattering chain');
assert.equal(results().length,1);
assert.match(list().innerHTML,english?/Current lesson/:/当前课/);
key('Escape');
assert.equal(document.activeElement,trigger);
controller.destroy();
controller=start(()=>new Promise(resolve=>{resolveDelayed=resolve;}));
const afterClose=controller.openLessonTopic({route:scattering},trigger);
await flush();
key('Escape');
resolveDelayed(topicModule);
assert.equal(await afterClose,false);
assert.equal(dialog().hidden,true);
assert.equal(document.activeElement,trigger);
controller.destroy();
assert.equal(events.keydown.length,0);
console.log(`Lesson topic finder (${english?'English':'Chinese'}): qualified 197-lesson index, lazy scope, input preservation, stale/retry guards, keyboard navigation and focus return passed.`);
