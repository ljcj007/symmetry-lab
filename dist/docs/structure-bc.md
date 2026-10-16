# POSCAR / CIF → BC primitive cell

`structure_bc` accepts ordered three-dimensional periodic structures and detects
their ordinary crystallographic space group with spglib. All 230 space-group
types use the original SpaceGroupIrep Bradley–Cracknell (BC) setting data.
The input need not already be primitive, conventional, axis aligned, or at a
standard origin. The symmetry tolerance is explicit and measured in Å.

## Coordinate convention and verification

Lattice vectors are rows. Fractional point coordinates in formulas are columns.
spglib provides `x_std = P x_input + p0`. The original SpaceGroupIrep
`getBCsymmetry.py` supplies exact rational `Q`, `U`, `t0` for every space group:

```
A = Q U
x_BC = A^(-1) P x_input + A^(-1) p0 + t0 = M x_input + q
k_BC = M^(-T) k_input
R_BC = M R_input M^(-1)
v_BC = M v_input + q - R_BC q
```

The physical Cartesian rotation `S` places BC primitive basis vectors in the
orientation of BC Table 3.1. It does not change fractional atom coordinates.
The displayed standardized BC lattice is `(S L_std^T A)^T`.

An arbitrary supercell may retain only a subgroup of the point symmetries as
integer rotations in its own basis. The converter therefore reconstructs the
full group from the identified Hall setting, then changes it to BC. It checks
that all original BC generators occur, every resulting rotation is integral,
all operations preserve the standardized species-resolved atom set, and atom
density is unchanged by centering removal. This handles oblique, anisotropic
supercells without mistaking the supercell point group for the crystal group.

`bc_unidealized` retains the original Cartesian orientation and unidealized
lattice, transformed atom positions and original species. `bc_primitive` uses
spglib's idealized geometry. The maximum position difference introduced by
idealization is reported; numerical tolerance is not an exact proof of the
physical crystal's symmetry. Input selective-dynamics flags and trailing VASP
data remain in metadata, but geometry-only exports do not transform them.

## Accepted files

- VASP 4/5 POSCAR, direct/Cartesian coordinates, positive or negative volume
  scaling, three positive Cartesian scaling factors and selective dynamics.
  VASP 4 types remain distinct `X1`, `X2`, … if no species list is supplied.
- CIF 1.1 data blocks, quoted fields, semicolon text fields, loops, uncertainty
  numbers and fractional or Cartesian atom coordinates. Multiple crystal
  blocks require an explicit `cif_block` name. Explicit affine symmetry
  operations expand the asymmetric unit. Operations are parsed by a strict
  arithmetic AST allowlist; user text is never evaluated as Python.
- If a CIF omits operations, a Hall symbol or an unambiguous space-group
  declaration supplies operations from spglib. Ambiguous H–M/IT metadata use
  the first conventional Hall setting with a visible warning. A file with no
  symmetry declaration is interpreted as a complete cell, also with a warning.
- Direct JSON `cell: {lattice, positions, species}`.

Partial occupancy, disorder, magnetic/modulated CIFs and singular lattices are
rejected with explanations instead of silently discarding their structure.
CIF2 nested values, macromolecular mmCIF coordinate conventions, magnetic
structures, and nonperiodic structures are outside this ordinary 230-group
converter. Maximum input size is 4 million characters and 20,000 atoms; CIF
symmetry expansion is limited to 200,000 candidate sites before deduplication.
Periodic coincidence tests use reciprocal-lattice bounds and a finite integer
translation search, including strongly skewed cells. Extreme tolerance/basis
combinations exceeding 100,000 candidate translations are rejected explicitly.

## Exports and public API

```json
{"format":"poscar","text":"...","symprec":0.00001,"k":[0.5,0,0]}
```

`run(payload)` returns `bc_primitive`, `bc_unidealized`,
`standard_conventional` (ITA, explicitly named), all BC operations, `transform`,
generator checks, optional `k_bc`, validation residuals and geometry exports.
BC POSCAR and CIF contain all primitive-cell atoms. Exported CIF declares P1
and lists all atoms explicitly, so importing it does not apply the detected
group's symmetry a second time. This export declaration does not assert that
the detected crystal has no symmetry.

## Reproducibility and attribution

`scripts/data/build-bc-settings.py` regenerates the 230 setting constants from
the vendored original source. The original generator/origin corrections,
including monoclinic, A/C-centered orthorhombic, rhombohedral, diamond and
two-origin settings, are retained. Definitions and data are GPL-3.0 and credited
to Gui-Bin Liu / SpaceGroupIrep.

`scripts/test-python-structure-bc.py` tests parsing, unsafe expression rejection,
negative and three-factor scaling, origin shifts, oblique supercells, reciprocal
transport and POSCAR/CIF round trips. Its `--all` mode constructs independent
generic species-resolved crystals from spglib's Hall database and verifies
identification and BC generators for every space group from 1 through 230. It
repeats all groups after a shear, origin shift and Cartesian rotation: all 460
structures passed with native spglib 2.8.0. Both shipped examples also passed
the complete Pyodide/WASM path. See [validation results](../data/structure/validation.json).

Primary references:
[SpaceGroupIrep source](https://github.com/goodluck1982/SpaceGroupIrep/blob/master/getBCsymmetry.py),
[spglib coordinate definitions](https://spglib.readthedocs.io/en/stable/definition.html),
[VASP POSCAR specification](https://vasp.at/wiki/index.php/POSCAR),
[IUCr CIF 1.1 syntax](https://www.iucr.org/what-we-do/digital-standards/cif/cif1/file-syntax).
