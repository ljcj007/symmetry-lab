# Source-bound electronic-structure workbench

统一认证入口：[打开网站](https://ljcj007.github.io/symmetry-lab/source-bound/)。原 [Symmetry Lab 入口](https://ljcj007.github.io/symmetry-lab/)继续保留。

本工作台把“源、完整计数、态身份和结论范围”组织成共享接口，并给出一个实际可运行的适配器。当前浏览器/Python实现接收完整的实对称仿射有限算符，使用精确有理数检验闭参数域内的完整谱计数，可选核对一个对称作用及恒等周期映射。它不把新的受控算例当作论文 Si、Fe 或 Bi 的数值重算。

## 一键使用

网站中选择一个算例，点击“一键认证”；也可导入符合 [JSON 接口](schema/source.schema.json) 的算符描述。所有矩阵运算在浏览器本地执行，报告可下载。页面分别显示 CERTIFIED、UNRESOLVED 和 REJECTED。

下载页面中的源码 ZIP，解压后双击 Windows `run.cmd`，即可运行六个正负控制并生成新报告；需要 Python 3.11+，无额外 Python 包。跨平台命令：

```text
python -B run.py suite
python -B run.py verify --input examples/positive-gap.json --out runs/my-new-result
python -B run.py serve
```

最后一个命令启动仅本机可访问的网站 http://127.0.0.1:8765/ 。每次接收都新建输出，不覆盖旧结果。

## 两项方法学澄清

1. [共享认证接口及正确性论证](docs/INTERFACE.md)：明确输入/输出/误差与覆盖义务，按谱隔离、对称阻碍、拓扑赋值分支选择前提。实际仿射接收器证明了所声明 profile，未实现的材料格式不会被静默接受。
2. [与最接近方法的实质比较](docs/PRIOR_ART_COMPARISON.md)：七项已核查的原始文献，区分已有技术和本文的具体构造；以相同输入下 Si 与 carbon 的获证差异说明计算机制，不宣称首次严格能带计算或普遍性能优势。

## 完整科学重放

现有材料证明有独立的冻结输入与接收器。完整 Si925 档案为 14.33 GB，保留在作者的配对交付目录 `si925_delivery_v1/` 与 `si925_release_v1/`；本仓库不重新分发混合来源原始材料或大型二进制运行时，也不编造公共下载地址。拿到该交付包后，可由统一入口接收已有完整证明：

```text
python -B run.py si925-documentary --delivery-dir /path/to/si925_delivery_v1 --out /path/to/new-reception
```

入口先检查固定 manifest 和入口字节，再调用其单入口；这是 documentary reception，数值矩阵不会重算。完整 Linux 数值重算命令仍以交付包的 numerical runbook 为准。当前原始 Bi 模型的谱传递不自动继承重构模型的 AII 指数。

## 验证与发布

```text
python -B -m unittest discover -s tests -v
node site/test-engine.mjs --prepare
python -B site/test-python-parity.py
node site/test-engine.mjs
python -B tools/build_site.py
```

Node 仅用于开发交叉检查；网站用户无需安装 Node。Python Fraction 与浏览器 BigInt 接收器分别实现相同的数学条件，比较状态、内容哈希和精确 LDL 主元。该一致性检验证明实现一致，不认证用户输入的材料来源。

源代码位于既有 `symmetry-lab/source-bound-workbench` 独立目录；静态页面发布到 `dist/source-bound/`。公开入口保存在本 README 和部署记录中。
