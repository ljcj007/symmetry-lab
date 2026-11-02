# Rational three-dimensional arrangement protocol

`exact_geometry.py` uses only the Python standard library. It imports no old
verification core and no producer. `construct(problem, limits=None)` reconstructs
the expected geometric certificate; `verify(problem, certificate, limits=None)`
compares every field with that reconstruction. A geometry `CERTIFIED` result is
not a representation certificate.

## Problem

Schema `rational-arrangement-v1`, `dimension: 3`. The region is the closed unit
cube. `operations` is a list of `{id,anti,rotation}` records with unique string IDs,
boolean antiunitary flags and integral unimodular 3 by 3 matrices in direct-lattice
coordinates. Momentum acts by `(-1)^anti rotation^(-T) q`.

For every nonzero row n of this action minus identity, the checker inserts all
planes `n.q=m` with integer m intersecting the cube. Thus all possible little-group
changes are explicitly part of the arrangement. Extra rational planes can be
requested using `planes: [{normal:[a,b,c],offset:d}]`; each rational is an integer
or fraction string, never a floating-point number. `period_axes`, default
`[0,1,2]`, requests opposite-face identifications. Extra planes must induce the
same full subdivision on opposite faces of these axes, or verification fails.

Operations are input geometry, not a claim that they form a magnetic group. The
global representation verifier separately checks multiplication, spin and
semilinear laws. No Euclidean metric or spin lift is inferred by this module.

## Certificate

Schema `rational-arrangement-certificate-v1`; canonical order is mandatory.

- `planes`: primitive integer normal/offset records, canonically oriented and
  sorted, including the six cube boundary planes.
- `cells`: sorted by complete plane sign vector. Each has `id` (`c0000`, ...),
  `signs` (entries -1,0,1), `dimension` (0–3), all exact closure `vertices`, an
  interior `witness` (the vertex centroid), and `stabilizer` (operation IDs in
  input order). Coordinates are canonical fraction strings, including integers.
- `incidences`: every strict closure pair `[upper_id,lower_id]`, including
  non-cover incidences; not merely face-neighbour relations.
- `period_pairs`: `{axis,source,target}` for every cell in each lower cube face,
  translated to its exact cell on the upper face.
- `period_squares`: `{axes:[a,b],source,via_a,via_b,target}` for all cells on
  intersecting lower faces, including positive-dimensional intersections.
- `period_cubes`: `{source,paths:[{axes:[...],cells:[...]}]}` containing all six
  positive three-axis paths at each triple lower-face intersection.

The `vertices` span the cell closure. A consumer may compute an affine basis by
row reduction of differences with the first vertex. Every exact point in a
relative interior has the reported stabilizer. Identity matrices on these
geometric seams alone do not certify a representation's sewing matrices.

## Resource semantics

Defaults bound plane count, triple intersections, vertices, cells and candidate
incidence pairs. Limits belong to verifier policy; the certificate cannot raise
them. Exceeding a limit returns `UNRESOLVED`. A mismatch returns `INVALID`.
General rational planes are supported within these finite budgets; no claim of
polynomial complexity or unbounded three-dimensional arrangements is made.
