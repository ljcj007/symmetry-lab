# Material observables:  phonon  spectra and  physical-property tensor

These original Chinese lessons connect the existing Si, GaAs and NaCl cases to the material atlas, group-theory classroom and computation center. There are 8 lessons and 8 four-step exercise sets. Material and computation entries share material IDs for saving and recalculation.

## From structure to Γ-point vibrations

A two-atom  primitive cell  has six displacement freedoms. At Γ, operation  mechanical representation  combines atomic permutations/Cartesian-vector transformations:

`D_mech(g)=P(g)⊗R(g)`，`χ_mech(g)=N_fix(g) tr R(g)`。

After irrep decomposition, subtract the three-dimensional rigid-translation subspace to obtain the optical representation. Crystals do not follow the isolated nonlinear molecule’s `3N−6` counting rule. Element labels, primitive-cell conventions and coordinate bases are part of the calculation. [Bilbao SAM help](https://cryst.ehu.es/rep/sam_help.html) supplies methodological background for mode classification.

| Material model | Space group | Γ mechanical representation | Optical representation | Electric-dipole IR | Ordinary first-order Raman |
| --- | --- | --- | --- | --- | --- |
| Si, diamond | Fd-3m,227 | T1u + T2g | T2g | Forbidden | Allowed |
| GaAs, zinc blende | F-43m, 216 | 2T2 | T2 | Allowed | Allowed |
| NaCl, rock salt | Fm-3m,225 | 2T1u | T1u | Allowed | Forbidden |

Check structures with AFLOW [diamond](https://aflow.org/p/A_cF8_227_a-001/),[ zinc blende ](https://aflow.org/p/AB_cF8_216_a_c-001/),[rocksalt](https://aflow.org/p/AB_cF8_225_a_b-001/). Modes,  selection rule , and exercises are independently derived, not copied textbook tables.

Three-dimensional displacement arrows represent symmetry-adapted bases. In particular, equal-length opposite arrows on different species do not imply a solved mass-weighted dynamical eigenmode. Actual frequencies, LO–TO splitting and absolute IR/Raman intensities need additional dynamical and response data. Center frequencies and linewidths in the spectral demonstration are user-specified and explicitly labeled illustrative.

The polarization example selects `Rz=[[0,d,0],[d,0,0],[0,0,0]]`, with incident light along z and polarization rotating in xy. Direct contraction `e_outᵀ Rz e_in` gives `I_parallel/d²=sin²(2θ)` and `I_crossed/d²=cos²(2θ)`. These describe a specified tensor and geometry; a symmetry-allowed mode can still be completely dark in a particular geometry.

## From operations to tensor forms

The static equilibrium dielectric tensor obeys `χ=RχRᵀ` and the thermodynamic symmetry `χij=χji`. Equilibrium elasticity additionally has minor and major index symmetries. Crystal symmetry and intrinsic index symmetries must be handled separately. [IUCr crystal-physics notes](https://www.iucr.org/__data/assets/pdf_file/0003/14790/18.pdf) explain this distinction.

All three cubic examples allow one dielectric parameter, while elasticity generally retains three, `C11,C12,C44`. Cubic crystals do not have isotropic behavior for every property.

Piezoelectricity uses full Cartesian strain-form `P_i=e_ijk ε_jk` summation. Inversion forbids this rank-three polar tensor, so ideal Si/NaCl have zero linear piezoelectricity. Td leaves one parameter: six all-distinct-index components equal `e0`, giving `P_x=2e0 ε_yz`. Engineering shear `γ_yz=2ε_yz` instead gives `P_x=e0γ_yz`. Lessons/exercises retain this factor of two.

The static magnetoelectric lesson defines `P=αH`. For spatial operation R and time factor τ, the constraint is `α=τdet(R)RαRᵀ`. Pure inversion i and pure time reversal 1′ each forbid α, while the model containing only `{E,i′}` allows a general nine-parameter α. The example does not assume symmetric α or identify the model as a particular material’s magnetic order. [Bilbao MTENSOR](https://www.cryst.ehu.es/cryst/mtensor_help.html) and [Etxebarria et al. on tensors](https://journals.iucr.org/a/issues/2025/04/00/cam5007/) provide magnetic-symmetry background. Transport, dissipative optics and spin groups without SOC require their own applicable transformation rules.

Allowed forms specify symmetry-enforced zeros and equalities only. They supply no material constants and do not guarantee every allowed component is nonzero.

## Material learning routes

Each case includes structural phase and coordinate conventions, phonon/tensor presets, lesson links, stepwise questions and a computational final task:

- Si: verify normalized Raman intensity 1 at 45° parallel polarization, then check that linear piezoelectricity has 0 free parameters.
- GaAs: check dual T2 activity, then `e0=1`/`ε_yz=ε_zy=1/100` give model `P=(1/50,0,0)`.
- NaCl: check the inversion character −6, then subtract the acoustic part to obtain the three-dimensional T1u optical subspace.

Classroom entry: `#classroom/observables?lesson=…&material=…`; calculations: `#compute/phonons?material=…` and `#compute/tensors?material=…`; original material structures: `#atlas/materials?material=…`. These integrate into existing navigation while retaining existing tools and enlarged fonts.

Data: `data/material-observables.json`. Validation checks course/case references, guided completeness,  primitive cell  freedoms, inversion  character , polarization contractions, shear factor two, and magnetoelectric parity. Save interpolations, demo coefficients, and line shapes with inputs to avoid treating them as measured data.
