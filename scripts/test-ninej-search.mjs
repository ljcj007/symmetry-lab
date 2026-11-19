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
 ['8⊗8⊗8⊗8','su3-ninej-four-octets-singlet',['1,1','1,1','1,1','1,1'],'0,0',7],
 ['10⊗3⊗3⊗3','su3-ninej-decuplet-standard',['3,0','1,0','1,0','1,0'],'1,1',0],
 ['10⊗3⊗3⊗3̄','su3-ninej-decuplet-four',['3,0','1,0','1,0','0,1'],'2,1',0],
 ['15⊗3⊗3̄⊗3','su3-ninej-fifteen-four',['2,1','1,0','0,1','1,0'],'3,1',0],
 ['27⊗3⊗3̄⊗3','su3-ninej-27-four',['2,2','1,0','0,1','1,0'],'3,2',0]
];

for(const [product] of examples){
 for(const query of [product,product.replaceAll('⊗',' ⊗ '),'SU(3) '+product]){
  assert.equal(finderResults(toolsIndex,query)[0]?.route,route,query);
  assert.equal(searchEntries(toolsIndex,query)[0]?.route,route,query);
 }
}
assert.equal(finderResults(toolsIndex,'SU(3) 9j')[0]?.route,route);
assert.equal(finderResults(toolsIndex,'16⊗16⊗16⊗16').length,0);

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
search.value='8 ⊗ 8 ⊗ 8 ⊗ 8';
search.oninput();
assert.deepEqual(directory.querySelectorAll('[data-favorite]').map(button=>button.dataset.favorite),[route]);
assert.equal(requests.length,0,'Filtering the directory uses its local catalog');
assert.equal(directory.querySelector(`[data-route="${route}"]`).getAttribute('href'),'#'+route);
const link=directory.querySelector('.nav-tool-example');
assert.equal(link.getAttribute('href'),`#${route}?preset=${examples[0][1]}`);
assert.match(link.textContent,english?/singlet example/:/单态算例/);

const open=renderedRoute=>parseClassroomRoute(renderedRoute.slice(1));
let calculations=0;
const lab=new Container();
for(const [index,[,preset,factors,target,inputIndex]] of examples.entries()){
 const hash=index===0?link.getAttribute('href'):`#${route}?preset=${preset}`;
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
console.log(`9j search (${english?'English':'Chinese'}): five tensor spellings, ordinary lookup, directory example, exact preset URLs and manual Run passed.`);
