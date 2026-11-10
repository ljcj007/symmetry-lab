# Modes, bands and thermodynamics: material research workflows

This update adds phonon-mode identification and freezing, band compatibility, phonon thermodynamics, and local material research records to the existing classroom, computation center, and atlas: 9 lessons, 9 stepped exercises, 36 derivation steps. Existing tools remain; new calculations run in browser Python.

## Entry points/material routes

| Content | Computation center entry | Lesson route |
| --- | --- | --- |
| Phonon-mode identification and freezing | `#compute/phonon-modes` | Structural transitions and domains |
|  band compatibility relations /connectivity | `#compute/band-connectivity` |  space group /crystals |
| Phonon thermodynamics | `#compute/phonon-thermo` | Spectra and properties |

The Si atlas route connects Γ acoustic/optical representations, frozen structures, diffraction, and thermodynamics. GaAs compares mass-weighted modes with physical displacements and existing selection rules. The square-lattice route is a separately labeled 2D teaching model for band branching, mirror protection, and Rashba splitting, not actual Si or GaAs bands.

Built-in Si/GaAs/NaCl use ideal structures, analytic eigenvectors, and synthetic frequencies. Adjustable Einstein/Debye temperatures are teaching parameters. Quantitative material discussion requires user-imported, source-verified data.

## 1. Γ-point mode identification

Phonopy eigenvectors belong to the mass-weighted dynamical matrix. Recover physical displacement directions atom by atom using `u_j ∝ e_j/√m_j`. Symmetry matrices must include both atomic rotations and permutations, not only three Cartesian components.

Identification steps:

1. Collect complete frequency clusters using the user’s frequency tolerance.
2. Check eigenvector linear independence, orthogonality of distinct frequency clusters, and subspace-closure residuals under every structural operation.
3. For orthonormal E, compute `D_sub(g)=E†D(g)E` and  character  `χ(g)=Tr D_sub(g)`.
4. Use `n_α=Σ_g χ_α(g)*χ(g)/|G|` with covered character tables to calculate integer multiplicities and check dimensions.

Changing E to EU sends the restricted matrix to `U†D_subU`, leaving characters invariant. Thus representations label the whole degenerate space rather than arbitrary individual columns.

The table covers nonmagnetic  primitive cell  **O_h, T_d, C_1, C_i Γ modes**. Other  point group  retain calculated operation-wise  character /reasons without guessed labels. Non-Γ points do not use Γ tables; non- primitive cell  folded modes retain extra translation labels. spglib identifies operations, distinguishing unequal-mass same-species atoms to avoid treating isotope exchange as dynamical symmetry.

The Si teaching primitive cell gives acoustic T1u and optical T2g; the two three-dimensional spaces in the GaAs cell are both T2. Labels are not Raman/IR intensities. Directional nonanalytical corrections, numerical splitting or incompatible data may make a subspace fail to close under parent geometric symmetry; interpret this using the data-generation conditions.

Inputs can be `band.yaml`, `qpoints.yaml`, or equivalent JSON containing frequencies and eigenvectors. Lattice, atom order, fractional positions, and masses must refer to the same primitive cell; a matching supplementary structure may be supplied if absent. Material names/formulas do not establish correspondence. At most 64 primitive-cell atoms are currently supported.

## 2.  frozen phonon , finite q, and structure export

Use Phonopy’s atomic-position-dependent phase convention:

`u_j(R)=A Re[(e_j/√m_j) exp(i2π q·(R+r_j)−iφ)] / max_k ||e_k/√m_k||`。

Here q,R,r_j use matching primitive reciprocal/fractional coordinates and φ is in radians. The denominator is the maximum complex-displacement norm envelope, not the primitive-cell count. A is a geometric envelope amplitude in the input lattice's length unit; the largest actual displacement at a given phase can be smaller. Displacements are not finite-temperature RMS amplitudes, and negative-frequency snapshots are not stable periodic motion.

Diagonal  supercell  `[n1,n2,n3]` requires every `ni qi` integer. Minimal `q=(1/2,0,0)` example `[2,1,1]` has opposite mode phases in neighboring first-direction  primitive cell , restored after two  primitive cell . Incompatible finite windows cannot export as periodic cells. Allow 1–8 per axis, at most 512 atoms.

Specify length units before POSCAR/CIF export. Å, bohr, nm and pm can convert to Å; unknown units do not produce apparently usable structure files. CIF writes every atom in P1 rather than retaining unverified parent operations. POSCAR groups by species, with `exports.poscarAtomOrder` mapping to the frozen-atom list; CIF retains frozen-list order. Coordinates wrap by supercell periodicity, while actual displacements and unwrapped positions remain in the result.

A frozen structure is only a specified geometric snapshot. Stability requires subsequent energies, forces, relaxation, and dynamical calculations; one frozen mode does not automatically determine subgroups, transition endpoints, or domain-wall energies here.

## 3.  band compatibility relations  and crossings

The first version uses two explicit periodic Hamiltonians on a square lattice. The lattice constant is 1, k components use radians, and the horizontal axis is `t=kx/π` at `ky=0`, from Γ to X. Energy parameters share a model energy unit with no default eV correspondence.

In basis `(p_x,p_y)`, restrict the C4v E representation along Γ–X to mirror subgroup Cs:

`χ_E(E,m_xz)=(2,0)`，`χ_A′=(1,1)`，`χ_A″=(1,−1)`，

Both inner products equal 1, giving `E↓Cs=A′⊕A″`. X-end  little co-group  C2v branches also come from actual restrictions. Connectivity constrains representations, not energy order or a compulsory interior crossing alone.

Along the path, the model is:

`H(k,0)=2t_hop(1−cos k)I + β(1−cos k)(cos k−η)σ_z + δσ_x`。

At δ=0 the mirror is σ_z and opposite mirror parities cannot hybridize. For β≠0 and −1<η<1, the internal crossing is at `k=acos η`. Turning on δ breaks the parent mirror; at the old crossing energies are `ε±|δ|`, giving gap `2|δ|`. Thus δ=0.2 gives 0.4, not 0.2. Parent character tables and connectivity plots become references only; actual mixed states no longer have strict ±1 labels.

Rashba model:

`H(k)=ε(k)I+α(sin ky σ_x−sin kx σ_y)+Bz σ_z`。

The spin mirror `M=iσ_y` satisfies `M²=−I`, with eigenvalues ±i. Time reversal `T=iσ_yK` satisfies `T²=−I`. For Bz=0, Γ and X are the path’s TRIM with Kramers degeneracy, whereas general k partners lie at −k and Rashba splitting is allowed. Bz≠0 breaks time reversal and the chosen mirror, opening `2|Bz|` at the former endpoints. For α=Bz=0, degeneracy along the full path comes from extra spin-rotation symmetry; it does not make every k a TRIM.

Outputs include residuals for rotations, mirrors, time reversal, periodicity, Hermiticity, and diagonalization. Nonzero symmetry residuals after deliberate breaking are physical changes to observe, not solver failures. Local E1/2,E3/2,D± labels have explicit model conventions, not Bilbao standard labels. This module provides neither compatibility relations for all 230 space groups, general material fits, nor automatic topological classification.

## 4.  phonon  thermodynamics/data selection

For positive ordinary frequency ν, define `x=hν/(kBT)`. Each mode has:

- `ZPE=hν/2`；
- `U=hν[1/2+1/(exp(x)−1)]`；
- `F=hν/2+kBT log(1−exp(−x))`；
- `S=(U−F)/T`, treating T=0 separately;
- `Cv=kB x² exp(−x)/(1−exp(−x))²`。

Ordinary ν and angular ω obey `ω=2πν`; do not multiply hν formulas by 2π again. Use `expm1`, `log1p`, and low-T branches to avoid overflow/cancellation. At T=0, F=U=ZPE, S=Cv=0.

F, U and ZPE primarily use **kJ/mol of calculation cells**; S and Cv use **J/(mol of calculation cells K)**. Each row also includes `cell`, with eV/cell and eV/(cell K). Teaching models define the calculation cell as the model primitive cell; imported data strictly retain the input-cell basis, labeled `per-primitive-cell` or `per-input-cell`. One mole of calculation cells means N_A of the cells used, not automatically primitive cells, formula units or atoms. Call results per primitive cell only after confirming the input is primitive. For the n=2 model cell, the high-temperature limit is `6R≈49.8868 J/(mol of primitive cells K)`; per mole of atoms, divide by 2.

This distinction changes numerical interpretation. For example, Phonopy's official Si-QHA example uses a natom=8 calculation cell; its thermal properties cannot be labeled directly as those of Si's minimal two-atom cell. Scaling requires confirmed structural correspondence; this site does not guess it.

| Source | Acceptance | Processing/scope |
| --- | --- | --- |
| Einstein / Debye | Primitive-cell atom count and positive characteristic temperature | Comparable teaching models; parameters are not fitted to particular materials |
| `mesh.yaml` | 3D mesh, positive integer weight at each q, complete 3n branches | Verify weights sum to mesh volume, then integrate with weights; users must still check convergence |
| Complete total DOS | Frequency/total-DOS columns, explicit units, input-cell n, completeness confirmation | Integral within 0.5% of 3n per cell; small normalization corrections explicitly reported |
| `thermal_properties.yaml` | File-declared K, kJ/mol and J/K/mol | Display the existing temperature table; derive and label U from F, S and T; missing ZPE remains unknown |
| `band.yaml` or arbitrary q path | Not volume sampling | Cannot replace BZ integration for bulk heat capacity |

Frequency units must come from file/explicit input: THz, cm⁻¹, meV; conflicting declarations reject. Partial PDOS is not total DOS. Continuous DOS uses piecewise-linear interpolation/four-point Gauss interval quadrature; zero endpoints use continuous integration, no discrete zero mode. Low-T results especially need low-frequency resolution.

Negative frequencies or nonzero DOS weight at negative frequencies are not silently removed, sign-flipped or absolutized. Discrete exact zero frequencies are rejected by default; explicitly excluding them reports lost mode weight per input cell without renormalizing remaining modes, reducing the approximation’s high-temperature limit accordingly. Existing thermal-property `num_modes`, `num_integrated_modes`, frequency cutoffs and Γ-acoustic exclusions are retained and explained. Mode subsets with `band_index` do not infer a complete-cell 3n limit from natom.

The Einstein model has 3n equal-frequency modes with exponentially suppressed low-temperature excitation. The 3D Debye model uses `g(ν)∝ν²` and at low temperature satisfies

`Cv≈(12π⁴/5)nR(T/θD)³`。

Doubling T in one asymptotic regime increases Cv ≈8-fold. Both models approach 3nR at high T. Do not generalize this T³ law to arbitrary dimensions/excitations. This is fixed-volume harmonic contribution, without static electronic energy, magnetic free energy, Cp, expansion, QHA optimization, or conductivity.

Files follow the safe Phonopy-import limits: no YAML alias expansion, cycles or nonfinite values, and at most 8 MiB per input. Thermodynamic temperatures range 0–10000 K with at most 501 points; meshes allow 2000 irreducible q points and 60000 mode entries, DOS 20000 rows. Excess cumulative work prompts smaller data or fewer temperatures instead of silent truncation.

## 5. Material research records

Reproducible analysis combines material/phase, raw files, coordinates/units, assumptions, parameters, results, explanations. Records retain actions, full inputs/results, version, time, notes; material names do not certify data authenticity.

1. Complete a computation and check its units, model scope and warnings.
2. Open material research records, create or select a project, and add the latest calculation.
3. State question, material/phase, parameter sources, and interpretation; save project/progress.
4. Export project JSON as an independent backup; later import a new copy to restore calculation records and supported exercise progress.
5. Keep older records when recalculating with a current version. Edit input JSON to create a new record with new parameters/version, comparing results without overwriting historical evidence.

Projects stay in this browser's database, not auto-uploaded/published to GitHub. Clearing data or changing browser/device does not preserve them; export backups. Limits:32 MiB,40 calculations; failure to persist prompts export. Exports are restorable projects, not guaranteed identical cross-version execution-environment archives.

## Methodological basis

- [Phonopy: dynamical-matrix phases and thermodynamic formulas](https://phonopy.github.io/phonopy/formulation.html)
- [Phonopy: output files/mesh weights](https://phonopy.github.io/phonopy/output-files.html)
- [Phonopy: thermodynamic units, frequency cutoffs and mesh convergence](https://phonopy.github.io/phonopy/setting-tags.html#thermal-properties-related-tags)
- [spglib: symmetry data and operation conventions](https://spglib.readthedocs.io/en/stable/dataset.html)
- [ISODISTORT: distortion modes/parent–subgroup relations](https://iso.byu.edu/isodistorthelp.php)
- [Elcoro et al.: double crystallographic groups and Bilbao representation tools](https://arxiv.org/abs/1706.09272)

Lessons, stepped exercises, and teaching models are original to this project. Sources establish methods and formats, not full ports of these tools into this module.
