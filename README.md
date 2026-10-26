# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/sauna-guide` | 9:16, 1080×1920, 30 fps, 23,4 s, Meta Ad | `output/HomeDeluxe_Sauna-Guide_MetaAd_9x16.mp4` + Titelbild |

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
Gebaut aus den Artikelbildern und Produktbildern (`source/`); die Kamerafahrten über die
Standbilder stehen in `CAM` in `composition.js`. Alle Texte liegen in der Meta-Safe-Zone
(y 270–1250). Mit `composition.html?guides=1` werden die Sperrzonen eingeblendet.

| Zeit | Bild | Grafik | Übergang danach |
|---|---|---|---|
| 0,0–3,3 s | Sauna mit Aufgusskübel, Schwenk mit Dampf | Hook „Dein erster Saunagang? – So gelingt er in 4 Schritten“ | Navy-Säulen steigen auf |
| 3,3–5,9 s | Aufguss auf Steinen, Push-in mit Dampf | 01 Schwitzen: Stoppuhr läuft, „8–15 Minuten“, „Unten oder mittig sitzen“ | Reißschwenk, Grafik fährt mit |
| 5,9–8,0 s | Gartensauna HYGGE DELUXE | 02 Frische Luft: „Tief durchatmen“, „30 Sek. bis 1 Min. draußen“ | helle Fläche steigt wie ein Wasserspiegel |
| 8,0–10,6 s | reine Grafik | 03 Abkühlen: Pfeil wächst von den Beinen bis zum Gesicht, „Nie direkt am Herzen beginnen“ | Pfeilspitze öffnet ein Fenster |
| 10,6–12,8 s | Ruhephase im Bademantel | 04 Ruhen: „10–20 Min.“, „2–3 Runden“ | Zoom in einen Lichtblitz |
| 12,8–16,5 s | Thermometer, abgedunkelt | Sauna-Arten: Temperatur-Balken mit Zählern, Biosauna und Infrarotkabine „Ideal zum Einstieg“ | Bild blendet auf Navy |
| 16,5–20,0 s | Produktkarten | „Deine eigene Sauna“: Kombisauna EVEREST, Infrarotkabine REDSUN DELUXE XXL, Gartensauna HYGGE DELUXE | Navy-Balken |
| 20,0–23,4 s | Endcard | „Sauna-Guide“, Ablauf-Chips, CTA „Jetzt Guide lesen“ + homedeluxe.de, Slogan | – |

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

npm run sauna-guide:plates  # Standbilder -> 1920 px hohe, leicht gegradete JPG-Plates (build/)
npm run sauna-guide:render  # -> projects/sauna-guide/output/HomeDeluxe_Sauna-Guide_MetaAd_9x16.mp4
npm run sauna-guide:stills  # Kontrollbilder nach build/sauna-guide/stills
```

Passt die Chromium-Version nicht zur installierten Playwright-Version, zeigt `CHROMIUM_PATH` auf ein
vorhandenes Chromium, z. B. `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run sauna-guide:render`.

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/prepare_stills.sh Standbilder auf 1920 px Höhe skalieren + Grading
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
