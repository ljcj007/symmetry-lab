# Integral and affine classification — Python coverage

## Interface

`carat_integral.run(payload, catalog=None)` is the public pure-Python entry point.
Actions are `z_classes`, `affine_classes`, and `z_equivalent`. Input uses an
official Q catalogue `name`, or finite integral `generators`; equivalence uses
`left_generators` and `right_generators`. Matrices act on column coordinates.
The result explicitly includes the implicit translation lattice Z^d. Affine
representatives comprise their listed point generators and shifts PLUS every
unit lattice translation. Local representative indices are not official CARAT
Z-name indices.

No native CARAT/GAP, backend, subprocess, approximate reconstruction, or
expression execution is used. All matrices, Smith invariants and lattice
transports use exact SymPy integers/rationals.

## Complete constructive families

Every prime cyclic point group possible in dimensions 1–6 (p=2,3,5,7) is
classified. If the rational multiplicities are a trivial and b cyclotomic
components, the integral representatives are

    1^(a-t) + Phi_p^(b-t) + Z[C_p]^t, 0 <= t <= min(a,b).

The cyclotomic ideal class numbers for these four primes are one.
The invariant rank_Fp(g-I) = b(p-2)+t distinguishes all these classes,
including after automorphisms of the cyclic group. The module decomposition
theorem is Diederichsen–Reiner; the independent CARAT Z counts are also checked
whenever a catalogue is supplied.

For each integral representative H²(C_p,L)=(Z/p)^(a-t). Changes of basis on
the trivial summands, together with Galois automorphisms on the cyclotomic and
regular blocks, act transitively on the nonzero vectors. This gives one affine
class if a=t, otherwise two. Representatives use translation zero or e1/p.
Nonzero cohomology representatives are torsion-free; split representatives
have torsion. The trivial point group separately yields the single group Z^d.

Reference: Irving Reiner, *Integral representations of cyclic groups of prime
order*, Proceedings of the American Mathematical Society 8 (1957), 142–146,
https://doi.org/10.1090/S0002-9939-1957-0083493-6 . 

## General certified Q-to-Z search

For all finite integral representations through dimension six the search
constructs invariant neighbours pL <= M <= L for every prime dividing |P|.
It enumerates canonical projective covectors first, followed by reduced
row-echelon bases of all other proper nonzero F_p subspaces. This includes
indices p^r with r>1, essential for higher-dimensional modular simple factors.
Every neighbour has an exact HNF basis B and verified integral B^-1 g B.
Composite transport bases give Q membership certificates back to the input.

Different representatives are retained only after proving them pairwise
Z-inequivalent. The current invariants are the multiset of rational element
signatures with integral Smith(g-I), the integral coinvariant Smith form, and,
in the unique symmetric invariant-form case, the determinant of the primitive
positive invariant Gram form. Coinciding invariants do not prove equivalence.
Unique-form cases can instead exhaust every integral isometry of primitive
Gram forms using inverse-Gram coordinate bounds and exact inner-product
constraints. This either returns an explicit unimodular conjugator, proves
inequivalence, or reports its resource limit as inconclusive.

Completeness is certified ONLY if this proved distinct set attains the
independently tabulated CARAT Z cardinality. This is an exact cardinality
argument, not a local-to-global assumption about prime neighbours. It works
for arbitrary groups where the certificates succeed, and immediately for
official Q classes having one Z class. A budget stop, an exhausted neighbour
queue, or failed bounded isometry search does not imply completeness.

Verified non-prime, noncyclic six-dimensional examples include min.351 (2 Z),
group.1905 (2 Z), min.352 (4 Z), min.353/354 (3 Z), group.1908 (3 Z),
group.1909 (4 Z), group.1910 (3 Z). These are on-demand computations, not
precomputed representative arrays. Additional cases can succeed, but these
samples are not a claim of all 85,308 six-dimensional Z classes.

Official source/data: https://github.com/lbfm-rwth/carat at
65619d6ae4ec911c8cf7aa3c9fa09866a0d36ab9; full count reference
https://lbfm-rwth.github.io/carat/doc/ . Algorithms inspected:
https://github.com/lbfm-rwth/carat/blob/master/functions/ZZ/q2z.c and
https://lbfm-rwth.github.io/carat/doc/progs/ZZprog.html . The Python implementation
is independent and does not claim a full source translation of native QtoZ.

## General affine aggregation

For every retained Z representative the existing exact integer relation-lattice
Smith algorithm enumerates all H² classes. `integral_normalizer.normalizer`
supplies proved normalizer generators and its own completeness flag. Exact
normalizer action partitions the cohomology set.

Complete Z enumeration plus complete normalizers establishes complete affine
classification. There is a second valid certificate: even a normalizer subgroup
partitions all cohomology classes, and full normalizer action can only merge its
orbits. If the total number of these orbits across every Z class equals CARAT's
independent affine count, no merger can occur. The affine result is then complete
without falsely marking the normalizer complete. A single orbit is also complete
regardless of the subgroup used. Trivial H² avoids unnecessary normalizer work.

Normalizer budget exhaustion retains the Z classes and all cohomology classes
with the identity subgroup and explicit `resource_limit`; it does not discard
the successful exact calculation. Cohomology/output resource limits remain
explicit errors. Partial normalizer-orbit counts are upper bounds for individual
selected Z classes, not globally certified affine lower bounds.

6D group.1044: 2 Z representatives, H² sizes 64 and 16, 6 affine classes;
normalizer proof and independent official affine total agree (~23 s CPython).
6D min.351: 2 Z / 2 affine classes (~4 s CPython).

## Remaining boundaries

General arithmetic equivalence for arbitrary reducible noncyclic integral
modules remains inconclusive when these invariants and unique-form tests do
not decide it. Such candidates may be skipped in the search and cannot produce
a completeness certificate unless the independent total is nevertheless met.
The neighbour search is resource bounded and does not claim every local genus
or every global ideal class has been reached. No full native Voronoi, maximal
order / ideal-class QtoZ implementation or complete precomputed high-dimensional
Z/affine catalogue is claimed. Official CARAT Z/affine naming indices are not
reproduced. `z_equivalent` reports `inconclusive` instead of false inequivalence.

## Validation

`scripts/test-python-carat-integral.py` checks all 34 prime-order Q classes in
the official 1–6D catalogue against both Z and affine counts, exact H² invariants,
all canonical blocks and integral cocycle relations, and large unimodular shear
invariance. Six noncyclic 6D Q classes have independent pairwise inequivalence
checks and explicit basis witnesses. Other tests cover all 14 proper nonzero
subspaces of F2^3, primitive Gram isometry witnesses, a genuinely inequivalent
involution pair, budget/incomplete outcomes, unknown catalogues, strict limits,
and all downloadable examples. Separate test verifies the affine-cardinality
argument with a deliberately incomplete normalizer subgroup.
