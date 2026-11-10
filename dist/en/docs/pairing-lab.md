# Superconducting pairing and BdG teaching models

This browser NumPy module evaluates specified pairing potentials for 2D square singlets/1D effective spinless Kitaev chains. It does not solve self-consistent gaps or predict Tc, mechanisms, material parameters,  transport  conductance, or experimental Majorana signals.

## Parameters and units

Call `pairing_lab.run(payload)`; API action `pairing_lab`. `model` is `square_singlet` (default) or `kitaev`. `hopping` is t, range 0.05–5, default 1; `chemical_potential` is μ, range −25–25, default 0; `gap` is Δ₀, range 0–5, default 0.4. All share an arbitrary energy unit. Momentum is ka in radians, with lattice constant 1.

Square `pairing` options `s`, `extended_s`, `d_x2_y2`, `d_xy`, `d+id`, default `d_x2_y2`; `grid` 11–81/default 41; `path_samples` samples per symmetry segment 11–121/default 61. Kitaev `sites` 6–80/default 40, path `2*path_samples+1` points. Inputs finite; integers cannot be fractional; booleans are not numbers; unknown fields error. Returned `parameters` contains used parameters only.

## Square-lattice model and nodes

Normal state: ξ(k)=−2t(cos kx+cos ky)−μ. Scalar pairing is Δ(k)=Δ₀f(k), with basis functions:

| Pairing | f(k) | D₄h label |
|---|---|---|
| s | 1 | A₁g |
| Extended s | (cos kx+cos ky)/2 | A₁g |
| d(x²−y²) | (cos kx−cos ky)/2 | B₁g |
| d(xy) | sin kx sin ky | B₂g |
| d+id | (cos kx−cos ky)/2+i sin kx sin ky | B₁g+iB₂g |

These amplitude conventions do not give equal Fermi-surface mean squares to different functions. On a square lattice, B₁g and B₂g are distinct 1D irreps. Equal-amplitude d+id is a specified complex combination; crystal symmetry does not force degeneracy or simultaneous condensation. For Δ₀>0 it breaks time reversal; this module does not calculate Chern numbers.

Complete Nambu basis (c_k↑,c_k↓,c†_−k↑,c†_−k↓); spin pairing D=Δ(k)iσy;4D BdG H=[[ξI₂,D],[D†,−ξI₂]]. Antisymmetric spin/even orbital satisfy D(k)=−Dᵀ(−k). Particle–hole C=τxK satisfies C H(k) C⁻¹=−H(−k). Doubly degenerate energies ±√(ξ²+|Δ|²) contain Nambu redundancy; do not double-count excitations.

Zero energy requires both ξ=0 and Δ=0. The program decides analytically for these specific functions rather than using the displayed grid minimum. A normal-state Fermi surface requires |μ|≤4t, with only one point remaining at a band edge. Nonzero s wave is nodeless; d(x²−y²) and d(xy) have nodes whenever the normal-state Fermi surface exists. Extended s equals −Δ₀μ/(4t) on this nearest-neighbor Fermi surface, making the entire Fermi surface zero-energy at μ=0. d+id closes only at the band edges μ=±4t. Δ₀=0 is the normal state.

`sampled_min_energy` is explicitly a finite-grid value and may remain positive even with analytically established nodes. `fermi_surface` is the normal-state ξ=0 contour, not the superconducting zero-energy set. Zero `phase` at |Δ|=0 is a placeholder; these points should be faded in plots.

## Kitaev chain/end states

In real space, h_jj=−μ and h_j,j+1=−t, with pairing D_j,j+1=Δ₀ and D_j+1,j=−Δ₀. In momentum space, D(k)=2iΔ₀ sin k and bulk energies are E=±√[(2t cos k+μ)²+4Δ₀²sin²k]. Δ₀ is a bond-pairing amplitude, with a different convention from the square-lattice momentum-basis amplitude.

The bulk gap comes from analytic minimization of E² as a quadratic in x=cos k∈[−1,1], independent of plot mesh. Δ₀≠0 with |μ|<2t gives a gapped topological phase; |μ|=2t closes the gap. Δ₀=0 with |μ|≤2t is a gapless normal chain. Only gapped cases receive ν=sgn[(μ+2t)(μ−2t)], with −1 topological and +1 trivial; gapless cases return null.

Open chains remove end-to-end bonds and diagonalize 2N-dimensional  Hermitian . Return four smallest-|E| states/|u_j|²+|v_j|² weights, not charge densities. Lowest-pair mean weights sum 1 and are  change of basis -invariant within that pair; if further degenerate, the selected pair is nonunique. Finite end modes hybridize and split; minimum finite energy is not the infinite-bulk criterion. At μ=0, Δ₀=t, two exact zero modes occupy opposite ends, with mean weight 1/2 each.

## Output contract

Common fields: `tool`,`model`,`parameters`,`summary`,`bands`,`checks`,`warnings`,`sources`,`derivation`. `bands.energies[k_index][band_index]`, `bands.distance`, and `ticks[{value,label}]` share path coordinates. Square-lattice `gap_map` arrays for real/imaginary parts, magnitude, phase, ξ, and positive energy use `[ky_index][kx_index]`; `fermi_surface.branches` gives branch kx,ky and complex gaps. Kitaev `chain` gives sites, full spectrum, four selected states, and average weight of the lowest doublet.

Checks:  Hermitian , full Nambu particle–hole and Fermi antisymmetry. Independent tests: analytic spectra, periodic real-space versus bulk, nodes,  chirality  pairing, normal limits, transitions, exact end modes, finite splitting, normalization, strict JSON.

Examples: [d-wave nodes](../examples/pairing-square-d.json), [complex d+id pairing](../examples/pairing-square-chiral.json), [Kitaev end states](../examples/pairing-kitaev-endstates.json).

## References

- [Official Kwant tutorial: superconductors and particle–hole freedoms](https://kwant-project.org/doc/latest/tutorial/superconductors)
- [Kitaev’s original paper: Unpaired Majorana fermions in quantum wires](https://arxiv.org/abs/cond-mat/0010440)
- [Topology in condensed matter: Kitaev chain](https://topocondmat.org/w1_topointro/1D.html)
