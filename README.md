# graphicmotion

Motion-Graphics-Pipeline für Home-Deluxe-Videos. Jede Komposition ist eine HTML-Seite
(CI: Navy `#0e2234`, Weiß, Grautöne, Poppins, eckige Ecken), die Chromium Frame für Frame
rendert. ffmpeg schreibt die Frames anschließend als MP4.

## Projekte

| Projekt | Format | Ergebnis |
|---|---|---|
| `projects/laguna-m` | 9:16, 1080×1920, 30 fps, 18,5 s | `output/HomeDeluxe_Laguna-M_Reel_9x16.mp4` + Titelbild |
| `projects/staffelrabatt-black-week` | 9:16, 1080×1920, 30 fps, 38 s, deutsches Voice-over, Musik + Sounds | `output/HomeDeluxe_BlackWeek_Staffelrabatt_9x16.mp4` |
| `projects/whirlpool-rechenbeispiel` | 9:16, 1080×1920, 30 fps, 57 s, Voice-over, Musik + Sounds | `output/HomeDeluxe_BlackWeek_Whirlpool-Rechenbeispiel_9x16.mp4` |
| `projects/whirlpool-premium` | 9:16, 1080×1920, 30 fps, 54 s, ruhiges Voice-over, Musik + Sounds | `output/HomeDeluxe_BlackWeek_Whirlpools_Premium_9x16.mp4` |

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

Ton: Voice-over, Musik und Animations-Sounds. `scripts/sound_design.py` synthetisiert alles selbst (keine
Samples, keine Lizenzen) und legt es auf die Ereignisse, die `composition.js` über `COMP.events()` ausgibt
(`scripts/dump_events.js`): 120-BPM-Bett in a-Moll (Am–F–C–G) mit Swell im Intro, Beat-Einsatz, wenn das
iPhone einfliegt, Breakdown beim Tippen des Codes und Schluss-Akkord auf der Endcard; Whooshes für jede
Kamerafahrt, Pops, Tap-Klicks, „Pling“ beim Warenkorb, aufsteigende Chimes beim Freischalten jeder Stufe,
Tastenklicks, Münz-Sound bei „−150 €“. Die Musik wird unter der Stimme automatisch abgesenkt, der Mix auf
−14 LUFS normalisiert.

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

### Whirlpool-Rechenbeispiel zum Staffelrabatt

Rechnet den Black-Week-Staffelrabatt an drei Whirlpools aus dem Shop vor (Preise Stand 26.10.2026):

| Stufe | Whirlpool | Preis | Geschenk | Du zahlst |
|---|---|---|---|---|
| ab 100 € | SPLASH Beige, aufblasbar, 6 Personen | 349 € | 15 € (`BLACK15`) | 334 € |
| ab 500 € | DROP inkl. Kissen, Getränkehalter und Sonnendach | 529 € | 75 € (`BLACK75`) | 454 € |
| ab 1.000 € | HORIZON ohne Treppe und Thermoabdeckung | 2.499 € | 150 € (`BLACK150`) | 2.349 € |

Schneller Erklär-Stil: Kinetic Type mit Überschwung und Slams, Polaroid-Sticker, Coupons, schwingende
Preisschilder, handgezeichnete Pfeile, Kreise und Unterstreichungen, Rechen-Karten mit Zählern,
„GESCHENKT“-Stempel, Kamera-Punch-ins und Shakes, Whip-Pans und ein Zoom-Durchflug zwischen den
Szenen, am Ende Warenkorb mit Cursor, der den Code eintippt. Farben bleiben Navy/Weiß (CI).

| Zeit | Voice-over | Bild |
|---|---|---|
| 0,35 s | „Wie viel schenken wir dir in der Black Week beim Whirlpool? Wir rechnen’s vor!“ | Kinetic Type, Polaroid-Collage, Rechen-Sticker |
| 4,65 s | „Ab 100 € schenken wir dir 15 €, ab 500 € 75 € – und ab 1.000 € sogar 150 €.“ | drei Coupons fliegen ein, Kreis um 150 € |
| 13,3 s | Beispiel 1: SPLASH für 349 € – mit BLACK15 15 € geschenkt, du zahlst 334 € | Polaroid, Preisschild, Rechen-Karte |
| 24,7 s | Beispiel 2: DROP für 529 € – mit BLACK75 75 € geschenkt, macht 454 € | Feature-Sticker, Rechen-Karte |
| 37,6 s | Beispiel 3: HORIZON für 2.499 € – mit BLACK150 150 € geschenkt, du zahlst 2.349 € | Zoom-Durchflug, Rechen-Karte |
| 50,15 s | „Code im Warenkorb eingeben, fertig. Nur in der Black Week auf homedeluxe.de.“ | Warenkorb mit Cursor, Endcard mit Coupons, CTA, Polaroids |

Die Wortanker (wann welches Element aufpoppt) stehen in `composition.js` (`EX[].T`, `O`) und
stammen aus den Sprechpausen der Voice-over-Segmente. `scripts/voiceover.py` schneidet die
TTS-Aufnahme per dynamischer Programmierung an den Pausen, die am besten zu den Textlängen passen
(Gedankenstriche pausieren oft so lang wie Satzenden). Sounds kommen als Liste aus `COMP.events()`
(`sfx: [{t, kind}]`, Musik-Abschnitte unter `music`).

### Whirlpools Premium (Apple-Stil in der Home-Deluxe-CI)

Gleiches Rechenbeispiel wie oben, aber hochwertig und ruhig: viel Weißraum, große Typo mit enger
Laufweite (Poppins 600/700), weiche Blur-Reveals Wort für Wort, Haarlinien-Tabelle für die Stufen,
je Whirlpool erst das Lifestyle-Foto mit maskiertem Reveal, dann das Produkt frei auf Weiß mit
Schatten. Preise rollen wie ein Zählwerk, der alte Preis tritt zurück und wird durchgestrichen.
Ruhige Stimme (Gemini TTS „Algieba“), kurzer Text, warme Musik (`style: 'calm'` in
`scripts/sound_design.py`: Pad, sparsames Piano-Motiv mit Echos, weicher Puls, Bloom am Ende) und sehr
dezente Sounds (Luft, leises Ticken beim Zählwerk, Glas-Töne).

| Zeit | Voice-over | Bild |
|---|---|---|
| 1,2 s | „Black Week bei Home Deluxe.“ | Logo-Reveal, „Black Week.“, Logo wandert nach oben |
| 4,0 s | „Je mehr du dir gönnst, desto mehr schenken wir dir.“ | zweifarbige Typo (Grau/Navy) |
| 8,2 s | „Ab 100 € schenken wir dir 15 €. Ab 500 € 75 €. Ab 1.000 € 150 €.“ | Haarlinien-Tabelle, Beträge rollen, Codes |
| 17,6 s | SPLASH, 349 € → mit unserem Geschenk 334 € | Lifestyle-Foto → Produkt auf Weiß, Zählwerk |
| 26,3 s | DROP mit Sonnendach, 529 € → 454 € | dto. |
| 35,0 s | HORIZON, 2.499 € → 2.349 € | dto. |
| 44,6 s | „Einfach den Code im Warenkorb eingeben.“ | Code-Feld, BLACK150 wird getippt, „150 € geschenkt“ |
| 48,1 s | „Black Week. Nur bei Home Deluxe.“ | Endcard mit CTA und den drei Whirlpools |

## Rendern

Voraussetzungen: Node 18+, Python 3 mit numpy + Pillow (+ scipy für den Ton), ffmpeg, Chromium für Playwright.

```bash
npm install                 # Playwright (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1, wenn Chromium schon da ist)
npm run laguna-m:plates     # Rohschnitt -> hochskalierte, leicht gegradete JPG-Plates (build/)
npm run laguna-m:track      # Punkt-Tracking -> projects/laguna-m/tracks.js (nur nötig, wenn tracking.json geändert wurde)
npm run laguna-m:render     # -> projects/laguna-m/output/HomeDeluxe_Laguna-M_Reel_9x16.mp4
npm run laguna-m:stills     # Kontrollbilder nach build/laguna-m/stills

npm run staffelrabatt:vo      # Voice-over neu erzeugen (nur bei Textänderung; braucht Gemini-API-Zugang)
npm run staffelrabatt:render  # Ton (Voice-over + Musik + Sounds) mischen + Video rendern -> projects/staffelrabatt-black-week/output/HomeDeluxe_BlackWeek_Staffelrabatt_9x16.mp4
npm run staffelrabatt:remux   # nur den Ton neu mischen und ins fertige MP4 legen (ohne Frames neu zu rendern)
npm run staffelrabatt:stills  # Kontrollbilder nach build/staffelrabatt-black-week/stills

npm run whirlpool:render      # Ton mischen + Video -> projects/whirlpool-rechenbeispiel/output/HomeDeluxe_BlackWeek_Whirlpool-Rechenbeispiel_9x16.mp4
npm run whirlpool:remux       # nur den Ton neu mischen und ins fertige MP4 legen
npm run whirlpool:stills      # Kontrollbilder nach build/whirlpool/stills

npm run premium:render        # Ton mischen + Video -> projects/whirlpool-premium/output/HomeDeluxe_BlackWeek_Whirlpools_Premium_9x16.mp4
npm run premium:remux         # nur den Ton neu mischen und ins fertige MP4 legen
npm run premium:stills        # Kontrollbilder nach build/premium/stills
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
scripts/dump_events.js    Sound-Cues einer Komposition (COMP.events()) als JSON
scripts/sound_design.py   Musik + Animations-Sounds synthetisieren, mit dem Voice-over mischen
scripts/remux_audio.js    Tonspur eines fertigen MP4 ersetzen
projects/<name>/          source/, composition.html/.js, tracking.json, tracks.js, output/
```

Texte und Timings ändern: Texte stehen in `projects/laguna-m/composition.html`. In
`composition.js` stehen die Schnittliste `SHOTS` (Quell-Frames je Einstellung), die Übergänge `X`
(Output-Frames) und die Einblendzeiten der Grafiken `T` (Output-Sekunden).
