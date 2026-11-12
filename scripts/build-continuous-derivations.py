"""Regenerate eight introductory derivations while preserving every other exercise."""
from pathlib import Path
import argparse
import json

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT
lessons=json.loads((REPO/'dist/data/lie-group-lessons.json').read_text(encoding='utf-8'))['lessons']
by_id={x['id']:x for x in lessons}

def step(title,explanation,formula):
    return {'title':title,'explanation':explanation,'formula':formula}

def exercise(id,lesson,group,title,prompt,givens,hint,steps,answer,pitfall,question,choices,correct,explanation,lab=None):
    result={'id':id,'lessonIds':[lesson],'group':group,'title':title,'prompt':prompt,'givens':givens,'hint':hint,
            'steps':steps,'answer':answer,'pitfall':pitfall,
            'check':{'question':question,'choices':choices,'answer':correct,'explanation':explanation},
            'references':by_id[lesson]['references']}
    if lab is not None:result['lab']=lab
    return result

items=[
exercise('continuous-c4-in-u1','continuous-symmetry','u1','U(1) · 四个相位点为什么不是整个连续群？',
 '从 r=i 出发生成 C₄，检验 45° 相位是否属于这个子群；再解释为什么无限晶格平移仍然离散。',
 ['U(1) 的元素为 e^(iφ)，相乘对应角度相加。','本题 C₄={1,r,r²,r³}，r=i；一维晶格允许位移 n a，其中 a>0、n∈ℤ。'],
 '先求四次乘方，再检查乘积的指数如何取模。讨论平移时，先寻找恒等平移附近最小的非零步长。',
 [step('生成四个相位点','把 r 连乘，第四次返回恒等元。四个结果互不相同。','r⁰=1，r¹=i，r²=−1，r³=−i，r⁴=1'),
  step('验证闭合与逆元','任意两个元素相乘，把指数对4取余仍在这四点中；逆元也由负指数取模得到。','rᵐrⁿ=r^((m+n) mod 4)，(rᵐ)⁻¹=r^((−m) mod 4)'),
  step('加入一个不属于子群的角度','45° 对应 (1+i)/√2，它的模为1，但不等于四点中的任一个。U(1) 中有这个元素，不会使正方形自动获得45°旋转对称。','q=e^(iπ/4)=(1+i)/√2，q∈U(1)，q∉C₄，q²=i'),
  step('分清无限和连续','整数平移数目无限，但任何非零位移的绝对值至少为a。位移a/1000不是允许的晶格平移，因此不存在从零开始的任意小非零晶格平移。','TₙTₘ=T_(n+m)，n,m∈ℤ；|n a|≥a（n≠0）')],
 'C₄={1,i,−1,−i} 是 U(1) 的四元素子群；U(1) 局部需要一个实参数。整数晶格平移有无限多个元素，却仍是离散群。',
 '反例是平移群 ℤ：元素数无限不保证连续。还要区分群阶4、U(1)的实维数1和所选表示矩阵的大小。',
 '哪个判断正确？',['无限多个群元素就一定构成连续群','C₄是U(1)的子群，而无限整数平移仍可离散','U(1)维数为1，所以只有一个元素'],1,
 'C₄的乘积仍落在四点中；整数平移缺少任意小的非零步长。维数描述局部参数，不是元素数。'),

exercise('unitary-special-two-checks','unitary-matrices','su2','U(2) 与 SU(2) · 保范数还要检查什么？',
 '分别判断 U=diag(e^(−iπ/4),e^(iπ/4)) 与 V=diag(i,1) 属于 U(2) 还是 SU(2)，并用一个混合基态的例子检验概率守恒的含义。',
 ['U(2) 要求 M†M=I₂；SU(2) 还要求 det M=1。','A† 表示矩阵 A 的共轭转置，同时包含转置与复共轭；|↑⟩=(1,0)ᵀ。'],
 '先把两个相位写成 (1∓i)/√2，逐项做共轭转置。不要把“行列式模为1”当成“行列式等于1”。',
 [step('计算U的共轭转置与范数条件','两个对角元互为共轭且模长都为1，乘回去得到单位矩阵。','U†=diag((1+i)/√2,(1−i)/√2)，U†U=I₂'),
  step('补上special条件','U的行列式是两个共轭相位之积，所以恰好等于1。','det U=[(1−i)(1+i)]/2=1，因此 U∈SU(2)⊂U(2)'),
  step('检查反例V','V的每个对角元也都有单位模长，因此酉性成立；但行列式不是1。','V†V=I₂，det V=i≠1，因此 V∈U(2)，V∉SU(2)'),
  step('保持总概率不要求保持各分量','取 W=[[1,−1],[1,1]]/√2。W仍属于SU(2)，却把上态变成等幅叠加，说明单个基底结果的概率可以改变。','W†W=I₂，det W=1；W|↑⟩=(1,1)ᵀ/√2；(P↑,P↓)=(1/2,1/2)')],
 'U属于SU(2)；V属于U(2)但不属于SU(2)。酉变换保持总概率和内积，可以重新分配选定基底中的概率。',
 'V是“酉但不special”的明确反例；W是“总概率不变但各分量概率改变”的明确反例。漏掉复共轭会得到错误的酉性判断。',
 'V=diag(i,1) 属于哪一类？',['SU(2)','U(2)，但不属于SU(2)','两者都不是'],1,
 'V†V=I₂而det V=i。酉性与行列式等于1必须分别检查。','su2'),

exercise('generators-pauli-normalization','generators-commutators','su2','生成元 · 同一个对易子为何差一个系数？',
 '从Pauli矩阵相乘求 [Tx,Ty]，其中 Ta=σa/2；再解释交换次序和改用σ归一化时的变化。',
 ['σx=[[0,1],[1,0]]，σy=[[0,−i],[i,0]]，σz=diag(1,−1)。','[A,B]=AB−BA；本课有限变换为U(θ)=exp(−iθT)，T为厄米生成元。'],
 '先算σxσy和σyσx，再相减；最后才除以4，因为两个因子各带一个1/2。',
 [step('分别乘两种次序','直接行列相乘，两个结果的符号相反。','σxσy=iσz，σyσx=−iσz'),
  step('相减并转换归一化','Pauli矩阵的对易子先得到2iσz；Tx、Ty各含一个1/2，所以还需除以4。','[σx,σy]=2iσz；[Tx,Ty]=(1/4)[σx,σy]=iσz/2=iTz'),
  step('检查对易子和李代数约定','交换次序会取负。厄米生成元的对易子是反厄米矩阵；取X=−iT后才得到数学中反厄米李代数元。','[Ty,Tx]=−iTz；(−iTa)†=−(−iTa)'),
  step('一个对易对不代表整个群交换','SU(3)中的T₃、T₈都是对角矩阵，所以对易；而其嵌入的T₁、T₂仍不对易。','[T₃,T₈]=0，但 [T₁,T₂]=iT₃≠0')],
 '[Tx,Ty]=iTz；改用σ矩阵时是[σx,σy]=2iσz。交换x、y会取负；不能混用两种归一化。',
 'T₃和T₈对易不意味着SU(3)是阿贝尔群；同时，若把厄米T直接视为普通对易子下的实李代数基，会漏掉i的约定。',
 '当 Ta=σa/2 时，[Tx,Ty] 是？',['0','2iTz','iTz'],2,
 '两个1/2相乘给1/4，乘上[σx,σy]=2iσz，结果为iσz/2=iTz。','commutator'),

exercise('su2-y-quarter-turn-bloch','su2-spinor','su2','SU(2) · 从旋量振幅算出 Bloch 方向',
 '把+z自旋绕+y轴主动旋转90°。求完整旋转矩阵、末态、z基底概率和Bloch向量。',
 ['|↑z⟩=(1,0)ᵀ；σy=[[0,−i],[i,0]]。','U_y(θ)=cos(θ/2)I₂−i sin(θ/2)σy；θ=π/2。','对ψ=(a,b)ᵀ，r=(2Re(a*b),2Im(a*b),|a|²−|b|²)，*表示复共轭。'],
 '先将−iσy写成实矩阵，再作用到上态。Bloch分量是期望值，不是把两项概率和一个额外数字拼在一起。',
 [step('计算半角矩阵','cos(π/4)=sin(π/4)=1/√2，且−iσy的非零元为−1和1。','Uy(π/2)=(I₂−iσy)/√2=[[1,−1],[1,1]]/√2'),
  step('作用到初态并检查归一化','取矩阵的第一列得到末态。两个振幅相等，范数平方仍为1。','ψ₁=Uy(π/2)(1,0)ᵀ=(1,1)ᵀ/√2；ψ₁†ψ₁=1'),
  step('计算z基底概率','两个概率是振幅的模平方，不能把1/√2本身当成概率。','P↑=|1/√2|²=1/2，P↓=1/2'),
  step('由相干项计算Bloch向量','a*b=1/2为实数，且两个概率相等。因此x分量为1，y、z为0，与右手规则一致。','r=(1,0,0)，|r|=1；⟨S⟩=(ℏ/2,0,0)')],
 'Uy(π/2)=[[1,−1],[1,1]]/√2，末态为(1,1)ᵀ/√2，两个z概率均为1/2，Bloch向量为+x。',
 '反例ψ₂=(1,i)ᵀ/√2有完全相同的两个z概率，但Bloch向量为+y。两个概率不足以恢复相对相位和完整方向。',
 '本题末态的Bloch向量是？',['(1,0,0)','(0,0,1)','(1/2,1/2,0)'],0,
 '相干项2Re(a*b)=1，另外两项为0；概率相等只说明rz=0，不会自动决定rx、ry。','su2'),

exercise('su2-double-cover-path-phase','su2-double-cover','su2','SU(2) · 把整体负号变成可比较的路径相位',
 '比较孤立自旋、只旋转一支的双路径干涉，以及两支共同旋转。哪一种2π回转会交换理想合束端口？',
 ['U(n,θ)=cos(θ/2)I₂−i sin(θ/2)n·σ；n为单位轴。','初态为|+⟩path⊗ψ，其中|±⟩path=(|a⟩±|b⟩)/√2、ψ†ψ=1。','路径相干、两支等幅，合束理想；除指定自旋旋转外没有附加相位、损耗或退相干。'],
 '先代入θ=2π、4π；之后把负号放进联合的路径—自旋态，再投影到路径的±基底。',
 [step('代入2π和4π','半角分别为π和2π，正弦项都为0。两个结果对所有单位旋转轴成立。','U(n,2π)=−I₂，U(n,4π)=I₂'),
  step('先看孤立自旋','ρ=ψψ†中的两个负号抵消。自旋概率和Bloch向量均不变。','(−ψ)(−ψ)†=ψψ†，⟨−ψ|A|−ψ⟩=⟨ψ|A|ψ⟩'),
  step('只让b支经历2π','a支不变，b支取负，原来的同号路径组合变成异号组合。','(|a⟩+|b⟩)⊗ψ/√2 → (|a⟩−|b⟩)⊗ψ/√2=|−⟩path⊗ψ'),
  step('比较合束概率和共同旋转','单支旋转后只有−端口；两支都旋转则联合态整体取负，仍只有+端口。','单支2π：P+=0，P−=1；两支2π：P+=1，P−=0')],
 '理想相干条件下，仅一支经历2π会将+端口切换到−端口；孤立自旋或两支共同获得整体负号不会改变读出。',
 '反例是两支同时乘−1：不能把整体负号说成端口改变。这里检验相对相位，不把时间反演当作普通SU(2)旋转。',
 '只在b支施加2π旋转后，理想−端口概率是？',['0','1','1/2'],1,
 '联合态变成|−⟩path⊗ψ，投影到−端口的范数平方为1。该结论使用本题的等幅、相干和理想合束假设。','su2'),

exercise('representations-center-two-actions','representations','su2','同一个 SU(2) 元素 · 两维旋量和三维向量怎样不同？',
 '固定同一个中心元素g=−I∈SU(2)，比较它在j=1/2旋量和j=1三维向量表示中的作用。说明为什么只看矩阵维数不能认定两个群相同。',
 ['SU(2)自旋j不可约表示的维数为2j+1；D^(j)(−I)=(−1)^(2j)I。','旋量作用为ψ↦Uψ；三维向量可由U(r·σ)U†=(R(U)r)·σ定义。'],
 '先分别代入j，再用共轭作用检查−I对三个Pauli方向的实际作用。一个表示可以把非恒等群元素映成单位矩阵。',
 [step('计算两个表示空间的维数','同一SU(2)群有不同作用空间；维数由表示标签j决定。','j=1/2：2j+1=2；j=1：2j+1=3'),
  step('代入中心元素公式','半整数与整数j给出不同符号。注意I₂与I₃作用在不同空间，不能直接相减。','D^(1/2)(g)=−I₂；D^(1)(g)=+I₃'),
  step('直接验证三维共轭作用','对a=x,y,z，左右的−I各贡献一个负号，三个方向都不变。','(−I₂)σa(−I₂)†=σa，因此 R(−I₂)=I₃=R(I₂)'),
  step('解释忠实性和下降到SO(3)','三维表示把SU(2)中两个不同元素I、−I识别，所以不是忠实表示；这个核使其能够描述SO(3)向量旋转。','ker R={I₂,−I₂}；R(U)=R(−U)')],
 '同一个SU(2)中心元素在旋量表示中为−I₂，在j=1向量表示中为I₃。群、表示空间和表示的忠实性必须分别说明。',
 'SU(2)的三维表示与SU(3)的三维基本表示都用三分量向量，却不是同一群或同一表示；前者群维数3，后者群维数8。不能用“都是3×3矩阵”判断相同。',
 'g=−I在SU(2)的j=1表示中是什么？',['I₃','−I₃','−I₂'],0,
 '代入(−1)^(2j)，j=1时指数为2，符号为+；该表示空间维数是3。'),

exercise('su3-eight-directions-embedded-rotation','su3-generators','su3','SU(3) · 八个方向与一个二能级旋转子块',
 '数出三阶无迹厄米矩阵的独立实参数，再用T₁=λ₁/2推导e₁初态在π、2π、4π参数角的变换。',
 ['λ₁=[[0,1,0],[1,0,0],[0,0,0]]，U₁(θ)=exp(−iθλ₁/2)。','基底为e₁=(1,0,0)ᵀ、e₂=(0,1,0)ᵀ、e₃=(0,0,1)ᵀ。','Hermitian条件使对角元为实数，非对角元按复共轭配对；SU(3)生成元还要无迹。'],
 '将左上2×2块与第三分量分开，第三分量的生成元为0，指数永远为1。不要把二维子块的−I₂扩成−I₃。',
 [step('数清实参数','三个对角元给3个参数；三个上三角复数给6个参数；迹为零去掉1个。','3+2×3=9，9−1=8；SU(3)实维数=8'),
  step('对二能级子块求指数','左上子块是σx/2，第三方向的生成元为0。由偶奇幂展开得到完整矩阵。','U₁(θ)=[[c,−is,0],[−is,c,0],[0,0,1]]，c=cos(θ/2)，s=sin(θ/2)'),
  step('作用到e₁并取π角','乘第一列可得一般末态；θ=π时只有第二个分量非零。','U₁(θ)e₁=(c,−is,0)ᵀ；U₁(π)e₁=−i e₂；概率=(0,1,0)'),
  step('比较完整矩阵的2π和4π','θ=2π时前两个方向取负，第三方向仍是1；再到4π三个方向一起回到原矩阵。','U₁(2π)=diag(−1,−1,1)≠−I₃；U₁(4π)=I₃')],
 'SU(3)有8个独立实生成元。T₁只混合e₁、e₂；π时e₁→−i e₂，2π时完整矩阵为diag(−1,−1,1)，4π才回到I₃。',
 '−I₃的行列式为−1，本来就不在SU(3)中；不能机械复制SU(2)的2π结果。T₁的周期也不能推广为所有SU(3)生成元的共同周期。',
 'T₁演化的完整U₁(2π)是哪一个？',['I₃','−I₃','diag(−1,−1,1)'],2,
 '第三基态的生成元本征值是0，所以指数在第三分量为1；两个受混合分量在2π取负，行列式仍为1。','su3'),

exercise('su3-weights-roots-phase-record','su3-weights','su3','SU(3) · 权之差与权平均漏掉的相位',
 '从T₃、T₈读出基本表示权，求E₁₂对应根；再证明沿T₃演化可让权平均不变而相对相位改变。',
 ['T₃=diag(1/2,−1/2,0)，T₈=diag(1,1,−2)/(2√3)。','Eᵢⱼ只有第i行第j列为1；ψ₀=(e₁+e₂)/√2。','U₃(θ)=exp(−iθT₃)；本题使用生成元Ta=λa/2。'],
 '权是共同本征值，根是相连两个权之差。叠加态的Cartan期望是概率平均，不能恢复相位。',
 [step('读取三个共同本征值','在固定e₁、e₂、e₃基底中直接读两个对角矩阵的对应条目。','w₁=(1/2,1/(2√3))，w₂=(−1/2,1/(2√3))，w₃=(0,−1/√3)'),
  step('由E₁₂计算根','E₁₂把e₂送到e₁。对角矩阵左乘和右乘的差，等于两个本征值之差乘E₁₂。','α₁₂=w₁−w₂=(1,0)；[T₃,E₁₂]=E₁₂；[T₈,E₁₂]=0'),
  step('沿Cartan生成元演化叠加态','两个非零分量获得相反相位，但各自概率仍为1/2，所以Cartan平均不动。','ψ(θ)=(e^(−iθ/2)e₁+e^(iθ/2)e₂)/√2；(⟨T₃⟩,⟨T₈⟩)=(0,1/(2√3))'),
  step('检查平均点没有记录的相位','取θ=π/2，态为((1−i)/2,(1+i)/2,0)ᵀ。用非Cartan的T₁、T₂比较，可看见期望值从一个方向转到另一个方向。','θ=0：(⟨T₁⟩,⟨T₂⟩)=(1/2,0)；θ=π/2：(⟨T₁⟩,⟨T₂⟩)=(0,1/2)')],
 'α₁₂=(1,0)。ψ₀沿T₃演化时权平均一直为(0,1/(2√3))，但相对相位和非Cartan生成元期望会变；这个平均点不是基本表示中的新权。',
 'θ=0与θ=π/2给出相同基底概率和Cartan平均，却不是相同态射线。另须分清基本表示的3个权、由权差得到的6个非零根，以及伴随表示的2个零权方向。',
 'E₁₂对应的根α₁₂是？',['(1,0)','(0,1/(2√3))','(1/2,√3/2)'],0,
 '根是w₁−w₂：T₃本征值差为1，T₈本征值差为0。第二项是本题叠加态的平均点，第三项是E₁₃的根。','su3')
]

# These IDs are implemented by the basic Lie lab registry. They are not generic
# links to whichever parameters the learner happened to use previously.
introductory_labs={
 'continuous-c4-in-u1':('u1','u1-circle-quarter'),
 'unitary-special-two-checks':('su2','unitary-z-quarter'),
 'generators-pauli-normalization':('commutator','generators-xy'),
 'su2-y-quarter-turn-bloch':('su2','spinor-y-quarter'),
 'su2-double-cover-path-phase':('interferometer','su2-phase-single'),
 'representations-center-two-actions':('representations','su2-center-actions'),
 'su3-eight-directions-embedded-rotation':('su3','su3-t1-half'),
 'su3-weights-roots-phase-record':('su3','su3-weight-phase')
}
for item in items:
    item['lab'],item['labPreset']=introductory_labs[item['id']]

def build(check=False):
    """The JSON bank is authoritative for all exercises not owned by this builder."""
    path=ROOT/'dist/data/lie-derivations.json'
    data=json.loads(path.read_text(encoding='utf-8'))
    ids={item['id'] for item in items}
    assert len(ids)==len(items)==8
    assert [item['lessonIds'][0] for item in items]==[lesson['id'] for lesson in lessons[:8]]
    other=[item for item in data['exercises'] if item['id'] not in ids]
    assert len(other)>=32, 'Do not discard the existing application and recoupling bank'
    data['exercises']=[*items,*other]
    assert len({item['id'] for item in data['exercises']})==len(data['exercises'])
    data['description']=(f"{len(data['exercises'])} 道引导练习：从 U(1)、幺正矩阵、生成元与权图基础，"
                         "走向物理应用、精确 CG、Racah 与高维四体重耦合。每题附提示、分步推导、"
                         "反例和独立判断；可用时联动对应实验。")
    body=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
    if check:
        assert path.read_text(encoding='utf-8')==body, 'Introductory derivations are stale; regenerate them'
    else:
        path.write_text(body,encoding='utf-8',newline='\n')
    return data

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    data=build(check=args.check)
    print('Introductory derivations:',len(items),'dedicated lessons;',len(data['exercises']),'exercises retained')

