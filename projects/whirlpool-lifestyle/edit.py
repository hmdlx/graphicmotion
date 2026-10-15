#!/usr/bin/env python3
"""Whirlpool Lifestyle 1:1 - finaler Schnitt mit Speed-Ramps und Motion-Übergängen.

    python3 -I projects/whirlpool-lifestyle/edit.py <hi_dir> <out.mp4> [--stills t1,t2,...]

<hi_dir> enthält die drei Einstellungen der Quelle als 96-fps-Bildfolgen (A/, B/, C/),
erzeugt von scripts/interpolate_shots.sh. Jede Einstellung wird über eine Zeitkurve
(Output-Sekunde -> Quell-Sekunde) abgespielt: flache Kurve = Slow Motion, steile Kurve =
Zeitraffer. Schnelle Passagen bekommen Bewegungsunschärfe über eine 180°-Belichtung
(gemittelte Zwischenbilder).
"""
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, 'source', 'whirlpool-lifestyle_12s_v2.mp4')
W = H = 1440
FPS = 24
TOTAL = 288                      # 12,0 s
HI_FPS = 96                      # Bildrate der interpolierten Einstellungen
SHUTTER = 0.5                    # 180°

# --- Schnittliste -------------------------------------------------------------------
# Quelle (24 fps): A Totale außen 0-71, B Frau im Whirlpool 93-185, C Bedienfeld/Düse
# 199-287. Die Überblendungen der Quelle (72-92, 186-198) sind herausgeschnitten.
# TIME: Stützpunkte (Output-s, Quell-s je Einstellung), monoton kubisch interpoliert.
TIME = {
    'A': [(0.00, 0.00), (1.60, 0.62), (2.60, 1.52), (3.10, 2.92)],   # 0,4x -> ~4x in den Übergang
    'B': [(2.98, 0.00), (3.55, 1.08), (6.25, 2.06), (7.14, 3.82)],   # landet schnell, 0,36x, ~3,5x raus
    'C': [(6.82, 0.00), (7.35, 0.95), (12.00, 2.38)],                # landet schnell, 0,3x auf dem Wasserstrahl
}
CUT1 = 3.00      # Zoom-Through: Totale taucht ins Wasser, landet bei der Frau
CUT2 = 6.98      # Whip-Pan: Frau -> Düse
WHIP = 0.30      # Dauer Whip-Pan (s)
END = 10.55      # Beginn Endcard (Unschärfe + Navy)
NAVY = np.array([14, 34, 52], np.float32) / 255

# Zoom-Zentren (relativ): Wasserfläche der Totalen, Wasser vor der Frau, Düse + Bedienfeld
CENTER = {'A': (0.52, 0.48), 'B': (0.42, 0.60), 'C': (0.36, 0.50)}


# --- Kurven ---------------------------------------------------------------------------
def pchip(keys):
    """Monotone kubische Hermite-Interpolation (Fritsch-Carlson) -> f(t)."""
    x = np.array([k[0] for k in keys], float)
    y = np.array([k[1] for k in keys], float)
    h = np.diff(x)
    d = np.diff(y) / h
    m = np.zeros_like(y)
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, len(y) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    # Endsteigungen: Beschleunigung in den Übergang hinein / Abbremsen beim Landen behalten
    if len(y) > 2:
        m[0] = max(0.0, 1.5 * d[0] - 0.5 * m[1])
        m[-1] = max(0.0, 1.5 * d[-1] - 0.5 * m[-2])

    def f(t):
        if t <= x[0]:
            return y[0] + m[0] * (t - x[0])
        if t >= x[-1]:
            return y[-1] + m[-1] * (t - x[-1])
        i = int(np.searchsorted(x, t) - 1)
        s = (t - x[i]) / h[i]
        h00, h10 = 2 * s**3 - 3 * s**2 + 1, s**3 - 2 * s**2 + s
        h01, h11 = -2 * s**3 + 3 * s**2, s**3 - s**2
        return h00 * y[i] + h10 * h[i] * m[i] + h01 * y[i + 1] + h11 * h[i] * m[i + 1]
    return f


REMAP = {k: pchip(v) for k, v in TIME.items()}


def clamp01(u):
    return min(1.0, max(0.0, u))


def ease_in_out(u):
    u = clamp01(u)
    return 4 * u**3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2


def ease_out_expo(u):
    u = clamp01(u)
    return 1.0 if u >= 1 else 1 - 2 ** (-10 * u)


def ease_out_cubic(u):
    return 1 - (1 - clamp01(u)) ** 3


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


# --- Quellbilder ----------------------------------------------------------------------
class Shot:
    def __init__(self, folder):
        self.files = sorted(os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('.jpg'))
        self.cache = {}

    def frame(self, i):
        i = min(max(i, 0), len(self.files) - 1)
        if i not in self.cache:
            if len(self.cache) > 48:
                self.cache.pop(next(iter(self.cache)))
            self.cache[i] = np.asarray(Image.open(self.files[i]).convert('RGB'), np.float32) / 255
        return self.cache[i]

    def at(self, t_src, speed):
        """Bild zur Quellzeit t_src; schnelle Passagen mit 180°-Bewegungsunschärfe."""
        pos = t_src * HI_FPS
        expo = speed * SHUTTER / FPS * HI_FPS          # Belichtung in Zwischenbildern
        if expo <= 1.25:                                # Slow Motion: weich zwischen zwei Bildern
            i = int(np.floor(pos))
            a = pos - i
            return self.frame(i) * (1 - a) + self.frame(i + 1) * a
        n = int(round(expo))
        idx = np.linspace(pos - expo / 2, pos + expo / 2, n + 1)
        return sum(self.frame(int(round(j))) for j in idx) / len(idx)


def speed_at(shot, t):
    f = REMAP[shot]
    return max(0.0, (f(t + 0.01) - f(t - 0.01)) / 0.02)


def transform(img, scale, center, off=(0.0, 0.0), zoom_blur=0.0, samples=12):
    """Skalierung um center (relativ) + Versatz in px; optional radiale Zoom-Unschärfe."""
    pil = Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8))
    px, py = center[0] * W, center[1] * H

    def one(s):
        data = (1 / s, 0, px - (px + off[0]) / s, 0, 1 / s, py - (py + off[1]) / s)
        return np.asarray(pil.transform((W, H), Image.AFFINE, data, Image.BICUBIC), np.float32)

    if zoom_blur < 0.004 and scale == 1 and off == (0.0, 0.0):
        return img
    if zoom_blur < 0.004:
        return one(scale) / 255
    k = max(4, min(samples, int(zoom_blur * 120)))
    acc = sum(one(scale * (1 + zoom_blur * j / (k - 1))) for j in range(k))
    return acc / (k * 255)


def blur_x(img, length):
    """Bewegungsunschärfe horizontal (Box-Filter über kumulative Summe)."""
    L = int(length)
    if L < 2:
        return img
    pad = L // 2 + 1
    p = np.pad(img, ((0, 0), (pad, pad), (0, 0)), mode='edge')
    c = np.cumsum(p, axis=1, dtype=np.float64)
    c = np.concatenate([np.zeros((H, 1, 3)), c], axis=1)
    start = np.arange(W) + pad - L // 2
    return ((c[:, start + L] - c[:, start]) / L).astype(np.float32)


def rgb_split(img, px):
    if px < 0.5:
        return img
    s = int(round(px))
    out = img.copy()
    out[:, s:, 0] = img[:, :-s, 0]
    out[:, :-s, 2] = img[:, s:, 2]
    return out


# --- Grading --------------------------------------------------------------------------
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r2 = ((xx - W / 2) ** 2 + (yy - H / 2) ** 2) / (W / 2) ** 2
VIGNETTE = (1 - 0.16 * np.clip(r2 - 0.25, 0, None))[..., None]
GRADE = {   # (Belichtung, RGB-Balance): C ist kühler und heller als A/B
    'A': (1.00, np.array([1.00, 1.00, 1.00], np.float32)),
    'B': (1.00, np.array([1.00, 1.00, 0.99], np.float32)),
    'C': (0.96, np.array([1.025, 1.0, 0.965], np.float32)),
}


def grade(img, shot):
    exp, bal = GRADE[shot]
    x = np.clip(img * exp * bal, 0, 1)
    x = x + 0.07 * (x - 0.5) * (1 - np.abs(2 * x - 1))     # sanfte S-Kurve
    return x


def finish(img, n):
    x = img * VIGNETTE
    rng = np.random.default_rng(1000 + n)
    grain = rng.normal(0, 0.010, (H // 2, W // 2)).astype(np.float32)
    grain = np.repeat(np.repeat(grain, 2, 0), 2, 1)[..., None]
    return np.clip(x + grain * (0.6 + 0.4 * (1 - x)), 0, 1)


# --- Einstellungen pro Output-Zeit --------------------------------------------------------
SHOTS = {}


def base(shot, t):
    return grade(SHOTS[shot].at(REMAP[shot](t), speed_at(shot, t)), shot)


def scale_A(t):
    push = 1.03 + 0.05 * clamp01(t / 2.6)
    u = clamp01((t - 2.50) / (CUT1 + 0.06 - 2.50))
    return push * (1 + 1.7 * u ** 3)


def scale_B(t):
    land = 1 + 0.8 * (1 - ease_out_expo((t - (CUT1 - 0.02)) / 0.75))
    push = 1 + 0.05 * smooth((t - 3.5) / 3.3)
    out = 1 + 0.06 * clamp01((t - (CUT2 - 0.5)) / 0.5) ** 2
    return land * push * out


def scale_C(t):
    return 1.02 + 0.12 * smooth((t - (CUT2 - WHIP / 2)) / (12.0 - CUT2))


def zoom_rate(fn, t):
    """Relative Skalierungsänderung während der Belichtung -> Stärke der Zoom-Unschärfe."""
    dt = SHUTTER / FPS
    return abs(fn(t + dt / 2) / fn(t - dt / 2) - 1)


def render_A(t):
    return transform(base('A', t), scale_A(t), CENTER['A'], zoom_blur=min(0.35, zoom_rate(scale_A, t)))


def render_B(t, off=(0.0, 0.0)):
    return transform(base('B', t), scale_B(t), CENTER['B'], off,
                     zoom_blur=min(0.35, zoom_rate(scale_B, t)))


def render_C(t, off=(0.0, 0.0)):
    return transform(base('C', t), scale_C(t), CENTER['C'], off)


def whip_p(t):
    return ease_in_out((t - (CUT2 - WHIP / 2)) / WHIP)


LOGO = LOGO_URL = None


def endcard(img, t):
    u = smooth((t - END) / 0.65)
    if u <= 0:
        return img
    pil = Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8))
    x = np.asarray(pil.filter(ImageFilter.GaussianBlur(18 * u)), np.float32) / 255
    x = x * (1 - 0.58 * u) + NAVY * 0.58 * u
    for png, t0, y_mid, rise in ((LOGO, END + 0.30, 0.47, 26), (LOGO_URL, END + 0.55, 0.575, 18)):
        a = ease_out_cubic((t - t0) / 0.6)
        if a <= 0:
            continue
        s = 0.94 + 0.06 * a
        g = png.resize((round(png.width * s), round(png.height * s)), Image.LANCZOS)
        arr = np.asarray(g, np.float32) / 255
        x0 = (W - g.width) // 2
        y0 = int(H * y_mid - g.height / 2 + rise * (1 - a))
        al = arr[..., 3:4] * a
        reg = x[y0:y0 + g.height, x0:x0 + g.width]
        x[y0:y0 + g.height, x0:x0 + g.width] = reg * (1 - al) + arr[..., :3] * al
    return x


def render(n):
    t = n / FPS
    # 1) Totale -> Zoom-Through ins Wasser -> Frau
    if t < CUT1 - 0.06:
        img = render_A(t)
    elif t < CUT1 + 0.06:
        a = smooth((t - (CUT1 - 0.06)) / 0.12)
        img = render_A(t) * (1 - a) + render_B(t) * a
    elif t < CUT2 - WHIP / 2:
        img = render_B(t)
    # 2) Whip-Pan: beide Bilder als Filmstreifen nach links, Unschärfe nach Geschwindigkeit
    elif t < CUT2 + WHIP / 2:
        p = whip_p(t)
        shift = p * W
        b = render_B(t, (-shift, 0.0))
        c = render_C(t, (W - shift, 0.0))
        seam = W - shift
        mask = np.clip((xx[0] - seam) / 24 + 0.5, 0, 1)[None, :, None]
        img = b * (1 - mask) + c * mask
        dt = SHUTTER / FPS
        vel = abs(whip_p(t + dt / 2) - whip_p(t - dt / 2)) * W
        img = rgb_split(blur_x(img, vel), min(10.0, vel / 40))
    else:
        img = render_C(t)

    # Lichtblitz am Zoom-Through (warmes Weiß, schnell rein, weich raus)
    d = t - CUT1
    flash = np.exp(-(d / (0.05 if d < 0 else 0.11)) ** 2)
    if flash > 0.01:
        glow = np.asarray(Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))
                          .resize((W // 8, H // 8), Image.BILINEAR)
                          .filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.BILINEAR), np.float32) / 255
        warm = np.array([1.0, 0.97, 0.92], np.float32)
        img = 1 - (1 - img) * (1 - glow * 0.9 * flash) * (1 - warm * 0.55 * flash)  # Screen
        img = rgb_split(img, 6 * flash)

    img = finish(img, n)
    return endcard(img, t)


# --- Ton --------------------------------------------------------------------------------
SR = 48000


def bandnoise(dur, f_lo, f_hi, env, seed, pan=None):
    """Rauschen mit gleitendem Bandpass (STFT-Maske) -> Whoosh/Riser."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    hop, win = 256, 1024
    noise = rng.normal(0, 1, n + win)
    out = np.zeros(n + win)
    w = np.hanning(win)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for s in range(0, n, hop):
        u = s / n
        fc = f_lo(u) if callable(f_lo) else f_lo
        bw = f_hi(u) if callable(f_hi) else f_hi
        mask = np.exp(-0.5 * (np.log2(np.maximum(freqs, 1) / fc) / bw) ** 2)
        spec = np.fft.rfft(noise[s:s + win] * w) * mask
        out[s:s + win] += np.fft.irfft(spec) * w
    out = out[:n]
    out /= np.abs(out).max() + 1e-9
    e = np.array([env(i / n) for i in range(0, n, 64)])
    out *= np.interp(np.arange(n), np.arange(0, n, 64), e)
    if pan is None:
        return np.stack([out, out], 1)
    p = np.array([pan(i / n) for i in range(0, n, 64)])
    p = np.interp(np.arange(n), np.arange(0, n, 64), p)      # -1 links .. +1 rechts
    return np.stack([out * np.sqrt((1 - p) / 2), out * np.sqrt((1 + p) / 2)], 1)


def place(bus, clip, t0, gain):
    i = int(t0 * SR)
    j = min(len(bus), i + len(clip))
    bus[i:j] += clip[:j - i] * gain


def build_audio(path):
    total = TOTAL / FPS
    # Atmo der Quelle: Garten bis zum Zoom-Through, ab dort das Sprudeln (Quelle ab 3,25 s,
    # minimal gedehnt, damit es bis zum Ende reicht). Einsatz des Wassers liegt auf dem Blitz.
    raw = subprocess.run([
        'ffmpeg', '-v', 'error', '-i', SOURCE, '-filter_complex',
        f'[0:a]atrim=0:{CUT1 + 0.04},asetpts=PTS-STARTPTS,afade=t=out:st={CUT1 - 0.04}:d=0.08[a];'
        f'[0:a]atrim=3.25:12,asetpts=PTS-STARTPTS,atempo={8.75 / (total - CUT1 + 0.04):.4f},'
        f'afade=t=in:d=0.06,adelay={int((CUT1 - 0.04) * 1000)}:all=1[b];'
        f'[a][b]amix=inputs=2:normalize=0,atrim=0:{total}',
        '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    bed = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    bus = np.zeros((int(total * SR), 2))
    bus[:len(bed)] += bed[:len(bus)]
    # Atmo leiser unter der Endcard
    tt = np.arange(len(bus)) / SR
    bus *= (1 - 0.55 * np.clip((tt - END) / 0.8, 0, 1))[:, None]

    # Riser in den Zoom-Through, endet hart auf dem Schnitt
    rise = 0.85
    place(bus, bandnoise(rise, lambda u: 250 * 16 ** u, 0.9, lambda u: u ** 2.2 * (1 if u < 0.97 else (1 - u) / 0.03), 1),
          CUT1 - rise, 0.32)
    # Sub-Hit + kurzer Wasser-Splash auf dem Blitz
    n = int(0.9 * SR)
    ts = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (52 * ts - 9 * ts ** 2)) * np.exp(-ts * 5.5) * np.minimum(1, ts * 400)
    place(bus, np.stack([sub, sub], 1), CUT1, 0.42)
    place(bus, bandnoise(0.6, lambda u: 2600 - 1800 * u, 1.2, lambda u: min(1, u * 40) * (1 - u) ** 2.5, 2), CUT1, 0.16)
    # Whoosh am Whip-Pan, wandert mit dem Bild von rechts nach links
    wd = 0.55
    place(bus, bandnoise(wd, lambda u: 500 + 2200 * np.sin(np.pi * u), 1.0, lambda u: np.sin(np.pi * u) ** 3, 3,
                         pan=lambda u: 0.8 - 1.6 * u), CUT2 - wd / 2, 0.30)
    # Endcard: weicher Glocken-Akkord zum Logo
    n = int(1.6 * SR)
    ts = np.arange(n) / SR
    bell = sum(a * np.sin(2 * np.pi * f * ts) * np.exp(-ts * d)
               for f, a, d in ((659.3, 1.0, 2.2), (987.8, 0.6, 2.8), (1318.5, 0.35, 3.4), (1975.5, 0.12, 4.5)))
    bell *= np.minimum(1, ts * 200)
    place(bus, np.stack([bell * 0.9, bell], 1), END + 0.30, 0.07)

    bus *= np.clip((total - tt) / 0.25, 0, 1)[:, None]           # kurzer Ausklang
    pcm = (np.clip(bus, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())


def loudness(path):
    """Integrierte Lautheit (LUFS) nach EBU R128."""
    log = subprocess.run(['ffmpeg', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    summary = log[log.rindex('Summary:'):]
    return float(summary.split('I:')[1].split('LUFS')[0])


# --- Ausgabe ----------------------------------------------------------------------------
def main():
    hi, out = sys.argv[1], sys.argv[2]
    stills = sys.argv[4].split(',') if len(sys.argv) > 4 and sys.argv[3] == '--stills' else None
    global LOGO, LOGO_URL
    for k in 'ABC':
        SHOTS[k] = Shot(os.path.join(hi, k))
    logo = Image.open(os.path.join(HERE, 'gfx', 'logo.png')).convert('RGBA')
    LOGO = logo.resize((920, round(logo.height * 920 / logo.width)), Image.LANCZOS)
    url = Image.open(os.path.join(HERE, "gfx", "url.png")).convert("RGBA")
    LOGO_URL = url.resize((round(url.width * 1.3), round(url.height * 1.3)), Image.LANCZOS)

    if stills:
        os.makedirs(out, exist_ok=True)
        for s in stills:
            n = round(float(s) * FPS)
            p = os.path.join(out, f'still_{n:04d}.jpg')
            Image.fromarray((render(n) * 255 + 0.5).astype(np.uint8)).save(p, quality=92)
            print(p)
        return

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    wav = os.path.splitext(out)[0] + '.tmp.wav'
    build_audio(wav)
    gain = -14.0 - loudness(wav)                    # Social-Standard -14 LUFS, Limiter auf -1,5 dBFS
    ff = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-i', wav, '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
        '-profile:v', 'high', '-level', '5.1', '-tune', 'film',
        '-af', f'volume={gain:.2f}dB,alimiter=limit=0.84:attack=2:release=60:level=false', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)
    for n in range(TOTAL):
        ff.stdin.write((render(n) * 255 + 0.5).astype(np.uint8).tobytes())
        if n % 24 == 0:
            print(f'{n / FPS:5.1f} s', flush=True)
    ff.stdin.close()
    ff.wait()
    os.remove(wav)
    if ff.returncode:
        sys.exit(ff.returncode)
    print(out)


if __name__ == '__main__':
    main()
