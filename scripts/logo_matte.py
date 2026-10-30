#!/usr/bin/env python3
"""Pull a static burned-in logo out of finished plates.

  logo_matte.py <plates_dir> <logo.png> --box x0,y0,x1,y1 --ref a-b [--clean a-b] [--dark]

--ref    frames whose per-pixel median gives a clean read of the logo (moving
         background and particles drop out). The logo is assumed white, or a
         dark ink on a light background with --dark.
--clean  frames that get the logo painted out (written next to the plates as
         c%04d.jpg), so a composition can scale them freely and lay the matte
         back on top at its original spot.

logo.png is box-sized RGBA (logo colour + alpha); place it at (x0, y0).
"""
import argparse
import os

import numpy as np
from PIL import Image


def frange(s):
    a, b = (int(v) for v in s.split('-'))
    return range(a, b + 1)


def blur(a, r):
    """Separable box blur, applied three times (≈ Gaussian), edge-normalised by the caller."""
    k = np.ones(2 * r + 1) / (2 * r + 1)
    same = lambda v: np.convolve(v, k, mode='full')[r:r + len(v)]   # centred, also when k is longer than v
    for _ in range(3):
        a = np.apply_along_axis(same, 0, a)
        a = np.apply_along_axis(same, 1, a)
    return a


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plates')
    ap.add_argument('logo')
    ap.add_argument('--box', required=True)
    ap.add_argument('--ref', required=True)
    ap.add_argument('--clean')
    ap.add_argument('--dark', action='store_true')
    o = ap.parse_args()
    x0, y0, x1, y1 = (int(v) for v in o.box.split(','))
    plate = lambda f: os.path.join(o.plates, f'f{f:04d}.jpg')

    stack = np.stack([np.asarray(Image.open(plate(f)).convert('L').crop((x0, y0, x1, y1)), dtype=np.float32)
                      for f in frange(o.ref)])
    med = np.median(stack, axis=0)
    border = np.concatenate([med[0], med[-1], med[:, 0], med[:, -1]])
    bg = float(np.median(border))
    if o.dark:
        ink = float(np.percentile(med, 1))
        alpha = np.clip((bg - med) / (bg - ink), 0, 1)
        rgb = np.median(np.stack([np.asarray(Image.open(plate(f)).convert('RGB').crop((x0, y0, x1, y1)), dtype=np.float32)
                                  for f in frange(o.ref)]), axis=0)
        colour = rgb[alpha > 0.9].mean(axis=0)
    else:
        alpha = np.clip((med - bg) / (255.0 - bg), 0, 1)
        colour = np.array([255.0, 255.0, 255.0])
    alpha[alpha < 0.04] = 0
    rgba = np.dstack([np.full_like(alpha, colour[0]), np.full_like(alpha, colour[1]), np.full_like(alpha, colour[2]), alpha * 255])
    Image.fromarray(rgba.round().astype(np.uint8), 'RGBA').save(o.logo)
    print(f'logo matte {x1 - x0}x{y1 - y0} at ({x0}, {y0}), background {bg:.1f} -> {o.logo}')

    if not o.clean:
        return
    # Fill everything the logo touches (grown by 2 px) from the surrounding pixels: a small
    # radius keeps the detail along thin strokes, larger ones reach into the middle of bold letters.
    hole = blur((alpha > 0).astype(np.float32), 1) > 0.01
    keep = (~hole).astype(np.float32)
    weights = [(r, blur(keep, r)) for r in (4, 10, 24)]
    for f in frange(o.clean):
        im = Image.open(plate(f)).convert('RGB')
        reg = np.asarray(im.crop((x0, y0, x1, y1)), dtype=np.float32)
        fill = np.zeros_like(reg)
        done = np.zeros(hole.shape, bool)
        for r, wk in weights:
            ok = (wk > 0.02) & ~done
            num = np.dstack([blur(reg[..., c] * keep, r) for c in range(3)])
            fill[ok] = num[ok] / wk[ok][:, None]
            done |= ok
        fill[~done] = np.median(reg[~hole], axis=0)
        out = np.where(hole[..., None], fill, reg)
        im.paste(Image.fromarray(out.clip(0, 255).round().astype(np.uint8)), (x0, y0))
        im.save(os.path.join(o.plates, f'c{f:04d}.jpg'), quality=95)
    print(f'{len(frange(o.clean))} clean plates (c%04d.jpg) -> {o.plates}')


if __name__ == '__main__':
    main()
