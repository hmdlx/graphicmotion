#!/usr/bin/env python3
# Studio-Keyframes für das EVEREST-Karussell: echte Freisteller auf einer hellen Hohlkehle
# mit Softbox-Licht und Kontaktschatten. Diese Bilder sind Start-/Endbilder der KI-Clips,
# damit jedes Produkt exakt bleibt (kein Morphing).
#   python3 -I scripts/studio_keyframes.py projects/everest-tour/source projects/everest-tour/keyframes
import sys, os
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
HORIZON = 690

def backdrop():
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(-1, 1, W)[None, :]
    wall = np.array([226, 223, 218]); floor = np.array([240, 238, 234]); near = np.array([246, 245, 242])
    t = np.clip((y * H - (HORIZON - 120)) / 240, 0, 1)            # weicher Übergang der Hohlkehle
    t = t * t * (3 - 2 * t)
    base = wall * (1 - t[..., None]) + floor * t[..., None]
    f = np.clip((y * H - HORIZON) / (H - HORIZON), 0, 1)[..., None]
    base = base * (1 - f * 0.6) + near * (f * 0.6)
    soft = np.exp(-((x * 0.9) ** 2) / 0.35 - ((y - 0.18) ** 2) / 0.12)[..., None]   # Softbox oben mittig
    vign = (1 - 0.10 * (x ** 2)[..., None]) * (1 - 0.06 * (y ** 2)[..., None])
    img = (base + soft * 14) * vign
    img = np.broadcast_to(img, (H, W, 3))
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')

def place(canvas, name, cx, base_y, height):
    im = Image.open(os.path.join(SRC, name + '.png'))
    s = height / im.height
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x0, y0 = round(cx - im.width / 2), round(base_y - im.height)
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

CENTER = dict(cx=960, base_y=915, height=650)
LEFT = dict(cx=330, base_y=850, height=430)
RIGHT = dict(cx=1590, base_y=850, height=430)

FRAMES = {
    'k1_xl': [('l_right', RIGHT), ('xl_front', CENTER)],
    'k2_l':  [('xl_left', LEFT), ('m_right', RIGHT), ('l_front', CENTER)],
    'k3_m':  [('l_left', LEFT), ('s_right', RIGHT), ('m_front', CENTER)],
    'k4_s':  [('m_left', LEFT), ('s_front', CENTER)],
    'k0_xl_solo': [('xl_front', CENTER)],
}

os.makedirs(OUT, exist_ok=True)
for key, items in FRAMES.items():
    c = backdrop()
    for name, pos in items:
        place(c, name, **pos)
    c.convert('RGB').save(os.path.join(OUT, key + '.png'))
    print(key)

# Line-up für den Schluss: alle vier Größen frontal, gleiche Höhe = gleicher Maßstab (190 cm)
c = backdrop()
names = ['s_front', 'm_front', 'l_front', 'xl_front']
h = 430
widths = [Image.open(os.path.join(SRC, n + '.png')).size for n in names]
widths = [w * h / hh for w, hh in widths]
gap = 56
x = (W - (sum(widths) + gap * 3)) / 2
for n, w in zip(names, widths):
    place(c, n, x + w / 2, 900, h); x += w + gap
c.convert('RGB').save(os.path.join(OUT, 'k5_lineup.png')); print('k5_lineup')
