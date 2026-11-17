# From Phonopy files to three-dimensional neutron scattering

Open Phonopy modes → Neutron scattering in the calculation center, or create a new input copy from an existing Phonopy import. The tool uses all frequencies and 3N complex eigenvectors at the selected supplied q point, together with the lattice, positions and masses of the same primitive cell. The existing animation, frozen-mode and one-dimensional chain tools retain their own inputs.

## Complete the calculation from one consistent dataset

1. Load qpoints.yaml, band.yaml or mesh.yaml containing complex eigenvectors, and supply the primitive structure from the same calculation when needed. Its atom order must match the vectors. Frequencies alone, one animated mode or species counts do not replace the complete ordered mode space.

2. Check frequency, length and mass units, and confirm the Phonopy atomic-position phase convention and paired primitive-cell order. Resolve conflicts between file declarations and selected units before calculation. THz denotes cyclic frequency, converted with hν; cm⁻¹ and meV use their explicitly declared conversions.

3. Select a supplied q index and integer reciprocal offset G, or enter full Q with its coordinate convention. Creation requires Q−q to be an integer reciprocal vector; annihilation requires Q+q to be one. The calculation retains the file’s original q representative and vectors, and reports the matching residual.

4. Enter real coherent neutron lengths per atom or per species in fm, retaining their source. These signed lengths enter amplitudes; they are not atomic probabilities or cross sections to add directly. The ZnO example uses the NIST natural-isotope averages, 5.680 fm for Zn and 5.803 fm for O.

5. Choose the Debye–Waller treatment explicitly: omit it as a controlled approximation, or supply Cartesian displacement tensors in Å² for the same primitive cell, atom order and temperature. Zero temperature still has zero-point motion and does not automatically imply zero displacement.

6. Set temperature, positive-energy cutoff, energy window and Gaussian standard deviation, then calculate manually. Inspect units, mode completeness and momentum matching before following atomic projections, structural phases, amplitude sums and spectral weights. Result selectors browse the current reply.

7. Retain both actual inputs, calculation conditions and results when exporting. A research-record input copy can be edited and run manually. Copying or opening a record neither calculates nor rewrites the source record.

## Three-dimensional momentum and phase

The primitive lattice A stores rows in Å, with reciprocal row basis B=A⁻ᵀ excluding 2π. Primitive reciprocal fractions give Qcart=2π Qfrac B; Cartesian input converts back as Qfrac=Qcart Aᵀ/(2π). A nonorthogonal lattice requires the full matrix, rather than treating its three fractional components as Cartesian components.

For creation, atom j contributes aj=bj exp(−Wj) exp[2πi G·rj] [Qcart·conjugate(ej)]/√mj, where G=Qfrac−qfrac. Contract the three Cartesian components of each atom first, then add the complex atomic amplitudes coherently. Squaring Cartesian components separately would change the calculation.

Phonopy modes include an atomic-position phase. Replacing q by another reciprocal representative requires the corresponding atomic phase transformation of the vectors. The tool therefore matches the original supplied q. Missing points require additional data; nearby points or vectors from another representative are not substituted.

Annihilation uses an actual supplied mode with Q+q reciprocal, with ej and exp[2πi(Qfrac+qfrac)·rj] in its atomic term. Both channels check their required data separately; the opposite mode is not inferred from external input with undeclared time-reversal properties.

## Thermal motion, energy and intensity units

For a supplied tensor Uj, Wj=Qcart Uj Qcartᵀ/2. The tool checks temperature, Å² units, atom count, symmetry and positive semidefiniteness, and records the conditions actually used. Four independent q points do not form a complete thermal mesh and cannot supply invented finite-temperature ZnO tensors.

Retained positive-energy branches have bare line weight C|Σj aj|²/E, with C=ℏ²/(2 amu) converted using Å and meV. Creation multiplies by n+1 at energy transfer +E; annihilation multiplies by n at −E. Nonpositive frequencies and terms below the cutoff are excluded before evaluating inverse energy or occupation.

With lengths in fm, integrated line weights are in fm² and unit-area meV Gaussian densities are in fm²/meV. Results are per primitive cell with final/initial probe-wavevector ratio k′/k=1. Experimental comparison requires consistent Debye–Waller treatment, probe kinematics and sample normalization. The supplied broadening is a resolution model, not a calculated lifetime.

Full-axis line weights and finite-window integrals are reported separately. Gaussian window integrals use the error function, with sampled integration reported independently. Weight outside a narrow displayed window does not mean that a mode has disappeared.

## Phase, complete bases and numerical grouping

Each q point participating in the selected channels must contain all 3N finite complex vectors and pass norm and Gram checks. A supplied dynamical matrix is checked for Hermiticity and Rayleigh eigenpair residuals; unknown matrix units are not automatically checked against the frequency conversion factor. Without it, vector orthogonality does not independently recompute force constants or establish material-frequency accuracy.

A mode’s common phase changes amplitude phase but not strength. Within a genuinely equal-energy subspace, individual strengths depend on basis and the complete subspace sum should be compared. Results show the numerical grouping tolerance and energy spread. Near-energy groups retain each branch’s actual energy and weight in the spectrum, rather than replacing them by a mean eigenenergy.

## Actual conditions of the ZnO reference

The example reuses the two pinned ZnO files distributed with the site, retaining byte identity, provenance, licensing and the Phonopy 4.10.0 generation conditions. Its primitive cell contains Zn, Zn, O, O and 12 branches, with complete modes at four supplied q points. NAC was disabled during generation; the presence of a separate BORN file does not make these frequencies LO–TO-corrected results.

The neutron lengths used for ZnO have a separate NIST source. The displayed signal is computed from the supplied phonons and probe conditions; it is neither a new DFT calculation nor a measured ZnO spectrum. Other momenta require complete corresponding modes from the same model with consistent primitive-cell, unit and phase conventions.

## Method and data sources

- [Phonopy dynamic structure factor](https://phonopy.github.io/phonopy/dynamic-structure-factor.html) and its [pinned v4.10.0 implementation](https://github.com/phonopy/phonopy/blob/v4.10.0/phonopy/spectrum/dynamic_structure_factor.py): one-phonon channels and structure-factor conventions.

- [Phonopy output formats](https://phonopy.github.io/phonopy/output-files.html) and [dynamical-matrix/displacement conventions](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix): supplied-mode formats and conventions.

- [NIST neutron scattering-length table](https://www.ncnr.nist.gov/resources/n-lengths/list.html): real bound coherent lengths for natural Zn and O in fm.

Instructional numerical checks verify the relation between inputs and calculation. They do not replace experimental convergence analysis or measure student learning outcomes.

## Practise and test the derivation at two points

With complete three-dimensional results, use the [two-point derivation and correction activity](phonopy-derivation.md) to submit Q, mass weighting, atomic complex terms and line weights yourself. The second point tests finite incorrect candidates. A complete teaching copy still returns here for manual Run, with practice feedback and scientific records retained separately.
