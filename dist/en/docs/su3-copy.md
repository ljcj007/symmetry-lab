# SU(3) copy-basis changes: embedding two octets in the product space

## Starting from the existing classroom

First distinguish the two zero-weight states within a single octet in the GT basis workshop. Here the product is fixed to $8\otimes8=27\oplus10\oplus\overline{10}\oplus8_s\oplus8_a\oplus1$. Compare embeddings of the same internal GT state in the two octets, then connect copy-basis changes to actual CG columns, a fixed physical state and the exchange operator.

Inputs accept only `lab: "su3_copy"`, integer `angle` (0, 45 or 90) and string `phase` (`"1"`, `"i"`, `"-1"` or `"-i"`); defaults are 45 and `"1"`. These give twelve exact presets. Run manually after changing a preset; each reply contains all eight internal states, and selecting μ only browses the returned data. Arbitrary angles, arbitrary symbolic expressions and general $U(2)$ inputs are outside this scope.

## Read the full labels before pairing columns

Write a coupled basis state as $|(p,q),\alpha,\mu\rangle$. The labels $(p,q)$ specify the irrep type, $\alpha$ distinguishes its outer-multiplicity copies, and $\mu$ identifies an internal GT state. Pairing checks `localIndex`, the complete `pattern`, `weight`, `copy`, `blockIndex` and `swapParity` together; equal weights do not merge states.

Each octet has eight internal states; its $(0,0)$ weight contains two distinct GT states. In the standard order, μ=3 has $[2,0;1]$ and $I=1$, while μ=4 has $[1,1;1]$ and $I=0$. The two copies therefore contain four zero-weight columns in total. Their current canonical column indices are 50, 51, 58 and 59, obtained from the returned metadata. These are zero-based indices, rather than additional quantum numbers.

The dimension check is $64=27+10+10+8+8+1$. The internal octet dimension is 8, its outer multiplicity is 2, and the octet isotypic component has dimension 16. Two zero-weight internal states and two octet copies are different levels of labeling.

## Reshape a column into an 8×8 amplitude matrix

Use the existing CG core's column-embedding convention: rows of $C_{ij}$ are product states and columns are coupled states, with $a=Cb$ and $b=C^\dagger a$. The product order is `productIndex = leftIndex*8 + rightIndex`. Reshape the symmetric and antisymmetric columns for the same μ into $A_s$ and $A_a$; exchanging the two labeled factors transposes these matrices.

Check $A_s^T=A_s$, $A_a^T=-A_a$ and $C_s^\dagger C_a=0$. Transposition here does not conjugate: exchange is a linear operator. Every column must also have unit norm, and all cross inner products between the two eight-dimensional embeddings must vanish. Exact coefficients retain phases; add amplitudes before taking their magnitudes.

## Rotate copies consistently for all eight μ states

Form $C_8$ with all eight $s$ columns followed by all eight $a$ columns. Set $R_\theta=\begin{pmatrix}\cos\theta&-\sin\theta\\\sin\theta&\cos\theta\end{pmatrix}$, $R=R_\theta\operatorname{diag}(1,\zeta)$ and $U=R\otimes I_8$, with $\zeta\in\{1,i,-1,-i\}$. Multiply the phase matrix on the right of $R_\theta$; reversing this matrix-product order generally changes the result.

The new embedding is $C_8'=C_8U$. The same $R$ acts on all eight μ states, so the standard target generators $D_a=I_2\otimes T_a^{(8)}$ remain unchanged. Check intertwining for each of the eight generators. Label mixed new copies by $\alpha'$; their individual columns generally cannot retain the exchange-eigenstate labels $s$ and $a$.

## Separate a fixed physical state from new basis vectors

Fix the original physical state $|8_s,\mu\rangle$. In two-component copy coordinates at fixed μ, $b=(1,0)^T$ and $b^{\prime}=R^\dagger b$. Stack the sixteen-dimensional coordinates of all eight original states as $B=\begin{pmatrix}I_8\\0_{8\times8}\end{pmatrix}$; then $B^{\prime}=U^\dagger B$. Transform the exchange matrix consistently to $P^{\prime}=U^\dagger P U$, where $P=\operatorname{diag}(1,-1)\otimes I_8$. Thus $C_8^{\prime} B^{\prime}=C_8B$ preserves every original physical state in product space.

The first new basis vector is $\cos\theta|8_s,\mu\rangle+\sin\theta|8_a,\mu\rangle$; it usually differs from the fixed original state. Coordinates after a basis change and amplitudes of a new basis vector answer different questions. This basis change is neither time evolution nor a physical transition.

At θ=45° and ζ=1, the fixed state's new coordinates are $(1,-1)^T/\sqrt2$, and the exchange matrix for that μ is $\begin{pmatrix}0&-1\\-1&0\end{pmatrix}$. Both new-copy coordinate probabilities are $1/2$, while the original state's physical exchange-even and exchange-odd projection probabilities remain 1 and 0.

At θ=45° and ζ=i, the coordinates are $(1,i)^T/\sqrt2$ and the exchange matrix is $\begin{pmatrix}0&-i\\i&0\end{pmatrix}$. An adjoint requires complex conjugation, rather than transposition alone. Norms, physical product amplitudes, exchange expectations and the isotypic projector $\Pi_8=C_8C_8^\dagger$ remain invariant.

## A mismatch counterexample in a valid basis

Change the sign of just the symmetric embedding column at μ=3 to obtain $C_8Q$. The sixteen-dimensional diagonal unitary $Q$ has one entry equal to −1. Orthogonality and the isotypic projector survive, but the unchanged standard GT generators give a nonzero $G_{12}C_8Q-C_8QD_{12}$. In the current convention its largest entry magnitude is $2\sqrt{15}/5$.

Transform the target generators consistently to $D_a'=Q^\dagger D_aQ$ and all eight intertwining relations are restored. The sign-changed basis is valid; keeping the old standard generators and their phase convention causes the mismatch. This also explains why rotating only the displayed column pair cannot replace a consistent copy rotation across the entire octet.

## Predict, calculate, explain and test a counterexample

1. Predict the number of columns contributed by the two zero-weight patterns in both copies, then locate all four using their complete labels. Transpose one pair of amplitude matrices and explain why equal weights do not identify a basis state.

2. Fix $|8_s,\mu\rangle$ and select θ=45°, ζ=1. Calculate $b'$ and $P'$ by hand, then verify $b'^\dagger P'b'=1$. Explain the error in interpreting the second coordinate's $1/2$ as an exchange-odd probability.

3. Keep θ=45° and change to ζ=i. Obtain $R^\dagger$ before calculating the coordinates and exchange matrix. Identify changed complex phases and unchanged physical projections, then check the θ=0° and 90° limits.

4. Inspect the single-column sign counterexample. Check orthogonality, then compare intertwining residuals for old and consistently transformed generators. Explain the relation among basis vectors, state coordinates and operator matrices; a nonzero mismatch does not make the basis invalid.

## Adoption, export and conventions

Results retain the canonical `canonical.request`, complete `canonical.reply` and digest separately from derived teaching matrices, metadata pairings and checks. Export both layers. The new copy basis must neither overwrite canonical CG coefficients nor impersonate the original $8_s/8_a$ exchange-eigenstate convention. Exact expressions, LaTeX and numerical previews come from one SymPy object; numbers serve display and plotting only.

For source-digest verification, exports also retain `canonical.serialization` (`python-json-utf8-sorted-v1`) and the complete original JSON text in `canonical.serialized`. The `canonical.sha256` digest uses the UTF-8 bytes of that exact text. Verify the retained text directly rather than substituting browser-reformatted JSON. Writing `0.0` as `0` or reordering keys changes the text without changing the scientific numerical values; parsed content and original text bytes can be checked separately.

The workshop fixes $8\otimes8$ and reuses the existing exact CG core. It adds no general SU(N) solver and infers no spectrum, decay rate or transition intensity from CG coefficients. The factors are labeled; physical identical-particle statistics additionally require all spin, spatial and other degrees of freedom. Here $I$ and GT weights are representation labels first.

## Theoretical source

[Alex, Kalus, Huckleberry and von Delft, Journal of Mathematical Physics 52, 023507 (2011)](https://doi.org/10.1063/1.3521562) separates internal state labels from outer-copy α in Sec. II. Section VI and Fig. 2 show why coincident weights still need full GT patterns; Sec. X discusses unitary freedom among equivalent copies and convention choices. See the [authors' original PDF](https://homepages.physik.uni-muenchen.de/~vondelft/PapersVonDelft/Alex2011.pdf).

The finite presets, exchange-parity separation and fixed-state comparison are site teaching constructions. Highest-weight phases, column order and exchange conventions of the original CG core remain intact; entrywise agreement with external tables requires an explicit convention conversion.
