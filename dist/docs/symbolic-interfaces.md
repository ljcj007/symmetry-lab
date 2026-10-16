# Exact symbolic interfaces — 2026-10-16

`dist/python/symbolic_interfaces.py` is a pure SymPy, stateless CPython/Pyodide module with `run(payload)`. It reuses `symbolic_core.ExactParser`; no executable parsing, floating-point rationalization, external process, backend or Mathematica installation. JSON indices are zero based. Finite representation matrices act on columns, antiunitary matrices mean `U K`. `scripts/test-python-symbolic-interfaces.py` verifies analytic examples rather than merely checking output snapshots.

## Actions

| Action | Exact capability and input |
|---|---|
| `compile_cyclotomic` | `matrices` of rational constants, rational square roots, rational-angle roots/trigonometric functions and their arithmetic. Computes one common conductor and polynomial quotient, returns matrices and ascending rational coefficient tensors. Explicit `order` allows formal `z`; it is correctly lifted when another constant enlarges the conductor. Positive quadratic Gauss sums fix radical embeddings. |
| `common_kernel` | Complete exact intersection of kernels of `matrices`, using a stacked system. Set `cyclotomic:true` or `order` to compile every block into one cyclotomic field. Both column `kernel` and upstream-style `kernel_rows` are returned, with RREF and verified rank. |
| `representation` | `table`, optional Boolean `antiunitary` and normalized unit-modulus `factor_system`, plus complete `matrices`. Checks associativity, parity, cocycle, every semilinear group product, character norm on the unitary subgroup, and an exact invariant Hermitian metric. Antiunitary matrix traces are not described as characters. |
| `intertwiner` | `left`, `right`, optional `antiunitary` and complete group table. Solves `L(g) conjugate^anti(X) = X R(g)` over complex scalars, or over real scalars if any generator is antiunitary. Returns the full nullspace. An invertible witness proves equivalence; bounded unsuccessful witness search is explicitly inconclusive. |
| `projector` | Complete unitary group `matrices` and supplied `irrep`. Checks irrep character norm and unitarity; builds the isotypic projector and all matrix units. Verifies idempotence, commutation, exact rank and every matrix-unit multiplication law. |
| `character_decompose` | Complete unitary group representation or ordinary `tensor_factors`, plus `irreps`. Every supplied irrep must obey group laws and characters must be orthonormal. Decomposition and irrep-list completeness are independently certified by dimensions. No completeness assumption is inferred from the length of the input list. |
| `induce` | Complete `table` with optional semilinear/projective factors, `subgroup` indices and unitary subgroup `matrices`. Left-coset block induction includes conjugation and projective factors and verifies every resulting product. |
| `wigner` | Complete magnetic table/parity/factor system and one exact irrep of its unitary subgroup (matrices ordered by the ascending unitary indices). Computes the projective Herring indicator, constructs type a/b/c matrices, and verifies all semilinear products. Type a uses a normalized exact conjugate intertwiner; b/c use exact index-two induction. Reducible source inputs are rejected before the indicator can be called a type. |
| `symmetrize` | Exact finite semilinear Reynolds average of a `matrix` under a supplied unitary-matrix representation. This is a fixed-momentum projection, not a real-space HR symmetrizer. Every resulting invariance is checked. |
| `seitz` | Exact matrix affine multiply, inverse or power, including symbolic translations and antiunitary parity. No modulo-lattice rounding. Optional `k` gives the exact translation phase. |
| `gauge` | Explicit `matrix`, fractional orbital `centers` and real `k`; `periodic_to_atomic` or inverse. For this website's positive Fourier convention, `U_aa=exp(+2πi k·τ_a)` and `H_atomic=U† H_periodic U`, giving `R+τ_j−τ_i` in the exponent. The sign is deliberately adapted to this website, not blindly copied from an upstream convention. |
| `bloch_cocycle` | Complete supplied little-cogroup Seitz `operations`, symbolic real `k`, optional `spin_factor_system`. Builds exact quotient multiplication, integer product shifts, reciprocal little-group shifts and `exp(-2πi k·L(g,h))` factors. Checks the complete normalized semilinear cocycle, including arbitrary supplied spin factors. Operations not in the symbolic little group are rejected. |
| `representation_element` | Supplies a representative `matrix` and an integer `translation`, with common `k` or explicit `row_momenta` for a full star. Evaluates the left translation `D(T_t g)` exactly. The caller's row/star ordering is preserved; antiunitary traces are omitted as characters. |

All displayable results include `matrix`, `latex`, `mathml`, `symbols`. `conditions` retains original parser poles, sufficient generic-rank minors, constructed kernel/RREF/intertwiner denominators, and witness nonsingularity. These conditions are necessary caveats; this is not exhaustive symbolic parameter stratification.

## Independent verification

- Mixed sqrt(2), sqrt(3), I and a fifth root compile to conductor 120 and degree 32. Independent complex embeddings agree to 1e-13. Rational-angle sine/cosine and inverse radicals also checked.
- Cyclotomic common kernel verified modulo Φ3 and compared with the analytic column `(z²,-z,1)`.
- A cancelled `(1+z+z²)/(1+z+z²)` at a primitive cube root is rejected; its lost denominator is not silently accepted.
- Nonorthogonal C2 representation obtains the independently known Gram matrix `[[1,-1],[-1,3]]`.
- Real-linear antiunitary intertwiners for K are exactly real scalars; phase-twisted antiunitary matrices are tested too.
- S3 standard tensor square decomposes as `1 ⊕ sign ⊕ 2`; the sign projector is the independent antisymmetric tensor projector. Standard irrep matrix units are exactly E_ab.
- A C3 character induced to S3 has characters `(2,0,-1,0,-1,0)`.
- Type a: spinless T, a nonreal C3 irrep under antiunitary inversion, and a real S3 2D irrep.
- Type b: projective `T²=-1` creates the 2D Kramers pair; the quaternion Q8 irrep creates a 4D type-b corep.
- Type c: C3×T pairs conjugate characters. An independently rephased nonreal cocycle checks every phase/conjugation in the induction formula.
- Spinful TR Reynolds projection sends a general Hermitian 2×2 matrix to `a I`.
- A screw square yields exact lattice translation and its symbolic k-line phase. Antiunitary half translation at k=1/2 gives factor −1; it is correctly rejected at a generic q.
- Bloch gauge sign is independently checked for a single intracell bond against `exp(+2πiq(τ_j−τ_i))`, in addition to round-trip and spectral checks.
- Full-star left translations use separate q and −q row phases. Symbolic affine inversion retains the determinant pole.
- AST injection and unknown actions are rejected. Every shipped new example is executed by the regression suite.

## API inventory and actual scope

`dist/data/symbolic-api-coverage.json` records all 308 public `::usage` symbols from four stated source files (including options, data, display routines), SHA-256 hashes and explicit per-symbol status. Seventeen symbols have exact workflow mappings, sixteen have partial exact mappings, fifteen have existing numerical mappings, one has a partial existing mapping, and 259 have **no claimed mapping in this symbolic port**. That last count includes many options/data/presentation symbols and must not be presented as 259 missing mathematical algorithms. This inventory is not a universal all-four-project parity percentage.

The six low-level MagneticTB cyclotomic APIs are mapped explicitly. Corep construction/checking, Seitz arithmetic, cocycles, translation matrices and ordinary character/tensor workflows are mapped against specific SpaceGroupIrep/MSGCorep public names. JSON contracts intentionally differ from stateful Wolfram objects; no drop-in syntax compatibility is claimed.

Remaining gaps are explicit: an automatic exact BC-labelled SG/MSG irrep/corep database at every symbolic k line and full star; all continuous spin-space-group and stateful session interfaces; general exact corep tensor decomposition with all upstream labels; exhaustive parameter/branch strata. The existing numerical SG/MSG engine remains numerical. This module does not replace it with a false exactness claim.

Bounds: complete groups <=64 (projective/cocycle groups <=32); supplied rep dimension <=8; induced dimension <=24; common cyclotomic conductor <=240 and degree <=64; dense cyclotomic matrices <=24×24. Resource limits are rejected, not silently truncated.

## Executable examples

`interfaces-common-kernel.json`, `interfaces-cyclotomic.json`, `interfaces-cyclotomic-kernel.json`, `interfaces-wigner-kramers.json`, `interfaces-intertwiner.json`, `interfaces-projector.json`, `interfaces-symmetrize.json`, `interfaces-gauge.json`, `interfaces-screw-cocycle.json`, `interfaces-translate-star.json`, `interfaces-seitz.json`.
