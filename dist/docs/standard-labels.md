# BC / Bilbao 标准表示标签

网站现在可以查询 BC 标准特征标表，并将计算所得的 D1、D2 等本地编号映射为 BC 和 Bilbao 标准标签。匹配使用完整小群的全部特征标，不依据维数或数值本征向量的排序猜测名称。原来的本地编号会保留。

## 已包含的数据

- **BC：230 个普通空间群，单值与双值，6,928 张有名 k 点／k 线表。** 从 SpaceGroupIrep 的 `LittleGroupIrepData.wl`、`AbstractGroupData.wl` 以及 `LGIrepLabel` / `DLGIrepLabel` 提取，包含扩展 Mulliken 标签、BC Γ 型标签、抽象群表示编号、维数、reality 指标及精确特征标。
- **Bilbao：230 个普通空间群，460 个单值／双值原始文件，共 2,700 张最大 k 点表。** 来源是 IrRep 保存的 Bilbao 表，冻结于提交 `4f43f138d30ef37a499a297ac9b1ec8ef14717cc`。原始十进制振幅和相位有舍入误差，因此其匹配是有容差的数值匹配。
- 非对称型原胞、原点选择、旋转命名和自旋上下分量顺序已经转换到网站的 BC 约定。源文件、许可证、文件 SHA-256 和检验记录随网站提供。

BC 和 Bilbao 的编号不必相同。例如空间群 4 的 Z 点，BC `Z1` 对应 Bilbao `Z2`，BC `Z2` 对应 Bilbao `Z1`。程序通过特征标得到这项对应。

## 使用

在普通空间群工作台计算后打开“BC / Bilbao”结果页。也可通过 Python JSON 接口 `standard_labels` 查询：

```json
{"action":"table","group_number":4,"k_label":"Z","double_valued":false}
```

列出指定群的有名 k 点／线：

```json
{"action":"catalog","group_number":144,"double_valued":true}
```

查询螺旋轴参数线：

```json
{"action":"table","group_number":144,"k_label":"Delta","parameter":"173/1000"}
```

`Gamma`、`Lambda`、`Delta`、`Sigma` 分别是 `Γ`、`Λ`、`Δ`、`Σ` 的输入别名。有多个布里渊区形状时可指定 `bz_type`，例如 `OrthFace(b)`；不指定时保留所有适用的表及可能的名称歧义。

`annotate` / `match` 接收 `{group_number,k,double_valued,operations,irreps}`，或接收现有数值引擎的 `analysis`。每个表示提供 `id`、`dimension`、`characters`。字符可以是精确算式、`[实部,虚部]` 或 `{re,im}`。操作必须是当前 BC 空间群在该 k 的**完整**小群，允许重新排序和添加整数晶格平移；重复操作、缺列、非整数旋转、错误 Seitz 平移都会被拒绝。

## 约定与证据

平移相位为 `exp(-2π i k·t)`。BC 抽象群共轭类的生成元幂按源表展开；Herring 群代表与选定 Seitz 代表的差通过精确平移相位补偿。一般 k 线使用源表给出的中心扩张。双值表使用 BC 明确给定的 SU(2) 提升，每项乘法符号都经精确矩阵恒等式检查。

Bilbao 表采用相反的特征标约定，按 SpaceGroupIrep `buildTr4BCSrep` 的原始说明取复共轭。随后转换常规晶胞到 BC 原胞，逐个检查原点、旋转和平移，进行自旋坐标旋转与上下分量交换，并补偿整数平移和双覆盖截面的正负号。

匹配优先使用空间群自身的 k 星变换。额外提供 3,935 个通过完整 Seitz 共轭检查的仿射正规化子变换，用于 BC 与 Bilbao 选用不同等价 k 代表的情况。这是有限的、逐项有证书的变换库，并不声称枚举了整个无限正规化子。若多个允许变换给出不同标签，结果标为 **ambiguous** 并列出候选，用户需要指定 k 名称、BZ 类型或比较约定。

螺旋轴的表示标签可能在 `u → u+1` 时置换。因此程序保留输入 k 的原始参数，优先精确的参数代表，不先把 k 归约至 `[0,1)`。原点、平移、自旋截面及参数会在匹配证书中显示。

默认 BC 数值匹配阈值为 `2e-5`；Bilbao 为 `2e-4`。BC 数据本身是精确表达式，但连接数值计算结果时仍属于数值识别，输出保留实际残差。

## 验证与明确边界

- 全部 93 个源抽象群特征标表正交检验通过。
- 全部 6,928 张 BC 表正交及 `Σ dim² = |G_k|` 检验通过。
- 全部 460 个 Bilbao 源文件、2,700 张 k 表成功转换，旋转／原点／自旋截面对齐检验通过。
- 对 230 个群各自的 Γ 点，用网站独立的数值表示算法计算单值和双值表示：**BC 460/460、Bilbao 460/460 均唯一匹配**。
- 对 2,700 张 Bilbao 表的 8,907 个表示逐一匹配 BC：8,779 个唯一匹配，104 个因允许的外部正规化子约定有多个名称，24 个位于 BC 原表没有对应名称的三斜晶系点。后两类保持歧义／空值。

“全部”指上述冻结目录的全部条目，而不是给任意 k 或任意表示创造标准名字。Bilbao 冻结数据不包含一般参数 k 线；这些位置仍能返回 BC 标签，但 Bilbao 一栏为空。BC 原书没有命名的特殊点也不伪造 BC 标签。磁空间群共表示的标准名称属于另一套目录，本功能不把普通空间群标签冒充磁共表示标签。符号空间群工具的 E/M 编号仍保留原有含义；自动标签对接的是网站的普通空间群数值工作台。

参数线在小群增大的端点不再适用，应重新计算该端点的小群并查询对应点表。

检验记录：[manifest.json](../data/labels/manifest.json)、[validation.json](../data/labels/validation.json)。源表压缩包：[bilbao-source.zip](../data/labels/bilbao-source.zip)，许可证：[IrRep GPL-3.0](../licenses/IrRep-LICENSE.txt)。

## 重建

在仓库根目录运行：

```text
python scripts/build-standard-labels.py
python scripts/build-bilbao-labels.py
python scripts/test-python-standard-labels.py
```

第二步默认从冻结的 `bilbao-source.zip` 重建；若本地存在经过检查的 IrRep 源码目录，也可显式传入该目录。构建脚本只解析静态源数据，不需要 Mathematica。网页运行端不解析 Wolfram 源码，也不执行用户输入。

主要来源：[SpaceGroupIrep](https://github.com/goodluck1982/SpaceGroupIrep)、[SpaceGroupIrep 论文](https://doi.org/10.1016/j.cpc.2021.107993)、[IrRep 数据与代码](https://github.com/irreducible-representations/irrep/tree/4f43f138d30ef37a499a297ac9b1ec8ef14717cc)、[Bilbao REPRES 标签说明](https://cryst.ehu.eus/rep/repres.html)。
