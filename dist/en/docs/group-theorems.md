# Understanding group-theory theorems with S₃

The same six permutations connect nine lessons: rearrangement and conjugacy, subgroups, representations, and degeneracy. Operations act actively on column vectors; gh applies h first. Representations are finite-dimensional and complex. The S₃ class order is **e, three transpositions, two three-cycles**, with class sizes **1, 3, 2**. Some D₃ tables use another order, so match operations before comparing columns.

Let D be the permutation representation on three scalar site bases. With u₀=(1,1,1)/√3, u₁=(2,−1,−1)/√6, and u₂=(0,1,−1)/√2, D splits into A₁ and E blocks. S₃ is isomorphic to D₃; this route uses abstract permutations and does not identify a transposition directly with a spatial reflection.

## 1. Rearrangement: why group averaging is independent of the starting point

For fixed a∈G, the map g↦ag is bijective: ag₁=ag₂ implies g₁=g₂ after multiplying by a⁻¹, and x has preimage a⁻¹x. Left or right multiplication therefore reorders the full group without adding or omitting elements. Commutativity is not required. See the [rearrangement theorem in MIT's introductory notes](https://symm4ml.mit.edu/symm4ml_s26/notes/intro-to-groups).

**Demonstration and proof:** Select a and compare the original list with ag and ga, matching entries. Explain ∑g f(ag)=∑g f(g) through this substitution, then use it in group averaging. The step is a change of summation variable, not arbitrary deletion of a.

## 2. Conjugacy classes: relabeling a permutation

Conjugation g↦hgh⁻¹ preserves multiplication. The S₃ classes are {e}, {(12),(13),(23)}, and {(123),(132)}. For permutations it relabels cycle entries: (123)(12)(123)⁻¹=(23). Conjugate matrices in a representation are similar and have equal traces. See the explicit S₃ examples in [CMI Math Methods of Physics, §13, p. 46](https://www.cmi.ac.in/~govind/teaching/math-meth-e24/math-phys-notes-gk-2024.pdf).

**Demonstration and proof:** Fix g, vary h, and collect distinct results. Use D(hgh⁻¹)=D(h)D(g)D(h)⁻¹ to show that a character is constant on a conjugacy class. Equal characters for two elements alone do not prove conjugacy.

## 3. Normal subgroups: when cosets form a quotient group

A₃={e,(123),(132)} is invariant under every conjugation and is normal in S₃. H={e,(12)} is not: conjugating by (123) produces (23), outside H. Normality requires hHh⁻¹=H for every h∈G, not just elements of H. See the [CMI examples of A₃ and cosets](https://www.cmi.ac.in/~govind/teaching/math-meth-e24/math-phys-notes-gk-2024.pdf).

**Demonstration and proof:** Compare left and right cosets for both subgroups. The two A₃ cosets form S₃/A₃≅C₂ through permutation parity. Cosets of H exist, but do not form a quotient group under the usual coset multiplication.

## 4. Character self-inner-product: irreducibility and repeated copies

Define ⟨χ,ψ⟩=|G|⁻¹∑g χ(g)*ψ(g). For Γ=⊕α mαΓα, irreducible-character orthogonality gives ⟨χΓ,χΓ⟩=∑αmα². A nonzero representation is irreducible exactly when this self-inner-product equals 1. It is the squared norm. For orthogonality and class-size weights, see [University of Alberta, §2.8](https://sites.ualberta.ca/~vbouchar/MAPH464/section-characters-orthogonality.html).

**Demonstration and proof:** The three-site character χ=(3,1,0) has self-inner-product (9+3)/6=2, consistent with A₁+E. For E, χ=(2,0,−1) gives (4+2)/6=1. A value of 2 means a sum of squared multiplicities, not a two-dimensional representation.

## 5. Schur's lemma: matrices commuting with every operation

In a complex irreducible space, A commuting with every D(g) implies A=cI. Choose an eigenvalue c of A: ker(A−cI) is nonzero and invariant, so irreducibility makes it the whole space. Intertwiners between inequivalent irreps vanish. For commuting matrices and equivalent copies, see [MIT's finite-group notes, §6](https://symm4ml.mit.edu/symm4ml_s26/notes/representations).

**Demonstration and proof:** Vary a candidate A within E and inspect all commutators. For A₁+E, two scalars can be chosen independently. With equivalent E copies, an operator may also mix the copies. Do not extend the scalar conclusion from one irreducible block to the entire reducible space.

## 6. An averaged metric: making a representation unitary

For a finite-group complex representation, take M=|G|⁻¹∑g D(g)†D(g). It is positive definite, and rearrangement gives D(h)†MD(h)=M. With S=M¹ᐟ², U(g)=SD(g)S⁻¹ obeys U(g)†U(g)=I. This changes the inner product or basis; a unitary similarity alone cannot change the original singular values. See [Etingof et al., Introduction to Representation Theory, §4.6, pp. 71–72](https://math.mit.edu/~etingof/reprbook.pdf).

**Demonstration and proof:** Apply an invertible nonorthogonal basis change to standard E and observe that ordinary Euclidean lengths need not be preserved. Construct M and check length invariance in the averaged metric.

## 7. Matrix-element orthogonality: the required basis

Choose an orthonormal unitary basis for each inequivalent irrep. Then ∑g Dαᵢⱼ(g)*Dβₖₗ(g)=|G|/dα δαβδᵢₖδⱼₗ. For E in S₃, each matrix-element vector has squared norm 6/2=3, and distinct matrix-element vectors are orthogonal. See the basis conditions and proof in [Etingof et al., §4.7, pp. 72–73](https://math.mit.edu/~etingof/reprbook.pdf).

**Demonstration and proof:** List one matrix element over all six operations as a vector and compute the sums, then select another element. Nonorthogonal basis changes preserve a representation but need not preserve this Euclidean orthogonality formula. First unitarize the basis or use the appropriate metric.

## 8. Reduction and the sum of squared dimensions: two different counts

The rows are A₁:(1,1,1), A₂:(1,−1,1), and E:(2,0,−1). Using class sizes 1, 3, 2 in mα=∑c n_cχα(c)*χΓ(c)/6 gives multiplicities (1,0,1) for the three-site representation and dimension 1+2=3. In contrast, ∑αdα²=|G| concerns the complete set of inequivalent irreps: here 1²+1²+2²=6. It is not the dimension formula for an arbitrary representation. See [Alberta, §2.8.3](https://sites.ualberta.ca/~vbouchar/MAPH464/section-characters-orthogonality.html).

**Demonstration and proof:** Compare the three-site representation with the six-dimensional regular representation A₁+A₂+2E. Distinguish irrep dimension d from occurrence multiplicity m, and explain why class-size weights are necessary.

## 9. Irrep dimension and protected degeneracy

If a quantum Hamiltonian preserves the chosen finite group, Schur's lemma makes its action on a single irrep scalar. An isolated E block therefore gives a symmetry-protected doublet. With m copies of E, symmetry permits H=Hmultiplicity⊗I₂: copies may mix and have different energies while each branch remains twofold. This follows from the [Schur commutant structure](https://symm4ml.mit.edu/symm4ml_s26/notes/representations).

**Demonstration and proof:** Compare symmetry-preserving and symmetry-breaking perturbations while following E doublets. Irrep dimension describes a protected multiplet, not the whole reducible space. Different irreps can also coincide accidentally in energy. Problems involving spin, antiunitary symmetries, or space-group little groups require the appropriate extended representations; this example is not an exhaustive account of degeneracy.

## Order of checks

Fix the group and representation space, then specify matrices, bases, and inner products. Check multiplication before characters, orthogonality, decomposition, and energy levels. The finite demonstrations replay key substitutions or invariant-subspace arguments; they do not replace the general proofs.
