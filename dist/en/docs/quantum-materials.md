# Orbitals, quantum geometry and electronic transport

These topics reuse the seven classroom routes, computation center, atlas, and records. Scientific computation runs in browser Python Workers; uploaded data are not sent to a computing server. Body text remains 18px.

##  crystal field /orbitals

Open: [lessons](../#classroom/spin?module=orbitals) · [calculator](../#compute/crystal-field-lab).

In a ten-dimensional basis of five real d orbitals and two spin components, compare octahedral/tetrahedral cubic fields, tetragonal parameters, and λL·S. Degenerate subspaces use averaged orbital weights; 3D angular distributions rotate to avoid presenting one arbitrary numerical eigenvector as the unique orbital.

Ideal ligands illustrate coordination. Dₛ/Dₜ are phenomenological inputs, not bond fits/structure inversions. 3D radii are normalized angular amplitudes, not true electron-density isosurfaces with radial functions. NiO supplies context; one electron does not replace many-electron  multiplet , Hund, or high/low-spin calculations.

An explicit linear E⊗e Jahn–Teller model additionally shows two adiabatic potential surfaces, radial profiles and the analytical minimum ring. It excludes higher-order lattice anisotropy, dynamics and vibrational-electronic spectra of arbitrary materials.

Detailed formulas, checks, and sources: [crystal-field methods](crystal-field-lab.md).

## Quantum geometry/topology diagnostics

Open: [lessons](../#classroom/crystal?module=geometry) · [calculator](../#compute/quantum-geometry-lab).

Beyond existing Berry-curvature, Wilson-loop, and Chern tools, new SSH/QWZ lessons center on quantum metrics. Under U(1) phase changes in a fixed orbital basis, test projector, overlap-modulus, and topological-integral invariance. Phase changes are not changes of cell or orbital embedding.

QWZ heatmaps: gₓₓ, gₓᵧ, gᵧᵧ, metric trace, Berry curvature, direct gaps; SSH:1D metric/Zak. Check analytic gaps/two meshes, no invariant at closure or definitive integers from unresolved coarse grids. Display local momentum geometry separately from full- Brillouin zone  topology.

These fixed two-band teaching models are not general programs that infer topology automatically from arbitrary real-material files, and do not provide general three-dimensional time-reversal Z₂ or full topological quantum chemistry classification.

Detailed conventions and checks: [quantum-geometry methods](quantum-geometry-lab.md).

## Electronic  transport / thermoelectric

Open: [lessons](../#classroom/observables?module=transport) · [calculator](../#compute/electron-transport-lab).

A constant scalar relaxation-time approximation integrates full-BZ energies and Cartesian group velocities for filling, σ/τ, Seebeck tensors, and open-circuit electronic κₑ/τ. 2D responses are area-normalized sheets; 3D responses are volume-normalized. Energies are eV, velocities m/s, Seebeck μV/K.

Inputs include T,μ, anisotropy, meshes; show μ scans and compare two grids at current T,μ. One-point convergence is not whole-scan convergence; low T especially needs sampling. Ill-conditioned conductivity or no thermal-window carriers leaves derived responses blank with explanation.

Structured JSON import supports complete uniformly weighted meshes and validates mesh coverage, normalized weights, energy/velocity shapes and units. High-symmetry paths, irreducible meshes without symmetry-star expansion, and energy-only data without velocities do not meet this interface. This is not a complete BoltzTraP2 port and does not Fourier-interpolate general DFT bands.

Without independent relaxation times and lattice thermal conductivity, no real-material ZT is reported. Cases discuss mechanisms and assumptions; example parameters are not material measurements.

Formats, units, checks:[electronic  transport  methods](electron-transport-lab.md).

## Exercises, records and reproduction

Each of three topics has three lessons and three four-step derivation exercises, sharing presets across lessons, cases, and calculators. Export JSON or save inputs, parameters, results, and versions in research records, then restore and rerun.

Validation covers analytic limits, matrices, gauge invariance, closures/coarse grids, full  Brillouin zone  import, routes, exercise steps, and isolation after cancellation/slow reads. Sources/manifests ship with site; references appear in three method pages/lesson footers.
