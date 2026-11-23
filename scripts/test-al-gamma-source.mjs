import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const english=process.argv.includes('--english');
const {AL_GAMMA_SOURCE,AL_GAMMA_SCENES,readAlGammaSource}=await import(english?'../dist/en/al-gamma-source.js':'../dist/al-gamma-source.js');

const root=new URL(english?'../dist/en/data/examples/':'../dist/data/examples/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('phonopy-al-abacus-source.json',root),'utf8'));
const load=filename=>readFileSync(new URL(filename,root));
assert.equal(AL_GAMMA_SOURCE.id,manifest.id);
assert.equal(AL_GAMMA_SOURCE.commit,manifest.commit);
assert.equal(AL_GAMMA_SOURCE.license,manifest.license);
assert.equal(AL_GAMMA_SOURCE.lengthUnit,manifest.lengthUnitInBandFile);
assert.equal(AL_GAMMA_SOURCE.frequencyUnit,manifest.exampleEntryFrequencyUnitChoice);
assert.equal(AL_GAMMA_SOURCE.frequencyUnitInBandFile,null);
for(const [file,original] of [[AL_GAMMA_SOURCE.band,manifest],[AL_GAMMA_SOURCE.companion,manifest.companion]]){
 assert.deepEqual(file,{filename:original.localFile,path:original.path,url:original.url,byteCount:original.byteCount,sha256:original.sha256});
}

const expected=[
 {id:'gamma-reciprocal',selected_q:0,selected_band:0,q:[1,1,1],supercell:[1,1,1]},
 {id:'gamma-origin',selected_q:62,selected_band:0,q:[0,0,0],supercell:[1,1,1]},
 {id:'boundary',selected_q:83,selected_band:0,q:[.5,.5,.5],supercell:[2,2,2]},
];
assert.deepEqual(AL_GAMMA_SCENES,expected);
const response=bytes=>({ok:true,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
const basename=url=>url.pathname.split('/').at(-1);
const controller=new AbortController(),requests=[];
const fetcher=async(url,options)=>{
 assert.equal(options.signal,controller.signal);
 const name=basename(url);
 requests.push(name);
 return response(load(name));
};
const ready=await readAlGammaSource({signal:controller.signal,fetcher});
assert.deepEqual(requests,[AL_GAMMA_SOURCE.band.filename,AL_GAMMA_SOURCE.companion.filename]);
assert.deepEqual(ready.sourceEvidence,AL_GAMMA_SOURCE);
for(const scene of expected){
 const input=ready.createInput(scene.id);
 assert.equal(input.preset,'custom');
 assert.equal(input.filename,AL_GAMMA_SOURCE.band.filename);
 assert.equal(input.structure_filename,AL_GAMMA_SOURCE.companion.filename);
 assert.deepEqual(Buffer.from(input.content,'utf8'),load(input.filename));
 assert.deepEqual(Buffer.from(input.structure_content,'utf8'),load(input.structure_filename));
 assert.equal(input.selected_q,scene.selected_q);
 assert.equal(input.selected_band,scene.selected_band);
 assert.deepEqual(input.supercell,scene.supercell);
 assert.equal(input.frequency_unit,'THz');
 assert.equal(input.amplitude,.01);
 assert.equal(input.phase,0);
 assert.equal(input.frequency_tolerance,1e-5);
 assert.equal(input.symprec,1e-5);
 assert.equal('length_unit' in input,false,'The Python payload preserves the original length declaration');
 input.supercell[0]=8;
 assert.deepEqual(ready.createInput(scene.id).supercell,scene.supercell);
}
assert.equal(ready.createInput('incorrect-case'),null);

const pinError=english?/could not be read/:/暂时无法读取/;
for(const ref of [AL_GAMMA_SOURCE.band,AL_GAMMA_SOURCE.companion]){
 const corrupt=async url=>{
  const name=basename(url),bytes=load(name);
  if(name===ref.filename)bytes[0]^=1;
  return response(bytes);
 };
 await assert.rejects(readAlGammaSource({fetcher:corrupt}),pinError,`Reject a same-length modification of ${ref.filename}`);
}
await assert.rejects(readAlGammaSource({fetcher:async url=>response(load(basename(url)).subarray(1))}),pinError);
await assert.rejects(readAlGammaSource({fetcher:async()=>({ok:false})}),english?/could not be loaded/:/暂未载入/);

const abort=new AbortController();
const pending=readAlGammaSource({signal:abort.signal,fetcher:async url=>{
 const reply=response(load(basename(url)));
 return {...reply,arrayBuffer:async()=>{
  abort.abort();
  return reply.arrayBuffer();
 }};
}});
await assert.rejects(pending,{name:'AbortError'},'Abort prevents a late verified draft from being returned');
await assert.rejects(readAlGammaSource({signal:abort.signal,fetcher:()=>assert.fail('Cancelled before fetch')}),{name:'AbortError'});

console.log(`Official Al phonon sources (${english?'English':'Chinese'}): byte identity, three scene inputs, and failure/abort cases passed.`);
