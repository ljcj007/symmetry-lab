import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container,flush} from './test-material-research-ui.mjs';
import {jsStrings,replaceUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';
import {HUBBARD_BRIDGE_HOOKS,HUBBARD_SOURCE_BASIS,hubbardFermionAction,hubbardActionMatrix,hubbardSpectralReference,hubbardBridgeLabRequest,hubbardBridgeHTML,bindHubbardLearningBridge} from '../dist/hubbard-learning-bridge.js';

const near=(a,b,tol=2e-12)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const kron=(a,b)=>a.flatMap(row=>b.map(brow=>row.flatMap(value=>brow.map(x=>value*x===0?0:value*x))));
const identity=[[1,0],[0,1]],z=[[1,0],[0,-1]],lower=[[0,1],[0,0]];
const transpose=a=>a[0].map((_,i)=>a.map(row=>row[i]));
const jw=mode=>{let matrix=[[1]];for(let i=3;i>=0;i--)matrix=kron(matrix,i===mode?lower:i<mode?z:identity);return matrix;};
const operators=Array.from({length:4},(_,mode)=>jw(mode));

// Independent tensor-product construction checks all finite occupation actions.
for(let state=0;state<16;state++)for(let mode=0;mode<4;mode++)for(const create of [false,true]){
 const actual=hubbardFermionAction({state,mode,create}),matrix=create?transpose(operators[mode]):operators[mode];
 const expected=matrix.map(row=>row[state]),observed=Array(16).fill(0);
 if(actual.target!==null)observed[actual.target]=actual.sign;
 assert.deepEqual(observed,expected,`${state}/${mode}/${create}`);
}
assert.deepEqual([...HUBBARD_SOURCE_BASIS],[5,9,6,10]);
for(let mode=0;mode<4;mode++)for(const create of [false,true]){
 const result=hubbardActionMatrix({mode,create}),full=create?transpose(operators[mode]):operators[mode];
 assert.deepEqual(result.matrix,result.targetBasis.map(row=>result.sourceBasis.map(col=>full[row][col])));
 assert.equal(result.matrix.length,2);assert.ok(result.matrix.every(row=>row.length===4));
}
assert.deepEqual(hubbardActionMatrix({mode:1,create:true}).matrix,[[-1,0,0,0],[0,-1,0,0]]);
assert.deepEqual(hubbardActionMatrix({mode:2,create:false}).targetBasis,[1,2]);
for(const state of [-1,16,1.5,'5',NaN])assert.throws(()=>hubbardFermionAction({state,mode:0}),/integer/);
assert.throws(()=>hubbardFermionAction({state:5,mode:0,create:'yes'}),/true or false/);
assert.throws(()=>hubbardActionMatrix({mode:4}),/integer/);

for(const phi of [-Math.PI,-Math.PI/2,-.37,0,Math.PI/4,Math.PI/2,.91,Math.PI]){
 const r=hubbardSpectralReference({probe:'phase',phi});
 near(r.removal.totalWeight,Math.cos(phi/2)**2);near(r.addition.totalWeight,Math.sin(phi/2)**2);near(r.totalWeight,1);
 near(r.removal.bonding.amplitude[0],(1+Math.cos(phi))/2);near(r.removal.bonding.amplitude[1],-Math.sin(phi)/2);
 near(r.addition.bonding.amplitude[0],(1-Math.cos(phi))/2);near(r.addition.bonding.amplitude[1],-Math.sin(phi)/2);
 for(const process of [r.removal,r.addition]){near(process.antibonding.weight,0);near(process.contributions.reduce((sum,z)=>sum+z[0],0),process.bonding.amplitude[0]);}
 near(r.addition.coefficients[1][1],-r.coefficients[1][1]);
 const input=hubbardBridgeLabRequest({probe:'phase',phi}).input;near(input.q,phi/Math.PI);assert.equal(input.spin,'up');assert.equal(input.interactionU,0);
}
const local=hubbardSpectralReference();near(local.removal.totalWeight,.5);near(local.addition.totalWeight,.5);
assert.deepEqual(local.removal.acted,[[.5,0],[.5,0]]);assert.equal(local.removal.antibonding.coordinate,-3);assert.equal(local.addition.antibonding.coordinate,3);
for(const phi of [NaN,Infinity,Math.PI+.1,'0'])assert.throws(()=>hubbardSpectralReference({probe:'phase',phi}),/Unsupported/);
assert.throws(()=>hubbardSpectralReference({probe:'unsupported'}),/Unsupported/);
const edit=hubbardActionMatrix({mode:0});edit.matrix[0][0]=9;assert.equal(hubbardActionMatrix({mode:0}).matrix[0][0],1);

for(const[catalog,id]of [['pathways-materials','hubbard-basis'],['bridges-materials','manybody-lehmann']]){
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/'+catalog+'.json',import.meta.url),'utf8'));
 assert.ok(data.lessons.some(l=>l.id===id));assert.ok(HUBBARD_BRIDGE_HOOKS[id]);
}
assert.equal(hubbardBridgeHTML('future-lesson'),'');assert.equal(hubbardBridgeHTML('__proto__'),'');
let network=0,workers=0,storage=0,focused=null;
globalThis.fetch=()=>{network++;throw Error('The bridge must not fetch');};globalThis.Worker=class{constructor(){workers++;throw Error('The bridge must not start Python');}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{storage++;}};Element.prototype.focus=function(){focused=this;};
function mount(lessonId='manybody-lehmann',store=new Map(),onOpenLab){
 const root=new Container();root.innerHTML=hubbardBridgeHTML(lessonId);let alive=true;
 const cleanup=bindHubbardLearningBridge({root,lessonId,stateStore:store,isCurrent:()=>alive,onOpenLab});
 const $=name=>root.querySelector('#hub-'+lessonId+'-'+name);
 return{root,$,cleanup,store,leave(){alive=false;},choose(name,value){const e=$(name);assert.ok(e,name);e.value=value;e.onchange();},click(name){const e=$(name);assert.ok(e,name);assert.equal(e.disabled,false,name);return e.onclick();}};
}
const copied=[],view=mount('manybody-lehmann',new Map(),async request=>copied.push(request));
assert.equal(copied.length,0,'Binding must not calculate or copy inputs');
assert.equal(view.root.querySelector('details').getAttribute('open'),null);
assert.equal(view.$('check0').disabled,true);assert.equal(view.$('step').disabled,true);
view.choose('q0','positive');view.click('step');view.click('step');view.click('step');view.click('check0');
assert.match(view.$('feedback0').textContent,/奇数/);assert.doesNotMatch(view.$('feedback0').attributes.class,/hub-correct/);
view.choose('q0','negative');view.click('check0');assert.match(view.$('feedback0').attributes.class,/hub-correct/);
view.choose('q1','other');view.click('check1');assert.match(view.$('feedback1').textContent,/另一种自旋/);
view.choose('q1','target');view.click('check1');assert.match(view.$('feedback1').attributes.class,/hub-correct/);
view.choose('q2','half');view.click('check2');assert.match(view.$('feedback2').textContent,/随机局域/);
view.choose('q2','phase');view.click('check2');assert.match(view.$('feedback2').attributes.class,/hub-correct/);
assert.ok(view.root.querySelectorAll('[class]').some(e=>e.attributes.class==='hub-selected-reading'));

const outer=view.root.querySelector('[data-hub-bridge]');outer.open=true;outer.ontoggle();
let matrix=view.root.querySelector('[data-hub-native="matrix"]');matrix.open=true;matrix.ontoggle();
let spectrum=view.root.querySelector('[data-hub-native="spectrum"]');spectrum.open=true;spectrum.ontoggle();
view.click('phasepi');assert.equal(view.$('probe').value,'phase');near(Number(view.$('phi').value),Math.PI);
view.$('comparison').checked=true;view.$('comparison').onchange();assert.ok(view.root.querySelector('.hub-comparison'));
const slider=view.$('phi'),sliderHandler=slider.oninput;slider.value='.37';slider.oninput();assert.equal(view.$('phi'),slider,'Slider input does not replace the slider during a pointer drag');near(view.cleanup.snapshot()['fock-to-lehmann'].phi,.37);
const note=view.$('note');note.value='尚未提交的解释 <not an element>';note.oninput();assert.equal(view.$('note'),note,'Typing does not rebuild the input');
await view.click('copy');assert.equal(copied.length,1);assert.equal(copied[0].action,'manybody_spectra_lab');near(copied[0].input.q,.37/Math.PI);assert.match(view.$('copy-status').textContent,/手动运行/);
copied[0].input.hopping=99;assert.equal(hubbardBridgeLabRequest().input.hopping,1);
const copiedSnapshot=view.cleanup.snapshot()['fock-to-lehmann'];
const copyReturn=mount('manybody-lehmann',new Map([['manybody-lehmann:fock-to-lehmann',copiedSnapshot]]),()=>{});
assert.match(copyReturn.$('copy-status').textContent,/已复制/,'Copy feedback is retained with the local bridge state');copyReturn.cleanup();

const oldButton=view.$('step'),oldHandler=oldButton.onclick;
view.choose('mode','0');const actionBefore=view.$('action').innerHTML;oldHandler();assert.equal(view.$('action').innerHTML,actionBefore,'Obsolete handlers cannot mutate a replacement question');
assert.equal(view.$('q0').value,'');assert.equal(view.$('check1').disabled,true);
const oldMatrix=matrix;oldMatrix.open=false;oldMatrix.ontoggle();assert.equal(view.cleanup.snapshot()['fock-to-lehmann'].matrixOpen,true,'An obsolete disclosure event cannot overwrite the current native state');
view.$('all').checked=true;view.$('all').onchange();assert.equal(view.$('basis').querySelectorAll('option').length,16);
view.choose('basis','0');view.choose('q0','zero');view.click('step');view.click('step');view.click('step');view.click('check0');assert.match(view.$('feedback0').attributes.class,/hub-correct/);assert.match(view.$('feedback0').textContent,/为空/);

// Capture real native disclosure state even before its queued toggle event.
const latestOuter=view.root.querySelector('[data-hub-bridge]');latestOuter.open=false;
const snapshot=view.cleanup.snapshot();assert.equal(snapshot['fock-to-lehmann'].open,false);
snapshot['fock-to-lehmann'].phi=99;assert.notEqual(view.cleanup.snapshot()['fock-to-lehmann'].phi,99);
view.cleanup();sliderHandler();
const back=mount('manybody-lehmann',view.store,async()=>{});
assert.equal(back.$('note').value,'尚未提交的解释 <not an element>');assert.equal(back.$('basis').value,'0');assert.match(back.$('feedback0').attributes.class,/hub-correct/);
assert.equal(back.$('q2').value,'phase');assert.match(back.$('feedback2').attributes.class,/hub-correct/);near(Number(back.$('phi').value),.37);
assert.notEqual(back.root.querySelector('[data-hub-native="matrix"]').getAttribute('open'),null);
assert.equal(back.root.querySelector('[data-hub-bridge]').getAttribute('open'),null);
const other=mount('hubbard-basis',view.store,()=>{throw Error('Not an in-catalog copy destination');});
assert.equal(other.$('copy'),null,'The Hubbard-basis hook must not imply cross-catalogue input transfer');
assert.ok(other.root.querySelectorAll('a').some(a=>a.attributes.href==='#classroom/observables?module=manybody&lesson=manybody-lehmann&tab=learn'));
assert.equal(other.$('q2').value,'','Different lessons retain independent bridge state');

const pendingChoice=back.$('q1');pendingChoice.value='same';pendingChoice.onchange();back.cleanup();
const resumed=mount('manybody-lehmann',back.store);assert.equal(resumed.$('q1').value,'same');assert.equal(resumed.$('feedback1').textContent,'','An unsubmitted answer remains unsubmitted');
const stale=resumed.$('reset').onclick;resumed.leave();const previous=resumed.cleanup.snapshot();stale();assert.deepEqual(resumed.cleanup.snapshot(),previous);
let resolveCopy;const waiting=mount('manybody-lehmann',new Map(),()=>new Promise(resolve=>{resolveCopy=resolve;}));
const opening=waiting.click('copy');assert.equal(waiting.$('copy').disabled,true);waiting.cleanup();waiting.root.innerHTML='<p>Another lesson</p>';resolveCopy();await opening;assert.equal(waiting.root.querySelector('#hub-manybody-lehmann-copy-status'),null);
const polluted=mount('manybody-lehmann',new Map([['manybody-lehmann:fock-to-lehmann',{basis:'<img src=x>',mode:'__proto__',phi:Infinity,choices:['<script>'],note:'<img src=x onerror=alert(1)>',copyOutcome:'error',copyError:'<img src=x onerror=alert(1)>'}]]));
assert.equal(polluted.$('basis').value,'5');assert.equal(polluted.$('mode').value,'2');assert.equal(polluted.root.querySelector('img'),null);
polluted.click('reset');assert.equal(polluted.$('note').value,'');assert.equal(focused,polluted.$('basis'));
for(const page of [other,resumed,polluted])page.cleanup();

const tiny=mount();tiny.choose('probe','phase');tiny.$('phi').value='1e-8';tiny.$('phi').oninput();
assert.ok(tiny.root.querySelectorAll('td').some(cell=>cell.textContent.includes('2.5000e-17')),'Small nonzero spectral weights retain scientific notation instead of becoming false exact zeros');tiny.cleanup();
assert.equal(hubbardSpectralReference({probe:'phase',phi:Math.PI}).removal.totalWeight,0,'Named exact pi phases do not present floating sin(pi) residue as a physical nonzero weight');
const nativeEnd=3.14159265358979,endReference=hubbardSpectralReference({probe:'phase',phi:nativeEnd});
assert.ok(endReference.removal.totalWeight>0,'A real range-control near-endpoint value is not silently snapped to exact pi');
near(endReference.removal.bonding.amplitude[1],-Math.sin(nativeEnd)/2,1e-29);
near(endReference.removal.totalWeight,Math.sin(nativeEnd)**2/4,1e-43);
const endpoint=mount();endpoint.choose('probe','phase');endpoint.$('phi').value=String(nativeEnd);endpoint.$('phi').oninput();
assert.ok(endpoint.root.querySelector('.hub-phase-closedform'),'The phase-dependent closed-form weights are connected to the displayed calculation');
assert.match(endpoint.root.querySelector('.hub-endpoint-note').textContent,/浮点三角函数/);
assert.match(endpoint.root.querySelector('.hub-endpoint-note').textContent,/保留原始数值/);
assert.ok(endpoint.root.querySelectorAll('td').some(cell=>cell.textContent.includes('2.6100e-30')),'The observed endpoint residual remains visible in the weight table');
near(endpoint.cleanup.snapshot()['fock-to-lehmann'].phi,nativeEnd,1e-16);endpoint.cleanup();

// Use the actual English unit extraction/replacement rules in memory. No
// generated English files are written and no scientific keys are translated.
const sourceURL=new URL('../dist/hubbard-learning-bridge.js',import.meta.url),source=fs.readFileSync(sourceURL,'utf8');
const own=JSON.parse(fs.readFileSync(new URL('../locales/en-hubbard-learning-bridge.json',import.meta.url),'utf8'));
const translations={...loadEnglishCatalog(),...own},missing=[];
const translate=text=>{if(!HAN.test(text))return text;const key=Object.hasOwn(translations,text)?text:text.trim();if(!Object.hasOwn(translations,key)){missing.push(key);return text;}return translations[key];};
const escapeTemplate=text=>text.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
const edits=jsStrings(source).flatMap(item=>{const translated=replaceUnits(item.value,translate);return translated===item.value?[]:[{...item,replacement:item.type==='literal'?JSON.stringify(translated):escapeTemplate(translated)}];});
assert.deepEqual(missing,[],'Every bridge prose unit has a reviewed English translation');
let englishSource=source;for(const edit of edits.sort((a,b)=>b.start-a.start))englishSource=englishSource.slice(0,edit.start)+edit.replacement+englishSource.slice(edit.end);
englishSource=englishSource.replace(/from '(\.\/math-display\.js\?[^']+)'/,(_m,path)=>'from '+JSON.stringify(new URL(path,sourceURL).href));
const english=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(englishSource));
assert.deepEqual(english.hubbardBridgeLabRequest({probe:'phase',phi:.37}),hubbardBridgeLabRequest({probe:'phase',phi:.37}));
const enRoot=new Container();enRoot.innerHTML=english.hubbardBridgeHTML('manybody-lehmann');const enCleanup=english.bindHubbardLearningBridge({root:enRoot,lessonId:'manybody-lehmann'});
assert.ok(!HAN.test(enRoot.querySelector('[data-hub-body]').textContent),'Rendered English bridge contains no untranslated Chinese prose');
enCleanup();
assert.equal(network,0);assert.equal(workers,0);assert.equal(storage,0);
const css=fs.readFileSync(new URL('../dist/hubbard-learning-bridge.css',import.meta.url),'utf8');
assert.match(css,/font-size:18px/);assert.match(css,/\.hub-formula\{[^}]*overflow-x:auto/);assert.match(css,/font-size:22px/);assert.match(css,/font-size:21px/);assert.match(css,/@container\(max-width:560px\)/);assert.match(css,/summary:focus-visible/);
console.log('Hubbard bridge: 128 independent JW actions, eight rectangular maps, complex-phase analytic spectra, dark candidates, exact hook contexts, actual prediction/step/slider/note/copy handlers, state retention, native disclosures, malformed states, stale async callbacks, and zero network/worker/mastery writes passed.');
