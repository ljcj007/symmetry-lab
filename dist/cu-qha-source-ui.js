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
    throw new SourceError('当前浏览器无法校验文件。请通过 HTTPS 或本机地址打开计算中心。');
  }
  return bytesToHex(await globalThis.crypto.subtle.digest('SHA-256', bytes));
}

async function checkBytes(bytes, expected) {
  if (bytes.byteLength !== expected.bytes || await sha256(bytes) !== expected.sha256) {
    throw new SourceError('文件大小或 SHA-256 与固定版本不同。请重新读取。');
  }
}

async function readPinned(expected, signal) {
  const response = await fetch(requestURL(expected.name), {signal});
  if (!response.ok) throw new SourceError('文件暂时无法读取。请重新读取。');
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
  const malformed = '体积、静态能量与温度文件未按固定来源对齐。';
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
    '<p class="cq-status" role="status">已核对来源清单、配对输入和 11 段原始 YAML 文本的 SHA-256。</p>' +
    '<p>每行的静态能量和声子热性质都对应同一个四原子输入胞。体积用 Å³，静态能量用 eV/输入胞，温度用 K。</p>' +
    '<p>' + '已提供的温度采样' + ' · ' + esc(manifest.temperatureMinK) + '–' +
    esc(manifest.temperatureMaxK) + ' K · ' + '步长' + ' ' + esc(manifest.temperatureStepK) +
    ' K · ' + esc(manifest.temperatureCount) + ' ' + '个温度点' + '</p>' +
    '<div class="cq-table" tabindex="0" role="region" aria-label="静态能量与声子输入的体积配对">' +
    '<table data-math-ignore><caption class="sr-only">Cu 体积和能量来源表</caption><thead><tr>' +
    '<th scope="col">序号</th><th scope="col">静态体积 / Å³</th><th scope="col">YAML 体积 / Å³</th>' +
    '<th scope="col">静态能量 / eV 每输入胞</th><th scope="col">原压缩文件</th></tr></thead><tbody>' +
    sourceRows(manifest) + '</tbody></table></div>' +
    '<ul class="cq-links"><li>' + link(manifest.upstreamUrl, 'Phonopy 原始数据') + '</li><li>' +
    link(path(manifest.eVFile.path), '静态能量原表 e-v.dat') + '</li><li>' +
    link(path(checks.manifest.name), '来源清单与校验和') + '</li><li>' +
    link(path(checks.payload.name), '配对输入 JSON') + '</li><li>' +
    link(path(manifest.licenseFile.path), '数据许可证') + '</li><li>' + link(docs, '算例说明与复现') + '</li></ul>' +
    '<p>填入并计算后，在 300 K 查看自由能极小值两侧各有哪些体积采样。在 2500 K 查看平衡体积的状态及可用的温度导数。</p></div>';
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
      '<h3 id="cq-title">使用 Phonopy 的 Cu 热膨胀数据</h3>' +
      '<p>查看来自 Phonopy 的 11 组体积、静态能量及配对热性质。可以先读数据，再把整组输入填入计算表单。</p>' +
      (!bundle ? '<button type="button" class="secondary" id="cq-load"' + (controller ? ' disabled' : '') + '>' +
        '读取并核对 Cu 数据' + '</button>' : preview(bundle.manifest) +
        '<button type="button" class="secondary" id="cq-apply"' + (applying ? ' disabled' : '') + '>' +
        '将核对过的 Cu 输入填入表单' + '</button>') +
      (controller ? '<p role="status">正在读取文件并核对校验和…</p>' : '') +
      (failure ? '<p class="cq-error" role="alert">' + esc(failure) + '</p>' : '') +
      (applied ? '<p class="cq-status" id="cq-applied" tabindex="-1" role="status">已填入。请使用计算按钮查看拟合结果。</p>' : '') +
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
          failure = error instanceof SourceError ? error.message : '无法读取 Cu 数据。请重试。';
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
        if (!applied) failure = '暂时无法填入表单。请在当前操作结束后再试。';
      } catch {
        failure = '无法填入 Cu 输入。请重试。';
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
