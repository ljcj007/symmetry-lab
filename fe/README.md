# Fe C4z crossing experiment

This work line turns the Phase 9 endpoint observation into a reproducible DFT
experiment. It first recomputes the published eight momenta with a new SCF
potential, then follows the actual C4z-invariant Gamma-to-H path. It records
energies, symmetry labels, degeneracy clusters, source hashes, and unresolved
cases. Computation results and their status are in the experiment directories;
prepared files alone are not reported as executed calculations.

## Physics and conventions

The real-space primitive basis is stored as rows of A. Reduced reciprocal
coordinates are columns q, and the Cartesian wave vector is `q @ B` when q is
written as a row, with `B = 2*pi*inv(A).T`. The active Cartesian quarter turn is
`(x,y,z) -> (-y,x,z)`. Its lattice rotation is
`R=inv(A.T) @ Rcart @ A.T`, reciprocal action is `inv(R).T`, and spin lift is
`diag(exp(-i*pi/4), exp(+i*pi/4))`. The latter is checked against the Pauli
matrices and has fourth power minus identity.

The path is `q(t)=(t,t,t), 0<=t<=1/2`, along Cartesian z. The default path in the
source `Fe.win` ends at `(1/2,-1/2,-1/2)` and runs along Cartesian x. Although
those H endpoints differ by a reciprocal vector, their paths are distinct in
this SOC ferromagnet. `path_audit` derives and records both directions.

Plane waves are transformed with every Miller vector retained:
`G_new = inv(R).T @ G_old + inv(R).T @ q - q`. The operation has zero translation,
so there is no Seitz translation phase. The coefficient order is the original
QE `(spin, G)` order. The spin lift multiplies coefficients from the left. No
complex conjugation occurs for this unitary C4 operation. No inversion, polar
repair, coefficient cutoff, or fitted symmetry matrix is applied.

The C4 eigenvalues have fixed phases `[7,1,3,5]*pi/4`. Projector-character sums
give their multiplicities. The matrix must be nearly unitary, satisfy C4^4=-I,
remain within the raw subspace, and respect the energies before an integer label
is accepted. These are numerical tests with recorded tolerances, not interval
enclosures of the DFT solution.

The lowest-18 window is an exploratory spectral prefix, not the occupied
electronic bundle of metallic Fe. If its 18/19 gap is small, the prefix is left
unresolved. At a degeneracy, the whole energy cluster receives multiplicities;
individual vectors inside that cluster do not receive arbitrary labels. This
survives unitary mixing within the cluster.

## Pipeline

From this directory:

```powershell
python prepare_fe.py --out experiments/new_reference --samples 17
python run_fe.py --experiment experiments/new_reference --pw PATH_TO_PW_EXE --stage scf
python run_fe.py --experiment experiments/new_reference --pw PATH_TO_PW_EXE --stage baseline8
python run_fe.py --experiment experiments/new_reference --pw PATH_TO_PW_EXE --stage path
```

The input generator preserves 120 Ry wavefunction cutoff, 480 Ry density cutoff,
4x4x4 SCF sampling, the pinned fully relativistic Fe PBE pseudopotential, SOC,
noncollinear spinors, cold smearing 0.02 Ry, and the source starting magnetization.
The NSCF calculation retains 32 bands. Jobs are serial MPI processes with two
OpenMP/MKL threads by default; each has a 900-second QE guard and a separate
launcher timeout. Every stage has its own scratch directory and immutable logs.
No previous experiment or Phase 1-12 file is overwritten.

The original saved SCF density is absent. A new SCF is therefore required.
NSCF stages copy the converged new SCF save and verify that the density hashes
remain unchanged. The path launcher requires a successful eight-point
comparison, including the C4 multiplicities and absolute energies within the
declared exploratory 0.05 eV profile. It does not fit away an energy offset.
This comparison checks reproducibility at sampled points, not equality of the
old and new Hamiltonian or physical convergence.

`experiments/reference_17` contains the executed pilot and
`experiments/fine_101` the executed 101-point path. Independent 8³ and 12³ SCF
studies, their 101-point paths, all refinement rounds, and stricter-threshold
endpoint repeats are also complete. See `RESEARCH_LOG.md` and
`reports/NUMERICAL_CLOSURE.json` for the 29 runs and their scope.
Explicit exact parameters support local refinement:

```powershell
python prepare_fe.py --out experiments/refinement --parameters 1/4 17/64 9/32
python run_fe.py --experiment experiments/refinement --pw PATH_TO_PW_EXE --stage path --scf-source experiments/new_reference/scf/scratch/Fe.save
```

The source SCF and its baseline comparison must exist for such refinement.
Keep wavefunctions at all retained bracket and crossing points. Larger meshes
and finer SCF settings are convergence studies, separately named and never
silently substituted for the published profile.

## Analysis and evidence

```powershell
python analyze_fe.py --save PATH_TO_FE_SAVE --path --output PATH_TO_ANALYSIS_JSON
python test_fe.py
```

`analyze_fe.py` streams one wavefunction file at a time. It bundles only the
documented Phase 9 binary parser in `vendor`, whose SHA256 is recorded, and constructs C4z
independently of the external IrRep producer. JSON retains energies, symmetry
residuals and whole-cluster labels; CSV exposes branch energy ranges for plots.
Branches with distinct C4 eigenvalues can be followed without choosing a
smooth vector gauge. Different multiplicities between resolved neighboring
points identify a *conditional crossing bracket*. The report never calls a
small sampled gap an exact zero, and matching labels never proves a globally
open gap.

The retained `reports/OLD_8_POINT_ANALYSIS.json` reproduces Gamma `[4,4,5,5]`
and H_z `[4,5,4,5]` directly from the original wavefunctions. Its minimum sampled
18/19 gap is about 0.855786476 eV. This is a new independent analysis of old
data, not a new DFT calculation.

The tests include a known crossing, a closed-gap prefix, unitary changes within
a degenerate eigenspace, a spinless false lift, missing plane-wave weight,
energy-incompatible mixing, malformed energies, unchanged endpoint labels,
input preservation, original-data endpoint reproduction, and a changed-energy
baseline rejection. The first test run exposed the host OS temporary-directory
ACL restriction; the fixture now writes retained artifacts only under this
work line. Full test output is retained in `reports/TESTS.txt`.

The actual SCF calculations confirm a z-directed magnetic moment, and the new
paths confirm three C4 branch-order reversals. The 4³/8³/12³ mesh comparison and
stricter NSCF-threshold repeats are complete. Crossing positions remain
mesh-sensitive; cutoff and smearing convergence have not been established.
The finite-k numerical evidence does not supply rigorous spectral-error
bounds or an occupied-band topological invariant.

## Portable use outside this workspace

The scripts and `vendor/qe_reader.py` run without the Phase 9 code directory.
`SOURCE_MANIFEST.json` pins every original input to a fixed public commit with
length and SHA256. Run `python source_data.py` to fetch the small input files,
or `python source_data.py --include-wavefunctions` to include the eight original
wavefunction files needed for reference replay and the real-source tests.
Downloads go to `data/Fe-222-pw`, never overwrite a mismatched existing file,
and are accepted only if all requested sizes and hashes agree. An explicit
`FE_SOURCE_DATA` environment variable can point to an already verified local
dataset. In the original workspace, the existing Phase 9 data are used read only.

An independent denser-mesh path uses `--convergence-study`. It still requires
matching endpoint C4 branches and a shared archived density; it never changes
a failed source-reproduction comparison into a pass. The actual 8³/12³
comparisons retain their failure against the original 0.05 eV gate.

`refine_fe.py` tracks signed C4 branch-energy order. It checks the initial
execution hash, raw-file hashes, and equality of the initial and refinement
SCF density hashes. Every accepted row must pass energy covariance, even if
its individual cluster label appears well formed. `tight_threshold_check.py`
recomputes the retained endpoints at a stricter NSCF convergence threshold.

`python validate_fe.py` retains the complete test log, machine-readable result,
synthetic counterexamples, and the original-source replay. The download command
does not execute DFT or download the portable QE distribution. A missing source
dataset is a missing prerequisite, not a passing test result.
