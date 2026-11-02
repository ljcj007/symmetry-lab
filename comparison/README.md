# Actual same-input IrRep comparison on new QE 7.5 Fe data

The experiment invokes IrRep 2.1.0 on the unmodified new QE 7.5 wavefunctions and independently reads the same files with the Phase 13 raw-wavefunction checker. The baseline eight-point dataset contains two C4z little-group points, Γ and H_z; both were compared. Every point in the 101-point Γ–H_z path is C4z invariant, so that run made 101 actual external matrix calls. No cross-path target search was attempted.

The final records are indexed by `reference_baseline8_LATEST.json`, `fine101_path_LATEST.json` and [SUMMARY.json](SUMMARY.json). All 103 comparisons pass their stated numerical conditions. Across the 101-point run:

- The two parsers retain identical complex plane-wave coefficients, after aligning their Miller-vector order: maximum discrepancy zero.
- The complete 32-band matrices, expressed in the same coordinate convention, differ by at most 2.505×10⁻¹⁵.
- The direct 18-band overlap matrices differ by at most 1.136×10⁻¹⁴, and four-root count estimates by at most 1.254×10⁻¹⁴.
- With the same documented Hartree-to-eV constant, energy differences are at most 1.422×10⁻¹⁴ eV.
- Every nearest-integer multiplicity agrees. The independently checked 18-band prefixes are numerically resolved at all 101 sampled points. This does not certify an open gap between samples.

The phase order is `[7,1,3,5]` in units of π/4. Both routes give Γ counts `[4,4,5,5]` and H_z counts `[4,5,4,5]`. On the 101-point grid, the common count changes occur in the sampled intervals (0.115,0.120), (0.180,0.185) and (0.225,0.230). These are the same finite-grid compatibility observations, not additional DFT calculations or exact crossing locations.

## What the external tool actually supplies

`BandStructure(..., code='espresso', Ecut=None, normalize=False, calculate_traces=False)` uses IrRep's QE parser. The adapter obtains its C4z space-group operation and calls `irrep.gvectors.symm_matrix(..., unitary=False)` at each actual little-group point. The returned row-wavefunction matrix is transposed to column coefficients. The fixed active rotation is +π/2 about Cartesian z and its spin lift is diag(exp(−iπ/4),exp(+iπ/4)). IrRep's returned lift already agrees with this choice to about 1.58×10⁻¹⁶; the recorded multiplier is +1. No wavefunction-dependent sign fitting occurs.

IrRep computes the symmetry matrices. The four-root decomposition is calculated by this comparison adapter; it is not represented as an IrRep-generated irreducible-label report. The independent raw checker separately supplies leakage, unitarity, fourth-power, integer, energy-covariance and outer-gap diagnostics. This comparison does not test or allege a missing global-gluing capability in IrRep.

## The retained first mismatch and the resolved API conventions

The first baseline comparison is retained as `MISMATCH`, together with its matrices and source/input hashes. Its 18-band matrices already agreed within 4.49×10⁻¹⁵ and its multiplicities agreed exactly. Two incorrectly aligned comparison quantities triggered that status:

1. `symm_matrix` explicitly calls `right_inverse(WF)` even when `unitary=False`. For the raw frame Φ, write G=Φ†Φ and B=Φ†TΦ. The external column-coordinate matrix is **G⁻¹B**, while the independent raw overlap is **B**. Inverting the Gram matrix is part of IrRep's coordinate definition, not a polar unitarization. The corrected comparison evaluates `solve(G,B)` independently and compares like coordinate maps. The direct unconverted difference remains recorded; at Γ the full 32-band difference was about 1.89×10⁻⁹ because the raw high-band Gram matrix is not exactly identity.
2. IrRep uses 27.211386 eV per Hartree, while the raw checker uses 27.211386245988. The initial direct energy difference of at most 5.97×10⁻⁷ eV follows from those known constants. The corrected comparison converts both results to the latter constant. It does not fit or subtract an energy offset.

The thresholds were not loosened. Source inspection supplied the exact coordinate and unit conversions; the final discrepancies are smaller than the original thresholds. The first status is a diagnostic of the initial comparator's mismatched definitions, not evidence of an IrRep algorithm failure. All raw inputs were hashed before and after extraction and remained unchanged.

## Reproduction

Use the same completed `Fe.save` directories with NumPy and IrRep 2.1.0 installed. The adapter may use the previously pinned local research vendor when available; otherwise it imports the installed package. No external package binaries are bundled. From the release root containing sibling `comparison/` and `fe/`:

```text
python comparison/compare_irrep_c4.py --save PATH_TO_BASELINE8/Fe.save --label reference_baseline8
python comparison/compare_irrep_c4.py --save PATH_TO_101_POINT_PATH/Fe.save --label fine101_path
python comparison/summarize.py
```

The code creates fresh result directories, preserves all attempts, and never writes the source wavefunctions. Each run records actual package versions, adapter/parser/kernel hashes, every XML/wavefunction/pseudopotential hash, matrix arrays, convention conversion, per-point diagnostics and runtime. Raw wavefunctions and external package binaries are separate from the compact public source snapshot.

This is real external-tool execution on identical numerical inputs. It establishes agreement for the stated finite-k C4z matrices and count decomposition; it is not a proof of continuous band isolation, global topology, all magnetic operations, all IrRep capabilities, or external-institution replication.
