# 连续对称性、守恒量与简并保护

版本：20261030-symmetry1。入口为 `#compute/conservation-lab`；课程位于连续群路线。计算只处理一个或两个可区分的自旋 1/2，并将三个问题分开：Hamiltonian 是否保留一个连续生成元、加入环境后是否仍守恒、能级简并是否满足已声明的保护条件。

## 模型与单位

基底为单自旋 `↑, ↓`，或双自旋 `↑↑, ↑↓, ↓↑, ↓↓`。自旋矩阵采用 `S=σ/2`，没有把 Pauli 矩阵直接当自旋。计算矩阵为 `h=H/ℏ`：

`h = Jx SAx SBx + Jy SAy SBy + Jz SAz SBz + hx(SAx+SBx) + hz(SAz+SBz) + δ(SAz−SBz)/2`。

所有 Hamiltonian 系数为 rad/ns，时间为 ns；δ是两站点纵场系数之差。单自旋只使用均匀横场和纵场。初态可选上下极化、x 极化、最大混合态，双自旋还可选反平行态或单重态。

每个站点独立使用 `C1=√γ1 σ−` 与 `Cφ=√(γφ/2) σz`。`σ−` 将上态变成下态；耗散率为 ns⁻¹。这些是给定的 Markov 通道，不从结构、温度或 Hamiltonian 自动确定。零速率意味着相应通道缺失。

## 守恒判据与约束来源

对不显含时间的 Hermitian 算符 Q，闭系统对所有初态守恒的判据是 `[h,Q]=0`。有耗散时，程序直接构造

`L†Q = i[h,Q] + Σc(Cc†QCc − {Cc†Cc,Q}/2)`。

完整算符为零才给出对所有初态的期望值守恒。输出同时包括每个 Hamiltonian 项的对易子、每个通道的伴随贡献，以及完整矩阵之和，不能把各项范数相加代替总和的范数。各向同性交换就是重要的相消实例：y、z 两项分别与总 Sx 不对易，但两者相消。

程序检查总 Sx、Sy、Sz、S²和 h。恒等式性质的量另标为 `trivial`，例如单自旋的 S²=3I/4。S²守恒不足以证明SU(2)：本双自旋1/2的无梯度XYZ模型仍可保留S²，却不保留三个连续旋转生成元。只检查三个坐标轴不足以排除某个斜轴上的额外连续对称性，因此输出不会将三个坐标轴均不守恒表述为“没有任何连续对称性”。

闭系统最大混合态的所有期望值都可保持不变，即使相应 Q 不与 h 对易。这个反例用于说明一条平坦轨迹不能代替算符证明。Noether 定理的连续作用量对称主线通过上述量子生成元判据进入实验；本有限模型不模拟热力学自发对称性破缺。

## 简并保护诊断

物理时间反演采用单自旋 `T=(−iσy)K`；双自旋对两个因子同时作用，故整体 T²=+I。程序计算 `UT h* UT†−h` 的残差，并报告 T² 符号。只有 T²=−I 且 Hamiltonian 保 T 时，才标记 Kramers 保护。

双自旋各向同性交换的三重态可由全局 SU(2) 解释；T²=+I 本身不强制这组三重态，也不要求偶数重简并。对于未由这些条件解释的重合，程序只报告重数，避免将其统一宣称为偶然简并或拓扑保护。

图中扫描独立扰动 `ε Sz`，横轴ε为 rad/ns，能级按每个ε的大小排序。这是静态 Hamiltonian 的能级图，不是 Lindblad 生成元的复谱；排序曲线不能当成跨交叉点固定本征态的身份追踪。能级分组容差为 1e−8 rad/ns，只用于显示重数。

## 约定对照

给定绕 y 的基底变换 `U=exp(−iθ Sy)`，定义新基矢=旧基矢×U。程序一致变换 `h′=U†hU`、`Q′=U†QU`、`ρ′=U†ρU` 和全部 `Cc′=U†CcU`。反幺正部分必须使用 `UT′=U†UT U*`。

换基后的模型重新执行完整时长的矩阵指数传播，并比较能级、期望值、最终密度矩阵与伴随作用的协变残差；同时检查反幺正平方和反幺正变换的协变性。这是表示坐标的改变，不能替代固定外场下实际转动样品的物理实验。

## API 与输出

动作名为 `conservation_lab`。浏览器工作线程需加载 `density_matrix_lab.py` 和 `conservation_lab.py`。前者仅提供 NumPy 实现的 `matrix_exponential` 和 `liouvillian`；本模块自行构建 Hamiltonian、初态、算符诊断和课堂结果。

输入包含 `experiment`（single/pair）、`initialState`、`observable`（sx/sy/sz/s2/energy）、`jx/jy/jz`、`fieldX/fieldZ/gradientZ`、`gamma1/gammaPhi`、`duration`、`points`、`basisAngle`。未知字段、非有限值、超范围值和不兼容初态明确报错。时间范围0–30 ns，采样2–301点，角度−180至180度，Hamiltonian系数−10至10 rad/ns，耗散率0–5 ns⁻¹。

除全站标准 `summary/plots/tables/checks/warnings/formulaLinks` 外：

- `conservation.proofs`：五个 Q 的算符、完整对易子与伴随矩阵、每项贡献、范数和守恒布尔判据。
- `conservation.trajectory`：真实演化的时间、五个期望值、所选Q导数、纯度和复密度矩阵。
- `conservation.degeneracy`：T²符号、T对称残差、Kramers条件、SU(2)条件、能级重数及判据解释。
- `conservation.convention`：原始/换基矩阵、期望与演化协变残差、反幺正变换检查。

计算不通过手动归一化或正定投影修补密度矩阵。采样点上使用同一常量生成元的矩阵指数；采样较稀时提示可能漏掉快速振荡。

跨模块项目预设 `conservation-density-unitary` 与 `conservation-density-bath` 使用同一单自旋纵场 h=0.6Sz、x 极化初态和 12 ns 时间窗。后者加入 γφ=0.25 ns⁻¹，匹配密度矩阵课堂的 `dephasing-plusx`。两个模型的 Sz 均满足完整守恒条件，但后者的横向相干衰减；守恒量与相干性不能混为一谈。

## 独立验证与来源

`python scripts/test-python-conservation.py` 检查解析单自旋进动与耗散、Heisenberg能级、XXZ/XYZ生成元、有限π旋转反例、逐项相消、伴随对偶关系、Kramers条件、独立本征分解传播、换基协变、初态陷阱和所有课程预设。

`python scripts/test-python-principles-crosscheck.py` 还以独立构造检查三模块：带符号置换群的群平均不变量是否完整、轨道与外场稳定子、投影交换张量与群平均是否一致、含反演/镜面和端点交换的自旋量子作用、一般轴 SU(2) 换基，以及两套双自旋模型的 Hamiltonian、能谱与守恒算符是否一致。

连续对称性讲解参考 [David Tong 的 Noether 课程](https://www.damtp.cam.ac.uk/user/tong/qft/qfthtml/S1.html)。开放系统结构参考 [Lindblad 原始论文](https://doi.org/10.1007/BF01608499) 与 [QuTiP 主方程文档](https://qutip.readthedocs.io/en/stable/guide/dynamics/dynamics-master.html)。反幺正与 Kramers 条件参考 [MIT Quantum Theory 讲义](https://web.mit.edu/8.861/www/lect_notes/Lecture15-1.pdf)。数值模型、推导练习和示例参数为本站教学实现，不是材料拟合数据。
