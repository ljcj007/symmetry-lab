"""Build the dedicated magnetic-setting exercise without changing other tasks."""
from pathlib import Path
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]
EXERCISE_ID = 'magnetic-settings-macroscopic-constraints'


def step(title, explanation, formula):
    return {'title': title, 'explanation': explanation, 'formula': formula}


def exercise():
    return {
        'id': EXERCISE_ID,
        'track': 'magnetic',
        'modelLabel': '磁群编号、均匀磁矩与一维反平移模型',
        'title': 'BNS/OG、灰磁点群与均匀磁矩：哪些信息不能省略？',
        'prompt': '先辨别 BNS/OG 编号记录与晶胞变换，再求 2、21′、2′ 对均匀磁矩的约束；最后用一个精确反平移模型，检验灰型点操作为何仍可对应非零交错序。',
        'givens': [
            '图谱记录 BNS 1.3（P_s1，IV 类）对应 OG 1.3.3（P_2s1）。点号分隔编号字段；记录没有指定晶胞基变换 P 或原点偏移 p。',
            '比较坐标设定时，约定旧分数坐标 r=P r′+p，P 可逆，p 用旧坐标表示。本题不为上述编号记录臆定 P、p。',
            '后面的磁矩例子另用固定的正交笛卡尔轴，C₂z=diag(−1,−1,1)。均匀磁矩 M 是时间奇的轴向量；空间矩阵 R 与时间标记 ε 的作用为 M′=(−1)^ε det(R)RM。',
            '在经典磁矢量作用层次比较 2={E,C₂z}、21′={E,C₂z,Θ,ΘC₂z} 和 2′={E,ΘC₂z}；ΘM=−M。这里的操作计数不包含电子双群提升。',
            '最后只考虑由 T(1) 与 A=ΘT(1/2) 生成的一维对称子群，磁周期取1。两子格满足 m(0)=L、m(1/2)=−L，L≠0；主动平移使 m′(x)=m(x−τ)。这是概念模型，不指定真实三维晶体或 BNS 设置。'
        ],
        'hint': '编号回答“是哪一项”，P、p 才规定坐标如何变化。求宏观磁矩时，对群内每一个操作都要求 M′=M；讨论反平移时，先保留半平移，再看丢掉它后剩下什么。',
        'steps': [
            step('把编号读作标识符',
                 '图谱把 1.3 与 1.3.3 关联到同一个 IV 类磁空间群条目。BNS 编号由两个整数域组成，OG 常用三个整数域；点号不是小数点，也不是转换算法。自检：这条记录给出了哪两个编号？其中有没有原子坐标、P 或 p？',
                 'BNS 1.3 ↔ OG 1.3.3；类型为 IV'),
            step('写出完成坐标转换真正需要的量',
                 '将 r=P r′+p 代入旧操作 r→Rr+t，再左乘 P⁻¹，可得新坐标中的线性部分与平移。时间反演标记不因这次坐标重写而消失。自检：平移中为何出现 (R−I)p？没有给定 P、p 时，不能由编号记录补出坐标变换。下式中的 R′ 是分数坐标矩阵，不可直接当作下一步的正交笛卡尔磁矩旋转。',
                 'R′=P⁻¹RP；t′=P⁻¹[(R−I)p+t]'),
            step('区分类型总数与一个群的元素数',
                 '122 数的是三维晶体学磁点群类型：32 个普通型、32 个灰型、58 个黑白型。1651 数的是磁空间群类型。对已给定的经典操作集合，2 与 2′ 各有两个元素，21′ 有四个；ΘC₂z 与单独加入 Θ 是不同的集合。自检：不要把类型总数、单群阶和含自旋双群的阶混在一起。',
                 '32+32+58=122；|2|=2，|21′|=4，|2′|=2'),
            step('求普通型与灰型允许的均匀磁矩',
                 '二重旋转把面内分量反向，故在 2 中只有沿 z 的均匀磁矩可保留。21′ 还包含纯 Θ，要求 M=−M，于是三个分量全为零。自检：沿 z 的非零向量通过 C₂z 检验，但不能通过纯 Θ 检验。',
                 'C₂z M=(−M_x,−M_y,M_z)；M_(2)=(0,0,M_z)；ΘM=−M；M_(21′)=(0,0,0)'),
            step('检验带撇二重操作的另一种约束',
                 '先作 C₂z，再作时间反演，得到 ΘC₂z M=(M_x,M_y,−M_z)，所以 2′ 允许面内均匀磁矩而要求 M_z=0。自检：输入 (1,2,3) 后应得到 (1,2,−3)，不能套用普通 2 的允许方向。这是经典时间奇轴矢量的作用，不是在计算量子自旋态的 Θ²。',
                 'ΘC₂z M=(M_x,M_y,−M_z)；M_(2′)=(M_x,M_y,0)；ΘC₂z(1,2,3)=(1,2,−3)'),
            step('保留反平移，构造灰型点操作像的反例',
                 '在给定交错场上，半平移交换 L 与−L，Θ 再反向，故 A 保持磁矩图案；纯 Θ 却不保持这个非零图案。经典场中的 A²=T(1)，而非实际空间恒等。所选生成子群里，Aⁿ 的平移为 n/2；零平移只在 n=0 出现，此时为 E，所以该子群不含纯 Θ。只保留点操作后，T(1)→E、A→Θ，所选子群的像为 {E,Θ}，具有灰型结构。自检：均匀平均为零并不要求两个局域磁矩各自为零；点操作像也不能恢复被丢掉的半平移。',
                 'A m(x)=−m(x−1/2)=m(x)；A²=T(1)；M̄=[m(0)+m(1/2)]/2=0，L≠0')
        ],
        'answer': 'BNS/OG 标识符映射没有自动给出 P、p 或结构坐标变换。对本题经典均匀轴矢量，2 允许 (0,0,M_z)，21′ 要求 M=0，2′ 允许 (M_x,M_y,0)。由 T(1) 与 ΘT(1/2) 生成的模型子群可保持非零交错场，丢掉平移后却有灰型点操作像；宏观均匀约束与局域有序不能混同。',
        'pitfall': '必须同时注明坐标设定、是否保留平移及所作用的空间。这个一维子群说明信息如何丢失，不是任意磁结构的分类器，也不指定 BNS 1.3 的晶胞转换。经典场的 Θ²=I 与电子自旋态的时间反演平方属于不同表示；不能据本题操作计数判断量子 Kramers 配对。',
        'check': {
            'question': '某有序反铁磁结构保持 ΘT(τ)，其点操作像含 Θ。哪项结论有依据？',
            'choices': [
                '原磁空间群一定含纯 Θ，因此每个局域磁矩都必须为零',
                '均匀时间奇磁矩受零值约束，但反平移仍可能保持非零交错序；局域和动量问题须保留空间群信息',
                '只需将 BNS 编号换成 OG 编号，就已完成原子坐标与磁矩的转换'
            ],
            'answer': 1,
            'explanation': '点操作像丢掉了 τ，不能据此断言原群含纯 Θ。两子格 L 与−L 可同时满足均匀平均为零及非零局域有序；编号映射也没有提供坐标转换所需的 P、p。'
        },
        'sourceIds': ['iucr-magnetic', 'bcs-magnetic', 'dresselhaus2008']
    }


def build(check=False):
    path = ROOT / 'dist/data/symmetry-derivations.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    matches = [i for i, row in enumerate(data['exercises']) if row['id'] == EXERCISE_ID]
    assert len(matches) <= 1, 'Duplicate dedicated magnetic-setting task'
    item = exercise()
    if matches:
        data['exercises'][matches[0]] = item
    else:
        data['exercises'].append(item)
    body = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if check:
        assert path.read_text(encoding='utf-8') == body, 'Magnetic-setting task is stale; run build-magnetic-setting-derivation.py'
    else:
        path.write_text(body, encoding='utf-8', newline='\n')
    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build(check=args.check)
    print('Magnetic-setting task:', EXERCISE_ID, '; total crystal derivations:', len(result['exercises']))
