# 石墨烯理想模型与 Wannier 能带输入

先在 [MagneticTB 工作台](../#magnetictb) 选择理想石墨烯模型并运行。模型的两个子晶格等价，三条最近邻跃迁在 K 点的相位之和是 $1+\omega+\omega^2=0$，其中 $\omega=\exp(2\pi i/3)$。先预测两条能带在 K 点的间隔，再从图中核对。这个理想模型的能量以设定的跃迁为尺度。

## 用配套文件计算原始路径

回到工作台的 WannierTools 算例。读取并核对两份源文件后，表单会使用 `Graphene_hr.dat` 的实空间 Hamiltonian 和 `wt.in-bands` 的晶格与路径。也可以从上游下载两份文件并在浏览器中核对。检查输入后手动运行，查看 M–K–Γ–M 路径和 K 点的两条能量。本例使用原文件打印的 $k=(0.33333333,0.33333333,0)$，路径坐标以这份晶格的倒格分数表示。

原文件含 2 个轨道、315 个平移块。构造 Bloch 矩阵时，把每个实空间块除以对应的权重 $d_R$，再乘上相位 $\exp(2\pi i k\cdot R)$ 求和。沿配套路径有 304 个采样点，能量以 eV 表示。

## 检查 K 点的能带间隔

| 输入与检查 | 结果 |
| --- | --- |
| 理想最近邻模型的 K 点相位和 | $0$，两条能带简并 |
| Wannier 输入在所给 K 点的两条能量 | 约 −1.262198730 和 −1.259253270 eV |
| 同一点的间隔 $E_2-E_1$ | 约 2.94546 meV |

把表单中 K 顶点的前两个坐标都改为 `0.3333333333333333`，即双精度下的 $1/3$，再运行并从能带 CSV 核对间隔。它仍约为 2.946 meV。把两条能量一起平移会保持间隔。原文件的加权实空间矩阵满足 $H(-R)=H(R)^\dagger$，而独立复算得到的路径上最大 Bloch 厄米残差约为 $3.03\times10^{-14}$ eV。厄米性保证本征值为实数，K 点是否简并需要另外检查对称性和模型条件。这里的数值间隔对应给定文件和路径上的一个点。

## 来源与课堂

对照 [WannierTools 固定版本的石墨烯示例目录](https://github.com/quanshengwu/wannier_tools/tree/362171ce35450118828c6960a882e3a6d08c73f5/examples/Graphene) 中的 [实空间跃迁文件](https://github.com/quanshengwu/wannier_tools/blob/362171ce35450118828c6960a882e3a6d08c73f5/examples/Graphene/Graphene_hr.dat) 和 [晶格及路径设置](https://github.com/quanshengwu/wannier_tools/blob/362171ce35450118828c6960a882e3a6d08c73f5/examples/Graphene/wt.in-bands)。继续在[能带交叉课堂](../#classroom/crystal?module=bands&tab=learn&lesson=band-crossing)比较对称性保护和扰动引起的变化。
