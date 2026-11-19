const assetRoot = new URL('./data/examples/phonopy-cu-qha/', import.meta.url);
const release = '20261119-cu-qha1';
const sourceId = 'phonopy-cu-qha';
const sourceFormat = 'symmetry-lab-phonopy-cu-qha-source-1';
const sourceCommit = '18cad919af8fe8aad349e04f101887fa19b051a0';
const checks = {
  manifest: {
    name: 'source.json',
    bytes: 10416,
    sha256: '1541d711f0368a18ec4de282e71945e511d74f7ebeaf1a6654f0572ce0a06d91'
  },
  payload: {
    name: 'payload.json',
    bytes: 478997,
    sha256: 'b2becb625519c4aa7e95fe01d69a7efaf5eaafc82c2a562232251cfcbf954be3'
  }
};
const expectedUnits = {volume: 'angstrom^3', staticEnergy: 'eV/input-cell', temperature: 'K'};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const path = name => new URL(name, assetRoot).href;
const requestURL = name => new URL(name + '?v=' + release, assetRoot);
const link = (href, label) => '<a href="' + esc(href) + '">' + esc(label) + '</a>';
const bytesToHex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
const encoder = new TextEncoder();

let verifiedBundle;

class SourceError extends Error {}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new SourceError("This browser cannot verify file hashes. Open the calculation center on HTTPS or localhost.");
  }
  return bytesToHex(await globalThis.crypto.subtle.digest('SHA-256', bytes));
}

async function checkBytes(bytes, expected) {
  if (bytes.byteLength !== expected.bytes || await sha256(bytes) !== expected.sha256) {
    throw new SourceError("The file size or SHA-256 differs from the pinned version. Please reload it.");
  }
}

async function readPinned(expected, signal) {
  const response = await fetch(requestURL(expected.name), {signal});
  if (!response.ok) throw new SourceError("The file could not be read. Please try again.");
  const bytes = await response.arrayBuffer();
  await checkBytes(bytes, expected);
  return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
}

function immutably(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) immutably(item);
    Object.freeze(value);
  }
  return value;
}

function verifyMetadata(manifest, payload) {
  const malformed = "Volumes, static energies and thermal files do not match the pinned source order.";
  if (manifest.format !== sourceFormat || manifest.id !== sourceId || manifest.commit !== sourceCommit ||
      manifest.payload.path !== checks.payload.name || manifest.payload.bytes !== checks.payload.bytes ||
      manifest.payload.sha256 !== checks.payload.sha256 || manifest.volumeCount !== 11 ||
      manifest.natom !== 4 || payload.natom !== 4 ||
      manifest.cellBasis !== 'same-input-cell' || payload.cellBasis !== manifest.cellBasis ||
      !Object.entries(expectedUnits).every(([key, value]) => payload.units[key] === value) ||
      ![manifest.thermalFiles, payload.volumes, payload.staticEnergies, payload.thermalFiles]
        .every(items => Array.isArray(items) && items.length === 11)) {
    throw new SourceError(malformed);
  }
  for (const [i, entry] of manifest.thermalFiles.entries()) {
    const volume = payload.volumes[i];
    if (entry.index !== i || !Number.isFinite(volume) ||
        (i > 0 && volume <= payload.volumes[i - 1]) ||
        entry.staticVolumeAngstrom3 !== volume ||
        !Number.isFinite(payload.staticEnergies[i]) ||
        entry.staticEnergyEVPerInputCell !== payload.staticEnergies[i] ||
        !Number.isFinite(entry.printedThermalVolumeAngstrom3) ||
        Math.abs(entry.printedThermalVolumeAngstrom3 - volume) > manifest.pairingToleranceAngstrom3 ||
        typeof payload.thermalFiles[i] !== 'string') throw new SourceError(malformed);
  }
}

async function loadVerified(signal) {
  if (verifiedBundle) return verifiedBundle;
  const [metadata, content] = await Promise.all([
    readPinned(checks.manifest, signal), readPinned(checks.payload, signal)
  ]);
  const manifest = JSON.parse(metadata);
  const payload = JSON.parse(content);
  verifyMetadata(manifest, payload);
  await Promise.all(manifest.thermalFiles.map((entry, i) =>
    checkBytes(encoder.encode(payload.thermalFiles[i]), entry.yaml)));
  signal.throwIfAborted();
  const sourceEvidence = {
    id: manifest.id,
    commit: manifest.commit,
    upstreamUrl: manifest.upstreamUrl,
    payloadSha256: checks.payload.sha256,
    payloadBytes: checks.payload.bytes,
    manifestSha256: checks.manifest.sha256,
    thermalFiles: manifest.thermalFiles,
    volumeCount: manifest.volumeCount,
    natom: manifest.natom,
    temperatureCount: manifest.temperatureCount,
    license: manifest.license
  };
  verifiedBundle = immutably({
    manifest,
    formInput: {source: 'thermal', filename: 'phonopy-cu-qha-payload.json', content, sourceEvidence}
  });
  return verifiedBundle;
}

function sourceRows(manifest) {
  return manifest.thermalFiles.map(entry => '<tr><th scope="row">' + esc(entry.index + 1) +
    '</th><td>' + esc(entry.staticVolumeAngstrom3) + '</td><td>' +
    esc(entry.printedThermalVolumeAngstrom3) + '</td><td>' +
    esc(entry.staticEnergyEVPerInputCell) + '</td><td>' + link(path(entry.path), entry.path) + '</td></tr>').join('');
}

function preview(manifest) {
  const docs = new URL('./docs/cu-qha-example.md', import.meta.url).href;
  return '<div class="cq-verified" id="cq-preview" tabindex="-1">' +
    "<p class=\"cq-status\" role=\"status\">SHA-256 verified for the source manifest, the paired input and all 11 raw YAML texts.</p>" +
    "<p>Each row pairs static energy and phonon thermal properties for the same four-atom input cell. Volume is in Å³, static energy in eV per input cell, and temperature in K.</p>" +
    '<p>' + "Input temperature range" + ' · ' + esc(manifest.temperatureMinK) + '–' +
    esc(manifest.temperatureMaxK) + ' K · ' + "Step" + ' ' + esc(manifest.temperatureStepK) +
    ' K · ' + esc(manifest.temperatureCount) + ' ' + "temperature points" + '</p>' +
    "<div class=\"cq-table\" tabindex=\"0\" role=\"region\" aria-label=\"Matching volumes between the static-energy and phonon inputs\">" +
    "<table data-math-ignore><caption class=\"sr-only\">Source volumes and energies for Cu</caption><thead><tr>" +
    "<th scope=\"col\">serial number</th><th scope=\"col\">Static volume / Å³</th><th scope=\"col\">YAML volume / Å³</th>" +
    "<th scope=\"col\">Static energy / eV per input cell</th><th scope=\"col\">Original compressed file</th></tr></thead><tbody>" +
    sourceRows(manifest) + '</tbody></table></div>' +
    '<ul class="cq-links"><li>' + link(manifest.upstreamUrl, "Original Phonopy data") + '</li><li>' +
    link(path(manifest.eVFile.path), "Original e-v.dat table") + '</li><li>' +
    link(path(checks.manifest.name), "Source manifest and checksums") + '</li><li>' +
    link(path(checks.payload.name), "Paired input JSON") + '</li><li>' +
    link(path(manifest.licenseFile.path), "Data license") + '</li><li>' + link(docs, "Example notes and reproduction") + '</li></ul>' +
    "<p>After loading and running the calculation, inspect the sampled volumes on either side of the free-energy minimum at 300 K. At 2500 K, check the status of the equilibrium volume and which temperature derivatives are available.</p></div>";
}

export function bindCuQhaSource({root, isCurrent = () => true, onApply}) {
  let disposed = false;
  let controller;
  let bundle = verifiedBundle;
  let failure = '';
  let applying = false;
  let applied = false;
  const active = () => !disposed && isCurrent() && root.isConnected !== false;

  function draw(focusId) {
    if (!active()) return;
    root.innerHTML = '<section class="cq-source" aria-labelledby="cq-title">' +
      "<h3 id=\"cq-title\">Use Cu thermal expansion data from Phonopy</h3>" +
      "<p>Inspect 11 volumes, static energies and paired thermal data from Phonopy. Preview the source, then copy the complete input into the calculation form.</p>" +
      (!bundle ? '<button type="button" class="secondary" id="cq-load"' + (controller ? ' disabled' : '') + '>' +
        "Load and verify the Cu data" + '</button>' : preview(bundle.manifest) +
        '<button type="button" class="secondary" id="cq-apply"' + (applying ? ' disabled' : '') + '>' +
        "Fill the form with the verified Cu input" + '</button>') +
      (controller ? "<p role=\"status\">Reading files and checking hashes…</p>" : '') +
      (failure ? '<p class="cq-error" role="alert">' + esc(failure) + '</p>' : '') +
      (applied ? "<p class=\"cq-status\" id=\"cq-applied\" tabindex=\"-1\" role=\"status\">Input filled. Use the calculation button to inspect the fits.</p>" : '') +
      '</section>';
    const $ = id => root.querySelector('#' + id);
    const load = $('cq-load');
    const apply = $('cq-apply');
    if (load) load.onclick = async () => {
      if (!active() || $('cq-load') !== load || controller) return;
      const request = new AbortController();
      controller = request;
      failure = '';
      draw();
      try {
        const loaded = await loadVerified(request.signal);
        if (active()) bundle = loaded;
      } catch (error) {
        if (active() && !request.signal.aborted) {
          failure = error instanceof SourceError ? error.message : "The Cu data could not be loaded. Please try again.";
        }
        request.abort();
      } finally {
        controller = undefined;
        draw(bundle ? 'cq-preview' : 'cq-load');
      }
    };
    if (apply) apply.onclick = async () => {
      if (!active() || $('cq-apply') !== apply || !bundle || applying) return;
      failure = '';
      applying = true;
      draw();
      try {
        applied = (await onApply(bundle.formInput)) !== false;
        if (!applied) failure = "Wait for the current operation to finish, then try loading the form again.";
      } catch {
        failure = "The Cu input could not be filled in. Please try again.";
      } finally {
        applying = false;
        draw(applied ? 'cq-applied' : 'cq-apply');
      }
    };
    if (focusId) $(focusId)?.focus?.({preventScroll: true});
  }

  draw();
  return () => {
    disposed = true;
    controller?.abort();
  };
}
