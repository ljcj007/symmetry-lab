"""Insert the authored Seitz order exercise without changing earlier derivations."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXERCISE_ID = 'space-seitz-pair-folding'


def exercise():
    return {
        'id': EXERCISE_ID,
        'track': 'space',
        'title': '交换 Seitz 操作的次序，再折回参考晶胞',
        'modelLabel': '旋转与半格平移',
        'prompt': '分别计算 AB 与 BA 在原点的作用。比较未折回终点、晶胞内坐标，以及相差的整数位移。',
        'givens': [
            'A 是绕 z 轴的二重旋转，没有平移。它把 (x,y,z) 变成 (−x,−y,z)。',
            'B 是沿 x 轴的正向半格平移，旋转部分为恒等 I。',
            '采用列向量。AB 从右向左作用，先 B 再 A。参考晶胞的每个坐标方向按单位间隔折回。'
        ],
        'hint': '在 AB 中，A 会旋转 B 已经产生的平移。在 BA 中，A 先作用于原点。',
        'steps': [
            {
                'title': '让旋转作用于半格位移',
                'explanation': '先应用 B，原点到达 (1/2,0,0)。再应用 A，x 分量反号。',
                'formula': 't_AB = (−1/2,0,0)'
            },
            {
                'title': '交换两个操作',
                'explanation': '先应用 A，原点不动。再应用 B，x 增加 1/2。两种乘积保留同一个二重旋转。',
                'formula': 't_BA = (1/2,0,0)'
            },
            {
                'title': '保留折回时移去的整数',
                'explanation': '两种终点在参考晶胞内都写为 (1/2,0,0)。AB 在 x 方向的参考晶胞位移为 −1，BA 的参考晶胞位移为 0。',
                'formula': 't_BA − t_AB = (1,0,0)'
            },
            {
                'title': '把半格平移改到旋转轴上',
                'explanation': '把 B 的半格平移改到 z 轴，再重复前两步。A 保持 z 分量，交换两个操作后，终点完全相同。',
                'formula': 't_AB = t_BA = (0,0,1/2)'
            }
        ],
        'answer': '沿 x 的例题中，两种乘积的旋转相同，未折回终点相差 (1,0,0)。沿 z 的对照中，两个未折回终点已经相同。',
        'pitfall': '练习按固定的参考晶胞定义折回和形式平面波相位。真实晶体的小群与简并还要从它的原始晶格与完整对称操作判断。',
        'check': {
            'question': '沿 x 的例题在折回后重合。BA 的未折回终点相对 AB 位于哪个晶胞？',
            'choices': ['沿 x 多移动一个晶胞', '沿 x 少移动一个晶胞', '相同晶胞'],
            'answer': 0,
            'explanation': 'BA 的 x 坐标为 1/2，AB 的 x 坐标为 −1/2，两者的差为 +1。'
        },
        'sourceIds': ['dresselhaus2008']
    }


def build(check=False):
    path = ROOT / 'dist/data/symmetry-derivations.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    existing = [i for i, item in enumerate(data['exercises']) if item['id'] == EXERCISE_ID]
    assert len(existing) <= 1, f'Duplicate exercise: {EXERCISE_ID}'
    if existing:
        data['exercises'][existing[0]] = exercise()
    else:
        data['exercises'].append(exercise())
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if check:
        assert path.read_text(encoding='utf-8') == text, 'Regenerate the Seitz order exercise'
    else:
        path.write_text(text, encoding='utf-8', newline='\n')
    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build(check=args.check)
    print(f'Seitz order exercise: {EXERCISE_ID}; {len(data["exercises"])} crystal derivations')
