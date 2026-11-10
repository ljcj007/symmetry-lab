# Clickable formula and symbol dictionary

## Representation-construction extension (20261030-construction1)

This release appends 12 entries and 5 sources after the previous 94 entries and 34 source records, totaling 106 entries and 39 sources. Original entries, sources, and three historical version markers remain unchanged; only `constructionRelease=20261030-construction1` is added.

Adds character-isotypic and partner matrix-element projections,  selection rule  containment  multiplicity , Schur structure of repeated  complex representation , q stars/conjugate pairs, translation  stabilizer /indices, mode Fourier weights, Parseval, nonsymmorphic squares, momentum eigenvalues, endpoint Kramers pairing, and mass-term direct gaps in declared models. Entries specify variables, units, bases, scope, and experiment links.

Entries in this version require the matching lesson/computation context, avoiding forced interpretations of P, F(q), T² or m from other modules. `node scripts/test-construction-dictionary.mjs` checks the complete hashes of the previous 94 entries and 34 sources, and context matching/typesetting of 12 new definitions. Earlier historical notes and general interfaces follow below.

## Symmetry-principles extension (20261030-symmetry1)

Adds 12 entries/4 sources after 82/30, for 94/34; old content is unchanged. `release=20261029-pathways1`/`extensionRelease=20261030-bridges1` remain, new `principlesRelease=20261030-symmetry1` identifies this update.

Adds order parameter η, stabilizer Hη, Reynolds group averaging, passive coordinate changes, single-bond exchange J, DMI vector D, symmetric traceless exchange Γ, axial-spin transformations, conserved quantity Q, commutators, the Lindblad adjoint generator and Kramers conditions. Each entry includes variables, units, conventions, scope, sources and calculation links. Distinguish η from numerical linewidth in many-body spectra, Γ from the Brillouin-zone center, and J from total angular momentum or Hund coupling. Context-free Q, D and similar symbols are not forcibly assigned to these models.

`node scripts/test-principles-dictionary.mjs` verifies full hashes of the original 82 entries/30 sources, contextual disambiguation, safe links, and KaTeX rendering of new formulas. Historical extension notes remain below.


Version `20261029-pathways1`. The 66-entry dictionary covers representations,  space group / double group /magnetic groups, SU(2)/SU(3),  phonon , thermodynamics, tensors, transitions, topology,  transport ,  crystal field , spectroscopy, and site induction, dynamic scattering,  domain wall , Hubbard clusters.

Every definition lists its meaning, variables and units, conventions, applicability, primary-paper or official-documentation sources, and lesson/calculation links. Model-dependent units are stated explicitly, especially fractional reciprocal coordinates versus radian wave vectors, two-dimensional sheet versus three-dimensional bulk responses, frequency versus angular frequency, and physical versus reduced units.

## Usage

Click an interactive formula, or Tab then Enter/Space, to open its definition. Escape/Close returns focus. Original formula text always remains; unknown formulas show “Not yet recognized” and search, rather than guessing meanings from letters.

The standalone search page is `#docs/dictionary?q=keyword`, supporting Chinese concepts, Unicode symbols and common TeX notation, such as `k`, `U`, `J`, `Γ`, `DSF`, `domainwall`, `Hubbard` and `bandrep`. Expand a result for full conventions and sources.

## Integration API

Load `formula-dictionary.css` at the main entry, import `formula-dictionary.js`, then call:

```js
const stop = startFormulaDictionary(document.body);
// 页面/应用整体销毁时：stop();
```

The standalone dictionary uses a synchronously created controller with asynchronously loaded data:

```js
const controller = renderFormulaDictionary({
  container,
  selection: {q: 'S(Q,ω)'}
});
await controller.ready;
// 离开词典页时：controller.destroy();
```

`selection.query` can supply the initial query; `q` takes precedence. With no query, all entries are listed. The caller parses route queries and handles route changes. Failed loads show a reload button; responses arriving after destruction cannot overwrite a new page.

Pure-logic interfaces support validation/other read-only entries:

- `resolveFormulaEntries(source, {route, context, kind}, catalog)`: returns `matches`, `ambiguous` and `unknown`.
- `searchDictionary(query, catalog)`: returns matching entries, retaining multiple senses.
- `formulaDictionarySource(element)`: read existing `data-math-source` or SVG `aria-label`.
- `safeDictionaryHref(value, external)`: allows only hash routes internally and credential-free HTTPS URLs externally.

## Disambiguation

One letter can have several independent meanings, not one unconditional definition, for example:

|Symbol|Explicitly distinguished meanings|
|---|---|
|k|Fractional reciprocal coordinates in space groups/phonons; radian wave vector in some tight-binding models|
|U|Unitary action; Hubbard onsite repulsion; independent spin transformation in  spin group |
|Γ|Brillouin-zone center; electrode-coupling broadening matrix|
|J|Spin exchange; Hund coupling; total angular momentum|
|χ|Representation  character ; second-order optical susceptibility|

The current route, nearest module marker and original text of the nearest formula block provide context; explicit structures such as `U−3J` or `Γ_L` also inform matching. Equally reliable candidates are shown together without selecting one by default.

Existing crystallographic `data-crystal-kind` typing overrides literal guesses: HM `C2` is interpreted only as a lattice symbol, Schönflies `C2` as a point group, and operation names as operations. Irrep `T2` is not mistaken for time reversal squared. Composite Seitz symbols can be identified separately. Untyped `C2` without contextual evidence is not forcibly classified.

This curated concept dictionary is not a symbolic-algebra parser. Unknown variables, full material parameters, and unimplemented mechanisms still require module conventions/original references.

## Original text, exports and accessibility

Site-wide decoration applies only to existing `span.sl-math[data-math-source]`, `.sl-equation[data-math-source]`, and suitable SVG formula text. Each formula block gets one keyboard stop, avoiding nested interactions within it. Buttons, links, inputs, selects, code, editable content, and the dictionary itself are skipped.

Triggers add only recoverable focus, role, and definition attributes, without changing formula children, `data-math-source`, data, calculations, or exports. Existing `mathSourceText()` receives identical original text. Only “original formula” `pre` retains `data-math-ignore`; entry prose, variables, units, and labels use shared `mathHTML`/`math-notation` typesetting, with no page/dialog math blocking.

The dictionary displays explicit aliases `kz` and `λ±` as `k_z` and `λ_{±}`. These are dictionary display conventions and do not modify the shared parser or original calculation formulas. Display wrappers retain original spelling for `mathSourceText()`. Symbol labels use ordinary `span` elements rather than `code`, which disables mathematical typesetting. Event entry points always exclude `.fd-page` and `.fd-dialog`, preventing typeset internal formulas from triggering recursively.

Event delegation and a `childList`-only observer handle dynamic pages. Adding focus attributes does not retrigger observation. Sequence numbers invalidate asynchronous requests after closing or switching; repeated opening reuses one native `dialog`. Cleanup removes delegation, observer, and dialog and restores original attributes.

## Regression validation

`node scripts/test-formula-dictionary.mjs` checks 66 entries and source/link completeness and executes production keyboard, mouse, modal-focus, late-async, dynamic-insertion and teardown paths. It also checks k/U/Γ/J/χ disambiguation, explicit crystal types, unknown-formula fallback, preservation of original formulas, safe input escaping, unsafe-URL filtering and the standalone search page. Visual regressions verify actual KaTeX subscripts `k_z` and `λ_{±}`, paired scripts in `U_S²`, exclusion of only the original-text area and nonrecursive triggering inside the dictionary. Tests require no installed browser or third-party DOM dependencies.
