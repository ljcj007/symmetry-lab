import {progressionCatalogs,progressionLessons} from './lesson-progression-index.js?v=20261113-route1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(catalog,lessonId)=>catalog+'::'+lessonId;
const byKey=new Map(progressionLessons.map(item=>[key(item.catalog,item.lessonId),item]));
const catalogFor=new Map(progressionCatalogs.flatMap(item=>[[item.catalog,item],[item.section,item]]));
const copyLesson=item=>({...item,exerciseIds:[...(item.exerciseIds||[])]});
const ref=(catalog,lessonId)=>key(catalog,lessonId);
const pg=id=>ref('pointgroup-lessons',id),sc=id=>ref('symmetry-course-lessons',id),lie=id=>ref('lie-group-lessons',id);
const obs=id=>ref('material-observables',id),research=id=>ref('material-research',id),pathways=id=>ref('pathways-materials',id);
const bridges=id=>ref('bridges-materials',id),frontiers=id=>ref('frontiers-materials',id),connections=id=>ref('connections-materials',id);
const principles=id=>ref('principles-materials',id),quantum=id=>ref('quantum-materials',id),response=id=>ref('response-materials',id);

// Each edge names the operation carried into the destination. These optional
// recommendations are not a dependency inferred from catalogue/array order.
const edgeDefinitions=[
 [pg('group-basics'),pg('operations-notation'),"Use composition and inverse operations to identify group elements before reading rotation, mirror, and inversion symbols."],
 [pg('operations-notation'),pg('thirty-two'),"Connect specific rotations and mirrors with the rotation orders allowed in a periodic crystal."],
 [pg('operations-notation'),pg('representations'),"Identify the geometric operation, then see how its action on column vectors gives a matrix."],
 [pg('representations'),pg('character-reduction'),"Specify the action space and matrices before using their traces to calculate irreducible multiplicities."],
 [pg('character-reduction'),pg('projection'),"Distinguish an irreducible representation's dimension from its multiplicity before projecting the corresponding basis functions."],
 [pg('character-reduction'),pg('selection-rules'),"Use character reduction to determine whether the tensor product of the operator and initial and final state representations contains a totally symmetric component."],
 [pg('thirty-two'),sc('space-01'),"Distinguish point-group types before introducing periodic translations, the lattice, and the atomic basis."],
 [sc('space-01'),sc('space-02'),"Build on lattices and translations to represent and compose spatial operations using Seitz pairs."],
 [sc('space-02'),sc('space-03'),"Use the composition rules for rotations and translations to understand screw axes and glide planes."],
 [sc('space-02'),sc('space-04'),"Apply spatial operations repeatedly to distinguish a site's orbit from the stabilizer that fixes it."],
 [sc('space-03'),sc('space-05'),"Include real-space fractional translations in Bloch phases to examine momentum-dependent representations."],
 [pg('representations'),sc('space-05'),"Understand representation matrices and characters before introducing wavevectors and little-group conditions."],
 [pg('representations'),lie('continuous-symmetry'),"Compare familiar discrete matrix operations with continuously adjustable rotations and phases."],
 [lie('continuous-symmetry'),lie('unitary-matrices'),"Continuous transformations must still preserve the state's norm; use this requirement to understand unitarity."],
 [lie('unitary-matrices'),lie('generators-commutators'),"Study small norm-preserving matrix transformations to identify generators and the commutator that compares their order."],
 [lie('generators-commutators'),lie('su2-spinor'),"Apply the general idea of generators to Pauli matrices and rotations of a two-component spinor."],
 [lie('su2-spinor'),lie('su2-double-cover'),"Follow the rotation of one spinor, then compare when its two-component amplitudes and the corresponding three-dimensional vector return to their original values."],
 [lie('generators-commutators'),lie('representations'),"Distinguish group elements from generators before comparing matrices for the same group acting in different spaces."],
 [lie('representations'),lie('su2-coupling-representations'),"Distinguish representation dimension from multiplicity before constructing product and coupled bases for two spins."],
 [lie('su2-spinor'),lie('su2-coupling-representations'),"Understand the two-component space of one spin 1/2 before constructing the four-dimensional space of two spins."],
 [lie('su2-coupling-representations'),lie('singlet-triplet-exchange'),"Use the singlet and triplet sectors obtained by tensor-product decomposition to analyze exchange energies."],
 [pg('representations'),obs('mechanical-modes'),"Combine the atomic permutation with the action on three-dimensional displacements to construct the mechanical representation."],
 [obs('mechanical-modes'),obs('acoustic-optical'),"Check the total displacement dimension before separating collective translations from relative motion."],
 [obs('mechanical-modes'),pathways('scattering-chain'),"Carry the ordered atomic displacement space into the mass and force-constant eigenproblem, distinguishing symmetry classification from dynamical frequencies."],
 [obs('acoustic-optical'),pathways('scattering-chain'),"Check the Gamma-point eigenvectors against rigid translation and relative motion, then divide their components by square roots of the masses to obtain physical displacements."],
 [pathways('scattering-chain'),pathways('scattering-phase'),"Carry the same mass-normalized complex eigenvector and Bloch convention into the atomic scattering amplitudes, adding coherently before taking the squared modulus."],
 [pathways('scattering-phase'),pathways('scattering-temperature'),"First determine the bare mode weight from masses, projections, and basis phases; then weight phonon creation and annihilation separately using thermal occupation."],
 [obs('mechanical-modes'),obs('ir-raman'),"Use the irreducible components of the displacement representation to identify vibrations that can couple to optical operators."],
 [pg('selection-rules'),obs('ir-raman'),"Apply the general matrix-element condition to polar-vector and quadratic-function selection rules."],
 [pathways('hubbard-basis'),pathways('hubbard-superexchange'),"Fix the occupation-number sector and fermionic mode ordering before following virtual hopping in the dimer."],
 [pathways('hubbard-basis'),bridges('manybody-lehmann'),"Apply creation and annihilation operators to occupation-number states before distinguishing transition energies from nonzero spectral weights."],
 [bridges('manybody-lehmann'),bridges('manybody-response'),"Understand the initial and final states and matrix elements before replacing the single-electron probe with a spin or charge probe that preserves particle number."],
 [bridges('manybody-lehmann'),bridges('manybody-checks'),"Use the calculated addition and removal spectra to check sum rules, limiting cases, and averaging over degenerate states."],
 [lie('su2-coupling-representations'),bridges('density-exchange'),"Connect the change to singlet and triplet basis states with entanglement generated by exchange evolution."],
 [bridges('density-pure-mixed'),bridges('density-exchange'),"Distinguish a global pure state from a mixed reduced state before explaining exchange-generated entanglement."],
 [lie('su2-coupling-representations'),frontiers('spt-aklt-parent'),"Use the singlet and symmetric triplet sectors of two spins 1/2 to understand virtual and physical spins in the AKLT construction."],
 [bridges('density-pure-mixed'),frontiers('spt-schmidt'),"Work through the partial trace for two spins before constructing reduced states and entanglement entropy from Schmidt probabilities."],
 [frontiers('spt-aklt-parent'),frontiers('spt-schmidt'),"Specify the AKLT state and boundary conditions before distinguishing group actions on physical spins and the Schmidt virtual space."],
 [frontiers('spt-schmidt'),frontiers('spt-protection'),"Identify the entanglement spectrum and projective representation before checking protection conditions along a perturbation path."],
 [obs('acoustic-optical'),research('thermal-oscillator'),"Count the vibrational branches per primitive cell before constructing thermal occupations and partition functions for positive-frequency modes."],
 [research('thermal-oscillator'),pathways('scattering-temperature'),"Use the Bose occupation obtained from normalized thermal probabilities to distinguish n+1 for phonon creation from n for phonon annihilation."],
 [research('thermal-oscillator'),bridges('polaron-hamiltonian'),"Understand quantum-oscillator energies and occupations before combining local oscillators and the electron in one Hilbert space."],
 [research('thermal-oscillator'),ref('coupled-materials','qha-free-energy'),"Establish the phonon free energy per primitive cell before comparing free energies at different volumes."],
 [obs('neumann'),connections('reciprocity-onsager'),"Understand the tensor constraints imposed by spatial operations, then separately choose thermodynamic fluxes and forces to discuss reciprocity."],
 [sc('magnetic-01'),connections('reciprocity-onsager'),"Establish time-reversal parity, then check the parities of the thermodynamic state variables defining the conjugate flux-force pairs and reverse the magnetic field and magnetization together."],
 [obs('neumann'),connections('reciprocity-spatial-response'),"Use spatial tensor constraints to compare allowed components within one magnetic domain."],
 [connections('reciprocity-onsager'),connections('reciprocity-spatial-response'),"Distinguish the reversed magnetic states compared by reciprocity from spatial point-group constraints before combining the two conditions."],
 [connections('reciprocity-spatial-response'),connections('reciprocity-dissipation'),"Once spatial and reciprocity conditions are specified, examine the symmetric dissipative part and the antisymmetric transverse response."],
 // Reviewed transfers between action spaces; these are optional preparation,
 // not evidence that every destination has a complete operational derivation.
 [pg('representations'),principles('order-isotropy'),"Specify the linear space on which the group acts, then test D(g)η=η operation by operation to find the stabilizer of the chosen order parameter."],
 [pg('projection'),principles('order-invariants'),"Apply the group average for the totally symmetric projection to homogeneous polynomials, distinguishing zero averages, repeated orbit sums, and normalization coefficients."],
 [principles('order-isotropy'),principles('order-field-convention'),"Distinguish a state's stabilizer from its parent-group orbit, then add a fixed external field and compare the field-preserving group with its intersection with the state stabilizer."],
 [principles('order-invariants'),principles('order-field-convention'),"Establish the invariants and anisotropy of F₀, then distinguish physical splitting caused by a linear external field from a consistent passive coordinate change of all objects."],
 [sc('magnetic-01'),principles('exchange-bond-constraints'),"Transform the axial magnetic moment using det(R)R, then separately track whether the same spatial operation exchanges the two endpoints of the oriented bond."],
 [obs('neumann'),principles('exchange-bond-constraints'),"Reuse the method of imposing common linear tensor constraints generator by generator. For the exchange tensor, use axial spins and include a transpose when the endpoints are exchanged."],
 [principles('exchange-bond-constraints'),principles('exchange-classical-quantum'),"Obtain one exchange matrix satisfying the common constraints, then apply it separately to unit classical vectors and quantum operators S=σ/2 to compare energies with their respective normalizations."],
 [lie('singlet-triplet-exchange'),principles('exchange-classical-quantum'),"Use 2⊗2=3⊕1 and the reference energies −3J/4 and J/4 to examine a general allowed exchange matrix and determine which conclusions change under anisotropy or DMI."],
 [principles('exchange-bond-constraints'),principles('exchange-conventions'),"Specify the oriented bond and axial-spin constraints before distinguishing an endpoint-convention change J→Jᵀ, D→−D from a change in physical constraints."],
 [principles('exchange-classical-quantum'),principles('exchange-conventions'),"Use the defined quantum levels and classical minimum energy to check passive axis rotations and endpoint relabeling, rather than judging a change in interaction from the appearance of matrix components."],
 [lie('generators-commutators'),principles('conservation-generators'),"Carry the infinitesimal generator of U(θ)=exp(−iθQ) into time evolution and calculate the full commutator [H/ℏ,Q], rather than checking just one finite-angle rotation."],
 [principles('exchange-classical-quantum'),principles('conservation-generators'),"Construct matrices for a two-spin Hamiltonian without DMI and for total spin, then test conservation under continuous rotations. Divide energy parameters by ℏ first; numerical values in meV cannot be used directly as rad/ns."],
 [principles('conservation-generators'),principles('conservation-open'),"Extend the full closed-system commutator criterion to the sum of the Hamiltonian and all bath-channel adjoint actions, then test conservation for every initial state."],
 [bridges('density-pure-mixed'),principles('conservation-open'),"Understand density matrices and the maximally mixed state before explaining why a flat trajectory for I/d cannot replace the operator conservation criterion for all initial states."],
 [principles('conservation-generators'),principles('conservation-protection'),"Use the three rotation generators to identify SU(2) multiplets, then separately check the square of the physical antiunitary T and its relation to H to identify Kramers protection."],
 [lie('singlet-triplet-exchange'),principles('conservation-protection'),"Use the two-spin singlet and triplet as a comparison: collective SU(2) can explain the triplet, while the total T²=+I alone does not enforce Kramers pairing."],
 [sc('space-01'),frontiers('layer-periodicity'),"Distinguish lattice translations from the atomic motif, then replace three periodic directions with two while retaining finite boundaries along the layer normal."],
 [sc('space-02'),frontiers('layer-periodicity'),"Apply Seitz composition to layer operations, identifying translation equivalence only along the two in-plane lattice directions."],
 [frontiers('layer-periodicity'),frontiers('layer-termination'),"Check atom bijections using in-plane periodicity and a finite normal direction, then use species and surface labels to test operations that exchange the two sides."],
 [frontiers('layer-termination'),frontiers('layer-registry'),"Fix the chemical labels on both sides and the finite boundaries, then change the relative stacking registry and check common interface operations atom by atom."],
 [pg('operations-notation'),frontiers('chiral-mirror'),"Use the determinant to distinguish orientation-preserving and orientation-reversing spatial operations, then restrict mirror-image registration to proper rigid rotations."],
 [sc('space-01'),frontiers('chiral-mirror'),"Distinguish chiral structures, Sohncke types, and enantiomorphic group types before placing a finite point-set mirror test in its proper crystallographic context."],
 [obs('neumann'),frontiers('chiral-polarity'),"Apply the common property constraints from all spatial operations to a rank-one polar vector, solving (R−I)P=0 jointly to find allowed directions."],
 [frontiers('chiral-mirror'),frontiers('chiral-polarity'),"First test whether a mirror image can be superposed by proper rotations, then ask whether the same operation set preserves a nonzero polar vector to distinguish chirality from polarity."],
 [frontiers('chiral-mirror'),frontiers('chiral-tolerance'),"Specify the source point set, allowed registration, and same-label correspondences before displacing the configuration and testing approximate operations through actual residuals."],
 [pg('group-basics'),frontiers('chiral-tolerance'),"Check closure of the candidate set that passes a distance tolerance, rather than treating separate approximate matches as an exact group."],
 [lie('unitary-matrices'),quantum('geometry-rays'),"Calculate conjugate transposes, normalization, and inner products of complex amplitudes, then use projection to distinguish an overall phase from a distinguishable change of state."],
 [lie('su2-spinor'),quantum('geometry-rays'),"Carry Pauli matrices, normalized two-component states, and the Bloch representation that omits overall phase into a two-band orbital model, without adding a physical spin degeneracy."],
 [quantum('geometry-rays'),quantum('geometry-topology'),"Use the modulus of neighboring-state overlaps to characterize distance, then join their phases into an oriented closed loop that includes boundary links."],
 [quantum('geometry-topology'),quantum('geometry-diagnostics'),"After understanding the closed-loop phase sum over the full zone, check band isolation, link overlaps, phase branches, and grid refinement separately, rather than checking only an integer."],
 [quantum('geometry-diagnostics'),response('hall-occupation'),"Check the QWZ lower-band curvature orientation, global gap, and integral convergence, then specify an energy scale in eV for the response model instead of reusing dimensionless numbers directly. Include both bands' Fermi occupations and the electron-charge sign."],
 [response('hall-occupation'),response('hall-entropy'),"Keep the band curvature and current convention fixed, replace occupation weights with Fermi-entropy weights, and compare cancellation conditions for Hall and transverse thermoelectric responses."],
 [response('hall-entropy'),response('hall-diagnostics'),"Distinguish the occupation-weighted sheet conductance from the entropy-weighted transport coefficient, then identify the tensors needed for an open-circuit signal and the numerical checks needed at each scan point."],
 [quantum('geometry-diagnostics'),response('hall-diagnostics'),"Carry the separate error checks for the discrete FHS integer and ordinary curvature quadrature into response integration, distinguishing refinement from N to 2N−1 from refinement from N to 2N."],
 // Phonon input, mode spaces and equilibrium response tensors.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("material-observables","mechanical-modes"),ref("structure-dynamics","soft-modes"),"Fix the atom order and the 3N-dimensional permutation–displacement action before adding masses and force constants; distinguish a symmetry-adapted basis from mass-weighted dynamical eigenvectors."],
 [ref("structure-dynamics","soft-modes"),ref("structure-dynamics","phonopy-files"),"Recover displacements using e_j/√m_j and the complex finite-q phase, then check the cell, masses and 3N branches. Confirming a frequency unit does not rescale the original numbers."],
 [ref("structure-dynamics","phonopy-files"),ref("material-research","mode-audit"),"Check the cell, units and eigenvector fields before auditing atom order, the companion structure and acoustic translations. A matching chemical formula or file hash alone does not establish mode–structure correspondence."],
 [ref("material-research","mode-audit"),ref("material-research","mode-subspaces"),"Verify the ordered structure, masses and eigenvectors before testing closure of complete frequency clusters. Do not apply Γ-point labels directly at finite q or for point groups outside the supported tables."],
 [ref("pointgroup-lessons","character-reduction"),ref("material-research","mode-subspaces"),"Use character inner products for the same operations and class weights to reduce a closed mode subspace, distinguishing cluster dimension, irreducible dimension and multiplicity."],
 [ref("material-research","mode-subspaces"),ref("material-research","mode-freezing"),"Distinguish the subspace label from a chosen basis vector, then fix the complex mode, phase and length amplitude and check that every n_i q_i is an integer. A frozen snapshot is not a relaxed stable structure."],
 [ref("material-research","thermal-oscillator"),ref("material-research","thermal-data"),"Compute single-mode statistics using hν, with ν an ordinary frequency, before summing a complete weighted mesh or normalized total DOS. Preserve whether quantities refer to a primitive cell or the input calculation cell."],
 [ref("material-research","thermal-oscillator"),ref("material-research","thermal-limits"),"Count the 3n modes per primitive cell before comparing Einstein suppression, the three-dimensional Debye T³ law and their common 3nR high-temperature limit. Cv is neither Cp nor thermal conductivity."],
 [ref("material-observables","ir-raman"),ref("material-observables","polarization"),"Identify allowed channels from polar vectors and symmetric quadratic functions before contracting a specific Raman tensor with both polarizations. Symmetry permission does not ensure intensity in one geometry, and illustrative peak positions are not material predictions."],
 [ref("material-observables","neumann"),ref("material-observables","piezoelectricity"),"Solve the common Cartesian tensor constraints before imposing j–k symmetry in P_i=e_ijk ε_jk. Keep full-index contraction consistent with engineering shear γ=2ε, and do not substitute the stress-based coefficient d for e."],
 [ref("symmetry-course-lessons","magnetic-01"),ref("material-observables","magnetoelectricity"),"Transform time-even polar and time-odd axial vectors separately before deriving the τdet(R) constraint for P=αH. Either i or 1′ forbids static α, while i′ alone leaves all nine components unconstrained."],
 [ref("material-observables","neumann"),ref("material-observables","magnetoelectricity"),"Use the common invariant-subspace method for all generators after specifying the polar, axial and time parities at both ends of the response. A general magnetoelectric α has nine unknowns; do not inherit dielectric index symmetry."],
 // Bulk transport, open devices, pairing and electron–hole charge ledgers.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("quantum-materials","transport-window"),ref("quantum-materials","transport-seebeck"),"Build L₀ from squared velocities and the Fermi derivative over the full BZ, then add E−μ weights for L₁ and L₂. Imported energies use eV and velocities m/s; intraband Boltzmann moments are not device transmission."],
 [ref("connections-materials","reciprocity-onsager"),ref("quantum-materials","transport-seebeck"),"Specify entropy-conjugate fluxes and forces, electron charge and heat-current conventions before imposing open circuit and interpreting the thermoelectric subtraction in κ. Dimensionless Onsager demonstration coefficients cannot be copied as SI transport moments."],
 [ref("quantum-materials","transport-seebeck"),ref("quantum-materials","transport-validation"),"Identify where τ cancels before checking spin counting, Fermi-window grids and two-dimensional sheet units S and W/K. Three-dimensional bulk coefficients instead use S/m and W/(m K); undefined values must not be filled with zero."],
 [ref("response-materials","device-open"),ref("response-materials","device-scattering"),"Fix the retarded lead function, contact self-energies and in-band channels before checking transmission with a barrier or weak contact on the same chain. Energies use eV; artificial absorption η is not the Boltzmann relaxation time τ."],
 [ref("response-materials","device-scattering"),ref("response-materials","device-ssh"),"Use the disconnected-contact counterexample, with finite LDOS but T=0, to distinguish local spectra from transport. Then fix the SSH termination and contacts and audit injected flux and η loss bond by bond."],
 [ref("lie-group-lessons","singlet-triplet-exchange"),ref("electronic-materials","pairing-exchange"),"Write the antisymmetric two-spin singlet as iσy and include k→−k when testing Δ(k)=−Δᵀ(−k). A single-orbital singlet requires an even momentum function, but a dimer exchange energy supplies neither pairing attraction nor Tc."],
 [ref("electronic-materials","pairing-exchange"),ref("electronic-materials","pairing-nodes"),"Fix the D₄h basis functions and four-dimensional Nambu space before solving Δ(k)=0 together with ξ(k)=0 for nodes. This model uses a common arbitrary energy unit, and a pairing label alone does not determine a full gap."],
 [ref("electronic-materials","pairing-exchange"),ref("electronic-materials","pairing-kitaev"),"Start from full fermionic exchange antisymmetry before moving from even-momentum singlet pairing to odd-momentum bond pairing of one spinless orbital. Distinguish a 2×2 bulk BdG matrix from the 2N-dimensional open-chain space without adding a spin copy."],
 [ref("response-materials","device-open"),ref("spectroscopy-materials","andreev-charge"),"Understand retarded normal-lead self-energies and incident channels before extending to electron–hole blocks. Track normal reflection, Andreev reflection and quasiparticle transmission separately; zero subgap transmission does not imply zero charge conductance."],
 [ref("electronic-materials","pairing-exchange"),ref("spectroscopy-materials","andreev-charge"),"Separate singlet BdG Nambu redundancy before moving to the NS (e↑,h↓) block and charge flux. Explicitly assign the arbitrary energy scale in eV and recheck the particle–hole matrix; do not count spin twice."],
 [ref("spectroscopy-materials","andreev-charge"),ref("spectroscopy-materials","andreev-barriers"),"Build the 1−Ree+Rhe charge ledger before setting only Δ=0 in the same device for a normal reference. Keep contacts and η fixed when testing doubling; a finite-energy spectrum is not a self-consistent finite-bias I(V)."],
 [ref("spectroscopy-materials","andreev-barriers"),ref("spectroscopy-materials","andreev-checks"),"Fix the single-variable normal reference before pairing electron/hole incidence at E and −E and including η absorption in the quasiparticle flux balance. Do not fill threshold gaps with zero; converge η and the energy step separately."],
 // Site-to-Bloch representations, finite-q patterns and nonsymmorphic bands.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("symmetry-course-lessons","space-04"),ref("pathways-materials","bandrep-real-space"),"Find real-space site orbits and stabilizers using the same primitive translations, then attach local orbitals to build the Bloch fiber. Site count times local dimension is not mechanical 3N counting and does not automatically define an EBR."],
 [ref("pathways-materials","bandrep-real-space"),ref("pathways-materials","bandrep-bloch-phase"),"Keep the ordered sites and local basis and restore the cell-folding lattice remainders in the same periodic Bloch gauge. If the rotated k is not equivalent to the original k, the map is not a symmetry label within one fiber."],
 [ref("pathways-materials","bandrep-bloch-phase"),ref("pathways-materials","bandrep-decomposition"),"Retain the lattice defect and k phase from multiplying Seitz representatives before reducing with small-representation characters for the same factor system. Projective two-dimensionality at a boundary need not come from spin or time reversal."],
 [ref("pathways-materials","bandrep-decomposition"),ref("material-research","band-restriction"),"Reduce a fixed-k little-group representation before restricting endpoint representations to the common line operations. Match the setting, gauge and factor system; do not copy three-dimensional orbital numbers directly into the two-dimensional C4v model."],
 [ref("material-research","band-restriction"),ref("material-research","band-crossing"),"Identify the mirror actually retained on the line and its branch eigenvalues before testing forbidden mixing and gap opening. Different labels permit but do not force an energy crossing, and parent labels are not exact labels of symmetry-broken mixed states."],
 [ref("material-research","band-spin"),ref("construction-materials","nonsymmorphic-partner"),"Distinguish the squares of the double-valued mirror and time reversal and identify TRIM before adding half-translation endpoint pairing. A generic-k partner lies at −k; single-valued endpoint pairing is not automatically spin Kramers degeneracy."],
 [ref("pathways-materials","bandrep-bloch-phase"),ref("construction-materials","nonsymmorphic-bloch"),"Build the spinless Bloch matrix from site permutations and lattice remainders before adding the spin lift. Group 4 uses fractional k_z along z, while the line model uses radian k_x=2πf_x along x; do not mix their phases."],
 [ref("construction-materials","nonsymmorphic-bloch"),ref("construction-materials","nonsymmorphic-partner"),"Verify the half translation, spin-square relation and momentum-invariance condition before finding operation labels and endpoint partners inside degenerate energy subspaces. Operation-eigenvalue curves are not energy dispersions."],
 [ref("construction-materials","nonsymmorphic-partner"),ref("construction-materials","nonsymmorphic-breaking"),"List the spatial and antiunitary conditions for partner switching before removing one constraint at a time and checking the whole-line gap and endpoints. Kramers endpoints do not ensure middle-band connectivity, and a line direct gap is not a three-dimensional insulating gap."],
 [ref("symmetry-course-lessons","space-05"),ref("construction-materials","wavevector-star"),"Separate the little group retaining one q from operations changing star arms, then pair ±q conjugates to build real modes. This experiment uses a scalar field on a finite square lattice, not a general three-dimensional displacement representation."],
 [ref("construction-materials","wavevector-star"),ref("construction-materials","wavevector-cell"),"Specify the full star and the Fourier components actually nonzero before finding the pattern stabilizer and its translation subgroup. A compatible rectangular supercell need not be a minimal oblique cell, and its area need not equal the translation index."],
 [ref("construction-materials","wavevector-star"),ref("construction-materials","wavevector-satellites"),"Convert cosine amplitudes to complex coefficients using the same ±q and Fourier conventions before comparing phases and intensities. A²/4 does not apply when a self-conjugate arm is counted twice, and scalar intensity is not experimental diffraction intensity."],
 // SU(3) weights, CG copies and triple/four-factor recoupling.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("lie-group-lessons","generators-commutators"),ref("lie-group-lessons","su3-generators"),"Fix Hermitian generators, matrix exponentials and the i in commutators before constructing three-level SU(3) with T_a=λ_a/2. Convert interface degrees to radians; eight generators do not imply eight state amplitudes."],
 [ref("lie-group-lessons","su3-generators"),ref("lie-group-lessons","su3-weights"),"Specify the three-component state and diagonal T3 and T8 matrices before plotting simultaneous eigenvalues and weight differences connected by raising operators. A superposition can keep the same mean weight while its relative phase changes."],
 [ref("lie-group-lessons","su3-weights"),ref("lie-group-lessons","su3-dynkin-representations"),"Distinguish weights, roots and mean weights before labeling irreducible types by highest weight (p,q) and retaining coordinate multiplicities. Convert integer GT H1,H2 to T3,T8; zero-weight multiplicity differs from outer multiplicity."],
 [ref("lie-group-lessons","su3-dynkin-representations"),ref("lie-group-lessons","su3-cg-change-basis"),"Count types, dimensions, weights and outer multiplicities before assigning (R,α,μ) to CG columns. Columns expand coupled states in the product basis, so product-to-coupled coordinates use C†, not multiplication of probability tables."],
 [ref("lie-group-lessons","su3-cg-change-basis"),ref("lie-group-lessons","su3-cg-fundamental"),"Fix column expansions, conjugation and the GT convention before constructing 3⊗3 and 3⊗3̄ from exchange symmetry and trace invariance. Transform the phases of the anti-fundamental basis (s̄,−d̄,ū) together with the generators."],
 [ref("lie-group-lessons","su3-cg-fundamental"),ref("lie-group-lessons","su3-cg-multiplicity"),"Use exchange to separate symmetric and antisymmetric channels in 3⊗3 before treating the two equivalent octets in 8⊗8. Rotate state coordinates and the exchange operator consistently when changing the copy basis; these copies are not internal zero-weight states."],
 [ref("lie-group-lessons","su3-cg-higher-representations"),ref("lie-group-lessons","su3-cg-exact-radicals"),"Use Dynkin box addition to distinguish 15′ and 15 in 10⊗3 before constructing radicals by lowering and orthogonality within one weight block. Exact CG is bounded by N≤81 and numerical CG by N≤256; radicals are not guessed from decimals."],
 [ref("lie-group-lessons","su3-cg-multiplicity"),ref("lie-group-lessons","su3-racah-coupling-paths"),"Understand binary CG copy labels before retaining the outer multiplicities at both vertices of a triple-product path. Racah matrix size is set by final-irrep multiplicity; the triple interface allows only external factors with p+q≤2."],
 [ref("lie-group-lessons","su3-racah-coupling-paths"),ref("lie-group-lessons","su3-racah-exact-sixj"),"Obtain F=V_R†V_L from embeddings of the same final internal state before deriving exact overlaps for three 3s. Dimension-reduced S=F/√(dE dF) obeys weighted orthogonality; state conversion still uses F."],
 [ref("lie-group-lessons","su3-racah-coupling-paths"),ref("lie-group-lessons","su3-ninej-paired-trees"),"Enumerate triple-product paths vertex by vertex before extending to the three vertex-copy labels of four factors. Reorder the right tree from ACBD to ABCD before overlaps; this step does not automatically attach a fermionic exchange sign."],
 [ref("lie-group-lessons","su3-ninej-paired-trees"),ref("lie-group-lessons","su3-ninej-exact-normalization"),"Align factor order and all copy labels before deriving the 3×3 R for four 3s. The reduced 9j weights are products of two leaf-branch dimensions; S obeys weighted orthogonality and cannot replace R in state conversion."],
 [ref("lie-group-lessons","su3-dynkin-representations"),ref("lie-group-lessons","su3-ninej-high-input-labels"),"Distinguish 15 and 15′ by (p,q), conjugation and Casimir before recording the four inputs, final root and each vertex copy separately. The four-factor bound N≤4096 does not permit arbitrary four high-dimensional factors."]
];

export const lessonProgressionEdges=Object.freeze(edgeDefinitions.map(([from,to,reason])=>Object.freeze({from,to,reason})));
export const lessonProgressionInventory=Object.freeze(progressionLessons.map(item=>Object.freeze({...copyLesson(item),exerciseIds:Object.freeze([...(item.exerciseIds||[])]),key:key(item.catalog,item.lessonId)})));
export const lessonProgressionCatalogs=Object.freeze(progressionCatalogs.map(item=>Object.freeze({...item,modules:Object.freeze([...item.modules])})));

/** A fresh value is returned on every call; there is no learning-progress state. */
export function lessonProgression({catalog,lessonId}={}){
 const definition=catalogFor.get(catalog),catalogId=definition?.catalog;
 const identity=catalogId&&typeof lessonId==='string'?key(catalogId,lessonId):null;
 const current=identity?byKey.get(identity):null;
 const prerequisites=current?lessonProgressionEdges.filter(edge=>edge.to===identity).map(edge=>({...copyLesson(byKey.get(edge.from)),reason:edge.reason})):[];
 const next=current?lessonProgressionEdges.filter(edge=>edge.from===identity).map(edge=>({...copyLesson(byKey.get(edge.to)),reason:edge.reason})):[];
 return{status:current?(prerequisites.length||next.length?'reviewed':'index-only'):'unknown',
  current:current?copyLesson(current):null,prerequisites,next,
  index:definition?{title:definition.title,route:current?.indexRoute||definition.route}:{title:"All classroom pathways",route:'#classroom'},
  start:{title:"Start from the basics",route:'#classroom/start'}};
}

/**
 * Resolve an initial, parsed classroom selection without confusing a catalogue's
 * first lesson with the first lesson of the selected module/stage. This is
 * routing metadata, not an inference about prerequisite order. Unknown or
 * insufficiently scoped destinations return current:null and a catalogue index.
 * Pass the complete selection when exercise/material/preset context is present.
 */
export function progressionForSelection(selection={}){
 const definition=catalogFor.get(selection.section||selection.catalog);
 const fallback=()=>({...lessonProgression({catalog:definition?.catalog}),resolution:'index'});
 if(!definition)return fallback();
 let candidates=progressionLessons.filter(item=>item.catalog===definition.catalog);
 const modular=definition.modules.length>0;
 if(modular){
  if(!definition.modules.includes(selection.module))return fallback();
  candidates=candidates.filter(item=>item.module===selection.module);
 }else if(selection.module)return fallback();
 let chosen=typeof selection.lesson==='string'&&selection.lesson?candidates.find(item=>item.lessonId===selection.lesson):null;
 if(selection.lesson&&!chosen)return fallback();
 let resolution=chosen?'explicit':modular?'module-default':'course-default';
 const exerciseMaySelect=modular||definition.section==='dynamics'||definition.section==='observables'&&selection.tab==='derive';
 if(selection.exercise&&exerciseMaySelect){
  const exerciseLesson=candidates.find(item=>item.exerciseIds.includes(selection.exercise));
  if(!exerciseLesson)return fallback();
  chosen=exerciseLesson;resolution='exercise';
 }
 if(definition.section==='lie'){
  const tracks=['all','continuous','representations','cg','racah','ninej','coupling'];
  if(!chosen&&selection.track&&!tracks.includes(selection.track))return fallback();
  const track=selection.track||'all';
  const matches=item=>track==='all'||item.track===track||track==='continuous'&&item.lessonId==='representations'||track==='coupling'&&item.track!=='continuous';
  if(!chosen){chosen=candidates.find(matches);resolution='track-default';}
 }else if(definition.section==='academy'){
  const tracks=['all',...new Set(candidates.map(item=>item.track))];
  if(!chosen&&selection.track&&!tracks.includes(selection.track))return fallback();
  const track=chosen?.track||selection.track||'all';
  let visible=candidates.filter(item=>track==='all'||item.track===track);
  const level=['point','space'].includes(selection.level)?selection.level:'all';
  const matching=visible.filter(item=>level==='all'||!item.symmetryLevel||item.symmetryLevel==='point-and-space'||item.symmetryLevel===level);
  if(matching.length)visible=matching;
  if(!chosen||!visible.includes(chosen)){chosen=visible[0];resolution='track-default';}
 }else if(definition.section==='coupled-materials'&&selection.module==='distortion'&&!selection.lesson&&!selection.exercise){
  const preset=['batio3','srtio3'].includes(selection.preset)?selection.preset:['batio3','srtio3'].includes(selection.material)?selection.material:'batio3';
  if(preset==='srtio3'){chosen=candidates.find(item=>item.labPreset==='srtio3');resolution='material-default';}
 }
 chosen??=candidates[0];
 if(!chosen)return fallback();
 return{...lessonProgression(chosen),resolution};
}

function linkList(items,kind){
 const itemHTML=item=>`<li><a data-lesson-progression-link data-progression-kind="${kind}" href="${esc(item.route)}">${esc(item.title)}</a><p>${esc(item.reason)}</p></li>`;
 if(items.length<=3)return '<ul>'+items.map(itemHTML).join('')+'</ul>';
 return '<ul>'+items.slice(0,3).map(itemHTML).join('')+"</ul><details><summary>More connections</summary><ul>"+items.slice(3).map(itemHTML).join('')+'</ul></details>';
}

/** Native links support keyboard use, copied URLs and opening in a new tab. */
export function lessonProgressionHTML(selection={}){
 const result=lessonProgression(selection);
 if(!result.current)return '';
 return `<section class="lesson-progression" data-lesson-progression="${esc(key(result.current.catalog,result.current.lessonId))}" aria-label="Preparation and further study"><h3>Connect this lesson</h3><p class="lesson-progression-intro">Review foundations or continue in greater depth as needed. These recommendations do not restrict direct access to lessons or tools.</p><div class="lesson-progression-columns">${result.prerequisites.length?`<section><h4>Suggested preparation</h4>${linkList(result.prerequisites,'prerequisite')}</section>`:''}${result.next.length?`<section><h4>Where to go next</h4>${linkList(result.next,'next')}</section>`:''}${!result.prerequisites.length&&!result.next.length?"<p>Choose your next topic from this subject's contents.</p>":''}</div><p class="lesson-progression-index"><a data-lesson-progression-link data-progression-kind="index" href="${esc(result.index.route)}">Subject contents</a><a data-lesson-progression-link data-progression-kind="start" href="${esc(result.start.route)}">Begin with the basics</a></p></section>`;
}
