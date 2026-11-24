/* Original stepwise explanations; finite-dimensional complex representations unless stated. */
export const theoremProofs = {
  "rearrangement": {
    "question": "Why does multiplying every group element neither lose nor duplicate an element?",
    "prior": "Know the order of composition, the identity e and the inverse h⁻¹.",
    "claim": "For any fixed h∈G, left and right multiplication are bijections of the group. In a finite group, they therefore rearrange the complete list of elements.",
    "steps": [
      [
        "Define the map and its domain",
        "Let Lh(g)=hg. Closure guarantees that every output remains in G, so this is a map from G to itself.",
        "L_h:G\\to G,\\qquad g\\mapsto hg"
      ],
      [
        "Prove that outputs cannot repeat: injectivity",
        "If two inputs have the same output, multiply on the left by h⁻¹. Associativity and h⁻¹h=e then force the inputs to be equal.",
        "hg_1=hg_2\\ \\Longrightarrow\\ h^{-1}(hg_1)=h^{-1}(hg_2)\\ \\Longrightarrow\\ g_1=g_2"
      ],
      [
        "Prove that no output is missing: surjectivity",
        "For any desired output y, construct g=h⁻¹y. This belongs to G and multiplication by h sends it to y.",
        "g=h^{-1}y,\\qquad L_h(g)=h(h^{-1}y)=y"
      ],
      [
        "Write down the inverse map",
        "Left multiplication by h followed by h⁻¹ restores every input, in either order. Right multiplication similarly has multiplication by h⁻¹ on the right as its inverse.",
        "L_{h^{-1}}L_h=L_hL_{h^{-1}}=I,\\qquad R_h(g)=gh"
      ],
      [
        "Deduce invariance of a group average",
        "The finite sum visits exactly the same elements after replacing g by hg or gh. This is the step used later in unitarization and orthogonality.",
        "\\sum_{g\\in G}f(g)=\\sum_{g\\in G}f(hg)=\\sum_{g\\in G}f(gh)"
      ]
    ],
    "application": "In the S₃ experiment below, choose h=(12). Six different inputs give six different outputs. Predict which input produces e, then switch to right multiplication. The order generally changes, but both lists contain all six elements.",
    "caution": "An arbitrary list of six actions need not be a group. Without closure or inverses, this argument does not apply. Rearrangement also does not imply hg=gh.",
    "challenge": "Why is proving that every output remains in G insufficient?",
    "answer": "Closure only rules out leaving the set; it does not rule out repeated outputs. Inverses let us cancel h, establishing the injectivity and surjectivity needed for a complete rearrangement."
  },
  "conjugacy": {
    "question": "Why does the character stay the same when an operation is viewed in a different reference?",
    "prior": "Composition acts from right to left: hgh⁻¹ returns to the old reference, applies g, then moves to the new reference.",
    "claim": "Conjugacy partitions a group into disjoint classes. The character of a representation is constant on each class, so information can be organized by class instead of element.",
    "steps": [
      [
        "Read the three successive actions",
        "First h⁻¹ returns to the old reference, then g performs the action, and finally h restores the new reference. The axis or the permuted labels generally change.",
        "g'=hgh^{-1}"
      ],
      [
        "Prove that conjugacy is an equivalence relation",
        "The identity gives reflexivity; replacing h by h⁻¹ gives symmetry; combining two changes of reference into kh gives transitivity. Each element therefore belongs to exactly one class.",
        "g=ege^{-1},\\quad g=h^{-1}g'h,\\quad k(hgh^{-1})k^{-1}=(kh)g(kh)^{-1}"
      ],
      [
        "Construct a class directly in S₃",
        "Starting from (12), varying h produces (12), (23) and (13), but never a three-cycle. The identity forms one class, and the two three-cycles form another.",
        "S_3=\\{e\\}\\ \\cup\\ \\{(12),(23),(13)\\}\\ \\cup\\ \\{(123),(132)\\}"
      ],
      [
        "Translate conjugation into a similarity transformation",
        "The representation law and D(h⁻¹)=D(h)⁻¹ give similar matrices. Similarity does not mean that all their entries coincide.",
        "D(hgh^{-1})=D(h)D(g)D(h)^{-1}"
      ],
      [
        "Explain why the sum of diagonal entries agrees",
        "Cyclic invariance of the trace moves D(h) to the end, where it cancels its inverse. The character is therefore a class function, even for a reducible representation.",
        "\\chi(hgh^{-1})=\\operatorname{Tr}[D(h)D(g)D(h)^{-1}]=\\operatorname{Tr}D(g)"
      ],
      [
        "Derive the class size",
        "Two choices of h give the same conjugate precisely when they differ by an element commuting with g. Grouping the choices by the centralizer yields the counting formula.",
        "|\\operatorname{Cl}(g)|=\\frac{|G|}{|C_G(g)|},\\qquad C_G(g)=\\{h:hg=gh\\}"
      ]
    ],
    "application": "Choose a transposition for g, then vary h below. The nonzero matrix entries move, but the trace remains 1. For a three-cycle the trace is 0. Thus the class characters (3,1,0) of the three-dimensional permutation representation come from actual matrices.",
    "caution": "Elements of equal order need not be conjugate in a general group. A conjugacy class need not be a subgroup; it usually does not contain the identity.",
    "challenge": "Why is the transposition term multiplied by 3 in the reduction formula?",
    "answer": "The three transpositions belong to one class and have equal characters. Combining the six element terms into three class terms counts that class three times."
  },
  "normal": {
    "question": "When can an entire subgroup be treated as a new identity?",
    "prior": "The left coset gH consists of all elements of H multiplied by g on the left. A coset is a set, not one element.",
    "claim": "H is normal precisely when gHg⁻¹=H for every g. Only then does multiplication of cosets give an answer independent of the representatives, defining the quotient group G/H.",
    "steps": [
      [
        "Distinguish a subgroup from a normal subgroup",
        "A subgroup is a group under its own inherited multiplication. Normality additionally requires conjugation by every element of the full group to preserve the whole subgroup.",
        "H\\triangleleft G\\quad\\Longleftrightarrow\\quad gHg^{-1}=H\\quad\\text{for every }g\\in G"
      ],
      [
        "Relate conjugation invariance to equal left and right cosets",
        "Multiply gHg⁻¹=H on the right by g to obtain gH=Hg. Multiplication by g⁻¹ reverses the argument, so the conditions are equivalent.",
        "gHg^{-1}=H\\quad\\Longleftrightarrow\\quad gH=Hg"
      ],
      [
        "Propose multiplication for the new objects",
        "A natural definition multiplies representatives a and b, then takes their coset. Since each coset has many representatives, independence of that choice must be proved.",
        "(aH)(bH)=(ab)H"
      ],
      [
        "Check alternative representatives explicitly",
        "Write a′=ah₁ and b′=bh₂. Moving h₁ past b introduces a conjugation. Normality keeps that conjugate in H, so the product still lies in abH.",
        "a'b'=ah_1bh_2=ab(b^{-1}h_1b)h_2\\in abH"
      ],
      [
        "Verify identity, inverse and associativity",
        "The new identity is H, the inverse of aH is a⁻¹H, and associativity is inherited from G. Normality was needed to make the multiplication well defined before these axioms could be inherited.",
        "H(aH)=aH,\\qquad (aH)(a^{-1}H)=H"
      ],
      [
        "Compare two subgroups",
        "A₃ contains e and the two three-cycles and is preserved by conjugation; S₃/A₃ has two elements. The subgroup containing only e and (12) is conjugated into a different subgroup.",
        "(23)(12)(23)^{-1}=(13)\\notin\\{e,(12)\\}"
      ]
    ],
    "application": "Choose A₃ to obtain the multiplication table of a two-element quotient. Then choose the order-two subgroup and h=(23); its conjugate changes. The resulting coset labels cannot simply be treated as a quotient group.",
    "caution": "Checking only h=e gives no information, because every subgroup passes. Normality concerns every h and does not require every element of H to commute with the full group.",
    "challenge": "How does a normal subgroup differ from the center?",
    "answer": "A central element stays individually fixed under every conjugation. A normal subgroup only stays fixed as a set; its members may be permuted within that set."
  },
  "irreducible": {
    "question": "What exactly must fail to split simultaneously?",
    "prior": "A matrix representation satisfies D(gh)=D(g)D(h). An invariant subspace is the same subspace preserved by every g.",
    "claim": "A complex irreducible representation has no common invariant subspace other than zero and the whole space. A finite-group representation can be decomposed into irreducible blocks using an invariant inner product.",
    "steps": [
      [
        "Define invariance using vectors, not one matrix",
        "Every vector of W must remain in W under every group operation. A direction preserved by just one operation is insufficient.",
        "D(g)W\\subseteq W\\quad\\text{for every }g\\in G"
      ],
      [
        "Find an invariant direction for three vertices",
        "Permutation matrices only reorder components, so a vector with equal components is fixed. It spans the one-dimensional A₁ subspace.",
        "s=\\frac1{\\sqrt3}(1,1,1)^T,\\qquad D(g)s=s"
      ],
      [
        "Construct the two-dimensional orthogonal complement",
        "Vectors whose components sum to zero form a plane. Permutations preserve the sum, so the plane is invariant. Choose normalized orthogonal vectors u and v.",
        "u=\\frac1{\\sqrt6}(2,-1,-1)^T,\\qquad v=\\frac1{\\sqrt2}(0,1,-1)^T"
      ],
      [
        "Turn common invariant spaces into matrix blocks",
        "Use s,u,v as the columns of an orthogonal basis matrix B. Every D(g) splits simultaneously into a one-dimensional block and a two-dimensional block, instead of diagonalizing just one chosen matrix.",
        "B=(s,u,v),\\qquad B^\\dagger D(g)B=1\\oplus D^E(g)"
      ],
      [
        "Explain why an invariant complement exists in general",
        "Group averaging gives an invariant inner product. If w is orthogonal to W, then ⟨D(g)w,v⟩=⟨w,D(g⁻¹)v⟩=0. Its orthogonal complement is therefore invariant too, and repeated splitting yields irreducible blocks.",
        "V=\\bigoplus_\\alpha m_\\alpha V_\\alpha"
      ],
      [
        "Introduce a computable criterion afterward",
        "Orthogonality gives the character self-inner-product as a sum of squared multiplicities. For a nonzero representation it equals 1 exactly when one irreducible block occurs once.",
        "\\langle\\chi,\\chi\\rangle=\\frac1{|G|}\\sum_g|\\chi(g)|^2=\\sum_\\alpha m_\\alpha^2"
      ]
    ],
    "application": "For the three-vertex representation, (3,1,0) gives self-inner-product (9+3)/6=2 and A₁⊕E. Switching to E gives (4+2)/6=1. Change the selected operation and observe how directions within the E plane mix.",
    "caution": "Complex irreducibility is the domain condition here. Real irreducibility and real versions of Schur's lemma require separate discussion. Eigenvectors of one matrix do not establish common invariant subspaces of the group.",
    "challenge": "A reflection-type matrix in E has two eigenlines. Why are these not two one-dimensional representations?",
    "answer": "They must also be invariant under the other generator. A three-cycle rotates these lines into other directions, so they are not common invariant subspaces."
  },
  "schur": {
    "question": "Why does full symmetry force an operator to be constant within an irreducible block?",
    "prior": "An intertwiner A:Vα→Vβ satisfies A Dα(g)=Dβ(g) A. Representations are finite-dimensional and complex.",
    "claim": "An intertwiner between inequivalent irreducible representations is zero. A self-intertwiner of a complex irreducible representation is λI.",
    "steps": [
      [
        "Show that the kernel is invariant",
        "If Av=0, then A Dα(g)v=Dβ(g)Av=0. Hence ker A is an invariant subspace of Vα.",
        "v\\in\\ker A\\ \\Longrightarrow\\ D^\\alpha(g)v\\in\\ker A"
      ],
      [
        "Show that the image is invariant",
        "If w=Av, then Dβ(g)w=A Dα(g)v remains in the image. Irreducibility therefore constrains both kernel and image.",
        "D^\\beta(g)\\operatorname{im}A\\subseteq\\operatorname{im}A"
      ],
      [
        "A nonzero intertwiner must be invertible",
        "A nonzero image must be all of Vβ, and the kernel must be zero. Thus A is an equivalence isomorphism. For inequivalent representations, only A=0 remains.",
        "A\\ne0\\quad\\Longrightarrow\\quad D^\\beta(g)=A D^\\alpha(g)A^{-1}"
      ],
      [
        "Use existence of an eigenvalue over the complex field",
        "Choose an eigenvalue λ of a self-intertwiner M. The operator M−λI still intertwines and has a nonzero kernel. If it were nonzero, the preceding argument would make it invertible, a contradiction.",
        "\\ker(M-\\lambda I)\\ne0\\quad\\Longrightarrow\\quad M-\\lambda I=0"
      ],
      [
        "State the restriction within one block",
        "Therefore M=λI. This does not require one common parameter across an entire physical Hilbert space; the statement concerns a single irreducible representation.",
        "[M,D(g)]=0\\ \\forall g,\\quad V\\ \\text{irreducible over }\\mathbb C\\quad\\Longrightarrow\\quad M=\\lambda I"
      ],
      [
        "Separate reducible spaces from repeated equivalent copies",
        "For A₁⊕E, two constants a and b are allowed. If one irreducible representation occurs m times, a symmetric operator may mix the copies in the m-dimensional multiplicity space.",
        "M=aP_{A_1}+bP_E,\\qquad M_{\\rm isotypic}=I_d\\otimes K_m"
      ]
    ],
    "application": "Vary a and b in the three-dimensional permutation space. Even when a≠b, M commutes with the whole group because it is constant separately on A₁ and E. In a single E block, all directions share the same a.",
    "caution": "Schur's lemma requires intertwining for the full group. Commuting with one rotation matrix is insufficient. Antiunitary symmetries and real representations require additional structure.",
    "challenge": "Why can a symmetric Hamiltonian still have several energy levels?",
    "answer": "The full state space is usually reducible. Different irreducible blocks and repeated copies can have different energies. Schur's lemma constrains the interior of each irreducible block."
  },
  "unitarity": {
    "question": "If the original matrices do not preserve length, how can they become unitary?",
    "prior": "Each D(g) is invertible, but its coordinate basis need not be orthogonal. † denotes the conjugate transpose.",
    "claim": "Every finite-dimensional complex representation of a finite group admits a positive invariant inner product and is therefore equivalent to a unitary representation.",
    "steps": [
      [
        "Average the transformed lengths",
        "Starting with an ordinary inner product, sum the inner products after every group operation. The resulting metric matrix is M.",
        "M=\\frac1{|G|}\\sum_gD(g)^\\dagger D(g)"
      ],
      [
        "Prove that M is positive definite",
        "M is Hermitian. For nonzero v, every invertible D(g) sends v to a nonzero vector, so the sum of squared lengths is strictly positive.",
        "v^\\dagger Mv=\\frac1{|G|}\\sum_g\\|D(g)v\\|^2>0"
      ],
      [
        "Use rearrangement to prove invariance",
        "Each term of D(h)†MD(h) is D(gh)†D(gh). As g runs through G, so does gh; the sum is unchanged.",
        "D(h)^\\dagger MD(h)=\\frac1{|G|}\\sum_gD(gh)^\\dagger D(gh)=M"
      ],
      [
        "Convert the metric to ordinary length",
        "Positive M has a factorization C†C. In coordinates y=Cv, the new inner product is ordinary y†y. C itself generally is not unitary.",
        "M=C^\\dagger C,\\qquad y=Cv"
      ],
      [
        "Verify unitarity after the common basis change",
        "Set U(g)=C D(g) C⁻¹ and insert the metric identity. The C factors cancel and yield U†U=I.",
        "U(g)^\\dagger U(g)=(C^{-1})^\\dagger D(g)^\\dagger M D(g)C^{-1}=I"
      ],
      [
        "Connect the result to complete reducibility",
        "An invariant inner product makes the orthogonal complement of an invariant subspace invariant. This enables decomposition into irreducibles. The circle and ellipse below describe the metric of one representation in different coordinates.",
        "D(g)W\\subseteq W\\quad\\Longrightarrow\\quad D(g)W^\\perp\\subseteq W^\\perp"
      ]
    ],
    "application": "Increase shear or scale: the original coordinate matrices increasingly fail to preserve ordinary Euclidean length. Both the averaged metric and the metric inherited from the original basis change restore an invariant inner product. Compare the actual matrices before and after changing basis.",
    "caution": "Equivalent to unitary does not mean the original matrices are already unitary. Finiteness is essential to this finite-sum proof; infinite groups need a suitable invariant measure and additional conditions.",
    "challenge": "Why not orthogonalize each matrix separately?",
    "answer": "Separate orthogonalization generally destroys D(gh)=D(g)D(h). Using the same C in a simultaneous similarity transformation preserves the multiplication law."
  },
  "orthogonality": {
    "question": "Why does summing matrix elements leave only Kronecker deltas?",
    "prior": "Use unitary irreducible representations and Schur's lemma. α and β label inequivalent types; i,j,k,l label entries.",
    "claim": "Different matrix entries of standard unitary irreducible representations are orthogonal as functions on the group. The squared norm of one entry is |G|/d.",
    "steps": [
      [
        "Construct an average that automatically intertwines",
        "For any matrix A:Vα→Vβ, define Φ(A). Sum A transformed into every group-related reference.",
        "\\Phi(A)=\\sum_gD^\\beta(g)A D^\\alpha(g)^\\dagger"
      ],
      [
        "Prove that the average is an intertwiner",
        "Multiply Φ on the left by Dβ(h) and on the right by Dα(h)†. This replaces g by hg in the sum. Rearrangement leaves the sum invariant, which is the intertwining relation.",
        "D^\\beta(h)\\Phi(A)D^\\alpha(h)^\\dagger=\\Phi(A)"
      ],
      [
        "Handle inequivalent representations",
        "For α≠β, Schur's lemma gives Φ(A)=0. Orthogonality first reflects the absence of nonzero intertwiners between inequivalent irreducibles.",
        "\\alpha\\ne\\beta\\quad\\Longrightarrow\\quad\\Phi(A)=0"
      ],
      [
        "Handle the same irreducible representation",
        "For α=β, Φ(A)=cI. By unitarity, each term has trace Tr A. Taking the trace determines c and the normalization factor.",
        "dc=\\operatorname{Tr}\\Phi(A)=|G|\\operatorname{Tr}A,\\qquad c=\\frac{|G|}{d}\\operatorname{Tr}A"
      ],
      [
        "Select entries using a matrix unit",
        "Choose A=E_lj, with trace δ_lj. The (k,i) entry of Φ then extracts exactly the four-index summation formula.",
        "\\sum_gD^\\alpha_{ij}(g)^*D^\\beta_{kl}(g)=\\frac{|G|}{d_\\alpha}\\delta_{\\alpha\\beta}\\delta_{ik}\\delta_{jl}"
      ],
      [
        "Pass from matrix-entry to character orthogonality",
        "Sum both diagonal indices. Only matching representation types and indices contribute. Dividing by the group order gives character inner product 1 or 0.",
        "\\frac1{|G|}\\sum_g\\chi_\\alpha(g)^*\\chi_\\beta(g)=\\delta_{\\alpha\\beta}"
      ]
    ],
    "application": "Set α=β=E with i=k and j=l. The six terms below sum to 6/2=3. Change one index and positive and negative terms cancel to zero. With inequivalent types, the answer is zero even for matching indices. Inspect the terms rather than only their total.",
    "caution": "The entry formula requires the declared unitary standard basis. It cannot be applied unchanged after an arbitrary nonunitary similarity transformation; characters themselves remain similarity-invariant.",
    "challenge": "Why is there no remaining 1/d in character orthogonality?",
    "answer": "Summing diagonal indices leaves d matching terms, each contributing |G|/d. Their product is |G|."
  },
  "reduction": {
    "question": "How does a list of traces reveal how often each irreducible block occurs?",
    "prior": "Characters can be organized by conjugacy class, and irreducible characters are orthogonal. Multiplicity mα differs from dimension dα.",
    "claim": "A reducible character is a nonnegative integer combination of irreducible characters. Its inner product with one irreducible character extracts the multiplicity of that type.",
    "steps": [
      [
        "Take the trace of a block decomposition",
        "The trace of a direct sum is the sum of block traces. If a type occurs m times, its character contributes m times.",
        "\\chi(g)=\\sum_\\alpha m_\\alpha\\chi_\\alpha(g)"
      ],
      [
        "Take the inner product with the desired row",
        "Multiply by the conjugate of χα and sum over the group. Orthogonality eliminates every other type, leaving its multiplicity.",
        "m_\\alpha=\\langle\\chi_\\alpha,\\chi\\rangle=\\frac1{|G|}\\sum_g\\chi_\\alpha(g)^*\\chi(g)"
      ],
      [
        "Combine element sums into class sums",
        "Characters are constant within a class, so each class term is weighted by its size nc. Here the order is identity, transpositions, three-cycles, with sizes 1,3,2.",
        "m_\\alpha=\\frac16\\left[\\chi_\\alpha(e)^*\\chi(e)+3\\chi_\\alpha(t)^*\\chi(t)+2\\chi_\\alpha(c)^*\\chi(c)\\right]"
      ],
      [
        "Reduce the three-vertex representation explicitly",
        "The rows are A₁=(1,1,1), A₂=(1,−1,1) and E=(2,0,−1). Substituting (3,1,0) term by term gives multiplicities 1,0,1.",
        "m_{A_1}=(3+3+0)/6=1,\\quad m_{A_2}=(3-3+0)/6=0,\\quad m_E=(6+0+0)/6=1"
      ],
      [
        "Check the dimension at the identity",
        "Since Dα(e)=I_dα, χα(e)=dα. Dimensions before and after reduction must agree, but that alone does not establish valid multiplicities.",
        "\\chi(e)=\\sum_\\alpha m_\\alpha d_\\alpha=1\\cdot1+1\\cdot2=3"
      ],
      [
        "Derive the squared-dimension sum from the regular representation",
        "Its character is (|G|,0,…), giving multiplicity dα for each irreducible. Substitution into the total dimension yields the squared-dimension sum.",
        "m_\\alpha^{\\rm reg}=d_\\alpha,\\qquad\\sum_\\alpha d_\\alpha^2=|G|,\\qquad 1^2+1^2+2^2=6"
      ]
    ],
    "application": "Compare the three-vertex and regular representations below to distinguish multiplicity from dimension. Then enter a proposed character. Negative or noninteger multiplicities rule it out as the character of an actual representation.",
    "caution": "A class sum includes the class size once; an element sum lists every element once. Do not combine these two conventions or accept a row merely because χ(e) is an integer.",
    "challenge": "Could the three irreducible dimensions be 1,1,4?",
    "answer": "No. For the order-six group S₃, their squares must sum to 6, whereas 1+1+16=18. The dimensions are 1,1,2. The number of irreducible types also equals the three conjugacy classes."
  },
  "degeneracy": {
    "question": "When does a representation dimension actually determine an energy degeneracy?",
    "prior": "H is Hermitian and commutes with every unitary group operation. Distinguish the full state space from one energy eigenspace.",
    "claim": "Symmetry protects a multiplet of dimension d. Repeated copies and accidental coincidences can increase total degeneracy; the dimension of a reducible state space does not automatically give a single energy degeneracy.",
    "steps": [
      [
        "Show that an energy eigenspace is invariant",
        "If Hv=Ev, then H D(g)v=D(g)Hv=E D(g)v. Group operations therefore keep a state within its energy eigenspace.",
        "[H,D(g)]=0,\\quad Hv=Ev\\quad\\Longrightarrow\\quad H D(g)v=E D(g)v"
      ],
      [
        "Apply Schur's lemma to one irreducible block",
        "For an irreducible subspace occurring once, the symmetric Hamiltonian is EαI. Its dα independent basis states consequently share one energy.",
        "H|_{V_\\alpha}=E_\\alpha I_{d_\\alpha}"
      ],
      [
        "Allow repeated equivalent copies",
        "If Vα occurs mα times, symmetry permits mixing within the multiplicity space but does not distinguish the dα partners within each copy.",
        "V=\\bigoplus_\\alpha(V_\\alpha\\otimes\\mathbb C^{m_\\alpha}),\\qquad H=\\bigoplus_\\alpha(I_{d_\\alpha}\\otimes K_\\alpha)"
      ],
      [
        "Diagonalize the multiplicity space first",
        "Different eigenvalues of Kα may differ in energy. Each still carries dα partners; the result need not be one mαdα-fold level.",
        "K_\\alpha w_r=E_{\\alpha r}w_r\\quad\\Longrightarrow\\quad E_{\\alpha r}\\text{ has at least }d_\\alpha\\text{ partners}"
      ],
      [
        "Separate protection from coincidence in A₁ plus E",
        "H=aP_A₁+bP_E gives a singlet at a and a doublet at b. Tuning a=b creates a threefold coincidence, not a three-dimensional irreducible representation.",
        "H=aP_{A_1}+bP_E,\\qquad E_{A_1}=a,\\quad E_E=b\\ (2\\text{-fold})"
      ],
      [
        "Use a perturbation to identify the protecting condition",
        "Adding εuu† generally breaks full S₃ symmetry and separates the E partners to b+ε and b. Only perturbations preserving the original group must retain its protected partners.",
        "H'=aP_{A_1}+bP_E+\\epsilon uu^\\dagger,\\qquad E_u=b+\\epsilon,\\quad E_v=b"
      ]
    ],
    "application": "With ε=0, vary a and b and observe that the E partners remain degenerate. Tune a=b to create an accidental threefold coincidence, then introduce ε. Explain the splitting through the changed symmetry condition rather than treating all equal energies alike.",
    "caution": "This argument concerns unitary representations. Kramers degeneracy follows from antiunitary time reversal with T²=−1 and requires the conditions explained in the time-reversal unit.",
    "challenge": "Can a four-dimensional space have two distinct energies, each doubly degenerate?",
    "answer": "Yes. Two copies of one two-dimensional irreducible representation have a two-dimensional multiplicity space. Two distinct eigenvalues of its Hermitian matrix each retain two partners."
  }
};

export function theoremProofHTML(id,math,esc){
 const p=theoremProofs[id];if(!p)return '';
 return "<section class=\"gt-proof\" aria-labelledby=\"gt-proof-title\"><p class=\"gt-proof-prior\">Prerequisites: "+esc(p.prior)+'</p><h3 id="gt-proof-title">'+esc(p.question)+"</h3><p><strong>Claim: </strong>"+esc(p.claim)+"</p><h4>Step-by-step proof</h4><ol>"+p.steps.map(([title,why,formula])=>'<li><strong>'+esc(title)+'</strong><p>'+esc(why)+'</p>'+(formula?'<div class="gt-proof-formula">'+math(formula)+'</div>':'')+'</li>').join('')+"</ol><div class=\"gt-proof-application\"><h4>Test the reasoning with the experiment below</h4><p>"+esc(p.application)+'</p></div><p class="gt-proof-caution">'+esc(p.caution)+'</p><details><summary>'+esc(p.challenge)+'</summary><p>'+esc(p.answer)+'</p></details></section>';
}
