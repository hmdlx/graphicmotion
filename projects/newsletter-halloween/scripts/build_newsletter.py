"""Halloween-Edition (KW44) mit Clown-Suchspiel aus dem JUNE-Export des KW43-Newsletters bauen.

    python3 -I scripts/build_newsletter.py <projekt>

Aus source/newsletter-new-ins-kw43.html (JUNE-Export) bleiben Kopf, Navigation, Social-Leiste,
USP-Leiste und Footer erhalten. Alle Inhaltsblöcke werden mit den Vorlagen unten neu gebaut –
im selben Markup wie der Export (640 px, MSO-Ghost-Tables, VML-Buttons) – und mit Produkten
aus dem Shop gefüllt. Ergebnis: output/newsletter-halloween-kw44.html.

Das Hero-Bild (Clown im Wohnzimmer) ist der Klick zum Gutschein: Es führt in den Shop, wo das
Pop-up aus output/popup/clown-popup.html den Code zeigt.

Bilder werden relativ eingebunden (images/…). Vor dem Versand in JUNE hochladen, dann
ersetzt JUNE die Pfade durch CDN-URLs.
"""
import os
import sys

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

SECTION_END = '<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></div></td></tr></table>'
PS = "font-family:Verdana,Geneva,sans-serif;font-size:13px;font-weight:400;letter-spacing:0;line-height:20px;margin:0;margin-bottom:5px;"
PX = "font-family:Verdana,Geneva,sans-serif;letter-spacing:0;margin:0;"


def utm(url):
    return f"{url}?{UTM}"


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
    return section(image(CLOWN_URL, "hero_halloween.jpg",
                         "Halloween bei Home Deluxe: Ein Clown sitzt im Wohnzimmer auf dem Sofa – klick ihn an und sichere dir 50 €", 640),
                   bg="#F6F4F2")


def intro():
    inner = (
        '<div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        '<h4 style="Margin:0;Margin-bottom:0;font-family:Verdana,Geneva,sans-serif;font-size:17px;font-weight:100;letter-spacing:0;line-height:27px;margin:0;margin-bottom:0;">'
        '<strong style="font-weight:700;">🎃 Halloween bei Home Deluxe 🎃</strong><br />Gemütlich durch die Gruselnacht<strong style="font-weight:700;">&nbsp;<br /><br /></strong></h4>'
        f'<p style="{PS}"><strong style="font-weight:700;">Draußen gruselig, drinnen heiß.</strong><br />Sauna, Feuer &amp; Kuschelplätze für lange Herbstabende –<br />'
        'direkt vom Hersteller, kostenlos geliefert*.<br /><br /></p></div>'
        + button(utm(SAUNEN_URL), "ALLE SAUNEN ENTDECKEN", td="text-align:center;")
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
        f'<p style="{PX}text-align:center;font-size:15px;line-height:24px;color:#ffffff;">'
        'Oben im Wohnzimmer hat es sich ein <strong style="font-weight:700;">Clown</strong> auf dem Sofa gemütlich gemacht. '
        '<strong style="font-weight:700;">Klick auf das Bild</strong> – dann öffnet sich dein Gutschein: '
        '<strong style="font-weight:700;">50&nbsp;€</strong> auf deine Bestellung ab 500&nbsp;€.**</p>'
        f'<p style="{PX}text-align:center;font-size:11px;line-height:17px;color:#9fb0bf;padding-top:12px;">'
        f'**Nur bis {VALID_UNTIL}. Alle Aktionsbedingungen findest du ganz unten.</p>'
        '</td></tr></table>'
    )
    return section(inner, bg=NAVY)


def feature(key, src, title, text, cta, title_style=""):
    name, url, price = P[key]
    return section(image(utm(url), src, name, 640) + "  " + spacer(18) + "  "
                   + copy(title, text, price, title_style) + "  " + button(utm(url), cta))


def fire_header():
    inner = (
        spacer(24) + '  <div class="ef" style="color:#343a40;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:14px;line-height:20px;text-align:center;">'
        f'<p style="{PX}font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;color:#6b7b88;">MADE IN GERMANY · FEUER &amp; HOLZ</p>'
        f'<p style="{PX}font-size:26px;line-height:34px;font-weight:700;color:#0c2335;padding-top:8px;">Lagerfeuer für Gruselgeschichten.</p>'
        f'<p style="{PX}font-size:13px;line-height:20px;color:#343a40;padding-top:6px;">Feuerschale und Holzlager in einem –<br />in Handarbeit in Deutschland hergestellt.</p></div>'
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
    cells = [usp("HANDARBEIT", "Hergestellt<br />in Deutschland"), usp("2 IN 1", "Feuerschale<br />und Holzlager"),
             usp("WETTERFEST", "Für draußen<br />gemacht")]
    return section(columns(cells, gap_style=("padding-left:6px;padding-right:6px;",) * 3, max_width=600),
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
    return section(columns([card("frank", "frank_karte.jpg", "mit Holzlager", "Edelrost-Patina · Made in Germany"),
                             card("swing", "swing_karte.jpg", "mit Holzlager", "variabel aufstellbar · Made in Germany")]))


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

    head = replace(head, "<title>✨ New Ins: Sauna &amp; Infrarot in einer Kabine</title>",
                   "<title>🎃 Halloween-Edition: Finde den Clown!</title>")
    head = replace(head, "Kombisauna EVEREST, Whirlpool SUNSHINE &amp; 7 weitere Neuheiten – kostenlos geliefert*.",
                   "Psst … in dieser Mail versteckt sich ein Clown 🤡 Finde ihn und wir schenken dir 50 € ab 500 € Bestellwert.")

    white = '<span style="color:rgb(255,255,255);letter-spacing:0px;">'
    band = replace(band, f'<strong style="font-weight:700;">{white}Neu im Shop. Direkt vom Hersteller.<br />Kostenlos geliefert*.<br /><br /></span></strong>',
                   f'<strong style="font-weight:700;">{white}Happy Halloween! 🎃</span></strong><br />'
                   f'{white}Noch nicht geklickt? Der Clown wartet ganz oben<br />auf dem Sofa auf dich – mit 50&nbsp;€ für deine Bestellung.<br /><br /></span>')

    footer = replace(footer, "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt.</span>",
                     "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt.</span>"
                     '<br /><br /><span style="color:#ffffff;">**Aktionsbedingungen Halloween-Suchspiel: Den Gutscheincode über 50&nbsp;€ erhältst du, '
                     "wenn du in diesem Newsletter auf den Clown klickst. Einlösbar auf homedeluxe.de ab einem Bestellwert von "
                     f"500&nbsp;€ (inkl. MwSt.) bis zum {VALID_UNTIL}, 23:59 Uhr. Einmal pro Kunde einlösbar, nicht mit anderen Gutscheinen "
                     "oder Aktionen kombinierbar, keine Barauszahlung.</span>")

    body = [
        hero(), intro(), game(),
        feature("lahti", "lahti-xl_abend.jpg", "SCHWITZEN STATT SCHAUDERN.",
                "Outdoor Fasssauna LAHTI XL – inkl. 8 kW Saunaofen<br />und Saunazubehör, ideal für 4–6 Personen.",
                "FASSSAUNA LAHTI XL ANSEHEN", title_style="font-size:17px;line-height:26px;"),
        feature("skandi", "skandi-m_nacht.jpg", "DEIN EIGENER HEXENKESSEL:<br />HOT TUB SKANDI M",
                "Holzbefeuert, kein Strom nötig.<br />Ø 180 cm für bis zu 4 Personen.", "HOT TUB SKANDI ANSEHEN"),
        fire_header(), fire_image(), usps(), cards(),
    ]
    rest = [
        feature("casara", "casara_dunkelgruen.jpg", "GRUSELFILM-ABEND?<br />SOFA CASARA",
                "Weich genug zum Reinkuscheln,<br />groß genug für den ganzen Filmabend.<br />Webstoff Dunkelgrün, 258 × 128 × 72 cm.",
                "SOFA CASARA ANSEHEN"),
        grid(("calor", "calor_ambiente.jpg", "ELEKTROKAMIN<br />CALOR", "Flammeneffekt,<br />inkl. Fernbedienung"),
             ("dunes", "dunes_ambiente.jpg", "MASSAGESESSEL<br />DUNES", "12 Programme,<br />Zero-Gravity-Liegeposition")),
        grid(("dubi", "dubi_ambiente.jpg", "LED-SPIEGEL<br />DUBI", "3 Lichtfarben,<br />stufenlos dimmbar"),
             ("ruby", "ruby_ambiente.jpg", "KRATZBAUM<br />RUBY", "Für schwarze Katzen –<br />und alle anderen")),
    ]
    # generierte Blöcke enden bereits mit SECTION_END; die übernommenen Teile bekommen es beim Zusammensetzen
    kept = lambda *ps: ''.join(p + SECTION_END for p in ps)
    html = (kept(head, nav) + ''.join(body) + kept(spacer30) + ''.join(rest)
            + kept(band, social, usp_bar, footer) + tail)
    html = html.replace("utm_campaign=KW43&", f"utm_campaign={CAMPAIGN}&")
    if "KW43" in html:
        sys.exit("KW43 steht noch im Newsletter")
    return html


def main():
    project = sys.argv[1]
    src = open(os.path.join(project, "source", "newsletter-new-ins-kw43.html"), encoding="utf-8").read()
    out = os.path.join(project, "output", "newsletter-halloween-kw44.html")
    open(out, "w", encoding="utf-8").write(build(src))
    print(out)


if __name__ == "__main__":
    main()
