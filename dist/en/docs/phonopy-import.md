# Phonopy import and eigenvector display

The importer reads existing results; it neither runs VASP, fits force constants nor invents phonon frequencies from a structure. All files are parsed locally in browser Python.

## Files and units

- `band.yaml`: read `phonon[].q-position`, `distance`, `band[].frequency`; segment by `segment_nqpoint`, never connecting distinct segments.
- `qpoints.yaml`, `mesh.yaml` or structurally equivalent JSON: read discrete q points. Without `segment_nqpoint`, display scatter points only; even a `distance` field does not establish a continuous path.
- `phonopy.yaml`, `phonopy_disp.yaml`: prefer `primitive_cell`, otherwise use an available cell. Without a `phonon` frequency list, report structure only, not dispersion. This importer does not recalculate force constants, displacements, or forces.
- Units use explicit user confirmation or file `frequency_unit`/`physical_unit.frequency`; default “undeclared.” Confirmation labels raw values, without THz/cm⁻¹/meV conversion.
- Lattice length units are read from `physical_unit.length` and the root `length_unit`. If both declarations are equivalent, the spelling in the former takes precedence (for example, `bohr` and `au`). Conflicting declarations stop the import; no automatic conversion is performed. Without a declaration, the unit remains “input lattice unit” rather than being assumed to be Å. File path distances use the corresponding reciprocal-length unit, while q remains in fractional reciprocal coordinates.
- Results separately record the sources of the frequency and length units and the file declarations. An explicit frequency-unit choice that differs from the file declaration produces a notice; original values are retained in either case. A companion primitive cell supplies units only when the primary file has none. A unitless companion cannot erase an existing unit, and conflicting declarations in the two files stop the import.
- `total_dos.dat`: column 1 is frequency, column 2 total DOS.
- `projected_dos.dat` (often `partial_dos.dat`): column 1 is frequency; remaining columns follow primitive-cell atom order, one per atom. `XYZ_PROJECTION` requires explicit xyz mode, ordered atom 1 x,y,z, then atom 2 x,y,z. Do not mistake three xyz columns for three atoms.

DOS retains input normalization; its trapezoid integral on supplied frequencies does not automatically become 3N. Symmetry paths are not  Brillouin zone -volume sampling; frequency histograms do not generate DOS here.

## Vibrations and phases

Phonopy outputs complex Cartesian eigenvectors of the mass-weighted dynamical matrix. For a single mode this tool uses

\[
u_j(R,\phi)=\frac{A}{\max_k\|e_k/\sqrt{m_k}\|}
\operatorname{Re}\left[\frac{e_j}{\sqrt{m_j}}
e^{i2\pi q\cdot(R+r_j)-i\phi}\right].
\]

q is reciprocal  fractional coordinates , R integer-cell translation, r atomic  fractional coordinates ; vectors use Cartesian components. Lattice vectors are rows;  fractional coordinates  times lattice gives positions. Mass unweighting preserves relative atomic displacements; global display normalization does not normalize atoms separately.

Display amplitude A uses the input lattice’s length units; undeclared units are not labeled Å. The animation excludes quantum amplitudes, thermal populations and frequency factors and is not a molecular-dynamics trajectory. Positive-frequency animations scan phase at a common display speed, so playback does not indicate actual periods. Negative frequency encodes an imaginary frequency; its animation still shows only eigenvector phase and is not real-time periodic oscillation of an unstable mode.

Non-Γ modes support a finite window of 1–4 cells per direction. It is compatible with the chosen q's periodic boundaries only if every `q_i × n_i` is integer; otherwise it is explicitly a finite fragment of an infinite Bloch mode.

Missing eigenvectors, masses, positions, or lattice suppress animation. `qpoints.yaml` often includes only atom count/reciprocal lattice; supplement with same-calculation `phonopy.yaml`  primitive cell . Check counts, available lattices/species/positions/masses, and reciprocal lattice. Without original atom lists, ordering cannot be independently proven; users must ensure matching  primitive cell /order.

## Tolerances, safety and scope

By default imaginary entries have frequency `< -1e-5` in the input unit; all negative values and near-zero counts are also retained. Repeated path endpoints count as entries, not independent unstable modes. Small negatives may be numerical error, and imaginary modes alone do not prove thermodynamic transitions; convergence, adequate q sampling, and free-energy analysis are needed.

Limits:8 MiB,128  primitive cell  atoms,2000 q points,60000 q× phonon  branches,512 display atoms,20000 DOS rows. Check YAML events/depth before `safe_load`; reject custom objects, aliases, cycles, nonfinite values, bad dimensions/inconsistent counts. External file paths and embedded code are not executed.

This version does not support HDF5, compressed YAML, thermal tables, force-constant phonon calculations, automatic NAC/LO–TO corrections, automatic irrep labels or IR/Raman intensities inferred from eigenvectors. Imported frequencies, eigenvectors and DOS retain only the physical conditions included in their original calculations.

## Original teaching samples

`data/examples/phonopy-demo.yaml` is original synthetic A/B, masses1/4, two segments/18 q points/six orthonormal complex vectors each. Artificial frequencies include imaginary modes for mass unweighting, phases, breaks, tolerances. A/B are fictitious; not experimental/first-principles Si, BaTiO₃, or other materials.

<a id="official-al-example"></a>
## Official Al calculation example

“Load official Phonopy Al example” reads the unchanged official repository file `example/Al-ABACUS/abacus-pw/band.yaml`, pinned to commit `18cad919af8fe8aad349e04f101887fa19b051a0`. The site copy is `data/examples/phonopy-al-abacus-band.yaml`, with 63428 bytes and SHA-256 `08da0d622d6f423f4bc5d3900a30c9bb5dfb86933bc849f59aad60fe67ec330b`. The complete BSD three-clause license is retained at `data/examples/phonopy-al-abacus-LICENSE.txt`; provenance metadata are recorded in `phonopy-al-abacus-source.json`.

This is an official published Al / ABACUS plane-wave calculation example, not experimental data or a new first-principles calculation performed by this site. The file declares `length_unit: au` but has no frequency-unit field. The example entry explicitly selects THz, consistent with the conversion factor 21.490680 in the matching `phonopy.yaml` and Phonopy's ABACUS conversion convention. The result records this as “Explicit user confirmation”; it must not be described as frequency metadata read from band.yaml. The original electronic-structure calculation's convergence, pseudopotential contents, and force constants are not verified here.

The primitive cell has one Al atom. Its 84 q-point entries form four segments of 21 points each, with three branches per point and 252 eigenvectors in total. Repeated endpoints are retained. The original path provides no conventional high-symmetry-point letter labels, so none are invented. Of the 252 input eigenvectors, 12 have significant imaginary components (|Im|>10⁻¹², across seven q-point entries and 18 Cartesian components). Six cannot be made real by one global phase: branches 1 and 2 at q indices 66, 78, and 81, all zero-based. They therefore test relative complex phases within single-atom modes; this example still does not cover multi-atom optical branches or relative motion between atoms of unequal masses. The file contains no DOS, scattering intensities, or group velocities, and these quantities are not reconstructed from this path.

These six vectors belong to degenerate two-dimensional subspaces. A global phase of one vector and a change of basis within a degenerate subspace are different freedoms. Complex components of the chosen basis vectors alone do not establish protected physical chirality or a topological invariant.

Use the following steps for an activity with the real file:

1. Predict: How many phonon branches should a one-atom primitive cell have? Do four segments of 21 points imply 84 distinct q coordinates?
2. Read: Load the official example, explicitly select THz, and click “Read data”. Check the three branches, 84 entries, four path segments, and units `au` / `1 / au`. The 84 entries include repeated endpoints; comparing the coordinates exactly as supplied gives 81 distinct q coordinates.
3. Explain: Set the q-point index to 22, the branch index to 1, and the display supercell to `[2,2,1]`. First predict whether every `q_i n_i` is an integer, then check the notice. Here q is `(0.4937500,0.4937500,0.9875000)`, so the window is not commensurate with q. The animation is a finite window of a Bloch mode, not a periodic tiling or a thermal trajectory.
4. Test complex phase: Select q index 66, branch index 1, and a `[1,1,1]` window. Compare displacement directions at phases 0 and π/2. First predict whether the directions are parallel, then compare them with the real and imaginary parts of the supplied Cartesian components. The largest absolute imaginary part of a component-pair product v_i conjugate(v_j), which is invariant under a global phase, is approximately 0.00791858. Thus, the complex phases cannot all be attributed to one overall phase. This window is still incommensurate with q and cannot be exported as a periodic frozen structure.
5. Counterexample: Change the frequency unit back to “Unconfirmed” and read the file again. The result should show “Units undeclared”, while all frequency values remain unchanged. Declaring or confirming units and converting numerical values are different operations.

The matching official `phonopy.yaml` is also retained unchanged as `data/examples/phonopy-al-abacus-structure.yaml` (8206 bytes; SHA-256 `a5d34dc7f9ddf73066e07a9b64a53e7d9b89735d9af353de0af1a21a5512b87f`). Its Phonopy version 2.15.1, conversion factor, and Fm-3m (225) setting are source metadata, not a new determination of the electronic-structure method or convergence by this site. Select it in the supplementary primitive-cell input to test consistency between the primary and companion cells.

Sources: [original file at the pinned revision](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/example/Al-ABACUS/abacus-pw/band.yaml), [matching companion settings](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/example/Al-ABACUS/abacus-pw/phonopy.yaml), [ABACUS output-conversion documentation](https://phonopy.github.io/phonopy/abacus.html), and [physical-unit definitions at the pinned revision](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/phonopy/physical_units.py).

## Python interface

`phonopy_import.run(payload)` accepts `content` (YAML/JSON text) or `data` (equivalent object), plus `filename`, zero-indexed `selected_q`,`selected_band`, `amplitude`,`phase`,`supercell`,`frequency_unit`,`imaginary_tolerance`. Optional `structure_content`/`structure_data` supplement the primitive cell; `dos_content`,`dos_kind` import DOS. Empty optional text counts as absent.

Output `structure`, `qpoints`, `segments`, `summary`, `selection`, `animation`, `dos`, `warnings`, `sources`. `animation.frames[].positions` is all displayed atoms'  Cartesian coordinates ; `animation.atoms[].complexDisplacement` is spatial-phased, globally scaled complex displacement before time phase, usable for continuous interpolation.

`sourceIdentity` retains the input UTF-8 text's SHA-256 and byte count with exported input/results and research records. Object input is explicitly identified as a JSON representation with sorted keys, not as the original file bytes. The pinned-source identifier for the official Al example is attached only when the original text hash matches exactly. Editing one character still permits import, but the result no longer automatically claims an exact match to the official original file.

References: [Phonopy output files](https://phonopy.github.io/phonopy/output-files.html), [dynamical matrices and phase conventions](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix), [phonopy-yaml files](https://phonopy.github.io/phonopy/phonopy-yaml.html).
