# Continuous symmetry, conserved quantities, and  degeneracy protection

Version: 20261030-symmetry1. Open `#compute/conservation-lab`; lessons are in the continuous-groups route. Computation handles only one or two distinguishable spin-1/2 particles and separates three questions: whether the Hamiltonian preserves a continuous generator, whether conservation survives coupling to an environment, and whether a degeneracy meets the declared protection conditions.

## Models and units

Use single-spin `↑, ↓` or two-spin `↑↑, ↑↓, ↓↑, ↓↓` bases. Spins use `S=σ/2`, not Pauli matrices directly. The calculation matrix is `h=H/ℏ`:

`h = Jx SAx SBx + Jy SAy SBy + Jz SAz SBz + hx(SAx+SBx) + hz(SAz+SBz) + δ(SAz−SBz)/2`。

All Hamiltonian coefficients use rad/ns and time uses ns; δ is the difference between the two sites’ longitudinal-field coefficients. A single spin uses only uniform transverse and longitudinal fields. Initial states include up/down polarization, x polarization and the maximally mixed state; two spins additionally support antiparallel and singlet states.

Each site independently uses `C1=√γ1 σ−` and `Cφ=√(γφ/2) σz`. `σ−` maps the upper state to the lower; rates are in ns⁻¹. These specified Markov channels are not automatically inferred from structure, temperature, or the Hamiltonian. A zero rate removes that channel.

## Conservation criteria and constraint origins

For a time-independent Hermitian operator Q, conservation for all initial states of a closed system requires `[h,Q]=0`. With dissipation, the program directly constructs

`L†Q = i[h,Q] + Σc(Cc†QCc − {Cc†Cc,Q}/2)`。

Only a vanishing full operator gives conserved expectation values for all initial states. Outputs include every Hamiltonian-term commutator, every channel's adjoint contribution, and their full matrix sum; summing individual norms cannot replace the norm of the sum. Isotropic exchange is an important cancellation example: y and z terms separately fail to commute with total Sx, but cancel together.

Check total Sx, Sy, Sz, S², and h. Identity-like quantities receive `trivial` labels, e.g.single-spin S²=3I/4. Conserved S² does not prove SU(2): this gradient-free two-spin-1/2 XYZ model can retain S² without three continuous-rotation  generator . Coordinate-axis tests cannot exclude an oblique-axis continuous symmetry; failure on all three axes is therefore not described as absence of every continuous symmetry.

All expectation values of a maximally mixed closed-system state can remain constant even when Q does not commute with h. This counterexample shows why a flat trajectory cannot replace an operator proof. The connection to Noether’s continuous action symmetries enters through this quantum-generator criterion; the finite model does not simulate thermodynamic spontaneous symmetry breaking.

## Degeneracy-protection diagnostics

Physical  time reversal  uses single-spin `T=(−iσy)K` and acts on both factors for two spins, giving T²=+I overall. The program computes `UT h* UT†−h` residuals and reports T² signs. Kramers protection is marked only for T²=−I and T-preserving H.

Global SU(2) explains the triplet of two spins with isotropic exchange; T²=+I alone does not enforce this triplet or require even degeneracy. For coincidences not explained by these conditions, the program reports only multiplicities rather than universally labeling them accidental or topologically protected.

The plot scans the independent perturbation `ε Sz`, with ε in rad/ns and energies sorted at each ε. This is a static-Hamiltonian spectrum, not the Lindblad generator's complex spectrum. Sorted curves do not track fixed eigenstate identities through crossings. The level-grouping tolerance 1e−8 rad/ns is used only to display multiplicities.

## Convention comparison

For the y-axis basis transformation `U=exp(−iθ Sy)`, define new basis vectors=old basis vectors×U. The program consistently transforms `h′=U†hU`, `Q′=U†QU`, `ρ′=U†ρU` and every `Cc′=U†CcU`. The antiunitary part must use `UT′=U†UT U*`.

The transformed model reruns full-duration matrix-exponential propagation and compares levels, expectations, the final density matrix, and adjoint-action covariance residuals. It also checks antiunitary squares and transformation covariance. This changes representation coordinates; it does not replace physically rotating a sample under a fixed external field.

## API and output

The action is `conservation_lab`. The browser worker must load `density_matrix_lab.py` and `conservation_lab.py`. The former provides only NumPy implementations of `matrix_exponential` and `liouvillian`; this module constructs its own Hamiltonian, initial state, operator diagnostics and lesson results.

Inputs include `experiment` (single/pair), `initialState`, `observable` (sx/sy/sz/s2/energy), `jx/jy/jz`, `fieldX/fieldZ/gradientZ`, `gamma1/gammaPhi`, `duration`, `points`, `basisAngle`. Unknown fields, nonfinite or out-of-range values, and incompatible initial states cause explicit errors. Ranges: 0–30 ns; 2–301 samples; −180 to 180 degrees; Hamiltonian coefficients −10 to 10 rad/ns; rates 0–5 ns⁻¹.

Besides site-standard `summary/plots/tables/checks/warnings/formulaLinks`:

- `conservation.proofs`: operators for five Q choices, full commutator and adjoint matrices, termwise contributions, norms and Boolean conservation tests.
- `conservation.trajectory`: actual evolution times, five expectations, the selected Q derivative, purity, and complex density matrices.
- `conservation.degeneracy`: T² sign, T-symmetry residual, Kramers conditions, SU(2) conditions, level  multiplicity , and explanations.
- `conservation.convention`: original/transformed matrices, covariance residuals for expectations and evolution, and antiunitary-transformation checks.

Density matrices are not repaired by manual normalization or positive projection. Each sample uses the matrix exponential of the same constant generator. Sparse sampling warns that rapid oscillations may be missed.

Presets `conservation-density-unitary` and `conservation-density-bath` share single-spin longitudinal field h=0.6Sz, x-polarized initial state, and 12 ns window. The latter adds γφ=0.25 ns⁻¹, matching `dephasing-plusx` of the  density matrix  lesson. Both fully conserve Sz, but transverse coherence decays in the latter. Conservation is distinct from coherence.

## Independent verification and sources

`python scripts/test-python-conservation.py` checks analytic single-spin precession and dissipation, Heisenberg levels, XXZ/XYZ generators, finite-π-rotation counterexamples, termwise cancellation, adjoint duality, Kramers conditions, independent eigen-decomposition propagation, basis covariance, initial-state traps, and every lesson preset.

`python scripts/test-python-principles-crosscheck.py` independently checks completeness of signed-permutation group-averaged invariants; orbit/external-field  stabilizer ; projected exchange versus group averaging; quantum-spin inversion/mirror and endpoint exchanges; general-axis SU(2)  change of basis ; and agreement of both two-spin Hamiltonians, spectra, and conserved operators.

Continuous symmetries follow [David Tong’s Noether lecture](https://www.damtp.cam.ac.uk/user/tong/qft/qfthtml/S1.html). Open-system structure follows [Lindblad’s original paper](https://doi.org/10.1007/BF01608499) and the [QuTiP master-equation documentation](https://qutip.readthedocs.io/en/stable/guide/dynamics/dynamics-master.html). Antiunitary and Kramers conditions follow the [MIT Quantum Theory notes](https://web.mit.edu/8.861/www/lect_notes/Lecture15-1.pdf). Numerical models, derivation exercises and example parameters are this site’s teaching implementation, not material-fit data.
