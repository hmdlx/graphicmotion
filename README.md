# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/dfb-pokal-gewinnspiel` | 3:4, 1080×1440, 30 fps, 21 s | `output/HomeDeluxe_DFB-Pokal_Gewinnspiel_3x4.mp4` + Titelbild |
| `projects/dfb-pokal-gewinnspiel` (Post) | 3:4 Standbild, Higgsfield GPT Image 2.5 | `output/HomeDeluxe_DFB-Pokal_Gewinnspiel_Post_*_V1/V2.jpg` |

### DFB-Pokal Gewinnspiel – Ablauf

Instagram-Feedpost (3:4) zum Gewinnspiel 4 × 2 Tickets für SC Paderborn 07 – VfB Stuttgart,
Mi 28.10.2026, 18:00 Uhr, Home Deluxe Arena. Teilnahme bis 27.10.2026. Alle Objekte sind echte
CSS-3D-Körper (Tickets, Wappen-Kacheln, Info-Prismen, Schritt-Karten mit Kanten) bzw. extrudierte
Schrift/Logo aus gestapelten Ebenen. Bewusst ohne Motion Blur gerendert: bei den schnellen 3D-Übergängen erzeugen
wenige Sub-Frames sichtbare Stufen statt Unschärfe.

| Zeit | Szene | Übergang danach |
|---|---|---|
| 0,0–3,3 s | Stadion bei Nacht (Dolly), „Gewinnspiel“ klappt Buchstabe für Buchstabe hoch | Szene 2 schwingt wie eine Tür herein |
| 2,7–6,6 s | Extrudiertes „4×2“ dreht sich ein, „Tickets“, vier 3D-Tickets fliegen in einen Fächer | Kamera fliegt durch den Abriss des vorderen Tickets |
| 6,6–10,6 s | DFB-Pokal, Wappen SC Paderborn 07 / VfB Stuttgart als 3D-Kacheln | Würfeldrehung nach oben |
| 9,9–13,6 s | Datum, Anstoß, Ort als rollende Prismen, Uhrzeiger läuft auf 18:00 | Lamellen drehen zu und wieder auf |
| 13,6–17,9 s | Spielerfoto, „So bist du dabei“: Like, Freund markieren, Nachricht abwarten; Teilnahme bis 27.10.2026 | 3D-Karussell |
| 17,1–21,0 s | Endcard: extrudiertes Logo, „Viel Glück!“, Teilnahmeschluss, @homedeluxe.de, Instagram-Hinweis | – |

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

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
npm run dfb-gewinnspiel:render   # -> projects/dfb-pokal-gewinnspiel/output/HomeDeluxe_DFB-Pokal_Gewinnspiel_3x4.mp4
npm run dfb-gewinnspiel:stills   # Kontrollbilder nach build/dfb-pokal-gewinnspiel/stills
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur), optional --mblur N
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
