# Supercells, defects, and band unfolding

Browser Python/NumPy studies1D chains, one orthogonal orbital/reference  primitive cell : pristine, periodic impurity, alternating hopping/onsites, vacancy deletion, and matching preprocessed vectors. It is not arbitrary3D VASP unfolding.

## Why unfold bands?

Repeating a primitive cell N times reduces the supercell BZ N-fold and folds one band into N, by itself no new physics. Unfolding projects wavefunctions onto primitive momenta to show which folded bands retain primitive Bloch character. When impurities/distortions break primitive translation, one k's weight can spread across energies.

Reference  primitive cell  length a=1, energies eV, wavevectors1/a. UI q=k/π; imported kPoints are K itself, not interchangeable.

## Hamiltonian and phase conventions

In the supercell site basis use

`ψ(RN+j) = exp(i K R N) c_j`。

Intracell entries−t, boundary `H[N−1,0]=−t exp(iKN)`, conjugate transposed. At N=2, intracell/cross-cell contributions join the same orbitals and add.

- `perfect`: onsite potential ε, nearest-neighbor hopping −t.
- `impurity`: add `defectStrength` at `defectSite`, periodically one impurity per N primitive cells.
- `dimerized`: bond j `−t[1+δ(−1)^j]`, requiring even N.
- `alternating`: onsite potential `ε+Δ(−1)^j`, requiring even N.
- `vacancy`: remove the chosen orbital and connected bonds, rather than mimic deletion with a large onsite potential. M=N−1 orbitals remain; the 1D nearest-neighbor chain splits into periodically repeated finite segments.

Defects repeat with  supercell , not automatically isolated. Weights are not ARPES; photoemission elements, surfaces, instruments absent.

## Projection and required checks

Each supercell K has N primitive momenta `k_m=K+2πm/N` modulo 2π. Using complete orthonormal eigenvector columns `c_jn`, calculate

`W_n(k_m) = |Σ_j exp(−ik_m j)c_jn / sqrt(N)|²`。

Sum complex amplitudes coherently, not orbital probabilities. With M orbitals:

1. Every eigenstate satisfies `Σ_m W_n(k_m)=1`.
2. Each momentum satisfies `Σ_n W_n(k_m)=M/N`: 1 for full M=N. Vacancies remove weight; do not force normalization to 1.
3. First energy moment `Σ_n E_n W_n(k)=<k|H|k>`, projection vector  primitive cell  N normalization.
4. The complete chain recovers `E(k)=ε−2t cos k`. At degeneracies, an individual eigenvector’s spectral weight can be redistributed by numerical basis choices; the spectral function summed over the equal-energy subspace is invariant.

Outputs report Hermiticity, eigenpair residuals, orthonormality errors, and these sum rules. All models use N≤12 and 9..121 supercell samples, with an extra right endpoint for folded curves. Unfolded curves omit the duplicate and use half-open [−π,π); selectors allow equivalent +π.

## Preprocessed import

See the [complete import example](../examples/unfold-import.json). Outer input is `{ "mode":"import", "data":{...}, "q":0.25, "band":0 }`. `data` requires:

| Field | Specification |
|---|---|
| schema | `symmetry-lab-unfold-1` |
|phaseConvention|Must `supercell-bloch`, as above|
| energyUnit / momentumUnit | `eV` / `1/a` (optional; these are defaults) |
| size | Reference primitive-cell count N,2..12 |
|orbitalSites|Retained  primitive cell  integers j, unique0.. N−1; reordering allowed if matrix rows match|
| kPoints | P strictly increasing supercell K values in [−π/N,π/N], with P=1..121 |
| energies | `[P][M]`; unsorted energies allowed, eigenvector columns reordered consistently |
|eigenvectorsReal/eigenvectorsImag|`[P][M][M]`, orbital rows/eigenstate columns; both required|
| hamiltoniansReal / hamiltoniansImag | Optional but both required together, `[P][M][M]`; independently checks Hermiticity and Hc=Ec |

JSON is limited to 2 MB and finite real numbers, with energy/Hamiltonian entries bounded by 10⁶ eV in magnitude. Eigenvectors must form a complete orthonormal basis; nonorthogonal or truncated-band bases are unsupported. Tolerance is 2×10⁻⁸; energy residuals use the corresponding scale.

Without independent H, full eigenpairs still project, but material-H validation is unavailable. Energies, POSCAR, DOS, or probabilities alone reject. Preprocess large WAVECAR externally with dedicated tools; arbitrary3D easyunfold is not accepted. Teaching format requires known1D orthogonal single-orbital maps.

The imported-data selector uses the nearest available primitive-cell k point and returns requested q, actual q and sampling distance; it does not interpolate nonexistent wavefunctions.

## Stepped exercises and key answers

### Exercise1: does cell expansion create bands?

Let t=1 eV, ε=0 and N=4.

1. Primitive `E(k)=−2 cos k`; supercell BZ `[−π/4,π/4)`.
2. Given K, use `k=K+mπ/2` and fold k into  primitive cell  BZ.
3. At K=0, folded eigenvalues are −2, 0, 0 and 2 eV.
4. At k=0 all weight is at −2 eV; ±π/2 correspond to a degenerate 0-eV space. Unfolding recovers the original single cosine band.

### Exercise2: does faded weight mean missing states?

Let N=4 with one impurity potential V=2 eV.

1. Calculate `W_n(k)` and explain coherent phases and squared modulus.
2. At fixed k, check `Σ_n W_n(k)=1`.
3. The first spectral moment becomes `−2 cos k+V/N=−2 cos k+0.5 eV`.
4. A faint spectral line means redistributed primitive Bloch character, not deletion of that supercell eigenstate.

### Exercise3: true-vacancy sum rules

Let N=4 and remove one orbital.

1. M=3 states remain; cut-chain energies `−2cos(rπ/4)`,r=1,2,3 give −√2,0,√2 eV.
2. Each state's total over four  primitive cell  momenta remains1.
3. Summing all band weights at every k gives M/N=3/4.
4. Forcing this sum to 1 hides orbital weight missing relative to the complete reference basis.

### Exercise4: infer a model from spectra

Observe the folded-boundary gap of a dimerized chain. First alternate hopping, then alternate onsite potentials.

1. Dimerized N=2 energies are `±sqrt(t₁²+t₂²+2t₁t₂cos2K)`, with boundary gap `2|t₁−t₂|=4t|δ|`.
2. Alternating-onsite energies `±sqrt(Δ²+4t²cos²K)`, boundary gap `2|Δ|`.
3. Both models can open gaps; boundary-gap size alone does not identify the microscopic mechanism.
4. Compare full dispersion, orbital distributions, and structure, explaining what further evidence is needed.

## Sources/implementation limits

- [easyunfold theory documentation](https://smtg-bham.github.io/easyunfold/theory.html): projection from supercell to primitive-cell Bloch character and required wavefunction information.
- [Popescu & Zunger, Phys. Rev. B 85,085201 (2012)](https://doi.org/10.1103/PhysRevB.85.085201): effective supercell band structures.

Independent NumPy teaching implementation, no copied easyunfold code or1D results mislabeled as real-material first principles.
