# 一般有理斜交分层与三周期几何证书

本目录把三维几何从单坐标切分扩展到任意有理超平面在闭单位立方体中的
有限排列。所有交点、维数、开胞腔、闭包关系、稳定子和周期对应均使用
Python 标准库有理数精确计算。网站与 Phase 1–12 未修改。

实际新模型是对角镜面 M:(qx,qy,qz)→(qy,qx,qz) 与时间反演 T 组成的灰磁群。
镜面条件 qx−qy∈Z 给出真正的斜交固定面；MT 的条件 qx+qy∈Z、2qz∈Z 给出
斜交线。它与原三镜面滑移模型不同，完整自旋表示与边界/周期矩阵在相邻
`../exchange/` 工作线验证。本模块单独认证的是几何，不能代替表示认证。

这个区别在整数晶格上有明确检验：交换镜面的 M−I 矩阵元素最大公因数为 1，
坐标镜面则为 2；该整数理想在 GL(3,Z) 共轭下不变。前者在倒空间环面的
固定集合是一个连通的二维环面，后者是两个分离的二维环面。因此两者不能
通过允许的整数晶格换基互相替代，详见 `../reviews/MODEL_DISTINCTNESS.md`。

模型分层含 165 个记录：27 点、66 线、56 面、16 体；852 个严格闭包关联，
83 对周期细胞、15 个周期平方和 1 个三周期立方体的 6 条路径。分层记录包括
周期副本与同一稳定子的细分，并非 165 种磁群或材料。

- `SPECIFICATION.md`：输入和交换数据格式。
- `THEOREMS_AND_PROOFS.md`：覆盖、稳定子、闭包、周期和第二枚举算法的完整证明。
- `exact_geometry.py`：精确重建与 CLI 验证器。
- `diagonal_mirror.problem.json` / `.certificate.json`：固定模型输入与完整几何证书。
- `independent_census.py`：不同算法的交叉核验；不导入主验证器。
- `test_geometry.py` / `TESTS_LATEST.json`：正例、反例、资源边界与原始执行记录。

运行：

```powershell
python -B -I research/ncs-program/phase13/geometry/exact_geometry.py --problem research/ncs-program/phase13/geometry/diagonal_mirror.problem.json --certificate research/ncs-program/phase13/geometry/diagonal_mirror.certificate.json
python -B research/ncs-program/phase13/geometry/test_geometry.py
python -B research/ncs-program/phase13/geometry/independent_census.py
```

完整回归为 30 个 CLI 案例、5 个资源策略检查与 5 个明确点稳定子检查，全部
符合预期。第二枚举路线独立求出 27 个顶点，再穷举最多四顶点的重心；877 个
互异重心覆盖全部 165 个符号胞腔，并逐一复核其闭包顶点。它与主程序共享
平面输入，不能称为独立物理模型。几何 fixture 由主程序生成，验证时重建
而不信任提交列表；算法独立性的证据来自另一路枚举。

反例包括遗漏任意维数的细胞、漏增群、漏闭包关系、错误周期端点、遗漏高阶
路径、真假整数混用，以及四角相同而面内部切分不同的周期面。正例还包括
qx+qy+qz=1/2,3/2,5/2 的三方向周期斜切、一般有理三坐标斜切，以及厚度
10^-18 的区域，后者不会被数值容差抹去。超出资源预算返回 `UNRESOLVED`。
