import assert from 'node:assert/strict';
import katex from '../dist/vendor/katex/katex.mjs';
import {normalizeMath,segmentFormula,findInlineMath} from '../dist/math-notation.js';

for(const source of ['Si, GaAs and BaTiO₃','The C4v point group has χ_{xx}=χ_{yy}.','For SU(3), use C₂(p,q).']){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);
 for(const p of parts.filter(p=>p.type==='math'))assert.doesNotMatch(p.source,/\b(?:and|the|for|has|use)\b/i);
}

// The conjunction in the actual spinor/vector result must not join the SU(3) atom.
const representationNote='The three-dimensional vector representation has kernel {I₂,−I₂}. It is neither the fundamental representation of SU(3) nor a faithful representation of SU(2).';
const representationParts=findInlineMath(representationNote);
assert.equal(representationParts.map(p=>p.source).join(''),representationNote);
assert.ok(representationParts.some(p=>p.type==='text'&&/\bnor\b/.test(p.source)));
for(const p of representationParts.filter(p=>p.type==='math'))assert.doesNotMatch(p.source,/\bnor\b/);
for(const group of ['SU(3)','SU(2)'])assert.ok(representationParts.some(p=>p.type==='math'&&p.source.includes(group)));
assert.equal(normalizeMath('nor'),'nor','Explicit mathematical normalization keeps its original letters');
assert.equal(normalizeMath('SU(3)nor'),String.raw`\operatorname{SU}(3)nor`,'Explicit mathematics remains independent of prose discovery');

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
 ['Σᵅ(dᵅ)²=h',String.raw`\sum _{\alpha}(d^{\alpha})^{2}=h`],
 ['Σ2tᵢ',String.raw`\sum 2t_{i}`],['ΣJ(2J+1)',String.raw`\sum _{J}(2J+1)`],
 ['ΣRαμ|bRαμ|²',String.raw`\sum _{R\alpha \mu}|bR\alpha \mu |^{2}`],
 ['Σμ |bRαμ|²',String.raw`\sum _{\mu} |bR\alpha \mu |^{2}`],['Σα P(R,α)',String.raw`\sum _{\alpha} P(R,\alpha )`],
 ['Σα nα dα=3N',String.raw`\sum _{\alpha} n\alpha  d\alpha =3N`],
 ['Σarg(U)',String.raw`\sum  \arg (U)`],['Σif Wif',String.raw`\sum _{if} Wif`],['Σjα |eν,jα|²=1',String.raw`\sum _{j\alpha} |e\nu ,j\alpha |^{2}=1`],
 ['ΣL+ΣR',String.raw`\Sigma L+\Sigma R`],['Σ_R',String.raw`\Sigma _{R}`],
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
assert.doesNotMatch(normalizeMath('Σarg(U)'),/sum _\{ar\}/);
const reviewedSums='Σᵅ(dᵅ)²=h；Σarg(U)；Σif Wif；Σjα |eν,jα|²=1';
assert.equal(segmentFormula(reviewedSums).map(p=>p.source).join(''),reviewedSums);
assert.equal(normalizeMath(''),null);assert.equal(normalizeMath(null),null);
console.log('Math notation: physical scripts, group labels, Greek/combining/astral symbols, self-energy versus sums, matrices, mixed prose, opaque paths and safe fallback passed.');

for(const metadata of ["teaching_labs · 2026-10-29T00:27:25.310Z · 20261030-construction1","atomic_spectra_lab","zero_field_splitting"]){const parts=findInlineMath(metadata);assert.equal(parts.map(p=>p.source).join(''),metadata);assert.ok(parts.every(p=>p.type==='text'),metadata);}

assert.ok(findInlineMath("exp(ik_z)").some(p=>p.type==='math'));

// Accents must remain attached to an atom, including when scripts are present.
const accentAndScriptCases=new Map([
 ['AB̄',String.raw`A\overline{B}`],['xyẑ',String.raw`xy\hat{z}`],
 ['exp̄',String.raw`ex\overline{p}`],['R̄',String.raw`\overline{R}`],
 ['R̅',String.raw`\overline{R}`],['R̿',String.raw`\overline{\overline{R}}`],
 ['R̄⁻¹',String.raw`\overline{R}^{-1}`],['C̄₂z',String.raw`\overline{\mathrm{C}}_{\mathrm{2z}}`],
 ['k̄_x',String.raw`\overline{k}_{x}`],['R_ᾱ',String.raw`R_{\overline{\alpha }}`],
 ['10̄',String.raw`\overline{10}`],['P4̄',String.raw`{\mathrm{P}\overline{4}}`],
 ['C_2^2','C_{2}^{2}'],['C₂²','C_{2}^{2}'],['C_2²','C_{2}^{2}'],
 ['C₂^2_z','C_{2z}^{2}'],['C₂_z','C_{2z}'],
 ['x_1₂','x_{12}'],['x_i₂','x_{i2}'],['x_{i₂}','x_{i_{2}}'],
 ['R′^-1',String.raw`\left(R^{\prime }\right)^{-1}`],
 ['R′⁻¹',String.raw`\left(R^{\prime }\right)^{-1}`],
 ["R'^{-1}",String.raw`\left(R^{\prime }\right)^{-1}`],
 ['T_a^(A)²',String.raw`\left(T_{a}^{(A)}\right)^{2}`],
 ['(AB)^(A)²',String.raw`\left((AB)^{(A)}\right)^{2}`],
 ['χᵅ(C꜀)',String.raw`\chi ^{\alpha}(C_{c})`],
]);
for(const [source,tex]of accentAndScriptCases)assert.equal(render(source).tex,tex,source);
const mathml=source=>katex.renderToString(normalizeMath(source),{...options,output:'mathml'}).replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/,'');
assert.match(mathml('AB̄'),/<mi>A<\/mi><mover accent="true"><mi>B<\/mi>/,'Only B carries the bar');
assert.match(mathml('R̄⁻¹'),/<msup><mover accent="true"><mi>R<\/mi>/,'The inverse applies to the barred operator');
assert.match(mathml('k̄_x'),/<msub><mover accent="true"><mi>k<\/mi>/,'A bar remains on the base, above its subscript');
assert.match(mathml('10̄'),/<mover accent="true"><mn>10<\/mn>/,'The conjugate SU(3) numeral label stays a whole atom');
assert.equal((mathml('C₂^2_z').match(/<msubsup>/g)||[]).length,1,'One base has one paired script structure');
assert.match(mathml('C₂^2_z'),/<msubsup><mi>C<\/mi><mrow><mn>2<\/mn><mi>z<\/mi><\/mrow><mn>2<\/mn>/);
for(const source of ['R̄⁻¹','C̄₂z','R′⁻¹','χᵅ(C꜀)','R̅⁻¹']){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);
 assert.ok(parts.some(p=>p.type==='math'),source);
 for(const p of parts.filter(p=>p.type==='math'))katex.renderToString(p.tex,options);
}
console.log('Math accents/scripts: single-atom bars, grouped numeral labels, overline aliases, paired scripts, primes/inverses and explicit nested indices passed.');

// Scientific units must survive NFD normalization. An angstrom's ring is an
// accent on the upright A; the inverse/square belongs to the complete unit.
assert.equal(render('Å⁻¹').tex,String.raw`\mathring{\mathrm{A}}^{-1}`);
assert.equal(render('eV/Å²').tex,String.raw`\mathrm{eV}/\mathring{\mathrm{A}}^{2}`);
assert.equal(render('Å³/胞').tex,String.raw`\mathring{\mathrm{A}}^{3}/\text{胞}`);
assert.match(mathml('Å⁻¹'),/<msup><mover accent="true"><mi mathvariant="normal">A<\/mi>/);
for(const source of ['胞内弹簧 K₁（eV/Å²）','原胞体积 Å³/胞','温度 T≪θD']){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);
 assert.ok(parts.some(p=>p.type==='math'&&(p.source.includes('Å')||p.source.includes('≪'))),source);
 for(const p of parts.filter(p=>p.type==='math'))katex.renderToString(p.tex,options);
}

const chemicalCases=new Map([
 ['BaTiO₃',String.raw`{\mathrm{Ba}\mathrm{Ti}\mathrm{O}_{3}}`],
 ['MnF₂',String.raw`{\mathrm{Mn}\mathrm{F}_{2}}`],
 ['CuO₂',String.raw`{\mathrm{Cu}\mathrm{O}_{2}}`],
 ['CoF2',String.raw`{\mathrm{Co}\mathrm{F}_{2}}`],
 ['ABO₃',String.raw`{\mathrm{A}\mathrm{B}\mathrm{O}_{3}}`],
 ['Ni²⁺',String.raw`{\mathrm{Ni}^{2+}}`],
]);
for(const [source,tex] of chemicalCases){assert.equal(render(source).tex,tex,source);assert.ok(findInlineMath(source).some(p=>p.type==='math'),source);}
assert.match(mathml('BaTiO₃'),/<mi mathvariant="normal">B<\/mi><mi mathvariant="normal">a<\/mi>/);
assert.equal(normalizeMath('C4v'),'C_{4v}','A point group must not become a chemical formula');
assert.equal(normalizeMath('S⁺'),String.raw`S^{+}`,'A spin raising operator is not a charged chemical formula');
assert.equal(normalizeMath('SU(3)'),String.raw`\operatorname{SU}(3)`);
assert.equal(normalizeMath('C₂'),String.raw`C_{2}`);

for(const source of ['H_E=H_副本⊗I₂允许非零副本间跃迁','H_{副本}⊗I₂允许','H_(副本)⊗I₂允许','若k有长度⁻¹单位则为长度²','能量⁻¹']){
 const parts=findInlineMath(source);assert.equal(parts.map(p=>p.source).join(''),source);
 assert.ok(parts.some(p=>p.type==='math'&&/[\u3400-\u9fff]/u.test(p.source)),source);
 assert.ok(parts.every(p=>p.type!=='text'||!p.source.includes('_')),source);
 for(const p of parts.filter(p=>p.type==='math'))katex.renderToString(p.tex,options);
}
const chineseLabel=findInlineMath('H_E=H_副本⊗I₂允许非零副本间跃迁');
assert.equal(chineseLabel[0].tex,String.raw`H_{E}=H_{\text{副本}}\otimes I_{2}`);
assert.equal(chineseLabel[1].source,'允许非零副本间跃迁','Following prose must not become part of a script');
assert.equal(normalizeMath('Γ_mech'),String.raw`\Gamma _{\mathrm{mech}}`);
assert.equal(normalizeMath('N_fix'),String.raw`N_{\mathrm{fix}}`);
assert.equal(normalizeMath('x_BC'),String.raw`x_{\mathrm{BC}}`);
assert.equal(render('L^†Q').tex,String.raw`L^{\dagger }Q`);
assert.equal(render('L^{†}Q').tex,String.raw`L^{\dagger }Q`);
assert.equal(render('L^†_i').tex,String.raw`L_{i}^{\dagger }`);
assert.equal(render('L^²').tex,String.raw`L^{2}`);
const explicitDagger=findInlineMath('L^†Q');
assert.equal(explicitDagger.map(p=>p.source).join(''),'L^†Q');assert.equal(explicitDagger[0].type,'math');
assert.match(mathml('L^†Q'),/<msup><mi>L<\/mi><mo[^>]*>†<\/mo><\/msup><mi>Q<\/mi>/);
const completeBasis='Gₐ C_{完整}=C_{完整} Dₐ\nC_{完整}†C_{完整}=I₃₀';
const completeParts=segmentFormula(completeBasis);assert.equal(completeParts.map(p=>p.source).join(''),completeBasis);
for(const p of completeParts){if(p.type==='text')assert.equal(p.source.trim(),'');else katex.renderToString(p.tex,options);}
console.log('Scientific notation: upright chemical formulae/ions, angstrom powers, Chinese script labels/units and comparison discovery passed.');
for(const source of ['Other contributions are excluded. BaTiO₃ is tetragonal.','Keep φ=30° fixed. Compare θ=0° with θ=45°.','Use a nonzero χ_zzz tensor and test a counterexample.']){
 const rows=findInlineMath(source);assert.equal(rows.map(row=>row.source).join(''),source);
 for(const row of rows.filter(row=>row.type==='math'))assert.doesNotMatch(row.source,/excluded|fixed|Compare|nonzero|counterexample|\band\b|\bwith\b|\ba\b/);
 assert.ok(rows.some(row=>row.type==='math'));
}
for(const source of ['F = aQ² + bQ⁴; the coefficients are dimensionless.','E=±√(ξ²+|Δ|²), each sign is twofold degenerate.','H_SOC=ζ_dΣ_(d electrons)l·s is the spin–orbit term.']){
 const rows=segmentFormula(source);assert.equal(rows.map(row=>row.source).join(''),source);
 assert.ok(rows.some(row=>row.type==='text'));
 for(const row of rows.filter(row=>row.type==='math')){assert.doesNotMatch(row.source,/coefficients|dimensionless|degenerate|\bthe\b|\beach\b/);katex.renderToString(row.tex,options);}
}
assert.match(normalizeMath('E_(lower-site double occupancy)'),/\\text\{lower-site double occupancy\}/);
