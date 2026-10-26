#!/usr/bin/env bash
# Source clip -> recoloured, motion-interpolated JPG plates, one folder per shot.
# Usage: scripts/build_plates.sh <source.mp4> <grade.json> <plates_dir> [interp_fps]
#
# Every shot of grade.json is interpolated on its own (no blending across cuts) to
# interp_fps (default 72 = 3x the 24 fps source), so the composition can play any
# shot in slow motion: plate k of shot S sits at source frame S.start + k * 24 / interp_fps.
set -euo pipefail
src="$1"; cfg="$2"; out="$3"; ifps="${4:-72}"
work="$out/_work"
mkdir -p "$work/raw" "$work/graded"
ffmpeg -nostdin -v error -y -i "$src" -start_number 0 "$work/raw/f%04d.png"
python3 -I "$(dirname "$0")/recolor_bg.py" "$work/raw" "$work/graded" "$cfg"
python3 -I -c 'import json,sys; [print(k, a, b) for k, (a, b) in json.load(open(sys.argv[1]))["shots"].items()]' "$cfg" |
while read -r name a b; do
  rm -rf "${out:?}/$name"; mkdir -p "$out/$name"
  n=$((b - a + 1))
  ffmpeg -nostdin -v error -y -framerate 24 -start_number "$a" -t "$(python3 -c "print($n / 24)")" -i "$work/graded/f%04d.png" \
    -vf "minterpolate=fps=$ifps:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,unsharp=5:5:0.35:3:3:0" \
    -q:v 2 -start_number 0 "$out/$name/f%04d.jpg"
  echo "$name: $(ls "$out/$name" | wc -l) plates"
done
rm -rf "$work"
# Manifest for the composition: plate count per shot and the interpolation factor.
python3 -I -c 'import json,os,sys; d=sys.argv[1]; json.dump({"interp": int(sys.argv[2]) / 24, "count": {s: len(os.listdir(os.path.join(d, s))) for s in sorted(os.listdir(d)) if os.path.isdir(os.path.join(d, s))}}, open(os.path.join(d, "plates.json"), "w"))' "$out" "$ifps"
