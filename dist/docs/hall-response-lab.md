# 内禀反常霍尔与横向热电

`hall_response_lab.run(payload)` 为 NumPy 教学核心，在浏览器和 CPython 中使用同一实现。不依赖其他本站 Python 模块。计算固定周期轨道基底的二维 QWZ 两带模型；不导入真实材料或完整 Wannier 几何矩阵元。

## 模型、符号与单位

H=s[sin(kx)σx+sin(ky)σy+(m+cos(kx)+cos(ky))σz]，能量为 ±s|d|。

- s (`energyScale`) 用 eV，温度用 K，μ 用 eV，动量为无量纲 ka。
- 采用 A=i〈u|∂u〉与 kx→ky 取向。下带 Ω−=d·(∂xd×∂yd)/(2|d|³)，上带 Ω+=−Ω−。
- e>0，电子电荷−e；定义 jx=σxy Ey−αxy ∂yT。因此 σyx=−σxy，αyx=−αxy。
- σxy=−(e²/ℏ)Σn∫BZ d²k/(2π)² Ωn fn，单位 S，是二维片响应。
- αxy=(e kB/ℏ)Σn∫BZ d²k/(2π)² Ωn sn，sn=−fn ln fn−(1−fn)ln(1−fn)，单位 A/K，也是片响应。这是扣除平衡磁化电流后的内禀输运系数。
- 对 m=−1，孤立下带 C=+1；零温、μ=0 的 σxy=−e²/h。符号不能脱离电流方向和曲率约定比较。
- **αxy 不是开路 Nernst 电压。** 完整开路张量 S=σ⁻¹α 还需要同一体系的纵向及其他分量；当前页面不拼接无关模型，不报告开路信号。

无自旋简并乘二。有限温度两条带都参与求和；满/空两带总响应抵消，μ=0 的熵权重逐点抵消。严格 T=0 时 α 取极限零。金属的零温阶跃占据不经过人为展宽。

## 输入

| 键 | 默认 | 范围 |
| --- | --- | --- |
| mass | −1 | −5…5 |
| energyScale | 1 | 0.02…5 eV |
| temperature | 300 | 0…5000 K |
| chemicalPotential | 0 | −20…20 eV |
| mesh | 61 | 整数15…121 |
| muMin / muMax | −3.5 / 3.5 | −20…20 eV，终点严格大于起点 |
| scanPoints | 61 | 整数11…101 |

温度和化学势是独立参数，不求解固定载流子浓度的 μ(T)。`mesh` 使用完整均匀二维网格，不能用高对称路径替代。

## 输出与收敛

`selection` 提供 σxy、σyx、αxy、αyx、量子单位归一化值、`defined`、`numericallyResolved` 和中文原因。`scan` 包含化学势与每一点的响应及独立稳定标记。`heatmap` 包括下带曲率、两带占据加权曲率、两带熵加权曲率和直接能隙；热图数组按 `[ky][kx]` 排列。

每次比较 N×N 与 2N×2N。下带普通曲率积分与解析 C 的误差须不大于0.01；选定点的 σ 差容差为 max(0.002,0.02|σfine|)，以 e²/h 归一化；α 差容差为 max(0.0005,0.05|αfine|)，以 e kB/h 归一化。每个扫描点分别进行相同检查。这些条件是可见的数值诊断，**不是数学误差上界**，也不能替代更密网格和温度检查。

解析间隙 Eg=2s min(|m+2|,|m|,|m−2|)。当 Eg≤10⁻¹⁰ eV，本实现要求的孤立带不存在，主结果与扫描留空，`defined=false`。未简并采样点的几何热图仍可显示，但不能把它们解释为已计算闭隙体系的完整输运。该处理限制当前算法，不断言所有闭隙体系的物理横向响应都无定义。

接近闭隙但仍有隙时，主结果作为待收敛估计保留，并设置 `numericallyResolved=false`，显示加密提示。绝缘体中的局部非零曲率不意味着非零 C；金属中的霍尔值也不必保持下带 Chern 的符号。

## 与其他模块的连接

- 量子几何中的 QWZ m=−1、s=1 给出 C=+1，与本页零温平台的 σxy/(e²/h)=−1 一致。
- 跨模块金属预设保持同一 m、s，改为 μ=1.3 eV、T=300 K，使用121→242网格，展示非量子化响应及非零α。
- bcc Fe仅为公开材料方法背景；内置所有互动数值均来自QWZ，没有拟合或复现真实铁的响应。
- 真实Wannier Berry计算一般需要位置/连接矩阵和轨道嵌入信息，不能将hr-only输入等同于完整第一性原理响应。

## 核验与来源

运行 `python scripts/test-python-hall-response.py`。测试包括解析平台、独立速度矩阵 Kubo 曲率、以零温霍尔谱作能量卷积对照熵积分、μ与质量反转对称、全满/全空、零温和高温极限、联合能量温度缩放、闭隙/欠采样诊断、单位和非法输入。

- [Xiao等，Berry相位与反常热电输运](https://arxiv.org/abs/cond-mat/0604561)：输运与磁化电流区别及热电熵核。
- [Wannier90 Berry方法说明](https://wannier90.readthedocs.io/en/latest/user_guide/postw90/berry/)：联络、曲率和霍尔响应约定。
- [Wannier90 bcc Fe教程](https://wannier90.readthedocs.io/en/latest/tutorials/tutorial_18/)：材料背景与热点求积收敛。
- [Qi、Wu、Zhang二维晶格模型](https://arxiv.org/abs/cond-mat/0505308)：模型拓扑背景。

课程文字、预设与习题为本站原创教学内容，参数不代表材料测量数据。
