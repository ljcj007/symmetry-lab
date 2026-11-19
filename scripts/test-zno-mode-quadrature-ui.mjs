import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const fixtureName='zno-mode-quadrature.json';
const loadAsset=path=>readFileSync(new URL(prefix+path,import.meta.url));
const bytes=loadAsset('data/examples/'+fixtureName);
const hash=createHash('sha256').update(bytes).digest('hex');
const data=JSON.parse(bytes);
const resultFixture=JSON.parse(readFileSync(new URL('./fixtures/coupled-materials/contracts.json',import.meta.url))).results.distortion;
const {parseClassroomRoute}=await import(prefix+'classroom-ui.js');
const {renderCoupledMaterialsView,getCoupledMaterialsResult}=await import(prefix+'coupled-materials-ui.js');
const selection=parseClassroomRoute('compute/distortion-modes');
assert.equal(selection.module,'distortion');

Element.prototype.focus=function(){document.activeElement=this;};
Object.defineProperty(Element.prototype,'open',{
 configurable:true,
 get(){return Object.hasOwn(this.attributes,'open');},
 set(value){if(value)this.attributes.open='';else delete this.attributes.open;}
});
globalThis.document={compatMode:'CSS1Compat',activeElement:null};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Importing data may not record course progress')};

const requests=[];
let responseMode='tampered';
globalThis.fetch=(url,options)=>{
 const name=String(url).split('?')[0];
 if(name.endsWith('/coupled-materials.json'))return Promise.resolve({ok:true,json:async()=>JSON.parse(loadAsset(name))});
 assert.equal(url,'data/examples/'+fixtureName+'?v=20261120-zno-quadrature1');
 const request={signal:options.signal};
 requests.push(request);
 if(responseMode==='pending')return new Promise(resolve=>{request.resolve=()=>resolve(new Response(bytes));});
 if(responseMode==='bad-http')return Promise.resolve(new Response(null,{status:503}));
 if(responseMode==='tampered'){
  const amended=Buffer.from(bytes);
  amended[amended.length-2]^=1;
  return Promise.resolve(new Response(amended));
 }
 return Promise.resolve(new Response(bytes));
};

const runs=[],downloads=[];
const page=new Container();
function mount(overrides={}){
 return renderCoupledMaterialsView({container:page,selection:{...selection,...overrides},
  run:async(action,input)=>{
   runs.push({action,input});
   const fixture=structuredClone(resultFixture);
   // The solver returns a small positive residual for the rounded data on disk.
   if(input.modes?.length===2)fixture.decomposition.residualNorm=8.98006834904e-11;
   return fixture;
  },
  download:text=>downloads.push(JSON.parse(text))
 });
}
const $=id=>page.querySelector('#'+id);
const entry=()=>page.querySelector('[data-cm-zno-entry]');
const open=()=>{
 entry().open=true;
 entry().ontoggle();
};
const enterValue=(id,value)=>{
 const input=$(id);
 input.value=String(value);
 $('cm-form').oninput({target:input});
};
const chooseCustom=()=>{
 $('cm-preset').value='custom';
 $('cm-preset').onchange();
};
const submit=()=>$('cm-form').onsubmit({preventDefault(){}});
const json=()=>JSON.parse($('cm-json').value);
const button=id=>$(id).onclick();
const originalDraft={draft:'Keep my edited structure'};

let dispose=await mount();
assert.equal(entry().getAttribute('open'),null);
assert.match(entry().textContent,english?/Predict first/:/先预测/);
assert.equal(entry().querySelector('a').getAttribute('href'),'docs/coupled-materials.md#zno-mode-quadrature');
assert.equal($('cm-preset').value,'batio3');
open();
assert.equal(requests.length,0,'Opening the panel never fetches the example');
chooseCustom();
enterValue('cm-json',JSON.stringify(originalDraft));
enterValue('cm-a1',-1.7);
await button('cm-zno-one');
assert.equal($('cm-zno-error').hidden,false);
assert.match($('cm-zno-error').textContent,english?/could not be read or verified/:/读取或核验失败/);
assert.deepEqual(json(),originalDraft);
assert.equal(runs.length,0);
responseMode='bad-http';
await button('cm-zno-one');
assert.equal($('cm-zno-error').hidden,false);
assert.deepEqual(json(),originalDraft);

responseMode='pending';
const cancelLoad=button('cm-zno-one'),cancelRequest=requests.at(-1);
assert.equal($('cm-zno-cancel').hidden,false);
button('cm-zno-cancel');
assert.ok(cancelRequest.signal.aborted);
cancelRequest.resolve();
await cancelLoad;
assert.deepEqual(json(),originalDraft);
const pending=button('cm-zno-two'),staleRequest=requests.at(-1);
const newerDraft={...originalDraft,changed:true};
enterValue('cm-json',JSON.stringify(newerDraft));
assert.ok(staleRequest.signal.aborted);
staleRequest.resolve();
await pending;
assert.deepEqual(json(),newerDraft);

responseMode='ok';
enterValue('cm-amplitudes','{intentionally unfinished');
await button('cm-zno-one');
assert.equal(document.activeElement,$('cm-zno-source-status'));
assert.equal($('cm-a1').value,'-1.7','Loading preserves unrelated editing of the Landau model');
assert.equal($('cm-amplitudes').value,'');
assert.equal($('cm-remove-translation').checked,false);
assert.match($('cm-zno-source-status').textContent,english?/verified ZnO input.*phase 0/:/已核对 ZnO.*相位 0/);
const oneInput=json();
assert.deepEqual(oneInput.parent,data.parent);
assert.deepEqual(oneInput.distorted,data.distorted);
assert.deepEqual(oneInput.atom_mapping,data.parent.atoms.map((_,index)=>index));
assert.deepEqual(oneInput.modes.map(({label,...mode})=>mode),data.modes.slice(0,1));
assert.equal(runs.length,0,'Loading does not call Python');
await submit();
assert.equal(runs[0].action,'distortion_lab');
assert.deepEqual(runs[0].input.modes,oneInput.modes);
assert.equal(runs[0].input.remove_translation,false);
assert.equal(getCoupledMaterialsResult().sourceEvidence.datasetSHA256,hash);
assert.equal(getCoupledMaterialsResult().sourceEvidence.directionCount,1);
assert.deepEqual(getCoupledMaterialsResult().sourceEvidence.source,data.source);
assert.match($('cm-result').innerHTML,english?/Verified Phonopy ZnO data\./:/已核验的 Phonopy ZnO 数据。/);
button('cm-download');
assert.equal(downloads[0].sourceEvidence.directionCount,1);

const fetches=requests.length;
await button('cm-zno-two');
assert.equal(requests.length,fetches,'The second direction uses the same verified data in this view');
assert.equal(runs.length,1);
const twoInput=json();
assert.deepEqual(twoInput,{...oneInput,modes:twoInput.modes});
assert.deepEqual(twoInput.modes[0],oneInput.modes[0]);
assert.deepEqual(twoInput.modes.map(({label,...mode})=>mode),data.modes);
await submit();
assert.equal(getCoupledMaterialsResult().sourceEvidence.directionCount,2);
assert.equal($('cm-displacement-residual').innerHTML,'8.98007 × 10<sup>−11</sup> Å');
assert.deepEqual(runs[1].input,{...runs[0].input,modes:runs[1].input.modes});

enterValue('cm-json',JSON.stringify({...twoInput,name:'Edited copy'}));
assert.equal($('cm-zno-source-status').hidden,true);
await submit();
assert.equal(getCoupledMaterialsResult().sourceEvidence,undefined,'An edited example loses its original-source attribution');
assert.doesNotMatch($('cm-result').innerHTML,/id="cm-zno-result-source"/);
dispose();

dispose=await mount();
open();
responseMode='pending';
const detached=button('cm-zno-two'),abandoned=requests.at(-1);
dispose();
assert.ok(abandoned.signal.aborted);
page.innerHTML='<p>Different page</p>';
abandoned.resolve();
await detached;
assert.equal(page.innerHTML,'<p>Different page</p>');
console.log(`ZnO mode quadrature (${english?'English':'Chinese'}): exact source bytes, manual one/two-mode comparison, attempt guards, stable independent settings and source revocation passed.`);
