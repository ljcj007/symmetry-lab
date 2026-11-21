import {activityAliases} from './learning-activity-aliases.js?v=20261122-antisc1';

// Each activity has one destination for both the runtime finder and the generated catalog.
export const learningActivities = [
  {
    route: 'compute/phonon-modes?preset=zno-ir',
    title: 'ZnO Γ 点红外与拉曼选择定则',
    summary: '核对 E₂ 模式的零红外投影，再比较平行和交叉偏振的归一化拉曼权重。',
    keywords: 'wurtzite zinc oxide ZnO Raman infrared polarization E₂ E2 phonon 氧化锌 红外 拉曼 光谱 声子 选择定则 偏振',
    kind: '课程',
    activityAliases: activityAliases.znoRaman
  },
  {
    route: 'classroom/foundations?module=mini&experiment=bands&preset=rashba-trim-check',
    title: 'Rashba 模型的时间反演检验',
    summary: '比较正负波矢的能谱，再用哈密顿量检验两个 Zeeman 场设置下的时间反演。',
    keywords: 'Rashba TRIM Kramers Zeeman time reversal symmetry Hamiltonian 时间反演 克拉默斯 自旋轨道 能隙 哈密顿量',
    kind: '课程',
    activityAliases: activityAliases.rashbaTimeReversal
  },
  {
    route: 'classroom/foundations?module=demos&experiment=projection&preset=triangle-permutation',
    title: '三顶点投影矩阵的秩',
    summary: '把 S₃ 类顺序转换到 D₃，再逐列验证三个投影的秩。',
    keywords: 'triangle projector rank projection matrix S3 D3 character reduction 三顶点 三角形 投影算符 投影矩阵 秩 特征标约化',
    kind: '课程',
    activityAliases: activityAliases.triangleProjection
  },
  {
    route: 'classroom/crystal?track=double&lesson=double-06',
    title: '双值螺旋本征值与空间群工作台',
    summary: '完成二重螺旋演示后，把选定的轴向波矢带入第 4 号空间群的双值工作台。',
    keywords: 'double valued spinful twofold screw eigenvalue workbench spinor 2₁ Bloch phase 双值 二重 螺旋轴 本征值 工作台 波矢',
    kind: '课程',
    activityAliases: activityAliases.doubleScrew
  },
  {
    route: 'classroom/spin?track=magnetic&lesson=magnetic-04',
    title: '反幺正螺旋与区边界简并',
    summary: '用 BNS 4.8 的三个离轴波矢区分动量返回与等能配对。',
    keywords: 'antiunitary screw nodal plane zone boundary time reversal BNS 4.8 反幺正 螺旋 磁群 区边界 简并 小群',
    kind: '课程',
    activityAliases: activityAliases.antiunitaryScrew
  }
];
