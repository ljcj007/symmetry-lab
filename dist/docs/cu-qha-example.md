# 用 Cu 的多体积数据检查热膨胀

从 [准谐近似课堂](../#classroom/observables?module=qha)进入计算实验。载入 Phonopy 的 Cu 算例后，先核对静态能量与热性质文件的体积顺序，再手动计算。这组输入来自 Phonopy 的公开回归算例，每个输入计算胞有 4 个原子。

## 为什么需要多个体积？

固定体积声子计算提供该体积的振动自由能。准谐近似在每个温度比较多个体积的静态能量、振动自由能和压力项，再在已采样的体积范围内寻找自由焓最低点。先核对所有能量都按同一个输入胞归一。热性质文件的振动自由能单位是 kJ/mol 输入胞，静态能量单位是 eV/输入胞。

```text
G(V,T;p) = E_static(V) + F_vib(V,T) + pV
```

试算可使用 0 GPa、三次多项式和 5 个局部体积采样点。先选 300 K，在体积曲线上找最低的采样点，再比较拟合给出的平衡体积，检查拟合警告。改变拟合窗口，比较该结论对取点的敏感程度。

再选 2500 K。此时最低采样点落在体积区间的边缘，当前数据无法给出内部平衡体积。边界结果适合检验算法的报告范围。要研究高温相的物理稳定性，还应结合相图和计算假设。

## 原文件与算法

静态能量来自 `e-v.dat`。从 `thermal_properties.yaml-00.xz` 到 `thermal_properties.yaml-10.xz` 的 11 个压缩文件依次携带各体积的热性质。每个文件的体积和原子数必须与对应行一致。各文件含 0 至 2500 K 的同一温度网格，每隔 10 K 一点。

[本地来源清单](../data/examples/phonopy-cu-qha/source.json)列出每个原文件的字节、哈希、体积和来源路径。也可下载[静态能量原表](../data/examples/phonopy-cu-qha/e-v.dat)、[计算器可读的完整输入](../data/examples/phonopy-cu-qha/payload.json)和[原许可证](../data/examples/phonopy-cu-qha/LICENSE.txt)。

站内方法在采样最低点附近拟合低阶多项式，并检查局部曲率与采样区间。Phonopy 的标准命令还提供不同的状态方程拟合。比较两种方法时，先对照同一体积和温度的原始自由能，再解释拟合结果的差别。

来源为 [Phonopy 固定版本的 Cu-QHA 原始输入](https://github.com/phonopy/phonopy/tree/18cad919af8fe8aad349e04f101887fa19b051a0/test/cui/phonopy_qha/Cu-QHA)和[使用这些输入的官方回归脚本](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/test/cui/phonopy_qha/test_phonopy_qha_script.py)。站内也保留 [Cu 固定体积热性质算例](cu-thermal-example.md)，可用于核对这个多体积数据集的第 05 个体积。
