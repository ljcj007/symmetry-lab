import assert from 'node:assert/strict';
import fs from 'node:fs';
import katex from '../dist/vendor/katex/katex.mjs';
import {findInlineMath,segmentFormula,normalizeMath} from '../dist/math-notation.js';
import {jsStrings} from './english-source.mjs';

// Reviewed cases identify actual generated sources. Their prose/math roles
// are independent semantic expectations, rather than parser-derived oracles.
// Static JS fragments are complemented by the production DOM regression.
const cases=[
 {
  id:'coordinate-convention-documentation',
  origin:'dist/en/docs/symmetry-course.md:47',
  prose:['If','then'],
  math:['x_{old}=P x_{new}+p','R_{new}=P⁻¹R_{old}P','t_{new}=P⁻¹(R_{old}p+t_{old}−p)','k_{new}=Pᵀk_{old}']
 },
 {
  id:'coordinate-phase-question',
  origin:'dist/en/data/symmetry-course-lessons.json/lessons/5/quiz/0/question',
  prose:['For','how'],math:['x_{old}=P x_{new}+p']
 },
 {
  id:'coordinate-distractor-keeps-its-indices',
  origin:'dist/en/data/symmetry-course-lessons.json/lessons/5/quiz/0/choices/2',
  prose:[],math:['k_{new}=k_{old}+p']
 },
 {
  "id": "two-state-interface",
  "origin": "dist/en/data/bridges-materials.json/cases/9/summary",
  "prose": [
   "two-state"
  ],
  "math": [
   "C₄ᵥ"
  ]
 },
 {
  "id": "two-spin",
  "origin": "dist/en/data/conservation-content.json/lessons/2/sections/1/text",
  "prose": [
   "Two-spin"
  ],
  "math": [
   "T²=+I",
   "T²=−I"
  ]
 },
 {
  "id": "low-orbital",
  "origin": "dist/en/data/crystal-field-content.json/exercises/0/steps/3/choices/1",
  "prose": [
   "low"
  ],
  "math": [
   "t₂g",
   "e_g"
  ]
 },
 {
  "id": "six-states",
  "origin": "dist/en/data/crystal-field-content.json/exercises/1/steps/2/choices/0",
  "prose": [
   "six"
  ],
  "math": [
   "j=5/2"
  ]
 },
 {
  "id": "odd-parity",
  "origin": "dist/en/data/electronic-materials.json/exercises/0/steps/1/choices/1",
  "prose": [
   "Odd"
  ],
  "math": [
   "ψ(−k)=−ψ(k)"
  ]
 },
 {
  "id": "question-do",
  "origin": "dist/en/data/electronic-materials.json/exercises/3/steps/1/prompt",
  "prose": [
   "Do"
  ],
  "math": [
   "χ_xxz",
   "χ_zxx"
  ]
 },
 {
  "id": "after-rabi-period",
  "origin": "dist/en/data/formula-dictionary.json/entries/78/conventions",
  "prose": [
   "Do"
  ],
  "math": [
   "P_↑(t)=cos²(Ωt/2)"
  ]
 },
 {
  "id": "label-end",
  "origin": "dist/en/data/frontiers-materials.json/modules/2/fields/6/label",
  "prose": [
   "end"
  ],
  "math": [
   "D ≤ 8",
   "h ≤ 1"
  ]
 },
 {
  "id": "hall-dimension",
  "origin": "dist/en/data/hall-response-content.json/exercises/0/steps/3/prompt",
  "prose": [
   "two-dimensional"
  ],
  "math": [
   "σxy"
  ]
 },
 {
  "id": "hubbard-chemical",
  "origin": "dist/en/data/hubbard-content.json/cases/1/assumption",
  "prose": [
   "two-dimensional"
  ],
  "math": [
   "CuO₂"
  ]
 },
 {
  "id": "ordinary-do",
  "origin": "dist/en/data/lie-derivations.json/exercises/2/steps/3/explanation",
  "prose": [
   "do"
  ],
  "math": [
   "T₂"
  ]
 },
 {
  "id": "get-in-title",
  "origin": "dist/en/data/lie-derivations.json/exercises/9/title",
  "prose": [
   "get"
  ],
  "math": [
   "SU(2)",
   "1⊗1/2"
  ]
 },
 {
  "id": "sum-noun",
  "origin": "dist/en/data/lie-derivations.json/exercises/14/steps/3/explanation",
  "prose": [
   "sum"
  ],
  "math": [
   "ε_{abc}|a b c⟩/√6"
  ]
 },
 {
  "id": "contraction-cant",
  "origin": "dist/en/data/lie-derivations.json/exercises/26/check/question",
  "prose": [
   "can't"
  ],
  "math": [
   "|S₂₁|²=1/24"
  ]
 },
 {
  "id": "after-dagger-period",
  "origin": "dist/en/data/lie-group-lessons.json/lessons/14/pitfall",
  "prose": [
   "Do"
  ],
  "math": [
   "C†"
  ]
 },
 {
  "id": "direct-sum-word",
  "origin": "dist/en/data/lie-group-lessons.json/lessons/9/sections/1/paragraphs/0",
  "prose": [
   "sum"
  ],
  "math": [
   "⊕"
  ]
 },
 {
  "id": "unicode-bracket-prose",
  "origin": "dist/en/data/lie-group-lessons.json/lessons/31/sections/1/formula",
  "prose": [
   "the path specified above"
  ],
  "math": [
   "R_(rℓ)=12√21·S_(rℓ)"
  ]
 },
 {
  "id": "low-spin",
  "origin": "dist/en/data/local-multiplet-content.json/lessons/2/sections/1/text",
  "prose": [
   "low-spin"
  ],
  "math": [
   "t₂g⁶"
  ]
 },
 {
  "id": "six-before-pointgroup",
  "origin": "dist/en/data/order-content.json/lessons/1/sections/2/text",
  "prose": [
   "six"
  ],
  "math": [
   "O_h"
  ]
 },
 {
  "id": "sum-new-sentence",
  "origin": "dist/en/data/principles-materials.json/modules/2/predictions/0/explanation",
  "prose": [
   "Sum"
  ],
  "math": [
   "S_x"
  ]
 },
 {
  "id": "add-preset",
  "origin": "dist/en/data/spin-resonance-content.json/modules/0/presets/4/title",
  "prose": [
   "Add"
  ],
  "math": [
   "S=1"
  ]
 },
 {
  "id": "yet-commutator",
  "origin": "dist/en/data/symmetry-derivations.json/exercises/21/steps/5/explanation",
  "prose": [
   "yet"
  ],
  "math": [
   "[H,P]=0"
  ]
 },
 {
  "id": "actual-gt-sum",
  "origin": "dist/en/su3-basis-ui.js:13074",
  "prose": [
   "Sum"
  ],
  "math": [
   "n₁ + n₂ + n₃"
  ],
  "unitContains": "Sum n₁ + n₂ + n₃"
 },
 {
  "id": "ui-noun-sum",
  "origin": "dist/en/foundations-demos.js:10725",
  "prose": [
   "sum"
  ],
  "math": [
   "Δ=10Dq"
  ],
  "unitContains": "The weighted energy sum is"
 },
 {
  "id": "arithmetic-sum-function",
  "origin": "dist/en/docs/arithmetic-centralizer.md:21",
  "prose": [],
  "math": [
   "A=sum(u_i B_i)"
  ]
 },
 {
  "id": "polynomial-sum-function",
  "origin": "dist/en/docs/arithmetic-centralizer.md:23",
  "prose": [],
  "math": [
   "z(t)=sum(t^i Z_i)"
  ]
 },
 {
  "id": "legitimate-current-out",
  "origin": "dist/en/data/device-transport-content.json/lessons/2/sections/2/formula",
  "prose": [],
  "math": [
   "J_{in}−J_{out}=2η|ψ_i|²"
  ]
 },
 {
  "id": "legitimate-spectral-add",
  "origin": "dist/en/data/formula-dictionary.json/entries/67/formulaAliases/0",
  "prose": [],
  "math": [
   "W_{add}+W_{remove}"
  ]
 },
 {
  "id": "spectral-raw",
  "origin": "dist/en/docs/atomic-spectra-lab.md:37",
  "prose": [
   "Raw"
  ],
  "math": [
   "FWHM=2Γ"
  ]
 },
 {
  "id": "short-verb-put",
  "origin": "dist/en/docs/integral-classification.md:61",
  "prose": [
   "put"
  ],
  "math": [
   "c=s_k"
  ]
 },
 {
  "id": "slash-conjunction",
  "origin": "dist/en/docs/nonsymmorphic.md:39",
  "prose": [
   "and/or"
  ],
  "math": [
   "m=0.3"
  ]
 },
 {
  "id": "jahn-teller-proper-name",
  "origin": "dist/en/data/crystal-field-content.json/sources/3/title",
  "prose": [
   "Jahn–Teller"
  ],
  "math": [
   "E⊗e"
  ]
 },
 {
  "id": "spin-fraction-adjective",
  "origin": "dist/en/data/lie-group-lessons.json/lessons/3/sections/0/paragraphs/0",
  "prose": [
   "Spin"
  ],
  "math": [
   "ψ=(a,b)ᵀ∈ℂ²"
  ]
 },
 {
  "id": "spin-group-expression",
  "origin": "dist/en/data/symmetry-course-lessons.json/lessons/20/sections/2/paragraphs/0",
  "prose": [],
  "math": [
   "Spin(3)≅SU(2)"
  ]
 },
 {
  "id": "named-model-functions",
  "origin": "dist/en/data/local-multiplet-content.json/lessons/2/sections/2/formula",
  "prose": [],
  "math": [
   "Kanamori(U,J)",
   "Slater(F⁰,F²,F⁴)"
  ]
 },
 {
  "id": "runtime-clebsch-gordan",
  "originPrefix": "dist/en/data/python-messages.json/translations/",
  "textEquals": "SU(3) Clebsch–Gordan coefficients and basis changes",
  "prose": [
   "Clebsch–Gordan"
  ],
  "math": [
   "SU(3)"
  ]
 },
 {
  "id": "runtime-no-space-comparison",
  "originPrefix": "dist/en/data/python-messages.json/translations/",
  "textEquals": "Supply≤8MiB two-column total_dos.dat",
  "prose": [
   "Supply",
   "two-column"
  ],
  "math": [
   "≤8MiB"
  ]
 },
 {
  "id": "runtime-wigner-eckart",
  "originPrefix": "dist/en/data/python-messages.json/translations/",
  "textEquals": "n=0 makes the whole coupling block zero. For n>0, actual operators/polarizations still matter. This parallels SU(2) Wigner–Eckart reasoning, but coefficients require each group's conventions.",
  "prose": [
   "Wigner–Eckart"
  ],
  "math": [
   "SU(2)"
  ]
 }
];
const root=new URL('../',import.meta.url),cache=new Map();
const read=name=>{if(!cache.has(name))cache.set(name,fs.readFileSync(new URL(name,root),'utf8'));return cache.get(name);};
const json=name=>JSON.parse(read(name));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function actualSource(row){
 if(row.originPrefix){
  const values=Object.values(json('dist/en/data/python-messages.json').translations);
  assert.ok(values.includes(row.textEquals),row.id+': published runtime message changed; review its semantic expectation');
  return row.textEquals;
 }
 const origin=row.origin;
 if(/\.js:\d+$/.test(origin)){
  const file=origin.replace(/:\d+$/,''),units=jsStrings(read(file)).flatMap(x=>x.value.split(/<[^>]*>/g));
  const matches=units.filter(unit=>unit.includes(row.unitContains));
  assert.equal(matches.length,1,row.id+': source fragment must remain unambiguous');
  return matches[0];
 }
 if(/\.md:\d+$/.test(origin)){
  const [file,line]=origin.split(':');
  const value=read(file).split(/\r?\n/)[Number(line)-1];
  assert.equal(typeof value,'string',origin);
  return value;
 }
 const match=origin.match(/^(.*?\.json)\/(.*)$/);assert.ok(match,origin);
 return match[2].split('/').reduce((node,key)=>node[key],json(match[1]));
}
let rendered=0,proseChecks=0,mathChecks=0;
function check(source,{id,prose=[],math=[],formula=false}){
 assert.equal(typeof source,'string',id);
 const rows=(formula?segmentFormula:findInlineMath)(source);
 assert.equal(rows.map(row=>row.source).join(''),source,id+': preserve every source character');
 let offset=0;const intervals=rows.map(row=>{const start=offset;offset+=row.source.length;return{...row,start,end:offset};});
 for(const word of prose){
  const hits=[...source.matchAll(new RegExp('(?<![A-Za-z])'+escape(word)+'(?![A-Za-z])','g'))];
  assert.ok(hits.length,id+': ordinary word missing from actual source: '+word);
  for(const hit of hits){assert.ok(!intervals.some(row=>row.type==='math'&&row.start<hit.index+word.length&&row.end>hit.index),id+': ordinary word consumed as mathematics: '+word);proseChecks++;}
 }
 for(const expression of math){
  assert.ok(source.includes(expression),id+': expected mathematical source changed: '+expression);
  assert.ok(rows.some(row=>row.type==='math'&&row.source.includes(expression)),id+': mathematics split or lost: '+expression);mathChecks++;
 }
 for(const row of rows)if(row.type==='math'){katex.renderToString(row.tex,{throwOnError:true,strict:'ignore',trust:false});rendered++;}
}
for(const row of cases)check(actualSource(row),{...row,formula:/\/formula(?:Aliases\/\d+)?$/.test(row.origin||'')});

// Grammar/context controls: ordinary words do not decide the meaning of an
// explicit subscript, a function call, a typed magnetic group or a variable.
for(const source of [
 'x-y=0','H/h=2','J_{out}=1','W_{add}+W_{remove}=1',
 'E_(lower-site double occupancy)=U','A=sum(u_i B_i)','z(t)=sum(t^i Z_i)',
 'exp(−isθ/2)','ψ=(a,b)ᵀ∈ℂ²','ε_{abc}|a b c⟩/√6',
 'Ndomain=|G|/|H|','Fhkl=FNaCl','XYXY=I','mα=dim(isotypic block)/dα',
 '|−⟩path⊗ψ','Spin(3)≅SU(2)','Kanamori(U,J)','Slater(F⁰,F²,F⁴)',
 "Pbc'm","Pbc'm'","Pnn'm'","Cmc'm","Cmc'm'","Cmm'm'","Ccc'm'","Iba'm'",
 'As₂O₃','CoF₂','Ni²⁺'
])check(source,{id:'scientific control '+source,math:[source],formula:true});
for(const [source,words,expressions]of [
 ['As χ_xz varies, keep the basis fixed.',['As'],['χ_xz']],
 ['In C4v, a tensor has symmetry constraints.',['In'],['C4v']],
 ['No S_z value is implied.',['No'],['S_z']],
 ['At k_x=0 the two values agree.',['At'],['k_x=0']],
 ['SU(3)Clebsch–Gordan coefficients',['Clebsch–Gordan'],['SU(3)']],
 ['Supply≤8MiB two-column data',['Supply','two-column'],['≤8MiB']],
 ['C†. Do not square a complex amplitude directly.',['Do'],['C†']],
 ['Sum n₁ + n₂ + n₃ = 3',['Sum'],['n₁ + n₂ + n₃ = 3']]
])check(source,{id:'boundary control '+source,prose:words,math:expressions});
assert.equal(normalizeMath('Do'),'Do','Explicit normalization is independent of discovery');
assert.equal(normalizeMath('Sum'),'Sum');
assert.equal(normalizeMath('SU(3)Clebsch–Gordan'),'\\operatorname{SU}(3)Clebsch-Gordan');
console.log('Math prose boundaries:',JSON.stringify({actualSources:cases.length,proseChecks,mathematicalCoverageChecks:mathChecks,katexSegmentsRendered:rendered}));
