#!/usr/bin/env python3
"""Rebuild a clip's soundtrack to the length of its speed-ramped edit.

    python3 -I scripts/music.py <edit.json> <source.mp4> <out.wav>

edit.json "music.segments" lists source-audio ranges in output order. Splices sit on
beat onsets: each segment fades in over a few ms *before* its start point, so the onset
lands exactly on the output position. "stretch" re-times a segment to the given
length without changing pitch (rubberband); "tail" adds a short echo decay. The result
is cut to the length of the edit and loudness-normalised for social.
"""
import json
import subprocess
import sys

import numpy as np

SR = 48000
XF = int(0.008 * SR)  # splice cross-fade


def decode(src, af=None, start=None, dur=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", f"{start:.6f}"]
    if dur is not None:
        cmd += ["-t", f"{dur:.6f}"]
    cmd += ["-i", src, "-vn"]
    if af:
        cmd += ["-af", af]
    cmd += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def fit(x, n):
    return x[:n] if len(x) >= n else np.concatenate([x, np.zeros((n - len(x), 2), np.float32)])


def main():
    edit_path, src, out = sys.argv[1:4]
    edit = json.load(open(edit_path))
    full = decode(src)
    total = round(sum(sh["dur"] for sh in edit["shots"]) * SR)
    mix = np.zeros((total + SR, 2), np.float32)

    pos = 0
    for seg in edit["music"]["segments"]:
        a, b = seg["src"]
        if "stretch" in seg:
            n = round(seg["stretch"] * SR)
            body = fit(decode(src, f"atrim={a}:{b},rubberband=tempo={(b - a) / seg['stretch']:.6f}"), n)
        else:
            n = round((b - a) * SR)
            body = full[round(a * SR):round(a * SR) + n]
        pre = full[max(0, round(a * SR) - XF):round(a * SR)] if pos else np.zeros((0, 2), np.float32)
        piece = np.concatenate([pre, body])
        if seg.get("tail"):
            piece = decode_tail(piece)
        ramp = np.linspace(0, 1, len(pre), dtype=np.float32)[:, None]
        piece[:len(pre)] *= ramp
        start = pos - len(pre)
        if pos:  # fade the previous segment out under the pre-roll
            mix[start:pos] *= (1 - ramp)
        end = min(len(mix), start + len(piece))
        mix[start:end] += piece[:end - start]
        pos += n

    mix = mix[:total]
    fade = round(0.35 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), "-c:a", "pcm_s16le", out],
                   input=mix.tobytes(), check=True)
    print(f"{total / SR:.2f} s -> {out}")


def decode_tail(piece):
    """Hit + echo decay (0.9 s) so the edit can ring out under the end card."""
    pad = np.concatenate([piece, np.zeros((round(0.9 * SR), 2), np.float32)])
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                        "-af", "aecho=1.0:0.85:180|360|540:0.45|0.28|0.16", "-f", "f32le", "-"],
                       input=pad.tobytes(), check=True, capture_output=True)
    y = np.frombuffer(p.stdout, np.float32).reshape(-1, 2).copy()
    return fit(y, len(pad))


if __name__ == "__main__":
    main()
