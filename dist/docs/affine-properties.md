# Exact torsion, center and orientation of affine crystallographic groups

`crystkit_ext` actions `affine_properties` and `torsionfree` accept the same
`operations`, `generators`, or three-dimensional `group_number` input as the
existing extension module. Computation uses exact Python integers and fractions.
The translation lattice must be the full primitive lattice Z^d, in dimensions
one through six. A quotient with multiple cosets for the same rotation is rejected;
use the existing `crystkit` simplification operation to determine a primitive
translation basis first.

For a nonidentity point matrix R of finite order m, write
N_R = I + R + ... + R^(m−1). Every affine element in its coset is (R,t+z), with
z in Z^d, and its m-th power is the translation N_R(t+z). Consequently the coset
contains torsion if and only if the integer equation N_R z = −N_R t is soluble.
Smith decomposition with both unimodular transformations gives a decision and
either an explicit integer z or an exact divisibility obstruction. All point
cosets are tested; testing only the supplied affine generators would miss torsion
in their powers. A returned finite-order element is independently raised to its
claimed order using affine multiplication without reducing translations modulo one.

The center consists precisely of integer translations fixed by every point
matrix: commuting with all integer translations forces the linear part to be
the identity. Its saturated lattice basis is the integer kernel of the stacked
matrices R−I. Orientation is determined by the exact determinants of the point
matrices. `bieberbach` equals `torsionFree` for the supplied crystallographic
group, and `complete` concerns these property decisions, not a classification
of other affine groups.

Eight independent tests cover translation groups through dimension six, reflection
versus glide, quarter- and half-screw axes (including proper-power torsion), a
torsion witness requiring an integer coset shift, the Hantzsche–Wendt group with
trivial center, invariance under an integral shear and rational origin change,
rejection of a nonprimitive lattice or inconsistent vector system, and the two
torsion-free types among all 17 wallpaper groups.

This supplies the mathematical workflow of CARAT's
[Torsionfree program](https://lbfm-rwth.github.io/carat/doc/progs/Torsionfree.html).
General background and affine conventions:
[Eick and Souvignier, Algorithms for Crystallographic Groups](https://www.math.ru.nl/math/~souvi/papers/quantum.pdf).
