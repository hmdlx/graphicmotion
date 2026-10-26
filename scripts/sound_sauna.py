#!/usr/bin/env python3
"""Synthesised soundtrack for the sauna-guide ad: ambient pad, plucked arpeggio and
sound effects on the cues of projects/sauna-guide/composition.js. No samples, no
licences: everything is generated here with numpy.

    python3 -I scripts/sound_sauna.py <out.wav>

The WAV is 48 kHz stereo; loudness is normalised afterwards with ffmpeg (see README).
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 24.3
N = int(SR * DUR)
rng = np.random.default_rng(7)


def t_axis(d):
    return np.arange(int(SR * d)) / SR


def place(buf, sig, at, gain=1.0, pan=0.0):
    """Mix a mono or stereo signal into buf at time `at` (s), pan −1 … 1."""
    i = int(at * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], axis=1) * np.sqrt(2)
    n = min(len(sig), N - i)
    buf[i:i + n] += sig[:n] * gain


def onepole_lp(x, fc):
    """One-pole low-pass; fc may be a scalar or a per-sample array."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape[:1])
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = np.zeros(x.shape[1:]) if x.ndim > 1 else 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def lp_fast(x, fc):
    """Static low-pass via FFT brick-wall with a soft knee (fast for long signals)."""
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    h = 1 / (1 + (f / fc) ** 4)
    return np.fft.irfft(X * (h if x.ndim == 1 else h[:, None]), n=len(x), axis=0)


def hp_fast(x, fc):
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    h = 1 - 1 / (1 + (f / fc) ** 4)
    return np.fft.irfft(X * (h if x.ndim == 1 else h[:, None]), n=len(x), axis=0)


def bp_fast(x, lo, hi):
    return hp_fast(lp_fast(x, hi), lo)


def env(n, a, d, shape=4.0):
    """Attack (s) then exponential-ish decay over d seconds."""
    tt = np.arange(n) / SR
    up = np.clip(tt / max(a, 1e-4), 0, 1)
    down = np.exp(-shape * np.clip(tt - a, 0, None) / max(d, 1e-4))
    return up * down


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- instruments
def pad_chord(notes, d):
    tt = t_axis(d)
    out = np.zeros((len(tt), 2))
    for k, m in enumerate(notes):
        f = midi(m)
        for det, side in ((-0.09, 0), (0.09, 1), (0.0, None)):
            ph = rng.uniform(0, 2 * np.pi)
            fr = f * 2 ** (det / 12)
            # Soft saw: a few harmonics with 1/n roll-off.
            s = sum(np.sin(2 * np.pi * fr * h * tt + ph * h) / h ** 1.6 for h in range(1, 6))
            s *= 1 + 0.15 * np.sin(2 * np.pi * (0.13 + 0.05 * k) * tt)
            if side is None:
                out += s[:, None] * 0.5
            else:
                out[:, side] += s
    fade = np.minimum(1, tt / 1.6) * np.minimum(1, (d - tt) / 1.4)
    return lp_fast(out * fade[:, None], 1400) / len(notes)


def pluck(f, d=1.6, bright=0.5):
    """Karplus–Strong plucked string."""
    n = int(SR * d)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    buf = onepole_lp(buf, 2000 + 6000 * bright)
    out = np.empty(n)
    for i in range(n):
        j = i % p
        out[i] = buf[j]
        buf[j] = 0.4985 * (buf[j] + buf[(j + 1) % p])
    return out * env(n, 0.002, d, 3.0)


def sub_hit(d=1.4, f0=78, f1=38):
    tt = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-tt * 9)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return s * env(len(tt), 0.003, d, 5.0)


def whoosh(d, lo=300, hi=3000, rise=0.6):
    n = int(SR * d)
    noise = rng.standard_normal(n)
    tt = np.arange(n) / SR
    fc = lo + (hi - lo) * np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    s = onepole_lp(noise, fc) - onepole_lp(noise, fc * 0.35)
    shape = np.where(tt < d * rise, (tt / (d * rise)) ** 2, np.exp(-6 * (tt - d * rise) / (d * (1 - rise) + 1e-3)))
    return s * shape


def tick(f=2600, d=0.035):
    n = int(SR * d)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 140) + rng.standard_normal(n) * np.exp(-tt * 600) * 0.4
    return s


def drop(f0=1400, f1=520, d=0.16):
    tt = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-tt * 38)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.002, d, 6.0)


def hiss(d, a=0.04):
    """Water on hot stones: band-limited sizzle that flutters, plus sparse crackles."""
    n = int(SR * d)
    s = bp_fast(rng.standard_normal(n), 2500, 8500)
    flutter = 0.6 + 0.4 * lp_fast(rng.standard_normal(n), 18) / 0.02
    s *= np.clip(flutter, 0.2, 1.4)
    crackle = (rng.random(n) > 0.9995) * rng.standard_normal(n) * 5
    s = s + bp_fast(crackle, 1500, 7000)
    return s * env(n, a, d, 5.0)


def bell(notes, d=2.5):
    tt = t_axis(d)
    s = np.zeros(len(tt))
    for m in notes:
        f = midi(m)
        for h, g in ((1, 1), (2.76, 0.35), (5.4, 0.12)):
            s += g * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (2.2 + h))
    return s / len(notes)


def reverb(x, secs=2.4, mix=0.32):
    n = int(SR * secs)
    tt = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-tt * 6.5 / secs)[:, None]
    ir = lp_fast(ir, 6000)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    L = len(x) + n
    nfft = 1 << (L - 1).bit_length()
    X = np.fft.rfft(x, nfft, axis=0)
    wet = np.fft.irfft(X * np.fft.rfft(ir, nfft, axis=0), nfft, axis=0)[:len(x)]
    return x * (1 - mix) + wet * mix * 3.0


# ---------------------------------------------------------------- arrangement
def build():
    music = np.zeros((N, 2))
    sfx = np.zeros((N, 2))

    # Chords (MIDI): D major colour, resolves on the end card.
    chords = [
        (0.0, 6.0, [50, 57, 62, 66, 69, 73, 76]),     # Dmaj9
        (6.0, 12.0, [47, 54, 59, 62, 66, 69, 73]),    # Bm9
        (12.0, 17.0, [43, 50, 55, 59, 62, 66, 69]),   # Gmaj9
        (17.0, 20.9, [45, 52, 57, 62, 64, 69, 71]),   # Asus
        (20.9, DUR, [50, 57, 62, 66, 69, 73, 78]),    # Dmaj9
    ]
    for a, b, notes in chords:
        place(music, pad_chord(notes, b - a + 1.4), max(0, a - 0.7), 0.55)

    # Plucked arpeggio, eighth notes at 100 BPM, enters after the hook's first second.
    eighth = 0.3
    pattern = [0, 2, 3, 4, 2, 5, 4, 3]
    t = 0.9
    i = 0
    while t < DUR - 1.2:
        notes = next(n for a, b, n in chords if a <= t < b)
        m = notes[1:][pattern[i % len(pattern)] % (len(notes) - 1)] + 12
        vel = 0.55 + 0.25 * (i % 4 == 0)
        place(music, pluck(midi(m), 1.4, 0.35 + 0.2 * (i % 2)), t, 0.16 * vel, pan=0.35 * np.sin(i * 0.9))
        t += eighth
        i += 1

    # Soft low pulse on the beat from 3.4 s (after the flood), off in the cold scene.
    beat = 0.6
    t = 3.36
    while t < 20.6:
        if not (8.4 < t < 11.2):
            place(music, sub_hit(0.5, 70, 46), t, 0.20)
        t += beat * 2

    # --- SFX on the composition's cues
    place(sfx, sub_hit(1.6, 90, 36), 0.0, 0.8)
    place(sfx, whoosh(0.9, 200, 1600, 0.15), 0.0, 0.35)
    for k, at in enumerate((0.02, 0.11, 0.21, 0.31)):
        place(sfx, tick(1800 + 200 * k), at, 0.09, pan=-0.3)
    # Thermometer riser into the flood.
    tt = t_axis(2.6)
    rise = np.sin(2 * np.pi * np.cumsum(180 + 520 * (tt / 2.6) ** 2) / SR) * (tt / 2.6) ** 2
    place(sfx, rise * 0.5 + whoosh(2.6, 400, 5000, 0.95) * 0.8, 0.5, 0.22, pan=0.4)
    place(sfx, whoosh(0.45, 150, 2200, 0.7), 2.95, 0.6)
    place(sfx, sub_hit(1.2, 85, 40), 3.36, 0.75)
    place(sfx, whoosh(0.5, 300, 4000, 0.4), 3.4, 0.35)
    # Aufguss: water on hot stones, then the stopwatch.
    place(sfx, hiss(1.7, 0.02), 3.92, 0.24, pan=-0.2)
    # One tick per minute mark as the eased hand passes it (inOutCubic over 1.3 s from 4.17 s).
    p = np.linspace(0, 1, 2001)
    hand = np.where(p < 0.5, 4 * p ** 3, 1 - (-2 * p + 2) ** 3 / 2) * 15
    for m in range(1, 16):
        place(sfx, tick(3200, 0.03), 4.17 + 1.3 * p[np.searchsorted(hand, m - 1e-6)], 0.12, pan=0.2)
    # Whip pan left → right.
    w = whoosh(0.55, 250, 6000, 0.55)
    pan = np.linspace(-0.9, 0.9, len(w))
    place(sfx, np.stack([w * np.cos((pan + 1) * np.pi / 4), w * np.sin((pan + 1) * np.pi / 4)], 1) * 1.4, 5.74, 0.6)
    # Breeze in the fresh-air scene.
    n = int(SR * 2.0)
    br = bp_fast(rng.standard_normal(n), 300, 1800) * np.sin(np.pi * np.arange(n) / n) ** 2
    br *= 1 + 0.5 * np.sin(2 * np.pi * 0.7 * np.arange(n) / SR)
    place(sfx, br, 6.15, 0.10, pan=0.5)
    # Cold water rising, splash, drops on the four body parts.
    place(sfx, whoosh(0.6, 120, 1500, 0.8), 7.98, 0.6)
    for k in range(18):
        at = 8.0 + rng.uniform(0, 0.55)
        place(sfx, drop(rng.uniform(700, 1600), rng.uniform(300, 600), 0.09), at, 0.05, pan=rng.uniform(-0.8, 0.8))
    place(sfx, hp_fast(rng.standard_normal(int(SR * 0.9)), 1200) * env(int(SR * 0.9), 0.005, 0.9, 5), 8.55, 0.25)
    for k, at in enumerate((9.02, 9.27, 9.51, 9.76)):
        place(sfx, drop(1500 + 120 * k, 600 + 60 * k), at, 0.35, pan=-0.4)
    place(sfx, tick(1400, 0.05), 9.86, 0.18)
    # Iris opens into the rest scene.
    place(sfx, whoosh(0.65, 200, 2500, 0.6), 10.62, 0.45)
    place(sfx, bell([74, 81], 2.2), 11.2, 0.10)
    for k, at in enumerate((12.2, 12.38)):
        place(sfx, tick(2200, 0.04), at, 0.12)
    # Zoom into the light leak: riser + shimmer.
    place(sfx, whoosh(0.5, 400, 8000, 0.9), 12.95, 0.45)
    place(sfx, bell([86, 90, 93], 2.8), 13.42, 0.22)
    place(sfx, sub_hit(1.0, 70, 40), 13.42, 0.35)
    # Temperature bars: three rising tones, badges pop.
    for k, (at, m) in enumerate(((14.15, 74), (14.40, 78), (14.65, 81))):
        place(sfx, bell([m], 1.2), at, 0.16, pan=-0.2 + 0.2 * k)
    for k, at in enumerate((15.40, 15.54)):
        place(sfx, tick(2600, 0.04), at, 0.14, pan=0.3)
    # Cube turn, cards flying in, carousel moves.
    place(sfx, whoosh(0.75, 100, 1800, 0.55), 17.0, 0.7)
    for k in range(3):
        place(sfx, whoosh(0.5, 500, 5000, 0.6), 17.3 + k * 0.13, 0.18, pan=0.5 - 0.5 * k)
    for a, b in ((18.70, 19.22), (19.62, 20.14)):
        place(sfx, whoosh(b - a + 0.1, 300, 3500, 0.5), a, 0.32, pan=-0.3)
    # Bands into the end card, impact, chips, button.
    place(sfx, whoosh(0.4, 250, 5000, 0.85), 20.52, 0.55)
    place(sfx, sub_hit(1.8, 95, 34), 20.9, 0.9)
    place(sfx, bell([62, 69, 74, 78], 3.5), 20.9, 0.18)
    for k in range(4):
        place(sfx, tick(2000 + 180 * k, 0.04), 21.85 + k * 0.09, 0.10, pan=-0.3 + 0.2 * k)
    place(sfx, tick(1200, 0.06), 22.2, 0.18)
    place(sfx, bell([86], 1.5), 23.1, 0.07)

    music = reverb(music, 2.6, 0.38)
    sfx = lp_fast(reverb(sfx, 1.6, 0.18), 11000)
    mix = music * 0.55 + sfx
    # Fade out the last half second, gentle soft-clip.
    tt = np.arange(N) / SR
    mix *= np.clip((DUR - tt) / 0.5, 0, 1)[:, None]
    mix = np.tanh(mix * 1.1) / 1.1
    return mix / (np.abs(mix).max() + 1e-9) * 0.89


def main(out):
    mix = build()
    data = (mix * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f'{out}: {DUR} s, peak {np.abs(mix).max():.2f}')


if __name__ == '__main__':
    main(sys.argv[1])
