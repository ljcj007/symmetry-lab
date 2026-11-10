# Homepage/SHG flagship experiment · first teaching-experience redesign

The homepage offers three entry levels—foundations, physical applications and advanced research—each explaining goals, prerequisites and next steps. The seven existing learning routes, all computational tools, material atlas, favorites, recent visits and research records remain accessible. Mobile navigation shows Home, Learn, Compute, Atlas and Docs, while assistive technologies retain full names. Body text remains 18px, with existing mathematical fonts and crystal-symbol typesetting.

## Loading boundaries

- Home/lesson overview do not request  space group ,  magnetic space group ,  magnetic point group  operation databases.
- Group directories and workbenches load only the group category currently needed. Requests are shared and failures can be retried; late responses after navigation do not overwrite the new page.
- Lessons and advanced-tool interfaces are dynamically imported on entering their pages; Python still starts on the first calculation.
- Search focus/input loads one compact 2316-record index, not 18 full courses/three operation datasets. If it fails, local tool search remains with retry.
- `node scripts/build-search-index.mjs` generates the index from existing catalogs; `--check` verifies consistency with current content.

## Si, GaAs, and BaTiO₃ flagship experiment

Entry `#classroom/observables?module=shg-story`; calculator `#compute/shg-flagship`. Home, overview, atlas, and search link here.

1. Predict whether symmetry forbids ideal bulk electric-dipole SHG. The original prediction is retained, and an incorrect prediction does not prevent progress.
2. Calculate each material with the existing Python `shg_lab`, using actual calculations rather than preset curves. Vary (001)/(111) planes, incidence angle, azimuth, and PP/PS/SP/SS channels.
3. Explain 0/1/3 tensor components through inversion, group projection, and  detected polarization  projection. Concept questions are checked; open explanations are recorded, not automatically judged physically correct.
4. Keep the same GaAs (001) tensor and compare 0° and 45° incidence: all four channels vanish in the former, while nonzero signals appear in the latter, although the crystal lacks inversion in both cases. A single zero signal does not establish inversion symmetry.

Models: diamond Si Oh, zinc-blende GaAs Td, and tetragonal ferroelectric single-domain BaTiO₃ C4v. Only degenerate-input j↔k symmetry is imposed, without extra Kleinman symmetry. GaAs χxyz=1; BaTiO₃ χxxz=1,χzxx=0.7,χzzz=1.5,c/a=1.01. These are teaching coefficients, not measured optical constants. Intensities share arbitrary units without curve-by-curve normalization. Surface, electric-quadrupole, Fresnel, absorption, and phase-matching effects are omitted.

Reports contain raw inputs, curves, tensor bases, orientation, constraint residuals, two counterexamples, predictions, and explanations. Export JSON or add to material records. Only small drafts auto-save; refresh requires recalculation. “Restart” clears this experiment's predictions/text, not material records; export wanted reports first. Geometry edits clear old evidence; late canceled/navigation results do not complete it.

## Review

`npm test` covers existing frontend features, formulas, routes, and the new experiment workflow. `python scripts/test-python-shg-lab.py` checks independent index contractions, analytic angular dependence, inversion prohibition, and the normal-incidence counterexample. New UI tests generate reference outputs live from this Python core. Before release, check desktop/mobile entries, real-browser calculations, and export.

Reading: [ShgPy](https://bfichera.github.io/shgpy/),[Yambo nonlinear angular response](https://wiki.yambo-code.eu/wiki/index.php?title=Angular_dependence_of_non-linear_response). The site uses its existing independent teaching core.
