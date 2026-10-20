#!/usr/bin/env python3
"""Sound track that follows a speed ramp without changing pitch.

Usage: stretch_audio.py <source.mp4> <timeline.js> <out.wav>

The timeline module exports srcAt (source frame per output frame), FPS, SRC_FPS,
TOTAL and optionally whooshes (output frames). The source audio is re-timed with
overlap-add: short Hann-windowed grains are read at the mapped source time and laid
down at the output time. For ambience (water, wind) this keeps the natural pitch and
stays in sync with the picture. Speed-ups get a soft filtered-noise whoosh.
"""
import json
import subprocess
import sys
import wave

import numpy as np

SR = 48000
src_path, timeline_path, out_path = sys.argv[1:4]
tl = json.loads(subprocess.check_output(
    ["node", "-e", f"process.stdout.write(JSON.stringify(require({json.dumps(timeline_path)})))"]))
FPS, SRC_FPS = tl["FPS"], tl["SRC_FPS"]
src_at = np.array(tl["srcAt"])
total = int(tl["TOTAL"] / FPS * SR)
rng = np.random.default_rng(11)

raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", src_path, "-vn", "-ac", "2", "-ar", str(SR),
                               "-f", "f32le", "-"])
src = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

# --- overlap-add time stretch ---------------------------------------------------
GRAIN = int(0.09 * SR)
HOP = GRAIN // 4
win = np.hanning(GRAIN)[:, None]
out = np.zeros((total + GRAIN, 2))
norm = np.zeros(total + GRAIN)
for o in range(0, total, HOP):
    frame = o / SR * FPS
    s = int(np.interp(frame, np.arange(len(src_at)), src_at) / SRC_FPS * SR)
    s = int(np.clip(s - GRAIN // 2, 0, len(src) - GRAIN))
    out[o:o + GRAIN] += src[s:s + GRAIN] * win
    norm[o:o + GRAIN] += win[:, 0]
out = out[:total] / np.maximum(norm[:total], 1e-3)[:, None]


# --- whooshes on the speed-ups ----------------------------------------------------
def band(x, lo, hi):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, len(x))


dur = int(0.7 * SR)
t = np.arange(dur) / SR
shape = np.sin(np.pi * np.clip(t / 0.7, 0, 1)) ** 2
for w in tl.get("whooshes", []):
    noise = band(rng.standard_normal(dur), 250, 5000)
    noise /= np.abs(noise).max() + 1e-9
    i0 = int(w / FPS * SR) - dur // 2
    if i0 < 0 or i0 + dur > total:
        continue
    pan = np.stack([1 - 0.3 * t / 0.7, 0.7 + 0.3 * t / 0.7], axis=1)
    out[i0:i0 + dur] += 0.12 * (noise * shape)[:, None] * pan

# --- master -----------------------------------------------------------------------
peak = np.abs(out).max() + 1e-9
out *= 10 ** (-1.5 / 20) / peak
fade_in, fade_out = int(0.25 * SR), int(0.8 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]

with wave.open(out_path, "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((out * 32767).astype("<i2").tobytes())
print(f"{len(out) / SR:.2f} s -> {out_path}")
