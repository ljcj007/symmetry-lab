import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container,flush} from './test-material-research-ui.mjs';

const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/material-research.json',import.meta.url),'utf8'));
const storage=new Map();
const storageAPI={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
globalThis.localStorage=storageAPI;
globalThis.document={createElement:tag=>new Element(tag)};
delete globalThis.indexedDB;
const notebook=await import('../dist/material-notebook.js?test=notebook-memory');
const {makeProject,validateProject,validateJSON,importProject,addRecord,captureCalculation,latestCalculation,
       progressSnapshot,restoreProgress,saveProject,listProjects,safeRecordRoute,MAX_PROJECT_BYTES}=notebook;
const key1='symmetry-lab.material-research.progress.v1',key2='symmetry-lab.structure-dynamics.progress.v1';
const clone=structuredClone;

const input={model:'c4v',mixing:.2,sourceNote:'<img src=x onerror=alert(1)>'};
const result=clone(fixtures.results.bandsBroken);
const record=captureCalculation('band_connectivity',input,result,{route:'compute/band-connectivity',title:'镜面破缺',material:'教学模型'});
assert.ok(record.id);input.mixing=.8;result.summary.perturbationGap=999;
assert.equal(latestCalculation().input.mixing,.2);
assert.equal(latestCalculation().result.summary.perturbationGap,.4);
const returned=latestCalculation();returned.result.summary.perturbationGap=42;assert.equal(latestCalculation().result.summary.perturbationGap,.4);
storage.set(key1,JSON.stringify({'mode-trace':true}));storage.set('unrelated.preference','private');
let project=makeProject({title:'<img src=x onerror=alert(1)>',material:'Si / 教学模型',notes:'研究问题'});
const emptyId=project.id;
project=addRecord(project,record);
assert.notEqual(project.records[0].id,record.id);
assert.equal(project.id,emptyId);assert.equal(project.records[0].input.mixing,.2);
assert.deepEqual(project.progress,{[key1]:{'mode-trace':true}});
assert.equal(Object.hasOwn(progressSnapshot(),'unrelated.preference'),false);
const roundtrip=importProject(JSON.stringify(project));
assert.notEqual(roundtrip.id,project.id);assert.match(roundtrip.title,/导入副本/);
assert.deepEqual(roundtrip.records,project.records);assert.deepEqual(roundtrip.progress,project.progress);
roundtrip.records[0].input.mixing=.1;assert.equal(project.records[0].input.mixing,.2);
assert.throws(()=>addRecord(project,null),/完成一次计算/);

for(const path of ['compute/phonon-modes','compute/band-connectivity?material=silicon','atlas/notebook','classroom/crystal?module=bands','structure?x=1','workbench','magnetictb'])assert.equal(safeRecordRoute(path),path);
for(const path of ['javascript:alert(1)','https://evil.example','#compute/bands','compute/<script>','compute/bands#evil','compute/bands\n','compute/'+('x'.repeat(1100)),null])assert.equal(safeRecordRoute(path),'compute');
const invalidProject=mutate=>{const value=clone(project);mutate(value);assert.throws(()=>validateProject(value));};
invalidProject(p=>p.version=2);invalidProject(p=>p.format='other');invalidProject(p=>p.id='');
invalidProject(p=>p.title='x'.repeat(161));invalidProject(p=>p.notes='x'.repeat(20001));
invalidProject(p=>p.records[0].action='execute_shell');invalidProject(p=>p.records[0].route='javascript:alert(1)');
invalidProject(p=>p.records[0].route='https://evil.example');invalidProject(p=>p.records[0].input=[]);
invalidProject(p=>p.records[0].result=null);invalidProject(p=>p.records.push(clone(p.records[0])));
invalidProject(p=>p.progress={unknown:{saved:true}});invalidProject(p=>p.records[0].result.notFinite=Infinity);
invalidProject(p=>p.progress={[key1]:null});invalidProject(p=>p.progress={[key1]:[]});
invalidProject(p=>p.records=Array.from({length:41},(_,i)=>({...clone(p.records[0]),id:String(i)})));
for(const evil of ['__proto__','constructor','prototype']){
 const value=clone(project);value.records[0].input=JSON.parse(`{"nested":{"${evil}":{"polluted":true}}}`);
 assert.throws(()=>validateProject(value),/对象键/);assert.equal({}.polluted,undefined);
}
for(const value of [NaN,Infinity,undefined,()=>{},Symbol('not JSON')])assert.throws(()=>validateJSON(value));
let deep={};for(let i=0;i<65;i++)deep={child:deep};assert.throws(()=>validateJSON(deep),/层级/);
assert.throws(()=>validateJSON({one:1},0,{n:1500000}),/项目数/);
const oversized=clone(project);oversized.records[0].result.large='x'.repeat(MAX_PROJECT_BYTES);
assert.throws(()=>validateProject(oversized),/32 MiB/);
assert.throws(()=>importProject(' '.repeat(MAX_PROJECT_BYTES+1)),/32 MiB/);
assert.throws(()=>importProject('{broken'));

// Capture rejects bad numbers before JSON serialization could replace them by null.
assert.equal(captureCalculation('band_connectivity',{model:'c4v'}, {energy:NaN}),undefined);
assert.equal(latestCalculation(),null);
assert.equal(captureCalculation('band_connectivity',{mixing:Infinity},{ok:true}),undefined);
assert.equal(latestCalculation(),null);
assert.equal(captureCalculation('unknown-action',{},{ok:true}),undefined);
captureCalculation('band_connectivity',project.records[0].input,project.records[0].result,{route:'compute/band-connectivity',title:'镜面破缺'});

await saveProject(project);let stored=await listProjects();assert.equal(stored.length,1);assert.deepEqual(stored[0].records,project.records);
stored[0].records[0].input.mixing=777;assert.equal((await listProjects())[0].records[0].input.mixing,.2);
assert.equal(restoreProgress({[key1]:{'mode-trace':true},[key2]:{'landau-test':true}}),2);
assert.deepEqual(JSON.parse(storage.get(key2)),{'landau-test':true});
const beforeRestore=new Map([[key1,storage.get(key1)],[key2,storage.get(key2)]]);let failRestore=true;
globalThis.localStorage={...storageAPI,setItem(key,value){if(key===key2&&failRestore){failRestore=false;throw Error('QuotaExceededError');}storage.set(key,String(value));}};
assert.throws(()=>restoreProgress({[key1]:{'new':true},[key2]:{'also-new':true}}));
for(const [key,value]of beforeRestore)assert.equal(storage.get(key),value,'Failed restoration rolls back previous progress');
globalThis.localStorage=storageAPI;

const mount=async(api=notebook,run=async()=>fixtures.results.bands)=>{
 const container=new Container(),downloads=[],calls=[],cancellations=[],reloads=[];
 await api.renderMaterialNotebook({container,run:async(action,input)=>{calls.push({action,input:clone(input)});return run(action,input);},cancelRun:()=>cancellations.push(true),download:(body,name)=>downloads.push({body,name}),reload:()=>reloads.push(true)});
 return {container,downloads,calls,cancellations,reloads,$:selector=>container.querySelector(selector)};
};
const ui=await mount();assert.equal(ui.$('#nb-title').value,project.title);
assert.equal(ui.container.querySelector('img'),null);
assert.match(ui.container.firstElementChild.innerHTML,/&lt;img/);
ui.$('#nb-notes').value='保存的材料结论';ui.$('#nb-record-notes').value='这次计算的解释';
await ui.$('#nb-export').onclick();assert.equal(ui.downloads.length,1);
const exported=JSON.parse(ui.downloads[0].body);
assert.equal(exported.notes,'保存的材料结论');assert.equal(exported.records[0].notes,'这次计算的解释');
assert.deepEqual(exported.records[0].result,project.records[0].result);
ui.$('#nb-rerun-input').value='{"unfinished":';await ui.$('#nb-save').onclick();
assert.equal((await listProjects()).find(p=>p.id===project.id).records[0].draftInput,'{"unfinished":');
assert.equal((await listProjects()).find(p=>p.id===project.id).records[0].input.mixing,.2);
ui.$('#nb-rerun-input').value=JSON.stringify({model:'c4v',mixing:0});
await ui.$('#nb-rerun').onclick();
assert.equal(ui.calls.length,1);assert.equal(ui.calls[0].action,'band_connectivity');assert.equal(ui.calls[0].input.mixing,0);
stored=await listProjects();const rerunProject=stored.find(p=>p.id===project.id);
assert.equal(rerunProject.records.length,2);
assert.equal(rerunProject.records[0].input.mixing,.2);assert.equal(rerunProject.records[0].result.summary.perturbationGap,.4);
assert.equal(rerunProject.records[1].input.mixing,0);assert.equal(rerunProject.records[1].result.summary.perturbationGap,0);
assert.notEqual(rerunProject.records[0].id,rerunProject.records[1].id);
await ui.$('#nb-progress').onclick();assert.equal(ui.reloads.length,1,'Progress restore reloads cached classroom progress');
ui.$('#nb-rerun-input').value='{"__proto__":{"polluted":true}}';await ui.$('#nb-rerun').onclick();assert.equal(ui.calls.length,1);assert.match(ui.$('#nb-status').textContent,/对象键/);
ui.$('#nb-rerun-input').value='[]';await ui.$('#nb-rerun').onclick();assert.equal(ui.calls.length,1);assert.match(ui.$('#nb-status').textContent,/JSON 对象/);

// A long calculation must never land in the newly selected project.
let resolveRun;const asynchronous=await mount(notebook,()=>new Promise(resolve=>resolveRun=resolve));
const originId=asynchronous.$('#nb-project').value;
const before=(await listProjects()).find(p=>p.id===originId).records.length;
asynchronous.$('#nb-rerun-input').value='{"model":"c4v","mixing":0}';
const pending=asynchronous.$('#nb-rerun').onclick();await flush();assert.equal(asynchronous.$('#nb-rerun').disabled,true);
// If the UI locks project switches while busy, that is also a valid prevention.
if(!asynchronous.$('#nb-new').disabled)await asynchronous.$('#nb-new').onclick();
resolveRun(clone(fixtures.results.bands));await pending;
const after=await listProjects();assert.equal(after.find(p=>p.id===originId).records.length,before+1);
for(const p of after.filter(p=>p.id!==originId))assert.equal(p.records.length,0,'A pending result must stay with its originating project');

// Importing a backup creates another project and preserves unsaved current notes.
const importedUI=await mount();const currentId=importedUI.$('#nb-project').value;
importedUI.$('#nb-notes').value='导入前尚未按保存的笔记';
await importedUI.$('#nb-import').onchange({target:{files:[{name:'backup.json',size:1000,text:async()=>JSON.stringify(project)}]}});
const all=await listProjects();assert.equal(all.find(p=>p.id===currentId).notes,'导入前尚未按保存的笔记');
assert.equal(all.length,after.length+1);assert.match(importedUI.$('#nb-title').value,/导入副本/);

// IndexedDB quota failures cannot prevent exporting a recovery copy.
const databaseRows=new Map([[project.id,clone(project)]]);let failWrites=false;
globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={transaction(){const tx={objectStore:()=>({put(value){queueMicrotask(()=>{if(failWrites)tx.onerror?.();else{databaseRows.set(value.id,clone(value));tx.oncomplete?.();}});},getAll(){const req={};queueMicrotask(()=>{req.result=[...databaseRows.values()].map(value=>clone(value));req.onsuccess?.();});return req;}})};return tx;}};request.onsuccess?.();});return request;}};
const quotaNotebook=await import('../dist/material-notebook.js?test=notebook-quota');
const quota=await mount(quotaNotebook);quota.$('#nb-notes').value='配额不足也要导出';failWrites=true;
await quota.$('#nb-export').onclick();assert.equal(quota.downloads.length,1,'Recovery export must work even if saving to IndexedDB fails');
assert.equal(JSON.parse(quota.downloads[0].body).notes,'配额不足也要导出');
await assert.rejects(()=>quotaNotebook.saveProject(project),/本地保存失败/);

console.log('Material notebook: original inputs/results, JSON backup/import copies, safe routes, format/action/key/depth/size validation, immutable old results, asynchronous reruns, notes preservation and quota-failure recovery export passed.');
