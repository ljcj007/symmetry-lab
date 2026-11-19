import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const fixtureURL=new URL(prefix+'data/examples/zno-ir-polarization.json',import.meta.url);
const {bindZnOIRPolarization,projectZnOIRPolarization}=await import(prefix+'zno-ir-polarization-ui.js');
const bytes=readFileSync(fixtureURL),data=JSON.parse(bytes);
assert.equal(bytes.byteLength,6283);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'7faf5a93b7590f44d81e6fd7acd9ff4e7fe4f6e7a65d1e04e8177bf52a49666b');
const {checks}=data,near=(a,b)=>assert.ok(Math.abs(a-b)<checks.tolerance,a+' ≠ '+b);
const z=projectZnOIRPolarization(data,0,0),x=projectZnOIRPolarization(data,90,0);
const tilted=projectZnOIRPolarization(data,45,0),rotated=projectZnOIRPolarization(data,90,36);
assert.deepEqual(z.polarization,[0,0,1]);
assert.deepEqual(x.polarization,[1,0,0]);
assert.equal(z.clusters.e1.total,0);
assert.equal(x.clusters.a1.total,0);
near(tilted.clusters.a1.total,checks.tiltedPolarization.a1);
near(tilted.clusters.e1.total,checks.tiltedPolarization.e1);
assert.deepEqual(rotated.polarization,x.polarization);
near(rotated.clusters.e1.total,checks.e1BasisRotation.sum);
rotated.clusters.e1.components.forEach((v,i)=>near(v,checks.e1BasisRotation.perModeAfter[i]));
for(const theta of [0,20,45,70,90])for(const phi of [0,36,90,180]){
 const state=projectZnOIRPolarization(data,theta,phi).clusters;
 near(state.e1.total,projectZnOIRPolarization(data,theta,0).clusters.e1.total);
 assert.equal(state['e2-low'].total,0);
 assert.equal(state['e2-high'].total,0);
}
assert.throws(()=>projectZnOIRPolarization(data,-1,0),RangeError);
assert.throws(()=>projectZnOIRPolarization(data,45,181),RangeError);

const requests=[],host=new Container(),state={};
let active=true,responseMode='tamper';
globalThis.document={activeElement:null,compatMode:'CSS1Compat'};
Element.prototype.focus=function(){document.activeElement=this;};
globalThis.fetch=(url,{signal})=>{
 const address=new URL(url);
 assert.ok(address.pathname.endsWith('/data/examples/zno-ir-polarization.json'));
 assert.equal(address.searchParams.get('v'),'20261120-zno-ir1');
 const request={signal};
 requests.push(request);
 if(responseMode==='pending')return new Promise(resolve=>{request.finish=()=>resolve(new Response(bytes));});
 if(responseMode==='unavailable')return Promise.resolve(new Response(null,{status:503}));
 const payload=Uint8Array.from(bytes);
 if(responseMode==='tamper')payload[payload.length-2]^=1;
 return Promise.resolve(new Response(payload));
};
const mount=(stored=state)=>bindZnOIRPolarization({root:host,isCurrent:()=>active,state:stored});
const $=id=>host.querySelector('#zir-'+id);
const value=id=>Number(host.querySelector(`[data-zir-value="${id}"]`).textContent);
const control=(id,v)=>{
 const el=$(id);
 el.value=String(v);
 (el.oninput||el.onchange)();
};
let cleanup=mount();
assert.match(host.innerHTML,english?/Predict first/:/先预测/);
assert.equal($('polarization'),null);
assert.equal(requests.length,0);
control('predict-a1','z');control('predict-e1','x');
assert.equal(requests.length,0);
assert.equal($('prediction').textContent,'');
await $('load').onclick();
assert.equal($('error').hidden,false);
assert.equal($('polarization'),null);
assert.equal($('predict-a1').value,'z');
assert.equal($('predict-e1').value,'x');
responseMode='unavailable';
await $('load').onclick();
assert.equal($('error').hidden,false);
assert.match($('error').textContent,english?/predictions are still in place/:/预测已保留/);

responseMode='pending';
const canceled=$('load').onclick(),read=requests.at(-1);
assert.equal($('cancel').hidden,false);
$('cancel').onclick();
assert.ok(read.signal.aborted);
read.finish();
await canceled;
assert.equal($('polarization'),null);
assert.equal($('load').disabled,false);

responseMode='verified';
await $('load').onclick();
assert.match($('status').textContent,/SHA-256/);
assert.equal($('load').hidden,true);
assert.equal(document.activeElement,$('polarization'));
assert.equal($('polarization').getAttribute('aria-describedby'),'zir-polarization-help');
assert.equal($('basis').getAttribute('aria-describedby'),'zir-basis-help');
assert.match($('lab').innerHTML,/e<sup>2<\/sup>\/u/);
assert.match($('prediction').textContent,/2 \/ 2/);
assert.equal(value('a1'),Number(checks.tiltedPolarization.a1.toPrecision(6)));
const initialA1=value('a1'),initialTotal=value('e1-total'),initialComponent=value('e1-1');
control('basis',36);
assert.equal($('polarization').value,'45');
assert.equal(value('a1'),initialA1);
assert.equal(value('e1-total'),initialTotal);
assert.notEqual(value('e1-1'),initialComponent);
control('polarization',90);
assert.equal($('basis').value,'36');
assert.equal(value('a1'),0);
assert.equal(value('e2-low'),0);
assert.equal(value('e2-high'),0);
assert.equal($('polarization').getAttribute('aria-valuetext'),'90°');
if(english){
 assert.doesNotMatch(host.innerHTML,/[\u3400-\u9fff]/u);
 assert.doesNotMatch($('lab').innerHTML,/[\u3400-\u9fff]/u);
}
const alreadyRead=requests.length;
cleanup();
cleanup=mount();
assert.equal(requests.length,alreadyRead);
assert.equal($('polarization').value,'90');
assert.equal($('basis').value,'36');
assert.equal($('predict-a1').value,'z');
cleanup();

cleanup=mount({});
responseMode='pending';
const leaving=$('load').onclick(),late=requests.at(-1);
active=false;cleanup();host.innerHTML='<p>Next view</p>';
assert.ok(late.signal.aborted);
late.finish();await leaving;
assert.equal(host.innerHTML,'<p>Next view</p>');

Object.defineProperty(Element.prototype,'open',{
 configurable:true,get(){return Object.hasOwn(this.attributes,'open');},
 set(value){if(value)this.attributes.open='';else delete this.attributes.open;}
});
const fetchFixture=globalThis.fetch;
globalThis.fetch=(url,options)=>String(url).startsWith('data/material-research.json?')
 ?Promise.resolve({ok:true,json:async()=>JSON.parse(readFileSync(new URL(prefix+'data/material-research.json',import.meta.url)))})
 :fetchFixture(url,options);
const {parseClassroomRoute}=await import(prefix+'classroom-ui.js');
const {renderMaterialResearchView}=await import(prefix+'material-research-ui.js');
const view=new Container(),calls=requests.length;
const stop=await renderMaterialResearchView({container:view,
 selection:parseClassroomRoute('compute/phonon-modes?preset=zno-ir'),
 run:()=>assert.fail('The optional ZnO URL may not run main tool Python')});
const disclosure=view.querySelector('[data-mr-zno-ir-entry]');
assert.equal(disclosure.open,true);
await import(prefix+'zno-ir-polarization-ui.js?v=20261120-zno-ir1');
await new Promise(setImmediate);
assert.ok(disclosure.querySelector('#zir-load'));
assert.equal(requests.length,calls,'The open deep link may not read the data before manual verification');
assert.equal(view.querySelector('#mr-preset').value,'silicon','Direct links do not change the main tool input');
responseMode='pending';
const inHost=disclosure.querySelector('#zir-load').onclick(),hostRequest=requests.at(-1);
stop();
assert.ok(hostRequest.signal.aborted);
hostRequest.finish();await inHost;
assert.equal(disclosure.querySelector('#zir-load'),null);

console.log(`ZnO Γ polarization (${english?'English':'Chinese'}): pinned data, accessible predictions, independent sliders, E₁ basis invariance, E₂ zero projections and classroom ownership passed.`);
