# Many-body spectral functions and dynamic response

This module directly solves a 2–4-site single-band Hubbard teaching model using browser NumPy. It reuses the Hamiltonian, fixed-number bases and fermionic signs of `hubbard_lab.py`, adding adjacent-number Lehmann single-particle spectra and same-number connected longitudinal spin/density spectra. All parameters are teaching values, not material fits.

Entry: `#compute/manybody-spectra-lab`; classroom: `#classroom/observables?module=manybody`. Discrete transitions, curves, clickable formulas, initial/final densities, and sum rules in one result share the same Python data.

## Models, inputs, and initial states

`calculate(payload)` accepts a JSON object. The model is

`H=−t Σ_{⟨ij⟩,σ}(c†_{iσ}c_{jσ}+h.c.)+U Σ_i n_{i↑}n_{i↓}+Σ_i ε_i n_i`，
`ε_i=(−1)^i Δ/2`, with zero-indexed sites, energies in eV, and ℏ=1.

| Parameter | Default/range | Meaning |
|---|---|---|
| `experiment` | `single_particle` / `response` | Electron-addition/removal spectra / connected response |
| `sites` | 2; integer 2–4 | Site count L |
| `nUp`, `nDown` | Each 1; integers 0–L | Fixed populations of the two spins |
| `hopping` | 1；0–3 eV | t |
| `interactionU` | 4；0–30 eV | U |
| `alternatingPotential` | 0; −10–10 eV | Δ; site 0 has +Δ/2 |
| `boundary` | `open` / `periodic` | Each undirected bond counted once; two-site periodic and open chains coincide |
| `probe` | `local`/`momentum` | Local/normalized finite-chain Fourier probe |
| `site` | 0; integer 0–L−1 | Local probe index; ignored for momentum probes |
| `q` | 1; −2–2 | Dimensionless `q_physical a/π`; ignored for local probes |
| `spin` | `up`/`down` | Selected single-particle spin; ignored for response |
| `chemicalPotential` | 2; −20–40 eV | Single-particle spectral energy origin μ; ignored for response |
| `responseKind` | `spin` / `charge` | Longitudinal S_z / n; ignored for single-particle spectra |
| `eta` | 0.08;0.01–0.8 eV | Lorentzian HWHM |
| `points` | 601; integer 201–1201 | Plot samples in the automatic window |

Temperature, self-consistent doping, SOC, pairing, and other unimplemented fields are rejected. Initial states equally mix the selected `(N↑,N↓)` sector's degenerate ground space, `ρ_0=P_0/g`, with energy tolerance `10⁻⁹ eV`. Smaller physical splittings are unresolved; fixed-S_z averaging differs from thermal averaging over a full spin multiplet. The output also compares minimum energies of all S_z sectors at the same total N and flags a sector above the spin-unconstrained ground state.

Order all ↑ sites 0…L−1, then ↓ sites 0…L−1. Hopping/addition/removal retain the required fermionic signs. Fourier probe

`c_q=L^{−1/2}Σ_j exp(−iπqj)c_j`

It is normalized at every q, and its creation operator uses the conjugate phase. For open chains and q values incompatible with ring quantization, it remains a well-defined phase probe rather than a strict lattice momentum. A two-site ring contains only one bond; a three-site ring is a triangle.

## Single-particle Lehmann spectra

Addition/removal diagonalize adjacent spin-particle sectors separately, using actual `c†`/`c` matrix elements.

`E_f^+=E_f(N+1)−E_0(N)−μ`，
`E_f^−=E_0(N)−E_f(N−1)−μ`。

Initial states are equally averaged over the subspace, and final states are summed over numerically degenerate energy groups. Each weight is the trace of the relevant squared matrix elements; a missing addition/removal side for vacuum/full occupancy has zero weight, without invented final states.

`G^R(E)=Σ_f w_f/(E−E_f+iη)`，`A(E)=−Im G^R(E)/π`。

The E axis is already energy relative to μ, in eV, not angular frequency. μ does not change the initial particle count; arbitrary μ need not place addition/removal spectra on opposite positive/negative half-axes. Charge neutrality and finite-temperature occupations are not solved.

Each calculation uses one normalized probe for one spin:

`Σ_f w_f^−=⟨c†c⟩`, `Σ_f w_f^+=1−⟨c†c⟩`; their sum is 1.

The first moment is also independently checked using the one-body Hamiltonian and opposite-spin density:

`Σ_f E_f w_f = a h_0 a† + U Σ_i |a_i|²⟨n_{i,opposite}⟩−μ`，

Here `c=Σ_i a_i c_i`. This checks fermionic signs, Fourier phases,μ signs, and addition/removal positions together. First moments use discrete poles, not unspecified infinite-frequency absolute first moments of Lorentz curves.

## Dynamical connected response

`O_q=L^{−1/2}Σ_j exp(−iπqj)O_j`, with `O_j=n_j` or `S_{zj}=(n_{j↑}−n_{j↓})/2`; local mode uses only the selected site.

`δO=O−Tr(ρ_0 O)I`。

`S_O(q,E)=Σ_f Tr(P_f δOρ_0δO†) δ(E−E_f+E_0)`。

Retain the same `(N↑,N↓)`; do not triple longitudinal spectra as full-vector spectra for arbitrary initial states or label them complex χ. Zero-T discrete excitations are nonnegative. Subtracting means may leave zero-energy fluctuations in degenerate mixtures; zero/inelastic weights are reported separately.

Completeness requires `∫S_OdE=Tr(ρ_0δO†δO)`. Matrix multiplication also checks `Σ_f(E_f−E_0)w_f=Tr[ρ_0δO†(H−E_0)δO]`. At q=0, both total-density and total-S_z connected spectra vanish in a fixed sector.

The half-filled symmetric-dimer ground state provides an independent analytic benchmark. Set `D=√(U²+16t²)` and q a/π=1:

| Probe | Only nonzero excitation energy | Discrete weight |
|---|---|---|
| `S_z(q)` | `(D−U)/2` | `(1+U/D)/4` |
| `n(q)` | `(D+U)/2` | `1−U/D` |

These formulas apply for t>0, Δ=0 and a ground-state splitting resolved above numerical tolerance. At strictly t=0, U>0, the two separated-occupancy states in fixed `(1,1)` are averaged equally; the longitudinal q=π spectrum retains a zero-energy peak of weight 1/2. This differs from selecting a singlet with small finite t before taking the limit.

## Broadening, clickable peaks, and data structures

Broaden each pole with `L_η(E)=η/[π(E²+η²)]`. η is display HWHM, not calculated lifetime/ decoherence  rate. Negative-transfer tails arise from the symmetric Lorentz kernel, not actual zero-T negative excitations.

The window is set automatically from nonzero pole positions and linewidths. Output reports the in-window area from the arctan antiderivative and missing tails without forced renormalization. `gridResolvesHWHM` checks whether spacing is ≤η/3, separately from discrete-weight `checks.passed`. A coarse grid may misrepresent peak heights without changing discrete sum rules.

`transitions` groups final states by degenerate energy and returns IDs, channels, plotted energies, weights, initial/final energies, particle counts, degeneracies, and densities. On clicking a peak, `finalObservables` comes from the conditional final state

`ρ_f=P_f Oρ_0O†P_f/w_f`。

`finalGroupAverageObservables` additionally saves the equal-weight entire-final-level-group average, a different quantity. Initial data remain the declared full-ground-state mixture, not arbitrary eigenvectors masquerading as unique states. Weights below `10⁻¹³` are not drawn; omitted total is reported and must be <`10⁻¹⁰`.

`spectrum` retains raw linear spectra, energy grids and real/imaginary single-particle Green functions; `sumRules` includes discrete weights, first moments and window areas; `formulaLinks` provides formulas, current parameters and stable matching `plot` IDs; `summary/plots/tables/checks/warnings` follows the shared lesson interface.

## Validation and scope

Run `python scripts/test-python-manybody-spectra.py`. Checks: U=0 dimer local/bonding/antibonding spectra, atomic limits, analytic spin/charge peaks, full Jordan–Wigner Fock resolvents, equal-time/first-moment sums, initial/final degenerate rotations, empty/full sectors,μ shifts, conditional final states, and broadening invariants.

It excludes actual photoemission/neutron/RIXS cross sections, thermodynamic Mott phase diagrams, finite-temperature spectra, continuous-lattice self-energies, DMFT, nonequilibrium states and material fits. Existing single-particle device LDOS, phonon scattering and these electronic many-body spectra use different probes and normalizations; similar plots do not imply identical observables.

Conventions and background follow [TRIQS's Lehmann retarded Green-function API](https://triqs.github.io/triqs/latest/documentation/cpp_api/triqs/atom_diag/atomic_g_w.html), [Hubbard's original model paper](https://doi.org/10.1098/rspa.1963.0204), and [Carrascal et al.'s dimer study](https://arxiv.org/abs/1502.02194). Computation, lessons, synthetic presets, and exercises are independently implemented here, without copying third-party library code or claiming full software ports.
