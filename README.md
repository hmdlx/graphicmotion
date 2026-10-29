# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/callado-zubehoer` | 16:9, 1920×1080, 30 fps, 32,9 s | `output/HomeDeluxe_CALLADO-Zubehoer_16x9_Intro.mp4` |

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

### CALLADO Zubehör – Intro

Der fertige Zubehör-Film (`source/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4`) begann mit 6 s fast
schwarzem Bild, in dem langsam ein Lichtstreifen aufglimmt – dass es um Zubehör geht, stand erst
nach 13 s im Bild. Davor sitzt jetzt ein Intro (5,7 s), das die vier Zubehörteile sofort benennt
und dann ohne sichtbaren Schnitt in den Film übergeht.

| Zeit | Inhalt |
|---|---|
| 0,0–1,1 s | Aufblende aus Schwarz, Kicker „CALLADO —— WPC-Sichtschutzzaun“, Titel „PASSENDES ZUBEHÖR“ |
| 1,1–2,3 s | Vier Kacheln mit Szenen aus dem Film öffnen sich, darunter je Nummer, Name und Kurztext: 01 CALLUX STRIPE, 02 CALLUX COVER, 03 CALLANUT, 04 Schrägelement |
| 2,3–4,2 s | Übersicht steht, die Kacheln laufen (Pfostenkappe leuchtet auf, Leisten-Bündel, Schrägelement) |
| 4,2–5,0 s | Texte steigen aus, Kacheln 02–04 schließen sich |
| 4,7–5,7 s | Kachel 01 (Lichtstreifen) zieht zum Vollbild auf und landet exakt auf Frame 159 des Films |
| ab 5,7 s | Film ab Frame 160 (5,33 s): „01 Nutleiste – CALLUX STRIPE“ baut sich wie gehabt auf |

Die ersten 5,3 s des Films (Schwarz + Lichtstreifen) laufen nicht mehr im Vollbild, sondern in
Kachel 01 mit; der Rest des Films ist unverändert. Gesamtlänge 32,9 s statt 32,6 s.
Kachel 01 wird beim Aufziehen ohne das eingebrannte Logo gezeigt; darüber liegt eine
Logo-Maske aus dem Film selbst (`scripts/logo_matte.py`), sodass das Logo die ganze Zeit an
derselben Stelle steht und beim Übergang nicht doppelt erscheint.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

CALLADO-Intro:

```bash
npm run callado:frames      # Film -> JPG-Plates in Originalgröße (build/)
npm run callado:logo        # Logo-Maske + logofreie Plates für Kachel 01
npm run callado:intro       # Intro verlustfrei -> build/callado-zubehoer/intro.mp4
npm run callado:join        # Intro + Film ab Frame 160 -> projects/callado-zubehoer/output/…_Intro.mp4
npm run callado:stills      # Kontrollbilder nach build/callado-zubehoer/stills
```

Der Anschluss-Frame steht zweimal: `JOIN` in `composition.js` und die `160` in `callado:join`
(dazu der `--clean`-Bereich in `callado:logo`, der bei `JOIN − 1` endet).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/extract_frames.sh Fertigen Film in Originalgröße als Plates ablegen
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/logo_matte.py     Eingebranntes Logo als Maske herauslösen und aus Plates entfernen
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur, --crf 0 = verlustfrei)
scripts/join_intro.sh     Intro vor einen fertigen Film setzen, Film läuft ab Frame N weiter
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).

CALLADO: Texte stehen in `projects/callado-zubehoer/composition.html`. In `composition.js` stehen
die Kachel-Footage `TILES` (Quell-Frames, Ausschnitt und Kamerapfad je Kachel) und die Zeitleiste
`T` (Output-Frames).
