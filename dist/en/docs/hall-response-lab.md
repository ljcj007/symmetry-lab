# Intrinsic anomalous Hall and transverse thermoelectric response

`hall_response_lab.run(payload)` is a NumPy teaching core shared by browsers and CPython, independent of other site Python modules. It computes a two-dimensional QWZ two-band model in a fixed periodic orbital basis; it does not import real materials or complete Wannier geometric matrix elements.

## Models, symbols, and units

H=s[sin(kx)σx+sin(ky)σy+(m+cos(kx)+cos(ky))σz], with energies ±s|d|.

- s (`energyScale`) is in eV, temperature in K, μ in eV, and momentum is dimensionless ka.
- Uses A=i〈u|∂u〉, kx→ky orientation; lower band Ω−=d·(∂xd×∂yd)/(2|d|³), upper Ω+=−Ω−.
- e>0 and electron charge is −e; define jx=σxy Ey−αxy ∂yT. Thus σyx=−σxy and αyx=−αxy.
- σxy=−(e²/ℏ)Σn∫BZ d²k/(2π)² Ωn fn, in S, is a two-dimensional sheet response.
- αxy=(e kB/ℏ)Σn∫BZ d²k/(2π)² Ωn sn, sn=−fn ln fn−(1−fn)ln(1−fn), in A/K, a sheet response. This intrinsic  transport  subtracts equilibrium magnetization currents.
- For m=−1, the isolated lower band has C=+1; at zero temperature and μ=0, σxy=−e²/h. Compare signs only together with current-direction and curvature conventions.
- **αxy is not an open-circuit Nernst voltage.** The full open-circuit tensor S=σ⁻¹α requires longitudinal and other components of the same system. This page does not combine unrelated models or report an open-circuit signal.

No spin-degeneracy doubling. Both bands enter finite-T sums; full/empty responses cancel and μ=0 entropy weights cancel pointwise. At strict T=0,α takes zero limit. Metallic zero-T step occupations have no artificial broadening.

## Inputs

| Key | Default | Range |
| --- | --- | --- |
| mass | −1 | −5…5 |
| energyScale | 1 | 0.02…5 eV |
| temperature | 300 | 0…5000 K |
| chemicalPotential | 0 | −20…20 eV |
| mesh | 61 | Integer 15…121 |
| muMin / muMax | −3.5 / 3.5 | −20…20 eV, endpoint strictly greater than start |
| scanPoints | 61 | Integer 11…101 |

T and μ are independent; fixed-density μ(T) is not solved. `mesh` uses complete uniform 2D meshes, not symmetry paths.

## Outputs and convergence

`selection` provides σxy,σyx,αxy,αyx, quantum-unit-normalized values, `defined`, `numericallyResolved`, and reasons in Chinese. `scan` contains chemical potentials, responses, and independent stability flags at each point. `heatmap` includes lower-band curvature, two-band occupation-weighted curvature, entropy-weighted curvature, and direct gaps, with arrays ordered `[ky][kx]`.

Compare N×N/2N×2N each time. Lower-band curvature integral versus analytic C must differ ≤0.01; selected σ tolerance max(0.002,0.02|σfine|), normalized by e²/h;α max(0.0005,0.05|αfine|), normalized by e kB/h. Every scan point receives these checks. They are visible diagnostics,**not rigorous error bounds**, nor replacements for finer meshes/temperature checks.

The analytical gap is Eg=2s min(|m+2|,|m|,|m−2|). For Eg≤10⁻¹⁰ eV, the isolated bands required by this implementation do not exist; main results and scans are left blank and `defined=false`. Geometric heatmaps at nondegenerate sampled points may still appear but do not constitute a complete transport calculation for a gapless system. This limits the current algorithm, not the physical definability of transverse response in every gapless system.

Near but short of gap closure, the main result remains an estimate requiring convergence, with `numericallyResolved=false` and a refinement prompt. Locally nonzero curvature in an insulator does not imply nonzero C; metallic Hall response need not retain the lower-band Chern sign.

## Other-module connections

- QWZ with m=−1 and s=1 in quantum geometry gives C=+1, consistent with this page’s zero-temperature plateau σxy/(e²/h)=−1.
- The cross-module metallic preset retains m,s but uses μ=1.3 eV,T=300 K and meshes 121→242 to show nonquantized response and nonzero α.
- bcc Fe supplies public methods context; all interactive numbers are QWZ, without fitting/reproducing iron response.
- Real Wannier Berry calculations generally require position/connection matrices and orbital-embedding information; hr-only input is not a complete first-principles response calculation.

## Checks and sources

Run `python scripts/test-python-hall-response.py`. Tests cover analytic plateaus, independent velocity-matrix Kubo curvature, entropy versus zero-T Hall energy convolutions,μ/mass inversion, full/empty, zero/high-T, joint energy-temperature scaling, gap/undersampling diagnostics, units, and invalid input.

- [Xiao et al., Berry phase and anomalous thermoelectric transport](https://arxiv.org/abs/cond-mat/0604561): distinguishes transport and magnetization currents and gives the thermoelectric entropy kernel.
- [Wannier90 Berry-method notes](https://wannier90.readthedocs.io/en/latest/user_guide/postw90/berry/): connection, curvature, and Hall conventions.
- [Wannier90 bcc Fe tutorial](https://wannier90.readthedocs.io/en/latest/tutorials/tutorial_18/): material context/hotspot integration convergence.
- [Qi, Wu and Zhang two-dimensional lattice model](https://arxiv.org/abs/cond-mat/0505308): topological model background.

Lessons, presets, and exercises are original teaching content; parameters are not measured material data.
