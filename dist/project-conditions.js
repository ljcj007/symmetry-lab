// Display metadata is derived from the registered controls and project inputs.
// It does not relax stage acceptance or change any captured input or result.
const descriptors = {
  "manybody_spectra_lab": {
    "experiment": {
      "label": "实验类型",
      "options": [
        [
          "single_particle",
          "单粒子添加/移除谱"
        ],
        [
          "response",
          "固定粒子数的连通响应"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "sites": {
      "label": "站点数 L",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "nUp": {
      "label": "上自旋电子数 N↑（不超过L）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "nDown": {
      "label": "下自旋电子数 N↓（不超过L）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "boundary": {
      "label": "边界条件",
      "options": [
        [
          "open",
          "开链"
        ],
        [
          "periodic",
          "首尾相连；两站点只计一条键"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "hopping": {
      "label": "跃迁 t（eV）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "interactionU": {
      "label": "同站点排斥 U（eV）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "alternatingPotential": {
      "label": "交错位能 Δ（eV；0号站点为+Δ/2）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "probe": {
      "label": "探针的空间形状",
      "options": [
        [
          "local",
          "选定局域站点"
        ],
        [
          "momentum",
          "归一化有限链傅里叶探针"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "site": {
      "label": "局域探针站点（从0开始；不超过L−1）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "q": {
      "label": "傅里叶探针 q a/π（局域探针时忽略）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "spin": {
      "label": "单粒子探针的自旋",
      "options": [
        [
          "up",
          "上自旋"
        ],
        [
          "down",
          "下自旋"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "chemicalPotential": {
      "label": "谱能量零点 μ（eV；不改变粒子数）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "responseKind": {
      "label": "连通响应算符",
      "options": [
        [
          "spin",
          "纵向自旋（z 分量）"
        ],
        [
          "charge",
          "电荷密度 n"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "eta": {
      "label": "Lorentz半高半宽 η（eV）",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "points": {
      "label": "谱线采样点数",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    }
  },
  "polaron_lab": {
    "hopping": {
      "label": "电子跃迁 t（eV）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "phononEnergy": {
      "label": "声子量子能量 ℏω（eV）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "coupling": {
      "label": "局域耦合 g（eV）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "siteBias": {
      "label": "位能差 Δ=ε₀−ε₁（eV）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "cutoff": {
      "label": "每振子的最大声子数",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "scanMaxCoupling": {
      "label": "g 扫描上限（eV）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "scanPoints": {
      "label": "扫描点数（1表示仅当前g）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    }
  },
  "density_matrix_lab": {
    "experiment": {
      "label": "实验规模",
      "options": [
        [
          "single",
          "单自旋：Rabi 与退相干"
        ],
        [
          "pair",
          "双自旋：交换与纠缠"
        ]
      ],
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "initialState": {
      "label": "初态（反平行、单重态、经典混合仅用于双自旋）",
      "options": [
        [
          "plus_z",
          "↑ / ↑↑"
        ],
        [
          "minus_z",
          "↓ / ↓↓"
        ],
        [
          "plus_x",
          "+x / +x⊗+x"
        ],
        [
          "antiparallel",
          "双自旋 ↑↓"
        ],
        [
          "singlet",
          "双自旋单重态"
        ],
        [
          "classical",
          "双自旋 ↑↓ 与 ↓↑ 经典等权混合"
        ],
        [
          "thermal",
          "当前 Hamiltonian 的热初态"
        ]
      ],
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "drive": {
      "label": "驱动 Ω（rad/ns）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "detuning": {
      "label": "失谐 Δ（rad/ns）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "exchange": {
      "label": "交换 J（rad/ns；H/ℏ 含 J S_A·S_B）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "gradient": {
      "label": "局域失谐差 δ（rad/ns；A−B）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "gamma1": {
      "label": "↑→↓ 弛豫率 γ₁（ns⁻¹）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "gammaPhi": {
      "label": "纯退相干率 γ_φ（ns⁻¹）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "thermalScale": {
      "label": "热初态 kBT/ℏ（rad/ns；仅热初态使用）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "duration": {
      "label": "总演化时间（ns）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "points": {
      "label": "时间采样点数",
      "source": "dist/data/bridges-materials.json#density.fields"
    }
  },
  "symmetry_workshop": {
    "pointGroup": {
      "label": "起始生成元",
      "options": [
        [
          "c2v",
          "C₂ᵥ"
        ],
        [
          "c3v",
          "C₃ᵥ"
        ],
        [
          "c4v",
          "C₄ᵥ"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "rotation": {
      "label": "保留绕 z 轴旋转",
      "options": [
        [
          1,
          "启用"
        ],
        [
          0,
          "关闭"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "mirror": {
      "label": "保留 xz 镜面",
      "options": [
        [
          1,
          "启用"
        ],
        [
          0,
          "关闭"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "inversion": {
      "label": "额外施加反演",
      "options": [
        [
          1,
          "启用"
        ],
        [
          0,
          "关闭"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "timeReversal": {
      "label": "保留时间反演",
      "options": [
        [
          1,
          "启用"
        ],
        [
          0,
          "关闭"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "rashba": {
      "label": "Rashba 型系数 α（约化 k 坐标；能量 eV）",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "dresselhaus": {
      "label": "输入各向异性系数 β（约化 k 坐标；能量 eV）",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "mass": {
      "label": "输入 σ_z 常数项 m（约化 k 坐标；能量 eV）",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "fieldX": {
      "label": "输入 σ_x 常数项 b_x（约化 k 坐标；能量 eV）",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "curvature": {
      "label": "输入各向同性曲率 c（约化 k 坐标；能量 eV）",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    }
  },
  "statistics_lab": {
    "mode": {
      "label": "粒子空间",
      "options": [
        [
          "two",
          "两电子：轨道 × 自旋"
        ],
        [
          "three",
          "S₃：三个二能级因子"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    },
    "orbital": {
      "label": "两电子轨道态",
      "options": [
        [
          "same",
          "同一轨道 aa"
        ],
        [
          "symmetric",
          "(ab + ba) / √2"
        ],
        [
          "antisymmetric",
          "(ab − ba) / √2"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    },
    "spin": {
      "label": "两电子自旋态",
      "options": [
        [
          "singlet",
          "单重态"
        ],
        [
          "triplet0",
          "三重态 m=0"
        ],
        [
          "upup",
          "三重态 m=1"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    },
    "swap": {
      "label": "S₃ 交换操作",
      "options": [
        [
          "12",
          "交换 1 与 2"
        ],
        [
          "23",
          "交换 2 与 3"
        ],
        [
          "13",
          "交换 1 与 3"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    }
  },
  "defects_lab": {
    "model": {
      "label": "序参量空间",
      "options": [
        [
          "xy",
          "XY：平面矢量 S¹"
        ],
        [
          "nematic",
          "平面向列：RP¹"
        ],
        [
          "ising",
          "Ising：两个离散真空"
        ]
      ],
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "texture": {
      "label": "XY / 向列纹理",
      "options": [
        [
          "pair",
          "涡旋—反涡旋对"
        ],
        [
          "single",
          "单个涡旋"
        ]
      ],
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "separation": {
      "label": "核心间距 d",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "loopX": {
      "label": "环路中心 x / 畴壁中心",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "loopY": {
      "label": "环路中心 y",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "radius": {
      "label": "环路半径 / 畴壁宽度",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "phase": {
      "label": "整体转角（度）",
      "source": "dist/data/connections-materials.json#defects.fields"
    }
  },
  "reciprocity_lab": {
    "model": {
      "label": "响应变量",
      "options": [
        [
          "hall",
          "二维电响应 / Hall"
        ],
        [
          "thermo",
          "电荷—能量：两偶变量"
        ],
        [
          "mixed",
          "抽象通道：一偶一奇"
        ]
      ],
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "space": {
      "label": "Hall 的空间操作",
      "options": [
        [
          "c1",
          "恒等操作"
        ],
        [
          "c4",
          "四重旋转"
        ],
        [
          "mirror",
          "镜面：同时变换轴矢量 Bz、Mz"
        ]
      ],
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "a": {
      "label": "对角响应 a",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "b": {
      "label": "对角响应 b",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "cross": {
      "label": "对称耦合系数 c",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "odd": {
      "label": "反对称耦合系数 d",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "field": {
      "label": "外磁场 B（无量纲）",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "magnetization": {
      "label": "磁化 M（无量纲）",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "reverseM": {
      "label": "比较实验是否同时反转 M",
      "options": [
        [
          "yes",
          "是：反转 B 与 M"
        ],
        [
          "no",
          "否：只反转 B"
        ]
      ],
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "violation": {
      "label": "故意加入的互易破坏项 δ",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "forceX": {
      "label": "共轭力 X₁",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "forceY": {
      "label": "共轭力 X₂",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    }
  },
  "salc_lab": {
    "copies": {
      "label": "等价四轨道副本数",
      "options": [
        [
          1,
          "1套：四维"
        ],
        [
          2,
          "2套：八维，含重复不可约表示"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "targetIrrep": {
      "label": "投影和子空间作业目标",
      "options": [
        [
          "A1",
          "A₁：全对称"
        ],
        [
          "B1",
          "B₁：x²−y²型"
        ],
        [
          "E",
          "E：二维伙伴"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "seedSite": {
      "label": "第1副本中的种子轨道",
      "options": [
        [
          0,
          "站点1：+x"
        ],
        [
          1,
          "站点2：+y"
        ],
        [
          2,
          "站点3：−x"
        ],
        [
          3,
          "站点4：−y"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "operatorType": {
      "label": "实际算符类型",
      "options": [
        [
          "dipole",
          "E：面内极向量偶极"
        ],
        [
          "scalar",
          "A₁：单位算符"
        ],
        [
          "quadrupole",
          "B₁：X²−Y²"
        ],
        [
          "axial",
          "A₂：环流型厄米算符"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "polarizationAngle": {
      "label": "线偏振角 θ（度，仅作用于偶极）",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "operatorScale": {
      "label": "算符幅值（相对单位）",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "hop": {
      "label": "相邻站点跃迁 t（相对单位）",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "crossHop": {
      "label": "副本间同位点跃迁（仅两副本）",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "copyOffset": {
      "label": "第二副本能量偏移（仅两副本）",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "anisotropy": {
      "label": "B₁型扰动幅值 δ（群平均后加入）",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "retainC4": {
      "label": "保留四重旋转约束",
      "options": [
        [
          1,
          "保留 C₄z"
        ],
        [
          0,
          "移除 C₄z 约束"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "retainMirror": {
      "label": "保留xz镜面约束",
      "options": [
        [
          1,
          "保留 xz 镜面"
        ],
        [
          0,
          "移除 xz 镜面约束"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    }
  },
  "wavevector_lab": {
    "period": {
      "label": "声明超胞 N×N",
      "options": [
        [
          2,
          "2×2：4 位点"
        ],
        [
          3,
          "3×3：9 位点"
        ],
        [
          4,
          "4×4：16 位点"
        ]
      ],
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "qx": {
      "label": "q_x 分子（q_x / N）",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "qy": {
      "label": "q_y 分子（q_y / N）",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "pattern": {
      "label": "激活的共轭对",
      "options": [
        [
          "single",
          "单对：输入 q 与 −q"
        ],
        [
          "multi",
          "多对：完整星的各共轭对"
        ]
      ],
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "amplitude": {
      "label": "首对幅度 A（无量纲）",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "transverseRatio": {
      "label": "其他共轭对 / 首对幅度",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "phaseDegrees": {
      "label": "首对相位 φ / 度",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "relativePhaseDegrees": {
      "label": "其他共轭对相对相位 / 度",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    }
  },
  "nonsymmorphic_lab": {
    "operation": {
      "label": "三维空间操作",
      "options": [
        [
          "glide",
          "滑移：法向 y 的镜面 + aₓ/2 平移"
        ],
        [
          "screw",
          "二重螺旋：绕 x 旋转 180° + aₓ/2 平移"
        ]
      ],
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "spinful": {
      "label": "单值或双值表示",
      "options": [
        [
          "true",
          "自旋 1/2：四带双值模型"
        ],
        [
          "false",
          "无自旋：两带单值模型"
        ]
      ],
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "hopping": {
      "label": "跃迁 t（任意能量单位）",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "spinOrbit": {
      "label": "双值耦合 λ（单值模型忽略）",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "mass": {
      "label": "破坏 G 的质量 m，保留 T",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "zeeman": {
      "label": "破坏 T 的系数 b，保留 G",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "shift": {
      "label": "共同色散 ε cos(k_x)",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "kFraction": {
      "label": "回放与作业位置 f_x=k_x/(2π)",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "transverseY": {
      "label": "横向倒格分量 f_y：检验小群",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "transverseZ": {
      "label": "横向倒格分量 f_z：检验小群/TRIM",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "points": {
      "label": "能带采样点（另含解析交叉点）",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    }
  },
  "layer_symmetry_lab": {
    "face": {
      "label": "母体切面",
      "options": [
        [
          "001",
          "(001) 方形面"
        ],
        [
          "110",
          "(110) 矩形面"
        ],
        [
          "111",
          "(111) 三角面"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "layers": {
      "label": "有限原子层数",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "bulk": {
      "label": "层成分",
      "options": [
        [
          "mono",
          "相同元素层"
        ],
        [
          "alternating",
          "A/B 交替层"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "cut": {
      "label": "交替层切割起点",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "interface": {
      "label": "界面标签",
      "options": [
        [
          "same",
          "同质两侧"
        ],
        [
          "hetero",
          "异质两侧"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "termination": {
      "label": "表面终止",
      "options": [
        [
          "same",
          "保留原层标签"
        ],
        [
          "marker",
          "上表面标记 C"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "registry": {
      "label": "上半部分错位（第一面内基矢）",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "pathEnd": {
      "label": "错位路径终点",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    }
  },
  "chirality_polarity_lab": {
    "motif": {
      "label": "有限结构原型",
      "options": [
        [
          "d3",
          "D3 手性非极性"
        ],
        [
          "pyramid",
          "C4v 极性锥体"
        ],
        [
          "octahedron",
          "Oh 八面体"
        ],
        [
          "tetra",
          "四个不同标签的位点"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "handedness": {
      "label": "构型与其镜像",
      "options": [
        [
          1,
          "原构型"
        ],
        [
          -1,
          "镜像构型"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "noise": {
      "label": "确定性位移幅度",
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "tolerance": {
      "label": "候选操作的距离容差",
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "optical": {
      "label": "独立往返偏振模型",
      "options": [
        [
          "natural",
          "自然旋光"
        ],
        [
          "faraday",
          "Faraday 旋转"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "angle": {
      "label": "单程旋转角（度，教学输入）",
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    }
  },
  "manybody_spt_lab": {
    "sites": {
      "label": "自旋 1 位点数（有限链）",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "boundary": {
      "label": "边界",
      "options": [
        [
          "periodic",
          "周期边界"
        ],
        [
          "open",
          "开边界"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "anisotropy": {
      "label": "单离子各向异性 D/J",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "field": {
      "label": "倾斜场 h/J",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "fieldPattern": {
      "label": "场的空间分布",
      "options": [
        [
          "gradient",
          "位点梯度"
        ],
        [
          "uniform",
          "均匀"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "pathAxis": {
      "label": "路径改变的参数",
      "options": [
        [
          "anisotropy",
          "D/J"
        ],
        [
          "field",
          "h/J"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "pathEnd": {
      "label": "路径终点（D ≤ 8；h ≤ 1）",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    }
  },
  "band_rep_lab": {
    "group": {
      "label": "普通空间群（本站 BC 设置）",
      "options": [
        [
          2,
          "2 · P−1"
        ],
        [
          4,
          "4 · P2₁（轴 z）"
        ],
        [
          19,
          "19 · P2₁2₁2₁"
        ],
        [
          221,
          "221 · Pm−3m"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "site": {
      "label": "位点种子（自动适用于所有群）",
      "options": [
        [
          "auto",
          "自动选择：2/221 原点；4/19 一般位置"
        ],
        [
          "origin",
          "原点：仅群 2/221"
        ],
        [
          "body",
          "体心反演中心：仅群 2/221"
        ],
        [
          "general",
          "一般位置：仅群 2/4/19"
        ],
        [
          "faces",
          "面心 3c：仅群 221"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "orbitals": {
      "label": "每个位点的局域轨道",
      "options": [
        [
          "s",
          "s 标量（1 维）"
        ],
        [
          "p",
          "完整 p 轨道极性向量（x、y、z 三分量；3 维）"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "kPoint": {
      "label": "倒格分数坐标中的 k 点",
      "options": [
        [
          "G",
          "Γ = (0,0,0)"
        ],
        [
          "X",
          "(1/2,0,0)"
        ],
        [
          "Y",
          "(0,1/2,0)"
        ],
        [
          "Z",
          "(0,0,1/2)"
        ],
        [
          "M",
          "(1/2,1/2,0)"
        ],
        [
          "R",
          "(1/2,1/2,1/2)"
        ],
        [
          "line",
          "(0,0,kz)：使用下面的参数"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "kz": {
      "label": "线上 kz（仅选择 line 时使用）",
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    }
  },
  "dynamic_scattering_lab": {
    "lattice": {
      "label": "原胞长度 a（Å）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "massA": {
      "label": "A 原子质量（amu）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "massB": {
      "label": "B 原子质量（amu）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "springIntra": {
      "label": "胞内弹簧 K₁（eV/Å²）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "springInter": {
      "label": "胞间弹簧 K₂（eV/Å²）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "basisFraction": {
      "label": "B 的原胞分数位置 s",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "scatterA": {
      "label": "A 相干振幅 bA（相对）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "scatterB": {
      "label": "B 相干振幅 bB（相对）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "angle": {
      "label": "Q 与链轴夹角 θ（°）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "selectedQ": {
      "label": "选定完整 Q（Å⁻¹）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "temperature": {
      "label": "温度 T（K）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "sigma": {
      "label": "Gaussian 标准差 σ（meV）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "energyCutoff": {
      "label": "低能排除阈值（meV）",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "channel": {
      "label": "热图显示通道",
      "options": [
        [
          "both",
          "Stokes + anti-Stokes"
        ],
        [
          "stokes",
          "Stokes · 创建声子"
        ],
        [
          "antiStokes",
          "anti-Stokes · 湮灭声子"
        ]
      ],
      "source": "dist/data/pathways-materials.json#scattering.fields"
    }
  },
  "domain_wall_lab": {
    "experiment": {
      "label": "选择实验",
      "options": [
        [
          "landau",
          "连续序参量畴壁"
        ],
        [
          "ssh",
          "SSH 界面与局域态"
        ]
      ],
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "kappa": {
      "label": "梯度系数 κ（约化）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "beta": {
      "label": "双阱系数 β（约化）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "amplitude": {
      "label": "极小值幅度 v（约化）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "extent": {
      "label": "半区间长度 / ξ",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "gridPoints": {
      "label": "粗网格点数（奇数）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "sites": {
      "label": "开放链格点数（偶数）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "hopping": {
      "label": "平均跃迁 t（eV）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "dimerization": {
      "label": "渐近二聚化 δ",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "sshWidth": {
      "label": "界面宽度（键间距）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "onsite": {
      "label": "中心两格点势（eV）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "probeEnergy": {
      "label": "观察能量（eV）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "eta": {
      "label": "LDOS 展宽 η（eV）",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "interface": {
      "label": "键序结构",
      "options": [
        [
          "wall",
          "二聚化反号界面"
        ],
        [
          "uniform",
          "均匀二聚化参照"
        ]
      ],
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    }
  },
  "hubbard_lab": {
    "sites": {
      "label": "站点数 L",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "nUp": {
      "label": "上自旋电子数 N↑（不超过 L）",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "nDown": {
      "label": "下自旋电子数 N↓（不超过 L）",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "boundary": {
      "label": "边界条件",
      "options": [
        [
          "open",
          "开边界：相邻站点成键"
        ],
        [
          "periodic",
          "周期边界：首尾相连；二站点仅一条键"
        ]
      ],
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "hopping": {
      "label": "跃迁 t（eV）",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "interactionU": {
      "label": "同站点排斥 U（eV）",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "alternatingPotential": {
      "label": "交错位能差 Δ（eV；首站点为 +Δ/2）",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "scanMaxU": {
      "label": "U 扫描上限（eV）",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "scanPoints": {
      "label": "U 扫描点数",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    }
  },
  "order_parameter_lab": {
    "pointGroup": {
      "label": "母群与极向量表示",
      "options": [
        [
          "c4v",
          "C₄ᵥ：二维序参量（x、y 分量）"
        ],
        [
          "oh",
          "Oₕ：三维序参量（x、y、z 分量）"
        ]
      ],
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "etaX": {
      "label": "η_x（无量纲）",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "etaY": {
      "label": "η_y（无量纲）",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "etaZ": {
      "label": "η_z（三维时使用）",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "a2": {
      "label": "二阶系数 a₂",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "b4": {
      "label": "四阶 Ση_i⁴ 系数 b₄",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "c4": {
      "label": "四阶 Σ_{i<j}η_i²η_j² 系数 c₄",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "d6": {
      "label": "六阶 Ση_i⁶ 系数 d₆",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "e6": {
      "label": "六阶 Σ_{i≠j}η_i⁴η_j² 系数 e₆",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "f6": {
      "label": "六阶 η_x²η_y²η_z² 系数 f₆（三维）",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "fieldX": {
      "label": "外场 h_x：能量项 −h_xη_x",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "basisAngle": {
      "label": "被动坐标旋转角（度）",
      "source": "dist/data/principles-materials.json#order.fields"
    }
  },
  "exchange_symmetry_lab": {
    "isotropic": {
      "label": "各向同性交换 J（单位：meV；正值偏好反平行）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "anisotropyX": {
      "label": "无迹对称对角项 Γ_{xx}（单位：meV）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "anisotropyY": {
      "label": "无迹对称对角项 Γ_{yy}（单位：meV；Γ_{zz}=−Γ_{xx}−Γ_{yy}）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "symmetricXY": {
      "label": "对称交换 Γ_{xy}=Γ_{yx}（单位：meV）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "symmetricXZ": {
      "label": "对称交换 Γ_{xz}=Γ_{zx}（单位：meV）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "symmetricYZ": {
      "label": "对称交换 Γ_{yz}=Γ_{zy}（单位：meV）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "dx": {
      "label": "DMI 分量 D_x（单位：meV；有向键 i→j）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "dy": {
      "label": "DMI 分量 D_y（单位：meV；有向键 i→j）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "dz": {
      "label": "DMI 分量 D_z（单位：meV；有向键 i→j）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "inversion": {
      "label": "键中心反演：交换两个端点",
      "options": [
        [
          0,
          "关闭"
        ],
        [
          1,
          "保留"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "mirrorXY": {
      "label": "包含键的 xy 镜面",
      "options": [
        [
          0,
          "关闭"
        ],
        [
          1,
          "保留"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "mirrorXZ": {
      "label": "包含键的 xz 镜面",
      "options": [
        [
          0,
          "关闭"
        ],
        [
          1,
          "保留"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "mirrorYZ": {
      "label": "垂直键的 yz 镜面：交换端点",
      "options": [
        [
          0,
          "关闭"
        ],
        [
          1,
          "保留"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "rotationOrder": {
      "label": "绕有向键 x 轴旋转",
      "options": [
        [
          0,
          "不施加旋转"
        ],
        [
          2,
          "二重旋转"
        ],
        [
          4,
          "四重旋转"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "conventionAngle": {
      "label": "仅换坐标：新坐标轴绕旧 z 轴转角（°）",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "swapSites": {
      "label": "仅换约定：是否交换端点标签 i、j",
      "options": [
        [
          0,
          "保持 i→j"
        ],
        [
          1,
          "交换 i 与 j"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    }
  },
  "conservation_lab": {
    "experiment": {
      "label": "自旋模型",
      "options": [
        [
          "pair",
          "两个自旋1/2"
        ],
        [
          "single",
          "单个自旋1/2"
        ]
      ],
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "initialState": {
      "label": "初态（反平行、单重态仅限双自旋）",
      "options": [
        [
          "up",
          "↑ / ↑↑"
        ],
        [
          "down",
          "↓ / ↓↓"
        ],
        [
          "plus_x",
          "+x / +x⊗+x"
        ],
        [
          "antiparallel",
          "↑↓"
        ],
        [
          "singlet",
          "双自旋单重态"
        ],
        [
          "mixed",
          "最大混合态 I/d"
        ]
      ],
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "observable": {
      "label": "重点检查的观测量",
      "options": [
        [
          "sx",
          "总自旋 x 分量"
        ],
        [
          "sy",
          "总自旋 y 分量"
        ],
        [
          "sz",
          "总自旋 z 分量"
        ],
        [
          "s2",
          "总自旋 S²"
        ],
        [
          "energy",
          "H/ℏ"
        ]
      ],
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "jx": {
      "label": "交换 J_x（rad/ns）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "jy": {
      "label": "交换 J_y（rad/ns）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "jz": {
      "label": "交换 J_z（rad/ns）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "fieldX": {
      "label": "统一横场系数 h_x（rad/ns）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "fieldZ": {
      "label": "统一纵场系数 h_z（rad/ns）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "gradientZ": {
      "label": "纵场差 δ（rad/ns；两站点差，系数为δ/2）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "gamma1": {
      "label": "独立 ↑→↓ 弛豫率 γ_1（ns⁻¹）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "gammaPhi": {
      "label": "独立z纯退相干率 γ_φ（ns⁻¹）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "duration": {
      "label": "演化时间（ns）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "points": {
      "label": "采样点数",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "basisAngle": {
      "label": "约定对照：绕y的被动换基角（度）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    }
  },
  "hall_response_lab": {
    "mass": {
      "label": "QWZ 质量参数 m（无量纲）",
      "source": "dist/response-views.js#fields.hall"
    },
    "energyScale": {
      "label": "能量尺度（eV）",
      "source": "dist/response-views.js#fields.hall"
    },
    "temperature": {
      "label": "温度（K）",
      "source": "dist/response-views.js#fields.hall"
    },
    "chemicalPotential": {
      "label": "化学势 μ（eV）",
      "source": "dist/response-views.js#fields.hall"
    },
    "mesh": {
      "label": "每方向积分网格 N",
      "source": "dist/response-views.js#fields.hall"
    },
    "muMin": {
      "label": "μ 扫描起点（eV）",
      "source": "dist/response-views.js#fields.hall"
    },
    "muMax": {
      "label": "μ 扫描终点（eV）",
      "source": "dist/response-views.js#fields.hall"
    },
    "scanPoints": {
      "label": "扫描点数",
      "source": "dist/response-views.js#fields.hall"
    }
  },
  "device_transport_lab": {
    "model": {
      "label": "器件模型",
      "options": [
        [
          "uniform",
          "均匀链"
        ],
        [
          "ssh",
          "SSH 交替键链"
        ]
      ],
      "source": "dist/response-views.js#fields.device"
    },
    "sites": {
      "label": "器件格点数",
      "source": "dist/response-views.js#fields.device"
    },
    "hopping": {
      "label": "基准跃迁（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "dimerRatio": {
      "label": "SSH 胞内 / 胞间跃迁比 t₁/t₂",
      "source": "dist/response-views.js#fields.device"
    },
    "gate": {
      "label": "均匀栅压能（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "barrier": {
      "label": "局域势垒高度（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "leadHopping": {
      "label": "电极跃迁（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "leadOnsite": {
      "label": "电极在位能（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "contactLeft": {
      "label": "左接触跃迁（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "contactRight": {
      "label": "右接触跃迁（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "energy": {
      "label": "观察能量（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "eta": {
      "label": "Green 函数展宽 η（eV）",
      "source": "dist/response-views.js#fields.device"
    },
    "spinDegeneracy": {
      "label": "独立自旋通道数",
      "options": [
        [
          1,
          "1 · 无自旋模型"
        ],
        [
          2,
          "2 · 两个相同独立自旋通道"
        ]
      ],
      "source": "dist/response-views.js#fields.device"
    }
  },
  "local_multiplet_lab": {
    "electrons": {
      "label": "d 壳层电子数 N",
      "source": "dist/response-views.js#fields.multiplet"
    },
    "coordination": {
      "label": "理想晶场",
      "options": [
        [
          "octahedral",
          "八面体 Oₕ"
        ],
        [
          "tetrahedral",
          "四面体 Tᵈ"
        ]
      ],
      "source": "dist/response-views.js#fields.multiplet"
    },
    "splitting": {
      "label": "晶场分裂 Δ（eV）",
      "source": "dist/response-views.js#fields.multiplet"
    },
    "coulombU": {
      "label": "同轨道排斥 U（eV）",
      "source": "dist/response-views.js#fields.multiplet"
    },
    "hundJ": {
      "label": "Hund 耦合 J（eV）",
      "source": "dist/response-views.js#fields.multiplet"
    }
  },
  "spin_resonance_lab": {
    "spin": {
      "label": "电子有效自旋 S",
      "options": [
        [
          0.5,
          "0.5"
        ],
        [
          1,
          "1"
        ],
        [
          1.5,
          "1.5"
        ],
        [
          2,
          "2"
        ],
        [
          2.5,
          "2.5"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "field": {
      "label": "静磁场 B（T）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "theta": {
      "label": "静磁场极角 θ（°）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "phi": {
      "label": "静磁场方位角 φ（°）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "gX": {
      "label": "主轴 gₓ",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "gY": {
      "label": "主轴 gᵧ",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "gZ": {
      "label": "主轴 g_z",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "zeroFieldD": {
      "label": "零场分裂 D（GHz）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "zeroFieldE": {
      "label": "零场分裂 E（GHz）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "temperature": {
      "label": "温度（K）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "polarization": {
      "label": "微波磁场方向",
      "options": [
        [
          "theta",
          "eθ · 横向"
        ],
        [
          "phi",
          "eφ · 横向"
        ],
        [
          "parallel",
          "平行静磁场"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "nuclearSpin": {
      "label": "核自旋 I",
      "options": [
        [
          0,
          "0"
        ],
        [
          0.5,
          "0.5"
        ],
        [
          1,
          "1"
        ],
        [
          1.5,
          "1.5"
        ],
        [
          2,
          "2"
        ],
        [
          2.5,
          "2.5"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "hyperfinePerp": {
      "label": "横向超精细 A⊥（GHz）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "hyperfineParallel": {
      "label": "纵向超精细 A∥（GHz）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "nuclearGamma": {
      "label": "核旋磁比 γₙ（GHz/T）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    }
  },
  "andreev_lab": {
    "sites": {
      "label": "正常散射区格点数",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "hopping": {
      "label": "共同跃迁 t（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "chemicalPotential": {
      "label": "共同化学势 μ（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "gap": {
      "label": "右电极配对 Δ（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "energy": {
      "label": "观察能量 E（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "barrier": {
      "label": "局域势垒（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "barrierStart": {
      "label": "势垒格点（从 0 编号）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "gate": {
      "label": "正常区栅压能（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "contactLeft": {
      "label": "左接触跃迁（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "contactRight": {
      "label": "右接触跃迁（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "eta": {
      "label": "数值展宽 η（eV）",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    }
  },
  "atomic_spectra_lab": {
    "configuration": {
      "label": "初态价壳层",
      "options": [
        [
          "d8",
          "d⁸ · Ni²⁺ 离子背景"
        ],
        [
          "d9",
          "d⁹ · Cu²⁺ 离子背景"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "tenDq": {
      "label": "立方晶场 10Dq（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "tetragonal": {
      "label": "四方晶场参数（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "socD": {
      "label": "3d 自旋轨道系数（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "socP": {
      "label": "2p 自旋轨道系数（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "fieldTesla": {
      "label": "z 向磁场（T）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "temperature": {
      "label": "温度（K）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "polarization": {
      "label": "入射电场偏振",
      "options": [
        [
          "x",
          "线偏振 x"
        ],
        [
          "y",
          "线偏振 y"
        ],
        [
          "z",
          "线偏振 z"
        ],
        [
          "plus",
          "(x+i y)/√2"
        ],
        [
          "minus",
          "(x−i y)/√2"
        ],
        [
          "linear",
          "xz 平面连续线偏振"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "F0": {
      "label": "3d–3d F⁰（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "F2": {
      "label": "3d–3d F²（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "F4": {
      "label": "3d–3d F⁴（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdF0": {
      "label": "2p–3d F⁰（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdF2": {
      "label": "2p–3d F²（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdG1": {
      "label": "2p–3d G¹（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdG3": {
      "label": "2p–3d G³（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    }
  },
  "quantum_geometry_lab": {
    "model": {
      "label": "周期两带模型",
      "options": [
        [
          "qwz",
          "二维 QWZ · Chern"
        ],
        [
          "ssh",
          "一维 SSH · Zak"
        ]
      ],
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "mass": {
      "label": "QWZ 质量参数 m（无量纲）",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "energyScale": {
      "label": "共同能量尺度（模型单位）",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "t1": {
      "label": "胞内跃迁 t₁（共同模型能量单位）",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "t2": {
      "label": "胞间跃迁 t₂（共同模型能量单位）",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    }
  },
  "crystal_field_lab": {
    "coordination": {
      "label": "理想晶场",
      "options": [
        [
          "octahedral",
          "八面体 Oₕ"
        ],
        [
          "tetrahedral",
          "四面体 Tᵈ"
        ]
      ],
      "source": "dist/quantum-materials-ui.js#controls.orbitals"
    },
    "splitting": {
      "label": "晶场分裂 Δ（eV）",
      "source": "dist/quantum-materials-ui.js#controls.orbitals"
    },
    "soc": {
      "label": "自旋–轨道系数 λ（eV）",
      "source": "dist/quantum-materials-ui.js#controls.orbitals"
    }
  },
  "analyze": {
    "group_number": {
      "label": "普通空间群编号",
      "source": "dist/app.js#renderWorkbench"
    },
    "k.0": {
      "label": "波矢分数坐标 k₁",
      "source": "dist/app.js#renderWorkbench"
    },
    "k.1": {
      "label": "波矢分数坐标 k₂",
      "source": "dist/app.js#renderWorkbench"
    },
    "k.2": {
      "label": "波矢分数坐标 k₃",
      "source": "dist/app.js#renderWorkbench"
    },
    "doubleValued": {
      "label": "表示类型",
      "options": [
        [
          false,
          "单值表示"
        ],
        [
          true,
          "双值表示"
        ]
      ],
      "source": "dist/app.js#renderWorkbench"
    }
  },
  "phonon_thermo": {
    "source": {
      "label": "热力学数据来源",
      "options": [
        [
          "compare",
          "Einstein 与 Debye 比较"
        ],
        [
          "einstein",
          "Einstein 模型"
        ],
        [
          "debye",
          "Debye 模型"
        ],
        [
          "mesh",
          "带权重的 mesh.yaml"
        ],
        [
          "dos",
          "完整总 DOS"
        ],
        [
          "thermal",
          "thermal_properties.yaml"
        ]
      ],
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "natom": {
      "label": "模型原胞的原子数 n",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "theta_e": {
      "label": "Einstein 特征温度 θ_E（K）",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "theta_d": {
      "label": "Debye 特征温度 θ_D（K）",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "t_min": {
      "label": "起始温度（K）",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "t_max": {
      "label": "终止温度（K）",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "t_step": {
      "label": "温度步长（K）",
      "source": "dist/material-research-ui.js#controls.thermo"
    }
  },
  "teaching_labs": {
    "lab": {
      "label": "实验系列",
      "options": [
        [
          "lie",
          "连续群与角动量"
        ]
      ],
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "experiment": {
      "label": "实验",
      "options": [
        [
          "su2_coupling",
          "SU(2) 角动量耦合"
        ]
      ],
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoJ1": {
      "label": "第一个角动量的两倍 2j₁",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoJ2": {
      "label": "第二个角动量的两倍 2j₂",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoM1": {
      "label": "第一个磁量子数的两倍 2m₁",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoM2": {
      "label": "第二个磁量子数的两倍 2m₂",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "coupling": {
      "label": "耦合系数（共同能量单位）",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    }
  },
  "band_connectivity": {
    "model": {
      "label": "周期教学模型",
      "options": [
        [
          "c4v",
          "C₄ᵥ · pₓ / pᵧ 轨道"
        ],
        [
          "rashba",
          "Rashba · 自旋双值表示"
        ]
      ],
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "soc": {
      "label": "SOC 强度 α（共同模型能量单位）",
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "zeeman": {
      "label": "Zeeman 参数 B_z（共同模型能量单位）",
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "hopping": {
      "label": "公共色散系数 t（共同模型能量单位）",
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "samples": {
      "label": "路径采样点数",
      "source": "dist/material-research-ui.js#controls.bands"
    }
  },
  "shg_lab": {
    "model": {
      "label": "材料对称模型",
      "options": [
        [
          "gaas",
          "GaAs · Tᵈ"
        ],
        [
          "batio3",
          "BaTiO₃ · 4mm"
        ],
        [
          "centrosymmetric",
          "中心对称 · Oₕ"
        ]
      ],
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "cut": {
      "label": "样品切面",
      "options": [
        [
          "001",
          "(001)"
        ],
        [
          "111",
          "(111)"
        ]
      ],
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "incidence": {
      "label": "入射角 θ（°）",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "azimuth": {
      "label": "当前样品方位 φ（°）",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "samples": {
      "label": "角度采样点数",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "channel": {
      "label": "偏振通道（入射 → 出射）",
      "options": [
        [
          "PP",
          "P → P"
        ],
        [
          "PS",
          "P → S"
        ],
        [
          "SP",
          "S → P"
        ],
        [
          "SS",
          "S → S"
        ]
      ],
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "cOverA": {
      "label": "晶格轴比 c/a（无量纲）",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "coefficients.xxz": {
      "label": "非线性系数 χxxz（共同任意单位）",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "coefficients.zxx": {
      "label": "非线性系数 χzxx（共同任意单位）",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "coefficients.zzz": {
      "label": "非线性系数 χzzz（共同任意单位）",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    }
  }
};
const own=(object,key)=>object&&Object.hasOwn(object,key);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function projectConditionDescriptor(action,path){
 const descriptor=own(descriptors,action)&&own(descriptors[action],path)?descriptors[action][path]:null;
 return descriptor?{...descriptor,options:descriptor.options?.map(row=>[...row]),covered:true}:{label:'附加比较条件',source:'',covered:false};
}
export function projectConditionValue(value,descriptor={}){
 const option=descriptor.options?.find(([v])=>typeof v===typeof value&&v===value);
 if(option)return String(option[1]);
 if(value===undefined)return '未提供';
 if(value===null)return '空值';
 if(typeof value==='number')return Number.isFinite(value)?Object.is(value,-0)?'−0':String(value):'非有限数字';
 if(typeof value==='boolean')return value?'是':'否';
 if(typeof value==='string')return '文本“'+value+'”';
 return Array.isArray(value)?'数组（请核对输入类型）':'对象（请核对输入类型）';
}
const genericReason='本阶段固定模型、单位与采样条件，便于复现和比较；改变条件可以另作探索。';
function conditionReason(action,path,context){
 if(action==='device_transport_lab'&&path==='spinDegeneracy')return (context?.templateId==='normal-andreev'?'本阶段先记录单自旋基准 G₁=(e²/h)T，再乘2与包含两个物理自旋的 NS 电导比较。':'这里固定独立自旋通道数，使接触、透射与电导的比较使用同一计数约定。')+' '+'两个相同独立通道只复制散射结果并将电导乘2，不会自动加入 SOC、Zeeman 项或自旋散射。';
 if(['mesh','samples','points','scanPoints','gridPoints','eta','sigma','cutoff','energyCutoff'].includes(path))return '这里固定采样、截断或数值展宽，避免把数值设置变化与本阶段要比较的物理变化混在一起。实际精度仍须查看计算诊断。';
 if(path==='mass'&&['hall_response_lab','quantum_geometry_lab'].includes(action))return '这里的 m 是 QWZ Hamiltonian 中的无量纲参数；保持它不变才能在同一能带模型之间比较。它不是以 kg 计量的粒子质量。';
 if(path==='doubleValued')return '单值与双值表示作用的状态空间不同；本阶段先固定表示类型再比较群与波矢。';
 if(action==='analyze'&&path.startsWith('k.'))return '同一空间群在不同波矢处的小群和相位可能不同；这里固定声明的波矢分数坐标。';
 return genericReason;
}
export function compareProjectConditions(step,record,context={}){
 if(!record)return {ok:false,status:'missing',reason:'先打开这一阶段的工具并完成计算，再返回收录。',mismatches:[]};
 if(record.action!==step.action)return {ok:false,status:'tool',reason:'最近一次计算属于其他工具，请先运行本阶段实验。',mismatches:[]};
 const mismatches=[];
 for(const [path,required]of Object.entries(step.requires||{})){
  const actual=path.split('.').reduce((value,part)=>value?.[part],record.input);
  const equal=typeof required==='number'?typeof actual==='number'&&Number.isFinite(actual)&&Math.abs(actual-required)<=1e-10*Math.max(Math.abs(required),1e-9):actual===required;
  if(equal)continue;
  const descriptor=projectConditionDescriptor(step.action,path);
  mismatches.push({path,label:descriptor.label,current:actual,required,currentText:projectConditionValue(actual,descriptor),requiredText:projectConditionValue(required,descriptor),explanation:conditionReason(step.action,path,context),source:descriptor.source,covered:descriptor.covered});
 }
 if(!mismatches.length)return {ok:true,status:'matching',reason:'参数符合本阶段，可收录完整输入与结果。',mismatches:[]};
 // Keep the parameter paths in the API reason for existing consumers. The UI
 // presents the labelled comparison below and puts raw paths in a disclosure.
 const reason='本阶段要求与当前记录不同：'+mismatches.map(m=>`${m.label}（${m.path}）：当前 ${m.currentText}；要求 ${m.requiredText}`).join('；')+'。请载入阶段条件并手动计算，或保留当前探索。';
 return {ok:false,status:'conditions',reason,mismatches};
}
export function renderProjectConditionFeedback(step,acceptance){
 if(acceptance.status!=='conditions')return `<p class="obs-small" role="status">${esc(acceptance.reason)}</p>`;
 const mismatches=acceptance.mismatches;
 const explanations=[...new Set(mismatches.map(m=>m.explanation))];
 return `<section class="project-condition-feedback" aria-label="${esc(step.title)} · 比较条件对照"><h4>本次记录与阶段条件不同</h4><p>这是收录本阶段比较证据所需的条件对照，不据此判定本次计算或物理结论无效。</p><div class="obs-table"><table role="table"><thead><tr><th scope="col">比较条件（含单位或约定）</th><th scope="col">当前记录</th><th scope="col">本阶段要求</th></tr></thead><tbody>${mismatches.map(m=>`<tr><th scope="row">${esc(m.label)}</th><td><span class="project-condition-cell-label" aria-hidden="true">当前记录</span><span>${esc(m.currentText)}</span></td><td><span class="project-condition-cell-label" aria-hidden="true">本阶段要求</span><span>${esc(m.requiredText)}</span></td></tr>`).join('')}</tbody></table></div>${explanations.map(text=>`<p>${esc(text)}</p>`).join('')}<details><summary>技术字段与输入类型</summary><ul>${mismatches.map(m=>`<li><code>${esc(m.path)}</code>：${esc(typeof m.current)} → ${esc(typeof m.required)}${m.source?`；${esc(m.source)}`:''}</li>`).join('')}</ul></details></section>`;
}
