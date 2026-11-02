# A complete nonseparable magnetic-symmetry exchange benchmark

This research snapshot supplies a second complete three-dimensional problem: a spinful diagonal mirror M:(x,y,z)→(y,x,z), time reversal T, and all three reciprocal periods. The mirror enhancement plane q₁−q₂∈Z is genuinely nonseparable in the supplied reciprocal coordinates. It differs from the earlier 16-operation three-mirror/glide model in parent-group structure and stabilization geometry.

The producer and recipient are separate Python programs. The producer uses analytic mirror eigenvectors and antiunitary pairing; it never imports the recipient or a geometry construction routine. The recipient independently rebuilds the arrangement and checks all local catalogues and the entire declared connection structure. Both use the identified, vendored Phase 11 exact arithmetic. This is one new independent production route for one new full global problem, not two independent institutions or two wholly independent software stacks.

The first certified fixture contains 165 cells (27 points, 66 lines, 56 faces, 16 volumes), 852 strict incidences, 1,264 restriction chains, 83 reciprocal pairs, 15 mixed-period squares, six cube routes, 216 lifted atlas overlap components and 2,744 triple components. Five complete little-group catalogue classes include Wigner types a, b and c. The carrier uses nonconstant finite Fourier matrices and S₁=S₂=S₃=diag(i,−i). An explicit global gauge proves these periods gauge trivial; no topological material claim is made.

## Reproduce with the Python standard library

From this directory:

```text
python verify.py --problem fixtures/mirror/problem.json --certificate fixtures/mirror/certificate.json
python run_benchmark.py --output my-benchmark-results
python test_contract.py --output my-contract-results
```

The first command must return `CERTIFIED`. The benchmark executes each of five inspection layers in a fresh recipient process on each identical input, including a second valid complex-frame presentation. Every input, output, exit status and elapsed process time is retained. The contract suite separately checks malformed inputs, omitted periodic axes, forged scope, duplicate data and resource ceilings. Current author-run records are supplied, but do not substitute for your own run.

In the packaged snapshot, reproduce the producer with:

```text
python produce.py --geometry-problem fixtures/geometry.problem.json --geometry fixtures/geometry.certificate.json --output my-produced-certificate
python verify.py --problem my-produced-certificate/problem.json --certificate my-produced-certificate/certificate.json
```

No IrRep, spgrep, NumPy or SymPy installation is required for these commands. `vendor/exact_paths.py` is the exact arithmetic dependency; `vendor/exact_geometry.py` is the independently enumerating geometry recipient. Provenance and file digests are supplied in `SOURCE_MANIFEST.json` and `SHA256SUMS.json` in the packaged snapshot.

## What each comparison actually executes

| Inspection layer implemented here | Additional obligation |
|---|---|
| `local` | Exact geometry, actual stabilizers, complete irreducible catalogues, selected decompositions, carrier laws |
| `boundary` | Every enhancement restriction and chain bound to the same carrier |
| `period` | All three periods, all seam pairs, mixed squares and six cube routes |
| `atlas` | Exhaustive chart coverage and overlaps, carrier binding and all triple cocycles |
| `source` | Binding to the declared physical spin convention and gauge |

A pass at a prefix returns `PASS_REQUESTED_LAYER`, never `CERTIFIED`. Unitary wrong boundary, seam and atlas maps survive the preceding prefix and fail their corresponding connection layer. An internally consistent character change survives all internal layers but fails its declared source binding. This last example does not prove that no alternative source gauge could work.

These are our executed ablation layers. They are **not** claimed to be the behavior of external packages. The separate `external_probe.py` records five actual spgrep unitary-kernel calls and checks returned dimensions and characters. Antiunitary completion remains our analytic construction. No external program is said to have missed a seam, atlas or source-binding fault it was never asked to inspect.

The optional external probe requires a separately installed spgrep and NumPy. Its raw numerical results and pinned source hash are retained in the author records. External packages are not bundled or required for the recipient.

## Scope and status

This is a fixed `mirror-grey-global-*-v1` exchange contract, not a universal replacement for the earlier Phase 8 format. The new geometry engine handles a wider rational-hyperplane class, while this complete representation benchmark is deliberately one fully specified model. References are constant matrices; embeddings and the carrier are global Q(ζ₈) finite Fourier matrices. The atlas v1 contract requires constant period matrices and checks this condition explicitly. The selected fibrewise little-group family and declared gluing do not supply an arbitrary full space-group action between different momenta.

`THEOREMS.md` gives the assumptions and soundness proof. `SPECIFICATION.md` gives the wire format and budgets. A fresh-directory author rerun demonstrates that the recipient can leave its producer's environment; it is not external independent replication. Public archival identifiers and third-party replications must be reported only after they actually exist.

The source snapshot inherits the project's GNU General Public License, version 3, in `LICENSE`. No manuscript draft, Fe wavefunction binary, account information or deployment workflow is part of this candidate.
