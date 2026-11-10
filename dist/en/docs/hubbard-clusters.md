# Hubbard clusters: hopping, double occupancy, and spin correlations

Version: `20261029-pathways1`. Lesson module `hubbard`, computation route `hubbard-cluster-lab`, action `hubbard_lab`. This is a zero-temperature single-band Hubbard teaching model with 2–4 sites and one spatial orbital per site. NumPy exact-diagonalizes a fixed particle-number sector, with matrices up to 36×36; “exact” means numerical solution within this finite model, not an accurate description of a real material.

## Hamiltonian and boundary conventions

Label sites `i=0,…,L−1` and use

```text
H = −t Σ_{⟨ij⟩,σ} (c†_{iσ} c_{jσ} + c†_{jσ} c_{iσ})
    + U Σ_i n_{i↑} n_{i↓} + Σ_i ε_i (n_{i↑}+n_{i↓}),
ε_i = (−1)^i Δ/2。
```

All energy parameters use eV and spin operators use ℏ=1. Positive Δ raises the first site, with −Δ/2 onsite energy at the second. For an odd number of sites, the staggered onsite potentials generally do not sum to zero; a periodic three-site model also forms an odd ring and is not an unfrustrated infinite bipartite chain.

Open boundaries contain `(0,1),…,(L−2,L−1)`; periodic boundaries add the closing bond. Undirected bonds are deduplicated; forward and reverse hopping are already in the same term. **A two-site periodic system still has only one undirected bond**, identical to this site's two-site open model. Four-site periodic systems have four bonds; three-site systems form a triangle. Do not accidentally double t by counting the two-site bond twice.

Each site is empty,↑,↓, or double. N↑/N↓ are conserved separately; sector dimension `C(L,N↑)C(L,N↓)`. `(L,N↑,N↓)=(2,1,1)` has 4 states, `(4,2,2)` has 36. Creation/annihilation require consistent fermion ordering; reordering can change element signs, not a consistently transformed spectrum.

## Parameters and lesson starting points

|Parameter|Allowed range|Default|Meaning|
|---|---|---|---|
|`sites`|Integer 2–4|2|Site count L|
|`nUp`, `nDown`|Each integer 0–L|1 each|Select fixed particle number and Sz sector|
|`boundary`|`open`, `periodic`|`open`|Open chain or joined ends|
|`hopping`|0–3 eV|1|Hopping t|
|`interactionU`|0–30 eV|4|Onsite repulsion U|
|`alternatingPotential`|−10–10 eV|0|Staggered potential difference Δ|
|`scanMaxU`|0–30 eV|12|U-scan maximum|
|`scanPoints`|Integer 11–41|25|Number of U-scan samples|

The UI particle-count fields have a generic maximum of 4, but actual inputs must satisfy `nUp,nDown ≤ sites`. Half filling means `N=L`, not that every occupation configuration has exactly one electron per site.

`dimer-half` starts with a symmetric half-filled dimer; `chain-four` compares four-site open densities/correlations; `ionic-dimer` shows U versus potential imbalance; `atomic-dimer` uses t=0 to check degeneracy. Presets specify all parameters. U scans fix other inputs; different-U ground states are not one ensemble. For `scanMaxU=0`, return one nonduplicate U=0 point; `scanPoints` gives no duplicates.

## Reading spectra and observables

The spectrum belongs to input `(N↑,N↓)`, fixing `N=N↑+N↓` and `Sz=(N↑−N↓)/2`. Its lowest energy need not be the ground state over every spin sector at that N. Observables follow the selected sector: local density `⟨n_i⟩`, double occupancy `D_i=⟨n_{i↑}n_{i↓}⟩`, and spin correlation

```text
⟨S_i·S_j⟩ = ⟨S_i^z S_j^z + (S_i^+ S_j^- + S_i^- S_j^+)/2⟩。
```

Total double occupancy `D=Σ_i D_i` differs from per-site mean `D/L`; check normalization labels. Density satisfies `Σ_i⟨n_i⟩=N`. Dimensionless spin correlations cannot directly equal exchange energies in eV.

If the selected sector has a g-fold degenerate ground state, the program averages equally over its subspace: `⟨O⟩=Tr(P₀O)/g`. The numerical degeneracy tolerance is **10⁻⁹ eV**. This avoids dependence on arbitrarily returned degenerate eigenvectors. It does not mix other Sz sectors automatically or compute a finite-temperature partition function.

The strict atomic limit gives a sensitive check: for Δ=0,U>0, the dimer `(1,1)` sector at t=0 has two degenerate separated-electron ground states; their equal mixture gives `D=0`, `⟨S₁·S₂⟩=−1/4`. Theoretically any nonzero t selects a lowest singlet, then `t→0⁺` gives `⟨S₁·S₂⟩→−3/4`. Numerically the S/T splitting must exceed 10⁻⁹ eV to resolve it; very small nonzero t is grouped into the degenerate average. These theoretical values reflect different preparations and orders of limits and should not be forced equal; numerical tolerance also matters. Averaging every separated N=2 spin state gives another average. This site's local observables follow the selected fixed-Sz sector.

## Explain three energy gaps separately

**Fixed-Sz-sector excitation gap**: compare the ground energy with the next distinct level above the entire degenerate ground subspace in the input sector. If the sector contains only one distinct level, the gap is undefined. This is neither the lowest excitation across arbitrary spin sectors nor a charge-addition/removal energy.

**Charge addition/removal gap**: for each total N, minimize E₀(N) over every allowed sector with `N↑+N↓=N`, then calculate

```text
Δc(N) = E₀(N+1) + E₀(N−1) − 2E₀(N)。
```

E₀ is not the minimum of an arbitrary excited spin sector. At N=0/N=2L, one neighboring particle number is absent, so this two-sided gap is undefined; missing is not zero.

**Dimer singlet–triplet splitting**: only for L=2, N=2, explicitly compare the lowest S=0 and S=1 energies. At Δ=0, the single undirected bond in the definition gives

```text
E_S = (U − √(U²+16t²))/2，E_T = 0，
J_ST = E_T−E_S = (√(U²+16t²)−U)/2 ≃ 4t²/U（U≫t）。
```

The large-U formula is undefined at U=0; infinity is not a physical solution. For Δ≠0 the symmetric-dimer formula also cannot be reused directly. Although a dimer's dedicated S/T splitting can equal a sector-level spacing, its definition differs from the generic fixed-Sz sector gap.

The symmetric half-filled dimer also has hand-checkable results:

```text
D = ∂E_S/∂U = (1−U/√(U²+16t²))/2，
⟨S₁·S₂⟩ = −3(1−D)/4，
Δc = √(U²+16t²)−2t。
```

The first two formulas use the lowest singlet for t>0 and do not replace degenerate averaging at t=0. For t=1, U=4, Δ=0, `E_S≈−0.828427 eV`, `J_ST≈0.828427 eV` and `D≈0.146447`, while the large-U approximation is `1 eV`. At U=0, the charge-addition/removal gap is still 2t: a finite dimer has discrete bonding and antibonding orbitals, so this gap alone does not prove a Mott-insulating phase.

## Potential differences and limits of material interpretation

At dimer N=2, t=0, separated states cost 0 and low-site double occupancy costs `U−|Δ|`; atomic degeneracy occurs at `U=|Δ|`. Finite t mixes them, usually changing imbalance/double occupancy smoothly. This illustrates imbalance versus repulsion;Δ is not an actual multiorbital ligand–metal transfer energy.

The molecular-dimer case uses two local orbitals to illustrate competition between delocalization and repulsion, without an organic salt’s crystal network or fitted parameters. A four-site chain supports exercises on single-orbital correlation mechanisms but lacks explicit oxygen p orbitals, two-dimensional CuO₂ geometry and multiorbital exchange, so it cannot predict cuprate magnetic order or superconductivity. All preset numbers are teaching parameters.

This module does not perform material-parameter fitting, first-principles downfolding, finite-temperature calculations, spectroscopic transition-matrix-element calculations, infinite-chain Bethe Ansatz, or finite-size scaling. Spectra, densities, and short-range correlations of 2–4-site clusters cannot determine a thermodynamic Mott transition, critical U, or long-range magnetic order. The one-dimensional Lieb–Wu exact solution provides independent background for the infinite uniform model; its conclusions do not transfer directly to staggered site potentials, odd rings, or arbitrary real materials.

## Primary sources

- [J. Hubbard, Electron correlations in narrow energy bands, Proc. R. Soc. Lond. A 276, 238–257 (1963)](https://doi.org/10.1098/rspa.1963.0204): original paper on local repulsion and narrow-band models. Publisher access may be restricted; bibliographic details can also be checked in the [university-hosted original](https://users.wfu.edu/natalie/s15phy752/lecturenote/2414761.pdf).
- [D. J. Carrascal et al., The Hubbard Dimer: A density functional case study of a many-body problem, J. Phys.: Condens. Matter 27,393001 (2015)](https://arxiv.org/abs/1502.02194): symmetric/asymmetric dimers, density, energies, fundamental gaps; DOI [10.1088/0953-8984/27/39/393001](https://doi.org/10.1088/0953-8984/27/39/393001).
- [E. H. Lieb and F. Y. Wu, Absence of Mott Transition in an Exact Solution of the Short-Range, One-Band Model in One Dimension, Phys. Rev. Lett. 20, 1445–1448 (1968)](https://doi.org/10.1103/PhysRevLett.20.1445): background on the exact infinite uniform one-dimensional solution; this site does not implement that solution method.

Sources support definitions and analytic checks; explanations and exercises are newly written here. Complete material models and thermodynamic conclusions in the literature are not presented as results already obtained from small clusters.
