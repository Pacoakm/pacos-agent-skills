"""OpenStreetMap roads + building footprints around CUHK -> data/1159/campus.json (for the `bus` plate).

Same local metres as terrain.json (x = east, y = north, origin HK1980 E 839300 N 831100; z = metres above
HKPD, sampled from the LandsD DTM). Also a `route`: the shortest drivable path from the road node nearest
University station up to the highest drivable point on the campus hill, for the bus to climb.
Map data © OpenStreetMap contributors (ODbL).
"""
import heapq, json, math
from pathlib import Path
import numpy as np
from pyproj import Transformer

HERE = Path(__file__).resolve().parent
EC, NC = 839300.0, 831100.0
E0, N1, CS = 838000.0, 832400.0, 5.0
Z = np.load(HERE / "cuhk_dtm_5m.npy")
tf = Transformer.from_crs("EPSG:4326", "EPSG:2326", always_xy=True)

def local(lon, lat):
    e, n = tf.transform(lon, lat)
    return e - EC, n - NC

def height(x, y):
    c, r = (x + EC - E0) / CS - 0.5, (N1 - (y + NC)) / CS - 0.5
    c0, r0 = int(np.clip(math.floor(c), 0, Z.shape[1] - 2)), int(np.clip(math.floor(r), 0, Z.shape[0] - 2))
    fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
    q = Z[r0:r0 + 2, c0:c0 + 2]
    return float((q[0, 0] * (1 - fc) + q[0, 1] * fc) * (1 - fr) + (q[1, 0] * (1 - fc) + q[1, 1] * fc) * fr)

inside = lambda x, y: -1300 <= x <= 1300 and -1300 <= y <= 1300
d = json.loads((HERE / "osm_cuhk.json").read_text())
KEEP = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "service",
        "footway", "steps", "cycleway", "path", "pedestrian", "living_street", "track"}
DRIVE = {"secondary", "tertiary", "unclassified", "residential", "service", "living_street"}
roads, buildings = [], []
graph = {}
nodes_xy = {}
for el in d["elements"]:
    tags = el.get("tags", {})
    geom = el.get("geometry")
    if el["type"] != "way" or not geom:
        continue
    pts = [local(g["lon"], g["lat"]) for g in geom]
    if "highway" in tags and tags["highway"] in KEEP:
        if not any(inside(*p) for p in pts):
            continue
        roads.append({"cls": tags["highway"], "name": tags.get("name:en", tags.get("name", "")),
                      "bridge": tags.get("bridge") == "yes", "tunnel": tags.get("tunnel") == "yes",
                      "pts": [[round(x, 1), round(y, 1), round(height(x, y), 1)] for x, y in pts]})
        # campus roads are often access=private/destination: the school bus uses them, so keep them
        if tags["highway"] in DRIVE and tags.get("access") != "no":
            # `out tags geom` has no node ids: ways that share a node share its exact coordinates
            ids = [(round(g["lon"], 7), round(g["lat"], 7)) for g in geom]
            for i, nid in enumerate(ids):
                nodes_xy[nid] = pts[i]
            for a, b in zip(ids, ids[1:]):
                pa, pb = nodes_xy[a], nodes_xy[b]
                w = math.dist(pa, pb)
                graph.setdefault(a, []).append((b, w))
                if tags.get("oneway") not in ("yes", "-1"):
                    graph.setdefault(b, []).append((a, w))
    elif "building" in tags:
        if len(pts) < 4 or not any(inside(*p) for p in pts):
            continue
        cx, cy = float(np.mean([p[0] for p in pts[:-1]])), float(np.mean([p[1] for p in pts[:-1]]))
        if "height" in tags:
            try:
                h = float(str(tags["height"]).split()[0])
            except ValueError:
                h = None
        else:
            h = None
        if h is None and "building:levels" in tags:
            try:
                h = 3.6 * float(tags["building:levels"])
            except ValueError:
                h = None
        buildings.append({"h": round(h if h else 12.0, 1), "h_known": h is not None,
                          "base": round(min(height(x, y) for x, y in pts), 1),
                          "pts": [[round(x, 1), round(y, 1)] for x, y in pts[:-1]]})

def dijkstra(src, dst):
    dist, prev, pq = {src: 0.0}, {}, [(0.0, src)]
    while pq:
        dd, u = heapq.heappop(pq)
        if u == dst:
            break
        if dd > dist[u]:
            continue
        for v, w in graph.get(u, []):
            if dd + w < dist.get(v, 1e18):
                dist[v], prev[v] = dd + w, u
                heapq.heappush(pq, (dd + w, v))
    if dst not in dist:
        raise SystemExit(f"no drivable path between {nodes_xy[src]} and {nodes_xy[dst]}")
    path = [dst]
    while path[-1] != src:
        path.append(prev[path[-1]])
    return path[::-1]

st = local(114.2101, 22.4146)
nearest = lambda p: min(graph, key=lambda n: math.dist(nodes_xy[n], p))
WP = HERE / "route_waypoints.json"
if WP.exists():
    # The producer's hand-drawn route. Plain per-waypoint snapping picked dead-end spurs and one-way detours,
    # so: route between a few anchor waypoints (the drawing's corners) on an undirected road graph whose edge
    # cost grows with the edge's distance from the drawn line — the path hugs the drawing, on real roads.
    wps = json.loads(WP.read_text())["waypoints"]
    anchors = json.loads(WP.read_text()).get("anchors", list(range(len(wps))))
    segs = list(zip(wps, wps[1:]))
    def off(p):  # distance from p to the drawn polyline
        best = 1e18
        for (ax_, ay_), (bx_, by_) in segs:
            dx, dy = bx_ - ax_, by_ - ay_
            t = max(0.0, min(1.0, ((p[0] - ax_) * dx + (p[1] - ay_) * dy) / (dx * dx + dy * dy or 1e-9)))
            best = min(best, math.hypot(p[0] - ax_ - t * dx, p[1] - ay_ - t * dy))
        return best
    und = {}
    for u, es in graph.items():
        for v, w in es:
            mid = ((nodes_xy[u][0] + nodes_xy[v][0]) / 2, (nodes_xy[u][1] + nodes_xy[v][1]) / 2)
            c = w * (1 + (off(mid) / 25.0) ** 2)
            und.setdefault(u, {})[v] = c
            und.setdefault(v, {})[u] = c
    graph = {u: list(vs.items()) for u, vs in und.items()}
    near_line = [n for n in graph if off(nodes_xy[n]) < 40]
    snapped = []
    for i in anchors:
        n = min(near_line, key=lambda n: math.dist(nodes_xy[n], wps[i]))
        if not snapped or snapped[-1] != n:
            snapped.append(n)
    path = [snapped[0]]
    for a_, b_ in zip(snapped, snapped[1:]):
        path += dijkstra(a_, b_)[1:]
    worst = max(off(nodes_xy[n]) for n in path)
    print(f"hand-drawn route: {len(anchors)} anchors, max distance from the drawing {worst:.0f} m")
    route_note = "the producer's hand-drawn route (geo/route_waypoints.json) matched to roads (cost grows with distance from the drawing)"
else:
    start = nearest(st)
    cands = [n for n in graph if -700 <= nodes_xy[n][0] <= 300 and -100 <= nodes_xy[n][1] <= 900]
    goal = max(cands, key=lambda n: height(*nodes_xy[n]))
    path = dijkstra(start, goal)
    route_note = "shortest drivable path from the road node nearest University station to the highest drivable point in the main campus block"
route = [[round(nodes_xy[n][0], 1), round(nodes_xy[n][1], 1), round(height(*nodes_xy[n]), 1)] for n in path]
length = sum(math.dist(a[:2], b[:2]) for a, b in zip(route, route[1:]))
out = {
    "credit": "Map data © OpenStreetMap contributors (ODbL); terrain © HKSAR Government, Lands Department (DATA.GOV.HK)",
    "osm_timestamp": d.get("osm3s", {}).get("timestamp_osm_base"),
    "crs": "same local metres as terrain.json",
    "university_station": [round(st[0], 1), round(st[1], 1), round(height(*st), 1)],
    "route": route,
    "route_note": route_note,
    "roads": roads,
    "buildings": buildings,
}
dst = HERE.parent.parent / "data" / "1159" / "campus.json"
dst.write_text(json.dumps(out, separators=(",", ":")))
print(f"roads {len(roads)}, buildings {len(buildings)} ({sum(b['h_known'] for b in buildings)} with known height)")
print(f"route: {len(route)} nodes, {length:.0f} m, from z {route[0][2]:.0f} m to z {route[-1][2]:.0f} m")
print(f"{dst.stat().st_size / 1e6:.2f} MB -> {dst}")
