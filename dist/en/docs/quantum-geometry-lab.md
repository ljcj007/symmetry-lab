# Quantum geometry/topology diagnostics

This module turns the existing tight-binding Berry, Wilson and Chern concepts into a continuous learning workflow, adding quantum metrics, gauge-phase tests, analytical gap-closing diagnostics and mesh comparisons. It calculates SSH/QWZ two-band models rather than analyzing topology of arbitrary first-principles materials.

Entry `quantum_geometry_lab.run(payload)`, browser API action `quantum_geometry_lab`, route `#compute/quantum-geometry-lab`, lesson module `geometry`, content group `quantum-materials`. Depends only on NumPy, without additional Python files, network, or native programs.

## Models, bands, units

Select the negative-energy lower band with chemical potential in the zero-energy gap. Momentum is dimensionless ka in radians with a=1; energies share an arbitrary unit. The quantum metric differentiates with respect to ka and is dimensionless here; using physical-length k requires transforming derivatives and units.

- SSH: `H=(t1+t2 cos k) σx+t2 sin k σy`; nonnegative t1,t2 are intracell/intercell hoppings.
- QWZ: `H=s[sin kx σx+sin ky σy+(m+cos kx+cos ky) σz]`, overall energy s>0, dimensionless mass m.

Use a fixed periodic orbital basis with identity sewing matrix at the Brillouin-zone boundary. The U(1) test only multiplies a band eigenvector by a k-dependent phase; it does not change the cell, origin or orbital embedding. Those changes can alter the SSH Zak convention and metric expression and must not be confused with eigenstate phase freedom.

## Quantum geometry and signs

Use `Aμ=i<u|∂μu>`,2D orientation kx then ky:

```text
P=|u><u|，Qμν=<∂μu|(1−P)|∂νu>=Tr[P ∂μP ∂νP]
gμν=Re Qμν，Ωμν=−2 Im Qμν
Qμν=gμν−iΩμν/2
```

For `H=d·σ`, define `n=d/|d|` and lower-band projector `(I−n·σ)/2`. Using analytical derivatives of d, the program computes:

```text
gμν=(∂μn·∂νn)/4
Ωxy=n·(∂xn×∂yn)/2  （下带）
det g=Ωxy²/4，tr g≥|Ωxy|  （二维两带纯态）
```

Signs match `magnetictb_browser.py`'s `A=i<u|∇u>` convention. Selecting the upper band or reversing orientation changes curvature/Chern signs. SSH is 1D, showing only gkk and Zak. A formal ky-independent extension sets gxy,gyy,Ωxy to 0 internally, without interpreting them as 2D material responses.

## Link variables/gauge tests

For adjacent states define `Uμ=<u(k)|u(k+δμ)>/|overlap|`. Under this site’s sign convention:

```text
Zak=−arg∏k U(k)，以 [0,2π) 代表元报告
flux(k)=−arg[Ux(k) Uy(k+δx) Ux*(k+δy) Uy*(k)]
C=Σflux/(2π)
```

Boundary links are included in periodic loops. Any link overlap ≤10⁻¹⁰ invalidates the grid-link algorithm. The phase slider uses smooth periodic α(k) and reports maximum projector residual, maximum change in all overlap moduli, and closed-loop topology change. Gauge changes should leave these invariant; passing does not establish model completeness or convergence.

## Global isolation/convergence

A finite mesh can miss band crossings, so the program first uses the analytical direct gap:

- QWZ: `Δdirect=2s min(|m+2|,|m|,|m−2|)`; critical m=−2,0,2.
- SSH: `Δdirect=2|t1−t2|`; t1=t2 closes at k=π; t1=t2=0 makes all bands degenerate.

The QWZ gap follows from `|d/s|²=2+m²+2m(cx+cy)+2cxcy`, bilinear in `cx=cos kx, cy=cos ky`, whose minimum can be attained at a square corner.

Isolation thresholds: QWZ `10⁻¹⁰s`, SSH `10⁻¹⁰ max(t1,t2,10⁻¹²)`. At closure or below threshold, main topology, analytic phase labels, and loop-phase comparisons remain blank. Geometry is still shown at local nondegenerate points; degenerate points return JSON `null`, not fabricated zero metrics or Infinity/NaN.

Meshes N/`2N−1` begin −π without repeating right endpoints. Main numerical Chern appears only with both meshes valid, analytic-phase agreement, and cell flux away from branch edges. Site lower-band/orientation QWZ phases:

| m interval | C |
| --- | --- |
| m<−2 | 0 |
| −2<m<0 | +1 |
| 0<m<2 | −1 |
| m>2 | 0 |
| m=−2,0,2 | Undefined: band gap closes |

For gapped SSH, t2>t1 gives Zak=π, and t1>t2 gives0(mod2π). It depends on periodic-orbital/intracell conventions, not convention-free absolute polarization.

`topology.defined` indicates a passed global band-isolation check; `numericallyResolved` indicates reliable current-mesh diagnostics. Even for a mathematically gapped model, an unreliable mesh leaves the main `value` blank while convergence tables retain each mesh value and deviation. The error of direct Riemann integration of analytical curvature is separate and is not hidden when FHS already yields an integer. These diagnostics use known analytical results of the two models rather than claiming a complete convergence proof for arbitrary models.

## Inputs

```json
{"model":"qwz","mass":-1,"energyScale":1,"t1":0.6,"t2":1,"mesh":31,"pathSamples":121,"gaugeStrength":1,"kx":0.6,"ky":0.4}
```

| Field | Range and default |
| --- | --- |
| model | Default qwz, or ssh |
| mass | −6 to 6, default −1; QWZ only |
| energyScale | 0.05–10, default 1; QWZ only |
| t1, t2 |0–5, defaults0.6,1; SSH only|
| mesh | Integer 9–101, default 31; refined mesh up to 201 |
| pathSamples | Integer 31–401, default 121; per segment for QWZ, whole path for SSH |
| gaugeStrength |0–20, default 1; changes eigenvector phases, not H|
| kx, ky | −π to π, defaults 0.6, 0.4; SSH uses kx only |

All numbers must be finite; booleans are not numbers and integer fields require JSON integers. Unknown fields are rejected. Both models accept the same field set, with `unusedParameters` identifying unused inputs.

## Output/plots

- `bands.distance/energies/ticks`: −π to π for SSH or Γ–X–M–Γ for QWZ.
- `heatmap`: QWZ only; 1D kx,ky coordinates and `[ky][kx]` arrays for gxx,gxy,gyy,metricTrace,berryCurvature,gap,valid.
- `line`: SSH only; k, metric, gap, energies, valid.
- `selection`: local geometry at the current wave vector, lower-band `<σ>=−n`, and eigenvectors/projectors before and after phase changes. Complex numbers use `[re,im]`.
- `topology`: defined status, mesh reliability, numerical/analytic results, analytic gap, closure points, and explanations.
- `convergence`: N/2N−1 link values, curvature/error, minimum overlap, maximum flux, sampled gaps.
- `gauge/checks`: gauge residuals, two-band geometric identities and analytical/sampled gap comparisons.

## Teaching content and validation

`data/quantum-geometry-content.json` merges into catalogs:5 presets,3 lessons,3 four-step exercises,3 model/method cases. Exercises cover gkk=1/4 SSH limits, energy scaling versus geometry, Chern orientation, local geometry versus topology, odd-grid missed Γ closures, and gauge-test limits.

`python scripts/test-python-quantum-geometry-lab.py` independently verifies projector finite differences and Kubo velocity-matrix formulas, the QWZ phase diagram, random pointwise gauges and coordinate reversal, analytical SSH metric/Zak phase, two-band metric identities, gap closings missed by grids, incorrect near-critical discrete integers, finite JSON outputs and input limits.

## Sources

Implementation and teaching text are original, not full ports of the software below.

- [Fukui, Hatsugai, Suzuki(2005)](https://arxiv.org/abs/cond-mat/0503172): gauge-invariant discrete Chern algorithm.
- [Qi, Wu, Zhang](https://arxiv.org/abs/cond-mat/0505308): background for the two-dimensional lattice topological model.
- [tbkit quantum-metric tutorial](https://cpoli.github.io/tbkit/api/gallery/topology/plot_quantum_geometry.html): projected quantum-geometric tensors, metrics, and curvature conventions.
- [Su, Schrieffer, Heeger(1979)](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.42.1698): SSH/polyacetylene history; actual polymer structures are not solved here.
