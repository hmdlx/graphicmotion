#!/usr/bin/env bash
# Dump a finished clip into numbered JPG plates at its native size (no regrade).
# Usage: scripts/extract_frames.sh <source.mp4> <plates_dir> [last_frame]
set -euo pipefail
src="$1"; out="$2"; last="${3:-}"
mkdir -p "$out"
rm -f "$out"/f*.jpg
ffmpeg -v error -y -i "$src" ${last:+-frames:v $((last + 1))} -q:v 2 -start_number 0 "$out/f%04d.jpg"
echo "$(ls "$out"/f*.jpg | wc -l) plates -> $out"
