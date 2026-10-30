"""Newsletter-Bilder der Halloween-Edition bauen.

    python3 -I scripts/build_images.py <projekt> <grafik-dir>

<projekt>     projects/newsletter-halloween (source/, output/)
<grafik-dir>  Ausgabe von render_graphics.js

Grafiken:  Logo, Hero-Kopf und Social-Icons auf Navy, Halloween-Übergänge als PNG (verlustfrei,
           damit die Kanten exakt Navy bzw. Weiß treffen).
Hero:      Standbild aus source/hero/ mit Navy-Verlauf oben und unten, so dass es nahtlos aus
           dem Hero-Kopf kommt und in den Navy-Abschnitt darunter übergeht. Liegt ein Hero-GIF
           vor (build_hero_gif.py), nimmt der Newsletter das GIF; das Standbild bleibt Fallback.
Produkte:  Shopfotos unverändert, Freisteller auf hellgrauem Grund wie die Kacheln im Shop.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw

NAVY = (14, 34, 52)
TILE_GREY = (244, 246, 248)          # #f4f6f8, Kachelgrund wie auf homedeluxe.de
HERO_W = 1280                         # 2x der 640 px Newsletter-Breite
HERO_SRC = os.path.join("hero", "wohnzimmer-clown.webp")
FADE_TOP, FADE_BOTTOM = 0.16, 0.20    # Anteil der Bildhöhe, der in Navy übergeht
CLOWN_CROP = (700, 200, 1300, 600)    # Clown im Hero-Bild (1774 × 887) für das Pop-up


def save(img, path, quality=86):
    img.convert("RGB").save(path, quality=quality, optimize=True, progressive=True, subsampling=0)


def on_navy(path, size=None):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, NAVY + (255,))
    bg.alpha_composite(im)
    return bg.convert("RGB").crop((0, 0) + (size or im.size))


def navy_fade(img, top=FADE_TOP, bottom=FADE_BOTTOM):
    """Oben und unten weich in Navy auslaufen lassen (für Standbild und GIF-Frames)."""
    a = np.asarray(img.convert("RGB"), float)
    h = a.shape[0]
    y = np.arange(h)[:, None, None] / h
    k = np.clip(np.maximum((top - y) / top, (y - (1 - bottom)) / bottom), 0, 1)
    k = k * k * (3 - 2 * k)       # weicher Einstieg und Ausklang
    out = a * (1 - k) + np.array(NAVY, float) * k
    return Image.fromarray(out.round().astype(np.uint8))


def save_png(img, path, colors=None):
    img = img.convert("RGB")
    if colors:
        img = img.quantize(colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img.save(path, optimize=True)


def fit_cutout(path, size, pad, bg=TILE_GREY):
    """Freisteller: weißen Rand von den Ecken her einfärben, zuschneiden, mittig einpassen."""
    im = Image.open(path).convert("RGB")
    bbox = ImageChops.difference(im, Image.new("RGB", im.size, "white")).point(lambda v: 255 if v > 18 else 0).getbbox()
    im = im.crop(bbox)
    w, h = size[0] - 2 * pad, size[1] - 2 * pad
    s = min(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    card = Image.new("RGB", size, "white")
    card.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    for xy in ((0, 0), (size[0] - 1, 0), (0, size[1] - 1), (size[0] - 1, size[1] - 1)):
        ImageDraw.floodfill(card, xy, bg, thresh=14)
    return card


def main():
    project, gfx = sys.argv[1:3]
    src = os.path.join(project, "source")
    shop = os.path.join(src, "shop")
    out = os.path.join(project, "output", "images")
    os.makedirs(out, exist_ok=True)
    g = lambda name: os.path.join(gfx, f"{name}.png")

    # Kopf und Grafiken
    logo = Image.open(g("logo-weiss")).convert("RGB")
    save_png(logo.crop((0, 0, logo.width, logo.height - 1)), os.path.join(out, "logo_weiss.png"), 32)
    save(on_navy(g("hero-kopf"), (1280, 400)), os.path.join(out, "hero_kopf.jpg"), 90)
    for name in ("ueb-tropfen", "ueb-nebel", "ueb-aeste", "ueb-kuerbisse"):
        save_png(Image.open(g(name)), os.path.join(out, f"{name.replace('-', '_')}.png"), 48)
    for name in ("instagram", "facebook", "youtube"):
        save_png(on_navy(g(f"social-{name}"), (64, 64)), os.path.join(out, f"social_{name}.png"), 16)

    # Hero-Standbild (Fallback für das GIF)
    hero = Image.open(os.path.join(src, HERO_SRC)).convert("RGB")
    hero = hero.resize((HERO_W, round(hero.height * HERO_W / hero.width)), Image.LANCZOS)
    save(navy_fade(hero), os.path.join(out, "hero_clown.jpg"))

    # Produkte
    lahti = Image.open(os.path.join(shop, "lahti-xl_ambiente.jpg")).convert("RGBA")
    lahti.alpha_composite(Image.open(g("lahti-bats")).convert("RGBA"))
    save(lahti, os.path.join(out, "lahti-xl_abend.jpg"))
    for name in ("skandi-m_nacht", "swing_ambiente", "casara_dunkelgruen"):
        save(Image.open(os.path.join(shop, f"{name}.jpg")), os.path.join(out, f"{name}.jpg"))
    for name in ("calor_ambiente", "dunes_ambiente", "dubi_ambiente", "ruby_ambiente"):
        save(Image.open(os.path.join(shop, f"{name}.jpg")).resize((640, 640), Image.LANCZOS), os.path.join(out, f"{name}.jpg"))
    for name in ("frank", "swing"):
        save(fit_cutout(os.path.join(shop, f"{name}_freisteller.jpg"), (560, 480), 28), os.path.join(out, f"{name}_karte.jpg"))

    # Pop-up
    popup = os.path.join(project, "output", "popup")
    os.makedirs(popup, exist_ok=True)
    clown = Image.open(os.path.join(src, HERO_SRC)).convert("RGB")
    k = clown.width / 1774
    clown = clown.crop(tuple(round(v * k) for v in CLOWN_CROP))
    save(clown.resize((720, 480), Image.LANCZOS), os.path.join(popup, "clown.jpg"))


if __name__ == "__main__":
    main()
