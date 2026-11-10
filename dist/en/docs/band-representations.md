# From real-space sites to Bloch representations

Version: `20261029-pathways1`. Calculation entry: `band_rep_lab.calculate(payload)`, depending only on NumPy and this site's `symmetry_core`.

This experiment builds a periodic orbital basis from a real-space seed and its  space group  orbit, calculates Bloch action matrices, then restricts to  little group  at selected k and decomposes. It does not call the full  k star  induction interface; their starting subgroups and bases differ.

## Selected models and coordinates

|Space group|Available sites|Orbital multiplicity in primitive cell|
|---|---|---|
|2, P−1|Origin, body-center inversion center,  general position |1,1,2|
|4，P2₁| general position |2|
|19，P2₁2₁2₁| general position |4|
|221, Pm−3m|1a origin, 1b body-center and 3c face-center orbits|1, 1, 3|

Operation records `(name,R,t)` for the four groups match the official `space-groups.json` catalogue and are compared individually by independent tests. They use that catalogue's **BC primitive-cell coordinate setting**; for example, group 4 has its screw axis along z, not the common unique-b cell. Historical operation names are catalogue labels only; spatial action is determined by R and t.

`s` is a one-dimensional scalar; `p` is the complete `(p_x,p_y,p_z)`  polarity  vector in fixed global Cartesian axes, with local matrices 1 and R. Selected rotation matrices are orthogonal in this frame. Spin, SOC,  time reversal  are excluded. A site  point orbit  can accidentally have higher structural symmetry; only the specified group action is studied, without symmetry identification.

## Derive phases from lattice remainders

First generate distinct primitive-cell positions `r_a`. Every Seitz operation `g={R_g|t_g}` satisfies

```
R_g r_a + t_g = r_b + L_ga，L_ga ∈ Z³。
```

The periodic Bloch basis is defined as

```
|a,k> = Σ_T exp(+2πi k·T)|T+r_a>。
```

Let `q=R_g^(-T) k`; using `T'=R_g T+L_ga` gives

```
U_g(k)[b,a] = exp(−2πi q·L_ga) ρ(R_g)。
```

The matrix maps the k fiber to the q fiber. Only when q and k are equivalent modulo a reciprocal vector is it a little-group action at k, whose character can be taken in one fiber. The periodic-gauge orbital basis is identical at `k+G`; using a Bloch exponent including `r_a` requires the corresponding matrix gauge transformation.

Integer defects in representative products `g h = {E|Δ_gh} j` cannot be discarded. The code verifies both within  little group

```
U_g(k) U_h(k) = exp(−2πi k·Δ_gh) U_j(k)，
```

Also verify the general cross-fiber relation

```
U_g(hk) U_h(k) = exp(−2πi (ghk)·Δ_gh) U_j(k)。
```

The stabilizer table uses `t_g−L_g0`, so an operation fixes the seed exactly rather than modulo translation. Independent checks verify `orbit multiplicity × stabilizer order = |G/T|` and representation dimension `orbit multiplicity × local orbital dimension`.

##  little group  decomposition and interactive output

Use `symmetry_core` to construct the factor system corresponding to the lattice defects, obtain little-group irreducible representations verified by multiplication and orthogonality, and decompose by inner products of complete character vectors. Output includes nonnegative integer multiplicities, character-reconstruction errors, dimension conservation and unitarity checks. D1, D2 and similar labels are local calculation indices, not BC/Bilbao standard labels, and cannot track bands across k points.

The first plot shows little-group characters at the selected k. Groups 4 and 19 also show z-axis `2₁` eigenphase branches `λ±=±exp(−iπkz)` and check `U_S²=exp(−2πikz)I` point by point. These are symmetry eigenvalues, not energy dispersions.

Independent tests include the hand-derived group-4 screw matrix and direct real-space Fourier sum; boundary `±i` eigenvalues; boundary-parity changes with inversion-center position; group-19 R-point anticommutation and two two-dimensional  projective representation ; the cubic-origin p triplet; nine-dimensional 3c p representation; and multiplication/dimensions for every site, s/p, Γ/boundary/interior-line point.

## Parameters and scope

Parameters: `group`, `site`, `orbitals`, `kPoint`, `kz`. `site=auto` chooses the origin for groups 2/221 and a general site for 4/19. Only `kPoint=line` uses `k=(0,0,kz)`, with `kz` in 0–1/2. Other options have explicit coordinates Γ, X=(1/2,0,0), Y, Z, M, R; letters are interface abbreviations, not a claim of consistent conventions across cells.

Unsupported sites are explicitly rejected. The interface returns unified `parameters/summary/plots/tables/warnings/checks` and complete `spaceGroup/site/representation/irreps/decomposition/screw/convention` data, with complex numbers in `{re,im}` for lossless JSON storage.

This does not include a full Wyckoff database, arbitrary site-local irreducible representations, double-valued or magnetic band representations, full-Brillouin-zone compatibility graphs, general EBR elementary-status tests or topological classification. The full local p space is already reducible under some stabilizers; a site-induced representation is not automatically an EBR. Material cases borrow ideal structural frameworks only and do not establish actual occupancies, energies or material topology.

## Primary sources

- [Cano et al., Building Blocks of Topological Quantum Chemistry: Elementary Band Representations, PRB 97, 035139 (2018)](https://arxiv.org/abs/1709.01935): site representations, induction, and elementary criteria.
- [Elcoro et al., Double crystallographic groups and their representations on the Bilbao Crystallographic Server, J. Appl. Cryst. 50, 1457–1477 (2017)](https://arxiv.org/abs/1706.09272): the relation of DSITESYM/BANDREP to site induction.
- [Bilbao SiteSym methods](https://cryst.ehu.eus/html/rep/sitesym/sitesym_help.html): the site-symmetry approach to real-space local excitations and space-group representations.
- [Official spglib dataset documentation](https://spglib.readthedocs.io/en/stable/dataset.html): Wyckoff and site-symmetry definitions. This experiment does not require running spglib.
