import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const base='dist/data/examples/quartz-298k/';
const filenames=['9005017.cif','quartz-active-inversion.vasp','quartz-passive-rebasis.vasp','source.json'];
const copy=filename=>readFileSync(new URL(filename,root));
const sha=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const check=process.argv.includes('--check');
const source=JSON.parse(copy(base+'source.json'));
const original=copy(base+source.file.name);
assert.equal(source.codRevision,291351);
assert.equal(source.license,'CC0-1.0');
assert.equal(original.length,source.file.bytes);
assert.equal(sha(original),source.file.sha256);
assert.equal(sha(Buffer.concat([Buffer.from(`blob ${original.length}\0`),original]),'sha1'),source.file.gitBlobSha1);
if(check)for(const filename of filenames)assert.deepEqual(copy('dist/en/data/examples/quartz-298k/'+filename),copy(base+filename));

const binary=new Set(filenames.map(filename=>base+filename));
const paths=[...binary,'.gitattributes','package.json','dist/app.js','dist/classroom-ui.js','dist/frontiers-ui.js','dist/structure-ui.js',
  'dist/quartz-structure-practice.js','dist/crystkit-handedness-ui.js','dist/research-ui.js','dist/navigation-ui.js','dist/tool-finder.js',
  'dist/docs/quartz-handedness.md','dist/python/structure_bc.py','locales/en-quartz-structure.json','locales/en-quartz-lesson.json',
  'locales/en-crystkit-handedness.json','scripts/build-quartz-handedness.py','scripts/build-quartz-handedness-provenance.mjs',
  'scripts/test-quartz-lesson.mjs','scripts/test-quartz-catalog-ui.mjs','scripts/test-cif-setting-practice.mjs','scripts/test-python-crystkit.py'];
const files=Object.fromEntries(paths.sort().map(filename=>{
  const raw=copy(filename);
  const bytes=binary.has(filename)?raw:Buffer.from(raw.toString('utf8').replace(/\r\n?/g,'\n'));
  return [filename,{normalization:binary.has(filename)?'binary':'utf8-lf-v1',bytes:bytes.length,sha256:sha(bytes)}];
}));
const manifest={schemaVersion:1,source,files,
  controls:{original:{group:154,hall:443,sites:9,screw:'2/3'},active:{group:152,hall:441,sites:9,screw:'1/3'},
    passive:{group:154,hall:443,sites:9,screw:'2/3'}},
  routes:['#structure?quartz-hand=practice','#crystkit?preset=quartz-handedness','#classroom/observables?module=chirality&lesson=chiral-mirror',
    '#atlas/frontiers?module=chirality&material=quartz-analogy']};
const output='dist/data/quartz-handedness-provenance.json';
if(check)assert.deepEqual(JSON.parse(copy(output)),manifest,'Quartz provenance is stale');
else writeFileSync(new URL(output,root),JSON.stringify(manifest,null,2)+'\n');
console.log('Quartz original bytes, controls and source dependencies verified.');
