# 用共享算例检查高阶计算的证书

打开下面的链接会定位到工具里的指定算例。先确认要载入该算例，再检查填入的 JSON，最后手动运行。可以直接把同一个链接发给同学复算。

| 算例 | 在计算结果中核对 |
| --- | --- |
| [六维非循环群的 Z 类与仿射类](../#compute/advanced/carat_integral?preset=noncyclic-affine) | Z 类和仿射类各有 2 个，分别核对完整性字段和证书。 |
| [六维非直和整数格的正规化子](../#compute/advanced/integral_normalizer?preset=glued6) | 核对无限群标记、完整性和 742 个生成元的验证；生成元的数量与群的阶含义不同。 |
| [六维 A₅ 的算术中心化子](../#compute/advanced/arithmetic_centralizer?preset=a5) | 核对秩为 2 的整数序、两个经核验的单位群生成元和二次序的 Pell 证书。 |
| [BNS 1.3 的反铁磁半平移共表示](../#compute/advanced/symbolic_spacegroups?preset=magnetic) | 在 BC 波矢 `(1/2,0,0)` 核对反幺正操作、返回的共表示和验证状态。 |

在整数类算例中，先找区分两个代表的证据，然后比较 Z 类与仿射类各自的完整性证书。在正规化子算例中，先确认单个矩阵满足正规化条件，再读完整性证书如何处理所有可能的变换。每份证书对应这一次计算的输入和算法分支。

在快捷查找中输入 `BNS 1.3 共表示` 或 `Kramers 共表示`，也可以找到符号空间群工具。具体输入范围请参阅[整数分类](integral-classification.md)、[正规化子](integral-normalizer.md)、[算术中心化子](arithmetic-centralizer.md)和[符号空间群](symbolic-spacegroups.md)。
