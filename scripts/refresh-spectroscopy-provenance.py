"""Refresh release provenance after all source edits, without rebuilding assets.

    python scripts/refresh-spectroscopy-provenance.py
    python scripts/refresh-spectroscopy-provenance.py --check

--check reads files and compares manifests without writing anything. Existing
catalog versions, counts, sources and historical release metadata are preserved.
Text hashes are UTF-8 with LF line endings; binary files retain their bytes.
This command does not build catalogs, source.zip, commit or deploy the website.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "20261028-spectroscopy1"
DATE = "2026-10-28"
PREFIXES = ("spin-resonance", "andreev", "atomic-spectra")
TEXT_EXTENSIONS = {".py", ".js", ".mjs", ".cjs", ".json", ".html", ".css", ".md", ".txt", ".svg", ".yaml", ".yml", ".toml", ".csv"}
COVERAGE = {
    "spin_resonance_lab": (
        ["Single effective electron spin S=1/2 through 5/2 and at most one nuclear spin I=0 through 5/2; diagonal g, D/E and axial hyperfine tensors in a shared crystal frame", "Exact finite-dimensional eigensystems, thermal populations, degenerate-subspace magnetic-dipole trace strengths, positive-frequency absorption and sorted field-scan energies"],
        ["Phenomenological effective parameters are supplied independently, not inferred from the no-SOC Kanamori model or material structures", "Single-crystal weak-drive equilibrium spectrum; no powder average, relaxation, saturation, pulses, direct nuclear drive or full complex susceptibility"],
    ),
    "andreev_lab": (
        ["Normal one-orbital 1D chain connected to normal and real s-wave superconducting semi-infinite leads with exact retarded surface self-energies", "Electron/hole reflection, quasiparticle transmission, spin-degenerate electrical conductance, local spectra, particle-hole and flux checks with explicit finite-device eta absorption"],
        ["Zero-temperature fixed-potential spectral differential conductance; E=0 is the zero-bias linear limit; no finite-bias self-consistency, Josephson phase, SOC or Majorana diagnosis", "Two physical spins already included in G; exact E=+/-Delta threshold points are withheld and must not be filled by zero; finite-bandwidth/barrier contacts need not double normal conductance"],
    ),
    "atomic_spectra_lab": (
        ["Complete p6d8 to p5d9 and p6d9 to p5d10 atomic configuration spaces with d-d Slater F0/F2/F4, p-d F0/F2/G1/G3, crystal field and p/d spin-orbit interactions", "Polarization-dependent 2p-to-3d dipole XAS, thermal and degenerate-subspace averaging, circular/linear difference spectra and complete-space oscillator-strength checks"],
        ["Single-ion approximation with illustrative parameters; no ligand charge transfer, magnetic crystal order, RIXS or absolute absorption cross-section", "Transition energies are referenced to the final-configuration centroid, not an absolute experimental edge; radial factors are suppressed and LS terms are not automatically assigned"],
    ),
}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def serialized(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def content(path):
    # TextIO's universal-newline conversion gives the same digest for LF/CRLF.
    return path.read_text(encoding="utf-8").encode("utf-8") if path.suffix.lower() in TEXT_EXTENSIONS else path.read_bytes()


def digest(path):
    return hashlib.sha256(content(path)).hexdigest()


def project_headers(path):
    source = path.read_text(encoding="utf-8")
    rows = re.findall(r"^\s*\{id:'([^']+)',module:'([^']+)',title:'([^']+)'", source, re.MULTILINE)
    if len({row[0] for row in rows}) != len(rows):
        raise ValueError(f"Duplicate project IDs in {path.name}")
    return [{"id": i, "module": m, "title": t} for i, m, t in rows]


def catalog_summary():
    catalog = read_json(ROOT / "dist/data/spectroscopy-materials.json")
    if catalog.get("release") != RELEASE:
        raise ValueError("Build the current spectroscopy catalog before refreshing provenance")
    for key in ("modules", "lessons", "exercises", "cases", "sources"):
        ids = [row["id"] for row in catalog[key]]
        if len(set(ids)) != len(ids):
            raise ValueError(f"Duplicate {key} IDs in spectroscopy catalog")
    counts = {key: len(catalog[key]) for key in ("modules", "lessons", "exercises", "cases", "sources")}
    counts["exerciseSteps"] = sum(len(row["steps"]) for row in catalog["exercises"])
    counts["presets"] = sum(len(row["presets"]) for row in catalog["modules"])
    projects = project_headers(ROOT / "dist/spectroscopy-projects.js")
    prior = project_headers(ROOT / "dist/response-projects.js")
    if {row["id"] for row in projects} != {"spin-resonance", "normal-andreev", "multiplet-xas"} or len(projects) != 3:
        raise ValueError("Expected the three reviewed spectroscopy assignments")
    if {row["id"] for row in prior} != {"geometry-hall", "ssh-device", "orbital-multiplet"} or len(prior) != 3:
        raise ValueError("Expected the three retained response assignments")
    counts["projects"] = len(projects)
    counts["projectCenterTotal"] = len(projects) + len(prior)
    if tuple(counts[k] for k in ("modules", "lessons", "exercises", "exerciseSteps", "cases", "presets")) != (3, 9, 9, 36, 9, 18):
        raise ValueError(f"Unexpected spectroscopy content counts: {counts}")
    return catalog, counts, projects


def refresh_existing_manifests():
    outputs = {}
    for path in sorted((ROOT / "dist/data").glob("*provenance.json")):
        if path.name in {"python-provenance.json", "spectroscopy-provenance.json"}:
            continue
        data = read_json(path)
        files = data.get("files")
        excluded = []
        if isinstance(files, dict):
            excluded = [name for name in files if name.replace("\\", "/").startswith(".openai/")]
            for name in excluded:
                del files[name]
            entries = [(name, row) for name, row in files.items() if isinstance(row, dict)]
        elif isinstance(files, list):
            excluded = [row["path"] for row in files if isinstance(row, dict) and str(row.get("path", "")).replace("\\", "/").startswith(".openai/")]
            if excluded:
                files = [row for row in files if not isinstance(row, dict) or row.get("path") not in excluded]
                data["files"] = files
            entries = [(row.get("path"), row) for row in files if isinstance(row, dict)]
        else:
            continue
        if excluded:
            data["provenanceMaintenance"] = {
                "note": "Legacy local helpers excluded from the reproducible file manifest; historical release, counts and sources are preserved.",
                "excludedLocalHelpers": excluded,
            }
        for key, command in (("refreshCommand", "python scripts/refresh-spectroscopy-provenance.py"), ("verifyCommand", "python scripts/refresh-spectroscopy-provenance.py --check")):
            if ".openai/" in str(data.get(key, "")).replace("\\", "/"):
                data[key] = command
        for name, row in entries:
            if not name or "sha256" not in row:
                continue
            raw = content(ROOT / name)
            row["sha256"] = hashlib.sha256(raw).hexdigest()
            if "bytes" in row:
                row["bytes"] = len(raw)
        outputs[path] = data
    return outputs


def refresh_python_manifest():
    path = ROOT / "dist/data/python-provenance.json"
    data = read_json(path)
    for name, (coverage, limitations) in COVERAGE.items():
        name = f"dist/python/{name}.py"
        row = next((entry for entry in data["modules"] if entry["path"] == name), None)
        if row is None:
            row = {"path": name}
            data["modules"].append(row)
        row.update(upstream=[], license="GPL-3.0-only", implementation="Original NumPy teaching implementation", coverage=coverage, limitations=limitations)
    paths = [row["path"] for row in data["modules"]]
    if len(set(paths)) != len(paths):
        raise ValueError("Duplicate module paths in Python provenance")
    for row in data["modules"]:
        row["sha256"] = digest(ROOT / row["path"])
    data["updated"] = DATE
    return path, data


def release_manifest(catalog, counts, projects):
    names = {
        "README.md", "package.json", ".gitignore", "scripts/refresh-spectroscopy-provenance.py",
        "dist/spectroscopy-ui.js", "dist/spectroscopy-views.js", "dist/spectroscopy-projects.js", "dist/spectroscopy.css",
        "dist/data/spectroscopy-materials.json", "dist/docs/spectroscopy.md",
        "scripts/build-spectroscopy-catalog.py", "scripts/build-spectroscopy-fixtures.py",
        "scripts/test-python-spectroscopy-content.py", "scripts/test-spectroscopy-ui.mjs", "scripts/fixtures/spectroscopy.json",
        "dist/advanced-ui.js", "dist/app.js", "dist/classroom-ui.js", "dist/coupled-materials-ui.js", "dist/coverage-ui.js",
        "dist/electronic-materials-ui.js", "dist/index.html", "dist/lie-group-ui.js", "dist/lie-physics-ui.js",
        "dist/material-notebook.js", "dist/material-research-ui.js", "dist/navigation-ui.js", "dist/observables-ui.js",
        "dist/python-client.js", "dist/python-worker.js", "dist/python/browser_api.py", "dist/quantum-materials-ui.js",
        "dist/response-materials-ui.js", "dist/response-projects.js", "dist/response-views.js", "dist/structure-dynamics-ui.js", "dist/symmetry-course-ui.js",
        "scripts/test-coupled-materials-ui.mjs", "scripts/test-lie-group-ui.mjs", "scripts/test-material-research-ui.mjs",
        "scripts/test-response-materials-ui.mjs", "scripts/test-structure-dynamics-ui.mjs",
    }
    for name in COVERAGE:
        names.add(f"dist/python/{name}.py")
    for prefix in PREFIXES:
        names.update({f"dist/data/{prefix}-content.json", f"dist/docs/{prefix}-lab.md", f"scripts/test-python-{prefix}.py"})
        names.update(path.relative_to(ROOT).as_posix() for path in (ROOT / "dist/examples").glob(prefix + "-*.json"))
    return {
        "schema": "symmetry-lab-spectroscopy-provenance-1", "release": RELEASE, "date": DATE, "originalContent": True,
        "scope": "Original Python/NumPy teaching implementations, lessons, synthetic model parameters and cross-module assignments; primary literature and official software documentation provide methods, not material-fitted data or complete upstream compatibility",
        "counts": counts, "projects": projects, "sources": catalog["sources"],
        "hashConvention": "SHA-256 of UTF-8 text normalized to LF; binary files hashed without conversion",
        "refreshCommand": "python scripts/refresh-spectroscopy-provenance.py",
        "verifyCommand": "python scripts/refresh-spectroscopy-provenance.py --check",
        "files": [{"path": name, "sha256": digest(ROOT / name)} for name in sorted(names)],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare expected manifests without modifying files")
    args = parser.parse_args()
    catalog, counts, projects = catalog_summary()
    outputs = refresh_existing_manifests()
    path, data = refresh_python_manifest()
    outputs[path] = data
    outputs[ROOT / "dist/data/spectroscopy-provenance.json"] = release_manifest(catalog, counts, projects)
    changed = []
    for path, data in outputs.items():
        expected = serialized(data)
        if not path.exists() or path.read_text(encoding="utf-8") != expected:
            changed.append(path.relative_to(ROOT).as_posix())
            if not args.check:
                path.write_text(expected, encoding="utf-8", newline="\n")
    print("Spectroscopy release counts:", json.dumps(counts, ensure_ascii=False))
    if args.check and changed:
        raise SystemExit("Stale provenance; refresh after final edits:\n" + "\n".join(changed))
    print(("Verified" if args.check else "Refreshed") + f" {len(outputs)} provenance manifests; {len(changed)} changed.")


if __name__ == "__main__":
    main()
