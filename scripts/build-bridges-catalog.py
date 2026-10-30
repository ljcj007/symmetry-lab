"""Merge bounded original lessons; preserve source files and old catalogs."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
PATHWAYS={'manybody':'observables','polaron':'structure-dynamics','density':'spin','workshop':'crystal'}
result={'schema':'symmetry-lab-bridges-1','release':'20261030-bridges1',**{k:[] for k in ['modules','lessons','exercises','cases','sources']}}
for module,pathway in PATHWAYS.items():
    data=json.loads((ROOT/f'dist/data/{module}-content.json').read_text(encoding='utf8'))
    data['module']['pathway']=pathway; result['modules'].append(data['module'])
    for source in data['sources']:source['id']=module+'-'+source['id']
    for lesson in data['lessons']:lesson['references']=[module+'-'+s for s in lesson['references']]
    for key in ['lessons','exercises','cases','sources']:result[key].extend(data[key])
byid={m['id']:m for m in result['modules']}
exchange=next(p for p in byid['density']['presets'] if p['id']=='exchange')
byid['density']['presets'].append({'id':'exchange-dephasing','title':'项目：相同交换模型加入纯退相干','input':{**exchange['input'],'gammaPhi':.15}})
predictions={
'manybody':[
 ('spectral-sum','interacting-dimer','固定自旋的归一局域探针，添加与移除谱的总离散权重是多少？',['1','电子总数2','随显示展宽任意变化'],0,'反对易关系给出总权重1；谱峰高度、有限窗口面积与完整离散权重不同。'),
 ('spin-gap','spin-dimer','二聚体反对称纵向自旋探针的低能峰主要对应哪种激发？',['添加一个电子','同粒子数的单重态到三重态激发','纯粹的洛伦兹展宽噪声'],1,'自旋算符不改变粒子数；该二聚体的自旋激发能约为0.8284 eV，必须同时检查真实矩阵元。')],
'polaron':[
 ('symmetric-cloud','symmetric-cloud','对称二聚体中两个站点占据均为0.5，能否据此断言没有振动云？',['能，均匀密度意味着没有耦合','不能，应检查条件位移与电子—声子关联','能，只需看总电子数'],1,'整体保持站点交换对称仍可有非平凡条件振动云；电子位置与局域振动可以相关。'),
 ('cutoff-cloud','truncation-warning','声子能低、耦合强而截断仅2时，矩阵求解残差小是否足以相信结果？',['足够','只要能量为负就足够','不足，还要检查截断收敛和最高声子层权重'],2,'有限截断矩阵可以被精确求解，却仍不能代表未截断模型。比较更高截断及顶部概率。')],
'density':[
 ('singlet-mixture','singlet','单重态的单自旋约化态是最大混合态，双自旋整体是什么？',['纯纠缠态','经典混合态','未归一化态'],0,'整体纯度为1、负性为0.5；局部熵非零不意味着整体混合。'),
 ('pure-dephasing','dephasing-plusx','无横向驱动、只有z失谐与纯退相干时，主要发生什么？',['自旋向上概率必须趋于0','相干衰减，z占据保持','密度矩阵迹逐渐损失'],1,'相干在进动中衰减，z占据不变；Lindblad演化保持迹，不能将数值吸收η当作退相干率。')],
'workshop':[
 ('inversion-tr','workshop-inversion','在当前同宇称自旋双态中，同时保留反演和时间反演，能带会怎样？',['每个k保持两重简并','只在Γ简并','Rashba劈裂加倍'],0,'时间反演要求自旋部分为奇，反演要求它为偶；两者合并使d(k)=0。'),
 ('magnetic-term','workshop-magnetic','只保留z旋转时，输入常数mσ_z会怎样？',['被旋转禁止','保留并产生Γ劈裂','只改变两带共同能量'],1,'σ_z与z旋转对易。此预设m=0.4 eV，Γ点分裂为0.8 eV。')]
}
for module,rows in predictions.items():
    byid[module]['predictions']=[dict(id=module+'-'+i,preset=p,question=q,choices=c,answer=a,explanation=e) for i,p,q,c,a,e in rows]
(ROOT/'dist/data/bridges-materials.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print({k:len(result[k]) for k in ['modules','lessons','exercises','cases','sources']})
