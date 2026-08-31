#!/usr/bin/env python3
"""Regenerate src/credits.js and CREDITS.md from assets/fish/credits.json.

credits.json is written by the download step and is the source of truth for
photo attribution. Run this after adding or swapping any photo:

    python3 tools/build_credits.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDITS = os.path.join(ROOT, "assets", "fish", "credits.json")


def load():
    with open(CREDITS, encoding="utf-8") as f:
        return json.load(f)


def write_js(data):
    lines = [
        "/* Fishguesser — photo attribution.",
        " *",
        " * GENERATED FILE — do not edit by hand.",
        " * Run `python3 tools/build_credits.py` to rebuild from",
        " * assets/fish/credits.json. Kept as a plain script (not JSON fetched at",
        " * runtime) so the game still works when opened straight from disk. */",
        "",
        "const PHOTO_CREDITS = {",
    ]
    for fid, c in sorted(data.items()):
        lines.append(f"  {json.dumps(fid)}: {{")
        for key in ("author", "license", "license_url", "source"):
            lines.append(f"    {key}: {json.dumps(c.get(key, ''), ensure_ascii=False)},")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    # credits.json is written in the order photos were added, so its key order
    # is the collection's history. Kept alongside the credits so the photo
    # check can show the newest pictures first without a date on every entry.
    lines.append("/* Fish ids in the order their photo was added, oldest first. */")
    lines.append("const PHOTO_ORDER = [")
    for fid in data:
        lines.append(f"  {json.dumps(fid)},")
    lines.append("];")
    lines.append("")
    path = os.path.join(ROOT, "src", "credits.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


def write_md(data):
    lines = [
        "# Photo credits",
        "",
        "Every fish photograph comes from [Wikimedia",
        "Commons](https://commons.wikimedia.org) or",
        "[iNaturalist](https://www.inaturalist.org) under a free licence. The second",
        "source covers the many species Commons has no usable living photograph of.",
        "Each entry links to its source page, which carries the full licence text",
        "and author details.",
        "",
        "This file is generated — run `python3 tools/build_credits.py` to rebuild it.",
        "",
        "| Fish | Author | Licence | Source |",
        "| --- | --- | --- | --- |",
    ]
    for fid, c in sorted(data.items()):
        author = (c.get("author") or "Unknown").replace("|", "\\|").replace("\n", " ")
        lic = c.get("license") or "—"
        lic_url = c.get("license_url")
        lic_cell = f"[{lic}]({lic_url})" if lic_url else lic
        source = c.get("source", "")
        # Name the host the link actually goes to; most are Commons, a few iNat.
        host = "iNaturalist" if "inaturalist.org" in source else "Commons"
        lines.append(f"| `{fid}` | {author} | {lic_cell} | [{host}]({source}) |")
    lines.append("")
    path = os.path.join(ROOT, "CREDITS.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


if __name__ == "__main__":
    data = load()
    for p in (write_js(data), write_md(data)):
        print("wrote", os.path.relpath(p, ROOT))
