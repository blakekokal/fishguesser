# Fishguesser 🐟

A GeoGuessr-style guessing game for fish. You get a photograph of a fish and its
name; you decide which of fifteen regions of the world it comes from.

- **120 species** — mostly bony fish, plus eleven sharks, a lamprey, a stingray
  and a chimaera — each photographed alive in the wild or in an aquarium
- **15 regions**, from the Arctic Ocean to New Zealand — between four and twelve
  fish live in each, so the map has to be read rather than memorised. The header counts
  the collection straight from the data, so it never goes stale
- **5 rounds per game**, dealt so that every species comes up once before any
  of them comes up twice — a full pass takes 24 games, and it survives a
  refresh
- **Distance-based scoring** — an exact hit is 5,000 points, and a near miss
  still earns partial credit that decays with how far off you were
- **The name is fully censored** — it reads as dots until you reveal it, so the
  photograph is the clue. The scientific name stays visible; the photo credit is
  held back until you answer, since a photographer or museum can name the place
- **A front page with the rules**, so the two kinds of peek and what they cost
  are clear before the first fish rather than discovered by losing points
- **Two ways to peek** — **Show half** gives back the last word of the name and
  costs no reveal, while **Reveal name** un-masks the whole thing and spends one
  of two reveals shared across the game. The full name always appears free once
  you have guessed, since by then it is not a hint
- **Bonuses for not peeking** — +500 for each fish you guess with its name still
  fully censored, and another +500 for every reveal you finish with. Either kind
  of peek gives up that round's +500; only a full reveal costs you a reveal
- **Fits a phone on one screen** in both portrait and landscape, without
  scrolling — the photo takes whatever height is left rather than setting it
- **The whole fish, always** — photos come in every proportion, so the frame
  letterboxes rather than crops, and fills the gap with a blurred wash of the
  same photo. Nothing loses its head or tail to the frame

No build step and no dependencies. Photos are linked from Wikimedia Commons
rather than committed, so the game needs a network connection to show them.

## Playing

Open `index.html` in a browser. A front page lays out the rules and the scoring
before the first round; **Start** (or `Enter`) begins. The first fish is dealt
behind it so its photo is already loading while the rules are being read, and
**Play again** at the end skips straight back into a game.

Some browsers restrict pages loaded over `file://`, so if anything looks off,
serve the folder over HTTP instead:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Click a labelled section of the map, then **Lock in guess**. Every section is
named on the map itself, so there is no separate list to cross-reference.
Sections are keyboard reachable too: `Tab` moves between them and `Enter`
picks one. `Enter` also locks in a guess and advances to the next fish.
Your best score and your place in the fish cycle are both kept in
`localStorage`, under `fishguesser.best` and `fishguesser.seen`. That is this
browser only — there is no account and no server, so the score does not follow
you to another device, and clearing site data resets both. Blocked storage
(private windows, say) is caught and ignored: the game still plays, it just
starts fresh each time.

## Photo check

`photos.html` steps through all 120 photographs one at a time, in the same
letterboxed frame the game uses, so a picture can be judged as a player would
meet it: is that a whole fish, is it alive, is it recognisable? The name,
species, region and credit show underneath, since the page is mostly used to
spot a bad photo and say which one it is. `R` hides them to look at a picture
cold. It is linked from the footer of the game.

`←` / `→` (or the buttons) step, `Home` and `End` jump to the ends, the number
box goes straight to one, and `R` toggles the details. The order follows `FISH`,
so the number under a photo is a stable way to point at one. A photo that fails
to load says so in the frame, which makes a dead link easy to spot.

## How scoring works

| | Points |
| --- | --- |
| Correct region | 5,000 |
| Wrong region | `5000 × e^(−distance_km / 3000)` |
| Guessed with the name fully censored | +500 per round |
| Each reveal left unspent at the end | +500 |

A perfect game is 28,500: five rounds at 5,000, five no-peek bonuses, and 1,000
for finishing with both reveals.

So picking a neighbouring region ~1,500 km away still scores about 3,000, a
guess 6,000 km off scores around 680, and one on the far side of the planet
scores almost nothing. Distance is the great-circle distance between the
centroids of the two regions.

The map sections follow the same rule: every point on the map belongs to
whichever region's centre is nearest, so a section is exactly "everywhere
closer to this region than to any other". The fifteen sections tile the map
completely — there is no unclaimed water.

## Project layout

```
index.html              markup and script order
photos.html             the photo check: every picture, answers hidden
styles.css              deep-water theme
src/version.js          version + build date shown in the header
src/regions.js          the 15 regions + haversine distance
src/fish.js             the 120 fish (name, photo URL, home region, fun fact)
src/credits.js          generated photo attribution
src/coastlines.js       generated Natural Earth land outlines
src/map.js              the world map: projection, coastlines, section partition
src/game.js             game loop, scoring, end screen
src/photos.js           the photo check page
assets/fish/credits.json  which Commons file each fish uses, and its credit
tools/build_credits.py  regenerates src/credits.js and CREDITS.md
tools/bump_version.py   bumps the version and stamps today's date
tools/build_photo_urls.py  regenerates the photo URLs (--check verifies them)
tools/build_coastlines.py  regenerates src/coastlines.js from Natural Earth
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

## Adding more fish or regions

The data files are plain arrays, so extending the game is additive:

1. Add an entry to `assets/fish/credits.json` naming the Commons file
   (`commons_title`) plus its author, licence and source URL.
2. Append the fish to `FISH` in `src/fish.js`, pointing `region` at a region id.
3. Run `python3 tools/build_photo_urls.py --check` to fill in the photo URL and
   confirm it resolves, then `python3 tools/build_credits.py` to regenerate
   `src/credits.js` and `CREDITS.md`.

To add a region, append it to `REGIONS` in `src/regions.js` with a
representative `lat`/`lon` — that is all. The map sections are computed from
those coordinates, so a new region carves its own section out of its
neighbours automatically and the map stays fully covered. `LABEL_AT` in
`map.js` can nudge a label that lands badly, and an optional `short` gives the
map a shorter name than the full one.

When choosing a species, check two things. Its natural range has to centre
genuinely on one region — a fish found right across the Indo-Pacific makes for
an unfair round. And the photograph has to *show the fish*: Commons is full of
correctly named, correctly licensed pictures that are useless as a clue —
specimens in jars, taxidermy mounts, fish on a plate, scientific illustrations,
shoals too distant to read. `--check` confirms a URL resolves, not that the
picture is any good, so look at it.

Regions do not need equal numbers of fish, and they do not have them. Pick the
best species and the best photograph for each region and let the counts fall
where they fall: the Southern Ocean has four, the Arctic five, the Caribbean,
Amazon and Great Lakes seven. Scoring is by distance and the map sections are
computed from region centres, so nothing in the game depends on the counts
matching.

Rounds per game are set by `ROUNDS` at the top of `src/game.js`. It is 5, so a
game samples 5 of the 120 fish; raise it for a longer game that shows more of the
collection.

## Map data

The coastlines are Natural Earth 110m land polygons, which are public domain.
`src/coastlines.js` is generated — rebuild it with
`python3 tools/build_coastlines.py`. Coordinates are stored as lat/lon and
projected at runtime, so the coastlines, the region sections and the labels all
go through one projection and cannot drift apart.

## Photo credits

All photographs come from Wikimedia Commons under Creative Commons or
public-domain licences, and are linked from Commons rather than copied here.
Per-photo attribution is in [CREDITS.md](CREDITS.md).
