import assert from 'node:assert/strict';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const root=process.argv.includes('--english')?'../dist/en/':'../dist/';
const {renderNavigationHub,rememberRoute}=await import(root+'navigation-ui.js');
const {parseClassroomRoute}=await import(root+'classroom-ui.js');
const progression=await import(root+'lesson-progression.js');
const saved=new Map();
globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.fetch=()=>assert.fail('Recent lessons must not fetch the general search catalog');

const key='symmetry-lab.recent.v1';
const point='classroom/foundations?lesson=representations';
const lie='classroom/continuous?lesson=representations';
const unknown='classroom/continuous?lesson=nonexistent';
const atlas='classroom/foundations?tab=atlas&lesson=representations';
const tool='compute/phonon-modes?preset=zno-ir';
const links=container=>container.querySelector('.nav-recent').querySelectorAll('a');
const exactTitle=route=>progression.progressionForSelection(parseClassroomRoute(route)).current.title;

saved.set(key,JSON.stringify([point,lie,unknown,atlas,tool]));
const stored=saved.get(key);
const home=new Container();
let complete;
let calls=0;
await renderNavigationHub({container:home,loadRecentProgression:()=>{
 calls++;
 return new Promise(resolve=>{complete=resolve;});
}});
assert.equal(calls,1);
const initial=links(home);
assert.deepEqual(initial.map(a=>a.getAttribute('href').replaceAll('&amp;','&')),[point,lie,unknown,atlas,tool].map(route=>'#'+route));
const fallback=initial.map(a=>a.textContent);
complete(progression);
await flush();
const loaded=links(home);
for(const [index,anchor] of loaded.entries())assert.equal(anchor,initial[index]);
assert.deepEqual(loaded.map(a=>a.dataset.route),[point,lie,unknown,atlas,tool]);
assert.notEqual(exactTitle(point),exactTitle(lie));
assert.deepEqual(loaded.map(a=>a.textContent),[exactTitle(point),exactTitle(lie),...fallback.slice(2)]);
assert.equal(saved.get(key),stored);

const disconnected=new Container();
await renderNavigationHub({container:disconnected,loadRecentProgression:()=>new Promise(resolve=>{complete=resolve;})});
const detached=links(disconnected)[0];
disconnected.innerHTML='<p>Another page</p>';
complete(progression);
await flush();
assert.equal(detached.textContent,fallback[0]);

const offline=new Container();
await renderNavigationHub({container:offline,loadRecentProgression:async()=>{throw Error('Offline');}});
await flush();
assert.deepEqual(links(offline).map(a=>a.textContent),fallback);
saved.set(key,JSON.stringify([atlas,tool]));
const toolsOnly=new Container();
await renderNavigationHub({container:toolsOnly,loadRecentProgression:()=>{calls++;}});
assert.equal(calls,1,'A tool and a classroom atlas link do not need the lesson index');

const ordinary='workbench?sg=4&kx=0&ky=0&kz=0.5&double=false';
const oldEquivalent='workbench?kz=1%2F2&double=false&sg=004';
const spinful='workbench?sg=4&kz=0.5&double=true';
const magnetic='workbench?msg=4.8&kx=0.25&kz=0.5&double=true';
const gamma='workbench?sg=154';
const pointGroup='workbench?mpg=1.2&double=true';
const english=process.argv.includes('--english');
saved.set(key,JSON.stringify([oldEquivalent,ordinary,spinful,magnetic,gamma,pointGroup]));
const workbench=new Container();
await renderNavigationHub({container:workbench,loadRecentProgression:()=>assert.fail('Workbench history has no lesson index dependency')});
assert.deepEqual(links(workbench).map(a=>a.dataset.route),[oldEquivalent,spinful,magnetic,gamma,pointGroup]);
const workbenchTitles=links(workbench).map(a=>a.textContent);
assert.deepEqual(workbenchTitles.map(title=>title.split(' · ').slice(0,-1).join(' · ')),[
 'SG 4 · k = (0, 0, 0.5)','SG 4 · k = (0, 0, 0.5)','BNS 4.8 · k = (0.25, 0, 0.5)','SG 154 · Γ','MPG 1.2'
]);
assert.notEqual(workbenchTitles[0],workbenchTitles[1]);
assert.ok(links(workbench).every(anchor=>anchor.querySelector('[data-math-ignore]')),'The mixed prose and parameter label uses a single plain, accessible text span');
assert.match(workbenchTitles[1],english?/double/i:/双值/);
assert.match(workbenchTitles[0],english?/single/i:/单值/);
saved.set(key,JSON.stringify(['workbench',oldEquivalent,magnetic,spinful]));
rememberRoute(ordinary);
assert.deepEqual(JSON.parse(saved.get(key)),[ordinary,magnetic,spinful]);
console.log('Recent routes: exact course namespaces, group/momentum/spin identifiers, equivalent workbench links, offline behavior and native anchors passed.');
