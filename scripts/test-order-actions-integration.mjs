import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Container,Element} from './test-material-research-ui.mjs';
import {orderActionsLabRequest} from '../dist/order-actions-bridge.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/principles-materials.json',import.meta.url),'utf8'));
const html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
Object.defineProperty(Element.prototype,'innerHTML',{...html,set(value){const science=this.id.endsWith('-output');html.set.call(this,science?String(value).replace(/<math\b[\s\S]*?<\/math>/g,'').replace(/<\/?span\b[^>]*>/g,''):value);if(science)this.html=String(value);}});
let fetches=0,runs=0,writes=0;const calls=[];
globalThis.fetch=async url=>{fetches++;assert.match(String(url),/principles-materials/);return{ok:true,json:async()=>structuredClone(data)};};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};globalThis.document={activeElement:null,createElement:t=>new Element(t)};Element.prototype.focus=function(){document.activeElement=this;};
const {renderPrinciplesView}=await import('../dist/principles-ui.js?order-actions-integration');
const settle=async v=>{const end=Date.now()+5000;while(Date.now()<end){if(Array.from(v.container.querySelectorAll('[data-learning-bridge]')).every(h=>h.getAttribute('aria-busy')==='false')){for(const h of v.container.querySelectorAll('[data-learning-bridge]'))assert.equal(h.querySelector('[data-learning-bridge-retry]'),null,'Optional bridge loads successfully');return;}await new Promise(r=>setImmediate(r));}throw Error('Optional bridge did not settle');};
const mount=async selection=>{const container=new Container();await renderPrinciplesView({container,selection,run:async(action,input)=>{runs++;calls.push({action,input:structuredClone(input)});throw Error('Recorded request: no worker needed for handoff test');}});const v={container,$:s=>container.querySelector(s)};await settle(v);return v;};
const tab=async(v,id)=>{v.$('[data-pw-tab="'+id+'"]').onclick();await settle(v);};
const choose=(v,id,value)=>{const node=v.$(id);assert.ok(node,id);node.value=value;node.onchange({target:node});};
const value=(v,key)=>v.$('#pw-'+key).value;
const lessons=['order-isotropy','order-invariants','order-field-convention'];
for(const lesson of lessons){
 const v=await mount({module:'order',lesson}),prefix='#oab-'+lesson+'-',host=v.$('[data-learning-bridge="orderActions"]');assert.ok(host,lesson);assert.ok(v.$('#pw-content').innerHTML.indexOf('data-learning-bridge')<v.$('#pw-content').innerHTML.indexOf('class="obs-formula"'));
 const detail=host.querySelector('details');assert.equal(detail.getAttribute('open'),null);detail.open=true;
 const first=host.querySelector('select'),alternate=Array.from(first.querySelectorAll('option')).find(o=>o.value!==first.value);choose(v,'#'+first.id,alternate.value);
 const expected=first.value,oldHandler=first.onchange;choose(v,prefix+'q0',lesson==='order-isotropy'?'six':lesson==='order-invariants'?'half':'plus');v.$(prefix+'observe').onclick();v.$(prefix+'next').onclick();v.$(prefix+'next').onclick();
 const native=v.$('[data-oab-native]');if(native)native.open=true;v.$(prefix+'note').value='An unsubmitted derivation.';v.$(prefix+'q1').value=lesson==='order-isotropy'?'full':lesson==='order-invariants'?'inverse':'joint';
 const staleCopy=v.$(prefix+'copy').onclick,oldSelect=v.$('#pw-lesson'),staleSelect=oldSelect.onchange;
 await tab(v,'lab');const original=v.$('#pw-etaX');original.value='';v.$('#pw-form').oninput({target:original});await tab(v,'derive');await tab(v,'learn');
 assert.equal(v.$('#'+first.id).value,expected);assert.equal(v.$(prefix+'note').value,'An unsubmitted derivation.');assert.notEqual(v.$('[data-learning-bridge="orderActions"]').querySelector('details').getAttribute('open'),null);if(native)assert.equal(v.$('[data-oab-native]').open,true);
 oldHandler({target:first});assert.equal(v.$('#'+first.id).value,expected);await staleCopy();assert.ok(v.$('[data-learning-bridge="orderActions"]'),'Retired copy cannot replace current lesson');
 oldSelect.value='order-invariants';staleSelect({target:oldSelect});assert.equal(v.$('#pw-lesson').value,lesson,'Retired lesson selector is inert');
 await tab(v,'lab');assert.equal(value(v,'etaX'),'','Ordinary navigation retains invalid original calculator draft');
}
// Exact supported complete copy overrides an old blank draft, but waits for Run.
for(const [lesson,state]of [['order-isotropy',{case:'zero'}],['order-invariants',{seed:'x4',eta:'diagonal',coefficient:'-2'}],['order-field-convention',{stage:'coordinates'}]]){
 const v=await mount({module:'order',lesson});await tab(v,'lab');v.$('#pw-fieldX').value='';v.$('#pw-form').oninput({target:v.$('#pw-fieldX')});await tab(v,'learn');
 for(const [key,val]of Object.entries(state))choose(v,'#oab-'+lesson+'-'+key,val);
 const before=runs;await v.$('#oab-'+lesson+'-copy').onclick();assert.equal(runs,before);assert.ok(v.$('#pw-form'));assert.equal(value(v,'preset'),'');const expected=orderActionsLabRequest(lesson,state).input;
 for(const f of data.modules.find(m=>m.id==='order').fields)assert.equal(value(v,f.key),String(expected[f.key]),f.key+' copied exactly');
 assert.equal(v.$('#pw-fieldY'),null);assert.equal(v.$('#pw-fieldZ'),null);assert.equal(v.$('#pw-basisAngle').getAttribute('step'),'any');
 v.$('#pw-form').onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));assert.equal(runs,before+1);assert.deepEqual(calls.at(-1),{action:'order_parameter_lab',input:expected});
}
for(const selection of [{module:'exchange'},{module:'conservation'},{module:'order',calculationOnly:true},{module:'order',atlasOnly:true}])assert.equal((await mount(selection)).$('[data-learning-bridge="orderActions"]'),null);
// Replacing the page disconnects both bridge and host controls.
const old=await mount({module:'order',lesson:'order-isotropy'}),stale=old.$('#oab-order-isotropy-copy').onclick;old.container.innerHTML='<p>Another page</p>';await stale();assert.equal(old.$('#pw-form'),null);
assert.equal(writes,0);assert.equal(fetches,1,'Catalog is reused; learning does not fetch calculations');
// Exercise the actual production handoff callback directly, including schema
// rejection and the lesson/tab ownership checks behind the bound copy button.
const host=await import('../dist/learning-bridge-host.js?v=20261114-evidence1'),callbacks=[];
globalThis.__orderActionsTestHost={learningBridgeHTML:host.learningBridgeHTML,bindLearningBridge:options=>{callbacks.push(options.onOpenLab);return host.bindLearningBridge(options);}};
let source=fs.readFileSync(new URL('../dist/principles-ui.js',import.meta.url),'utf8').replace(/^import \{learningBridgeHTML,bindLearningBridge\} from '[^']+';/,"const {learningBridgeHTML,bindLearningBridge}=globalThis.__orderActionsTestHost;");
source=source.replace(/from '(\.\/[^']+)'/g,(_all,relative)=>'from '+JSON.stringify(pathToFileURL(new URL('../dist/'+relative.slice(2),import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')).href));
const instrumented=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),container=new Container();
await instrumented.renderPrinciplesView({container,selection:{module:'order',lesson:'order-isotropy'},run:()=>{throw Error('Must wait for Run');}});const guard={container,$:s=>container.querySelector(s)};await settle(guard);const callback=callbacks.at(-1),payload=orderActionsLabRequest('order-isotropy');
for(const bad of [{...payload,module:'exchange'},{...payload,action:'other'},{...payload,input:{...payload.input,fieldY:.2}},{...payload,input:{...payload.input,etaX:NaN}},{...payload,input:{...payload.input,pointGroup:'unknown'}}])assert.equal(callback(bad),false);
choose(guard,'#pw-lesson','order-invariants');await settle(guard);assert.equal(callback(payload),false,'Retired lesson callback cannot copy');const currentCallback=callbacks.at(-1);await tab(guard,'lab');assert.equal(currentCallback(orderActionsLabRequest('order-invariants')),false,'Learning callback cannot replace a laboratory draft');await tab(guard,'learn');const defaultsCallback=callbacks.at(-1);assert.equal(defaultsCallback({action:'order_parameter_lab',module:'order',input:{etaX:.37123456789}}),true);assert.equal(value(guard,'etaX'),'0.37123456789');assert.equal(value(guard,'a2'),'-1');assert.equal(value(guard,'fieldX'),'0');assert.equal(value(guard,'basisAngle'),'30');assert.equal(value(guard,'preset'),'');
container.innerHTML='<p>Different module</p>';assert.equal(defaultsCallback(payload),false);delete globalThis.__orderActionsTestHost;assert.equal(writes,0);
console.log('Order actions integration: three exact hooks, draft/native/RAM preservation, retired control guards, complete schema-valid copies, stale-draft discard, 37° precision and fieldX-only inputs, manual Run and expert isolation passed.');
