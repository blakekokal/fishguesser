# Fishguesser 🐟

A GeoGuessr-style guessing game for sea life. You get a photograph of an animal
and its name; you decide which of fifteen regions of the world it comes from.

- **250 species** — mostly bony fish, plus twenty-three sharks, eight rays, a
  sawfish, a lamprey and a chimaera, and thirty-three that are not fish at all:
  thirteen crabs, two octopuses, a cuttlefish, a whale, two river dolphins, two
  turtles, two jellyfish and a siphonophore, a prawn, a crayfish, a krill, a
  mantis shrimp, two sea stars, two swimming sea slugs and a horseshoe crab —
  each photographed alive in the wild or in an aquarium
- **15 regions**, from the Arctic Ocean to New Zealand — between six and
  twenty-two species live in each, so the map has to be read rather than memorised. The header counts
  the collection straight from the data, so it never goes stale
- **5 rounds per game**, dealt so that every species comes up once before any
  of them comes up twice — a full pass takes 48 games, and it survives a
  refresh
- **A top bar of four tiles** — round, score, hints and best. Everything else —
  the pass counter, the filter, the save name, the photo check — is behind one
  **Settings** button on the right, which on a phone is a whole row of the bar
  given back to the photograph
- **A filter under Settings** — deal from the whole collection or narrow it:
  **fish mode**, **sea life** (everything that is not a fish), **crab mode**,
  **shark mode**, crossed with **unseen first** (the default, and how the game
  has always dealt), **seen only** or **any**.
  Each option carries the number of species behind it, and a narrowed mode never
  spends the pass of the species it does not deal
- **Distance-based scoring** — an exact hit is 5,000 points, and a near miss
  still earns partial credit that decays with how far off you were
- **The name is fully censored** — it reads as dots until you reveal it, so the
  photograph is the clue. The scientific name sits on the same line rather than
  under it, which is a line of height the photograph gets instead; the photo credit is
  held back until you answer, since a photographer or museum can name the place
- **The fact is a free hint** — **Show hint** puts what the animal does on
  screen before you guess, since behaviour is a fair clue to where something
  lives. It costs nothing and no bonus, and it stays folded away until asked for
  so the photograph keeps the height. Any place it names is dotted out while it
  is a hint (`src/spoilers.js`) and comes back with the result, so a hint can
  never simply hand over the answer
- **A front page with the rules**, so the two kinds of peek and what they cost
  are clear before the first fish rather than discovered by losing points
- **Two ways to peek** — **Show half** gives back half the name's letters,
  picked at random and scattered through it, and costs no reveal, while
  **Reveal name** un-masks the whole thing and spends one of two reveals shared
  across the game. The full name always appears free once you have guessed,
  since by then it is not a hint
- **Bonuses for not peeking** — +500 for each fish you guess with its name still
  fully censored, and another +500 for every reveal you finish with. Either kind
  of peek gives up that round's +500; only a full reveal costs you a reveal
- **One screen, and the photo takes what is left** — the page fits the window
  on a desktop as well as a phone, in portrait and landscape, and the photograph
  is given every pixel the name, the buttons and any open hint do not need. The
  photo panel takes the larger share of the width, since most of the collection
  is photographed landscape and a letterboxed picture is limited by the width of
  its frame rather than the height. Between 561px and 1000px wide the two panels
  stack and the page scrolls instead, since one screen cannot hold both
- **The whole fish, always** — photos come in every proportion, so the frame
  letterboxes rather than crops, and fills the gap with a blurred wash of the
  same photo. Nothing loses its head or tail to the frame

No build step and no dependencies. Photos are linked from Wikimedia Commons
and iNaturalist rather than committed, so the game needs a network connection
to show them.

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
`localStorage`, under `fishguesser.best` and `fishguesser.seen`. Best is a tile
in the top bar and the pass counter is the first line under **Settings**, each
with a small `↺` beside it that clears that one on its own. The cycle counts a fish when it reaches the screen rather than when the
hand is dealt, so reloading the page, or walking away mid-game, does not spend
fish you never saw. That is this browser only — there is no account and no
server, so the score does not follow you to another device, and clearing site
data resets both. Blocked storage
(private windows, say) is caught and ignored: the game still plays, it just
starts fresh each time.


## Saves

There is no server behind the game, so the rules card's **Your save** block
offers the two things a static page honestly can:

- **A name**, typed either under **Settings** (reachable mid-game, and from the
  rules card) or here, which labels a save slot in this browser (`fishguesser.best:<name>`
  and `fishguesser.seen:<name>`) so two people can share a browser without
  spending each other's pass. Naming a save for the first time carries the
  progress already there with it; a second name starts empty. No password —
  the name is a label, not an account.
- **A backup code**, which is the save written out as one line of text
  (`FG1.` + base64). Keep it anywhere. **Restore** merges it back: seen fish
  are unioned and the best score is the higher of the two, so pasting an old
  code can never cost you progress, and a code carrying a name gives an unnamed
  browser that name back. Ids travel as five-character hashes, which keeps a
  full 250-fish save near 2 KB and lets a restore match whatever species the
  game holds now — anything it no longer knows is dropped and counted in the
  message.

A code is a plain backup, not a login: anyone holding it can load that progress,
and it only carries the two numbers above.

## Photo check

`photos.html` steps through all 250 photographs one at a time, in the same
letterboxed frame the game uses, so a picture can be judged as a player would
meet it: is that a whole fish, is it alive, is it recognisable? The name,
species and credit show underneath, since the page is mostly used to spot a bad
photo and say which one it is. `R` hides them to look at a picture cold. The
region is never shown, deliberately — that is the game's answer, and reviewing
the photographs should not spend it. It is linked under **Settings** in the top
bar, and from the footer.

`←` / `→` (or the buttons) step, `Home` and `End` jump to the ends, the number
box goes straight to one, and `R` toggles the details. It opens newest photo
first — the order photos were added, from `PHOTO_ORDER` in the generated
credits, where a swapped photo counts as new — so a batch just added is the
first thing on screen. **Collection order** switches to the order in `FISH`,
where the number under a photo is a stable way to point at one; either way the
toggle keeps the picture you are looking at. A photo that fails
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

The map sections follow a related but separate rule. Every point belongs to the
region whose nearest **seed** is nearest — seeds being the handful of [lon, lat]
points each region carries in `src/regions.js`, tracing the water it actually
occupies. The fifteen sections still tile the map completely, with no unclaimed
water, but they come out the shape of the seas: the Great Lakes region is
landlocked North America, the Pacific has the American west coast and the
Atlantic the east, and the Southern Ocean is a band right round Antarctica
rather than a wedge.

Scoring never reads the seeds. Distance is still centroid to centroid, so how a
section is drawn and how far apart two regions are stay separate questions.
`python3 tools/check_regions.py` re-runs the rule over four dozen real places —
Chicago, the Grand Banks, Lake Malawi, the Ross Sea — and reports anything that
lands in the wrong section, which is how a mistyped seed gets caught.

## Project layout

```
index.html              markup and script order
photos.html             the photo check: every picture, answers hidden
styles.css              deep-water theme
src/version.js          version + build date shown in the header
src/regions.js          the 15 regions, their map seeds + haversine distance
src/fish.js             the 250 species (name, photo URL, home region, fact)
src/spoilers.js         place names, dotted out while a fact is a hint
src/kinds.js            what counts as a fish, a crab, a shark for the filter
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
tools/check_hints.py    checks no fact names its region while it is a hint
tools/check_regions.py  checks the map sections land where they should
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
4. Run `python3 tools/check_hints.py`. The fact is shown before the guess, so
   any place it names has to be in `PLACE_TERMS` in `src/spoilers.js` to be
   dotted out; the check reads the list and reports what is left standing.
5. Only if it is not a fish: `src/kinds.js` reads crabs, sharks and rays off
   their names, so those need nothing, but anything else that is not a fish — a
   cephalopod, a mammal, a sea star, a mantis shrimp — has to go in `NOT_FISH`
   there, or "Fish mode" will deal it and "Sea life" will not. A name that lies goes in `NOT_CRABS` or
   `NOT_SHARKS` beside it: the horseshoe crab is a chelicerate, not a crab.

A fact can give the region away without naming it — a word quoted in the local
language, a fishery, a myth everyone can place. No list catches those, so write
the fact asking whether it would still be a puzzle with the place names gone.

To add a region, append it to `REGIONS` in `src/regions.js` with a
representative `lat`/`lon` — that is all it takes to get on the map, since a
region with no seeds stands on its centroid, carves its own section out of its
neighbours and keeps the map fully covered. Give it `seeds` when the shape of
that section matters, and run `tools/check_regions.py`. `LABEL_AT` in
`map.js` can nudge a label that lands badly, `STACKED` there breaks a long name
onto two lines, and an optional `short` gives the map a shorter name than the
full one.

When choosing a species, check two things. Its natural range has to centre
genuinely on one region — a fish found right across the Indo-Pacific makes for
an unfair round. And the photograph has to *show the fish*: Commons is full of
correctly named, correctly licensed pictures that are useless as a clue —
specimens in jars, taxidermy mounts, fish on a plate, scientific illustrations,
shoals too distant to read. `--check` confirms a URL resolves, not that the
picture is any good, so look at it.

Regions do not need equal numbers of fish, and they do not have them. Pick the
best species and the best photograph for each region and let the counts fall
where they fall: the Southern Ocean has five and the Arctic eight, where the
Coral Triangle has nineteen. Scoring is by distance and the map sections are
computed from region centres, so nothing in the game depends on the counts
matching.

Rounds per game are set by `ROUNDS` at the top of `src/game.js`. It is 5, so a
game samples 5 of the 250 species; raise it for a longer game that shows more of the
collection.

## Map data

The coastlines are Natural Earth 110m land polygons, which are public domain.
`src/coastlines.js` is generated — rebuild it with
`python3 tools/build_coastlines.py`. Coordinates are stored as lat/lon and
projected at runtime, so the coastlines, the region sections and the labels all
go through one projection and cannot drift apart.

## Photo credits

Photographs come from Wikimedia Commons and iNaturalist under Creative Commons
or public-domain licences, and are linked rather than copied here.

Commons is the first stop, but it runs thin on fish that are common as catch
and rare as photographs: for a lot of species it holds only a landed fish on a
deck, a museum specimen, or a nineteenth-century plate. iNaturalist fills those
gaps, because its records are photographs of animals people met alive. Its
research-grade filter — where other people have confirmed the identification —
keeps the species honest, and the licence filter keeps only CC0, CC BY and
CC BY-SA photos. Every candidate is still looked at before it goes in: no dead
fish, no specimens, no illustrations, and nothing where the fish cannot be made
out. Per-photo attribution is in [CREDITS.md](CREDITS.md).

To use an iNaturalist photo, give the entry in `credits.json` an `image_url`
instead of a `commons_title`; `build_photo_urls.py` then uses that URL as-is.
Take only `cc0`, `cc-by` or `cc-by-sa` photos from `quality_grade=research`
observations, and credit the observer.
