# BC/Bilbao standard representation labels

The site can query BC standard character tables and map locally calculated D1/D2 labels to BC and Bilbao labels. Matching uses every character of the full little group rather than guessing from dimensions or numerical eigenvector order. Original local indices are retained.

## Included data

- **BC:230 ordinary  space group , single/double-valued,6928 named-k-point/line tables.** Extract SpaceGroupIrep `LittleGroupIrepData.wl`, `AbstractGroupData.wl`, `LGIrepLabel`/`DLGIrepLabel`, including extended Mulliken, BC Γ labels, abstract representation IDs, dimensions, reality, and exact  character .
- **Bilbao: 230 ordinary space groups, 460 single-/double-valued source files and 2,700 maximal-k tables.** Sources are Bilbao tables retained by IrRep, frozen at commit `4f43f138d30ef37a499a297ac9b1ec8ef14717cc`. Decimal amplitudes and phases have rounding error, so matching is numerical with tolerance.
- Nonsymmorphic primitive cells, origin choices, rotation names, and spin-component order have been converted to site BC conventions. Source files, licenses, SHA-256 hashes, and checks accompany the site.

BC/Bilbao numbering can differ. Group  space group 4 at Z: BC `Z1` maps Bilbao `Z2`; BC `Z2` maps `Z1`. Compute mapping via  character .

## Usage

After an ordinary-space-group calculation, open the “BC / Bilbao” results tab. The Python JSON interface `standard_labels` also supports queries:

```json
{"action":"table","group_number":4,"k_label":"Z","double_valued":false}
```

List named k points/lines of a group:

```json
{"action":"catalog","group_number":144,"double_valued":true}
```

Query a screw-axis parameter line:

```json
{"action":"table","group_number":144,"k_label":"Delta","parameter":"173/1000"}
```

`Gamma`,`Lambda`,`Delta`,`Sigma` alias `Γ`,`Λ`,`Δ`,`Σ`. If several BZ shapes exist, specify `bz_type`, e.g. `OrthFace(b)`. Without it, all applicable tables and possible naming ambiguities are retained.

`annotate`/`match` accept `{group_number,k,double_valued,operations,irreps}` or numerical-engine `analysis`. Each representation supplies `id`,`dimension`,`characters`;characters may be exact expressions,`[real,imaginary]`,`{re,im}`. Operations must be the **complete**  little group  at k for current BC  space group ,reordering/integer translations allowed. Reject duplicates,missing columns,noninteger rotations,wrong Seitz translations.

## Conventions and evidence

Translation phase: `exp(-2π i k·t)`. BC abstract-group generator powers are expanded by source tables; differences between Herring-group and selected Seitz representatives are compensated by exact translation phases. Generic k lines use source central extensions. Double-valued tables use explicitly specified BC SU(2) lifts, with every multiplication sign verified by exact matrix identities.

Bilbao uses opposite  character ; follow SpaceGroupIrep `buildTr4BCSrep` notes with  complex conjugation . Convert conventional cells to BC  primitive cell , check origins/rotations/translations, rotate spin coordinates/swap components, and compensate integer translations/double-cover section signs.

Matching first uses the space group’s own k-star transformations. An additional library provides 3,935 affine-normalizer transformations certified by full Seitz conjugation, for cases where BC and Bilbao choose different equivalent k representatives. This finite, individually certified library does not enumerate the whole infinite normalizer. If allowed transformations yield different labels, results are **ambiguous** and list candidates; specify the k name, BZ type or comparison convention.

Screw representation labels can permute under `u → u+1`. The program retains original k parameters, preferring exact parameter representatives rather than first reducing to `[0,1)`. Matching certificates show origins, translations, spin sections, and parameters.

Default BC tolerance `2e-5`; Bilbao `2e-4`. BC expressions are exact, but matching numerical calculations remains numerical identification, with actual residuals retained.

## Verification and explicit limits

- All 93 source abstract-group character tables pass orthogonality checks.
- All6928 BC tables pass orthogonality/`Σ dim² = |G_k|`.
- All 460 Bilbao source files and 2,700 k tables convert successfully, passing rotation/origin/spin-section alignment checks.
- At Γ for all 230 groups, independent numerical algorithms compute single- and double-valued representations: **BC 460/460 and Bilbao 460/460 uniquely match**.
- Match8907 representations in2700 Bilbao tables to BC:8779 unique,104 multiple names under allowed external  normalizer  conventions,24 triclinic points absent from BC originals. Preserve ambiguity/nulls for the latter groups.

“All” means every entry of the frozen catalogs above, not invented standard names for arbitrary k or representations. Frozen Bilbao data omit general parameterized k lines; BC labels remain available there, while Bilbao is blank. Special points unnamed in the original BC book are not assigned fabricated BC labels. Magnetic-space-group corepresentation names belong to a different catalog; ordinary labels are not presented as magnetic corepresentation labels. E/M indices in symbolic space-group tools retain their existing meaning; automatic labels connect to the site’s ordinary-space-group numerical workbench.

Parameter-line tables cease to apply at endpoints where the little group enlarges; recalculate the endpoint little group and query its point table.

Records:[manifest](../../data/labels/manifest.json),[validation](../../data/labels/validation.json);[source archive](../../data/labels/bilbao-source.zip);[IrRep GPL-3.0](../../licenses/IrRep-LICENSE.txt).

## Rebuild

Run from the repository root:

```text
python scripts/build-standard-labels.py
python scripts/build-bilbao-labels.py
python scripts/test-python-standard-labels.py
```

Step2 defaults to frozen `bilbao-source.zip`; an explicitly supplied inspected local IrRep source is optional. Build scripts parse static data, without Mathematica. Runtime neither parses Wolfram sources nor executes user inputs.

Main sources: [SpaceGroupIrep](https://github.com/goodluck1982/SpaceGroupIrep), [SpaceGroupIrep paper](https://doi.org/10.1016/j.cpc.2021.107993), [IrRep data and code](https://github.com/irreducible-representations/irrep/tree/4f43f138d30ef37a499a297ac9b1ec8ef14717cc), [Bilbao REPRES label documentation](https://cryst.ehu.eus/rep/repres.html).
