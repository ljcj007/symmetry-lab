# 官方 Cu 热性质文件实验

从“声子热力学 → 哪些声子数据能够计算体热容？”课堂点击“载入官方 Cu 热性质计算示例”，或在“计算中心 → 声子热力学”选择 thermal_properties.yaml 后载入 Cu 示例。载入完成后，检查单位并手动运行；本页不会自动提交计算。

## 文件来源与身份

数据来自 Phonopy 官方仓库 Cu-QHA 测试的体积索引 05，是既有固定体积计算输出。本站保留原始 XZ，并逐字节解压为 YAML；未调整数值、单位或注释。这不是实验数据，也不是本站重新进行的第一性原理计算。

- [固定版本原压缩文件](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/test/cui/phonopy_qha/Cu-QHA/thermal_properties.yaml-05.xz)
- [逐字节解压 YAML](../data/examples/phonopy-cu-thermal-index05.yaml)
- [原始 XZ 归档](../data/examples/phonopy-cu-thermal-index05.yaml.xz)
- [完整来源与校验记录](../data/examples/phonopy-cu-thermal-source.json)
- [完整 BSD 三条款许可](../data/examples/phonopy-cu-LICENSE.txt)
- [Phonopy 官方输出文件说明](https://phonopy.github.io/phonopy/output-files.html#thermal-properties-yaml)

固定提交为 18cad919af8fe8aad349e04f101887fa19b051a0。YAML 为 41975 字节，SHA-256 为 1c9e6edeeded194fc7eebe9c4f4bd6e88728b48ea4f530a033240f8394267bf1；XZ 为 4900 字节，SHA-256 为 36c87fc5560cc7815cd9d97105830c00cffa4a3a2fb486235d7976bc493ebb1f。计算记录中的 verificationBasis=parsed-utf8-content 表示核对的是实际交给计算器的 UTF-8 文本，不是任意本地文件的原始字节或文件名。

## 先预测，再检查计量基准

文件声明 natom=4，包含 0–2500 K 的 251 个温度点。每摩尔指一摩尔输入计算胞；这里每个输入计算胞有四个 Cu 原子。不能把原文件的摩尔量直接当作一摩尔 Cu 原子或一原子最小原胞。

预测：若改用每摩尔 Cu 原子计量，热容应如何换算？再检查高温模式计数极限 3nR。该输入胞的极限为 12R；改为每摩尔原子后才是 3R。本站保留输入胞基准，不自动除以四。

## 计算与解释

运行后选择 300 K，分别查看自由能 F、熵 S、定容热容 Cv 与内能 U。原文给出 F=-8.9186518 kJ/mol、S=134.5650065 J/(mol K)、Cv=94.8384329 J/(mol K)。这些单位均按输入计算胞计。

先写出单位换算，再计算 U=F+TS/1000。300 K 时 U=31.45085015 kJ/mol 输入计算胞；原文件 energy=31.4508501。末位差来自原文有限小数位。全表内能与原 energy 列的最大差为 1.68×10⁻⁷ kJ/mol；F、S、Cv 列保留原输入值。

在温度滑块上比较 0 K 与高温。0 K 时熵和热容为零，但 F=U=11.3271895 kJ/mol 输入计算胞，保留零点能。请解释为什么非零零点能并不意味着零温热容非零。

## 反例与边界

问题一：如果热容乘四、温度也乘四，是否只是改变了计量基准？答案：只有热容的摩尔基准换算与原子数相关；温度不随胞中原子数缩放。

问题二：能否把 band.yaml 路径上的频率直接当作完整布里渊区积分？答案：不能。路径采样不等于带权重的三维网格；真实数据入口区分 mesh、总 DOS 和已有热性质曲线。

问题三：单份 thermal_properties.yaml 能否给出热膨胀、Cp 或热导率？答案：它不包含完整静态 E(V)、多体积自由能拟合、声子寿命或本征矢，因此此处展示固定体积振动热性质。它也不能单独证明生产计算的稳定性或网格收敛。

## 保存和复现

结果 JSON 保留输入文本与计算输出；识别到原文内容时附带固定版本、内容摘要和 Cu 来源身份。点击“保存到材料研究记录”才把该计算加入显式研究流程。文件读取和示例载入只发生在浏览器；加载中可取消或更换输入，完成后仍需手动运行。修改文本后必须重新计算，旧结果不会继续显示为当前结果。
