import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeDictionaryText,resolveFormulaEntries,searchDictionary,dictionaryEntryHTML,dictionaryNotationHTML,safeDictionaryHref} from '../dist/formula-dictionary.js';
import {segmentFormula,findInlineMath} from '../dist/math-notation.js';
import katex from '../dist/vendor/katex/katex.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/formula-dictionary.json',import.meta.url),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Append-only extension: old entries, source records and release stay intact.
assert.equal(catalog.release,'20261029-pathways1');
assert.equal(catalog.extensionRelease,'20261030-bridges1');
assert.equal(hash(catalog.entries.slice(0,66)),'34fbff48d6f52ab2220b6c1d448e569da217230c1e6ffff55073178eb619cd14');
assert.equal(hash(catalog.sources.slice(0,23)),'cf12e5b6f2083560a01f177dccaddb56abe64d139a848a45b883a04c76d840bf');
const expected=['manybody-lehmann','manybody-spectral-weight','manybody-eta','manybody-U','holstein-coupling','polaron-conditional-displacement','polaron-cutoff','density-matrix','density-purity','density-partial-trace','density-negativity','density-lindblad-rates','density-drive','density-exchange','kp-covariance','kp-axial-spin'];
const additions=expected.map(id=>{const e=catalog.entries.find(e=>e.id===id);assert.ok(e,id);return e;});
assert.equal(new Set(catalog.entries.map(e=>e.id)).size,catalog.entries.length);
const ids=(source,route='',context='')=>resolveFormulaEntries(source,{route,context},catalog).matches.map(e=>e.id);
const routes={manybody:'#compute/manybody-spectra-lab',density:'#compute/density-matrix-lab',polaron:'#compute/polaron-lab',workshop:'#compute/symmetry-workshop'};

assert.ok(ids('A_{iσ}^{+}',routes.manybody).includes('manybody-lehmann'));
assert.ok(ids('w_{fi}',routes.manybody).includes('manybody-spectral-weight'));
assert.ok(ids('U',routes.manybody).includes('manybody-U'));
assert.ok(!ids('U',routes.manybody).includes('U-unitary'));
assert.ok(ids('U','#compute/hubbard-cluster-lab').includes('U-hubbard'));
assert.ok(ids('η',routes.manybody).includes('manybody-eta'));
assert.ok(!ids('η',routes.density).includes('density-lindblad-rates'));
assert.ok(ids('γ',routes.density).includes('density-lindblad-rates'));
assert.ok(!ids('γ',routes.density).includes('gamma-point'));
assert.ok(!ids('Γ',routes.density).includes('density-lindblad-rates'));
assert.ok(ids('Γ','#classroom/crystal').includes('gamma-point'));
assert.notEqual(normalizeDictionaryText('Γ'),normalizeDictionaryText('γ'));
assert.notEqual(normalizeDictionaryText('Ω'),normalizeDictionaryText('ω'));
assert.equal(normalizeDictionaryText(String.raw`\Gamma_{L}`),normalizeDictionaryText('Γ_L'));
assert.equal(normalizeDictionaryText(String.raw`\gamma_{1}`),normalizeDictionaryText('γ_1'));

for(const spelling of ['T_2','T_{2}','T₂']){
 const found=ids(spelling,routes.density);
 assert.ok(found.includes('density-lindblad-rates'),spelling);
 assert.ok(!found.includes('time-reversal'),spelling+' must not be time reversal squared');
}
for(const spelling of ['T^2','T^{2}','T²']){
 const found=ids(spelling,routes.density);
 assert.ok(found.includes('time-reversal'),spelling);
 assert.ok(!found.includes('density-lindblad-rates'),spelling+' must not be a relaxation time');
}
assert.ok(ids('g',routes.polaron).includes('holstein-coupling'));
assert.ok(!ids('Γ',routes.polaron).includes('holstein-coupling'));
assert.ok(!ids('g','#compute/spin-resonance-lab').includes('holstein-coupling'));
assert.ok(resolveFormulaEntries('g',{},catalog).unknown,'A context-free g must not be forced into Holstein');
assert.ok(ids('Ω',routes.density).includes('density-drive'));
assert.ok(!ids('Ω',routes.density).includes('berry-curvature'));
assert.ok(ids('Ω','#compute/quantum-geometry-lab').includes('berry-curvature'));
assert.ok(ids('J',routes.density).includes('density-exchange'));
assert.ok(!ids('J',routes.density).includes('J-angular'));
assert.ok(ids('J','#compute/local-multiplet-lab').includes('J-hund'));
assert.ok(ids('P',routes.density).includes('density-purity'));
assert.ok(!ids('P','#compute/phase').includes('density-purity'));
assert.ok(ids('ρ_A',routes.density).includes('density-partial-trace'));
assert.ok(ids('N(ρ)',routes.density).includes('density-negativity'));
assert.ok(ids('N_{max}',routes.polaron).includes('polaron-cutoff'));
assert.ok(ids('⟨n_i X_j⟩',routes.polaron).includes('polaron-conditional-displacement'));
assert.ok(ids('H(Rk)',routes.workshop).includes('kp-covariance'));
assert.ok(ids('det(R)R',routes.workshop).includes('kp-axial-spin'));
for(const query of ['Holstein','谱权重','Lehmann','negativity','部分迹','对称约束','纯度','退相干'])assert.ok(searchDictionary(query,catalog).length,query);

let mathSegments=0;
for(const entry of additions){
 assert.ok(entry.variables.length&&entry.variables.every(v=>v.symbol&&v.meaning&&v.unit));
 assert.ok(entry.sources.every(id=>catalog.sources.some(s=>s.id===id)));
 assert.ok(entry.links.every(([,url])=>safeDictionaryHref(url)));
 for(const compact of [false,true]){
  const html=dictionaryEntryHTML(entry,catalog,{compact});
  assert.doesNotMatch(html,/katex-error|class="sl-math-error"|<script|javascript:/i,entry.id);
  assert.match(html,/<math/,entry.id+' must retain accessible mathematical output');
 }
 for(const text of [...entry.symbols,...entry.variables.map(v=>v.symbol)]){
  for(const segment of segmentFormula(text))if(segment.type==='math'){
   const html=katex.renderToString(segment.tex,{throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml'});
   assert.match(html,/<math/);mathSegments++;
  }
 }
 for(const text of [entry.definition,entry.conventions,entry.conditions,...entry.variables.flatMap(v=>[v.meaning,v.unit])]){
  for(const segment of findInlineMath(text))if(segment.type==='math'){
   katex.renderToString(segment.tex,{throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml'});mathSegments++;
  }
 }
}
assert.match(dictionaryNotationHTML('T_2',{symbol:true}),/<msub>/);
assert.match(dictionaryNotationHTML('T²',{symbol:true}),/<msup>/);
assert.match(dictionaryNotationHTML('ρ^{T_B}',{symbol:true}),/<msup>[\s\S]*<msub>/);
assert.match(dictionaryNotationHTML('A_{iσ}^{+}',{symbol:true}),/<msubsup>/);
console.log(`Bridges dictionary: ${additions.length} new entries, original 66 entries/23 sources preserved, Greek case and T subscript/square disambiguation, ${mathSegments} rendered math segments passed.`);
