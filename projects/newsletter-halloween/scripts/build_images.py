"""Newsletter-Bilder der Halloween-Edition bauen.

    python3 -I scripts/build_images.py <projekt> <grafik-dir>

<projekt>     projects/newsletter-halloween (source/, output/)
<grafik-dir>  Ausgabe von render_graphics.js (hero-band, lahti-bats, teaser)

Hero:   Kopfband „HALLOWEEN“ + Wohnzimmer mit dem Clown auf dem Sofa (source/hero/). Das ganze
        Bild ist im Newsletter der Klick, der im Shop das Gutschein-Pop-up öffnet.
LAHTI:  Fasssauna in der Dämmerung (Shopfoto) mit Fledermaus-Silhouetten im Abendhimmel.
Pop-up: Ausschnitt mit dem Clown aus dem Hero-Bild.
Alle übrigen Produktbilder sind unveränderte Shopfotos (source/shop/).
"""
import os
import sys

from PIL import Image, ImageChops

HERO_W = 1280                       # 2x der 640 px Newsletter-Breite
CLOWN_CROP = (700, 200, 1300, 600)  # Clown mit Ballon im Hero-Bild (1774 × 887)


def save(img, path, quality=86):
    img.convert("RGB").save(path, quality=quality, optimize=True, progressive=True)


def build_hero(src, gfx, out):
    band = Image.open(os.path.join(gfx, "hero-band.png")).convert("RGB")
    photo = Image.open(os.path.join(src, "hero", "wohnzimmer-clown.webp")).convert("RGB")
    photo = photo.resize((HERO_W, round(photo.height * HERO_W / photo.width)), Image.LANCZOS)
    hero = Image.new("RGB", (HERO_W, band.height + photo.height))
    hero.paste(band, (0, 0))
    hero.paste(photo, (0, band.height))
    save(hero, os.path.join(out, "hero_halloween.jpg"))


def build_lahti(src, gfx, out):
    photo = Image.open(os.path.join(src, "shop", "lahti-xl_ambiente.jpg")).convert("RGBA")
    photo.alpha_composite(Image.open(os.path.join(gfx, "lahti-bats.png")).convert("RGBA"))
    save(photo, os.path.join(out, "lahti-xl_abend.jpg"))


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


def main():
    project, gfx = sys.argv[1:3]
    src = os.path.join(project, "source")
    shop = os.path.join(src, "shop")
    out = os.path.join(project, "output", "images")
    os.makedirs(out, exist_ok=True)

    build_hero(src, gfx, out)
    build_lahti(src, gfx, out)
    save(Image.open(os.path.join(gfx, "teaser.png")), os.path.join(out, "teaser_finde-den-clown.jpg"), 88)

    # große Stimmungsbilder (640 breit im Newsletter) und das 2er-Raster (320 breit)
    for name in ("skandi-m_nacht", "swing_ambiente", "casara_dunkelgruen"):
        save(Image.open(os.path.join(shop, f"{name}.jpg")), os.path.join(out, f"{name}.jpg"))
    for name in ("calor_ambiente", "dunes_ambiente", "dubi_ambiente", "ruby_ambiente"):
        save(Image.open(os.path.join(shop, f"{name}.jpg")).resize((640, 640), Image.LANCZOS), os.path.join(out, f"{name}.jpg"))
    for name in ("frank", "swing"):
        save(fit_cutout(os.path.join(shop, f"{name}_freisteller.jpg"), (520, 400), 16), os.path.join(out, f"{name}_karte.jpg"))

    popup = os.path.join(project, "output", "popup")
    os.makedirs(popup, exist_ok=True)
    clown = Image.open(os.path.join(src, "hero", "wohnzimmer-clown.webp")).convert("RGB").crop(CLOWN_CROP)
    save(clown.resize((720, 480), Image.LANCZOS), os.path.join(popup, "clown.jpg"))


if __name__ == "__main__":
    main()
