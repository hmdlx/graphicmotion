#!/usr/bin/env bash
# Cut frame ranges out of finished clips and put them end to end (one encode, silent stereo track).
# Usage: scripts/cutlist.sh <out.mp4> <clip>[@<from>-<to>] ...
#   frames are inclusive; "<from>-" runs to the end of the clip, no range takes the whole clip.
set -euo pipefail
out="$1"; shift
inputs=(); graph=""; labels=""; i=0
for seg in "$@"; do
  file="${seg%@*}"; trim=""
  if [[ "$seg" == *@* ]]; then
    range="${seg##*@}"; from="${range%-*}"; to="${range#*-}"
    trim="trim=start_frame=${from}${to:+:end_frame=$((to + 1))},"
  fi
  inputs+=(-i "$file")
  graph+="[$i:v]${trim}setpts=PTS-STARTPTS,setsar=1[v$i];"
  labels+="[v$i]"; i=$((i + 1))
done
mkdir -p "$(dirname "$out")"
ffmpeg -v error -y "${inputs[@]}" -f lavfi -i anullsrc=r=48000:cl=stereo \
  -filter_complex "${graph}${labels}concat=n=${i}:v=1:a=0[v]" \
  -map "[v]" -map "$i:a" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.2 -r 30 \
  -c:a aac -b:a 128k -shortest -movflags +faststart "$out"
echo "done -> $out"
