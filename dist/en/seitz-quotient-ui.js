import {crystalSpan, hmTex} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {createGroupLoader} from './resource-loader.js?v=20261111-demos1';
import {analyzeSeitzGroup, inspectPair, traceSeitzPower} from './seitz-quotient-core.js?v=20261119-seitz1';

const groupLoader = createGroupLoader();
const scenarios = [
  {id: 'screw', label: "Twofold rotation and twofold screw", numbers: [3, 4], axis: 2},
  {id: 'glide', label: "Mirror and glide plane", numbers: [6, 7], axis: 0}
];
const basePoint = [1, 2, 3];
const axes = ['x', 'y', 'z'];
const guesses = [
  ['', "Choose an answer"],
  ['first', "Only the left reaches a translated copy"],
  ['second', "Only the right reaches a translated copy"],
  ['both', "Both reach translated copies"],
  ['neither', "Both return to the starting coordinates"]
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
    "Positions and displacements use fractional coordinates in the BC primitive cell. Wavevectors use the reciprocal fractional coordinates of the same cell. Integer displacements translate between cells." +
    '</p>';
}

function sourceSetting(group) {
  return group.bcSymbol && group.bcSymbol !== group.symbol
    ? '<p>' + "BC setting for this exercise" + ' · ' + crystalSpan(group.bcSymbol, 'hm') + '</p>'
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
  return exactTable("Repeated operation steps", ["Applications", "Accumulated fractional translation", "Unwrapped coordinates"],
    trace.steps.map(step => [step.power, vectorMath(step.translationTwelfths), vectorMath(endpoint(step))]));
}

function starterDiagram(trace, axis) {
  const coordinates = [basePoint[axis], ...trace.steps.map(step => endpoint(step)[axis])];
  const labels = ["Start", "First", "Second"];
  return '<figure class="sq-fraction-line"><figcaption>' + "Position along the translation direction" + ' · ' + math(axes[axis]) +
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
  const rotation = scenario.id === 'screw' ? "Use the same twofold rotation part for both groups." : "Use the same reflection part for both groups.";
  const symbols = scenario.id === 'screw' ? ['P2', 'P2_1'] : ['Pm', 'Pc'];
  return '<p>' + crystalSpan(symbols[0], 'hm') + ' / ' + crystalSpan(symbols[1], 'hm') + '</p><p>' +
    rotation + ' ' + "Start at the same point and apply each operation twice. Which side lands at the corresponding position in another cell?" + '</p>';
}

function starterAnswer(rows, selected) {
  const [first, second] = rows.map(row => nonzero(row.trace.steps.at(-1).latticeShift));
  const expected = first && second ? 'both' : first ? 'first' : second ? 'second' : 'neither';
  return selected === expected
    ? "Correct. Compare the cell translations left after the second step."
    : "Check the coordinates after the second step. Their integer difference shows how the two endpoints are displaced between cells.";
}

function starterResult(rows, draft, kQuarter, axis) {
  return '<div id="sq-starter-result" tabindex="-1" class="sq-result"><p class="sq-feedback" role="status">' +
    esc(starterAnswer(rows, draft.guess)) + '</p><p>' + "Shared starting point" + ' · ' +
    coordinateLabel('x_0', basePoint) + '</p><div class="sq-results-grid">' +
    rows.map(({source, analysis, trace}) => {
      const square = trace.steps.at(-1);
      return '<section class="sq-case"><h5>' + sgSymbol(source) + ' · ' + "space group" + ' ' +
        analysis.groupNumber + '</h5>' + sourceSetting(source) + '<p>' + "Point group after quotienting translations" + ' · ' +
        crystalSpan(analysis.pointGroup, 'schoenflies') + '</p><p>' + sourceOperation(analysis.operations[trace.operationIndex]) +
        '</p>' + starterDiagram(trace, axis) + powerTable(trace) + '<p>' + "Cell translation after the second step" + ' · ' +
        coordinateLabel('L', square.latticeShift, 1) + '</p><p>' + "Translation phase at the selected wavevector" + ' · ' +
        phaseMath(square.phase) + '</p></section>';
    }).join('') + '</div><p>' + "Selected wavevector" + ' · ' + coordinateLabel('\\mathbf{k}', kQuarter, 4) +
    '</p><p>' + "Active translation convention" + ' · ' + phaseFormula() + '</p></div>';
}

function starterHTML(scenario, draft, {pending, error, rows}) {
  const kQuarter = starterK(scenario, draft);
  return "<section class=\"sq-section\" aria-labelledby=\"sq-starter-heading\"><h4 id=\"sq-starter-heading\">Compare two familiar operations</h4>" +
    "<label for=\"sq-scenario\">Comparison exercise<select id=\"sq-scenario\">" +
    scenarios.map(item => selectOption(item.id, item.label, scenario.id)).join('') + '</select></label>' +
    scenarioStatement(scenario) + coordinateNote() +
    "<label for=\"sq-guess\">My prediction<select id=\"sq-guess\">" +
    guesses.map(([value, label]) => selectOption(value, label, draft.guess)).join('') + '</select></label>' +
    '<label for="sq-starter-k">' + "Wavevector component along the translation direction" + ' · ' + math('k_' + axes[scenario.axis]) +
    '<select id="sq-starter-k">' + momentumOptions(draft.k) + '</select></label>' +
    '<div class="sq-actions">' + renderButton('sq-check-prediction', "Check the prediction and show both steps", {
      primary: true, disabled: !draft.guess || pending
    }) + '</div>' +
    (pending ? "<p role=\"status\">Loading space-group operations…</p>" : '') +
    (error ? "<p role=\"alert\">The space-group operations could not be loaded. Please try again.</p>" : '') +
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
    ["Fractional translation of the later operation", vectorMath(later.translationTwelfths)],
    ["Earlier translation transformed by the later linear part", vectorMath(applyRotation(later.rotation, earlier.translationTwelfths))],
    ["Full translation after composition", vectorMath(pair.translationTwelfths)],
    ["Catalogue representative translation for the same linear part", vectorMath(representative.translationTwelfths)],
    ["Integer translation between them", vectorMath(pair.latticeShift, 1)]
  ];

  return "<div id=\"sq-product-result\" tabindex=\"-1\" class=\"sq-result\"><h5>Compose two operations in order</h5>" +
    '<p>' + "Apply first" + ' · ' + math('g_B') + ' · ' + sourceOperation(earlier) + '</p><p>' +
    "Apply second" + ' · ' + math('g_A') + ' · ' + sourceOperation(later) + '</p>' +
    '<p class="sq-formula">' + math('\\{R_A\\mid t_A\\}\\{R_B\\mid t_B\\}=\\{R_AR_B\\mid t_A+R_At_B\\}') +
    '</p><p>' + "Linear part of the product" + ' · ' + matrixMath(pair.rotation) + '</p>' +
    exactTable("Full translation, representative translation and their difference", ["Calculation step", "fractional coordinates"], rows.map(([label, value]) => [esc(label), value])) +
    '<p>' + "Coordinate path across cells" + ' · ' + vectorMath(basePoint) + ' → ' +
    vectorMath(endpoint(earlier)) + ' → ' + vectorMath(endpoint(pair)) + '</p>' +
    '<p>' + "Catalogue representative" + ' · ' + sourceOperation(representative) + '</p><p>' +
    "The full product applies the catalogue representative first and then translates by an integer vector." + ' ' + math('g_Ag_B=T_Lg_{\\mathrm{rep}}') + '</p><p>' +
    "Point group after quotienting translations" + ' · ' + crystalSpan(analysis.pointGroup, 'schoenflies') + '　' +
    "Number of distinct linear parts" + ' · ' + analysis.operations.length + '</p><p>' +
    "Selected wavevector" + ' · ' + coordinateLabel('\\mathbf{k}', kQuarter, 4) + '</p><p>' +
    "Phase from the integer translation" + ' · ' + phaseMath(pair.phase) + '</p><p>' +
    "Active translation convention" + ' · ' + phaseFormula() + '</p><p>' +
    (pair.fixesMomentum
      ? "Both factors preserve the wavevector up to reciprocal lattice vectors. The translation factor applies within this wavevector sector."
      : "At least one factor takes the wavevector to a different reciprocal equivalence class. The phase above is the action of the integer translation at the selected wavevector.") +
    "</p><h5>Repeat the first operation</h5><p>" + "Start at the same point and repeat the first operation until its linear part first returns to the identity." +
    ' ' + coordinateLabel('x_0', basePoint) + '</p>' + powerTable(trace) + '<p>' +
    "Resulting cell translation and phase" + ' · ' + coordinateLabel('L', final.latticeShift, 1) +
    ' · ' + phaseMath(final.phase) + '</p>' + sourceSetting(source) +
    '<div class="sq-actions">' + renderButton('sq-open-calculation', "Open this group and wavevector in the calculation center →") + '</div></div>';
}

function advancedHTML(draft, {database, source, analysis, loading, error}) {
  const label = "Compose operations in any space group";
  let body = '<p>' + "Choose one of the 230 ordinary space groups. Apply two operations in order to a single point." + '</p>' +
    coordinateNote();
  if (!database) {
    body += loading ? "<p role=\"status\">Loading space-group operations…</p>" :
      (error ? "<p role=\"alert\">The space-group operations could not be loaded. Please try again.</p>" : '') +
      renderButton('sq-load', "Load the space-group catalogue");
  } else {
    const ops = source.operations;
    const opOptions = index => ops.map((op, i) => selectOption(i, (i + 1) + ' · ' + op.name, index)).join('');
    body += "<label for=\"sq-space-group\">space group<select id=\"sq-space-group\">" +
      database.groups.map(group => selectOption(group.number, group.number + ' · ' + asNativeSymbol(group.symbol), draft.number)).join('') +
      '</select></label>' + sourceSetting(source) + '<div class="sq-controls">' +
      "<label for=\"sq-apply-first\">Apply first<select id=\"sq-apply-first\">" + opOptions(draft.right) + '</select></label>' +
      "<label for=\"sq-apply-second\">Apply second<select id=\"sq-apply-second\">" + opOptions(draft.left) + '</select></label></div>' +
      '<div class="sq-actions">' + renderButton('sq-swap', "Swap the operation order") + '</div>' +
      "<fieldset class=\"sq-k-grid\"><legend>Wavevector in reciprocal fractional coordinates</legend>" +
      axes.map((axis, i) => '<label for="sq-k-' + axis + '">' + math('k_' + axis) +
        '<select id="sq-k-' + axis + '" aria-label="k' + axis + '">' + momentumOptions(draft.kQuarter[i]) +
        '</select></label>').join('') + '</fieldset>' +
      '<div class="sq-actions">' + renderButton('sq-show-product', "Calculate the product of these two operations", {primary: true}) + '</div>' +
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
