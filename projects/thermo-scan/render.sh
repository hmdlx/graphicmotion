#!/bin/bash
# SPLASH THERMO – render 9:16, 1:1 and 16:9 in parallel chunks, then join and add the soundtrack.
#   projects/thermo-scan/render.sh            # all formats
#   projects/thermo-scan/render.sh finish     # only join existing chunks + soundtrack
set -euo pipefail
cd "$(dirname "$0")/../.."

B=build/thermo-scan
C=$B/chunks
OUT=projects/thermo-scan/output
NAME=HomeDeluxe_SPLASH-THERMO_Thermo-Scan
mkdir -p "$C" "$OUT"

[ -f $B/plates/photo.jpg ] || python3 -I projects/thermo-scan/prepare.py projects/thermo-scan/source $B/plates
python3 -I projects/thermo-scan/sound.py $B/sound.wav

if [ "${1:-}" != finish ]; then
  rm -f $C/*.mp4 $C/*.log    # stale chunks would be picked up by join
  R="node scripts/render.js projects/thermo-scan/composition.html"
  O="--plates $B/plates --serve 1"
  $R $C/p0.mp4 $O --size 1080x1920 --range 0:435   > $C/p0.log 2>&1 &
  $R $C/p1.mp4 $O --size 1080x1920 --range 435:780 > $C/p1.log 2>&1 &
  $R $C/s0.mp4 $O --size 1080x1080 --range 0:435   > $C/s0.log 2>&1 &
  $R $C/s1.mp4 $O --size 1080x1080 --range 435:780 > $C/s1.log 2>&1 &
  $R $C/l0.mp4 $O --size 1920x1080 --range 0:435   > $C/l0.log 2>&1 &
  $R $C/l1.mp4 $O --size 1920x1080 --range 435:780 > $C/l1.log 2>&1 &
  wait
fi

join() {  # $1 = chunk prefix, $2 = output file; joins every chunk $1<n>.mp4 in order
  for f in $(ls $C/${1}[0-9].mp4 | sort); do printf "file '%s'\n" "$(realpath $f)"; done > $C/$1.txt
  ffmpeg -v error -y -f concat -safe 0 -i $C/$1.txt -i $B/sound.wav \
    -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 \
    -shortest -movflags +faststart "$2"
}
join p "$OUT/${NAME}_9x16.mp4"
join s "$OUT/${NAME}_1x1.mp4"
join l "$OUT/${NAME}_16x9.mp4"

# Cover frames (end card)
ffmpeg -v error -y -ss 25.0 -i "$OUT/${NAME}_9x16.mp4" -frames:v 1 -q:v 2 "$OUT/${NAME}_Cover_9x16.jpg"
ffmpeg -v error -y -ss 25.0 -i "$OUT/${NAME}_1x1.mp4" -frames:v 1 -q:v 2 "$OUT/${NAME}_Cover_1x1.jpg"
ffmpeg -v error -y -ss 25.0 -i "$OUT/${NAME}_16x9.mp4" -frames:v 1 -q:v 2 "$OUT/${NAME}_Cover_16x9.jpg"
# GIF of the 1:1 version: 540 px, 10 fps, grain filtered out (it bloats GIFs)
ffmpeg -v error -y -i "$OUT/${NAME}_1x1.mp4" \
  -vf "fps=10,hqdn3d=4:4:14:14,scale=540:540:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  -loop 0 "$OUT/${NAME}_1x1.gif"
ls -la "$OUT"
