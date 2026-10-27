# 量子几何与拓扑诊断

本模块将已有紧束缚工具中的 Berry、Wilson 与 Chern 概念接入连续的教学流程，并新增量子度规、规范相位检验、解析闭隙诊断和网格收敛对照。它是 SSH/QWZ 两带模型计算器，不是任意第一性原理材料的拓扑分析器。

入口 `quantum_geometry_lab.run(payload)`，浏览器 API action 为 `quantum_geometry_lab`，计算路线为 `#compute/quantum-geometry-lab`，课程模块为 `geometry`，属于 `quantum-materials` 内容组。只依赖 NumPy；没有额外 Python 文件、网络或原生程序依赖。

## 模型、带与单位

选定负能量下带，化学势放在零能隙。动量坐标是无量纲 ka，以弧度表示，a=1；所有能量采用共同任意单位。量子度规对 ka 求导，因此当前数值无量纲；改用带物理长度单位的 k 时必须转换导数和单位。

- SSH：`H=(t1+t2 cos k) σx+t2 sin k σy`，t1、t2 非负，分别为胞内和胞间跃迁。
- QWZ：`H=s[sin kx σx+sin ky σy+(m+cos kx+cos ky) σz]`，s>0 是整体能量尺度，m 是无量纲质量参数。

使用固定的周期轨道基，布里渊区边界缝合矩阵为单位矩阵。U(1) 测试仅把一个带的本征矢乘上 k 依赖相位；不改变晶胞、原点或轨道嵌入。后几种操作可能改变 SSH 的 Zak 约定及度规表达，不能与本征态相位自由度混为一谈。

## 量子几何与符号

采用 `Aμ=i<u|∂μu>`，并固定二维取向为 kx 后 ky：

```text
P=|u><u|，Qμν=<∂μu|(1−P)|∂νu>=Tr[P ∂μP ∂νP]
gμν=Re Qμν，Ωμν=−2 Im Qμν
Qμν=gμν−iΩμν/2
```

对 `H=d·σ`，令 `n=d/|d|`，下带投影为 `(I−n·σ)/2`。程序通过解析 d 的导数计算：

```text
gμν=(∂μn·∂νn)/4
Ωxy=n·(∂xn×∂yn)/2  （下带）
det g=Ωxy²/4，tr g≥|Ωxy|  （二维两带纯态）
```

这些符号与现有 `magnetictb_browser.py` 的 `A=i<u|∇u>` 约定一致。选择上带或反向定向会改变曲率/Chern 的符号。SSH 是一维模型，界面只显示 gkk 与 Zak；内部无 ky 依赖的形式扩展将 gxy、gyy、Ωxy 置0，不将它们解释为材料二维响应。

## 链变量与规范检验

对相邻态定义 `Uμ=<u(k)|u(k+δμ)>/|overlap|`。在本站符号约定下：

```text
Zak=−arg∏k U(k)，以 [0,2π) 代表元报告
flux(k)=−arg[Ux(k) Uy(k+δx) Ux*(k+δy) Uy*(k)]
C=Σflux/(2π)
```

边界链接包含在周期闭环中。若任意链重叠≤10⁻¹⁰，该网格链算法标为无效。相位滑块使用光滑周期相位函数 α(k)，报告改变前后的投影最大残差、所有链重叠模的最大差与闭环拓扑差。改变相位不应改变这些量；检验通过并不证明物理模型完整或网格已收敛。

## 全局带隔离与收敛

有限网格可能漏掉带交叉，所以程序先使用模型的解析直接间隙：

- QWZ：`Δdirect=2s min(|m+2|,|m|,|m−2|)`；临界点 m=−2、0、2。
- SSH：`Δdirect=2|t1−t2|`；t1=t2 时 k=π 闭隙，t1=t2=0 时全带简并。

QWZ 的间隙公式可由 `|d/s|²=2+m²+2m(cx+cy)+2cxcy` 推导；它对 `cx=cos kx, cy=cos ky` 是双线性函数，其最小值可在方形四角取得。

隔离阈值为 QWZ 的 `10⁻¹⁰s` 或 SSH 的 `10⁻¹⁰ max(t1,t2,10⁻¹²)`。闭隙或低于阈值时主拓扑值、解析相标签和闭环相位比较均留空。局部未简并点仍可显示度规与曲率；局部简并点用 JSON `null` 表示，不伪造零度规，也不返回 Infinity/NaN。

采用以−π为起点、右端点不重复的 N 与 `2N−1` 网格。二维数值 Chern 需在两层网格均有效、与已知模型解析相值一致、且单元通量未逼近分支边界时才出现在主结果中。QWZ 相图在本站下带/取向约定为：

| m 区间 | C |
| --- | --- |
| m<−2 | 0 |
| −2<m<0 | +1 |
| 0<m<2 | −1 |
| m>2 | 0 |
| m=−2、0、2 | 未定义：带闭隙 |

SSH 有隙时 t2>t1 给 Zak=π，t1>t2 给0（模2π）。该值依赖已声明的周期轨道/胞内胞间键约定，不能直接当成无约定的绝对材料电极化。

`topology.defined` 表示通过全局带隔离检查；`numericallyResolved` 表示当前数值网格通过诊断。即使数学上有隙，网格不可靠时主 `value` 仍为空，收敛表会保留各网格值及其偏差。直接对解析曲率作黎曼积分的误差单列，不因 FHS 已给整数而隐藏它。此诊断利用了两种模型的已知解析结果，不声称是对任意模型的完备收敛证明。

## 输入

```json
{"model":"qwz","mass":-1,"energyScale":1,"t1":0.6,"t2":1,"mesh":31,"pathSamples":121,"gaugeStrength":1,"kx":0.6,"ky":0.4}
```

| 字段 | 范围与默认值 |
| --- | --- |
| model | qwz 默认，或 ssh |
| mass | −6至6，默认−1；只用于QWZ |
| energyScale | 0.05至10，默认1；只用于QWZ |
| t1、t2 | 0至5，默认0.6、1；只用于SSH |
| mesh | 9至101的整数，默认31；收敛加密网格最大201 |
| pathSamples | 31至401的整数，默认121；QWZ为每路径段点数，SSH为整条路径点数 |
| gaugeStrength | 0至20，默认1；改变本征矢相位，不改变Hamiltonian |
| kx、ky | −π至π，默认0.6、0.4；SSH只使用kx |

所有数值须有限，布尔值不算数字，整数参数必须为JSON整数，未知字段会被拒绝。两模型接受同一组字段，返回 `unusedParameters` 说明没有参与当前模型的字段。

## 输出与图形

- `bands.distance/energies/ticks`：SSH 的−π到π或QWZ的Γ–X–M–Γ。
- `heatmap`：仅QWZ提供；kx、ky一维坐标和 `[ky][kx]` 的 gxx、gxy、gyy、metricTrace、berryCurvature、gap、valid。
- `line`：仅SSH提供；k、metric、gap、energies、valid。
- `selection`：当前波数的局部几何、下带 `<σ>=−n`、相位变换前后本征矢和投影。复数为 `[re,im]`。
- `topology`：定义性、网格可靠性、数值/解析结果、解析间隙、闭隙点与解释。
- `convergence`：N与2N−1的链算法值、曲率积分及误差、最小链重叠、最大单元通量和采样间隙。
- `gauge/checks`：规范残差、两带几何恒等式与解析/采样间隙对照。

## 教学内容与验证

`data/quantum-geometry-content.json` 是供全站目录合并的内容片段，包括5个预设、3课、3道各4步的练习和3个模型/方法案例。练习涵盖：gkk=1/4的SSH极限、整体能量尺度与态几何、Chern取向、局部几何不等于总拓扑、奇数网格漏采Γ闭隙，以及规范检验的适用边界。

`python scripts/test-python-quantum-geometry-lab.py` 独立验证投影算符有限差分与Kubo速度矩阵表达式、QWZ相图、随机逐点规范与坐标反向、SSH解析度规与Zak、两带度规恒等式、网格漏采闭隙、近临界错误离散整数、JSON有限性和输入上限。

## 来源

实现与教学文字为本站原创，不是对下列软件整包移植。

- [Fukui, Hatsugai, Suzuki (2005)](https://arxiv.org/abs/cond-mat/0503172)：离散网格上的规范不变Chern算法。
- [Qi, Wu, Zhang](https://arxiv.org/abs/cond-mat/0505308)：二维晶格拓扑模型背景。
- [tbkit 量子度规教程](https://cpoli.github.io/tbkit/api/gallery/topology/plot_quantum_geometry.html)：投影量子几何张量、度规与曲率约定。
- [Su, Schrieffer, Heeger (1979)](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.42.1698)：SSH与聚乙炔的历史背景；本站不求解真实聚合物结构。
