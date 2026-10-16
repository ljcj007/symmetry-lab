"""Pyodide adapter for the site's official spglib 2.8.0 WebAssembly kernel.

CPython uses the upstream ``spglib`` package. On Emscripten this adapter
registers its supported API as ``spglib`` before structure_bc is imported.
It preserves the upstream row-vector lattice and dataset conventions.
"""
import json
import sys

import numpy as np

__version__ = "2.8.0"
_error_message = "no error"
_FLOAT_FIELDS = {"transformation_matrix", "origin_shift", "translations", "primitive_lattice", "std_lattice", "std_positions", "std_rotation_matrix"}
_INT_FIELDS = {"rotations", "equivalent_atoms", "crystallographic_orbits", "mapping_to_primitive", "std_types", "std_mapping_to_primitive"}


class _Record(dict):
    """Both current attribute access and historical mapping access."""
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError as error:
            raise AttributeError(name) from error


def _call(action, **kwargs):
    global _error_message
    from js import symmetryLabSpglib
    data = json.loads(str(symmetryLabSpglib(json.dumps({"action": action, **kwargs}, allow_nan=False))))
    if "error" in data:
        _error_message = data["error"]
        return None
    _error_message = "no error"
    return data


def _cell(cell):
    if len(cell) != 3:
        raise ValueError("Expected (lattice, positions, numbers)")
    lattice, positions, numbers = [np.asarray(value) for value in cell]
    if lattice.shape != (3, 3) or positions.ndim != 2 or positions.shape[1] != 3 or numbers.shape != (len(positions),):
        raise ValueError("Invalid spglib cell shape")
    if not np.isfinite(lattice).all() or not np.isfinite(positions).all():
        raise ValueError("Cell coordinates must be finite")
    if abs(float(np.linalg.det(lattice))) < np.finfo(float).tiny:
        raise ValueError("Cell lattice is singular")
    if not np.isfinite(numbers).all() or not np.equal(numbers, np.floor(numbers)).all():
        raise ValueError("Atom types must be integers")
    return [lattice.astype(float).tolist(), positions.astype(float).tolist(), numbers.astype(int).tolist()]


def get_symmetry_dataset(cell, symprec=1e-5, angle_tolerance=-1.0, hall_number=0, _throw=False):
    data = _call("dataset", cell=_cell(cell), symprec=float(symprec), angle_tolerance=float(angle_tolerance), hall_number=int(hall_number))
    if data is None:
        if _throw:
            raise RuntimeError(_error_message)
        return None
    for name in _FLOAT_FIELDS:
        data[name] = np.asarray(data[name], dtype=float)
    for name in _INT_FIELDS:
        data[name] = np.asarray(data[name], dtype=np.intc)
    return _Record(data)


def get_symmetry_from_database(hall_number):
    data = _call("database", hall_number=int(hall_number))
    if data is None:
        return None
    return {"rotations": np.asarray(data["rotations"], dtype=np.intc), "translations": np.asarray(data["translations"], dtype=float)}


def get_spacegroup_type(hall_number, _throw=False):
    data = _call("type", hall_number=int(hall_number))
    if data is None and _throw:
        raise RuntimeError(_error_message)
    return None if data is None else _Record(data)


def standardize_cell(cell, to_primitive=False, no_idealize=False, symprec=1e-5, angle_tolerance=-1.0):
    data = _call("standardize", cell=_cell(cell), to_primitive=bool(to_primitive), no_idealize=bool(no_idealize), symprec=float(symprec), angle_tolerance=float(angle_tolerance))
    if data is None:
        return None
    return np.asarray(data["lattice"], dtype=float), np.asarray(data["positions"], dtype=float), np.asarray(data["numbers"], dtype=np.intc)


def get_error_message():
    return _error_message


if sys.platform == "emscripten":
    sys.modules["spglib"] = sys.modules[__name__]
