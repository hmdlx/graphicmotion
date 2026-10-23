#!/usr/bin/env python3
# Studio-Keyframes für das EVEREST-Karussell: echte Freisteller auf einer hellen Hohlkehle
# mit Softbox-Licht und Kontaktschatten. Diese Bilder sind Start-/Endbilder der KI-Clips,
# damit jedes Produkt exakt bleibt (kein Morphing).
#   python3 -I scripts/studio_keyframes.py projects/everest-tour/source projects/everest-tour/keyframes [16x9|9x16]
# Schreibt zusätzlich placement.json (Lage jedes Produkts je Keyframe, u. a. für die Tür-Ebene).
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
FMT = sys.argv[3] if len(sys.argv) > 3 else '16x9'
W, H = (1920, 1080) if FMT == '16x9' else (1080, 1920)
HORIZON = 690 if FMT == '16x9' else 1190
PLACED = {}

def backdrop(y=None, x=None, H=H, W=W, HORIZON=HORIZON):
    # y, x: normierte Koordinaten (Standard: ganzes Bild); für die 9:16-Bandfassung wird die
    # 16:9-Hohlkehle über ihren Bildrand hinaus weitergerechnet.
    y = np.linspace(0, 1, H)[:, None] if y is None else y
    x = np.linspace(-1, 1, W)[None, :] if x is None else x
    wall = np.array([226, 223, 218]); floor = np.array([240, 238, 234]); near = np.array([246, 245, 242])
    t = np.clip((y * H - (HORIZON - 120)) / 240, 0, 1)            # weicher Übergang der Hohlkehle
    t = t * t * (3 - 2 * t)
    base = wall * (1 - t[..., None]) + floor * t[..., None]
    f = np.clip((y * H - HORIZON) / (H - HORIZON), 0, 1)[..., None]
    base = base * (1 - f * 0.6) + near * (f * 0.6)
    soft = np.exp(-((x * 0.9) ** 2) / 0.35 - ((y - 0.18) ** 2) / 0.12)[..., None]   # Softbox oben mittig
    vign = (1 - 0.10 * (x ** 2)[..., None]) * (1 - 0.06 * (y ** 2)[..., None])
    img = (base + soft * 14) * vign
    img = np.broadcast_to(img, (y.shape[0], x.shape[1], 3))
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')

def place(canvas, name, cx, base_y, height):
    im = Image.open(os.path.join(SRC, name + '.png'))
    s = height / im.height
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x0, y0 = round(cx - im.width / 2), round(base_y - im.height)
    PLACED.setdefault(CURRENT, {})[name] = {'x0': x0, 'y0': y0, 'w': im.width, 'h': im.height, 'scale': s}
    # Kontaktschatten folgen der Unterkante jeder Spalte (auch bei schräg gedrehten Kabinen)
    al = np.asarray(im.split()[3]) > 128
    cols = np.where(al.any(0))[0]
    bottom = {x: np.where(al[:, x])[0].max() for x in cols}
    tight = np.zeros((H, W), np.float32); wide = np.zeros((H, W), np.float32)
    for x in cols:
        X, Y = x0 + x, y0 + bottom[x]
        if 0 <= X < W:
            tight[max(0, Y - 4):min(H, Y + 3), X] = 1
            wide[max(0, Y - 10):min(H, Y + round(height * 0.03)), X] = 1
    for m, blur, alpha in ((wide, height * 0.03, 110), (tight, 4, 170)):
        mask = Image.fromarray((m * alpha).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
        dark = Image.new('RGBA', (W, H), (60, 55, 50, 0)); dark.putalpha(mask)
        canvas.alpha_composite(dark)
    canvas.alpha_composite(im, (x0, y0))

if FMT == '16x9':
    CENTER = dict(cx=960, base_y=915, height=650)
    LEFT = dict(cx=330, base_y=850, height=430)
    RIGHT = dict(cx=1590, base_y=850, height=430)
else:                                          # 9:16: Hero groß, Nachbarn an den Rändern angeschnitten
    CENTER = dict(cx=540, base_y=1390, height=780)
    LEFT = dict(cx=-40, base_y=1280, height=420)
    RIGHT = dict(cx=1120, base_y=1280, height=420)

FRAMES = {
    'k1_xl': [('l_right', RIGHT), ('xl_front', CENTER)],
    'k2_l':  [('xl_left', LEFT), ('m_right', RIGHT), ('l_front', CENTER)],
    'k3_m':  [('l_left', LEFT), ('s_right', RIGHT), ('m_front', CENTER)],
    'k4_s':  [('m_left', LEFT), ('s_front', CENTER)],
    'k0_xl_solo': [('xl_front', CENTER)],
}

os.makedirs(OUT, exist_ok=True)
for key, items in FRAMES.items():
    CURRENT = key
    c = backdrop()
    for name, pos in items:
        place(c, name, **pos)
    c.convert('RGB').save(os.path.join(OUT, key + '.png'))
    print(key)

# Line-up für den Schluss: alle vier Größen frontal, gleiche Höhe = gleicher Maßstab (190 cm).
# 16:9 in einer Reihe, 9:16 als 2 × 2 (S M / L XL).
CURRENT = 'k5_lineup'
c = backdrop()
names = ['s_front', 'm_front', 'l_front', 'xl_front']
size = {n: Image.open(os.path.join(SRC, n + '.png')).size for n in names}
rows = [(names, 900, 430, 56)] if FMT == '16x9' else [(names[:2], 1040, 420, 48), (names[2:], 1520, 420, 40)]
for row, base_y, h, gap in rows:
    widths = [size[n][0] * h / size[n][1] for n in row]
    x = (W - (sum(widths) + gap * (len(row) - 1))) / 2
    for n, w in zip(row, widths):
        place(c, n, x + w / 2, base_y, h); x += w + gap
c.convert('RGB').save(os.path.join(OUT, 'k5_lineup.png')); print('k5_lineup')
json.dump(PLACED, open(os.path.join(OUT, 'placement.json'), 'w'), indent=1)

# 9:16: Hintergrund für das Karussell-Band. Die 16:9-Karussell-Clips laufen unskaliert als Band
# (x -420, y 420) im Hochformat; darüber und darunter geht die 16:9-Hohlkehle nahtlos weiter.
if FMT == '9x16':
    BX, BY = -420, 420
    rows = (np.arange(1920) - BY)[:, None] / (1080 - 1)
    cols = -1 + 2 * (np.arange(1080) - BX)[None, :] / (1920 - 1)
    backdrop(rows, cols, H=1080, W=1920, HORIZON=690).convert('RGB').save(os.path.join(OUT, 'band_bg.png'))
    print('band_bg')
