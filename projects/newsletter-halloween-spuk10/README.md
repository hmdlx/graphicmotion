# Newsletter Halloween – Fallback mit Code SPUK10 (KW44)

Ersatz für die Clown-Edition (`projects/newsletter-halloween` auf Branch
`claude/tender-noether-hi9zre`), falls Landingpage und Pop-up nicht rechtzeitig laufen: kein
Suchspiel, kein Pop-up – alle Empfänger bekommen direkt den Code **SPUK10 = 10 % Rabatt**.

Aufbau wie die Clown-Edition (Hero mit Kopfband und Clown-GIF, direkt darunter der
Navy-Gutscheinblock, Intro, zwei große Produkte, Made-in-Germany-Block mit USPs und Karten,
drittes großes Produkt, vier 2er-Raster, Navy-Band, Footer aus dem JUNE-Export). Neu sind die
Produkte, die Texte, Orange als Akzent und die Halloween-Motive (Kürbisse, Fledermäuse, Spinne,
Spinnennetz, Mond).

## Hero

Kopfband „HALLOWEEN – 10 % RABATT mit Code SPUK10“ (eigene Grafik mit Kürbissen) und darunter das
Clown-GIF der Clown-Edition: Der Clown im Home-Deluxe-Hoodie kommt hinter dem Sofa hervor und
setzt sich (640 × 320 px, 8,1 s, Endlosschleife, 394 KB). Es wird direkt vom CDN eingebunden
(`HERO_GIF` in `scripts/build_newsletter.py`), muss also nicht hochgeladen werden. Das erste Bild
zeigt den sitzenden Clown – Outlook für Windows zeigt nur dieses. Beide Bilder führen in den Shop
(`utm_content=hero`), weil der Code für alles gilt.

Das GIF beginnt und endet in Navy. Das Kopfband endet deshalb unten in reinem Navy (der
Kürbisschein hört vorher auf), und der Navy-Gutscheinblock steht direkt unter dem GIF – so gibt es
oben und unten keine Kante.

Zum Ansehen und Weitergeben: `output/vorschau/newsletter-halloween-spuk10_vorschau.html` (eigene
Grafiken eingebettet, Shopfotos und GIF laden online vom CDN; rund 0,5 MB – die frühere Fassung
mit allen Bildern eingebettet war 2,5 MB groß und wurde im Viewer vor den unteren Produkten und dem
Footer abgeschnitten). Screenshots: `output/preview/`.

## Inhalt

| Block | Produkt | Bild | Preis |
|---|---|---|---|
| Hero „HALLOWEEN – 10 % Rabatt mit Code SPUK10“ | Klick → Shop | Kopfband mit Kürbissen + Clown-GIF (CDN) | – |
| Gutscheinblock (Navy) | Grafik „Süßes oder Saures?“ mit Gutschein 10 % / SPUK10, Code als echter Text im Kasten, Button „Jetzt 10 % sparen“ → Shop | Grafik | – |
| Intro „Wohlig warm durch die Gruselnacht“ | CTA: Alle Saunen | – | – |
| Hier knistert’s – aber nur im Ofen. | Fasssauna mit Holzofen LAGOM DELUXE | Shopfoto | 4.999 € |
| Schwarz wie ein Hexenkessel | Freistehende Badewanne CODO Schwarz | Shopfoto | 799 € |
| Kürbis-Trenner | – | Grafik | – |
| Holzvorrat für lange Gruselnächte | Holzlege ANTARES 3er-Set, USPs (Handarbeit, Edelrost, erweiterbar) | Shopfoto | – |
| Produktkarten | Holzlege ANTARES · Holzlager NANGA | Shopfotos mit Holz | 119 € · 299 € |
| Gruselfilm-Abend? | Modulares Sofa ORLENA (Samt Anthrazit) | Shopfoto | ab 349 € |
| Kürbis-Trenner | – | Grafik | – |
| Raster | Massagesessel ELVORA Schwarz · Hängesessel CIELO Schwarz | Shopfotos | 1.849 € · 199 € |
| Raster | Schaukelstuhl NARA · Home Deluxe Bademantel | Shopfotos | 129 € · 39 € |
| Raster | Infrarotkabine NERO · Dampfdusche BLACK PEARL 90 × 90 cm | Shopfotos | ab 1.199 € · 1.049 € |
| Raster | Sitzsack COZY Anthrazit mit Hocker · LED-Solarlampe CLARA (Stehlampe) | Shopfotos | 189 € · 49 € |
| Navy-Band | Kürbisreihe, „Happy Halloween! Nicht vergessen: Mit dem Code SPUK10 …“ | Grafik + Text | – |

Kein Produkt aus der Clown-Edition (LAHTI XL, SKANDI M, FRANK, SWING, CASARA, CALOR, DUNES, DUBI,
RUBY) und keins aus KW43 (EVEREST, SUNSHINE, MONOS …). Namen, Links, Preise und Merkmale stammen
von den Produktseiten auf homedeluxe.de (Stand 30.10.2026, alle lieferbar) und stehen gesammelt
oben in `scripts/build_newsletter.py` (`P`). Preise vor dem Versand gegenprüfen. Bei ORLENA und
NERO steht der günstigste Variantenpreis („ab“), bei CLARA der Preis der Stehlampe im Foto (die
Tischlampe kostet 29 €). Die Produktfotos kommen unverändert direkt vom Shop-CDN
(`cdn02.plentyone.com`, `SHOP_IMG` im Skript); Kürbisse und andere Motive sind eigene Grafiken ohne KI. Das Hero-GIF stammt aus der Clown-Edition (dort per KI-Video
aus dem vorgegebenen Clown-Bild erstellt).

Farben: CI-Navy `#0e2234`, Weiß, Grautöne. Akzent ist das Orange der Shop-Badges `#FF9800`
(Flächen, Code, USP-Linien, Schrift auf Navy, Kontrast 7,5:1); orange Schrift auf Weiß in
`#C25400` (4,6:1). Der Haupt-Button ist orange mit Navy-Schrift, die Produkt-Buttons bleiben Navy.

## Vor dem Versand festlegen

Die Werte stehen als Konstanten oben in `scripts/build_newsletter.py`; Datum und Code zusätzlich
in `graphics/teaser.html` und `graphics/kopf.html`.

- **Gutscheincode** `SPUK10` im Shop anlegen: 10 % auf die Bestellung, einmal pro Kunde.
- **Gültig bis** 02.11.2026, 23:59 Uhr (wie die Clown-Aktion).
- **Aktionsbedingungen** (Footer) sind ein Vorschlag: nicht mit anderen Gutscheinen/Aktionen
  kombinierbar, keine Barauszahlung, Geschenkgutscheine ausgenommen. An die Einstellungen des
  Codes im Shop anpassen.
- Tracking: `utm_campaign=KW44_Halloween_SPUK10`, damit sich der Fallback von der Clown-Edition
  (`KW44_Halloween`) unterscheiden lässt. `utm_content` markiert Hero, Gutscheingrafik und Button.

## Mobil

Der JUNE-Export setzt auf Handys jedes `<p>` auf 12 px (`!important`). Der Code im Kasten und die
Überschrift im Holz-Block stehen deshalb in `<div>`s und bleiben groß.

## Textversion

`output/newsletter-halloween-spuk10.txt` ist der Plain-Text-Teil der Mail (UTF-8, Zeilen bis 72
Zeichen, URLs ungebrochen), mit dem Code in einem Kasten direkt oben. Footer-Hinweis und
Rechtslinks kommen aus dem JUNE-Export. In JUNE prüfen, ob der Abmeldelink in der Textversion
durch den personalisierten Link ersetzt wird (im Export steht `…/newsletter/unsubscribe/?folderId=0`).

## In JUNE übernehmen

Hochzuladen sind nur noch die sechs eigenen Bilder aus `output/images/` (Kopfband, Gutschein-
Teaser, Kürbis-Trenner, Kürbisreihe, die beiden Kartenbilder); danach die relativen Pfade
(`images/…`) durch die CDN-URLs ersetzen. Produktfotos, Hero-GIF, Logo, Social-Icons und
Trusted-Shops-Siegel kommen bereits vom CDN.

## Bauen

```bash
npm run spuk10:build     # alles: Grafiken -> Bilder -> HTML -> Vorschau + Prüfungen
```

Playwright muss auffindbar sein (`npm install` oder `NODE_PATH=$(npm root -g)`).

| Skript | macht |
|---|---|
| `spuk10:graphics` | `graphics/*.html` per Chromium -> `build/newsletter-halloween-spuk10/graphics/*.png` (Kopfband, Gutschein-Teaser, Kürbis-Trenner, Kürbisreihe); Motive aus `graphics/halloween.js` |
| `spuk10:images` | Grafiken (Kopfband, Teaser, Deko) als JPG, Kartenbilder ANTARES/NANGA zugeschnitten -> `output/images/` |
| `spuk10:html` | Kopf, Navigation und Footer aus `source/newsletter-new-ins-kw43.html`, Inhaltsblöcke neu -> `output/newsletter-halloween-spuk10.html` + Textversion `.txt` |
| `spuk10:preview` | Ganzseiten-Vorschau Desktop/Mobil; prüft: kein Clown-/Pop-up-Link, alle Bilder da (auch das GIF vom CDN), Code als Text, alle Shop-Links mit Kampagne, Kopfband und GIF → Shop, Gutscheingrafik → Shop, kein horizontales Scrollen |
| `spuk10:vorschau` | Vorschau mit eingebetteten eigenen Grafiken -> `output/vorschau/` (nicht für den Versand: Gmail zeigt eingebettete Bilder nicht) |
