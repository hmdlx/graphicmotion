"""Builds cms-block.html: only the CMS block from index.html, without <html>, <head> and <body>.

This is the file to paste into a CMS field (plentyShop, Shopify page editor): the whole file,
nothing else. Document tags like </body> inside a CMS field can confuse the shop system.

    python3 -I landingpages/halloween-clown/build_cms_block.py
"""
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE / "cms-block.html"

html = SRC.read_text(encoding="utf-8")
start = html.index("-->", html.index("CMS-BLOCK START")) + 3
end = html.index("<!-- ===== HOME DELUXE · HALLOWEEN-SUCHSPIEL · CMS-BLOCK ENDE")
block = html[start:end].strip("\n")

for tag in ("<html", "</html", "<head", "</head", "<body", "</body", "<title", "<meta", "<style"):
    assert tag not in block, tag

OUT.write_text(
    "<!-- HOME DELUXE · HALLOWEEN-SUCHSPIEL · CMS-Block: die komplette Datei in das CMS-Feld einfügen.\n"
    "     Erzeugt aus index.html mit build_cms_block.py – nicht von Hand ändern. -->\n"
    + block + "\n",
    encoding="utf-8",
)
print(f"{OUT.relative_to(HERE.parent.parent)}: {len(block)} Zeichen")
