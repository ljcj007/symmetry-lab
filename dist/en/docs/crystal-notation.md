# Crystal-group symbols and operation notation

This display correction uses `20261029-crystal1`. Catalog symbols are typeset by category rather than treating Hermann–Mauguin symbols, Schönflies symbols, operation names and irrep labels as the same algebraic expression. Inputs, search identifiers, raw group data and exports retain their original values.

- **Hermann–Mauguin**: inversion/rotoinversion bars cover only their associated numbers; screw-translation indices are subscripts and magnetic primes attach to the corresponding parts. Subscript boundaries in compact ordinary symbols such as `P212121` come from explicit symbols of type-I magnetic space groups with the same numbers, not guesses from digit sequences. BNS and OG antitranslation lattice prefixes are parsed separately.
- **Schönflies:** `C2` uses a subscripted  point group  name; HM symbol `C2` keeps digits on the baseline.  space group  extended group-number superscripts and  point group  subscripts remain separate.
- **Operation names**: following upstream `showRot`, the complete `2z` in `C2z` is a subscript; `31` in `C31+` is an axis label, not a screw axis; the final `p` in `C21p` denotes a prime. Overbars cover only the base symbol by default; the overbar spanning an entire Seitz operation is handled explicitly and distinguished from an ordinary scalar minus sign.
- **Representation labels**: supports U+0304/U+0305 bars, prefixed Mulliken multiplicities, representation subscripts, and primes. Bilbao minus-sign encoding retains identifier semantics and is not interpreted as a rotoinversion bar. Legacy tokens such as `Bbp` display as barred B labels according to upstream dictionaries.
- **General formulas:** accents bind to the correct atom; upper/lower scripts share one atom. Inverses, primes, and powers after bracketed annotations retain their scope. `AB̄` has a bar over B alone; `10̄` in SU(3) keeps its complete numeric label.
- **SVG**: scripts use measured font widths and explicit baseline shifts rather than character-count estimates. Positions are recomputed after fonts load, windows resize or content expands. Native inputs and select options use raw plain text; adjacent catalogs, current-operation descriptions and calculation results provide typeset symbols.

Independent catalogue checks cover 230 space groups, 1,651 magnetic space groups, 122 magnetic point groups, 32 point groups, 70 operation types, and 6,928 BC plus 2,700 Bilbao records: 3,546 unique typed symbols. Checks verify compact/explicit catalogue agreement, bar extents, lossless identifiers, and safe text handling. General course formulas retain full-catalogue regression. SVG alignment was checked in 45 real-browser samples across three fonts and three sizes.

```sh
npm run test:math
python scripts/build-crystal-symbol-data.py --check
python scripts/refresh-formula-provenance.py --check
```

Notation follows [IUCr Hermann–Mauguin](https://dictionary.iucr.org/Hermann-Mauguin_symbols),[IUCr Seitz conventions](https://journals.iucr.org/a/issues/2014/03/00/es0405/index.html), and upstream `SpaceGroupIrep.wl` definitions of `showRot`, `showSeitz`, and label conversion. Only display changes; no new groups, standard labels, or physics are inferred.
