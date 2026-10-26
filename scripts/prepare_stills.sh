#!/usr/bin/env bash
# Scale still images to 1920 px height (full width kept, so the composition can pan
# across them) and grade them lightly, like prepare_plates.sh does for footage.
# Usage: scripts/prepare_stills.sh <source_dir> <plates_dir>
set -euo pipefail
src="$1"; out="$2"
mkdir -p "$out"
rm -f "$out"/*.jpg
for f in "$src"/*.jpg "$src"/*.png; do
  [ -e "$f" ] || continue
  name="$(basename "${f%.*}")"
  ffmpeg -v error -y -i "$f" \
    -vf "scale=-2:1920:flags=lanczos,unsharp=5:5:0.5:3:3:0,eq=contrast=1.04:saturation=1.05" \
    -q:v 2 "$out/$name.jpg"
done
echo "$(ls "$out" | wc -l) plates -> $out"
