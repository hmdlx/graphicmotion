#!/bin/bash
# Gewählte KI-Clips -> JPG-Plates (1920x1080, 24 fps) + manifest.js für composition.js
#   projects/everest-tour/prepare.sh build/everest-tour/plates
set -e
OUT=${1:-build/everest-tour/plates}
DIR=$(dirname "$0")
# Rolle im Schnitt = gewählte Variante in source/clips
CLIPS="pov1:pov1a pov2:pov2a pov3:pov3a car1:car1a car2:car2b car3:car3c"
mkdir -p "$OUT"
echo "window.PLATES = {" > "$OUT/manifest.js"
for pair in $CLIPS; do
  role=${pair%%:*}; src=${pair##*:}
  rm -rf "$OUT/$role"; mkdir -p "$OUT/$role"
  ffmpeg -v error -y -i "$DIR/source/clips/$src.mp4" \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -q:v 2 "$OUT/$role/%04d.jpg"
  n=$(ls "$OUT/$role" | wc -l)
  echo "  $role: { n: $n, fps: 24 }," >> "$OUT/manifest.js"
  echo "$role <- $src ($n frames)"
done
echo "};" >> "$OUT/manifest.js"
