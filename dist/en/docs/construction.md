# Representation construction, finite wave vectors, and momentum-dependent degeneracy

Version: `20261030-construction1`.

This update adds 3 topics, 9 lessons, 9 four-step exercises (36 steps), 9 material/model cases, 21 presets, 6 prediction-verification questions and 3 three-stage cross-module projects. The project center retains 17 existing assignments, giving 20 total. The formula dictionary adds 12 entries after the previous 94, giving 106 entries and 39 source records.

The three topics use existing classrooms, computation center, material atlas, research records, and parameter comparisons. The five main navigation entries, seven routes, enlarged 18px font, and shared formula layout remain.

## Entry points and models

| Topic | Computation entry | Learning route | Actual computational scope |
| --- | --- | --- | --- |
| Symmetry-adapted bases and unified selection rules | `#compute/salc-lab` | Representation fundamentals | Four orthogonal scalar orbitals of C₄ᵥ, with one or two equivalent copies |
| Finite- wavevector  order and  supercell  | `#compute/wavevector-lab` | Structure and dynamics | N=2/3/4 commensurate scalar modes of a known square layer |
| Screws, glides and momentum-dependent degeneracy | `#compute/nonsymmorphic-lab` | Crystal symmetry | Periodic two-/four-band models of three-dimensional operations along a one-dimensional momentum line |

Material cases enter `#atlas/construction`, cross-module assignments `#atlas/projects`, and the dictionary `#docs/dictionary`.

###  symmetry-adapted basis  and  selection rule

Coordinates generate actual permutation matrices; character projection obtains isotypic components, while matrix-element projection obtains partner functions. The four-orbital representation decomposes as A₁+B₁+E; two copies demonstrate mixing of equivalent irreducible-representation copies and Schur structure.

Selection rules use containment multiplicities in finite-group products; actual intensities additionally require specified-operator matrix elements between states. The interface distinguishes “symmetry allowed” from “currently nonzero matrix element.” Finite-group selection multiplicities are not general SU(2) CG coefficients, and arbitrary material structures do not automatically generate orbital models. See [SALC notes](salc.md).

### Finite q and  supercell

Generate the full q star under C₄ᵥ, pair q and −q and construct real modes; a self-conjugate boundary arm retains one real degree of freedom. The parent group is the finite quotient `(Z_N×Z_N)⋊C4v` for the declared supercell. The program finds the actual field’s stabilizer, enumerates all patterns and translation domains, and directly computes the DFT.

A rectangular period need not be the smallest oblique cell; the minimal translation index follows from translations actually preserved. Scalar Fourier weights omit atomic scattering factors, displacements, and magnetic polarization geometry. Amplitude and phase do not prove the pattern is a stable material phase. See [finite-wave-vector notes](wavevector.md).

### Screws, glides, and momentum-dependent degeneracy

The model uses strictly periodic Bloch bases and matrices to show momentum phases from half-translations, single-/double-valued square relations, operation labels inside degenerate energy blocks and Kramers pairing at both endpoints.

Protection checks include the operation little group, TRIM conditions, time reversal, and operation symmetry. Replay reveals cross-cell phase origins; added mass or time-reversal-breaking terms give calculable gap-opening counterexamples. Direct gaps are checked by full-line minima or analytic bounds, not used to claim a real three-dimensional material is insulating. See [nonsymmorphic-operation notes](nonsymmorphic.md).

## Shared interactions

**Representation construction replay.** Each step carries actual matrices, vectors or sites: SALCs use group actions and weighted projections; finite q uses star arms, conjugate real bases and pairwise superposition; nonsymmorphic models use cross-cell operations, Bloch matrices and eigensubspaces. The replay is not a schematic animation detached from the calculation.

**Group–subgroup graph.** SALC and finite-q use inclusion of actual finite-group member sets. Finite-q explicitly uses a periodic quotient group. The nonsymmorphic model's constraint graph factors out translations and the double-group center, retaining only a constraint-label quotient. Every graph states its scope and is not a complete three-dimensional space-group subgroup database.

**Minimal-breaking challenges.** SALC enumerates removal of declared  generator  constraints to meet a linear target; removal does not automatically cause physical distortion. Nonsymmorphic challenges add actual Hamiltonian terms and check symmetries/gaps. These distinguish mathematical constraint changes from explicit model changes.

**Matrix and subspace assignments.** Shared Python grading compares target ranks, projectors and required invariance. A submitted basis may have different normalization, global complex phases or any full-rank internal basis change; spanning the target space is sufficient. Incorrect dimensions, wrong subspaces and incompatible projections still fail. Tasks and answers are public teaching data, not an examination anti-cheating system.

**Predictions, comparisons, and formula links.** Six questions record predictions before calculation; explanations connect current numbers with formulas. A/B comparison retains inputs and raw results, overlaying curves only for compatible models and coordinates. New dictionary entries require reliable context and retain the previous 94 entries and 34 sources.

## Evidence limits for cross-module projects

Three projects connect representations to selection rules, finite q to mode-induced alternating potentials, and momentum-partner pairing to symmetry-breaking diagnostics. Cross-model conversions explicitly state input mappings and units; they do not promise automatic Hamiltonian derivation from material structures. Every stage requires calculated evidence with matching parameters and stepwise notes.

Saving and completion counts do not mean free-text derivations have been automatically judged correct. New automatic grading applies only to explicitly specified finite-matrix and subspace assignments.

## Validation and release provenance

The three physics cores and shared grading run in browser Python/NumPy. Independent tests check finite-group multiplication, projection algebra, selection-rule matrix elements, full-q subspaces, orbit–stabilizer relations, direct Fourier sums, Bloch periodicity and counterexamples to protection. Interactive fixtures come from actual Python results and include reference bases, equivalent basis changes and real grading interactions for incorrect answers.

Validation entry: `npm run test:construction`. Full existing-feature regression still uses `npm test` and `npm run test:python`.

After sources, catalogs, and fixtures are finalized, run:

```text
python scripts/refresh-construction-provenance.py
python scripts/refresh-construction-provenance.py --check
```

The refresh script verifies directory counts, question references, dictionary-prefix hashes, real calculation fixtures and cache versions, then updates source-file hashes in dependency order. Historical release, date, counts, coverage and provenance statements are retained; the Python registry adds three physics cores and `symmetry_grading`. Manifest dependency cycles fail with a reported path. `--check` does not write files.

[Sources and file list for this version](../data/construction-provenance.json) collect original papers, author notes, and official documentation. Numerical presets are labeled teaching models; real-material names provide mechanism context, not fitted parameters.
