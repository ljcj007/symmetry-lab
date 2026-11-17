import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real production dependency plan. Real API and mathematical
// behavior are verified by the independent Python and renderer tests.
const source=fs.readFileSync(new URL('../dist/python-worker.js',import.meta.url),'utf8');
async function load(action,payload={}){
 const fetched=[],packages=[],written=[];
 const runtime={loadPackage:async name=>packages.push(name),
  FS:{writeFile:(path,body)=>written.push({path,body})},runPython:()=>{}};
 const context={URL,Set,JSON,Error,console,testRuntime:runtime,
  self:{postMessage:()=>{}},fetch:async url=>{
   const parsed=new URL(url);assert.equal(parsed.hostname,'symmetry.test');fetched.push(parsed);
   return {ok:true,text:async()=>fs.readFileSync(new URL('../dist/'+parsed.pathname.slice(1),import.meta.url),'utf8')};
  }};
 vm.createContext(context);
 vm.runInContext(source.replaceAll('import.meta.url',JSON.stringify('https://symmetry.test/python-worker.js'))+
  '\nruntime=testRuntime;globalThis.testPrepare=prepare;',context);
 await context.testPrepare(83,action,payload);
 return {paths:fetched.map(u=>u.pathname),versions:fetched.map(u=>u.searchParams.get('v')),packages,written};
}
const representation=await load('representation_actions',{point:[1,2]});
assert.deepEqual(representation.paths,['/python/browser_api.py','/python/representation_actions.py']);
assert.deepEqual(representation.packages,[],'The bounded integer and rational representation model requires only the standard library');
assert.ok(representation.written.some(x=>x.path==='/home/pyodide/representation_actions.py'&&x.body.includes('symmetry-lab-representation-actions-1')));
assert.ok(representation.versions.every(v=>v&&v===representation.versions[0]));
for(const action of ['group_theorems','foundations_demos','symmetry_mini_demos','water_actions']){
 const original=await load(action);
 assert.deepEqual(original.paths,['/python/browser_api.py','/python/'+action+'.py']);
 assert.deepEqual(original.packages,[]);
 assert.ok(!original.paths.includes('/python/representation_actions.py'));
}
const old=await load('teaching_labs',{lab:'composition',first:'R',second:'M',point:[1,2],candidateSet:['E','R']});
assert.deepEqual(old.packages,[]);
assert.ok(old.paths.includes('/python/composition_lab.py'));
assert.ok(!old.paths.includes('/python/representation_actions.py'));
console.log('Representation action loader: isolated standard-library module, coherent version, unchanged water and existing finite demo dependencies passed.');
