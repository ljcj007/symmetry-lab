# Density matrices, entanglement and decoherence

This browser NumPy module teaches one or two spin-1/2 systems. Given a constant Hamiltonian and independent local Markov channels, it evolves the full density matrix and compares Bloch vectors, global purity, local entropy, and two-spin negativity. It does not use the QuTiP runtime; QuTiP documentation checks methods and teaching conventions.

## Basis, units, and Hamiltonian

The single-spin basis is |↑⟩, |↓⟩; the two-spin basis is |↑↑⟩, |↑↓⟩, |↓↑⟩, |↓↓⟩, with A as the first index. σ denotes Pauli matrices and S=σ/2.

- Time t: ns.
- Ω (drive),Δ (detuning), J (exchange),δ (gradient): Hamiltonian/ℏ coefficients in rad/ns, not ordinary cycles/ns; divide by 2π for ordinary frequencies.
- γ₁ (gamma1) and γ_φ (gammaPhi): ns⁻¹.
- thermalScale: k_B T/ℏ in rad/ns. It determines only the initial Gibbs distribution, not the environment temperature.
- Entropy uses log₂ in bits; purity, Bloch components, and negativity are dimensionless.

For one spin, H/ℏ=(Ωσ_x+Δσ_z)/2. For two spins, the same Ω and Δ act on both, with δ(σ_Az−σ_Bz)/4 + J σ_A·σ_B/4 added. δ is the difference between local spin detunings; positive J is antiferromagnetic exchange. J and δ are unused for a single spin, with a note shown for nonzero inputs.

## Dissipation conventions

The Lindblad equation is dρ/dt=−i[H/ℏ,ρ]+Σ_C(CρC†−{C†C,ρ}/2). Each spin has two optional channels:

- C₁=√γ₁ |↓⟩⟨↑|, always converting ↑ into ↓.
- C_φ=√(γ_φ/2) σ_z decays only off-diagonal elements in the fixed z basis.

Without drive/exchange, a single spin has T₁=1/γ₁, 1/T₂=γ₁/2+γ_φ. Zero rates give infinite times; T₁/T₂ in JSON uses null for infinity, not zero. With drive/exchange, observables generally do not follow one T₁/T₂ exponential.

These channels are phenomenological models in a specified basis, not constructed from driven/exchange eigenlevels and detailed balance. In particular, their evolution must not be described as thermalization to a same-temperature Gibbs state; changing the detuning sign does not automatically reverse relaxation.

## Initial states and entanglement measures

Support z/x pure states, two-spin antiparallel products, singlets, equal antiparallel classical mixtures, and current-H Gibbs states. At thermalScale=0, use equal projection over the whole ground subspace within 10⁻¹⁰ rad/ns tolerance, not an arbitrary eigenvector.

ρ_A=Tr_Bρ; global purity is Trρ² and local entropy is −Trρ_A log₂ρ_A. Local entropy is entanglement entropy for this bipartition only when the global state is pure. For two-spin mixed states, also report partial-transpose negativity N(ρ)=(||ρ^{T_B}||₁−1)/2, the sum of absolute negative partial-transpose eigenvalues. In this 2×2 system, nonzero negativity indicates entanglement and zero negativity a separable state; do not extrapolate this as a complete criterion for every higher-dimensional system.

The singlet and 1/2(|↑↓⟩⟨↑↓|+|↓↑⟩⟨↓↑|) have identical local density matrix I/2, but negativities 1/2 and 0 respectively. Single-spin negativity is undefined and returns null.

## Numerics and scope

Column-major vectorization gives a 4×4 or 16×16 generator. On a uniform time grid, a scaling-and-squaring Taylor matrix exponential gives a one-step propagator, which is applied repeatedly. This avoids reliance on a possibly defective Liouvillian eigendecomposition. Complex density matrices, reduced states and observables are retained at every time for linked views.

The calculation checks trajectory trace and Hermiticity errors and minimum eigenvalues, without hiding errors by renormalization or clipping negative eigenvalues. Entropy ignores only numerical eigenvalues below 10⁻¹⁴; physicality checks use unmodified values. Sparse time grids warn about graphical sampling: exact exponential solutions at samples and curve resolution are separate issues.

Exclude non-Markovian environments, spatial many-body systems, pulse/echo sequences, environment feedback, frequency-dependent noise, fitting, and real-device  decoherence  predictions. These abstract effective spins do not determine J, γ₁, or γ_φ from element names.

## Validation

`python scripts/test-python-density-matrix.py` verifies analytical Rabi oscillations, amplitude damping, pure dephasing, combined transverse rates, Bell states versus classical mixtures, exchange-generated entanglement, partial traces, thermal states, direct Lindblad matrix action, defective Jordan matrix exponentials, independent unitary solutions, positivity at extreme parameters, invalid inputs and every lesson preset.

## Primary sources

- [QuTiP: Lindblad master equations and applicability](https://qutip.readthedocs.io/en/stable/guide/dynamics/dynamics-master.html)
- [QuTiP:  tensor product  and  partial trace ](https://qutip.readthedocs.io/en/stable/guide/guide-tensor.html)
- [Vidal and Werner: Computable measure of entanglement, Phys. Rev. A 65, 032314 (2002)](https://doi.org/10.1103/PhysRevA.65.032314)

The Chinese course, presets, implementation, and tests are original teaching content of this site.
