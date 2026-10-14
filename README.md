# Symmetry Lab · 晶体对称性浏览器工作台

将 [SpaceGroupIrep](https://github.com/goodluck1982/SpaceGroupIrep) 和 [MSGCorep](https://github.com/goodluck1982/MSGCorep) 的开放群数据与浏览器端数值算法结合，用于空间群、磁空间群及磁点群的表示计算。网站为独立实现，不代表上游作者发布或背书。

## 启动与部署

Windows 可以直接双击 `start.cmd` 启动；关闭弹出的命令行窗口即可停止静态文件服务器。

需要支持 ES Modules 的现代浏览器。开发服务器和测试使用 Node.js 22 或更新版本，无需安装 npm 依赖。在项目根目录执行：

```sh
npm start
```

打开 `http://127.0.0.1:4318`。服务器只监听本机。可通过 `PORT` 环境变量更改端口。

将 `dist/` 的完整内容部署到任意支持 JavaScript 模块和 Web Worker 的 HTTP/HTTPS 静态服务器即可。请保留 `data/`、`examples/`、许可证和相对目录结构。不要通过 `file://` 直接打开 HTML；浏览器通常会阻止模块、Worker 或数据文件加载。

应用不使用 Mathematica/Wolfram 内核、Python 服务、外部 API 或计算后端。群数据从本站静态文件读取；上传的 trace 文件、输入和计算结果均在浏览器内处理。首次打开需要取得静态文件，未实现离线安装或 Service Worker 缓存。

### GitHub Pages

仓库包含 [GitHub Pages 工作流](.github/workflows/pages.yml)。在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，向 `main` 分支推送提交或手动运行 **Deploy GitHub Pages** 即可发布。发布前工作流会运行全部 `npm test` 检查，重新生成可下载的 `dist/source.zip`，再把 `dist/` 上传到 Pages。部署成功后，工作流和仓库 Pages 设置都会显示网站链接。

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

- `dist/engine.js`：`analyzeGroup`、`computeStar`、`buildMultiplicationTable`、`decomposeCharacters`、`decomposeCorepresentationCharacters`、`directProduct`。
- `dist/induction.js`：`induceRepresentation`、`inducedOperationMatrix`、`decomposeStarProduct`。
- `dist/trace-parser.js`：`parseTrace`、`matchTraceOperations`、`charactersForAnalysis`。
- `dist/compute-worker.js`：计算 Worker；`dist/app.js`：页面交互。

`analyzeGroup` 返回的矩阵/特征标使用明确的操作顺序。`littleGroup.unitaryIndices` 是小群内索引，须经 `littleGroup.sourceIndices` 才能映射到输入群的全局操作索引。trace 匹配请使用 `charactersForAnalysis` 完成排序。

## 坐标、标签与适用范围

1. 旋转和平移采用 Bradley–Cracknell（BC）直接原胞分数坐标；波矢采用其倒易原胞分数坐标。磁群使用 BNS family 对应的原胞。平移相位为 `exp(-2π i k·t)`，反幺正操作的波矢作用为 `-R^-T k`。
2. `D1, D2, …` 和 `C1, C2, …` 是本次计算的数值标签，**不等于 BC、CDML 或 Bilbao 标准标签**。输出矩阵可能处于不同的等价基底，不能通过逐元素比较判断是否与论文一致。
3. 算法处理指定的数值 k 点，不生成 Wolfram 符号参数表达式或整条符号 k 线。上游高对称点名称可能依赖 BZ 类型；实际计算以坐标为准。
4. 页面晶格和倒易原胞采用示意参数；它们不是输入材料的实验结构，也不是 Wigner–Seitz 布里渊区。不能据此读取定量晶格长度和夹角。
5. trace 必须与选定群的 BC 原胞、原点及自旋框架兼容。当前没有 POSCAR/CIF 自动标准化、`autoConvTraceToBC` 等价转换或任意自旋框架转换。匹配失败时应先准备正确设置的数据。
6. 存储的空间自旋矩阵采用 `↓↑` 基底、上游六位小数精度；trace 的 `↑↓` 基底在匹配时转换。数据库的 `antiunitary` 标记与空间自旋矩阵分开存储，时间反演由计算引擎处理。
7. 反幺正矩阵必须与复共轭算符 `K` 联用，其矩阵迹不作为普通线性特征标。能带共表示分解使用幺正限制的 Wigner 类型归一化；不完整的 Kramers/反幺正伙伴集合会被拒绝。
8. 计算使用双精度数值，并检查乘法关系、因子系统、正交性、维数或重构误差。有限的测试不能证明所有波矢、所有输入与上游标准标签完全等价。大维数全表示和直积仍会受浏览器内存与时间限制。

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

随附 `engine-validation.json` 记录了已完成的 **11,530 次**小群计算：全部 230 SG 和 1651 MSG 在 Γ、`(1/2,1/2,1/2)`、`(0.173,0.271,0.389)` 三个波矢处分别计算单值/双值表示，全部 122 MPG 在 Γ 处计算两种自旋设置。该次扫描失败数为 0，最大记录乘法误差约为 `2.56×10^-14`；它不等于所有连续波矢或标准标签的穷尽验证。

数据提取阶段另用精确有理数检查了所有 1651 个磁群的 676,317 次 Seitz 乘积。平移公分母为 12，全部闭合；230 个普通空间群的 2609 个操作也与 type-I 磁群数据逐一交叉核对。

## 数据与许可

`dist/data/provenance.json` 记录上游仓库树哈希、来源文件、覆盖范围、约定及未移植接口。主要数据来源为 `getBCsymmetry.py`、`LittleGroupIrepData.wl`、`MSGData.wl` 和 `BC_MSG_elements/*.txt`。本网站不会加载 Wolfram 的 `libMLGCorep.mx`。

上游软件作者：**Gui-Bin Liu**。保留的 GPL v3 许可全文位于 `dist/data/LICENSE-SpaceGroupIrep.txt` 与 `dist/licenses/MSGCorep-GPL-3.0.txt`。其他声明见 `NOTICE.txt`。发布衍生版本时应一并保留源码、数据来源和许可声明。

研究中使用原项目数据时，请引用其原始软件与论文：

- SpaceGroupIrep，*Computer Physics Communications* **265**, 107993 (2021)，[DOI: 10.1016/j.cpc.2021.107993](https://doi.org/10.1016/j.cpc.2021.107993)。
- MSGCorep，*Computer Physics Communications* **288**, 108722 (2023)，[DOI: 10.1016/j.cpc.2023.108722](https://doi.org/10.1016/j.cpc.2023.108722)。
