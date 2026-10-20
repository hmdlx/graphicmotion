# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/black-week` | 9:16, 1080×1920, 24 fps, 25,1 s | `output/HomeDeluxe_BlackWeek_Staffelrabatt_9x16.mp4` + Titelbild |
| `projects/black-friday` | 9:16, 1080×1920, 24 fps, 12,2 s, mit Ton | `output/HomeDeluxe_BlackFriday_25_9x16.mp4` + Titelbild |
| `projects/sunshine` | 9:16, 1080×1920, 24 fps, 18,3 s, mit Ton | `output/HomeDeluxe_Sunshine_9x16.mp4` + Titelbild |

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
| 1,6–4,8 s | Barhocker, Front | nacheinander: SAMIR → 15 € geschenkt → ab 100 € Einkaufswert |
| 4,8–6,9 s | Barhocker, Seite | nur der Preis: 119 € wird gestrichen → 104 € |
| 6,9–10,1 s | Whirlpool | DROP → 75 € geschenkt → ab 500 € |
| 10,1–12,3 s | Whirlpool, 2. Winkel | 529 € → 454 € |
| 12,3–15,4 s | Infrarotkabine | REDSUN DELUXE S → 150 € geschenkt → ab 1.000 € |
| 15,4–17,3 s | Infrarotkabine, 2. Winkel | 1.099 € → 949 € |
| 17,3–21,6 s | Endcard A | Video schrumpft in die Rabatt-Treppe aus drei Video-Balken: „Je mehr du kaufst, desto mehr schenken wir dir.“, Beträge steigen Stufe für Stufe |
| 21,6–25,1 s | Endcard B | „NUR 7 TAGE“, 20.–26.11., „Bis zu 150 € geschenkt“, CTA, Laufband |

Produktwechsel laufen über einen schwarzen Treppen-Wipe, unter dem das Bild nach oben wegzieht.
Beträge und Preise stehen in `PRODUCTS` in `composition.js` (Preis `null` blendet die Preiszeile aus).

### Black Friday – −25 % (27.–29.11.)

Eine Einstellung (Decke bricht auf, ein schwarzes 3D-„−25 %“ kracht aufs Sofa), dramatisiert:

| Zeit | Grafik / Effekt |
|---|---|
| 0,0–2,7 s | Cinematic-Balken (Logo im oberen Balken), Push-in, Countdown „Black Friday startet in 3 · 2 · 1“ in der Decke |
| 2,7 s | Decke reißt: die „1“ zerplatzt, Kamerawackeln, Blitz |
| 2,7–3,9 s | Speed-Ramp in Zeitlupe (0,4×): das −25 % bricht durch die Decke, Vignette zieht zu; der schnelle Fall läuft wieder in Echtzeit |
| 4,1 s | Einschlag: Weißblitz, RGB-Split, Zoom-Punch, Schockwelle, starkes Wackeln |
| 4,3–6,3 s | „BLACK“ / „FRIDAY“ knallen rein, Datum 27.–29.11. |
| 6,3–7,5 s | Zoom durch das schwarze −25 % ins Schwarz |
| 7,5–12,2 s | Endcard: BLACK FRIDAY, rotes −25 % (RGB-Split, pulsiert), „Nur 3 Tage“, 27.–29.11., CTA, Laufband |

Die Zeitachse steht in `projects/black-friday/timeline.js` und wird von Bild und Ton gemeinsam
genutzt. `scripts/build_audio.py` zieht den Originalton durch dieselbe Speed-Ramp (Zeitlupe klingt
tiefer) und ergänzt Countdown-Ticks, Riser, Sub-Boom, Whoosh, Endcard-Hits und einen Herzschlag.
Nahe Echtzeit werden echte Quellframes statt interpolierter benutzt, weil `minterpolate` beim
schnell fallenden −25 % Doppelkanten erzeugt.

### Whirlpool SUNSHINE

Ruhiger, hochwertiger Produktfilm mit wenigen Elementen: der Whirlpool steht allein im Bild,
Text gibt es nur am Anfang („SUNSHINE“) und auf der Endcard. Jedes Frame ist entrauscht, gegradet
(filmische Kurve, warme Lichter, leicht kühle Schatten, weiche Vignette) und nachgeschärft
(`sunshine:plates`).

| Zeit | Einstellung | Tempo | Grafik |
|---|---|---|---|
| 0,0–4,0 s | Totale | 0,6× | „SUNSHINE“, Hintergrund leicht unscharf |
| 3,5–4,0 s | Totale → Wasser | Speed-up 2,2× | Zoom ins Wasser mit Unschärfe und hellem Blitz |
| 4,2–7,1 s | Wasser von oben | 0,3× | – |
| 7,4–7,6 s | Kamerafahrt | 2× | Bewegungsunschärfe |
| 7,8–9,4 s | Bedienfeld | 0,5× | – |
| 9,5–9,8 s | Kamerafahrt | 2× | Bewegungsunschärfe |
| 9,9–12,0 s | Massagedüsen | 0,55× | – |
| 12,0–12,6 s | Düsen → Totale | Speed-up 2× | warmer Lichtschweif |
| 12,6–17,0 s | Totale im Gegenlicht | 0,45× | Tiefenunschärfe |
| 14,6–18,3 s | Endcard | Standbild mit Push-in | Logo, SUNSHINE, homedeluxe.de |

Der Originalton (Wasser) wird mit `scripts/stretch_audio.py` tonhöhenneutral auf die Speed-Ramp
gestreckt, die Speed-ups bekommen leise Whooshes.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
npm run black-week:plates   # Plates + Zeitlupen-Plates (minterpolate, dauert einige Minuten)
npm run black-friday:plates # Black Friday: Plates + Zeitlupen-Plates
npm run black-friday:render # Ton bauen + rendern -> projects/black-friday/output/
npm run sunshine:plates     # SUNSHINE: Grading + Zeitlupen-Plates
npm run sunshine:render     # Ton strecken + rendern -> projects/sunshine/output/
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
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + AAC, stumm oder --audio <wav>)
scripts/slowmo_plates.sh  Bewegungsinterpolierte Zeitlupen-Plates je Einstellung
scripts/build_audio.py    Ton entlang der Speed-Ramp + synthetisierte Effekte
scripts/stretch_audio.py  Originalton tonhöhenneutral auf die Speed-Ramp strecken
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
