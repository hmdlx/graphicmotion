#!/usr/bin/env node
// Replace the audio track of a rendered MP4 without re-rendering the frames.
//
//   node scripts/remux_audio.js <video.mp4> <audio.wav>
const fs = require('fs');
const { execFileSync } = require('child_process');

const [video, audio] = process.argv.slice(2);
if (!audio) {
  console.error('usage: remux_audio.js <video.mp4> <audio.wav>');
  process.exit(1);
}
const tmp = video.replace(/\.mp4$/, '.remux.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp], { stdio: 'inherit' });
fs.renameSync(tmp, video);
console.log(`${video} <- ${audio}`);
