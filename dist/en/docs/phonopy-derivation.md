# One phonon, two measurement points: derivation and correction

Open the optional two-point derivation and correction workshop in the coherent-phase lesson under inelastic scattering and dynamic structure factors. Predict first, explicitly load the paired ZnO source and conditions, then run manually, submit intermediate quantities and test your rule at a second point. The existing one-dimensional chain and general Phonopy tools retain their own inputs.

## Fix the evidence for this task

The default activity uses the distributed ZnO files derived from official force data: a four-atom primitive cell, four supplied q points and NAC disabled. It selects q index 2 and branch index 10, first with G=(1,1,0) and then G=(1,0,0). Both points use the same original files, q, branch and atom order; neutron coherent lengths, units, temperature and the Debye–Waller approximation travel with the input.

The default uses 100 K and an explicit omitted-Debye–Waller approximation; it does not calculate thermal displacement tensors from four q points. Real coherent lengths for natural-isotope Zn and O come from NIST. This is a one-phonon calculation for supplied harmonic modes, not a measured spectrum; instrument calibration, absorption, incoherent scattering and multiphonon processes are not included.

## Build the derivation factor by factor

1. Start from the primitive row-lattice matrix A and full scattering vector. Reciprocal fractions obey Q=q+G, while Q_cart=2π Q_frac A^(−T). Phonon q, full Q, reciprocal vector G and the reciprocal basis without 2π are different quantities. Keep units and the transpose convention explicit at both points.

2. Read the three supplied complex eigenvector components of the same ordered atom. Apply inverse square-root mass weighting, then distinguish the original vector from its conjugate used for creation. The program uses mass values in u. These mode components do not specify an actual thermal displacement amplitude; animation length cannot be treated as scattering intensity.

3. This task defines P=Q·e* before inverse square-root mass weighting. The full atomic term then includes b, the Debye–Waller factor, structural phase and 1/√m. If e*/√m is projected directly instead, do not divide again. The step-2 check must not introduce the same mass factor twice. In the fixed Phonopy atom-phase convention, creation uses 2πG·τ; a convention change must transform eigenvectors and phase together.

4. Sum all atomic complex terms to obtain A before forming |A|². Listing Σ|a_j|² and its difference from the coherent strength exposes interference. A dark branch does not mean the mode is absent, and complex-plane coordinates are not real-space atomic trajectories.

5. Only retained positive-energy branches use the quantum coefficient and 1/E before multiplying by the creation factor n+1. Bare line weight, Bose-weighted integrated weight and Gaussian-broadened spectral density are different quantities. Excluded modes retain their explanation; undefined denominators or occupations must not be replaced by invented numbers.

## Why the second point matters

At G=(1,1,0), omitting conjugation happens to give the same |A|² for the default mode, although the complex amplitudes already differ. At G=(1,0,0), the correct coherent strength is about 0.24553438, whereas that incorrect formula gives about 19.77175847. One correct squared magnitude at the first point does not establish the whole rule.

Changing G generally changes the direction and magnitude of full Q as well as the structural phase. Compare the same factor chain rather than attributing every intensity difference to phase alone. The workshop provides finite candidates such as omitted conjugation, omitted structural phase, squaring before addition and omitted square-root mass weighting; a candidate is rejected only when this task actually distinguishes it.

Two points are not a complete proof against all possible errors. Equal G values, zero projection or another accidental agreement may provide no distinguishing power; an inconclusive result is valid. Two experimental intensities are not used to infer a unique mode or certify a material model.

## Grading and reference-answer boundaries

For each grading request, Python recomputes targets from the complete original task input; it does not accept a browser-supplied reference answer. The fingerprint binds source files, both point conditions, branch and atom. After a source or condition change, old feedback no longer represents the current task. The advanced API binds the complete JSON actually received: after files or parameters are reserialized, derive again and use the returned fingerprint rather than borrowing an old value from a reference fixture.

Numerical tasks compare components using declared matrix shapes, units and tolerances, retaining amplitude and the complex phase selected in the supplied file. This is not merely a subspace or projector comparison. Overall-phase equivalence remains a physical fact; intermediate quantities are practised in the same declared gauge, and intensity and complex-amplitude tasks are distinct.

Blank, malformed, numerically incorrect and unavailable answers are reported separately. Thermal tasks for excluded modes have no numerical target. Targets above the grader’s 1e8 component limit are also unavailable, while the original scientific result is retained. Hints can be opened progressively; after viewing a full answer or reference result, treat the attempt as assisted practice. Feedback does not write course mastery or constitute an independent assessment or evidence of learning gains.

Advanced users can construct other same-q two-point tasks from a consistent supplied input. Numerical answers accept only finite real two-dimensional arrays or matching re and im arrays; string expressions are not executed. The following is a syntax example, not the answer to the current task.

```json
{"re": [[0.25, -0.5, 0]], "im": [[0.1, 0, 0]]}
```

## Return to the expert tool with complete conditions

Either point can be explicitly copied to the existing three-dimensional Phonopy scattering tool. It carries a teaching-reference input and source identity and still waits for manual Run. It does not impersonate an existing research record or insert learner answers, hint state or incorrect candidates into scientific inputs. Calculation and practice exports retain their own evidence.

This workshop focuses on creation at the same supplied q and branch. For annihilation, explicit Cartesian full Q or other file conditions, use the [general three-dimensional Phonopy neutron-scattering workflow](phonopy-scattering.md). When returning to the [one-dimensional atomic-amplitude replay](scattering-amplitudes.md), restore that model’s own cell-periodic convention as well.

## Sources and verification

The ZnO source record retains the actual files, generation settings, units and complete BSD licence. Method sources include [Phonopy dynamic structure factors](https://phonopy.github.io/phonopy/dynamic-structure-factor.html), [dynamical-matrix and eigenvector conventions](https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix) and [NIST neutron scattering lengths](https://www.ncnr.nist.gov/resources/n-lengths/list.html). The existing official same-condition numerical comparison is retained; this derivation and grading layer has separate independent complex-arithmetic, source-identity and wrong-formula tests.
