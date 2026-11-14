import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';
import {OSCILLATOR_HALF_RATIO_TEMPERATURE} from '../dist/oscillator-spectra-bridge.js';
const catalogs=Object.fromEntries(['pathways-materials','bridges-materials'].map(name=>[name,JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'))]));
let requests=0,runs=0,writes=0;
globalThis.fetch=async url=>{requests++;const name=String(url).match(/data\/([^/?]+)\.json/)?.[1];assert.ok(catalogs[name],url);return{ok:true,json:async()=>structuredClone(catalogs[name])};};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
globalThis.document={compatMode:'CSS1Compat',activeElement:null,createElement:tag=>new Element(tag)};
Element.prototype.focus=function(){document.activeElement=this;};
const {renderPathwaysView}=await import('../dist/pathways-ui.js?oscillator-integration');
const {renderBridgesView}=await import('../dist/bridges-ui.js?oscillator-integration');
const settle=async view=>{const end=Date.now()+5000;while(Date.now()<end){if(view.container.querySelectorAll('[data-learning-bridge]').every(x=>x.getAttribute('aria-busy')==='false'))return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Bridge did not settle');};
const mount=async(render,selection)=>{const container=new Container();await render({container,selection,run:()=>{runs++;throw Error('Learning must wait for manual calculation');}});const view={container,$:s=>container.querySelector(s)};await settle(view);return view;};
const tab=async(view,id)=>{view.$('[data-pw-tab="'+id+'"]').onclick();await settle(view);};
const contexts=[[renderPathwaysView,'scattering','scattering-temperature'],[renderBridgesView,'polaron','polaron-hamiltonian'],[renderBridgesView,'polaron','polaron-truncation']];
for(const[render,module,lesson]of contexts){
 const view=await mount(render,{module,lesson}),host=view.$('[data-learning-bridge="oscillator"]');assert.ok(host,lesson);
 const original=view.$('#pw-content').innerHTML;assert.ok(original.indexOf('data-learning-bridge')<original.indexOf('class="obs-formula"'));
 const first=host.querySelector('select'),alternate=first.querySelectorAll('option').find(x=>x.value!==first.value);first.value=alternate.value;first.onchange({target:first});
 const prefix='#osb-'+lesson+'-',detail=host.querySelector('details'),native=host.querySelector('[data-osb-native]');detail.open=true;if(native)native.open=true;
 const note=view.$(prefix+'note');note.value='An unfinished explanation.';note.oninput({target:note});
 const expected=view.$(prefix+'m').value,stale=first.onchange,beforeRequests=requests;
 await tab(view,'lab');const number=view.container.querySelectorAll('input').find(x=>x.type==='number');assert.ok(number);number.value='';view.$('#pw-form').oninput({target:number});
 await tab(view,'learn');assert.equal(view.$(prefix+'m').value,expected);assert.equal(view.$(prefix+'note').value,note.value);assert.notEqual(view.$('[data-learning-bridge="oscillator"]').querySelector('details').getAttribute('open'),null);
 if(native)assert.notEqual(view.$('[data-osb-native]').getAttribute('open'),null,'Queued native disclosure state retained');
 stale?.({target:first});assert.equal(view.$(prefix+'m').value,expected,'Retired event does not alter restored card');
 await tab(view,'lab');assert.equal(view.$('#'+number.id).value,'','Unfinished original calculator draft retained');assert.equal(requests,beforeRequests);
}
const copy=await mount(renderPathwaysView,{module:'scattering',lesson:'scattering-temperature'});
await tab(copy,'lab');const old=copy.$('#pw-temperature');old.value='';copy.$('#pw-form').oninput({target:old});await tab(copy,'learn');
copy.$('#osb-scattering-temperature-thalf').onclick();await copy.$('#osb-scattering-temperature-copy').onclick();
assert.equal(Number(copy.$('#pw-temperature').value),OSCILLATOR_HALF_RATIO_TEMPERATURE);assert.equal(copy.$('#pw-temperature').getAttribute('step'),'any');
assert.equal(Number(copy.$('#pw-selectedQ').value),1.8);assert.equal(Number(copy.$('#pw-energyPoints').value),401);assert.equal(copy.$('#pw-channel').value,'both');assert.equal(copy.$('#pw-preset').value,'');
for(const[render,module,lesson]of contexts){const view=await mount(render,{module,lesson,calculationOnly:true});assert.equal(view.$('[data-learning-bridge]'),null,'Expert entry avoids teaching panels');}
for(const[render,module]of [[renderPathwaysView,'bandrep'],[renderBridgesView,'workshop']]){const view=await mount(render,{module});assert.equal(view.$('[data-learning-bridge="oscillator"]'),null);}
assert.equal(runs,0);assert.equal(writes,0);
console.log('Oscillator integration: three exact learning hooks, native/RAM/draft retention, stale events, exact-temperature complete-model copy, expert isolation and zero automatic calculation/mastery writes passed.');
