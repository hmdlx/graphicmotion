"""KW43-Newsletter „New Ins“ in die Halloween-Edition mit Clown-Suchspiel umbauen.

    python3 -I scripts/build_newsletter.py <projekt>

Liest source/newsletter-new-ins-kw43.html (JUNE-Export) und schreibt
output/newsletter-halloween-kw44.html. Jede Ersetzung prüft, dass ihr Ausgangstext genau so
oft vorkommt wie erwartet, damit ein geänderter Export nicht still durchrutscht.

Bilder werden relativ eingebunden (images/…). Vor dem Versand in JUNE hochladen, dann
ersetzt JUNE die Pfade durch CDN-URLs.
"""
import os
import sys

CAMPAIGN = "KW44_Halloween"
UTM = f"utm_campaign={CAMPAIGN}&utm_source=newsletter&utm_medium=email"
# Ziel des Clowns: Landingpage mit Gutscheincode (Vorlage: output/landingpage-clown-gefunden.html)
CLOWN_URL = f"https://www.homedeluxe.de/halloween-clown/?{UTM}&utm_content=clown"
CARPORT_URL = f"https://www.homedeluxe.de/garten-carports/carport-freistehend-monos_30038_75568/?{UTM}"
VALID_UNTIL = "02.11.2026"
NAVY, ORANGE = "#0e2234", "#ef7d1a"

SECTION_END = '<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></div></td></tr></table>'


def replace(s, old, new, count=1):
    n = s.count(old)
    if n != count:
        sys.exit(f"erwartet {count}× im Export, gefunden {n}×: {old[:80]!r}")
    return s.replace(old, new)


def section(inner, bg="#FFFFFF"):
    """Eine volle Newsletter-Zeile im Aufbau des JUNE-Exports (640 px, MSO-Ghost-Table)."""
    return (
        f' <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fff!important;border-collapse:collapse;border-spacing:0;font-size:0;line-height:0;margin:0;width:100%;" bgcolor="#FFFFFF">'
        f'<tr><td align="center" class="xb" style="margin:0 auto;padding:0;"><div style="max-width:640px;">'
        f'<!--[if (gte mso 9)|(IE)]><table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0;width:640px;" width="640"><tr><td style="margin:0;"><![endif]-->'
        f'<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:{bg};border-collapse:separate;border-spacing:0;max-width:640px;width:100%;" role="presentation" bgcolor="{bg}">'
        f'<tr><td valign="top" style="font-size:1px;line-height:1px;margin:0;"><div>{inner}</div></td></tr></table>'
        + SECTION_END
    )


def img_cell(src, width, alt, href, pct=100):
    return (
        f'<td width="{pct}%" valign="top" style="font-size:0;line-height:0;padding:0;width:{pct}%;">'
        f'<a href="{href}" target="_blank" data-trigger-action-id="#{{image.actionTriggerId}}" style="display:block;">'
        f'<img border="0" src="images/{src}" alt="{alt}" width="{width}" style="display:block;width:100%;height:auto;border:0;"></a></td>'
    )


def row_table(cells):
    return (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" '
        f'style="border-collapse:collapse;border-spacing:0;width:100%;"><tr>{cells}</tr></table>'
    )


def game_section():
    p = "font-family:Verdana,Geneva,sans-serif;letter-spacing:0;margin:0;text-align:center;"
    inner = (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-spacing:0;width:100%;">'
        '<tr><td style="font-size:0;line-height:0;padding:0;">'
        '<img border="0" src="images/teaser_finde-den-clown.jpg" width="640" '
        'alt="Halloween-Suchspiel: Finde den Clown – 50 € Gutschein ab 500 € Bestellwert, nur bis ' + VALID_UNTIL + '" '
        'style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr>'
        '<tr><td style="padding:6px 30px 34px 30px;">'
        f'<p style="{p}font-size:15px;line-height:24px;color:#ffffff;">'
        'Irgendwo in diesem Newsletter hat sich ein <strong style="font-weight:700;">Clown</strong> versteckt. '
        'Halte beim Scrollen die Augen offen und <strong style="font-weight:700;">klick ihn an</strong>, sobald du ihn entdeckst – '
        f'dann schenken wir dir <strong style="font-weight:700;color:{ORANGE};">50&nbsp;€</strong> auf deine Bestellung ab 500&nbsp;€.**</p>'
        f'<p style="{p}font-size:11px;line-height:17px;color:#9fb0bf;padding-top:12px;">'
        f'**Nur bis {VALID_UNTIL}. Alle Aktionsbedingungen findest du ganz unten.</p>'
        '</td></tr></table>'
    )
    return section(inner, NAVY)


def carport_slices():
    """Je Bildzeile eine eigene Tabelle (kein colspan), Spalten 55/20/25 % wie in build_images.py."""
    return (
        row_table(img_cell("carport_monos_1.jpg", 640, "Carport MONOS", CARPORT_URL))
        + row_table(
            img_cell("carport_monos_2.jpg", 352, "", CARPORT_URL, 55)
            + img_cell("carport_monos_clown.jpg", 128, "Clown gefunden? Hier klicken", CLOWN_URL, 20)
            + img_cell("carport_monos_3.jpg", 160, "", CARPORT_URL, 25))
        + row_table(img_cell("carport_monos_4.jpg", 640, "", CARPORT_URL))
    )


def build(s):
    s = replace(s, "utm_campaign=KW43&", f"utm_campaign={CAMPAIGN}&", 54)
    s = replace(s, "<title>✨ New Ins: Sauna &amp; Infrarot in einer Kabine</title>",
                "<title>🎃 Halloween-Edition: Finde den Clown!</title>")
    s = replace(s, "Kombisauna EVEREST, Whirlpool SUNSHINE &amp; 7 weitere Neuheiten – kostenlos geliefert*.",
                "Psst … in dieser Mail versteckt sich ein Clown 🤡 Finde ihn und wir schenken dir 50 € ab 500 € Bestellwert.")

    # Hero
    s = replace(s, 'src="https://homedeluxe-bf09.kxcdn.com/50bc702dfcf235840c29a5c110b47206.jpg" alt="New Ins bei Home Deluxe: Kombisauna EVEREST"',
                'src="images/hero_halloween.jpg" alt="Halloween bei Home Deluxe – finde den Clown und sichere dir 50 €. Kombisauna EVEREST"')

    # Intro
    s = replace(s, "✨ New Ins bei Home Deluxe ✨</strong><br />Gemacht für die kalte Jahreszeit",
                "🎃 Halloween bei Home Deluxe 🎃</strong><br />Schaurig schöne Neuheiten für die dunkle Jahreszeit")
    s = replace(s, "Draußen frisch, drinnen heiß.", "Draußen gruselig, drinnen heiß.")

    # Suchspiel direkt nach dem Intro (3. Zeile nach Header und Navigation)
    parts = s.split(SECTION_END)
    if len(parts) != 19 or "Draußen gruselig" not in parts[3]:
        sys.exit("Aufbau des Exports hat sich geändert – Suchspiel-Position prüfen")
    parts[3] += SECTION_END + game_section()
    s = SECTION_END.join(parts)

    # kleine Halloween-Töne in der Produkt-Copy
    s = replace(s, "Ganzjährig baden – auch bei Frost.", "Ganzjährig baden – auch in der Geisternacht.")

    # Carport MONOS: Clown-Versteck, Bild in Slices
    old_img = (
        f'<a href="{CARPORT_URL}" class="yd" target="_blank" data-trigger-action-id="#{{image.actionTriggerId}}" style="display:inline-block;">'
        '<img class="yd" border="0" src="https://homedeluxe-bf09.kxcdn.com/e6dc993c6bb222c25d202e3e3f82b0b1.jpg" alt="Carport MONOS" '
        'width="640" height="640" loading="lazy" decoding="async" style="max-width:100%;height:auto;"></a>'
    )
    s = replace(s, old_img, carport_slices())

    # Navy-Band unten: Erinnerung + (Nicht-)Tipp
    white = '<span style="color:rgb(255,255,255);letter-spacing:0px;">'
    s = replace(s, f'<strong style="font-weight:700;">{white}Neu im Shop. Direkt vom Hersteller.<br />Kostenlos geliefert*.<br /><br /></span></strong>',
                f'<strong style="font-weight:700;">{white}Happy Halloween! 🎃</span></strong><br />'
                f'{white}Schon den Clown gefunden? Kleiner Tipp:<br />Er versteckt sich irgendwo zwischen Sauna und Mülltonne.<br /><br /></span>')

    # Aktionsbedingungen im Footer
    s = replace(s, "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt.</span>",
                "*Kostenloser Versand innerhalb Deutschlands - ausgeschlossen Inseln. Alle Preise in Euro inkl. MwSt.</span>"
                '<br /><br /><span style="color:#ffffff;">**Aktionsbedingungen Halloween-Suchspiel: Den Gutscheincode über 50&nbsp;€ erhältst du, '
                "wenn du den in diesem Newsletter versteckten Clown anklickst. Einlösbar auf homedeluxe.de ab einem Bestellwert von "
                f"500&nbsp;€ (inkl. MwSt.) bis zum {VALID_UNTIL}, 23:59 Uhr. Einmal pro Kunde einlösbar, nicht mit anderen Gutscheinen "
                "oder Aktionen kombinierbar, keine Barauszahlung.</span>")
    return s


def main():
    project = sys.argv[1]
    src = open(os.path.join(project, "source", "newsletter-new-ins-kw43.html"), encoding="utf-8").read()
    out = os.path.join(project, "output", "newsletter-halloween-kw44.html")
    open(out, "w", encoding="utf-8").write(build(src))
    print(out)


if __name__ == "__main__":
    main()
