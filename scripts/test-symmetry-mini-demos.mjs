import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english'),edition=english?'../dist/en/':'../dist/';
const {miniDemoPreview,miniDemoScene,miniDemoThemes,renderSymmetryMiniDemosView,getSymmetryMiniDemosResult}=await import(edition+'symmetry-mini-demos.js');
const {parseClassroomRoute,buildClassroomHash}=await import(edition+'classroom-ui.js');

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
assert.equal(miniDemoThemes.length,6);
const cases=[];
for(const polyhedron of ['tetra','cube','octa','dodeca','icosa'])for(const order of [2,3,4,5])cases.push({experiment:'polyhedra',polyhedron,order});
for(const delta of [0,.4])for(const mix of [0,45,90,173])for(const detector of ['local','common','contrast'])cases.push({experiment:'vibrations',delta,mix,detector});
for(const B of [0,.3])for(const kpi of [-1,-.4,0,.4,.5,1])cases.push({experiment:'bands',B,kpi});
for(const state of ['singlet','triplet0','triplet+','triplet-'])for(const J of [-1,1])cases.push({experiment:'manybody',state,J});
for(const theta of [0,65,180])cases.push({experiment:'time-reversal',theta,phi:37});
for(const angle of [0,360,720])cases.push({experiment:'double-soc',angle,coupling:.8});
const pythonCode=`import sys,json;sys.path.insert(0,'dist/python');from symmetry_mini_demos import run;print(json.dumps([run(p) for p in json.load(sys.stdin)]))`;
const results=JSON.parse(execFileSync(process.env.PYTHON||'python',['-c',pythonCode],{input:JSON.stringify(cases),encoding:'utf8'}));
const fields={polyhedra:['vertices','transformed','edges','rotation','maxMismatch','coincident','properGroup','fullGroup'],vibrations:['stiffness','modeVector','displacement','time','coefficients','detector','intensities','spectrum','eigenvalues','frequencies','eigenResidual','isEigenvector'],bands:['energies','hamiltonian','spinUpper','trimGaps','trResidual','sameKDegenerate'],manybody:['wavefunction','swapped','exchangeEigenvalue','energy'], 'time-reversal':['spinor','Tspinor','T2spinor','Kspinor','K2spinor','bloch','Tbloch','Kbloch'],'double-soc':['spinor','bloch','levels']};
function equivalent(a,b,path=''){
 if(typeof a==='number'&&typeof b==='number'){near(a,b);return;}
 if(Array.isArray(a)){assert.equal(a.length,b.length,path);a.forEach((v,i)=>equivalent(v,b[i],path+'.'+i));return;}
 if(a&&typeof a==='object'){for(const key of Object.keys(a))equivalent(a[key],b[key],path+'.'+key);return;}
 assert.equal(a,b,path);
}
cases.forEach((p,i)=>{const preview=miniDemoPreview(p.experiment,p);for(const field of fields[p.experiment])equivalent(preview[field],results[i][field],p.experiment+'.'+field);});
for(const {id} of miniDemoThemes){const r=miniDemoScene(id);assert.match(r.plot,/<svg[^>]+role="img"/);assert.match(r.exercise,/<details>/);assert.doesNotMatch(r.plot,/NaN|undefined/);assert.doesNotMatch(r.html,/NaN|undefined/);}
assert.equal(miniDemoPreview('polyhedra',{polyhedron:'icosa',order:5}).coincident,true);
assert.equal(miniDemoPreview('polyhedra',{polyhedron:'cube',order:5}).coincident,false);
assert.equal(miniDemoPreview('bands',{kpi:.5,alpha:.4,B:0}).sameKDegenerate,false);
assert.match(miniDemoScene('bands').html,/data-math-source="H\(k\).*?\\cos/);
assert.match(miniDemoScene('time-reversal').html,english?/antiunitary|complex conjugation/i:/反幺正|复共轭/);
assert.match(miniDemoScene('polyhedra').html,/data-math-source="T_d"/);

const bandRoute='#classroom/foundations?module=mini&experiment=bands';
const lessonRoute=bandRoute+'&preset=rashba-trim-check';
assert.equal(buildClassroomHash(parseClassroomRoute(lessonRoute)),lessonRoute);
Element.prototype.addEventListener=function(type,listener){this['event'+type]=listener;};
Element.prototype.closest=function(selector){for(let current=this;current instanceof Element;current=current.parentNode)if(current.matches(selector))return current;return null;};
const page=new Container(), $=selector=>page.querySelector(selector), calls=[], navigation=[];
const run=async(action,input)=>{
 calls.push({action,input});
 const index=cases.findIndex(c=>c.experiment===input.experiment&&c.B===input.B&&c.kpi===input.kpi);
 assert.notEqual(index,-1);
 return results[index];
};
for(const route of [bandRoute,bandRoute+'&preset=unknown',bandRoute.replace('bands','time-reversal')+'&preset=rashba-trim-check']){
 const dispose=await renderSymmetryMiniDemosView({container:page,selection:parseClassroomRoute(route),run});
 assert.equal($('#smd-rashba-trim'),null);
 dispose();
}
const disposeLesson=await renderSymmetryMiniDemosView({container:page,selection:parseClassroomRoute(lessonRoute),run,onNavigate:route=>navigation.push(route)});
const k=$('#smd-rashba-k'),guess=$('#smd-rashba-guess'),check=$('#smd-rashba-check'),feedback=$('#smd-rashba-feedback');
const comparison=$('#smd-rashba-result');
assert.equal($('#smd-rashba-python'),null);assert.equal($('[data-action="python"]'),null);assert.equal($('.smd-python'),null);
assert.equal(k.value,'0.2');
assert.equal(guess.getAttribute('aria-describedby'),'smd-rashba-feedback');
assert.equal(check.getAttribute('aria-controls'),'smd-rashba-result');
assert.equal(feedback.getAttribute('role'),'status');
assert.equal(comparison.hidden,true);
const choose=value=>{guess.value=value;guess.onchange();check.onclick();};
choose('even-proves');
assert.equal(comparison.hidden,true);
assert.match(feedback.textContent,english?/eigenvalues/i:/本征值/);
choose('split-breaks');
assert.equal(comparison.hidden,true);
assert.match(feedback.textContent,english?/momentum subspace/i:/动量子空间/);
const values=selector=>comparison.querySelectorAll(selector).map(cell=>Number(cell.textContent));
for(const [fraction,expectedK,gaps] of [['0','0',[0,.6]],['0.2','0.4',[1.5217,1.6357]],['0.5','1',[0,.6]]]){
 k.value=fraction;k.onchange();
 assert.equal(comparison.hidden,true);
 choose('matrix-test');
 assert.equal(comparison.hidden,false);
 assert.ok(comparison.querySelectorAll('[data-math-source]').some(el=>el.getAttribute('data-math-source')==='k/\\pi='+expectedK));
 assert.deepEqual(values('[data-rashba-spectrum]'),[0,0]);
 assert.deepEqual(values('[data-rashba-gap]'),gaps);
 assert.deepEqual(values('[data-rashba-residual]'),[0,.6]);
}
assert.equal(calls.length,0,'Interactive checks neither contact Python nor alter the base bands controls');
assert.deepEqual(getSymmetryMiniDemosResult().input,{experiment:'bands',t:1,alpha:.4,B:0,kpi:.35});
k.value='0.2';k.onchange();choose('matrix-test');
assert.equal(calls.length,0);
const oldFeedback=feedback.textContent;
await page.firstElementChild.eventclick({target:$('[data-theme="time-reversal"]')});
assert.deepEqual(navigation,[{experiment:'time-reversal',preset:undefined}]);
assert.equal($('#smd-rashba-trim'),null);
choose('even-proves');
assert.equal(feedback.textContent,oldFeedback);
disposeLesson();
console.log(`Six micro demonstrations: ${cases.length} JavaScript/Python cross-checks, SVG/TeX, local-only lessons and stale-view isolation passed.`);
