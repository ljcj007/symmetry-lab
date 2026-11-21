import {activityAliases} from './learning-activity-aliases.js?v=20261122-nextpaths1';

// Each activity has one destination for both the runtime finder and the generated catalog.
export const learningActivities = [
  {
    route: 'compute/phonon-modes?preset=zno-ir',
    title: "ZnO Γ-point infrared and Raman selection rules",
    summary: "Check the vanishing infrared projection for the E₂ modes, then compare normalized Raman weights for parallel and crossed polarizations.",
    keywords: "wurtzite zinc oxide ZnO Raman infrared polarization E2 phonon optical spectrum selection rules",
    kind: "Lesson",
    activityAliases: activityAliases.znoRaman
  },
  {
    route: 'classroom/foundations?module=mini&experiment=bands&preset=rashba-trim-check',
    title: "Time-reversal test in a Rashba model",
    summary: "Compare the spectra at opposite wavevectors, then use the Hamiltonian to test time reversal for two Zeeman field settings.",
    keywords: "Rashba TRIM Kramers Zeeman time reversal symmetry Hamiltonian spin orbit gap",
    kind: "Lesson",
    activityAliases: activityAliases.rashbaTimeReversal
  },
  {
    route: 'classroom/foundations?module=demos&experiment=projection&preset=triangle-permutation',
    title: "Rank of triangle projectors",
    summary: "Translate the S₃ class order to the D₃ order, then verify the ranks of three projectors column by column.",
    keywords: "triangle projector rank projection matrix S3 D3 character reduction",
    kind: "Lesson",
    activityAliases: activityAliases.triangleProjection
  },
  {
    route: 'classroom/crystal?track=double&lesson=double-06',
    title: "Spinful screw eigenvalues and the space-group workbench",
    summary: "Run the twofold screw demonstration, then carry the selected axial wavevector to the double-valued workbench for space group 4.",
    keywords: "double valued spinful twofold screw eigenvalue workbench spinor 2_1 Bloch phase wavevector",
    kind: "Lesson",
    activityAliases: activityAliases.doubleScrew
  },
  {
    route: 'classroom/spin?track=magnetic&lesson=magnetic-04',
    title: "Antiunitary screw and zone-boundary degeneracy",
    summary: "Use three off-axis wavevectors in BNS 4.8 to distinguish momentum returning to itself from equal-energy pairing.",
    keywords: "antiunitary screw nodal plane zone boundary time reversal BNS 4.8 magnetic little group degeneracy",
    kind: "Lesson",
    activityAliases: activityAliases.antiunitaryScrew
  },
  {
    route: 'classroom/crystal?track=space&lesson=space-04',
    title: "Conjugate site stabilizers in quartz",
    summary: "Use the original 298 K α-quartz CIF to check the lattice correction and the Si permutation character.",
    keywords: "quartz COD 9005017 site stabilizer conjugacy silicon oxygen CIF character",
    kind: "Lesson",
    activityAliases: activityAliases.quartzStabilizers
  },
  {
    route: 'classroom/structure-dynamics?tab=learn&lesson=screw-glide',
    title: "Screw extinctions and chirality in α-quartz",
    summary: "Calculate axial reflections and a Friedel pair from the original CIF. Compare complex amplitudes and intensities before and after inversion.",
    keywords: "quartz screw extinction Friedel pair chirality diffraction COD 9005017",
    kind: "Lesson",
    activityAliases: activityAliases.quartzExtinction
  }
];
