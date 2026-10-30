# Newsletter Halloween-Edition (KW44)

Halloween-Newsletter im Layout des KW43-Newsletters „New Ins“ mit Clown-Aktion: Im Hero sitzt
ein Clown mit rotem Ballon auf dem Sofa. Wer aufs Bild klickt, landet im Shop, und dort öffnet
sich ein Pop-up mit dem Gutscheincode – **50 € ab 500 € Bestellwert**.

Zum Ansehen und Weitergeben: `output/vorschau/newsletter-halloween-kw44_vorschau.html` und
`output/vorschau/clown-popup_vorschau.html` – alle Bilder eingebettet, das Pop-up ist sofort offen.
Screenshots: `output/preview/`.

Die eigentlichen Dateien (`output/newsletter-halloween-kw44.html`, `output/popup/clown-popup.html`)
binden ihre Bilder relativ ein (`images/…`, `clown.jpg`). Einzeln geöffnet oder verschickt zeigen
sie deshalb keine Bilder – erst mit dem Bilderordner daneben bzw. nach dem Hochladen in JUNE/Shop.

## Klick → Pop-up

- Das ganze Hero-Bild (Band „HALLOWEEN – Finde den Clown“ + Wohnzimmer) verlinkt auf
  `https://www.homedeluxe.de/?halloween=clown&utm_campaign=KW44_Halloween&…&utm_content=clown`.
  Es ist der einzige Link mit diesem Parameter im Newsletter.
- `output/popup/clown-popup.html` enthält den Block für den Shop (zwischen
  `HD-CLOWN-POPUP START` und `ENDE`): Er bleibt unsichtbar, bis die Adresse `halloween=clown`
  enthält, zeigt dann Code, „Code kopieren“ und Bedingungen und schließt per ×, Klick daneben
  oder Esc. Nach dem 02.11.2026, 23:59 Uhr zeigt er statt des Codes „Huch, zu spät!“.
- Ein Pop-up direkt in der E-Mail ist technisch nicht möglich (Mail-Programme führen kein
  JavaScript aus), deshalb öffnet es sich im Shop.

## Inhalt

| Block | Produkt | Bild | Preis |
|---|---|---|---|
| Hero „HALLOWEEN – Finde den Clown“ | Klick öffnet das Gutschein-Pop-up | Wohnzimmer mit Clown (`source/hero/`) | – |
| Intro „Gemütlich durch die Gruselnacht“ | CTA: Alle Saunen | – | – |
| Suchspiel | Teaser „Finde den Clown“ + 50-€-Gutschein, Spielregel als Live-Text | Grafik | – |
| Schwitzen statt Schaudern | Outdoor Fasssauna LAHTI XL | Shopfoto Dämmerung + Fledermäuse | 2.599 € |
| Dein eigener Hexenkessel | Hot Tub SKANDI M | Shopfoto Nacht | 1.999 € |
| Lagerfeuer für Gruselgeschichten | Gartenfeuer SWING, USPs (Handarbeit, 2 in 1, wetterfest) | Shopfoto Garten | – |
| Produktkarten | Feuerschale FRANK · Gartenfeuer SWING | Freisteller | 39 € · 79 € |
| Gruselfilm-Abend? | Sofa CASARA Dunkelgrün | Shopfoto Wohnzimmer | 1.199 € |
| Raster | Elektrokamin CALOR · Massagesessel DUNES | Shopfotos | 329 € · 1.399 € |
| Raster | LED-Spiegel DUBI 80 cm · Kratzbaum RUBY Schwarz | Shopfotos | 139 € · 69 € |
| Navy-Band | „Happy Halloween! Noch nicht geklickt? Der Clown wartet ganz oben …“ | – | – |

Produktnamen, Links, Preise und Merkmale stammen von den Produktseiten auf homedeluxe.de
(Stand 30.10.2026) und stehen gesammelt oben in `scripts/build_newsletter.py` (`P`). Preise
vor dem Versand gegenprüfen. Die Produktfotos sind unverändert, nur auf das LAHTI-Foto kommen
Fledermaus-Silhouetten.

Gestaltung nach CI: nur Navy, Weiß und Grautöne, Poppins in den Grafiken, eckige Ecken.

## Vor dem Versand festlegen

Die folgenden Werte sind Vorschläge und stehen als Konstanten oben in `scripts/build_newsletter.py`
(Gutscheincode, Datum und Ablaufzeit zusätzlich in `output/popup/clown-popup.html` und
`graphics/teaser.html`):

- **Gutscheincode** `CLOWN50` – im Shop anlegen: 50 € Rabatt, Mindestbestellwert 500 €, einmal pro Kunde.
- **Gültig bis** 02.11.2026, 23:59 Uhr.
- **Pop-up einbauen** – Block aus `output/popup/clown-popup.html` global ins Shop-Layout
  (z. B. Footer), `clown.jpg` ins Shop-CDN laden und den Bildpfad im Block anpassen.

## In JUNE übernehmen

Der Newsletter bindet alle Inhaltsbilder relativ ein (`images/…`). Die Dateien aus
`output/images/` in JUNE hochladen und die Pfade durch die CDN-URLs ersetzen. Logo, Social-Icons
und Trusted-Shops-Siegel kommen weiter vom bestehenden CDN.

## Bauen

```bash
npm run halloween:build     # alles: Grafiken -> Bilder -> HTML -> Vorschau + Prüfungen
```

| Skript | macht |
|---|---|
| `halloween:graphics` | `graphics/*.html` per Chromium -> `build/newsletter-halloween/graphics/*.png` (Hero-Band, Fledermäuse, Teaser) |
| `halloween:images` | Hero aus Band + Wohnzimmer-Bild, LAHTI mit Fledermäusen, Produktbilder, Pop-up-Bild -> `output/` |
| `halloween:html` | Kopf, Navigation und Footer aus `source/newsletter-new-ins-kw43.html`, Inhaltsblöcke neu -> `output/newsletter-halloween-kw44.html` |
| `halloween:preview` | Ganzseiten-Vorschau Desktop/Mobil, Pop-up-Vorschau; prüft, dass nur das Hero-Bild zum Pop-up führt und das Pop-up nur mit `?halloween=clown` aufgeht |
| `halloween:vorschau` | eigenständige Vorschau-HTMLs mit eingebetteten Bildern und Schrift -> `output/vorschau/` (nicht für den Versand: Gmail zeigt eingebettete Bilder nicht) |
