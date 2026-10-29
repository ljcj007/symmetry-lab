# 全站公式与上下角标显示

版本：`20261029-math3`，日期：2026-10-29。

本次调整覆盖课堂正文、独立公式、分步推导、计算结果、材料案例以及 SVG 图表标签。课程、原始数据、计算接口与数值结果保留，继续使用 18px 正文字号。修复发生在显示层，不将排版后的 HTML 写回输入、研究记录或 JSON 导出。

修改前的网站源码已保存到 GitHub 分支 [backup/2026-10-29-before-formula-fix](https://github.com/ljcj007/symmetry-lab/tree/backup/2026-10-29-before-formula-fix)，起点为提交 [`6514b43e9153315d857be59668a0790b4ca40993`](https://github.com/ljcj007/symmetry-lab/commit/6514b43e9153315d857be59668a0790b4ca40993)。该分支用于查看和恢复公式修复前的源码版本。

## 三种显示路径

1. **独立公式**：统一处理课程与结果中的公式容器，将受支持的原始数学记号归一，再交给本地 KaTeX 排版。上标、下标、分组指数、矩阵等共享数学字体与基线。多行表达式保留逻辑分行；中文解释与公式混排时保留文字。
2. **行内内容**：在正文、表格、标题及练习内容中处理明确的数学上下标。动态切换课程、展开推导和更新结果后继续处理。原始 MathML 和已排版的 KaTeX 节点保留，避免重复排版或产生嵌套公式。
3. **SVG 标签**：使用 SVG 原生 `tspan` 与基线位移显示上下标，保持曲线、坐标与图形命中区域。SVG 内不插入 HTML 公式节点；标签的原始文本与可访问名称继续可用。

显示规则区分数学记号与程序标识符。输入框、原始 JSON、代码、文件路径、URL 和导出内容保留原值。原生 `select` 的选项采用纯文本；它不能承载 KaTeX/HTML。保留已有原生 MathML，避免从可访问数学结构退化为重复的文本。

表达式的排版不执行公式，也不改变 Python 或 JavaScript 计算。不能可靠识别的混排内容以可读文本保留，不将猜测的语义作为计算输入。

## 本地资源与许可证

网站托管 **KaTeX 0.19.1** 的 ESM、CSS 和 20 个 WOFF2 字体文件。公式渲染不依赖第三方 CDN。上游采用 MIT 许可证，许可原文随站点保存于 [`vendor/katex/LICENSE`](../vendor/katex/LICENSE)，版本、下载来源与资源哈希见 [`vendor/katex/provenance.json`](../vendor/katex/provenance.json)。网站原创代码仍按仓库 GPL-3.0-only 许可证提供。

KaTeX 官方来源：[项目仓库](https://github.com/KaTeX/KaTeX)、[支持的函数与记号](https://katex.org/docs/supported)、[配置选项](https://katex.org/docs/options)。渲染器不启用受信任 HTML 命令；展示用户提供内容时仍按文本处理。

## 审计与复现

静态审计遍历全部课程 JSON 及前端显示入口，识别到 629 次 `formula` 字段出现、527 个唯一字符串；其中包含合并目录重复项、化学式和中文解释。另检查普通正文中的数学记号、群标签及图表文字，区分可排版内容与路径/API 名称。

检查覆盖 Unicode 与 ASCII 上下标混排、括号负指数、同基底上下标、dagger、矩阵、分式、中文注释、多行表达式、安全转义、动态更新及 SVG 原始标签保留。已在浏览器检查全部527个公式样本、异步插入、矩阵、字体加载、结果显示、练习内容及图表标签；页面无公式解析错误和横向溢出。全目录回归另外验证1283条正文、3709个数学片段，原始文本可无损重组。

全站来源清单以 UTF-8/LF 文本哈希和未转换的二进制哈希记录；历史清单保留各自版本、计数和来源，仅更新文件与 Python 模块哈希。全部源码修改完成后运行：

```sh
python scripts/refresh-formula-provenance.py
python scripts/refresh-formula-provenance.py --check
```

`--check` 只读核验，不修改文件；脚本不重算物理结果、不构建课程、不打包或发布。新增显示文件及本地字体的校验见 [`formula-display-provenance.json`](../data/formula-display-provenance.json)。

公式专项回归：`npm run test:math`；全站界面回归：`npm test`。
