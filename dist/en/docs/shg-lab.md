# Rotational-anisotropy SHG: point groups, tensors, and polarization

Project specified second-order polarization onto incident/analyzer directions, comparing four sample-rotation channels. Browser NumPy computes with original teaching coefficients, not measured/first-principles GaAs/BaTiO₃.

## Tensor and frequency conventions

χ_ijk means χ_ijk(2ω;ω,ω): output at 2ω and both inputs at ω. Equal inputs ensure only intrinsic permutation χ_ijk=χ_ikj, without extra full-index Kleinman symmetry.

P_i(2ω)=Σ_jk χ_ijk E_j(ω) E_k(ω). Sum the full3×3×3 tensor; coefficients are χ, not common d=χ/2. x/y cross terms naturally give2; do not multiply again.

| Model | Independent coefficients | Allowed components |
| --- | --- | --- |
| zinc blende GaAs，Td / −43m | xyz | xyz=xzy=yxz=yzx=zxy=zyx |
| Tetragonal BaTiO₃, C4v / 4mm | xxz,zxx,zzz | xxz=xzx=yyz=yzy; zxx=zyy; zzz |
|Centrosymmetric Oh / m−3m | none|Bulk  electric dipole  χ vanishes|

In particular, χ_xxz and χ_zxx are independent in 4mm. The full preset operation sets contain 24, 8 and 48 elements; the program checks covariance of every basis tensor and uses group-averaged characters to verify invariant dimensions 1, 3 and 0. This version does not include dynamic SHG tensor tables for all 32 point groups.

A third-rank polar tensor reverses under inversion. If inversion belongs to the bulk point group, χ=−χ and χ=0. But zero intensity in one geometry/channel does not establish inversion: GaAs (001) has zero in all channels at this model's normal incidence, although Td lacks inversion.

## Geometry/cuts

The outward laboratory surface normal is +z, the scattering plane is xz and θ is incidence angle from the normal. Ideal reflected directions are:

- k_in=(sinθ,0,−cosθ)，k_out=(sinθ,0,+cosθ)；
- P_in=(cosθ,0,+sinθ)，P_out=(cosθ,0,−sinθ)，S=(0,1,0)；
- The first channel letter denotes input and the second analyzer: PS means P incident, S outgoing.

Active crystal→lab rotation Q(φ)=Rz(φ)Q₀;φ rotates the sample around its surface normal. Vectors obey v_lab=Qv_crystal.

For (001), Q₀=I. For (111) with orthogonal a=b crystal axes, use normalized normal (1,1,1/(c/a)); at φ=0, laboratory x follows crystal [1,−1,0]. GaAs and Oh presets fix c/a=1, while BaTiO₃ accepts cOverA. Default c/a=1 is reference geometry only.

Alternatively supply three Cartesian active Euler angles [α,β,γ], using Q₀=Rz(α)Ry(β)Rz(γ), acting rightmost first. This overrides plane/axial-ratio geometry and is not a fractional-cell-coordinate transformation.

## Tensor to angular spectrum

1. Select point-group-allowed independent χ components, real or complex.
2. Transform the unit input field and analyzer direction to crystal coordinates using Qᵀ.
3. Calculate nonlinear polarization P=χ:E E, then scalar amplitude A=e_out·P.
4. Finally take I=|A|², retaining coherent interference between complex components.

All four channels share arbitrary units without separate normalization. Scaling every χ by c scales amplitude by c and intensity by |c|². Reversing all χ leaves isolated intensity plots unchanged. Opposite polar domains therefore generally need a phase reference or other experimental information to distinguish.

For GaAs(001), a=χ_xyz, s=sinθ, c=cosθ give independent hand checks:

- A_PP=−a c² s sin(2φ)；
- A_PS=2a c s cos(2φ)；
- A_SP=−a s sin(2φ)；
- A_SS=0。

With this convention, θ=45° and a=1 give maximum PP intensity 1/8, PS 1 and SP 1/2. A uniform 181-point scan may not contain exactly 45°; set azimuth=45 separately for the exact current angle.

The rank-3 tensor projection of 4mm (001) is φ-independent in this ideal geometry. This does not establish continuous crystal rotation symmetry; a finite-rank tensor need not distinguish every point group.

## Python input/output

Use `from shg_lab import run`, then `run(payload)`. Default `payload={}`:

```json
{"model":"gaas","cut":"001","cOverA":1,"incidence":45,"azimuth":30,"samples":181,"channel":"PP","coefficients":{"xyz":1}}
```

| Field | Constraints and default |
| --- | --- |
| model | gaas/batio3/centrosymmetric, default gaas |
| cut | 001 / 111, default 001 |
| cOverA | 0.1–10, default 1; must be 1 outside BaTiO₃ presets |
| orientation | Optional[α,β,γ], each−36000–36000°; overrides cut geometry |
| incidence | 0–85°, default 45° |
| azimuth | −36000–36000°, default 30°; independent of discrete scan spacing |
| samples | Integer37–721, default 181; includes0°/360° |
| channel | PP / PS / SP / SS, default PP |
| coefficients | Only current-model independent coefficients; omitted entries use model defaults |

Complex format `{"re":1,"im":0.2}`, real/imaginary each ±10000. BaTiO₃ defaults `{"xxz":1,"zxx":0.7,"zzz":1.5}`; Oh accepts only empty objects. For zero tensors, set every current-model independent coefficient explicitly to zero.

Main outputs:

- `tensor.basis`: independent/equivalent components and coefficients; `tensor.crystal`: JSON-safe complex tensor;
- `scan.angles`/`scan.channels.PP.intensities` and four-channel arrays;
- `selection`: amplitude, intensity and nonlinear polarization at the exact current azimuth;
- `geometry`: wave vectors, polarization vectors, crystal axes, normal, and rotation matrix;
- `symmetry`:  point group  covariance, last-index symmetry,360° periodicity, inversion-zero checks;
- `steps`, `warnings`, `sources`: derivation order, scope and references.

## Applicability

No Maxwell dielectric-boundary solution, Fresnel factors, refraction, absorption, phase matching, multilayer propagation, or real detectors. Call outputs relative geometric responses without Fresnel factors, not quantitative reflectance/absolute power.

It also excludes surface electric-dipole, electric-quadrupole, magnetic-dipole and magnetic SHG contributions and wavelength scans. Centrosymmetric bulk materials may still generate SHG at surfaces or through higher multipoles. Input complex coefficients represent effective components at fixed frequency and are not predicted by the point group.

## References and validation

The algorithm is independently implemented, not a direct ShgPy port or Yambo execution.

- [ShgPy official documentation](https://bfichera.github.io/shgpy/): RA-SHG tensor operations, angular response and fitting methods.
- [Yambo angular dependence of nonlinear response](https://wiki.yambo-code.eu/wiki/index.php?title=Angular_dependence_of_non-linear_response): first-principles rotating-field extraction of complex nonlinear polarization. Its protocol differs from this site's fixed laboratory scattering plane and rotating sample.

`python scripts/test-python-shg-lab.py` covers GaAs/4mm(001) formulas,  point group   generator  constraints, χ_xxz≠χ_zxx, Oh zero tensors, geometric-zero counterexamples, complex interference, scaling, global-sign ambiguity, normals, independent rotated sums, periodicity, and bounds.
