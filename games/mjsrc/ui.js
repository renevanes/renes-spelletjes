  /* ================= settings, stats ================= */
  const D = { lay: 'schildpad', hl: true, idx: true, table: 'groen', sound: true };
  const opt = Object.assign({}, D, store.get('mj.settings', {}));
  if (!TABLES[opt.table]) opt.table = 'groen';
  const saveOpt = () => store.set('mj.settings', opt);
  Sfx.gate('mj', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  let stats = Object.assign({ played: 0, won: 0, noHelp: 0, best: {}, L: {}, daily: {}, dailyWon: 0, dailyBest: null }, store.get('mj.stats', {}));
  const saveStats = () => store.set('mj.stats', stats);
  const LS = id => stats.L[id] || (stats.L[id] = { p: 0, w: 0 });
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DAILY_LAYS = ['schildpad', 'draak', 'vlinder', 'burcht', 'bloem', 'piramide'];
  const dailyLay = d => DAILY_LAYS[Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5) % DAILY_LAYS.length];

  /* ================= state ================= */
  let S = null, G = null, free = [], pairs = [], left = 0, sel = -1, hintP = null, paused = false, timer = 0, lastSec = -1, saveT = 0;
  const bad = new Map();                                     // tile -> time until it flashes red
  const scr = $('#mj'), stage = $('#mjStage'), cv = $('#mjCv'), fxc = $('#mjFx'), ctx = cv.getContext('2d'), fctx = fxc.getContext('2d');
  const T = .14, HR = 4 / 3;                                 // thickness / layer shift (× W), face height (× W)
  let FL = [], FT = [], KW = 1, KH = 1;
  function setupGeo() {
    G = geo(S.lay);
    let mz = 0; for (const p of G.pos) mz = Math.max(mz, p[2]);
    FL = G.pos.map(([x, , z]) => x / 2 + (z + 1) * T); FT = G.pos.map(([, y, z]) => y * HR / 2 - z * T + mz * T);
    KW = Math.max(...FL) + 1 + .1; KH = Math.max(...FT) + HR + T + .1;
  }
  // recompute free tiles and pairs; partial: only redraw the given tiles and those whose free state changed
  function refresh(partial, extra = []) {
    const alive = S.faces.map(f => f >= 0), was = free; left = alive.filter(Boolean).length;
    free = alive.map((a, i) => a && isFree(G, alive, i));
    pairs = movePairs(G, S.faces);
    const os = sel; if (sel >= 0 && !free[sel]) sel = -1;
    if (hintP && !(free[hintP[0]] && free[hintP[1]])) hintP = null;
    hud(true);
    if (partial && was.length === free.length) { const d = extra.concat([os, sel]); for (let i = 0; i < G.n; i++) if (was[i] !== free[i]) d.push(i); markTiles(d); }
    else requestDraw();
  }
  function hud(force) {
    if (!S) return;
    const s = Math.floor(S.time); if (force || s !== lastSec) { lastSec = s; $('#mjTime').textContent = fmt(S.time); }
    if (force) { $('#mjLeft').textContent = left; $('#mjPairs').textContent = pairs.length; $('#mjPairsW').classList.toggle('none', !pairs.length && left > 0); $('#mjLay').textContent = S.daily ? 'Dagpuzzel' : LAY(S.lay).name; }
  }

  /* ================= view: fit, zoom, pan ================= */
  const V = { W: 30, s: 1, fitW: 30, ox: 0, oy: 0, cw: 1, ch: 1, dpr: 1, fd: 1, gest: false };
  function fit(keep) {
    if (current !== 'mj' || !S) return;
    scr.classList.toggle('land', innerWidth > innerHeight * 1.1);
    const r = stage.getBoundingClientRect(); if (r.width < 10) return;
    V.cw = r.width; V.ch = r.height; V.dpr = Math.min(3, devicePixelRatio || 1);
    V.fd = Math.min(V.dpr, +(window.__mjFxRes || 1.75));     // the short-lived effects layer needs less resolution than the tiles
    cv.width = Math.round(V.cw * V.dpr); cv.height = Math.round(V.ch * V.dpr); fxc.width = Math.round(V.cw * V.fd); fxc.height = Math.round(V.ch * V.fd);
    fxPrev = [];
    const big = document.documentElement.classList.contains('big-text');
    V.fitW = Math.max(big ? 30 : 23, Math.min((V.cw - 14) / KW, (V.ch - 14) / KH, 88));
    if (!keep) V.s = 1;
    V.W = V.fitW * V.s; clampView(true); requestDraw();
  }
  const bw = () => KW * V.W, bh = () => KH * V.W;
  function clampView(center) {
    const w = bw(), h = bh();
    if (w <= V.cw) V.ox = (V.cw - w) / 2 + V.W * .05; else V.ox = center ? (V.cw - w) / 2 : Math.max(V.cw - w - 6, Math.min(6, V.ox));
    if (h <= V.ch) V.oy = (V.ch - h) / 2; else V.oy = center ? (V.ch - h) / 2 : Math.max(V.ch - h - 6, Math.min(6, V.oy));
  }
  // zooming: the drawn board is moved with a GPU transform first (smooth even on slow phones), then redrawn sharp
  let zoomT = 0;
  function zoomTo(s, cx, cy, anim = true) {
    s = Math.max(1, Math.min(3, s, 110 / V.fitW));
    const bx = (cx - V.ox) / V.W, by = (cy - V.oy) / V.W;
    V.s = s; V.W = V.fitW * s; V.ox = cx - bx * V.W; V.oy = cy - by * V.W; clampView(false);
    $('#mjZoomBtn small').textContent = s > 1.05 ? 'Uitzoomen' : 'Inzoomen';
    if (!anim || !R) { requestDraw(); return; }
    clearTimeout(zoomT); cv.style.transition = 'transform .2s cubic-bezier(.2,.8,.3,1)'; cssView(); kick();
    zoomT = setTimeout(() => { cv.style.transition = ''; requestDraw(); }, 210);
  }
  const faceRect = i => [V.ox + FL[i] * V.W, V.oy + FT[i] * V.W, V.W, V.W * HR];
  function hit(x, y) {                                       // topmost tile under a stage point
    const W = V.W, t = W * T, H = W * HR;
    for (let i = G.n - 1; i >= 0; i--) {
      if (S.faces[i] < 0) continue;
      const fx = V.ox + FL[i] * W, fy = V.oy + FT[i] * W;
      if ((x >= fx && x <= fx + W && y >= fy && y <= fy + H) || (x >= fx - t && x <= fx - t + W && y >= fy + t && y <= fy + t + H)) return i;
    }
    return -1;
  }

  /* ================= drawing =================
     The tiles live on one canvas that is only redrawn when something changes: completely after a new deal, a shuffle
     or a zoom, and otherwise only around the tiles that changed (a tap redraws one or two small rectangles). */
  let drawRaf = 0, lastFull = 0, tapAt = 0, tapEv = 0, tapLat = [], drawMs = 0, full = true, R = null;
  const dirty = new Set();
  function requestDraw() { full = true; schedule(); }
  function markTiles(list) { for (const i of list) if (i >= 0) dirty.add(i); schedule(); }
  function schedule() { if (!drawRaf) drawRaf = requestAnimationFrame(() => { drawRaf = 0; drawTiles(); kick(); }); }
  function cssView() {                                       // show the last drawing moved/scaled to the current view
    if (!R) return; const k = V.W / R.W;
    cv.style.transform = `translate(${V.ox - R.ox * k}px,${V.oy - R.oy * k}px) scale(${k})`;
  }
  function viewChanged() {                                   // during pan / pinch: redraw when the phone keeps up, else move the picture
    if (drawMs < 9 || performance.now() - lastFull > 160) requestDraw(); else { cssView(); kick(); }
  }
  function spriteBox(i, lift) {                              // where tile i's sprite goes, device px
    const k = V.W / SP.W, dpr = V.dpr, fx = V.ox + FL[i] * V.W, fy = V.oy + FT[i] * V.W + lift;
    return [(fx - (SP.p + SP.t) * k) * dpr, (fy - SP.p * k) * dpr, (V.W + SP.t * 2 + SP.p * 2) * k * dpr, (V.W * HR + SP.t * 2 + SP.p * 2) * k * dpr, fx, fy];
  }
  function drawTile(c, i, now) {
    const f = S.faces[i], W = V.W, H = W * HR, dpr = V.dpr, k = V.W / SP.W;
    const img = sprite(f, opt.hl && !free[i] ? 'dim' : 'n'), [dx, dy, , , fx, fy] = spriteBox(i, i === sel ? -W * .07 : 0);
    if (k === 1) c.drawImage(img, Math.round(dx), Math.round(dy)); else c.drawImage(img, dx, dy, img.width * k, img.height * k);
    const bt = bad.get(i);
    if (i === sel || (bt && bt > now)) {
      c.save(); c.scale(dpr, dpr); rr(c, fx, fy, W, H, W * .13);
      c.fillStyle = i === sel ? 'rgba(255,200,40,.3)' : 'rgba(230,40,40,.3)'; c.fill();
      c.lineWidth = Math.max(2, W * .07); c.strokeStyle = i === sel ? '#ffc928' : '#e8473a'; c.stroke(); c.restore();
    }
  }
  let buildT = 0;
  function useSprites() {                                    // switch to sprites of the current size; build them in slices if that takes long
    const T = spriteSet(V.W, V.dpr, opt.table, opt.idx); if (T === SP) return;
    const need = []; for (let i = 0; i < G.n; i++) if (S.faces[i] >= 0) { const k = S.faces[i] * 2 + (opt.hl && !free[i] ? 1 : 0); if (!T.map.has(k) && !need.includes(k)) need.push(k); }
    if (!need.length || !SP.W || SP.table !== T.table || SP.idx !== T.idx || SP.dpr !== T.dpr) { SP = T; return; }
    clearTimeout(buildT);
    const step = () => {
      if (spriteSet(V.W, V.dpr, opt.table, opt.idx) !== T) return;
      const t0 = performance.now();
      while (need.length && performance.now() - t0 < 6) { const k = need.pop(); if (!T.map.has(k)) T.map.set(k, makeSprite(k >> 1, T, T.table, k & 1 ? 'dim' : 'n')); }
      if (need.length) buildT = setTimeout(step, 0); else requestDraw();
    };
    buildT = setTimeout(step, 0);
  }
  function drawTiles() {
    const t0 = performance.now(), c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    if (!S) { c.clearRect(0, 0, cv.width, cv.height); return; }
    const same = R && R.W === V.W && R.ox === V.ox && R.oy === V.oy;
    if (full || !same) {
      if (!V.gest || !SP.W) useSprites();
      c.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < G.n; i++) if (S.faces[i] >= 0) { const [bx, by, bw2, bh2] = spriteBox(i, 0); if (bx < cv.width && by < cv.height && bx + bw2 > 0 && by + bh2 > -V.W * V.dpr) drawTile(c, i, t0); }
      R = { W: V.W, ox: V.ox, oy: V.oy }; cv.style.transform = ''; lastFull = performance.now();
    } else if (dirty.size) {
      const boxes = [...dirty].map(i => spriteBox(i, -V.W * .08)).map(([x, y, w, h]) => [Math.floor(x) - 1, Math.floor(y) - 1, Math.ceil(w + V.W * .08 * V.dpr) + 2, Math.ceil(h + V.W * .08 * V.dpr) + 2]);
      for (const [x, y, w, h] of boxes) {
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.clearRect(x, y, w, h);
        for (let i = 0; i < G.n; i++) {
          if (S.faces[i] < 0) continue;
          const [bx, by, bw2, bh2] = spriteBox(i, i === sel ? -V.W * .07 : 0);
          if (bx < x + w && bx + bw2 > x && by < y + h && by + bh2 > y) drawTile(c, i, t0);
        }
        c.restore();
      }
    }
    full = false; dirty.clear();
    const t1 = performance.now(); drawMs = t1 - t0;
    if (tapAt) { tapLat.push(t1 - tapAt); if (tapLat.length > 60) tapLat.shift(); tapAt = 0; }
  }

  /* ---------- effects layer: flying pairs, sparkles, hint glow, petals ----------
     Only the rectangles drawn in the previous frame are cleared (a full-screen clear every frame is too slow on older phones). */
  const anims = []; let fxRaf = 0, frames = [], fxPrev = [], fxNow = [];
  const fxMark = (x, y, w, h) => fxNow.push([x, y, w, h]);
  function kick() { if (!fxRaf) fxRaf = requestAnimationFrame(fxFrame); }
  function fxFrame(now) {
    fxRaf = 0; frames.push(now); if (frames.length > 600) frames.splice(0, 300);
    const c = fctx, d = V.fd; c.setTransform(1, 0, 0, 1, 0, 0);
    for (const [x, y, w, h] of fxPrev) c.clearRect(Math.floor(x * d) - 2, Math.floor(y * d) - 2, Math.ceil(w * d) + 4, Math.ceil(h * d) + 4);
    c.setTransform(d, 0, 0, d, 0, 0); fxNow = [];
    let ended = false;
    for (let k = anims.length - 1; k >= 0; k--) if (anims[k](c, now) === false) { anims.splice(k, 1); ended = true; }
    fxPrev = fxNow;
    if (anims.length || ended) kick();                    // one more frame after the last one ends: clear what it drew
  }
  const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  function drawSprite(c, f, x, y, sc = 1, a = 1, rot = 0) {      // x, y: face centre (CSS px)
    if (!(f >= 0) || a <= 0) return;
    const img = sprite(f, 'n'), k = V.W / SP.W, w = img.width / V.dpr * k * sc, h = img.height / V.dpr * k * sc;
    const ox = (SP.p + SP.t + V.W / k / 2) * k * sc, oy = (SP.p + V.W * HR / k / 2) * k * sc;
    c.save(); c.globalAlpha = a; c.translate(x, y); if (rot) c.rotate(rot); c.drawImage(img, -ox, -oy, w, h); c.restore();
    const m = Math.max(w, h) * .25; fxMark(x - ox - m, y - oy - m, w + m * 2, h + m * 2);
  }
  function star(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); fxMark(x - r, y - r, r * 2, r * 2); }
  const GLOW = new Map();
  function glow(col) {                                       // a soft glowing frame around one tile face, drawn once per size
    const key = col + '|' + V.W.toFixed(1) + '|' + V.dpr; let g = GLOW.get(key);
    if (!g) {
      if (GLOW.size > 8) GLOW.clear();
      const W = V.W, H = W * HR, m = W * .45, d = V.dpr; g = document.createElement('canvas'); g.width = Math.ceil((W + m * 2) * d); g.height = Math.ceil((H + m * 2) * d);
      const c = g.getContext('2d'); c.scale(d, d); c.shadowColor = `rgb(${col})`; c.shadowBlur = W * .45 * d; c.lineWidth = Math.max(2.5, W * .09); c.strokeStyle = `rgba(${col},.95)`;
      rr(c, m - 1, m - 1, W + 2, H + 2, W * .14); c.stroke(); c.shadowBlur = 0; c.fillStyle = `rgba(${col},.16)`; c.fill();
      g.m = m; GLOW.set(key, g);
    }
    return g;
  }
  function drawGlow(c, i, col, a) {
    const g = glow(col), [x, y, w, h] = faceRect(i);
    c.globalAlpha = Math.max(0, Math.min(1, a)); c.drawImage(g, x - g.m, y - g.m, w + g.m * 2, h + g.m * 2); c.globalAlpha = 1;
    fxMark(x - g.m, y - g.m, w + g.m * 2, h + g.m * 2);
  }
  function matchAnim(a, b, fa, fb) {
    const t0 = performance.now(), d = 430, A = faceRect(a), B = faceRect(b);
    const ca = [A[0] + A[2] / 2, A[1] + A[3] / 2], cb = [B[0] + B[2] / 2, B[1] + B[3] / 2];
    const dist = Math.hypot(ca[0] - cb[0], ca[1] - cb[1]), mid = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2 - V.W * .6];
    const pull = Math.min(.42, V.W * 1.6 / Math.max(1, dist));            // fly towards each other, but not all the way across the board
    const sparks = Array.from({ length: 14 }, (_, k) => ({ a: k / 14 * Math.PI * 2 + Math.random() * .4, v: .6 + Math.random() * .8, r: .08 + Math.random() * .08, from: Math.random() < .5 ? 0 : 1 }));
    anims.push((c, now) => {
      const p = Math.min(1, (now - t0) / d), e = ease(p), lift = Math.sin(Math.min(1, p * 1.4) * Math.PI / 2) * V.W * .55;
      const alpha = p < .55 ? 1 : 1 - (p - .55) / .45, sc = 1 + .16 * Math.sin(p * Math.PI);
      [[ca, cb, fa, -1], [cb, ca, fb, 1]].forEach(([p0, p1, f, sg]) => drawSprite(c, f, p0[0] + (p1[0] - p0[0]) * pull * e, p0[1] + (p1[1] - p0[1]) * pull * e - lift, sc, alpha, sg * .12 * e));
      if (p > .35) {
        const q = (p - .35) / .65;
        for (const s of sparks) { const o = s.from ? cb : ca, x = o[0] + (mid[0] - o[0]) * pull + Math.cos(s.a) * s.v * V.W * 1.3 * q, y = o[1] - lift + Math.sin(s.a) * s.v * V.W * 1.3 * q; star(c, x, y, V.W * s.r * (1 - q * .5), `rgba(255,${210 + Math.floor(40 * s.v)},120,${(1 - q) * .95})`); }
      }
      return p < 1;
    });
    kick();
  }
  function hintAnim() {
    const t0 = performance.now(), d = 3600, p0 = hintP;
    anims.push((c, now) => {
      if (hintP !== p0 || !S) return false;
      const p = (now - t0) / d; if (p >= 1) { hintP = null; return false; }
      const a = (.55 + .45 * Math.sin((now - t0) / 1000 * Math.PI * 2.4)) * (p > .85 ? (1 - p) / .15 : 1);
      for (const i of p0) drawGlow(c, i, '120,255,170', a);
    });
    kick();
  }
  function flashAnim(list, col = '255,214,90') {
    const t0 = performance.now();
    anims.push((c, now) => { const p = (now - t0) / 650; if (p >= 1) return false; for (const i of list) if (S.faces[i] >= 0) drawGlow(c, i, col, 1 - p); });
    kick();
  }
  function dealAnim() { cv.classList.remove('deal', 'shuf'); void cv.offsetWidth; cv.classList.add('deal'); }
  function petals() {
    const t0 = performance.now(), cols = ['#ffb7c9', '#ffd1dc', '#fff3f6', '#f28fae', '#ffe28a'];
    const P = Array.from({ length: 70 }, () => ({ x: Math.random() * V.cw, y: -20 - Math.random() * V.ch * .6, vy: 40 + Math.random() * 70, vx: -15 + Math.random() * 30, r: 4 + Math.random() * 6, a: Math.random() * 6, va: -2 + Math.random() * 4, ph: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
    anims.push((c, now) => {
      const t = (now - t0) / 1000; if (t > 4.2) return false;
      c.globalAlpha = t > 3.4 ? (4.2 - t) / .8 : 1;
      for (const q of P) {
        const x = q.x + q.vx * t + Math.sin(t * 1.6 + q.ph) * 18, y = q.y + q.vy * t; if (y < -12 || y > V.ch + 12) continue;
        const a = q.a + q.va * t, sy = .55 + .45 * Math.sin(t * 3 + q.ph), ca = Math.cos(a), sa = Math.sin(a);
        c.setTransform(ca * V.fd, sa * V.fd, -sa * sy * V.fd, ca * sy * V.fd, x * V.fd, y * V.fd); c.fillStyle = q.c;
        c.beginPath(); c.ellipse(0, 0, q.r, q.r * .62, 0, 0, 7); c.fill(); fxMark(x - q.r - 1, y - q.r - 1, q.r * 2 + 2, q.r * 2 + 2);
      }
      c.setTransform(V.fd, 0, 0, V.fd, 0, 0); c.globalAlpha = 1;
    });
    kick();
  }

  /* ================= game ================= */
  function newGame(lay, daily) {
    closeModals(); setPause(false);
    lay = LAY(lay).id;
    let seed = daily ? hashStr('mahjong-' + daily) : (Math.random() * 4294967296) >>> 0, d = null;
    for (let k = 0; k < 20 && !d; k++) d = deal(lay, seed + k * 7919);
    S = { lay, daily: daily || null, seed, faces: d.faces, sol: d.sol, time: 0, hints: 0, shuffles: 0, undo: [], over: false };
    stats.played++; LS(lay).p++; saveStats(); saveNow();
    sel = -1; hintP = null; bad.clear(); anims.length = 0;
    setupGeo(); fit(); refresh(); dealAnim(); sfx('mjShuffle');
    if (V.fitW < 30 && !opt.zoomTip) { opt.zoomTip = 1; saveOpt(); setTimeout(() => toast('Tip: dubbeltik op de tafel of knijp met twee vingers om in te zoomen. Met één vinger schuif je het bord.', 4500), 900); }
  }
  let saveTm = 0;
  const saveNow = () => { clearTimeout(saveTm); saveTm = 0; if (S && !S.over) store.set('mj.save', Object.assign({}, S, { undo: S.undo.map(u => Object.assign({}, u, { sol: undefined })) })); };
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 350); };     // after the animation, not during the tap
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'mj') saveNow(); });
  function updateSol(sol, a, b) {                  // keep the known solution when the player's move fits in it
    if (!sol) return null;
    const i = sol.findIndex(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    let ns;
    if (i >= 0) ns = sol.filter((_, k) => k !== i);
    else {
      const ia = sol.findIndex(p => p[0] === a || p[1] === a), ib = sol.findIndex(p => p[0] === b || p[1] === b);
      if (ia < 0 || ib < 0) return null;
      ns = sol.slice(); ns[Math.max(ia, ib)] = [sol[ia][0] === a ? sol[ia][1] : sol[ia][0], sol[ib][0] === b ? sol[ib][1] : sol[ib][0]]; ns.splice(Math.min(ia, ib), 1);
    }
    return checkSol(G, S.faces, ns) ? ns : null;
  }
  function tapTile(i) {
    if (!S || S.over || paused || i < 0 || S.faces[i] < 0) return;
    tapAt = tapEv || performance.now(); tapEv = 0;
    if (!free[i]) { bad.set(i, performance.now() + 380); sfx('mjBlock'); vibrate(12); markTiles([i]); setTimeout(() => markTiles([i]), 400); return; }
    if (sel < 0) { sel = i; sfx('mjSel'); markTiles([i]); return; }
    if (sel === i) { sel = -1; sfx('mjDesel'); markTiles([i]); return; }
    if (groupOf(S.faces[sel]) === groupOf(S.faces[i])) { match(sel, i); return; }
    const o = sel; bad.set(o, performance.now() + 380); setTimeout(() => markTiles([o]), 400);
    sel = i; sfx('mjNo'); markTiles([o, i]);
  }
  function match(a, b) {
    const fa = S.faces[a], fb = S.faces[b];
    S.undo.push({ k: 'm', a, b, fa, fb, sol: S.sol });
    S.faces[a] = S.faces[b] = -1; sel = -1;
    S.sol = updateSol(S.sol, a, b);
    sfx('mjMatch'); matchAnim(a, b, fa, fb); refresh(true, [a, b]);
    if (!left) return win();
    save();
    if (!pairs.length) setTimeout(() => { if (S && !S.over && !pairs.length && current === 'mj') openStuck(); }, 650);
  }
  function openStuck() { markTiles([sel]); sel = -1; sfx('mjNo'); openModal('mjStuckModal'); }
  function doUndo() {
    if (!S || S.over) return;
    const u = S.undo.pop(); if (!u) { toast('Er is nog niets om terug te zetten'); return; }
    if (u.k === 'm') { S.faces[u.a] = u.fa; S.faces[u.b] = u.fb; } else S.faces = u.faces;
    S.sol = u.sol || null; const os = sel; sel = -1; hintP = null;
    sfx('mjUndo'); if (u.k === 'm') refresh(true, [u.a, u.b, os]); else refresh(); save();
    flashAnim(u.k === 'm' ? [u.a, u.b] : []);
  }
  function hint() {
    if (!S || S.over) return;
    if (!S.sol || !checkSol(G, S.faces, S.sol)) S.sol = solve(G, S.faces, 25000);
    let p = S.sol ? (S.sol.find(([a, b]) => free[a] && free[b]) || null) : null;
    if (!p) p = pairs[0] || null;
    if (!p) { openStuck(); return; }
    S.hints++; hintP = p; markTiles([sel]); sel = -1; sfx('mjHint'); hintAnim(); save();
    if (!S.sol) toast('Deze zet kan, maar het spel is misschien niet meer helemaal op te lossen. Zet anders een paar zetten terug.', 3600);
  }
  function doShuffle() {
    if (!S || S.over || !left) return;
    const res = reshuffle(S.lay, S.faces, rng((Math.random() * 4294967296) >>> 0)); if (!res) { toast('Schudden lukte niet'); return; }
    S.undo.push({ k: 's', faces: S.faces.slice(), sol: S.sol });
    S.faces = res.faces; S.sol = res.sol; S.shuffles++; sel = -1; hintP = null;
    closeModals(); sfx('mjShuffle'); refresh(); save();
    cv.classList.remove('shuf'); void cv.offsetWidth; cv.classList.add('shuf');
  }
  function win() {
    S.over = true; store.del('mj.save');
    const t = Math.floor(S.time), L = LS(S.lay), b = stats.best[S.lay];
    stats.won++; L.w++; S.newBest = b == null || t < b; if (S.newBest) stats.best[S.lay] = t;
    if (!S.hints && !S.shuffles) stats.noHelp++;
    if (S.daily) {
      const prev = stats.daily[S.daily]; if (prev == null) stats.dailyWon++;
      S.newDaily = prev == null || t < prev; if (S.newDaily) stats.daily[S.daily] = t;
      if (stats.dailyBest == null || t < stats.dailyBest) stats.dailyBest = t;
      const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()];
    }
    saveStats(); hud(true); sfx('mjWin'); vibrate(30);
    const game = S;
    setTimeout(() => { if (S === game && current === 'mj') petals(); }, 380);
    setTimeout(() => {
      if (S !== game || current !== 'mj') return;
      const L2 = LAY(S.lay).name, best = stats.best[S.lay];
      $('#mjEndTitle').textContent = S.daily ? 'Dagpuzzel opgelost!' : 'Gewonnen!';
      $('#mjEndText').innerHTML = `<div class="mj-endt"><b>${fmt(S.time)}</b><small>${esc(L2)}${S.newBest ? ' · 🎉 nieuwe beste tijd' : ''}</small></div>`
        + `<p>${S.hints ? S.hints + (S.hints === 1 ? ' hint' : ' hints') : 'Geen hints'} · ${S.shuffles ? S.shuffles + '× geschud' : 'niet geschud'}<br>Beste tijd ${esc(L2)}: <b>${fmt(best)}</b>${S.daily && !S.newDaily ? `<br>Vandaag eerder: ${fmt(stats.daily[S.daily])}` : ''}</p>`;
      openModal('mjEndModal');
    }, 1700);
  }
  let toastT = 0;
  function toast(t, ms = 2200) { const el = $('#mjToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  function setPause(on) {
    paused = !!on && !!S && !S.over; $('#mjPause').classList.toggle('show', paused);
    if (paused && sel >= 0) { markTiles([sel]); sel = -1; }
  }

  /* ================= start dialog ================= */
  const PV = {};
  function preview(id) {
    const key = id + '|' + opt.table; if (PV[key]) return PV[key];
    const g = geo(id), Tb = TABLES[opt.table], dpr = 2;
    let mz = 0; for (const p of g.pos) mz = Math.max(mz, p[2]);
    const fl = g.pos.map(([x, , z]) => x / 2 + (z + 1) * T), ft = g.pos.map(([, y, z]) => y * HR / 2 - z * T + mz * T);
    const kw = Math.max(...fl) + 1, kh = Math.max(...ft) + HR + T, W = Math.min(150 / kw, 84 / kh);
    const c = document.createElement('canvas'); c.width = Math.ceil(kw * W * dpr) + 2; c.height = Math.ceil(kh * W * dpr) + 2;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const t = W * T, H = W * HR, shade = ['#f7f0dd', '#fbf3df', '#fff6dc', '#fff8d6', '#fffbd0', '#fffdcc'];
    g.pos.forEach(([, , z], i) => {
      const fx = fl[i] * W, fy = ft[i] * W;
      x.fillStyle = Tb.back[1]; rr(x, fx - t, fy + t, W, H, W * .15); x.fill();
      x.fillStyle = '#d8caa6'; rr(x, fx - t * .5, fy + t * .5, W, H, W * .15); x.fill();
      x.fillStyle = shade[Math.min(5, z)]; rr(x, fx, fy, W, H, W * .15); x.fill();
      x.strokeStyle = 'rgba(110,90,50,.45)'; x.lineWidth = .5; x.stroke();
    });
    return (PV[key] = c.toDataURL());
  }
  function renderStart() {
    const d = dayStr(), dl = dailyLay(d), done = stats.daily[d];
    const dn = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#mjDaily').innerHTML = `<img src="${preview(dl)}" alt=""><span><b>📅 Dagpuzzel</b><small>${esc(dn)} · ${LAY(dl).name}</small><small>Iedereen krijgt vandaag dezelfde stenen</small></span><em>${done != null ? '✓ ' + fmt(done) : 'Speel ▶'}</em>`;
    $('#mjDaily').classList.toggle('done', done != null);
    $('#mjLays').innerHTML = LAYOUTS.map(L => `<button data-lay="${L.id}" class="${opt.lay === L.id ? 'on' : ''}"><img src="${preview(L.id)}" alt=""><b>${L.name}</b><small>${geo(L.id).n} stenen</small><span>${stats.best[L.id] != null ? '⏱ ' + fmt(stats.best[L.id]) : '–'}</span></button>`).join('');
    $('#mjOptList').innerHTML = [['hl', 'Vrije stenen oplichten', [[true, 'Aan'], [false, 'Uit']]], ['idx', 'Hulpcijfers in de hoek', [[true, 'Aan'], [false, 'Uit']]],
      ['table', 'Tafel', Object.entries(TABLES).map(([k, v]) => [k, v.name])], ['sound', 'Geluidseffecten', [[true, 'Aan'], [false, 'Uit']]], ['music', 'Achtergrondmuziek', [[true, 'Aan'], [false, 'Uit']]]]
      .map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#mjStats').innerHTML = [['Gespeeld', stats.played], ['Gewonnen', stats.won], ['Zonder hulp', stats.noHelp]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    $('#mjResume').hidden = !(S && !S.over);
  }
  function applyTable() { stage.className = 't-' + opt.table; }

  /* ================= input ================= */
  const ptrs = new Map(); let gest = null, lastTap = { t: 0, x: 0, y: 0 };
  const sp = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  fxc.addEventListener('pointerdown', e => {
    if (!S) return; e.preventDefault();
    const p = sp(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) gest = { kind: 'tap', x0: p.x, y0: p.y, ox: V.ox, oy: V.oy };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gest = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: V.s, bx: ((a.x + b.x) / 2 - V.ox) / V.W, by: ((a.y + b.y) / 2 - V.oy) / V.W }; V.gest = true; }
  });
  fxc.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !gest) return;
    const p = sp(e); ptrs.set(e.pointerId, p);
    if (gest.kind === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      V.s = Math.max(1, Math.min(3, 110 / V.fitW, gest.s0 * d / gest.d0)); V.W = V.fitW * V.s;
      V.ox = (a.x + b.x) / 2 - gest.bx * V.W; V.oy = (a.y + b.y) / 2 - gest.by * V.W; clampView(false); viewChanged();
    } else if (gest.kind === 'tap' || gest.kind === 'pan') {
      const dx = p.x - gest.x0, dy = p.y - gest.y0;
      if (gest.kind === 'tap' && dx * dx + dy * dy > 81) gest.kind = 'pan';
      if (gest.kind === 'pan' && (bw() > V.cw || bh() > V.ch)) { V.ox = gest.ox + dx; V.oy = gest.oy + dy; clampView(false); viewChanged(); }
    }
  });
  const endPtr = e => {
    if (!ptrs.has(e.pointerId)) return;
    const p = sp(e); ptrs.delete(e.pointerId);
    if (gest && gest.kind === 'tap' && e.type === 'pointerup' && !ptrs.size) { tapEv = e.timeStamp; boardTap(p.x, p.y); tapEv = 0; }
    if (!ptrs.size) { if (gest && gest.kind === 'pinch') { $('#mjZoomBtn small').textContent = V.s > 1.05 ? 'Uitzoomen' : 'Inzoomen'; } gest = null; if (V.gest) { V.gest = false; requestDraw(); } }
    else if (gest && gest.kind === 'pinch') gest = { kind: 'done' };
  };
  fxc.addEventListener('pointerup', endPtr); fxc.addEventListener('pointercancel', endPtr);
  fxc.addEventListener('wheel', e => { if (!S) return; e.preventDefault(); const p = sp(e); zoomTo(V.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), p.x, p.y, false); }, { passive: false });
  function boardTap(x, y) {
    if (!S || S.over) return;
    const i = hit(x, y);
    if (i >= 0) { lastTap.t = 0; tapTile(i); return; }
    const now = performance.now();
    if (now - lastTap.t < 340 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) { lastTap.t = 0; zoomTo(V.s > 1.05 ? 1 : 2, x, y); return; }
    lastTap = { t: now, x, y };
    if (sel >= 0) { markTiles([sel]); sel = -1; sfx('mjDesel'); }
  }
  $('#mjTools').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]'); if (!b || !S) return;
    const t = b.dataset.t; if (paused) setPause(false);
    if (t === 'undo') doUndo(); else if (t === 'hint') hint(); else if (t === 'shuffle') doShuffle();
    else if (t === 'zoom') zoomTo(V.s > 1.05 ? 1 : 2, V.cw / 2, V.ch / 2);
  });
  $('#mjPauseBtn').addEventListener('click', () => { if (S && !S.over) setPause(!paused); });
  $('#mjPause').addEventListener('click', () => setPause(false));
  $('#mjLays').addEventListener('click', e => { const b = e.target.closest('button[data-lay]'); if (!b) return; opt.lay = b.dataset.lay; saveOpt(); sfx('mjSel'); renderStart(); });
  $('#mjDaily').addEventListener('click', () => { const d = dayStr(); newGame(dailyLay(d), d); });
  $('#mjOptList').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); applyTable(); renderStart(); requestDraw(); Sfx.refresh && Sfx.refresh();
  });
  $('#mjGo').addEventListener('click', () => newGame(opt.lay));
  $('#mjResume').addEventListener('click', () => closeModals());
  $('#mjStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#mjEndNew').addEventListener('click', () => newGame(S && !S.daily ? S.lay : opt.lay));
  $('#mjEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('mjStartModal'); });
  $('#mjStuckUndo').addEventListener('click', () => { closeModals(); doUndo(); });
  $('#mjStuckShuffle').addEventListener('click', () => doShuffle());
  $('#mjBack').addEventListener('click', () => leave());
  $('#mjMenu').addEventListener('click', () => { renderStart(); openModal('mjStartModal'); });
  window.addEventListener('resize', () => { if (current === 'mj') setTimeout(() => fit(true), 60); });
  window.addEventListener('keydown', e => {
    if (current !== 'mj' || anyModal() || !S) return;
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) doUndo(); else if (e.key === 'h') hint(); else if (e.key === 's') doShuffle(); else if (e.key === ' ' || e.key === 'p') setPause(!paused);
  });

  function tick() {
    if (current !== 'mj' || !S || S.over || anyModal() || document.hidden || paused) return;
    S.time += .25; hud(); if (++saveT % 20 === 0) saveNow();
  }
  function enter() {
    show('mj'); applyTable();
    const saved = store.get('mj.save', null);
    if (!S && saved && saved.faces && saved.lay) S = saved;
    if (S) { setupGeo(); sel = -1; hintP = null; fit(); refresh(); requestAnimationFrame(() => fit(true)); }
    clearInterval(timer); timer = setInterval(tick, 250);
    if (!S || S.over) { renderStart(); openModal('mjStartModal'); }
  }
  function leave() { clearInterval(timer); saveNow(); anims.length = 0; setPause(false); closeModals(); show('menu'); refreshMenu(); }

  /* ================= test hooks ================= */
  const center = i => { const r = stage.getBoundingClientRect(), [x, y, w, h] = faceRect(i); return { x: r.left + x + w / 2, y: r.top + y + h / 2 }; };
  window.__mj = {
    get S() { return S; }, get G() { return G; }, get V() { return V; }, get sel() { return sel; }, get hintP() { return hintP; }, get free() { return free; }, get pairs() { return pairs; }, get paused() { return paused; },
    LAYOUTS, geo, deal, reshuffle, checkSol, solve, movePairs, isFree, groupOf, opt, stats: () => stats, newGame, tapTile, hint, doUndo, doShuffle, fit, zoomTo, center, hit, dayStr, dailyLay,
    setFaces(f) { S.faces = f; S.sol = null; sel = -1; refresh(); if (left && !pairs.length) openStuck(); },
    tapLat: () => tapLat.slice(), frames: () => frames.slice(), drawTiles, anims: () => anims.length, drawMs: () => drawMs, spW: () => SP.W,
    bounds: () => ({ x: V.ox, y: V.oy, w: bw(), h: bh() }),
  };
  return { enter, leave, hasSave: () => !!store.get('mj.save', null) };
