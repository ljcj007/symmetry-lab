import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {theoremThemes,theoremPreview,theoremScene,renderGroupTheoremsView,getGroupTheoremsResult} from '../dist/group-theorems.js';
import {projectionPreview} from '../dist/foundations-demos.js';

assert.equal(theoremThemes.length,9);
const cases=[];
for(const side of ['left','right'])for(let h=0;h<6;h++)cases.push({experiment:'rearrangement',side,h});
for(let g=0;g<6;g++)for(let h=0;h<6;h++)cases.push({experiment:'conjugacy',g,h});
for(const subgroup of ['A3','H12'])for(let h=0;h<6;h++)cases.push({experiment:'normal',subgroup,h});
for(const representation of ['permutation','E','A1','A2'])for(let g=0;g<6;g++)cases.push({experiment:'irreducible',representation,g});
for(const representation of ['permutation','E'])for(const a of [-.5,.4])cases.push({experiment:'schur',representation,a,b:.4});
for(const scale of [.5,1.8])for(const shear of [-.7,.6])for(const metric of ['average','similarity'])cases.push({experiment:'unitarity',scale,shear,metric});
const entries=[['A1',0,0],['A2',0,0],...Array.from({length:4},(_,x)=>['E',Math.floor(x/2),x%2])];
for(const [alpha,i,j] of entries)for(const [beta,k,l] of entries)cases.push({experiment:'orthogonality',alpha,beta,i,j,k,l});
for(const preset of ['permutation','regular','E'])cases.push({experiment:'reduction',preset});
cases.push({experiment:'reduction',preset:'custom',chiE:3,chiT:1,chiC:1});
for(const [a,b,epsilon] of [[-.5,.5,0],[.4,.4,0],[.4,.4,.2],[-.5,.5,-.2]])cases.push({experiment:'degeneracy',a,b,epsilon});
const code=`import json,sys;sys.path.insert(0,'dist/python');from group_theorems import run;from foundations_demos import d3_demo;print(json.dumps({'results':[run(p) for p in json.load(sys.stdin)],'triangle':d3_demo()}))`;
const {results,triangle}=JSON.parse(execFileSync(process.env.PYTHON||'python',['-c',code],{input:JSON.stringify(cases),encoding:'utf8'}));
function equivalent(a,b,path=''){
 if(typeof a==='number'&&typeof b==='number'){assert.ok(Math.abs(a-b)<1e-9,`${path}: ${a} != ${b}`);return;}
 if(Array.isArray(a)){assert.equal(a.length,b.length,path);a.forEach((x,i)=>equivalent(x,b[i],path+'.'+i));return;}
 if(a&&typeof a==='object'){for(const key of Object.keys(a))equivalent(a[key],b[key],path+'.'+key);return;}
 assert.equal(a,b,path);
}
cases.forEach((p,i)=>equivalent(theoremPreview(p.experiment,p),results[i],p.experiment));
for(const {id} of theoremThemes){const out=theoremScene(id);assert.match(out.plot,/<svg[^>]+role="img"/);assert.match(out.exercise,/<details>/);assert.doesNotMatch(out.plot,/NaN|undefined/);assert.doesNotMatch(out.html,/NaN|undefined/);}
assert.match(theoremScene('unitarity').html,/data-math-source="D&#39;\(g\)=S\^\{-1\}D\(g\)S"/);
assert.equal(theoremPreview('reduction',{preset:'custom',chiE:3,chiT:1,chiC:1}).validCharacter,false);
const reduction=results[cases.findIndex(p=>p.experiment==='reduction'&&p.preset==='permutation')];
const triangleOrder=[0,2,1];
assert.deepEqual(triangleOrder.map(i=>reduction.classSizes[i]),triangle.characterTable.sizes);
assert.deepEqual(triangleOrder.map(i=>reduction.inputCharacters[i]),triangle.characters);
assert.deepEqual(reduction.multiplicities,triangle.multiplicities);
for(const [irrep,projector] of Object.entries(triangle.projectors)){
 equivalent(projector.reduce((sum,row,i)=>sum+row[i],0),reduction.multiplicities[irrep]*reduction.dimensions[irrep],'projector rank '+irrep);
 for(let seedSite=0;seedSite<3;seedSite++){
  const preview=projectionPreview({operation:0,seedSite,irrep,row:0});
  equivalent(preview.projected,projector.map(row=>row[seedSite]),'projector column '+irrep+' '+seedSite);
 }
}
const triangleLesson=theoremScene('reduction',{preset:'permutation'}).exercise;
assert.match(triangleLesson,/<td>\(1, 3, 2\)<\/td><td>\(3, 1, 0\)<\/td>/);
assert.match(triangleLesson,/<td>\(1, 2, 3\)<\/td><td>\(3, 0, 1\)<\/td>/);
assert.match(triangleLesson,/href="#classroom\/foundations\?module=demos&amp;experiment=projection&amp;preset=triangle-permutation"/);
for(const preset of ['regular','E','custom']){
 assert.doesNotMatch(theoremScene('reduction',{preset}).exercise,/triangle-permutation/);
}

function fixture(){
 const root={listeners:{},nodes:new Map(),_html:'',set innerHTML(v){this._html=v;this.nodes=new Map();},get innerHTML(){return this._html;},addEventListener(t,f){this.listeners[t]=f;},querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,{innerHTML:'',textContent:'',disabled:false});return this.nodes.get(s);},querySelectorAll(){return [];}};
 return {root,container:{isConnected:true,firstElementChild:root,set innerHTML(v){this.firstElementChild=root;}}};
}
let runtimeCalls=0;const f=fixture();await renderGroupTheoremsView({container:f.container,selection:{experiment:'degeneracy'},run:()=>{runtimeCalls++;throw Error('The basic theorem experiment must not load Python.');}});
assert.doesNotMatch(f.root.innerHTML,/data-action="python"|gt-python/);
assert.match(f.root.innerHTML,/逐步证明/);
f.root.listeners.input({target:{tagName:'INPUT',dataset:{param:'epsilon'},value:'.2'}});
assert.equal(getGroupTheoremsResult().input.epsilon,.2);
assert.equal(getGroupTheoremsResult().result.protectedE,false);
f.root.listeners.click({target:{closest:s=>s==='[data-theme]'?{dataset:{theme:'normal'}}:null}});
assert.equal(getGroupTheoremsResult().input.experiment,'normal');
assert.equal(runtimeCalls,0);
assert.match(f.root.innerHTML,/<select data-param="subgroup" aria-label="待检查子群"/);
assert.match(f.root.innerHTML,/docs\/group-theorems\.md/);
console.log(`Nine group theorem demonstrations: ${cases.length} JavaScript/Python comparisons, SVG/TeX, full proofs and runtime-free classroom interaction passed.`);
