# Bond symmetry, exchange tensors and DMI

This experiment derives allowed exchange-tensor components from spatial operations on a directed bond, then separately solves the quantum spectrum of two spin-1/2 objects and the minimum energy of two classical unit vectors. Every input exchange coefficient is in meV.

## Why spatial operations require endpoint checks too

The directed bond is fixed as `i=(-1/2,0,0) → j=(1/2,0,0)`. Positions transform with the polar-vector matrix R, and real spins with the axial-vector matrix `A=det(R)R`. The interaction convention is `H_ij=S_i^T J_ij S_j`.

- Operations fixing both endpoints require `J=A^T J A`.
- Endpoint-exchanging operations require `J=A^T J^T A`.
- Bond-center inversion has A=I but exchanges endpoints, requiring J to be symmetric.
- An xy mirror containing the bond allows normal Dz; a yz mirror perpendicular to the bond exchanges endpoints and allows in-plane Dy,Dz.

Choose bond-center inversion, xy/xz/yz mirrors, and twofold/fourfold bond-axis rotations. Each  generator  equality gives nine real-entry linear relations; common nullspaces give orthogonal projection, and generated closure checks all operations. Keep relation origins, axial matrices, endpoint exchange, and pre/post residuals. After disabling  generator , use the actual group rather than claiming the former larger  point group .

## Exchange decomposition and the sign of D

The nine independent real inputs are isotropic J, two traceless symmetric diagonal terms, three symmetric off-diagonal terms, and three D components. The complete exchange matrix splits into isotropic, symmetric traceless, and antisymmetric parts, with conventions:

`K(D)=[[0,Dz,-Dy],[-Dz,0,Dx],[Dy,-Dx,0]]`

Thus `S_i^T K(D) S_j=D·(S_i×S_j)`. Reversing directed bond labels requires `J_ji=J_ij^T` and `D_ji=−D_ij` together.

Allowed exchange matrices are obtained by orthogonal projection under the Frobenius inner product. This is a reproducible teaching operation, not an electronic-structure superexchange calculation or a determination of actual material coefficients. Symmetry-allowed components may still vanish.

## Interpret classical and quantum results separately

The quantum model uses `S=σ/2`, basis `↑↑, ↑↓, ↓↑, ↓↓`, and a directly constructed Hermitian 4×4 Hamiltonian with four levels/degrees of degeneracy. For degenerate ground states, report equal-weight full-subspace  density matrix , spin correlations, and local-spin expectations, not an arbitrary eigenvector asserted to establish order.

The two arrows in the classical plot are unit vectors. The global minimum of the bilinear form is minus the largest singular value of J; left and right singular vectors give one minimizing representative. Degeneracy of the largest singular value gives multiple representatives; a common sign is fixed only for display and is not interpreted as physical spontaneous symmetry breaking. The xy-plane curve additionally fixes the first spin along x, so it is generally a restricted trial energy and need not attain the global minimum.

For isotropic J=1,D=0, the classical minimum is −1 meV, while the quantum singlet is −0.75 meV and triplet 0.25 meV. Adding Dz changes classical canting and quantum levels separately; classical arrows are not local moments of a finite quantum ground state.

Overall two-spin  time reversal  squares to +1. This field-free model satisfies  time reversal , but does not imply Kramers pairing. Displayed degeneracy describes current parameters, not  degeneracy protection  proven against all allowed perturbations.

## Convention comparison

Rotate the right-handed axes by θ about the old z axis and use passive component transformation `v′=Q^T v`. Then `J′=Q^T J Q` and `D′=Q^T D`. If endpoints are also exchanged, transpose J before changing coordinates. The interface retains both tensors and spectra and reports the maximum level difference. Spectra, classical minimum energy and consistently transformed physical quantities are invariant under this convention change.

## Cross-module projects and units

Atlas assignments offer three three-stage experiments, collecting full inputs, results, and explanations stage by stage, exporting JSON/Markdown, and importing independent copies.

- Order parameter → magnetic bond → conventions: first find the stabilizer of polar order-parameter direction (1,0) in C₄ᵥ, then additionally assume that a bond environment along x retains only the xz mirror. The last two steps use the same magnetic bond and compare complete spectra after coordinate changes and endpoint relabeling. An abstract order parameter does not automatically generate an atomic structure or space group.
- Magnetic bond → inversion → conservation: toggle only bond-center inversion to remove allowed DMI. Symmetric anisotropy is deliberately zero, so the inversion-symmetric result is isotropic exchange. Use ℏ=0.0006582119569 meV·ns to connect to dynamics at 1 rad/ns, comparing all levels and total-spin conservation.
- Conservation →  decoherence  →  density matrix : change only pure- decoherence  rate in one single-spin model, then reproduce identical initial state, Hamiltonian, noise, and 161 time points in the existing  density matrix  lesson. Conserved S_z does not imply constant transverse coherence or purity.

Every new project step links to an actual preset and fixes all calculation parameters. The exchange lessons contain six basic presets and four project presets; the project’s tiny energy scales serve explicit unit conversions only and are not fits to any material.

## Scope and validation

Only an abstract bond is calculated; ligand paths are not automatically found from arbitrary POSCAR/CIF, nor are lattice order, nonreciprocal magnons, or quantitative weak- ferromagnetic  moments calculated. Connections include Hubbard, magnons,  density matrix , and crystal symmetry; comparisons require matching units/spin normalization.

`scripts/test-python-exchange-symmetry.py` checks closure for all 48 generator-toggle combinations and independent invariance of classical energies, D direction under endpoint exchange, matrix decomposition, the global classical lower bound, analytical Heisenberg/DMI quantum spectra, averaging over degenerate ground states and complete Hamiltonians after explicit quantum rotation/exchange unitaries.

`python scripts/build-principles-project-fixtures.py` reruns nine Python stages from actual presets. `node scripts/test-principles-projects.mjs` checks source hashes, preset matching, ℏ conversion, complete density-matrix trajectories, actual project-interface collection, explanation restoration, export, independent-copy import, and retention of the previous 14 projects.

## Sources

- [T. Moriya, Anisotropic Superexchange Interaction and Weak Ferromagnetism, Phys. Rev. 120,91 (1960)](https://journals.aps.org/pr/abstract/10.1103/PhysRev.120.91): antisymmetric/symmetric anisotropic exchange under spin–orbit interactions.
- [Feynman Lectures III, Chapter 18](https://www.feynmanlectures.caltech.edu/III_18.html): angular momentum and the physical meaning of axial vectors under inversion.

These sources provide physical background; code, finite-bond constraint solving, exercises, and numerical examples are independently implemented.
