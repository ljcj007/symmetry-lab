import assert from 'node:assert/strict';
import {Container, Element} from './test-material-research-ui.mjs';

const english = process.argv.includes('--english');
const edition = english ? '../dist/en/' : '../dist/';
const {knownTool, toolsIndex, renderNavigationHub} = await import(edition + 'navigation-ui.js');
const {finderResults} = await import(edition + 'tool-finder.js');
const {validateAdvancedPreset} = await import(edition + 'advanced-ui.js');
const pairs = [
  ['carat_integral', 'noncyclic-affine'], ['integral_normalizer', 'glued6'],
  ['arithmetic_centralizer', 'a5'], ['symbolic_spacegroups', 'magnetic']
];

globalThis.document = {activeElement: null};
Element.prototype.focus = function () { document.activeElement = this; };
const container = new Container();
await renderNavigationHub({container, view: 'compute'});
assert.equal(toolsIndex.length, 75);
for (const [tool, preset] of pairs) {
  assert.ok(validateAdvancedPreset(tool, preset));
  assert.ok(knownTool(`compute/advanced/${tool}`));
  const routes = container.querySelectorAll('[data-route]');
  const link = routes.find(link => link.getAttribute('href') === `#compute/advanced/${tool}?preset=${preset}`);
  assert.ok(link?.textContent.includes('→'), `Missing calculator case link for ${tool}`);
  if (english) assert.doesNotMatch(link.textContent, /[\u3400-\u9fff]/);
}
assert.equal(container.querySelectorAll('.nav-tool-example').length, pairs.length);
const queries = english ? ['Kramers corepresentation', '1.3 BNS corepresentation'] : ['Kramers 共表示', '1.3 BNS 共表示'];
for (const query of queries) {
  for (const scope of ['tools', 'all']) {
    assert.equal(finderResults(toolsIndex, query, {scope})[0]?.route, 'compute/advanced/symbolic_spacegroups');
  }
}
console.log('Four calculator cards expose validated example links; both BNS 1.3 and Kramers queries find symbolic corepresentations.');
