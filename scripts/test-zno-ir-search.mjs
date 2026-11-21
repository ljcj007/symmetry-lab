import assert from 'node:assert/strict';
import {Container} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {toolsIndex,renderNavigationHub,searchEntries}=await import(prefix+'navigation-ui.js');
const {finderResults}=await import(prefix+'tool-finder.js');
const {filterToolDirectory}=await import(prefix+'tool-directory.js');
const {parseClassroomRoute,buildClassroomHash}=await import(prefix+'classroom-ui.js');
const tool='compute/phonon-modes';
const example=`${tool}?preset=zno-ir`;

const queries=['ZnO infrared polarization','ZnO Born effective charge','ZnO 红外偏振','氧化锌 红外偏振','ZnO IR','zinc oxide infrared polarisation','“ZnO infrared polarization”','氧化锌红外偏振'];
assert.equal(toolsIndex.length,75);
assert.ok(!toolsIndex.some(item=>item.route===example));
for(const query of queries){
 const result=finderResults(toolsIndex,query)[0];
 assert.equal(result?.route,example,query);
 assert.match(result.title,english?/Infrared polarization.*ZnO/:/ZnO.*红外偏振/);
 assert.equal(finderResults(toolsIndex,query,{scope:'all'})[0]?.route,example,query);
 assert.equal(searchEntries(toolsIndex,query)[0]?.route,example,query);
 assert.equal(filterToolDirectory(toolsIndex,{query})[0]?.route,tool,query);
 assert.deepEqual(filterToolDirectory(toolsIndex,{query,favorites:[]}),[]);
}
for(const query of ['infrared','IR','Raman','ZnO Raman','ZnO infrared Raman','ZnO','Born effective charge','GaAs infrared polarization','红外','拉曼','铝 红外偏振']){
 assert.ok(!finderResults(toolsIndex,query).some(item=>item.route===example),query);
}

const directory=new Container();
await renderNavigationHub({container:directory,view:'compute'});
const filter=directory.querySelector('#site-search');
filter.value=queries[0];
filter.oninput();
const link=directory.querySelector('.nav-tool-example');
assert.equal(link.getAttribute('href'),'#'+example);
assert.match(link.textContent,english?/ZnO infrared polarization example/:/ZnO.*红外偏振算例/);
assert.equal(directory.querySelector(`[data-route="${tool}"]`).getAttribute('href'),'#'+tool);
assert.equal(directory.querySelectorAll('[data-favorite]')[0].dataset.favorite,tool);
assert.match(directory.querySelector('#tools-filter-status').textContent,/\/ 75/);

const selection=parseClassroomRoute(example);
assert.equal(selection.calculationOnly,true);
assert.equal(selection.module,'modes');
assert.equal(selection.preset,'zno-ir');
assert.equal(buildClassroomHash(selection),'#'+tool+'?module=modes&preset=zno-ir');
console.log(`ZnO infrared search (${english?'English':'Chinese'}): scoped aliases, Finder and directory, ordinary routes and existing manual-run preset passed.`);
