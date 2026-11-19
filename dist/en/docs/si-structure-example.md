# Check reciprocal basis changes with an original Si structure

Load the Phonopy Si reference file from the [structure conversion workbench](../#structure). The input is a conventional cubic cell with eight Si atoms and a lattice length of about 5.466 Å. Select reciprocal fractional input coordinates `k=(1/2,0,0)` and a position tolerance of `10⁻⁵ Å`, then run the conversion. First predict the coordinates of the same physical wave vector in the BC primitive basis.

## Read the conversion

The structure is identified as space group 227, with the short international symbol Fd−3m. The BC primitive cell contains two atoms and has one quarter of the input cell volume. Fractional positions, atom indices, and the origin change with the cell. Inspect the matrix `M` and shift `q` from the conversion, then examine the accompanying reciprocal basis change.

```text
x_BC = M x_input + q
k_BC = M^(-T) k_input
```

For this file and input, the workbench gives the BC wave vector `(0,1/4,1/4)`. The inner product of the wave vector and a given real-space displacement is the same in both bases, so the translation phase is the same.

## Compare representations after reusing the input coordinates

Send the confirmed space group and converted wave vector to the calculation center and run the single-valued representation calculation. Record the number of k-star arms and the order of the little group. Then enter `(1/2,0,0)` as BC primitive-cell coordinates and calculate again.

| Procedure | BC wave vector used in the calculation | k-star arms | Little-group order |
| --- | --- | ---: | ---: |
| Apply structure conversion and transfer the result | `(0,1/4,1/4)` | 6 | 8 |
| Enter the original numbers directly in the BC coordinates | `(1/2,0,0)` | 4 | 12 |

Both calculations satisfy their respective little-group checks. Comparing them shows that copying the three numbers to another reciprocal basis changes the physical wave vector. Use `M` and the corresponding bases to check the phase, then explain why the little group and the representation dimensions change.

## Check diffraction in the input conventional cell

Choose Calculate diffraction from the input cell in the structure results. The diffraction form loads the eight atoms in the conventional cell, with reflection indices in that cell’s reciprocal basis. Keep the default scattering factor of 1 for each Si atom. Predict 100, 200, and 220, then enter each reflection and run the calculation.

Inspect the phase diagrams. Centering phases cancel pairwise for 100. For 200, four positive imaginary amplitudes cancel four negative imaginary amplitudes. For 220, the eight amplitudes share a phase and give relative intensity 64. Interpret custom-structure results using the supplied coordinates and weights. Find more phase and extinction exercises in the [diffraction lesson](../#classroom/structure-dynamics?lesson=structure-factor).

## Sources and reproduction

The structure is from the [original Phonopy Si-QHA POSCAR-0](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/example/Si-QHA/POSCAR-0). The exercise uses the original calculation input and runs the crystal symmetry conversion and little-group calculation in the browser. See the [source manifest](../data/examples/phonopy-si-structure/source.json) and [upstream license](../data/examples/phonopy-si-structure/LICENSE.txt) for the file identities and release.

The conversion uses the [site’s BC coordinate conventions](structure-bc.md). See [Spglib dataset](https://spglib.readthedocs.io/en/stable/dataset.html) for the standardization matrix, origin shift, and primitive atom map. After comparing the calculations, return to the [lesson on standardized cells](../#classroom/crystal?tab=learn&lesson=space-06&track=space).
