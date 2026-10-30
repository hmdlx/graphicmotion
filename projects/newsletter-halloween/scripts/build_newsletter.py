"""Halloween-Newsletter (KW44) im Look von homedeluxe.de bauen – HTML und Textversion.

    python3 -I scripts/build_newsletter.py <projekt>

Gestaltung nach dem Shop: Navy-Header mit weißem Logo und grauer Navigation, Überschriften mit
fettem und normalem Teil („**Wellness** für die Geisternacht“), eckige Navy-Buttons
„Artikel anzeigen“, Orange #ff9800 wie die TOPSELLER-Badges im Shop. Nacht-Abschnitte (Navy)
und Tag-Abschnitte (Weiß) gehen über Halloween-Grafiken ineinander über (Tropfen, Nebel, Äste,
Kürbis-Hügel), der Hero blendet aus dem Nachthimmel auf.

Aus dem JUNE-Export (source/newsletter-new-ins-kw43.html) kommen Navigation, Social-Links,
Footer-Hinweis und Rechtslinks. Ergebnis: output/newsletter-halloween-kw44.html und die
Textversion output/newsletter-halloween-kw44.txt, beide aus den Texten unten.

Klick auf Hero oder „ZUM CLOWN“ führt in den Shop, wo das Pop-up aus output/popup/ den
Gutscheincode zeigt. Produktfotos kommen direkt vom Shop-CDN (SHOP_IMG), eigene Grafiken vom
JUNE-CDN, sobald sie in source/cdn-urls.json eingetragen sind, sonst relativ images/….
"""
import html as htmllib
import json
import os
import re
import sys
import textwrap

CAMPAIGN = "KW44_Halloween"
UTM = f"utm_campaign={CAMPAIGN}&utm_source=newsletter&utm_medium=email"
# Klick auf den Clown: Shop-Startseite, der Parameter halloween=clown öffnet dort das Gutschein-Pop-up
CLOWN_URL = f"https://www.homedeluxe.de/?halloween=clown&{UTM}&utm_content=clown"
VALID_UNTIL = "02.11.2026"

NAVY, ORANGE, SALE = "#0e2234", "#ff9800", "#FF4500"     # Werte aus dem CSS von homedeluxe.de
GREY, LINE, MUTED, NIGHT_TEXT = "#f4f6f8", "#e3e7ec", "#66727d", "#c7d0d9"
FONT = "Poppins,Helvetica,Arial,sans-serif"

# Produktfotos direkt vom Shop-CDN (unverändert, 1000 × 1000 px)
SHOP_IMG = {
    "lahti": "https://cdn02.plentyone.com/emoguafh21bo/item/images/20004/full/48669-Home-Deluxe-Outdoorsauna-LAHTI-XL-ambiente-01.jpg",
    "skandi": "https://cdn02.plentyone.com/emoguafh21bo/item/images/20042/full/20042-home-deuxe-hot-tub-holzbefeuertes-badefass-skandi-M-Ambiente01-mit-Model.jpg",
    "swing_amb": "https://cdn02.plentyone.com/emoguafh21bo/item/images/18184/full/35678-Home-Deluxe-Kamin-Swing-Ambiente02-1.jpg",
    "swing_frei": "https://cdn02.plentyone.com/emoguafh21bo/item/images/18184/full/Kamin-Swing-45grad-rust.jpg",
    "frank_frei": "https://cdn02.plentyone.com/emoguafh21bo/item/images/18183/full/Feuerschale-Frank-front-rust-holz.jpg",
    "casara": "https://cdn02.plentyone.com/emoguafh21bo/item/images/25129/full/60495-home-deluxe-sofa-casara-gruen-ambiente-01.jpg",
    "calor": "https://cdn02.plentyone.com/emoguafh21bo/item/images/15586/full/15586-Elektrokamin-Calor-mit-Flammeneffekt-01-neu.jpg",
    "dunes": "https://cdn02.plentyone.com/emoguafh21bo/item/images/20321/full/20321-Home-Deluxe-Massagesessel-DUNES-Schwarz-Ambiente01_1.jpg",
    "dubi": "https://cdn02.plentyone.com/emoguafh21bo/item/images/24411/full/59122-home-deluxe-led-spiegel-dubi-60-cm-ambiente-neu.jpg",
    "ruby": "https://cdn02.plentyone.com/emoguafh21bo/item/images/20934/full/Home-Deluxe-Kratzbaum-Ruby-Schwarz-Ambiente01.jpg",
}

SAUNEN_URL = "https://www.homedeluxe.de/saunen-infrarotkabinen/"
SOFAS_URL = "https://www.homedeluxe.de/wohnen/wohnzimmer/sofas/"

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

# --- Texte (für HTML und Textversion; <b> = fett) ------------------------------------------
# Überschriften wie im Shop: Liste aus (Text, fett?)

TITLE = "🎃 Halloween-Edition: Finde den Clown!"
PREHEADER = "Psst … hinter dem Sofa bewegt sich was 🤡 Finde den Clown und wir schenken dir 50 € ab 500 € Bestellwert."
HERO_ALT = "Halloween-Special: Finde den Clown! Klick ihn an und sichere dir 50 € Gutschein"
HERO_IMG_ALT = "Ein Clown klettert hinter dem Sofa hervor und setzt sich – klick ihn an"
HERO_CTA = dict(text="Klick auf den Clown – dann öffnet sich im Shop dein Gutschein: <b>50&nbsp;€</b> auf deine Bestellung ab 500&nbsp;€.**",
                cta="ZUM CLOWN", note=f"**Nur bis {VALID_UNTIL}. Alle Aktionsbedingungen findest du ganz unten.")
INTRO = dict(label="HALLOWEEN BEI HOME DELUXE", heading=[("Gemütlich", True), (" durch die Gruselnacht", False)],
             text="Draußen gruselig, drinnen heiß: Sauna, Feuer &amp; Kuschelplätze für lange Herbstabende – "
                  "direkt vom Hersteller, kostenlos geliefert*.")
WELLNESS = dict(heading=[("Wellness", True), (" für die Geisternacht", False)], more=("Alle Saunen", SAUNEN_URL), tiles=[
    dict(key="lahti", src=SHOP_IMG["lahti"], badge="SCHWITZEN STATT SCHAUDERN", name="LAHTI XL",
         sub="Outdoor Fasssauna · inkl. 8 kW Saunaofen · ideal für 4–6 Personen"),
    dict(key="skandi", src=SHOP_IMG["skandi"], badge="DEIN EIGENER HEXENKESSEL", name="SKANDI M",
         sub="Hot Tub · holzbefeuert, kein Strom nötig · Ø 180 cm für bis zu 4 Personen"),
])
FIRE = dict(label="MADE IN GERMANY", heading=[("Lagerfeuer", True), (" für Gruselgeschichten", False)],
            text="Feuerschale und Holzlager in einem – in Handarbeit in Deutschland hergestellt.",
            usps=[("HANDARBEIT", "Hergestellt in Deutschland"), ("2 IN 1", "Feuerschale und Holzlager"), ("WETTERFEST", "Für draußen gemacht")],
            cards=[dict(key="frank", src=SHOP_IMG["frank_frei"], badge="MADE IN GERMANY", name="FEUERSCHALE FRANK", sub="mit Holzlager · Edelrost-Patina"),
                   dict(key="swing", src=SHOP_IMG["swing_frei"], badge="MADE IN GERMANY", name="GARTENFEUER SWING", sub="mit Holzlager · variabel aufstellbar")])
MOVIE = dict(heading=[("Gruselfilm", True), ("-Abend", False)], more=("Alle Sofas", SOFAS_URL),
             tile=dict(key="casara", src=SHOP_IMG["casara"], badge="FÜR DEN FILMABEND", name="CASARA",
                       sub="Sofa · Webstoff Dunkelgrün · 258 × 128 × 72 cm · weich genug zum Reinkuscheln"))
MORE = dict(heading=[("Noch mehr ", False), ("Gänsehaut", True), ("-Momente", False)], tiles=[
    dict(key="calor", src=SHOP_IMG["calor"], badge="KAMINFEUER", name="ELEKTROKAMIN CALOR", sub="Flammeneffekt, inkl. Fernbedienung"),
    dict(key="dunes", src=SHOP_IMG["dunes"], badge="ZERO GRAVITY", name="MASSAGESESSEL DUNES", sub="12 Programme, Heizfunktion"),
    dict(key="dubi", src=SHOP_IMG["dubi"], badge="SPIEGLEIN, SPIEGLEIN", name="LED-SPIEGEL DUBI", sub="Ø 80 cm, 3 Lichtfarben, dimmbar"),
    dict(key="ruby", src=SHOP_IMG["ruby"], badge="FÜR SCHWARZE KATZEN", name="KRATZBAUM RUBY", sub="Schwarz, 100 cm hoch, inkl. Spielzeug"),
])
CLOSING = dict(heading=[("Happy ", False), ("Halloween!", True)],
               text="Noch nicht geklickt? Der Clown wartet ganz oben auf dem Sofa – mit 50&nbsp;€ für deine Bestellung.",
               cta="ZUM CLOWN")
CONDITIONS = ("**Aktionsbedingungen Halloween-Suchspiel: Den Gutscheincode über 50&nbsp;€ erhältst du, "
              "wenn du in diesem Newsletter auf den Clown klickst. Einlösbar auf homedeluxe.de ab einem Bestellwert von "
              f"500&nbsp;€ (inkl. MwSt.) bis zum {VALID_UNTIL}, 23:59 Uhr. Einmal pro Kunde einlösbar, nicht mit anderen Gutscheinen "
              "oder Aktionen kombinierbar, keine Barauszahlung.")
SHIPPING = "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt."
# nur Textversion
TEXT_HERO = "HALLOWEEN-SPECIAL – FINDE DEN CLOWN & SICHERE DIR 50 €"
TEXT_GAME = ("Psst … hinter dem Sofa bewegt sich was: Ein Clown hat es sich bei uns gemütlich gemacht. Klick ihn an – "
             "dann öffnet sich dein Gutschein: 50 € auf deine Bestellung ab 500 €.**")

SECTION_END = '<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></div></td></tr></table>'


def utm(url):
    return f"{url}?{UTM}"


# --- Export auslesen ---------------------------------------------------------------------

A_TAG = r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>'


def plain(s):
    """HTML-Schnipsel -> Text: Umbrüche werden Leerzeichen, Tags fallen weg, Entities aufgelöst."""
    s = re.sub(r"\s*<br\s*/?>\s*", " ", s)
    return " ".join(htmllib.unescape(re.sub(r"<[^>]+>", "", s)).replace("\xa0", " ").split())


def from_export(src):
    parts = src.split(SECTION_END)
    if len(parts) != 19 or "BAD" not in parts[1] or "Bleibe in Verbindung" not in parts[15]:
        sys.exit("Aufbau des JUNE-Exports hat sich geändert – Abschnitte prüfen")
    fix = lambda u: u.replace("utm_campaign=KW43&", f"utm_campaign={CAMPAIGN}&")
    footer = parts[17]
    disclaimer = next(p for p in re.findall(r"<p\b[^>]*>(.*?)</p>", footer, re.S) if "Diese E-Mail wird" in p)
    contact = re.search(A_TAG, disclaimer, re.S)
    return dict(
        home=fix(re.search(r'<a [^>]*href="([^"]+)"', parts[0]).group(1)),
        nav=[(plain(t), fix(u)) for u, t in re.findall(A_TAG, parts[1], re.S) if plain(t)],
        social=[(re.search(r'alt="([^"]+)"', t).group(1), fix(u)) for u, t in re.findall(A_TAG, parts[15], re.S)],
        usps=[plain(t).rstrip(" ✓") for t in re.split(r"✓", plain(parts[16])) if plain(t)],
        disclaimer=plain(disclaimer.split("*Kostenloser")[0].replace(contact.group(0), "§LINK§")),
        contact=(plain(contact.group(2)), fix(contact.group(1))),
        legal=[(plain(t), fix(u)) for u, t in re.findall(A_TAG, footer, re.S) if plain(t) and plain(t) != plain(contact.group(2))],
        trusted=(fix(re.findall(A_TAG, footer, re.S)[-1][0]), re.search(r'src="([^"]+352cb1[^"]+)"', footer).group(1)),
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


def heading_html(parts, color=NAVY, size=24, align="left"):
    spans = "".join(f'<span style="font-weight:{700 if b else 400};">{t}</span>' for t, b in parts)
    return (f'<h2 class="h2" style="margin:0;font-family:{FONT};font-size:{size}px;line-height:{round(size * 1.25)}px;'
            f'color:{color};text-align:{align};font-weight:400;">{spans}</h2>')


def p(text, size=14, color=NAVY, align="left", extra=""):
    return (f'<p style="margin:0;font-family:{FONT};font-size:{size}px;line-height:{round(size * 1.55)}px;'
            f'color:{color};text-align:{align};{extra}">{text}</p>')


def gap(h):
    return f'<div style="height:{h}px;line-height:{h}px;font-size:1px;">&nbsp;</div>'


def badge(text):
    return (f'<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td bgcolor="{ORANGE}" '
            f'style="background:{ORANGE};padding:3px 6px;font-family:{FONT};font-size:11px;line-height:15px;font-weight:600;'
            f'color:#ffffff;letter-spacing:.3px;">{text}</td></tr></table>')


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


def section_head(parts, more=None, color=NAVY, label=None):
    left = (p(label, 11, ORANGE, extra="font-weight:600;letter-spacing:2px;padding-bottom:4px;") if label else "") + heading_html(parts, color)
    right = (f'<a href="{utm(more[1])}" target="_blank" style="font-family:{FONT};font-size:12px;color:{color};'
             f'text-decoration:underline;white-space:nowrap;">{more[0]} ›</a>') if more else ""
    return ('<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>'
            f'<td valign="bottom" style="padding:0;">{left}</td>'
            f'<td valign="bottom" align="right" style="padding:0 0 4px 12px;">{right}</td></tr></table>')


def wide_tile(t):
    """Breite Produktkachel: Bild, darunter Badge, Name, Merkmale links – Preis und Button rechts."""
    name, url, price = P[t["key"]]
    return (
        img(t["src"], name, 592, utm(url))
        + '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>'
        f'<td class="stack" valign="top" style="padding:14px 12px 0 0;">{badge(t["badge"])}'
        + p(t["name"], 18, NAVY, extra="font-weight:700;padding-top:8px;")
        + p(t["sub"], 12, MUTED, extra="padding-top:2px;") + '</td>'
        '<td class="stack" valign="top" width="190" style="width:190px;padding:14px 0 0 0;">'
        + p(f'{price}&nbsp;€', 22, NAVY, "right", "font-weight:700;padding-bottom:8px;")
        + button(utm(url), "ARTIKEL ANZEIGEN", align="right")
        + '</td></tr></table>'
    )


def small_tile(t, card=False):
    """Kachel im 2er-Raster wie in den Kategorien auf homedeluxe.de."""
    name, url, price = P[t["key"]]
    border = f"border:1px solid {LINE};" if card else ""
    pad = "10px" if card else "0"
    return (
        f'<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background:#ffffff;{border}">'
        f'<tr><td style="padding:{pad} {pad} 0;">' + img(t["src"], name, 280, utm(url)) + '</td></tr>'
        f'<tr><td style="padding:12px {pad} 16px;">' + badge(t["badge"])
        + p(t["name"], 13, NAVY, extra="font-weight:700;padding-top:8px;")
        + p(t["sub"], 12, MUTED, extra="padding-top:2px;height:38px;")
        + p(f'{price}&nbsp;€', 18, NAVY, extra="font-weight:700;padding:6px 0 10px;")
        + button(utm(url), "ARTIKEL ANZEIGEN", full=True)
        + '</td></tr></table>'
    )


def two_cols(a, b, space=16):
    return ('<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>'
            f'<td width="50%" valign="top" style="width:50%;padding-right:{space // 2}px;">{a}</td>'
            f'<td width="50%" valign="top" style="width:50%;padding-left:{space // 2}px;">{b}</td></tr></table>')


def transition(src):
    return row(img(src, "", 640))


# --- Abschnitte --------------------------------------------------------------------------

def header(ex):
    usps = "&nbsp;&nbsp;&nbsp;".join(f"✓&nbsp;{u}" for u in ex["usps"])
    nav = "".join(
        f'<td align="center" style="padding:12px 4px;"><a href="{u}" target="_blank" style="font-family:{FONT};font-size:13px;'
        f'font-weight:500;color:{SALE if t.upper().startswith("SALE") else NAVY};text-decoration:none;">'
        f'{"Sale%" if t.upper().startswith("SALE") else t.capitalize()}</a></td>' for t, u in ex["nav"])
    return (
        row(p(usps, 11, NAVY, "center"), bg=LINE, pad="7px 16px", cls="topbar")
        + row(f'<a href="{ex["home"]}" target="_blank" style="display:block;width:230px;margin:0 auto;">'
              f'<img src="{src_url("logo_weiss.png")}" width="230" alt="Home Deluxe" style="display:block;width:230px;height:auto;border:0;margin:0 auto;"></a>',
              bg=NAVY, pad="22px 20px")
        + row(f'<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="nav"><tr>{nav}</tr></table>',
              bg=GREY, pad="0 10px")
    )


def hero():
    gif = os.path.exists(os.path.join(PROJECT, "output", "images", "hero_clown.gif"))
    return (
        row(img("hero_kopf.jpg", HERO_ALT, 640, CLOWN_URL), bg=NAVY)
        + row(img("hero_clown.gif" if gif else "hero_clown.jpg", HERO_IMG_ALT, 640, CLOWN_URL), bg=NAVY)
        + row(p(rich(HERO_CTA["text"]), 15, "#ffffff", "center") + gap(18)
              + button(CLOWN_URL, HERO_CTA["cta"], ORANGE, NAVY, "center")
              + p(HERO_CTA["note"], 11, NIGHT_TEXT, "center", "padding-top:14px;clear:both;"),
              bg=NAVY, pad="4px 40px 26px", cls="px")
    )


def intro():
    return row(p(INTRO["label"], 11, ORANGE, "center", "font-weight:600;letter-spacing:2px;padding-bottom:6px;")
               + heading_html(INTRO["heading"], NAVY, 26, "center")
               + p(INTRO["text"], 14, NAVY, "center", "padding-top:10px;")
               + gap(20) + button(utm(SAUNEN_URL), "ALLE SAUNEN ENTDECKEN", align="center"),
               pad="6px 48px 34px", cls="px")


def wellness():
    tiles = gap(30).join(wide_tile(t) for t in WELLNESS["tiles"])
    return row(section_head(WELLNESS["heading"], WELLNESS["more"]) + gap(16) + tiles, pad="0 24px 10px", cls="px")


def fire():
    name, url, _ = P["swing"]

    def usp(h, t):
        return ('<td width="33%" valign="top" style="width:33%;padding:0 5px;">'
                '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>'
                f'<td style="border-top:3px solid {ORANGE};padding-top:10px;text-align:center;">'
                + p(h, 11, "#ffffff", "center", "font-weight:700;letter-spacing:1px;")
                + p(t, 12, NIGHT_TEXT, "center", "padding-top:2px;") + '</td></tr></table></td>')
    return row(
        section_head(FIRE["heading"], color="#ffffff", label=FIRE["label"])
        + p(FIRE["text"], 14, NIGHT_TEXT, extra="padding:8px 0 18px;")
        + img(SHOP_IMG["swing_amb"], f"{name} mit Holzlager im Garten", 592, utm(url))
        + '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 0;">'
        + '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>'
        + "".join(usp(*u) for u in FIRE["usps"]) + '</tr></table></td></tr></table>'
        + two_cols(*(small_tile(c, card=True) for c in FIRE["cards"])),
        bg=NAVY, pad="0 24px 30px", cls="px")


def movie():
    return row(section_head(MOVIE["heading"], MOVIE["more"]) + gap(16) + wide_tile(MOVIE["tile"]), pad="14px 24px 40px", cls="px")


def more():
    a, b, c, d = MORE["tiles"]
    return row(section_head(MORE["heading"]) + gap(16) + two_cols(small_tile(a), small_tile(b)) + gap(26)
               + two_cols(small_tile(c), small_tile(d)), pad="0 24px 6px", cls="px")


def closing():
    return row(heading_html(CLOSING["heading"], "#ffffff", 30, "center")
               + p(rich(CLOSING["text"]), 15, NIGHT_TEXT, "center", "padding:10px 0 20px;")
               + button(CLOWN_URL, CLOSING["cta"], ORANGE, NAVY, "center"),
               bg=NAVY, pad="0 40px 36px", cls="px")


def footer(ex):
    icons = "".join(f'<td style="padding:0 14px;"><a href="{u}" target="_blank"><img src="{src_url(f"social_{n.lower()}.png")}" width="30" alt="{n}" '
                    'style="display:block;width:30px;height:30px;border:0;"></a></td>' for n, u in ex["social"])
    usps = "&nbsp;&nbsp;·&nbsp;&nbsp;".join(f"{u}&nbsp;✓" for u in ex["usps"])
    contact = f'<a href="{ex["contact"][1]}" target="_blank" style="color:#ffffff;text-decoration:underline;">{ex["contact"][0]}</a>'
    legal = "&nbsp;&nbsp;|&nbsp;&nbsp; ".join(f'<a href="{u}" target="_blank" style="color:#ffffff;text-decoration:underline;">{t}</a>' for t, u in ex["legal"])
    small = lambda t, extra="": p(t, 11, NIGHT_TEXT, "center", extra)
    return row(
        '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #1c3a54;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>'
        + p("Bleibe in Verbindung mit uns", 13, "#ffffff", "center", "padding:22px 0 12px;")
        + f'<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center"><tr>{icons}</tr></table>'
        + p(usps, 12, "#ffffff", "center", "padding:22px 0 18px;clear:both;")
        + small(ex["disclaimer"].replace("§LINK§", contact))
        + small(SHIPPING, "padding-top:10px;") + small(CONDITIONS, "padding-top:10px;")
        + small(legal, "padding-top:18px;line-height:22px;")
        + f'<a href="{ex["trusted"][0]}" target="_blank" style="display:block;width:40px;margin:20px auto 0;">'
          f'<img src="{ex["trusted"][1]}" width="40" alt="Trusted Shops" style="display:block;width:40px;height:auto;border:0;"></a>',
        bg=NAVY, pad="0 36px 34px", cls="px")


def build(src):
    ex = from_export(src)
    rows = [
        header(ex), hero(), transition("ueb_tropfen.png"), intro(), wellness(),
        transition("ueb_nebel.png"), fire(), transition("ueb_aeste.png"), movie(), more(),
        transition("ueb_kuerbisse.png"), closing(), footer(ex),
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
  @media screen and (max-width:640px) {{
    .px {{ padding-left:18px !important; padding-right:18px !important; }}
    .stack {{ display:block !important; width:100% !important; padding-right:0 !important; }}
    .stack p {{ text-align:left !important; }}
    .stack table {{ float:none !important; }}
    .h2 {{ font-size:21px !important; line-height:27px !important; }}
    .nav a {{ font-size:11px !important; }}
    .topbar p {{ font-size:9px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{GREY};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{GREY};opacity:0;">{PREHEADER}{filler}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="{GREY}" style="background:{GREY};">
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


def text_heading(parts):
    return "".join(t for t, _ in parts).upper()


def text_tile(t):
    name, url, price = P[t["key"]]
    return para(t["badge"], t["name"], t["sub"], f"{price} €") + "\n" + text_link("ARTIKEL ANZEIGEN", utm(url))


def build_text(src):
    ex = from_export(src)
    rule = "-" * WIDTH
    blocks = [
        para(PREHEADER),
        text_link("HOME DELUXE – Wir machen dein Zuhause", ex["home"]),
        "=" * WIDTH + "\n" + TEXT_HERO + "\n" + "=" * WIDTH,
        para(TEXT_GAME) + "\n\n" + text_link(HERO_CTA["cta"], CLOWN_URL) + "\n\n" + para(HERO_CTA["note"]),
        rule,
        para(INTRO["label"], text_heading(INTRO["heading"]), INTRO["text"]) + "\n\n" + text_link("ALLE SAUNEN ENTDECKEN", utm(SAUNEN_URL)),
        rule,
        text_heading(WELLNESS["heading"]), *(text_tile(t) for t in WELLNESS["tiles"]),
        rule,
        para(FIRE["label"], text_heading(FIRE["heading"]), FIRE["text"]) + "\n\n"
        + "\n".join(f"✓ {h.capitalize()}: {t}" for h, t in FIRE["usps"]),
        *(text_tile(c) for c in FIRE["cards"]),
        rule,
        text_heading(MOVIE["heading"]), text_tile(MOVIE["tile"]),
        rule,
        text_heading(MORE["heading"]), *(text_tile(t) for t in MORE["tiles"]),
        "=" * WIDTH + "\n" + para(text_heading(CLOSING["heading"]), CLOSING["text"]) + "\n" + CLOWN_URL + "\n" + "=" * WIDTH,
        "Bleibe in Verbindung mit uns\n" + "\n".join(f"{n}: {u}" for n, u in ex["social"]),
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
        out = os.path.join(PROJECT, "output", name)
        open(out, "w", encoding="utf-8").write(content)
        print(out)


if __name__ == "__main__":
    main()
