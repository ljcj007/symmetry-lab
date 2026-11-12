import fs from 'node:fs';
import {catalogs,learningEntries} from './search-catalog-source.mjs';
const root=new URL('../dist/data/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name+'.json',root),'utf8'));
const entries=learningEntries(catalogs.map(read));
entries.push({route:'classroom/start',title:'零基础导学 · 从操作到矩阵和特征标',summary:'六个短实验：整体对称、重复操作、坐标、矩阵列、迹与后续路线。',keywords:'初学者 零基础 坐标 向量 矩阵 迹 入门 beginner',kind:'课程'});
for(const [experiment,title,keywords] of [
 ['water','水分子振动、红外与拉曼','H2O C2v 选择定则 偏振 光谱'],
 ['characters','矩阵、基函数与特征标','trace 迹 C4 表示矩阵'],
 ['projection','D₃ 三角形投影与基函数','D3 投影算符 SALC 不可约表示'],
 ['splitting','SO(3) → O → D₄ 能级劈裂','SO3 O D4 晶场 d轨道 简并'],
 ['jt','Jahn–Teller 效应与畸变','姜泰勒 John Teller eg 简并'],
 ['macro','晶体的宏观对称性','晶体学限制 点群 空间群 平移 螺旋 滑移']
])entries.push({route:'classroom/foundations?module=demos&experiment='+experiment,title,summary:'基础教学交互演示与分步练习',keywords,kind:'课程'});
for(const [experiment,title] of [['polyhedra','正多面体点群'],['vibrations','简并振动与示意谱'],['bands','布里渊区与能带简并'],['manybody','置换与两自旋多体态'],['time-reversal','时间反演与自旋'],['double-soc','双群与自旋–轨道耦合']])entries.push({route:'classroom/foundations?module=mini&experiment='+experiment,title,summary:'几何、简并与自旋的交互微实验',keywords:title,kind:'课程'});
for(const [experiment,title] of [['rearrangement','重排定理'],['conjugacy','共轭与类'],['normal','正规子群'],['irreducible','可约与不可约表示'],['schur','舒尔引理'],['unitarity','表示的幺正性'],['orthogonality','矩阵元与特征标正交定理'],['reduction','可约表示的约化'],['degeneracy','表示维数与能级简并度']])entries.push({route:'classroom/foundations?module=theorems&experiment='+experiment,title,summary:'有限群定理的交互证明与应用',keywords:title,kind:'课程'});
entries.push({route:'classroom/observables?module=shg-story',title:'Si、GaAs 与 BaTiO₃ · SHG 旗舰实验',summary:'预测 → 计算 → 解释 → 反例验证',keywords:'反演 二次谐波 倍频 SHG',kind:'课程'});
for(const [mode,name,field]of [['sg','space-groups','groups'],['msg','magnetic-groups','groups'],['mpg','points','points']])for(const g of read(name)[field])entries.push({route:'atlas/'+mode+'?q='+encodeURIComponent(String(mode==='sg'?g.number:g.id)),title:(mode==='sg'?'空间群 ':mode==='msg'?'磁空间群 ':'磁点群 ')+(mode==='sg'?g.number:g.id)+' · '+(g.bcSymbol||g.symbol),summary:g.ogId?'OG '+g.ogId:g.pointGroup||g.lattice||'',keywords:[g.symbol,g.bcSymbol,g.ogId].filter(Boolean).join(' '),kind:'群目录'});
const output=JSON.stringify({schema:1,entries})+'\n',target=new URL('search-index.json',root);
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Search index is stale');}
else fs.writeFileSync(target,output);
console.log('Search index:',entries.length,'entries,',Buffer.byteLength(output),'bytes; no group operation matrices.');
