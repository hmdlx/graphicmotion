// Halloween-Motive als Inline-SVG für die Newsletter-Grafiken (Kürbisse, Fledermäuse, Spinnennetz, Mond).
//
// In den Grafik-Seiten werden Platzhalter ersetzt:
//   <div data-pumpkin="face|plain" style="width:…">   Kürbis (geschnitzt mit leuchtendem Gesicht oder glatt)
//   <div data-bat style="width:…">                     Fledermaus-Silhouette (Farbe über CSS color)
//   <div data-web style="width:…">                     Spinnennetz für eine Ecke (Farbe über CSS color)
//   <div data-moon style="width:…">                    Vollmond mit weichem Schein
// Akzentfarbe ist das Orange der Shop-Badges (#FF9800); Kürbisse laufen von hellem Orange in ein tiefes Rostorange.
(() => {
  let n = 0;

  function pumpkin(kind) {
    const id = 'p' + (n++);
    const lobes = [
      // hinten außen, hinten innen, vorne (Reihenfolge = Zeichenreihenfolge)
      { cx: 52, rx: 46, ry: 56, g: 'back' }, { cx: 148, rx: 46, ry: 56, g: 'back' },
      { cx: 74, rx: 42, ry: 61, g: 'mid' }, { cx: 126, rx: 42, ry: 61, g: 'mid' },
      { cx: 100, rx: 34, ry: 64, g: 'front' },
    ];
    // geschnitztes Gesicht: dunkle Schnittkante leicht versetzt, darüber das Kerzenlicht mit Schein
    const FACE = 'M54 102 L72 70 L90 102 Z M110 102 L128 70 L146 102 Z M92 120 L100 106 L108 120 Z ' +
                 'M46 124 L62 134 L72 124 L84 136 L94 127 L106 127 L116 136 L128 124 L138 134 L154 124 Q144 164 100 166 Q56 164 46 124 Z';
    const face = kind === 'face' ? `
      <path d="${FACE}" fill="#4a1600" stroke="#4a1600" stroke-width="7" stroke-linejoin="round" transform="translate(1 2)"/>
      <g filter="url(#${id}glow)"><path d="${FACE}" fill="url(#${id}fire)" stroke-linejoin="round"/></g>` : '';
    return `
<svg viewBox="0 0 200 178" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto;overflow:visible">
  <defs>
    <radialGradient id="${id}back" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#f28a1c"/><stop offset=".7" stop-color="#c9560b"/><stop offset="1" stop-color="#8e3504"/></radialGradient>
    <radialGradient id="${id}mid" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="#ffa431"/><stop offset=".65" stop-color="#e6700f"/><stop offset="1" stop-color="#a54206"/></radialGradient>
    <radialGradient id="${id}front" cx="42%" cy="30%" r="78%"><stop offset="0" stop-color="#ffbf5a"/><stop offset=".55" stop-color="#ff8f1a"/><stop offset="1" stop-color="#b44a07"/></radialGradient>
    <radialGradient id="${id}fire" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".4" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffb21c"/></radialGradient>
    <linearGradient id="${id}stem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b6a3a"/><stop offset="1" stop-color="#3b3018"/></linearGradient>
    <filter id="${id}glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/>
      <feFlood flood-color="#ffd36b" flood-opacity=".75"/><feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${lobes.map(l => `<ellipse cx="${l.cx}" cy="112" rx="${l.rx}" ry="${l.ry}" fill="url(#${id}${l.g})" stroke="#9a3c05" stroke-opacity=".45" stroke-width="1.5"/>`).join('')}
  <path d="M90 52 C92 38 94 26 104 14 C108 10 116 12 114 18 C106 28 104 40 106 54 Z" fill="url(#${id}stem)"/>
  <path d="M106 30 C118 22 132 24 138 34" fill="none" stroke="#5e6b2c" stroke-width="3" stroke-linecap="round"/>
  ${face}
</svg>`;
  }

  const BAT = 'M48 14c2-4 4-6 4-9 2 3 1 6 3 7 6-6 16-10 26-10-4 3-6 7-5 11 5-2 11-1 15 3-5 0-9 2-11 6-5-3-11-3-15 2-3-4-6-5-9-4-2 2-4 6-8 11-4-5-6-9-8-11-3-1-6 0-9 4-4-5-10-5-15-2-2-4-6-6-11-6 4-4 10-5 15-3 1-4-1-8-5-11 10 0 20 4 26 10 2-1 1-4 3-7 0 3 2 5 4 9z';
  const bat = () => `<svg viewBox="0 0 96 40" style="display:block;width:100%;height:auto"><path d="${BAT}" fill="currentColor"/></svg>`;

  // Spinnennetz für die linke obere Ecke: Speichen vom Eckpunkt, verbunden durch durchhängende Fäden
  function web() {
    const spokes = [0, 15, 32, 50, 68, 90].map(a => a * Math.PI / 180);
    const R = 200;
    let d = spokes.map(a => `M0 0 L${(R * Math.cos(a)).toFixed(1)} ${(R * Math.sin(a)).toFixed(1)}`).join(' ');
    for (const r of [42, 82, 124, 166]) {
      for (let i = 0; i < spokes.length - 1; i++) {
        const a1 = spokes[i], a2 = spokes[i + 1], am = (a1 + a2) / 2, sag = r * 0.82;
        d += ` M${(r * Math.cos(a1)).toFixed(1)} ${(r * Math.sin(a1)).toFixed(1)} Q${(sag * Math.cos(am)).toFixed(1)} ${(sag * Math.sin(am)).toFixed(1)} ${(r * Math.cos(a2)).toFixed(1)} ${(r * Math.sin(a2)).toFixed(1)}`;
      }
    }
    return `<svg viewBox="0 0 200 200" style="display:block;width:100%;height:auto"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  }

  function moon() {
    const id = 'm' + (n++);
    return `
<svg viewBox="0 0 200 200" style="display:block;width:100%;height:auto;overflow:visible">
  <defs>
    <radialGradient id="${id}halo"><stop offset=".45" stop-color="#ffe9b8" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}disc" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset=".7" stop-color="#f4e3bd"/><stop offset="1" stop-color="#d9c08c"/></radialGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#${id}halo)"/>
  <circle cx="100" cy="100" r="46" fill="url(#${id}disc)"/>
  <circle cx="86" cy="90" r="9" fill="#d6bf8f" opacity=".45"/><circle cx="114" cy="112" r="6" fill="#d6bf8f" opacity=".4"/><circle cx="104" cy="80" r="4" fill="#d6bf8f" opacity=".35"/>
</svg>`;
  }

  const fill = (sel, f) => document.querySelectorAll(sel).forEach(el => { el.innerHTML = f(el); });
  fill('[data-pumpkin]', el => pumpkin(el.dataset.pumpkin));
  fill('[data-bat]', bat);
  fill('[data-web]', web);
  fill('[data-moon]', moon);
})();
