import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import katex from '../dist/vendor/katex/katex.mjs';
import {segmentFormula,findInlineMath} from '../dist/math-notation.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const dataRoot=path.join(root,'dist/data');
const snapshots=new Map(),formulas=[],inline=[];
const marker=/[_^₀-₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵀᴴ†′]/u;
const isTeaching=name=>/(?:-content|-lessons|-derivations|symmetry-materials|material-observables|material-research|structure-dynamics|coupled-materials|electronic-materials|quantum-materials|response-materials|spectroscopy-materials)\.json$/.test(name)&&!name.endsWith('provenance.json');
const identifierField=/^(?:id|module|action|route|preset|section|lesson|exercise|sourceId|path|url|schema|release|filename|function|api|implementation)$/i;
const digest=raw=>crypto.createHash('sha256').update(raw).digest('hex');

for(const name of fs.readdirSync(dataRoot).filter(x=>x.endsWith('.json')).sort()){
 const file=path.join(dataRoot,name),raw=fs.readFileSync(file);
 snapshots.set(file,digest(raw));
 const data=JSON.parse(raw.toString('utf8'));
 function walk(value,pointer='',field=''){
  if(typeof value==='string'){
   const row={file:'dist/data/'+name,pointer,text:value};
   if(field==='formula'||field.toLowerCase().endsWith('formula'))formulas.push(row);
   else if(isTeaching(name)&&marker.test(value)&&!identifierField.test(field))inline.push(row);
  }else if(Array.isArray(value))value.forEach((item,i)=>walk(item,pointer+'/'+i,field));
  else if(value&&typeof value==='object')Object.entries(value).forEach(([key,item])=>walk(item,pointer+'/'+key,key));
 }
 walk(data);
}

const options={throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml',maxExpand:1000,maxSize:20};
const failures=[],unhandled=[],uniqueFormulas=new Set(),uniqueMath=new Set();
let mathSegments=0,inlineMathSegments=0;
function check(row,convert,kind){
 const segments=convert(row.text);
 assert.ok(Array.isArray(segments),row.file+row.pointer);
 assert.equal(segments.map(s=>s.source).join(''),row.text,`Lost source text: ${row.file}${row.pointer}`);
 for(const segment of segments){
  assert.ok(segment.type==='math'||segment.type==='text','Unexpected segment type');
  assert.equal(typeof segment.source,'string');
  if(segment.type==='math'){
   assert.equal(typeof segment.tex,'string');
   assert.ok(segment.tex.trim(),'Empty TeX segment');
   mathSegments++;if(kind==='inline')inlineMathSegments++;
   uniqueMath.add(segment.tex);
   try{
    const html=katex.renderToString(segment.tex,options);
    assert.match(html,/class="katex"/);
    assert.match(html,/<math /,'Accessible MathML is retained');
    assert.doesNotMatch(html,/class="katex-error"/);
   }catch(error){failures.push({...row,source:segment.source,tex:segment.tex,error:String(error.message)});}
  }else if(/[_^]/.test(segment.source)){
   unhandled.push({...row,kind,unhandled:segment.source});
  }
 }
}
for(const row of formulas){uniqueFormulas.add(row.text);check(row,segmentFormula,'formula');}
for(const row of inline)check(row,findInlineMath,'inline');

// Opaque source identifiers, URLs, paths and literal TeX must remain text.
for(const value of [
 'atomic_spectra_lab.py','spin_resonance_lab.json','C:/data/input_cell.json',
 'https://example.org/some_file?x=H_0',
 String.raw`\href{javascript:alert(1)}{x}`,String.raw`\htmlClass{evil}{x}`,
 String.raw`\includegraphics{https://example.org/a.svg}`,String.raw`\def\a{\a}\a`,
 '<img src=x onerror=alert(1)>',
]){
 const segments=findInlineMath(value);
 assert.equal(segments.map(s=>s.source).join(''),value);
 // A converter is allowed to show harmless mathematical punctuation, but no
 // user-provided TeX command or markup may become a trusted KaTeX instruction.
 for(const s of segments.filter(s=>s.type==='math')){
  const html=katex.renderToString(s.tex,options);
  assert.doesNotMatch(html,/<(?:img|script|iframe)\b|onerror=|href="javascript:|class="evil"/i);
 }
 if(value.includes('\\')||/\.py$|\.json$|^https:\/\//.test(value))assert.equal(segments.filter(s=>s.type==='math').length,0,value);
}
for(const value of ['', '   ', 'χ_R^(−1/2)', 'R_(rℓ)=⟨R_r|L_ℓ⟩', 'd†_(mσ)p_(m′σ)', 'x_{a^{2}}', '正常参考：{相同输入，Δ=0}', 'C=[[1,1],[1,−1]]/√2\nC†C=I₂']){
 check({file:'boundary-case',pointer:'',text:value},segmentFormula,'boundary');
}
for(const [file,hash]of snapshots)assert.equal(digest(fs.readFileSync(file)),hash,'Input dataset was changed: '+file);

const report={
 counts:{jsonFiles:snapshots.size,formulaOccurrences:formulas.length,uniqueFormulaStrings:uniqueFormulas.size,inlineStrings:inline.length,mathSegments,inlineMathSegments,uniqueMathFragments:uniqueMath.size,unhandledTextSegments:unhandled.length,renderFailures:failures.length},
 failures,unhandled,
};
// Diagnostic output is optional and ignored by Git; no local audit fixture is
// required to run this regression in a clean checkout or CI.
const local=path.join(root,'.openai');
if(fs.existsSync(local))fs.writeFileSync(path.join(local,'math-catalog-unhandled.json'),JSON.stringify(report,null,2)+'\n');
console.log('Math catalog:',JSON.stringify(report.counts));
assert.equal(failures.length,0,'KaTeX failed for catalog fragments; inspect .openai/math-catalog-unhandled.json');
