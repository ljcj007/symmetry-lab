import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {resolveFormulaEntries,searchDictionary,dictionaryEntryHTML,safeDictionaryHref} from '../dist/formula-dictionary.js';
import {segmentFormula,findInlineMath} from '../dist/math-notation.js';
import katex from '../dist/vendor/katex/katex.mjs';
const d=JSON.parse(fs.readFileSync(new URL('../dist/data/formula-dictionary.json',import.meta.url),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(d.release,'20261029-pathways1');
assert.equal(d.extensionRelease,'20261030-bridges1');
assert.equal(d.principlesRelease,'20261030-symmetry1');
assert.equal(d.constructionRelease,'20261030-construction1');
assert.equal(hash(d.entries.slice(0,94)),'527fd153de9a7a1605722a123144252d3407371de02115076749aa27f92d39be');
assert.equal(hash(d.sources.slice(0,34)),'8bd6b30c9d5d98eb6bad58d087b4cdfde8fcd39b9c1e81c84faf7049699bab28');
assert.ok(d.entries.length>=106);assert.ok(d.sources.length>=39);
assert.equal(new Set(d.entries.map(e=>e.id)).size,d.entries.length);
assert.equal(new Set(d.sources.map(e=>e.id)).size,d.sources.length);
const pairs=[['P_α','salc','salc-character-projector'],['P_mn','salc','salc-partner-projector'],['n_allowed','salc','salc-selection-multiplicity'],['H_copy','salc','salc-schur'],['star(q)','wavevector','wavevector-star'],['H∩T','wavevector','wavevector-translation-index'],['F(q)','wavevector','wavevector-fourier'],['A²/4','wavevector','wavevector-parseval'],['G(k)²','nonsymmorphic','nonsym-square'],['g_±','nonsymmorphic','nonsym-eigenvalues'],['U_T H(k)* U_T†','nonsymmorphic','nonsym-kramers-pairing'],['mτ_z','nonsymmorphic','nonsym-mass']];
for(const [symbol,module,id] of pairs){
 const ids=resolveFormulaEntries(symbol,{route:'#compute/'+module+'-lab'},d).matches.map(e=>e.id);
 assert.ok(ids.includes(id),id+': '+ids.join(','));
 assert.ok(!resolveFormulaEntries(symbol,{route:'#compute/hubbard-cluster-lab'},d).matches.some(e=>e.id===id));
}
let rendered=0;
for(const e of d.entries.slice(94)){
 assert.ok(e.variables.length&&e.variables.every(v=>v.symbol&&v.meaning&&v.unit));
 assert.ok(e.sources.every(id=>d.sources.some(s=>s.id===id)));
 assert.ok(e.links.every(([,url])=>safeDictionaryHref(url)));
 assert.doesNotMatch(dictionaryEntryHTML(e,d),/katex-error|sl-math-error|javascript:|<script/i);
 for(const text of [...e.symbols,...e.variables.map(v=>v.symbol),e.conventions]){
  for(const segment of [...segmentFormula(text),...findInlineMath(text)])if(segment.type==='math'){
   katex.renderToString(segment.tex,{throwOnError:true,strict:'ignore',trust:false});rendered++;
  }
 }
}
for(const term of ['SALC','伙伴投影','允许不等于非零','Schur','平移畴','Parseval','hourglass','直接隙'])assert.ok(searchDictionary(term,d).length,term);
console.log(`Construction dictionary: 12 entries added; original 94 entries/34 sources unchanged; ${rendered} formula segments rendered.`);
