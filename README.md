# Fishguesser 🐟

A GeoGuessr-style guessing game for fish. You get a photograph of a fish and its
name; you decide which of ten regions of the world it comes from.

- **10 species**, each photographed in the wild or in an aquarium
- **10 regions**, from the North Pacific to the Southern Ocean
- **5 rounds per game**, drawn at random from the species list
- **Distance-based scoring** — an exact hit is 5,000 points, and a near miss
  still earns partial credit that decays with how far off you were

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

Click a pin on the map (or a region chip below it), then **Lock in guess**.
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

## Project layout

```
index.html              markup and script order
styles.css              deep-water theme
src/regions.js          the 10 regions + haversine distance
src/fish.js             the 10 fish (name, photo, home region, fun fact)
src/credits.js          generated photo attribution
src/map.js              the world map: projection, coastlines, pins
src/game.js             game loop, scoring, end screen
assets/fish/            the photographs + credits.json
tools/build_credits.py  regenerates src/credits.js and CREDITS.md
tools/build_standalone.py  bundles everything into one shareable HTML file
```

## Building a single-file version

`python3 tools/build_standalone.py` inlines the stylesheet, the scripts and all
ten photographs into `dist/fishguesser.html` — one file that runs with no
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
representative `lat`/`lon` — the map pin and the distance scoring both derive
from those coordinates, so nothing else needs to change.

Rounds per game are set by `ROUNDS` at the top of `src/game.js`. With more than
ten fish in the list you may want to raise it.

## Photo credits

All photographs come from Wikimedia Commons under Creative Commons or
public-domain licences. Per-photo attribution is in [CREDITS.md](CREDITS.md).
