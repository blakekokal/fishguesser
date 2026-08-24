#!/usr/bin/env python3
"""Generate src/coastlines.js from Natural Earth land polygons.

Natural Earth is public domain, so the data can simply be shipped. The 110m
("small scale") land layer is the right resolution here: the map is drawn about
1000 units wide for 360 degrees, so anything finer would be sub-pixel detail.

Coordinates are stored as lat/lon and projected at runtime by map.js, so the
coastlines, the region sections and the labels all go through one projection
and cannot drift apart.

    python3 tools/build_coastlines.py [--tolerance 0.08]

Re-download the source with:
    curl -o ne_110m_land.geojson \\
      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
"""
import argparse
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "coastlines.js")
SOURCE = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
          "master/geojson/ne_110m_land.geojson")
UA = "Fishguesser/0.1 (educational game; https://github.com/blakekokal/fishguesser)"


def perpendicular_distance(pt, start, end):
    (x, y), (x1, y1), (x2, y2) = pt, start, end
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    px, py = x1 + t * dx, y1 + t * dy
    return ((x - px) ** 2 + (y - py) ** 2) ** 0.5


def simplify(points, tolerance):
    """Ramer-Douglas-Peucker, iterative so a long ring cannot blow the stack."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        worst, index = 0.0, None
        for i in range(first + 1, last):
            d = perpendicular_distance(points[i], points[first], points[last])
            if d > worst:
                worst, index = d, i
        if index is not None and worst > tolerance:
            keep[index] = True
            stack.append((first, index))
            stack.append((index, last))
    return [p for p, k in zip(points, keep) if k]


def clean(ring, tolerance):
    pts = [(round(x, 2), round(y, 2)) for x, y in ring]
    # Drop the repeated closing vertex; the renderer closes each ring itself.
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    deduped = [pts[0]] if pts else []
    for p in pts[1:]:
        if p != deduped[-1]:
            deduped.append(p)
    return simplify(deduped, tolerance)


def polygons(geometry):
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return geometry["coordinates"]
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tolerance", type=float, default=0.08,
                    help="simplification tolerance in degrees (0.08 deg is well under a pixel)")
    ap.add_argument("--source", default=None, help="local GeoJSON instead of downloading")
    args = ap.parse_args()

    if args.source:
        with open(args.source, encoding="utf-8") as f:
            data = json.load(f)
    else:
        req = urllib.request.Request(SOURCE, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.load(r)

    before = after = 0
    shapes = []
    for feature in data["features"]:
        for poly in polygons(feature["geometry"]):
            rings = []
            for ring in poly:
                before += len(ring)
                simplified = clean(ring, args.tolerance)
                if len(simplified) >= 3:
                    after += len(simplified)
                    rings.append(simplified)
            if rings:
                shapes.append(rings)

    lines = [
        "/* Fishguesser — world coastlines.",
        " *",
        " * GENERATED FILE — do not edit by hand.",
        " * Run `python3 tools/build_coastlines.py` to rebuild.",
        " *",
        " * Natural Earth 110m land polygons, which are public domain. Each entry is",
        " * one landmass as an array of rings: the first is its outline and any",
        " * further rings are holes (inland seas), so the paths are filled even-odd.",
        " * Rings are flat [lon, lat, lon, lat, ...] and are projected at runtime by",
        " * map.js, the same projection the region sections use. */",
        "",
        "const LAND = [",
    ]
    for rings in shapes:
        lines.append("  [")
        for ring in rings:
            flat = ",".join(f"{x:g},{y:g}" for x, y in ring)
            lines.append(f"    [{flat}],")
        lines.append("  ],")
    lines.append("];")
    lines.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    size = os.path.getsize(OUT)
    print(f"wrote {os.path.relpath(OUT, ROOT)}: {len(shapes)} landmasses, "
          f"{after} points (from {before}), {size // 1024} KB")


if __name__ == "__main__":
    main()
