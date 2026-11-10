# Symmetry principles:  order parameter ,  magnetic exchange , and conserved quantities

Version: `20261030-symmetry1`. Adds **3 topics, 9 lessons, 9 stepwise exercises (36 steps), 9 material/model cases, 24 experimental presets, 6 prediction-verification questions and 3 cross-module projects (9 stages)**. The project center retains 14 existing projects, giving 17; the dictionary retains 82 entries and adds 12, giving 94 entries and 34 source records. Counts come from merged catalogs, project definitions and the dictionary and are checked by release scripts. The five main navigation items, seven learning routes, 18px body text and corrected mathematical typesetting are retained.

## Classroom, computation, and case entry points

|Theme|Calculator|Lesson route|Actual scope|
|---|---|---|---|
|Order parameters and symmetry breaking|`#compute/order-parameter-lab`|Structure and dynamics|C₄ᵥ 2D and Oₕ 3D polar vectors; degree-2/4/6 invariants, stabilizers for specified directions and parent-group orbits|
|Magnetic exchange and DMI|`#compute/exchange-symmetry-lab`|Spin and magnetism|Generator constraints on a directed-bond real 3×3 exchange tensor; two classical unit spins and two quantum spin-1/2 spectra|
|Continuous symmetry/conservation|`#compute/conservation-lab`|Continuous groups|One/two spins1/2; Hamiltonian/Lindblad conservation, finite degeneracy diagnostics|

Cases are at `#atlas/principles`, projects at `#atlas/projects`, and comparisons continue at `#atlas/compare`. Each lesson shares its preset and stepwise exercise; exercises first identify representations, operations or generators, then derive constraints and interpret calculated output.

## Order parameters: specify the representation before discussing breaking

Average actual generated signed permutations to obtain all second/fourth/sixth invariants. C₄ᵥ counts1,2,2; Oₕ1,2,3. Inspect monomials, coefficients, and each  generator  equality. User η fixes  stabilizer subgroup  Hη; parent orbits obey orbit– stabilizer subgroup  counting.

External fields retain only the relevant parent subgroup and may split free energies along the parent orbit; the displayed orbit therefore need not remain degenerate. A specified η is not automatically an equilibrium point, nor a radial stationary point a stable full-space minimum. Boundedness guidance uses explicit sufficient conditions; failure means only that it is uncertified. The module does not reconstruct real atomic displacements, assign full space groups or classify Landau irreps of arbitrary members of all 230 space groups.

Passive coordinate changes transform η, external fields, and every operation together. Free energy is evaluated as F′(η′)=F(Qη′), avoiding incorrect reuse of the old component polynomial in rotated coordinates. See [order-parameter notes](order-parameter.md).

##  magnetic exchange : axial spins and bond endpoints are both essential

Spatial operation R has axial-spin matrix A=det(R)R. Preserved endpoints require J=AᵀJA; exchanged endpoints require J=AᵀJᵀA. The program builds actual linear constraints from each generator, projects into their common allowed space and shows residuals before/after projection and the source of each relation. Bond-center inversion eliminates antisymmetric DMI but need not eliminate symmetric anisotropy.

Use Hᵢⱼ=SᵢᵀJᵢⱼSⱼ, with antisymmetric part D·(Sᵢ×Sⱼ). Exchanging labels transposes J and reverses D. Passive coordinate changes alter components while preserving consistently transformed spectra. Classical arrows are unit vectors; quantum calculations use S=σ/2. Interpret results separately: a classical minimum is not a finite quantum ground state's moment. Only one abstract bond is modeled, not full crystal order or lattice magnons. See [exchange notes](exchange-symmetry.md).

## Conservation: commutators to open-system  generator

Closed systems use [h,Q]=0 with h=H/ℏ. With an environment, check the complete adjoint action L†Q rather than only the Hamiltonian or one expectation-value curve. Each Hamiltonian term and dissipative channel’s matrix contribution is viewable; actual cancellation in the total matrix is allowed, so summing individual norms cannot replace the total norm.

Hamiltonian coefficients are rad/ns and rates ns⁻¹. Time-reversal diagnostics explicitly square antiunitary operators: a single spin with T²=−I and preserved T has Kramers protection; two spins have global T²=+I and no forced Kramers pairing. Global SU(2) and coincidences unexplained by tested conditions are displayed separately. This finite model does not prove thermodynamic spontaneous breaking, Goldstone's theorem, or full-BZ degeneracy protection. See [conservation notes](conservation.md).

## Interaction, derivations, projects

All three modules share a workflow: choose a preset and record a prediction, calculate, inspect each constraint’s source, change one parameter for an A/B comparison, and use linked formulas to interpret curves and current values. Six prediction questions connect fixed presets to computational evidence; prose and project-completion records are not automatic scientific grading. Comparisons retain requirements for the same tool and compatible models, experiments and axes; parameter changes are not silently merged as one model.

Three projects connect residual order-parameter groups → bond constraints → coordinate/label conventions; DMI removal → Heisenberg exchange → continuous generators; and closed conservation → pure dephasing → density matrices. The first separately specifies bond geometry, not atomic reconstruction from abstract η. The second explicitly converts meV to rad/ns with ℏ. The third compares the same initial state, Hamiltonian, and channels pointwise, distinguishing Bloch vectors from spin expectations.

Adds  order parameter ,  stabilizer subgroup , group averages, coordinate changes, exchange tensors, DMI, symmetric anisotropy, axial spins, conservation, commutators, adjoint  generator , Kramers conditions. Context distinguishes η's  order parameter  meaning/linewidth,Γ anisotropy/ Brillouin zone  center, J exchange/angular momentum. Old entries/version statements remain.

## Reproduction and release records

`npm run test:principles` validates models, constraints, interfaces, projects, and dictionary. `npm test` and `npm run test:python` retain old regressions. New cores run entirely in existing browser Python with NumPy. Conservation reuses the density-matrix module's matrix exponential and Liouvillian; no computation server is needed.

Build catalogs with `python scripts/build-principles-catalog.py`; `python scripts/build-principles-fixtures.py`/project scripts generate real Python fixtures. Core/catalog edits require rebuilding fixtures, not hash replacement alone. Once files stabilize, run:

```text
python scripts/refresh-principles-provenance.py
python scripts/refresh-principles-provenance.py --check
```

Refresh scripts preserve historical release versions, dates, counts and coverage statements, updating existing hashes and registering three new Python cores only. Historical-manifest dependencies are recursively computed using final in-memory bytes; cycles raise errors before repeated rewrites create permanent mismatches. `--check` is strictly read-only, and repeated refreshes should produce no changes. Provenance is at `dist/data/principles-provenance.json`, independent of temporary `.openai` files; it does not package, commit or publish.

Physics/convention sources include [ISODISTORT](https://iso.byu.edu/isodistorthelp.php), [ISOTROPY](https://iso.byu.edu/isotropy_doc.php), [Moriya's original paper](https://doi.org/10.1103/PhysRev.120.91), [Tong's Noether course](https://www.damtp.cam.ac.uk/user/tong/qft/qfthtml/S1.html), [Lindblad's original paper](https://doi.org/10.1007/BF01608499), and [MIT antiunitary notes](https://web.mit.edu/8.861/www/lect_notes/Lecture15-1.pdf). Case parameters are declared teaching models, not fitted data for these materials.
