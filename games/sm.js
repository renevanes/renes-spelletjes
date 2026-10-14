/* ================================================================
   SNOEPMIX – match-3 swap puzzle with home-made sweets: striped,
   wrapped and rainbow specials with combos, 20 levels with goals
   (score, colours, jelly, ice, strawberries) and an endless mode
   ================================================================ */
const Snoepmix = (() => {
  const N = 8, NC = 64, ORB = 7, ING = 9, SETTLE = -1, TAU = Math.PI * 2;
  // own sweets: heart, ring, star, triangle, gem, hexagon  (b base, l light, d dark, p pastel)
  const PAL = [
    { b: '#ff3d6a', l: '#ffd0dc', d: '#9e0b37', p: '#ff7795' },
    { b: '#ff8c1a', l: '#ffe3b0', d: '#a84800', p: '#ffb055' },
    { b: '#ffd21a', l: '#fffad0', d: '#b87d00', p: '#ffe45e' },
    { b: '#2fcf63', l: '#d0ffd9', d: '#0b7a35', p: '#72e68e' },
    { b: '#2e8bff', l: '#d2e9ff', d: '#0c3fa6', p: '#6db0ff' },
    { b: '#a750ff', l: '#ecd6ff', d: '#55129e', p: '#c78cff' },
  ];
  const NAMES = [['hartje', 'hartjes'], ['ringetje', 'ringetjes'], ['sterretje', 'sterretjes'], ['driehoekje', 'driehoekjes'], ['diamantje', 'diamantjes'], ['zeshoekje', 'zeshoekjes']];
  // m: 8 rows, '.' cell, '#' hole, j/J jelly (1/2 layers), i/I ice block (1/2 hits)
  const LEVELS = [
    { n: 'Eerste hapje', mv: 16, c: 5, g: [['score']], st: [3000, 10000, 20000] },
    { n: 'Hartjesjacht', mv: 16, c: 5, g: [['col', 0, 24]], st: [1, 12000, 19000] },
    { n: 'Geleibad', mv: 18, c: 5, g: [['jelly']], st: [1, 13000, 20000], m: '........|........|..jjjj..|..jjjj..|..jjjj..|..jjjj..|........|........' },
    { n: 'Sterren en ringen', mv: 20, c: 5, g: [['col', 2, 30], ['col', 1, 30]], st: [1, 16000, 24000] },
    { n: 'Aardbeienpluk', mv: 24, c: 5, g: [['ing', 2]], on: 2, st: [1, 17000, 26000] },
    { n: 'IJskoud', mv: 18, c: 5, g: [['ice']], st: [1, 12000, 19000], m: '........|........|........|.iIiiIi.|.IiIIiI.|........|........|........' },
    { n: 'Kruispunt', mv: 24, c: 5, g: [['jelly']], st: [1, 15000, 22000], m: '##.jj.##|##.jj.##|...jj...|jjjjjjjj|jjjjjjjj|...jj...|##.jj.##|##.jj.##' },
    { n: 'Dubbele laag', mv: 24, c: 5, g: [['jelly']], st: [1, 24000, 34000], m: '........|.JJJJJJ.|.J....J.|.J....J.|.J....J.|.J....J.|.JJJJJJ.|........' },
    { n: 'Sterrenregen', mv: 26, c: 6, g: [['col', 2, 30], ['col', 4, 30]], st: [1, 10000, 14000] },
    { n: 'Diamantvorm', mv: 28, c: 5, g: [['jelly']], st: [1, 17000, 23000], m: '###jj###|##jjjj##|#jjjjjj#|jjjjjjjj|jjjjjjjj|#jjjjjj#|##jjjj##|###jj###' },
    { n: 'Aardbei op ijs', mv: 28, c: 5, g: [['ing', 3], ['ice']], on: 2, st: [1, 23000, 34000], m: '........|........|........|i.i..i.i|.i.ii.i.|........|........|........' },
    { n: 'Zes smaken', mv: 22, c: 6, g: [['score']], st: [7000, 9500, 13000] },
    { n: 'Twee eilanden', mv: 34, c: 5, g: [['jelly']], st: [1, 19000, 27000], m: 'jjj##jjj|jjj##jjj|jjj..jjj|jjj..jjj|jjj..jjj|jjj..jjj|jjj##jjj|jjj##jjj' },
    { n: 'IJspaleis', mv: 20, c: 5, g: [['ice']], st: [1, 13000, 20000], m: '........|.I....I.|..I..I..|...II...|...II...|..I..I..|.I....I.|........' },
    { n: 'Regenboog', mv: 24, c: 6, g: [['col', 0, 25], ['col', 3, 25], ['col', 4, 25], ['col', 5, 25]], st: [1, 10000, 14000] },
    { n: 'Geleidoolhof', mv: 38, c: 5, g: [['jelly']], st: [1, 21000, 28000], m: 'jJj.#jJj|j...#..j|j.jJJj.j|#.J..J.#|#.J..J.#|j.jJJj.j|j..#...j|jjj#.jjj' },
    { n: 'Aardbeienveld', mv: 30, c: 5, g: [['ing', 3]], on: 2, st: [1, 17000, 25000], m: '........|........|#......#|##....##|##....##|#......#|........|........' },
    { n: 'Bevroren gelei', mv: 28, c: 5, g: [['jelly'], ['ice']], st: [1, 25000, 35000], m: 'jjjjjjjj|j.i..i.j|j......j|jiijjiij|jiijjiij|j......j|j.i..i.j|jjjjjjjj' },
    { n: 'Suikerstorm', mv: 28, c: 6, g: [['jelly'], ['col', 1, 25], ['col', 5, 25]], st: [1, 12000, 16000], m: '##....##|#.JJJJ.#|..J..J..|..J..J..|..J..J..|..J..J..|#.JJJJ.#|##....##' },
    { n: 'Grote finale', mv: 34, c: 5, g: [['jelly'], ['ice'], ['ing', 2]], on: 2, st: [1, 32000, 42000], m: 'jjjjjjjj|jJ.II.Jj|j......j|jI.JJ.Ij|jI.JJ.Ij|j......j|j......j|jjjjjjjj' },
  ];
  const ENDLESS = { n: 'Vrij spel', mv: 30, c: 5, g: [], st: [0, 0, 0] };
  const D = { sound: true, hints: true };
  const opt = Object.assign({}, D, store.get('sm.settings', {}));
  const saveOpt = () => store.set('sm.settings', opt);
  let prog = Object.assign({ unlocked: 1, stars: {}, best: {}, endless: 0, played: 0, won: 0 }, store.get('sm.progress', {}));
  const saveProg = () => store.set('sm.progress', prog);
  Sfx.gate('sm', () => opt.sound);
  const lastS = {};
  const sfx = (n, a, gap = .045) => { if (!opt.sound) return; const t = performance.now() / 1000; if (lastS[n] && t - lastS[n] < gap) return; lastS[n] = t; Sfx.play(n, a); };

  /* ---------- small helpers ---------- */
  const RW = i => (i / N) | 0, CL = i => i % N;
  const sum = a => { let s = 0; for (const v of a) s += v; return s; };
  const rnd = st => { let t = st.seed = (st.seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const fmtN = n => Math.round(n).toLocaleString('nl-NL');
  const nb4 = i => { const r = RW(i), c = CL(i), o = []; if (c > 0) o.push(i - 1); if (c < N - 1) o.push(i + 1); if (r > 0) o.push(i - N); if (r < N - 1) o.push(i + N); return o; };
  const square = (i, rad) => { const r = RW(i), c = CL(i), o = []; for (let y = r - rad; y <= r + rad; y++) for (let x = c - rad; x <= c + rad; x++) if (x >= 0 && x < N && y >= 0 && y < N) o.push(y * N + x); return o; };
  const matchable = p => p && p.k < 6 && !p.armed;
  const kAt = (st, i) => { const p = st.p[i]; return matchable(p) ? p.k : -1; };
  const swappable = (st, i) => i >= 0 && i < NC && !st.hole[i] && !st.ice[i] && st.p[i] && !st.p[i].armed;
  const isCombo = (A, B) => !!A && !!B && A.k !== ING && B.k !== ING && (A.s === 4 || B.s === 4 || (A.s > 0 && B.s > 0));
  const levelDef = st => st.mode === 'lvl' ? LEVELS[st.li] : ENDLESS;

  /* ---------- state ---------- */
  function mk(st, k, s) { const p = { k, s: s || 0 }; if (st.fx) { p.x = 0; p.y = 0; p.vy = 0; } return p; }
  function newState(mode, li, seed) {
    const L = mode === 'lvl' ? LEVELS[li] : ENDLESS;
    const st = { mode, li, seed: (seed >>> 0) || 1, hole: new Uint8Array(NC), jelly: new Uint8Array(NC), ice: new Uint8Array(NC), p: new Array(NC).fill(null),
      colors: L.c, moves: L.mv, score: 0, got: [0, 0, 0, 0, 0, 0], ingLeft: 0, ingGot: 0, ingNeed: 0, ingOn: L.on || 1, jelly0: 0, ice0: 0,
      used: 0, made: 0, cascade: 0, over: false, won: false, fx: false, bad: false, nextBonus: 4000, bonusStep: 5000, swapCells: null, swapDir: null, merge: null, jHit: new Set() };
    const rows = L.m ? L.m.split('|') : null;
    for (let i = 0; i < NC; i++) {
      const ch = rows ? rows[RW(i)][CL(i)] : '.';
      if (ch === '#') st.hole[i] = 1; else if (ch === 'j') st.jelly[i] = 1; else if (ch === 'J') st.jelly[i] = 2; else if (ch === 'i') st.ice[i] = 1; else if (ch === 'I') st.ice[i] = 2;
    }
    st.jelly0 = sum(st.jelly); st.ice0 = sum(st.ice);
    const ig = L.g.find(g => g[0] === 'ing'); if (ig) { st.ingNeed = ig[1]; st.ingLeft = ig[1]; }
    fillBoard(st);
    return st;
  }
  function makesRun(st, i, k) {
    const r = RW(i), c = CL(i);
    if (c >= 2 && kAt(st, i - 1) === k && kAt(st, i - 2) === k) return true;
    if (r >= 2 && kAt(st, i - N) === k && kAt(st, i - 2 * N) === k) return true;
    return false;
  }
  function topSlot(st, c) { for (let r = 0; r < N; r++) { const i = r * N + c; if (!st.hole[i] && !st.ice[i]) return i; } return -1; }
  function fillBoard(st) {
    for (let tries = 0; tries < 60; tries++) {
      for (let i = 0; i < NC; i++) {
        st.p[i] = null; if (st.hole[i] || st.ice[i]) continue;
        let k, guard = 0;
        do { k = Math.floor(rnd(st) * st.colors); } while (guard++ < 30 && makesRun(st, i, k));
        st.p[i] = { k, s: 0 };
      }
      if (findMove(st)) break;
    }
    let put = Math.min(st.ingOn, st.ingLeft);
    const c0 = Math.floor(rnd(st) * N);
    for (let n = 0; put > 0 && n < N; n++) { const i = topSlot(st, (c0 + n * 3) % N); if (i >= 0 && st.p[i] && st.p[i].k !== ING) { st.p[i] = { k: ING, s: 0 }; put--; st.ingLeft--; } }
  }
  function clone(st) {
    const c = Object.assign({}, st);
    c.jelly = st.jelly.slice(); c.ice = st.ice.slice(); c.got = st.got.slice(); c.fx = false; c.jHit = new Set(); c.merge = null;
    c.p = st.p.map(p => p && { k: p.k, s: p.s, armed: p.armed, big: p.big });
    return c;
  }
  function serialize(st) {
    return { v: 1, mode: st.mode, li: st.li, seed: st.seed, hole: [...st.hole], jelly: [...st.jelly], ice: [...st.ice], p: st.p.map(p => p && [p.k, p.s, p.armed ? 1 : 0, p.big ? 1 : 0]),
      colors: st.colors, moves: st.moves, score: st.score, got: st.got, ingLeft: st.ingLeft, ingGot: st.ingGot, ingNeed: st.ingNeed, ingOn: st.ingOn, jelly0: st.jelly0, ice0: st.ice0,
      used: st.used, made: st.made, nextBonus: st.nextBonus, bonusStep: st.bonusStep };
  }
  function deserialize(o) {
    if (!o || o.v !== 1 || !Array.isArray(o.p) || o.p.length !== NC) return null;
    if (o.mode === 'lvl' && !LEVELS[o.li]) return null;
    const st = Object.assign(newState(o.mode, o.li, 1), { seed: o.seed, colors: o.colors, moves: o.moves, score: o.score, got: o.got.slice(), ingLeft: o.ingLeft, ingGot: o.ingGot, ingNeed: o.ingNeed, ingOn: o.ingOn,
      jelly0: o.jelly0, ice0: o.ice0, used: o.used, made: o.made, nextBonus: o.nextBonus, bonusStep: o.bonusStep });
    st.hole = Uint8Array.from(o.hole); st.jelly = Uint8Array.from(o.jelly); st.ice = Uint8Array.from(o.ice);
    st.p = o.p.map(a => a && { k: a[0], s: a[1], armed: a[2] || 0, big: a[3] || 0 });
    return st;
  }

  /* ---------- matching ---------- */
  function matchAt(st, i) {
    const k = kAt(st, i); if (k < 0) return false;
    const r = RW(i), c = CL(i); let a = c, b = c;
    while (a > 0 && kAt(st, i - (c - a) - 1) === k) a--;
    while (b < N - 1 && kAt(st, i + (b - c) + 1) === k) b++;
    if (b - a >= 2) return true;
    a = r; b = r;
    while (a > 0 && kAt(st, (a - 1) * N + c) === k) a--;
    while (b < N - 1 && kAt(st, (b + 1) * N + c) === k) b++;
    return b - a >= 2;
  }
  function findGroups(st) {
    const runs = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N;) {
      const k = kAt(st, r * N + c); if (k < 0) { c++; continue; }
      let e = c + 1; while (e < N && kAt(st, r * N + e) === k) e++;
      if (e - c >= 3) { const cells = []; for (let x = c; x < e; x++) cells.push(r * N + x); runs.push({ d: 'h', k, cells }); }
      c = e;
    }
    for (let c = 0; c < N; c++) for (let r = 0; r < N;) {
      const k = kAt(st, r * N + c); if (k < 0) { r++; continue; }
      let e = r + 1; while (e < N && kAt(st, e * N + c) === k) e++;
      if (e - r >= 3) { const cells = []; for (let y = r; y < e; y++) cells.push(y * N + c); runs.push({ d: 'v', k, cells }); }
      r = e;
    }
    if (!runs.length) return [];
    const par = runs.map((_, j) => j), find = j => par[j] === j ? j : (par[j] = find(par[j])), owner = new Map();
    runs.forEach((ru, j) => ru.cells.forEach(i => { if (owner.has(i)) par[find(j)] = find(owner.get(i)); else owner.set(i, j); }));
    const by = new Map();
    runs.forEach((ru, j) => { const r = find(j); if (!by.has(r)) by.set(r, { k: ru.k, runs: [], cells: new Set() }); const g = by.get(r); g.runs.push(ru); ru.cells.forEach(i => g.cells.add(i)); });
    return [...by.values()].map(g => analyze(st, g));
  }
  function analyze(st, g) {
    const long = g.runs.reduce((a, b) => b.cells.length > a.cells.length ? b : a), maxL = long.cells.length;
    const hasH = g.runs.some(r => r.d === 'h'), hasV = g.runs.some(r => r.d === 'v');
    g.typ = maxL >= 5 ? 4 : (hasH && hasV) ? 3 : maxL === 4 ? 1 : 0;
    let pos = -1;
    if (st.swapCells) { const f = st.swapCells.find(i => g.cells.has(i)); if (f != null) pos = f; }
    if (pos < 0 && hasH && hasV) { const h = new Set(g.runs.filter(r => r.d === 'h').flatMap(r => r.cells)); const x = g.runs.filter(r => r.d === 'v').flatMap(r => r.cells).find(i => h.has(i)); if (x != null) pos = x; }
    if (pos < 0) pos = long.cells[(long.cells.length - 1) >> 1];
    g.pos = pos;
    g.s = g.typ === 1 ? (st.swapCells && g.cells.has(st.swapCells[0]) ? (st.swapDir === 'h' ? 1 : 2) : (long.d === 'h' ? 2 : 1)) : g.typ === 3 ? 3 : g.typ === 4 ? 4 : 0;
    return g;
  }
  function findMove(st, all) {
    const out = [];
    for (let i = 0; i < NC; i++) {
      if (!swappable(st, i)) continue;
      for (const j of [CL(i) < N - 1 ? i + 1 : -1, RW(i) < N - 1 ? i + N : -1]) {
        if (j < 0 || !swappable(st, j)) continue;
        const A = st.p[i], B = st.p[j];
        let ok = isCombo(A, B);
        if (!ok) { st.p[i] = B; st.p[j] = A; ok = matchAt(st, i) || matchAt(st, j); st.p[i] = A; st.p[j] = B; }
        if (ok) { if (!all) return [i, j]; out.push([i, j]); }
      }
    }
    return all ? out : null;
  }

  /* ---------- goals ---------- */
  function goals(st) {
    const L = levelDef(st);
    return L.g.map(g => {
      if (g[0] === 'score') return { t: 'score', need: L.st[0], have: Math.min(st.score, L.st[0]) };
      if (g[0] === 'col') return { t: 'col', k: g[1], need: g[2], have: Math.min(g[2], st.got[g[1]]) };
      if (g[0] === 'jelly') return { t: 'jelly', need: st.jelly0, have: st.jelly0 - sum(st.jelly) };
      if (g[0] === 'ice') return { t: 'ice', need: st.ice0, have: st.ice0 - sum(st.ice) };
      return { t: 'ing', need: st.ingNeed, have: st.ingGot };
    });
  }
  const goalsDone = st => goals(st).every(g => g.have >= g.need);
  const scoreOnly = st => levelDef(st).g.every(g => g[0] === 'score');
  const starsOf = st => { const s = levelDef(st).st; return !st.won ? 0 : 1 + (st.score >= s[1] ? 1 : 0) + (st.score >= s[2] ? 1 : 0); };

  /* ---------- the resolution engine (generators: yield ms to wait, SETTLE to wait for falling) ---------- */
  const fxPts = st => 30 + 10 * Math.max(0, st.cascade - 1);
  function removeP(st, i, pts) {
    const p = st.p[i]; if (!p) return;
    st.p[i] = null; if (p.k < 6) st.got[p.k]++; st.score += pts;
    if (st.fx) {
      const to = st.merge && st.merge.get(i);
      dying.push({ p, x: p.x, y: p.y, t: 0, to: to != null ? [CL(to), RW(to)] : null });
      if (to == null) burst(p.x, p.y, p.k);
    }
  }
  function hitIce(st, i) {
    if (st.jHit.has(i)) return; st.jHit.add(i);
    st.ice[i]--; st.score += 80;
    if (st.fx) { shards(CL(i), RW(i), st.ice[i] ? 6 : 14); sfx('smIce'); }
  }
  function hitCell(st, i, next, byMatch) {
    if (i < 0 || i >= NC || st.hole[i]) return;
    if (st.ice[i]) { hitIce(st, i); return; }
    const p = st.p[i];
    if (p && (p.k === ING || p.armed)) return;
    if (st.jelly[i] && !st.jHit.has(i)) { st.jHit.add(i); st.jelly[i]--; st.score += 100; if (st.fx) { jellySplash(CL(i), RW(i)); sfx('smJelly', 0, .08); } }
    if (!p) return;
    if (p.s) { fire(st, i, p, next); return; }
    removeP(st, i, byMatch ? 0 : fxPts(st));
  }
  function commonColor(st) {
    const n = [0, 0, 0, 0, 0, 0]; for (const p of st.p) if (p && p.k < 6 && !p.armed) n[p.k]++;
    let best = 0; for (let k = 1; k < 6; k++) if (n[k] > n[best]) best = k; return best;
  }
  function fire(st, i, p, next) {
    const r = RW(i), c = CL(i);
    if (p.s === 1 || p.s === 2) {
      removeP(st, i, 60);
      for (let x = 0; x < N; x++) next.push(p.s === 1 ? r * N + x : x * N + c);
      if (st.fx) { fxs.push({ type: 'beam', d: p.s === 1 ? 'h' : 'v', c, r, t: 0, dur: .5, col: PAL[p.k].p, w: 1 }); sfx('smBeam'); vibrate(12); }
    } else if (p.s === 3) {
      p.armed = 1; square(i, p.big ? 2 : 1).forEach(j => next.push(j));
      if (st.fx) { fxs.push({ type: 'boom', c, r, rad: p.big ? 2 : 1, t: 0, dur: .55, col: PAL[p.k].p }); sfx('smBoom'); vibrate(20); }
    } else if (p.s === 4) {
      removeP(st, i, 60);
      const k = commonColor(st), tg = [];
      st.p.forEach((q, j) => { if (q && q.k === k && !q.armed) { next.push(j); tg.push(j); } });
      if (st.fx) { bolts(c, r, tg); sfx('smZap'); vibrate(25); }
    }
  }
  function* blast(st, cells, byMatch, origin, iceAdj) {
    st.jHit = new Set();
    const s0 = st.score;
    if (iceAdj) for (const j of iceAdj) if (st.ice[j]) hitIce(st, j);
    let wave = [...new Set(cells)], first = true;
    while (wave.length) {
      const next = [];
      for (const i of wave) hitCell(st, i, next, first && byMatch);
      first = false;
      wave = [...new Set(next)];
      if (wave.length) yield 85;
    }
    if (st.fx && origin != null && st.score - s0 > 0) popup(CL(origin), RW(origin), '+' + fmtN(st.score - s0), '#ffffff');
  }
  function* clearGroups(st, groups) {
    const all = [], creates = [], adj = new Set(), m = Math.max(1, st.cascade);
    st.merge = new Map();
    for (const g of groups) {
      const n = g.cells.size, pts = (60 + (n - 3) * 60 + (g.typ === 3 ? 60 : 0)) * m;
      st.score += pts;
      if (st.fx) { let x = 0, y = 0; g.cells.forEach(i => { x += CL(i); y += RW(i); }); popup(x / n, y / n, '+' + fmtN(pts), PAL[g.k].p); }
      for (const i of g.cells) { all.push(i); for (const j of nb4(i)) if (st.ice[j]) adj.add(j); }
      if (g.typ) { creates.push(g); for (const i of g.cells) if (i !== g.pos) st.merge.set(i, g.pos); }
    }
    if (!st.fx) st.merge = null;
    yield* blast(st, all, true, null, adj);
    st.merge = null;
    for (const g of creates) {
      let i = g.pos;
      if (st.p[i] || st.ice[i]) i = [...g.cells].find(j => !st.p[j] && !st.ice[j] && !st.hole[j]);
      if (i == null) continue;
      const p = mk(st, g.typ === 4 ? ORB : g.k, g.s); st.p[i] = p; st.made++;
      if (st.fx) { p.x = CL(i); p.y = RW(i); p.born = 0; fxs.push({ type: 'ring', c: CL(i), r: RW(i), t: 0, dur: .45, col: g.typ === 4 ? '#ffffff' : PAL[g.k].l }); sfx(g.typ === 4 ? 'smOrbMake' : g.typ === 3 ? 'smWrapMake' : 'smStripeMake', 0, .1); }
    }
    yield creates.length ? 210 : 150;
  }
  function gravity(st) {
    let moved = false;
    for (let c = 0; c < N; c++) {
      const slots = [];
      for (let r = 0; r < N; r++) { const i = r * N + c; if (!st.hole[i] && !st.ice[i]) slots.push(i); }
      if (!slots.length) continue;
      let w = slots.length - 1;
      for (let k = slots.length - 1; k >= 0; k--) { const p = st.p[slots[k]]; if (!p) continue; if (k !== w) { st.p[slots[w]] = p; st.p[slots[k]] = null; moved = true; } w--; }
      const top = RW(slots[0]);
      for (let k = w; k >= 0; k--) { const p = mk(st, spawnKind(st), 0); st.p[slots[k]] = p; moved = true; if (st.fx) { p.x = c; p.y = top - 1 - (w - k); } }
    }
    return moved;
  }
  function spawnKind(st) {
    if (st.ingLeft > 0) {
      let on = 0; for (const p of st.p) if (p && p.k === ING) on++;
      if (on < st.ingOn && rnd(st) < (on ? .12 : .45)) { st.ingLeft--; return ING; }
    }
    return Math.floor(rnd(st) * st.colors);
  }
  function* fall(st) { if (gravity(st)) yield SETTLE; }
  function collectIng(st) {
    let any = false;
    for (let c = 0; c < N; c++) {
      let e = -1; for (let r = N - 1; r >= 0; r--) if (!st.hole[r * N + c]) { e = r * N + c; break; }
      if (e >= 0 && st.p[e] && st.p[e].k === ING) {
        const p = st.p[e]; st.p[e] = null; st.ingGot++; st.score += 1000; any = true;
        if (st.fx) { dying.push({ p, x: p.x, y: p.y, t: 0, up: 1 }); popup(c, RW(e), '+1.000', '#ff8fa8'); sparkles(c, RW(e), 12); sfx('smIng'); }
      }
    }
    return any;
  }
  function* detonateArmed(st) {
    const cells = [], list = [];
    st.p.forEach((p, i) => { if (p && p.armed) list.push(i); });
    st.cascade++;
    for (const i of list) {
      const p = st.p[i]; removeP(st, i, 60);
      square(i, p.big ? 2 : 1).forEach(j => cells.push(j));
      if (st.fx) fxs.push({ type: 'boom', c: CL(i), r: RW(i), rad: p.big ? 2 : 1, t: 0, dur: .55, col: PAL[p.k].p });
    }
    if (st.fx) { sfx('smBoom'); vibrate(20); }
    yield* blast(st, cells, false, list[0]);
    yield 120;
  }
  function* cascadeLoop(st) {
    for (let guard = 0; guard < 200; guard++) {
      const gs = findGroups(st);
      if (gs.length) {
        st.cascade++;
        if (st.fx) sfx('smPop' + Math.min(8, st.cascade), 0, .06);
        yield* clearGroups(st, gs); st.swapCells = null;
        yield* fall(st); continue;
      }
      if (st.p.some(p => p && p.armed)) { yield* detonateArmed(st); yield* fall(st); continue; }
      if (collectIng(st)) { yield 260; yield* fall(st); continue; }
      break;
    }
  }
  function* doCombo(st, a, b) {
    const A = st.p[b], B = st.p[a], r = RW(b), c = CL(b);       // A = the piece the player moved (now on b)
    st.cascade = 1;
    if (A.s === 4 && B.s === 4) {
      removeP(st, a, 200); removeP(st, b, 200); st.score += 2000;
      const all = []; for (let i = 0; i < NC; i++) all.push(i);
      if (st.fx) { fxs.push({ type: 'flash', t: 0, dur: .7 }); fxs.push({ type: 'boom', c, r, rad: 6, t: 0, dur: .8, col: '#ffffff' }); combo('Suikerfeest!'); sfx('smCombo'); sfx('smZap'); vibrate(60); yield 300; }
      yield* blast(st, all, false, b);
    } else if (A.s === 4 || B.s === 4) {
      const oi = A.s === 4 ? a : b, bi = A.s === 4 ? b : a, O = st.p[oi], k = O.k;
      removeP(st, bi, 200);
      const tg = []; st.p.forEach((q, j) => { if (q && q.k === k && !q.armed) tg.push(j); });
      if (!O.s) {
        if (st.fx) { bolts(CL(bi), RW(bi), tg); sfx('smZap'); vibrate(30); yield 380; }
        yield* blast(st, tg, false, bi);
      } else {
        st.score += 1000;
        for (const j of tg) { const q = st.p[j]; if (!q.s) { q.s = O.s === 3 ? 3 : (rnd(st) < .5 ? 1 : 2); if (st.fx) q.flash = .35; } }
        if (st.fx) { bolts(CL(bi), RW(bi), tg); combo('Heerlijk!'); sfx('smCombo'); vibrate(40); yield 550; }
        yield* blast(st, tg, false, bi);
      }
    } else {
      const ss = A.s !== 3 && B.s !== 3, ww = A.s === 3 && B.s === 3;
      st.score += ww ? 800 : ss ? 400 : 600;
      if (ww) {
        removeP(st, a, 60); A.big = 1; A.armed = 1;
        const cells = square(b, 2).filter(j => j !== b);
        if (st.fx) { fxs.push({ type: 'boom', c, r, rad: 2, t: 0, dur: .65, col: PAL[A.k].p }); combo('Heerlijk!'); sfx('smCombo'); sfx('smBoom'); vibrate(40); yield 120; }
        yield* blast(st, cells, false, b);
      } else {
        removeP(st, a, 60); removeP(st, b, 60);
        const cells = [], w = ss ? 0 : 1;
        for (let d = -w; d <= w; d++) {
          if (r + d >= 0 && r + d < N) for (let x = 0; x < N; x++) cells.push((r + d) * N + x);
          if (c + d >= 0 && c + d < N) for (let y = 0; y < N; y++) cells.push(y * N + c + d);
        }
        if (st.fx) {
          for (let d = -w; d <= w; d++) { if (r + d >= 0 && r + d < N) fxs.push({ type: 'beam', d: 'h', c, r: r + d, t: 0, dur: .55, col: PAL[A.k].p, w: 1 }); if (c + d >= 0 && c + d < N) fxs.push({ type: 'beam', d: 'v', c: c + d, r, t: 0, dur: .55, col: PAL[B.k].p, w: 1 }); }
          if (!ss) combo('Heerlijk!'); sfx(ss ? 'smBeam' : 'smCombo'); sfx('smBeam', 0, 0); vibrate(35); yield 80;
        }
        yield* blast(st, cells, false, b);
      }
    }
    yield 150;
  }
  function* reshuffle(st) {
    if (st.fx) { combo('Husselen!'); sfx('smShuffle'); yield 650; }
    const idx = []; st.p.forEach((p, i) => { if (p && p.k < 6 && !p.armed) idx.push(i); });
    const pcs = idx.map(i => st.p[i]), old = new Map(pcs.map(p => [p, [p.x, p.y]]));
    let ok = false;
    for (let t = 0; t < 300 && !ok; t++) {
      for (let j = pcs.length - 1; j > 0; j--) { const q = Math.floor(rnd(st) * (j + 1)); [pcs[j], pcs[q]] = [pcs[q], pcs[j]]; }
      idx.forEach((i, j) => { st.p[i] = pcs[j]; });
      ok = !findGroups(st).length && !!findMove(st);
    }
    for (let t = 0; t < 100 && !ok; t++) {               // still stuck: recolour the plain sweets
      for (const i of idx) { const p = st.p[i]; if (p.s) continue; p.k = -1; let k, g = 0; do { k = Math.floor(rnd(st) * st.colors); } while (g++ < 30 && wouldRun(st, i, k)); p.k = k; }
      ok = !findGroups(st).length && !!findMove(st);
    }
    if (st.fx) { idx.forEach(i => { const p = st.p[i], o = old.get(p); if (o) { p.x = o[0]; p.y = o[1]; tween(p, i, .45); } }); yield 520; }
  }
  function wouldRun(st, i, k) {
    const r = RW(i), c = CL(i), K = j => kAt(st, j);
    const h = (c >= 2 && K(i - 1) === k && K(i - 2) === k) || (c >= 1 && c <= N - 2 && K(i - 1) === k && K(i + 1) === k) || (c <= N - 3 && K(i + 1) === k && K(i + 2) === k);
    const v = (r >= 2 && K(i - N) === k && K(i - 2 * N) === k) || (r >= 1 && r <= N - 2 && K(i - N) === k && K(i + N) === k) || (r <= N - 3 && K(i + N) === k && K(i + 2 * N) === k);
    return h || v;
  }
  function* finale(st) {
    if (st.fx) { combo('Zoete finale!'); sfx('smBonus'); yield 950; }
    let guard = 0;
    while (st.moves > 0 && guard++ < 60) {
      const cand = []; st.p.forEach((p, i) => { if (p && p.k < 6 && !p.s && !p.armed) cand.push(i); });
      if (!cand.length) break;
      const i = cand[Math.floor(rnd(st) * cand.length)]; st.p[i].s = rnd(st) < .5 ? 1 : 2; st.moves--; st.score += 120;
      if (st.fx) { st.p[i].flash = .3; fxs.push({ type: 'ring', c: CL(i), r: RW(i), t: 0, dur: .4, col: '#ffffff' }); sfx('smTick', 0, .03); yield 110; }
    }
    for (let g = 0; g < 90; g++) {
      const sp = st.p.findIndex(p => p && p.s && !p.armed && p.k !== ING);
      if (sp < 0) break;
      st.cascade = 1;
      yield* blast(st, [sp], false, sp);
      yield 60;
      yield* fall(st);
      yield* cascadeLoop(st);
    }
  }
  function* afterMove(st) {
    if (st.fx && st.cascade >= 3) { const t = st.cascade >= 7 ? 'Suikerfeest!' : st.cascade >= 5 ? 'Heerlijk!' : st.cascade >= 4 ? 'Zoetjes!' : 'Lekker!'; combo(t); sfx('smCheer', 0, .2); }
    if (st.mode === 'end') {
      while (st.score >= st.nextBonus) { st.moves += 5; st.nextBonus += st.bonusStep; st.bonusStep += 1500; if (st.fx) { combo('+5 zetten!'); sfx('smBonus'); } }
      if (st.moves <= 0) { st.over = true; return; }
    } else {
      const done = goalsDone(st);
      if (done && !scoreOnly(st)) { st.won = true; st.doneAt = st.used; yield* finale(st); st.over = true; return; }
      if (st.moves <= 0) { st.won = done; st.over = true; return; }
    }
    if (!findMove(st)) yield* reshuffle(st);
  }
  function* playerMove(st, a, b, sim) {
    const A = st.p[a], B = st.p[b];
    st.p[a] = B; st.p[b] = A;
    if (st.fx) { tween(A, b, .16); tween(B, a, .16); sfx('smSwap'); yield 170; }
    if (!isCombo(A, B) && !matchAt(st, a) && !matchAt(st, b)) {
      st.p[a] = A; st.p[b] = B; st.bad = true;
      if (st.fx) { tween(A, a, .17); tween(B, b, .17); sfx('smBad'); vibrate(15); yield 180; }
      return;
    }
    st.bad = false; st.moves--; st.used++;
    st.swapCells = [b, a]; st.swapDir = Math.abs(a - b) === 1 ? 'h' : 'v'; st.cascade = 0;
    if (isCombo(A, B)) { yield* doCombo(st, a, b); st.swapCells = null; yield* fall(st); }
    yield* cascadeLoop(st);
    st.swapCells = null;
    if (!sim) yield* afterMove(st);
  }
  const runSync = gen => { let n = 0; for (const _ of gen) if (++n > 1e5) break; };

  /* ---------- sprites ---------- */
  function roundPoly(g, pts, r) {
    const n = pts.length, s = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    g.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; g.arcTo(a[0], a[1], b[0], b[1], r); }
    g.closePath();
  }
  function shapePath(g, k, R) {
    g.beginPath();
    if (k === 0) {
      g.moveTo(0, R * .9);
      g.bezierCurveTo(-R * .38, R * .62, -R * 1.02, R * .22, -R * .98, -R * .3);
      g.bezierCurveTo(-R * .94, -R * .84, -R * .28, -R * 1.0, 0, -R * .5);
      g.bezierCurveTo(R * .28, -R * 1.0, R * .94, -R * .84, R * .98, -R * .3);
      g.bezierCurveTo(R * 1.02, R * .22, R * .38, R * .62, 0, R * .9);
      g.closePath();
    } else if (k === 1) { g.arc(0, 0, R * .92, 0, TAU); g.moveTo(R * .33, 0); g.arc(0, 0, R * .33, 0, TAU, true); }
    else if (k === 2) { const pts = []; for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? R * .5 : R * 1.04; pts.push([Math.cos(a) * rr, Math.sin(a) * rr + R * .06]); } roundPoly(g, pts, R * .14); }
    else if (k === 3) roundPoly(g, [[0, -R * 1.02], [R * 1.0, R * .74], [-R * 1.0, R * .74]], R * .3);
    else if (k === 4) roundPoly(g, [[-R * .55, -R * .74], [R * .55, -R * .74], [R * .98, -R * .2], [0, R * .94], [-R * .98, -R * .2]], R * .12);
    else { const pts = []; for (let j = 0; j < 6; j++) { const a = Math.PI / 6 + j * Math.PI / 3; pts.push([Math.cos(a) * R * .98, Math.sin(a) * R * .98]); } roundPoly(g, pts, R * .2); }
  }
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function sweetBody(g, k, s, R) {
    const P = PAL[k];
    g.save(); g.shadowColor = 'rgba(25,0,40,.45)'; g.shadowBlur = R * .25; g.shadowOffsetY = R * .13;
    shapePath(g, k, R); g.fillStyle = P.d; g.fill(); g.restore();
    const gr = g.createRadialGradient(-R * .32, -R * .42, R * .05, 0, 0, R * 1.2);
    gr.addColorStop(0, P.l); gr.addColorStop(.3, P.p); gr.addColorStop(.68, P.b); gr.addColorStop(1, P.d);
    shapePath(g, k, R); g.fillStyle = gr; g.fill();
    g.save(); shapePath(g, k, R); g.clip();
    const bl = g.createRadialGradient(R * .15, R * 1.0, 0, R * .15, R * 1.0, R * .95); bl.addColorStop(0, hexA(P.l, .5)); bl.addColorStop(1, hexA(P.l, 0)); g.fillStyle = bl; g.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
    if (k === 4) {          // gem facets
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = R * .05; g.beginPath(); g.moveTo(-R * .98, -R * .2); g.lineTo(R * .98, -R * .2); g.moveTo(-R * .3, -R * .74); g.lineTo(-R * .42, -R * .2); g.lineTo(0, R * .94); g.lineTo(R * .42, -R * .2); g.lineTo(R * .3, -R * .74); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(-R * .55, -R * .74); g.lineTo(R * .55, -R * .74); g.lineTo(R * .98, -R * .2); g.lineTo(-R * .98, -R * .2); g.fill();
      g.fillStyle = 'rgba(0,20,80,.18)'; g.beginPath(); g.moveTo(R * .42, -R * .2); g.lineTo(0, R * .94); g.lineTo(R * .98, -R * .2); g.fill();
    } else if (k === 5) { g.beginPath(); const pts = []; for (let j = 0; j < 6; j++) { const a = Math.PI / 6 + j * Math.PI / 3; pts.push([Math.cos(a) * R * .58, Math.sin(a) * R * .58 - R * .04]); } roundPoly(g, pts, R * .14); g.fillStyle = 'rgba(255,255,255,.16)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = R * .05; g.stroke(); }
    else if (k === 1) { g.fillStyle = 'rgba(255,255,255,.75)'; for (let j = 0; j < 9; j++) { const a = j * 2.39 + .4, rr = R * (.55 + .25 * ((j * 37) % 10) / 10); g.beginPath(); g.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, R * .06, R * .03, a, 0, TAU); g.fill(); } }
    else if (k === 2) { const c2 = g.createRadialGradient(0, R * .06, 0, 0, R * .06, R * .5); c2.addColorStop(0, 'rgba(255,255,255,.35)'); c2.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = c2; g.fillRect(-R, -R, R * 2, R * 2); }
    g.lineWidth = R * .24; g.strokeStyle = hexA(P.d, .3); shapePath(g, k, R); g.stroke();
    if (s === 1 || s === 2) {
      for (let j = -2; j <= 2; j++) {
        const o = j * R * .44, w = R * .2;
        g.fillStyle = hexA(P.d, .35); if (s === 1) g.fillRect(-R * 1.3, o - w / 2 + R * .05, R * 2.6, w); else g.fillRect(o - w / 2 + R * .05, -R * 1.3, w, R * 2.6);
        g.fillStyle = 'rgba(255,255,255,.92)'; if (s === 1) g.fillRect(-R * 1.3, o - w / 2, R * 2.6, w); else g.fillRect(o - w / 2, -R * 1.3, w, R * 2.6);
      }
    }
    const gl = g.createLinearGradient(0, -R * .95, 0, -R * .15); gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.beginPath(); g.ellipse(-R * .2, -R * .5, R * .56, R * .3, -.32, 0, TAU); g.fillStyle = gl; g.fill();
    const sp = [[-.5, -.36], [-.62, 0], [-.12, -.42], [-.18, -.3], [-.5, -.34], [-.5, -.3]][k];
    g.beginPath(); g.arc(R * sp[0], R * sp[1], R * .075, 0, TAU); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill();
    g.restore();
    shapePath(g, k, R); g.lineWidth = R * .055; g.strokeStyle = hexA(P.d, .85); g.stroke();
  }
  function wrapped(g, k, R) {
    const P = PAL[k];
    for (const sd of [-1, 1]) {        // twisted wrapper ends
      g.save(); g.shadowColor = 'rgba(25,0,40,.35)'; g.shadowBlur = R * .15; g.shadowOffsetY = R * .08;
      g.beginPath(); g.moveTo(sd * R * .55, -R * .2); g.quadraticCurveTo(sd * R * .8, -R * .3, sd * R * 1.06, -R * .62); g.lineTo(sd * R * .94, -R * .3); g.lineTo(sd * R * 1.1, 0); g.lineTo(sd * R * .94, R * .3); g.lineTo(sd * R * 1.06, R * .62); g.quadraticCurveTo(sd * R * .8, R * .3, sd * R * .55, R * .2); g.closePath();
      const gr = g.createLinearGradient(0, -R * .6, 0, R * .6); gr.addColorStop(0, P.l); gr.addColorStop(.45, P.p); gr.addColorStop(1, P.b);
      g.fillStyle = gr; g.fill(); g.restore();
      g.strokeStyle = hexA(P.d, .8); g.lineWidth = R * .05; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = R * .06; g.lineCap = 'round'; g.beginPath(); g.moveTo(sd * R * .66, -R * .16); g.lineTo(sd * R * .98, -R * .46); g.moveTo(sd * R * .7, R * .08); g.lineTo(sd * R * 1.0, R * .02); g.stroke();
    }
    g.save(); g.shadowColor = 'rgba(25,0,40,.4)'; g.shadowBlur = R * .2; g.shadowOffsetY = R * .1;
    rr(g, -R * .74, -R * .7, R * 1.48, R * 1.4, R * .42); const pg = g.createLinearGradient(0, -R * .7, 0, R * .7); pg.addColorStop(0, P.l); pg.addColorStop(.5, P.p); pg.addColorStop(1, P.b); g.fillStyle = pg; g.fill(); g.restore();
    rr(g, -R * .74, -R * .7, R * 1.48, R * 1.4, R * .42); g.lineWidth = R * .055; g.strokeStyle = hexA(P.d, .85); g.stroke();
    sweetBody(g, k, 0, R * .56);
    g.save(); rr(g, -R * .74, -R * .7, R * 1.48, R * 1.4, R * .42); g.clip();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(-R * .9, R * .05); g.lineTo(R * .05, -R * .9); g.lineTo(R * .32, -R * .9); g.lineTo(-R * .9, R * .32); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = R * .05; rr(g, -R * .66, -R * .62, R * 1.32, R * 1.24, R * .36); g.stroke();
    g.restore();
  }
  function orb(g, R) {
    g.save(); g.shadowColor = 'rgba(25,0,40,.5)'; g.shadowBlur = R * .25; g.shadowOffsetY = R * .13;
    g.beginPath(); g.arc(0, 0, R * .9, 0, TAU); g.fillStyle = '#3a1450'; g.fill(); g.restore();
    g.save(); g.beginPath(); g.arc(0, 0, R * .9, 0, TAU); g.clip();
    for (let j = 0; j < 12; j++) {          // rainbow swirl segments
      const a0 = j * TAU / 12, a1 = a0 + TAU / 12;
      g.beginPath(); g.moveTo(0, 0);
      for (let q = 0; q <= 8; q++) { const t = q / 8, rr = R * .95 * t, a = a0 + t * 1.3; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      for (let q = 8; q >= 0; q--) { const t = q / 8, rr = R * .95 * t, a = a1 + t * 1.3; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = PAL[j % 6].b; g.fill();
    }
    const sh = g.createRadialGradient(-R * .3, -R * .38, R * .05, 0, 0, R * .95);
    sh.addColorStop(0, 'rgba(255,255,255,.75)'); sh.addColorStop(.35, 'rgba(255,255,255,.12)'); sh.addColorStop(.75, 'rgba(40,0,60,.05)'); sh.addColorStop(1, 'rgba(40,0,60,.6)');
    g.fillStyle = sh; g.fillRect(-R, -R, R * 2, R * 2);
    const gl = g.createLinearGradient(0, -R * .9, 0, -R * .2); gl.addColorStop(0, 'rgba(255,255,255,.85)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.beginPath(); g.ellipse(-R * .18, -R * .52, R * .5, R * .26, -.3, 0, TAU); g.fillStyle = gl; g.fill();
    g.restore();
    g.beginPath(); g.arc(0, 0, R * .9, 0, TAU); g.lineWidth = R * .06; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
    g.save(); g.shadowColor = '#fff'; g.shadowBlur = R * .35; g.fillStyle = '#fff';
    g.beginPath(); for (let j = 0; j < 8; j++) { const a = -Math.PI / 2 + j * Math.PI / 4, rr = j % 2 ? R * .12 : R * .36; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.restore();
  }
  function strawberry(g, R) {
    const body = () => { g.beginPath(); g.moveTo(0, R * .95); g.bezierCurveTo(-R * .55, R * .78, -R * .98, R * .1, -R * .8, -R * .34); g.bezierCurveTo(-R * .62, -R * .74, R * .62, -R * .74, R * .8, -R * .34); g.bezierCurveTo(R * .98, R * .1, R * .55, R * .78, 0, R * .95); g.closePath(); };
    g.save(); g.shadowColor = 'rgba(25,0,40,.45)'; g.shadowBlur = R * .25; g.shadowOffsetY = R * .13; body(); g.fillStyle = '#9a0d22'; g.fill(); g.restore();
    const gr = g.createRadialGradient(-R * .3, -R * .3, R * .05, 0, 0, R * 1.1); gr.addColorStop(0, '#ffb0b8'); gr.addColorStop(.3, '#ff4b5f'); gr.addColorStop(.75, '#e01834'); gr.addColorStop(1, '#8a0a1e');
    body(); g.fillStyle = gr; g.fill();
    g.save(); body(); g.clip();
    for (let y = -2; y <= 3; y++) for (let x = -3; x <= 3; x++) { const px = (x + (y % 2 ? .5 : 0)) * R * .3, py = y * R * .27; if (px * px / (R * R * .5) + (py - R * .1) * (py - R * .1) / (R * R * .7) > 1) continue; g.fillStyle = '#ffe9a0'; g.beginPath(); g.ellipse(px, py, R * .045, R * .07, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,0,20,.35)'; g.beginPath(); g.ellipse(px, py + R * .06, R * .05, R * .025, 0, 0, TAU); g.fill(); }
    const gl = g.createLinearGradient(0, -R * .7, 0, 0); gl.addColorStop(0, 'rgba(255,255,255,.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.beginPath(); g.ellipse(-R * .28, -R * .32, R * .32, R * .2, -.5, 0, TAU); g.fillStyle = gl; g.fill();
    g.restore();
    body(); g.lineWidth = R * .05; g.strokeStyle = '#7a0818'; g.stroke();
    g.beginPath(); for (let j = 0; j < 10; j++) { const a = Math.PI + j * Math.PI / 9, rr = j % 2 ? R * .2 : R * .62; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .55 - R * .56); } g.closePath();
    const lg = g.createLinearGradient(0, -R * .9, 0, -R * .4); lg.addColorStop(0, '#9af07a'); lg.addColorStop(1, '#1f9a3a'); g.fillStyle = lg; g.fill(); g.lineWidth = R * .04; g.strokeStyle = '#0f6a2a'; g.stroke();
    g.beginPath(); g.moveTo(0, -R * .6); g.quadraticCurveTo(R * .05, -R * .9, R * .2, -R * 1.0); g.lineWidth = R * .09; g.lineCap = 'round'; g.strokeStyle = '#2a8a3a'; g.stroke();
  }
  function drawSweet(g, k, s, R) { if (k === ING) strawberry(g, R); else if (s === 4) orb(g, R); else if (s === 3) wrapped(g, k, R); else sweetBody(g, k, s, R); }
  function sprite(k, s) {
    const key = k + '|' + s; let c = sprites.get(key); if (c) return c;
    const S = T * 1.3, px = Math.ceil(S * dpr); c = document.createElement('canvas'); c.width = c.height = px; c.css = S;
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(S / 2, S / 2 - T * .03); drawSweet(g, k, s, T * .41);
    sprites.set(key, c); return c;
  }
  function tileSprite(kind, lv) {
    const key = kind + lv; let c = sprites.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = Math.ceil(T * 1.2 * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(T * .1, T * .1);
    if (kind === 'j') drawJellyTile(g, 0, 0, T, lv, 1, lv === 2); else drawIceTile(g, 0, 0, T, lv, 1);
    sprites.set(key, c); return c;
  }
  function drawTile(kind, i, v) {
    const x = ox + CL(i) * T - T * .1, y = oy + RW(i) * T - T * .1, w = T * 1.2;
    ctx.globalAlpha = Math.min(1, v); ctx.drawImage(tileSprite(kind, 1), x, y, w, w);
    if (v > 1.01) { ctx.globalAlpha = Math.min(1, v - 1); ctx.drawImage(tileSprite(kind, 2), x, y, w, w); }
    ctx.globalAlpha = 1;
  }
  const iconCache = {};
  function icon(kind, k) {
    const key = kind + k; if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.translate(48, 46);
    if (kind === 'col') drawSweet(g, k, 0, 36); else if (kind === 'ing') drawSweet(g, ING, 0, 36);
    else if (kind === 'jelly') { drawJellyTile(g, -40, -38, 80, 2, 1); }
    else if (kind === 'ice') { drawIceTile(g, -40, -38, 80, 2, 1); }
    return (iconCache[key] = c.toDataURL());
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawJellyTile(g, x, y, s, lv, a, top) {
    const i = s * .05, r = s * .2;
    if (lv > 0 && !top) {
      const al = Math.min(1, lv) * a;
      g.globalAlpha = al; rr(g, x + i, y + i, s - 2 * i, s - 2 * i, r);
      const gr = g.createLinearGradient(x, y, x, y + s); gr.addColorStop(0, 'rgba(255,150,210,.55)'); gr.addColorStop(1, 'rgba(240,80,170,.55)'); g.fillStyle = gr; g.fill();
      g.lineWidth = s * .045; g.strokeStyle = 'rgba(255,190,230,.85)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, x + s * .16, y + s * .12, s * .5, s * .1, s * .05); g.fill();
    }
    if (lv > 1) {
      g.globalAlpha = Math.min(1, lv - 1) * a; rr(g, x + s * .14, y + s * .14, s * .72, s * .72, r * .7);
      g.fillStyle = 'rgba(215,40,140,.55)'; g.fill(); g.lineWidth = s * .035; g.strokeStyle = 'rgba(255,215,240,.9)'; g.stroke();
    }
    g.globalAlpha = 1;
  }
  function drawIceTile(g, x, y, s, lv, a) {
    if (lv <= 0) return;
    const i = s * .06, r = s * .16;
    g.globalAlpha = Math.min(1, lv) * a;
    g.save(); g.shadowColor = 'rgba(0,30,60,.35)'; g.shadowBlur = s * .08; g.shadowOffsetY = s * .05;
    rr(g, x + i, y + i, s - 2 * i, s - 2 * i, r);
    const gr = g.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, '#f4fcff'); gr.addColorStop(.5, '#c8ecfa'); gr.addColorStop(1, '#8ccbe8'); g.fillStyle = gr; g.fill(); g.restore();
    g.lineWidth = s * .04; g.strokeStyle = 'rgba(255,255,255,.9)'; rr(g, x + i, y + i, s - 2 * i, s - 2 * i, r); g.stroke();
    g.strokeStyle = 'rgba(70,140,190,.55)'; g.lineWidth = s * .03; g.beginPath(); g.moveTo(x + s * .24, y + s * .82); g.lineTo(x + s * .8, y + s * .82); g.lineTo(x + s * .8, y + s * .26); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(x + s * .2, y + s * .3); g.lineTo(x + s * .3, y + s * .18); g.lineTo(x + s * .48, y + s * .18); g.lineTo(x + s * .2, y + s * .46); g.closePath(); g.fill();
    if (lv > 1.01) { g.globalAlpha = Math.min(1, lv - 1) * a; rr(g, x + s * .22, y + s * .22, s * .56, s * .56, r * .6); g.lineWidth = s * .035; g.strokeStyle = 'rgba(90,160,210,.6)'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fill(); }
    else { g.strokeStyle = 'rgba(60,120,170,.6)'; g.lineWidth = s * .025; g.beginPath(); g.moveTo(x + s * .5, y + s * .12); g.lineTo(x + s * .44, y + s * .4); g.lineTo(x + s * .6, y + s * .52); g.lineTo(x + s * .52, y + s * .86); g.moveTo(x + s * .44, y + s * .4); g.lineTo(x + s * .16, y + s * .5); g.stroke(); }
    g.globalAlpha = 1;
  }

  /* ---------- view state ---------- */
  const stage = $('#smStage'), cv = $('#smCanvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, T = 40, ox = 0, oy = 0, panel = null, sprites = new Map(), raf = 0, running = false, lastT = 0, clock = 0;
  let S = null, proc = null, wait = 0, sel = -1, drag = null, idle = 0, hint = null, shownScore = 0, endT = 0, ended = false;
  let dying = [], parts = [], fxs = [], pops = [], texts = [];
  const jv = new Float32Array(NC), iv = new Float32Array(NC);
  const cx = c => ox + (c + .5) * T, cy = r => oy + (r + .5) * T;
  function tween(p, to, d) { if (!p || p.x == null) return; p.tw = { x0: p.x, y0: p.y, x1: CL(to), y1: RW(to), t: 0, d }; }
  function popup(x, y, text, col) { pops.push({ x, y, text, col, t: 0 }); }
  function combo(text) { texts = texts.filter(t => t.t < .4); texts.push({ text, t: 0 }); }
  function burst(x, y, k) {
    if (parts.length > 320) return;
    const col = k < 6 ? PAL[k] : { b: '#ffffff', l: '#ffffff', p: '#ffe0ff' }, many = parts.length > 140;
    for (let j = 0; j < (many ? 3 : 7); j++) { const a = Math.random() * TAU, v = 2 + Math.random() * 3.5; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, t: 0, life: .45 + Math.random() * .3, sz: .06 + Math.random() * .07, col: j % 3 ? col.b : col.l, kind: 0 }); }
    for (let j = 0; j < (many ? 1 : 2); j++) { const a = Math.random() * TAU, v = 1 + Math.random() * 1.5; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, t: 0, life: .5 + Math.random() * .3, sz: .12 + Math.random() * .06, col: '#ffffff', kind: 1 }); }
  }
  function sparkles(x, y, n) { for (let j = 0; j < n; j++) { const a = Math.random() * TAU, v = 1 + Math.random() * 3; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, t: 0, life: .6 + Math.random() * .4, sz: .1 + Math.random() * .08, col: j % 2 ? '#ffe9a0' : '#ffffff', kind: 1 }); } }
  function shards(x, y, n) { for (let j = 0; j < n; j++) { const a = Math.random() * TAU, v = 1.5 + Math.random() * 3; parts.push({ x: x + (Math.random() - .5) * .6, y: y + (Math.random() - .5) * .6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, t: 0, life: .5 + Math.random() * .3, sz: .07 + Math.random() * .08, col: j % 2 ? '#e8f8ff' : '#9fd8f0', kind: 2, rot: Math.random() * 6 }); } }
  function jellySplash(x, y) { for (let j = 0; j < 6; j++) { const a = Math.random() * TAU, v = 1 + Math.random() * 2; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, t: 0, life: .4 + Math.random() * .2, sz: .08 + Math.random() * .06, col: '#ff8ccc', kind: 0 }); } }
  function bolts(c, r, targets) { targets.forEach((j, n) => fxs.push({ type: 'bolt', x0: c, y0: r, x1: CL(j), y1: RW(j), t: -n * .012, dur: .5, seed: Math.random() * 1000 })); fxs.push({ type: 'boom', c, r, rad: 1, t: 0, dur: .45, col: '#ffffff' }); }

  /* ---------- runner ---------- */
  function run(gen) { proc = gen; wait = 0; step(0); }
  function settled() {
    for (let i = 0; i < NC; i++) { const p = S.p[i]; if (p && (p.tw || p.delay > 0 || Math.abs(p.y - RW(i)) > .001)) return false; }
    return true;
  }
  function step(dt) {
    if (!proc) return;
    if (wait === SETTLE) { if (!settled()) return; wait = 0; } else { wait -= dt; if (wait > 0) return; }
    for (let n = 0; n < 400; n++) {
      const r = proc.next();
      if (r.done) { proc = null; afterProc(); return; }
      if (r.value === SETTLE) { if (!settled()) { wait = SETTLE; return; } continue; }
      if (r.value > 0) { wait += r.value / 1000; if (wait > 0) return; }
    }
  }
  function finishProc() {           // leave in the middle of an animation: resolve instantly
    if (!proc) return;
    S.fx = false; runSync(proc); proc = null; S.fx = true; snap(); afterProc();
  }
  function snap() { S.p.forEach((p, i) => { if (!p) return; if (p.x == null) { p.vy = 0; } p.x = CL(i); p.y = RW(i); p.tw = null; p.delay = 0; p.vy = 0; }); dying = []; }
  function afterProc() {
    idle = 0; hint = null;
    if (!S) return;
    if (S.over) { if (!ended) { ended = true; onEnd(); } }
    else save();
    hud(true);
  }

  /* ---------- game flow ---------- */
  function initVisual(st, drop) {
    st.fx = true;
    st.p.forEach((p, i) => { if (!p) return; p.x = CL(i); p.vy = 0; p.y = drop ? RW(i) - N - 1 : RW(i); p.delay = drop ? CL(i) * .035 + (N - RW(i)) * .02 : 0; });
    for (let i = 0; i < NC; i++) { jv[i] = st.jelly[i]; iv[i] = st.ice[i]; }
    dying = []; parts = []; fxs = []; pops = []; texts = []; sel = -1; drag = null; hint = null; idle = 0; proc = null; ended = false; panel = null;
    shownScore = st.score; hudSig = ''; forceDraw = true;
    prewarm();
  }
  let warmT = 0;
  function prewarm() {               // render every sprite in small idle slices, so the first special never stutters
    clearTimeout(warmT);
    const todo = [[ING, 0], [ORB, 4]]; for (let k = 0; k < 6; k++) for (let s = 0; s < 4; s++) todo.push([k, s]);
    const next = () => { if (current !== 'sm') return; for (let n = 0; n < 3 && todo.length; n++) { const [k, s] = todo.shift(); sprite(k, s); } if (todo.length) warmT = setTimeout(next, 30); else { tileSprite('j', 1); tileSprite('j', 2); tileSprite('i', 1); tileSprite('i', 2); } };
    warmT = setTimeout(next, 60);
  }
  function startLevel(li) {
    closeModals();
    S = newState('lvl', li, (Math.random() * 4294967296) >>> 0); initVisual(S, true);
    prog.played++; saveProg(); store.del('sm.save');
    layout(); hud(true); sfx('smShuffle');
    showLevelIntro();
  }
  function startEndless() {
    closeModals();
    S = newState('end', 0, (Math.random() * 4294967296) >>> 0); initVisual(S, true);
    prog.played++; saveProg(); store.del('sm.save');
    layout(); hud(true); sfx('smShuffle'); setTimeout(() => { if (S && S.mode === 'end' && !S.used) combo('Vrij spel'); }, 500);
  }
  function showLevelIntro() {
    const L = LEVELS[S.li];
    $('#smLvNum').textContent = 'Level ' + (S.li + 1);
    $('#smLvName').textContent = L.n;
    $('#smLvGoals').innerHTML = goals(S).map(g => `<div>${goalImg(g, 52)}<b>${g.t === 'score' ? fmtN(g.need) : g.need}</b><small>${goalLabel(g)}</small></div>`).join('');
    $('#smLvText').innerHTML = `in <b>${L.mv}</b> zetten`;
    openModal('smLevelModal');
  }
  function goalImg(g, s) { return g.t === 'score' ? `<span class="sm-gsc" style="width:${s}px;height:${s}px;font-size:${s * .55}px">🎯</span>` : `<img src="${icon(g.t, g.k ?? '')}" width="${s}" height="${s}" alt="">`; }
  function goalLabel(g) { return g.t === 'score' ? 'punten' : g.t === 'col' ? NAMES[g.k][1] : g.t === 'jelly' ? 'gelei' : g.t === 'ice' ? 'ijsblokken' : 'aardbeien'; }
  function onEnd() {
    store.del('sm.save');
    let rec = false, stars = 0;
    if (S.mode === 'lvl') {
      if (S.won) {
        stars = starsOf(S); prog.won++;
        const k = S.li; if (!(prog.stars[k] >= stars)) prog.stars[k] = stars; if (!(prog.best[k] >= S.score)) { rec = prog.best[k] != null; prog.best[k] = S.score; }
        prog.unlocked = Math.max(prog.unlocked, Math.min(LEVELS.length, k + 2));
      }
    } else if (S.score > (prog.endless || 0)) { rec = (prog.endless || 0) > 0; prog.endless = S.score; }
    saveProg();
    const won = S.won || S.mode === 'end';
    setTimeout(() => { sfx(won ? 'smWin' : 'smFail', 0, 0); if (won) vibrate(30); }, 250);
    clearTimeout(endT); endT = setTimeout(() => showEnd(stars, rec), won ? 1100 : 900);
  }
  function showEnd(stars, rec) {
    if (!S || !S.over || current !== 'sm') return;
    const lv = S.mode === 'lvl';
    $('#smEndStars').innerHTML = lv ? [1, 2, 3].map(s => `<span class="${s <= stars ? 'on' : ''}" style="animation-delay:${.15 + s * .22}s">★</span>`).join('') : '<span class="sm-endico">🍭</span>';
    if (lv && S.won) {
      $('#smEndTitle').textContent = `Level ${S.li + 1} gehaald!`;
      $('#smEndText').innerHTML = `Score <b>${fmtN(S.score)}</b>${rec ? ' · 🎉 nieuw record' : ''}` + (S.li + 1 >= LEVELS.length ? '<br>🏆 Je hebt alle levels van Snoepmix gehaald!' : '');
    } else if (lv) {
      $('#smEndTitle').textContent = 'Helaas, geen zetten meer';
      const miss = goals(S).filter(g => g.have < g.need).map(g => g.t === 'score' ? `${fmtN(g.need - g.have)} punten` : `${g.need - g.have} ${g.need - g.have === 1 && g.t === 'col' ? NAMES[g.k][0] : goalLabel(g)}`);
      $('#smEndText').innerHTML = `Score <b>${fmtN(S.score)}</b><br><small>Nog nodig: ${miss.join(', ')}</small>`;
    } else {
      $('#smEndTitle').textContent = 'Vrij spel voorbij';
      $('#smEndText').innerHTML = `Score <b>${fmtN(S.score)}</b>${rec ? ' · 🎉 nieuw record' : `<br><small>Record: ${fmtN(prog.endless || 0)}</small>`}`;
    }
    $('#smEndNext').hidden = !(lv && S.won && S.li + 1 < LEVELS.length);
    $('#smEndRetry').classList.toggle('primary', !(lv && S.won && S.li + 1 < LEVELS.length));
    $('#smEndRetry').textContent = lv ? 'Opnieuw' : 'Nog een keer';
    openModal('smEndModal');
  }
  const save = () => { if (S && !S.over && !proc && S.used > 0) store.set('sm.save', serialize(S)); };
  function tryMove(a, b) {
    if (!canInput() || !swappable(S, a) || !swappable(S, b) || nb4(a).indexOf(b) < 0) return false;
    sel = -1; hint = null; idle = 0;
    run(playerMove(S, a, b));
    return true;
  }
  const canInput = () => S && !S.over && !proc && !anyModal() && current === 'sm';

  /* ---------- update ---------- */
  function update(dt) {
    clock += dt;
    step(dt);
    for (let i = 0; i < NC; i++) {
      const p = S.p[i]; if (!p) continue;
      if (p.x == null) { p.x = CL(i); p.y = RW(i); p.vy = 0; }
      const tr = RW(i);
      if (p.tw) { const w = p.tw; w.t += dt; const e = Math.min(1, w.t / w.d), k = e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2; p.x = w.x0 + (w.x1 - w.x0) * k; p.y = w.y0 + (w.y1 - w.y0) * k; if (e >= 1) p.tw = null; continue; }
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.x = CL(i);
      if (p.y < tr) { p.vy = Math.min((p.vy || 0) + 75 * dt, 19); p.y += p.vy * dt; if (p.y >= tr) { p.y = tr; if (p.vy > 2.5) p.land = 1e-4; p.vy = 0; } }
      else if (p.y > tr) p.y = tr;
      if (p.land) { p.land += dt; if (p.land > .3) p.land = 0; }
      if (p.born != null) { p.born += dt; if (p.born > .4) p.born = null; }
      if (p.flash > 0) p.flash -= dt;
    }
    for (let i = 0; i < NC; i++) { jv[i] += (S.jelly[i] - jv[i]) * Math.min(1, dt * 7); iv[i] += (S.ice[i] - iv[i]) * Math.min(1, dt * 9); }
    dying = dying.filter(d => (d.t += dt) < (d.up ? .6 : .28));
    for (const q of parts) { q.t += dt; q.vy += (q.kind === 1 ? 4 : 14) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 1.5; }
    parts = parts.filter(q => q.t < q.life);
    fxs = fxs.filter(f => (f.t += dt) < f.dur);
    pops = pops.filter(q => (q.t += dt) < 1);
    texts = texts.filter(q => (q.t += dt) < 1.4);
    shownScore += (S.score - shownScore) * Math.min(1, dt * 9); if (Math.abs(S.score - shownScore) < 1) shownScore = S.score;
    if (canInput() && opt.hints) { idle += dt; if (idle > 5 && !hint) hint = findMove(S); } else if (proc) idle = 0;
    hud();
  }

  /* ---------- drawing ---------- */
  function ensurePanel() {
    const key = T + '|' + dpr + '|' + S.hole.join('');
    if (panel && panel.key === key) return;
    const pad = Math.round(T * .22), w = T * N + pad * 2, c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(w * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(pad, pad);
    const layer = (exp, rad, col) => {
      const l = document.createElement('canvas'); l.width = c.width; l.height = c.height; const q = l.getContext('2d'); q.scale(dpr, dpr); q.translate(pad, pad); q.fillStyle = col;
      for (let i = 0; i < NC; i++) if (!S.hole[i]) {
        const x = CL(i) * T, y = RW(i) * T; rr(q, x - exp, y - exp, T + 2 * exp, T + 2 * exp, rad); q.fill();
        if (CL(i) < N - 1 && !S.hole[i + 1]) q.fillRect(x + T / 2, y - exp, T, T + 2 * exp);          // bridge to the neighbours: no notches
        if (RW(i) < N - 1 && !S.hole[i + N]) q.fillRect(x - exp, y + T / 2, T + 2 * exp, T);
      }
      return l;
    };
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = .35; g.filter = 'blur(' + Math.round(T * .12 * dpr) + 'px)'; g.drawImage(layer(T * .16, T * .3, '#14001f'), 0, Math.round(T * .08 * dpr)); g.filter = 'none';
    g.globalAlpha = .6; g.drawImage(layer(T * .13, T * .28, '#ffd6f0'), 0, 0);
    g.globalAlpha = .82; g.drawImage(layer(T * .07, T * .22, '#2a0f40'), 0, 0);
    g.restore();
    for (let i = 0; i < NC; i++) if (!S.hole[i]) { const odd = (CL(i) + RW(i)) % 2; rr(g, CL(i) * T + T * .035, RW(i) * T + T * .035, T * .93, T * .93, T * .16); g.fillStyle = odd ? 'rgba(255,255,255,.075)' : 'rgba(255,255,255,.12)'; g.fill(); }
    const clip = new Path2D(), spans = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N;) { if (S.hole[r * N + c]) { c++; continue; } let e = c; while (e < N && !S.hole[r * N + e]) e++; const last = spans.find(q => q.c === c && q.e === e && q.r1 === r); if (last) last.r1 = r + 1; else spans.push({ c, e, r0: r, r1: r + 1 }); c = e; }
    spans.forEach(q => clip.rect(ox + q.c * T, oy + q.r0 * T, (q.e - q.c) * T, (q.r1 - q.r0) * T));
    const exits = [];
    if (S.ingNeed) for (let c0 = 0; c0 < N; c0++) for (let r = N - 1; r >= 0; r--) if (!S.hole[r * N + c0]) { exits.push(r * N + c0); break; }
    panel = { key, cv: c, pad, w, clip, exits };
  }
  function drawPiece(p, x, y, sc, rot, alpha) {
    const img = sprite(p.k, p.s), s = img.css * sc;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    if (p.armed) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * (.35 + .25 * Math.sin(clock * 14)); ctx.drawImage(img, -s / 2, -s / 2, s, s); }
    if (p.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, p.flash * 3); ctx.drawImage(img, -s / 2, -s / 2, s, s); }
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!S) return;
    ensurePanel();
    ctx.drawImage(panel.cv, ox - panel.pad, oy - panel.pad, panel.w, panel.w);
    for (let i = 0; i < NC; i++) if (jv[i] > .01) drawTile('j', i, jv[i]);
    for (const e of panel.exits) { const x = cx(CL(e)), y = oy + (RW(e) + 1) * T + T * .02; ctx.fillStyle = 'rgba(255,220,240,.75)'; ctx.beginPath(); ctx.moveTo(x - T * .16, y); ctx.lineTo(x + T * .16, y); ctx.lineTo(x, y + T * .14); ctx.closePath(); ctx.fill(); }
    ctx.save(); ctx.clip(panel.clip);
    if (sel >= 0 && S.p[sel]) { const x = cx(CL(sel)), y = cy(RW(sel)), g = ctx.createRadialGradient(x, y, 0, x, y, T * .62); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - T, y - T, 2 * T, 2 * T); }
    for (let i = 0; i < NC; i++) {
      const p = S.p[i]; if (!p || p.x == null) continue;
      let sc = 1, rot = 0, dy = 0, sx = 1, sy = 1;
      if (p.land) { const t = p.land / .3, k = Math.sin(t * Math.PI * 2) * (1 - t); sy = 1 - .09 * k; sx = 1 + .07 * k; dy = -Math.max(0, Math.sin(t * Math.PI)) * .07 * (1 - t) * T; }
      if (p.born != null) { const t = p.born / .4; sc = t < .6 ? .3 + 1.0 * (t / .6) : 1.3 - .3 * ((t - .6) / .4); }
      if (i === sel) sc *= 1.06 + .03 * Math.sin(clock * 8);
      if (hint && (hint[0] === i || hint[1] === i)) { rot = Math.sin(clock * 11) * .16 * Math.max(0, Math.sin(clock * 2.2)); sc *= 1 + .04 * Math.max(0, Math.sin(clock * 2.2)); }
      const x = cx(p.x), y = cy(p.y) + dy;
      if (sx !== 1 || sy !== 1) { ctx.save(); ctx.translate(x, y + T * .4); ctx.scale(sx, sy); ctx.translate(-x, -y - T * .4); drawPiece(p, x, y, sc, rot, 1); ctx.restore(); }
      else drawPiece(p, x, y, sc, rot, 1);
    }
    for (const d of dying) {
      if (d.up) { const t = d.t / .6; drawPiece(d.p, cx(d.x), cy(d.y) - t * T * .8, 1 + t * .3, 0, 1 - t); continue; }
      const t = d.t / .28;
      if (d.to) { const e = Math.min(1, t * 1.4); drawPiece(d.p, cx(d.x + (d.to[0] - d.x) * e), cy(d.y + (d.to[1] - d.y) * e), 1 - .5 * e, 0, 1 - t * .6); }
      else drawPiece(d.p, cx(d.x), cy(d.y), t < .3 ? 1 + t * .8 : 1.24 * (1 - (t - .3) / .7), 0, 1 - Math.max(0, t - .5) * 2);
    }
    ctx.restore();
    for (let i = 0; i < NC; i++) if (iv[i] > .01) drawTile('i', i, iv[i]);
    drawFx();
    for (const q of parts) {
      const a = 1 - q.t / q.life, x = cx(q.x), y = cy(q.y), s = q.sz * T;
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = q.col;
      if (q.kind === 1) { ctx.beginPath(); for (let j = 0; j < 8; j++) { const an = j * Math.PI / 4 + q.t * 3, r2 = j % 2 ? s * .3 : s; ctx.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2); } ctx.closePath(); ctx.fill(); }
      else if (q.kind === 2) { ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot + q.t * 6); ctx.fillRect(-s / 2, -s / 3, s, s * .66); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(x, y, s * (.5 + .5 * a), 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const q of pops) {
      const t = q.t, a = t < .7 ? 1 : 1 - (t - .7) / .3, s = t < .15 ? .6 + t / .15 * .5 : 1.1 - Math.min(.1, (t - .15));
      ctx.globalAlpha = a; ctx.font = `800 ${Math.round(T * .36 * s)}px system-ui,sans-serif`;
      const x = cx(q.x), y = cy(q.y) - t * T * .7;
      ctx.lineWidth = T * .09; ctx.strokeStyle = 'rgba(50,0,60,.85)'; ctx.strokeText(q.text, x, y); ctx.fillStyle = q.col; ctx.fillText(q.text, x, y);
    }
    ctx.globalAlpha = 1;
    for (const q of texts) {
      const t = q.t, s = t < .25 ? 1.25 * Math.sin(t / .25 * Math.PI / 2) - (t > .18 ? (t - .18) * 2 : 0) : 1 + .04 * Math.sin(t * 6), a = t > 1.05 ? 1 - (t - 1.05) / .35 : 1;
      const x = ox + T * N / 2, y = oy + T * N * .42 - (t > 1.05 ? (t - 1.05) * T : 0);
      if (!q.img || q.T !== T) { q.img = textImg(q.text); q.T = T; }
      const w = q.img.width / dpr, h = q.img.height / dpr;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-.05); ctx.drawImage(q.img, -w / 2, -h / 2, w, h); ctx.restore();
    }
  }
  function textImg(text) {
    const fs = Math.round(Math.min(T * .95, (T * N) / Math.max(5, text.length * .62))), c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = `900 ${fs}px system-ui,sans-serif`; const w = Math.ceil(g.measureText(text).width + fs * 1.2), h = Math.ceil(fs * 1.9);
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr); g.scale(dpr, dpr); g.translate(w / 2, h / 2);
    g.font = `900 ${fs}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.shadowColor = 'rgba(40,0,50,.55)'; g.shadowBlur = fs * .25; g.shadowOffsetY = fs * .08;
    g.lineWidth = fs * .2; g.strokeStyle = '#5a1470'; g.strokeText(text, 0, 0); g.shadowColor = 'transparent';
    const gr = g.createLinearGradient(0, -fs * .5, 0, fs * .5); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.5, '#ffd0ee'); gr.addColorStop(1, '#ff7ac2');
    g.fillStyle = gr; g.fillText(text, 0, 0);
    g.lineWidth = fs * .04; g.strokeStyle = 'rgba(255,255,255,.8)'; g.strokeText(text, 0, -fs * .02);
    return c;
  }
  function drawFx() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const BW = T * N;
    for (const f of fxs) {
      const p = Math.max(0, f.t / f.dur); if (f.t < 0) continue;
      if (f.type === 'beam') {
        const reach = Math.min(1, p * 3.2) * BW, th = T * .62 * Math.pow(1 - p, .6) * f.w, a = 1 - p * .7;
        ctx.globalAlpha = a;
        if (f.d === 'h') { const y = cy(f.r), x0 = Math.max(ox, cx(f.c) - reach), x1 = Math.min(ox + BW, cx(f.c) + reach), g = ctx.createLinearGradient(0, y - th, 0, y + th); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.35, f.col); g.addColorStop(.5, '#ffffff'); g.addColorStop(.65, f.col); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x0, y - th, x1 - x0, th * 2); }
        else { const x = cx(f.c), y0 = Math.max(oy, cy(f.r) - reach), y1 = Math.min(oy + BW, cy(f.r) + reach), g = ctx.createLinearGradient(x - th, 0, x + th, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.35, f.col); g.addColorStop(.5, '#ffffff'); g.addColorStop(.65, f.col); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - th, y0, th * 2, y1 - y0); }
        if (p < .3 && Math.random() < .7) { const e = Math.min(1, p * 3.2) * N; parts.push(f.d === 'h' ? { x: f.c + (Math.random() < .5 ? -e : e), y: f.r, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, t: 0, life: .35, sz: .1, col: '#fff', kind: 1 } : { x: f.c, y: f.r + (Math.random() < .5 ? -e : e), vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, t: 0, life: .35, sz: .1, col: '#fff', kind: 1 }); }
      } else if (f.type === 'boom') {
        const x = cx(f.c), y = cy(f.r), R = T * (f.rad + .7) * (1 - Math.pow(1 - Math.min(1, p * 1.6), 3)), a = 1 - p;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.45, hexA(f.col.length === 7 ? f.col : '#ffffff', a * .8)); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        ctx.globalAlpha = a; ctx.lineWidth = T * .08 * (1 - p); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, R * 1.05, 0, TAU); ctx.stroke();
      } else if (f.type === 'ring') {
        const x = cx(f.c), y = cy(f.r), R = T * (.3 + p * .55); ctx.globalAlpha = 1 - p; ctx.lineWidth = T * .1 * (1 - p); ctx.strokeStyle = f.col; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
      } else if (f.type === 'bolt') {
        const x0 = cx(f.x0), y0 = cy(f.y0), x1 = cx(f.x1), y1 = cy(f.y1), seg = 7, jit = T * .28, sd = Math.floor(clock * 25) + f.seed;
        ctx.globalAlpha = (1 - p) * (.7 + .3 * Math.sin(f.t * 60));
        for (const [lw, col] of [[T * .3, 'rgba(255,90,200,.35)'], [T * .15, 'rgba(255,170,240,.75)'], [T * .06, '#ffffff']]) {
          ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0);
          for (let s = 1; s < seg; s++) { const t = s / seg, h = Math.sin(sd * 12.9898 + s * 78.233) * 43758.5453, o = ((h - Math.floor(h)) - .5) * jit * 2; const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1; ctx.lineTo(x0 + (x1 - x0) * t + nx / L * o, y0 + (y1 - y0) * t + ny / L * o); }
          ctx.lineTo(x1, y1); ctx.stroke();
        }
        const g = ctx.createRadialGradient(x1, y1, 0, x1, y1, T * .45); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x1 - T * .5, y1 - T * .5, T, T);
      } else if (f.type === 'flash') {
        ctx.globalAlpha = (1 - p) * .7; ctx.fillStyle = '#ffffff'; ctx.fillRect(ox - T * .2, oy - T * .2, BW + T * .4, BW + T * .4);
      }
    }
    ctx.restore();
  }

  /* ---------- HUD ---------- */
  let hudSig = '', lastShown = -1;
  function hud(force) {
    if (!S) return;
    const L = levelDef(S), lv = S.mode === 'lvl';
    const sc = Math.round(shownScore);
    if (sc !== lastShown || force) { lastShown = sc; $('#smScore').textContent = fmtN(sc); }
    const sig = [S.moves, S.mode, S.li, ...goals(S).map(g => g.have), S.over].join(',');
    if (sig === hudSig && !force) { if (lv) $('#smBarFill').style.width = Math.min(100, sc / L.st[2] * 100) + '%'; return; }
    hudSig = sig;
    $('#smTitle').textContent = lv ? `Level ${S.li + 1} · ${L.n}` : 'Vrij spel';
    $('#smMoves').textContent = Math.max(0, S.moves);
    $('#smMovesW').classList.toggle('low', S.moves <= 5 && !S.over);
    $('#smBar').hidden = !lv;
    if (lv) {
      $('#smBarFill').style.width = Math.min(100, sc / L.st[2] * 100) + '%';
      const marks = L.st.map(v => Math.max(4, Math.min(96, v / L.st[2] * 100)));
      if (!scoreOnly(S)) marks[0] = 0;
      $('#smBar').querySelectorAll('em').forEach((e, j) => { e.style.left = marks[j] + '%'; e.hidden = !marks[j]; e.classList.toggle('on', S.score >= L.st[j] && (j > 0 || scoreOnly(S))); });
      $('#smGoals').classList.toggle('many', L.g.length > 3);
      $('#smGoals').innerHTML = goals(S).map(g => { const done = g.have >= g.need; return g.t === 'score' ? `<div class="sm-goal sc${done ? ' done' : ''}"><small>Doel</small><b>${done ? '✓' : fmtN(g.need)}</b></div>` : `<div class="sm-goal${done ? ' done' : ''}">${goalImg(g, 30)}<b>${done ? '✓' : g.need - g.have}</b></div>`; }).join('');
    } else $('#smGoals').innerHTML = `<div class="sm-goal sc"><small>Record</small><b>${fmtN(Math.max(prog.endless || 0, S.score))}</b></div><div class="sm-goal sc"><small>Bonus bij</small><b>${fmtN(S.nextBonus)}</b></div>`;
  }

  /* ---------- layout / loop ---------- */
  function layout() {
    const land = innerWidth > innerHeight * 1.15; $('#sm').classList.toggle('land', land);
    dpr = Math.min(2.5, window.devicePixelRatio || 1); W = stage.clientWidth; H = stage.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const B = Math.max(160, Math.min(W - 20, H - (land ? 30 : 20), 720)); const nT = Math.floor(B / N);
    if (nT !== T) { sprites.clear(); if (S) prewarm(); }
    forceDraw = true; T = nT; ox = Math.round((W - T * N) / 2); oy = Math.round((H - T * N) / 2); panel = null;
    const hd = $('#smHud');                // pull the HUD and the board together into one centred group
    if (land) { const g = 28, h = Math.max(0, Math.round((2 * ox - g) * .5)); ox = h + g; hd.style.transform = `translateX(${h}px)`; }
    else { const g = 14, h = Math.max(0, Math.round((2 * oy - g) * .42)); oy = h + g; hd.style.transform = `translateY(${h}px)`; }
  }
  let forceDraw = true, wasBusy = true;
  function busyVisual() {
    if (proc || drag || sel >= 0 || hint || dying.length || parts.length || fxs.length || pops.length || texts.length || Math.abs(S.score - shownScore) >= 1) return true;
    for (let i = 0; i < NC; i++) {
      const p = S.p[i]; if (p && (p.tw || p.delay > 0 || p.land || p.born != null || p.flash > 0 || p.armed || Math.abs(p.y - RW(i)) > .001)) return true;
      if (Math.abs(jv[i] - S.jelly[i]) > .004 || Math.abs(iv[i] - S.ice[i]) > .004) return true;
    }
    return false;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(1 / 20, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (current !== 'sm' || document.hidden) { forceDraw = true; return; }
    const live = S && (!anyModal() || $('#smLevelModal').classList.contains('show') && !document.querySelector('.modal.show:not(#smLevelModal)'));
    if (live) update(dt);
    const busy = !!live && busyVisual();               // nothing moves: keep the last frame (saves battery)
    if (forceDraw || busy || wasBusy) { draw(); forceDraw = false; }
    wasBusy = busy;
  }

  /* ---------- input ---------- */
  function cellAt(e) { const b = cv.getBoundingClientRect(), x = e.clientX - b.left - ox, y = e.clientY - b.top - oy; if (x < 0 || y < 0 || x >= T * N || y >= T * N) return -1; const i = Math.floor(y / T) * N + Math.floor(x / T); return S && !S.hole[i] ? i : -1; }
  cv.addEventListener('pointerdown', e => {
    if (!canInput()) return;
    const i = cellAt(e); idle = 0; hint = null;
    if (i < 0 || !swappable(S, i)) { sel = -1; return; }
    drag = { i, x: e.clientX, y: e.clientY, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || drag.moved) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < T * .3) return;
    drag.moved = true;
    const i = drag.i, c = CL(i), r = RW(i);
    const j = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? (c < N - 1 ? i + 1 : -1) : (c > 0 ? i - 1 : -1)) : (dy > 0 ? (r < N - 1 ? i + N : -1) : (r > 0 ? i - N : -1));
    if (j >= 0) tryMove(i, j);
  });
  const up = () => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved || !canInput()) return;
    if (sel >= 0 && sel !== d.i && nb4(sel).includes(d.i)) { tryMove(sel, d.i); return; }
    sel = sel === d.i ? -1 : d.i; if (sel >= 0) sfx('tap', 0, 0);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { drag = null; });

  /* ---------- menus ---------- */
  function renderStart() {
    const tot = Object.values(prog.stars).reduce((a, b) => a + b, 0);
    $('#smLevels').innerHTML = LEVELS.map((L, i) => { const lock = i + 1 > prog.unlocked, st = prog.stars[i] || 0; return `<button data-n="${i}" ${lock ? 'disabled' : ''} class="${lock ? 'lock' : ''}${!lock && i + 1 === prog.unlocked && !st ? ' next' : ''}" aria-label="Level ${i + 1}"><b>${lock ? '🔒' : i + 1}</b><span>${[1, 2, 3].map(s => `<i class="${s <= st ? 'on' : ''}">★</i>`).join('')}</span></button>`; }).join('');
    $('#smEndless').innerHTML = `<span>🍭</span><div><b>Vrij spel</b><small>Speel zolang je zetten hebt · record ${fmtN(prog.endless || 0)}</small></div>`;
    $('#smOptList').innerHTML = [['hints', 'Tips na 5 seconden', [[true, 'Aan'], [false, 'Uit']]], ['sound', 'Geluid en muziek', [[true, 'Aan'], [false, 'Uit']]]].map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#smStats').innerHTML = [['Levels', `${Object.keys(prog.stars).length}/${LEVELS.length}`], ['Sterren', `${tot}/${LEVELS.length * 3}`], ['Record', fmtN(prog.endless || 0)]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    const can = !!(S && !S.over);
    $('#smResume').hidden = !can;
    if (can) $('#smResume').textContent = S.mode === 'lvl' ? `Verder met level ${S.li + 1} ▶` : 'Verder met vrij spel ▶';
  }
  $('#smLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b && !b.disabled) startLevel(+b.dataset.n); });
  $('#smEndless').addEventListener('click', () => startEndless());
  $('#smOptList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); Sfx.refresh(); renderStart(); });
  $('#smResume').addEventListener('click', () => closeModals());
  $('#smStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#smLvGo').addEventListener('click', () => closeModals());
  $('#smLvBack').addEventListener('click', () => { closeModals(); renderStart(); openModal('smStartModal'); });
  $('#smEndNext').addEventListener('click', () => { if (S && S.mode === 'lvl') startLevel(Math.min(LEVELS.length - 1, S.li + 1)); });
  $('#smEndRetry').addEventListener('click', () => { if (S && S.mode === 'lvl') startLevel(S.li); else startEndless(); });
  $('#smEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('smStartModal'); });
  $('#smBack').addEventListener('click', () => leave());
  $('#smMenu').addEventListener('click', () => { if (proc) return; renderStart(); openModal('smStartModal'); });
  $('#smRetry').addEventListener('click', async () => {
    if (!S || proc) return;
    if (S.over || !S.used) { if (S.mode === 'lvl') startLevel(S.li); else startEndless(); return; }
    const ok = await askConfirm('Opnieuw beginnen?', S.mode === 'lvl' ? `Level ${S.li + 1} begint opnieuw; je huidige zetten gaan verloren.` : 'Je huidige vrije spel gaat verloren.', 'Opnieuw');
    if (ok && current === 'sm') { if (S.mode === 'lvl') startLevel(S.li); else startEndless(); }
  });
  window.addEventListener('resize', () => { if (current === 'sm') layout(); });

  function enter() {
    show('sm');
    if (!S) { const sv = deserialize(store.get('sm.save', null)); if (sv) { S = sv; initVisual(S, false); } }
    layout(); hud(true);
    if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
    renderStart(); openModal('smStartModal');
  }
  function leave() { finishProc(); save(); running = false; cancelAnimationFrame(raf); drag = null; closeModals(); show('menu'); refreshMenu(); }

  /* ---------- test hooks + bot ---------- */
  function evalMove(st, a, b) {
    const c = clone(st); c.seed = (st.seed ^ 0x5bd1e995) + a * 131 + b * 7;
    const g0 = goals(c), s0 = c.score, m0 = c.made, ip0 = ingDepth(c);
    runSync(playerMove(c, a, b, true));
    if (c.bad) return -1e9;
    const g1 = goals(c); let v = 0;
    g1.forEach((g, j) => { const d = g.have - g0[j].have, left = g0[j].need - g0[j].have; if (g.t === 'col') v += Math.min(d, left) * 8; else if (g.t === 'jelly') v += d * 14; else if (g.t === 'ice') v += d * 14; else if (g.t === 'ing') v += d * 150; });
    return v + (c.score - s0) / 60 + (c.made - m0) * 20 + (ingDepth(c) - ip0) * 6;
  }
  function ingDepth(st) { let d = 0; st.p.forEach((p, i) => { if (p && p.k === ING) d += RW(i); }); return d; }
  function bot(li, runs = 20, kind = 'greedy', seed0 = 1) {
    const out = { level: li + 1, runs, wins: 0, stars: [0, 0, 0, 0], scores: [], left: [], moves: [] };
    for (let r = 0; r < runs; r++) {
      const st = newState(li < 0 ? 'end' : 'lvl', Math.max(0, li), (seed0 * 7919 + r * 104729 + 17) >>> 0);
      let guard = 0;
      while (!st.over && guard++ < 400) {
        const ms = findMove(st, true); if (!ms.length) { runSync(reshuffle(st)); continue; }
        let best = ms[0];
        if (kind === 'random') best = ms[Math.floor(Math.random() * ms.length)];
        else { let bv = -1e9; for (const [a, b] of ms) { const v = evalMove(st, a, b) + Math.random() * 3; if (v > bv) { bv = v; best = [a, b]; } } }
        runSync(playerMove(st, best[0], best[1]));
      }
      if (!st.won) { out.rem = out.rem || []; goals(st).forEach((g, j) => { out.rem[j] = (out.rem[j] || 0) + (g.need - g.have) / runs; }); if (st.jelly.some(v => v)) { out.jl = out.jl || new Array(NC).fill(0); st.jelly.forEach((v, i) => { out.jl[i] += v ? 1 : 0; }); } }
      if (st.won) out.wins++; out.stars[starsOf(st)]++; out.scores.push(st.score); out.left.push(st.won && st.doneAt != null ? levelDef(st).mv - st.doneAt : st.moves); out.moves.push(st.used);
    }
    out.rate = out.wins / runs; out.avg = Math.round(out.scores.reduce((a, b) => a + b, 0) / runs);
    return out;
  }
  window.__sm = {
    get S() { return S; }, get busy() { return !!proc; }, get prog() { return prog; }, LEVELS, opt, startLevel, startEndless, tryMove, findMove: () => S && findMove(S), findGroups: () => S && findGroups(S),
    set(i, k, s) { if (!S) return; const p = mk(S, k, s); p.x = CL(i); p.y = RW(i); S.p[i] = p; },
    setRow(r, str) { const m = { r: 0, o: 1, y: 2, g: 3, b: 4, p: 5, s: ING }; [...str].forEach((ch, c) => { if (ch in m) this.set(r * N + c, m[ch], 0); }); },
    setMoves(n) { S.moves = n; hud(true); }, addScore(n) { S.score += n; },
    finish: () => finishProc(), reshuffle: () => { if (S && !proc) run(reshuffle(S)); }, get hint() { return hint; }, get fxCount() { return fxs.length + parts.length; }, bot, goals: () => S && goals(S), starsOf: () => S && starsOf(S), hud: () => hud(true), cell: i => [cx(CL(i)), cy(RW(i))], get T() { return T; },
    board(rows) { const m = { r: 0, o: 1, y: 2, g: 3, b: 4, p: 5, s: ING }; rows.forEach((str, r) => [...str].forEach((ch, c) => { if (ch in m) this.set(r * N + c, m[ch], 0); })); },
    unlockAll() { prog.unlocked = LEVELS.length; saveProg(); }, newState, runSync, playerMove, clone
  };
  return { enter, leave, hasSave: () => !!store.get('sm.save', null) };
})();
$('#tileSm').addEventListener('click', () => Snoepmix.enter());
