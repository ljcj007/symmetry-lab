# Order parameters, residual symmetry and invariants

This experiment uses a C₄ᵥ 2D polar vector and O_h 3D polar vector, constructing 8 and 48 integer orthogonal matrices by generator closure. It is finite-point-group teaching code, not an ISODISTORT call or a calculation of arbitrary 3D space-group irreps, real atomic distortions, or translation domains.

## Automatic derivation

Apply complete Reynolds averaging to every degree-2, -4 and -6 monomial, discard zero and duplicate images, and normalize independent orbit sums to minimal integer coefficients. Dimensions by degree are 1, 2, 2 for C₄ᵥ and 1, 2, 3 for O_h. A complete basis is:

- Second order: `I2 = Ση_i²`;
- Fourth-order `I4a = Ση_i⁴`, `I4b = Σ_{i<j}η_i²η_j²`;
- Degree six: `I6a = Ση_i⁶`, `I6b = Σ_{i≠j}η_i⁴η_j²`, with `I6c = η_x²η_y²η_z²` additionally in three dimensions.

The specified free energy is `F = a2 I2 + b4 I4a + c4 I4b + d6 I6a + e6 I6b + f6 I6c − fieldX η_x`. In 2D, `etaZ` and `f6` are ignored. Monomial transforms, signs, and coefficient relations are shown for each generator. Allowed-term coefficients come from inputs, not symmetry.

## States, symmetry groups, and orbits

For a specified η, test `D(g)η=η` to obtain the stabilizer, use `Gη` for the parent-group orbit and verify orbit–stabilizer. Operation comparisons use an absolute threshold `1e−9`; note threshold effects near special directions. The zero vector retains the entire parent group.

After explicit field breaking, the field stabilizer and its intersection with the state stabilizer are reported separately. Parent-group orbits remain visible for energy splitting, but are no longer all degenerate domains. A specified order-parameter direction does not prove a corresponding equilibrium phase.

Radial plots scan the full selected line; polynomials supply all real stationary points/radial curvatures. Angular plots fix xy radius/z, scanning  azimuth  only. Radial minima need not be multidimensional minima; finite windows do not prove global stability. `d6>0`, `e6≥0`, and 3D `f6≥0` are sufficient boundedness conditions. Failure means uncertified, not necessarily unbounded.

## Convention comparison

Columns of Q are the new coordinate axes expressed in the old frame. Passive transformations are `η′=Qᵀη`, `D′=QᵀDQ`, `h′=Qᵀh` and `F′(η′)=F(Qη′)`. Energy and matrix-action covariance are checked together. Rotating only the vector while retaining the old energy expression generally actively changes the physical state.

## API and results

Call `order_parameter_lab.calculate(payload)`. Input `pointGroup=c4v|oh`; absolute `etaX,etaY,etaZ,a2,b4,c4,d6,e6,f6,fieldX` ≤5; `basisAngle` ±360°. All values finite; booleans/numeric strings reject.

Results follow the shared `summary/plots/tables/checks/warnings/formulaLinks` convention. `order` includes:

- `operations`: actual matrices, transformed vectors, and state/field preservation;
- `domains`: parent-orbit vectors/current energies;
- `invariants`: degrees, monomial exponents, integer coefficients and current values;
- `constraintSources`: generator matrices, exponents before/after transformation, signs, coefficient relations;
- `convention`: passively transformed vectors, fields, operations, energies, residuals;
- `stationaryRadii`: all real stationary points on the selected line, not a complete phase diagram.

The page contains 3 lessons, 12 derivation steps, 3 material/model cases, 6 presets, and 2 prediction questions. BaTiO₃ supplies physical context for polarization directions; numerical parameters are original teaching settings, not experimental fits.

Validation `python scripts/test-python-order-parameter.py`: independent Newton identities compute symmetric-power  character /Molien dimensions; check all-operation invariance, orbits/ stabilizer , field splitting, nontrivial coordinates, analytic radial extrema, all presets, and finite JSON.

References: [ISODISTORT methods and scope](https://iso.byu.edu/isodistorthelp.php), [ISOTROPY invariant and order-parameter manual](https://iso.byu.edu/isotropy_doc.php). These verify concepts; the implementation copies neither their databases nor source code.
