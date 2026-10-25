#!/usr/bin/env python3
"""Work out the order species were added in, and write it to src/added.js.

The collection is stored by region, so nothing in src/fish.js says which
entries are new. The repository does: every species arrived in some commit, and
walking the history of that one file in order gives the sequence they appeared
in. That sequence is what "the last hundred added" means.

    python3 tools/build_added.py

Entries sitting in the working copy but not yet committed are counted as the
newest, so the list is right whether this is run before or after committing.
A swapped photograph does not move a species: this is when the animal joined
the collection, not when its picture last changed (PHOTO_ORDER, in
src/credits.js, is the other one).
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FISH = os.path.join(ROOT, "src", "fish.js")
OUT = os.path.join(ROOT, "src", "added.js")
REL = "src/fish.js"

ID = re.compile(r"^    id: '([^']+)',", re.M)


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args],
                          capture_output=True, text=True, check=True).stdout


def order():
    """Every id, oldest first, by the commit it first appeared in."""
    seen = {}
    commits = git("log", "--reverse", "--format=%H", "--", REL).split()
    for commit in commits:
        try:
            text = git("show", f"{commit}:{REL}")
        except subprocess.CalledProcessError:
            continue  # the file did not exist at that commit yet
        for fid in ID.findall(text):
            seen.setdefault(fid, commit)
    ids = list(seen)

    # Whatever is on disk now wins: an id the history has never seen is new,
    # and one the history has but the file no longer does has been removed.
    current = ID.findall(open(FISH, encoding="utf-8").read())
    live = set(current)
    ids = [i for i in ids if i in live]
    ids += [i for i in current if i not in seen]
    return ids


def write(ids):
    lines = [
        "/* Fishguesser — the order species were added in, oldest first.",
        " *",
        " * GENERATED FILE — do not edit by hand.",
        " * Run `python3 tools/build_added.py` to rebuild it from the history of",
        " * src/fish.js. The collection itself is stored by region, so this is the",
        " * only record of what is new; the filter's \"last 100\" reads off the end",
        " * of it. Kept as a plain script so the game still works from disk. */",
        "",
        "const ADDED_ORDER = [",
    ]
    for fid in ids:
        lines.append(f"  '{fid}',")
    lines.append("];")
    lines.append("")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main():
    ids = order()
    write(ids)
    print(f"wrote src/added.js — {len(ids)} species, newest is {ids[-1]!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
