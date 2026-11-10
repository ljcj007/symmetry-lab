# Transverse response, devices and multielectron states

Version `20261028-response1`: 9 original Chinese lessons, 9 stepped derivations (36 steps), 9 material/model cases, and 3 cross-module projects. New cores use browser Python/NumPy without uploading inputs/results. Existing classrooms, tools, and 18px text remain available.

## From lessons to calculations

| Learning route | New topic | Independent computation entry |
|---|---|---|
| Material properties and spectra | Intrinsic anomalous Hall and transverse thermoelectricity | `#compute/hall-response-lab` |
|Crystal symmetry|Two-lead device quantum  transport |`#compute/device-transport-lab`|
| Spin and extended symmetry | Five-orbital multielectron crystal fields and Hund multiplets | `#compute/local-multiplet-lab` |

Cases: `#atlas/response`; projects: `#atlas/projects`. Lessons, calculators, and cases share Python functions/presets; full JSON is exportable. Teaching parameters do not represent real-material fits.

## Models/conventions

**Anomalous Hall and transverse thermoelectric response** uses the two-dimensional QWZ two-band model, energies in eV and temperatures in K. It integrates occupation-/entropy-weighted Berry curvature of both bands to obtain sheet responses σxy (S) and αxy (A/K), with chemical-potential scans and refined-mesh comparisons at current μ,T. Electron charge is −e and A=i⟨u|∂u⟩, so lower-band Chern=+1 gives a zero-temperature insulating plateau σxy=−e²/h. αxy is not the open-circuit Nernst signal; no full longitudinal tensor is supplied, and αxy alone does not determine a Nernst voltage. Band-resolved integration is rejected at exact gap closure; near closure or sparse sampling, check analytical gaps and convergence. See [methods](hall-response-lab.md).

**Device transport** uses finite uniform/SSH chains, two semi-infinite uniform leads, and retarded self-energies. Outputs are T(E), zero-temperature linear Landauer conductance, LDOS, lead injectivities, and left-incident normalized bond flux. Contacts, barriers, and lead bandwidth are explicit. Finite-η absorption and flux residuals are reported; bond flux is not finite-bias amperes. This initial coherent, elastic, noninteracting 1D device does not replace real scattering lifetimes, contact chemistry, or self-consistent potentials. See [methods](device-transport-lab.md).

**Local many-electron states** solve cubic  crystal field /full Kanamori in fixed-N five-d Fock space, with flips/pair hopping, no SOC. Check spin SU(2)/joint energy-spin subspaces; show degenerate occupations, S, ⟨S²⟩,Δ scans. Common-J Kanamori is not full Slater F⁰/F²/F⁴; no LS terms, real NiO spectra, ligand transfer, XAS/RIXS. At fixed N, U only shifts common energy. See [methods](local-multiplet-lab.md).

## Three cross-module projects

1. **From wavefunction geometry to transverse response**: calculate QWZ Chern/gap with the existing geometry tool → check the zero-T Hall plateau → explore finite-T metallic occupations and transverse thermoelectricity.
2. **SSH bulk to contact-controlled transmission:** confirm Zak/cell → weak contacts → change only contacts, compare same-energy transmission/weights. Bulk topology does not determine contact-device conductance directly.
3. **From single-electron orbitals to multielectron spin**: existing crystal-field plot → weak-field high-spin six-electron state → strong-field low-spin state at the same N,U,J, checking occupancies and S(S+1).

Each assignment has 3 stages, parameter checks, evidence, derivation notes, and a conclusion. Collection accepts only the latest calculation matching that stage's tool and parameters; other exploration can remain in research records. New collection preserves old records, and projects/reports save calculation dates and versions.

Assignments use optional project `assignment` in existing local IndexedDB. Export/import full JSON here/in material records, or Markdown parameters/summary/explanations. Full arrays stay in JSON. Limits32 MiB/40 calculations; clearing storage removes projects, so retain backups. Stage completion counts evidence/text, not automatically correct derivations.

## Verification and reproduction

`npm run test:response` validates three Python cores, all presets, course references, UI, stepped problems, record matching, import/export, and existing routes. Numerical tests include independent Kubo/convolution checks, analytic scattering, flux conservation, fermion anticommutators, and spin commutators. Pages retain errors, sampling, and scope. All source is supplied in source.zip.
