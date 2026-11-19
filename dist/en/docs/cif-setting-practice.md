# Compare three setting declarations for the same CIF cell

Return to the [standard-cell lesson](../#classroom/crystal?track=space&tab=learn&lesson=space-06) or open the [space-group 4 CIF setting exercise](../#structure?cif-setting=practice). The three inputs share a cell and two independent sites and differ only in the setting declaration. The exercise adapts the site's Na/Cl teaching CIF by swapping the original b and c axes. The resulting cell has a = 3 Å, b = 5 Å, c = 4 Å, α = β = 90°, and γ = 101.2°.

1. **Predict the screw axis.** α is the angle between b and c, β between a and c, and γ between a and b. Use these angles to identify the basis vector perpendicular to the other two. Then predict which half-turn preserves the oblique angle between a and b.
2. **Compare two successful conversions.** Choose “Load the number-only CIF” and “Load the P 2c CIF” in turn and run the BC conversion each time. Compare the input setting, the expanded atom count, and the validation checks for transported operations and the original BC generators.
3. **Check the conflict.** Choose “Load the P 2yb CIF” and run the conversion on the same oblique cell. Read the cell-metric error, then reload either compatible input and check that the conversion works again.

| Input declaration | Input setting used to expand the CIF | Expected conversion |
| --- | --- | --- |
| International number 4 only | The metric leaves P 2c as the only compatible setting, Hall database record 7 | Identifies space group 4, expands to four atoms, and passes structure validation |
| Explicit P 2c | 2₁ screw along the input c axis, Hall database record 7 | Identifies space group 4, expands to the same four atoms, and passes structure validation |
| Explicit P 2yb | Declares a 2₁ screw along the input b axis | Reports that the rotation fails to preserve the input-cell metric |

The input c axis is perpendicular to a and b. A half-turn about c reverses both a and b and preserves their dot product. The fractional-coordinate matrix specified by P 2yb reverses a and keeps b fixed. This changes the nonzero a·b, so the matrix cannot represent a rigid half-turn in this cell. The screw's half-lattice translation leaves the metric unchanged. The test for the rotation is `Rᵀ G R = G`, where `G` stores the dot products of the input basis vectors.

Both successful conversions report Hall database record 6, P 2yb, for the standardized coordinates. Expansion of the original CIF uses record 7 along the input c axis. Inspect the coordinate transformation and operation-transport checks to explain how both records describe the same space-group type. The integer in the Hall database identifies its record. International space-group number 4 in the CIF identifies the group type.

The metric determines a setting from these candidates only when a single candidate survives. At γ = 90° in this example, the rotations for all three candidate axes preserve the metric. When several candidates survive, consult the original file for an explicit Hall symbol or symmetry operations. See the [CIF input conventions and conversion limits](structure-bc.md#accepted-files).

See the IUCr definitions of the [international space-group number](https://www.iucr.org/__data/iucr/cifdic_html/1/cif_core.dic/Ispace_group_IT_number.html) and the [Hall symbol](https://www.iucr.org/__data/iucr/cifdic_html/1/cif_core.dic/Ispace_group_name_Hall.html).

<a id="dotted-cif-replay"></a>

## Compare dotted and underscore names

1. In the [CIF setting exercise](../#structure?cif-setting=practice), choose “Load the P 2c CIF.” Keep the input wavevector `(0,0,1/4)` and run the conversion. Record the input Hall setting, expanded atom count and BC wavevector, or download the complete JSON.
2. Choose “Load the dotted P 2c CIF,” keep the wavevector and tolerances fixed, and run the conversion again. Both inputs share the cell, sites and Hall symbol. Legacy names such as `_cell_length_a`, `_space_group_name_Hall` and `_atom_site_fract_x` become `_cell.length_a`, `_space_group.name_Hall` and `_atom_site.fract_x`. Expect zero differences in the lattice, fractional positions and BC wavevector. Both runs pass the same structure validation checks.

Both runs identify space group 4, expand to four atoms using input Hall record 7 `P 2c`, and report standardized Hall record 6 `P 2yb` with BC wavevector `(0,0,−1/4)`. In the complete JSON, compare `source_tags` and `source_site_rows` under `input_metadata`. The metadata records data names in lowercase and retains their input punctuation. The source card computes SHA-256 from the original text, so the two inputs have different digests.

To test duplicate detection, add `_cell_length_a 3` on a new line before `loop_` in the dotted input. It declares the same data item as `_cell.length_a 3` even though their values agree. Remove the duplicate line to run the conversion again.

This compatibility covers a fixed set of Core CIF names for importing ordered, three-dimensional small crystal structures. See the [IUCr COMCIFS Core CIF v3.3.0 dictionary](https://github.com/COMCIFS/cif_core/blob/v3.3.0/cif_core.dic) for field names and aliases and the [CIF input conventions](structure-bc.md#accepted-files) for import scope.

<a id="cif-reciprocal-replay"></a>

## Compare equivalent and opposite wavevectors with the same CIF

Predict which two BC primitive coordinates among `−1/4`, `3/4` and `+1/4` differ by a reciprocal-lattice vector. Use the site's fixed space-group 4 screw representative `s = {C₂z | (0,0,1/2)}`. Squaring it translates by one lattice period along the third BC basis vector. Under the active translation convention, predict `exp(−2πi k_z)` for each wavevector.

1. Open the [CIF setting exercise](../#structure?cif-setting=practice) and choose “Load the P 2c CIF.” Keep `k_x = k_y = 0` and convert with the initial `k_z = 1/4`. Open the representation workbench with this source, keep single-valued representations selected, and run the calculation.
2. Return to the same structure exercise. Each time, load the same P 2c CIF, then enter `-3/4` and `-1/4` in turn for `k_z` on the **structure conversion page**. Convert each input and open the representation workbench with the source. Each calculation then has its own change-of-basis record.
3. Check the `C₂z` column in the character table and inspect the k-star. Each single-valued representation in this example is one-dimensional, so squaring either screw character gives the translation phase you predicted. Compare the pair of characters together.

| Input `k_z` on the structure page | Converted BC `k_z` | BC `C₂z` characters | Squared character |
| ---: | ---: | --- | --- |
| `1/4` | `−1/4` | `±(1+i)/√2` | `+i` |
| `−3/4` | `3/4` | `±(1+i)/√2` | `+i` |
| `−1/4` | `+1/4` | `±(1−i)/√2` | `−i` |

All three calculations give one star arm and a little group of order two. The first two reduce to the same BC representative `(0,0,−1/4)`. Copying the initial `+1/4` directly into the BC coordinates gives the opposite wavevector in the third row. The little-group order stays the same. The conjugate characters reveal the difference.

**Why do the two BC labels swap?** With the same Seitz representative `s`, the first two calculations give the same set of screw characters. Let `u = k_z`. The site evaluates the label branches `±exp(−iπu)` at the original BC parameter entered in the workbench. Since `exp(−iπ(u+1)) = −exp(−iπu)`, each branch changes sign from `u = −1/4` to `u = 3/4`. The same character `+(1+i)/√2` is labelled Λ₁ in the first calculation and Λ₂ in the second. D1 and D2 identify rows in each numerical table. Compare the character values for the fixed representative.

**Optional extension.** From the CIF conversion result, choose diffraction with the input cell. Keep the constant scattering weights for `Na` and `Cl` at 1. Run the input-cell reflections `001` and `002`. For `001`, the two sites of each species are separated by half a period along c. Their complex amplitudes cancel and the model intensity is 0. The model intensity for `002` is about 2.900608, with plane spacings of 4 Å and 2 Å for the two reflections respectively. The reflection indices here are integers in the input-cell basis. The representation calculation above uses fractional wavevectors in the BC primitive basis.
