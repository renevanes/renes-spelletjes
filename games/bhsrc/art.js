  /* ================= art: vehicles, passengers and the scenery, all drawn in code =================
     World unit = one parking cell. Sprites are drawn once per size into small canvases and then only copied. */
  const PAL = [
    { n: 'rood', b: '#f04848', d: '#b02a33', l: '#ff9a8c' },
    { n: 'blauw', b: '#3a82f2', d: '#1d4fb6', l: '#9cc4ff' },
    { n: 'groen', b: '#2fbf5b', d: '#178739', l: '#97e6a8' },
    { n: 'geel', b: '#ffc928', d: '#d18f00', l: '#ffe58c' },
    { n: 'oranje', b: '#ff8a26', d: '#c75806', l: '#ffc08a' },
    { n: 'paars', b: '#9a5cf0', d: '#6531b5', l: '#d0b0ff' },
    { n: 'roze', b: '#ff6fb3', d: '#c93a80', l: '#ffbadb' },
    { n: 'turquoise', b: '#1fc2c8', d: '#0e858b', l: '#93ecee' },
  ];
  const GREY = { n: 'onbekend', b: '#9aa3ad', d: '#6b737d', l: '#cfd5db' };
  const FONT = 'system-ui,Roboto,"Segoe UI",sans-serif';
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // sprites are drawn into a canvas and then swapped for an ImageBitmap: copying those is much cheaper on phones
  function toBitmap(s) { s.cv = s.c; return s; }
  // the same sprite as an image URL, for the <img> elements that move around on screen
  const urlOf = s => s.url || (s.url = s.cv.toDataURL());
  const BADGE = new Map();
  function badgeUrl(kind, val, k) {                               // '?', a colour-blind symbol or a padlock with a number
    const key = kind + '|' + val + '|' + k.toFixed(2); let u = BADGE.get(key); if (u) return u;
    const W = kind === 'lock' ? .74 : .42, H = kind === 'lock' ? .48 : .42, c = mkCanvas(W * k, H * k), g = c.getContext('2d'); g.scale(k, k); g.translate(W / 2, H / 2);
    if (kind === 'hid') { g.fillStyle = '#4f5761'; g.beginPath(); g.arc(0, 0, .19, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `900 .29px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, .015); }
    else if (kind === 'cb') { const P = PAL[val]; g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.arc(0, 0, .17, 0, 7); g.fill(); g.strokeStyle = P.d; g.lineWidth = .03; g.stroke(); g.fillStyle = P.d; symbol(g, val, 0, 0, .105); g.fill(); }
    else {
      g.translate(0, .02); g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, -.33, -.16, .7, .4, .2); g.fill();
      g.fillStyle = '#2b3038'; rr(g, -.35, -.2, .7, .4, .2); g.fill(); g.strokeStyle = '#ffd34d'; g.lineWidth = .04; g.stroke();
      g.strokeStyle = '#ffd34d'; g.lineWidth = .045; g.beginPath(); g.arc(-.14, -.04, .065, Math.PI, 0); g.stroke();
      g.fillStyle = '#ffd34d'; rr(g, -.23, -.05, .18, .14, .03); g.fill();
      g.fillStyle = '#fff'; g.font = `800 .3px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(val), .12, .005);
    }
    u = { url: c.toDataURL(), w: W, h: H }; BADGE.set(key, u); return u;
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  // colour-blind help: one shape per colour (circle, square, triangle, star, diamond, heart, cross, moon)
  function symbol(g, i, x, y, r) {
    g.beginPath();
    if (i === 0) g.arc(x, y, r * .85, 0, 7);
    else if (i === 1) g.rect(x - r * .75, y - r * .75, r * 1.5, r * 1.5);
    else if (i === 2) { g.moveTo(x, y - r); g.lineTo(x + r * .95, y + r * .72); g.lineTo(x - r * .95, y + r * .72); g.closePath(); }
    else if (i === 3) { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r * 1.05; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
    else if (i === 4) { g.moveTo(x, y - r); g.lineTo(x + r * .8, y); g.lineTo(x, y + r); g.lineTo(x - r * .8, y); g.closePath(); }
    else if (i === 5) { g.moveTo(x, y + r * .85); g.bezierCurveTo(x - r * 1.5, y - r * .1, x - r * .6, y - r * 1.15, x, y - r * .4); g.bezierCurveTo(x + r * .6, y - r * 1.15, x + r * 1.5, y - r * .1, x, y + r * .85); g.closePath(); }
    else if (i === 6) { const a = r * .32, b = r * .95; g.moveTo(x - a, y - b); g.lineTo(x + a, y - b); g.lineTo(x + a, y - a); g.lineTo(x + b, y - a); g.lineTo(x + b, y + a); g.lineTo(x + a, y + a); g.lineTo(x + a, y + b); g.lineTo(x - a, y + b); g.lineTo(x - a, y + a); g.lineTo(x - b, y + a); g.lineTo(x - b, y - a); g.lineTo(x - a, y - a); g.closePath(); }
    else { g.arc(x, y, r * .9, Math.PI * .3, Math.PI * 1.7, false); g.arc(x + r * .42, y - r * .12, r * .7, Math.PI * 1.55, Math.PI * .45, true); g.closePath(); }
  }
  const VW = .8;                                                  // vehicle width (cells)
  const vLen = len => len - .16;
  // seat positions on the roof (2 columns), in vehicle space (nose = -y)
  function seatPos(len, cap) {
    const L = vLen(len), rows = cap / 2, top = -L / 2 + .46, bot = L / 2 - .2, out = [];
    for (let r = 0; r < rows; r++) { const y = rows === 1 ? (top + bot) / 2 : top + (bot - top) * (r + .5) / rows; out.push([-.17, y], [.17, y]); }
    return out;
  }
  /* ---------- vehicle sprite: top-down, nose up. mode: 'lot' (arrow), 'bay' (seats drawn live), 'hid' (colour unknown) ---------- */
  const SPR = new Map();
  function vehicleSprite(len, col, mode, cb, k) {
    const key = len + '|' + col + '|' + mode + '|' + (cb ? 1 : 0) + '|' + k.toFixed(2);
    let s = SPR.get(key); if (s) return s;
    if (SPR.size > 260) SPR.clear();
    const m = .2, W = VW, L = vLen(len), c = mkCanvas((W + m * 2) * k, (L + m * 2) * k), g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2); g.scale(k, k);
    paintVehicle(g, len, mode === 'hid' ? GREY : PAL[col], mode, cb ? col : -1, k);
    s = toBitmap({ c, w: c.width / k, h: c.height / k }); SPR.set(key, s); return s;
  }
  function paintVehicle(g, len, P, mode, cbCol, k) {
    const W = VW, L = vLen(len), hw = W / 2, hl = L / 2;
    // shadow
    g.save(); g.shadowColor = 'rgba(10,20,30,.42)'; g.shadowBlur = .12 * k; g.shadowOffsetY = .05 * k; g.shadowOffsetX = .02 * k;
    g.fillStyle = '#000'; rr(g, -hw + .02, -hl + .02, W - .04, L - .04, .16); g.fill(); g.restore();
    // wheels peeking out
    g.fillStyle = '#23272e';
    const axles = len === 4 ? [-hl + .3, -.1, hl - .32] : [-hl + .3, hl - .3];
    for (const ay of axles) for (const sx of [-1, 1]) { rr(g, sx > 0 ? hw - .045 : -hw - .025, ay - .11, .07, .22, .025); g.fill(); }
    // mirrors
    g.fillStyle = P.d; for (const sx of [-1, 1]) { rr(g, sx > 0 ? hw - .01 : -hw - .07, -hl + .13, .08, .055, .025); g.fill(); }
    // body
    let gr = g.createLinearGradient(-hw, 0, hw, 0); gr.addColorStop(0, P.d); gr.addColorStop(.16, P.b); gr.addColorStop(.84, P.b); gr.addColorStop(1, P.d);
    g.fillStyle = gr; rr(g, -hw, -hl, W, L, .17); g.fill();
    g.lineWidth = .03; g.strokeStyle = 'rgba(0,0,0,.22)'; g.stroke();
    // front bumper + headlights, rear lights
    g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, -hw + .05, -hl + .005, W - .1, .05, .025); g.fill();
    g.fillStyle = '#fff4b8'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * (hw - .15), -hl + .045, .065, .03, 0, 0, 7); g.fill(); }
    g.fillStyle = '#ff5a4a'; for (const sx of [-1, 1]) { rr(g, sx > 0 ? hw - .16 : -hw + .06, hl - .045, .1, .03, .012); g.fill(); }
    // windscreen
    gr = g.createLinearGradient(0, -hl + .07, 0, -hl + .34); gr.addColorStop(0, '#5f86b3'); gr.addColorStop(1, '#22344d');
    g.fillStyle = gr; rr(g, -hw + .07, -hl + .08, W - .14, .27, .08); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = .03; g.beginPath(); g.moveTo(-hw + .16, -hl + .3); g.lineTo(-hw + .3, -hl + .12); g.stroke();
    // side windows
    const rt = -hl + .4, rb = hl - .12;
    g.fillStyle = '#2a3c55';
    for (const sx of [-1, 1]) for (let y = rt + .04; y < rb - .12; y += .3) { rr(g, sx > 0 ? hw - .085 : -hw + .03, y, .055, Math.min(.22, rb - .06 - y), .02); g.fill(); }
    // roof
    gr = g.createLinearGradient(0, rt, 0, rb); gr.addColorStop(0, P.l); gr.addColorStop(.35, P.b); gr.addColorStop(1, P.b);
    g.fillStyle = gr; rr(g, -hw + .1, rt, W - .2, rb - rt, .1); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .025; g.stroke();
    // rear window
    g.fillStyle = '#2a3c55'; rr(g, -hw + .16, hl - .095, W - .32, .055, .025); g.fill();
    // roof details by type
    if (len === 4) {                                            // articulated bus: bellows in the middle
      g.fillStyle = '#3a3f47'; rr(g, -hw + .02, -.16, W - .04, .2, .03); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = .02; for (let y = -.13; y < .04; y += .045) { g.beginPath(); g.moveTo(-hw + .05, y); g.lineTo(hw - .05, y); g.stroke(); }
    } else if (len === 3 && mode !== 'bay') {
      g.fillStyle = 'rgba(255,255,255,.7)'; rr(g, -.19, hl - .55, .38, .3, .06); g.fill();
      g.strokeStyle = 'rgba(80,90,100,.35)'; g.lineWidth = .02; for (let x = -.12; x < .14; x += .06) { g.beginPath(); g.moveTo(x, hl - .5); g.lineTo(x, hl - .3); g.stroke(); }
    } else if (len === 2 && mode !== 'bay') {
      g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, -.12, hl - .36, .24, .17, .05); g.fill();
    }
    // arrow on the roof (lot and hidden): which way the vehicle drives
    if (mode !== 'bay') {
      const ay = len === 2 ? -hl + .74 : len === 3 ? -hl + .82 : -hl + .74, s = len === 2 ? .9 : 1.05;
      g.save(); g.translate(0, ay); g.scale(s, s);
      g.beginPath(); g.moveTo(0, -.25); g.lineTo(.23, -.01); g.lineTo(.09, -.01); g.lineTo(.09, .2); g.lineTo(-.09, .2); g.lineTo(-.09, -.01); g.lineTo(-.23, -.01); g.closePath();
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = .05 * k; g.shadowOffsetY = .02 * k; g.fillStyle = '#fff'; g.fill(); g.restore();
      g.lineJoin = 'round'; g.lineWidth = .025; g.strokeStyle = 'rgba(0,0,0,.15)'; g.stroke();
      g.restore();
    }
  }
  // where the '?' or colour-blind badge sits on the roof (vehicle space); it is drawn upright on top, so it never turns upside down
  const badgeY = (len, mode) => mode === 'bay' ? -vLen(len) / 2 + .5 : len === 2 ? vLen(len) / 2 - .32 : len === 3 ? vLen(len) / 2 - .48 : vLen(len) / 2 - .55;
  /* ---------- passengers: little figures seen slightly from the front ---------- */
  const SKIN = ['#f6d2b8', '#e8b48e', '#c88d62', '#8f5b3b', '#f2c9a0'], HAIR = ['#3a2a1e', '#7b4a22', '#e0ad4f', '#1f1f24', '#b4552b', '#8a8f99'];
  const PSPR = new Map();
  function personSprite(col, vr, cb, k) {
    const key = col + '|' + vr + '|' + (cb ? 1 : 0) + '|' + k.toFixed(2);
    let s = PSPR.get(key); if (s) return s;
    if (PSPR.size > 300) PSPR.clear();
    const W = .62, H = .82, c = mkCanvas(W * k, H * k), g = c.getContext('2d');
    g.scale(k, k); g.translate(W / 2, H - .06);                   // origin: between the feet
    drawPerson(g, col, vr, cb);
    s = toBitmap({ c, w: W, h: H, ax: W / 2, ay: H - .06 }); PSPR.set(key, s); return s;
  }
  function drawPerson(g, col, vr, cb) {
    const P = col >= 0 ? PAL[col] : GREY, skin = SKIN[vr % SKIN.length], hair = HAIR[(vr >> 2) % HAIR.length], style = (vr >> 4) % 3;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 0, .15, .05, 0, 0, 7); g.fill();
    g.fillStyle = '#39415a'; rr(g, -.085, -.17, .07, .17, .03); g.fill(); rr(g, .015, -.17, .07, .17, .03); g.fill();
    // arms
    g.fillStyle = P.d; rr(g, -.16, -.38, .07, .2, .035); g.fill(); rr(g, .09, -.38, .07, .2, .035); g.fill();
    g.fillStyle = skin; g.beginPath(); g.arc(-.125, -.17, .033, 0, 7); g.arc(.125, -.17, .033, 0, 7); g.fill();
    // shirt
    const gr = g.createLinearGradient(-.12, 0, .12, 0); gr.addColorStop(0, P.d); gr.addColorStop(.3, P.b); gr.addColorStop(1, P.d);
    g.fillStyle = gr; g.beginPath(); g.moveTo(-.1, -.4); g.quadraticCurveTo(0, -.43, .1, -.4); g.lineTo(.12, -.15); g.quadraticCurveTo(0, -.12, -.12, -.15); g.closePath(); g.fill();
    if (cb && col >= 0) { g.fillStyle = '#fff'; symbol(g, col, 0, -.27, .07); g.fill(); }
    // head
    const hy = -.53;
    g.fillStyle = skin; g.beginPath(); g.arc(0, hy, .135, 0, 7); g.fill();
    g.fillStyle = hair; g.beginPath();
    if (style === 0) { g.arc(0, hy - .01, .14, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(.05, hy - .06, -.13, hy - .02); }
    else if (style === 1) { g.arc(0, hy - .01, .14, Math.PI * .95, Math.PI * 2.05); g.lineTo(.12, hy + .02); g.quadraticCurveTo(0, hy - .1, -.12, hy + .02); g.closePath(); g.fill(); g.beginPath(); g.arc(0, hy - .16, .065, 0, 7); }
    else { g.arc(0, hy - .01, .145, Math.PI * .9, Math.PI * 2.1); g.lineTo(.15, hy + .1); g.lineTo(.1, hy + .1); g.quadraticCurveTo(.06, hy - .07, -.08, hy - .06); g.lineTo(-.15, hy + .1); g.closePath(); }
    g.fill();
    g.fillStyle = '#2a2420'; g.beginPath(); g.arc(-.045, hy + .015, .017, 0, 7); g.arc(.045, hy + .015, .017, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,120,120,.35)'; g.beginPath(); g.arc(-.08, hy + .055, .022, 0, 7); g.arc(.08, hy + .055, .022, 0, 7); g.fill();
  }
  // a small head seen from above, for the seats on a parked bus
  const HEADS = new Map();
  function headSprite(vr, k) {
    const key = vr + '|' + k.toFixed(2); let s = HEADS.get(key); if (s) return s;
    if (HEADS.size > 80) HEADS.clear();
    const R = .12, c = mkCanvas(R * 2.4 * k, R * 2.4 * k), g = c.getContext('2d'); g.scale(k, k); g.translate(R * 1.2, R * 1.2);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(.01, .015, R, 0, 7); g.fill();
    g.fillStyle = SKIN[vr % SKIN.length]; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
    g.fillStyle = HAIR[(vr >> 2) % HAIR.length]; g.beginPath(); g.arc(0, -.015, R * .92, Math.PI * .85, Math.PI * 2.15); g.closePath(); g.fill();
    s = toBitmap({ c, r: R * 1.2 }); HEADS.set(key, s); return s;
  }

  /* ---------- scenery (drawn once per layout into the background canvas) ---------- */
  let GRASS = null;
  function grassPattern(g) {
    if (!GRASS) {
      GRASS = mkCanvas(96, 96); const x = GRASS.getContext('2d'), r = rngA(5);
      x.fillStyle = '#74c25c'; x.fillRect(0, 0, 96, 96);
      for (let i = 0; i < 260; i++) { const px = r() * 96, py = r() * 96, l = r(); x.fillStyle = l < .5 ? 'rgba(40,110,40,.22)' : 'rgba(200,255,170,.18)'; x.fillRect(px, py, 1.4, 3 + r() * 3); }
      for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(60,140,50,.18)'; x.beginPath(); x.arc(r() * 96, r() * 96, 2 + r() * 5, 0, 7); x.fill(); }
    }
    return g.createPattern(GRASS, 'repeat');
  }
  function rngA(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function roadBand(g, pts, RW, closed) {
    const path = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (closed) g.closePath(); };
    g.lineJoin = 'round'; g.lineCap = 'butt';
    path(); g.strokeStyle = '#c9d0d6'; g.lineWidth = RW + .2; g.stroke();
    path(); g.strokeStyle = '#4a515b'; g.lineWidth = RW; g.stroke();
    path(); g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = RW * .8; g.stroke();
    path(); g.setLineDash([.32, .32]); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .05; g.stroke(); g.setLineDash([]);
  }
  function tree(g, x, y, s, r) {
    g.fillStyle = 'rgba(20,60,20,.28)'; g.beginPath(); g.ellipse(x + .12 * s, y + .14 * s, .5 * s, .44 * s, 0, 0, 7); g.fill();
    const tones = [['#3e9a3e', '#2b7a30'], ['#4fae45', '#2f8634'], ['#5aa84a', '#3a7d33']][Math.floor(r() * 3)];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * 6.28 + r(), d = i ? .22 * s : 0, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, rad = (i ? .26 : .34) * s;
      const gr = g.createRadialGradient(cx - rad * .35, cy - rad * .4, rad * .1, cx, cy, rad); gr.addColorStop(0, '#8fd877'); gr.addColorStop(.45, tones[0]); gr.addColorStop(1, tones[1]);
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.fill();
    }
  }
  function bush(g, x, y, s, r) {
    g.fillStyle = 'rgba(20,60,20,.22)'; g.beginPath(); g.ellipse(x + .06, y + .08, .3 * s, .22 * s, 0, 0, 7); g.fill();
    for (let i = 0; i < 3; i++) { const cx = x + (i - 1) * .14 * s, cy = y + (i === 1 ? -.06 : 0) * s; g.fillStyle = i === 1 ? '#5cb94c' : '#469c3d'; g.beginPath(); g.arc(cx, cy, .16 * s, 0, 7); g.fill(); }
    if (r() < .6) { const fc = ['#ff7a9a', '#ffe066', '#ffffff', '#c58bff'][Math.floor(r() * 4)]; g.fillStyle = fc; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + (r() - .5) * .4 * s, y + (r() - .6) * .25 * s, .035 * s, 0, 7); g.fill(); } }
  }
  function obstacle(g, x, y, kind) {                              // x, y: cell centre
    if (kind === 0) {                                             // traffic cones
      for (const [dx, dy] of [[-.2, -.18], [.2, -.14], [0, .2]]) {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + dx + .03, y + dy + .04, .15, 0, 7); g.fill();
        g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(x + dx, y + dy, .15, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = .045; g.beginPath(); g.arc(x + dx, y + dy, .085, 0, 7); g.stroke();
        g.fillStyle = '#ffb066'; g.beginPath(); g.arc(x + dx, y + dy, .035, 0, 7); g.fill();
      }
    } else if (kind === 1) {                                      // bollards
      for (const [dx, dy] of [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]]) {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + dx + .03, y + dy + .04, .11, 0, 7); g.fill();
        g.fillStyle = '#4a4f57'; g.beginPath(); g.arc(x + dx, y + dy, .11, 0, 7); g.fill();
        g.fillStyle = '#e8eef3'; g.beginPath(); g.arc(x + dx, y + dy, .065, 0, 7); g.fill();
        g.fillStyle = '#d33'; g.beginPath(); g.arc(x + dx, y + dy, .03, 0, 7); g.fill();
      }
    } else if (kind === 2) {                                      // little tree in a round planter
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + .04, y + .05, .4, 0, 7); g.fill();
      g.fillStyle = '#b07a4a'; g.beginPath(); g.arc(x, y, .4, 0, 7); g.fill();
      g.fillStyle = '#6b4a2c'; g.beginPath(); g.arc(x, y, .33, 0, 7); g.fill();
      tree(g, x, y - .02, .78, rngA(Math.floor(x * 31 + y * 17) + 3));
    } else {                                                      // road works barrier
      g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, x - .4, y - .14, .84, .34, .06); g.fill();
      g.save(); rr(g, x - .42, y - .17, .84, .3, .06); g.clip();
      for (let i = -4; i < 6; i++) { g.fillStyle = i % 2 ? '#fff' : '#e23b2e'; g.beginPath(); g.moveTo(x - .42 + i * .16, y - .17); g.lineTo(x - .42 + i * .16 + .16, y - .17); g.lineTo(x - .42 + i * .16 + .02, y + .13); g.lineTo(x - .42 + i * .16 - .14, y + .13); g.closePath(); g.fill(); }
      g.restore();
      g.fillStyle = '#ffd23a'; for (const dx of [-.33, .33]) { g.beginPath(); g.arc(x + dx, y - .26, .07, 0, 7); g.fill(); g.strokeStyle = '#7a5a00'; g.lineWidth = .02; g.stroke(); }
    }
  }
  // the bus shelter, seen from above (glass roof, bench below)
  function shelter(g, x, y, w, h) {
    g.fillStyle = 'rgba(0,0,0,.2)'; rr(g, x + .06, y + .08, w, h, .08); g.fill();
    g.fillStyle = '#8a5a3a'; rr(g, x + .12, y + h - .32, w - .24, .2, .05); g.fill();
    g.fillStyle = 'rgba(150,205,240,.62)'; rr(g, x, y, w, h, .08); g.fill();
    g.strokeStyle = '#3c4a5a'; g.lineWidth = .06; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .03; g.beginPath(); g.moveTo(x + .15, y + .12); g.lineTo(x + w * .45, y + .12); g.stroke();
    g.strokeStyle = 'rgba(60,74,90,.6)'; g.lineWidth = .025; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(x + w * i / 3, y); g.lineTo(x + w * i / 3, y + h); g.stroke(); }
  }
  function stopSign(g, x, y) {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + .06, y + .08, .27, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, .27, 0, 7); g.fill();
    g.strokeStyle = '#1d5fbf'; g.lineWidth = .06; g.stroke();
    // little bus pictogram
    g.fillStyle = '#1d5fbf'; rr(g, x - .14, y - .12, .28, .2, .04); g.fill();
    g.fillStyle = '#fff'; g.fillRect(x - .11, y - .09, .22, .07);
    g.fillStyle = '#1d5fbf'; g.beginPath(); g.arc(x - .08, y + .1, .035, 0, 7); g.arc(x + .08, y + .1, .035, 0, 7); g.fill();
  }
  function drawScene(g, LY, S, k, W, H) {
    // g is scaled to world units already; W, H: canvas size in world units, origin at the world origin offset
    const { RW, ring } = LY, x0w = -LY.ox / LY.c, y0w = -LY.oy / LY.c;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = grassPattern(g); g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
    g.fillStyle = 'rgba(120,200,90,.10)'; g.fillRect(x0w, y0w, W, H);
    // platform + bays + roads
    const P = LY.plat;
    g.fillStyle = 'rgba(0,0,0,.12)'; rr(g, P.x0 + .06, P.y0 + .08, P.x1 - P.x0, P.y1 - P.y0, .2); g.fill();
    g.fillStyle = '#e8e0cf'; rr(g, P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0, .2); g.fill();
    g.save(); rr(g, P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0, .2); g.clip();
    g.strokeStyle = 'rgba(150,135,110,.22)'; g.lineWidth = .025;
    for (let x = Math.floor(P.x0 * 2) / 2; x < P.x1; x += .5) { g.beginPath(); g.moveTo(x, P.y0); g.lineTo(x, P.y1); g.stroke(); }
    for (let y = Math.floor(P.y0 * 2) / 2; y < P.y1; y += .5) { g.beginPath(); g.moveTo(P.x0, y); g.lineTo(P.x1, y); g.stroke(); }
    g.restore();
    // ring road around the lot + the road past the stop
    const rx0 = ring.x0, ry0 = ring.y0, rx1 = ring.x1, ry1 = ring.y1;
    const ringPts = [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]];
    const ext = LY.land ? [[rx1 - 1, LY.roadY], [x0w + W + 1, LY.roadY]] : [[x0w - 1, LY.roadY], [x0w + W + 1, LY.roadY]];
    // curbs first for both, then asphalt for both (so the junction looks joined)
    const both = (fn) => { fn(ringPts, true); fn(ext, false); };
    const band = (pts, closed, col, wd) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (closed) g.closePath(); g.strokeStyle = col; g.lineWidth = wd; g.lineJoin = 'round'; g.stroke(); };
    both((p, c) => band(p, c, 'rgba(0,0,0,.15)', RW + .34));
    both((p, c) => band(p, c, '#c9d0d6', RW + .2));
    // bay area (asphalt pocket opening onto the road)
    const b0 = LY.bays[0], bl = LY.bays[LY.bays.length - 2], bw = LY.bayW;               // the extra bay (last) is drawn only when opened
    g.fillStyle = '#c9d0d6'; g.fillRect(b0.x - bw / 2 - .1, b0.top - .1, bl.x - b0.x + bw + .2, LY.roadY - b0.top + .1);
    both((p, c) => band(p, c, '#4a515b', RW));
    g.fillStyle = '#525a65'; g.fillRect(b0.x - bw / 2, b0.top, bl.x - b0.x + bw, LY.roadY - b0.top);
    both((p, c) => { g.setLineDash([.34, .3]); band(p, c, 'rgba(255,255,255,.5)', .05); g.setLineDash([]); });
    // lot
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-.06, -.06, LY.w + .12, LY.h + .12);
    const lg = g.createLinearGradient(0, 0, LY.w, LY.h); lg.addColorStop(0, '#6a7380'); lg.addColorStop(1, '#5c6571');
    g.fillStyle = lg; g.fillRect(0, 0, LY.w, LY.h);
    const rn = rngA(LY.w * 13 + LY.h);
    for (let i = 0; i < LY.w * LY.h * 3; i++) { g.fillStyle = rn() < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.04)'; g.beginPath(); g.arc(rn() * LY.w, rn() * LY.h, .03 + rn() * .08, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = .03;
    for (let x = 1; x < LY.w; x++) { g.beginPath(); g.moveTo(x, .08); g.lineTo(x, LY.h - .08); g.setLineDash([.22, .14]); g.stroke(); }
    for (let y = 1; y < LY.h; y++) { g.beginPath(); g.moveTo(.08, y); g.lineTo(LY.w - .08, y); g.stroke(); }
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = .06; g.strokeRect(.03, .03, LY.w - .06, LY.h - .06);
    for (const [ox, oy, kind] of S.obs) obstacle(g, ox + .5, oy + .5, kind);
    // bays: lines and painted numbers (the barrier bay and the extra bay are drawn live)
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = .06;
    LY.bays.forEach((b, i) => {
      if (b.kind === 'x') return;
      g.beginPath(); g.moveTo(b.x - bw / 2 + .03, b.top); g.lineTo(b.x - bw / 2 + .03, b.mouth); g.moveTo(b.x + bw / 2 - .03, b.top); g.lineTo(b.x + bw / 2 - .03, b.mouth); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(b.x - bw / 2 + .06, b.top, bw - .12, .1);
      g.fillStyle = 'rgba(255,255,255,.9)'; g.font = `800 .34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.globalAlpha = .85; g.fillText(String(i + 1), b.x, b.mouth - .32); g.restore();
    });
    // platform edge: curb + yellow tactile strip
    g.fillStyle = '#b9b2a2'; g.fillRect(P.x0 + .15, P.y1 - .1, P.x1 - P.x0 - .3, .1);
    g.fillStyle = '#f2c230'; for (let x = P.x0 + .3; x < P.x1 - .25; x += .16) { g.beginPath(); g.arc(x, P.y1 - .22, .03, 0, 7); g.fill(); }
    // queue rope between the rows
    const Q = LY.queue;
    if (Q.rope) for (const [ax, ay, bx2, by2] of Q.rope) {
      g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = .05; g.beginPath(); g.moveTo(ax + .03, ay + .04); g.lineTo(bx2 + .03, by2 + .04); g.stroke();
      g.strokeStyle = '#c0392b'; g.lineWidth = .045; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx2) / 2, ay + .06, bx2, by2); g.stroke();
      for (const [px, py] of [[ax, ay], [bx2, by2]]) { g.fillStyle = '#6b7380'; g.beginPath(); g.arc(px, py, .07, 0, 7); g.fill(); g.fillStyle = '#d6dbe0'; g.beginPath(); g.arc(px - .015, py - .015, .035, 0, 7); g.fill(); }
    }
    shelter(g, LY.shelter.x, LY.shelter.y, LY.shelter.w, LY.shelter.h);
    stopSign(g, LY.sign.x, LY.sign.y);
    // trees and bushes on the grass, away from roads and the platform
    const r = rngA(97 + LY.w * 7 + LY.h * 3 + (LY.land ? 1 : 0)), hard = LY.solid;
    const clear = (x, y, m) => !hard.some(([a, b, c2, d]) => x > a - m && x < c2 + m && y > b - m && y < d + m);
    const step = .95;
    for (let y = y0w + .3; y < y0w + H; y += step) for (let x = x0w + .3; x < x0w + W; x += step) {
      const px = x + (r() - .5) * .6, py = y + (r() - .5) * .6, s = .8 + r() * .5;
      if (!clear(px, py, .55 * s)) continue;
      const t = r(); if (t < .42) tree(g, px, py, s, r); else if (t < .62) bush(g, px, py, s * .9, r);
    }
  }
