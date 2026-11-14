import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const read=name=>fs.readFileSync(path.join(ROOT,'dist/data/examples',name));
const text=read('phonopy-cu-thermal-index05.yaml').toString('utf8');
const source=JSON.parse(read('phonopy-cu-thermal-source.json'));
const hash=body=>createHash('sha256').update(body).digest('hex');
assert.equal(hash(read(source.localFile)),source.sha256);
assert.equal(hash(read(source.archive.localFile)),source.archive.sha256);
assert.equal(hash(read(source.licenseFile)),source.licenseSha256);
assert.equal(read(source.localFile).length,source.byteCount);
assert.equal(read(source.archive.localFile).length,source.archive.byteCount);
assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${source.archive.byteCount}\0`),read(source.archive.localFile)])).digest('hex'),source.archive.gitBlobSha1);
assert.match(read(source.licenseFile).toString('utf8'),/Neither the name of the phonopy project/);
assert.match(source.url,new RegExp(source.commit));
// Independently read the original decimal columns, without the production parser.
const rows=Array.from(text.matchAll(/^- temperature:\s*([-\d.]+)\r?\n\s+free_energy:\s*([-\d.]+)\r?\n\s+entropy:\s*([-\d.]+)\r?\n\s+heat_capacity:\s*([-\d.]+)\r?\n\s+energy:\s*([-\d.]+)/gm),m=>{
 const [temperature,freeEnergy,entropy,heatCapacity,originalEnergy]=m.slice(1).map(Number);
 return {temperature,freeEnergy,entropy,heatCapacity,originalEnergy,internalEnergy:freeEnergy+temperature*entropy/1000};
});
assert.equal(rows.length,251);assert.equal(rows[0].temperature,0);assert.equal(rows.at(-1).temperature,2500);
assert.equal(rows[30].freeEnergy,-8.9186518);assert.equal(rows[30].entropy,134.5650065);
assert.ok(Math.abs(rows[30].internalEnergy-31.45085015)<1e-12);
assert.ok(Math.max(...rows.map(r=>Math.abs(r.internalEnergy-r.originalEnergy)))<=1.68e-7+1e-12,'Printed-decimal discrepancy with a small floating-point allowance');

if(process.argv.includes('--python')){
 const python=process.env.PYTHON||'python';
 const program=String.raw`
import copy,hashlib,json,lzma,pathlib,sys
sys.path.insert(0,str(pathlib.Path('dist/python').resolve()))
from browser_api import run
request=json.load(sys.stdin)
archive=pathlib.Path('dist/data/examples/phonopy-cu-thermal-index05.yaml.xz').read_bytes()
raw=pathlib.Path('dist/data/examples/phonopy-cu-thermal-index05.yaml').read_bytes()
assert lzma.decompress(archive)==raw, 'Archive must decode to byte-exact YAML'
result=run('phonon_thermo',request)
rejected=[]
for replacement in ('temperature:   eV','free_energy:   J/mol'):
    bad=copy.deepcopy(request)
    target='temperature:   K' if replacement.startswith('temperature') else 'free_energy:   kJ/mol'
    bad['content']=bad['content'].replace(target,replacement)
    try: run('phonon_thermo',bad)
    except ValueError: rejected.append(replacement)
    else: raise AssertionError('Incorrect units accepted')
print(json.dumps({'result':result,'rejectedUnits':rejected}))
`;
 const child=spawnSync(python,['-c',program],{cwd:ROOT,input:JSON.stringify({source:'thermal',content:text,filename:source.localFile}),encoding:'utf8',maxBuffer:8*1024*1024,timeout:60000,env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(child.status,0,child.error?.message||child.stderr||child.stdout);
 const {result,rejectedUnits}=JSON.parse(child.stdout);
 assert.equal(result.source,'thermal');assert.equal(result.basis,'per-input-cell');
 assert.equal(result.summary.natom,4);assert.equal(result.summary.synthetic,false);assert.equal(result.summary.temperatureCount,251);
 assert.equal(result.series[0].numModes,96000);assert.equal(result.series[0].numIntegratedModes,96000);
 assert.equal(result.series[0].zeroPointEnergy,11.3271895);assert.equal(result.series[0].internalEnergyDerived,true);
 let maxError=0;
 for(const [i,r]of rows.entries())for(const key of ['temperature','freeEnergy','entropy','heatCapacity','internalEnergy']){
  const actual=result.series[0].rows[i][key];maxError=Math.max(maxError,Math.abs(actual-r[key]));assert.ok(Math.abs(actual-r[key])<2e-12,`${i}/${key}: ${actual} vs ${r[key]}`);
 }
 assert.equal(rejectedUnits.length,2);
 console.log(`Official Cu thermal data: byte-exact XZ/YAML, 251 actual API rows, four-atom input-cell basis, five fields and U=F+TS, max error ${maxError}, two wrong-unit rejections passed.`);
}else{
 const {Element,Container,flush}=await import('./test-material-research-ui.mjs');
 const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/data/material-research.json'),'utf8'));
 const fixtures=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts/fixtures/material-research.json'),'utf8'));
 const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
 globalThis.document={createElement:tag=>new Element(tag)};
 globalThis.localStorage={getItem:()=>null,setItem(){throw Error('Cu examples must not persist files automatically');}};
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
 const requests=[];
 const normalFetch=async url=>String(url).startsWith('data/material-research')?{ok:true,json:async()=>structuredClone(catalog)}:{ok:true,text:async()=>fs.readFileSync(path.join(ROOT,'dist',String(url).split('?')[0]),'utf8')};
 globalThis.fetch=normalFetch;
 const ui=await import('../dist/material-research-ui.js');
 const uiSource=fs.readFileSync(path.join(ROOT,'dist/material-research-ui.js'),'utf8');
 const notebook=await import(new URL('../dist/'+uiSource.match(/from '\.\/(material-notebook\.js[^']*)'/)[1],import.meta.url));
 const identity=await ui.verifyCuThermalExample(text);
 assert.equal(identity.sha256,source.sha256);assert.equal(identity.verificationBasis,'parsed-utf8-content');
 assert.equal(await ui.verifyCuThermalExample(text+' '),null);assert.equal(await ui.verifyCuThermalExample(undefined),null);
 // Renderer fixture comes from original columns; --python checks the real core.
 const cuResult={...structuredClone(fixtures.results.thermoThermal),source:'thermal',basis:'per-input-cell',basisLabel:'每输入计算胞',summary:{...fixtures.results.thermoThermal.summary,natom:4,temperatureCount:251,synthetic:false,dulongPetitLimit:12*8.31446261815324},series:[{...structuredClone(fixtures.results.thermoThermal.series[0]),rows:rows.map(({originalEnergy,...r})=>r),zeroPointEnergy:11.3271895}]};
 const calls=[];
 const run=async(action,input)=>{calls.push({action,input:structuredClone(input)});return structuredClone(input.content===text?cuResult:fixtures.results.thermoThermal);};
 const mount=async(selection={},calculate=run)=>{const container=new Container(),downloads=[],routes=[],cancelled=[];await ui.renderMaterialResearchView({container,selection:{module:'thermo',calculationOnly:true,...selection},run:calculate,download:(body,name)=>downloads.push({body,name}),onNavigate:r=>routes.push(r),cancelRun:()=>cancelled.push(true)});return {container,downloads,routes,cancelled,$:s=>container.querySelector(s)};};
 const select=async(view,id,value)=>{const control=view.$('#'+id);control.value=value;await control.onchange({target:control});};
 const submit=view=>view.$('#mr-form').onsubmit({preventDefault(){}});
 const edit=(view,value)=>{const control=view.$('#mr-file-text');control.value=value;view.$('#mr-form').oninput({target:control});};
 const network=()=>{globalThis.fetch=url=>{const next={url,...deferred()};requests.push(next);return next.promise;};};
 const answer=(request,content=text)=>request.resolve({ok:true,text:async()=>content});

 const lesson=await mount({calculationOnly:false,lesson:'thermal-data',tab:'learn',material:'silicon'});
 assert.ok(lesson.$('#mr-cu-lesson'));assert.match(lesson.$('#mr-content').innerHTML,/4 个原子/);
 const initial=calls.length;await lesson.$('#mr-cu-lesson').onclick();
 assert.equal(calls.length,initial,'Selecting the authentic example must not run it');
 assert.equal(lesson.$('#mr-source').value,'thermal');assert.equal(lesson.$('#mr-file-text').value,text);
 assert.equal(lesson.routes.at(-1).material,'cu');assert.ok(lesson.$('#mr-input-provenance').querySelector('aside'));
 await submit(lesson);assert.equal(calls.at(-1).input.content,text);assert.equal(Object.hasOwn(calls.at(-1).input,'natom'),false);
 assert.match(lesson.$('#mr-result').innerHTML,/Cu 热性质/);assert.match(lesson.$('#mr-result').innerHTML,/11.3272/);
 lesson.$('#mr-temperature').oninput({target:{value:'30'}});assert.match(lesson.$('#mr-temperature-values').innerHTML,/T = 300 K/);
 lesson.$('#mr-download').onclick();const saved=JSON.parse(lesson.downloads.at(-1).body);
 assert.equal(saved.result.inputSourceIdentity.sha256,source.sha256);assert.equal(saved.input.filename,source.localFile);
 lesson.$('#mr-record').onclick();assert.equal(notebook.latestCalculation().material,'cu');
 assert.equal(notebook.latestCalculation().result.inputSourceIdentity.verificationBasis,'parsed-utf8-content');
 edit(lesson,text+' ');assert.equal(ui.getMaterialResearchResult(),null);assert.equal(lesson.$('#mr-input-provenance').innerHTML,'');
 await submit(lesson);assert.equal(ui.getMaterialResearchResult().result.inputSourceIdentity,undefined);
 lesson.$('#mr-record').onclick();assert.equal(notebook.latestCalculation().material,'','Edited unknown data cannot inherit Si or Cu');

 const replace=await mount();await select(replace,'mr-source','thermal');network();
 const oldCu=replace.$('#mr-cu-example').onclick(),r1=requests.at(-1);
 assert.equal(replace.$('#mr-run').disabled,true);assert.equal(replace.$('#mr-cu-example').disabled,true);
 const beforeRun=calls.length;await submit(replace);assert.equal(calls.length,beforeRun,'Enter must also be blocked while loading');
 await replace.$('#mr-cu-example').onclick();assert.equal(requests.at(-1),r1,'Same pending sample cannot start twice');
 const synthetic=replace.$('#mr-demo').onclick(),r2=requests.at(-1);
 assert.notEqual(r1,r2);answer(r1);await oldCu;assert.equal(replace.$('#mr-run').disabled,true,'Late old sample cannot unlock the replacement');
 answer(r2,'NEW SYNTHETIC DATA');await synthetic;
 assert.equal(replace.$('#mr-file-text').value,'NEW SYNTHETIC DATA');assert.equal(replace.$('#mr-run').disabled,false);
 assert.equal(calls.length,beforeRun);globalThis.fetch=normalFetch;

 const upload=await mount({material:'silicon'});await select(upload,'mr-source','thermal');
 const first=deferred(),second=deferred();
 const p1=upload.$('#mr-file').onchange({target:{files:[{name:'old.yaml',size:5,text:()=>first.promise}]}});
 const p2=upload.$('#mr-file').onchange({target:{files:[{name:'renamed-cu.yaml',size:text.length,text:()=>second.promise}]}});
 first.resolve('OLD');await p1;assert.equal(upload.$('#mr-run').disabled,true);
 await submit(upload);assert.equal(calls.length,beforeRun);
 second.resolve(text);await p2;assert.equal(upload.$('#mr-run').disabled,false);assert.equal(upload.routes.at(-1).material,'cu');
 await submit(upload);assert.equal(ui.getMaterialResearchResult().input.filename,'renamed-cu.yaml');
 assert.equal(ui.getMaterialResearchResult().result.inputSourceIdentity.sha256,source.sha256);

 const failure=await mount();await select(failure,'mr-source','thermal');let attempts=0;
 const failed=failure.$('#mr-file').onchange({target:{files:[{name:'retry.yaml',size:text.length,text:async()=>{if(++attempts===1)throw Error('<img src=x>');return text;}}]}});await failed;
 assert.match(failure.$('#mr-result').innerHTML,/&lt;img/);assert.equal(failure.$('#mr-result').querySelector('img'),null);
 assert.equal(failure.$('#mr-run').disabled,false);await failure.$('#mr-retry-input').onclick();assert.equal(failure.$('#mr-file-text').value,text);
 const cancelRead=deferred(),cancelled=failure.$('#mr-file').onchange({target:{files:[{name:'cancel.yaml',size:10,text:()=>cancelRead.promise}]}});
 failure.$('#mr-cancel').onclick();assert.equal(failure.$('#mr-run').disabled,false);
 cancelRead.resolve('CANCELLED');await cancelled;assert.equal(failure.$('#mr-file-text').value,text);

 const lateText=await mount();await select(lateText,'mr-source','thermal');const body=deferred();
 globalThis.fetch=async()=>({ok:true,text:()=>body.promise});const pendingBody=lateText.$('#mr-cu-example').onclick();await flush();
 edit(lateText,'USER EDIT');body.resolve(text);await pendingBody;assert.equal(lateText.$('#mr-file-text').value,'USER EDIT');assert.equal(lateText.$('#mr-run').disabled,false);
 globalThis.fetch=normalFetch;

 const badHash=await mount();await select(badHash,'mr-source','thermal');
 globalThis.fetch=async()=>({ok:true,text:async()=>text+' '});await badHash.$('#mr-cu-example').onclick();
 assert.match(badHash.$('#mr-result').innerHTML,/校验未通过/);assert.equal(badHash.$('#mr-file-text').value,'');
 globalThis.fetch=normalFetch;await badHash.$('#mr-retry-input').onclick();assert.equal(badHash.$('#mr-file-text').value,text);

 const jobs=[];const raced=await mount({},()=>{const job=deferred();jobs.push(job);return job.promise;});
 const job1=submit(raced);raced.$('#mr-cancel').onclick();const job2=submit(raced);
 jobs[0].resolve(fixtures.results.thermoCompare);await job1;
 assert.equal(raced.$('#mr-run').disabled,true,'Retired job finally cannot unlock the current calculation');
 assert.equal(ui.getMaterialResearchResult(),null);jobs[1].resolve(fixtures.results.thermoCompare);await job2;
 assert.equal(raced.$('#mr-run').disabled,false);assert.equal(raced.cancelled.length,1);

 const detached=await mount();await select(detached,'mr-source','thermal');network();const old=detached.$('#mr-cu-example').onclick(),req=requests.at(-1);
 detached.container.innerHTML='<p>Different route</p>';answer(req);await old;assert.equal(detached.$('#mr-file-text'),null);
 globalThis.fetch=normalFetch;
 const noCrypto=await mount();await select(noCrypto,'mr-source','thermal');Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});
 await noCrypto.$('#mr-file').onchange({target:{files:[{name:'unverified.yaml',size:text.length,text:async()=>text}]}});
 assert.equal(noCrypto.$('#mr-file-text').value,text);assert.equal(noCrypto.$('#mr-input-provenance').innerHTML,'');
 await noCrypto.$('#mr-cu-example').onclick();assert.match(noCrypto.$('#mr-result').innerHTML,/校验未通过/);
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
 console.log('Official Cu thermal UI: authentic identity and assets, classroom/manual run, four-atom basis, record/export provenance, sample/file replacement, cancellation/retry, late responses, stale job-finally, no-crypto and material-context checks passed.');
}
