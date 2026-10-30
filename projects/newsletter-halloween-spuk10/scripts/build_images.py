"""Newsletter-Bilder der Halloween-Fallback-Edition (SPUK10) bauen.

    python3 -I scripts/build_images.py <projekt> <grafik-dir>

<projekt>     projects/newsletter-halloween-spuk10 (source/, output/)
<grafik-dir>  Ausgabe von render_graphics.js (hero-band, teaser, kuerbis-trenner, band-kuerbisse)

Hero:     Kopfband „HALLOWEEN – 10 % Rabatt mit Code SPUK10“ (Kürbisse, Spinne). Darunter steht im
          Newsletter das Clown-GIF, das direkt vom CDN kommt (HERO_GIF in build_newsletter.py).
Teaser:   Gutschein „10 % – SPUK10“ mit Kürbissen, Mond und Fledermäusen.
Deko:     Kürbis-Trenner (weiß) und Kürbisreihe über dem Navy-Band.
Karten:   Holzlege ANTARES und Holzlager NANGA, Shopfotos mit Holz auf 520 × 400 zugeschnitten.
Alle übrigen Produktfotos bindet der Newsletter direkt vom Shop-CDN ein (SHOP_IMG).
"""
import os
import sys

from PIL import Image


def save(img, path, quality=86):
    img.convert("RGB").save(path, quality=quality, optimize=True, progressive=True)


def cover(path, size, focus_y=0.5):
    """Foto formatfüllend auf size zuschneiden; focus_y = vertikale Lage des Ausschnitts (0 oben, 1 unten)."""
    im = Image.open(path).convert("RGB")
    s = max(size[0] / im.width, size[1] / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im.width - size[0]) // 2
    y = round((im.height - size[1]) * focus_y)
    return im.crop((x, y, x + size[0], y + size[1]))


def main():
    project, gfx = sys.argv[1:3]
    shop = os.path.join(project, "source", "shop")
    out = os.path.join(project, "output", "images")
    os.makedirs(out, exist_ok=True)

    save(Image.open(os.path.join(gfx, "hero-band.png")), os.path.join(out, "hero-band_spuk10.jpg"), 88)
    save(Image.open(os.path.join(gfx, "teaser.png")), os.path.join(out, "teaser_spuk10.jpg"), 88)
    save(Image.open(os.path.join(gfx, "kuerbis-trenner.png")), os.path.join(out, "kuerbis-trenner.jpg"), 88)
    save(Image.open(os.path.join(gfx, "band-kuerbisse.png")), os.path.join(out, "band-kuerbisse.jpg"), 88)

    # Produktkarten: Shopfotos mit gestapeltem Holz (die Freisteller zeigen nur leere Rahmen)
    for name, focus_y in (("antares", 0.5), ("nanga", 0.55)):
        save(cover(os.path.join(shop, f"{name}_holz.jpg"), (520, 400), focus_y), os.path.join(out, f"{name}_karte.jpg"))


if __name__ == "__main__":
    main()
