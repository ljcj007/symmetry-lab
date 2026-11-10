# Magnetic resonance and effective spins

Finite-dimensional diagonalization for one effective electronic/at most one nuclear spin connects levels, field direction, microwave dipole  selection rule , and thermal frequency absorption. Only NumPy is required, running in browser Python.

## Model and coordinates

`S=1/2,1,3/2,2,5/2`; `I=0,1/2,1,3/2,2,5/2`. Dimension `(2S+1)(2I+1)`, maximum 36.

Common crystal principal axes define diagonal g `(gX,gY,gZ)`, D/E, and hyperfine `(A⊥,A⊥,A∥)`. These explicit restricted parameters do not support three arbitrarily relatively rotated tensors.

```
H/h = (μB/h) B·g·S
      + D [Sz² − S(S+1)/3] + E (Sx² − Sy²)
      + A⊥ (SxIx + SyIy) + A∥ SzIz − γN B·I.
```

Spin operators use ħ=1; H/h, D/E and A use GHz, and B uses T. Nuclear gyromagnetic ratio γN is signed GHz/T, with an explicit minus sign in the nuclear Zeeman term. μB/h uses the rounded value 13.996245 GHz/T; kB/h follows exact SI definitions, approximately 20.836619123 GHz/K. This module uses ordinary rather than angular frequency.

`theta` is measured from crystal z and `phi` is the xy azimuth, both in degrees:

```
n = (sinθ cosφ, sinθ sinφ, cosθ)
eθ = (cosθ cosφ, cosθ sinφ, −sinθ)
eφ = (−sinφ, cosφ, 0).
```

Microwave linear polarizations `theta=eθ`, `phi=eφ`, `parallel=n`; first two perpendicular to static B. At B=0, theta/phi still select microwave directions, not a preferred zero-field static axis. Drive includes electronic `M=Σa e₁,a ga Sa` only, not direct NMR.

## Thermal populations, degeneracy and absorption

`eigh` obtains all H eigenstates. Levels within `1e−9 GHz` form one energy subspace. At T>0, Boltzmann occupations use mean subspace energies with equal weights internally, preventing tiny floating errors from becoming spurious low-T splittings. T=0 uniformly populates the full ground space. Transitions are between subspaces; `from`,`to` index `selection.groups`.

```
strength_AB = Σ(i∈A,f∈B) |<f|M|i>|²
weight_AB = (pA_per_state − pB_per_state) strength_AB
ν_AB = E_B − E_A > 0.
```

`strength` is the matrix-element trace sum between degenerate subspaces, not intensity of an arbitrary eigenvector. `populationDifference` is per-state occupation difference. Subspace sums preserve lines under equal-energy rotations. Zero-frequency degenerate transitions are not finite absorption; total squared elements below `1e−14` are numerical zero.

Each line is broadened by a Lorentzian normalized to unit area on the positive frequency axis:

```
L+(ν;ν0,γ) = [γ / (π((ν−ν0)²+γ²))] / [1/2 + atan(ν0/γ)/π], ν≥0.
```

`lineWidth=γ` is HWHM in GHz. Spectra are not normalized to equal maximum height, retaining temperature-dependent net absorption weights. This is teaching broadening for positive-frequency absorption, not full complex susceptibility or negative-frequency response. Units are relative electronic magnetic-dipole weight (common μB² omitted) per GHz, not calibrated power or field-modulated derivative spectra.

Analytic window area is compared independently with trapezoid integration;≥2% relative difference prompts refinement. Capturing<80% total prompts wider windows. This checks line sampling, not effective-H approximation accuracy.

## Field scans and analytical limits

Fields scan uniformly from 0 to `fieldMax` at fixed theta/phi and other parameters. `fieldScan.energies` gives sorted H/h eigenvalues at each point. The energy centroid is zero; the minimum is not reset at every field. Curve indices indicate energy order and need not track the same adiabatic eigenstate near crossings.

Pure Zeeman S=1/2/I=0 limits satisfy

```
ν = (μB/h) B g_eff,
g_eff = sqrt(gX² nx² + gY² ny² + gZ² nz²).
```

`selection.effectiveG` always denotes this geometric combination only; with additional interactions it must not replace the full energy gap. For isotropic g and pure Zeeman coupling, a parallel drive commutes with H and has zero finite-frequency absorption; do not automatically extend that rule to anisotropic or mixed-spin models.

For S=1,B=0, zero-field energies are `−2D/3, D/3−E, D/3+E`. Quadratic zero-field operators vanish for S=1/2. For S=I=1/2, isotropic A,B=0, a singlet at `−3A/4` and triplet at `A/4` provide independent analytic checks.

## Input ranges

|Parameter|Range/options|Units|
|---|---|---|
| spin / nuclearSpin | Integer and half-integer sets above | Dimensionless |
| gX / gY / gZ | 0.2…5 | Dimensionless |
| zeroFieldD / zeroFieldE | −30…30 | GHz |
| hyperfinePerp / hyperfineParallel | −3…3 | GHz |
| nuclearGamma | −0.1…0.1 | GHz/T |
| field / fieldMax | 0…3 / 0.001…3 | T |
| theta / phi | 0…180 / 0…360 | degree |
| polarization | theta / phi / parallel | — |
| temperature | 0…500 | K |
| lineWidth | 0.001…2 | GHz HWHM |
|frequencyMin/frequencyMax|0…100/0.001…100, end>start|GHz|
| frequencyPoints / fieldPoints | Integers 41…501 / 11…121 | — |

Unsupported parameters cause explicit errors; SOC, powder, pulse, or relaxation requests are not silently ignored.

## Lessons/cross-module projects

Three units cover direction-dependent Zeeman resonance, zero-field/hyperfine interactions and populations/polarization/sampling, with three four-step exercises. Seven presets supply analytical benchmarks, g-tensor rotations, S=1 D/E comparisons, electron–nuclear coupling and longitudinal dark states.

The “local many-electron state → effective spin → resonance” project first runs `multiplet-d8-nio` to confirm S=1 in that approximation, then compares `resonance-spin1-isotropic` and `resonance-spin1`, changing only D/E. g=2,D=2.87 GHz,E=0.15 GHz are separate teaching inputs, not fits to NiO or a defect center. Ground S alone cannot determine g/D/E; microscopic derivation also needs SOC, projection, and low-energy-subspace assumptions.

## Validation and scope

`python scripts/test-python-spin-resonance.py` checks angular-momentum  commutation relations , anisotropic frequencies/elements, Boltzmann doublets, zero-field S=1, Breit–Rabi, Kramers degeneracy, degenerate  spatial rotation  invariance, positive-area lines, undersampling, and maximum 36D space.

This version excludes multiple nuclei, multielectron effective-spin centers, nuclear quadrupole terms, higher-order spin crystal fields, powder averages, saturation, relaxation, pulses and optical pumping; parameters are not fitted automatically from structures. The core is an original NumPy implementation rather than a call to or complete port of EasySpin.

Theory/experimental conventions: [EasySpin Spin Hamiltonian](https://www.easyspin.org/documentation/hamiltonian.html) and [EasySpin pepper](https://www.easyspin.org/documentation/pepper.html).
