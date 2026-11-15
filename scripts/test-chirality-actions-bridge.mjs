import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Container,Element} from './test-material-research-ui.mjs';
import {HAN,jsStrings,textUnits,replaceUnits} from './english-source.mjs';
import {CHIRALITY_ACTIONS_BRIDGE_HOOKS,CHIRALITY_ACTIONS_REFERENCE,chiralityActionReference,chiralityPolarReference,
 chiralityActionsLabRequest,chiralityActionsBridgeHTML,bindChiralityActionsBridge} from '../dist/chirality-actions-bridge.js';

const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} versus ${b}`);
const norm=x=>Math.hypot(...x),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const mv=(matrix,x)=>matrix.map(row=>dot(row,x));
const reference=CHIRALITY_ACTIONS_REFERENCE;
assert.deepEqual(CHIRALITY_ACTIONS_BRIDGE_HOOKS,{'chiral-mirror':['mirror-trace'],'chiral-polarity':['polar-constraints']});
assert.equal(chiralityActionsBridgeHTML('other'),'');assert.equal(reference.sourceHashNormalization,'utf8-lf-v1');
const hash=text=>crypto.createHash('sha256').update(text.replace(/\r\n?/g,'\n'),'utf8').digest('hex');
for(const[path,digest]of Object.entries(reference.sourceHashes)){const text=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),lf=text.replace(/\r\n?/g,'\n');for(const variant of [lf,lf.replace(/\n/g,'\r\n'),lf.replace(/\n/g,'\r')])assert.equal(hash(variant),digest);}
let maps=0,polarTrials=0;
for(const caseId of ['d3','pyramid','octahedron','tetra'])for(const components of ['original','passive']){
 const ref=reference.cases[caseId];
 for(const mode of ['proper','forbidden'])for(let structure=0;structure<ref.generators.length;structure++){
  const result=chiralityActionReference({caseId,components,mode,structure});assert.equal(result.bijective,true);assert.equal(result.labelPreserved,true);
  near(result.determinant,mode==='proper'?1:-1,1e-12);assert.equal(result.allowedAlignment,mode==='proper');
  const distances=result.rows.map(row=>norm(row.transformed.map((v,i)=>v-row.target[i])));
  near(result.rms,Math.sqrt(distances.reduce((s,v)=>s+v*v,0)/distances.length),1e-12);near(result.maximum,Math.max(...distances),1e-12);
  near(result.rms,mode==='proper'?ref.mirrorFit.rms:0);assert.equal(result.chiral,ref.chiral);
  for(const row of result.structure.rows)near(norm(row.image.map((v,i)=>v-row.target[i])),0,1e-10);maps++;
 }
 for(const trial of ['z','x','sum','zero'])for(const amplitude of [0,1,2]){
  const r=chiralityPolarReference({caseId,components,trial,amplitude}),p=mv(r.projector,r.vector);
  near(norm(p.map((v,i)=>v-r.projected[i])),0,1e-12);assert.equal(r.allowed,norm(p.map((v,i)=>v-r.vector[i]))<1e-8);
  assert.equal(r.dimension,{d3:0,pyramid:1,octahedron:0,tetra:3}[caseId]);assert.equal(r.zeroAllowed,true);
  for(const g of r.generators)near(norm(g.image.map((v,i)=>v-r.vector[i])),g.norm,1e-12);polarTrials++;
 }
 const req=chiralityActionsLabRequest({caseId});assert.equal(req.action,'chirality_polarity_lab');assert.equal(req.module,'chirality');assert.deepEqual(Object.keys(req.input).sort(),['angle','handedness','motif','noise','optical','tolerance']);assert.equal(req.input.motif,caseId);assert.equal(req.input.noise,0);assert.equal(req.input.angle,20);req.input.motif='changed';assert.equal(chiralityActionsLabRequest({caseId}).input.motif,caseId);
}
for(const args of [{caseId:'arbitrary'},{components:'arbitrary'},{mode:'improper'},{structure:99}])assert.throws(()=>chiralityActionReference(args));
for(const args of [{caseId:'arbitrary'},{trial:'arbitrary'},{amplitude:.5}])assert.throws(()=>chiralityPolarReference(args));
near(chiralityPolarReference({caseId:'d3',trial:'z'}).generators[0].norm,0);near(chiralityPolarReference({caseId:'d3',trial:'z'}).generators[1].norm,2);
assert.equal(chiralityPolarReference({caseId:'pyramid',trial:'z',amplitude:0}).allowed,true);

let fetches=0,workers=0,writes=0,focus=null;
globalThis.fetch=()=>{fetches++;throw Error('Unexpected fetch');};globalThis.Worker=class{constructor(){workers++;throw Error('Unexpected worker');}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};Element.prototype.focus=function(){focus=this;};
function mount(lessonId='chiral-mirror',{store=new Map(),root=new Container(),onOpenLab=async()=>true}={}){
 root.innerHTML=chiralityActionsBridgeHTML(lessonId);let alive=true;
 const cleanup=bindChiralityActionsBridge({root,lessonId,isCurrent:()=>alive,stateStore:store,onOpenLab});
 const $=name=>root.querySelector('#chab-'+lessonId+'-'+name);
 return{root,store,cleanup,$,leave(){alive=false;},choose(name,value){const node=$(name);assert.ok(node,name);node.value=String(value);node.onchange();},click(name){const node=$(name);assert.equal(node.disabled,false,name);return node.onclick();}};
}
for(const lessonId of ['chiral-mirror','chiral-polarity']){
 const calls=[],view=mount(lessonId,{onOpenLab:async payload=>{calls.push(payload);return true;}});
 assert.equal(view.$('details').open,false);assert.equal(view.$('next').disabled,true);
 const wrong=lessonId==='chiral-mirror'?'zero':'one',correct=lessonId==='chiral-mirror'?'proper':'all';
 view.choose('q0',wrong);view.click('check0');assert.ok(view.$('feedback0').textContent.length>20);view.choose('q0',correct);assert.equal(view.$('feedback0').textContent,'');view.click('check0');assert.match(view.$('feedback0').textContent,/正确/);
 view.$('details').open=true;view.$('conventions').open=true;
 view.choose('components','passive');const selector=view.$('caseId');selector.focus();view.choose('caseId','pyramid');view.click('next');view.click('next');view.click('next');assert.equal(view.$('caseId'),selector);assert.equal(focus,selector);
 assert.doesNotMatch(view.$('output').innerHTML,/katex-error|math-error/);
 if(lessonId==='chiral-mirror'){view.choose('atom',4);view.choose('structure',1);view.choose('mode','forbidden');assert.match(view.$('output').innerHTML,/禁止|不通过/);view.choose('caseId','tetra');assert.equal(view.$('atom').value,'3');assert.equal(view.$('structure').value,'0');view.choose('q1','roles');}
 else{view.choose('trial','zero');view.choose('amplitude',2);assert.match(view.$('output').innerHTML,/齐次方程/);view.choose('q1','zero');}
 view.$('note').value='Unsent explanation <script>';view.$('note').oninput();const saved=view.cleanup.snapshot();assert.equal(Object.values(saved)[0].open,true);assert.equal(Object.values(saved)[0].checked[1],false);
 const oldControl=selector.onchange,oldCopy=view.$('copy').onclick;await view.click('copy');assert.equal(calls.length,1);assert.equal(calls[0].input.motif,view.$('caseId').value);
 view.cleanup();const restored=mount(lessonId,{store:view.store});assert.equal(restored.$('details').open,true);assert.equal(restored.$('conventions').open,true);assert.equal(restored.$('note').value,'Unsent explanation <script>');assert.equal(restored.$('q1').value,lessonId==='chiral-mirror'?'roles':'zero');assert.equal(restored.$('feedback1').textContent,'');oldControl();await oldCopy();assert.equal(calls.length,1);
 const replacement=bindChiralityActionsBridge({root:restored.root,lessonId,stateStore:view.store,onOpenLab:async()=>true});restored.cleanup();assert.equal(typeof restored.$('copy').onclick,'function');replacement();
}
let release;const pending=mount('chiral-mirror',{onOpenLab:()=>new Promise(resolve=>{release=resolve;})});const job=pending.click('copy');pending.leave();release(true);await job;assert.equal(pending.$('copy-status').textContent,'');pending.cleanup();
let attempts=0;const retry=mount('chiral-polarity',{onOpenLab:async()=>{if(++attempts===1)throw Error('temporary');return true;}});await retry.click('copy');assert.match(retry.$('copy-status').textContent,/重新尝试/);await retry.click('copy');assert.match(retry.$('copy-status').textContent,/已复制/);retry.cleanup();
let finishOld;const race=mount('chiral-mirror',{onOpenLab:()=>new Promise(resolve=>{finishOld=resolve;})});const oldJob=race.click('copy');race.click('reset');assert.equal(race.$('copy').disabled,false);race.choose('caseId','tetra');finishOld(false);await oldJob;assert.equal(race.$('copy-status').textContent,'');assert.equal(race.$('caseId').value,'tetra');race.cleanup();
assert.deepEqual({fetches,workers,writes},{fetches:0,workers:0,writes:0});

// Changing a motif refreshes the visible point count, classification and polar
// dimension immediately. Shared headings describe the task, not a fixed model.
const changing=mount('chiral-mirror');changing.choose('q0','proper');changing.click('next');changing.click('next');changing.click('next');
for(const[caseId,count,chiral]of [['d3',6,true],['pyramid',5,false],['octahedron',6,false],['tetra',4,true]]){
 changing.choose('caseId',caseId);assert.equal(changing.$('caseId').value,caseId);assert.equal(changing.$('atom').querySelectorAll('option').length,count);
 assert.ok(changing.$('output').textContent.includes('当前原型的几何手性：'+(chiral?'是':'否')));
}
changing.cleanup();const dimensions=mount('chiral-polarity');dimensions.choose('q0','all');dimensions.click('next');dimensions.click('next');
for(const[caseId,dimension]of [['d3',0],['pyramid',1],['octahedron',0],['tetra',3]]){dimensions.choose('caseId',caseId);assert.ok(dimensions.$('output').textContent.includes('允许极向量子空间维数：'+dimension));}
dimensions.cleanup();

const source=fs.readFileSync(new URL('../dist/chirality-actions-bridge.js',import.meta.url),'utf8'),locale=JSON.parse(fs.readFileSync(new URL('../locales/en-chirality-actions-bridge.json',import.meta.url),'utf8'));
const units=[...new Set(jsStrings(source).flatMap(item=>textUnits(item.value)))];assert.ok(units.length>100);assert.deepEqual(units.filter(text=>!locale[text]),[]);
assert.ok(source.includes('QMr_i+t-r_{p(i)}'));assert.equal(source.includes('QMr_i-r_{p(i)}'),false);assert.ok(units.some(text=>text.includes('源点集与镜像均已中心化')));
for(const item of jsStrings(source)){const translated=replaceUnits(item.value,text=>locale[text]);assert.equal(HAN.test(translated),false);if(!HAN.test(item.value))assert.equal(translated,item.value);}
for(const text of units)assert.equal(HAN.test(locale[text]),false);
const css=fs.readFileSync(new URL('../dist/chirality-actions-bridge.css',import.meta.url),'utf8');assert.match(css,/font-size:18px/);assert.match(css,/\.chab-formula\{[^}]*font-size:22px/);assert.match(css,/\.chab-scroll\{[^}]*overflow-x:auto/);assert.doesNotMatch(source,/localStorage|sessionStorage|new Worker|fetch\(/);
console.log(`Chirality actions: ${maps} finite maps, ${polarTrials} vector trials, proper/improper separation, projectors, zero-vector control, passive coordinates, stable RAM/native state, owner/stale/copy/error guards and ${units.length} extracted English units passed.`);
