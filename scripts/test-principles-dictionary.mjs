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
assert.equal(hash(d.entries.slice(0,82)),'7d60b27b06de45954cf2684b397eff2e2303bc236a5d823f99225bd09d3800a6');
assert.equal(hash(d.sources.slice(0,30)),'5161351a822769e51b5c775f08744f3dd766fdd2249c98ab65a058875d9b85fd');
const expected=['order-eta','order-stabilizer','order-reynolds','passive-coordinate','bond-J','bond-D','bond-symmetric-anisotropy','bond-axial-spin','conservation-Q','conservation-commutator','conservation-adjoint','conservation-kramers'];
assert.equal(d.entries.length,94);
assert.equal(d.sources.length,34);
assert.equal(new Set(d.entries.map(e=>e.id)).size,d.entries.length);
const ids=(s,route,context='')=>resolveFormulaEntries(s,{route,context},d).matches.map(e=>e.id);
const order='#compute/order-parameter-lab',exchange='#compute/exchange-symmetry-lab',cons='#compute/conservation-lab';
for(const [s,route,id] of [['η',order,'order-eta'],['H_η',order,'order-stabilizer'],['P_G',order,'order-reynolds'],['QᵀRQ',order,'passive-coordinate'],['J',exchange,'bond-J'],['D',exchange,'bond-D'],['Γ',exchange,'bond-symmetric-anisotropy'],['det(R)R',exchange,'bond-axial-spin'],['Q',cons,'conservation-Q'],['[H/ℏ,Q]',cons,'conservation-commutator'],['L†Q',cons,'conservation-adjoint'],['U_T U_T*',cons,'conservation-kramers']])assert.ok(ids(s,route).includes(id),`${id}: ${ids(s,route)}`);
assert.ok(!ids('η','#compute/manybody-spectra-lab').includes('order-eta'));
assert.ok(ids('η','#compute/manybody-spectra-lab').includes('manybody-eta'));
assert.ok(!ids('J',exchange).includes('J-angular'));
assert.ok(!ids('Γ',exchange).includes('gamma-point'));
assert.ok(ids('Γ','#classroom/crystal').includes('gamma-point'));
assert.ok(!ids('D','#compute/density-matrix-lab').includes('bond-D'));
assert.ok(resolveFormulaEntries('Q',{},d).unknown);
let rendered=0;
for(const id of expected){
 const e=d.entries.find(x=>x.id===id);assert.ok(e,id);
 assert.ok(e.variables.length&&e.variables.every(v=>v.symbol&&v.meaning&&v.unit));
 assert.ok(e.sources.every(id=>d.sources.some(s=>s.id===id)));
 assert.ok(e.links.every(([,url])=>safeDictionaryHref(url)));
 assert.doesNotMatch(dictionaryEntryHTML(e,d),/katex-error|sl-math-error|javascript:|<script/i);
 for(const text of [...e.symbols,...e.variables.map(v=>v.symbol),e.conventions]){
  for(const segment of [...segmentFormula(text),...findInlineMath(text)]){
   if(segment.type==='math'){katex.renderToString(segment.tex,{throwOnError:true,strict:'ignore',trust:false});rendered++;}
  }
 }
}
for(const term of ['Noether','DMI','稳定子群','群平均','坐标约定','伴随生成元'])assert.ok(searchDictionary(term,d).length,term);
console.log(`Principles dictionary: 12 contextual entries, original 82 entries and 30 source records unchanged, ${rendered} checked formula segments.`);
