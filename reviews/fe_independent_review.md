# Independent review of the Fe numerical experiment

Date: 2026-11-02. This review did not change the Fe calculation or analysis
implementation. It examined conventions, execution provenance, numerical
assignment and claim boundaries, and implemented a separate raw binary decoder.

## Result

The retained data support a reproducible numerical result: along the actual
C4z-invariant path q(t)=(t,t,t), three intervals show reversals in the energy
order of different C4 branches bordering the lowest-18 spectral window. These
three branch-exchange patterns persist under 4³, 8³ and 12³ SCF sampling and
stricter endpoint diagonalization. Their positions remain sensitive to the SCF
mesh. The result is a finite-cutoff numerical diagnostic with conditional
continuity reasoning, not a rigorously enclosed zero of the original missing
SCF Hamiltonian.

The independent replay checked **27 analysis files, 484 C4-invariant k records,
389 resolved lowest-18 assignments, 9,174 resolved energy clusters and 29
execution records**. Counts include repeated momenta and different SCF meshes;
they are not counts of distinct materials or distinct physical k points. All
checks passed. The complete results and source hashes are in
`fe_independent_review.json`.

## Coordinate and operator audit

With primitive direct basis vectors as rows of A, the reciprocal basis is
B=2πA⁻ᵀ. A reduced reciprocal column q represents Cartesian momentum Bᵀq.
The analyzer's conversion from QE XML k coordinates in units 2π/alat is
q=A k_XML/alat, equivalently the recorded row-vector form. XML eigenvalues
are in Hartree and are converted once to eV. The XML 60-Hartree wavefunction
cutoff is correctly identified as 120 Ry.

The active Cartesian quarter rotation Rz:(x,y,z)→(−y,x,z) has reciprocal lattice
action T=B⁻ᵀ Rz Bᵀ. This equals the analyzer's inverse-transpose direct-lattice
action. The spin lift diag(exp(−iπ/4),exp(+iπ/4)) has fourth power −I and rotates
the Pauli vector by the same active Rz. For a C4-invariant momentum modulo the
reciprocal lattice, a plane wave maps as

G′=TG+(Tq−q).

The analyzer applies that permutation to the full original coefficients and
multiplies the two spin components by the lift. The operation is unitary, has
zero translation and needs no complex conjugation or Seitz phase. No polar
repair, coefficient truncation or fitted symmetry matrix is used.

The path q=(t,t,t) runs along Cartesian z. The source Fe.win endpoint
(1/2,−1/2,−1/2) runs along Cartesian x. The H endpoints differ by an integer
reciprocal vector, but those paths differ in this SOC ferromagnet. The new jobs
correctly use the z path. The new SCF logs show magnetization along −z and
successful convergence, consistent with the intended C4z symmetry.

## Independent wavefunction and label replay

`review_fe_independently.py` imports neither the Fe analyzer, its binary reader,
the certificate core nor the external producer. It independently decodes every
Fortran record from raw bytes, reconstructs the reciprocal C4 permutation and
forms the symmetry matrix in the raw band frame. Instead of the analyzer's
character-trace inversion, it diagonalizes the retained symmetry blocks and
classifies eigenvalues against phases [7,1,3,5]π/4. Every reported resolved prefix
and cluster multiplicity agrees. The largest cluster root-distance residual is
4.24×10⁻¹⁵; the largest recorded energy-covariance residual is 2.46×10⁻¹¹ eV.

The analyzer's four-character inversion is mathematically correct: the ratios
of the four odd eighth roots form the four characters of C4. It checks raw-frame
orthogonality, leakage, unitarity, fourth power and proximity of multiplicities
to integers. A near-degenerate energy cluster is treated as a whole subspace.
No arbitrary individual vector label is assigned inside a mixed cluster.

When the outer gap is below the unchanged 1-meV prefix threshold, the prefix
remains unresolved. Refinement can still compare individually resolved energy
clusters on the two sides of the candidate crossing. The reviewer identified
that this refinement must also require the row's energy-covariance check. That
gate was added, together with explicit initial RUN/raw-data binding and matching
SCF-density hashes. All retained actual refinement endpoints satisfy the gate;
this correction does not change their numerical conclusions.

## Provenance and baseline reproduction

All 18 pinned original source files match their saved lengths and SHA256 values.
The complete portable QE distribution matches its recorded distributor digest
`e50ec7368a5b7a964eb5084e0a13464ba2628d4e147c16227e876002ea34fdf7`.
All completed jobs identify the same archived QE 7.5 executable and retain input,
output, pseudopotential and density hashes. Source and copied NSCF density bytes
agree within each SCF profile; the 4³, 8³ and 12³ profiles are kept distinct.
A distributor digest check does not independently validate its compiler build.

The source UPF SHA256 is
`371345212f2e0e81bfb97b9562099b39e3901399513a980386643bff2c3270d5`.
QE's archived Windows save copy has raw SHA256
`570320d994a97cede7fb1250dbcc8db0cc3174599e1c332b088063da41b6bccd`.
Replacing CRLF with LF recovers the source digest. Both raw and canonical hashes
are retained; no numerical pseudopotential content is replaced or silently
treated as identical under a broader normalization.

The new 4³ SCF profile reproduces the 8×32 original eigenvalues to a maximum
absolute difference of 2.5083×10⁻⁷ eV, without fitting an energy offset. The
original eight-point grid has only **two** C4z-invariant points, Γ and H; both
lowest-18 multiplicity vectors agree with the new data. This is eight-point
energy reproduction and two-point C4-label agreement, not eight independent
C4-label checks. The original saved SCF density is absent, so agreement does not
prove bytewise or mathematical identity of the original Hamiltonian.

The denser 8³ and 12³ calculations intentionally change that SCF profile. Their
maximum baseline energy differences from the original 4³ data are respectively
0.39442 and 0.34951 eV, and their reports retain `BASELINE_MISMATCH_REQUIRES_REVIEW`.
Their path executions are correctly identified as convergence studies, rather
than relabelled successful reproductions of the original source.

## Refined intervals and stability checks

| SCF mesh | Branch phases exchanged | Retained t interval |
|---|---|---|
| 4³ | 5π/4, π/4 | [0.1152978515625, 0.115302734375] |
| 4³ | π/4, 5π/4 | [0.1848974609375, 0.18490234375] |
| 4³ | 3π/4, π/4 | [0.229384765625, 0.2293896484375] |
| 8³ | 5π/4, π/4 | [0.1159423828125, 0.115947265625] |
| 8³ | π/4, 5π/4 | [0.1863330078125, 0.186337890625] |
| 8³ | 3π/4, π/4 | [0.236796875, 0.2368017578125] |
| 12³ | 5π/4, π/4 | [0.1137841796875, 0.1137890625] |
| 12³ | π/4, 5π/4 | [0.1888427734375, 0.1888525390625] |
| 12³ | 3π/4, π/4 | [0.231298828125, 0.23130859375] |

Every interval endpoint is bound to an executed raw-data analysis row. The
signed energy difference E_b−E_a is positive on the left and negative on the
right with the reported branch phases. Tightening NSCF conv_thr from 10⁻¹⁰ to
10⁻¹² Ry and independently recomputing all 18 retained endpoints preserves all
nine reversals. The maximum changes among the 32 reported energies are
3.8043×10⁻¹¹, 3.0646×10⁻¹¹ and 9.5213×10⁻¹² eV for 4³, 8³ and 12³ respectively.
This is a numerical threshold-stability check, not a rigorous eigenvalue bound.

The reviewer also checked a potential continuity issue specific to plane-wave
cutoffs. For each short interval, an independent dual-lattice bound gives 9,261
candidate G vectors. The quadratic function |Bᵀ(G+t1)|² is evaluated using its
analytic extremum formula and endpoints in floating arithmetic. No candidate
crosses the 120-Ry membership threshold in any of the nine intervals. Endpoint
G sets match the independently enumerated cutoff spheres, with 1,773, 1,761 or
1,765 plane waves. The smallest numerical threshold margin is 0.01577 Ry. Thus
the fixed-basis assumption is numerically supported locally, rather than inferred
only from equal endpoint counts. This check uses floating arithmetic and is not
an interval-arithmetic proof.

## Actual-wavefunction fault injection

The reviewer independently reconstructed the C4z × inversion unitary subgroup
at the new Γ/H endpoints. Inversion maps G→−G−2q and acts trivially on axial spin.
Replacing its matrix P by −P preserves P²=I, the C4 relation, commutation and
unitarity. It changes the joint C4/parity multiplicities of the fixed raw
wavefunctions. A separate SVD of each C4 eigenspace followed by parity
diagonalization reproduces the submitted joint counts.

The physical raw binding residuals are 2.731×10⁻¹⁰ and 9.102×10⁻¹²; the forged
binding residual is approximately 2 at both endpoints. This supports the stated
workflow distinction between internally consistent local algebra and binding to
the actual physical operation. It is not evidence that an external program
failed a requested test, and it is not a full 16-operation magnetic certificate.

## Interpretation boundary and replay

The distinct C4 phases forbid symmetry-preserving mixing of the compared
branches. Their observed energy-order reversals, combined with continuity and
correct branch assignments, imply a crossing for the corresponding numerical
profile. The data do not establish rigorous DFT error enclosures, a cutoff- and
smearing-converged physical crossing position, a global occupied bundle in
metallic Fe, or the absence of additional crossings between sampled points.
The mesh-dependent position shifts are much larger than the local refinement
widths, so the latter must not be reported as a physical error bar.

Replay from the workspace root:

```powershell
python -B research/ncs-program/phase13/reviews/review_fe_independently.py
```

`--base-dir` selects a relocated Phase 13 directory, and `--source-dir` selects
the pinned original Fe dataset. Raw numerical replay requires the retained QE
save directories. The script does not launch DFT, modify Fe artifacts or import
their implementation. Its only non-standard dependency is NumPy.
