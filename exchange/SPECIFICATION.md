# Fixed mirror-grey global certificate v1

All files are UTF-8 JSON. Rational coefficients and frequencies use integers or fraction strings. Floating-point and Boolean scalar substitutes are rejected. The exact coefficient field is Q(ζ₈); each Fourier entry is a list of `{coefficient, phase, frequency}` terms with three-dimensional rational frequency. The canonical problem digest is SHA-256 of sorted-key compact JSON with unescaped Unicode.

## Problem

The exact fields are `schema`, `model`, `rank`, `geometry_problem`, `charts`, `source_carrier`, `spin_convention`, `scope`. Values fix the schema `mirror-grey-global-problem-v1`, model `spinful-diagonal-mirror-grey`, integer rank two and the stated spin convention. The recipient uses a fixed scope string; input text cannot broaden the meaning of certification.

`geometry_problem` uses `rational-arrangement-v1`, with the operations E,M,T,MT in that order. All three `period_axes=[0,1,2]` are mandatory semantically; omission has the geometry protocol's same all-three default. A subset is invalid in the global contract. Extra rational refinement planes may be supplied, subject to exact reciprocal pairing.

The source matrices fix M²=T²=−I and semilinear MT=TM. Charts specify a unique `id` and rational `lower` and `upper` triples, with coordinate bounds between −1 and 2 and widths strictly between zero and one. They are open lifted boxes. Coverage is checked on the projected torus, including every rational cell boundary.

## Certificate

The exact top-level fields are:

- `schema`, `problem_sha256`: `mirror-grey-global-certificate-v1` and the canonical binding.
- `geometry`: the complete rational-arrangement certificate, rebuilt independently by the geometry recipient.
- `catalogues`: complete branch matrices, dimensions, Wigner classification and explicit selected multiplicities for every used little subgroup.
- `source_gauge`, `carrier`, `periods`: exact unitary Fourier matrices, all four carrier operations, all three periods.
- `cells`: exactly one catalogue selection and unitary embedding per geometric cell.
- `boundaries`: exactly every strict geometry incidence, with the common-carrier comparison matrix.
- `seams`: exactly every periodic boundary pair, with integer `axis`, source and target IDs and selected comparison matrix.
- `atlas`: exactly every actual lifted overlap component, with integer shift triple, exact open intersection bounds and transition matrix.
- `producer`: provenance metadata only; it is not trusted as a proof.

The recipient recomputes all group and catalogue conditions, then all selected bindings. All submitted matrix identities in this v1 exchange are global Fourier identities. Period matrices must be constant in momentum for this atlas contract. Prefix inspection is exposed only for controlled ablations; it returns `PASS_REQUESTED_LAYER` and cannot certify the whole object.

## Budgets and result states

The CLI permits at most 16 MiB per input file. Exact trees have maximum depth 64, 250,000 nodes and 256-bit integer encodings. Rational strings have bounded length and numerator/denominator bit size. Matrix rank is limited by the exact arithmetic library to four and by this problem contract to two. A Fourier entry has at most 4,096 terms; polynomial products have a 200,000-term candidate budget. Geometry supplies separate plane, vertex, cell, triple-intersection and incidence budgets documented with its source.

Atlas limits are: 16 charts, 50,000 coverage sample cells/points, 500,000 coverage-point/box comparisons, 1,024 overlap components, and 100,000 potential ordered overlap-pair checks. Bounds are checked before the corresponding expensive enumeration. An exhausted budget returns `UNRESOLVED`; it is not classified as a mathematical failure.

| Status | Exit code | Meaning |
|---|---|---|
| `CERTIFIED` | 0 | All obligations, including declared source binding, hold within this fixed contract |
| `PASS_REQUESTED_LAYER` | 0 | The requested prefix passed; no whole-object certification |
| `INVALID` | 2 | A protocol condition or submitted identity failed |
| `UNRESOLVED` | 3 | Exact language or explicit resource limit prevented a decision |

`INVALID` concerns the submitted candidate. It does not establish that no valid certificate or different gauge exists for the underlying physical problem. `CERTIFIED` is contingent on faithful arithmetic and program execution; the code is not proof-assistant verified.
