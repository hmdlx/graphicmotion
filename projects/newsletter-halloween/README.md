# Newsletter Halloween-Edition (KW44)

Halloween-Version des KW43-Newsletters „New Ins“ mit Suchspiel: Im Newsletter versteckt sich
ein Clown. Wer ihn anklickt, landet auf einer Seite mit dem Gutscheincode – **50 € ab 500 €
Bestellwert**.

Vorschau: `output/preview/preview_desktop.jpg`, `output/preview/preview_mobile.jpg`
Auflösung: `output/aufloesung_carport_mit_clown.jpg`

## Wo ist der Clown?

Im Foto vom **Carport MONOS**: Er lugt hinter der Hecke rechts neben dem Auto hervor (rote Nase,
weißer Handschuh). Das Foto ist in 5 Slices geschnitten. Nur der Clown-Slice (Spalte 20 % der
Breite, Desktop 128 × 96 px, Mobil ca. 78 × 59 px) verlinkt auf die Gutschein-Seite, alle
anderen Slices weiter auf das Produkt.

## Was gegenüber KW43 geändert ist

| Bereich | KW43 | Halloween-Edition |
|---|---|---|
| Betreff-`<title>` / Preheader | New Ins … / Kombisauna EVEREST, Whirlpool SUNSHINE … | 🎃 Halloween-Edition: Finde den Clown! / Psst … in dieser Mail versteckt sich ein Clown 🤡 … |
| Hero | „NEW INS“ auf Weiß + Sauna-Foto | Navy-Band „HALLOWEEN – FINDE DEN CLOWN & sichere dir 50 €“ + Sauna mit Kürbissen, Kerzen, Spinnennetz, Abendstimmung |
| Intro | ✨ New Ins … / Draußen frisch, drinnen heiß. | 🎃 Halloween bei Home Deluxe 🎃 / Draußen gruselig, drinnen heiß. |
| **neu** nach dem Intro | – | Suchspiel-Block: Grafik „FINDE DEN CLOWN“ + 50-€-Gutschein, Spielregel als Live-Text |
| Whirlpool SUNSHINE | … auch bei Frost. | … auch in der Geisternacht. |
| Carport MONOS | ein Bild | Bild mit verstecktem Clown, in Slices |
| Navy-Band unten | Neu im Shop … | Happy Halloween! 🎃 Schon den Clown gefunden? Kleiner Tipp: Er versteckt sich irgendwo zwischen Sauna und Mülltonne. |
| Footer | – | Aktionsbedingungen (**) |
| UTM | `utm_campaign=KW43` | `utm_campaign=KW44_Halloween`, Clown-Link zusätzlich `utm_content=clown` |

Alle Produkte, Preise und Produktlinks sind unverändert.

## Vor dem Versand festlegen

Die folgenden Werte sind Vorschläge und stehen als Konstanten oben in `scripts/build_newsletter.py`
(Gutscheincode und Datum zusätzlich im Text von `output/landingpage/clown-gefunden.html`
und `graphics/teaser.html`):

- **Gutscheincode** `CLOWN50` – im Shop anlegen: 50 € Rabatt, Mindestbestellwert 500 €, einmal pro Kunde.
- **Gültig bis** 02.11.2026, 23:59 Uhr.
- **Ziel des Clowns** `https://www.homedeluxe.de/halloween-clown/` – Seite im Shop-CMS anlegen,
  Inhalt aus `output/landingpage/clown-gefunden.html` (Block `<section class="hd-clown">`
  samt `<style>`, Bild `clown.jpg`). Die Seite ist `noindex`, damit der Code nicht über Google
  auffindbar ist.

## In JUNE übernehmen

Der Newsletter bindet die neuen Bilder relativ ein (`images/…`). Die Dateien aus
`output/images/` in JUNE hochladen und die Pfade durch die CDN-URLs ersetzen; alle übrigen
Bilder kommen weiter vom bestehenden CDN.

## Bauen

```bash
npm run halloween:build     # alles: Grafiken -> Bilder -> HTML -> Vorschau + Klick-Test
```

Einzelschritte:

| Skript | macht |
|---|---|
| `halloween:graphics` | `graphics/*.html` (Poppins, CI) per Chromium -> `build/newsletter-halloween/graphics/*.png` |
| `halloween:images` | Hero zusammensetzen, Clown ins Carport-Foto, Slices schneiden, Landingpage-Bild -> `output/images/` |
| `halloween:html` | `source/newsletter-new-ins-kw43.html` -> `output/newsletter-halloween-kw44.html` |
| `halloween:preview` | Ganzseiten-Vorschau Desktop/Mobil + Test, dass nur der Clown-Slice auf die Gutschein-Seite führt |

## Bildquellen

- `source/hero_new-ins_kw43.jpg`, `source/carport_monos.jpg`: Originale aus dem KW43-Newsletter.
- `source/ki/hero_sauna_halloween_2048.jpg`: Halloween-Deko per KI (Nano Banana 2.1 via Higgsfield)
  auf das Original-Foto. Das Glas-Logo mit Claim „WIR MACHEN DEIN ZUHAUSE“ wird beim Bauen aus
  dem Original zurückgesetzt, weil die KI den kleinen Claim verfälscht hat.
- `source/ki/carport_monos_clown_2048.jpg`: Clown per KI (Nano Banana 2.1 via Higgsfield). Beim
  Bauen wird nur der Clown-Bereich ins Originalfoto übernommen, Carport und Auto bleiben original.
