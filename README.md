# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/wohnzimmer-casara` | 9:16, 1080×1920, 24 fps, 13,8 s | `output/HomeDeluxe_Wohnzimmer-CASARA_Reel_9x16.mp4` |

### Laguna M – Schnitt und Übergänge

Die weichen Überblendungen und die Abblende des Rohschnitts sind entfernt. Jede Einstellung
läuft nur mit ihren sauberen Frames (Schnittliste `SHOTS` in `composition.js`), und jeder
Übergang ist als Motion-Grafik gestaltet (`X` in `composition.js`).

| Zeit | Einstellung | Grafik | Übergang danach |
|---|---|---|---|
| 0,0–2,6 s | Düsen close-up | Hook „Spa-Feeling für dein Zuhause.“ + „Whirlpool LAGUNA M“ | Navy-Balken decken den Schnitt ab |
| 2,6–5,1 s | Wanne innen | 01 Massage: Zähler 0 → 26 Massagedüsen (4 / 6 / 16), getrackte Marker auf den Düsen | Reißschwenk (Push mit Bewegungsunschärfe, Grafik fährt mit) |
| 5,1–7,5 s | Handbrause | 02 Komfort: „Mit Handbrause“ | Lamellen-Wipe passend zur Lamellenwand |
| 7,5–9,9 s | Bullauge | 03 Design: „Elegantes Bullauge – mit Lichttherapie“, getrackter Pointer | Marker öffnet sich zu einem eckigen Fenster |
| 9,9–12,9 s | Kopfstütze (2 Winkel) | 04 Ergonomie: „2 Kopfstützen – Entspannt zu zweit“ | harter Schnitt mit Punch-in zwischen den Winkeln, dann Zoom in einen Lichtblitz |
| 12,9–14,8 s | Totale | Totale landet aus dem Blitz, Titel „LAGUNA M – Indoor-Whirlpool für 2 Personen“ | Bild schrumpft in den Endcard-Rahmen |
| 14,8–18,5 s | Endcard | 180 × 90 × 55 cm · Heizung · Radio · Lichttherapie, CTA „Jetzt entdecken“ + homedeluxe.de, Slogan | – |

Die Produktdaten stammen aus den Shop- und Händlerangaben zur LAGUNA M (homedeluxe.de, Hornbach).
Preise sind bewusst nicht eingebaut, weil sie sich häufig ändern.

### Wohnzimmer CASARA – Mitteilungen im iOS-Stil

Der Raum-Clip (Wohnzimmer → Essbereich) läuft ungeschnitten; darüber erscheinen Mitteilungen
im Aufbau eines iPhone-Banners, aber in CI: Milchglas-Weiß, Navy-Text, Navy-App-Icon, eckig.
Neue Mitteilungen fliegen mit einer gedämpften Feder von oben ein und schieben die älteren in
einen Stapel; jede Gruppe verlässt das Bild mit dem Reißschwenk der Quelle. Zu jeder Mitteilung
mischt `render.js` einen synthetischen Zweiklang unter den Originalton (`--audio`, Cues aus
`COMP.CUES`). Die letzte Plate steht 1,75 s länger mit langsamem Push-in für die Schlusskarte.

| Zeit | Bild | Mitteilung |
|---|---|---|
| 0,4 s | Wohnzimmer total | Sofa CASARA – 258 cm geschwungener Komfort, schwebendes Design |
| 1,8 s | Sessel close-up | Sessel CASARA – tiefe Sitzfläche, vormontiert |
| 3,95 s | Wohnzimmer mit Sessel | Lounge Set CASARA – Sofa und Sessel im Set |
| 5,45 s | Reißschwenk | Stapel fliegt nach oben raus |
| 6,85 s | Essbereich total | Esstisch CAMILLO – rund, Ø 120 cm, Holzoptik Schwarz |
| 8,35 s | Tisch close-up | Esszimmerstuhl CELESTE – Bouclé in Weiß |
| 10,3 s | Essbereich total | „Dein neues Zuhause ist bereit.“ + Aktionen „Jetzt entdecken“ / homedeluxe.de, Logo-Plate mit Slogan |

Produktdaten und Freisteller-Thumbnails (`assets/`) stammen von den Produktseiten auf homedeluxe.de.
Der Couchtisch im Clip hat keine eigene Mitteilung, weil er im Shop nicht gefunden wurde.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills

npm run wohnzimmer-casara:plates   # Quelle -> Plates (build/wohnzimmer-casara/plates)
npm run wohnzimmer-casara:render   # -> projects/wohnzimmer-casara/output/…_Reel_9x16.mp4 (mit Ton)
npm run wohnzimmer-casara:stills   # Kontrollbilder nach build/wohnzimmer-casara/stills
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur oder
                          mit --audio Originalton + Mitteilungston an COMP.CUES)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
