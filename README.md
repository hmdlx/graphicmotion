# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/callado-zubehoer` | 16:9, 1920×1080, 30 fps, 36,6 s | `output/HomeDeluxe_CALLADO-Zubehoer_16x9_Intro.mp4` |

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

### CALLADO Zubehör – Cliffhanger-Intro

Der fertige Zubehör-Film (`source/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4`) begann mit 2 s Schwarz
und einem langsam aufglimmenden Lichtstreifen – dass es um Zubehör geht, stand erst nach 13 s im
Bild. Davor sitzt jetzt ein 4-s-Intro im Look des Films (Nacht, Anthrazit, warmes LED-Licht,
Staubpartikel, Letterbox 2,39:1), das als Cliffhanger auf das Licht hinarbeitet und im Schwarz
abbricht. Die Auflösung liefert der Film selbst: Aus dem Schwarz zündet sein Lichtstreifen.

| Zeit | Bild | Text |
|---|---|---|
| 0,0–2,1 s | KI-Totale: der CALLADO-Zaun bei Nacht, Kamera fährt heran, die Pfostenkappen zünden nacheinander | „WPC-Sichtschutzzaun CALLADO“ – **Dein Zaun steht.** |
| 2,1 s | Belichtungsblitz, Schnitt | – |
| 2,1–3,8 s | KI-Makro: Holzmaserung im Mondlicht, unten in der Pfostennut erwacht ein warmes Licht | „Passendes Zubehör“ – **Doch das Beste kommt noch …** |
| 3,8–4,0 s | harter Schnitt auf Schwarz (Cliffhanger) | – |
| ab 4,0 s | Film ab Frame 44: Schwarz, dann zündet der Lichtstreifen; ab Frame 62 läuft die Quelle direkt weiter | – |

Der CALLANUT-Teil (03 WPC-Nutleiste) stammt aus der überarbeiteten Fassung
`source/HomeDeluxe_CALLADO-Zubehoer_16x9_v2.mp4`: Dort schwebt eine einzelne Nutleiste ins Bild
(6,3 s statt 4,8 s). Die Fassung ist bis Frame 494 und ab Frame 672 (= Original 627) mit dem
Original identisch; geschnitten wird mit etwas Luft in diesen Bereichen – v2 Frame 490–679
ersetzt Original Frame 490–634. Die Endkarte bleibt die des Originals (mit „Jetzt entdecken“ und
homedeluxe.de, die in v2 fehlen).

Gesamtlänge 36,6 s (Film ohne seine ersten 1,5 s Schwarz). Texte in Poppins wie im Film: Kicker in
gesperrten Versalien, Zeile in Poppins Bold wie der Claim der End-Szene, auf der Position der
Kapiteltitel. Das Logo steht die ganze Zeit an seiner Stelle: Der Film blendet es erst zwischen
Frame 36 und 60 ein, deshalb laufen die Frames 44–61 noch durch die Komposition – ohne das
eingebrannte Logo und mit der Logo-Maske aus dem Film selbst darüber (`scripts/logo_matte.py`).

KI-Material (Higgsfield, Quellen unter `source/ai/`): je Einstellung ein Start- und ein Endbild aus
Nano Banana Pro (21:9, 2K), erzeugt mit Standbildern aus dem Film als Referenz, damit Zaun,
Pfosten, Kappen und Licht dem echten CALLADO entsprechen (`keyframes/`). Die Endbilder sind für
die Kamerafahrt enger beschnitten. Daraus hat Kling 4.0 (Bild-zu-Video, 1080p, 21:9, 4 s) die
Clips `shot_B_totale.mp4` und `shot_A_makro.mp4` animiert. Kosten: 8 Credits Bilder + 26 Credits Video.

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
npm run callado:frames      # Film-Frames 0–160 -> JPG-Plates (Logo-Referenz + Frames 44–61)
npm run callado:ai          # KI-Clips -> JPG-Plates (build/callado-zubehoer/ai/)
npm run callado:logo        # Logo-Maske + logofreie Film-Frames 44–61
npm run callado:intro       # Intro verlustfrei -> build/callado-zubehoer/intro.mp4
npm run callado:join        # Schnittliste: Intro, Film 62–489, v2 490–679 (CALLANUT), Film ab 635 -> output/…_Intro.mp4
npm run callado:stills      # Kontrollbilder nach build/callado-zubehoer/stills
```

Der Anschluss-Frame steht zweimal: `JOIN` in `composition.js` und die `62` in `callado:join`
(dazu der `--clean`-Bereich `44-61` in `callado:logo`, der bei `JOIN − 1` endet). Die Schnittliste
in `callado:join` nimmt Bildbereiche als `datei@von-bis` (inklusive, `von-` = bis zum Ende).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/extract_frames.sh Fertigen Film in Originalgröße als Plates ablegen
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/logo_matte.py     Eingebranntes Logo als Maske herauslösen und aus Plates entfernen
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur, --crf 0 = verlustfrei)
scripts/cutlist.sh        Bildbereiche aus fertigen Clips aneinanderschneiden (ein Encode)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).

CALLADO: Texte stehen in `projects/callado-zubehoer/composition.html`. In `composition.js` stehen
die Schnittliste `SHOTS` (Quell-Frames der KI-Clips je Einstellung) und die Zeitleiste `T`
(Output-Frames).
