import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=String.raw`
import json
import math
import sys
sys.path.insert(0, 'dist/python')
from browser_api import run
from phonon_modes import preset_data

variant, payload = json.load(sys.stdin)
data = preset_data('gaas')
bands = data['phonon'][0]['band']
if variant == 'mixed':
    for axis in range(3):
        for atom in range(2):
            a, o = (bands[axis + i]['eigenvector'][atom][axis][0] for i in (0, 3))
            bands[axis]['eigenvector'][atom][axis][0] = (a + o) / math.sqrt(2)
            bands[axis + 3]['eigenvector'][atom][axis][0] = (a - o) / math.sqrt(2)
elif variant == 'incomplete':
    del bands[5]['eigenvector']
elif variant == 'finite-q':
    data['phonon'][0]['q-position'] = [0.5, 0, 0]
    payload['supercell'] = [2, 1, 1]
print(json.dumps(run('phonon_modes', {**payload, 'data': data}), allow_nan=False))
`;

globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const python=process.env.SYMMETRY_LAB_PYTHON||'python';
const calculate=(variant,input)=>{
 const processResult=spawnSync(python,['-c',source],{
  cwd:root,input:JSON.stringify([variant,input]),encoding:'utf8',maxBuffer:4*1024*1024,
 });
 if(processResult.error)throw processResult.error;
 assert.equal(processResult.status,0,processResult.stderr);
 return JSON.parse(processResult.stdout);
};
for(const english of [false,true]){
 const path=english?'../dist/en/':'../dist/';
 const lesson=JSON.parse(fs.readFileSync(new URL(path+'data/material-research.json',import.meta.url),'utf8'));
 globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(lesson)});
 const {renderMaterialResearchView,getMaterialResearchResult}=await import(path+'material-research-ui.js');
 const container=new Container();
 let scenario='ideal',request;
 const run=async(action,input)=>{
  assert.equal(action,'phonon_modes');
  request=structuredClone(input);
  return calculate(scenario,input);
 };
 await renderMaterialResearchView({container,selection:{module:'modes',calculationOnly:true},run});
 const field=container.querySelector('#mr-trans-ftol');
 field.value='0.0125';
 container.querySelector('#mr-form').oninput({target:field});
 const submit=async()=>{
  await container.querySelector('#mr-form').onsubmit({preventDefault(){}});
  await flush();
 };
 await submit();
 assert.equal(request.translation_frequency_tolerance,0.0125);
 let pane=container.querySelector('[data-mr-translation="resolved"]');
 assert.ok(pane);
 assert.match(pane.textContent,/0\.0125 THz/);
 assert.match(pane.textContent,/100%/);
 assert.match(pane.textContent,english?/rigid-translation diagnostic/:/Γ 点刚性平移诊断/);

 scenario='mixed';
 await submit();
 pane=container.querySelector('[data-mr-translation="outside"]');
 assert.ok(pane);
 assert.match(pane.textContent,/50%/);
 assert.match(pane.textContent,english?/lies outside the zero-frequency window/:/零频窗口外仍有刚性平移权重/);
 assert.deepEqual(getMaterialResearchResult().result.modeGroups.map(g=>g.classification.label),['T2','T2']);
 assert.equal(container.querySelectorAll('td').filter(cell=>cell.textContent.trim()==='50%').length,2);

 scenario='incomplete';
 await submit();
 pane=container.querySelector('[data-mr-translation="unavailable"]');
 assert.ok(pane);
 assert.match(pane.textContent,english?/requires a complete set of 3N eigenvectors/:/需要完整的 3N 本征矢/);
 assert.equal(container.querySelectorAll('td').filter(cell=>cell.textContent.trim()==='50%').length,0);

 scenario='finite-q';
 await submit();
 assert.equal(container.querySelector('[data-mr-translation]'),null);
 assert.equal(getMaterialResearchResult().result.translationDiagnostic,null);
 console.log((english?'English':'Chinese')+' Gamma translation UI: actual calculation, tolerance, mixed T2, incomplete and non-Gamma results passed.');
}
