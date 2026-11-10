# Electronic transport and thermoelectricity: a constant-τ model over the full Brillouin zone

Browser NumPy computes 2D sheet  transport  or 3D bulk  transport , with anisotropic nearest-neighbor  tight-binding model  or complete uniform-BZ energy/velocity data normalized to the input cell. Results: electron filling, empty states, density, conductivity/ relaxation time , Seebeck tensor, and open-circuit electronic thermal conductivity/ relaxation time . Scalar τ (fs) yields conductivities.

It does not calculate physical scattering rates, phonon thermal conductivity, real-material ZT, magnetic-field transport, Hall/Berry terms or interband coherence. Temperature and chemical potential are independent inputs; charge neutrality and μ(T) at fixed doping are not solved automatically.

## Models and physical units

Use square/simple-cubic reference lattices, a in Å, t in eV:

`E(q)=Σᵢ2tᵢ(1−cos qᵢ)`，`vᵢ=(2tᵢ a/ℏ)sin qᵢ`，`qᵢ=2π k_fractional,i`。

In two dimensions, `tₓ=t, tᵧ=t·anisotropy`; three dimensions additionally use `t_z=t·zAnisotropy`. The band bottom is 0 and total bandwidth is `4Σtᵢ`. Lattice constants control velocities and density normalization rather than automatically changing hopping. Each input band’s spin degeneracy is counted once: set `spinDegeneracy=1` if separate spin bands are already explicit.

Defaults t=0.25 eV, tᵧ/tₓ=0.5, μ=0.3 eV, 300 K, and a 48² mesh give a smooth teaching demonstration. Low temperatures or large bandwidths require finer meshes. The model uses a full periodic BZ mesh shifted by half a grid step on every axis, without duplicate boundary points.

| Quantity | Two dimensions | Three dimensions |
|---|---|---|
| Normalization measure Ω | Area m² | Volume m³ |
| Electron/hole density | m⁻² | m⁻³ |
| σ/τ | S/s (sheet) | S/(m·s) |
| σ, after specifying τ | S (sheet) | S/m |
| κₑ/τ | W/(K·s) (sheet) | W/(m·K·s) |
| κₑ, with τ | W/K (sheet) | W/(m·K) |
| Seebeck | µV/K | µV/K |

Two-dimensional sheet coefficients do not depend on arbitrary vacuum thickness; conversion to three-dimensional units requires an explicit physical thickness. `holeDensity` counts empty states in the finite input band set and is not directly a real semiconductor’s hole-doping density. Fully occupied bands that were not imported are also absent from `fillingPerCell`.

## Transport integrals and signs

Electron charge is −e, e>0. Open-circuit Seebeck convention `E=S∇T` uses SI energy J:

`Lᵣ=(g/Ω) Σₙₖ wₖ vₙₖ vₙₖᵀ (Eₙₖ−μ)ʳ (−∂f/∂E)`。

`σ/τ=e²L₀`；`S=−L₀⁻¹L₁/(eT)`；`κₑ/τ=(L₂−L₁L₀⁻¹L₁)/T`。

κₑ is electronic thermal conductivity at zero electric current, with the thermoelectric backflow term already subtracted. Bare `L₂/T` is not this open-circuit conductivity. A constant, scalar, energy-independent τ cancels from S; this conclusion does not directly extend to energy-dependent scattering times.

The implementation uses dimensionless `x=(E−μ)/(kBT)` and computes `Jᵣ=(g/Ω)Σw vvᵀ f(1−f)xʳ`, giving `L₀=J₀/(kBT), L₁=J₁, L₂=kBT J₂`. This avoids mixing tiny powers of joule energies in matrix inversions. Using `z=exp(−|x|)` evaluates Fermi functions and derivatives stably, avoiding exponential overflow and cancellation in `1−f` for filled states.

## Complete-BZ JSON import

See the [import example](../examples/electron-transport-import.json). The outer wrapper is `{source:"import", data:{...}, temperature:300, chemicalPotential:0.3}`.

| data field | Requirement |
|---|---|
| schema | `symmetry-lab-electron-transport-1` |
| sampling | Must be `full-uniform-bz` |
| dimension | 2 or 3 |
| energyUnit / velocityUnit | Must be `eV` / `m/s` |
| cellMeasure | Input-cell area Å² or volume Å³, matching dimension |
| spinDegeneracy | 1 or 2; avoid double-counting explicitly listed spin bands |
| meshShape | dimension integers; at least 2 points per axis |
| meshShift | Per-axis offset in mesh-step units, components [0,1) |
| kPoints | `[Nk][dimension]` fractional reciprocal coordinates, each component in [0,1) |
| weights | `[Nk]`; each point has 1/Nk in this first version's full uniform mesh |
| energies | `[Nk][bands]`, with identical band counts 1..8 at every point |
| velocities | `[Nk][bands][dimension]`, velocities along orthogonal Cartesian axes, not unconverted fractional-k derivatives |

The program checks every `k_i=(index_i+shift_i)/shape_i`, a point count equal to the mesh product, unique indices, and full mesh coverage. Irreducible-BZ star weights cannot simply multiply a single representative velocity direction; velocities and symmetry copies must first be expanded onto the full mesh. High-symmetry lines, energy-only band paths, and incomplete meshes are rejected.

Input JSON ≤4 MB; mesh×band-state count ≤150000, scan points ≤101, product ≤1500 ten-thousands. Model mesh/axis:6..121 (2D),6..51 (3D); T:10..2000 K. Absolute energy ≤1000 eV, velocity components ≤10⁸ m/s. Structural mesh validation does not establish physical convergence of energies, velocities, or band windows.

## Stability and convergence

If thermal-window weight is below 10⁻¹⁴ or the conductivity matrix's minimum/maximum eigenvalue ratio is below 10⁻¹⁰, unstable S and κ return `null`; σ/τ and filling remain. Fewer than 12 effective transport states triggers a sparse-sampling warning. Thermal-conductivity covariance is theoretically positive semidefinite. Only tiny negative eigenvalues within relative rounding tolerance 10⁻⁹ are clipped; significant negatives are not reported as physical negative thermal conductivity.

Compare current μ, T on two meshes. Relative σ difference >5% or maximum S-component difference >5 µV/K prompts refinement; at the limit, compare coarser grids. This does not prove whole-scan convergence or smaller errors. Single-dataset imports explicitly lack independent mesh evidence.

## Independently verifiable limits

- In a particle–hole-symmetric half-filled nearest-neighbor model, L₁=0 and S=0.
- Tripling constant τ triples σ and κₑ; S stays unchanged.
- At fixed t, doubling the lattice constant leaves two-dimensional σ/τ unchanged and divides density by 4; in three dimensions it halves σ/τ and divides density by 8.
- A three-dimensional classical parabolic band satisfies `σ/τ=ne²/m`, `S=−(kB/e)[5/2−μ/(kBT)]`, and `κ/(σT)=(5/2)(kB/e)²`. Tests directly integrate an independent parabolic dispersion rather than reusing the tight-binding dispersion.

## Sources

The [original BoltzTraP2 paper](https://arxiv.org/abs/1712.07946) and [Wannier90 BoltzWann documentation](https://wannier90.readthedocs.io/en/latest/user_guide/postw90/boltzwann/) provide the theoretical background for semiclassical transport integrals. This is an independent teaching implementation, without copied code or the full interpolation, real-material workflows or scattering models of those packages.
