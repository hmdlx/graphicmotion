"""Builds the Shopify page body from index.html.

Takes the CMS block between START and ENDE, drops HTML comments and line breaks
and switches attribute quotes to single quotes, so the body can be sent as a
plain JSON string to Shopify's pageCreate / pageUpdate (body field).

    python3 -I landingpages/halloween-clown/build_shopify_body.py
"""
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE / "shopify-body.html"

html = SRC.read_text(encoding="utf-8")
start = html.index("-->", html.index("CMS-BLOCK START")) + 3
end = html.index("<!-- ===== HOME DELUXE · HALLOWEEN-SUCHSPIEL · CMS-BLOCK ENDE")
body = html[start:end]

body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
# Quotes inside attribute values first, so every remaining " is a delimiter.
body = body.replace("'Poppins'", "Poppins")
body = re.sub(r"url\('([^')\s]+)'\)", r"url(\1)", body)
body = body.replace('[popovertarget="hdx-clown-gutschein"]', "[popovertarget=hdx-clown-gutschein]")
body = " ".join(line.strip() for line in body.splitlines() if line.strip())

if "'" in re.sub(r"<script>.*?</script>", "", body, flags=re.S):
    sys.exit("Einfaches Anführungszeichen im Markup – würde nach dem Tausch ein Attribut beenden.")
if '"' in re.search(r"<script>.*?</script>", body, flags=re.S).group(0):
    sys.exit("Doppeltes Anführungszeichen im Script – bitte einfache verwenden.")
body = body.replace('"', "'")
if "\\" in body:
    sys.exit("Backslash im Body – bitte prüfen.")

OUT.write_text(body + "\n", encoding="utf-8")
print(f"{OUT.relative_to(HERE.parent.parent)}: {len(body)} Zeichen")
