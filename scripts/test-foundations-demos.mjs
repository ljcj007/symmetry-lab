import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=english?'../dist/en/':'../dist/';
const {charactersPreview,characterComparisonPreview,projectionPreview,splittingPreview,jtPreview,waterPreview,foundationsDemoThemes,
 renderFoundationsDemosView,getFoundationsDemosResult}=await import(edition+'foundations-demos.js');
const {parseClassroomRoute,buildClassroomHash}=await import(edition+'classroom-ui.js');
assert.equal(foundationsDemoThemes.length,6);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
assert.equal(charactersPreview({operation:'C4',basis:'xyz'}).trace,1);
assert.equal(charactersPreview({operation:'C4',basis:'xy'}).trace,0);
const [rotationXY,mirrorXY]=characterComparisonPreview('xy');
const [rotationXYZ,mirrorXYZ]=characterComparisonPreview('xyz');
assert.deepEqual([rotationXY,mirrorXY,rotationXYZ,mirrorXYZ].map(row=>[row.trace,row.squaredTrace]),[
 [0,-2],[0,2],[1,-1],[1,3]
]);
assert.deepEqual(rotationXY.squared,[[-1,0],[0,-1]]);
assert.deepEqual(mirrorXY.squared,[[1,0],[0,1]]);
assert.deepEqual(rotationXYZ.squared,[[-1,0,0],[0,-1,0],[0,0,1]]);
assert.deepEqual(mirrorXYZ.squared,[[1,0,0],[0,1,0],[0,0,1]]);
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
const waterMirrorCharacters=characters+'&preset=water-mirror-xyz';
for(const route of [characters,water,waterMirrorCharacters])assert.equal(buildClassroomHash(parseClassroomRoute(route)),route);
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
const squareExercise=$('#fd-character-comparison');
const squareGuess=$('#fd-character-square-guess'),squareCheck=$('#fd-character-square-check');
const squareResult=$('#fd-character-square-result'),squareFeedback=$('#fd-character-square-feedback');
const tableColumns=host=>host.querySelectorAll('[data-character-operation]').map(row=>
 row.querySelectorAll('td').map(cell=>cell.textContent)
);
assert.equal(squareGuess.getAttribute('aria-describedby'),'fd-character-square-feedback');
assert.equal(squareCheck.getAttribute('aria-controls'),'fd-character-square-result');
assert.equal(squareFeedback.getAttribute('role'),'status');
assert.equal(squareResult.hidden,true);
assert.deepEqual(tableColumns(squareExercise).slice(0,2).map(row=>row[1]),['1','1']);
squareCheck.onclick();
assert.match(squareFeedback.textContent,local(/请先选择/,/Choose/));
squareGuess.value='equal';squareGuess.onchange();squareCheck.onclick();
assert.equal(squareResult.hidden,true);
assert.match(squareFeedback.textContent,local(/试着跟踪/,/Follow/));
squareGuess.value='mirror';squareGuess.onchange();squareCheck.onclick();
assert.equal(squareResult.hidden,false);
assert.deepEqual(tableColumns(squareResult).map(row=>row[1]),['−1','3']);
assert.deepEqual(squareResult.querySelectorAll('[data-character-operation]').map(row=>row.querySelectorAll('td')[2]
 .querySelector('[data-math-source]').getAttribute('data-math-source')),['+i,\\,-i,\\,+1','+1,\\,-1,\\,+1']);
assert.equal(calls.length,0);
operation.value='C2';
page.firstElementChild.eventchange({target:operation});
assert.equal($('#fd-character-water-bridge'),bridge,'Updating the matrix preview leaves the fixed mirror exercise intact');
assert.equal($('[data-param="operation"]').value,'C2');
assert.equal(result.hidden,false);
assert.equal($('#fd-character-square-result'),squareResult,'Changing the preview operation preserves the fixed comparison');
const basis=$('[data-param="basis"]');
basis.value='xy';
page.firstElementChild.eventchange({target:basis});
assert.equal($('#fd-character-comparison'),squareExercise);
assert.equal($('#fd-character-square-result').hidden,true,'A basis change resets the prediction for the new dimension');
const afterBasisChange=squareFeedback.textContent;
squareCheck.onclick();
assert.equal(squareFeedback.textContent,afterBasisChange,'A detached quiz cannot update after the basis changes');
assert.deepEqual(tableColumns(squareExercise).slice(0,2).map(row=>row[1]),['0','0']);
$('#fd-character-square-guess').value='mirror';
$('#fd-character-square-check').onclick();
assert.deepEqual(tableColumns($('#fd-character-square-result')).map(row=>row[1]),['−2','2']);
guess.value='1';guess.onchange();
assert.equal(result.hidden,true);
dispose();
dispose=await renderFoundationsDemosView({...options,selection:parseClassroomRoute(lesson)});
assert.equal($('#fd-character-water-bridge'),null);
assert.ok($('[data-water-actions-entry]'));
assert.equal($('[data-water-actions-entry]').getAttribute('open'),null);
const prerequisite=$('#fd-water-character-prerequisite');
assert.equal(prerequisite.querySelector('a').getAttribute('href'),waterMirrorCharacters);
assert.match(prerequisite.innerHTML,/\bsigma\(xz\)/);
const staleFeedback=feedback.textContent;
check.onclick();
assert.equal(feedback.textContent,staleFeedback,'Detached exercises cannot change a later lesson');
assert.equal(calls.length,0);
assert.deepEqual(routes,[]);
dispose();
for(const [route,operation,basis] of [
 [waterMirrorCharacters,'mirror','xyz'],
 [characters+'&preset=quarter-turn-xy','C4','xy'],
 [characters+'&preset=quarter-turn-xyz','C4','xyz'],
 [characters+'&preset=unknown','C4','xyz']
]){
 dispose=await renderFoundationsDemosView({...options,selection:parseClassroomRoute(route)});
 assert.equal($('[data-param="operation"]').value,operation);
 assert.equal($('[data-param="basis"]').value,basis);
 assert.equal(getFoundationsDemosResult().input.operation,operation);
 assert.equal(getFoundationsDemosResult().input.basis,basis);
 assert.equal(calls.length,0);
 dispose();
}
const misrouted=water+'&preset=quarter-turn-xy';
dispose=await renderFoundationsDemosView({...options,selection:parseClassroomRoute(misrouted)});
assert.equal($('#fd-character-comparison'),null);
assert.equal(getFoundationsDemosResult().input.basis,undefined);
dispose();
dispose=await renderFoundationsDemosView({...options,selection:parseClassroomRoute(waterMirrorCharacters)});
await page.firstElementChild.eventclick({target:$('[data-action="python"]')});
assert.deepEqual(calls,[['foundations_demos',{experiment:'characters',theme:'characters',operation:'mirror',basis:'xyz'}]]);
await page.firstElementChild.eventclick({target:$('[data-theme="water"]')});
assert.deepEqual(routes,[{experiment:'water',preset:undefined}]);
dispose();
console.log(`Foundations demo (${english?'English':'Chinese'}): preview invariants, trace comparison, fixed mirror check, preset handoffs and stale guards passed.`);
