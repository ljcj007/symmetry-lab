# Magnetic resonance, superconducting junctions and multiplet spectra

Version `20261028-spectroscopy1` adds three topics, 9 lessons, 9 stepped exercises (36 steps), 9 material/model cases, 18 reproducible presets, and 3 cross-module projects. Together with 3 existing assignments, the center has 6. New content integrates into classroom routes, computations, atlas, and records, retaining five navigation entries and 18px text.

All new computations use browser Python/NumPy; UI handles parameters, plots, lessons, records. Names give context; built-in parameters are examples, not fitted/predicted materials.

## Entry points and models

| Topic | Lessons | Computation center | Main interaction |
| --- | --- | --- | --- |
| Magnetic resonance and effective spins | `#classroom/spin?module=resonance` | `#compute/spin-resonance-lab` | Static-field direction, microwave polarization, g tensors, D/E, hyperfine coupling, frequency absorption, and field-swept levels |
|Superconducting junction/Andreev reflection|`#classroom/spin?module=andreev`|`#compute/andreev-lab`|Gap, contacts, barriers, electron/hole reflections, conductance, energy scans, local spectra|
| Multiplet spectra and polarization | `#classroom/observables?module=spectra` | `#compute/atomic-spectra-lab` | Slater interactions, crystal fields, SOC, temperature, linear/circular polarization and XAS difference spectra |

Atlas entry `#atlas/spectroscopy`; projects `#atlas/projects`. Save calculation inputs, units, versions, model notes, and complete results to `#atlas/notebook`. Projects save stage-matched evidence, derivations, and conclusions and export JSON/Markdown. Completion counts record stages, not automatically graded scientific explanations.

### Magnetic resonance: energy gaps also require  selection rule /thermal occupations

Effective electron spin is `S=1/2…5/2`, with at most one nuclear spin `I=0…5/2` and maximum dimension 36. g, D/E and the axial hyperfine tensor share crystal principal axes; full diagonalization links levels, magnetic-dipole matrix elements and Boltzmann populations. Degenerate intensities use subspace traces, with equal weights over the complete ground subspace at T=0. Lines have unit area on the positive frequency axis, retaining temperature-dependent total weight and reporting window coverage and grid-integration errors.

H/h,D/E,A use GHz; fields use T. Spectra are relative magnetic-dipole weight per GHz, omitting common μB², not absorbed power or first-derivative field-modulation spectra. Effective g,D,E require separate inputs and cannot follow solely from ground S in the old SOC-free Kanamori model. Powder averages, relaxation, saturation, pulses, multiple nuclei, and direct nuclear driving are absent.

Details:[magnetic resonance/effective spins](spin-resonance-lab.md).

### NS junctions: separate quasiparticle flux, charge conductance and spin counting

A 2–32-site normal single-orbital chain joins semi-infinite normal and real s-wave superconducting leads through analytic retarded surface self-energies. Pairing occurs only in the right lead; the finite normal region has gate, single-site barrier, and both contact controls. Outputs include Rₑₑ,Rₕₑ, quasiparticle transmission, local electron/hole spectra, and conductance.

Nambu block `(e↑,h↓)`; twofold physical spin is included in `G/(e²/h)=2(1−Rₑₑ+Rₕₑ)`. SI G uses S, not sheet conductivity; LDOS is per eV per block. E=0 is zero-T, zero-bias linear conductance; nonzero E gives spectral differential conductance at fixed potential/gap. Artificial η acts only in finite regions; report `Rₑₑ+Rₕₑ+Tqp+Aη=1`/η/2 comparisons. Exact E=±Δ thresholds stay null, not zero conductance.

A transparent junction with a small gap can approach twice the normal conductance; finite bandwidth or barriers do not guarantee doubling. This version excludes finite-bias self-consistent potentials, Josephson phases, self-consistent pairing, SOC and Majorana criteria.

Details: [Superconducting junctions and Andreev reflection](andreev-lab.md).

###  multiplet  XAS: full small configurations/polarized matrix elements

Supports `p⁶d⁸→p⁵d⁹` (initial/final dimensions 45/60) and `p⁶d⁹→p⁵d¹⁰` (10/6). Complete d–d Slater F⁰/F²/F⁴ and p–d F⁰/F²/G¹/G³, crystal fields, p/d-shell SOC and z Zeeman terms use the same fermionic basis. Electric-dipole operators, all thermal initial populations and the full final space generate linear/circular polarization and difference spectra; degenerate-subspace averaging prevents arbitrary eigenvectors from changing intensities.

Energies reference the final-configuration centroid with radial dipole factor 1. Curves are relative XAS, not absolute edges, cross sections, or material chemical shifts. With SOC, ⟨S²⟩/⟨L²⟩ are not automatic atomic LS labels. Ligand charge transfer, crystalline order, RIXS, and material fitting are absent; old Kanamori U/J cannot replace Slater inputs term by term.

Details:[ multiplet  spectra/polarization  selection rule ](atomic-spectra-lab.md).

## Three new project assignments

| Project | Three stages | Comparison conditions to explain |
| --- | --- | --- |
|`spin-resonance`|Old d⁸ Kanamori ground state→specified S=1 isotropic Zeeman→D/E changes only|Effective-spin projection assumptions; g/D/E not auto-fitted; gaps, elements, occupations jointly control visibility|
| `normal-andreev` | Normal single-channel device → same-parameter NS model with Δ=0 → change only Δ=.3 eV | Fix N=12, t=1, E=.2 eV, contacts and other parameters; old output is for one spin, new G includes two; at finite η, G_NS/2 differs from old T by explicit Aη and agrees as η→0 |
| `multiplet-xas` | Old d⁸ Kanamori reference → x-polarized full Slater/SOC XAS → z-polarized XAS for the same Hamiltonian | Distinguish a changed model from changed polarization; compare relative intensities at fixed parameters and do not read relative energies as absolute experimental edges |

Existing `geometry-hall`, `ssh-device`, `orbital-multiplet` projects remain.

## Reproduction, checks and sources

Examples: `examples/spin-resonance-*.json`, `examples/andreev-*.json`, `examples/atomic-spectra-*.json`. CLI and browser use the same public Python API:

```sh
python dist/python/cli.py spin_resonance_lab dist/examples/spin-resonance-isotropic.json
python dist/python/cli.py andreev_lab dist/examples/andreev-project-paired.json
python dist/python/cli.py atomic_spectra_lab dist/examples/atomic-spectra-project-x.json
npm run test:spectroscopy
```

Tests cover spin limits, degenerate intensities, integrals, normal/NS limits, particle–hole/flux, Slater/SOC/dipole sums, presets,36 steps, routes, records. Old-feature regression still uses `npm test`/`npm run test:python`.

After all source changes, refresh provenance and then verify read-only:

```sh
python scripts/refresh-spectroscopy-provenance.py
python scripts/refresh-spectroscopy-provenance.py --check
```

The command updates only old-manifest file/module hashes and this release's provenance list. It neither rebuilds lessons, changes historical versions/counts, packages, nor commits. Release files/references are in [spectroscopy-provenance.json](../data/spectroscopy-provenance.json), excluding local `.openai` helpers.

Sources:[EasySpin conventions](https://www.easyspin.org/documentation/hamiltonian.html),[Kwant NS](https://kwant-project.org/doc/1/tutorial/superconductors),[BTK paper](https://doi.org/10.1103/PhysRevB.25.4515),[Quanty XAS](https://www.quanty.org/documentation/tutorials/nio_crystal_field/xas_l23), for methods/models. Code, exercises, parameters, plots are independent, not complete EasySpin/Kwant/Quanty ports.
