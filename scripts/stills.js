#!/usr/bin/env node
// Render a static HTML creative once per format (Chromium via Playwright).
//
//   node scripts/stills.js <creative.html> <out_dir> <basename> 1x1=1080x1080 4x5=1080x1350 ...
//
// The page gets ?f=<format> and must expose window.READY (a promise).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const [html, outDir, base, ...formats] = process.argv.slice(2);
  if (!html || !outDir || !base || !formats.length) {
    console.error('usage: stills.js <creative.html> <out_dir> <basename> <name=WxH> [...]');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const spec of formats) {
    const [name, size] = spec.split('=');
    const [width, height] = size.split('x').map(Number);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
    await page.goto('file://' + path.resolve(html) + '?f=' + encodeURIComponent(name));
    await page.evaluate(() => window.READY);
    const file = path.join(outDir, `${base}_${name}.png`);
    await page.screenshot({ path: file, type: 'png' });
    console.log(file);
    await page.close();
  }
  await browser.close();
})();
