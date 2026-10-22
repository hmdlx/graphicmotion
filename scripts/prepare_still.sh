#!/usr/bin/env bash
# Upscale a still photo 2x (Lanczos + light sharpening) into a single JPG plate, so
# camera moves up to ~2x zoom still render from a sharp bitmap.
# Usage: scripts/prepare_still.sh <source image> <plates_dir>
set -euo pipefail
src="$1"; out="$2"
mkdir -p "$out"
ffmpeg -v error -y -i "$src" \
  -vf "scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:0.45:3:3:0,eq=contrast=1.02:saturation=1.03" \
  -frames:v 1 -q:v 1 "$out/still.jpg"
echo "plate -> $out/still.jpg"
