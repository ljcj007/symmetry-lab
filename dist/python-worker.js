// Versions match the downloadable CPython modules. Inputs stay in this Worker.
const INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
const BUILD = '20261023-lie2';
const plans = {
  analyze: ['symmetry_core'], induce: ['symmetry_core'], product: ['symmetry_core'], match_bands: ['symmetry_core'],
  magnetictb: ['magnetictb_browser'], crystkit: ['crystkit_browser'],
  symbolic: ['magnetictb_browser', 'symbolic_core'],
  crystkit_ext: ['crystkit_browser', 'crystkit_extensions', 'integral_normalizer', 'arithmetic_centralizer'], carat: ['crystkit_browser', 'crystkit_extensions', 'integral_normalizer', 'arithmetic_centralizer', 'carat_browser'],
  carat_integral: ['crystkit_browser', 'crystkit_extensions', 'integral_normalizer', 'arithmetic_centralizer', 'carat_browser', 'finite_conductor', 'carat_integral'],
  integral_normalizer: ['crystkit_browser', 'crystkit_extensions', 'integral_normalizer', 'arithmetic_centralizer'],
  symbolic_interfaces: ['magnetictb_browser', 'symbolic_core', 'symbolic_interfaces'],
  arithmetic_centralizer: ['crystkit_browser', 'crystkit_extensions', 'integral_normalizer', 'arithmetic_centralizer'],
  symbolic_spacegroups: ['magnetictb_browser', 'symbolic_core', 'symbolic_interfaces', 'symbolic_spacegroups'],
  standard_labels: ['magnetictb_browser', 'symbolic_core', 'standard_labels'],
  teaching_labs: ['crystal_labs', 'lie_applications', 'lie_labs', 'teaching_labs'],
  structure_bc: ['spglib_runtime', 'structure_bc']
};
let runtime;
const modules = new Set(), packages = new Set(), catalogs = new Set();
let databaseLoaded = false, magneticDatabaseLoaded = false, labelsLoaded = false, spglibLoaded = false;
async function resource(path) {
  const url = new URL(path, import.meta.url); url.searchParams.set('v', BUILD);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`资源加载失败 (${response.status}): ${path}`);
  return response;
}
async function prepare(id, action, payload) {
  if (!Object.hasOwn(plans, action)) throw new Error('未知计算工具');
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('输入必须是 JSON 对象');
  const dimension = payload.dimension ?? 3;
  if (['carat', 'carat_integral'].includes(action) && (!Number.isInteger(dimension) || dimension < 1 || dimension > 6)) throw new Error('CARAT 维数须为 1–6 的整数');
  const progress = message => self.postMessage({id, status: 'loading', message});
  if (!runtime) {
    progress('首次运行：下载 Python 解释器…');
    const {loadPyodide} = await import(INDEX_URL + 'pyodide.mjs');
    runtime = await loadPyodide({indexURL: INDEX_URL});
    runtime.runPython('import json, sys, gzip\nsys.path.insert(0, "/home/pyodide")\n_sg_database = None\n_magnetic_database = None\n_label_database = None\n_carat_catalogs = {}');
  }
  const needsLabels = action === 'standard_labels' || (action === 'analyze' && payload.group_number !== undefined);
  const exact = needsLabels || ['crystkit', 'symbolic', 'carat', 'crystkit_ext', 'carat_integral', 'integral_normalizer', 'symbolic_interfaces', 'arithmetic_centralizer', 'symbolic_spacegroups'].includes(action);
  for (const name of action === 'teaching_labs' ? [] : exact ? ['numpy', 'sympy'] : ['numpy']) {
    if (packages.has(name)) continue;
    progress(`正在加载 Python 计算库 ${name}…`);
    await runtime.loadPackage(name); packages.add(name);
  }
  if (action === 'structure_bc' && !spglibLoaded) {
    progress('正在加载本地晶体对称性引擎 spglib…');
    const {createSpglibBridge} = await import('./vendor/spglib/bridge.mjs');
    self.symmetryLabSpglib = await createSpglibBridge();
    spglibLoaded = true;
  }
  for (const name of ['browser_api', ...plans[action], ...(needsLabels ? ['magnetictb_browser', 'symbolic_core', 'standard_labels'] : [])]) {
    if (modules.has(name)) continue;
    progress('正在加载本站 Python 计算代码…');
    const response = await resource(`./python/${name}.py`);
    runtime.FS.writeFile(`/home/pyodide/${name}.py`, await response.text(), {encoding: 'utf8'});
    runtime.runPython(`import ${name}`); // name is from the fixed allowlist above.
    modules.add(name);
  }
  if ((needsLabels || ['structure_bc', 'crystkit', 'crystkit_ext', 'integral_normalizer', 'arithmetic_centralizer', 'symbolic_spacegroups'].includes(action)) && !databaseLoaded) {
    runtime.globals.set('_data_text', await (await resource('./data/space-groups.json')).text());
    runtime.runPython('_sg_database = json.loads(_data_text)\ndel _data_text');
    databaseLoaded = true;
  }
  if (needsLabels && !labelsLoaded) {
    progress('正在载入 BC / Bilbao 标准标签与特征标…');
    runtime.runPython('_label_database = {}');
    for (const name of ['bc', 'bilbao']) {
      const bytes = new Uint8Array(await (await resource(`./data/labels/${name}-labels.json.gz`)).arrayBuffer());
      runtime.FS.writeFile('/home/pyodide/labels.json.gz', bytes);
      runtime.globals.set('_label_kind', name);
      runtime.runPython('with gzip.open("/home/pyodide/labels.json.gz", "rt", encoding="utf8") as _file:\n    _label_database[_label_kind] = json.load(_file)\ndel _label_kind, _file');
      runtime.FS.unlink('/home/pyodide/labels.json.gz');
    }
    labelsLoaded = true;
  }
  if (action === 'symbolic_spacegroups' && !magneticDatabaseLoaded) {
    progress('正在载入精确磁空间群数据…');
    runtime.globals.set('_data_text', await (await resource('./data/magnetic-groups.json')).text());
    runtime.runPython('_magnetic_database = json.loads(_data_text)\ndel _data_text');
    magneticDatabaseLoaded = true;
  }
  if (['carat', 'carat_integral'].includes(action) && !catalogs.has(dimension)) {
    progress(`正在载入 ${dimension} 维 CARAT 完整 Q 类目录…`);
    const bytes = new Uint8Array(await (await resource(`./data/carat/q${dimension}.json.gz`)).arrayBuffer());
    runtime.FS.writeFile('/home/pyodide/catalog.json.gz', bytes);
    runtime.globals.set('_catalog_dimension', dimension);
    runtime.runPython('with gzip.open("/home/pyodide/catalog.json.gz", "rt", encoding="utf8") as _file:\n    _carat_catalogs[_catalog_dimension] = json.load(_file)\ndel _catalog_dimension, _file');
    runtime.FS.unlink('/home/pyodide/catalog.json.gz'); catalogs.add(dimension);
  }
}
self.onmessage = async ({data: {id, action, payload}}) => {
  try {
    await prepare(id, action, payload);
    self.postMessage({id, status: 'running', message: 'Python 正在本地计算…'});
    runtime.globals.set('_request_json', JSON.stringify({action, payload}));
    const output = runtime.runPython(`
_request = json.loads(_request_json)
try:
    _result = browser_api.run(_request['action'], _request['payload'], _sg_database, _carat_catalogs.get(_request['payload'].get('dimension', 3)), _magnetic_database, _label_database)
    _output = json.dumps({'result': _result}, ensure_ascii=False, allow_nan=False)
except Exception as _error:
    _output = json.dumps({'error': str(_error)}, ensure_ascii=False)
_output
`);
    self.postMessage({id, status: 'done', ...JSON.parse(output)});
    runtime.runPython('del _request_json, _request, _output\n_result = None');
  } catch (error) {
    self.postMessage({id, status: 'error', error: 'Python 环境或计算失败：' + (error.message || String(error))});
  }
};
