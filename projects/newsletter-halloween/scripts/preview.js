#!/usr/bin/env node
// Full-page previews of the newsletter (desktop + mobile) and a click test:
// the clown slice must link to the voucher page, its neighbours to the product.
//
//   node scripts/preview.js <newsletter.html> <out_dir>
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const VIEWS = [
  { name: 'desktop', width: 700, scale: 1 },
  { name: 'mobile', width: 390, scale: 2 },
];

(async () => {
  const [html, out] = process.argv.slice(2);
  if (!html || !out) { console.error('usage: preview.js <newsletter.html> <out_dir>'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();

  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: 900 }, deviceScaleFactor: v.scale });
    await page.goto('file://' + path.resolve(html));
    // lazy/async-Bilder fehlen sonst im Full-Page-Screenshot (nur Vorschau, Newsletter bleibt unverändert)
    await page.evaluate(() => document.querySelectorAll('img').forEach(i => { i.removeAttribute('loading'); i.removeAttribute('decoding'); }));
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));

    // Klick-Test: Mittelpunkt des Clown-Slices und je ein Punkt links/rechts daneben
    // (boundingBox bei scrollY 0 = Seitenkoordinaten, hit() rechnet auf den Viewport um)
    const box = await page.locator('img[src="images/carport_monos_clown.jpg"]').boundingBox();
    const hit = async (x, y) => page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y - window.scrollY);
      return el && el.closest('a') ? el.closest('a').href : null;
    }, [x, y]);
    await page.evaluate(y => window.scrollTo(0, y - 300), box.y);
    const cy = box.y + box.height / 2;
    const res = {
      clown_slice_px: `${Math.round(box.width)}×${Math.round(box.height)} @ ${Math.round(box.x)},${Math.round(box.y)}`,
      center: await hit(box.x + box.width / 2, cy),
      left: await hit(box.x - 10, cy),
      right: await hit(box.x + box.width + 10, cy),
    };
    console.log(v.name, JSON.stringify(res, null, 1));
    if (!/halloween-clown/.test(res.center) || /halloween-clown/.test(res.left) || /halloween-clown/.test(res.right)) {
      console.error('Klick-Test fehlgeschlagen'); process.exitCode = 1;
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    const file = path.join(out, `preview_${v.name}.jpg`);
    await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 82 });
    console.log(file);
    await page.close();
  }
  await browser.close();
})();
