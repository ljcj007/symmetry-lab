import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const siteArgument = process.argv.indexOf('--site');
const staged = siteArgument !== -1;
const english = process.argv.includes('--english');
const site = staged ? pathToFileURL(resolve(process.argv[siteArgument + 1]) + '/') : new URL('../', import.meta.url);
const edition = new URL(english ? 'dist/en/' : 'dist/', site);
const {Container, Element} = await import(new URL('scripts/test-material-research-ui.mjs', site));
const {parseWorkbenchSelection} = await import(new URL('dist/workbench-route.js', site));

globalThis.document = {compatMode:'CSS1Compat', createElement:tag => new Element(tag)};
globalThis.localStorage = {getItem:() => null, setItem:() => {}};
globalThis.fetch = async resource => ({
  ok:true,
  json:async () => JSON.parse(readFileSync(new URL(String(resource).split('?')[0], edition), 'utf8'))
});

async function stageModule() {
  const {jsStrings, replaceUnits, textUnits} = await import(new URL('scripts/english-source.mjs', site));
  const source = readFileSync(new URL('../dist/antiunitary-screw-ui.js', import.meta.url), 'utf8');
  const catalog = JSON.parse(readFileSync(new URL('../locales/en-antiunitary-screw.json', import.meta.url), 'utf8'));
  assert.deepEqual(new Set(jsStrings(source).flatMap(unit => textUnits(unit.value))), new Set(Object.keys(catalog)));
  let code = source;
  if (english) {
    const edits = jsStrings(source).map(item => ({...item, translated:replaceUnits(item.value, key => catalog[key])}))
      .filter(item => item.value !== item.translated).sort((a,b) => b.start - a.start);
    for (const {start,end,type,translated} of edits) {
      const value = type === 'literal' ? JSON.stringify(translated) : translated.replaceAll('\\','\\\\').replaceAll('`','\\`').replaceAll('${','\\${');
      code = code.slice(0,start) + value + code.slice(end);
    }
  }
  code = code.replace(/ from '(\.\/[^']+)'/g, (_, relative) => ' from ' + JSON.stringify(new URL(relative, edition).href));
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}

const sectionId = '#sc-antiunitary-screw';
const container = new Container();
let dispose;
if (staged) {
  const {antiunitaryScrewHTML, bindAntiunitaryScrew} = await stageModule();
  container.innerHTML = antiunitaryScrewHTML();
  dispose = bindAntiunitaryScrew(container.querySelector(sectionId));
} else {
  const {renderSymmetryCourseView} = await import(new URL('symmetry-course-ui.js', edition));
  const {parseClassroomRoute} = await import(new URL('classroom-ui.js', edition));
  dispose = await renderSymmetryCourseView({
    container, selection:parseClassroomRoute('#classroom/spin?tab=learn&lesson=magnetic-04&track=magnetic'),
    run:() => assert.fail('A lesson comparison must only open a manual workbench calculation')
  });
}

const section = container.querySelector(sectionId);
assert.ok(section, 'Magnetic corepresentations lesson contains the exercise');
const form = section.querySelector('form');
const membership = section.querySelector('#sc-antiunitary-screw-membership');
const pairing = section.querySelector('#sc-antiunitary-screw-pairing');
const output = section.querySelector('#sc-antiunitary-screw-result');
const status = section.querySelector('#sc-antiunitary-screw-status');
const submit = () => form.onsubmit({preventDefault(){}});
assert.equal(status.getAttribute('role'), 'status');
assert.equal(output.innerHTML, '');
submit();
membership.value = 'all';
submit();
assert.equal(output.innerHTML, '', 'Both predictions are required before calculating');
pairing.value = 'center-boundary';
submit();
assert.match(output.textContent, english ? /Check the axial wavevector difference/ : /检查组合操作的轴向波矢差/);
assert.match(output.textContent, english ? /Compare the two invariant slices/ : /检查保持波矢的两个切面/);
membership.value = 'center-boundary';
pairing.value = 'boundary';
form.onchange();
assert.equal(output.innerHTML, '', 'A changed prediction clears the previous results');
submit();
assert.match(output.textContent, english ? /Wavevector prediction correct/ : /波矢预测正确/);
assert.match(output.textContent, english ? /Pairing prediction correct/ : /配对预测正确/);
assert.equal(output.querySelector('[role="region"]').getAttribute('tabindex'), '0');
if (english) assert.doesNotMatch(section.innerHTML + output.innerHTML, /\p{Script=Han}/u);

const cuts = ['center','intermediate','boundary'];
const expectedTex = [
  ['(-\\tfrac{1}{4},0,0)', '(-\\tfrac{1}{4},0,0)', '(\\tfrac{1}{4},0,0)', '(0,0,0)', '+1'],
  ['(-\\tfrac{1}{4},0,\\tfrac{1}{4})', '(-\\tfrac{1}{4},0,-\\tfrac{1}{4})', '(\\tfrac{1}{4},0,-\\tfrac{1}{4})', '(0,0,-\\tfrac{1}{2})', '—'],
  ['(-\\tfrac{1}{4},0,\\tfrac{1}{2})', '(-\\tfrac{1}{4},0,-\\tfrac{1}{2})', '(\\tfrac{1}{4},0,-\\tfrac{1}{2})', '(0,0,-1)', '-1']
];
const workbench = cuts.map((id,i) => {
  const row = output.querySelector(`[data-antiunitary-screw-cut="${id}"]`);
  const cells = row.querySelectorAll('td');
  const actual = [0,1,2,3,5].map(j => cells[j].querySelector('annotation')?.textContent ?? cells[j].textContent);
  assert.deepEqual(actual, expectedTex[i]);
  assert.equal(cells[6].textContent, i === 2 ? (english ? 'Enforced pairing' : '强制配对') :
    (english ? 'No pairing enforced by this operation' : '无此配对约束'));
  const href = row.querySelector('a').getAttribute('href').replaceAll('&amp;','&');
  assert.match(href, /^#workbench\?/);
  const selection = parseWorkbenchSelection(href.split('?')[1]);
  assert.deepEqual(selection, {mode:'msg',id:'4.8',k:[.25,0,i / 4],doubleValued:true,bzType:'',labelK:null});
  return selection;
});

const native = spawnSync(process.env.SYMMETRY_LAB_PYTHON || 'python', ['-B','-c',`
import json, math, sys
from pathlib import Path
sys.path.insert(0, 'dist/python')
from symmetry_core import analyze_group, reciprocal_action

groups = json.loads(Path('dist/data/magnetic-groups.json').read_text(encoding='utf8'))['groups']
requests = json.load(sys.stdin)
checks = []
for request in requests:
    group = next(group for group in groups if group['id'] == request['id'])
    assert group['type'] == 2 and group['unitarySpaceGroup'] == 4
    operations = group['operations']
    k = request['k']
    analysis = analyze_group({**request, 'operations': operations, 'basis': group['basis']})
    little = analysis['littleGroup']

    def returns_to_k(name, antiunitary):
        op = next(op for op in operations if op['name'] == name and op['antiunitary'] == antiunitary)
        return all(math.isclose(float(new - old), round(new - old), abs_tol=1.e-12)
                   for new, old in zip(reciprocal_action(op, k), k))

    anti_indices = little['antiunitaryIndices']
    square = None
    if anti_indices:
        (idx,) = anti_indices
        assert little['operations'][idx]['name'] == 'C2z'
        assert little['multiplicationTable'][idx][idx] == little['identity']
        assert little['translationDefects'][idx][idx] == [0, 0, 1]
        square = little['factors'][idx][idx]
    checks.append(dict(g=returns_to_k('C2z', False), theta=returns_to_k('E', True),
                       compound=returns_to_k('C2z', True), square=square, order=little['order'],
                       coreps=[[rep['type'], rep['dimension'], rep['wignerIndicator']] for rep in analysis['corepresentations']]))
print(json.dumps(checks))
`], {cwd:fileURLToPath(site),encoding:'utf8',input:JSON.stringify(workbench)});
assert.equal(native.status, 0, native.error?.message || native.stderr);
assert.deepEqual(JSON.parse(native.stdout), [
  {g:false,theta:false,compound:true,square:{re:1,im:0},order:2,coreps:[['a',1,1]]},
  {g:false,theta:false,compound:false,square:null,order:1,coreps:[]},
  {g:false,theta:false,compound:true,square:{re:-1,im:0},order:2,coreps:[['b',2,-1]]}
]);
dispose();
assert.equal(form.onsubmit, null, 'Leaving the lesson detaches the activity handler');
console.log(`Antiunitary screw lesson (${english ? 'English' : 'Chinese'}): predictions, exact motion, manual links and independent BNS 4.8 corepresentations passed.`);
