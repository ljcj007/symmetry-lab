# From GT patterns to a column of an SU(3) generator

## A learning path that can be checked row by row

After choosing Dynkin labels $(p,q)$, check a GT pattern, read its contents and weight, then read an operator action from a matrix column. All fifteen nonnegative integer pairs with $p+q\le4$ are supported, including $1$, $3$, $\bar3$, $6$, $8$, $10$, $15$, $24$, $27$ and their conjugates. Equal dimensions do not imply equal representations.

Input contains only `lab: "su3_basis"`, `p` and `q`. Run again after changing the representation. Each result already includes every basis state, all eight generators and every column of each generator; selecting a state or operator changes only the view. The page does not implement another GT or matrix-algebra solver.

## Top row, interlacing and contents

The top row is fixed to $(p+q,q,0)$, the middle row is $(a,b)$ and the bottom row is $c$. Allowed patterns satisfy $p+q\ge a\ge q\ge b\ge0$ and $a\ge c\ge b$. Each pattern specifies one orthonormal basis state, and there are $(p+1)(q+1)(p+q+2)/2$ patterns.

Differences of successive row sums give $n_1=c$, $n_2=a+b-c$ and $n_3=p+2q-a-b$, with $n_1+n_2+n_3=p+2q$. These contents provide integer bookkeeping for the GT representation; without a specified physical model they are not occupation numbers of physical particles.

## From integer weights to the Cartan plane

With $H_1=E_{11}-E_{22}$ and $H_2=E_{22}-E_{33}$, the eigenvalues are $h_1=n_1-n_2$ and $h_2=n_2-n_3$. Returned weights are $(h_1,h_2)$; plot coordinates are $T_3=h_1/2$ and $T_8=(h_1+2h_2)/(2\sqrt3)$. The ledger also gives $I=(a-b)/2$, $I_3=h_1/2$ and $Y=(h_1+2h_2)/3$.

Distinct basis states may have the same weight. Each coincident point retains every member index; coincident states cannot be merged into one vector. The Cartan plane is not real space, momentum space or an energy-level diagram. Energy degeneracy requires a Hamiltonian and its symmetry conditions.

## Basis order, phases and matrix columns

The basis shares the existing CG calculation's orthonormal GT convention and descending order of $(H_1+H_2,H_1,a,b,c)$. The fundamental basis is $(u,d,s)$ and the conjugate basis is $(\bar s,-\bar d,\bar u)$. Nonzero coefficients of adjacent raising operators $E_{12}$ and $E_{23}$ are nonnegative real numbers, and $E_{13}=[E_{12},E_{23}]$. Lowering operators are the transposes of their raising partners. Rephasing the basis changes some matrix-element signs.

Operators multiply column vectors on the left; column $j$ is $E_{ij}|j\rangle$. The raw column retains every target coefficient, its squared norm and whether it is the zero vector; it is not renormalized. Raising and lowering operators are not finite unitary group operations, and raw squared coefficients and column norms are not transition probabilities. A zero output means that the operator annihilates its input; it does not make the input a zero vector or identify it as a zero-weight state.

The six root shifts in $(h_1,h_2)$ coordinates are $E_{12}:(2,-1)$, $E_{21}:(-2,1)$, $E_{23}:(-1,2)$, $E_{32}:(1,-2)$, $E_{13}:(1,1)$ and $E_{31}:(-1,-1)$. For every nonzero matrix element, these shifts can be checked against target weight minus source weight.

## Fixed counterexample: two zero-weight states in the octet

This comparison always uses an independent $(p,q)=(1,1)$ octet, regardless of the input above. Its zero-weight patterns are $[2,0;1]$ and $[1,1;1]$, at indices 3 and 4 in the common order. $E_{12}$ gives $\sqrt2|1\rangle$ for the first and zero for the second; $E_{23}$ gives $|2\rangle/\sqrt2$ and $\sqrt6|2\rangle/2$, respectively. Weight coordinates alone therefore do not determine an operator action.

The comparison concerns two states inside one eight-dimensional irrep. These are not the outer-multiplicity copies $8_s$ and $8_a$ in $8\otimes8$, nor do they automatically define two energy bands. On this page $u,d,s,I,Y$ are representation labels; particle-flavor, crystal-orbital or spatial-spin interpretations require a specified model.

## Classroom predictions and stepwise exercises

1. Select $d$ in $3$. Predict the target of $E_{12}$, then check its pattern, contents, weight shift and matrix column in order. Explain why a raw norm of 1 does not make this operator unitary.
2. Compare the basis labels in $\bar3$ and $3$. Start with dual-representation generators $-E_{ij}^{T}$, then change to $(\bar s,-\bar d,\bar u)$ to check the displayed phases.
3. For the fixed octet zero-weight pair, predict whether equal weights imply equal actions. Inspect the full $E_{12}$ and $E_{23}$ columns and raw squared norms. Use a nonzero column to refute the claim that every raising operator annihilates a zero-weight state.
4. Find a weight point with several members in $27$. Compare their patterns, $I$ values and raising-operator images one by one. Explain why a weight diagram can have fewer points than the representation dimension.

## Sources and reproduction

- [Alex, Kalus, Huckleberry and von Delft, Journal of Mathematical Physics 52, 023507 (2011)](https://doi.org/10.1063/1.3521562). Algorithmic source for GT patterns and generators in an orthonormal basis; this workshop reuses the site's existing exact SU(3) CG core.
- [The authors' Clebsch–Gordan calculator and GT conventions](https://homepages.physik.uni-muenchen.de/~vondelft/Papers/ClebschGordan/). A reference for top rows, patterns, and the distinction between state multiplicity and outer multiplicity.

Run `python scripts/build-su3-basis-reference.py --check` to recompute all fifteen inputs through the genuine `browser_api.run` and compare every public reference field. `python scripts/test-python-su3-basis.py` also checks independent enumeration, fundamental and conjugate phases, the complete Lie commutators, Casimir, root shifts, the zero-weight counterexample, and unchanged pre-existing CG caches and calculations before and after calls. Exact expressions, numerical values and LaTeX come from one object; numerical values serve display and plotting only.
