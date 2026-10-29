#!/usr/bin/env bash
# Put a rendered intro in front of a finished clip; the clip continues at <from_frame>.
# Usage: scripts/join_intro.sh <intro.mp4> <source.mp4> <from_frame> <out.mp4>
set -euo pipefail
intro="$1"; src="$2"; from="$3"; out="$4"
mkdir -p "$(dirname "$out")"
ffmpeg -v error -y -i "$intro" -i "$src" -f lavfi -i anullsrc=r=48000:cl=stereo \
  -filter_complex "[0:v]setpts=PTS-STARTPTS,setsar=1[a];[1:v]trim=start_frame=${from},setpts=PTS-STARTPTS,setsar=1[b];[a][b]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -map 2:a \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.2 -r 30 \
  -c:a aac -b:a 128k -shortest -movflags +faststart "$out"
echo "done -> $out"
