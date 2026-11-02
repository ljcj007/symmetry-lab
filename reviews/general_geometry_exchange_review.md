# Independent review of the new global exchange example

Reviewer work line: general geometry. Date: 2026-11-02.

The geometry author reviewed the separate exchange producer, recipient and
proofs without editing their implementation. This is an internal independent
code path and mathematical review, not external institutional replication.

## Mathematical findings

1. **The new lattice problem is distinct.** For the swap mirror, the entries of
   M−I generate Z; for a coordinate mirror they generate 2Z. Unimodular integer
   conjugation preserves this ideal. The connected versus two-component fixed
   tori provide the same distinction. The oblique fixed plane cannot be removed
   by an allowed primitive integer lattice relabelling.
2. **The physical spin convention is consistent.** With ζ=exp(πi/4),
   M₀=[[0,ζ⁻¹],[−ζ,0]] and J=[[0,1],[−1,0]], M₀²=J²=−I and
   M₀J=J conjugate(M₀). M₀ transforms the Pauli vector by det(M)M, as required for
   axial spin under the coordinate-swap reflection. J conjugates spin to its
   negative under time reversal.
3. **The five local catalogues are complete for this fixed model.** The mirror
   has two inequivalent ±i complex lines. T²=−I excludes a complex invariant line
   and decomposes into equivalent Kramers pairs. MT has square +I and admits a
   real orthonormal basis, so its anti-real lines are equivalent. In the full
   group, T exchanges the ±i eigenspaces; choosing v in one and Tv in the other
   yields the unique irreducible paired two-dimensional corepresentation.
   The recipient checks both mirror characters, not merely two branch records.
4. **Boundary compatibility uses a common carrier.** The identities
   L_l W_hl=L_h imply all restriction chains; the implementation additionally
   checks every length-two chain. The matrices are unitary because both L's are.
   Global Fourier identities are stronger than identities restricted to each
   geometric face. No sampled-point argument is substituted for an identity.
5. **Period and atlas binding are coherent.** The covariance equation has the
   correct antiunitary conjugation of S. The seam identity evaluates the target
   embedding at q+e_a. Shifted squares plus unitary inverses generate all integer
   paths; six positive cubic paths are also tested. Open-chart coverage includes
   boundaries in a complete axis partition, and lifted overlap domains are
   independently reconstructed. Constant period matrices are explicitly
   required before the atlas product formula is used.
6. **The stated scientific scope is supported.** This is a rank-two Hermitian
   bundle with fibrewise projective little-group actions, complete local
   reference catalogues and declared torus gluing bound to a fixed spin carrier.
   It does not establish a full arbitrary space-group action between different
   momenta, a DFT gap, a material result or a nontrivial topology. Its explicit
   source gauge trivializes the bundle, so nonidentity seam matrices are not
   presented as a topological invariant.

## Implementation points raised during review

The reviewer requested a fixed certified scope string, explicit atlas enumeration
budgets, bounded rational chart parsing, exact integer checks for dimension/rank,
an object check for `geometry_problem`, and exact integer checks for seam axes and
atlas shifts. These prevent unverified scope declarations, unbounded overlap
enumeration and Python bool/int equality from silently widening the protocol.
The revised implementation was checked with five independent CLI mutations:
rebound overstated scope, rebound missing period axes, a non-object geometry
problem, a boolean seam axis and a boolean atlas shift. All five returned
`INVALID` at the expected layer. The final reviewed implementation hash is
recorded in the companion JSON.

The root independently identified the need to require all three periodic axes in
the fixed global contract. That requirement is consistent with the theorem and
avoids accepting a geometrically partial seam inventory under a full-period
description.

## Independent numerical evaluation

The reviewer decoded submitted Fourier JSON directly using NumPy complex
exponentials and Python fractions, importing neither producer, recipient nor
their exact arithmetic library. Five momenta cover generic, mirror, anti-only,
T-only and full-group conditions. A total of **6,926 matrix comparisons** check
source-gauge binding, semilinear products, selected decompositions, all boundary
maps, all selected seams, source-period relations, carrier-period covariance and
Pauli-vector transformation. The maximum elementwise residual is
1.912×10⁻¹⁵. The inputs and source version are hashed in
`general_geometry_exchange_review.json`.

The complete replay script is `review_exchange_independently.py`. From the
workspace root, run:

```powershell
python -B research/ncs-program/phase13/reviews/review_exchange_independently.py
```

The optional `--base-dir` points to a relocated Phase 13 directory. The script
saves exact mutated inputs, original CLI output and source hashes. Its numerical
decoder imports only NumPy and the standard library; the five contract probes
execute the recipient as separate isolated CLI processes.

This is a supplementary floating-point cross-check of conventions and decoding.
It does not turn numerical samples into a global exact proof; that role belongs
to the exact coefficient identities and the stated mathematical arguments.

## Independence and benchmark interpretation

The new producer does not import the recipient or geometry constructor. It does
share the documented Phase 11 exact arithmetic and consumes the fixed geometric
fixture; it independently recomputes stabilizers at the supplied interior
witnesses. The geometry recipient reconstructs the entire arrangement, and a
second Cramer/barycentre algorithm cross-checks all cells. This is a useful
exchange boundary, not a claim of independent research teams or zero shared
dependencies.

The ablation layers are actual prefixes of this recipient, not simulated
spgrep capabilities. The source-character mutation tests a declared binding
despite internal consistency; it does not prove that no alternative gauge could
relate the changed character convention to another acceptable certificate.
