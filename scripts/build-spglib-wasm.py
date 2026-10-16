"""Rebuild the browser spglib kernel from its digest-pinned official source.

Requires the official Emscripten 5.0.3 SDK. Nothing is installed globally.
Example: python scripts/build-spglib-wasm.py --emscripten /path/to/emscripten
The caller supplies a working SDK configuration (EM_CONFIG) when needed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import urllib.request

VERSION = "2.8.0"
SOURCE_URL = "https://files.pythonhosted.org/packages/e0/12/571ccea78d63718030194972062a64f4a6ab9f09a4fb329c110d56766563/spglib-2.8.0.tar.gz"
SOURCE_SHA256 = "12a224434b5659793353937625fd7eb91c00c8952c18ca729a7a8117b1e29e8f"
ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--emscripten", type=Path, required=True)
    parser.add_argument("--no-proxy", action="store_true", help="Ignore proxy environment for official source download")
    args = parser.parse_args()
    work = ROOT / ".openai" / "spglib-build"
    work.mkdir(parents=True, exist_ok=True)
    temporary = work / "temp"
    temporary.mkdir(exist_ok=True)
    build_env = dict(os.environ, TEMP=str(temporary), TMP=str(temporary), TMPDIR=str(temporary))
    archive = work / f"spglib-{VERSION}.tar.gz"
    if not archive.exists():
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if args.no_proxy else urllib.request.build_opener()
        archive.write_bytes(opener.open(SOURCE_URL, timeout=60).read())
    if hashlib.sha256(archive.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise RuntimeError("Official spglib source SHA-256 mismatch")
    source = work / f"spglib-{VERSION}"
    if not source.exists():
        with tarfile.open(archive) as package:
            package.extractall(work, filter="data")
    (source / "src" / "version.h").write_text(
        '#define SPGLIB_MAJOR_VERSION 2\n#define SPGLIB_MINOR_VERSION 8\n'
        '#define SPGLIB_MICRO_VERSION 0\n#define SPGLIB_VERSION "2.8.0"\n'
        '#define SPGLIB_VERSION_FULL "2.8.0"\n#define SPGLIB_COMMIT "official-pypi-sdist"\n',
        encoding="utf-8",
    )
    emcc = args.emscripten.resolve() / "emcc.py"
    version = subprocess.check_output([sys.executable, str(emcc), "--version"], text=True, env=build_env)
    if "5.0.3" not in version.splitlines()[0]:
        raise RuntimeError("Reproducible build requires Emscripten 5.0.3")
    target = ROOT / "dist" / "vendor" / "spglib"
    target.mkdir(parents=True, exist_ok=True)
    flags = ["-O3", "-std=c11", "-DNDEBUG", "-DSPG_BUILD", "-sMODULARIZE=1", "-sEXPORT_ES6=1",
             "-sENVIRONMENT=web,worker,node", "-sALLOW_MEMORY_GROWTH=1", "-sFILESYSTEM=0",
             "-sEXPORTED_FUNCTIONS=" + json.dumps(["_malloc", "_free", "_sl_dataset", "_sl_database", "_sl_type", "_sl_standardize"]),
             "-sEXPORTED_RUNTIME_METHODS=" + json.dumps(["UTF8ToString", "HEAPU8"]),
             "-I" + str(source / "include"), "-I" + str(source / "src")]
    sources = sorted(str(path) for path in (source / "src").glob("*.c") if path.name != "spglib_f.c")
    subprocess.run([sys.executable, str(emcc), *flags, *sources, str(ROOT / "scripts" / "spglib-wasm-bridge.c"),
                    "-lm", "-o", str(target / "spglib-kernel.mjs")], check=True, env=build_env)
    # Emscripten renames private temporary files to the output. On Windows,
    # restore this workspace directory's inherited ACL for static web serving.
    if os.name == "nt":
        for name in ["spglib-kernel.mjs", "spglib-kernel.wasm"]:
            subprocess.run(["icacls", str(target / name), "/reset"], check=True, stdout=subprocess.DEVNULL)
    (target / "LICENSE.spglib").write_bytes((source / "COPYING").read_bytes())
    metadata = {
        "library": "spglib", "version": VERSION, "source_url": SOURCE_URL, "source_sha256": SOURCE_SHA256,
        "source_repository": "https://github.com/spglib/spglib", "license": "BSD-3-Clause",
        "compiler": "Emscripten 5.0.3", "sdk_release_commit": "065bfade0ee2c02138b83cb10049d8be95e146b6",
        "c_source_changes": "None. Generated version.h and a separate JSON transport wrapper only.",
        "build_script": "scripts/build-spglib-wasm.py", "bridge_source": "scripts/spglib-wasm-bridge.c",
        "bridge_sha256": hashlib.sha256((ROOT / "scripts" / "spglib-wasm-bridge.c").read_bytes()).hexdigest(),
        "assets": {name: hashlib.sha256((target / name).read_bytes()).hexdigest()
                   for name in ["spglib-kernel.mjs", "spglib-kernel.wasm", "LICENSE.spglib"]},
    }
    (target / "provenance.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
