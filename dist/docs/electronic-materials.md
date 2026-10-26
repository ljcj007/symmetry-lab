# 电子态、非线性光学与超胞谱

这组内容把既有点群、自旋表示、物性张量和结构畸变接入三个可在浏览器运行的计算器。共享课程目录为 `data/electronic-materials.json`，包括 9 课、9 道练习、36 个逐步问题、16 个可运行预设和 8 个材料或模型案例。

## 学习与计算入口

| 主题 | 课堂 | 计算中心 | 案例 |
| --- | --- | --- | --- |
| 超导配对与 BdG | `#classroom/spin?module=pairing` | `#compute/pairing-lab` | 方格配对、Kitaev 链 |
| 非线性光学与 SHG | `#classroom/observables?module=shg` | `#compute/shg-lab` | GaAs、BaTiO₃、Si 的对称性背景 |
| 超胞、缺陷与展开 | `#classroom/crystal?module=unfold` | `#compute/unfold-lab` | 周期杂质链、二聚化链、真实 VASP 流程说明 |

统一案例入口为 `#atlas/electronic`。每个课堂主题提供“课程讲解—交互实验—分步练习—材料案例”四个入口。练习每次推进一个推导步骤，错误答案显示提示，正确答案解释推理；进度保存在本机。计算输入、结果和模型限制可以导出，并连接现有材料研究记录。

## 三条学习路线

**超导配对**从 Δ(k)=−Δᵀ(−k) 出发，先区分自旋、空间与轨道指标，再在方格模型中分类 s、扩展 s、d 和复 d+id。正常态费米面与配对函数一起显示，零能节点由 ξ=0 与 Δ=0 的交点决定。Kitaev 链把奇动量配对、体相变和开放链低能权重接起来；在有体能隙条件下，用 |μ|<2t 判定本模型的拓扑区间。

**SHG**先保留 χ_ijk(2ω;ω,ω) 的正确频率标签，再施加 j↔k 的固有置换与完整点群协变约束。Td、4mm、Oh 分别有 1、3、0 个独立分量。改变切面、入射角与复系数，比较四个偏振通道，最后通过反向练习认识整体相位和几何消光造成的不可辨识性。

**超胞展开**先用完美链分清折叠和物理变化，再引入相位投影 W_n(k)=|Σ_j exp(−ikj)c_jn|²/N。杂质、二聚化、交替在位势和真正删去轨道的空位提供不同的平移对称性破缺方式。最后梳理 VASP 波函数后处理所需的信息，说明一般三维展开与本站有界一维模型的差别。

## 反向推理练习

本组练习不仅要求代公式，也要求识别“同一现象不只有一种解释”：

- 配对零线不一定是零能节点；同属 A₁g 的函数也可能有不同节点结构。
- 一个近零能本征态不能单独证明拓扑边界模式，更不能代替真实材料的实验判断。
- χ 与 −χ 的独立强度图相同；一个零 SHG 通道不能唯一证明反演对称。
- 4mm 的一个三阶张量几何投影可以有常数角谱，不能据此把晶体点群改成连续群。
- 类似的展开谱开隙可来自不同扰动；相位、轨道信息和结构证据仍然重要。

可直接验证的练习包括：t=1、μ=−1 的 d 波节点 cos kx=cos ky=1/4；GaAs (001) 在 θ=φ=45°、χ_xyz=1 时 I_PP=1/8；N=2 均匀态的展开权重 [1,0]；N=4 删除一个轨道后固定动量总权重为 3/4。

## 模型范围与材料关联

| 模块 | 已实现范围 | 仍需外部数据或进一步实现的部分 |
| --- | --- | --- |
| 配对 | 二维单轨道自旋单态方格模型、有限开放 Kitaev 链；完整 BdG 对称检查、解析节点/体能隙与端点权重 | 自洽能隙方程、多轨道强 SOC 配对、真实材料临界温度、输运或 Majorana 实验预测 |
| SHG | Td/4mm/Oh 完整点群约束、实/复系数、两种切面与 Euler 取向、四通道相对角谱 | Fresnel 与介电界面、多层传播、表面/多极贡献、实际光学系数、实验拟合和绝对光功率 |
| 展开 | 一维每原胞一个正交轨道、2–12 倍超胞、小型模型与严格预处理 JSON | 一般三维 VASP/WAVECAR 直接导入、非正交多轨道投影、完整 ARPES 光电矩阵元 |

GaAs、BaTiO₃ 与 Si 提供真实晶体对称背景，但示例 χ 值是本站教学构造，不是实测数据。方格配对和 Kitaev 链是模型案例，不把参数直接对应到某种材料。杂质与空位按超胞周期重复，不等于孤立缺陷。

配对核心使用共同任意能量单位；展开预设约定能量为 eV、a=1。SHG 采用共同任意 χ 与场单位，输入场幅为 1，四通道不各自归一。不同模块之间不应把任意单位数值直接当作同一种实测量比较。

## 数据与可复现性

三套核心分别为 `python/pairing_lab.py`、`python/shg_lab.py` 和 `python/unfold_lab.py`，计算只依赖 NumPy。课程中的每个实验预设都用实际 Python 入口运行检查，并测试结果能够编码为不含 NaN/Infinity 的 JSON。

展开导入必须携带完整归一化复本征向量、保留轨道位置和明确的超胞 Bloch 相位约定。只有能量的输入会被拒绝。缺陷引入的缺失轨道谱权重不被自动归一回 1，简并子空间则提醒用户比较合并权重。

内容校验命令：`python scripts/test-python-electronic-content.py`。它检查目录结构、预设可运行性、课程与来源引用、题目答案范围，以及若干课程解析结论与核心计算是否一致。各核心另有独立物理测试。

## 方法来源

课程文字、题目、解析示例与合成参数为本站原创。相关软件作为方法背景来源，不代表本站已经集成其全部功能。

- [Kwant 超导与粒子–空穴教程](https://kwant-project.org/doc/latest/tutorial/superconductors)
- [Kitaev：Unpaired Majorana fermions in quantum wires](https://arxiv.org/abs/cond-mat/0010440)
- [Topology in condensed matter：Kitaev chain](https://topocondmat.org/w1-topointro/d-1/)
- [ShgPy 官方文档](https://bfichera.github.io/shgpy/)
- [Yambo 非线性响应角度依赖](https://wiki.yambo-code.eu/wiki/index.php?title=Angular_dependence_of_non-linear_response)
- [easyunfold 展开理论](https://smtg-bham.github.io/easyunfold/theory.html)
- [easyunfold 与 VASP 工作流程](https://smtg-bham.github.io/easyunfold/tutorial.html)
