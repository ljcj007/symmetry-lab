"""Attach reviewed lesson-to-exercise links without changing exercise content.

An empty list is intentional: use the exercise bank when no existing exercise
directly supports that lesson. Topic membership alone is not a lesson binding.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSON_DERIVATIONS = {
    'space-01': ['space-nacl-count'],
    'space-02': ['space-si-compose'],
    'space-03': ['space-si-compose'],
    'space-04': ['space-pminus1-orbit-stabilizer'],
    'space-05': ['space-si-compose'],  # Its final step derives the Bloch phase.
    'space-06': ['space-nio-cell'],  # An explicit primitive-basis/volume change.
    'double-01': ['double-si-interference'],
    'double-02': ['double-si-c2'],
    'double-03': ['double-si-c2', 'double-gaas-c3'],
    'double-04': ['double-gaas-kramers'],
    'magnetic-01': ['magnetic-iron-axial', 'magnetic-iron-mirror'],
    'magnetic-02': ['magnetic-nio-square', 'magnetic-mnf2-ligands'],
    'magnetic-03': ['magnetic-settings-macroscopic-constraints'],
    'magnetic-04': ['magnetic-nio-square'],
    'magnetic-05': ['magnetic-nio-square'],
    'double-05': ['double-q8-commutator'],
    'double-06': ['double-screw-boundary'],
    'color-01': ['color-c3-kernel'],
    'color-02': ['color-space-period'],
    'color-03': ['color-swap-antilinear-time-reversal'],
    'spin-01': ['spin-point-pair'],
    'spin-02': ['spin-space-helix'],
    'spin-03': ['spin-only-rank'],
    'spin-04': ['spin-soc-lock'],
}


def continuation_data(root=ROOT):
    path = root / 'dist/data/symmetry-course-lessons.json'
    lessons = json.loads(path.read_text(encoding='utf8'))
    exercises = json.loads((root / 'dist/data/symmetry-derivations.json').read_text(encoding='utf8'))
    by_id = {item['id']: item for item in exercises['exercises']}
    lesson_ids = {item['id'] for item in lessons['lessons']}
    assert set(LESSON_DERIVATIONS) == lesson_ids, 'Every lesson needs an explicit continuation decision'
    for lesson in lessons['lessons']:
        ids = LESSON_DERIVATIONS[lesson['id']]
        assert len(ids) == len(set(ids)), lesson['id']
        for exercise_id in ids:
            assert exercise_id in by_id, (lesson['id'], exercise_id)
            assert by_id[exercise_id]['track'] == lesson['track'], (lesson['id'], exercise_id)
        lesson['derivationIds'] = ids
    return path, lessons


def build(check=False):
    path, lessons = continuation_data()
    body = json.dumps(lessons, ensure_ascii=False, indent=2) + '\n'
    if check:
        assert path.read_text(encoding='utf8') == body, 'Lesson continuations are stale; run build-course-continuations.py'
    else:
        path.write_text(body, encoding='utf8', newline='\n')
    return lessons


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build(check=args.check)
    print('Reviewed course continuations:', len(data['lessons']), 'lessons,',
          sum(bool(item['derivationIds']) for item in data['lessons']), 'with related exercises')
