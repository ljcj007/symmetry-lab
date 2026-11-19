import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {analyzeEvidence, operationCategories} from './pointgroup-identify-core.js?v=20261119-pointgroups1';

const sourceURL = new URL('./data/pointgroup-identify.json?v=20261119-pointgroups1', import.meta.url);
let catalogPromise;

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(sourceURL).then(response => {
      if (!response.ok) throw Error('暂时无法读取点群题库。');
      return response.json();
    }).catch(error => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const math = tex => '<span class="sl-math">' + mathHTML(tex) + '</span>';
const nativeHm = symbol => symbol.replace(/-([1346])/g, '$1\u0304');
const groupName = group => crystalSpan(group.hm, 'hm') + ' · ' + crystalSpan(group.schoenflies, 'schoenflies');
const countText = value => String(Math.round(value * 10000) / 10000).replace('-', '−');
const vectorText = vector => '(' + vector.map(countText).join(', ') + ')';
const pad = n => String(n).padStart(2, '0');

const modes = [
  {id: 'starter', text: '入门题', symbols: ['m', '2', '2/m', 'mm2', '222', '-1']},
  {id: 'compare', text: '易混点群对照', symbols: ['4mm', '-42m', '6', '-6', '432', '-43m', '222', 'mm2']},
  {id: 'all', text: '全部 32 个点群'}
];
const axes = ['x', 'y', 'z'];
const labels = {
  'proper-1': '恒等操作',
  'proper-2': '二重正旋转',
  'proper-3': '三重正旋转',
  'proper-4': '四重正旋转',
  'proper-6': '六重正旋转',
  'improper-1': '反演',
  'improper-2': '镜面反射',
  'improper-3': '三重旋转反演',
  'improper-4': '四重旋转反演',
  'improper-6': '六重旋转反演'
};

function categoryName(category) {
  const [parity, order] = category.split('-');
  const symbol = parity === 'proper' ? order : Number(order) === 2 ? 'm' : '-' + order;
  return esc(labels[category]) + ' ' + crystalSpan(symbol, 'operation');
}

function caseDraft(initialCount) {
  return {visible: initialCount, totalKnown: false, operation: 0, axis: 0,
    initialGuess: '', answer: '', interpretation: '', operationGuess: '', operationChecked: false,
    reviewed: false, interpretationChecked: false, candidatesOpen: false, basisOpen: false, hintOpen: false};
}

function matrixHTML(matrix, caption) {
  return '<table class="pgi-matrix" data-math-ignore><caption class="sr-only">' + esc(caption) + '</caption><tbody>' +
    matrix.map(row => '<tr>' + row.map(value => '<td>' + countText(value) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table>';
}

// Axonometric view of the orthonormal coordinates used in the matrix.
function actionGraphic(before, after) {
  const project = ([x, y, z]) => [50 + 28 * (.82 * x - .64 * y), 64 + 33 * (.38 * x + .52 * y - .91 * z)];
  const point = vector => project(vector).map(value => value.toFixed(4)).join(',');
  const origin = point([0, 0, 0]);
  const rays = axes.map((axis, index) => {
    const vector = axes.map((_, i) => i === index ? 1.44 : 0);
    const [x, y] = project(vector);
    return '<polyline class="pgi-axis" points="' + origin + ' ' + point(vector) + '"/><text x="' +
      x.toFixed(4) + '" y="' + y.toFixed(4) + '">' + axis + '</text>';
  }).join('');
  const marker = (vector, kind, radius) => {
    const [x, y] = project(vector);
    return '<polyline class="pgi-' + kind + '" points="' + origin + ' ' + point(vector) +
      '"/><circle class="pgi-' + kind + '" cx="' + x.toFixed(4) + '" cy="' +
      y.toFixed(4) + '" r="' + radius + '"/>';
  };
  return '<svg class="pgi-graphic" viewBox="0 0 100 100" aria-hidden="true">' +
    rays + marker(before, 'before', 3.2) + marker(after, 'after', 1.7) + '</svg>';
}

function countTable(counts, complete) {
  return '<div class="pgi-counts" tabindex="0" role="region" aria-label="操作计数"><table><thead><tr>' +
    '<th scope="col">从矩阵读取的操作</th><th scope="col">' + (complete ? '完整计数' : '已观察数') +
    '</th></tr></thead><tbody>' + operationCategories.map(category =>
      '<tr><th scope="row">' + categoryName(category) + '</th><td class="pgi-number">' + counts[category] +
      '</td></tr>').join('') + '</tbody></table></div>';
}

function selectOption(value, label, selected) {
  return '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
}

function groupOptions(groups, atlasGroups, active) {
  const systems = new Map();
  for (const group of groups) {
    const system = atlasGroups.get(String(group.id))?.system ?? '晶体点群';
    if (!systems.has(system)) systems.set(system, []);
    systems.get(system).push(group);
  }
  return selectOption('', '请选择', active) + Array.from(systems, ([system, entries]) =>
    '<optgroup label="' + esc(system) + '">' + entries.map(group =>
      selectOption(String(group.id), nativeHm(group.hm) + ' · ' + group.schoenflies, active)).join('') +
    '</optgroup>').join('');
}

function operationFeedback(operation, guess) {
  const correct = guess === operation.category ? '判断正确。' : '再检查符号和旋转阶数。';
  const determinant = math('\\det(R)=' + operation.determinant);
  const trace = math('\\operatorname{tr}(R)=' + operation.trace);
  const operationOrder = math('R^{' + operation.order + '}=I');
  const rotation = operation.determinant === 1
    ? '直接求正旋转的阶。'
    : '先对矩阵取负，再求所得正旋转的阶。';
  return '<p><strong>' + correct + '</strong> ' + categoryName(operation.category) + '</p><p>' + determinant + ' · ' +
    trace + '</p><p>' + rotation + ' ' + '对应的旋转阶数' + ' · ' + operation.rotationOrder + '</p>' +
    '<p>' + '原操作首次回到恒等' + ' · ' + operationOrder + '</p>';
}

function interpretationFeedback(answer, complete) {
  if (complete) {
    return answer === 'exact'
      ? '判断正确。完整操作清单中的每一类计数都能用于比较，包括零。'
      : '清单已完整。可以比较每一类的确切计数，零也有判别作用。';
  }
  return answer === 'lower'
    ? '判断正确。未展示的操作仍可能增加某一类的计数。'
    : '清单仍是部分观察。当前零计数表示还未观察到，之后可能增加。';
}

function reviewFeedback(pick, target, evidence, knownOrder) {
  const name = groupName(pick);
  if (evidence.complete && String(pick.id) === String(target.id)) {
    return '<p><strong>分类正确。</strong> ' + name + '</p><p>它与全部十类操作的计数逐项一致。</p>';
  }
  const witness = operationCategories.find(category => evidence.complete
    ? evidence.counts[category] !== pick.counts[category]
    : evidence.counts[category] > pick.counts[category]);
  if (witness) {
    return '<p><strong>这项证据排除了所选点群。</strong> ' + name + '</p><dl><dt>' + categoryName(witness) +
      '</dt><dd>' + (evidence.complete ? '清单中共有' : '已经观察到') + ' ' + evidence.counts[witness] +
      ' · ' + '所选点群应有' + ' ' + pick.counts[witness] + '</dd></dl>' +
      (evidence.complete ? '<p>' + '完整计数匹配' + ' · ' + groupName(target) + '</p>' : '');
  }
  if (knownOrder !== null && pick.order !== knownOrder) {
    return '<p><strong>题目给出的群阶排除了所选点群。</strong> ' + name + '</p><p>' +
      '题目给出的群阶' + ' · ' + knownOrder + '　' + '所选点群的群阶' + ' · ' + pick.order + '</p>';
  }
  return '<p><strong>所选点群与目前证据相容。</strong> ' + name + '</p><p>' +
    '继续观察操作，再用完整计数核对。' + '</p>';
}

function inspectHTML(operations, geometry, before, after, operation, draft) {
  return '<section class="pgi-section" aria-labelledby="pgi-inspect-heading"><h4 id="pgi-inspect-heading">用矩阵跟踪一次操作</h4>' +
    '<p>选取坐标轴方向上的一个单位向量。矩阵中对应的一列给出该向量变换后的坐标。</p>' +
    '<div class="pgi-controls"><label for="pgi-operation">已观察的操作<select id="pgi-operation">' +
    operations.map((_, index) => selectOption(index, '操作 ' + pad(index + 1), draft.operation)).join('') + '</select></label>' +
    '<label for="pgi-axis">起始基向量<select id="pgi-axis">' +
    axes.map((axis, index) => selectOption(index, axis, draft.axis)).join('') + '</select></label></div>' +
    '<div class="pgi-action"><div>' + matrixHTML(geometry, '笛卡尔操作矩阵') +
    '<dl><dt>变换前</dt><dd class="pgi-number" data-math-ignore>' + vectorText(before) +
    '</dd><dt>变换后</dt><dd class="pgi-number" data-math-ignore>' + vectorText(after) + '</dd></dl></div>' +
    '<figure>' + actionGraphic(before, after) +
    '<figcaption><span class="pgi-key-before">变换前</span><span class="pgi-key-after">变换后</span></figcaption></figure></div>' +
    '<details id="pgi-basis" class="pgi-candidates"' + (draft.basisOpen ? ' open' : '') +
    '><summary>查看晶格基底中的精确矩阵</summary><p>上图采用正交笛卡尔基底，数字最多显示四位小数。下方的整数矩阵使用晶格基底。换基保留行列式、迹和操作的阶。</p>' +
    matrixHTML(operation.matrix, '晶格基底操作矩阵') + '</details>' +
    '<p>' + math('\\det(R)') + (operation.determinant === 1 ? ' 为正。试判断旋转阶数。' :
      ' 为负。先用反演消去负号，再判断剩下的旋转。') + '</p>' +
    '<details id="pgi-hint" class="pgi-candidates"' + (draft.hintOpen ? ' open' : '') +
    '><summary>怎样从矩阵读出旋转阶数？</summary>' +
    '<p>求正旋转矩阵三项对角元素之和。行列式为负时，先对原矩阵取负。</p>' +
    '<p>' + math('\\operatorname{tr}(R_+)=1+2\\cos\\theta') + '</p>' +
    '<p>对角元素之和依次为 3、−1、0、1、2 时，旋转阶数依次为 1、2、3、4、6。</p></details>' +
    '<label for="pgi-op-guess">判断这项操作<select id="pgi-op-guess">' +
    selectOption('', '请选择', draft.operationGuess) +
    operationCategories.map(category => selectOption(category, labels[category], draft.operationGuess)).join('') +
    '</select></label><div class="pgi-buttons">' +
    '<button class="secondary" type="button" id="pgi-op-check"' + (draft.operationGuess ? '' : ' disabled') +
    '>' + '核对这项操作' + '</button></div>' +
    (draft.operationChecked ? '<div class="pgi-feedback" tabindex="-1" id="pgi-op-feedback" role="status">' +
      operationFeedback(operation, draft.operationGuess) + '</div>' : '') + '</section>';
}

function evidenceHTML(evidence, operations, groupOrder, groups, draft) {
  const complete = evidence.complete;
  const interpretation = draft.interpretationChecked ? interpretationFeedback(draft.interpretation, complete) : '';
  return '<section class="pgi-section" aria-labelledby="pgi-count-heading"><h4 id="pgi-count-heading">逐项补齐操作证据</h4>' +
    '<p><strong>' + (complete ? '已展示全部操作。' : '目前展示了一部分操作。') + '</strong> ' +
    (complete ? '操作种类的零计数也可以用来排除候选。' : '表中的数值是已观察的下界。零表示这一类尚未出现。') + '</p>' +
    '<dl class="pgi-count-meta" tabindex="-1" id="pgi-count-summary"><dt>已展示的操作数</dt><dd>' + operations.length +
    '</dd><dt>题目给出的群阶</dt><dd>' + (groupOrder === null ? '尚未给出' : groupOrder) + '</dd><dt>当前候选数</dt><dd>' +
    evidence.candidateIds.length + '</dd></dl><div class="pgi-buttons">' +
    (complete ? '' : '<button class="secondary" type="button" id="pgi-next">查看下一项操作</button>' +
      '<button class="secondary" type="button" id="pgi-full">展开完整操作清单</button>' +
      (draft.totalKnown ? '' : '<button class="secondary" type="button" id="pgi-order">另外查看群阶</button>')) +
    '</div>' + countTable(evidence.counts, complete) +
    '<details class="pgi-candidates" id="pgi-candidates"' + (draft.candidatesOpen ? ' open' : '') +
    '><summary>查看当前候选点群</summary><ul>' + evidence.candidateIds.map(id =>
      '<li>' + groupName(groups.get(String(id))) + '</li>').join('') + '</ul></details>' +
    '<label for="pgi-interpretation">目前怎样使用计数表？<select id="pgi-interpretation">' +
    selectOption('', '请选择', draft.interpretation) +
    selectOption('lower', '把观察数当作各类操作数的下界', draft.interpretation) +
    selectOption('exact', '用完整计数逐类匹配，包括零计数', draft.interpretation) +
    '</select></label><div class="pgi-buttons">' +
    '<button class="secondary" type="button" id="pgi-interpret-check"' + (draft.interpretation ? '' : ' disabled') +
    '>' + '核对证据范围' + '</button></div>' +
    (interpretation ? '<p class="pgi-feedback" tabindex="-1" id="pgi-interpret-feedback" role="status">' +
      esc(interpretation) + '</p>' : '') + '</section>';
}

function reviewHTML(groups, target, evidence, groupOrder, options, draft) {
  return '<section class="pgi-section" aria-labelledby="pgi-match-heading"><h4 id="pgi-match-heading">判断点群</h4>' +
    '<label for="pgi-answer">根据当前证据选择点群<select id="pgi-answer">' + options + '</select></label>' +
    (draft.initialGuess ? '<p>' + '最初的猜测' + ' · ' + groupName(groups.get(draft.initialGuess)) + '</p>' : '') +
    '<div class="pgi-buttons"><button class="primary" type="button" id="pgi-review"' +
    (draft.answer ? '' : ' disabled') + '>' + '核对我的判断' + '</button></div>' +
    (draft.reviewed ? '<div class="pgi-feedback" tabindex="-1" id="pgi-review-feedback" role="status">' +
      reviewFeedback(groups.get(draft.answer), target, evidence, groupOrder) + '</div>' : '') +
    (draft.reviewed && evidence.complete ? '<div class="pgi-buttons"><button class="secondary" type="button" id="pgi-atlas">看匹配点群的特征标表 →</button>' +
      '<button class="secondary" type="button" id="pgi-lab">在操作实验中验证 →</button></div>' : '') +
    '<div class="pgi-buttons"><button class="secondary" type="button" id="pgi-new">换一道题</button></div></section>';
}

/**
 * Closing the disclosure retains its drafts. Detaching invalidates pending
 * catalog requests and UI callbacks.
 */
export function bindPointgroupIdentify({root, atlas, openGroup, stateStore, isCurrent}) {
  let disposed = false;
  let renderNumber = 0;
  const active = () => !disposed && isCurrent();
  const mounted = stateStore.get('pointgroup-identify-workshop') ?? {
    mode: modes[0].id, caseId: '', drafts: new Map()
  };
  stateStore.set('pointgroup-identify-workshop', mounted);
  const $ = selector => root.querySelector(selector);

  function on(id, event, fn, revision) {
    const element = $('#' + id);
    if (!element) return;
    element[event] = args => {
      if (active() && renderNumber === revision && $('#' + id) === element) fn(args);
    };
  }

  function draw(catalog, focusId) {
    if (!active()) return;
    const revision = ++renderNumber;
    const groups = new Map(catalog.groups.map(group => [String(group.id), group]));
    const atlasGroups = new Map(atlas.groups.map(group => [String(group.id), group]));
    const mode = modes.find(entry => entry.id === mounted.mode) ?? modes[0];
    const exerciseSymbol = exercise => groups.get(String(exercise.groupId)).hm;
    const exercises = catalog.exercises.filter(exercise =>
      !mode.symbols || mode.symbols.includes(groups.get(String(exercise.groupId)).hm));
    if (mode.id === 'compare') {
      exercises.sort((a, b) => mode.symbols.indexOf(exerciseSymbol(a)) - mode.symbols.indexOf(exerciseSymbol(b)));
    }
    const exercise = exercises.find(entry => entry.id === mounted.caseId) ?? exercises[0];
    if (!exercise) throw Error('点群题库缺少练习数据。');
    mounted.caseId = exercise.id;
    if (!mounted.drafts.has(exercise.id)) mounted.drafts.set(exercise.id, caseDraft(exercise.initialCount));
    const draft = mounted.drafts.get(exercise.id);
    const target = groups.get(String(exercise.groupId));
    const operations = target.operations.slice(0, draft.visible);
    const complete = operations.length === target.operations.length;
    const groupOrder = draft.totalKnown || complete ? target.order : null;
    const evidence = analyzeEvidence(catalog.groups, operations, {complete, groupOrder});
    if (complete && (!evidence.validComplete || evidence.candidateIds.length !== 1 ||
        String(evidence.candidateIds[0]) !== String(target.id))) throw Error('点群题库的操作证据不一致。');
    const operation = evidence.entries[draft.operation];
    const geometry = operations[draft.operation].cartesianMatrix;
    const before = axes.map((_, i) => i === draft.axis ? 1 : 0);
    const after = geometry.map(row => row[draft.axis]);
    const options = groupOptions(catalog.groups, atlasGroups, draft.initialGuess);
    const answerOptions = groupOptions(catalog.groups, atlasGroups, draft.answer);

    root.innerHTML = '<div class="pgi-workshop"><div class="pgi-section"><div class="pgi-controls">' +
      '<label for="pgi-mode">题组<select id="pgi-mode">' +
      modes.map(entry => selectOption(entry.id, entry.text, mode.id)).join('') + '</select></label>' +
      '<label for="pgi-case">未知点群<select id="pgi-case">' +
      exercises.map(entry => selectOption(entry.id, '练习 ' + pad(catalog.exercises.indexOf(entry) + 1), exercise.id)).join('') +
      '</select></label></div>' +
      '<label for="pgi-predict">先猜一个点群<select id="pgi-predict">' + options + '</select></label>' +
      '<p>先留下猜测，再用矩阵和操作计数核对。每题从同一个点群中展示不同数量的操作。</p></div>' +
      inspectHTML(operations, geometry, before, after, operation, draft) +
      evidenceHTML(evidence, operations, groupOrder, groups, draft) +
      reviewHTML(groups, target, evidence, groupOrder, answerOptions, draft) + '</div>';

    const redraw = id => draw(catalog, id);
    const select = (id, callback) => on(id, 'onchange', event => {
      callback(event.target.value);
      redraw(id);
    }, revision);
    const click = (id, callback, nextId = id) => on(id, 'onclick', () => {
      callback();
      if (nextId) redraw(nextId);
    }, revision);
    const reveal = next => {
      draft.visible = Math.min(next, target.operations.length);
      draft.reviewed = false;
      draft.interpretationChecked = false;
    };

    select('pgi-mode', value => { mounted.mode = value; mounted.caseId = ''; });
    select('pgi-case', value => { mounted.caseId = value; });
    select('pgi-predict', value => {
      if (draft.answer === draft.initialGuess) draft.answer = value;
      draft.initialGuess = value;
      draft.reviewed = false;
    });
    select('pgi-operation', value => {
      draft.operation = Number(value);
      draft.operationGuess = '';
      draft.operationChecked = false;
    });
    select('pgi-axis', value => { draft.axis = Number(value); });
    select('pgi-op-guess', value => { draft.operationGuess = value; draft.operationChecked = false; });
    click('pgi-op-check', () => { if (draft.operationGuess) draft.operationChecked = true; }, 'pgi-op-feedback');
    click('pgi-next', () => reveal(draft.visible + 1), 'pgi-count-summary');
    click('pgi-full', () => reveal(target.operations.length), 'pgi-count-summary');
    click('pgi-order', () => { draft.totalKnown = true; draft.reviewed = false; }, 'pgi-count-summary');
    on('pgi-candidates', 'ontoggle', event => { draft.candidatesOpen = event.target.open; }, revision);
    on('pgi-basis', 'ontoggle', event => { draft.basisOpen = event.target.open; }, revision);
    on('pgi-hint', 'ontoggle', event => { draft.hintOpen = event.target.open; }, revision);
    select('pgi-interpretation', value => { draft.interpretation = value; draft.interpretationChecked = false; });
    click('pgi-interpret-check', () => { if (draft.interpretation) draft.interpretationChecked = true; }, 'pgi-interpret-feedback');
    select('pgi-answer', value => { draft.answer = value; draft.reviewed = false; });
    click('pgi-review', () => { if (draft.answer) draft.reviewed = true; }, 'pgi-review-feedback');
    click('pgi-atlas', () => openGroup(String(exercise.groupId), 'atlas'), null);
    click('pgi-lab', () => openGroup(String(exercise.groupId), 'lab'), null);
    click('pgi-new', () => { mounted.caseId = exercises[(exercises.indexOf(exercise) + 1) % exercises.length].id; }, 'pgi-case');
    if (focusId) $('#' + focusId)?.focus?.({preventScroll: true});
  }

  function start() {
    if (!active()) return;
    root.innerHTML = '<p role="status">正在读取点群题库…</p>';
    loadCatalog().then(catalog => draw(catalog)).catch(() => {
      if (!active()) return;
      catalogPromise = null;
      const revision = ++renderNumber;
      root.innerHTML = '<p role="alert">点群题库无法载入，请重试。</p>' +
        '<button class="secondary" type="button" id="pgi-retry">重新读取题库</button>';
      on('pgi-retry', 'onclick', start, revision);
    });
  }

  start();
  return () => { disposed = true; };
}
