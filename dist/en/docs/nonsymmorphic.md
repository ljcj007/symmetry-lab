# Screws, glides, and momentum-dependent degeneracies

This experiment directly solves periodic two-/four-band Hamiltonians. The three-dimensional operation is a glide `{m_y|a_x/2}` or twofold screw `{C₂x|a_x/2}`, analyzed along a one-dimensional momentum line in x. It is not a material band calculation, complete three-dimensional space-group classification or three-dimensional topological-index solver.

## Conventions and representations

Input  reciprocal lattice  fractional `f_x`, matrix parameters `k=2π f_x`. A/B at `x=0,a/2`, use periodic Bloch from cell Fourier labels. Single-valued basis `(A,B)`; double-valued `(A↑,A↓,B↑,B↓)`.

\[
S(k)=\begin{pmatrix}0&e^{-ik}\\1&0\end{pmatrix},\qquad S(k)^2=e^{-ik}I.
\]

The double-valued representation is `G=S⊗iσ_axis`, with axis=y for the glide and axis=x for the screw. The overall rotation sign is an explicit double-group central convention. Time reversal is `T=(I⊗iσ_y)K`, with `T²=−I`; single-valued models use `G=S,T=K,T²=+I`. Thus `G²=(−1)^(2s)e^(−ik)I`, with double-valued eigenvalues `±i e^(−ik/2)`. Both `H` and `G` are strictly periodic under `k→k+2π`, with sewing matrix I.

3D little-group checks use fractional reciprocal coordinates: glide `R=diag(1,−1,1)`, screw `R=diag(1,−1,−1)`; every component of `Rk−k` must be integer. TRIM additionally requires integer components of `2k`. The model lacks transverse dispersion, so plots may look identical outside the little group. The code explicitly disables partner-switching protection there; accidental equality is not general material protection.

## Actual Hamiltonians and crossings

Define `A=(1+cos k)τ_x+sin k τ_y` and `B=sin k τ_x+(1−cos k)τ_y`. The double-valued model is

\[
H=tA\otimes I+\lambda B\otimes\sigma_{\rm axis}
 +m\tau_z\otimes I+bI\otimes\sigma_{\rm axis}
 +\epsilon\cos k\,I.
\]

The single-valued model is `H=tA+mτ_z+bB+ε cos k I`, ignoring λ. b is a time-reversal-breaking orbital term, not a spin Zeeman field.

For m=b=0, write `Q=cos(k/2)τ_x+sin(k/2)τ_y`, with `H₀=2Q⊗[t cos(k/2)I+λ sin(k/2)σ_axis]`. Energies `±2[t cos(k/2)±λ sin(k/2)]` gain common dispersion `ε cos k`. Positive t,λ give the internal four-band crossing `k*=2 atan(t/λ)`; single-valued bands pair at k=π. Plots include analytic crossings, so missed finite-grid nodes are not misreported as gaps.

At double-valued Γ, Kramers partners have opposite ±i labels; at X, partners in the same pair share ±1. Partner-switching protection is reported only if both G and T are symmetries, the whole line belongs to G’s little group and both endpoints are TRIM. G is rediagonalized inside degenerate energy blocks rather than using the solver’s arbitrary degenerate basis.

## Strict scope of gap-opening challenges

“Middle gap” is the minimum Γ—X direct separation between the middle two sorted bands at the same k, not an indirect gap or proof of 3D insulation.

`mτ_z` anticommutes with H₀, breaks G and preserves T; for b=0, the minimum direct gap along the whole line is exactly `2|m|`. Double-valued endpoints retain the Kramers condition.

The minimal-breaking challenge starts at m=b=0 and enumerates adding m=0.3 and/or strong T breaking. The double-valued case takes `b=8(t+λ+1)` and uses the Weyl bound to obtain

\[
\Delta_{\min}\geq 2b-4\sqrt{t^2+\lambda^2}-2|m|>0.
\]

Single-valued b=2t, `t cos(k/2)+b sin(k/2)≥min(t,b)` gives lower bound `4 min(t,b)>0`; mass increases the gap further. Each term reports numerical scan minima and rigorous bounds. The baseline includes analytic crossings, so at least one listed perturbation meets the target. These are actual added matrices, not assumed physical changes from deleting symmetry labels.

After quotienting translations and the double-group center, the constraint graph shows only the G/T label quotient of order 4/2/1; matrix checks still retain the Bloch phases and negative T² in the full relations. This is not a space-group subgroup database.

## Interaction and validation

- Representation replay: k/Rk, two sites/intercell shifts, S, G, G², H, eigensubspaces.
- Subspace assignment: submit the lowest-energy subspace at the current k; phases and internal unitary basis changes are equivalent.
- 8 presets, including 2 cross-module checks; 3 lessons; 3 four-step exercise sets; 2 prediction questions; 3 material/mechanism cases.
- Independent checks: analytic eigenvalues, group relations,  time reversal , periodic sewing, endpoint labels, anticommuting masses, full-line bounds, and  little group  counterexamples.

Run `python scripts/test-python-nonsymmorphic.py`.

## Primary literature

- [Wang et al., Hourglass fermions, Nature 532, 189–194 (2016)](https://www.nature.com/articles/nature17410)
- [Ma et al., Experimental evidence of hourglass fermion in KHgSb (2017)](https://doi.org/10.1126/sciadv.1602415)
- [Wang, Jian & Yao, Hourglass semimetals with nonsymmorphic symmetries in three dimensions (2017)](https://arxiv.org/abs/1702.06140)
- [Wieder & Kane, Spin-orbit semimetals in the layer groups (2016)](https://doi.org/10.1103/PhysRevB.94.155108)

References provide mechanisms/material context. The complete minimal Hamiltonians/challenge matrices here are not fitted models of those materials.
