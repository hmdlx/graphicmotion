// Whirlpool SUNSHINE – shared timeline. Loaded by composition.html (window.TIMELINE) and
// by scripts/stretch_audio.py via node (module.exports), so picture and sound follow the
// same speed ramp.
(function (root) {
  const FPS = 24;
  const SRC_FPS = 24;

  // Source shots (rough cut): A wide, B close-ups (water → panel → jets, one camera
  // move), C wide in backlight.
  const CUTS = { B: 69, C: 186 };
  const SRC_LAST = 240;

  // Speed ramp: [source frame, playback speed]; linear in source time, 1 = real time.
  // Slow motion where the product is shown, speed-ups through the camera moves.
  const SPEED = [
    [0, 0.6], [50, 0.6], [62, 2.2], [68.9, 2.2],        // A: slow glide, speed-up into the water
    [69, 2.0], [73, 0.3], [94, 0.3],                    // B: water in slow motion
    [99, 2.0], [108, 2.0], [113, 0.5],                  //    fast move to the panel
    [133, 0.5], [137, 2.0], [143, 2.0], [148, 0.55],    //    panel, fast move to the jets
    [176, 0.55], [184, 2.0], [185.9, 2.0],              //    jets, speed-up into the cut
    [186, 1.6], [192, 0.45], [SRC_LAST, 0.45],          // C: settles into slow motion
  ];
  const HOLD = 14;               // last frame held (slow push) while the picture fades out

  function speedAt(p) {
    for (let i = 1; i < SPEED.length; i++) {
      const [a, va] = SPEED[i - 1], [b, vb] = SPEED[i];
      if (p <= b) return va + (vb - va) * Math.min(1, Math.max(0, (p - a) / (b - a)));
    }
    return SPEED[SPEED.length - 1][1];
  }

  const srcAt = [0];
  while (srcAt[srcAt.length - 1] < SRC_LAST) {
    const p = srcAt[srcAt.length - 1];
    srcAt.push(Math.min(SRC_LAST, p + speedAt(p) * SRC_FPS / FPS));
  }
  const footage = srcAt.length;
  for (let i = 0; i < HOLD; i++) srcAt.push(SRC_LAST);
  const outOf = src => srcAt.findIndex(p => p >= src);

  const T = {
    FPS, SRC_FPS, SRC_LAST, srcAt, CUTS,
    footage,
    TOTAL: srcAt.length,
    out: outOf,
    // Speed-ups get a whoosh in the sound track.
    whooshes: [outOf(60), outOf(100), outOf(138), outOf(180)],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.TIMELINE = T;
})(this);
