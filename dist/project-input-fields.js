// Verified editable input fields; source controls and real project roundtrips
// are checked by scripts/test-project-input.mjs.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const PROJECT_INPUT_FIELDS=freeze({
 "quantum_geometry_lab": [
  "model",
  "mass",
  "energyScale",
  "t1",
  "t2",
  "mesh",
  "pathSamples",
  "gaugeStrength",
  "kx",
  "ky"
 ],
 "crystal_field_lab": [
  "mode",
  "coordination",
  "splitting",
  "ds",
  "dt",
  "soc",
  "selected_level",
  "angular_grid",
  "scan_points",
  "coupling",
  "stiffness",
  "q2",
  "q3",
  "q_extent",
  "grid"
 ],
 "hall_response_lab": [
  "mass",
  "energyScale",
  "temperature",
  "chemicalPotential",
  "mesh",
  "muMin",
  "muMax",
  "scanPoints"
 ],
 "device_transport_lab": [
  "model",
  "sites",
  "hopping",
  "dimerRatio",
  "gate",
  "barrier",
  "barrierStart",
  "barrierWidth",
  "leadHopping",
  "leadOnsite",
  "contactLeft",
  "contactRight",
  "energy",
  "energyMin",
  "energyMax",
  "samples",
  "eta",
  "spinDegeneracy"
 ],
 "local_multiplet_lab": [
  "electrons",
  "coordination",
  "splitting",
  "coulombU",
  "hundJ",
  "scanMax",
  "scanPoints",
  "selectedGroup"
 ],
 "spin_resonance_lab": [
  "spin",
  "field",
  "theta",
  "phi",
  "gX",
  "gY",
  "gZ",
  "zeroFieldD",
  "zeroFieldE",
  "temperature",
  "polarization",
  "lineWidth",
  "nuclearSpin",
  "hyperfinePerp",
  "hyperfineParallel",
  "nuclearGamma",
  "frequencyMin",
  "frequencyMax",
  "frequencyPoints",
  "fieldMax",
  "fieldPoints"
 ],
 "andreev_lab": [
  "sites",
  "hopping",
  "chemicalPotential",
  "gap",
  "energy",
  "barrier",
  "barrierStart",
  "gate",
  "contactLeft",
  "contactRight",
  "energyMin",
  "energyMax",
  "samples",
  "eta"
 ],
 "atomic_spectra_lab": [
  "configuration",
  "tenDq",
  "tetragonal",
  "socD",
  "socP",
  "fieldTesla",
  "temperature",
  "polarization",
  "polarizationAngle",
  "width",
  "F0",
  "F2",
  "F4",
  "pdF0",
  "pdF2",
  "pdG1",
  "pdG3",
  "energyMin",
  "energyMax",
  "samples"
 ],
 "phonon_thermo": [
  "source",
  "natom",
  "theta_e",
  "theta_d",
  "t_min",
  "t_max",
  "t_step",
  "frequency_unit",
  "zero_policy",
  "dos_normalization",
  "dos_complete",
  "content",
  "filename",
  "data",
  "dos_content"
 ],
 "band_connectivity": [
  "model",
  "samples",
  "beta",
  "gamma",
  "eta",
  "mixing",
  "soc",
  "zeeman",
  "hopping"
 ],
 "shg_lab": [
  "model",
  "cut",
  "incidence",
  "azimuth",
  "samples",
  "channel",
  "cOverA",
  "coefficients"
 ],
 "band_rep_lab": [
  "group",
  "site",
  "orbitals",
  "kPoint",
  "kz"
 ],
 "dynamic_scattering_lab": [
  "lattice",
  "massA",
  "massB",
  "springIntra",
  "springInter",
  "basisFraction",
  "scatterA",
  "scatterB",
  "angle",
  "selectedQ",
  "temperature",
  "sigma",
  "energyCutoff",
  "qMin",
  "qMax",
  "qPoints",
  "energyMin",
  "energyMax",
  "energyPoints",
  "channel"
 ],
 "domain_wall_lab": [
  "experiment",
  "kappa",
  "beta",
  "amplitude",
  "extent",
  "gridPoints",
  "sites",
  "hopping",
  "dimerization",
  "sshWidth",
  "onsite",
  "probeEnergy",
  "eta",
  "interface"
 ],
 "hubbard_lab": [
  "sites",
  "nUp",
  "nDown",
  "boundary",
  "hopping",
  "interactionU",
  "alternatingPotential",
  "scanMaxU",
  "scanPoints"
 ],
 "manybody_spectra_lab": [
  "experiment",
  "sites",
  "nUp",
  "nDown",
  "boundary",
  "hopping",
  "interactionU",
  "alternatingPotential",
  "probe",
  "site",
  "q",
  "spin",
  "chemicalPotential",
  "responseKind",
  "eta",
  "points"
 ],
 "polaron_lab": [
  "hopping",
  "phononEnergy",
  "coupling",
  "siteBias",
  "cutoff",
  "scanMaxCoupling",
  "scanPoints"
 ],
 "density_matrix_lab": [
  "experiment",
  "initialState",
  "drive",
  "detuning",
  "exchange",
  "gradient",
  "gamma1",
  "gammaPhi",
  "thermalScale",
  "duration",
  "points"
 ],
 "symmetry_workshop": [
  "pointGroup",
  "rotation",
  "mirror",
  "inversion",
  "timeReversal",
  "rashba",
  "dresselhaus",
  "mass",
  "fieldX",
  "curvature"
 ],
 "order_parameter_lab": [
  "pointGroup",
  "etaX",
  "etaY",
  "etaZ",
  "a2",
  "b4",
  "c4",
  "d6",
  "e6",
  "f6",
  "fieldX",
  "basisAngle"
 ],
 "exchange_symmetry_lab": [
  "isotropic",
  "anisotropyX",
  "anisotropyY",
  "symmetricXY",
  "symmetricXZ",
  "symmetricYZ",
  "dx",
  "dy",
  "dz",
  "inversion",
  "mirrorXY",
  "mirrorXZ",
  "mirrorYZ",
  "rotationOrder",
  "conventionAngle",
  "swapSites"
 ],
 "conservation_lab": [
  "experiment",
  "initialState",
  "observable",
  "jx",
  "jy",
  "jz",
  "fieldX",
  "fieldZ",
  "gradientZ",
  "gamma1",
  "gammaPhi",
  "duration",
  "points",
  "basisAngle"
 ],
 "salc_lab": [
  "copies",
  "targetIrrep",
  "seedSite",
  "operatorType",
  "polarizationAngle",
  "operatorScale",
  "hop",
  "crossHop",
  "copyOffset",
  "anisotropy",
  "retainC4",
  "retainMirror"
 ],
 "wavevector_lab": [
  "period",
  "qx",
  "qy",
  "pattern",
  "amplitude",
  "transverseRatio",
  "phaseDegrees",
  "relativePhaseDegrees"
 ],
 "nonsymmorphic_lab": [
  "operation",
  "spinful",
  "hopping",
  "spinOrbit",
  "mass",
  "zeeman",
  "shift",
  "kFraction",
  "transverseY",
  "transverseZ",
  "points"
 ],
 "statistics_lab": [
  "mode",
  "orbital",
  "spin",
  "swap"
 ],
 "defects_lab": [
  "model",
  "texture",
  "separation",
  "loopX",
  "loopY",
  "radius",
  "phase"
 ],
 "reciprocity_lab": [
  "model",
  "space",
  "a",
  "b",
  "cross",
  "odd",
  "field",
  "magnetization",
  "reverseM",
  "violation",
  "forceX",
  "forceY"
 ],
 "layer_symmetry_lab": [
  "face",
  "layers",
  "bulk",
  "cut",
  "interface",
  "termination",
  "registry",
  "pathEnd"
 ],
 "chirality_polarity_lab": [
  "motif",
  "handedness",
  "noise",
  "tolerance",
  "optical",
  "angle"
 ],
 "manybody_spt_lab": [
  "sites",
  "boundary",
  "anisotropy",
  "field",
  "fieldPattern",
  "pathAxis",
  "pathEnd"
 ],
 "teaching_labs": [
  "lab",
  "experiment",
  "twoJ1",
  "twoJ2",
  "twoM1",
  "twoM2",
  "coupling"
 ]
});
export const PROJECT_INPUT_ENUMS=freeze({
 "hall_response_lab": {},
 "device_transport_lab": {
  "model": [
   "uniform",
   "ssh"
  ],
  "spinDegeneracy": [
   1,
   2
  ]
 },
 "local_multiplet_lab": {
  "coordination": [
   "octahedral",
   "tetrahedral"
  ]
 },
 "spin_resonance_lab": {
  "spin": [
   0.5,
   1,
   1.5,
   2,
   2.5
  ],
  "polarization": [
   "theta",
   "phi",
   "parallel"
  ],
  "nuclearSpin": [
   0,
   0.5,
   1,
   1.5,
   2,
   2.5
  ]
 },
 "andreev_lab": {},
 "atomic_spectra_lab": {
  "configuration": [
   "d8",
   "d9"
  ],
  "polarization": [
   "x",
   "y",
   "z",
   "plus",
   "minus",
   "linear"
  ]
 },
 "band_rep_lab": {
  "group": [
   2,
   4,
   19,
   221
  ],
  "site": [
   "auto",
   "origin",
   "body",
   "general",
   "faces"
  ],
  "orbitals": [
   "s",
   "p"
  ],
  "kPoint": [
   "G",
   "X",
   "Y",
   "Z",
   "M",
   "R",
   "line"
  ]
 },
 "dynamic_scattering_lab": {
  "channel": [
   "both",
   "stokes",
   "antiStokes"
  ]
 },
 "domain_wall_lab": {
  "experiment": [
   "landau",
   "ssh"
  ],
  "interface": [
   "wall",
   "uniform"
  ]
 },
 "hubbard_lab": {
  "boundary": [
   "open",
   "periodic"
  ]
 },
 "manybody_spectra_lab": {
  "experiment": [
   "single_particle",
   "response"
  ],
  "boundary": [
   "open",
   "periodic"
  ],
  "probe": [
   "local",
   "momentum"
  ],
  "spin": [
   "up",
   "down"
  ],
  "responseKind": [
   "spin",
   "charge"
  ]
 },
 "polaron_lab": {},
 "density_matrix_lab": {
  "experiment": [
   "single",
   "pair"
  ],
  "initialState": [
   "plus_z",
   "minus_z",
   "plus_x",
   "antiparallel",
   "singlet",
   "classical",
   "thermal"
  ]
 },
 "symmetry_workshop": {
  "pointGroup": [
   "c2v",
   "c3v",
   "c4v"
  ],
  "rotation": [
   1,
   0
  ],
  "mirror": [
   1,
   0
  ],
  "inversion": [
   1,
   0
  ],
  "timeReversal": [
   1,
   0
  ]
 },
 "order_parameter_lab": {
  "pointGroup": [
   "c4v",
   "oh"
  ]
 },
 "exchange_symmetry_lab": {
  "inversion": [
   0,
   1
  ],
  "mirrorXY": [
   0,
   1
  ],
  "mirrorXZ": [
   0,
   1
  ],
  "mirrorYZ": [
   0,
   1
  ],
  "rotationOrder": [
   0,
   2,
   4
  ],
  "swapSites": [
   0,
   1
  ]
 },
 "conservation_lab": {
  "experiment": [
   "pair",
   "single"
  ],
  "initialState": [
   "up",
   "down",
   "plus_x",
   "antiparallel",
   "singlet",
   "mixed"
  ],
  "observable": [
   "sx",
   "sy",
   "sz",
   "s2",
   "energy"
  ]
 },
 "salc_lab": {
  "copies": [
   1,
   2
  ],
  "targetIrrep": [
   "A1",
   "B1",
   "E"
  ],
  "seedSite": [
   0,
   1,
   2,
   3
  ],
  "operatorType": [
   "dipole",
   "scalar",
   "quadrupole",
   "axial"
  ],
  "retainC4": [
   1,
   0
  ],
  "retainMirror": [
   1,
   0
  ]
 },
 "wavevector_lab": {
  "period": [
   2,
   3,
   4
  ],
  "pattern": [
   "single",
   "multi"
  ]
 },
 "nonsymmorphic_lab": {
  "operation": [
   "glide",
   "screw"
  ],
  "spinful": [
   "true",
   "false"
  ]
 },
 "statistics_lab": {
  "mode": [
   "two",
   "three"
  ],
  "orbital": [
   "same",
   "symmetric",
   "antisymmetric"
  ],
  "spin": [
   "singlet",
   "triplet0",
   "upup"
  ],
  "swap": [
   "12",
   "23",
   "13"
  ]
 },
 "defects_lab": {
  "model": [
   "xy",
   "nematic",
   "ising"
  ],
  "texture": [
   "pair",
   "single"
  ]
 },
 "reciprocity_lab": {
  "model": [
   "hall",
   "thermo",
   "mixed"
  ],
  "space": [
   "c1",
   "c4",
   "mirror"
  ],
  "reverseM": [
   "yes",
   "no"
  ]
 },
 "layer_symmetry_lab": {
  "face": [
   "001",
   "110",
   "111"
  ],
  "bulk": [
   "mono",
   "alternating"
  ],
  "interface": [
   "same",
   "hetero"
  ],
  "termination": [
   "same",
   "marker"
  ]
 },
 "chirality_polarity_lab": {
  "motif": [
   "d3",
   "pyramid",
   "octahedron",
   "tetra"
  ],
  "handedness": [
   1,
   -1
  ],
  "optical": [
   "natural",
   "faraday"
  ]
 },
 "manybody_spt_lab": {
  "boundary": [
   "periodic",
   "open"
  ],
  "fieldPattern": [
   "gradient",
   "uniform"
  ],
  "pathAxis": [
   "anisotropy",
   "field"
  ]
 },
 "teaching_labs": {
  "lab": [
   "lie"
  ],
  "experiment": [
   "su2_coupling"
  ]
 },
 "quantum_geometry_lab": {
  "model": [
   "qwz",
   "ssh"
  ]
 },
 "crystal_field_lab": {
  "mode": [
   "crystal_field",
   "jahn_teller"
  ],
  "coordination": [
   "octahedral",
   "tetrahedral"
  ]
 },
 "band_connectivity": {
  "model": [
   "c4v",
   "rashba"
  ]
 },
 "phonon_thermo": {
  "source": [
   "compare",
   "einstein",
   "debye",
   "mesh",
   "thermal",
   "dos"
  ],
  "frequency_unit": [
   "THz",
   "cm^-1",
   "meV"
  ],
  "zero_policy": [
   "error",
   "exclude"
  ]
 },
 "shg_lab": {
  "model": [
   "gaas",
   "batio3",
   "centrosymmetric"
  ],
  "channel": [
   "PP",
   "PS",
   "SP",
   "SS"
  ],
  "cut": [
   "001",
   "111"
  ]
 }
});
