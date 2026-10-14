# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/whirlpool-couple` | 9:16, 1080×1920, 24 fps, 22,0 s | `output/HomeDeluxe_Whirlpool_Paar_Spot_9x16.mp4` + Titelbild |

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

### Whirlpool Paar – Spot ohne Text

Werbespot ohne Texteinblendungen und mit wenigen, dezenten Elementen: weiche, bewegte
Übergänge statt harter Schnitte, ein durchgehender langsamer Kamera-Push in jeder Einstellung,
warmes Licht, feines Korn und eine leichte Vignette. Grafik nur als Haarlinien im CI
(Ring um die Wanne, kurze Linie unter dem Logo) und das Logo zum Schluss.

| Zeit | Einstellung | Übergang danach |
|---|---|---|
| 0,0–3,8 s | Totale mit Blättern, blendet aus Navy auf | sanfter Push auf die Steuerung, Nahaufnahme setzt sich aus der Bewegung, warmer Lichtschimmer |
| 3,2–6,2 s | Hand öffnet die Steuerung | Kamera kippt vom Display ins Wasser (vertikale Bewegungsunschärfe) |
| 5,5–9,4 s | Bedienfeld + Einlauf | Wasser blendet in Sonnenlicht auf, die Totale zieht sich auf |
| 8,7–12,9 s | Totale, Wanne leer | beide Einstellungen auf die Wanne registriert: das Paar erscheint in der Wanne, feiner Ring zieht den Rand nach |
| 12,0–16,0 s | Paar im Pool | sanfter Push auf die beiden |
| 15,3–22,0 s | Paar näher → Endcard | Bild wird unter Navy weich, Logo + kurze Linie |

Die Abblende am Ende des Rohschnitts (ab Frame 543) ist herausgeschnitten. Der Rohschnitt hat
nur 8,1 s Ton; `sound.py` legt den Original-Ton der ersten drei Einstellungen synchron auf den
neuen Schnitt und baut den Rest: Garten-Atmo und Wasser als granulare Flächen, Sprudeln für
die Paar-Szenen, weiche Luft-Swells an den Übergängen und ein ruhiges Musikbett (D-Dur, Pad +
einzelne Glockentöne), auf -14 LUFS gebracht.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills

npm run whirlpool:plates    # Rohschnitt -> leicht warm gegradete JPG-Plates (build/)
npm run whirlpool:sound     # Tonspur -> build/whirlpool-couple/sound.wav
npm run whirlpool:render    # -> projects/whirlpool-couple/output/HomeDeluxe_Whirlpool_Paar_Spot_9x16.mp4
npm run whirlpool:stills    # Kontrollbilder nach build/whirlpool-couple/stills
```

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + AAC, mit --audio <wav> sonst stumm)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, sound.py, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
