# Upstream source notices

This directory contains the original text sources needed to reproduce the
browser data, with the original author notices retained. Both projects are by
Gui-Bin Liu and are distributed under GNU GPL version 3. Complete license texts
are included as `SpaceGroupIrep/LICENSE` and `MSGCorep/LICENSE`.

- SpaceGroupIrep: <https://github.com/goodluck1982/SpaceGroupIrep>
  (commit `7b43201ac0973333edbe69bc3dd6ccb308abf624`, version 1.2.9).
- MSGCorep: <https://github.com/goodluck1982/MSGCorep>.
  The source tree identifier is recorded in `manifest.json` and public dataset
  provenance. It includes all 1,651 `BC_MSG_elements/BC-MSG_elem_*.txt` tables.

The accompanying extraction and enrichment code is in `../scripts/data/` and
is distributed under GPL-3.0. The browser code and its distribution license are
at the site root. This is a source subset for the browser data build: Wolfram
binary databases, archives, notebooks, and `.git` directories are omitted.
It is not a standalone installation of either original Wolfram package.

`manifest.json` records SHA-256 hashes of the vendored text files as distributed
here. Text line endings may differ from the repositories. The source comments,
copyright notices, and complete license terms are preserved.
