# 一键 QE 至无限自洽检查 / QE to the infinite-SCF checker

当前下载为 companion v11。它新增原始未混合输入态的有界导出、独立离子源接收，以及最终无限轨道非线性闭合接收阶段。完整科研工作区配置一次后，从本机页面选择登记案例并点击运行，自动执行整个已登记流程。

实际三阶段运行 `20261122t043042-6469cedd8e` 已从原子初猜重算 QE，接收 Γ 和全部72点原生输出，并完成独立输入态离子源衔接。79项完整原生数学输入与登记证明源一致，最终闭合检查器已实际运行；它因完整无限映射、完整响应、整球闭合及源方程运输收据尚缺而返回 `UNRESOLVED`。进程完成和严格根证书分别记录。

目标为从原始源明确构造的 UPF 节点 C¹ 延拓和解析参考 PBE，采用固定48³电荷网格、规范72点求积。原生有限径向表与该延拓的模型差须单独控制；当前不声明未导出的无限QE生成器已被验证。

With the research workspace installed, companion v11 connects a fresh QE run, complete native exports, an unmixed-input ionic-source bridge and the final infinite-SCF checker. The actual three-stage run above reached the final checker. Its result remains UNRESOLVED because the complete mathematical closure is not yet available. The explicit target is a source-bound UPF-node C1 extension with analytic reference PBE and fixed charge/k quadratures.

## 登记无限闭合流程

服务器配置设置 `exportUnmixedInputState: true`，并显式提供从原子初猜运行的 SCF 输入和程序。输入清单同时包含服务器配置及科学证明配方。配方锁定接收程序、目标合同、完整原生输入身份参照与四组实际科学收据；任何缺项均保留为未完成。

```text
python -B web/register_native.py --id my-qe-infinite-v1 --label "QE 至无限自洽闭合" --engine qe --mode ssh-run --chain infinite --source-root native --inputs-json native/server_profile_inputs.json --ssh-config server_profile.json --proof-recipe infinite_recipe.json --timeout 1800
```

配方采用 `registered-infinite-SCF-proof-recipe.r72b`。`composer`、`contract`、`mathematical_input_identity` 和可选 `all72_map`、`full_response`、`whole_ball`、`fresh_source_bridge` 均使用相对于 `paper` 的显式路径与实际文件 `bytes/sha256`。它们来自完整科研工作区中的实际接收器和证据，下载的入口代码不含这些大型科学输入。

v10 同时支持 `registered-infinite-SCF-proof-recipe.r72e` 与 `proof_kind: orbital-energy`。能量路线锁定完整 H¹ 轨道球上的场范围、全 Hessian、真自洽梯度、源运输与占据条件。它已用79项实际原生输入运行至最终接收器；当前研究合同仍缺 Hessian 与梯度闭合，保持 `UNRESOLVED`。

v11 新增 `registered-infinite-SCF-proof-recipe.r72k`：在本次根证明之后实际调用完整响应检查器。配方固定 `response_composer`、`response_contract` 和 `response_schema`，将本次能量证明作为 `--root-proof` 输入；只有根存在性与完整响应都通过，最终阶段才接收。

本机页面逐阶段区分本次重算和本次接收已有证明。`full_chain_recomputed` 仅在所有必要步骤都实际重算时成立；接收并重新核对固定证明包不会被标为数学全量重算。

以下为保留的旧参考链安装与历史范围，原有证书和运行记录继续可用。

---

# 本机真实作业入口 / Local run companion

## 当前版本的实际范围

此下载包为 companion v6，科学驱动对应已实跑的 v5，新增未决原因的中文显示。配置 `scfInput` 与 `scfExecutable` 后，它从原子初猜实际求解全新数值 SCF，不复制旧父电荷。新 `.save` 成为 Γ 和完整 72 点非自洽原生导出的父源。程序下载原始输入、UPF、日志、前后源记录和完整 `.save`，重新核对其目录身份与原生算符。只有新旧算符恒等桥通过时，才接续旧参考模型的构造舍入、有限根和无限冻结谱接收器；新源改变时明确停止旧证明继承。

逐点响应矩阵和 925 域证明包按固定身份接收。无限轨道非线性自洽根仍为 `UNRESOLVED`。已有有限根和冻结谱不能替代该目标。

With explicit scfInput and scfExecutable fields, this companion (v6 UI, v5 scientific driver) solves a fresh numerical SCF problem from atomic initialization. It copies no old parent charge. The new save feeds Gamma and complete 72-point native exports. Original inputs, UPFs, logs, source identities and the complete save are downloaded and rechecked. Reference proof receivers continue only if exact operator identities match; changed sources do not inherit old proofs. Point-response and 925-domain matrix proofs are received with pinned identities. The infinite-orbital nonlinear SCF root remains unresolved.

## 安装条件 / Prerequisites

- 完整科研项目及 `paper/work/qe_si_end_to_end_20261117` 中的原始来源、参考模型接收器和证明包。
- 已验证的 Python 数值环境、Paramiko，以及科研工作区所需的 Arb、NumPy、SciPy 等依赖。
- 可连接的 QE 服务器，指定 NC 算符源导出版本、完整参考输入和可从头运行的 SCF 输入/程序。

This is a code-only package, not a standalone distribution of the scientific inputs or numerical runtime. Ordinary QE stdout/XML and VASP XML/OUTCAR metadata do not supply the complete NC/PAW operator proof.

## 配置 / Configuration

1. 将包内 `web` 和 `native` 目录放到完整项目的 `paper/work/<new-run-directory>/`。请保留现有研究文件。以下命令从该新目录执行。
2. 下载服务器配置示例，填写经过独立核对的服务器地址、账号、主机公钥 SHA-256 十六进制摘要及其算法，以及实际原生导出 QE、参考输入、工作目录、`scfInput` 和 `scfExecutable` 的路径。可选 `scfExecutableSha256` 锁定 SCF 程序；`parentSave` 仅用于既有父源模式，新 SCF 模式使用本次生成的新 `.save`。保存为 `native/server_profile.json`。
3. 将输入清单示例保存为 `native/server_profile_inputs.json`。清单必须显式包含 `server_profile.json`。密码不写入配置、清单或命令行。
4. 使用已验证的 Python 环境登记该案例。此命令固定实际文件和接收器身份；路径缺失会停止，不使用示例数值补齐。

```text
python -B web/register_native.py --id my-qe-si-reference-v1 --label "QE–Si reference model" --engine qe --mode ssh-run --chain reference --source-root native --inputs-json native/server_profile_inputs.json --ssh-config server_profile.json --timeout 1800
```

After placing `web` and `native` under a new run directory inside `paper/work`, save your private verified server configuration as `native/server_profile.json` and its explicit input manifest as `native/server_profile_inputs.json`. Run the registration command in the verified Python environment. Keep the configuration and all actual job data private.

## 一次点击运行 / Run after setup

双击 `web/start_server.cmd`，在本机启动进程中输入密码。浏览器会打开本机作业页面；选择刚登记的案例，点击运行。程序自动接续可用阶段，显示实际日志，保留新的任务记录。缺少的无限轨道非线性自洽接收器会明确停在未完成状态。

Open `web/start_server.cmd`, enter the password in the local launch process, then choose the registered case and run it in the local portal. Actual stages and logs are shown. The unresolved infinite-orbital nonlinear SCF stage remains visible.

本机页面只监听回环地址。公开网页不持有服务器密码。每次运行创建新的记录；程序、依赖或科学输入改变后，应登记新的案例标识，旧记录保留。新算符与已接收参考源不一致时，旧证明不自动继承。

The portal listens only on loopback. Passwords stay in the local launch process. Each run creates a new record. Changed programs or scientific inputs require a new registration; changed operator identities do not inherit the reference proofs.

## 此次公开实跑记录 / Published run

历史参考源运行 `20261121t160924-01aedb4456`：新 NSCF 导出、完整原生源、72 点构造舍入、有限参考自洽根和同势无限冻结谱均接收。最后无限轨道非线性自洽根为 `UNRESOLVED`，完整端到端验证仍在进行。参考势下的共同带隙严格大于 0.081 eV。

The earlier reference-source NSCF run accepted the NSCF export/source stage, all 72 construction/rounding points, the finite-reference SCF root and the same-potential infinite frozen spectrum. The full target remains unresolved at the infinite-orbital nonlinear SCF root. The common gap at the specified reference potential is strictly greater than 0.081 eV.

## 全新 SCF 实跑 / Fresh-SCF run

`20261121t163348-31056a6eb5` 从原子初猜实际完成新的数值 SCF，接收 86 个 SCF 源/输出工件，并以本次新电荷运行 Γ 与完整 72 点 NC 导出。全 72 点的算符身份与旧参考源不同，旧构造、有限根和无限冻结谱证明未被继承。最终状态为 `UNRESOLVED`，本次新源没有带隙或无限非线性 SCF 证书。

Run `20261121t163348-31056a6eb5` executed fresh numerical SCF from atomic initialization, received 86 SCF source/output artifacts, and used its new charge for Gamma and full 72-point NC export. All 72 operator identities differ from the earlier reference. Its construction, finite SCF and frozen-spectrum proofs were not inherited. The final state is `UNRESOLVED`; no gap or infinite-orbital nonlinear SCF root is certified for the new source.
