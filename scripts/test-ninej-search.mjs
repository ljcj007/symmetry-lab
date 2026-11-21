import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {toolsIndex,renderNavigationHub,searchEntries}=await import(prefix+'navigation-ui.js');
const {finderResults}=await import(prefix+'tool-finder.js');
const {parseClassroomRoute,buildClassroomHash}=await import(prefix+'classroom-ui.js');
const {renderLieGroupView}=await import(prefix+'lie-group-ui.js');
const route='compute/lie/su3_ninej';
const examples=[
 ['8⊗8⊗8⊗8','1','su3-ninej-four-octets-singlet',['1,1','1,1','1,1','1,1'],'0,0',7],
 ['8⊗8⊗8⊗8','8','su3-ninej-four-octets-adjoint',['1,1','1,1','1,1','1,1'],'1,1',0],
 ['8⊗8⊗8⊗8','27','su3-ninej-four-octets-27',['1,1','1,1','1,1','1,1'],'2,2',0],
 ['10⊗3⊗3⊗3','8','su3-ninej-decuplet-standard',['3,0','1,0','1,0','1,0'],'1,1',0],
 ['10⊗3⊗3⊗3̄','15','su3-ninej-decuplet-four',['3,0','1,0','1,0','0,1'],'2,1',0],
 ['15⊗3⊗3̄⊗3','24','su3-ninej-fifteen-four',['2,1','1,0','0,1','1,0'],'3,1',0],
 ['27⊗3⊗3̄⊗3','42','su3-ninej-27-four',['2,2','1,0','0,1','1,0'],'3,2',0],
 ['3⊗3⊗3⊗3','15','su3-ninej-four-fundamentals',['1,0','1,0','1,0','1,0'],'2,1',0],
 ['3⊗3̄⊗3⊗3̄','8','su3-ninej-color-octet',['1,0','0,1','1,0','0,1'],'1,1',0],
 ['6⊗3⊗3̄⊗1','6','su3-ninej-mixed',['2,0','1,0','0,1','0,0'],'2,0',0]
];
const exampleRoute=preset=>`${route}?preset=${preset}`;

for(const [product,target,preset] of examples){
 const spaced=product.replaceAll('⊗',' ⊗ ');
 for(const query of [product,spaced,'SU(3) '+product]){
  assert.equal(finderResults(toolsIndex,query)[0]?.route,route,query);
  assert.equal(searchEntries(toolsIndex,query)[0]?.route,route,query);
 }
 for(const query of [`${product}→${target}`,`SU(3) 9j ${spaced} -> ${target}`,`SU(3) · 9j · ${spaced} → ${target}`]){
  const [result]=finderResults(toolsIndex,query);
  assert.equal(result?.route,exampleRoute(preset),query);
  assert.equal(result.title,`SU(3) · 9j · ${spaced} → ${target}`);
  assert.match(result.summary,english?/Prefill/:/预填/);
  assert.equal(finderResults(toolsIndex,query,{scope:'all'})[0]?.route,exampleRoute(preset),query);
  assert.equal(searchEntries(toolsIndex,query)[0]?.route,exampleRoute(preset),query);
 }
}
assert.equal(finderResults(toolsIndex,'SU(3) 9j')[0]?.route,route);
assert.equal(finderResults(toolsIndex,'8⁴ → 1')[0]?.route,exampleRoute('su3-ninej-four-octets-singlet'));
assert.equal(finderResults(toolsIndex,'8 ^ 4 → 27')[0]?.route,exampleRoute('su3-ninej-four-octets-27'));
assert.equal(finderResults(toolsIndex,'ＳＵ（３） ９ｊ ２７⊗３⊗３̅⊗３→４２')[0]?.route,exampleRoute('su3-ninej-27-four'));
assert.equal(finderResults(toolsIndex,'16⊗16⊗16⊗16').length,0);
for(const query of ['8⁴ → 42','27⊗3⊗3⊗3→42','27⊗3⊗3⊗3̄→42','27⊗3⊗3̄⊗3→42̄','10⊗3⊗3⊗3̄→15′','15′⊗3⊗3̄⊗3→24','SO(3) 9j 8⁴ → 1','8⁴ → 1 → 8']){
 assert.ok(!finderResults(toolsIndex,query).some(result=>result.route.startsWith(route+'?')),query);
}

const requests=[];
globalThis.fetch=async url=>{
 requests.push(url);
 const path=String(url).split('?')[0].replace(/^\.\//,'');
 assert.equal(path,'data/lie-group-lessons.json');
 return {ok:true,json:async()=>JSON.parse(readFileSync(new URL(prefix+path,import.meta.url),'utf8'))};
};
const directory=new Container();
await renderNavigationHub({container:directory,view:'compute'});
const search=directory.querySelector('#site-search');
const directorySearch=query=>{search.value=query;search.oninput();};
const directoryExampleHrefs=()=>directory.querySelectorAll('.nav-tool-example').map(link=>link.getAttribute('href'));
directorySearch('8 ⊗ 8 ⊗ 8 ⊗ 8');
assert.deepEqual(directory.querySelectorAll('[data-favorite]').map(button=>button.dataset.favorite),[route]);
assert.equal(requests.length,0,'Filtering the directory uses its local catalog');
assert.equal(directory.querySelector(`[data-route="${route}"]`).getAttribute('href'),'#'+route);
assert.deepEqual(directoryExampleHrefs(),examples.slice(0,3).map(([, ,preset])=>'#'+exampleRoute(preset)));
assert.match(directory.querySelector('.nav-tool-example').textContent,english?/Open example.*→ 1/:/打开算例.*→ 1/);
directorySearch('27 ⊗ 3 ⊗ 3̄ ⊗ 3');
assert.deepEqual(directoryExampleHrefs(),['#'+exampleRoute('su3-ninej-27-four')]);
for(const [product,target,preset] of examples){
 directorySearch(`${product} → ${target}`);
 assert.deepEqual(directoryExampleHrefs(),['#'+exampleRoute(preset)]);
}
directorySearch('27 ⊗ 3 ⊗ 3 ⊗ 3̄ → 42');
assert.deepEqual(directoryExampleHrefs(),[]);
assert.equal(requests.length,0,'Exact preset lookup and directory rendering require no search catalog');

const open=renderedRoute=>parseClassroomRoute(renderedRoute.slice(1));
let calculations=0;
const lab=new Container();
for(const [product,targetSymbol,preset,factors,target,inputIndex] of examples){
 const [result]=finderResults(toolsIndex,`${product} → ${targetSymbol}`);
 const hash='#'+result.route;
 const selection=open(hash);
 assert.equal(selection.preset,preset);
 assert.equal(buildClassroomHash(selection),hash);
 const dispose=await renderLieGroupView({container:lab,selection,run:async()=>{calculations++;}});
 assert.ok(lab.querySelector('#lg-run'));
 assert.deepEqual([1,2,3,4].map(i=>lab.querySelector('#lg-ninej-factor'+i).value),factors);
 assert.equal(lab.querySelector('#lg-ninej-target').value,target);
 assert.equal(Number(lab.querySelector('#lg-ninej-index').value),inputIndex);
 dispose();
}
assert.equal(calculations,0,'Opening a named example initializes controls without starting Python');
console.log(`9j search (${english?'English':'Chinese'}): ordinary lookup, ten exact cases, context-specific directory links, conjugates, targets and manual Run passed.`);
