QE-Si: exact scalar replay
=========================

Unzip this entire archive. Python 3.9+ is sufficient; no additional packages,
network access, VASP or Quantum ESPRESSO installation are required.

Windows: double-click verify.cmd (requires Python on PATH).
Any platform: python verify.py
Optional new output: python verify.py --out result.json

A successful run prints VERIFIED_PUBLISHED_SCALAR_COMPOSITION and exits 0.
A rejected or missing input exits 2. The program never overwrites --out files.

What is recomputed
------------------
1. The SHA-256 identity of this exact, sanitized public scalar projection.
2. Shared radial model, ideal geometry and potential endpoint identities.
3. The strict rational contraction inequality eta + q R < R.
4. The complete potential error, using an outward 128-bit dyadic upper bound
   for sqrt(48^3), plus the received continuous raw-to-saved source bound.
5. Both inward spectral-cut shifts and the strictly positive common gap.

All proof arithmetic uses Python integers and fractions. The public statement
is gap > 0.081 eV, rounded down; exact rational values remain in JSON. Original
fractions are retained as data, not displayed as long numerical divisions.

Scientific object
-----------------
The local symmetric SCF root belongs to a declared finite reference equation:
80 Ry orbitals, 48^3 charge grid, canonical 12^3 momentum quadrature (72
irreducible points), analytic reference PBE, exact ideal affine symmetry and
C1 interpolation of exact UPF radial nodes. The spectrum is that of the
complete infinite-plane-wave frozen Bloch family at this enclosed reference
self-consistent potential. Rank four is separated uniformly over the BZ.

No infinite-orbital nonlinear SCF root, continuous density-grid/BZ-integration
limit, global energy minimum or arbitrary VASP/QE input verifier is claimed.

What is received rather than recomputed
--------------------------------------
This small public bundle is a scalar projection of executed scientific
receipts. It does not include the full native outputs, 72 response matrices,
925 closed-domain matrices, source files or arithmetic-runtime manifests.
Their original SHA-256 identities locate the preserved research records;
those hashes do not mean the original parent bytes are present or reread by
this public program. The displayed domain totals are received obligations,
not a new geometric/matrix proof. The source builder cross-checks the exact
parent receipt bytes and scalar fields when publishing this projection.

The public JSON and its hash provide version consistency, not an independent
substitute for the parent scientific proofs. Full scientific replay requires
the original research dependencies and separate received matrix packets.

License
-------
Receiver code and this project-authored scalar projection: GPL-3.0-only; see
LICENSE. No third-party pseudopotential or proprietary VASP data is bundled.
