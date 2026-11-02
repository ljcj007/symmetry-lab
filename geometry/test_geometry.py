"""Replay exact positive cases, coverage mutations and periodic counterexamples."""
from copy import deepcopy
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import exact_geometry as g
from independent_census import check as independent_check

HERE = Path(__file__).resolve().parent


def write(path, obj):
    path.write_text(json.dumps(obj, indent=2), encoding='utf-8')


def main():
    run = HERE/'tests'/'runs'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    run.mkdir(parents=True)
    problem = json.loads((HERE/'diagonal_mirror.problem.json').read_text(encoding='utf-8'))
    cert = json.loads((HERE/'diagonal_mirror.certificate.json').read_text(encoding='utf-8'))
    rows = []

    def cli(name, p, c, expected, reason_contains=None):
        pp, cp = run/(name+'.problem.json'), run/(name+'.certificate.json')
        write(pp, p)
        write(cp, c)
        r = subprocess.run([sys.executable, '-B', '-I', str(HERE/'exact_geometry.py'),
                            '--problem', str(pp), '--certificate', str(cp)],
                           capture_output=True, text=True, encoding='utf-8', timeout=45)
        (run/(name+'.stdout.json')).write_text(r.stdout, encoding='utf-8')
        (run/(name+'.stderr.txt')).write_text(r.stderr, encoding='utf-8')
        observed = json.loads(r.stdout)
        ok = observed['status'] == expected and r.returncode == {'CERTIFIED': 0, 'INVALID': 1, 'UNRESOLVED': 2}[expected]
        if reason_contains is not None:
            ok = ok and reason_contains in observed.get('reason', '')
        rows.append({'case': name, 'expected': expected, 'observed': observed, 'exit_code': r.returncode, 'pass': ok})

    cli('diagonal-mirror-grey', problem, cert, 'CERTIFIED')
    cube = {'schema': 'rational-arrangement-v1', 'dimension': 3, 'operations': []}
    cli('plain-three-torus-cube', cube, g.construct(cube), 'CERTIFIED')
    rational = {**cube, 'period_axes': [], 'planes': [
        {'normal': [1, 2, 3], 'offset': '1/3'},
        {'normal': [2, -1, 1], 'offset': '5/7'}]}
    rc = g.construct(rational)
    cli('general-rational-oblique-region', rational, rc, 'CERTIFIED')
    triply = {**cube, 'planes': [{'normal': [1, 1, 1], 'offset': x} for x in ['1/2', '3/2', '5/2']]}
    cli('three-coordinate-periodic-oblique-arrangement', triply, g.construct(triply), 'CERTIFIED')
    tiny = {**cube, 'period_axes': [], 'planes': [{'normal': [1, 1, 1], 'offset': '1/1000000000000000000'}]}
    cli('exact-thin-region-no-tolerance-collapse', tiny, g.construct(tiny), 'CERTIFIED')
    redundant = deepcopy(problem)
    redundant['planes'] = [{'normal': [2, -2, 0], 'offset': 0}, {'normal': [-7, 7, 0], 'offset': 0}]
    cli('equivalent-plane-normalization', redundant, cert, 'CERTIFIED')

    mutations = []
    for dim in range(4):
        c = deepcopy(cert)
        c['cells'].pop(next(i for i, rec in enumerate(c['cells']) if rec['dimension'] == dim))
        mutations.append((f'omitted-dimension-{dim}-cell', c))
    for field in ('planes', 'incidences', 'period_pairs', 'period_squares', 'period_cubes'):
        c = deepcopy(cert)
        c[field].pop()
        mutations.append(('omitted-'+field, c))
    c = deepcopy(cert)
    c['cells'][0]['vertices'][0][0] = '1/999'
    mutations.append(('wrong-exact-vertex', c))
    c = deepcopy(cert)
    c['cells'][0]['witness'][0] = '1/999'
    mutations.append(('wrong-interior-witness', c))
    c = deepcopy(cert)
    c['cells'][0]['stabilizer'] = ['E']
    mutations.append(('lost-special-point-enhancement', c))
    c = deepcopy(cert)
    c['cells'][0]['dimension'] = False
    mutations.append(('boolean-not-integer-dimension', c))
    c = deepcopy(cert)
    c['cells'][0]['dimension'] = 0.0
    mutations.append(('float-not-exact-integer', c))
    c = deepcopy(cert)
    c['period_pairs'][0]['target'] = c['period_pairs'][0]['source']
    mutations.append(('wrong-period-target', c))
    c = deepcopy(cert)
    c['period_squares'][0]['via_a'] = c['period_squares'][0]['source']
    mutations.append(('wrong-period-intermediate-cell', c))
    c = deepcopy(cert)
    c['period_cubes'][0]['paths'].pop()
    mutations.append(('missing-one-of-six-cube-paths', c))
    for name, c in mutations:
        cli(name, problem, c, 'INVALID')
    nonperiodic = {**cube, 'planes': [{'normal': [1, 2, 0], 'offset': '1/2'}]}
    cli('same-corners-different-face-interior-cuts', nonperiodic, {}, 'INVALID', 'periodic face arrangements do not agree cell by cell')
    malformed = deepcopy(problem)
    malformed['operations'][1]['anti'] = 0
    cli('nonboolean-antiunitary-flag', malformed, cert, 'INVALID')
    malformed = deepcopy(problem)
    malformed['operations'][1]['rotation'][0][1] = '1/2'
    cli('nonintegral-lattice-action', malformed, cert, 'INVALID')
    malformed = {**cube, 'planes': [{'normal': [1, 2, 3, 4], 'offset': 0}]}
    cli('four-coordinate-plane-normal', malformed, {}, 'INVALID')
    cli('list-is-not-a-problem-object', [], {}, 'INVALID')
    malformed = {**cube, 'planes': [{'normal': [1, 0, 0], 'offset': '1e1000000000'}]}
    cli('scientific-exponent-not-rational-token', malformed, {}, 'INVALID')
    large = {**cube, 'planes': [{'normal': [1, 0, 0], 'offset': str(2**513)}]}
    cli('rational-bit-budget', large, {}, 'UNRESOLVED')

    budgets = []
    for key, amount in [('max_planes', 6), ('max_vertices', 8), ('max_cells', 27),
                        ('max_triples', 1), ('max_incidence_pairs', 1)]:
        result = g.verify(problem, cert, {key: amount})
        budgets.append({'limit': key, 'value': amount, 'result': result, 'pass': result['status'] == 'UNRESOLVED'})
    census = independent_check(cert)
    # Reconstruct geometric equality with exact points sampled at generic and
    # special locations, including a T-only point and a genuinely oblique face.
    points = [('oblique-mirror', ['1/3', '1/3', '1/7'], ['E', 'M']),
              ('T-only', ['0', '1/2', '0'], ['E', 'T']),
              ('anti-only-line', ['1/3', '2/3', '0'], ['E', 'MT']),
              ('generic', ['1/7', '2/7', '3/7'], ['E']),
              ('all-group', ['1/2', '1/2', '1/2'], ['E', 'M', 'T', 'MT'])]
    checks = []
    for name, coords, expected in points:
        q = list(map(Fraction, coords))
        signs = []
        for plane in cert['planes']:
            val = sum(Fraction(x)*y for x, y in zip(plane['normal'], q))-plane['offset']
            signs.append((val > 0)-(val < 0))
        cell = next(c for c in cert['cells'] if c['signs'] == signs)
        checks.append({'case': name, 'point': coords, 'cell': cell['id'],
                       'observed': cell['stabilizer'], 'expected': expected,
                       'pass': cell['stabilizer'] == expected})
    euler = sum((-1)**c['dimension'] for c in cert['cells'])
    report = {'status': 'PASS' if all(x['pass'] for x in rows+budgets+checks) and euler == 1 else 'FAIL',
              'cli_count': len(rows), 'cli_cases': rows, 'resource_checks': budgets,
              'independent_census': census, 'stabilizer_checks': checks,
              'cube_euler_characteristic': euler,
              'source_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in
                                [HERE/'exact_geometry.py', HERE/'independent_census.py', HERE/'test_geometry.py']}}
    write(run/'RESULTS.json', report)
    write(HERE/'TESTS_LATEST.json', {'path': str((run/'RESULTS.json').relative_to(HERE)), 'status': report['status'], 'cli_count': len(rows)})
    print(json.dumps({'status': report['status'], 'cli_count': len(rows), 'resource_checks': len(budgets), 'stabilizer_checks': len(checks), 'report': str(run/'RESULTS.json')}, indent=2))
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
