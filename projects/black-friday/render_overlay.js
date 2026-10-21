#!/usr/bin/env node
// Rendert die transparente Grafik-Ebene (overlay.html) als PNG-Frames mit Alpha.
//
//   node render_overlay.js <out_dir>            alle Frames aus COMP.ranges -> <out_dir>/o%04d.png
//   node render_overlay.js <out_dir> 300,420    nur diese Output-Frames
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const [out, only] = process.argv.slice(2);
  if (!out) { console.error('usage: render_overlay.js <out_dir> [n1,n2,...]'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto('file://' + path.resolve(__dirname, 'overlay.html'));
  await page.evaluate(() => window.COMP.ready);
  let frames;
  if (only) frames = only.split(',').map(Number);
  else {
    const ranges = await page.evaluate(() => window.COMP.ranges);
    frames = ranges.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i));
  }
  for (const n of frames) {
    await page.evaluate(n => window.COMP.seek(n), n);
    await page.screenshot({ path: path.join(out, `o${String(n).padStart(4, '0')}.png`), omitBackground: true });
  }
  await browser.close();
  console.log(`${frames.length} Frames -> ${out}`);
})().catch(e => { console.error(e); process.exit(1); });
