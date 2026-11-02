"""Retain positive, adversarial, original-source and path-convention evidence."""
from pathlib import Path
import datetime
import io
import json
import platform
import time
import unittest
import numpy as np
import test_fe
from analyze_fe import analyze_save, analyze_frame, export_branch_csv, path_audit, sha, write_json
from source_data import source_directory

HERE = Path(__file__).resolve().parent


def main():
    report_dir = HERE/'reports'
    report_dir.mkdir(exist_ok=True)
    stream = io.StringIO()
    start = time.perf_counter()
    suite = unittest.defaultTestLoader.loadTestsFromModule(test_fe)
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    (report_dir/'TESTS.txt').write_text(stream.getvalue(), encoding='utf-8')
    report = {'status': 'PASS' if result.wasSuccessful() else 'FAIL',
              'created_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'tests_run': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
              'skipped': len(result.skipped), 'wall_seconds': time.perf_counter()-start,
              'python': platform.python_version(), 'numpy': np.__version__,
              'test_output_sha256': sha(report_dir/'TESTS.txt'),
              'source_hashes': {p.name: sha(p) for p in HERE.glob('*.py')},
              'new_DFT_executed_by_tests': False, 'website_changed': False}
    write_json(report_dir/'TEST_REPORT.json', report)
    if not result.wasSuccessful():
        raise SystemExit(1)
    old = analyze_save(source_directory()/'Fe.save')
    write_json(report_dir/'OLD_8_POINT_ANALYSIS.json', old)
    export_branch_csv(report_dir/'OLD_8_POINT_ANALYSIS.csv', old)
    write_json(report_dir/'PATH_AUDIT.json', old['conventions'])
    energy, frame, image = test_fe.crossing(0)
    cases = {'correct_crossing_left': analyze_frame(*test_fe.crossing(-.1)),
             'correct_crossing_right': analyze_frame(*test_fe.crossing(.1)),
             'closed_prefix': analyze_frame(energy, frame, image),
             'false_spinless_lift': analyze_frame(energy, frame, frame)}
    energy, frame, image = test_fe.crossing(-.1)
    image[:, [0,18]] = image[:, [18,0]]
    cases['false_energy_mixing'] = analyze_frame(energy, frame, image)
    write_json(report_dir/'SYNTHETIC_COUNTEREXAMPLES.json', {
        'synthetic': True, 'source': 'test_fe.crossing', 'new_DFT_data': False,
        'cases': cases, 'purpose': 'Detect invalid labeling and energy/symmetry conventions, not model real Fe.'})
    print(json.dumps(report))


if __name__ == '__main__':
    main()
