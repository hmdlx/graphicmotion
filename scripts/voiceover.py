#!/usr/bin/env python3
"""Generate a German voice-over with Gemini TTS and split it into one WAV per segment.

    python3 -I scripts/voiceover.py <voiceover.json> <out_dir>

The whole script is synthesised in a single request (the free tier allows only a
few TTS requests per day, and one take keeps the delivery consistent). The take is
then cut at the longest pauses into the segments of voiceover.json, each segment is
trimmed and loudness-normalised, transcribed back for a sanity check, and its length
is written to <out_dir>/durations.json so the composition can be timed to it.

Only the plain text goes to the model: a style direction in the prompt gets read
aloud. Needs network access to generativelanguage.googleapis.com (the key is
injected by the proxy, or set GEMINI_API_KEY), numpy and ffmpeg.
"""
import base64, json, os, subprocess, sys, time, urllib.request, wave

import numpy as np

API = 'https://generativelanguage.googleapis.com/v1beta/models/'


def call(model, body):
    headers = {'Content-Type': 'application/json'}
    if os.environ.get('GEMINI_API_KEY'):
        headers['x-goog-api-key'] = os.environ['GEMINI_API_KEY']
    req = urllib.request.Request(API + model + ':generateContent', data=json.dumps(body).encode(), headers=headers)
    for attempt in range(4):
        try:
            return json.load(urllib.request.urlopen(req, timeout=300))
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='ignore')
            if attempt == 3 or 'per day' in msg:
                raise SystemExit(f'{model}: HTTP {e.code}\n{msg[:600]}')
            print(f'  retry after HTTP {e.code}', file=sys.stderr)
            time.sleep(20 * (attempt + 1))


def tts(cfg, text):
    body = {
        'contents': [{'parts': [{'text': text}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': cfg['voice']}}},
        },
    }
    part = call(cfg['model'], body)['candidates'][0]['content']['parts'][0]['inlineData']
    data = base64.b64decode(part['data'])
    if data[:4] == b'RIFF':
        return data
    # Some TTS models return bare PCM ("audio/L16;codec=pcm;rate=24000").
    rate = int(part['mimeType'].split('rate=')[1].split(';')[0]) if 'rate=' in part['mimeType'] else 24000
    return pcm_to_wav(data, rate)


def pcm_to_wav(data, rate):
    import io
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(data)
    return buf.getvalue()


def transcribe(path):
    data = base64.b64encode(open(path, 'rb').read()).decode()
    body = {'contents': [{'parts': [{'inlineData': {'mimeType': 'audio/wav', 'data': data}},
                                    {'text': 'Transkribiere wortwörtlich auf Deutsch.'}]}]}
    try:
        part = call('gemini-3.5-transcribe', body)['candidates'][0]['content']['parts'][0]
    except SystemExit as e:
        return f'(keine Transkription: {str(e).splitlines()[0]})'
    return part.get('audioTranscription', part).get('text', '')


def load(path):
    w = wave.open(path)
    sr, ch = w.getframerate(), w.getnchannels()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a.reshape(-1, ch).mean(axis=1), sr


def split_points(a, sr, n):
    """Centres of the n longest pauses (10 ms frames below -42 dBFS)."""
    hop = sr // 100
    rms = np.sqrt(np.convolve(a ** 2, np.ones(hop) / hop, mode='same')[::hop])
    quiet = 20 * np.log10(rms + 1e-9) < -42
    pauses, start = [], None
    for i, q in enumerate(np.append(quiet, False)):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if start > 0 and i < len(quiet):  # ignore leading/trailing silence
                pauses.append((i - start, (start + i) // 2))
            start = None
    pauses.sort(reverse=True)
    if len(pauses) < n:
        raise SystemExit(f'only {len(pauses)} pauses found, need {n}')
    return sorted(c * hop for _, c in pauses[:n])


def finish(src, dst):
    af = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,'
          'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,'
          'loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ac', '1', dst], check=True)
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst],
                         check=True, capture_output=True, text=True).stdout
    return round(float(out), 3)


def main():
    cfg_path, out_dir = sys.argv[1:3]
    cfg = json.load(open(cfg_path, encoding='utf-8'))
    segs = cfg['segments']
    os.makedirs(out_dir, exist_ok=True)

    take = os.path.join(out_dir, 'take.wav')
    if not os.path.exists(take) or '--new-take' in sys.argv:
        open(take, 'wb').write(tts(cfg, '\n\n'.join(s['say'] for s in segs)))
    a, sr = load(take)
    print(f'take: {len(a) / sr:.2f} s')

    cuts = [0] + split_points(a, sr, len(segs) - 1) + [len(a)]
    durations = {}
    for seg, lo, hi in zip(segs, cuts, cuts[1:]):
        part = os.path.join(out_dir, seg['id'] + '.part.wav')
        with wave.open(part, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
            w.writeframes((np.clip(a[lo:hi], -1, 1) * 32767).astype(np.int16).tobytes())
        wav = os.path.join(out_dir, seg['id'] + '.wav')
        durations[seg['id']] = finish(part, wav)
        os.remove(part)
        print(f"{seg['id']:>7} {durations[seg['id']]:5.2f} s | {transcribe(wav)}")
    json.dump(durations, open(os.path.join(out_dir, 'durations.json'), 'w'), indent=2)


if __name__ == '__main__':
    main()
