#!/usr/bin/env python3
"""Bundle the game into a single self-contained HTML file.

Inlines the stylesheet, every script and all ten photographs (as base64 data
URIs) so the result is one file that runs with no server, no network access and
no sibling assets — handy for sharing or hosting somewhere strict about
external requests.

    python3 tools/build_standalone.py [output.html]
"""
import base64
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = ["src/regions.js", "src/fish.js", "src/credits.js", "src/map.js", "src/game.js"]
DEFAULT_OUT = os.path.join(ROOT, "dist", "fishguesser.html")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def data_uri(rel):
    with open(os.path.join(ROOT, rel), "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("ascii")


def build():
    html = read("index.html")

    body = re.search(r"<body>(.*)</body>", html, re.S)
    if not body:
        raise SystemExit("could not find <body> in index.html")
    markup = body.group(1)

    # The bundled scripts replace the <script src> tags entirely.
    markup = re.sub(r'\s*<script src="[^"]+"></script>', "", markup)

    # CREDITS.md does not travel with a single file; point at the source instead.
    markup = markup.replace(
        '<a href="CREDITS.md">CREDITS.md</a>',
        '<a href="https://github.com/blakekokal/fishguesser/blob/main/CREDITS.md">CREDITS.md</a>',
    )

    js = "\n".join(read(p) for p in SCRIPTS)

    # Swap every asset path for an inline copy of the photo.
    used = set()

    def swap(m):
        used.add(m.group(1))
        return "'" + data_uri("assets/fish/" + m.group(1) + ".jpg") + "'"

    js, n = re.subn(r"'assets/fish/([a-z-]+)\.jpg'", swap, js)
    if n == 0:
        raise SystemExit("no photo paths found to inline — did fish.js change?")

    out = [
        "<title>Fishguesser</title>",
        "<style>",
        read("styles.css").strip(),
        "</style>",
        markup.strip(),
        "<script>",
        js.strip(),
        "</script>",
        "",
    ]
    return "\n".join(out), len(used)


if __name__ == "__main__":
    dest = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    page, photos = build()
    os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"wrote {dest} — {len(page) / 1_048_576:.1f} MB, {photos} photos inlined")
