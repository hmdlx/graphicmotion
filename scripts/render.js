#!/usr/bin/env node
// Render an HTML composition frame by frame (Chromium via Playwright) and
// pipe the PNG frames into ffmpeg.
//
//   node scripts/render.js <composition.html> <out.mp4> --plates <dir> [--workers 3] [--audio file.wav] [--range 3,6.5]
//   node scripts/render.js <composition.html> <out_dir> --plates <dir> --stills 1,4.5,18
//
// The composition must expose window.COMP = { FPS, TOTAL, seek(n), ready }.
// Optional: COMP.mblur(n) -> 1, 2, 4 or 8. Frames that return k > 1 are rendered as k
// sub-frames spread over a 180° shutter and averaged by ffmpeg (real motion blur).
// seek() then also receives fractional frame numbers.
//
// CHROMIUM_PATH: use a pre-installed Chromium instead of Playwright's own download.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const SUB = 8;          // sub-frames per output frame in the pipe (k must divide it)
const SHUTTER = 0.5;    // fraction of the frame interval the shutter is open

function parseArgs(argv) {
  const [comp, out, ...rest] = argv;
  const opts = { comp, out };
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!comp || !out || !opts.plates) {
    console.error('usage: render.js <composition.html> <out.mp4|out_dir> --plates <dir> [--stills t1,t2] [--workers n] [--audio file]');
    process.exit(1);
  }
  return opts;
}

function writeFrame(stream, buf) {
  return stream.write(buf) ? Promise.resolve() : new Promise(r => stream.once('drain', r));
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', c => (c === 0 ? res() : rej(new Error(`${cmd} exit ${c}`))));
  });
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.evaluate(() => window.COMP.ready);
  return page;
}

// Render frames [from, to) into one H.264 segment.
async function renderSegment(page, from, to, file, FPS, label) {
  const hasBlur = await page.evaluate(() => typeof window.COMP.mblur === 'function');
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
    '-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB)`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-r', String(FPS), '-g', String(FPS),
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  const t0 = Date.now();
  for (let n = from; n < to; n++) {
    const k = hasBlur ? await page.evaluate(n => window.COMP.mblur(n), n) : 1;
    for (let i = 0; i < k; i++) {
      const sn = k === 1 ? n : n + ((i + 0.5) / k - 0.5) * SHUTTER;
      await page.evaluate(sn => window.COMP.seek(sn), sn);
      const buf = await page.screenshot({ type: 'png' });
      for (let r = 0; r < SUB / k; r++) await writeFrame(ff.stdin, buf);
    }
    if ((n - from) % 30 === 0) console.log(`${label} frame ${n} (${from}-${to - 1}) ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await done;
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const url = 'file://' + path.resolve(opts.comp) + '?plates=' + encodeURIComponent('file://' + path.resolve(opts.plates));
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const first = await openPage(browser, url);
  const { FPS, TOTAL } = await first.evaluate(() => ({ FPS: window.COMP.FPS, TOTAL: window.COMP.TOTAL }));

  if (opts.stills) {
    fs.mkdirSync(opts.out, { recursive: true });
    for (const s of opts.stills.split(',')) {
      const n = Math.round(parseFloat(s) * FPS);
      await first.evaluate(n => window.COMP.seek(n), n);
      const file = path.join(opts.out, `still_${String(n).padStart(4, '0')}.png`);
      await first.screenshot({ path: file, type: 'png' });
      console.log(file);
    }
    await browser.close();
    return;
  }

  const workers = Math.max(1, parseInt(opts.workers || '1', 10));
  const pages = [first];
  for (let i = 1; i < workers; i++) pages.push(await openPage(browser, url));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-render-'));
  // --range a,b (seconds) renders only part of the timeline, e.g. to check a transition.
  const [from, to] = opts.range ? opts.range.split(',').map(v => Math.round(parseFloat(v) * FPS)) : [0, TOTAL];
  const count = to - from;
  const bounds = pages.map((_, i) => from + Math.round((count * i) / workers)).concat(to);
  const segs = pages.map((_, i) => path.join(tmp, `seg${i}.mp4`));
  const t0 = Date.now();
  await Promise.all(pages.map((p, i) => renderSegment(p, bounds[i], bounds[i + 1], segs[i], FPS, `[w${i}]`)));
  await browser.close();

  // Concatenate the segments and add the audio track (silent unless --audio is given).
  fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const audio = opts.audio ? ['-ss', String(from / FPS), '-i', opts.audio] : ['-f', 'lavfi', '-t', String(count / FPS), '-i', 'anullsrc=r=48000:cl=stereo'];
  await run('ffmpeg', [
    '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, ...audio,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-t', String(count / FPS), '-movflags', '+faststart', opts.out,
  ]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`done -> ${opts.out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
})().catch(e => { console.error(e); process.exit(1); });
