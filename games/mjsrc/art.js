  /* ================= tile artwork (drawn once per size into sprites) ================= */
  const CJK = '"Noto Serif CJK SC","Noto Serif CJK TC","Noto Serif CJK JP","Source Han Serif SC","Songti SC","SimSun","Noto Sans CJK SC","Noto Sans CJK JP",serif';
  const SANS = 'system-ui,Roboto,"Segoe UI",sans-serif';
  const C = { blue: '#1f4f9e', green: '#18804a', red: '#c42630', navy: '#172a4e', ink: '#1f2733', gold: '#c9921c' };
  const TABLES = {
    groen: { name: 'Groen vilt', back: ['#33a07a', '#17604a'], edge: '#0f4434' },
    hout: { name: 'Hout', back: ['#c4583c', '#7e2a1c'], edge: '#5a1c12' },
    nacht: { name: 'Nacht', back: ['#4a7fd0', '#22457e'], edge: '#16305a' },
  };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(v + (255 - v) * k); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const darken = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(v * (1 - k)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

  // a circle of the dots suit: coloured rim, ivory ring, coloured centre with a tiny highlight
  function dot(c, x, y, r, col) {
    const g = c.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    g.addColorStop(0, lighten(col, .35)); g.addColorStop(1, col);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    if (r < 2.2) return;
    c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(x, y, r * .66, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * .47, 0, 7); c.fill();
    if (r > 5) { c.strokeStyle = '#fbf6ea'; c.lineWidth = r * .07; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74); c.lineTo(x + Math.cos(a) * r * .93, y + Math.sin(a) * r * .93); c.stroke(); } }
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(x - r * .14, y - r * .14, r * .14, 0, 7); c.fill();
  }
  // a bamboo stick: rounded stem with three joints
  function stick(c, x, y, len, th, col, ang = 0) {
    c.save(); c.translate(x, y); c.rotate(ang);
    const g = c.createLinearGradient(-th / 2, 0, th / 2, 0); g.addColorStop(0, darken(col, .25)); g.addColorStop(.45, lighten(col, .25)); g.addColorStop(1, darken(col, .3));
    c.fillStyle = g; rr(c, -th / 2, -len / 2, th, len, th / 2); c.fill();
    c.fillStyle = darken(col, .45);
    for (const k of [-.5, 0, .5]) { const yy = k * (len - th) * .92; c.fillRect(-th * .62, yy - th * .16, th * 1.24, th * .32); }
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-th * .18, -len / 2 + th * .6, th * .16, len - th * 1.2);
    c.restore();
  }
  const DOTS = {    // [x, y, colour] in the face box (0..1), radius factor
    1: [[[.5, .5, 'X']], .36], 2: [[[.5, .27, 'g'], [.5, .73, 'b']], .2], 3: [[[.25, .2, 'b'], [.5, .5, 'r'], [.75, .8, 'g']], .16],
    4: [[[.29, .27, 'b'], [.71, .27, 'g'], [.29, .73, 'g'], [.71, .73, 'b']], .17],
    5: [[[.27, .22, 'b'], [.73, .22, 'g'], [.5, .5, 'r'], [.27, .78, 'g'], [.73, .78, 'b']], .15],
    6: [[[.29, .18, 'g'], [.71, .18, 'g'], [.29, .52, 'r'], [.71, .52, 'r'], [.29, .82, 'r'], [.71, .82, 'r']], .14],
    7: [[[.22, .13, 'g'], [.5, .24, 'g'], [.78, .35, 'g'], [.29, .62, 'r'], [.71, .62, 'r'], [.29, .87, 'r'], [.71, .87, 'r']], .12],
    8: [[[.29, .13, 'b'], [.71, .13, 'b'], [.29, .38, 'b'], [.71, .38, 'b'], [.29, .62, 'b'], [.71, .62, 'b'], [.29, .87, 'b'], [.71, .87, 'b']], .12],
    9: [[[.2, .17, 'b'], [.5, .17, 'b'], [.8, .17, 'b'], [.2, .5, 'r'], [.5, .5, 'r'], [.8, .5, 'r'], [.2, .83, 'g'], [.5, .83, 'g'], [.8, .83, 'g']], .12],
  };
  const BAMS = {    // [x, y, colour, len, angle]
    2: [[.5, .27, 'g'], [.5, .73, 'b']], 3: [[.5, .27, 'g'], [.3, .73, 'g'], [.7, .73, 'g']],
    4: [[.3, .27, 'g'], [.7, .27, 'b'], [.3, .73, 'b'], [.7, .73, 'g']], 5: [[.22, .27, 'g'], [.78, .27, 'g'], [.5, .5, 'r'], [.22, .73, 'g'], [.78, .73, 'g']],
    6: [[.2, .27, 'g'], [.5, .27, 'g'], [.8, .27, 'g'], [.2, .73, 'b'], [.5, .73, 'b'], [.8, .73, 'b']],
    7: [[.5, .17, 'r', .9], [.2, .5, 'g', .9], [.5, .5, 'g', .9], [.8, .5, 'g', .9], [.2, .83, 'g', .9], [.5, .83, 'g', .9], [.8, .83, 'g', .9]],
    8: [[.17, .27, 'g'], [.39, .27, 'g', 1, .32], [.61, .27, 'g', 1, -.32], [.83, .27, 'g'], [.17, .73, 'g'], [.39, .73, 'g', 1, -.32], [.61, .73, 'g', 1, .32], [.83, .73, 'g']],
    9: [[.2, .17, 'g', .9], [.5, .17, 'r', .9], [.8, .17, 'g', .9], [.2, .5, 'g', .9], [.5, .5, 'r', .9], [.8, .5, 'g', .9], [.2, .83, 'g', .9], [.5, .83, 'r', .9], [.8, .83, 'g', .9]],
  };
  const COL = { b: C.blue, g: C.green, r: C.red };
  const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const WIND = ['東', '南', '西', '北'], WINDL = ['O', 'Z', 'W', 'N'];

  function glyph(c, ch, x, y, size, col, weight = 700) {
    c.font = `${weight} ${size}px ${CJK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(ch, x, y);
  }
  function index(c, txt, w, h, col, chip) {        // little help index in the top-left corner
    const s = Math.max(7, h * .2);
    c.font = `800 ${s}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (chip) { c.fillStyle = col; c.beginPath(); c.arc(s * .62, s * .62, s * .56, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillText(txt, s * .62, s * .66); return; }
    c.fillStyle = col; c.fillText(txt, s * .5, s * .58);
  }
  function bird(c, w, h) {           // one of bamboo: an original little bird on a bamboo twig
    const u = Math.min(w, h * .8);
    c.save(); c.translate(w / 2, h / 2);
    stick(c, -u * .05, u * .42, u * .95, u * .1, C.green, Math.PI / 2 - .25);
    // tail
    const tail = [[C.blue, .55], [C.green, .25], [C.red, -.05]];
    tail.forEach(([col, a]) => { c.save(); c.rotate(a); c.fillStyle = col; c.beginPath(); c.ellipse(u * .26, u * .12, u * .26, u * .07, .5, 0, 7); c.fill(); c.restore(); });
    // body
    let g = c.createLinearGradient(0, -u * .3, 0, u * .25); g.addColorStop(0, '#3fae6a'); g.addColorStop(1, '#16683c');
    c.fillStyle = g; c.beginPath(); c.ellipse(-u * .04, u * .02, u * .25, u * .19, -.35, 0, 7); c.fill();
    c.fillStyle = '#e8b33a'; c.beginPath(); c.ellipse(-u * .08, u * .08, u * .12, u * .08, -.4, 0, 7); c.fill();
    // wing
    c.fillStyle = C.blue; c.beginPath(); c.ellipse(u * .04, -u * .02, u * .15, u * .08, -.6, 0, 7); c.fill();
    // head + crest + beak + eye
    c.fillStyle = '#2f9a5e'; c.beginPath(); c.arc(-u * .22, -u * .2, u * .12, 0, 7); c.fill();
    c.fillStyle = C.red; c.beginPath(); c.moveTo(-u * .27, -u * .3); c.quadraticCurveTo(-u * .3, -u * .48, -u * .14, -u * .44); c.quadraticCurveTo(-u * .2, -u * .36, -u * .17, -u * .3); c.fill();
    c.fillStyle = '#e8902a'; c.beginPath(); c.moveTo(-u * .33, -u * .22); c.lineTo(-u * .46, -u * .17); c.lineTo(-u * .32, -u * .15); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-u * .24, -u * .22, u * .04, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(-u * .245, -u * .22, u * .022, 0, 7); c.fill();
    c.restore();
  }
  function blossom(c, x, y, r, col, petals = 5, mid = '#f6d15a') {
    c.fillStyle = col;
    for (let k = 0; k < petals; k++) { const a = k * Math.PI * 2 / petals - Math.PI / 2; c.beginPath(); c.arc(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, 0, 7); c.fill(); }
    c.fillStyle = mid; c.beginPath(); c.arc(x, y, r * .3, 0, 7); c.fill();
  }
  function leaf(c, x, y, len, wd, ang, col) { c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * .5, -wd, len, 0); c.quadraticCurveTo(len * .5, wd, 0, 0); c.fill(); c.restore(); }
  function flower(c, k, w, h) {
    const u = Math.min(w, h * .8), cx = w / 2, cy = h / 2 + h * .04;
    c.lineCap = 'round';
    if (k === 0) {        // plum blossom on a branch
      c.strokeStyle = '#6b4226'; c.lineWidth = u * .07; c.beginPath(); c.moveTo(cx - u * .4, cy + u * .45); c.quadraticCurveTo(cx - u * .05, cy + u * .1, cx + u * .1, cy - u * .45); c.stroke();
      c.lineWidth = u * .045; c.beginPath(); c.moveTo(cx - u * .1, cy + u * .15); c.quadraticCurveTo(cx + u * .2, cy + u * .05, cx + u * .38, cy + u * .2); c.stroke();
      blossom(c, cx + u * .1, cy - u * .3, u * .2, '#ec6f96'); blossom(c, cx - u * .2, cy + u * .05, u * .17, '#f28fae'); blossom(c, cx + u * .3, cy + u * .18, u * .15, '#ec6f96');
    } else if (k === 1) { // orchid
      leaf(c, cx - u * .05, cy + u * .48, u * .7, u * .07, -2.1, '#2f8a4a'); leaf(c, cx + u * .02, cy + u * .48, u * .62, u * .07, -1.1, '#3d9c56'); leaf(c, cx, cy + u * .48, u * .5, u * .06, -1.6, '#2a7a40');
      c.fillStyle = '#9b4fc2'; for (const a of [-1.9, -.6, .7, 1.9, 3.14]) { c.save(); c.translate(cx, cy - u * .12); c.rotate(a); c.beginPath(); c.ellipse(0, -u * .16, u * .09, u * .17, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = '#f2d14b'; c.beginPath(); c.arc(cx, cy - u * .12, u * .07, 0, 7); c.fill(); c.fillStyle = '#c23b6e'; c.beginPath(); c.arc(cx, cy - u * .06, u * .05, 0, 7); c.fill();
    } else if (k === 2) { // chrysanthemum
      c.strokeStyle = '#3d8a46'; c.lineWidth = u * .05; c.beginPath(); c.moveTo(cx, cy + u * .5); c.lineTo(cx, cy); c.stroke();
      leaf(c, cx, cy + u * .32, u * .3, u * .09, -.5, '#3d8a46'); leaf(c, cx, cy + u * .38, u * .3, u * .09, -2.6, '#3d8a46');
      for (let k2 = 0; k2 < 16; k2++) { c.save(); c.translate(cx, cy - u * .12); c.rotate(k2 * Math.PI / 8); c.fillStyle = k2 % 2 ? '#f0a020' : '#f7c23a'; c.beginPath(); c.ellipse(0, -u * .2, u * .055, u * .14, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = '#c86a10'; c.beginPath(); c.arc(cx, cy - u * .12, u * .09, 0, 7); c.fill();
    } else {              // peony
      leaf(c, cx - u * .05, cy + u * .25, u * .36, u * .1, 2.5, '#2f7d44'); leaf(c, cx + u * .05, cy + u * .25, u * .36, u * .1, .6, '#2f7d44');
      const py = cy - u * .06;
      for (const [r, col] of [[.3, '#b81f3c'], [.22, '#d9364f'], [.14, '#ef5a6c']]) for (let k2 = 0; k2 < 7; k2++) { const a = k2 * Math.PI * 2 / 7 + r * 9; c.fillStyle = col; c.beginPath(); c.arc(cx + Math.cos(a) * u * r * .55, py + Math.sin(a) * u * r * .55, u * r * .55, 0, 7); c.fill(); }
      c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(cx, py, u * .06, 0, 7); c.fill();
    }
  }
  function season(c, k, w, h) {
    const u = Math.min(w, h * .8), cx = w / 2, cy = h / 2 + h * .04;
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (k === 0) {        // spring: a tulip
      c.strokeStyle = '#3c8a3e'; c.lineWidth = u * .06; c.beginPath(); c.moveTo(cx, cy + u * .5); c.quadraticCurveTo(cx + u * .04, cy + u * .1, cx, cy - u * .05); c.stroke();
      leaf(c, cx, cy + u * .45, u * .5, u * .12, -1.15, '#4a9c45'); leaf(c, cx, cy + u * .48, u * .42, u * .1, -2.0, '#3c8a3e');
      const g = c.createLinearGradient(cx - u * .2, 0, cx + u * .2, 0); g.addColorStop(0, '#c4162b'); g.addColorStop(.5, '#f04a4a'); g.addColorStop(1, '#b3122a');
      c.fillStyle = g; c.beginPath(); c.moveTo(cx - u * .2, cy - u * .35); c.lineTo(cx - u * .1, cy - u * .2); c.lineTo(cx, cy - u * .38); c.lineTo(cx + u * .1, cy - u * .2); c.lineTo(cx + u * .2, cy - u * .35);
      c.quadraticCurveTo(cx + u * .24, cy, cx, cy); c.quadraticCurveTo(cx - u * .24, cy, cx - u * .2, cy - u * .35); c.fill();
    } else if (k === 1) { // summer: the sun
      c.strokeStyle = '#f08a1c'; c.lineWidth = u * .055;
      for (let k2 = 0; k2 < 12; k2++) { const a = k2 * Math.PI / 6; c.beginPath(); c.moveTo(cx + Math.cos(a) * u * .27, cy + Math.sin(a) * u * .27); c.lineTo(cx + Math.cos(a) * u * (k2 % 2 ? .37 : .43), cy + Math.sin(a) * u * (k2 % 2 ? .37 : .43)); c.stroke(); }
      const g = c.createRadialGradient(cx - u * .06, cy - u * .06, u * .02, cx, cy, u * .23); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#f39a1e');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, u * .22, 0, 7); c.fill();
    } else if (k === 2) { // autumn: a maple leaf
      c.save(); c.translate(cx, cy); const s = u * .46;
      const pts = [[0, -1], [.18, -.55], [.42, -.68], [.36, -.3], [.78, -.38], [.62, -.08], [.86, .1], [.4, .22], [.46, .44], [.08, .32], [0, .5], [-.08, .32], [-.46, .44], [-.4, .22], [-.86, .1], [-.62, -.08], [-.78, -.38], [-.36, -.3], [-.42, -.68], [-.18, -.55]];
      const g = c.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#f3a03a'); g.addColorStop(1, '#c8401e');
      c.fillStyle = g; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)); c.closePath(); c.fill();
      c.strokeStyle = '#8a2a12'; c.lineWidth = u * .03; c.beginPath(); c.moveTo(0, s * .9); c.lineTo(0, -s * .6); c.moveTo(0, s * .1); c.lineTo(s * .5, -s * .2); c.moveTo(0, s * .1); c.lineTo(-s * .5, -s * .2); c.stroke();
      c.restore();
    } else {              // winter: a snowflake
      c.save(); c.translate(cx, cy); c.strokeStyle = '#2f78c8'; c.lineWidth = u * .055; const s = u * .4;
      for (let k2 = 0; k2 < 6; k2++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s); c.moveTo(0, -s * .55); c.lineTo(s * .22, -s * .75); c.moveTo(0, -s * .55); c.lineTo(-s * .22, -s * .75); c.moveTo(0, -s * .25); c.lineTo(s * .16, -s * .38); c.moveTo(0, -s * .25); c.lineTo(-s * .16, -s * .38); c.stroke(); }
      c.fillStyle = '#7fb6ee'; c.beginPath(); c.arc(0, 0, u * .06, 0, 7); c.fill(); c.restore();
    }
  }
  // the picture of face f in a box of w × h (canvas units), origin top-left
  function drawFace(c, f, w, h, idx) {
    c.save();
    const s = SUIT(f), n = f % 9 + 1;
    if (idx && (s === 'dots' || s === 'bam') && n > 1) {     // keep the corner index clear of the picture
      if (idx) index(c, n, w, h, s === 'dots' ? C.blue : C.green);
      const k = .14; c.translate(w * .04, h * k); w *= .96; h *= 1 - k; idx = false;
    }
    if (s === 'dots') {
      if (n === 1) {
        const r = Math.min(w, h) * .4, x = w / 2, y = h / 2;
        c.fillStyle = C.green; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(x, y, r * .82, 0, 7); c.fill();
        c.strokeStyle = C.blue; c.lineWidth = r * .1; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55); c.lineTo(x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72); c.stroke(); }
        dot(c, x, y, r * .5, C.red);
      } else { const [list, rf] = DOTS[n], R = Math.min(w, h * .78) * rf; for (const [x, y, k] of list) dot(c, x * w, y * h, R, COL[k]); }
      if (idx) index(c, n, w, h, C.blue);
    } else if (s === 'bam') {
      if (n === 1) bird(c, w, h);
      else for (const [x, y, k, lf = 1, ang = 0] of BAMS[n]) stick(c, x * w, y * h, h * (n >= 7 ? .27 : .38) * lf, Math.max(1.6, w * (n >= 6 ? .13 : .15)), COL[k], ang);
      if (idx) index(c, n, w, h, C.green);
    } else if (s === 'char') {
      glyph(c, NUM[n - 1], w / 2, h * .29, h * .36, C.ink, 900);
      glyph(c, '萬', w / 2, h * .7, h * .41, C.red, 700);
      if (idx) index(c, n, w, h, C.red);
    } else if (s === 'wind') {
      glyph(c, WIND[f - 27], w / 2, h * .52, h * .58, C.navy, 900);
      if (idx) index(c, WINDL[f - 27], w, h, C.navy);
    } else if (s === 'drag') {
      if (f === 31) glyph(c, '中', w / 2, h * .52, h * .62, C.red, 900);
      else if (f === 32) glyph(c, '發', w / 2, h * .53, h * .58, C.green, 900);
      else {
        const m = w * .14, lw = Math.max(1.2, w * .07);
        c.strokeStyle = C.blue; c.lineWidth = lw; rr(c, m, m * 1.1, w - m * 2, h - m * 2.2, w * .08); c.stroke();
        c.lineWidth = lw * .5; rr(c, m + lw * 1.6, m * 1.1 + lw * 1.6, w - m * 2 - lw * 3.2, h - m * 2.2 - lw * 3.2, w * .05); c.stroke();
        c.fillStyle = C.blue; for (const [x, y] of [[m, m * 1.1], [w - m, m * 1.1], [m, h - m * 1.1], [w - m, h - m * 1.1]]) { c.beginPath(); c.arc(x, y, lw * 1.1, 0, 7); c.fill(); }
      }
    } else if (s === 'flower') { flower(c, f - 34, w, h); if (idx) index(c, f - 33, w, h, C.red, true); }
    else { season(c, f - 38, w, h); if (idx) index(c, f - 37, w, h, C.blue, true); }
    c.restore();
  }

  /* sprite of a whole tile: soft shadow, two-tone thickness (coloured back + ivory) on the left and bottom, ivory face
     geometry (CSS px): face W × H, thickness t; sprite = W + t + 2p wide, face at (p + t, p) */
  // sprite sets per tile size; SP is the set the board is drawn with (scaled a little while a new size is still being made)
  const SETS = new Map(); let SP = { W: 0, map: new Map() };
  function spriteGeom(W, dpr) { const H = W * 4 / 3, t = W * .14, p = Math.ceil(W * .2); return { W, H, t, p, dpr }; }
  function makeSprite(f, g, table, mode) {
    const { W, H, t, p, dpr } = g, T = TABLES[table] || TABLES.groen;
    const cv = document.createElement('canvas'); cv.width = Math.ceil((W + t + p * 2) * dpr); cv.height = Math.ceil((H + t + p * 2) * dpr);
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const r = W * .13, fx = p + t, fy = p;
    // shadow of the whole block (light from the top right)
    c.save(); c.shadowColor = 'rgba(0,0,0,.42)'; c.shadowBlur = W * .16 * dpr; c.shadowOffsetX = -t * .7 * dpr; c.shadowOffsetY = t * .9 * dpr;
    c.fillStyle = T.back[1]; rr(c, p, p + t * .3, W + t * .7, H + t * .7, r); c.fill(); c.restore();
    // thickness: stacked slices, back colour below, ivory above
    const steps = Math.max(4, Math.ceil(t * dpr * 1.5));
    for (let k = 0; k <= steps; k++) {
      const q = k / steps, x = p + t * q, y = p + t * (1 - q);
      c.fillStyle = q < .42 ? (q < .1 ? T.edge : T.back[1]) : q < .5 ? T.back[0] : (q < .62 ? '#d9cba8' : '#e8dcbf');
      rr(c, x, y, W, H, r); c.fill();
    }
    // the face
    const g1 = c.createLinearGradient(fx + W, fy, fx, fy + H); g1.addColorStop(0, '#fffdf7'); g1.addColorStop(.55, '#f8f1e1'); g1.addColorStop(1, '#ece0c4');
    c.fillStyle = g1; rr(c, fx, fy, W, H, r); c.fill();
    const g2 = c.createLinearGradient(fx + W, fy, fx, fy + H); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(.5, 'rgba(255,255,255,.1)'); g2.addColorStop(1, 'rgba(120,90,40,.35)');
    c.strokeStyle = g2; c.lineWidth = Math.max(.8, W * .035); rr(c, fx + c.lineWidth / 2, fy + c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth, r * .9); c.stroke();
    // picture, inset
    const m = W * .1;
    c.save(); c.translate(fx + m, fy + m * 1.05); drawFace(c, f, W - m * 2, H - m * 2.1, g.idx); c.restore();
    if (mode === 'dim') {
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(48,36,20,.3)'; c.fillRect(0, 0, cv.width, cv.height); c.globalCompositeOperation = 'source-over';
    }
    return cv;
  }
  function spriteSet(W, dpr, table, idx) {
    const key = `${W.toFixed(2)}|${dpr}|${table}|${idx}`;
    let st = SETS.get(key);
    if (!st) {
      st = Object.assign(spriteGeom(W, dpr), { key, table, idx, map: new Map() }); SETS.set(key, st);
      for (const k of [...SETS.keys()]) { if (SETS.size <= 3) break; if (k !== key && SETS.get(k) !== SP) SETS.delete(k); }
    }
    return st;
  }
  function sprite(f, mode, set = SP) {
    const k = f * 2 + (mode === 'dim' ? 1 : 0);
    let s = set.map.get(k); if (!s) { s = makeSprite(f, set, set.table, mode); set.map.set(k, s); }
    return s;
  }
