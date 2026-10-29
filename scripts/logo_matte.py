#!/usr/bin/env python3
"""Pull a static burned-in logo out of finished plates.

  logo_matte.py <plates_dir> <logo.png> --box x0,y0,x1,y1 --ref a-b [--clean a-b]

--ref    frames whose per-pixel median gives a clean read of the logo (moving
         background and particles drop out). The logo is assumed white.
--clean  frames that get the logo painted out (written next to the plates as
         c%04d.jpg), so a composition can scale them freely and lay the matte
         back on top at its original spot.

logo.png is box-sized RGBA (white + alpha); place it at (x0, y0).
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
    for _ in range(3):
        a = np.apply_along_axis(lambda v: np.convolve(v, k, mode='same'), 0, a)
        a = np.apply_along_axis(lambda v: np.convolve(v, k, mode='same'), 1, a)
    return a


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plates')
    ap.add_argument('logo')
    ap.add_argument('--box', required=True)
    ap.add_argument('--ref', required=True)
    ap.add_argument('--clean')
    o = ap.parse_args()
    x0, y0, x1, y1 = (int(v) for v in o.box.split(','))
    plate = lambda f: os.path.join(o.plates, f'f{f:04d}.jpg')

    stack = np.stack([np.asarray(Image.open(plate(f)).convert('L').crop((x0, y0, x1, y1)), dtype=np.float32)
                      for f in frange(o.ref)])
    med = np.median(stack, axis=0)
    border = np.concatenate([med[0], med[-1], med[:, 0], med[:, -1]])
    bg = float(np.median(border))
    alpha = np.clip((med - bg) / (255.0 - bg), 0, 1)
    alpha[alpha < 0.04] = 0
    rgba = np.dstack([np.full_like(alpha, 255), np.full_like(alpha, 255), np.full_like(alpha, 255), alpha * 255])
    Image.fromarray(rgba.round().astype(np.uint8), 'RGBA').save(o.logo)
    print(f'logo matte {x1 - x0}x{y1 - y0} at ({x0}, {y0}), background {bg:.1f} -> {o.logo}')

    if not o.clean:
        return
    # Fill everything the logo touches (grown by 2 px) from the surrounding pixels.
    hole = blur((alpha > 0).astype(np.float32), 1) > 0.01
    keep = (~hole).astype(np.float32)
    wk = np.maximum(blur(keep, 4), 1e-4)
    for f in frange(o.clean):
        im = Image.open(plate(f)).convert('RGB')
        reg = np.asarray(im.crop((x0, y0, x1, y1)), dtype=np.float32)
        fill = np.dstack([blur(reg[..., c] * keep, 4) / wk for c in range(3)])
        out = np.where(hole[..., None], fill, reg)
        im.paste(Image.fromarray(out.clip(0, 255).round().astype(np.uint8)), (x0, y0))
        im.save(os.path.join(o.plates, f'c{f:04d}.jpg'), quality=95)
    print(f'{len(frange(o.clean))} clean plates (c%04d.jpg) -> {o.plates}')


if __name__ == '__main__':
    main()
