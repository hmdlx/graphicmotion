#!/usr/bin/env node
// Render a static HTML layout (e.g. a story image) to PNG.
//
//   node scripts/still.js <page.html> <out.png> [WxH]   (default 1080x1920)
//
// The page may expose window.READY (a promise) to signal that images and fonts are in.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const [page, out, size = '1080x1920'] = process.argv.slice(2);
  if (!page || !out) { console.error('usage: still.js <page.html> <out.png> [WxH]'); process.exit(1); }
  const [width, height] = size.split('x').map(Number);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  p.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await p.goto('file://' + path.resolve(page));
  await p.evaluate(() => window.READY);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out, type: 'png' });
  await browser.close();
  console.log(out);
})().catch(e => { console.error(e); process.exit(1); });
