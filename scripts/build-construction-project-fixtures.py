"""Build actual core calculations and grading diagnostics for nine project stages."""
import gzip
import hashlib
import importlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist/python"))
import symmetry_grading

requests = json.loads(subprocess.check_output(
    ["node", "scripts/test-construction-projects.mjs", "--requests"], cwd=ROOT, encoding="utf-8"))
results, grading = {}, {}
for key, request in requests.items():
    result = importlib.import_module(request["action"]).calculate(request["input"])
    results[key] = result
    if result.get("grading", {}).get("tasks"):
        task = result["grading"]["tasks"][0]
        variants = {}
        for variant in ("equivalent", "wrong"):
            example = symmetry_grading.calculate(dict(task=task, mode="example", example=variant))
            variants[variant] = symmetry_grading.calculate(dict(task=task, answer=example["candidate"]))
        grading[key] = variants

sources = ["salc_lab.py", "wavevector_lab.py", "nonsymmorphic_lab.py", "band_rep_lab.py", "symmetry_core.py", "symmetry_grading.py"]
hashes = {name: hashlib.sha256((ROOT / "dist/python" / name).read_text(encoding="utf-8").encode("utf-8")).hexdigest() for name in sources}
payload = dict(format="real-python-construction-project-fixtures", requests=requests, results=results,
               grading=grading, sourceHashNormalization="utf8-lf-v1", sourceHashes=hashes)
raw = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")
target = ROOT / "scripts/fixtures/construction-projects.json.gz"
target.write_bytes(gzip.compress(raw, mtime=0))
print(f"Built {len(results)} actual stages and {len(grading)} grading pairs: {len(raw)} JSON bytes; {target.stat().st_size} gzip bytes")
