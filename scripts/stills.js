#!/usr/bin/env node
// Render a static HTML creative once per format (Chromium via Playwright).
//
//   node scripts/stills.js <creative.html> <out_dir> <basename> 1x1=1080x1080 4x5=1080x1350@2.4 ...
//
// An optional @<scale> renders at that deviceScaleFactor: the page is laid out at W/scale x H/scale
// CSS pixels and the PNG still comes out at W x H.
// The page gets ?f=<format> and must expose window.READY (a promise).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const [html, outDir, base, ...formats] = process.argv.slice(2);
  if (!html || !outDir || !base || !formats.length) {
    console.error('usage: stills.js <creative.html> <out_dir> <basename> <name=WxH[@scale]> [...]');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const spec of formats) {
    const [name, rest] = spec.split('=');
    const [size, scale = '1'] = rest.split('@');
    const [w, h] = size.split('x').map(Number);
    const dpr = Number(scale);
    const page = await browser.newPage({ viewport: { width: Math.ceil(w / dpr), height: Math.ceil(h / dpr) }, deviceScaleFactor: dpr });
    page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
    await page.goto('file://' + path.resolve(html) + '?f=' + encodeURIComponent(name));
    await page.evaluate(() => window.READY);
    const file = path.join(outDir, `${base}_${name}.png`);
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: w / dpr, height: h / dpr } });
    console.log(file);
    await page.close();
  }
  await browser.close();
})();
