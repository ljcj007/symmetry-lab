import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const root=new URL('../',import.meta.url),target=new URL('dist/scattering-replay-reference.js',root);
const read=name=>fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n');
const fixture=JSON.parse(read('scripts/fixtures/scattering-replay.json'));
assert.equal(fixture.schema,'symmetry-lab-scattering-replay-fixture-1');
assert.equal(fixture.cases.length,7);
for(const [name,hash]of Object.entries(fixture.sourceHashes))assert.equal(crypto.createHash('sha256').update(read(name),'utf8').digest('hex'),hash,name);
const reference={schema:'symmetry-lab-scattering-replay-reference-1',sourceHashEncoding:fixture.sourceHashEncoding,
 sourceHashes:fixture.sourceHashes,cases:fixture.cases.map(row=>{
  assert.equal(row.action,'dynamic_scattering_lab');assert.equal(row.input.includeAmplitudeReplay,true);
  assert.equal(row.result.data.amplitudeReplay.schema,'symmetry-lab-scattering-amplitude-replay-1');
  return{id:row.id,input:row.input,replay:row.result.data.amplitudeReplay};
 })};
// Retain signed zero in genuine complex coordinates as well as every other
// parsed numerical value; ordinary JSON.stringify would change -0 to +0.
const encode=value=>Array.isArray(value)?'['+value.map(encode).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).map(([key,child])=>JSON.stringify(key)+':'+encode(child)).join(',')+'}':Object.is(value,-0)?'-0':JSON.stringify(value);
const text='// Complete input and unmodified ledgers from genuine browser_api.run fixture replies.\nexport const SCATTERING_REPLAY_REFERENCE = '+encode(reference)+';\n';
if(process.argv.includes('--check'))assert.equal(read('dist/scattering-replay-reference.js'),text,'Scattering teaching references are stale.');
else fs.writeFileSync(target,text,'utf8');
console.log(JSON.stringify({cases:reference.cases.length,checked:process.argv.includes('--check'),bytes:Buffer.byteLength(text)}));
