import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/python-worker.js',import.meta.url),'utf8');
async function loading(action){
 const fetched=[],packages=[],files=[];
 const runtime={loadPackage:async name=>packages.push(name),FS:{writeFile:(path,body)=>files.push({path,body})},runPython:()=>{}};
 const context={URL,Set,JSON,Error,console,fetch:async url=>{
  const u=new URL(url);fetched.push(u);assert.equal(u.hostname,'symmetry.test');
  return {ok:true,status:200,text:async()=>fs.readFileSync(new URL('../dist/'+u.pathname.replace('/',''),import.meta.url),'utf8')};
 },self:{postMessage:()=>{}},testRuntime:runtime};
 vm.createContext(context);
 vm.runInContext(source.replaceAll('import.meta.url',JSON.stringify('https://symmetry.test/python-worker.js'))+'\nruntime=testRuntime;globalThis.prepareTest=prepare;',context);
 await context.prepareTest('test',action,{});
 return {fetched:fetched.map(u=>u.pathname),versions:fetched.map(u=>u.searchParams.get('v')),packages,files};
}
const supplied=await loading('phonopy_scattering');
assert.deepEqual(supplied.packages,['numpy','pyyaml']);
assert.deepEqual(supplied.fetched,['/python/browser_api.py','/python/phonopy_import.py','/python/phonopy_scattering.py']);
assert.ok(supplied.versions.every(v=>v&&v===supplied.versions[0]));
assert.ok(supplied.files.some(x=>x.path==='/home/pyodide/phonopy_scattering.py'&&x.body.includes('symmetry-lab-phonopy-scattering-1')));
const importer=await loading('phonopy');
assert.deepEqual(importer.packages,['numpy','pyyaml']);assert.deepEqual(importer.fetched,['/python/browser_api.py','/python/phonopy_import.py']);
const chain=await loading('dynamic_scattering_lab');
assert.deepEqual(chain.packages,['numpy']);assert.deepEqual(chain.fetched,['/python/browser_api.py','/python/dynamic_scattering_lab.py']);
for(const old of [importer,chain])assert.ok(!old.fetched.includes('/python/phonopy_scattering.py'));
console.log('Actual Phonopy scattering Worker plan: only the two supplied-mode modules, NumPy and YAML; old importer and chain dependency plans unchanged.');
