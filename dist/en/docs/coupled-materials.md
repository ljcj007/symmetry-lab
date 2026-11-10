# Structural distortions, magnetic excitations, and finite-temperature materials

Version `20261026-coupled1` adds 9 lessons, 9 stepwise exercises and 36 derivation steps. The three computational cores run in browser Python, using the existing learning routes, computation center, material atlas and material research records; the enlarged body text is retained.

| Topic | Computation center | Classroom entry |
| --- | --- | --- |
| Structural-distortion decomposition and mode coupling | `#compute/distortion-modes` | `#classroom/structure-dynamics?module=distortion` |
| Magnetic exchange, magnons and spin waves | `#compute/magnon-lab` | `#classroom/spin?module=magnons` |
| Quasiharmonic approximation and thermal expansion | `#compute/qha-lab` | `#classroom/observables?module=qha` |

Material routes are in `#atlas/mechanisms`. BaTiO₃/SrTiO₃ connect structural transitions,  frozen phonon  forms, and diffraction. XXZ connects magnetic lessons and MnF₂ context. Multivolume solids connect Phonopy import to fixed-volume  phonon  thermodynamics. The chain is not quantitative MnF₂; built-in QHA data describe neither Si nor other real materials.

## 1. Reference frames and atomic correspondence for structural distortions

This tool analyzes two structures **already aligned to a common compatible cell basis and origin**. Parent and distorted phases must share atom count, elemental counts, and full occupancy. It does not automatically find supercell matrices, origin shifts, substitutions, or chemical-disorder relations, or construct standard irreducible-representation bases from structure pairs.

For JSON input, see [BaTiO₃ example](../data/examples/distortion-batio3.json) and [SrTiO₃ example](../data/examples/distortion-srtio3.json). Main fields:

```text
parent, distorted:
  lattice: 3×3 晶格矩阵，基矢按行，长度单位 Å
  atoms: [{symbol: 化学元素符号, coordinates: 三维分数坐标}, ...]
  lengthUnit: "angstrom"
modes:
  [{id: 唯一名称, label: 描述, vectors: N×3 笛卡尔方向}, ...]
atom_mapping: 可选；第 i 项是母相原子 i 对应的畸变相原子索引，索引从 0 开始
image_shifts: 可选 N×3 整数矩阵；从包装后的分数坐标差中减去的周期镜像平移
remove_translation: 是否移除全部原子的算术平均位移，默认 true
amplitudes: 可选重构模式幅度数组，单位 Å；省略时沿用最小二乘幅度
reconstruction_lattice: "parent" 或 "distorted"，默认后者
restore_translation: 是否恢复被移除的平移，默认 false
```

All `modes[].vectors` must follow the parent structure’s atom-list order; `atom_mapping` handles correspondence between two structures only and does not reorder mode inputs. Fractional coordinates are first wrapped into `[0,1)`, so explicit `image_shifts` refer to these wrapped coordinates.

Automatic atom matching minimizes the total squared displacement within each element and compares the best and second-best one-to-one mappings; it is not rowwise greedy nearest-neighbor matching. Near-equivalent mappings or equally short periodic images halt calculation and require `atom_mapping` or `image_shifts`. The default cost-difference threshold is `mapping_tolerance²`, with `mapping_tolerance=10⁻⁶ Å`; maximum single-atom displacement defaults to `max_displacement=1.5 Å`. Above this threshold, check reference cell and origin before increasing it.

For  fractional coordinates  difference Δf, use the actual parent-lattice Lp metric to find

`u_ref = (Δf−n)Lp, n∈Z³, minimize ||u_ref||`.

Componentwise rounding does not guarantee the shortest distance in a nonorthogonal cell. The core uses QR decomposition followed by a three-dimensional sphere search for the nearest lattice image; ill-conditioned lattices or search-limit overruns raise errors rather than silently falling back to approximate wrapping. Current limits are 80 atoms, `min(240,3N)` modes and lattice condition number 10000.

Homogeneous lattice deformation and internal atomic displacements are reported separately. With lattice vectors as rows, the deformation gradient acting on Cartesian **column** vectors is

`F=(Lp⁻¹Ld)ᵀ，E=(FᵀF−I)/2`。

E is Green–Lagrange strain. A rigid cell rotation changes F without generating E. Reference internal displacements correspond to `u_ref Fᵀ` in the distorted lattice. Projection always uses the parent metric; Cartesian displacements at different strains cannot simply be combined as one mode-amplitude set.

Selecting translation removal subtracts the arithmetic mean displacement of all atoms. This is a geometric origin convention, not a mass-weighted center of mass; reconstruction does not restore this overall translation by default.

## 2. Mode amplitudes, reconstruction, and structure export

Normalize each input mode with Euclidean norm `Σᵢ|eᵢ|²=1` to build 3N×m matrix B. There is no mass weighting, unlike  phonon   dynamical matrix  eigenvectors. The projection solution is

`Q = argmin_Q ||BQ−u_ref||²`。

For an orthonormal basis, Q=Bᵀu; nonorthogonal modes require a joint least-squares solution. The core uses SVD and reports the Gram matrix, rank, singular values, condition number, normal-equation residual and uncovered displacement. For rank deficiency, it returns Moore–Penrose minimum-norm coefficients while explicitly noting that these mode coordinates are not unique. A residual is not automatically assigned another irrep label.

Mode vectors are dimensionless and amplitude Q is in Å. It is a coordinate of the full atomic-displacement vector, not the maximum displacement or rotation of one atom. For current reconstruction amplitudes Q′,

`f_new = f_parent + (BQ′)Lp⁻¹`。

Choose parent or distorted lattice to carry these  fractional coordinates . Hollow 3D markers are parent reference positions on the same reconstruction lattice, not necessarily an energy minimum. Original Q and adjustable reconstructed Q′ remain separate.

The built-in BaTiO₃ example uses an ideal five-atom cell, two independent polar-displacement directions, synthetic amplitudes `[0.22,0.07] Å` and 1.2% elongation along c. SrTiO₃ uses a compatible 2×2×2, 40-atom supercell, with oxygen-octahedron rotations about z alternating as `(-1)^(i+j+k)`, corresponding to parent-cell wave vector `(1/2,1/2,1/2)`; synthetic amplitudes are `[0.12,0.55] Å`. Rotation directions come from small-angle linear displacements, so arbitrary amplification does not preserve strictly rigid octahedra. Both mode sets are original teaching directions, not claimed to come from force constants or standard irrep tables.

POSCAR and P1 CIF export retain all reconstructed atoms. POSCAR groups elements; `reconstruction.exports.poscarAtomOrder` explicitly maps to the parent atom list. Left-handed cells reverse both the first basis vector and first fractional coordinate to preserve physical handedness. CIF does not inherit unverified parent symmetries. Export supplies geometry only, not forces, relaxation, or proof of stability.

See [ISODISTORT notes](https://iso.byu.edu/isodistorthelp.php) and [ISODISPLACE paper](https://doi.org/10.1107/S0021889806014075) for structural modes and standardized analysis. This module does not fully reproduce mode generation, group–subgroup databases, or refinement.

## 3. Independent two-order-parameter Landau model

The interactive free energy uses

`F=a1 Q1²+b1 Q1⁴+a2 Q2²+b2 Q2⁴+c Q1²Q2²`。

Q₁ and Q₂ are **independent reduced dimensionless  order parameter **, with reduced-energy F. They are not automatically calibrated to structural amplitudes in Å units above. Coefficients are not fitted from the displayed structure. Independent sign reversal of each  order parameter  is assumed; actual allowed invariants depend on representations and  wavevector  rules.

The first version requires b1,b2>0. If `c>−2√(b1b2)`, the quartic term is positive in every nonzero direction and the energy grows coercively. Positive c has no upper bound; `c²<4b1b2` is not the condition for global boundedness. If `c<−2√(b1b2)`, the energy is unbounded below; the lowest pixel in a finite plot cannot represent equilibrium.

At the negative boundary `c=−2√(b1b2)`, also inspect `a1/√b1+a2/√b2`: positive values remain coercive, negative values make energy unbounded below, and zero can give a noncompact continuous valley of degenerate minima. At the positive boundary `c=2√(b1b2)`, a particular ratio of quadratic terms gives a continuous elliptical minimum, not just discrete minima.

Enumerate the origin, two single-mode axial branches, and nonzero mixed branches. Solve the latter using x=Q1² and y=Q2²

`[[2b1,c],[c,2b2]] [x,y]ᵀ = [−a1,−a2]ᵀ`, with x,y>0 required.

The Hessian identifies ordinary local minima, maxima, and saddles; zero-curvature boundaries also require higher-order checks. Continuous solutions of singular linear equations are output separately as `stationaryFamilies`. If bounded below, all candidates are compared for the global minimum; otherwise minimum energy is null. Plot limits are separate from the mathematical domain, so real minima outside the plot are retained. Default parameters give four mixed minima `(±√0.44,±√0.24)`, F=−0.304.

## 4. XXZ  ferromagnetic  chain and  antiferromagnetic  chain

Both teaching models count each undirected nearest-neighbor bond once, with coordination number z=2. J>0, and spin operators use dimensionless S:

`H_FM=−J Σ⟨ij⟩(SxiSxj+SyiSyj+ΔSziSzj)−h ΣiSzi`，

`H_AFM=+J Σ⟨ij⟩(SxiSxj+SyiSyj+ΔSziSzj)−h ΣiSzi`。

J and h are in meV; `h=g μB B` is Zeeman energy, **not Tesla**. Δ≥1 is XXZ easy-axis exchange anisotropy, with no extra single-ion `K(Sz)²` term. For S=1/2 that term is constant and cannot create a single-ion gap. Supported S values are 1/2,1,3/2,…,10.

Neighboring spin spacing is a. Input/plot `q` means qa/π, from −1 to 1 for FM and −1/2 to 1/2 for AFM, whose magnetic-cell length is 2a. This q is not an ordinary  reciprocal lattice -vector  fractional coordinates  after arbitrary cell choice.

The FM reference state has all spins along +z:

`ε(q)=2JS[Δ−cos(qa)]+h`。

At Δ=1,h=0, the long-wavelength limit is `ε≈JS(qa)²`, with a zero mode at Γ. Local energetic stability of the +z reference requires `h+2JS(Δ−1)≥0`; even then, −z has lower global classical energy for h<0. Local stability and the global classical ground state are shown separately.

AFM uses collinear Néel A/B moments alternating ±z:

`ω0(q)=2JS√[Δ²−cos²(qa)]，ε₋=ω0−h，ε₊=ω0+h`。

Here ω0 denotes an energy scale in meV; divide by ℏ to obtain angular frequency. In global Cartesian coordinates, the matrix of `iℏ ∂t S⁺=M(q)S⁺` is

`M=[[2JSΔ+h, 2JS cos(qa)], [−2JS cos(qa), h−2JSΔ]]`

It is not Hermitian and has eigenvalues `h±ω0`. Do not treat it as an ordinary two-band Hamiltonian with a Hermitian eigensolver, or interpret its two signed eigenvalues as two positive excitation energies. The two physical branches have opposite global circular polarizations.

Classical spin-flop threshold `h_sf=2JS√(Δ²−1)` and saturation-field energy `h_sat=2JS(Δ+1)` apply. Beyond threshold, the original Néel state's signed branches remain for stability teaching, not spin waves of a new canted/saturated state. Real undamped frequencies do not guarantee energetic stability. Isotropic AFM q=0 includes a zero-frequency Jordan block; distinguish real frequencies from boundedness of every perturbation.

The precession plot uses one small-amplitude linear eigenmode. The transverse amplitude is at most 20% of S; the longitudinal component is renormalized only to retain arrow length in the display. This is not nonlinear Landau–Lifshitz integration, thermal motion or scattering intensity. Ordinary frequency is ν=ε/h_Planck in THz; the phase uses εt/ℏ with time in ps. Do not confuse h_Planck with the field energy h. A zero-frequency mode has no finite period; stable-precession animation is disabled for energetically unstable reference states. The display shows a segment of an infinite chain rather than connecting its ends into a finite ring.

Linear spin-wave theory approximates small fluctuations about an ordered reference. [Toth and Lake's original paper](https://arxiv.org/abs/1402.6069) explains its setting; official pySpinW tutorials for [ferromagnetic chains](https://spinw.org/pyspinw/tutorials/ferromagnetic_chain/index.html) and [antiferromagnetic chains with rotating frames](https://spinw.org/pyspinw/tutorials/antiferromagnetic_chain/index.html) illustrate exchange and magnetic cells. This module omits DMI, damping, noncollinear states, finite-temperature transitions, magnon interactions, and real-material fitting. Small-S one-dimensional antiferromagnetic quantum chains can have spinons or Haldane gaps; this semiclassical dispersion does not determine their exact spectra or finite-temperature long-range order.

## 5. Quasiharmonic free energy, volume optimization, and thermal expansion

Add harmonic vibrational free energy to the static lattice energy at each volume, and at constant hydrostatic pressure p minimize

`G(T,p)=min_V [E_static(V)+F_vib(T,V)+pV]`。

Several volumes are required; one fixed-volume DOS or phonon path cannot determine thermal expansion. [Phonopy QHA documentation](https://phonopy.github.io/phonopy/qha.html) defines the multivolume workflow and free energies. This site uses local quadratic/cubic polynomials near sampled minima and **does not implement Phonopy's Vinet or Birch–Murnaghan equation-of-state fits**.

V, E, F, G refer to the same input cell. Units: V in Å³/input cell; energies eV/input cell; p and isothermal bulk modulus B_T in GPa;αV in K⁻¹; S, Cp in J/(mol input cell K). One mole means N_A input cells, not automatically a mole of atoms, formula units, or minimal  primitive cell .

Use `pV[eV]=p[GPa] V[Å³]/160.2176634`; 1 eV per input cell is approximately 96.485332 kJ/mol of input cells. First confirm that static and vibrational energies use the same cell normalization; filenames or material names alone do not justify combining them.

The built-in model uses 3n Einstein modes with `θ(V)=θ0(V0/V)^γ` and a static parabola

`E_static(V)=[B0/(160.2176634)] (V−V0)²/(2V0)`。

B0 is in GPa. γ,θ0, V0, B0 are illustrative. Zero-point energy participates in volume optimization; even for T=0, the vibrational equilibrium volume can differ from static V0.

### Two import formats

Both formats share `cellBasis:"same-input-cell"`, positive integer `natom`, strictly increasing `volumes`, and matching `staticEnergies`. Declared units must include:

```json
{
  "cellBasis": "same-input-cell",
  "natom": 2,
  "units": {
    "volume": "angstrom^3",
    "staticEnergy": "eV/input-cell",
    "temperature": "K",
    "vibrationalFreeEnergy": "eV/input-cell"
  }
}
```

This shared metadata fragment requires the relevant fields below. Complete runnable examples: [multivolume free-energy matrix](../data/examples/qha-multivolume-demo.json) and [Phonopy thermal-file collection](../data/examples/qha-thermal-files-demo.json). Both contain original synthetic data.

| Source | Additional fields | Strict conventions |
| --- | --- | --- |
| `source:"matrix"` | `temperatures`, `freeEnergy` | `freeEnergy[temperature index][volume index]` contains vibrational free energy only; static energies are separate. Units: `eV/input-cell` or `kJ/mol-input-cell` |
| `source:"thermal"` | `thermalFiles` | In `volumes` order; every entry contains complete `thermal_properties.yaml` text or its parsed object, not a path or remote URL |

Call `qha_lab` through the public Python API with the dataset in `data`; the interface import box accepts the dataset itself or a wrapper containing `data`. Calculation parameters such as `pressure`, `fit_degree` and `fit_window` belong to the outer call. Current limits are 5–61 volumes and 3–501 temperature points; volumes are not automatically sorted, temperature tables are not interpolated or truncated, and missing matrix entries raise errors. A single interface JSON file is limited to 8 MiB.

Every `thermalFiles` entry must share natom, temperature grid, and identifiable units. Mode subsets with `band_index` are rejected. The program checks consistent integrated-mode fractions, frequency cutoffs, and Γ-acoustic exclusions at every volume. If present, `num_modes` and `num_integrated_modes` must both be given, and full mode counts must be integer multiples of 3n. Missing counts, excluded modes, or differing q meshes retain warnings. Equal integration fractions do not prove absence of imaginary modes or mesh convergence; free-energy matrices cannot recover that information.

### Minima and temperature derivatives

At each temperature, select 5, 7 or 9 volume points around the lowest sampled free energy and fit by least squares in scaled coordinates. Accept only minima inside neighboring volume intervals, with positive curvature and consistency with the raw energies. If the lowest point lies on the volume boundary, no reliable interior minimum exists or the fit disagrees, equilibrium volume and related derivatives return null. Boundary values are not treated as equilibrium volumes, and no extrapolation is made outside the sampled interval.

`B_T=V ∂²F/∂V²`，`αV=(1/V)(∂V/∂T)_p`，`S=−(∂G/∂T)_p`，`Cp=−T(∂²G/∂T²)_p`。

Temperature derivatives use local quadratic interpolation over three neighboring valid temperatures, allowing unequal spacing; endpoint temperatures remain blank. Invalid neighbors, multiple valleys, or disconnected volume branches prevent continuous derivatives. Energy residuals, quadratic/cubic fit volume differences, negative Cp, and other issues are reported. Small residuals do not replace temperature, volume, and phonon-q-mesh convergence. αV is volumetric expansion, not a general anisotropic crystal's linear expansion coefficient.

This version optimizes one isotropic volume only, excluding anisotropic strain, strong anharmonic renormalization, finite-temperature electronic free energy, magnetic entropy, interphase stability, and conductivity. Positive B_T concerns volume curvature only, not shear,  phonon , or global phase stability.

## 6. Save, recalculate and verify

All three tools export JSON containing inputs and complete results. The structure tool also exports POSCAR/P1 CIF. Magnon and QHA outputs retain parameters, units, reference states, raw samples, numerical checks, and invalid states; null must not be treated as zero.

Create/select a material project in `#atlas/notebook`, add recent calculations, fill sources/explanations, and save. Export backups, import new copies, restore supported progress, and recalculate edited inputs in the current version. New results append records while preserving older versions for comparison. Limits remain 32 MiB/40 calculations in this browser's local database; GitHub publication does not publish imported data. Export independent backups before changing devices or clearing browser data.

Run verification with `npm run test:coupled`. The structural core checks analytical mode amplitudes, exhaustive nearest-image searches in nonorthogonal cells, full-permutation matching, strain/rotation separation, export round trips and degenerate Landau solutions. Magnon tests check eigenproblems, long-wavelength limits, positive/negative branches and spin lengths; QHA tests check solvable free energies, volume minima, unit conversions, temperature derivatives and invalid data. Interface and public-API regressions are also included.

Lesson text, exercises, preset structures, and teaching parameters above are original to this project. Method references explain concepts and interfaces, not full ports of ISODISTORT, SpinW, or Phonopy. Implemented scope follows this page, output warnings, and specific input checks.
