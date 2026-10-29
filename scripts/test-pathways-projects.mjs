import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {mathHTML} from '../dist/math-display.js';
import {segmentFormula} from '../dist/math-notation.js';
import {pathwaysAssignments,pathwaysEvidence} from '../dist/pathways-projects.js';

const spinSource='⟨S_1·S_2⟩';
assert.ok(JSON.stringify(pathwaysAssignments).includes(spinSource));
const spinMarkup=segmentFormula(spinSource).filter(s=>s.type==='math').map(s=>mathHTML(s.tex)).join('');
assert.equal((spinMarkup.match(/<msub>/g)||[]).length,2,'both site indices must remain subscripts');

const json=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const catalog=json('dist/data/pathways-materials.json');
const geometry=json('dist/data/quantum-geometry-content.json');
const multiplet=json('dist/data/local-multiplet-content.json');
const modules=[...catalog.modules,...geometry.modules,...multiplet.modules];
const groups=json('dist/data/space-groups.json').groups;
const atPath=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
const requests={};

assert.equal(pathwaysAssignments.length,4);
assert.deepEqual(new Set(pathwaysAssignments.map(x=>x.module)),new Set(['bandrep','scattering','domainwall','hubbard']));
assert.equal(new Set(pathwaysAssignments.map(x=>x.id)).size,4);
for(const assignment of pathwaysAssignments){
 assert.ok(assignment.question.length>15);
 assert.ok(assignment.rubric.length>=3);
 assert.equal(assignment.steps.length,3);
 assert.ok(new Set(assignment.steps.map(s=>s.action)).size>=2,assignment.id+' crosses real calculators');
 assert.equal(new Set(assignment.steps.map(s=>s.id)).size,assignment.steps.length);
 for(const step of assignment.steps){
  assert.ok(step.prompt.length>50);
  assert.ok(Object.keys(step.requires).length>=3);
  const url=new URL(step.route.slice(1),'https://example.test/');
  let input;
  if(step.action==='analyze'){
   assert.equal(url.pathname,'/workbench');
   const group=groups.find(g=>g.number===Number(url.searchParams.get('sg')));
   assert.ok(group,'workbench points to a real catalogue group');
   input={operations:group.operations,basis:group.basis,k:['kx','ky','kz'].map(k=>Number(url.searchParams.get(k))),doubleValued:false,group_number:group.number};
   assert.equal(step.requires.group_number,4);
   assert.equal(step.requires['k.0'],0);assert.equal(step.requires['k.1'],0);assert.equal(step.requires['k.2'],.5);
   assert.equal(step.requires.doubleValued,false);
  }else if(step.action==='phonon_thermo'){
   assert.equal(url.pathname,'/compute/phonon-thermo');
   input={source:'compare',natom:2,theta_e:400,theta_d:500,t_min:0,t_max:1000,t_step:20};
   for(const word of ['400','500','1000','20','默认'])assert.ok(step.prompt.includes(word));
  }else{
   const module=modules.find(m=>m.action===step.action);
   assert.ok(module,'real module for '+step.action);
   assert.equal(url.pathname,'/compute/'+module.route);
   const preset=module.presets.find(p=>p.id===url.searchParams.get('preset'));
   assert.ok(preset,'live preset '+step.route);
   input={...Object.fromEntries((module.fields||[]).map(f=>[f.key,f.default])),...preset.input};
  }
  // Compare constraints with inputs actually produced by the live route/preset,
  // including the app's genuine flat group_number and nested k array contract.
  for(const [path,value]of Object.entries(step.requires))assert.deepEqual(atPath(input,path),value,assignment.id+'/'+step.id+': '+path);
  requests[assignment.id+'/'+step.id]={action:step.action,input};
 }
}

const difference=(a,b)=>Object.keys({...a,...b}).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
const byModule=Object.fromEntries(pathwaysAssignments.map(a=>[a.module,a]));
for(const [module,key]of [['scattering','temperature'],['domainwall','onsite'],['hubbard','interactionU']]){
 const stages=byModule[module].steps;
 assert.deepEqual(difference(stages[1].requires,stages[2].requires),[key],module+' comparison changes only '+key);
 const a=requests[byModule[module].id+'/'+stages[1].id].input,b=requests[byModule[module].id+'/'+stages[2].id].input;
 assert.deepEqual(difference(a,b),[key],module+' live presets keep all other fields fixed');
}

// Emit exact current requests for the separate Python fixture builder. Running
// Python as a first-class test command also works where Node child spawning is
// unavailable. No fixture values or student explanation grades are invented.
if(process.argv.includes('--requests')){process.stdout.write(JSON.stringify(requests));process.exit(0);}
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/pathways-projects.json',import.meta.url),'utf8'));
assert.deepEqual(fixture.requests,requests,'rebuild project fixtures after any template/preset change');
assert.equal(fixture.sourceHashNormalization,'utf8-lf-v1');
// Match Python's universal-newline UTF-8 normalization exactly. Only line
// endings are canonicalized: source edits and other whitespace stay detectable.
const sourceHash=text=>createHash('sha256').update(text.replace(/\r\n?/g,'\n'),'utf8').digest('hex');
assert.equal(sourceHash('# 中文\r\nvalue = 1\r\n'),sourceHash('# 中文\nvalue = 1\n'));
assert.equal(sourceHash('# 中文\rvalue = 1\r'),sourceHash('# 中文\nvalue = 1\n'));
assert.notEqual(sourceHash('value = 1\n'),sourceHash('value = 2\n'));
assert.notEqual(sourceHash('value = 1\n'),sourceHash('value = 1 \n'));
for(const [name,hash]of Object.entries(fixture.sourceHashes)){
 const actual=sourceHash(fs.readFileSync(new URL('../dist/python/'+name,import.meta.url),'utf8'));
 assert.equal(actual,hash,'rebuild real Python fixtures after changing '+name);
}
const result=(project,stage)=>fixture.results[project+'/'+stage];
for(const [key,request]of Object.entries(fixture.requests)){
 const output=fixture.results[key];
 assert.ok(output&&typeof output==='object',key+' returns a real result');
 const summary=pathwaysEvidence({...request,result:output});
 assert.equal(typeof summary,'string');assert.ok(summary.length>30);
 assert.doesNotMatch(summary,/NaN|Infinity|undefined|null/);
 assert.doesNotThrow(()=>JSON.stringify(output));
}
assert.equal(pathwaysEvidence({action:'unrelated',result:{}}),null);

const sg0=result('site-bloch-little-group','gamma'),sgZ=result('site-bloch-little-group','boundary'),little=result('site-bloch-little-group','little');
for(const r of [sg0,sgZ]){assert.equal(r.orbitDimension,2);assert.equal(r.site.positions.length,2);assert.ok(r.checks.passed);assert.equal(r.decomposition.terms.reduce((s,t)=>s+t.dimension*t.multiplicity,0),2);}
assert.deepEqual(sg0.k,[0,0,0]);assert.deepEqual(sgZ.k,[0,0,.5]);
for(const v of sg0.screw.selectedEigenvalues){close(Math.abs(v.re),1);close(v.im,0);}
for(const v of sgZ.screw.selectedEigenvalues){close(v.re,0);close(Math.abs(v.im),1);}
assert.ok(little.validation.passed);assert.deepEqual(little.irreps.map(r=>r.dimension),[1,1]);
const screwIndex=little.littleGroup.unitaryOperations.findIndex(o=>o.name==='C2z');
close(little.littleGroup.unitaryFactors[screwIndex][screwIndex].re,-1);
assert.deepEqual(little.irreps.map(r=>Math.round(r.characters[screwIndex].im)).sort(),[-1,1]);

const thermal=result('bose-scattering','thermal'),cold=result('bose-scattering','cold'),warm=result('bose-scattering','warm');
assert.equal(thermal.summary.expectedModeCount,6);
assert.deepEqual(thermal.series.map(r=>r.id),['einstein','debye']);
for(const s of thermal.series){assert.ok(s.zeroPointEnergy>0);assert.equal(s.rows[0].heatCapacity,0);assert.ok(s.rows.find(r=>r.temperature===300).heatCapacity>0);}
for(const [i,c]of cold.data.selection.groups.entries()){
 const w=warm.data.selection.groups[i];close(c.energy,w.energy);close(c.bareWeight,w.bareWeight);assert.equal(c.antiStokesWeight,0);
 if(!c.excluded&&c.bareWeight>0){assert.ok(w.antiStokesWeight>0);close(w.antiStokesWeight/w.stokesWeight,Math.exp(-w.energy/(.08617333262145*300)));}
}

const bulk=result('bulk-interface-localization','bulk'),wallResult=result('bulk-interface-localization','wall'),potential=result('bulk-interface-localization','potential');
close(Math.abs(bulk.topology.value),Math.PI,1e-8);close(bulk.topology.analyticDirectGap,.8);
close(wallResult.chain.hoppings[0],.6,1e-10);close(wallResult.chain.hoppings[1],1,1e-10);
assert.equal(wallResult.checks.chiralResidual,0);close(potential.checks.chiralResidual,.8);
assert.ok(wallResult.chain.subspaceCount>0);
close(wallResult.chain.subspaceDensity.reduce((a,b)=>a+b,0),wallResult.chain.subspaceCount,1e-10);
assert.deepEqual(wallResult.chain.hoppings,potential.chain.hoppings);
close(potential.spectrum.energies.reduce((a,b)=>a+b,0),.8,1e-10);

const hund=result('hund-superexchange','hund'),d4=result('hund-superexchange','dimer'),d12=result('hund-superexchange','strong');
assert.deepEqual(hund.ground.spins,[1]);close(hund.ground.S2,2);
for(const [r,U]of [[d4,4],[d12,12]]){
 assert.ok(r.checks.passed);assert.equal(r.sector.dimension,4);close(r.ground.totalSpinSquared,0);
 close(r.gaps.dimerSingletTriplet.gap,(Math.sqrt(U*U+16)-U)/2);
 assert.ok(r.ground.nearestSpinCorrelation<0);
}
assert.ok(d12.ground.averageDoubleOccupancy<d4.ground.averageDoubleOccupancy);
assert.ok(d12.gaps.dimerSingletTriplet.gap<d4.gaps.dimerSingletTriplet.gap);
assert.ok(d12.gaps.chargeGap>d4.gaps.chargeGap);
const relativeError=r=>Math.abs(r.gaps.dimerSingletTriplet.strongCouplingEstimate/r.gaps.dimerSingletTriplet.gap-1);
assert.ok(relativeError(d12)<relativeError(d4));
console.log('4 cross-module projects / 12 live presets or explicit inputs passed; real Python outputs, phase/Bose/interface/superexchange evidence verified.');
