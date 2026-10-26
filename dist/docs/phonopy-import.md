# Phonopy 结果导入与本征矢展示

导入器读取已有计算结果，不运行 VASP，不拟合力常数，也不根据晶胞结构补造声子频率。所有文件在浏览器本地 Python 中解析。

## 文件与单位

- `band.yaml`：读取 `phonon[].q-position`、`distance`、`band[].frequency`；按 `segment_nqpoint` 划分路径，任何两段之间都不连线。
- `qpoints.yaml`、`mesh.yaml` 或同结构 JSON：读取离散 q 点。没有 `segment_nqpoint` 时仅画散点，即使文件包含 `distance` 也不假定点之间属于一条连续路径。
- `phonopy.yaml`、`phonopy_disp.yaml`：优先读取 `primitive_cell`，否则读取可用的晶胞。没有 `phonon` 频率列表时只报告结构，不产生色散。力常数、位移和力不会在此导入器中重新求解。
- 频率单位取用户明确确认的单位，或文件中的 `frequency_unit` / `physical_unit.frequency`。默认“未声明单位”。确认单位只是标记原始数值，不进行 THz、cm⁻¹、meV 之间的换算。
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

## Python 接口

`phonopy_import.run(payload)` 接受 `content`（YAML/JSON 文本）或 `data`（同结构对象），以及 `filename`、`selected_q`、`selected_band`（均从 0 计数）、`amplitude`、`phase`、`supercell`、`frequency_unit`、`imaginary_tolerance`。可选 `structure_content` / `structure_data` 补充原胞，`dos_content` 和 `dos_kind` 导入 DOS。空的可选文本视为未提供。

输出包含 `structure`、`qpoints`、`segments`、`summary`、`selection`、`animation`、`dos`、`warnings` 和 `sources`。`animation.frames[].positions` 是全部展示原子的笛卡尔坐标；`animation.atoms[].complexDisplacement` 为已包含空间相位和统一显示尺度、尚未乘时间相位的复位移，可用于连续相位插值。

参考：[Phonopy 输出文件](https://phonopy.github.io/phonopy/output-files.html)、[动力学矩阵与相位约定](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix)、[phonopy-yaml 文件](https://phonopy.github.io/phonopy/phonopy-yaml.html)。
