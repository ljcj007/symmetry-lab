"""Shared paths for the offline source-data build (SPDX-License-Identifier: GPL-3.0)."""
import os
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
UPSTREAM = SITE / 'upstream'
OUTPUT = Path(os.environ.get('SYMMETRY_DATA_DIR', str(SITE / 'dist/data'))).resolve()
