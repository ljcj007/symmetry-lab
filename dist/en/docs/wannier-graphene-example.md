# Graphene in the ideal model and in a Wannier band input

Run the ideal graphene model in the [MagneticTB workbench](../#magnetictb). The sublattices are equivalent, and the phases of the three nearest-neighbor hoppings sum to $1+\omega+\omega^2=0$ at K, with $\omega=\exp(2\pi i/3)$. Predict the band separation at K before checking the plot. The energy scale of this ideal model is its selected hopping.

## Calculate the original path using the paired files

Return to the WannierTools example. Verify the two files to fill the form with the real-space Hamiltonian from `Graphene_hr.dat` and the lattice and path from `wt.in-bands`. You can also download both files upstream and verify them in the browser. Review the input and run the calculation to see the M–K–Γ–M path and the two energies at K. The example uses the printed $k=(0.33333333,0.33333333,0)$ in the fractional reciprocal coordinates of the supplied lattice.

The source has two orbitals and 315 translation blocks. To form the Bloch matrix, divide each real-space block by its weight $d_R$, multiply by $\exp(2\pi i k\cdot R)$ and sum. The supplied path is sampled at 304 points. Energies are in eV.

## Check the band separation at K

| Input and check | Result |
| --- | --- |
| Phase sum at K in the ideal nearest-neighbor model | $0$, with two degenerate bands |
| Energies from the Wannier input at the supplied K point | About −1.262198730 and −1.259253270 eV |
| Separation $E_2-E_1$ at that point | About 2.94546 meV |

Set the first two coordinates of the K vertex to `0.3333333333333333`, the double-precision value of $1/3$. Run again and check the separation in the band CSV. It remains about 2.946 meV. Shifting both energies by the same reference leaves their separation unchanged. The weighted real-space matrices satisfy $H(-R)=H(R)^\dagger$. An independent reconstruction gives a maximum Bloch Hermiticity residual along the path of about $3.03\times10^{-14}$ eV. Hermiticity gives real eigenvalues. Degeneracy at K depends on the symmetries and assumptions of the model. This numerical separation describes the supplied file at a single point on its path.

## Source and classroom

See the [pinned WannierTools example directory](https://github.com/quanshengwu/wannier_tools/tree/362171ce35450118828c6960a882e3a6d08c73f5/examples/Graphene) for the [real-space hopping file](https://github.com/quanshengwu/wannier_tools/blob/362171ce35450118828c6960a882e3a6d08c73f5/examples/Graphene/Graphene_hr.dat) and [lattice and path settings](https://github.com/quanshengwu/wannier_tools/blob/362171ce35450118828c6960a882e3a6d08c73f5/examples/Graphene/wt.in-bands). Continue with the [band-crossing lesson](../#classroom/crystal?module=bands&tab=learn&lesson=band-crossing) to compare symmetry protection and perturbations.
