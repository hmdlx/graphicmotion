# Newsletter Halloween – Fallback mit Code SPUK10 (KW44)

Ersatz für die Clown-Edition (`projects/newsletter-halloween` auf Branch
`claude/tender-noether-hi9zre`), falls Landingpage und Pop-up nicht rechtzeitig laufen: kein
Suchspiel, kein Pop-up – alle Empfänger bekommen direkt den Code **SPUK10 = 10 % Rabatt**.

Aufbau wie die Clown-Edition (Hero mit Kopfband, Intro, Navy-Gutscheinblock, zwei große
Produkte, Made-in-Germany-Block mit USPs und Karten, drittes großes Produkt, zwei 2er-Raster,
Navy-Band, Footer aus dem JUNE-Export). Neu sind die Produkte, die Texte, Orange als Akzent und
die Halloween-Motive (Kürbisse, Fledermäuse, Spinne, Spinnennetz, Mond).

Zum Ansehen und Weitergeben: `output/vorschau/newsletter-halloween-spuk10_vorschau.html` (alle
Bilder eingebettet). Screenshots: `output/preview/`.

## Inhalt

| Block | Produkt | Bild | Preis |
|---|---|---|---|
| Hero „HALLOWEEN – 10 % Rabatt mit Code SPUK10“ | Klick → Infrarotkabine NERO | Kopfband mit Kürbissen + Shopfoto NERO im violetten Licht | – |
| Intro „Süßes oder Saures? Bei uns gibt’s Süßes.“ | CTA: Alle Saunen | – | – |
| Gutscheinblock (Navy) | Grafik „Süßes oder Saures?“ mit Gutschein 10 % / SPUK10, Code als echter Text im Kasten, Button „Jetzt 10 % sparen“ → Shop | Grafik | – |
| Hier knistert’s – aber nur im Ofen. | Fasssauna mit Holzofen LAGOM DELUXE | Shopfoto | 4.999 € |
| Schwarz wie ein Hexenkessel | Freistehende Badewanne CODO Schwarz | Shopfoto | 799 € |
| Kürbis-Trenner | – | Grafik | – |
| Holzvorrat für lange Gruselnächte | Holzlege ANTARES 3er-Set, USPs (Handarbeit, Edelrost, erweiterbar) | Shopfoto | – |
| Produktkarten | Holzlege ANTARES · Holzlager NANGA | Shopfotos mit Holz | 119 € · 299 € |
| Gruselfilm-Abend? | Modulares Sofa ORLENA (Samt Anthrazit) | Shopfoto | ab 349 € |
| Kürbis-Trenner | – | Grafik | – |
| Raster | Massagesessel ELVORA Schwarz · Hängesessel CIELO Schwarz | Shopfotos | 1.849 € · 199 € |
| Raster | Schaukelstuhl NARA · Home Deluxe Bademantel | Shopfotos | 129 € · 39 € |
| Navy-Band | Kürbisreihe, „Happy Halloween! Nicht vergessen: Mit dem Code SPUK10 …“ | Grafik + Text | – |

Kein Produkt aus der Clown-Edition (LAHTI XL, SKANDI M, FRANK, SWING, CASARA, CALOR, DUNES, DUBI,
RUBY) und keins aus KW43 (EVEREST, SUNSHINE, MONOS …). Namen, Links, Preise und Merkmale stammen
von den Produktseiten auf homedeluxe.de (Stand 30.10.2026, alle lieferbar) und stehen gesammelt
oben in `scripts/build_newsletter.py` (`P`). Preise vor dem Versand gegenprüfen. Bei NERO und
ORLENA steht der günstigste Variantenpreis („ab“). Die Produktfotos sind unverändert; Kürbisse und
andere Motive gibt es nur in den Grafiken, ganz ohne KI-Bilder.

Farben: CI-Navy `#0e2234`, Weiß, Grautöne. Akzent ist das Orange der Shop-Badges `#FF9800`
(Flächen, Code, USP-Linien, Schrift auf Navy, Kontrast 7,5:1); orange Schrift auf Weiß in
`#C25400` (4,6:1). Der Haupt-Button ist orange mit Navy-Schrift, die Produkt-Buttons bleiben Navy.

## Vor dem Versand festlegen

Die Werte stehen als Konstanten oben in `scripts/build_newsletter.py`; Datum und Code zusätzlich
in `graphics/teaser.html` und `graphics/kopf.html`.

- **Gutscheincode** `SPUK10` im Shop anlegen: 10 % auf die Bestellung, einmal pro Kunde.
- **Gültig bis** 02.11.2026, 23:59 Uhr (wie die Clown-Aktion).
- **Aktionsbedingungen** (Footer) sind ein Vorschlag: nicht mit anderen Gutscheinen/Aktionen
  kombinierbar, keine Barauszahlung, Geschenkgutscheine ausgenommen. An die Einstellungen des
  Codes im Shop anpassen.
- Tracking: `utm_campaign=KW44_Halloween_SPUK10`, damit sich der Fallback von der Clown-Edition
  (`KW44_Halloween`) unterscheiden lässt. `utm_content` markiert Hero, Gutscheingrafik und Button.

## Mobil

Der JUNE-Export setzt auf Handys jedes `<p>` auf 12 px (`!important`). Der Code im Kasten und die
Überschrift im Holz-Block stehen deshalb in `<div>`s und bleiben groß.

## Textversion

`output/newsletter-halloween-spuk10.txt` ist der Plain-Text-Teil der Mail (UTF-8, Zeilen bis 72
Zeichen, URLs ungebrochen), mit dem Code in einem Kasten direkt oben. Footer-Hinweis und
Rechtslinks kommen aus dem JUNE-Export. In JUNE prüfen, ob der Abmeldelink in der Textversion
durch den personalisierten Link ersetzt wird (im Export steht `…/newsletter/unsubscribe/?folderId=0`).

## In JUNE übernehmen

Der Newsletter bindet alle Inhaltsbilder relativ ein (`images/…`). Die Dateien aus
`output/images/` in JUNE hochladen und die Pfade durch die CDN-URLs ersetzen. Logo, Social-Icons
und Trusted-Shops-Siegel kommen weiter vom bestehenden CDN.

## Bauen

```bash
npm run spuk10:build     # alles: Grafiken -> Bilder -> HTML -> Vorschau + Prüfungen
```

Playwright muss auffindbar sein (`npm install` oder `NODE_PATH=$(npm root -g)`).

| Skript | macht |
|---|---|
| `spuk10:graphics` | `graphics/*.html` per Chromium -> `build/newsletter-halloween-spuk10/graphics/*.png` (Kopfband, Gutschein-Teaser, Kürbis-Trenner, Kürbisreihe); Motive aus `graphics/halloween.js` |
| `spuk10:images` | Hero aus Kopfband + NERO-Foto, Grafiken als JPG, Produktfotos -> `output/images/` |
| `spuk10:html` | Kopf, Navigation und Footer aus `source/newsletter-new-ins-kw43.html`, Inhaltsblöcke neu -> `output/newsletter-halloween-spuk10.html` + Textversion `.txt` |
| `spuk10:preview` | Ganzseiten-Vorschau Desktop/Mobil; prüft: kein Clown-/Pop-up-Link, alle Bilder da, Code als Text, alle Shop-Links mit Kampagne, Hero → NERO, Gutscheingrafik → Shop, kein horizontales Scrollen |
| `spuk10:vorschau` | eigenständige Vorschau mit eingebetteten Bildern -> `output/vorschau/` (nicht für den Versand: Gmail zeigt eingebettete Bilder nicht) |
