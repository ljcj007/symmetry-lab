import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {analyzeEvidence, operationCategories} from './pointgroup-identify-core.js?v=20261119-pointgroups1';

const sourceURL = new URL('./data/pointgroup-identify.json?v=20261119-pointgroups1', import.meta.url);
let catalogPromise;

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(sourceURL).then(response => {
      if (!response.ok) throw Error("The point-group exercises could not be loaded.");
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
  {id: 'starter', text: "Starter exercises", symbols: ['m', '2', '2/m', 'mm2', '222', '-1']},
  {id: 'compare', text: "Compare similar groups", symbols: ['4mm', '-42m', '6', '-6', '432', '-43m', '222', 'mm2']},
  {id: 'all', text: "All 32 point groups"}
];
const axes = ['x', 'y', 'z'];
const labels = {
  'proper-1': "Identity",
  'proper-2': "Twofold proper rotation",
  'proper-3': "Threefold proper rotation",
  'proper-4': "Fourfold proper rotation",
  'proper-6': "Sixfold proper rotation",
  'improper-1': "Inversion",
  'improper-2': "Mirror reflection",
  'improper-3': "Threefold rotoinversion",
  'improper-4': "Fourfold rotoinversion",
  'improper-6': "Sixfold rotoinversion"
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
  return "<div class=\"pgi-counts\" tabindex=\"0\" role=\"region\" aria-label=\"Operation counts\"><table><thead><tr>" +
    "<th scope=\"col\">Operation type from the matrix</th><th scope=\"col\">" + (complete ? "Complete count" : "Observed count") +
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
    const system = atlasGroups.get(String(group.id))?.system ?? "crystal point group";
    if (!systems.has(system)) systems.set(system, []);
    systems.get(system).push(group);
  }
  return selectOption('', "Choose an answer", active) + Array.from(systems, ([system, entries]) =>
    '<optgroup label="' + esc(system) + '">' + entries.map(group =>
      selectOption(String(group.id), nativeHm(group.hm) + ' · ' + group.schoenflies, active)).join('') +
    '</optgroup>').join('');
}

function operationFeedback(operation, guess) {
  const correct = guess === operation.category ? "Correct. " : "Check the sign and the rotation order again.";
  const determinant = math('\\det(R)=' + operation.determinant);
  const trace = math('\\operatorname{tr}(R)=' + operation.trace);
  const operationOrder = math('R^{' + operation.order + '}=I');
  const rotation = operation.determinant === 1
    ? "Find the order of the proper rotation directly."
    : "Negate the matrix, then find the order of the resulting proper rotation.";
  return '<p><strong>' + correct + '</strong> ' + categoryName(operation.category) + '</p><p>' + determinant + ' · ' +
    trace + '</p><p>' + rotation + ' ' + "Order of the proper rotation" + ' · ' + operation.rotationOrder + '</p>' +
    '<p>' + "First return of the original operation to the identity" + ' · ' + operationOrder + '</p>';
}

function interpretationFeedback(answer, complete) {
  if (complete) {
    return answer === 'exact'
      ? "Correct. Every count in the complete list can be compared, including zero."
      : "The list is complete. Compare the exact count for each type, including zero.";
  }
  return answer === 'lower'
    ? "Correct. Unseen operations may still increase a count."
    : "The list is still partial. A zero count means you have yet to observe that type.";
}

function reviewFeedback(pick, target, evidence, knownOrder) {
  const name = groupName(pick);
  if (evidence.complete && String(pick.id) === String(target.id)) {
    return "<p><strong>This is the matching point group.</strong> " + name + "</p><p>The counts agree for all ten types of operations.</p>";
  }
  const witness = operationCategories.find(category => evidence.complete
    ? evidence.counts[category] !== pick.counts[category]
    : evidence.counts[category] > pick.counts[category]);
  if (witness) {
    return "<p><strong>This evidence rules out the selected group.</strong> " + name + '</p><dl><dt>' + categoryName(witness) +
      '</dt><dd>' + (evidence.complete ? "In the complete list" : "Observed so far") + ' ' + evidence.counts[witness] +
      ' · ' + "Expected for your selection" + ' ' + pick.counts[witness] + '</dd></dl>' +
      (evidence.complete ? '<p>' + "Match from the complete counts" + ' · ' + groupName(target) + '</p>' : '');
  }
  if (knownOrder !== null && pick.order !== knownOrder) {
    return "<p><strong>The given group order rules out the selected group.</strong> " + name + '</p><p>' +
      "Given group order" + ' · ' + knownOrder + '　' + "Order of the selected group" + ' · ' + pick.order + '</p>';
  }
  return "<p><strong>The selected group fits the evidence so far.</strong> " + name + '</p><p>' +
    "Inspect more operations, then check against the complete counts." + '</p>';
}

function inspectHTML(operations, geometry, before, after, operation, draft) {
  return "<section class=\"pgi-section\" aria-labelledby=\"pgi-inspect-heading\"><h4 id=\"pgi-inspect-heading\">Follow one operation through its matrix</h4>" +
    "<p>Choose a unit vector along one coordinate axis. The corresponding column of the matrix gives the coordinates of its image.</p>" +
    "<div class=\"pgi-controls\"><label for=\"pgi-operation\">Observed operation<select id=\"pgi-operation\">" +
    operations.map((_, index) => selectOption(index, "Operation " + pad(index + 1), draft.operation)).join('') + '</select></label>' +
    "<label for=\"pgi-axis\">Starting basis vector<select id=\"pgi-axis\">" +
    axes.map((axis, index) => selectOption(index, axis, draft.axis)).join('') + '</select></label></div>' +
    '<div class="pgi-action"><div>' + matrixHTML(geometry, "Cartesian operation matrix") +
    "<dl><dt>before transformation</dt><dd class=\"pgi-number\" data-math-ignore>" + vectorText(before) +
    "</dd><dt>after transformation</dt><dd class=\"pgi-number\" data-math-ignore>" + vectorText(after) + '</dd></dl></div>' +
    '<figure>' + actionGraphic(before, after) +
    "<figcaption><span class=\"pgi-key-before\">before transformation</span><span class=\"pgi-key-after\">after transformation</span></figcaption></figure></div>" +
    '<details id="pgi-basis" class="pgi-candidates"' + (draft.basisOpen ? ' open' : '') +
    "><summary>Show the exact matrix in the lattice basis</summary><p>The diagram uses an orthonormal Cartesian basis and shows numbers to at most four decimal places. The integer matrix below uses a lattice basis. A change of basis preserves the determinant, trace and order of the operation.</p>" +
    matrixHTML(operation.matrix, "Operation matrix in the lattice basis") + '</details>' +
    '<p>' + math('\\det(R)') + (operation.determinant === 1 ? " is positive. Find the rotation order." :
      " is negative. Apply inversion first, then identify the remaining rotation.") + '</p>' +
    '<details id="pgi-hint" class="pgi-candidates"' + (draft.hintOpen ? ' open' : '') +
    "><summary>How do you read the rotation order from the matrix?</summary>" +
    "<p>Add the three diagonal entries of the proper rotation matrix. If the determinant is negative, negate the original matrix first.</p>" +
    '<p>' + math('\\operatorname{tr}(R_+)=1+2\\cos\\theta') + '</p>' +
    "<p>Diagonal sums of 3, −1, 0, 1 and 2 give rotation orders of 1, 2, 3, 4 and 6 respectively.</p></details>" +
    "<label for=\"pgi-op-guess\">Identify this operation<select id=\"pgi-op-guess\">" +
    selectOption('', "Choose an answer", draft.operationGuess) +
    operationCategories.map(category => selectOption(category, labels[category], draft.operationGuess)).join('') +
    '</select></label><div class="pgi-buttons">' +
    '<button class="secondary" type="button" id="pgi-op-check"' + (draft.operationGuess ? '' : ' disabled') +
    '>' + "Check this operation" + '</button></div>' +
    (draft.operationChecked ? '<div class="pgi-feedback" tabindex="-1" id="pgi-op-feedback" role="status">' +
      operationFeedback(operation, draft.operationGuess) + '</div>' : '') + '</section>';
}

function evidenceHTML(evidence, operations, groupOrder, groups, draft) {
  const complete = evidence.complete;
  const interpretation = draft.interpretationChecked ? interpretationFeedback(draft.interpretation, complete) : '';
  return "<section class=\"pgi-section\" aria-labelledby=\"pgi-count-heading\"><h4 id=\"pgi-count-heading\">Build up evidence from the operations</h4>" +
    '<p><strong>' + (complete ? "All operations are shown." : "Only some operations are shown.") + '</strong> ' +
    (complete ? "A zero count can help rule out a candidate." : "The table gives lower bounds from what you have seen. A zero means this type has yet to appear.") + '</p>' +
    "<dl class=\"pgi-count-meta\" tabindex=\"-1\" id=\"pgi-count-summary\"><dt>Operations shown</dt><dd>" + operations.length +
    "</dd><dt>Given group order</dt><dd>" + (groupOrder === null ? "Not given yet" : groupOrder) + "</dd><dt>Remaining candidates</dt><dd>" +
    evidence.candidateIds.length + '</dd></dl><div class="pgi-buttons">' +
    (complete ? '' : "<button class=\"secondary\" type=\"button\" id=\"pgi-next\">Show the next operation</button>" +
      "<button class=\"secondary\" type=\"button\" id=\"pgi-full\">Show all operations</button>" +
      (draft.totalKnown ? '' : "<button class=\"secondary\" type=\"button\" id=\"pgi-order\">Reveal the group order</button>")) +
    '</div>' + countTable(evidence.counts, complete) +
    '<details class="pgi-candidates" id="pgi-candidates"' + (draft.candidatesOpen ? ' open' : '') +
    "><summary>Show the remaining point groups</summary><ul>" + evidence.candidateIds.map(id =>
      '<li>' + groupName(groups.get(String(id))) + '</li>').join('') + '</ul></details>' +
    "<label for=\"pgi-interpretation\">How can you use the counts at this stage?<select id=\"pgi-interpretation\">" +
    selectOption('', "Choose an answer", draft.interpretation) +
    selectOption('lower', "Use the counts as lower bounds", draft.interpretation) +
    selectOption('exact', "Match the exact counts, including zero", draft.interpretation) +
    '</select></label><div class="pgi-buttons">' +
    '<button class="secondary" type="button" id="pgi-interpret-check"' + (draft.interpretation ? '' : ' disabled') +
    '>' + "Check how to use the evidence" + '</button></div>' +
    (interpretation ? '<p class="pgi-feedback" tabindex="-1" id="pgi-interpret-feedback" role="status">' +
      esc(interpretation) + '</p>' : '') + '</section>';
}

function reviewHTML(groups, target, evidence, groupOrder, options, draft) {
  return "<section class=\"pgi-section\" aria-labelledby=\"pgi-match-heading\"><h4 id=\"pgi-match-heading\">Identify the point group</h4>" +
    "<label for=\"pgi-answer\">Choose a point group from the evidence<select id=\"pgi-answer\">" + options + '</select></label>' +
    (draft.initialGuess ? '<p>' + "Initial guess" + ' · ' + groupName(groups.get(draft.initialGuess)) + '</p>' : '') +
    '<div class="pgi-buttons"><button class="primary" type="button" id="pgi-review"' +
    (draft.answer ? '' : ' disabled') + '>' + "Check answer" + '</button></div>' +
    (draft.reviewed ? '<div class="pgi-feedback" tabindex="-1" id="pgi-review-feedback" role="status">' +
      reviewFeedback(groups.get(draft.answer), target, evidence, groupOrder) + '</div>' : '') +
    (draft.reviewed && evidence.complete ? "<div class=\"pgi-buttons\"><button class=\"secondary\" type=\"button\" id=\"pgi-atlas\">See the matching group's character table →</button>" +
      "<button class=\"secondary\" type=\"button\" id=\"pgi-lab\">Verify in the symmetry operation lab →</button></div>" : '') +
    "<div class=\"pgi-buttons\"><button class=\"secondary\" type=\"button\" id=\"pgi-new\">Try another exercise</button></div></section>";
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
    if (!exercise) throw Error("This exercise is missing from the point-group catalog.");
    mounted.caseId = exercise.id;
    if (!mounted.drafts.has(exercise.id)) mounted.drafts.set(exercise.id, caseDraft(exercise.initialCount));
    const draft = mounted.drafts.get(exercise.id);
    const target = groups.get(String(exercise.groupId));
    const operations = target.operations.slice(0, draft.visible);
    const complete = operations.length === target.operations.length;
    const groupOrder = draft.totalKnown || complete ? target.order : null;
    const evidence = analyzeEvidence(catalog.groups, operations, {complete, groupOrder});
    if (complete && (!evidence.validComplete || evidence.candidateIds.length !== 1 ||
        String(evidence.candidateIds[0]) !== String(target.id))) throw Error("The operation data for this exercise are inconsistent.");
    const operation = evidence.entries[draft.operation];
    const geometry = operations[draft.operation].cartesianMatrix;
    const before = axes.map((_, i) => i === draft.axis ? 1 : 0);
    const after = geometry.map(row => row[draft.axis]);
    const options = groupOptions(catalog.groups, atlasGroups, draft.initialGuess);
    const answerOptions = groupOptions(catalog.groups, atlasGroups, draft.answer);

    root.innerHTML = '<div class="pgi-workshop"><div class="pgi-section"><div class="pgi-controls">' +
      "<label for=\"pgi-mode\">Exercise set<select id=\"pgi-mode\">" +
      modes.map(entry => selectOption(entry.id, entry.text, mode.id)).join('') + '</select></label>' +
      "<label for=\"pgi-case\">Mystery group<select id=\"pgi-case\">" +
      exercises.map(entry => selectOption(entry.id, "Exercise " + pad(catalog.exercises.indexOf(entry) + 1), exercise.id)).join('') +
      '</select></label></div>' +
      "<label for=\"pgi-predict\">Make an initial guess<select id=\"pgi-predict\">" + options + '</select></label>' +
      "<p>Record a guess, then test it against the matrices and operation counts. Each exercise reveals operations from a single point group.</p></div>" +
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
    root.innerHTML = "<p role=\"status\">Loading the point-group exercises…</p>";
    loadCatalog().then(catalog => draw(catalog)).catch(() => {
      if (!active()) return;
      catalogPromise = null;
      const revision = ++renderNumber;
      root.innerHTML = "<p role=\"alert\">The point-group exercises could not be loaded. Please try again.</p>" +
        "<button class=\"secondary\" type=\"button\" id=\"pgi-retry\">Retry loading exercises</button>";
      on('pgi-retry', 'onclick', start, revision);
    });
  }

  start();
  return () => { disposed = true; };
}
