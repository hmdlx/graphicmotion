#!/usr/bin/env bash
# Extract every transition clip <name>-*.mp4 into numbered JPG plates <plates_dir>/<name>/f0001.jpg…
# Usage: scripts/clip_plates.sh <clips_dir> <plates_dir>
set -euo pipefail
src="${1:?clips dir}"; out="${2:?plates dir}"
for clip in "$src"/*.mp4; do
  name="$(basename "$clip" .mp4)"; name="${name%%-*}"
  mkdir -p "$out/$name"
  rm -f "${out:?}/${name:?}"/f*.jpg
  ffmpeg -v error -y -i "$clip" -q:v 2 -start_number 1 "$out/$name/f%04d.jpg"
  echo "$(ls "$out/$name" | wc -l) plates -> $out/$name"
done
