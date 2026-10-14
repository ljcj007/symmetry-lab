"""Extract literal MSGCorep datasets without executing Wolfram Language.

Source: https://github.com/goodluck1982/MSGCorep (GPL-3.0).
Reads the vendored text sources under upstream/MSGCorep; no network or Wolfram.
"""
from pathlib import Path
from fractions import Fraction
import collections
import json
import re
from paths import UPSTREAM, OUTPUT

SOURCE = UPSTREAM / 'MSGCorep/MSGData.wl'
DEST = OUTPUT
text = SOURCE.read_text(encoding="utf-8")


def literal_list(name):
    """Read a balanced literal WL list using a string-aware scanner."""
    match = re.search(r"\b" + re.escape(name) + r"\s*=\s*\{", text)
    if not match:
        raise ValueError(f"Missing list {name}")
    start = match.end() - 1
    depth = 0
    quoted = False
    escaped = False
    chars = []
    for char in text[start:]:
        if quoted:
            chars.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                quoted = False
        elif char == '"':
            quoted = True
            chars.append(char)
        elif char == "{":
            depth += 1
            chars.append("[")
        elif char == "}":
            depth -= 1
            chars.append("]")
            if depth == 0:
                return json.loads("".join(chars))
        else:
            chars.append(char)
    raise ValueError(f"Unbalanced list {name}")


def key(pair):
    return ".".join(map(str, pair))


groups = {}
for kind in (2, 3, 4):
    for bns, symbol in literal_list(f"type{kind}SymList"):
        ident = key(bns)
        groups[ident] = {
            "id": ident,
            "bns": bns,
            "family": bns[0],
            "serial": bns[1],
            "symbol": symbol,
            "bcSymbol": symbol,
            "type": kind,
        }
        if kind == 2:
            assert symbol.endswith("1'")
            bns1 = [bns[0], bns[1] - 1]
            ident1 = key(bns1)
            groups[ident1] = {
                "id": ident1,
                "bns": bns1,
                "family": bns1[0],
                "serial": bns1[1],
                "symbol": symbol[:-2],
                "bcSymbol": symbol[:-2],
                "type": 1,
            }

# Apply the exact BC-orientation exceptions documented upstream.
for kind in range(1, 5):
    block = re.search(
        rf"AssociateTo\[type{kind}MSGSymTextBC,\s*(.*?)\n\];", text, re.S
    ).group(1)
    for a, b, symbol in re.findall(r'\{(\d+),\s*(\d+)\}\s*->\s*"([^"]+)"', block):
        groups[f"{a}.{b}"]["bcSymbol"] = symbol

for og, symbol, bns in literal_list("OGDataList"):
    groups[key(bns)].update(og=og, ogId=key(og), ogSymbol=symbol)

# Type III unitary subgroup comes from subinfo. For I, II, IV the BNS
# family number already identifies the space group of unitary operations.
subblock = text[text.index("subinfo="):text.index("type3USubInfo=<||>")]
subgroups = {
    f"{a}.{b}": int(sub)
    for a, b, sub in re.findall(r"\{\s*(\d+),\s*(\d+),\s*(\d+)\s*,", subblock)
}
assert len(subgroups) == 674, len(subgroups)

operation_dir = UPSTREAM / 'MSGCorep/BC_MSG_elements'
operation_count = 0
for group in groups.values():
    group["unitarySpaceGroup"] = (
        subgroups[group["id"]] if group["type"] == 3 else group["family"]
    )
    sourcefile = operation_dir / f"BC-MSG_elem_{group['id']}.txt"
    lines = sourcefile.read_text().splitlines()
    count = int(lines[0])
    ops = []
    for line in lines[1:]:
        values = line.split()
        if not values:
            continue
        assert len(values) == 21, (sourcefile, values)
        rot = [int(x) for x in values[:9]]
        rawtrans = [float(x) for x in values[9:12]]
        fractions = [Fraction(x).limit_denominator(48) for x in rawtrans]
        assert all(abs(float(f) - x) < 1e-6 for f, x in zip(fractions, rawtrans))
        spin = [float(x) for x in values[12:20]]
        ops.append({
            "rotation": [rot[i:i+3] for i in (0, 3, 6)],
            "translation": [float(f) for f in fractions],
            "translationExact": [str(f) for f in fractions],
            "spinRotation": [[spin[0:2], spin[2:4]], [spin[4:6], spin[6:8]]],
            "antiunitary": int(values[20]) == -1,
        })
    assert len(ops) == count, sourcefile
    group["operations"] = ops
    group["order"] = count
    group["unitaryOrder"] = sum(not op["antiunitary"] for op in ops)
    operation_count += count

points = []
for seq, number, ident, longid, symbol, usubg, kind, msg in literal_list("MPGinfo"):
    ops = []
    seen = set()
    for op in groups[key(msg)]["operations"]:
        opkey = json.dumps([op["rotation"], op["antiunitary"]])
        if opkey not in seen:
            seen.add(opkey)
            ops.append(dict(op, translation=[0, 0, 0], translationExact=["0", "0", "0"]))
    points.append({
        "id": ident,
        "sequence": seq,
        "number": number,
        "numberLong": longid,
        "symbol": symbol,
        "unitaryPointGroup": usubg,
        "type": kind,
        "representativeMSG": msg,
        "operations": ops,
        "order": len(ops),
    })

counts = collections.Counter(g["type"] for g in groups.values())
assert counts == {1: 230, 2: 230, 3: 674, 4: 517}, counts
assert len(groups) == 1651
assert len(points) == 122
assert len({g["ogId"] for g in groups.values()}) == 1651
assert {g["og"][2] for g in groups.values()} == set(range(1, 1652))

meta = {
    "source": "https://github.com/goodluck1982/MSGCorep",
    "sourceFiles": ["MSGData.wl", "BC_MSG_elements/BC-MSG_elem_*.txt"],
    "license": "GPL-3.0",
    "convention": "Bradley-Cracknell (BC), primitive-cell fractional coordinates",
    "spinPrecision": "Six decimal places, as distributed by upstream",
}
DEST.mkdir(parents=True, exist_ok=True)
(DEST / "magnetic-groups.json").write_text(
    json.dumps(dict(meta, groups=sorted(groups.values(), key=lambda x: x["bns"])),
               ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
)
(DEST / "points.json").write_text(
    json.dumps(dict(meta, points=points), ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8"
)
print(json.dumps({"groups": len(groups), "types": counts, "points": len(points),
                  "operations": operation_count, "destination": str(DEST)}, indent=2))
