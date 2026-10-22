# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/everest` | 1:1, 1080×1080, 30 fps, 10,4 s Loop | `output/HomeDeluxe_Everest_2in1_1x1.mp4` + `output/HomeDeluxe_Everest_2in1_640.webp` |

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

### Kombisauna EVEREST – 2 in 1 Karussell

Animierte Fassung der Shop-Kachel „2 IN 1 – Sauna + Infrarot“ (Everest S, 1.799 €). Die Infokarten
sind Flächen einer Trommel, die sich um die waagerechte Achse dreht. Überschrift und Eck-Klammern im
Produktfoto folgen immer der Karte, die gerade vorne ist:

| Zeit | Karte vorne | Überschrift | Klammern im Foto |
|---|---|---|---|
| 0,0–2,4 s | Sauna: 100 °C · Finnische Sauna · inkl. 3,6 kW Saunaofen | **SAUNA** navy, + INFRAROT grau | Saunaofen (Ofen glüht leicht) |
| 2,4–3,3 s | Trommel dreht, Sauna nach oben weg, Infrarot kommt von unten | Farben tauschen | wandern vom Ofen zum Strahler |
| 3,3–5,8 s | Infrarot: 400 W · Infrarot-Tiefenwärme · inkl. Vollspektrumstrahler | SAUNA grau, **+ INFRAROT** navy | Vollspektrumstrahler (glüht) |
| 5,8–6,8 s | Infrarot rutscht in Slot 2, Sauna dreht oben wieder ein | beide navy | zweites Paar löst sich und geht zurück zum Ofen |
| 6,8–9,8 s | **beide Karten** untereinander | **SAUNA + INFRAROT** navy | Ofen und Strahler |
| 9,8–10,4 s | Infrarot rollt zurück unter die Sauna-Karte | + INFRAROT wird grau | Strahler-Klammern ziehen sich zusammen |

Das letzte Bild entspricht dem ersten, die Datei läuft also nahtlos im Loop. Daten laut Produktseite
(homedeluxe.de, Art.-Nr. 75499): max. 80–100 °C, Saunaofen 3,6 kW, 1× 400 W Infrarot-Vollspektrumstrahler.
Das Produktfoto ist der Freisteller `75499-…-EVEREST-S-freisteller01.jpg`, auf die Kabine zugeschnitten.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
npm run everest:render      # -> projects/everest/output/HomeDeluxe_Everest_2in1_1x1.mp4
npm run everest:webp        # -> animierte WebP 640×640 für Shop/Ads (Loop)
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß und navy, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
