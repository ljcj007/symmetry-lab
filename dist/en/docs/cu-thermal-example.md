# Official Cu thermal-properties file experiment

In the Phonon Thermodynamics classroom, open Which phonon data can determine bulk heat capacity? and choose Load the official Cu thermal calculation. Alternatively, choose thermal_properties.yaml in Calculation Center → Phonon Thermodynamics, then load Cu. Check the units after loading and run manually; loading does not submit a calculation.

## File source and identity

The data are existing fixed-volume calculation output from volume index 05 of the official Phonopy Cu-QHA tests. The site retains the original XZ and its byte-exact decompressed YAML without editing values, units, or comments. These are neither experimental data nor a new first-principles calculation performed by the site.

- [Pinned original compressed file](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/test/cui/phonopy_qha/Cu-QHA/thermal_properties.yaml-05.xz)
- [Byte-exact decompressed YAML](../data/examples/phonopy-cu-thermal-index05.yaml)
- [Original XZ archive](../data/examples/phonopy-cu-thermal-index05.yaml.xz)
- [Full provenance and validation record](../data/examples/phonopy-cu-thermal-source.json)
- [Full BSD 3-Clause license](../data/examples/phonopy-cu-LICENSE.txt)
- [Official Phonopy output-file documentation](https://phonopy.github.io/phonopy/output-files.html#thermal-properties-yaml)

The pinned commit is 18cad919af8fe8aad349e04f101887fa19b051a0. The YAML has 41975 bytes and SHA-256 1c9e6edeeded194fc7eebe9c4f4bd6e88728b48ea4f530a033240f8394267bf1; the XZ has 4900 bytes and SHA-256 36c87fc5560cc7815cd9d97105830c00cffa4a3a2fb486235d7976bc493ebb1f. In calculation records, verificationBasis=parsed-utf8-content identifies the actual UTF-8 text passed to the calculator, rather than an arbitrary local file's raw bytes or name.

## Predict, then check the normalization basis

The file declares natom=4 and contains 251 temperatures from 0 to 2500 K. A mole refers to a mole of input calculation cells, each containing four Cu atoms. The original molar values must not be interpreted directly as per mole of Cu atoms or one-atom primitive cells.

Predict how the heat capacity would change when expressed per mole of Cu atoms. Then check the high-temperature mode-counting limit 3nR. It is 12R for this input cell, and becomes 3R per mole of atoms. The site retains the input-cell basis and does not automatically divide by four.

## Calculate and explain

After running, select 300 K and inspect free energy F, entropy S, constant-volume heat capacity Cv, and internal energy U. The original file gives F=-8.9186518 kJ/mol, S=134.5650065 J/(mol K), and Cv=94.8384329 J/(mol K), all per input calculation cell.

Write the unit conversion before calculating U=F+TS/1000. At 300 K, U=31.45085015 kJ/mol input cells; the original energy value is 31.4508501. The final-digit discrepancy reflects the printed precision. Across the table, the largest difference from the original energy column is 1.68×10⁻⁷ kJ/mol. F, S, and Cv retain the input values.

Use the temperature slider to compare 0 K with high temperature. At 0 K, entropy and heat capacity vanish, but F=U=11.3271895 kJ/mol input cells retains the zero-point energy. Explain why nonzero zero-point energy does not imply nonzero heat capacity at zero temperature.

## Counterexamples and scope

Question 1: Does multiplying both heat capacity and temperature by four merely change the normalization basis? Answer: The molar basis of heat capacity depends on the atom count. Temperature does not scale with the number of atoms in the cell.

Question 2: Can frequencies along a band.yaml path replace full Brillouin-zone integration? Answer: No. Path sampling is not a weighted three-dimensional mesh. The imported-data controls distinguish a mesh, total DOS, and existing thermal curves.

Question 3: Can one thermal_properties.yaml yield thermal expansion, Cp, or thermal conductivity? Answer: It lacks complete static E(V), a multiple-volume free-energy fit, phonon lifetimes, and eigenvectors. This experiment therefore displays fixed-volume vibrational thermal properties. The file alone also cannot establish stability or mesh convergence of the production calculation.

## Save and reproduce

The result JSON retains the input text and calculation output. When the original content is recognized, it includes the pinned version, content hash, and Cu source identity. Use Save to Material Research Records to include the calculation in an explicit research workflow. File reading and example loading occur in the browser. You can cancel or replace a pending input and must run manually after loading. Editing the text invalidates the old result and requires a new calculation.
