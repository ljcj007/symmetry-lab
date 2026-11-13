# Phonopy 结果导入与本征矢展示

导入器读取已有计算结果，不运行 VASP，不拟合力常数，也不根据晶胞结构补造声子频率。所有文件在浏览器本地 Python 中解析。

## 文件与单位

- `band.yaml`：读取 `phonon[].q-position`、`distance`、`band[].frequency`；按 `segment_nqpoint` 划分路径，任何两段之间都不连线。
- `qpoints.yaml`、`mesh.yaml` 或同结构 JSON：读取离散 q 点。没有 `segment_nqpoint` 时仅画散点，即使文件包含 `distance` 也不假定点之间属于一条连续路径。
- `phonopy.yaml`、`phonopy_disp.yaml`：优先读取 `primitive_cell`，否则读取可用的晶胞。没有 `phonon` 频率列表时只报告结构，不产生色散。力常数、位移和力不会在此导入器中重新求解。
- 频率单位取用户明确确认的单位，或文件中的 `frequency_unit` / `physical_unit.frequency`。默认“未声明单位”。确认单位只是标记原始数值，不进行 THz、cm⁻¹、meV 之间的换算。
- 晶格长度单位读取 `physical_unit.length` 和根节点 `length_unit`。两者同义时优先保留前者的写法（例如 `bohr` 与 `au`），声明冲突时停止导入，不自动换算。未声明单位时保留“输入晶格单位”，不会猜作 Å。文件路径距离使用对应倒易长度单位，q 保持倒易分数坐标。
- 结果分别记录频率、长度的单位来源及文件声明。明确选择的频率单位若与文件声明不同，会显示提示；无论哪种来源均不变更原始数值。伴随原胞只在主文件缺单位时补充；已有单位不会被无单位伴随文件清除，两个文件声明冲突时停止。
- `total_dos.dat`：第 1 列频率，第 2 列总 DOS。
- `projected_dos.dat`（也常称 `partial_dos.dat`）：第 1 列频率，其余按原胞原子顺序每原子一列。`XYZ_PROJECTION` 必须显式选择 xyz 模式，列顺序为原子 1 的 x、y、z，再原子 2 的 x、y、z。不得把 xyz 三列误当三个原子。

DOS 保留输入归一化；附带积分是给定频率网格上的梯形积分，不自动变成 3N。高对称路径不是布里渊区体积采样，本工具不由色散路径的频率直方图推导 DOS。

## 振动与相位

Phonopy 输出的本征矢是质量加权动力学矩阵的笛卡尔复本征矢。对单个模式，本工具采用

\[
u_j(R,\phi)=\frac{A}{\max_k\|e_k/\sqrt{m_k}\|}
\operatorname{Re}\left[\frac{e_j}{\sqrt{m_j}}
e^{i2\pi q\cdot(R+r_j)-i\phi}\right].
\]

这里 q 是倒易分数坐标，R 是整数组胞平移，r 是原子分数坐标；本征矢分量沿笛卡尔轴。晶格矢量按行存储，用分数坐标乘晶格矩阵得到平衡位置。质量反加权保持不同原子的相对位移，全局归一化只控制显示幅度，不分别归一化每个原子。

显示幅度 A 与输入晶格使用相同长度单位；没有声明长度单位时不擅自标作 Å。动画不包含量子振幅、温度占据或频率因子，也不是分子动力学轨迹。正频率动画按统一展示速度扫描相位，不能据播放速度读取真实周期。负频率是虚频的有符号编码，动画仍只是本征矢方向的相位展示，不能解释为不稳定模随真实时间做周期振动。

非 Γ 模支持每方向 1–4 个晶胞的有限窗口。只有各方向 `q_i × n_i` 均为整数时，该窗口才与所选 q 的周期边界相容；否则明确提示其为无限 Bloch 模的有限片段。

所选模式缺少本征矢、原子质量、坐标或晶格时，不显示振动。`qpoints.yaml` 常只带原子数和倒易晶格，可额外导入同一次计算的 `phonopy.yaml` 原胞结构。程序核对原子数、已有晶格/种类/坐标/质量以及倒易晶格；原始文件未列原子时，无法独立证明原子排列顺序，用户须保证补充结构与本征矢采用同一原胞及顺序。

## 容差、安全与范围

默认按频率 `< -1e-5`（输入频率单位）统计虚频条目，同时保留全部负值的计数和近零条目数。重复路径端点也算条目；这不是独立不稳定模的总数。很小负值可能属于数值误差，虚频也不能单独证明热力学相变，需要收敛检查、充分 q 采样和相应自由能分析。

文件限制为 8 MiB、128 个原胞原子、2000 个 q 点、60000 个“q 点 × 声子支”条目，展示窗口不超过 512 原子。DOS 不超过 20000 行。YAML 先检查事件数和深度，再使用 `safe_load`；拒绝自定义对象、别名引用、循环结构、非有限数值、错误维度和不一致原子数。不读取文件中指定的外部路径、不运行嵌入代码。

当前不支持 HDF5、压缩 YAML、热力学表、从力常数求声子、自动 NAC/LO–TO 修正、自动表示标注或由本征矢推算 IR/Raman 强度。已有频率、本征矢和 DOS 只保留其计算时包含的物理条件。

## 原创教学样本

`data/examples/phonopy-demo.yaml` 是原创合成的 A/B 双原子模型，质量为 1 和 4，两个路径段共 18 个 q 点，每点 6 个正交归一的复本征矢。人为构造的频率包含虚频，用于练习质量反加权、相位、路径断点和容差判断。A/B 是假想原子；该文件不是 Si、BaTiO₃ 或其他真实材料的实验/第一性原理结果。

<a id="official-al-example"></a>
## 官方 Al 计算示例

“载入 Phonopy 官方 Al 示例”读取未经修改的官方仓库文件 `example/Al-ABACUS/abacus-pw/band.yaml`，固定于提交 `18cad919af8fe8aad349e04f101887fa19b051a0`。本站文件为 `data/examples/phonopy-al-abacus-band.yaml`，共 63428 字节；SHA-256 为 `08da0d622d6f423f4bc5d3900a30c9bb5dfb86933bc849f59aad60fe67ec330b`。完整 BSD 三条款许可证随文件保留于 `data/examples/phonopy-al-abacus-LICENSE.txt`，来源元数据另见 `phonopy-al-abacus-source.json`。

这是官方公开的 Al / ABACUS 平面波计算示例，不是实验数据或本站重新执行的第一性原理计算。文件声明 `length_unit: au`，但没有频率单位字段。示例入口明确选择 THz，与匹配的 `phonopy.yaml` 中转换因子 21.490680 及 Phonopy 的 ABACUS 转换约定一致。结果将它记为“用户明确确认”，不能说成从 band.yaml 读出的频率元数据。不核验原电子结构计算的收敛性、赝势内容或力常数。

原胞含一个 Al 原子，84 个 q 点条目分成四段，每段 21 个点；每点三条支，共 252 个本征矢。重复端点保留。原始路径没有常用高对称点字母标签，界面不补造标签。252 个输入本征矢中，12 个含显著虚部（|Im|>10⁻¹²；涉及 7 个 q 点条目、18 个笛卡尔分量），其中 6 个不能只用一个整体相位变成实向量，位于 q 索引 66、78、81 各自的支 1 和 2（均从 0 计数）。因此可检验单原子模式内部的相对复相位；该例仍不覆盖多原子光学支或不同质量原子之间的相对运动。文件没有 DOS、散射强度或群速度，不能从这条路径补造这些量。

这 6 个向量分别属于同频二重子空间。单个向量的整体相位与简并子空间内部的换基是不同自由度；不能只凭所选基矢具有复分量，就推断受保护的物理手性或拓扑不变量。

可按以下步骤完成真实文件练习：

1. 预测：一个原子的原胞应有几条声子支？四段各 21 个点是否等于 84 个不同 q 坐标？
2. 读取：载入官方例并明确选择 THz，再点击“读取数据”。核对 3 条支、84 个条目、四段路径和 `au` / `1 / au`。84 是包含重复端点的条目数，实际有 81 个按文件数值逐项比较的不同 q 坐标。
3. 解释：把 q 点索引设为 22、支索引设为 1、展示超胞设为 `[2,2,1]`。先预测是否满足各方向 `q_i n_i` 为整数，再检查提示。此 q 为 `(0.4937500,0.4937500,0.9875000)`，该窗口不与 q 周期相容，动画是有限窗口而非周期拼接的热轨迹。
4. 复相位检验：选择 q 索引 66、支索引 1 与 `[1,1,1]` 窗口，比较相位 0 和 π/2 的位移方向。先预测它们是否平行，再对照原始笛卡尔分量的实部与虚部。该向量的分量对相位不变量最大绝对值约为 0.00791858，不能把复相位全部归结为整体相位。此窗口仍不与 q 周期相容，不能作为周期冻结结构。
5. 反例：把频率单位改回“未确认”再读取，结果应为“未声明单位”，而所有频率数值不变。单位声明/确认与数值换算是两个不同操作。

匹配的官方 `phonopy.yaml` 也未经修改地保留为 `data/examples/phonopy-al-abacus-structure.yaml`（8206 字节，SHA-256 `a5d34dc7f9ddf73066e07a9b64a53e7d9b89735d9af353de0af1a21a5512b87f`）。其中的 Phonopy 2.15.1、转换因子和 Fm-3m (225) 是原文件元数据，不是本站重新判定的电子结构方法或收敛结论。可在“补充原胞结构”中选入它，测试主/伴随原胞一致性。

来源：[固定版本原文件](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/example/Al-ABACUS/abacus-pw/band.yaml)、[匹配的伴随设置](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/example/Al-ABACUS/abacus-pw/phonopy.yaml)、[ABACUS 输出转换文档](https://phonopy.github.io/phonopy/abacus.html)、[固定版本物理单位定义](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/phonopy/physical_units.py)。

## Python 接口

`phonopy_import.run(payload)` 接受 `content`（YAML/JSON 文本）或 `data`（同结构对象），以及 `filename`、`selected_q`、`selected_band`（均从 0 计数）、`amplitude`、`phase`、`supercell`、`frequency_unit`、`imaginary_tolerance`。可选 `structure_content` / `structure_data` 补充原胞，`dos_content` 和 `dos_kind` 导入 DOS。空的可选文本视为未提供。

输出包含 `structure`、`qpoints`、`segments`、`summary`、`selection`、`animation`、`dos`、`warnings` 和 `sources`。`animation.frames[].positions` 是全部展示原子的笛卡尔坐标；`animation.atoms[].complexDisplacement` 为已包含空间相位和统一显示尺度、尚未乘时间相位的复位移，可用于连续相位插值。

`sourceIdentity` 保存输入 UTF-8 文本的 SHA-256 与字节数，随输入/结果导出和研究记录保留；对象输入则明确标为排序键的 JSON 表示，不能冒称原文件字节身份。官方 Al 数据只有在原始文本摘要完全匹配时才附加固定版本来源标识。修改一个字符后仍可导入，但不再自动声称与该官方原文件完全一致。

参考：[Phonopy 输出文件](https://phonopy.github.io/phonopy/output-files.html)、[动力学矩阵与相位约定](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix)、[phonopy-yaml 文件](https://phonopy.github.io/phonopy/phonopy-yaml.html)。
