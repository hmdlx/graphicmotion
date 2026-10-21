"""Entfernt die statische Einblendung „BLACK FRIDAY / -25% / AUF ALLES“ links im Bild.

Aufruf: python3 -I remove_text.py <work-dir>
  <work-dir>/jpg/f%04d.jpg   Frames der Quelle (ffmpeg -q:v 2)
  <work-dir>/clean/f%04d.png Ergebnis für die Frames 0–522 (danach ist der Text weg)

Vorgehen: Der Text steht in jedem Frame an derselben Stelle. Aus dem Median vieler Frames
werden die Text-Ebene (Alpha pro Kanal, inkl. Glow) und eine Hintergrund-Plate geschätzt.
Pro Frame wird der Text als normale Überblendung herausgerechnet; nur die deckenden
Glyphen-Kerne werden aus der Umgebung aufgefüllt – zeilen- bzw. spaltenweise, je nachdem,
ob gerade horizontale (Lichtlinie) oder vertikale Strukturen (Lichtstrahl) durchs Bild laufen.
"""
import os
import sys
from multiprocessing import Pool

import cv2
import numpy as np

WORK = sys.argv[1]
LAST_TEXT_FRAME = 522
X0, X1, Y0, Y1 = 40, 800, 480, 980          # Ausschnitt, in dem der Text liegt


def el(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def load(i):
    return cv2.imread(f'{WORK}/jpg/f{i + 1:04d}.jpg')


def fill(img, W, sigmas=(48, 20, 8, 3)):
    """Normalisierte Faltung: füllt Pixel mit W=0 aus der Umgebung."""
    res = None
    for s in sigmas:
        wb = cv2.GaussianBlur(W, (0, 0), s)
        ib = cv2.GaussianBlur(img * W[..., None], (0, 0), s) / np.maximum(wb, 1e-4)[..., None]
        if res is None:
            res = ib
        else:
            k = np.clip((wb - 0.15) / 0.35, 0, 1)[..., None]
            res = res * (1 - k) + ib * k
    return res


def dirfill(R, mask):
    """Lineare Interpolation über maskierte Strecken jeder Zeile."""
    h, w = mask.shape
    idx = np.broadcast_to(np.arange(w), (h, w))
    un = mask == 0
    left = np.maximum.accumulate(np.where(un, idx, -1), axis=1)
    right = np.minimum.accumulate(np.where(un, idx, w)[:, ::-1], axis=1)[:, ::-1]
    ok = (left >= 0) & (right < w)
    left = np.clip(left, 0, w - 1)
    right = np.clip(right, 0, w - 1)
    yy = np.arange(h)[:, None]
    t = ((idx - left) / np.maximum(right - left, 1))[..., None]
    o = R[yy, left] * (1 - t) + R[yy, right] * t
    o[~ok] = 0
    return o, ok, (right - left).astype(np.float32)


# --- Text-Ebene aus dem Median ---------------------------------------------------------
M = np.median(np.stack([load(i)[Y0:Y1, X0:X1].astype(np.float32) for i in range(0, 500, 4)]), 0)
g = M.max(2)
B = cv2.GaussianBlur(cv2.morphologyEx(g, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (45, 45))), (0, 0), 15)
D = g - B
core0 = np.zeros(D.shape, np.uint8)
core0[70:430, 60:600] = (D[70:430, 60:600] > 3).astype(np.uint8)
core0 = cv2.morphologyEx(core0, cv2.MORPH_OPEN, el(1))
region = cv2.dilate(core0, el(40))          # Text + kompletter Glow
Wr = (1 - region).astype(np.float32)
P = fill(M, Wr)
P = M * Wr[..., None] + P * (1 - Wr[..., None])
A = np.clip((M - P) / np.maximum(255 - P, 1), 0, 1) * (region[..., None] > 0)
coreA = A.max(2) > 0.97                     # deckende Glyphen, zum Schätzen der Ausblendung
ring = (region > 0) & (cv2.erode(region, el(6)) == 0)
rm = cv2.GaussianBlur(region.astype(np.float32), (0, 0), 3)[..., None]
M_core = float(np.median(g[coreA]))


def clean(i):
    rng = np.random.default_rng(i)
    im = load(i)
    c = im[Y0:Y1, X0:X1].astype(np.float32)
    # Helligkeit der Text-Ebene: 1, beim Abblenden ab Frame 506 wird das Bild samt Text dunkler
    f = min(max(float(np.median(c.max(2)[coreA])) / M_core, 0), 1)
    hole = cv2.dilate((A.max(2) > 0.35).astype(np.uint8), el(1))
    bg = (c - 255 * f * A) / np.maximum(1 - A, 0.5)
    W = (1 - hole).astype(np.float32)
    R = bg - f * P
    Rb = cv2.blur(R * W[..., None], (3, 3)) / np.maximum(cv2.blur(W, (3, 3)), 1e-3)[..., None]
    H, okh, sh = dirfill(Rb, hole)
    V, okv, sv = dirfill(Rb.transpose(1, 0, 2), hole.T)
    V, okv, sv = V.transpose(1, 0, 2), okv.T, sv.T
    # lokale Ausrichtung der Bildstruktur entscheidet zwischen Zeilen- und Spalten-Interpolation
    gr = Rb.max(2)
    gx = cv2.Sobel(gr, cv2.CV_32F, 1, 0, ksize=3) ** 2 * W
    gy = cv2.Sobel(gr, cv2.CV_32F, 0, 1, ksize=3) ** 2 * W
    wb = cv2.GaussianBlur(W, (0, 0), 30) + 1e-4
    Ex = cv2.GaussianBlur(gx, (0, 0), 30) / wb
    Ey = cv2.GaussianBlur(gy, (0, 0), 30) / wb
    wh = ((Ey + 4) / (Ex + Ey + 8)) ** 2 * okh / np.maximum(sh, 1)
    wv = ((Ex + 4) / (Ex + Ey + 8)) ** 2 * okv / np.maximum(sv, 1)
    Rf = (H * wh[..., None] + V * wv[..., None]) / np.maximum(wh + wv, 1e-4)[..., None]
    Rf = cv2.GaussianBlur(Rf.astype(np.float32), (0, 0), 1.5)
    # Korn wie in der Umgebung
    hf = (c - cv2.GaussianBlur(c, (0, 0), 1.5))[ring]
    sd = float(np.median(np.abs(hf - np.median(hf)))) * 1.48
    n = cv2.GaussianBlur(rng.normal(0, 1, c.shape[:2]).astype(np.float32), (0, 0), 0.7)
    filled = f * P + Rf + (n / n.std() * sd)[..., None]
    ah = np.maximum(cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 1.5), hole)[..., None]
    o = bg * (1 - ah) + filled * ah
    o = c * (1 - rm) + o * rm
    im[Y0:Y1, X0:X1] = np.clip(o + 0.5, 0, 255).astype(np.uint8)
    cv2.imwrite(f'{WORK}/clean/f{i + 1:04d}.png', im)


if __name__ == '__main__':
    os.makedirs(f'{WORK}/clean', exist_ok=True)
    with Pool() as pool:
        pool.map(clean, range(LAST_TEXT_FRAME + 1))
