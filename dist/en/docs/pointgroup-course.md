# The 32-point-group classroom: content, conventions, and sources

Eight lessons for physics/materials/chemistry beginners connect operations,32 classes, representations,  character , projection, physical  selection rule , and site  point group  atlas/structure/representation tools. Each has goals, guided examples, misconceptions, and two explained self-tests.

Lesson text, exercises and derivations were newly written in Chinese for this website, not translated paragraph by paragraph from the textbook. No textbook PDFs, scanned pages or book figures are included in the published files.

## Learning route

| Lesson | Question | Practice |
| --- | --- | --- |
| 01 From symmetry actions to groups | What makes a complete set of symmetry operations? | Generate C₄ from 90° rotation and distinguish group order from element order |
| 02 Rotations, mirrors, and inversion | What do the two notations describe? | Compose C₂ with a perpendicular mirror to obtain inversion |
|03 Why exactly 32?|How does periodicity restrict rotations, and how do32/230 differ?|Compare4,4mm,4/mmm|
| 04 Turn geometric symmetry into matrices | What are representations, irreducible representations and conjugacy classes? | Obtain vector characters from C₄v coordinate matrices |
| 05 Decompose representations with characters | How does one character row give irreducible components? | Derive A₁+B₁+B₂ for the C₂v polar vector |
|06 Find bases using  projection operator |Extract a chosen symmetry from functions?|Decompose x+y+z+xy|
| 07 Read physical restrictions from point groups | What does permission for polarity, IR or Raman mean? | Derive water’s 2A₁+B₁ vibrations |
| 08 From classroom to workbench | When are space groups, k little groups, and double groups needed? | Compare Γ and generic k in P4mm |

Machine-readable source:[pointgroup-lessons.json](../data/pointgroup-lessons.json). Eight stable IDs support links, progress, extensions. Copyable Unicode formulas need no external rendering service.

## Coordinates, notation and teaching scope

- Use column vectors and active spatial operations r′ = Rr; AB acts right to left. Orthogonality and det R = ±1 refer to orthonormal Cartesian bases. Fractional lattice bases also require the metric.
- Ordinary  crystallographic point group  classify 3D geometry. International −n means overbar n̄, not negative angle. Abstractly isomorphic C₂, Cₛ, Cᵢ act differently in space and remain distinct geometric types.
- Sₙ = σₕCₙ is a rotation–reflection, while n̄ = iCₙ is a rotoinversion. For a fixed axis direction, iC₄ = S₄⁻¹; correspondence of group names does not equate particular oriented operations.
- C₂v examples fix the twofold axis along z and mirrors xz,yz, with columns E,C₂(z),σ(xz),σ(yz). Then x is B₁ and y B₂; water in xz has 2A₁+B₁. Exchanging x,y gives the common 2A₁+B₂ notation without changing physical modes.
- Reduction uses complete complex  irreducible representation . Textbooks may combine one-dimensional  complex conjugation  into  real representation ; combined-row counts cannot verify “ irreducible representation  count equals classes.”
- IR assumes electric-dipole harmonic vibrations and a totally symmetric vibrational ground state; Raman assumes an ordinary nonresonant first-order process with a symmetric polarizability tensor. Selection rules identify allowed symmetry types, not real-structure mode counts, frequencies or intensities. Resonant, magnetic and higher-order processes require corresponding extensions.
- Polar point groups allow invariant polar vectors, not necessarily switchable spontaneous polarization. Spatial permission of an axial vector does not imply ferromagnetism; ordinary point groups exclude time reversal.
-  little group  condition R⁻ᵀk = k+K uses matched fractional reciprocal coordinates. Active T(t)ψ(r) = ψ(r−t) translates with exp(−2πik·t). Cross-software comparisons require active/passive and  phase convention  checks.

The lessons do not equate ordinary point-group teaching with full space-group, double-group or magnetic-corepresentation theory. They provide foundations for the existing computational modules while explaining the distinctions.

## Textbook and page verification

Mildred S. Dresselhaus, Gene Dresselhaus, Ado Jorio,*Group Theory: Application to the Physics of Condensed Matter*,1st ed., Springer Berlin Heidelberg,2008. Print ISBN978-3-540-32897-1; electronic978-3-540-32899-5;[DOI/publisher record](https://link.springer.com/book/10.1007/978-3-540-32899-5).

The reference supplied by the user is **2008_Book_GroupTheory.pdf**, containing 576 physical PDF pages. Cover, copyright, contents and blank pages around some chapters cause varying offsets between PDF and printed page numbers. The table below was checked section by section against that file rather than using a constant offset; other editions or downloaded copies may differ.

| Content | Printed book pages | Physical PDF pages (from 1) |
| --- | --- | --- |
| Group definitions/examples,§1.1–1.3 |3–6|16–19|
| Conjugation and classes, §1.6 | 9–10 | 22–23 |
| Representations and irreducible representations, §2.1–2.3 | 15–18 | 27–30 |
|  character , orthogonality/reduction,§3.1–3.5 |29–35|41–47|
| Schönflies, Hermann–Mauguin and classification, §3.9–3.11 | 44–53 | 56–65 |
| projection operator ，§4.3–4.6 | 64–67 | 75–78 |
| Tensor-product characters, §6.5 | 103 | 111 |
| selection rule ，§6.6–6.7 | 105–106 | 113–114 |
| Water vibrations,§8.4 |154–155|160–161|
| Infrared and Raman, §8.6–8.7 | 157–160 | 163–166 |
| Seitz operations, §9.1.1 | 184 | 187 |
| Translation  quotient group / space group ,§9.1.3–9.2 |188–190|191–193|
| Crystallographic restriction, Exercise 9.5 | 207–208 | 210–211 |
| k little group ，§10.3 | 214–215 | 217–218 |
| Nonsymmorphic-group representations, §10.4.2 | 220 | 223 |
| double group ，§14.2–14.3 | 341–343 | 340–342 |
| Tensor introduction/point symmetry,§18.1,§18.3 |455–456,462|452–453,459|
| C₂v character table, Appendix A, Table A.5 | 480 | 476 |

The copyright-page image on physical PDF page 4 does print electronic ISBN and DOI ending in 8; this is not an extraction error. Course references use publisher-verified ending **5**. Some book international symbols use older or orientation-specific abbreviations. Lessons/atlas use common current symbols such as mm2,m−3,m−3m, with orientations specified through operations and coordinates.

## Additional primary teaching sources

Classification of 32 geometric point-group types, seven crystal systems and 10 polar point groups was cross-checked against IUCr teaching literature: [Nespolo, Aroyo & Souvignier, “Crystallographic shelves: space-group hierarchy explained” (2018), §6–7 and Table 2](https://journals.iucr.org/j/issues/2018/05/00/in5013/index.html). Its distinctions among point groups, point-group types, crystal classes and crystal systems also explain why a cell shape alone is not a material’s complete point group.

For both point-group notations and the 32-type list, see [Dauter & Jaskolski, “How to read (and understand) Volume A of International Tables for Crystallography: an introduction for nonspecialists” (2010), Table 2](https://journals.iucr.org/j/issues/2010/05/02/kk5061/index.html). For polar versus axial tensors see [IUCr teaching notes, equations 4.8–4.11](https://www.iucr.org/__data/assets/pdf_file/0003/14790/18.pdf).

Links support further reading/verification; examples, self-tests, and local  point group  computations do not require visiting external pages.
