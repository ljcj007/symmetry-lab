# Exact automatic SG/MSG representations

`symbolic_spacegroups.run(payload, database=None, magnetic_database=None)` is a pure Python/SymPy implementation for CPython and browser Pyodide. It constructs representations from exact Seitz operations, not by recognizing floats from the numerical engine. Dependencies are `symbolic_core` and `symbolic_interfaces`. It needs no native CARAT/GAP, Mathematica process, backend or executable expression parser.

## Request contract

```json
{"action":"analyze","group_number":4,"k":[0,0,"q"],"double_valued":false}
```

Use `magnetic_group:"1.3"` or `[1,3]` for a BNS magnetic group. Alternatively supply `operations`, each with an integer unimodular 3×3 `rotation`, three rational-string `translation` entries, and Boolean `antiunitary`. Explicit floating-point translations are rejected. Omitted group selection defaults to SG 4; magnetic APIs should always supply `magnetic_group` explicitly. JSON indices are zero based; matrices act on columns; an antiunitary matrix means `U K`.

The frozen catalogue supplies 230 SGs and 1,651 MSGs. SG operations use the corresponding type-I magnetic entry because its `translationExact` fields preserve the original fractions. The six-decimal upstream spin matrices and illustrative lattice bases are never inputs to this exact algorithm. Catalogue coverage does not imply that every symbolic family will finish within browser time or expression-size limits.

| Action | Result |
|---|---|
| `group` | Exact Seitz representatives modulo integer translations and their multiplication table. |
| `symbol` | Catalogue metadata; named adapters additionally return `value` for SG/MSG symbols, lattice, BC axis orientation, Schoenflies index or BNS/OG conversion. |
| `origin` | Exact shift `t_new=t_old+(R-I)origin`; integer translations are preserved. |
| `little_group`, `star` | Exact signed reciprocal action, generic little group, star arms and coset representatives. |
| `analyze` | All exact little-group irreps and, when appropriate, irreducible magnetic corepresentations. |
| `induce` | All full-star representations induced from the preceding little-group result, with exact Seitz translation phases. |
| `central_extension` | Finite root-of-unity extension of the reduced constant cocycle. For antiunitary groups its cyclic kernel is inverted by antiunitary elements; it is central only in the unitary subgroup. |
| `spin_operations` | With `double_valued:true`, exact SU(2) lifts in a verified invariant orthonormal frame and their semilinear signs. |
| `restore_cyclotomic` | Evaluate compiled polynomial matrices at the specified exact primitive root; compatible with the existing common-field compiler. |

`api` or `function` selects an explicit allowlist of named mathematical adapters. The complete list is in `dist/data/symbolic-api-coverage.json`. Examples include `getLGIrepTab`, `getLGCharTab`, `getMLGCorep`, `getSGIrepTab`, `getMSGCorep`, `getKStar`, `getMagKStar`, `getSGElem`, `getMSGElem`, `shiftOrigin`, `BCOrientation`, `BNStoOG`, `OGtoBNS`, all six cyclotomic interfaces, and the existing explicit Seitz/representation workflows. `buildBlochHamiltonian`, `symham` and `texOutput` reuse the stateless exact core. These JSON adapters do not emulate Wolfram signatures, initialized sessions, all overloads, display objects or standard representation labels. In particular the `buildBlochHamiltonian` adapter does not implement its upstream `CellMatrix` supercell option.

## Why the automatic construction is exact

For quotient representatives `g={R_g|t_g}`, multiplication gives an integer translation defect

`L(g,h)=t_g+R_g t_h-t_gh`.

The reciprocal action is `A_g=(-1)^anti(g) R_g^(-T)`. The little group consists of operations for which `A_g k-k` is an integer vector. Its Bloch factor is `exp(-2πi k·L(g,h))`, multiplied by the exact spin-cover sign when requested.

On a fixed little-group stratum, form the averaging projector `P=|G|^(-1) sum_g A_g`, write `k_parallel=P k` and `k_0=k-k_parallel`, and require `k_0` to be a constant rational vector. The invariant part has a one-cochain

`b_g=exp(-2πi k_parallel·t_g)`.

Since `A_g k_parallel=k_parallel`, the code verifies at exponent level that

`omega_k(g,h)=b_g conjugate^anti(g)(b_h) b_gh^(-1) omega_k0(g,h)`.

Thus all continuous dependence in this family is restored by multiplying a constant representation matrix by `b_g`. Every constant cocycle exponent is rational, so its full semilinear cocycle identity is checked by integer modular arithmetic. A large rational coordinate along an invariant screw axis therefore does not require a field whose order grows with that coordinate's denominator.

For the unitary subgroup, the twisted regular algebra has bases `e_h` and exact left/right actions

`L_g e_h=omega(g,h)e_gh`, `R_g e_h=omega(h,g)e_hg`.

Associativity makes left and right actions commute. Hermitian right-commutant operators `R_g+R_g†` and `i(R_g-R_g†)` split left-invariant spaces by exact eigenspaces. The orthogonal compression of a commuting Hermitian operator remains in the commutant of the restricted unitary representation. Each selected subspace is explicitly checked to be invariant. Character norm one certifies irreducibility; positive exact Gram–Schmidt normalization yields a unitary basis. The isotypic character projector removes all copies of each discovered irrep. The final checks are all multiplication laws, pairwise character orthonormality and `sum(d_i²)=|H|`. These certify a complete list for the computed twisted unitary algebra. A failed or incomplete exact eigenspace calculation raises an error; there is no numerical fallback.

For double-valued representations, `M=sum_g R_g^T R_g` is a rational positive-definite invariant metric. Its exact Cholesky frame makes every spatial rotation orthogonal. Exact quaternion/SU(2) formulas lift the proper part `det(R)R`; inversion acts trivially on the spin part. With `T=i sigma_y K`, every semilinear spin product is checked to equal plus or minus its target lift. This proves the spin cocycle in one internally consistent frame. The frame is a gauge choice and need not match the rounded upstream spin gauge.

For a magnetic little group, the unitary irreps are complete and verified before evaluating the projective Herring indicator. Type a uses an exact conjugate intertwiner with a proved positive normalization; types b and c use index-two induction. Every semilinear product is verified, and the conjugate pair producing a type-c corepresentation is counted once. Antiunitary traces are not reported as characters.

For full-star induction, exact Seitz transport solves `g t_j=t_i T_delta h` with `h` in the little group. The block includes the integer-translation Bloch phase, spin-lift ratio and conjugation induced by an antiunitary coset representative. If the little group itself contains antiunitary operations, unitary representatives can and do get selected for all cosets. Every full product block is checked against

`D(g) conjugate^anti(g)(D(h)) = spin(g,h) diag_i(exp(-2πi k_i·L(g,h))) D(gh)`.

These row-dependent phases are essential: a full-star representation generally has no single scalar Bloch factor. Induction is from the exact complete little-group list, not a guessed full-group character table.

## Output and assumptions

`irreps` is ordered on `unitary_indices` of `little_group.operations`; `corepresentations` is ordered on all `little_group.operations`. IDs `E1`, `M1`, `F1`, etc. are local labels, not BC/CDML/Bilbao labels. Matrices contain exact expression strings, with LaTeX/MathML previews where appropriate. For full induction:

```text
full_representations = [{
  id, little_id, dimension,
  matrices: [operation][row][column] exact-string,
  antiunitary: [operation] Boolean,
  unitary_characters: [{index, character}],
  wigner_type: null | "a" | "b" | "c"
}]
```

`full_group_operations` supplies the operation ordering. `star` and `star_representatives` supply arm/coset ordering. `base_k`, `constant_cocycle`, `conductor` and `symbolic_cochain` expose the factor reduction. `spin_metric` and `spin_frame` expose the double-cover gauge when requested.

Symbolic little-group membership is conditional. If an operation becomes a symmetry only when expressions become integer, `conditions` lists that exceptional-parameter condition. Substitute such values and recompute, rather than evaluating a generic result on another stratum. The parser also retains original denominator/pole exclusions, even when algebraic cancellation would hide them. `complete:true` certifies the calculated representation list on the stated stratum, not every parameter specialization or every upstream API.

Limits: at most 192 input Seitz representatives; unitary little-group order at most 48; magnetic little-group order at most 96; reduced constant cocycle conductor at most 48; finite extension order at most 512. Full induced dimension defaults to 24 and may be raised to 48. SymPy must prove positivity and complete exact eigenspaces; difficult symbolic expressions can be rejected or exceed the browser time budget. These are explicit failures, not truncated or approximated successful results. The existing lower-level `symbolic_interfaces` has its own separately documented limits.

## API audit

The shared inventory now contains **319 unique public symbols** from four projects: MagneticTB 108, SpaceGroupIrep 125, MSGCorep 69 and CrystKit 17. The previous 308 declaration records included six duplicate SpaceGroupIrep declarations; deduplication precedes adding CrystKit. The manifest distinguishes 175 calculations, 50 catalogue data symbols, 34 options/session values, 51 presentation symbols and 9 external-I/O symbols. Its exact/partial/numerical statuses are per workflow, not a parity percentage.

There are 39 exact workflow mappings, 35 partial exact mappings, 20 existing numerical mappings, one partial existing mapping and 224 unmapped symbols. Of the unmapped symbols, 83 are classified as calculations; the remainder are data/session/display/I/O contracts. CrystKit entries describe existing certified Python tools, including their limitations; adding an inventory entry is not presented as newly implementing a native GAP or CARAT interface.

Remaining work includes standard BC/CDML labels and library overloads, exhaustive exceptional-parameter strata, continuous spin-space-group/stateful APIs, general semilinear tensor decomposition with all labels, selected point-group convenience functions, fitting/external-program/display functions and unrestricted high-dimensional integral/affine classifications. The manifest explicitly does **not** claim all upstream APIs are covered. In particular a 2D torus Chern calculation is not the upstream `pointChernNumber` charge on a closed cube around a 3D point.

## Independent verification

`scripts/test-python-symbolic-spacegroups.py` has 28 analytic regression tests. It verifies:

- P2_1 eigenvalues `±exp(-πiq)` and their spinful square sign; threefold/fourfold screw nth powers.
- SG 19 at `(1/2,1/2,1/2)`: forced two-dimensional projective irrep, anticommuting generators and quaternion-group central extension.
- Ordinary tetrahedral/cubic dimensions, the full 48-element cubic little group, and three spinful tetrahedral doublets.
- Independence from deliberately poisoned rounded spin/lattice data; exact preservation of thirds and large-denominator invariant-axis momenta.
- Generic-star exceptions, original cancelled poles and explicit resource-limit rejection.
- Magnetic anti-half-translation type b, gray spinful Kramers type b, gray C3 types a/c, and cancellation between spin and boundary translation signs.
- Full magnetic-star antiunitary square with distinct `exp(±2πiq)` row phases, spinful full-star signs, and induction from an antiunitary little group.
- Upstream BC axis cases, Schoenflies indexing, BNS/OG round trips, preserved integer translations under origin shifts, named dispatch, cyclotomic restoration and explicit Bloch construction.
- Injection/unknown-API rejection and all seven downloadable `symbolic-sg-*.json` examples.

The companion 36-test `symbolic_interfaces` suite checks the supplied-matrix algorithms separately. Browsing and scientific use should inspect conditions and certificates, not only the presence of a matrix.

Sources are pinned in the inventory: [SpaceGroupIrep](https://github.com/goodluck1982/SpaceGroupIrep/blob/7b43201ac0973333edbe69bc3dd6ccb308abf624/SpaceGroupIrep.wl), [MSGCorep usage](https://github.com/goodluck1982/MSGCorep/blob/5082f30499afea656287a2054c86d523618f9f8a/Usage.wl), [MagneticTB usage](https://github.com/zhangzeyingvv/MagneticTB/blob/3575e8356af282c9d9447bfbf03e282ef3bac77d/Mathematica/MagneticTB/Usage.wl), and [CrystKit declarations](https://github.com/hongyi-zhao/CrystKit/blob/0f4f85e31d8166bb5a3e3474287449fa5572d5fd/gap/CrystKit.gd). The implementation uses [SymPy exact matrix operations](https://docs.sympy.org/latest/modules/matrices/matrices.html).
