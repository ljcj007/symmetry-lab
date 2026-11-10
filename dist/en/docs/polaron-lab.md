# Electron–phonon coupling and polaron teaching experiment

This original implementation solves a two-site quantum Holstein model at fixed one electron and spin component. Its NumPy-only Python core runs in a browser Worker shared with lessons. The interface displays actual Python results, not separately fabricated illustrations.

## Hamiltonian/units

Use sites 0 and 1 with two independent local harmonic oscillators:

\[
H=-t(c_0^\dagger c_1+c_1^\dagger c_0)
+\frac{\Delta}{2}(n_0-n_1)
+W\sum_{i=0}^1 b_i^\dagger b_i
+g\sum_{i=0}^1n_i(b_i+b_i^\dagger),\qquad W=\hbar\omega.
\]

- `hopping` is (t), 0–3 eV.
- `phononEnergy` is (W=\hbar\omega),0.2–3 eV, not THz input.
- `coupling` is (g), 0–3 eV, not a dimensionless coupling constant.
- `siteBias` is (Delta=\varepsilon_0-\varepsilon_1), −4 to 4 eV; the first site's potential is (+\Delta/2).
- `cutoff` is each oscillator's maximum  phonon  number, integer 2–10.
- `scanMaxCoupling` is the scan upper bound, 0–3 eV; `scanPoints` is 1–9, with 1 retaining only the current input (g).

The two oscillators' total zero-point energy (W) is omitted, changing only the energy reference, not removing zero-point coordinate fluctuations. Displacements (X_i=b_i+b_i^\dagger) are dimensionless. No oscillator mass/length scale is input, so no Å values are returned. Positive (g) shifts the occupied oscillator's mean (X) negative.

Local site-energy coupling leaves hopping t independent of oscillators; it is neither SSH bond coupling nor self-consistent relaxation. No electron repulsion, thermal averaging, drive, material fitting, or Phonopy-derived electron– phonon  matrix elements.

## Basis, degeneracy and observables

The fixed basis order is (|i,n_0,n_1\rangle): electron site, oscillator 0, oscillator 1. Each oscillator has (N_{max}+1) number states, giving dimension (2(N_{max}+1)^2). The truncated real symmetric matrix is fully diagonalized.

States within (10^{-9}) eV of the lowest energy form the equally weighted ground subspace, avoiding arbitrary localization at exact (t=0,\Delta=0). True smaller splittings are unresolved too.

Outputs:

- Electron densities, mean phonon numbers, and mean displacements.
- Full  phonon -number distributions per oscillator.
- Joint correlations (C_{ij}=\langle n_iX_j\rangle).
- Conditional displacement (C_{ij}/\langle n_i\rangle); returns `null` for denominators below (10^{-12}).
- Reduced electron  density matrix , purity, bond coherence (2\operatorname{Re}\rho_{01}).
- Hopping, phonon, coupling and potential contributions to ground energy, and distinct energy groups.

Reduced electronic purity directly diagnoses bipartite entanglement only for a globally pure state. Equal mixing of degenerate ground states can create classical mixing, so low purity need not mean entanglement. Uniform density can coexist with nontrivial conditional phonon clouds. Two sites do not establish macroscopic self-trapping transitions or a polaron radius.

##  phonon -cutoff diagnostics

Every calculation also solves at (N_{max}+1); the highest comparison cutoff is 11, giving maximum matrix dimension 288. Compare:

1. Ground energy changes by less than (10^{-4}) eV.
2. Maximum changes in density,  phonon  occupations, and joint correlations all <0.01.
3. In the current truncation, the highest-phonon-level probability of each oscillator is below (10^{-3}).

Only if every condition holds is `convergence.converged` set to `true`. This is a local adjacent-cutoff diagnostic, not a rigorous error bound. Large (g/W) can show “not converged” despite successful calculation, retaining diagnostics and raw data.

`checks.passed` checks  Hermitian , eigen residuals, probabilities,  density matrix , and energy-component consistency, separate from  phonon -cutoff `converged`. Coupling scans retain current cutoff and report highest-layer probability at each point; neighboring-cutoff conclusions at one point do not automatically apply elsewhere.

## Benchmarks and tests

Validation script: `python scripts/test-python-polaron.py`.

Checks include direct occupation-basis construction, (g=0) full spectra, displaced atomic oscillators/Poisson  phonon , site exchange, degenerate averages, Hellmann–Feynman derivatives, variational cutoff monotonicity, energy scaling, strong-coupling warnings, finite JSON, and invalid inputs. All six presets run real cores; three lessons/twelve exercise steps have closed references.

Presets and material names denote teaching models or material-mechanism background, not quantitative fitted predictions. The two-site electron–phonon model and single-band Hubbard model may compare hopping scales, but their Hilbert spaces and interactions differ, so equal parameters or one-to-one state correspondences cannot be assumed automatically.

## Primary references

- T. Holstein,[Studies of polaron motion: Part I. The molecular-crystal model](https://doi.org/10.1016/0003-4916(59)90002-8), Annals of Physics8,325–342(1959): vibrational modulation of local energies.
- T. Holstein, [Studies of polaron motion: Part II. The small polaron](https://doi.org/10.1016/0003-4916(59)90003-X), Annals of Physics 8, 343–389 (1959): local displaced oscillators and the small-hopping limit.
- H. Lee et al., [Electron-phonon physics from first principles using the EPW code](https://arxiv.org/abs/2302.08085) (2023): a scope comparison with real-material electron–phonon calculations; EPW is not ported here.
