#!/usr/bin/env python3
"""Soundtrack for a composition: the source clip's audio as a bed, stretched to the
new length, plus synthesized sound design (impacts, whooshes, glitch zaps, risers, UI ticks).

    python3 -I scripts/sound_design.py <source.mp4> <sound.json> <out.wav>

sound.json: {"length": seconds, "bed_gain": 0.5, "events": [{"t": 1.2, "type": "impact", "gain": 1}, ...]}
Types: impact, whoosh, glitch, riser (uses "dur"), tick, lock, shimmer.
"""
import json
import subprocess
import sys
import wave

import numpy as np

SR = 48000
rs = np.random.RandomState(1130)


def env(n, a, d):
    """Attack/exponential-decay envelope, a and d in seconds."""
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def lowpass(x, cutoff):
    """One-pole lowpass with a per-sample cutoff (Hz)."""
    c = np.broadcast_to(np.asarray(cutoff, float), x.shape)
    k = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += k[i] * (x[i] - acc); y[i] = acc
    return y


def impact(gain=1.0):
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    f = 38 + 90 * np.exp(-t * 18)                      # pitch drop
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.55)
    click = lowpass(rs.randn(n), 2500) * env(n, 0.001, 0.025) * 0.8
    tail = lowpass(rs.randn(n), 600) * env(n, 0.01, 0.35) * 0.25
    s = np.tanh((sub * 1.2 + click + tail) * 1.4) * 0.8 * gain
    return np.stack([s, s], 1)


def whoosh(gain=1.0, dur=0.55):
    n = int(SR * dur)
    t = np.arange(n) / SR
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    cut = 300 + 5200 * shape
    l = lowpass(rs.randn(n), cut) - lowpass(rs.randn(n), 180)
    r = lowpass(rs.randn(n), cut) - lowpass(rs.randn(n), 180)
    pan = np.linspace(-0.6, 0.6, n)
    return np.stack([l * (1 - pan), r * (1 + pan)], 1) * shape[:, None] * 0.35 * gain


def glitch(gain=1.0):
    n = int(SR * 0.22)
    out = np.zeros((n, 2))
    pos = 0
    while pos < n:
        ln = int(SR * rs.uniform(0.008, 0.035))
        seg = np.arange(min(ln, n - pos))
        kind = rs.randint(3)
        if kind == 0:
            s = np.sign(np.sin(2 * np.pi * rs.uniform(300, 2400) * seg / SR))
        elif kind == 1:
            s = np.round(rs.randn(len(seg)) * 3) / 3
        else:
            s = np.zeros(len(seg))
        s = s * rs.uniform(0.2, 0.6)
        out[pos:pos + len(seg), 0] = s * rs.uniform(0.4, 1)
        out[pos:pos + len(seg), 1] = s * rs.uniform(0.4, 1)
        pos += len(seg)
    return out * env(n, 0.002, 0.12)[:, None] * 0.5 * gain


def riser(gain=1.0, dur=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    k = t / dur
    f = 180 * 2 ** (k * 2.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.12
    noise = lowpass(rs.randn(n), 400 + 7000 * k ** 2) * 0.5
    s = (tone + noise) * k ** 2.2
    return np.stack([s, s * 0.95], 1) * 0.5 * gain


def tick(gain=1.0, f=3200):
    n = int(SR * 0.06)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.012)
    return np.stack([s, s], 1) * 0.22 * gain


def lock(gain=1.0):
    a = tick(gain, 2400)
    b = tick(gain, 3600)
    out = np.zeros((int(SR * 0.16), 2))
    out[:len(a)] += a
    out[int(SR * 0.07):int(SR * 0.07) + len(b)] += b
    return out


def shimmer(gain=1.0, dur=3.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f, a in [(220, 0.5), (329.6, 0.35), (440, 0.3), (659.3, 0.18), (880, 0.12)]:
        s += a * np.sin(2 * np.pi * f * t + rs.uniform(0, 6)) * (0.6 + 0.4 * np.sin(2 * np.pi * rs.uniform(0.3, 0.8) * t))
    e = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.8)
    s = s * e * 0.12 * gain
    return np.stack([s, np.roll(s, int(SR * 0.012))], 1)


SYNTH = {'impact': impact, 'whoosh': whoosh, 'glitch': glitch, 'riser': riser, 'tick': tick, 'lock': lock, 'shimmer': shimmer}


def load_bed(src, length):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    dur = len(raw) / 8 / SR
    tempo = max(0.5, min(2.0, dur / length))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vn', '-ac', '2', '-ar', str(SR),
                          '-af', f'atempo={tempo:.5f}', '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def main():
    src, cfg_path, out = sys.argv[1:4]
    cfg = json.load(open(cfg_path))
    n = int(SR * cfg['length'])
    mix = np.zeros((n, 2))
    bed = load_bed(src, cfg['length'])[:n]
    mix[:len(bed)] += bed * cfg.get('bed_gain', 0.5)
    for ev in cfg['events']:
        kw = {k: v for k, v in ev.items() if k not in ('t', 'type')}
        s = SYNTH[ev['type']](**kw)
        # Risers and whooshes end on their time stamp; everything else starts there.
        at = ev['t'] - (len(s) / SR if ev['type'] in ('riser',) else len(s) / SR / 2 if ev['type'] == 'whoosh' else 0)
        i = int(round(at * SR))
        a, b = max(0, i), min(n, i + len(s))
        if b > a:
            mix[a:b] += s[a - i:b - i]
    # Fade out, gentle bus saturation, peak to -1 dBFS.
    fade = int(SR * 0.6)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix = np.tanh(mix * 1.1)
    mix *= 10 ** (-1 / 20) / max(1e-6, np.abs(mix).max())
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'{cfg["length"]:.2f} s, {len(cfg["events"])} events -> {out}')


if __name__ == '__main__':
    main()
