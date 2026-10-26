#!/usr/bin/env python3
"""Synthesise music and animation sounds for a composition and mix them with the voice-over.

    python3 -I scripts/sound_design.py <events.json> <voiceover.wav> <out_dir>

events.json comes from scripts/dump_events.js (window.COMP.events()); every sound is
placed on those cues, so it stays in sync when the timeline changes. Everything is
synthesised here (no samples, no licences): a 120 BPM electronic bed in A minor
(Am–F–C–G) whose drop lands when the phone flies in, a breakdown while the code is
typed and a final hit on the end card, plus whooshes for the camera flights and UI
sounds for taps, cart drops, tier unlocks, codes and typing. The music is ducked
under the voice. Writes music.wav, sfx.wav and mix.wav (48 kHz stereo, -14 LUFS).
Needs numpy, scipy and ffmpeg.
"""
import json, os, subprocess, sys, wave

import numpy as np
from scipy.ndimage import maximum_filter1d, uniform_filter1d
from scipy.signal import butter, fftconvolve, sosfilt, sosfilt_zi

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
DROP = 6.0          # beat comes in (phone flies in)
BREAK = (28.0, 30.0)  # breakdown while the code is typed
FINAL = 33.0        # end-card hit


# ------------------------------------------------------------------ basics
def ts(dur):
    return np.arange(int(dur * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def rng(seed):
    return np.random.default_rng(seed)


def sos(kind, f, order=2):
    nyq = SR / 2 * 0.98
    f = np.clip(f, 20, nyq) if np.ndim(f) else min(max(f, 20), nyq)
    return butter(order, f, btype=kind, fs=SR, output='sos')


def filt(x, kind, f, order=2):
    return sosfilt(sos(kind, f, order), x)


def peaking(x, f0, gain_db, q):
    """RBJ peaking EQ."""
    a = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    b = np.array([1 + al * a, -2 * np.cos(w), 1 - al * a])
    d = np.array([1 + al / a, -2 * np.cos(w), 1 - al / a])
    return sosfilt(np.concatenate([b / d[0], d / d[0]])[None, :], x)


def tv_filter(x, kind, freq_fn, block=256, order=2):
    """Time-varying filter: coefficients per block, state carried across blocks."""
    out = np.empty_like(x)
    zi = None
    for i in range(0, len(x), block):
        f = freq_fn((i + block / 2) / SR)
        s = sos(kind, f, order)
        if zi is None or zi.shape[0] != s.shape[0]:
            zi = sosfilt_zi(s) * 0
        out[i:i + block], zi = sosfilt(s, x[i:i + block], zi=zi)
    return out


def pan2(x, p):
    """Equal-power pan, p in -1..1 (scalar or per-sample)."""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def add(buf, at, sig, gain=1.0, p=0.0):
    if sig.ndim == 1:
        sig = pan2(sig, p)
    i = int(round(at * SR))
    if i >= buf.shape[1]:
        return
    j = min(buf.shape[1], i + sig.shape[1])
    lo = max(0, -i)
    buf[:, max(i, 0):j] += gain * sig[:, lo:j - i]


def adsr(n, a=0.005, d=0.1, s=0.7, r=0.1, gate=None):
    t = np.arange(n) / SR
    gate = gate if gate is not None else n / SR - r
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((t - gate) / r, 0, 1)
    return e * (1 - rel)


def saw(f, t, harmonics=12):
    """Band-limited sawtooth by additive synthesis (f may be a scalar)."""
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        if k * f > SR / 2.2:
            break
        out += np.sin(2 * np.pi * k * f * t) / k
    return out * 0.6


def reverb(x, decay=1.8, seed=3, pre=0.012):
    """Stereo convolution reverb with a synthetic exponentially decaying IR."""
    n = int(decay * 1.3 * SR)
    t = np.arange(n) / SR
    r = rng(seed)
    irs = []
    for ch in range(2):
        ir = r.standard_normal(n) * np.exp(-6.9 * t / decay)
        ir = filt(ir, 'lowpass', 6500)
        ir[: int(pre * SR)] = 0
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    mono = x.mean(axis=0) if x.ndim == 2 else x
    return np.stack([fftconvolve(mono, irs[c])[: len(mono)] for c in range(2)])


# ------------------------------------------------------------------ instruments
def kick():
    t = ts(0.45)
    f = 46 + 120 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = filt(rng(1).standard_normal(len(t)), 'highpass', 2500) * np.exp(-t * 380) * 0.35
    return np.tanh(1.6 * (body + click)) * 0.9


def clap(seed=2):
    t = ts(0.35)
    n = filt(rng(seed).standard_normal(len(t)), 'bandpass', [900, 2600])
    e = np.zeros_like(t)
    for k, d in enumerate([0, 0.011, 0.022]):
        e += (t >= d) * np.exp(-np.clip(t - d, 0, None) * (70 if k < 2 else 16))
    return n * e * 0.6


def hat(open_=False, seed=4):
    t = ts(0.3 if open_ else 0.08)
    n = filt(rng(seed).standard_normal(len(t)), 'highpass', 7500)
    return n * np.exp(-t * (11 if open_ else 85)) * 0.5


def crash(dur=2.4, seed=5):
    t = ts(dur)
    n = filt(rng(seed).standard_normal(len(t)), 'highpass', 4200)
    n += 0.4 * filt(rng(seed + 1).standard_normal(len(t)), 'bandpass', [2500, 7000])
    return n * np.exp(-t * 2.2) * 0.35


def bass_note(n, dur):
    t = ts(dur + 0.05)
    f = midi(n)
    x = saw(f, t, 14) * 0.8 + np.sin(2 * np.pi * f * t) * 0.9
    x = filt(filt(x, 'lowpass', 300), 'highpass', 38)
    return x * adsr(len(t), 0.004, 0.08, 0.5, 0.05, gate=dur)


def pluck(n, dur=0.45, bright=1.0):
    t = ts(dur)
    f = midi(n)
    x = np.zeros_like(t)
    for k in range(1, 9):
        if k * f > SR / 2.2:
            break
        x += np.sin(2 * np.pi * k * f * t) / k ** 1.4 * np.exp(-t * (5 + k * 9 / bright))
    return x * np.minimum(1, t / 0.003) * 0.5


def pad_chord(notes, dur, seed=0):
    t = ts(dur + 0.6)
    voices = []
    for vi, d in enumerate((-9, 0, 9)):          # detune in cents, spread L / C / R
        x = np.zeros_like(t)
        for n in notes:
            f = midi(n) * 2 ** (d / 1200)
            x += saw(f, t + 0.13 * vi + 0.07 * n, 12)
        voices.append(x)
    e = adsr(len(t), 0.35, 0.6, 0.85, 0.6, gate=dur)
    st = pan2(voices[0], -0.6) + pan2(voices[1], 0) + pan2(voices[2], 0.6)
    return st * e * 0.12


def bell(f, dur=1.0, bright=1.0):
    t = ts(dur)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2)
         + 0.35 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t * 6 / bright)
         + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 11 / bright))
    return x * np.minimum(1, t / 0.0015) * 0.5


def noise_swell(dur, f0, f1, seed=9, curve=2.0):
    """Riser: band-pass noise sweeping f0 -> f1 with a growing level."""
    t = ts(dur)
    n = rng(seed).standard_normal(len(t))
    fc = lambda s: f0 * (f1 / f0) ** (s / dur)
    x = tv_filter(n, 'bandpass', lambda s: [fc(s) * 0.7, fc(s) * 1.4])
    return x * (t / dur) ** curve


# ------------------------------------------------------------------ music
PROG = {  # pad voicing, bass note
    'Am': ([57, 60, 64, 69], 33),
    'F': ([57, 60, 65, 69], 29),
    'C': ([55, 60, 64, 67], 36),
    'G': ([55, 59, 62, 67], 31),
}
ORDER = ['Am', 'F', 'C', 'G']


def chord_at(bar):
    # Intro bars lead F – C – G into the drop on Am.
    return ORDER[(bar - int(DROP / BAR)) % 4]


def music(total, ev):
    buf = np.zeros((2, int(total * SR)))
    drums = np.zeros_like(buf)
    send = np.zeros_like(buf)                     # reverb send
    k_, cl_, hc_, ho_ = kick(), clap(), hat(), hat(True)
    kicks = []
    arp = np.zeros_like(buf)                      # plucks, EQ'd separately
    human = rng(77)

    def in_break(s):
        return BREAK[0] <= s < BREAK[1]

    nbars = int(np.ceil(total / BAR))
    for b in range(nbars):
        t0 = b * BAR
        name = chord_at(b)
        notes, root = PROG[name]
        if t0 >= FINAL - 0.01:
            break
        # Pad: through the whole bed, filtered closed in the intro and the breakdown.
        add(buf, t0, pad_chord(notes, BAR), 1.0)
        for beat in range(4):
            s = t0 + beat * BEAT
            if s >= FINAL - 0.01:
                break
            groove = DROP <= s < FINAL - BAR / 2 and not in_break(s)
            if groove:
                add(drums, s, k_, 1.0)
                kicks.append(s)
                if beat in (1, 3):
                    add(drums, s, cl_, 0.5, 0.05)
                    add(send, s, cl_, 0.25)
                add(drums, s + BEAT / 2, hc_ if beat != 3 else ho_, 0.32, 0.25)
                add(buf, s + BEAT / 2, bass_note(root, BEAT / 2 - 0.02), 0.55)
                add(buf, s + 3 * BEAT / 4, bass_note(root + (12 if beat == 3 else 0), BEAT / 4 - 0.02), 0.32)
            # 16th shaker, from 4 s on in the intro, quieter under the groove.
            if s >= 4.0 and not in_break(s):
                for q in range(4):
                    add(drums, s + q * BEAT / 4, hat(seed=10 + q), 0.07 if q % 2 else 0.04, -0.3)
        # Plucked arpeggio (16ths) over the chord, one octave up.
        if t0 >= 2.0:
            seq = [0, 2, 1, 3, 2, 1, 3, 2]
            for q in range(16):
                s = t0 + q * BEAT / 4
                if s >= FINAL - 0.01:
                    break
                n = notes[seq[q % 8]] + 12
                v = (0.9 if q % 4 == 0 else 0.6) * (0.55 if s < DROP else 1) * human.uniform(0.82, 1.0)
                s += human.uniform(-0.004, 0.004)
                x = pluck(n, 0.42, 0.8 if in_break(s) else 1.0)
                add(arp, s, x, 0.20 * v, 0.35 if q % 2 else -0.35)
                add(send, s, x, 0.12 * v)

    # Snare build into the end-card hit.
    build = FINAL - BAR / 2
    for i, frac in enumerate(np.concatenate([np.arange(0, 0.5, 1 / 8), np.arange(0.5, 1, 1 / 16)])):
        s = build + frac * (FINAL - build)
        add(drums, s, clap(20 + i), 0.18 + 0.4 * frac, 0.05)
    add(buf, build, pan2(noise_swell(FINAL - build, 500, 7000, 31), 0), 0.22)

    # Intro: slam on BLACK WEEK, riser + reverse cymbal into the drop.
    t = ts(2.2)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    add(buf, ev['slam'], np.tanh(2 * boom) * 0.75)
    add(send, ev['slam'], np.tanh(2 * boom) * 0.2)
    add(buf, DROP - 2.2, pan2(noise_swell(2.2, 300, 6000, 7), 0), 0.20)
    add(drums, DROP - 1.2, crash(1.2, 8)[::-1], 0.6)             # reverse cymbal
    add(drums, DROP, crash(), 0.9)

    # Breakdown: riser back into the groove.
    add(buf, BREAK[1] - 1.6, pan2(noise_swell(1.6, 400, 5000, 12), 0), 0.16)
    add(drums, BREAK[1], crash(1.8, 14), 0.6)

    # End card: hit on C major, long tail, soft sparkle.
    notes = [48, 55, 60, 64, 67, 72]
    hit = pad_chord(notes, 4.4) * 1.4
    add(buf, FINAL, hit)
    add(send, FINAL, hit, 0.6)
    add(drums, FINAL, k_, 1.1)
    add(drums, FINAL, crash(3.0, 15), 1.0)
    add(buf, FINAL, bass_note(36, 1.6), 0.7)
    for i, n in enumerate([72, 76, 79, 84, 79, 76, 72, 67]):
        x = pluck(n, 0.6)
        add(buf, FINAL + 0.25 + i * BEAT / 2, x, 0.12 * (1 - i / 10), (-1) ** i * 0.4)
        add(send, FINAL + 0.25 + i * BEAT / 2, x, 0.12)

    # Filter the melodic bus: closed in the intro, opening into the drop, dips in the breakdown.
    def cutoff(s):
        if s < DROP:
            return 500 * (5200 / 500) ** (s / DROP) ** 1.6
        if BREAK[0] <= s < BREAK[1]:
            return 5200 - 4000 * np.sin(np.pi * (s - BREAK[0]) / (BREAK[1] - BREAK[0])) ** 2
        return 5200
    # Tame the plucks' 3–5 kHz, then scoop the 100–250 Hz mud out of bass + pad.
    for ch in range(2):
        arp[ch] = filt(filt(arp[ch], 'lowpass', 3200), 'highpass', 300)
        buf[ch] = tv_filter(buf[ch] + arp[ch], 'lowpass', cutoff, block=512)
    buf = peaking(buf, 180, -4.5, 0.9)

    # Sidechain pump from the kicks.
    tt = np.arange(buf.shape[1]) / SR
    pump = np.ones_like(tt)
    for s in kicks:
        i = int(s * SR)
        seg = tt[i:i + int(0.4 * SR)] - s
        pump[i:i + len(seg)] = np.minimum(pump[i:i + len(seg)], 1 - 0.55 * np.exp(-seg / 0.09))
    buf *= pump

    out = buf + drums + 0.35 * reverb(send, 2.4, 21)
    # Fade the tail.
    fade = np.sin(np.pi / 2 * np.clip((total - tt) / 2.4, 0, 1)) ** 2
    return np.tanh(out * 1.2) * fade


# ------------------------------------------------------------------ sound effects
def whoosh(dur, strength=1.0, seed=0, f_lo=250, f_hi=4200, direction=1):
    t = ts(dur)
    peak = 0.55
    shape = np.exp(-((t / dur - peak) / 0.22) ** 2)
    n = rng(seed).standard_normal(len(t))
    centre = lambda s: f_lo + (f_hi - f_lo) * np.exp(-((s / dur - peak) / 0.25) ** 2)
    air = tv_filter(n, 'bandpass', lambda s: [centre(s) * 0.6, centre(s) * 1.6])
    rumble = filt(rng(seed + 1).standard_normal(len(t)), 'lowpass', 160) * 2.5
    x = (air + rumble * strength * 0.6) * shape
    p = direction * np.linspace(-0.7, 0.7, len(t))
    return pan2(x / (np.abs(x).max() + 1e-9), p) * strength


def pop(f=700, seed=0):
    t = ts(0.12)
    fr = f * (1 + 0.9 * (1 - np.exp(-t * 60)))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 38)
    x += filt(rng(seed).standard_normal(len(t)), 'bandpass', [1500, 5000]) * np.exp(-t * 400) * 0.3
    return x * 0.7


def click(seed=0, f=1900):
    t = ts(0.05)
    x = filt(rng(seed).standard_normal(len(t)), 'bandpass', [1800, 6500]) * np.exp(-t * 320)
    x += np.sin(2 * np.pi * f * t) * np.exp(-t * 220) * 0.6
    return x * 0.6


def thud(seed=0):
    t = ts(0.4)
    x = np.sin(2 * np.pi * np.cumsum(55 + 70 * np.exp(-t * 25)) / SR) * np.exp(-t * 11)
    x += filt(rng(seed).standard_normal(len(t)), 'lowpass', 600) * np.exp(-t * 45) * 0.5
    return np.tanh(1.5 * x) * 0.8


def sfx(total, ev):
    buf = np.zeros((2, int(total * SR)))
    send = np.zeros_like(buf)

    def put(at, sig, gain, p=0.0, wet=0.3):
        add(buf, at, sig, gain, p)
        add(send, at, sig, gain * wet, p)

    # Camera flights: whoosh peaking at the fastest part of the move.
    for i, (a, b, swoop) in enumerate(ev['flights']):
        dur = b - a + 0.5
        big = 1.0 if (swoop or i in (1, 6)) else 0.75
        hi = 3000 if i == 0 else 4200
        put(a, whoosh(dur, big, 40 + i, f_hi=hi, direction=(-1) ** i), (0.42 if i == 0 else 0.55) * big, wet=0.25)
    # Intro: cubes pop in, ticks while the amount counts up.
    for i, s in enumerate(ev['cubes']):
        put(s, pop(520 + 70 * i, i), 0.18, (-1) ** i * 0.5)
    for i, s in enumerate(ev['count']):
        put(s, click(60 + i, 2600), 0.14, 0.1, 0.1)
    put(ev['count'][-1], bell(midi(88), 0.9), 0.16)
    # Phone flies in and lands.
    put(ev['phoneIn'][1] - 0.1, thud(3), 0.25, 0, 0.1)
    put(ev['pop'], pop(600, 5), 0.32, 0.2)
    # Taps.
    for i, s in enumerate(ev['taps']):
        put(s, click(70 + i, 1500), 0.4, 0.1, 0.15)
    # Products drop into the cart: soft "pling".
    for i, s in enumerate(ev['adds']):
        put(s - 0.02, pop(900, 80 + i), 0.18, 0.3)
        put(s + 0.03, bell(midi(79 + (i % 2) * 5), 0.7), 0.22, 0.3)
        put(s + 0.11, bell(midi(84 + (i % 2) * 5), 0.8), 0.17, 0.3)
    # Tier unlocks: ascending chime (higher per tier) + hinge thump of the amount.
    chimes = [[72, 76, 79], [76, 79, 84], [79, 84, 88, 91]]
    for i, s in enumerate(ev['unlocks']):
        for j, n in enumerate(chimes[i]):
            put(s + j * 0.07, bell(midi(n), 1.3), 0.2, (j - 1) * 0.3, 0.5)
        put(s + 0.05, thud(90 + i), 0.3, 0, 0.15)
        put(s - 0.2, whoosh(0.45, 0.5, 95 + i, 600, 3000), 0.25)
    # Code chips fly in and click into place.
    for i, s in enumerate(ev['chips']):
        put(s - 0.05, whoosh(0.6, 0.6, 110 + i, 500, 5000, -1), 0.35)
        put(s + 0.42, click(120 + i, 1200), 0.35, 0.15)
    # Typing the code.
    for i, s in enumerate(ev['typing']):
        put(s, filt(click(130 + i, 1100 + 90 * (i % 3)), 'lowpass', 4000), 0.14, 0.1, 0.05)
    # −150 € jumps out: pop + coin.
    put(ev['minus'], pop(420, 150), 0.4)
    put(ev['minus'] + 0.06, thud(151), 0.3)
    put(ev['minus'] + 0.12, bell(midi(71), 0.5, 0.6), 0.2, 0.2)
    put(ev['minus'] + 0.2, bell(midi(76), 1.2, 0.6), 0.2, 0.2)
    # Headlines flip in: light swish.
    for i, s in enumerate(ev['heads']):
        put(s - 0.05, whoosh(0.5, 0.35, 160 + i, 1500, 7000), 0.12)
    # CTA.
    put(ev['cta'], click(170, 1300), 0.3)
    put(ev['cta'] + 0.05, bell(midi(84), 1.0), 0.14)

    return buf + 0.4 * reverb(send, 1.4, 33)


# ------------------------------------------------------------------ mix
def load_wav(path):
    w = wave.open(path)
    assert w.getframerate() == SR, f'{path}: expected {SR} Hz'
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    a = a.reshape(-1, w.getnchannels()).T
    return np.vstack([a, a]) if a.shape[0] == 1 else a


def save_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x.T * 32767).astype(np.int16).tobytes())


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def main():
    ev_path, vo_path, out_dir = sys.argv[1:4]
    ev = json.load(open(ev_path))
    total = ev['total']
    os.makedirs(out_dir, exist_ok=True)

    vo = load_wav(vo_path)
    n = int(total * SR)
    vo = np.pad(vo, ((0, 0), (0, max(0, n - vo.shape[1]))))[:, :n]

    mus = music(total, ev)
    fx = sfx(total, ev)
    # Levels: music bed ~6 dB under the voice before ducking, effects peaking well below it.
    groove = slice(int(DROP * SR), int(BREAK[0] * SR))
    mus *= 10 ** ((rms_db(vo[:, groove]) - 6 - rms_db(mus[:, groove])) / 20)
    fx *= 10 ** ((-9 - 20 * np.log10(np.abs(fx).max() + 1e-12)) / 20)

    # Duck the music under the voice (about -5 dB), with a soft attack and release.
    env = np.abs(vo).max(axis=0)
    env = maximum_filter1d(env, int(0.08 * SR))
    env = uniform_filter1d(env, int(0.25 * SR))
    duck = 1 - 0.45 * np.clip(env / 0.08, 0, 1)
    save_wav(os.path.join(out_dir, 'music.wav'), mus)
    save_wav(os.path.join(out_dir, 'sfx.wav'), fx)

    mix = vo + mus * duck + fx
    raw = os.path.join(out_dir, 'mix.raw.wav')
    save_wav(raw, mix / max(1.0, np.abs(mix).max()))
    out = os.path.join(out_dir, 'mix.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af',
                    'alimiter=limit=0.89:attack=3:release=60,loudnorm=I=-14:TP=-1.0:LRA=9,aresample=48000',
                    '-ac', '2', out], check=True)
    os.remove(raw)
    print(out)


if __name__ == '__main__':
    main()
