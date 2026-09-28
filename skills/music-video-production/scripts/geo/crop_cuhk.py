"""Crop the LandsD 5 m DTM around CUHK and write contour lines for the `bus` plate.

Source: Digital Terrain Model (5 m grid), Survey and Mapping Office, Lands Department, HKSAR Government,
via DATA.GOV.HK (Whole_HK_DTM_5m.zip, HK1980 Grid, EPSG:2326). Where land is vegetated the model gives
the height of the vegetation, not the ground.
"""
import itertools, json
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
ASC = HERE / "Whole_HK_DTM_5m.asc"
E0, E1, N0, N1 = 838000.0, 840600.0, 829800.0, 832400.0      # 2.6 x 2.6 km around the campus
hdr = {}
with ASC.open() as f:
    for _ in range(6):
        k, v = f.readline().split(); hdr[k.lower()] = float(v)
    cs, xll, yll, nrows = hdr["cellsize"], hdr["xllcorner"], hdr["yllcorner"], int(hdr["nrows"])
    ntop = yll + nrows * cs
    r0, r1 = int((ntop - N1) / cs), int((ntop - N0) / cs)
    c0, c1 = int((E0 - xll) / cs), int((E1 - xll) / cs)
    rows = [np.array(line.split()[c0:c1], dtype=np.float32) for line in itertools.islice(f, r0, r1)]
Z = np.vstack(rows)
Z[Z <= -9000] = np.nan
np.save(HERE / "cuhk_dtm_5m.npy", Z)
print("crop", Z.shape, "cells; height min/max %.1f / %.1f m" % (np.nanmin(Z), np.nanmax(Z)), "; NaN", int(np.isnan(Z).sum()))
