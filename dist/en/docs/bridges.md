# Teaching connections among many-body spectra, polarons and quantum states

Version: `20261030-bridges1`, date: 2026-10-30.

This update adds three physics themes and one derivation workshop: 13 lessons, 13 guided exercises (52 steps), 11 material/model cases, 25 reproducible presets, 8 prediction questions, and 4 cross-module projects (12 stages). The center retains its original 10 projects, totaling 14. The dictionary adds 16 entries, totaling 82 and 30 source records; the original 66 and main-version metadata remain.

These additions connect to the existing classroom, computation center, material atlas and research records, preserving the five main navigation items, seven learning routes, 18px body text and unified mathematical typesetting. All new scientific calculations use Python/NumPy in the browser; the interface displays results, collects parameters and saves learning records rather than inventing curves.

## Entry points

| Content | Lesson | Independent calculation |
|---|---|---|
| Many-body spectral functions and dynamical response | `#classroom/observables?module=manybody` | `#compute/manybody-spectra-lab` |
| Electron–phonon coupling and polarons | `#classroom/structure-dynamics?module=polaron` | `#compute/polaron-lab` |
|  density matrix ,  entanglement ,  decoherence  | `#classroom/spin?module=density` | `#compute/density-matrix-lab` |
| Symmetry derivation workshop | `#classroom/crystal?module=workshop` | `#compute/symmetry-workshop` |

`#atlas/bridges` collects these cases; `#atlas/projects` saves staged computational evidence and explanations; `#atlas/compare` provides shared parameter comparisons; `#docs/dictionary` explains formulas, variables, units, and conventions.

## Four models with explicit limits

### Many-body spectra: from energy levels to visible transitions

Reuses the existing Hubbard module's 2–4-site single-orbital Hamiltonian, fermionic signs, and basis at fixed spin-resolved particle numbers. It calculates zero-temperature electron-addition and electron-removal Lehmann spectra, together with particle-number-conserving connected longitudinal-spin and density spectra. Peak positions, weights, conditional final states, and sum rules are obtained from the same actual transition matrix elements.

The initial state is an equal mixture over the degenerate ground space in the selected particle-number sector; final states are grouped by degenerate energy. Clicking a peak shows final-state observables conditioned on that transition, rather than treating an arbitrary eigenvector in a degenerate group as the unique physical state. Chemical potential shifts only the energy reference and does not automatically change filling.

Unbroadened weights and first moments are checked separately. η is imposed Lorentzian half-width, not a calculated lifetime; finite-window and coarse-grid errors are reported independently. This is not a measured photoemission/neutron cross section, finite-temperature spectrum, DMFT, or thermodynamic Mott diagram. See [many-body spectrum notes](manybody-spectra.md).

### Holstein: electrons and two quantum oscillators

Fix one electron, two sites, and two local oscillators. The coupling gΣn_iX_i modulates site energies. Outputs include electron occupations, phonon distributions, electron–displacement correlations, conditional displacements, reduced electronic purity, and low-energy spectra. X=b+b† is dimensionless and does not directly equal Å.

Each oscillator cutoff 0…N_max is compared automatically with N_max+1 at current parameters, alongside highest-level probabilities and local-observable changes. Each scan point still needs cutoff diagnostics; small finite-matrix residuals do not prove untruncated-model convergence. Uniform electronic density in a symmetric state does not exclude a vibrational cloud.

This model does not automatically obtain g from structures or Phonopy data, implement self-consistent SSH bond distortions, or predict a specific material’s polaron size, transitions or real spectra. See [polaron notes](polaron-lab.md).

### Density matrices: local mixing and global entanglement

Evolve one or two spins 1/2 with a constant Hamiltonian and independent local Lindblad channels. Choose pure, singlet, antiparallel classical-mixture, or thermal initial states and inspect linked Bloch vectors, complex  density matrix ,  partial trace , purity, local entropy, and two-spin negativity.

H/ℏ coefficients use rad/ns, time uses ns and γ uses ns⁻¹. A fixed ↑→↓ channel does not reverse automatically when the field changes sign; the initial Gibbs temperature is not the environment temperature. With driving or exchange, local channels do not automatically satisfy thermal detailed balance for the full Hamiltonian.

Local entropy directly equals the corresponding bipartite entanglement entropy only for a globally pure state; two-spin mixed states also report partial-transpose negativity. Trace, Hermiticity, and positive semidefiniteness are checked throughout the trajectory without hiding problems by renormalization or deleting negative values. See [density-matrix notes](density-matrix.md).

### Symmetry workshop: how  generator  constrains allowed terms

The workshop displays a second-order k·p model near two-dimensional Γ for a real-spin doublet of common parity. Choose C₂ᵥ, C₃ᵥ or C₄ᵥ reference generators, independently toggle rotations, mirrors, inversion and time reversal, and inspect full polynomial-coefficient constraints, allowed-space dimensions, coefficients before and after projection, and bands.

Under mirrors, momentum transforms as a polar vector and spin as an axial vector. Disabling generators removes the claim of preserving the original group; adding inversion can enlarge the actual symmetry group. Coefficient projection uses the Euclidean metric of the listed monomials: a teaching construction, not a material fit. The workshop does not replace the general symbolic Hamiltonian tool or infer full-Brillouin-zone topology from local gap opening. See [workshop notes](symmetry-workshop.md).

## Interaction and learning records

### Predict, run, then explain

Eight prediction questions correspond to specific presets. Selecting a question loads its preset; submit a prediction before starting validation. After the actual Python calculation, the teaching answer, explanation, and computational evidence appear. Changing parameters exits the question, preventing a preset answer from being applied to another model. Free exploration still allows direct calculation.

Prediction/validation times, choices, and explanations are saved with results. Answers use reviewed controlled questions, not general scientific-argument grading. Guided questions advance through hints, choices, explanations. Project completion means collecting evidence and notes, not automatic validation of free-text conclusions.

### Shared A/B parameter comparisons

Calculate and pin A, record a prediction, then change parameters in the same tool and pin B. Every input difference is listed. One changed parameter is identified as suitable for a controlled comparison; multiple changes are retained explicitly without claiming a single-variable experiment.

A/B must use the same calculator. Curve overlays additionally require matching versions and model, experiment, probe, responseKind, spin, pointGroup fields, with compatible plot IDs, titles, axes. Otherwise retain both raw results without overlay. This does not replace scientific judgment on units and assumptions; older tools without generic curves still support raw input/output comparison.

Fixing B locks the prediction; the explanation remains editable. JSON export, importing a copy and saving as a material research project are supported. A comparison file is limited to 3 MiB; use material research records for larger full results. Records remain in the current browser, and input data are not automatically uploaded.

### Linking formulas, current values, and plots

New formula cards include current parameters/results and locate corresponding plots when selected. The  density matrix  slider reads the same Python trajectory; many-body peak selection uses the same transition table, not separately calculated illustrations.

The existing formula dictionary preserves the original text and provides variables, units, conventions, scope and sources. New entries distinguish η from γ, Latin g from Γ, purity from entanglement, peak weight from peak height, and energy from angular-frequency units for J. Matching preserves Greek-letter case and distinguishes relaxation time T₂ from time-reversal T². Ambiguous matches show candidates or an unknown result rather than guessing.

## Four cross-module projects

1. **From Hubbard levels to visible transitions:** one dimer ground state → addition/removal spectra → fixed-particle-number spin response; distinguish sectors, operators, weights.
2. **Distinguish vibrational clouds, partial traces and mixed states:** start with uncoupled Holstein, switch on only g, then use a two-spin classical mixture as a counterexample. No false one-to-one parameter mapping is imposed between the models.
3. **From CG decomposition to exchange dynamics and dephasing:** the 1/2⊗1/2 coupled basis → exchange-only trajectories → enable only γφ. State the relation between exchange energy κ and angular frequency J: κ=ℏJ.
4. **From allowed terms to local models and periodic bands: ** C₄ᵥ and  time reversal  → add inversion alone → periodic Rashba model. Compare expansions only near Γ and state model units and coefficients separately.

Each project stage checks required parameters and includes actual calculations. Cross-model questions require explanations of physical connections and limits; plots from different Hilbert spaces, probes or normalizations are not divided directly.

## Build, validation, and sources

`scripts/build-bridges-catalog.py` merges four original content files, preserving the directory. `scripts/build-bridges-fixtures.py` and `scripts/build-bridges-project-fixtures.py` generate real fixtures through the public browser API. Hashes use UTF-8/LF for source and original bytes for binary gzip, supporting Windows and CI.

`npm run test:bridges` checks new cores, presets, routes, exercises, projects, comparisons and dictionary entries. Existing full regressions continue with `npm test` and `npm run test:python`. Formula-directory regressions preserve original text and verify unified mathematical rendering.

After final changes and fixture updates, run:

```text
python scripts/refresh-bridges-provenance.py
python scripts/refresh-bridges-provenance.py --check
```

The script preserves old-manifest version, date, counts, sources, scope, refreshing existing hashes and registering four new cores before generating [this manifest](../data/bridges-provenance.json). `--check` is read-only, without catalog rebuild, packaging, commit, or publication. The new manifest covers shared UI, tests, fixtures, and refreshed historical manifests too.

Methods follow the primary papers and official documentation listed in each lesson, including Hubbard/dimer studies, TRIQS/Quanty, Holstein, EPW, QuTiP, Vidal–Werner and Qsymm. These establish methods and background; the courses, synthetic presets, browser calculations and exercises are independent teaching implementations, not complete ports of the reference software or material fits.
