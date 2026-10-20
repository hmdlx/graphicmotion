#!/usr/bin/env node
// Render an HTML composition frame by frame (Chromium via Playwright) and
// pipe the PNG frames into ffmpeg.
//
//   node scripts/render.js <composition.html> <out.mp4> --plates <dir> [--audio <track.wav>]
//   node scripts/render.js <composition.html> <out_dir> --plates <dir> --stills 1,4.5,18
//
// The composition must expose window.COMP = { FPS, TOTAL, seek(n), ready }.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const [comp, out, ...rest] = argv;
  const opts = { comp, out };
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!comp || !out || !opts.plates) {
    console.error('usage: render.js <composition.html> <out.mp4|out_dir> --plates <dir> [--stills t1,t2]');
    process.exit(1);
  }
  return opts;
}

function writeFrame(stream, buf) {
  return stream.write(buf) ? Promise.resolve() : new Promise(r => stream.once('drain', r));
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const url = 'file://' + path.resolve(opts.comp) + '?plates=' + encodeURIComponent('file://' + path.resolve(opts.plates));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.evaluate(() => window.COMP.ready);
  const { FPS, TOTAL } = await page.evaluate(() => ({ FPS: window.COMP.FPS, TOTAL: window.COMP.TOTAL }));

  if (opts.stills) {
    fs.mkdirSync(opts.out, { recursive: true });
    for (const s of opts.stills.split(',')) {
      const n = Math.round(parseFloat(s) * FPS);
      await page.evaluate(n => window.COMP.seek(n), n);
      const file = path.join(opts.out, `still_${String(n).padStart(4, '0')}.png`);
      await page.screenshot({ path: file, type: 'png' });
      console.log(file);
    }
    await browser.close();
    return;
  }

  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...(opts.audio ? ['-i', opts.audio] : ['-f', 'lavfi', '-t', String(TOTAL / FPS), '-i', 'anullsrc=r=48000:cl=stereo']),
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', opts.audio ? '192k' : '128k', '-shortest', '-movflags', '+faststart',
    opts.out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));

  const t0 = Date.now();
  for (let n = 0; n < TOTAL; n++) {
    await page.evaluate(n => window.COMP.seek(n), n);
    await writeFrame(ff.stdin, await page.screenshot({ type: 'png' }));
    if (n % 60 === 0) console.log(`frame ${n}/${TOTAL} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`done -> ${opts.out}`);
})().catch(e => { console.error(e); process.exit(1); });
