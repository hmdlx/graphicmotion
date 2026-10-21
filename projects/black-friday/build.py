"""Neuer Schnitt: BLACK-FRIDAY-Sequenz zuerst, danach die Produkte ohne Text links.

Aufruf: python3 -I build.py <work-dir> <quelle.mp4> <ausgabe.mp4>
  <work-dir>/png/f%04d.png   verlustfreie Frames der Quelle
  <work-dir>/jpg/f%04d.jpg   Frames, aus denen remove_text.py gerechnet hat
  <work-dir>/clean/f%04d.png Ergebnis von remove_text.py
Die Retusche wird als Differenz (clean - jpg) auf die PNG-Frames gelegt, damit außerhalb
des Textbereichs keine zweite Kompressionsstufe entsteht.
"""
import subprocess
import sys

import cv2
import numpy as np

WORK, SRC, OUT = sys.argv[1:4]
INTRO = (548, 752)      # Quell-Frames 22,83–31,33 s: „BLACK FRIDAY“ -> „-25% AUF ALLES“
PROD = (0, 552)         # Quell-Frames 0–23,0 s: Produkte, Text in 0–522 entfernt
LAST_TEXT_FRAME = 522
XF, FADE_IN, FADE_OUT = 12, 8, 12   # Frames (24 fps)


def src(i):
    return cv2.imread(f'{WORK}/png/f{i + 1:04d}.png').astype(np.float32)


def prod(i):
    f = src(i)
    if i <= LAST_TEXT_FRAME:
        f += cv2.imread(f'{WORK}/clean/f{i + 1:04d}.png').astype(np.float32) \
            - cv2.imread(f'{WORK}/jpg/f{i + 1:04d}.jpg').astype(np.float32)
    return f


ni, npd = INTRO[1] - INTRO[0], PROD[1] - PROD[0]
seq = [('i', INTRO[0] + k) for k in range(ni - XF)]
seq += [('x', INTRO[0] + ni - XF + k, PROD[0] + k, (k + 1) / (XF + 1)) for k in range(XF)]
seq += [('p', PROD[0] + k) for k in range(XF, npd)]
N = len(seq)

t_in, t_out = INTRO[0] / 24, INTRO[1] / 24
p_end = PROD[1] / 24
xf = XF / 24
audio = (f'[1:a]atrim={t_in:.4f}:{t_out:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.3[a1];'
         f'[1:a]atrim=0:{p_end:.4f},asetpts=PTS-STARTPTS,afade=t=out:st={p_end - 0.5:.4f}:d=0.5[a2];'
         f'[a1][a2]acrossfade=d={xf:.4f}:c1=tri:c2=tri[a]')
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y',
                       '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '2560x1440', '-r', '24', '-i', '-',
                       '-i', SRC, '-filter_complex', audio, '-map', '0:v', '-map', '[a]',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
                       '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                       '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
for n, s in enumerate(seq):
    if s[0] == 'i':
        f = src(s[1])
    elif s[0] == 'p':
        f = prod(s[1])
    else:
        f = src(s[1]) * (1 - s[3]) + prod(s[2]) * s[3]
    if n < FADE_IN:
        f *= (n + 1) / (FADE_IN + 1)
    if n >= N - FADE_OUT:
        f *= (N - n) / (FADE_OUT + 1)
    ff.stdin.write(np.clip(f + 0.5, 0, 255).astype(np.uint8).tobytes())
ff.stdin.close()
ff.wait()
