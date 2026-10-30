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
| `landingpages/halloween-clown/index.html` | Newsletter-Halloween-Suchspiel: 8 Produkte, ein gruseliger Clown öffnet ein Pop-up mit 50 € Gutschein ab 500 € Einkaufswert |

Die Seite kommt ohne Style-Tag aus: alle Styles stehen inline, damit der Block direkt in einen
CMS-Block (Plenty, Shopify) passt. Kopiert wird alles zwischen `CMS-BLOCK START` und `CMS-BLOCK ENDE`.

- Look: hell und ruhig im Aufbau der Apple-„Why Mac“-Seite (Referenz vom Kunden). Farben vor allem
  Navy `#0f2334` und Weiß `#fefefe`, Orange `#ff6a00` nur als Akzent, Poppins 500–700, runde Karten.
  Mobile first: Grundgrößen für ~390 px, nach oben per `clamp()` und `auto-fit`-Grids skaliert,
  keine Media Queries.
- Aufbau: 1 Hero (zentriert: „Finde den Clown.“ als `h1`, schwebende Haus-Ballons, Text, Buttons),
  2 Video-Karte „Er ist schon da.“ mit dem Clown-Video, 3 „Draußen spukt’s. Drinnen nicht.“ mit zwei
  Produkten, 4 Verlaufskarte „Schaurig gemütlich.“, 5 dunkle Karte „Psst … er beobachtet dich.“,
  6 Spielregeln als Kacheln, 7 Produktübersicht „Welches Produkt passt zu dir?“ (8 Produkte),
  8 Service-Leiste (0 % Finanzierung, versandfrei, Stores) und Fußnote.
- Das Video (`media/hdx-halloween-hero.mp4`, 5 s, stumm, mit Standbild) liegt in den Shopify-Dateien
  und wird vom Shopify-CDN geladen.
- Der Clown sieht aus wie der im Video: orange Haare, blauer Hoodie, blauer Ballon mit Haus. Er lugt
  in der Produktübersicht von rechts ins Bild des Massagesessels DUNES, taucht auf und ab und hat rot
  glühende Augen. Definiert ist er einmal als `#hdx-clown` und wird per `<use>` im Bild und im Pop-up
  gezeigt.
- Motion-Elemente, alle als SVG-Animation (SMIL): schwebende Ballons, Fledermäuse, Spinne am Faden,
  Nebel in den Navy-Karten, glühende Augen und ein wanderndes Auge in der dunklen Karte.
- Das Pop-up nutzt die Popover-API (`popover` / `popovertarget`) und funktioniert damit ohne
  JavaScript. Das kleine Script am Ende ist optional: Fallback für alte Browser, „Code kopieren“,
  `dataLayer`-Event `halloween_clown_gefunden` und Pause aller Animationen bei reduzierter Bewegung.
- Gutscheincode `CLOWN50` (`id="hdx-gs-code"`) und die Bedingungen (gültig bis 31.12.2026, stehen im
  Pop-up und in der Fußnote) sind Platzhalter: vor dem Versand den echten Code und die echten
  Bedingungen eintragen.
- Produktbilder kommen direkt aus dem Shop-CDN (`cdn02.plentyone.com`), Preise sind bewusst nicht
  eingebaut.
- Der Block füllt vollbreite Container aus und bricht aus schmalen Inhaltsspalten auf bis zu 1340 px
  aus (inline per `width:max(…)` und negativem `margin-left`).

### Shopify

Die LP liegt im Shopify-Shop als Seite `halloween-suchspiel` (SEO-ausgeblendet über das Metafeld
`seo.hidden = 1`) mit dem Seiten-Template `halloween`. Dafür braucht das Theme zwei Dateien aus
`landingpages/halloween-clown/shopify-theme/`:

| Datei | Zweck |
|---|---|
| `layout/halloween.liquid` | wie `theme.liquid`, aber ohne Header-Gruppe, Drawer und Suche; der Footer bleibt |
| `templates/page.halloween.json` | nutzt dieses Layout und gibt nur `{{ page.content }}` in einem vollbreiten Custom-Liquid-Abschnitt aus, ohne Seitentitel |
| `sections/halloween-lp.liquid` | die LP als eigener Abschnitt (ohne Einstellungen) |
| `templates/index.json` | Startseite: Layout `halloween` mit dem Abschnitt `halloween-lp` statt Black Friday |

Zusätzlich gibt es den Inhalt als Theme-Abschnitt `sections/halloween-lp.liquid` (erzeugt das
Build-Script mit). `templates/index.json` macht daraus die Startseite: Layout `halloween`, nur dieser
Abschnitt, kein Header, kein Titel. Der bisherige Black-Friday-Stand der Startseite liegt unter
`shopify-theme/backup/index.blackfriday.json`.

Die Admin-API darf das Live-Theme nicht beschreiben. Die Dateien liegen deshalb in der Theme-Kopie
„Home Deluxe Black Friday + Halloween-LP“ (Vorschau: `https://1skjwk-xt.myshopify.com/?preview_theme_id=209970823493`).
Fürs Live-Theme diese Kopie veröffentlichen. Solange das Live-Theme das
Template nicht kennt, zeigt Shopify die Seite mit dem Standard-Template (mit Header und Titel); der
Block bricht dann aus der schmalen Spalte auf bis zu 1340 px aus.

Den Seiteninhalt erzeugt:

```bash
python3 -I landingpages/halloween-clown/build_shopify_body.py   # -> landingpages/halloween-clown/shopify-body.html
```

Das Script nimmt den CMS-Block aus `index.html`, entfernt Kommentare und Zeilenumbrüche und stellt
Attribute auf einfache Anführungszeichen um, damit der Inhalt als JSON-String an `pageUpdate` (Feld
`body`) gehen kann. Shopify schreibt Tag- und Attributnamen beim Speichern klein (`viewbox`,
`animatemotion` …); der HTML-Parser des Browsers korrigiert das bei SVG wieder, alle Animationen
laufen weiter.

Achtung: Ist die Seite im Shopify-Admin geöffnet, während der Inhalt per API aktualisiert wird,
überschreibt ein Speichern im Admin den neuen Inhalt mit dem alten Stand. Vorher neu laden.

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
