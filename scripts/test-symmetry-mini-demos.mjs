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
for(const delta of [0,.4])for(const mix of [0,45,90,173])cases.push({experiment:'vibrations',delta,mix});
for(const B of [0,.3])for(const kpi of [-1,-.4,0,.4,.5,1])cases.push({experiment:'bands',B,kpi});
for(const state of ['singlet','triplet0','triplet+','triplet-'])for(const J of [-1,1])cases.push({experiment:'manybody',state,J});
for(const theta of [0,65,180])cases.push({experiment:'time-reversal',theta,phi:37});
for(const angle of [0,360,720])cases.push({experiment:'double-soc',angle,coupling:.8});
const pythonCode=`import sys,json;sys.path.insert(0,'dist/python');from symmetry_mini_demos import run;print(json.dumps([run(p) for p in json.load(sys.stdin)]))`;
const results=JSON.parse(execFileSync(process.env.PYTHON||'python',['-c',pythonCode],{input:JSON.stringify(cases),encoding:'utf8'}));
const fields={polyhedra:['vertices','transformed','edges','rotation','maxMismatch','coincident','properGroup','fullGroup'],vibrations:['stiffness','modeVector','eigenvalues','frequencies','eigenResidual','isEigenvector'],bands:['energies','hamiltonian','spinUpper','trimGaps','trResidual','sameKDegenerate'],manybody:['wavefunction','swapped','exchangeEigenvalue','energy'], 'time-reversal':['spinor','Tspinor','T2spinor','Kspinor','K2spinor','bloch','Tbloch','Kbloch'],'double-soc':['spinor','bloch','levels']};
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

// A controlled DOM-like transport checks a real race: late Python output must
// not replace a preview for newer parameters or a different topic.
function fixture(){
 const root={listeners:{},nodes:new Map(),_html:'',
  set innerHTML(v){this._html=v;this.nodes=new Map();},get innerHTML(){return this._html;},
  addEventListener(type,callback){this.listeners[type]=callback;},
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,{innerHTML:'',textContent:'',disabled:false});return this.nodes.get(selector);},
  querySelectorAll(){return [];}};
 const container={isConnected:true,firstElementChild:root,set innerHTML(v){this.firstElementChild=root;}};
 return {root,container};
}
let resolveRun;
const f=fixture();
await renderSymmetryMiniDemosView({container:f.container,selection:{experiment:'manybody'},run:()=>new Promise(resolve=>{resolveRun=resolve;})});
const action=()=>({target:{closest:selector=>selector==='[data-action]'?{dataset:{action:'python'}}:null}});
const pending=f.root.listeners.click(action());
f.root.listeners.input({target:{tagName:'INPUT',dataset:{param:'J'},value:'-1'}});
resolveRun({checks:{passed:true},stale:true});await pending;
assert.equal(getSymmetryMiniDemosResult().input.J,-1);
assert.equal(getSymmetryMiniDemosResult().tool,'symmetry_mini_demos_preview');
const pendingTab=f.root.listeners.click(action());
await f.root.listeners.click({target:{closest:selector=>selector==='[data-theme]'?{dataset:{theme:'bands'}}:null}});
resolveRun({checks:{passed:true},stale:true});await pendingTab;
assert.equal(getSymmetryMiniDemosResult().input.experiment,'bands');
assert.equal(getSymmetryMiniDemosResult().tool,'symmetry_mini_demos_preview');
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
const comparison=$('#smd-rashba-result'),python=$('#smd-rashba-python'),pythonStatus=$('#smd-rashba-python-status');
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
await python.onclick();
assert.match(pythonStatus.textContent,english?/Python agrees/:/Python 核对一致/);
assert.deepEqual(calls.map(call=>[call.action,call.input.B,call.input.kpi]),[
 ['symmetry_mini_demos',0,.4],['symmetry_mini_demos',0,-.4],
 ['symmetry_mini_demos',.3,.4],['symmetry_mini_demos',.3,-.4]
]);
const oldFeedback=feedback.textContent;
await page.firstElementChild.eventclick({target:$('[data-theme="time-reversal"]')});
assert.deepEqual(navigation,[{experiment:'time-reversal',preset:undefined}]);
assert.equal($('#smd-rashba-trim'),null);
choose('even-proves');
assert.equal(feedback.textContent,oldFeedback);
disposeLesson();
let cancelOwned=0,finishOwned,started=0;
const disposePending=await renderSymmetryMiniDemosView({container:page,selection:parseClassroomRoute(lessonRoute),run:()=>{
 started++;
 return Object.assign(new Promise(resolve=>{finishOwned=resolve;}),{cancel:()=>{cancelOwned++;}});
}});
const pendingGuess=$('#smd-rashba-guess'),pendingK=$('#smd-rashba-k'),pendingStatus=$('#smd-rashba-python-status');
pendingGuess.value='matrix-test';pendingGuess.onchange();$('#smd-rashba-check').onclick();
const pendingComparison=$('#smd-rashba-python').onclick();
pendingK.value='0';pendingK.onchange();finishOwned(results.find(r=>r.experiment==='bands'&&r.B===0&&r.kpi===.4));
await pendingComparison;
assert.equal(cancelOwned,1);
assert.equal(started,1,'Invalidated comparisons never launch further Python work');
assert.equal(pendingStatus.textContent,'');
assert.equal($('#smd-rashba-result').hidden,true);
disposePending();
console.log(`Six micro demonstrations: ${cases.length} JavaScript/Python cross-checks, SVG/TeX and stale-result isolation passed.`);
