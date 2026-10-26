#!/usr/bin/env bash
# Scale still images to a fixed height (default 1920 px, full width kept, so the
# composition can pan across them) and grade them lightly, like prepare_plates.sh
# does for footage.
# Usage: scripts/prepare_stills.sh <source_dir> <plates_dir> [height]
set -euo pipefail
src="$1"; out="$2"; height="${3:-1920}"
mkdir -p "$out"
rm -f "$out"/*.jpg
for f in "$src"/*.jpg "$src"/*.png; do
  [ -e "$f" ] || continue
  name="$(basename "${f%.*}")"
  ffmpeg -v error -y -i "$f" \
    -vf "scale=-2:${height}:flags=lanczos,unsharp=5:5:0.35:3:3:0,eq=contrast=1.04:saturation=1.06" \
    -q:v 2 "$out/$name.jpg"
done
echo "$(ls "$out" | wc -l) plates -> $out"
