import assert from 'node:assert/strict';
import katex from '../dist/vendor/katex/katex.mjs';
import {normalizeMath,segmentFormula,findInlineMath} from '../dist/math-notation.js';

const options={throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml',maxExpand:1000,maxSize:20};
const render=source=>{const tex=normalizeMath(source);assert.equal(typeof tex,'string',source);const html=katex.renderToString(tex,options);assert.match(html,/<math /);return{tex,html};};
const exact=new Map([
 ['½',String.raw`\frac{1}{2}`],['T≪θD',String.raw`T\ll \theta D`],['G=T⋊P',String.raw`G=T\rtimes P`],['SU(3)',String.raw`\operatorname{SU}(3)`],
 ['d⁸','d^{8}'],['p⁶d⁸→p⁵d⁹',String.raw`p^{6}d^{8}\to p^{5}d^{9}`],
 ['σx',String.raw`\sigma _{x}`],['σxy',String.raw`\sigma _{xy}`],['τz',String.raw`\tau _{z}`],['kBT',String.raw`k_{\mathrm{B}}T`],['μB B',String.raw`\mu _{\mathrm{B}} B`],['S_z','S_{z}'],['H/h','H/h'],['c†',String.raw`c^{\dagger }`],
 ['k_x^2','k_{x}^{2}'],['x_{i+1}','x_{i+1}'],
 ['H_BdG',String.raw`H_{\mathrm{BdG}}`],['H_SOC',String.raw`H_{\mathrm{SOC}}`],
 ['C4v','C_{4v}'],['C₄v','C_{4v}'],['C₃ᵢ','C_{3i}'],['D4h','D_{4h}'],['Oh','O_{h}'],['Td','T_{d}'],
 ['𝒟(g)',String.raw`\mathcal{D}(g)`],['3̄',String.raw`\overline{3}`],['10̄',String.raw`\overline{10}`],
 ['ū',String.raw`\overline{u}`],['r̂',String.raw`\hat{r}`],['j⃗',String.raw`\vec{j}`],
 ['χᵅ',String.raw`\chi ^{\alpha}`],['C꜀','C_{c}'],
 ['Σ_L',String.raw`\Sigma _{L}`],['Σ^r',String.raw`\Sigma ^{r}`],['Σ(E)',String.raw`\Sigma (E)`],
 ['Σ_abcd',String.raw`\sum _{abcd}`],['Σ_E',String.raw`\sum _{E}`],['Σₐ',String.raw`\sum _{a}`],
]);
for(const [source,tex]of exact)assert.equal(render(source).tex,tex,source);
for(const source of [
 'Σ=V†gʳV；Γ=i(Σ−Σ†)≥0','Σ_(ε=x,y,z)Σ_i,f p_i|〈f|D_ε|i〉|²=(2/5)(10−n)',
 'd†_(mσ)p_(m′σ)','χ_R^(−1/2)','R_(rℓ)=⟨R_r|L_ℓ⟩','x_{a^{2}}',
 'T^(A)²=T^(A)T^(A)','{c_i,c†_j}=δ_ij',
 'm′_C2x=(0,0,−1)≠m','U′=U−2J；H_flip=−JΣ_(m≠n)S⁺_mS⁻_n',
 '正常参考：{相同输入，Δ=0}','H_SOC=ζ_dΣ_(d电子)l·s+ζ_pΣ_(p电子)l·s',
 'aᵅ=(1/h)Σ꜀ n꜀ χᵅ(C꜀)*χ(C꜀)；Γ=⊕ᵅ aᵅΓᵅ',
])render(source);
const matrix='C=[[1/2,√3/2],[√3/2,−1/2]]\nC†C=I₂';
assert.match(render(matrix).tex,/\\begin\{bmatrix\}/);
assert.match(render(matrix).tex,/\\begin\{gathered\}/);
assert.equal(segmentFormula(matrix).length,1,'A multiline matrix cannot be split into incomplete rows');
const segments=segmentFormula('在固定参数下：I_z−I_x；温度 T=0，结果为 d⁸。');
assert.equal(segments.map(s=>s.source).join(''),'在固定参数下：I_z−I_x；温度 T=0，结果为 d⁸。');
for(const p of segments.filter(p=>p.type==='math'))katex.renderToString(p.tex,options);
for(const source of ['σx/σy/σz 与 ⟨σx⟩。','σxy、τxx、kBT 以及 μB B。','Use S_z and k_x^2 here.','normal English sentence','  spaces  around  text  ','晶胞 d⁸ 与 C4v 对称。','S_z=1，检查 x_{i+1}。']){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);
 for(const p of parts.filter(p=>p.type==='math'))katex.renderToString(p.tex,options);
}
for(const source of ['atomic_spectra_lab.py','dist/data/input_cell.json','C:/data/input_cell.json','https://example.org/tutorial_18/']){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);assert.equal(parts.filter(p=>p.type==='math').length,0,source);
}
for(const source of [String.raw`\href{javascript:alert(1)}{x}`,String.raw`\htmlClass{evil}{x}`,'<img src=x onerror=alert(1)>','x_{','x^'])assert.equal(normalizeMath(source),null,source);
for(const source of ['σx','σy','σz','τxy','kBT','μB B'])assert.ok(findInlineMath(source).some(p=>p.type==='math'),source);
for(const source of ['checkB','kBox','σxyz_api'])assert.doesNotMatch(normalizeMath(source),/\\mathrm\{B\}|\\sigma _/);
assert.equal(normalizeMath(''),null);assert.equal(normalizeMath(null),null);
console.log('Math notation: physical scripts, group labels, Greek/combining/astral symbols, self-energy versus sums, matrices, mixed prose, opaque paths and safe fallback passed.');
