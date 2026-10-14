# Rebuild the browser data offline

Run from the `symmetry-lab` directory with Python 3.10 or newer:

```sh
python -m pip install -r scripts/data/requirements.txt
python scripts/data/rebuild_data.py --check
```

`--check` verifies the upstream source manifest, rebuilds into a temporary
directory, validates the data, and compares the three outputs byte for byte
with the published datasets. It leaves `dist` unchanged. Once NumPy is
available, the build needs no network access, Wolfram installation, spglib,
or PyCifRW.

To replace the three published JSON files:

```sh
python scripts/data/rebuild_data.py
```

To build elsewhere:

```sh
python scripts/data/rebuild_data.py --output build-data
```

The script locates sources relative to itself, so it also works from another
working directory. `--output` is resolved relative to the current directory.

The build runs, in order:

1. `extract_space_groups.py`: extract 230 ordinary space groups from inspected
   source literals; generate Seitz representatives and k-point metadata.
2. `extract_msg_data.py`: parse 1,651 magnetic tables and 122 magnetic point
   groups, BNS/OG identifiers, and the six-decimal upstream spin matrices.
3. `enrich_symmetry_data.py`: join lattice metadata and operation names; verify
   ordinary operations against type-I MSGs; add the source spin lifts.
4. `validate_msg_data.py`: verify all 676,317 magnetic operation products using
   exact rational translations with common denominator 12.

The generated files are `space-groups.json`, `magnetic-groups.json`, and
`points.json`. Ordinary extraction additionally checks closure, expected point
group orders, and Cartesian rotation orthogonality. The enrichment step checks
all 2,609 ordinary operations against the independent type-I magnetic tables.
Browser representation tests remain in `scripts/test-*.mjs`.

The required original text sources and complete GPL-3.0 licenses are under
`upstream/`. `upstream/manifest.json` records repository identifiers and SHA-256
hashes. The build deliberately does not regenerate the separate narrative
`provenance.json` or the trace-file demonstration excerpts.
