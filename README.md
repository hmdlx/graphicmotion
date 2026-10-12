# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 20,9 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |

### Laguna M – Ablauf

| Zeit | Einstellung | Grafik |
|---|---|---|
| 0,0–2,6 s | Düsen close-up | Hook „Spa-Feeling für dein Zuhause.“ + „Whirlpool LAGUNA M“ |
| 2,8–5,6 s | Wanne innen | 01 Massage: Zähler 0 → 26 Massagedüsen (4 Whirlpooldüsen, 6 Bodyjets, 16 Airjets), getrackte Marker auf den Düsen |
| 5,9–8,6 s | Handbrause | 02 Komfort: „Mit Handbrause“ |
| 8,9–11,6 s | Bullauge | 03 Design: „Elegantes Bullauge – mit Lichttherapie“, getrackter Pointer |
| 11,7–14,6 s | Kopfstütze | 04 Ergonomie: „2 Kopfstützen – Entspannt zu zweit“ |
| 15,0–16,8 s | Totale | Titel „LAGUNA M – Indoor-Whirlpool für 2 Personen“ |
| 16,8–20,9 s | Endcard | Bild schrumpft in einen Rahmen, darunter 180 × 90 × 55 cm · Heizung · Radio · Lichttherapie, CTA „Jetzt entdecken“ + homedeluxe.de, Slogan |

Die Produktdaten stammen aus den Shop- und Händlerangaben zur LAGUNA M (homedeluxe.de, Hornbach).
Preise sind bewusst nicht eingebaut, weil sie sich häufig ändern.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: `projects/laguna-m/composition.html` (Texte) und das Objekt `T`
in `composition.js` (Einblendzeiten in Sekunden der Quelle).
