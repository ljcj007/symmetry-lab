# How do atomic amplitudes become a spectral line?

Open the optional replay in the diatomic-chain and coherent-phase lessons under Inelastic scattering and dynamic structure factors. Classroom examples are explicitly marked as references; copying an example still requires manual calculation. The calculator can include the atomic-amplitude derivation in the same calculation. Opening a returned replay does not solve the phonons again.

## Fix the momentum and coordinate convention first

The input Q is the full scattering coordinate, with chain-axis projection Q∥=Q cosθ. The phonon wavevector q is folded into [−π/a,π/a), with Q∥=q+nG and G=2π/a. Changing reciprocal zone n can preserve q and phonon energies while changing atomic phases and intensity. Changing the angle can also change q, so it cannot be interpreted solely as an intensity projection.

This model uses cell-periodic eigenvectors: u_lκ is proportional to eκ(q) exp(iqla)/√mκ. The atom order is A, B, at equilibrium positions 0, sa, and each eigenvector satisfies Σκ|eκ|²=1. The coefficients e are mass normalized; e/√m gives relative physical displacement. No absolute displacement amplitude, displacement unit or thermal snapshot is assigned.

## Build the complex amplitude factor by factor

For creation of a phonon in branch ν, atom κ contributes aκ=Q∥ bκ exp(iQ∥τκ) eκν(q)*/√mκ. The replay lists the eigenvector, mass divisor, complex conjugation, structural phase and signed scattering weight separately. Its complex-plane arrows depict these returned complex numbers, not real-space atomic trajectories.

Coherent scattering adds amplitudes first, Aν=aA+aB, and then takes |Aν|². Adding |aA|²+|aB|² directly discards the interference term 2 Re(aA aB*). A negative interference term can cancel positive individual contributions. A dark branch does not mean that its phonon has disappeared.

In the folded chain with equal masses and springs, s=1/2 and bA=bB, the even- and odd-zone references exchange bright and dark branches. Their full Q values differ, as does the longitudinal prefactor Q∥². Compare |A|²/Q∥² or the complete factor ledger to isolate phase selection. This ratio is left undefined at Q∥=0; no division by zero is performed.

## From amplitude to inelastic spectral weight

For a retained energy εν, the bare weight is Wν=C|Aν|²/εν, with C=ℏ²/(2 amu) converted using this tool’s Å and meV convention. Stokes creation multiplies by nν+1, while anti-Stokes annihilation multiplies by nν. Gaussian broadening distributes these integrated weights over the energy axis. Its width is not a calculated phonon lifetime.

A Gamma acoustic mode can have well-defined relative displacements and atomic amplitudes while having zero energy. The replay retains that ledger and preserves the original low-energy cutoff: excluded modes are not divided by εν, are not assigned a Bose occupation, and do not generate inelastic peaks. The cutoff is not a material gap and does not constitute an elastic-scattering calculation.

## Common phase, relative phase and degeneracy

Multiplying every eigenvector coefficient of one mode by exp(iφ) multiplies its scattering amplitude by exp(−iφ), leaving |A|² unchanged. Changing only one atom’s phase usually changes relative displacement, but can be equivalent to a common phase if the eigenvector occupies only one atom. The replay reports the normalized-state overlap magnitude squared and the eigen-equation residual, separately checking common-phase equivalence and whether the vector remains an eigenmode of the original matrix. It does not interpret this counterexample as a new spectrum. A change of atomic-coordinate phase convention likewise requires transforming both eigenvectors and scattering phases.

The numerical common-phase test uses |1−|⟨e|e′⟩|²|≤10⁻¹². Passing it means that the states are close to the same ray within this tolerance; it does not prove that a component is exactly zero or that the states are mathematically identical.

At exact two-branch degeneracy, the chosen eigenvectors may be mixed unitarily. Individual branch amplitudes and strengths depend on that basis; compare Σν|Aν|² over the complete degenerate subspace. The original spectrum groups energies within 10⁻⁸ meV. The replay also reports the group energy spread and shows mixing only when that spread is at most 64 machine eps times max(1, maximum energy), with the mixed eigen-equation residual. Numerical grouping alone does not prove exact degeneracy. Nondegenerate branches cannot be arbitrarily mixed and still be called eigenmodes of the original dynamical matrix.

## Computational and teaching scope

The input includeAmplitudeReplay=true adds the derivation for the selected full Q under data.amplitudeReplay. Omitting it or setting it to false preserves the original result. It does not duplicate the replay for every heatmap point, and opening the panel does not change the calculation. Original inputs, spectra, exports and records remain associated with their own calculation.

This remains an ideal one-dimensional longitudinal harmonic chain, with signed relative constants b. It does not import complete Phonopy scattering data for a real material, and it does not add Debye–Waller factors, magnetic scattering, multiphonon processes or fitted cross sections. The existing ZnO import example inspects supplied phonon data; it does not automatically supply scattering input to this model.

## Method sources and local derivation

- [Phonopy dynamic structure factor](https://phonopy.github.io/phonopy/dynamic-structure-factor.html): coherent one-phonon amplitudes, occupation factors and degenerate-strength sums.

- [Phonopy dynamical matrix](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix): mass normalization and phase conventions.

The diatomic chain, atomic interference decomposition and reference examples are derived independently for this site. Align eigenvector phases, momentum units and spectral-weight definitions before comparing external programs. General formulas in documentation do not replace numerical verification or establish measured learning outcomes.

## Apply coherent sums to supplied Phonopy modes

After learning atomic coherent addition here, use the [Phonopy three-dimensional neutron-scattering tool](phonopy-scattering.md) with complete supplied modes. Three-dimensional projections, primitive phases and physical probe lengths are declared separately there; this diatomic-chain input and replay do not automatically become material data.

## From replay to quantitative correction

To test whether you can construct amplitudes yourself, continue to the [source-bound two-point workshop](phonopy-derivation.md). It uses two three-dimensional Q values for the same mode in supplied ZnO files and explicitly restores the Phonopy atom-phase convention; the one-dimensional cell-periodic vectors and parameters on this page cannot be mixed directly with it.
