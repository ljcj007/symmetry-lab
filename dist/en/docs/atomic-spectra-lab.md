# Multiplet spectra and polarization selection rules

This module connects local many-electron levels to calculable  electric dipole  absorption strengths. An original Python/NumPy implementation supports two small complete configurations:

| Initial state | Initial dimension | 2p→3d final state | Final dimension |
| --- | ---: | --- | ---: |
| p⁶d⁸ | 45 | p⁵d⁹ | 60 |
| p⁶d⁹ | 10 | p⁵d¹⁰ | 6 |

These dimensions include all spin-orbital occupations; an arbitrary eigenstate is not substituted for a degenerate space. The calculation uses a single-ion atomic approximation, with NiO and Cu²⁺ as configuration context only. It includes neither ligand charge transfer, crystalline magnetic order, RIXS, nor absolute absorption cross sections; presets are not fitted material parameters.

## Interactions and coordinates

All angular-momentum operators use ℏ=1. The internal 3d spherical-harmonic basis is ordered by m=−2,…,2, with spin ↑,↓ for each m; 2p follows with m=−1,0,1. Crystal fields and displayed occupancies use the real orbitals xy, yz, xz, x²−y² and 3z²−r², mapped exactly into the same spherical-harmonic basis by a unitary transformation.

The full 3d Coulomb term uses Slater F⁰,F²,F⁴; direct p–d interactions use F⁰,F² and exchange uses G¹,G³. Angular matrix elements are constructed from the Racah factorial formula for small-integer Wigner 3j symbols and antisymmetrized over fermion determinants. The full Coulomb interaction is not reduced again to one uniform J.

Valence- and core-shell SOC are single-electron Σl·s. A z field uses electron Zeeman energy +μB B(Lz+2Sz) and moment −μB(L+2S). p–p interactions in p⁶ or p⁵ change only a common configuration constant, absorbed into the independently uncalibrated edge reference.

The cubic crystal field is (−0.4,−0.4,−0.4,0.6,0.6)×tenDq. The additional axial term is (0,−0.5,−0.5,1,0)×tetragonal; both keep the orbital barycenter at zero. The axial term is an explicitly defined teaching potential, not a crystal-field parameter automatically extracted from an arbitrary distorted structure.

Initial and final states share radial Slater integrals and valence-shell SOC; core-hole radial relaxation is not separately fitted. U/J in the older `local_multiplet_lab` does not map term by term to this page's Slater inputs. With SOC, S and L are generally not good quantum numbers. The interface returns ⟨S²⟩ and ⟨L²⟩ in energy-degenerate spaces, not automatically identified atomic LS-term labels.

## Polarization, temperature, and spectral weight

The dipole operator is Dε=Σ〈2m|ε·r̂|1m′〉d†_(mσ)p_(m′σ). The radial dipole integral is set to 1.

- `x`, `y`, `z`: three linear-polarization components in crystal coordinates, each allowing a perpendicular propagation direction.
- `plus`, `minus`: (x±iy)/√2, with propagation fixed along z.
- `linear`: cosθ x+sinθ z; θ=`polarizationAngle`, with propagation along y allowed.
- `xmcd`：Iplus−Iminus；`xld`：Iz−Ix；`isotropic`：(Ix+Iy+Iz)/3。

In general, complex transition amplitudes must be added before squaring; spectra for different polarizations cannot simply be averaged. In zero-field thermal equilibrium, circular dichroism cancels between time-reversed states. A single-ion model in an applied field is not real NiO antiferromagnetic order.

Initial states have Boltzmann weights. Degeneracy grouping uses absolute tolerance 10⁻⁸ eV; every temperature uses group-mean energies and equal within-group weights, preventing low-temperature amplification of roundoff splitting. Underflow of T=0 or kBT uses the equal-weight ground-subspace limit. `ground` is that subspace's trace average, whereas `thermal` is the input-temperature thermal average; do not confuse them.

The spectrum uses unit-area Lorentzians; `width=Γ` is the half width at half maximum (HWHM), and FWHM=2Γ. Raw line intensities are not individually normalized, so changing polarization preserves physical relative weights. `transitions` contains energy-group transitions with intensity above 10⁻¹², sorted by decreasing intensity; the full spectrum retains all eigenstates and matrix elements and is not truncated to this displayed table.

## Energy reference and numerical checks

The horizontal axis is defined as

`Erel = (Ef − Tr(Hf)/dim(Hf)) − (Ei − Ei,min)`。

The final-configuration barycenter is recalibrated after every parameter change, so absolute core binding energies and chemical shifts are not provided. The common configuration shift caused by F⁰ cancels in these relative coordinates, but F²/F⁴ and anisotropic p–d terms still change multiplets, wavefunctions and spectra.

For unit radial integral and the complete p→d final-state space, infinite-window integrals summed over three orthogonal polarizations equal `(2/5)(10−n)`: 0.8 for d⁸ and 0.4 for d⁹. Divide by 3 for the isotropic average. This constant checks completeness in each calculation; it is not an absolute experimental cross section.

`checks` reports Hamiltonian  Hermitian , eigenstate residuals, dipole completeness, total weight, population normalization, and summed occupations. Analytic arctan finite-window integrals are checked against trapezoidal integration. `gridResolved` only checks energy step ≤Γ/3, diagnosing peak sampling rather than the Hamiltonian's physical approximation accuracy.

## Input ranges

| Parameter | Default | Allowed range / unit |
| --- | ---: | --- |
| configuration | d8 | d8 / d9 |
| tenDq | 1 | 0–5 eV |
| tetragonal | 0 | −3–3 eV |
| F0 / F2 / F4 | 4 / 10 / 6 | 0–20 / 0–20 / 0–15 eV |
| pdF0 / pdF2 | 6 / 6 | 0–25 / 0–15 eV |
| pdG1 / pdG3 | 4 / 2.5 | 0–12 / 0–10 eV |
| socD / socP | 0.08 / 11.5 | 0–1 / 0–20 eV |
| fieldTesla | 0 | −30–30 T, along z |
| temperature | 300 | 0–2000 K |
| polarization | x | x / y / z / plus / minus / linear |
| polarizationAngle | 45 | 0–180° |
| width | 0.35 | 0.02–3 eV，HWHM |
| energyMin / energyMax | −15 / 25 | −60–40 / −40–70 eV，max>min |
| samples | 401 | Integer 101–601 |

## Cross-module assignments

`multiplet-xas` first records the old Kanamori d⁸ model, then compares x/z polarization at identical Slater/SOC and axial  crystal field . Stages two and three change polarization only and retain full inputs/outputs. Distinguish level changes from model changes, weight changes from polarization at fixed model, and relative edges from absolute experimental energies.

## Independent verification

`python scripts/test-python-atomic-spectra.py` includes:

- Compare integer 3j with independent SymPy; dipole parity and magnetic-quantum-number  selection rule .
- Analytical energies, degeneracies and L²/S² of free-ion d² terms ³F, ³P, ¹D, ¹G and ¹S; the d²–d⁸ hole correspondence.
- Total orbital/spin rotation invariance of every d–d and p–d Slater operator; F⁰ electron-pair counting.
- p/d single-hole SOC signs and degeneracies; L₃/L₂=2:1 of the noninteracting d⁹ limit.
- Complete dipole-strength sum rules over all initial states; cubic isotropy, axial linear dichroism, magnetic-field reversal and exchange of circular polarizations.
- Temperature, nonnegative spectra, invariance to the F⁰ energy reference, finite-window integration, and parameter validation.

Formula and scope references: [Quanty polarized-XAS tutorial](https://www.quanty.org/documentation/tutorials/small_programs_a_quick_start/xas), [p–d interactions and NiO atomic approximation](https://www.quanty.org/documentation/tutorials/nio_crystal_field/xas_l23), [complete d-shell ground state](https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate). Code and teaching data are independently implemented, without copying those programs or experimental data.
