#  crystal field , d orbitals, and a linear Jahn–Teller model

This module calculates with Python/NumPy in the browser; its public action is `crystal_field_lab` and its route is `#compute/crystal-field-lab`. `mode=crystal_field` is a full ten-dimensional **single-electron** d⊗spin Hamiltonian; `mode=jahn_teller` is a separate linear E⊗e adiabatic model with explicit parameters. Neither automatically truncates or fits the other.

## One-electron basis, energies, and coordinates

The five real orbitals are `[xy,yz,xz,x2-y2,z2]`, with neighboring up/down spin states per orbital, giving ten-dimensional basis `[xy↑,xy↓,yz↑,yz↓,xz↑,xz↓,x2-y2↑,x2-y2↓,z2↑,z2↓]`. This counts available one-electron basis states, not filling.

Real spherical harmonics on the unit sphere satisfy ∫Y_iY_j dΩ=δ_ij and are defined as:

| Orbital | Angular function on the unit sphere |
|---|---|
| xy | √(15/4π) xy |
| yz | √(15/4π) yz |
| xz | √(15/4π) xz |
| x²−y² | √(15/16π)(x²−y²) |
| 3z²−r² | √(5/16π)(3z²−1) |

The same real-basis phases define angular-momentum matrices and plots. L uses ℏ units, S=σ/2, and SOC is λΣα Lα⊗Sα. `splitting`, `ds`, `dt`, `soc` are entered in eV.

For positive splitting Δ, octahedral coordination gives E(t₂g)=−2Δ/5 and E(e_g)=3Δ/5; tetrahedral coordination gives E(e)=−3Δ/5 and E(t₂)=2Δ/5. Both conventions keep the five-orbital barycenter at zero. Td lacks inversion, so labels omit g/u. Each Δ is an independent parameter; no empirical ratio between the two coordinations is applied automatically.

In the order above, tetragonal diagonal coefficients are `Ds*[2,-1,-1,2,-2] + Dt*[-1,4,4,-1,-6]`. In an octahedral setting Δ=10Dq, and full orbital energies are:

- xy：−4Dq+2Ds−Dt。
- yz、xz：−4Dq−Ds+4Dt。
- x²−y²：6Dq+2Ds−Dt。
- z²：6Dq−2Ds−6Dt。

Ds/Dt are phenomenological levels, not fitted from displayed ligands or directly interpretable as real bond-length changes. Ligands retain ideal equal-distance geometry: octahedral ±x/±y/±z; tetrahedral (1,1,1),(1,−1,−1),(−1,1,−1),(−1,−1,1), each divided by √3. Bond length 1 is a visualization unit.

## SOC, degeneracy and angular density

H=diag(E_d)⊗I₂+λL·S preserves T=(I₅⊗iσy)K with T²=−1. With no magnetic field, all levels remain Kramers paired. The free-ion limit Δ=Ds=Dt=0 gives four j=3/2 states at −3λ/2 and six j=5/2 states at λ; λ<0 reverses their ordering.

Group levels within `1e-9*max(1,max|E|)` eV. Degenerate eigenvectors admit arbitrary  change of basis , so the main angular density averages the whole projector P/d and traces over spin: ρ_orb=Tr_spin(P/d), n(Ω)=Yᵀρ_orbY, ∫n dΩ=1. `groups.orbital_weights` and selected-density orbital weights sum to 1, not electron occupations. Single-state weights in `levels` reflect one numerical basis choice.

`angular_map.density` is probability density per solid angle; the interface may plot r=√n to illustrate shape, but this radius is not a real radial distance. Real orbital functions may use positive/negative colors; density after a spin trace or degenerate-state average has no single wavefunction phase. This module includes no radial wavefunctions, electron interactions, Hund multiplets, covalent hybridization or charge transfer. NiO supplies local-coordination context only; its d⁸ high-/low-spin state, magnetic ground state and measured spectra cannot be inferred from this single-electron spectrum.

The SOC scan runs from 0 to current λ and sorts levels at each point; it does not track a fixed eigenstate through crossings. For λ=0 the scan collapses to one point.

## Independent linear E⊗e model

The electronic basis is `[z2,x2-y2]`; both Q coordinates are **dimensionless reduced coordinates**. H_el=g(Q₂τx+Q₃τz), with elastic energy K(Q₂²+Q₃²)/2. K>0; g and K use eV because Q is dimensionless. After electronic diagonalization, let ρ=√(Q₂²+Q₃²); the two adiabatic potential surfaces are V±=Kρ²/2±|g|ρ.

For g≠0, lower-surface minima form a circle of radius ρ₀=|g|/K, with V_min=−g²/(2K) and stabilization E_JT=g²/(2K). Radial curvature is K and tangential curvature 0; the upper surface is 0 at the origin. For g=0 both surfaces coincide as an elastic paraboloid, with only the origin as minimum and no conical intersection.

The circular trough is accidental continuous degeneracy of this linear truncation, not the actual crystal's full  spatial rotation . Higher-order couplings/environment can select discrete directions. Nuclear kinetics, vibrational zero-point energy, dynamic JT tunneling, temperature, many-electron filling, and SOC are absent. Without calibration, Q is neither Å displacement nor  mass weighting  normal coordinate.

Global minima are given analytically even outside the two-dimensional display window; `minimum.whole_circle_in_plot` and `any_minimum_in_plot` describe coverage, and the radial curve includes the minimum radius. If the splitting at the selected point is below the numerical threshold, no unique lower state is assigned: the display uses two-state averaged weights `[0.5,0.5]` and sets `state_defined=false`.

## Inputs and outputs

Common input is a JSON object; unknown fields error. Reject booleans, nonfinite numbers, complex objects, numeric strings, and out-of-range values.

| Parameter | Range | Default |
|---|---|---|
| coordination | octahedral / tetrahedral | octahedral |
| splitting | 0–5 eV | 1 |
| ds、dt、soc | −2–2 eV | 0、0、0.1 |
| selected_level | Integer 0–9 | 0 |
| angular_grid | Integer 9–41 | 21 |
| scan_points | Integer 9–121 | 61 |
| coupling | −5–5 | 1 |
| stiffness | 0.05–20 | 2 |
| q2、q3 | −5–5 | 0.2、0.3 |
| q_extent | 0.1–5 | 1.5 |
| grid | Integer 11–81 | 41 |

Switching interfaces may retain other-model fields. Validate all supplied fields; inactive-model fields only echo in `inactive_parameters` and do not enter this Hamiltonian. `parameters` echoes active fields only.

Shared output fields are `tool/mode/parameters/summary/checks/steps/warnings/sources`. CF outputs `levels/groups/selection/orbitals/ligands/hamiltonian/soc_scan/angular_map`; angular-map matrices use `[theta_index][phi_index]`, with n theta points and 2n phi points including the seam. JT outputs `surfaces/radial/minimum/selection`; two-dimensional potential matrices use `[q3_index][q2_index]`.

Numerical checks cover Hermiticity, time reversal, Kramers pairing, L algebra, angular integration, and eigen-equations. Independent tests compare L matrices with direct −i r×∇ action on orbital polynomials, checking analytic spectra for both SOC signs, orthonormal basis functions, degenerate-basis invariance, and global JT minima.

## References and examples

- [Quanty NiO tutorial](https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate): material background and the distinction from multielectron calculations.
- [ESRF Crispy crystal-field conventions](https://crispy.esrf.fr/en/stable/user_guide/crystal_field.html): Ds/Dt and axis conventions.
- [Quanty D4h](https://www.quanty.org/physics_chemistry/point_groups/d4h): representation/coordinate background.
- [Requist et al. on linear E⊗e](https://arxiv.org/abs/1710.04041): model background; this site implements only the adiabatic potential surfaces above, not the paper’s full electron–nuclear calculation.
- Examples: [octahedral](../examples/crystal-field-octahedral.json), [tetrahedral](../examples/crystal-field-tetrahedral.json), [negative-SOC limit](../examples/crystal-field-negative-soc.json), [JT circular trough](../examples/crystal-field-jahn-teller.json).
