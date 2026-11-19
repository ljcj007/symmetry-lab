import assert from 'node:assert/strict';

const english=process.argv.includes('--english');
const {bandMatchRows}=await import(english?'../dist/en/band-match-results.js':'../dist/band-match-results.js');
const label=id=>({D_1:'<b>Γ₁</b>',D_2:'D₂',CD_3:'CD₃'})[id];
const bands=[
 {index:1,energy:-.125,degeneracy:3,terms:{dimension:3,passed:true,reconstructionError:0,terms:[
  {id:'D_1',multiplicity:2,coefficient:[2,0]},{label:'D_2',multiplicity:1},{label:'not shown',multiplicity:0}
 ]}},
 {index:3,terms:{dimension:2,passed:true,terms:[{id:'CD_3',multiplicity:1,type:'c'}]}},
 {index:'<script>',energy:Infinity,terms:[{label:'D_2',count:2},{id:'CD_3',coefficient:1},{id:'not shown',coefficient:[1,0]}]},
];
const original=structuredClone(bands);
assert.deepEqual(bandMatchRows(bands,label),[
 ['1','-0.125000','3','2 <b>Γ₁</b> ⊕ D₂'],['3','—','2','CD₃'],['&lt;script&gt;','—','—','2 D₂ ⊕ CD₃'],
]);
assert.deepEqual(bands,original,'Rendering never changes the payload used for JSON export');
assert.throws(()=>bandMatchRows({bands},label),english?/valid list of levels/:/有效的能级列表/);
assert.throws(()=>bandMatchRows([{index:1,terms:{dimension:2}}],label),english?/valid list of terms/:/有效的表示项/);
console.log(`Band result rendering (${english?'English':'Chinese'}): nested ordinary and magnetic terms, original exports and input validation passed.`);
