#!/usr/bin/env python3
"""Find where a product photo sits inside the first/last frame of a transition clip.

The generated clips start and end close to the product photos but not exactly on
them (the end is often a closer framing). For a seamless hand-over the composition
scales and shifts the photo onto the clip frame and eases it back. This script
searches that uniform scale + offset (frame = photo * s + t, in units of the image
size) by brute force on small greyscale versions.

  python3 -I scripts/match_frame.py <out.js> <name> <plates_dir> <photo_from> <photo_to> [<name> ...]

Writes `window.CLIP_INFO = { name: { frames, start: {s,tx,ty,err}, land: {...} } }`.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

N = 128
BG = 242                         # product photo background (#f2f2f2)


def grey(path):
    return Image.open(path).convert('L').resize((N, N), Image.BILINEAR)


def warp(photo, s, tx, ty):
    # PIL maps output px -> input px: in = (out - N t) / s
    a = 1 / s
    out = photo.transform((N, N), Image.AFFINE, (a, 0, -N * tx * a, 0, a, -N * ty * a),
                          resample=Image.BILINEAR, fillcolor=BG)
    return np.asarray(out, np.float32)


def search(photo, frame):
    f = np.asarray(frame, np.float32)
    best = (1e9, 1.0, 0.0, 0.0)

    def scan(ss, txs, tys):
        nonlocal best
        for s in ss:
            for tx in txs:
                for ty in tys:
                    err = float(np.abs(warp(photo, s, tx, ty) - f).mean())
                    if err < best[0]:
                        best = (err, s, tx, ty)

    scan(np.geomspace(0.5, 3.5, 36), np.linspace(-2.6, 0.6, 33), np.linspace(-2.6, 0.6, 33))
    for step in (0.04, 0.01, 0.003):
        _, s0, tx0, ty0 = best
        r = np.linspace(-4, 4, 9) * step
        scan(s0 * (1 + r), tx0 + r, ty0 + r)
    err, s, tx, ty = best
    return {'s': round(s, 4), 'tx': round(tx, 4), 'ty': round(ty, 4), 'err': round(err, 2)}


def main(argv):
    out, rest = argv[0], argv[1:]
    if not rest or len(rest) % 4:
        sys.exit(__doc__)
    info = {}
    for i in range(0, len(rest), 4):
        name, plates, photo_a, photo_b = rest[i:i + 4]
        frames = sorted(f for f in os.listdir(plates) if f.endswith('.jpg'))
        info[name] = {
            'frames': len(frames),
            'start': search(grey(photo_a), grey(os.path.join(plates, frames[0]))),
            'land': search(grey(photo_b), grey(os.path.join(plates, frames[-1]))),
        }
        print(name, json.dumps(info[name]))
    with open(out, 'w') as fh:
        fh.write('window.CLIP_INFO = ' + json.dumps(info) + ';\n')


if __name__ == '__main__':
    main(sys.argv[1:])
