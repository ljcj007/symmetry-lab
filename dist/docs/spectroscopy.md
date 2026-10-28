# 磁共振、超导结与多重态光谱

本次版本为 `20261028-spectroscopy1`，新增三个主题、9课、9道分步练习（36步）、9个材料与模型案例、18个可复现预设及3份跨模块项目作业。项目中心连同已有3份作业共6份。新内容融入原有课堂路线、计算中心、材料图谱和研究记录，保留五个主导航与18px正文字号。

所有新计算使用浏览器中的 Python / NumPy；界面负责参数、图形、课程和记录。案例中的材料名称提供物理背景，内置参数为教学示例，不是实验拟合或自动材料预测。

## 入口与模型

| 主题 | 课堂 | 计算中心 | 主要交互 |
| --- | --- | --- | --- |
| 磁共振与有效自旋 | `#classroom/spin?module=resonance` | `#compute/spin-resonance-lab` | 静磁场方向、微波偏振、g张量、D/E与超精细作用，频率吸收与扫场能级 |
| 超导结与Andreev反射 | `#classroom/spin?module=andreev` | `#compute/andreev-lab` | 能隙、接触、势垒、电子/空穴反射、电导、能量扫描与局域谱 |
| 多重态光谱与偏振 | `#classroom/observables?module=spectra` | `#compute/atomic-spectra-lab` | Slater相互作用、晶场、SOC、温度、线/圆偏振与XAS差谱 |

材料图谱入口为 `#atlas/spectroscopy`，项目中心为 `#atlas/projects`。计算结果可以保存到 `#atlas/notebook`，包含输入、单位、版本、模型说明和完整结果。项目按阶段保存参数匹配的计算证据、推导笔记与结论，并提供JSON和Markdown导出。完成计数表示记录了阶段，不代表科学解释已自动批改正确。

### 磁共振：能级差还需要选择定则和热占据

有效电子自旋 `S=1/2…5/2`，至多一个核自旋 `I=0…5/2`，最大空间36维。g、D/E和轴向超精细张量共用晶体主轴；完整对角化连接能级、磁偶极矩阵元与Boltzmann占据。简并态以子空间迹求强度，T=0在完整基态简并空间等权。谱线按正频轴面积归一，保留温度改变的总权重，并报告窗口覆盖及网格积分误差。

H/h、D/E、A使用GHz，磁场使用T；谱为相对磁偶极权重每GHz，省略公共μB²。它不是实际吸收功率或场调制一阶导数谱。g、D、E是另行给定的有效参数，不能仅由旧无SOC Kanamori模型的基态S推导。当前无粉末平均、弛豫、饱和、脉冲、多核或直接核磁驱动。

详情：[磁共振与有效自旋](spin-resonance-lab.md)。

### NS结：分开准粒子通量、电荷电导与自旋计数

2–32格点正常单轨道链连接正常与实s波超导半无限电极，使用解析迟致表面自能。配对仅在右电极；有限正常区有栅压、单点势垒和两侧接触控制。输出Rₑₑ、Rₕₑ、准粒子透射、局域电子/空穴谱与电导。

Nambu块为 `(e↑,h↓)`，物理两重自旋已计入 `G/(e²/h)=2(1−Rₑₑ+Rₕₑ)`。G的SI单位是S，不是片电导率；LDOS按一个Nambu块每eV。E=0对应零温、零偏压线性电导，非零E为固定势、固定能隙近似下的谱微分电导。人工η只在有限区使用，显式报告 `Rₑₑ+Rₕₑ+Tqp+Aη=1` 与η/2比较。精确E=±Δ的阈值保留空值，不能解释为零电导。

透明、小能隙的极限可以接近正常电导的两倍；有限带宽或势垒不保证加倍。当前无有限偏压自洽电势、Josephson相位、自洽配对、SOC或Majorana判据。

详情：[超导结与Andreev反射](andreev-lab.md)。

### 多重态XAS：完整小组态与偏振矩阵元

支持 `p⁶d⁸→p⁵d⁹`（初/末维数45/60）及 `p⁶d⁹→p⁵d¹⁰`（10/6）。完整d–d Slater F⁰/F²/F⁴与p–d F⁰/F²/G¹/G³、晶场、p/d壳SOC和z向Zeeman项在相同费米基底中计算。使用电偶极算符、全部初态热占据和完整末态空间生成线偏振、圆偏振及差谱；简并空间平均避免任意本征矢改变强度。

能量以末态组态重心为参考，径向偶极因子设为1；曲线是相对XAS，不是绝对吸收边、截面或材料化学位移。SOC下⟨S²⟩、⟨L²⟩不自动等于原子LS项标签。当前无配体电荷转移、晶体磁有序、RIXS或材料拟合；旧Kanamori U/J不能直接逐项替换这些Slater参数。

详情：[多重态光谱与偏振选择定则](atomic-spectra-lab.md)。

## 三份新项目作业

| 项目 | 三个阶段 | 必须解释的比较条件 |
| --- | --- | --- |
| `spin-resonance` | 旧d⁸ Kanamori基态 → 给定S=1各向同性Zeeman模型 → 仅改变D/E | 有效自旋投影假设；g/D/E不是自动材料拟合；能级差、矩阵元与热占据共同决定可见信号 |
| `normal-andreev` | 正常单通道器件 → 相同参数NS模型Δ=0 → 仅改Δ=.3 eV | N=12、t=1、E=.2 eV及接触等固定；旧结果为一个自旋，新G含两个；有限η时G_NS/2与旧T相差显式Aη，η→0一致 |
| `multiplet-xas` | 旧d⁸ Kanamori参照 → 完整Slater/SOC的x偏振XAS → 同一Hamiltonian的z偏振XAS | 区分模型改变与仅偏振改变；固定参数比较相对强度，不能把相对横轴当绝对实验吸收边 |

原有 `geometry-hall`、`ssh-device`、`orbital-multiplet` 三份项目仍保留。

## 复现、检查与来源

示例输入位于 `examples/spin-resonance-*.json`、`examples/andreev-*.json` 和 `examples/atomic-spectra-*.json`。命令行使用与浏览器相同的公共Python API：

```sh
python dist/python/cli.py spin_resonance_lab dist/examples/spin-resonance-isotropic.json
python dist/python/cli.py andreev_lab dist/examples/andreev-project-paired.json
python dist/python/cli.py atomic_spectra_lab dist/examples/atomic-spectra-project-x.json
npm run test:spectroscopy
```

测试覆盖解析自旋极限、简并强度不变性、线形积分、正常器件与NS解析极限、粒子—空穴/通量、原子Slater/SOC/偶极和规则、全部预设、36个练习步骤、UI路由和项目记录。完整旧功能回归继续使用 `npm test` 与 `npm run test:python`。

全部源码修改完成后刷新来源清单，再只读核验：

```sh
python scripts/refresh-spectroscopy-provenance.py
python scripts/refresh-spectroscopy-provenance.py --check
```

命令只更新旧清单的文件哈希、Python模块哈希及本次来源清单，不重建课程、不改历史版本和计数、不打包或提交。发布文件与引用见 [spectroscopy-provenance.json](../data/spectroscopy-provenance.json)；它不包含本机 `.openai` 辅助文件。

方法来源包括[EasySpin有效自旋约定](https://www.easyspin.org/documentation/hamiltonian.html)、[Kwant NS教程](https://kwant-project.org/doc/1/tutorial/superconductors)、[BTK原始论文](https://doi.org/10.1103/PhysRevB.25.4515)及[Quanty XAS教程](https://www.quanty.org/documentation/tutorials/nio_crystal_field/xas_l23)。这些资料用于核对模型和方法；本次代码、练习、参数与图形独立实现，不宣称移植了完整EasySpin、Kwant或Quanty软件。
