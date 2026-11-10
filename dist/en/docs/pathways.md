# From lesson derivations to reproducible computation

Version: `20261029-pathways1`. This extension connects site-induced band representations, one-phonon scattering, domain walls/localized states and Hubbard clusters to existing lessons, computations and research records. The four topics contain **14 lessons, 14 stepwise exercises (56 steps), 14 cases and 26 presets**; the formula dictionary has **66 entries**. Existing tools, records and the 18px base font are retained.

Read classroom derivations and complete exercises, change one parameter in a computation preset, then inspect results and diagnostics. Compare applicability in [material/model cases](../index.html#atlas/pathways), or collect evidence and explanations in [cross-module projects](../index.html#atlas/projects). [Material research records](../index.html#atlas/notebook) save original inputs, results, and versions, with export and restoration.

## Computational scope of four themes

|Topic and lesson entry|Actual computation|Check before use|
|---|---|---|
|[From site orbitals to band representations](../index.html#classroom/crystal?module=bandrep)|Single-valued s/p site induction, Bloch action, and little-group decomposition for selected ordinary groups 2,4,19,221|Uses this site's BC primitive setting, with SG4 screw along z. Local D indices cannot be matched across runs directly. No general EBR diagnosis, global topology, or band energies. See [methods/sources](band-representations.md).|
|[One- phonon   dynamic structure factor ](../index.html#classroom/observables?module=scattering)|Relative one- phonon  S(Q, E) for a 1D diatomic longitudinal harmonic chain, with coherence, Q projections, Bose occupations|Distinguish full Q/reduced q; balance checks unbroadened weights. Low-energy cutoffs, Gaussian broadening, sampling affect plots; broadenings are not calculated lifetimes. Arbitrary Phonopy files are not accepted as scattering inputs. See [methods/sources](dynamic-scattering.md).|
|[Domain walls and localized states](../index.html#classroom/structure-dynamics?module=domainwall)|Finite-grid walls of continuous scalar φ⁴ free energy and an independent finite SSH electronic chain|A small residual for a center-fixed stationary point does not prove unconstrained stability: compare Hessians for the center-fixed and all-interior degrees of freedom. SSH center/edge statistical regions may overlap, so weights cannot simply be added; φ⁴ width does not map automatically to electronic hopping. See [methods and sources](domain-walls.md).|
|[Small Hubbard clusters](../index.html#classroom/spin?module=hubbard)|Exact diagonalization, density, double occupancy, spin correlations, and U scans for 2–4-site single-band models|Spectra/local observables belong to fixed (N↑,N↓). Charge gaps require minimizing across all Sz at each neighboring N. Dimer S/T splitting is separately defined. Finite clusters do not determine thermodynamic Mott transitions. See [methods/sources](hubbard-clusters.md).|

Entries `#compute/band-representation-lab`, `#compute/dynamic-scattering-lab`, `#compute/domain-wall-lab`, `#compute/hubbard-cluster-lab`. Material/structure names motivate problems; presets are not automatically fitted parameters. Interpret results with models, units, boundaries, gauges, cutoffs, and diagnostics.

## Four new cross-module projects

The [project page](../index.html#atlas/projects) retains three transverse-response and three spectroscopy assignments and adds four, totaling ten. Each new project has three stages: calculate within required parameters, then collect results, derivations, and conclusions. Completion counts record calculations and explanations, not automatic correctness. Full project JSON retains arrays; Markdown reports give parameters, evidence summaries, and notes.

|Project|Evidence path|Key limit|
|---|---|---|
|From real-space sites to a screw-axis little group|Γ and kz=1/2 representations of the same s orbital in SG4, then little-group factor-system checks in the workbench|Fix the BC z-axis setting and periodic Bloch gauge; compare by operations and characters. ±1 and ±i are symmetry eigenvalues, not energies, and prove neither EBR status nor topological bands.|
|From oscillator thermal occupation to two-sided phonon scattering|Einstein/Debye thermodynamics, then 0 K versus 300 K scattering for the same diatomic chain and Q|3D 3n-mode heat-capacity normalization differs from single-Q scattering of two longitudinal branches. Shared Bose statistics do not equate heat capacity quantitatively with peak areas. Detailed balance concerns unbroadened weights.|
|SSH bulk to interface states|Periodic Zak phase → finite t=0.8 eV, δ=0.25 interface → add only central potential|Asymptotic 0.6/1.0 eV bonds match, but periodic bands/finite levels need separate calculations. Distinguish ends, interfaces, energy windows; this electronic model is independent of φ⁴  domain wall .|
|Distinguish local Hund spin from intersite superexchange|Five-orbital single-ion Hund mechanism, followed by the two-site single-orbital dimer at U=4 and 12 eV|The Hamiltonians and Hilbert spaces differ; numerically equal U does not establish a projection mapping. Compare exact S/T splitting with 4t²/U errors without calling a finite-Sz-sector gap a universal spin gap.|

These projects connect questions, mechanisms, and checkable numerical evidence. Only explicitly stated parameter correspondences carry across stages; several calculation pages must not be assumed to solve the same Hamiltonian jointly.

## Formula/symbol dictionary

The [dictionary](../index.html#docs/dictionary) searches definitions, variables, units, coordinate conventions, applicability and sources. Click supported page formulas to see their preserved original text and matching explanations together.

A letter can denote different physical quantities. The dictionary disambiguates using current lesson/calculation context, full formulas, and registered aliases. It lists alternatives when ambiguous and gives an unknown notice without reliable recognition. Looking up a term neither changes formula source nor substitutes dictionary expressions. Follow lesson, calculation, and source links to review context.

## Content/sources

The [lesson, preset, exercise and case catalog](../data/pathways-materials.json) contains 13 source records linked from lessons by source ID; the [formula dictionary catalog](../data/formula-dictionary.json) retains 66 entries and their sources. [Cross-module project definitions](../pathways-projects.js) preserve stage-parameter requirements, derivation tasks and self-check criteria. Four method documents separately give conventions, analytical checks and references; literature background does not replace the actual implementation scope.

Main sources include Cano, Elcoro, and Bilbao on site representations/Bloch induction; Phonopy on one-phonon formulas/dynamical matrices; Tong's scalar domain-wall notes and original SSH papers; and Hubbard, Carrascal, Lieb–Wu model papers. Exact titles, links, and supported content appear in the catalogues/method notes above. Explanations and exercises are newly written here.

## Validation/provenance maintenance

Run the following from the project root:

```text
npm run test:pathways
python scripts/refresh-pathways-provenance.py
python scripts/refresh-pathways-provenance.py --check
```

`test:pathways` runs physics checks for four Python models plus classroom, project, and dictionary tests. After modifications, refresh scripts retain historical release/counts and records, append module/version provenance, and generate the current manifest. Final `--check` is read-only: it checks content/provenance consistency without refreshing, packaging, or publishing. Passing tests still requires browser inspection of formulas, plots, warnings, and navigation; numerical checks do not expand model scope.
