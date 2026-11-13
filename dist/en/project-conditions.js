// Display metadata is derived from the registered controls and project inputs.
// It does not relax stage acceptance or change any captured input or result.
const descriptors = {
  "manybody_spectra_lab": {
    "experiment": {
      "label": "Experiment Type",
      "options": [
        [
          "single_particle",
          "Single-particle addition/removal spectrum"
        ],
        [
          "response",
          "Connected response at fixed particle number"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "sites": {
      "label": "Number of sites L",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "nUp": {
      "label": "Up-spin electron count N↑ (at most L)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "nDown": {
      "label": "Spin-down electron count N↓ (at most L)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "boundary": {
      "label": "boundary conditions",
      "options": [
        [
          "open",
          "open chain"
        ],
        [
          "periodic",
          "Periodic closure; two sites have only one bond"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "hopping": {
      "label": "Hopping t (eV)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "interactionU": {
      "label": "Onsite repulsion U (eV)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "alternatingPotential": {
      "label": "staggered potential energy Δ (eV; site 0 is +Δ/2)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "probe": {
      "label": "Probe spatial shape",
      "options": [
        [
          "local",
          "Selected local site"
        ],
        [
          "momentum",
          "Normalized finite chain Fourier probe"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "site": {
      "label": "local probe site (starts from 0; does not exceed L−1)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "q": {
      "label": "Fourier probe q a/π (ignored for local probe)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "spin": {
      "label": "Spin of single particle probe",
      "options": [
        [
          "up",
          "Spin up"
        ],
        [
          "down",
          "spin down"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "chemicalPotential": {
      "label": "spectrum energy zero point μ (eV; does not change the number of particles)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "responseKind": {
      "label": "Connected-response operator",
      "options": [
        [
          "spin",
          "Longitudinal spin (z component)"
        ],
        [
          "charge",
          "charge density n"
        ]
      ],
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "eta": {
      "label": "Lorentz half-width at half-maximum η (eV)",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    },
    "points": {
      "label": "Number of spectral sampling points",
      "source": "dist/data/bridges-materials.json#manybody.fields"
    }
  },
  "polaron_lab": {
    "hopping": {
      "label": "Electron hopping t (eV)",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "phononEnergy": {
      "label": "phonon Quantum energy ℏω（eV）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "coupling": {
      "label": "local coupling g (eV)",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "siteBias": {
      "label": "Potential energy difference Δ=ε₀−ε₁（eV）",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "cutoff": {
      "label": "Maximum phonon number per oscillator",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "scanMaxCoupling": {
      "label": "Upper limit of g scan (eV)",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    },
    "scanPoints": {
      "label": "Scan points (1 means only the current g)",
      "source": "dist/data/bridges-materials.json#polaron.fields"
    }
  },
  "density_matrix_lab": {
    "experiment": {
      "label": "System size",
      "options": [
        [
          "single",
          "single spin: Rabi and decoherence"
        ],
        [
          "pair",
          "Two spins: exchange and entanglement"
        ]
      ],
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "initialState": {
      "label": "initial state (antiparallel, singlet, classical mixing only for double spins)",
      "options": [
        [
          "plus_z",
          "↑ / ↑↑"
        ],
        [
          "minus_z",
          "↓ / ↓↓"
        ],
        [
          "plus_x",
          "+x / +x⊗+x"
        ],
        [
          "antiparallel",
          "Two spins ↑↓"
        ],
        [
          "singlet",
          "double spin singlet state"
        ],
        [
          "classical",
          "Two-spin classical equal mixture of ↑↓ and ↓↑"
        ],
        [
          "thermal",
          "Thermal initial state of the current Hamiltonian"
        ]
      ],
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "drive": {
      "label": "drive Ω (rad/ns)",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "detuning": {
      "label": "detuning Δ (rad/ns)",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "exchange": {
      "label": "Exchange J (rad/ns; H/ℏ contains J S_A·S_B)",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "gradient": {
      "label": "local detuning difference δ (rad/ns; A−B)",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "gamma1": {
      "label": "↑→↓ Relaxation rate γ₁（ns⁻¹）",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "gammaPhi": {
      "label": "Pure-dephasing rate γ_φ (ns⁻¹)",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "thermalScale": {
      "label": "Thermal initial state kBT/ℏ（rad/ns; only used in the thermal initial state)",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "duration": {
      "label": "total evolution time (ns)",
      "source": "dist/data/bridges-materials.json#density.fields"
    },
    "points": {
      "label": "Number of time samples",
      "source": "dist/data/bridges-materials.json#density.fields"
    }
  },
  "symmetry_workshop": {
    "pointGroup": {
      "label": "Initial generator",
      "options": [
        [
          "c2v",
          "C₂ᵥ"
        ],
        [
          "c3v",
          "C₃ᵥ"
        ],
        [
          "c4v",
          "C₄ᵥ"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "rotation": {
      "label": "preserves rotation around z-axis",
      "options": [
        [
          1,
          "enable"
        ],
        [
          0,
          "Off"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "mirror": {
      "label": "Retain the xz mirror",
      "options": [
        [
          1,
          "enable"
        ],
        [
          0,
          "Off"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "inversion": {
      "label": "additionally applies inversion",
      "options": [
        [
          1,
          "enable"
        ],
        [
          0,
          "Off"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "timeReversal": {
      "label": "Preserve time reversal",
      "options": [
        [
          1,
          "enable"
        ],
        [
          0,
          "Off"
        ]
      ],
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "rashba": {
      "label": "Rashba type coefficient α (reduced k-coordinate; energy eV)",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "dresselhaus": {
      "label": "Input anisotropy coefficient β (reduced k coordinate; energy eV)",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "mass": {
      "label": "Input constant σ_z term m (reduced k coordinates; energy in eV)",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "fieldX": {
      "label": "input σ_x constant term b_x（ reduced k coordinate; energy eV)",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    },
    "curvature": {
      "label": "Input isotropic curvature c (reduced k coordinate; energy eV)",
      "source": "dist/data/bridges-materials.json#workshop.fields"
    }
  },
  "statistics_lab": {
    "mode": {
      "label": "particle space",
      "options": [
        [
          "two",
          "Two electrons: orbital × spin"
        ],
        [
          "three",
          "S₃: three two-level factors"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    },
    "orbital": {
      "label": "two-electron orbital state",
      "options": [
        [
          "same",
          "Same orbital aa"
        ],
        [
          "symmetric",
          "(ab + ba) / √2"
        ],
        [
          "antisymmetric",
          "(ab − ba) / √2"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    },
    "spin": {
      "label": "two electron spin state",
      "options": [
        [
          "singlet",
          "singlet state"
        ],
        [
          "triplet0",
          "Triplet m=0"
        ],
        [
          "upup",
          "Triplet m=1"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    },
    "swap": {
      "label": "S₃ exchange operation",
      "options": [
        [
          "12",
          "Swap 1 and 2"
        ],
        [
          "23",
          "swap 2 with 3"
        ],
        [
          "13",
          "Swap 1 and 3"
        ]
      ],
      "source": "dist/data/connections-materials.json#statistics.fields"
    }
  },
  "defects_lab": {
    "model": {
      "label": "order parameter space",
      "options": [
        [
          "xy",
          "XY: Plane vector S¹"
        ],
        [
          "nematic",
          "Planar nematic: RP¹"
        ],
        [
          "ising",
          "Ising: two discrete vacua"
        ]
      ],
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "texture": {
      "label": "XY / Nematic texture",
      "options": [
        [
          "pair",
          "vortex-antivortex pair"
        ],
        [
          "single",
          "single vortex"
        ]
      ],
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "separation": {
      "label": "core spacing d",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "loopX": {
      "label": "Loop Center x / domain wall Center",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "loopY": {
      "label": "loop center y",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "radius": {
      "label": "Loop radius / domain wall width",
      "source": "dist/data/connections-materials.json#defects.fields"
    },
    "phase": {
      "label": "Overall rotation angle (degrees)",
      "source": "dist/data/connections-materials.json#defects.fields"
    }
  },
  "reciprocity_lab": {
    "model": {
      "label": "response variable",
      "options": [
        [
          "hall",
          "Two-dimensional electrical response / Hall"
        ],
        [
          "thermo",
          "Charge-Energy: Two Even Variables"
        ],
        [
          "mixed",
          "Abstract channel: one even and one odd"
        ]
      ],
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "space": {
      "label": "Hall's spatial operations",
      "options": [
        [
          "c1",
          "Identity operation"
        ],
        [
          "c4",
          "Fourfold rotation"
        ],
        [
          "mirror",
          "Mirror: transform axial vectors Bz and Mz together"
        ]
      ],
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "a": {
      "label": "Diagonal response a",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "b": {
      "label": "diagonal response b",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "cross": {
      "label": "symmetric coupling coefficient c",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "odd": {
      "label": "Antisymmetric coupling coefficient d",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "field": {
      "label": "External magnetic field B (dimensionless)",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "magnetization": {
      "label": "Magnetization M (dimensionless)",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "reverseM": {
      "label": "Also reverse M in the comparison experiment",
      "options": [
        [
          "yes",
          "Yes: reverse B and M"
        ],
        [
          "no",
          "No: only reverse B"
        ]
      ],
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "violation": {
      "label": "Deliberate reciprocity-breaking term δ",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "forceX": {
      "label": "conjugate force X₁",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    },
    "forceY": {
      "label": "conjugate force X₂",
      "source": "dist/data/connections-materials.json#reciprocity.fields"
    }
  },
  "salc_lab": {
    "copies": {
      "label": "Number of equivalent four-orbital copies",
      "options": [
        [
          1,
          "1 copy: four dimensions"
        ],
        [
          2,
          "2 sets: eight dimensions, with repeated irreducible representations"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "targetIrrep": {
      "label": "Projection and subspace assignment target",
      "options": [
        [
          "A1",
          "A₁: totally symmetric"
        ],
        [
          "B1",
          "B₁: x²−y² type"
        ],
        [
          "E",
          "E: 2D Partner"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "seedSite": {
      "label": "Seed orbital in copy 1",
      "options": [
        [
          0,
          "Site 1: +x"
        ],
        [
          1,
          "Site 2: +y"
        ],
        [
          2,
          "Site 3: −x"
        ],
        [
          3,
          "Site 4: −y"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "operatorType": {
      "label": "actual operator type",
      "options": [
        [
          "dipole",
          "E: In-plane polar vector dipole"
        ],
        [
          "scalar",
          "A₁: identity operator"
        ],
        [
          "quadrupole",
          "B₁：X²−Y²"
        ],
        [
          "axial",
          "A₂: Circulation type Hermitian operator"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "polarizationAngle": {
      "label": "linear polarization angle θ (degrees, only acts on dipole)",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "operatorScale": {
      "label": "operator amplitude (relative unit)",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "hop": {
      "label": "Nearest-neighbor hopping t (relative units)",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "crossHop": {
      "label": "Same-site hopping between copies (two-copy model only)",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "copyOffset": {
      "label": "Second copy energy offset (only two copies)",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "anisotropy": {
      "label": "B₁ type disturbance amplitude δ (added after group average)",
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "retainC4": {
      "label": "Preserve the fourfold-rotation constraint",
      "options": [
        [
          1,
          "Retain C₄z"
        ],
        [
          0,
          "Remove C₄z constraint"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    },
    "retainMirror": {
      "label": "Preserve the xz-mirror constraint",
      "options": [
        [
          1,
          "Retain the xz mirror"
        ],
        [
          0,
          "Remove xz mirror constraints"
        ]
      ],
      "source": "dist/data/construction-materials.json#salc.fields"
    }
  },
  "wavevector_lab": {
    "period": {
      "label": "Declared supercell N×N",
      "options": [
        [
          2,
          "2×2：4 sites"
        ],
        [
          3,
          "3×3：9 sites"
        ],
        [
          4,
          "4×4: 16 sites"
        ]
      ],
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "qx": {
      "label": "q_x numerator (q_x / N)",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "qy": {
      "label": "q_y numerator (q_y / N)",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "pattern": {
      "label": "activated conjugate pair",
      "options": [
        [
          "single",
          "Single pair: input q and −q"
        ],
        [
          "multi",
          "Multiple pairs: all conjugate pairs in the full star"
        ]
      ],
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "amplitude": {
      "label": "first pair amplitude A (dimensionless)",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "transverseRatio": {
      "label": "Other conjugate pairs/first pair amplitude",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "phaseDegrees": {
      "label": "First-pair phase φ (degrees)",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    },
    "relativePhaseDegrees": {
      "label": "Other conjugate pairs relative phase/degree",
      "source": "dist/data/construction-materials.json#wavevector.fields"
    }
  },
  "nonsymmorphic_lab": {
    "operation": {
      "label": "Three-dimensional space operation",
      "options": [
        [
          "glide",
          "Glide: y-normal mirror + aₓ/2 translation"
        ],
        [
          "screw",
          "Twofold screw: 180° rotation about x plus aₓ/2 translation"
        ]
      ],
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "spinful": {
      "label": "Single- or double-valued representation",
      "options": [
        [
          "true",
          "Spin 1/2: four-band double-valued model"
        ],
        [
          "false",
          "Spinless: two-band single-valued model"
        ]
      ],
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "hopping": {
      "label": "Hopping t (arbitrary energy units)",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "spinOrbit": {
      "label": "Double-valued coupling λ (ignored by single-valued model)",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "mass": {
      "label": "Mass m that breaks G while preserving T",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "zeeman": {
      "label": "Coefficient b: break T while preserving G",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "shift": {
      "label": "common dispersion ε cos(k_x)",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "kFraction": {
      "label": "Replay and assignment position f_x=k_x/(2π)",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "transverseY": {
      "label": "Transverse reciprocal component f_y: test the little group",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "transverseZ": {
      "label": "Transverse reciprocal lattice component f_z: Inspection little group /TRIM",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    },
    "points": {
      "label": "Band sampling points (analytic crossings also included)",
      "source": "dist/data/construction-materials.json#nonsymmorphic.fields"
    }
  },
  "layer_symmetry_lab": {
    "face": {
      "label": "Parent crystal plane",
      "options": [
        [
          "001",
          "(001) square surface"
        ],
        [
          "110",
          "(110) rectangular surface"
        ],
        [
          "111",
          "(111) triangular surface"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "layers": {
      "label": "Number of finite atomic layers",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "bulk": {
      "label": "layer composition",
      "options": [
        [
          "mono",
          "same element layer"
        ],
        [
          "alternating",
          "A/B alternating layer"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "cut": {
      "label": "Alternate layer cutting starting point",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "interface": {
      "label": "interface label",
      "options": [
        [
          "same",
          "Same material on both sides"
        ],
        [
          "hetero",
          "heterogeneous two sides"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "termination": {
      "label": "surface termination",
      "options": [
        [
          "same",
          "Keep the original layer label"
        ],
        [
          "marker",
          "C label on the top surface"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "registry": {
      "label": "Upper-half disregistry (first in-plane basis vector)",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    },
    "pathEnd": {
      "label": "Relative-offset path endpoint",
      "source": "dist/data/frontiers-materials.json#layers.fields"
    }
  },
  "chirality_polarity_lab": {
    "motif": {
      "label": "Finite structural prototype",
      "options": [
        [
          "d3",
          "D3: chiral and nonpolar"
        ],
        [
          "pyramid",
          "C4v polar pyramid"
        ],
        [
          "octahedron",
          "Oh Octahedron"
        ],
        [
          "tetra",
          "four different tag sites"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "handedness": {
      "label": "configuration and its mirror image",
      "options": [
        [
          1,
          "original configuration"
        ],
        [
          -1,
          "mirror configuration"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "noise": {
      "label": "deterministic displacement amplitude",
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "tolerance": {
      "label": "Distance tolerance for candidate operations",
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "optical": {
      "label": "independent round-trip polarization model",
      "options": [
        [
          "natural",
          "natural optical rotation"
        ],
        [
          "faraday",
          "Faraday Rotation"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    },
    "angle": {
      "label": "One-way rotation angle (degree, teaching input)",
      "source": "dist/data/frontiers-materials.json#chirality.fields"
    }
  },
  "manybody_spt_lab": {
    "sites": {
      "label": "Number of spin-1 sites (finite chain)",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "boundary": {
      "label": "boundary",
      "options": [
        [
          "periodic",
          "Periodic boundaries"
        ],
        [
          "open",
          "open boundary"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "anisotropy": {
      "label": "single ion anisotropy D/J",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "field": {
      "label": "tilt field h/J",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "fieldPattern": {
      "label": "Spatial field distribution",
      "options": [
        [
          "gradient",
          "site gradient"
        ],
        [
          "uniform",
          "Uniform"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "pathAxis": {
      "label": "Parameters for path change",
      "options": [
        [
          "anisotropy",
          "D/J"
        ],
        [
          "field",
          "h/J"
        ]
      ],
      "source": "dist/data/frontiers-materials.json#spt.fields"
    },
    "pathEnd": {
      "label": "Path end （D ≤ 8; h ≤ 1）",
      "source": "dist/data/frontiers-materials.json#spt.fields"
    }
  },
  "band_rep_lab": {
    "group": {
      "label": "Ordinary space groups (this site's BC setting)",
      "options": [
        [
          2,
          "2 · P−1"
        ],
        [
          4,
          "4 · P2₁（ axis z)"
        ],
        [
          19,
          "19 · P2₁2₁2₁"
        ],
        [
          221,
          "221 · Pm−3m"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "site": {
      "label": "Site seed (automatically applicable to every group)",
      "options": [
        [
          "auto",
          "Automatic: origin for 2/221; general position for 4/19"
        ],
        [
          "origin",
          "Origin: groups 2/221 only"
        ],
        [
          "body",
          "Body-centered inversion center: groups 2/221 only"
        ],
        [
          "general",
          "General position: groups 2/4/19 only"
        ],
        [
          "faces",
          "Face-center 3c: group 221 only"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "orbitals": {
      "label": "Local orbitals at each site",
      "options": [
        [
          "s",
          "s scalar (dimension 1)"
        ],
        [
          "p",
          "Complete p-orbital  polarity  vector (x, y, z components; dimension 3)"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "kPoint": {
      "label": "k point in fractional reciprocal coordinates",
      "options": [
        [
          "G",
          "Γ = (0,0,0)"
        ],
        [
          "X",
          "(1/2,0,0)"
        ],
        [
          "Y",
          "(0,1/2,0)"
        ],
        [
          "Z",
          "(0,0,1/2)"
        ],
        [
          "M",
          "(1/2,1/2,0)"
        ],
        [
          "R",
          "(1/2,1/2,1/2)"
        ],
        [
          "line",
          "(0,0,kz): use the parameter below"
        ]
      ],
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    },
    "kz": {
      "label": "Line kz (used only when line is selected)",
      "source": "dist/data/pathways-materials.json#bandrep.fields"
    }
  },
  "dynamic_scattering_lab": {
    "lattice": {
      "label": "Primitive-cell length a (Å)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "massA": {
      "label": "Atom A mass (amu)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "massB": {
      "label": "B-atom mass (amu)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "springIntra": {
      "label": "Intracell spring K₁ (eV/Å²)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "springInter": {
      "label": "Intercell spring K₂ (eV/Å²)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "basisFraction": {
      "label": "B's  primitive cell  fractional position s",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "scatterA": {
      "label": "A coherent amplitude bA (relative)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "scatterB": {
      "label": "B coherent amplitude bB (relative)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "angle": {
      "label": "Angle θ between Q and the chain axis (°)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "selectedQ": {
      "label": "Selected full Q (Å⁻¹)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "temperature": {
      "label": "temperature T (K)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "sigma": {
      "label": "Gaussian standard deviation σ (meV)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "energyCutoff": {
      "label": "Low-energy exclusion threshold (meV)",
      "source": "dist/data/pathways-materials.json#scattering.fields"
    },
    "channel": {
      "label": "Heatmap channel",
      "options": [
        [
          "both",
          "Stokes + anti-Stokes"
        ],
        [
          "stokes",
          "Stokes · phonon creation"
        ],
        [
          "antiStokes",
          "Anti-Stokes · annihilate  phonon "
        ]
      ],
      "source": "dist/data/pathways-materials.json#scattering.fields"
    }
  },
  "domain_wall_lab": {
    "experiment": {
      "label": "Choose an experiment",
      "options": [
        [
          "landau",
          "Continuum order-parameter domain wall"
        ],
        [
          "ssh",
          "SSH interface and localized states"
        ]
      ],
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "kappa": {
      "label": "Gradient coefficient κ (reduced)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "beta": {
      "label": "Double-well coefficient β (reduced)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "amplitude": {
      "label": "Minimum amplitude v (reduced)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "extent": {
      "label": "Half-interval length / ξ",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "gridPoints": {
      "label": "Coarse-grid point count (odd)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "sites": {
      "label": "Number of open-chain sites (even)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "hopping": {
      "label": "Mean hopping t (eV)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "dimerization": {
      "label": "Asymptotic dimerization δ",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "sshWidth": {
      "label": "Interface width (bond spacings)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "onsite": {
      "label": "Central two-site potential (eV)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "probeEnergy": {
      "label": "Probe energy (eV)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "eta": {
      "label": "LDOS broadening η (eV)",
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    },
    "interface": {
      "label": "Bond-order structure",
      "options": [
        [
          "wall",
          "Interface with reversed dimerization"
        ],
        [
          "uniform",
          "Uniform-dimerization reference"
        ]
      ],
      "source": "dist/data/pathways-materials.json#domainwall.fields"
    }
  },
  "hubbard_lab": {
    "sites": {
      "label": "Number of sites L",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "nUp": {
      "label": "Spin-up electron count N↑ (at most L)",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "nDown": {
      "label": "Number of spin-down electrons N↓ (at most L)",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "boundary": {
      "label": "boundary conditions",
      "options": [
        [
          "open",
          "Open boundary: neighboring sites are bonded"
        ],
        [
          "periodic",
          "Periodic boundary: join the ends; a two-site system has only one bond"
        ]
      ],
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "hopping": {
      "label": "Hopping t (eV)",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "interactionU": {
      "label": "Onsite repulsion U (eV)",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "alternatingPotential": {
      "label": "Staggered potential difference Δ (eV; first site at +Δ/2)",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "scanMaxU": {
      "label": "Upper limit of the U scan (eV)",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    },
    "scanPoints": {
      "label": "Number of U-scan points",
      "source": "dist/data/pathways-materials.json#hubbard.fields"
    }
  },
  "order_parameter_lab": {
    "pointGroup": {
      "label": "Parent group and polar-vector representation",
      "options": [
        [
          "c4v",
          "C₄ᵥ: two-dimensional order parameter (x and y components)"
        ],
        [
          "oh",
          "Oₕ: three-dimensional  order parameter  (x, y, z components)"
        ]
      ],
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "etaX": {
      "label": "η_x (dimensionless)",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "etaY": {
      "label": "η_y (dimensionless)",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "etaZ": {
      "label": "η_z（used in three dimensions)",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "a2": {
      "label": "Second-order coefficient a₂",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "b4": {
      "label": "Fourth-order Ση_i⁴ coefficient b₄",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "c4": {
      "label": "Fourth-order Σ_{i<j}η_i²η_j² coefficient c₄",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "d6": {
      "label": "Sixth-order Ση_i⁶ coefficient d₆",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "e6": {
      "label": "Sixth-order Σ_{i≠j}η_i⁴η_j² coefficient e₆",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "f6": {
      "label": "Sixth-order η_x²η_y²η_z² coefficient f₆（three dimensions)",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "fieldX": {
      "label": "External field h_x: energy term −h_xη_x",
      "source": "dist/data/principles-materials.json#order.fields"
    },
    "basisAngle": {
      "label": "Passive coordinate rotation angle (degrees)",
      "source": "dist/data/principles-materials.json#order.fields"
    }
  },
  "exchange_symmetry_lab": {
    "isotropic": {
      "label": "Isotropic exchange J (meV; positive values favor antiparallel alignment)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "anisotropyX": {
      "label": "Traceless symmetric diagonal component Γ_{xx} (meV)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "anisotropyY": {
      "label": "Traceless symmetric diagonal term Γ_{yy} (meV; Γ_{zz}=−Γ_{xx}−Γ_{yy})",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "symmetricXY": {
      "label": "Symmetric exchange Γ_{xy}=Γ_{yx}（units: meV)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "symmetricXZ": {
      "label": "Symmetric exchange Γ_{xz}=Γ_{zx} (meV)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "symmetricYZ": {
      "label": "Symmetric exchange Γ_{yz}=Γ_{zy} (meV)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "dx": {
      "label": "DMI component D_x（units: meV; directed bond i→j)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "dy": {
      "label": "DMI component D_y (meV; directed bond i→j)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "dz": {
      "label": "DMI component D_z (meV; directed bond i→j)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "inversion": {
      "label": "Bond-center inversion: exchanges endpoints",
      "options": [
        [
          0,
          "Off"
        ],
        [
          1,
          "Retained"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "mirrorXY": {
      "label": "xy mirror containing the bond",
      "options": [
        [
          0,
          "Off"
        ],
        [
          1,
          "Retained"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "mirrorXZ": {
      "label": "xz mirror containing the bond",
      "options": [
        [
          0,
          "Off"
        ],
        [
          1,
          "Retained"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "mirrorYZ": {
      "label": "yz mirror perpendicular to the bond: exchanges endpoints",
      "options": [
        [
          0,
          "Off"
        ],
        [
          1,
          "Retained"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "rotationOrder": {
      "label": "Rotation about the directed bond's x axis",
      "options": [
        [
          0,
          "Apply no rotation"
        ],
        [
          2,
          "Twofold rotation"
        ],
        [
          4,
          "Fourfold rotation"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "conventionAngle": {
      "label": "Coordinate change only: angle of new axes about old z (°)",
      "source": "dist/data/principles-materials.json#exchange.fields"
    },
    "swapSites": {
      "label": "Convention change only: exchange endpoint labels i and j?",
      "options": [
        [
          0,
          "Preserves i→j"
        ],
        [
          1,
          "Exchange i and j"
        ]
      ],
      "source": "dist/data/principles-materials.json#exchange.fields"
    }
  },
  "conservation_lab": {
    "experiment": {
      "label": "Spin model",
      "options": [
        [
          "pair",
          "Two spin-1/2 particles"
        ],
        [
          "single",
          "One spin-1/2"
        ]
      ],
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "initialState": {
      "label": "Initial state (antiparallel and singlet options require two spins)",
      "options": [
        [
          "up",
          "↑ / ↑↑"
        ],
        [
          "down",
          "↓ / ↓↓"
        ],
        [
          "plus_x",
          "+x / +x⊗+x"
        ],
        [
          "antiparallel",
          "↑↓"
        ],
        [
          "singlet",
          "double spin singlet state"
        ],
        [
          "mixed",
          "Maximally mixed state I/d"
        ]
      ],
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "observable": {
      "label": "Observable to inspect",
      "options": [
        [
          "sx",
          "Total-spin x component"
        ],
        [
          "sy",
          "Total-spin y component"
        ],
        [
          "sz",
          "Total z spin component"
        ],
        [
          "s2",
          "Total-spin S²"
        ],
        [
          "energy",
          "H/ℏ"
        ]
      ],
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "jx": {
      "label": "Exchange J_x (rad/ns)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "jy": {
      "label": "Exchange J_y (rad/ns)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "jz": {
      "label": "Exchange J_z（rad/ns）",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "fieldX": {
      "label": "Uniform transverse-field coefficient h_x (rad/ns)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "fieldZ": {
      "label": "Uniform longitudinal-field coefficient h_z (rad/ns)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "gradientZ": {
      "label": "Longitudinal-field difference δ (rad/ns; difference between sites, coefficient δ/2)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "gamma1": {
      "label": "Independent ↑→↓ relaxation rate γ_1 (ns⁻¹)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "gammaPhi": {
      "label": "Independent z pure-dephasing rate γ_φ (ns⁻¹)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "duration": {
      "label": "Evolution time (ns)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "points": {
      "label": "Number of sample points",
      "source": "dist/data/principles-materials.json#conservation.fields"
    },
    "basisAngle": {
      "label": "Convention comparison: passive basis rotation about y (degrees)",
      "source": "dist/data/principles-materials.json#conservation.fields"
    }
  },
  "hall_response_lab": {
    "mass": {
      "label": "QWZ mass parameter m (dimensionless)",
      "source": "dist/response-views.js#fields.hall"
    },
    "energyScale": {
      "label": "Energy scale (eV)",
      "source": "dist/response-views.js#fields.hall"
    },
    "temperature": {
      "label": "temperature (K)",
      "source": "dist/response-views.js#fields.hall"
    },
    "chemicalPotential": {
      "label": "chemical potential μ (eV)",
      "source": "dist/response-views.js#fields.hall"
    },
    "mesh": {
      "label": "Integration grid per direction N",
      "source": "dist/response-views.js#fields.hall"
    },
    "muMin": {
      "label": "μ scanning starting point (eV)",
      "source": "dist/response-views.js#fields.hall"
    },
    "muMax": {
      "label": "μ Scan end point (eV)",
      "source": "dist/response-views.js#fields.hall"
    },
    "scanPoints": {
      "label": "scanning points",
      "source": "dist/response-views.js#fields.hall"
    }
  },
  "device_transport_lab": {
    "model": {
      "label": "device model",
      "options": [
        [
          "uniform",
          "uniform chain"
        ],
        [
          "ssh",
          "SSH alternate keychain"
        ]
      ],
      "source": "dist/response-views.js#fields.device"
    },
    "sites": {
      "label": "device grid points",
      "source": "dist/response-views.js#fields.device"
    },
    "hopping": {
      "label": "benchmark transition (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "dimerRatio": {
      "label": "SSH intracellular/intercellular transition ratio t₁/t₂",
      "source": "dist/response-views.js#fields.device"
    },
    "gate": {
      "label": "Uniform gate voltage energy (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "barrier": {
      "label": "local barrier height (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "leadHopping": {
      "label": "electrode transition (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "leadOnsite": {
      "label": "electrode on-site energy (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "contactLeft": {
      "label": "left contact transition (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "contactRight": {
      "label": "right contact transition (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "energy": {
      "label": "Probe energy (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "eta": {
      "label": "Green function broadening eta (eV)",
      "source": "dist/response-views.js#fields.device"
    },
    "spinDegeneracy": {
      "label": "Number of independent spin channels",
      "options": [
        [
          1,
          "1 · Spin-free model"
        ],
        [
          2,
          "2 · Two identical independent spin channels"
        ]
      ],
      "source": "dist/response-views.js#fields.device"
    }
  },
  "local_multiplet_lab": {
    "electrons": {
      "label": "d Number of shell electrons N",
      "source": "dist/response-views.js#fields.multiplet"
    },
    "coordination": {
      "label": "ideal crystal field",
      "options": [
        [
          "octahedral",
          "Octahedron Oₕ"
        ],
        [
          "tetrahedral",
          "tetrahedron Tᵈ"
        ]
      ],
      "source": "dist/response-views.js#fields.multiplet"
    },
    "splitting": {
      "label": "crystal field split Δ(eV)",
      "source": "dist/response-views.js#fields.multiplet"
    },
    "coulombU": {
      "label": "co-orbital repulsion U (eV)",
      "source": "dist/response-views.js#fields.multiplet"
    },
    "hundJ": {
      "label": "Hund coupling J (eV)",
      "source": "dist/response-views.js#fields.multiplet"
    }
  },
  "spin_resonance_lab": {
    "spin": {
      "label": "Electronic effective spin S",
      "options": [
        [
          0.5,
          "0.5"
        ],
        [
          1,
          "1"
        ],
        [
          1.5,
          "1.5"
        ],
        [
          2,
          "2"
        ],
        [
          2.5,
          "2.5"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "field": {
      "label": "Static magnetic field B (T)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "theta": {
      "label": "Static magnetic field polar angle θ (°)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "phi": {
      "label": "Static magnetic field azimuth φ (°)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "gX": {
      "label": "spindle gₓ",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "gY": {
      "label": "spindle gᵧ",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "gZ": {
      "label": "spindle g_z",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "zeroFieldD": {
      "label": "Zero field splitting D (GHz)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "zeroFieldE": {
      "label": "Zero field splitting E (GHz)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "temperature": {
      "label": "temperature (K)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "polarization": {
      "label": "Microwave magnetic field direction",
      "options": [
        [
          "theta",
          "eθ · Horizontal"
        ],
        [
          "phi",
          "eφ · Horizontal"
        ],
        [
          "parallel",
          "parallel static magnetic field"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "nuclearSpin": {
      "label": "Nuclear spin I",
      "options": [
        [
          0,
          "0"
        ],
        [
          0.5,
          "0.5"
        ],
        [
          1,
          "1"
        ],
        [
          1.5,
          "1.5"
        ],
        [
          2,
          "2"
        ],
        [
          2.5,
          "2.5"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "hyperfinePerp": {
      "label": "Lateral ultra-fine A⊥ (GHz)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "hyperfineParallel": {
      "label": "Longitudinal ultra-fine A∥ (GHz)",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    },
    "nuclearGamma": {
      "label": "Nuclear gyromagnetic ratio γₙ（GHz/T）",
      "source": "dist/spectroscopy-views.js#fields.resonance"
    }
  },
  "andreev_lab": {
    "sites": {
      "label": "Number of grid points in normal scattering area",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "hopping": {
      "label": "common transition t (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "chemicalPotential": {
      "label": "common chemical potential μ (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "gap": {
      "label": "Right electrode pair Δ (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "energy": {
      "label": "Observation energy E (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "barrier": {
      "label": "local barrier (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "barrierStart": {
      "label": "barrier grid points (numbered from 0)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "gate": {
      "label": "normal area gate voltage energy (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "contactLeft": {
      "label": "left contact transition (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "contactRight": {
      "label": "right contact transition (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    },
    "eta": {
      "label": "numerical broadening η (eV)",
      "source": "dist/spectroscopy-views.js#fields.andreev"
    }
  },
  "atomic_spectra_lab": {
    "configuration": {
      "label": "initial state valence shell",
      "options": [
        [
          "d8",
          "d⁸ · Ni²⁺ ion background"
        ],
        [
          "d9",
          "d⁹ · Cu²⁺ ion background"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "tenDq": {
      "label": "cubic crystal field 10Dq (eV)",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "tetragonal": {
      "label": "Sifang crystal field Parameters (eV)",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "socD": {
      "label": "3d spin-orbit coefficient (eV)",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "socP": {
      "label": "2p spin-orbit coefficient (eV)",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "fieldTesla": {
      "label": "z-direction magnetic field (T)",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "temperature": {
      "label": "temperature (K)",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "polarization": {
      "label": "Incident electric field polarization",
      "options": [
        [
          "x",
          "linear polarization x"
        ],
        [
          "y",
          "linear polarization y"
        ],
        [
          "z",
          "linear polarization z"
        ],
        [
          "plus",
          "(x+i y)/√2"
        ],
        [
          "minus",
          "(x−i y)/√2"
        ],
        [
          "linear",
          "xz plane continuous linear polarization"
        ]
      ],
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "F0": {
      "label": "3d–3d F⁰（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "F2": {
      "label": "3d–3d F²（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "F4": {
      "label": "3d–3d F⁴（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdF0": {
      "label": "2p–3d F⁰（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdF2": {
      "label": "2p–3d F²（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdG1": {
      "label": "2p–3d G¹（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    },
    "pdG3": {
      "label": "2p–3d G³（eV）",
      "source": "dist/spectroscopy-views.js#fields.spectra"
    }
  },
  "quantum_geometry_lab": {
    "model": {
      "label": "periodic two-band model",
      "options": [
        [
          "qwz",
          "2D QWZ · Chern"
        ],
        [
          "ssh",
          "1D SSH · Zak"
        ]
      ],
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "mass": {
      "label": "QWZ mass parameter m (dimensionless)",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "energyScale": {
      "label": "common energy scale (model units)",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "t1": {
      "label": "Intracell hopping t₁ (common model energy unit)",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    },
    "t2": {
      "label": "Intercell hopping t₂ (common model energy unit)",
      "source": "dist/quantum-materials-ui.js#controls.geometry"
    }
  },
  "crystal_field_lab": {
    "coordination": {
      "label": "ideal crystal field",
      "options": [
        [
          "octahedral",
          "Octahedron Oₕ"
        ],
        [
          "tetrahedral",
          "tetrahedron Tᵈ"
        ]
      ],
      "source": "dist/quantum-materials-ui.js#controls.orbitals"
    },
    "splitting": {
      "label": "crystal field split Δ(eV)",
      "source": "dist/quantum-materials-ui.js#controls.orbitals"
    },
    "soc": {
      "label": "Spin–orbit coefficient λ (eV)",
      "source": "dist/quantum-materials-ui.js#controls.orbitals"
    }
  },
  "analyze": {
    "group_number": {
      "label": "Ordinary space-group number",
      "source": "dist/app.js#renderWorkbench"
    },
    "k.0": {
      "label": "Fractional wavevector coordinate k₁",
      "source": "dist/app.js#renderWorkbench"
    },
    "k.1": {
      "label": "Fractional wavevector coordinate k₂",
      "source": "dist/app.js#renderWorkbench"
    },
    "k.2": {
      "label": "Fractional wavevector coordinate k₃",
      "source": "dist/app.js#renderWorkbench"
    },
    "doubleValued": {
      "label": "represents the type",
      "options": [
        [
          false,
          "single-valued representation"
        ],
        [
          true,
          "Double-valued representation"
        ]
      ],
      "source": "dist/app.js#renderWorkbench"
    }
  },
  "phonon_thermo": {
    "source": {
      "label": "Thermodynamic data source",
      "options": [
        [
          "compare",
          "Einstein vs Debye comparison"
        ],
        [
          "einstein",
          "Einstein model"
        ],
        [
          "debye",
          "Debye model"
        ],
        [
          "mesh",
          "weighted mesh.yaml"
        ],
        [
          "dos",
          "Complete Total DOS"
        ],
        [
          "thermal",
          "thermal_properties.yaml"
        ]
      ],
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "natom": {
      "label": "Number of atoms n in the model  primitive cell ",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "theta_e": {
      "label": "Einstein characteristic temperature θ_E（K）",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "theta_d": {
      "label": "Debye characteristic temperature θ_D（K）",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "t_min": {
      "label": "starting temperature (K)",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "t_max": {
      "label": "termination temperature (K)",
      "source": "dist/material-research-ui.js#controls.thermo"
    },
    "t_step": {
      "label": "temperature step size (K)",
      "source": "dist/material-research-ui.js#controls.thermo"
    }
  },
  "teaching_labs": {
    "lab": {
      "label": "Experiment series",
      "options": [
        [
          "lie",
          "Continuous groups and angular momentum"
        ]
      ],
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "experiment": {
      "label": "Experiment",
      "options": [
        [
          "su2_coupling",
          "SU(2) angular-momentum coupling"
        ]
      ],
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoJ1": {
      "label": "Twice the first angular momentum, 2j₁",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoJ2": {
      "label": "Twice the second angular momentum, 2j₂",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoM1": {
      "label": "Twice the first magnetic quantum number, 2m₁",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "twoM2": {
      "label": "Twice the second magnetic quantum number, 2m₂",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    },
    "coupling": {
      "label": "Coupling coefficient (common energy unit)",
      "source": "dist/lie-group-ui.js#drawLab.su2_coupling"
    }
  },
  "band_connectivity": {
    "model": {
      "label": "cycle teaching model",
      "options": [
        [
          "c4v",
          "C₄ᵥ · pₓ / pᵧ track"
        ],
        [
          "rashba",
          "Rashba · double-valued spin representation"
        ]
      ],
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "soc": {
      "label": "SOC strength α (common model energy unit)",
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "zeeman": {
      "label": "Zeeman parameter B_z (common model energy unit)",
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "hopping": {
      "label": "Common dispersion coefficient t (common model energy unit)",
      "source": "dist/material-research-ui.js#controls.bands"
    },
    "samples": {
      "label": "Path sampling points",
      "source": "dist/material-research-ui.js#controls.bands"
    }
  },
  "shg_lab": {
    "model": {
      "label": "material symmetry model",
      "options": [
        [
          "gaas",
          "GaAs · Tᵈ"
        ],
        [
          "batio3",
          "BaTiO₃ · 4mm"
        ],
        [
          "centrosymmetric",
          "Centrosymmetric · Oₕ"
        ]
      ],
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "cut": {
      "label": "sample section",
      "options": [
        [
          "001",
          "(001)"
        ],
        [
          "111",
          "(111)"
        ]
      ],
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "incidence": {
      "label": "incident angle θ (°)",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "azimuth": {
      "label": "Current sample orientation φ (°)",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "samples": {
      "label": "Number of angular samples",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "channel": {
      "label": "Polarization channel (incident → detected)",
      "options": [
        [
          "PP",
          "P → P"
        ],
        [
          "PS",
          "P → S"
        ],
        [
          "SP",
          "S → P"
        ],
        [
          "SS",
          "S → S"
        ]
      ],
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "cOverA": {
      "label": "Lattice-axis ratio c/a (dimensionless)",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "coefficients.xxz": {
      "label": "Nonlinear coefficient χxxz (common arbitrary unit)",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "coefficients.zxx": {
      "label": "Nonlinear coefficient χzxx (common arbitrary unit)",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    },
    "coefficients.zzz": {
      "label": "Nonlinear coefficient χzzz (common arbitrary unit)",
      "source": "dist/electronic-materials-ui.js#controls.shg"
    }
  }
};
const own=(object,key)=>object&&Object.hasOwn(object,key);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function projectConditionDescriptor(action,path){
 const descriptor=own(descriptors,action)&&own(descriptors[action],path)?descriptors[action][path]:null;
 return descriptor?{...descriptor,options:descriptor.options?.map(row=>[...row]),covered:true}:{label:"Additional comparison condition",source:'',covered:false};
}
export function projectConditionValue(value,descriptor={}){
 const option=descriptor.options?.find(([v])=>typeof v===typeof value&&v===value);
 if(option)return String(option[1]);
 if(value===undefined)return "Not provided";
 if(value===null)return "Null value";
 if(typeof value==='number')return Number.isFinite(value)?Object.is(value,-0)?'−0':String(value):"Nonfinite number";
 if(typeof value==='boolean')return value?"Yes":"No";
 if(typeof value==='string')return "text “"+value+'”';
 return Array.isArray(value)?"Array (check the input type)":"Object (check the input type)";
}
const genericReason="This stage fixes the model, units, and sampling conditions for reproducible comparison. Changed conditions can be retained as a separate exploration.";
function conditionReason(action,path,context){
 if(action==='device_transport_lab'&&path==='spinDegeneracy')return (context?.templateId==='normal-andreev'?"This stage first records the single-spin baseline G₁=(e²/h)T, then multiplies it by 2 for comparison with the NS conductance including both physical spins.":"The number of independent spin channels is fixed here so that contact, transmission, and conductance comparisons use the same counting convention.")+' '+"Two identical independent channels copy the scattering result and multiply the conductance by 2; they do not automatically introduce SOC, Zeeman terms, or spin scattering.";
 if(['mesh','samples','points','scanPoints','gridPoints','eta','sigma','cutoff','energyCutoff'].includes(path))return "Sampling, truncation, or numerical broadening is fixed here to separate numerical changes from the physical comparison. Check the calculation diagnostics to assess accuracy.";
 if(path==='mass'&&['hall_response_lab','quantum_geometry_lab'].includes(action))return "Here m is a dimensionless parameter in the QWZ Hamiltonian. Keeping it fixed preserves the band model used for comparison; it is not a particle mass measured in kg.";
 if(path==='doubleValued')return "Single-valued and double-valued representations act on different state spaces. This stage fixes the representation type before comparing groups and wavevectors.";
 if(action==='analyze'&&path.startsWith('k.'))return "The little group and phases of the same space group can differ with wavevector. The declared fractional wavevector coordinates are fixed here.";
 return genericReason;
}
export function compareProjectConditions(step,record,context={}){
 if(!record)return {ok:false,status:'missing',reason:"First open the tool at this stage and complete the calculation, then return to include.",mismatches:[]};
 if(record.action!==step.action)return {ok:false,status:'tool',reason:"The most recent calculation belongs to another tool, please run this phase of the experiment first.",mismatches:[]};
 const mismatches=[];
 for(const [path,required]of Object.entries(step.requires||{})){
  const actual=path.split('.').reduce((value,part)=>value?.[part],record.input);
  const equal=typeof required==='number'?typeof actual==='number'&&Number.isFinite(actual)&&Math.abs(actual-required)<=1e-10*Math.max(Math.abs(required),1e-9):actual===required;
  if(equal)continue;
  const descriptor=projectConditionDescriptor(step.action,path);
  mismatches.push({path,label:descriptor.label,current:actual,required,currentText:projectConditionValue(actual,descriptor),requiredText:projectConditionValue(required,descriptor),explanation:conditionReason(step.action,path,context),source:descriptor.source,covered:descriptor.covered});
 }
 if(!mismatches.length)return {ok:true,status:'matching',reason:"parameters are in line with this stage and can include complete input and results.",mismatches:[]};
 // Keep the parameter paths in the API reason for existing consumers. The UI
 // presents the labelled comparison below and puts raw paths in a disclosure.
 const reason="The stage requirements differ from the current record:"+mismatches.map(m=>`${m.label}（${m.path}): current ${m.currentText}; required ${m.requiredText}`).join('；')+". Load the stage conditions and calculate explicitly, or keep the current exploration.";
 return {ok:false,status:'conditions',reason,mismatches};
}
export function renderProjectConditionFeedback(step,acceptance){
 if(acceptance.status!=='conditions')return `<p class="obs-small" role="status">${esc(acceptance.reason)}</p>`;
 const mismatches=acceptance.mismatches;
 const explanations=[...new Set(mismatches.map(m=>m.explanation))];
 return `<section class="project-condition-feedback" aria-label="${esc(step.title)} · Comparison conditions"><h4>This record uses different stage conditions</h4><p>These conditions determine whether the record can serve as evidence for this stage. A mismatch does not by itself invalidate the calculation or its physical conclusion.</p><div class="obs-table"><table role="table"><thead><tr><th scope="col">Comparison condition (including units or conventions)</th><th scope="col">Current record</th><th scope="col">Requirements at this stage</th></tr></thead><tbody>${mismatches.map(m=>`<tr><th scope="row">${esc(m.label)}</th><td><span class="project-condition-cell-label" aria-hidden="true">Current record</span><span>${esc(m.currentText)}</span></td><td><span class="project-condition-cell-label" aria-hidden="true">Requirements at this stage</span><span>${esc(m.requiredText)}</span></td></tr>`).join('')}</tbody></table></div>${explanations.map(text=>`<p>${esc(text)}</p>`).join('')}<details><summary>Technical fields and input types</summary><ul>${mismatches.map(m=>`<li><code>${esc(m.path)}</code>：${esc(typeof m.current)} → ${esc(typeof m.required)}${m.source?`；${esc(m.source)}`:''}</li>`).join('')}</ul></details></section>`;
}
