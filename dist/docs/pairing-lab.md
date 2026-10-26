# 超导配对与 BdG 教学模型

本模块在浏览器内用 NumPy 对给定配对势进行计算，包含二维方格自旋单态模型和一维有效无自旋 Kitaev 链。它不求解自洽能隙方程，不预测临界温度、配对机制、材料参数、输运电导或实验中的 Majorana 信号。

## 参数和单位

调用 `pairing_lab.run(payload)`，API action 为 `pairing_lab`。`model` 为 `square_singlet`（默认）或 `kitaev`。`hopping` 即 t，范围 0.05–5，默认 1；`chemical_potential` 即 μ，范围 −25–25，默认 0；`gap` 即 Δ₀，范围 0–5，默认 0.4。三者使用同一个任意能量单位。动量为 ka，以弧度表示；晶格常数设为 1。

方格的 `pairing` 为 `s`、`extended_s`、`d_x2_y2`、`d_xy`、`d+id`，默认 `d_x2_y2`；`grid` 为 11–81，默认 41；`path_samples` 为每条高对称线段的采样数，11–121，默认 61。Kitaev 链的 `sites` 为 6–80，默认 40；其动量路径有 `2*path_samples+1` 点。参数必须为有限数，整数参数不能有小数，布尔值不算数字；未知参数报错。返回的 `parameters` 只保留该模型实际使用的参数。

## 方格模型及节点

正常态 ξ(k)=−2t(cos kx+cos ky)−μ。标量配对 Δ(k)=Δ₀f(k)，基函数依次为：

| 配对 | f(k) | D₄h 标记 |
|---|---|---|
| s | 1 | A₁g |
| 扩展 s | (cos kx+cos ky)/2 | A₁g |
| d(x²−y²) | (cos kx−cos ky)/2 | B₁g |
| d(xy) | sin kx sin ky | B₂g |
| d+id | (cos kx−cos ky)/2+i sin kx sin ky | B₁g+iB₂g |

这些幅值约定不代表不同基函数具有相同的费米面均方值。方格中 B₁g 和 B₂g 是不同的一维不可约表示；等幅 d+id 是指定的复组合，晶体对称性不强制两分量简并或同时凝聚。Δ₀>0 时该复组合破坏时间反演；本模块不计算 Chern 数。

完整 Nambu 基为 (c_k↑,c_k↓,c†_−k↑,c†_−k↓)。自旋配对矩阵 D=Δ(k)iσy，四维 BdG 矩阵为 H=[[ξI₂,D],[D†,−ξI₂]]。自旋部分反对称、轨道部分为偶函数，满足 D(k)=−Dᵀ(−k)。粒子—空穴算符 C=τxK，满足 C H(k) C⁻¹=−H(−k)。能谱为二重简并的 ±√(ξ²+|Δ|²)。正负能带含 Nambu 冗余，不能重复计算独立激发。

零能要求同时满足 ξ=0 和 Δ=0。程序对这些特定函数解析判断，不使用显示网格最小值判断是否有节点。正常态费米面要求 |μ|≤4t；带边只剩一个点。非零 s 波无节点；d(x²−y²) 和 d(xy) 在正常态费米面存在时有节点。扩展 s 在此最近邻模型的费米面上等于 −Δ₀μ/(4t)，μ=0 时整条费米面为零能集合。d+id 仅在 μ=±4t 的带边闭合。Δ₀=0 为正常态。

`sampled_min_energy` 明确是有限网格采样值；即使解析判断有节点，它也可能大于零。`fermi_surface` 是正常态 ξ=0 等能线，不等同于超导态零能集合。`phase` 在 |Δ|=0 处的零数值是占位符；绘图应淡化这些点。

## Kitaev 链及端态

实空间 h_jj=−μ、h_j,j+1=−t；配对 D_j,j+1=Δ₀、D_j+1,j=−Δ₀。动量空间 D(k)=2iΔ₀ sin k，体能谱为 E=±√[(2t cos k+μ)²+4Δ₀²sin²k]。Δ₀ 是键配对幅值，与方格的动量基函数幅值约定不同。

体能隙以 x=cos k∈[−1,1] 对 E² 的二次多项式解析最小化求得，独立于绘图网格。Δ₀≠0 且 |μ|<2t 为有隙拓扑相；|μ|=2t 体能隙闭合。Δ₀=0 且 |μ|≤2t 为无隙正常链。只有有隙情况下才给出 ν=sgn[(μ+2t)(μ−2t)]，−1 为拓扑、+1 为平庸；无隙时返回 null。

开放链去掉首尾连接，用 2N 维厄米矩阵直接对角化。返回最低 |E| 四态及 |u_j|²+|v_j|² 空间权重（不是电荷密度）。最低双态的平均权重总和为 1，对该双态子空间内换基不变；若与其他态进一步简并，则选取两态本身不唯一。有限链端部模式可能杂化，能量分裂不必为零；不能由有限链最小能量替代无限体拓扑判据。μ=0、Δ₀=t 时存在两个精确零模，分别位于两端，双态平均权重两端各为 1/2。

## 输出契约

共有 `tool`、`model`、`parameters`、`summary`、`bands`、`checks`、`warnings`、`sources`、`derivation`。`bands.energies[k_index][band_index]`，`bands.distance` 与 `ticks[{value,label}]` 对应路径坐标。方格 `gap_map` 的实部、虚部、幅值、相位、ξ、正能量均为 `[ky_index][kx_index]`；`fermi_surface.branches` 提供各支 kx、ky 和复能隙信息。Kitaev 的 `chain` 提供格点、全谱、四个选中态及最低双态的平均权重。

检查包含厄米性、完整 Nambu 粒子—空穴关系和费米反对称性。独立测试包含解析谱、周期实空间链与体谱比较、不同节点、手性配对、正常态、相变、精确端态、有限尺寸分裂、归一化和严格 JSON 序列化。

示例：[d 波节点](../examples/pairing-square-d.json)、[d+id 复配对](../examples/pairing-square-chiral.json)、[Kitaev 端态](../examples/pairing-kitaev-endstates.json)。

## 参考

- [Kwant 官方教程：超导与粒子—空穴自由度](https://kwant-project.org/doc/latest/tutorial/superconductors)
- [Kitaev 原始论文：Unpaired Majorana fermions in quantum wires](https://arxiv.org/abs/cond-mat/0010440)
- [Topology in condensed matter：Kitaev 链](https://topocondmat.org/w1_topointro/1D.html)
