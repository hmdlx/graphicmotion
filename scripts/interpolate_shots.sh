#!/usr/bin/env bash
# Schneidet Einstellungen aus einer Quelle und rechnet sie per Motion-Interpolation
# auf 96 fps hoch (Basis für Slow Motion / Speed-Ramps).
#
#   scripts/interpolate_shots.sh <quelle.mp4> <out_dir> NAME:startframe:endframe ...
#
# Frame-Angaben in Quell-Frames, end exklusiv. Die Einstellungen laufen parallel.
set -euo pipefail
src=$1; out=$2; shift 2
mi="minterpolate=fps=96:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none"
for spec in "$@"; do
  IFS=: read -r name start end <<<"$spec"
  mkdir -p "$out/$name"
  rm -f "$out/$name"/*.jpg
  ffmpeg -v error -y -i "$src" \
    -vf "trim=start_frame=$start:end_frame=$end,setpts=PTS-STARTPTS,$mi" \
    -q:v 1 -qmin 1 "$out/$name/%04d.jpg" &
done
wait
for spec in "$@"; do echo "$out/${spec%%:*}: $(ls "$out/${spec%%:*}" | wc -l) Bilder"; done
