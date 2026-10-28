# 多电子晶场与 Hund 多重态

本模块把既有的单电子晶场图扩展到**固定电子数的五轨道 Kanamori 局域模型**。计算在浏览器 Python / NumPy 中完成；同一 `run(payload)` 可通过公共 API 与命令行复现。

它包含立方晶场、密度排斥、自旋翻转和成对跃迁，**不含 SOC**。因此总自旋 S 是当前模型的良好量子数。这里没有完整原子 LS 项分类，也不把单个局域模型解释为真实材料的磁基态、相变温度或实验光谱。

## 轨道与 Fock 约定

轨道顺序为 `xy, yz, xz, x²−y², 3z²−r²`，每个轨道按 ↑、↓ 排列自旋轨道。位串从低位向高位对应这十个自旋轨道，产生算符按这一固定顺序构造 Slater 行列式。所有矩阵元从费米反对易规则计算，未把双占据和交换项的符号作为可调选项。

固定 N 的维数为 C(10,N)，支持 N=0…10，最大为252。计算按 `(N↑,N↓)` 分块，最大块为100维。缓存的是与输入能量参数无关的算符矩阵；改变 U、J 或晶场会重新求谱。

八面体轨道能量为 `(-0.4,-0.4,-0.4,0.6,0.6) Δ`。四面体为 `(0.4,0.4,0.4,-0.6,-0.6) Δ`。两种约定的轨道重心都为零，Δ始终为正的两组间距。四面体标签没有反演的g/u后缀，本站也没有自动套用不同配位间的经验分裂比例。

## 相互作用

相互作用使用同轨道U、异轨道异自旋 `U′=U−2J`、异轨道同自旋 `U−3J`。另外对所有有序 `m≠n` 加入

```
−J S⁺_m S⁻_n + J P†_m P_n,
S⁺_m=c†_(m↑) c_(m↓),
P_n=c_(n↓) c_(n↑).
```

有序轨道对同时包含厄米共轭项。自旋翻转和成对跃迁均不可单独关闭。本实现保留自旋SU(2)，但五个d轨道都使用同一个J的Kanamori近似**不是完整球对称 Slater F⁰/F²/F⁴ 相互作用**；不生成真实原子LS项符号或完整NiO多重态光谱。

固定N时，所有U项合计 `U N(N−1)/2`。因此只改变U会平移整个谱，能级差和本征态保持不变。参数限制 `U≥3J≥0` 是当前教学范围，使密度排斥非负；并非声称数学上不能定义其他参数。

## 能级、简并和自旋

先在各Sz块中对角化H，再在每个同能子空间对角化S²。输出按**能量与S共同分组**，相同能量但不同S仍分开。组简并度包含所有磁分量；`spinMultiplets=degeneracy/(2S+1)`只给组内自旋多重态的份数，不代表已经标注轨道不可约表示。

每组轨道占据在整个联合子空间取迹平均，避免依赖某一组任意选取的简并本征矢。五个占据期望值均在0…2之间，总和为N。基态若偶然包含多个S，`ground.spins`保留它们，`ground.S2`为简并态等权平均，不能把这一平均数反解成单一纯态的自旋。

`gap`是到下一**不同能量**组的间隔。若整个固定N空间只有一个能量，则为`null`，不是零激发间隔的数值预测。数值同能判定容差随能量尺度变化，约为 `2e−9 max(1,Δ,10J)` eV；因此不声称解析区分任意微小劈裂。

## 输入与输出

| 参数 | 范围 / 默认值 | 意义 |
|---|---|---|
| electrons | 整数0…10；默认6 | 固定d壳层电子数 |
| coordination | octahedral / tetrahedral | 立方晶场轨道排序 |
| splitting | 0…10 eV；默认1 | 当前配位的Δ |
| coulombU | 0…20 eV；默认4 | 同轨道密度排斥 |
| hundJ | 0…2 eV；默认0.6 | Hund交换与成对跃迁强度；须U≥3J |
| selectedGroup | 当前联合能量/S组的有效序号，默认0 | 详细展示的组；超界明确报错 |
| scanMax | 0…10 eV；默认5 | 晶场扫描上限 |
| scanPoints | 整数3…41；默认21 | 均匀扫描点数；另插入当前Δ |

输出包括 `dimension`、`orbitalLabels`、`orbitalEnergies`、完整 `groups`、`ground`、`selection`、晶场 `scan`、`checks`、模型说明与来源。

每个扫描点返回基态能量、相对当前所选Δ的基态能量、所有基态S、平均S²、占据和最低不同能量间隔。扫描是一组有限采样点，**不自动定位连续交叉点或材料相边界**；交叉附近应缩小间隔并记录参数。折线插值仅用于视图。

未知参数被拒绝，尤其不能传入 `soc` 而得到忽略SOC的结果。数据不包含实际配体、晶体结构拟合、温度、跃迁、磁场或电荷转移。

## 教学基准

- `multiplet-d6-high`：N=6、八面体、Δ=0.5、U=4、J=0.6 eV，S=2，S²=6。
- `multiplet-d6-low`：保持N、U、J不变，Δ=6 eV，S=0，t₂g接近满占据；成对跃迁使其不严格等于一张t₂g⁶行列式。
- `multiplet-d2-hund`：Δ=0时有30个S=1态在U−3J，14个S=0态在U−J，一个S=0态在U+4J。重数和为45=C(10,2)。
- `multiplet-d8-nio`：NiO仅作局域d⁸配位背景，当前原创参数给S=1；未声称拟合NiO能谱。
- `multiplet-j0`：关闭J同时关闭对应自旋翻转和成对跃迁，检验非相互作用晶场占据及固定N的U公共平移。

命令行示例：

```
python dist/python/cli.py local_multiplet_lab dist/examples/local-multiplet-d6-high.json
python dist/python/cli.py local_multiplet_lab dist/examples/local-multiplet-d6-low.json
```

独立测试 `python scripts/test-python-local-multiplet.py` 检查费米反对易、全部N维数、H/S²对易、SU(2)多重态完整性、两电子解析谱、独立构造的成对跃迁与自旋降低态、J=0组合谱、U平移、电子/空穴关系及高低自旋极限。

## 来源

模型方程与完整交换项参考 [TRIQS Kanamori 定义](https://triqs.github.io/triqs/latest/documentation/python_api/triqs.operators.util.hamiltonians.h_int_kanamori.html) 与 [libcommute Kanamori 示例](https://krivenko.github.io/libcommute/examples/kanamori.html)。多电子NiO背景与完整Slater模型的区别参考 [Quanty NiO 基态教程](https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate)。本站代码、参数、推导题和解释为独立教学实现，不运行这些软件，不声称完整移植其功能。
