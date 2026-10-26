#!/usr/bin/env bash
# Endmischung: VO (ab 0,8 s) + Musik (unter der Stimme geduckt) + SFX + Stadion-Atmo aus der KI-Plate.
# -> audio/mix.wav, 48 kHz Stereo, -14 LUFS, True Peak -1 dB
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
ffmpeg -v error -y \
  -i "$here/music.wav" -i "$here/sfx.wav" -i "$here/voiceover_vlad.mp3" -i "$here/../source/ki_stadion.mp4" \
  -filter_complex "
    [2:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=60,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,adelay=800|800,apad=whole_dur=37[vo];
    [vo]asplit=2[vo1][vosc];
    [0:a]volume=-5dB[mus];
    [mus][vosc]sidechaincompress=threshold=0.04:ratio=5:attack=25:release=350:makeup=1[musd];
    [1:a]volume=-9dB[sfx];
    [3:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=120,volume=-15dB,afade=t=in:st=0:d=0.6,afade=t=out:st=3.8:d=1.2,adelay=300|300,apad=whole_dur=37[crowd];
    [vo1][musd][sfx][crowd]amix=inputs=4:normalize=0:duration=longest,atrim=0:37,loudnorm=I=-14:TP=-1:LRA=11,aresample=48000[out]" \
  -map "[out]" -c:a pcm_s16le "$here/mix.wav"
ffmpeg -hide_banner -i "$here/mix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
