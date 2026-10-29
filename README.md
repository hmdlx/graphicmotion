# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/callado-zubehoer` | 16:9, 1920×1080, 30 fps, 34,1 s | `output/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4` + Titelbild |

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

### CALLADO Zubehör – Cinematic 3D

Kein Foliensatz, sondern ein gedrehter Film: Zaun, Pfosten, CALLUX STRIPE (LED in der Pfostennut),
CALLUX COVER (Kappe mit Lichtband), Schrägelement und CALLANUT-Profile sind als 3D-Set nachgebaut
(`scene.js`, three.js) und werden mit einer virtuellen Kamera gefilmt. Die Holzmaserung stammt aus den
Produktfotos (`scripts/wood_texture.py` setzt vier Brettausschnitte zu einer nahtlosen Textur
zusammen). Darüber liegt eine After-Effects-artige Ebene: Bloom, Tiefenunschärfe, Bewegungsunschärfe bei
Reißschwenks, Filmkorn, chromatische Aberration, anamorphe Lichtstreifen, Kinobalken (2,39:1 im
Dunkeln), an 3D-Punkte geheftete Callouts und kinetische Typo. Keine KI-generierten Bilder.

| Zeit | Einstellung |
|---|---|
| 0,0–4,2 s | Schwarz, Makro an der Pfostennut: CALLUX STRIPE zündet von unten nach oben in Zeitlupe, Staub im Licht |
| 4,2–8,4 s | Kamera zieht auf, die anderen Pfosten zünden nacheinander, Titel „CALLUX STRIPE“, Callout „Solar-LED“ |
| 8,4–12,4 s | Kran hoch zu den Kappen, die Lichtbänder zünden aus der Mitte, Lens Flares, Titel „CALLUX COVER“ |
| 12,4–16,4 s | Studiolicht flackert an, Kinobalken öffnen sich, Reißschwenk auf die Totale, Titel „CALLADO – Passendes Zubehör“ |
| 16,4–21,9 s | Reißschwenk zu CALLANUT: die beiden Profile schweben wie auf dem Produktfoto, Stirnseiten (Feder, Nut mit grauem WPC-Kern) zur Kamera, Kontur wird nachgezeichnet, Kamera kreist zur Dreiviertelansicht, „in verschiedenen Mengen“ |
| 21,9–25,9 s | Reißschwenk zum Zaunende: Schrägelement, Maßlinie zeichnet die Schräge nach |
| 25,9–30,1 s | Schnitt in den Abend: LEDs und Kappen leuchten, „Alles für deinen CALLADO.“ |
| 30,1–34,1 s | Endcard über dem unscharfen Set: Logo mit Lichtkante und Slogan |

Die Produktdaten stammen aus dem Katalog „Bauen – OBI Hausmesse 2026“, Seite 5. Maße der Modelle:
Element 170 × 180 cm, Pfosten 10 × 10 × 185 cm (Katalog); Kappe, Lichtband, Schrägelement und
Profilquerschnitte sind nach den Produktfotos geschätzt. Preise sind bewusst nicht eingebaut.
Aufschraubhülse CALMAR und Bodenbefestigung CALTERRA fehlen, weil dafür keine Bilder vorlagen.

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow, ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills

npm run callado-zubehoer:textures # Holztexturen aus dem Produktfoto -> source/tex/ (nur bei neuem Foto)
npm run callado-zubehoer:render   # -> projects/callado-zubehoer/output/HomeDeluxe_CALLADO-Zubehoer_16x9.mp4 (ca. 1,5–2 s pro Frame)
npm run callado-zubehoer:stills   # Kontrollbilder nach build/callado-zubehoer/stills
```

Ist Chromium schon installiert (passt nicht zur Playwright-Version), den Pfad mitgeben:
`CHROMIUM_PATH=/pfad/zu/chrome npm run callado-zubehoer:render`.

`--webgl` (CALLADO) liefert die Seite über einen lokalen HTTP-Server aus (ES-Module und WebGL-Texturen
brauchen einen http-Origin) und schaltet WebGL per SwiftShader ein, also ohne GPU.
`--range 12,17` rendert nur einen Ausschnitt (Sekunden), `--audio datei.wav` legt eine Tonspur an.

Ein einzelnes Frame lässt sich auch im Browser prüfen:
`projects/laguna-m/composition.html?t=4.6` (Zeit in Sekunden, Plates müssen unter `build/` liegen)
oder CALLADO über einen HTTP-Server aus dem Repo-Root, z. B. `python3 -m http.server` und dann
`/projects/callado-zubehoer/composition.html?t=12` (`&nobloom`, `&nobokeh` schalten Effekte zum Prüfen ab).

## Struktur

```
assets/fonts/poppins/     Poppins 400–800 (latin, OFL)
assets/logo/              Home-Deluxe-Logo (weiß und navy, SVG)
scripts/prepare_plates.sh Hochskalieren + Grading der Quelle
scripts/track_points.py   Template-Tracking für Marker, die am Bild kleben
scripts/wood_texture.py   nahtlose Holztextur + Bump-Map aus Brettausschnitten eines Fotos
scripts/render.js         Chromium -> PNG-Frames -> ffmpeg (H.264 + stumme AAC-Spur), Bühnengröße aus COMP.W/H
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).

Bei CALLADO Zubehör stehen die Texte in `projects/callado-zubehoer/composition.html`. In
`composition.js` stehen die Zeitleiste `T` (LED-Zündzeiten, Licht an, Abend, Endcard), die Kamera-
einstellungen `TAKES` (Positionen, Blickpunkte, Brennweite, Blende), die Titel `TITLES` und die
Callouts. Das 3D-Set mit Maßen, Materialien und Licht steht in `scene.js`; das CALLANUT-Set für die
Profilansicht steht abseits (`HERO`), damit es in keiner anderen Einstellung zu sehen ist.
