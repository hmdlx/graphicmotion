#!/usr/bin/env node
// Write a composition's sound cues (window.COMP.events()) as JSON.
//
//   node scripts/dump_events.js <composition.html> <out.json>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const [comp, out] = process.argv.slice(2);
  if (!out) {
    console.error('usage: dump_events.js <composition.html> <out.json>');
    process.exit(1);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(comp));
  await page.evaluate(() => window.COMP.ready);
  const ev = await page.evaluate(() => window.COMP.events());
  await browser.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(ev, null, 1));
  console.log(out);
})().catch(e => { console.error(e); process.exit(1); });
