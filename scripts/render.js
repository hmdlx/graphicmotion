#!/usr/bin/env node
// Render an HTML composition frame by frame (Chromium via Playwright) and
// pipe the PNG frames into ffmpeg.
//
//   node scripts/render.js <composition.html> <out.mp4> [--plates <dir>] [--audio <file>] [--range t0,t1] [--crf 16]
//   node scripts/render.js <composition.html> <out_dir> [--plates <dir>] --stills 1,4.5,18
//
// --webgl serves the repo over http://127.0.0.1 (ES modules and WebGL textures need an
// http origin) and turns on SwiftShader WebGL in headless Chromium.
//
// The composition must expose window.COMP = { FPS, TOTAL, seek(n), ready } and
// may set W/H for its stage size (default 1080x1920).
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const [comp, out, ...rest] = argv;
  const opts = { comp, out };
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i].replace(/^--/, '');
    if (i + 1 < rest.length && !rest[i + 1].startsWith('--')) opts[key] = rest[++i];
    else opts[key] = true;
  }
  if (!comp || !out) {
    console.error('usage: render.js <composition.html> <out.mp4|out_dir> [--plates <dir>] [--webgl] [--audio <file>] [--range t0,t1] [--stills t1,t2]');
    process.exit(1);
  }
  return opts;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

// Static server for the working directory (the repo root).
function serve(root) {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

function writeFrame(stream, buf) {
  return stream.write(buf) ? Promise.resolve() : new Promise(r => stream.once('drain', r));
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  let url, server;
  if (opts.webgl) {
    server = await serve(process.cwd());
    const base = `http://127.0.0.1:${server.address().port}/`;
    url = base + path.relative(process.cwd(), path.resolve(opts.comp)) +
      (opts.plates ? '?plates=' + encodeURIComponent(base + path.relative(process.cwd(), path.resolve(opts.plates))) : '');
  } else {
    url = 'file://' + path.resolve(opts.comp) +
      (opts.plates ? '?plates=' + encodeURIComponent('file://' + path.resolve(opts.plates)) : '');
  }

  // CHROMIUM_PATH: use an already installed Chromium instead of Playwright's own download.
  const launch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  if (opts.webgl) launch.args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.waitForFunction(() => window.COMP);
  await page.evaluate(() => window.COMP.ready);
  const { FPS, TOTAL, W, H } = await page.evaluate(() => ({
    FPS: window.COMP.FPS, TOTAL: window.COMP.TOTAL, W: window.COMP.W || 1080, H: window.COMP.H || 1920,
  }));
  await page.setViewportSize({ width: W, height: H });

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
    if (server) server.close();
    return;
  }

  const [n0, n1] = opts.range ? opts.range.split(',').map(s => Math.round(parseFloat(s) * FPS)) : [0, TOTAL];
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  const audio = opts.audio
    ? ['-ss', String(n0 / FPS), '-i', opts.audio]
    : ['-f', 'lavfi', '-t', String((n1 - n0) / FPS), '-i', 'anullsrc=r=48000:cl=stereo'];
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...audio,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opts.crf || 16), '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', opts.audio ? '192k' : '128k', '-shortest', '-movflags', '+faststart',
    opts.out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));

  const t0 = Date.now();
  for (let n = n0; n < n1; n++) {
    await page.evaluate(n => window.COMP.seek(n), n);
    await writeFrame(ff.stdin, await page.screenshot({ type: 'png' }));
    if (n % 60 === 0) console.log(`frame ${n}/${TOTAL} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  if (server) server.close();
  console.log(`done -> ${opts.out}`);
})().catch(e => { console.error(e); process.exit(1); });
