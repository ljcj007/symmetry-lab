import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=english?'../dist/en/':'../dist/';
const {charactersPreview,projectionPreview,splittingPreview,jtPreview,waterPreview,foundationsDemoThemes,
 renderFoundationsDemosView,getFoundationsDemosResult}=await import(edition+'foundations-demos.js');
const {parseClassroomRoute,buildClassroomHash}=await import(edition+'classroom-ui.js');
assert.equal(foundationsDemoThemes.length,6);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
assert.equal(charactersPreview({operation:'C4',basis:'xyz'}).trace,1);
assert.equal(charactersPreview({operation:'C4',basis:'xy'}).trace,0);
const id=projectionPreview({operation:0,seedSite:0,irrep:'E',row:0});
close(id.normalized[0],2/Math.sqrt(6));close(id.normalized[1],-1/Math.sqrt(6));
const partner=projectionPreview({operation:1,seedSite:0,irrep:'E',row:1});
close(partner.normalized[0],0);close(partner.normalized[1],1/Math.sqrt(2));
for(let operation=0;operation<6;operation++){
 const r=projectionPreview({operation,seedSite:0,irrep:'E',row:0});
 close(r.eMatrix[0][0]+r.eMatrix[1][1],[2,-1,-1,0,0,0][operation]);
}
close(projectionPreview({operation:0,seedSite:0,irrep:'A2',row:0}).norm,0);
for(const delta of [0,1,2])for(const ds of [-.3,0,.3])for(const dt of [-.1,0,.1])close(splittingPreview({delta,ds,dt}).barycenter,0);
const jt=jtPreview({qtheta:1,qepsilon:0,g:1,k:1,occupancy:1});close(jt.lower,-.5);close(jt.minRadius,1);close(jt.stabilization,.5);
assert.equal(jtPreview({qtheta:1,qepsilon:0,g:1,k:1,occupancy:2}).linearActive,false);
close(jtPreview({qtheta:1,qepsilon:0,g:1,k:1,occupancy:2}).minRadius,0);
for(const mode of ['symmetric','bend','antisymmetric']){
 const w=waterPreview({mode,phase:90,amplitude:.3}),mass=[16,1,1];
 for(const j of [0,1])close(w.displacements.reduce((sum,u,i)=>sum+mass[i]*u[j],0),0);
}

const waterFixture=JSON.parse(readFileSync(new URL('./fixtures/water-actions.json',import.meta.url),'utf8'));
const mirror=waterFixture.cases[0].result.operations.find(operation=>operation.id==='sigma-xz');
const vector=charactersPreview({operation:'mirror',basis:'xyz'});
assert.deepEqual(vector.matrix,mirror.polar.matrix);
assert.equal(vector.trace,1);
assert.equal(mirror.fixedAtomCount,3);
assert.equal(mirror.trace,mirror.fixedAtomCount*vector.trace);

Element.prototype.addEventListener=function(type,listener){this['event'+type]=listener;};
Element.prototype.closest=function(selector){for(let current=this;current instanceof Element;current=current.parentNode)if(current.matches(selector))return current;return null;};
Object.defineProperty(Element.prototype,'tagName',{configurable:true,get(){return this.tag.toUpperCase();}});
const page=new Container(),calls=[],routes=[];
const options={container:page,onNavigate:route=>routes.push(route),
 run:async(...args)=>{calls.push(args);return {};},
 loadWaterActions:()=>assert.fail('The bridge never opens the Water Actions module automatically')};
const characters='#classroom/foundations?module=demos&experiment=characters';
const water='#classroom/foundations?module=demos&experiment=water';
for(const route of [characters,water])assert.equal(buildClassroomHash(parseClassroomRoute(route)),route);
let dispose=await renderFoundationsDemosView({...options,selection:parseClassroomRoute(characters)});
const $=selector=>page.querySelector(selector),local=(zh,en)=>english?en:zh;
const bridge=$('#fd-character-water-bridge');
assert.ok(bridge);
assert.equal(bridge.getAttribute('open'),null);
assert.equal($('[data-water-actions-entry]'),null);
assert.match($('.fd-preview').innerHTML,local(/另一个表示/,/a different representation/));
assert.match($('.fd-preview').innerHTML,local(/特征标保持不变/,/the character stays unchanged/));
const guess=$('#fd-character-water-guess'),check=$('#fd-character-water-check');
const feedback=$('#fd-character-water-feedback'),result=$('#fd-character-water-result');
assert.equal(guess.getAttribute('aria-describedby'),'fd-character-water-feedback');
assert.equal(feedback.getAttribute('role'),'status');
assert.equal(result.hidden,true);
const predict=value=>{guess.value=value;guess.onchange();check.onclick();};
const original=structuredClone(getFoundationsDemosResult());
predict('');
assert.match(feedback.textContent,local(/先选择/,/Choose/));
predict('1');
assert.match(feedback.textContent,local(/单个原子/,/one atom/));
assert.equal(result.hidden,true);
predict('9');
assert.match(feedback.textContent,local(/维数/,/dimension/));
assert.equal(result.hidden,true);
predict('3');
assert.match(feedback.textContent,local(/正确/,/Correct/));
assert.equal(result.hidden,false);
assert.match(result.innerHTML,/\+1、−1、\+1|\+1, −1, \+1/);
assert.match(result.innerHTML,/\+3/);
const lesson=result.querySelector('a').getAttribute('href');
assert.equal(lesson,water);
assert.deepEqual(getFoundationsDemosResult(),original);
const operation=$('[data-param="operation"]');
operation.value='C2';
page.firstElementChild.eventchange({target:operation});
assert.equal($('#fd-character-water-bridge'),bridge,'Updating the matrix preview leaves the fixed mirror exercise intact');
assert.equal($('[data-param="operation"]').value,'C2');
assert.equal(result.hidden,false);
guess.value='1';guess.onchange();
assert.equal(result.hidden,true);
dispose();
dispose=await renderFoundationsDemosView({...options,selection:parseClassroomRoute(lesson)});
assert.equal($('#fd-character-water-bridge'),null);
assert.ok($('[data-water-actions-entry]'));
assert.equal($('[data-water-actions-entry]').getAttribute('open'),null);
const prerequisite=$('#fd-water-character-prerequisite');
assert.equal(prerequisite.querySelector('a').getAttribute('href'),characters);
assert.match(prerequisite.innerHTML,/\bsigma\(xz\)/);
const staleFeedback=feedback.textContent;
check.onclick();
assert.equal(feedback.textContent,staleFeedback,'Detached exercises cannot change a later lesson');
assert.equal(calls.length,0);
assert.deepEqual(routes,[]);
dispose();
console.log(`Foundations demo (${english?'English':'Chinese'}): preview invariants, fixed mirror check, water prerequisites, old outputs and stale guards passed.`);
