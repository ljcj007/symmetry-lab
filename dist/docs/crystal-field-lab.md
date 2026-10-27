# 晶场、d轨道与线性 Jahn–Teller 模型

本模块由浏览器内 Python/NumPy 计算，公共 action 为 `crystal_field_lab`，界面路由为 `#compute/crystal-field-lab`。`mode=crystal_field` 是完整十维**单电子** d⊗spin Hamiltonian；`mode=jahn_teller` 是另一个明示参数的线性 E⊗e 绝热模型。两者没有自动相互截断或拟合。

## 单电子基、能量和坐标

五个实轨道依次为 `[xy,yz,xz,x2-y2,z2]`；每个轨道的上、下自旋相邻，所以十维基为 `[xy↑,xy↓,yz↑,yz↓,xz↑,xz↓,x2-y2↑,x2-y2↓,z2↑,z2↓]`。十维表示一个电子可以处于的基态数，不是电子填充数。

实球谐在单位球面满足 ∫Y_iY_j dΩ=δ_ij，定义为：

| 轨道 | 单位球面角函数 |
|---|---|
| xy | √(15/4π) xy |
| yz | √(15/4π) yz |
| xz | √(15/4π) xz |
| x²−y² | √(15/16π)(x²−y²) |
| 3z²−r² | √(5/16π)(3z²−1) |

实基的相位同时用于角动量矩阵和轨道图。L 的单位为 ℏ，S=σ/2，SOC 为 λΣα Lα⊗Sα。`splitting`、`ds`、`dt`、`soc` 均以 eV 输入。

正分裂量 Δ 在八面体中给 E(t₂g)=−2Δ/5、E(e_g)=3Δ/5；在四面体中给 E(e)=−3Δ/5、E(t₂)=2Δ/5。两种约定均使五轨道重心为零。Td 没有反演，因此标签不加 g/u。这里的 Δ 是各自独立的参数，没有自动套用两种配位之间的经验比例。

四方项在上述顺序的对角系数是 `Ds*[2,-1,-1,2,-2] + Dt*[-1,4,4,-1,-6]`。在八面体背景下 Δ=10Dq，完整轨道能量为：

- xy：−4Dq+2Ds−Dt。
- yz、xz：−4Dq−Ds+4Dt。
- x²−y²：6Dq+2Ds−Dt。
- z²：6Dq−2Ds−6Dt。

Ds/Dt 是现象学能级参数，不由显示的配体位置拟合，也不能脱离模型直接解释为某个实际键长伸缩。配体保持等距理想几何：八面体的 ±x/±y/±z，四面体的 (1,1,1)、(1,−1,−1)、(−1,1,−1)、(−1,−1,1)，后者各除以 √3。键长1只是可视化单位。

## SOC、简并与角密度

H=diag(E_d)⊗I₂+λL·S，保持时间反演 T=(I₅⊗iσy)K、T²=−1。本模型没有磁场，能级始终满足 Kramers 成对简并。自由离子极限 Δ=Ds=Dt=0 给：j=3/2 四态的能量 −3λ/2；j=5/2 六态的能量 λ。λ<0 时排序反转。

以 `1e-9*max(1,max|E|)` eV 容差分组。单个简并本征矢可以任意换基，故主要角密度由整组投影 P/d 平均并对自旋求迹得到：ρ_orb=Tr_spin(P/d)，n(Ω)=Yᵀρ_orbY，∫n dΩ=1。`groups.orbital_weights` 与选中密度的轨道权重求和为1，不是电子占据数。`levels` 中的单个态权重仅对应数值求解器的一种基选择。

`angular_map.density` 是每立体角的概率密度；界面可以取 r=√n 展示形状，但这个半径不是真实径向距离。实轨道函数可以用正负颜色显示；自旋迹/简并平均后的密度没有单一波函数相位。本模块没有径向波函数、电子相互作用、Hund 多重态、共价杂化或电荷转移。NiO 只作局域配位背景，不能用这里的单电子谱推断其 d⁸ 高低自旋、磁基态或实测光谱。

SOC 扫描从0到当前λ，各点按能量排序；不声称在交叉处追踪同一个本征态。λ=0时扫描范围退化为一个点。

## 独立线性 E⊗e 模型

电子基为 `[z2,x2-y2]`，两个 Q 是**无量纲约化坐标**。H_el=g(Q₂τx+Q₃τz)，弹性能为 K(Q₂²+Q₃²)/2。K>0，g使用 eV，K使用eV（因Q无量纲）。电子对角化后，令ρ=√(Q₂²+Q₃²)，两张绝热势能面为 V±=Kρ²/2±|g|ρ。

g≠0时下势能面极小集合为ρ₀=|g|/K的圆，V_min=−g²/(2K)，稳定化能 E_JT=g²/(2K)。径向曲率为K，切向曲率为0。上势能面在原点取0。g=0时两个面重合为弹性抛物面，极小位置只有原点，也没有锥形交叉。

圆谷是该线性截断模型的偶然连续简并，不是实际晶体完整空间旋转对称性。高阶耦合和环境可选择离散方向。这里不包含核动能、振动零点能、动态JT隧穿、温度、多电子占据或SOC。Q不能未经标定当作Å位移或质量加权正常坐标。

全局极小以解析公式给出，即使超出二维图的显示窗口；`minimum.whole_circle_in_plot` 与 `any_minimum_in_plot` 说明覆盖范围，径向曲线包含极小半径。所选点的下态在劈裂低于数值阈值时不作唯一解释，显示双态平均权重 `[0.5,0.5]` 并令 `state_defined=false`。

## 输入与输出

公共输入为 JSON 对象，未知字段报错。布尔值、非有限数字、复数对象、字符串数字与超范围数均拒绝。

| 参数 | 范围 | 默认 |
|---|---|---|
| coordination | octahedral / tetrahedral | octahedral |
| splitting | 0–5 eV | 1 |
| ds、dt、soc | −2–2 eV | 0、0、0.1 |
| selected_level | 整数0–9 | 0 |
| angular_grid | 整数9–41 | 21 |
| scan_points | 整数9–121 | 61 |
| coupling | −5–5 | 1 |
| stiffness | 0.05–20 | 2 |
| q2、q3 | −5–5 | 0.2、0.3 |
| q_extent | 0.1–5 | 1.5 |
| grid | 整数11–81 | 41 |

界面切换时可保留另一模式的字段；所有已传字段仍经过验证，但另一模型字段只在 `inactive_parameters` 中回显，不进入本次 Hamiltonian。`parameters` 只回显作用字段。

共有输出为 `tool/mode/parameters/summary/checks/steps/warnings/sources`。CF 输出 `levels/groups/selection/orbitals/ligands/hamiltonian/soc_scan/angular_map`，角图矩阵顺序为 `[theta_index][phi_index]`，theta有n点，phi有2n点且包含接缝。JT 输出 `surfaces/radial/minimum/selection`；二维势能矩阵顺序为 `[q3_index][q2_index]`。

数值验证包含厄米性、时间反演、Kramers、L代数、角积分和本征方程；独立测试还把L矩阵与−i r×∇直接作用于轨道多项式比较，检验正负SOC解析谱、基函数正交性、简并换基不变性和JT全局极小。

## 参考与示例

- [Quanty NiO教程](https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate)：材料背景及与多电子计算的区别。
- [ESRF Crispy晶场约定](https://crispy.esrf.fr/en/stable/user_guide/crystal_field.html)：Ds/Dt与轴约定。
- [Quanty D4h](https://www.quanty.org/physics_chemistry/point_groups/d4h)：表示与坐标背景。
- [Requist等线性E⊗e研究](https://arxiv.org/abs/1710.04041)：模型背景；本站仅实现上述绝热势能部分，不复现该论文的完整电子—核计算。
- 示例：[八面体](../examples/crystal-field-octahedral.json)、[四面体](../examples/crystal-field-tetrahedral.json)、[负SOC极限](../examples/crystal-field-negative-soc.json)、[JT圆谷](../examples/crystal-field-jahn-teller.json)。
