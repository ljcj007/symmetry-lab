// Pyodide version and packages are pinned together. Inputs remain in this Worker.
const INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
let runtime;
const modules = new Set();
const packages = new Set();
let databaseLoaded = false;
async function prepare(id, action) {
  const progress = message => self.postMessage({id, status: 'loading', message});
  if (!runtime) {
    progress('首次运行：下载 Python 解释器…');
    const {loadPyodide} = await import(INDEX_URL + 'pyodide.mjs');
    runtime = await loadPyodide({indexURL: INDEX_URL});
    runtime.runPython('import json, sys\nsys.path.insert(0, "/home/pyodide")');
  }
  const needed = action === 'crystkit' ? ['numpy', 'sympy'] : ['numpy'];
  for (const name of needed) {
    if (packages.has(name)) continue;
    progress(`正在加载 Python 数值库 ${name}…`);
    await runtime.loadPackage(name);
    packages.add(name);
  }
  const name = action === 'magnetictb' ? 'magnetictb_browser' : action === 'crystkit' ? 'crystkit_browser' : 'symmetry_core';
  if (!modules.has(name)) {
    progress('正在加载本站 Python 计算代码…');
    const response = await fetch(new URL(`./python/${name}.py`, import.meta.url));
    if (!response.ok) throw new Error(`Python 模块加载失败 (${response.status})`);
    runtime.FS.writeFile(`/home/pyodide/${name}.py`, await response.text(), {encoding: 'utf8'});
    runtime.runPython(`import ${name}`);
    modules.add(name);
  }
  if (action === 'crystkit' && !databaseLoaded) {
    const response = await fetch(new URL('./data/space-groups.json', import.meta.url));
    if (!response.ok) throw new Error('空间群参考数据库加载失败');
    runtime.globals.set('_sg_database_text', await response.text());
    runtime.runPython('_sg_database = json.loads(_sg_database_text)\ndel _sg_database_text');
    databaseLoaded = true;
  }
}
self.onmessage = async ({data: {id, action, payload}}) => {
  try {
    await prepare(id, action);
    self.postMessage({id, status: 'running', message: 'Python 正在本地计算…'});
    // User data is JSON, never interpolated into executable Python source.
    runtime.globals.set('_request_json', JSON.stringify({action, payload}));
    const output = runtime.runPython(`
_request = json.loads(_request_json)
try:
    if _request['action'] == 'magnetictb':
        _result = magnetictb_browser.run(_request['payload'])
    elif _request['action'] == 'crystkit':
        _result = crystkit_browser.run(_request['payload'], _sg_database)
    else:
        _result = symmetry_core.run(_request['action'], _request['payload'])
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
