# Space-group, double-group, magnetic-group, color-group, and spin-group classroom

After “32  point group ,”this course assumes groups, representations,  character . Five routes organize  space group ,  double group , magnetic groups,  color group ,  spin group :24 units,48 explained tests,20 expandable derivations. Seven experiments include Seitz, spinors, moments,  antiferromagnetic  half-translations, and new  double group ,  color group ,  spin group  point/3D models.

Machine-readable lessons are in [symmetry-course-lessons.json](../data/symmetry-course-lessons.json); open [Group theory: crystal symmetry](../index.html#classroom/crystal). Text, examples and exercises are original Chinese teaching content checked against books and primary sources, without publishing textbook PDFs, scans or paragraph-by-paragraph translations.

## Five learning routes

|Lesson|Question|Example/experiment|
| --- | --- | --- |
| 01 From lattices to 230 space groups | What do 7, 14, 32 and 230 count? | Compare P4, P4₁ and P4₃; identify 11 enantiomorphic pairs |
| 02 Compose spatial actions with Seitz operators | Why do translation parts not always add directly? | Compare translate-after-rotate with rotate-after-translate |
|03  screw axis ,  glide plane ,  fractional translation |Does direction return imply position return?|Twice z-axis 2₁ gives c|
| 04 Orbits, site symmetry and Wyckoff positions | Why do special-position orbits shrink? | A general P−1 point and an inversion center |
| 05 k little groups and nonsymmorphic Bloch phases | Why not directly use point-group tables at a boundary? | 2₁ eigenvalues change from ±1 at Γ to ±i at the boundary |
|06 Standard cells, BC labels, records|Why different matrices/labels for one type?|Shift inversion-center origin|
| 07 Why must an electron spinor rotate by 4π? | Why does a spinor change sign when the moment direction is unchanged? | Complex amplitudes, spin directions and coherent references |
| 08 Double groups do not copy old tables | How does the extra central element change multiplication? | The C₂ lift forms C₄, not C₂×C₂ |
|09  double-valued representation / spin–orbit coupling |Why not necessarily2D?|p×spin6D|
| 10 Conditions for time reversal and Kramers pairing | Is the equal-energy partner at the same k? | Γ, general k, boundary points and PΘ |
| 11 Why are moments time-odd axial vectors? | How do mirrors act on displacements and moments? | Polar vectors, axial vectors, and primed mirrors |
|12 Four  magnetic space group /1651types|III versus IV?|Alternating↑↓/antitranslation|
| 13 BNS, OG and 122 magnetic point groups | Why can an antiferromagnet have a gray magnetic point group? | Compare 2, 21′ and 2′ |
| 14 Antiunitary multiplication and magnetic corepresentations | Why is (iK)²=1? | Step-by-step conjugation and multiplication |
|15  antiferromagnetic  Θ×half-translation|Where same-k protection?|Momentum return/A² phase|
| 16 The double group of three-dimensional 222 | Ordinary twofold rotations commute; why do their spinor lifts not commute? | Q₈ relations XY=Z, YX=−Z and the commutator |
| 17 Double space groups and screws | How do spinor signs multiply Bloch phases? | ĝ²=ĒTz, Γ/boundary eigenvalues, inversion lifts |
|18 Color  point group  permutations|One spatial action/global labels?|Three-color C₃, homomorphism, kernel, image|
| 19 Three-dimensional color space groups | Why is a translation left after three cycles? | An RGB three-layer motif, g³=T_c, infinite groups and finite quotients |
| 20 Black-and-white color groups and magnetic groups | Why can two flips have different squares? | Two-color permutation versus antiunitary Θ |
|21  spin point group |Rotate positions/moments separately?|Two-site [C₂x∥C₂z]/separate actions|
| 22 Spin space groups | What survives a combined translation in the spin-point projection? | Antiferromagnetic half-translations, a three-layer 120° helix and spin-point projection |
| 23 Continuous spin-only stabilizers | How can spins rotate with sites fixed? | Moment rank determines O(3),O(2),mirror,and trivial stabilizers |
|24 SOC/magnetic subgroups|Do matching arrows ensure real symmetry? | U=(−1)^εdet(Rc)Rc tests|

Each lesson includes goals, explanations, copyable formulas, worked steps, common pitfalls and two self-tests. Exercise `answer` uses zero-based option indices, with explanations for every answer. `lab` points to the relevant experiment panel; some lessons also specify workbench group numbers, k coordinates and the double-valued setting.

New content links specific experiments via `labPreset`; `symmetryLevel` identifies point models, 3D periodic models, or both. Old lesson/derivation IDs preserve progress. Twelve material problems retain NaCl,Si,GaAs,Fe,NiO,MnF₂; eight new problems use clearly labeled ideal models, not experimental materials. Questions can be answered before hints, steps, or conclusions are opened.

## Unified coordinate/algebra conventions

1. Use fractional-coordinate column vectors and active spatial actions x′=Rx+t; AB applies B first, then A. Seitz multiplication is `{R₁|t₁}{R₂|t₂}={R₁R₂|R₁t₂+t₁}`, with inverse `{R⁻¹|−R⁻¹t}`.
2. Fractional-matrix isometry must use the lattice metric. Before applying `det(R)R` to Cartesian moments, R must be the corresponding orthogonal Cartesian matrix.
3. Real fractional R acts on reciprocals via R⁻ᵀ;  little group  condition R⁻ᵀk=k+K requires genuine  reciprocal lattice  K. Centered  conventional cell  does not permit arbitrary integer triples unconditionally.
4. The active translation convention is T(t)ψ(r)=ψ(r−t), giving lattice translation L the Bloch phase exp(−2πik·L). Lesson k uses fractional reciprocal coordinates. Retain integer translations discarded by cell wrapping for phase calculations.
5. Lessons 03,05 and BC SG4 use z-axis 2₁: R=diag(−1,−1,1),t=(0,0,1/2), with boundary k=(0,0,1/2). This differs numerically from common Bilbao/ITA monoclinic b-axis settings; transform k when changing settings.
6. If x_old =P x new+p, then R_new =P⁻¹R oldP, t_new =P⁻¹(R oldp+t_old−p), k_new =Pᵀk old. Save bases, origins, operations, positions, k together.
7. Spin-1/2 rotations use U(n,θ)=exp(−iθn·σ/2). Ē is the central element covering ordinary identity rotation; the double-valued sector has D(Ē)=−I. The SU(2) double cover directly describes SO(3); crystallographic double groups containing inversion additionally require explicit improper-rotation lift conventions.
8. Moments are time-odd axial vectors: m′=(−1)^εdet(R)Rm, ε=1 for time reversal. Magnetic-space-group calculations differ from independent-spin-group theory without SOC.
9.  antiunitary operator  is UK, antilinear/norm-preserving, ⟨Aψ|Aφ⟩=⟨φ|ψ⟩. A²=UU*, not U². Anti- unitary matrix  matrices transform under  change of basis  as S⁻¹US*; their trace is not ordinary invariant character.
10. Same-k Kramers-type pairing requires A to be a system symmetry, preserve that momentum subspace and satisfy A²=−I. For spin 1/2, A=ΘT(τ) gives A²|ₖ=−exp(−4πik·τ)I, but −k=k+K must be checked separately.
11. Color operations act actively as `(r,c)→(Rr+t,π(c))`; pattern preservation requires `c(Rr+t)=π(c(r))`. The kernel of `ρ:G→S_n` preserves colors; its image is the actual permutation group. n labels do not ensure the full S_n image.
12. Spin-space `[U∥R|t]` acts `(r,m)→(Rr+t,Um)`, multiplies `[U∥R|t][V∥S|u]=[UV∥RS|t+Ru]`. U uses orthogonal Cartesian spin axes; fractional  fractional coordinates  R must become Cartesian Rc before SOC locking tests.
13. The spin-point projection is `[U∥R|t]→[U∥R]`. Its kernel consists of pure translations with U=E and R=E, not all operations with R=E; for example, `[C₃z∥E|c/3]` retains C₃z after projection.
14. Generalized moment actions U∈O(3) with detU=−1 can be written as time reversal followed by proper V=−U, antiunitary electronically. Discrete presets use SO(3); lessons separately explain complete spin-only stabilizers. Classical moment closure omits electronic central signs.
15. Standard electronic  double group  has independent central inversion P, P²=E, commuting with lifts; mirror `(P C̃₂n)²=Ē`. This is not every Pin convention.

## Teaching coverage and limits

The space-group route teaches classification hierarchy and catalogue use for all 230 types, rather than writing repetitive separate articles for every group. Use the catalogue/workbench for specific operations and representations. Point-orbit demos explain general/special positions and stabilizers, not automatic full Wyckoff-letter identification from multiplicity.

Finite  double group  doubles ordinary  point group  elements, not mechanically  conjugacy class  counts,  irreducible representation  counts, or levels. Double-valued1D reps exist; SOC alone does not double every k. Spherical j=1/2,3/2 splitting does not replace arbitrary-crystal  double group  reduction.

Magnetic-group counts are I=230, II=230, III=674 and IV=517, totaling 1651; magnetic point groups instead have 32+32+58=122 types. Interpret BNS/OG labels with their respective cell settings; their numbers are not decimals. Discarding translations turns a type-IV antitranslation into pure time reversal, explaining why ordered antiferromagnets can have gray magnetic point groups.

“No such pairing protection” in the antiferromagnetic experiment means only that the selected antiunitary operation fails to establish that Kramers-type result, not that all degeneracy disappears. Net moment, magnetic-group type, or half translations alone do not determine actual order, splitting magnitudes, or topology.

Distinguish standard BC/Bilbao from temporary D1/D2. Check full settings/mappings, not ordering/dimension guesses.

Color-group lessons cover finite label permutations and three-dimensional periodic colored models. Label exchanges are explicitly specified mathematical extensions; if labels represent different elements, additionally check symmetry of the actual Hamiltonian. Crystallographic color groups also differ from QCD’s continuous SU(3) color gauge group: “three colors” does not mean SU(3). The course does not enumerate every color point/space group for arbitrary color counts.

Spin-group teaching concerns magnetic spin point/space groups with independently paired spin and spatial operations. Spin(3)≅SU(2) instead double-covers proper 3D rotations. Lessons cover two-site collinear, three-site coplanar, antiferromagnetic half-translation, and three-layer helix models, all periodically extended in three directions. They check specified operations/powers, not full identification/classification of arbitrary magnetic input. 230 and 1651 count specific ordinary/magnetic-space-group types, not all spin space groups. Literature supercell bounds, equivalence relations, and continuous freedoms must be distinguished.

Spin-only  stabilizer  fixes every moment. For rank r, its O(3)  stabilizer  is O(3−r): no moments O(3), collinear O(2), noncollinear coplanar two-element mirror,3D identity. Proper-only collinear continuous part SO(2); coplanar/noncoplanar have no nontrivial continuous part. Finite enumeration cannot replace analytic continuous  stabilizer .

Conventional magnetic groups correspond to locked spin actions `U=(−1)^εdet(Rc)Rc`. Different spin operations can act identically on a collinear pattern: C₂x and −I both reverse ±z but have different quantum and antiunitary implementations. Thus a proper-rotation pairing that fails locking does not mean the same spatial action admits no magnetic-group pairing. Real systems with SOC additionally require checking their Hamiltonian and energy scale.

## Textbook pages and primary references

Main text: Dresselhaus, Dresselhaus, Jorio,*Group Theory: Application to the Physics of Condensed Matter*, Springer2008,[DOI10.1007/978-3-540-32899-5](https://link.springer.com/book/10.1007/978-3-540-32899-5). Supplied `2008_Book_GroupTheory.pdf` has576 physical pages; verify pages individually, not fixed offsets.

| Purpose | Printed book pages | Physical PDF pages in this file (1-based) |
| --- | --- | --- |
| Seitz operations, multiplication, inverses | 184–185 | 187–188 |
|Screws, glides, translations, symmorphic/nonsymmorphic|185–190|188–193|
| Hierarchy of Bravais lattices and space groups | 190 | 193 |
| k little groups and Bloch functions | 214–216 | 217–219 |
|Nonsymmorphic representations/multipliers|220|223|
| Double groups, 2π/4π and spinors | 341–342 | 340–341 |
| Double-group properties, characters, SOC | 343–350 | 342–349 |
| time reversal /antiunitarity|403–406|400–403|
| Time-reversal conditions on spectra | 407–411 | 404–408 |
| Magnetic groups, combined translations, magnetic point-group types | 418–422 | 415–419 |

References guide ordering/formulas. Some chapter16 statements omit H preserving  time reversal  or same-k partners; some antiunitary formal equalities are not definitions here. Antilinear norm preservation/explicit matrices explain A², avoid mistaking A²=−I for negative norms, and list complete pairing assumptions.

Additional sources and their uses:

- [Nespolo, Aroyo, Souvignier (2018), space-group hierarchy](https://journals.iucr.org/j/issues/2018/05/00/in5013/index.html): 14 Bravais types, equivalences behind 230/219, 65 Sohncke types, 11 enantiomorphic pairs.
- [Dauter/Jaskolski2010, International Tables introduction](https://journals.iucr.org/j/issues/2010/05/02/kk5061/index.html): general/ special position , multiplicities/letters Wyckoff, origins.
- [Original Bilbao double-crystallographic-group paper (2017)](https://arxiv.org/abs/1706.09272): SU(2) lifts, double-group multiplication, improper-rotation conventions, standard settings and representation labels.
- [IUCr Magnetic Group Tables](https://www.iucr.org/what-we-do/publications/books/Magnetic-Group-Tables): standard 122 magnetic point-group and 1651 magnetic-space-group classifications.
- [Bilbao magnetic tutorial](https://cryst.ehu.es/html/cryst/tutorials/Tutorial_magnetic_section_BCS_1.pdf)/[four  magnetic space group  types](https://www.cryst.ehu.es/html/resources/Hamilton2014/MagneticSpaceGroups_MIA.pdf): BNS/OG, MGENPOS, I–IV translation subgroups.
- [IUCr magnetic-point-group teaching material](https://www.iucr.org/what-we-do/education/pamphlets/teaching-crystallographic-and-magnetic-point-group-symmetry-using): axial vectors, moments and primed spatial operations.
- [Mong, Essin, Moore, Phys. Rev. B 81,245209 (2010)](https://doi.org/10.1103/PhysRevB.81.245209): squares and momentum action of Θ with half translations. This course independently derives phases in its active-translation convention, not the paper's alternative direction notation.
- [MSGCorep upstream](https://github.com/goodluck1982/MSGCorep): magnetic data/ corepresentation  sources; full implementation attribution follows repository notes.
- [Felix and Junio, Acta Cryst. A71, 216–224 (2015)](https://doi.org/10.1107/S2053273314028071): color symmetry and color-preserving subgroups. The three-color triangle’s specific homomorphism, kernel and image are calculated independently in this course.
- [Harker, Colored lattices, PNAS 75,5264–5267 (1978)](https://pmc.ncbi.nlm.nih.gov/articles/PMC392941/): original colored-lattice paper; the periodic three-layer RGB model is an original teaching construction.
- [Shinohara et al., Acta Cryst. A80,94–103(2024)](https://journals.iucr.org/a/issues/2024/01/00/ib5119/): spin operations, matching, spin-only  stabilizer .
- [Etxebarria et al., Acta Cryst. A81, 317–338 (2025)](https://journals.iucr.org/a/issues/2025/04/00/cam5007/): spin point groups and SOC conditions, distinguishing lattice and spin actions on tensors.
- [Jiang et al., Phys. Rev. X14,031039 (2024)](https://arxiv.org/abs/2307.10371): spin-space-group classification assumptions, periodicity indices, and scope. Restricted enumeration counts are not unconditional totals here.

Links support provenance/further study; published Chinese lessons, examples, and tests load locally without third-party reading requirements.
