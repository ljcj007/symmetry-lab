// Reproducible migration fixtures from the pre-Python JavaScript algorithms.
// Matrix bases are deliberately omitted: only gauge-invariant characters,
// dimensions, Wigner types and tensor multiplicities are compared.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {analyzeGroup,decomposeCorepresentationCharacters} from '../dist/engine.js';
import {induceRepresentation,decomposeStarProduct} from '../dist/induction.js';
import {parseTrace,matchTraceOperations,charactersForAnalysis} from '../dist/trace-parser.js';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const sg=JSON.parse(read('../dist/data/space-groups.json')).groups;
const msg=JSON.parse(read('../dist/data/magnetic-groups.json')).groups;
const cases=[];
const ordinary=[[2,[.173,.217,.319]],[19,[.173,.217,.319]],[62,[0,.5,0]],
 [194,[-1/3,2/3,.5]],[225,[.5,0,.5]],[230,[.5,-.5,.5]],
 [156,[0,0,0]],[19,[.5,.5,.5]],[16,[0,0,0]],[221,[0,0,0]],[144,[0,0,1/3]]];
for(const [id,k] of ordinary)for(const doubleValued of [false,true])cases.push({kind:'sg',id,k,doubleValued});
for(const id of ['1.2','1.3','2.6','2.7','3.3','3.4','19.26','19.27','19.28','62.442','62.448','62.451','194.264','194.265','194.272','225.117','225.118','225.121'])
 for(const k of [[0,0,0],[.173,.217,.319],[0,0,.5]])for(const doubleValued of [false,true])cases.push({kind:'msg',id,k,doubleValued});
function groupFor(c){return c.kind==='sg'?sg[c.id-1]:msg.find(g=>g.id===c.id);}
const analyses=cases.map(c=>{
 const group=groupFor(c),a=analyzeGroup({operations:group.operations,basis:group.basis,k:c.k,doubleValued:c.doubleValued});
 const reps=a.corepresentations.length?a.corepresentations:a.irreps;
 const induced=reps.map((_,irrepIndex)=>{
  const r=induceRepresentation({group,k:c.k,analysis:a,irrepIndex});
  return {id:r.id,dimension:r.dimension,unitaryCharacters:r.unitaryCharacters};
 });
 return {...c,groupOrder:a.groupOrder,littleOrder:a.littleGroup.order,unitaryOrder:a.littleGroup.unitaryOrder,
  star:a.star,irreps:a.irreps.map(({id,dimension,characters})=>({id,dimension,characters})),
  corepresentations:a.corepresentations.map(({id,dimension,type,wignerIndicator,unitaryCharacters})=>({id,dimension,type,wignerIndicator,unitaryCharacters})),induced};
});
const productCases=[
 ...[[2,[.173,.217,.319],[.113,.229,.337],false,false],[19,[.173,.217,.319],[.113,.229,.337],false,false],
 [19,[0,0,0],[0,0,0],true,true],[62,[0,.5,0],[0,.5,0],false,false],
 [194,[-1/3,2/3,.5],[-1/3,2/3,.5],true,false],[225,[.5,0,.5],[.5,0,.5],false,false]]
 .map(([id,k1,k2,double1,double2])=>({kind:'sg',id,k1,k2,double1,double2}))];
for(const id of ['1.2','1.3','2.6','19.26','19.28','194.264'])for(const [k1,k2,double1,double2] of [
 [[0,0,0],[0,0,0],true,true],[[.173,.217,.319],[.113,.229,.337],false,false],[[0,0,.5],[0,0,.5],true,false]])
 productCases.push({kind:'msg',id,k1,k2,double1,double2});
const products=productCases.map(c=>{const r=decomposeStarProduct({...c,group:groupFor(c)});return {...c,
 productDimension:r.productDimension,decomposedDimension:r.decomposedDimension,outputs:r.outputs.map(o=>({k:o.k,sectorDimension:o.sectorDimension,
 terms:o.terms.map(({id,dimension,multiplicity,type})=>({id,dimension,multiplicity,...(type?{type}:{})}))}))};});
const trace=parseTrace(read('../dist/examples/trace-msg.txt'));
const group=msg.find(g=>g.id==='166.101'),mapped=matchTraceOperations(trace,group);
const a=analyzeGroup({operations:group.operations,basis:group.basis,k:[0,0,0],doubleValued:true});
const traceBands=mapped.kpoints[0].bands.map(b=>({index:b.index,energy:b.energy,degeneracy:b.degeneracy,
 terms:decomposeCorepresentationCharacters(charactersForAnalysis(mapped.kpoints[0],b,a),a.corepresentations).terms.map(({id,dimension,multiplicity})=>({id,dimension,multiplicity}))}));
const fixture={schemaVersion:1,description:'Gauge-invariant migration fixtures from the existing verified JavaScript algorithms.',
 sourceHashes:Object.fromEntries(['engine.js','induction.js','trace-parser.js'].map(p=>[p,crypto.createHash('sha256').update(read('../dist/'+p)).digest('hex')])),analyses,products,traceBands};
const file=new URL('./fixtures/python-symmetry-reference.json',import.meta.url);
fs.writeFileSync(file,JSON.stringify(fixture,null,2)+'\n');
console.log(`Saved ${analyses.length} analyses, ${analyses.reduce((n,a)=>n+a.induced.length,0)} induced representations, ${products.length} products and real trace reference to ${file.pathname}`);
