# Working on Fishguesser

## Never say where a species lives

The region a species is filed under **is the answer to a round**. Do not name it
when reporting work — not in a reply, not in a summary, not in the caption on a
screenshot. Say what was added and what makes it worth looking at; leave where
it lives to be discovered in the game.

That rule is the whole game, and the code already keeps it: the common name
reads as dots until it is revealed, the photo credit is held back until the
guess is in because a photographer or a museum can name the place, place names
in the fact are dotted out while the fact is a hint (`src/spoilers.js`, checked
by `tools/check_hints.py`), and the photo check never shows the region at all.
A summary that lists regions undoes all of it in one line.

Commit messages and `src/fish.js` obviously record the region — that is the
data. Reading a diff is a deliberate act; a chat summary is not.

## Where work should land

The repository has no `main`. The default branch — the one GitHub Pages serves,
and the one a new session branches from — is `claude/funny-mayer-1bxc2s`. Work
left on a side branch is invisible to the next session, so finished work belongs
on the default branch (ask first if you were told to develop elsewhere).

## Checks worth running before committing

```sh
python3 tools/check_hints.py     # no fact names its own region while it is a hint
python3 tools/check_regions.py   # the map's sections still land where they should
python3 tools/build_photo_urls.py --check   # every photo URL still resolves
```

Adding species, regions or photographs is documented in [README.md](README.md).
