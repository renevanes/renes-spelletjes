  /* ================= art: pre-rendered sprites (one canvas per bubble kind and colour), scenery, the launcher ================= */
  const TAU = Math.PI * 2, FONT = 'system-ui,Roboto,"Segoe UI",sans-serif';
  const PAL = [
    { n: 'rood', b: '#f2394c', l: '#ff9aa2', d: '#8e0c1f' },
    { n: 'geel', b: '#ffcc1a', l: '#fff3a0', d: '#b87800' },
    { n: 'blauw', b: '#2f7cf6', l: '#9cc8ff', d: '#14378f' },
    { n: 'groen', b: '#2fc44b', l: '#a6f2a8', d: '#0f6b25' },
    { n: 'paars', b: '#a45cff', l: '#dcbcff', d: '#4f1a9c' },
    { n: 'oranje', b: '#ff8619', l: '#ffc98a', d: '#a5470a' },
  ];
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function srng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------- the glossy ball ---------- */
  function ball(g, R, b, l, d, shadow = true) {
    if (shadow) { const sh = g.createRadialGradient(R * .1, R * .24, R * .55, R * .1, R * .24, R * 1.2); sh.addColorStop(0, 'rgba(0,0,0,.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(R * .1, R * .24, R * 1.2, 0, TAU); g.fill(); }
    const gr = g.createRadialGradient(-R * .38, -R * .44, R * .04, -R * .08, -R * .08, R * 1.12);
    gr.addColorStop(0, l); gr.addColorStop(.45, b); gr.addColorStop(1, d);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * .97, 0, TAU); g.fill();
    const gl = g.createRadialGradient(R * .2, R * .58, 0, R * .2, R * .58, R * .66); gl.addColorStop(0, 'rgba(255,255,255,.42)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * .96, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = R * .06; g.beginPath(); g.arc(0, 0, R * .94, 0, TAU); g.stroke();
    g.save(); g.translate(-R * .3, -R * .44); g.rotate(-.55);
    const hl = g.createLinearGradient(0, -R * .22, 0, R * .24); hl.addColorStop(0, 'rgba(255,255,255,.96)'); hl.addColorStop(1, 'rgba(255,255,255,.1)');
    g.fillStyle = hl; g.beginPath(); g.ellipse(0, 0, R * .38, R * .2, 0, 0, TAU); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-R * .64, -R * .02, R * .07, 0, TAU); g.fill();
  }
  function sym(g, i, s) {                                        // colour-blind symbols: white with a dark edge
    g.save(); g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = s * .16; g.lineJoin = 'round'; g.beginPath();
    if (i === 0) { g.moveTo(0, s * .8); g.bezierCurveTo(-s * 1.2, -s * .05, -s * .6, -s * .95, 0, -s * .38); g.bezierCurveTo(s * .6, -s * .95, s * 1.2, -s * .05, 0, s * .8); }
    else if (i === 1) g.arc(0, 0, s * .62, 0, TAU);
    else if (i === 2) { g.moveTo(0, -s * .85); g.lineTo(s * .62, 0); g.lineTo(0, s * .85); g.lineTo(-s * .62, 0); }
    else if (i === 3) { g.moveTo(0, -s * .78); g.lineTo(s * .78, s * .6); g.lineTo(-s * .78, s * .6); }
    else if (i === 4) g.rect(-s * .58, -s * .58, s * 1.16, s * 1.16);
    else { const a = s * .26, b = s * .78; g.moveTo(-a, -b); g.lineTo(a, -b); g.lineTo(a, -a); g.lineTo(b, -a); g.lineTo(b, a); g.lineTo(a, a); g.lineTo(a, b); g.lineTo(-a, b); g.lineTo(-a, a); g.lineTo(-b, a); g.lineTo(-b, -a); g.lineTo(-a, -a); }
    g.closePath(); g.stroke(); g.fill(); g.restore();
  }
  function starPath(g, R, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); }
  function goldStar(g, R) {
    const gr = g.createLinearGradient(0, -R, 0, R); gr.addColorStop(0, '#fff7b0'); gr.addColorStop(.5, '#ffd23a'); gr.addColorStop(1, '#e48a00');
    starPath(g, R, R * .46); g.fillStyle = gr; g.strokeStyle = '#fff'; g.lineWidth = R * .2; g.lineJoin = 'round'; g.stroke(); g.fill();
    g.strokeStyle = 'rgba(150,80,0,.5)'; g.lineWidth = R * .07; g.stroke();
  }
  function rainbowBall(g, R) {
    const sh = g.createRadialGradient(R * .1, R * .24, R * .55, R * .1, R * .24, R * 1.2); sh.addColorStop(0, 'rgba(0,0,0,.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(R * .1, R * .24, R * 1.2, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = PAL[[0, 5, 1, 3, 2, 4][i]].b; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * .97, -Math.PI / 2 + i * TAU / 6, -Math.PI / 2 + (i + 1) * TAU / 6 + .02); g.closePath(); g.fill(); }
    const w = g.createRadialGradient(-R * .2, -R * .25, 0, 0, 0, R); w.addColorStop(0, 'rgba(255,255,255,.85)'); w.addColorStop(.4, 'rgba(255,255,255,.25)'); w.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = w; g.beginPath(); g.arc(0, 0, R * .97, 0, TAU); g.fill();
    ball(g, R, 'rgba(0,0,0,0)', 'rgba(255,255,255,.0)', 'rgba(0,0,0,0)', false);
    g.save(); g.scale(.9, .9); starPath(g, R * .36, R * .16); g.fillStyle = '#fff'; g.fill(); g.restore();
  }
  function bombBall(g, R) {
    ball(g, R, '#3a4256', '#8f9ab3', '#0d1018');
    g.strokeStyle = '#ff5a3c'; g.lineWidth = R * .1; g.beginPath(); g.arc(0, 0, R * .62, .2, Math.PI - .2); g.stroke();
    g.fillStyle = '#5d6478'; rr(g, R * .18, -R * 1.02, R * .42, R * .3, R * .08); g.save(); g.translate(R * .39, -R * .87); g.rotate(.5); g.fillRect(-R * .2, -R * .14, R * .4, R * .28); g.restore();
    g.strokeStyle = '#a0703a'; g.lineWidth = R * .1; g.lineCap = 'round'; g.beginPath(); g.moveTo(R * .5, -R * .98); g.quadraticCurveTo(R * .7, -R * 1.25, R * .9, -R * 1.12); g.stroke();
    const sp = g.createRadialGradient(R * .92, -R * 1.12, 0, R * .92, -R * 1.12, R * .4); sp.addColorStop(0, '#fff'); sp.addColorStop(.3, '#ffe35a'); sp.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = sp; g.beginPath(); g.arc(R * .92, -R * 1.12, R * .4, 0, TAU); g.fill();
    g.save(); g.translate(R * .92, -R * 1.12); starPath(g, R * .26, R * .08); g.fillStyle = '#fff6b0'; g.fill(); g.restore();
  }
  function stoneBall(g, R, h) {
    const sh = g.createRadialGradient(R * .1, R * .24, R * .55, R * .1, R * .24, R * 1.2); sh.addColorStop(0, 'rgba(0,0,0,.38)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(R * .1, R * .24, R * 1.2, 0, TAU); g.fill();
    const rnd = srng(77); g.beginPath();
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, q = R * (.9 + rnd() * .08); g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
    g.closePath();
    const gr = g.createRadialGradient(-R * .35, -R * .4, R * .05, 0, 0, R * 1.1); gr.addColorStop(0, '#e4ded4'); gr.addColorStop(.5, '#9a9187'); gr.addColorStop(1, '#4d463f');
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(30,25,20,.5)'; g.lineWidth = R * .06; g.stroke();
    g.fillStyle = 'rgba(60,50,40,.35)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc((rnd() - .5) * R * 1.1, (rnd() - .5) * R * 1.1, R * (.05 + rnd() * .07), 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-R * .3, -R * .45, R * .3, R * .13, -.5, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(35,28,22,.75)'; g.lineWidth = R * .07; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-R * .1, -R * .85); g.lineTo(R * .05, -R * .45); g.lineTo(-R * .15, -R * .2); g.stroke();
    if (h === 1) { g.lineWidth = R * .08; g.beginPath(); g.moveTo(R * .8, -R * .2); g.lineTo(R * .3, -R * .05); g.lineTo(R * .1, R * .35); g.lineTo(-R * .35, R * .45); g.moveTo(R * .3, -R * .05); g.lineTo(R * .45, R * .55); g.moveTo(-R * .15, -R * .2); g.lineTo(-R * .6, -R * .1); g.stroke(); }
  }
  function iceShell(g, R) {
    g.fillStyle = 'rgba(215,242,255,.5)'; g.beginPath(); g.arc(0, 0, R * .97, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = R * .05; g.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .26; g.lineTo(Math.cos(a) * R * .62, Math.sin(a) * R * .62); } g.closePath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .26; g.moveTo(Math.cos(a) * R * .62, Math.sin(a) * R * .62); g.lineTo(Math.cos(a) * R * .95, Math.sin(a) * R * .95); }
    g.stroke();
    g.strokeStyle = 'rgba(240,252,255,.95)'; g.lineWidth = R * .12; g.beginPath(); g.arc(0, 0, R * .9, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.save(); g.translate(R * .45, -R * .5); starPath(g, R * .2, R * .06); g.fill(); g.restore();
  }
  function chgArrows(g, R) {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = R * .13; g.lineCap = 'round';
    for (const a0 of [-.3, Math.PI - .3]) {
      g.beginPath(); g.arc(0, 0, R * .55, a0, a0 + 2.1); g.stroke();
      const a = a0 + 2.1, x = Math.cos(a) * R * .55, y = Math.sin(a) * R * .55, tx = -Math.sin(a), ty = Math.cos(a);
      g.beginPath(); g.moveTo(x + tx * R * .26, y + ty * R * .26); g.lineTo(x - ty * R * .2 - tx * .02, y + tx * R * .2); g.lineTo(x + ty * R * .2, y - tx * R * .2); g.closePath(); g.fill();
    }
  }
  function fireBall(g, R) {
    const o = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.35); o.addColorStop(0, 'rgba(255,240,170,1)'); o.addColorStop(.35, 'rgba(255,190,40,1)'); o.addColorStop(.62, 'rgba(255,90,20,.95)'); o.addColorStop(1, 'rgba(220,30,0,0)');
    g.fillStyle = o; g.beginPath(); g.arc(0, 0, R * 1.35, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-R * .25, -R * .3, R * .25, R * .14, -.5, 0, TAU); g.fill();
  }

  /* ---------- sprite caches (cleared when the scale changes) ---------- */
  let SPR = new Map(), SPRK = 0;
  const PADU = .2;                                               // margin around a bubble (units) for its shadow and glow
  function scaleCheck(k) { if (k !== SPRK) { SPR = new Map(); SPRK = k; } }
  // e: { k, c, h } (k: kind, or 'fire' / 'bomb' / 'rain' / 'n' for a shot); sprite drawn at k px per unit; anchor at the centre
  function bubbleSprite(e, k, cb) {
    scaleCheck(k);
    const kind = e.k, id = 'b' + kind + '|' + e.c + '|' + (e.h || 0) + '|' + (cb ? 1 : 0);
    let s = SPR.get(id); if (s) return s;
    const size = Math.ceil((1 + PADU * 2) * k) + 2, cv = mkc(size, size), g = cv.getContext('2d'), R = .5 * .98;
    g.setTransform(k, 0, 0, k, size / 2, size / 2);
    const P = PAL[e.c] || PAL[0];
    if (kind === 'fire') fireBall(g, R);
    else if (kind === K_BOMB || kind === 'bomb') bombBall(g, R);
    else if (kind === K_RAIN || kind === 'rain') rainbowBall(g, R);
    else if (kind === K_STONE) stoneBall(g, R, e.h || 2);
    else {
      if (kind === K_ICE) ball(g, R, P.b, '#ffffff', P.d); else ball(g, R, P.b, P.l, P.d);
      if (kind === K_STAR) { const gl = g.createRadialGradient(0, 0, 0, 0, 0, R * .8); gl.addColorStop(0, 'rgba(255,255,220,.7)'); gl.addColorStop(1, 'rgba(255,255,220,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * .8, 0, TAU); g.fill(); goldStar(g, R * .58); }
      if (kind === K_CHG) chgArrows(g, R);
      if (cb) { if (kind === K_STAR || kind === K_CHG) { g.save(); g.translate(R * .55, R * .55); sym(g, e.c, R * .3); g.restore(); } else sym(g, e.c, R * .42); }
      if (kind === K_ICE) iceShell(g, R);
    }
    s = { cv, w: size, h: size, a: size / 2 }; SPR.set(id, s);
    return s;
  }
  function dropSprite(col, k) {                                  // a droplet for the pop spray
    scaleCheck(k); const id = 'd' + col; let s = SPR.get(id); if (s) return s;
    const size = Math.ceil(.32 * k) + 2, cv = mkc(size, size), g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, size / 2, size / 2);
    if (col === 'spark') { const gr = g.createRadialGradient(0, 0, 0, 0, 0, .15); gr.addColorStop(0, '#fff'); gr.addColorStop(.4, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .15, 0, TAU); g.fill(); }
    else if (col === 'ice') { g.fillStyle = 'rgba(225,248,255,.95)'; g.beginPath(); g.moveTo(0, -.13); g.lineTo(.08, 0); g.lineTo(0, .13); g.lineTo(-.08, 0); g.closePath(); g.fill(); }
    else if (col === 'stone') { g.fillStyle = '#8d857b'; g.beginPath(); g.moveTo(-.1, -.08); g.lineTo(.11, -.05); g.lineTo(.06, .1); g.lineTo(-.09, .07); g.closePath(); g.fill(); }
    else if (col === 'fire') { const gr = g.createRadialGradient(0, 0, 0, 0, 0, .15); gr.addColorStop(0, '#fff2a0'); gr.addColorStop(.5, 'rgba(255,140,20,.9)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .15, 0, TAU); g.fill(); }
    else { const P = PAL[col] || PAL[0]; ball(g, .11, P.b, P.l, P.d, false); }
    s = { cv, w: size, h: size, a: size / 2 }; SPR.set(id, s); return s;
  }
  function dotSprite(col, k) {                                   // aim-line dot, tinted with the colour of the shot
    scaleCheck(k); const id = 'a' + col; let s = SPR.get(id); if (s) return s;
    const size = Math.ceil(.36 * k) + 2, cv = mkc(size, size), g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, size / 2, size / 2);
    const c = PAL[col] ? PAL[col].l : col === 'fire' ? '#ffb347' : '#ffffff';
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(.012, .02, .11, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(0, 0, .1, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-.02, -.025, .055, 0, TAU); g.fill();
    s = { cv, w: size, h: size, a: size / 2 }; SPR.set(id, s); return s;
  }
  function textSprite(txt, col, sz, k) {                         // score popups: drawn once, then only moved
    scaleCheck(k); const id = 't' + txt + col + sz; let s = SPR.get(id); if (s) return s;
    const fpx = Math.max(8, sz * k), m = mkc(10, 10).getContext('2d'); m.font = `900 ${fpx}px ${FONT}`;
    const w = Math.ceil(m.measureText(txt).width + fpx * .5), h = Math.ceil(fpx * 1.45), cv = mkc(w, h), g = cv.getContext('2d');
    g.font = `900 ${fpx}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(20,10,40,.85)'; g.lineWidth = fpx * .22; g.strokeText(txt, w / 2, h / 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2);
    s = { cv, w, h, a: w / 2, b: h / 2 }; if (SPR.size > 600) SPR.clear(); SPR.set(id, s); return s;
  }

  /* ---------- the launcher: a round little bubble-blower with a brass tube ---------- */
  function drawCritter(g, ang, look, mood) {
    // tube (behind the body), pointing along the aim
    g.save(); g.translate(0, -.12); g.rotate(-ang + Math.PI / 2);
    const tg = g.createLinearGradient(-.3, 0, .3, 0); tg.addColorStop(0, '#9a6510'); tg.addColorStop(.35, '#ffe08a'); tg.addColorStop(.6, '#e0a43a'); tg.addColorStop(1, '#7a4a08');
    g.fillStyle = tg; rr(g, -.25, -1.1, .5, 1.1, .12); g.fill();
    g.fillStyle = 'rgba(80,45,0,.35)'; g.fillRect(-.25, -.84, .5, .06); g.fillRect(-.25, -.7, .5, .04);
    g.fillStyle = tg; rr(g, -.36, -1.18, .72, .24, .1); g.fill(); g.strokeStyle = 'rgba(80,45,0,.45)'; g.lineWidth = .03; g.stroke();
    g.restore();
    // body
    const sh = g.createRadialGradient(0, .98, .1, 0, .98, 1.5); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.ellipse(0, .98, 1.5, .32, 0, 0, TAU); g.fill();
    g.fillStyle = '#137485'; g.beginPath(); g.ellipse(-.5, .86, .32, .17, 0, 0, TAU); g.ellipse(.5, .86, .32, .17, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = '#1b8f9c'; g.beginPath(); g.ellipse(s * .98, .2, .22, .36, s * .5, 0, TAU); g.fill(); }
    const bg = g.createRadialGradient(-.35, -.25, .05, 0, .2, 1.15); bg.addColorStop(0, '#9af2e6'); bg.addColorStop(.45, '#33c3c0'); bg.addColorStop(1, '#0e6d7d');
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, .22, 1.02, .82, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(220,255,248,.75)'; g.beginPath(); g.ellipse(0, .55, .58, .36, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-.48, -.22, .26, .12, -.6, 0, TAU); g.fill();
    // eyes follow the aim
    const lx = Math.cos(look) * .075, ly = -Math.sin(look) * .075;
    for (const s of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * .34, .02, .21, .25, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,60,70,.35)'; g.lineWidth = .03; g.stroke();
      g.fillStyle = '#18202e'; g.beginPath(); g.arc(s * .34 + lx, .04 + ly, mood === 'wow' ? .13 : .11, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * .34 + lx - .04, ly - .02, .04, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,120,140,.5)'; g.beginPath(); g.ellipse(-.62, .3, .14, .08, 0, 0, TAU); g.ellipse(.62, .3, .14, .08, 0, 0, TAU); g.fill();
    g.strokeStyle = '#0c4a55'; g.lineWidth = .06; g.lineCap = 'round'; g.beginPath();
    if (mood === 'wow') { g.fillStyle = '#0c4a55'; g.ellipse(0, .36, .08, .1, 0, 0, TAU); g.fill(); } else { g.arc(0, .26, .16, .35, Math.PI - .35); g.stroke(); }
  }
  function dish(g) {                                             // the shell that holds the next bubble
    const gr = g.createLinearGradient(0, -.1, 0, .4); gr.addColorStop(0, '#ffe8c4'); gr.addColorStop(1, '#d99a5e');
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(.05, .42, .6, .12, 0, 0, TAU); g.fill();
    g.fillStyle = gr; g.beginPath(); g.moveTo(-.55, .12); g.quadraticCurveTo(0, .62, .55, .12); g.quadraticCurveTo(0, .28, -.55, .12); g.fill();
    g.strokeStyle = 'rgba(140,80,30,.6)'; g.lineWidth = .035; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * .1, .26); g.lineTo(i * .2, .42); } g.stroke();
  }

  /* ---------- scenery per world (drawn once per level / size into an image) ---------- */
  const WORLD_BG = [
    { top: '#2ab3e6', mid: '#0d5d99', bot: '#06305e', panel: 'rgba(4,30,60,.5)', line: '#9fe6ff' },
    { top: '#c8f0a8', mid: '#5cb768', bot: '#245f33', panel: 'rgba(16,48,24,.5)', line: '#e9ffb0' },
    { top: '#ffd6f0', mid: '#f59ad6', bot: '#9c5ad8', panel: 'rgba(80,20,90,.42)', line: '#fff0fb' },
    { top: '#ffd27a', mid: '#ff9358', bot: '#c5527a', panel: 'rgba(90,30,30,.45)', line: '#fff1c2' },
    { top: '#d9f4ff', mid: '#86c4ee', bot: '#3a6fb8', panel: 'rgba(20,50,100,.42)', line: '#ffffff' },
    { top: '#2a1a5c', mid: '#120d33', bot: '#060515', panel: 'rgba(20,10,60,.45)', line: '#c9b8ff' },
  ];
  function drawScene(g, W, H, w, F) {                            // W,H: stage px; F: field box {x, y, w, h, k}
    const T = WORLD_BG[w] || WORLD_BG[0], R = srng(11 + w * 31), k = F.k;
    const bgr = g.createLinearGradient(0, 0, 0, H); bgr.addColorStop(0, T.top); bgr.addColorStop(.55, T.mid); bgr.addColorStop(1, T.bot);
    g.fillStyle = bgr; g.fillRect(0, 0, W, H);
    const S = Math.max(W, H) / 400;                              // decoration scale
    if (w === 0) {                                               // ocean: light rays, seaweed, sand, rising bubbles, fish
      g.save(); g.globalAlpha = .08; g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const x = R() * W; g.beginPath(); g.moveTo(x - 20 * S, 0); g.lineTo(x + 20 * S, 0); g.lineTo(x + 90 * S, H); g.lineTo(x + 30 * S, H); g.fill(); } g.restore();
      g.fillStyle = '#e8c98a'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 10) g.lineTo(x, H - 26 * S - Math.sin(x / (60 * S)) * 8 * S); g.lineTo(W, H); g.fill();
      g.fillStyle = 'rgba(160,110,50,.25)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(R() * W, H - R() * 18 * S, 1.5 * S, 0, TAU); g.fill(); }
      for (let i = 0; i < 9; i++) { const x = (i < 5 ? R() * .22 : .78 + R() * .22) * W, h = (90 + R() * 160) * S; g.strokeStyle = ['#1f9a5a', '#2cb36a', '#178048'][i % 3]; g.lineWidth = (5 + R() * 5) * S; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, H); for (let t = 0; t <= 1; t += .1) g.lineTo(x + Math.sin(t * 7 + i) * 12 * S, H - t * h); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5 * S; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(R() * W, R() * H, (2 + R() * 6) * S, 0, TAU); g.stroke(); }
      g.fillStyle = 'rgba(4,40,80,.4)'; for (let i = 0; i < 5; i++) { const x = R() * W, y = H * (.15 + R() * .6), s = (8 + R() * 10) * S, d = R() < .5 ? 1 : -1; g.beginPath(); g.ellipse(x, y, s * 1.6, s * .8, 0, 0, TAU); g.moveTo(x - d * s * 1.4, y); g.lineTo(x - d * s * 2.5, y - s * .8); g.lineTo(x - d * s * 2.5, y + s * .8); g.fill(); }
    } else if (w === 1) {                                        // forest: sun, hills, pines, mushrooms, fireflies
      const sun = g.createRadialGradient(W * .82, H * .1, 0, W * .82, H * .1, 160 * S); sun.addColorStop(0, 'rgba(255,255,210,.9)'); sun.addColorStop(1, 'rgba(255,255,210,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
      [['#79c46a', .55, 30], ['#4f9e55', .7, 40], ['#2f7a3e', .85, 30]].forEach(([c, y0, a], j) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * y0 - Math.sin(x / (90 * S) + j * 2) * a * S); g.lineTo(W, H); g.fill(); });
      for (let i = 0; i < 12; i++) { const x = (i < 6 ? R() * .25 : .75 + R() * .25) * W, y = H * (.6 + R() * .35), s = (20 + R() * 26) * S; g.fillStyle = '#5a3a22'; g.fillRect(x - s * .1, y, s * .2, s * .5); g.fillStyle = ['#1e6b34', '#25803e', '#195a2c'][i % 3]; for (let t = 0; t < 3; t++) { g.beginPath(); g.moveTo(x, y - s * (1.3 - t * .35)); g.lineTo(x + s * (.45 + t * .12), y - s * (.45 - t * .3)); g.lineTo(x - s * (.45 + t * .12), y - s * (.45 - t * .3)); g.fill(); } }
      for (let i = 0; i < 5; i++) { const x = R() * W, y = H - (6 + R() * 20) * S, s = (6 + R() * 5) * S; g.fillStyle = '#f4ecd8'; g.fillRect(x - s * .25, y - s * .2, s * .5, s * .8); g.fillStyle = '#e8413c'; g.beginPath(); g.arc(x, y - s * .2, s * .75, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - s * .3, y - s * .55, s * .13, 0, TAU); g.arc(x + s * .25, y - s * .45, s * .1, 0, TAU); g.fill(); }
      for (let i = 0; i < 18; i++) { const x = R() * W, y = R() * H * .9, gl = g.createRadialGradient(x, y, 0, x, y, 7 * S); gl.addColorStop(0, 'rgba(255,255,170,.9)'); gl.addColorStop(1, 'rgba(255,255,170,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, 7 * S, 0, TAU); g.fill(); }
    } else if (w === 2) {                                        // candy: stripes, cotton clouds, lollipops, sprinkles
      g.save(); g.globalAlpha = .1; g.fillStyle = '#fff'; for (let x = -H; x < W; x += 40 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18 * S, 0); g.lineTo(x + 18 * S + H, H); g.lineTo(x + H, H); g.fill(); } g.restore();
      for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * H * .5, s = (16 + R() * 18) * S; g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); for (let j = 0; j < 5; j++) g.arc(x + (j - 2) * s * .7, y + Math.sin(j * 2) * s * .25, s * (.6 + R() * .3), 0, TAU); g.fill(); }
      for (let i = 0; i < 6; i++) { const x = (i < 3 ? .03 + R() * .17 : .8 + R() * .17) * W, y = H * (.45 + R() * .45), s = (14 + R() * 12) * S; g.fillStyle = '#fff7f0'; g.fillRect(x - s * .08, y, s * .16, s * 2.4); for (let j = 0; j < 4; j++) { g.fillStyle = ['#ff5f9e', '#ffd34d', '#7fd3ff', '#9b6bff'][(i + j) % 4]; g.beginPath(); g.arc(x, y, s * (1 - j * .22), 0, TAU); g.fill(); } g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2 * S; g.beginPath(); for (let t = 0; t < 14; t += .2) g.lineTo(x + Math.cos(t) * t / 14 * s, y + Math.sin(t) * t / 14 * s); g.stroke(); }
      for (let i = 0; i < 70; i++) { g.save(); g.translate(R() * W, R() * H); g.rotate(R() * 6); g.fillStyle = ['#ff5f9e', '#ffd34d', '#7fd3ff', '#9b6bff', '#6fe08a', '#fff'][i % 6]; rr(g, -4 * S, -1.3 * S, 8 * S, 2.6 * S, 1.3 * S); g.fill(); g.restore(); }
    } else if (w === 3) {                                        // desert at sunset: sun, far pyramids, dunes, cacti
      const sun = g.createRadialGradient(W * .5, H * .58, 0, W * .5, H * .58, 220 * S); sun.addColorStop(0, 'rgba(255,250,210,1)'); sun.addColorStop(.25, 'rgba(255,236,170,.9)'); sun.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(190,90,70,.45)'; for (const [x, s] of [[.18, 70], [.3, 45], [.78, 60]]) { g.beginPath(); g.moveTo(W * x - s * S, H * .66); g.lineTo(W * x, H * .66 - s * .8 * S); g.lineTo(W * x + s * S, H * .66); g.fill(); }
      [['#f6bd6a', .64, 18], ['#e7a04f', .76, 24], ['#cf853c', .88, 18]].forEach(([c, y0, a], j) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * y0 - Math.sin(x / (110 * S) + j * 1.7) * a * S); g.lineTo(W, H); g.fill(); });
      for (let i = 0; i < 6; i++) { const x = (i < 3 ? .04 + R() * .18 : .78 + R() * .18) * W, y = H * (.8 + R() * .15), s = (14 + R() * 12) * S; g.strokeStyle = '#3f7d45'; g.lineCap = 'round'; g.lineWidth = s * .45; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 2.2); g.moveTo(x, y - s * 1.1); g.lineTo(x - s * .7, y - s * 1.1); g.lineTo(x - s * .7, y - s * 1.7); g.moveTo(x, y - s * 1.4); g.lineTo(x + s * .6, y - s * 1.4); g.lineTo(x + s * .6, y - s * 2); g.stroke(); }
    } else if (w === 4) {                                        // ice: aurora, snowy peaks, snowflakes
      for (let j = 0; j < 3; j++) { g.fillStyle = ['rgba(120,255,190,.22)', 'rgba(190,140,255,.18)', 'rgba(120,220,255,.2)'][j]; g.beginPath(); g.moveTo(0, H * .1 + j * 30 * S); for (let x = 0; x <= W; x += 10) g.lineTo(x, H * (.12 + j * .06) + Math.sin(x / (70 * S) + j) * 26 * S); for (let x = W; x >= 0; x -= 10) g.lineTo(x, H * (.22 + j * .06) + Math.sin(x / (55 * S) + j * 2) * 30 * S); g.fill(); }
      for (let j = 0; j < 2; j++) { g.fillStyle = j ? '#f4fbff' : '#cfe6f7'; g.beginPath(); g.moveTo(0, H); let x = -40 * S; while (x < W + 60 * S) { const pw = (70 + R() * 80) * S, ph = (60 + R() * 110) * S * (j ? .7 : 1); g.lineTo(x + pw / 2, H * (j ? .9 : .82) - ph); g.lineTo(x + pw, H * (j ? .9 : .82)); x += pw * .8; } g.lineTo(W, H); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(R() * W, R() * H, (1 + R() * 2.4) * S, 0, TAU); g.fill(); }
    } else {                                                     // space: nebula, stars, a ringed planet, a moon
      for (let i = 0; i < 5; i++) { const x = R() * W, y = R() * H, r = (90 + R() * 140) * S, n = g.createRadialGradient(x, y, 0, x, y, r); n.addColorStop(0, ['rgba(150,80,255,.3)', 'rgba(60,140,255,.25)', 'rgba(255,90,180,.2)'][i % 3]); n.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = n; g.fillRect(0, 0, W, H); }
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${(.3 + R() * .7).toFixed(2)})`; g.beginPath(); g.arc(R() * W, R() * H, (.5 + R() * 1.4) * S, 0, TAU); g.fill(); }
      const px = W * .12, py = H * .78, pr = 46 * S, pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr); pg.addColorStop(0, '#ffcf8a'); pg.addColorStop(1, '#b4532a');
      g.strokeStyle = 'rgba(255,220,170,.55)'; g.lineWidth = 6 * S; g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .45, -.3, Math.PI, TAU); g.stroke(); g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill(); g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .45, -.3, 0, Math.PI); g.stroke();
      const mx = W * .88, my = H * .14, mr = 26 * S, mg = g.createRadialGradient(mx - mr * .3, my - mr * .3, 1, mx, my, mr); mg.addColorStop(0, '#f2f4ff'); mg.addColorStop(1, '#8c93b8'); g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    }
    // the play field: a glassy panel, side rails, the danger line and the launcher's stand
    g.save(); rr(g, F.x - 3, F.y - 3, F.w + 6, F.h + 6, 14 * k / 30); g.fillStyle = T.panel; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; g.stroke(); g.restore();
    const ry = F.y + DEAD * k;
    g.save(); g.setLineDash([k * .22, k * .16]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1.5, k * .06); g.beginPath(); g.moveTo(F.x + k * .15, ry); g.lineTo(F.x + F.w - k * .15, ry); g.stroke(); g.restore();
    const dz = g.createLinearGradient(0, ry, 0, F.y + F.h); dz.addColorStop(0, 'rgba(255,80,80,.12)'); dz.addColorStop(1, 'rgba(255,80,80,0)'); g.fillStyle = dz; g.fillRect(F.x, ry, F.w, F.h - (ry - F.y));
    const lx = F.x + LX * k, ly = F.y + LY * k, st = g.createRadialGradient(lx, ly + k * .9, k * .2, lx, ly + k * .9, k * 2.2); st.addColorStop(0, 'rgba(255,255,255,.28)'); st.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = st; g.beginPath(); g.ellipse(lx, ly + k * .95, k * 2.2, k * .5, 0, 0, TAU); g.fill();
  }
