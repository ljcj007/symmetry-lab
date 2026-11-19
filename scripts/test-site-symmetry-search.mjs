import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {finderResults}=await import(prefix+'tool-finder.js');
const {toolsIndex,renderNavigationHub}=await import(prefix+'navigation-ui.js');
const {filterToolDirectory}=await import(prefix+'tool-directory.js');
const {parseClassroomRoute,buildClassroomHash}=await import(prefix+'classroom-ui.js');
const {renderPathwaysView}=await import(prefix+'pathways-ui.js');
const route='compute/band-representation-lab';
const preset='perovskite-sites';
const expectedHref='#'+route+'?module=bandrep&preset='+preset;
const queries=['site symmetry','site stabilizer','Wyckoff 3c 221','Wyckoff'];
if(!english)queries.push('位点对称性','位点稳定子','占位对称性');
for(const query of queries){
 assert.equal(finderResults(toolsIndex,query)[0]?.route,route,query);
 assert.equal(filterToolDirectory(toolsIndex,{query})[0]?.route,route,query);
}
for(const query of ['Wyckoff 4a','Wyckoff 230'])assert.deepEqual(finderResults(toolsIndex,query),[]);
const scope=toolsIndex.find(item=>item.route===route).capability;
assert.match(scope.input.join(' '),english?/space groups 2, 4, 19, and 221/:/空间群 2、4、19、221/);
assert.match(scope.input.join(' '),english?/complete p triplet.*BC basis/:/完整 p 三重态.*BC 倒格分数/);

const requested=[];
globalThis.fetch=async url=>{
 const path=String(url).split('?')[0];
 requested.push(path);
 assert.equal(path,'data/pathways-materials.json');
 return {ok:true,json:async()=>JSON.parse(readFileSync(new URL(prefix+path,import.meta.url),'utf8'))};
};
const directory=new Container();
await renderNavigationHub({container:directory,view:'compute'});
const filter=directory.querySelector('#site-search');
filter.value='Wyckoff 3c 221';
filter.oninput();
assert.equal(requested.length,0);
const plain=directory.querySelector('[data-route="'+route+'"]');
assert.equal(plain.getAttribute('href'),'#'+route);
const link=directory.querySelector('.nav-tool-example');
assert.equal(link.getAttribute('href').replaceAll('&amp;','&'),expectedHref);
assert.match(link.textContent,english?/SG 221 3c site example/:/SG 221 的 3c 位点算例/);

const selection=parseClassroomRoute(expectedHref.slice(1));
assert.equal(selection.calculationOnly,true);
assert.equal(selection.preset,preset);
assert.equal(buildClassroomHash(selection),expectedHref);
let calculations=0;
const lab=new Container();
const cleanup=await renderPathwaysView({container:lab,selection,run:async()=>{calculations++;}});
for(const [id,value] of Object.entries({preset,group:'221',site:'faces',orbitals:'p',kPoint:'R'})){
 assert.equal(lab.querySelector('#pw-'+id).value,value,id);
}
assert.ok(lab.querySelector('#pw-run'));
assert.equal(calculations,0,'Opening the existing preset does not run Python');
cleanup();
console.log('Site symmetry search ('+(english?'English':'Chinese')+'): supported site bounds, ordinary directory route, existing 3c preset and manual run passed.');
