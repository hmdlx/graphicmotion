#!/usr/bin/env python3
"""Synthesised trailer score + sound design for the DFB-Pokal cinematic cut.

Writes two 48 kHz stereo stems next to this file:
  music.wav  – drums, bass, strings, brass, pad, risers (ducked under the VO in the mix)
  sfx.wav    – whooshes and slam accents that follow the picture cuts

Every hit is placed on a picture/VO cue (output seconds, see CUES); the groove runs
at 120 BPM from the first full hit on.
"""
import os
import wave
import numpy as np
from scipy import signal

SR = 48000
DUR = 37.0
N = int(DUR * SR)
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))

# Picture/VO cues (output seconds; VO starts at 0.8 s).
CUES = {
    'flutlicht': 0.80, 'pokalnacht': 2.55, 'groove': 4.60, 'gegen': 6.09, 'vfb': 6.53,
    'verlosen': 8.79, 'vier': 9.62, 'zwei': 10.23, 'tickets': 10.64, 'dfb': 11.47,
    'mittwoch': 13.62, 'datum': 14.48, 'anstoss': 16.62, 'achtzehn': 17.58,
    'arena': 18.85, 'home': 19.17, 'arena2': 20.03,
    'like': 21.30, 'markiere': 22.38,
    'teilnahme': 25.36, 'datum2': 26.42, 'glueck': 28.31,
    'logo': 31.56, 'slogan': 32.81,
}
CUTS = [2.30, 4.45, 8.60, 13.40, 18.70, 21.10, 25.20, 31.30]   # scene transitions
BPM = 120
BEAT = 60 / BPM

# D minor: bar chords (root MIDI notes) cycling Dm – Bb – Gm – A
CHORDS = [(50, [0, 3, 7]), (46, [0, 4, 7]), (43, [0, 3, 7]), (45, [0, 4, 7])]


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def place(buf, start, x, gain=1.0, pan=0.0):
    """Add mono or stereo x into stereo buf at time start (s)."""
    i = int(round(start * SR))
    if i >= len(buf):
        return
    if x.ndim == 1:
        l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    j = min(len(buf), i + len(x))
    if i < 0:
        x, i = x[-i:], 0
    buf[i:j] += x[: j - i] * gain


def sweep(f0, f1, dur, curve=6.0):
    t = t_axis(dur)
    f = f1 + (f0 - f1) * np.exp(-curve * t / dur * 4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env(dur, a=0.002, d=0.3):
    t = t_axis(dur)
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def filt(x, kind, f, order=2):
    sos = signal.butter(order, f, kind, fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def saw(freq, dur, detune=(0.0,)):
    t = t_axis(dur)
    out = np.zeros_like(t)
    for d in detune:
        ph = (t * freq * 2 ** (d / 1200) + rng.random()) % 1.0
        out += 2 * ph - 1
    return out / len(detune)


def make_ir(dur=2.6, damp=3500):
    t = t_axis(dur)
    ir = np.stack([noise(dur), noise(dur)], 1) * np.exp(-t / (dur / 6.5))[:, None]
    ir = filt(ir, 'lowpass', damp)
    ir[: int(0.012 * SR)] = 0
    return ir / np.abs(ir).sum(0).max() * 6


IR_BIG = make_ir(3.2, 3000)
IR_ROOM = make_ir(1.1, 6000)


def reverb(x, ir, wet):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet


# ---------- instruments ----------
def kick(power=1.0):
    d = 0.45
    body = sweep(160, 44, d, 5) * env(d, 0.001, 0.22)
    click = filt(noise(0.006), 'highpass', 2000) * 0.4
    x = body.copy()
    x[: len(click)] += click
    return np.tanh(x * 1.6 * power) * 0.9


def boom(size=1.0):
    d = 3.2
    sub = sweep(75, 27, d, 3) * env(d, 0.002, 0.9 * size)
    tom = sweep(110, 62, 0.9, 8) * env(0.9, 0.001, 0.25)
    crack = filt(noise(0.6), 'bandpass', [180, 2500]) * env(0.6, 0.001, 0.09)
    x = np.zeros(int(d * SR))
    x += sub * 1.1
    x[: len(tom)] += tom * 0.8
    x[: len(crack)] += crack * 0.7
    x = np.tanh(x * 1.8) * 0.8
    return reverb(x, IR_BIG, 0.35 * size)


def taiko(f=80):
    d = 0.7
    x = sweep(f * 1.6, f, d, 10) * env(d, 0.001, 0.18)
    sk = filt(noise(0.1), 'bandpass', [120, 900]) * env(0.1, 0.001, 0.03)
    x[: len(sk)] += sk * 0.6
    return np.tanh(x * 1.4) * 0.6


def clap():
    d = 0.9
    x = filt(noise(d), 'bandpass', [700, 4500]) * env(d, 0.001, 0.06) * 0.45
    gc = sweep(95, 58, d, 8) * env(d, 0.001, 0.16) * 0.5        # gran cassa layer
    return reverb(np.tanh((x + gc) * 1.5), IR_BIG, 0.4)


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    return filt(noise(d), 'highpass', 7500) * env(d, 0.0005, 0.08 if open_ else 0.018) * 0.22


def bass_note(m, dur):
    f = mtof(m)
    x = saw(f, dur, (-6, 6)) * 0.6 + np.sin(2 * np.pi * f * t_axis(dur)) * 0.6
    x = filt(x, 'lowpass', 420)
    sub = np.sin(2 * np.pi * f / 2 * t_axis(dur)) * 0.7                # sub octave for weight
    return np.tanh((x + sub) * env(dur, 0.003, 0.16) * 2.2) * 0.45


def string_note(m, dur):
    x = saw(mtof(m), dur, (-9, 0, 8))
    x = filt(filt(x, 'lowpass', 1700), 'highpass', 220)
    return x * env(dur, 0.004, 0.07) * 0.15


def brass(root, ints, dur=0.9):
    x = sum(saw(mtof(root + 12 + i), dur, (-7, 7)) for i in ints + [12])
    x += saw(mtof(root), dur, (-4, 4)) * 0.8
    t = t_axis(dur)
    x *= 1 + 0.35 * np.sin(2 * np.pi * 31 * t)                 # growl
    x = np.tanh(x * 1.6)
    out = np.zeros_like(x)
    # filter envelope: bright attack closing down, done in blocks
    blk = 1024
    for s in range(0, len(x), blk):
        fc = 500 + 2600 * np.exp(-t[s] / 0.15)
        out[s:s + blk] = filt(x[s:s + blk], 'lowpass', fc, 1)
    return out * env(dur, 0.006, 0.28) * 0.12


def pad(root, ints, dur):
    t = t_axis(dur)
    x = sum(saw(mtof(root + i), dur, (-10, -3, 4, 11)) for i in ints + [-12])
    x = filt(filt(x, 'lowpass', 650), 'highpass', 160)
    a = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.4)
    return x * a * 0.05


def riser(dur):
    t = t_axis(dur)
    k = t / dur
    nz = noise(dur)
    out = np.zeros_like(nz)
    blk = 1024
    for s in range(0, len(nz), blk):
        fc = 300 * (20 ** k[s])
        out[s:s + blk] = filt(nz[s:s + blk], 'bandpass', [fc * 0.7, min(fc * 1.4, 20000)], 1)
    tone = np.sin(2 * np.pi * np.cumsum(180 * (6 ** k)) / SR) * 0.25
    return (out * 0.8 + tone) * (k ** 2.2) * 0.5


def reverse_swell(dur=1.4):
    x = filt(noise(dur), 'lowpass', 5000) * env(dur, 0.001, dur / 4)
    x = reverb(x, IR_BIG, 0.8)[::-1]
    return x * 0.35


def whoosh(dur=0.45, up=True):
    t = t_axis(dur)
    k = t / dur
    nz = noise(dur)
    out = np.zeros_like(nz)
    blk = 512
    for s in range(0, len(nz), blk):
        fc = 400 * (12 ** (k[s] if up else 1 - k[s]))
        out[s:s + blk] = filt(nz[s:s + blk], 'bandpass', [fc * 0.6, min(fc * 1.6, 20000)], 1)
    a = np.sin(np.pi * k) ** 1.5
    pan = np.linspace(-0.8, 0.8, len(t))
    return np.stack([out * a * np.sqrt(0.5 * (1 - pan)), out * a * np.sqrt(0.5 * (1 + pan))], 1) * 0.6


def sparkle(dur=2.5):
    t = t_axis(dur)
    x = sum(np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t / (0.6 + 0.2 * i)) for i, m in enumerate([86, 93, 98, 105]))
    return reverb(x * 0.05, IR_BIG, 0.6)


# ---------- arrangement ----------
music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))
kick_times = []

# Intro: swell into the first boom, heartbeat + drone.
place(music, CUES['flutlicht'] - 1.4, reverse_swell(1.4), 1.0)
place(music, CUES['flutlicht'], boom(1.1), 1.0)
place(music, CUES['pokalnacht'], boom(0.8), 0.8)
for t0 in np.arange(1.3, CUES['groove'] - 0.4, 1.0):
    for dt, g in ((0, 0.55), (0.22, 0.4)):
        place(drums, t0 + dt, kick(0.7), g)
        kick_times.append(t0 + dt)
place(music, CUES['flutlicht'], pad(38, [0, 7], CUES['groove'] - CUES['flutlicht'] + 0.3), 1.2)
place(music, CUES['groove'] - 1.4, riser(1.4), 1.0)
for i, t0 in enumerate(np.arange(CUES['groove'] - 1.0, CUES['groove'], 0.125)):   # snare roll
    place(drums, t0, clap(), 0.25 + 0.6 * i / 8)

# Sections with intensity 0..1 (breakdown under the "how to take part" part).
SECTIONS = [  # start, end, intensity
    (CUES['groove'], CUES['verlosen'], 0.75),
    (CUES['verlosen'], CUES['like'] - 0.2, 1.0),
    (CUES['like'] - 0.2, CUES['teilnahme'], 0.35),
    (CUES['teilnahme'], CUES['logo'], 1.0),
]
for s0, s1, I in SECTIONS:
    n_beats = int(np.floor((s1 - s0) / BEAT + 1e-6))
    for b in range(n_beats):
        tb = s0 + b * BEAT
        bar = int(round((tb - CUES['groove']) / BEAT)) // 4
        root, ints = CHORDS[bar % 4]
        in_bar = int(round((tb - CUES['groove']) / BEAT)) % 4
        # drums
        if I > 0.5:
            if in_bar in (0, 2) or (I > 0.9 and in_bar == 3):
                place(drums, tb, kick(1.0), 0.95)
                kick_times.append(tb)
            if in_bar in (1, 3):
                place(drums, tb, clap(), 0.7)
            place(drums, tb + BEAT * 0.5, taiko(70 if in_bar % 2 else 95), 0.55 * I, pan=(-0.4 if in_bar % 2 else 0.4))
            if I > 0.9 and in_bar == 1:
                place(drums, tb + BEAT * 0.75, taiko(120), 0.35, pan=0.6)
        else:
            if in_bar == 0:
                place(drums, tb, kick(0.6), 0.5)
                kick_times.append(tb)
        for k in range(4):
            place(drums, tb + k * BEAT / 4, hat(open_=(k == 2 and I > 0.9)), (0.7 if k % 2 else 1.0) * (0.5 + 0.5 * I), pan=0.3)
        # bass 8ths
        for k in range(2):
            place(music, tb + k * BEAT / 2, bass_note(root - 12 + (12 if (k and I > 0.9) else 0), BEAT / 2), 0.9 * (0.6 + 0.4 * I))
        # string ostinato 16ths over the chord
        arp = [0, ints[1], ints[2], 12]
        for k in range(4):
            m = root + 12 + arp[(b * 4 + k) % 4]
            place(music, tb + k * BEAT / 4, string_note(m, 0.16), 0.9, pan=(-0.5 if k % 2 else 0.5))
        # bar start: pad + brass stab in the loud parts
        if in_bar == 0:
            place(music, tb, pad(root, ints, 4 * BEAT), 1.0 if I > 0.5 else 1.6)
            if I > 0.9:
                place(music, tb, brass(root, ints), 1.0)

# Final build: 8th taikos, ride, octave strings and a snare roll into the logo.
for tb in np.arange(CUES['teilnahme'], CUES['logo'] - 0.01, BEAT / 2):
    k = (tb - CUES['teilnahme']) / (CUES['logo'] - CUES['teilnahme'])
    place(drums, tb, taiko(85), 0.25 + 0.35 * k, pan=0.0)
    place(drums, tb + BEAT / 4, filt(noise(0.12), 'highpass', 9000) * env(0.12, 0.001, 0.05) * 0.2, 0.6 + 0.4 * k, pan=-0.5)
for i, tb in enumerate(np.arange(CUES['logo'] - 2 * BEAT * 4 / 2, CUES['logo'], BEAT / 4)):
    place(drums, tb, clap(), 0.1 + 0.5 * (i / 16) ** 2)

# Hits on picture cues.
for name, g in (('gegen', 0.5), ('vfb', 0.55), ('verlosen', 1.0), ('vier', 0.6), ('zwei', 0.6), ('tickets', 0.7),
                ('mittwoch', 0.8), ('datum', 0.5), ('anstoss', 0.6), ('achtzehn', 0.6), ('home', 0.7),
                ('teilnahme', 0.9), ('datum2', 0.6)):
    place(music, CUES[name], boom(0.6), g)
for name in ('verlosen', 'mittwoch', 'teilnahme'):
    place(music, CUES[name] - 1.2, riser(1.2), 0.8)
    root, ints = CHORDS[0]
    place(music, CUES[name], brass(root, ints, 1.2), 1.4)
place(music, CUES['logo'] - 1.6, riser(1.6), 1.1)
place(music, CUES['logo'], boom(1.4), 1.2)
place(music, CUES['logo'], brass(38, [0, 7], 2.2), 1.6)
place(music, CUES['logo'], pad(38, [0, 7, 15], DUR - CUES['logo']), 2.0)
place(music, CUES['slogan'], sparkle(3.5), 1.0)
place(music, 34.55 - 0.9, riser(0.9), 0.6)
place(drums, 34.55, boom(1.6), 1.1)

# Sidechain-style pump: duck everything but the kicks after each kick.
duck = np.ones(N)
for kt in kick_times:
    i = int(kt * SR)
    L = int(0.22 * SR)
    if i < N:
        j = min(N, i + L)
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.35 * np.exp(-np.arange(j - i) / (0.08 * SR)))
music *= duck[:, None] ** 0.6
music += reverb(drums, IR_BIG, 0.22)

# SFX: whooshes on the cuts and slams.
for c in CUTS:
    place(sfx, c - 0.3, whoosh(0.5, up=True), 0.9)
for name in ('flutlicht', 'pokalnacht', 'vier', 'zwei', 'tickets', 'datum', 'achtzehn', 'arena2', 'like', 'markiere', 'datum2', 'logo'):
    place(sfx, CUES[name] - 0.18, whoosh(0.3, up=False), 0.5)

def biquad(x, kind, f0, gain_db=0.0, q=0.9):
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    c = np.cos(w)
    if kind == 'peak':
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    else:  # high shelf
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


music = filt(music, 'highpass', 28)
music = biquad(music, 'peak', 250, -3.0, 0.8)
music = biquad(music, 'peak', 400, -3.0, 1.0)            # room for the VO
music = biquad(music, 'shelf', 10000, 2.0)              # air
music = biquad(music, 'peak', 4000, -4.0, 0.9)
music = biquad(music, 'shelf', 7000, -4.0)

# Fade the tail.
fade = np.ones(N)
fs = int((DUR - 0.6) * SR)
fade[fs:] = np.linspace(1, 0, N - fs) ** 2
music *= fade[:, None]
sfx *= fade[:, None]


def write(path, x):
    x = x / max(1e-9, np.abs(x).max()) * 0.89
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(path)


write(os.path.join(HERE, 'music.wav'), music)
write(os.path.join(HERE, 'sfx.wav'), sfx)
