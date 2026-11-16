import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {mathNotationVersion,findInlineMath,normalizeMath} from '../dist/math-notation.js';

const root=new URL('../',import.meta.url);
const bytes=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
assert.equal(mathNotationVersion,'20261116-prose3');
const cases=bytes('scripts/test-math-prose-boundaries.mjs').toString().match(/const cases=\[([\s\S]*?)\n\];/);
assert.ok(cases);
const sourceCases=[...cases[1].matchAll(/(?:^|\n)\s*(?:"id"|id)\s*:/g)].length;
assert.equal(sourceCases,41);
for(const [source,word]of [['C†. Do not infer the direction.','Do'],['Sum n₁ + n₂ + n₃ = 3','Sum'],['C4v two-state model','two-state']]){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);
 assert.ok(parts.some(p=>p.type==='math'));
 assert.ok(parts.every(p=>p.type!=='math'||!p.source.includes(word)));
}
assert.equal(normalizeMath('Do'),'Do');assert.equal(normalizeMath('Sum'),'Sum');
const files=['GOAL-ROADMAP.md','package.json','dist/index.html','dist/app.js',
 'dist/math-display.js','dist/math-notation.js','dist/math-svg.js','dist/crystal-notation.js',
 'dist/crystal-symbol-data.js','dist/math-display.css','dist/su3-basis-ui.js',
 'dist/data/lie-group-lessons.json','dist/data/symmetry-course-lessons.json','dist/docs/symmetry-course.md',
 'scripts/test-math-prose-boundaries.mjs','scripts/test-math-prose-dom.mjs','scripts/test-math-notation.mjs',
 'scripts/test-math-display.mjs','scripts/test-math-catalog.mjs','scripts/test-math-svg.mjs',
 'scripts/test-crystal-inline.mjs','scripts/test-crystal-notation-catalog.mjs',
 'scripts/build-prose-math-provenance.mjs','scripts/english-catalog.mjs','scripts/english-source.mjs',
 'scripts/build-english.mjs','scripts/refresh-english-provenance.py','scripts/package-source.py',
 'scripts/test-source-package.py','locales/en-prose-coordinate-labels.json'];
const record={schemaVersion:1,release:'20261116-prose3',sourceHashNormalization:'utf8-lf-v1',
 scope:'Shared inline prose/mathematics boundaries and explicit English coordinate labels.',
 counts:{actualSourceSemanticCases:sourceCases,newDOMRendererRegressionFiles:1,coordinateTranslationCorrections:3,
         extractedSourceNodeBuilders:17},
 contract:{presentation:'Only discovery of mixed prose and scientific notation changes. Explicit normalization remains independent of ordinary-word detection.',
  boundaries:'Short ordinary words, contractions, compounds and proper names stay prose; complete scripts, calls, coordinates, ket labels and typed crystal atoms remain intact.',
  coordinates:'English old/new labels explicitly retain their subscripts. Correcting notation in a distractor does not change the original question answer.',
  raw:'Input fields, code, source identifiers, imported/raw data and numerical calculations retain their existing treatment.',
  source:'Every discovered fragment retains its exact source characters and can reconstruct the original record title.',
  scope:'Actual-source semantic tests, both real renderer modules and preserved scientific examples are checked. Successful KaTeX syntax alone is not a proof of all possible prose or formula meanings.'},
 verification:['Semantic expectations read actual published JSON, static JS fragments, documentation and the runtime English message dictionary.',
  'The production shared and generated English renderers are exercised through a small DOM test double; native desktop/mobile checks remain separate.',
  'Existing explicit-formula, MathML, chemical, typed crystallographic, source-preservation and opaque-input checks remain required.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const raw=bytes(name);return[name,{normalization:'utf8-lf-v1',bytes:raw.length,sha256:sha(raw)}];}))};
const target=new URL('dist/data/prose-math-provenance.json',root),body=JSON.stringify(record,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Prose/math provenance is stale');
else fs.writeFileSync(target,body);
console.log('Prose/math boundaries:',JSON.stringify(record.counts));
