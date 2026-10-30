"""Hero-Video (Clown kommt hinter dem Sofa hervor) als MP4 in Banner- und Quadratformaten bauen.

    python3 -I scripts/build_hero_videos.py <projekt>

Ablauf wie beim Hero-GIF des Newsletters (build_images.py), aber flüssig mit 24 fps und ohne
Navy-Verlauf: Clown sitzt, verblasst wie ein Geist, leeres Sofa, er kommt hinter dem Sofa hervor
und setzt sich – das Ende passt an den Anfang, die Schleife läuft ohne Sprung.

Das KI-Video hat nur 1344 × 672 px. Für die großen Formate kommt der Hintergrund deshalb aus dem
schärferen Standbild (1774 × 887, deckungsgleich mit dem letzten Videobild); nur dort, wo sich der
Clown bewegt (motion_mask), läuft das Video. Ergebnis: output/hero-video/hero_clown_<B>x<H>.mp4
(H.264, ohne Ton, faststart) und je ein Standbild _poster.jpg (erstes Bild: Clown sitzt).
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_images import GIF_GHOST, GIF_HOLD, GIF_W, HERO_SRC, HERO_VIDEO, motion_mask  # noqa: E402

FPS = 24
VIDEO_SIZE = (1344, 672)
# Ausschnitt im Standbild (x, y, Breite, Höhe) und Zielgröße; der Clown sitzt im Quadrat im rechten
# Drittel. Im Banner steigt der Ballon beim Klettern bis y = 168 – der Ausschnitt beginnt darüber
FORMATS = [
    ((470, 0, 887, 887), (1440, 1440)),
    ((0, 135, 1774, 621), (1600, 560)),
    ((0, 135, 1774, 621), (3200, 1120)),
]
CRF = 19


def video_frames(path):
    """Alle Bilder des KI-Videos nacheinander als RGB-Array (1344 × 672)."""
    w, h = VIDEO_SIZE
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    while True:
        buf = p.stdout.read(w * h * 3)
        if len(buf) < w * h * 3:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    p.wait()


def main():
    project = sys.argv[1]
    src = os.path.join(project, "source")
    out = os.path.join(project, "output", "hero-video")
    os.makedirs(out, exist_ok=True)
    video = os.path.join(src, HERO_VIDEO)

    still_img = Image.open(os.path.join(src, HERO_SRC)).convert("RGB")
    size = still_img.size
    still = np.asarray(still_img, np.float32)

    # Maske wie beim GIF (in dessen 640er Koordinaten), etwas großzügiger, damit vom sitzenden
    # Clown im Standbild nichts stehen bleibt, wenn das Sofa leer ist
    small = [Image.fromarray(f).resize((GIF_W, GIF_W * VIDEO_SIZE[1] // VIDEO_SIZE[0]), Image.LANCZOS) for f in video_frames(video)]
    m = motion_mask(small, grow=4)[..., 0]
    mask = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(size, Image.BILINEAR), np.float32)[..., None] / 255

    def comp(frame):
        up = np.asarray(Image.fromarray(frame).resize(size, Image.LANCZOS), np.float32)
        return (up * mask + still * (1 - mask)).round().astype(np.uint8)

    frames = list(video_frames(video))
    seated, empty = comp(frames[-1]), comp(frames[0])
    n = round(GIF_GHOST * FPS)

    def sequence():
        for _ in range(round(GIF_HOLD * FPS)):
            yield seated
        for i in range(n):
            t = (i + 1) / (n + 1)
            yield (seated * (1 - t) + empty * t).round().astype(np.uint8)
        for f in frames:
            yield comp(f)

    # ein Durchlauf, drei Ausgaben: Ausschnitt, Lanczos, leicht nachschärfen, wo hochskaliert wird
    chains, outputs = [], []
    for i, ((x, y, w, h), (W, H)) in enumerate(FORMATS):
        sharpen = ",unsharp=5:5:0.45" if W > w else ""
        chains.append(f"[s{i}]crop={w}:{h}:{x}:{y},scale={W}:{H}:flags=lanczos{sharpen},format=yuv420p[o{i}]")
        name = os.path.join(out, f"hero_clown_{W}x{H}.mp4")
        outputs += ["-map", f"[o{i}]", "-c:v", "libx264", "-preset", "slow", "-crf", str(CRF), "-profile:v", "high",
                    "-movflags", "+faststart", "-an", name]
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
