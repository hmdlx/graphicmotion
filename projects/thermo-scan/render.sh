#!/bin/bash
# SPLASH THERMO – render in parallel chunks, then join and add the soundtrack.
#   projects/thermo-scan/render.sh                 # all formats
#   projects/thermo-scan/render.sh 9x16            # only the premium 9:16 cut
#   projects/thermo-scan/render.sh 1x1 16x9        # any subset
#   FINISH=1 projects/thermo-scan/render.sh 9x16   # only join existing chunks + soundtrack
#
# 9:16 is its own cut (premium.html, 38 s with the photo intro + VO); 1:1 and 16:9 share composition.html (26 s).
set -euo pipefail
cd "$(dirname "$0")/../.."

B=build/thermo-scan
C=$B/chunks
OUT=projects/thermo-scan/output
NAME=HomeDeluxe_SPLASH-THERMO_Thermo-Scan
FORMATS=${*:-9x16 1x1 16x9}
mkdir -p "$C" "$OUT"

[ -f $B/plates/drop_34.png ] || python3 -I projects/thermo-scan/prepare.py projects/thermo-scan/source $B/plates
python3 -I projects/thermo-scan/sound.py $B/sound.wav
python3 -I projects/thermo-scan/sound.py $B/sound_9x16.wav premium

# format -> page, size, chunk prefix, chunk ranges (balanced by render cost), soundtrack
spec() {
  case $1 in
    9x16) echo "premium.html 1080x1920 p 0:340,340:640,640:880,880:1146 sound_9x16.wav" ;;
    1x1)  echo "composition.html 1080x1080 s 0:435,435:780 sound.wav" ;;
    16x9) echo "composition.html 1920x1080 l 0:300,300:540,540:780 sound.wav" ;;
    *) echo "unknown format $1" >&2; exit 1 ;;
  esac
}

if [ -z "${FINISH:-}" ]; then
  for f in $FORMATS; do
    read -r page size pre ranges snd <<<"$(spec $f)"
    rm -f $C/${pre}[0-9].mp4 $C/${pre}[0-9].log    # stale chunks would be picked up by join
    i=0
    for r in ${ranges//,/ }; do
      node scripts/render.js projects/thermo-scan/$page $C/$pre$i.mp4 --plates $B/plates --serve 1 --size $size --range $r > $C/$pre$i.log 2>&1 &
      i=$((i + 1))
    done
  done
  wait
fi

for f in $FORMATS; do
  read -r page size pre ranges snd <<<"$(spec $f)"
  for c in $(ls $C/${pre}[0-9].mp4 | sort); do printf "file '%s'\n" "$(realpath $c)"; done > $C/$pre.txt
  ffmpeg -v error -y -f concat -safe 0 -i $C/$pre.txt -i $B/$snd \
    -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 \
    -shortest -movflags +faststart "$OUT/${NAME}_$f.mp4"
  # cover frame from the end card
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/${NAME}_$f.mp4")
  ffmpeg -v error -y -ss "$(echo "$dur - 1" | bc)" -i "$OUT/${NAME}_$f.mp4" -frames:v 1 -q:v 2 "$OUT/${NAME}_Cover_$f.jpg"
  if [ "$f" = 1x1 ]; then
    # GIF: 540 px, 10 fps, grain filtered out (it bloats GIFs)
    ffmpeg -v error -y -i "$OUT/${NAME}_1x1.mp4" \
      -vf "fps=10,hqdn3d=4:4:14:14,scale=540:540:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
      -loop 0 "$OUT/${NAME}_1x1.gif"
  fi
done
ls -la "$OUT"
