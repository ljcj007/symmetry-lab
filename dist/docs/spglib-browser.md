# 浏览器中的 spglib

结构识别与晶胞标准化使用 **spglib 2.8.0 的原始 C 算法**。本站将官方源码编译为独立 WebAssembly 模块，通过一个小型 JSON 传输层向 Pyodide 中的 Python 提供接口。没有远程计算服务；结构文件及坐标留在浏览器 Worker 中。

这不是用有限示例近似替代 spglib，也不依赖非官方的预编译 spglib 二进制。浏览器资产仅约 311 KB（WASM）加 11 KB（Emscripten 加载器）。Python 的 NumPy、Pyodide 解释器仍按网站原有方式加载。

已提供的上游兼容接口：

- `get_symmetry_dataset(cell, symprec, angle_tolerance, hall_number)`：全部普通空间群数据字段，含变换矩阵、原点、标准晶胞、Wyckoff 字母和等价原子。
- `get_symmetry_from_database(hall_number)`：全部 530 个 Hall 设置的操作。
- `get_spacegroup_type(hall_number)`：符号与空间群类型信息。
- `standardize_cell(cell, to_primitive, no_idealize, symprec, angle_tolerance)`。

晶格按 Python API 的**行向量**约定输入输出；C API 的列向量约定仅在桥内转换。`spglib_runtime.py` 在 Emscripten 环境下注册上述 Python API；本地 CPython 使用官方 `spglib==2.8.0` 包。桥没有宣称实现其余 spglib API，例如磁结构识别或倒易网格。

## 来源与重新构建

- [spglib 官方源码](https://github.com/spglib/spglib)及 [2.8.0 PyPI 发布](https://pypi.org/project/spglib/2.8.0/)。
- [官方 C API](https://spglib.readthedocs.io/en/stable/api.html)及[标准化约定](https://spglib.readthedocs.io/en/stable/definition.html)。
- 编译器：官方 Emscripten **5.0.3**，SDK 发布提交 `065bfade0ee2c02138b83cb10049d8be95e146b6`。
- 源码 SHA-256：`12a224434b5659793353937625fd7eb91c00c8952c18ca729a7a8117b1e29e8f`。
- [完整资产校验值](../vendor/spglib/provenance.json)，[BSD-3-Clause 许可](../vendor/spglib/LICENSE.spglib)。

在已配置官方 Emscripten 5.0.3 的环境运行：

```text
python scripts/build-spglib-wasm.py --emscripten /path/to/emscripten
```

脚本校验官方源码摘要，生成版本头文件，编译未修改的上游 C 文件与 `scripts/spglib-wasm-bridge.c`，并更新资产来源记录。SDK 与编译临时文件不属于网站发布包。

## 独立对照测试

```text
python -m pip install -r dist/python/requirements.txt
python scripts/test-spglib-wasm.py
```

测试用 Node.js 的 WebAssembly 引擎执行浏览器使用的同一二进制，与官方 CPython 2.8.0 包对照：全部 **530 个 Hall 类型与操作表**；31 组覆盖七晶系及不同原点的完整 dataset；剪切与旋转基底、超胞、强制 Hall 设置；原胞、常规胞及不理想化选项；失败后继续计算。数组按字段核对，浮点容差为 `2e-10`，整数旋转与操作数据库逐项相同。

另外，网页运行检查需实际经过 `Python → JavaScript → WebAssembly → Python` 整条调用链，以检查浏览器资源加载和 Pyodide 数据转换。测试计数不等同于任意输入的数学完备性保证；结构识别仍受 spglib 数值容差和输入晶胞质量影响。
