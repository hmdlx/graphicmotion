"""Builds plenty-block.html: the landing page as a block for plentyShop (homedeluxe.de).

Only the CMS block from index.html, without <html>, <head> and <body>, and without the
Google Fonts link: the shop already loads Poppins itself, and loading fonts from Google's
servers without consent is a data-protection risk in Germany.

Paste the whole file into a ShopBuilder code widget (or another CMS field that allows HTML
and <script>). The block breaks out to full page width on its own.

    python3 -I landingpages/halloween-clown/build_plenty_block.py
"""
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE / "plenty-block.html"

html = SRC.read_text(encoding="utf-8")
start = html.index("-->", html.index("CMS-BLOCK START")) + 3
end = html.index("<!-- ===== HOME DELUXE · HALLOWEEN-SUCHSPIEL · CMS-BLOCK ENDE")
block = html[start:end].strip("\n")
block, n = re.subn(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">\n?', "", block)
assert n == 1, "Google-Fonts-Link nicht gefunden"

for tag in ("<html", "</html", "<head", "</head", "<body", "</body", "<title", "<meta", "<style", "googleapis"):
    assert tag not in block, tag

OUT.write_text(
    "<!-- HOME DELUXE · HALLOWEEN-SUCHSPIEL · Block für plentyShop: die komplette Datei in ein\n"
    "     ShopBuilder-Code-Widget einfügen. Schrift Poppins kommt vom Shop.\n"
    "     Erzeugt aus index.html mit build_plenty_block.py – nicht von Hand ändern. -->\n"
    + block + "\n",
    encoding="utf-8",
)
print(f"{OUT.relative_to(HERE.parent.parent)}: {len(block)} Zeichen")
