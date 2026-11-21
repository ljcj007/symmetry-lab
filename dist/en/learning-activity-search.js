// Each activity has one destination for both the runtime finder and the generated catalog.
export const learningActivities = [
  {
    route: 'compute/phonon-modes?preset=zno-ir',
    title: "ZnO Γ-point infrared and Raman selection rules",
    summary: "Check the vanishing infrared projection for the E₂ modes, then compare normalized Raman weights for parallel and crossed polarizations.",
    keywords: 'wurtzite zinc oxide ZnO Raman infrared polarization E₂ E2 phonon 氧化锌 红外 拉曼 光谱 声子 选择定则 偏振',
    kind: "Lesson",
    activityAliases: [
      'ZnO Raman', 'zinc oxide Raman', 'ZnO E2 Raman', 'ZnO Raman polarization',
      'ZnO Raman selection rules', 'ZnO 拉曼', 'ZnO 拉曼偏振', 'ZnO E₂ 拉曼',
      '氧化锌 拉曼', '氧化锌拉曼', '氧化锌拉曼选择定则'
    ]
  },
  {
    route: 'classroom/foundations?module=mini&experiment=bands&preset=rashba-trim-check',
    title: "Time-reversal test in a Rashba model",
    summary: "Compare the spectra at opposite wavevectors, then use the Hamiltonian to test time reversal for two Zeeman field settings.",
    keywords: 'Rashba TRIM Kramers Zeeman time reversal symmetry Hamiltonian 时间反演 克拉默斯 自旋轨道 能隙 哈密顿量',
    kind: "Lesson",
    activityAliases: [
      'Rashba time reversal', 'Rashba time reversal symmetry', 'Rashba TRIM',
      'Rashba Kramers', 'Rashba Zeeman time reversal', 'Rashba 时间反演',
      'Rashba 时间反演对称', 'Rashba时间反演', 'Rashba 克拉默斯'
    ]
  },
  {
    route: 'classroom/foundations?module=demos&experiment=projection&preset=triangle-permutation',
    title: "Rank of triangle projectors",
    summary: "Translate the S₃ class order to the D₃ order, then verify the ranks of three projectors column by column.",
    keywords: 'triangle projector rank projection matrix S3 D3 character reduction 三顶点 三角形 投影算符 投影矩阵 秩 特征标约化',
    kind: "Lesson",
    activityAliases: [
      'triangle projector rank', 'rank of triangle projectors', 'triangle projection matrix rank',
      'D3 projector rank', 'S3 D3 projection rank', '三顶点 投影矩阵秩',
      '三顶点投影矩阵秩', '三顶点投影秩', '三角形 投影矩阵秩', 'D₃ 投影矩阵秩'
    ]
  },
  {
    route: 'classroom/crystal?track=double&lesson=double-06',
    title: "Spinful screw eigenvalues and the space-group workbench",
    summary: "Run the twofold screw demonstration, then carry the selected axial wavevector to the double-valued workbench for space group 4.",
    keywords: 'double valued spinful twofold screw eigenvalue workbench spinor 2₁ Bloch phase 双值 二重 螺旋轴 本征值 工作台 波矢',
    kind: "Lesson",
    activityAliases: [
      'double screw eigenvalue', 'double screw eigenvalues', 'spinful screw eigenvalue',
      'spinful screw eigenvalues', 'double-valued screw eigenvalues', 'twofold screw eigenvalues',
      '双值螺旋 工作台', '双值螺旋工作台', '双值螺旋本征值', '二重螺旋本征值', '二重螺旋 本征值'
    ]
  }
];
