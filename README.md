# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/staffelrabatt-black-week` | 9:16, 1080×1920, 30 fps, 38 s, deutsches Voice-over | `output/HomeDeluxe_BlackWeek_Staffelrabatt_9x16.mp4` |

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

### Black Week Staffelrabatt – 3D-Erklärvideo

Eine Kamerafahrt durch eine CSS-3D-Welt erklärt, wie das Black-Week-Geschenk funktioniert: Je voller
der Warenkorb, desto mehr schenkt Home Deluxe. Weiß `#fefefe`, Navy `#0f2334`, Poppins, viel Weißraum.

| Stufe | Bestellwert | Geschenk | Code |
|---|---|---|---|
| 1 | ab 100 € | 15 € | `BLACK15` |
| 2 | ab 500 € | 75 € | `BLACK75` |
| 3 | ab 1.000 € | 150 € | `BLACK150` |

| Zeit | Voice-over | Kamerafahrt |
|---|---|---|
| 0,6 s | „Black Week bei Home Deluxe – und wir schenken dir bis zu 150 €.“ | Anflug aus der Ferne durch taumelnde 3D-Geschenkboxen auf „BLACK WEEK / bis zu 150 €“, dann Durchflug durch die Schrift |
| 6,2 s | „So funktioniert’s: Je voller dein Warenkorb, desto größer unser Geschenk.“ | iPhone dreht ins Bild, COZY springt aus dem Display, Tap, COZY fällt in den Warenkorb |
| 11,2 s | „Ab 100 € Bestellwert schenken wir dir 15 € – mit dem Code BLACK15.“ | Kranfahrt zur 3D-Treppe, Stufe 1: Geschenk-Leiste füllt sich, „15 €“ klappt hoch, Code fliegt ein |
| 17,1 s | „Ab 500 € schenken wir dir 75 € – mit BLACK75.“ | Schwung auf Stufe 2, AMIRI XXL fliegt von der Stufe ins iPhone, „75 €“ |
| 22,6 s | „Und ab 1.000 € sogar 150 € – mit BLACK150.“ | Schwung auf Stufe 3, LOMA fliegt ins iPhone, „150 €“ |
| 28,1 s | „Code im Warenkorb eingeben – und dein Geschenk wird direkt abgezogen.“ | Kamera steigt über die Treppe, iPhone frontal: BLACK150 tippen, „−150 €“ springt aus dem Display |
| 33,0 s | „Nur in der Black Week – auf homedeluxe.de.“ | Rückfahrt in die Totale der ganzen Treppe mit Produkten, Beträgen und Codes, CTA |

Aufbau von `composition.js`: eine Orbit-Kamera (Ziel, Abstand, Gier/Neigung/Roll) mit Keyframes `CAM`
(`swoop` = Ausholbewegung mitten im Flug), Weltobjekte als 3D-Matrizen, iPhone (`PHONE`) und Überschriften
im Kameraraum mit leichtem Nachziehen, Bewegungsunschärfe aus der Kamerageschwindigkeit. Die Ebenen
(Partikel, Treppe, Requisiten, iPhone, Flugobjekte, Texte) sind getrennte 3D-Kontexte, damit sich schräge
Flächen nicht gegenseitig in Nähte zerschneiden.

Produkte, Preise und Freisteller stammen aus dem Shop (Stand 26.10.2026): Sitzsack mit Hocker COZY
189 €, Couchtisch Marmor AMIRI XXL 399 €, Hängesessel faltbar LOMA (2er, Beige) 429 €. Ändern sich die
Preise, in `composition.html` (Produktseite, Warenkorbzeilen) und `PRODUCTS` in `composition.js` anpassen.

Voice-over: Gemini TTS (`voiceover.json`: Modell, Stimme, Text je Segment; `say` ist die Sprechfassung
mit ausgeschriebenen Zahlen). `scripts/voiceover.py` erzeugt den ganzen Text in **einer** Anfrage (Free
Tier: wenige TTS-Anfragen pro Tag) und schneidet ihn an den längsten Pausen in Segmente. Eine
Regieanweisung im Prompt liest das Modell mit vor, deshalb geht nur der reine Text raus. Die Startzeiten
der Segmente stehen in `cues.js`; Animation (`composition.js`) und Tonspur (`scripts/mix_audio.js`)
lesen beide daraus.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills

npm run staffelrabatt:vo      # Voice-over neu erzeugen (nur bei Textänderung; braucht Gemini-API-Zugang)
npm run staffelrabatt:render  # Tonspur mischen + -> projects/staffelrabatt-black-week/output/HomeDeluxe_BlackWeek_Staffelrabatt_9x16.mp4
npm run staffelrabatt:stills  # Kontrollbilder nach build/staffelrabatt-black-week/stills
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß und navy, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + AAC, mit --audio sonst stumm)
scripts/voiceover.py      Gemini-TTS -> ein WAV je Voice-over-Segment
scripts/mix_audio.js      Segmente laut cues.js auf die Zeitachse legen
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
