# Exact oblique stratifications and periodic geometry

## Setting

Let Q=[0,1]^3 and let H be a finite set of rational affine planes, including the
six boundary planes of Q. A plane has equation n.q=c, n nonzero. A sign cell is
the nonempty intersection of Q with prescribed strict positive, zero or strict
negative signs for every equation. Cells mean relative interiors. Their closures
are compact convex rational polytopes, possibly of dimension zero. These cells
may refine the minimal little-group stratification.

For a listed lattice operation g=(R,a), R is an integral unimodular matrix and
a is its antiunitary parity. Set A_g=(-1)^a R^(-T)-I. Every row n of A_g contributes
all planes n.q=m, m integral, intersecting Q. Optional additional rational planes
can refine this collection. In this module an operation list need not be a group;
group closure and semilinear representation laws are separate obligations.

## Lemma 1: exhaustive vertices

Every vertex of every closed sign cell is the intersection of three linearly
independent planes in H.

**Proof.** A closed cell is described by affine equalities and weak inequalities
from H, including Q's facets. If the active normals at a vertex v did not span
R^3, there would be a nonzero direction d annihilating them. Every inactive
inequality has positive slack. Since there are finitely many, sufficiently small
positive and negative displacements v±εd satisfy all inequalities and equalities.
Then v would be the midpoint of two distinct feasible points, contradicting
extremality. Choose three independent active normals. Conversely, the algorithm
retains only triple intersections inside Q; this collection can include points
that are not vertices of an intermediate coarser cell, which is harmless. ∎

## Lemma 2: exact incremental splitting

Starting from the 27 relative interiors of Q and successively imposing each plane
produces every nonempty sign cell exactly once, including all lower-dimensional
cells. At every step the retained point set for a cell contains all vertices of
its closure.

**Proof.** The initial cells and their closures partition Q. The global triple
intersection set from Lemma 1 contains the cube vertices and every vertex created
by any future cut. Suppose the claim holds before a plane h. On a closed cell P,
the extrema of its affine equation are attained at vertices, all of which are
retained. Thus exact extrema of the retained point set determine the actual
extrema on P. If the minimum is strictly negative and maximum strictly positive,
the relative interior of P meets both half-spaces and h. Intersecting the retained
points with each closed half-space and h retains every vertex of each new closed
piece by Lemma 1. These three relative interiors are disjoint and cover the old
relative interior. If all values vanish, the entire cell lies in h. Otherwise
the relative interior has one strict sign: a nonconstant affine functional can
attain its extremum zero only on a proper face, already represented among the
lower-dimensional cells. No extra zero cell should be created from this case.
This induction proves completeness and disjointness. Complete sign vectors
uniquely determine cells because their intersections are convex. After all cuts,
the retained global intersections in a cell closure are precisely its vertices:
any such point has three active plane normals; their prescribed cell signs make
those planes supporting constraints, so the point is extreme. ∎

## Theorem 1: soundness and relative completeness of the geometry checker

For a supported finite rational input, if `verify` returns `CERTIFIED`, its cells
cover Q, have pairwise disjoint relative interiors, have the reported dimensions
and exact vertices, and contain every possible stabilizer change of the listed
operations. Its incidence list is the complete strict closure relation. If the
reconstruction finishes within the verifier's declared resource limits, the
canonical certificate built from this arrangement is accepted.

**Proof.** Plane normalization is equality-preserving: clear denominators, divide
the common integer gcd, and fix the first nonzero normal coefficient positive.
Every congruence plane meeting Q is included because an affine row attains its
minimum and maximum at cube vertices, and all integers in this interval are
enumerated. Triple intersections use exact rational inversion. Lemmas 1 and 2
give the cells and vertices. The average of all vertices lies in the relative
interior: if a supporting inequality were saturated by the average, its
nonnegative slack would vanish at every vertex, making it an equality on P.
The rank of vertex differences equals the affine dimension. Operation g fixes
q modulo the reciprocal lattice exactly when every row of A_g q is integral.
An integer value can occur in a relative interior only if the corresponding
congruence plane contains that whole cell, since every such plane belongs to H.
Consequently a single exact interior witness determines the stabilizer on that
cell; the checker additionally verifies row constancy on its vertices.

For sign vectors s and t, the t-cell lies in the closure of the s-cell precisely
when t_i belongs to {s_i,0} for every i. Necessity follows from continuity.
For sufficiency, take any x in the t-cell and an interior y in the s-cell. Every
point (1−ε)x+εy for 0<ε≤1 has the strict signs of s, or lies in the equalities
shared by both; it converges to x. Thus every listed incidence and every omitted
non-incidence is correct. The verifier reconstructs all these data before
comparing them, with type-preserving canonical JSON equality. An accepting input
cannot delete a face, change a stabilizer, or remove a closure relation.
Relative completeness follows by serializing exactly that reconstruction. ∎

## Theorem 2: full periodic-face consistency

For an accepted input requesting axis i, translation by e_i gives a bijection
between all cells in the lower and upper faces. It preserves stabilizers and
closure relations. Pairwise period squares commute on every lower-face
intersection, including open edge cells, and the six three-axis paths agree at
triple intersections.

**Proof.** The algorithm visits every cell whose vertices lie on q_i=0 and
requires a target whose entire vertex set is the translation of that source set.
Compact convex polytopes are the convex hulls of their vertices, so this equality
identifies the whole polytope, its relative interior and all of its faces. This
is not a test of only the four corners of the square face: the vertex set and
dimension of every subdivision cell are checked. Injectivity follows from
injectivity of translation. Surjectivity follows because translated source cells
cover the entire upper face; a target subdivision with an additional internal
cut would prevent equality for a source cell crossing that cut. The tests include
this counterexample. For lattice-derived planes, invariance is also immediate
from n.(q+e_i)=n.q+n_i with n_i integral. Optional extra planes are accepted only
if the full subdivision equality holds. Translation preserves closure inclusion
and A_g e_i is integral, so stabilizers agree (also checked explicitly).
Translations commute, hence all pairwise and cubic endpoints agree; the checker
enumerates and checks every such path in the discrete cell maps. ∎

These geometric identities supply domains for representation sewing checks.
They do not establish equality of sewing matrices, cocycle laws, boundary
intertwiners or a physical band gap. Those are verified separately in the
exchange model. If those matrix identities hold on the cells and their
intersections, the gluing argument of Phase 8 applies to this more general
polytopal refinement: convex relative interiors replace Cartesian boxes, while
the local representation and descent equations are unchanged.

## Theorem 3: second enumeration used for cross-validation

The barycentres of all subsets of at most four global arrangement vertices meet
the relative interior of every sign cell in dimension three.

**Proof.** A d-dimensional compact polytope has d+1 affinely independent vertices.
Their barycentre lies in the relative interior of the polytope: if a proper
supporting hyperplane contained that barycentre, nonnegative slacks force it to
contain all d+1 vertices, contradicting affine independence. Since d≤3, at most
four vertices suffice. Every candidate barycentre lies in Q and hence belongs
to exactly one cell, so enumerating its sign vector introduces no false cells.
Therefore the independently collected sign vectors are exactly the arrangement.
The separate implementation uses Cramer's rule and this barycentre enumeration;
it does not import the incremental splitting module. ∎

## Resource and expressivity boundaries

The algorithm admits arbitrary rational oblique plane normals in a three-
dimensional cube. The magnetic model has a genuine diagonal fixed mirror plane,
not a renamed Cartesian coordinate in the previous model. This does not claim
that all space-group band representations or general nonconvex parameter
regions are implemented. The affine momentum map here is q=k; nontrivial
parameter embeddings can be expanded into explicit planes by an external
producer, but their physical provenance would need a separate binding check.

Finite resource limits restrict accepted input size; exceeding them yields
`UNRESOLVED`, not a false mathematical rejection. Rational tokens are restricted
to integer/fraction syntax with a 512-bit numerator/denominator budget; CLI files
are limited to 32 MiB each. Soundness is conditional on exact Python integer and
fraction arithmetic and the documented parser; this is a tested checker, not a
formally verified implementation.
