  /* ---------- art: all characters, blocks and scenery are vector drawings cached as sprites ---------- */
  const TAU = Math.PI * 2;
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const grad = (g, stops) => { stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const RG = (x, x0, y0, r0, x1, y1, r1, st) => grad(x.createRadialGradient(x0, y0, r0, x1, y1, r1), st);
  const LG = (x, x0, y0, x1, y1, st) => grad(x.createLinearGradient(x0, y0, x1, y1), st);
  const ell = (x, cx, cy, rx, ry, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, Math.max(.001, rx), Math.max(.001, ry), rot, 0, TAU); };
  const rrect = (x, X, Y, w, h, r) => { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  function seeded(s) { s = s >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // soft scalloped outline for fluffy bodies
  function fluff(x, R, n, amp, rot = 0) {
    x.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = rot + i / n * TAU, a1 = rot + (i + 1) / n * TAU, am = (a0 + a1) / 2;
      if (!i) x.moveTo(Math.cos(a0) * R, Math.sin(a0) * R);
      x.quadraticCurveTo(Math.cos(am) * R * (1 + amp), Math.sin(am) * R * (1 + amp), Math.cos(a1) * R, Math.sin(a1) * R);
    }
    x.closePath();
  }
  function star(x, cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
    x.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r : R; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
    x.closePath();
  }

  /* --- de Bollen (unit: body radius 1, facing right) --- */
  const CPAL = {
    b: { a: '#fff6b8', b: '#ffd23a', c: '#e48f00', d: '#a85d00', belly: '#fff8d6', tuft: '#f0a000' },
    s: { a: '#e2f7ff', b: '#6cc8ff', c: '#2382dc', d: '#145196', belly: '#effaff', tuft: '#3fbf86' },
    f: { a: '#efffcf', b: '#93e254', c: '#3f9f2a', d: '#22661a', belly: '#f4ffe0', tuft: '#2f8a1f' },
    k: { a: '#ece8fb', b: '#a39bcc', c: '#5d5688', d: '#383257', belly: '#f1eefc', tuft: '#7c7f8a' },
    n: { a: '#ffe0f1', b: '#ff74b8', c: '#d2237c', d: '#86104a', belly: '#fff0f7', tuft: '#5a3a2a' },
  };
  const CRIT_NAMES = { b: 'Bolle', s: 'Splitter', f: 'Flits', k: 'Kei', n: 'Knal' };
  const CRIT_INFO = { b: 'Rond, stevig en altijd vrolijk', s: 'Tik: splitst in drie (goed tegen ijs)', f: 'Tik: schiet er razendsnel vandoor (goed tegen hout)', k: 'Tik: duikt loodrecht omlaag (goed tegen steen)', n: 'Tik: ontploft met een knal' };
  function drawCritter(x, t, mood) {
    const P = CPAL[t];
    x.lineJoin = x.lineCap = 'round';
    // feet
    x.fillStyle = '#ff9d3a'; x.strokeStyle = '#b8560e'; x.lineWidth = .05;
    for (const fx of [-.32, .3]) { ell(x, fx, .97, .22, .12); x.fill(); x.stroke(); }
    // tufts behind the body
    if (t === 'b') {
      x.strokeStyle = P.c; x.lineWidth = .11;
      for (const [sx, k] of [[-.18, -1], [.04, 0], [.24, 1]]) { x.beginPath(); x.moveTo(sx, -.88); x.bezierCurveTo(sx + k * .12, -1.25, sx + k * .38 + .1, -1.32, sx + k * .3 + .12, -1.1); x.stroke(); }
    } else if (t === 's') {
      for (const [a, l] of [[-.55, .55], [0, .68], [.55, .55]]) {
        x.save(); x.translate(0, -.86); x.rotate(a); ell(x, 0, -l / 2, .14, l / 2); x.fillStyle = LG(x, 0, 0, 0, -l, [[0, '#2a9a63'], [1, '#8af0b8']]); x.fill(); x.strokeStyle = '#1d6b45'; x.lineWidth = .04; x.stroke(); x.restore();
      }
    } else if (t === 'f') {
      x.beginPath(); x.moveTo(.15, -.9); x.lineTo(-.25, -1.38); x.lineTo(-.12, -1.12); x.lineTo(-.6, -1.3); x.lineTo(-.35, -.92); x.closePath();
      x.fillStyle = LG(x, 0, -.9, -.5, -1.3, [[0, P.c], [1, '#c8ff8a']]); x.fill(); x.strokeStyle = P.d; x.lineWidth = .05; x.stroke();
    } else if (t === 'n') {
      x.strokeStyle = '#6a4630'; x.lineWidth = .1; x.beginPath(); x.moveTo(.05, -.92); x.bezierCurveTo(.1, -1.2, .4, -1.15, .38, -1.42); x.stroke();
      x.strokeStyle = '#e8c28a'; x.lineWidth = .04; x.setLineDash([.06, .07]); x.stroke(); x.setLineDash([]);
    }
    // body
    x.save();
    fluff(x, 1, 16, .07, .1);
    x.fillStyle = RG(x, -.35, -.45, .05, 0, 0, 1.08, [[0, P.a], [.5, P.b], [1, P.c]]); x.fill();
    x.clip();
    ell(x, .22, .5, .62, .48); x.fillStyle = P.belly; x.globalAlpha = .85; x.fill(); x.globalAlpha = 1;
    // fur strokes
    x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = .05;
    for (const [a, r] of [[-2.4, .78], [-2.0, .86], [-1.6, .8], [-2.8, .7]]) { x.beginPath(); x.arc(0, 0, r, a, a + .3); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.12)'; ell(x, .25, .95, 1.1, .35); x.fill();
    if (t === 'k') { const rn = seeded(7); x.fillStyle = 'rgba(60,52,100,.35)'; for (let i = 0; i < 9; i++) { ell(x, rn() * 1.6 - .8, rn() * 1.2 - .7, .06 + rn() * .07, .05 + rn() * .05); x.fill(); } }
    if (t === 'n') { x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = .14; for (const o of [-.55, .05]) { x.beginPath(); x.moveTo(-1, o - .6); x.lineTo(1, o + .5); x.stroke(); } }
    x.restore();
    fluff(x, 1, 16, .07, .1); x.strokeStyle = P.d; x.lineWidth = .065; x.stroke();
    // headgear
    if (t === 'f') {
      x.strokeStyle = '#ff8a2a'; x.lineWidth = .13; x.beginPath(); x.moveTo(-.95, -.42); x.quadraticCurveTo(0, -.72, .95, -.5); x.stroke();
      for (const gx of [.18, .58]) { ell(x, gx, -.6, .2, .17); x.fillStyle = RG(x, gx - .06, -.66, .02, gx, -.6, .2, [[0, '#ffffff'], [.4, '#bfefff'], [1, '#4fb6e8']]); x.fill(); x.strokeStyle = '#7a4a1e'; x.lineWidth = .06; x.stroke(); }
    } else if (t === 'k') {
      x.beginPath(); x.moveTo(-.72, -.66); x.quadraticCurveTo(-.6, -1.08, 0, -1.1); x.quadraticCurveTo(.62, -1.08, .74, -.64); x.quadraticCurveTo(0, -.78, -.72, -.66);
      x.fillStyle = LG(x, 0, -1.1, 0, -.66, [[0, '#c9ccd4'], [1, '#7d818c']]); x.fill(); x.strokeStyle = '#4a4d57'; x.lineWidth = .05; x.stroke();
      x.strokeStyle = 'rgba(40,40,50,.45)'; x.lineWidth = .035; x.beginPath(); x.moveTo(-.2, -1.05); x.lineTo(-.1, -.88); x.lineTo(.08, -.82); x.stroke();
    }
    // face
    const big = mood === 'fly' ? 1.14 : 1;
    const eyes = [[.2, -.14], [.62, -.12]];
    if (mood === 'blink') {
      x.strokeStyle = '#3a2412'; x.lineWidth = .08; for (const [ex, ey] of eyes) { x.beginPath(); x.arc(ex, ey + .02, .16, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    } else if (mood === 'hit') {
      x.strokeStyle = '#3a2412'; x.lineWidth = .08; for (const [ex, ey] of eyes) { x.beginPath(); x.moveTo(ex - .13, ey - .12); x.lineTo(ex + .05, ey); x.lineTo(ex - .13, ey + .12); x.stroke(); }
    } else {
      for (const [ex, ey] of eyes) {
        ell(x, ex, ey, .21 * big, .27 * big); x.fillStyle = '#fff'; x.fill(); x.strokeStyle = 'rgba(80,40,10,.5)'; x.lineWidth = .035; x.stroke();
        ell(x, ex + .06, ey + .03, .13 * big, .16 * big); x.fillStyle = '#2b1a10'; x.fill();
        ell(x, ex + .01, ey - .05, .05 * big, .055 * big); x.fillStyle = '#fff'; x.fill();
        ell(x, ex + .11, ey + .1, .022, .022); x.fill();
      }
      if (t === 'k') { x.fillStyle = P.b; for (const [ex, ey] of eyes) { x.beginPath(); x.ellipse(ex, ey, .25, .3, 0, Math.PI * 1.02, Math.PI * 1.98); x.closePath(); x.fill(); } x.strokeStyle = P.d; x.lineWidth = .05; for (const [ex, ey] of eyes) { x.beginPath(); x.moveTo(ex - .22, ey - .02); x.lineTo(ex + .22, ey - .04); x.stroke(); } }
    }
    // cheeks
    x.fillStyle = t === 'n' ? 'rgba(255,240,120,.8)' : 'rgba(255,110,120,.45)';
    if (t === 'n') { star(x, -.02, .2, .12, .05); x.fill(); star(x, .86, .18, .1, .04); x.fill(); }
    else { ell(x, -.02, .2, .14, .09); x.fill(); ell(x, .86, .19, .11, .08); x.fill(); }
    // mouth
    if (mood === 'fly' || mood === 'hit') { ell(x, .44, .28, .1, mood === 'hit' ? .07 : .12); x.fillStyle = '#7a1c22'; x.fill(); ell(x, .44, .34, .06, .04); x.fillStyle = '#ff7b8a'; x.fill(); }
    else { x.strokeStyle = '#5a2a12'; x.lineWidth = .06; x.beginPath(); x.moveTo(.32, .22); x.quadraticCurveTo(.38, .3, .44, .24); x.quadraticCurveTo(.5, .3, .56, .22); x.stroke(); }
  }

  /* --- wasberen (unit: body radius 1, facing left) --- */
  function drawRaccoon(x, size, mood) {
    x.lineJoin = x.lineCap = 'round';
    // ringed tail behind
    const tp = [[.62, .55], [1.18, .52], [1.5, .05], [1.28, -.42]];
    const bz = t => { const u = 1 - t; return [0, 1].map(k => u * u * u * tp[0][k] + 3 * u * u * t * tp[1][k] + 3 * u * t * t * tp[2][k] + t * t * t * tp[3][k]); };
    for (let i = 0; i <= 14; i++) { const t = i / 14, [px, py] = bz(t), r = .27 - t * .07; ell(x, px, py, r, r); x.fillStyle = Math.floor(t * 5.99) % 2 ? '#33363d' : '#9b9fa8'; x.fill(); }
    // ears
    for (const [ex, ey, a] of [[-.5, -.8, -.35], [.36, -.86, .3]]) { ell(x, ex, ey, .27, .3, a); x.fillStyle = '#6d727c'; x.fill(); x.strokeStyle = '#3a3d44'; x.lineWidth = .05; x.stroke(); ell(x, ex, ey + .03, .14, .17, a); x.fillStyle = '#3a2f33'; x.fill(); }
    // body
    x.save(); ell(x, 0, 0, 1, 1); x.fillStyle = RG(x, -.3, -.4, .05, 0, 0, 1.05, [[0, '#d9dce2'], [.55, '#a5a9b2'], [1, '#6c717b']]); x.fill(); x.clip();
    ell(x, -.18, .52, .7, .5); x.fillStyle = '#ece8e1'; x.fill();
    x.fillStyle = 'rgba(0,0,0,.13)'; ell(x, .3, 1, 1.2, .38); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .05; for (const a of [-2.2, -1.8, -1.4]) { x.beginPath(); x.arc(0, 0, .86, a, a + .25); x.stroke(); }
    x.restore();
    ell(x, 0, 0, 1, 1); x.strokeStyle = '#4a4e57'; x.lineWidth = .06; x.stroke();
    // white brows and dark mask
    x.fillStyle = '#f7f5f0'; ell(x, -.58, -.5, .24, .13, -.15); x.fill(); ell(x, -.05, -.52, .24, .13, .15); x.fill();
    x.beginPath(); x.moveTo(-1.0, -.22); x.bezierCurveTo(-.9, -.48, -.55, -.42, -.32, -.32); x.bezierCurveTo(-.12, -.42, .25, -.46, .42, -.22); x.bezierCurveTo(.3, .02, .02, .02, -.3, -.08); x.bezierCurveTo(-.55, .02, -.9, .04, -1.0, -.22); x.closePath();
    x.fillStyle = '#2b2e35'; x.fill();
    // muzzle and nose
    ell(x, -.62, .2, .38, .27, -.1); x.fillStyle = '#f4f0ea'; x.fill();
    ell(x, -.9, .1, .12, .09); x.fillStyle = '#1d1d22'; x.fill(); ell(x, -.93, .07, .04, .025); x.fillStyle = 'rgba(255,255,255,.6)'; x.fill();
    // eyes
    const eyes = [[-.6, -.2], [-.08, -.22]];
    if (mood === 'hurt') {
      x.strokeStyle = '#fff'; x.lineWidth = .05; const [ax, ay] = eyes[0]; x.beginPath(); for (let i = 0; i < 26; i++) { const a = i * .55, r = .015 + i * .0055; x[i ? 'lineTo' : 'moveTo'](ax + Math.cos(a) * r, ay + Math.sin(a) * r); } x.stroke();
      const [bx, by] = eyes[1]; ell(x, bx, by, .13, .07); x.fillStyle = '#fff'; x.fill(); ell(x, bx - .03, by + .01, .06, .045); x.fillStyle = '#1a1210'; x.fill();
    } else if (mood === 'blink') {
      x.strokeStyle = '#e8e4dc'; x.lineWidth = .05; for (const [ex, ey] of eyes) { x.beginPath(); x.arc(ex, ey - .04, .12, Math.PI * .15, Math.PI * .85); x.stroke(); }
    } else {
      for (const [ex, ey] of eyes) { ell(x, ex, ey, .14, .16); x.fillStyle = '#fff'; x.fill(); ell(x, ex - .05, ey + .02, .08, .1); x.fillStyle = '#1a1210'; x.fill(); ell(x, ex - .07, ey - .03, .028, .03); x.fillStyle = '#fff'; x.fill(); }
      if (size === 3 || mood === 'smug') { x.strokeStyle = '#2b2e35'; x.lineWidth = .06; for (const [ex, ey] of eyes) { x.beginPath(); x.moveTo(ex - .15, ey - .1); x.lineTo(ex + .14, ey - .05); x.stroke(); } }
    }
    // mouth: a cheeky grin
    x.strokeStyle = '#3a2a2a'; x.lineWidth = .05; x.beginPath(); x.moveTo(-.86, .3); x.quadraticCurveTo(-.62, .44, -.4, .26); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(-.7, .37); x.lineTo(-.62, .37); x.lineTo(-.66, .45); x.closePath(); x.fill();
    if (mood === 'hurt') { x.fillStyle = '#e9c79a'; x.save(); x.translate(.25, -.62); x.rotate(.5); rrect(x, -.22, -.07, .44, .14, .05); x.fill(); x.rotate(-1); rrect(x, -.22, -.07, .44, .14, .05); x.fill(); x.restore(); ell(x, .35, .25, .18, .14); x.fillStyle = 'rgba(120,60,140,.35)'; x.fill(); }
    if (size >= 2) {
      // stolen picnic napkin as a scarf
      x.save(); x.beginPath(); x.moveTo(-.92, .5); x.quadraticCurveTo(-.1, .86, .9, .48); x.lineTo(.84, .7); x.quadraticCurveTo(-.1, 1.06, -.86, .7); x.closePath();
      x.fillStyle = '#e8343c'; x.fill(); x.clip();
      x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = -6; i < 8; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) x.fillRect(i * .14, .45 + j * .14, .14, .14);
      x.restore();
      x.beginPath(); x.moveTo(.55, .62); x.lineTo(.92, .95); x.lineTo(.62, .98); x.closePath(); x.fillStyle = '#c92a31'; x.fill();
    }
    if (size === 3) {
      x.beginPath(); x.moveTo(-.38, -.92); x.lineTo(-.42, -1.32); x.lineTo(-.2, -1.12); x.lineTo(0, -1.42); x.lineTo(.2, -1.12); x.lineTo(.42, -1.32); x.lineTo(.38, -.92); x.quadraticCurveTo(0, -.84, -.38, -.92); x.closePath();
      x.fillStyle = LG(x, 0, -1.4, 0, -.9, [[0, '#fff3a0'], [1, '#e0a010']]); x.fill(); x.strokeStyle = '#9a6406'; x.lineWidth = .04; x.stroke();
      for (const [gx, gy, c] of [[0, -1.0, '#e8343c'], [-.24, -1.0, '#3a8ae0'], [.24, -1.0, '#3fbf6a']]) { ell(x, gx, gy, .055, .055); x.fillStyle = c; x.fill(); }
    }
  }

  /* --- blocks: wood, ice/glass and stone, with three damage stages --- */
  const MPAL = {
    w: { hi: '#f2c48a', mid: '#d79a5a', lo: '#a8682f', edge: '#7a4a1e', grain: 'rgba(110,60,20,.35)', crack: '#4a2a10' },
    g: { hi: 'rgba(235,250,255,.95)', mid: 'rgba(150,215,245,.72)', lo: 'rgba(90,170,220,.75)', edge: 'rgba(255,255,255,.95)', grain: 'rgba(255,255,255,.6)', crack: 'rgba(255,255,255,.95)' },
    s: { hi: '#d5d8de', mid: '#a7abb3', lo: '#73777f', edge: '#4c4f56', grain: 'rgba(60,62,70,.3)', crack: '#33353b' },
    p: { hi: '#e6b56a', mid: '#c98a3c', lo: '#8f5a20', edge: '#6a3e12', grain: 'rgba(90,50,10,.4)', crack: '#4a2a10' },
  };
  function shapePath(x, o) {
    if (o.t === 'circ') { ell(x, 0, 0, o.r, o.r); return; }
    if (o.t === 'tri') { const p = KP.triPts(o); x.beginPath(); p.forEach(([a, b], i) => x[i ? 'lineTo' : 'moveTo'](a, b)); x.closePath(); return; }
    rrect(x, -o.w / 2, -o.h / 2, o.w, o.h, Math.min(.06, o.w * .2, o.h * .2));
  }
  function drawBlock(x, o, stage) {
    const P = MPAL[o.m], m = o.m;
    const bw = o.t === 'circ' ? o.r * 2 : o.w, bh = o.t === 'circ' ? o.r * 2 : o.h;
    const y0 = o.t === 'tri' ? -bh : -bh / 2, x0 = -bw / 2;
    x.lineJoin = 'round';
    x.save(); shapePath(x, o); x.clip();
    x.fillStyle = LG(x, x0, y0, x0 + bw * .4, y0 + bh, [[0, P.hi], [.45, P.mid], [1, P.lo]]); x.fillRect(x0 - 1, y0 - 1, bw + 2, bh + 2);
    const rn = seeded((bw * 1000 + bh * 77 + m.charCodeAt(0)) | 0);
    if (m === 'w' || m === 'p') {
      const long = bw >= bh;
      x.strokeStyle = P.grain; x.lineWidth = .025;
      const n = Math.max(2, Math.round((long ? bh : bw) / .09));
      for (let i = 1; i < n; i++) {
        const f = i / n; x.beginPath();
        if (long) { const yy = y0 + f * bh; x.moveTo(x0, yy); for (let k = 1; k <= 6; k++) x.lineTo(x0 + k / 6 * bw, yy + (rn() - .5) * .025); }
        else { const xx = x0 + f * bw; x.moveTo(xx, y0); for (let k = 1; k <= 6; k++) x.lineTo(xx + (rn() - .5) * .025, y0 + k / 6 * bh); }
        x.stroke();
      }
      if (o.t === 'box' && bw >= .55 && bh >= .55) {
        x.strokeStyle = P.edge; x.lineWidth = .07; x.strokeRect(x0 + .1, y0 + .1, bw - .2, bh - .2);
        x.strokeStyle = 'rgba(120,70,25,.9)'; x.lineWidth = .1; x.beginPath(); x.moveTo(x0 + .14, y0 + bh - .14); x.lineTo(x0 + bw - .14, y0 + .14); x.stroke();
        x.strokeStyle = 'rgba(255,220,170,.4)'; x.lineWidth = .025; x.beginPath(); x.moveTo(x0 + .16, y0 + bh - .2); x.lineTo(x0 + bw - .2, y0 + .16); x.stroke();
      }
      if (o.t === 'circ') { x.strokeStyle = 'rgba(110,60,20,.45)'; x.lineWidth = .03; for (let r = o.r * .25; r < o.r; r += o.r * .22) { ell(x, 0, 0, r, r); x.stroke(); } }
      if (o.t === 'box' && (bw < .55 || bh < .55)) { x.fillStyle = 'rgba(60,40,25,.75)'; const L = Math.max(bw, bh); for (const e of [-1, 1]) { const px = long ? e * (L / 2 - .1) : 0, py = long ? 0 : e * (L / 2 - .1); ell(x, px, py, .03, .03); x.fill(); } }
    } else if (m === 'g') {
      x.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 2; i++) { const s = x0 + (.15 + i * .35) * bw; x.beginPath(); x.moveTo(s, y0 + bh); x.lineTo(s + .12, y0 + bh); x.lineTo(s + .12 + bh * .7, y0); x.lineTo(s + bh * .7, y0); x.closePath(); x.globalAlpha = i ? .3 : .55; x.fill(); }
      x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < bw * bh * 30; i++) { ell(x, x0 + rn() * bw, y0 + rn() * bh, .012, .012); x.fill(); }
    } else if (m === 's') {
      x.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < bw * bh * 26; i++) { ell(x, x0 + rn() * bw, y0 + rn() * bh, .02 + rn() * .03, .015 + rn() * .02); x.fill(); }
      x.fillStyle = 'rgba(40,40,50,.14)'; for (let i = 0; i < bw * bh * 26; i++) { ell(x, x0 + rn() * bw, y0 + rn() * bh, .015 + rn() * .025, .015 + rn() * .02); x.fill(); }
      if (o.t === 'box' && bw > .7 && bh > .7) { x.strokeStyle = 'rgba(50,50,58,.35)'; x.lineWidth = .04; x.beginPath(); x.moveTo(x0, y0 + bh * .5); x.lineTo(x0 + bw, y0 + bh * .5); x.moveTo(x0 + bw * .45, y0); x.lineTo(x0 + bw * .45, y0 + bh * .5); x.moveTo(x0 + bw * .7, y0 + bh * .5); x.lineTo(x0 + bw * .7, y0 + bh); x.stroke(); }
    }
    // bevel light / shadow
    x.lineWidth = .09; x.strokeStyle = m === 'g' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.28)';
    x.beginPath(); x.moveTo(x0, y0 + bh); x.lineTo(x0, y0); x.lineTo(x0 + bw, y0); x.stroke();
    x.strokeStyle = m === 'g' ? 'rgba(40,110,170,.35)' : 'rgba(0,0,0,.22)'; x.beginPath(); x.moveTo(x0 + bw, y0); x.lineTo(x0 + bw, y0 + bh); x.lineTo(x0, y0 + bh); x.stroke();
    // cracks
    if (stage > 0) {
      x.strokeStyle = P.crack; x.lineWidth = m === 'g' ? .028 : .035;
      const cr = seeded(stage * 31 + (bw * 100 | 0));
      for (let i = 0; i < stage * 3 - 1; i++) {
        let px = x0 + cr() * bw, py = y0 + cr() * bh, a = cr() * TAU; x.beginPath(); x.moveTo(px, py);
        for (let k = 0; k < 4; k++) { a += (cr() - .5) * 1.4; const l = .08 + cr() * .16 * Math.min(1.5, Math.max(bw, bh)); px += Math.cos(a) * l; py += Math.sin(a) * l; x.lineTo(px, py); }
        x.stroke();
      }
      if (stage > 1) { x.fillStyle = m === 'g' ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.25)'; for (let i = 0; i < 3; i++) { ell(x, x0 + cr() * bw, y0 + cr() * bh, .05, .035, cr() * 3); x.fill(); } }
    }
    x.restore();
    shapePath(x, o); x.strokeStyle = P.edge; x.lineWidth = m === 'g' ? .04 : .045; x.stroke();
    if (o.t === 'prop') {
      // the picnic basket: wicker weave, a checkered cloth and a handle
      x.save(); shapePath(x, o); x.clip();
      x.strokeStyle = 'rgba(110,60,15,.6)'; x.lineWidth = .03;
      for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(x0, y0 + .12 + i * .07); x.lineTo(x0 + bw, y0 + .12 + i * .07); x.stroke(); }
      for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) { x.fillStyle = 'rgba(255,230,170,.25)'; x.fillRect(x0 + i * .085, y0 + .12 + j * .07, .085, .07); }
      x.restore();
      x.fillStyle = '#e8343c'; x.beginPath(); x.moveTo(x0 + .05, y0 + .02); x.lineTo(x0 + bw - .05, y0 + .02); x.lineTo(x0 + bw - .15, y0 + .2); x.lineTo(x0 + .2, y0 + .16); x.closePath(); x.fill();
      x.fillStyle = '#fff'; for (let i = 0; i < 6; i++) x.fillRect(x0 + .12 + i * .13, y0 + .04 + (i % 2) * .06, .06, .06);
      x.strokeStyle = '#8a5418'; x.lineWidth = .07; x.beginPath(); x.arc(0, y0 + .02, .34, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
    }
  }

  /* --- themes: sky, parallax layers, ground, terrain --- */
  const THEMES = [
    { n: 'Park', sky: ['#4fb8ff', '#a9e2ff', '#e9f8ff'], sun: '#fff4b0', far: ['#a4dc8c', '#86cc74'], mid: '#4f9e48', g1: '#69c446', g2: '#3e9a2c', e1: '#9a6a40', e2: '#6e4526', bar: '#2f6e9a' },
    { n: 'Haven', sky: ['#36a6e6', '#9ad8f2', '#ffe9c8'], sun: '#fff0c0', far: ['#2f8fd0', '#1f6fb0'], mid: '#e9cf8a', g1: '#f4dc98', g2: '#dcbc70', e1: '#e2c27a', e2: '#c39a52', bar: '#1c6a9a' },
    { n: 'Kasteel', sky: ['#3a2c74', '#a2588c', '#ffad70'], sun: '#ffd27a', far: ['#6c4f92', '#4f3a72'], mid: '#3a5a3a', g1: '#4f8f3e', g2: '#2f6a2a', e1: '#6a5444', e2: '#4a3a30', bar: '#2a2048' },
  ];
  // a horizontally tileable strip, drawn in css px (height H0 px above the ground line)
  const STRIP_W = 1200;
  function stripFar(th, q) {
    const T = THEMES[th], H0 = 320, c = cnv(STRIP_W * q, H0 * q), x = c.getContext('2d'); x.scale(q, q);
    const wave = (k, a, ph) => Math.sin(k * TAU / STRIP_W + ph) * a;
    const band = (base, parts, fill) => { x.beginPath(); x.moveTo(0, H0); for (let i = 0; i <= STRIP_W; i += 8) { let y = base; for (const [k, a, ph] of parts) y -= wave(i * k, a, ph) + a; x.lineTo(i, y); } x.lineTo(STRIP_W, H0); x.closePath(); x.fillStyle = fill; x.fill(); };
    const rn = seeded(91 + th);
    if (th === 0) {
      band(H0 - 60, [[2, 34, .3], [5, 14, 1.1]], LG(x, 0, 120, 0, H0, [[0, '#b6e6a2'], [1, '#8fcf7c']]));
      for (let i = 0; i < 26; i++) { const tx = rn() * STRIP_W, ty = H0 - 70 - rn() * 40; ell(x, tx, ty, 9, 11); x.fillStyle = 'rgba(70,140,70,.5)'; x.fill(); }
      band(H0 - 18, [[3, 22, 2.2], [7, 8, .4]], LG(x, 0, 200, 0, H0, [[0, '#8fd075'], [1, '#6bb85a']]));
    } else if (th === 1) {
      const hz = H0 - 120; x.fillStyle = LG(x, 0, hz, 0, H0, [[0, '#4aa8de'], [1, '#1f76b8']]); x.fillRect(0, hz, STRIP_W, H0 - hz);
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const wx = rn() * STRIP_W, wy = hz + 8 + rn() * (H0 - hz - 20); x.beginPath(); x.moveTo(wx, wy); x.quadraticCurveTo(wx + 8, wy - 3, wx + 16, wy); x.stroke(); }
      // lighthouse and a sailboat far away
      const lx = 820; x.fillStyle = '#5a7f9a'; x.fillRect(lx - 18, hz - 14, 36, 14);
      x.save(); x.beginPath(); x.moveTo(lx - 10, hz - 12); x.lineTo(lx + 10, hz - 12); x.lineTo(lx + 7, hz - 84); x.lineTo(lx - 7, hz - 84); x.closePath(); x.clip(); for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#fff' : '#e8463c'; x.fillRect(lx - 12, hz - 12 - (i + 1) * 12, 24, 12); } x.restore();
      x.fillStyle = '#ffe9a0'; x.fillRect(lx - 7, hz - 96, 14, 12); x.fillStyle = '#3a4a5a'; x.beginPath(); x.moveTo(lx - 10, hz - 96); x.lineTo(lx, hz - 106); x.lineTo(lx + 10, hz - 96); x.closePath(); x.fill();
      const bx = 330; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(bx, hz - 6); x.lineTo(bx, hz - 46); x.lineTo(bx + 26, hz - 8); x.closePath(); x.fill(); x.fillStyle = '#f0a040'; x.beginPath(); x.moveTo(bx - 3, hz - 4); x.lineTo(bx - 3, hz - 34); x.lineTo(bx - 20, hz - 6); x.closePath(); x.fill(); x.fillStyle = '#7a4a2a'; x.fillRect(bx - 22, hz - 5, 50, 5);
      band(H0 - 14, [[2, 18, 1.4], [6, 8, .2]], LG(x, 0, 240, 0, H0, [[0, '#f6e2a8'], [1, '#e6c880']]));
    } else {
      band(H0 - 110, [[3, 60, .5], [7, 26, 2.1], [13, 10, .9]], LG(x, 0, 60, 0, H0, [[0, '#7e64a8'], [1, '#5a4482']]));
      // castle silhouette
      x.fillStyle = '#3e2e5e'; const cx0 = 560, gy = H0 - 70;
      const tower = (tx, w, h) => { x.fillRect(tx - w / 2, gy - h, w, h); for (let k = 0; k < 3; k++) x.fillRect(tx - w / 2 + k * w / 2.5, gy - h - 8, w / 5, 8); };
      x.fillRect(cx0 - 90, gy - 60, 180, 60); tower(cx0 - 90, 30, 100); tower(cx0 + 90, 30, 100); tower(cx0, 40, 140);
      x.beginPath(); x.moveTo(cx0 - 24, gy - 140); x.lineTo(cx0, gy - 178); x.lineTo(cx0 + 24, gy - 140); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,210,120,.8)'; for (const [wx, wy] of [[-90, 70], [90, 76], [0, 100], [0, 70], [-40, 36], [40, 36]]) x.fillRect(cx0 + wx - 3, gy - wy, 6, 10);
      band(H0 - 26, [[2, 26, 2.6], [5, 10, 1.3]], LG(x, 0, 200, 0, H0, [[0, '#4a6a4a'], [1, '#33503a']]));
    }
    return c;
  }
  function stripMid(th, q) {
    const H0 = 240, c = cnv(STRIP_W * q, H0 * q), x = c.getContext('2d'); x.scale(q, q);
    const rn = seeded(17 + th * 5);
    const wrapDraw = (px, fn) => { for (const o of [-STRIP_W, 0, STRIP_W]) { x.save(); x.translate(px + o, 0); fn(); x.restore(); } };
    if (th === 0) {
      for (let i = 0; i < 9; i++) {
        const px = i * STRIP_W / 9 + rn() * 60, s = .5 + rn() * .4, kind = rn();
        wrapDraw(px, () => {
          x.translate(0, H0); x.scale(s, s);
          if (kind < .7) {
            x.fillStyle = '#7a5232'; x.fillRect(-6, -70, 12, 70);
            for (const [bx, by, r, c] of [[-22, -84, 30, '#3f8f3c'], [20, -88, 32, '#3f8f3c'], [0, -112, 36, '#4aa346'], [-6, -100, 26, '#5cb655']]) { ell(x, bx, by, r, r * .92); x.fillStyle = c; x.fill(); }
            ell(x, -10, -122, 14, 10); x.fillStyle = 'rgba(255,255,255,.18)'; x.fill();
          } else { for (const [bx, r] of [[-18, 18], [0, 24], [20, 17]]) { ell(x, bx, -r * .7, r, r * .8); x.fillStyle = '#4a9a42'; x.fill(); } x.fillStyle = '#ff6f8a'; for (let k = 0; k < 5; k++) { ell(x, -20 + k * 10, -14 - (k % 2) * 10, 3, 3); x.fill(); } }
        });
      }
    } else if (th === 1) {
      const cols = ['#e8463c', '#3a8ae0', '#3fbf6a', '#ffb03a', '#a060d0'];
      for (let i = 0; i < 6; i++) {
        const px = 80 + i * 190 + rn() * 30, col = cols[i % 5];
        wrapDraw(px, () => {
          x.translate(0, H0 - 10);
          x.fillStyle = '#e9cf8a'; ell(x, 0, 6, 60, 18); x.fill();
          x.fillStyle = '#fff'; x.fillRect(-22, -46, 44, 46); x.fillStyle = col; for (let k = 0; k < 4; k++) x.fillRect(-22 + k * 11, -46, 5.5, 46);
          x.fillStyle = '#5a3a2a'; x.beginPath(); x.moveTo(-28, -44); x.lineTo(0, -66); x.lineTo(28, -44); x.closePath(); x.fill();
          x.fillStyle = '#6a4a30'; x.fillRect(-7, -24, 14, 24);
        });
      }
      x.strokeStyle = '#8aa848'; x.lineWidth = 2;
      for (let i = 0; i < 70; i++) { const gx = rn() * STRIP_W, h = 10 + rn() * 18; x.beginPath(); x.moveTo(gx, H0); x.quadraticCurveTo(gx + 2, H0 - h * .6, gx + (rn() - .5) * 12, H0 - h); x.stroke(); }
    } else {
      x.fillStyle = '#3c5a3c'; x.beginPath(); x.moveTo(0, H0); for (let i = 0; i <= STRIP_W; i += 10) x.lineTo(i, H0 - 34 - Math.sin(i * TAU * 3 / STRIP_W) * 12); x.lineTo(STRIP_W, H0); x.fill();
      for (let i = 0; i < 4; i++) {
        const px = 150 + i * 300;
        wrapDraw(px, () => {
          x.translate(0, H0 - 30);
          x.fillStyle = '#5a4a68'; x.fillRect(-70, -60, 140, 60); for (let k = 0; k < 7; k++) x.fillRect(-70 + k * 22, -72, 12, 12);
          x.fillStyle = '#665478'; x.fillRect(-90, -100, 36, 100); for (let k = 0; k < 3; k++) x.fillRect(-90 + k * 13, -112, 9, 12);
          x.strokeStyle = 'rgba(40,30,50,.35)'; x.lineWidth = 1.5; for (let r = 0; r < 6; r++) { x.beginPath(); x.moveTo(-70, -10 - r * 10); x.lineTo(70, -10 - r * 10); x.stroke(); }
          x.fillStyle = '#3a2a3a'; x.beginPath(); x.moveTo(-14, 0); x.lineTo(-14, -26); x.arc(0, -26, 14, Math.PI, 0); x.lineTo(14, 0); x.fill();
          x.strokeStyle = '#5a4a3a'; x.lineWidth = 3; x.beginPath(); x.moveTo(-72, -112); x.lineTo(-72, -150); x.stroke();
          x.fillStyle = i % 2 ? '#e8463c' : '#ffc23a'; x.beginPath(); x.moveTo(-72, -150); x.lineTo(-44, -142); x.lineTo(-72, -132); x.closePath(); x.fill();
        });
      }
    }
    return c;
  }
  function cloudSprite(q, seed, tint) {
    const c = cnv(220 * q, 100 * q), x = c.getContext('2d'); x.scale(q, q); const rn = seeded(seed);
    x.fillStyle = tint;
    const blobs = [[60, 64, 34], [100, 50, 42], [146, 60, 34], [178, 70, 24], [36, 74, 22]];
    for (const [bx, by, r] of blobs) { ell(x, bx + rn() * 6, by, r, r * .86); x.fill(); }
    x.fillRect(36, 70, 150, 22);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(120,150,190,.18)'; x.fillRect(0, 74, 220, 30);
    return c;
  }
  // ground tile: 4 m wide, 8 m deep (earth layers below), in sprite resolution px per metre
  function groundTile(th, R) {
    const T = THEMES[th], w = 4, d = 8, c = cnv(w * R, d * R), x = c.getContext('2d'); x.scale(R, R);
    const rn = seeded(5 + th);
    x.fillStyle = LG(x, 0, 0, 0, d, [[0, T.e1], [.35, T.e2], [1, 'rgba(30,20,15,1)']]); x.fillRect(0, 0, w, d);
    for (let i = 0; i < 9; i++) { const px = rn() * w, py = 1.2 + rn() * (d - 1.6), rx = .12 + rn() * .2; ell(x, px, py, rx, rx * .7, rn()); x.fillStyle = 'rgba(0,0,0,.18)'; x.fill(); ell(x, px - rx * .2, py - rx * .2, rx * .6, rx * .35, rn()); x.fillStyle = 'rgba(255,255,255,.08)'; x.fill(); }
    for (let i = 0; i < 150; i++) { const px = rn() * w, py = .3 + rn() * (d - .3); ell(x, px, py, .03 + rn() * .06, .02 + rn() * .04); x.fillStyle = rn() < .5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.14)'; x.fill(); }
    if (th === 1) {
      x.strokeStyle = 'rgba(160,120,60,.35)'; x.lineWidth = .02; for (let i = 0; i < 9; i++) { const py = .3 + i * .3; x.beginPath(); x.moveTo(0, py); for (let k = 0; k <= 16; k++) x.lineTo(k / 16 * w, py + Math.sin(k * 1.3 + i) * .03); x.stroke(); }
      for (let i = 0; i < 6; i++) { const px = .3 + rn() * 3.4, py = .25 + rn() * .6; x.fillStyle = '#fff1e0'; x.beginPath(); x.arc(px, py, .06, Math.PI, 0); x.fill(); x.strokeStyle = 'rgba(200,140,110,.6)'; x.lineWidth = .01; x.stroke(); }
      x.fillStyle = LG(x, 0, 0, 0, .14, [[0, '#fff2c4'], [1, T.g1]]); x.fillRect(0, 0, w, .14);
    } else {
      if (th === 2) { x.strokeStyle = 'rgba(30,20,15,.35)'; x.lineWidth = .025; for (let r = 0; r < 19; r++) for (let k = 0; k < 9; k++) { rrect(x, k * .5 + (r % 2) * .25 - .25 + .02, .32 + r * .42, .46, .38, .08); x.stroke(); } }
      x.fillStyle = LG(x, 0, 0, 0, .3, [[0, T.g1], [1, T.g2]]); x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, .22);
      for (let k = 40; k >= 0; k--) x.lineTo(k / 40 * w, .22 + (k % 2 ? .07 : 0) + Math.sin(k) * .02); x.closePath(); x.fill();
      x.strokeStyle = T.g2; x.lineWidth = .025; for (let i = 0; i < 60; i++) { const px = rn() * w; x.beginPath(); x.moveTo(px, .04); x.lineTo(px + (rn() - .5) * .08, -.08 - rn() * .1); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 0, w, .03);
    }
    return c;
  }
  function drawTerrain(x, o, th) {
    const T = THEMES[th];
    x.save();
    if (o.t === 'ter') rrect(x, -o.w / 2, -o.h / 2, o.w, o.h, .08); else { x.beginPath(); o.pts.forEach(([a, b], i) => x[i ? 'lineTo' : 'moveTo'](a, b)); x.closePath(); }
    const top = o.t === 'ter' ? -o.h / 2 : -o.h, bot = o.t === 'ter' ? o.h / 2 : 0, w = o.w;
    x.clip();
    if (th === 1 && o.t === 'ter') {
      // wooden pier
      x.fillStyle = LG(x, 0, top, 0, bot, [[0, '#c48a52'], [1, '#7a4e2a']]); x.fillRect(-w / 2, top, w, bot - top);
      x.strokeStyle = 'rgba(60,30,10,.5)'; x.lineWidth = .04; for (let px = -w / 2; px < w / 2; px += .55) { x.beginPath(); x.moveTo(px, top); x.lineTo(px, bot); x.stroke(); }
      x.fillStyle = 'rgba(255,230,180,.3)'; x.fillRect(-w / 2, top, w, .08);
    } else if (th === 2) {
      x.fillStyle = LG(x, 0, top, 0, bot, [[0, '#9a9098'], [1, '#5e5660']]); x.fillRect(-w / 2, top, w, bot - top);
      x.strokeStyle = 'rgba(30,25,35,.45)'; x.lineWidth = .035;
      for (let r = 0, yy = top + .1; yy < bot; r++, yy += .42) for (let px = -w / 2 - (r % 2) * .35; px < w / 2; px += .7) { rrect(x, px + .02, yy + .02, .66, .38, .06); x.stroke(); }
      x.fillStyle = '#4f8f3e'; x.fillRect(-w / 2, top, w, .12); x.fillStyle = '#3e7a30'; for (let px = -w / 2; px < w / 2; px += .18) { ell(x, px, top + .12, .1, .07); x.fill(); }
    } else {
      x.fillStyle = LG(x, 0, top, 0, bot, [[0, T.e1], [1, T.e2]]); x.fillRect(-w / 2, top, w, bot - top);
      const rn = seeded(w * 10 | 0); for (let i = 0; i < w * (bot - top) * 14; i++) { ell(x, (rn() - .5) * w, top + rn() * (bot - top), .03 + rn() * .05, .02 + rn() * .03); x.fillStyle = rn() < .5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)'; x.fill(); }
    }
    x.restore();
    if (th !== 2 && !(th === 1 && o.t === 'ter')) {
      // grass (or dune grass) along the top edges
      x.strokeStyle = T.g2; x.lineWidth = th === 1 ? .16 : .22; x.lineJoin = 'round';
      x.beginPath(); if (o.t === 'ter') { x.moveTo(-w / 2, top + .05); x.lineTo(w / 2, top + .05); } else { const p = o.pts; x.moveTo(p[0][0], p[0][1]); for (let i = 3; i >= 1; i--) x.lineTo(...p[i]); x.lineTo(p[1][0], p[1][1]); }
      x.strokeStyle = T.g1; x.stroke();
    }
  }

  /* --- slingshot (world units, base at the origin) --- */
  function drawSlingBack(x) {
    x.lineCap = x.lineJoin = 'round';
    const wood = LG(x, -.2, 0, .2, 0, [[0, '#8a5a2e'], [.5, '#c48a4e'], [1, '#6a4020']]);
    x.strokeStyle = '#4a2c12'; x.lineWidth = .36; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -1.7); x.quadraticCurveTo(-.05, -2.2, -.3, -2.78); x.stroke();
    x.strokeStyle = wood; x.lineWidth = .26; x.stroke();
    x.strokeStyle = 'rgba(60,30,10,.45)'; x.lineWidth = .03; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-.1, -.2 - i * .26); x.lineTo(.08, -.3 - i * .26); x.stroke(); }
    // binding
    x.fillStyle = '#5a2e1a'; x.fillRect(-.16, -1.62, .32, .14);
  }
  function drawSlingFront(x) {
    x.lineCap = x.lineJoin = 'round';
    x.strokeStyle = '#4a2c12'; x.lineWidth = .34; x.beginPath(); x.moveTo(0, -1.62); x.quadraticCurveTo(.08, -2.2, .3, -2.74); x.stroke();
    x.strokeStyle = LG(x, -.1, 0, .4, 0, [[0, '#9a6634'], [.6, '#d49a5a'], [1, '#7a4a22']]); x.lineWidth = .24; x.stroke();
    x.fillStyle = '#5a2e1a'; x.save(); x.translate(.27, -2.62); x.rotate(.35); x.fillRect(-.14, -.06, .28, .12); x.restore();
  }
  const TIPB = { x: -.3, y: -2.72 }, TIPF = { x: .3, y: -2.68 };

  function drawBlanket(x) {
    x.save(); x.transform(1, 0, -.6, .28, 0, 0);
    rrect(x, -1.6, -1.2, 3.2, 1.2, .08); x.fillStyle = '#e8343c'; x.fill(); x.clip();
    x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) x.fillRect(-1.6 + i * .27, -1.2 + j * .25, .27, .25);
    x.restore();
  }
