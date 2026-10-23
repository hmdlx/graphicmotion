#!/bin/bash
# SPLASH THERMO – render 9:16 and 1:1 in parallel chunks, then join and add the soundtrack.
#   projects/thermo-scan/render.sh            # both formats
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
  R="node scripts/render.js projects/thermo-scan/composition.html"
  O="--plates $B/plates --serve 1"
  $R $C/p0.mp4 $O --size 1080x1920 --range 0:435   > $C/p0.log 2>&1 &
  $R $C/p1.mp4 $O --size 1080x1920 --range 435:870 > $C/p1.log 2>&1 &
  $R $C/s0.mp4 $O --size 1080x1080 --range 0:435   > $C/s0.log 2>&1 &
  $R $C/s1.mp4 $O --size 1080x1080 --range 435:870 > $C/s1.log 2>&1 &
  wait
fi

join() {  # $1 = chunk prefix, $2 = output file
  printf "file '%s'\n" "$(realpath $C/${1}0.mp4)" "$(realpath $C/${1}1.mp4)" > $C/$1.txt
  ffmpeg -v error -y -f concat -safe 0 -i $C/$1.txt -i $B/sound.wav \
    -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 \
    -shortest -movflags +faststart "$2"
}
join p "$OUT/${NAME}_9x16.mp4"
join s "$OUT/${NAME}_1x1.mp4"

# Cover frames (end card)
ffmpeg -v error -y -ss 28.0 -i "$OUT/${NAME}_9x16.mp4" -frames:v 1 -q:v 2 "$OUT/${NAME}_Cover_9x16.jpg"
ffmpeg -v error -y -ss 28.0 -i "$OUT/${NAME}_1x1.mp4" -frames:v 1 -q:v 2 "$OUT/${NAME}_Cover_1x1.jpg"
ls -la "$OUT"
