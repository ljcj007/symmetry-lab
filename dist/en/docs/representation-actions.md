# Do these matrices really form a representation?

Open this workshop in the Representations or Characters and reduction lesson under Symmetry classroom → Fundamentals and representations. Make a prediction, enter probe coordinates, and calculate manually. Family, group-element and stage selectors only browse the complete current reply.

## From one operation matrix to a whole matrix family

This example uses the eight-element C₄ᵥ point group acting on xy arrows. R rotates counterclockwise by 90° and M reflects the plane about the x axis. In its three-dimensional embedding, M fixes z and is an xz mirror, distinct from a twofold rotation of proper D₄. The element order E, R, R², R³, M, RM, R²M, R³M matches the preceding composition workshop.

Active operations act on column vectors. D(g)D(h) applies h first and g second; a representation requires equality with D(gh) for every pair. This workshop tests strict equality for ordinary linear representations; matrices differing by an overall scalar are not identified. Thus we must track basis-vector images and also check whether the matrices assigned to the entire group preserve multiplication. Each calculation returns all 64 comparisons, with intermediate coordinates for the probe and both unit basis vectors.

## Compare four matrix families

The original family is the plane-arrow representation. The common-basis family uses the same S for every element, replacing D(g) by S⁻¹D(g)S. Here S swaps the two basis vectors. The same physical vector has new coordinates x′=S⁻¹x, and Sx′ reconstructs the original vector. A coordinate change preserves physical action, traces and all multiplication pairs. Coordinate tables use the current basis, while geometric drawings use reconstructed original physical coordinates. The two colored unit arrows label the first and second vectors of that current basis: swapping the basis order swaps their physical directions, while the fixed probe retains the same physical arrow.

The mixed family changes only R by this similarity transform and leaves the other seven matrices untouched. Every individual matrix remains orthogonal and every trace is unchanged, yet 18 multiplication pairs fail. For example, D(R)D(R²) disagrees with the matrix assigned to R³. This table does not form a representation; its coordinate paths do not describe one consistent new physical basis.

The repeated-matrix family maps every element to I₂ and still satisfies all 64 multiplication pairs. It is a valid nonfaithful representation on another auxiliary two-dimensional space, containing two trivial copies; it is not the physical 90° action on xy arrows. Repeated matrices alone do not establish failure: check the multiplication law first.

## Five instructional stages

1. Declare the action space and basis order, then inspect the complete element-to-matrix map.
2. Select g and h, follow the probe and two unit basis vectors through h and then g, and compare D(g)D(h) with D(gh). Every linear map sends the zero vector to zero; that probe cannot establish matrix equality.
3. Change the basis consistently for every matrix and transform vector coordinates, then reconstruct the result in the original coordinates.
4. Inspect the pairs that fail after changing R alone, alongside the preserved individual traces and orthogonality. A formal character norm or matrix-coefficient sum cannot replace the representation-law premise.
5. Compare the valid repeated matrices, then test whether two reflections can be diagonalized in one common basis.

## Individual and simultaneous diagonalization

M is already diagonal. The exchange matrix of another reflection is diagonalized by Q=[[1,1],[1,−1]], with Q⁻¹=Q/2. In that basis M becomes the exchange matrix. Their nonzero commutator rules out a common diagonalizing basis over either the real or complex numbers. Choosing a separate eigenbasis for each operation is not a common reduction of a representation.

The scalar field also matters. A 90° rotation R has eigenvalues ±i and is diagonalizable over the complex numbers, but has no real eigenbasis. The main passive basis change S is real; complex eigenvector coordinates are not new directions in real space.

## Input, interpretation and saved work

Both probe coordinates must be integers from −2 to 2. Editing preserves a draft; only manual calculation creates a result, and an incomplete field remains editable. Family and g/h choices, predictions, notes and native disclosures are separate from the original point-group experiment, composition workshop and course grades, and return through ordinary classroom navigation. Export retains the current input and complete result.

This verifies concrete matrices and coordinate conventions for a finite group. It is not a classifier for arbitrary input matrices and does not infer material levels or learning outcomes from a formal character norm.

## Definitions and sources

- [MIT Symm4ML: APS 2026 tutorial](https://symm4ml.mit.edu/symm4ml_s26/tutorials/aps-tutorial-2026): the multiplication-preserving definition of a representation, common basis changes and simultaneous block reduction.
- The mixed table, repeated family, 64 pair comparisons and reflection counterexample are independently constructed here. The reference definition and the computational evidence for this example serve separate roles; a general definition does not verify these particular matrices.
