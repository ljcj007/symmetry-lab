# Superconducting junctions and Andreev reflection

This original NumPy teaching implementation uses a 2–32-site finite normal chain, coupled on the left to a semi-infinite normal lead and on the right to a semi-infinite real s-wave superconducting lead. All three regions share baseline hopping t; the normal region permits gate potentials, a single-site barrier, and adjustable contact hoppings. It shares physical conventions with the normal-device calculation but needs neither Kwant nor an external computing service.

## Basis, units, and observables

Using `(e↑, h↓)` as one Nambu block, the normal finite-region matrix is `H_e ⊗ τz`, where `H_e` has onsite energy `−μ+gate+barrier` and hopping `−t`. The right lead has `h₀=−μτz+Δτx` and `V=−tτz`. The other physical spin block gives identical scattering probabilities.

- `normalReflection=R_ee`: an incident electron reflects as an electron.
- `andreevReflection=R_he`: an incident electron reflects as a hole.
- `quasiparticleTransmission=T_qp`: quasiparticle flux injected into the right superconducting electrode; it is not the electrical conductance.
- `conductanceQuantum=2(1−R_ee+R_he)`: in e²/h units, already including both physical spins.
- SI conductance is in S, not sheet or three-dimensional conductivity.
- `electronLDOS/holeLDOS` are given per Nambu spin block per eV. The hole spectrum is not the occupancy of an additional independent electron state.

E is relative to the condensate chemical potential. E=0 gives zero-temperature, zero-bias linear conductance; nonzero-E curves give spectral differential conductance in a zero-temperature, fixed-potential, fixed-pairing approximation. Nonequilibrium potentials, bias-dependent self-consistent gaps, finite-temperature window integration, and I(V) are not solved here.

## Exact lead boundaries

The surface function of a normal semi-infinite chain satisfies `g=1/(z−ε₀−t²g)`. Choose the retarded branch with nonpositive imaginary part on the real axis and high-energy limit `1/z`. The implementation uses the stable form `2/(x+sqrt(x−2t)sqrt(x+2t))` and exact boundary expressions inside and outside the real-axis band.

The superconducting chain's surface spectral measure is `(2/π)sin²k dk`. Write `κ²=E²−Δ²`; inside the gap take `κ=i sqrt(Δ²−E²)`, and outside take a real part with the sign of E and a positive infinitesimal imaginary part. If `g₊=g_N(κ)` and `g₋=g_N(−κ)`, the latter must use the corresponding advanced branch, giving

```
A=(g₊−g₋)/(2κ), B=(g₊+g₋)/2
g_S=A(E I+Δτx)+Bτz
```

`Δ=0` directly uses decoupled normal electron/hole functions. Exact `E=±Δ` needs a threshold limit; this version retains `defined=false` and null values, and plots must preserve breaks rather than fill them with zero. Compare both threshold sides and refine the energy step if needed.

No hidden η is used in the leads, so subgap `Γ_S=0`. A positive numerical imaginary part η is present only in the finite normal region, producing explicit artificial absorption

```
Aη=2η ||sqrt(Γ_e) Gʳ e₀||²
R_ee + R_he + T_qp + Aη = 1.
```

Outputs also include surface Dyson residuals, linear-solve residuals, particle–hole relations, flux residuals over the full scan, and conductance comparison at η and η/2 at the selected energy. Two-grid/broadening diagnostics are not rigorous error bounds; missed narrow peaks still require a finer energy scan.

## Cross-module project with a normal device

Both `andreev-project-normal` and `andreev-project-paired` use N=12, t=1 eV, μ=gate=barrier=0, barrier site 6, both contacts 1 eV, E=.2 eV and η=1e−7 eV; only Δ changes from 0 to .3 eV. The older `device-perfect` outputs one spin channel; divide this page’s result by 2 before comparing.

At finite numerical η, in the normal limit this page's `G/2=(1−R)e²/h` differs from the older tool's `T e²/h` by the explicitly reported `Aη e²/h`. They agree as η→0. This is artificial absorption, not a physical contact difference.

Reference values: normal preset `G/(e²/h)≈2`; transparent preset with finite Δ=.3, E=.2 ≈3.9111; small-gap preset Δ=.02, E=0 ≈3.9996. A finite-bandwidth interface need not equal 4 exactly.

## Verification and scope

`python scripts/test-python-andreev.py` checks scalar/superconducting surface Dyson identities, independent sine spectral integration, analytic normal single-site-barrier transmission, the older device limit, the exact matched-interface zero-energy formula `R_he=4t²/(4t²+Δ²)`, the small-gap BTK/Beenakker limit, particle–hole relations, flux, LDOS, thresholds, and parameter bounds.

All parameters are illustrative. No material fitting, actual contact chemistry, SOC, magnetic field, Josephson phase difference, self-consistent pairing, topological superconductivity, or Majorana criterion is included. Subgap peaks or enhanced conductance alone do not establish topological superconductivity.

Methods: [Kwant NS junction tutorial](https://kwant-project.org/doc/1/tutorial/superconductors), [original BTK paper](https://doi.org/10.1103/PhysRevB.25.4515), [Beenakker’s review of scattering theory](https://arxiv.org/abs/cond-mat/9406083).
