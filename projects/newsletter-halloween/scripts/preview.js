#!/usr/bin/env node
// Full-page previews of the newsletter and the voucher pop-up (desktop + mobile), with checks:
// only the hero (header graphic, clown GIF, voucher teaser) and the two "ZUM CLOWN" buttons link to the pop-up URL,
// and the pop-up opens only with ?halloween=clown.
//
//   node scripts/preview.js <newsletter.html> <popup.html> <out_dir>
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const VIEWS = [
  { name: 'desktop', width: 700, height: 900, scale: 1 },
  { name: 'mobile', width: 390, height: 844, scale: 2 },
];
const CLOWN = /[?&]halloween=clown/;

(async () => {
  const [html, popup, out] = process.argv.slice(2);
  if (!html || !popup || !out) { console.error('usage: preview.js <newsletter.html> <popup.html> <out_dir>'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const fail = msg => { console.error('FEHLER:', msg); process.exitCode = 1; };

  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale });
    await page.goto('file://' + path.resolve(html));
    // lazy/async-Bilder fehlen sonst im Full-Page-Screenshot (nur Vorschau, Newsletter bleibt unverändert)
    await page.evaluate(() => document.querySelectorAll('img').forEach(i => { i.removeAttribute('loading'); i.removeAttribute('decoding'); }));
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));

    // Klick-Test: Mitte des Hero-Bilds -> Pop-up, Mitte des LAHTI-Bilds -> Produkt
    const hit = async sel => {
      // Seitenkoordinaten, unabhängig davon, wohin vorher gescrollt wurde
      const b = await page.locator(sel).evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; });
      await page.evaluate(y => window.scrollTo(0, y), b.y - 100);
      return page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y - window.scrollY);
        return el && el.closest('a') ? el.closest('a').href : null;
      }, [b.x + b.width / 2, b.y + b.height / 2]);
    };
    const res = {
      clown_links: await page.locator('a[href*="halloween=clown"]').count(),
      hero: await hit('a[href*="halloween=clown"] >> nth=1 >> img'),
      lahti: await hit('img[src*="LAHTI-XL-ambiente-01"]'),
    };
    console.log(v.name, JSON.stringify(res, null, 1));
    if (res.clown_links !== 5 || !CLOWN.test(res.hero) || CLOWN.test(res.lahti)) fail('Klick-Test Newsletter');

    await page.evaluate(() => window.scrollTo(0, 0));
    const file = path.join(out, `preview_${v.name}.jpg`);
    await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 82 });
    console.log(file);

    // Pop-up: ohne Parameter unsichtbar, mit ?halloween=clown offen
    const url = 'file://' + path.resolve(popup);
    await page.goto(url);
    if (await page.locator('#hd-clown-popup').isVisible()) fail('Pop-up ohne Parameter sichtbar');
    await page.goto(url + '?halloween=clown');
    await page.evaluate(() => document.fonts.ready);
    if (!(await page.locator('#hd-clown-popup .hd-pop__live').isVisible())) fail('Pop-up mit Parameter nicht offen');
    const pfile = path.join(out, `preview_popup_${v.name}.jpg`);
    await page.screenshot({ path: pfile, type: 'jpeg', quality: 85 });
    console.log(pfile);
    await page.close();
  }
  await browser.close();
})();
