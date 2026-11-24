# Foundations teaching audit — 24 November 2026

This record covers the six foundations demonstrations and the scalar-vibration micro-experiment. The implementation stays in the isolated teaching checkout. It does not alter manuscripts, research data, the previous site, or any deployed service.

## Findings and corrections

| Topic | Finding in the earlier interface | Current teaching behavior |
| --- | --- | --- |
| Matrices and characters | Only 2D/3D examples; the similarity transformation was asserted rather than performed. | A five-function real d basis is also computed. An orthogonal basis-angle control actually evaluates SᵀDS, exposing changed entries and invariant trace. Columns and active-operation conventions are declared. |
| Water | The xz/B1 convention and character arithmetic were consistent, but the main animation skipped the 3N construction. | Each selected operation builds the actual 9×9 matrix from atom permutation and its polar-vector block. All four characters, irreducible multiplicities, rigid-motion subtraction, and IR/Raman channels are explained. The two A1 internal coordinates are now mass orthogonal. They remain schematic symmetry coordinates, not force-field normal modes. |
| D3 projection | Seed, character projector and partner-row operator were difficult to distinguish. | Six transformed seeds and their weights are displayed and summed. The full operator and raw/normalized output are shown. P21=vuᵀ is explicitly distinguished from the idempotent projector onto the whole E subspace. Zero A2 projection is a valid result. |
| SO(3) → O → D4 | The branch diagram omitted its derivation. | Real l=2 basis, rotation-character formula, weighted O/D4 reductions and actual five-dimensional operation matrices precede the energy model. O/D4 labels are kept separate from Oh/D4h parity labels. Trace, dimension and weighted energy center are conserved. |
| Jahn–Teller | Curves were fixed at Qepsilon=0 while the point used a different two-dimensional radius. A point could therefore miss its purported curve. | The curves and all points now share the selected Qepsilon. A separate Q-plane shows the current slice and the occupied-energy minimum circle. Electron filling, single-counted elastic energy, slice minima and two-dimensional minima are distinct. |
| Macroscopic symmetry | G/T was correct, but a generic translation slider lacked a clear model boundary and Laue symmetry was not distinguished. | The moving Seitz image and unchanged linear image are shown separately. Continuous translations are identified as algebraic illustrations, not a family of operations of one fixed space group. Noncentrosymmetric point group 4 and its Laue group 4/m are compared explicitly. |
| Scalar vibrations | A mixed E direction was animated with a common sine even after its two frequencies split. This is not a solution of q''+Kq=0. | Each eigenvector evolves at its own frequency in both JavaScript and Python. Orthogonal mode vectors, eigenvalues, detector weights and merged degenerate peaks are shown. A chosen linear detector is a model assumption, not an inferred molecular IR/Raman tensor. |

The basic demonstrations compute locally without launching Python. Their calculation tools remain available elsewhere. Debug JSON, Python verification buttons and routine pass/residual displays were removed from these classroom views; meaningful matrices and derivations remain visible.

## Independently checked source basis

Sources were opened or searched on 24 November 2026. The links below support conventions and model scope; the new numeric results are computed from the declared matrices and equations.

- [Quanty: D4 character table and axis setting](https://www.quanty.org/physics_chemistry/point_groups/d4) and [O character table](https://www.quanty.org/physics_chemistry/point_groups/o). These official tables fix the two C2 classes and the E/T2 restrictions. The page orders differ; the interface states its own order and uses it consistently.
- [UC San Diego, Physics 220, Chapter 6](https://courses.physics.ucsd.edu/2018/Spring/physics220/LECTURES/CH06.pdf), §§6.2 and 6.4: real d functions, O/D4 decompositions, tetragonal Ds/Dt expressions and molecular symmetry. We independently sum degeneracy-weighted coefficients to zero. No numerical material parameters are taken from the notes.
- [TU Braunschweig: symmetry of water normal vibrations](https://www.pci.tu-bs.de/aggericke/PC4/Kap_V/H2O_Schwingungen.html) explicitly places water in yz and explains the B2/B1 relabeling upon switching to xz. Only its symmetry convention is used. Its listed MNDO frequencies are not imported or represented as measurements.
- [Mainz physical chemistry laboratory: Raman scattering](https://interaktiv.chemie.uni-mainz.de/vpcf1/raman-man.de.html) provides the C2v linear/quadratic functions and subtraction of translations and rotations. The interface derives the xz-convention characters independently.
- [IUCr International Tables A, §1.3.3](https://it.iucr.org/Ac/ch1o3v0001/sec1o3o3/) defines the point group as the linear parts of space-group operations and proves its isomorphism with G/T. [IUCr: Laue class](https://dictionary.iucr.org/Laue_class) explains why Friedel-law diffraction can share a Laue class across centrosymmetric and noncentrosymmetric point groups. No inversion is added when forming G/T.
- [Krishnan, Nature 143, 600–601 (1939)](https://www.nature.com/articles/143600a0), an original early application of the Jahn–Teller theorem, explicitly distinguishes its orbital-instability argument from the special Kramers doublet. The original Jahn–Teller paper is [Proc. R. Soc. A 161, 220–235 (1937)](https://doi.org/10.1098/rspa.1937.0142); its publisher full text returned 403 during this audit and is not claimed as read. The displayed E⊗e surfaces, determinant, filling energy and minima are derived directly from the stated 2×2 Hamiltonian, rather than imported from an inaccessible paper.
- [University of Leipzig-hosted normal-mode derivation](https://home.uni-leipzig.de/~physik/sites/mona/wp-content/uploads/sites/3/2017/04/NormalModesText.pdf), equations 51–54: mass weighting, removal of center-of-mass motion and orthogonality. For the new dynamics, central differences independently verify q''+Kq=0; no real-material frequency or spectral intensity is inferred.

## Model boundaries

All energies, displacements and scalar-oscillator frequencies are in explicitly defined teaching units. Water geometry is illustrative; no Hessian, dipole derivative or polarizability derivative is supplied. Cubic/tetragonal splitting ignores spin, spin–orbit coupling and many-electron terms. The linear E⊗e model omits nuclear kinetic energy, tunnelling, quadratic warping and a solved Hund/pairing competition. Its two-electron case assumes one electron in each orbital. The scalar-vibration detector spectrum assumes equal independent modal preparation and neglects temperature, linewidth and damping.

## Checks

- `node scripts/test-foundations-redesign-20261124.mjs`: rotation-character identities, five-dimensional orthogonality, real water matrices, mass-orthogonal internal coordinates, weighted projector sums and row operators, JT section consistency, the actual vibration equation of motion, detector weights, local controls and three-tab topic groups.
- `node scripts/test-foundations-demos.mjs`: prior matrix/trace and classroom handoff checks, updated for local-only calculation.
- `node scripts/test-symmetry-mini-demos.mjs`: JavaScript/Python comparison across all six micro-experiments, including the corrected vibration motion and detector spectra.
- `python scripts/test-python-foundations-demos.py` and `python scripts/test-python-symmetry-mini-demos.py`: existing independent mathematical/physical invariants.

These checks verify the stated finite teaching models. They are not evidence of classroom learning outcomes, experimental validation, or a new site publication.
