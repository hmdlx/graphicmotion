#!/usr/bin/env node
// Full-page previews of the SPUK10 fallback newsletter (desktop + mobile), with checks:
// no clown/pop-up link, the code is live text (copyable, readable with images off), the hero GIF
// loads from the CDN and opens the shop, the voucher block opens the shop, every link carries the campaign.
//
//   node scripts/preview.js <newsletter.html> <out_dir>
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const VIEWS = [
  { name: 'desktop', width: 700, height: 900, scale: 1 },
  { name: 'mobile', width: 390, height: 844, scale: 2 },
];
const CODE = 'SPUK10';
const CAMPAIGN = 'utm_campaign=KW44_Halloween_SPUK10';

(async () => {
  const [html, out] = process.argv.slice(2);
  if (!html || !out) { console.error('usage: preview.js <newsletter.html> <out_dir>'); process.exit(1); }
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

    // Link unter der Bildmitte; boundingBox und elementFromPoint arbeiten beide im Viewport
    const hit = async sel => {
      const loc = page.locator(sel).first();
      await loc.scrollIntoViewIfNeeded();
      const b = await loc.boundingBox();
      return page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el && el.closest('a') ? el.closest('a').href : null;
      }, [b.x + b.width / 2, b.y + b.height / 2]);
    };
    const res = {
      clown_links: await page.locator('a[href*="halloween=clown"]').count(),
      broken_images: await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src'))),
      code_live_text: await page.evaluate(c => document.body.innerText.split(c).length - 1, CODE),
      shop_links_without_campaign: await page.evaluate(c => [...document.links].map(a => a.href)
        .filter(h => h.includes('homedeluxe.de') && !h.includes('/newsletter/unsubscribe') && !h.includes(c)), CAMPAIGN),
      hero_gif: await page.evaluate(() => { const i = document.querySelector('img[src$=".gif"]'); return i ? [i.naturalWidth, i.naturalHeight] : null; }),
      hero: await hit('img[src$=".gif"]'),
      hero_band: await hit('img[src="images/hero-band_spuk10.jpg"]'),
      teaser: await hit('img[src="images/teaser_spuk10.jpg"]'),
      horizontal_scroll: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    };
    console.log(v.name, JSON.stringify(res, null, 1));
    if (res.clown_links) fail('Clown-Link im Fallback');
    if (res.broken_images.length) fail('Bilder fehlen: ' + res.broken_images.join(', '));
    if (res.code_live_text < 3) fail('Code steht nicht als Text im Newsletter');
    if (res.shop_links_without_campaign.length) fail('Links ohne Kampagne: ' + res.shop_links_without_campaign.join(', '));
    if (!res.hero_gif || res.hero_gif[0] !== 640) fail('Hero-GIF lädt nicht');
    if (!/utm_content=hero/.test(res.hero) || !/utm_content=hero/.test(res.hero_band)) fail('Hero führt nicht in den Shop');
    if (!/utm_content=gutschein/.test(res.teaser)) fail('Gutschein-Grafik führt nicht in den Shop');
    if (res.horizontal_scroll) fail('horizontales Scrollen');

    await page.evaluate(() => window.scrollTo(0, 0));
    const file = path.join(out, `preview_${v.name}.jpg`);
    await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 82 });
    console.log(file);
    await page.close();
  }
  await browser.close();
})();
