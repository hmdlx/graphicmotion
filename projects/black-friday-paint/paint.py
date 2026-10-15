#!/usr/bin/env python3
# Black-Friday-Creative im MS-Paint-Look: ein Vista-Fenster, "mit der Maus gemalt".
# Alles ohne Kantenglaettung (wie Paint), Farben aus der Paint-Standardpalette,
# Flaechen mit dem Farbeimer (floodfill), Aurora mit der Spruehdose.
#
#   python3 -I projects/black-friday-paint/paint.py <out_dir>
#
# Gemalt wird auf einer 540 px breiten Leinwand und danach pixelgenau auf 1080 px verdoppelt.
import math
import os
import random
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'projects/black-friday-paint/output')
FONT = os.path.join(ROOT, 'assets/fonts/arimo/Arimo-Regular.ttf')
FONT_B = os.path.join(ROOT, 'assets/fonts/arimo/Arimo-Bold.ttf')
LOGO = os.path.join(ROOT, 'assets/logo/homedeluxe-logo-white.png')

# MS-Paint-Standardpalette (die zwei Reihen unten im Fenster)
BLACK, GRAY, SILVER, WHITE = (0, 0, 0), (128, 128, 128), (192, 192, 192), (255, 255, 255)
RED, YELLOW, LIME, CYAN, BLUE = (255, 0, 0), (255, 255, 0), (0, 255, 0), (0, 255, 255), (0, 0, 255)
NAVY, TEAL, GREEN = (0, 0, 128), (0, 128, 128), (0, 128, 0)
SKY, LIGHTCYAN, AZURE = (0, 128, 255), (128, 255, 255), (128, 128, 255)

FORMATS = {'1x1': 540, '4x5': 675, '9x16': 960}
W = 540


def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)


class Painter:
    """Werkzeuge wie in Paint: Pinsel, Linie, Farbeimer, Spruehdose, Text."""

    def __init__(self, h, seed):
        self.im = Image.new('RGB', (W, h), WHITE)
        self.d = ImageDraw.Draw(self.im)
        self.d.fontmode = '1'                       # Text-Werkzeug: keine Kantenglaettung
        self.rnd = random.Random(seed)

    def wobble(self, pts, amp=1.2, step=6):
        """Eine Mausbewegung: Strecke in kleine Stuecke zerlegen und leicht zittern lassen."""
        out = []
        drift = 0.0
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            n = max(2, int(math.hypot(x1 - x0, y1 - y0) / step))
            nx, ny = -(y1 - y0), (x1 - x0)
            ln = math.hypot(nx, ny) or 1
            nx, ny = nx / ln, ny / ln
            for i in range(n):
                t = i / n
                drift = drift * .7 + self.rnd.uniform(-amp, amp) * .6
                out.append((x0 + (x1 - x0) * t + nx * drift, y0 + (y1 - y0) * t + ny * drift))
        out.append(pts[-1])
        return out

    def brush(self, pts, color, w=2, amp=1.2):
        pts = self.wobble(pts, amp)
        self.d.line(pts, fill=color, width=w)
        if w > 2:                                   # runder Pinsel: Punkte an die Knicke
            r = w / 2 - .5
            for x, y in pts:
                self.d.ellipse((x - r, y - r, x + r, y + r), fill=color)

    def box(self, x0, y0, x1, y1, color=BLACK, w=2, amp=1.0):
        self.brush([(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)], color, w, amp)

    def bucket(self, x, y, color):
        ImageDraw.floodfill(self.im, (int(x), int(y)), color)

    def spray(self, cx, cy, r, color, dots):
        for _ in range(dots):
            a = self.rnd.uniform(0, math.tau)
            d = r * math.sqrt(self.rnd.random())
            x, y = int(cx + d * math.cos(a)), int(cy + d * math.sin(a))
            if 0 <= x < W and 0 <= y < self.im.height and self.im.getpixel((x, y)) != WHITE:
                self.im.putpixel((x, y), color)              # Fenster bleibt frei

    def text(self, xy, s, size, color=BLACK, bold=False, anchor='la'):
        self.d.text(xy, s, font=font(size, bold), fill=color, anchor=anchor)

    def ellipse_freehand(self, cx, cy, rx, ry, color, w):
        """Der typische rote Kringel: nicht ganz geschlossen, ueberlappt am Ende."""
        a0 = self.rnd.uniform(-2.6, -2.2)
        pts = []
        for i in range(48):
            a = a0 + i / 44 * math.tau
            k = 1 + .05 * math.sin(a * 2 + .7)
            pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a) + i * .12))
        self.brush(pts, color, w, amp=.8)


def paint(name, h):
    p = Painter(h, seed=11)

    # 3) Das Fenster.
    wx0, wx1 = 34, W - 34
    ww = wx1 - wx0
    wh = 372
    wy0 = int((h - wh) / 2) - (8 if name == '1x1' else 30)
    wy1 = wy0 + wh
    bar = 40

    # Rahmen + Titelleiste (Glas = hellblau mit dem Eimer).
    p.box(wx0, wy0, wx1, wy1, BLACK, 3)
    p.brush([(wx0, wy0 + bar), (wx1, wy0 + bar)], BLACK, 3)

    # Hintergrund: Farbeimer schwarz um das Fenster herum ...
    p.bucket(0, 0, BLACK)
    # ... und eine "Aurora" mit der Spruehdose: je ein Band ueber und unter dem Fenster,
    # jeweils von links unten nach rechts oben, aus vier Farben uebereinander.
    bands = [(wy0 - 18, wy0 - 70 - .12 * h), (wy1 + .32 * (h - wy1), wy1 - 30)]
    for yl, yr in bands:
        for k, (col, off) in enumerate([(TEAL, 14), (LIME, 4), (CYAN, -6), (SKY, -16)]):
            for x in range(-10, W + 20, 3):
                t = x / W
                y = yl + (yr - yl) * t + 10 * math.sin(t * 5 + k) + off
                p.spray(x, y, 11 + 3 * (k % 2), col, 30)
    p.bucket(wx0 + 60, wy0 + 6, AZURE)
    p.brush([(wx0 + 8, wy0 + 9), (wx0 + 150, wy0 + 8)], WHITE, 3, amp=.6)          # "Glanz"
    p.brush([(wx0 + 8, wy0 + 15), (wx0 + 90, wy0 + 14)], WHITE, 2, amp=.6)
    p.text((wx0 + 12, wy0 + 13), 'Black Friday', 19, BLACK)

    # Fensterknoepfe: _  []  X
    bx = wx1 - 112
    for i, wbtn in enumerate([30, 30, 46]):
        x0 = bx + sum([30, 30, 46][:i]) + i * 2
        p.box(x0, wy0 + 6, x0 + wbtn, wy0 + 30, BLACK, 2, amp=.5)
        p.bucket(x0 + 4, wy0 + 10, RED if i == 2 else SILVER)
    p.brush([(bx + 8, wy0 + 23), (bx + 22, wy0 + 23)], BLACK, 3, amp=.3)
    p.box(bx + 40, wy0 + 12, bx + 52, wy0 + 24, BLACK, 2, amp=.3)
    cx = bx + 64 + 23
    p.brush([(cx - 8, wy0 + 11), (cx + 8, wy0 + 25)], WHITE, 3, amp=.4)
    p.brush([(cx + 8, wy0 + 11), (cx - 8, wy0 + 25)], WHITE, 3, amp=.4)

    # Unterer Rand: graue Knopfleiste.
    fy = wy1 - 64
    p.brush([(wx0, fy), (wx1, fy)], BLACK, 2)
    p.bucket(wx0 + 10, fy + 10, SILVER)

    # Inhalt: Symbol (blauer Kreis mit %).
    ix, iy = wx0 + 48, wy0 + bar + 54
    p.d.ellipse((ix - 30, iy - 30, ix + 30, iy + 30), fill=BLUE, outline=BLACK, width=2)
    p.text((ix + 1, iy + 2), '%', 34, WHITE, bold=True, anchor='mm')
    p.brush([(ix - 16, iy - 18), (ix - 4, iy - 24)], LIGHTCYAN, 3, amp=.3)            # "Glanz"

    tx = wx0 + 96
    p.text((tx, wy0 + bar + 14), 'Black Friday bei Home Deluxe', 19, NAVY)
    p.text((tx - 4, wy0 + bar + 34), '-30%', 92, BLUE, bold=True)
    p.text((tx, wy0 + bar + 134), 'extra auf bereits', 24, BLACK)
    p.text((tx, wy0 + bar + 162), 'reduzierte Artikel', 24, BLACK)

    # Fortschrittsbalken, gruen gefuellt mit dem Eimer.
    py = wy0 + bar + 212
    p.text((wx0 + 22, py - 4), 'Rabatt wird angewendet...', 16, BLACK)
    p.box(wx0 + 22, py + 18, wx1 - 22, py + 40, BLACK, 2, amp=.5)
    split = wx0 + 22 + int((ww - 44) * .7)
    p.brush([(split, py + 18), (split, py + 40)], BLACK, 1, amp=.2)
    p.bucket(wx0 + 30, py + 29, LIME)

    # Knoepfe + Link in der grauen Leiste.
    p.text((wx0 + 18, fy + 23), 'homedeluxe.de/sale', 17, BLUE)
    p.brush([(wx0 + 18, fy + 42), (wx0 + 174, fy + 43)], BLUE, 1, amp=.2)
    b1 = (wx1 - 262, fy + 14, wx1 - 138, fy + 50)
    b2 = (wx1 - 128, fy + 14, wx1 - 14, fy + 50)
    for b in (b1, b2):
        p.box(*b, BLACK, 2, amp=.6)
        p.bucket(b[0] + 6, b[1] + 6, WHITE)
    p.box(b1[0] + 4, b1[1] + 4, b1[2] - 4, b1[3] - 4, SKY, 1, amp=.3)                 # "Fokus"
    p.text(((b1[0] + b1[2]) / 2, (b1[1] + b1[3]) / 2 + 1), 'Jetzt sparen', 17, BLACK, anchor='mm')
    p.text(((b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2 + 1), 'Abbrechen', 17, BLACK, anchor='mm')

    # Der rote Kringel um "Jetzt sparen" und (wo Platz ist) ein Pfeil darauf.
    p.ellipse_freehand((b1[0] + b1[2]) / 2, (b1[1] + b1[3]) / 2, 82, 34, RED, 4)
    ax, ay = b1[0] - 10, b1[3] + 56
    if name != '1x1':
        p.brush([(ax - 70, ay + 18), (ax - 30, ay + 6), (b1[0] + 8, b1[3] + 16)], RED, 4)
        p.brush([(b1[0] + 8, b1[3] + 16), (b1[0] - 12, b1[3] + 18)], RED, 4, amp=.3)
        p.brush([(b1[0] + 8, b1[3] + 16), (b1[0] - 2, b1[3] + 34)], RED, 4, amp=.3)

    # Logo "reinkopiert" (Strg+V) unten mittig.
    logo = Image.open(LOGO).convert('RGBA')
    lw = 220 if name != '9x16' else 260
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.NEAREST)
    alpha = logo.getchannel('A').point(lambda a: 255 if a > 110 else 0)           # harte Kante
    ly = wy1 + (h - wy1 - logo.height) // 2 + (10 if name == '1x1' else 0)
    if name == '1x1':
        ly = wy1 + 26
    p.im.paste(logo.convert('RGB'), ((W - lw) // 2, ly), alpha)

    return p.im.resize((W * 2, h * 2), Image.NEAREST)


os.makedirs(OUT, exist_ok=True)
for name, h in FORMATS.items():
    f = os.path.join(OUT, f'HomeDeluxe_BlackFriday_Paint_{name}.png')
    paint(name, h).save(f, optimize=True)
    print(f)
