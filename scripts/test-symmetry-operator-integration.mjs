import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';
import {symmetryOperatorLabRequest} from '../dist/symmetry-operator-bridge.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/principles-materials.json',import.meta.url),'utf8'));
const originalHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML'),all=Element.prototype.querySelectorAll;let parsing=0;
const nodeList=items=>Object.assign({length:items.length,item:i=>items[i]??null,forEach:f=>items.forEach(f),[Symbol.iterator]:function*(){yield*items;}},Object.fromEntries(items.map((x,i)=>[i,x])));
Object.defineProperty(Element.prototype,'innerHTML',{...originalHTML,set(value){parsing++;try{const science=this.id.endsWith('-output');originalHTML.set.call(this,science?String(value).replace(/<math\b[\s\S]*?<\/math>/g,'').replace(/<\/?span\b[^>]*>/g,''):value);if(science)this.html=String(value);}finally{parsing--;}}});
Element.prototype.querySelectorAll=function(selector){const result=all.call(this,selector);return parsing?result:nodeList(result);};
let fetches=0,runs=0,writes=0;const calls=[];globalThis.fetch=async url=>{fetches++;assert.match(String(url),/principles-materials/);return{ok:true,json:async()=>structuredClone(catalog)};};globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};globalThis.document={activeElement:null,createElement:t=>new Element(t)};Element.prototype.focus=function(){document.activeElement=this;};
const {renderPrinciplesView}=await import('../dist/principles-ui.js?symmetry-operator-integration');
const settle=async v=>{const end=Date.now()+5000;while(Date.now()<end){if(Array.from(v.container.querySelectorAll('[data-learning-bridge]')).every(h=>h.getAttribute('aria-busy')==='false')){for(const h of v.container.querySelectorAll('[data-learning-bridge]'))assert.equal(h.querySelector('[data-learning-bridge-retry]'),null,'Optional bridge loaded');return;}await new Promise(r=>setImmediate(r));}throw Error('Bridge failed to settle');};
const mount=async(selection,render=renderPrinciplesView)=>{const container=new Container();await render({container,selection,run:async(action,input)=>{runs++;calls.push({action,input:structuredClone(input)});throw Error('Recorded manual request');}});const v={container,$:s=>container.querySelector(s)};await settle(v);return v;};
const tab=async(v,id)=>{v.$('[data-pw-tab="'+id+'"]').onclick();await settle(v);};
const select=(v,id,value)=>{const node=v.$(id);assert.ok(node,id);node.value=value;node.onchange({target:node});};
const contexts=[['exchange','exchange-bond-constraints','normal','swap','isotropic'],['conservation','conservation-generators','cancel','sz','jx']];
for(const [module,lesson,answer,unsent,draftField]of contexts){
 const v=await mount({module,lesson}),prefix='#sob-'+lesson+'-',host=v.$('[data-learning-bridge="symmetryOperators"]');assert.ok(host);assert.equal(v.$('[data-learning-bridge="orderActions"]'),null);assert.ok(v.$('#pw-content').innerHTML.indexOf('data-learning-bridge')<v.$('#pw-content').innerHTML.indexOf('class="obs-formula"'));
 assert.equal(Array.isArray(host.querySelectorAll('select')),false);assert.equal(host.querySelectorAll('select').map,undefined);const detail=host.querySelector('details');assert.equal(detail.getAttribute('open'),null);detail.open=true;
 select(v,prefix+'case',module==='exchange'?'combined':'xxz-sx');select(v,prefix+'q0',answer);v.$(prefix+'observe').onclick();v.$(prefix+'next').onclick();v.$(prefix+'next').onclick();v.$('[data-sob-native]').open=true;v.$(prefix+'note').value='An unsent matrix calculation.';v.$(prefix+'q1').value=unsent;
 const oldCopy=v.$(prefix+'copy').onclick,oldCase=v.$(prefix+'case'),oldCaseHandler=oldCase.onchange;
 await tab(v,'lab');const field=v.$('#pw-'+draftField);field.value='';v.$('#pw-form').oninput({target:field});await tab(v,'derive');await tab(v,'learn');
 assert.notEqual(v.$('[data-learning-bridge="symmetryOperators"]').querySelector('details').getAttribute('open'),null);assert.equal(v.$('[data-sob-native]').open,true);assert.equal(v.$(prefix+'note').value,'An unsent matrix calculation.');assert.equal(v.$(prefix+'q1').value,unsent);assert.equal(v.$(prefix+'feedback1').textContent,'');
 oldCase.value=module==='exchange'?'mirror':'su2';oldCaseHandler({target:oldCase});assert.equal(v.$(prefix+'case').value,module==='exchange'?'combined':'xxz-sx');await oldCopy();assert.ok(v.$('[data-learning-bridge="symmetryOperators"]'));
 await tab(v,'lab');assert.equal(v.$('#pw-'+draftField).value,'','Ordinary tabs preserve unfinished calculator draft');
}
for(const [module,lesson,kinds]of [['exchange','exchange-bond-constraints',['mirror','inversion','combined','perpendicular']],['conservation','conservation-generators',['su2','xxz-sx','xxz-sz','xyz']]])for(const kind of kinds){
 const v=await mount({module,lesson});await tab(v,'lab');const field=v.$('#pw-'+(module==='exchange'?'isotropic':'jx'));field.value='';v.$('#pw-form').oninput({target:field});await tab(v,'learn');select(v,'#sob-'+lesson+'-case',kind);
 const before=runs;await v.$('#sob-'+lesson+'-copy').onclick();assert.equal(runs,before);assert.ok(v.$('#pw-form'));assert.equal(v.$('#pw-preset').value,'');const expected=symmetryOperatorLabRequest(lesson,{case:kind});
 for(const f of catalog.modules.find(x=>x.id===module).fields)assert.equal(v.$('#pw-'+f.key).value,String(expected.input[f.key]),kind+':'+f.key);
 assert.equal(v.$('#pw-fieldY'),null);v.$('#pw-form').onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));assert.equal(runs,before+1);assert.deepEqual(calls.at(-1),{action:expected.action,input:expected.input});
}
for(const selection of [{module:'exchange',lesson:'exchange-conventions'},{module:'conservation',lesson:'conservation-open'},{module:'exchange',calculationOnly:true},{module:'conservation',atlasOnly:true}])assert.equal((await mount(selection)).$('[data-learning-bridge="symmetryOperators"]'),null);
const order=await mount({module:'order',lesson:'order-invariants'});assert.ok(order.$('[data-learning-bridge="orderActions"]'));assert.equal(order.$('[data-learning-bridge="symmetryOperators"]'),null);order.$('#oab-order-invariants-note').value='Existing order card draft';await tab(order,'lab');await tab(order,'learn');assert.equal(order.$('#oab-order-invariants-note').value,'Existing order card draft');
assert.equal(fetches,1);assert.equal(writes,0);

// Preserve actual host/binder behavior while observing the production callback.
const uiSource=fs.readFileSync(new URL('../dist/principles-ui.js',import.meta.url),'utf8'),hostSpecifier=uiSource.match(/import \{learningBridgeHTML,bindLearningBridge\} from '([^']+)'/)[1],host=await import(new URL('../dist/'+hostSpecifier.slice(2),import.meta.url).href),callbacks=[];
globalThis.__symmetryOperatorTestHost={learningBridgeHTML:host.learningBridgeHTML,bindLearningBridge:options=>{if(options.family==='symmetryOperators')callbacks.push(options.onOpenLab);return host.bindLearningBridge(options);}};
let instrumented=uiSource.replace(/^import \{learningBridgeHTML,bindLearningBridge\} from '[^']+';/,'const {learningBridgeHTML,bindLearningBridge}=globalThis.__symmetryOperatorTestHost;');instrumented=instrumented.replace(/\bfrom\s+(['"])(\.\/[^'"]+)\1/g,(_all,_quote,relative)=>'from '+JSON.stringify(new URL('../dist/'+relative.slice(2),import.meta.url).href));const observed=await import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64'));
for(const [module,lesson]of contexts){
 const v=await mount({module,lesson},observed.renderPrinciplesView),callback=callbacks.at(-1),payload=symmetryOperatorLabRequest(lesson);
 for(const bad of [{...payload,module:'order'},{...payload,action:'other'},{...payload,input:{...payload.input,inventedField:1}},{...payload,input:{...payload.input,[module==='exchange'?'dx':'jx']:NaN}}])assert.equal(callback(bad),false);
 if(module==='conservation'){assert.equal(callback({...payload,input:{...payload.input,points:2.5}}),false);assert.equal(callback({...payload,input:{...payload.input,experiment:'single',initialState:'singlet'}}),false);}
 await tab(v,'lab');assert.equal(callback(payload),false);await tab(v,'learn');assert.equal(callback(payload),false,'Old DOM-owner cannot copy after returning to the same lesson/tab');const fresh=callbacks.at(-1);
 select(v,'#pw-lesson',module==='exchange'?'exchange-conventions':'conservation-open');await settle(v);assert.equal(fresh(payload),false,'Old lesson cannot copy');select(v,'#pw-lesson',lesson);await settle(v);const current=callbacks.at(-1);
 assert.equal(current({module,action:payload.action,input:{[module==='exchange'?'isotropic':'jx']:.37123456789}}),true);assert.equal(v.$('#pw-'+(module==='exchange'?'isotropic':'jx')).value,'0.37123456789');assert.equal(v.$('#pw-preset').value,'');if(module==='conservation'){assert.equal(v.$('#pw-gamma1').value,'0');assert.equal(v.$('#pw-gammaPhi').value,'0');}v.container.innerHTML='<p>Another module</p>';assert.equal(current(payload),false);
}
delete globalThis.__symmetryOperatorTestHost;assert.equal(writes,0);
console.log('Symmetry operator integration: both real lesson hooks, eight exact complete copies and manual Run, non-Array NodeList, native/RAM/draft retention, invalid-schema and lesson/tab/DOM-owner guards, default merges and existing orderActions coexistence passed.');
