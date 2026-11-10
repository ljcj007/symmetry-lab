# spglib in the browser

Structure identification and cell standardization use **spglib 2.8.0's original C algorithms**, compiled from official sources into standalone WebAssembly. A small JSON bridge supplies Python APIs in Pyodide. There is no remote computing service; structures and coordinates remain in browser Workers.

This neither approximates spglib with finite examples nor uses unofficial binaries. Browser assets ≈311KB WASM+11KB Emscripten loader. Python's NumPy/Pyodide interpreters load as before.

Upstream-compatible interfaces provided:

- `get_symmetry_dataset(cell, symprec, angle_tolerance, hall_number)`: all ordinary space-group dataset fields, including transforms, origins, standard cells, Wyckoff letters, and equivalent atoms.
- `get_symmetry_from_database(hall_number)`: operations for all 530 Hall settings.
- `get_spacegroup_type(hall_number)`: symbols and space-group-type information.
- `standardize_cell(cell, to_primitive, no_idealize, symprec, angle_tolerance)`。

Lattices use Python API **row vectors** for input/output; C API columns are converted only inside the bridge. `spglib_runtime.py` registers these Python APIs in Emscripten; local CPython uses official `spglib==2.8.0`. The bridge does not implement other spglib APIs such as magnetic-structure identification or reciprocal meshes.

## Sources/rebuilding

- [Official spglib source](https://github.com/spglib/spglib) and [2.8.0 PyPI release](https://pypi.org/project/spglib/2.8.0/).
- [Official C API](https://spglib.readthedocs.io/en/stable/api.html) and [standardization conventions](https://spglib.readthedocs.io/en/stable/definition.html).
- Compiler: official Emscripten **5.0.3**, SDK release commit `065bfade0ee2c02138b83cb10049d8be95e146b6`.
- Source SHA-256: `12a224434b5659793353937625fd7eb91c00c8952c18ca729a7a8117b1e29e8f`.
- [Complete asset checksums](../../vendor/spglib/provenance.json), [BSD-3-Clause license](../../vendor/spglib/LICENSE.spglib).

Run with official Emscripten5.0.3 configured:

```text
python scripts/build-spglib-wasm.py --emscripten /path/to/emscripten
```

The script verifies the official source digest, generates the version header, compiles unmodified upstream C files with `scripts/spglib-wasm-bridge.c` and updates asset provenance. The SDK and temporary compilation files are excluded from the site release package.

## Independent comparison tests

```text
python -m pip install -r dist/python/requirements.txt
python scripts/test-spglib-wasm.py
```

Node's WebAssembly runs the identical browser binary against official CPython2.8.0: all **530 Hall types/operation tables**,31 datasets spanning seven systems/origins, sheared/rotated bases,  supercell , forced settings,  primitive cell ,  conventional cell , no-idealization, and recovery after failure. Compare arrays by field, float tolerance `2e-10`; integer rotations/operations match entrywise.

Browser runtime checks must also traverse the complete `Python → JavaScript → WebAssembly → Python` chain to test resource loading and Pyodide data conversion. Test counts do not guarantee mathematical completeness for arbitrary inputs; recognition remains subject to spglib tolerances and input-cell quality.
