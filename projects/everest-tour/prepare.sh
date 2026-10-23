#!/bin/bash
# Gewählte KI-Clips -> JPG-Plates (24 fps) + manifest.js für composition.js
#   projects/everest-tour/prepare.sh build/everest-tour/plates            (16:9, 1920x1080)
#   projects/everest-tour/prepare.sh build/everest-tour-9x16/plates 9x16  (9:16, 1080x1920)
set -e
OUT=${1:-build/everest-tour/plates}
FMT=${2:-16x9}
DIR=$(dirname "$0")
# Eintrag: rolle:quelle:ordner:größe. Im 9:16-Schnitt läuft das Karussell als 16:9-Band (car*).
if [ "$FMT" = "9x16" ]; then
  CLIPS="pov1:pov1_a:clips-9x16:1080:1920 pov2:pov2_b:clips-9x16:1080:1920 pov3:pov3_d:clips-9x16:1080:1920 car1:car1a:clips:1920:1080 car2:car2b:clips:1920:1080 car3:car3c:clips:1920:1080"
else
  CLIPS="pov1:pov1g:clips:1920:1080 pov2:pov2a:clips:1920:1080 pov3:pov3g:clips:1920:1080 car1:car1a:clips:1920:1080 car2:car2b:clips:1920:1080 car3:car3c:clips:1920:1080"
fi
mkdir -p "$OUT"
echo "window.PLATES = {" > "$OUT/manifest.js"
for entry in $CLIPS; do
  IFS=: read -r role src sub w h <<< "$entry"
  rm -rf "$OUT/$role"; mkdir -p "$OUT/$role"
  ffmpeg -v error -y -i "$DIR/source/$sub/$src.mp4" \
    -vf "scale=$w:$h:force_original_aspect_ratio=increase,crop=$w:$h" -q:v 2 "$OUT/$role/%04d.jpg"
  n=$(ls "$OUT/$role" | wc -l)
  echo "  $role: { n: $n, fps: 24 }," >> "$OUT/manifest.js"
  echo "$role <- $src ($n frames)"
done
echo "};" >> "$OUT/manifest.js"
