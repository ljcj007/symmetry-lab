"""Verify that real public Python band matches survive the browser row renderer."""

import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dist/data'
TRACE = ROOT / 'dist/examples/trace-msg.txt'
TRACE_SHA = '601c6d53ad1e26e3a065f5ae250ea7b6eb4bab8c6d0e63def41ca6085d953e22'
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run
from symmetry_core import characters_for_analysis, match_trace_operations, parse_trace


NODE_RENDER = '''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bandMatchRows} from './dist/band-match-results.js';
const bands = JSON.parse(readFileSync(0, 'utf8'));
const before = structuredClone(bands);
const rows = bandMatchRows(bands, label => label);
assert.deepEqual(bands, before, 'Rendering may not modify the original decomposition or export rows.');
process.stdout.write(JSON.stringify(rows));
'''


def render_rows(bands):
    response = subprocess.run(['node', '--input-type=module', '-e', NODE_RENDER],
                              input=json.dumps(bands, allow_nan=False), encoding='utf-8',
                              cwd=ROOT, capture_output=True, timeout=30, check=False)
    if response.returncode:
        raise RuntimeError(response.stderr)
    return json.loads(response.stdout)


def restrict_to_unitary_trace(text, parsed):
    """Use the actual six unitary operations/characters of this Γ-only archive.

    This archived header and k row already use the prefix of six contiguous
    operations. Express their unchanged rotation, spin-lift, energy and
    character fields using the ordinary vasp2trace syntax.
    """
    if ([bool(op.get('antiunitary')) for op in parsed['operations']] != [False] * 6 + [True] * 6
            or len(parsed['kpoints']) != 1 or parsed['kpoints'][0]['operationIndices'] != list(range(6))):
        raise ValueError('This archived trace no longer has a contiguous unitary prefix at Γ.')
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    unitary_lines = [' '.join(line.split()[:-1]) for line in lines[3:9]]
    return '\n'.join([str(parsed['nelec']), str(parsed['soc']), '6', *unitary_lines, *lines[15:]]) + '\n'


class BandMatchDisplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.database = json.loads((DATA / 'space-groups.json').read_bytes())
        cls.labels = {label: json.loads(gzip.decompress((DATA / 'labels' / f'{label}-labels.json.gz').read_bytes()))
                      for label in ('bc', 'bilbao')}
        magnetic = json.loads((DATA / 'magnetic-groups.json').read_bytes())
        cls.msg = next(group for group in magnetic['groups'] if group['id'] == '166.101')
        cls.sg = next(group for group in cls.database['groups'] if group['number'] == cls.msg['unitarySpaceGroup'])
        raw = TRACE.read_bytes()
        if hashlib.sha256(raw).hexdigest() != TRACE_SHA:
            raise ValueError('The staged real magnetic trace differs from its recorded bytes.')
        cls.magnetic_text = raw.decode('utf-8')
        cls.magnetic_trace = parse_trace(cls.magnetic_text)
        cls.ordinary_text = restrict_to_unitary_trace(cls.magnetic_text, cls.magnetic_trace)

    def analyze(self, group, mode):
        payload = {'operations': group['operations'], 'basis': group['basis'], 'k': [0, 0, 0], 'doubleValued': True}
        if mode == 'sg':
            payload.update(group_number=group['number'], bz_type=group['bzTypes'][0], k_label='Γ')
        return run('analyze', payload, database=self.database, label_database=self.labels)

    def match(self, group, analysis, mode, text):
        payload = {'group': group, 'analysis': analysis, 'text': text, 'k': [0, 0, 0],
                   'doubleValued': True, 'mode': mode}
        result = run('match_bands', payload)
        self.assertEqual(set(result), {'bands'})
        return result['bands']

    def check_modes(self, group, analysis, mode, trace_text, term_labels):
        raw = self.match(group, analysis, mode, trace_text)
        parsed = parse_trace(trace_text)
        point = match_trace_operations(parsed, group)['kpoints'][0]
        json_bands = [{'index': band['index'], 'energy': band['energy'],
                       'characters': characters_for_analysis(point, band, analysis)} for band in point['bands']]
        json_text = json.dumps({'group': {'id': group.get('id', group.get('number')), 'mode': mode},
                                'k': [0, 0, 0], 'doubleValued': True, 'bands': json_bands})
        converted = self.match(group, analysis, mode, json_text)

        self.assertEqual([(b['index'], b['energy'], b['degeneracy']) for b in raw],
                         [(1, -11.456165, 2), (3, -0.945275, 2)])
        self.assertEqual([b['terms'] for b in converted], [b['terms'] for b in raw])
        self.assertTrue(all('degeneracy' not in b for b in converted))
        for band in raw:
            decomposition = band['terms']
            self.assertEqual(set(decomposition), {'terms', 'multiplicities', 'dimension', 'reconstructionError', 'passed'})
            self.assertEqual(decomposition['dimension'], 2)
            self.assertTrue(decomposition['passed'])
            self.assertLess(decomposition['reconstructionError'], 1e-12)
            self.assertEqual([term['multiplicity'] for term in decomposition['terms']], [1, 1])
            self.assertEqual([term['label'] for term in decomposition['terms']], term_labels)
            self.assertEqual(len(decomposition['multiplicities']), 6)
            self.assertEqual(sum(term['multiplicity'] == 0 for term in decomposition['multiplicities']), 4)
            for term in decomposition['terms']:
                self.assertEqual(set(term['coefficient']), {'re', 'im'})
                self.assertAlmostEqual(term['coefficient']['re'], 1)
                self.assertAlmostEqual(term['coefficient']['im'], 0)
                self.assertEqual(term['dimension'], 1)
                self.assertEqual('type' in term, mode == 'msg')

        decomposition_text = ' ⊕ '.join(term_labels)
        expected = [['1', '-11.456165', '2', decomposition_text], ['3', '-0.945275', '2', decomposition_text]]
        self.assertEqual(render_rows(raw), expected)
        self.assertEqual(render_rows(converted), expected)

    def test_real_magnetic_trace_and_reordered_json(self):
        self.assertEqual(self.magnetic_trace['format'], 'magvasp2trace')
        analysis = self.analyze(self.msg, 'msg')
        self.assertNotIn('standardLabels', analysis)
        self.check_modes(self.msg, analysis, 'msg', self.magnetic_text, ['C1', 'C2'])

    def test_real_ordinary_unitary_restriction_and_reordered_json(self):
        self.assertEqual(self.sg['number'], 148)
        self.assertEqual(self.sg['basis'], self.msg['basis'])
        ordinary = parse_trace(self.ordinary_text)
        self.assertEqual(ordinary['format'], 'vasp2trace')
        self.assertEqual(ordinary['kpoints'], self.magnetic_trace['kpoints'])
        analysis = self.analyze(self.sg, 'sg')
        self.assertEqual(analysis['corepresentations'], [])
        names = {row['local_label']: (row['bc_label'], row['bilbao_label'])
                 for row in analysis['standardLabels']['mappings']}
        self.assertEqual(names['D2'], ('Γ4+', '-GM6'))
        self.assertEqual(names['D3'], ('Γ5+', '-GM5'))
        self.check_modes(self.sg, analysis, 'sg', self.ordinary_text, ['D2', 'D3'])

    def test_unconverted_ordinary_spin_frame_remains_rejected(self):
        group = self.database['groups'][185]
        text = (ROOT / 'scripts/fixtures/trace-sg186.txt').read_text(encoding='utf-8')
        self.assertEqual(parse_trace(text)['format'], 'vasp2trace')
        with self.assertRaisesRegex(ValueError, '自旋矩阵'):
            self.match(group, self.analyze(group, 'sg'), 'sg', text)


if __name__ == '__main__':
    unittest.main()
