#!/usr/bin/env bash
# KI-Plates (Higgsfield Seedance, 834×1112 @ 24 fps) -> 1080×1440 JPG-Frames, leicht gegradet.
# Usage: projects/dfb-pokal-cinematic/prepare_plates.sh [build_dir]
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="${1:-$here/../../build/dfb-pokal-cinematic/plates}"
for name in stadion pokal; do
  src="$here/source/ki_${name}.mp4"
  mkdir -p "$out/$name"; rm -f "$out/$name"/f*.jpg
  ffmpeg -v error -y -i "$src" \
    -vf "scale=1080:1440:flags=lanczos,unsharp=5:5:0.6:3:3:0,eq=contrast=1.04:saturation=1.03" \
    -q:v 2 -start_number 0 "$out/$name/f%04d.jpg"
  echo "$name: $(ls "$out/$name" | wc -l) frames"
done
