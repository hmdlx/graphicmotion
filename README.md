# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/thermo-scan` | 9:16 (1080×1920) + 1:1 (1080×1080), 30 fps, 26 s, mit Sounddesign | `output/HomeDeluxe_SPLASH-THERMO_Thermo-Scan_9x16.mp4`, `…_1x1.mp4` + Titelbilder |

### SPLASH THERMO – Thermo-Scan

Hochwertiger Content-Clip zur aufblasbaren Thermoabdeckung SPLASH THERMO (nicht für den
Newsletter). Basis sind das Ambientebild und der 3/4-Freisteller aus dem Shop; alle weiteren
Perspektiven entstehen in einer prozedural gebauten three.js-Szene (`scene.js`) nach den
Produktmaßen: Whirlpool Ø 208 × 70 cm mit Drop-Stitch-Wänden, Abdeckung 162 × 162 × 20 cm mit
sieben Luftkammern und Ventil. Keine KI-Generierung, keine Credits.

| Zeit | Einstellung | Inhalt |
|---|---|---|
| 0,0–2,9 s | Foto | Ambientebild mit Push-in, Titel „Wärme bleibt drin.“ |
| 2,9–4,9 s | Thermo-Scan | Scanlinie legt die Röntgenansicht frei (Konturen + Wärmebild), Match-Cut in die 3D-Szene |
| 4,9–8,2 s | Querschnitt | Kamerafahrt in die Seitenansicht, Schnittebene teilt Pool und Abdeckung; Callouts Luftpolster / PVC / Badewasser |
| 8,2–11,9 s | Wärmebild | Abdeckung hebt ab → Wärme entweicht, Wasser kühlt aus; Abdeckung sitzt wieder → Wärme bleibt. 01 Wärmeschutz |
| 11,6–15,2 s | Produkt | Scan-Wipe vom Röntgen- in den Studio-Look, Abdeckung schwebt mit Maßlinien Ø 162 cm / 20 cm. 02 Handling |
| 15,2–19,0 s | Wetter | Herbstlaub fällt auf die Abdeckung, Regen mit Aufprallringen auf dem PVC. 03 Schutz |
| 19,0–21,9 s | Wasser | Abdeckung fliegt mit dem Laub davon, Draufsicht auf klares Wasser mit Kaustiken. 04 Wasserqualität |
| 22,2–26,0 s | Endcard | Freisteller, Maße, CTA „Jetzt entdecken“ + homedeluxe.de, Hinweis auf DROP THERMO |

Die Aussagen stützen sich auf die Produktseite (Luftpolster, energieeffizienter, wetterfestes PVC
gegen Regen, Schnee und UV, Schutz vor Blättern, Insekten und Schmutz, kristallklarer Badespaß).
Beide Formate kommen aus derselben Timeline; die horizontale Brennweite ist fest, 9:16 bekommt
dadurch Luft über und unter dem Produkt für Texte. Der Ton (`sound.py`) ist komplett synthetisch
und wird beim Zusammenfügen auf −16 LUFS normalisiert.

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
npm run thermo-scan:stills  # Kontrollbilder 9:16
npm run thermo-scan:render  # beide Formate parallel in Teilstücken + Ton -> projects/thermo-scan/output/
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
