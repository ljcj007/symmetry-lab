# QE 原始计算至无限轨道自洽证书：本机运行入口

当前下载为 companion v12。完整科研工作区配置一次后，在本机页面选择已登记的 QE–Si 案例，点击运行，自动接续新 QE 数值 SCF、Γ 与全部 72 点原生导出、原始输入态离子源接收，以及最终能量与完整响应验证。

2026 年 11 月 22 日实际验收任务 `20261122t145340-1461ed6f95` 已全部通过，用时 487.917 秒。新 QE、离子源接收和无限自洽最终合成三个阶段均成功，79 项原生数学输入与证明源逐项一致。完整响应接收器绑定本次生成的根证明；结果见[实际运行摘要](../data/one-click-complete-infinite-r72p.public.json)及[证书摘要](../data/complete-infinite-scf-receipt-r72p.json)。

目标为原始源绑定的 UPF 节点 C¹ 延拓、解析参考 PBE、固定 48³ 电荷观测与规范 72 点求积，轨道空间为完整无限倒格点。每次任务以实际接收结果报告通过或未完成。

## 安装与登记

1. 将包内 `web` 与 `native` 放入完整项目的 `paper/work/一个新运行目录/`。保留完整科学输入、固定运行环境和大型证明包。
2. 在本机填写非秘密服务器配置，保存为 `native/server_profile.json`。新 SCF 需要 `scfInput` 与 `scfExecutable`，原生导出需要已验证的 NC 导出程序；密码不写进配置。
3. 从完整科研工作区选取已验证的无限轨道能量与完整响应配方，保存为 `native/infinite_recipe.json`。显式输入清单包含服务器配置及配方两个文件，可使用 [完整流程输入清单示例](server-profile-infinite-inputs.example.json)。
4. 在该新运行目录，以已验证的 Python 环境登记案例：

```text
python -B web/register_native.py --id my-qe-infinite-v1 --label "QE 至无限自洽证书" --engine qe --mode ssh-run --chain infinite --source-root native --inputs-json native/server_profile_inputs.json --ssh-config server_profile.json --proof-recipe infinite_recipe.json --timeout 1800
```

配方为 `registered-infinite-SCF-proof-recipe.r72k`，`proof_kind` 为 `orbital-energy`。`composer`、`contract`、`mathematical_input_identity`、`response_composer` 和 `response_contract` 均固定相对于 `paper` 的路径及实际 `bytes/sha256`；`response_schema` 固定完整响应接收器的输出格式。

5. 双击 `web/start_server.cmd`，在本机启动进程输入密码。打开的页面只监听本机回环地址；选择刚登记的案例并点击运行。

## 一次运行实际做什么

- 从原子初猜重新求解 QE 数值 SCF，保留输入、UPF、日志、新父电荷和完整 NC 原生输出。
- 独立接收原始输入态离子势，并核对全部 79 项原生数学输入与证明源的身份。
- 实际运行登记的无限轨道能量存在性接收器，再将本次生成的根证明交给完整响应检查器。
- 保存本次阶段、源身份、完整日志、证明结果和明确的未完成原因。

大型逐点轨道、谱尾项和矩阵证明按固定源身份接收；最终合成实际重算。入口分别记录“全链已认证”和“全部大型证明从头重算”。改变科学输入或程序后须登记新案例，旧结果保留；新源不能自动继承旧证明。

## 下载范围

约 93 KB，仅代码与许可证。完整科学输入、运行环境、证明包和服务器配置由科研工作区提供。公开静态网页提供安装入口与已发布证书复核，实际 QE 由本机入口连接服务器执行。

普通 QE XML/stdout 不包含完整 NC 算符。VASP 当前为元数据接收；完整 PAW 算符与任意材料自动认证分别需要对应接收器。

[保留的 v11 及更早运行记录与说明](local-run-guide-v11-history.md)。
