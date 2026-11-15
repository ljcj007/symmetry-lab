import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Container,Element,flush} from './test-material-research-ui.mjs';

// Keep the adapter's parser internal arrays, but expose iterable, non-Array
// collections to the production form, tab and draft handlers.
const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...descriptor,set(value){
 parsing++;try{descriptor.set.call(this,value);}finally{parsing--;}
}});
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){
 const rows=queryAll.call(this,selector);if(parsing)return rows;
 return Object.assign({length:rows.length,forEach:fn=>rows.forEach(fn),
  [Symbol.iterator]:function*(){yield* rows;}},Object.fromEntries(rows.map((row,i)=>[i,row])));
};

const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/material-research.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/material-research.json',import.meta.url),'utf8'));
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>{throw Error('This task must not write mastery');}};
globalThis.fetch=async url=>{assert.match(String(url),/data\/material-research\.json/);return{ok:true,json:async()=>structuredClone(catalog)};};
const {renderMaterialResearchView,setMaterialResearchInput,getMaterialResearchResult}=await import('../dist/material-research-ui.js');
const base=structuredClone(fixtures.requests.modesFiniteQ.input.data);
delete base.frequency_unit;
if(base.physical_unit)delete base.physical_unit.frequency;
const sourceA=JSON.stringify(base),sourceB=JSON.stringify({...base,description:'An independent edited source'}),companion=JSON.stringify(base);
const calls=[];
const runner=async(action,input)=>{calls.push({action,input:structuredClone(input)});return structuredClone(fixtures.results.modesFiniteQ);};
const mount=async({course=false,handoff,run=runner,material}={})=>{
 if(handoff)setMaterialResearchInput('modes',handoff);
 const container=new Container(),navigations=[],downloads=[];await renderMaterialResearchView({container,selection:{module:'modes',tab:'lab',...(material?{material}:{}),...(!course?{calculationOnly:true}:{})},run,onNavigate:patch=>navigations.push(patch),download:(body,name)=>downloads.push({body,name})});
 return{container,navigations,downloads,$:s=>container.querySelector(s)};
};
const edit=(view,id,value)=>{const node=view.$('#'+id);node.value=value;view.$('#mr-form').oninput({target:node});};
const choose=async(view,id,value)=>{const node=view.$('#'+id);node.value=value;if(node.onchange)await node.onchange({target:node});else view.$('#mr-form').oninput({target:node});};
const submit=async view=>{await view.$('#mr-form').onsubmit({preventDefault(){}});await flush();return calls.at(-1).input;};
const upload=(view,content,name='replacement.yaml',kind='mr-file')=>view.$('#'+kind).onchange({target:{files:[{name,size:content.length,text:async()=>content}]}});
const handoff=()=>({content:sourceA,structure_content:companion,filename:'original-qpoints.json',
 frequency_unit:'THz',length_unit:'angstrom',selected_q:0,selected_band:1,supercell:[2,1,1]});
const roundtrip=view=>{view.$('[data-mr-tab="learn"]').onclick();view.$('[data-mr-tab="lab"]').onclick();};

const direct=await mount();
assert.equal(direct.$('#mr-frequency-unit'),null,'Built-in modes do not ask for an imported-source confirmation');
assert.equal(Object.hasOwn(await submit(direct),'frequency_unit'),false,'Synthetic input contract remains unchanged');
await choose(direct,'mr-preset','custom');
assert.equal(direct.$('#mr-frequency-unit').value,'unknown');
await upload(direct,sourceA);
let input=await submit(direct);
assert.equal(input.frequency_unit,'unknown');assert.equal(input.content,sourceA);
assert.equal(Object.hasOwn(input,'length_unit'),false);

const transferred=await mount({course:true,handoff:handoff()});
assert.equal(transferred.$('#mr-frequency-unit').value,'THz','Explicit importer handoff is visible');
assert.equal(transferred.$('#mr-structure-text').value,companion);
assert.equal(Array.isArray(transferred.$('#mr-form').querySelectorAll('select')),false);
const before=calls.length;
await choose(transferred,'mr-frequency-unit','cm^-1');
edit(transferred,'mr-phase','0.37');roundtrip(transferred);
assert.equal(transferred.$('#mr-frequency-unit').value,'cm^-1');
assert.equal(transferred.$('#mr-structure-text').value,companion);
assert.equal(transferred.$('#mr-length').value,'angstrom');
assert.equal(transferred.$('#mr-phase').value,'0.37');
assert.equal(calls.length,before,'Tabs and unit choices wait for manual Run');
await upload(transferred,sourceA,'same-bytes-renamed.json');
assert.equal(transferred.$('#mr-frequency-unit').value,'cm^-1','An identical source keeps its confirmation');
assert.equal(transferred.$('#mr-structure-text').value,companion);
input=await submit(transferred);assert.equal(input.filename,'same-bytes-renamed.json');
await upload(transferred,sourceB,'different-qpoints.json');
assert.equal(transferred.$('#mr-frequency-unit').value,'unknown');
assert.equal(transferred.$('#mr-length').value,'auto');
assert.equal(transferred.$('#mr-structure-text').value,'');
input=await submit(transferred);
assert.equal(input.filename,'different-qpoints.json');assert.equal(input.frequency_unit,'unknown');
assert.equal(input.structure_content,'');assert.equal(Object.hasOwn(input,'structure_data'),false);

const pasted=await mount({course:true,handoff:handoff()});
const textarea=pasted.$('#mr-file-text');
edit(pasted,'mr-qi','');edit(pasted,'mr-file-text',sourceB);
assert.equal(pasted.$('#mr-file-text'),textarea,'Source typing keeps the focused textarea node');
assert.equal(pasted.$('#mr-frequency-unit').value,'unknown');assert.equal(pasted.$('#mr-length').value,'auto');
assert.equal(pasted.$('#mr-structure-text').value,'');
assert.match(pasted.$('#mr-input-status').textContent,/主文件已改变/);
roundtrip(pasted);
assert.equal(pasted.$('#mr-qi').value,'','An unrelated incomplete parameter remains an editable draft');
assert.equal(pasted.$('#mr-file-text').value,sourceB);
assert.equal(pasted.$('#mr-frequency-unit').value,'unknown');
edit(pasted,'mr-qi','0');await choose(pasted,'mr-frequency-unit','THz');
edit(pasted,'mr-file-text',sourceB);
assert.equal(pasted.$('#mr-frequency-unit').value,'THz','Identical textarea input does not reset a new confirmation');
input=await submit(pasted);assert.equal(input.filename,'pasted-phonons.yaml');

const hidden=await mount({handoff:{data:base,structure_data:base,filename:'old-object.json',frequency_unit:'meV',length_unit:'angstrom'}});
await upload(hidden,sourceB,'new-text.json');input=await submit(hidden);
assert.equal(Object.hasOwn(input,'data'),false,'New text supersedes the hidden object');
assert.equal(Object.hasOwn(input,'structure_data'),false,'A new primary cannot reuse a hidden companion');
assert.equal(input.content,sourceB);assert.equal(input.frequency_unit,'unknown');
const hiddenEmpty=await mount({handoff:{data:base,structure_data:base,frequency_unit:'THz'}});
edit(hiddenEmpty,'mr-file-text','');input=await submit(hiddenEmpty);
assert.equal(Object.hasOwn(input,'data'),false,'An explicit empty edit cannot revive a hidden source');
assert.equal(Object.hasOwn(input,'structure_data'),false);
assert.equal(input.frequency_unit,'unknown');

const paired=await mount({handoff:handoff()});
edit(paired,'mr-structure-text',JSON.stringify({...base,description:'Different companion bytes'}));
assert.equal(paired.$('#mr-frequency-unit').value,'THz','Companion edits do not relabel primary frequencies');
assert.equal(paired.$('#mr-length').value,'auto','Companion metadata is read afresh');

const untouchedCRLF=JSON.stringify(base,null,2).replace(/\n/g,'\r\n');
const newline=await mount({course:true,handoff:{...handoff(),content:untouchedCRLF,structure_content:untouchedCRLF}});
newline.$('#mr-file-text').value=untouchedCRLF.replace(/\r\n/g,'\n');
newline.$('#mr-structure-text').value=untouchedCRLF.replace(/\r\n/g,'\n');
input=await submit(newline);
assert.equal(input.content,untouchedCRLF,'A browser-normalized textarea does not rewrite an untouched primary file');
assert.equal(input.structure_content,untouchedCRLF,'Untouched companion bytes are retained too');
assert.equal(input.frequency_unit,'THz');assert.equal(input.length_unit,'angstrom');
edit(newline,'mr-phase','0.37');roundtrip(newline);input=await submit(newline);
assert.equal(input.content,untouchedCRLF);assert.equal(input.structure_content,untouchedCRLF);
edit(newline,'mr-file-text',untouchedCRLF.replace(/\r\n/g,'\n'));
assert.equal(newline.$('#mr-frequency-unit').value,'unknown','An explicit LF text edit is a new source');
input=await submit(newline);assert.equal(input.content,untouchedCRLF.replace(/\r\n/g,'\n'));assert.equal(input.structure_content,'');
const autofill=await mount({handoff:handoff()});
autofill.$('#mr-file-text').value=sourceB;input=await submit(autofill);
assert.equal(input.frequency_unit,'unknown');assert.equal(input.structure_content,'','Read catches changed visible text even without an input event');

// This injected result tests only source-card/context presentation. Exact ZnO
// identification is separately tested against the real byte-pinned dataset.
const identifiedResult=()=>({...structuredClone(fixtures.results.modesFiniteQ),synthetic:false,
 sourceIdentity:{sha256:'a'.repeat(64),byteCount:123,
  reference:{id:'phonopy-zno-derived-qpoints',generator:{phonopy:'4.10.0',isNAC:false},
   companion:{expectedSha256:'b'.repeat(64),actualSha256:'b'.repeat(64),matchesPinnedSource:true}}}});
const context=await mount({course:true,material:'silicon',handoff:handoff(),run:async(action,request)=>{
 calls.push({action,input:structuredClone(request)});
 return request.content===sourceA?identifiedResult():structuredClone(fixtures.results.modesFiniteQ);
}});
roundtrip(context);
assert.equal(context.navigations.at(-1).material,undefined,'Handoff has no verified file identity before manual Run');
await submit(context);
assert.equal(context.navigations.at(-1).material,'zno');
assert.match(context.$('#mr-result').innerHTML,/ZnO 派生计算来源/);
assert.match(context.$('#mr-result').innerHTML,/伴随原胞与固定版本原文逐字节一致/);
assert.match(context.$('#mr-result').innerHTML,/phonopy-zno-source\.json/);
context.$('#mr-download').onclick();
assert.equal(JSON.parse(context.downloads.at(-1).body).teachingBackground.material,'silicon','The teaching background is retained separately');
edit(context,'mr-file-text',sourceB);assert.equal(getMaterialResearchResult(),null);
roundtrip(context);assert.equal(context.navigations.at(-1).material,undefined);
await submit(context);assert.equal(context.navigations.at(-1).material,undefined,'An unrelated new file inherits neither Si nor ZnO identity');
assert.doesNotMatch(context.$('#mr-result').innerHTML,/ZnO 派生计算来源/);
const switchedPreset=await mount({course:true,material:'zno',handoff:handoff(),run:async(action,request)=>{
 calls.push({action,input:structuredClone(request)});
 return request.preset==='gaas'?structuredClone(fixtures.results.modesGaAs):identifiedResult();
}});
await submit(switchedPreset);assert.equal(switchedPreset.navigations.at(-1).material,'zno');
const beforePresetChange=calls.length;
await choose(switchedPreset,'mr-preset','gaas');
assert.equal(calls.length,beforePresetChange,'Selecting the new preset waits for manual Run');
assert.equal(getMaterialResearchResult(),null,'The completed ZnO result is retired before a synthetic-model calculation');
assert.equal(switchedPreset.navigations.at(-1).material,'gaas','The current synthetic preset replaces the previous file identity');
assert.equal(switchedPreset.$('#mr-download'),null,'The old ZnO result cannot be downloaded as the new preset');
input=await submit(switchedPreset);assert.equal(input.preset,'gaas');
assert.equal(getMaterialResearchResult().material,'gaas');
switchedPreset.$('#mr-download').onclick();
const presetExport=JSON.parse(switchedPreset.downloads.at(-1).body);
assert.equal(presetExport.material,'gaas');assert.equal(presetExport.input.preset,'gaas');
assert.equal(presetExport.teachingBackground.material,'zno','The original teaching background remains separate from current material identity');
assert.equal(presetExport.result.synthetic,true);
assert.doesNotMatch(switchedPreset.$('#mr-result').innerHTML,/ZnO 派生计算来源/);
const unpaired=await mount({handoff:handoff(),run:async()=>{const r=identifiedResult();r.sourceIdentity.reference.companion.matchesPinnedSource=false;return r;}});
await unpaired.$('#mr-form').onsubmit({preventDefault(){}});
assert.equal(unpaired.navigations.at(-1).material,undefined);
assert.match(unpaired.$('#mr-result').innerHTML,/伴随原胞未与固定原文逐字节匹配/);

const concurrent=await mount({handoff:handoff()});
let finish;
const oldRead=concurrent.$('#mr-file').onchange({target:{files:[{name:'slow.json',size:sourceB.length,text:()=>new Promise(resolve=>finish=resolve)}]}});
assert.equal(concurrent.$('#mr-run').disabled,true);
await upload(concurrent,sourceA,'newer-same.json');
assert.equal(concurrent.$('#mr-frequency-unit').value,'THz');
finish(sourceB);await oldRead;
assert.equal(concurrent.$('#mr-file-text').value,sourceA);
assert.equal(concurrent.$('#mr-frequency-unit').value,'THz','A stale read cannot reset or relabel the replacement');
let finishCancel;
const cancelledRead=concurrent.$('#mr-file').onchange({target:{files:[{name:'cancelled.json',size:sourceB.length,text:()=>new Promise(resolve=>finishCancel=resolve)}]}});
concurrent.$('#mr-cancel').onclick();finishCancel(sourceB);await cancelledRead;
assert.equal(concurrent.$('#mr-file-text').value,sourceA);assert.equal(concurrent.$('#mr-frequency-unit').value,'THz');
assert.equal(concurrent.$('#mr-structure-text').value,companion);

// A unit declaration must not become a hidden numerical conversion. Evaluate
// the real public core with an undeclared file at each visible selection.
const program=String.raw`
import json,sys
sys.path.insert(0,'dist/python')
from browser_api import run
p=json.load(sys.stdin)
results=[run('phonon_modes',dict(p,frequency_unit=u)) for u in ('unknown','THz','cm^-1','meV')]
freq=lambda r:[[g['frequencies'],g['bands']] for g in r['modeGroups']]
assert all(freq(r)==freq(results[0]) for r in results)
assert all(r['selection']['frequency']==results[0]['selection']['frequency'] for r in results)
assert all(r['sourceIdentity']['sha256']==results[0]['sourceIdentity']['sha256'] for r in results)
assert results[0]['selection']['frequency']>0
assert [r['frequencyUnit'] for r in results]==['未声明单位','THz','cm^-1','meV']
assert results[0]['frequencyUnitSource']=='unspecified'
assert all(r['frequencyUnitSource']=='user.frequency_unit' for r in results[1:])
print(json.dumps({'unchangedFrequency':results[0]['selection']['frequency'],'units':[r['frequencyUnit'] for r in results]}))
`;
const actual=spawnSync(process.env.PYTHON||'python',['-c',program],{cwd:root,
 input:JSON.stringify({content:sourceA,selected_band:3,supercell:[2,1,1]}),encoding:'utf8',
 env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'},timeout:60000,maxBuffer:4*1024*1024});
assert.equal(actual.status,0,actual.error?.message||actual.stderr||actual.stdout);
const check=JSON.parse(actual.stdout);assert.deepEqual(check.units,['未声明单位','THz','cm^-1','meV']);
await submit(concurrent);
assert.ok(getMaterialResearchResult(),'Existing result/export flow remains available');
assert.ok(concurrent.$('#mr-poscar'));
console.log('Frozen-mode frequency confirmation: visible handoff/default choices, actual non-Array tab/draft handlers, same-byte retention, new primary/companion ownership, pasted/hidden-object replacement, pending cancellation/stale guards and four actual public-core unit labels with unchanged frequencies passed.');
