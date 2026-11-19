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
