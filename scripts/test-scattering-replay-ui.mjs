import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {Container,Element} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,replaceUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog,catalogFiles,localeRoot} from './english-catalog.mjs';
import {scatteringReplayModel as model,scatteringReplayHTML as render,scatteringReplayDrawingHTML as drawing,bindScatteringReplay as bind} from '../dist/scattering-replay-ui.js';

const serialized=x=>JSON.parse(JSON.stringify(x));
const json=url=>JSON.parse(fs.readFileSync(new URL(url,import.meta.url),'utf8')),clone=structuredClone;
const f=json('./fixtures/scattering-replay.json');assert.equal(f.schema,'symmetry-lab-scattering-replay-fixture-1');assert.match(f.method,/actual browser_api\.run/);assert.equal(f.cases.length,7);
for(const [file,sha]of Object.entries(f.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n?/g,'\n')).digest('hex'),sha,file);
const cases=Object.fromEntries(f.cases.map(c=>[c.id,c.result])),defaultReply=cases.default,defaultReplay=defaultReply.data.amplitudeReplay;
const format=x=>x===null?'—':x===0?'0':String(Number(x.toPrecision(7)));
let gradeWrites=0,fetchCalls=0;globalThis.document={createElement:tag=>new Element(tag)};globalThis.fetch=async()=>{fetchCalls++;throw Error('An amplitude view must not fetch or run a solver.');};globalThis.localStorage={getItem:()=>null,setItem:()=>gradeWrites++};

for(const c of f.cases){
 const r=c.result.data.amplitudeReplay,pristine=clone(c.result);assert.equal(model(c.result).status,'available');assert.equal(model(r).status,'available');
 for(let stage=1;stage<=5;stage++)assert.doesNotMatch(render(c.result,{state:{stage}}),/katex-error|\bNaN\b|\bInfinity\b|\bundefined\b/);
 assert.doesNotMatch(render(r,{state:{stage:1}}),/从质量归一化本征矢到位移|先加复振幅/);
 for(const branch of [0,1])for(const variant of ['original','gauge','relative',...(r.degenerateMixing?['mixed']:[])]){
  const value=variant==='original'?r.branches[branch]:variant==='gauge'?r.branches[branch].gauge:variant==='relative'?r.branches[branch].relativePhase:r.degenerateMixing.changedBranches[branch];
  const html=render(c.result,{state:{stage:5,branch,variant}});assert.match(html,new RegExp(format(value.strength).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'Returned selected strength is visible');
  for(const width of [240,375,560]){const svg=drawing(r,{branch,variant,width});assert.match(svg,new RegExp('viewBox="0 0 '+width+' 285"'));assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.match(svg,/Re<\/text>/);assert.match(svg,/Im<\/text>/);assert.match(svg,/A → B → Σ/);}
 }
 assert.deepEqual(c.result,pristine,'Rendering preserves every original spectrum, replay, convention and input value');
}
const nearReply=f.regressionCases.find(c=>c.id==='near-degenerate-no-mixing').result,near=nearReply.data.amplitudeReplay;assert.equal(model(near).status,'available');assert.equal(near.groups.length,1);assert.equal(near.groups[0].degeneracy,2);assert.equal(near.degenerateMixing,null);assert.ok(near.groups[0].energySpread>near.mixingEnergyTolerance);assert.match(render(near,{state:{stage:5}}),/分组本身不授权/);assert.doesNotMatch(render(near,{state:{stage:5}}),/查看返回的简并酉变换矩阵|当前两支能量差在严格数值同能门槛内/);
const gamma=cases['unequal-gamma'].data.amplitudeReplay,zero=cases['zero-projection'].data.amplitudeReplay,degenerate=cases['degenerate-edge'].data.amplitudeReplay;
assert.equal(gamma.groups[0].excluded,true);assert.equal(gamma.groups[0].energyDenominator,null);assert.match(render(gamma,{state:{stage:4,group:0}}),/不计算 1\/E 或 Bose n/);
assert.equal(zero.branches[0].normalizedStrength,null);assert.match(render(zero,{state:{stage:3}}),/Q∥ = 0，不作除法/);
for(const branch of [0,1]){assert.equal(degenerate.branches[branch].relativePhase.commonPhaseEquivalent,true);assert.match(render(degenerate,{state:{stage:5,branch,variant:'relative'}}),/按重叠模平方的 10⁻¹² 容差/);}
assert.match(render(degenerate,{state:{stage:5,variant:'relative'}}),/射线在 10⁻¹² 容差内无法区分/);assert.match(render(degenerate,{state:{stage:5,variant:'relative'}}),/近纯分量也可能落在容差内/);
assert.ok(degenerate.degenerateMixing);assert.match(render(degenerate,{state:{stage:5}}),/单支基与强度不唯一/);assert.match(render(degenerate,{state:{stage:5}}),/查看返回的简并酉变换矩阵/);
assert.match(render(defaultReply,{state:{stage:5}}),/未满足简并酉混合的严格数值同能门槛/);assert.match(render(defaultReply,{state:{stage:3,variant:'relative'}}),/不是新的计算能谱/);
assert.match(render({}),/旧结果没有振幅推导账本/);assert.equal(model({}).status,'absent');assert.equal(drawing({}),'');
for(const mutate of [r=>r.schema='unsupported',r=>r.momentum.QParallel=NaN,r=>r.atoms.pop(),r=>r.atoms[0].structurePhase=[0],r=>r.branches[0].terms.pop(),r=>r.branches[1].gauge.partialSums.pop(),r=>r.branches[0].relativePhase.strength=Infinity,r=>r.groups[0].branchStrengths=[],r=>r.groups[0].branches=[99],r=>r.degenerateMixing={},r=>r.checks.passed=false,r=>r.sources[0].url='javascript:alert(1)']){
 const bad=clone(defaultReplay);mutate(bad);assert.equal(model(bad).status,'invalid');assert.match(render(bad),/role="alert"/);
}

function mount({replay=defaultReply,store=new Map(),key='result',prefix='sar',binder=bind,active=()=>true}={}){
 const page=new Container();page.innerHTML='<div data-sar-body></div>';const body=page.querySelector('[data-sar-body]'),exports=[];
 const cleanup=binder({root:body,replay,prefix,stateStore:store,stateKey:key,isCurrent:active,download:(body,name,type)=>exports.push({body:JSON.parse(body),name,type})});
 return {page,body,store,key,exports,cleanup,$:id=>body.querySelector('#'+prefix+'-'+id)};
}
const click=(v,id)=>{const n=v.$(id);assert.ok(n,id);return n.onclick?.();},choose=(v,id,value)=>{const n=v.$(id);assert.ok(n,id);n.value=String(value);return n.onchange?.();};
const a=mount();assert.equal(a.$('stage-status').textContent,'振幅推导 1 / 5');for(let i=0;i<4;i++)click(a,'next');assert.equal(a.$('stage-status').textContent,'振幅推导 5 / 5');assert.equal(a.$('next').disabled,true);
choose(a,'branch',1);choose(a,'group',0);choose(a,'variant','gauge');a.$('note').value='Conjugation changes the common phase of A, not its strength.';a.$('note').oninput();
for(const id of ['mass','coherent','basis']){choose(a,'predict-'+id,'wrong');click(a,'check-'+id);const wrong=a.$('feedback-'+id).textContent;assert.ok(wrong);choose(a,'predict-'+id,'right');assert.equal(a.$('feedback-'+id).textContent,'');click(a,'check-'+id);assert.notEqual(a.$('feedback-'+id).textContent,wrong);}
const detail=a.body.querySelector('[data-sar-native="checks"]');detail.open=true;detail.ontoggle();detail.ontoggle();assert.equal(a.body.querySelector('[data-sar-native="checks"]'),detail,'Native toggle state does not redraw recursively');
click(a,'export');assert.deepEqual(a.exports[0],{body:{kind:'scattering-amplitude-replay',parameters:serialized(defaultReplay.parameters),replay:serialized(defaultReplay)},name:'scattering-amplitudes.json',type:'application/json'});
const saved=a.cleanup.snapshot(),oldExport=a.$('export').onclick;a.cleanup();const b=mount({store:a.store});assert.equal(b.$('stage-status').textContent,'振幅推导 5 / 5');assert.equal(b.$('branch').value,'1');assert.equal(b.$('variant').value,'gauge');assert.equal(b.$('group').value,'0');assert.equal(b.$('note').value,saved.note);assert.equal(b.body.querySelector('[data-sar-native="checks"]').attributes.open,'');assert.match(b.$('feedback-mass').textContent,/判断正确/);oldExport();assert.equal(a.exports.length,1,'Disposed export cannot export a stale ledger');b.cleanup();
const newResult=mount({replay:cases['folded-even'],store:a.store});assert.equal(newResult.$('stage-status').textContent,'振幅推导 1 / 5');assert.equal(newResult.$('note').value,'','A new result cannot inherit an old calculation explanation');newResult.cleanup();
const separate=mount({replay:defaultReply,store:a.store,key:'another-lesson'});assert.equal(separate.$('note').value,'');separate.cleanup();
const prefixed=mount({prefix:'sar-result-view',replay:cases['degenerate-edge']});choose(prefixed,'variant','mixed');for(let i=0;i<4;i++)click(prefixed,'next');const mixing=prefixed.body.querySelector('[data-sar-native="mixing"]');mixing.open=true;mixing.ontoggle();const mixedState=prefixed.cleanup.snapshot();assert.equal(mixedState.details.mixing,true);prefixed.cleanup();
let isCurrent=true;const detached=mount({active:()=>isCurrent});const handler=detached.$('next').onclick;isCurrent=false;handler();assert.equal(detached.$('stage-status').textContent,'振幅推导 1 / 5');detached.cleanup();
const noDownloadPage=new Container();noDownloadPage.innerHTML='<div data-empty></div>';const emptyCleanup=bind({root:noDownloadPage.querySelector('[data-empty]'),replay:defaultReply});assert.equal(noDownloadPage.querySelector('#sar-export').disabled,true);emptyCleanup();
const unsafe=clone(defaultReplay);unsafe.sources[0].title='<img src=x onerror=bad>';assert.doesNotMatch(render(unsafe),/<img|<script>/);assert.match(render(unsafe),/&lt;img/);

const source=fs.readFileSync(new URL('../dist/scattering-replay-ui.js',import.meta.url),'utf8'),locale=json('../locales/en-scattering-replay-ui.json'),oldCatalog=Object.assign({},...catalogFiles.filter(n=>n!=='en-scattering-replay-ui.json'&&fs.existsSync(path.join(localeRoot,n))).map(n=>JSON.parse(fs.readFileSync(path.join(localeRoot,n),'utf8')))),catalog={...loadEnglishCatalog(),...locale},units=new Set();
for(const item of jsStrings(source))for(const unit of textUnits(item.value))if(HAN.test(unit))units.add(unit.trim());
for(const unit of units)assert.ok(catalog[unit],'Missing amplitude translation: '+unit);
for(const [key,value]of Object.entries(locale)){assert.ok(units.has(key),'Unused amplitude translation: '+key);assert.ok(value.trim()&&!HAN.test(value));if(Object.hasOwn(oldCatalog,key))assert.equal(value,oldCatalog[key],'Preserve old translations: '+key);}
assert.doesNotMatch(source,/\beval\s*\(|new\s+Function|localStorage|sessionStorage|Math\.(?:sin|cos)|runPythonTask|fetch\(/);
const css=fs.readFileSync(new URL('../dist/scattering-replay.css',import.meta.url),'utf8');assert.match(css,/font-size:max\(18px,1rem\)/);assert.match(css,/\.sar-scroll\{[^}]*overflow-x:auto/);assert.match(css,/@container scattering-amplitudes \(min-width:760px\)/);
const edits=[];for(const item of jsStrings(source)){const next=replaceUnits(item.value,s=>catalog[s.trim()]??s);if(next!==item.value){assert.equal(item.type,'literal');edits.push({...item,next:JSON.stringify(next)});}}
let translated=source;for(const item of edits.sort((a,b)=>b.start-a.start))translated=translated.slice(0,item.start)+item.next+translated.slice(item.end);translated=translated.replace(/'\.\/math-display\.js\?[^']*'/,JSON.stringify(new URL('../dist/math-display.js',import.meta.url).href));
const actual=new URL('../dist/en/scattering-replay-ui.js',import.meta.url),english=fs.existsSync(actual)?await import(actual.href+'?scattering-replay-ui-test'):await import('data:text/javascript;base64,'+Buffer.from(translated).toString('base64'));
for(const replay of [defaultReply,cases['unequal-gamma'],cases['zero-projection'],cases['degenerate-edge'],nearReply]){const view=mount({replay,binder:english.bindScatteringReplay});for(let i=0;i<4;i++)click(view,'next');choose(view,'variant','relative');choose(view,'predict-mass','right');click(view,'check-mass');assert.ok(!HAN.test(view.body.innerHTML),'Generated English display must not leak labels from opaque scientific data');assert.doesNotMatch(view.body.innerHTML,/katex-error/);assert.match(view.$('stage-status').textContent,/Amplitude derivation\s+5\s*\/\s*5/);click(view,'export');assert.deepEqual(view.exports[0].body.replay,serialized(replay.data.amplitudeReplay),'English export preserves raw scientific metadata');view.cleanup();}
assert.equal(fetchCalls,0);assert.equal(gradeWrites,0);
console.log('Scattering replay UI: seven real API cases, all branches/variants, five stages, Gamma exclusion, zero projection, degenerate basis changes, immutable exports, independent restored state, prediction feedback, stale handlers, local scrolling and English display passed.');
