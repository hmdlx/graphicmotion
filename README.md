# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/callado-zubehoer` | 16:9, 1920×1080, 30 fps, 35,2 s | `output/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4` + Titelbild |

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

### CALLADO Zubehör – 3D-Kamerafahrt, LED-Highlights, KI-Übergänge

Die Bildkarte hängt im 3D-Raum (Perspektive, Versatzrahmen dahinter, Bodenschatten, Glanzlicht),
die Kamera schwenkt in jeder Szene um sie herum, die Texte driften gegenläufig. Für die LEDs wird
der Raum dunkel: Hintergrund, Foto und Schrift wechseln ins Dunkle, Staub schwebt im Licht, das
Licht läuft in Zeitlupe durch die Nuten bzw. zündet aus der Mitte des Lichtbands, danach flackert
das Licht wieder an. Die LED-Masken schneidet `scripts/led_mask.py` aus den Produktfotos.

Die Produktwechsel sind echte Kamerafahrten, generiert mit Seedance 2.5 über Higgsfield
(4 s, 720p, 1:1, je 28 Credits, zusammen 84 Credits). Sie laufen in der Karte mit Zeitlupe am
Anfang und Ende. Die Clips treffen die Produktfotos nicht immer exakt (T1 endet in einer
Nahaufnahme der Kappe); `scripts/match_frame.py` misst, wo das Foto im ersten/letzten Clip-Frame
liegt (`transitions.js`), und die Komposition zieht das Foto von dort aus auf. Wo die Karte
KI-Material zeigt (Stimmungsbild, Übergänge), steht wie im Katalog „AI“ in der Ecke.

| Zeit | Inhalt | Grafik |
|---|---|---|
| 0,0–4,4 s | Stimmungsbild CALLADO (Katalog S. 4), Titel | Kamera schwenkt, ab 3,6 s wird der Raum dunkel, die LEDs blühen auf |
| 4,7–7,6 s | Karte dreht im Dunkeln auf CALLUX STRIPE | Licht läuft in Zeitlupe die LED-Nuten hoch, Licht flackert an |
| 7,6–10,3 s | 01 Nutleiste CALLUX STRIPE, mit Solar-LED | Callout „Solar-LED“ |
| 10,3–13,1 s | KI-Übergang T1 | Kamera fährt am Pfosten hoch bis zur Kappe |
| 13,1–17,2 s | 02 Pfostenabdeckung CALLUX COVER, mit Solar-LED | Raum dimmt, Lichtband zündet aus der Mitte, Callout, Licht flackert an |
| 17,2–19,6 s | KI-Übergang T2 | Kamera fährt den Pfosten hinunter, er wird zu den Leisten |
| 19,6–22,2 s | 03 WPC-Nutleiste CALLANUT, in verschiedenen Mengen | – |
| 22,2–24,6 s | KI-Übergang T3 | Kamera kreist um die Leisten, landet auf dem Schrägelement |
| 24,6–27,2 s | 04 Schrägelement CALLADO, Abschluss für Zaunenden | Maßlinie zeichnet die Schräge nach |
| 27,2–31,0 s | Übersicht „Alles für deinen CALLADO.“ | Karte wird zur vierten Kachel, die anderen drehen sich ein |
| 31,0–35,2 s | Endcard | Logo mit Lichtkante, „Wir machen dein Zuhause“, „Jetzt entdecken“ + homedeluxe.de |

Die Produktdaten stammen aus dem Katalog „Bauen – OBI Hausmesse 2026“, Seite 5. Preise sind
bewusst nicht eingebaut. Aufschraubhülse CALMAR und Bodenbefestigung CALTERRA fehlen, weil dafür
keine Bilder vorlagen.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills

npm run callado-zubehoer:plates   # KI-Übergänge (source/transitions/*.mp4) -> JPG-Plates (build/)
npm run callado-zubehoer:match    # Anschluss Foto <-> Clip -> projects/callado-zubehoer/transitions.js (nur bei neuen Clips)
npm run callado-zubehoer:led      # LED-Masken -> source/led/ (nur bei neuen Fotos)
npm run callado-zubehoer:render   # -> projects/callado-zubehoer/output/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4
npm run callado-zubehoer:stills   # Kontrollbilder nach build/callado-zubehoer/stills
```

Ist Chromium schon installiert (passt nicht zur Playwright-Version), den Pfad mitgeben:
`CHROMIUM_PATH=/pfad/zu/chrome npm run callado-zubehoer:render`.

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen)
oder `projects/callado-zubehoer/composition.html?t=12` (Übergänge brauchen die Plates unter `build/`).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß und navy, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/led_mask.py       LED-Masken aus Produktfotos (für Glow und Lichtlauf)
scripts/clip_plates.sh    Übergangs-Clips -> JPG-Plates
scripts/match_frame.py    Lage eines Fotos im ersten/letzten Clip-Frame (Skalierung + Versatz)
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur), Bühnengröße aus COMP.W/H
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).

Bei CALLADO Zubehör stehen die Texte in `projects/callado-zubehoer/composition.html`. In
`composition.js` stehen die Zeitleiste `T` (Sekunden, inkl. Dunkelphasen und Übergängen), die
Kamerafahrt `ORBIT`, die Callout-Punkte (Pixel im 1000er-Produktfoto) und der Zoom je Bild.
