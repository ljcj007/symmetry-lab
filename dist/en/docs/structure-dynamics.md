# Structural transitions, diffraction extinctions, and Phonopy data lessons

Three tools join existing lessons, calculators, atlas. `data/structure-dynamics.json` contains8 lessons,8 exercises,32 steps,4 material cases.

## Entries and learning routes

| Entry | Address | Content |
| --- | --- | --- |
|Lessons|`#classroom/structure-dynamics`|Concepts, demos, steps, cases|
| Phase transitions and orientation domains | `#compute/phase` | Single-component Landau free energy, stationarity/stability and ideal polar orientation domains |
| Diffraction extinctions | `#compute/diffraction` | Structure factors with specified scattering weights, phase sums, and extinction origins |
|Phonopy import|`#compute/phonopy`|Existing frequencies, paths, modes, DOS|
| Material routes | `#atlas/dynamics?material=silicon` | One material connects lessons, exercises and computations |

Material IDs: `batio3`,`silicon`,`nacl`,`gaas`. Query parameters `lesson`,`material` link lessons and cases. BaTiO₃ is this module's own ideal teaching model, independent of the old atlas's six structures.

Start Landau wells/local minima, count six  polarity  directions from parent actions, explain scattering changes via factors, then import your Phonopy to distinguish shapes, frequencies, negative curvature, and full stability.

## Eight lessons and hand-calculable results

| Lesson ID | Topic | Key self-check |
| --- | --- | --- |
|`landau-stability`|Stationarity, local stability, global equilibrium|`F=−Q²+Q⁴` minima `Q=±1/√2`, `F=−1/4`|
| `polar-domains` | Parent groups, stabilizers and orientation domains | `Oh→C4v`, direction count `48/8=6` |
| `soft-modes` | Mass weighting and complex displacement phases | `m=(1,4)`, `e=(1,2)/√5` recover equal-amplitude translation |
|`structure-factor`|Coherent scattering-arrow sums|Two unit-weight half-cell-separated points:100 extinct,200 intensity4|
| `centering-basis` | Centering, basis and accidental cancellations | Si 100 and 200 vanish from different levels of conditions |
| `screw-glide` | Screw-row versus glide-plane conditions | `2₁(z)` constrains `00l`; an x-normal c glide constrains `0kl` |
|`phonopy-files`| primitive cell , branches, units, paths|Two-atom  primitive cell  has6 modes per full q|
| `imaginary-modes` | Imaginary frequencies and frozen-mode verification | A negative display does not establish a transition temperature or stable periodic motion |

Each exercise states a model and parameters, with hints, exclusive choices, and explanations at each step. These are not an experimental database; numbers have independent algebraic/geometric checks.

## Landau/ polar domain  conventions

Use

```text
F(Q) = a Q² + b Q⁴ + c Q⁶ − h Q
F′(Q) = 2 a Q + 4 b Q³ + 6 c Q⁵ − h
F″(Q) = 2 a + 12 b Q² + 30 c Q⁴
```

No extra `1/2`,`1/4`,`1/6` prefactors are used. All parameters and Q are dimensionless teaching quantities. Zero-curvature stationary points require higher-order tests; positive-curvature local minima must be compared with other minima for equilibrium. Global minima first require bounded energy; pathological truncated-polynomial parameters do not give credible phase diagrams.

BaTiO₃-style cubic ABO₃ five-atom parent: Ba origin, Ti center, O three face centers. Move only Ti along selected ±x/y/z. Small nonzero+z retains `4mm`  point group ;  space group  becomes `P4mm`. Even accidentally cubic metrics do not restore parent structural symmetry.

The six directions form the orbit of a polar vector, with an unchanged translation subgroup. These are orientation domains, without additional antiphase domains. Single-component free energy is a slice along one direction and cannot explain all three-dimensional directional energy differences. The six-domain display does not calculate walls, bound charges, switching, real polarization, temperature sequences or the full BaTiO₃ soft mode.

## Diffraction conventions and material comparisons

Use  conventional cell   fractional coordinates , integer `(h,k,l)`, and constant real user scattering weights:

```text
F(h,k,l) = Σj fj exp[2πi(h xj + k yj + l zj)]
I_model = |F|²
```

Translating all atoms changes only the overall phase; moving one sublattice changes relative phases. Sum complex amplitudes before taking squared modulus. Default atomic-number weights are illustrative and are not full angle-dependent X-ray atomic form factors.

| Model and explicit weights | Reflection | F | Model intensity | Explanation |
| --- | --- | --- | --- | --- |
|Si, `fSi=1`|100|0|0|F-centering|
| Si, `fSi=1` | 200 | 0 | 0 | Additional condition from identical atoms in the diamond basis |
| Si, `fSi=1` | 220 | 8 | 64 | Centering and basis both add constructively |
|GaAs, `fGa=1,fAs=2`|200|−4|16|Unequal weights do not fully cancel|
| NaCl, `fNa=1,fCl=2` | 111 | −4 | 16 | Difference of two sublattice amplitudes |
| NaCl, `fNa=1,fCl=2` | 200 | 12 | 144 | Two sublattices add |

Equal GaAs weights1 cancel200, but chosen weights do not establish a universal  space group  prohibition. Passing one condition means only that condition does not force extinction, not guaranteed nonzero full factors.

For `{R|t}`, first verify `Rᵀh=h`, then inspect `exp(2πi h·t)`. A z-directed `2₁` screw gives `00l: l=2n`; a c glide with normal x and translation c/2 gives `0kl: l=2n`. Extending a row condition to every hkl is incorrect. Interactive calculations and custom sites help check phases; this is not a complete extinction classifier for every setting of all 230 groups.

`|F|²` omits powder-intensity geometry, thermal motion, absorption, peak shapes, and multiple scattering. Physical assumptions still need checking between model zeros and actual peaks.

## Phonopy data/animation

Import existing data without running VASP in the browser, refitting force constants or inventing missing modes. Main fields follow official formats:

```text
natom: 原胞原子数
phonon[i].q-position: 原胞倒易基底中的约化 q 坐标
phonon[i].band[j].frequency: 输入文件中的频率
phonon[i].band[j].eigenvector: [原子][x,y,z][实部,虚部]
segment_nqpoint: 路径各段包含的点数（若提供）
```

Frequency units prioritize explicit user/file declarations. Without one, show “undeclared unit”; common THz usage does not establish every file's unit. Without reliable segments, display scatter points rather than disguising discrete q points as continuous dispersion. Preserve known path breaks.

Animations need eigenvectors, masses, lattice, positions. Phonopy eigenvectors are Cartesian complex  mass weighting   dynamical matrix ; finite-q displacements follow

```text
ujℓ ∝ Re[(ej/√mj) exp{2πi q·(ℓ+xj) − iφ}]
```

reconstruction. Animation uses common visual amplitude normalization, without temperature, zero-point amplitudes or absolute thermal displacements. If finite q is incompatible with the displayed supercell, interpret it as a finite observation window rather than a frozen-mode supercell satisfying periodic boundaries. For imaginary frequencies, scanning φ periodically shows eigenvector shape, not a real unstable dynamical trajectory.

Previously calculated `total_dos.dat` and `projected_dos.dat` are supported. Preserve raw values and normalization; atomic/xyz projection columns must match the primitive cell. A histogram of path frequencies is not a 3D BZ DOS. Frequencies/eigenvectors do not automatically yield IR/Raman activity, Born charges, Raman tensors, or LO–TO corrections here.

Safe YAML and size limits:8MiB text,128  primitive cell  atoms,2000q,60000 mode points,20000DOS rows,512 display atoms. Export needed subsets externally for larger data; truncated data are not complete spectra.

All built-in Phonopy samples are synthetic teaching data for testing fields, paths and animations. Entering from a material case does not relabel a synthetic sample as that material’s predicted result.

## Scientific validation and sources

Run content checks:

```text
python scripts/test-structure-dynamics-content.py
```

Tests check bidirectional references among lessons/questions/materials/sources, usable stepwise answers and route consistency, and independently verify core examples with polynomials, signed permutations of the cubic group and explicit atomic phase sums. Screenshots do not replace scientific-result validation, nor lesson prose numerical tests of the cores.

- [Official ISODISTORT help](https://iso.byu.edu/isodistorthelp.php): distortions, parent/subgroups, and equivalent domains.
- [IUCr: Structure factor](https://dictionary.iucr.org/Structure_factor): factors/phases.
- [IUCr: Reflection conditions](https://dictionary.iucr.org/Reflection_conditions): general/special reflection conditions and the scope of centering, screws and glides.
- [Phonopy: Output files](https://phonopy.github.io/phonopy/output-files.html): YAML, frequencies, modes, and DOS fields.
- [Phonopy: Formulations](https://phonopy.github.io/phonopy/formulation.html):  dynamical matrix , mass weights, phases.

These links verify methods and formats; course narrative, teaching parameters, material routes and stepwise exercises are original to this site.
