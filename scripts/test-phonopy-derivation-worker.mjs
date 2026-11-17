import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/python-worker.js',import.meta.url),'utf8');
async function loading(action){
 const fetched=[],packages=[],files=[];
 const runtime={loadPackage:async name=>packages.push(name),FS:{writeFile:(path,body)=>files.push({path,body})},runPython:()=>{}};
 const context={URL,Set,JSON,Error,console,fetch:async url=>{
  const u=new URL(url);fetched.push(u);assert.equal(u.hostname,'symmetry.test');
  return{ok:true,status:200,text:async()=>fs.readFileSync(new URL('../dist/'+u.pathname.replace('/',''),import.meta.url),'utf8')};
 },self:{postMessage:()=>{}},testRuntime:runtime};
 vm.createContext(context);
 vm.runInContext(source.replaceAll('import.meta.url',JSON.stringify('https://symmetry.test/python-worker.js'))+'\nruntime=testRuntime;globalThis.prepareTest=prepare;',context);
 await context.prepareTest('test',action,{});
 return {fetched:fetched.map(u=>u.pathname),versions:fetched.map(u=>u.searchParams.get('v')),packages,files};
}
const derive=await loading('phonopy_derivation');
assert.deepEqual(derive.packages,['numpy','pyyaml']);
assert.deepEqual(derive.fetched,['/python/browser_api.py','/python/phonopy_import.py','/python/phonopy_scattering.py','/python/symmetry_grading.py','/python/phonopy_derivation.py']);
assert.ok(derive.versions.every(v=>v&&v===derive.versions[0]));
assert.ok(derive.files.some(x=>x.path==='/home/pyodide/phonopy_derivation.py'&&x.body.includes('symmetry-lab-phonopy-derivation-1')));
for(const [action,modules]of [['phonopy_scattering',['phonopy_import','phonopy_scattering']],['phonopy',['phonopy_import']],['dynamic_scattering_lab',['dynamic_scattering_lab']]]){
 const old=await loading(action);assert.deepEqual(old.fetched,['/python/browser_api.py',...modules.map(x=>'/python/'+x+'.py')]);
 assert.ok(!old.fetched.includes('/python/phonopy_derivation.py'));assert.ok(!old.packages.includes('sympy'));
}
console.log('Actual derivation Worker plan: NumPy/YAML and source-bound grading dependencies load on demand; existing expert, importer and chain plans remain independent.');
