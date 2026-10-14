import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseTrace,matchTraceOperations,charactersForAnalysis} from '../dist/trace-parser.js';
import {analyzeGroup,decomposeCharacters,decomposeCorepresentationCharacters} from '../dist/engine.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const mag=JSON.parse(read('dist/data/magnetic-groups.json')).groups;
const ordinary=JSON.parse(read('dist/data/space-groups.json')).groups;
const text=read('dist/examples/trace-msg.txt');
const trace=parseTrace(text);
assert.equal(trace.format,'magvasp2trace');
assert.equal(trace.nelec,36);
assert.equal(trace.soc,1);
assert.equal(trace.nk,1);
assert.equal(trace.bandCount,4);
assert.equal(trace.kpoints[0].bands.length,2);
assert.deepEqual(trace.kpoints[0].bands.map(b=>b.index),[1,3]);
assert.deepEqual(trace.kpoints[0].bands.map(b=>b.energy),[-11.456165,-0.945275]);
assert.deepEqual(trace.kpoints[0].bands[0].characters[0],[2,0]);
const group=mag.find(g=>g.id==='166.101');
const mapped=matchTraceOperations(trace,group);
assert.equal(mapped.operationMap.length,12);
assert.equal(mapped.mapping.filter(m=>m.spinSign===-1).length,2);
assert.deepEqual(mapped.kpoints[0].bands[0].characters[0],[2,0]);
assert.throws(()=>matchTraceOperations(trace,mag.find(g=>g.id==='1.1')),/无法唯一匹配/);
const computed=analyzeGroup({operations:group.operations,basis:group.basis,k:mapped.kpoints[0].k,doubleValued:true});
for (const band of mapped.kpoints[0].bands) {
  const decomposition=decomposeCharacters(charactersForAnalysis(mapped.kpoints[0],band,computed),computed.irreps);
  assert.equal(decomposition.dimension,band.degeneracy);
  assert(decomposition.reconstructionError<1e-8);
  const magneticDecomposition=decomposeCorepresentationCharacters(charactersForAnalysis(mapped.kpoints[0],band,computed),computed.corepresentations);
  assert.equal(magneticDecomposition.dimension,band.degeneracy);
  assert(magneticDecomposition.reconstructionError<1e-8);
}

// Real ordinary-format fixture from upstream readVasp2trace examples.
const sgtrace=parseTrace(read('scripts/fixtures/trace-sg186.txt'));
assert.equal(sgtrace.format,'vasp2trace');
assert.equal(sgtrace.nsym,12);
assert.equal(sgtrace.bandCount,4);
assert(sgtrace.operations.every(o=>!o.antiunitary));
// Its Cartesian spin frame requires explicit conversion in the upstream workflow.
assert.throws(()=>matchTraceOperations(sgtrace,ordinary.find(g=>g.number===186)),/自旋矩阵/);

// Equivalent Seitz representative shifts must correct the Bloch phase.
const translated=structuredClone(trace);
translated.operations[0].translation[0]+=1;
translated.kpoints[0].k=[0.25,0,0];
const translatedMatch=matchTraceOperations(translated,group);
assert(Math.abs(translatedMatch.kpoints[0].bands[0].characters[0][0])<1e-10);
assert(Math.abs(translatedMatch.kpoints[0].bands[0].characters[0][1]-2)<1e-10);

// Opposite spin lift reverses spinful characters.
const spinLift=structuredClone(trace);
spinLift.operations[0].spinRotation=spinLift.operations[0].spinRotation.map(row=>row.map(z=>z.map(x=>-x)));
assert.equal(matchTraceOperations(spinLift,group).kpoints[0].bands[0].characters[0][0],-2);

const point=mapped.kpoints[0],band=point.bands[0];
const order=[...point.operationIndices].reverse();
const ordered=charactersForAnalysis(point,band,{littleGroup:{sourceIndices:order,unitaryIndices:order.map((_,i)=>i)}});
assert.deepEqual(ordered,[...band.characters].reverse());
assert.throws(()=>charactersForAnalysis(point,band,{littleGroup:{sourceIndices:[100],unitaryIndices:[0]}}),/缺少/);

assert.throws(()=>parseTrace(text,{maxBytes:100}),/超过/);
assert.throws(()=>parseTrace(text.replace('-11.456165','NaN')),/非数值/);
assert.throws(()=>parseTrace(text.split('\n').slice(0,12).join('\n')),/缺失/);
assert.throws(()=>parseTrace(text.replace(/\n\s*3\s+2\s+-0.945275/, '\n 4 2 -0.945275')),/连续/);
assert.deepEqual(parseTrace(text.replace('2.000000','2.000000D+00')).kpoints[0].bands[0].characters[0],[2,0]);
console.log('Trace parser: real magnetic/ordinary fixtures, BC operation matching, spin lifts, Bloch phases, ordering, and malformed-input checks passed.');
