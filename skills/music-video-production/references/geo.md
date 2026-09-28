# Real places: terrain, roads, buildings

When a plate shows a real place (11:59's `bus`: the school bus climbing the CUHK campus), draw it from
open data in the video's own style instead of inventing it. Facts (the shape of a hill, where roads and
buildings are) come from the data; the drawing is ours. Never use logos, crests or official maps' designs.

Scripts in `scripts/geo/` (copy them to `<project>/analysis/geo/`); they are written for CUHK — change the
crop box and landmarks at the top for another place.

## Sources (Hong Kong)

| Data | Source | Licence / credit |
|---|---|---|
| Terrain, 5 m grid (DTM) | Lands Department via DATA.GOV.HK — `https://www.landsd.gov.hk/landsd_psi_data/SMO/data/Whole_HK_DTM_5m.zip` (28.7 MB zip, 302 MB ArcInfo ASCII grid, HK1980 Grid EPSG:2326). Over trees it gives canopy height. | DATA.GOV.HK terms: free for commercial and non-commercial use and derivatives, with attribution. |
| Finer terrain (LiDAR 2010 / 2020) | CEDD / CSDI portal (on request) | check the terms |
| Roads, building footprints (+ `height`, `building:levels`) | OpenStreetMap via the Overpass API | ODbL: "© OpenStreetMap contributors" |

Elsewhere: national DEMs (USGS 3DEP, EU-DEM, SRTM 30 m) and OpenStreetMap work the same way.

Downloading is outward-facing: tell the user the file name, source and size and get a yes first.
Put the raw data in the project, never in a cloud-synced folder.

## Pipeline

1. `crop_cuhk.py` — stream the big ASCII grid and keep only the crop box → `cuhk_dtm_5m.npy`.
   Check a hillshade + contour preview with landmarks marked (coastline, railway, known heights).
2. `terrain_json.py` → `data/<id>/terrain.json`: contours every 10 m (Douglas–Peucker simplified), a 10 m
   height grid, local metres from the crop centre, the credit line. ~0.5 MB.
3. Overpass query for `way["highway"]`, `way["building"]`, `relation["building"]` in the box
   (`out tags geom;`). The main server is often busy: retry on a mirror (`overpass.kumi.systems`,
   `overpass.private.coffee`) and back on `overpass-api.de`. Record the OSM timestamp.
4. `osm_json.py` → `data/<id>/campus.json`: roads (class, bridge/tunnel, z sampled from the DTM),
   building footprints (base z, height from `height` or 3.6 m × levels, else 12 m + `h_known: false`),
   and the **route** the plate follows.

## The route: ask the person who knows

Shortest-path heuristics picked the wrong hill twice on the test song. What worked:

- Campus roads are often `access=private`: include them for a school bus; ignore `oneway` for a drawn route.
- **Let the user draw the route** on the preview image. Convert the drawing from screenshot pixels to map
  metres with two known points (e.g. the station and a labelled summit), save it as
  `route_waypoints.json`, and match it to the road graph: route between a few **anchor** waypoints (the
  drawing's corners) on an undirected graph whose edge cost grows with distance from the drawn line
  (`w · (1 + (d/25 m)²)`). Plain snap-each-waypoint picked dead-end spurs and a one-way detour (4.9 km vs
  the drawn 2.9 km). Report the length and the max deviation, and show green-vs-orange before building.

## In the scene

- Smooth the height grid (~15 m) so canopy speckle doesn't become noise; exaggerate height (×2) and say so
  in the figure's legend ("ground ×2, buildings to scale").
- Let the scene pick the stretch the camera shows from the data (score windows of the route for
  readable left-to-right lyric, looking uphill, high ground, buildings nearby) instead of hard-coding it.
- Buildings: extruded hairline boxes, hatched on the shaded side; drop small footprints that sit on the
  lyric's stretch of road (covered walkways), not everything near the route (that deletes landmarks).
- Put the credit inside the figure's legend box, and again on the video's last frame.
