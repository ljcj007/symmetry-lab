# Many-electron  crystal field  and Hund  multiplet

This module extends the existing single-electron crystal-field plots to a **five-orbital local Kanamori model at fixed electron number**. Calculations run in browser Python/NumPy; the same `run(payload)` is reproducible through the public API and command line.

It includes cubic crystal fields, density repulsion, spin flips, and pair hopping, **without SOC**. Total spin S is therefore a good quantum number. It does not fully classify atomic LS terms or interpret one local model as a real material's magnetic ground state, transition temperature, or experimental spectrum.

## Orbital/Fock conventions

Orbitals are ordered `xy, yz, xz, x²−y², 3z²−r²`, with ↑,↓ for each. Bits from low to high correspond to these ten spin orbitals; creation operators construct Slater determinants in this fixed order. Every matrix element follows fermionic anticommutation, without treating signs of double-occupancy or exchange terms as adjustable options.

At fixed N the dimension is C(10,N), supporting N=0…10 with maximum 252. Blocks labeled `(N↑,N↓)` reach dimension 100. Only parameter-independent operator matrices are cached; changing U,J, or crystal field recalculates spectra.

Octahedral energies `(-0.4,-0.4,-0.4,0.6,0.6) Δ`; tetrahedral `(0.4,0.4,0.4,-0.6,-0.6) Δ`. Both barycenters vanish;Δ is always positive group spacing. Tetrahedral labels lack inversion g/u; no empirical splitting ratio between coordinations is imposed.

## Interactions

Interactions use intraorbital U, interorbital opposite-spin `U′=U−2J`, and interorbital same-spin `U−3J`. For all ordered `m≠n`, also add

```
−J S⁺_m S⁻_n + J P†_m P_n,
S⁺_m=c†_(m↑) c_(m↓),
P_n=c_(n↓) c_(n↑).
```

Ordered orbital pairs include  Hermitian  conjugates. Spin flips/pair hopping cannot individually disable. Spin SU(2) is retained, but common-J five-d-orbital Kanamori is **not full spherical Slater F⁰/F²/F⁴**; it generates neither real atomic LS terms nor full NiO  multiplet  spectra.

At fixed N, all U terms sum to `U N(N−1)/2`. Changing U alone therefore shifts the entire spectrum while retaining energy differences and eigenstates. The restriction `U≥3J≥0` defines the current teaching scope with nonnegative density repulsion; it does not assert that other parameters are mathematically undefined.

## Levels, degeneracies, and spin

Diagonalize H in Sz blocks, then S² within equal-energy subspaces. Group jointly by **energy and S**, separating equal energies with different S. Degeneracy includes all magnetic components; `spinMultiplets=degeneracy/(2S+1)` counts within-group spin  multiplet  copies, not orbital  irreducible representation  labels.

Orbital occupancies are trace-averaged over each complete joint subspace, avoiding arbitrary degenerate eigenvectors. The five occupancies lie between 0 and 2 and sum to N. If the ground state accidentally includes several S values, `ground.spins` retains them and `ground.S2` is their equal-weight degenerate average; this average cannot be inverted to identify a single pure-state spin.

`gap` is the spacing to the next **distinct-energy** group. If the full fixed-N space has only one energy, it is `null`, not a numerical prediction of zero excitation gap. Degeneracy tolerance scales with energy, approximately `2e−9 max(1,Δ,10J)` eV; arbitrary tiny splittings are not claimed resolved analytically.

## Inputs and outputs

| Parameter | Range/default | Meaning |
|---|---|---|
| electrons | Integer 0…10; default 6 | Fixed d-shell electron number |
| coordination | octahedral / tetrahedral | Cubic crystal-field orbital ordering |
| splitting | 0…10 eV; default 1 | Current coordination Δ |
| coulombU | 0…20 eV; default 4 | Same-orbital density repulsion |
| hundJ | 0…2 eV; default 0.6 | Hund exchange and pair-hopping strength; requires U≥3J |
| selectedGroup | Valid joint energy/S-group index, default 0 | Detailed group; out-of-range errors |
| scanMax | 0…10 eV; default 5 | Crystal-field scan upper bound |
| scanPoints | Integer 3…41; default 21 | Uniform scan count; current Δ inserted separately |

Output: `dimension`, `orbitalLabels`, `orbitalEnergies`, full `groups`, `ground`, `selection`,  crystal field  `scan`, `checks`, model notes/sources.

Each scan point returns ground energy, its difference from the ground energy at the currently selected Δ, every ground-state S, average S², occupancies and the next distinct energy gap. The scan is a finite sample and **does not locate continuous crossings or material phase boundaries automatically**; refine the interval and record parameters near crossings. Line interpolation is for display only.

Unknown parameters are rejected; in particular `soc` cannot be supplied and silently ignored. Data include no actual ligands, structural fitting, temperature, transitions, fields, or charge transfer.

## Teaching benchmarks

- `multiplet-d6-high`: N=6, octahedral, Δ=0.5, U=4, J=0.6 eV, S=2, S²=6.
- `multiplet-d6-low`: keep N,U,J fixed and set Δ=6 eV; S=0 with nearly full t₂g occupation. Pair hopping prevents an exact single t₂g⁶ determinant.
- `multiplet-d2-hund`: at Δ=0,30 S=1 states have U−3J,14 S=0 states U−J, and one S=0 U+4J.  multiplicity  sum 45=C(10,2).
- `multiplet-d8-nio`: NiO supplies local d⁸ coordination context only; the original parameters here give S=1 without claiming a fit to NiO spectra.
- `multiplet-j0`: turning J off also removes its spin-flip and pair-hopping terms, checking noninteracting crystal-field occupations and U's common shift at fixed N.

Command-line example:

```
python dist/python/cli.py local_multiplet_lab dist/examples/local-multiplet-d6-high.json
python dist/python/cli.py local_multiplet_lab dist/examples/local-multiplet-d6-low.json
```

Independent test `python scripts/test-python-local-multiplet.py` checks fermionic anticommutation, dimensions for every N, commutation of H/S², complete SU(2) multiplets, analytical two-electron spectra, independently built pair-hopping and spin-lowered states, J=0 combination spectra, U shifts, electron/hole correspondence and high-/low-spin limits.

## Sources

Model equations and complete exchange terms follow [TRIQS Kanamori definitions](https://triqs.github.io/triqs/latest/documentation/python_api/triqs.operators.util.hamiltonians.h_int_kanamori.html) and the [libcommute example](https://krivenko.github.io/libcommute/examples/kanamori.html). Many-electron NiO context and differences from full Slater models follow the [Quanty NiO ground-state tutorial](https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate). Code, parameters, derivations, and explanations are independent teaching implementations, running none of those packages and claiming no full port.
