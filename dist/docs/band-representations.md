# 从实空间位点到 Bloch 表示

版本：`20261029-pathways1`。计算入口为 `band_rep_lab.calculate(payload)`，只依赖 NumPy 与本站 `symmetry_core`。

本实验从一个实空间种子位点及其空间群轨道构造周期轨道基，计算 Bloch 作用矩阵，再在选定 k 点限制到小群并分解。它没有调用全 k 星诱导接口；两个诱导问题的出发子群和基底不同。

## 精选模型与坐标

|空间群|可选位点|原胞内轨道多重性|
|---|---|---|
|2，P−1|原点、体心反演中心、一般位置|1、1、2|
|4，P2₁|一般位置|2|
|19，P2₁2₁2₁|一般位置|4|
|221，Pm−3m|1a 原点、1b 体心、3c 面心轨道|1、1、3|

四群的操作记录 `(name,R,t)` 与本站正式 `space-groups.json` 一致，并由独立测试逐项对照。使用的是该目录的 **BC 原胞坐标设置**，例如群 4 的螺旋轴沿 z，不能将它直接当作常见 unique-b 晶胞。历史操作名字只是目录标签；空间作用以矩阵 R 和平移 t 为准。

`s` 是一维标量；`p` 是固定全局笛卡尔轴下完整的 `(p_x,p_y,p_z)` 极性向量，局域矩阵分别为 1 与 R。精选群的这些旋转矩阵均在本教学采用的正交框架中正交。不含自旋、SOC 或时间反演。单个位点轨道可能偶然具有更大的结构对称性；此处只研究指定群作用，不执行结构对称性识别。

## 从晶格余量推导相位

先生成原胞内不重复位置 `r_a`。每个 Seitz 操作 `g={R_g|t_g}` 满足

```
R_g r_a + t_g = r_b + L_ga，L_ga ∈ Z³。
```

周期 Bloch 基定义为

```
|a,k> = Σ_T exp(+2πi k·T)|T+r_a>。
```

令 `q=R_g^(-T) k`，由 `T'=R_g T+L_ga` 得

```
U_g(k)[b,a] = exp(−2πi q·L_ga) ρ(R_g)。
```

矩阵把 k 纤维送到 q 纤维。只有 q 与 k 模倒格矢等价时，它才是该 k 的小群作用，可以在同一纤维内取特征标。周期规范在 `k+G` 下的轨道基相同；若改用包含 `r_a` 的 Bloch 指数，矩阵必须作相应规范变换。

代表元乘积 `g h = {E|Δ_gh} j` 中的整数缺陷不能丢掉。代码既验证小群内

```
U_g(k) U_h(k) = exp(−2πi k·Δ_gh) U_j(k)，
```

也验证一般跨纤维关系

```
U_g(hk) U_h(k) = exp(−2πi (ghk)·Δ_gh) U_j(k)。
```

稳定子表使用 `t_g−L_g0`，使操作确实固定种子，而非只在模平移意义下固定。独立检查 `轨道多重性 × 稳定子阶 = |G/T|`，并检查表示维数为 `轨道多重性 × 局域轨道维数`。

## 小群分解和交互输出

使用 `symmetry_core` 建立与晶格缺陷相同的因子系统，求经过乘法与正交性验证的小群不可约表示，利用完整特征标向量的内积分解。输出同时给出非负整数重数、特征标重建误差、维数守恒和幺正性检查。D1、D2 等是本次计算的局部编号，不是 BC/Bilbao 标准标签，不能用来跨 k 点追踪能带。

图中第一幅显示选定 k 的小群特征标。群 4 和群 19 还给出沿 z 轴的 `2₁` 本征相位分支 `λ±=±exp(−iπkz)`，并逐点检查 `U_S²=exp(−2πikz)I`。它们是对称本征值，不是能量色散。

独立物理测试还覆盖：手算的群 4 螺旋矩阵与单个实空间 Fourier 和式；边界 `±i` 本征值；移动反演中心导致的边界宇称变化；群 19 的 R 点反对易代数与两份二维射影表示；立方原点 p 三重态；3c 轨道的九维 p 表示；所有位点、s/p、Γ/边界/内部线上点的乘法和维数。

## 参数与范围

参数为 `group`、`site`、`orbitals`、`kPoint`、`kz`。`site=auto` 对群 2/221 选择原点，对群 4/19 选择一般位点。`kPoint=line` 才使用 `k=(0,0,kz)`，`kz` 范围为 0–1/2。其他选项是显式坐标 Γ、X=(1/2,0,0)、Y、Z、M、R；字母只是界面简称，不声明跨晶胞约定一致。

不适用的位点组合会明确拒绝。接口返回统一 `parameters/summary/plots/tables/warnings/checks`，并附完整 `spaceGroup/site/representation/irreps/decomposition/screw/convention` 数据，所有复数都采用 `{re,im}`，可以无损存为 JSON。

这里没有完整 Wyckoff 数据库、任意位点局域不可约表示、双值/磁能带表示、全布里渊区兼容图、一般 EBR elementary 判定或拓扑分类。完整 p 局域空间在某些稳定子中本来可约；位点诱导表示也不自动是 EBR。材料案例仅借用理想结构骨架，不给出真实占据、能量或材料拓扑结论。

## 一手来源

- [Cano 等，Building Blocks of Topological Quantum Chemistry: Elementary Band Representations，PRB 97, 035139 (2018)](https://arxiv.org/abs/1709.01935)：局域位点表示、诱导和 elementary 判据。
- [Elcoro 等，Double crystallographic groups and their representations on the Bilbao Crystallographic Server，J. Appl. Cryst. 50, 1457–1477 (2017)](https://arxiv.org/abs/1706.09272)：DSITESYM/BANDREP 与位点诱导的关系。
- [Bilbao SiteSym 方法说明](https://cryst.ehu.eus/html/rep/sitesym/sitesym_help.html)：实空间局域激发和空间群表示的位点对称方法。
- [spglib 官方 dataset 文档](https://spglib.readthedocs.io/en/stable/dataset.html)：Wyckoff 与位点对称数据定义。本实验不需要运行 spglib。
