# English edition

Open [Symmetry Lab in English](https://ljcj007.github.io/symmetry-lab/en/). Use **English** or the Chinese-language button in the header to change language while keeping the current route, selected lesson, and URL parameters. The Chinese edition remains at the original address. Links with `?lang=en` or `?lang=zh` select an edition explicitly.

The English edition includes the learning paths, lessons, guided exercises, interactive experiments, calculation tools, materials atlas, project assignments, formula dictionary, and methods documentation. It uses the same enlarged text and scientific notation renderer as the Chinese edition.

## Calculations and saved work

Both editions use the same original Python computation modules and crystallographic databases. English pages load their interface and message catalogs locally. No translation service is contacted when using the website. The Python interpreter and numerical packages retain the existing on-demand loading behavior.

Inputs, numerical values, matrices, identifiers, internal enum values, and imported structures are preserved. English result descriptions are produced at the display boundary; a localizer never renames result keys or translates filenames, raw input files, or user-authored notes. Mathematical annotations may use English words, while the underlying calculation remains unchanged.

Learning progress, favorites, recent tools, and the material notebook use the existing browser storage. Changing language neither resets progress nor translates your own writing. Work saved on one device remains local to that browser, as before.

## Rebuilding and verification

The committed `locales/` catalogs are the source of the English wording. Editorial and scientific corrections take precedence over drafts. Updating a Chinese source requires an English catalog entry before a release can be built successfully.

```sh
npm ci --ignore-scripts
npm run build:english
npm run test:english
npm test
```

The build generates `dist/en/` without contacting a translation provider. The English checks require complete source coverage, reject leftover preparation markers, compare catalog schemas and computational inputs, resolve all local JavaScript imports, and validate the English formula catalog. Real Python-result fixtures additionally check that localization preserves every numerical value and result key. The existing Python regression suite continues to validate the shared computation cores.

For development, `node scripts/build-english.mjs --allow-missing` can create a partial local preview. That option is not accepted as release validation. `--check` verifies that committed pages match the catalogs without writing files.

## Scope of the scientific content

The English edition preserves the model assumptions and coverage limits of each existing calculator. A translated classroom does not extend a teaching model into a general material prediction or a complete classification beyond the scope stated in its documentation. Follow the original sources linked from each module for conventions and scientific definitions.
