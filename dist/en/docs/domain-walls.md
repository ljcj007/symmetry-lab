# Domain walls and localized states: two independent teaching models

Version `20261029-pathways1`, module `domainwall`, route `domain-wall-lab`, Python entry `domain_wall_lab.calculate(payload)`. Continuous scalar  domain wall  and SSH chains calculate separately; neither automatically consumes the other's output, and BaTiO₃/polyacetylene parameters are not fitted.

## Continuous scalar φ⁴ domain wall

Use reduced free energy per unit transverse area

```text
F/A = ∫ dx [κ (∂xφ)²/2 + β(φ²−v²)²/4]，κ、β、v > 0。
```

Uniform bulk phases φ=±v have zero bulk energy. Fixed-endpoint variation gives `κφ″=βφ(φ²−v²)`. Infinite-domain solutions/wall energies are

```text
φ(x) = v tanh(x/ξ)，ξ = √[2κ/(βv²)]，
σ = F/A = 2√(2κβ) v³/3。
```

ξ is the tanh scale parameter, not a full width at half maximum. In the continuous solution, local potential-energy and gradient-energy densities are equal pointwise. At fixed β and v, multiplying κ by 4 doubles both ξ and σ; a wider wall alone does not establish higher or lower wall energy without specifying which parameter changed.

The experiment uses `x∈[−extent·ξ,+extent·ξ]` with an odd uniform grid, endpoints fixed exactly at `−v,+v`, and center fixed at zero. Varying κ at fixed extent also changes the reduced physical interval through ξ. Finite endpoints ±v differ slightly from finite-position values of the infinite-domain tanh, so pointwise equality is not expected.

The discrete free energy is

```text
Fh/A = κ/(2h) Σ_i (φ_{i+1}−φ_i)²
       + hβ/4 Σ_{i=1}^{N−2} (φ_i²−v²)²。
```

Endpoint potential energy is zero. The program finds stationary points in the antisymmetric subspace `φ(−x)=−φ(x)`, using damped Newton iteration on the positive half. The returned `stationaryResidual` is the interior-equation residual

```text
r_i = κ(2φ_i−φ_{i−1}−φ_{i+1})/h² + βφ_i(φ_i²−v²)
```

its maximum absolute value; this equals the discrete energy gradient divided by h. A small residual means proximity to a stationary point of the current discrete equations, not mesh convergence or stability after releasing the center constraint.

## Stationarity, stability, and mesh convergence

A finite-difference grid lacks exact continuous translation symmetry. On a coarse grid, a wall constrained to a grid-point center may be stable in the center-fixed subspace yet have an energy-lowering direction when its center can move. Results therefore show separately:

- `minimumPinnedHessianEigenvalue`: the smallest discrete-energy Hessian eigenvalue in orthonormal variational coordinates after fixing the antisymmetric center constraint.
- `minimumUnconstrainedHessianEigenvalue`: minimum discrete-energy Hessian eigenvalue, with endpoints fixed and all interior points free.
- `pinnedLocallyStable` and `unconstrainedLocallyStable`: whether no negative direction is found within the specified numerical tolerance; neither proves a global minimum.

The Hessian is the second derivative of discrete energy, including grid factor h. Its tolerance is `10⁻⁹ max(1, ||Hessian||∞)`. For κ=β=v=1, extent=16, N=41, the stationary residual is about `2.8×10⁻¹²`, but the full Hessian minimum eigenvalue is about `−0.09626`; small perturbations along that direction lower discrete energy. The interface flags this explicitly rather than claiming a stable free wall.

Compute N and 2N−1 wall energies on the same finite interval and return absolute/relative differences. At default extent=8, N=41,81,161 give ≈0.937669,0.941545,0.942494 versus infinite-continuum 0.942809, consistent with second-order convergence. Increasing the interval separates boundary/discrete errors; one comparison is not a full convergence study.

This part uses reduced length, order-parameter and energy units, without an automatic conversion factor to J/m². The model contains one static scalar field, with no electrostatic boundaries, elastic coupling, three-dimensional domain morphology, nucleation, motion or switching dynamics.

## SSH interface: an independent electronic Hamiltonian

Use an even-site open spinless chain:

```text
H = −Σ_{i=0}^{N−2} t_i (|i⟩⟨i+1| + |i+1⟩⟨i|)
    + V (|N/2−1⟩⟨N/2−1| + |N/2⟩⟨N/2|)，
t_i = t[1+(−1)^i δ_i]。
```

For `interface='wall'`, `δ_i=δ tanh[(i−(N−2)/2)/sshWidth]`; for `interface='uniform'`, `δ_i=δ`. t, V and eigenenergies use eV, and sshWidth is measured in bond spacings. This sshWidth is not the ξ of the continuous φ⁴ model.

The uniform reference's first and last bonds are strong, `t(1+δ)`. With this termination and δ>0 it lacks near-zero end states supported by weak end bonds. Reversing bond order on one side in the interface model can produce both interface and end contributions. Other uniform SSH terminations can have end states, so near-zero levels do not universally identify interface states.

The infinite uniform-bulk Bloch energy is

```text
E±(q) = ±√[t₁²+t₂²+2t₁t₂ cos(q)]，
t₁=t(1+δ)，t₂=t(1−δ)，体相参考带隙=2|t₁−t₂|=4tδ。
```

This reference band gap is not the separation of the lowest two finite-chain levels. For short chains or broad interfaces, endpoint bond order may not even approach ±δ; the program warns when asymptotic conditions are inadequate. `endpointDimerizationFraction` gives the actual endpoint dimerization amplitude relative to δ.

## Chiral symmetry, local potentials, and the near-zero subspace

At V=0, `Γ=diag(1,−1,1,−1,…)` satisfies `ΓH+HΓ=0` and energies pair ±E. Finite interface/boundary hybridization can split near-zero states; chiral symmetry does not require exact E=0 eigenvalues for every finite chain.

V acts on the central two sites and changes the Hamiltonian’s onsite terms. Its chiral anticommutation residual is `2|V|`; it generally shifts levels and breaks spectral pairing about zero energy. V is not superconducting pairing, a magnetic field or a dissipation rate. A single local peak is not used to identify a Majorana mode or material topological class.

The displayed near-zero window is fixed at `|E|<tδ`, half the central energy range of the asymptotic bulk gap. The spatial plot shows

```text
P_ii = Σ_{n∈窗口} |ψ_n(i)|²，Σ_i P_ii = 窗口中态数。
```

This is not one wavefunction normalized to 1. Unitary  change of basis  within the selected subspace preserves P; degenerate/near-degenerate spatial weights are better judged with projectors than individual eigenvectors. Local potentials can move levels outside the window, changing selected counts without destroying states. Read individual spatial weights with resolution and degeneracy.

The central region is defined by `|i−(N−1)/2|≤max(3,2·sshWidth)`; the edge region is the first and last three sites. These are checkable statistical windows, not mutually exclusive state categories. Short chains and broad interfaces can make them overlap or the central window cover the entire chain; then their weights cannot simply be added, nor does total central weight alone establish interface localization. `regions` returns the actual central, edge and overlapping site indices, and the interface displays a warning.

## LDOS and broadening

Local DOS uses the full finite-chain eigenbasis:

```text
ρ_i(E) = Σ_n |ψ_n(i)|² η/[π((E−E_n)²+η²)]
       = −Im[(E+iη−H)⁻¹]_{ii}/π。
```

ρ is per site per eV; η is the Lorentzian half width at half maximum, with FWHM=2η. Each Lorentzian line has unit area, so integrating over the entire energy axis gives 1 per site and N over all sites. A finite window misses Lorentzian tails and must not be forcibly renormalized. Here η smooths spectral lines; it differs from numerical absorption in the existing open-device transport model and is not called a physical inelastic scattering rate.

## Input ranges and outputs

|Branch|Parameter|Default and range|
|---|---|---|
|Selection|`experiment`|`landau` or `ssh`; default `landau`|
|φ⁴|`kappa`, `beta`|Default 1 each; 0.05–8|
|φ⁴|`amplitude`|default 1;0.2–3|
|φ⁴|`extent`|Default 8; 4–16; units of ξ|
|φ⁴|`gridPoints`|Default 81; odd integers 41–161; automatic fine grid at most 321 points|
|SSH|`sites`|Default 60; even 20–100|
|SSH|`hopping`|Default 1; 0.1–3 eV|
|SSH|`dimerization`|Default 0.4; 0.05–0.85|
|SSH|`sshWidth`|Default 2;0.5–10 bond spacings|
|SSH|`onsite`|Default 0; −2 to 2 eV; same value on the central two sites|
|SSH|`probeEnergy`|Default 0; −6 to 6 eV|
|SSH|`eta`|Default 0.03;0.005–0.2 eV, HWHM|
|SSH|`interface`|Default `wall`; alternative `uniform`|

Common outputs are `parameters`, `summary`, `plots`, `tables`, `warnings`, `checks`. The continuum branch also returns `profile`,`wall`; SSH returns `spectrum`,`chain`,`regions`. All numbers must be finite; site counts must satisfy integer and parity constraints. Both models share one input object, with model-specific defaults for omitted parameters.

## Independent checks and sources

`python scripts/test-python-domain-wall.py` verifies the analytical tanh equation and wall-energy integral, finite-difference variation of the discrete energy, κ scaling, second-order grid convergence and negative Hessian directions on coarse grids; standing-wave quantization of uniform open SSH chains and the analytical δ=0 chain, chiral pairing, spectral transformation under a two-site potential, projector basis invariance, Green-function LDOS, spectral-weight integration, spatial distinction between endpoints and interfaces, and input rejection.

- [David Tong, Statistical Field Theory, 1.3.2 The Saddle Point and Domain Walls](https://www.damtp.cam.ac.uk/user/tong/sft/one.pdf): background on continuum scalar free energies and domain walls.
- [Su, Schrieffer, Heeger, Solitons in Polyacetylene (1979)](https://doi.org/10.1103/PhysRevLett.42.1698): original dimerized-chain research.
- [Asbóth, Oroszlány and Pályi, A Short Course on Topological Insulators](https://arxiv.org/abs/1509.02295): SSH chiral symmetry, edge states and teaching discussions of finite chains.

The two equation sets and numerical examples are implemented and validated independently here. These references do not imply that all their electron–lattice couplings or real-material models are included.
