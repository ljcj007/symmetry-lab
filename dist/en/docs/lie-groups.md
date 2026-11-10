# Lie-group classroom: foundations, physical applications and representation decomposition

Connecting discrete crystalline and continuous symmetries, the classroom contains 32 Chinese lessons on U(1),SU(2),SU(3), 32 worked examples, 64 self-check questions, and 32 progressively revealed derivation exercises. Existing lesson, quiz, and derivation IDs remain. Prose, questions, and diagrams are independently written; public notes check definitions and conventions without copying book pages, paper figures, or external question banks.

## Learning paths

| Lesson | Question | Example |
| :-- | :-- | :-- |
| Continuous and discrete | Must an infinite group be continuous? | C₄ subgroup of U(1) |
|  unitary matrix  | Why is total probability unchanged? | Distinguish U(2)/SU(2) |
| Generators and commutators | Why does operation order matter? | [σx/2,σy/2]=iσz/2 |
| SU(2) spinors | How do two complex components encode a 3D direction? | Rotate +z by 90° about y |
| Double cover | 2π versus 4π? | Interference after one-path rotation |
| Representations | What dimensions do 2, 3 and 8 mean? | The same central element acting on j=1/2 and j=1 |
| SU(3) generators | Why are eight real parameters needed? | T₁ mixes two basis states |
| Cartan, weights, roots | Triangle  weight diagram  versus hexagonal roots? | E₁₂ roots/phase evolution |
| Rabi oscillations | How do driving and detuning change a qubit? | Maximum transfer when detuning equals drive strength |
| SU(2) tensor products | How do two angular momenta combine? | Coupling orbital 1 to spin 1/2 |
| Singlet/exchange | Why 3+1 out of four? | Two-spin-1/2 levels/measurement |
| SU(3) representations | What are (p,q), dimension and Casimir? | Two conjugate 15-dimensional representations |
| Flavor and color | How can the same SU(3) have different physical meanings? | Meson trace decomposition and baryon coupling paths |
| Octets/ selection rule  | Why two 8s? | Allowed channels versus dynamics |
| SU(3) CG basis changes | How does decomposition yield state-by-state amplitudes? | A round-trip basis change for a complex-phase state |
| Coupling fundamental representations | Why is the singlet negative in GT coordinates? | Symmetric states of 3⊗3 and the 3⊗3̄ singlet |
|  outer multiplicity /exchange | Can octet copies mix? | Exchange after copy-basis rotation |
| Higher-dimensional representations | How do we distinguish equal dimensions and conjugate labels? | The 42+24+15 decomposition of 27⊗3 |
| Exact radical CG | How do generators directly produce radicals? | One lowering step in 10⊗3 and √3/2 |
| Exact complex amplitudes | Preserve phase in inversion? | Exact inputs, probabilities, round-trip  change of basis  |
| Triple tensor products | Why does changing brackets mix paths? | Two sets of intermediate channels for 3⊗3̄⊗3→3 |
| Racah and 6j | How is a unitary overlap scaled to 6j? | Three-3 highest weights, radicals, and weighted orthogonality |
|  recoupling /operators | Why couple another pair first? | Complex paths/two-body F†O_R F |
| Four-factor pairing trees | How do (AB)(CD) and (AC)(BD) compare? | Three paths coupling four 3 factors to 15 |
| Four octets | Why does a 4096-dimensional space need only matrices of order 8,32,33? | Outer multiplicities and exchange traces for final 1,8,27 |
| Adjoint invariants | Check  9j coefficients  without CG tables? | Double-singlet 1/8 overlap/five channel probabilities |
| Adjoint two-body interactions | Does zero mean imply no fluctuations? | Casimir energies, exact complex states and variance 9κ²/8 |
| Exact 9j | Why do unitary overlaps differ from dimension-reduced tables? | A complete 3×3 radical matrix from four product states |
| Color/four-body operators | Pairing bases in models? | Color recoupling, root  multiplicity , complex round trips |

Lesson text in `data/lie-group-lessons.json` includes sources, goals, derivations, pitfalls and explained self-tests. `data/lie-derivations.json` additionally contains 4 SU(2) and 20 SU(3) derivation exercises, each with givens, hints, 4 derivation steps, a conclusion, pitfalls and a comprehension check. Learners reveal steps actively. Self-test progress is saved independently without overwriting existing point-/space-group lesson progress.

## Common mathematical conventions

Use columns/active transformations; ABψ applies B then A.

```text
ψ′ = Uψ
U(θ) = exp(−iθT)
T† = T，Tr T = 0
X = −iT 是无迹反厄米李代数元
[Ta,Tb] = i Σc fabc Tc
```

SU(2) uses `Ta=σa/2` and SU(3) uses standard `Ta=λa/2`, both satisfying `Tr(TaTb)=δab/2`. The ordinary commutator of two Hermitian matrices is anti-Hermitian; the i in the formula cannot be omitted. Lie-group exponentials use real parameters, and core calculations use radians.

For a normalized two-component state `(a,b)`, SU(2) gives the Bloch vector:

```text
r = (2 Re(a* b), 2 Im(a* b), |a|²−|b|²)
⟨S⟩ = (ℏ/2)r
U(n,θ) = cos(θ/2)I − i sin(θ/2)(n·σ)
```

U=exp(−iθn·σ/2) gives right-handed active Bloch rotations. Pure Bloch vectors have length 1; overall-phase-related states share one point. `U(2π)=−I`, `U(4π)=I` concern vectors; isolated states retain all probabilities after 2π. On one coherent path only, the sign is relative and may change interference.

SU(3) Cartan coordinates use `(T3,T8)`, not the potentially rescaled particle-physics coordinates `(I3,Y)`:

```text
w1 = ( 1/2,  1/(2√3))
w2 = (−1/2,  1/(2√3))
w3 = (   0, −1/√3)
αij = wi − wj，i≠j
```

The fundamental representation's three weights and six nonzero roots should be plotted separately. The adjoint also contains two zero-weight directions, but zero is not a root. A probability-weighted average of weights is an expectation, not another eigenstate's weight. Eij belong to the complexified Lie algebra; physical Hermitian generators combine Eij with Eji.

Fundamental T₁ exponentials have period 4π. T₈ has least period 4π√3; at θ=4π√3/3 it equals central `exp(−2πi/3) I₃`, changing only overall phase without returning to I₃. Do not impose universal “4π return” on every SU(3)  generator . General real-combination one-parameter evolution may lack finite positive period.

## Conventions and limits of physical applications

The Rabi experiment uses a constant effective Hamiltonian in a rotating frame. Relating it to a driven physical two-level system requires conditions such as the rotating-wave approximation. The initial state is `|↑⟩=(1,0)ᵀ` and target `|↓⟩=(0,1)ᵀ`; arrows do not automatically specify energy ordering. Drive phase is zero; dephasing, leakage, and other levels are absent:

```text
H_eff/ℏ=(Ωσx+Δσz)/2
Ωeff=√(Ω²+Δ²)
P↓(t)=Ω²/(Ω²+Δ²) sin²(Ωeff t/2)
Δ=0、Ω>0 时：tπ=π/Ω
```

Ω/Δ are angular frequencies in common units; t has inverse units. At Ω=Δ=0, evolution is identity, transition probability takes continuous zero limit. Detuning raises oscillation frequency/lowers peaks; a resonant π pulse no longer guarantees inversion. NMR, atoms, circuits are contexts, not device calibrations.

The SU(2) irreducible representation `Vj` has dimension `2j+1`. A tensor product of representations is also called a direct product of representations; it differs from the group direct product `SU(2)×SU(2)`. Angular-momentum addition concerns the same rotation acting on both factors, a representation of diagonal SU(2):

```text
Vj₁⊗Vj₂ = ⊕J VJ，J=|j₁−j₂|, |j₁−j₂|+1, …, j₁+j₂
M=m₁+m₂
|J,M⟩=Σm₁,m₂ C(j₁m₁,j₂m₂;JM)|j₁,m₁⟩|j₂,m₂⟩
```

Interactive calculations use standard Condon–Shortley phases, with singlet `(|↑↓⟩−|↓↑⟩)/√2`. Overall phase changes leave probabilities unchanged; relative-sign changes can alter the state. CG coefficients are basis-change amplitudes whose squared moduli give measurement probabilities.

Exchange uses κ; J only labels total angular momentum. Dimensionless spins satisfy physical `S⃗=ℏs⃗`;κ has energy units:

```text
H=κ s⃗₁·s⃗₂
EJ=κ[J(J+1)−j₁(j₁+1)−j₂(j₂+1)]/2
j₁=j₂=1/2：Etriplet=κ/4，Esinglet=−3κ/4
```

Thus κ>0 places the singlet lower in this convention. Other references may use an overall minus sign or extra factor; convert conventions before comparing. The model explains multiplets of ideal exchange coupling without fitting κ from material structures or including magnetic fields and anisotropy. Singlets and triplets describe only spin; identical fermions’ total states must combine spatial and other degrees of freedom to satisfy antisymmetry.

## SU(3) tensor-product decomposition

Nonnegative integer Dynkin `(p,q)` labels finite-dimensional  irreducible representation ; conjugate `(q,p)`. Using prior  generator  normalization:

```text
d(p,q)=(p+1)(q+1)(p+q+2)/2
C₂(p,q)=[p²+q²+pq+3p+3q]/3
3=(1,0)，3̄=(0,1)，6=(2,0)，8=(1,1)
10=(3,0)，10̄=(0,3)，27=(2,2)
```

These Casimir values are not energies, and neither Casimir nor dimension alone distinguishes every representation. Weight diagrams use `(T3,T8)` coordinates, where multiple independent states may share a coordinate. The experiment convolves exact integer weight counts, successively removes complete irreducible weight systems by highest weight, and checks multiplicities and dimensions.

```text
3⊗3=6⊕3̄
3⊗3̄=8⊕1
6⊗3=10⊕8
3⊗3⊗3=10⊕8⊕8⊕1
8⊗8=27⊕10⊕10̄⊕8⊕8⊕1
```

In the last formula the whole octet appears twice, distinct from its internal zero-weight multiplicity 2. Factor exchange further separates `Sym²(8)=27⊕8s⊕1` and `Λ²(8)=10⊕10̄⊕8a`. The representations/weights/products experiment returns highest-weight multiplicities and weight counts. The CG/basis-change experiment constructs full state-by-state transformations and resolves exchange labels 8s/8a, with separate numerical and exact product-dimension limits.

Flavor SU(3) organizes u, d, s into approximate global  multiplet , broken by masses, electromagnetism, etc. Color SU(3) is QCD's local gauge structure, every flavor carrying color. Color contractions and flavor  multiplet  classification differ: quark–antiquark singlets use δ, three-quark singlets antisymmetric ε. Flavor  multiplet  still needs spin, orbital, Fermi constraints;  tensor product  decomposition predicts neither masses, lifetimes, nor all low-energy spectra.

For an operator in `Rop`, a possibly nonzero `Ri→Rf` matrix element requires `Rf` to appear in `Rop⊗Ri`. This is a necessary selection rule; other quantum numbers, dynamics or reduced matrix elements may still make it vanish. Multiplicities count independent reduced channels without determining their coupling constants, scattering cross sections or decay rates.

## SU(3) CG coefficients and basis changes

Decompositions give types/copies; CG matrices expand each coupled state. Labels: irreducible `R=(p,q)`,  outer multiplicity  α, internal μ. **Product states are rows, coupled states columns**:

```text
C_(ij),(Rαμ)=⟨i,j|R,α,μ⟩
|R,α,μ⟩=Σij C_(ij),(Rαμ)|i,j⟩
乘积坐标 a=C b
耦合坐标 b=C†a
C†C=CC†=I
P(R,α)=Σμ|bRαμ|²，P(R)=ΣαP(R,α)
```

The probability formulas above assume normalized states. This implementation chooses real CG matrices, but state coordinates may be complex. For unnormalized custom inputs, the core preserves amplitudes and norm and reports probabilities as squared moduli divided by the input squared norm. Complex amplitudes are needed for coherent superpositions and inverse transformations; identical coordinate probabilities do not imply identical complex vectors.

### Bases, phases, and the antifundamental representation

Inputs use orthonormal Gelfand–Tsetlin (GT). `(p,q)` top row `(p+q,q,0)`, second `(a,b)`, bottom c, with interlacing:

```text
p+q ≥ a ≥ q ≥ b ≥ 0，a ≥ c ≥ b
I=(a−b)/2
I3=c−(a+b)/2
Y=a+b−2(p+2q)/3
T3=I3，T8=√3 Y/2
```

GT patterns also distinguish the two zero-weight states within a single octet. Nonzero coefficients of adjacent raising operators are positive. The fundamental order is `(u,d,s)`; the antifundamental in the natural conjugate basis uses `(s̄,−d̄,ū)`. The first nonzero product coordinate of a highest-weight vector is positive, and other states are constructed consistently with the same GT generators; remaining copy spaces use fixed projection/orthogonalization ordering. Identical factors are first resolved by exchange symmetry, with positive-exchange channels first.

Thus the singlet in the natural basis and in experimental GT coordinates is respectively:

```text
|1⟩=(|u,ū⟩+|d,d̄⟩+|s,s̄⟩)/√3
g=(u,d,s)，h=(s̄,−d̄,ū)
|1⟩=(|g₀,h₂⟩−|g₁,h₁⟩+|g₂,h₀⟩)/√3
```

Indices start at 0; signs follow phases. External CG tables need aligned factors, states, phases,  outer multiplicity  bases; entry signs need not match. Rephasing transforms coordinates/ generator  together.

### Understand matrices through testable examples

For `3⊗3`, choose `S=(|u,d⟩+|d,u⟩)/√2`, `A=(|u,d⟩−|d,u⟩)/√2`, with subblock `C=[[1,1],[1,−1]]/√2`. Initial `|u,d⟩` has probability 1/2 in each of 6 and 3̄. Complex coordinates `a=(1,i)/√2` become `b=((1+i)/2,(1−i)/2)`; multiplying by C recovers a.

For `3⊗3̄`, diagonal `|u,ū⟩` has singlet amplitude `1/√3`, probability `1/3`, total octet `2/3`. Natural zero-weight `D=(|u,ū⟩−|d,d̄⟩)/√2`, `H=(|u,ū⟩+|d,d̄⟩−2|s,s̄⟩)/√6` give D/H coordinates `1/√2`, `1/√6`. Program  highest weight   phase convention  gives `I=1` D and `I=0` −H, so actual coordinates `1/√2`, `−1/√6`; probabilities agree.

In `8⊗8`, the irreducible type `(1,1)` occurs twice. The implementation also uses the exchange operator to select `8s` and `8a`. Under SU(3) alone, the equivalent copies may still undergo a unitary basis change `R⊗I₈`: individual-copy probabilities can change while the projector onto the complete sixteen-dimensional isotypic subspace remains invariant. If definite exchange eigenvalues are also required, the two exchange channels cannot be mixed arbitrarily.

### Higher-dimensional representations and exact radicals

Coupling fundamental 3 gives channels by adding one Young box:

```text
(p,q)⊗(1,0)=(p+1,q)⊕(p−1,q+1)⊕(p,q−1)
删去含负标签的项
(3,0)⊗(1,0)=(4,0)⊕(2,1)，30=15+15
(2,2)⊗(1,0)=(3,2)⊕(1,3)⊕(2,1)，81=42+24+15
```

`(4,0)`, often called 15′, is inequivalent to `(2,1)` despite having the same dimension. The 24-dimensional channel is explicitly `(1,3)`, conjugate to `(3,1)`. Dimension abbreviations cannot replace Dynkin labels. Every channel in the two decompositions above has outer multiplicity 1, but internal weight multiplicities can remain; complete CG columns require GT patterns to distinguish them.

For `10⊗3`, let h be the highest-weight state of 10 and define normalized neighboring lowered state l by `E₂₁h=√3 l`; the fundamental obeys `E₂₁u=d`. In product-basis order `x=|h,d⟩`, `y=|l,u⟩`, one lowering step and the orthogonal highest-weight condition give:

```text
F=E₂₁⊗I+I⊗E₂₁
F|h,u⟩=x+√3 y
v=(x+√3 y)/2，属于 (4,0)
w=(√3 x−y)/2，为 (2,1) 最高权态
C子块=[[1/2,√3/2],[√3/2,−1/2]]
```

This lies in full `30×30`. Zero-based x/y are rows 1/3, v/w columns 1/15, with GT patterns `(4,0,3)`, `(3,1,3)`. Initial x gives `1/2`, `sqrt(3)/2` amplitudes in `(4,0)`, `(2,1)`, probabilities `1/4`, `3/4`. Coefficients follow integer GT patterns/ generator , not decimals guessed as radicals.

Exact mode retains rational numbers, radicals and exact complex amplitudes in construction and basis changes. Input uses a restricted grammar: integers, rationals, arithmetic and `sqrt(nonnegative integer)`; complex values separate real and imaginary parts as `{re:real, im:imaginary}`, for example `{re:"sqrt(2)/2", im:"0"}`. Strings use `1/1000` for one thousandth, not decimals or scientific notation; JSON numbers become rationals using their decimal values, so `0.3333333333` is still not `1/3`. `sqrt` arguments are nonnegative integers; integer constants and radicands are limited to 4,096 binary digits, each expression to 65,536 characters and 16,384 syntax nodes, and total vector-expression length to 1 MiB. The interface shows exact expressions and numerical approximations; heatmaps use approximations, inverse changes use full exact output, and JSON exports retain expressions and conventions.

Exactness and basis choice are separate issues. Phases, GT ordering, and outer-multiplicity conventions must still align. Real-radical CG matrices also act on complex states: in `3⊗3`, `(x+i y)/√2` has exact `(S,A)` coordinates `((1+i)/2,(1−i)/2)`, whose inverse transformation restores every complex amplitude. Probabilities `1/2、1/2` alone cannot recover phase.

### Algorithm checks/coverage limits

The CG core constructs product representations, highest-weight spaces and irreducible embeddings from GT generators. Runtime checks cover unitarity, dimensions, weight matching, exchange symmetry and full generator intertwining; independent tests also check quadratic Casimirs and Weyl characters:

```text
Gₐ=Tₐ⁽¹⁾⊗I+I⊗Tₐ⁽²⁾
GₐC=C Dₐ，Dₐ=⊕R,α Tₐ⁽R⁾
```

This avoids mistaking an orthogonal matrix or separated Casimir eigenvalues for a complete CG calculation. Numerical mode reports floating residuals; exact mode solves highest-weight and lowering equations from symbolic GT data, retaining radicals and checking algebraic identities, with numerical previews separately. Full checks cover generator relations; a 2D subblock or quadratic Casimir alone cannot validate the entire matrix.

CG factors obey `p,q≥0`/`p+q≤4`. Numerical dimension `N≤256`; exact `N≤81`, otherwise explicit rejection. Preserve 36 ordered `1、3、3̄、6、6̄、8` products; extend valid combinations to 10, 10̄,15, 15′,24,27, etc. Individually valid factors may exceed product-N bounds. Outputs can exceed input labels, e.g. `27⊗3`→`(3,2)`. Decomposition's 729 limit is separate from full CG.  Clebsch–Gordan coefficients  supplies symmetry-related  change of basis  amplitudes, not physical Hamiltonians,  reduced matrix element , or dynamics.

Complex input vectors must have finite components and squared norms between `10⁻²⁴` and `10¹²`, with `10⁻¹²` relative floating-point tolerance at the boundaries. Calculations preserve the input amplitude scale; probabilities divide squared amplitudes by total squared norm. Complete output vectors can directly undergo the inverse basis change, retaining complex phases and nonzero small amplitudes.

## SU(3) Racah (6j) and triple recoupling

Triple  tensor product  brackets `((A⊗B)⊗C)`/`A⊗(B⊗C)` preserve A, B, C. Resolve E first on left, F on right. Rebracketing is path-basis  change of basis , not particle exchange/time evolution. For fixed final  irreducible representation  D, use complete copy paths:

```text
e=(E,α: A⊗B→E, β: E⊗C→D)
f=(F,γ: B⊗C→F, δ: A⊗F→D)
m_D=Σ_E N_AB^E N_EC^D=Σ_F N_BC^F N_AF^D
D 同型子空间 ≃ ℂ^(m_D)⊗V_D
```

α, β, γ and δ are outer-multiplicity indices at individual binary vertices, with every combination retained. They differ from the internal GT-state label μ of D and internal weight multiplicity. At fixed μ, each path basis contains m_D orthonormal states. Write their isometric embeddings into the common product basis as V_L and V_R; this project defines:

```text
F_fe=⟨f,D,μ|e,D,μ⟩=(V_R†V_L)_fe
F 的行是右路径，列是左路径
V_L=V_R F，F†F=FF†=I_(m_D)
左→右：b=Fa；右→左：a=F†b
完整 D 同型子空间的换基为 F⊗I_(dim D)
```

Both embeddings intertwine the same SU(3) generators. Schur's lemma makes their overlap a scalar multiple of identity on V_D, so F is independent of internal GT state μ. Paths are constructed in the highest-weight multiplicity space rather than recomputing F for every internal state. GT phases and binary-copy conventions follow the CG core. Changing path bases by U_L,U_R gives `F′=U_R† F U_L`; states and operators must transform consistently.

### Exact radicals for three 3s

`3⊗3⊗3=10⊕2·8⊕1`, so the final D=8 has path multiplicity 2. On both sides, intermediate representations are ordered 6, 3̄. The orthogonal product states `x=|u,u,d⟩`, `y=|u,d,u⟩` and `z=|d,u,u⟩` all have total integer weight `(H₁,H₂)=(1,1)`. Total E₁₂ maps each to `|u,u,u⟩`, so an octet highest-weight vector requires its three coefficients to sum to zero. With the experiment’s GT phases:

```text
L₆=(2x−y−z)/√6，L₃̄=(y−z)/√2
R₆=(x+y−2z)/√6，R₃̄=(x−y)/√2
F=[[1/2,√3/2],[√3/2,−1/2]]
```

For example, `⟨R₆|L₆⟩=(2−1+2)/6=1/2`, `⟨R₆|L₃̄⟩=(1+2)/√12=√3/2`. These come from exact product-coordinate inner products, not radical guesses from floats. A pure left L₆ path has right 6,3̄ amplitudes `1/2、√3/2` and probabilities `1/4、3/4`. Here F happens to be real symmetric; generally its inverse must remain F†.

For exact complex `a=(1,i)/√2`, right coordinates:

```text
b=((1+i√3)/(2√2),(√3−i)/(2√2))ᵀ
 = (√2/4+i√6/4,√6/4−i√2/4)ᵀ
|b₆|²=|b₃̄|²=1/2，F†b=a
```

The two probabilities equal those of the input, but the complex coordinates differ. The interface accepts complete exact complex vectors in path space through separate restricted real/imaginary expressions. Inputs and outputs retain amplitude scale, and probabilities are normalized by squared norm. Applying the inverse change to complete output recovers phases. Expression ranges, lengths and amplitude-norm limits match exact CG inputs; truncated decimals are previews only.

### This project's 6j definition and weighted orthogonality

To distinguish literature Racah/U/6j names and phases, give unitary Racah F plus S normalized below. Scaling follows Lanina/Sleptsov §2.1 Eq.(2.5) at ordinary-group `q→1`, retaining project GT phases/all  outer multiplicity  labels; no quantum-group implementation:

```text
S_fe=F_fe/√[dim(E_e) dim(F_f)]
D_E=diag(dim E_e)，D_F=diag(dim F_f)
F=D_F^(1/2) S D_E^(1/2)
S†D_F S=D_E⁻¹，S D_E S†=D_F⁻¹
```

S generally is not ordinarily unitary and cannot directly transform state coordinates. For the octet block of three 3 factors, `D_E=D_F=diag(6,3)` gives `S=[[1/12,√6/12],[√6/12,−1/6]]`. For example, the first column has weighted norm `6(1/12)²+3(√6/12)²=1/6`, not 1. Familiar SU(2) 6j symbols also use specific phases and multiplicity-free triangle conditions; replacing j labels by (p,q) does not make those formulas applicable, nor are unconverted external tables promised to agree entrywise in sign.

### Multiplicities and operator applications

`3⊗3̄⊗3→3` has intermediate 8/1 on both sides, binary  multiplicity  1, hence m_D=2; final-3  isotypic subspace  dimension 6. In this order, `F=[[-1/3,2√2/3],[2√2/3,1/3]]`. `6⊗3⊗3→(2,1)` uses 10/8 left,6/3̄ right, also m_D=2; full D  isotypic subspace  dimension 2×15=30, total triple 54.

`8⊗8⊗8→8` has path multiplicity 8. Intermediate 27, 10, 10̄ and 1 each contribute one path; each of the two intermediate-8 copies has two ways to couple to the final 8, contributing 2×2=4 paths. For intermediate 8, retain 8s/8a indices independently at both binary vertices; writing only “the 8 channel” misses three paths. Here F is 8×8, while the full product space has dimension 512.

If an SU(3)-invariant model operator acts only on B,C, such as `O=κΣₐTₐ^(B)Tₐ^(C)`, it is diagonal in the right path through F's Casimir: `ε_F=κ[C₂(F)−C₂(B)−C₂(C)]/2`. In the left basis use `O_L=F†O_R F`, so `a†O_La=b†O_Rb`. For three 3s coupled to 8, `O_R/κ=diag(1/3,−2/3)` and `O_L/κ=[[-5/12,√3/4],[√3/4,1/12]]`. This is a paper-based model application. The experiment supplies F and path amplitudes; κ, physical Hamiltonians, and dynamics require separate specification.

### Racah scope

The triple Racah experiment allows each factor from `1, 3, 3̄, 6, 6̄, 8`, namely `p+q≤2`, with total product dimension `N≤512`. Final D may be any irrep type in the actual triple decomposition; output labels are not truncated by the individual-input limit. Exact construction uses rationals and radicals with numerical previews. Once D is selected, only its path-multiplicity space is transformed, not arbitrary N-dimensional product states. Binary CG limits `p+q≤4`, numerical `N≤256` and exact `N≤81` belong to a separate interface.

Four new derivation exercises check `6⊗3⊗3→15` path counts, highest-weight overlaps for three 3s, dimension-weighted 6j orthogonality, and exact complex-path round trips. Each links to its Racah preset; existing lessons and exercises retain IDs and questions.

## SU(3) 9j/fourfold pairing  recoupling

Four labeled factors A, B, C and D can use the left tree `((AB)E (CD)F)T` or the right tree `((AC)G (BD)H)T`, with final irrep type T. Each tree has three binary vertices, and every vertex’s outer multiplicity must be retained:

```text
ℓ=(E,α:AB→E；F,β:CD→F；γ:EF→T)
r=(G,δ:AC→G；H,ε:BD→H；ζ:GH→T)
m_T=Σ_(E,F) N_AB^E N_CD^F N_EF^T
   =Σ_(G,H) N_AC^G N_BD^H N_GH^T
```

The right tree naturally expands in ACBD order, the left in ABCD. Before taking inner products, explicitly restore order using `P|a,c,b,d⟩=|a,b,c,d⟩`, with `V_R=P V_R^(ACBD)`. P permutes labeled tensor-factor coordinates and does not automatically add a fermion sign. Identical-particle statistics must be imposed jointly on orbitals, spins, and other internal degrees; one cannot attach a uniform minus sign solely when reordering color bases.

For fixed internal GT μ of T, columns V_L/V_R are orthonormal path embeddings. Define unitary  recoupling  R:

```text
R_(rℓ)=⟨r,T,μ|ℓ,T,μ⟩=V_R†V_L
V_L=V_R R，R†R=RR†=I_(m_T)
左→右：b=Ra；右→左：a=R†b
T 同型子空间 ≃ ℂ^(m_T)⊗V_T
整块换基为 R⊗I_(dim T)
```

Both complete embeddings intertwine the same SU(3) generators, so Schur’s lemma makes R independent of internal state μ. The experiment constructs exact paths and overlaps in the selected T highest-weight multiplicity space and checks consistency using another lowered internal state; it is not an interface for arbitrary N-dimensional product-state inputs in the four-factor space. GT phases, copy ordering, vertex exchange labels and left/right direction are displayed and exported with results.

### Independent analytic example with four 3s

Full decomposition `3⁴=(4,0)⊕3·(2,1)⊕2·(0,2)⊕3·(1,0)`, dimension `81=15+45+12+9`. Final T=(2,1) has three paths per side, intermediates ordered `(6,6)、(6,3̄)、(3̄,6)`, so R is 3×3; full T  isotypic subspace  dimension 45. Equal-dimensional (4,0)=15′ is outside this block.

Take orthogonal product states `x₁=duuu, x₂=uduu, x₃=uudu, x₄=uuud`. Their total weight is (2,1); E₁₂ maps all of them to uuuu, and E₂₃ annihilates them. Thus the four highest-weight coefficients must sum to zero. Combining pair-exchange symmetries with binary CG phases gives:

```text
L₁=(−x₁−x₂+x₃+x₄)/2
L₂=(x₄−x₃)/√2，L₃=(x₂−x₁)/√2
R₁=(−x₁+x₂−x₃+x₄)/2
R₂=(x₄−x₂)/√2，R₃=(x₃−x₁)/√2

R=[[0,1/√2,1/√2],
   [1/√2,1/2,−1/2],
   [1/√2,−1/2,1/2]]
```

Right vectors are restored to ABCD order. The first overlap is `(1−1−1+1)/4=0`, an exact amplitude cancellation. The pure left (6,6) path gives right amplitudes `(0,1/√2,1/√2)` and probabilities `(0,1/2,1/2)`. R happens to be real symmetric here; generally use R† for the inverse. These analytic vectors and products check the program independently, without guessing radicals from decimals.

### This project's dimension-reduced 9j normalization

The 9-U(3) coefficient in Eq. (30) of Dang et al., preprint V.2, connects unit-normalized paired states and plays the role of the unitary R here; that paper constructs four-factor recoupling from triple U and Z coefficients. This project independently composes binary CG embeddings and takes exact inner products. To also provide a dimension-reduced 9j table, it explicitly defines S, retaining its own GT phases and all six outer-multiplicity indices:

```text
S_(rℓ)=R_(rℓ)/√[dim E_ℓ dim F_ℓ dim G_r dim H_r]
W_L=diag(dim E_ℓ dim F_ℓ)，W_R=diag(dim G_r dim H_r)
R=W_R^(1/2) S W_L^(1/2)
S†W_R S=W_L⁻¹，S W_L S†=W_R⁻¹
```

S is not the original table of paper equation (30) without normalization conversion, nor guaranteed to share entrywise signs with other SU(3) 9j conventions. Align factors, conjugation, outer multiplicities, phases, and dimensions first. S is generally not ordinarily unitary; state changes and probabilities always use R.

For the four-3 T=(2,1) example, `W_L=W_R=diag(36,18,18)` and exact S `(1/36)[[0,1,1],[1,1,−1],[1,−1,1]]`. Column 1 has weighted norm `18/36²+18/36²=1/36`; columns 2/3 have weighted inner product `(36−18−18)/36²=0`. Switching R/S display does not change the  change of basis  used for current path states.

### Complex phases, color pairings and model operators

The same 3×3 block tests exact complex amplitudes. For `a=(1,i,0)ᵀ/√2`, `b=(i/2,1/2+i√2/4,1/2−i√2/4)ᵀ`, with probabilities `(1/4,3/8,3/8)`. R†b restores a exactly. Inversion needs full complex output; positive square roots of probabilities cannot replace real/imaginary parts and relative phases. Restricted expression syntax, norm ranges, and amplitude-scale preservation follow exact CG/Racah interfaces; truncated decimals are previews only.

For `3⊗3̄⊗3⊗3̄`, the left tree forms two quark–antiquark color pairs; the right forms pairs of two 3s and two 3̄. For singlet T=1, left paths `(8,8)→1、(1,1)→1`, right `(6,6̄)→1、(3̄,3)→1`, m_1=2. For final T=8, left (8,8) root  outer multiplicity  is 2; adding (8,1),(1,8) gives m_8=4; four right intermediate combinations contribute once each. Only color bases are recoupled, no orbitals, spin, flavor, binding energies, or hadronic cross sections. An octet subsystem does not replace isolated-hadron color-singlet requirements.

Outer multiplicity may arise at different levels. For `8⊗8⊗1⊗1→8`, the first left-tree vertex AB→8 has copies 8s and 8a; the right tree has unique leaf branches but two copies at its root 8⊗8→8. Both have m_8=2, but copies labeled α and ζ must be retained separately. If the third factor C=1, the left tree becomes `(AB)D` and the right `A(BD)`, allowing checks against triple Racah with corresponding paths and GT conventions. Then R=F and dimension-reduced tables obey `S_9j=S_6j/√(dim A dim D)`; for example, `3⊗3⊗1⊗3→8` gives `S_9j=S_6j/3`.

For four input 3s, `O=κΣₐTₐ^(A)Tₐ^(C)` is right-tree diagonal through G, with `O_R/κ=diag(1/3,1/3,−2/3)`. In the left tree, `O_L=R†O_RR`, giving `O_L/κ=[[-1/6,√2/4,−√2/4],[√2/4,1/12,1/4],[−√2/4,1/4,1/12]]`. A pure left (6,6) state has expectation −κ/6, matching right-probability weighting. κ, a full Hamiltonian, and dynamics must be specified separately. This paper-based model application uses experimental matrices and path amplitudes for checks.

### Fourfold scope and guided exercises

The four-factor experiment allows all 15 external types with `p+q≤4`, including `10, 15, 15′, 24, 27` and conjugates, with total product dimension `N≤4096`. All combinations of the original six types `1, 3, 3̄, 6, 6̄, 8` remain included, including `8⁴=4096`; arbitrary high-dimensional factors cannot all be used simultaneously, since `10⁴=10000` and `27⁴=531441` exceed the limit. Any final irrep type in the actual decomposition is selectable; outputs are not truncated by the individual-input `p+q≤4` limit. The default final type prefers an existing 8, then an existing (2,1), otherwise the first decomposition entry. Nonexistent final labels prompt a change. Exact high-multiplicity calculations may take time initially; the same Python kernel reuses constructed coupling data.

Four guided exercises cover both-side path counts for `6⊗3⊗3̄⊗1→6`, exact highest-weight overlaps of four 3s, dimension-reduced 9j weighted orthogonality, and three-path exact complex round trips. They link to mixed-factor, four-fundamental, and complex-superposition presets. The color lesson links to `3⊗3̄⊗3⊗3̄→8`, with singlet comparison selectable from actual final representations.

## Exact high-dimensional lessons for four octets

### Complete decomposition, outer multiplicity and exchange checks

`8=(1,1)` is adjoint. `8⁴` contains 13 distinct final irreducible types. Multiplicities below count copies, each containing every internal state of its type:

| Final label | Type dimension |  outer multiplicity  |  isotypic subspace  dimension |
| :-- | --: | --: | --: |
| (4,4) | 125 | 1 | 125 |
| (5,2), (2,5) | 81 each | 3 each | 243 each |
| (6,0), (0,6) | 28 each | 2 each | 56 each |
| (3,3) | 64 | 12 | 768 |
| (4,1),(1,4) | 35 each | 15 each | 525 each |
| (2,2) | 27 | 33 | 891 |
| (3,0), (0,3) | 10 each | 20 each | 200 each |
| (1,1) | 8 | 32 | 256 |
| (0,0) | 1 | 8 | 8 |

Including conjugate types, the last column sums to 4096. For one fixed internal state of final T=1,8,27, exact R is respectively 8×8,32×32,33×33; full isotypic transformations are `R⊗I_(dim T)`. Each left path retains α,β,γ vertex copies and each right path δ,ε,ζ. The final octet's `(E,F)=(8,8)` branch has `2×2×2=8` paths; final 27's `(E,F)=(27,27)` has three root copies. Multiplicities and equal-dimension labels cannot be merged.

Starting from `8⊗8=27⊕10⊕10̄⊕2·8⊕1`, write copy counts n_E. Group `Σ_F n_E n_F N_EF^T` by first intermediate `E=(27,10,10̄,8,1)`; independent counting gives:

```text
m_1  =1+1+1+4+1=8
m_8  =6+4+4+16+2=32
m_27 =10+5+5+12+1=33
```

When all four external factors are identical and both trees use the same binary GT and path-copy conventions, crossed pairing in common ABCD coordinates is the middle-factor swap P₂₃. From `P₂₃†=P₂₃` and `P₂₃²=I`, obtain `Rᵀ=R` and `R²=I`. Decomposing the BC pair as `Sym²8=27⊕8s⊕1` and `Λ²8=10⊕10̄⊕8a`, then coupling to A and D, determines the positive/negative eigenvalue multiplicities of R without calculating individual coefficients:

| Final T | Number of +1 eigenvalues | Number of −1 eigenvalues | tr R |
| :-- | --: | --: | --: |
| 1 | 4 | 4 | 0 |
| 8 | 16 | 16 | 0 |
| 27 | 17 | 16 | 1 |

These extra relations require identical factors/aligned path bases and do not replace general unitarity checks. Keep actual entry signs together with GT phases, copy bases, and factor order.

### Exact 1/8 and aggregate probabilities from invariants

In a real orthonormal Cartesian adjoint basis, indices a,b,c,d run from 1 to 8. The two-factor singlet is `δab/√8`. Common ABCD coordinates for the left double singlet and crossed double singlet are:

```text
χ_L=δabδcd/8，χ_R=δacδbd/8
||χ_L||²=||χ_R||²=1
⟨χ_R|χ_L⟩=Σ_abcd δabδcdδacδbd/64=8/64=1/8
P_(G=H=1)=1/64
```

The four δ factors impose a=b=c=d, leaving 8 terms. This same-pairing diagonal overlap is invariant under common rephasing and directly checks exact `(E,F)=(1,1)`. Cartesian/GT coordinates differ; transform original vectors to one basis before entrywise comparisons. Inner products/projection probabilities remain invariant.

Tracing out B and D gives `ρ_AC=I₆₄/64`. Thus the total probability for irrep type G in the right tree is its isotypic-projector rank divided by 64:

```text
P(G)=n_G dim(G)/64
(P_27,P_10,P_10̄,P_8,P_1)=(27,10,10,16,1)/64
```

`P_8=1/4` aggregates every G=8 path, not each copy-labeled path. The singlet block has eight paths: `(27,27)`, `(10,10̄)`, `(10̄,10)`, four `(8,8)`, and `(1,1)`, with `W_L=W_R=diag(729,100,100,64,64,64,64,1)`. Dimension-reduced tables still satisfy `S†W_R S=W_L⁻¹`; the double-singlet column's weighted norm is 1 and the (27,27) column's 1/729.

### Complex states, Casimir two-body actions, and exercises

For any real exact R, input `a=(e₁+i e₂)/√2` gives `b_r=(R_r1+iR_r2)/√2` and normalized probability `(R_r1²+R_r2²)/2`. Orthogonality of the two columns makes the probabilities sum to 1 and ensures `R†b=a`. Matrix windows, heatmaps and path selectors change only the viewed rows/columns; Python still computes and exports the complete exact matrix and complex vector. Full exact real and imaginary parts are required for inversion.

For the adjoint two-body paper model `O=κΣₐTₐ^(A)Tₐ^(C)`, this lesson's `C₂(p,q)=(p²+q²+pq+3p+3q)/3` gives:

```text
G=(27,10,10̄,8,1)，C₂(G)=(8,6,6,3,0)
ε_G=κ[C₂(G)−6]/2=κ(1,0,0,−3/2,−3)
O_L=R†O_RR
```

The left double-singlet right probabilities give `⟨O⟩/κ=(27−24−3)/64=0`, but `⟨O²⟩/κ²=(27+36+9)/64=9/8`, so variance `9κ²/8`. Zero mean is not a zero eigenstate. Adjoint color illustrates four-gluon channels, but no polarization, orbitals, complete Bose statistics, or QCD dynamics are specified;  recoupling  predicts neither cross sections nor binding energies.

Four new stepwise derivations cover path counts and exchange traces for four octets, δ-invariant contraction and aggregate probabilities, eight-path complex states and weighted 9j, and the mean/variance of two-body Casimir energies. Three lessons open computational presets for final 27, singlet and octet channels of four octets; the complex-state exercise also links to an exact eight-path complex superposition.

## High-dimensional external inputs: 10, 15, 27, and others

### First identify 15 and 15′ by Dynkin labels

Higher-dimensional representations can now be direct leaf inputs of four-factor trees, with both names and `(p,q)` shown. The dimension formula `d(p,q)=(p+1)(q+1)(p+q+2)/2` does not give a unique name; for example, all four types below have dimension 15:

| Type | Dynkin labels | Conjugate | C₂ |
| :-- | :-- | :-- | --: |
| 15 | (2,1) | 15̄=(1,2) | 16/3 |
| 15̄ | (1,2) | 15=(2,1) | 16/3 |
| 15′ | (4,0) | 15̄′=(0,4) | 28/3 |
| 15̄′ | (0,4) | 15′=(4,0) | 28/3 |

Conjugation exchanges `(p,q)`; equal dimensions do not imply equal types, nor equal Casimirs erase conjugate labels. All `p+q≤4` give 15 allowed external types, total product constrained by `N≤4096`. `27=(2,2)` is self- conjugacy class ; `10=(3,0)` differs from `10̄=(0,3)`. Actual output may exceed input labels, e.g. `42=(3,2)` below.

### Three presets with four nontrivial factors

| Four inputs | Final T | Total dimension N | Outer multiplicity m_T | Isotypic dimension | Exact R |
| :-- | :-- | --: | --: | --: | :-- |
| 10⊗3⊗3⊗3̄ | 15=(2,1) | 270 | 4 | 60 | 4×4 |
| 15⊗3⊗3̄⊗3 | 24=(3,1) | 405 | 5 | 120 | 5×5 |
| 27⊗3⊗3̄⊗3 | 42=(3,2) | 729 | 5 | 210 | 5×5 |

The first example has `10⊗3=15′⊕15` and `3⊗3̄=8⊕1`. Both sides reaching T=15 have one `(15,1)`, two root copies of `(15,8)`, and one `(15′,8)`, total 4. Identical intermediate sets do not make the matrix identity; calculate overlaps of both embeddings.

The two trees in the second example decompose as:

```text
左：15⊗3=24⊕15̄⊕6，3̄⊗3=8⊕1
路径：(24,1)，(24,8,γ=1)，(24,8,γ=2)，(15̄,8)，(6,8)

右：15⊗3̄=27⊕10⊕8，3⊗3=6⊕3̄
路径：(27,6)，(27,3̄)，(10,6)，(10,3̄)，(8,6)
```

Each right root vertex is unique, while the left has two `(24,8)` root copies. Both are complete orthonormal bases of the same five-dimensional multiplicity space. The third example has:

```text
左：27⊗3=42_(3,2)⊕24̄_(1,3)⊕15_(2,1)，3̄⊗3=8⊕1
路径：(42,1)，(42,8,γ=1)，(42,8,γ=2)，(24̄,8)，(15,8)

右：27⊗3̄=42̄_(2,3)⊕24_(3,1)⊕15̄_(1,2)，3⊗3=6⊕3̄
路径：(42̄,6)，(42̄,3̄)，(24,6)，(24,3̄)，(15̄,6)
```

The type list specifies allowed paths, not interface row/column order; locate paths by complete exported labels. Permute right embeddings ACBD→ABCD before `R=V_R†V_L`, and retain all three independent leaf/root copy indices.

### An independent decuplet S₃ check without GT signs

Another two-path preset is `10⊗3⊗3⊗3→8`, also of total dimension 270. The three `BCD` fundamentals satisfy `3³=10⊕2·8⊕1`. Neither `10⊗10=28⊕35⊕27⊕10̄` nor `10⊗1=10` contains 8; `10⊗8=35⊕27⊕10⊕8` contains one, so the final path space is precisely BCD's standard S₃ representation.

Choose CD-symmetric 6/antisymmetric 3̄ bases: `D=P_CD=diag(1,−1)`, `R=P_BC=[[a,b],[b,−a]]`, `a²+b²=1`. `DR` is a three-cycle with standard trace `−1`, hence `2a=−1`, `a²=1/4`, `b²=3/4`:

```text
|R|²=[[1/4,3/4],[3/4,1/4]]
```

This provides an independent exact probability check without fitting radicals to program output. Path phases can change off-diagonal signs but preserve squared moduli between paths already distinguished by CD-exchange eigenvalues. A general basis change mixing symmetric and antisymmetric paths must also transform D. This is a two-path `D=3` case; its matrix cannot be transferred to the four-path `D=3̄` case.

### Weighted 9j and a complex-state two-body model with input 27

For `27⊗3⊗3̄⊗3→42`, choose left `(E,F)=(42,1)`/right `(G,H)=(24,3̄)`. Four dimensions give `√(42×1×24×3)=12√21`, hence entry `R=12√21·S`. Complete path-weight multisets:

```text
W_L：{42,336,336,192,120}
W_R：{252,126,144,72,90}
S†W_R S=W_L⁻¹
左 (42,1) 列：Σ_r d(G_r)d(H_r)|S_(rℓ)|²=1/42
```

Use weights together with the actual path ordering; a multiset alone cannot be inserted into an unaligned matrix. A zero or radical in an S entry does not change its four dimension factors. R remains the matrix for state-coordinate changes.

The exact complex-state preset takes `a=(e₁+i e₂)/√2` in the current left-path table, giving `b_r=(R_r1+iR_r2)/√2` and `P_r=(R_r1²+R_r2²)/2`. Column orthogonality gives `ΣP_r=1` and `R†b=a`. Preserve full exact real/imaginary amplitudes; probabilities and displayed decimals do not ensure reversibility.

For illustrative `O=κΣₐTₐ^(A)Tₐ^(C)`, external 27/3̄ Casimirs sum `28/3`; right intermediate `G=42̄、24、15̄` has Casimir `(34/3,25/3,16/3)`, energy `κ(1,−1/2,−2)`. Assign right energies by G; left operator `O_L=R†O_RR`. Consistent  change of basis  preserves `a†O_La=ΣP_rε_(G_r)`/second moments. This representation-space model does not specify complete material/QCD dynamics.

Three new lessons link to the decuplet, 15-input and 27-input presets above. Four new derivations cover exact S₃ probabilities, left/right five-path counts, dimension reduction by `12√21` and full-column weighted norms, and a 27-input complex state with mixed-type two-body Casimir energies. Two additional interactive presets demonstrate the small decuplet S₃ example and a 27-input complex superposition.

## Interactive experiment coverage

Nine interactive experiments: SU(2) rotations, SU(3) single- generator  evolution, commutators, Rabi trajectories, SU(2) CG coupling/exchange, SU(3)  irreducible representation / tensor product , SU(3) CG coefficients/ change of basis , SU(3) Racah（6j）/triple  recoupling , and SU(3) 9j/fourfold  recoupling . Rabi Ω∈[0,10],Δ∈[−10,10], t∈[0,20]; SU(2) j values integer/half-integer 0…3,κ∈[−10,10]. SU(3) decomposition/binary CG factor bounds p+q≤4; CG additionally numerical N≤256/exact N≤81. Triple Racah factor p+q≤2, total N≤512; fourfold 9j factor p+q≤4, total N≤4096. Output labels may exceed individual inputs.

The original eight derivations cover π pulses, CG for 1⊗1/2, singlet construction, exchange gaps, dimension/Casimir of (2,2), trace decomposition of 3⊗3̄, coupling paths of three 3 factors, and multiplicities/selection rules in 8⊗8. Four subsequent exercises derive a 3⊗3 CG submatrix, natural-singlet/GT coordinate conversion, complex-amplitude round trips and copy-basis rotations of two octets. Another four cover radical lowering in 10⊗3, high-dimensional decomposition of 27⊗3, exact unitarity/highest-weight checks and exact complex-amplitude round trips. Racah and 9j each add four derivations as described above. Linked presets let learners compare paper calculations with Python experiments entry by entry.

## Relation to the crystal classroom

 space group  has infinitely many discrete translations but is not a continuous translation group. Preimages of finite proper  point group  in SU(2) explain  double group ; inversion/mirrors need specified representations. Quantum  time reversal  in magnetic groups is antiunitary; ordinary SU(2) matrices cannot replace  complex conjugation .

Three-dimensional atomic coordinates, classical moments, two-component spinors and three-level complex amplitudes are different objects. SU(3) is not the real-space rotation group SO(3), nor an automatic symmetry of arbitrary magnetic materials. These ideal two-/three-level experiments teach matrix transformations without predicting a particular material’s wavefunctions, bands, magnetic ground state or quark dynamics.

## Sources and further reading

- Mathematical definitions of  Lie group , representations, covers, roots:[Pavel Etingof · MIT notes](https://ocw.mit.edu/courses/18-755-lie-groups-and-lie-algebras-ii-spring-2024/mit18_755_s24_lec_full.pdf).
- Conjugate transpose, unitary matrices and inner products: [Vincent Bouchard · Unitary representations](https://sites.ualberta.ca/~vbouchar/MAPH464/section-unitary.html).
- SU(2) generators and their SO(3) map: [Vincent Bouchard · SU(2)](https://sites.ualberta.ca/~vbouchar/MAPH464/section-su2.html).
- SU(2)  irreducible representation  and `2j+1`:[MIT 8.323 · Recitation 7](https://live.ocw.mit.edu/courses/8-323-relativistic-quantum-field-theory-i-spring-2023/mit8_323_s23_rec07.pdf).
- Gell-Mann matrices, trace normalization and Cartan generators: [David Tong · The Strong Force](https://www.damtp.cam.ac.uk/user/tong/sm/standardmodel3.pdf).
- Spin rotations and interference: [Lawrence Berkeley National Laboratory · Symmetry in Rotation](https://www2.lbl.gov/abc/wallchart/chapters/05/1.html).
- Rotating frames, detuning, coherent control:[WMI · Control of quantum two-level systems](https://www.wmi.badw.de/fileadmin/WMI/Lecturenotes/Applied_Superconductivity/AS2020_Chapter06_3_Slides.pdf); periodic-driving context:[UC Berkeley · Rabi Tutorial](https://physics.berkeley.edu/research-faculty/budker-group/physics-tutorials/rabi-tutorial).
- Angular-momentum addition and spin–orbit coupling: [MIT 8.05 · Addition of Angular Momentum](https://ocw.mit.edu/courses/8-05-quantum-physics-ii-fall-2013/resources/lecture-25-addition-of-angular-momentum-cont/).
- CG phases, SU(3) highest weights, Casimir, and products: [Hugh Osborn · Group Theory Lecture Notes](https://www.damtp.cam.ac.uk/user/ho/GNotes.pdf), sections 3.7,7.3–7.6. Convert Casimir normalization to this lesson's `Tₐ=λₐ/2` before comparing; values cannot be copied across conventions.
- GT bases, CG matrices,  outer multiplicity  algorithms:[Alex, Kalus, Huckleberry, von Delft, J. Math. Phys.52,023507 (2011)](https://arxiv.org/abs/1009.0437), doi:10.1063/1.3521562;[authors' CG calculator conventions](https://homepages.physik.uni-muenchen.de/~vondelft/Papers/ClebschGordan/). This bounded implementation is independent, uses no external computing service, and does not claim identical phases/copy orders.
- Exact rationals, radicals and floating-point numbers: [SymPy documentation · Exact Rational Numbers vs. Floats](https://docs.sympy.org/latest/explanation/best-practices.html#exact-rational-numbers-vs-floats). The paper’s numerical-algorithm background is distinguished from this project’s added exact-algebra implementation, avoiding claims that small numerical residuals are symbolic proofs.
- Triple coupling paths and U coefficients with outer-multiplicity indices: [Dang, Draayer, Pan, Becker, EPJ Plus 139,704 (2024)](https://doi.org/10.1140/epjp/s13360-024-05501-8), section 5.1; [author preprint V.1, equations (27)–(28)](https://arxiv.org/html/2405.06843v1#S5.SS1). This lesson's Racah experiment implements adjacent bracketings in fixed factor order, retaining its own GT phases and copy choices.
- Fourfold trees and 9-U(3) unitary  recoupling  with all  outer multiplicity :[Dang et al.preprint V.2 Eq.(30)](https://arxiv.org/html/2405.06843v1#S5.SS2), published §5.2. Citation concerns pairing  recoupling  definitions; lessons independently compute CG embeddings. Additional dimension-reduced S converts using four explicit intermediate  representation dimension  and must not be confused with the paper's unitary coefficients.
- Racah multiplicity-space maps and 6j dimension normalization: [Lanina and Sleptsov, Physics Letters B 845, 138138 (2023)](https://scoap3-prod-backend.s3.cern.ch/media/files/79803/10.1016/j.physletb.2023.138138.pdf), Section 2.1, Eqs. (2.4)–(2.5). Only ordinary dimensions in the classical-group q→1 limit are used; quantum groups, braid groups and knot invariants are not implemented.

Sources checked on 2026-10-24. Other notes may use `exp(+iθT)` or anti-Hermitian generators; align signs before comparing rotation directions and structure constants.
