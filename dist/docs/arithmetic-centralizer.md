# Exact arithmetic centralizers and integral conjugacy

The browser module `arithmetic_centralizer.py` uses Python, SymPy and exact integer/rational arithmetic. It extends the earlier cyclic, sign-character, tensor and finite-metric algorithms to arbitrary integral gluing in split rational representations, definite quaternion orders, and arbitrary real quadratic commutant orders. It does **not** claim a general unit-group implementation for every semisimple rational algebra.

## Public interface and meaning of completeness

`run(payload, database=None)` accepts `action: "order"`, `"centralizer"`, or `"normalizer"`. Point generators use the existing `rotations`, `point_generators`, or supported database group-number inputs. The public entry point validates and closes a finite subgroup of GL(d,Z), with 1 <= d <= 6. Internal functions taking a closed `group` have this same precondition.

- `order` returns the full saturated integer commutant order, multiplication table, identity coordinates, determinant unit equation, rational center and primitive central idempotents. Here `complete: true` concerns the order calculation; `unitGroupComplete: false` explicitly states that unit generation was not requested.
- `centralizer` returns generators of the arithmetic unit group. `unitGroupComplete: true` means they generate the full integral centralizer. `centralizerOrder` is supplied only for a proved finite group; an infinite group has `finite: false` and a null order.
- `normalizer` returns the full integral normalizer only when `complete: true`. The earlier algorithms remain available as fallback and preserve their explicit completeness status.

Every returned centralizer generator is checked to commute with the input generators and to have determinant +/-1. Every arithmetic normalizer generator is checked for integer entries, determinant +/-1 and exact conjugation into the original finite point group, including the internal `arithmetic_normalizer` entry point. This check verifies membership; completeness relies on the algorithms below.

`include_structure: false` omits the cubic-size multiplication table. For order rank above eight, the determinant equation is returned as an exact symbolic determinant and its matrix rather than eagerly expanded. `expand_norm: true` requests expansion up to order rank twelve. An unexpanded determinant is still an exact equation, not a numerical approximation.

## 1. Saturated endomorphism orders and the rational center

For point generators g, form all integer linear equations Xg-gX=0. A Smith transformation computes the complete integer kernel. Its matrix basis B_i is therefore saturated in M_d(Z), and is precisely O = End_ZG(Z^d). Reducing the equations to an equivalent rational row basis before clearing denominators changes neither their rational nor integer kernel.

For every pair B_i,B_j, solve the exact coordinate equations for B_i B_j and verify integer coordinates and reconstruction. The identity is likewise expressed in this basis. For A=sum(u_i B_i), the exact unit condition is det(A)=+1 or -1 with integer u_i: an integral unimodular A has an integral inverse, and the inverse commutes with G. No norm-equation solver is implied merely by returning this equation.

The center is another saturated commutator kernel. Since QG is semisimple in characteristic zero, its commutant and center are semisimple, and the center is a product of separable number fields. For a center basis Z_0,...,Z_(s-1), use z(t)=sum(t^i Z_i). Each pair of distinct algebra embeddings can coincide at at most s-1 integer values of t. Thus testing (s-1)s(s-1)/2+1 distinct integers guarantees a separating primitive element. Its squarefree characteristic polynomial has degree s. Rational factorization and the polynomial Chinese remainder theorem produce primitive central idempotents; the code verifies their squares and sum. The saturated lattice in each component is ker_Z(I-e).

## 2. Split rational isotypic representations, including arbitrary glue

A returned decomposition is certified to have the form V=direct_sum(W_i tensor Q^(m_i)), with pairwise inequivalent rational W_i and End_QG(W_i)=Q. The code verifies the commutant dimension, rational intertwining equations, full rank, and integral model generators. A search for a simple summand can be resource limited; an unsuccessful search is inconclusive and never proves that an algebra is nonsplit. Simultaneous sign characters have a direct saturated-eigenspace shortcut.

In tensor coordinates, let L be the actual input lattice. For each irreducible coordinate of an isotypic component, project L onto the multiplicity space Q^(m_i), then sum these projected lattices to obtain M_i. Every rational centralizer preserving L must preserve M_i, because it acts by the same multiplicity matrix on every irreducible coordinate. Conversely, after choosing a lattice basis for each M_i, the complete possible overgroup is product GL(m_i,Z). Its usual transvections, coordinate permutations and sign changes generate the full group, since Z is Euclidean.

L lies in the intrinsic over-lattice direct_sum(M_i tensor Z^(r_i)) with finite index. The overgroup acts on lattices of this fixed index. There are finitely many such sublattices. Column Hermite normal form gives exact equality, exhaustive breadth-first orbit enumeration gives all orbit states, and Schreier generators give the full stabilizer. Conjugating that stabilizer back yields the complete centralizer of the original lattice. This includes infinite congruence subgroups and arbitrary glue; a unimodular tensor basis for L itself is not required.

The same construction decides labelled integral equivalence X A_j = B_j X. Hom spaces against the verified source models first establish rational equivalence or exclude it. Projection lattices put both modules into the same product GL(m_i,Z) action. A transport matrix gives an exactly verified unimodular intertwiner. Exhaustion of the whole finite orbit proves a negative decision. Stopping early after finding a verified witness is valid for a positive decision only.

Shared APIs used by the conductor classifier are `split_decomposition`, `intertwiner_basis`, `projection_lattice_basis`, `lattice_orbit_transport`, and `labelled_integral_equivalence`. Matrices returned by these internal APIs are SymPy matrices unless documented as JSON/Fraction output. `canonical_primitive_metric` in `integral_normalizer` supplies an intrinsic metric without first enumerating its full isometry group.

## 3. Definite quaternion orders and other scalar adjoint norms

Let H be a positive definite invariant rational Gram matrix and A*=H^-1 A^T H. On the complete saturated order basis, the code verifies the identity A* A=q(A) I by checking every diagonal and symmetric cross product. It proves q positive definite by its exact principal minors. The algorithm applies only if these identities hold on the entire algebra.

If A is an integral unit, det(A)^2=q(A)^d and positivity imply q(A)=1. Conversely, integral q(A)=1 implies det(A)=+/-1. Thus the complete unit group consists exactly of the integer norm-one vectors. Cauchy-Schwarz gives |u_i| <= sqrt((q^-1)_(ii)); exhaustive enumeration of this finite integer box is a proof. This handles definite quaternion orders such as the Lipschitz order (8 units) and Hurwitz order (24 units). It assumes neither maximality nor a particular standard quaternion presentation.

Multiple central components are combined using their saturated component lattices. Every centralizer fixes these components. If each component has a complete unit group, their product acts on the finite glue lattice, and another exhaustive Schreier stabilizer recovers the complete centralizer on the original lattice. The included four-dimensional quaternion plus two-dimensional scalar example has an infinite centralizer because of its GL(2,Z) factor.

## 4. Real quadratic orders, including nonmaximal orders

When the saturated commutant order has rank two and is commutative, primitive identity coordinates are completed by Bezout to a basis {I,T}. Verify T^2-tT+nI=0 with integers t,n. For D=t^2-4n positive and nonsquare, this is the **actual order discriminant**, which need not be a field discriminant. A unit a+bT has norm a^2+tab+nb^2=+/-1.

Continued fractions of sqrt(D) give a certified integer solution p^2-Dq^2=1. The unit U=p+q sqrt(D) belongs to the given order because sqrt(D)=2T-t. Every positive real unit 1<epsilon<=U can be written epsilon=(x+b sqrt(D))/2 with b>0, x>0,

    x^2-D b^2 = +4 or -4,   x = t b (mod 2).

For norm +1, b=(epsilon-1/epsilon)/sqrt(D)<=2q. For norm -1, b=(epsilon+1/epsilon)/sqrt(D)<=2p/sqrt(D)<2q+1; since b is integral, again b<=2q. This supplies a rigorous finite coefficient bound.

For each b in increasing order, both norm signs and the parity condition are tested with integer square roots. The candidate unit equals b sqrt(D)+Norm(epsilon)/epsilon and lies strictly in (b sqrt(D)-1,b sqrt(D)+1). Since every real quadratic order discriminant satisfies D>=5, these intervals for successive b are disjoint and increasing. Therefore the smallest candidate at the **first successful b** is the least real unit greater than one. This permits an early, proved stop even if the Pell bound is very large. All comparisons of radicals use exact integer signs. Division by powers of this least unit shows that it and -1 generate the entire unit group.

The 6D CARAT representative min.667, of order 60, has a nonmaximal commutant order of discriminant 20. Its fundamental unit is 2+sqrt(5), of norm -1. The independent D=61 test finds (39+5 sqrt(61))/2 after five coefficients even though the certified integer Pell bound exceeds 10^8.

## 5. Complete quadratic integral intertwiner decisions

For a source module with real quadratic commutant, compute the saturated integer Hom lattice for the specified generator correspondence. Equivalence requires its rational dimension to be two. Its generic determinant factors as c F(u,v)^m, with F=A u^2+Buv+C v^2 primitive integral and irreducible. A nonunit integer c excludes an integral isomorphism. Otherwise a unimodular intertwiner requires |F|=1.

Right multiplication by the proved source fundamental unit preserves the entire integer Hom lattice. The code verifies the resulting GL(2,Z) action and its field-multiplication form. With X=2Au+Bv, Y=v and Delta=B^2-4AC,

    X^2-Delta Y^2 = 4 A F(u,v).

Let S=4|A| and let lambda>1 be the absolute expanding eigenvalue of the unit action. Multiplication by a suitable unit power puts |X+Y sqrt(Delta)| in [sqrt(S),lambda sqrt(S)); the other embedding then has absolute value at most sqrt(S). The bound lambda<=|trace(U)|+1 yields explicit conservative integer bounds on X,Y and then u,v. Every possible unimodular Hom orbit meets this finite box. An exhaustive negative answer is therefore a proof; a positive answer includes the checked integral intertwiner. Exceeding the box budget is a resource error, never a negative equivalence decision.

## 6. Full normalizers from complete centralizers and lifts

An integral normalizer acts on the finite point group by an abstract automorphism. The algorithm exhausts assignments of the selected generators to group elements of matching characteristic polynomial, checks all Cayley relations and bijectivity, and checks character preservation on every group element. Rational finite-group representations are semisimple, so the preserved character is the correct rational equivalence condition. Inner automorphisms already have integral lifts supplied by the point group itself; exact coset enumeration reduces the remaining lift tests to outer representatives.

For each remaining automorphism, labelled integral equivalence is decided by the split lattice transport algorithm or the quadratic Hom reduction above. The full centralizer, point-group generators, and one lift from every realizable outer coset generate the full integral normalizer. The min.667 example exhausts 120 automorphisms, represented by two cosets modulo inner automorphisms, and proves an infinite full normalizer. Sign and cyclic representations retain their earlier specialized complete algorithms to avoid unnecessary large abstract automorphism enumerations.

## Resource limits and remaining scope

Finite searches have explicit bounds: `max_trials`, `max_orbit`, `max_matrices`, `max_vectors`, `max_assignments`, `max_pell_steps`, `max_unit_candidates`, and `max_candidates`. Integer matrix growth also has a guard. A budget failure raises `SearchLimitError` or permits an explicitly incomplete fallback. It does not certify nonexistence, unit-group completeness, or a finite full normalizer. Search results from a subgroup retain the subgroup scope.

General unit groups in higher-degree non-cyclotomic fields, matrix algebras over general number fields, and non-definite division algebras are not implemented here. A certified split decomposition is found by a bounded search, not a universal splitting algorithm. Multiple central components can have complete centralizers while their full normalizers still require an unsupported component-permutation/lift calculation; such cases preserve the earlier normalizer's explicit status. The order and rational-center calculation remains general independently of which unit algorithm applies.

## Validation and executable examples

`python scripts/test-python-arithmetic-centralizer.py` runs 15 independent tests. These check saturation by Smith invariants, multiplication reconstruction, CRT components, a nontrivially glued repeated S3 module, positive and negative split integral equivalence, full split normalizers, all 8 Lipschitz and 24 Hurwitz units, quaternion/scalar combinations, six quadratic order discriminants including nonmaximal orders, quadratic Hom certificates, all 120 A5 automorphisms, sign multiplicity shortcuts, resource failures, raw-integer A4 inverse regression, and every shipped example.

Examples: `centralizer-order.json`, `centralizer-glued.json`, `centralizer-hurwitz.json`, `centralizer-quaternion-mixed.json`, `centralizer-a5.json`, and `centralizer-a5-normalizer.json`. Their matrices are explicit inputs; the A5 fixture originates in the bundled official CARAT q6 catalogue. No catalogue count is used to prove the unit group or normalizer complete.

## Primary sources

- [J. S. Milne, Algebraic Number Theory](https://www.jmilne.org/math/CourseNotes/ANT.pdf): orders, discriminants, units and the arithmetic of number fields. The concrete quadratic finite bounds above are checked directly in code.
- [John Voight, Quaternion Algebras](https://jvoight.github.io/quat-book-v1.0.5.pdf), and the [author's book page](https://math.dartmouth.edu/~jvoight/quat.html): quaternion orders, reduced norms, definite units, Lipschitz and Hurwitz orders.
- [Magma, Endomorphisms of Matrix Groups over Q and Z](https://docs.magma-maths.org/FiniteGroups/MatrixGroupsOverQAndZ/Endomorphisms.html): rational and integral endomorphism-algebra interfaces and their distinction from unit generation.
- [Magma, Quaternion Unit Groups](https://docs.magma-maths.org/Algebras/QuaternionAlgebras/unit-group.html): definite norm-one unit groups and their finite enumeration.
- [CARAT manual, functions](https://www.math.rwth-aachen.de/~Greg.Gamble/gap4r3/pkg/carat/htm/CHAP003.htm): original centralizer, normalizer and Z-class functionality. This browser implementation uses independent Python algorithms; it does not call CARAT, GAP, Magma or Mathematica.
