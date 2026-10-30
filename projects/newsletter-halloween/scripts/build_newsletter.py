"""Halloween-Edition (KW44) mit Clown-Suchspiel aus dem JUNE-Export des KW43-Newsletters bauen.

    python3 -I scripts/build_newsletter.py <projekt>

Aus source/newsletter-new-ins-kw43.html (JUNE-Export) bleiben Kopf, Navigation, Social-Leiste,
USP-Leiste und Footer erhalten. Alle Inhaltsblöcke werden mit den Vorlagen unten neu gebaut –
im selben Markup wie der Export (640 px, MSO-Ghost-Tables, VML-Buttons) – und mit Produkten
aus dem Shop gefüllt. Ergebnis: output/newsletter-halloween-kw44.html und die Textversion
output/newsletter-halloween-kw44.txt (Plain-Text-Teil der Mail). Beide bauen auf denselben
Texten unten auf (Abschnitt „Texte“).

Das Hero-Bild (Clown im Wohnzimmer) ist der Klick zum Gutschein: Es führt in den Shop, wo das
Pop-up aus output/popup/clown-popup.html den Code zeigt.

Bilder werden relativ eingebunden (images/…). Vor dem Versand in JUNE hochladen, dann
ersetzt JUNE die Pfade durch CDN-URLs.
"""
import html as htmllib
import os
import re
import sys
import textwrap

CAMPAIGN = "KW44_Halloween"
UTM = f"utm_campaign={CAMPAIGN}&utm_source=newsletter&utm_medium=email"
# Klick aufs Hero-Bild: Shop-Startseite, der Parameter halloween=clown öffnet dort das Gutschein-Pop-up
CLOWN_URL = f"https://www.homedeluxe.de/?halloween=clown&{UTM}&utm_content=clown"
VALID_UNTIL = "02.11.2026"
NAVY = "#0e2234"

# Produkte: Links, Preise und Merkmale von homedeluxe.de (Stand 30.10.2026)
P = {
    "lahti": ("Outdoor Fasssauna LAHTI XL", "https://www.homedeluxe.de/outdoor-fasssauna-lahti-xl_20004_48669/", "2.599"),
    "skandi": ("Hot Tub SKANDI M", "https://www.homedeluxe.de/hot-tub/holzbefeuertes-badefass-180cm-skandi-m_20042_48709/", "1.999"),
    "frank": ("Feuerschale FRANK", "https://www.homedeluxe.de/feuerschale-frank-made-in-germany_18183_35677/", "39"),
    "swing": ("Gartenfeuer SWING", "https://www.homedeluxe.de/gartenfeuer-swing-made-in-germany_18184_35678/", "79"),
    "casara": ("Sofa CASARA", "https://www.homedeluxe.de/sofa-casara_25129_60496/", "1.199"),
    "calor": ("Elektrokamin CALOR", "https://www.homedeluxe.de/elektrokamin-calor-mit-flammeneffekt_15586_25159/", "329"),
    "dunes": ("Massagesessel DUNES", "https://www.homedeluxe.de/massagesessel-dunes-schwarz_20321_49238/", "1.399"),
    "dubi": ("LED-Spiegel DUBI", "https://www.homedeluxe.de/led-spiegel-rund-dubi_24411_59124/", "139"),
    "ruby": ("Kratzbaum RUBY", "https://www.homedeluxe.de/kratzbaum-ruby-schwarz_20934_49994/", "69"),
}
SAUNEN_URL = "https://www.homedeluxe.de/saunen-infrarotkabinen/"

# --- Texte (für HTML und Textversion; <br /> = Zeilenumbruch im HTML, <b> = fett) ----------

TITLE = "🎃 Halloween-Edition: Finde den Clown!"
PREHEADER = "Psst … in dieser Mail versteckt sich ein Clown 🤡 Finde ihn und wir schenken dir 50 € ab 500 € Bestellwert."
HERO_ALT = "Halloween bei Home Deluxe: Ein Clown sitzt im Wohnzimmer auf dem Sofa – klick ihn an und sichere dir 50 €"
INTRO = dict(head="🎃 Halloween bei Home Deluxe 🎃", sub="Gemütlich durch die Gruselnacht",
             lead="Draußen gruselig, drinnen heiß.",
             text="Sauna, Feuer &amp; Kuschelplätze für lange Herbstabende –<br />direkt vom Hersteller, kostenlos geliefert*.",
             cta="ALLE SAUNEN ENTDECKEN")
GAME = ("Oben im Wohnzimmer hat es sich ein <b>Clown</b> auf dem Sofa gemütlich gemacht. <b>Klick auf das Bild</b> – "
        "dann öffnet sich dein Gutschein: <b>50&nbsp;€</b> auf deine Bestellung ab 500&nbsp;€.**")
GAME_NOTE = f"**Nur bis {VALID_UNTIL}. Alle Aktionsbedingungen findest du ganz unten."
LAHTI = dict(key="lahti", src="lahti-xl_abend.jpg", title="SCHWITZEN STATT SCHAUDERN.",
             text="Outdoor Fasssauna LAHTI XL – inkl. 8 kW Saunaofen<br />und Saunazubehör, ideal für 4–6 Personen.",
             cta="FASSSAUNA LAHTI XL ANSEHEN", title_style="font-size:17px;line-height:26px;")
SKANDI = dict(key="skandi", src="skandi-m_nacht.jpg", title="DEIN EIGENER HEXENKESSEL:<br />HOT TUB SKANDI M",
              text="Holzbefeuert, kein Strom nötig.<br />Ø 180 cm für bis zu 4 Personen.", cta="HOT TUB SKANDI ANSEHEN")
FIRE = dict(label="MADE IN GERMANY · FEUER &amp; HOLZ", heading="Lagerfeuer für Gruselgeschichten.",
            text="Feuerschale und Holzlager in einem –<br />in Handarbeit in Deutschland hergestellt.")
USPS = [("HANDARBEIT", "Hergestellt<br />in Deutschland"), ("2 IN 1", "Feuerschale<br />und Holzlager"),
        ("WETTERFEST", "Für draußen<br />gemacht")]
CARDS = [("frank", "frank_karte.jpg", "mit Holzlager", "Edelrost-Patina · Made in Germany"),
         ("swing", "swing_karte.jpg", "mit Holzlager", "variabel aufstellbar · Made in Germany")]
CASARA = dict(key="casara", src="casara_dunkelgruen.jpg", title="GRUSELFILM-ABEND?<br />SOFA CASARA",
              text="Weich genug zum Reinkuscheln,<br />groß genug für den ganzen Filmabend.<br />Webstoff Dunkelgrün, 258 × 128 × 72 cm.",
              cta="SOFA CASARA ANSEHEN")
GRIDS = [(("calor", "calor_ambiente.jpg", "ELEKTROKAMIN<br />CALOR", "Flammeneffekt,<br />inkl. Fernbedienung"),
          ("dunes", "dunes_ambiente.jpg", "MASSAGESESSEL<br />DUNES", "12 Programme,<br />Zero-Gravity-Liegeposition")),
         (("dubi", "dubi_ambiente.jpg", "LED-SPIEGEL<br />DUBI", "3 Lichtfarben,<br />stufenlos dimmbar"),
          ("ruby", "ruby_ambiente.jpg", "KRATZBAUM<br />RUBY", "Für schwarze Katzen –<br />und alle anderen"))]
BAND = ("Happy Halloween! 🎃", "Noch nicht geklickt? Der Clown wartet ganz oben<br />auf dem Sofa auf dich – mit 50&nbsp;€ für deine Bestellung.")
CONDITIONS = ("**Aktionsbedingungen Halloween-Suchspiel: Den Gutscheincode über 50&nbsp;€ erhältst du, "
              "wenn du in diesem Newsletter auf den Clown klickst. Einlösbar auf homedeluxe.de ab einem Bestellwert von "
              f"500&nbsp;€ (inkl. MwSt.) bis zum {VALID_UNTIL}, 23:59 Uhr. Einmal pro Kunde einlösbar, nicht mit anderen Gutscheinen "
              "oder Aktionen kombinierbar, keine Barauszahlung.")
SHIPPING = "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt."
# nur Textversion: dort gibt es kein Bild zum Anklicken, der Clown ist ein Link
TEXT_HERO = "HALLOWEEN – FINDE DEN CLOWN & SICHERE DIR 50 €"
TEXT_GAME = ("Im Wohnzimmer hat es sich ein Clown auf dem Sofa gemütlich gemacht. Klick ihn an – "
             "dann öffnet sich dein Gutschein: 50 € auf deine Bestellung ab 500 €.**")
TEXT_BAND = "Noch nicht geklickt? Der Clown wartet auf dich – mit 50 € für deine Bestellung:"

SECTION_END = '<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></div></td></tr></table>'
PS = "font-family:Verdana,Geneva,sans-serif;font-size:13px;font-weight:400;letter-spacing:0;line-height:20px;margin:0;margin-bottom:5px;"
PX = "font-family:Verdana,Geneva,sans-serif;letter-spacing:0;margin:0;"


def utm(url):
    return f"{url}?{UTM}"


def rich(s):
    return s.replace("<b>", '<strong style="font-weight:700;">').replace("</b>", "</strong>")


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


def button(href, label, td="text-align:center;padding-bottom:40px;padding-top:10px;"):
    w = 10 * len(label) + 30   # wie im Export: 13 Zeichen -> 163 px, 26 Zeichen -> 290 px
    return (
        f'<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr><td style="{td}"><div class="kd" style="text-align:center;">'
        f'<!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{href}" style="height:45px;v-text-anchor:middle;width:{w}px;" stroke="f" fillcolor="{NAVY}"><w:anchorlock/>'
        f'<center style="color:#ffffff;font-family:Verdana,Geneva,sans-serif;font-size:13px;font-weight:400;letter-spacing:1px;">{label}</center></v:rect><![endif]-->'
        '<table class="gc hc" role="presentation" border="0" cellpadding="0" cellspacing="0" width="0" style="border-collapse:separate;display:inline-table;mso-hide:all;">'
        f'<tr><td class="se" width="{w}" bgcolor="{NAVY}" style="background:{NAVY};border:2px solid {NAVY};mso-hide:all;text-align:center;width:{w}px;">'
        f'<a class="ye" href="{href}" target="_blank" role="button" data-trigger-action-id="#{{button.actionTriggerId}}" style="color:#ffffff;display:block;font-family:Verdana,Geneva,sans-serif;font-size:13px;font-weight:400;letter-spacing:1px;line-height:41px;padding:0 20px;text-align:center;text-decoration:none;white-space:nowrap;">{label}</a>'
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
    return section(image(CLOWN_URL, "hero_halloween.jpg", HERO_ALT, 640), bg="#F6F4F2")


def intro():
    inner = (
        '<div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        '<h4 style="Margin:0;Margin-bottom:0;font-family:Verdana,Geneva,sans-serif;font-size:17px;font-weight:100;letter-spacing:0;line-height:27px;margin:0;margin-bottom:0;">'
        f'<strong style="font-weight:700;">{INTRO["head"]}</strong><br />{INTRO["sub"]}<strong style="font-weight:700;">&nbsp;<br /><br /></strong></h4>'
        f'<p style="{PS}"><strong style="font-weight:700;">{INTRO["lead"]}</strong><br />{INTRO["text"]}<br /><br /></p></div>'
        + button(utm(SAUNEN_URL), INTRO["cta"], td="text-align:center;")
    )
    return section(inner, pad="padding-bottom:40px;padding-left:20px;padding-right:20px;padding-top:20px;")


def game():
    inner = (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-spacing:0;width:100%;">'
        '<tr><td style="font-size:0;line-height:0;padding:0;">'
        '<img border="0" src="images/teaser_finde-den-clown.jpg" width="640" '
        f'alt="Halloween-Suchspiel: Finde den Clown – 50 € Gutschein ab 500 € Bestellwert, nur bis {VALID_UNTIL}" '
        'style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr>'
        '<tr><td style="padding:6px 30px 34px 30px;">'
        f'<p style="{PX}text-align:center;font-size:15px;line-height:24px;color:#ffffff;">{rich(GAME)}</p>'
        f'<p style="{PX}text-align:center;font-size:11px;line-height:17px;color:#9fb0bf;padding-top:12px;">{GAME_NOTE}</p>'
        '</td></tr></table>'
    )
    return section(inner, bg=NAVY)


def feature(key, src, title, text, cta, title_style=""):
    """Großes Bild + Titel, Text, Preis, Button; Argumente wie in LAHTI, SKANDI, CASARA."""
    name, url, price = P[key]
    return section(image(utm(url), src, name, 640) + "  " + spacer(18) + "  "
                   + copy(title, text, price, title_style) + "  " + button(utm(url), cta))


def fire_header():
    inner = (
        spacer(24) + '  <div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        f'<p style="{PX}font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;color:#6b7b88;">{FIRE["label"]}</p>'
        f'<p style="{PX}font-size:26px;line-height:34px;font-weight:700;color:#0c2335;padding-top:8px;">{FIRE["heading"]}</p>'
        f'<p style="{PX}font-size:13px;line-height:20px;color:#343a40;padding-top:6px;">{FIRE["text"]}</p></div>'
        + spacer(18)
    )
    return section(inner, pad="padding-left:20px;padding-right:20px;")


def fire_image():
    name, url, _ = P["swing"]
    return section(image(utm(url), "swing_ambiente.jpg", f"{name} mit Holzlager im Garten", 640))


def usps():
    def usp(head, text):
        return ('<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">'
                '<tr><td style="border-top:3px solid #0c2335;padding:12px 6px 0 6px;text-align:center;">'
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

    white = '<span style="color:rgb(255,255,255);letter-spacing:0px;">'
    band = replace(band, f'<strong style="font-weight:700;">{white}Neu im Shop. Direkt vom Hersteller.<br />Kostenlos geliefert*.<br /><br /></span></strong>',
                   f'<strong style="font-weight:700;">{white}{BAND[0]}</span></strong><br />{white}{BAND[1]}<br /><br /></span>')

    footer = replace(footer, f"{SHIPPING}</span>", f'{SHIPPING}</span><br /><br /><span style="color:#ffffff;">{CONDITIONS}</span>')

    body = [hero(), intro(), game(), feature(**LAHTI), feature(**SKANDI), fire_header(), fire_image(), usps(), cards()]
    rest = [feature(**CASARA)] + [grid(*g) for g in GRIDS]
    # generierte Blöcke enden bereits mit SECTION_END; die übernommenen Teile bekommen es beim Zusammensetzen
    kept = lambda *ps: ''.join(p + SECTION_END for p in ps)
    html = (kept(head, nav) + ''.join(body) + kept(spacer30) + ''.join(rest)
            + kept(band, social, usp_bar, footer) + tail)
    html = html.replace("utm_campaign=KW43&", f"utm_campaign={CAMPAIGN}&")
    if "KW43" in html:
        sys.exit("KW43 steht noch im Newsletter")
    return html


# --- Textversion -------------------------------------------------------------------------

WIDTH = 72
A_TAG = r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>'


def plain(s):
    """HTML-Schnipsel -> Text: Umbrüche werden Leerzeichen, Tags fallen weg, Entities aufgelöst."""
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
        para(TEXT_GAME) + "\n\n" + text_link("ZUM CLOWN", CLOWN_URL) + "\n\n" + para(GAME_NOTE),
        rule,
        para(INTRO["head"], INTRO["sub"]) + "\n\n" + para(INTRO["lead"], INTRO["text"]) + "\n\n"
        + text_link(INTRO["cta"], utm(SAUNEN_URL)),
        rule,
        text_product(LAHTI["key"], LAHTI["title"], LAHTI["text"], LAHTI["cta"]),
        rule,
        text_product(SKANDI["key"], SKANDI["title"], SKANDI["text"], SKANDI["cta"]),
        rule,
        para(FIRE["label"], FIRE["heading"], FIRE["text"]) + "\n\n"
        + "\n".join(f"✓ {plain(h).capitalize()}: {plain(t)}" for h, t in USPS),
        *(text_product(k, P[k][0].upper(), f"{l1}, {l2}") for k, _, l1, l2 in CARDS),
        rule,
        text_product(CASARA["key"], CASARA["title"], CASARA["text"], CASARA["cta"]),
        rule,
        *(text_product(k, t, x) for g in GRIDS for k, _, t, x in g),
        "=" * WIDTH + "\n" + para(BAND[0], TEXT_BAND) + "\n" + CLOWN_URL + "\n" + "=" * WIDTH,
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
    out = os.path.join(project, "output", "newsletter-halloween-kw44.html")
    open(out, "w", encoding="utf-8").write(build(src))
    print(out)
    out = os.path.join(project, "output", "newsletter-halloween-kw44.txt")
    open(out, "w", encoding="utf-8").write(build_text(src))
    print(out)


if __name__ == "__main__":
    main()
