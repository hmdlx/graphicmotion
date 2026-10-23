#!/usr/bin/env python3
"""Sound design for the SPLASH / DROP THERMO film, synthesised from scratch (numpy only).

  python3 -I projects/thermo-scan/sound.py build/thermo-scan/sound.wav

Cue times follow the timeline T in composition.js (seconds).
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
DUR = 29.0
N = int(SR * DUR)
rng = np.random.default_rng(3)
L = np.zeros(N)
R = np.zeros(N)


def t_arr(d):
    return np.arange(int(SR * d)) / SR


def place(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def onepole(x, fc):
    # one-pole low-pass, fc may be an array (per sample)
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def lp(x, fc, order=2):
    for _ in range(order):
        x = onepole(x, fc)
    return x


def hp(x, fc):
    return x - lp(x, fc, 1)


def bp(x, fc, order=2):
    return hp(lp(x, fc * 1.6, order), fc / 1.6)


def env(n, a, d, shape=4.0):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na) ** 2
    rest = n - na
    e[na:] = np.exp(-shape * np.arange(rest) / max(1, int(d * SR)))
    return e


def reverb(x, mix=0.3, size=1.0):
    # small Schroeder reverb: 4 combs + 2 allpasses
    out = np.zeros_like(x)
    for dl, g in [(1557, .84), (1617, .83), (1491, .85), (1422, .86)]:
        d = int(dl * size * SR / 44100)
        y = np.copy(x)
        for i in range(d, len(y), d):
            seg = y[i - d:i]
            y[i:i + d] += g * seg[: len(y[i:i + d])]
        out += y
    out /= 4
    for dl, g in [(225, .5), (556, .5)]:
        d = int(dl * size * SR / 44100)
        y = np.zeros_like(out)
        buf = np.zeros(len(out) + d)
        for i in range(len(out)):
            v = out[i] + g * buf[i]
            buf[i + d] = v
            y[i] = -g * v + buf[i]
        out = y
    return x * (1 - mix) + out * mix


def noise(d):
    return rng.standard_normal(int(SR * d))


# --- elements --------------------------------------------------------------------------
def whoosh(d, f0, f1, gain=1.0):
    n = int(SR * d)
    k = np.linspace(0, 1, n)
    fc = f0 * (f1 / f0) ** k
    x = noise(d)
    x = lp(x, fc, 2) - lp(x, fc / 3, 1)
    e = np.sin(np.pi * k) ** 1.5
    return x * e * gain / (np.abs(x).max() + 1e-9)


def blip(f, d=0.05, gain=0.3):
    t = t_arr(d)
    return np.sin(2 * np.pi * f * t) * env(len(t), 0.002, d * 0.5) * gain


def tick(gain=0.25):
    d = 0.02
    x = hp(noise(d), 3000) * env(int(SR * d), 0.0005, 0.004)
    return x * gain / (np.abs(x).max() + 1e-9)


def thud(f=55, d=0.9, gain=1.0):
    t = t_arr(d)
    ff = f * (1 + 1.5 * np.exp(-t * 30))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    x = np.sin(ph) * env(len(t), 0.003, 0.25)
    x += lp(noise(d), 400) * env(len(t), 0.001, 0.05) * 0.6
    return x * gain


def tonal_hit(freqs, d=2.4, gain=0.35, bright=0.4):
    t = t_arr(d)
    x = np.zeros_like(t)
    for i, f in enumerate(freqs):
        x += np.sin(2 * np.pi * f * t + i) * (0.8 ** i)
        x += bright * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) * (0.7 ** i)
    x *= env(len(t), 0.004, d * 0.35, 3.0)
    return reverb(x / len(freqs), 0.35) * gain


def sweep_tone(d, f0, f1, gain=0.15):
    t = t_arr(d)
    k = t / d
    f = f0 * (f1 / f0) ** k
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.3 * np.sin(2 * ph)
    return x * np.sin(np.pi * k) ** 0.7 * gain


# --- pad ---------------------------------------------------------------------------------
t = np.arange(N) / SR
pad = np.zeros(N)
chord1 = [55.0, 82.41, 110.0, 164.81, 220.0]          # A minor-ish open fifths
chord2 = [55.0, 82.41, 110.0, 138.59, 164.81, 220.0]   # A major colour at the end
for f in chord1:
    pad += np.sin(2 * np.pi * f * t + rng.random() * 6) * (1 + 0.3 * np.sin(2 * np.pi * 0.07 * t + f))
for f in chord2:
    pad += np.sin(2 * np.pi * (f * 1.002) * t) * np.clip((t - 24.6) / 1.5, 0, 1) * 0.6
pad = lp(pad, 900 + 500 * np.clip((t - 4.5) / 2, 0, 1) + 600 * np.clip((t - 24.6) / 2, 0, 1), 2)
pad_env = np.clip(t / 2.0, 0, 1) * (1 - np.clip((t - 27.6) / 1.4, 0, 1))
pad *= pad_env * 0.02
L += pad
R += np.roll(pad, 240)

# --- cues ----------------------------------------------------------------------------------
place(tonal_hit([220, 330, 440], 2.6, 0.3), 0.25)                     # title
place(whoosh(0.6, 400, 4000, 0.18), 2.35)
for k, f in enumerate([1800, 2400, 1800]):                            # HUD on
    place(blip(f, 0.04, 0.12), 2.5 + k * 0.07, pan=0.3)
place(whoosh(1.2, 300, 6000, 0.22), 2.9)                              # scan
place(sweep_tone(1.1, 300, 1200, 0.06), 2.9)
for k in range(14):
    place(tick(0.10), 2.9 + k * 0.08, pan=-0.2 + 0.03 * k)
place(blip(1320, 0.06, 0.16), 4.0)
place(blip(1760, 0.09, 0.16), 4.07)
place(whoosh(0.8, 5000, 200, 0.35), 4.25)                             # dissolve
place(thud(45, 1.4, 0.55), 4.62)
place(whoosh(1.4, 200, 2500, 0.22), 5.3)                              # cut laser
place(sweep_tone(1.4, 90, 260, 0.07), 5.3)
for k, at in enumerate([6.75, 7.0, 7.25]):                            # callouts
    place(blip(2200 + k * 220, 0.05, 0.12), at, pan=[-0.4, 0.4, 0.1][k])
    place(tick(0.12), at + 0.02)
place(whoosh(0.7, 250, 2200, 0.22), 8.15)                             # lift 1
place(blip(520, 0.12, 0.14), 8.45); place(blip(520, 0.12, 0.14), 8.65)  # warning
hiss = hp(noise(1.3), 2500) * np.sin(np.linspace(0, np.pi, int(SR * 1.3))) * 0.05
place(hiss, 8.5)
place(whoosh(0.6, 2500, 300, 0.25), 9.6)                              # drop 1
place(thud(52, 1.0, 0.5), 10.15)
place(blip(1320, 0.07, 0.14), 10.25); place(blip(1980, 0.1, 0.12), 10.33)
for at in [9.9, 12.9, 15.9, 20.0]:                                    # captions
    place(tonal_hit([330, 495, 660], 2.0, 0.16, 0.6), at)
place(whoosh(1.0, 6000, 400, 0.22), 11.6)                             # look change
place(sweep_tone(0.8, 1200, 300, 0.05), 11.6)
place(whoosh(1.0, 200, 1800, 0.22), 12.1)                             # lift 2
place(whoosh(0.7, 1800, 250, 0.24), 14.5)                             # drop 2
place(thud(50, 1.0, 0.5), 15.2)


# leaf landings: same seeded sequence as scene.js (rng(43), 10 draws per leaf)
def lcg(seed):
    s = seed & 0xffffffff
    while True:
        s = (s * 1664525 + 1013904223) & 0xffffffff
        yield s / 4294967296


g = lcg(43)
for i in range(12):
    _scale = next(g)
    land = 0.12 * i + next(g) * 0.1
    for _ in range(8):
        next(g)
    d = 0.06
    tap = lp(noise(d), 1800) * env(int(SR * d), 0.001, 0.015)
    place(tap / (np.abs(tap).max() + 1e-9) * 0.08, 15.45 + land, pan=(i % 5 - 2) * 0.2)

# rain
rd = 2.6
rain = hp(noise(rd), 1200) * 0.6 + lp(noise(rd), 600) * 0.4
rk = np.linspace(0, 1, int(SR * rd))
rain *= np.clip(rk / 0.15, 0, 1) * np.clip((1 - rk) / 0.25, 0, 1) * 0.035
place(rain, 16.75)
for k in range(60):
    at = 16.85 + rng.random() * 1.9
    d = 0.03
    drop = bp(noise(d), 2500 + rng.random() * 2000, 1) * env(int(SR * d), 0.0005, 0.006)
    place(drop / (np.abs(drop).max() + 1e-9) * 0.05, at, pan=rng.random() * 1.6 - 0.8)

place(whoosh(1.0, 300, 5000, 0.32), 18.95)                            # cover flies off
# water: gentle bubbling + shimmer
wd = 3.0
water = lp(noise(wd), 700) * (0.6 + 0.4 * np.sin(np.linspace(0, 40, int(SR * wd))) ** 2)
wk = np.linspace(0, 1, int(SR * wd))
water *= np.clip(wk / 0.2, 0, 1) * np.clip((1 - wk) / 0.2, 0, 1) * 0.06
place(water, 19.5)
for k in range(16):
    f = rng.choice([1760, 2093, 2349, 2637, 3136])
    place(tonal_hit([f], 0.8, 0.04, 0.0), 19.8 + rng.random() * 2.0, pan=rng.random() * 1.4 - 0.7)
place(whoosh(0.5, 300, 3000, 0.28), 21.8)                              # wipe
# DROP THERMO: panel lifts off the ambient shot
place(whoosh(0.5, 3000, 300, 0.24), 22.2)
place(tonal_hit([330, 495, 660], 2.0, 0.16, 0.6), 22.55)
place(whoosh(0.5, 300, 3000, 0.28), 24.55)                             # wipe
place(thud(40, 2.0, 0.7), 25.0)                                        # end card
place(tonal_hit([220, 277.18, 329.63, 440], 3.5, 0.32, 0.5), 25.0)
place(blip(1320, 0.06, 0.10), 25.95)                                   # CTA

# --- master ---------------------------------------------------------------------------------
mix = np.stack([L, R], -1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 0.89 / (np.abs(mix).max() + 1e-9)
fade = np.clip((DUR - t) / 0.8, 0, 1)[:, None]
mix *= fade
pcm = (mix * 32767).astype('<i2')
out = Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('sound ->', out)
