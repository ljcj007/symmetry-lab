export const frontiersAssignments=[
  {
    "id": "surface-to-polarity",
    "module": "layers",
    "title": "切割、终止与允许极性",
    "question": "哪些约束来自整体薄膜，哪些结论还需要序参量模型？",
    "rubric": [
      "逐原子证明交换两侧的操作是否保持元素。",
      "区分法向边界与面内周期，报告层数和切面。",
      "序参量工具是另一个给定模型；不得把对称许可直接当作薄膜自发极化。"
    ],
    "steps": [
      {
        "id": "slab",
        "title": "建立对称薄膜",
        "action": "layer_symmetry_lab",
        "route": "#compute/layer-symmetry-lab?preset=layer-square",
        "requires": {
          "face": "001",
          "layers": 4,
          "bulk": "mono",
          "cut": 0,
          "interface": "same",
          "termination": "same",
          "registry": 0,
          "pathEnd": 0.5
        },
        "prompt": "记录全部操作、两侧交换与闭合；保存为 A。"
      },
      {
        "id": "surface",
        "title": "只改变上表面标签",
        "action": "layer_symmetry_lab",
        "route": "#compute/layer-symmetry-lab?preset=layer-surface",
        "requires": {
          "face": "001",
          "layers": 4,
          "bulk": "mono",
          "cut": 0,
          "interface": "same",
          "termination": "marker",
          "registry": 0,
          "pathEnd": 0.5
        },
        "prompt": "与 A 比较，找到因元素标签而失效的操作，应用一次波矢与自旋联动。"
      },
      {
        "id": "order",
        "title": "连接极性序参量模型",
        "action": "order_parameter_lab",
        "route": "#compute/order-parameter-lab?preset=order-cubic-axis",
        "requires": {
          "pointGroup": "oh",
          "etaX": 0,
          "etaY": 0,
          "etaZ": 1,
          "a2": -1,
          "b4": 1,
          "c4": 3,
          "d6": 0.1,
          "e6": 0,
          "f6": 0,
          "fieldX": 0,
          "basisAngle": 30
        },
        "prompt": "在独立立方序参量模型中记录稳定子与等价方向。说明它不是从薄膜自动拟合的自由能。"
      }
    ]
  },
  {
    "id": "chirality-to-optics",
    "module": "chirality",
    "title": "从镜像辨析到光学许可",
    "question": "手性、极向量与光学响应分别需要什么证据？",
    "rubric": [
      "保留同种原子约束及正旋转配准误差。",
      "比较手性非极性与极性非手性的两个原型。",
      "SHG 的系数和实验几何是额外输入，不由手性布尔值决定。"
    ],
    "steps": [
      {
        "id": "chiral",
        "title": "手性而非极性",
        "action": "chirality_polarity_lab",
        "route": "#compute/chirality-polarity-lab?preset=chiral-d3",
        "requires": {
          "motif": "d3",
          "handedness": 1,
          "noise": 0,
          "tolerance": 0.01,
          "optical": "natural",
          "angle": 20
        },
        "prompt": "记录镜像残差和允许极向量维数；完成一次逆向候选集合判断。"
      },
      {
        "id": "polar",
        "title": "极性而非手性",
        "action": "chirality_polarity_lab",
        "route": "#compute/chirality-polarity-lab?preset=chiral-polar",
        "requires": {
          "motif": "pyramid",
          "handedness": 1,
          "noise": 0,
          "tolerance": 0.01,
          "optical": "natural",
          "angle": 20
        },
        "prompt": "检查镜面、极向量方向和独立往返旋转模型。"
      },
      {
        "id": "optics",
        "title": "进入既有偏振光谱工具",
        "action": "shg_lab",
        "route": "#compute/shg-lab?preset=batio3-001",
        "requires": {
          "model": "batio3",
          "cut": "001",
          "incidence": 45,
          "azimuth": 30,
          "samples": 181,
          "channel": "PP",
          "cOverA": 1,
          "coefficients.xxz": 1,
          "coefficients.zxx": 0.7,
          "coefficients.zzz": 1.5
        },
        "prompt": "在 4mm 的独立 SHG 模型中改变偏振几何；说明原型锥体与真实 BaTiO3 结构及系数的区别。"
      }
    ]
  },
  {
    "id": "schmidt-to-spt",
    "module": "spt",
    "title": "从约化态到 AKLT 边缘与射影表示",
    "question": "局域混合、纠缠与拓扑保护怎样联系，又有哪些不同假设？",
    "rubric": [
      "注明完整态和约化态的纯度及 Hilbert 空间。",
      "保留 AKLT 边界条件、选定纯态和基态空间维数。",
      "将解析虚拟表示与有限链数值诊断分开，不由单个有限链谱宣判体相。"
    ],
    "steps": [
      {
        "id": "density",
        "title": "先做单重态的约化密度矩阵",
        "action": "density_matrix_lab",
        "route": "#compute/density-matrix-lab?preset=singlet",
        "requires": {
          "experiment": "pair",
          "initialState": "singlet",
          "drive": 0,
          "detuning": 0,
          "exchange": 1,
          "gradient": 0,
          "gamma1": 0,
          "gammaPhi": 0,
          "thermalScale": 1,
          "duration": 12,
          "points": 161
        },
        "prompt": "记录整体纯态与局部混合，解释 Schmidt 概率。"
      },
      {
        "id": "periodic",
        "title": "周期 AKLT 与虚拟表示",
        "action": "manybody_spt_lab",
        "route": "#compute/manybody-spt-lab?preset=spt-aklt",
        "requires": {
          "sites": 4,
          "boundary": "periodic",
          "anisotropy": 0,
          "field": 0,
          "fieldPattern": "gradient",
          "pathAxis": "anisotropy",
          "pathEnd": 4
        },
        "prompt": "记录能谱、纠缠权重和 Ux/Uz 的反对易；比较位点自旋与虚拟自旋。"
      },
      {
        "id": "edge",
        "title": "只打开边界",
        "action": "manybody_spt_lab",
        "route": "#compute/manybody-spt-lab?preset=spt-edge",
        "requires": {
          "sites": 4,
          "boundary": "open",
          "anisotropy": 0,
          "field": 0,
          "fieldPattern": "gradient",
          "pathAxis": "anisotropy",
          "pathEnd": 4
        },
        "prompt": "比较基态子空间与代表纯态，保存 A/B 证据。沿 D 路径检查保护条件，解释有限尺寸限制。"
      }
    ]
  }
];
export function frontiersEvidence(record){if(!['layer_symmetry_lab','chirality_polarity_lab','manybody_spt_lab'].includes(record.action))return null;const e=record.result.learningEvidence||{};return record.result.summary.map(s=>s.label+'='+s.value).join('；')+'；联动证据：'+(e.linked?'已保存':'未保存')+'；逆向鉴别：'+(e.inverse?.result?.correct?'通过':'未通过或未作答')+'；路径点：'+(e.path?.index??'未选择')+(e.comparison?'\n\nA 输入：'+JSON.stringify(e.comparison.A.input)+'\n\nB 输入：'+JSON.stringify(e.comparison.B.input)+'\n\n对照解释：'+e.comparison.explanation:'');}
