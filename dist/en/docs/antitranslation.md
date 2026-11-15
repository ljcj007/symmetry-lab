# From a half translation to pairing at the same wavevector

This workshop accompanies the spin-space-group lesson on half translations and a three-layer spin helix. Track the actual intercell displacement, construct the Bloch matrix, and then decide whether the antiunitary operation returns to the same wavevector space. These are separate tests.

## Fix the magnetic cell, basis, and phase

Use an orthogonal magnetic cell with all three edge lengths equal to 1. Two identical local orbitals A and B are at z=0 and 1/2. The periodic orbital basis is sum_R exp(+2πik·R)|R,alpha,s>, with only the full-cell coordinate R in the exponential. All components of k are magnetic reciprocal-lattice fractions. A full-cell translation n contributes exp(−2πik·n). This differs from an embedded gauge that also includes intracell positions in the exponential.

A half translation along +z sends A to B and B to A in the next cell. Source orbitals label matrix columns and destination orbitals label rows. The second map therefore contributes exp(−2πik_z); two half translations leave one full-cell translation. The coordinate z=1 remains unwrapped, so matching arrows after folding cannot discard the phase.

## From one wavevector space to another

Theta sends k to −k. The spin-1/2 branch uses J=−iσ_y and Theta=JK; the spinless branch uses J=1 and Theta=K. The first action of A=T_(c/2)Theta is B_A(k)ψ*, with B_A(k)=S(−k)⊗J, and its output belongs to H_−k.

The second action uses the returning-space matrix B_A(−k) and conjugates the entire intermediate complex vector. Thus B_A(−k)B_A(k)*=Theta²exp(−2πik_z)I. The interface separately shows B_A(k)² and B_A(k)B_A(k)* as deliberate incorrect comparisons: at generic k they are not valid return operations.

The workshop supplies a basis vector and a normalized complex reference state. Changing the initial state changes the component-by-component view of conjugation, not the operator square. The overlap of ψ and Aψ is shown only when A returns to the same wavevector under the declared basis identification. At generic k, a coefficient dot product across two different spaces is not presented as a state overlap.

## Why the longitudinal wavevector alone is insufficient

The same-k condition requires −k+G=k with integer reciprocal vector G, so 2k_x, 2k_y, and 2k_z must all be integers. In this periodic orbital gauge, integer G has the identity basis identification matrix. Input k is neither automatically folded nor stripped of transverse components.

For spin 1/2, the square is −I at Gamma and +I at Z=(0,0,1/2). The generic transverse point (1/4,0,0) has the same −I square but is sent to another k; the square alone cannot establish a doublet at the same k. The spinless branch instead has +I at Gamma and −I at Z, showing the combined role of fractional translation and antiunitarity.

## From orthogonality to energy: Hamiltonian symmetry is also required

For an antiunitary isometry A acting in one space with A²=−I, the antiunitary inner-product relation makes ψ and Aψ orthogonal. A symmetry of the Hamiltonian is additionally needed to make their energies equal. The workshop calculates the first two conditions and the actions; it does not test an arbitrary material Hamiltonian.

The first fixed-point counterexample uses the unitary G=T_(c/2)D(C2x) at Gamma. Although G²=−I, H=X_orb⊗I+2I⊗σ_x commutes with G and has four distinct energies −3, −1, 1, 3. A square of −I cannot replace the antiunitarity condition.

The second counterexample uses A=BK with B=J_orb⊗J_spin at the spin-1/2 Z point, where A²=+I. The Hamiltonian H=X_orb⊗σ_x+2Z_orb⊗σ_z preserves A and still has four distinct energies. Both are explicit finite-matrix counterexamples, not material fits. Failure to guarantee pairing does not rule out degeneracy from another cause.

## Pattern comparisons and the original one-dimensional experiment

The three-dimensional pattern retains all unwrapped positions and separately shows a half translation, time reversal, and their combination. A and the unitary G can produce the same classical moment-arrow changes while acting differently on quantum states. Arrows in the spinless mathematical branch represent an abstract time-odd order parameter.

The original one-dimensional experiment uses the same magnetic reciprocal-lattice fractions, so a supported copy uses k=k_z. Copying is offered only for zero transverse components and longitudinal values allowed by the original form range and step grid. It neither discards transverse momentum nor silently quantizes exact rational input. The complete copied input still requires a manual calculation.

## Input bounds and references

Inputs accept only finite decimals, integers, or p/q, with absolute value at most 8 and denominator at most 1000000; expressions are not executed. Exact matrices determine the criteria, while numerical mirrors serve display only. No material magnetic-space-group search, band solution, or topological invariant is calculated.

Mong, Essin, and Moore discuss the combined time-reversal and half-translation operation in Section II. Their half translation squares to a translation along −a3 and they write the Bloch basis differently, giving −exp(+ik3). This workshop fixes a +z half translation and the periodic orbital basis above, giving −exp(−2πik_z). Align translation direction, momentum units, and basis before comparing formulas.

- [Original paper: Mong, Essin and Moore, Physical Review B 81, 245209 (2010)](https://doi.org/10.1103/PhysRevB.81.245209)
- [Authors’ preprint: definitions and equations in Section II](https://arxiv.org/abs/1004.1403)
- [Download the website Python source and checks](../../source.zip)
