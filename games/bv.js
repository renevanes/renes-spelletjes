/* ================================================================
   BLOKVAL – falling blocks: 7-bag, hold, 3 next, ghost, rotation
   with wall kicks, lock delay, three modes, gestures or on-screen
   buttons, glossy canvas graphics and a saved game
   ================================================================ */
const Blokval = (() => {
  const COLS = 10, ROWS = 20, HID = 2, TR = ROWS + HID;
  const MODES = {
    klassiek: { name: 'Klassiek', desc: 'Eindeloos: elke 10 regels gaat het sneller' },
    sprint: { name: '40 regels', desc: 'Wis zo snel mogelijk 40 regels' },
    ultra: { name: '2 minuten', desc: 'Zoveel mogelijk punten in 2 minuten' },
  };
  const SPRINT = 40, ULTRA = 120, LOCK = .5, MAXRESET = 15, DAS = .17, ARR = .05, SOFT = 26, CD = .45;
  const D = { mode: 'klassiek', ctl: 'gebaren', ghost: true, start: 1, sound: true };
  const opt = Object.assign({}, D, store.get('bv.settings', {}));
  const saveOpt = () => store.set('bv.settings', opt);
  let stats = Object.assign({ played: 0, lines: 0, quads: 0, spins: 0, maxLevel: 0, pieces: 0, best: {} }, store.get('bv.stats', {}));
  const saveStats = () => store.set('bv.stats', stats);
  Sfx.gate('bv', () => opt.sound);
  const lastSnd = {};
  const sfx = (n, pan) => { if (!opt.sound) return; const t = performance.now(); if (t - (lastSnd[n] || 0) < 30) return; lastSnd[n] = t; Sfx.play(n, 0, pan || 0); };

  /* ---------- pieces: 1 I, 2 O, 3 T, 4 S, 5 Z, 6 J, 7 L (own palette) ---------- */
  const SHAPES = { 1: [[0, 1], [1, 1], [2, 1], [3, 1]], 2: [[1, 0], [2, 0], [1, 1], [2, 1]], 3: [[1, 0], [0, 1], [1, 1], [2, 1]], 4: [[1, 0], [2, 0], [0, 1], [1, 1]], 5: [[0, 0], [1, 0], [1, 1], [2, 1]], 6: [[0, 0], [0, 1], [1, 1], [2, 1]], 7: [[2, 0], [0, 1], [1, 1], [2, 1]] };
  const BOX = t => t <= 2 ? 4 : 3;
  const CELLS = {};
  for (let t = 1; t <= 7; t++) { CELLS[t] = [SHAPES[t]]; for (let r = 1; r < 4; r++) CELLS[t].push(t === 2 ? SHAPES[t] : CELLS[t][r - 1].map(([x, y]) => [BOX(t) - 1 - y, x])); }
  // wall kicks (x right, y up), keyed "from to"
  const KJ = { '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] };
  const KI = { '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] };
  const COL = [null, '#ff5577', '#4cb8ff', '#36d6a8', '#ffb43c', '#9d7cff', '#9bd84a', '#ec5fd8', '#6d7090'];

  /* ---------- state ---------- */
  let S = null;
  let acc = 0, lockT = 0, resets = 0, lowest = 0, lastRot = false, lastKick = 0, clearing = null, countdown = 0, overT = -1;
  let parts = [], pops = [], flashes = [], trails = [], shake = 0, rowOff = new Float32Array(TR), lvlFlash = 0, wasPaused = true, pausedAt = 0, saveT = 0, clock = 0, spawnId = 0;
  const inp = { L: false, R: false, D: false }; let hDir = 0, hT = 0, hR = 0, softHeld = false;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const refill = () => { while (S.queue.length < 7) S.queue.push(...shuffle([1, 2, 3, 4, 5, 6, 7])); };
  const at = (x, y) => (x < 0 || x >= COLS || y >= TR) ? 9 : y < 0 ? 0 : S.grid[y * COLS + x];
  const fits = (t, r, x, y) => CELLS[t][r].every(([cx, cy]) => !at(x + cx, y + cy));
  const gravity = L => Math.pow(.8 - (Math.min(L, 20) - 1) * .007, Math.min(L, 20) - 1);     // seconds per row
  const grounded = () => { const p = S.cur; return !fits(p.t, p.r, p.x, p.y + 1); };
  const isPaused = () => current !== 'bv' || anyModal() || document.hidden;
  const canAct = () => S && !S.over && S.cur && !clearing && countdown <= 0 && !isPaused();
  const pan = () => S && S.cur ? (S.cur.x + 1.5 - COLS / 2) / COLS * .7 : 0;

  function newGame(mode) {
    closeModals();
    mode = MODES[mode] ? mode : 'klassiek'; opt.mode = mode; saveOpt();
    const start = mode === 'klassiek' ? opt.start : 1;
    S = { mode, grid: new Array(TR * COLS).fill(0), queue: [], hold: 0, holdUsed: false, cur: null, score: 0, lines: 0, level: start, start, time: 0, combo: -1, b2b: false, over: false, won: false, q4: 0, pieces: 0, started: true };
    refill(); resetRuntime(); spawn();
    countdown = CD * 3; stats.played++; saveStats(); save(); layout();
  }
  function resetRuntime() {
    acc = 0; lockT = 0; resets = 0; lowest = 0; lastRot = false; clearing = null; overT = -1; parts = []; pops = []; flashes = []; trails = []; shake = 0; rowOff = new Float32Array(TR);
    hDir = 0; inp.L = inp.R = inp.D = false; softHeld = false; G = null;
  }
  function spawn(t) {
    if (!t) { t = S.queue.shift(); refill(); }
    const p = { t, r: 0, x: 3, y: 0 };
    S.cur = p; acc = 0; lockT = 0; resets = 0; lastRot = false; spawnId++;
    if (!fits(t, 0, 3, 0)) return topOut();
    if (fits(t, 0, 3, 1)) p.y = 1;
    lowest = p.y;
  }
  function onMoved() {
    const p = S.cur;
    if (p.y > lowest) { lowest = p.y; resets = 0; }
    if ((grounded() || lockT > 0) && resets < MAXRESET) { lockT = 0; resets++; }
  }
  function move(dx) {
    if (!canAct()) return false;
    const p = S.cur; if (!fits(p.t, p.r, p.x + dx, p.y)) return false;
    p.x += dx; lastRot = false; onMoved(); sfx('bvMove', pan()); return true;
  }
  function rotate(dir) {
    if (!canAct()) return false;
    const p = S.cur;
    if (p.t === 2) { sfx('bvRotate', pan()); return true; }
    const nr = (p.r + dir + 4) % 4, K = (p.t === 1 ? KI : KJ)['' + p.r + nr];
    for (let i = 0; i < K.length; i++) {
      const [kx, ky] = K[i];
      if (fits(p.t, nr, p.x + kx, p.y - ky)) { p.x += kx; p.y -= ky; p.r = nr; lastRot = true; lastKick = i; onMoved(); sfx('bvRotate', pan()); return true; }
    }
    return false;
  }
  function softStep() {
    if (!canAct() || grounded()) return false;
    const p = S.cur; p.y++; S.score++; acc = 0; lockT = 0; lastRot = false; if (p.y > lowest) { lowest = p.y; resets = 0; }
    return true;
  }
  function hardDrop() {
    if (!canAct()) return;
    const p = S.cur, y0 = p.y; let n = 0;
    while (fits(p.t, p.r, p.x, p.y + 1)) { p.y++; n++; }
    if (n) lastRot = false;
    S.score += 2 * n; trails.push({ t: p.t, r: p.r, x: p.x, y0, y1: p.y, life: .28 });
    shake = Math.max(shake, .1 + Math.min(n, 18) * .006); sfx('bvHard', pan()); vibrate(12);
    for (const [cx, cy] of CELLS[p.t][p.r]) if (!CELLS[p.t][p.r].some(([ox, oy]) => ox === cx && oy === cy + 1)) for (let k = 0; k < 3; k++) parts.push({ x: p.x + cx + Math.random(), y: p.y + cy + 1, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, life: .35 + Math.random() * .25, max: .6, col: '#ffffff', s: .07 + Math.random() * .05 });
    lock();
  }
  function hold() {
    if (!canAct() || S.holdUsed) return false;
    const t = S.cur.t; S.holdUsed = true; sfx('bvHold');
    if (S.hold) { const h = S.hold; S.hold = t; spawn(h); } else { S.hold = t; spawn(); }
    return true;
  }

  /* ---------- locking, lines, scoring ---------- */
  const BASE = [0, 100, 300, 500, 800], TSP = [400, 800, 1200, 1600, 1600], TSM = [100, 200, 400, 400, 400], PCB = [0, 800, 1200, 1800, 2000];
  const LBL = ['', 'Enkel', 'Dubbel', 'Driedubbel', 'VIERDUBBEL!'];
  function lock() {
    const p = S.cur, cells = CELLS[p.t][p.r].map(([cx, cy]) => [p.x + cx, p.y + cy]);
    let spin = 0;
    if (p.t === 3 && lastRot) {
      const C = [[0, 0], [2, 0], [2, 2], [0, 2]].map(([cx, cy]) => !!at(p.x + cx, p.y + cy));
      if (C.filter(Boolean).length >= 3) { const F = [[0, 1], [1, 2], [2, 3], [3, 0]][p.r]; spin = (C[F[0]] && C[F[1]]) || lastKick === 4 ? 2 : 1; }
    }
    let above = true;
    for (const [x, y] of cells) { S.grid[y * COLS + x] = p.t; if (y >= HID) above = false; }
    flashes.push({ cells, life: .2 });
    S.cur = null; S.holdUsed = false; S.pieces++; stats.pieces++;
    if (above) return topOut();
    const full = [];
    for (let y = 0; y < TR; y++) { let f = true; for (let x = 0; x < COLS; x++) if (!S.grid[y * COLS + x]) { f = false; break; } if (f) full.push(y); }
    award(full, spin);
    if (full.length) { clearing = { rows: full, t: 0, dur: full.length === 4 ? .42 : .3 }; burst(full); }
    else { sfx('bvLock', (cells[0][0] + 1 - COLS / 2) / COLS * .7); spawn(); }
    save();
  }
  function award(full, spin) {
    const n = full.length, L = S.level, hard = n === 4 || (spin && n > 0);
    let pts = spin === 2 ? TSP[n] : spin === 1 ? TSM[n] : BASE[n], b2b = false, pc = false;
    if (n) {
      if (hard && S.b2b) { pts = Math.round(pts * 1.5); b2b = true; }
      S.b2b = hard; S.combo++;
      if (S.combo > 0) pts += 50 * S.combo;
      pc = S.grid.every((v, i) => !v || full.includes(Math.floor(i / COLS)));
      if (pc) pts += PCB[n];
    } else S.combo = -1;
    S.score += pts * L;
    if (spin) stats.spins++;
    const cy = Math.max(4, Math.min(12.5, n ? (full[0] + full[n - 1]) / 2 - HID - 1 : 9));
    let title = spin === 2 ? 'T-draai' + (n ? ' ' + LBL[n].toLowerCase().replace('!', '') : '') : spin === 1 ? 'Mini T-draai' : LBL[n];
    let oy = 0; const big = n === 4 || spin === 2;
    if (title) { pops.push({ txt: title, sub: pts ? '+' + num(pts * L) : '', y: cy, life: 1.3, max: 1.3, big, col: n === 4 ? '#ffd45e' : spin ? '#c9a2ff' : '#ffffff' }); oy = big ? 2.3 : 1.7; }
    if (b2b) { pops.push({ txt: 'Nog eens! ×1,5', y: cy + oy, life: 1.3, max: 1.3, col: '#7fe3ff' }); oy += 1.1; }
    if (S.combo > 0) pops.push({ txt: `Combo ${S.combo}`, y: cy + oy, life: 1.1, max: 1.1, col: '#9bf07a' });
    if (pc) pops.push({ txt: 'LEEG VELD!', y: Math.max(2, cy - 3.6), life: 1.8, max: 1.8, big: true, col: '#ff9de6' });
    if (n === 4) { sfx('bvQuad'); vibrate(40); shake = Math.max(shake, .35); S.q4++; stats.quads++; }
    else if (spin && n) sfx('bvSpin'); else if (n) sfx('bvLine' + n); else if (spin) sfx('bvSpin');
    if (n) {
      S.lines += n; stats.lines += n;
      const nl = S.start + Math.floor(S.lines / 10);
      if (nl > S.level) { S.level = nl; lvlFlash = 1; pops.push({ txt: `Niveau ${nl}`, y: cy - 1.8, life: 1.6, max: 1.6, col: '#ffb43c', big: true }); setTimeout(() => sfx('bvLevel'), 260); }
      stats.maxLevel = Math.max(stats.maxLevel || 0, S.level);
    }
  }
  function burst(rows) {
    for (const y of rows) for (let x = 0; x < COLS; x++) {
      const c = COL[S.grid[y * COLS + x]] || '#fff', cx = x + .5, cy = y - HID + .5;
      for (let k = 0; k < (rows.length === 4 ? 4 : 3); k++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * (rows.length === 4 ? 9 : 6); parts.push({ x: cx, y: cy, vx: Math.cos(a) * v + (x - 4.5) * .5, vy: Math.sin(a) * v - 3, life: .5 + Math.random() * .6, max: 1.1, col: c, s: .1 + Math.random() * .12, sq: true }); }
      if (Math.random() < .5) parts.push({ x: cx, y: cy, vx: (Math.random() - .5) * 8, vy: -2 - Math.random() * 6, life: .6 + Math.random() * .4, max: 1, col: '#ffffff', s: .05 + Math.random() * .05 });
    }
  }
  function finishClear() {
    const rows = clearing.rows; clearing = null;
    const keep = []; for (let y = 0; y < TR; y++) if (!rows.includes(y)) keep.push(y);
    const ng = new Array(TR * COLS).fill(0), off = new Float32Array(TR);
    let ty = TR - 1;
    for (let i = keep.length - 1; i >= 0; i--, ty--) { const sy = keep[i]; for (let x = 0; x < COLS; x++) ng[ty * COLS + x] = S.grid[sy * COLS + x]; off[ty] = ty - sy; }
    S.grid = ng; rowOff = off;
    if (S.mode === 'sprint' && S.lines >= SPRINT) return finish();
    spawn(); save();
  }
  function topOut() {
    if (S.over) return;
    S.over = true; S.won = false; overT = 0; clearing = null; sfx('bvOver'); vibrate(60); endStats();
  }
  function finish() {
    if (S.over) return;
    S.over = true; S.won = true; overT = 0; S.cur = null; sfx('pfWin'); vibrate(30); endStats();
    for (let i = 0; i < 90; i++) parts.push({ x: Math.random() * COLS, y: -1 - Math.random() * 3, vx: (Math.random() - .5) * 4, vy: Math.random() * 6, life: 1.5 + Math.random(), max: 2.5, col: COL[1 + Math.floor(Math.random() * 7)], s: .12 + Math.random() * .1, sq: true, spin: Math.random() * 10 });
  }
  function endStats() {
    store.del('bv.save');
    const b = stats.best, m = S.mode;
    S.newBest = false;
    if (m === 'sprint') { if (S.won && (b.sprint == null || S.time < b.sprint)) { b.sprint = Math.round(S.time * 100) / 100; S.newBest = true; } }
    else if (S.score > 0 && S.score > (b[m] || 0)) { b[m] = S.score; S.newBest = true; }
    stats.maxLevel = Math.max(stats.maxLevel || 0, S.level);
    saveStats();
  }
  const save = () => { if (S && !S.over) { store.set('bv.save', S); saveStats(); } };

  /* ---------- main loop ---------- */
  function update(dt) {
    clock += dt;
    animate(dt);
    if (!S) return;
    if (isPaused()) { if (!wasPaused) { wasPaused = true; pausedAt = performance.now(); save(); } return; }
    if (wasPaused) { wasPaused = false; if (!S.over && countdown <= 0 && performance.now() - pausedAt > 300) countdown = CD * 3; }
    if (S.over) {
      if (overT >= 0) { overT += dt; if (overT > (S.won ? 1.2 : 1.5) && !S.endShown) { S.endShown = true; showEnd(); } }
      return;
    }
    if (countdown > 0) {
      const b = Math.ceil(countdown / CD); countdown -= dt; const a = Math.ceil(countdown / CD);
      if (a !== b) sfx(a > 0 ? 'bvCount' : 'bvGo');
      return;
    }
    S.time += dt;
    if (S.mode === 'ultra' && S.time >= ULTRA) { S.time = ULTRA; pops.push({ txt: 'TIJD!', y: 8, life: 1.6, max: 1.6, big: true, col: '#ffd45e' }); return finish(); }
    if (clearing) { clearing.t += dt; if (clearing.t >= clearing.dur) finishClear(); return; }
    if (!S.cur) { spawn(); if (S.over) return; }
    if (hDir) { hT += dt; if (hT >= DAS) { hR += dt; while (hR >= ARR) { hR -= ARR; if (!move(hDir)) { hR = 0; break; } } } }
    if (!S.cur) return;
    const p = S.cur, soft = softHeld || inp.D, rate = soft ? Math.max(1 / gravity(S.level), SOFT) : 1 / gravity(S.level);
    if (!grounded()) {
      acc += dt * rate;
      while (acc >= 1 && !grounded()) { acc -= 1; p.y++; if (soft) S.score++; lockT = 0; if (p.y > lowest) { lowest = p.y; resets = 0; } }
      if (grounded()) acc = 0;
    } else {
      acc = 0; lockT += dt;
      if (lockT >= LOCK || (resets >= MAXRESET && lockT >= LOCK * .5)) lock();
    }
    saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  }
  function animate(dt) {
    for (const q of parts) { q.life -= dt; q.vy += 26 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * .8; }
    parts = parts.filter(q => q.life > 0);
    for (const q of pops) q.life -= dt; pops = pops.filter(q => q.life > 0);
    for (const q of flashes) q.life -= dt; flashes = flashes.filter(q => q.life > 0);
    for (const q of trails) q.life -= dt; trails = trails.filter(q => q.life > 0);
    for (let y = 0; y < TR; y++) if (rowOff[y] > 0) rowOff[y] = Math.max(0, rowOff[y] - dt * (12 + rowOff[y] * 14));
    shake = Math.max(0, shake - dt * 1.4); lvlFlash = Math.max(0, lvlFlash - dt * 1.2);
    for (const b of bokeh) { b.y -= b.v * dt; b.x += Math.sin(clock * .3 + b.ph) * 4 * dt; if (b.y < -b.r) { b.y = H + b.r; b.x = Math.random() * W; } }
    for (const f of deco) { f.y += f.v * dt; f.a += f.va * dt; if (f.y > H + f.s) { f.y = -f.s; f.x = Math.random() * W; } }
  }

  /* ---------- graphics ---------- */
  const wrap = $('#bvWrap'), cv = $('#bvCanvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, c = 20, bx = 0, by = 0, land = false, holdR = null, nextR = null, statR = null, m = 10, raf = 0, running = false, lastT = 0;
  let bgCv = null, boardCv = null; const SP = new Map();
  let bokeh = [], deco = [];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (h, w, k) => { const a = hex(h), b = hex(w); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };
  const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function blockSprite(k, s) {
    const key = 'b' + k + ':' + s; if (SP.has(key)) return SP.get(key);
    const o = document.createElement('canvas'); o.width = o.height = s; const g = o.getContext('2d'), col = COL[k];
    const r = s * .17, e = Math.max(1, s * .035), b = s * .15;
    rr(g, e * .5, e * .5, s - e, s - e, r);
    let gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, mix(col, '#ffffff', .35)); gr.addColorStop(.55, col); gr.addColorStop(1, mix(col, '#000000', .38)); g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    // bevel: light top/left, dark bottom/right
    g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.lineTo(s - b, b); g.lineTo(b, b); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(b, b); g.lineTo(b, s - b); g.lineTo(0, s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.moveTo(0, s); g.lineTo(b, s - b); g.lineTo(s - b, s - b); g.lineTo(s, s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.moveTo(s, 0); g.lineTo(s, s); g.lineTo(s - b, s - b); g.lineTo(s - b, b); g.closePath(); g.fill();
    g.restore();
    // inner face
    rr(g, b, b, s - 2 * b, s - 2 * b, r * .55);
    gr = g.createLinearGradient(0, b, 0, s - b); gr.addColorStop(0, mix(col, '#ffffff', .22)); gr.addColorStop(1, mix(col, '#000000', .1)); g.fillStyle = gr; g.fill();
    // gloss
    g.save(); rr(g, b, b, s - 2 * b, s - 2 * b, r * .55); g.clip();
    gr = g.createLinearGradient(0, b, 0, s * .55); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr;
    g.beginPath(); g.ellipse(s * .5, b, s * .48, s * .32, 0, 0, Math.PI * 2); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(s * .27, s * .27, Math.max(.8, s * .045), 0, 7); g.fill();
    rr(g, e * .5, e * .5, s - e, s - e, r); g.lineWidth = e; g.strokeStyle = 'rgba(10,6,30,.45)'; g.stroke();
    SP.set(key, o); return o;
  }
  function ghostSprite(k, s) {
    const key = 'g' + k + ':' + s; if (SP.has(key)) return SP.get(key);
    const o = document.createElement('canvas'); o.width = o.height = s; const g = o.getContext('2d'), col = COL[k], e = Math.max(1.5, s * .06);
    rr(g, e, e, s - 2 * e, s - 2 * e, s * .16); g.fillStyle = rgba(col, .16); g.fill(); g.lineWidth = e; g.strokeStyle = rgba(col, .75); g.stroke();
    rr(g, s * .3, s * .3, s * .4, s * .4, s * .08); g.fillStyle = rgba(col, .18); g.fill();
    SP.set(key, o); return o;
  }
  function glowSprite(k) {
    const key = 'w' + k; if (SP.has(key)) return SP.get(key);
    const o = document.createElement('canvas'); o.width = o.height = 64; const g = o.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, rgba(COL[k] || '#ffffff', 1)); gr.addColorStop(1, rgba(COL[k] || '#ffffff', 0)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    SP.set(key, o); return o;
  }
  function layout() {
    dpr = Math.min(2.5, window.devicePixelRatio || 1); W = wrap.clientWidth; H = wrap.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    land = W > H * 1.05; wrap.classList.toggle('land', land);
    const btns = opt.ctl === 'knoppen', pad = $('#bvPad');
    const snap = v => Math.round(v * dpr) / dpr;
    if (!land) {
      const padH = btns ? pad.offsetHeight + 4 : 0, availH = H - padH - 14;
      let c0 = Math.min((W - 20) / 10, (availH - 100) / 20), stripH = Math.max(76, Math.min(104, c0 * 2.5));
      c = Math.floor(Math.min((W - 20) / 10, (availH - stripH - 12) / 20) * dpr) / dpr;
      m = Math.max(9, Math.min(15, stripH / 5.6, c * .4));
      const total = stripH + 12 + 20 * c, top = 8 + Math.max(0, (availH - total) / 3);
      bx = snap((W - 10 * c) / 2); by = snap(top + stripH + 12);
      const sw = Math.min(W - 16, Math.max(10 * c + 28, 400)), x0 = (W - sw) / 2, x1 = x0 + sw, hw = Math.max(76, m * 4.9), nw = Math.max(136, m * 4.3 + m * .6 * 4 * 2 + 24);
      holdR = { x: x0, y: top, w: hw, h: stripH };
      nextR = { x: x1 - nw, y: top, w: nw, h: stripH };
      statR = { x: x0 + hw + 8, y: top, w: (x1 - nw - 8) - (x0 + hw + 8), h: stripH };
    } else {
      const padW = btns ? 158 : 0;
      let c0 = (H - 16) / 20; const sideW = Math.max(118, Math.min(170, c0 * 4.6));
      c = Math.floor(Math.min(c0, (W - 2 * padW - 2 * sideW - 40) / 10) * dpr) / dpr;
      m = Math.max(10, Math.min(18, c * .6, (sideW - 24) / 4.6));
      bx = snap((W - 10 * c) / 2); by = snap((H - 20 * c) / 2 + 1);
      const sw = Math.min(sideW, bx - padW - 16);
      holdR = { x: bx - 14 - sw, y: by, w: sw, h: m * 4.2 + 22 };
      statR = { x: bx - 14 - sw, y: by + holdR.h + 10, w: sw, h: Math.min(20 * c - holdR.h - 10, 176) };
      nextR = { x: bx + 10 * c + 14, y: by, w: sw, h: m * 3 * 3.3 + 30 };
    }
    SP.clear(); paintStatic();
    bokeh = Array.from({ length: 12 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: 30 + Math.random() * 80, v: 4 + Math.random() * 10, k: 1 + (i % 7), a: .05 + Math.random() * .09, ph: Math.random() * 6 }));
    deco = Array.from({ length: 7 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 30 + Math.random() * 60, v: 6 + Math.random() * 10, a: Math.random() * 6, va: (Math.random() - .5) * .3 }));
  }
  function paintStatic() {
    bgCv = document.createElement('canvas'); bgCv.width = cv.width; bgCv.height = cv.height;
    let g = bgCv.getContext('2d');
    const gr = g.createRadialGradient(bgCv.width * .5, bgCv.height * .18, 0, bgCv.width * .5, bgCv.height * .4, Math.max(bgCv.width, bgCv.height) * .9);
    gr.addColorStop(0, '#2e2378'); gr.addColorStop(.45, '#151140'); gr.addColorStop(1, '#07061a'); g.fillStyle = gr; g.fillRect(0, 0, bgCv.width, bgCv.height);
    // board panel
    const pw = 10 * c, ph = 20 * c, p = 5;
    boardCv = document.createElement('canvas'); boardCv.width = Math.ceil((pw + 2 * p + 40) * dpr); boardCv.height = Math.ceil((ph + 2 * p + 40) * dpr);
    g = boardCv.getContext('2d'); g.scale(dpr, dpr); g.translate(20, 20);
    g.save(); g.shadowColor = 'rgba(120,90,255,.55)'; g.shadowBlur = 22; rr(g, -p, -p, pw + 2 * p, ph + 2 * p, 12); g.fillStyle = '#0c0a24'; g.fill(); g.restore();
    rr(g, -p, -p, pw + 2 * p, ph + 2 * p, 12);
    let fg = g.createLinearGradient(0, -p, 0, ph + p); fg.addColorStop(0, '#120f33'); fg.addColorStop(1, '#0a0820'); g.fillStyle = fg; g.fill();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.028)' : 'rgba(255,255,255,.018)'; rr(g, x * c + 1, y * c + 1, c - 2, c - 2, c * .14); g.fill(); }
    rr(g, -p, -p, pw + 2 * p, ph + 2 * p, 12); fg = g.createLinearGradient(0, -p, pw, ph); fg.addColorStop(0, '#8f7bff'); fg.addColorStop(.5, '#5a7dff'); fg.addColorStop(1, '#ff5d9e');
    g.lineWidth = 2; g.strokeStyle = fg; g.stroke();
    rr(g, -p + 3, -p + 3, pw + 2 * p - 6, ph + 2 * p - 6, 9); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.07)'; g.stroke();
  }
  const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const fmtMs = t => `${fmt(t)},${String(Math.floor((t % 1) * 100)).padStart(2, '0')}`;
  function drawPiece(t, r, x, y, s, alpha, ghost, k) {     // x, y in CSS px of the top-left of the piece box
    const sp = ghost ? ghostSprite(t, Math.round(s * dpr)) : blockSprite(k || t, Math.round(s * dpr));
    ctx.globalAlpha = alpha;
    for (const [cx, cy] of CELLS[t][r]) ctx.drawImage(sp, x + cx * s, y + cy * s, s, s);
    ctx.globalAlpha = 1;
  }
  function drawMini(t, cx, cy, s, alpha, k) {
    const cl = CELLS[t][0], xs = cl.map(q => q[0]), ys = cl.map(q => q[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
    drawPiece(t, 0, Math.round((cx - w * s / 2 - Math.min(...xs) * s) * dpr) / dpr, Math.round((cy - h * s / 2 - Math.min(...ys) * s) * dpr) / dpr, s, alpha, false, k);
  }
  function panel(R, label) {
    ctx.save(); rr(ctx, R.x, R.y, R.w, R.h, 12);
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, 'rgba(255,255,255,.085)'); g.addColorStop(1, 'rgba(255,255,255,.035)'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.stroke();
    if (label) { ctx.fillStyle = '#a69ff0'; ctx.font = `800 ${Math.max(9, Math.min(11, R.w / 8))}px system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(label, R.x + 10, R.y + 8); }
    ctx.restore();
  }
  function hudItems() {
    if (!S) return { pri: { l: 'SCORE', v: '0' }, items: [] };
    const lvl = { l: 'NIVEAU', v: String(S.level) };
    if (S.mode === 'sprint') return { pri: { l: 'TIJD', v: fmtMs(S.time).slice(0, -1) }, items: [{ l: 'REGELS', v: `${Math.min(S.lines, SPRINT)}/${SPRINT}` }, lvl, { l: 'SCORE', v: num(S.score) }] };
    if (S.mode === 'ultra') return { pri: { l: 'SCORE', v: num(S.score) }, items: [{ l: 'NOG', v: fmt(Math.ceil(ULTRA - S.time)) }, { l: 'REGELS', v: String(S.lines) }, lvl] };
    return { pri: { l: 'SCORE', v: num(S.score) }, items: [lvl, { l: 'REGELS', v: String(S.lines) }, { l: 'TIJD', v: fmt(S.time) }] };
  }
  function drawHud() {
    panel(holdR, 'BEWAAR');
    if (S && S.hold) drawMini(S.hold, holdR.x + holdR.w / 2, holdR.y + 14 + (holdR.h - 14) / 2, m, S.holdUsed ? .55 : 1, S.holdUsed ? 8 : 0);
    panel(nextR, 'VOLGENDE');
    if (S) {
      if (!land) {
        const s2 = m * .6, x0 = nextR.x + (nextR.w - (m * 4.3 + 16 + s2 * 8)) / 2, cy = nextR.y + 14 + (nextR.h - 14) / 2;
        drawMini(S.queue[0], x0 + m * 2.2, cy, m, 1);
        drawMini(S.queue[1], x0 + m * 4.3 + 8 + s2 * 2, cy + m * .2, s2, .85);
        drawMini(S.queue[2], x0 + m * 4.3 + 16 + s2 * 6, cy + m * .2, s2, .65);
      } else {
        const cx = nextR.x + nextR.w / 2; let y = nextR.y + 26;
        [[m, 1], [m * .8, .8], [m * .8, .6]].forEach(([s, a], i) => { drawMini(S.queue[i], cx, y + s * 1.5, s, a); y += s * 3.1 + 4; });
      }
    }
    panel(statR, null);
    const { pri, items } = hudItems(), R = statR;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (!land) {
      const cx = R.x + R.w / 2, big = Math.max(18, Math.min(30, R.w / 6.2, R.h * .28));
      ctx.fillStyle = '#a69ff0'; ctx.font = '800 10px system-ui,sans-serif'; ctx.fillText(pri.l, cx, R.y + 17);
      ctx.fillStyle = '#ffffff'; ctx.font = `800 ${big}px system-ui,sans-serif`; ctx.fillText(pri.v, cx, R.y + 17 + big * 1.02);
      const iw = R.w / items.length, yl = R.y + R.h - 25;
      items.forEach((it, i) => { const x = R.x + iw * (i + .5); ctx.fillStyle = '#8f88d6'; ctx.font = `800 ${Math.min(9, iw / 6.4)}px system-ui,sans-serif`; ctx.fillText(it.l, x, yl); ctx.fillStyle = '#efeaff'; ctx.font = `700 ${Math.min(15, iw / 3.4)}px system-ui,sans-serif`; ctx.fillText(it.v, x, yl + 16); });
    } else {
      const cx = R.x + R.w / 2;
      ctx.fillStyle = '#a69ff0'; ctx.font = '800 10px system-ui,sans-serif'; ctx.fillText(pri.l, cx, R.y + 18);
      ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.min(26, R.w / 6)}px system-ui,sans-serif`; ctx.fillText(pri.v, cx, R.y + 44);
      const rowH = Math.min(34, (R.h - 58) / items.length);
      items.forEach((it, i) => { const y = R.y + 58 + rowH * i + rowH * .65; ctx.textAlign = 'left'; ctx.fillStyle = '#8f88d6'; ctx.font = '800 10px system-ui,sans-serif'; ctx.fillText(it.l, R.x + 12, y); ctx.textAlign = 'right'; ctx.fillStyle = '#efeaff'; ctx.font = '700 15px system-ui,sans-serif'; ctx.fillText(it.v, R.x + R.w - 12, y); });
      ctx.textAlign = 'center';
    }
  }
  function draw() {
    if (!bgCv || !W) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgCv, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // drifting light and faint falling squares
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bokeh) { ctx.globalAlpha = b.a * (.75 + .25 * Math.sin(clock * .7 + b.ph)); ctx.drawImage(glowSprite(b.k), b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.045)';
    for (const f of deco) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); rr(ctx, -f.s / 2, -f.s / 2, f.s, f.s, f.s * .18); ctx.stroke(); rr(ctx, -f.s * .3, -f.s * .3, f.s * .6, f.s * .6, f.s * .1); ctx.stroke(); ctx.restore(); }
    const sx = shake > 0 ? (Math.random() - .5) * shake * 14 : 0, sy = shake > 0 ? (Math.random() - .3) * shake * 14 : 0;
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(boardCv, bx - 20, by - 20, boardCv.width / dpr, boardCv.height / dpr);
    if (!S) { ctx.restore(); drawHud(); return; }
    // danger: stack close to the top
    let top = TR; for (let i = 0; i < S.grid.length; i++) if (S.grid[i]) { top = Math.floor(i / COLS); break; }
    if (top < HID + 5 && !S.over) {
      const k = (.55 + .45 * Math.sin(clock * 6)) * (1 - (top - HID) / 5);
      const g = ctx.createLinearGradient(0, by, 0, by + c * 6); g.addColorStop(0, `rgba(255,60,90,${.32 * k})`); g.addColorStop(1, 'rgba(255,60,90,0)'); ctx.fillStyle = g; ctx.fillRect(bx, by, 10 * c, c * 6);
      rr(ctx, bx - 5, by - 5, 10 * c + 10, 20 * c + 10, 12); ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,70,100,${.7 * k})`; ctx.stroke();
    }
    if (lvlFlash > 0) { rr(ctx, bx - 5, by - 5, 10 * c + 10, 20 * c + 10, 12); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,190,80,${lvlFlash})`; ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.rect(bx - 2, by - 2, 10 * c + 4, 20 * c + 4); ctx.clip();
    // locked blocks (grey wave from the bottom on game over)
    const grey = S.over && !S.won ? Math.floor(Math.min(1, overT / 1.1) * (TR + 1)) : 0, cs = Math.round(c * dpr);
    const clr = clearing ? new Set(clearing.rows) : null;
    for (let y = HID; y < TR; y++) {
      const yy = by + (y - HID - rowOff[y]) * c;
      for (let x = 0; x < COLS; x++) { const v = S.grid[y * COLS + x]; if (!v) continue; ctx.drawImage(blockSprite(TR - y <= grey ? 8 : v, cs), bx + x * c, Math.round(yy * dpr) / dpr, c, c); }
    }
    // active piece: guide, ghost, glow, piece
    const p = S.cur;
    if (p && !S.over && !clearing) {
      let gy = p.y; while (fits(p.t, p.r, p.x, gy + 1)) gy++;
      const xs = CELLS[p.t][p.r].map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      const ty = by + (p.y - HID) * c, gyy = by + (gy - HID) * c;
      const gg = ctx.createLinearGradient(0, ty, 0, gyy + c * 2); gg.addColorStop(0, rgba(COL[p.t], 0)); gg.addColorStop(1, rgba(COL[p.t], .1));
      ctx.fillStyle = gg; ctx.fillRect(bx + (p.x + x0) * c, ty, (x1 - x0 + 1) * c, gyy - ty + c * 2);
      if (opt.ghost && gy > p.y) drawPiece(p.t, p.r, bx + p.x * c, gyy, c, 1, true);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .28;
      for (const [cx, cy] of CELLS[p.t][p.r]) if (p.y + cy >= HID - 1) ctx.drawImage(glowSprite(p.t), bx + (p.x + cx - .6) * c, by + (p.y + cy - HID - .6) * c, c * 2.2, c * 2.2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const sp = blockSprite(p.t, cs);
      for (const [cx, cy] of CELLS[p.t][p.r]) if (p.y + cy >= HID) ctx.drawImage(sp, bx + (p.x + cx) * c, by + (p.y + cy - HID) * c, c, c);
      if (lockT > 0) { ctx.globalAlpha = Math.min(.35, lockT / LOCK * .35); ctx.fillStyle = '#000'; for (const [cx, cy] of CELLS[p.t][p.r]) if (p.y + cy >= HID) ctx.fillRect(bx + (p.x + cx) * c, by + (p.y + cy - HID) * c, c, c); ctx.globalAlpha = 1; }
    }
    // hard-drop trails
    ctx.globalCompositeOperation = 'lighter';
    for (const tr of trails) {
      const k = tr.life / .28, cl = CELLS[tr.t][tr.r], cols = {};
      for (const [cx, cy] of cl) cols[cx] = Math.min(cols[cx] ?? 9, cy);
      for (const cx in cols) {
        const x = bx + (tr.x + +cx) * c, y0 = by + (tr.y0 + cols[cx] - HID) * c, y1 = by + (tr.y1 + cols[cx] - HID) * c;
        if (y1 <= y0) continue;
        const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(COL[tr.t], 0)); g.addColorStop(1, rgba(COL[tr.t], .45 * k));
        ctx.fillStyle = g; ctx.fillRect(x + c * .12, Math.max(by, y0), c * .76, y1 - Math.max(by, y0));
      }
    }
    // lock flash
    for (const f of flashes) { ctx.globalAlpha = f.life / .2 * .55; ctx.fillStyle = '#fff'; for (const [x, y] of f.cells) if (y >= HID) { rr(ctx, bx + x * c + 1, by + (y - HID) * c + 1, c - 2, c - 2, c * .16); ctx.fill(); } }
    ctx.globalAlpha = 1;
    // line clear: flash white, then collapse into a bright line
    if (clearing) {
      const q = clearing.t / clearing.dur;
      for (const y of clearing.rows) {
        const yy = by + (y - HID) * c + c / 2;
        if (q < .4) { ctx.globalAlpha = q / .4 * .9; ctx.fillStyle = '#fff'; ctx.fillRect(bx, yy - c / 2, 10 * c, c); }
        else { const k = (q - .4) / .6, h = c * (1 - k) + 2; ctx.globalAlpha = 1 - k * .7; ctx.fillStyle = '#fff'; ctx.fillRect(bx - k * c * 2, yy - h / 2, 10 * c + k * c * 4, h); }
        ctx.globalAlpha = (1 - q) * .6; const g = ctx.createRadialGradient(bx + 5 * c, yy, 0, bx + 5 * c, yy, 7 * c); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 2 * c, yy - 2 * c, 14 * c, 4 * c);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();          // board clip
    // particles (may fly outside the board)
    for (const q of parts) {
      ctx.globalAlpha = Math.min(1, q.life / q.max * 1.6); ctx.fillStyle = q.col;
      const x = bx + q.x * c, y = by + q.y * c, s = q.s * c;
      if (q.sq) { ctx.save(); ctx.translate(x, y); ctx.rotate((q.spin || 3) * q.life); ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore(); } else { ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // popups
    for (const q of pops) {
      const age = q.max - q.life, k = Math.min(1, age / .12), fade = Math.min(1, q.life / .35);
      const size = (q.big ? Math.min(c * 1.25, 40) : Math.min(c * .8, 24)) * (1.25 - .25 * k);
      const x = bx + 5 * c, y = by + (q.y - age * .8) * c;
      ctx.globalAlpha = fade; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${size}px system-ui,sans-serif`;
      ctx.lineWidth = Math.max(3, size * .16); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(20,10,50,.85)'; ctx.strokeText(q.txt, x, y);
      ctx.save(); ctx.shadowColor = q.col; ctx.shadowBlur = 14; ctx.fillStyle = q.col; ctx.fillText(q.txt, x, y); ctx.restore();
      if (q.sub) { ctx.font = `800 ${size * .55}px system-ui,sans-serif`; ctx.lineWidth = 3; ctx.strokeText(q.sub, x, y + size * .9); ctx.fillStyle = '#fff'; ctx.fillText(q.sub, x, y + size * .9); }
    }
    ctx.globalAlpha = 1;
    // countdown
    if (countdown > 0 && !isPaused()) {
      const n = Math.ceil(countdown / CD), f = (countdown % CD) / CD, size = c * 3.2 * (1 + f * .35);
      ctx.fillStyle = 'rgba(8,6,24,.45)'; ctx.fillRect(bx, by, 10 * c, 20 * c);
      ctx.globalAlpha = Math.min(1, f * 2.5 + .2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${size}px system-ui,sans-serif`;
      ctx.save(); ctx.shadowColor = '#8f7bff'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff'; ctx.fillText(n, bx + 5 * c, by + 10 * c); ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.restore();          // shake
    drawHud();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (document.hidden) return;
    update(dt); draw(); hudTop();
  }

  /* ---------- UI ---------- */
  let topKey = '';
  function hudTop() {
    const md = S ? S.mode : opt.mode, b = stats.best[md];
    const txt = md === 'sprint' ? (b != null ? 'Record ' + fmtMs(b) : 'Nog geen record') : (b ? 'Record ' + num(b) : 'Nog geen record');
    const key = md + txt; if (key === topKey) return; topKey = key;
    $('#bvMode').textContent = MODES[md].name; $('#bvBest').textContent = txt;
  }
  const bestTxt = k => k === 'sprint' ? (stats.best.sprint != null ? '⏱ ' + fmtMs(stats.best.sprint) : '–') : (stats.best[k] ? '🏆 ' + num(stats.best[k]) : '–');
  function optHtml(full) {
    const rows = [['ctl', 'Bediening', [['gebaren', 'Gebaren'], ['knoppen', 'Knoppen']]], ['ghost', 'Schaduwblok (waar hij landt)', [[true, 'Aan'], [false, 'Uit']]]];
    if (full) rows.push(['start', 'Startniveau bij Klassiek', [[1, '1'], [5, '5'], [10, '10']]]);
    rows.push(['sound', 'Geluid en muziek', [[true, 'Aan'], [false, 'Uit']]]);
    return rows.map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  }
  function renderStart() {
    $('#bvModes').innerHTML = Object.entries(MODES).map(([k, M]) => `<button data-mode="${k}" class="${opt.mode === k ? 'on' : ''}"><b>${M.name}</b><small>${M.desc}</small><span>${bestTxt(k)}</span></button>`).join('');
    $('#bvHelp').innerHTML = opt.ctl === 'knoppen'
      ? '<span>◀ ▶ schuiven</span><span>▼ sneller</span><span>↺ ↻ draaien</span><span>⤓ laten vallen</span><span>⇄ bewaren</span>'
      : '<span>👆 tik: draaien</span><span>↔ veeg: schuiven</span><span>↓ veeg: sneller</span><span>⚡ snel omlaag: laten vallen</span><span>↑ veeg: bewaren</span>';
    $('#bvOptList').innerHTML = optHtml(true);
    $('#bvStats').innerHTML = [['Gespeeld', stats.played], ['Regels', num(stats.lines)], ['Vierdubbel', stats.quads]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    const can = !!(S && !S.over);
    $('#bvResume').hidden = !can; $('#bvResume').classList.toggle('primary', can); $('#bvGo').classList.toggle('primary', !can);
  }
  function pause() {
    if (!S || S.over || anyModal()) return;
    $('#bvPauseInfo').innerHTML = `${MODES[S.mode].name} · score <b>${num(S.score)}</b> · ${S.lines} ${S.lines === 1 ? 'regel' : 'regels'} · ${S.mode === 'ultra' ? 'nog ' + fmt(Math.ceil(ULTRA - S.time)) : fmt(S.time)}`;
    $('#bvPauseOpts').innerHTML = optHtml(false);
    save(); openModal('bvPauseModal');
  }
  function showEnd() {
    const md = S.mode; let title, emoji, txt;
    if (md === 'sprint' && S.won) { title = '40 regels gehaald!'; emoji = '🏁'; txt = `Tijd <b>${fmtMs(S.time)}</b>${S.newBest ? ' · 🎉 nieuw record' : ''}`; }
    else if (md === 'sprint') { title = 'Vastgelopen!'; emoji = '🧱'; txt = `${S.lines} van de ${SPRINT} regels in ${fmt(S.time)}`; }
    else { title = md === 'ultra' && S.won ? 'De tijd is om!' : 'Spel voorbij'; emoji = md === 'ultra' && S.won ? '⏱️' : '🧱'; txt = `Score <b>${num(S.score)}</b>${S.newBest ? ' · 🎉 nieuw record' : ''}`; }
    txt += `<br><small>Niveau ${S.level} · ${S.lines} ${S.lines === 1 ? 'regel' : 'regels'}${S.q4 ? ` · ${S.q4}× vierdubbel` : ''}${md !== 'sprint' ? ' · ' + fmt(S.time) : ''}</small>`;
    $('#bvEndEmoji').textContent = emoji; $('#bvEndTitle').textContent = title; $('#bvEndText').innerHTML = txt;
    openModal('bvEndModal');
  }
  function applyCtl() { $('#bv').classList.toggle('btns', opt.ctl === 'knoppen'); }
  function onOpt(e) {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); applyCtl(); layout();
    if (b.closest('#bvPauseOpts')) $('#bvPauseOpts').innerHTML = optHtml(false); else renderStart();
  }
  $('#bvOptList').addEventListener('click', onOpt);
  $('#bvPauseOpts').addEventListener('click', onOpt);
  $('#bvModes').addEventListener('click', e => { const b = e.target.closest('button[data-mode]'); if (!b) return; opt.mode = b.dataset.mode; saveOpt(); renderStart(); });
  $('#bvGo').addEventListener('click', () => newGame(opt.mode));
  $('#bvResume').addEventListener('click', () => closeModals());
  $('#bvStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#bvEndNew').addEventListener('click', () => newGame(S ? S.mode : opt.mode));
  $('#bvEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('bvStartModal'); });
  $('#bvPauseGo').addEventListener('click', () => closeModals());
  $('#bvPauseRestart').addEventListener('click', () => newGame(S ? S.mode : opt.mode));
  $('#bvPauseMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('bvStartModal'); });
  $('#bvBack').addEventListener('click', () => leave());
  $('#bvPause').addEventListener('click', () => pause());
  $('#bvMenu').addEventListener('click', () => { save(); renderStart(); openModal('bvStartModal'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'bv' && S && !S.over && !anyModal()) pause(); });
  // Android back while playing: pause first; back again on the pause dialog leaves the game
  const prevBack = window.appBack;
  window.appBack = () => {
    if (current === 'bv' && !document.querySelector('.overlay.show')) {
      if ($('#bvPauseModal').classList.contains('show')) { closeModals(); leave(); return true; }
      if (!anyModal() && S && !S.over) { pause(); return true; }
      if (!anyModal()) { leave(); return true; }
    }
    return prevBack();
  };

  /* ---------- input: buttons ---------- */
  function press(a) {
    if (a === 'L' || a === 'R') { inp[a] = true; hDir = a === 'L' ? -1 : 1; hT = 0; hR = 0; move(hDir); }
    else if (a === 'D') { inp.D = true; }
    else if (a === 'CW') rotate(1); else if (a === 'CCW') rotate(-1); else if (a === 'X') hardDrop(); else if (a === 'H') hold();
  }
  function release(a) {
    if (a === 'L' || a === 'R') { inp[a] = false; hDir = inp.L && !inp.R ? -1 : inp.R && !inp.L ? 1 : 0; hT = 0; hR = 0; }
    else if (a === 'D') inp.D = false;
  }
  const padEl = $('#bvPad'), padHeld = new Map();
  padEl.addEventListener('pointerdown', e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (_) {}
    padHeld.set(e.pointerId, b); b.classList.add('on'); vibrate(6); press(b.dataset.a);
  });
  const padUp = e => { const b = padHeld.get(e.pointerId); if (!b) return; padHeld.delete(e.pointerId); b.classList.remove('on'); release(b.dataset.a); };
  padEl.addEventListener('pointerup', padUp); padEl.addEventListener('pointercancel', padUp);
  padEl.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- input: gestures on the playing field ---------- */
  let G = null;
  const inR = (R, x, y) => R && x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h;
  cv.addEventListener('pointerdown', e => {
    if (!S || S.over) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (G && G.id !== e.pointerId) { if (!G.moved) { rotate(-1); G.cancel = true; } return; }   // second finger: rotate the other way
    if (inR(holdR, x, y)) { hold(); return; }
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    G = { id: e.pointerId, x0: x, y0: y, ax: x, ay: y, t0: performance.now(), moved: false, axis: null, spawn: spawnId, holdDone: false, cancel: false, hist: [[x, y, performance.now()]] };
  });
  cv.addEventListener('pointermove', e => {
    if (!G || e.pointerId !== G.id || G.cancel) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    G.hist.push([x, y, now]); while (G.hist.length > 2 && now - G.hist[0][2] > 120) G.hist.shift();
    if (G.spawn !== spawnId) { G.ax = x; G.ay = y; return; }           // new piece: don't carry the old drag over
    const tx = x - G.x0, ty = y - G.y0;
    if (!G.axis && Math.hypot(tx, ty) > 12) G.axis = Math.abs(tx) > Math.abs(ty) ? 'h' : 'v';
    if (!G.axis) return;
    const step = Math.max(16, c * .85);
    let dx = x - G.ax;
    if (G.axis === 'h' || Math.abs(dx) > step * 1.5) {
      while (dx >= step) { move(1); G.ax += step; dx -= step; G.moved = true; }
      while (dx <= -step) { move(-1); G.ax -= step; dx += step; G.moved = true; }
    }
    if (G.axis === 'v') {
      if (!G.holdDone && ty < -Math.max(44, c * 1.6) && -ty > Math.abs(tx) * 1.3) { G.holdDone = true; G.moved = true; hold(); G.ay = y; return; }
      const dy = y - G.ay;
      if (dy >= c * .9) { const n = Math.floor(dy / (c * .9)); for (let i = 0; i < n; i++) softStep(); G.ay += n * c * .9; G.moved = true; }
    }
  });
  const gEnd = e => {
    if (!G || e.pointerId !== G.id) return;
    const g = G; G = null;
    if (g.cancel || e.type === 'pointercancel') return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    const tx = x - g.x0, ty = y - g.y0;
    if (!g.moved && Math.hypot(tx, ty) < 14 && now - g.t0 < 350) { rotate(1); return; }
    if (g.spawn !== spawnId || g.holdDone) return;
    // speed of the last ~120 ms of movement; a finger that rested before lifting is no flick
    const h0 = g.hist[0], hl = g.hist[g.hist.length - 1], dtm = Math.max(8, hl[2] - h0[2]), vy = (hl[1] - h0[1]) / dtm, vx = (hl[0] - h0[0]) / dtm;
    if (now - hl[2] > 110) return;
    if (vy > .75 && ty > Math.max(36, c * 1.3) && vy > Math.abs(vx) * 1.8) hardDrop();
    else if (!g.holdDone && vy < -.9 && -ty > Math.max(40, c * 1.3) && -vy > Math.abs(vx) * 1.5) hold();
  };
  cv.addEventListener('pointerup', gEnd); cv.addEventListener('pointercancel', gEnd);
  cv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- input: keyboard ---------- */
  const KEYS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowDown: 'D', ArrowUp: 'CW', x: 'CW', X: 'CW', z: 'CCW', Z: 'CCW', ' ': 'X', c: 'H', C: 'H', Shift: 'H' };
  window.addEventListener('keydown', e => {
    if (current !== 'bv' || anyModal()) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); pause(); return; }
    const a = KEYS[e.key]; if (!a) return;
    e.preventDefault(); if (e.repeat) return; press(a);
  });
  window.addEventListener('keyup', e => { const a = KEYS[e.key]; if (a) release(a); });
  window.addEventListener('resize', () => { if (current === 'bv') requestAnimationFrame(layout); });

  function enter() {
    show('bv'); applyCtl();
    const saved = store.get('bv.save', null);
    if ((!S || S.over) && saved && saved.grid && saved.grid.length === TR * COLS) { S = saved; resetRuntime(); if (!S.cur) spawn(); }
    layout(); wasPaused = true; pausedAt = 0;
    if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
    renderStart(); openModal('bvStartModal');
  }
  function leave() {
    save(); running = false; cancelAnimationFrame(raf);
    for (const b of padHeld.values()) b.classList.remove('on'); padHeld.clear(); inp.L = inp.R = inp.D = false; hDir = 0; G = null;
    closeModals(); show('menu'); refreshMenu();
  }
  window.__bv = {
    get S() { return S; }, get view() { return { c, bx, by, land, holdR, nextR, statR, W, H }; }, get countdown() { return countdown; }, get clearing() { return clearing; }, opt, stats: () => stats,
    newGame, press, release, move, rotate, hardDrop, hold, softStep, pause, layout, CELLS,
    skip() { countdown = 0; }, step(t) { const n = Math.ceil(t / .016); for (let i = 0; i < n; i++) update(.016); },
    setRows(rows) { for (let i = 0; i < rows.length; i++) { const y = TR - rows.length + i; for (let x = 0; x < COLS; x++) S.grid[y * COLS + x] = rows[i][x] === '.' ? 0 : 1 + ('IOTSZJL'.indexOf(rows[i][x]) >= 0 ? 'IOTSZJL'.indexOf(rows[i][x]) : 7); } },
    setCur(t) { S.cur = null; spawn(t); }, setQueue(q) { S.queue = q.concat(S.queue).slice(0, 14); },
  };
  return { enter, leave, hasSave: () => !!store.get('bv.save', null) };
})();
$('#tileBv').addEventListener('click', () => Blokval.enter());
