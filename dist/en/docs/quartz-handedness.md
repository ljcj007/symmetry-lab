# α-quartz at 298 K and the orientation of the basis

The original file is a byte-preserved public copy of COD 9005017, revision
291351, for the 298 K X-ray structure reported by Kihara. It includes the
anisotropic displacement data. The two POSCAR files describe geometry derived
from this source. Their headers identify each transformation. [COD record](https://qiserver.ugr.es/cod/9005017.html) · [Paper](https://doi.org/10.1127/ejm/2/1/0063) · [Source and hashes](../data/examples/quartz-298k/source.json)

The lattice vectors are the rows of `L`, and a fractional position `x` has
Cartesian coordinates `xL`. The active inversion negates the fractional
positions modulo integer translations while holding `L` fixed. The passive
control also negates `L`, so the atomic positions remain the same modulo a
lattice translation. The POSCAR controls preserve those lattice vectors
explicitly, including the left-handed basis of the passive control.

| File | Space group | Standard Hall number | Positions | BC +120° screw translation along the third axis |
| --- | ---: | ---: | ---: | ---: |
| Original CIF | 154 | 443 | 9 | 2/3 |
| Active inversion | 152 | 441 | 9 | 1/3 |
| Passive basis change | 154 | 443 | 9 | 2/3 |

Run each file in the [structure workbench](../#structure?quartz-hand=practice).
Then use [CrystKit](../#crystkit?preset=quartz-handedness) to test the complete
operation sets from the standard group catalog. In the finite comparison
between groups 154 and 152, `I` does not match. Allowing `−I` gives a match
with `o=(0,0,−1/2)` in the convention `x_old=B x_new+o`. Standardizing the
passive control gives the same group as the original and matches by `I`.
These observations concern the three geometries and their operation sets.
Optical rotation requires a specified measurement and handedness convention.
[IUCr discussion of quartz conventions](https://doi.org/10.1107/S1600576722005945)

Rebuild and independently convert both control files with
`python scripts/build-quartz-handedness.py --check` after installing the
requirements in `dist/python/requirements.txt`.
