#!/usr/bin/env python3
"""Bump the version in src/version.js and stamp today's date.

    python3 tools/bump_version.py            # patch: 1.4.0 -> 1.4.1
    python3 tools/bump_version.py minor      # 1.4.1 -> 1.5.0
    python3 tools/bump_version.py major      # 1.5.0 -> 2.0.0
    python3 tools/bump_version.py 2.1.3      # set it explicitly

Run this before committing a change you want to be visible in the header, then
rebuild the single-file bundle if you publish one.
"""
import datetime
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "src", "version.js")


def read():
    with open(PATH, encoding="utf-8") as f:
        return f.read()


def current(text):
    m = re.search(r"version:\s*'(\d+)\.(\d+)\.(\d+)'", text)
    if not m:
        raise SystemExit("could not find a version string in src/version.js")
    return tuple(int(g) for g in m.groups())


def bump(part, ver):
    major, minor, patch = ver
    if part == "major":
        return major + 1, 0, 0
    if part == "minor":
        return major, minor + 1, 0
    if part == "patch":
        return major, minor, patch + 1
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", part)
    if not m:
        raise SystemExit(f"unrecognised argument {part!r}: use major, minor, patch or X.Y.Z")
    return tuple(int(g) for g in m.groups())


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "patch"
    text = read()
    old = current(text)
    new = bump(arg, old)
    today = datetime.date.today().isoformat()

    text = re.sub(r"version:\s*'[^']*'", f"version: '{'.'.join(map(str, new))}'", text, count=1)
    text = re.sub(r"date:\s*'[^']*'", f"date: '{today}'", text, count=1)
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"{'.'.join(map(str, old))} -> {'.'.join(map(str, new))}  ({today})")


if __name__ == "__main__":
    main()
