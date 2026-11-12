import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';
import {MATRIX_BRIDGE_HOOKS,matrixBridgeHTML,bindMatrixBridge,matrixBridgeReference,exactBridgeMath as m} from '../dist/matrix-bridges.js';

const I=[['1','0'],['0','1']],R=[['3/5','-4/5'],['4/5','3/5']],S=[[1,1],[0,1]],M=[[-1,0],[0,1]],C4=[[0,-1],[1,0]];
assert.deepEqual(m.product(m.transpose(R),R),I);
assert.deepEqual(m.inverse(R),m.transpose(R));
assert.deepEqual(m.inverse(S),[['1','-1'],['0','1']]);
assert.notDeepEqual(m.product(m.transpose(S),S),I);
assert.deepEqual(m.inverse(M),[['-1','0'],['0','1']]);
assert.deepEqual(m.product(m.inverse(S),S),I);
assert.throws(()=>m.inverse([[1,0],[0,0]]),/Singular/);
assert.throws(()=>m.apply([[1,0],[0,1]],[0.1,0]),/integer or a rational/);
assert.throws(()=>m.determinant([[1,'process.exit()'],[0,1]]),/Invalid/);
assert.throws(()=>m.determinant([[1,'1/0'],[0,1]]),/Zero denominator/);
assert.throws(()=>m.transpose([[1,0,0],[0,1,0]]),/2 by 2/);

// Independent integer shoelace areas, rather than calling a determinant twice.
for(const [matrix,denominator] of [[[[1,0],[0,1]],1],[[[3,-4],[4,3]],5],[[[-1,0],[0,1]],1],[[[-3,4],[4,3]],5],[[[1,1],[0,1]],1],[[[2,0],[0,1]],1],[[[1,0],[0,0]],1]]){
 const[a,b]=matrix[0],[c,d]=matrix[1],points=[[0,0],[a,c],[a+b,c+d],[b,d]];
 const twice=points.reduce((sum,p,n)=>{const v=points[(n+1)%4];return sum+p[0]*v[1]-v[0]*p[1];},0);
 assert.equal(Number(m.determinant(matrix.map(row=>row.map(x=>x+'/'+denominator)))),twice/(2*denominator*denominator));
}
const neg=m.product([[-1,0],[0,-1]],R);
assert.deepEqual(m.product(neg,R),[['7/25','24/25'],['-24/25','7/25']]);
assert.notDeepEqual(m.product(neg,R),I,'This rational rotation distinguishes negation from inversion');
assert.deepEqual(m.product(m.product([[-1,0],[0,-1]],C4),C4),I,'Do not claim negation never equals an inverse: the quarter-turn is exceptional');
const displayedInverse=matrixBridgeReference('transpose-inverse');
assert.deepEqual(displayedInverse.a,R);assert.deepEqual(displayedInverse.total,I);assert.deepEqual(displayedInverse.back,['1','0']);
assert.deepEqual(matrixBridgeReference('transpose-inverse',{choice:'negative'}).back,['7/25','-24/25']);
assert.deepEqual(matrixBridgeReference('transpose-inverse',{variant:true,variantChoice:'transpose'}).total,[['1','1'],['1','2']]);
assert.deepEqual(matrixBridgeReference('determinant-orientation').a,[['-3/5','4/5'],['4/5','3/5']]);
assert.equal(matrixBridgeReference('determinant-orientation').area,'-1');
assert.deepEqual(matrixBridgeReference('determinant-orientation',{stage:1}).a,R);

assert.deepEqual(m.pullback([1,0],C4),['0','1']);
assert.deepEqual(m.apply(C4,[1,2]),['-2','1']);
assert.equal(m.dot(m.pullback([1,0],C4),m.apply(C4,[1,2])),'1');
assert.deepEqual(matrixBridgeReference('c4-vector-function').image,['-2','1']);
assert.deepEqual(matrixBridgeReference('c4-vector-function').coeff,['0','1']);
const sequence=m.pullback(m.pullback([1,0],M),C4),together=m.pullback([1,0],m.product(C4,M));
assert.deepEqual(sequence,['0','-1']);assert.deepEqual(together,sequence);
assert.deepEqual(matrixBridgeReference('c4-vector-function',{variant:true,variantMode:'forward',variantChoice:'different'}).left,['0','1']);
assert.deepEqual(matrixBridgeReference('c4-vector-function',{variant:true,variantMode:'forward',variantChoice:'different'}).right,['0','-1']);

// Integer adjugates and a common denominator provide an independent oracle for
// 104 small unimodular changes, including orientation-reversing bases.
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a;};
const frac=(n,d)=>{const g=gcd(n,d);n/=g;d/=g;return d===1?String(n):n+'/'+d;};
let latticeCases=0;
for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)for(let c=-2;c<=2;c++)for(let d=-2;d<=2;d++){
 const determinant=a*d-b*c;if(Math.abs(determinant)!==1)continue;latticeCases++;
 const P=[[a,b],[c,d]],expectedT=[String((3*d+2*b)/determinant),String((-3*c-2*a)/determinant)],expectedK=[frac(10*a-7*c,35),frac(10*b-7*d,35)];
 const tp=m.apply(m.inverse(P),[3,-2]),kp=m.apply(m.transpose(P),['2/7','-1/5']);
 assert.deepEqual(tp,expectedT);assert.deepEqual(kp,expectedK);
 assert.deepEqual(m.apply(P,tp),['3','-2']);assert.deepEqual(m.apply(m.transpose(m.inverse(P)),kp),['2/7','-1/5']);
 assert.equal(m.dot(kp,tp),'44/35');
}
assert.equal(latticeCases,104);
const reciprocal=matrixBridgeReference('reciprocal-shear-phase');
assert.deepEqual(reciprocal.tp,['-1','2']);assert.deepEqual(reciprocal.kp,['1/4','3/8']);assert.equal(reciprocal.changed,'1/2');
assert.equal(matrixBridgeReference('reciprocal-shear-phase',{choice:'unchanged'}).changed,'0');
assert.equal(matrixBridgeReference('reciprocal-shear-phase',{choice:'forward'}).changed,'-1/8');
assert.equal(matrixBridgeReference('reciprocal-shear-phase',{variant:true}).changed,'1/4');
assert.equal(matrixBridgeReference('reciprocal-shear-phase',{variant:true,variantMode:'gamma',variantChoice:'identity'}).changed,'0');
assert.equal(matrixBridgeReference('determinant-orientation',{variant:true}).area,'2');
assert.equal(matrixBridgeReference('determinant-orientation',{variant:true,variantMode:'project',variantChoice:'project'}).area,'0');

const actualLessons=JSON.parse(fs.readFileSync(new URL('../dist/data/pointgroup-lessons.json',import.meta.url),'utf8')).lessons;
for(const id of Object.keys(MATRIX_BRIDGE_HOOKS))assert.ok(actualLessons.some(l=>l.id===id));
assert.equal(matrixBridgeHTML('future-lesson'),'');assert.equal(matrixBridgeHTML('__proto__'),'');
let networkCalls=0,storageWrites=0,workerCalls=0;
let focused=null;Element.prototype.focus=function(){focused=this;};
globalThis.fetch=()=>{networkCalls++;throw Error('No calculation backend should start');};
globalThis.Worker=class{constructor(){workerCalls++;throw Error('No worker should start');}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{storageWrites++;}};
const mount=lesson=>{const root=new Container();root.innerHTML=matrixBridgeHTML(lesson);let current=true;const cleanup=bindMatrixBridge({root,lessonId:lesson,isCurrent:()=>current});return{root,cleanup,leave(){current=false;}};};
function controls(host,id){const $=suffix=>host.root.querySelector('#mb-'+id+'-'+suffix);return{ $,choose(suffix,value){$(suffix).value=value;$(suffix).onchange();},click(suffix){const b=$(suffix);assert.ok(b,suffix);b.onclick();}};}
const host=mount('operations-notation');
assert.equal(host.root.querySelectorAll('[data-mb-bridge]').length,2);
for(const detail of host.root.querySelectorAll('[data-mb-bridge]')){assert.equal(detail.tag,'details');assert.ok(detail.querySelector('summary'));assert.equal(detail.querySelector('summary').onkeydown,undefined);assert.equal(detail.getAttribute('open'),null);}
let p=controls(host,'transpose-inverse');assert.equal(p.$('run').disabled,true);assert.equal(p.$('check').disabled,true);
p.choose('choice','negative');p.click('run');p.click('check');assert.match(p.$('feedback').textContent,/取负会把/);assert.doesNotMatch(p.$('feedback').attributes.class,/mb-success/);
assert.equal(focused,p.$('check'),'Redrawing an answer preserves its keyboard focus');
const oldRun=p.$('run');p.choose('choice','transpose');const before=host.root.querySelector('[data-mb-body="transpose-inverse"]').innerHTML;oldRun.onclick();assert.equal(host.root.querySelector('[data-mb-body="transpose-inverse"]').innerHTML,before,'Detached controls cannot act on a redrawn bridge');
p.click('run');p.click('check');assert.match(p.$('feedback').attributes.class,/mb-success/);
p.choose('probe','general');assert.equal(p.$('check').disabled,true);assert.equal(p.$('feedback').textContent,'','Changing the example revokes its check');
const variantBefore=host.root.querySelector('[data-mb-body="transpose-inverse"]').querySelector('.mb-variant');variantBefore.open=true;variantBefore.ontoggle();
p.choose('variant-choice','transpose');assert.notEqual(host.root.querySelector('[data-mb-body="transpose-inverse"]').querySelector('.mb-variant').getAttribute('open'),null,'An open variant remains open through its own controls');
variantBefore.open=false;variantBefore.ontoggle();
p.click('variant-run');p.click('variant-check');assert.doesNotMatch(p.$('variant-feedback').attributes.class,/mb-success/);assert.notEqual(host.root.querySelector('[data-mb-body="transpose-inverse"]').querySelector('.mb-variant').getAttribute('open'),null,'An obsolete toggle cannot close the current variant');
p.choose('variant-choice','inverse');p.click('variant-run');p.click('variant-check');assert.match(p.$('variant-feedback').attributes.class,/mb-success/);
p.choose('probe','x');assert.equal(p.$('variant-check').disabled,true);assert.equal(p.$('variant-feedback').textContent,'','Changing a shared probe also revokes the variant observation');
p.click('reset');assert.equal(p.$('choice').value,'');assert.equal(p.$('variant-check').disabled,true);
assert.equal(focused,p.$('choice'),'Reset returns focus to the prediction');

let area=controls(host,'determinant-orientation');area.choose('choice','negative');area.click('run');assert.equal(area.$('check').disabled,true,'A prediction for MR cannot be checked after only R');area.click('run');assert.equal(focused,area.$('check'),'After the second action, focus moves to its now-available check');area.click('check');assert.match(area.$('feedback').attributes.class,/mb-success/);
area.choose('variant-choice','stretch');area.click('variant-run');area.click('variant-check');assert.match(area.$('variant-feedback').attributes.class,/mb-success/);area.choose('mode','project');assert.equal(area.$('variant-choice').value,'');assert.equal(area.$('variant-check').disabled,true);

const functions=mount('projection'),fun=controls(functions,'c4-vector-function');fun.choose('choice','minus-y');fun.click('run');fun.click('check');assert.match(fun.$('feedback').textContent,/相反方向/);fun.choose('choice','y');fun.click('run');fun.click('check');assert.match(fun.$('feedback').attributes.class,/mb-success/);
fun.choose('variant-choice','same');fun.click('variant-run');fun.click('variant-check');assert.match(fun.$('variant-feedback').attributes.class,/mb-success/);fun.choose('mode','forward');fun.choose('variant-choice','same');fun.click('variant-run');fun.click('variant-check');assert.doesNotMatch(fun.$('variant-feedback').attributes.class,/mb-success/);assert.match(fun.$('variant-feedback').textContent,/反转了次序/);

const lattice=mount('from-point-to-space'),lat=controls(lattice,'reciprocal-shear-phase');lat.choose('choice','unchanged');lat.click('run');lat.click('check');const wrongA=lat.$('feedback').textContent;lat.choose('choice','forward');lat.click('run');lat.click('check');assert.notEqual(lat.$('feedback').textContent,wrongA);lat.choose('choice','transpose');lat.click('run');lat.click('check');assert.match(lat.$('feedback').attributes.class,/mb-success/);
lat.choose('variant-choice','minus-i');lat.click('variant-run');lat.click('variant-check');assert.match(lat.$('variant-feedback').attributes.class,/mb-success/);lat.choose('mode','gamma');lat.choose('variant-choice','identity');lat.click('variant-run');lat.click('variant-check');assert.match(lat.$('variant-feedback').attributes.class,/mb-success/);
const stale=lat.$('reset'),previous=lattice.root.querySelector('[data-mb-body="reciprocal-shear-phase"]').innerHTML;lattice.leave();stale.onclick();assert.equal(lattice.root.querySelector('[data-mb-body="reciprocal-shear-phase"]').innerHTML,previous);
const oldControl=fun.$('reset');functions.root.innerHTML='<p>Another lesson</p>';oldControl.onclick();assert.equal(functions.root.innerHTML,'<p>Another lesson</p>');
host.cleanup();const stopped=p.$('run'),frozen=host.root.querySelector('[data-mb-body="transpose-inverse"]').innerHTML;stopped.onclick();assert.equal(host.root.querySelector('[data-mb-body="transpose-inverse"]').innerHTML,frozen);
assert.equal(networkCalls,0);assert.equal(workerCalls,0);assert.equal(storageWrites,0,'Optional bridges do not claim course mastery or modify existing progress');
const css=fs.readFileSync(new URL('../dist/matrix-bridges.css',import.meta.url),'utf8');assert.match(css,/@container\(max-width:560px\)/);assert.match(css,/\.mb-controls select\{[^}]*font-size:18px/);assert.match(css,/summary:focus-visible/);assert.match(css,/\.mb-formula\{[^}]*overflow-x:auto/);
console.log('Matrix bridges: exact rotations/inverses/areas, noncommuting function actions, 104 unimodular dualities, four prediction/operation/variant flows, revocation, native disclosure semantics, stale controls and zero Python/storage calls passed.');
