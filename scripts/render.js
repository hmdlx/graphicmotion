#!/usr/bin/env node
// Render an HTML composition frame by frame (Chromium via Playwright) and
// pipe the PNG frames into ffmpeg.
//
//   node scripts/render.js <composition.html> <out.mp4> --plates <dir>
//   node scripts/render.js <composition.html> <out_dir> --plates <dir> --stills 1,4.5,18
//   node scripts/render.js <composition.html> <out.mp4> --plates <dir> --audio <source.mp4>
//
// The composition must expose window.COMP = { FPS, TOTAL, seek(n), ready }.
// With --audio the source's sound is kept (padded, faded out at the end); if the
// composition also exposes COMP.CUES (seconds), a soft notification chime is
// mixed in at each cue. Without --audio the video gets a silent track.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const [comp, out, ...rest] = argv;
  const opts = { comp, out };
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!comp || !out || !opts.plates) {
    console.error('usage: render.js <composition.html> <out.mp4|out_dir> --plates <dir> [--stills t1,t2] [--audio file]');
    process.exit(1);
  }
  return opts;
}

// Two-tone chime (sine partials with exponential decay), synthesised so no
// third-party sound file is needed.
const CHIME = '0.26*sin(2*PI*1318.5*t)*exp(-7*t)'
  + '+0.2*sin(2*PI*1975.5*(t-0.085))*exp(-7*(t-0.085))*gte(t\\,0.085)';

function audioArgs(opts, dur, cues) {
  if (!opts.audio) {
    return { inputs: ['-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=r=48000:cl=stereo'], map: ['-map', '1:a'] };
  }
  const fade = Math.max(0, dur - 0.8).toFixed(3);
  const parts = [`[1:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${dur},afade=t=out:st=${fade}:d=0.8[bg]`];
  cues.forEach((c, i) => {
    const ms = Math.round(c * 1000);
    parts.push(`aevalsrc=${CHIME}:s=48000:d=0.9,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[c${i}]`);
  });
  const ins = ['[bg]', ...cues.map((_, i) => `[c${i}]`)].join('');
  parts.push(`${ins}amix=inputs=${cues.length + 1}:normalize=0:duration=first,alimiter=limit=0.9[a]`);
  return { inputs: ['-i', opts.audio], map: ['-filter_complex', parts.join(';'), '-map', '[a]'] };
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
  const { FPS, TOTAL, CUES } = await page.evaluate(() => ({ FPS: window.COMP.FPS, TOTAL: window.COMP.TOTAL, CUES: window.COMP.CUES || [] }));

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
  const audio = audioArgs(opts, TOTAL / FPS, CUES);
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...audio.inputs,
    '-map', '0:v', ...audio.map,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
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
