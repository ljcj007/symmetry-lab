# 螺旋、滑移与动量相关简并

本实验直接求解周期两带/四带 Hamiltonian。三维操作为滑移 `{m_y|a_x/2}` 或二重螺旋 `{C₂x|a_x/2}`，分析路径为沿 x 的一维动量线。它不是材料能带计算、完整三维空间群分类或三维拓扑指数求解器。

## 约定与表示

界面输入倒格分数 `f_x`，矩阵参数 `k=2π f_x`。胞内 A/B 在 `x=0,a/2`，采用晶胞 Fourier 标签构成的周期 Bloch 基底。单值基底为 `(A,B)`，双值为 `(A↑,A↓,B↑,B↓)`。

\[
S(k)=\begin{pmatrix}0&e^{-ik}\\1&0\end{pmatrix},\qquad S(k)^2=e^{-ik}I.
\]

双值表示 `G=S⊗iσ_axis`，滑移取 axis=y，螺旋取 axis=x。这里旋转整体符号是明示的双群中心约定。时间反演取 `T=(I⊗iσ_y)K`，有 `T²=−I`；单值取 `G=S,T=K,T²=+I`。因此 `G²=(−1)^(2s)e^(−ik)I`，双值本征值为 `±i e^(−ik/2)`。`H` 和 `G` 都满足 `k→k+2π` 严格周期，缝合矩阵为 I。

三维小群检查使用倒格分数：滑移 `R=diag(1,−1,1)`，螺旋 `R=diag(1,−1,−1)`；要求 `Rk−k` 的每个分量为整数。TRIM 另要求 `2k` 每个分量为整数。模型没有横向色散，故离开小群时图形可能仍相同；代码明确关闭伙伴交换保护结论，不能把此偶然结果解释成一般材料保护。

## 真实 Hamiltonian 与交叉

定义 `A=(1+cos k)τ_x+sin k τ_y`、`B=sin k τ_x+(1−cos k)τ_y`。双值模型为

\[
H=tA\otimes I+\lambda B\otimes\sigma_{\rm axis}
 +m\tau_z\otimes I+bI\otimes\sigma_{\rm axis}
 +\epsilon\cos k\,I.
\]

单值模型为 `H=tA+mτ_z+bB+ε cos k I`，忽略 λ，b 是破时间反演轨道项，不是自旋 Zeeman 场。

当 m=b=0，写 `Q=cos(k/2)τ_x+sin(k/2)τ_y`，有 `H₀=2Q⊗[t cos(k/2)I+λ sin(k/2)σ_axis]`。能量为 `±2[t cos(k/2)±λ sin(k/2)]`，共同色散再加 `ε cos k`。t、λ 限制为正，四带内部交叉在 `k*=2 atan(t/λ)`。单值两带在 k=π 配对。绘图加入解析交叉点，所以没有用有限网格错过节点后声称开隙。

双值 Γ 端 Kramers 伙伴有相反的 ±i 标签；X 端同一 Kramers 对有相同的 ±1 标签。需要 G、T 均对称、整条线属于 G 小群、两端都是 TRIM，才报告伙伴交换保护。能量简并块内重新对角化 G，避免使用数值求解器在简并空间任选的基矢。

## 开隙与挑战的严格范围

“中间隙”始终指同一 k 的中间两条排序能带之差，再对 Γ—X 取最小值，是直接隙。它不是间接隙，也不证明三维材料绝缘。

`mτ_z` 与 H₀ 反对易并破 G、保 T；b=0 时全线最小直接隙恰为 `2|m|`。双值端点仍满足 Kramers 条件。

最小破缺挑战从 m=b=0 出发，枚举加入 m=0.3 和/或强 T 破缺项。双值取 `b=8(t+λ+1)`，用 Weyl 界得到

\[
\Delta_{\min}\geq 2b-4\sqrt{t^2+\lambda^2}-2|m|>0.
\]

单值取 b=2t，`t cos(k/2)+b sin(k/2)≥min(t,b)`，直接隙下界为 `4 min(t,b)>0`；质量进一步增加能隙。每项同时返回数值扫线最小值与严格下界。基线包含解析交叉点，故最少一个所列扰动即可达到目标。这里比较的是实际加入的矩阵项，不是删去对称性标签后假设系统会自动变化。

约束图模去平移与双群中心后只显示 G/T 标签商，阶数 4/2/1；完整关系中的 Bloch 相位和 T² 负号仍由矩阵检查保存。这不是空间群子群数据库。

## 交互与验证

- 表示回放：k 与 Rk、两个位点及跨胞、S、G、G²、H、本征子空间。
- 子空间作业：提交当前 k 的最低能量子空间；相位和内部酉换基应视为等价。
- 8 个预设（含 2 个跨模块核对预设）、3 节课、3 组各 4 步练习、2 道预测题、3 个材料/机制案例。
- 独立验证：解析本征值、群关系、时间反演、周期缝合、端点标签、反对易质量、全线下界与小群反例。

运行 `python scripts/test-python-nonsymmorphic.py`。

## 一手文献

- [Wang et al., Hourglass fermions, Nature 532, 189–194 (2016)](https://www.nature.com/articles/nature17410)
- [Ma et al., Experimental evidence of hourglass fermion in KHgSb (2017)](https://doi.org/10.1126/sciadv.1602415)
- [Wang, Jian & Yao, Hourglass semimetals with nonsymmorphic symmetries in three dimensions (2017)](https://arxiv.org/abs/1702.06140)
- [Wieder & Kane, Spin-orbit semimetals in the layer groups (2016)](https://doi.org/10.1103/PhysRevB.94.155108)

文献提供保护机制与材料背景。本页的最小 Hamiltonian 及挑战矩阵在此完整定义，未将其冒充为上述材料的拟合模型。
