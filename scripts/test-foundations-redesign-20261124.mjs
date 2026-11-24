import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';
import {charactersPreview,orbitalMatrix,waterRepresentation,waterPreview,projectionPreview,jtPreview,foundationsDemoScene,renderFoundationsDemosView,getFoundationsDemosResult} from '../dist/foundations-demos.js';
import {miniDemoPreview,miniDemoScene} from '../dist/symmetry-mini-demos.js';
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),mv=(A,v)=>A.map(row=>dot(row,v));
const mm=(A,B)=>A.map(row=>B[0].map((_,j)=>dot(row,B.map(r=>r[j]))));
const tr=A=>A.reduce((sum,row,i)=>sum+row[i],0);
// Independent trace formula for an l=2 rotation, including a C3 that mixes
// the two cubic E orbitals. Each matrix must preserve all five dimensions.
for(const [operation,theta] of [['identity',0],['C4',Math.PI/2],['C2',Math.PI],['C2x',Math.PI],['C3',2*Math.PI/3]]){
 const D=orbitalMatrix(operation);close(tr(D),1+2*Math.cos(theta)+2*Math.cos(2*theta));
 for(let i=0;i<5;i++)for(let j=0;j<5;j++)close(dot(D.map(r=>r[i]),D.map(r=>r[j])),i===j?1:0);
}
for(const basis of ['xy','xyz','d5'])for(const operation of ['C4','C2','mirror','identity']){
 const a=charactersPreview({basis,operation,basisAngle:0}),b=charactersPreview({basis,operation,basisAngle:31});
 close(a.trace,b.trace);assert.equal(b.matrix.length,{xy:2,xyz:3,d5:5}[basis]);
 if(operation==='mirror')assert.notDeepEqual(a.matrix,b.matrix);
}
// Trace is recovered from an actual atom permutation plus polar-vector block,
// rather than from the scalar values printed in the teaching text.
for(const [operation,expected] of [['identity',9],['C2',-1],['mirror',3],['mirror-yz',1]]){
 const r=waterRepresentation(operation);close(tr(r.matrix),expected);close(tr(r.matrix),r.fixed*tr(r.R));
 const squared=mm(r.matrix,r.matrix);squared.forEach((row,i)=>row.forEach((x,j)=>close(x,i===j?1:0)));
}
const water=waterPreview({mode:'bend',phase:90,amplitude:.3}),mass=[16,1,1],patterns=Object.values(water.massNormalized);
for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(patterns[i].reduce((sum,row,k)=>sum+mass[k]*dot(row,patterns[j][k]),0),i===j?1:0);
for(const pattern of patterns){
 for(let j=0;j<2;j++)close(pattern.reduce((sum,row,i)=>sum+mass[i]*row[j],0),0);
 const center=[0,water.equilibrium[1][1]/9];close(pattern.reduce((sum,row,i)=>{const r=water.equilibrium[i].map((x,j)=>x-center[j]);return sum+mass[i]*(r[1]*row[0]-r[0]*row[1]);},0),0);
}
const projectionCases=[];
for(const irrep of ['A1','A2','E'])for(const row of [0,1])for(const seedSite of [0,1,2]){
 const r=projectionPreview({operation:1,irrep,row,seedSite});projectionCases.push(r);
 for(let j=0;j<3;j++)close(r.weightedImages.reduce((sum,term)=>sum+term.weighted[j],0),r.projected[j]);
 assert.deepEqual(mv(r.projector,r.seed),r.projected);
}
assert.notDeepEqual(projectionCases[0].projected,projectionCases.at(-1).projected);
const partner=projectionPreview({operation:1,irrep:'E',row:1,seedSite:0});
const u=[2,-1,-1].map(x=>x/Math.sqrt(6)),v=[0,1,-1].map(x=>x/Math.sqrt(2));
mv(partner.projector,u).forEach((x,i)=>close(x,v[i]));mv(partner.projector,v).forEach(x=>close(x,0));
// A JT plot point and the corresponding curve use the same Qepsilon. The
// lower sheet cannot be evaluated at Qepsilon=0 while marking a 2D energy.
for(const occupancy of [1,2,3,4])for(const qepsilon of [0,.6,1.5]){
 const p={qtheta:.4,qepsilon,g:1,k:1,occupancy},r=jtPreview(p);
 close(r.slicePoint.lower,.5*(.16+qepsilon*qepsilon)-Math.hypot(.4,qepsilon));
 close(r.slicePoint.occupied,r.potential);
 for(const x of r.sliceMinima){if(Math.abs(x)>1e-10)close(Math.hypot(x,qepsilon),r.minRadius);else assert.ok(Math.abs(qepsilon)>=r.minRadius-1e-10);}
}
const unbroken=miniDemoPreview('vibrations',{delta:0,mix:31}),broken=miniDemoPreview('vibrations',{delta:.4,mix:31,phase:95});
assert.equal(unbroken.isEigenvector,true);assert.equal(broken.isEigenvector,false);
assert.equal(unbroken.spectrum.length,2);assert.equal(broken.spectrum.length,3);
// Central differences test the actual equation of motion, independently of
// the eigenvector formula used to generate the animation.
const t=95*Math.PI/180,h=1e-4,at=x=>miniDemoPreview('vibrations',{delta:.4,mix:31,phase:x*180/Math.PI}).displacement,q=at(t),before=at(t-h),after=at(t+h),Kq=mv(broken.stiffness,q);
q.forEach((x,i)=>close((after[i]-2*x+before[i])/(h*h)+Kq[i],0,5e-7));
const local=miniDemoPreview('vibrations',{detector:'local'}),common=miniDemoPreview('vibrations',{detector:'common'});
assert.deepEqual(local.frequencies,common.frequencies);close(common.intensities[0],1);close(common.intensities[1]+common.intensities[2],0);close(local.intensities.reduce((a,b)=>a+b),1);
for(const theme of ['water','characters','projection','splitting','jt','macro']){
 const output=foundationsDemoScene(theme);assert.doesNotMatch(output.plot+output.html,/NaN|undefined/);assert.ok((output.html.match(/class="fd-step"/g)||[]).length>=4);
}
assert.match(miniDemoScene('vibrations').html,/两两为0/);
Element.prototype.addEventListener=function(type,listener){this['event'+type]=listener;};
Element.prototype.closest=function(selector){for(let e=this;e instanceof Element;e=e.parentNode)if(e.matches(selector))return e;return null;};
const page=new Container();
for(const theme of ['water','characters','projection','splitting','jt','macro']){
 const dispose=await renderFoundationsDemosView({container:page,selection:{experiment:theme},run:()=>assert.fail('A basic lesson must not launch Python')});
 assert.equal(page.querySelectorAll('[data-theme]').length,3);assert.equal(page.querySelector('[data-action="python"]'),null);assert.equal(page.querySelector('.fd-python'),null);
 const param=page.querySelector('[data-param="'+({water:'operation',characters:'basis',projection:'seedSite',splitting:'operation',jt:'qepsilon',macro:'translation'})[theme]+'"]');
 const old=JSON.stringify(getFoundationsDemosResult().result);param.value=({water:'mirror',characters:'d5',projection:'2',splitting:'C3',jt:'1.2',macro:'.8'})[theme];page.firstElementChild.eventchange({target:param});
 assert.notEqual(JSON.stringify(getFoundationsDemosResult().result),old);dispose();
}
for(const file of ['foundations-demos.js','symmetry-mini-demos.js'])assert.doesNotMatch(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),/data-action="python"|<details class="(?:fd|smd)-python"/);
console.log('Foundations redesign: full matrices, weighted projectors, rigid-free orthogonal motions, JT sections, true two-frequency evolution, detector spectra and local interactions passed.');
