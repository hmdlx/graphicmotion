#!/usr/bin/env python3
"""Speed-ramp a clip into one JPG plate per output frame, with RIFE in-between frames.

    python3 -I scripts/retime.py <edit.json> <source.mp4> <plates_dir> <timeline.js> [--model rife.onnx] [--fast]

edit.json holds the shot list: each shot plays its source frames [a, b] with a speed
curve given as keys [src_frame, speed] (linear ramps between keys). One speed per shot
may be "S": it is solved so the shot lasts exactly `dur` output seconds.

Every output frame lands on a fractional source position. Positions between two source
frames are rendered with RIFE (ONNX, CPU) and cached under <plates_dir>/../rife, so a
re-run after a timing change only computes the new in-betweens. --fast uses the
nearest source frame instead (layout previews).

timeline.js exposes the solved edit to the composition: shot start times and the
playback speed of every output frame.
"""
import json
import math
import os
import subprocess
import sys
import time

import numpy as np
from PIL import Image

QUANT = 32  # in-between positions snap to 1/32 frame -> cache hits across re-runs


def speed_fn(keys, s):
    pts = [(float(f), s if v == "S" else float(v)) for f, v in keys]

    def sp(p):
        if p <= pts[0][0]:
            return pts[0][1]
        for (f0, v0), (f1, v1) in zip(pts, pts[1:]):
            if p <= f1:
                return v0 + (v1 - v0) * (p - f0) / (f1 - f0)
        return pts[-1][1]
    return sp


def shot_table(shot, src_fps, s, step=0.01):
    """Cumulative output time over source position p in [a, b + 1)."""
    a, b = shot["src"]
    sp = speed_fn(shot["keys"], s)
    ps = np.arange(a, b + 1 + 1e-9, step)
    dt = np.array([step / (src_fps * sp(p + step / 2)) for p in ps[:-1]])
    return ps, np.concatenate([[0.0], np.cumsum(dt)]), sp


def solve(shot, src_fps):
    if not any(v == "S" for _, v in shot["keys"]):
        return None
    lo, hi = 0.02, 8.0  # duration falls as S rises
    for _ in range(60):
        mid = (lo + hi) / 2
        if shot_table(shot, src_fps, mid, 0.05)[1][-1] > shot["dur"]:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def build_timeline(edit):
    src_fps, fps = edit["src_fps"], edit["fps"]
    shots, t0 = [], 0.0
    for shot in edit["shots"]:
        s = solve(shot, src_fps)
        ps, ts, sp = shot_table(shot, src_fps, s if s is not None else 1.0)
        dur = ts[-1] if s is None else shot["dur"]
        shots.append(dict(shot, S=s, start=t0, out_dur=dur, ps=ps, ts=ts, sp=sp))
        t0 += dur
    total = int(round(t0 * fps))
    frames = []
    for n in range(total):
        t = n / fps
        sh = next((x for x in shots if t < x["start"] + x["out_dur"] - 1e-9), shots[-1])
        p = float(np.interp(t - sh["start"], sh["ts"], sh["ps"]))
        p = min(max(p, sh["src"][0]), sh["src"][1])
        frames.append((sh["id"], p, sh["sp"](p)))
    return shots, frames, total


def extract(src, grade, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    if os.listdir(out_dir):
        return
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", grade,
                    "-start_number", "0", os.path.join(out_dir, "s%04d.png")], check=True)


class Rife:
    def __init__(self, model):
        import onnxruntime as ort
        so = ort.SessionOptions()
        so.intra_op_num_threads = os.cpu_count() or 4
        self.sess = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])

    @staticmethod
    def _load(path):
        x = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255.0
        return x.transpose(2, 0, 1)[None]

    def __call__(self, a, b, t):
        A, B = self._load(a), self._load(b)
        h, w = A.shape[2:]
        ph, pw = (-h) % 64, (-w) % 64
        pad = lambda x: np.pad(x, ((0, 0), (0, 0), (0, ph), (0, pw)), mode="edge")
        y = self.sess.run(None, {"img0": pad(A), "img1": pad(B),
                                 "timestep": np.array([t], np.float32)})[0]
        y = y[0, :3, :h, :w].transpose(1, 2, 0)
        return Image.fromarray(np.clip(y * 255 + 0.5, 0, 255).astype(np.uint8))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = sys.argv[1:]
    edit_path, src, plates, timeline_js = args[:4]
    fast = "--fast" in opts
    model = opts[opts.index("--model") + 1] if "--model" in opts else None
    edit = json.load(open(edit_path))

    shots, frames, total = build_timeline(edit)
    for sh in shots:
        s = "" if sh["S"] is None else f"  S = {sh['S']:.3f}x"
        print(f"{sh['id']} {sh['name']:<20} {sh['start']:6.2f}s -> {sh['start'] + sh['out_dur']:6.2f}s{s}")
    print(f"{total} frames @ {edit['fps']} fps = {total / edit['fps']:.2f} s")

    root = os.path.dirname(os.path.abspath(plates))
    src_dir, cache = os.path.join(root, "src"), os.path.join(root, "rife")
    extract(src, edit["grade"], src_dir)
    os.makedirs(plates, exist_ok=True)
    os.makedirs(cache, exist_ok=True)
    srcf = lambda i: os.path.join(src_dir, f"s{i:04d}.png")
    rife = None if fast else Rife(model)

    t_start, done = time.time(), 0
    for n, (sid, p, _) in enumerate(frames):
        out = os.path.join(plates, f"f{n:04d}.jpg")
        i = math.floor(p)
        q = round((p - i) * QUANT)
        if fast:
            img = Image.open(srcf(int(round(p))))
        elif q in (0, QUANT):
            img = Image.open(srcf(i + q // QUANT))
        else:
            cached = os.path.join(cache, f"r{i:04d}_{q:02d}.png")
            if not os.path.exists(cached):
                rife(srcf(i), srcf(i + 1), q / QUANT).save(cached)
                done += 1
                if done % 10 == 0:
                    print(f"  rife {done} new in-betweens, frame {n}/{total}, {time.time() - t_start:.0f} s", flush=True)
            img = Image.open(cached)
        img.convert("RGB").save(out, quality=95)
    for f in os.listdir(plates):  # drop plates of a longer previous edit
        if f.startswith("f") and int(f[1:5]) >= total:
            os.remove(os.path.join(plates, f))

    tl = {
        "FPS": edit["fps"], "TOTAL": total,
        "SHOTS": {sh["id"]: {"start": round(sh["start"], 4), "end": round(sh["start"] + sh["out_dur"], 4),
                             "name": sh["name"]} for sh in shots},
        "SPEED": [round(v, 3) for _, _, v in frames],
    }
    with open(timeline_js, "w") as fh:
        fh.write("// generated by scripts/retime.py - do not edit\n")
        fh.write("window.TIMELINE = " + json.dumps(tl, separators=(",", ":")) + ";\n")
    print(f"{total} plates -> {plates}, timeline -> {timeline_js}")


if __name__ == "__main__":
    main()
