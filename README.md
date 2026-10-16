# Symmetry Lab · 晶体对称性浏览器工作台

整合 [SpaceGroupIrep](https://github.com/goodluck1982/SpaceGroupIrep)、[MSGCorep](https://github.com/goodluck1982/MSGCorep)、[MagneticTB](https://github.com/zhangzeyingvv/MagneticTB) 和 [CrystKit](https://github.com/hongyi-zhao/CrystKit) 的数据与算法工作流。四个项目已实现的计算功能统一使用 Python，通过 Pyodide 在浏览器 Worker 内运行；JavaScript 负责界面、绘图和任务调度。网站为独立实现，不代表上游作者发布或背书。

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
2. `D1, D2, …` 和 `C1, C2, …` 是本次计算的数值标签，**不等于 BC、CDML 或 Bilbao 标准标签**。输出矩阵可能处于不同的等价基底，不能通过逐元素比较判断是否与论文一致。
3. 算法处理指定的数值 k 点，不生成 Wolfram 符号参数表达式或整条符号 k 线。上游高对称点名称可能依赖 BZ 类型；实际计算以坐标为准。
4. 页面晶格和倒易原胞采用示意参数；它们不是输入材料的实验结构，也不是 Wigner–Seitz 布里渊区。不能据此读取定量晶格长度和夹角。
5. trace 必须与选定群的 BC 原胞、原点及自旋框架兼容。当前没有 POSCAR/CIF 自动标准化、`autoConvTraceToBC` 等价转换或任意自旋框架转换。匹配失败时应先准备正确设置的数据。
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

网页新增“精确代数与高维群”，与原有工具共用浏览器内的 Python Worker。`browser_api.py` 提供相同的本机 / 浏览器 JSON 分发接口，新增 `carat`、`symbolic`、`crystkit_ext` 三种工具。输入不经过 eval 或任意代码执行。

### CARAT 分类

固定上游 [CARAT](https://github.com/lbfm-rwth/carat) 修订 `65619d6ae4ec911c8cf7aa3c9fa09866a0d36ab9`，提取全部 **8,329 个 Q 类代表**、精确整数生成元、群关系、特征矩阵和类数。1–6 维 Q 类数量为 2、10、32、227、955、7103；数据按维数 gzip 压缩并延迟加载，可通过 `scripts/build-carat-data.py` 从固定源码重建。来源文件及哈希见 `data/carat/manifest.json`。

- `catalog`：按维数、阶及名称检索，支持 `offset` / `limit` 分页。
- `representative`：返回精确矩阵与群关系，可施加指定坐标变换。
- `classify`：从输入整数矩阵闭合有限群，计算共轭类与精确特征不变量；需要时用群代数中心的本原幂等元和有理交织矩阵验证 Q 类。输出 `q_status`、`z_status` 与明确证书。
- `invariant_lattices`：穷尽指定有限指数内的 HNF 不变子格，给出整数共轭代表与完成范围。不同子格可能属于同一 Z 类，**不把子格数当作 Z 类数**。

Q 等价允许 GL(d,ℚ) 变换，Z 等价要求 GL(d,ℤ)，仿射等价还包括平移部分。完整 Q 类目录并不等于完整高维 Z 类 / 仿射类枚举器；上游存储的 Z 类、仿射类“数量”也不等于本站已经生成了所有这些代表。一般 Z 类枚举、无界整数正规化子和任意高维仿射同构判定仍未完整移植。三维全仿射等价类为 219；通常的 230 空间群类型按手性进一步区分，不能混用这两个计数。

### 精确符号模块

`symbolic_core.py` 使用安全 AST 数学解析器和 SymPy 精确域直接构造约束，**不通过数值 SVD 再猜测有理数**。支持：

- 有理数、根式、复数、实 / 正参数假设；表达式化简、展开、因式分解、矩阵行列式、秩、零空间、逆及特征多项式。
- 分圆域 ℚ(ζₙ) 中的精确运算、共轭、迹、范数和矩阵零空间。
- 厄米 / 幺正 / 反幺正对称约束的精确跃迁参数化，符号 Bloch Hamiltonian、k 线代入、小矩阵精确谱和数值模型导出。
- 闭合多项式轨道基底（含七个 f 轨道）的精确旋转表示；有限阶多项式 k·p Hamiltonian 的对称性约束。

符号参数默认实数。一般参数下的矩阵秩有例外集合，结果保留相应非零条件，不能忽略分母或秩变化条件。符号几何需明确提供闭合键集合；自动壳层枚举要求可比较的精确数值几何。网页支持 MathML 公式、JSON / LaTeX 下载。没有承诺等价覆盖上游全部 Mathematica / GAP 接口，也没有把现有数值不可约表示自动变成符号 k 线标准表示。

### 群扩张与无限空间群

`crystkit_extensions.py` 以整数 Cayley 关系格与带变换的 Smith 标准形计算 **H¹(P,ℚᵈ/ℤᵈ) ≅ H²(P,ℤᵈ)**，对所有原点变化取商；这里固定输入整数点群 P。支持完整向量系统代表、正规化子作用的轨道、定向轨道与对映体判断。

对标量群、整数对角符号表示及唯一不变二次型的表示，可证明获得完整 GL(d,ℤ) 正规化子；其他情形返回明确标注的有限度量子群，不声称完整仿射分类。无限群生成元使用 Schreier 平移格证书、阿贝尔化与有限商下界；只有上下界一致才声明最小。精确原点同余求解不依赖猜测分母网格。

新增测试覆盖二维全部 17 个壁纸群、四 / 六重螺旋扩张、六维上同调、无限群生成证书、分圆域恒等式、精确 Hamiltonian 对称性，以及 CARAT 目录完整性与 Q / Z 区分。大规模计算受浏览器 180 秒任务上限和各算法资源边界约束；未穷尽时明确返回状态或错误。

```sh
python dist/python/cli.py carat dist/examples/carat-catalog-6d.json
python dist/python/cli.py symbolic dist/examples/symbolic-chain.json
python dist/python/cli.py crystkit_ext dist/examples/crystkit-ext-wallpaper.json
```
