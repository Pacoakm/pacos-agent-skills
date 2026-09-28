"""Contours + a coarse height grid of the CUHK crop -> data/1159/terrain.json (for the `bus` plate).

Coordinates are local metres: x = east, y = north, origin at the crop centre (HK1980 E 839300, N 831100);
z = height in metres above Hong Kong Principal Datum.
"""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
Z = np.load(HERE / "cuhk_dtm_5m.npy")
E0, N1, CS = 838000.0, 832400.0, 5.0
ny, nx = Z.shape
EC, NC = E0 + nx * CS / 2, N1 - ny * CS / 2
xs = E0 + (np.arange(nx) + 0.5) * CS - EC
ys = (N1 - (np.arange(ny) + 0.5) * CS) - NC

def simplify(pts, eps):
    """Douglas-Peucker on an (n, 2) array."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    L = np.hypot(*ab) or 1e-9
    d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / L
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([simplify(pts[: i + 1], eps)[:-1], simplify(pts[i:], eps)])
    return np.array([a, b])

cs = plt.contour(xs, ys, Z, levels=np.arange(10, 370, 10))
contours = []
for level, segs in zip(cs.levels, cs.allsegs):
    for seg in segs:
        if len(seg) < 4:
            continue
        s = simplify(np.asarray(seg), 1.5)
        if len(s) >= 3:
            contours.append({"z": float(level), "pts": [[round(float(x), 1), round(float(y), 1)] for x, y in s]})
# 10 m height grid (every 2nd cell), row 0 = north
G = Z[::2, ::2]
out = {
    "source": "Digital Terrain Model (5 m grid), Survey and Mapping Office, Lands Department, HKSAR Government; via DATA.GOV.HK. "
              "Heights over vegetation are canopy heights.",
    "credit": "Terrain data © HKSAR Government, Lands Department (DATA.GOV.HK)",
    "crs": "HK1980 Grid (EPSG:2326), local metres from E %.1f N %.1f" % (EC, NC),
    "extent": {"x0": float(xs[0] - CS / 2), "x1": float(xs[-1] + CS / 2), "y0": float(ys[-1] - CS / 2), "y1": float(ys[0] + CS / 2)},
    "landmarks": {"university_station": [round(839688.9 - EC, 1), round(830586.4 - NC, 1)]},
    "grid": {"cell": 10.0, "nx": int(G.shape[1]), "ny": int(G.shape[0]), "x0": float(xs[0]), "y0": float(ys[0]),
             "z": [round(float(v), 1) for v in G.ravel()]},
    "contours": contours,
}
dst = HERE.parent.parent / "data" / "1159" / "terrain.json"
dst.write_text(json.dumps(out, separators=(",", ":")))
print(f"{len(contours)} contour polylines, {sum(len(c['pts']) for c in contours)} points, grid {G.shape}, "
      f"{dst.stat().st_size / 1e6:.2f} MB -> {dst}")
