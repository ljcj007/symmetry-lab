import fs from 'node:fs';
import {catalogs,learningEntries} from './search-catalog-source.mjs';
const root=new URL('../dist/data/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name+'.json',root),'utf8'));
const entries=learningEntries(catalogs.map(read));
entries.push({route:'classroom/observables?module=shg-story',title:'Si、GaAs 与 BaTiO₃ · SHG 旗舰实验',summary:'预测 → 计算 → 解释 → 反例验证',keywords:'反演 二次谐波 倍频 SHG',kind:'课程'});
for(const [mode,name,field]of [['sg','space-groups','groups'],['msg','magnetic-groups','groups'],['mpg','points','points']])for(const g of read(name)[field])entries.push({route:'atlas/'+mode+'?q='+encodeURIComponent(String(mode==='sg'?g.number:g.id)),title:(mode==='sg'?'空间群 ':mode==='msg'?'磁空间群 ':'磁点群 ')+(mode==='sg'?g.number:g.id)+' · '+(g.bcSymbol||g.symbol),summary:g.ogId?'OG '+g.ogId:g.pointGroup||g.lattice||'',keywords:[g.symbol,g.bcSymbol,g.ogId].filter(Boolean).join(' '),kind:'群目录'});
const output=JSON.stringify({schema:1,entries})+'\n',target=new URL('search-index.json',root);
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Search index is stale');}
else fs.writeFileSync(target,output);
console.log('Search index:',entries.length,'entries,',Buffer.byteLength(output),'bytes; no group operation matrices.');
