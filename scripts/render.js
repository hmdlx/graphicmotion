#!/usr/bin/env node
// Render an HTML composition frame by frame (Chromium via Playwright) and
// pipe the PNG frames into ffmpeg.
//
//   node scripts/render.js <composition.html> <out.mp4> --plates <dir>
//   node scripts/render.js <composition.html> <out_dir> --plates <dir> --stills 1,4.5,18
//
// Optional:
//   --size 1080x1080      viewport (default 1080x1920)
//   --serve 1             serve the repo over http://127.0.0.1 instead of file://
//                         (needed for ES-module compositions, e.g. three.js)
//   --query k=v&k2=v2     extra URL parameters for the composition
//   --audio <file.wav>    soundtrack instead of the silent AAC track
//   --range a:b           render only output frames a..b-1 (for parallel chunks)
//
// The composition must expose window.COMP = { FPS, TOTAL, seek(n), ready }.
// seek(n) may return a promise.
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2',
};

function parseArgs(argv) {
  const [comp, out, ...rest] = argv;
  const opts = { comp, out };
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!comp || !out || !opts.plates) {
    console.error('usage: render.js <composition.html> <out.mp4|out_dir> --plates <dir> [--stills t1,t2] [--size WxH] [--serve 1] [--query q] [--audio f] [--range a:b]');
    process.exit(1);
  }
  return opts;
}

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

function writeFrame(stream, buf) {
  return stream.write(buf) ? Promise.resolve() : new Promise(r => stream.once('drain', r));
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const [vw, vh] = (opts.size || '1080x1920').split('x').map(Number);

  let url, server;
  if (opts.serve) {
    server = await serve();
    const base = `http://127.0.0.1:${server.address().port}/`;
    const rel = p => path.relative(ROOT, path.resolve(p)).split(path.sep).join('/');
    url = base + rel(opts.comp) + '?plates=' + encodeURIComponent(base + rel(opts.plates));
  } else {
    url = 'file://' + path.resolve(opts.comp) + '?plates=' + encodeURIComponent('file://' + path.resolve(opts.plates));
  }
  if (opts.query) url += '&' + opts.query;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  // Software WebGL under full CPU load can take well over the 30 s default per frame.
  page.setDefaultTimeout(0);
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.COMP);
  await page.evaluate(() => window.COMP.ready);
  const { FPS, TOTAL } = await page.evaluate(() => ({ FPS: window.COMP.FPS, TOTAL: window.COMP.TOTAL }));

  const finish = async () => { await browser.close(); if (server) server.close(); };

  if (opts.stills) {
    fs.mkdirSync(opts.out, { recursive: true });
    for (const s of opts.stills.split(',')) {
      const n = Math.round(parseFloat(s) * FPS);
      await page.evaluate(n => window.COMP.seek(n), n);
      const file = path.join(opts.out, `still_${String(n).padStart(4, '0')}.png`);
      await page.screenshot({ path: file, type: 'png' });
      console.log(file);
    }
    await finish();
    return;
  }

  const [from, to] = opts.range ? opts.range.split(':').map(Number) : [0, TOTAL];
  const seconds = (to - from) / FPS;
  const audio = opts.audio
    ? ['-ss', String(from / FPS), '-t', String(seconds), '-i', path.resolve(opts.audio)]
    : ['-f', 'lavfi', '-t', String(seconds), '-i', 'anullsrc=r=48000:cl=stereo'];

  fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...audio,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', opts.audio ? '256k' : '128k', '-ar', '48000', '-shortest', '-movflags', '+faststart',
    opts.out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));

  const t0 = Date.now();
  for (let n = from; n < to; n++) {
    await page.evaluate(n => window.COMP.seek(n), n);
    await writeFrame(ff.stdin, await page.screenshot({ type: 'png' }));
    if ((n - from) % 60 === 0) console.log(`frame ${n}/${to} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  await finish();
  console.log(`done -> ${opts.out}`);
})().catch(e => { console.error(e); process.exit(1); });
