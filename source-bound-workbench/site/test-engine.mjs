import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {verify,parsePacketJSON,Rational,sha256} from './engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const prepare=process.argv.includes('--prepare');
const fixtureRoot=path.join(root,'site','test-data');fs.mkdirSync(fixtureRoot,{recursive:true});
const requests=[];
const fixtures=prepare?{}:JSON.parse(fs.readFileSync(path.join(fixtureRoot,'python-receipts.json'),'utf8'));
function pythonVerify(name){assert.ok(fixtures[name], 'Run node site/test-engine.mjs --prepare and python site/test-python-parity.py before this comparison.');return fixtures[name];}
const results=[];
async function compare(name,p,expected){if(prepare){requests.push({name,packet:p,expected});return;}const j=await verify(p),q=pythonVerify(name);assert.equal(j.status,expected,name);assert.equal(j.status,q.status,name+' status');if(j.source&&q.source){assert.equal(j.source.canonical_sha256,q.source.canonical_sha256,name+' source hash');assert.equal(j.input_sha256,q.input_sha256,name+' input hash');}for(const key of ['trial_full_rank','spectral_counts','symmetry','periodicity'])if(j.checks[key]&&q.checks[key])assert.equal(j.checks[key].status,q.checks[key].status,name+' '+key);if(j.checks.spectral_counts&&q.checks.spectral_counts){assert.equal(j.checks.spectral_counts.vertices_checked,q.checks.spectral_counts.vertices_checked);assert.deepEqual(j.checks.spectral_counts.vertices,q.checks.spectral_counts.vertices,name+' exact vertices and LDL pivots');}if(j.conclusion&&q.conclusion){assert.equal(j.conclusion.gap_lower_bound,q.conclusion.gap_lower_bound);assert.equal(j.conclusion.rank,q.conclusion.rank);assert.deepEqual(j.conclusion.common_interval,q.conclusion.common_interval);}results.push({name,status:j.status});}
const expected={'positive-gap.json':'CERTIFIED','periodic-gap.json':'CERTIFIED','wrong-window.json':'UNRESOLVED','overlap.json':'UNRESOLVED','wrong-symmetry.json':'REJECTED','malformed-source.json':'REJECTED'};
for(const [file,status] of Object.entries(expected)){const text=fs.readFileSync(path.join(root,'examples',file),'utf8');const p=parsePacketJSON(text);await compare(file,p,status);assert.deepEqual(parsePacketJSON(JSON.stringify(p)),p);}
const seed=parsePacketJSON(fs.readFileSync(path.join(root,'examples','positive-gap.json'),'utf8'));
const copy=()=>structuredClone(seed);
let p=copy();p.source.parameters=['x','y','z'];p.source.H_affine=Array.from({length:3},()=>p.source.H_affine[0].map(row=>row.map(v=>v==='1/4'?'1/8':v==='-1/4'?'-1/8':v)));await compare('three-dimensional closed cube',p,'CERTIFIED');
p=copy();delete p.symmetry;p.request.Q_minus=p.request.Q_minus.map(row=>row.map(x=>String(Number(x)*2)));p.request.Q_plus=p.request.Q_plus.map(row=>row.map(x=>String(Number(x)*3)));await compare('nonorthonormal sufficient trial frames',p,'CERTIFIED');
p=copy();delete p.symmetry;p.source.H0[1][1]='-1/2';await compare('strict zero pivot is unresolved',p,'UNRESOLVED');
p=copy();p.periodic_axes=[0];await compare('nonconstant affine period rejected',p,'REJECTED');
p=copy();p.status='CERTIFIED';await compare('caller cannot inject stored status',p,'REJECTED');
p=copy();delete p.symmetry;p.source={id:'coupled-two-state-source',dimension:2,parameters:[],H0:[['-1','2'],['2','1']],H_affine:[]};p.request={rank:1,cuts:{lower:'-1/2',upper:'1/2'},Q_minus:[['1'],['0']],Q_plus:[['0'],['1']]};await compare('off-diagonal coupling retained',p,'CERTIFIED');
assert.throws(()=>parsePacketJSON('{"x":1,"x":2}'),/重复/);assert.throws(()=>parsePacketJSON('{"x":1.0}'),/JSON 数字/);assert.throws(()=>parsePacketJSON('{"x":1e2}'),/JSON 数字/);assert.throws(()=>parsePacketJSON('{"x":9007199254740993}'),/大整数/);assert.throws(()=>parsePacketJSON('{"x":"\\ud800"}'),/Unicode/);
assert.equal(String(Rational.from('-0.125')),'-1/8');assert.equal(String(Rational.from('2/6')),'1/3');assert.throws(()=>Rational.from(0.1));assert.throws(()=>Rational.from('1/0'));
if(prepare){fs.writeFileSync(path.join(fixtureRoot,'packets.json'),JSON.stringify(requests,null,2)+'\n');console.log('Prepared '+requests.length+' comparison packets');process.exit(0);}
console.log(JSON.stringify({status:'PASS',engine:'independent browser BigInt versus Python Fraction',comparisons:results,additional_parser_and_rational_controls:9},null,2));
