"""Newsletter-Bilder der Halloween-Edition bauen.

    python3 -I scripts/build_images.py <projekt> <grafik-dir>

<projekt>     projects/newsletter-halloween (source/, output/)
<grafik-dir>  Ausgabe von render_graphics.js

Grafiken:  Logo, Hero-Kopf und Social-Icons auf Navy, Halloween-Übergänge als PNG (verlustfrei,
           damit die Kanten exakt Navy bzw. Weiß treffen).
Hero:      Standbild aus source/hero/ mit Navy-Verlauf oben und unten, so dass es nahtlos aus
           dem Hero-Kopf kommt und in den Navy-Abschnitt darunter übergeht. Liegt das KI-Video
           source/hero/clown-hervor.mp4 vor (leeres Sofa -> Clown sitzt), entsteht daraus
           hero_clown.gif mit demselben Verlauf; der Newsletter nimmt dann das GIF.
Produkte:  Shopfotos unverändert, Freisteller auf hellgrauem Grund wie die Kacheln im Shop.
"""
import glob
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageChops, ImageDraw

NAVY = (14, 34, 52)
TILE_GREY = (244, 246, 248)          # #f4f6f8, Kachelgrund wie auf homedeluxe.de
HERO_W = 1280                         # 2x der 640 px Newsletter-Breite
HERO_SRC = os.path.join("hero", "wohnzimmer-clown-hoodie.webp")
FADE_TOP, FADE_BOTTOM = 0.16, 0.20    # Anteil der Bildhöhe, der in Navy übergeht
CLOWN_CROP = (700, 200, 1300, 600)    # Clown im Hero-Bild (1774 × 887) für das Pop-up
HERO_VIDEO = os.path.join("hero", "clown-hervor.mp4")
GIF_W, GIF_FPS = 640, 12              # GIF in 1x: 2x wäre für E-Mail zu schwer
GIF_HOLD, GIF_GHOST = 2.5, 0.6        # Sekunden: Clown sitzt / verblasst wie ein Geist
GIF_COLORS = 160


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


def build_hero_gif(src, out):
    """Hero-GIF aus dem KI-Video. Reihenfolge: Clown sitzt (Outlook zeigt nur dieses erste Bild),
    verblasst wie ein Geist, das leere Sofa, er kommt hinter dem Sofa hervor und setzt sich –
    das Ende passt wieder an den Anfang, die Schleife läuft ohne Sprung."""
    video = os.path.join(src, HERO_VIDEO)
    if not os.path.exists(video):
        return False
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", f"fps={GIF_FPS},scale={GIF_W}:-2:flags=lanczos",
                        os.path.join(tmp, "v%04d.png")], check=True)
        frames = [navy_fade(Image.open(f)) for f in sorted(glob.glob(os.path.join(tmp, "v*.png")))]
        seated, empty = frames[-1], frames[0]
        n = round(GIF_GHOST * GIF_FPS)
        seq = ([seated] * round(GIF_HOLD * GIF_FPS)
               + [Image.blend(seated, empty, (i + 1) / (n + 1)) for i in range(n)]
               + frames)
        for i, im in enumerate(seq):
            im.save(os.path.join(tmp, f"g{i:04d}.png"))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(GIF_FPS), "-i", os.path.join(tmp, "g%04d.png"),
                        "-vf", f"split[a][b];[a]palettegen=max_colors={GIF_COLORS}:stats_mode=full[p];"
                               "[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
                        "-loop", "0", os.path.join(out, "hero_clown.gif")], check=True)
    return True


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
    gif = os.path.join(out, "hero_clown.gif")
    if not build_hero_gif(src, out) and os.path.exists(gif):
        os.remove(gif)

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
