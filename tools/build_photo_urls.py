#!/usr/bin/env python3
"""Rewrite the `image:` URL of every fish in src/fish.js from credits.json.

Photos are linked rather than committed, so the only thing stored per fish is
where its picture lives. Most entries name a Wikimedia Commons file and the CDN
thumbnail URL is derived from that filename.

An entry may instead carry an explicit `image_url`, which is used verbatim.
That is for species Commons cannot show properly — a few are photographed
alive only on iNaturalist, whose open-licensed photos are served from a stable
S3 bucket and already sized. Such an entry needs `author`, `license`,
`license_url` and `source` like any other; there is simply no filename to
hash.

The path is `.../thumb/<h0>/<h0h1>/<Name>/<width>px-<Name>`, where the hash is
the MD5 of the underscored filename — of the *name*, not the file contents, so
the URL keeps working if the image is re-uploaded. Linking the CDN directly
also avoids the Special:FilePath redirect, saving a round trip per photo.

    python3 tools/build_photo_urls.py [--width 1280] [--check]

`--check` additionally requests every URL and reports any that do not return an
image. Wikimedia rate-limits bursts from one address, so the check is paced;
a 429 there means the checker was too quick, not that the link is broken.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FISH = os.path.join(ROOT, "src", "fish.js")
CREDITS = os.path.join(ROOT, "assets", "fish", "credits.json")
UA = "Fishguesser/0.1 (educational game; https://github.com/blakekokal/fishguesser)"


def photo_url(commons_title, width):
    name = commons_title.replace("File:", "").replace(" ", "_")
    digest = hashlib.md5(name.encode("utf-8")).hexdigest()
    quoted = urllib.parse.quote(name)
    # A PNG original is thumbnailed as PNG unless .jpg is appended, and a
    # photograph stored as PNG is several times heavier that way — 1.6 MB
    # against 250 KB for the same picture as JPEG.
    suffix = ".jpg" if name.lower().endswith((".png", ".tif", ".tiff")) else ""
    return (f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
            f"{digest[0]}/{digest[:2]}/{quoted}/{width}px-{quoted}{suffix}")


def rewrite(width):
    with open(CREDITS, encoding="utf-8") as f:
        credits = json.load(f)
    with open(FISH, encoding="utf-8") as f:
        lines = f.read().split("\n")

    current = None
    urls = {}
    out = []
    for line in lines:
        found = re.match(r"    id: '([^']+)',", line)
        if found:
            current = found.group(1)
        if line.startswith("    image: "):
            if current not in credits:
                raise SystemExit(f"no credits entry for {current}")
            entry = credits[current]
            # An explicit URL wins: it is already a finished link, and there is
            # no Commons filename to derive one from.
            url = entry.get("image_url") or photo_url(entry["commons_title"], width)
            urls[current] = url
            line = f"    image: '{url}',"
        out.append(line)

    with open(FISH, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    return urls


def check(urls, pause):
    bad = []
    for i, (fid, url) in enumerate(urls.items(), 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                size = len(r.read())
                ok = r.status == 200 and size > 5000
                note = f"{r.status} {size // 1024}KB"
        except Exception as e:  # noqa: BLE001 - report whatever went wrong
            ok, note = False, str(e)[:60]
        if not ok:
            bad.append(f"{fid}: {note}")
        print(f"{'ok  ' if ok else 'BAD '}{fid:26} {note}")
        sys.stdout.flush()
        if i < len(urls):
            time.sleep(pause)
    return bad


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=1280,
                    help="thumbnail width; use a standard size so it is served from cache")
    ap.add_argument("--check", action="store_true", help="request every URL as well")
    ap.add_argument("--pause", type=float, default=2.0, help="seconds between checks")
    args = ap.parse_args()

    urls = rewrite(args.width)
    print(f"wrote {len(urls)} photo URLs at {args.width}px into src/fish.js")

    if args.check:
        print()
        bad = check(urls, args.pause)
        print(f"\n{len(urls) - len(bad)}/{len(urls)} links resolve")
        if bad:
            print("FAILURES:")
            for b in bad:
                print("  ", b)
            raise SystemExit(1)
