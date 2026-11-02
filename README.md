# Magnetic-symmetry certificate research benchmark

This snapshot joins an exact rational arrangement checker, a complete spinful
diagonal-mirror grey-group exchange problem, and a raw-wavefunction Fe C4z
diagnostic workflow. It is a research branch. The Symmetry Lab website and its
deployment branch remain unchanged.

## Quick start: exact verification (Python standard library)

From the snapshot root:

```text
python exchange/verify.py --problem exchange/fixtures/mirror/problem.json --certificate exchange/fixtures/mirror/certificate.json
python exchange/run_benchmark.py --output replay/benchmark
python exchange/test_contract.py --output replay/contract
python geometry/test_geometry.py
```

The full fixture must return `CERTIFIED`. The benchmark records the actually
executed local, boundary, period, atlas and source-binding layers. Prefix passes
are explicitly weaker than full acceptance. Negative examples are regenerated
by the included fixed test code; author-run summaries and output records are
included. Large generated negative input copies are retained in the author's
research archive rather than duplicated here.

The complete global recipient is a fixed mirror-grey model contract. The rational
geometry engine supports a wider class of coupled planes. This release does not
claim a universal all-magnetic-space-group solver. See [the exchange scope and
proof](exchange/THEOREMS.md), [geometry proof](geometry/THEOREMS_AND_PROOFS.md),
and [why the new model is distinct](reviews/MODEL_DISTINCTNESS.md).

## Fe workflow and optional reviews

[Fe instructions](fe/README.md) specify the correct Cartesian-z path, fixed
source data, executable acquisition, SCF restart requirements, and band-18/19
diagnostics. Fe analysis requires NumPy. The portable program is optional; it
is not bundled. Prepared inputs, synthetic tests and repeated analysis of old
data are distinguished from actually executed new DFT in the Fe records.

The independent matrix review requires NumPy; the independent LP geometry
review additionally requires SciPy. These numerical reviews supplement, and do
not replace, the standard-library exact certificate checks. The recorded
external spgrep experiment is separate from our own ablation layers.

`reviews/fe_inversion_fault.py` applies an inversion-character fault to actual
Fe endpoint spinors. Both submitted alternatives satisfy the tested local
group and energy checks, but the altered parity assignment fails binding to
the unchanged raw wavefunctions. This is an executed check of our diagnostic,
not a claim that an external tool was run and missed the fault.

Both production and verification were developed by the same research project.
Their dependencies and shared exact arithmetic are disclosed. Clean replay on
the author's workstation is not third-party replication. This GitHub branch is
a public source snapshot, not a DOI deposit or a peer-reviewed publication.

`MANIFEST.json` binds every distributed file. Reports may replace the author's
absolute workstation prefix by `<AUTHOR_WORKSPACE>`; the transformation and
original digests are recorded in `PROVENANCE.json`. Scientific values are not
changed. Source code uses the project's GPL version 3 license. Source Fe data
are fetched separately under the recorded upstream terms.
