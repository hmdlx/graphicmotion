"""Hero-Video (Clown kommt hinter dem Sofa hervor) als MP4 in Banner- und Quadratformaten bauen.

    python3 -I scripts/build_hero_videos.py <projekt>

Ablauf wie beim Hero-GIF des Newsletters (build_images.py), aber flüssig mit 24 fps und ohne
Navy-Verlauf: Clown sitzt, verblasst wie ein Geist, leeres Sofa, er kommt hinter dem Sofa hervor
und setzt sich – das Ende passt an den Anfang, die Schleife läuft ohne Sprung.

Quelle ist das KI-Video, per KI auf 4K hochgerechnet (HERO_VIDEO_4K, Higgsfield-Upscale „aigc“ des
1344 × 672-Videos). Alle Formate werden daraus nur ausgeschnitten und verkleinert. Wie beim GIF steht
der Raum still (erstes Bild), nur dort, wo sich der Clown bewegt (motion_mask), läuft das Video.
Ergebnis: output/hero-video/hero_clown_<B>x<H>.mp4 (H.264, ohne Ton, faststart) und je ein
Standbild _poster.jpg (erstes Bild: Clown sitzt).
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_images import GIF_GHOST, GIF_HOLD, GIF_W, motion_mask  # noqa: E402

HERO_VIDEO_4K = os.path.join("hero", "clown-hervor_4k.mp4")
FPS = 24
# Ausschnitt als Anteil des Videobilds (x, y) und Zielgröße; Breite/Höhe des Ausschnitts ergeben sich
# aus dem Seitenverhältnis. Im Quadrat sitzt der Clown im rechten Drittel; im Banner steigt der Ballon
# beim Klettern bis knapp 19 % unter die Oberkante – der Ausschnitt beginnt darüber.
FORMATS = [
    ((0.265, 0.0), (1440, 1440)),
    ((0.0, 0.152), (1600, 560)),
    ((0.0, 0.152), (3200, 1120)),
]
CRF = 18


def video_size(path):
    s = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                   "-of", "json", path], capture_output=True, check=True).stdout)["streams"][0]
    return s["width"], s["height"]


def video_frames(path, size):
    """Alle Bilder des Videos nacheinander als RGB-Array."""
    w, h = size
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    while True:
        buf = p.stdout.read(w * h * 3)
        if len(buf) < w * h * 3:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    p.wait()


def crop_box(size, rel, target):
    """Größter Ausschnitt im Seitenverhältnis des Ziels ab der relativen Position, gerade Pixelzahlen."""
    w, h = size
    cw = min(w, round(h * target[0] / target[1])) // 2 * 2
    ch = round(cw * target[1] / target[0]) // 2 * 2
    x = min(round(rel[0] * w), w - cw)
    y = min(round(rel[1] * h), h - ch)
    return cw, ch, x, y


def main():
    project = sys.argv[1]
    out = os.path.join(project, "output", "hero-video")
    os.makedirs(out, exist_ok=True)
    video = os.path.join(project, "source", HERO_VIDEO_4K)
    size = video_size(video)

    # Maske wie beim GIF (in dessen 640er Koordinaten), auf Videogröße gebracht; erstes und letztes
    # Bild für Hintergrund, sitzenden Clown und das Verblassen merken
    small, first, last = [], None, None
    for f in video_frames(video, size):
        small.append(Image.fromarray(f).resize((GIF_W, GIF_W * size[1] // size[0]), Image.LANCZOS))
        first = f if first is None else first
        last = f
    m = motion_mask(small, grow=3)[..., 0]
    mask = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(size, Image.BILINEAR), np.float32)[..., None] / 255
    room = first.astype(np.float32)

    def comp(frame):
        return (frame.astype(np.float32) * mask + room * (1 - mask)).round().astype(np.uint8)

    seated, empty = comp(last), comp(first)
    n = round(GIF_GHOST * FPS)

    def sequence():
        for _ in range(round(GIF_HOLD * FPS)):
            yield seated
        for i in range(n):
            t = (i + 1) / (n + 1)
            yield (seated * (1 - t) + empty * t).round().astype(np.uint8)
        for f in video_frames(video, size):
            yield comp(f)

    # ein Durchlauf, drei Ausgaben: Ausschnitt und Verkleinern (Lanczos)
    chains, outputs = [], []
    for i, (rel, (W, H)) in enumerate(FORMATS):
        cw, ch, x, y = crop_box(size, rel, (W, H))
        if cw < W:
            sys.exit(f"{W}×{H}: Ausschnitt nur {cw}×{ch} – Quelle zu klein")
        chains.append(f"[s{i}]crop={cw}:{ch}:{x}:{y},scale={W}:{H}:flags=lanczos,format=yuv420p[o{i}]")
        outputs += ["-map", f"[o{i}]", "-c:v", "libx264", "-preset", "slow", "-crf", str(CRF), "-profile:v", "high",
                    "-movflags", "+faststart", "-an", os.path.join(out, f"hero_clown_{W}x{H}.mp4")]
    split = f"[0]split={len(FORMATS)}" + "".join(f"[s{i}]" for i in range(len(FORMATS)))
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{size[0]}x{size[1]}",
                          "-r", str(FPS), "-i", "-", "-filter_complex", ";".join([split] + chains)] + outputs,
                         stdin=subprocess.PIPE)
    count = 0
    for f in sequence():
        p.stdin.write(f.tobytes())
        count += 1
    p.stdin.close()
    if p.wait():
        sys.exit("ffmpeg fehlgeschlagen")

    for _, (W, H) in FORMATS:
        name = os.path.join(out, f"hero_clown_{W}x{H}")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", name + ".mp4", "-frames:v", "1", "-q:v", "2", name + "_poster.jpg"], check=True)
        print(f"{name}.mp4  {W}×{H}, {count / FPS:.1f} s, {os.path.getsize(name + '.mp4') // 1024} KB")


if __name__ == "__main__":
    main()
