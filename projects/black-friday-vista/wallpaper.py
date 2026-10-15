#!/usr/bin/env python3
# Procedural Vista-style aurora wallpaper (dark, blue-green light ribbons).
#
#   python3 -I projects/black-friday-vista/wallpaper.py <out.jpg> [size]
import sys
import numpy as np
from PIL import Image, ImageFilter

out = sys.argv[1]
N = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
rng = np.random.default_rng(24)

y, x = np.mgrid[0:N, 0:N].astype(np.float32) / N
img = np.zeros((N, N, 3), np.float32)

# Base: near-black navy, slightly lifted toward the lower middle.
img += np.array([0.004, 0.012, 0.026])
img += np.exp(-((x - .45) ** 2 / .25 + (y - .78) ** 2 / .08))[..., None] * np.array([0.0, 0.05, 0.09])

GREEN = np.array([0.20, 1.00, 0.55])
TEAL = np.array([0.10, 0.80, 0.85])
BLUE = np.array([0.20, 0.50, 1.00])


def ramp(t):
    t = np.clip(t, 0, 1)[..., None]
    return np.where(t < .5, GREEN * (1 - 2 * t) + TEAL * 2 * t, TEAL * (2 - 2 * t) + BLUE * (2 * t - 1))


def ribbon(y0, slope, amp, freq, phase, width, gain, curtain, hue_shift):
    cy = y0 - slope * x + amp * np.sin(freq * x * np.pi * 2 + phase) + .35 * (x - .55) ** 2
    d = y - cy
    line = np.exp(-(d / width) ** 2)
    sheet = np.where(d > 0, np.exp(-d / curtain), 0) * .35          # light falling below the edge
    fade = np.exp(-((x - .5) ** 2) / .9)                            # dims toward the far ends
    col = ramp(x * .8 + hue_shift)
    return (line + sheet)[..., None] * col * gain * fade[..., None]


# Wide soft sheets first, then the crisp bright ribbons on top.
for i in range(6):
    img += ribbon(.70 + .05 * i, .55 + .05 * rng.standard_normal(), .025, .6, rng.uniform(0, 6),
                  .05, .10, .18, rng.uniform(-.2, .2))
for i in range(26):
    img += ribbon(.66 + .012 * i + .01 * rng.standard_normal(), .52 + .04 * rng.standard_normal(),
                  .015 + .01 * rng.random(), .5 + .4 * rng.random(), rng.uniform(0, 6),
                  .0016 + .0035 * rng.random(), .25 + .35 * rng.random(), .06 + .05 * rng.random(),
                  rng.uniform(-.3, .3))

# Faint bokeh sparkles along the ribbons.
spark = np.zeros((N, N), np.float32)
for _ in range(140):
    sx = rng.random()
    sy = .68 - .52 * sx + .35 * (sx - .55) ** 2 + .08 * rng.standard_normal()
    r = (.002 + .006 * rng.random())
    spark += np.exp(-(((x - sx) ** 2 + (y - sy) ** 2) / r ** 2)) * rng.uniform(.05, .3)
img += spark[..., None] * np.array([.6, .95, 1.0])

img = 1 - np.exp(-img * 1.6)                                          # soft tone map
img = np.clip(img ** (1 / 1.05), 0, 1)
im = Image.fromarray((img * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))
im.save(out, quality=94)
print(out)
