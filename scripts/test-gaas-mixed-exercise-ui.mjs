import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Container,Element,flush} from './test-material-research-ui.mjs';

globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const root=fileURLToPath(new URL('../',import.meta.url));
const python=process.env.SYMMETRY_LAB_PYTHON||'python';
const source="import json,sys; sys.path.insert(0, 'dist/python'); from browser_api import run; print(json.dumps(run('phonon_modes', json.load(sys.stdin)), allow_nan=False))";
const dataFile=name=>new URL('../dist/data/examples/'+name,import.meta.url);
const official=JSON.parse(fs.readFileSync(dataFile('phonopy-al-abacus-source.json'),'utf8'));
const band=fs.readFileSync(dataFile(official.localFile),'utf8');
const companion=fs.readFileSync(dataFile(official.companion.localFile),'utf8');
for(const english of [false,true]){
 const path=english?'../dist/en/':'../dist/';
 const data=JSON.parse(fs.readFileSync(new URL(path+'data/material-research.json',import.meta.url),'utf8'));
 globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
 const ui=await import(path+'material-research-ui.js');
 const requests=[],container=new Container();
 const query=selector=>container.querySelector(selector);
 const run=async(action,input)=>{
  assert.equal(action,'phonon_modes');
  requests.push(structuredClone(input));
  const result=spawnSync(python,['-c',source],{
   cwd:root,input:JSON.stringify(input),encoding:'utf8',maxBuffer:4*1024*1024,
  });
  if(result.error)throw result.error;
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(result.stdout);
 };
 ui.setMaterialResearchInput('modes',{content:band,structure_content:companion,
  filename:official.localFile,frequency_unit:'THz',selected_q:0,selected_band:0});
 await ui.renderMaterialResearchView({container,selection:{module:'modes',calculationOnly:true},run});
 const submit=async()=>{
  await query('#mr-form').onsubmit({preventDefault(){}});
  await flush();
  return ui.getMaterialResearchResult().result;
 };
 const choosePreset=preset=>{
  const select=query('#mr-preset');
  select.value=preset;
  select.onchange();
 };
 assert.equal(query('[data-mr-gaas-compare]'),null,'Official import is kept distinct from the exercise');
 const imported=await submit();
 assert.equal(imported.teachingPreset,null);
 assert.equal(imported.sourceIdentity.sha256,official.sha256);
 assert.equal(imported.synthetic,false);

 choosePreset('gaas');
 const exercise=query('[data-mr-gaas-compare]');
 assert.ok(exercise);
 assert.match(exercise.textContent,english?/Compare the T₂ triplets/:/对照练习：同为 T₂/);
 const load=preset=>query('[data-mr-gaas-case="'+preset+'"]').onclick();
 load('gaas');
 assert.equal(requests.length,1,'Loading the case does not run a calculation');
 assert.equal(ui.getMaterialResearchResult(),null);
 const original=await submit();
 assert.equal(original.teachingPreset,'gaas');
 const displacement=r=>r.frozen.atoms.map(a=>a.displacement[0]);
 assert.ok(Math.abs(displacement(original)[0]-displacement(original)[1])<1e-12);
 assert.ok(Math.abs(original.translationDiagnostic.nearZeroWeightFraction-1)<1e-12);
 const originalRequest=requests.at(-1);
 load('gaas-mixed');
 assert.equal(requests.length,2,'Loading mixed GaAs also waits for manual Run');
 assert.equal(ui.getMaterialResearchResult(),null);
 const mixed=await submit();
 const mixedRequest=requests.at(-1);
 assert.deepEqual(mixedRequest,{...originalRequest,preset:'gaas-mixed'});
 assert.equal(mixedRequest.selected_q,0);
 assert.equal(mixedRequest.selected_band,0);
 for(const key of ['content','structure_content','data','structure_data','frequency_unit','filename','length_unit']){
  assert.equal(Object.hasOwn(mixedRequest,key),false,key+' must not leak from official input');
 }
 assert.equal(mixed.synthetic,true);
 assert.equal(mixed.teachingPreset,'gaas-mixed');
 assert.match(query('#mr-result').textContent,english?/Synthetic mixed T₂ control/:/人工混合 T₂ 对照/);
 assert.deepEqual(mixed.modeGroups.map(g=>g.frequencies),original.modeGroups.map(g=>g.frequencies));
 assert.deepEqual(mixed.modeGroups.map(g=>g.classification.label),['T2','T2']);
 assert.ok(mixed.translationDiagnostic.groups.every(g=>Math.abs(g.weightFraction-.5)<1e-12));
 assert.ok(Math.abs(displacement(mixed)[0]-displacement(mixed)[1])>.09);
 choosePreset('custom');
 assert.equal(query('[data-mr-gaas-compare]'),null);
 assert.equal(query('#mr-file-text').value,band);
 assert.equal(query('#mr-structure-text').value,companion);
 assert.equal((await submit()).sourceIdentity.sha256,official.sha256);
 console.log((english?'English':'Chinese')+' GaAs exercise: manual loading, exact defaults, mixed output, official source isolated and restored.');
}
