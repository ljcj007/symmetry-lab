"""Freeze genuine shared-API one-phonon amplitude ledgers, with complete inputs."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))


def inputs():
    from dynamic_scattering_lab import parameters
    base = {'qPoints': 31, 'energyPoints': 121, 'sigma': 2., 'energyMin': -60., 'energyMax': 60.}
    mono = {'massA': 20., 'massB': 20., 'springIntra': 3., 'springInter': 3., 'basisFraction': .5}
    overrides = [
        ('default', {}),
        ('unequal-gamma', {'selectedQ': 2*math.pi/4}),
        ('folded-even', {**mono, 'selectedQ': 2.23*2*math.pi/4}),
        ('folded-odd', {**mono, 'selectedQ': 1.23*2*math.pi/4}),
        ('zero-projection', {'angle': 90.}),
        ('signed-weights', {'basisFraction': .37, 'scatterA': 2., 'scatterB': -1.2, 'springInter': .8, 'selectedQ': 2.1}),
        ('degenerate-edge', {**mono, 'selectedQ': math.pi/4}),
    ]
    return [(name, {**parameters({**base, **override}), 'includeAmplitudeReplay': True}) for name, override in overrides]


def regression_inputs():
    """A genuinely grouped near-degeneracy that must not enable exact mixing."""
    from dynamic_scattering_lab import parameters
    return [('near-degenerate-no-mixing', {**parameters({
        'massA':20., 'massB':20.+1e-9, 'springIntra':3., 'springInter':3.,
        'selectedQ':math.pi/4, 'qPoints':31, 'energyPoints':121, 'sigma':2.,
        'energyMin':-60., 'energyMax':60.,
    }), 'includeAmplitudeReplay':True})]


def compare(actual, expected, path='fixture'):
    assert type(actual) is type(expected), path+': JSON type changed'
    if isinstance(actual, dict):
        assert list(actual) == list(expected), path+': keys/order changed'
        for key in actual:
            compare(actual[key], expected[key], path+'/'+key)
    elif isinstance(actual, list):
        assert len(actual) == len(expected), path+': array shape changed'
        for i, (a, b) in enumerate(zip(actual, expected)):
            compare(a, b, path+'/'+str(i))
    elif type(actual) is float:
        assert math.isfinite(actual) and math.isfinite(expected) and math.isclose(actual, expected, rel_tol=2e-12, abs_tol=2e-12), path+': numeric reference changed'
    else:
        assert actual == expected, path+': exact leaf changed'


def build(check=False):
    from browser_api import run
    cases = []
    for case_id, payload in inputs():
        result = run('dynamic_scattering_lab', payload)
        replay = result['data']['amplitudeReplay']
        assert replay['schema'] == 'symmetry-lab-scattering-amplitude-replay-1'
        assert replay['checks']['passed']
        cases.append({'id': case_id, 'action': 'dynamic_scattering_lab', 'input': payload, 'result': result})
    regressions = []
    for case_id, payload in regression_inputs():
        result = run('dynamic_scattering_lab', payload)
        replay = result['data']['amplitudeReplay']
        assert replay['groups'][0]['degeneracy'] == 2
        assert replay['mixingEnergyTolerance'] < replay['groups'][0]['energySpread'] < replay['energyGroupingTolerance']
        assert replay['degenerateMixing'] is None
        regressions.append({'id': case_id, 'action': 'dynamic_scattering_lab', 'input': payload, 'result': result})
    names = ['dist/python/dynamic_scattering_lab.py', 'dist/python/browser_api.py']
    document = {'schema': 'symmetry-lab-scattering-replay-fixture-1',
                'method': 'Eight complete actual browser_api.run requests: seven teaching references and one near-degeneracy regression. Replay serializes each selected calculation and never runs another eigensolve.',
                'sourceHashEncoding': 'utf8-lf-v1',
                'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf8').encode('utf8')).hexdigest() for name in names},
                'cases': cases, 'regressionCases': regressions}
    target = ROOT/'scripts/fixtures/scattering-replay.json'
    if check:
        compare(document, json.loads(target.read_text(encoding='utf8')))
    else:
        target.write_text(json.dumps(document, ensure_ascii=False, allow_nan=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps({'cases': len(cases), 'regressionCases':len(regressions), 'actualAPICalls':len(cases)+len(regressions), 'selectedBranches': 2*(len(cases)+len(regressions)), 'publicAPI': True,
                      'bytes': target.stat().st_size, 'checked': check}))
    return document


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
