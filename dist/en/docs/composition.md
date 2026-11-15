# From chronological actions to group multiplication

## What the operations act on

This workshop uses real two-dimensional column vectors and fixed axes, with ordered basis $e_x=(1,0)^T$, $e_y=(0,1)^T$. $R$ is a counterclockwise quarter-turn, and $M$ reflects in the planar x axis, $(x,y)\mapsto(x,-y)$. Both input-point coordinates must be integers from −2 to 2.

$$R=\begin{pmatrix}0&-1\\1&0\end{pmatrix},\qquad M=\begin{pmatrix}1&0\\0&-1\end{pmatrix}.$$

Applying active operation $A$ and then $B$ gives $BAv$. This page uses the column-vector convention in which the rightmost factor acts first; check the order convention before comparing another textbook.

## Two paths and a complete basis

Starting from the default point $(1,2)^T$, R then M gives $(-2,1)^T$ and then $(-2,-1)^T$; M then R gives $(1,-2)^T$ and then $(2,1)^T$. The composite matrices are MR and RM, respectively.

$$MR=\begin{pmatrix}0&-1\\-1&0\end{pmatrix},\qquad RM=\begin{pmatrix}0&1\\1&0\end{pmatrix}.$$

The two columns of a matrix are the images of the two ordered unit basis vectors. The stepwise diagram retains coordinates for the point, both unit arrows, and the square outline. The page selects and draws Python's returned values without recomputing them in another algebra implementation.

The fixed M/E counterexample is independent of the custom selection: M and E agree on $e_x$ but disagree on $e_y$. Agreement on one nonzero point therefore does not establish equality of linear maps. For the particular MR/RM comparison, only the planar origin hides the difference; this is distinguished from the general single-probe counterexample.

## Eight operations, generators, and closure

The fixed model order is E, R, R2, R3, M, RM, R2M, R3M, representing $R^aM^b$ with $a=0,1,2,3$ and $b=0,1$. This page denotes the square's eight-element planar dihedral group by D₄; some texts call the same abstract group D₈.

Table rows give left factor A and columns give right factor B; entry AB applies B before A. Associativity changes parentheses, not the order of the factors.

The candidate-set test asks whether every ordered product remains in that set, reporting identity and inverse conditions separately. Closure generation first adds E, then evaluates all ordered products in the current set, returning each round's new members and product witnesses until a complete round adds nothing. The process stays inside the eight predefined operations; it does not classify arbitrary or infinite matrix groups.

For example, {E,R} omits $R^2$ and is not a complete group. R generates four rotations, while R and M together generate all eight operations. An undoing operation is tested by obtaining E on both sides; negating a matrix is not a general inverse rule, as $M^{-1}=M$ illustrates.

## Boundaries of the three-dimensional embedding

Embedding each planar matrix as $\mathrm{diag}(A,1)$ fixes z and gives three-dimensional point group C₄ᵥ. The embedded M is $\mathrm{diag}(1,-1,1)$ with determinant −1. Its counterpart in proper three-dimensional point group D₄ is the twofold rotation about x, $\mathrm{diag}(1,-1,-1)$, with determinant +1; it also reverses z. The groups are abstractly isomorphic but have different three-dimensional geometric actions.

The model includes no spatial translations, Bloch phases, spinors, or magnetic-group classification. Its arrows and outline are mathematical probes rather than chemical labels that alter the object's symmetry. Local predictions and feedback do not automatically update course scores and are not measured learning gains.

## Sources and reproduction

- [T. W. Judson, Abstract Algebra: Theory and Applications, Dihedral Groups](https://twjudson.github.io/aata-files/aata-html/permute-section-dihedral-groups.html). That section uses its own multiplication-order convention; calculations here consistently use active column-vector operations with fixed coordinates.
- [Dresselhaus, Dresselhaus and Jorio, Group Theory (2008)](https://doi.org/10.1007/978-3-540-32899-5). Textbook context for symmetry operations, representations, and physical applications.
- `scripts/build-composition-reference.py` generates eight complete references through actual `browser_api.run('teaching_labs', payload)` calls. `scripts/test-python-composition.py` uses independent corner permutations and complex transformations to check all 64 products, 512 associative triples, 255 nonempty candidate sets, and all 25 bounded integer points.
