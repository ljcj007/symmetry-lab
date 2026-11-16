# From water displacement arrows to characters

In Symmetry classroom → Fundamentals and representations → Water, characters and spectroscopy, expand “How does water acquire a character of −1?”. Answer a prediction, then calculate manually. Opening the workshop, choosing an operation or choosing a matrix column does not start a calculation.

## Conventions and basis

The molecule lies in the xz plane, with its twofold axis along z. O is at the origin; H1 is on the positive-x side and H2 on the negative-x side. The drawing uses relative bond lengths and a 104.5° bond angle. These coordinates illustrate atom and arrow positions. Matrices and characters use exact integers.

The nine basis vectors are ordered Ox, Oy, Oz, H1x, H1y, H1z, H2x, H2y, H2z. Each describes one Cartesian displacement of one atom, rather than one normal mode. Active operations act on column vectors; column j records the image of basis vector j.

## Five-stage replay

1. Track atoms. Choose E, C₂(z), σ(xz) or σ(yz), then compare initial and transformed positions. H1/H2 are tracking labels; the two hydrogen atoms have the same atomic type.
2. Track directions. Choose one of nine basis vectors, inspect its destination atom and directional sign, then locate its column in the nine-dimensional matrix. One Python calculation returns all 36 columns of the four operations.
3. Add only diagonal entries. C₂ exchanges H1 and H2, placing their entries in off-diagonal blocks. O stays at its site, but Ox, Oy and Oz contribute −1, −1 and +1. The character is therefore −1. The number of fixed atoms alone is not the displacement character.
4. Remove rigid motions and reduce. Translations transform as polar vectors R; infinitesimal rotations transform as axial vectors det(R)R, whose mirror characters differ. Subtract both three-dimensional characters operation by operation, then use the complete four-operation character table to calculate irrep multiplicities.
5. Return to polarization. Compare the existing z and x infrared channels and xx and xz Raman channels. Two A₁ copies are two vibrational degrees of freedom of the same one-dimensional symmetry type; that label does not require equal frequencies.

## Mathematical relations and scope

With atoms as the outer index and Cartesian directions as the inner index, the displacement representation is D(g)=P(g)⊗R(g). P maps atom labels to destination sites, while R transforms displacement directions. Hence χ₃N(g)=Tr(P(g))Tr(R(g)). The operation order is always E, C₂(z), σ(xz), σ(yz).

This convention gives χ₃N=(9,−1,3,1), χT=(3,−1,1,1) and χR=(3,−1,−1,−1). The vibrational character after subtraction is (3,1,3,1), reducing to 2A₁+B₁. Swapping the x/y convention exchanges B₁/B₂ labels; check the molecular plane and mirror-column order before comparing textbooks.

The workshop explains a finite-group displacement representation and symmetry permission. It does not solve force constants, normal-mode mixing, measured peak positions or intensities. The original animation remains an explicitly schematic symmetry-adapted displacement. Character subtraction here applies to this nonlinear three-atom model, rather than replacing rigid-motion analysis for general linear molecules.

Inputs, results, predictions and notes are stored separately from the original water animation, point-group experiment and course quiz. Export includes the fixed calculation input and complete action ledger; predictions do not count toward course grades. Closing or leaving the workshop cancels its own unfinished calculation without cancelling a newer task in another tool.

## Sources

- [MIT Symm4ML: APS 2026 tutorial](https://symm4ml.mit.edu/symm4ml_s26/tutorials/aps-tutorial-2026): tensor products of atom-permutation and vector representations, and the water vibrational subspace.
- [MIT 5.03: molecular vibrations](https://web.mit.edu/5.03/www/readings/molecular_vibrations/main.pdf): fixed atoms and vector characters, removal of translations and rotations, vibrational reduction and infrared selection rules. Read its coordinate labels in its own convention.

These sources support the teaching method. This site independently constructs the matrices, ledger, drawings and exercises; source animations and frequency data are not copied.
