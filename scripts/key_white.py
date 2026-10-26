#!/usr/bin/env python3
"""Cut a product shot on white into a PNG with alpha.

Removes the white background that touches the image border (flood fill), so
light areas inside the product stay opaque. Edges get a soft 1-2 px falloff.

    python3 -I scripts/key_white.py in.jpg out.png [size] [--holes]

--holes also clears enclosed pure-white areas (e.g. the gap inside a frame).
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def key(src, dst, size=900, thresh=238, chroma=14, holes=False):
    im = Image.open(src).convert('RGB')
    im.thumbnail((size, size), Image.LANCZOS)
    a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape
    bright = a.min(axis=2) >= thresh
    flat = (a.max(axis=2) - a.min(axis=2)) <= chroma
    cand = bright & flat
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    if holes:
        # Enclosed regions that are pure white and not tiny count as background too.
        hole = (a.min(axis=2) >= 250) & ((a.max(axis=2) - a.min(axis=2)) <= 6) & ~bg
        seen = np.zeros((h, w), bool)
        for y0, x0 in zip(*np.nonzero(hole)):
            if seen[y0, x0]:
                continue
            comp = [(y0, x0)]; seen[y0, x0] = True; i = 0
            while i < len(comp):
                y, x = comp[i]; i += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and hole[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; comp.append((ny, nx))
            if len(comp) > 300:
                ys, xs = zip(*comp); bg[list(ys), list(xs)] = True
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox:
        pad = 12
        out = out.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
    out.save(dst, optimize=True)


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    key(args[0], args[1], int(args[2]) if len(args) > 2 else 900, holes='--holes' in sys.argv)
