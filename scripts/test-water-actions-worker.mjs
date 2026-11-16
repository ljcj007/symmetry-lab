import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the production dependency selector. The independent Python tests
// exercise the real public calculation; this test inspects loading isolation.
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
 await context.testPrepare(73,action,payload);
 return {paths:fetched.map(u=>u.pathname),versions:fetched.map(u=>u.searchParams.get('v')),packages,written};
}
const water=await load('water_actions');
assert.deepEqual(water.paths,['/python/browser_api.py','/python/water_actions.py']);
assert.deepEqual(water.packages,[],'Integer displacement actions require only the Python standard library');
assert.ok(water.written.some(x=>x.path==='/home/pyodide/water_actions.py'&&x.body.includes('symmetry-lab-water-actions-1')));
assert.ok(water.versions.every(v=>v&&v===water.versions[0]));
for(const action of ['group_theorems','foundations_demos','symmetry_mini_demos']){
 const original=await load(action);
 assert.deepEqual(original.paths,['/python/browser_api.py','/python/'+action+'.py']);
 assert.deepEqual(original.packages,[]);
 assert.ok(!original.paths.includes('/python/water_actions.py'));
}
const old=await load('teaching_labs',{lab:'composition',first:'R',second:'M',point:[1,2],candidateSet:['E','R']});
assert.deepEqual(old.packages,[]);
assert.ok(old.paths.includes('/python/composition_lab.py'));
assert.ok(!old.paths.includes('/python/water_actions.py'));
console.log('Water action loader: isolated standard-library plan and unchanged existing demo dependencies passed.');
