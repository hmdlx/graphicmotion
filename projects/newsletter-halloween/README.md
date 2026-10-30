# Newsletter Halloween-Edition (KW44)

Halloween-Newsletter im Look von homedeluxe.de mit Clown-Aktion: Im Hero-GIF kommt ein Clown
im Home-Deluxe-Hoodie hinter dem Sofa hervor und setzt sich. Wer auf ihn klickt, landet auf der
Halloween-Seite https://www.homedeluxe.de/halloween/. Dort versteckt er sich in einem Produktbild;
ein Klick auf ihn öffnet das Pop-up mit dem Gutscheincode – **50 € ab 500 € Bestellwert**.

Zum Ansehen und Weitergeben: `output/vorschau/newsletter-halloween-kw44_vorschau.html` und
`output/vorschau/clown-popup_vorschau.html` – alle Bilder eingebettet, das Pop-up ist sofort offen.
Screenshots: `output/preview/`.

Die Versand-Datei `output/newsletter-halloween-kw44.html` (rund 75 KB) bindet alle Bilder von CDNs
ein (Produktfotos vom Shop, alles andere von JUNE) und zeigt sie deshalb auch einzeln geöffnet.
Ändert sich eine eigene Grafik, wird sie wieder relativ (`images/…`) eingebunden, bis die neue
Adresse in `source/cdn-urls.json` steht; solange baut `halloween:vorschau` zusätzlich
`output/newsletter-halloween-kw44_mit-bildern.zip` (HTML + Bilderordner) zum Prüfen.

## Gestaltung (CI von homedeluxe.de)

Die Werte stammen aus dem CSS des Shops (`--primary`, Badge-Farben, Schrift):

| Element | im Newsletter |
|---|---|
| Navy `#0e2234` | Hero, Nacht-Abschnitte, Footer, Buttons |
| Orange `#ff9800` (TOPSELLER-Badge im Shop) | Badges, „CLOWN“, Buttons „ZUM CLOWN“, Kürbisse |
| Poppins, Überschriften fett + normal („**Nach Kategorie** shoppen“) | „**Wellness** für die Geisternacht“ usw. |
| eckige Ecken, Buttons „Artikel anzeigen“ | Produktkacheln |

Kopf (Logo, Navigation BAD · SAUNEN · WOHNEN · GARTEN · SALE) und Footer (Social-Leiste, USP-Leiste,
Hinweis, Rechtslinks, Trusted Shops) kommen unverändert aus dem JUNE-Export – wie in der
SPUK10-Version (`projects/newsletter-halloween-spuk10`, Branch `claude/epic-ride-aylhjp`). Die
Aktionsbedingungen stehen im Footer unter dem Versandhinweis. Die CSS-Regeln des Exports gelten nur
für diese Blöcke (Klasse `june`), damit sie die Poppins-Inhalte nicht auf Verdana/12 px setzen.

Nacht (Navy) und Tag (Weiß) wechseln sich ab; die Übergänge sind Halloween-Grafiken
(`graphics/uebergaenge.html`): tropfendes Navy, aufsteigender Nebel, hängende Äste mit Spinne,
Hügel mit leuchtenden Kürbissen. Der Hero blendet aus dem Nachthimmel (Mond, Fledermäuse) auf
und läuft wieder in Navy aus. Darunter führt der Gutschein-Teaser (`graphics/teaser.html`) die Nacht
weiter wie in der SPUK10-Version: oben reines Navy, Spinnennetz und Fledermäuse, „Süßes oder
Saures?“ mit dem 50-€-Gutschein (ohne Code – der steht erst im Pop-up), unten leuchtende Kürbisse,
dann Text und Button „ZUM CLOWN“. Kürbisse, Fledermäuse und Netz kommen aus `graphics/halloween.js`
(übernommen aus der SPUK10-Version).

## Hero-GIF

1. `source/hero/wohnzimmer-clown-hoodie.webp` – Bild mit dem sitzenden Clown (Vorgabe).
2. Startbild ohne Clown und Ballon: per KI (Nano Banana 2.1 über Higgsfield) entfernt; übernommen
   wurde nur der Bereich um den Clown, der Rest ist das Original, damit Start und Ende deckungsgleich sind.
3. Video vom leeren Sofa bis zum Vorgabebild (FLUX 3 Video über Higgsfield, 5 s, 720p):
   `source/hero/clown-hervor.mp4`.
4. `build_images.py` macht daraus `hero_clown.gif` (640 × 320 px, 10 fps, 128 Farben, rund 400 KB,
   Navy-Verlauf oben/unten): Clown sitzt → verblasst wie ein Geist → leeres Sofa → er kommt
   hinter dem Sofa hervor und setzt sich. Das erste Bild zeigt den sitzenden Clown, weil Outlook
   für Windows nur das erste Bild eines GIFs anzeigt.
5. Komprimierung: Das KI-Video rauscht leicht im ganzen Bild, das GIF müsste sonst fast jedes Bild
   komplett speichern (1,8 MB). Außerhalb des Bereichs, in dem sich der Clown bewegt, wird deshalb
   der Hintergrund eingefroren (`motion_mask`, weiche Kante); das GIF speichert pro Bild nur noch
   den Clown-Ausschnitt. Stellschrauben oben im Skript: `GIF_FPS`, `GIF_COLORS`, `GIF_MOTION_X`.

## Klick → Halloween-Seite

- Hero-Kopf, Hero-GIF, Gutschein-Teaser und die beiden Buttons „ZUM CLOWN“ verlinken auf
  `https://www.homedeluxe.de/halloween/?utm_campaign=KW44_Halloween&…&utm_content=clown`.
- Die Halloween-Seite (`landingpages/halloween-clown/`, Branch `claude/sharp-mendel-yx9yar`) führt
  die Geschichte weiter („Eben noch auf dem Sofa. Jetzt steckt er in einem unserer Produktbilder.“)
  und hat ein eigenes Pop-up mit dem Code `CLOWN50`.
- Der Newsletter enthält bewusst kein `halloween=clown` mehr (`build_newsletter.py` bricht sonst ab):
  das Shop-Pop-up unten würde sich sonst sofort öffnen und die Suche auf der Seite verraten.
- Nicht mehr nötig, nur noch als Reserve: `output/popup/clown-popup.html` enthält einen Block für den Shop (zwischen
  `HD-CLOWN-POPUP START` und `ENDE`): Er bleibt unsichtbar, bis die Adresse `halloween=clown`
  enthält, zeigt dann Code, „Code kopieren“ und Bedingungen und schließt per ×, Klick daneben
  oder Esc. Nach dem 02.11.2026, 23:59 Uhr zeigt er statt des Codes „Huch, zu spät!“.
- Ein Pop-up direkt in der E-Mail ist technisch nicht möglich (Mail-Programme führen kein
  JavaScript aus), deshalb öffnet es sich im Shop.

## Inhalt

| Block | Produkt | Bild | Preis |
|---|---|---|---|
| Hero „HALLOWEEN-SPECIAL – Finde den Clown“ | Klick öffnet das Gutschein-Pop-up | Hero-Kopf, GIF | – |
| Teaser „Süßes oder Saures?“ (Navy) | 50-€-Gutschein ab 500 €, Text, Button „ZUM CLOWN“ | Grafik | – |
| „**Wellness** für die Geisternacht“ | Fasssauna LAHTI XL · Infrarotkabine NERO M | Shopfotos | 2.599 € · 1.349 € |
| „NEU IM SHOP – **Gespenstisch** schöne Neuheiten“ | LED-Wasserdampfkamin ODENA · LED-Bett MELURA · Couchtisch-Set LAMESA | Shopfotos, Freisteller (LAMESA) | 349 € · 399 € · 179 € |
| „**Gruselfilm**-Abend“ | Sofa CASARA Dunkelgrün | Shopfoto | 1.199 € |
| „Noch mehr **Gänsehaut**-Momente“ | Elektrokamin CALOR · Massagesessel DUNES · LED-Spiegel DUBI · Kratzbaum RUBY | Shopfotos | 329 € · 1.399 € · 139 € · 69 € |
| Navy-Band „Happy Halloween! 🎃“ (wie SPUK10, Block aus dem JUNE-Export) | Kürbisreihe, Erinnerung, Link „Halloween-Seite“ | Grafik | – |

Produktnamen, Links, Preise und Merkmale stammen von den Produktseiten auf homedeluxe.de
(Stand 30.10.2026) und stehen oben in `scripts/build_newsletter.py` (`P` und Abschnitt „Texte“).
Preise vor dem Versand gegenprüfen.

Die Produktfotos werden unverändert direkt vom Shop-CDN eingebunden (`cdn02.plentyone.com`,
`SHOP_IMG` im Skript) – sie müssen also nicht hochgeladen werden.

## Textversion

`output/newsletter-halloween-kw44.txt` ist der Plain-Text-Teil der Mail (UTF-8, Zeilen bis 72
Zeichen, URLs ungebrochen), gebaut aus denselben Texten wie das HTML. Der Clown steht dort als
Link „ZUM CLOWN:“. In JUNE prüfen, ob der Abmeldelink in der Textversion durch den
personalisierten Link bzw. Platzhalter ersetzt wird – im Export steht die feste Adresse
`…/newsletter/unsubscribe/?folderId=0`.

## Vor dem Versand festlegen

Vorschläge, oben in `scripts/build_newsletter.py` (Code, Datum und Ablaufzeit zusätzlich in
`output/popup/clown-popup.html` und `graphics/kopf.html`):

- **Gutscheincode** `CLOWN50` – im Shop anlegen: 50 € Rabatt, Mindestbestellwert 500 €, einmal pro Kunde.
- **Gültig bis** 02.11.2026, 23:59 Uhr. Achtung: Die Halloween-Seite nennt „gültig bis 31.12.2026“ –
  ein Datum festlegen und Newsletter (`VALID_UNTIL`, `graphics/teaser.html`) bzw. Seite angleichen.

## In JUNE übernehmen

Woher die Bilder kommen:

| Bilder | Quelle |
|---|---|
| Produktfotos | Shop-CDN, direkt verlinkt |
| Hero-GIF, Logo, Social-Icons, Trusted-Shops-Siegel | JUNE-CDN (`homedeluxe-bf09.kxcdn.com`) |
| eigene Grafiken (Hero-Kopf, Gutschein-Teaser, Übergänge, Kürbisreihe) | JUNE-CDN, Adressen in `source/cdn-urls.json` (JUNE speichert die PNG-Übergänge als JPG; Kanten geprüft) |

Wird eine eigene Grafik geändert: `npm run halloween:build` legt sie in `output/fuer-june-hochladen.zip`
(nur Grafiken ohne Eintrag in `source/cdn-urls.json` – den alten Eintrag dafür löschen), in JUNE
hochladen, neue Adresse eintragen und noch einmal bauen.
`hero_clown.jpg` ist nur das Standbild zum GIF und muss nicht hochgeladen werden. Poppins wird per
Google-Fonts-Link geladen (wie schon Montserrat im KW43-Export); Gmail zeigt stattdessen
Helvetica/Arial.

## Bauen

```bash
npm run halloween:build     # alles: Grafiken -> Bilder/GIF -> HTML + Text -> Vorschau + Prüfungen
```

| Skript | macht |
|---|---|
| `halloween:graphics` | `graphics/*.html` per Chromium -> `build/newsletter-halloween/graphics/*.png` (Hero-Kopf, Gutschein-Teaser, Übergänge, Kürbisreihe) |
| `halloween:images` | Hero-GIF und Standbild, Grafiken, Pop-up-Bild, ZIP der noch hochzuladenden Grafiken -> `output/` |
| `halloween:html` | Newsletter-HTML + Textversion; Kopf und Footer unverändert aus `source/newsletter-new-ins-kw43.html` |
| `halloween:preview` | Ganzseiten-Vorschau Desktop/Mobil, Pop-up-Vorschau; prüft die Clown-Links und das Pop-up mit/ohne `?halloween=clown` |
| `halloween:vorschau` | eigenständige Vorschau-HTMLs mit eingebetteten Bildern -> `output/vorschau/` (nicht für den Versand) |
