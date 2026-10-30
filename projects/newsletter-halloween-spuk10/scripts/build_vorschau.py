"""Eigenständige Vorschau-Datei mit eingebetteten Bildern bauen.

    python3 -I scripts/build_vorschau.py <projekt>

Der Newsletter bindet seine eigenen Grafiken relativ ein (images/…). Einzeln verschickt oder
geöffnet fehlen sie deshalb. Für Vorschau und Abstimmung bettet dieses Skript diese Grafiken als
data-URI ein und schreibt nach output/vorschau/. Bilder mit voller Adresse (Shop-CDN, Hero-GIF,
Logo) bleiben Links und laden online – so bleibt die Datei klein (Viewer schneiden große Dateien ab).

Nur zum Ansehen: Mail-Programme wie Gmail zeigen eingebettete Bilder nicht an. Für den Versand
gilt weiter output/newsletter-halloween-spuk10.html mit den in JUNE hochgeladenen Bildern.
"""
import base64
import mimetypes
import os
import re


def data_uri(src, base):
    data = open(os.path.join(base, src), "rb").read()
    mime = mimetypes.guess_type(src.split("?")[0])[0] or "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


def inline(path, out):
    html = open(path, encoding="utf-8").read()
    base = os.path.dirname(path)
    cache = {}

    def sub(m):
        src = m.group(2)
        if src.startswith(("data:", "https://")):
            return m.group(0)
        if src not in cache:
            cache[src] = data_uri(src, base)
        return f'{m.group(1)}"{cache[src]}"'

    html = re.sub(r'(<img\b[^>]*?\ssrc=)"([^"]+)"', sub, html)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    print(out, f"{len(cache)} Bilder, {os.path.getsize(out) // 1024} KB")


def main():
    import sys
    o = os.path.join(sys.argv[1], "output")
    inline(os.path.join(o, "newsletter-halloween-spuk10.html"), os.path.join(o, "vorschau", "newsletter-halloween-spuk10_vorschau.html"))


if __name__ == "__main__":
    main()
