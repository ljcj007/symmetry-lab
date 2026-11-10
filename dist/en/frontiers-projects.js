export const frontiersAssignments=[
  {
    "id": "surface-to-polarity",
    "module": "layers",
    "title": "Cut, terminate and allow polarity",
    "question": "Which constraints come from the monolithic film, and which conclusions also require the order parameter model?",
    "rubric": [
      "Prove atom-by-atom whether an operation on both sides of a swap preserves elements.",
      "Distinguish the nonperiodic normal boundary from in-plane periodicity; report layer count and surface cut.",
      "The order-parameter tool is a separate specified model; symmetry permission is not spontaneous polarization of the film."
    ],
    "steps": [
      {
        "id": "slab",
        "title": "Create symmetrical films",
        "action": "layer_symmetry_lab",
        "route": "#compute/layer-symmetry-lab?preset=layer-square",
        "requires": {
          "face": "001",
          "layers": 4,
          "bulk": "mono",
          "cut": 0,
          "interface": "same",
          "termination": "same",
          "registry": 0,
          "pathEnd": 0.5
        },
        "prompt": "records all operations, swapping and closing of both sides; save as A."
      },
      {
        "id": "surface",
        "title": "Only changes the upper surface label",
        "action": "layer_symmetry_lab",
        "route": "#compute/layer-symmetry-lab?preset=layer-surface",
        "requires": {
          "face": "001",
          "layers": 4,
          "bulk": "mono",
          "cut": 0,
          "interface": "same",
          "termination": "marker",
          "registry": 0,
          "pathEnd": 0.5
        },
        "prompt": "with A to find the operation that is invalid due to the element tag, and apply wavevector once with spin linkage."
      },
      {
        "id": "order",
        "title": "connection polarity order parameter model",
        "action": "order_parameter_lab",
        "route": "#compute/order-parameter-lab?preset=order-cubic-axis",
        "requires": {
          "pointGroup": "oh",
          "etaX": 0,
          "etaY": 0,
          "etaZ": 1,
          "a2": -1,
          "b4": 1,
          "c4": 3,
          "d6": 0.1,
          "e6": 0,
          "f6": 0,
          "fieldX": 0,
          "basisAngle": 30
        },
        "prompt": "records the stabilizer and equivalent directions in the independent cubic order parameter model. Explain that it is not an automatically fitted free energy from the film."
      }
    ]
  },
  {
    "id": "chirality-to-optics",
    "module": "chirality",
    "title": "From image analysis to optical licensing",
    "question": ", chirality , polar vector and optical response respectively?",
    "rubric": [
      "retains homogeneous atomic constraints and positive rotation registration errors.",
      "Compare a chiral nonpolar prototype with a polar achiral prototype.",
      "SHG are additional inputs and are not determined by the chirality boolean value."
    ],
    "steps": [
      {
        "id": "chiral",
        "title": "chirality instead of polarity",
        "action": "chirality_polarity_lab",
        "route": "#compute/chirality-polarity-lab?preset=chiral-d3",
        "requires": {
          "motif": "d3",
          "handedness": 1,
          "noise": 0,
          "tolerance": 0.01,
          "optical": "natural",
          "angle": 20
        },
        "prompt": "records the mirror residual and allows polar vector dimensions; completes a reverse candidate set judgment."
      },
      {
        "id": "polar",
        "title": "polarity instead of chirality",
        "action": "chirality_polarity_lab",
        "route": "#compute/chirality-polarity-lab?preset=chiral-polar",
        "requires": {
          "motif": "pyramid",
          "handedness": 1,
          "noise": 0,
          "tolerance": 0.01,
          "optical": "natural",
          "angle": 20
        },
        "prompt": "Check mirror, polar vector orientation and independent round-trip rotation model."
      },
      {
        "id": "optics",
        "title": "Enter existing polarization spectroscopy tools",
        "action": "shg_lab",
        "route": "#compute/shg-lab?preset=batio3-001",
        "requires": {
          "model": "batio3",
          "cut": "001",
          "incidence": 45,
          "azimuth": 30,
          "samples": 181,
          "channel": "PP",
          "cOverA": 1,
          "coefficients.xxz": 1,
          "coefficients.zxx": 0.7,
          "coefficients.zzz": 1.5
        },
        "prompt": "changes the polarization geometry in a 4mm stand-alone SHG model; illustrates the differences between the prototype cone and the real BaTiO3 structure and coefficients."
      }
    ]
  },
  {
    "id": "schmidt-to-spt",
    "module": "spt",
    "title": "From reduced states to AKLT edges and projective representations",
    "question": "local hybrid, entanglement related to topology protection, and what are the different assumptions?",
    "rubric": [
      "Note the purity and Hilbert space of the complete state and reduced state.",
      "preserves AKLT boundary conditions, selected pure states, and ground state space dimensions.",
      "Separates analytic virtual representation from finite chain numerical diagnosis, instead of declaring body phase by a single finite chain spectrum."
    ],
    "steps": [
      {
        "id": "density",
        "title": "First do the singlet reduction density matrix",
        "action": "density_matrix_lab",
        "route": "#compute/density-matrix-lab?preset=singlet",
        "requires": {
          "experiment": "pair",
          "initialState": "singlet",
          "drive": 0,
          "detuning": 0,
          "exchange": 1,
          "gradient": 0,
          "gamma1": 0,
          "gammaPhi": 0,
          "thermalScale": 1,
          "duration": 12,
          "points": 161
        },
        "prompt": "records global pure states and local mixtures, interpreting Schmidt probabilities."
      },
      {
        "id": "periodic",
        "title": "cycle AKLT with virtual representation",
        "action": "manybody_spt_lab",
        "route": "#compute/manybody-spt-lab?preset=spt-aklt",
        "requires": {
          "sites": 4,
          "boundary": "periodic",
          "anisotropy": 0,
          "field": 0,
          "fieldPattern": "gradient",
          "pathAxis": "anisotropy",
          "pathEnd": 4
        },
        "prompt": "records energy spectra, entanglement weights, and Ux/Uz antitransactions; compares site spins to virtual spins."
      },
      {
        "id": "edge",
        "title": "Only open borders",
        "action": "manybody_spt_lab",
        "route": "#compute/manybody-spt-lab?preset=spt-edge",
        "requires": {
          "sites": 4,
          "boundary": "open",
          "anisotropy": 0,
          "field": 0,
          "fieldPattern": "gradient",
          "pathAxis": "anisotropy",
          "pathEnd": 4
        },
        "prompt": "Compares the ground state subspace to the representative pure state, saving A/B evidence. Check the protection conditions along the D path, explaining the finite size constraints."
      }
    ]
  }
];
export function frontiersEvidence(record){if(!['layer_symmetry_lab','chirality_polarity_lab','manybody_spt_lab'].includes(record.action))return null;const e=record.result.learningEvidence||{};return record.result.summary.map(s=>s.label+'='+s.value).join('；')+"; Linkage evidence:"+(e.linked?"saved":"not saved")+"; Reverse identification:"+(e.inverse?.result?.correct?"passed":"failed or did not answer")+";Waypoint:"+(e.path?.index??"Not selected")+(e.comparison?"\n\nA input:"+JSON.stringify(e.comparison.A.input)+"\n\nB input:"+JSON.stringify(e.comparison.B.input)+"\n\nComparative explanation:"+e.comparison.explanation:'');}
