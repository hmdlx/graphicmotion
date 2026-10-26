# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/cyber-monday-ir` | 4:5, 1080×1350, 30 fps, 13,4 s | `output/HomeDeluxe_CyberMonday_Infrarotkabine_4x5.mp4` |

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

### Cyber Monday – Infrarotkabine

Quelle ist ein 8,7-s-Clip einer Infrarotkabine vor orangem Studiohintergrund. Der Hintergrund wird
per Farbschlüssel auf Navy umgefärbt (`scripts/recolor_bg.py`, Regeln je Einstellung in `grade.json`:
Holz und Magenta-LEDs bleiben unangetastet, in der Holz-Einstellung zählt nur die Fläche, die mit der
Bildecke verbunden ist). Danach wird jede Einstellung einzeln per Bewegungsinterpolation auf 72 fps
gerechnet, damit die Komposition Slow Motion fahren kann (`EDIT` in `composition.js`).

Gestaltung im Stil von apple.com, aber in der CI: eine Aussage pro Bild, große zentrierte Poppins-Typo
mit Verlauf Weiß → helles Grau, Einblendungen aus der Unschärfe, weiche Überblendungen, langsamer Push.
Die Rabatte stehen als 3D-Objekte (three.js, gebürstetes Titan mit Navy-Flanken) direkt im Video auf der
dunklen Seitenwand der Kabine und drehen sich wie auf einem Produkt-Drehteller.

| Zeit | Einstellung | Tempo | Text |
|---|---|---|---|
| 0,0–2,5 s | Totale | Slow-Mo 0,3× | Logo, „Cyber Monday.“, „Extra-Rabatte. Nur am 30. November.“ |
| 2,1–4,8 s | LED-Leiste | Slow-Mo 0,36× | 3D „–25 %“, „Extra auf Sale.“ / „Zusätzlich zu bereits reduzierten Preisen.“ |
| 4,3–6,6 s | Seitenwand | Slow-Mo 0,4× | 3D „–10 %“, „Auf alles andere.“ / „Auf alle Artikel, die nicht im Sale sind.“ |
| 6,2–8,3 s | Liegefläche | Slow-Mo 0,45× | „Wellness für dein Zuhause.“ |
| 7,8–13,4 s | Logo-Wand | Echtzeit → Slow-Mo 0,42× | Endcard: „Cyber Monday.“, –25 % / –10 %, „Jetzt sparen“, homedeluxe.de, Logo |

Ton: Original-Tonspur auf die neue Länge gestreckt plus synthetisches Sounddesign
(weiche Whooshes, Impacts, Klangfläche) nach `sound.json` (`scripts/sound_design.py`).

```bash
npm run cyber-monday-ir:plates   # Umfärben + Interpolation -> build/cyber-monday-ir/plates (ca. 5 min)
npm run cyber-monday-ir:audio    # -> build/cyber-monday-ir/soundtrack.wav
npm run cyber-monday-ir:render   # -> projects/cyber-monday-ir/output/HomeDeluxe_CyberMonday_Infrarotkabine_4x5.mp4
npm run cyber-monday-ir:stills   # Kontrollbilder
```

Ändert sich das Timing in `EDIT`, die Zeitstempel in `sound.json` nachziehen (`window.COMP.S` liefert die
Schnittzeiten). Die 3D-Ziffern kommen aus `assets/fonts/poppins/poppins-600.typeface.json`
(`node scripts/make_typeface.mjs <font.woff> <out.json> "<Zeichen>"`).

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright, three.js (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
                            # vorhandenes Chromium nutzen: CHROMIUM_PATH=/pfad/zu/chrome npm run ...
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
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + AAC, stumm oder --audio)
scripts/recolor_bg.py     Hintergrund per Farbschlüssel umfärben (Orange -> Navy)
scripts/build_plates.sh   Umfärben + Slow-Mo-Interpolation je Einstellung
scripts/sound_design.py   Tonbett + synthetisches Sounddesign
scripts/make_typeface.mjs Schrift -> three.js-Typeface für 3D-Text
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
