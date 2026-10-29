import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import katex from '../dist/vendor/katex/katex.mjs';
import {crystalSpan,crystalTex,hmTex,schoenfliesTex,operationTex,seitzTex,irrepTex} from '../dist/crystal-notation.js';
import {normalizeMath} from '../dist/math-notation.js';

const dataURL=new URL('../dist/data/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,dataURL),'utf8'));
const compressed=name=>JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('labels/'+name,dataURL))).toString('utf8'));
const digest=name=>createHash('sha256').update(fs.readFileSync(new URL(name,dataURL))).digest('hex');
const seen=new Map(),sources=new Set(),counts={},failures=[];
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|#39);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[c]));
function add(kind,source,file,pointer){
 if(typeof source!=='string'||!source)return;
 sources.add(file);const key=kind+'\0'+source;if(!seen.has(key))seen.set(key,{kind,source,file,pointer});
}
const specs=[
 ['space-groups.json','groups',230,{symbol:'hm',bcSymbol:'hm',pointGroup:'schoenflies'}],
 ['magnetic-groups.json','groups',1651,{symbol:'hm',bcSymbol:'hm',ogSymbol:'hm',pointGroup:'schoenflies'}],
 ['points.json','points',122,{symbol:'hm'}],
 ['pointgroup-atlas.json','groups',32,{hm:'hm',schoenflies:'schoenflies',representativeSGSymbol:'hm'}],
 ['symmetry-course-atlas.json','spaceGroups',230,{symbol:'hm',bcSymbol:'hm',pointGroup:'schoenflies'}],
 ['symmetry-course-atlas.json','magneticGroups',1651,{symbol:'hm',ogSymbol:'hm'}],
 ['symmetry-course-atlas.json','magneticPointGroups',122,{symbol:'hm'}],
];
const inputs=new Map();for(const [name]of specs)inputs.set(name,digest(name));
// These legacy tokens are defined explicitly upstream in SpaceGroupIrep.wl
// lines 3313, 3319 and 3321. "b" is a bar marker, not a parity suffix.
const exactIrrepTokens={
 Bbp:'\\overline{\\mathrm{B}}^{\\prime }',Bbpp:'\\overline{\\mathrm{B}}^{\\prime\\prime }',
 Bbgp:'\\overline{\\mathrm{B}}_{\\mathrm{g}}^{\\prime }',Bbgpp:'\\overline{\\mathrm{B}}_{\\mathrm{g}}^{\\prime\\prime }',
 Bbup:'\\overline{\\mathrm{B}}_{\\mathrm{u}}^{\\prime }',Bbupp:'\\overline{\\mathrm{B}}_{\\mathrm{u}}^{\\prime\\prime }',
};
for(const [file,array,total,fields]of specs){
 const rows=read(file)[array];assert.equal(rows.length,total,file+'/'+array);counts[file+'/'+array]=rows.length;
 rows.forEach((g,i)=>{
  for(const [field,kind]of Object.entries(fields))add(kind,g[field],file,`/${array}/${i}/${field}`);
  for(const field of ['operations','classes','examples'])for(const [j,op]of (g[field]||[]).entries())add('operation',op.name||op.label,file,`/${array}/${i}/${field}/${j}`);
  for(const [j,ir]of (g.irreps||[]).entries())for(const field of ['label','bcLabel','mulliken','conjugateLabel'])add('irrep',ir[field],file,`/${array}/${i}/irreps/${j}/${field}`);
 });
}
for(const file of ['bc-labels.json.gz','bilbao-labels.json.gz']){
 inputs.set('labels/'+file,digest('labels/'+file));const rows=compressed(file).records;
 counts[file]=rows.length;assert.equal(rows.length,file==='bc-labels.json.gz'?6928:2700);
 rows.forEach((g,i)=>{for(const [j,ir]of g.irreps.entries())for(const field of ['bc_label','bilbao_label','mulliken'])add('irrep',ir[field],file,`/records/${i}/irreps/${j}/${field}`);});
}

// Exact assertions constrain the meaning of the script, not just parseability.
// H-M C2 is a C-centred lattice with a twofold constituent. It is distinct
// from Schoenflies C_2 and the operation C_2, which happen to share typography.
assert.equal(hmTex('C2'),'\\mathrm{C}2');
assert.equal(schoenfliesTex('C2'),'\\mathrm{C}_{\\mathrm{2}}');
assert.equal(operationTex('C2'),'\\mathrm{C}_{\\mathrm{2}}');
assert.equal(schoenfliesTex('C3v'),'\\mathrm{C}_{\\mathrm{3v}}');
assert.equal(schoenfliesTex('D₄h'),'\\mathrm{D}_{\\mathrm{4h}}');
assert.equal(schoenfliesTex('Oh'),'\\mathrm{O}_{\\mathrm{h}}');
assert.equal(schoenfliesTex('C4z'),null,'An operation axis is not a Schoenflies suffix');
assert.equal(operationTex('C₄z'),'\\mathrm{C}_{\\mathrm{4z}}');
assert.equal(operationTex('C4z+'),'\\mathrm{C}_{\\mathrm{4z}}^{+}');
assert.equal(operationTex('C31+'),'\\mathrm{C}_{\\mathrm{31}}^{+}','BC axis 1 is not a 3_1 screw constituent');
assert.equal(operationTex('C21p'),'\\mathrm{C}_{\\mathrm{21}}^{\\prime }');
assert.equal(operationTex('C21pp'),'\\mathrm{C}_{\\mathrm{21}}^{\\prime\\prime }');
assert.equal(hmTex('P-1'),'\\mathrm{P}\\overline{1}');
assert.equal(hmTex('Fm-3m'),'\\mathrm{F}\\mathrm{m}\\overline{3}\\mathrm{m}');
assert.equal(hmTex('P212121'),'\\mathrm{P}2_{1}2_{1}2_{1}');
assert.equal(hmTex('P41212'),'\\mathrm{P}4_{1}2_{1}2');
assert.equal(hmTex('P3121'),'\\mathrm{P}3_{1}21');
assert.equal(hmTex('P2_12_12_1'),'\\mathrm{P}2_{1}2_{1}2_{1}');
assert.equal(hmTex('P_a2_12_12_1'),'\\mathrm{P}_{\\mathrm{a}}2_{1}2_{1}2_{1}');
assert.equal(hmTex('P_2c4_2\'2_1\'2'),'\\mathrm{P}_{\\mathrm{2c}}4_{2}^{\\prime }2_{1}^{\\prime }2');
assert.equal(hmTex('-3\'m\''),'\\overline{3}^{\\prime }\\mathrm{m}^{\\prime }');
assert.equal(hmTex('P4₁'),'\\mathrm{P}4_{1}');
assert.equal(hmTex('P4_1'),'\\mathrm{P}4_{1}');
assert.equal(hmTex('P4̄'),'\\mathrm{P}\\overline{4}');
assert.equal(operationTex('barC4z+'),'\\overline{\\mathrm{C}}_{\\mathrm{4z}}^{+}');
assert.equal(operationTex('barC4z+',{fullbar:true}),'\\overline{\\mathrm{C}_{\\mathrm{4z}}^{+}}');
assert.equal(seitzTex('{barC4z+|0,0,1/2}',{fullbar:true}),'\\{\\overline{\\mathrm{C}_{\\mathrm{4z}}^{+}}\\mid 0,0,1/2\\}');
assert.equal(irrepTex('A̅1'),'\\overline{\\mathrm{A}}_{\\mathrm{1}}');
assert.equal(irrepTex('Ē1g'),'\\overline{\\mathrm{E}}_{\\mathrm{1g}}');
assert.equal(irrepTex('²E̅1g′'),'{}^{2}\\overline{\\mathrm{E}}_{\\mathrm{1g}}^{\\prime }');
assert.equal(irrepTex('Γ₆'),'\\Gamma _{\\mathrm{6}}');
assert.equal(irrepTex('-GM5'),'\\mathrm{-GM5}','Bilbao source ID is not an H-M negative rotation');
assert.equal(crystalTex('-P 2ybc','literal'),null,'Hall strings remain literal identifiers');
assert.equal(normalizeMath('-1+2'),'-1+2','Arithmetic negatives are not rotoinversion bars');

// Every ordinary compact identifier is checked against an independent source
// with explicit screw indices: the corresponding type-I magnetic catalogue.
const sg=read('space-groups.json').groups;
const typeI=new Map(read('magnetic-groups.json').groups.filter(g=>g.type===1).map(g=>[g.family,g]));
assert.equal(typeI.size,230);
for(const g of sg){const explicit=typeI.get(g.number);assert.ok(explicit,'SG '+g.number);for(const key of ['symbol','bcSymbol'])assert.equal(hmTex(g[key]),hmTex(explicit[key]),`SG ${g.number} ${key}: ${g[key]} -> ${explicit[key]}`);}
assert.equal(new Set([...seen.values()].filter(r=>r.kind==='operation').map(r=>r.source)).size,70);
assert.equal(new Set([...seen.values()].filter(r=>r.kind==='schoenflies').map(r=>r.source)).size,32);

for(const row of seen.values()){
 try{
  const tex=crystalTex(row.source,row.kind);
  assert.ok(tex,`Unsupported ${row.kind} ${JSON.stringify(row.source)}`);
  if(row.kind==='irrep'&&exactIrrepTokens[row.source])assert.equal(tex,exactIrrepTokens[row.source],'Legacy bar/prime/parity meaning: '+row.source);
  if(row.kind==='irrep'&&/^[TSZ]'[1-5]$/.test(row.source)){
   // The prime belongs to the k-point label; the numeral is the irrep index.
   const base=row.source[0],index=row.source.slice(2);
   assert.equal(tex,'\\mathrm{'+base+'}_{\\mathrm{'+index+'}}^{\\prime }','Primed k-point base and independent irrep index');
  }
  const html=katex.renderToString(tex,{throwOnError:true,trust:false,strict:'error',output:'htmlAndMathml'});
  assert.ok(html.includes('<math')&&!html.includes('katex-error'));
  const marker=crystalSpan(row.source,row.kind);
  assert.equal(decode(marker.match(/data-math-source="([^"]*)"/)[1]),row.source);
  assert.equal(decode(marker.replace(/^<span[^>]*>/,'').replace(/<\/span>$/,'')),row.source);
  assert.ok(!/<script|<img|<iframe/i.test(marker));
 }catch(error){failures.push({...row,error:error.message});}
}
for(const [file,hash]of inputs)assert.equal(digest(file),hash,'Source changed during display validation: '+file);
const summary={catalogs:counts,uniqueTypedSymbols:seen.size,byKind:Object.fromEntries(['hm','schoenflies','operation','irrep'].map(kind=>[kind,[...seen.values()].filter(r=>r.kind===kind).length])),failures};
const report=new URL('../.openai/crystal-unhandled.json',import.meta.url);fs.mkdirSync(new URL('../.openai/',import.meta.url),{recursive:true});fs.writeFileSync(report,JSON.stringify(summary,null,2)+'\n');
console.log('Crystal catalogue: '+JSON.stringify({...summary,failures:failures.length}));
assert.equal(failures.length,0,`See .openai/crystal-unhandled.json for ${failures.length} failures`);
