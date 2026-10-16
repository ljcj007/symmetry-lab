# Integral and affine classification — algorithms and coverage

The pure-Python implementation generates actual integer point-group matrices
and affine translation vectors. It runs in the browser through Pyodide, with
exact SymPy integers/rationals and no native CARAT/GAP or server process.

## Interface and proof flags

`carat_integral.run(payload, catalog=None)` accepts actions `z_classes`,
`affine_classes`, and `z_equivalent`. Supply an official Q-catalogue `name`
or finite integral `generators`; equivalence uses `left_generators` and
`right_generators`. Matrices act on column coordinates. The supported public
dimension range is 1–6.

Every affine representative includes its `point_generators` and exact rational
`generator_translations`, together with **all unit translations of Z^d**. The
result explicitly exports this `implicit_translation_lattice`. Local Python
class indices do not reproduce CARAT's official Z-name indices.

`classification_method` selects:

- `auto`: the constructive prime-order shortcut, then the finite conductor
  algorithm when its algebra model is verified, then the certified neighbour
  fallback for other algebras. An independent catalogue cardinality can close
  an otherwise partial search, and the certificate explicitly says so.
- `conductor`: require a supported maximal-order model and finite exhaustion.
  The Z-class completeness proof never uses an official class count. Failure
  to establish an algebra model is reported explicitly.
- `neighbors`: use the older prime-neighbour search and its independent
  catalogue-cardinality completion criterion.

`candidate_cover_complete` means that every integral class has a representative
in the finite cover. It does not assert that all candidates are distinct.
`z_complete` additionally requires complete equivalence decisions, or a
separately labelled independent-cardinality argument. An unresolved count is
`null`; `z_class_lower_bound` counts only proved distinct representatives.
Affine completeness has its own flag and certificate.

## Finite maximal-order conductor algorithm

Write Λ=Z[G] for the image order in A=Q[G], acting on V=Q^d. The module
`finite_conductor.py` constructs and verifies either of these models:

1. A product of full rational matrix algebras, with repeated absolutely
   irreducible constituents. Its chosen maximal order is
   M=⊕ Mat_r(Z), acting identically on each multiplicity copy.
2. An abelian image algebra, a product of cyclotomic fields. Through dimension
   six their integer rings O=Z[ζ_n] are PIDs. This includes cyclic groups and
   every noncyclic finite abelian representation. A joint fixed-space
   decomposition separates rational character kernels, and the action on
   each resulting field component is checked to be cyclic.

The split decomposition is accepted only after an exact change-of-basis check,
including equal repeated blocks and full rational span of the matrix image.
Cyclotomic free module bases are explicitly constructed and verified. A failed
search is not treated as a proof of nonexistence.

### Finite interval theorem

The integer span of all group elements is computed in an integral basis of M.
If its Smith invariants are s_1|...|s_k, put c=s_k. The implementation verifies
the exact inclusion cM⊂Λ by testing that c times each order-basis vector belongs
to the image-order lattice.

For any Λ-lattice L, its M-saturation ML is a full M-lattice. In model 1 it is
determined by a free integer lattice in each multiplicity space. In model 2
it is a free module over each certified cyclotomic PID. Therefore an invertible
A-linear transformation takes ML to the fixed standard M-lattice L0=Z^d.
After applying this transformation,

    c L0 = c ML ⊂ Λ L = L ⊂ ML = L0,    ML=L0.

Every integral class consequently occurs in the **finite** interval between
cZ^d and Z^d with full M-saturation. This establishes a global representative
cover, including all genera, without assuming that a local neighbour sample
is globally complete.

### Exhaustion and exact orbit reduction

For each prime dividing c, enumerate all invariant subspaces of L/pL and lift
them to integer HNF sublattices. Higher-codimension subspaces are included;
index-p neighbours alone would be insufficient in general. All candidates
are checked for G-invariance, the conductor inclusion, and full M-saturation.

Every sublattice in the interval has a chain of maximal invariant intermediate
lattices. Each simple quotient is killed by a prime dividing c. Every lattice
on this chain still has full M-saturation because it contains the final
lattice. Thus the traversal cannot lose a valid final lattice by discarding
nonfull saturations. The zero modular subspace gives pL and cannot have full
M-saturation, so it need not be retained.

When a normal Sylow p-subgroup exists and its quotient is abelian of exponent
dividing p−1, all simple F_p[G]-modules are one-dimensional. The implementation
verifies these finite-group conditions before limiting that prime's traversal
to hyperplanes. Otherwise it enumerates every proper nonzero modular subspace.

For split matrix orders the complete normalized module automorphism group is
∏GL_m(Z). For cyclotomic orders it is ∏GL_m(O). In dimensions at most six,
repeated nontrivial field factors are only Gaussian or Eisenstein, so Euclidean
elementary generation applies; degree-four and degree-six factors have
multiplicity one and use complete field-unit generators. **PID alone is not
used to infer elementary generation.** The PID and unit certificates are
detailed in [integral-normalizer.md](integral-normalizer.md).

These groups act on a finite lattice interval. Exhaustive HNF orbit closure
allows exact pruning: equivalent lattices have equivalent descendant intervals.
For two normalized lattices L,L', any A-linear isomorphism T satisfies
T L0=T ML=M L'=L0, so these arithmetic orbits are precisely labelled module
isomorphism classes, not a subset of the required identifications.

For abelian images the commutative maximal order is intrinsic. The normalizer
also contains compatible permutations of field components and Galois maps.
The code enumerates all component permutations with matching cyclic image
orders and multiplicities, all field Galois powers, and checks preservation
of the complete finite character-row set. This gives the full normalized
unlabelled action and hence distinct Z classes directly.

For split nonabelian images the finite cover is further identified using exact
invariants, intrinsic primitive Gram metrics where available, or every
character-preserving finite-group correspondence followed by complete arithmetic
integer module-isomorphism tests. An undecided correspondence remains
inconclusive, and never proves inequivalence.

## Prime cyclic shortcut

For p=2,3,5,7, let a,b be the multiplicities of the rational trivial and
cyclotomic constituents. The complete integral representatives are

    1^(a−t) ⊕ Φ_p^(b−t) ⊕ Z[C_p]^t,   0≤t≤min(a,b).

The Diederichsen–Reiner decomposition and cyclotomic class number one prove
coverage. The invariant rank_Fp(g−I)=b(p−2)+t distinguishes the classes.
Each representative has H²(C_p,L)=(Z/p)^(a−t). Trivial-block basis changes and
Galois actions are transitive on nonzero cohomology vectors, giving one affine
class if a=t and otherwise two. Actual shifts are 0 or e1/p. The trivial
point group separately gives the unique crystallographic group Z^d.

Reference: Irving Reiner, *Integral representations of cyclic groups of prime
order*, Proc. Amer. Math. Soc. 8 (1957), 142–146,
[DOI 10.1090/S0002-9939-1957-0083493-6](https://doi.org/10.1090/S0002-9939-1957-0083493-6).
Primary DOI metadata was verified on 2026-10-16; direct AMS PDF access was
blocked in the development environment.

## Affine classes

For every integer representative, exact relation lattices and Smith reduction
construct all H² classes. `arithmetic_centralizer.arithmetic_normalizer` supplies
certified integral normalizer generators, including its completeness flag.
Its exact action partitions cohomology. Each orbit exports the actual point
matrices, translation vectors, cohomology coordinates and orbit size.

Complete integer classification and complete normalizer actions prove complete
affine classification. A single computed orbit is also final even if only a
normalizer subgroup was needed. Trivial H² avoids needless normalizer work.

If a full normalizer is not established, a second explicit certificate is
available when a catalogue was supplied: subgroup orbits cover cohomology and
the true normalizer can only merge them. Equality of their total with the
independent official affine count rules out all mergers. This does not falsely
mark the normalizer complete. Its certificate records
`catalogue_count_used_for_completeness: true`.

If normalizer resource bounds are reached, all exact cohomology classes and
the already computed integer representatives remain available with a recorded
limit. Counts of subgroup orbits are provisional upper bounds within each
retained integer class, not global affine lower bounds.

## Resource bounds and remaining scope

Conductor traversal defaults: `max_candidates=40000`, `max_lattices=512`,
`max_lattice_orbit=20000`, `max_decomposition_trials=2000`. Their maximum
accepted values are 2000000, 20000, 100000 and 20000 respectively. Existing
limits also bound group closure, integer isometries, normalizer orbits and
cohomology. Every limit is validated; finite mathematical existence does not
imply that a browser computation fits its requested resource budget.

The finite conductor algorithm covers verified split rational image algebras
and all abelian image algebras through dimension six. Decomposition/basis
searches, lattice intervals and equivalence orbits can still hit bounds.
General matrix algebras over nontrivial number fields and quaternion algebras
do not yet have complete maximal-order module/ideal-class enumeration here.
The separate arithmetic-centralizer implementation can handle some such
groups without implying complete Q-to-Z enumeration for their algebras.

Other groups retain the earlier exact p-neighbour search. It constructs
invariant lattices and proves distinctness by exact integral invariants or
exhaustive isometry/equivalence tests. Exhausting that unbounded-neighbour
search's finite budget or queue alone is not a completion theorem; its complete
flag requires attaining the independent CARAT count. This remains explicitly
different from the finite conductor proof.

No complete precomputed 4–6D Z/affine representative database, general native
CARAT Voronoi/ideal-class port, or official CARAT representative numbering is
claimed. In particular, the catalogue's 85,308 six-dimensional Z classes are
not advertised as generated by this implementation.

## Independent verification

`scripts/test-python-finite-conductor.py` supplies **raw matrices only**, with
no catalogue/name/count input, for all 44 rational classes in dimensions 1–3.
Only after each calculation does the test compare the independently tabulated
official totals:

| Dimension | Q classes | Generated Z classes | Generated affine classes |
|---|---:|---:|---:|
| 1 | 2 | 2 | 2 |
| 2 | 10 | 13 | 17 |
| 3 | 32 | 73 | 219 |
| Total | 44 | 88 | 238 |

Every rational basis witness is checked against the input generators; every
exported affine representative reconstructs the expected finite point quotient.
Further tests cover three six-dimensional repeated rational/cyclotomic
representations, a repeated nonabelian S3 representation in dimension four,
its large integral shear, exact conductor inclusion, incomplete budgets and
invalid limits. These tests exercise infinite multiplicity groups and nontrivial
gluing rather than only irreducible or catalogue-singleton examples.

`scripts/test-python-carat-integral.py` independently covers all 34 prime-order
Q classes in dimensions 1–6, six noncyclic six-dimensional rational classes,
their pairwise inequivalence and rational witnesses, exact H² invariants,
subspace enumeration, explicit affine exports, and completion with a deliberately
incomplete normalizer subgroup. No downloaded representative arrays substitute
for these computations.

## Algorithm sources

- [CARAT QtoZ documentation](https://lbfm-rwth.github.io/carat/doc/progs/QtoZ.html)
  and [ZZprog invariant sublattices](https://lbfm-rwth.github.io/carat/doc/progs/ZZprog.html).
- [CARAT q2z source](https://github.com/lbfm-rwth/carat/blob/65619d6ae4ec911c8cf7aa3c9fa09866a0d36ab9/functions/ZZ/q2z.c),
  inspected for homogeneous decompositions and gluing; this Python algorithm
  is an independent exact implementation, not a line-for-line native port.
- [Magma's official ZClasses documentation](https://magma.maths.usyd.edu.au/magma/handbook/text/768)
  explains normalizer orbits, homogeneous decompositions and belonging lattices.
- [J. S. Milne, Algebraic Number Theory](https://www.jmilne.org/math/CourseNotes/ANT.pdf),
  sections on Dedekind modules, Minkowski bounds, units and cyclotomic rings.
- The small cyclotomic PID/unit proof table and its primary references are in
  [integral-normalizer.md](integral-normalizer.md).
