"""Bild mit Gemini bearbeiten: gemini_edit.py <eingabe> <ausgabe> <prompt-datei> [modell] [seitenverhältnis]"""
import base64, json, sys, urllib.request

src, out, prompt_file = sys.argv[1:4]
model = sys.argv[4] if len(sys.argv) > 4 else "gemini-3-pro-image"
aspect = sys.argv[5] if len(sys.argv) > 5 else "1:1"
prompt = open(prompt_file, encoding="utf-8").read()
mime = "image/png" if src.endswith(".png") else "image/jpeg"
body = {
    "contents": [{"parts": [
        {"inline_data": {"mime_type": mime, "data": base64.b64encode(open(src, "rb").read()).decode()}},
        {"text": prompt},
    ]}],
    "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect, "imageSize": "2K"}},
}
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": "dummy"})
res = json.load(urllib.request.urlopen(req, timeout=300))
for part in res["candidates"][0]["content"]["parts"]:
    if "inlineData" in part:
        open(out, "wb").write(base64.b64decode(part["inlineData"]["data"]))
        print("ok", out)
        break
else:
    print(json.dumps(res)[:2000])
    sys.exit(1)
