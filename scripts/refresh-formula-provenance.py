"""Refresh formula display provenance after final source edits.

python scripts/refresh-formula-provenance.py
python scripts/refresh-formula-provenance.py --check

Existing release versions, dates, counts, coverage and references are preserved.
Only existing files/modules hashes and optional byte counts are refreshed.
--check compares expected manifests without modifying any file or its mtime.
This script does not edit calculation code, rebuild catalogs, package or deploy.
"""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "20261029-math1"
DATE = "2026-10-29"
BACKUP = "backup/2026-10-29-before-formula-fix"
BASE_COMMIT = "6514b43e9153315d857be59668a0790b4ca40993"
TEXT_EXTENSIONS = {".py", ".js", ".mjs", ".cjs", ".json", ".html", ".css", ".md", ".txt", ".svg", ".yaml", ".yml", ".toml", ".csv"}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def serialized(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def content(path):
    # Universal newline conversion normalizes CRLF to LF for text only.
    if path.suffix.lower() in TEXT_EXTENSIONS:
        return path.read_text(encoding="utf-8").encode("utf-8")
    return path.read_bytes()


def file_entry(name):
    raw = content(ROOT / name)
    return {"path": name, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}


def refresh_rows(rows):
    if isinstance(rows, dict):
        entries = [(name, row) for name, row in rows.items() if isinstance(row, dict)]
    elif isinstance(rows, list):
        entries = [(row.get("path"), row) for row in rows if isinstance(row, dict)]
    else:
        return
    for name, row in entries:
        if not name or "sha256" not in row:
            continue
        updated = file_entry(name)
        row["sha256"] = updated["sha256"]
        if "bytes" in row:
            row["bytes"] = updated["bytes"]


def refresh_existing_manifests():
    outputs = {}
    for path in sorted((ROOT / "dist/data").glob("*provenance.json")):
        if path.name == "formula-display-provenance.json":
            continue
        data = read_json(path)
        refresh_rows(data.get("files"))
        refresh_rows(data.get("modules"))
        outputs[path] = data
    return outputs


def formula_counts():
    count = 0
    unique = set()
    files = set()

    def walk(value, path):
        nonlocal count
        if isinstance(value, dict):
            for key, item in value.items():
                if isinstance(item, str) and (key == "formula" or key.lower().endswith("formula")):
                    count += 1
                    unique.add(item)
                    files.add(path.name)
                walk(item, path)
        elif isinstance(value, list):
            for item in value:
                walk(item, path)

    for path in sorted((ROOT / "dist/data").glob("*.json")):
        if path.name.endswith("provenance.json"):
            continue
        walk(read_json(path), path)
    return {"formulaOccurrences": count, "uniqueFormulaStrings": len(unique), "formulaDataFiles": len(files)}


def release_manifest():
    required = {
        "README.md", "package.json", "dist/index.html", "dist/app.js",
        "dist/math-svg.js", "dist/docs/formula-display.md",
        "scripts/refresh-formula-provenance.py",
        "dist/vendor/katex/katex.mjs", "dist/vendor/katex/katex.min.css",
        "dist/vendor/katex/LICENSE", "dist/vendor/katex/provenance.json",
    }
    # Keep the display release reproducible without a Git checkout or .openai files.
    # Front-end entry assets include shared helpers and cache-version integration.
    names = set(required)
    for pattern in ("*.js", "*.css", "*.html"):
        names.update(path.relative_to(ROOT).as_posix() for path in (ROOT / "dist").glob(pattern))
    for pattern in ("test*math*.mjs", "test*formula*.mjs", "test*math*.py", "test*formula*.py"):
        names.update(path.relative_to(ROOT).as_posix() for path in (ROOT / "scripts").glob(pattern))
    names.update(path.relative_to(ROOT).as_posix() for path in (ROOT / "dist/vendor/katex").rglob("*") if path.is_file())
    notation = [name for name in names if name.startswith("dist/") and "notation" in name]
    renderers = [name for name in names if name.startswith("dist/") and "math" in name and ("render" in name or name.endswith("math-display.js"))]
    math_css = [name for name in names if name.startswith("dist/") and name.endswith(".css") and any(part in name for part in ("formula", "math"))]
    tests = [name for name in names if name.startswith("scripts/test") and any(part in name for part in ("formula", "math"))]
    if not notation or not renderers or not math_css or not tests:
        raise FileNotFoundError("Wait for notation, renderer, formula CSS and tests before refreshing this release")
    vendor = read_json(ROOT / "dist/vendor/katex/provenance.json")
    if vendor.get("version") != "0.19.1" or vendor.get("license") != "MIT":
        raise ValueError("Expected the reviewed local KaTeX 0.19.1 MIT assets")
    font_names = [name for name in names if name.endswith(".woff2")]
    counts = formula_counts()
    counts.update(localWoff2Fonts=len(font_names), rendererAssets=len(notation) + len(renderers) + len(math_css) + 1, testFiles=len(tests))
    return {
        "schema": "symmetry-lab-formula-display-provenance-1",
        "release": RELEASE, "date": DATE,
        "scope": "Presentation-only formula, inline script and SVG label typesetting; original physical inputs, calculation cores, datasets, MathML and JSON exports are preserved",
        "backup": {"branch": BACKUP, "commit": BASE_COMMIT, "url": "https://github.com/ljcj007/symmetry-lab/tree/" + BACKUP},
        "counts": counts,
        "dependencies": [{"name": "KaTeX", "version": "0.19.1", "license": "MIT", "source": vendor["source"], "localOnly": True, "manifest": "dist/vendor/katex/provenance.json"}],
        "sources": [
            {"title": "KaTeX official source", "url": "https://github.com/KaTeX/KaTeX"},
            {"title": "KaTeX supported functions", "url": "https://katex.org/docs/supported"},
            {"title": "KaTeX options", "url": "https://katex.org/docs/options"},
        ],
        "hashConvention": "SHA-256 of UTF-8 text normalized to LF; binary files hashed without conversion",
        "refreshCommand": "python scripts/refresh-formula-provenance.py",
        "verifyCommand": "python scripts/refresh-formula-provenance.py --check",
        "files": [file_entry(name) for name in sorted(names)],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare expected manifests without writing")
    args = parser.parse_args()
    outputs = refresh_existing_manifests()
    new_manifest = release_manifest()
    outputs[ROOT / "dist/data/formula-display-provenance.json"] = new_manifest
    changed = []
    for path, data in outputs.items():
        expected = serialized(data)
        if not path.exists() or path.read_text(encoding="utf-8") != expected:
            changed.append(path.relative_to(ROOT).as_posix())
            if not args.check:
                path.write_text(expected, encoding="utf-8", newline="\n")
    print("Formula display counts:", json.dumps(new_manifest["counts"]))
    if args.check and changed:
        raise SystemExit("Stale provenance; refresh after final edits:\n" + "\n".join(changed))
    print(("Verified" if args.check else "Refreshed") + f" {len(outputs)} provenance manifests; {len(changed)} changed.")


if __name__ == "__main__":
    main()
