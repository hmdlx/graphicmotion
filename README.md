# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/whirlpool` | 9:16, 1080×1920, 30 fps, 17,6 s | `output/HomeDeluxe_Whirlpool_Details_Reel_9x16.mp4` + Titelbild |

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

### Whirlpool – Details in Zeitlupe

Technisches Produktvideo, kein Lifestyle, clean: Jeder Text sitzt in einer Glasbox unten
links (über der Reels-Caption) – #0f2334 getönt, mattiert (`backdrop-filter`), scharfkantig,
feine helle Kante. Die Box kommt kurz vor ihrem Text, geht in einen Hover-Zustand über
(leichter Lift, hellere Kante, tieferer Schatten, wandernder Lichtpunkt, ein Glanzstreifen)
und geht nach dem Text. Die Texte darin sind animiert wie die TextAnimate-Komponente mit dem
Preset `blurInUp`: Titel zeichenweise, Detailzeile wortweise, jedes Segment mit Blur 18 px → 0,
Fade und 36 px Hub (Web-Werte ×2 für das 1080er-Format), Stagger = duration / Segmente. Der
Exit läuft in umgekehrter Reihenfolge kurz vor dem Schnitt, der nächste Text startet kurz
danach. Einstellungen je Text (`data-by`, `data-delay`, `data-dur`) stehen in
`composition.html`.

Zeitlupe: `scripts/retime.py` rampt jede Einstellung laut `edit.json` (Tempo-Keys je
Quell-Frame) und rechnet die Zwischenbilder mit RIFE 4.9 (ONNX, CPU) – keine
Frame-Doppelungen, keine Geisterkanten. Die Schnitte liegen auf dem Musik-Raster:
`scripts/music.py` dehnt das Intro tonhöhenneutral und loopt den Drop taktgenau, der Drop
fällt auf den Schnitt zu den Kopfstützen.

| Zeit | Einstellung | Tempo | Text |
|---|---|---|---|
| 0,00–2,00 s | Totale, Anflug | 1× → 0,39× → 1× | Whirlpool · Die Details in Zeitlupe |
| 2,00–4,82 s | Wanne, Düsen | 1× / 0,5× / 0,19× | Massagedüsen · Im Rücken- und Sitzbereich |
| 4,82–6,66 s | Verkleidung | 1× → 0,56× | Verkleidung · Anthrazit, umlaufend mit Holzstruktur |
| 6,66–9,66 s | Kopfstützen (Drop) | 0,33× | Kopfstützen · Gepolstert, ergonomisch geformt |
| 9,66–11,16 s | Treppe | 1× → 0,70× | Einstiegstreppe · Zweistufig, passend zur Verkleidung |
| 11,16–13,66 s | Bedienfeld | 0,41× | Bedienfeld · Mit Display, direkt am Wannenrand |
| 13,66–17,60 s | Totale, Orbit | 0,30× | Logo · Whirlpool · Jetzt entdecken auf homedeluxe.de · Wir machen dein Zuhause. |

Die Texte beschreiben nur, was im Bild zu sehen ist (keine Maße, Düsenzahlen oder Preise).
Modellname und Daten lassen sich in `composition.html` ergänzen.

```bash
npm run whirlpool:model     # RIFE-Modell (ONNX, ~21 MB) nach build/models
pip install onnxruntime     # einmalig
npm run whirlpool:plates    # Schnitt + Zeitlupe -> build/whirlpool/plates, projects/whirlpool/timeline.js (~30 min CPU)
npm run whirlpool:music     # Tonspur auf Schnittlänge -> build/whirlpool/music.wav
npm run whirlpool:render    # -> projects/whirlpool/output/HomeDeluxe_Whirlpool_Details_Reel_9x16.mp4
```

Timing ändern: Tempo-Keys und Dauer je Einstellung in `projects/whirlpool/edit.json`, dann
`whirlpool:plates` (bereits gerechnete Zwischenbilder werden aus dem Cache genommen) und
`whirlpool:music`, falls sich die Gesamtlänge ändert.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow (Whirlpool zusätzlich onnxruntime), ffmpeg mit
rubberband, Chromium für Playwright.

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
scripts/retime.py         Speed-Ramps + RIFE-Zwischenbilder -> ein Plate je Ausgabe-Frame
scripts/music.py          Original-Tonspur taktgenau auf die Schnittlänge bringen
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + AAC, stumm oder --audio)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
