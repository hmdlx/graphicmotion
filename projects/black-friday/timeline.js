// Black Friday – shared timeline. Loaded by composition.html (window.TIMELINE) and by
// scripts/build_audio.py via node (module.exports), so picture and sound use the same
// speed ramp.
(function (root) {
  const FPS = 24;
  const SRC_FPS = 24;
  const SRC_LAST = 144;          // last source frame

  // Speed ramp: [source frame, playback speed]. Speed is interpolated linearly in
  // source time; 1 = real time.
  const SPEED = [
    [0, 1], [62, 1],             // calm room + countdown
    [66, 1], [70, 0.4],          // ceiling breaks, ramps into slow motion
    [76, 0.4], [79, 1],          // -25% breaks through and hangs, snaps back for the fall + hit
    [104, 1], [112, 0.5],        // impact + dust in real time, then slow drift
    [SRC_LAST, 0.5],
  ];
  const IMPACT_SRC = 86;         // lands on the sofa, audio peak
  const CRACK_SRC = 64;          // ceiling starts to break
  const ZOOM_SRC = [124, 138];   // zoom through the black "-25%" into the end card
  const END_DUR = 112;           // end card, output frames

  function speedAt(p) {
    for (let i = 1; i < SPEED.length; i++) {
      const [a, va] = SPEED[i - 1], [b, vb] = SPEED[i];
      if (p <= b) return va + (vb - va) * Math.min(1, Math.max(0, (p - a) / (b - a)));
    }
    return SPEED[SPEED.length - 1][1];
  }

  // Source position (in source frames) for every output frame of the footage part.
  const srcAt = [0];
  while (srcAt[srcAt.length - 1] < ZOOM_SRC[1]) {
    const p = srcAt[srcAt.length - 1];
    srcAt.push(p + speedAt(p) * SRC_FPS / FPS);
  }
  const outOf = src => srcAt.findIndex(p => p >= src);

  const T = {
    FPS, SRC_FPS, SRC_LAST, srcAt,
    crack: outOf(CRACK_SRC),
    impact: outOf(IMPACT_SRC),
    zoom: [outOf(ZOOM_SRC[0]), srcAt.length - 1],
  };
  T.end = T.zoom[1];             // first end-card frame
  T.TOTAL = T.end + END_DUR;
  // Countdown beats, output frames; the ceiling breaks right after "1".
  T.beats = [T.crack - 42, T.crack - 28, T.crack - 14];

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.TIMELINE = T;
})(this);
