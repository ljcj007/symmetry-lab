# Seeing symmetry: foundational teaching demonstrations

This topic connects spatial operations, basis functions, representation matrices, characters, and physical consequences in a practical learning sequence. The graphics clarify transformations and degeneracies, with values from explicitly defined teaching models. Molecular animations do not replace quantum-chemical normal-mode calculations, and the crystal-field levels are not fitted parameters for a particular material.

## Where was the water example?

The existing route is **Classroom → Foundations and Representations → Lesson 07, Physical Constraints from Point Groups**. Its worked example derives the three water vibrations in fixed coordinates. Open the [existing written water example](../index.html#classroom/foundations?lesson=selection-rules) directly. The new topic adds a dedicated demonstration that combines this derivation with schematic vibrations, polarization selection, and matrix checks.

## 1. Water, infrared, and Raman

Use active operations and column vectors. The molecule lies in the **xz plane**, with its principal twofold axis along z, O at the origin, and H atoms at (a,0,b) and (−a,0,b). The column order is E, C₂(z), σ(xz), σ(yz). In this convention:

| Quantity | E | C₂(z) | σ(xz) | σ(yz) |
| --- | ---: | ---: | ---: | ---: |
| Atoms remaining at their own sites | 3 | 1 | 3 | 1 |
| Three-dimensional polar-vector trace | 3 | −1 | 1 | 1 |
| Nine-dimensional displacement character | 9 | −1 | 3 | 1 |

An atom moved to another site contributes no diagonal atomic block to the displacement matrix, so one cannot simply multiply every column by the total atom count 3. Reduction gives Γ₃N = 3A₁ + A₂ + 3B₁ + 2B₂. Removing translations A₁+B₁+B₂ and rotations A₂+B₁+B₂ leaves **Γvib = 2A₁+B₁**. The two A₁ modes are the symmetric stretch and bend; B₁ is the antisymmetric stretch. A₁ transforms like z and square functions, while B₁ transforms like x and xz, making all three modes symmetry-allowed in infrared and ordinary Raman spectroscopy. Compare the bases with the [Bilbao C₂v table](https://www.cryst.ehu.eus/cgi-bin/rep/programs/sam/point.py?num=7&sg=25).

**Try it:** Predict which H atoms C₂ exchanges, then apply the operation. Switch between A₁ and B₁ modes and compare infrared allowance for z and x polarization and Raman channels xx, zz, and xz. The schematic amplitudes show mode symmetry, not actual eigenvector ratios or frequencies. The A₁ modes share a symmetry type; their specific mixing is determined by force constants.

**Step-by-step exercise:** Why do some texts give 2A₁+B₂? Check whether the molecule is placed in yz, then compare the irrep labels of x and y. Relabeling coordinates interchanges B₁/B₂ without changing the three physical vibrations. An allowed selection rule does not guarantee a strong peak in every polarization or geometry. Infrared electric-dipole coupling and the Raman polarizability derivative are distinct couplings; see [Western University's normal-mode and spectroscopy notes, pp. 13–14](https://instruct.uwo.ca/chemistry/734b/Group%20Theory-Part%2010%20Normal%20Modes%20of%20Vibration.pdf).

## 2. A character is not the whole matrix

In the full three-dimensional coordinate basis (x,y,z), C₄(z) has matrix [[0,−1,0],[1,0,0],[0,0,1]] and trace 1. Restricted to xy, its matrix is [[0,−1],[1,0]], with trace 0 and square −I₂. Zero trace means the diagonal contributions cancel; it does not mean a zero transformation.

**Try it:** Switch between the three-dimensional vector basis and the two-dimensional xy basis for the same C₄ operation, and explain their characters 1 and 0. Do not combine character rows from different representations in a reduction. Move the general point onto z: its point period becomes 1 while the operation order remains 4. Distinguish the matrix's representation space, the operation, and the object being transformed.

## 3. The D₃ triangle: projection, basis functions, and matrices

Place scalar s-type basis functions s₁, s₂, s₃ at the vertices of an equilateral triangle in xy. The original space is a **three-dimensional scalar-function space**, not the six-dimensional space of x and y displacements at three sites. D₃ has classes E, 2C₃, and 3C₂. The C₂ axes lie in the triangle's plane; their three-dimensional rotations look like flips in projection, but they are not mirror operations σ. See the characters and function types in the [Bilbao D₃(32) table](https://www.cryst.ehu.eus/cgi-bin/rep/programs/sam/point.py?num=18&sg=149).

The vertex-permutation characters are (3,0,1), reducing with class sizes (1,2,3) to **A₁+E**. The projector is Pα = dα/6 ∑g χα(g)*D(g). Projecting and normalizing the seed s₁ gives:

- A₁：u₀ = (s₁+s₂+s₃)/√3；
- One E direction: u₁ = (2s₁−s₂−s₃)/√6;
- Project a second seed onto E and orthogonalize against u₁ to obtain the partner u₂ = (s₂−s₃)/√2.

The character projector for E selects the entire two-dimensional subspace; one seed does not uniquely determine both basis functions. Another orthonormal basis changes the E matrix elements but preserves the characters. If C₃⁺ cycles 1→2→3→1, then in (u₁,u₂), Dᴱ(C₃⁺) = [[−1/2,−√3/2],[√3/2,−1/2]], while C₂ about the vertex-1 axis is diag(1,−1). Compare the projection and basis change with [Lemus and Hernández-Castillo's original teaching paper, pp. 117–118](https://rmf.smf.mx/ojs/index.php/rmf-e/article/download/4741/5898/14242).

**Step-by-step exercise:** Count fixed vertices and reduce the representation. Obtain u₁ from Pᴱs₁, find an orthogonal second direction, and construct the blocks BᵀD(g)B. Check C₃³=I, C₂²=I, and C₂C₃C₂=C₃⁻¹. Basis-function colors indicate coefficient signs, not positive and negative electronic charge.

## 4. SO(3) → O → D₄: following the branching of degeneracies

For the five spinless real d-type functions with l=2, the five-dimensional SO(3) representation restricts to E+T₂ in the proper cubic rotation group O. Restricting further to the proper tetragonal group D₄ with its fourfold axis along z gives:

| Component in O | Components in D₄ | Typical d bases |
| --- | --- | --- |
| E (two-dimensional) | A₁+B₁ | 2z²−x²−y²; x²−y² |
| T₂ (three-dimensional) | B₂+E | xy; (xz,yz) |

The dimensions sum to 1+1+1+2=5. The l=2 branching and cubic bases appear in the [rotation-group subduction section of the Bilbao O(432) table](https://www.cryst.ehu.eus/cgi-bin/rep/programs/sam/point.py?num=30&sg=207); tetragonal bases appear in the [Bilbao D₄(422) table](https://www.cryst.ehu.eus/cgi-bin/rep/programs/sam/point.py?num=12&sg=89).

This chain contains only proper rotations, so its labels have no g/u suffix. In inversion-symmetric Oₕ→D₄ₕ environments, these even-parity d functions carry g. The demonstration varies a schematic Hamiltonian that preserves the level barycenter. Symmetry fixes the allowed degeneracy structure and mixing blocks, not a unique ordering or spacing of actual material levels.

**Step-by-step exercise:** Set the crystal field to zero and check the fivefold degeneracy. Add the cubic term for 2+3, then the tetragonal term for 2→1+1 and 3→1+2. Check orbital labels and total dimensions throughout. Distinguish accidental coincidences from symmetry-enforced degeneracy rather than judging only whether lines overlap.

## 5. The Jahn–Teller effect: electronic degeneracy and distortion energy

The standard name is the **Jahn–Teller effect**. The minimal E⊗e teaching model couples a two-dimensional electronic state E to two distortion coordinates (Qθ,Qε): Helectronic = g(Qθσz+Qεσx). Including elastic energy gives adiabatic surfaces V± = k(Qθ²+Qε²)/2 ± g√(Qθ²+Qε²), with k>0 and g≥0. The lower surface has minimum radius Q₀=g/k and stabilization energy g²/(2k).

**Try it:** Start at g=0, increase the coupling, and compare total energies at the origin and the minimum. Vary the distortion direction to explore the circular trough of the purely linear isotropic model. The partially occupied e_g shell of octahedral d⁹ is an introductory example of orbital degeneracy; this two-state model is not a complete d⁹ multiplet-spectrum calculation.

**Step-by-step exercise:** Plot the linear electronic energy decrease and quadratic elastic cost separately, then differentiate the lower branch to find Q₀. A circular trough in this model does not imply continuously equivalent static distortions in every material: higher-order coupling and the environment can reshape it, and nuclear dynamics can restore higher symmetry in the observed average structure. Spin Kramers degeneracy is not the orbital Jahn–Teller criterion used here. For scope and dynamical effects, see [the publisher's excerpt from Bersuker's The Jahn–Teller Effect, pp. 2–4](https://assets.cambridge.org/97805218/22121/excerpt/9780521822121_excerpt.pdf).

## 6. Macroscopic crystal symmetry

Let G be a periodic crystal's space group and T its normal subgroup of lattice translations. Retaining the linear parts gives a crystal point group isomorphic to G/T. This finite group constrains uniform macroscopic tensors; it is not the site-symmetry group of an arbitrary point in the crystal. Screws and glides have no fixed point, but their rotation or reflection parts still enter the crystal point group. See [IUCr International Tables for Crystallography, Vol. A, §8.1.6, pp. 724–725](https://it.iucr.org/Ab/ch8o1v0001/sec8o1o6.pdf).

**Try it:** Compare a translation and a screw operation: atomic positions change differently, while the corresponding uniform vector responds to the linear matrix part. Compare rotations of orders 1, 2, 3, 4, 6, and 5. The linear matrix has integer trace in a lattice basis, whereas a proper three-dimensional rotation has trace 1+2cos(2π/n), giving the rotation-order restriction for conventional periodic crystals. It does not exclude molecular fivefold axes or aperiodic quasicrystalline order.

**Step-by-step exercise:** Why does a cubic-looking unit cell not determine the crystal point group? Check the atomic species and positions, then test whether each candidate operation preserves the entire periodic structure. Distinguish the geometry allowed by the lattice from the actual symmetry of the decorated crystal.

## Shared conventions and checks

- Operations act actively on column vectors; AB applies B first, then A.
- Fix the representation space, column order, class sizes, and axes before comparing characters.
- Signed colors represent basis coefficients or mode displacements; amplitudes and energy units belong to the stated teaching model.
- IR refers to fundamental electric-dipole selection rules; Raman refers to the ordinary first-order polarizability process. Distinguish symmetry allowance from actual frequencies, intensities, and measurement geometry.
- These six demonstrations complement the existing point-group atlas, SALC, crystal-field, and material-spectroscopy modules. The written lessons and numerical calculation routes remain available.

## Extensions: six micro-experiments from polyhedra to quantum degeneracy

### Why do five regular polyhedra have only three rotation-group types?

The regular tetrahedron has proper rotation group T (order 12) and full point group T_d (24). The cube and octahedron share O (24) and O_h (48); the dodecahedron and icosahedron share I (60) and I_h (120). The suffix distinguishes the added spatial operations: the full tetrahedral group is T_d, not T_h. Dual polyhedra share the same spatial symmetries. For rotation counting, see [Columbia University's notes on Platonic solids](https://www.math.columbia.edu/~harris/website/content/2-courses1/3-mathematics-gu4041-fall-2023/platonic-solids.pdf).

**Try and check:** Rotate the object, display axes, and distinguish proper rotations with det R=+1 from orientation-reversing operations with det R=−1. Molecules and finite objects can have fivefold axes; I/I_h are outside the 32 point groups of three-dimensional periodic crystals. This does not conflict with the lattice rotation-order restriction.

### Degenerate vibrations: A₁+E in three equivalent scalar oscillators

Take equal-mass scalar coordinates q₁, q₂, q₃ at triangle vertices, with equal pair coupling κ and equal pinning p. The potential is V = p∑qᵢ²/2 + κ∑i<j(qᵢ−qⱼ)²/2, with mass m>0. The stiffness matrix is pI+κL(K₃); the A₁ squared frequency is p/m and the two-dimensional E squared frequency is (p+3κ)/m. This is explicitly a three-scalar-oscillator model, not the full nine-dimensional displacement calculation of a three-atom molecule.

**Try and check:** With equivalent couplings, changing the linear combination within E preserves the frequency. Change one bond and recheck commutation with the symmetry matrices and splitting of E. At p=0, uniform displacement is a zero-frequency mode. The model uses the same A₁ and E bases as the triangle projection example; it does not replace water force-constant or spectrum calculations.

### Same-k degeneracy versus pairing of k and −k in the Brillouin zone

The one-dimensional lattice model uses lattice constant 1 and k∈[−π,π]: H(k)=−2t cos(k)I+2α sin(k)σy+Bσz. Its branches are −2t cos(k)±√[4α²sin²(k)+B²]. At B=0, time reversal is preserved; k=0 and π are invariant momenta with same-k Kramers pairs. At general k, the partner lies at −k and does not imply same-k degeneracy. See the [Topology in Condensed Matter demonstration of invariant momenta and Kramers pairs](https://topocondmat.org/ocw/w5_qshe/fermion_parity_pump_6.html?date=1529366400037).

**Try and check:** Vary α, then turn on B. At both invariant momenta, the induced splitting is 2|B|. For α=B=0, spin degeneracy at every k reflects additional spin-rotation symmetry. This micro-experiment illustrates a one-dimensional Rashba-type band and Kramers conditions; it neither establishes nontrivial topology nor replaces general three-dimensional space-group band-connectivity calculations.

### Permutation and two spins: singlet and triplet

In the basis |↑↑⟩, |↑↓⟩, |↓↑⟩, |↓↓⟩, exchange P₁₂ gives eigenvalue −1 on |s⟩=(|↑↓⟩−|↓↑⟩)/√2 and +1 on the three S=1 states. With ħ=1 and H=J S₁·S₂, the singlet energy is −3J/4 and the triplet energy J/4; J>0 favors the singlet. The sign convention for exchange depends on the Hamiltonian definition; see the [ALPS Heisenberg-model documentation](https://alps.comp-phys.org/documentation/models/heisenberg/).

**Try and check:** Exchange |↑↓⟩, then its symmetric and antisymmetric combinations. Verify the eigenvalues using P₁₂=2S₁·S₂+I/2. For two electrons, include the spatial wavefunction when enforcing antisymmetry of the total state. Fermionic statistics does not require the spin part alone to be a singlet.

### Why must time reversal include complex conjugation?

For spin 1/2, choose T=iσyK with complex conjugation K; an overall phase changes no physics. Acting on ψ=(a,b)ᵀ gives Tψ=(b*,−a*)ᵀ and then T²ψ=−ψ. Applying iσy as an ordinary linear matrix alone omits antiunitarity. See [David Tong's discrete-symmetry notes, §1.2.3–1.2.4](https://davidtong.org/pdfs/teaching/topics-in-quantum-mechanics/topicsinqm1.pdf).

**Try and check:** Enter a spinor with complex phases and display ψ, Kψ, Tψ, and T²ψ. One application reverses the Bloch vector; two restore it while giving the state vector a minus sign. Time reversal is more than reversing an animation and is not an ordinary spatial rotation.

### Double groups, 2π/4π, and spin–orbit coupling

For spin 1/2, U(n,θ)=exp(−iθ n·σ/2) obeys U(2π)=−I and U(4π)=I. A global minus sign preserves probabilities; observing it requires a relative phase against a reference path. A double group retains the two spinor lifts identified by an ordinary rotation. See [Tong's discrete-symmetry notes, §1.2.3](https://davidtong.org/pdfs/teaching/topics-in-quantum-mechanics/topicsinqm1.pdf).

The SOC model sets ħ=1, l=1, s=1/2, and H=λL·S. Using L·S=[J²−L²−S²]/2 gives a j=1/2 doublet at −λ and a j=3/2 quartet at λ/2. The dimensions sum to 6 and the degeneracy-weighted barycenter is zero. Compare the identity and j=l±1/2 with [MIT 22.02 lecture 16, slide 17](https://ocw.mit.edu/courses/22-02-introduction-to-applied-nuclear-physics-spring-2012/2f9632517cd236cd817140610c2d1bff_MIT22_02S12_lec16.pdf).

**Try and check:** Check the spinor at 2π and 4π, then vary the sign and size of λ while checking the 2+4 branching and barycenter. This atomic l=1 example illustrates angular-momentum coupling, not a complete material-level calculation with crystal fields, exchange, and many-electron interactions.
