  /* ================= ui.js: screens, the grid (canvas with pan and pinch-zoom), clues, hints, timer, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LV = LEVELS;
  const opt = Object.assign({ sound: true, tap: 'xv', auto: true, err: false, lvl: 'makkelijk', pen: YES, lines: false }, store.get('lg.settings', {}));
  Sfx.gate('lg', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('lg.settings', opt);
  let stats = Object.assign({ played: 0, won: 0, wonBy: {}, best: {}, hints: 0, noHint: 0, hardNoHint: 0, expert: 0, dailyWon: 0, daily: {}, time: 0 }, store.get('lg.stats', {}));
  const saveStats = () => store.set('lg.stats', stats);
  const sfx = n => { if (opt.sound) Sfx.play(n); };
  const scr = $('#lg'), box = $('#lgBox'), cv = $('#lgCv'), pulse = $('#lgPulse');
  let g = cv.getContext('2d');
  const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Color Emoji",sans-serif';
  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmt = s => { s = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
  const big = () => document.documentElement.classList.contains('big-text');
  const LDESC = { makkelijk: 'Is en is niet', normaal: 'Ouder, jonger en of', moeilijk: 'Precies, paren en lijsten', expert: 'Alles door elkaar' };
  // paper and ink
  const C = { paper: '#fffaf0', paper2: '#f8efdc', line: '#dccfb3', block: '#4d4134', ink: '#2c2620', head: '#6b5a45', sel: 'rgba(255,205,70,.28)', selH: '#ffe7a3', hint: '#ffd75e', ref: 'rgba(80,190,150,.25)', yes: '#2a9d6f', no: '#55626e', auto: '#aab4bd', bad: '#e04848', badBg: '#fde1e1', chk: '#d63a3a' };

  /* ---------- game state ----------
     S = { P (the puzzle), mk (marks), t (seconds), hints, undo [[changes]], redo, struck [clue -> bool], daily (date or null), lvl, done } */
  let S = null, busy = false, hintS = null, sel = null, tab = 'c', raf = 0, animEnd = 0, lastGen = 0, timer = 0, lastTick = 0, saveT = 0, toastT = 0;
  const anim = new Map();                       // cell key -> [start, delay]
  const V = { W: 0, H: 0, dpr: 1, cs: 36, ox: 0, oy: 0, fit: false, ready: false };
  let Lay = null;

  /* ---------- layout: header sizes from the labels, cell size from the room, pan limits ---------- */
  const labText = it => (it.em ? it.em + ' ' : '') + it.sh;
  function labW(it, fs) { g.font = `600 ${fs}px ${FONT}`; return g.measureText(labText(it)).width + (it.sw ? fs + 4 : 0); }
  function layout(keep) {
    const r = box.getBoundingClientRect(); if (r.width < 40 || r.height < 40 || !S) return false;
    const P = S.P, K = P.K, N = P.N, B = big(), land = innerWidth > innerHeight;
    V.W = r.width; V.H = r.height; V.dpr = Math.min(devicePixelRatio || 1, 2.5);
    cv.width = Math.round(V.W * V.dpr); cv.height = Math.round(V.H * V.dpr); cv.style.width = V.W + 'px'; cv.style.height = V.H + 'px';
    const fs = B ? 15 : 13, cat = B ? 21 : 18, gap = 5, rows = [0], cols = [];
    for (let c = K - 1; c >= 2; c--) rows.push(c); for (let c = 1; c < K; c++) cols.push(c);
    const maxLab = cs => Math.max(...cs.map(c => Math.max(...P.cats[c].items.map(it => labW(it, fs)))));
    const leftW = cat + Math.min(B ? 118 : 100, maxLab(rows) + 12), topH = cat + Math.min(land ? (B ? 100 : 88) : (B ? 112 : 100), maxLab(cols) + 12);
    const ncell = (K - 1) * N, aw = V.W - leftW - 10, ah = V.H - topH - 10;
    const fitAll = Math.max(10, Math.min((aw - (K - 2) * gap) / ncell, (ah - (K - 2) * gap) / ncell));
    const minCs = B ? 40 : 34, cs0 = Math.min(60, Math.max(minCs, fitAll));
    Lay = { K, N, fs, cat, gap, rows, cols, leftW, topH, ncell, fitAll, cs0, minZ: Math.min(fitAll, cs0), maxZ: 80 };
    if (!keep || !V.ready) { V.cs = V.fit ? fitAll : cs0; V.ox = 0; V.oy = 0; }
    V.cs = clamp(V.cs, Lay.minZ, Lay.maxZ); clampPan(); V.ready = true; spr.clear();
    $('#lgFit').classList.toggle('on', V.cs <= fitAll + .5 && fitAll < cs0 - .5);
    return true;
  }
  const contentW = () => Lay.ncell * V.cs + (Lay.K - 2) * Lay.gap;
  const step = () => Lay.N * V.cs + Lay.gap;
  function base() { const cw = contentW(); return { x: Math.max(4, Math.round((V.W - Lay.leftW - cw - 2) / 2)), y: Math.max(4, Math.round((V.H - Lay.topH - cw - 2) / 2)) }; }
  function clampPan() {
    if (!Lay) return; const cw = contentW(), b = base(), aw = V.W - b.x - Lay.leftW - 4, ah = V.H - b.y - Lay.topH - 4;
    V.ox = clamp(V.ox, Math.min(0, aw - cw), 0); V.oy = clamp(V.oy, Math.min(0, ah - cw), 0);
  }
  // rows: names first, then the categories from the last one down; columns: categories 1..K-1
  function blockOf(a, b) {
    const N = Lay.N, A = Math.floor(a / N), B = Math.floor(b / N);
    const rc = A === 0 || B === 0 ? 0 : Math.max(A, B), x = rc === A ? a : b, y = rc === A ? b : a;
    return { ri: Lay.rows.indexOf(rc), ci: Lay.cols.indexOf(Math.floor(y / N)), r: x % N, c: y % N, a: x, b: y };
  }
  function cellRect(a, b) { const q = blockOf(a, b), B = base(); return { x: B.x + Lay.leftW + V.ox + q.ci * step() + q.c * V.cs, y: B.y + Lay.topH + V.oy + q.ri * step() + q.r * V.cs, s: V.cs }; }
  function hit(px, py) {
    if (!Lay) return null;
    const B = base(), x0 = B.x + Lay.leftW, y0 = B.y + Lay.topH, st = step(), N = Lay.N;
    const at = (u, n) => { if (u < 0) return null; const i = Math.floor(u / st), w = u - i * st; return i < n && w < N * V.cs ? [i, Math.floor(w / V.cs)] : null; };
    const C = at(px - x0 - V.ox, Lay.cols.length), R = at(py - y0 - V.oy, Lay.rows.length);
    if (px >= x0 && py >= y0) return C && R && R[0] + C[0] <= Lay.K - 2 ? { k: 'cell', a: Lay.rows[R[0]] * N + R[1], b: Lay.cols[C[0]] * N + C[1] } : null;
    if (py < y0 && py >= B.y && px >= x0 && C) return { k: 'col', g: Lay.cols[C[0]] * N + C[1] };
    if (px < x0 && px >= B.x && py >= y0 && R) return { k: 'row', g: Lay.rows[R[0]] * N + R[1] };
    return null;
  }
  // pan so a cell is in view (for hints)
  function reveal(a, b) {
    if (!Lay) return; const r = cellRect(a, b), B = base(), x0 = B.x + Lay.leftW, y0 = B.y + Lay.topH;
    if (r.x < x0 + 2 || r.x + r.s > V.W - 4) V.ox += (x0 + (V.W - x0) / 2) - (r.x + r.s / 2);
    if (r.y < y0 + 2 || r.y + r.s > V.H - 4) V.oy += (y0 + (V.H - y0) / 2) - (r.y + r.s / 2);
    clampPan(); need();
  }
  function setZoom(cs, px, py) {
    const B0 = base(), cw0 = contentW(), rx = (px - B0.x - Lay.leftW - V.ox) / cw0, ry = (py - B0.y - Lay.topH - V.oy) / cw0;
    V.cs = clamp(cs, Lay.minZ, Lay.maxZ);
    const B1 = base(), cw1 = contentW();
    V.ox = px - B1.x - Lay.leftW - rx * cw1; V.oy = py - B1.y - Lay.topH - ry * cw1;
    clampPan(); $('#lgFit').classList.toggle('on', V.cs <= Lay.fitAll + .5 && Lay.fitAll < Lay.cs0 - .5); need();
  }

  /* ---------- drawing (only when something changed; a short loop only while a mark pops) ---------- */
  const need = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // sprites: header labels and marks are drawn once into small canvases and then only copied (fast on slow phones)
  const spr = new Map();
  function sprite(key, w, h, paint) {
    let c = spr.get(key); if (c) return c;
    if (spr.size > 600) spr.clear();
    c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * V.dpr)); c.height = Math.max(1, Math.ceil(h * V.dpr));
    const keep = g; g = c.getContext('2d'); g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    try { paint(); } finally { g = keep; }
    spr.set(key, c); return c;
  }
  const mw = new Map();
  const measure = t => { const k = g.font + '|' + t; let w = mw.get(k); if (w == null) { w = g.measureText(t).width; if (mw.size > 2000) mw.clear(); mw.set(k, w); } return w; };
  function rowLab(it, x, y, maxW, fs, bold) {
    const h = Math.ceil(fs * 1.7), c = sprite(`r${bold ? 1 : 0}${fs}|${maxW}|${it.em || it.sw || ''}${it.sh}`, maxW, h, () => label(it, maxW, h / 2, maxW, fs, 'right', bold));
    g.drawImage(c, x - maxW, y - h / 2, maxW, h);
  }
  function colLab(it, cx, yb, maxH, fs, bold) {
    const w = Math.ceil(fs * 1.9), c = sprite(`c${bold ? 1 : 0}${fs}|${maxH}|${it.em || it.sw || ''}${it.sh}`, w, maxH, () => colLabel(it, w / 2, maxH, maxH, fs, bold));
    g.drawImage(c, cx - w / 2, yb - maxH, w, maxH);
  }
  // marks: one sprite per kind and size step (4 px), scaled to the exact cell size, so zooming does not repaint them all
  function markSpr(m, s, bad) {
    const q = Math.max(8, Math.ceil(s / 4) * 4);
    return sprite(`m${m}${bad ? 1 : 0}|${q}`, q, q, () => mark(0, 0, q, m, 1, bad));
  }
  // a wrong mark found by "Controleer": red diagonal stripes and a red frame
  function hatchSpr(s) {
    const q = Math.max(8, Math.ceil(s / 4) * 4);
    return sprite(`h|${q}`, q, q, () => {
      g.save(); g.beginPath(); g.rect(1, 1, q - 2, q - 2); g.clip();
      g.fillStyle = 'rgba(224,72,72,.16)'; g.fillRect(0, 0, q, q);
      g.strokeStyle = 'rgba(214,58,58,.7)'; g.lineWidth = Math.max(1.5, q * .085); g.beginPath();
      for (let k = -q; k < q * 2; k += q / 4.5) { g.moveTo(k, q); g.lineTo(k + q, 0); }
      g.stroke(); g.restore();
      g.strokeStyle = C.chk; g.lineWidth = Math.max(2, q * .08); g.strokeRect(2, 2, q - 4, q - 4);
    });
  }
  function fitText(t, w) { if (measure(t) <= w) return t; while (t.length > 1 && measure(t + '…') > w) t = t.slice(0, -1); return t + '…'; }
  function label(it, x, y, maxW, fs, align, bold) {
    g.font = `${bold ? 800 : 600} ${fs}px ${FONT}`; g.textBaseline = 'middle';
    let sw = it.sw ? fs + 4 : 0, txt = fitText(labText(it), maxW - sw), w = measure(txt) + sw, sx = align === 'right' ? x - w : x;
    if (it.sw) { g.fillStyle = it.sw; g.beginPath(); g.arc(sx + fs * .45, y, fs * .42, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); }
    g.fillStyle = bold ? '#1a140e' : C.ink; g.textAlign = 'left'; g.fillText(txt, sx + sw, y + .5);
  }
  // a column label: the emoji (or colour) upright just above the grid, the word rotated above it
  function colLabel(it, cx, yb, maxH, fs, bold) {
    let y = yb;
    if (it.em || it.sw) {
      const s = fs + 3;
      if (it.sw) { g.fillStyle = it.sw; g.beginPath(); g.arc(cx, y - s / 2, fs * .42, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); }
      else { g.font = `${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink; g.fillText(it.em, cx, y - s / 2 + 1); }
      y -= s + 3;
    }
    g.save(); g.translate(cx, y); g.rotate(-Math.PI / 2); g.font = `${bold ? 800 : 600} ${fs}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = bold ? '#1a140e' : C.ink;
    g.fillText(fitText(it.sh, maxH - (yb - y)), 0, .5); g.restore();
  }
  const ease = t => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function mark(x, y, s, m, k, bad) {
    const cx = x + s / 2, cy = y + s / 2;
    if (bad) { g.fillStyle = C.badBg; g.fillRect(x + 1, y + 1, s - 2, s - 2); }
    if (!m) return;
    g.save(); g.translate(cx, cy); g.scale(k, k);
    if (m === YES) {
      g.fillStyle = bad ? C.bad : C.yes; g.beginPath(); g.arc(0, 0, s * .32, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, s * .085); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-s * .14, s * .01); g.lineTo(-s * .04, s * .11); g.lineTo(s * .15, -s * .1); g.stroke();
    } else {
      const d = s * (m === AUTO ? .16 : .2); g.strokeStyle = bad ? C.bad : m === AUTO ? C.auto : C.no; g.lineWidth = Math.max(1.5, s * (m === AUTO ? .055 : .075)); g.lineCap = 'round';
      g.beginPath(); g.moveTo(-d, -d); g.lineTo(d, d); g.moveTo(d, -d); g.lineTo(-d, d); g.stroke();
    }
    g.restore();
  }
  /* Lijnen: connect the ✓'s that belong together. ✓'s of the same name (row) are joined sideways, ✓'s of the same item (column)
     up and down; every group of things that are already tied together gets its own colour and a ring around its ✓'s */
  const PAL = ['#e4572e', '#2e7dd7', '#8e44ad', '#12a07f', '#d48a00', '#c2185b'];
  let LN = { segs: 0, groups: 0, corners: 0 };
  function drawLines() {
    const P = S.P, T = P.K * P.N, mk = S.mk, par = new Map(), root = x => { while (par.get(x) !== x) x = par.get(x); return x; };
    const yes = [];
    for (const [a, b] of Core.pairs(P)) if (mk[a * T + b] === YES) {
      yes.push([a, b]); for (const x of [a, b]) if (!par.has(x)) par.set(x, x);
      const ra = root(a), rb = root(b); if (ra !== rb) par.set(ra, rb);
    }
    LN = { segs: 0, groups: 0, corners: 0 };
    if (yes.length < 2) return;
    const rows = new Map(), cols = new Map(), size = new Map();
    for (const [a] of yes) size.set(root(a), (size.get(root(a)) || 0) + 1);
    for (const [a, b] of yes) {
      const q = blockOf(a, b), r = cellRect(a, b), c = { x: r.x + r.s / 2, y: r.y + r.s / 2, g: root(a) };
      if (!rows.has(q.a)) rows.set(q.a, []); rows.get(q.a).push(c);
      if (!cols.has(q.b)) cols.set(q.b, []); cols.get(q.b).push(c);
    }
    const groups = [...size.keys()].filter(k => size.get(k) > 1).sort((x, y) => x - y), colr = k => PAL[groups.indexOf(k) % PAL.length];
    const rad = V.cs * .36;
    g.save(); g.lineCap = 'round'; g.lineWidth = Math.max(2.5, V.cs * .1); g.globalAlpha = .8;
    const seg = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy); if (L < rad * 2.2) return; const ux = dx / L, uy = dy / L; g.beginPath(); g.moveTo(p.x + ux * rad, p.y + uy * rad); g.lineTo(q.x - ux * rad, q.y - uy * rad); g.stroke(); LN.segs++; };
    for (const [list, key] of [[rows, 'x'], [cols, 'y']]) for (const L of list.values()) {
      if (L.length < 2) continue;
      L.sort((p, q) => p[key] - q[key]); g.strokeStyle = colr(L[0].g);
      for (let k = 1; k < L.length; k++) seg(L[k - 1], L[k]);
    }
    // hoeklijnen: a thing that is both a column (top) and a row (left) gets an L-shaped line through the empty corner of the grid
    for (const [it, R] of rows) {
      const Cl = cols.get(it); if (!Cl || !Cl.length || !R.length) continue;
      const rr = R.reduce((m, c) => c.x > m.x ? c : m), cc = Cl.reduce((m, c) => c.y > m.y ? c : m), corner = { x: cc.x, y: rr.y };
      if (corner.x <= rr.x || corner.y <= cc.y) continue;
      const r0 = Math.min(V.cs * .6, (corner.x - rr.x) / 2, (corner.y - cc.y) / 2);
      g.strokeStyle = colr(rr.g); g.setLineDash([V.cs * .22, V.cs * .14]);
      g.beginPath(); g.moveTo(rr.x + rad, rr.y); g.arcTo(corner.x, corner.y, corner.x, cc.y, r0); g.lineTo(cc.x, cc.y + rad); g.stroke(); g.setLineDash([]);
      LN.corners++;
    }
    g.globalAlpha = 1; g.lineWidth = Math.max(2, V.cs * .07);
    for (const [a, b] of yes) { const k = root(a); if (size.get(k) < 2) continue; const r = cellRect(a, b); g.strokeStyle = colr(k); g.beginPath(); g.arc(r.x + r.s / 2, r.y + r.s / 2, rad, 0, 7); g.stroke(); }
    g.restore(); LN.groups = groups.length;
  }
  const DS = { n: 0, ms: 0, max: 0 };
  function draw() {
    raf = 0;
    if (!S || !Lay || current !== 'lg') return;
    const t0 = now();
    const t = now(), P = S.P, N = P.N, T = P.K * N, cs = V.cs, B = base(), st = step(), mk = S.mk;
    const x0 = B.x + Lay.leftW, y0 = B.y + Lay.topH, cw = contentW();
    const cardW = Math.min(V.W - B.x - 4, Lay.leftW + cw + 2), cardH = Math.min(V.H - B.y - 4, Lay.topH + cw + 2);
    g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); g.clearRect(0, 0, V.W, V.H);
    g.fillStyle = 'rgba(0,0,0,.16)'; rr(B.x - 2, B.y + 1, cardW + 4, cardH + 6, 14); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; rr(B.x, B.y + 2, cardW, cardH + 2, 12); g.fill();
    g.fillStyle = C.paper; rr(B.x, B.y, cardW, cardH, 12); g.fill();
    const hs2 = hintS && hintS.stage === 2 ? hintS : null, selRow = sel ? blockOf(sel.a, sel.b) : null, hb = hs2 ? blockOf(hs2.a, hs2.b) : null;
    const refSet = new Set((hs2 && hs2.refs || []).map(([p, q]) => { const z = blockOf(p, q); return z.a * T + z.b; }));
    let animating = false;
    // ---- cells ----
    g.save(); g.beginPath(); g.rect(x0, y0, cardW - Lay.leftW, cardH - Lay.topH); g.clip();
    for (let ri = 0; ri < Lay.rows.length; ri++) for (let ci = 0; ci + ri <= Lay.K - 2; ci++) {
      const bx = x0 + V.ox + ci * st, by = y0 + V.oy + ri * st, RC = Lay.rows[ri], CC = Lay.cols[ci];
      if (bx > V.W || by > V.H || bx + N * cs < x0 || by + N * cs < y0) continue;
      g.fillStyle = (ri + ci) % 2 ? C.paper2 : C.paper; g.fillRect(bx, by, N * cs, N * cs);
      if (selRow) {
        g.fillStyle = C.sel;
        if (RC === Lay.rows[selRow.ri] && sel.only !== 'col') g.fillRect(bx, by + selRow.r * cs, N * cs, cs);
        if (CC === Lay.cols[selRow.ci] && sel.only !== 'row') g.fillRect(bx + selRow.c * cs, by, cs, N * cs);
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const a = RC * N + r, b = CC * N + c, x = bx + c * cs, y = by + r * cs, key = a * T + b;
        if (refSet.has(key)) { g.fillStyle = C.ref; g.fillRect(x, y, cs, cs); }
        if (hb && hb.a === a && hb.b === b) { g.fillStyle = C.hint; g.fillRect(x, y, cs, cs); }
        let k = 1; const an = anim.get(key);
        if (an) { const p = (t - an[0] - an[1]) / 170; if (p >= 1) anim.delete(key); else { animating = true; k = p < 0 ? (an[2] ? 0 : 1) : ease(p); } }
        const m = mk[key], wrong = m && (opt.err || (S.chk && S.chk.has(key))) && Core.wrongMark(P, mk, a, b), bad = opt.err && wrong, hatch = wrong && S.chk && S.chk.has(key);
        if (bad) { g.fillStyle = C.badBg; g.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
        if (hatch) g.drawImage(hatchSpr(cs), x, y, cs, cs);
        if (m && k > .01) { const sp = markSpr(m, cs, bad); if (k === 1) g.drawImage(sp, x, y, cs, cs); else { const d = cs * k; g.drawImage(sp, x + (cs - d) / 2, y + (cs - d) / 2, d, d); } }
      }
      g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < N; i++) { g.moveTo(bx + i * cs + .5, by); g.lineTo(bx + i * cs + .5, by + N * cs); g.moveTo(bx, by + i * cs + .5); g.lineTo(bx + N * cs, by + i * cs + .5); }
      g.stroke(); g.strokeStyle = C.block; g.lineWidth = 2; g.strokeRect(bx, by, N * cs, N * cs);
    }
    if (opt.lines) drawLines();
    g.restore();
    // ---- column headers (they follow the grid sideways and stay on top) ----
    const lf = Math.round(Math.min(Lay.fs, Math.max(8, cs * .58)));
    g.save(); g.beginPath(); g.rect(x0 - 1, B.y, cardW - Lay.leftW + 1, Lay.topH); g.clip();
    for (let ci = 0; ci < Lay.cols.length; ci++) {
      const bx = x0 + V.ox + ci * st, cat = P.cats[Lay.cols[ci]];
      g.fillStyle = 'rgba(77,65,52,.08)'; g.fillRect(bx, B.y + 3, N * cs, Lay.cat - 4);
      g.font = `800 ${Lay.fs - 2}px ${FONT}`; g.fillStyle = C.head; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fitText(cat.label.toUpperCase(), N * cs - 6), bx + N * cs / 2, B.y + Lay.cat / 2 + 1.5);
      for (let c = 0; c < N; c++) {
        const on = selRow && sel.only !== 'row' && selRow.ci === ci && selRow.c === c, hh = hb && hb.ci === ci && hb.c === c;
        if (on || hh) { g.fillStyle = hh ? C.hint : C.selH; g.fillRect(bx + c * cs + 1, B.y + Lay.cat, cs - 2, Lay.topH - Lay.cat - 2); }
        colLab(cat.items[c], bx + (c + .5) * cs, y0 - 5, Lay.topH - Lay.cat - 9, lf, on || hh);
        if (c) { g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + c * cs + .5, B.y + Lay.cat + 4); g.lineTo(bx + c * cs + .5, y0); g.stroke(); }
      }
    }
    g.restore();
    // ---- row headers ----
    g.save(); g.beginPath(); g.rect(B.x, y0 - 1, Lay.leftW, cardH - Lay.topH + 1); g.clip();
    for (let ri = 0; ri < Lay.rows.length; ri++) {
      const by = y0 + V.oy + ri * st, cat = P.cats[Lay.rows[ri]];
      g.fillStyle = 'rgba(77,65,52,.08)'; g.fillRect(B.x + 3, by, Lay.cat - 4, N * cs);
      g.save(); g.translate(B.x + Lay.cat / 2 + 1.5, by + N * cs / 2); g.rotate(-Math.PI / 2); g.font = `800 ${Lay.fs - 2}px ${FONT}`; g.fillStyle = C.head; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fitText(cat.label.toUpperCase(), N * cs - 6), 0, 0); g.restore();
      for (let r = 0; r < N; r++) {
        const on = selRow && sel.only !== 'col' && selRow.ri === ri && selRow.r === r, hh = hb && hb.ri === ri && hb.r === r;
        if (on || hh) { g.fillStyle = hh ? C.hint : C.selH; g.fillRect(B.x + Lay.cat, by + r * cs + 1, Lay.leftW - Lay.cat - 2, cs - 2); }
        rowLab(cat.items[r], x0 - 6, by + (r + .5) * cs, Lay.leftW - Lay.cat - 10, lf, on || hh);
        if (r) { g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(B.x + Lay.cat + 4, by + r * cs + .5); g.lineTo(x0, by + r * cs + .5); g.stroke(); }
      }
    }
    g.restore();
    // ---- frame lines and the corner ----
    g.strokeStyle = C.block; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, B.y + 6); g.lineTo(x0, B.y + cardH - 6); g.moveTo(B.x + 6, y0); g.lineTo(B.x + cardW - 6, y0); g.stroke();
    g.font = `${Math.min(Lay.leftW, Lay.topH) * .38}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = .55; g.fillText('🔎', B.x + Lay.leftW / 2, B.y + Lay.topH / 2); g.globalAlpha = 1;
    // hint pulse ring (a CSS animation on top: no canvas loop needed)
    if (hs2) { const r = cellRect(hs2.a, hs2.b); pulse.style.cssText = `display:block;left:${r.x - 3}px;top:${r.y - 3}px;width:${r.s + 6}px;height:${r.s + 6}px`; pulse.classList.toggle('off', r.x < x0 - 1 || r.y < y0 - 1 || r.x > V.W || r.y > V.H); }
    else pulse.style.display = 'none';
    if (animating || t < animEnd) raf = requestAnimationFrame(draw);
    const dt = now() - t0; DS.n++; DS.ms += dt; DS.max = Math.max(DS.max, dt);
  }
  const popCell = (a, b, delay = 0, grow = false) => { const z = blockOf(a, b), T = S.P.K * S.P.N; anim.set(z.a * T + z.b, [now(), delay, grow]); animEnd = Math.max(animEnd, now() + delay + 200); };

  /* ---------- touch: tap (cycle the mark), long press (✓), drag (pan), pinch (zoom) ---------- */
  const ptrs = new Map(); let gest = null, lpT = 0;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    if (!S || busy) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = pos(e); ptrs.set(e.pointerId, p); clearTimeout(lpT);
    if (ptrs.size === 1) {
      gest = { k: 'tap', x0: p.x, y0: p.y, ox: V.ox, oy: V.oy };
      const h = hit(p.x, p.y);
      if (h && h.k === 'cell' && !S.done) lpT = setTimeout(() => { if (gest && gest.k === 'tap') { gest.k = 'lp'; const cur = S.mk[h.a * S.P.K * S.P.N + h.b]; doMark(h.a, h.b, cur === YES ? 0 : YES); vibrate(20); } }, 480);
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()]; gest = { k: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, cs0: V.cs, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ox: V.ox, oy: V.oy };
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !gest) return;
    const p = pos(e); ptrs.set(e.pointerId, p);
    if (gest.k === 'tap' && Math.hypot(p.x - gest.x0, p.y - gest.y0) > 9) { gest.k = 'pan'; clearTimeout(lpT); }
    if (gest.k === 'pan') { V.ox = gest.ox + p.x - gest.x0; V.oy = gest.oy + p.y - gest.y0; clampPan(); need(); }
    else if (gest.k === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      V.ox = gest.ox + mx - gest.mx; V.oy = gest.oy + my - gest.my; clampPan();
      setZoom(gest.cs0 * d / gest.d0, mx, my); gest.ox = V.ox - (mx - gest.mx); gest.oy = V.oy - (my - gest.my); gest.cs0 = V.cs; gest.d0 = d;
    }
  });
  const up = (e, cancel) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); clearTimeout(lpT);
    if (gest && gest.k === 'tap' && !cancel && !ptrs.size) onTap(gest.x0, gest.y0);
    if (!ptrs.size) gest = null; else if (gest && gest.k === 'pinch') gest = { k: 'done' };
  };
  cv.addEventListener('pointerup', e => up(e)); cv.addEventListener('pointercancel', e => up(e, true));
  cv.addEventListener('wheel', e => { if (!S || !Lay) return; e.preventDefault(); const p = pos(e); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) setZoom(V.cs * Math.exp(-e.deltaY / 400), p.x, p.y); }, { passive: false });
  function onTap(x, y) {
    const h = hit(x, y); if (!h) return;
    if (h.k === 'cell') {
      if (S.done) return;
      const cur = S.mk[h.a * S.P.K * S.P.N + h.b];
      doMark(h.a, h.b, Core.nextMark(cur, opt.tap, opt.pen));
    } else {
      const P = S.P, c = Core.catOf(P, h.g), it = Core.itemOf(P, h.g);
      toast(`${esc(P.cats[c].label)}: <b>${esc(it.em ? it.em + ' ' : '')}${esc(Core.nm(P, h.g))}</b>`);
      sel = h.k === 'row' ? { a: h.g, b: Lay.cols[0] * P.N, only: 'row' } : { a: 0, b: h.g, only: 'col' };
      sfx('lgTap'); need();
    }
  }
  function toast(html, ms = 1600) { const t = $('#lgToast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

  /* ---------- playing ---------- */
  function doMark(a, b, v) {
    if (!S || S.done || busy) return;
    const ch = Core.setMark(S.P, S.mk, a, b, v, opt.auto);
    sel = { a, b };
    if (!ch.length) { need(); return; }
    S.undo.push(ch); if (S.undo.length > 400) { S.undo.shift(); S.trimmed = true; } S.redo = [];
    for (const [x, y, , n] of ch) popCell(x, y, x === a && y === b ? 0 : 40, !!n);
    sfx(v === YES ? 'lgV' : v ? 'lgX' : 'lgClr'); if (v === YES) vibrate(12);
    hideHint();
    changed();
  }
  function changed() { renderSide(); need(); saveSoon(); if (Core.isSolved(S.P, S.mk)) win(); }
  function undo() { if (!S || S.done || !S.undo.length) return; const ch = S.undo.pop(); Core.undoChanges(S.P, S.mk, ch); S.redo.push(ch); for (const [x, y] of ch) popCell(x, y); sfx('lgUndo'); hideHint(); changed(); }
  function redo() { if (!S || S.done || !S.redo.length) return; const ch = S.redo.pop(); Core.redoChanges(S.P, S.mk, ch); S.undo.push(ch); for (const [x, y] of ch) popCell(x, y); sfx('lgUndo'); hideHint(); changed(); }
  function restart() { if (!S || S.done) return; S.mk = Core.newMarks(S.P); S.undo = []; S.redo = []; S.struck = []; S.trimmed = false; sel = null; hideHint(); anim.clear(); renderAll(); save(); }
  function doHint() {
    if (!S || S.done || busy) return;
    const h = Core.hint(S.P, S.mk); if (!h) return;
    const same = hintS && hintS.a === h.a && hintS.b === h.b && hintS.k === h.k;
    if (!same) { S.hints++; stats.hints++; saveStats(); }
    // two steps: first a tip (where to look, without the answer), then on "Leg uit" (or Hint again) the full reasoning
    h.stage = h.k === 'err' || !h.tip ? 2 : same && hintS.stage >= 1 ? 2 : 1;
    hintS = h; sel = null; showTip();
  }
  function showTip() {
    const h = hintS; if (!h) return;
    $('#lgTipText').innerHTML = h.k === 'err' ? '⚠️ ' + esc(h.text) : h.stage === 1 ? `<b class="lg-tipname">🔎 ${esc(h.name)}</b>${esc(h.tip)}` : `<b class="lg-tipname">💡 ${esc(h.name)}</b>${esc(h.text)}`;
    $('#lgTipGo').textContent = h.k === 'err' ? 'Weghalen' : h.stage === 1 ? 'Leg uit' : h.v === YES ? 'Zet ✓' : 'Zet ✗';
    $('#lgTip').classList.add('show'); scr.classList.add('tipping'); if (scr.classList.contains('lg-col')) { scr.classList.remove('lg-col'); setTimeout(() => { layout(true); need(); }, 30); }
    if (h.clue >= 0 && tab !== 'c') setTab('c');
    if (h.stage === 2) reveal(h.a, h.b); renderSide();
    if (h.clue >= 0) { const li = $(`#lgClues li[data-i="${h.clue}"]`); if (li) { const pn = $('#lgPanel'); pn.scrollTop = Math.max(0, li.offsetTop - pn.offsetTop - 4); } }
    sfx('lgHint'); need(); saveSoon();
  }
  // Controleer: compare every mark with the solution and hatch the wrong ones (they stay hatched until fixed)
  function doCheck() {
    if (!S || S.done || busy) return;
    hideHint(); sel = null;
    const P = S.P, T = P.K * P.N, bad = []; let filled = 0;
    for (const [a, b] of Core.pairs(P)) { if (!S.mk[a * T + b]) continue; filled++; if (Core.wrongMark(P, S.mk, a, b)) bad.push([a, b]); }
    S.chk = new Set(); for (const [a, b] of bad) { S.chk.add(a * T + b); S.chk.add(b * T + a); }
    if (filled) { S.checks = (S.checks || 0) + 1; stats.checks = (stats.checks || 0) + 1; saveStats(); }
    if (!filled) { toast('Je hebt nog niets ingevuld.'); sfx('lgTap'); }
    else if (!bad.length) { toast(`✓ Alles klopt! ${filled} ${filled === 1 ? 'vakje' : 'vakjes'} ingevuld, geen fouten.`, 2200); sfx('lgOk'); }
    else {
      bad.forEach(([a, b], i) => popCell(a, b, i * 40, true));
      const vis = bad.some(([a, b]) => { const r = cellRect(a, b), B = base(); return r.x >= B.x + Lay.leftW && r.y >= B.y + Lay.topH && r.x + r.s <= V.W && r.y + r.s <= V.H; });
      if (!vis) reveal(bad[0][0], bad[0][1]);
      toast(`⚠️ ${bad.length} ${bad.length === 1 ? 'fout' : 'fouten'} gevonden: ${bad.length === 1 ? 'het vakje is' : 'de vakjes zijn'} rood gearceerd.`, 2600); sfx('lgBad'); vibrate(20);
    }
    need(); saveSoon();
  }
  function applyHint() { const h = hintS; if (!h) return; hideHint(); doMark(h.a, h.b, h.k === 'err' ? 0 : h.v); }
  function hideHint() { if (!hintS) return; hintS = null; $('#lgTip').classList.remove('show'); scr.classList.remove('tipping'); renderSide(); need(); }
  function win() {
    const P = S.P, T = P.K * P.N; S.done = true; hideHint(); sel = null;
    let k = 0;
    for (const [a, b] of Core.pairs(P)) {
      const want = P.ent[a] === P.ent[b] ? YES : (S.mk[a * T + b] === NO ? NO : AUTO);
      if (S.mk[a * T + b] !== want) { S.mk[a * T + b] = S.mk[b * T + a] = want; popCell(a, b, 30 + (k++ % 40) * 18, true); }
    }
    const lvl = S.lvl, t = Math.floor(S.t), best = stats.best[lvl];
    S.newBest = best == null || t < best; if (S.newBest) stats.best[lvl] = t;
    stats.won++; stats.wonBy[lvl] = (stats.wonBy[lvl] || 0) + 1; stats.time += t;
    if (!S.hints && !S.checks) { stats.noHint++; if (lvl === 'moeilijk' || lvl === 'expert') stats.hardNoHint++; }
    if (lvl === 'expert') stats.expert++;
    if (S.daily) { if (!stats.daily[S.daily]) stats.dailyWon++; stats.daily[S.daily] = Math.min(stats.daily[S.daily] || 1e9, t); const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()]; }
    saveStats(); store.del('lg.save'); renderAll(); sfx('lgWin'); vibrate(30);
    clearTimeout(winT); winT = setTimeout(() => { if (current === 'lg' && S && S.done) openEnd(); }, 1400);
  }
  let winT = 0;

  /* ---------- side panel: tools, clues, summary ---------- */
  function renderSide() {
    if (!S) return;
    const P = S.P, n = P.clues.length, left = P.clues.filter((k, i) => !S.struck[i]).length;
    $('#lgTabC').innerHTML = `Aanwijzingen <small>${left === n ? n : left + '/' + n}</small>`;
    const ol = $('#lgClues');
    if (ol.children.length !== n || ol._p !== P) { ol.innerHTML = P.clues.map((k, i) => `<li data-i="${i}"><b>${i + 1}</b><span>${esc(k.txt)}</span></li>`).join(''); ol._p = P; }
    [...ol.children].forEach((li, i) => { li.classList.toggle('done', !!S.struck[i]); li.classList.toggle('hint', !!hintS && hintS.clue === i); });
    if (tab === 's') renderSum();
    $('#lgUndo').disabled = !S.undo.length || S.done; $('#lgRedo').disabled = !S.redo.length || S.done;
    const pen = $('#lgPen'); pen.hidden = opt.tap !== 'kies'; pen.innerHTML = `<b>${opt.pen === YES ? '✓' : '✗'}</b><small>Teken</small>`; pen.classList.toggle('yes', opt.pen === YES);
    $('#lgHintB').disabled = !!S.done; $('#lgCheck').disabled = !!S.done; $('#lgLines').classList.toggle('on', !!opt.lines);
  }
  function itemHtml(P, gi) { const it = Core.itemOf(P, gi); return (it.sw ? `<i class="lg-sw" style="background:${it.sw}"></i>` : it.em ? `<span class="lg-em">${it.em}</span>` : '') + esc(it.sh); }
  function renderSum() {
    const P = S.P, sm = Core.summary(P, S.mk);
    const found = sm.reduce((n, r) => n + r.slice(1).filter(v => v >= 0).length, 0), all = P.N * (P.K - 1);
    $('#lgSum').innerHTML = `<p class="lg-sumtop">${found === all ? '✓ Alles gevonden!' : `${found} van de ${all} gevonden`}</p><table><thead><tr>${P.cats.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>`
      + sm.map(r => `<tr>${r.map((gi, ci) => ci ? `<td class="${gi < 0 ? 'q' : ''}">${gi < 0 ? '?' : itemHtml(P, gi)}</td>` : `<th>${esc(P.cats[0].items[gi].n)}</th>`).join('')}</tr>`).join('') + '</tbody></table>';
  }
  function setTab(t, user) {
    if (user && t === tab && innerWidth <= innerHeight) { scr.classList.toggle('lg-col'); setTimeout(() => { layout(true); need(); }, 30); return; }
    tab = t; scr.classList.remove('lg-col');
    $('#lgTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    $('#lgClues').hidden = t !== 'c'; $('#lgSum').hidden = t !== 's';
    renderSide(); setTimeout(() => { layout(true); need(); }, 30);
  }
  function renderHud() { if (!S) return; $('#lgTitle').textContent = LV[S.lvl].name + (S.daily ? ' · dagpuzzel' : ''); $('#lgTime').textContent = fmt(S.t); }
  function renderAll() { renderHud(); renderSide(); layout(true); need(); }
  $('#lgClues').addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (!li || !S) return; const i = +li.dataset.i; S.struck[i] = !S.struck[i]; sfx('lgStrike'); renderSide(); saveSoon(); });
  $('#lgTabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) { sfx('lgTap'); setTab(b.dataset.t, true); } });
  $('#lgTools').addEventListener('click', e => {
    const b = e.target.closest('button[data-b]'); if (!b || !S) return;
    const k = b.dataset.b;
    if (k === 'undo') undo(); else if (k === 'redo') redo(); else if (k === 'hint') doHint(); else if (k === 'check') doCheck();
    else if (k === 'pen') { opt.pen = opt.pen === YES ? NO : YES; saveOpt(); sfx('lgTap'); renderSide(); }
    else if (k === 'lines') { opt.lines = !opt.lines; saveOpt(); sfx('lgTap'); renderSide(); need(); toast(opt.lines ? 'Lijnen aan: ✓\'s die bij elkaar horen, zijn verbonden' : 'Lijnen uit', 1600); }
    else if (k === 'fit') { const toFit = !(V.cs <= Lay.fitAll + .5); V.fit = toFit; V.cs = toFit ? Lay.fitAll : Lay.cs0; V.ox = 0; V.oy = 0; clampPan(); $('#lgFit').classList.toggle('on', toFit && Lay.fitAll < Lay.cs0 - .5); sfx('lgTap'); need(); }
  });
  $('#lgTipGo').addEventListener('click', () => { if (hintS && hintS.stage === 1) { hintS.stage = 2; sfx('lgTap'); showTip(); saveSoon(); } else applyHint(); });
  $('#lgTipX').addEventListener('click', () => { sfx('lgTap'); hideHint(); });

  /* ---------- the clock: only while you are really playing ---------- */
  function tick() {
    const t = now(), dt = clamp((t - lastTick) / 1000, 0, 1); lastTick = t;
    if (current !== 'lg' || !S || S.done || busy || anyModal() || document.hidden || !Number.isFinite(dt)) return;
    const s0 = Math.floor(S.t); S.t = (Number.isFinite(S.t) ? S.t : 0) + dt;
    if (Math.floor(S.t) !== s0) { $('#lgTime').textContent = fmt(S.t); if (Math.floor(S.t) % 10 === 0) save(); }
  }

  /* ---------- new puzzles: made in small slices so the screen keeps moving ---------- */
  function startNew(lvl, daily, fixedSeed) {
    closeModals(); hideHint(); clearTimeout(winT);
    busy = true; scr.classList.add('busy'); $('#lgBusy').classList.add('show');
    const d = daily ? Core.dailyFor(daily) : null, L = d ? d.lvl : lvl, seed = d ? d.seed : fixedSeed != null ? fixedSeed >>> 0 : (Math.random() * 4294967296) >>> 0;
    const it = Core.genIter(L, seed), t0 = now(); let spent = 0;
    const run = () => {
      if (!busy) return;
      let r; const end = now() + 10;
      try { do { r = it.next(); } while (!r.done && now() < end); } catch (e) { console.error(e); busy = false; scr.classList.remove('busy'); $('#lgBusy').classList.remove('show'); return; }
      spent += now() - (end - 10);
      if (!r.done) { setTimeout(run, 0); return; }
      lastGen = Math.round(spent); window.__lgGenWall = Math.round(now() - t0);
      S = { P: r.value, mk: Core.newMarks(r.value), t: 0, hints: 0, checks: 0, chk: new Set(), undo: [], redo: [], struck: [], daily: daily || null, lvl: L, done: false };
      stats.played++; saveStats();
      busy = false; scr.classList.remove('busy'); $('#lgBusy').classList.remove('show');
      sel = null; anim.clear(); V.ready = false; V.fit = false; tab = 'c'; setTab('c');
      renderAll(); save(); sfx('lgNew');
    };
    setTimeout(run, 40);
  }

  /* ---------- save / resume ---------- */
  function save() {
    clearTimeout(saveT); saveT = 0;
    if (!S || S.done) return;
    try { store.set('lg.save', { v: 1, P: S.P, mk: Core.packMarks(S.P, S.mk), t: Math.floor(S.t * 10) / 10, hints: S.hints, checks: S.checks || 0, chk: S.chk ? [...S.chk] : [], undo: S.undo.slice(-150), redo: S.redo.slice(-150), struck: S.struck, daily: S.daily, lvl: S.lvl, trimmed: S.trimmed || S.undo.length > 150 }); } catch (e) {}
  }
  const saveSoon = () => { if (!saveT) saveT = setTimeout(save, 500); };
  function load() {
    const d = store.get('lg.save', null);
    try {
      if (!d || d.v !== 1 || !d.P || !d.P.clues || !LV[d.lvl]) return null;
      const P = d.P, T = P.K * P.N;
      if (P.ent.length !== T || P.cats.length !== P.K || P.cats.some(c => c.items.length !== P.N)) return null;
      const ok = ch => Array.isArray(ch) && ch.every(c => Array.isArray(c) && c.length === 4 && c.every(v => Number.isInteger(v)) && c[0] < T && c[1] < T);
      return { P, mk: Core.unpackMarks(P, d.mk), t: Number.isFinite(d.t) ? d.t : 0, hints: d.hints | 0, checks: d.checks | 0, chk: new Set((Array.isArray(d.chk) ? d.chk : []).filter(k => Number.isInteger(k) && k >= 0 && k < T * T)), undo: (d.undo || []).filter(ok), redo: (d.redo || []).filter(ok), struck: Array.isArray(d.struck) ? d.struck : [], daily: d.daily || null, lvl: d.lvl, done: false, trimmed: !!d.trimmed };
    } catch (e) { return null; }
  }

  /* ---------- dialogs: start, menu, solved ---------- */
  const OPTS = [['tap', 'Tikken op een vakje', [['xv', '✗ → ✓ → leeg'], ['vx', '✓ → ✗ → leeg'], ['kies', 'Zelf kiezen']]], ['auto', 'Automatisch wegstrepen bij ✓'], ['err', 'Fouten meteen tonen'], ['sound', 'Geluidseffecten'], ['music', 'Achtergrondmuziek']];
  const optRows = () => OPTS.map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${(ch || [[true, 'Aan'], [false, 'Uit']]).map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  function onOpt(e, again) { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); Sfx.refresh && Sfx.refresh(); sfx('lgTap'); again(); renderSide(); need(); }
  const HELP = `<details class="lg-help"><summary>Hoe speel je?</summary><ul>
    <li>Bij elke persoon hoort precies één ding van elke soort, en niemand heeft hetzelfde. Zoek uit wat bij wie hoort.</li>
    <li>Elk blokje van het rooster koppelt twee soorten, bijvoorbeeld namen en huisdieren. <b>✓</b> = hoort bij elkaar, <b>✗</b> = hoort niet bij elkaar.</li>
    <li>Tik op een vakje om ✗, ✓ of leeg te zetten. <b>Lang drukken</b> zet meteen een ✓. Bij een ✓ worden de andere vakjes in die rij en kolom van het blokje vanzelf weggestreept.</li>
    <li>Lees de aanwijzingen goed en tik op een aanwijzing om hem door te strepen als je hem gebruikt hebt. Weet je iets via een ✓ in een ander blokje? Neem het over!</li>
    <li>Elke puzzel heeft precies één oplossing. Je hoeft nooit te gokken: goed nadenken is genoeg.</li>
    <li><b>🔗 Lijnen</b> verbindt de ✓'s die bij elkaar horen: zijwaarts bij dezelfde naam, op en neer bij hetzelfde ding. Staat een ding zowel boven als links in het rooster, dan verbindt een gestippelde hoeklijn door het lege deel die twee plekken. Elke groep die al vastligt, krijgt een eigen kleur.</li>
    <li>Twijfel je of alles klopt? <b>☑ Controleer</b> vergelijkt wat je hebt ingevuld met de oplossing en arceert foute ✓ en ✗ in rood. Verbeter je het vakje, dan verdwijnt de arcering.</li>
    <li>Vast? <b>💡 Hint</b> laat de volgende stap zien en vertelt waarom. Bij <b>Overzicht</b> zie je wat je al gevonden hebt.</li>
    <li>Schuif met één vinger over het rooster en knijp met twee vingers om in of uit te zoomen. Tik op een naam boven of naast het rooster om hem helemaal te lezen.</li></ul></details>`;
  function openStart() {
    closeModals(); hideHint();
    const has = S && !S.done, d = today(), dl = Core.dailyFor(d), dd = stats.daily[d];
    const cont = $('#lgCont'); cont.hidden = !has;
    if (has) cont.innerHTML = `<span><b>Verder spelen</b><small>${LV[S.lvl].name}${S.daily ? ' · dagpuzzel' : ''} · ⏱ ${fmt(S.t)}</small></span><em>Verder ▶</em>`;
    const dn = new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#lgDaily').className = dd != null ? 'done' : '';
    $('#lgDaily').innerHTML = `<span class="lg-dico">📅</span><span class="lg-dtx"><b>Puzzel van de dag</b><small>${dn} · ${LV[dl.lvl].name}</small></span><em>${dd != null ? '✓ ' + fmt(dd) : 'Spelen'}</em>`;
    $('#lgLevels').innerHTML = Core.LVL_KEYS.map(k => { const L = LV[k], b = stats.best[k]; return `<button data-l="${k}" class="${opt.lvl === k ? 'on' : ''}"><b>${L.name}</b><small>${L.K} soorten × ${L.N}</small><small>${LDESC[k]}</small><span>${b != null ? '⏱ ' + fmt(b) : '–'}</span></button>`; }).join('');
    $('#lgOpts').innerHTML = optRows(); $('#lgHelpS').innerHTML = HELP;
    $('#lgStats').innerHTML = [['Opgelost', stats.won], ['Zonder hint', stats.noHint], ['Dagpuzzels', stats.dailyWon]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    openModal('lgStartModal');
  }
  function openMenu() {
    if (!S) { openStart(); return; }
    hideHint(); $('#lgMOpts').innerHTML = optRows(); $('#lgHelpM').innerHTML = HELP; $('#lgMRestart').disabled = !!S.done;
    $('#lgMInfo').textContent = `${LV[S.lvl].name}${S.daily ? ' · puzzel van de dag' : ''} · ${S.P.K} soorten × ${S.P.N} · ⏱ ${fmt(S.t)} · ${S.hints} ${S.hints === 1 ? 'hint' : 'hints'}${S.checks ? ` · ${S.checks}× gecontroleerd` : ''}`;
    openModal('lgMenuModal'); sfx('lgTap');
  }
  function openEnd() {
    const L = LV[S.lvl], t = Math.floor(S.t), b = stats.best[S.lvl];
    $('#lgEndTitle').textContent = S.daily ? 'Puzzel van de dag opgelost!' : 'Logigram opgelost!';
    $('#lgEndText').innerHTML = `${L.name} in <b>${fmt(t)}</b>${S.newBest ? ' · 🎉 nieuwe beste tijd!' : b != null ? ` · beste tijd ${fmt(b)}` : ''}<br><small>${S.hints || S.checks ? [S.hints ? `${S.hints} ${S.hints === 1 ? 'hint' : 'hints'}` : '', S.checks ? `${S.checks}× gecontroleerd` : ''].filter(Boolean).join(' en ') + ' gebruikt' : 'Helemaal zonder hulp!'} · ${stats.won} ${stats.won === 1 ? 'logigram' : 'logigrammen'} opgelost</small>`;
    openModal('lgEndModal');
  }
  const newOrAsk = (fn) => {
    if (S && !S.done && S.undo.length) { askConfirm('Nieuwe puzzel?', 'Je puzzel van nu stopt dan en wordt niet bewaard.', 'Nieuwe puzzel').then(y => { if (y) fn(); else openStart(); }); }
    else fn();
  };
  $('#lgLevels').addEventListener('click', e => { const b = e.target.closest('button[data-l]'); if (!b) return; opt.lvl = b.dataset.l; saveOpt(); sfx('lgTap'); $('#lgLevels').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#lgOpts').addEventListener('click', e => onOpt(e, openStart));
  $('#lgMOpts').addEventListener('click', e => onOpt(e, openMenu));
  $('#lgGo').addEventListener('click', () => { sfx('lgTap'); newOrAsk(() => startNew(opt.lvl)); });
  $('#lgDaily').addEventListener('click', () => {
    sfx('lgTap'); const d = today();
    if (S && !S.done && S.daily === d) { closeModals(); renderAll(); return; }
    newOrAsk(() => startNew(null, d));
  });
  $('#lgCont').addEventListener('click', () => { sfx('lgTap'); closeModals(); renderAll(); });
  $('#lgStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#lgMResume').addEventListener('click', () => { sfx('lgTap'); closeModals(); need(); });
  $('#lgMRestart').addEventListener('click', () => { askConfirm('Opnieuw beginnen?', 'Alle ✓ en ✗ worden gewist. De klok loopt door.', 'Opnieuw').then(y => { if (y) restart(); else openMenu(); }); });
  $('#lgMNew').addEventListener('click', () => { sfx('lgTap'); openStart(); });
  $('#lgMQuit').addEventListener('click', () => { closeModals(); leave(); });
  $('#lgEndMenu').addEventListener('click', () => { sfx('lgTap'); openStart(); });
  $('#lgEndNew').addEventListener('click', () => { sfx('lgTap'); startNew(S && !S.daily ? S.lvl : opt.lvl); });
  $('#lgBack').addEventListener('click', () => leave());
  $('#lgMenu').addEventListener('click', () => openMenu());

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('lg'); scr.classList.toggle('land', innerWidth > innerHeight);
    if (!S) S = load();
    clearInterval(timer); lastTick = now(); timer = setInterval(tick, 250);
    if (S && !S.done) { tab = 'c'; setTab('c'); V.ready = false; requestAnimationFrame(() => { renderAll(); }); renderHud(); renderSide(); }
    else { requestAnimationFrame(() => { if (S) renderAll(); }); setTimeout(() => { if (current === 'lg') openStart(); }, 0); }
  }
  // back: a hint closes first; otherwise save and go to the menu (the tile shows "Doorgaan")
  function leave() {
    if (hintS && current === 'lg' && !anyModal()) { hideHint(); return; }
    clearInterval(timer); timer = 0; clearTimeout(winT); save(); closeModals(); hideHint();
    busy = false; scr.classList.remove('busy'); $('#lgBusy').classList.remove('show');
    if (S && S.done) S = null;
    show('menu'); refreshMenu();
  }
  addEventListener('resize', () => { if (current === 'lg') { scr.classList.toggle('land', innerWidth > innerHeight); setTimeout(() => { if (current === 'lg' && S) { layout(true); need(); } }, 80); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'lg') save(); else if (current === 'lg') lastTick = now(); });
  addEventListener('pagehide', () => { if (current === 'lg') save(); });
  new MutationObserver(() => { if (current === 'lg') { const b = big(); if (b !== V.big) { V.big = b; if (S) { V.ready = false; layout(); need(); } } } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ---------- test hooks ---------- */
  function check() {
    if (!S) return 'geen spel';
    const P = S.P, T = P.K * P.N, mk = S.mk;
    if (mk.length !== T * T) return 'lengte';
    for (const [a, b] of Core.pairs(P)) { const v = mk[a * T + b]; if (v !== mk[b * T + a]) return 'niet symmetrisch'; if (![0, 1, 2, 3].includes(v)) return 'waarde ' + v; }
    if (!S.done && !S.trimmed) { const m = Core.newMarks(P); for (const ch of S.undo) Core.redoChanges(P, m, ch); if (m.some((v, i) => v !== mk[i])) return 'terug-lijst klopt niet met het rooster'; }
    if (!Number.isFinite(S.t) || S.t < 0) return 'tijd';
    if (![V.cs, V.ox, V.oy].every(Number.isFinite)) return 'beeld';
    if (S.done && !Core.isSolved(P, mk)) return 'klaar maar niet opgelost';
    return '';
  }
  window.__lg = {
    get S() { return S; }, get V() { return V; }, get Lay() { return Lay; }, get hint() { return hintS; }, opt, stats: () => stats, Core,
    startNew, openStart, openMenu, leave, save, load, doMark, doHint, doCheck, applyHint, undo, redo, restart, reveal, hit, setZoom, check,
    lines: () => LN, cellXY(a, b) { const r = cellRect(a, b), q = cv.getBoundingClientRect(); return { x: q.left + r.x + r.s / 2, y: q.top + r.y + r.s / 2, s: r.s, vis: r.x >= base().x + Lay.leftW - 1 && r.y >= base().y + Lay.topH - 1 && r.x + r.s <= V.W + 1 && r.y + r.s <= V.H + 1 }; },
    running: () => raf !== 0, drawStats: reset => { const r = { n: DS.n, avg: DS.n ? DS.ms / DS.n : 0, max: DS.max }; if (reset) { DS.n = 0; DS.ms = 0; DS.max = 0; } return r; }, busy: () => busy, genMs: () => lastGen, timerOn: () => !!timer,
  };
  return { enter, leave, hasSave: () => !!store.get('lg.save', null) };
