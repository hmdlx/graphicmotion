#!/usr/bin/env python3
"""Sound design for the SPLASH / DROP THERMO film, synthesised from scratch (numpy only).

  python3 -I projects/thermo-scan/sound.py build/thermo-scan/sound.wav            # 1:1, 16:9
  python3 -I projects/thermo-scan/sound.py build/thermo-scan/sound_9x16.wav premium  # 9:16

Cue times follow the timeline T in composition.js / premium.js (seconds).
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 48000
CUT = sys.argv[2] if len(sys.argv) > 2 else 'base'
# Shared moments per cut: leaves, rain, cover fly-off, water, wipe, end card, CTA
AT = {
    'base': dict(leaves=15.45, rain=16.75, flyoff=18.95, water=19.5, wipe=21.8, end=22.25, cta=23.2),
    'premium': dict(leaves=16.75, rain=18.15, flyoff=20.55, water=21.1, wipe=23.55, end=24.0, cta=25.25),
}[CUT]

# 9:16 premium: intro before the film and a film clock that runs slower where the
# voice-over needs room – the same mapping as premium.js. Cue times are film times.
INTRO, FILM_END = (6.0, 30.0) if CUT == 'premium' else (0.0, 26.0)
WARP = [(10.4, 16.5, 0.88), (16.5, 20.6, 0.75)] if CUT == 'premium' else []


def film_to_out(f):
    u = f
    for a, b, sp in WARP:
        u += (min(max(f, a), b) - a) * (1 / sp - 1)
    return u


def TM(f):
    """film time -> output time"""
    return INTRO + film_to_out(f)


DUR = TM(FILM_END)
N = int(SR * DUR)
rng = np.random.default_rng(3)
L = np.zeros(N)
R = np.zeros(N)


def t_arr(d):
    return np.arange(int(SR * d)) / SR


def place(sig, at, gain=1.0, pan=0.0, raw=False):
    # `at` is film time; raw=True places at output time (intro, voice-over)
    i = int((at if raw else TM(at)) * SR)
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
    pad += np.sin(2 * np.pi * (f * 1.002) * t) * np.clip((t - TM(AT['wipe'])) / 1.5, 0, 1) * 0.6
pad = lp(pad, 900 + 500 * np.clip((t - TM(4.5)) / 2, 0, 1) + 600 * np.clip((t - TM(AT['wipe'])) / 2, 0, 1), 2)
pad_env = np.clip(t / 2.0, 0, 1) * (1 - np.clip((t - (DUR - 1.4)) / 1.4, 0, 1))
pad *= pad_env * 0.02
L += pad
R += np.roll(pad, 240)

# --- cues ----------------------------------------------------------------------------------
def cues_base():
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


def cues_premium():
    # macro: dark swell, airy light sweep, title
    breath = lp(noise(3.6), 2200)
    bk = np.linspace(0, 1, len(breath))
    place(breath * np.sin(np.pi * bk) ** 2 * 0.03, 0.1, pan=-0.2)
    place(sweep_tone(3.4, 110, 160, 0.03), 0.1)
    place(tonal_hit([220, 330, 440], 2.8, 0.28), 0.7)
    place(whoosh(1.6, 200, 3200, 0.24), 3.35)                          # crane up
    place(thud(42, 1.6, 0.45), 4.95)
    place(whoosh(0.9, 300, 6000, 0.2), 4.5)                            # scan in
    place(sweep_tone(0.9, 300, 1200, 0.05), 4.5)
    for k in range(11):
        place(tick(0.09), 4.5 + k * 0.08, pan=-0.2 + 0.04 * k)
    place(whoosh(1.2, 200, 2500, 0.22), 5.9)                           # cut laser
    place(sweep_tone(1.2, 90, 260, 0.07), 5.9)
    for k, at in enumerate([7.1, 7.35]):                               # callouts
        place(blip(2200 + k * 220, 0.05, 0.12), at, pan=[-0.4, 0.4][k])
        place(tick(0.12), at + 0.02)
    place(whoosh(0.7, 250, 2200, 0.24), 8.75)                          # lift 1
    place(blip(520, 0.12, 0.14), 9.05); place(blip(520, 0.12, 0.14), 9.25)
    hiss = hp(noise(1.3), 2500) * np.sin(np.linspace(0, np.pi, int(SR * 1.3))) * 0.05
    place(hiss, 9.0)
    place(whoosh(0.6, 2500, 300, 0.25), 10.2)                          # drop 1
    place(thud(52, 1.0, 0.5), 10.8)
    for at in [10.7, 13.7, 17.1]:                                      # captions
        place(tonal_hit([330, 495, 660], 2.0, 0.16, 0.6), at)
    place(whoosh(1.0, 400, 6000, 0.22), 12.4)                          # scan out
    place(sweep_tone(0.8, 300, 1200, 0.05), 12.4)
    place(whoosh(1.0, 200, 1800, 0.22), 13.0)                          # lift 2
    place(whoosh(0.7, 1800, 250, 0.24), 15.7)                          # drop 2
    place(thud(50, 1.0, 0.5), 16.4)
    place(thud(48, 1.2, 0.6), 16.5)                                    # hard cut
    snap = hp(noise(0.12), 3000) * env(int(SR * 0.12), 0.001, 0.03)
    place(snap / (np.abs(snap).max() + 1e-9) * 0.12, 16.5)


(cues_premium if CUT == 'premium' else cues_base)()


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
    place(tap / (np.abs(tap).max() + 1e-9) * 0.08, AT['leaves'] + land, pan=(i % 5 - 2) * 0.2)

# rain
rd = TM(AT['rain'] + 2.6) - TM(AT['rain'])
rain = hp(noise(rd), 1200) * 0.6 + lp(noise(rd), 600) * 0.4
rk = np.linspace(0, 1, int(SR * rd))
rain *= np.clip(rk / 0.15, 0, 1) * np.clip((1 - rk) / 0.25, 0, 1) * 0.035
place(rain, AT['rain'])
for k in range(60):
    at = AT['rain'] + 0.1 + rng.random() * 1.9
    d = 0.03
    drop = bp(noise(d), 2500 + rng.random() * 2000, 1) * env(int(SR * d), 0.0005, 0.006)
    place(drop / (np.abs(drop).max() + 1e-9) * 0.05, at, pan=rng.random() * 1.6 - 0.8)

place(whoosh(1.0, 300, 5000, 0.32), AT['flyoff'])                     # cover flies off
# water: gentle bubbling + shimmer
wd = 3.0
water = lp(noise(wd), 700) * (0.6 + 0.4 * np.sin(np.linspace(0, 40, int(SR * wd))) ** 2)
wk = np.linspace(0, 1, int(SR * wd))
water *= np.clip(wk / 0.2, 0, 1) * np.clip((1 - wk) / 0.2, 0, 1) * 0.06
place(water, AT['water'])
for k in range(16):
    f = rng.choice([1760, 2093, 2349, 2637, 3136])
    place(tonal_hit([f], 0.8, 0.04, 0.0), AT['water'] + 0.3 + rng.random() * 2.0, pan=rng.random() * 1.4 - 0.7)
place(whoosh(0.5, 300, 3000, 0.28), AT['wipe'])                       # wipe
place(thud(40, 2.0, 0.7), AT['end'])                                   # end card
place(tonal_hit([220, 277.18, 329.63, 440], 3.5, 0.32, 0.5), AT['end'])
place(blip(1320, 0.06, 0.10), AT['cta'])                               # CTA

# --- intro (9:16): bubbling hot tubs, soft shimmer, push into the film ------------------------
if CUT == 'premium':
    bd = INTRO + 0.4
    bub = lp(noise(bd), 900) * (0.55 + 0.45 * np.abs(np.sin(np.linspace(0, 95, int(SR * bd)))) ** 3)
    bub += bp(noise(bd), 2400, 1) * 0.25
    bk = np.linspace(0, 1, len(bub))
    bub *= np.clip(bk / 0.08, 0, 1) * np.clip((1 - bk) / 0.18, 0, 1)
    place(bub / (np.abs(bub).max() + 1e-9) * 0.06, 0.0, raw=True)
    place(tonal_hit([440, 660, 880], 1.8, 0.1, 0.6), 0.3, raw=True)
    place(tonal_hit([495, 742, 990], 1.8, 0.09, 0.6), 3.2, raw=True)
    place(whoosh(0.7, 300, 5000, 0.3), INTRO - 0.6, raw=True)


# --- voice-over (9:16): German lines, cleaned and placed; music and effects duck under it --
VO_DIR = Path(__file__).resolve().parent / 'source' / 'vo'
VO = [  # file, start in output time inside the film (seconds after the intro); intro line absolute
    ('vo1_intro.wav', 0.3 - INTRO),
    ('vo2_titel.wav', 0.5),
    ('vo3_luftpolster.wav', 5.5),
    ('vo4_waerme.wav', 10.55),
    ('vo5_leicht.wav', 14.9),
    ('vo6_laub.wav', 17.45),
    ('vo7_end.wav', 26.5),
]


def load_vo(path):
    # tighten long pauses, a touch faster, clean low end, gentle compression
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / 'vo.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-af',
                        'silenceremove=start_periods=1:start_threshold=-42dB:stop_periods=-1:'
                        'stop_threshold=-42dB:stop_duration=0.3:stop_silence=0.32,atempo=1.12,'
                        'highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2',
                        '-ar', str(SR), '-ac', '1', str(out)], check=True)
        with wave.open(str(out)) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
    return x / (np.abs(x).max() + 1e-9)


if CUT == 'premium':
    vo = np.zeros(N)
    for name, u in VO:
        x = load_vo(VO_DIR / name)
        i = int((INTRO + u) * SR)
        vo[i:i + len(x)] += x[: N - i]
    # ducking envelope: follows the voice with 40 ms attack, 350 ms release
    e = np.abs(vo)
    env = np.zeros(N); acc = 0.0
    a_att, a_rel = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.35 * SR))
    for i in range(N):
        v = e[i]
        acc = a_att * acc + (1 - a_att) * v if v > acc else a_rel * acc + (1 - a_rel) * v
        env[i] = acc
    duck = 1 - 0.45 * np.clip(env / 0.12, 0, 1)
    L *= duck; R *= duck
    # each line is peak-normalised; the voice sits clearly above the ducked bed
    peak_bed = np.abs(np.stack([L, R])).max()
    L += vo * peak_bed * 0.62; R += vo * peak_bed * 0.62

# --- master ---------------------------------------------------------------------------------
mix = np.stack([L, R], -1)
if CUT == 'premium':
    # with the voice on top, keep the soft clipper in its near-linear range (no grit on the voice)
    mix *= 0.45 / (np.abs(mix).max() + 1e-9)
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
