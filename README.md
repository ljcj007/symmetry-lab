# Symmetry Lab · 晶体对称性浏览器工作台

本轮教学体验改版：三层首页入口、群目录和课堂按需加载、手机短导航及更清晰的文字。新增 [Si / GaAs / BaTiO₃ SHG 旗舰实验](https://ljcj007.github.io/symmetry-lab/#classroom/observables?module=shg-story)，包含预测、计算、分步解释、几何零信号反例和完整报告。全部旧工具与原有字号、公式排版保留。范围与使用方式见 [说明](dist/docs/learning-experience.md)。


## 从表示构造到有限 q 与动量保护（20261030-construction1）

新增 **3 个主题、9 课、9 道分步练习（36 步）、9 个材料与模型案例、21 个实验预设、6 道预测验证题和 3 份跨模块项目（9 阶段）**。项目中心保留原 17 份，共 20 份；词典保留原 94 条并追加 12 条，共 106 条、39 个来源记录。保留原有功能、五个主导航、七条路线、18px 正文字号与修正后的公式排版。

- `#compute/salc-lab`：从 C₄ᵥ 四轨道真实置换构造字符与矩阵元投影，展示一套或两套等价副本的 SALC、伙伴函数、选择定则和实际偏振矩阵元。对称允许不保证非零；重复不可约表示的副本混合不自动产生四重简并。
- `#compute/wavevector-lab`：已知方格标量模式的可公度 q 星、共轭实模式、N=2/3/4 超胞、实际稳定子和平移畴。区分相容矩形周期和最小平移指数；Fourier 权重不冒充真实衍射截面，不声称任意三维空间群分类或材料稳定相。
- `#compute/nonsymmorphic-lab`：将三维滑移/二重螺旋嵌入严格周期的两带或四带 Bloch 模型，检查小群、TRIM、单/双值平方关系、端点伙伴配对和真实破缺项。解析交叉点与质量项直接隙可核验；一条动量线的直接隙不等于三维绝缘。
- 三主题接入表示构造回放、带明确范围的群—子群关系图、有限最小破缺挑战及矩阵/子空间作业。共享 Python 判分接受相位和任意满秩内部换基，检查维数、投影与不变性；项目文字推导仍需自主核对。

范围、约定与复现流程见[本次表示构造说明](dist/docs/construction.md)，来源及文件哈希见[发布来源清单](dist/data/construction-provenance.json)。验证使用 `npm run test:construction`；旧功能继续使用 `npm test` 和 `npm run test:python`。最终源码、目录和真实 Python 夹具稳定后运行 `python scripts/refresh-construction-provenance.py`，再加 `--check` 只读核验。刷新按依赖处理旧清单哈希并保留历史版本、数量与来源声明，新增登记三个物理核心及一个通用判分核心，不提交或发布。

## 序参量、磁交换与连续对称性（20261030-symmetry1）

新增 **3个主题、9课、9道分步练习（36步）、9个材料与模型案例、24个实验预设、6道预测验证题和3份跨模块项目（9阶段）**。项目中心保留原14份，共17份；词典保留原82条并追加12条，共94条、34个来源记录。继续融入课堂、计算中心、材料图谱与研究记录，保留现有功能、五个主导航、七条路线、18px正文字号及修正后的公式排版。

- `#compute/order-parameter-lab`：C₄ᵥ二维与Oₕ三维极向量的二/四/六阶不变量、逐生成元系数约束、稳定子群、母群轨道和外场劈裂。指定方向不自动是平衡态，径向驻点不自动是全空间极小值；不声称覆盖任意空间群表示或真实原子位移。
- `#compute/exchange-symmetry-lab`：从轴向自旋及键端点是否交换，推导单条有向键的实交换张量与DMI约束；对照经典单位自旋、量子S=σ/2能谱和坐标/编号约定。键中心反演消除DMI，不据此推断所有对称各向异性也消失。
- `#compute/conservation-lab`：一到两个自旋的逐项对易子、完整Lindblad伴随守恒判据、真实密度矩阵轨迹和有限系统简并诊断。显式区分Kramers条件、全局SU(2)与未由当前检查解释的重合，不把平坦轨迹当作算符守恒证明。
- `#atlas/principles`、`#atlas/projects`、`#atlas/compare`与`#docs/dictionary`：约束来源、受控对称性破缺预测、一致换基和参数对照相互连接。三份新项目明确键环境假设、meV到rad/ns的单位转换及Bloch/自旋约定；记录完成不代表文字推导已自动批改。

范围、交互入口和复现流程见[本次对称性原则说明](dist/docs/principles.md)，一手来源和文件哈希见[发布来源清单](dist/data/principles-provenance.json)。验证使用`npm run test:principles`，旧功能继续使用`npm test`及`npm run test:python`。最终源码、目录和实际Python夹具稳定后运行`python scripts/refresh-principles-provenance.py`，再加`--check`只读核验；脚本按依赖递归刷新旧清单哈希并检测循环，保留历史版本/数量声明，仅登记三个新核心，不打包、提交或发布。


## 多体谱、极化子与量子态的教学连接（20261030-bridges1）

新增 **3个物理主题和1个对称性推导工坊、13课、13道分步练习（52步）、11个材料与模型案例、25个实验预设、8道预测验证题和4份跨模块项目（12个阶段）**。项目中心保留原10份，共14份；词典新增16条，总82条、30个来源记录。内容继续融入既有课堂、计算中心、材料图谱和研究记录，保留五个主导航、七条学习路线、18px正文字号及修正后的公式排版。

- `#compute/manybody-spectra-lab`：从2–4站点Hubbard本征态和真实跃迁矩阵元构造零温添加/移除Lehmann谱及纵向自旋/密度连通谱；点击峰联动条件末态，独立检验离散权重与一阶矩。化学势只平移能量参考，η是数值Lorentz半高半宽；不报告材料寿命、实测截面或热力学Mott相图。
- `#compute/polaron-lab`：二站点单电子Holstein模型、两个局域量子振子，联动电子占据、声子数分布、条件振动云与约化纯度；自动比较相邻声子截断并显示最高层权重。X为无量纲，不是Å；有限对称态不被宣称为自俘获相变，也不由声子文件自动拟合耦合。
- `#compute/density-matrix-lab`：一到两个自旋的常量Hamiltonian与独立局域Lindblad演化，联动Bloch向量、复密度矩阵、部分迹、纯度、局部熵和双自旋负性。H/ℏ使用rad/ns，速率使用ns⁻¹；热初态不自动决定环境，混态局部熵不直接当作纠缠量。
- `#compute/symmetry-workshop`：C₂ᵥ/C₃ᵥ/C₄ᵥ参考生成元的二维二阶真实自旋模型，开关旋转、镜面、反演和时间反演，逐项查看允许系数、约束与能带。采用同宇称自旋双重态和明确的欧氏系数投影；不是任意轨道赝自旋或全布里渊区拓扑分类。
- `#atlas/compare`、`#atlas/bridges`、`#atlas/projects` 与 `#docs/dictionary`：同工具A/B参数对照、受控预设的预测验证、跨模块证据与公式当前值联动。仅在版本、模型/探针和坐标标签兼容时叠加曲线；保存完成不代表文字推导已自动批改。词典保留原条目和原文，进一步区分Γ/γ、Ω/ω及T₂/T²。

范围、入口与复现流程见[本次教学连接说明](dist/docs/bridges.md)，文件哈希与一手来源见[发布来源清单](dist/data/bridges-provenance.json)。验证使用 `npm run test:bridges`，完整旧功能回归继续使用 `npm test` 与 `npm run test:python`。最终目录、源码和真实Python夹具更新后运行 `python scripts/refresh-bridges-provenance.py`，再加 `--check` 只读核验；脚本保留历史清单的版本、数量与来源，刷新文件哈希并登记四个新核心，不打包、提交或发布。

## 位点、散射、畴壁与关联电子（20261029-pathways1）

新增 **4个主题、14课、14道分步练习（56步）、14个材料与模型案例、26个实验预设、4份跨模块项目及66条公式与符号词典条目**。项目中心保留原有6份作业，共10份；沿用现有课堂、计算中心、材料图谱与研究记录，保留既有功能、五个主导航和18px正文字号。上述数量来自本次合并目录、项目定义和词典文件。

- `#compute/band-representation-lab`：从实空间位点、s或完整p轨道构造 Bloch 表示，在精选普通空间群2、4、19、221的小群中分解。采用本站BC原胞设置，群4螺旋轴沿z；当前为无自旋单值模型，不计算能带能量，不冒充全空间群通用EBR或拓扑分类。
- `#compute/dynamic-scattering-lab`：一维双原子纵向谐链的一声子相对散射强度，比较动量相位、Bose占据、Stokes/anti-Stokes、低能截断和分辨率。不是任意Phonopy文件的动态结构因子导入器，也不输出材料拟合的绝对截面。
- `#compute/domain-wall-lab`：两个独立实验分别求φ⁴中心约束畴壁和SSH开放链局域谱；报告网格收敛、解除中心约束后的Hessian稳定性及空间窗口重叠。不会把铁电壁宽自动转换为SSH电子参数，近零能也不自动等于界面态。
- `#compute/hubbard-cluster-lab`：2–4站点单带Hubbard精确对角化，计算简并基态等权平均、密度、双占据、自旋关联与U扫描；区分固定Sz扇区间隔、跨自旋扇区电荷增减隙及二聚体单重态–三重态分裂。有限团簇结果不证明热力学Mott相变。
- `#atlas/pathways`、`#atlas/projects` 与 `#docs/dictionary`：案例连接计算和推导，项目保存参数匹配的证据与笔记；词典显示变量、单位、约定和适用条件，利用当前上下文消歧，无法确定时保留候选或未知提示，不改写原始公式。

范围、课堂入口与复现说明见[四主题与词典总述](dist/docs/pathways.md)，文件哈希与一手来源见[本次来源清单](dist/data/pathways-provenance.json)。验证命令为 `npm run test:pathways`；完整旧模块回归继续使用 `npm test` 和 `npm run test:python`。

最终源码和目录修改后运行 `python scripts/refresh-pathways-provenance.py`，再以 `--check` 只读核验。新脚本保留旧清单的release、计数与来源，刷新旧文件哈希、补齐Python模块登记，并仅重建本次发布清单；不依赖本地临时助手文件，不打包、提交或发布。

## 晶体群符号专项修正（20261029-crystal1）

Hermann–Mauguin、Schönflies、操作名和不可约表示标签采用明确类型；紧凑空间群符号的螺旋下标由显式目录恢复，修正上划线、旋转方向、撇号及同基底上下标。全量验证3,546个符号，输入与导出继续使用原始标识符。通用公式修复重音范围，SVG改用真实字体几何定位。[规则、来源与验证](dist/docs/crystal-notation.md)。


## 全站公式与上下角标（20261029-math3）

修复课堂、分步推导、计算结果、材料案例与 SVG 图表中的公式排版。统一处理分组上/下标、Unicode 与 ASCII 混排、矩阵、多行公式及行内记号；保留原生 MathML、原始输入、代码、URL、数值计算和 JSON 导出，继续采用18px正文字号。

修改前的网站源码已备份到 [backup/2026-10-29-before-formula-fix](https://github.com/ljcj007/symmetry-lab/tree/backup/2026-10-29-before-formula-fix)，起点为 [`6514b43`](https://github.com/ljcj007/symmetry-lab/commit/6514b43e9153315d857be59668a0790b4ca40993)。显示层使用本地托管的 **KaTeX 0.19.1**、MIT许可证和20个WOFF2字体，无需第三方公式CDN。动态切换课程、展开推导、更新结果时继续排版；SVG使用原生tspan基线位移。

范围与维护说明见[公式显示](dist/docs/formula-display.md)，新增资源与来源哈希见[公式显示清单](dist/data/formula-display-provenance.json)。所有源码修改完成后运行 `python scripts/refresh-formula-provenance.py`，再加 `--check` 只读核验。旧清单保留历史版本与计数，仅刷新文件和Python模块哈希；脚本不改变计算、不打包或提交。

## 磁共振、超导结与多重态光谱（20261028-spectroscopy1）

新增 **3个主题、9课、9道分步练习（36步）、9个材料与模型案例、18个可复现实验预设及3份跨模块项目作业**。项目中心保留原有3份作业，共6份。内容融入现有课堂、计算中心、材料图谱与研究记录，保留既有功能、五个主导航和18px正文字号。

- `#compute/spin-resonance-lab`：最大36维有效电子/核自旋模型，联动磁场方向、g张量、D/E、超精细作用、微波偏振、热占据和磁偶极吸收。H/h使用GHz，磁场使用T；简并强度按子空间迹求和，谱线按正频面积归一。给定有效参数不从旧无SOC Kanamori模型自动推导；当前不含粉末、弛豫、饱和、脉冲或直接核磁驱动。课堂为 `#classroom/spin?module=resonance`。
- `#compute/andreev-lab`：正常有限链连接正常/s波超导半无限电极，使用精确迟致自能，计算电子与空穴反射、准粒子透射、电导和局域谱。`G=2(e²/h)(1−Rₑₑ+Rₕₑ)`已含两种物理自旋；E=0为零温线性极限，非零E为固定势谱微分电导。显式报告η吸收、守恒与粒子—空穴检查；精确能隙阈值留空。当前无Josephson、自洽配对、有限偏压自洽势或拓扑超导判据。课堂为 `#classroom/spin?module=andreev`。
- `#compute/atomic-spectra-lab`：完整 `p⁶d⁸→p⁵d⁹` 和 `p⁶d⁹→p⁵d¹⁰` 组态，包含d–d/p–d Slater作用、晶场与芯/价壳SOC，比较线/圆偏振、热占据和XAS差谱。能量相对末态组态重心，强度省略公共径向因子；不报告绝对吸收边，不含配体电荷转移、RIXS或材料拟合。课堂为 `#classroom/observables?module=spectra`。
- `#atlas/spectroscopy` 与 `#atlas/projects`：9个案例连接既有工具；3份新项目串联“多电子自旋→有效自旋→共振”“正常器件→Δ=0→Andreev反射”“Kanamori参照→完整多重态→偏振XAS”。每份包含3个阶段、参数匹配的计算证据、分步推导笔记和JSON/Markdown报告。正常器件比较须统一物理自旋倍数，并报告有限η引入的差异；记录完成不代表答案已自动批改。

范围、单位与复现入口见[磁共振、超导结与多重态光谱总述](dist/docs/spectroscopy.md)，来源与文件哈希见[本次发布清单](dist/data/spectroscopy-provenance.json)。三个核心均为浏览器Python/NumPy原创教学实现；材料名称为背景，示例参数不是实验拟合。

验证命令：`npm run test:spectroscopy`；完整回归继续使用 `npm test` 与 `npm run test:python`。最终源码修改后运行 `python scripts/refresh-spectroscopy-provenance.py`，再运行同一命令加 `--check` 只读核验。该脚本保留旧清单版本与计数，刷新所有旧文件哈希和Python模块哈希并生成本次清单，不打包或提交。

## 横向响应、器件与多电子态（20261028-response1）

新增 **9 课、9 道分步练习（36 步）、9 个材料与模型案例、3 份跨模块项目作业**，以及 17 个可复现实验预设。三个主题分别融入材料物性、晶体对称和自旋课堂，沿用计算中心、材料图谱、研究记录、五个主导航和 18px 正文字号。

- `#compute/hall-response-lab`：二维 QWZ 两带模型的内禀反常霍尔与横向热电片响应，提供有限温度占据与熵加权积分、化学势扫描、Berry 曲率热图及两层网格比较。采用电子电荷 −e、Berry 联络 A=i⟨u|∂u⟩，下带 Chern=+1 的零温绝缘平台为 σxy=−e²/h；αxy 的单位为 A/K，不能单独当作开路 Nernst 电压。精确闭隙时不报告带分辨响应，近闭隙结果保留分辨率诊断。
- `#compute/device-transport-lab`：2–40 格点均匀链或 SSH 链连接两个半无限电极，计算 retarded 接触自能、T(E)、零温线性 Landauer 电导、LDOS、左右注入谱和左入射归一键通量。显式核验反射、透射、数值 η 吸收及逐格点连续性；键通量为无量纲单通道量。范围为相干、弹性、非相互作用的一维模型，尚不包括有限偏压自洽势、有限温度窗口积分、SOC 或真实接触化学。
- `#compute/local-multiplet-lab`：五个 d 轨道、固定 0–10 个电子的立方晶场与完整 Kanamori 交换项，包含自旋翻转和成对跃迁，计算能量/自旋联合子空间、简并平均占据与晶场扫描。当前无 SOC；统一 J 的 Kanamori 近似不等于完整 Slater F⁰/F²/F⁴ 模型，不给出原子 LS 项标签或真实 NiO 的完整光谱。固定电子数时改变 U 只平移整个能谱。
- `#atlas/response` 与 `#atlas/projects`：9 个案例连接原有工具；3 份项目分别串联“量子几何 → Hall 响应”“SSH 体相 → 接触器件”“单电子轨道 → 多电子自旋”。每份项目含 3 个阶段，保存参数匹配的计算证据、推导笔记与综合结论，支持完整项目 JSON 和 Markdown 报告导出；完成计数不代表答案已自动批改正确。

方法与模型边界：[横向响应、器件与多电子态说明](dist/docs/response-materials.md)。来源与文件校验：[发布来源清单](dist/data/response-materials-provenance.json)。三个计算核心均在浏览器 Python / NumPy 中运行；Fe、NiO 等真实材料只提供背景，数值示例为原创教学参数。

验证命令：`npm run test:response`，涵盖三个独立 Python 核心、全部预设与内容引用、界面、36 个推导步骤及项目记录。完整 `npm test` 和 `npm run test:python` 同时保留旧模块回归。发布前在全部源码修改完成后运行 `python scripts/refresh-spectroscopy-provenance.py`，再运行 `python scripts/refresh-spectroscopy-provenance.py --check` 校验来源哈希；该命令只更新来源清单，不修改计算/界面代码、不打包或提交仓库。

## 轨道、量子几何与电子输运（20261027-quantum1）

新增 **9 课、9 道分步练习（36 步）**，融入原有七条学习路线、计算中心、材料图谱与研究记录，保留五个主导航、既有功能和 18px 正文字号。

- `#compute/crystal-field-lab`：可旋转 d 轨道与配位图；八面体 / 四面体晶场、四方分裂、十维单电子 SOC 与简并子空间平均密度；独立 E⊗e Jahn–Teller 势能面与解析极小值。不以单电子谱预测真实多电子高低自旋。
- `#compute/quantum-geometry-lab`：SSH / QWZ 量子度规、Berry 曲率、规范变换和能带联动；结合解析闭隙诊断与两层网格比较。已有 Berry / Wilson / Chern 工具继续保留，新增统一课堂和几何诊断。
- `#compute/electron-transport-lab`：常数弛豫时间近似下的 σ/τ、Seebeck 与 κₑ/τ、完整 BZ JSON 网格、二维片响应 / 三维体响应和当前 μ、T 的网格比较。不将高对称能带路径当积分网格，不报告缺少散射及晶格热导信息的真实材料 ZT。
- `#atlas/quantum`：局域轨道、Bloch 几何和电子响应的材料与模型案例；与已有磁性、畸变、声子及能带工具互相连接。

方法与范围：[轨道、量子几何与输运说明](dist/docs/quantum-materials.md)。验证：`npm run test:quantum`。Python 核心、全部课堂预设、36 个练习步骤、导出、路由及异步取消均纳入测试。

## 电子配对、非线性光学与缺陷能带（20261026-electronic1）

新增 **9 课、9 道分步练习（36 步）**，接入已有七条课堂路线、计算中心、材料图谱与研究记录。保留五个主导航、原有计算功能与 18px 正文字号。

- `#compute/pairing-lab`：二维方格自旋单态 s、扩展 s、dₓ²₋ᵧ²、dₓᵧ 与 d+id 的完整 4×4 BdG、二维配对函数和正常态费米面；解析判断准粒子节点。Kitaev 链提供体能谱、解析体能隙、Z₂ 判据、开放链谱与最低两态平均空间权重。给定配对参数，不求自洽能隙，不预测 Tc 或材料配对机制。
- `#compute/shg-lab`：GaAs（Tᵈ）、BaTiO₃（4mm）与中心对称 Oₕ 模型的同频二次谐波张量；仅施加最后两个输入指标的交换对称。支持实/复 χ 系数、(001)/(111) 切面、入射角、方位角和四种偏振通道。光强为体电偶极几何模型的相对值，不包含 Fresnel 系数、表面或高阶多极贡献，不由单幅图唯一判定点群。
- `#compute/unfold-lab`：一维单轨道完美、杂质、二聚化、交替势与真实删除轨道的空位超胞；展开谱权重、简并子空间合并显示、逐态和逐动量完备性检查。支持明确相位规范与轨道映射的预处理本征态 JSON；不是任意三维 VASP WAVECAR 解析器，只有结构或能量不足以展开。
- `#atlas/electronic`：材料背景与教学模型的联动案例，连接现有 GaAs / Si / BaTiO₃ 相关课程和工具。研究记录保留原始输入、结果、模型约定与版本；支持导出和重算。

方法与数据范围：[电子态与光学说明](dist/docs/electronic-materials.md)。验证：`npm run test:electronic`。所有新增科学计算由浏览器内 Python / NumPy 完成；界面只负责参数输入、图形与交互。

## 畸变、磁激发与有限温度材料（20261026-coupled1）

新增 **9 课、9 道分步练习（36 步）**，继续融入既有课堂、计算中心和材料图谱，保留原有功能、五个主导航和 18px 正文字号：

- `#compute/distortion-modes`：已对齐同胞结构的全局原子匹配、非正交晶胞周期最短像、应变与平移分离、用户模式最小二乘、三维调幅重构和 POSCAR / P1 CIF 导出。BaTiO₃ 五原子与 SrTiO₃ 2×2×2 反相氧转动为原创教学结构；模式不冒充自动生成的标准 irrep。独立双序参量 Landau 实验提供二维能面、全部驻点、连续简并极小与无下界诊断。
- `#compute/magnon-lab`：一维最近邻 XXZ 铁磁/反铁磁教学链，色散、磁胞折叠、相反圆偏振和自旋进动；区分局部能量稳定、全局经典参考态及软模。外场输入是 `h=gμB B` 的 meV 能量，不是 Tesla；不将链模型当作真实 MnF₂ 的定量谱。
- `#compute/qha-lab`：多体积静态能与振动自由能的局部体积优化，输出 V(T)、G、B_T、αV 与 Cp；可导入自由能矩阵或按体积排列的 Phonopy `thermalFiles` 数据包。核验同胞单位、温度网格和模式设置；无可信内点、端点温度及不可连续求导处保留空值，不外推平衡体积。
- `#atlas/mechanisms`：BaTiO₃、SrTiO₃、XXZ 教学链和多体积固体模型的连续研究路线；三个工具均可保存到材料研究记录，连同原始输入、单位、假设、版本与结果导出、恢复和重算。

说明：[结构畸变、磁激发与有限温度材料](dist/docs/coupled-materials.md)。验证：`npm run test:coupled`。计算使用同一公共 Python API，Landau 约化序参量与结构模式的 Å 幅度分别定义；内置参数与示例均为合成教学数据。

## 材料分析与研究记录（2026-10-26）

新增 **9 课、9 道分步练习（36 步）**，融入原有七条学习路径、计算中心和材料图谱，保留五个主导航与 18px 正文字号：

- `#compute/phonon-modes`：从 Phonopy 本征矢分析 Γ 点简并子空间，计算特征标并检查封闭性；当前标签覆盖 O_h、T_d、C_1、C_i。可调相位、幅度与相容超胞，三维查看冻结位移，导出 POSCAR / P1 CIF；输入长度单位须明确。Si/GaAs/NaCl 内置模式是合成教学数据。
- `#compute/band-connectivity`：二维方格 C4v 与 Rashba 教学模型，计算 Γ–X 两端的表示限制、连接图、镜面交叉与破缺开隙；不等于全 230 空间群的通用相容关系或自动拓扑分类。
- `#compute/phonon-thermo`：Einstein / Debye 模型、完整加权网格及总 DOS 的 F/U/S/Cv，或读取 `thermal_properties.yaml`。区分模型原胞与输入计算胞，检查模式权重、频率单位和零频策略；不把高对称路径当作布里渊区积分。
- `#atlas/research`：Si、GaAs 与二维方格模型的连续分析路线；课堂分别位于 `structure-dynamics?module=modes`、`crystal?module=bands`、`observables?module=thermo`。
- `#atlas/notebook`：本机保存材料项目，包含计算输入、完整结果、版本、解释笔记和学习进度快照；可导出 JSON、导入副本、修改输入重算和显式恢复进度。IndexedDB 存储，单项目限 32 MiB / 40 条计算；建议导出备份。

说明：[模式、能带与热力学](dist/docs/material-research.md)。验证：`npm run test:research`；三个工具均经由公共 `browser_api.py` 调用同一 Python 核心，已加入完整回归与 Pages 发布检查。

## 结构、相变与实验（2026-10-26）

新增 8 课、8 道分步练习（32 步）和 BaTiO₃ / Si / NaCl / GaAs 四条材料路线，沿用五个主导航与 18px 正文字号：

- `#classroom/structure-dynamics`：课程、交互实验、分步推导、材料案例。
- `#compute/phase`：Landau 自由能的驻点、稳定性和全局极小；理想 BaTiO₃ 单 Ti 轴向位移、48→8 点操作与六个几何方向畴。参数为无量纲教学值，不是实测相图或畴壁模拟。
- `#compute/diffraction`：Si/GaAs/NaCl/FCC/BCC/2₁ 模型及自定义晶胞；复结构因子、原子相位、Bragg 可达性、非正交倒易度量和有限指标粉末棒谱。区分格心、金刚石基底、螺旋轴与权重偶然抵消；常数散射因子不替代定量 XRD。
- `#compute/phonopy`：浏览器本地安全读取 band.yaml、qpoints.yaml、同结构 JSON；可补充 phonopy.yaml 原胞信息。分段色散、虚频容差计数、质量反加权复本征矢动画及 total/projected/XYZ DOS。不从结构或力常数文件重新求声子，不猜测未声明单位。内置样本为原创合成数据。
- `#atlas/dynamics`：四条材料学习路线连接旧结构图谱、声子/张量和新工具。导出保留输入、约定和完整结果。

说明：[结构、相变与实验](dist/docs/structure-dynamics.md) · [Phonopy 导入约定](dist/docs/phonopy-import.md)。
验证：`npm run test:dynamics`；命令行与浏览器共用 `browser_api.py`。新增 YAML 依赖为 PyYAML，浏览器通过 Pyodide 按需载入。


整合 [SpaceGroupIrep](https://github.com/goodluck1982/SpaceGroupIrep)、[MSGCorep](https://github.com/goodluck1982/MSGCorep)、[MagneticTB](https://github.com/zhangzeyingvv/MagneticTB) 和 [CrystKit](https://github.com/hongyi-zhao/CrystKit) 的数据与算法工作流。四个项目已实现的计算功能统一使用 Python，通过 Pyodide 在浏览器 Worker 内运行；JavaScript 负责界面、绘图和任务调度。网站为独立实现，不代表上游作者发布或背书。

## 网站导航与学习路线

2026-10-26 版将网站组织为五个顶层入口：**总览、群论课堂、计算中心、群与材料图谱、方法与文档**。总览提供学习、结构分析和表示耦合入口；计算中心按结构与晶胞、表示与共表示、张量积与重耦合、Hamiltonian 与能带、群分类与精确代数整理工具。课堂和计算中心复用相同计算器，已有参数、计算核心和精确结果约定保持一致。

“群论课堂”按先修知识组织成七条路径，避免把学习层级和物理对称种类混在同一排页签中：

| 学习路线 | 地址 | 主要内容 |
| --- | --- | --- |
| 基础与表示 | `#classroom/foundations` | 群、表示、32 点群、特征标与对称操作 |
| 晶体对称 | `#classroom/crystal` | 三维空间群、Seitz 乘法、Bloch 相位与材料 |
| 材料物性与光谱 | `#classroom/observables` | 声子、光谱选择定则、张量与热力学 |
| 结构、相变与实验 | `#classroom/structure-dynamics` | 相变、畴、衍射、Phonopy、模式与冻结结构 |
| 自旋与扩展对称 | `#classroom/spin` | 双群、磁群、色群、自旋点群与自旋空间群 |
| 连续群与物理 | `#classroom/continuous` | U(1)、SU(2)、SU(3)、生成元与物理应用 |
| 张量积与重耦合 | `#classroom/coupling` | 表示分解、CG 换基、Racah（6j）与四体 9j |

课程、实验预设、材料与推导题均可通过地址直接定位，例如 `#classroom/spin?track=color&lesson=color-02`、`#classroom/spin?tab=lab&experiment=spin_group&preset=af_space`。独立计算入口如 `#compute/lie/su3_ninej` 复用课堂中的 9j 计算器。旧的 `#pointgroups`、`#academy`、`#classroom/pointgroups`、`#classroom/lie` 等链接仍可使用。

总览、计算中心和图谱提供工具、课程、群编号与材料的统一检索；计算工具可收藏，总览显示最近访问。收藏和最近访问保存在当前浏览器，原有课程答题及分步推导记录继续沿用各自存储键。页面保留此前放大的字号，并提供面包屑和清晰的返回入口；课程页签保留键盘方向键与 Home / End 操作。

## 李群基础与物理应用

[李群基础](https://ljcj007.github.io/symmetry-lab/#classroom/lie)包含 32 个原创中文单元、32 个分步例题和 64 道解析自测：连续群与 U(1)、幺正矩阵、生成元与对易子、SU(2) 自旋旋量与 SO(3) 双覆盖、表示和维数、SU(3) 的 Gell-Mann 生成元、Cartan 子代数与基本表示权图。来源与数学约定见 [李群课程说明](dist/docs/lie-groups.md)。

原有三个基础实验由标准库 Python `lie_labs.py` 计算，使用 `U(θ)=exp(−iθT)`、`T=σ/2` 或 `λ/2`：SU(2) 的 Bloch 向量、复振幅和 2π/4π 检验；SU(3) 各生成元的态变换、测量概率和 Cartan 权；两组生成元的对易关系。界面显示角度与弧度，Python API 的 `angle` 始终为弧度。SU(3) 的参数不被解释为空间旋转角，权图也不是晶体原子位置。`dimension` 表示基本表示维数，`realDimension` 表示群流形的实维数。实验使用固定生成元的解析指数，不宣称支持任意矩阵指数或一般李群分类。

新增物理应用课程讨论二能级 Rabi 振荡、角动量耦合与 Clebsch–Gordan 系数、Heisenberg 交换、SU(3) Dynkin 标签、味/颜色对称和八重态直积；“分步推导”含 32 道可逐步揭示提示、推导和答案的练习，使用独立进度记录。

`lie_applications.py` 提供三个新的浏览器 Python 实验：

- Rabi：计算理想常量有效 Hamiltonian 的态与概率轨迹，明确区分共振、失谐和实际退相干。
- SU(2) 耦合：支持 `0 ≤ j₁,j₂ ≤ 3` 的整数或半整数角动量，计算耦合基、CG 系数、选定乘积态的总角动量概率及各向同性交换能级。公共 API 以整数 `twoJ`/`twoM` 表示两倍量子数。
- SU(3) 直积：每个输入 Dynkin 标签满足非负整数 `p+q ≤ 4`，通过整数 Gelfand–Tsetlin 权重计数和最高权扣除计算完整分解；显示重数、维数、二次 Casimir 与权图。包括 `3⊗3=6⊕3̅`、`3⊗3̅=8⊕1` 和 `8⊗8=27⊕10⊕10̅⊕2·8⊕1`。该实验给出不可约分量重数；完整 CG 基底计算由下述独立实验提供。

命令行示例：`python dist/python/cli.py teaching_labs input.json`，其中输入可为 `{"lab":"lie","experiment":"commutator","group":"su3","a":4,"b":5}`。验证命令 `npm run test:academy` 同时检查原有课堂、新课程和计算实验。


SU(3) CG 实验支持数值和精确两种模式，每个输入表示的 Dynkin 标签满足 p+q≤4。数值模式的直积维数上限为 256，精确模式上限为 81；包括 10⊗3、27⊗3，以及数值 27⊗8 等高维例子。完整换基矩阵 C 的行对应乘积基、列对应耦合基，坐标按 b=C†a 与 a=Cb 转换。同因子直积按交换对称性区分分量，8⊗8 中分别标出 8s 与 8a；相位和 GT 基顺序随结果导出。

精确模式由 SymPy 从有理数和根式 GT 生成元直接构造最高权核、正交投影与降算符关系，逐项检验正交性、全部八个生成元的交织关系及复振幅往返。输出包括 exactCGMatrix、精确复振幅和归一化概率字符串；数值近似同时用于绘图。精确输入的 re/im 分别填写实数、分数或 sqrt 根式，复相位通过两个分量表示。界面可切换模式、查看高维矩阵行列与热图、无损复用精确输出做反向换基，并导出完整 JSON。

```sh
python dist/python/cli.py teaching_labs dist/examples/su3-cg-exact-ten-three.json
python dist/python/cli.py teaching_labs dist/examples/su3-cg-high-adjoint.json
```

高维与精确计算新增三节课程和四道分步推导，讲解 10⊗3 的首降权系数、27⊗3 的分解、根式矩阵正交性及精确复振幅往返。原有课程与答题记录继续沿用。


SU(3) Racah（6j）实验计算三重张量积的两条耦合路径：`((A⊗B)⊗C)→D` 与 `(A⊗(B⊗C))→D`。每个输入因子从 `1、3、3̄、6、6̄、8` 中选择，总乘积空间最多 512 维；最终表示从精确字符分解中选择，矩阵作用在该最终表示的重数空间。每条路径同时记录中间表示及两个二元顶点的外重数，包含 `8⊗8⊗8→8` 的八条路径。

精确 Racah 矩阵 `F=V_R†V_L` 的行对应右路径、列对应左路径，坐标按 `b_R=F b_L`、`b_L=F† b_R` 变换。本项目采用 GT 相位下的维数缩约 6j 定义 `S_fe=F_fe/√(dimE dimF)`；S 满足加权正交，态换基使用 F。程序直接复合精确 CG 嵌入，在最高权重数空间求重叠，检查正交、重构、两树路径数，并用一个降权态核对相同 F。根式复振幅、完整反向换基、F/6j 系数切换、耦合路径树和 JSON 导出均在浏览器内运行。

新增三节课程、六道自测和四道分步推导，讲解 `3⊗3⊗3→8` 的解析矩阵、6j 加权正交、两级重数以及精确复振幅往返。CLI 复现示例：

```sh
python dist/python/cli.py teaching_labs dist/examples/su3-racah-three.json
python dist/python/cli.py teaching_labs dist/examples/su3-racah-octets.json
```

SU(3) 9j 实验比较四重张量积的两种成对耦合：`((A⊗B)E⊗(C⊗D)F)→T` 与 `((A⊗C)G⊗(B⊗D)H)→T`。每个输入因子允许 `p,q≥0`、`p+q≤4` 的全部 15 种表示，包括 `10、10̄、15、15̄、15′、15̄′、24、24̄、27`；总乘积维数不超过 4096，涵盖 19,258 种有序四因子组合。`15=(2,1)` 与 `15′=(4,0)` 分别标注，只计算实际分解中选定最终表示的重数空间。两侧路径分别保留两个中间表示和三个顶点的外重数，右树的 ACBD 坐标明确还原为 ABCD，再求精确重叠。

换基矩阵 `R=V_R†V_L` 的行对应右路径、列对应左路径；完整根式复振幅按 `b_R=R b_L`、`b_L=R† b_R` 往返。本项目的维数缩约 9j 定义为 `S[R,L]=R[R,L]/√(dimE dimF dimG dimH)`，满足维数加权正交，直接换基仍使用 R。全部结果由有理数和根式直接构造，保留本站 GT 相位和副本选基；不自动附加费米子交换符号，不声称与未转换约定的外部表逐项相同。

实验提供四因子与最终表示选择、左右成对耦合树、精确矩阵及热图、9j 视图、通道概率、完整复向量反向重耦合和 JSON 导出。8⊗8⊗8⊗8 的 4096 维空间有 13 种最终不可约表示；最终单态、八重态和 27 维表示分别产生 8×8、32×32、33×33 的精确矩阵。按最高权权重块组合稀疏嵌入，避免构造完整 4096×4096 CG 矩阵；当外部因子 B=C 时重用路径嵌入并置换张量轴。较大矩阵提供 8×8 分页、通道定位和完整热图，JSON 保留全部精确系数。浏览器 Worker 计算可取消，9j 单次计算时限 600 秒，首次加载解释器另限 180 秒。

高维部分新增三节课程、六道自测、四道分步推导，讨论八条单态不变量、32/33 条外重数路径、交换的 ±1 谱、双单态的 1/8 精确重叠和复振幅往返。CLI 示例：

```sh
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-four.json
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-color.json
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-adjoint-singlet.json
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-adjoint-octet.json
```

较高维输入使用按需生成的二元 CG 权重块：从精确最高权核出发，用稀疏降算符只求根顶点需要的 GT 列，保留原有相位、外重数选基与路径排序。不会为 `27⊗27` 先构造完整的 729×729 CG 矩阵。输入及最终表示都显示 Dynkin 标签；目标列表不会在 8 截断，例如 `15′⊗15′⊗15′⊗1→(12,0)` 合法且总维数为 3375。`10⁴`、`27⁴` 等超过 4096 的组合会明确提示调整。

新增含高维输入的演示包括 `10⊗3⊗3⊗3̄→15`（4 条路径）、`15⊗3⊗3̄⊗3→24`（5 条）、`27⊗3⊗3̄⊗3→42`（5 条），以及 `10⊗3³→8` 的精确二路径交换示例与 27 输入的复态往返。新增三节课程、六道自测和四道分步推导，用独立 LR tableaux、置换群关系与 Casimir 核对路径数和概率。

```sh
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-10-input.json
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-15-input.json
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-27-input.json
python dist/python/cli.py teaching_labs dist/examples/su3-ninej-10-permutation.json
```

## 32 点群课堂

“群论课堂”的“基础与表示”路线（`#classroom/foundations`，兼容 `#classroom/pointgroups` 和 `#pointgroups`）包含分步中文讲解、32 个晶体学点群图谱、可操作的对称变换实验及即时自测。课程参考 Dresselhaus、Dresselhaus 与 Jorio 的 [Group Theory: Application to the Physics of Condensed Matter](https://doi.org/10.1007/978-3-540-32899-5)（Springer, 2008），标注原书章节和印刷/PDF 页码；讲解、例题和绘图为独立编写，网站不提供原书 PDF 或书页图像。

图谱包含国际 / Schoenflies 符号、晶系、群阶、反演/极性/手性、笛卡尔操作矩阵、共轭类、单值特征标及极矢量、轴矢量和二次函数的表示分解。BC Γ 标签与可追溯的 Mulliken 名称并列；复共轭表示明确配对。IR/Raman 标记只表示对称性允许，不预测特定材料的振动频率、模式数量或散射强度。

教学表格由 `python scripts/build-pointgroup-course.py` 从固定群数据生成，并用 `python scripts/test-pointgroup-course.py` 检查全部 32 群的矩阵闭合、共轭类、特征标正交性和表示分解。静态教学无需等待 Python 运行环境；“送入工作台”在相应参考空间群的 Γ 点启动现有 Python 计算。更多约定见 [课程说明](dist/docs/pointgroup-course.md)。

## 空间群、双群、磁群、色群与自旋群课堂

“晶体对称”和“自旋与扩展对称”两条学习路径共同使用 24 个学习单元、24 个课内分步例题、48 道解析自测及 20 道独立分步推导。内容主题包括空间群 6 节、双群 6 节、磁群 5 节、色群 3 节与自旋群 4 节。参考原有 Dresselhaus 教材及 IUCr、Bilbao 和原始研究文献，具体来源和适用范围见 [课程说明](dist/docs/symmetry-course.md)。新增内容保留原有课程与题目的 ID，32 点群课堂仍为入门基础。

教学目录覆盖全部 **230 个空间群、1,651 个磁空间群和 122 个磁点群**，支持编号/符号检索、晶系/磁群类型筛选，以及单值或自旋双值工作台跳转。目录中的操作数指平移商的代表操作数，完整空间群仍是无限群；磁群 BNS 首段的含义按类型区分。目录不把“含分数平移”当成 symmorphic / nonsymmorphic 分类判据。

七类交互实验由同一个 Python 接口 `teaching_labs` 计算。原有四类是 Seitz 平移/螺旋/滑移复合与 Bloch 相位、自旋 1/2 旋量的 2π/4π 旋转、极向量与磁矩在空间/时间反演下的对照、反铁磁半格平移与时间反演的组合。前端显示 Python 结果并播放预计算帧；反铁磁示意模型分别检查“小群条件”和 `A² = −1`，不将示意箭头解释为真实材料能带预测。

新增三类实验由标准库 Python `group_extensions.py` 提供精确操作、有限乘法表与结构匹配；三维视图只投影其结果：

- **双群**：C₂ 的四阶旋量提升、三维点群 222 的 Q₈ 提升，以及双空间群 2₁ 螺旋关系 `ĝ²=ĒTz`。分开显示 2π 中心负号与 Bloch 平移相位；明确通常电子晶体双群的反演约定。
- **色群**：三色 C₃ 点模型和沿三个晶格方向重复的 RGB 三层模型。比较空间操作、内部标签置换与组合动作，求保色核并区分完整空间平移与有限商。有限颜色置换不同于 QCD 的连续 SU(3) 色规范群。
- **自旋群**：两站点点模型、三站点 120° 共面模型、三维反铁磁半平移和三层螺旋磁序。比较 `[U∥R|t]` 的组合、只动位置及只转磁矩，讲解自旋点投影、按磁矩秩得到的连续 spin-only 稳定子，以及 SOC 锁定条件 `U=(−1)^εdet(Rc)Rc`。

新增实验使用有理数及精确根式核对指定生成操作和其幂，步数限制为 1–12，三维空间群的完整平移部分始终保留。有限图表展示指定点子群或平移商，并不表示完整空间群只有有限阶。它们没有实现任意着色/磁结构的完整色群或自旋空间群分类器；230 和 1651 不是这些扩展群的总类型数。经典磁矩重合也不代替电子旋量的双覆盖或反幺正算符检验。`Spin(3)≅SU(2)` 与磁学自旋空间群分别说明两种不同结构。

新增来源包括 [Bilbao 双晶体群论文](https://arxiv.org/abs/1706.09272)、[有色点阵研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC392941/)、[IUCr 自旋对称操作搜索算法](https://journals.iucr.org/a/issues/2024/01/00/ib5119/)与[自旋点群和 SOC 的原始论文](https://journals.iucr.org/a/issues/2025/04/00/cam5007/)。课程例题和推导为本站原创，不转载文献图表。

重建目录：`python scripts/build-symmetry-course.py`。验证课程、目录与实验：`npm run test:academy`。这些教学实验也可由相同接口在本地 CPython 运行；新三类实验只需 Python 标准库。课程文本无需启动 Python，交互计算按需加载浏览器解释器。三个可复现输入为：

```sh
python dist/python/cli.py teaching_labs dist/examples/double-group-screw.json
python dist/python/cli.py teaching_labs dist/examples/color-group-space.json
python dist/python/cli.py teaching_labs dist/examples/spin-group-space.json
```

“材料实例”加入 NaCl、金刚石结构 Si、GaAs、bcc Fe、NiO 和 MnF₂ 的理想模型。三维视图支持拖动旋转、键盘调节视角、缩放、操作前后叠加、周期折回和磁矩箭头；原子变换与化学/磁结构的一一匹配由纯 Python `crystal_labs.py` 计算。模型明确标注母相、晶胞、磁畴和近似条件，不自动将一个操作的匹配结果解释为真实材料的完整磁空间群。

“分步推导”提供提示、逐步展开的计算过程、最终答案及自测反馈。12 道材料题保留原有结构、磁畴与坐标约定；新增 8 道理想模型题覆盖 Q₈ 交换子、双值螺旋、色同态与平移周期、自旋组合、三层螺旋、spin-only 稳定子和 SOC 锁定。理想模型单独标明，不冒充真实材料的测量结构。材料来源和练习适用边界见 [材料课堂说明](dist/docs/materials-classroom.md)。材料原胞/常规胞采用各自说明中的坐标；进入表示工作台后，波矢仍使用本站 BC 原胞约定。

## 启动与部署

Windows 可以直接双击 `start.cmd` 启动；关闭弹出的命令行窗口即可停止静态文件服务器。

需要支持 ES Modules 的现代浏览器。开发服务器和测试使用 Node.js 22 或更新版本，无需安装 npm 依赖。在项目根目录执行：

```sh
npm start
```

打开 `http://127.0.0.1:4318`。服务器只监听本机。可通过 `PORT` 环境变量更改端口。

将 `dist/` 的完整内容部署到任意支持 JavaScript 模块和 Web Worker 的 HTTP/HTTPS 静态服务器即可。请保留 `data/`、`examples/`、许可证和相对目录结构。不要通过 `file://` 直接打开 HTML；浏览器通常会阻止模块、Worker 或数据文件加载。

应用无需 Mathematica、GAP、Rust 原生扩展或 Python 服务器。首次运行从 jsDelivr 下载 Pyodide 314.0.7 解释器及 NumPy 2.4.6 / SymPy 1.14.0；需要联网并等待加载。群数据和本网站 Python 模块从本站静态文件读取。输入模型、上传文件和计算结果均留在浏览器，没有计算后端。运行任务可点击“取消计算”停止；重新启动解释器后可继续。未实现离线安装或 Service Worker 缓存。

### GitHub Pages

仓库包含 [GitHub Pages 工作流](.github/workflows/pages.yml)。在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，向 `main` 分支推送提交或手动运行 **Deploy GitHub Pages** 即可发布。发布前工作流会运行全部 `npm test` 和 `npm run test:python` 检查，从本次提交生成可下载的 `dist/source.zip`（该生成文件不再存入 Git），再把 `dist/` 上传到 Pages。部署成功后，工作流和仓库 Pages 设置都会显示网站链接。

页面资源、数据、示例与 Web Worker 均使用相对路径，支持 GitHub Pages 的仓库子路径，无需填写固定域名。此流程只需要 GitHub 自动提供的令牌，无需设置访问令牌或第三方服务密钥；源码包生成使用 Python 标准库，在线计算仍完全在浏览器运行。

本地 `.openai/` 托管配置、预览截图与 UI 检查记录不提交至仓库，也不包含在源码下载包中。GitHub Pages 配置说明见 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 功能与接口

| 功能 | 实现与边界 |
| --- | --- |
| 群查询 | 230 个 SG、1651 个 MSG、122 个 MPG；磁群 BNS/OG 编号、国际符号及 BC 符号 |
| 群操作 | BC 原胞 Seitz 操作、幺正/反幺正标记、双覆盖自旋矩阵 |
| 小群和 k 星 | 任意输入数值波矢的筛选及倒易空间作用 |
| 不可约表示 | 单值、双值投影不可约表示；维数、矩阵、幺正特征标 |
| 磁共表示 | Wigner a/b/c 类型、完整磁小群矩阵；反幺正矩阵按 `A K` 使用 |
| 全空间群表示 | 普通/磁群的全 k 星诱导表示、反幺正作用和整数格矢平移相位 |
| k 星直积 | 两个数值 k 星的张量积，按总波矢平移子空间分解；支持单/双值奇偶及磁共表示 |
| 能带匹配 | 读取 `vasp2trace`、`MagVasp2trace` 文本及明确排序的 JSON 特征标；分解到数值表示/共表示 |
| 导出 | 表格 CSV 与包含矩阵、约定和验证误差的 JSON |

主要代码入口：

- `dist/python/symmetry_core.py`：SpaceGroupIrep / MSGCorep 的 Python 数值内核，包含不可约表示、共表示、全 k 星诱导、直积和 trace 匹配。
- `dist/python/magnetictb_browser.py`：对称性约束跃迁模型、能带、hr、薄膜和拓扑计算。
- `dist/python/crystkit_browser.py`：有理数仿射群、有限商群、矩阵群和三维数据库识别。
- `dist/python-worker.js` / `python-client.js`：共享 Python Worker 的加载、调度、取消和超时；计算输入仅按 JSON 传入。
- `dist/app.js` / `research-ui.js`：页面交互与结果绘图。
- `dist/engine.js`、`induction.js`、`trace-parser.js` 保留为旧版独立回归参考，网页不调用这些 JavaScript 计算核心。

本机 Python 也可直接使用相同模块：

```sh
python -m pip install -r dist/python/requirements.txt
python dist/python/cli.py magnetictb dist/examples/magnetictb-graphene.json -o graphene-result.json
python dist/python/cli.py crystkit dist/examples/crystkit-space-group.json -o group-result.json
npm run test:python
```

`symmetry_core.analyze_group` 返回的矩阵/特征标使用明确的操作顺序。`littleGroup.unitaryIndices` 是小群内索引，须经 `littleGroup.sourceIndices` 才能映射到输入群的全局操作索引。trace 匹配请使用 `run("match_bands", payload)` 完成排序与分解。

## 坐标、标签与适用范围

1. 旋转和平移采用 Bradley–Cracknell（BC）直接原胞分数坐标；波矢采用其倒易原胞分数坐标。磁群使用 BNS family 对应的原胞。平移相位为 `exp(-2π i k·t)`，反幺正操作的波矢作用为 `-R^-T k`。
2. `D1, D2, …` 和 `C1, C2, …` 保留为本次计算的本地编号。普通空间群另由 `standard_labels` 比对完整特征标、平移相位和自旋提升，输出 BC / Bilbao 标准标签及匹配证书；缺失或歧义标签不强行命名。磁共表示不套用普通空间群标签。输出矩阵可能处于不同的等价基底，不能通过逐元素比较判断是否与论文一致。
3. 原有 SG/MSG 数值表示工具处理指定的数值 k 点，不生成 Wolfram 符号参数表达式或整条符号 k 线。上游高对称点名称可能依赖 BZ 类型；实际计算以坐标为准。
4. 页面晶格和倒易原胞采用示意参数；它们不是输入材料的实验结构，也不是 Wigner–Seitz 布里渊区。不能据此读取定量晶格长度和夹角。
5. trace 必须与选定群的 BC 原胞、原点及自旋框架兼容。新增 `structure_bc` 支持 POSCAR/CIF 到 BC 晶胞的转换。已有 trace 还包含原点相位和自旋框架，不能仅靠晶胞标准化自动转换；`autoConvTraceToBC` 的完整 trace 工作流仍未覆盖。匹配失败时应先准备正确设置的数据。
6. 存储的空间自旋矩阵采用 `↓↑` 基底、上游六位小数精度；trace 的 `↑↓` 基底在匹配时转换。数据库的 `antiunitary` 标记与空间自旋矩阵分开存储，时间反演由计算引擎处理。
7. 反幺正矩阵必须与复共轭算符 `K` 联用，其矩阵迹不作为普通线性特征标。能带共表示分解使用幺正限制的 Wigner 类型归一化；不完整的 Kramers/反幺正伙伴集合会被拒绝。
8. 原有表示、能带与拓扑计算使用双精度数值，并检查乘法关系、因子系统、正交性、维数或重构误差。有限的测试不能证明所有波矢、所有输入与上游标准标签完全等价。大维数全表示和直积仍会受浏览器内存与时间限制。

## trace 示例与限制

`dist/examples/trace-msg.txt` 是上游 Mn₃NiN、MSG `166.101` 文件的真实片段：保留原始电子数、12 个操作、Γ 点及前两个简并能级（共 4 条能带），仅将 k 点总数改为 1。它不是完整能带计算。页面“载入真实示例”会选择对应磁群、Γ 点和双值表示。

原始出处及截取方式记录于 `dist/examples/provenance.json`。解析器最多接收 10 MiB 文本，拒绝缺列、无效索引、非连续能带编号和不一致的能带总数。原始普通 `SG186` 测试文件的自旋框架与当前 BC 数据不兼容，因此测试验证其可解析且不会被错误匹配。

## 验证

```sh
npm test
node scripts/test-induction.mjs
node scripts/test-magnetic-induction.mjs
node scripts/test-trace.mjs
```

测试文件覆盖：

- `test-engine.mjs`：群闭合、波矢作用、单/双值因子系统、小群不可约表示、磁共表示、特征标分解及不合法输入。可选扫描参数以该脚本为准；生成的 `dist/data/engine-validation.json` 记录扫描范围和实际结果。
- `test-induction.mjs`：6 个普通空间群的 38 个全表示及 6 个 k 星直积，检验乘法、平移和维数守恒。
- `test-magnetic-induction.mjs`：18 个 type-II/III/IV 磁空间群、Γ/一般/边界 k 点与两种自旋设置的 254 个全共表示及 18 个直积；检查半线性乘法和平移相位。
- `test-trace.mjs`：真实普通/磁性输入、BC 操作匹配、双覆盖符号、整格矢 Bloch 相位、操作重排、坏输入拒绝，以及真实 Γ 点特征标到数值共表示的端到端重构。

旧 JavaScript 参考实现的 `engine-validation.json` 记录了已完成的 **11,530 次**小群计算：全部 230 SG 和 1651 MSG 在 Γ、`(1/2,1/2,1/2)`、`(0.173,0.271,0.389)` 三个波矢处分别计算单值/双值表示，全部 122 MPG 在 Γ 处计算两种自旋设置。该次扫描失败数为 0，最大记录乘法误差约为 `2.56×10^-14`；它不等于所有连续波矢或标准标签的穷尽验证。

数据提取阶段另用精确有理数检查了所有 1651 个磁群的 676,317 次 Seitz 乘积。平移公分母为 12，全部闭合；230 个普通空间群的 2609 个操作也与 type-I 磁群数据逐一交叉核对。

## 数据与许可

`dist/data/provenance.json` 记录上游仓库树哈希、来源文件、覆盖范围、约定及未移植接口。主要数据来源为 `getBCsymmetry.py`、`LittleGroupIrepData.wl`、`MSGData.wl` 和 `BC_MSG_elements/*.txt`。本网站不会加载 Wolfram 的 `libMLGCorep.mx`。

上游软件作者：**Gui-Bin Liu**。保留的 GPL v3 许可全文位于 `dist/data/LICENSE-SpaceGroupIrep.txt` 与 `dist/licenses/MSGCorep-GPL-3.0.txt`。其他声明见 `NOTICE.txt`。发布衍生版本时应一并保留源码、数据来源和许可声明。

研究中使用原项目数据时，请引用其原始软件与论文：

- SpaceGroupIrep，*Computer Physics Communications* **265**, 107993 (2021)，[DOI: 10.1016/j.cpc.2021.107993](https://doi.org/10.1016/j.cpc.2021.107993)。
- MSGCorep，*Computer Physics Communications* **288**, 108722 (2023)，[DOI: 10.1016/j.cpc.2023.108722](https://doi.org/10.1016/j.cpc.2023.108722)。

## MagneticTB Python 工具

模型输入明确指定晶格行向量、分数原子位置、s/p/d 轨道、完整对称操作及周期方向。支持站点轨道展开、反幺正操作、自旋 1/2 与用户局域矩阵，以线性约束零空间产生数值跃迁基底；每次建模检查厄米性和对称协变性。示例包括石墨烯、自旋链、SSH 和 QWZ Chern 绝缘体。

支持 Wannier90 hr 读写、Bloch 能带、有限边界、薄膜、表面 Green 函数、Wilson 环 / Berry 相位和 FHS Chern 数。Hamiltonian 采用周期轨道规范 `H_ij(k) = Σ_R t_ij(R) exp(+2πi k·R)`，能量单位跟随输入参数。Chern/Wilson 要求占据子空间与其余能带有直接带隙；需提高网格验证收敛。JSON 输出保存规范和数值诊断。

本版本不是上游 >160 个接口的完整兼容层：精确分圆域、符号跃迁约束和闭合多项式轨道基底已在新增符号模块中实现；完整自旋空间群目录、连续自旋群、自动 Wyckoff 和标准 k 路径、DFT 拟合、节点搜索及 Z₂ 不变量仍未覆盖。模型参数不是由真实材料第一性原理自动拟合所得。

## CrystKit Python 工具

精确有理数 Seitz 运算、坐标 / 原点变换、群闭合、点轨道 / 稳定子、有限商群导出群及最小生成元搜索、矩阵块分解、成对矩阵共轭、平移格简化、有限阶 GL(n,ℤ) 算法和三维参考群匹配。使用本站 230 群的 BC 原胞数据库；所有匹配结果须通过完整操作集相等验证，并给出 basis / origin。

有限商群生成元不等于无限空间群最小生成元。新增扩张模块为无限群给出生成证书、上下界；只有上下界相等时才声明最小。可选受限坐标搜索未找到匹配，不证明仿射非同构。CARAT 完整有理类目录和固定整数点群的精确上同调现已提供，范围如下；原 GAP 接口不能直接调用本 Python 模块。

## Python 移植验证与来源

`scripts/test-python-symmetry.py` 对照冻结的旧 JavaScript 独立结果：130 个小群分析、330 个诱导表示、24 个直积及真实 trace 数据，同时检查 Python 结果自身的群乘法、半线性法则、维数与特征标。测试不会逐项强制数值基底相同。新模块测试分别为 `test-python-magnetictb.py` 和 `test-python-crystkit.py`；采用解析模型、精确群恒等式与错误输入检查。

新项目的固定版本、移植范围和参考源码 SHA-256 记录在 `dist/data/python-provenance.json`。`upstream/MagneticTB` 和 `upstream/CrystKit` 保存相关原始源码和声明。MagneticTB 原始许可为 GPL-3.0-only；CrystKit 为 GPL-2.0-or-later，在本组合衍生版本中按 GPL-3.0 发布。许可全文随网站与源码包提供。

完整 Python 数据库扫描记录于 `dist/data/python-symmetry-validation.json`：11,530 次分析全部通过，最大记录矩阵乘法误差 5.66×10⁻¹⁴；记录包含实现源码 SHA-256。该扫描不能替代对任意连续波矢和真实材料设置的核验。

## 精确代数与高维群（2026-10-16）

网页新增“精确代数与高维群”，与原有工具共用浏览器内的 Python Worker。`browser_api.py` 提供相同的本机 / 浏览器 JSON 分发接口，提供 `carat`、`carat_integral`、`integral_normalizer`、`arithmetic_centralizer`、`symbolic`、`symbolic_interfaces`、`symbolic_spacegroups`、`crystkit_ext` 八种精确工具。输入不经过 eval 或任意代码执行。

### CARAT 分类

固定上游 [CARAT](https://github.com/lbfm-rwth/carat) 修订 `65619d6ae4ec911c8cf7aa3c9fa09866a0d36ab9`，提取全部 **8,329 个 Q 类代表**、精确整数生成元、群关系、特征矩阵和类数。1–6 维 Q 类数量为 2、10、32、227、955、7103；数据按维数 gzip 压缩并延迟加载，可通过 `scripts/build-carat-data.py` 从固定源码重建。来源文件及哈希见 `data/carat/manifest.json`。

- `catalog`：按维数、阶及名称检索，支持 `offset` / `limit` 分页。
- `representative`：返回精确矩阵与群关系，可施加指定坐标变换。
- `classify`：从输入整数矩阵闭合有限群，计算共轭类与精确特征不变量；需要时用群代数中心的本原幂等元和有理交织矩阵验证 Q 类。输出 `q_status`、`z_status` 与明确证书。
- `invariant_lattices`：穷尽指定有限指数内的 HNF 不变子格，给出整数共轭代表与完成范围。不同子格可能属于同一 Z 类，**不把子格数当作 Z 类数**。

Q 等价允许 GL(d,ℚ) 变换，Z 等价要求 GL(d,ℤ)，仿射等价还包括平移部分。完整 Q 类目录并不等于完整高维 Z 类 / 仿射类枚举器；上游存储的 Z 类、仿射类“数量”也不等于本站已经生成了所有这些代表。新的 `carat_integral` 与 `integral_normalizer` 模块进一步实现下述有证书算法；新增有限导子区间与算术中心化子算法的具体证明范围见后文；并未预先生成全部高维 Z 类和仿射类。三维全仿射等价类为 219；通常的 230 空间群类型按手性进一步区分，不能混用这两个计数。

### 精确符号模块

`symbolic_core.py` 使用安全 AST 数学解析器和 SymPy 精确域直接构造约束，**不通过数值 SVD 再猜测有理数**。支持：

- 有理数、根式、复数、实 / 正参数假设；表达式化简、展开、因式分解、矩阵行列式、秩、零空间、逆及特征多项式。
- 分圆域 ℚ(ζₙ) 中的精确运算、共轭、迹、范数和矩阵零空间。
- 厄米 / 幺正 / 反幺正对称约束的精确跃迁参数化，符号 Bloch Hamiltonian、k 线代入、小矩阵精确谱和数值模型导出。
- 闭合多项式轨道基底（含七个 f 轨道）的精确旋转表示；有限阶多项式 k·p Hamiltonian 的对称性约束。

符号参数默认实数。一般参数下的矩阵秩有例外集合，结果保留相应非零条件，不能忽略分母或秩变化条件。符号几何需明确提供闭合键集合；自动壳层枚举要求可比较的精确数值几何。网页支持 MathML 公式、JSON / LaTeX 下载。没有承诺等价覆盖上游全部 Mathematica / GAP 接口，自动符号 k 线表示由独立的 `symbolic_spacegroups.py` 精确算法生成，仍不自动赋予 BC / Bilbao 标准标签。

### 群扩张与无限空间群

`crystkit_extensions.py` 以整数 Cayley 关系格与带变换的 Smith 标准形计算 **H¹(P,ℚᵈ/ℤᵈ) ≅ H²(P,ℤᵈ)**，对所有原点变化取商；这里固定输入整数点群 P。支持完整向量系统代表、正规化子作用的轨道、定向轨道与对映体判断。

原扩张模块的度量正规化子仍保留作为后备算法。公开网页 / CLI 的正规化子与扩张轨道接口已接入新增算术正规化子，支持循环群、初等交换 2 群及进一步可证明的情形。用户指定正规化子子群时不会自动假定完整。无限群生成元使用 Schreier 平移格证书、阿贝尔化与有限商下界；只有上下界一致才声明最小。精确原点同余求解不依赖猜测分母网格。

新增测试覆盖二维全部 17 个壁纸群、四 / 六重螺旋扩张、六维上同调、无限群生成证书、分圆域恒等式、精确 Hamiltonian 对称性，以及 CARAT 目录完整性与 Q / Z 区分。大规模计算受浏览器 180 秒任务上限和各算法资源边界约束；未穷尽时明确返回状态或错误。

```sh
python dist/python/cli.py carat dist/examples/carat-catalog-6d.json
python dist/python/cli.py symbolic dist/examples/symbolic-chain.json
python dist/python/cli.py crystkit_ext dist/examples/crystkit-ext-wallpaper.json
```

### 整数类与仿射类

`carat_integral.py` 的 `z_classes` / `affine_classes` 接受 CARAT `name` 或整数 `generators`，维数为 1–6。它构造实际代表，并将 `z_complete` 与 `affine_complete` 分开报告。

- 素数阶循环群 C₂、C₃、C₅、C₇：以平凡、分圆与正则整格块构造全部整数类，并求全部仿射代表。六维对合 `min.178` 得到 **4 个 Z 类、7 个仿射类**。全部 34 个素数阶 Q 类的结果与独立 CARAT 计数一致。
- 已验证的极大序模型优先使用下述有限导子区间算法，不依赖官方类数证明穷尽。旧 `neighbors` 路径仍枚举模素数不变子空间，利用 Smith 不变量、整数等价和等距证书去重；其资源受限结果只有达到独立官方类数时才标记完整。有限搜索没有找到新代表不构成穷尽证明。
- 在各 Z 类上计算完整 H²，再计算正规化子子群轨道。在 Z 类已完整枚举的前提下，完整正规化子，或所有 Z 类的轨道总数恰好达到独立官方仿射类数，均可提供仿射分类完整性证书。后一种证书不把正规化子本身标成完整。
- `z_equivalent` 返回 `equivalent`、`inequivalent` 或 `inconclusive`；不会把同样的有限不变量误当作等价证据。代表序号是本次输出的局部编号，不是 CARAT 官方 Z 名称。

网页可将选中的整数代表直接送入正规化子或固定点群扩张工具。仿射生成元应与输出所列的整数平移格一起使用。资源预算中断时保留已证明结果，并明确指出哪些步骤尚未完成。

### 算术整数正规化子

`integral_normalizer.py` 在 1–6 维处理循环表示和初等交换 2 群表示，包括重复不可约块与非平凡整格粘合。循环分量使用精确分圆整环、单位与 Galois 作用；符号特征分量使用完整 GL(m,ℤ) 生成元。有限格轨道上的 Schreier 稳定子计算恢复原整数格，因而支持无限正规化子，而不限于某个正定度量的有限等距群。

结果提供 `complete`、`finite`、`generators`、`everyGeneratorVerified` 和证明记录。有限搜索预算不是完备性证书。非循环群还可通过特征循环子群的精确 Schreier 归约、已验证的重复绝对不可约张量块，或内在分块度量处理。测试包含 8 个二面体系列、六维重复块、A₄ 加固定轴的 96 阶正规化子。公开入口现进一步接入下述算术中心化子与完整自同构提升算法，旧实现保留作后备。仍未覆盖的数域和除代数类型会明确返回未完成状态。算法证明见 [整数分类说明](dist/docs/integral-classification.md) 与 [正规化子说明](dist/docs/integral-normalizer.md)。

### 精确符号表示接口

`symbolic_interfaces.py` 提供独立的无状态 JSON 接口，复用安全表达式解析器。支持多矩阵分圆域编译与共核、精确线性 / 投影 / 反幺正表示律验证、交织空间、不可约投影与矩阵单位、特征标和张量积分解、子群诱导、Wigner 共表示、Reynolds 对称化、符号 Seitz 运算及 Bloch 规范变换；还支持符号 k 线小群的 Bloch 余循环与全 k 星表示平移相位。共 13 个计算操作；覆盖记录另纳入自动符号空间群接口及 CrystKit 公开函数。

这些接口以用户给定的乘法表、矩阵和因子系统为输入；验证群律、余循环、不可约性等必要前提，不自动生成标准 BC / Bilbao 标签。反幺正交织使用实线性方程，原始分母与一般参数条件随结果保留。逐函数的迁移范围、输入约定与未移植项记录在 `dist/data/symbolic-api-coverage.json`。

```sh
python dist/python/cli.py carat_integral dist/examples/integral-affine-noncyclic-6d.json
python dist/python/cli.py carat_integral dist/examples/integral-involution-6d.json
```

### 有限导子区间与算术中心化子

`finite_conductor.py` 从整数群环在验证过的极大序模型中的指数构造 `c M ⊂ Z[G]`。将每个整数格的极大序包络归一化后，只需遍历 `c Z^d ⊂ L ⊂ Z^d` 的有限区间，因而无需用目录中的类数推断候选已穷尽。支持 1–6 维有限交换群的分圆 PID 分量、分裂有理矩阵代数模型，以及绝对不可约有理表示。完整性仍分别依赖候选遍历、整数等价判定和仿射正规化子轨道完成；超出资源限制的步骤保留未完成标记。`classification_method` 可选 `auto`、`conductor`、`neighbors`，最后一种保留原有受限邻格流程。证明与输入约定见 [整数分类说明](dist/docs/integral-classification.md)。

`arithmetic_centralizer.py` 对任意输入有限整数点群计算饱和交换子整数序、乘法结构常数、单位范数方程以及有理中心本原幂等元分解。`action: order` 只计算整数序；`centralizer` 才请求单位群。完整单位群分支包括可验证的分裂有理表示及任意整格粘合、正定范数的有限单位群、实二次整数序的 Pell 基本单位，以及可与这些分支组合的有限粘合。完整正规化子还需穷尽保持有理特征的群自同构并验证整数提升。一般高次数域、任意除代数和超出预算的单位群计算仍返回明确的未完成状态，不能把已算出的整数序误作已算出全部单位。见 [算术中心化子说明](dist/docs/arithmetic-centralizer.md)。

`crystkit_ext` 的 `affine_properties` / `torsionfree` 检查所有非平凡点群陪集的范数矩阵 Smith 整数可解性，给出无挠性、可定向性和饱和中心平移格。有挠时返回经精确乘方验证的有限阶元素。输入要求完整的原胞整数平移格；非原胞分数平移会被拒绝。见 [仿射性质证明](dist/docs/affine-properties.md)。

### 自动符号空间群表示

`symbolic_spacegroups.py` 从 `group_number`、`magnetic_group` 或给定的精确 Seitz 操作构造符号小群、k 星、投影不可约表示、Wigner 共表示和全 k 星诱导表示。相位使用原始有理平移；双值表示通过不变度量与精确 SU(2) 提升构造，不使用数据库中舍入后的自旋矩阵。输出精确验证所有乘法、特征标正交和维数平方和，保留符号 k 的适用条件。

可用动作包括 `analyze`、`group`、`little_group`、`star`、`central_extension`、`spin_operations`、`origin`、`symbol`、`induce`。`api` / `function` 接受覆盖清单中列出的原接口名，返回统一 JSON 契约。标签 `E/M/F` 为本次计算的局部编号，未经标准表映射；连续参数的特殊值需代入重新计算。有限群阶、分圆阶数和诱导维数预算会显式拒绝过大任务，详见 [符号空间群说明](dist/docs/symbolic-spacegroups.md)。

```sh
python dist/python/cli.py arithmetic_centralizer dist/examples/arithmetic-c3-order.json
python dist/python/cli.py symbolic_spacegroups dist/examples/symbolic-sg-screw.json
python dist/python/cli.py symbolic_spacegroups dist/examples/symbolic-sg-fullstar.json
```

逐项清单包含四个项目的 **319 个唯一公开符号**，其中 175 项为计算接口；其余为数据、选项、显示或外部 I/O。截至本版，83 个计算接口仍没有对应迁移流程，此外有部分覆盖项。清单可在网页按项目、状态或名称检索，不能把整个项目标为已经完整移植。

## 结构转换与标准标签

网页侧栏的“结构 → BC 晶胞”读取本地 POSCAR / CONTCAR / CIF，可设置对称性容差和输入波矢。结果给出 BC 原胞、ITA 常规胞、未理想化晶胞、基矢/原点/倒易坐标变换、生成元与原子协变检查，并导出 POSCAR / CIF / JSON。可直接把识别到的空间群和 BC 波矢送入表示工作台。

结构解析与坐标处理由 Python 完成；空间群识别采用从官方源码构建的 spglib 2.8.0 WebAssembly 内核。输入结构不会传到服务器。CPython 使用官方 `spglib==2.8.0` 包，同一个 JSON API 可本地批处理：

```sh
python dist/python/cli.py structure_bc dist/examples/structure-silicon.json -o silicon-bc.json
python scripts/test-python-structure-bc.py
python scripts/test-python-structure-bc.py --all
python scripts/test-spglib-wasm.py
```

普通空间群工作台自动显示 BC / Bilbao 标准标签，并在专门的结果页提供候选与匹配证书。`analyze` 输入带 `group_number` 时，JSON 的 `standardLabels` 保留本地编号到标准标签的对应关系；矩阵、CSV 与能带分解的本地引用不会因为命名而改变。

方法、适用输入和可复现构建见 [结构转换](dist/docs/structure-bc.md)、[标准标签](dist/docs/standard-labels.md) 和 [spglib 浏览器内核](dist/docs/spglib-browser.md)。普通 230 空间群转换不处理磁结构、部分占位或无序模型；标准标签范围以打包表和匹配证书为准。


### 材料物性与光谱（2026-10-26）

新增共享课堂与计算工具：`#classroom/observables`、`#compute/phonons`、`#compute/tensors`。Si、GaAs、NaCl 案例从材料图谱直接连接原胞振动、光谱选择定则、允许的物性张量与分步练习；沿用五项主导航、现有课堂进度和 18px 正文字号。

- `phonon_spectra.py` 从三种二原子 fcc 原胞的位点置换与笛卡尔旋转计算 Γ 点机械特征标，精确约化声学与光学表示；提供 IR / 一阶非共振 Raman 允许性、相对位移动画及给定偏振几何的相对因子。谱峰位置和线宽是用户假设输入，不是声子频率预测。
- `property_tensors.py` 用精确生成元约束介电、弹性、压电与线性平衡磁电张量，支持自定义正交笛卡尔矩阵及时间反演。显示独立参数、零元、相等关系与旋转响应。自由参数的数值为演示输入，不推断真实材料常数；不处理耗散输运 Onsager 关系。
- 课程与案例数据：`dist/data/material-observables.json`；方法、来源与范围：`dist/docs/material-observables.md`。新增测试入口 `npm run test:observables`；完整 JavaScript / Python 回归继续在发布流水线运行。


## 2026-10-31：同粒子、拓扑缺陷与互易响应

新增 9 课、36 个分步练习步骤、19 个计算预设、6 个预测题、9 个材料背景与模型案例，以及 3 个跨模块项目（项目中心合计 23 个）。保留已有功能、18px 正文字号与公式排版。

- 置换群：两电子完整轨道 × 自旋交换、Pauli 投影、S₃ 中心投影与指定 Young 幂等算符。
- 缺陷：XY / 平面向列闭环绕数、核心有效性检查、可移动环路与 Ising 畴壁构型。
- 响应：Onsager–Casimir、完整磁态反转、空间协变和非负耗散检验。
- 共享交互：三层对称性诊断台、反例挑战、带假设的精确符号判分、A/B 完整证据与报告。

计算使用浏览器 Python，新增核心 `dist/python/symmetry_connections.py`。课程与案例位于 `dist/data/connections-materials.json`；独立诊断入口 `#compute/symmetry-audit`，材料入口 `#atlas/connections`。

模型范围、变量约定、验证和数据保存说明见 [同粒子、缺陷与互易响应](dist/docs/connections.md)。这批功能不宣称任意同伦群、任意 S_n 表示或真实材料参数拟合。


## 层群、手性与多体 SPT（20261031-frontiers1）

新增三组课堂、18 个交互预设、36 个分步练习步骤、9 个材料背景/模型案例和 3 个跨模块项目，接入全部原有课堂、计算中心和材料图谱。共享三空间操作联动、容差与伪对称证据、逆向候选集合判分和有限扰动路径。沿用放大字号、公式词典与浏览器本地计算。

- [模型、约定、边界与验证](dist/docs/frontiers.md)
- 图谱入口：`#atlas/frontiers`；计算入口：`#compute/layer-symmetry-lab`、`#compute/chirality-polarity-lab`、`#compute/manybody-spt-lab`。
- 层模型只报告立方母体继承操作；手性模型限有限点集；SPT 使用 N=3–5 的精确对角化，只有 AKLT 点输出解析虚拟射影证据。未把有限模型或有限采样伪装成任意晶体分类或无限链相图。
- 专项验证：`npm run test:frontiers`。
