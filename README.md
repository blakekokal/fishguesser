# Fishguesser 🐟

A GeoGuessr-style guessing game for fish. You get a photograph of a fish and its
name; you decide which of ten regions of the world it comes from.

- **30 species**, each photographed in the wild or in an aquarium
- **10 regions**, from the North Pacific to the Southern Ocean — three fish live
  in each, so the map has to be read rather than memorised
- **5 rounds per game**, drawn at random from the species list
- **Distance-based scoring** — an exact hit is 5,000 points, and a near miss
  still earns partial credit that decays with how far off you were
- **The name starts half hidden** — everything but the last word is blanked out,
  so "Antarctic Toothfish" reads "••••••••• Toothfish" until you tap
  **Reveal name**. Hiding the front is deliberate: the giveaway is nearly always
  the leading word. Using the hint costs nothing, and the full name appears
  automatically once you have guessed
- **Fits a phone in landscape** without scrolling, as well as portrait and
  desktop

No build step, no dependencies, no network calls. Everything — photos included —
is committed to the repository.

## Playing

Open `index.html` in a browser.

Some browsers restrict pages loaded over `file://`, so if anything looks off,
serve the folder over HTTP instead:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Click a labelled section of the map, then **Lock in guess**. Every section is
named on the map itself, so there is no separate list to cross-reference.
Sections are keyboard reachable too: `Tab` moves between them and `Enter`
picks one.
`Enter` works as a shortcut for locking in and for advancing to the next fish.
Your best score is remembered in `localStorage`.

## How scoring works

| Result | Points |
| --- | --- |
| Correct region | 5,000 |
| Wrong region | `5000 × e^(−distance_km / 3000)` |

So picking a neighbouring region ~1,500 km away still scores about 3,000, a
guess 6,000 km off scores around 680, and one on the far side of the planet
scores almost nothing. Distance is the great-circle distance between the
centroids of the two regions.

The map sections follow the same rule: every point on the map belongs to
whichever region's centre is nearest, so a section is exactly "everywhere
closer to this region than to any other". The ten sections tile the map
completely — there is no unclaimed water.

## Project layout

```
index.html              markup and script order
styles.css              deep-water theme
src/version.js          version + build date shown in the header
src/regions.js          the 10 regions + haversine distance
src/fish.js             the 30 fish (name, photo, home region, fun fact)
src/credits.js          generated photo attribution
src/map.js              the world map: projection, coastlines, section partition
src/game.js             game loop, scoring, end screen
assets/fish/            the photographs + credits.json
tools/build_credits.py  regenerates src/credits.js and CREDITS.md
tools/build_standalone.py  bundles everything into one shareable HTML file
tools/bump_version.py   bumps the version and stamps today's date
```

## Versioning

The header shows the running version and build date (`v1.4.0 · 23 Aug 2026`),
so a stale cached page is easy to spot. The date is dropped on narrow screens
and the full stamp stays available as the badge's tooltip.

`src/version.js` is the only place the version lives. Bump it before committing
a change you want to be visible:

```sh
python3 tools/bump_version.py          # patch: 1.4.0 -> 1.4.1
python3 tools/bump_version.py minor    # 1.4.1 -> 1.5.0
python3 tools/bump_version.py major    # 1.5.0 -> 2.0.0
python3 tools/bump_version.py 2.1.3    # or set it explicitly
```

## Building a single-file version

`python3 tools/build_standalone.py` inlines the stylesheet, the scripts and all
thirty photographs into `dist/fishguesser.html` — one file that runs with no
server, no sibling assets and no network access at all. Useful for sharing, or
for hosts with a strict content-security policy.

## Adding more fish or regions

The data files are plain arrays, so extending the game is additive:

1. Drop a photo in `assets/fish/` and add an entry to `assets/fish/credits.json`
   with its author, licence and source URL.
2. Run `python3 tools/build_credits.py` to regenerate `src/credits.js` and
   `CREDITS.md`.
3. Append the fish to `FISH` in `src/fish.js`, pointing `region` at a region id.

To add a region, append it to `REGIONS` in `src/regions.js` with a
representative `lat`/`lon` — that is all. The map sections are computed from
those coordinates, so a new region carves its own section out of its
neighbours automatically and the map stays fully covered. `LABEL_AT` in
`map.js` can nudge a label that lands badly, and an optional `short` gives the
map a shorter name than the chips use.

When choosing a species, check that its natural range genuinely centres on one
region — a fish found right across the Indo-Pacific makes for an unfair round.

Rounds per game are set by `ROUNDS` at the top of `src/game.js`. It is 5, so a
game samples 5 of the 30 fish; raise it for a longer game that shows more of the
collection.

## Photo credits

All photographs come from Wikimedia Commons under Creative Commons or
public-domain licences. Per-photo attribution is in [CREDITS.md](CREDITS.md).
