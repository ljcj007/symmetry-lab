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

<a id="official-al-gamma"></a>
### Check equivalent Γ points and frozen supercells at finite q

1. **Predict, then load.** Open the [official Al phonon exercise](../#compute/phonon-modes?preset=al-gamma). Decide whether the reciprocal fractional coordinates `(1,1,1)` and `(0,0,0)` describe the same Γ point. Select “Load q = (1, 1, 1)” and “Load q = (0, 0, 0)” in turn. Each load checks the byte counts and SHA-256 digests of both original files and fills in an editable form. Run the calculation manually after each load.
2. **Compare the full acoustic subspace.** The two scenes select zero-based q indices 0 and 62 in the original file. Both should give the three-dimensional acoustic subspace T₁ᵤ for space group 225. All three frequencies retain the near-zero numerical residual of `0.0008274596 THz` from the file. The scene explicitly confirms THz and preserves the raw frequency values. The input lattice and displayed displacements use `au` (bohr). POSCAR and CIF exports convert lengths to Å.
3. **Test a boundary counterexample.** Load the boundary coordinate `(1/2,1/2,1/2)` at file index 83. Change the supercell to `[1,1,1]` and run the calculation manually. The product `q_i n_i` fails the integer condition in all three directions, so the frozen-mode tool rejects periodic export. Restore `[2,2,2]` and run again to export a displacement snapshot with eight Al atoms. This is the smallest compatible diagonal supercell. A translation by any primitive basis vector reverses the displacement. The Γ labels apply to the first two scenes.

For a polarization comparison, express the boundary q in conventional cubic coordinates using the reciprocal basis in the original file. It lies along [111]. Zero-based band 0 at 9.7063938967 THz is longitudinal. Bands 1 and 2 at 4.1396545728 THz together span the transverse plane. Switch band indices to inspect the displacement arrows and consider both degenerate bands when identifying the transverse subspace. The reduced wave vector at the folded Γ point is zero. The propagation direction here refers to this finite q.

Run `python -B scripts/test-python-al-gamma-source.py` to repeat the checks using the two distributed source files. The test covers Γ classification, raw frequencies, length conversion, rejection of an incompatible finite-q supercell, and displacement sign reversal. See the [Phonopy file import lesson](../#classroom/structure-dynamics?tab=learn&lesson=phonopy-files) for practice interpreting the file format.

<a id="zno-derived-example"></a>
## ZnO: real force data, complex eigenvectors and periodic frozen structures

“Load the ZnO derivative of real force data” loads `phonopy-zno-qpoints.yaml` and its original matching `phonopy-zno-structure.yaml` together. The original structure, `FORCE_SETS`, `BORN` and instructions come from `example/ZnO/` at official Phonopy commit `0937453a793eb504f674b7d4fd98421d508008e6`. The complete BSD three-clause license is retained as `phonopy-zno-LICENSE.txt`. The official instructions state a VASP cutoff of 500 eV and a primitive-cell 6×6×4 k mesh. These are settings of the original example, not a convergence proof performed by this site.

The frequency file is an offline derivative of these published force data, not an existing official repository `qpoints.yaml`, experimental data or a new VASP calculation. The generation environment used Phonopy 4.10.0, NumPy 2.5.4, spglib 2.8.0, symfc 1.8.0 and phonors 0.8.0, explicitly setting `fc_calculator='traditional'`, `symmetrize_fc=True`, `is_compact_fc=True` and `is_nac=False`. The original `BORN` file is retained for reference and was not used, so directional LO–TO splitting cannot be inferred from this example. The independent reproduction script, `phonopy-zno-reproduce.py`, writes only to a new output directory chosen by the user and does not run an electronic-structure program.

The distributed derivative has 55277 bytes and preserves 983 CRLF sequences from the Windows writer. Its SHA-256 is `37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5`. The original companion structure has 7641 bytes and SHA-256 `93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c`. Full upstream input hashes, the license hash, versions and generation settings are in `phonopy-zno-source.json`. Regeneration on another platform can change arbitrary overall eigenvector phases, bases within degenerate subspaces and floating-point last bits. Check eigenpairs and subspaces rather than interpreting component-byte differences as physical changes.

The primitive cell has two Zn and two O atoms with masses 65.38 and 15.9994 AMU, in structure P6₃mc (186). The frequency file supplies only four discrete q points, `(0,0,0)`, `(1/4,0,0)`, `(1/4,0,1/4)` and `(1/2,0,0)`, each with 12 branches. It declares no path segments, so the display uses scatter points rather than an assumed dispersion path. The file has no frequency-unit field. The example entry explicitly confirms THz from the original VASP units and the generator conversion factor 15.633302300230191. The companion file declares length in angstrom. Confirming the unit changes no frequency values.

In the [ZnO Γ polarization exercise](../index.html#compute/phonon-modes?preset=zno-ir), apply the published Born effective charges to the Γ-point eigenvectors. Both E₂ optical doublets have zero Born projection. The 6mm table places E₂ in the quadratic channel (x²−y², xy), so normalized teaching tensors can compare parallel and crossed polarizations. Rotating by 45° interchanges the two tensor-channel weights. The input files give frequencies and displacement eigenvectors. For Raman tensors and intensities measured in ZnO, see the original experiment. [ZnO Raman tensor measurements](https://journals.aps.org/prb/abstract/10.1103/PhysRevB.85.165208)

Use the following teaching steps and independent checks:

1. **Predict the dimension.** Derive `3N=12` from the four primitive-cell atoms before reading the data. These four q points are four input entries, not a complete Brillouin-zone mesh from which to integrate DOS, heat capacity or scattering intensity.
2. **Select the mode.** The initial selection is q index 2 and branch index 10, both counted from 0, at frequency 13.5565890715 THz and q=`(1/4,0,1/4)`. The nearest other branch is separated by about 0.1496572253 THz. Inspect the complex eigenvector before comparing animation phases 0 and π/2.
3. **Recover physical relative displacements.** Compute `w_j=e_j/√m_j` for each atom, use one common scale `A/max_k||w_k||`, then take `Re[w_j exp(i2π q·(R+r_j)−iφ)]`. Do not normalize both Zn and O displacements individually to A or discard imaginary components before mass unweighting. The phases φ=0 and π/2 expose the real and imaginary parts after including the spatial phase. The nonzero phase invariant `max_ab |Im(e_a conjugate(e_b))|≈0.2126498074` shows that one overall phase cannot make the selected input vector real; this alone is not a chirality or topology diagnosis.
4. **Predict periodicity.** The initial `[4,1,4]` supercell makes every `q_i n_i` an integer and contains `4×4×1×4=64` atoms. Changing the first entry to 3 still permits a finite-window animation of the infinite Bloch mode, but the frozen-mode tool rejects export as a periodic cell.
5. **Transfer and export manually.** Click “Send the current file to mode identification and frozen modes”, inspect both original texts, units, q, branch and supercell, then run manually. The POSCAR should contain 32 Zn and 32 O atoms. The CIF uses P1 and retains every displacement. These are snapshots at the chosen amplitude, not energy-minimized structures, automatic space-group determinations or thermal trajectories.
6. **Inspect Γ subspaces.** Select q index 0 and use complete frequency clusters to check closure and characters under structural operations. The current label tables do not cover C6v, so the output retains computed characters without assigning cubic-group labels. The three near-zero acoustic frequencies do not by themselves establish a structural phase transition.
7. **Test counterexamples.** Change the frequency unit back to unconfirmed. The frequency array must remain identical entry by entry while its unit label becomes undeclared. Adding a space to the primary file still permits import as your own data, but removes the exact-match ZnO provenance identifier. Changing only whitespace in the companion changes its actual hash; the result must report that it is no longer a byte-for-byte match. The primary-file hash alone cannot certify atomic order.

Reference checks cover all 48 eigenpairs, a complete orthonormal basis at every q point, mass unweighting, complex spatial and time phases, and all POSCAR coordinates of the 64 atoms. The native YAML prints finite decimal places in dynamical matrices; substituting the serialized eigenpairs gives a maximum residual of about 1.72×10⁻¹⁰. This is serialization precision. These checks do not replace convergence analysis of the original VASP calculation or invent DOS, IR/Raman intensities, finite-temperature quantum amplitudes or a final transition structure.

Sources: [pinned ZnO inputs and official instructions](https://github.com/phonopy/phonopy/tree/0937453a793eb504f674b7d4fd98421d508008e6/example/ZnO), [complete license at the pinned revision](https://github.com/phonopy/phonopy/blob/0937453a793eb504f674b7d4fd98421d508008e6/LICENSE), [Phonopy 4.10.0 release](https://pypi.org/project/phonopy/4.10.0/), [dynamical-matrix and displacement convention](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix), and [qpoints output convention](https://phonopy.github.io/phonopy/output-files.html#qpoints-yaml).

## Python interface and source identity

`phonopy_import.run(payload)` accepts `content` (YAML/JSON text) or `data` (equivalent object), plus `filename`, zero-indexed `selected_q`,`selected_band`, `amplitude`,`phase`,`supercell`,`frequency_unit`,`imaginary_tolerance`. Optional `structure_content`/`structure_data` supplement the primitive cell; `dos_content`,`dos_kind` import DOS. Empty optional text counts as absent.

Output `structure`, `qpoints`, `segments`, `summary`, `selection`, `animation`, `dos`, `warnings`, `sources`. `animation.frames[].positions` is all displayed atoms'  Cartesian coordinates ; `animation.atoms[].complexDisplacement` is spatial-phased, globally scaled complex displacement before time phase, usable for continuous interpolation.

`sourceIdentity` retains the input UTF-8 text's SHA-256 and byte count with exported input/results and research records. Object input is explicitly identified as a JSON representation with sorted keys, not as the original file bytes. The pinned-source identifier for the official Al example is attached only when the original text hash matches exactly. Editing one character still permits import, but the result no longer automatically claims an exact match to the official original file.

The ZnO `sourceIdentity.reference` also appears only when the distributed derivative qpoints text hash matches exactly; its `kind` explicitly identifies a derivative of official force data. The `reference.companion` records actual and expected SHA-256 values, byte count, input representation and `matchesPinnedSource`. Only an exact UTF-8 text hash certifies this pinned companion file. When an object input takes precedence over accompanying text, the recorded hash describes canonical JSON for that object; unused original text is not treated as evidence. Original input hashes, the Phonopy version, NAC and force-constant settings remain with the result for checking during transfer, JSON export and research recording.

References: [Phonopy output files](https://phonopy.github.io/phonopy/output-files.html), [dynamical matrices and phase conventions](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix), [phonopy-yaml files](https://phonopy.github.io/phonopy/phonopy-yaml.html).

## From complete modes to three-dimensional neutron scattering

Copy the two current source inputs into the independent Phonopy modes → Neutron scattering tool, complete the unit, primitive-order, probe-length and thermal conditions, and calculate manually. That tool rereads all 3N complex vectors at each required supplied q; the selected-mode animation here retains its original purpose. See [Three-dimensional Phonopy neutron scattering](phonopy-scattering.md).
