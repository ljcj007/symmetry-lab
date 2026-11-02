# A second complete global problem: diagonal mirror and time reversal

This document proves the contract implemented by `verify.py`. It does not claim a proof-assistant verification of Python. The geometry checker has its own coverage proof; the present recipient composes that result with exact representation and gluing identities. The producer is independent of the recipient call chain, but both use the explicitly identified Phase 11 arithmetic library. Independence here is an implementation boundary, not a different institution or research team.

## 1. Fixed physical problem and exact language

Let the base be X = R³/Z³. In fractional reciprocal coordinates, M exchanges q₁ and q₂ and leaves q₃ fixed. T reverses momentum and is antiunitary. Write g=(m,a), m,a in {0,1}, in the order E,M,T,MT. Multiplication is componentwise addition modulo two and the spin multiplier is

ω((m,a),(n,b)) = (−1)^(mn+ab).

Set ζ = exp(πi/4), J = [[0,1],[−1,0]], and

M₀ = [[0,ζ⁻¹],[−ζ,0]],  C⁰_(m,a) = M₀^m J^a.

Direct multiplication gives M₀²=J²=−I and M₀J=J conjugate(M₀). These identities prove the complete semilinear multiplication law with the declared multiplier. The matrices have a physical spin convention for a reflection normal to (1,−1,0); spin is axial, so the reflection is represented by its associated π spin rotation.

The exact arithmetic is Q(ζ)[exp(2πi ν·q)] with finite rational frequency support. Entries are reduced in Q[x]/(x⁴+1). Distinct Fourier characters are linearly independent on R³: a generic real line separates their frequencies, and successive derivatives give an invertible Vandermonde matrix. Thus coefficient equality proves a whole-domain identity, without a momentum mesh. All tests in this exchange contract are global Fourier identities; this is stronger than merely restricting them to a stratum. Matrices outside the supported exact language or budgets return UNRESOLVED.

## 2. Genuine nonseparable enhancement and complete catalogues

The actual stabilizer conditions follow from (−1)^a R_g^−T q−q being integral:

| Operation | Fixed-locus condition |
|---|---|
| M | q₁−q₂ is integral |
| T | each 2qᵢ is integral |
| MT | q₁+q₂ and 2q₃ are integral |

The mirror locus is a genuine oblique plane. The exact rational-arrangement recipient independently reconstructs all strata, incidences and reciprocal identifications; supplied centroids and cell counts do not substitute for this proof. Its decomposition may refine the minimal constant-stabilizer stratification. Such a refinement is valid and is reported as such.

Only five little subgroups occur. Their complete projective corepresentation catalogues are:

| Little subgroup | Complete catalogue | Selected multiplicity |
|---|---|---|
| E | one trivial complex line | 2 |
| E,M | two mirror lines M=+i and M=−i | 1,1 |
| E,T | one two-dimensional Kramers branch, T=J K | 1 |
| E,MT | one anti-real line, MT=ζ³ K | 2 |
| E,M,T,MT | one two-dimensional paired-mirror branch | 1 |

**Lemma 1 (irreducibility and completeness).** The listed catalogues are complete up to unitary semilinear equivalence.

**Proof.** For E, complex irreducibles have dimension one. For the projective mirror group, its generator satisfies M²=−I and hence has eigenvalues ±i; its two distinct one-dimensional characters exhaust the two-dimensional projective group algebra. In the T-only subgroup, T²=−I forbids an invariant complex line: an antiunitary map on one complex dimension squares to +1. Choosing any unit vector v gives the orthonormal invariant pair v,Tv, and repeating on the orthogonal complement decomposes every representation into equivalent Kramers pairs. For MT, its square is +1, so its fixed real space has an orthonormal real basis, giving equivalent anti-real lines; an arbitrary scalar antiunitary phase is removable by a unitary basis phase. Choosing ζ³ as the reference phase allows all submitted embeddings to remain in Q(ζ). In the full group, T exchanges the mirror +i and −i eigenspaces because it commutes semilinearly with M. Every pair v,Tv spans an invariant two-dimensional representation, and the same argument on the orthogonal complement exhausts the representation. This is the paired-inequivalent-unitary-branch Wigner type c; T-only is type b and MT-only type a. ∎

The verifier checks the multiplier law and unitarity, the dimensions in this classification, and both distinct mirror characters. Counting branches alone would accept a duplicated mirror line and is expressly insufficient.

## 3. Global selected carrier, restrictions and periods

Define

U(q)=diag(exp(2πi(q₁+q₂+q₃)/4),exp(−2πi(q₁+q₂+q₃)/4)).

Let C_g(q)=U(q)C⁰_g κ_g(U(q))† and S_a=diag(i,−i) for a=1,2,3. Then S_a=U(q+e_a)U(q)†. The physical carrier is nonconstant in this gauge, and all three reciprocal seams act by nontrivial matrices. They are nevertheless gauge equivalent to constant C⁰ and identity periods; this example is not a nontrivial topological phase.

For each stratum c, the certificate supplies a unitary L_c and the selected direct sum F_c. The recipient verifies C_g κ_g(L_c)=L_c F_c,g for each actual little-group operation, everywhere in R³. For every strict closure incidence h→l, it checks L_l W_hl=L_h and the restriction intertwining for operations persisting from h. Every incidence is required. Therefore

W_ml W_hm = L_l† L_m L_m† L_h = L_l† L_h = W_hl.

The implementation additionally tests each length-two chain. Associativity proves all longer flags, including volume–face–line–point chains.

For every reciprocal boundary pair s→t along a, the selected map P must satisfy

L_t(q+e_a)P_a,s(q)=S_a(q)L_s(q).

The carrier covariance S_a C_g = C_g(q+e_a)κ_g(S_a), exact shifted period squares, and these shared embeddings bind every seam to the same selected object. Boundary–period naturality follows by substituting L_l W_hl=L_h on each side. All selected period squares and all six routes at the triple corner are also recomputed explicitly.

**Lemma 2 (all integer-period paths).** The shifted square equations and unitary inverses determine a unique S_n(q) for every n in Z³, independent of the chosen lattice word.

**Proof.** Inverse steps cancel at their actual shifted parameter values. A shifted square exchanges adjacent positive steps in different directions. Multiplying that identity by the appropriate shifted inverses yields the three other sign combinations. Repeated exchanges and cancellations reduce every word to the same ordered word. This also proves S_(n+m)(q)=S_m(q+n)S_n(q). ∎

## 4. Atlas completeness and soundness

The certificate gives lifted open boxes of widths below one. The recipient checks their projected union covers the torus by a complete rational endpoint decomposition in each coordinate, including endpoints. It independently enumerates every nonempty lifted overlap component. The v1 exchange protocol requires constant period matrices, checked coefficientwise; the atlas construction uses this restriction explicitly. A transition from q in chart i to q+n in chart j must equal S_n. Every actual triple overlap checks S_m S_n=S_(n+m). General Fourier periods are outside this atlas v1 contract, even though the lower-level algebra can represent them.

**Theorem 1 (soundness of this exchange contract).** If the independent recipient returns CERTIFIED, the declared rank-two carrier, complete local catalogues, selected restrictions, three-direction periodic identifications and atlas describe one Hermitian bundle over X with the stated fibrewise projective little-group actions, bound to the declared physical spin carrier by the supplied exact gauge.

**Proof.** Exact geometry certifies every actual stratum and stabilizer. Lemma 1 and the exact local checks establish complete reference catalogues and the selected decomposition of C_g. The common embeddings bind all restrictions and their chains to this carrier. Lemma 2 gives a free, properly discontinuous integer action (q,z)↦(q+n,S_n(q)z). Its quotient is a rank-two Hermitian bundle: small lifted neighborhoods give local trivializations and unitary periods preserve the metric. Period covariance makes every little-group action independent of the representative q. Required seam and boundary comparisons identify the submitted selected maps with those on this same quotient. Complete atlas enumeration and transition binding identify every submitted chart and triple overlap with that quotient. Finally, the recipient independently reconstructs the fixed spin matrices and verifies C_g=U C⁰_g κ_g(U)† and S_a=U(q+e_a)U†. Thus source binding is additional to internal consistency. ∎

This result supplies fibrewise little-group actions and declared gluing. An arbitrary space-group action between different momenta is not inferred. The global bundle in this fixture is gauge trivial by its explicit U. Neither a DFT gap nor material topology is established.

## 5. Why the staged failure benchmark is meaningful

All ablation levels are explicitly implemented prefixes of this recipient, run as separate processes on identical problem/certificate bytes. They are not attributed to spgrep or any other package. A wrong unitary boundary is invisible to the local prefix; a wrong seam is invisible to local-plus-boundary; an atlas change is invisible before atlas binding. Multiplying all M and MT matrices in both carrier and reference catalogues by −1 preserves the group law and every internal connection, but changes the fixed source assignment. The last binding layer detects it with unchanged input spin data and submitted U. A different valid U might make a related character convention physically equivalent; this controlled test concerns the declared binding, not impossibility of any alternative certificate.

The separate external probe actually calls pinned spgrep unitary-kernel representation generation for each of the five local subgroup classes. It compares dimensions and mirror characters at the stated numerical tolerance. It makes no statement that external software was asked to verify, or failed to verify, these global connection records.
