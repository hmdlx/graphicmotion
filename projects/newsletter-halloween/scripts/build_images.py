"""Newsletter-Bilder der Halloween-Edition bauen.

    python3 -I scripts/build_images.py <projekt> <grafik-dir>

<projekt>     projects/newsletter-halloween (source/, output/)
<grafik-dir>  Ausgabe von render_graphics.js (hero-band.png, teaser.png)

Hero:    Kopfband „HALLOWEEN“ + KI-Halloween-Version des Sauna-Fotos. Das Glas-Logo
         (inkl. Claim „WIR MACHEN DEIN ZUHAUSE“) kommt aus dem Originalfoto, weil die KI
         den kleinen Claim verfälscht hat.
Carport: Originalfoto, nur der Clown wird aus der KI-Version eingesetzt. Danach wird das
         Bild in Slices geschnitten, damit im Newsletter nur der Clown auf den Gutschein
         verlinkt und der Rest weiter auf das Produkt.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERO_BAND_H = 210            # Höhe des Kopfbands im KW43-Hero (Pixel bei 1280 Breite)
LOGO_BOX = (640, 255, 795, 356)   # Glas-Logo im 1280er Foto (x0, y0, x1, y1)
CLOWN_BOX = (625, 195, 775, 305)  # Bereich, in dem die KI den Clown gemalt hat (1080er Foto)

# Slice-Raster für das Carport-Bild in Newsletter-Pixeln (640 breit). Die Grenzen sind
# Vielfache von 64, damit sie im 1080er Foto (Faktor 1,6875) ganze Pixel bleiben.
SLICE_X = (352, 480)         # Clown-Spalte: 352–480 → 55 % / 20 % / 25 %
SLICE_Y = (96, 192)          # Clown-Zeile


def feather(size, box, inset, radius):
    m = Image.new("L", size, 0)
    x0, y0, x1, y1 = box
    m.paste(255, (x0 + inset, y0 + inset, x1 - inset, y1 - inset))
    return np.asarray(m.filter(ImageFilter.GaussianBlur(radius)), float)[..., None] / 255


def build_hero(src, gfx, out):
    orig = Image.open(os.path.join(src, "hero_new-ins_kw43.jpg")).convert("RGB")
    photo_orig = np.asarray(orig.crop((0, HERO_BAND_H, 1280, orig.height)), float)
    ki = Image.open(os.path.join(src, "ki", "hero_sauna_halloween_2048.jpg")).convert("RGB")
    photo = np.asarray(ki.resize((1280, 1280), Image.LANCZOS), float)

    # Original-Logo an das wärmere Abendlicht der KI-Version anpassen und weich einsetzen
    x0, y0, x1, y1 = LOGO_BOX
    ring = np.zeros(photo.shape[:2], bool)
    ring[y0 - 12:y1 + 12, x0 - 12:x1 + 12] = True
    ring[y0:y1, x0:x1] = False
    gain = photo[ring].mean(0) / photo_orig[ring].mean(0)
    m = feather((1280, 1280), LOGO_BOX, 6, 4)
    photo = photo * (1 - m) + np.clip(photo_orig * gain, 0, 255) * m

    band = Image.open(os.path.join(gfx, "hero-band.png")).convert("RGB")
    hero = Image.new("RGB", (1280, HERO_BAND_H + 1280))
    hero.paste(band, (0, 0))
    hero.paste(Image.fromarray(photo.round().astype(np.uint8)), (0, HERO_BAND_H))
    hero.save(os.path.join(out, "hero_halloween.jpg"), quality=86, optimize=True, progressive=True)


def build_teaser(gfx, out):
    Image.open(os.path.join(gfx, "teaser.png")).convert("RGB").save(
        os.path.join(out, "teaser_finde-den-clown.jpg"), quality=88, optimize=True, progressive=True)


def build_carport(src, out):
    orig = Image.open(os.path.join(src, "carport_monos.jpg")).convert("RGB")
    w, h = orig.size
    ki = Image.open(os.path.join(src, "ki", "carport_monos_clown_2048.jpg")).convert("RGB").resize((w, h), Image.LANCZOS)
    m = feather((w, h), CLOWN_BOX, 4, 3)
    img = Image.fromarray((np.asarray(orig, float) * (1 - m) + np.asarray(ki, float) * m).round().astype(np.uint8))
    # Ganzes Bild als Auflösung/Kontrolle (wird nicht im Newsletter verwendet)
    img.save(os.path.join(out, "..", "aufloesung_carport_mit_clown.jpg"), quality=90)

    k = w / 640
    xs = [0, round(SLICE_X[0] * k), round(SLICE_X[1] * k), w]
    ys = [0, round(SLICE_Y[0] * k), round(SLICE_Y[1] * k), h]
    slices = {
        "carport_monos_1.jpg": (0, ys[0], w, ys[1]),
        "carport_monos_2.jpg": (xs[0], ys[1], xs[1], ys[2]),
        "carport_monos_clown.jpg": (xs[1], ys[1], xs[2], ys[2]),
        "carport_monos_3.jpg": (xs[2], ys[1], xs[3], ys[2]),
        "carport_monos_4.jpg": (0, ys[2], w, ys[3]),
    }
    for name, box in slices.items():
        img.crop(box).save(os.path.join(out, name), quality=88, optimize=True, progressive=True)
    return {name: [round(v / k) for v in box] for name, box in slices.items()}


def build_landing_clown(src, out):
    """Nahaufnahme des Clowns für die Landingpage, aus der 2048er KI-Version."""
    ki = Image.open(os.path.join(src, "ki", "carport_monos_clown_2048.jpg")).convert("RGB")
    k = ki.width / 1080
    cx, cy = (CLOWN_BOX[0] + CLOWN_BOX[2]) / 2 * k, (CLOWN_BOX[1] + CLOWN_BOX[3]) / 2 * k
    w, h = 600, 400
    ki.crop((round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2))).resize((720, 480), Image.LANCZOS).save(
        os.path.join(out, "clown.jpg"), quality=86, optimize=True, progressive=True)


def main():
    project, gfx = sys.argv[1:3]
    src = os.path.join(project, "source")
    out = os.path.join(project, "output", "images")
    os.makedirs(out, exist_ok=True)
    build_hero(src, gfx, out)
    build_teaser(gfx, out)
    print(json.dumps(build_carport(src, out), indent=1))
    landing = os.path.join(project, "output", "landingpage")
    os.makedirs(landing, exist_ok=True)
    build_landing_clown(src, landing)


if __name__ == "__main__":
    main()
