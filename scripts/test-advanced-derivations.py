"""Check production exercises using exact contractions, LR tableaux and live API output.

The independent checks below establish the stated finite teaching examples.
They do not infer a general SU(3) implementation proof from unitarity alone.
"""
from collections import Counter
from functools import lru_cache
from pathlib import Path
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import unittest

import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run as public_run

BINDINGS = {
    'su3-racah-three-bar-path-space': ('su3-racah-coupling-paths', 'racah-three-bar-three'),
    'su3-ninej-color-octet-phase-paths': ('su3-ninej-color-complex', 'su3-ninej-color-octet'),
    'su3-ninej-adjoint-32-casimir-spectrum': ('su3-ninej-adjoint-observables', 'su3-ninej-four-octets-adjoint'),
    'su3-ninej-decuplet-fifteen-label-copies': ('su3-ninej-high-input-labels', 'su3-ninej-decuplet-four')}


def exact(source):
    """Evaluate only rational/root literal arithmetic, never arbitrary course code."""
    source = source.strip().replace('−', '-').replace('·', '*').replace('×', '*')
    source = re.sub(r'([0-9])⁴', r'\1**4', source)
    source = re.sub(r'√([0-9]+)', r'sqrt(\1)', source)
    source = re.sub(r'(?<=[0-9)])(?=sqrt)', '*', source)
    tree = ast.parse(source, mode='eval')

    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) is int:
            return sp.Integer(node.value)
        if isinstance(node, ast.List): return [visit(x) for x in node.elts]
        if isinstance(node, ast.Tuple): return tuple(visit(x) for x in node.elts)
        if isinstance(node, ast.Name) and node.id in ('i', 'I'): return sp.I
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub): return -visit(node.operand)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.UAdd): return visit(node.operand)
        if isinstance(node, ast.BinOp):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add): return left + right
            if isinstance(node.op, ast.Sub): return left - right
            if isinstance(node.op, ast.Mult): return left * right
            if isinstance(node.op, ast.Div): return left / right
            if isinstance(node.op, ast.Pow) and right.is_Integer: return left ** right
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                and node.func.id == 'sqrt' and len(node.args) == 1 and not node.keywords):
            return sp.sqrt(visit(node.args[0]))
        raise AssertionError('Unsupported literal expression: ' + source)
    return visit(tree.body)


def formula(item, index): return item['steps'][index]['formula']


def rhs(text, name):
    """Read the displayed assignment, bounded by the authored line/semicolon."""
    assert name in text, (name, text)
    return re.split(r'[；，\n]', text.split(name, 1)[1], maxsplit=1)[0].strip()


def tuple_value(text, name):
    value = rhs(text, name)
    if '=' in value: value = value.rsplit('=', 1)[1].strip()
    value = value.removesuffix('ᵀ')
    result = exact(value)
    assert isinstance(result, (tuple, list))
    return tuple(result)


def scalar(text, name): return exact(rhs(text, name))


def chain_values(text, name): return [exact(x) for x in rhs(text, name).split('=')]


def matrix(rows): return sp.Matrix([[exact(x) for x in row] for row in rows])


def assert_zero(test, value):
    values = list(value) if isinstance(value, sp.MatrixBase) else [value]
    test.assertTrue(all(sp.simplify(x) == 0 for x in values), value)


def dimension(p, q): return (p + 1) * (q + 1) * (p + q + 2) // 2


def casimir(p, q): return sp.Rational(p*p + q*q + p*q + 3*p + 3*q, 3)


@lru_cache(maxsize=None)
def lr(left, right):
    """Independent SU(3) LR tableaux count; no GT/coupling implementation imported."""
    base = (left[0] + left[1], left[1], 0)
    content = (right[0] + right[1], right[1], 0)
    boxes = sum(base) + sum(content)
    result = Counter()
    for first in range(boxes, -1, -1):
        for second in range(min(first, boxes - first), -1, -1):
            third = boxes - first - second
            shape = (first, second, third)
            if not 0 <= third <= second or any(a < b for a, b in zip(shape, base)): continue
            cells = [(r, c) for r in range(3) for c in range(shape[r] - 1, base[r] - 1, -1)]
            filled, used = {}, [0, 0, 0]

            def fill(index):
                if index == len(cells): return 1
                row, col = cells[index]
                count = 0
                for value in range(1, 4):
                    k = value - 1
                    if used[k] >= content[k]: continue
                    if (row, col + 1) in filled and value > filled[row, col + 1]: continue
                    if (row - 1, col) in filled and value <= filled[row - 1, col]: continue
                    used[k] += 1
                    if used[0] >= used[1] >= used[2]:
                        filled[row, col] = value
                        count += fill(index + 1)
                        del filled[row, col]
                    used[k] -= 1
                return count
            copies = fill(0)
            if copies: result[first - second, second - third] += copies
    return tuple(sorted(result.items()))


def pair_path_counts(factors, target):
    counts = Counter()
    for g, ng in lr(tuple(factors[0]), tuple(factors[1])):
        for h, nh in lr(tuple(factors[2]), tuple(factors[3])):
            root = dict(lr(g, h)).get(target, 0)
            counts[g] += ng * nh * root
    return +counts


class AdvancedDerivations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bank = json.loads((ROOT / 'dist/data/lie-derivations.json').read_text(encoding='utf-8'))
        cls.by_id = {row['id']: row for row in cls.bank['exercises']}
        cls.lessons = {row['id']: row for row in json.loads(
            (ROOT / 'dist/data/lie-group-lessons.json').read_text(encoding='utf-8'))['lessons']}
        node = os.environ.get('NODE') or shutil.which('node')
        if not node: raise AssertionError('Node is required to inspect the registered presets')
        names = [preset for _, preset in BINDINGS.values()]
        color_item=cls.by_id['su3-ninej-color-octet-phase-paths']
        manual_note=next(s for s in color_item['givens'] if 'JSON：' in s)
        manual_values=json.loads(re.search(r'JSON：(\[.*\])。',manual_note).group(1))
        # Exercise instructions use the GUI's scalar shorthand. Run its actual
        # input reader so the dispatcher receives the required {re,im} entries.
        script = ("import {physicsPresets} from './dist/lie-physics-ui.js';"
                  "import {readNineJPayload} from './dist/su3-ninej-ui.js';const names="
                  + json.dumps(names) + ";const presets=Object.fromEntries("
                  "names.map(name=>{if(!physicsPresets[name])throw Error(name);return [name,physicsPresets[name]]}));"
                  "const base=presets['su3-ninej-color-octet'].input;const nodes={};"
                  "base.factors.forEach((v,i)=>nodes['#lg-ninej-factor'+(i+1)]={value:v.join(',')});"
                  "nodes['#lg-ninej-target']={value:base.target.join(','),_ninejTargets:[{p:1,q:1,multiplicity:4}]};"
                  "nodes['#lg-ninej-direction']={value:base.direction};nodes['#lg-ninej-mode']={value:'vector'};"
                  "nodes['#lg-ninej-vector']={value:JSON.stringify(" + json.dumps(manual_values) + ")};"
                  "const manual=readNineJPayload(key=>nodes[key],()=>{throw Error('unexpected numeric control')});"
                  "process.stdout.write(JSON.stringify({presets,manual}));")
        registered = json.loads(subprocess.check_output(
            [node, '--input-type=module', '-e', script], cwd=ROOT, text=True, encoding='utf-8'))
        cls.presets,cls.manual_color=registered['presets'],registered['manual']
        cls.results = {}
        for exercise_id, (_, preset_name) in BINDINGS.items():
            preset = cls.presets[preset_name]
            cls.results[exercise_id] = public_run('teaching_labs',
                {'lab': 'lie', 'experiment': preset['experiment'], **preset['input']})
        cls.ninej_fixture = json.loads((ROOT / 'scripts/fixtures/su3-ninej-ui.json').read_text(encoding='utf-8'))

    def test_structure_and_genuine_preset_associations(self):
        self.assertGreaterEqual(len(self.bank['exercises']), 44)
        self.assertEqual(len(self.by_id), len(self.bank['exercises']))
        for eid, (lesson_id, preset_name) in BINDINGS.items():
            item, lesson = self.by_id[eid], self.lessons[lesson_id]
            with self.subTest(exercise=eid):
                self.assertEqual(item['lessonIds'], [lesson_id])
                self.assertEqual((item['lab'], item['labPreset']), (lesson['lab'], lesson['labPreset']))
                self.assertEqual(item['labPreset'], preset_name)
                self.assertEqual(item['lab'], self.presets[preset_name]['experiment'])
                self.assertEqual(len(item['steps']), 6)
                for step in item['steps']:
                    self.assertTrue(step['title'] and step['explanation'] and step['formula'])
                self.assertEqual(item['references'], lesson['references'])
                self.assertTrue(item['hint'] and item['answer'] and item['pitfall'])
                self.assertIn(item['check']['answer'], range(len(item['check']['choices'])))
                self.assertEqual(set(self.results[eid]['exactChecks'].values()), {'0'})
        for eid,index,marker,matrix_name in [
            ('su3-racah-three-bar-path-space',1,'₃','F'),
            ('su3-ninej-color-octet-phase-paths',1,'₈','R'),
            ('su3-ninej-adjoint-32-casimir-spectrum',0,'₈','R'),
            ('su3-ninej-decuplet-fifteen-label-copies',3,'₁₅','R')]:
            item,result=self.by_id[eid],self.results[eid]
            text=formula(item,index)
            for value in chain_values(text,'N='):self.assertEqual(value,result['dimension'])
            self.assertEqual(scalar(text,'m'+marker+'='),result['multiplicity'])
            self.assertEqual(scalar(text,'dim V'+marker+'='),result['target']['dimension'])
            for value in chain_values(text,'dim(同型块)='):
                self.assertEqual(value,result['multiplicity']*result['target']['dimension'])
            self.assertEqual(tuple(map(int,rhs(text,'size('+matrix_name+')=').split('×'))),
                             (result['multiplicity'],result['multiplicity']))

    def test_racah_by_independent_invariant_contractions(self):
        item = self.by_id['su3-racah-three-bar-path-space']
        actual = self.results[item['id']]
        # At a fixed final fundamental component, AB and BC singlets are
        # normalized Kronecker contractions in the ordered 27-state basis.
        states = [(i, j, k) for i in range(3) for j in range(3) for k in range(3)]
        left1 = sp.Matrix([sp.Integer(i == j and k == 0) / sp.sqrt(3) for i, j, k in states])
        right1 = sp.Matrix([sp.Integer(i == 0 and j == k) / sp.sqrt(3) for i, j, k in states])
        left8 = (3*right1 - left1) / (2*sp.sqrt(2))
        right8 = (3*left1 - right1) / (2*sp.sqrt(2))
        expected = sp.Matrix.hstack(right8, right1).T * sp.Matrix.hstack(left8, left1)
        displayed = sp.Matrix(exact(rhs(formula(item, 2), 'F=')))
        assert_zero(self, displayed - expected)
        assert_zero(self, matrix(actual['exactFMatrix']) - expected)
        b = sp.Matrix(tuple_value(formula(item, 3), 'b='))
        assert_zero(self, b - expected[:, 0])
        self.assertEqual(tuple_value(formula(item, 3), 'P='), tuple(sp.simplify(x*x) for x in b))
        assert_zero(self, expected.T*b - sp.Matrix([1, 0]))
        self.assertEqual(actual['dimension'], 27)
        self.assertEqual(actual['multiplicity'], 2)
        self.assertEqual([p['intermediate']['dimension'] for p in actual['leftPaths']], [8, 1])
        self.assertEqual(sum(dict(lr((1,0), (0,1))).get(e, 0) * dict(lr(e, (1,0))).get((1,0), 0)
                             for e in [(1,1), (0,0)]), 2)

    def test_color_four_paths_complex_state_and_real_interference(self):
        item = self.by_id['su3-ninej-color-octet-phase-paths']
        actual = self.results[item['id']]
        r = matrix(actual['exactRecouplingMatrix'])
        assert_zero(self, r.T*r - sp.eye(4))
        self.assertEqual(pair_path_counts([(1,0),(0,1),(1,0),(0,1)], (1,1)), Counter({(1,1):3,(0,0):1}))
        self.assertEqual([p['finalCopy'] for p in actual['leftPaths'][:2]], [1,2])
        self.assertEqual(tuple_value(formula(item, 2), 'R e₀='), tuple(r[:,0]))
        self.assertEqual(tuple_value(formula(item, 2), 'P_basis='), tuple(sp.simplify(x*x) for x in r[:,0]))
        self.assertEqual(tuple_value(formula(item, 3), 'R e₂='), tuple(r[:,2]))
        self.assertIn('a=(e₀+i e₂)/√2', formula(item, 3))
        a = sp.Matrix([1,0,sp.I,0]) / sp.sqrt(2)
        b = r*a
        probs = tuple(sp.simplify(sp.conjugate(x)*x) for x in b)
        self.assertEqual(tuple_value(formula(item, 4), 'P_complex='), probs)
        self.assertEqual(sum(probs), 1)
        assert_zero(self, r.T*b-a)
        real_b = r*sp.Matrix([1,0,1,0])/sp.sqrt(2)
        self.assertEqual(scalar(formula(item, 5), 'P₀='), sp.simplify(real_b[0]**2))
        self.assertEqual(scalar(formula(item, 5), 'P₃='), sp.simplify(real_b[3]**2))
        self.assertEqual(sp.simplify(real_b[1]**2), sp.Rational(1,8))
        self.assertEqual(sp.simplify(real_b[2]**2), sp.Rational(1,8))
        self.assertIn('手动', ' '.join(item['givens']))
        payload = {'lab':'lie','experiment':'su3_ninej', **self.manual_color}
        output = public_run('teaching_labs', payload)
        self.assertEqual(tuple(exact(x) for x in output['exactOutputProbabilities']), probs)
        with self.assertRaises(ValueError):
            public_run('teaching_labs', {**payload, 'state':{'amplitudes':[1,0,0]}})

    def test_adjoint_complete_path_counts_and_casimir_moments(self):
        item = self.by_id['su3-ninej-adjoint-32-casimir-spectrum']
        actual = self.results[item['id']]
        order = [(2,2),(3,0),(0,3),(1,1),(0,0)]
        independent = pair_path_counts([(1,1)]*4, (1,1))
        counts = Counter((p['firstIntermediate']['p'],p['firstIntermediate']['q']) for p in actual['rightPaths'])
        self.assertEqual(counts, independent)
        self.assertEqual(tuple_value(formula(item, 1), 'n_G='), tuple(counts[g] for g in order))
        self.assertEqual(sum(counts.values()), 32)
        self.assertEqual((actual['dimension'],actual['multiplicity'],actual['target']['dimension']), (4096,32,8))
        self.assertEqual((actual['leftPaths'][0]['firstIntermediate']['p'], actual['leftPaths'][0]['firstIntermediate']['q']), (2,2))
        self.assertEqual((actual['leftPaths'][0]['secondIntermediate']['p'], actual['leftPaths'][0]['secondIntermediate']['q']), (2,2))
        self.assertEqual(actual['leftPaths'][0]['finalCopy'], 1)
        r = matrix(actual['exactRecouplingMatrix'])
        assert_zero(self, r.T*r-sp.eye(32))
        b = r[:,0]
        grouped = Counter()
        energies = []
        for value, path in zip(b, actual['rightPaths']):
            g = (path['firstIntermediate']['p'],path['firstIntermediate']['q'])
            grouped[g] += sp.simplify(value*value)
            energies.append((casimir(*g)-2*casimir(1,1))/2)
        self.assertEqual(tuple_value(formula(item, 2), 'ε_G/κ='), tuple((casimir(*g)-6)/2 for g in order))
        self.assertEqual(tuple_value(formula(item, 3), 'P_G='), tuple(grouped[g] for g in order))
        self.assertEqual(sum(grouped.values()), 1)
        mean = sp.simplify(sum(b[i]**2*energies[i] for i in range(32)))
        second = sp.simplify(sum(b[i]**2*energies[i]**2 for i in range(32)))
        variance = sp.simplify(second-mean**2)
        self.assertEqual(scalar(formula(item, 4), '⟨O⟩/κ='), mean)
        self.assertEqual(scalar(formula(item, 4), '⟨O²⟩/κ²='), second)
        self.assertEqual(scalar(formula(item, 4), 'Var(O)/κ²='), variance)
        self.assertGreater(variance, 0)
        left_action = r.T*sp.diag(*energies)*b
        self.assertEqual(sp.simplify(left_action[0]), mean)
        self.assertEqual(sp.simplify((left_action.T*left_action)[0]), second)
        self.assertIn('手算／导出复核', ' '.join(item['givens']))
        self.assertIn('不是当前实验按钮的直接结果', item['answer'])
        # A separate original final-singlet double-singlet fixture is not this state.
        old = self.ninej_fixture['octetsSinglet']
        old_probs = list(map(exact, old['exactOutputProbabilities']))
        old_energies = [(casimir(p['firstIntermediate']['p'],p['firstIntermediate']['q'])-6)/2 for p in old['rightPaths']]
        old_mean = sp.simplify(sum(p*e for p,e in zip(old_probs,old_energies)))
        old_var = sp.simplify(sum(p*e*e for p,e in zip(old_probs,old_energies))-old_mean**2)
        self.assertEqual((old['multiplicity'],old_mean,old_var), (8,0,sp.Rational(9,8)))
        self.assertNotEqual(mean,old_mean)

    def test_high_input_labels_copies_and_restored_column(self):
        item = self.by_id['su3-ninej-decuplet-fifteen-label-copies']
        actual = self.results[item['id']]
        self.assertEqual((dimension(2,1),dimension(4,0)), (15,15))
        self.assertNotEqual(casimir(2,1),casimir(4,0))
        for label in [(2,1),(4,0)]:
            text = formula(item,0)
            name = f'{label[0]},{label[1]}'
            self.assertEqual(scalar(text,'d('+name+')='), dimension(*label))
            self.assertEqual(scalar(text,'C₂('+name+')='), casimir(*label))
        types = [(p['firstIntermediate']['p'],p['firstIntermediate']['q'],p['secondIntermediate']['p'],p['secondIntermediate']['q'],p['finalCopy']) for p in actual['leftPaths']]
        self.assertEqual(types, [(4,0,1,1,1),(2,1,1,1,1),(2,1,1,1,2),(2,1,0,0,1)])
        self.assertEqual(dict(lr((2,1),(1,1)))[2,1], 2)
        self.assertEqual(dict(lr((4,0),(1,1)))[2,1], 1)
        r = matrix(actual['exactRecouplingMatrix'])
        self.assertEqual(tuple_value(formula(item,4),'R e₀='), tuple(r[:,0]))
        self.assertEqual(tuple_value(formula(item,4),'P='), tuple(sp.simplify(x*x) for x in r[:,0]))
        self.assertEqual(sum(tuple_value(formula(item,4),'P=')), 1)
        assert_zero(self,r-r.T)
        assert_zero(self,r*r-sp.eye(4))
        self.assertEqual(actual['dimension'],270)
        self.assertEqual(actual['multiplicity']*actual['target']['dimension'],60)

    def test_equal_dimension_manual_input_changes_path_multiplicity(self):
        for label, expected in [((2,1),5),((4,0),4)]:
            factors=[label,(1,0),(0,1),(1,0)]
            count=sum(pair_path_counts(factors,(3,1)).values())
            self.assertEqual(count,expected)
            request={'lab':'lie','experiment':'su3_ninej','factors':[list(x) for x in factors],
                     'target':[3,1],'direction':'left_to_right','state':{'index':0}}
            result=public_run('teaching_labs',request)
            self.assertEqual((result['dimension'],result['multiplicity']), (405,count))
        for label in [[2,2],[3,0]]:
            with self.assertRaisesRegex(ValueError,'4096'):
                public_run('teaching_labs',{'lab':'lie','experiment':'su3_ninej',
                    'factors':[label]*4,'target':[1,1],'state':{'index':0}})


if __name__ == '__main__':
    unittest.main(verbosity=2)
