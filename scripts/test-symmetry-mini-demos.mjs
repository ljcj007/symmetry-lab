import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {miniDemoPreview,miniDemoScene,miniDemoThemes,renderSymmetryMiniDemosView,getSymmetryMiniDemosResult} from '../dist/symmetry-mini-demos.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
assert.equal(miniDemoThemes.length,6);
const cases=[];
for(const polyhedron of ['tetra','cube','octa','dodeca','icosa'])for(const order of [2,3,4,5])cases.push({experiment:'polyhedra',polyhedron,order});
for(const delta of [0,.4])for(const mix of [0,45,90,173])cases.push({experiment:'vibrations',delta,mix});
for(const B of [0,.3])for(const kpi of [0,.5,1])cases.push({experiment:'bands',B,kpi});
for(const state of ['singlet','triplet0','triplet+','triplet-'])for(const J of [-1,1])cases.push({experiment:'manybody',state,J});
for(const theta of [0,65,180])cases.push({experiment:'time-reversal',theta,phi:37});
for(const angle of [0,360,720])cases.push({experiment:'double-soc',angle,coupling:.8});
const pythonCode=`import sys,json;sys.path.insert(0,'dist/python');from symmetry_mini_demos import run;print(json.dumps([run(p) for p in json.load(sys.stdin)]))`;
const results=JSON.parse(execFileSync(process.env.PYTHON||'python',['-c',pythonCode],{input:JSON.stringify(cases),encoding:'utf8'}));
const fields={polyhedra:['vertices','transformed','edges','rotation','maxMismatch','coincident','properGroup','fullGroup'],vibrations:['stiffness','modeVector','eigenvalues','frequencies','eigenResidual','isEigenvector'],bands:['energies','trimGaps','trResidual','sameKDegenerate'],manybody:['wavefunction','swapped','exchangeEigenvalue','energy'], 'time-reversal':['spinor','Tspinor','T2spinor','Kspinor','K2spinor','bloch','Tbloch','Kbloch'],'double-soc':['spinor','bloch','levels']};
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
assert.match(miniDemoScene('time-reversal').html,/反幺正|复共轭/);
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
console.log(`Six micro demonstrations: ${cases.length} JavaScript/Python cross-checks, SVG/TeX and stale-result isolation passed.`);
