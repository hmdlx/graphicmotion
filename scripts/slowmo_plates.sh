#!/usr/bin/env bash
# Motion-interpolated slow-motion plates, one directory per shot (no interpolation
# across cuts). Each output frame k of shot "a-b" shows source frame a + k / FACTOR.
# Usage: scripts/slowmo_plates.sh <plates_dir> <out_dir> <factor> <a-b> [<a-b> ...]
set -euo pipefail
plates="$1"; out="$2"; factor="$3"; shift 3
fps=$((24 * factor))
for range in "$@"; do
  a="${range%-*}"; b="${range#*-}"
  dir="$out/$range"
  mkdir -p "$dir"
  rm -f "$dir"/f*.jpg
  ffmpeg -v error -y -framerate 24 -start_number "$a" -i "$plates/f%04d.jpg" \
    -vf "trim=end_frame=$((b - a + 1)),setpts=PTS-STARTPTS,minterpolate=fps=$fps:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" \
    -q:v 2 -start_number 0 "$dir/f%04d.jpg" &
done
wait
for range in "$@"; do echo "$(ls "$out/$range" | wc -l) frames -> $out/$range"; done
