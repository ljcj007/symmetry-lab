# Test thermal expansion with the multi-volume Cu data

Open the experiment from the [quasi-harmonic approximation lesson](../#classroom/observables?module=qha). After loading the Phonopy Cu example, check that the static energies and thermal files follow the same volume order, then run the calculation. These inputs come from the public Phonopy regression example. Each input calculation cell contains four atoms.

## Why do we need several volumes?

A fixed-volume phonon calculation provides the vibrational free energy for that volume. At each temperature, the quasi-harmonic approximation combines the static energies, vibrational free energies, and pressure terms at several volumes. It then searches for a Gibbs free energy minimum within the volume samples. Check that all energies refer to the same input cell. The thermal-property files give vibrational free energy in kJ per mole of input cells, and the static energies are in eV per input cell.

```text
G(V,T;p) = E_static(V) + F_vib(V,T) + pV
```

Try zero pressure, a cubic polynomial, and five local volume samples. At 300 K, find the lowest sampled point on the free energy curve. Compare it with the fitted equilibrium volume and inspect the fit warning. Change the fitting window to check how sensitive the answer is to the selected samples.

Now select 2500 K. The lowest sampled point is at the edge of the volume range, so these data give no interior equilibrium volume. Use this result to test when the algorithm reports a boundary. Assessing the physical stability of a high-temperature phase also requires the phase diagram and the model assumptions.

## Original inputs and fitting method

The static energies come from `e-v.dat`. The eleven compressed files from `thermal_properties.yaml-00.xz` to `thermal_properties.yaml-10.xz` contain the thermal properties in volume order. The volume and atom count of each file must agree with the corresponding row. All files use the same temperature grid from 0 to 2500 K in steps of 10 K.

The [local source manifest](../data/examples/phonopy-cu-qha/source.json) lists the bytes, hash, volume, and upstream path of each original file. Download the [original static-energy table](../data/examples/phonopy-cu-qha/e-v.dat), the [complete calculator input](../data/examples/phonopy-cu-qha/payload.json), and the [upstream license](../data/examples/phonopy-cu-qha/LICENSE.txt).

The site fits a low-order polynomial around the lowest sampled point and checks local curvature and the sampled interval. The standard Phonopy command also offers alternative equations of state. When comparing the results, first check the raw free energy at the same volume and temperature, then explain differences between the fits.

See the [original Cu-QHA inputs at the pinned Phonopy revision](https://github.com/phonopy/phonopy/tree/18cad919af8fe8aad349e04f101887fa19b051a0/test/cui/phonopy_qha/Cu-QHA) and the [official regression script using these inputs](https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/test/cui/phonopy_qha/test_phonopy_qha_script.py). The [fixed-volume Cu thermal example](cu-thermal-example.md) provides a check against volume index 05 in this data set.
