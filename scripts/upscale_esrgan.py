#!/usr/bin/env python3
"""Upscale still images 4x with Real-ESRGAN (ONNX, CPU), tile by tile.

    python3 -I scripts/upscale_esrgan.py <model.onnx> <out_dir> <image> [<image> ...] [--height 2880]

Needs numpy, Pillow and onnxruntime. The model used for the sauna project is
Real-ESRGAN x4 (BSD-3) as ONNX with a fixed 64x64 input:
https://huggingface.co/imgdesignart/realesrgan-x4-onnx (onnx/model.onnx).
The result is resized to --height (Lanczos) and saved as high-quality JPG.
"""
import os
import sys
import time

import numpy as np
import onnxruntime as ort
from PIL import Image

TILE, PAD, SCALE = 64, 8, 4


def upscale(sess, img):
    name = sess.get_inputs()[0].name
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0
    h, w, _ = a.shape
    core = TILE - 2 * PAD
    ph, pw = -(-h // core) * core, -(-w // core) * core
    src = np.pad(a, ((PAD, ph - h + PAD), (PAD, pw - w + PAD), (0, 0)), mode='reflect')
    out = np.zeros((ph * SCALE, pw * SCALE, 3), dtype=np.float32)
    total = (ph // core) * (pw // core)
    t0, done = time.time(), 0
    for y in range(0, ph, core):
        for x in range(0, pw, core):
            tile = src[y:y + TILE, x:x + TILE].transpose(2, 0, 1)[None]
            res = sess.run(None, {name: tile})[0][0].transpose(1, 2, 0)
            out[y * SCALE:(y + core) * SCALE, x * SCALE:(x + core) * SCALE] = \
                res[PAD * SCALE:(PAD + core) * SCALE, PAD * SCALE:(PAD + core) * SCALE]
            done += 1
            if done % 200 == 0:
                print(f'  {done}/{total} tiles ({time.time() - t0:.0f} s)', flush=True)
    out = np.clip(out[:h * SCALE, :w * SCALE], 0, 1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8))


def main(argv):
    height = 2880
    if '--height' in argv:
        i = argv.index('--height')
        height = int(argv[i + 1])
        del argv[i:i + 2]
    model, out_dir, *images = argv
    os.makedirs(out_dir, exist_ok=True)
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = os.cpu_count() or 4
    sess = ort.InferenceSession(model, opts, providers=['CPUExecutionProvider'])
    for path in images:
        print(path, flush=True)
        big = upscale(sess, Image.open(path))
        w = round(big.width * height / big.height)
        big = big.resize((w, height), Image.LANCZOS)
        name = os.path.splitext(os.path.basename(path))[0] + '.jpg'
        big.save(os.path.join(out_dir, name), quality=93, subsampling=0)
        print(f'  -> {name} {w}x{height}', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
