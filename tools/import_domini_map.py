#!/usr/bin/env python3
"""Import the full Domini equirectangular map and build an optimized web texture.

Usage:
  py -3 tools/import_domini_map.py "D:\\path\\to\\domini_map_20000x10000.png"

Writes:
  assets/ui/domini/domini_map_wip_full.png   (source copy, gitignored if huge)
  assets/ui/domini/domini_map_wip.png        (optimized working source)
  web/encyclopedia/media/domini/domini_map_wip.png  (site texture, via rebuild)
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOMINI_DIR = ROOT / "assets" / "ui" / "domini"
FULL = DOMINI_DIR / "domini_map_wip_full.png"
WIP = DOMINI_DIR / "domini_map_wip.png"

# Web-safe equirectangular size (2:1). 4096 keeps labels readable without melting browsers.
WEB_W = 4096
WEB_H = 2048


def main() -> int:
    ap = argparse.ArgumentParser(description="Import full Domini map → optimized globe texture")
    ap.add_argument("source", type=Path, help="Path to the full map PNG (ideally 20000×10000)")
    ap.add_argument("--web-width", type=int, default=WEB_W, help=f"Optimized width (default {WEB_W})")
    args = ap.parse_args()
    src: Path = args.source.expanduser().resolve()
    if not src.is_file():
        print(f"Source not found: {src}", file=sys.stderr)
        return 1

    try:
        from PIL import Image

        Image.MAX_IMAGE_PIXELS = None  # allow 20000×10000 source maps
    except ImportError:
        print("Pillow required: pip install Pillow", file=sys.stderr)
        return 1

    DOMINI_DIR.mkdir(parents=True, exist_ok=True)
    im = Image.open(src)
    im = im.convert("RGB")
    w, h = im.size
    print(f"Source: {src.name} · {w}×{h} · {src.stat().st_size / 1e6:.2f} MB")

    # Keep a local full-res copy for future rebuilds (gitignored).
    if src.resolve() != FULL.resolve():
        print(f"Copying full source → {FULL}")
        shutil.copy2(src, FULL)

    web_w = max(1024, int(args.web_width))
    web_h = web_w // 2

    if w <= web_w and h <= web_h:
        print("Source is already ≤ web size — copying without upscale.")
        shutil.copy2(src, WIP)
    else:
        target = Image.new("RGB", (web_w, web_h), (0xC5, 0x82, 0x9B))
        fitted = im.copy()
        fitted.thumbnail((web_w, web_h), Image.Resampling.LANCZOS)
        ox = (web_w - fitted.size[0]) // 2
        oy = (web_h - fitted.size[1]) // 2
        target.paste(fitted, (ox, oy))
        target.save(WIP, format="PNG", optimize=True)
        print(f"Optimized WIP → {WIP} · {web_w}×{web_h} · {WIP.stat().st_size / 1e6:.2f} MB")

    # Rebuild encyclopedia media + data.js
    sys.path.insert(0, str(ROOT / "tools"))
    from build_encyclopedia import main as build_main

    build_main()
    print("Done. Hard-refresh the encyclopedia Domini 3D globe.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
