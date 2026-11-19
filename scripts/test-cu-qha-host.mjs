import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,renderClassroomView} from '../dist/classroom-ui.js';

const file=(root,path)=>fs.readFileSync(new URL(root+path,import.meta.url));
const catalog=JSON.parse(file('../dist/data/','coupled-materials.json'));
const manifest=JSON.parse(file('../dist/data/examples/phonopy-cu-qha/','source.json'));
const payloadText=file('../dist/data/examples/phonopy-cu-qha/','payload.json').toString('utf8');
const payload=JSON.parse(payloadText);
const fixtures=JSON.parse(file('./fixtures/coupled-materials/','contracts.json'));
const nativeFetch=globalThis.fetch;
const requests=[];
let tamperPayload=false;
globalThis.fetch=async url=>{
  const path=String(url).split('?')[0];
  requests.push(path);
  if(path.endsWith('/coupled-materials.json'))return {ok:true,json:async()=>catalog};
  if(path.endsWith('/phonopy-cu-qha/source.json')||path.endsWith('/phonopy-cu-qha/payload.json')){
    const name=path.split('/').at(-1);
    const bytes=Uint8Array.from(file('../dist/data/examples/phonopy-cu-qha/',name));
    if(tamperPayload&&name==='payload.json')bytes[bytes.length-2]^=1;
    return {ok:true,arrayBuffer:async()=>bytes.buffer};
  }
  if(path.endsWith('/qha-thermal-files-demo.json'))return {ok:true,text:async()=>file('../dist/',path).toString('utf8')};
  assert.fail('Unexpected resource '+path);
};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return Object.hasOwn(this.attributes,'open');},set(value){if(value)this.attributes.open='';else delete this.attributes.open;}});
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.insertAdjacentHTML=function(where,html){this.innerHTML=where==='afterbegin'?html+this.innerHTML:this.innerHTML+html;};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Loading Cu data may not set course mastery')};

const host=await import('../dist/coupled-materials-ui.js');
const scope='#classroom/observables?module=qha&tab=learn&lesson=qha-free-energy';
const labRoute='#compute/qha-lab';
const mount=async(route,options={})=>{
  const page=new Container(),moves=[],downloads=[];
  const dispose=await renderClassroomView({container:page,route,
    loadProgression:async()=>({progressionForSelection:()=>({current:null})}),
    onNavigate:(hash,context)=>moves.push({hash,context}),download:body=>downloads.push(JSON.parse(body)),
    run:options.run,cancelRun:options.cancelRun,courseRenderers:{'coupled-materials':args=>host.renderCoupledMaterialsView({...args,...options})}});
  return {page,moves,downloads,dispose,$:selector=>page.querySelector(selector)};
};
function links(view){return view.page.querySelectorAll('a').map(node=>node.getAttribute('href')?.replaceAll('&amp;','&'));}
function click(view,selector){const button=view.$(selector);assert.ok(button,selector);return button.onclick();}
function setOpen(view,open){const detail=view.$('[data-cm-cu-qha-entry]');assert.ok(detail);detail.open=open;return detail.ontoggle();}
function change(view,id,value){const node=view.$('#'+id);assert.ok(node,id);node.value=String(value);view.$('#cm-form').oninput({target:node});}
function selectSource(view,value){change(view,'cm-source',value);view.$('#cm-source').onchange();}
function submit(view){return view.$('#cm-form').onsubmit({preventDefault(){}});}
const officialReadCount=()=>requests.filter(path=>path.includes('/phonopy-cu-qha/')).length;

// Connect the actual classroom entry and the existing materials catalogue.
{
  const lesson=await mount(scope);
  assert.ok(links(lesson).includes(labRoute));
  assert.ok(links(lesson).includes('docs/cu-qha-example.md'));
  assert.equal(lesson.$('#cm-to-lab')?.tag,'button');
  assert.equal(officialReadCount(),0);
  lesson.dispose();
  const atlas=await mount({...parseClassroomRoute(scope),tab:'cases',atlasOnly:true,material:'cu-qha'});
  const first=atlas.$('.obs-case-grid').children[0];
  assert.match(first.innerHTML,/铜的多体积准谐热膨胀/);
  assert.ok(links(atlas).includes(labRoute));
  assert.ok(links(atlas).includes('#compute/qha-lab?material=qha-solid'));
  assert.ok(links(atlas).includes('#classroom/observables?module=qha&material=cu-qha'));
  assert.ok(!links(atlas).includes('#compute/qha-lab?material=cu-qha'));
  atlas.dispose();
}

// Use the production optional widget, real manifest and byte-for-byte payload
// through the normal QHA form. The result is a stand-in for the existing
// Python worker so this test can manage delayed results and cancellation.
{
  const jobs=[];
  const lab=await mount(labRoute+'?material=cu-qha',{
    run(action,input){let finish;const task=new Promise(resolve=>{finish=resolve;});const job={action,input,finish,cancelled:0};task.cancel=()=>{job.cancelled++;};jobs.push(job);return task;},
    cancelRun:()=>assert.fail('The global cancel function must not run for an owned task')
  });
  assert.equal(lab.moves.length,1);
  const cleaned=parseClassroomRoute(lab.moves[0].hash);
  assert.equal(cleaned.material,undefined);
  assert.equal(cleaned.calculationOnly,true);
  assert.equal(lab.$('#cm-source').value,'preset');
  selectSource(lab,'thermal');
  const legacyInput=JSON.stringify(fixtures.requests.qhaThermal.input.data);
  change(lab,'cm-json',legacyInput);
  change(lab,'cm-pressure',2);
  change(lab,'cm-fit_window',7);
  await setOpen(lab,true);
  assert.ok(lab.$('#cq-load'));
  assert.equal(officialReadCount(),0,'Expanding the card does not read the official data');
  tamperPayload=true;
  await click(lab,'#cq-load');
  assert.ok(!lab.$('#cq-apply'));
  assert.equal(lab.$('#cm-json').value,legacyInput);
  assert.equal(lab.$('#cm-pressure').value,'2');
  tamperPayload=false;
  await click(lab,'#cq-load');
  assert.ok(lab.$('#cq-apply'));
  assert.equal(lab.$('#cm-json').value,legacyInput,'Previewing data does not modify a draft');
  const staleApply=lab.$('#cq-apply').onclick;
  await click(lab,'#cq-apply');
  assert.equal(lab.$('#cm-json').value,payloadText);
  assert.equal(lab.$('#cm-source').value,'thermal');
  assert.equal(lab.$('#cm-pressure').value,'2');
  assert.equal(lab.$('#cm-fit_window').value,'7');
  assert.equal(document.activeElement,lab.$('#cm-cu-source-status'));
  assert.match(lab.$('#cm-cu-source-status').textContent,/官方 Cu 数据已核对并载入/);
  assert.deepEqual(jobs,[],'Reading, previewing and applying are distinct from running');

  const first=submit(lab);
  assert.deepEqual(jobs[0].input,{source:'thermal',pressure:2,fit_degree:3,fit_window:7,data:payload});
  assert.equal(jobs[0].action,'qha_lab');
  change(lab,'cm-pressure',3);
  assert.equal(jobs[0].cancelled,1);
  const second=submit(lab);
  assert.equal(jobs[1].input.pressure,3);
  jobs[0].finish(structuredClone(fixtures.results.qhaThermal));
  await first;
  assert.equal(lab.$('#cm-form').querySelector('button[type="submit"]').disabled,true);
  assert.equal(host.getCoupledMaterialsResult(),null);
  jobs[1].finish(structuredClone(fixtures.results.qhaThermal));
  await second;
  click(lab,'#cm-download');
  assert.deepEqual(lab.downloads[0].input.data,payload);
  assert.equal(lab.downloads[0].sourceEvidence.payloadSha256,manifest.payload.sha256);
  const staleDownload=lab.$('#cm-download').onclick;

  const edited=structuredClone(payload);
  edited.staticEnergies[0]+=1;
  change(lab,'cm-json',JSON.stringify(edited));
  await staleApply();
  assert.equal(lab.$('#cm-cu-source-status').hidden,true);
  assert.equal(lab.$('#cm-json').value,JSON.stringify(edited));
  staleDownload();
  assert.equal(lab.downloads.length,1);
  const ordinary=submit(lab);
  jobs[2].finish(structuredClone(fixtures.results.qhaThermal));
  await ordinary;
  assert.equal(host.getCoupledMaterialsResult().sourceEvidence,undefined);
  assert.deepEqual(jobs[2].input.data,edited);

  await click(lab,'#cm-demo');
  assert.equal(lab.$('#cm-cu-source-status').hidden,true);
  assert.notEqual(lab.$('#cm-json').value,payloadText);
  selectSource(lab,'preset');
  const synthetic=submit(lab);
  jobs[3].finish(structuredClone(fixtures.results.qha));
  await synthetic;
  assert.equal(jobs[3].input.source,'preset');
  assert.equal(jobs[3].input.data,undefined);
  assert.equal(host.getCoupledMaterialsResult().sourceEvidence,undefined);
  lab.dispose();
}

// Opening and leaving the actual shell before the optional module resolves
// cannot bind the delayed widget or replace an updated scientific tool.
{
  let resolveImport,bindings=0;
  const pending=new Promise(resolve=>{resolveImport=resolve;});
  const lab=await mount(labRoute,{loadCuQhaSourceModule:()=>pending});
  const opening=setOpen(lab,true);
  await flush();
  lab.dispose();
  lab.page.innerHTML='<section>A different calculator</section>';
  resolveImport({bindCuQhaSource(){bindings++;}});
  await opening;
  assert.equal(bindings,0);
  assert.match(lab.page.innerHTML,/A different calculator/);
}
globalThis.fetch=nativeFetch;
console.log('Cu QHA host passed original lesson and atlas routing, exact production byte verification and copy, manual solve, result ownership, source revocation, synthetic imports and stale teardown.');
