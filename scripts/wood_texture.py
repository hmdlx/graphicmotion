#!/usr/bin/env python3
"""Turn crops of a product photo into a seamless board texture for the 3D scene.

Each crop (one board's face) is flattened (lighting gradient removed) and scaled to the
texture height. The crops are laid side by side with soft crossfades, the end fades back
into the start so the texture wraps, and the strip is resampled to the output size.
Recoloured to a target tone; a second image holds the grain as a bump map.

  python3 -I scripts/wood_texture.py <photo> "<x0,y0,x1,y1>[;<x0,y0,x1,y1>...]" <out_color.jpg> <out_bump.jpg>
      [--size 2048x256] [--tone 58,58,62] [--contrast 1.0] [--fade 64]
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter


def flat(photo, box, h):
    crop = photo.crop(box)
    crop = crop.resize((round(crop.width * h / crop.height), h), Image.LANCZOS)
    g = np.asarray(crop, np.float32)
    low = np.asarray(crop.filter(ImageFilter.GaussianBlur(h / 6)), np.float32)
    return g / np.maximum(low, 1)               # 1 = average, <1 = grain line


def join(a, b, fade):
    k = np.linspace(0, 1, fade, dtype=np.float32)[None, :]
    mid = a[:, -fade:] * (1 - k) + b[:, :fade] * k
    return np.concatenate([a[:, :-fade], mid, b[:, fade:]], axis=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('photo')
    ap.add_argument('boxes')
    ap.add_argument('out_color')
    ap.add_argument('out_bump')
    ap.add_argument('--size', default='2048x256')
    ap.add_argument('--tone', default='58,58,62', help='mean RGB of the board')
    ap.add_argument('--contrast', type=float, default=1.0)
    ap.add_argument('--fade', type=int, default=64)
    a = ap.parse_args()

    w, h = (int(v) for v in a.size.split('x'))
    photo = Image.open(a.photo).convert('L')
    parts = [flat(photo, tuple(int(v) for v in b.split(',')), h) for b in a.boxes.split(';')]
    strip = parts[0]
    for p in parts[1:]:
        strip = join(strip, p, a.fade)
    # Wrap: the last `fade` px blend into the first ones, then drop them.
    k = np.linspace(0, 1, a.fade, dtype=np.float32)[None, :]
    strip[:, :a.fade] = strip[:, -a.fade:] * (1 - k) + strip[:, :a.fade] * k
    strip = strip[:, :-a.fade]

    strip = np.asarray(Image.fromarray(strip).resize((w, h), Image.LANCZOS), np.float32)
    strip = 1 + (strip - 1) * a.contrast
    tone = np.array([float(v) for v in a.tone.split(',')], np.float32)
    rgb = np.clip(strip[..., None] * tone, 0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(a.out_color, quality=92)
    bump = np.clip(128 + (strip - 1) * 220, 0, 255).astype(np.uint8)
    Image.fromarray(bump).save(a.out_bump, quality=92)
    print(f'{a.out_color}, {a.out_bump}: {w}x{h} from {len(parts)} crops')


if __name__ == '__main__':
    main()
