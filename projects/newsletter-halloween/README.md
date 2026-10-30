# Newsletter Halloween-Edition (KW44)

Halloween-Newsletter im Layout des KW43-Newsletters „New Ins“ mit Suchspiel: Im Newsletter
versteckt sich ein Clown. Wer ihn anklickt, landet auf einer Seite mit dem Gutscheincode –
**50 € ab 500 € Bestellwert**.

Alle Produktbilder sind Original-Shopfotos von homedeluxe.de; es werden keine KI-Bilder
verwendet. Halloween-Elemente (Fledermäuse, Spinne, Clown) sind eigene Grafiken, die auf die
Fotos gelegt werden, die Produkte selbst bleiben unverändert.

Vorschau: `output/preview/preview_desktop.jpg`, `output/preview/preview_mobile.jpg`
Auflösung: `output/aufloesung_sofa_mit_clown.jpg`

## Wo ist der Clown?

Im Foto vom **Sofa CASARA** (Dunkelgrün): Er lugt rechts hinter der Rückenlehne hervor, neben
der Vase, die Handschuhe auf der Lehne. Das Foto ist in Slices geschnitten. Nur der Clown-Slice
(Desktop 112 × 128 px, Mobil ca. 68 × 78 px) verlinkt auf die Gutschein-Seite, alle anderen
Slices auf das Sofa. Das Raster steht in `output/slices.json`.

## Inhalt

| Block | Produkt | Bild (Shop) | Preis |
|---|---|---|---|
| Hero „HALLOWEEN – Finde den Clown“ | Outdoor Fasssauna LAHTI XL | Dämmerung mit Laternen, + Fledermäuse | – |
| Intro „Gemütlich durch die Gruselnacht“ | CTA: Alle Saunen | – | – |
| Suchspiel | Teaser „Finde den Clown“ + 50-€-Gutschein, Spielregel als Live-Text | Grafik | – |
| Schwitzen statt Schaudern | Outdoor Fasssauna LAHTI XL | Innenansicht | 2.599 € |
| Dein eigener Hexenkessel | Hot Tub SKANDI M | Nachtaufnahme | 1.999 € |
| Lagerfeuer für Gruselgeschichten | Gartenfeuer SWING, USPs (Handarbeit, 2 in 1, wetterfest) | Garten | – |
| Produktkarten | Feuerschale FRANK · Gartenfeuer SWING | Freisteller | 39 € · 79 € |
| Gruselfilm-Abend? (Clown-Versteck) | Sofa CASARA Dunkelgrün | Wohnzimmer | 1.199 € |
| Raster | Elektrokamin CALOR · Massagesessel DUNES | Ambiente | 329 € · 1.399 € |
| Raster | LED-Spiegel DUBI 80 cm · Kratzbaum RUBY Schwarz | Ambiente | 139 € · 69 € |
| Navy-Band | „Happy Halloween! Schon den Clown gefunden? … irgendwo zwischen Sauna und Kratzbaum.“ | – | – |

Produktnamen, Links, Preise und Merkmale stammen von den Produktseiten auf homedeluxe.de
(Stand 30.10.2026) und stehen gesammelt oben in `scripts/build_newsletter.py` (`P`). Preise
vor dem Versand gegenprüfen.

Gestaltung nach CI: nur Navy, Weiß und Grautöne, Poppins in den Grafiken, eckige Ecken.

## Vor dem Versand festlegen

Die folgenden Werte sind Vorschläge und stehen als Konstanten oben in `scripts/build_newsletter.py`
(Gutscheincode und Datum zusätzlich im Text von `output/landingpage/clown-gefunden.html`
und `graphics/teaser.html`):

- **Gutscheincode** `CLOWN50` – im Shop anlegen: 50 € Rabatt, Mindestbestellwert 500 €, einmal pro Kunde.
- **Gültig bis** 02.11.2026, 23:59 Uhr.
- **Ziel des Clowns** `https://www.homedeluxe.de/halloween-clown/` – Seite im Shop-CMS anlegen,
  Inhalt aus `output/landingpage/clown-gefunden.html` (Block `<section class="hd-clown">`
  samt `<style>`, Bild `clown.jpg` mit Markierung des Verstecks). Die Seite ist `noindex`,
  damit der Code nicht über Google auffindbar ist.

## In JUNE übernehmen

Der Newsletter bindet alle Inhaltsbilder relativ ein (`images/…`). Die Dateien aus
`output/images/` in JUNE hochladen und die Pfade durch die CDN-URLs ersetzen. Logo, Social-Icons
und Trusted-Shops-Siegel kommen weiter vom bestehenden CDN.

## Bauen

```bash
npm run halloween:build     # alles: Grafiken -> Bilder -> HTML -> Vorschau + Klick-Test
```

| Skript | macht |
|---|---|
| `halloween:graphics` | `graphics/*.html` per Chromium -> `build/newsletter-halloween/graphics/*.png` (Hero-Band, Fledermäuse, Teaser, Clown-Kopf, Clown-Handschuhe) |
| `halloween:images` | Hero zusammensetzen, Clown hinter die Sofalehne setzen, Slices + `slices.json`, Produktbilder, Landingpage-Bild -> `output/` |
| `halloween:html` | Kopf, Navigation und Footer aus `source/newsletter-new-ins-kw43.html`, Inhaltsblöcke neu -> `output/newsletter-halloween-kw44.html` |
| `halloween:preview` | Ganzseiten-Vorschau Desktop/Mobil + Test, dass nur der Clown-Slice auf die Gutschein-Seite führt |

## Wie der Clown ins Foto kommt

`graphics/clown.html` zeichnet Kopf und Handschuhe als zwei transparente Ebenen. `build_images.py`
verkleinert sie, gleicht sie leicht an das Foto an (etwas flacher, minimal weich, Korn) und
sucht je Bildspalte die Oberkante der Sofalehne (erster dunkelgrüner Pixel unter dem hellen
Vorhang). Unterhalb dieser Kante wird der Kopf ausgeblendet, er sitzt also hinter der Lehne; die
Handschuhe liegen vorn auf der Kante, mit kleinem Schatten. Position und Größe: `CLOWN_X`,
`CLOWN_SCALE` oben im Skript.
