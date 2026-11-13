import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {projectInputFor,projectInputStatusHTML,supportsProjectInput,getProjectInputTarget,PROJECT_INPUT_TARGETS} from '../dist/project-input.js';
import {PROJECT_INPUT_FIELDS,PROJECT_INPUT_ENUMS} from '../dist/project-input-fields.js';
import {parseClassroomRoute} from '../dist/classroom-ui.js';

let writes=0;
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
Element.prototype.focus=function(){};
Element.prototype.scrollIntoView=function(){};
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
globalThis.document={createElement:tag=>new Element(tag),compatMode:'CSS1Compat'};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')),text:async()=>fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')});
const {assignmentTemplates}=await import('../dist/response-projects.js');
const clone=x=>structuredClone(x),allSteps=assignmentTemplates.flatMap(t=>t.steps),actions=new Set(allSteps.map(s=>s.action));
assert.equal(assignmentTemplates.length,26);assert.equal(allSteps.length,78);assert.equal(actions.size,33);
assert.deepEqual(new Set(Object.keys(PROJECT_INPUT_TARGETS)),actions);
assert.equal(supportsProjectInput('future_engine'),false);
assert.equal(supportsProjectInput('teaching_labs',{lab:'spinor',experiment:'su2_coupling'}),false);
assert.equal(supportsProjectInput('teaching_labs',{lab:'lie',experiment:'su3_cg'}),false,'Unverified subtypes are not advertised as restored');
assert.equal(supportsProjectInput('hall_response_lab',{mass:-1,unexposedPhysicalTerm:2}),false,'Unknown API-only inputs cannot be silently dropped by a form');
assert.equal(supportsProjectInput('quantum_geometry_lab',{model:'unexposed-model'}),false,'A missing select option cannot silently reset to the first model');
assert.equal(supportsProjectInput('shg_lab',{model:'gaas',cut:'110'}),false,'A core-only cut cannot silently become the first exposed sample cut');
assert.equal(supportsProjectInput('phonon_thermo',{source:'mesh',frequency_unit:'unsupported-unit'}),false,'An unsupported frequency unit cannot silently become THz');
assert.ok(Object.isFrozen(PROJECT_INPUT_FIELDS.hall_response_lab));assert.ok(Object.isFrozen(PROJECT_INPUT_ENUMS.shg_lab.cut));
assert.equal(getProjectInputTarget('teaching_labs',{lab:'lie',experiment:'su2_coupling'}).route,'#compute/lie/su2_coupling');
assert.equal(projectInputFor({},'device_transport_lab',{}).status,'none');
assert.equal(projectInputFor(Object.create({projectInput:{action:'device_transport_lab',input:{}}}),'device_transport_lab',{}).status,'none','Inherited navigation metadata is not an explicit input handoff');
assert.equal(projectInputFor({projectInput:{action:'andreev_lab',input:{}}},'device_transport_lab',{}).status,'rejected');
for(const input of [{energy:Infinity},{energy:NaN},{energy:()=>{}},{energy:new Date()},JSON.parse('{"__proto__":{"polluted":true}}'),{model:'x'.repeat(4_000_001)}]){
 const state=projectInputFor({projectInput:{action:'device_transport_lab',input}},'device_transport_lab',{});
 assert.equal(state.status,'rejected');assert.match(projectInputStatusHTML(state),/role="alert"/);
}
assert.equal(projectInputFor({projectInput:{action:'phonon_thermo',input:{source:'mesh',content:'汉'.repeat(1_400_000)}}},'phonon_thermo',{}).status,'rejected','The editable-size limit counts UTF-8 bytes, not UTF-16 characters');
const original={source:'mesh',data:{eigenvectors:[[[1,0],[0,1]]]}};
const prepared=projectInputFor({projectInput:{action:'phonon_thermo',input:original}},'phonon_thermo',{source:'compare',content:''});
assert.equal(prepared.status,'loaded');assert.deepEqual(JSON.parse(prepared.input.content),original.data);
prepared.input.data.eigenvectors[0][0][0]=42;
assert.equal(original.data.eigenvectors[0][0][0],1);
assert.equal(projectInputStatusHTML({status:'none'}),'');
assert.doesNotMatch(projectInputStatusHTML({status:'rejected',message:'<img onerror="x">'}),/<img/);

const prefixes={'material-research':'mr','electronic-materials':'em','quantum-materials':'qm','response-materials':'rp',spectroscopy:'spx',pathways:'pw',bridges:'pw',principles:'pw',construction:'pw',connections:'pw',frontiers:'pw',lie:'lg'};
const namespaces=new Map();
async function mount(step,projectInput,mutate){
 const target=getProjectInputTarget(step.action,projectInput?.input);
 assert.ok(target,step.action);
 if(target.family==='workbench')return null;
 let namespace=namespaces.get(target.family);
 if(!namespace){namespace=await import('../dist/'+(target.family==='lie'?'lie-group':target.family)+'-ui.js');namespaces.set(target.family,namespace);}
 const renderer=namespace[Object.keys(namespace).find(key=>/^render.*View$/.test(key))],container=new Container(),calls=[];
 const selection={...parseClassroomRoute(step.route),...(projectInput?{projectInput}:{}),calculationOnly:true};
 const runner=async(action,input)=>{calls.push({action,input:clone(input)});throw Error('Captured submitted input without invoking Python');};
 await renderer({container,selection,run:runner});
 assert.equal(calls.length,0,'Opening an input copy cannot run '+step.action);
 const prefix=prefixes[target.family],form=container.querySelector('#'+prefix+(prefix==='lg'?'-lab-form':'-form'));
 assert.ok(form,step.route+' renders its real controls');
 if(projectInput)assert.ok(container.querySelector('.project-input-notice'),'Loaded input is explicitly identified: '+step.route);
 if(mutate)mutate(form);
 form.onsubmit({preventDefault(){}});await flush();await flush();
 return {container,form,calls,prefix};
}
let checkedSteps=0,changedInputs=0;const checkedActions=new Set();
for(const step of allSteps){
 if(step.action==='analyze')continue; // The app owns the core-workbench adapter.
 let baseline=await mount(step),changed=false;
 assert.equal(baseline.calls.length,1,step.route+' original controls submit');
 // Obtain the source snapshot from actual UI controls after a legal edit. Do
 // not manufacture the expected payload by reproducing the adapter code.
 const candidates=baseline.form.querySelectorAll('input').filter(el=>['number','range'].includes(el.type)&&Number.isFinite(Number(el.value)));
 if(step.action==='teaching_labs')candidates.sort((a,b)=>(b.id==='lg-coupling')-(a.id==='lg-coupling'));
 for(const candidate of candidates){
  const old=Number(candidate.value),min=Number(candidate.attributes.min??-Infinity),max=Number(candidate.attributes.max??Infinity),rawStep=candidate.attributes.step;
  const delta=rawStep==='1'?1:Number.isFinite(Number(rawStep))&&Number(rawStep)>0?Number(rawStep):.1;
  const next=old+delta<=max?old+delta:old-delta>=min?old-delta:old;
  if(next===old)continue;
  const edited=await mount(step,undefined,form=>{form.querySelector('#'+candidate.id).value=String(next);});
  if(edited.calls.length===1&&JSON.stringify(edited.calls[0].input)!==JSON.stringify(baseline.calls[0].input)){baseline=edited;changed=true;break;}
 }
 const source=clone(baseline.calls[0]),before=clone(source);
 assert.equal(source.action,step.action);
 const loaded=await mount(step,source);
 assert.equal(loaded.calls.length,1,step.route+' imported controls submit only on the explicit action');
 assert.deepEqual(loaded.calls[0],source,'Original input is faithfully represented by the actual UI: '+step.route);
 assert.deepEqual(source,before,'Loading/submitting does not mutate a project record');
 checkedSteps++;if(changed)changedInputs++;checkedActions.add(step.action);
}
assert.equal(checkedSteps,77);assert.equal(checkedActions.size,32);assert.ok(changedInputs>=70,'Most snapshots differ from their registered preset');
// Imported Phonopy/thermal/DOS inputs use the real file text controls. Preserve
// the literal supplied data, not just the selected numerical model parameters.
const thermoFixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/material-research.json',import.meta.url),'utf8'));
for(const key of ['thermoMesh','thermoThermal','thermoDOS']){
 const request=clone(thermoFixtures.requests[key]),step={action:'phonon_thermo',route:'#compute/phonon-thermo'};
 const loaded=await mount(step,request);
 assert.equal(loaded.calls.length,1,key+' submits only on the explicit action');
 assert.equal(loaded.form.querySelector('#mr-file-text').value,request.input.dos_content||request.input.content);
 for(const [name,value]of Object.entries(request.input))assert.deepEqual(loaded.calls[0].input[name],value,key+':'+name);
}
const data={synthetic:true,natom:1,frequency_unit:'THz',phonon:[{'q-position':[.25,.25,.25],weight:1,band:[{frequency:2},{frequency:3},{frequency:4}]}]};
const meshRequest={action:'phonon_thermo',input:{source:'mesh',data:clone(data),filename:'project-mesh.json',frequency_unit:'THz',t_min:0,t_max:1000,t_step:20,zero_policy:'error'}};
const meshBefore=clone(meshRequest),meshLoaded=await mount({action:'phonon_thermo',route:'#compute/phonon-thermo'},meshRequest);
assert.deepEqual(JSON.parse(meshLoaded.form.querySelector('#mr-file-text').value),data);
assert.deepEqual(JSON.parse(meshLoaded.calls[0].input.content),data,'The actual submit serializes the same nested mesh into the editable file representation');
assert.equal(meshLoaded.calls[0].input.source,'mesh');assert.deepEqual(meshRequest,meshBefore);
const shgStep=allSteps.find(step=>step.action==='shg_lab'),shgBase=await mount(shgStep),complexInput=clone(shgBase.calls[0]);
complexInput.input.coefficients={xxz:{re:1,im:.25},zxx:.7,zzz:1.5};const complexOriginal=clone(complexInput);
const complexLoaded=await mount(shgStep,complexInput);
assert.deepEqual(JSON.parse(complexLoaded.form.querySelector('#em-coefficients').value),complexOriginal.input.coefficients);
assert.deepEqual(complexLoaded.calls[0],complexOriginal,'Complex SHG coefficient objects pass through the actual editable JSON control');
assert.deepEqual(complexInput,complexOriginal);
assert.equal(writes,0,'Opening and editing a copy cannot overwrite evidence or mastery');
console.log('Project input:33 registered actions;77 actual stage-form roundtrips across32 actions, '+changedInputs+' edited snapshots overriding presets, five real imported-file/nested-mesh/complex-coefficient form checks, original-record isolation, safe/explicit rejection and zero automatic calculations/storage writes passed. Core analyze is covered by app routing tests.');
