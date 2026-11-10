# Identical particles, topological defects, and reciprocal response

Version: 20261031-connections1. 9 lessons,36 guided choice steps,19 presets,6 prediction questions,9 material/model cases, and 3 cross-module projects. Existing lessons, enlarged fonts, formula layout, and research records remain.

## Computational and teaching scope

- `statistics_lab`: full exchange and antisymmetric projection in two-electron orthogonal two-orbital × spin space, with exact rational/radical amplitudes; S₃ central projectors for three two-level factors and a Young operator for a specified tableau. The latter satisfies Y²=3Y; Y/3 is idempotent but not Hermitian. This is not a solver for arbitrary S_n representations or multiorbital atomic energies.
- `defects_lab`: analytic XY/planar-nematic textures, positive/negative cores, movable loops,256-segment winding, and core-distance/analytic-charge checks; Ising tanh profiles. The planar nematic is RP¹, not three-dimensional RP². Core-separation changes alter configurations only, without dynamics or guaranteed stability.
- `reciprocity_lab`: dimensionless entropy-conjugate linear response for two-dimensional Hall response, two even thermoelectric channels and an abstract even/odd pair. Fully reverses B and M, checking variable parity, spatial covariance and eigenvalues of the symmetric dissipation matrix. Thermoelectric matrix elements are not directly unconverted experimental Seebeck/Peltier coefficients. Spatial rotations act only on the spatial Hall components.
- `symmetry_audit`: unitary σz or antiunitary iσy K transformations of an independent two-level model. It computes separate invariance residuals for H,ρ,O, distinguishing the model, instantaneous state, and probe. The Bloch length of ρ is restricted to [0,1], avoiding unphysical density matrices.
- `symbolic_step_grade`: six specified identities, with restricted syntax-tree parsing of exact integers/arithmetic and no eval or arbitrary execution. Grading assumes explicit projection normalization, exchange signs, winding, reciprocity expressions, and commutator coefficients; arbitrary prose proofs are not graded.

All cores run in Python inside a browser Worker and match the downloadable CPython sources. Basic calculations require NumPy and SymPy, downloaded on demand on first use. Inputs, learning progress and research records remain in the browser.

## Classroom entry points

- Foundations and representations: `#classroom/foundations?module=statistics`.
- Structure, phase transitions and experiments: `#classroom/structure-dynamics?module=defects`.
- Material properties and spectra: `#classroom/observables?module=reciprocity`.
- Standalone diagnostic bench: `#compute/symmetry-audit`; all calculation pages provide shortcuts.
- Material atlas: `#atlas/connections`; cases explicitly distinguish real-material background from the actual computational model.

## Evidence and exercises

Experiments provide derivation replay, counterexamples, relevant symbolic grading among six task types, and a three-level diagnostic bench. Changing answers, diagnostic inputs, or main parameters invalidates old grades as evidence for new inputs. Async results carry request numbers and cannot overwrite new pages after navigation.

For an A/B comparison, explicitly pin A, calculate B with modified parameters, then save the comparison. Complete parameters, outputs, times and explanations are embedded in the current result and saved with JSON and material projects. The in-memory A anchor does not survive refresh automatically; export comparisons or add them to research records to retain them. Reports save student explanations without automatically marking the prose correct.

The three projects connect Pauli statistics to Hubbard physics, XY textures to scalar domain walls, and reciprocal response to the QWZ Hall model. Each requires stating which model changed and which assumptions were added; parameters of the later model are not claimed to be fitted automatically from the earlier one.

## Validation

`npm run test:connections` runs independent mathematical and interface tests. Python checks exchange operators, Young idempotents, complete decompositions, winding numbers and invalid loops, reciprocity/spatial covariance/nonnegative dissipation, antiunitary transformations and symbolic-input safety. UI tests use actual Python preset results, retain source and lesson hashes, and check every preset, lesson, formula, grade, record and route. `python scripts/refresh-connections-provenance.py --check` verifies the source manifest updated in dependency order.

Teaching text is independently written, with references and further reading in lessons and the dictionary. Calculations use explicitly finite models; they do not claim arbitrary homotopy-group solving, arbitrary S_n Young tableaux, real-material fitting, or automatic grading of arbitrary symbolic proofs.
