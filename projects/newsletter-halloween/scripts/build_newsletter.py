"""Halloween-Newsletter (KW44) im Look von homedeluxe.de bauen – HTML und Textversion.

    python3 -I scripts/build_newsletter.py <projekt>

Ohne Produkte: Kopf, Hero (Kopfband, Clown-GIF, Gutschein-Teaser, Text und Button), Navy-Band
„Happy Halloween!“ und Footer. Der Hero blendet aus dem Nachthimmel auf und geht in Navy direkt in
das Band über. Orange #ff9800 wie die TOPSELLER-Badges im Shop.

Kopf (Logo, Navigation) und Footer (Social-Leiste, USP-Leiste, Hinweis, Rechtslinks, Trusted Shops)
kommen unverändert aus dem JUNE-Export (source/newsletter-new-ins-kw43.html) – wie in der
SPUK10-Version. Ergebnis: output/newsletter-halloween-kw44.html und die Textversion
output/newsletter-halloween-kw44.txt, beide aus den Texten unten.

Klick auf Hero oder „ZUM CLOWN“ führt auf die Halloween-Seite im Shop (homedeluxe.de/halloween/):
dort versteckt sich der Clown in einem Produktbild, ein Klick auf ihn zeigt den Gutscheincode. Logo
und Social-Icons kommen aus dem Export vom JUNE-CDN, eigene Grafiken vom JUNE-CDN, sobald sie in
source/cdn-urls.json eingetragen sind, sonst relativ images/….
"""
import datetime
import html as htmllib
import json
import os
import re
import sys
import textwrap

CAMPAIGN = "KW44_Halloween"
UTM = f"utm_campaign={CAMPAIGN}&utm_source=newsletter&utm_medium=email"
# Klick auf den Clown: Halloween-Seite im Shop, dort geht die Suche weiter (eigenes Gutschein-Pop-up)
CLOWN_URL = f"https://www.homedeluxe.de/halloween/?{UTM}&utm_content=clown"
VALID_UNTIL = "02.11.2026"
END_DAY = ("Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag")[
    datetime.datetime.strptime(VALID_UNTIL, "%d.%m.%Y").weekday()]

NAVY, ORANGE = "#0e2234", "#ff9800"     # Werte aus dem CSS von homedeluxe.de
NIGHT_TEXT = "#c7d0d9"
FONT = "Poppins,Helvetica,Arial,sans-serif"

# --- Texte (für HTML und Textversion; <b> = fett) ------------------------------------------

# TITLE ist der Betreff (in JUNE eintragen); der Preheader ergänzt ihn, statt ihn zu wiederholen
TITLE = "🤡 50-€-Gutschein: Finde den Clown und schnapp dir die 50 €! 🎃"
# Preheader auf Öffnungen ausgelegt: Neugier (wo ist er?), Mitmachfrage, Frist als Wochentag;
# die Bedingungen stehen im Newsletter. Wochentag nur sinnvoll, solange die Aktion kurz läuft.
PREHEADER = f"HAPPY HALLOWEEN 🎃 Er hat sich in unserem Shop versteckt. Findest du ihn bis {END_DAY}?"
HERO_ALT = "Halloween-Special: Der Clown vom Sofa hat sich versteckt. Finde ihn in unserem Onlineshop – und wir schenken dir 50 €!"
HERO_IMG_ALT = "Ein Clown klettert hinter dem Sofa hervor und setzt sich – klick ihn an"
TEASER_ALT = f"Süßes oder Saures? 50-€-Gutschein ab 500 € Bestellwert, nur bis {VALID_UNTIL}"
HERO_CTA = dict(text="Klick auf den <b>Clown</b> – er versteckt sich jetzt auf unserer Halloween-Seite in einem Produktbild. Find ihn dort, klick ihn an und dein Gutscheincode gehört dir.**",
                cta="ZUM CLOWN", note=f"**Nur bis {VALID_UNTIL}. Alle Aktionsbedingungen findest du ganz unten.")
# Navy-Band vor dem Footer wie in der SPUK10-Version; §LINK§ = „Halloween-Seite“ als Link zum Clown
CLOSING = dict(heading="Happy Halloween! 🎃",
               text="Noch nicht gefunden? Der Clown hat sich auf unserer<br />§LINK§ versteckt – mit 50&nbsp;€ für deine Bestellung.")
CONDITIONS = ("**Aktionsbedingungen Halloween-Suchspiel: Den Gutscheincode über 50&nbsp;€ erhältst du, "
              "wenn du den Clown auf homedeluxe.de/halloween findest und anklickst. Einlösbar auf homedeluxe.de ab einem Bestellwert von "
              f"500&nbsp;€ (inkl. MwSt.) bis zum {VALID_UNTIL}, 23:59 Uhr. Einmal pro Kunde einlösbar, nicht mit anderen Gutscheinen "
              "oder Aktionen kombinierbar, keine Barauszahlung.")
SHIPPING = "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt."
# nur Textversion
TEXT_HERO = "HALLOWEEN-SPECIAL – FINDE DEN CLOWN, WIR SCHENKEN DIR 50 €"
TEXT_GAME = ("Der Clown vom Sofa hat sich versteckt – auf der Halloween-Seite in unserem Onlineshop. Finde ihn, "
             "klick ihn an, und wir schenken dir 50 € für deine Bestellung ab 500 €.**")

SECTION_END = '<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></div></td></tr></table>'


# --- Export auslesen ---------------------------------------------------------------------

A_TAG = r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>'


def plain(s):
    """HTML-Schnipsel -> Text: Umbrüche werden Leerzeichen, Tags fallen weg, Entities aufgelöst."""
    s = re.sub(r"\s*<br\s*/?>\s*", " ", s)
    return " ".join(htmllib.unescape(re.sub(r"<[^>]+>", "", s)).replace("\xa0", " ").split())


def from_export(src):
    """Kopf (Logo + Navigation) und Footer (Social-Leiste, USP-Leiste, Footer) unverändert als HTML,
    dazu die Texte für die Textversion."""
    parts = src.split(SECTION_END)
    if len(parts) != 19 or "BAD" not in parts[1] or "Bleibe in Verbindung" not in parts[15]:
        sys.exit("Aufbau des JUNE-Exports hat sich geändert – Abschnitte prüfen")
    fix = lambda u: u.replace("utm_campaign=KW43&", f"utm_campaign={CAMPAIGN}&")
    footer = parts[17]
    disclaimer = next(p for p in re.findall(r"<p\b[^>]*>(.*?)</p>", footer, re.S) if "Diese E-Mail wird" in p)
    contact = re.search(A_TAG, disclaimer, re.S)
    # Logo-Abschnitt beginnt direkt nach dem Preheader des Exports
    logo = parts[0].split("<!--<![endif]-->", 1)[1]
    if 'alt="Home Deluxe"' not in logo or f"{SHIPPING}</span>" not in footer:
        sys.exit("Kopf oder Footer im JUNE-Export nicht gefunden")
    footer_html = footer.replace(f"{SHIPPING}</span>", f'{SHIPPING}</span><br /><br /><span style="color:#ffffff;">{CONDITIONS}</span>')
    return dict(
        header=fix(logo + SECTION_END + parts[1] + SECTION_END),
        band=parts[14] + SECTION_END,
        footer=fix(parts[15] + SECTION_END + parts[16] + SECTION_END + footer_html + SECTION_END),
        home=fix(re.search(r'<a [^>]*href="([^"]+)"', parts[0]).group(1)),
        social=[(re.search(r'alt="([^"]+)"', t).group(1), fix(u)) for u, t in re.findall(A_TAG, parts[15], re.S)],
        usps=[plain(t).rstrip(" ✓") for t in re.split(r"✓", plain(parts[16])) if plain(t)],
        disclaimer=plain(disclaimer.split("*Kostenloser")[0].replace(contact.group(0), "§LINK§")),
        contact=(plain(contact.group(2)), fix(contact.group(1))),
        legal=[(plain(t), fix(u)) for u, t in re.findall(A_TAG, footer, re.S) if plain(t) and plain(t) != plain(contact.group(2))],
    )


# --- HTML-Bausteine ----------------------------------------------------------------------

def src_url(name):
    """Bild-Adresse: volle URL bleibt, eigene Grafik kommt vom CDN, wenn in source/cdn-urls.json
    eingetragen, sonst relativ images/…"""
    if name.startswith("https://"):
        return name
    path = os.path.join(PROJECT, "source", "cdn-urls.json")
    cdn = json.load(open(path)) if os.path.exists(path) else {}
    return cdn.get(name, f"images/{name}")


def rich(s):
    return s.replace("<b>", '<strong style="font-weight:700;">').replace("</b>", "</strong>")


def p(text, size=14, color=NAVY, align="left", extra=""):
    return (f'<p style="margin:0;font-family:{FONT};font-size:{size}px;line-height:{round(size * 1.55)}px;'
            f'color:{color};text-align:{align};{extra}">{text}</p>')


def gap(h):
    return f'<div style="height:{h}px;line-height:{h}px;font-size:1px;">&nbsp;</div>'


def img(src, alt, width, href=None, kind="image"):
    tag = (f'<img src="{src_url(src)}" width="{width}" alt="{alt}" '
           f'style="display:block;width:100%;max-width:{width}px;height:auto;border:0;">')
    if not href:
        return tag
    return (f'<a href="{href}" target="_blank" data-trigger-action-id="#{{{kind}.actionTriggerId}}" '
            f'style="display:block;text-decoration:none;">{tag}</a>')


def button(href, label, bg=NAVY, color="#ffffff", align="left", full=False):
    w = 10 * len(label) + 34
    width = "100%" if full else f"{w}px"
    return (
        f'<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="{align}" '
        f'style="{"width:100%;" if full else ""}"><tr><td align="center">'
        f'<!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{href}" '
        f'style="height:44px;v-text-anchor:middle;width:{w}px;" stroke="f" fillcolor="{bg}"><w:anchorlock/>'
        f'<center style="color:{color};font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;">{label}</center></v:rect><![endif]-->'
        f'<!--[if !mso]><!--><a href="{href}" target="_blank" role="button" data-trigger-action-id="#{{button.actionTriggerId}}" '
        f'style="display:block;width:{width};box-sizing:border-box;background:{bg};border:1px solid {bg};color:{color};font-family:{FONT};'
        f'font-size:13px;font-weight:600;line-height:42px;letter-spacing:1px;text-align:center;text-decoration:none;">{label}</a><!--<![endif]-->'
        '</td></tr></table>'
    )


def row(inner, bg="#ffffff", pad="0", cls=""):
    return f'<tr><td class="{cls}" bgcolor="{bg}" style="background:{bg};padding:{pad};">{inner}</td></tr>'


# --- Abschnitte --------------------------------------------------------------------------

def header(ex):
    """Logo und Navigation unverändert aus dem JUNE-Export (wie in den regulären Newslettern)."""
    return row(ex["header"], cls="june")


def hero():
    """Hero-Kopf, GIF und darunter der Teaser, der die Nacht weiterführt (wie in der SPUK10-Version):
    das GIF läuft in Navy aus, der Teaser beginnt in Navy und endet wieder darin."""
    gif = os.path.exists(os.path.join(PROJECT, "output", "images", "hero_clown.gif"))
    return (
        row(img("hero_kopf.jpg", HERO_ALT, 640, CLOWN_URL), bg=NAVY)
        + row(img("hero_clown.gif" if gif else "hero_clown.jpg", HERO_IMG_ALT, 640, CLOWN_URL), bg=NAVY)
        + row(img("teaser_clown.jpg", TEASER_ALT, 640, CLOWN_URL), bg=NAVY)
        + row(p(rich(HERO_CTA["text"]), 15, "#ffffff", "center") + gap(18)
              + button(CLOWN_URL, HERO_CTA["cta"], ORANGE, NAVY, "center")
              + p(HERO_CTA["note"], 11, NIGHT_TEXT, "center", "padding-top:14px;clear:both;"),
              bg=NAVY, pad="4px 40px 26px", cls="px")
    )


def swap(s, old, new):
    if s.count(old) != 1:
        sys.exit(f"erwartet 1× im JUNE-Export, gefunden {s.count(old)}×: {old[:80]!r}")
    return s.replace(old, new)


def closing(ex):
    """Navy-Band aus dem JUNE-Export wie in der SPUK10-Version: oben die Kürbisreihe statt der
    Leerzeile, darunter Gruß und Erinnerung; „Halloween-Seite“ führt zum Clown."""
    white = '<span style="color:rgb(255,255,255);letter-spacing:0px;">'
    pumpkins = ('<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">'
                '<tr><td style="font-size:0;line-height:0;padding:0;">'
                f'<img src="{src_url("band_kuerbisse.jpg")}" width="640" alt="Drei leuchtende Halloween-Kürbisse" '
                'style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr></table>')
    link = (f'<span style="color:{ORANGE};text-decoration:underline;"><a href="{CLOWN_URL}" target="_blank" style="color:{ORANGE};font-weight:700;">Halloween-Seite</a></span>')
    band = swap(ex["band"], '<p style="font-family:Verdana,Geneva,sans-serif;font-size:13px;font-weight:400;letter-spacing:0;'
                'line-height:20px;margin:0;margin-bottom:5px;text-align:center;"><strong style="font-weight:700;">'
                '<span style="color:rgb(255,255,255);">&nbsp;</span></strong></p>', pumpkins)
    band = swap(band, f'<strong style="font-weight:700;">{white}Neu im Shop. Direkt vom Hersteller.<br />Kostenlos geliefert*.<br /><br /></span></strong>',
                f'<strong style="font-weight:700;">{white}{CLOSING["heading"]}</span></strong><br />'
                f'{white}{CLOSING["text"].replace("§LINK§", link)}<br /><br /></span>')
    return row(band, cls="june")


def footer(ex):
    """Social-Leiste, USP-Leiste und Footer unverändert aus dem JUNE-Export, die Aktionsbedingungen
    stehen unter dem Versandhinweis."""
    return row(ex["footer"], cls="june")


def build(src):
    ex = from_export(src)
    rows = [
        # der Hero endet in Navy und geht direkt in das Navy-Band über
        header(ex), hero(), closing(ex), footer(ex),
    ]
    filler = "&#847;&zwnj;&nbsp;" * 60
    return f"""<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>{TITLE}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<style>
  body {{ margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
  table {{ border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }}
  img {{ border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }}
  a[x-apple-data-detectors] {{ color:inherit !important; text-decoration:none !important; }}
  /* Kopf und Footer aus dem JUNE-Export: dessen Regeln, nur für diese Blöcke (.june) */
  .june p {{ font-family:Verdana,Geneva,sans-serif !important; }}
  .june .tc {{ font-family:"Source Sans Pro",Helvetica,Arial,Verdana,sans-serif !important; }}
  .june .ue, .june .af {{ font-family:Helvetica,Arial,sans-serif !important; }}
  .june .ef a {{ text-decoration:none !important; }}
  div > u ~ div .june .fc {{ max-width:100% !important; }}
  div > u ~ div .june .jc {{ width:100% !important; }}
  div > u ~ div .june p {{ font-size:12px !important; line-height:18px !important; letter-spacing:0 !important; margin-bottom:0 !important; }}
  div > u ~ div .june .tc {{ font-size:10px !important; line-height:15px !important; }}
  @media screen and (max-width:640px) {{
    .px {{ padding-left:18px !important; padding-right:18px !important; }}
    .june .kd {{ text-align:center !important; }}
    .june .md, .june .md * {{ text-align:left !important; }}
    .june .nd, .june .nd * {{ text-align:center !important; }}
    .june .od, .june .od * {{ text-align:right !important; }}
    .june .rd {{ width:30% !important; }}
    .june .td {{ width:50% !important; }}
    .june .wd {{ width:80% !important; }}
    .june .fc {{ max-width:100% !important; }}
    .june .jc {{ width:100% !important; }}
    .june p {{ font-size:12px !important; line-height:18px !important; letter-spacing:0 !important; margin-bottom:0 !important; }}
    .june .tc {{ font-size:10px !important; line-height:15px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">{PREHEADER}{filler}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background:#ffffff;">
<tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="640" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
{chr(10).join(rows)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>
"""


# --- Textversion -------------------------------------------------------------------------

WIDTH = 72


def para(*lines):
    return "\n".join(textwrap.fill(plain(l), WIDTH, break_long_words=False, break_on_hyphens=False) for l in lines if l)


def text_link(label, url):
    label = plain(label)
    return f"{label}{'' if label[-1] in '.:?!' else ':'}\n{url}"


def build_text(src):
    ex = from_export(src)
    blocks = [
        para(PREHEADER),
        text_link("HOME DELUXE – Wir machen dein Zuhause", ex["home"]),
        "=" * WIDTH + "\n" + TEXT_HERO + "\n" + "=" * WIDTH,
        para(TEXT_GAME) + "\n\n" + text_link(HERO_CTA["cta"], CLOWN_URL) + "\n\n" + para(HERO_CTA["note"]),
        "=" * WIDTH + "\n" + para(CLOSING["heading"].upper(), CLOSING["text"].replace("§LINK§", "Halloween-Seite"))
        + "\n" + CLOWN_URL + "\n" + "=" * WIDTH,
        "Bleibe in Verbindung mit uns", *(text_link(n, u) for n, u in ex["social"]),
        " · ".join(f"{u} ✓" for u in ex["usps"]),
        para(ex["disclaimer"].replace("§LINK§", f"{ex['contact'][0]} ({ex['contact'][1]})")),
        para(SHIPPING), para(CONDITIONS),
        "\n\n".join(text_link(t, u) for t, u in ex["legal"]),
    ]
    text = "\n\n".join(blocks) + "\n"
    if "<" in text:
        sys.exit("Textversion enthält noch HTML")
    return text


PROJECT = "."


def main():
    global PROJECT
    PROJECT = sys.argv[1]
    src = open(os.path.join(PROJECT, "source", "newsletter-new-ins-kw43.html"), encoding="utf-8").read()
    for name, content in (("newsletter-halloween-kw44.html", build(src)), ("newsletter-halloween-kw44.txt", build_text(src))):
        if "KW43" in content:
            sys.exit(f"KW43 steht noch in {name}")
        if "halloween=clown" in content:
            sys.exit(f"{name} öffnet das Shop-Pop-up direkt – der Clown soll auf der Halloween-Seite gesucht werden")
        out = os.path.join(PROJECT, "output", name)
        open(out, "w", encoding="utf-8").write(content)
        print(out)


if __name__ == "__main__":
    main()
