#!/usr/bin/env python3
"""Recolour a warm (orange) studio background to Home-Deluxe navy, shot by shot.

    python3 -I scripts/recolor_bg.py <frames_in> <frames_out> <grade.json>

frames_in holds f0000.png ... (one file per source frame). grade.json names the
shots and, per shot, how the background is isolated:

    "shots":   {"A": [0, 28], ...}                 source frame ranges
    "recolor": {"A": {"protect": [[x0, y0, x1, y1]]},   keep these boxes untouched
                "E": {"seed": [[x, y]]}}           only the key region connected to a seed
Shots without a "recolor" entry only get the cool shadow grade.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Navy ramp over source luma: dark vignette -> CI navy -> a cool glow where the
# backdrop light was brightest. Stops are (luma, (r, g, b)).
RAMP = [
    (0.00, (2, 5, 10)),
    (0.12, (6, 15, 27)),
    (0.30, (14, 34, 52)),     # #0e2234
    (0.50, (21, 48, 78)),
    (0.72, (40, 78, 120)),
    (1.00, (105, 145, 190)),
]
SHADOW_TINT = np.array([14, 34, 52], np.float32) / 255


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, s, mx


def key(rgb):
    """Soft key for the orange backdrop. Returns (weight, solid) where solid is
    the bright, clearly orange core used for connectivity."""
    h, s, v = hsv(rgb)
    hue = smooth(h, 3, 8) * (1 - smooth(h, 33, 43))
    w = hue * smooth(s, 0.18, 0.34)
    # Dark, warm vignette (deep red-brown) also belongs to the backdrop. Bright reds
    # (the control panel digits) stay out.
    warm = np.maximum(1 - smooth(h, 40, 60), smooth(h, 320, 345))
    dark = (1 - smooth(v, 0.28, 0.48)) * warm * smooth(s, 0.15, 0.30)
    solid = (w > 0.5) & (v > 0.22)
    return np.maximum(w, dark), solid


def ramp(y):
    xs = np.array([p[0] for p in RAMP], np.float32)
    out = np.empty(y.shape + (3,), np.float32)
    for c in range(3):
        out[..., c] = np.interp(y, xs, np.array([p[1][c] for p in RAMP], np.float32) / 255)
    return out


def recolor(rgb, cfg):
    w, solid = key(rgb)
    hgt, wid = w.shape
    if 'seed' in cfg:
        m = Image.fromarray((solid * 255).astype(np.uint8))
        filled = Image.new('L', m.size, 0)
        for x, y in cfg['seed']:
            if m.getpixel((x, y)) == 255:
                tmp = m.copy()
                ImageDraw.floodfill(tmp, (x, y), 128)
                filled = Image.fromarray(np.maximum(np.asarray(filled), (np.asarray(tmp) == 128) * 255).astype(np.uint8))
        region = filled.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4))
        w = w * np.asarray(region, np.float32) / 255
    for x0, y0, x1, y1 in cfg.get('protect', []):
        yy, xx = np.mgrid[0:hgt, 0:wid]
        inside = smooth(xx, x0 - 10, x0 + 10) * (1 - smooth(xx, x1 - 10, x1 + 10)) \
            * smooth(yy, y0 - 10, y0 + 10) * (1 - smooth(yy, y1 - 10, y1 + 10))
        w = w * (1 - inside)
    y = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    w = w[..., None]
    return rgb * (1 - w) + ramp(y) * w


def grade(rgb):
    # Pull the remaining warm cast out of the shadows so every shot sits in the navy world.
    y = (rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    k = (1 - smooth(y, 0.0, 0.45)) * 0.35
    return rgb * (1 - k) + (y * 0.6 + SHADOW_TINT * 0.6) * k


def main():
    src, dst, cfg_path = sys.argv[1:4]
    with open(cfg_path) as f:
        cfg = json.load(f)
    os.makedirs(dst, exist_ok=True)
    for name, (a, b) in cfg['shots'].items():
        rc = cfg.get('recolor', {}).get(name)
        for n in range(a, b + 1):
            rgb = np.asarray(Image.open(os.path.join(src, f'f{n:04d}.png')).convert('RGB'), np.float32) / 255
            if rc is not None:
                rgb = recolor(rgb, rc)
            rgb = grade(rgb)
            Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(dst, f'f{n:04d}.png'))
        print(f'{name}: {b - a + 1} frames')


if __name__ == '__main__':
    main()
