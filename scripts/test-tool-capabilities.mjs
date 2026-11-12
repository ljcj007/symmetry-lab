import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {toolsIndex} from '../dist/navigation-ui.js';
import {toolCapabilities,arithmeticLabels,arithmeticDescriptions,getToolCapability} from '../dist/tool-capabilities.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const routes=toolsIndex.map(tool=>tool.route);
assert.equal(routes.length,74);
assert.deepEqual(Object.keys(toolCapabilities).sort(),[...routes].sort(),'Every real directory route has one capability record');
const modes=Object.keys(arithmeticLabels);
assert.deepEqual(modes.sort(),['exact','mixed','numeric','reference']);
assert.deepEqual(Object.keys(arithmeticDescriptions).sort(),modes);
assert.ok(Object.isFrozen(toolCapabilities));
for(const [route,item] of Object.entries(toolCapabilities)){
 assert.ok(modes.includes(item.arithmetic),route);
 for(const field of ['input','output','conditions','sources']){
  assert.ok(Array.isArray(item[field])&&item[field].length,route+' '+field);
  for(const value of item[field])assert.ok(typeof value==='string'&&value.trim(),route+' '+field);
  assert.ok(Object.isFrozen(item[field]),route+' immutable '+field);
 }
 for(const field of ['scope','searchTerms'])assert.ok(typeof item[field]==='string'&&item[field].trim(),route+' '+field);
 assert.ok(Object.isFrozen(item),route+' immutable metadata');
 for(const source of item.sources)assert.ok(fs.existsSync(path.join(root,source)),route+' source '+source);
 assert.equal(getToolCapability(route),item);
 assert.equal(getToolCapability('#'+route+'?from=classroom'),item,'Deep links resolve their canonical catalogue route');
}
for(const route of ['',null,'compute/future','__proto__','constructor'])assert.equal(getToolCapability(route),null);

// Arithmetic labels distinguish an exact-symbolic calculation from the term
// "exact diagonalization" for a numerical finite-basis eigensolver.
assert.equal(toolCapabilities['compute/hubbard-cluster-lab'].arithmetic,'numeric');
assert.match(toolCapabilities['compute/hubbard-cluster-lab'].conditions.join(' '),/有限基.*浮点/);
assert.equal(toolCapabilities.workbench.arithmetic,'numeric');
const cg=toolCapabilities['compute/lie/su3_cg'];
assert.equal(cg.arithmetic,'mixed');
assert.match(cg.conditions.join(' '),/数值.*256.*精确.*81/);
const cgSource=fs.readFileSync(path.join(root,'dist/python/su3_cg.py'),'utf8');
assert.match(cgSource,/product dimension of at most 256/);
assert.match(fs.readFileSync(path.join(root,'dist/python/su3_cg_exact.py'),'utf8'),/MAX_DIMENSION\s*=\s*81/);

// These boundaries affect the user's choice before an expensive data import.
const phonon=toolCapabilities['compute/phonon-modes'];
assert.match(phonon.conditions.join(' '),/Oh.*Td.*C1.*Ci/);
assert.match(phonon.conditions.join(' '),/对角超胞.*512/);
assert.match(phonon.conditions.join(' '),/频率和本征矢来自输入/);
const phononSource=fs.readFileSync(path.join(root,'dist/python/phonon_modes.py'),'utf8');
assert.match(phononSource,/MAX_FROZEN_ATOMS\s*=\s*512/);
assert.match(phononSource,/Oh and Td \(and\s+C1\/Ci\)/);
const layer=toolCapabilities['compute/layer-symmetry-lab'];
assert.match(layer.scope,/立方原型.*面内周期.*法向有限/);
assert.match(layer.input.join(' '),/001.*110.*111/);
assert.match(layer.conditions.join(' '),/80 层群定名.*另一项分类任务/);
assert.match(fs.readFileSync(path.join(root,'dist/python/symmetry_frontiers.py'),'utf8'),/立方原型继承的层对称操作/);

// Identifier lookup must not imply a change-of-cell/origin conversion.
assert.match(toolCapabilities.crystkit.conditions.join(' '),/编号映射.*晶胞.*原点.*分开/);
assert.match(toolCapabilities['compute/advanced/symbolic_spacegroups'].conditions.join(' '),/OGtoBNS.*编号映射/);
assert.match(toolCapabilities['compute/advanced/carat_integral'].conditions.join(' '),/候选格覆盖.*Z 类区分.*仿射轨道完整性.*分别/);
assert.match(toolCapabilities['compute/advanced/integral_normalizer'].conditions.join(' '),/已知子群.*完整正规化子.*分别/);

const distribution=Object.fromEntries(modes.map(mode=>[mode,Object.values(toolCapabilities).filter(row=>row.arithmetic===mode).length]));
console.log('Tool capabilities: 74 canonical routes, immutable complete records, source locations, arithmetic distinctions and input-scope boundaries passed. '+JSON.stringify(distribution));
