# Material examples,3D operations, and guided derivations

The lessons connect typical structures to three tests: whether atoms return to positions of the same species, whether moments match their target atoms, and whether electron spinors retain phases or central minus signs. The six material models and twelve derivation exercises are original teaching content; sources verify structural facts, magnetic order and conventions, without copied paper figures or book pages.

## Six models

| Material | Model/chemical  space group  | Cell atoms | Key comparison |
| :-- | :-- | --: | :-- |
| NaCl | Ideal rock salt, Fm-3m, 225 | 8 | F translations pass; the half-translation exchanging Na/Cl fails |
| Si | Ideal diamond, Fd-3m,227; atom-centered origin | 8 | Translated C4z passes; pure C4z about the same origin fails |
| GaAs | Ideal  zinc blende , F-43m,216 | 8 | Si bond-center inversion exchanges Ga/As and fails |
| Fe | bcc parent Im-3m, 229; ferromagnetic single domain with fixed M∥[001] | 2 | C2x preserves positions but reverses moments; ΘC2x restores magnetic order |
| NiO | AF-II layered antiferromagnetic model on cubic rock-salt parent 225 | 4 | Chemical translation τ breaks order; ΘTτ restores it |
| MnF₂ | rutile parent P4₂/mnm,136; Mn moments ±c | 6 | Pure half-translation fails F; Θ{C4z|τ} preserves positions/moments |

Space-group numbers for magnetic materials label the **chemical parent phase**. Workbench links open its single-/double-valued representations, not a completed magnetic-space-group or corepresentation classification of the selected domain. A small operation sample is not a complete group.

## Coordinates and magnetic moments

Data `cell` is matrix A of Cartesian basis columns; `frac` is column f:

```text
r = A f
f' = R f + t
Q = A R A^(-1)
m' = s det(Q) Q m
```

R and t use fractional coordinates; Q and moments use Cartesian coordinates. With time reversal s=−1, otherwise s=+1. Moments are time-odd axial vectors: inversion leaves them unchanged, time reversal reverses them.

Chemical and magnetic matching each independently seek a complete one-to-one assignment. Both require each atom to map to a periodic position of the same element; magnetic matching additionally requires transformed moments to match target moments. Counterexample operations are labeled teaching comparisons, not data errors. Results must be recalculated from coordinates and moments; `expectedChemicalSymmetry` and `expectedMagneticSymmetry` are not answer inputs.

Lengths normalize to parent cubic/tetragonal  conventional cell  a, not Å; moments normalize, not measured μB. Coordinates/spinors differ:3D position animations cannot directly display 2π wavefunction signs; use spinor experiments/derivations.

## The nonorthogonal NiO magnetic primitive cell

Set the cubic parent length a=1, with fcc chemical primitive cell:

```text
a1=(0,1/2,1/2), a2=(1/2,0,1/2), a3=(1/2,1/2,0)
b1=a1−a2, b2=a2−a3, b3=a1+a2
A=[b1 b2 b3]
```

Ni signs on n1a1+n2a2+n3a3 are (−1)^(n1+n2+n3). All b coefficient sums are even; magnetic  primitive cell  volume a³/2 contains 2 Ni/2 O.

The single-Q domain has propagation vector Q=(1/2,1/2,1/2) in reciprocal units of the cubic conventional parent cell, with moments along [11-2]. AF-II denotes alternately reversed (111) ferromagnetic planes, **not a type-II gray magnetic space group**. Actual low-temperature NiO has a small lattice distortion; the model freezes the ideal parent and cannot replace experimental refinement.

τ=a1 has magnetic-cell coordinates (1/2,0,1/2). Tτ therefore exchanges opposite Ni sublattices and ΘTτ also reverses moments. Derivation k values use fractional reciprocal coordinates of this magnetic primitive cell, not directly the parent cubic or BC primitive coordinates.

## MnF₂ parameters/ligands

The MnF₂ model uses Mn 2a and F 4f positions. u=0.310 and c/a=0.68 are rounded demonstration values based on ambient-pressure X-ray structures, frozen for a low-temperature antiferromagnetic illustration rather than low-temperature refinement. Mn moments point along ±c; possible induced F moments and small distortions are neglected.

A pure (1/2,1/2,1/2) translation exchanges Mn sublattices but fails to preserve four F sites. Time reversal cannot fix position errors. MnF₂ therefore differs from NiO's antitranslation example: it needs rotation, translation, and time reversal together. This is why complete chemical bases must participate in symmetry detection.

## Twelve guided questions

Four space-group exercises cover conventional-cell counting, Seitz composition, Si/GaAs inversion and NiO basis/cell-volume changes. Four double-group exercises cover SU(2) lifts of C2/C3, 360° relative interference phases and Kramers conditions. Four magnetic-group exercises cover Fe axial-vector transformations, NiO antitranslation squares, the MnF₂ ligand counterexample and mirror transformations of moments.

Each problem contains givens, hints, at least three derivation steps, a final answer, common mistakes, and a comprehension check. The final multiple-choice question tests one key judgment, not understanding of the full derivation. These lessons generate no actual material bands, SOC splitting, or topological classification.

## Data files

- `data/symmetry-materials.json`: six materials, 36 valid/counterexample operations, sources and model limits.
- `data/symmetry-derivations.json`: twelve derivation problems; `sourceIds` link to sources in material files.
- Model positions, matrices, exercises download with sources; book PDF/paper figures are not redistributed.

## Verification sources

- AFLOW [rock-salt](https://aflow.org/p/AB_cF8_225_a_b-001/), [diamond](https://aflow.org/p/A_cF8_227_a-001/), [zinc-blende](https://aflow.org/p/AB_cF8_216_a_c-001/), [bcc](https://aflow.org/p/A_cI2_229_a-001/), and [rutile](https://aflow.org/p/A2B_tP6_136_f_a-001/) prototypes: structural coordinates and chemical space groups.
- [Stout & Reed, JACS 76,5279–5281 (1954)](https://doi.org/10.1021/ja01650a005): ambient-pressure MnF₂ structure parameters.
- [Yamani, Tun & Ryan, Canadian Journal of Physics 88, 771–797 (2010)](https://doi.org/10.1139/P10-081): neutron scattering and magnetic order in MnF₂.
- [Roth, Physical Review 110,1333 (1958)](https://doi.org/10.1103/PhysRev.110.1333): layered antiferromagnetic NiO order.
- [Pomjakushin, Acta Crystallographica B80 (2024)](https://doi.org/10.1107/S205252062400756X): NiO/MnO magnetic structures/small distortions.
- [Weber et al., Physical Review X 14, 021033 (2024)](https://doi.org/10.1103/PhysRevX.14.021033): NiO single-domain directions and antiferromagnetic symmetry examples.
- [Elcoro et al., Double crystallographic groups and their representations on the Bilbao Crystallographic Server](https://arxiv.org/abs/1706.09272): double-group and representation conventions.
