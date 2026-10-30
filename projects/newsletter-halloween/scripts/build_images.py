"""Newsletter-Bilder der Halloween-Edition aus Shopfotos bauen (ohne KI-Bilder).

    python3 -I scripts/build_images.py <projekt> <grafik-dir>

<projekt>     projects/newsletter-halloween (source/shop/, output/)
<grafik-dir>  Ausgabe von render_graphics.js (hero-band, hero-bats, teaser, clown-kopf, clown-haende)

Hero:    Kopfband „HALLOWEEN“ + Fasssauna LAHTI XL in der Dämmerung, Fledermaus-Silhouetten
         im Abendhimmel.
Clown:   Gezeichneter Clown lugt hinter der Lehne vom Sofa CASARA hervor. Der Kopf wird über
         den dunkelgrünen Stoff maskiert (liegt also hinter der Lehne), die Handschuhe greifen
         vorn über die Kante. Danach wird das Foto in Slices geschnitten, damit im Newsletter
         nur der Clown auf den Gutschein verlinkt. Das Raster landet in slices.json und wird
         von build_newsletter.py gelesen.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

PHOTO = 1000                  # Shopfotos sind 1000 × 1000
NEWS = 640                    # Newsletter-Breite
GRID = 16                     # Slice-Grenzen in Newsletter-Pixeln: Vielfache von 16 = ganze Foto-Pixel (× 1,5625)

CLOWN_X = 858                 # Mitte des Clown-Kopfs im Sofa-Foto (Fotopixel)
CLOWN_SCALE = 0.26            # gezeichnete Ebenen (400 px breit) -> ca. 83 px Kopfbreite inkl. Haar
NOSE_BOTTOM = 277             # Unterkante der Nase in clown-kopf.png – sitzt knapp über der Lehne
HAND_EDGE = 40                # Kante, über die die Finger greifen, in clown-haende.png
SOFA_MAX_LUMA = 135           # dunkler als das: Sofastoff (liegt vor dem Kopf)


def save(img, path, quality=86):
    img.convert("RGB").save(path, quality=quality, optimize=True, progressive=True)


def luma(img):
    return np.asarray(img.convert("L"), float)


def build_hero(src, gfx, out):
    photo = Image.open(os.path.join(src, "lahti-xl_ambiente.jpg")).convert("RGBA")
    photo.alpha_composite(Image.open(os.path.join(gfx, "hero-bats.png")).convert("RGBA"))
    band = Image.open(os.path.join(gfx, "hero-band.png")).convert("RGB")
    band = band.resize((PHOTO, round(band.height * PHOTO / band.width)), Image.LANCZOS)
    hero = Image.new("RGB", (PHOTO, band.height + PHOTO))
    hero.paste(band, (0, 0))
    hero.paste(photo.convert("RGB"), (0, band.height))
    save(hero, os.path.join(out, "hero_halloween.jpg"))


def sofa_edge(photo, x):
    """Oberkante der Sofalehne in Spalte x: erster dunkler Pixel unterhalb des hellen Vorhangs,
    über ±3 Spalten gemittelt, damit helle Stellen im Stoff die Kante nicht verrutschen lassen."""
    lum = luma(photo)
    ys = [300 + int(np.argmax(lum[300:600, c] < SOFA_MAX_LUMA)) for c in range(x - 3, x + 4)]
    return int(np.median(ys))


def scaled(path, s):
    im = Image.open(path).convert("RGBA")
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def match_scene(layer):
    """Gezeichnete Ebene an das weiche Tageslicht-Foto angleichen: etwas flacher, minimal unscharf, Korn."""
    rgb = np.asarray(layer, float)
    grey = rgb[..., :3].mean(axis=2, keepdims=True)
    rgb[..., :3] = (rgb[..., :3] * 0.85 + grey * 0.15) * 0.95 + 6
    rgb[..., :3] += np.random.default_rng(7).normal(0, 3, rgb[..., :3].shape)
    out = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGBA")
    return out.filter(ImageFilter.GaussianBlur(0.45))


def build_clown_photo(src, gfx):
    photo = Image.open(os.path.join(src, "casara_dunkelgruen.jpg")).convert("RGBA")
    head = match_scene(scaled(os.path.join(gfx, "clown-kopf.png"), CLOWN_SCALE))
    hands = match_scene(scaled(os.path.join(gfx, "clown-haende.png"), CLOWN_SCALE))

    hx = CLOWN_X - head.width // 2
    hy = sofa_edge(photo, CLOWN_X) - round(NOSE_BOTTOM * CLOWN_SCALE) - 2
    # Kopf hinter der Lehne: unterhalb der Lehnen-Kante (je Spalte) ausblenden; 3 px Zugabe,
    # weil der flauschige Stoffrand heller ist als der Schwellwert
    edge = [sofa_edge(photo, x) - hy - 3 for x in range(hx, hx + head.width)]
    sofa = (np.arange(head.height)[:, None] >= np.array(edge)[None, :]).astype(np.uint8) * 255
    sofa = Image.fromarray(sofa).filter(ImageFilter.GaussianBlur(0.8))
    alpha = ImageChops.multiply(head.getchannel("A"), ImageChops.invert(sofa))
    head.putalpha(alpha)
    clown = Image.new("RGBA", photo.size)
    clown.alpha_composite(head, (hx, hy))

    # Hände einzeln auf die Kante setzen (die Lehne fällt nach rechts ab), mit kleinem Schatten
    half = hands.width // 2
    for part, x0 in ((hands.crop((0, 0, half, hands.height)), hx),
                     (hands.crop((half, 0, hands.width, hands.height)), hx + half)):
        ex = x0 + part.width // 2
        y0 = sofa_edge(photo, ex) - round(HAND_EDGE * CLOWN_SCALE)
        shadow = Image.new("RGBA", part.size, (20, 30, 20, 0))
        shadow.putalpha(part.getchannel("A").point(lambda a: a * 0.35).filter(ImageFilter.GaussianBlur(2)))
        clown.alpha_composite(shadow, (x0 + 1, y0 + 3))
        clown.alpha_composite(part, (x0, y0))

    photo.alpha_composite(clown)
    return photo.convert("RGB"), clown.getchannel("A").getbbox()


def build_slices(photo, bbox, out):
    """Raster um den Clown (Newsletter-Pixel, auf GRID gerundet) und Slices daraus schneiden."""
    k = PHOTO / NEWS
    x0, y0, x1, y1 = (v / k for v in bbox)
    snap_lo = lambda v: int(max(0, (v - GRID) // GRID * GRID))
    snap_hi = lambda v: int(min(NEWS, -(-(v + GRID) // GRID) * GRID))
    xs, ys = (snap_lo(x0), snap_hi(x1)), (snap_lo(y0), snap_hi(y1))
    px = lambda v: round(v * k)
    cols = [c for c in ((0, xs[0]), xs, (xs[1], NEWS)) if c[1] > c[0]]
    spec = {"top": "casara_1.jpg", "bottom": "casara_3.jpg", "row": [], "clown_px": [*xs, *ys]}
    photo.crop((0, 0, PHOTO, px(ys[0]))).save(os.path.join(out, "casara_1.jpg"), quality=88)
    photo.crop((0, px(ys[1]), PHOTO, PHOTO)).save(os.path.join(out, "casara_3.jpg"), quality=88)
    for i, (a, b) in enumerate(cols):
        name = "casara_clown.jpg" if (a, b) == xs else f"casara_2{'ab'[i > 0]}.jpg"
        photo.crop((px(a), px(ys[0]), px(b), px(ys[1]))).save(os.path.join(out, name), quality=88)
        spec["row"].append({"src": name, "width": b - a, "clown": (a, b) == xs})
    return spec


def fit_cutout(path, size, pad):
    """Freisteller auf Weiß: Ränder abschneiden und mittig in size einpassen."""
    im = Image.open(path).convert("RGB")
    bbox = ImageChops.difference(im, Image.new("RGB", im.size, "white")).point(lambda v: 255 if v > 18 else 0).getbbox()
    im = im.crop(bbox)
    w, h = size[0] - 2 * pad, size[1] - 2 * pad
    s = min(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    card = Image.new("RGB", size, "white")
    card.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    return card


def build_landing(photo, bbox, out):
    """Auflösung für die Landingpage: Sofa-Ausschnitt 3:2 mit Ring um den Clown."""
    img = photo.copy()
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    r = max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 0.75
    d = ImageDraw.Draw(img)
    for w, col in ((9, (14, 34, 52)), (5, (255, 255, 255))):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=col, width=w)
    img = img.crop((0, 200, PHOTO, 200 + 667)).resize((960, 640), Image.LANCZOS)
    save(img, os.path.join(out, "clown.jpg"))


def main():
    project, gfx = sys.argv[1:3]
    src = os.path.join(project, "source", "shop")
    out = os.path.join(project, "output", "images")
    os.makedirs(out, exist_ok=True)

    build_hero(src, gfx, out)
    save(Image.open(os.path.join(gfx, "teaser.png")), os.path.join(out, "teaser_finde-den-clown.jpg"), 88)

    # große Stimmungsbilder (640 breit im Newsletter) und das 2er-Raster (320 breit)
    for name in ("lahti-xl_innen", "skandi-m_nacht", "swing_ambiente"):
        save(Image.open(os.path.join(src, f"{name}.jpg")), os.path.join(out, f"{name}.jpg"))
    for name in ("calor_ambiente", "dunes_ambiente", "dubi_ambiente", "ruby_ambiente"):
        save(Image.open(os.path.join(src, f"{name}.jpg")).resize((640, 640), Image.LANCZOS), os.path.join(out, f"{name}.jpg"))
    for name in ("frank", "swing"):
        save(fit_cutout(os.path.join(src, f"{name}_freisteller.jpg"), (520, 400), 16), os.path.join(out, f"{name}_karte.jpg"))

    photo, bbox = build_clown_photo(src, gfx)
    spec = build_slices(photo, bbox, out)
    json.dump(spec, open(os.path.join(out, "..", "slices.json"), "w"), indent=1)
    save(photo, os.path.join(project, "output", "aufloesung_sofa_mit_clown.jpg"), 90)
    os.makedirs(os.path.join(project, "output", "landingpage"), exist_ok=True)
    build_landing(photo, bbox, os.path.join(project, "output", "landingpage"))
    print(json.dumps(spec))


if __name__ == "__main__":
    main()
