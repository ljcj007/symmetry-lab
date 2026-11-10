#  layer group ,  chirality , and many-body  symmetry-protected topology

Version 20261031-frontiers1: 9 lessons, 36 derivation steps, 18 computational presets, 6 prediction questions, 9 material-background/model cases and 3 cross-module projects. Existing font sizes, mathematical typesetting and local research records are retained.

## Computational scope and evidence

- ** layer group /surface/interface:** simple-cubic (001)/(110)/(111) cuts with 1–6 finite layers. Use primitive 2D in-plane lattices, no normal wrapping. Enumerate 48 parent orthogonal Cartesian matrices, filter normal-preserving  little group , search in-plane translations, preserve species atom by atom, and verify bijections/affine closure. Supports homo-/heterointerfaces, lateral shifts, alternating A/B layers, two cuts, and top labels. Only inherited operations are reported; accidental layer symmetries may be absent. This is not arbitrary-structure identification of all 80  layer group .
- **Chirality/polarity/tolerance**: finite point sets for D3, C4v, Oh and four distinguishable sites. Enumerates same-species permutations with Kabsch alignment constrained to determinant +1; separately enumerates orthogonal isometries of the current point set and finds the nullspace of allowed polar vectors. Strict operations use a 10⁻⁷ model-length threshold. The pseudosymmetry panel uses ideal-parent operations, fixed atom correspondence and a maximum-displacement criterion, explicitly testing closure of the accepted set; this is not a complete spglib search. The optical panel is an independent ideal Jones round-trip rotation model, without fitting optical constants from geometric chirality or equating polarity with ferroelectricity.
- **Many-body SPT**: NumPy exact diagonalization of 3–5 spin-1 AKLT sites with D and tilted uniform/gradient fields. Bond Hamiltonian: S·S+(S·S)²/3+2/3=2P₂, J=1. Rx,Rz,time reversal, and bond-centered inversion are checked separately. For degeneracy, a pure state is deterministically selected from the ground projector and the method recorded before Schmidt decomposition; a mixed-state spectrum is not presented as pure-state entanglement. Virtual Pauli projective phases are analytic evidence only at the AKLT point. Finite-chain spectra and seven-point paths do not automatically determine thermodynamic transitions or general SPT classes.

## Interaction and records

`symmetry_linked` transforms r, k and axial vector S together. It defaults to active orthogonal operations; additional time reversal preserves r and reverses k and S. k uses radians/length, and the translation phase is exp(−i k′·t); antiunitary wavefunctions additionally require conjugation. The three-dimensional view can rotate, with the matrix and components of all three vectors displayed together.

Inverse-identification fingerprints use the same geometry/matrix engines and filter candidates by acquired tests, allowing several to remain. The suggested next test maximizes discrimination among survivors. Grading concerns listed teaching candidates only, not inference for arbitrary real materials; exercises run client-side and are not a confidential examination system.

The path panel shows real pointwise results and loads selected points. A/B retains complete inputs, results, explanations; export/add to research records explicitly, in-memory A does not survive refresh. Changed inputs invalidate old auxiliary evidence; async results include cancellation/lifecycle checks.

The three projects connect existing order-parameter, SHG and density-matrix tools. Each stage retains actual computational inputs and states the additional assumptions of the independent models, without claiming automatic real-material parameter fitting.

## Entry points and validation

- `#classroom/crystal?module=layers` / `#compute/layer-symmetry-lab`
- `#classroom/observables?module=chirality` / `#compute/chirality-polarity-lab`
- `#classroom/spin?module=spt` / `#compute/manybody-spt-lab`
- `#atlas/frontiers` / `#atlas/projects`

`npm run test:frontiers` checks matching, closure, mirror registration, independent  polarity , noise/tolerance, AKLT spectra/degeneracy, Schmidt normalization, antiunitary transformations, protection, inverse questions, and UI/project import/export driven by actual Python. Lessons/dictionary list Bilbao, IUCr, spglib, AKLT, Pollmann primary sources.
