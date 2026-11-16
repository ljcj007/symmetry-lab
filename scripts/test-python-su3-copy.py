"""Independent full-space checks for the finite octet-copy workshop.

Use the returned canonical 64x64 matrix and the independent public GT ledger,
not the adapter's private transforms or its own pass flags, as the oracles.
"""
from copy import deepcopy
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import unittest
from unittest.mock import patch

import sympy as sp

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'dist'/'python'))
import su3_cg
import su3_cg_exact
import su3_basis_lab
import su3_copy_lab as lab


@lru_cache(maxsize=None)
def value(text):
    # Only trusted scientific output is parsed here; never user input.
    result = sp.sympify(text, locals={'sqrt': sp.sqrt, 'I': sp.I})
    if result.atoms(sp.Float):
        raise AssertionError('Floating-point atom in exact output')
    return result


@lru_cache(maxsize=None)
def rows_matrix(rows):
    return sp.ImmutableSparseMatrix([[value(v) for v in row] for row in rows])


def matrix(obj):
    result = rows_matrix(tuple(tuple(row) for row in obj['exact']))
    assert list(result.shape) == obj['shape']
    return result


def sparse(obj):
    return sp.ImmutableSparseMatrix(*obj['shape'],
        {(r['row'], r['column']): value(r['value']['exact']) for r in obj['entries']})


def digest(obj):
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True,
        separators=(',', ':')).encode('utf8')).hexdigest()


def display_expression(expression):
    # Parsing a trusted printed sum can distribute its common denominator.
    # Recollect it before comparing LaTeX typography; the scientific equality
    # checks above use independent algebra, not this display normalization.
    return sp.radsimp(sp.cancel(sp.expand(expression)))


class OctetCopyWorkshop(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cases = {(angle, phase): lab.run({'lab': 'su3_copy', 'angle': angle, 'phase': phase})
                     for angle in (0, 45, 90) for phase in ('1', 'i', '-1', '-i')}
        cls.first = cls.cases[45, '1']
        cls.c = rows_matrix(tuple(tuple(row) for row in cls.first['canonical']['reply']['exactCGMatrix']))
        pairs = cls.first['pairs']
        indices = [p[side]['canonicalColumn'] for side in ('s', 'a') for p in pairs]
        cls.c8 = cls.c[:, indices]
        cls.swap = sp.ImmutableSparseMatrix(64, 64,
            {(8*j+i, 8*i+j): 1 for i in range(8) for j in range(8)})
        cls.gt = su3_basis_lab.run({'lab': 'su3_basis', 'p': 1, 'q': 1})
        cls.ops = {op['id']: matrix(op['matrix']) for op in cls.gt['operators']}

    def assert_zero(self, expression):
        values = expression if isinstance(expression, sp.MatrixBase) else [expression]
        self.assertEqual({sp.simplify(sp.expand(v)) for v in set(values) if v != 0}-{0}, set())

    def assert_json_identical(self, actual, expected):
        # Normal dict equality would accept 0 == 0.0 and False == 0. Source
        # serialization must retain the original Python JSON numeric types.
        self.assertIs(type(actual), type(expected))
        if isinstance(actual, dict):
            self.assertEqual(set(actual), set(expected))
            for key in actual: self.assert_json_identical(actual[key], expected[key])
        elif isinstance(actual, list):
            self.assertEqual(len(actual), len(expected))
            for a, b in zip(actual, expected): self.assert_json_identical(a, b)
        else:
            self.assertEqual(actual, expected)

    def test_strict_bounded_inputs_before_any_calculation(self):
        invalid = [None, [], True, {}, {'lab': 'lie'}, {'lab': True}]
        for key, values in [('angle', [True, False, '45', 45.0, None, -45, 30, 180, [], {}]),
                            ('phase', [1, True, None, 'I', 'sqrt(2)', 'exp(I)', [], {}])]:
            invalid.extend({'lab': 'su3_copy', key: v} for v in values)
        invalid.extend({'lab': 'su3_copy', key: 0}
                       for key in ('mu', 'p1', 'q1', 'state', 'R', 'arithmetic', '__proto__'))
        with patch.object(lab, '_result_json', side_effect=AssertionError('Validation called calculator')):
            for payload in invalid:
                with self.subTest(payload=payload), self.assertRaises(ValueError):
                    lab.run(payload)
        self.assertEqual(lab.run({'lab': 'su3_copy'})['request'],
                         {'lab': 'su3_copy', 'angle': 45, 'phase': '1'})

    def test_full_canonical_reply_and_core_cache_are_unchanged(self):
        canonical = self.first['canonical']
        before = su3_cg.run(deepcopy(canonical['request']))
        core_before = sp.ImmutableSparseMatrix(su3_cg_exact._coupling(1, 1, 1, 1)['matrix'])
        self.assertEqual(canonical['reply'], before)
        self.assertEqual(canonical['sha256'], digest(before))
        self.assertEqual(canonical['serialization'], 'python-json-utf8-sorted-v1')
        expected_serialized = json.dumps(before, ensure_ascii=False, sort_keys=True,
                                         separators=(',', ':'))
        self.assertEqual(canonical['serialized'], expected_serialized)
        self.assertEqual(hashlib.sha256(canonical['serialized'].encode('utf8')).hexdigest(),
                         canonical['sha256'])
        self.assert_json_identical(json.loads(canonical['serialized']), before)
        self.assert_json_identical(json.loads(canonical['serialized']), canonical['reply'])
        # Execute actual JavaScript JSON parse/stringify twice, including the
        # full workshop export. Its numeric JSON spelling can change; the
        # separately preserved source string must keep the verifiable bytes.
        node = shutil.which('node')
        self.assertIsNotNone(node, 'Node is required for the real cross-language export regression')
        javascript = """const fs=require('node:fs'),crypto=require('node:crypto');
const exported=JSON.parse(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8'))));
const c=exported.result.canonical;
process.stdout.write(JSON.stringify({serialization:c.serialization,serialized:c.serialized,
sha256:crypto.createHash('sha256').update(c.serialized,'utf8').digest('hex'),
reformattedReplyDiffers:JSON.stringify(JSON.parse(c.serialized))!==c.serialized}));"""
        export = {'kind': 'su3-copy-teaching', 'input': self.first['request'], 'result': self.first}
        output = subprocess.check_output([node, '-e', javascript],
            input=json.dumps(export, ensure_ascii=False, separators=(',', ':')),
            text=True, encoding='utf8')
        transported = json.loads(output)
        self.assertEqual(transported['serialization'], canonical['serialization'])
        self.assertEqual(transported['serialized'], canonical['serialized'])
        self.assertEqual(transported['sha256'], canonical['sha256'])
        self.assertTrue(transported['reformattedReplyDiffers'])
        self.assert_json_identical(json.loads(transported['serialized']), before)
        self.assertEqual(before['dimension'], 64)
        self.assertEqual(before['arithmetic'], 'exact')
        self.assertTrue(all(v == '0' for v in before['exactChecks'].values()))
        for result in self.cases.values():
            self.assertEqual(result['canonical'], canonical)
        request = {'lab': 'su3_copy', 'angle': 45, 'phase': 'i'}
        request_before = deepcopy(request)
        result = lab.run(request)
        result['canonical']['reply']['coupledBasis'][0]['pattern'][0] = -999
        result['canonical']['serialized'] = 'mutated'
        result['pairs'][0]['s']['vector']['exact'][0][0] = '999'
        result['counterexample']['generators'][0]['transformed']['exact'][0][0] = '999'
        result['rotation']['embedding']['numeric'][0][0]['im'] = 999
        result['steps'][0]['text'] = 'mutated'
        self.assertEqual(lab.run(request), self.cases[45, 'i'])
        self.assertEqual(request, request_before)
        self.assertEqual(su3_cg.run(deepcopy(canonical['request'])), before)
        self.assertEqual(sp.ImmutableSparseMatrix(su3_cg_exact._coupling(1, 1, 1, 1)['matrix']), core_before)

    def test_all_eight_pairs_match_gt_and_actual_global_columns(self):
        result = self.first
        self.assertEqual(result['dimensions'], {'product':64,'inner':8,'outer':2,
                         'isotypic':16,'zeroWeightPerCopy':2,'zeroWeightBothCopies':4})
        self.assertEqual([p['mu'] for p in result['pairs']], list(range(8)))
        basis = result['canonical']['reply']['coupledBasis']
        product = result['canonical']['reply']['productBasis']
        zeros = []
        for pair, gt in zip(result['pairs'], self.gt['basis']['states']):
            self.assertEqual(pair['pattern'], gt['pattern'])
            self.assertEqual(pair['weight'], gt['weight'])
            self.assertEqual(pair['twoI'], gt['twoI'])
            self.assertEqual(pair['I']['exact'], gt['isospin']['I']['exact'])
            vectors = []
            for side, parity in [('s', 1), ('a', -1)]:
                data = pair[side]
                row = basis[data['canonicalColumn']]
                self.assertEqual((row['p'], row['q'], row['localIndex']), (1, 1, pair['mu']))
                for key in ('copy', 'blockIndex', 'swapParity'):
                    self.assertEqual(data[key], row[key])
                self.assertEqual(data['swapParity'], parity)
                vec, amplitude = matrix(data['vector']), matrix(data['amplitudeMatrix'])
                self.assert_zero(vec-self.c[:, row['index']])
                self.assertEqual(amplitude, sp.Matrix(8, 8, list(vec)))
                self.assert_zero(amplitude.T-parity*amplitude)
                self.assert_zero(vec.H*vec-sp.eye(1))
                terms = data['terms']
                self.assertEqual([t['productIndex'] for t in terms], [i for i,v in enumerate(vec) if v!=0])
                for term in terms:
                    i = term['productIndex']
                    self.assertEqual((term['leftIndex'], term['rightIndex']),
                                     (product[i]['leftIndex'],product[i]['rightIndex']))
                    self.assertEqual(term['label'], product[i]['label'])
                    self.assert_zero(value(term['coefficient']['exact'])-vec[i])
                vectors.append(vec)
                if pair['weight'] == [0, 0]: zeros.append((pair['mu'], tuple(pair['pattern']), row['index']))
            self.assert_zero(vectors[0].H*vectors[1])
        # Known canonical checkpoint; pairing above still comes from metadata.
        self.assertEqual(zeros, [(3,(2,0,1),50),(3,(2,0,1),58),
                                 (4,(1,1,1),51),(4,(1,1,1),59)])
        self.assert_zero(matrix(result['canonicalEmbedding'])-self.c8)

    def test_all_twelve_exact_full_space_basis_changes_and_invariants(self):
        b = sp.Matrix.vstack(sp.eye(8), sp.zeros(8))
        p = sp.diag(*([1]*8+[-1]*8))
        pi = self.c8*self.c8.H
        for (angle, phase), result in self.cases.items():
            with self.subTest(angle=angle, phase=phase):
                theta = sp.pi*angle/180
                z = {'1':1,'i':sp.I,'-1':-1,'-i':-sp.I}[phase]
                # Independently derive entries by sin/cos rather than adapter's table.
                r = sp.Matrix([[sp.cos(theta),-z*sp.sin(theta)],
                               [sp.sin(theta), z*sp.cos(theta)]])
                u = sp.kronecker_product(r, sp.eye(8))
                changed = matrix(result['rotation']['embedding'])
                bp = matrix(result['fixed']['bPrime'])
                pp = matrix(result['rotation']['exchange'])
                self.assert_zero(matrix(result['rotation']['R'])-r)
                self.assert_zero(matrix(result['rotation']['U'])-u)
                self.assert_zero(changed-self.c8*u)
                self.assert_zero(changed.H*changed-sp.eye(16))
                self.assert_zero(bp-u.H*b)
                self.assert_zero(pp-u.H*p*u)
                self.assert_zero(matrix(result['rotation']['exchangePair'])-r.H*sp.diag(1,-1)*r)
                self.assert_zero(matrix(result['fixed']['b'])-b)
                self.assert_zero(matrix(result['fixed']['productStates'])-self.c8*b)
                self.assert_zero(matrix(result['fixed']['reconstructed'])-changed*bp)
                self.assert_zero(changed*bp-self.c8*b)
                self.assert_zero(changed*changed.H-pi)
                self.assert_zero(sparse(result['projector']['canonical'])-pi)
                self.assert_zero(sparse(result['projector']['transformed'])-pi)
                self.assert_zero(bp.H*pp*bp-sp.eye(8))
                self.assert_zero(self.swap*changed-changed*pp)
                for state in result['fixed']['states']:
                    self.assert_zero(matrix(state['coordinates'])-sp.Matrix([sp.cos(theta),-sp.conjugate(z)*sp.sin(theta)]))
                    self.assert_zero(value(state['newCopyProbabilities'][0]['exact'])-sp.cos(theta)**2)
                    self.assert_zero(value(state['newCopyProbabilities'][1]['exact'])-sp.sin(theta)**2)
                    self.assertEqual(state['physicalSwapProbabilities']['plus']['exact'], '1')
                    self.assertEqual(state['physicalSwapProbabilities']['minus']['exact'], '0')
                    self.assertEqual([state[k]['exact'] for k in ('normBefore','normAfter','swapExpectation')], ['1']*3)
        # Explicit complex paper checkpoint protects conjugation and operator signs.
        complex_case = self.cases[45, 'i']
        self.assertEqual(matrix(complex_case['rotation']['exchangePair']),sp.Matrix([[0,-sp.I],[sp.I,0]]))
        self.assertEqual(matrix(complex_case['fixed']['states'][3]['coordinates']),sp.Matrix([1,sp.I])/sp.sqrt(2))

    def test_all_eight_generators_intertwine_every_derived_column(self):
        for result in self.cases.values():
            changed = matrix(result['rotation']['embedding'])
            u = matrix(result['rotation']['U'])
            self.assertEqual([g['id'] for g in result['generators']], list(self.ops))
            for entry in result['generators']:
                t = self.ops[entry['id']]
                total = sp.kronecker_product(t,sp.eye(8))+sp.kronecker_product(sp.eye(8),t)
                target = sp.kronecker_product(sp.eye(2),t)
                self.assert_zero(matrix(entry['standard'])-target)
                self.assert_zero(total*self.c8-self.c8*target)
                self.assert_zero(total*changed-changed*target)
                self.assert_zero(u.H*target*u-target)
                for key in ('canonicalResidual','rotatedResidual','standardUnchangedResidual'):
                    self.assertEqual(entry[key]['exact'], '0')

    def test_single_internal_column_counterexample_and_consistent_repair(self):
        case = self.first['counterexample']
        pair = next(p for p in self.first['pairs'] if p['mu']==case['mu'])
        self.assertEqual(case['canonicalColumn'],pair['s']['canonicalColumn'])
        q = sp.eye(16); q[case['mu'],case['mu']] = -1
        changed = matrix(case['embedding'])
        self.assert_zero(matrix(case['Q'])-q)
        self.assert_zero(changed-self.c8*q)
        self.assert_zero(changed.H*changed-sp.eye(16))
        self.assert_zero(changed*changed.H-self.c8*self.c8.H)
        for entry in case['generators']:
            t = self.ops[entry['id']]
            total=sp.kronecker_product(t,sp.eye(8))+sp.kronecker_product(sp.eye(8),t)
            target=sp.kronecker_product(sp.eye(2),t)
            repaired = matrix(entry['transformed'])
            self.assert_zero(repaired-q.H*target*q)
            self.assert_zero(total*changed-changed*repaired)
            self.assertEqual(entry['repairedResidual']['exact'],'0')
            if entry['id']=='E12':
                old=total*changed-changed*target
                self.assertTrue(any(sp.simplify(v)!=0 for v in old))
                self.assert_zero(sparse(case['oldE12Residual'])-old)
                max_square=max(sp.simplify(sp.conjugate(v)*v) for v in old)
                self.assert_zero(value(case['oldE12MaxAbs']['exact'])**2-max_square)
                self.assert_zero(value(case['oldE12MaxAbs']['exact'])-2*sp.sqrt(15)/5)

    def test_exact_latex_complex_previews_and_five_stage_export(self):
        checked_scalars, checked_matrices = set(), set()
        def visit(obj):
            if isinstance(obj, dict):
                if {'exact','latex','numeric'} <= set(obj):
                    signature=json.dumps(obj,sort_keys=True,ensure_ascii=False)
                    if isinstance(obj['exact'],str):
                        if signature in checked_scalars: return
                        checked_scalars.add(signature)
                        exact=value(obj['exact'])
                        self.assertEqual(obj['latex'],sp.latex(display_expression(exact)))
                        for part,oracle in [('re',sp.re(exact)),('im',sp.im(exact))]:
                            self.assertTrue(math.isfinite(obj['numeric'][part]))
                            self.assertAlmostEqual(obj['numeric'][part],float(oracle.evalf(17)),places=14)
                        return
                    if 'shape' in obj:
                        if signature in checked_matrices: return
                        checked_matrices.add(signature)
                        exact=matrix(obj)
                        self.assertEqual(obj['latex'],sp.latex(exact.applyfunc(display_expression)))
                        for i in range(exact.rows):
                            for j in range(exact.cols):
                                numeric=obj['numeric'][i][j]
                                self.assertAlmostEqual(numeric['re'],float(sp.re(exact[i,j]).evalf(17)),places=14)
                                self.assertAlmostEqual(numeric['im'],float(sp.im(exact[i,j]).evalf(17)),places=14)
                        return
                for v in obj.values(): visit(v)
            elif isinstance(obj,list):
                for v in obj: visit(v)
        for key,result in self.cases.items():
            self.assertEqual(result['schema'],'symmetry-lab-su3-copy-1')
            self.assertEqual([s['stage'] for s in result['steps']],list(range(1,6)))
            self.assertEqual(len(result['fixed']['states']),8)
            self.assertEqual(len(result['generators']),8)
            self.assertEqual(len(result['checks']),36)
            self.assertTrue(all(c['passed'] and c['residual']['exact']=='0' for c in result['checks']))
            self.assertIn(f'θ={key[0]}°',result['steps'][2]['text'])
            self.assertIn(f'ζ={key[1]}',result['steps'][2]['text'])
            self.assertEqual(json.loads(json.dumps(result,allow_nan=False)),result)
            visit(result)
        self.assertGreater(len(checked_scalars),20)
        self.assertGreater(len(checked_matrices),50)


if __name__ == '__main__':
    unittest.main(verbosity=2)
