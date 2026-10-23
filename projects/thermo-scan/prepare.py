#!/usr/bin/env python3
"""Plates for the SPLASH THERMO / DROP THERMO film.

  python3 -I projects/thermo-scan/prepare.py projects/thermo-scan/source build/thermo-scan/plates

photo.jpg       ambient shot, Lanczos-upscaled to 1600 px (headroom for the push-in)
photo_xray.png  the same frame as an x-ray: glowing contours, warm thermal water under the cover
cover_top.png   cut-out of the cover (top view), RGBA
cover_34.png    cut-out of the cover (3/4 view), RGBA
drop.jpg, drop_xray.png, drop_34.png   the same for DROP THERMO
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
S = 1600

AMBIENT = 'home-deluxe-thermoabdeckung-splash-ambiente-01'
COVER_TOP = 'home-deluxe-thermoabdeckung-splash-freisteller-01_1'
COVER_34 = 'home-deluxe-thermoabdeckung-splash-freisteller-02'
DROP_AMBIENT = 'home-deluxe-thermoabdeckung-drop-ambiente01'
DROP_34 = 'home-deluxe-thermoabdeckung-drop-freisteller02'


def find(stem):
    return next(SRC.glob(f'*{stem}.jpg'))


def _box(a, k, axis):
    # Running mean of width 2k+1 along one axis, edges clamped.
    pad = [(0, 0)] * a.ndim
    pad[axis] = (k + 1, k)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * k + 1, 2 * k + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * k + 1)).astype(np.float32)


def blur(a, r):
    # Three box passes per axis approximate a Gaussian of sigma r.
    k = max(1, int(round(np.sqrt(12 * r * r / 3 + 1) / 2)))
    a = a.astype(np.float32)
    for _ in range(3):
        a = _box(_box(a, k, 0), k, 1)
    return a


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def thermal(t):
    stops = np.array([0.0, 0.25, 0.5, 0.72, 0.88, 1.0])
    cols = np.array([[0.05, 0.05, 0.25], [0.35, 0.05, 0.45], [0.85, 0.15, 0.25],
                     [1.0, 0.45, 0.05], [1.0, 0.78, 0.2], [1.0, 0.97, 0.8]])
    return np.stack([np.interp(t, stops, cols[:, i]) for i in range(3)], -1)


def plates(stem, name, cover, pool):
    """Ambient photo + its x-ray version.

    cover(xx, yy, lum) -> (inside 0..1, d) where d is a normalised distance from the
    cover centre (1 at its edge); pool(xx, yy) -> distance, 1 at the pool outline.
    """
    photo = Image.open(find(stem)).convert('RGB').resize((S, S), Image.LANCZOS)
    photo = photo.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=2))
    photo.save(OUT / f'{name}.jpg', quality=95)

    rgb = np.asarray(photo).astype(np.float32) / 255
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    l1 = blur(lum, 1.2)
    gx = np.zeros_like(l1); gy = np.zeros_like(l1)
    gx[:, 1:-1] = l1[:, 2:] - l1[:, :-2]
    gy[1:-1, :] = l1[2:, :] - l1[:-2, :]
    edge = np.sqrt(gx * gx + gy * gy)
    edge = np.clip(edge / np.percentile(edge, 99.3), 0, 1) ** 0.8
    glow = np.clip(blur(edge, 6) * 2.2, 0, 1)
    detail = np.clip((l1 - blur(l1, 18)) * 4 + 0.5, 0, 1)

    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
    inside, d = cover(xx, yy, lum)
    # Thermal water: hot core, cooler rim, slow convection pattern
    rng = np.random.default_rng(7)
    noise = blur(rng.random((S, S)).astype(np.float32), 38)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    temp = np.clip(0.95 - 0.45 * d ** 2 + 0.25 * (noise - 0.5), 0, 1)
    # Whole pool incl. front wall; the deck outside it is pushed back.
    deck = smooth(0.98, 1.06, pool(xx, yy))
    edge *= 1 - 0.6 * deck
    glow *= 1 - 0.7 * deck

    navy = np.array([0.035, 0.08, 0.13], np.float32)
    cyan = np.array([0.55, 0.9, 1.0], np.float32)
    img = np.broadcast_to(navy, (S, S, 3)).copy()
    img += (detail[..., None] - 0.5) * 0.10 * cyan
    img += glow[..., None] * 0.35 * cyan
    img = img * (1 - inside[..., None] * 0.75) + thermal(temp) * inside[..., None] * 0.62
    img += edge[..., None] * np.array([0.85, 0.97, 1.0]) * 0.95
    # Scan raster
    img *= (0.93 + 0.07 * (np.sin(yy * S * np.pi / 3) > 0))[..., None]
    vign = 1 - 0.55 * smooth(0.45, 0.95, np.sqrt((xx - 0.5) ** 2 + (yy - 0.5) ** 2) * 1.4)
    img *= vign[..., None]
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(OUT / f'{name}_xray.png', optimize=True)


def splash_cover(xx, yy, lum):
    # Cover ellipse in the photo (measured on the 1000 px original)
    d = np.sqrt(((xx - 0.500) / 0.338) ** 2 + ((yy - 0.465) / 0.274) ** 2)
    return 1 - smooth(0.92, 1.0, d), d


def splash_pool(xx, yy):
    return np.sqrt(((xx - 0.500) / 0.470) ** 2 + ((yy - 0.505) / 0.445) ** 2)


# DROP: octagonal cover, outlined on the 1000 px original; the grey of the cover
# separates it from the black liner and the white rim.
DROP_COVER = [(205, 400), (290, 288), (600, 276), (745, 315), (805, 440), (800, 470),
              (665, 628), (400, 640), (200, 485)]


def drop_cover(xx, yy, lum):
    poly = Image.new('L', (S, S), 0)
    ImageDraw.Draw(poly).polygon([(x * S / 1000, y * S / 1000) for x, y in DROP_COVER], fill=255)
    m = (np.asarray(poly) > 0) & (lum > 0.42) & (lum < 0.88)
    inside = smooth(0.35, 0.65, blur(m.astype(np.float32), 4))
    d = np.sqrt(((xx - 0.503) / 0.31) ** 2 + ((yy - 0.46) / 0.19) ** 2)
    return inside, d


def drop_pool(xx, yy):
    return np.sqrt(((xx - 0.505) / 0.425) ** 2 + ((yy - 0.56) / 0.37) ** 2)


plates(AMBIENT, 'photo', splash_cover, splash_pool)
plates(DROP_AMBIENT, 'drop', drop_cover, drop_pool)


# Cover cut-outs --------------------------------------------------------------
def cutout(stem, name, size):
    im = Image.open(find(stem)).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    # Distance from paper white; the cover is mid grey, the background pure white.
    dist = np.max(1 - a, axis=-1)
    alpha = smooth(0.035, 0.11, dist)
    # Keep only what is connected to the object: drop specks far from it.
    alpha = np.where(blur(alpha, 3) > 0.15, alpha, 0)
    # Defringe: pull edge colours away from white.
    rgb = np.where(alpha[..., None] > 0.01, (a - (1 - alpha[..., None])) / np.maximum(alpha[..., None], 0.01), 0)
    out = np.dstack([np.clip(rgb, 0, 1), alpha])
    img = Image.fromarray((out * 255).astype(np.uint8), 'RGBA')
    img = img.crop(img.getbbox())
    img.thumbnail((size, size), Image.LANCZOS)
    img.save(OUT / name, optimize=True)


cutout(COVER_TOP, 'cover_top.png', 1400)
cutout(COVER_34, 'cover_34.png', 1400)
cutout(DROP_34, 'drop_34.png', 1400)
print('plates ->', OUT)
