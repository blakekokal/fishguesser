#!/usr/bin/env python3
"""Check the map's sections come out where they should.

The map divides the world by nearest seed (see `seeds` in src/regions.js), which
means moving one seed can quietly hand a coastline to the wrong region. This
re-runs that rule against a list of real places and reports anything that lands
somewhere it should not:

    python3 tools/check_regions.py

It also checks the two invariants the map itself relies on — that a region's own
centroid and its label anchor both fall inside its own section — since a label
sitting on a neighbour is the visible symptom of a seed that has gone wandering.
"""
import math
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGIONS_JS = os.path.join(ROOT, "src", "regions.js")
MAP_JS = os.path.join(ROOT, "src", "map.js")

# Places with an unarguable answer: a coast belongs to the sea off it, a lake to
# the region named for it. Open ocean far from anywhere is left out — every such
# square has to belong to somebody, and which neighbour it goes to is a matter
# of taste rather than of fact.
PLACES = [
    ("off Seattle", -126, 47, "north-pacific"),
    ("off San Francisco", -123.5, 37, "north-pacific"),
    ("off Baja California", -117, 27, "north-pacific"),
    ("Pacific off Costa Rica", -88, 8, "north-pacific"),
    ("Bering Sea", -175, 58, "north-pacific"),
    ("Hawaii", -157, 21, "north-pacific"),
    ("off Boston", -69, 42, "north-atlantic"),
    ("off Cape Hatteras", -74, 35, "north-atlantic"),
    ("Grand Banks", -50, 45, "north-atlantic"),
    ("North Sea", 3, 56, "north-atlantic"),
    ("Baltic Sea", 19, 57, "north-atlantic"),
    ("Iceland", -19, 64, "north-atlantic"),
    ("Chicago", -87.6, 41.9, "great-lakes"),
    ("Lake Superior", -87, 47.5, "great-lakes"),
    ("Denver", -105, 39.7, "great-lakes"),
    ("Winnipeg", -97, 50, "great-lakes"),
    ("Miami", -80.2, 25.8, "caribbean"),
    ("Gulf of Mexico", -90, 25, "caribbean"),
    ("Jamaica", -77, 18, "caribbean"),
    ("Manaus", -60, -3, "amazon"),
    ("off Recife", -34, -8, "amazon"),
    ("Rome", 12.5, 41.9, "mediterranean"),
    ("Black Sea", 34, 43, "mediterranean"),
    ("Gibraltar", -5.5, 36, "mediterranean"),
    ("Congo river", 20, -2, "congo"),
    ("Gulf of Guinea", 4, 2, "congo"),
    ("Lake Victoria", 33, -1, "rift-lakes"),
    ("Lake Malawi", 34.5, -12, "rift-lakes"),
    ("off Mombasa", 41, -4, "rift-lakes"),
    ("Arabian Sea", 62, 15, "rift-lakes"),
    ("Tokyo Bay", 140, 35, "sea-of-japan"),
    ("Sea of Japan", 135, 39, "sea-of-japan"),
    ("Yellow Sea", 124, 35, "sea-of-japan"),
    ("Mekong delta", 106, 10, "mekong"),
    ("Vientiane", 102.6, 18, "mekong"),
    ("Sulawesi", 121, -2, "coral-triangle"),
    ("Philippines", 122, 12, "coral-triangle"),
    ("Great Barrier Reef", 147, -18, "northern-australia"),
    ("Darwin", 131, -12, "northern-australia"),
    ("Perth", 115, -32, "northern-australia"),
    ("Auckland", 175, -37, "new-zealand"),
    ("Tasman Sea", 165, -40, "new-zealand"),
    ("Ross Sea", 175, -73, "southern-ocean"),
    ("Weddell Sea", -40, -70, "southern-ocean"),
    ("south of Africa", 20, -55, "southern-ocean"),
    ("North Pole", 0, 89, "arctic"),
    ("Barents Sea", 40, 75, "arctic"),
    ("Beaufort Sea", -140, 73, "arctic"),
]


def regions():
    """id -> {lat, lon, seeds}, read straight out of the data file."""
    text = open(REGIONS_JS, encoding="utf-8").read()
    out = {}
    for block in re.finditer(r"\{\s*id: '([^']+)',(.*?)\n  \}", text, re.S):
        rid, body = block.group(1), block.group(2)
        lat = float(re.search(r"\blat: (-?[\d.]+)", body).group(1))
        lon = float(re.search(r"\blon: (-?[\d.]+)", body).group(1))
        # The list runs to its own closing bracket on a line of its own; a
        # lazier match stops at the first pair that happens to end a line.
        seeds = re.search(r"seeds: \[(.*?)\n    \]", body, re.S)
        pts = [(float(a), float(b)) for a, b in
               re.findall(r"\[\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]", seeds.group(1))] if seeds else []
        out[rid] = {"lat": lat, "lon": lon, "seeds": pts or [(lon, lat)]}
    return out


def label_anchors():
    """The LABEL_AT overrides in map.js; a region without one uses its centroid."""
    text = open(MAP_JS, encoding="utf-8").read()
    block = re.search(r"const LABEL_AT = \{(.*?)\n  \};", text, re.S)
    if not block:
        return {}
    return {m.group(1).strip("'"): (float(m.group(2)), float(m.group(3)))
            for m in re.finditer(r"'?([a-z-]+)'?:\s*\[(-?[\d.]+),\s*(-?[\d.]+)\]", block.group(1))}


def unit(lon, lat):
    p, l = math.radians(lat), math.radians(lon)
    c = math.cos(p)
    return (c * math.cos(l), c * math.sin(l), math.sin(p))


def main():
    data = regions()
    seeds = [(rid, unit(lon, lat)) for rid, r in data.items() for lon, lat in r["seeds"]]
    anchors = label_anchors()

    def owner(lon, lat):
        x, y, z = unit(lon, lat)
        return max(seeds, key=lambda s: x * s[1][0] + y * s[1][1] + z * s[1][2])[0]

    bad = []
    for what, lon, lat, want in PLACES:
        got = owner(lon, lat)
        if got != want:
            bad.append(f"{what}: expected {want}, got {got}")
    for rid, r in data.items():
        if owner(r["lon"], r["lat"]) != rid:
            bad.append(f"{rid}: its own centroid falls in {owner(r['lon'], r['lat'])}")
        lon, lat = anchors.get(rid, (r["lon"], r["lat"]))
        if owner(lon, lat) != rid:
            bad.append(f"{rid}: its label anchor falls in {owner(lon, lat)}")

    for line in bad:
        print("WRONG", line)
    print(f"\n{len(PLACES)} places, {len(data)} centroids and {len(data)} label anchors checked"
          f" — {len(bad)} in the wrong section")
    if bad:
        print("Move a seed in src/regions.js, or a label anchor in src/map.js.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
