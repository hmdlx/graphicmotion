#!/usr/bin/env node
// Lay the voice-over segments onto the timeline from a cues.js file and write one WAV.
//
//   node scripts/mix_audio.js <cues.js> <vo_dir> <out.wav>
//
// cues.js sets window.CUES = { <segment id>: start seconds, ..., total: seconds };
// <vo_dir>/<segment id>.wav comes from scripts/voiceover.py.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const [cuesFile, voDir, out] = process.argv.slice(2);
if (!out) {
  console.error('usage: mix_audio.js <cues.js> <vo_dir> <out.wav>');
  process.exit(1);
}
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(cuesFile, 'utf8'), sandbox);
const { total, ...cues } = sandbox.window.CUES;

const inputs = [], chains = [], labels = [];
Object.entries(cues).forEach(([id, start], i) => {
  inputs.push('-i', path.join(voDir, `${id}.wav`));
  const ms = Math.round(start * 1000);
  chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=mono,adelay=${ms}:all=1[v${i}]`);
  labels.push(`[v${i}]`);
});
const filter = `${chains.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0,` +
  `apad,atrim=0:${total},aformat=channel_layouts=stereo[out]`;
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, '-map', '[out]', '-c:a', 'pcm_s16le', out], { stdio: 'inherit' });
console.log(`${out} (${Object.keys(cues).length} segments, ${total} s)`);
