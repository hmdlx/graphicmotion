#!/usr/bin/env python3
"""Cut the lit LED parts out of a product photo as a soft RGBA mask.

A pixel counts as LED when it is bright and the photo is dark on both sides of it
along one axis (vertical LED lines: --axis x, horizontal light bands: --axis y).
That keeps bright backgrounds out of the mask.

  python3 -I scripts/led_mask.py <photo.jpg> <out.png> --axis x [--near 8 --far 16]
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--axis', choices=['x', 'y'], required=True)
    ap.add_argument('--near', type=int, default=8, help='px from the pixel where the dark sides start')
    ap.add_argument('--far', type=int, default=16, help='px from the pixel where the dark sides end')
    ap.add_argument('--bright', type=float, default=200, help='min luminance of an LED pixel')
    ap.add_argument('--dark', type=float, default=110, help='max mean luminance of each side')
    ap.add_argument('--grow', type=int, default=3, help='dilation in px')
    a = ap.parse_args()

    lum = np.asarray(Image.open(a.src).convert('L')).astype(np.float32)
    ax = 1 if a.axis == 'x' else 0
    sides = []
    for sign in (-1, 1):
        acc = np.zeros_like(lum)
        for d in range(a.near, a.far + 1):
            acc += np.roll(lum, sign * d, axis=ax)
        sides.append(acc / (a.far - a.near + 1))
    led = (lum > a.bright) & (sides[0] < a.dark) & (sides[1] < a.dark)

    mask = Image.fromarray((led * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))   # drop specks
    mask = mask.filter(ImageFilter.MaxFilter(2 * a.grow + 1)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = Image.new('RGBA', mask.size, (255, 246, 226, 0))
    rgba.putalpha(mask)
    rgba.save(a.out)
    print(f'{a.out}: {int(led.sum())} LED px')


if __name__ == '__main__':
    main()
