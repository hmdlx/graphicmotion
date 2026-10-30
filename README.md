# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |

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

## Landingpages

| Seite | Inhalt |
|---|---|
| `landingpages/winter-clown/index.html` | Newsletter-Winter-Suchspiel: 8 Winterprodukte, versteckter Clown öffnet ein Pop-up mit 50 € Gutschein ab 500 € Einkaufswert |

Die Seite kommt ohne Style-Tag aus: alle Styles stehen inline, damit der Block direkt in einen
CMS-Block (Plenty) passt. Kopiert wird alles zwischen `CMS-BLOCK START` und `CMS-BLOCK ENDE`.

- Der Clown sitzt im Bild des Elektrokamins CALOR (unten links, schaut über den Bildrand).
- Das Pop-up nutzt die Popover-API (`popover` / `popovertarget`) und funktioniert damit ohne
  JavaScript. Das kleine Script am Ende ist optional: Fallback für alte Browser, „Code kopieren“,
  `dataLayer`-Event `winter_clown_gefunden` und Pause der Animationen bei reduzierter Bewegung.
- Schnee und Clown-Wackeln sind SVG-Animationen (SMIL), also ebenfalls ohne CSS.
- Gutscheincode `CLOWN50` (`id="hdx-gs-code"`) und die Bedingungen (gültig bis 31.12.2026, stehen im
  Pop-up und in der Fußnote) sind Platzhalter: vor dem Versand den echten Code und die echten
  Bedingungen eintragen.
- Produktbilder kommen direkt aus dem Shop-CDN (`cdn02.plentyone.com`), Preise sind bewusst nicht
  eingebaut.
- Der Block bricht aus schmalen Inhaltsspalten aus (bis 1340 px, inline per `width:min(…)` und
  negativem `margin-left`), damit er auch in Shopify-Themes mit „schmaler“ Seitenbreite voll wirkt.

### Shopify

Die LP liegt im Shopify-Shop als Seite `winter-suchspiel` (Standard-Seiten-Template, SEO-ausgeblendet
über das Metafeld `seo.hidden = 1`). Den Seiteninhalt erzeugt:

```bash
python3 -I landingpages/winter-clown/build_shopify_body.py   # -> landingpages/winter-clown/shopify-body.html
```

Das Script nimmt den CMS-Block aus `index.html`, entfernt Kommentare und Zeilenumbrüche und stellt
Attribute auf einfache Anführungszeichen um, damit der Inhalt als JSON-String an `pageUpdate` (Feld
`body`) gehen kann. Shopify schreibt SVG-Attribute beim Speichern klein (`viewbox`, `attributename` …);
der HTML-Parser des Browsers korrigiert das wieder, Schnee und Clown-Animation laufen weiter.

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
