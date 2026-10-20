# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/black-week` | 9:16, 1080×1920, 24 fps, 31,8 s | `output/HomeDeluxe_BlackWeek_Staffelrabatt_9x16.mp4` + Titelbild |

### Laguna M – Schnitt und Übergänge

Die weichen Überblendungen und die Abblende des Rohschnitts sind entfernt. Jede Einstellung
läuft nur mit ihren sauberen Frames (Schnittliste `SHOTS` in `composition.js`), und jeder
Übergang ist als Motion-Grafik gestaltet (`X` in `composition.js`).

Jede Einstellung startet mit ihrer Kamerabewegung in Echtzeit und bremst dann in Zeitlupe
(ca. 0,4–0,6×) ab. Die Zwischenbilder sind bewegungsinterpoliert (`scripts/slowmo_plates.sh`,
ffmpeg `minterpolate`, je Einstellung getrennt, damit nichts über Schnitte hinweg verschmiert).
Pro Moment kommt nur eine neue Information ins Bild.

| Zeit | Einstellung | Grafik |
|---|---|---|
| 0,0–1,9 s | Schwarz | „BLACK WEEK“, „Bis zu 150 € geschenkt“ (zählt hoch), „Nur 7 Tage · 20.–26.11.“; Schnittlinie, Türen öffnen |
| 1,6–5,4 s | Barhocker, Front | nacheinander: SAMIR → 15 € geschenkt → ab 100 € Einkaufswert |
| 5,4–8,4 s | Barhocker, Seite | nur der Preis: 119 € wird gestrichen → 104 € |
| 8,4–12,3 s | Whirlpool | DROP → 75 € geschenkt → ab 500 € |
| 12,3–15,1 s | Whirlpool, 2. Winkel | 529 € → 454 € |
| 15,1–18,9 s | Infrarotkabine | REDSUN DELUXE S → 150 € geschenkt → ab 1.000 € |
| 18,9–22,2 s | Infrarotkabine, 2. Winkel | 1.099 € → 949 € |
| 22,2–27,4 s | Endcard A | Video schrumpft in die Rabatt-Treppe aus drei Video-Balken: „Je mehr du kaufst, desto mehr schenken wir dir.“, Beträge steigen Stufe für Stufe |
| 27,4–31,8 s | Endcard B | „NUR 7 TAGE“, 20.–26.11., „Bis zu 150 € geschenkt“, CTA, Laufband |

Produktwechsel laufen über einen schwarzen Treppen-Wipe, unter dem das Bild nach oben wegzieht.
Beträge und Preise stehen in `PRODUCTS` in `composition.js` (Preis `null` blendet die Preiszeile aus).

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
npm run black-week:plates   # Plates + Zeitlupen-Plates (minterpolate, dauert einige Minuten)
npm run black-week:render   # -> projects/black-week/output/HomeDeluxe_BlackWeek_Staffelrabatt_9x16.mp4
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

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
