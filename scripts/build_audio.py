#!/usr/bin/env python3
"""Sound track for a speed-ramped composition.

Usage: build_audio.py <source.mp4> <timeline.js> <out.wav>

The source audio follows the same speed ramp as the picture (varispeed: slow motion
also drops the pitch, like tape). On top: countdown ticks, a riser into the impact,
a sub boom on the impact, a whoosh through the zoom and two hits on the end card.
All synthesised with numpy, so the track renders without extra assets.
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
sec = lambda frame: frame / FPS
rng = np.random.default_rng(7)

raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", src_path, "-vn", "-ac", "2", "-ar", str(SR),
                               "-f", "f32le", "-"])
src = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

out = np.zeros((total, 2))


def add(sig, t0, gain=1.0):
    """Mix a mono or stereo signal in at t0 seconds."""
    if sig.ndim == 1:
        sig = np.stack([sig, sig], axis=1)
    i0 = int(t0 * SR)
    if i0 >= total:
        return
    n = min(len(sig), total - i0)
    out[i0:i0 + n] += gain * sig[:n]


def band(noise, lo, hi):
    """Band-limit a signal with an FFT mask."""
    spec = np.fft.rfft(noise)
    f = np.fft.rfftfreq(len(noise), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, len(noise))


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


# --- source audio through the speed ramp ---------------------------------------
end_s = sec(tl["end"])
i = np.arange(int(end_s * SR))
frame = i / SR * FPS
src_frame = np.interp(frame, np.arange(len(src_at)), src_at)
pos = src_frame / SRC_FPS * SR
lo = np.clip(pos.astype(int), 0, len(src) - 2)
frac = (pos - lo)[:, None]
track = src[lo] * (1 - frac) + src[lo + 1] * frac
fade = np.clip((end_s - i / SR) / 0.35, 0, 1)[:, None]      # out through the zoom
out[:len(track)] += 1.4 * track * fade

# --- countdown ticks: a click and a low thump per beat --------------------------
t = np.arange(int(0.25 * SR)) / SR
tick = 0.25 * np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.01)
thump = 0.8 * np.sin(2 * np.pi * (75 * t - 60 * t * t)) * np.exp(-t / 0.07)
for k, b in enumerate(tl["beats"]):
    add(tick + thump, sec(b), 0.55 + 0.15 * k)

# --- riser from the crack into the impact --------------------------------------
r0, r1 = sec(tl["crack"]), sec(tl["impact"])
t = np.arange(int((r1 - r0) * SR)) / SR
k = t / (r1 - r0)
noise = norm(band(rng.standard_normal(len(t)), 250, 4000))
sweep = np.sin(2 * np.pi * np.cumsum(110 + 380 * k * k) / SR)
add((0.22 * noise + 0.18 * sweep) * k ** 2.5, r0)


# --- booms ----------------------------------------------------------------------
def boom(dur=1.8, f_hi=62, f_lo=30, tau=0.8, burst=0.6):
    t = np.arange(int(dur * SR)) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.35)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    crack = norm(band(rng.standard_normal(len(t)), 40, 1800)) * np.exp(-t / 0.06)
    return sub + burst * crack


add(boom(), sec(tl["impact"]), 0.95)

# --- whoosh through the zoom ------------------------------------------------------
w0, w1 = sec(tl["zoom"][0]), sec(tl["end"])
t = np.arange(int((w1 - w0) * SR)) / SR
k = t / (w1 - w0)
whoosh = norm(band(rng.standard_normal(len(t)), 300, 7000))
add(whoosh * (2 ** (10 * k - 10)) ** 0.6, w0, 0.5)

# --- end card: BLACK FRIDAY hit, then the -25 % hit ------------------------------
add(boom(dur=1.2, f_hi=70, tau=0.45, burst=0.8), w1, 0.75)
add(boom(dur=2.2, f_hi=58, f_lo=28, tau=0.9, burst=0.9), w1 + sec(10), 0.95)

# --- end card heartbeat, in time with the pulsing -25 % ---------------------------
t = np.arange(int(0.4 * SR)) / SR
beat = np.sin(2 * np.pi * (58 * t - 30 * t * t)) * np.exp(-t / 0.09)
b = w1 + sec(26) + 0.45
while b < tl["TOTAL"] / FPS - 0.3:
    add(beat, b, 0.42)
    add(beat, b + 0.16, 0.25)
    b += 0.9

# --- master: soft clip, peak at -1 dBFS, short fade out --------------------------
out = np.tanh(1.3 * out) / np.tanh(1.3)
out *= 10 ** (-1 / 20) / (np.abs(out).max() + 1e-9)
tail = int(0.4 * SR)
out[-tail:] *= np.linspace(1, 0, tail)[:, None]

with wave.open(out_path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype("<i2").tobytes())
print(f"{len(out) / SR:.2f} s -> {out_path}")
