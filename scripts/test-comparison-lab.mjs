import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const storage=new Map(),KEY='symmetry-lab.comparison.v1',LIMIT=3*1024*1024;
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.location={hash:''};
const notebook=await import('../dist/material-notebook.js?v=20261030-bridges1');
const lab=await import('../dist/comparison-lab.js?v=20261030-bridges1');
const projects=await import('../dist/response-projects.js?v=20261030-bridges1');
const {bridgesAssignments}=await import('../dist/bridges-projects.js?v=20261030-bridges1');
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/bridges-projects.json',import.meta.url),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
const state=()=>JSON.parse(storage.get(KEY));
const fresh=()=>{storage.set(KEY,JSON.stringify(lab.newComparison()));notebook.captureCalculation('not-a-real-action',{},{});};
const mount=(container=new Container())=>{const downloads=[];lab.renderComparisonLab({container,download:(body,name,type)=>downloads.push({body,name,type})});return{container,downloads,$:s=>container.querySelector(s)};};
const capture=(key,overrides={})=>{const request=fixture.requests[key];return notebook.captureCalculation(request.action,request.input,fixture.results[key],{title:key,route:'compute/test',...overrides});};
const file=body=>({size:Buffer.byteLength(body),text:async()=>body});

// The persistence contract accepts every existing notebook action. Small
// structural records below test transport, not numerical physics; full real
// Python results are used for the interactive flow farther down.
const notebookSource=fs.readFileSync(new URL('../dist/material-notebook.js',import.meta.url),'utf8');
const actions=notebookSource.match(/const ACTIONS=new Set\('([^']+)'\.split/)[1].split(' ');
assert.ok(actions.length>=40);
for(const action of actions){
 const record=notebook.captureCalculation(action,{value:1},{summary:[{label:'结构测试',value:1}]},{title:action,route:'compute/test'});
 assert.ok(record,action+' is still captured');
 let pair=lab.setComparisonSlot(lab.newComparison(),'a',record);
 pair=lab.setComparisonSlot(pair,'b',{...record,input:{value:2}});
 assert.equal(pair.a.action,action);assert.equal(pair.b.action,action);
 assert.deepEqual(lab.comparisonDifferences(pair.a.input,pair.b.input),[{key:'value',a:1,b:2}]);
}
assert.throws(()=>lab.setComparisonSlot(lab.newComparison(),'c',{}),/未知/);
assert.throws(()=>lab.setComparisonSlot(lab.newComparison(),'a',null),/先/);

const A=capture('vibration-cloud-reduced-state/free'),B=capture('vibration-cloud-reduced-state/cloud');
let pair=lab.setComparisonSlot(lab.newComparison(),'a',A);
pair.prediction='只改变g时电子密度仍对称，条件振动云与约化纯度改变。';pair.predictionSavedAt='2026-10-30T03:00:00.000Z';
pair=lab.setComparisonSlot(pair,'b',B);
assert.deepEqual(lab.comparisonDifferences(pair.a.input,pair.b.input),[{key:'coupling',a:0,b:.8}]);
assert.equal(lab.comparablePlots(A,B).length,A.result.plots.length);
assert.ok(lab.comparablePlots(A,B).every(p=>p.series.some(s=>s.label.startsWith('A · '))&&p.series.some(s=>s.label.startsWith('B · '))));
assert.deepEqual(lab.comparablePlots(A,{...B,release:'older-release'}),[]);
assert.deepEqual(lab.comparablePlots(A,{...B,action:'hubbard_lab'}),[]);
for(const key of ['model','experiment','probe','responseKind','spin','pointGroup'])assert.deepEqual(lab.comparablePlots(A,{...B,input:{...B.input,[key]:'different'}}),[],'incompatible '+key+' is not overlaid');
for(const key of ['title','xLabel','yLabel']){
 const changed=copy(B);changed.result.plots.forEach(p=>p[key]+=' changed');
 assert.deepEqual(lab.comparablePlots(A,changed),[],'plot '+key+' must match');
}
const excessive=copy(B);excessive.result.plots.forEach(p=>p.series[0].points=Array.from({length:5001},(_,i)=>[i,0]));
assert.deepEqual(lab.comparablePlots(A,excessive),[],'bounded plot size');
assert.deepEqual(lab.comparablePlots({...A,result:{}},B),[]);
assert.deepEqual(lab.comparablePlots(null,B),[]);
const nestedDiff=lab.comparisonDifferences({a:{x:1,y:2},vector:[0,1],old:3},{a:{x:2,z:0},vector:[0,2],fresh:null});
assert.deepEqual(nestedDiff.map(d=>d.key),['a.x','a.y','a.z','vector','old','fresh']);
assert.equal(nestedDiff.find(d=>d.key==='a.y').b,undefined);
const reset=lab.setComparisonSlot(pair,'a',B);
assert.equal(reset.b,null);assert.equal(reset.prediction,'');assert.equal(reset.predictionSavedAt,'');assert.equal(reset.explanation,'');
assert.deepEqual(pair.a,A,'setting a new slot copies rather than mutating prior state');

for(const invalid of [null,{},[],{...pair,version:2},{...pair,release:12},{...pair,a:null},
 {...pair,b:{...B,action:'hubbard_lab'}},{...pair,explanation:'x'.repeat(12001)},
 {...pair,a:{...A,route:'javascript:alert(1)'}},{...pair,a:{...A,route:'https://evil.example/'}},
 {...pair,a:{...A,result:{bad:Infinity}}},JSON.parse('{"format":"symmetry-lab-comparison","version":1,"__proto__":{"polluted":true}}')]){
 assert.throws(()=>lab.validateComparison(invalid));
}
const big=copy(pair);big.a.result.payload='x'.repeat(LIMIT);
assert.throws(()=>lab.validateComparison(big),/3 MiB/);
assert.equal(notebook.safeRecordRoute('javascript:alert(1)'),'compute');
assert.equal(notebook.safeRecordRoute('classroom/spin?module=density&tab=lab'),'classroom/spin?module=density&tab=lab');
assert.equal({}.polluted,undefined);

// Invalid controls must remain safe even if their handlers are invoked by a
// script rather than ordinary native disabled-button click behavior.
fresh();let view=mount();
for(const id of ['cmp-a','cmp-b','cmp-save-prediction','cmp-notebook'])assert.equal(view.$('#'+id).disabled,true,id);
const empty=state();
view.$('#cmp-a').onclick();assert.deepEqual(state(),empty);
view.$('#cmp-b').onclick();assert.deepEqual(state(),empty);
view.$('#cmp-prediction').value='无A时不应保存';view.$('#cmp-save-prediction').onclick();assert.deepEqual(state(),empty,'disabled prediction cannot be saved before A');
const beforeEmptyNotebook=await notebook.listProjects();await view.$('#cmp-notebook').onclick();assert.deepEqual(await notebook.listProjects(),beforeEmptyNotebook);

// Fixed A → prediction → B → explanation → export preserves the complete
// original arrays and all conventions rather than just the plotted values.
capture('vibration-cloud-reduced-state/free');view=mount();view.$('#cmp-a').onclick();
assert.deepEqual(state().a.input,A.input);assert.deepEqual(state().a.result,A.result);
assert.equal(view.$('#cmp-save-prediction').disabled,false);
const prediction='<script>原预测</script>：g改变，密度均匀但振动云改变。';
view.$('#cmp-prediction').value=prediction;view.$('#cmp-save-prediction').onclick();
assert.equal(state().prediction,prediction);assert.ok(state().predictionSavedAt);
const forecast=copy(state());view=mount();assert.equal(view.$('#cmp-prediction').value,prediction);
assert.match(view.container.firstElementChild.innerHTML,/&lt;script&gt;原预测/);
assert.doesNotMatch(view.container.firstElementChild.innerHTML,/<script>原预测/);
capture('vibration-cloud-reduced-state/cloud');view=mount();view.$('#cmp-b').onclick();
assert.deepEqual(state().b.result,B.result);assert.equal(state().prediction,prediction);
assert.equal(view.$('#cmp-prediction').disabled,true);assert.equal(view.$('#cmp-save-prediction').disabled,true);
assert.match(view.container.firstElementChild.innerHTML,/输入参数差异（1项）/);
assert.match(view.container.firstElementChild.innerHTML,/只有一个输入参数改变/);
assert.ok(view.container.querySelectorAll('svg').length>0);
const locked=copy(state());view.$('#cmp-prediction').value='看到答案后改写预测';view.$('#cmp-save-prediction').onclick();
assert.equal(state().prediction,locked.prediction,'B locks prediction at handler level');
assert.equal(state().predictionSavedAt,locked.predictionSavedAt);
assert.equal(state().predictionSavedAt,forecast.predictionSavedAt);
const explanation='纯度降低来自非简并整体纯态的部分迹；已检查声子截断。';
view.$('#cmp-explanation').value=explanation;view.$('#cmp-save').onclick();
assert.equal(state().explanation,explanation);
view.$('#cmp-export').onclick();const exported=view.downloads.at(-1);
assert.equal(exported.name,'symmetry-parameter-comparison.json');assert.equal(exported.type,'application/json');
assert.deepEqual(JSON.parse(exported.body),state());

// A different calculator cannot replace B, even when its record is otherwise
// valid and the ordinary UI enabled the button for a recent calculation.
capture('levels-to-manybody-spectra/ground');view=mount();const unchanged=copy(state());view.$('#cmp-b').onclick();
assert.deepEqual(state(),unchanged);assert.match(view.$('#cmp-status').textContent,/相同/);

// Local restoration is independent of the last executed calculator. Imported
// JSON and notebook copies retain both records and the prediction timestamp.
fresh();view=mount();await view.$('#cmp-import').onchange({target:{files:[file(exported.body)]}});
assert.deepEqual(state(),JSON.parse(exported.body));
view=mount();assert.equal(view.$('#cmp-explanation').value,explanation);
assert.equal(view.$('#cmp-prediction').value,prediction);
assert.equal(view.$('#cmp-save-prediction').disabled,true);
const beforeNotebook=await notebook.listProjects();await view.$('#cmp-notebook').onclick();
const afterNotebook=await notebook.listProjects(),saved=afterNotebook.find(p=>!beforeNotebook.some(old=>old.id===p.id));
assert.ok(saved);assert.equal(saved.records.length,2);assert.ok(saved.notes.includes(prediction));assert.ok(saved.notes.includes(explanation));
assert.ok(saved.notes.includes(forecast.predictionSavedAt));
assert.deepEqual(saved.records[0].input,A.input);assert.deepEqual(saved.records[0].result,A.result);
assert.deepEqual(saved.records[1].input,B.input);assert.deepEqual(saved.records[1].result,B.result);
assert.notEqual(saved.records[0].id,state().a.id);assert.notEqual(saved.records[1].id,state().b.id);
notebook.validateProject(saved);
await view.$('#cmp-notebook').onclick();const twice=await notebook.listProjects();
assert.equal(twice.length,afterNotebook.length+1,'each explicit notebook export creates an independent project');
assert.deepEqual(twice.find(p=>p.id===saved.id),saved);

const stable=copy(state());
const badRoute=copy(stable);badRoute.a.route='javascript:alert(1)';
const malicious=JSON.parse(exported.body);malicious.a.result=JSON.parse('{"constructor":{"prototype":{"polluted":true}}}');
for(const body of ['{broken',JSON.stringify({}),JSON.stringify(badRoute),JSON.stringify(malicious),JSON.stringify(big)]){
 await view.$('#cmp-import').onchange({target:{files:[file(body)]}});
 assert.deepEqual(state(),stable,'invalid import preserves existing complete pair');
}
let readOversized=false;
await view.$('#cmp-import').onchange({target:{files:[{size:LIMIT+1,text:async()=>{readOversized=true;return exported.body;}}]}});
assert.equal(readOversized,false,'oversized file is rejected before reading');assert.deepEqual(state(),stable);
assert.equal({}.polluted,undefined);

// Missing browser quota must retain an honest in-session copy and an export.
const oldSet=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota');};
view.$('#cmp-explanation').value='只能暂存在内存';view.$('#cmp-save').onclick();
assert.match(view.$('#cmp-status').textContent,/内存/);
view.$('#cmp-export').onclick();assert.equal(JSON.parse(view.downloads.at(-1).body).explanation,'只能暂存在内存');
view=mount();assert.equal(view.$('#cmp-explanation').value,'只能暂存在内存','dirty in-memory draft wins over older localStorage when revisiting the page');
localStorage.setItem=oldSet;
view.$('#cmp-save').onclick();assert.equal(state().explanation,'只能暂存在内存','a later successful save persists and clears the dirty memory state');

// Both allowed text fields may together exceed the notebook's 20,000-character
// project-note limit. Full text belongs in the separate A/B record notes.
const longPair=JSON.parse(exported.body);
longPair.prediction='预'.repeat(11990)+'预测末尾标记';
longPair.explanation='释'.repeat(11990)+'解释末尾标记';
await view.$('#cmp-import').onchange({target:{files:[file(JSON.stringify(longPair))]}});
const beforeLong=await notebook.listProjects();await view.$('#cmp-notebook').onclick();
const longProject=(await notebook.listProjects()).find(p=>!beforeLong.some(old=>old.id===p.id));
assert.ok(longProject);assert.equal(longProject.records.length,2);
assert.ok(longProject.records[0].notes.includes(longPair.prediction),'full prediction survives notebook export');
assert.ok(longProject.records[0].notes.includes(longPair.predictionSavedAt));
assert.ok(longProject.records[1].notes.includes(longPair.explanation),'full explanation survives notebook export');
notebook.validateProject(longProject);

// A control from a discarded page cannot rewrite a saved forecast later.
fresh();capture('vibration-cloud-reduced-state/free');view=mount();view.$('#cmp-a').onclick();
view.$('#cmp-prediction').value='在当前页面保存';view.$('#cmp-save-prediction').onclick();
const staleHandler=view.$('#cmp-save-prediction').onclick,stale=copy(state());
view.container.innerHTML='<p>另一个页面</p>';staleHandler();assert.deepEqual(state(),stale,'detached handlers do not mutate stored prediction');

// The four new assignments are integrated into the existing fourteen-project
// center and notebook whitelist, including actual collection and copy import.
assert.equal(projects.assignmentTemplates.length,14);
for(const template of bridgesAssignments){
 assert.deepEqual(projects.assignmentTemplates.find(t=>t.id===template.id),template);
 let project=notebook.makeProject({title:template.title});
 project.assignment={id:template.id,steps:{},conclusion:'新旧模型条件和单位已分别说明。'};
 notebook.validateProject(project);
 for(const step of template.steps){
  const key=template.id+'/'+step.id,record=capture(key,{route:step.route.slice(1)});
  assert.equal(projects.assignmentAcceptance(step,record).ok,true,key);
  const wrong=copy(record),constraint=Object.keys(step.requires)[0],expected=step.requires[constraint];
  wrong.input[constraint]=typeof expected==='number'?expected+.1:expected+'-wrong';
  assert.equal(projects.assignmentAcceptance(step,wrong).ok,false);
  assert.throws(()=>projects.collectAssignmentRecord(project,template,step.id,wrong));
  const earlier=copy(project.records);
  project=projects.collectAssignmentRecord(project,template,step.id,record);
  assert.deepEqual(project.records.slice(0,-1),earlier);
  assert.deepEqual(project.records.at(-1).input,fixture.requests[key].input);
  assert.deepEqual(project.records.at(-1).result,copy(fixture.results[key]));
  assert.equal(project.assignment.steps[step.id].recordId,project.records.at(-1).id);
  project.assignment.steps[step.id].interpretation='本阶段解释：'+step.title;
  assert.doesNotMatch(projects.evidenceSummary(project.records.at(-1)),/NaN|Infinity|undefined|null/);
 }
 await notebook.saveProject(project);
 const report=projects.assignmentReport(project,template);
 for(const step of template.steps){assert.ok(report.includes(step.prompt));assert.ok(report.includes(project.assignment.steps[step.id].interpretation));}
 const imported=notebook.importProject(JSON.stringify(project));
 assert.notEqual(imported.id,project.id);assert.deepEqual(imported.records,project.records);assert.deepEqual(imported.assignment,project.assignment);
 await notebook.saveProject(imported);
 assert.deepEqual((await notebook.listProjects()).find(p=>p.id===project.id),project,'import leaves original assignment intact');
}
console.log(`Parameter comparison: ${actions.length} allowed calculators, same-tool/model/version checks, A/prediction/B locking, restoration, complete JSON/notebook copies, safe imports and disabled/stale handlers passed.`);
console.log('Project integration: all four new templates / twelve actual stages collect, report and import as independent notebook copies; fourteen templates coexist.');
