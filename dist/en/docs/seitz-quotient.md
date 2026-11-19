# Why can different space groups have the same point group?

[Open Lesson 1 on space groups](../#classroom/crystal?track=space&lesson=space-01). Predict what happens after two applications of a half turn or a screw operation, then track the position at each step. You can also continue here from the [point-group identification exercise](../#classroom/foundations?lesson=thirty-two).

## Two results of an operation product

In fractional coordinates of the BC direct primitive cell, the operation `{R|t}` sends a column vector `r` to `Rr+t`. The rightmost operation acts first.

```text
{R₁|t₁}{R₂|t₂} = {R₁R₂|t₁+R₁t₂}
t₁+R₁t₂ = t_rep + L
```

First calculate the full translation in unwrapped space. Then find the representative of the coset with the same linear matrix `R₁R₂` in the table. The difference `L` is an integer primitive lattice translation. It records the displacement across cell boundaries. The full product and the chosen representative map any point to the same wrapped position.

## Compare rotations, screws, and glides

| BC groups | Operations to compare | Result of repeated applications |
| --- | --- | --- |
| 3 P2 and 4 P2₁ | The same half turn about the third primitive basis vector. The screw includes a half-cell displacement. | Both linear parts square to the identity. The unwrapped positions move by `(0,0,0)` and `(0,0,1)`, respectively. |
| 6 Pm and 7 Pc | The same reflection. In the site’s BC setting, group 7 glides half a cell along the first primitive basis vector. | Both linear parts square to the identity. The unwrapped positions move by `(0,0,0)` and `(1,0,0)`, respectively. |
| 76 P4₁ and 77 P4₂ | Fourfold screws along the third primitive basis vector, with displacements of one quarter and one half of a cell. | Four applications leave `(0,0,1)` and `(0,0,2)`, respectively. The square of P4₂ already moves one cell beyond the chosen twofold representative. |

The translations are in units of the specified BC primitive basis. An origin shift changes the translation column of an individual operation. For example, the listed inversion of group 227 has quarter-cell components in its translation column, but the total translation vanishes after two applications. Testing one row for a zero translation cannot establish whether the space group is symmorphic.

## Read the Bloch phase of a translation

Under the active translation convention `T(L)ψ(r)=ψ(r−L)`, translation of a Bloch state at the reciprocal fractional coordinates `k` contributes the phase `exp(−2πi k·L)`. Squaring the P2₁ screw advances one cell along the third primitive vector, giving `−1` at `k=(0,0,1/2)` and `+1` at `Γ`.

This factor describes the extra translation on a specified Bloch state. If the linear action moves `k` to another fibre, the translation acts on the output fibre. First check the little-group condition `R⁻ᵀk = k + K`. A full representation also requires the basis functions and their other transformations. The workshop uses quarter-integer wave vectors so the real and imaginary parts can be checked directly.

## Data and sources

The demonstrations read the linear matrices and translation representatives of all [230 BC primitive space groups](../../data/space-groups.json). The matrices are integers, and translations are stored as integer numerators in twelfths. The operation table is computed from the products of these matrices and translations.

See the [IUCr Commission report on Seitz notation and multiplication](https://journals.iucr.org/a/issues/2014/03/00/es0405/index.html) and the [classification by Nespolo, Aroyo, and Souvignier](https://journals.iucr.org/j/issues/2018/05/00/in5013/index.html) for the relationship between space groups, the normal translation subgroup, and point-group types.
