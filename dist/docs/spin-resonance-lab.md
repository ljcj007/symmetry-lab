# 磁共振与有效自旋

这个计算器对一个有效电子自旋和至多一个核自旋进行有限维矩阵对角化。它连接能级、磁场方向、微波磁偶极选择定则和热平衡频率吸收。计算核心只依赖 NumPy，在浏览器 Python 中执行。

## 模型与坐标

`S=1/2,1,3/2,2,5/2`；`I=0,1/2,1,3/2,2,5/2`。维数为 `(2S+1)(2I+1)`，最大36。

采用共用的晶体主轴，g 张量对角为 `(gX,gY,gZ)`，零场参数为 D/E，超精细张量对角为 `(A⊥,A⊥,A∥)`。这是一组显式受限、可检查的有效参数，不支持任意相对旋转的三组张量。

```
H/h = (μB/h) B·g·S
      + D [Sz² − S(S+1)/3] + E (Sx² − Sy²)
      + A⊥ (SxIx + SyIy) + A∥ SzIz − γN B·I.
```

自旋算符取 ħ=1；H/h、D/E、A 使用 GHz，B 使用 T。核旋磁比 γN 使用有符号 GHz/T，核 Zeeman 作用显式带负号。常数 μB/h 取舍入值13.996245 GHz/T；kB/h 从精确SI定义计算，为约20.836619123 GHz/K。本模块使用普通频率而非角频率。

`theta` 从晶体 z 轴量起，`phi` 是 xy 平面方位角，均以度计：

```
n = (sinθ cosφ, sinθ sinφ, cosθ)
eθ = (cosθ cosφ, cosθ sinφ, −sinθ)
eφ = (−sinφ, cosφ, 0).
```

三个微波线偏振选项为 `theta=eθ`、`phi=eφ`、`parallel=n`。前两个与静磁场方向正交。B=0时theta/phi仍定义所选微波方向，但不代表零磁场存在优先的静磁场轴。微波驱动只含电子磁矩 `M=Σa e₁,a ga Sa`；本页不计算直接核磁共振驱动。

## 热占据、简并与吸收

用 `eigh` 求H的完整本征态。相距不超过 `1e−9 GHz` 的能级归入同一能量子空间。T>0以各子空间的平均能量计算 Boltzmann 占据，组内各态等权；这样极低温也不会把浮点误差当成真实简并劈裂。T=0在完整基态简并空间均匀分配。报告的跃迁以子空间为单位，`from`、`to` 是 `selection.groups` 的序号。

```
strength_AB = Σ(i∈A,f∈B) |<f|M|i>|²
weight_AB = (pA_per_state − pB_per_state) strength_AB
ν_AB = E_B − E_A > 0.
```

这里的 `strength` 是简并子空间之间的矩阵元迹和；不是在任意选择的单一本征矢上求强度。`populationDifference` 是每个态的占据差。子空间求和保证同能基底旋转不改变谱线。零频简并内部跃迁不报告为有限频率吸收；小于 `1e−14` 的矩阵元模方总和按数值零处理。

每条线用正频轴上单位归一的 Lorentz 形状展宽：

```
L+(ν;ν0,γ) = [γ / (π((ν−ν0)²+γ²))] / [1/2 + atan(ν0/γ)/π], ν≥0.
```

`lineWidth=γ` 为半高半宽（HWHM），单位GHz。没有按每张谱的最高点归一，因此温度改变的净吸收权重会保留下来。该线形是正频吸收的教学展宽，不提供完整复磁化率或负频响应。输出为相对电子磁偶极权重（省略共同 μB²）每GHz，不是校准的吸收功率或场调制导数谱。

程序独立计算当前窗口的解析谱面积，比较频率网格梯形积分；相对差大于等于2%时标为待加密。窗口捕获低于总权重的80%时提示扩大范围。该检查针对线形采样，不是对有效Hamiltonian近似的精度证明。

## 磁场扫描与解析极限

磁场从0均匀扫描到 `fieldMax`，使用固定theta/phi及其余参数。`fieldScan.energies` 返回每点排序后的H/h本征值；能量重心为零，没有在每个磁场上把最低能量重新设为零。曲线编号表示能量排序，交叉附近不保证跟踪同一个绝热本征态。

纯Zeeman的S=1/2、I=0极限满足

```
ν = (μB/h) B g_eff,
g_eff = sqrt(gX² nx² + gY² ny² + gZ² nz²).
```

`selection.effectiveG` 始终只表示这个几何组合；有其他作用时它不应替代完整能级差。各向同性g、纯Zeeman时，parallel驱动与H对易，有限频率吸收为零；不能把这条选择规则自动推广到各向异性或混合自旋模型。

S=1、B=0时的零场能量为 `−2D/3, D/3−E, D/3+E`。S=1/2的二阶零场算符恒为零。S=I=1/2、各向同性A、B=0时分别得到能量 `−3A/4` 的单态与 `A/4` 的三重态，作为独立解析核验。

## 输入范围

| 参数 | 范围或选项 | 单位 |
|---|---|---|
| spin / nuclearSpin | 上述整数、半整数集合 | 无量纲 |
| gX / gY / gZ | 0.2…5 | 无量纲 |
| zeroFieldD / zeroFieldE | −30…30 | GHz |
| hyperfinePerp / hyperfineParallel | −3…3 | GHz |
| nuclearGamma | −0.1…0.1 | GHz/T |
| field / fieldMax | 0…3 / 0.001…3 | T |
| theta / phi | 0…180 / 0…360 | degree |
| polarization | theta / phi / parallel | — |
| temperature | 0…500 | K |
| lineWidth | 0.001…2 | GHz HWHM |
| frequencyMin / frequencyMax | 0…100 / 0.001…100，终点大于起点 | GHz |
| frequencyPoints / fieldPoints | 整数41…501 / 11…121 | — |

不支持的参数明确报错；不会在接到SOC、粉末、脉冲或弛豫请求时静默忽略。

## 课程与跨模块项目

三个单元分别讲解方向依赖的Zeeman共振、零场/超精细作用，以及占据/偏振/采样；配三道各四步的练习。七个预设提供解析基准、g张量旋转、S=1的D/E对比、电子核耦合和纵向暗态。

“局域多电子态 → 有效自旋 → 共振谱”项目先运行已有 `multiplet-d8-nio`，确认该近似中的S=1；再比较 `resonance-spin1-isotropic` 和 `resonance-spin1`，只改变D/E。g=2、D=2.87 GHz、E=0.15 GHz是另行给定的教学参数，不是NiO或某个缺陷中心的拟合值。基态S不能单独决定g/D/E；从微观模型得到这些参数还需要SOC、投影和低能子空间假设。

## 验证与范围

`python scripts/test-python-spin-resonance.py` 独立核验角动量对易关系、各向异性解析频率与矩阵元、Boltzmann双重态强度、零场S=1、Breit–Rabi能级、Kramers简并、简并子空间旋转不变性、正频线形面积、欠采样提示及最大36维空间。

当前不含多核、多电子有效自旋中心、核四极项、高阶自旋晶场、粉末平均、饱和、弛豫、脉冲或光泵浦；也不从材料结构自动拟合参数。核心是原创NumPy实现，未调用或移植完整EasySpin软件。

理论与实验约定参考 [EasySpin Spin Hamiltonian](https://www.easyspin.org/documentation/hamiltonian.html) 与 [EasySpin pepper](https://www.easyspin.org/documentation/pepper.html)。
