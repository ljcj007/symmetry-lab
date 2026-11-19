import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {analyzeEvidence, analyzeOperation, operationCategories} from '../dist/pointgroup-identify-core.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8').replace(/\r\n?/g, '\n');
const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
const spaceGroupsPath = 'dist/data/space-groups.json';
const atlasPath = 'dist/data/pointgroup-atlas.json';
const spaceGroupsText = read(spaceGroupsPath);
const atlasText = read(atlasPath);
const spaceGroups = JSON.parse(spaceGroupsText);
const atlas = JSON.parse(atlasText);
const orderOfCategories = new Map(operationCategories.map((name, index) => [name, index]));
assert.equal(atlas.groups.length, 32);

const groups = atlas.groups.map(group => {
  const {id, hm, schoenflies, representativeSG, order} = group;
  const source = spaceGroups.groups[representativeSG - 1];
  assert.equal(source.pointGroupNumber, id, hm);
  assert.equal(source.pointGroup, schoenflies, hm);
  assert.equal(source.operations.length, order, hm);
  assert.deepEqual(source.basis, group.sourceBasis, hm);
  const checked = source.operations.map(({rotation: matrix, translation}, index) => {
    const item = group.operations[index];
    assert.deepEqual(translation, [0, 0, 0], hm);
    assert.deepEqual(matrix, item.fractionalMatrix, hm);
    const operation = analyzeOperation(matrix);
    assert.equal(operation.determinant, item.det, hm);
    assert.equal(operation.order, item.order, hm);
    return {matrix, cartesianMatrix: item.matrix, category: operation.category};
  });

  // Show identity and simple proper rotations first. IDs carry no group or operation name.
  checked.sort((a, b) => orderOfCategories.get(a.category) - orderOfCategories.get(b.category));
  const operations = checked.map(({matrix, cartesianMatrix}, index) => ({
    id: `op-${String(index + 1).padStart(2, '0')}`,
    matrix,
    cartesianMatrix,
  }));
  const analysis = analyzeEvidence([], operations, {complete: true});
  assert(analysis.validComplete, hm);
  return {id, hm, schoenflies, order, representativeSG, operations, counts: analysis.counts};
});

for (const group of groups) {
  const analysis = analyzeEvidence(groups, group.operations, {complete: true});
  assert.deepEqual(analysis.candidateIds, [group.id], group.hm);
}

// The opening exercises offer small contrasts and a many-axis case. A fixed
// digest ranks the remainder independently of atlas order and display language.
const firstGroups = [7, 22, 30, 4, 2];
const first = firstGroups.map(id => groups.find(group => group.id === id));
assert(first.every(Boolean));
const titleIndependentKey = group => sha(`pointgroup-exercise-v1:${group.id}`);
const rest = groups.filter(group => !firstGroups.includes(group.id)).sort((a, b) => {
  const left = titleIndependentKey(a), right = titleIndependentKey(b);
  return left < right ? -1 : left > right ? 1 : 0;
});
const exercises = [...first, ...rest].map((group, index) => ({
  id: `case-${String(index + 1).padStart(2, '0')}`,
  groupId: group.id,
  initialCount: Math.max(1, Math.min(2, group.order - 1)),
}));

const data = {
  schemaVersion: 1,
  sources: {
    normalization: 'utf8-lf-v1',
    upstreamCommit: spaceGroups.source.commit,
    spaceGroups: {path: spaceGroupsPath, sha256: sha(spaceGroupsText)},
    atlas: {path: atlasPath, sha256: sha(atlasText)},
  },
  groups,
  exercises,
};
const output = 'dist/data/pointgroup-identify.json';
const body = JSON.stringify(data) + '\n';
if (process.argv.includes('--check')) {
  assert.equal(read(output), body, 'Point-group identification data are stale');
} else {
  writeFileSync(new URL(output, root), body);
}
console.log(`Point-group identification catalog: ${groups.length} exact groups, ${exercises.length} exercises.`);
