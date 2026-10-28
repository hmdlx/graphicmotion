#!/usr/bin/env bash
# Upscale + lightly grade a 9:16 source clip into numbered JPG plates (1080x1920).
# Usage: scripts/prepare_plates.sh <source.mp4> <plates_dir> [--neutral]
#   --neutral  upscale only, no denoise/grade (for clips that are already a finished edit)
set -euo pipefail
src="$1"; out="$2"; mode="${3:-}"
vf="hqdn3d=1.2:1.2:4:4,scale=-2:1920:flags=lanczos,crop=1080:1920,unsharp=5:5:0.55:3:3:0,eq=contrast=1.05:saturation=1.06:brightness=0.005"
[ "$mode" = "--neutral" ] && vf="scale=-2:1920:flags=lanczos,crop=1080:1920,unsharp=5:5:0.35:3:3:0"
mkdir -p "$out"
rm -f "$out"/f*.jpg
ffmpeg -v error -y -i "$src" -vf "$vf" -q:v 2 -start_number 0 "$out/f%04d.jpg"
echo "$(ls "$out" | wc -l) plates -> $out"
