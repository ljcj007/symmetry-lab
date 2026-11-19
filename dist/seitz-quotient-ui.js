import {crystalSpan, hmTex} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {createGroupLoader} from './resource-loader.js?v=20261111-demos1';
import {analyzeSeitzGroup, inspectPair, traceSeitzPower} from './seitz-quotient-core.js?v=20261119-seitz1';

const groupLoader = createGroupLoader();
const scenarios = [
  {id: 'screw', label: '二重旋转与二重螺旋', numbers: [3, 4], axis: 2},
  {id: 'glide', label: '镜面与滑移面', numbers: [6, 7], axis: 0}
];
const basePoint = [1, 2, 3];
const axes = ['x', 'y', 'z'];
const guesses = [
  ['', '请选择'],
  ['first', '只有左边走到平移副本'],
  ['second', '只有右边走到平移副本'],
  ['both', '两边都走到平移副本'],
  ['neither', '两边都回到原坐标']
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const math = tex => '<span class="sl-math">' + mathHTML(tex) + '</span>';
const sgSymbol = group => crystalSpan(group.symbol, 'hm');
const opSymbol = name => crystalSpan(name, 'operation');
const selectOption = (value, label, selected) => '<option value="' + esc(value) +
  '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>';
function asNativeSymbol(symbol) {
  const tex = hmTex(symbol);
  if (!tex) return symbol;
  return tex.replace(/\\mathrm\{([A-Za-z])\}/g, '$1')
    .replace(/\\overline\{([1346])\}/g, '$1\u0304')
    .replace(/_\{([0-9])\}/g, (_, n) => '₀₁₂₃₄₅₆₇₈₉'[Number(n)])
    .replace(/\\,/g, ' ');
}
const renderButton = (id, label, {primary = false, disabled = false} = {}) =>
  '<button id="' + id + '" class="' + (primary ? 'primary' : 'secondary') +
  '" type="button"' + (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>';

function fraction(value, denominator = 12, latex = true) {
  if (value % denominator === 0) return String(value / denominator);
  let divisor = denominator;
  while (value % divisor !== 0 || denominator % divisor !== 0) divisor--;
  const numerator = Math.abs(value) / divisor;
  const bottom = denominator / divisor;
  const sign = value < 0 ? '-' : '';
  return sign + (latex ? '\\frac{' + numerator + '}{' + bottom + '}' : numerator + '/' + bottom);
}

const vectorMath = (vector, denominator = 12) => math('(' +
  vector.map(value => fraction(value, denominator)).join(',\\,') + ')');
const coordinateLabel = (name, vector, denominator = 12) =>
  math(name + '=(' + vector.map(value => fraction(value, denominator)).join(',\\,') + ')');
const applyRotation = (rotation, vector) =>
  rotation.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));
const endpoint = (step, x = basePoint) =>
  applyRotation(step.rotation, x).map((value, i) => value + step.translationTwelfths[i]);
const phaseMath = phase => math(phase.re === 0 ? (phase.im < 0 ? '-i' : 'i') : String(phase.re));
const kValue = kQuarter => kQuarter.map(value => value / 4);
const nonzero = shift => shift.some(value => value !== 0);
const sourceOperation = op => opSymbol(op.name) + ' · ' + coordinateLabel('t', op.translationTwelfths);

function phaseFormula() {
  return math('T_L\\psi(\\mathbf{r})=\\psi(\\mathbf{r}-L)') + ' · ' +
    math('T_L\\psi_{\\mathbf{k}}=e^{-2\\pi i\\,\\mathbf{k}\\cdot L}\\psi_{\\mathbf{k}}');
}

function coordinateNote() {
  return '<p>' +
    '坐标和位移采用 BC 原胞的分数坐标，波矢采用同一原胞的倒易分数坐标。整数位移表示原胞之间的平移。' +
    '</p>';
}

function sourceSetting(group) {
  return group.bcSymbol && group.bcSymbol !== group.symbol
    ? '<p>' + '本题的 BC 设置' + ' · ' + crystalSpan(group.bcSymbol, 'hm') + '</p>'
    : '';
}

function exactTable(label, headers, rows) {
  return '<div class="sq-scroll" tabindex="0" role="region" aria-label="' + esc(label) + '">' +
    '<table><caption class="sr-only">' + esc(label) + '</caption><thead><tr>' +
    headers.map(title => '<th scope="col">' + esc(title) + '</th>').join('') +
    '</tr></thead><tbody>' + rows.map(([title, ...cells]) =>
      '<tr><th scope="row">' + title + '</th>' + cells.map(value => '<td>' + value + '</td>').join('') +
      '</tr>').join('') + '</tbody></table></div>';
}

function powerTable(trace) {
  return exactTable('逐次作用记录', ['操作次数', '累计分数位移', '不折回晶胞的坐标'],
    trace.steps.map(step => [step.power, vectorMath(step.translationTwelfths), vectorMath(endpoint(step))]));
}

function starterDiagram(trace, axis) {
  const coordinates = [basePoint[axis], ...trace.steps.map(step => endpoint(step)[axis])];
  const labels = ['起点', '第一次', '第二次'];
  return '<figure class="sq-fraction-line"><figcaption>' + '沿平移方向的位置' + ' · ' + math(axes[axis]) +
    '</figcaption><div aria-hidden="true" class="sq-scale"><span>0</span><span>1</span><span>2</span></div>' +
    coordinates.map((value, i) => '<div class="sq-track-row"><span>' + esc(labels[i]) + '</span>' +
      '<div class="sq-track" aria-hidden="true"><i style="--sq-position:' + (100 * value / 24).toFixed(4) + '%"></i></div>' +
      '<span>' + math(fraction(value)) + '</span></div>').join('') + '</figure>';
}

function momentumOptions(value) {
  return [0, 1, 2, -1, -2].map(v => selectOption(v, fraction(v, 4, false), value)).join('');
}

function starterK(scenario, draft) {
  return axes.map((_, i) => i === scenario.axis ? draft.k : 0);
}

function scenarioStatement(scenario) {
  const rotation = scenario.id === 'screw' ? '每组取同一个二重旋转部分。' : '每组取同一个镜面反射部分。';
  const symbols = scenario.id === 'screw' ? ['P2', 'P2_1'] : ['Pm', 'Pc'];
  return '<p>' + crystalSpan(symbols[0], 'hm') + ' / ' + crystalSpan(symbols[1], 'hm') + '</p><p>' +
    rotation + ' ' + '从同一个点出发，连续作用两次。哪一边到达不同晶胞中的同一对应位置？' + '</p>';
}

function starterAnswer(rows, selected) {
  const [first, second] = rows.map(row => nonzero(row.trace.steps.at(-1).latticeShift));
  const expected = first && second ? 'both' : first ? 'first' : second ? 'second' : 'neither';
  return selected === expected
    ? '预测正确。请比较两边第二步的原胞平移。'
    : '再看两边第二步的坐标。整数分量的差说明它们落在哪一个晶胞。';
}

function starterResult(rows, draft, kQuarter, axis) {
  return '<div id="sq-starter-result" tabindex="-1" class="sq-result"><p class="sq-feedback" role="status">' +
    esc(starterAnswer(rows, draft.guess)) + '</p><p>' + '共同起点' + ' · ' +
    coordinateLabel('x_0', basePoint) + '</p><div class="sq-results-grid">' +
    rows.map(({source, analysis, trace}) => {
      const square = trace.steps.at(-1);
      return '<section class="sq-case"><h5>' + sgSymbol(source) + ' · ' + '空间群' + ' ' +
        analysis.groupNumber + '</h5>' + sourceSetting(source) + '<p>' + '平移取商得到的点群' + ' · ' +
        crystalSpan(analysis.pointGroup, 'schoenflies') + '</p><p>' + sourceOperation(analysis.operations[trace.operationIndex]) +
        '</p>' + starterDiagram(trace, axis) + powerTable(trace) + '<p>' + '第二步留下的原胞平移' + ' · ' +
        coordinateLabel('L', square.latticeShift, 1) + '</p><p>' + '平移在当前波矢的相位' + ' · ' +
        phaseMath(square.phase) + '</p></section>';
    }).join('') + '</div><p>' + '当前波矢' + ' · ' + coordinateLabel('\\mathbf{k}', kQuarter, 4) +
    '</p><p>' + '采用主动平移约定' + ' · ' + phaseFormula() + '</p></div>';
}

function starterHTML(scenario, draft, {pending, error, rows}) {
  const kQuarter = starterK(scenario, draft);
  return '<section class="sq-section" aria-labelledby="sq-starter-heading"><h4 id="sq-starter-heading">先比较两种熟悉的操作</h4>' +
    '<label for="sq-scenario">比较题<select id="sq-scenario">' +
    scenarios.map(item => selectOption(item.id, item.label, scenario.id)).join('') + '</select></label>' +
    scenarioStatement(scenario) + coordinateNote() +
    '<label for="sq-guess">我的预测<select id="sq-guess">' +
    guesses.map(([value, label]) => selectOption(value, label, draft.guess)).join('') + '</select></label>' +
    '<label for="sq-starter-k">' + '沿平移方向的波矢分量' + ' · ' + math('k_' + axes[scenario.axis]) +
    '<select id="sq-starter-k">' + momentumOptions(draft.k) + '</select></label>' +
    '<div class="sq-actions">' + renderButton('sq-check-prediction', '核对预测并显示两次作用', {
      primary: true, disabled: !draft.guess || pending
    }) + '</div>' +
    (pending ? '<p role="status">正在读取空间群操作…</p>' : '') +
    (error ? '<p role="alert">空间群操作暂时无法读取，请重试。</p>' : '') +
    (rows ? starterResult(rows, draft, kQuarter, scenario.axis) : '') + '</section>';
}

function matrixMath(matrix) {
  return math('\\begin{pmatrix}' + matrix.map(row => row.join('&')).join('\\\\') + '\\end{pmatrix}');
}

function pairResult(source, analysis, draft) {
  const kQuarter = draft.kQuarter;
  const pair = inspectPair(analysis, draft.left, draft.right, {kQuarter});
  const later = analysis.operations[pair.leftIndex];
  const earlier = analysis.operations[pair.rightIndex];
  const representative = analysis.operations[pair.representativeIndex];
  const trace = traceSeitzPower(analysis, pair.rightIndex, {kQuarter});
  const final = trace.steps.at(-1);
  const rows = [
    ['后作用的分数位移', vectorMath(later.translationTwelfths)],
    ['先作用的位移再经过后操作的旋转', vectorMath(applyRotation(later.rotation, earlier.translationTwelfths))],
    ['复合后得到的完整位移', vectorMath(pair.translationTwelfths)],
    ['目录中同线性部分的代表元位移', vectorMath(representative.translationTwelfths)],
    ['两者之差的整数平移', vectorMath(pair.latticeShift, 1)]
  ];

  return '<div id="sq-product-result" tabindex="-1" class="sq-result"><h5>按顺序复合两次作用</h5>' +
    '<p>' + '先作用' + ' · ' + math('g_B') + ' · ' + sourceOperation(earlier) + '</p><p>' +
    '后作用' + ' · ' + math('g_A') + ' · ' + sourceOperation(later) + '</p>' +
    '<p class="sq-formula">' + math('\\{R_A\\mid t_A\\}\\{R_B\\mid t_B\\}=\\{R_AR_B\\mid t_A+R_At_B\\}') +
    '</p><p>' + '复合后的线性部分' + ' · ' + matrixMath(pair.rotation) + '</p>' +
    exactTable('完整位移、代表元位移和差值', ['计算步骤', '分数坐标'], rows.map(([label, value]) => [esc(label), value])) +
    '<p>' + '不折回晶胞时的坐标路径' + ' · ' + vectorMath(basePoint) + ' → ' +
    vectorMath(endpoint(earlier)) + ' → ' + vectorMath(endpoint(pair)) + '</p>' +
    '<p>' + '目录代表元' + ' · ' + sourceOperation(representative) + '</p><p>' +
    '完整复合等于先作用目录代表元，再平移整数向量。' + ' ' + math('g_Ag_B=T_Lg_{\\mathrm{rep}}') + '</p><p>' +
    '平移取商得到的点群' + ' · ' + crystalSpan(analysis.pointGroup, 'schoenflies') + '　' +
    '不同的线性部分数' + ' · ' + analysis.operations.length + '</p><p>' +
    '当前波矢' + ' · ' + coordinateLabel('\\mathbf{k}', kQuarter, 4) + '</p><p>' +
    '整数平移带来的相位' + ' · ' + phaseMath(pair.phase) + '</p><p>' +
    '采用主动平移约定' + ' · ' + phaseFormula() + '</p><p>' +
    (pair.fixesMomentum
      ? '两个因子都把当前波矢保持到相差一个倒易格矢。可以在这个波矢上读取平移因子。'
      : '至少一个因子把当前波矢变到不同的倒易等价类。上面的相位是整数平移对当前波矢的作用。') +
    '</p><h5>反复作用先选的操作</h5><p>' + '从同一个点开始，逐次作用先执行的操作，直到线性部分首次回到恒等。' +
    ' ' + coordinateLabel('x_0', basePoint) + '</p>' + powerTable(trace) + '<p>' +
    '此时的原胞平移及其相位' + ' · ' + coordinateLabel('L', final.latticeShift, 1) +
    ' · ' + phaseMath(final.phase) + '</p>' + sourceSetting(source) +
    '<div class="sq-actions">' + renderButton('sq-open-calculation', '把空间群和波矢带到计算中心 →') + '</div></div>';
}

function advancedHTML(draft, {database, source, analysis, loading, error}) {
  const label = '试做任意空间群的精确复合';
  let body = '<p>' + '从 230 个普通空间群中选一个。两次操作按先后顺序作用在同一个点上。' + '</p>' +
    coordinateNote();
  if (!database) {
    body += loading ? '<p role="status">正在读取空间群操作…</p>' :
      (error ? '<p role="alert">空间群操作暂时无法读取，请重试。</p>' : '') +
      renderButton('sq-load', '读取空间群目录');
  } else {
    const ops = source.operations;
    const opOptions = index => ops.map((op, i) => selectOption(i, (i + 1) + ' · ' + op.name, index)).join('');
    body += '<label for="sq-space-group">空间群<select id="sq-space-group">' +
      database.groups.map(group => selectOption(group.number, group.number + ' · ' + asNativeSymbol(group.symbol), draft.number)).join('') +
      '</select></label>' + sourceSetting(source) + '<div class="sq-controls">' +
      '<label for="sq-apply-first">先作用<select id="sq-apply-first">' + opOptions(draft.right) + '</select></label>' +
      '<label for="sq-apply-second">后作用<select id="sq-apply-second">' + opOptions(draft.left) + '</select></label></div>' +
      '<div class="sq-actions">' + renderButton('sq-swap', '交换两个操作') + '</div>' +
      '<fieldset class="sq-k-grid"><legend>倒易分数波矢</legend>' +
      axes.map((axis, i) => '<label for="sq-k-' + axis + '">' + math('k_' + axis) +
        '<select id="sq-k-' + axis + '" aria-label="k' + axis + '">' + momentumOptions(draft.kQuarter[i]) +
        '</select></label>').join('') + '</fieldset>' +
      '<div class="sq-actions">' + renderButton('sq-show-product', '计算这两个操作的复合', {primary: true}) + '</div>' +
      (analysis && draft.shown ? pairResult(source, analysis, draft) : '');
  }
  return '<details id="sq-tabs" class="sq-section sq-depth"' + (draft.open ? ' open' : '') + '><summary id="sq-more">' +
    esc(label) + '</summary>' + (draft.open ? body : '') + '</details>';
}

function starterDraft() {
  return {guess: '', shown: false, k: 2};
}

function initialState() {
  return {
    scenario: scenarios[0].id,
    starter: {screw: starterDraft(), glide: starterDraft()},
    advanced: {number: 4, left: 1, right: 1, kQuarter: [0, 0, 2], open: false, shown: false}
  };
}

export function bindSeitzQuotient({root, stateStore, isCurrent, openGroup}) {
  const storeKey = 'seitz-quotient-workshop';
  const state = stateStore.get(storeKey) ?? initialState();
  stateStore.set(storeKey, state);
  const advanced = state.advanced;
  let disposed = false;
  let revision = 0;
  let database = groupLoader.peek('sg');
  const starterPending = new Set();
  let advancedPending = false;
  const starterErrors = new Set();
  let advancedError = false;
  const analyses = new Map();
  const active = () => !disposed && isCurrent();
  const $ = id => root.querySelector('#' + id);

  function sourceGroup(number) {
    return database?.groups.find(group => group.number === number);
  }

  function analysisFor(source) {
    const number = source.number;
    if (analyses.has(number)) return analyses.get(number);
    const analysis = analyzeSeitzGroup(source);
    if (analyses.size >= 5) analyses.delete(analyses.keys().next().value);
    analyses.set(number, analysis);
    return analysis;
  }

  function rowsFor(scenario, draft) {
    return scenario.numbers.map(number => {
      const source = sourceGroup(number);
      const analysis = analysisFor(source);
      return {
        source, analysis,
        trace: traceSeitzPower(analysis, 1, {kQuarter: starterK(scenario, draft)})
      };
    });
  }

  function draw(focusId) {
    if (!active()) return;
    const current = ++revision;
    const scenario = scenarios.find(item => item.id === state.scenario) ?? scenarios[0];
    const draft = state.starter[scenario.id];
    const source = sourceGroup(advanced.number);
    const analysis = advanced.open && advanced.shown && source ? analysisFor(source) : null;
    const rows = draft.shown && database ? rowsFor(scenario, draft) : null;
    root.innerHTML = '<div class="sq-workshop">' + starterHTML(scenario, draft, {
      pending: starterPending.has(scenario.id), error: starterErrors.has(scenario.id), rows
    }) + advancedHTML(advanced, {database, source, analysis, loading: advancedPending, error: advancedError}) + '</div>';

    function on(id, event, run) {
      const element = $(id);
      if (!element) return;
      element[event] = args => {
        if (active() && current === revision && $(id) === element) return run(args);
      };
    }
    function select(id, change) {
      on(id, 'onchange', event => {
        change(event.target.value);
        draw(id);
      });
    }
    select('sq-scenario', value => { state.scenario = value; });
    select('sq-guess', value => { draft.guess = value; draft.shown = false; });
    select('sq-starter-k', value => { draft.k = Number(value); });
    on('sq-check-prediction', 'onclick', async () => {
      if (!draft.guess || starterPending.has(scenario.id)) return;
      const guess = draft.guess;
      starterPending.add(scenario.id);
      starterErrors.delete(scenario.id);
      draw();
      try {
        database = await groupLoader.get('sg');
        if (!active() || guess !== draft.guess) return;
        rowsFor(scenario, draft);
        draft.shown = true;
      } catch {
        if (active()) starterErrors.add(scenario.id);
      } finally {
        starterPending.delete(scenario.id);
        draw(state.scenario === scenario.id ? (draft.shown ? 'sq-starter-result' : 'sq-check-prediction') : null);
      }
    });

    on('sq-tabs', 'ontoggle', event => {
      const open = event.target.open;
      if (open === advanced.open) return;
      advanced.open = open;
      if (open && !database) return loadAdvanced();
      draw('sq-more');
    });
    on('sq-load', 'onclick', loadAdvanced);
    select('sq-space-group', value => {
      advanced.number = Number(value);
      advanced.left = advanced.right = sourceGroup(advanced.number).operations.length > 1 ? 1 : 0;
      advanced.shown = false;
    });
    select('sq-apply-first', value => { advanced.right = Number(value); advanced.shown = false; });
    select('sq-apply-second', value => { advanced.left = Number(value); advanced.shown = false; });
    on('sq-swap', 'onclick', () => {
      [advanced.left, advanced.right] = [advanced.right, advanced.left];
      advanced.shown = false;
      draw('sq-swap');
    });
    axes.forEach((axis, i) => select('sq-k-' + axis, value => { advanced.kQuarter[i] = Number(value); }));
    on('sq-show-product', 'onclick', () => {
      advanced.shown = true;
      draw('sq-product-result');
    });
    on('sq-open-calculation', 'onclick', () =>
      openGroup(advanced.number, {k: kValue(advanced.kQuarter)}));
    if (focusId) $(focusId)?.focus?.({preventScroll: true});
  }

  async function loadAdvanced() {
    if (advancedPending || database) return;
    advancedPending = true;
    advancedError = false;
    draw();
    try {
      database = await groupLoader.get('sg');
    } catch {
      advancedError = true;
    } finally {
      advancedPending = false;
      draw(advanced.open && database ? 'sq-space-group' : null);
    }
  }

  if (advanced.open && !database) loadAdvanced();
  else draw();
  return () => { disposed = true; };
}
