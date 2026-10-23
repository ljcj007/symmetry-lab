# 基础李群课堂

课堂将晶体的离散对称与连续对称连接起来，围绕 U(1)、SU(2)、SU(3) 编写了 8 节中文课程、8 个分步例题和 16 道自测题。课程正文、题目和示意图独立编写，公开讲义用于核对数学定义与约定，不复制书页、论文图片或外部题库。

## 学习路径

| 课程 | 要回答的问题 | 例题 |
| :-- | :-- | :-- |
| 连续与离散 | 无限群是否一定连续？ | U(1) 中的 C₄ 子群 |
| 酉矩阵 | 为什么概率总和不变？ | 区分 U(2) 与 SU(2) |
| 生成元与对易子 | 操作顺序为何重要？ | [σx/2,σy/2]=iσz/2 |
| SU(2) 旋量 | 两个复分量如何表示三维方向？ | +z 绕 y 转 90° |
| 双覆盖 | 2π 与 4π 回转有何区别？ | 单路径旋转后的干涉 |
| 表示 | 2、3、8 各指什么维数？ | 同一中心元素作用于 j=1/2 与 j=1 |
| SU(3) 生成元 | 为什么需要八个实参数？ | T₁ 混合两个基态 |
| Cartan、权与根 | 三角形权图和六边形根图如何关联？ | E₁₂ 的根及相位演化 |

课程正文放在 `data/lie-group-lessons.json`，含来源链接、目标、推导、易错点与自测解析。自测进度独立保存，不覆盖点群或空间群课堂的既有进度。

## 统一数学约定

使用列向量与主动变换。矩阵乘积 ABψ 表示先作用 B，再作用 A。

```text
ψ′ = Uψ
U(θ) = exp(−iθT)
T† = T，Tr T = 0
X = −iT 是无迹反厄米李代数元
[Ta,Tb] = i Σc fabc Tc
```

SU(2) 取 `Ta=σa/2`，SU(3) 取标准 `Ta=λa/2`，均满足 `Tr(TaTb)=δab/2`。两个厄米矩阵的普通对易子是反厄米矩阵；公式中的 i 不能丢掉。李群中的指数使用实参数；角度在核心计算中用弧度。

SU(2) 对归一化二分量态 `(a,b)` 给出 Bloch 向量：

```text
r = (2 Re(a* b), 2 Im(a* b), |a|²−|b|²)
⟨S⟩ = (ℏ/2)r
U(n,θ) = cos(θ/2)I − i sin(θ/2)(n·σ)
```

U=exp(−iθn·σ/2) 对 Bloch 向量给出右手主动旋转。纯态 Bloch 向量长为 1；相位相差一个整体因子的态对应同一点。`U(2π)=−I`、`U(4π)=I` 是态向量的结论；孤立纯态在 2π 后的所有测量概率相同。若只让一个相干路径获得这个负号，负号成为相对相位，才可能改变干涉。

SU(3) 的 Cartan 坐标采用 `(T3,T8)`，不采用粒子物理中可能另行缩放的 `(I3,Y)` 坐标：

```text
w1 = ( 1/2,  1/(2√3))
w2 = (−1/2,  1/(2√3))
w3 = (   0, −1/√3)
αij = wi − wj，i≠j
```

基本表示中的三个权与六个非零根应分别绘制。伴随表示还包含两个零权方向，但零不是根。权的概率平均是期望值，不是另一个本征态的权。Eij 用于复化李代数；物理厄米生成元由 Eij 与 Eji 的组合构成。

T₁ 的基本表示指数周期是 4π。T₈ 的最小正周期是 4π√3；在 θ=4π√3/3 时指数等于中心元素 `exp(−2πi/3) I₃`，此时态只改变整体相位，矩阵并未回到 I₃。不可把所有 SU(3) 生成元都设置成相同的“4π 回原点”结论。一般实线性组合定义的单参数演化还可能没有有限正周期。

## 与晶体课堂的关系

空间群有无限多离散晶格平移，仍不同于连续平移群。有限正旋转点群在 SU(2) 中的原像有助于理解双群；含反演、镜面等操作时还需指定对应表示。磁群的量子时间反演是反酉操作，不能只用一个普通 SU(2) 矩阵取代复共轭。

三维原子坐标、经典磁矩、二分量旋量和三能级复振幅是不同对象。SU(3) 不是三维实空间旋转群 SO(3)，也不是任意磁性材料自动具有的对称性。本课堂的理想二能级、三能级实验用于学习矩阵变换，不预测具体材料的波函数、能带、磁基态或夸克动力学。

## 来源与进一步阅读

- 李群、表示、覆盖和根系的数学定义：[Pavel Etingof · MIT Lecture Notes](https://ocw.mit.edu/courses/18-755-lie-groups-and-lie-algebras-ii-spring-2024/mit18_755_s24_lec_full.pdf)。
- 共轭转置、酉矩阵与内积：[Vincent Bouchard · Unitary representations](https://sites.ualberta.ca/~vbouchar/MAPH464/section-unitary.html)。
- SU(2) 生成元及其到 SO(3) 的映射：[Vincent Bouchard · SU(2)](https://sites.ualberta.ca/~vbouchar/MAPH464/section-su2.html)。
- SU(2) 不可约表示与 `2j+1`：[MIT 8.323 · Recitation 7](https://live.ocw.mit.edu/courses/8-323-relativistic-quantum-field-theory-i-spring-2023/mit8_323_s23_rec07.pdf)。
- Gell-Mann 矩阵、迹归一化与 Cartan 生成元：[David Tong · The Strong Force](https://www.damtp.cam.ac.uk/user/tong/sm/standardmodel3.pdf)。
- 自旋回转与干涉的物理背景：[Lawrence Berkeley National Laboratory · Symmetry in Rotation](https://www2.lbl.gov/abc/wallchart/chapters/05/1.html)。

来源于 2026-10-23 核对。不同讲义可能采用 `exp(+iθT)` 或反厄米生成元；阅读时应先统一符号，再比较旋转方向与结构常数。
