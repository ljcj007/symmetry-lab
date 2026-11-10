#  symmetry-adapted basis /unified  selection rule

This module constructs finite-group representations, SALCs and operator matrices from actual orbital permutations using Python/NumPy. Open `#compute/salc-lab`; the action is `salc_lab` and data version is `20261030-construction1`.

## Models/conventions

Original orthogonal basis order: `(1,0)、(0,1)、(-1,0)、(0,-1)`, with one scalar orbital per point. Operations act actively on states; column j of `D(g)` is orbital j's image. Generators are counterclockwise C4z and xz mirror. Integer spatial matrices are closed, then coordinate matching generates permutation matrices.

One copy decomposes A1+B1+E; A2/B2 project zero. Two-copy I_copy ⊗ D(g) gives2A1+2B1+2E. Characters project full equivalent-copy  isotypic subspace ; E matrix elements align x/y partners. One seed is not assumed to span repeated  complex representation .

The Hamiltonian includes neighboring hopping on a four-site ring, same-site intercopy hopping, a second-copy energy offset and a B1-type potential averaged over the retained group. Energies are relative. With the full parent group, the E block has H_copy ⊗ I_partner structure; after removing generators, the actual retained subgroup is generated and averaged, rather than deleting selected representation matrices.

## Operators and selection rules

Support in-plane  polar vector  dipole `cos(theta) X + sin(theta) Y`, A1 identity, B1 `X²-Y²`, and A2  Hermitian  circulation `i(D(C4)-D(C4)†)/2`. The last illustrates complex elements without magnetic units/material calibration.

Character inner products give the multiplicity of Γ_final in Γ_operator ⊗ Γ_initial; the squared Frobenius norm of the full SALC block is calculated independently. Zero multiplicity means forbidden; nonzero multiplicity does not guarantee finite matrix elements. Zero numerical amplitudes, polarization selection and copy orthogonality can all make elements vanish.

The polarization plot always uses a polar-vector dipole probe and shows first-copy A1→E_x,E_y intensities, cos²(theta)/2 and sin²(theta)/2 at unit amplitude, totaling 1/2. Tables and actual matrices use the selected operator. Parent labels remain a reference basis, not energy-state labels after symmetry lowering; a full operator matrix in the energy basis is also supplied.

Finite-group/SU(2) Wigner–Eckart both separate symmetry and system-dependent reduced quantities, but use different couplings. SU(2) angular-momentum  Clebsch–Gordan coefficients  are not C4v coefficients, and arbitrary finite-group CG tables are not solved.

## Interactive data

- `replay`: seed, 8 character-weighted operation sums, final projection, E partner construction, complete SALC basis, and Hamiltonian blocks. Matrices/vectors use `{re, im}`; orbital weights are signed real amplitudes.
- `subgroupGraph`: C4v, C4, Cs(xz), C1/actual inclusions. Draw only four subgroups for two specified  generator , not full lattices. Retained groups are minimum guaranteed constraints; special parameters may add symmetry.
- `grading.tasks`: the full isotypic subspace of the current target irrep. The reference is an n×d full-column-rank complex matrix, with operations from the complete parent group; grading permits phases, normalization and invertible internal basis changes.
- `breaking`: enumerate every removal set from C4z,m_xz, construct residual closure, group-average a unit B1 potential, and test actual A1—B1 mixing. Independent of current perturbation strength, the challenge removes the group-theoretic prohibition; at least C4z must be removed.
- `salc`: full basis,  projection operator , site/SALC Hamiltonians, site/SALC/energy operators, spectra, each  isotypic subspace , selected matrices.

## Inputs

`copies` is 1 or 2; `targetIrrep` is A1, B1 or E; `seedSite` is 0–3; `operatorType` is dipole, scalar, quadrupole or axial; `polarizationAngle` is −360 to 360 degrees; `operatorScale` −5 to 5; `hop` −5 to 5; `crossHop` −3 to 3; `copyOffset` −5 to 5; `anisotropy` −3 to 3; `retainC4` and `retainMirror` are 0 or 1. Unknown parameters, nonfinite values and invalid integers are rejected.

## Validation and scope

Independent tests cover closure/multiplication, coordinate maps, character orthogonality, projector idempotence/completeness, matrix-element projector multiplication, standard SALCs, Schur structure for repeated irreps, analytic spectra, operator covariance, forbidden blocks, polarization versus rule-allowed nonzero values, subgroup closure/minimal breaking, complex serialization, all presets, lessons, and assignment dimensions.

Four-ligand, two-local-copy, anisotropic cases are explicit local teaching models, no automatic structure reading, chemical-overlap determination, level fitting, or absolute spectra. Links to real  crystal field ,  multiplet ,  order parameter , and records support cross-module designs.

References: M. S. Dresselhaus’s MIT author lecture notes, Applications of Group Theory to the Physics of Solids (2002, Chapters 2–4 and direct products/selection rules), and R. G. Littlejohn’s Berkeley Physics 221A Notes 19, Irreducible Tensor Operators and the Wigner–Eckart Theorem. Course data retain clickable originals; this module’s specific four-/eight-dimensional matrices and values come from code construction and independent tests.
