# One- phonon   dynamic structure factor

This page moves from “which phonons exist” to “which phonons are visible at a given momentum and temperature.” The model is an ideal one-dimensional longitudinal harmonic chain with atoms A and B per primitive cell, solved entirely in browser Python/NumPy. It supports two spring constants, unequal masses, signed coherent weights, basis positions, scattering directions and finite temperature. Results are relative one-phonon intensities, not fitted spectra of any actual material.

## Force constants, masses, and energies

 primitive cell  length a, equilibrium τA=0, τB=sa. Intracell  primitive cell  K1 joins A_l/B_l; intercell  primitive cell  K2 joins B_l/A_(l+1). Potential energy:

`V = ½Σ_l [K1(u_lB−u_lA)² + K2(u_(l+1)A−u_lB)²]`。

All displacements follow the chain axis. a and displacements use Å, masses use amu and K uses eV/Å². Changing s moves only the equilibrium basis and scattering phases; K1 and K2 remain specified parameters and are not re-estimated automatically from bond lengths.

Use the primitive-cell periodic gauge

`u_lκ ∝ eκ(q) exp(i q l a) / √mκ`，`Σκ |eκ|²=1`。

 dynamical matrix  is

```
D_AA=(K1+K2)/mA
D_BB=(K1+K2)/mB
D_AB=−[K1+K2 exp(−iqa)]/√(mA mB)
D_BA=D_AB*
```

After finding the two eigenvalues λ of D, phonon energies are `εν=64.654151…√λν meV`. Frequency in THz, angular frequency in rad/s and energy in meV are not interchangeable. The check is

`λ± = [t ± √(t²−4d)]/2`，

`t=(K1+K2)(1/mA+1/mB)`，

`d=4K1K2 sin²(qa/2)/(mA mB)`。

At Γ the acoustic eigenvector is proportional to `(√mA,√mB)`, giving equal-amplitude, in-phase physical displacements; the optical energy is `64.654151…√t meV`. For mA=mB=m and K1=K2=K, the two branches are a monatomic chain folded into a doubled cell: `εac=2C√(K/m)|sin(qa/4)|`, `εop=2C√(K/m)|cos(qa/4)|`.

## Full Q, reduced q, and scattering amplitude

The input Q is a signed scan coordinate in Å⁻¹; θ is the angle between its positive direction and the chain axis. The axial projection is `Q∥=Q cosθ`. Phonon momentum is `q=Q∥ mod 2π/a`, folded into `[−π/a,π/a)`. Changing θ changes both reduced q and the longitudinal projection, rather than merely rotating an intensity factor independent of dispersion.

For phonon-creation amplitudes this program uses

`Aν(Q)=Q∥ Σκ bκ exp(iQ∥τκ) eκ(q)* / √mκ`。

bκ is a signed relative coherent amplitude, not probability; sum complex atomic amplitudes before squaring the modulus. It models contrast, not automatically real-isotope neutron lengths, magnetic scattering, or Q-dependent X-ray form factors.

The bare integrated one-phonon weight is

`Wν=(2.09007964… meV Å²) |Aν|² / εν`。

This constant comes from `ℏ²/(2 amu)`. With this page's relative-b convention, W is dimensionless. Unit-area energy broadening gives spectral density in meV⁻¹. Overall cross-section constants, probe kinematic factors, and Debye–Waller factors are omitted.

Compare Phonopy's common atomic-position phase convention: set `e_cell=exp(iqτ)e_atom`, rewriting the same amplitude `Σ b exp[i(Q∥−q)τ]e_atom* /√m`. Phases/eigenvectors must transform together; adding τ only in  dynamical matrix  or changing scattering phases alone gives false extinction. Adjacent- reciprocal lattice  extinction exchange tests the easily missed conjugation.

For equal masses, equal springs, s=1/2 and equal b, `Q=q+G_n`. The acoustic amplitude contains `1+(−1)^n`, and the optical amplitude `1−(−1)^n`. Neighboring zones can therefore have identical phonon energies but exchanged bright and dark branches; no vibrational mode has been removed.

Overall eigenvector phases do not affect spectra. At exact two-branch degeneracy, the program sums squared amplitudes over the full subspace at the common energy, avoiding observable dependence on arbitrary eigenvector bases. Individual exported eigenvectors are not unique there.

## Temperature, energy sign, and resolution

`nν=1/[exp(εν/kBT)−1]`，`kB=0.08617333262145 meV/K`。

- Stokes: the probe loses energy and creates a phonon, centered at `+εν` with weight `Wν(nν+1)`.
- Anti-Stokes: the probe gains energy and annihilates a phonon; centered at `−εν` with weight `Wνnν`.
- At `T=0`, anti-Stokes weight vanishes; zero-point creation remains.
- The real force constants and scattering weights obey time-reversal relations, so the two processes at the same Q have equal bare weights and their weight ratio is `exp(−εν/kBT)`.

Gaussian broadening is `exp[−(E−E0)²/(2σ²)]/(√(2π)σ)`. σ is the standard deviation; FWHM is `2√(2ln2)σ`. It is a specified energy resolution, not a lifetime calculated from anharmonicity. Full-axis area equals the corresponding weight; finite-window area is checked by analytic erf integration.

Check detailed balance only for unbroadened single-mode weights. Overlapping peaks and Gaussian tails across zero mean broadened points need not obey the simple ratio; negative-energy Stokes tails are not finite-temperature occupations.

## Zero frequency and one-dimensional scope

The q=0 acoustic mode is rigid translation and cannot be inserted directly into an inelastic formula containing `1/εν`. All `εν<energyCutoff` modes are excluded from spectra but retain their dispersion and eigenvectors, with reasons listed in tables. The cutoff is not a material gap; Gaussian broadening is not used to fabricate an elastic peak.

Long-wave thermal fluctuations complicate positional order/Debye–Waller treatment of infinite 1D chains. This is a one- phonon  kinematic teaching model with finite Q mesh/low-energy cutoff, without Debye–Waller, elastic scattering, multi- phonon  processes, decay, or 3D materials. Near nonzero  reciprocal lattice  vectors, acoustic weight is cutoff sensitive; keep cutoffs fixed across presets. View excluded counts at Q points and current-point flags.

## Data and interface contract

Entry: `dynamic_scattering_lab.calculate(payload)`. Only declared numeric and choice parameters are accepted; unknown fields, nonfinite values, booleans in place of numbers, and reversed scan windows cause errors.

| Input | Default | Range |
| --- | ---: | --- |
| lattice | 4 Å | 1–10 |
| massA / massB | 23 / 35.45 amu | 1–250 |
| springIntra / springInter | 2 / 2 eV/Å² | 0.02–20 |
| basisFraction | 0.5 | 0.05–0.95 |
| scatterA / scatterB | 1 / 1 | −20–20, signed relative amplitudes |
| angle | 0° | 0–180 |
| selectedQ | 1.8 Å⁻¹ | −8–8 |
| temperature | 100 K | 0–1500 |
| sigma | 0.5 meV | 0.05–8, standard deviation |
| qMin / qMax | 0 / 4 Å⁻¹ | −8–8, max>min, scanning full Q |
| qPoints | 81 | Integer 31–121 |
| energyMin / energyMax | −50 / 50 meV | −250–250，max>min |
| energyPoints | 401 | Integer 101–401 |
| energyCutoff | 0.25 meV | 0.001–2 |
| channel | both | both / stokes / antiStokes |

Results include `summary`, `plots`, `tables`, `warnings`, `checks`, `heatmap`, and full `data`. `heatmap.z` is a raw linear-intensity array: `y` energy rows, `x` full-Q columns. A log1p display helps large ranges without changing raw data. `data.selection` holds both selected-Q channels and full matrix elements.

`checks.passed` verifies dynamical residuals, orthogonality, the amplitude closure sum rule, detailed balance and finite nonnegative data. `gridResolved` separately checks `ΔE≤σ/2`; this does not establish applicability to real materials. Scan plots do not convolve Q resolution, and a finite Q grid can miss narrow momentum structures.

## Connecting with Phonopy imports

This version does not accept Phonopy scattering inputs. The importer retains all q frequencies but full complex vectors only for one selected mode, insufficient for full Q spectra. Inspect real files there first, but do not infer other vectors from one-mode animations/frequency curves.

Real-data calculations next require at least the primitive lattice with explicit Å units, masses, fractional coordinates, complete normalized q-point eigenvectors, frequency units, matching of Q−q to reciprocal vectors, scattering amplitudes or form factors, and appropriate Debye–Waller treatment. Conventional-cell and primitive-cell data must not be mixed.

## Validation and provenance

`python scripts/test-python-dynamic-scattering.py` checks analytic dispersion, acoustic translation/mass normalization, folded monatomic limits, adjacent-zone extinction, gauges, degenerate unitary changes, amplitude closure, detailed balance, zero T, transverse projections, zero-frequency exclusion, Gaussian area, heatmap orientation, and strict JSON.

Phases and the one-phonon formula follow [Phonopy dynamic structure factors](https://phonopy.github.io/phonopy/dynamic-structure-factor.html) and [dynamical-matrix conventions](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix). Phonon-method background follows [the open paper by Togo, Chaput, Tadano and Tanaka](https://arxiv.org/abs/2301.05784). This page’s diatomic-chain derivations, code and teaching data are independent implementations and do not use experimental or material-calculation data from the paper.
