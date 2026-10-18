# Symmetry Lab · 晶体对称性浏览器工作台

整合 [SpaceGroupIrep](https://github.com/goodluck1982/SpaceGroupIrep)、[MSGCorep](https://github.com/goodluck1982/MSGCorep)、[MagneticTB](https://github.com/zhangzeyingvv/MagneticTB) 和 [CrystKit](https://github.com/hongyi-zhao/CrystKit) 的数据与算法工作流。四个项目已实现的计算功能统一使用 Python，通过 Pyodide 在浏览器 Worker 内运行；JavaScript 负责界面、绘图和任务调度。网站为独立实现，不代表上游作者发布或背书。

## 32 点群课堂

左侧“32 点群课堂”（`#pointgroups`）包含分步中文讲解、32 个晶体学点群图谱、可操作的对称变换实验及即时自测。课程参考 Dresselhaus、Dresselhaus 与 Jorio 的 [Group Theory: Application to the Physics of Condensed Matter](https://doi.org/10.1007/978-3-540-32899-5)（Springer, 2008），标注原书章节和印刷/PDF 页码；讲解、例题和绘图为独立编写，网站不提供原书 PDF 或书页图像。

图谱包含国际 / Schoenflies 符号、晶系、群阶、反演/极性/手性、笛卡尔操作矩阵、共轭类、单值特征标及极矢量、轴矢量和二次函数的表示分解。BC Γ 标签与可追溯的 Mulliken 名称并列；复共轭表示明确配对。IR/Raman 标记只表示对称性允许，不预测特定材料的振动频率、模式数量或散射强度。

教学表格由 `python scripts/build-pointgroup-course.py` 从固定群数据生成，并用 `python scripts/test-pointgroup-course.py` 检查全部 32 群的矩阵闭合、共轭类、特征标正交性和表示分解。静态教学无需等待 Python 运行环境；“送入工作台”在相应参考空间群的 Γ 点启动现有 Python 计算。更多约定见 [课程说明](dist/docs/pointgroup-course.md)。

## 空间群、双群与磁群课堂

左侧“空间群与磁群课堂”（`#academy`）沿空间群、双群与自旋、磁群与时间反演三条路线提供 15 个学习单元、15 个分步例题和 30 道带解析的练习。参考原有 Dresselhaus 教材及 IUCr、Bilbao 和原始研究文献，具体来源和适用范围见 [课程说明](dist/docs/symmetry-course.md)。32 点群课堂保留为入门课程。

教学目录覆盖全部 **230 个空间群、1,651 个磁空间群和 122 个磁点群**，支持编号/符号检索、晶系/磁群类型筛选，以及单值或自旋双值工作台跳转。目录中的操作数指平移商的代表操作数，完整空间群仍是无限群；磁群 BNS 首段的含义按类型区分。目录不把“含分数平移”当成 symmorphic / nonsymmorphic 分类判据。

四种交互实验由同一个 Python 接口 `teaching_labs` 计算：Seitz 平移/螺旋/滑移复合与 Bloch 相位、自旋 1/2 旋量的 2π/4π 旋转、极向量与磁矩在空间/时间反演下的对照、反铁磁半格平移与时间反演的组合。前端只显示 Python 结果并播放预计算帧。反铁磁示意模型明确区分“小群条件”和 `A² = −1`，不将示意箭头解释为真实材料能带预测。

重建目录：`python scripts/build-symmetry-course.py`。验证课程/目录/实验：`npm run test:academy`。四个实验也可由 `python dist/python/cli.py teaching_labs input.json` 在本地 CPython 运行；该模块只用 Python 标准库。课程文本无需启动 Python，交互计算按需加载浏览器解释器。

## 启动与部署

Windows 可以直接双击 `start.cmd` 启动；关闭弹出的命令行窗口即可停止静态文件服务器。

需要支持 ES Modules 的现代浏览器。开发服务器和测试使用 Node.js 22 或更新版本，无需安装 npm 依赖。在项目根目录执行：

```sh
npm start
```

打开 `http://127.0.0.1:4318`。服务器只监听本机。可通过 `PORT` 环境变量更改端口。

将 `dist/` 的完整内容部署到任意支持 JavaScript 模块和 Web Worker 的 HTTP/HTTPS 静态服务器即可。请保留 `data/`、`examples/`、许可证和相对目录结构。不要通过 `file://` 直接打开 HTML；浏览器通常会阻止模块、Worker 或数据文件加载。

应用无需 Mathematica、GAP、Rust 原生扩展或 Python 服务器。首次运行从 jsDelivr 下载 Pyodide 314.0.7 解释器及 NumPy 2.4.6 / SymPy 1.14.0；需要联网并等待加载。群数据和本网站 Python 模块从本站静态文件读取。输入模型、上传文件和计算结果均留在浏览器，没有计算后端。运行任务可点击“取消计算”停止；重新启动解释器后可继续。未实现离线安装或 Service Worker 缓存。

### GitHub Pages

仓库包含 [GitHub Pages 工作流](.github/workflows/pages.yml)。在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，向 `main` 分支推送提交或手动运行 **Deploy GitHub Pages** 即可发布。发布前工作流会运行全部 `npm test` 和 `npm run test:python` 检查，重新生成可下载的 `dist/source.zip`，再把 `dist/` 上传到 Pages。部署成功后，工作流和仓库 Pages 设置都会显示网站链接。

页面资源、数据、示例与 Web Worker 均使用相对路径，支持 GitHub Pages 的仓库子路径，无需填写固定域名。此流程只需要 GitHub 自动提供的令牌，无需设置访问令牌或第三方服务密钥；源码包生成使用 Python 标准库，在线计算仍完全在浏览器运行。

本地 `.openai/` 托管配置、预览截图与 UI 检查记录不提交至仓库，也不包含在源码下载包中。GitHub Pages 配置说明见 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 功能与接口

| 功能 | 实现与边界 |
| --- | --- |
| 群查询 | 230 个 SG、1651 个 MSG、122 个 MPG；磁群 BNS/OG 编号、国际符号及 BC 符号 |
| 群操作 | BC 原胞 Seitz 操作、幺正/反幺正标记、双覆盖自旋矩阵 |
| 小群和 k 星 | 任意输入数值波矢的筛选及倒易空间作用 |
| 不可约表示 | 单值、双值投影不可约表示；维数、矩阵、幺正特征标 |
| 磁共表示 | Wigner a/b/c 类型、完整磁小群矩阵；反幺正矩阵按 `A K` 使用 |
| 全空间群表示 | 普通/磁群的全 k 星诱导表示、反幺正作用和整数格矢平移相位 |
| k 星直积 | 两个数值 k 星的张量积，按总波矢平移子空间分解；支持单/双值奇偶及磁共表示 |
| 能带匹配 | 读取 `vasp2trace`、`MagVasp2trace` 文本及明确排序的 JSON 特征标；分解到数值表示/共表示 |
| 导出 | 表格 CSV 与包含矩阵、约定和验证误差的 JSON |

主要代码入口：

- `dist/python/symmetry_core.py`：SpaceGroupIrep / MSGCorep 的 Python 数值内核，包含不可约表示、共表示、全 k 星诱导、直积和 trace 匹配。
- `dist/python/magnetictb_browser.py`：对称性约束跃迁模型、能带、hr、薄膜和拓扑计算。
- `dist/python/crystkit_browser.py`：有理数仿射群、有限商群、矩阵群和三维数据库识别。
- `dist/python-worker.js` / `python-client.js`：共享 Python Worker 的加载、调度、取消和超时；计算输入仅按 JSON 传入。
- `dist/app.js` / `research-ui.js`：页面交互与结果绘图。
- `dist/engine.js`、`induction.js`、`trace-parser.js` 保留为旧版独立回归参考，网页不调用这些 JavaScript 计算核心。

本机 Python 也可直接使用相同模块：

```sh
python -m pip install -r dist/python/requirements.txt
python dist/python/cli.py magnetictb dist/examples/magnetictb-graphene.json -o graphene-result.json
python dist/python/cli.py crystkit dist/examples/crystkit-space-group.json -o group-result.json
npm run test:python
```

`symmetry_core.analyze_group` 返回的矩阵/特征标使用明确的操作顺序。`littleGroup.unitaryIndices` 是小群内索引，须经 `littleGroup.sourceIndices` 才能映射到输入群的全局操作索引。trace 匹配请使用 `run("match_bands", payload)` 完成排序与分解。

## 坐标、标签与适用范围

1. 旋转和平移采用 Bradley–Cracknell（BC）直接原胞分数坐标；波矢采用其倒易原胞分数坐标。磁群使用 BNS family 对应的原胞。平移相位为 `exp(-2π i k·t)`，反幺正操作的波矢作用为 `-R^-T k`。
2. `D1, D2, …` 和 `C1, C2, …` 保留为本次计算的本地编号。普通空间群另由 `standard_labels` 比对完整特征标、平移相位和自旋提升，输出 BC / Bilbao 标准标签及匹配证书；缺失或歧义标签不强行命名。磁共表示不套用普通空间群标签。输出矩阵可能处于不同的等价基底，不能通过逐元素比较判断是否与论文一致。
3. 原有 SG/MSG 数值表示工具处理指定的数值 k 点，不生成 Wolfram 符号参数表达式或整条符号 k 线。上游高对称点名称可能依赖 BZ 类型；实际计算以坐标为准。
4. 页面晶格和倒易原胞采用示意参数；它们不是输入材料的实验结构，也不是 Wigner–Seitz 布里渊区。不能据此读取定量晶格长度和夹角。
5. trace 必须与选定群的 BC 原胞、原点及自旋框架兼容。新增 `structure_bc` 支持 POSCAR/CIF 到 BC 晶胞的转换。已有 trace 还包含原点相位和自旋框架，不能仅靠晶胞标准化自动转换；`autoConvTraceToBC` 的完整 trace 工作流仍未覆盖。匹配失败时应先准备正确设置的数据。
6. 存储的空间自旋矩阵采用 `↓↑` 基底、上游六位小数精度；trace 的 `↑↓` 基底在匹配时转换。数据库的 `antiunitary` 标记与空间自旋矩阵分开存储，时间反演由计算引擎处理。
7. 反幺正矩阵必须与复共轭算符 `K` 联用，其矩阵迹不作为普通线性特征标。能带共表示分解使用幺正限制的 Wigner 类型归一化；不完整的 Kramers/反幺正伙伴集合会被拒绝。
8. 原有表示、能带与拓扑计算使用双精度数值，并检查乘法关系、因子系统、正交性、维数或重构误差。有限的测试不能证明所有波矢、所有输入与上游标准标签完全等价。大维数全表示和直积仍会受浏览器内存与时间限制。

## trace 示例与限制

`dist/examples/trace-msg.txt` 是上游 Mn₃NiN、MSG `166.101` 文件的真实片段：保留原始电子数、12 个操作、Γ 点及前两个简并能级（共 4 条能带），仅将 k 点总数改为 1。它不是完整能带计算。页面“载入真实示例”会选择对应磁群、Γ 点和双值表示。

原始出处及截取方式记录于 `dist/examples/provenance.json`。解析器最多接收 10 MiB 文本，拒绝缺列、无效索引、非连续能带编号和不一致的能带总数。原始普通 `SG186` 测试文件的自旋框架与当前 BC 数据不兼容，因此测试验证其可解析且不会被错误匹配。

## 验证

```sh
npm test
node scripts/test-induction.mjs
node scripts/test-magnetic-induction.mjs
node scripts/test-trace.mjs
```

测试文件覆盖：

- `test-engine.mjs`：群闭合、波矢作用、单/双值因子系统、小群不可约表示、磁共表示、特征标分解及不合法输入。可选扫描参数以该脚本为准；生成的 `dist/data/engine-validation.json` 记录扫描范围和实际结果。
- `test-induction.mjs`：6 个普通空间群的 38 个全表示及 6 个 k 星直积，检验乘法、平移和维数守恒。
- `test-magnetic-induction.mjs`：18 个 type-II/III/IV 磁空间群、Γ/一般/边界 k 点与两种自旋设置的 254 个全共表示及 18 个直积；检查半线性乘法和平移相位。
- `test-trace.mjs`：真实普通/磁性输入、BC 操作匹配、双覆盖符号、整格矢 Bloch 相位、操作重排、坏输入拒绝，以及真实 Γ 点特征标到数值共表示的端到端重构。

旧 JavaScript 参考实现的 `engine-validation.json` 记录了已完成的 **11,530 次**小群计算：全部 230 SG 和 1651 MSG 在 Γ、`(1/2,1/2,1/2)`、`(0.173,0.271,0.389)` 三个波矢处分别计算单值/双值表示，全部 122 MPG 在 Γ 处计算两种自旋设置。该次扫描失败数为 0，最大记录乘法误差约为 `2.56×10^-14`；它不等于所有连续波矢或标准标签的穷尽验证。

数据提取阶段另用精确有理数检查了所有 1651 个磁群的 676,317 次 Seitz 乘积。平移公分母为 12，全部闭合；230 个普通空间群的 2609 个操作也与 type-I 磁群数据逐一交叉核对。

## 数据与许可

`dist/data/provenance.json` 记录上游仓库树哈希、来源文件、覆盖范围、约定及未移植接口。主要数据来源为 `getBCsymmetry.py`、`LittleGroupIrepData.wl`、`MSGData.wl` 和 `BC_MSG_elements/*.txt`。本网站不会加载 Wolfram 的 `libMLGCorep.mx`。

上游软件作者：**Gui-Bin Liu**。保留的 GPL v3 许可全文位于 `dist/data/LICENSE-SpaceGroupIrep.txt` 与 `dist/licenses/MSGCorep-GPL-3.0.txt`。其他声明见 `NOTICE.txt`。发布衍生版本时应一并保留源码、数据来源和许可声明。

研究中使用原项目数据时，请引用其原始软件与论文：

- SpaceGroupIrep，*Computer Physics Communications* **265**, 107993 (2021)，[DOI: 10.1016/j.cpc.2021.107993](https://doi.org/10.1016/j.cpc.2021.107993)。
- MSGCorep，*Computer Physics Communications* **288**, 108722 (2023)，[DOI: 10.1016/j.cpc.2023.108722](https://doi.org/10.1016/j.cpc.2023.108722)。

## MagneticTB Python 工具

模型输入明确指定晶格行向量、分数原子位置、s/p/d 轨道、完整对称操作及周期方向。支持站点轨道展开、反幺正操作、自旋 1/2 与用户局域矩阵，以线性约束零空间产生数值跃迁基底；每次建模检查厄米性和对称协变性。示例包括石墨烯、自旋链、SSH 和 QWZ Chern 绝缘体。

支持 Wannier90 hr 读写、Bloch 能带、有限边界、薄膜、表面 Green 函数、Wilson 环 / Berry 相位和 FHS Chern 数。Hamiltonian 采用周期轨道规范 `H_ij(k) = Σ_R t_ij(R) exp(+2πi k·R)`，能量单位跟随输入参数。Chern/Wilson 要求占据子空间与其余能带有直接带隙；需提高网格验证收敛。JSON 输出保存规范和数值诊断。

本版本不是上游 >160 个接口的完整兼容层：精确分圆域、符号跃迁约束和闭合多项式轨道基底已在新增符号模块中实现；完整自旋空间群目录、连续自旋群、自动 Wyckoff 和标准 k 路径、DFT 拟合、节点搜索及 Z₂ 不变量仍未覆盖。模型参数不是由真实材料第一性原理自动拟合所得。

## CrystKit Python 工具

精确有理数 Seitz 运算、坐标 / 原点变换、群闭合、点轨道 / 稳定子、有限商群导出群及最小生成元搜索、矩阵块分解、成对矩阵共轭、平移格简化、有限阶 GL(n,ℤ) 算法和三维参考群匹配。使用本站 230 群的 BC 原胞数据库；所有匹配结果须通过完整操作集相等验证，并给出 basis / origin。

有限商群生成元不等于无限空间群最小生成元。新增扩张模块为无限群给出生成证书、上下界；只有上下界相等时才声明最小。可选受限坐标搜索未找到匹配，不证明仿射非同构。CARAT 完整有理类目录和固定整数点群的精确上同调现已提供，范围如下；原 GAP 接口不能直接调用本 Python 模块。

## Python 移植验证与来源

`scripts/test-python-symmetry.py` 对照冻结的旧 JavaScript 独立结果：130 个小群分析、330 个诱导表示、24 个直积及真实 trace 数据，同时检查 Python 结果自身的群乘法、半线性法则、维数与特征标。测试不会逐项强制数值基底相同。新模块测试分别为 `test-python-magnetictb.py` 和 `test-python-crystkit.py`；采用解析模型、精确群恒等式与错误输入检查。

新项目的固定版本、移植范围和参考源码 SHA-256 记录在 `dist/data/python-provenance.json`。`upstream/MagneticTB` 和 `upstream/CrystKit` 保存相关原始源码和声明。MagneticTB 原始许可为 GPL-3.0-only；CrystKit 为 GPL-2.0-or-later，在本组合衍生版本中按 GPL-3.0 发布。许可全文随网站与源码包提供。

完整 Python 数据库扫描记录于 `dist/data/python-symmetry-validation.json`：11,530 次分析全部通过，最大记录矩阵乘法误差 5.66×10⁻¹⁴；记录包含实现源码 SHA-256。该扫描不能替代对任意连续波矢和真实材料设置的核验。

## 精确代数与高维群（2026-10-16）

网页新增“精确代数与高维群”，与原有工具共用浏览器内的 Python Worker。`browser_api.py` 提供相同的本机 / 浏览器 JSON 分发接口，提供 `carat`、`carat_integral`、`integral_normalizer`、`arithmetic_centralizer`、`symbolic`、`symbolic_interfaces`、`symbolic_spacegroups`、`crystkit_ext` 八种精确工具。输入不经过 eval 或任意代码执行。

### CARAT 分类

固定上游 [CARAT](https://github.com/lbfm-rwth/carat) 修订 `65619d6ae4ec911c8cf7aa3c9fa09866a0d36ab9`，提取全部 **8,329 个 Q 类代表**、精确整数生成元、群关系、特征矩阵和类数。1–6 维 Q 类数量为 2、10、32、227、955、7103；数据按维数 gzip 压缩并延迟加载，可通过 `scripts/build-carat-data.py` 从固定源码重建。来源文件及哈希见 `data/carat/manifest.json`。

- `catalog`：按维数、阶及名称检索，支持 `offset` / `limit` 分页。
- `representative`：返回精确矩阵与群关系，可施加指定坐标变换。
- `classify`：从输入整数矩阵闭合有限群，计算共轭类与精确特征不变量；需要时用群代数中心的本原幂等元和有理交织矩阵验证 Q 类。输出 `q_status`、`z_status` 与明确证书。
- `invariant_lattices`：穷尽指定有限指数内的 HNF 不变子格，给出整数共轭代表与完成范围。不同子格可能属于同一 Z 类，**不把子格数当作 Z 类数**。

Q 等价允许 GL(d,ℚ) 变换，Z 等价要求 GL(d,ℤ)，仿射等价还包括平移部分。完整 Q 类目录并不等于完整高维 Z 类 / 仿射类枚举器；上游存储的 Z 类、仿射类“数量”也不等于本站已经生成了所有这些代表。新的 `carat_integral` 与 `integral_normalizer` 模块进一步实现下述有证书算法；新增有限导子区间与算术中心化子算法的具体证明范围见后文；并未预先生成全部高维 Z 类和仿射类。三维全仿射等价类为 219；通常的 230 空间群类型按手性进一步区分，不能混用这两个计数。

### 精确符号模块

`symbolic_core.py` 使用安全 AST 数学解析器和 SymPy 精确域直接构造约束，**不通过数值 SVD 再猜测有理数**。支持：

- 有理数、根式、复数、实 / 正参数假设；表达式化简、展开、因式分解、矩阵行列式、秩、零空间、逆及特征多项式。
- 分圆域 ℚ(ζₙ) 中的精确运算、共轭、迹、范数和矩阵零空间。
- 厄米 / 幺正 / 反幺正对称约束的精确跃迁参数化，符号 Bloch Hamiltonian、k 线代入、小矩阵精确谱和数值模型导出。
- 闭合多项式轨道基底（含七个 f 轨道）的精确旋转表示；有限阶多项式 k·p Hamiltonian 的对称性约束。

符号参数默认实数。一般参数下的矩阵秩有例外集合，结果保留相应非零条件，不能忽略分母或秩变化条件。符号几何需明确提供闭合键集合；自动壳层枚举要求可比较的精确数值几何。网页支持 MathML 公式、JSON / LaTeX 下载。没有承诺等价覆盖上游全部 Mathematica / GAP 接口，自动符号 k 线表示由独立的 `symbolic_spacegroups.py` 精确算法生成，仍不自动赋予 BC / Bilbao 标准标签。

### 群扩张与无限空间群

`crystkit_extensions.py` 以整数 Cayley 关系格与带变换的 Smith 标准形计算 **H¹(P,ℚᵈ/ℤᵈ) ≅ H²(P,ℤᵈ)**，对所有原点变化取商；这里固定输入整数点群 P。支持完整向量系统代表、正规化子作用的轨道、定向轨道与对映体判断。

原扩张模块的度量正规化子仍保留作为后备算法。公开网页 / CLI 的正规化子与扩张轨道接口已接入新增算术正规化子，支持循环群、初等交换 2 群及进一步可证明的情形。用户指定正规化子子群时不会自动假定完整。无限群生成元使用 Schreier 平移格证书、阿贝尔化与有限商下界；只有上下界一致才声明最小。精确原点同余求解不依赖猜测分母网格。

新增测试覆盖二维全部 17 个壁纸群、四 / 六重螺旋扩张、六维上同调、无限群生成证书、分圆域恒等式、精确 Hamiltonian 对称性，以及 CARAT 目录完整性与 Q / Z 区分。大规模计算受浏览器 180 秒任务上限和各算法资源边界约束；未穷尽时明确返回状态或错误。

```sh
python dist/python/cli.py carat dist/examples/carat-catalog-6d.json
python dist/python/cli.py symbolic dist/examples/symbolic-chain.json
python dist/python/cli.py crystkit_ext dist/examples/crystkit-ext-wallpaper.json
```

### 整数类与仿射类

`carat_integral.py` 的 `z_classes` / `affine_classes` 接受 CARAT `name` 或整数 `generators`，维数为 1–6。它构造实际代表，并将 `z_complete` 与 `affine_complete` 分开报告。

- 素数阶循环群 C₂、C₃、C₅、C₇：以平凡、分圆与正则整格块构造全部整数类，并求全部仿射代表。六维对合 `min.178` 得到 **4 个 Z 类、7 个仿射类**。全部 34 个素数阶 Q 类的结果与独立 CARAT 计数一致。
- 已验证的极大序模型优先使用下述有限导子区间算法，不依赖官方类数证明穷尽。旧 `neighbors` 路径仍枚举模素数不变子空间，利用 Smith 不变量、整数等价和等距证书去重；其资源受限结果只有达到独立官方类数时才标记完整。有限搜索没有找到新代表不构成穷尽证明。
- 在各 Z 类上计算完整 H²，再计算正规化子子群轨道。在 Z 类已完整枚举的前提下，完整正规化子，或所有 Z 类的轨道总数恰好达到独立官方仿射类数，均可提供仿射分类完整性证书。后一种证书不把正规化子本身标成完整。
- `z_equivalent` 返回 `equivalent`、`inequivalent` 或 `inconclusive`；不会把同样的有限不变量误当作等价证据。代表序号是本次输出的局部编号，不是 CARAT 官方 Z 名称。

网页可将选中的整数代表直接送入正规化子或固定点群扩张工具。仿射生成元应与输出所列的整数平移格一起使用。资源预算中断时保留已证明结果，并明确指出哪些步骤尚未完成。

### 算术整数正规化子

`integral_normalizer.py` 在 1–6 维处理循环表示和初等交换 2 群表示，包括重复不可约块与非平凡整格粘合。循环分量使用精确分圆整环、单位与 Galois 作用；符号特征分量使用完整 GL(m,ℤ) 生成元。有限格轨道上的 Schreier 稳定子计算恢复原整数格，因而支持无限正规化子，而不限于某个正定度量的有限等距群。

结果提供 `complete`、`finite`、`generators`、`everyGeneratorVerified` 和证明记录。有限搜索预算不是完备性证书。非循环群还可通过特征循环子群的精确 Schreier 归约、已验证的重复绝对不可约张量块，或内在分块度量处理。测试包含 8 个二面体系列、六维重复块、A₄ 加固定轴的 96 阶正规化子。公开入口现进一步接入下述算术中心化子与完整自同构提升算法，旧实现保留作后备。仍未覆盖的数域和除代数类型会明确返回未完成状态。算法证明见 [整数分类说明](dist/docs/integral-classification.md) 与 [正规化子说明](dist/docs/integral-normalizer.md)。

### 精确符号表示接口

`symbolic_interfaces.py` 提供独立的无状态 JSON 接口，复用安全表达式解析器。支持多矩阵分圆域编译与共核、精确线性 / 投影 / 反幺正表示律验证、交织空间、不可约投影与矩阵单位、特征标和张量积分解、子群诱导、Wigner 共表示、Reynolds 对称化、符号 Seitz 运算及 Bloch 规范变换；还支持符号 k 线小群的 Bloch 余循环与全 k 星表示平移相位。共 13 个计算操作；覆盖记录另纳入自动符号空间群接口及 CrystKit 公开函数。

这些接口以用户给定的乘法表、矩阵和因子系统为输入；验证群律、余循环、不可约性等必要前提，不自动生成标准 BC / Bilbao 标签。反幺正交织使用实线性方程，原始分母与一般参数条件随结果保留。逐函数的迁移范围、输入约定与未移植项记录在 `dist/data/symbolic-api-coverage.json`。

```sh
python dist/python/cli.py carat_integral dist/examples/integral-affine-noncyclic-6d.json
python dist/python/cli.py carat_integral dist/examples/integral-involution-6d.json
```

### 有限导子区间与算术中心化子

`finite_conductor.py` 从整数群环在验证过的极大序模型中的指数构造 `c M ⊂ Z[G]`。将每个整数格的极大序包络归一化后，只需遍历 `c Z^d ⊂ L ⊂ Z^d` 的有限区间，因而无需用目录中的类数推断候选已穷尽。支持 1–6 维有限交换群的分圆 PID 分量、分裂有理矩阵代数模型，以及绝对不可约有理表示。完整性仍分别依赖候选遍历、整数等价判定和仿射正规化子轨道完成；超出资源限制的步骤保留未完成标记。`classification_method` 可选 `auto`、`conductor`、`neighbors`，最后一种保留原有受限邻格流程。证明与输入约定见 [整数分类说明](dist/docs/integral-classification.md)。

`arithmetic_centralizer.py` 对任意输入有限整数点群计算饱和交换子整数序、乘法结构常数、单位范数方程以及有理中心本原幂等元分解。`action: order` 只计算整数序；`centralizer` 才请求单位群。完整单位群分支包括可验证的分裂有理表示及任意整格粘合、正定范数的有限单位群、实二次整数序的 Pell 基本单位，以及可与这些分支组合的有限粘合。完整正规化子还需穷尽保持有理特征的群自同构并验证整数提升。一般高次数域、任意除代数和超出预算的单位群计算仍返回明确的未完成状态，不能把已算出的整数序误作已算出全部单位。见 [算术中心化子说明](dist/docs/arithmetic-centralizer.md)。

`crystkit_ext` 的 `affine_properties` / `torsionfree` 检查所有非平凡点群陪集的范数矩阵 Smith 整数可解性，给出无挠性、可定向性和饱和中心平移格。有挠时返回经精确乘方验证的有限阶元素。输入要求完整的原胞整数平移格；非原胞分数平移会被拒绝。见 [仿射性质证明](dist/docs/affine-properties.md)。

### 自动符号空间群表示

`symbolic_spacegroups.py` 从 `group_number`、`magnetic_group` 或给定的精确 Seitz 操作构造符号小群、k 星、投影不可约表示、Wigner 共表示和全 k 星诱导表示。相位使用原始有理平移；双值表示通过不变度量与精确 SU(2) 提升构造，不使用数据库中舍入后的自旋矩阵。输出精确验证所有乘法、特征标正交和维数平方和，保留符号 k 的适用条件。

可用动作包括 `analyze`、`group`、`little_group`、`star`、`central_extension`、`spin_operations`、`origin`、`symbol`、`induce`。`api` / `function` 接受覆盖清单中列出的原接口名，返回统一 JSON 契约。标签 `E/M/F` 为本次计算的局部编号，未经标准表映射；连续参数的特殊值需代入重新计算。有限群阶、分圆阶数和诱导维数预算会显式拒绝过大任务，详见 [符号空间群说明](dist/docs/symbolic-spacegroups.md)。

```sh
python dist/python/cli.py arithmetic_centralizer dist/examples/arithmetic-c3-order.json
python dist/python/cli.py symbolic_spacegroups dist/examples/symbolic-sg-screw.json
python dist/python/cli.py symbolic_spacegroups dist/examples/symbolic-sg-fullstar.json
```

逐项清单包含四个项目的 **319 个唯一公开符号**，其中 175 项为计算接口；其余为数据、选项、显示或外部 I/O。截至本版，83 个计算接口仍没有对应迁移流程，此外有部分覆盖项。清单可在网页按项目、状态或名称检索，不能把整个项目标为已经完整移植。

## 结构转换与标准标签

网页侧栏的“结构 → BC 晶胞”读取本地 POSCAR / CONTCAR / CIF，可设置对称性容差和输入波矢。结果给出 BC 原胞、ITA 常规胞、未理想化晶胞、基矢/原点/倒易坐标变换、生成元与原子协变检查，并导出 POSCAR / CIF / JSON。可直接把识别到的空间群和 BC 波矢送入表示工作台。

结构解析与坐标处理由 Python 完成；空间群识别采用从官方源码构建的 spglib 2.8.0 WebAssembly 内核。输入结构不会传到服务器。CPython 使用官方 `spglib==2.8.0` 包，同一个 JSON API 可本地批处理：

```sh
python dist/python/cli.py structure_bc dist/examples/structure-silicon.json -o silicon-bc.json
python scripts/test-python-structure-bc.py
python scripts/test-python-structure-bc.py --all
python scripts/test-spglib-wasm.py
```

普通空间群工作台自动显示 BC / Bilbao 标准标签，并在专门的结果页提供候选与匹配证书。`analyze` 输入带 `group_number` 时，JSON 的 `standardLabels` 保留本地编号到标准标签的对应关系；矩阵、CSV 与能带分解的本地引用不会因为命名而改变。

方法、适用输入和可复现构建见 [结构转换](dist/docs/structure-bc.md)、[标准标签](dist/docs/standard-labels.md) 和 [spglib 浏览器内核](dist/docs/spglib-browser.md)。普通 230 空间群转换不处理磁结构、部分占位或无序模型；标准标签范围以打包表和匹配证书为准。
