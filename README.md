# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/sauna-guide` | 9:16, 1080×1920, 30 fps, 24,3 s, Meta Ad | `output/HomeDeluxe_Sauna-Guide_MetaAd_9x16.mp4` (mit Ton), `…_ohne-Ton.mp4` + Titelbild |

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

### Sauna-Guide – Meta-Ad zum Ratgeber „Saunieren für Einsteiger“

Anzeige für Reels/Stories zum Ratgeber
[Die Welt des Saunierens](https://www.homedeluxe.de/news-und-trends/wellness/die-welt-des-saunierens/).
Gebaut aus den Artikel- und Produktbildern (`source/`), die mit Real-ESRGAN lokal auf 2160 px
Höhe hochgerechnet sind (`source-hq/`). Jede Szene ist ein eigener Container, deshalb können die
Übergänge ganze Szenen bewegen (Würfeldrehung, Flutung, Iris). Alle Texte liegen in der
Meta-Safe-Zone (y 270–1250); `composition.html?guides=1` blendet die Sperrzonen ein.

Durchgehend: Kamerafahrten über die Standbilder (`CAM`), echte Bewegungsunschärfe bei schnellen
Bewegungen (Sub-Frames, siehe `mblur()`), Filmkorn, Vignette, Rollzähler für alle Zahlen,
3D-Wortanimationen und Buchstaben-Einblendungen.

| Zeit | Szene | Animation | Übergang danach |
|---|---|---|---|
| 0,0–3,4 s | Sauna mit Aufgusskübel | Rückwärtszoom, Schwenk, prozeduraler Dampf, Staub im Gegenlicht, warmes Glühen; Hook „Dein erster Saunagang? – So gelingt er in 4 Schritten“; Thermometer steigt von 20 auf 90 °C | Thermometer flutet das Bild, Fläche hebt ab |
| 3,4–6,0 s | Aufguss auf Steinen | Dampfstoß, glimmendes Licht; 01 Schwitzen: Stoppuhr mit 15-Minuten-Skala, Zeiger läuft, Bereich 8–15 wächst, Zähler „8–15 Minuten“, Bank-Grafik „Unten oder mittig sitzen“ | Reißschwenk mit Bewegungsunschärfe |
| 6,0–8,5 s | Gartensauna HYGGE DELUXE | Windlinien ziehen durchs Bild, „durchatmen“ atmet; 02 Frische Luft | Kaltes Wasser steigt in Wellen mit Gischt |
| 8,5–11,2 s | Grafik auf Wasser-Kaustik | 03 Abkühlen: Pfeil wächst von den Beinen zum Gesicht, Stationen 1–4 mit Wellenringen, Warnhinweis pulsiert | Pfeilspitze öffnet ein Fenster |
| 11,2–13,4 s | Ruhephase im Bademantel | Lichtfahrt, Staub; 04 Ruhen: Zähler „10–20 Min.“, „2–3 Runden“ mit drehendem Symbol und Rundenpunkten | Zoom in ein warmes Lichtleck |
| 13,4–17,4 s | Thermometer, unscharf | Sauna-Arten: Symbole zeichnen sich, Balken mit Temperaturbereich und Glanz, Zähler, Skala, Badges „Ideal zum Einstieg“ | Würfeldrehung in 3D |
| 17,4–20,9 s | Produkte | 3D-Karussell mit Spiegelung und Glanz: Kombisauna EVEREST, Infrarotkabine REDSUN DELUXE XXL, Gartensauna HYGGE DELUXE | Navy-Balken |
| 20,9–24,3 s | Endcard | Bild mit Dampf, Rahmen zeichnet sich, „Sauna-Guide“ in 3D, Häkchen-Chips, CTA mit Glanz, Logo-Glanz | – |

Ton (`scripts/sound_sauna.py`): komplett synthetisiert, ohne Samples und Lizenzen – Ambient-Pad
in D-Dur, gezupftes Arpeggio, leiser Puls und Effekte auf den Schnitten (Dampfzischen,
Stoppuhr-Ticks, Whooshes, Wasser, Tropfen, Lichtklang, Impact auf der Endcard), normalisiert auf
−15 LUFS. Es gibt eine Fassung mit Ton und eine ohne.

Alle Werte stammen aus dem Ratgeber. Preise und Gesundheitsversprechen sind bewusst nicht eingebaut.

Anzeigentext-Vorschlag (Meta Ads Manager):

- **Primärtext:** Dein erster Saunagang? So gelingt er: 8–15 Minuten schwitzen, frische Luft, kalt abduschen
  von den Füßen aufwärts und danach in Ruhe entspannen. Im Einsteiger-Guide erfährst du außerdem, welche
  Sauna-Art zu dir passt. 🧖
- **Überschrift:** Saunieren für Einsteiger – der Guide
- **Beschreibung:** Schritt für Schritt zum entspannten Saunagang
- **Button:** Mehr dazu
- **Ziel-URL:** https://www.homedeluxe.de/news-und-trends/wellness/die-welt-des-saunierens/

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills

npm run sauna-guide:upscale        # nur bei neuen Quellbildern: Real-ESRGAN x4 -> source-hq/ (s. u.)
npm run sauna-guide:plates         # source-hq -> 2160 px hohe, leicht gegradete JPG-Plates (build/)
npm run sauna-guide:sound          # Soundtrack -> build/sauna-guide/sound.wav
npm run sauna-guide:render         # -> output/HomeDeluxe_Sauna-Guide_MetaAd_9x16.mp4 (mit Ton)
npm run sauna-guide:silent         # gleiche Bildspur mit stummer Tonspur -> …_ohne-Ton.mp4
npm run sauna-guide:stills         # Kontrollbilder nach build/sauna-guide/stills
```

`render.js` kennt außerdem `--workers n` (parallele Browser-Seiten, Segmente werden danach
verbunden), `--audio datei.wav` und `--range a,b` (nur ein Ausschnitt in Sekunden, zum Prüfen
einzelner Übergänge). Liefert die Komposition `COMP.mblur(n)`, rendert es schnelle Frames als
2/4/8 Sub-Frames mit 180°-Shutter und mittelt sie in ffmpeg (echte Bewegungsunschärfe).

Hochrechnen: `scripts/upscale_esrgan.py` braucht numpy, Pillow und onnxruntime sowie das Modell
Real-ESRGAN x4 (BSD-3) als ONNX unter `build/models/realesrgan-x4.onnx`, Download:
https://huggingface.co/imgdesignart/realesrgan-x4-onnx/resolve/main/onnx/model.onnx

Passt die Chromium-Version nicht zur installierten Playwright-Version, zeigt `CHROMIUM_PATH` auf ein
vorhandenes Chromium, z. B. `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run sauna-guide:render`.

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/prepare_stills.sh Standbilder auf feste Höhe skalieren + Grading
scripts/upscale_esrgan.py Real-ESRGAN x4 (ONNX, CPU) für zu kleine Quellbilder
scripts/sound_sauna.py    synthetisierter Soundtrack für den Sauna-Guide
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames (+ Sub-Frames) -> ffmpeg (H.264 + AAC)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
