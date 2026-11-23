import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {Element,Container,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute} from '../dist/classroom-ui.js';

const root=new URL('../',import.meta.url),read=name=>fs.readFileSync(new URL('dist/data/examples/'+name,root));
const raw=read('phonopy-zno-qpoints.yaml'),text=raw.toString('utf8'),companion=read('phonopy-zno-structure.yaml').toString('utf8');
const source=JSON.parse(read('phonopy-zno-source.json'));
const fixture=JSON.parse(fs.readFileSync(new URL('scripts/fixtures/phonopy-zno.json',root),'utf8'));
const catalog=JSON.parse(fs.readFileSync(new URL('dist/data/structure-dynamics.json',root),'utf8'));
const researchCatalog=JSON.parse(fs.readFileSync(new URL('dist/data/material-research.json',root),'utf8'));
const hash=body=>createHash('sha256').update(body).digest('hex');
assert.equal(hash(raw),source.sha256);assert.equal(raw.length,source.byteCount);
assert.equal((text.match(/\r\n/g)||[]).length,983);
for(const file of source.inputs){assert.equal(hash(read(file.localFile)),file.sha256);assert.equal(read(file.localFile).length,file.bytes);}
assert.equal(hash(read(source.licenseFile)),source.licenseSha256);
assert.match(read(source.licenseFile).toString('utf8'),/Neither the name of the phonopy project/);
assert.equal(source.generator.settings.is_nac,false);
assert.equal(source.generator.versions.phonopy,'4.10.0');

globalThis.document={createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Loading real data must not persist original files automatically')};
Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
const normalFetch=async url=>String(url).includes('data/structure-dynamics.json')?{ok:true,json:async()=>structuredClone(catalog)}:
 String(url).includes('data/material-research.json')?{ok:true,json:async()=>structuredClone(researchCatalog)}:
 {ok:true,text:async()=>fs.readFileSync(new URL('dist/'+String(url).split('?')[0],root),'utf8')};
globalThis.fetch=normalFetch;
const ui=await import('../dist/structure-dynamics-ui.js');
assert.equal((await ui.verifyZnOPhonopyExample(text,companion)).sha256,source.sha256);
assert.equal(await ui.verifyZnOPhonopyExample(text+' ',companion),null);
assert.equal(await ui.verifyZnOPhonopyExample(text,companion+' '),null);
assert.equal(await ui.verifyZnOPhonopyExample(text.replace(/\r\n/g,'\n'),companion),null);
assert.equal(await ui.verifyZnOPhonopyExample(undefined,companion),null);
const calls=[];
const calculate=async(action,input)=>{
 calls.push({action,input:structuredClone(input)});
 const response=structuredClone(fixture.result);
 // A presentation-only regression probe: "hasHessian" is scientific data, not a hash key.
 response.presentationProbe={hasHessian:true,numericValue:1.23456789,fingerprint:[1,0,1]};
 return response;
};
const mount=async(selection={},run=calculate)=>{
 const container=new Container(),downloads=[],routes=[],cancellations=[];
 await ui.renderStructureDynamicsView({container,selection:{calculationOnly:true,experiment:'phonopy',...selection},run,
  download:(body,name)=>downloads.push({body,name}),onNavigate:value=>routes.push(value),cancelRun:()=>cancellations.push(true)});
 return {container,downloads,routes,cancellations,$:s=>container.querySelector(s)};
};
const submit=view=>view.$('#dyn-form').onsubmit({preventDefault(){}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const answer=(request,body)=>request.resolve({ok:true,text:async()=>body});
const requests=[];
const network=()=>{globalThis.fetch=(url,options)=>{const request={url,signal:options?.signal,...deferred()};requests.push(request);return request.promise;};};

const view=await mount();const before=calls.length;
assert.ok(view.$('#dyn-demo'));assert.ok(view.$('#dyn-official-al'));assert.ok(view.$('#dyn-zno'));
await view.$('#dyn-zno').onclick();
assert.equal(calls.length,before,'Loading the paired files cannot run Python');
assert.equal(view.$('#dyn-file-text').value,text);
assert.equal(view.$('#dyn-structure-text').value,companion);
assert.equal(view.$('#dyn-unit').value,'THz');
assert.equal(view.$('#dyn-qi').value,'2');assert.equal(view.$('#dyn-bi').value,'10');
assert.equal(view.$('#dyn-supercell').value,'[4,1,4]');assert.equal(view.$('#dyn-amplitude').value,'0.2');
assert.equal(view.$('#dyn-run').disabled,false);
// A native textarea normalizes CRLF even when the user has not edited it.
// Preserve the raw file state through submission and unrelated controls.
view.$('#dyn-file-text').value=text.replace(/\r\n/g,'\n');
view.$('#dyn-unit').value='THz';view.$('#dyn-form').oninput({target:view.$('#dyn-unit')});
await submit(view);
assert.equal(calls.length,before+1);assert.equal(calls.at(-1).action,'phonopy');
assert.equal(calls.at(-1).input.content,text,'Untouched native textarea must not rewrite the source bytes');
assert.equal(calls.at(-1).input.structure_content,companion);
assert.equal(calls.at(-1).input.phase,0);
assert.deepEqual(calls.at(-1).input.supercell,[4,1,4]);
assert.match(view.$('#dyn-output').innerHTML,/Phonopy 衍生计算/);
assert.match(view.$('#dyn-output').innerHTML,/明确关闭 NAC/);
assert.doesNotMatch(view.$('#dyn-output').innerHTML,/SHA-?256|[0-9a-f]{64}/i);
assert.match(view.$('#dyn-output').innerHTML,/hasHessian/);
assert.match(view.$('#dyn-output').innerHTML,/1\.23456789/);
assert.match(view.$('#dyn-output').innerHTML,/fingerprint/);
assert.match(view.$('#dyn-output').innerHTML,/逐字节匹配/);
assert.equal(view.$('#dyn-freeze').attributes.href,'#compute/phonon-modes?material=zno');
view.$('#dyn-download').onclick();const exported=JSON.parse(view.downloads.at(-1).body);
assert.equal(exported.input.content,text);assert.equal(exported.input.structure_content,companion);
assert.equal(exported.result.sourceIdentity.reference.companion.actualSha256,source.companion.sha256);
assert.deepEqual(exported.result.presentationProbe,{hasHessian:true,numericValue:1.23456789,fingerprint:[1,0,1]});
assert.equal(exported.result.sourceIdentity.reference.generator.isNAC,false);
assert.equal(view.$('#dyn-motion').querySelectorAll('circle').length,128);
view.$('#dyn-frame').oninput({target:{value:'4'}});assert.doesNotMatch(view.$('#dyn-motion').innerHTML,/NaN|Infinity/);

// Transfer the completed original files, not later unsubmitted control text.
view.$('#dyn-file-text').value='UNSUBMITTED';view.$('#dyn-freeze').onclick();
const dynamicsURL=new URL('../dist/structure-dynamics-ui.js',import.meta.url);
const specifier=fs.readFileSync(dynamicsURL,'utf8').match(/import \{setMaterialResearchInput\} from '([^']+)'/)[1];
const research=await import(new URL(specifier,dynamicsURL).href);
const handoff=new Container(),modeCalls=[],modeDownloads=[];
await research.renderMaterialResearchView({container:handoff,selection:{module:'modes',calculationOnly:true,material:'zno'},
 run:async(action,input)=>{modeCalls.push({action,input:structuredClone(input)});return structuredClone(fixture.modes);},
 download:(body,name)=>modeDownloads.push({body,name})});
const $=s=>handoff.querySelector(s);
assert.equal(modeCalls.length,0);assert.equal($('#mr-preset').value,'custom');
assert.equal($('#mr-file-text').value,text);assert.equal($('#mr-structure-text').value,companion);
assert.equal($('#mr-frequency-unit').value,'THz');assert.equal($('#mr-length').value,'auto');
$('#mr-file-text').value=text.replace(/\r\n/g,'\n');
await $('#mr-form').onsubmit({preventDefault(){}});await flush();
assert.equal(modeCalls.length,1);assert.equal(modeCalls[0].action,'phonon_modes');
assert.equal(modeCalls[0].input.content,text);assert.equal(modeCalls[0].input.frequency_unit,'THz');
assert.equal(modeCalls[0].input.structure_content,companion);assert.equal(Object.hasOwn(modeCalls[0].input,'length_unit'),false);
$('#mr-download').onclick();const frozenExport=JSON.parse(modeDownloads.at(-1).body);
assert.equal(frozenExport.result.sourceIdentity.reference.companion.matchesPinnedSource,true);
assert.match(frozenExport.result.exports.poscar,/Zn O\n32 32\nDirect/);
const researchURL=new URL(specifier,dynamicsURL),researchSource=fs.readFileSync(researchURL,'utf8');
const notebookSpecifier=researchSource.match(/from '([^']*material-notebook\.js[^']*)'/)[1];
const notebook=await import(new URL(notebookSpecifier,researchURL).href);
$('#mr-record').onclick();
assert.equal(notebook.latestCalculation().result.sourceIdentity.reference.companion.actualSha256,source.companion.sha256);
assert.equal(notebook.latestCalculation().material,'zno');

const nativeEdited=await mount();await nativeEdited.$('#dyn-zno').onclick();
nativeEdited.$('#dyn-file-text').value=text.replace(/\r\n/g,'\n');
nativeEdited.$('#dyn-form').oninput({target:nativeEdited.$('#dyn-file-text')});
await submit(nativeEdited);
assert.equal(calls.at(-1).input.content,text.replace(/\r\n/g,'\n'),'An explicit text edit is a new source representation');

// Real deep link loads exactly the paired data without executing either tool.
const route=parseClassroomRoute('compute/phonopy?preset=phonopy-zno');
const routeCalls=calls.length,linked=await mount(route);
assert.equal(calls.length,routeCalls);assert.equal(linked.$('#dyn-file-text').value,text);
assert.equal(linked.$('#dyn-structure-text').value,companion);
const learn=await mount({calculationOnly:false,tab:'learn',lesson:'phonopy-files'});
assert.equal(learn.$('#dyn-zno-route').attributes.href,'#compute/phonopy?preset=phonopy-zno');
const atlas=await mount({calculationOnly:false,atlasOnly:true});
assert.equal(atlas.$('#dyn-zno-route').attributes.href,'#compute/phonopy?preset=phonopy-zno');
assert.equal(atlas.$('.obs-case-grid').querySelectorAll('article').length,catalog.cases.length,'Dataset card does not invent a diffraction material preset');

const draft=await mount({calculationOnly:false,tab:'lab',lesson:'phonopy-files'});await draft.$('#dyn-zno').onclick();
draft.$('#dyn-file-text').value=text.replace(/\r\n/g,'\n');
draft.$('#dyn-amplitude').value='';draft.$('#dyn-supercell').value='[4,';
draft.$('[data-dyn-tab="learn"]').onclick();draft.$('[data-dyn-tab="lab"]').onclick();
assert.equal(draft.$('#dyn-amplitude').value,'');assert.equal(draft.$('#dyn-supercell').value,'[4,');
assert.equal(draft.$('#dyn-file-text').value,text.replace(/\r\n/g,'\n'));assert.equal(draft.$('#dyn-structure-text').value,companion);
draft.$('#dyn-amplitude').value='0.2';draft.$('#dyn-supercell').value='[4,1,4]';await submit(draft);
assert.equal(calls.at(-1).input.content,text,'Ordinary tabs retain original source bytes behind native LF controls');

// The primary and companion load atomically; partial or old completions do not
// change the controls, permit Enter, or release the current request's gate.
const atomic=await mount();network();const count=calls.length;
const loading=atomic.$('#dyn-zno').onclick(),primary=requests.at(-2),extra=requests.at(-1);
assert.match(primary.url,/phonopy-zno-qpoints/);assert.match(extra.url,/phonopy-zno-structure/);
assert.equal(atomic.$('#dyn-run').disabled,true);assert.equal(atomic.$('#dyn-zno').disabled,true);
await atomic.$('#dyn-zno').onclick();assert.equal(requests.at(-1),extra);
await submit(atomic);assert.equal(calls.length,count);
answer(primary,text);await flush();assert.equal(atomic.$('#dyn-file-text').value,'');assert.equal(atomic.$('#dyn-run').disabled,true);
answer(extra,companion);await loading;assert.equal(atomic.$('#dyn-file-text').value,text);assert.equal(atomic.$('#dyn-run').disabled,false);

const replaced=await mount();network();const old=replaced.$('#dyn-zno').onclick(),oldPrimary=requests.at(-2),oldCompanion=requests.at(-1);
const replacement=replaced.$('#dyn-demo').onclick(),newPrimary=requests.at(-1);
assert.equal(oldPrimary.signal?.aborted,true);
answer(oldPrimary,text);answer(oldCompanion,companion);await old;
assert.equal(replaced.$('#dyn-run').disabled,true,'Old paired completion cannot unlock a replacement');
answer(newPrimary,'NEW SYNTHETIC');await replacement;assert.equal(replaced.$('#dyn-file-text').value,'NEW SYNTHETIC');
assert.equal(replaced.$('#dyn-structure-text').value,'');assert.equal(replaced.$('#dyn-run').disabled,false);

const cancelled=await mount();network();const cancelLoad=cancelled.$('#dyn-zno').onclick(),c1=requests.at(-2),c2=requests.at(-1);
cancelled.$('#dyn-cancel').onclick();assert.equal(cancelled.$('#dyn-run').disabled,false);
answer(c1,text);answer(c2,companion);await cancelLoad;assert.equal(cancelled.$('#dyn-file-text').value,'');

const directContainer=new Container();network();
const directLoad=ui.renderStructureDynamicsView({container:directContainer,selection:route,run:calculate,download(){}});
await flush();const directPrimary=requests.at(-2),directCompanion=requests.at(-1);
assert.equal(directContainer.querySelector('#dyn-run').disabled,true);
directContainer.querySelector('#dyn-cancel').onclick();
answer(directPrimary,text);answer(directCompanion,companion);await directLoad;
assert.equal(directContainer.querySelector('#dyn-file-text').value,'','A cancelled deep-link load must not restart itself');
assert.equal(directContainer.querySelector('#dyn-run').disabled,false);

const edited=await mount();network();const editLoad=edited.$('#dyn-zno').onclick(),e1=requests.at(-2),e2=requests.at(-1);
edited.$('#dyn-file-text').value='USER INPUT';edited.$('#dyn-form').oninput({target:edited.$('#dyn-file-text')});
const message=edited.$('#dyn-output').innerHTML;answer(e1,text);answer(e2,companion);await editLoad;
assert.equal(edited.$('#dyn-file-text').value,'USER INPUT');assert.equal(edited.$('#dyn-output').innerHTML,message);

const bad=await mount();globalThis.fetch=async url=>({ok:true,text:async()=>String(url).includes('qpoints')?text:companion+' '});
await bad.$('#dyn-zno').onclick();assert.match(bad.$('#dyn-output').innerHTML,/原字节校验未通过/);
assert.equal(bad.$('#dyn-file-text').value,'');assert.equal(bad.$('#dyn-run').disabled,false);
globalThis.fetch=normalFetch;await bad.$('#dyn-retry-input').onclick();assert.equal(bad.$('#dyn-structure-text').value,companion);

const failure=await mount();network();const broken=failure.$('#dyn-zno').onclick(),f1=requests.at(-2),f2=requests.at(-1);
f1.reject(Error('<failed source>'));await broken;
assert.match(failure.$('#dyn-output').innerHTML,/&lt;failed source&gt;/);
assert.equal(failure.$('#dyn-run').disabled,false);
const retried=failure.$('#dyn-retry-input').onclick(),retry1=requests.at(-2),retry2=requests.at(-1);
answer(f2,companion);await flush();assert.equal(failure.$('#dyn-run').disabled,true);
answer(retry1,text);answer(retry2,companion);await retried;assert.equal(failure.$('#dyn-run').disabled,false);

globalThis.fetch=normalFetch;
const noCrypto=await mount();Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});
await noCrypto.$('#dyn-zno').onclick();assert.match(noCrypto.$('#dyn-output').innerHTML,/原字节校验未通过/);
assert.equal(noCrypto.$('#dyn-file-text').value,'');Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});

const detached=await mount();network();const detachedLoad=detached.$('#dyn-zno').onclick(),d1=requests.at(-2),d2=requests.at(-1);
detached.container.innerHTML='<p>Another route</p>';answer(d1,text);answer(d2,companion);await detachedLoad;
assert.equal(detached.$('#dyn-file-text'),null);

globalThis.fetch=normalFetch;const jobs=[];
const raced=await mount({},()=>{const job=deferred();jobs.push(job);return job.promise;});await raced.$('#dyn-zno').onclick();
const retired=submit(raced);raced.$('#dyn-cancel').onclick();const active=submit(raced);
jobs[0].resolve(fixture.result);await retired;assert.equal(raced.$('#dyn-run').disabled,true);
assert.equal(ui.getStructureDynamicsResult(),null);jobs[1].resolve(fixture.result);await active;
assert.equal(raced.$('#dyn-run').disabled,false);assert.equal(raced.cancellations.length,1);

const sourceHTML=ui.phonopySourceHTML(fixture.result);
assert.match(sourceHTML,/不是仓库原有的 qpoints 输出/);
assert.doesNotMatch(sourceHTML,/SHA-?256|[0-9a-f]{64}/i);
assert.match(sourceHTML,/phonopy-zno-LICENSE/);
const unmatched=structuredClone(fixture.result);unmatched.sourceIdentity.reference.companion.matchesPinnedSource=false;
assert.match(ui.phonopySourceHTML(unmatched),/仅凭 qpoints 摘要不能认证原子顺序/);
globalThis.fetch=normalFetch;
console.log('ZnO authentic workflow: paired byte identity, CRLF/native-text preservation, deep/classroom/atlas entry, manual runs, editable handoff, result/export/notebook provenance, invalid/incomplete draft retention, atomic/partial loading, replacement/cancel/retry, missing crypto, detached owners and stale job isolation passed.');
