import assert from 'node:assert/strict';
import katex from '../dist/vendor/katex/katex.mjs';
import {normalizeMath,findInlineMath} from '../dist/math-notation.js';
import {crystalTex,operationTex} from '../dist/crystal-notation.js';
const tex=normalizeMath('C2z^2');
assert.equal(tex,String.raw`\mathrm{C}_{\mathrm{2z}}^{2}`);
const ml=katex.renderToString(tex,{output:'mathml',throwOnError:true});
assert.equal((ml.match(/<msubsup>/g)||[]).length,1);
assert.equal(normalizeMath('C̅₂z⁻¹'),String.raw`\overline{\mathrm{C}}_{\mathrm{2z}}^{-1}`);
assert.equal(operationTex('barC21p'),String.raw`\overline{\mathrm{C}}_{\mathrm{21}}^{\prime }`);
const seitz=crystalTex('{barC2z|0,0,1/2}','operation');
assert.equal(seitz,String.raw`\{\overline{\mathrm{C}_{\mathrm{2z}}}\mid 0,0,1/2\}`);
assert.match(normalizeMath('{barC2z|0,0,1/2}'),/\\overline\{\\mathrm\{C\}_/);
assert.equal(normalizeMath('-1+2'),'-1+2');
for(const source of ['空间群 P212121 与 P6_3/mmc，操作 C2z。','C̅₂z 与 C₄zⁿ','{barC2z|0,0,1/2}⁻¹']){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);
 for(const part of parts.filter(p=>p.type==='math'))katex.renderToString(part.tex,{throwOnError:true});
}
console.log('Crystal inline: typed operations, one paired script atom, base/Seitz bar scope, arithmetic separation and source preservation passed.');

assert.match(normalizeMath("P4₁"),/\\mathrm\{P\}4_\{1\}/);
