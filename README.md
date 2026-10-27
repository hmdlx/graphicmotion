# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/thermo-scan` | 9:16 Premium-Schnitt mit KI-Intro-Clip + deutschem Voice-over (1080×1920, 38 s), 1:1 (1080×1080) + 16:9 (1920×1080, 26 s), 30 fps, mit Sounddesign | `output/HomeDeluxe_SPLASH-THERMO_Thermo-Scan_9x16.mp4`, `…_1x1.mp4`, `…_16x9.mp4`, `…_1x1.gif` + Titelbilder |

### SPLASH THERMO / DROP THERMO – Thermo-Scan

Hochwertiger Content-Clip zu den aufblasbaren Thermoabdeckungen SPLASH THERMO und DROP THERMO
(nicht für den Newsletter). Basis sind die Ambientebilder und 3/4-Freisteller aus dem Shop; alle weiteren
Perspektiven entstehen in einer prozedural gebauten three.js-Szene (`scene.js`) nach den
Produktmaßen: Whirlpool Ø 208 × 70 cm mit Drop-Stitch-Wänden, Abdeckung 162 × 162 × 20 cm mit
sieben Luftkammern und Ventil. Nur der Intro-Clip des 9:16-Schnitts (`source/intro-drop-ki.mp4`, Kling 3.0 aus dem
Nano-Banana-Startbild `source/intro-drop-start-ki.jpg`) und das Voice-over (`source/vo/`, ElevenLabs v4 über Higgsfield,
Stimme Elena) sind KI-generiert. Der Aufdruck, den das Videomodell auf den Pool gesetzt hat, stimmt nicht mit dem Produkt
überein: `prepare.py` verfolgt ihn Frame für Frame, füllt die Seitenwand neu und legt das echte DROP-Logo
(`source/drop-logo.png`, aus dem Shop-Freisteller) an dieselbe Stelle.

**1:1 und 16:9** (`composition.html`, 26 s):

| Zeit | Einstellung | Inhalt |
|---|---|---|
| 0,0–2,9 s | Foto | Ambientebild mit Push-in, Titel „Wärme bleibt drin.“ |
| 2,9–4,9 s | Thermo-Scan | Scanlinie legt die Röntgenansicht frei (Konturen + Wärmebild), Match-Cut in die 3D-Szene |
| 4,9–8,2 s | Querschnitt | Kamerafahrt in die Seitenansicht, Schnittebene teilt Pool und Abdeckung; Callouts Luftpolster / PVC |
| 8,2–11,9 s | Wärmebild | Abdeckung hebt ab → Wärme entweicht; Abdeckung sitzt wieder → „Die Wärme bleibt im Wasser.“ |
| 11,6–15,2 s | Produkt | Scan-Wipe in den Studio-Look, Abdeckung schwebt mit Maßlinien Ø 162 cm / 20 cm |
| 15,2–19,0 s | Wetter | Herbstlaub und Regen auf der Abdeckung |
| 19,0–21,9 s | Wasser | Abdeckung fliegt davon, Draufsicht auf klares Wasser – ohne Text |
| 22,2–26,0 s | Endcard | Beide Freisteller mit Maßen, „Wärme bleibt drin.“, CTA, Logo unter dem CTA |

**9:16 Premium-Schnitt** (`premium.html` / `premium.js`, 38 s) – eigene Shot-Liste fürs Hochformat,
Texte in der Reels/TikTok-Safe-Zone oben, kein laufendes Logo, deutsches Voice-over. Damit der Sprecher
Platz hat, laufen Wärmebild und Produkt mit 0,88-facher, das Wetter mit 0,75-facher Geschwindigkeit
(`WARP` in `premium.js` und `sound.py`):

| Zeit | Einstellung | Inhalt | Voice-over |
|---|---|---|---|
| 0,0–6,0 s | Intro-Clip | Paar entspannt im DROP auf der Terrasse, Handykamera-Look; „Ihr habt einen unserer aufblasbaren Whirlpools?“ / „Dann gibt es etwas Neues für euch.“, Push mit Unschärfe ins Macro | „Ihr habt einen unserer aufblasbaren Whirlpools? Dann gibt's was Neues für euch.“ |
| 6,0–9,4 s | Macro | Kamera kreist dicht über der Abdeckung um das Ventil, Tiefenschärfe, Gegenlicht-Kante, Staub-Bokeh; Titel | „Das ist Splash Thermo – die aufblasbare Thermoabdeckung.“ |
| 9,4–11,4 s | Kranfahrt + Thermo-Scan | hinauf in die Hero-Totale, Scanlinie wandelt das Modell in die Röntgenansicht | – |
| 11,4–14,7 s | Querschnitt | enge Seitenansicht, Schnittebene, Callouts Luftpolster / PVC | „Das Luftpolster aus wetterfestem PVC isoliert.“ |
| 14,8–18,8 s | Wärmebild | Abdeckung hebt ab, Wärmefahne steigt, Abdeckung sitzt wieder; „Die Wärme bleibt im Wasser.“ | „So bleibt die Wärme im Wasser – und ihr spart Energie.“ |
| 18,7–23,2 s | Produkt | Scan zurück in den Studio-Look, Abdeckung schwebt mit Maßlinien; „Aufblasbar & leicht.“ | „Aufblasbar und leicht.“ |
| 23,3–28,8 s | Wetter | harter Schnitt ins Close-up, Laub und Regen; „Laub & Schmutz bleiben draußen.“ | „Laub und Schmutz bleiben draußen. Und Regen, Schnee oder Sonne? Kein Problem.“ |
| 28,8–31,8 s | Wasser | Abdeckung fliegt mit dem Laub davon, Draufsicht aufs Wasser – ohne Text | – |
| 32,2–38,2 s | Endcard | beide Freisteller als versetztes Paar, „Wärme bleibt drin.“, CTA, Logo zentriert unten | „Die passende Abdeckung für euren Splash oder Drop – jetzt auf homedeluxe.de.“ |

Die Aussagen stützen sich auf die Produktseite (Luftpolster, energieeffizienter, wetterfestes PVC
gegen Regen, Schnee und UV, Schutz vor Blättern, Insekten und Schmutz). Der Ton (`sound.py`, für
9:16 mit eigenem Cue-Satz `premium`) ist synthetisch. Im 9:16-Schnitt kommt das Voice-over dazu:
`sound.py` schneidet nur die Stille am Anfang und Ende jeder Zeile weg (Tempo und Pausen bleiben
natürlich) und legt die Musik unter die Stimme (Ducking). Beim Zusammenfügen wird auf −16 LUFS normalisiert.

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

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills
```

```bash
npm run thermo-scan:plates  # Foto, Röntgenfassung, Freisteller (build/thermo-scan/plates)
npm run thermo-scan:stills       # Kontrollbilder 1:1
npm run thermo-scan:stills:9x16  # Kontrollbilder Premium 9:16
npm run thermo-scan:render       # alle Formate parallel in Teilstücken + Ton -> projects/thermo-scan/output/
npm run thermo-scan:render:9x16  # nur den 9:16-Schnitt
```

`render.js` kennt dafür zusätzlich `--serve 1` (lokaler HTTP-Server für ES-Module), `--size WxH`,
`--query`, `--audio` und `--range a:b`. three.js rendert in Chromium über SwiftShader (Software-WebGL),
rund 3 s pro Frame in 9:16.

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur)
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
