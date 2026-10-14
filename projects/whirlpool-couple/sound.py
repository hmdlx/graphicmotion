#!/usr/bin/env python3
"""Sound for the Whirlpool spot: synced location sound, ambience, bubbles and a calm music bed.

    python3 -I projects/whirlpool-couple/sound.py <rohschnitt.mp4> <out.wav>

The rough cut only carries 8.1 s of sound. The sync sound of the first three shots is
re-cut onto the new edit (same shot offsets as composition.js), the rest is built here:
garden ambience and water as granular beds, whirlpool bubbles, soft transition swells
and a warm pad with a few bell notes in D major. Deterministic (fixed seed).
"""
import subprocess
import sys
import wave

import numpy as np

SR = 48000
FPS = 24
TOTAL = 528 / FPS                      # 22.0 s, as composition.js
rng = np.random.default_rng(7)

# Shots as in composition.js: source frame range and output frame of the first frame.
SHOTS = [
    ((0, 91), 0), ((92, 164), 76), ((165, 257), 133),
    ((258, 359), 208), ((360, 455), 288), ((456, 542), 366),
]
SHOTS = [dict(src=s, at=a, end=a + s[1] - s[0]) for s, a in SHOTS]
END_VEIL, LOGO = 432 / FPS, 462 / FPS


def load_source(path):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def t_axis(n):
    return np.arange(n) / SR


def ramp(t, a, b):
    """0 -> 1 between a and b (equal-power friendly sine shape)."""
    x = np.clip((t - a) / max(b - a, 1e-9), 0, 1)
    return np.sin(0.5 * np.pi * x)


def fft_filter(x, lo=None, hi=None, order=2):
    """Zero-phase band shaping in the frequency domain (soft Butterworth-like slopes)."""
    n = len(x)
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        g /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * (g[:, None] if x.ndim == 2 else g), n, axis=0)


def granular(src, dur, grain=0.45, seed=0):
    """Endless texture from a short clip: Hann grains from random positions, 50 % overlap."""
    r = np.random.default_rng(seed)
    g = int(grain * SR)
    hop = g // 2
    win = np.hanning(g)[:, None]
    out = np.zeros((int(dur * SR) + g, 2))
    for p in range(0, len(out) - g, hop):
        s = r.integers(0, len(src) - g)
        out[p:p + g] += src[s:s + g] * win
    return out[:int(dur * SR)]


def reverb(x, seconds=2.6, mix=0.32, seed=1):
    """Convolution with a decorrelated, darkened exponential noise tail."""
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = t_axis(n)
    ir = r.standard_normal((n, 2)) * np.exp(-6.9 * t / seconds)[:, None]
    ir = fft_filter(ir, lo=180, hi=5200)
    ir[: int(0.012 * SR)] = 0                       # short pre-delay
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    m = len(x) + n
    wet = np.fft.irfft(np.fft.rfft(x, m, axis=0) * np.fft.rfft(ir, m, axis=0), m, axis=0)[: len(x)]
    return (1 - mix) * x + mix * wet * 3.0


def place(dst, clip, at):
    i = int(round(at * SR))
    j = min(len(dst), i + len(clip))
    if j > i:
        dst[i:j] += clip[: j - i]


# ---------------------------------------------------------------- location sound
def sync_sound(src, n):
    """Re-cut the original sound shot by shot onto the new timeline, crossfaded at the overlaps."""
    out = np.zeros((n, 2))
    t = t_axis(n)
    have = len(src) / SR
    for i, s in enumerate(SHOTS[:3]):
        a, e = s['at'] / FPS, (s['end'] + 1) / FPS
        shift = s['src'][0] / FPS - a                # source time = output time + shift
        g = np.ones(n)
        if i > 0:
            prev = SHOTS[i - 1]
            g *= ramp(t, a, (prev['end'] + 1) / FPS)
        if i < 2:
            nxt = SHOTS[i + 1]
            g *= 1 - ramp(t, nxt['at'] / FPS, e)
        else:
            g *= 1 - ramp(t, have - shift - 0.35, have - shift)   # the rough cut runs out here
        g[(t < a) | (t > e)] = 0
        idx = np.clip(((t + shift) * SR).astype(int), 0, len(src) - 1)
        out += src[idx] * g[:, None]
    return out


def ambience(src, n):
    """Garden air from the first shot, under the whole spot."""
    garden = src[int(0.1 * SR): int(3.7 * SR)]
    bed = granular(garden, n / SR, grain=1.2, seed=3)
    bed = fft_filter(bed, lo=120, hi=9000)
    t = t_axis(n)
    lvl = 0.55 + 0.45 * (1 - ramp(t, 3.0, 4.0))      # louder on the opening wide shot
    lvl *= 1 - 0.6 * ramp(t, END_VEIL, LOGO + 0.6)
    return bed * lvl[:, None]


def water(src, n):
    """Pouring water continues past the end of the rough-cut sound and settles in the empty tub."""
    pour = src[int(7.0 * SR): int(8.08 * SR)]
    bed = granular(pour, n / SR, grain=0.38, seed=5)
    t = t_axis(n)
    s3, s4 = SHOTS[2], SHOTS[3]
    runs_out = len(src) / SR - (s3['src'][0] - s3['at']) / FPS   # output time where the rough-cut sound ends
    g = ramp(t, runs_out - 0.35, runs_out) * (1 - ramp(t, s4['at'] / FPS, (s3['end'] + 1) / FPS + 0.6))
    calm = fft_filter(bed, hi=1800) * 0.35 * (ramp(t, s4['at'] / FPS, s4['at'] / FPS + 0.8)
                                              * (1 - ramp(t, s4['end'] / FPS - 0.2, s4['end'] / FPS + 0.6)))[:, None]
    return bed * g[:, None] + calm


def bubbles(n):
    """Whirlpool jets: a soft rumble plus thousands of tiny rising bubble blips."""
    t = t_axis(n)
    rumble = fft_filter(rng.standard_normal((n, 2)), lo=60, hi=520) * 0.22
    fizz = fft_filter(rng.standard_normal((n, 2)), lo=2500, hi=9000) * 0.035
    blips = np.zeros((n, 2))
    start, stop = SHOTS[4]['at'] / FPS - 0.3, TOTAL
    count = int((stop - start) * 95)
    for _ in range(count):
        at = rng.uniform(start, stop)
        f0 = np.exp(rng.uniform(np.log(380), np.log(2600)))
        d = rng.uniform(0.012, 0.045)
        m = int(d * SR)
        tt = t_axis(m)
        f = f0 * (1 + 2.2 * tt / d)                  # bubbles rise in pitch as they resonate
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (d / 4)) * rng.uniform(0.02, 0.09)
        pan = rng.uniform(0.2, 0.8)
        place(blips, np.stack([b * (1 - pan), b * pan], 1) * 2, at)
    g = ramp(t, SHOTS[4]['at'] / FPS - 0.2, SHOTS[4]['at'] / FPS + 1.0)
    g *= 1 - ramp(t, END_VEIL, LOGO + 0.8) * 0.85
    return (rumble + fizz + blips) * g[:, None]


def swells(n):
    """Soft air swells that carry the picture transitions (no hard whooshes)."""
    out = np.zeros((n, 2))
    t = t_axis(n)
    for i in range(1, len(SHOTS)):
        a, e = SHOTS[i]['at'] / FPS, (SHOTS[i - 1]['end'] + 1) / FPS
        mid = (a + e) / 2
        d = 1.1 if i != 4 else 1.6
        seg = (t > mid - d) & (t < mid + d * 0.7)
        k = np.zeros(n)
        x = (t[seg] - (mid - d)) / (d * 1.7)
        k[seg] = np.sin(np.pi * np.clip(x, 0, 1)) ** 3
        noise = fft_filter(rng.standard_normal((n, 2)), lo=300, hi=2600 if i != 4 else 1800)
        out += noise * k[:, None] * (0.05 if i != 4 else 0.035)
    return out


# ---------------------------------------------------------------- music
def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pad_voice(f, dur, attack=1.4, release=1.8, seed=0):
    r = np.random.default_rng(seed)
    n = int((dur + release) * SR)
    t = t_axis(n)
    env = np.minimum(1, t / attack) * np.where(t < dur, 1, np.exp(-(t - dur) / (release / 4)))
    env *= 0.5 - 0.5 * np.cos(np.pi * np.minimum(1, t / attack))   # smooth onset
    out = np.zeros((n, 2))
    for ch, det in ((0, -4.5), (1, 4.5)):
        ff = f * 2 ** (det / 1200)
        lfo = 1 + 0.0016 * np.sin(2 * np.pi * r.uniform(0.15, 0.3) * t + r.uniform(0, 6))
        ph = 2 * np.pi * np.cumsum(ff * lfo) / SR
        v = sum(np.sin(h * ph + r.uniform(0, 6)) / h ** 1.6 for h in range(1, 7))
        out[:, ch] = v
    return out * env[:, None]


def bell(f, decay=2.2):
    n = int(decay * 2.5 * SR)
    t = t_axis(n)
    v = (np.sin(2 * np.pi * f * t) * np.exp(-t / decay)
         + 0.35 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / (decay * 0.5))
         + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / (decay * 0.25)))
    v *= 1 - np.exp(-t / 0.004)
    return v


def music(n):
    out = np.zeros((n, 2))
    # D major, slow and open. (start s, length s, MIDI notes)
    chords = [
        (0.0, 4.6, [50, 57, 62, 64, 66, 69]),        # Dmaj9
        (4.4, 4.6, [47, 54, 59, 62, 64, 66]),        # Bm11
        (8.8, 4.6, [43, 50, 55, 59, 62, 66]),        # Gmaj7(9)
        (13.2, 3.4, [45, 52, 57, 61, 64, 66]),       # A6/9
        (16.4, 5.6, [50, 57, 62, 64, 66, 69, 74]),   # Dmaj9 – lands with the end card
    ]
    for ci, (at, dur, notes) in enumerate(chords):
        for ni, m in enumerate(notes):
            lvl = 0.05 if m >= 55 else 0.075
            place(out, pad_voice(midi(m), dur, seed=ci * 10 + ni) * lvl, at)
        place(out, np.stack([np.sin(2 * np.pi * midi(notes[0] - 12) * t_axis(int((dur + 1.5) * SR)))] * 2, 1)
              * (np.minimum(1, t_axis(int((dur + 1.5) * SR)) / 1.2)
                 * np.exp(-np.maximum(0, t_axis(int((dur + 1.5) * SR)) - dur) / 0.4))[:, None] * 0.05, at)
    # Sparse bell figure, on the picture beats.
    notes = [(0.55, 81), (2.2, 78), (3.5, 76),            # garden, push in
             (5.85, 74), (7.4, 76),                       # control, water
             (9.05, 78), (10.9, 81),                      # sunlight, empty tub
             (12.35, 83), (13.1, 81),                     # couple appears (rim highlight)
             (15.6, 78), (17.2, 76),                      # closer
             (LOGO, 74), (LOGO + 0.42, 81), (LOGO + 0.9, 86)]  # logo
    for at, m in notes:
        b = bell(midi(m)) * 0.06
        pan = 0.5 + 0.25 * np.sin(at * 1.7)
        place(out, np.stack([b * (1 - pan), b * pan], 1) * 2, at)
    t = t_axis(n)
    out *= (ramp(t, 0, 0.6) * (1 - ramp(t, TOTAL - 1.4, TOTAL - 0.02)))[:, None]
    return reverb(out, seconds=3.2, mix=0.38)


def main():
    src = load_source(sys.argv[1])
    n = int(TOTAL * SR)
    t = t_axis(n)

    loc = sync_sound(src, n) * 0.9 + water(src, n) * 0.6
    amb = ambience(src, n) * 0.55
    bub = bubbles(n) * 0.9
    fx = swells(n)
    mus = music(n) * 0.7

    # Music sits under the sync sound at the start and opens up from the empty tub on.
    duck = 0.6 + 0.4 * ramp(t, 8.8, 10.0)
    mix = loc + amb + bub + fx + mus * duck[:, None]
    mix = fft_filter(mix, lo=35)
    mix *= (1 - ramp(t, TOTAL - 0.25, TOTAL))[:, None]
    mix /= np.max(np.abs(mix)) / 0.5

    # Loudness for social feeds: -14 LUFS integrated, sample peaks kept under -1.5 dBFS.
    write(sys.argv[2], mix)
    gain = 10 ** ((-14.0 - integrated_lufs(sys.argv[2])) / 20)
    gain = min(gain, 10 ** (-1.5 / 20) / np.max(np.abs(mix)))
    write(sys.argv[2], mix * gain)
    print(f'{n / SR:.2f} s, {integrated_lufs(sys.argv[2]):.1f} LUFS -> {sys.argv[2]}')


def write(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def integrated_lufs(path):
    log = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                         check=True, capture_output=True, text=True).stderr
    summary = log[log.rindex('Summary:'):]
    return float(summary.split('I:')[1].split('LUFS')[0])


if __name__ == '__main__':
    main()
