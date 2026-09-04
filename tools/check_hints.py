#!/usr/bin/env python3
"""Check that no fact gives its region away while it is being shown as a hint.

The game shows each fish's fact before the guess, with the place names in it
dotted out by src/spoilers.js. That list is a list, so a fact written later can
name somewhere it does not cover. This reads the terms straight out of
spoilers.js, masks every fact in fish.js the way the game does, and reports the
proper nouns left standing:

    python3 tools/check_hints.py

Proper nouns that name no place — a person, an era, a supercontinent — belong in
ALLOWED below rather than in the spoiler list, so that letting one through is a
decision someone made rather than a term quietly missing.

It reads mid-sentence capitals only. Without a dictionary there is no telling
"Iceland banned it" from "Carries its eggs" at the start of a sentence, and
flagging every opening word would bury the real finding. A fact that opens on a
place name still needs that name in the spoiler list; only a person can catch
that one.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FISH = os.path.join(ROOT, "src", "fish.js")
SPOILERS = os.path.join(ROOT, "src", "spoilers.js")

# Capitalised words that name no place, and so may stand in a hint.
ALLOWED = {
    "Earth",      # "the northernmost freshwater fish on Earth"
    "Gondwana",   # a supercontinent, and four regions were part of it
    "New Year",   # the occasion, not the place
    # What is left of a masked name — "Lake ••••••••••", "•••••• Sea". Worth
    # keeping: a hint that says a lake, without saying which, is still a hint.
    "Lake", "Sea", "Ocean", "River", "Bay", "Gulf", "Islands", "Island",
    "Reef", "Coast", "Sound", "Basin", "Delta", "Strait", "Banks",
}


def terms():
    text = open(SPOILERS, encoding="utf-8").read()
    block = re.search(r"const PLACE_TERMS = \[(.*?)\n\];", text, re.S)
    if not block:
        raise SystemExit("could not find PLACE_TERMS in src/spoilers.js")
    return re.findall(r"'([^']+)'", block.group(1))


def facts():
    """Every (id, region, fact) in fish.js.

    A name or a fact can carry an escaped apostrophe (Lion\\'s, the male\\'s), so
    a string here is "quote, anything that is not an unescaped quote, quote"
    rather than a run of non-quotes — the simpler pattern skips those entries
    silently, which is the one failure a checker must not have.
    """
    text = open(FISH, encoding="utf-8").read()
    rows = re.findall(
        r"id: '([^']+)',\s*name: '(?:[^'\\]|\\.)*',.*?region: '([^']+)',"
        r"\s*fact: '((?:[^'\\]|\\.)*)',\n  \}",
        text, re.S)
    total = len(re.findall(r"^    id: '", text, re.M))
    if len(rows) != total:
        raise SystemExit(f"parsed {len(rows)} facts but fish.js has {total} species"
                         " — an entry does not match the expected shape")
    return rows


def main():
    pattern = re.compile(
        r"\b(?:%s)\b" % "|".join(sorted(terms(), key=len, reverse=True)))
    # A capitalised run that does not open a sentence, so an ordinary "Hunts
    # in packs" is not mistaken for a proper noun. An em dash does not end a
    # sentence, and the facts are full of them, so it does not count as one.
    proper = re.compile(
        r"(?<!^)(?<![.!?]\s)\b[A-Z][a-zà-ÿA-Z'’-]+(?:\s+[A-Z][a-zà-ÿ'’-]+)*")

    rows = facts()
    if not rows:
        raise SystemExit("no facts parsed from src/fish.js — has the shape changed?")

    leaks = []
    for fid, region, fact in rows:
        masked = pattern.sub(lambda m: re.sub(r"\S", "•", m.group(0)), fact)
        left = [m.group(0) for m in proper.finditer(masked)
                if m.group(0) not in ALLOWED]
        if left:
            leaks.append((fid, region, left))

    for fid, region, left in leaks:
        print(f"LEAK {fid} ({region}): {', '.join(left)}")
    print(f"\n{len(rows) - len(leaks)}/{len(rows)} facts hide their region as hints")
    if leaks:
        print("Add a place to src/spoilers.js, or a non-place to ALLOWED here.")
    return 1 if leaks else 0


if __name__ == "__main__":
    sys.exit(main())
