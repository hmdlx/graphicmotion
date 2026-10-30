"""Halloween-Fallback (KW44) mit Rabattcode SPUK10 aus dem JUNE-Export des KW43-Newsletters bauen.

    python3 -I scripts/build_newsletter.py <projekt>

Fallback zur Clown-Edition (projects/newsletter-halloween), falls Landingpage/Pop-up nicht
rechtzeitig laufen: kein Suchspiel, kein Pop-up – alle bekommen direkt den Code SPUK10 (10 %).
Aufbau wie die Clown-Edition: Hero, Intro, Navy-Gutscheinblock, zwei große Produkte, Made-in-
Germany-Block mit USPs und Produktkarten, drittes großes Produkt, zwei 2er-Raster, Navy-Band.
Neue, saisonale Produkte; Orange (#FF9800, Shop-Badge) als Halloween-Akzent.

Aus source/newsletter-new-ins-kw43.html (JUNE-Export) bleiben Kopf, Navigation, Social-Leiste,
USP-Leiste und Footer erhalten. Alle Inhaltsblöcke werden mit den Vorlagen unten neu gebaut –
im selben Markup wie der Export (640 px, MSO-Ghost-Tables, VML-Buttons). Ergebnis:
output/newsletter-halloween-spuk10.html und die Textversion output/newsletter-halloween-spuk10.txt.
Beide bauen auf denselben Texten unten auf (Abschnitt „Texte“).

Bilder werden relativ eingebunden (images/…). Vor dem Versand in JUNE hochladen, dann
ersetzt JUNE die Pfade durch CDN-URLs.
"""
import html as htmllib
import os
import re
import sys
import textwrap

CAMPAIGN = "KW44_Halloween_SPUK10"
UTM = f"utm_campaign={CAMPAIGN}&utm_source=newsletter&utm_medium=email"
CODE = "SPUK10"
VALID_UNTIL = "02.11.2026"
NAVY = "#0e2234"
ORANGE = "#FF9800"       # Shop-Badge-Orange: Flächen und Schrift auf Navy (Kontrast 7,5:1)
ORANGE_TEXT = "#C25400"  # orange Schrift auf Weiß (Kontrast 4,6:1)
SHOP_URL = "https://www.homedeluxe.de/"

# Produkte: Links, Preise und Merkmale von homedeluxe.de (Stand 30.10.2026)
P = {
    "nero": ("Infrarotkabine NERO", "https://www.homedeluxe.de/saunen-infrarotkabinen/infrarotkabinen/infrarotkabine-nero_29878_75373/", "ab 1.199"),
    "lagom": ("Fasssauna LAGOM DELUXE", "https://www.homedeluxe.de/fasssauna-mit-holzofen-lagom-deluxe_27593_71858/", "4.999"),
    "codo": ("Badewanne CODO Schwarz", "https://www.homedeluxe.de/freistehende-badewanne-codo-schwarz_15233_24171/", "799"),
    "antares3": ("Holzlege ANTARES 3er-Set", "https://www.homedeluxe.de/holzlege-antares-made-in-germany-3er-set_21253_50774/", "329"),
    "antares": ("Holzlege ANTARES", "https://www.homedeluxe.de/holzlege-antares-made-in-germany_18186_35680/", "119"),
    "nanga": ("Holzlager NANGA", "https://www.homedeluxe.de/holzlager-nanga-made-in-germany_18185_35679/", "299"),
    "orlena": ("Sofa ORLENA", "https://www.homedeluxe.de/modulares-sofa-orlena_25142_60521/", "ab 349"),
    "elvora": ("Massagesessel ELVORA", "https://www.homedeluxe.de/wohnen/massagesessel/massagesessel-elvora-schwarz_21965_55544/", "1.849"),
    "cielo": ("Hängesessel CIELO", "https://www.homedeluxe.de/polyrattan-haengesessel-cielo-schwarz_21362_50923/", "199"),
    "nara": ("Schaukelstuhl NARA", "https://www.homedeluxe.de/schaukelstuhl-inkl-hocker-nara_24852_60178/", "129"),
    "bademantel": ("Home Deluxe Bademantel", "https://www.homedeluxe.de/home-deluxe-bademantel_22013_56031/", "39"),
}
SAUNEN_URL = "https://www.homedeluxe.de/saunen-infrarotkabinen/"

# --- Texte (für HTML und Textversion; <br /> = Zeilenumbruch im HTML, <b> = fett) ----------

TITLE = "🎃 Süßes oder Saures? 10 % mit SPUK10"
PREHEADER = f"Bei uns gibt’s nur Süßes: Mit dem Code {CODE} sparst du bis {VALID_UNTIL[:6]} 10 % auf deine Bestellung. 🎃"
HERO_ALT = f"Halloween bei Home Deluxe: 10 % Rabatt mit dem Code {CODE} – Infrarotkabine NERO in Schwarz im violetten Licht"
INTRO = dict(head="🎃 Halloween bei Home Deluxe 🎃", sub="Süßes oder Saures? Bei uns gibt’s Süßes.",
             lead="Draußen gruselig, drinnen warm.",
             text="Sauna, Wanne &amp; Kuschelplätze für lange Herbstabende –<br />direkt vom Hersteller, kostenlos geliefert*.",
             cta="ALLE SAUNEN ENTDECKEN")
CODE_TEXT = ("Gib den Code einfach bei deiner Bestellung ein –<br />"
             "wir ziehen <b>10&nbsp;%</b> von deinem Einkauf ab.**")
CODE_LABEL = "DEIN GUTSCHEINCODE"
CODE_CTA = "JETZT 10 % SPAREN"
CODE_NOTE = f"**Nur bis {VALID_UNTIL}, 23:59 Uhr. Alle Aktionsbedingungen findest du ganz unten."
LAGOM = dict(key="lagom", src="lagom_ambiente.jpg", title="HIER KNISTERT’S – ABER NUR IM OFEN.",
             text="Fasssauna mit Holzofen LAGOM DELUXE –<br />Ø 210 × 240 cm, ideal für 4–6 Personen.",
             cta="FASSSAUNA LAGOM ANSEHEN", title_style="font-size:17px;line-height:26px;")
CODO = dict(key="codo", src="codo_ambiente.jpg", title="SCHWARZ WIE EIN HEXENKESSEL:<br />BADEWANNE CODO",
            text="Freistehend, 170 × 80 cm – der einzige Kessel,<br />in den du freiwillig steigst.",
            cta="BADEWANNE CODO ANSEHEN")
WOOD = dict(label="MADE IN GERMANY · HOLZ &amp; EDELROST", heading="Holzvorrat für lange Gruselnächte.",
            text="Brennholz stilvoll gestapelt – in Edelrost-Optik,<br />in Handarbeit in Deutschland hergestellt.")
USPS = [("HANDARBEIT", "Hergestellt<br />in Deutschland"), ("EDELROST", "Individuelle<br />Patina"),
        ("ERWEITERBAR", "In beliebiger<br />Stückzahl")]
CARDS = [("antares", "antares_karte.jpg", "sechseckig, kombinierbar", "Edelrost-Optik · Made in Germany"),
         ("nanga", "nanga_karte.jpg", "großes Holzlager", "wetterbeständig · Made in Germany")]
ORLENA = dict(key="orlena", src="orlena_ambiente.jpg", title="GRUSELFILM-ABEND?<br />SOFA ORLENA",
              text="Modular und in Samt Anthrazit –<br />zum Verkriechen, wenn’s spannend wird.",
              cta="SOFA ORLENA ANSEHEN")
GRIDS = [(("elvora", "elvora_ambiente.jpg", "MASSAGESESSEL<br />ELVORA", "Gänsehaut, aber die gute:<br />10 Programme, mit Heizfunktion"),
          ("cielo", "cielo_ambiente.jpg", "HÄNGESESSEL<br />CIELO", "Abhängen wie eine<br />Fledermaus – inkl. Kissen")),
         (("nara", "nara_ambiente.jpg", "SCHAUKELSTUHL<br />NARA", "Schaukelt ganz von allein …<br />sobald du drinsitzt"),
          ("bademantel", "bademantel_ambiente.jpg", "BADEMANTEL<br />HOME DELUXE", "Das gemütlichste Gespenster-<br />kostüm: 100 % Baumwolle"))]
BAND = ("Happy Halloween! 🎃", f"Nicht vergessen: Mit dem Code {CODE} sparst du<br />bis {VALID_UNTIL[:6]} 10&nbsp;% auf deine Bestellung.")
CONDITIONS = (f"**Aktionsbedingungen Halloween-Rabatt: Mit dem Gutscheincode {CODE} erhältst du 10&nbsp;% Rabatt auf deine "
              f"Bestellung auf homedeluxe.de. Gültig bis zum {VALID_UNTIL}, 23:59 Uhr. Einmal pro Kunde einlösbar, nicht mit "
              "anderen Gutscheinen oder Aktionen kombinierbar, keine Barauszahlung. Ausgenommen sind Geschenkgutscheine.")
SHIPPING = "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt."
# nur Textversion
TEXT_HERO = f"HALLOWEEN – 10 % RABATT MIT DEM CODE {CODE}"
TEXT_BAND = f"Nicht vergessen: Mit dem Code {CODE} sparst du bis {VALID_UNTIL[:6]} 10 % auf deine Bestellung."

SECTION_END = '<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></div></td></tr></table>'
PS = "font-family:Verdana,Geneva,sans-serif;font-size:13px;font-weight:400;letter-spacing:0;line-height:20px;margin:0;margin-bottom:5px;"
PX = "font-family:Verdana,Geneva,sans-serif;letter-spacing:0;margin:0;"


def utm(url, content=None):
    return f"{url}?{UTM}" + (f"&utm_content={content}" if content else "")


def rich(s, color="#ffffff"):
    return s.replace("<b>", f'<strong style="font-weight:700;color:{color};">').replace("</b>", "</strong>")


def replace(s, old, new, count=1):
    n = s.count(old)
    if n != count:
        sys.exit(f"erwartet {count}× im Export, gefunden {n}×: {old[:80]!r}")
    return s.replace(old, new)


# --- Vorlagen im Markup des JUNE-Exports -------------------------------------------------

def section(inner, bg="#FFF", pad=""):
    return (
        ' <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fff!important;border-collapse:collapse;border-spacing:0;font-size:0;line-height:0;margin:0;width:100%;" bgcolor="#FFFFFF">'
        '<tr><td align="center" class="xb" style="margin:0 auto;padding:0;"><div style="max-width:640px;">'
        '<!--[if (gte mso 9)|(IE)]><table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0;width:640px;" width="640"><tr><td style="margin:0;"><![endif]-->'
        f'<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:{bg};border-collapse:separate;border-spacing:0;max-width:640px;width:100%;" role="presentation" bgcolor="{bg}">'
        f'<tr><td valign="top" style="font-size:1px;line-height:1px;margin:0;{pad}"><div> {inner} </div></td></tr></table>'
        + SECTION_END
    )


def spacer(h):
    return (
        '<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0;font-size:1px;line-height:1;width:100%;">'
        f'<tr><td style="height:{h}px;margin:0;" height="{h}">&nbsp;</td></tr></table>'
    )


def image(href, src, alt, width):
    return (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0;width:100%;" width="100%">'
        f'<tr><td class="kd" style="line-height:1;text-align:center;"><a href="{href}" class="yd" target="_blank" data-trigger-action-id="#{{image.actionTriggerId}}" style="display:inline-block;">'
        f'<img class="yd" border="0" src="images/{src}" alt="{alt}" width="{width}" style="max-width:100%;height:auto;"></a></td></tr></table>'
    )


def deco(src, alt):
    """Reine Schmuckgrafik ohne Link (Kürbisse)."""
    return (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0;width:100%;" width="100%">'
        f'<tr><td style="font-size:0;line-height:0;padding:0;text-align:center;"><img border="0" src="images/{src}" alt="{alt}" width="640" '
        'style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr></table>'
    )


def button(href, label, td="text-align:center;padding-bottom:40px;padding-top:10px;", bg=NAVY, fg="#ffffff"):
    w = 10 * len(label) + 30   # wie im Export: 13 Zeichen -> 163 px, 26 Zeichen -> 290 px
    bold = "font-weight:700;" if bg != NAVY else "font-weight:400;"
    return (
        f'<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr><td style="{td}"><div class="kd" style="text-align:center;">'
        f'<!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{href}" style="height:45px;v-text-anchor:middle;width:{w}px;" stroke="f" fillcolor="{bg}"><w:anchorlock/>'
        f'<center style="color:{fg};font-family:Verdana,Geneva,sans-serif;font-size:13px;{bold}letter-spacing:1px;">{label}</center></v:rect><![endif]-->'
        '<table class="gc hc" role="presentation" border="0" cellpadding="0" cellspacing="0" width="0" style="border-collapse:separate;display:inline-table;mso-hide:all;">'
        f'<tr><td class="se" width="{w}" bgcolor="{bg}" style="background:{bg};border:2px solid {bg};mso-hide:all;text-align:center;width:{w}px;">'
        f'<a class="ye" href="{href}" target="_blank" role="button" data-trigger-action-id="#{{button.actionTriggerId}}" style="color:{fg};display:block;font-family:Verdana,Geneva,sans-serif;font-size:13px;{bold}letter-spacing:1px;line-height:41px;padding:0 20px;text-align:center;text-decoration:none;white-space:nowrap;">{label}</a>'
        '</td></tr></table></div></td></tr></table>'
    )


def copy(title, text, price=None, title_style=""):
    out = (
        '<div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        f'<p style="{PS}{title_style}"><b style="font-weight:700;">{title}</b></p>'
        f'<p style="{PS}padding-left:20px;padding-right:20px;">{text}</p>'
    )
    if price:
        out += f'<p style="{PS}"><b style="font-weight:700;color:{NAVY};">{price}&nbsp;€</b></p>'
    return out + '</div>'


def columns(cells, gap_style=("padding-right:5px;", "padding-left:5px;"), max_width=640):
    tds = ''.join(
        f'<td style="margin:0;vertical-align:top;width:{100 / len(cells):.10g}%;" valign="top">'
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-spacing:0;">'
        f'<tr><td style="font-size:0;line-height:1;margin:0;{gap_style[i] if len(gap_style) > i else ""}vertical-align:top!important;" valign="top">{c}</td></tr></table></td>'
        for i, c in enumerate(cells))
    return (f'<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" '
            f'style="border-collapse:collapse;border-spacing:0;max-width:{max_width}px;width:100%;"><tr>{tds}</tr></table>')


# --- Blöcke ------------------------------------------------------------------------------

def hero():
    return section(image(utm(P["nero"][1], "hero"), "hero_halloween-spuk10.jpg", HERO_ALT, 640), bg="#F6F4F2")


def intro():
    inner = (
        '<div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        '<h4 style="Margin:0;Margin-bottom:0;font-family:Verdana,Geneva,sans-serif;font-size:17px;font-weight:100;letter-spacing:0;line-height:27px;margin:0;margin-bottom:0;">'
        f'<strong style="font-weight:700;">{INTRO["head"]}</strong><br />{INTRO["sub"]}<strong style="font-weight:700;">&nbsp;<br /><br /></strong></h4>'
        f'<p style="{PS}"><strong style="font-weight:700;">{INTRO["lead"]}</strong><br />{INTRO["text"]}<br /><br /></p></div>'
        + button(utm(SAUNEN_URL), INTRO["cta"], td="text-align:center;")
    )
    return section(inner, pad="padding-bottom:40px;padding-left:20px;padding-right:20px;padding-top:20px;")


def code_block():
    """Navy-Block: Gutschein-Grafik, Code als echter Text (kopierbar, auch ohne Bilder lesbar), CTA."""
    inner = (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-spacing:0;width:100%;">'
        '<tr><td style="font-size:0;line-height:0;padding:0;">'
        f'<a href="{utm(SHOP_URL, "gutschein")}" target="_blank" data-trigger-action-id="#{{image.actionTriggerId}}" style="display:block;">'
        '<img border="0" src="images/teaser_spuk10.jpg" width="640" '
        f'alt="Süßes oder Saures? 10 % Rabatt mit dem Gutscheincode {CODE}, nur bis {VALID_UNTIL}" '
        'style="display:block;width:100%;max-width:640px;height:auto;border:0;"></a></td></tr>'
        '<tr><td style="padding:6px 30px 0 30px;">'
        f'<p style="{PX}text-align:center;font-size:15px;line-height:24px;color:#ffffff;">{rich(CODE_TEXT, ORANGE)}</p></td></tr>'
        '<tr><td align="center" style="padding:22px 30px 0 30px;">'
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:separate;margin:0 auto;">'
        f'<tr><td style="border:2px dashed {ORANGE};padding:12px 34px 12px 34px;text-align:center;">'
        f'<p style="{PX}font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;color:#9fb0bf;">{CODE_LABEL}</p>'
        # div statt p: der Export setzt mobil jedes <p> auf 12 px (!important), der Code soll groß bleiben
        f'<div style="{PX}font-size:30px;line-height:40px;font-weight:700;letter-spacing:5px;color:{ORANGE};">{CODE}</div>'
        '</td></tr></table></td></tr>'
        '<tr><td>' + button(utm(SHOP_URL, "gutschein-button"), CODE_CTA, td="text-align:center;padding-top:22px;", bg=ORANGE, fg=NAVY) + '</td></tr>'
        '<tr><td style="padding:14px 30px 34px 30px;">'
        f'<p style="{PX}text-align:center;font-size:11px;line-height:17px;color:#9fb0bf;">{CODE_NOTE}</p>'
        '</td></tr></table>'
    )
    return section(inner, bg=NAVY)


def feature(key, src, title, text, cta, title_style=""):
    """Großes Bild + Titel, Text, Preis, Button; Argumente wie in LAGOM, CODO, ORLENA."""
    name, url, price = P[key]
    return section(image(utm(url), src, name, 640) + "  " + spacer(18) + "  "
                   + copy(title, text, price, title_style) + "  " + button(utm(url), cta))


def pumpkin_divider():
    return section(deco("kuerbis-trenner.jpg", "Halloween-Kürbis"))


def wood_header():
    inner = (
        spacer(8) + '  <div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        f'<p style="{PX}font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;color:{ORANGE_TEXT};">{WOOD["label"]}</p>'
        f'<div style="{PX}font-size:26px;line-height:34px;font-weight:700;color:#0c2335;padding-top:8px;">{WOOD["heading"]}</div>'
        f'<p style="{PX}font-size:13px;line-height:20px;color:#343a40;padding-top:6px;">{WOOD["text"]}</p></div>'
        + spacer(18)
    )
    return section(inner, pad="padding-left:20px;padding-right:20px;")


def wood_image():
    name, url, _ = P["antares3"]
    return section(image(utm(url), "antares-set_ambiente.jpg", f"{name} mit Brennholz auf der Terrasse", 640))


def usps():
    def usp(head, text):
        return ('<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">'
                f'<tr><td style="border-top:3px solid {ORANGE};padding:12px 6px 0 6px;text-align:center;">'
                f'<p style="{PX}font-size:12px;line-height:18px;font-weight:700;letter-spacing:1px;color:#0c2335;">{head}</p>'
                f'<p style="{PX}font-size:12px;line-height:17px;color:#343a40;padding-top:4px;">{text}</p></td></tr></table>')
    return section(columns([usp(*u) for u in USPS], gap_style=("padding-left:6px;padding-right:6px;",) * 3, max_width=600),
                   pad="padding-left:14px;padding-right:14px;padding-top:24px;padding-bottom:24px;")


def card(key, src, line1, line2):
    name, url, price = P[key]
    return (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #ececec;"><tr><td style="padding:16px 4px 18px 4px;"> '
        + image(utm(url), src, name, 260)
        + '  <div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        f'<p style="{PX}font-size:15px;line-height:22px;font-weight:700;color:#0c2335;padding-top:10px;">{name.upper()}</p>'
        f'<p style="{PX}font-size:12px;line-height:18px;color:#343a40;">{line1}</p>'
        f'<p style="{PX}font-size:12px;line-height:18px;color:#6b7b88;">{line2}</p>'
        f'<p style="{PX}font-size:22px;line-height:30px;font-weight:700;color:#0c2335;padding-top:8px;">{price}&nbsp;€</p></div>  '
        + button(utm(url), "JETZT SHOPPEN", td="text-align:center;padding-top:8px;")
        + ' </td></tr></table>'
    )


def cards():
    return section(columns([card(*c) for c in CARDS]))


def grid(left, right):
    def cell(key, src, title, text):
        name, url, price = P[key]
        return (image(utm(url), src, name, 320) + "  " + spacer(18) + "  "
                + '<div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:left;">'
                f'<p style="{PS}text-align:center;"><b style="font-weight:700;">{title}</b></p>'
                f'<p style="{PS}text-align:center;padding-left:10px;padding-right:10px;">{text}</p>'
                f'<p style="{PS}text-align:center;"><b style="font-weight:700;color:{NAVY};">{price}&nbsp;€</b></p></div>  '
                + button(utm(url), "JETZT SHOPPEN", td="text-align:center;padding-bottom:20px;padding-top:10px;"))
    return section(columns([cell(*left), cell(*right)]))


# --- Zusammenbau -------------------------------------------------------------------------

def build(src):
    parts = src.split(SECTION_END)
    if len(parts) != 19 or "BAD" not in parts[1] or "Bleibe in Verbindung" not in parts[15]:
        sys.exit("Aufbau des JUNE-Exports hat sich geändert – Abschnitte prüfen")
    head, nav, spacer30, band, social, usp_bar, footer, tail = (
        parts[0], parts[1], parts[10], parts[14], parts[15], parts[16], parts[17], parts[18])

    head = replace(head, "<title>✨ New Ins: Sauna &amp; Infrarot in einer Kabine</title>", f"<title>{TITLE}</title>")
    head = replace(head, "Kombisauna EVEREST, Whirlpool SUNSHINE &amp; 7 weitere Neuheiten – kostenlos geliefert*.", PREHEADER)

    # Navy-Band: oben die Kürbisreihe statt der Leerzeile, darunter Gruß und Code in Orange
    white = '<span style="color:rgb(255,255,255);letter-spacing:0px;">'
    band = replace(band, '<p style="font-family:Verdana,Geneva,sans-serif;font-size:13px;font-weight:400;letter-spacing:0;line-height:20px;margin:0;margin-bottom:5px;text-align:center;"><strong style="font-weight:700;"><span style="color:rgb(255,255,255);">&nbsp;</span></strong></p>',
                   deco("band-kuerbisse.jpg", "Drei leuchtende Halloween-Kürbisse"))
    band_text = BAND[1].replace(CODE, f'<strong style="font-weight:700;color:{ORANGE};letter-spacing:1px;">{CODE}</strong>')
    band = replace(band, f'<strong style="font-weight:700;">{white}Neu im Shop. Direkt vom Hersteller.<br />Kostenlos geliefert*.<br /><br /></span></strong>',
                   f'<strong style="font-weight:700;">{white}{BAND[0]}</span></strong><br />{white}{band_text}<br /><br /></span>')

    footer = replace(footer, f"{SHIPPING}</span>", f'{SHIPPING}</span><br /><br /><span style="color:#ffffff;">{CONDITIONS}</span>')

    body = [hero(), intro(), code_block(), feature(**LAGOM), feature(**CODO),
            pumpkin_divider(), wood_header(), wood_image(), usps(), cards()]
    rest = [feature(**ORLENA), pumpkin_divider()] + [grid(*g) for g in GRIDS]
    # generierte Blöcke enden bereits mit SECTION_END; die übernommenen Teile bekommen es beim Zusammensetzen
    kept = lambda *ps: ''.join(p + SECTION_END for p in ps)
    html = (kept(head, nav) + ''.join(body) + kept(spacer30) + ''.join(rest)
            + kept(band, social, usp_bar, footer) + tail)
    html = html.replace("utm_campaign=KW43&", f"utm_campaign={CAMPAIGN}&")
    if "KW43" in html:
        sys.exit("KW43 steht noch im Newsletter")
    if "halloween=clown" in html:
        sys.exit("Clown-Link im Fallback")
    return html


# --- Textversion -------------------------------------------------------------------------

WIDTH = 72
A_TAG = r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>'


def plain(s):
    """HTML-Schnipsel -> Text: Umbrüche werden Leerzeichen, Tags fallen weg, Entities aufgelöst."""
    s = re.sub(r"(\w)-<br\s*/?>\s*(?=[a-zäöüß])", r"\1", s)   # Trennung („Gespenster-<br />kostüm“) aufheben
    s = re.sub(r"\s*<br\s*/?>\s*", " ", s)
    return " ".join(htmllib.unescape(re.sub(r"<[^>]+>", "", s)).replace("\xa0", " ").split())


def para(*lines):
    return "\n".join(textwrap.fill(plain(l), WIDTH, break_long_words=False, break_on_hyphens=False) for l in lines if l)


def text_link(label, url):
    label = plain(label)
    return f"{label}{'' if label[-1] in '.:?!' else ':'}\n{url}"


def text_product(key, title, text, cta="JETZT SHOPPEN"):
    name, url, price = P[key]
    return para(title, text, f"{price} €") + "\n" + text_link(cta, utm(url))


def build_text(src):
    parts = src.split(SECTION_END)
    footer = replace(parts[17], f"{SHIPPING}</span>", f"{SHIPPING}</span><br /><br /><span>{CONDITIONS}</span>")
    rule = "-" * WIDTH

    home = re.search(r'<a [^>]*href="([^"]+)"', parts[0]).group(1)
    social = [(re.search(r'alt="([^"]+)"', m.group(2)).group(1), m.group(1)) for m in re.finditer(A_TAG, parts[15], re.S)]
    disclaimer = next(p for p in re.findall(r"<p\b[^>]*>(.*?)</p>", footer, re.S) if "Diese E-Mail wird" in p)
    disclaimer = re.sub(A_TAG, lambda m: f"{plain(m.group(2))} ({m.group(1)})", disclaimer, flags=re.S)
    legal = [(plain(t), u) for u, t in re.findall(A_TAG, footer, re.S) if plain(t) and plain(t) != "dieses Kontaktformular"]

    blocks = [
        para(PREHEADER),
        text_link("HOME DELUXE – Wir machen dein Zuhause", home),
        "=" * WIDTH + "\n" + TEXT_HERO + "\n" + "=" * WIDTH,
        para(CODE_TEXT) + "\n\n" + f"{plain(CODE_LABEL)}:\n+{'-' * (len(CODE) + 6)}+\n|   {CODE}   |\n+{'-' * (len(CODE) + 6)}+" + "\n\n"
        + text_link(CODE_CTA, utm(SHOP_URL, "gutschein-button")) + "\n\n" + para(CODE_NOTE),
        rule,
        para(INTRO["head"], INTRO["sub"]) + "\n\n" + para(INTRO["lead"], INTRO["text"]) + "\n\n"
        + text_link(INTRO["cta"], utm(SAUNEN_URL)),
        rule,
        text_product("nero", "IM BILD: INFRAROTKABINE NERO", "In Schwarz mit Glasfront und LED-Farblicht.", "NERO ANSEHEN"),
        rule,
        text_product(LAGOM["key"], LAGOM["title"], LAGOM["text"], LAGOM["cta"]),
        rule,
        text_product(CODO["key"], CODO["title"], CODO["text"], CODO["cta"]),
        rule,
        para(WOOD["label"], WOOD["heading"], WOOD["text"]) + "\n\n"
        + "\n".join(f"✓ {plain(h).capitalize()}: {plain(t)}" for h, t in USPS),
        *(text_product(k, P[k][0].upper(), f"{l1}, {l2}") for k, _, l1, l2 in CARDS),
        rule,
        text_product(ORLENA["key"], ORLENA["title"], ORLENA["text"], ORLENA["cta"]),
        rule,
        *(text_product(k, t, x) for g in GRIDS for k, _, t, x in g),
        "=" * WIDTH + "\n" + para(BAND[0], TEXT_BAND) + "\n" + utm(SHOP_URL, "band") + "\n" + "=" * WIDTH,
        "Bleibe in Verbindung mit uns\n" + "\n".join(f"{n}: {u}" for n, u in social),
        para(plain(parts[16]).replace(" ✓ ", " ✓ · ")),
        "\n\n".join(para(b) for b in re.split(r"(?:\s*<br\s*/?>\s*){2}", disclaimer) if plain(b)),
        "\n\n".join(text_link(t, u) for t, u in legal),
    ]
    text = "\n\n".join(blocks).replace("utm_campaign=KW43&", f"utm_campaign={CAMPAIGN}&") + "\n"
    if "KW43" in text or "<" in text:
        sys.exit("Textversion enthält noch KW43 oder HTML")
    return text


def main():
    project = sys.argv[1]
    src = open(os.path.join(project, "source", "newsletter-new-ins-kw43.html"), encoding="utf-8").read()
    out = os.path.join(project, "output", "newsletter-halloween-spuk10.html")
    open(out, "w", encoding="utf-8").write(build(src))
    print(out)
    out = os.path.join(project, "output", "newsletter-halloween-spuk10.txt")
    open(out, "w", encoding="utf-8").write(build_text(src))
    print(out)


if __name__ == "__main__":
    main()
