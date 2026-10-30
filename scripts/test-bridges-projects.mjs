import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {bridgesAssignments,bridgesEvidence} from '../dist/bridges-projects.js';
import {physicsPresets} from '../dist/lie-physics-ui.js';
import {parseClassroomRoute} from '../dist/classroom-ui.js';

const json=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const bridgeCatalog=json('dist/data/bridges-materials.json');
const oldCatalog=json('dist/data/pathways-materials.json');
const research=json('dist/data/material-research.json');
const modules=[...bridgeCatalog.modules,...oldCatalog.modules];
const inputPath=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const difference=(a,b)=>Object.keys({...a,...b}).filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key]));
const requests={};

assert.equal(bridgesAssignments.length,4);
assert.equal(new Set(bridgesAssignments.map(x=>x.id)).size,4);
assert.deepEqual(new Set(bridgesAssignments.map(x=>x.module)),new Set(['manybody','polaron','density','workshop']));
for(const assignment of bridgesAssignments){
 assert.equal(assignment.steps.length,3);
 assert.equal(new Set(assignment.steps.map(x=>x.id)).size,3);
 assert.ok(new Set(assignment.steps.map(x=>x.action)).size>=2,'project crosses calculators: '+assignment.id);
 assert.ok(assignment.question.length>20);
 assert.ok(assignment.rubric.length>=3);
 for(const step of assignment.steps){
  assert.ok(step.prompt.length>50);
  assert.ok(Object.keys(step.requires).length>=5);
  const url=new URL(step.route.slice(1),'https://example.test/');
  const route=parseClassroomRoute(step.route.slice(1));
  assert.ok(route,'resolves actual classroom or compute route '+step.route);
  let input;
  if(step.action==='teaching_labs'){
   assert.equal(url.pathname,'/compute/lie/su2_coupling');
   const preset=physicsPresets[url.searchParams.get('preset')];
   assert.ok(preset);
   assert.equal(preset.experiment,'su2_coupling');
   input={lab:'lie',experiment:preset.experiment,...preset.input};
  }else if(step.action==='band_connectivity'){
   assert.equal(url.pathname,'/classroom/crystal');
   assert.equal(url.searchParams.get('module'),'bands');
   assert.equal(url.searchParams.get('tab'),'lab');
   const lesson=research.lessons.find(l=>l.id===url.searchParams.get('lesson'));
   assert.ok(lesson&&lesson.module==='bands');
   // Legacy module has no named preset. The genuine classroom deep-link
   // applies lesson.lab to the same initial form defaults (not compute-only).
   const defaults={model:'c4v',samples:121,beta:1,gamma:.6,eta:0,mixing:0,soc:.6,zeeman:0,hopping:1};
   const source=fs.readFileSync(new URL('../dist/material-research-ui.js',import.meta.url),'utf8');
   assert.ok(source.includes("bands:{model:'c4v',samples:121,beta:1,gamma:.6,eta:0,mixing:0,soc:.6,zeeman:0,hopping:1}"));
   assert.ok(source.includes("if(selection.lesson&&tab==='lab'&&!selection.calculationOnly)Object.assign(forms[module.id],structuredClone(lesson.lab||{}))"));
   input={...defaults,...lesson.lab};
  }else{
   const module=modules.find(m=>m.action===step.action);
   assert.ok(module,step.action+' has a module');
   assert.equal(url.pathname,'/compute/'+module.route);
   const preset=module.presets.find(p=>p.id===url.searchParams.get('preset'));
   assert.ok(preset,'real preset '+step.route);
   input={...Object.fromEntries(module.fields.map(f=>[f.key,f.default])),...preset.input};
  }
  for(const [key,value]of Object.entries(step.requires))assert.deepEqual(inputPath(input,key),value,assignment.id+'/'+step.id+': '+key);
  requests[assignment.id+'/'+step.id]={action:step.action,input};
 }
}

for(const [project,first,second,key]of [
 ['vibration-cloud-reduced-state','free','cloud','coupling'],
 ['spin-coupling-decoherence','exchange','noise','gammaPhi'],
 ['symmetry-to-bands','allowed','inversion','inversion']]){
 assert.deepEqual(difference(requests[project+'/'+first].input,requests[project+'/'+second].input),[key],project+' changes only '+key);
}
for(const field of ['sites','nUp','nDown','boundary','hopping','interactionU','alternatingPotential']){
 const model=Object.values(requests).filter(x=>['hubbard_lab','manybody_spectra_lab'].includes(x.action));
 assert.ok(model.every(x=>x.input[field]===model[0].input[field]),'same Hubbard parameter '+field);
}

if(process.argv.includes('--requests')){process.stdout.write(JSON.stringify(requests));process.exit(0);}
const fixture=json('scripts/fixtures/bridges-projects.json');
assert.equal(fixture.format,'real-python-bridges-project-fixtures');
assert.equal(fixture.sourceHashNormalization,'utf8-lf-v1');
assert.deepEqual(fixture.requests,requests,'regenerate real fixture after changing presets or projects');
for(const [file,expected]of Object.entries(fixture.sourceHashes)){
 const source=fs.readFileSync(new URL('../dist/python/'+file,import.meta.url),'utf8').replace(/\r\n?/g,'\n');
 assert.equal(createHash('sha256').update(source,'utf8').digest('hex'),expected,'regenerate real fixture after '+file+' changes');
}
for(const [key,request]of Object.entries(requests)){
 const output=fixture.results[key];
 assert.ok(output&&typeof output==='object');
 const evidence=bridgesEvidence({...request,result:output});
 assert.equal(typeof evidence,'string');
 assert.ok(evidence.length>30,key);
 assert.doesNotMatch(evidence,/NaN|Infinity|undefined|null/);
}
assert.equal(bridgesEvidence({action:'unrelated',result:{}}),null);
const result=(project,stage)=>fixture.results[project+'/'+stage];
const h=result('levels-to-manybody-spectra','ground'),s=result('levels-to-manybody-spectra','addition'),spin=result('levels-to-manybody-spectra','response');
close(h.ground.energy,(4-Math.sqrt(32))/2);
close(s.initial.energy,h.ground.energy);
close(spin.initial.energy,h.ground.energy);
close(s.sumRules.additionWeight,.5);close(s.sumRules.removalWeight,.5);
close(s.sumRules.discreteWeight,1);
close(spin.sumRules.totalWeight,spin.sumRules.connectedEqualTime);
assert.equal(spin.transitions.length,1);
close(spin.transitions[0].energy,h.gaps.dimerSingletTriplet.gap);
const free=result('vibration-cloud-reduced-state','free'),cloud=result('vibration-cloud-reduced-state','cloud'),classical=result('vibration-cloud-reduced-state','classical');
close(free.ground.energy,-1);close(free.ground.electronicPurity,1);
close(cloud.ground.density[0],.5);close(cloud.ground.density[1],.5);
assert.ok(cloud.ground.electronicPurity<1);
assert.ok(cloud.convergence.converged);
for(const row of classical.stateSnapshots){close(row.purity,.5);close(row.entropyA,1);close(row.negativity,0);}
const cg=result('spin-coupling-decoherence','cg'),exchange=result('spin-coupling-decoherence','exchange'),noise=result('spin-coupling-decoherence','noise');
assert.equal(cg.selected.expansion.length,2);
for(const row of cg.selected.expansion)close(row.probability,.5);
const quarter=exchange.stateSnapshots[40],noisyQuarter=noise.stateSnapshots[40];
close(quarter.time,Math.PI/2);close(quarter.purity,1);close(quarter.negativity,.5);close(quarter.entropyA,1);
assert.ok(noisyQuarter.purity<quarter.purity);
assert.ok(noisyQuarter.negativity<quarter.negativity);
const allowed=result('symmetry-to-bands','allowed'),inversion=result('symmetry-to-bands','inversion'),lattice=result('symmetry-to-bands','lattice');
close(allowed.workshop.coefficients[1][2],1);close(allowed.workshop.coefficients[2][1],-1);
for(const row of inversion.workshop.coefficients.slice(1))for(const value of row)close(value,0);
assert.ok(lattice.validation.timeReversalPresent);assert.ok(lattice.validation.mirrorSymmetryPresent);
for(const crossing of lattice.crossings)close(crossing.gap,0);
assert.ok(lattice.bands[1].energies[60]>lattice.bands[0].energies[60]);
console.log('Bridge projects: 4 templates / 12 actual Python stages, routes, strict preset constraints, evidence and physical links passed.');
