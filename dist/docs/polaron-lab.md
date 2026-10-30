# 电子—声子耦合与极化子教学实验

本实验原创实现二站点、固定单电子及其自旋分量的量子 Holstein 模型。Python 核心只依赖 NumPy，在浏览器 Worker 中与课堂共用；界面展示 Python 返回的数值，不另造示意计算结果。

## Hamiltonian 与单位

采用站点 0、1 和两个独立的局域谐振子：

\[
H=-t(c_0^\dagger c_1+c_1^\dagger c_0)
+\frac{\Delta}{2}(n_0-n_1)
+W\sum_{i=0}^1 b_i^\dagger b_i
+g\sum_{i=0}^1n_i(b_i+b_i^\dagger),\qquad W=\hbar\omega.
\]

- `hopping` 为 (t)，0–3 eV。
- `phononEnergy` 为 (W=\hbar\omega)，0.2–3 eV，输入不是 THz。
- `coupling` 为 (g)，0–3 eV，不是无量纲耦合常数。
- `siteBias` 为 (Delta=\varepsilon_0-\varepsilon_1)，−4 至 4 eV；第一站点位能是 (+\Delta/2)。
- `cutoff` 为每个振子的最大声子数，整数 2–10。
- `scanMaxCoupling` 为扫描上限，0–3 eV；`scanPoints` 为 1–9，取 1 时仅保留当前输入 (g)。

省略两个振子的总零点能 (W)。这只改变能量零点，不删除零点坐标涨落。位移 (X_i=b_i+b_i^\dagger) 为无量纲量；没有输入振子质量或长度尺度，因此不输出 Å。正 (g) 使被占据振子的平均 (X) 向负方向偏移。

这是局域位点能耦合，跃迁 (t) 不随振子变化；它不等同于 SSH 键耦合或自洽结构弛豫。本模型没有电子间排斥、热平均、外部驱动、真实材料参数拟合或由 Phonopy 文件求得的电子—声子矩阵元。

## 基底、简并与观测量

固定基底顺序为 (|i,n_0,n_1\rangle)，先电子站点，再振子 0 和振子 1。每个振子包含 (N_{max}+1) 个数态，矩阵维数 (2(N_{max}+1)^2)。当前结果对该截断矩阵做完整实对称对角化。

与最低本征值相差不超过 (10^{-9}) eV 的本征态组成基态子空间，并等权平均。如此可避免严格 (t=0,\Delta=0) 时对角化算法任意选择一个局域态。小于该容差的真实劈裂也不分辨。

输出：

- 电子密度、声子平均数、平均位移。
- 各振子的完整声子数概率分布。
- 联合关联 (C_{ij}=\langle n_iX_j\rangle)。
- 条件位移 (C_{ij}/\langle n_i\rangle)；分母小于 (10^{-12}) 时输出 `null`。
- 电子约化密度矩阵、纯度及键相干度 (2\operatorname{Re}\rho_{01})。
- 基态能量的跃迁、声子、耦合与位能分项，以及不同能级组。

电子约化纯度仅在整体为纯态时可直接用于判断这两个子系统的纠缠。简并基态等权平均可带来经典混合，不能把低纯度一概解释成纠缠。对称体系的均匀电子密度与非平凡条件振动云可以共存；本实验不从两个站点推断宏观自俘获相变或极化子半径。

## 声子截断诊断

每次计算都额外求 (N_{max}+1) 的结果；最高对照截断为 11，最大矩阵维数为 288。比较：

1. 基态能量变化小于 (10^{-4}) eV。
2. 电子密度、声子占据、联合关联的最大变化均小于 0.01。
3. 当前截断中两个振子的最高声子层概率均小于 (10^{-3})。

全部满足才将 `convergence.converged` 标为 `true`。这是相邻截断下的局部数值诊断，不是严格误差界。大 (g/W) 的参数即使计算成功，也可显示“尚未收敛”，并保留诊断与原始数据。

`checks.passed` 只检查厄米性、本征残差、概率、密度矩阵和能量分项的一致性。它与声子截断的 `converged` 分开。耦合扫描沿用当前截断，各点报告最高层概率；扫描中其他参数没有自动套用当前点的相邻截断结论。

## 基准与测试

验证脚本：`python scripts/test-python-polaron.py`。

独立检查包括直接占据数基底作用构造、(g=0) 全谱、原子极限的位移振子能量与 Poisson 声子分布、站点交换、简并平均、Hellmann–Feynman 导数、截断能量变分单调性、能量缩放、强耦合不收敛提示、有限 JSON 输出和非法输入。课程的六个预设也均运行实际核心；三课与十二个练习步骤具有闭合引用。

预设与材料名称属于教学模型或材料机制背景，不是拟合材料的定量预测。两站点电子—声子模型与 Hubbard 单带电子模型可共享跃迁尺度的对照，但它们的 Hilbert 空间和相互作用不同，不能自动认定参数相等或态一一对应。

## 一手参考资料

- T. Holstein, [Studies of polaron motion: Part I. The molecular-crystal model](https://doi.org/10.1016/0003-4916(59)90002-8), Annals of Physics 8, 325–342 (1959)：局域能量受振动调制的模型来源。
- T. Holstein, [Studies of polaron motion: Part II. The small polaron](https://doi.org/10.1016/0003-4916(59)90003-X), Annals of Physics 8, 343–389 (1959)：局域位移振子与小跃迁极限背景。
- H. Lee et al., [Electron-phonon physics from first principles using the EPW code](https://arxiv.org/abs/2302.08085) (2023)：真实材料电子—声子计算的范围对照；本站未移植 EPW。
