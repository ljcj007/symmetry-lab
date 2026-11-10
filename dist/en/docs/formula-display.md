# Site-wide formulas, superscripts, and subscripts

Current inspection version `20261110-math1`, date 2026-11-10.

This update adds explicit subscripts to tensor indices, mechanical representations and reflection probabilities, using identical notation in source units and merged lessons. It corrects 330 teaching-text passages, including 22 native select options. Calculation inputs, defaults, option values, lesson IDs and routes are checked field by field. BaTiO₃, MnF₂ and Ni²⁺ use upright element symbols; Å², Å⁻¹, Chinese indices, conjugate transposes and BC coordinate labels are handled consistently.

The formatter preserves each label's full original text, avoiding splitting formula-containing forms or multiple-choice options into separate lines. Long formulas scroll horizontally on narrow screens and support arrow keys when focused; short formulas preserve inline baselines. Minimum grid widths in the point-group classroom are fixed so formulas do not widen mobile pages.

This audit scanned 75 JSON files,997 formula fields,3735 inline passages, and 7147 math fragments, without unprocessed scripts or render failures. Real-browser batches typeset 2705 unique samples from 34 catalogs, checking parse errors, original text, narrow overflow, and labels; desktop/mobile entries of 18 modules were checked too. Numerical cores and real fixtures were unchanged.

Review command: `npm run test:math`; local browser fixture: `node scripts/build-math-review.mjs`, outputting to ignored `.openai/` without adding site navigation. Check the latest source manifest with `python scripts/refresh-math-audit-provenance.py --check`.

## Historical fixes and backup

Version `20261029-crystal1`, date 2026-10-29.

This update covers lesson prose, display formulas, stepwise derivations, calculation results, material cases and SVG chart labels. Courses, original data, calculation interfaces and numerical results remain intact, with 18px body text. Fixes are confined to display; typeset HTML is not written back into inputs, research records or JSON exports.

The source before formula repairs is saved in GitHub branch [backup/2026-10-29-before-formula-fix](https://github.com/ljcj007/symmetry-lab/tree/backup/2026-10-29-before-formula-fix), starting at commit [`6514b43e9153315d857be59668a0790b4ca40993`](https://github.com/ljcj007/symmetry-lab/commit/6514b43e9153315d857be59668a0790b4ca40993). Use it to inspect or restore that source version.

## Three display paths

1. **Display formulas**: lesson and result containers use a unified process to normalize supported source notation and pass it to local KaTeX. Superscripts, subscripts, grouped exponents and matrices share mathematical fonts and baselines. Multiline expressions retain logical line breaks, and Chinese explanations mixed with formulas remain text.
2. **Inline content**: explicit mathematical subscripts and superscripts in prose, tables, headings, and exercises are formatted, including after lesson changes, expanded derivations, and result updates. Existing MathML and rendered KaTeX nodes are retained to avoid repeated typesetting or nested formulas.
3. **SVG labels:** native `tspan`/baseline shifts render scripts while preserving curves, coordinates, and hit regions. No HTML formula nodes enter SVG; original text/accessibility names remain.

Display rules distinguish mathematical notation from program identifiers. Inputs, raw JSON, code, file paths, URLs and exports retain original values. Native `select` options use plain text because they cannot contain KaTeX/HTML. Existing native MathML is retained, avoiding degradation of accessible mathematical structure into duplicated text.

Typesetting does not execute expressions or change Python/JavaScript calculations. Unreliably recognized mixed content remains readable text; guessed semantics never become computational input.

## Local resources and licenses

The site hosts **KaTeX 0.19.1** ESM, CSS and 20 WOFF2 fonts locally, without a third-party CDN. Upstream uses the MIT license, preserved at [`vendor/katex/LICENSE`](../../vendor/katex/LICENSE); version, download sources and asset hashes appear in [`vendor/katex/provenance.json`](../../vendor/katex/provenance.json). Original site code remains under the repository’s GPL-3.0-only license.

Official KaTeX sources: [repository](https://github.com/KaTeX/KaTeX), [supported functions and notation](https://katex.org/docs/supported), [options](https://katex.org/docs/options). Trusted HTML commands are disabled; user-provided content is still handled as text.

## Audit and reproduction

The static audit traversed all lesson JSON and frontend display entry points, finding 629 `formula` field occurrences and 527 unique strings, including duplicates in merged catalogs, chemical formulas and Chinese explanations. It also checked mathematical notation, group labels and chart text in ordinary prose, distinguishing typesettable content from paths/API names.

Checks cover mixed Unicode/ASCII scripts, parenthesized negative exponents, scripts on the same base, daggers, matrices, fractions, Chinese annotations, multiline expressions, safe escaping, dynamic updates, and preservation of SVG source labels. All 527 formula samples, asynchronous insertions, matrices, font loading, results, exercises, and chart labels were browser-checked without parsing errors or horizontal overflow. Full-catalogue regression additionally verifies 1283 prose entries and 3709 mathematical fragments, with lossless reconstruction of original text.

Manifests record UTF-8/LF text hashes and unconverted binary hashes. Historical versions, counts, and sources remain; only file/Python-module hashes refresh. After all source changes, run:

```sh
python scripts/refresh-formula-provenance.py
python scripts/refresh-formula-provenance.py --check
```

`--check` verifies read-only and changes no files; the script does not recompute physics, build courses, package or publish. Checks for added display files and local fonts appear in [`formula-display-provenance.json`](../data/formula-display-provenance.json).

Formula regression: `npm run test:math`; full UI regression: `npm test`.
