# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/black-friday` | 9:16, 1080×1920, 30 fps, 8 s, loopbar | `output/HomeDeluxe_Black-Friday_Story_9x16.mp4` + Titelbild |
| `projects/shop-3d` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Shop-3D_Black-Friday_9x16.mp4` + Titelbild |
| `projects/black-friday-premium` | 9:16, 1080×1920, 30 fps, 31,5 s | `output/HomeDeluxe_Black-Friday_Premium_9x16.mp4` + Titelbild |

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

### Black Friday – futuristische Story

Neuauflage der schlichten Story „BLACK FRIDAY / -25% auf alles“ (Original unter `source/`).
Der Hintergrund ist schwarz wie im Original, die Akzente kommen aus Navy, Eisblau und Violett.
Keine Footage: Alles entsteht in `composition.html`/`.js`.

| Zeit | Ablauf |
|---|---|
| 0,0–0,8 s | Aus Schwarz: unscharfe Lichtwolken, Perspektiv-Raster, Horizontlinie zieht von der Mitte auf |
| 0,35–1,5 s | „BLACK FRIDAY“ öffnet sich wie ein Röhrenbildschirm aus einer Linie, stark verwischt, gedehnt, verzerrt und mit breitem RGB-Split, dann wird die Schrift scharf. Glitch bei 0,8 s |
| 1,05–2,0 s | „-25% auf alles“ wird genauso scharf, Logo erscheint |
| 2,0–6,9 s | Halten: VHS-Wellenverzerrung, atmender RGB-Split, Glow als seitliche Unschärfe, verwischter Geistertext, Lichtstreifen, Scanlines und Grain. Glitches bei 2,7 / 3,9 / 5,15 / 6,0 s, zwei Lichtbalken laufen durchs Bild |
| 6,95–8,0 s | Schrift löst sich in Unschärfe und Glitch auf, klappt zu einer Linie zusammen (Röhre aus), kurzer Blitz, dann Schwarz, damit der Clip nahtlos loopt |

Timings stehen in `T` und `GLITCH` in `composition.js`.

### Shop 3D – Kamerafahrt durch homedeluxe.de mit -25 %

Eine 3D-Fahrt (CSS 3D, eigene Kamera auf `#world`) durch den nachgebauten mobilen Shop. Header,
Produktkacheln und Preise sehen aus wie auf homedeluxe.de. Produkte, Preise und Bilder kommen von
der Startseite (Stand 26.10.2026, `products.js`, Bilder in `source/products/`). Der Aktionspreis ist der
aktuelle Shop-Preis minus 25 %.

| Zeit | Ablauf |
|---|---|
| 0,0–1,0 s | Mobile Startseite: Sticky-Header mit Laufband, Black-Friday-Banner, Topseller. Die Seite scrollt |
| 1,0–3,4 s | Die Kacheln heben ab und fliegen in einen Gang. Die Seite kippt nach hinten und wird zum Boden. Die Kamera fährt zurück und taucht in den Gang ein. Alle Kachelpreise zählen auf -25 % herunter |
| 3,4–13,4 s | Vier Stationen (Wohnen: AMIRI XXL, Garten: LOMA, Sauna & Infrarot: EVEREST M, Whirlpools: BEACH). Das freigestellte Produkt schwebt über einem Podest. „-25%“ knallt ins Preisschild, der alte Preis wird durchgestrichen, der neue zählt herunter, dann „Du sparst …“ und der Warenkorb zählt hoch. Dazwischen schnelle Fahrten mit Speed-Lines und Bewegungsunschärfe. Kacheln im Gang ändern ihre Preise, sobald die Kamera vorbeikommt |
| 13,4–15,2 s | Alle 20 Produkte fliegen an der Kamera vorbei in eine Produktwand, jede mit Aktionspreis |
| 15,4–18,5 s | Endcard „BLACK FRIDAY -25% auf alles“, „Jetzt shoppen“, homedeluxe.de |

Das Bodenraster zeichnet ein 2D-Canvas mit derselben Kameramathematik (`view()` in `composition.js`).
Große 3D-Ebenen, die hinter die Kamera reichen, sprengen Chromiums Tile-Speicher und lassen dann
andere Ebenen verschwinden. Freisteller entstehen mit `scripts/key_white.py` (weißer Hintergrund →
Alpha, `--holes` für eingeschlossene weiße Flächen).

### Black Friday Premium – ruhiger Produktseiten-Scroll

Hochwertige Variante im Stil großer Produktseiten: schwarzer Hintergrund, viel Raum, ruhige Typo, aber
in Home-Deluxe-CI (Poppins, Navy, Weiß, Grautöne, eckige Buttons und Kacheln). Das Video ist ein
gesteuerter Scroll durch eine lange Seite. Die Seite ruht, während Inhalte einblenden und Preise zählen.
Die lokale Navigation „Black Friday · Entdecken · Kaufen“ bleibt oben stehen.

| Zeit | Abschnitt |
|---|---|
| 0–3,4 s | Hero: „Black Friday / Alles reduziert.“, Chrom-Schriftzug „-25%“ mit Lichtkante, davor der Whirlpool BEACH |
| 3,4–9 s | „Die Highlights.“: Karussell mit AMIRI XXL, LOMA, BEACH. Die Preise zählen, der Fortschrittsbalken läuft |
| 9–13,6 s | „Das Upgrade für dein Zuhause.“: Text und Kennzahlen (974,75 € / 25 % / 499,75 €) |
| 13,6–17 s | Vollformat-Bild Whirlpool SUNSHINE mit Parallax, Preis 4.299 € → 3.224,25 € |
| 17–21 s | „Dein Spa. Ganz privat.“: Kombisauna EVEREST M, 1.999 € wird durchgestrichen, 1.499,25 € zählt herunter |
| 21–27 s | „Alles. Minus 25 %.“: Segment-Umschalter Garten / Wohnen / Carport / Terrasse mit Bild und Preis |
| 27–31,5 s | „Lohnt sich das? Und wie.“, Logo, „-25 % auf alles.“, Buttons, homedeluxe.de |

Produktdaten kommen aus `projects/shop-3d/products.js`. Scroll-Stopps (`SCROLL`), Einblendzeiten
(`REVEAL`) und Karussell- und Segmentzeiten stehen oben in `composition.js`.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
npm run black-friday:render # -> projects/black-friday/output/HomeDeluxe_Black-Friday_Story_9x16.mp4
npm run black-friday:stills # Kontrollbilder nach build/black-friday/stills
npm run shop-3d:render      # -> projects/shop-3d/output/HomeDeluxe_Shop-3D_Black-Friday_9x16.mp4 (ca. 30 min)
npm run shop-3d:stills      # Kontrollbilder nach build/shop-3d/stills
npm run black-friday-premium:render  # -> projects/black-friday-premium/output/HomeDeluxe_Black-Friday_Premium_9x16.mp4
npm run black-friday-premium:stills  # Kontrollbilder nach build/black-friday-premium/stills
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).
`--plates` braucht `render.js` nur für Kompositionen mit Footage.

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/key_white.py      Produkt-Freisteller: weißer Hintergrund -> PNG mit Alpha
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
