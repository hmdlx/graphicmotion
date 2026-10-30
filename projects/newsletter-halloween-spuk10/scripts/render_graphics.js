#!/usr/bin/env node
// Render the static newsletter graphics (HTML, Poppins) to PNG via Chromium.
//
//   node scripts/render_graphics.js <out_dir>
//
// Every element with a data-out attribute in graphics/*.html is captured at its
// own CSS size as <data-out>.png, with a transparent background where the design
// has none (clown layers, bats).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const out = process.argv[2];
  if (!out) { console.error('usage: render_graphics.js <out_dir>'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const dir = path.join(__dirname, '..', 'graphics');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    await page.goto('file://' + path.join(dir, f));
    await page.evaluate(() => document.fonts.ready);
    for (const el of await page.locator('[data-out]').all()) {
      const file = path.join(out, (await el.getAttribute('data-out')) + '.png');
      await el.screenshot({ path: file, omitBackground: true });
      console.log(file);
    }
  }
  await browser.close();
})();
