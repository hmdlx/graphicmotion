#!/usr/bin/env python3
"""Smooth the motion jumps in the first shot of the Whirlpool rough cut.

    python3 -I projects/whirlpool-couple/retime.py <rohschnitt.mp4> <plates_dir> "<grade filter>"

The generated garden shot skips ahead by about 1.65 motion steps at source frames 24, 48
and 72 (the leaves visibly jump once a second). Around each jump the extra motion is spread
evenly over +-4 frames: the frames in that window are re-sampled at fractional source
positions from a motion-compensated 8x interpolation and replace the plates in place.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

JUMPS = (24, 48, 72)   # first frame after each jump
EXTRA = 0.65           # extra motion steps in the jump (frame difference ~1.65x the neighbours)
HALF = 4               # window half-width, frames
SUB = 8                # interpolation factor


def content(k):
    """Motion time of source frame k (1 per frame, plus EXTRA at each jump)."""
    return k + EXTRA * sum(k >= j for j in JUMPS)


def source_pos(c):
    k = 0
    while content(k + 1) < c:
        k += 1
    return k + (c - content(k)) / (content(k + 1) - content(k))


def main():
    src, plates, grade = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
    with tempfile.TemporaryDirectory() as tmp:
        for j in JUMPS:
            first = j - HALF - 2
            sub = Path(tmp) / f'j{j}'
            sub.mkdir()
            subprocess.run([
                'ffmpeg', '-v', 'error', '-y', '-i', src, '-an', '-vf',
                f'trim=start_frame={first}:end_frame={j + HALF + 2},setpts=PTS-STARTPTS,'
                f'minterpolate=fps={24 * SUB}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none',
                '-q:v', '2', '-start_number', '0', str(sub / 's%04d.jpg')], check=True)
            a, b = j - HALF, j + HALF
            for m in range(a + 1, b):
                p = source_pos(content(a) + (content(b) - content(a)) * (m - a) / (b - a))
                i = round((p - first) * SUB)
                subprocess.run([
                    'ffmpeg', '-v', 'error', '-y', '-i', str(sub / f's{i:04d}.jpg'), '-vf', grade,
                    '-q:v', '2', str(plates / f'f{m:04d}.jpg')], check=True)
                print(f'f{m:04d} <- source {p:.3f}')


if __name__ == '__main__':
    main()
