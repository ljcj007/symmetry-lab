# Device quantum  transport : a one-dimensional chain with two leads

This module uses NumPy for coherent transport through a finite scattering region connected to identical semi-infinite electrodes, extending the existing tight-binding, finite-system and surface Green-function tools for teaching. It adds contact self-energies, transmission, two-terminal conductance, local injection spectra and flux checks; it is not a complete Kwant port.

Calculation entry: `device_transport_lab.run(payload)`; public tool name: `device_transport_lab`. Scientific computation runs in a browser Python Worker; inputs are not uploaded.

## Model and parameters

The finite chain has 2–40 sites and one orbital per site per spin. All energy inputs use eV; schematic site spacing is 1 with no real lattice constant specified. The Hamiltonian is

`H_D = Σ_i ε_i |i><i| − Σ_i t_i (|i><i+1| + h.c.)`。

- `model` is `uniform` or `ssh`; `sites` is the integer site count.
- `hopping`:0.05–5 eV. Every uniform bond equals it; SSH bonds 0,2,4,… equal `hopping*dimerRatio` and 1,3,5,… equal `hopping`. Bond 0 joins sites 0,1, fixing intracell/intercell conventions.
- `dimerRatio` ranges from 0.05–3 and applies only to SSH alternating bonds.
- `gate` is the onsite potential on every scattering-region site. `barrier` adds a potential over `barrierWidth` consecutive sites starting at `barrierStart`. Sites are zero-indexed and barriers cannot extend beyond the scattering region. Both allow −10–10 eV.
- Identical leads have hopping `leadHopping` (0.05–5 eV), onsite `leadOnsite` (−10–10 eV), contacts `contactLeft`, `contactRight` (0–5 eV).
- `energy` selects the energy for local spectra and transmission and serves as the Fermi energy in the zero-temperature linear-conductance formula; its range is −30–30 eV.
- `energyMin`, `energyMax`, and `samples` define an equally spaced 41–301-point scan. Windows can be narrowed locally; finite scans do not guarantee narrow-peak resolution.
- `eta` is the positive imaginary part of the scattering-region retarded Green function, `1e-9`–`1e-3` eV, default `1e-7`. It is numerical regularization, not relaxation or physical  decoherence .
- `spinDegeneracy` is the integer 1 or 2, counting identical uncoupled independent spin copies only.

## Retarded branch and lead self-energies

Let `x=E−ε₀`. The lead surface Green function satisfies `gʳ=1/(x+i0−t₀²gʳ)`; choose the upper-half-plane analytic branch tending to `1/x` at infinity:

`gʳ = [x − i sqrt(4t₀²−x²)]/(2t₀²)` for `|x|<2t₀`.

Outside the band use the stable equivalent `gʳ=2/[x+sgn(x)sqrt(x²−4t₀²)]`. No propagating mode exists and `Γ=0`. Exact band edges are also treated as having no open channel; zero-velocity edge states are not ordinary propagating channels.

`Σ_L/R=v_L/R²gʳ`, `Γ_L/R=−2 ImΣ_L/R`, added only to the first/last device sites.

`Gʳ=[(E+iη)I−H_D−Σ_L−Σ_R]⁻¹`。

Electrode self-energies use exact retarded boundary values at real energy; η is added only to the scattering region. All artificial loss can therefore be checked explicitly within the device.

## Outputs, units, and conservation

Each end has one channel per spin:

`T(E)=Γ_LΓ_R|Gʳ_N1|²`。

`G(E_F)=g_s(e²/h)T(E_F)` is the zero-temperature linear-response conductance. `conductanceQuantum` is in `e²/h`, so it equals `g_s T`; `conductanceSiemens` uses exactly defined fundamental constants to convert to S, with `e²/h≈3.8740458649×10⁻⁵ S`.

Per-spin local spectra are `ρ_i=−ImGʳ_ii/π`, in `states/(eV·site·spin)`. Left injectivity is `ν_L,i=Γ_L|Gʳ_i1|²/(2π)` and similarly on the right. ρ is not an occupation; integration with a Fermi distribution is needed for electron numbers. Finite η also adds a regularization spectral term:

`ρ_i = ν_L,i + ν_R,i + (η/π) Σ_j |Gʳ_ij|²`。

For normalized left-incident `ψ_i=√Γ_L Gʳ_i1`, output `bondTransmission` is dimensionless flux from site i to i+1:

`J_i→i+1=−2 Im(H_i,i+1 ψ_i+1 ψ_i*)`。

It approaches the transmission T but is not measured in amperes and is not the total finite-bias current. η introduces site losses `2η|ψ_i|²`; the program checks `J_in−J_out=2η|ψ_i|²` at every site. Inflow at the first end is `1−R`, and outflow at the last is T.

The left reflection amplitude is `r=1−iΓ_LGʳ_11`, `R=|r|²`, and total artificial absorption is `Aη=2ηΣ_i|ψ_i|²`. Open leads must satisfy `T+R+Aη=1`. Outside the band there is no propagating incident state: R is `null` and T=0. Disconnected contacts give exactly T=0, while LDOS can remain nonzero.

## Numerical diagnostics

Results include transmission, reflection, absorption, LDOS, left/right injection densities and bond fluxes at the selected energy, together with a T(E) scan, device and bond lists, closed finite-chain eigenlevels and lead band intervals.

`checks` includes:

- Selected-point and scan unitarity/probability residuals;
- Sitewise flux continuity, spectral identities, linear-equation residuals and reciprocity residuals;
- The single-channel bound T≤1 and actual scan maximum;
- Selected-energy transmission with η versus η/2;
- Energy-scan step size.

The η comparison tests only the current energy, not convergence of the entire spectrum. Weak contacts and narrow resonances require independent energy refinement. Do not increase η to hide undersampling. Extremely weak coupling or isolated states can give large LDOS peaks without high transmission.

## Cross-module SSH conventions

Both `device-ssh-weak` and `device-ssh-strong` use N=12, t₁=.6, t₂=1 eV, E=.05 eV and η=1e−7 eV. Only the left/right contacts differ: `.15/.15` versus `.8/.8` eV; the low-energy scan covers ±.3 eV with 201 points. The closed chain’s two low-energy edge states lie near ±.03009075 eV and are not exactly zero at finite length.

Comparisons with quantum geometry retain the same intracell/intercell convention. Negative hoppings throughout the finite chain differ by an overall sign from the periodic SSH model, but the two-band Zak phases agree modulo 2π. This does not permit arbitrary cell or orbital-embedding changes. Projects should separately record the periodic Zak phase, finite-chain endpoint weights, contacted T(E), and convergence.

## Scope

Electron interactions, finite-bias self-consistent potentials, inelastic scattering, finite-temperature Fermi-window integration, SOC, magnetic fields, multiterminal devices and arbitrary material-structure import are not implemented. Existing slab and surface spectra remain available; this module does not count those existing features as additions or treat a transmission peak alone as topological evidence.

## Validation and sources

`python scripts/test-python-device-transport.py` covers uniform-chain T=1/analytic DOS, single-barrier/two-contact formulas, surface-Green branches/Dyson equation, disconnected contacts, band edges/outside bands, energy shifts, left-right reversal, probability/local continuity, regularization convergence, spin multiplicity, SSH end states, and input limits.

References: [Kwant quantum-wire and Landauer tutorial](https://www.kwant-project.org/doc/1/tutorial/first_steps), [local densities and currents](https://kwant-project.org/doc/1/tutorial/operators), [Groth et al. methods paper](https://arxiv.org/abs/1309.2926). The core is this site’s original NumPy implementation, without copied Kwant source code or a claim of full Kwant compatibility.
