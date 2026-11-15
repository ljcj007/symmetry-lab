import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real resource/package loader with a controlled Python transport.
// Numerical correctness is checked separately through the actual Python API.
const source=fs.readFileSync(new URL('../dist/python-worker.js',import.meta.url),'utf8');
async function loading(payload){
 const fetched=[],packages=[],messages=[],files=[];
 const runtime={loadPackage:async name=>packages.push(name),
  FS:{writeFile:(path,body)=>files.push({path,body})},runPython:()=>{}};
 const context={URL,Set,JSON,Error,console,
  fetch:async url=>{const u=new URL(url);fetched.push(u);assert.equal(u.hostname,'symmetry.test');
   return {ok:true,status:200,text:async()=>fs.readFileSync(new URL('../dist/'+u.pathname.replace('/',''),import.meta.url),'utf8')};},
  self:{postMessage:message=>messages.push(message)},testRuntime:runtime};
 vm.createContext(context);
 vm.runInContext(source.replaceAll('import.meta.url',JSON.stringify('https://symmetry.test/python-worker.js'))+
  '\nruntime=testRuntime;globalThis.prepareTest=prepare;',context);
 await context.prepareTest(17,'teaching_labs',payload);
 return {fetched:fetched.map(u=>u.pathname),versions:fetched.map(u=>u.searchParams.get('v')),packages,messages,files};
}
const spin=await loading({lab:'spin_actions',experiment:'color_theta'});
assert.deepEqual(spin.packages,['sympy']);
assert.ok(spin.fetched.includes('/python/spin_actions_lab.py'));
assert.ok(spin.files.some(x=>x.path==='/home/pyodide/spin_actions_lab.py'&&x.body.includes('def color_theta')));
assert.ok(spin.versions.every(v=>v&&v===spin.versions[0]),'Every fetched module uses the current worker build');
const momentum=await loading({lab:'antitranslation',k:['1/4','0','0'],spinful:true});
assert.deepEqual(momentum.packages,['sympy']);
assert.ok(momentum.fetched.includes('/python/antitranslation_lab.py'));
assert.ok(momentum.files.some(x=>x.path==='/home/pyodide/antitranslation_lab.py'&&x.body.includes('symmetry-lab-antitranslation-1')));
assert.ok(!momentum.fetched.includes('/python/spin_actions_lab.py'),'The two optional exact modules load independently');
assert.ok(!spin.fetched.includes('/python/antitranslation_lab.py'));
const composition=await loading({lab:'composition',first:'R',second:'M',point:[1,2],candidateSet:['E','R']});
assert.deepEqual(composition.packages,[],'The bounded integer composition core needs no numerical package');
assert.ok(composition.fetched.includes('/python/composition_lab.py'));
assert.ok(composition.files.some(x=>x.path==='/home/pyodide/composition_lab.py'&&x.body.includes('symmetry-lab-composition-1')));
for(const original of [spin,momentum])assert.ok(!original.fetched.includes('/python/composition_lab.py'));
assert.ok(!composition.fetched.includes('/python/spin_actions_lab.py'));
assert.ok(!composition.fetched.includes('/python/antitranslation_lab.py'));
for(const payload of [{lab:'spinor',initialState:'plus',axis:'z'},
 {lab:'color_group',preset:'c3_point',steps:3,variant:'combined'},
 {lab:'spin_group',preset:'af_space',steps:4,variant:'combined'}]){
 const old=await loading(payload);
 assert.deepEqual(old.packages,[],'Existing finite teaching models keep their dependency plan');
 assert.ok(!old.fetched.includes('/python/spin_actions_lab.py'),'An unrelated experiment must not fetch the new optional core');
 assert.ok(!old.fetched.includes('/python/antitranslation_lab.py'));
 assert.ok(!old.fetched.includes('/python/composition_lab.py'));
}
const exact=await loading({lab:'lie',experiment:'su3_ninej'});
assert.deepEqual(exact.packages,['numpy','sympy']);
assert.ok(exact.fetched.includes('/python/su3_ninej.py'));
assert.ok(!exact.fetched.includes('/python/spin_actions_lab.py'));
assert.ok(!exact.fetched.includes('/python/composition_lab.py'));
console.log('Spin actions Worker: actual conditional package/resource loader, current module versions and unchanged finite/9j dependency plans passed.');
