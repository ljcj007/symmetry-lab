# Electronic states, nonlinear optics, and supercell spectra

Connect existing  point group , spin representations,  physical-property tensor , and distortions to three browser calculators. Shared catalog `data/electronic-materials.json` has 9 lessons,9 exercises,36 guided questions,16 runnable presets, and 8 material/model cases.

## Learning and computation entries

| Topic | Classroom | Computation center | Case |
| --- | --- | --- | --- |
| Superconducting pairing/BdG | `#classroom/spin?module=pairing` | `#compute/pairing-lab` | Square pairing, Kitaev chain |
| Nonlinear optics and SHG | `#classroom/observables?module=shg` | `#compute/shg-lab` | Symmetry background for GaAs, BaTiO₃ and Si |
| Supercells, defects, and unfolding | `#classroom/crystal?module=unfold` | `#compute/unfold-lab` | Periodic impurity chains, dimerized chains, and actual VASP workflows |

Unified cases: `#atlas/electronic`. Every topic offers explanation, experiment, guided exercise, and material case. Exercises advance one step, with wrong-answer hints/right-answer reasoning and local progress. Inputs, results, and limits export and connect to existing research records.

## Three learning routes

**Superconducting pairing** starts from Δ(k)=−Δᵀ(−k), distinguishes spin, spatial, and orbital indices, then classifies s, extended-s, d, and complex d+id on a square lattice. The normal Fermi surface and pairing function are shown together; zero-energy nodes require ξ=0 and Δ=0 simultaneously. The Kitaev chain links odd-momentum pairing, bulk transitions, and low-energy open-chain weights. When the bulk is gapped, |μ|<2t identifies this model's topological interval.

**SHG** retains correct χ_ijk(2ω;ω,ω) frequency labels, then intrinsic j↔k permutation and full  point group  covariance. Td,4mm, Oh have 1,3,0 components. Vary cuts, incidence, and complex coefficients across four polarization channels; inverse exercises expose nonidentifiability from global phase/geometric extinction.

**Supercell unfolding** first uses a perfect chain to distinguish folding from physical changes, then introduces the phase projection W_n(k)=|Σ_j exp(−ikj)c_jn|²/N. Impurities, dimerization, alternating onsite potentials and vacancies that actually remove orbitals illustrate different forms of translation-symmetry breaking. Finally, it reviews the information needed for VASP wavefunction postprocessing and distinguishes general three-dimensional unfolding from this site’s bounded one-dimensional model.

## Inverse-reasoning exercises

Exercises require both substitution and recognizing multiple explanations of the same observation:

- Zeros of the pairing function need not be zero-energy nodes; functions belonging to A₁g may still have different nodal structures.
- One near-zero eigenstate alone cannot prove a topological boundary mode, much less replace experimental assessment of a real material.
- χ/−χ give identical independent intensity plots; one zero SHG channel cannot uniquely establish  inversion symmetry .
- A geometric projection of a third-rank tensor in 4mm can give a constant angular spectrum; this does not turn the crystal point group into a continuous group.
- Similar gaps in unfolded spectra can result from different perturbations; phases, orbitals, and structural evidence remain important.

Direct checks: t=1, μ=−1 d-wave nodes cos kx=cos ky=1/4; GaAs (001) at θ=φ=45°, χ_xyz=1 gives I_PP=1/8; uniform N=2 unfolding weights [1,0]; deleting one N=4 orbital gives fixed-k total weight 3/4.

## Model scope and material connections

| Module | Implemented scope | Still requires external data or further implementation |
| --- | --- | --- |
| Pairing | 2D single-orbital spin-singlet square model, finite open Kitaev chain; full BdG checks, analytic nodes/bulk gaps, end weights | Self-consistent gap equations, multiorbital strong-SOC pairing, real critical temperatures,  transport /Majorana experimental predictions |
| SHG | Full Td/4mm/Oh point-group constraints, real/complex coefficients, two cuts and Euler orientation, relative angular spectra in four channels | Fresnel and dielectric interfaces, multilayer propagation, surface/multipole contributions, actual optical coefficients, experimental fits and absolute optical power |
| Unfolding | One orthogonal orbital per 1D primitive cell, 2–12-fold supercells, small models, and strictly preprocessed JSON | Direct general 3D VASP/WAVECAR import, nonorthogonal multiorbital projection, full ARPES photoemission matrix elements |

GaAs, BaTiO₃, Si give real symmetry context, but χ values are illustrative, not measured. Square pairing/Kitaev parameters are not assigned to materials. Impurities/vacancies repeat with  supercell , not as isolated defects.

The pairing core uses a common arbitrary energy unit; unfolding presets use eV and a=1. SHG uses common arbitrary χ and field units, with input field amplitude 1 and no independent normalization of the four channels. Arbitrary-unit values from different modules must not be treated directly as the same measured quantity.

## Data and reproducibility

Cores `python/pairing_lab.py`, `python/shg_lab.py`, `python/unfold_lab.py` depend only on NumPy. Every preset runs the actual Python entry and is tested for JSON encoding without NaN/Infinity.

Unfolding imports must include complete normalized complex eigenvectors, retained orbital positions and an explicit supercell Bloch-phase convention. Energy-only inputs are rejected. Missing orbital spectral weight caused by defects is not automatically renormalized to 1; for degenerate subspaces, users are reminded to compare summed weights.

Content validation: `python scripts/test-python-electronic-content.py`. It checks catalogue structure, runnable presets, lesson/source references, answer ranges, and agreement of selected analytic lesson results with the core calculation. Each core also has independent physics tests.

## Method sources

Lesson text, questions, analytical examples and synthetic parameters are original to this site. Related software is cited for methodological background, not as a claim that all its functionality has been integrated.

- [Kwant superconductivity and particle–hole tutorial](https://kwant-project.org/doc/latest/tutorial/superconductors)
- [Kitaev：Unpaired Majorana fermions in quantum wires](https://arxiv.org/abs/cond-mat/0010440)
- [Topology in condensed matter：Kitaev chain](https://topocondmat.org/w1-topointro/d-1/)
- [Official ShgPy documentation](https://bfichera.github.io/shgpy/)
- [Yambo angular dependence of nonlinear response](https://wiki.yambo-code.eu/wiki/index.php?title=Angular_dependence_of_non-linear_response)
- [easyunfold unfolding theory](https://smtg-bham.github.io/easyunfold/theory.html)
- [easyunfold/VASP workflow](https://smtg-bham.github.io/easyunfold/tutorial.html)
