# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/callado-zubehoer` | 16:9, 1920×1080, 30 fps, 30 s | `output/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4` + Titelbild |

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

### CALLADO Zubehör – ruhiges Werbevideo mit viel Weißraum

Weißer Hintergrund, rechts eine feste Bildfläche (840 × 840 px) mit dünnem Versatzrahmen, links
die Texte. Es bewegt sich immer nur eine Sache, mit langen, weichen Kurven. Bilder wechseln mit
einem Wipe von unten (Navy-Kante), Texte steigen aus Masken auf.

| Zeit | Inhalt | Grafik |
|---|---|---|
| 0,0–5,2 s | Stimmungsbild CALLADO (Katalog S. 4, KI-Bild, mit „AI“ gekennzeichnet) | „WPC-Sichtschutzzaun / CALLADO / Passendes Zubehör / Details, die deinen Zaun vollenden.“ |
| 5,2–9,2 s | 01 Nutleiste CALLUX STRIPE, mit Solar-LED | Callout „Solar-LED“ auf der LED-Nut |
| 9,2–13,2 s | 02 Pfostenabdeckung CALLUX COVER, mit Solar-LED | Callout „Solar-LED“ am Lichtband der Kappe |
| 13,2–17,2 s | 03 WPC-Nutleiste CALLANUT, in verschiedenen Mengen | – |
| 17,2–21,2 s | 04 Schrägelement CALLADO, Abschluss für Zaunenden | Maßlinie zeichnet die Schräge nach |
| 21,2–25,4 s | Übersicht „Alles für deinen CALLADO.“ | Bildfläche schrumpft zur vierten Kachel, die anderen drei öffnen sich |
| 25,4–30,0 s | Endcard | Logo, „Wir machen dein Zuhause“, „Jetzt entdecken“ + homedeluxe.de |

Unten links zeigt ein Fortschrittsbalken (4 Segmente), welches Zubehörteil gerade läuft.
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

npm run callado-zubehoer:render   # -> projects/callado-zubehoer/output/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4
npm run callado-zubehoer:stills   # Kontrollbilder nach build/callado-zubehoer/stills
```

Ist Chromium schon installiert (passt nicht zur Playwright-Version), den Pfad mitgeben:
`CHROMIUM_PATH=/pfad/zu/chrome npm run callado-zubehoer:render`.

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen)
oder `projects/callado-zubehoer/composition.html?t=12` (braucht keine Plates).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß und navy, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur), Bühnengröße aus COMP.W/H
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).

Bei CALLADO Zubehör stehen die Texte in `projects/callado-zubehoer/composition.html`, die Zeitleiste
`T` (Sekunden), die Callout-Punkte (Pixel im 1000er-Produktfoto) und der Zoom je Bild in
`composition.js`.
