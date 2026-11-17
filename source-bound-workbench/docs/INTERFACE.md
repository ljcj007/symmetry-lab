# Shared source-bound certification interface

The workbench makes one reusable contract explicit: every conclusion names a complete source, its parameter domain, the counted states, the proof mechanism and the conditions actually checked. An adapter must state which conclusions it can establish. A common report format does not turn different mathematical premises into one universal proof.

The executable adapter in this release is `source-bound-affine-v1`. It receives a **complete real symmetric affine finite matrix family**

\[
H(t)=H_0+\sum_{j=1}^{d}t_jH_j,\qquad t\in[0,1]^d,
\]

with exact rational coefficients, `2 <= n <= 12` and `0 <= d <= 3`. All rows and all complementary directions must be supplied. It certifies a common ordered interval through exact signed forms, optionally binding one real orthogonal action and identity periodic maps. It does not read VASP, QE, ABINIT or Wannier90 files, execute an SCF calculation, or claim that their output is automatically covered by this adapter.

## Contract layers and branches

| Layer | Required meaning | Current affine adapter |
|---|---|---|
| Source | Formula, dimension, basis/carrier and domain; exact content identity | Full rational coefficient matrices on the closed unit cube; canonical source SHA256 |
| Complete count | Account for the trial subspace and all remaining directions | `r` negative trial directions plus `n-r` positive directions; full-rank combined frame |
| Spectral claim | Fixed ordered cuts and exact sufficient inequalities on the whole domain | Both shifted signed forms positive at every cube vertex; convexity extends them to every point |
| State/action binding | Submitted action must describe the intended ordered subspace | Optional exact orthogonal `V`, coefficientwise `VH_j=H_jV`, and `VQ_minus=Q_minus D`; the projection argument below supplies the spectral connection |
| Periodic compatibility | The specified maps identify opposite domain boundaries | Optional identity maps only, for directions whose affine coefficient is exactly zero |
| Topology or obstruction | Additional claim-specific mathematical premises | Not implemented by this affine adapter; a successful spectral report never assigns a topology index or a symmetry-enforced crossing |

The larger manuscript's Fe obstruction, frozen-Si gap, reconstructed-Bi topology and negative Al example have different branches. A future adapter may reuse the report contract only after implementing and testing its own sufficient conditions. Existing archived material proofs remain at their recorded receivers; their success is not inferred from the six controls in this release.

## Packet shape

```json
{
  "schema": "source-bound-affine-v1",
  "source": {
    "id": "an-author-supplied-label",
    "dimension": 4,
    "parameters": ["t1"],
    "H0": [["-2","0","0","0"],["0","-1","0","0"],["0","0","1","0"],["0","0","0","2"]],
    "H_affine": [[["1/4","0","0","0"],["0","1/4","0","0"],["0","0","-1/4","0"],["0","0","0","-1/4"]]]
  },
  "request": {
    "rank": 2,
    "cuts": {"lower":"-1/2", "upper":"1/2"},
    "Q_minus": [["1","0"],["0","1"],["0","0"],["0","0"]],
    "Q_plus": [["0","0"],["0","0"],["1","0"],["0","1"]]
  },
  "symmetry": {
    "V": [["1","0","0","0"],["0","-1","0","0"],["0","0","1","0"],["0","0","0","-1"]],
    "D": [["1","0"],["0","-1"]]
  }
}
```

The JSON Schema is `schema/source.schema.json`; the receiver also enforces dimensions and mathematical identities that cannot be expressed by ordinary JSON Schema alone. Exact numbers are strings containing integers, fractions, or finite decimals, or safe JSON integers. Floating-point JSON numbers, exponents, nonfinite values, duplicate keys and unknown fields are rejected. Source labels must contain non-whitespace text and valid Unicode. Strings of more than128 characters and numerator/denominator sizes above512 bits are rejected. JSON integers are bounded by `2^53-1` so browser and Python inputs agree. Inputs are limited to1MB.

`source.id` is a descriptive label, not proof of origin. `source.canonical_sha256` in the receipt hashes the source object after recursively sorting keys and serializing with no whitespace; exact rational strings are retained as written. `input_sha256` binds the entire packet, including the requested cuts and witnesses. These hashes identify received content; neither authenticates the scientist, executable or material provenance.

## Why the closed-domain count is complete

Let `Q_minus` have `r` columns and `Q_plus` have `n-r` columns. The receiver checks the positive Gram pivots of the full square matrix `Q=[Q_minus Q_plus]`. For every vertex `v` of the cube it proves

\[
- Q_-^T(H(v)-aI)Q_->0,\qquad Q_+^T(H(v)-bI)Q_+>0.
\]

The test is an exact rational, unpivoted LDL decomposition. Positive pivots prove positive definiteness; no numerical eigensolver or tolerance is involved. Each matrix form is affine in `t`, and every point in the cube is a convex combination of its vertices. Strict positivity at all vertices therefore holds on the entire closed cube, including faces and corners.

The min–max principle supplies at least `r` eigenvalues below `a` and at least `n-r` above `b`. Since the full operator has dimension `n`, there are exactly `r` below the lower cut and all other states above the upper cut. Thus one common interval exists on the entire domain. The report conservatively states an indirect separation of at least `b-a`.

The frame columns need not be orthogonal for this count. They need not be eigenvectors. The off-diagonal blocks between the two trial spaces need not vanish. An unsuccessful sufficient test produces `UNRESOLVED`, not a physical claim that the system is gapless.

## Why a trial action can be bound to the ordered states

When `symmetry` is supplied, the current profile requires `Q_minus^T Q_minus=I`, `V^T V=I`, `D^T D=I`, exact coefficientwise covariance and `VQ_minus=Q_minus D`. This is one declared real orthogonal action, not a full space-group representation.

`Q_minus` is a **trial frame**, not automatically the exact spectral eigenframe. Let `P(t)` be the ordered projector determined by the complete count. Projection by `P(t)` is injective on the negative trial space: otherwise a nonzero trial vector would lie entirely in the high-energy complement, where its expectation exceeds `b`, contradicting its expectation below `a`. The projected frame has rank `r` and spans `P(t)`.

Because `V` commutes with `H(t)`, it also commutes with `P(t)`. The projected frame intertwines the same `D`; polar normalization then gives an isometric equivariant embedding into the true ordered subspace. This supplies the missing state-identity connection without pretending the submitted trial columns were eigenvectors. If any action identity fails, the requested combined certification is `REJECTED`; the report retains which spectral checks passed.

## What the outcomes mean

- `CERTIFIED`: complete ordered counts and every requested optional identity passed. The receipt states the exact domain, interval and branch.
- `UNRESOLVED`: a full-rank or strict signed-form witness did not pass. A different witness or different cuts may succeed. No physical gap closure follows.
- `REJECTED`: malformed/unsupported input or a violated submitted action/period identity. This is a contract result, not a theorem that a material lacks a phase.

A failed topology request cannot be silently promoted to a spectral success: unknown request fields are rejected. The current adapter never sets `topology_certified` to true. Omitted optional actions are reported as `NOT_REQUESTED`.

## One command, one new receipt

From the repository root:

```text
python -B src/verify.py examples/positive-gap.json --out output/positive-receipt.json
python -B -m unittest discover -s tests -v
```

No third-party Python package is required. The CLI never overwrites a receipt. Exit status is0 for `CERTIFIED`,2 for `UNRESOLVED`,3 for `REJECTED`, and4 when an existing output would be overwritten. The website independently implements the same profile with BigInt rational arithmetic, without uploading the packet to a server. Browser and CLI agreement is useful implementation evidence, not external validation of the physical source.

## Inputs included in this release

| Example | Expected outcome | Purpose |
|---|---|---|
| `positive-gap.json` | CERTIFIED | Complete affine common-gap count and bound action |
| `wrong-window.json` | UNRESOLVED | A legitimate full frame aimed at the wrong energy window fails the signed forms |
| `overlap.json` | UNRESOLVED | A family can keep a pointwise direct gap while its energy ranges overlap globally |
| `malformed-source.json` | REJECTED | A source with an omitted matrix row cannot masquerade as the full carrier |
| `wrong-symmetry.json` | REJECTED | Correct spectrum and an orthogonal submitted action are insufficient when their embedding relation is wrong |
| `periodic-gap.json` | CERTIFIED | The accepted identity-period profile has an exactly constant coefficient along that direction |

These are exact controlled mathematical sources designed for checking the interface. They are not additional material results or evidence of broad DFT scalability.
