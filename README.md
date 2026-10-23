# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/everest` | 1:1, 1080×1080, 30 fps, 11,2 s Loop | `output/HomeDeluxe_Everest_2in1_1x1.mp4` + `output/HomeDeluxe_Everest_2in1_640.webp` |
| `projects/everest` (16:9) | 16:9, 1920×1080, 30 fps, 11,2 s Loop | `output/HomeDeluxe_Everest_2in1_16x9.mp4` + `output/HomeDeluxe_Everest_2in1_16x9_1280.webp` |
| `projects/everest-tour` | 16:9, 1920×1080, 30 fps, 45,8 s | `output/HomeDeluxe_Everest_Tour_16x9.mp4` |
| `projects/everest-tour` (20 s) | 16:9, 1920×1080, 30 fps, 20,0 s | `output/HomeDeluxe_Everest_Tour_20s_16x9.mp4` |
| `projects/everest-tour` (20 s, 9:16) | 9:16, 1080×1920, 30 fps, 20,0 s | `output/HomeDeluxe_Everest_Tour_20s_9x16.mp4` |

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
sind Flächen einer Trommel, die sich um die waagerechte Achse dreht. Alles andere folgt der Karte, die
gerade vorne ist: Überschrift + Akzentbalken, Kamerafahrt im Produktfoto, Eck-Klammern und Wärme-Effekt.

| Zeit | Karte vorne | Überschrift | Produktfoto |
|---|---|---|---|
| 0,0–1,3 s | Intro: Zeilen fahren aus Masken ein, Sauna-Karte rollt von unten ein, 0 → 100 °C | **SAUNA** navy + Balken | deckt von unten auf, Kamera fährt auf den Ofen, Klammern rasten ein |
| 1,3–3,4 s | Sauna: 100 °C · Finnische Sauna · inkl. 3,6 kW Saunaofen | **SAUNA** navy, + INFRAROT grau | Ofen, Dampf steigt auf |
| 3,4–4,2 s | Trommel dreht (mit Überschwung): Sauna nach oben weg, Infrarot von unten, 0 → 400 W | Farben + Balken wandern | Kamera schwenkt zum Strahler, Klammern wandern mit |
| 4,2–6,6 s | Infrarot: 400 W · Infrarot-Tiefenwärme · inkl. Vollspektrumstrahler | **+ INFRAROT** navy | Strahler, Infrarot-Wellen laufen nach außen |
| 6,6–7,6 s | Infrarot rutscht in Slot 2, Sauna dreht oben wieder ein (zählt erneut auf 100 °C) | Balken spannt über beide Zeilen | Kamera zieht auf die ganze Kabine, zweites Klammerpaar geht zum Ofen |
| 7,6–10,4 s | **beide Karten** untereinander; „2 IN 1“ und Preis pulsieren, Glanz über dem Preis | **SAUNA + INFRAROT** navy | Ofen und Strahler markiert, Dampf und Wellen |
| 10,4–11,2 s | Outro: Karten rollen nach oben raus, Zeilen fahren aus | | Foto schließt sich nach oben |

Logo, Linie und Preis stehen durchgehend; Anfang und Ende sind identisch (nur Footer), die Datei läuft
nahtlos im Loop. Die 16:9-Fassung (`composition-16x9.html`) nutzt dasselbe `composition.js` mit identischem Timing; sie setzt nur `window.LAYOUT` (Format, Kartenhöhe, Fotogröße): links Überschrift und Karussell, rechts das Produktfoto, unten Logo und Preis. Daten laut Produktseite
(homedeluxe.de, Art.-Nr. 75499): max. 80–100 °C, Saunaofen 3,6 kW, 1× 400 W Infrarot-Vollspektrumstrahler.
Das Produktfoto ist der Freisteller `75499-…-EVEREST-S-freisteller01.jpg`, auf die Kabine zugeschnitten.

### Kombisauna EVEREST – POV-Tour + Modell-Karussell

POV-Durchgang durch die EVEREST XL mit zwei USP-Stopps, Rausfahrt ins Studio und ein ruhiges
Showroom-Karussell über alle vier Größen. Die Bewegtbilder sind KI-Clips (Higgsfield, Kling 3.0 Pro,
je 5 s, Start- und Endbild vorgegeben), alles Statische sind echte Bilder:

- **Studio-Keyframes** (`keyframes/`, `scripts/studio_keyframes.py`): die Freisteller aus dem Shop
  (`source/*_front|left|right.png`, Hintergrund per Flood-Fill entfernt) auf einer Hohlkehle mit
  Softbox-Licht und Kontaktschatten. Sie sind Start- und Endbild jedes Karussell-Clips – dadurch
  kommt jedes Produkt exakt so an, wie es ist (kein Morphing). Links steht jeweils die Ansicht mit
  der Seitenwand rechts (Front dreht nach links), rechts die mit der Seitenwand links.
- **USP-Stopps** (`source/stop_ofen.jpg`, `source/stop_strahler.jpg`): die Detailfotos, per
  Higgsfield-Outpaint auf 16:9 erweitert.
- **Tür** (`scripts/door_assets.py`): Die Front der XL hat eine Ganzglas-Drehtür (mittlere Scheibe,
  Drehbeschläge oben/unten an der rechten Kante, Griff links, Logo-Druck auf der Scheibe). KI-Modelle
  machen daraus zuverlässig eine Schiebetür, deshalb bewegt die KI die Tür nicht: Die Scheibe ist eine
  eigene Ebene (`door_pane.png` auf `k1_door_base.png`) und dreht in `composition.js` per CSS-3D um
  ihre rechte Kante nach außen (+80°). Die POV-Clips fahren durch die bereits offene Tür
  (`k1_door_open.png` als Start- bzw. Endbild).

| Zeit | Bild | Grafik |
|---|---|---|
| 0,0–1,4 s | Glastür schwingt nach außen auf (Drehtür, rechte Scharniere) | Intro „EVEREST – Sauna + Infrarot in einem“ |
| 1,4–5,4 s | POV: durch die offene Tür → Saunaofen (Speed-Ramp) | |
| 5,4–8,4 s | Stopp Ofen (Standbild, Push-in, Blitz) | 01 Finnische Sauna · bis 100 °C (zählt hoch) · Saunaofen 3,6–8 kW, Klammern |
| 8,4–12,0 s | POV: Ofen → Infrarot-Strahler | |
| 12,0–15,0 s | Stopp Strahler | 02 Infrarot-Tiefenwärme · 400 W je Vollspektrumstrahler, Klammern |
| 15,0–19,2 s | POV: Rausfahrt durch die offene Tür ins Studio | Chips: 4,4 cm Fichtenholz · 8 mm ESG-Glas · 4 cm Einstieg |
| 19,2–20,2 s | Glastür schwingt zu | |
| 20,2–41,0 s | Karussell XL → L → M → S (Halt 1,6 s, Drehung 5 s) | Modell-Label (Maße, Personen, Strahler, Ofen) + Größenwahl S/M/L/XL |
| 41,0–45,8 s | Line-up aller vier Größen | „Sauna + Infrarot in 4 Größen“, ab 1.799 €, CTA homedeluxe.de |

**20-s-Fassung** (`composition-20s.html`, gleiche Clips, gleiches `composition.js`, Schnittliste `CUTS['20s']`):
Tür auf 0,8 s → POV 2,2 s → Stopp Ofen 1,7 s → POV 1,3 s → Stopp Infrarot 1,7 s → Rausfahrt 1,9 s →
Tür zu 0,6 s → Karussell XL → L → M → S (je 2,2 s Drehung, 0,2–0,3 s Halt) → Line-up mit Preis 2,1 s.
Die USP-Chips der Rausfahrt entfallen, Zähler laufen in 0,6 s hoch.

**9:16-Fassung** (`composition-20s-9x16.html`): gleicher 20-s-Schnitt, aber nativ im Hochformat –
eigene Studio-Keyframes (`keyframes-9x16/`, Hero groß, Nachbarn an den Rändern angeschnitten, Line-up 2 × 2),
Detailbilder per Outpaint auf 9:16 (`source/stop_*_9x16.jpg`), Tür-Ebene über `placement.json`/`door.json`
neu berechnet und eigene Kling-Clips in 9:16 für die POV-Fahrten (`source/clips-9x16/`). Das Karussell
lief als 9:16-KI-Clip nicht sauber (Kabinen drehten auf der Stelle und gingen ineinander über), daher
laufen dort die 16:9-Karussell-Clips unskaliert als Band (`LAYOUT.band`, x −420 / y 420) in einer
pixelgleich verlängerten Hohlkehle (`keyframes-9x16/band_bg.png`); beim Übergang zoomt das Hochformat-
Türbild exakt auf die XL im Band zurück. Die Rausfahrt verbiegt in allen 9:16-Varianten kurz die
Glasfront; `LAYOUT.motionBlur` legt im schnellsten Teil der Fahrt Bewegungsunschärfe darüber.
`window.LAYOUT` setzt Bühne,
Keyframe-Ordner, Stopp-Bilder und Klammer-Positionen; Grafiken stehen oben (Titel, Stopps, Modell-Label),
Größenwahl unter dem Produkt, Preis + CTA unter dem Line-up.

Gewählte Clip-Varianten stehen in `prepare.sh` (`source/clips/`). Modelldaten laut homedeluxe.de
(Art.-Nr. 75499–75502): S 100 × 120 cm, 1× IR, 3,6 kW · M 120 × 120 cm, 2× IR, 3,6 kW ·
L 180 × 120 cm, 3× IR, 6 kW · XL 200 × 200 cm, 5× IR, 8 kW; alle bis 100 °C, 400 W je Strahler,
4,4 cm Wand, 8 mm ESG, 4 cm Einstieg. Preis „ab 1.799 €“ = EVEREST S.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
npm run everest:render      # -> projects/everest/output/HomeDeluxe_Everest_2in1_1x1.mp4
npm run everest:webp        # -> animierte WebP 640×640, 25 fps, für Shop/Ads (Loop)
npm run everest-16x9:render # -> projects/everest/output/HomeDeluxe_Everest_2in1_16x9.mp4
npm run everest-16x9:webp   # -> animierte WebP 1280×720, 25 fps (Loop)
npm run everest-tour:plates # gewählte KI-Clips -> build/everest-tour/plates
npm run everest-tour:render # -> projects/everest-tour/output/HomeDeluxe_Everest_Tour_16x9.mp4
npm run everest-tour-20s:render # -> projects/everest-tour/output/HomeDeluxe_Everest_Tour_20s_16x9.mp4
npm run everest-tour-9x16:plates       # 9:16-Clips -> build/everest-tour-9x16/plates
npm run everest-tour-20s-9x16:render  # -> projects/everest-tour/output/HomeDeluxe_Everest_Tour_20s_9x16.mp4
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
scripts/studio_keyframes.py  Freisteller -> Studio-Keyframes (Hohlkehle, Kontaktschatten)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
