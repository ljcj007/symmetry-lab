# Phonopy import and eigenvector display

The importer reads existing results; it neither runs VASP, fits force constants nor invents phonon frequencies from a structure. All files are parsed locally in browser Python.

## Files and units

- `band.yaml`: read `phonon[].q-position`, `distance`, `band[].frequency`; segment by `segment_nqpoint`, never connecting distinct segments.
- `qpoints.yaml`, `mesh.yaml` or structurally equivalent JSON: read discrete q points. Without `segment_nqpoint`, display scatter points only; even a `distance` field does not establish a continuous path.
- `phonopy.yaml`, `phonopy_disp.yaml`: prefer `primitive_cell`, otherwise use an available cell. Without a `phonon` frequency list, report structure only, not dispersion. This importer does not recalculate force constants, displacements, or forces.
- Units use explicit user confirmation or file `frequency_unit`/`physical_unit.frequency`; default “undeclared.” Confirmation labels raw values, without THz/cm⁻¹/meV conversion.
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

## Python interface

`phonopy_import.run(payload)` accepts `content` (YAML/JSON text) or `data` (equivalent object), plus `filename`, zero-indexed `selected_q`,`selected_band`, `amplitude`,`phase`,`supercell`,`frequency_unit`,`imaginary_tolerance`. Optional `structure_content`/`structure_data` supplement the primitive cell; `dos_content`,`dos_kind` import DOS. Empty optional text counts as absent.

Output `structure`, `qpoints`, `segments`, `summary`, `selection`, `animation`, `dos`, `warnings`, `sources`. `animation.frames[].positions` is all displayed atoms'  Cartesian coordinates ; `animation.atoms[].complexDisplacement` is spatial-phased, globally scaled complex displacement before time phase, usable for continuous interpolation.

References: [Phonopy output files](https://phonopy.github.io/phonopy/output-files.html), [dynamical matrices and phase conventions](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix), [phonopy-yaml files](https://phonopy.github.io/phonopy/phonopy-yaml.html).
