  /* ================= core.js: deterministic real-time strategy simulation at 15 Hz (no DOM) ================= */
  const DT = 1 / TPS, PI2 = Math.PI * 2, CELL = 4;
  const wrapA = a => { a %= PI2; if (a > Math.PI) a -= PI2; else if (a < -Math.PI) a += PI2; return a; };
  const turnTo = (a, b, r) => { const d = wrapA(b - a); return Math.abs(d) <= r ? b : wrapA(a + Math.sign(d) * r); };
  function rnd(S) { let s = S.rs; s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; S.rs = s; return s / 4294967296; }
  const isB = e => e && e.k === 'b';
  const COMBAT = t => !!UT[t].wt;

  /* ---------- creating a match ---------- */
  // cfg: { map: {seed,w,h,n,rich,rock,cliffs,dunes}, players: [{fac, ai (difficulty index or null), start, cry, raid, aggro}],
  //        kr (sand creeper), obj (mission objectives or null), tier (1..3), mission (index or null), human (player index or -1) }
  function newGame(cfg) {
    const M = genMap(cfg.map);
    const S = { v: CORE_V, t: 0, rs: ((cfg.seed ?? cfg.map.seed * 2654435761) >>> 0) || 7, cfg, nid: 1, U: [], B: [], PJ: [], pq: [], res: null, tier: cfg.tier || 3,
      human: cfg.human ?? 0, fogV: 0, obj: cfg.obj ? cfg.obj.map(o => Object.assign({}, o, { done: false })) : null };
    attachMap(S, M); S.cry = M.cry.slice(); S.slab = new Uint8Array(S.N); S.exp = new Uint8Array(S.N);
    S.P = cfg.players.map((p, i) => ({ i, fac: p.fac, ai: p.ai ?? null, cry: p.cry ?? 2500, q: { b: [], i: [], v: [] }, ready: null, out: false, nb: p.start === 'army',
      st: { harv: 0, built: 0, made: 0, kills: 0, lost: 0, blost: 0 }, bc: {}, ever: {}, pw: 0, pu: 0, cap: 0, low: false, raid: !!p.raid, aggro: !!p.aggro, A: null, base: M.bases[i] }));
    S.kr = cfg.kr && M.sandFrac > .2 ? { st: 'gone', t: Math.round(TPS * (25 + rnd(S) * 25)), x: 0, y: 0, d: 0, px: 0, py: 0, hurt: 0, tg: 0, wx: 0, wy: 0, eat: 0 } : null;
    S.P.forEach((P, i) => setupStart(S, P, cfg.players[i].start || 'mcv'));
    recalc(S);
    if (typeof AI !== 'undefined') for (const P of S.P) if (P.ai != null) AI.init(S, P);
    updateFog(S);
    return S;
  }
  function attachMap(S, M) {
    S.W = M.w; S.H = M.h; S.N = M.w * M.h; S.ter = M.ter; S.cmax = M.cmax; S.bases = M.bases; S.sandFrac = M.sandFrac;
    S.occ = new Int32Array(S.N); S.E = Object.create(null); S.ev = []; S.cd = [];
    S.ft = []; for (let i = 0; i < S.N; i++) if (M.cmax[i]) S.ft.push(i);
    S.hc = Math.ceil(S.W / CELL); S.hr = Math.ceil(S.H / CELL); S.hash = Array.from({ length: S.hc * S.hr }, () => []);
    S.vis = new Uint8Array(S.N); S.mark = new Uint32Array(S.N); S.gen = 1;
    AS.init(S.N);
  }
  function setupStart(S, P, kind) {
    const B = P.base, o = P.i;
    const put = t => { const s = findSpot(S, o, t, B.x, B.y, true, t === 'raff' ? raffAim(S, B.x, B.y) : null); if (s) placeBuilding(S, o, t, s.x, s.y, true); };
    if (kind !== 'army' && kind !== 'outpost') { placeBuilding(S, o, 'bouw', B.x - 1, B.y - 1, true); }
    if (kind === 'mcvp') put('cent');
    if (kind === 'base') { put('cent'); put('raff'); put('kaz'); }
    if (kind === 'outpost') { put('cent'); put('kaz'); put('cent'); put('raff'); put('fab'); put('toren'); put('toren'); }
    const units = kind === 'army' ? ['lt', 'lt', 'lt', 'lt', 'zt', 'rw', 'rw', 'sol', 'sol', 'sol', 'sol', 'raks', 'raks'] : kind === 'outpost' ? ['sol', 'sol', 'sol', 'lt', 'lt'] : kind === 'base' ? ['sol', 'sol', 'lt'] : ['sol', 'sol', 'verk'];
    for (const t of units) { const p = freeNear(S, B.x + .5, B.y + 2.5, 8); if (p) addUnit(S, o, t, p.x, p.y, Math.PI / 2); }
  }

  /* ---------- entities ---------- */
  function addUnit(S, o, t, x, y, d = Math.PI / 2) {
    const T = UT[t];
    const u = { id: S.nid++, k: 'u', t, o, x, y, px: x, py: y, d, pd: d, tu: d, pt: d, hp: T.hp, st: T.harv ? 'harv' : 'idle', gx: x, gy: y, tg: 0, am: 0, cd: 0,
      path: null, pi: 0, wait: 0, goal: -1, sn: 0, ld: 1e9, stk: 0, v: 0, car: 0, hs: 'seek', ht: -1, hx: -1, rf: 0, fl: 0, hit: -99, mv: 0, ch: 0,
      inq: 0, sx: 0, sy: 0, gh: 0, r: T.r, lx: -99, ly: -99, rt: 0, rp: 0, prf: 0, qw: 0, mt: 0, mining: 0, bm: 0, bx: 0, by: 0, rpg: 0, home: 0, dead: 0, ax: 0, ay: 0 };
    S.U.push(u); S.E[u.id] = u; S.P[o].st.made++;
    return u;
  }
  function placeBuilding(S, o, t, x, y, instant) {
    const T = BT[t], P = S.P[o];
    if (T.slab) { for (let j = y; j < y + T.h; j++) for (let i = x; i < x + T.w; i++) { const k = j * S.W + i; if (S.ter[k] === T_ROCK && !S.occ[k]) S.slab[k] = 1; } S.sv = (S.sv || 0) + 1; return null; }
    let sl = 0;
    for (let j = y; j < y + T.h; j++) for (let i = x; i < x + T.w; i++) { const k = j * S.W + i; S.occ[k] = S.nid; if (S.slab[k]) sl++; }
    const b = { id: S.nid++, k: 'b', t, o, x, y, w: T.w, h: T.h, hp: T.hp, mhp: T.hp, bp: instant ? 1 : 0, rep: 0, rally: null, tu: Math.PI / 2, pt: Math.PI / 2, cd: 0, fl: 0, tg: 0, dk: 0, cl: 0, hit: -99, sl: sl / (T.w * T.h) >= .5 ? 1 : 0, ax: 0, ay: 0, dead: 0, prim: 0 };
    S.B.push(b); S.E[b.id] = b; S.rc = 1;
    P.ever[t] = (P.ever[t] || 0) + 1; if (!instant) P.st.built++;
    // own units standing on the footprint step aside
    for (const u of S.U) if (u.x >= x - .3 && u.x < x + T.w + .3 && u.y >= y - .3 && u.y < y + T.h + .3) { const p = freeNear(S, u.x, u.y, 6); if (p) { u.x = u.px = p.x; u.y = u.py = p.y; u.path = null; } }
    if (t === 'raff') { const d = dockOf(b), p = freeNear(S, d.x, d.y, 6); if (p) addUnit(S, o, 'oog', p.x, p.y, Math.PI / 2); }
    return b;
  }
  const center = e => e.k === 'b' ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : e;
  const dockOf = b => ({ x: b.x + Math.floor(b.w / 2) + .5, y: b.y + b.h + .5 });
  function distTo(u, e) {                                   // from a point to a unit, or to the edge of a building
    if (e.k !== 'b') return Math.hypot(e.x - u.x, e.y - u.y);
    const dx = Math.max(e.x - u.x, 0, u.x - (e.x + e.w)), dy = Math.max(e.y - u.y, 0, u.y - (e.y + e.h));
    return Math.hypot(dx, dy);
  }
  const tileOf = (S, x, y) => Math.min(S.H - 1, Math.max(0, Math.floor(y))) * S.W + Math.min(S.W - 1, Math.max(0, Math.floor(x)));
  const passT = (S, i) => S.ter[i] <= T_ROCK && !S.occ[i];
  function freeAt(S, x, y, r) {
    if (x < .05 || y < .05 || x > S.W - .05 || y > S.H - .05) return false;
    if (!passT(S, tileOf(S, x, y))) return false;
    const q = Math.min(r, .34) * .75;
    return passT(S, tileOf(S, x + q, y)) && passT(S, tileOf(S, x - q, y)) && passT(S, tileOf(S, x, y + q)) && passT(S, tileOf(S, x, y - q));
  }
  function unitAt(S, x, y, rad) { for (const u of S.U) if (!u.dead && Math.abs(u.x - x) < rad && Math.abs(u.y - y) < rad) return u; return null; }
  function freeNear(S, x, y, R) {                             // nearest free tile centre (no wall, no unit) in a spiral
    const cx = Math.floor(x), cy = Math.floor(y);
    for (let r = 0; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = cx + dx, ty = cy + dy; if (tx < 0 || ty < 0 || tx >= S.W || ty >= S.H) continue;
      if (!passT(S, ty * S.W + tx)) continue;
      if (unitAt(S, tx + .5, ty + .5, .55)) continue;
      return { x: tx + .5, y: ty + .5 };
    }
    return null;
  }

  /* ---------- power, storage, tech ---------- */
  function recalc(S) {
    for (const P of S.P) { P.pw = 0; P.pu = 0; P.cap = 0; P.bc = {}; }
    for (const b of S.B) { if (b.dead) continue; const P = S.P[b.o], T = BT[b.t]; if (T.pw > 0) P.pw += T.pw; else P.pu -= T.pw; P.cap += T.cap || 0; P.bc[b.t] = (P.bc[b.t] || 0) + 1; }
    for (const P of S.P) P.low = P.pu > P.pw;
    S.rc = 0;
  }
  function techOk(S, o, t) {                                  // can this player build t right now?
    const P = S.P[o], T = UT[t] || BT[t]; if (!T || T.noBuild) return false;
    if ((TIER[t] || 1) > S.tier) return false;
    if (T.fac && FACTIONS[P.fac].id !== T.fac) return false;
    for (const r of T.req || []) if (!P.bc[r]) return false;
    return true;
  }
  const catOf = t => BT[t] ? 'b' : UT[t].cat === 'inf' ? 'i' : 'v';
  const prodOf = { b: 'bouw', i: 'kaz', v: 'fab' };
  const unitCount = (S, o) => { let n = 0; for (const u of S.U) if (u.o === o && !u.dead) n++; return n; };

  /* ---------- placement ---------- */
  function placeTiles(S, o, t, x, y) {                        // per footprint tile: ok?  (+ overall ok incl. the distance rule)
    const T = BT[t], res = []; let ok = true, near = false;
    for (let j = y; j < y + T.h; j++) for (let i = x; i < x + T.w; i++) {
      let good = i >= 0 && j >= 0 && i < S.W && j < S.H;
      if (good) { const k = j * S.W + i; good = S.ter[k] === T_ROCK && !S.occ[k] && (o !== S.human || S.exp[k]); if (good && T.slab && S.slab[k]) good = false; }
      res.push(good); if (!good) ok = false;
    }
    if (!T.slab) for (const u of S.U) { if (u.o === o || u.dead) continue; const i = Math.floor(u.x) - x, j = Math.floor(u.y) - y; if (i >= 0 && j >= 0 && i < T.w && j < T.h) { res[j * T.w + i] = false; ok = false; } }
    if (T.slab && res.some(v => v)) ok = true;
    for (const b of S.B) { if (b.o !== o || b.dead) continue; const gx = Math.max(b.x - (x + T.w), x - (b.x + b.w), 0), gy = Math.max(b.y - (y + T.h), y - (b.y + b.h), 0); if (gx <= 3 && gy <= 3) { near = true; break; } }
    return { tiles: res, ok: ok && near, near };
  }
  // a spot for t near (cx, cy): a ring of free ground around it so the base keeps its roads (used by the computer and the start setup)
  function findSpot(S, o, t, cx, cy, ignoreNear, towards) {
    const T = BT[t], R = 16; let best = null, bs = 1e9;
    for (let r = 0; r <= R; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = Math.round(cx - T.w / 2) + dx, y = Math.round(cy - T.h / 2) + dy;
        if (x < 1 || y < 1 || x + T.w > S.W - 1 || y + T.h > S.H - 1) continue;
        let ok = true;
        for (let j = y - 1; j <= y + T.h && ok; j++) for (let i = x - 1; i <= x + T.w; i++) {
          const k = j * S.W + i, inner = i >= x && i < x + T.w && j >= y && j < y + T.h;
          if (inner) { if (S.ter[k] !== T_ROCK || S.occ[k]) { ok = false; break; } }
          else if (S.occ[k] || S.ter[k] > T_ROCK) { if (T.w > 1 || S.occ[k]) { ok = false; break; } }
        }
        if (!ok) continue;
        // keep the factory and refinery exits open
        const ex = x + Math.floor(T.w / 2), ey = y + T.h; if (ey < S.H && (S.occ[ey * S.W + ex] || S.ter[ey * S.W + ex] > T_ROCK)) continue;
        let blocksExit = false; for (const b of S.B) if (!b.dead && (b.t === 'raff' || b.t === 'fab' || b.t === 'rep' || b.t === 'bouw')) { const d = dockOf(b); if (d.x >= x - .5 && d.x <= x + T.w + .5 && d.y >= y - .5 && d.y <= y + T.h + 1.5) blocksExit = true; }
        if (blocksExit) continue;
        if (!ignoreNear && !placeTiles(S, o, t, x, y).ok) continue;
        const sc = towards ? Math.hypot(x + T.w / 2 - towards.x, y + T.h / 2 - towards.y) + r * .4 : r;
        if (sc < bs) { bs = sc; best = { x, y }; }
      }
      if (best && !towards) return best;
      if (best && towards && r > 9) return best;
    }
    return best;
  }

  function nearField(S, x, y) { let best = -1, bd = 1e9; for (const i of S.ft) { if (S.cry[i] < 30) continue; const d = Math.hypot(i % S.W + .5 - x, ((i / S.W) | 0) + .5 - y); if (d < bd) { bd = d; best = i; } } return best < 0 ? null : { x: best % S.W + .5, y: ((best / S.W) | 0) + .5, d: bd }; }
  function raffAim(S, x, y) { const f = nearField(S, x, y); if (!f) return null; const a = Math.atan2(f.y - y, f.x - x), r = Math.min(5, f.d * .5); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r - 1.5 }; }
  /* ---------- the spatial hash ---------- */
  function buildHash(S) {
    for (const c of S.hash) c.length = 0;
    for (const u of S.U) { if (u.dead) continue; const cx = Math.min(S.hc - 1, Math.max(0, (u.x / CELL) | 0)), cy = Math.min(S.hr - 1, Math.max(0, (u.y / CELL) | 0)); S.hash[cy * S.hc + cx].push(u); }
  }
  function forNear(S, x, y, r, fn) {
    const x0 = Math.max(0, ((x - r) / CELL) | 0), x1 = Math.min(S.hc - 1, ((x + r) / CELL) | 0), y0 = Math.max(0, ((y - r) / CELL) | 0), y1 = Math.min(S.hr - 1, ((y + r) / CELL) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const c = S.hash[cy * S.hc + cx]; for (let k = 0; k < c.length; k++) fn(c[k]); }
  }

  /* ---------- pathfinding: A* on the tile grid (8 directions, no corner cutting), requests spread over ticks ---------- */
  const AS = {
    n: 0, g: null, par: null, stamp: null, closed: null, gen: 0, heap: null, hf: null, hn: 0,
    init(n) { if (this.n === n) return; this.n = n; this.g = new Float32Array(n); this.par = new Int32Array(n); this.stamp = new Uint32Array(n); this.closed = new Uint32Array(n); const hn = Math.max(n * 8, 40000); this.heap = new Int32Array(hn); this.hf = new Float32Array(hn); },
    push(i, f) { let k = this.hn++; const H = this.heap, F = this.hf; while (k > 0) { const p = (k - 1) >> 1; if (F[p] <= f) break; H[k] = H[p]; F[k] = F[p]; k = p; } H[k] = i; F[k] = f; },
    pop() { const H = this.heap, F = this.hf, top = H[0], n = --this.hn; if (n > 0) { const li = H[n], lf = F[n]; let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && F[c + 1] < F[c]) c++; if (F[c] >= lf) break; H[k] = H[c]; F[k] = F[c]; k = c; } H[k] = li; F[k] = lf; } return top; },
  };
  const DIR8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  function nearestPass(S, i, R = 8) {
    if (passT(S, i)) return i;
    const x = i % S.W, y = (i / S.W) | 0;
    for (let r = 1; r <= R; r++) { let best = -1, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const tx = x + dx, ty = y + dy; if (tx < 0 || ty < 0 || tx >= S.W || ty >= S.H) continue; const k = ty * S.W + tx; if (passT(S, k)) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } } } if (best >= 0) return best; }
    return -1;
  }
  function findPath(S, s, g, avoid) {
    const W = S.W, H = S.H; g = nearestPass(S, g); if (g < 0) return null;
    if (s === g) return [g];
    const A = AS; A.gen++; A.hn = 0; const gen = A.gen, gx = g % W, gy = (g / W) | 0;
    const h = i => { const dx = Math.abs(i % W - gx), dy = Math.abs(((i / W) | 0) - gy); return Math.max(dx, dy) + .4142 * Math.min(dx, dy); };
    A.g[s] = 0; A.par[s] = -1; A.stamp[s] = gen; A.push(s, h(s));
    let best = s, bh = h(s), n = 0;
    while (A.hn > 0) {
      const i = A.pop(); if (A.closed[i] === gen) continue; A.closed[i] = gen;
      if (i === g) { best = g; break; }
      const hi = h(i); if (hi < bh) { bh = hi; best = i; }
      if (++n > 4200) break;
      const x = i % W, y = (i / W) | 0, gi = A.g[i];
      for (let d = 0; d < 8; d++) {
        const D = DIR8[d], nx = x + D[0], ny = y + D[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (!passT(S, j) || A.closed[j] === gen) continue;
        if (d >= 4 && (!passT(S, y * W + nx) || !passT(S, ny * W + x))) continue;
        let c = gi + D[2]; if (avoid && avoid[j] === S.gen) c += 2.5;
        if (A.stamp[j] !== gen || c < A.g[j]) { A.stamp[j] = gen; A.g[j] = c; A.par[j] = i; A.push(j, c + h(j)); }
      }
    }
    const out = []; let i = best; while (i !== s && i >= 0) { out.push(i); i = A.par[i]; if (out.length > S.N) break; }
    out.reverse(); return out.length ? smooth(S, s, out) : null;
  }
  function los(S, a, b) {                                     // straight walkable line between two tile centres (a little wide)
    const W = S.W, ax = a % W + .5, ay = ((a / W) | 0) + .5, bx = b % W + .5, by = ((b / W) | 0) + .5, d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / .25);
    const nx = -(by - ay) / (d || 1) * .38, ny = (bx - ax) / (d || 1) * .38;
    for (let k = 1; k < n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; if (!passT(S, tileOf(S, x, y)) || !passT(S, tileOf(S, x + nx, y + ny)) || !passT(S, tileOf(S, x - nx, y - ny))) return false; }
    return true;
  }
  function smooth(S, s, p) {
    const out = []; let from = s, k = 0;
    while (k < p.length) { let far = k; for (let j = Math.min(p.length - 1, k + 10); j > k; j--) if (los(S, from, p[j])) { far = j; break; } out.push(p[far]); from = p[far]; k = far + 1; }
    return out;
  }
  function requestPath(S, u, goal) {
    u.goal = goal; u.path = null; u.pi = 0; u.wait = 1; u.sn = 0; u.ld = 1e9;
    if (!u.inq) { u.inq = 1; S.pq.push(u.id); }
  }
  function runPaths(S) {
    let budget = 7;
    while (budget > 0 && S.pq.length) {
      const id = S.pq.shift(), u = S.E[id]; if (!u || u.dead) continue; u.inq = 0; if (!u.wait) continue;
      let avoid = null;
      if (u.stk > 0) {                                        // stuck before: steer around units that stand still
        S.gen++; avoid = S.mark; forNear(S, u.x, u.y, 6, v => { if (v !== u && !v.path) avoid[tileOf(S, v.x, v.y)] = S.gen; });
      }
      const p = findPath(S, tileOf(S, u.x, u.y), u.goal, avoid);
      u.wait = 0; u.path = p; u.pi = 0; u.ld = 1e9; budget--;
      if (!p) arrive(S, u);
    }
  }
  function stopMove(u) { u.path = null; u.wait = 0; u.pi = 0; }
  function arrive(S, u) {
    u.path = null; u.wait = 0; u.stk = 0;
    if (u.st === 'move' || u.st === 'amove') { u.st = 'idle'; u.gx = u.x; u.gy = u.y; u.am = 0; }
    if (u.ch) { u.ch = 0; }
  }

  /* ---------- commands (the player's taps and the computer use the same ones) ---------- */
  function spreadGoals(S, x, y, n) {
    const W = S.W; let s = nearestPass(S, tileOf(S, x, y)); if (s < 0) return [];
    S.gen++; const mk = S.mark, out = [], q = [s]; mk[s] = S.gen;
    for (let h = 0; h < q.length && out.length < n; h++) {
      const i = q[h]; out.push(i);
      const ix = i % W, iy = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const nx = ix + dx, ny = iy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= S.H) continue; const j = ny * W + nx; if (mk[j] === S.gen || !passT(S, j)) continue; mk[j] = S.gen; q.push(j); }
    }
    return out;
  }
  const enemyOf = (S, o, e) => e && !e.dead && e.o !== o;
  function cmd(S, o, c) {
    const P = S.P[o]; if (!P || P.out || S.res) return false;
    const own = () => (c.ids || []).map(id => S.E[id]).filter(u => u && !u.dead && u.k === 'u' && u.o === o);
    switch (c.c) {
      case 'move': case 'amove': {
        const us = own(); if (!us.length) return false;
        const ti = tileOf(S, c.x, c.y);
        const harv = us.filter(u => UT[u.t].harv), rest = us.filter(u => !UT[u.t].harv);
        for (const u of harv) { if (S.cry[ti] > 0 && c.c === 'move') { u.st = 'harv'; u.hs = 'seek'; u.hx = ti; stopMove(u); } else { u.st = 'move'; u.hs = 'seek'; if (u.rf) relDock(S, u); requestPath(S, u, ti); } }
        rest.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
        const goals = spreadGoals(S, c.x, c.y, rest.length);
        rest.forEach((u, k) => { const g = goals[Math.min(k, goals.length - 1)]; if (g == null) return; u.st = c.c; u.am = c.c === 'amove' ? 1 : 0; u.tg = 0; u.ch = 0; u.stk = 0; if (u.rp) relRep(S, u); u.gx = g % S.W + .5; u.gy = ((g / S.W) | 0) + .5; requestPath(S, u, g); });
        return true;
      }
      case 'attack': {
        const t = c.tg === -1 ? (S.kr && S.kr.st !== 'gone' ? S.kr : null) : S.E[c.tg]; if (!t || (t !== S.kr && !enemyOf(S, o, t))) return false;
        for (const u of own()) { if (!UT[u.t].wt) continue; if (u.rp) relRep(S, u); u.st = 'atk'; u.tg = c.tg; u.am = 0; u.ch = 0; u.stk = 0; stopMove(u); u.rt = -99; }
        return true;
      }
      case 'stop': for (const u of own()) { stopMove(u); if (u.rp) relRep(S, u); if (UT[u.t].harv) { u.st = 'idle'; if (u.rf) relDock(S, u); } else { u.st = 'idle'; u.tg = 0; u.am = 0; } u.gx = u.x; u.gy = u.y; } return true;
      case 'harvest': for (const u of own()) if (UT[u.t].harv) { if (u.rf) relDock(S, u); u.st = 'harv'; u.hs = c.x != null ? 'seek' : u.car >= UT.oog.harv * .5 ? 'ret' : 'seek'; if (c.x != null) u.hx = tileOf(S, c.x, c.y); stopMove(u); } return true;
      case 'unload': for (const u of own()) if (UT[u.t].harv) { u.st = 'harv'; u.hs = 'ret'; u.prf = c.b || 0; stopMove(u); } return true;
      case 'repair': {
        const pad = c.b ? S.E[c.b] : null;
        for (const u of own()) { if (UT[u.t].cat !== 'veh') continue; const r = pad && pad.o === o && pad.t === 'rep' ? pad : nearestB(S, o, 'rep', u.x, u.y); if (!r) return false; if (u.rf) relDock(S, u); u.st = 'rep'; u.rp = r.id; u.tg = 0; requestPath(S, u, tileOf(S, dockOf(r).x, dockOf(r).y)); }
        return true;
      }
      case 'build': {
        const t = c.t; if (!techOk(S, o, t)) return false;
        const cat = catOf(t), q = P.q[cat]; if (q.length >= 5) return false;
        if (cat !== 'b') { let n = unitCount(S, o); for (const k of ['i', 'v']) n += P.q[k].length; if (n >= UNIT_CAP) return false; }
        q.push({ t, p: 0, paid: 0, hold: 0 }); return true;
      }
      case 'cancel': {
        const q = P.q[c.cat]; if (!q) return false;
        if (c.cat === 'b' && c.ready && P.ready) { P.cry += (BT[P.ready].cost); P.ready = null; return true; }
        const k = c.i ?? q.length - 1; const it = q[k]; if (!it) return false; P.cry += it.paid; q.splice(k, 1); return true;
      }
      case 'place': {
        if (!P.ready) return false; const t = P.ready;
        if (!placeTiles(S, o, t, c.x, c.y).ok) return false;
        placeBuilding(S, o, t, c.x, c.y, false); P.ready = null; S.ev.push({ t: 'placed', o, b: t, x: c.x + BT[t].w / 2, y: c.y + BT[t].h / 2 }); recalc(S); return true;
      }
      case 'brep': { const b = S.E[c.b]; if (!b || b.o !== o || b.k !== 'b') return false; b.rep = b.hp < b.mhp ? (b.rep ? 0 : 1) : 0; return true; }
      case 'sell': {
        const b = S.E[c.b]; if (!b || b.o !== o || b.k !== 'b' || b.dead) return false;
        P.cry += Math.round(BT[b.t].cost * .5 * b.hp / b.mhp); removeB(S, b); S.ev.push({ t: 'sold', o, x: b.x + b.w / 2, y: b.y + b.h / 2, b: b.t, w: b.w, h: b.h }); return true;
      }
      case 'rally': { const b = S.E[c.b]; if (!b || b.o !== o || b.k !== 'b') return false; b.rally = c.x == null ? null : { x: c.x, y: c.y }; return true; }
    }
    return false;
  }
  function nearestB(S, o, t, x, y) { let best = null, bd = 1e9; for (const b of S.B) if (!b.dead && b.o === o && b.t === t) { const d = Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y); if (d < bd) { bd = d; best = b; } } return best; }
  function relDock(S, u) { const r = S.E[u.rf]; if (r && r.dk === u.id) r.dk = 0; u.rf = 0; }
  function relRep(S, u) { const r = S.E[u.rp]; if (r && r.cl === u.id) r.cl = 0; u.rp = 0; }
  function removeB(S, b) {
    b.dead = 1; b.hp = 0; for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) { const k = j * S.W + i; if (S.occ[k] === b.id) S.occ[k] = 0; }
    S.rc = 1; S.bv = (S.bv || 0) + 1;
  }

  /* ---------- production ---------- */
  function production(S) {
    for (const P of S.P) {
      if (P.out) continue;
      const mult = (P.low ? .5 : 1) * (P.ai != null ? DIFFS[P.ai].build : 1);
      for (const cat of ['b', 'i', 'v']) {
        const q = P.q[cat]; if (!q.length) continue; const it = q[0];
        if (cat === 'b' && P.ready) { it.hold = 4; continue; }
        const np = P.bc[prodOf[cat]] || 0; if (!np) { it.hold = 1; continue; }
        if (cat !== 'b' && unitCount(S, P.i) >= UNIT_CAP) { it.hold = 3; continue; }
        const T = UT[it.t] || BT[it.t], spd = mult * (1 + .4 * Math.min(2, np - 1));
        let dp = Math.min(spd / (T.bt * TPS), 1 - it.p);
        const need = T.cost * dp;
        if (P.cry < need) { if (P.cry > .01) { const f = P.cry / T.cost; dp = f; it.p += f; it.paid += P.cry; P.cry = 0; } it.hold = 2; continue; }
        P.cry -= need; it.paid += need; it.p += dp; it.hold = 0;
        if (it.p >= 1 - 1e-9) {
          if (cat === 'b') { P.ready = it.t; q.shift(); S.ev.push({ t: 'bready', o: P.i, b: it.t }); }
          else { const u = spawn(S, P.i, it.t); if (u) { q.shift(); S.ev.push({ t: 'uready', o: P.i, u: it.t, x: u.x, y: u.y }); } else { it.p = 1; it.hold = 5; } }
        }
      }
    }
  }
  function spawn(S, o, t) {
    const cat = UT[t].cat === 'inf' ? 'kaz' : 'fab'; let src = null;
    for (const b of S.B) if (!b.dead && b.o === o && b.t === cat) { src = b; if (b.prim) break; }
    if (!src) return null;
    const d = dockOf(src), p = freeNear(S, d.x, d.y, 6); if (!p) return null;
    const u = addUnit(S, o, t, p.x, p.y, Math.PI / 2);
    if (src.rally && !UT[t].harv) { const g = nearestPass(S, tileOf(S, src.rally.x, src.rally.y)); if (g >= 0) { u.st = 'move'; u.gx = g % S.W + .5; u.gy = ((g / S.W) | 0) + .5; requestPath(S, u, g); } }
    return u;
  }

  /* ---------- units ---------- */
  function unitTick(S, u) {
    const T = UT[u.t];
    if (u.cd > 0) u.cd--; if (u.fl > 0) u.fl--;
    if (T.regen && u.hp < T.hp && S.t - u.hit > 45) u.hp = Math.min(T.hp, u.hp + .45);
    if (T.harv) harvTick(S, u, T);
    else if (u.st === 'rep') repTick(S, u, T);
    else combat(S, u, T);
    moveTick(S, u, T);
  }
  function acquire(S, u, r, wt, x = u.x, y = u.y) {
    let best = null, bs = r * r * 4; const o = u.o, r2 = r * r, HS = S.hash, hc = S.hc, M = MULT[wt];
    const x0 = Math.max(0, ((x - r) / CELL) | 0), x1 = Math.min(hc - 1, ((x + r) / CELL) | 0), y0 = Math.max(0, ((y - r) / CELL) | 0), y1 = Math.min(S.hr - 1, ((y + r) / CELL) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = HS[cy * hc + cx];
      for (let k = 0; k < c.length; k++) {
        const v = c[k]; if (v.o === o || v.dead) continue; const dx = v.x - x, dy = v.y - y, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
        const T = UT[v.t], sc = d2 * (M[T.arm] < .4 ? 2.2 : 1) * (T.wt ? 1 : 1.6);
        if (sc < bs) { bs = sc; best = v; }
      }
    }
    if (best) return best;
    for (const b of S.B) {
      if (b.o === o || b.dead) continue; const d = distTo({ x, y }, b); if (d > r) continue;
      const sc = d * d * (BT[b.t].wt ? 1 : 1.5) + 1; if (sc < bs) { bs = sc; best = b; }
    }
    return best;
  }
  function getTarget(S, u) {
    if (!u.tg) return null;
    if (u.tg === -1) return S.kr && S.kr.st !== 'gone' ? S.kr : null;
    const t = S.E[u.tg]; return t && !t.dead ? t : null;
  }
  function combat(S, u, T) {
    if (!T.wt) { if (u.st === 'atk') u.st = 'idle'; return; }
    let tg = getTarget(S, u);
    if (!tg && u.tg) { u.tg = 0; if (u.st === 'atk') { u.st = 'idle'; u.gx = u.x; u.gy = u.y; stopMove(u); } }
    const auto = u.st === 'idle' || u.st === 'amove' || (u.st === 'move' && T.tur);
    if (auto && (S.t + u.id) % 5 === 0) {
      const r = u.st === 'move' ? T.rng : T.sight + (u.st === 'amove' ? 1.5 : 0);
      const n = acquire(S, u, r, T.wt);
      if (n) { tg = n; u.tg = n.id; } else if (u.st !== 'idle' || !u.ch) { if (tg && tg !== S.kr) { tg = null; u.tg = 0; } }
    }
    if (!tg) {
      if (u.st === 'idle' && u.ch) { u.ch = 0; requestPath(S, u, tileOf(S, u.gx, u.gy)); }
      else if (u.st === 'amove' && (u.ch || (!u.path && !u.wait))) { u.ch = 0; if (Math.hypot(u.x - u.gx, u.y - u.gy) < 1.2) arrive(S, u); else requestPath(S, u, tileOf(S, u.gx, u.gy)); }
      if (T.tur) u.tu = turnTo(u.tu, u.d, .12);
      return;
    }
    const c = center(tg), d = tg === S.kr ? Math.hypot(tg.x - u.x, tg.y - u.y) : distTo(u, tg);
    if (u.st === 'idle' && Math.hypot(u.x - u.gx, u.y - u.gy) > 8) { u.tg = 0; u.ch = 0; requestPath(S, u, tileOf(S, u.gx, u.gy)); return; }
    const inR = d <= T.rng + (isB(tg) ? .15 : 0) && (!T.minr || d >= T.minr);
    if (inR) {
      if (u.st !== 'move' && (u.path || u.wait)) { stopMove(u); u.ch = 0; }
      const a = Math.atan2(c.y - u.y, c.x - u.x);
      if (T.tur) u.tu = turnTo(u.tu, a, .3); else { u.d = turnTo(u.d, a, T.trn || 1); u.tu = u.d; }
      if (Math.abs(wrapA(u.tu - a)) < .25 && u.cd <= 0 && (u.st !== 'move' || T.tur)) fire(S, u, tg, T, c);
    } else if (u.st !== 'move') {
      if (T.tur) u.tu = turnTo(u.tu, Math.atan2(c.y - u.y, c.x - u.x), .2);
      if (T.minr && d < T.minr) {                            // artillery too close: back off a little
        if (!u.path && !u.wait) { const a = Math.atan2(u.y - c.y, u.x - c.x); requestPath(S, u, tileOf(S, u.x + Math.cos(a) * 3, u.y + Math.sin(a) * 3)); u.ch = u.st === 'idle' ? 1 : 0; }
        return;
      }
      const moved = Math.hypot(c.x - (u.lx ?? -99), c.y - (u.ly ?? -99));
      if ((!u.path && !u.wait) || (moved > 1.8 && S.t - (u.rt || 0) > 12)) { u.lx = c.x; u.ly = c.y; u.rt = S.t; requestPath(S, u, tileOf(S, c.x, c.y)); if (u.st === 'idle' || u.st === 'amove') u.ch = 1; }
    }
  }
  const proj = (x, y, tx, ty, tid, sp, wt, dmg, o, n, sr) => ({ x, y, px: x, py: y, sx: x, sy: y, tx, ty, tid, sp, wt, dmg, o, a: 0, n, sr, z: 0, pz: 0, ang: 0 });
  function muzzle(u, T, side = 0) { const r = (T.r || .3) * 1.15, a = u.tu; return { x: u.x + Math.cos(a) * r - Math.sin(a) * side, y: u.y + Math.sin(a) * r + Math.cos(a) * side }; }
  function fire(S, u, tg, T, c) {
    u.cd = T.cd; u.fl = 3;
    const id = tg === S.kr ? -1 : tg.id;
    if (T.wt === 'kogel') {
      const m = muzzle(u, T); hurt(S, tg, T.dmg, 'kogel', u.o, u);
      S.ev.push({ t: 'fire', wt: 'kogel', x: m.x, y: m.y, tx: c.x + (rnd(S) - .5) * .3, ty: c.y + (rnd(S) - .5) * .3, o: u.o, u: u.t, inf: T.cat === 'inf' });
    } else if (T.wt === 'kanon' || T.wt === 'raket') {
      const sides = T.twin ? [-.16, .16] : [0];
      for (const sd of sides) { const m = muzzle(u, T, sd); S.PJ.push(proj(m.x, m.y, c.x, c.y, id, (T.wt === 'raket' ? 9 : 13) * DT, T.wt, T.dmg, u.o, 0, 0)); }
      S.ev.push({ t: 'fire', wt: T.wt, x: u.x, y: u.y, a: u.tu, r: T.r, o: u.o, u: u.t, inf: T.cat === 'inf' });
    } else if (T.wt === 'granaat') {
      const d = Math.hypot(c.x - u.x, c.y - u.y), sx = c.x + (rnd(S) - .5) * .8, sy = c.y + (rnd(S) - .5) * .8, m = muzzle(u, T);
      S.PJ.push(proj(m.x, m.y, sx, sy, 0, 0, 'granaat', T.dmg, u.o, Math.round(10 + d * 1.6), T.splash));
      S.ev.push({ t: 'fire', wt: 'granaat', x: u.x, y: u.y, a: u.tu, r: T.r, o: u.o, u: u.t });
    } else if (T.wt === 'straal') {
      hurt(S, tg, T.dmg, 'straal', u.o, u); u.bm = 4; u.bx = c.x; u.by = c.y;
      if (S.t % 4 === 0) S.ev.push({ t: 'beam', x: u.x, y: u.y, tx: c.x, ty: c.y, o: u.o });
    } else if (T.wt === 'bliksem') {
      const pts = [{ x: u.x, y: u.y }, { x: c.x, y: c.y }], hitIds = new Set([id]); let last = tg, dmg = T.dmg;
      hurt(S, tg, dmg, 'bliksem', u.o, u);
      for (let k = 1; k < (T.chain || 1); k++) {
        dmg *= .6; const lc = center(last); let nx = null, nd = 2.8 * 2.8;
        forNear(S, lc.x, lc.y, 2.8, v => { if (v.o === u.o || v.dead || hitIds.has(v.id)) return; const d2 = (v.x - lc.x) ** 2 + (v.y - lc.y) ** 2; if (d2 < nd) { nd = d2; nx = v; } });
        if (!nx) break; hitIds.add(nx.id); pts.push({ x: nx.x, y: nx.y }); hurt(S, nx, dmg, 'bliksem', u.o, u); last = nx;
      }
      S.ev.push({ t: 'zap', pts, o: u.o });
    }
  }
  function hurt(S, e, dmg, wt, o, src) {
    if (e === S.kr) { if (e.st === 'gone') return; e.hurt += dmg; if (e.hurt > 260) { krDive(S, 'flee'); S.ev.push({ t: 'krflee', o, x: e.x, y: e.y }); } return; }
    if (e.dead) return;
    const arm = e.k === 'b' ? 'geb' : UT[e.t].arm;
    let d = dmg * MULT[wt][arm]; if (e.k === 'b' && e.sl) d *= .75;
    e.hp -= d; e.hit = S.t;
    if (src) { e.ax = src.x; e.ay = src.y; }
    const P = S.P[e.o];
    if (o !== e.o && S.t - (P.attEv || -9999) > TPS * 12 && (e.k === 'b' || UT[e.t].harv || P.i !== S.human)) { P.attEv = S.t; S.ev.push({ t: 'attacked', o: e.o, x: center(e).x, y: center(e).y, b: e.k === 'b', harv: e.k === 'u' && !!UT[e.t].harv }); }
    if (e.hp <= 0) kill(S, e, o);
  }
  function kill(S, e, by) {
    if (e.dead) return;
    if (e.k === 'u') {
      e.dead = 1; e.hp = 0; if (e.rf) relDock(S, e); if (e.rp) relRep(S, e);
      S.P[e.o].st.lost++; if (by != null && by >= 0 && by !== e.o) S.P[by].st.kills++;
      S.ev.push({ t: 'die', x: e.x, y: e.y, u: e.t, o: e.o, d: e.d, inf: UT[e.t].cat === 'inf', by });
    } else {
      removeB(S, e); S.P[e.o].st.blost++; if (by != null && by >= 0 && by !== e.o) S.P[by].st.kills++;
      S.ev.push({ t: 'bdie', x: e.x + e.w / 2, y: e.y + e.h / 2, w: e.w, h: e.h, b: e.t, o: e.o, by });
      if (e.dk) { const h = S.E[e.dk]; if (h) h.rf = 0; }
    }
  }
  function moveTick(S, u, T) {
    u.mv = 0;
    if (u.bm > 0) u.bm--;
    if (!u.path || u.wait) { u.v *= .5; return; }
    if (u.pi >= u.path.length) { arrive(S, u); return; }
    const w = u.path[u.pi]; if (!passT(S, w)) { requestPath(S, u, u.goal); return; }
    const wx = w % S.W + .5, wy = ((w / S.W) | 0) + .5, dx = wx - u.x, dy = wy - u.y, dist = Math.hypot(dx, dy), last = u.pi === u.path.length - 1;
    if (dist < (last ? .14 : .42)) { u.pi++; u.ld = 1e9; u.sn = 0; if (u.pi >= u.path.length) arrive(S, u); return; }
    const a = Math.atan2(dy, dx), inf = T.cat === 'inf';
    let f = 1;
    if (inf) { u.d = turnTo(u.d, a, .6); if (!T.tur) u.tu = u.d; }
    else { const df = Math.abs(wrapA(a - u.d)); u.d = turnTo(u.d, a, T.trn || .3); f = Math.max(0, 1 - df / 1.05); if (!T.tur) u.tu = u.d; }
    const vt = T.spd * DT * f * (S.ter[tileOf(S, u.x, u.y)] === T_ROCK ? 1.08 : 1);
    u.v += (vt - u.v) * (inf ? .6 : .35);
    const st = Math.min(u.v, dist);
    const mx = inf ? dx / dist : Math.cos(u.d), my = inf ? dy / dist : Math.sin(u.d);
    tryMove(S, u, u.x + mx * st, u.y + my * st);
    u.mv = st > .004 ? 1 : 0;
    if (u.ld > 1e8) { u.ld = dist; u.sn = 0; }
    else if (++u.sn >= 20) {                                   // progress check every 20 ticks
      const slow = u.ld - dist < T.spd * DT * 20 * .3; u.sn = 0; u.ld = dist;
      if (!slow) { if (u.stk > 0) u.stk--; }
      else {
        u.stk++; if (u.stk >= 2) u.gh = S.t + 45;                // stuck: may pass through friends for a moment
        const gx = u.goal % S.W + .5, gy = ((u.goal / S.W) | 0) + .5, dg = Math.hypot(gx - u.x, gy - u.y);
        if ((u.stk > 2 && dg < 2.2) || u.stk > 12) { arrive(S, u); if (u.st === 'atk' || u.ch) u.rt = S.t; }
        else if (u.stk % 2) requestPath(S, u, u.goal);
      }
    }
  }
  function tryMove(S, u, nx, ny) {
    const r = UT[u.t].r;
    if (!freeAt(S, u.x, u.y, r * .5)) { if (passT(S, tileOf(S, nx, ny)) || !passT(S, tileOf(S, u.x, u.y))) { u.x = nx; u.y = ny; } return; }
    if (freeAt(S, nx, ny, r)) { u.x = nx; u.y = ny; }
    else if (freeAt(S, nx, u.y, r)) u.x = nx;
    else if (freeAt(S, u.x, ny, r)) u.y = ny;
    else { const cx = Math.floor(u.x) + .5, cy = Math.floor(u.y) + .5; u.x += (cx - u.x) * .2; u.y += (cy - u.y) * .2; }   // blocked: slide to the middle of the tile
  }
  function separate(S) {
    const U = S.U, hc = S.hc, hr = S.hr, HS = S.hash, t = S.t;
    for (let i = 0; i < U.length; i++) { U[i].sx = 0; U[i].sy = 0; }
    for (let cy = 0; cy < hr; cy++) for (let cx = 0; cx < hc; cx++) {
      const c = HS[cy * hc + cx]; if (!c.length) continue;
      const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < hr - 1 ? cy + 1 : cy, x0 = cx > 0 ? cx - 1 : 0, x1 = cx < hc - 1 ? cx + 1 : cx;
      for (let a = 0; a < c.length; a++) {
        const u = c[a]; if (u.dead) continue; const ru = u.r, ug = u.gh > t;
        for (let ny = y0; ny <= y1; ny++) for (let nx = x0; nx <= x1; nx++) {
          const c2 = HS[ny * hc + nx];
          for (let b = 0; b < c2.length; b++) {
            const v = c2[b]; if (v.id <= u.id) continue;
            const dx = v.x - u.x; if (dx > 1.2 || dx < -1.2) continue; const dy = v.y - u.y; if (dy > 1.2 || dy < -1.2 || v.dead) continue;
            const md = (ru + v.r) * .92;
            const d2 = dx * dx + dy * dy; if (d2 >= md * md) continue;
            if (u.o === v.o && (ug || v.gh > t)) continue;
            let d = Math.sqrt(d2), nx2, ny2;
            if (d < 1e-4) { const an = ((u.id * 7 + v.id * 13) % 628) / 100; nx2 = Math.cos(an); ny2 = Math.sin(an); d = 0; } else { nx2 = dx / d; ny2 = dy / d; }
            const ov = (md - d) * .5, wu = u.path ? .35 : 1, wv = v.path ? .35 : 1, s = 2 / (wu + wv);
            u.sx -= nx2 * ov * wu * s; u.sy -= ny2 * ov * wu * s; v.sx += nx2 * ov * wv * s; v.sy += ny2 * ov * wv * s;
            if (u.path && v.path && Math.cos(u.d) * Math.cos(v.d) + Math.sin(u.d) * Math.sin(v.d) < .5) {   // meeting head-on: both keep right
              const k = Math.max(ov, .04) * .9; u.sx -= Math.sin(u.d) * k; u.sy += Math.cos(u.d) * k; v.sx -= Math.sin(v.d) * k; v.sy += Math.cos(v.d) * k;
            }
          }
        }
      }
    }
    for (let i = 0; i < U.length; i++) {
      const u = U[i]; if (u.dead || (!u.sx && !u.sy) || u.hs === 'unload' || u.cl) continue;
      const m = Math.hypot(u.sx, u.sy), k = m > .09 ? .09 / m : 1;
      tryMove(S, u, u.x + u.sx * k, u.y + u.sy * k);
    }
  }

  /* ---------- harvesters ---------- */
  function findCrystal(S, from, R, u) {
    const W = S.W; S.gen++; const mk = S.mark; let q = [from], h = 0; mk[from] = S.gen;
    const claimed = new Set(); for (const v of S.U) if (v !== u && !v.dead && v.ht >= 0 && UT[v.t].harv && v.hs !== 'ret' && v.hs !== 'toraf' && v.hs !== 'unload') claimed.add(v.ht);
    const fx = from % W, fy = (from / W) | 0;
    while (h < q.length) {
      const i = q[h++]; if (S.cry[i] > 8 && !claimed.has(i)) return i;
      const x = i % W, y = (i / W) | 0; if (Math.max(Math.abs(x - fx), Math.abs(y - fy)) >= R) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= S.H) continue; const j = ny * W + nx; if (mk[j] === S.gen) continue; mk[j] = S.gen; if (S.ter[j] <= T_ROCK && !S.occ[j]) q.push(j); }
    }
    return -1;
  }
  function harvTick(S, u, T) {
    if (u.st !== 'harv') return;
    const P = S.P[u.o];
    switch (u.hs) {
      case 'seek': {
        if (u.path || u.wait) return;
        if ((S.t + u.id) % 6) return;
        const from = u.hx >= 0 ? u.hx : tileOf(S, u.x, u.y);
        let i = findCrystal(S, from, 18, u); if (i < 0 && u.hx >= 0) i = findCrystal(S, tileOf(S, u.x, u.y), 40, u);
        if (i < 0) { if (u.car > 0) u.hs = 'ret'; else u.hs = 'none'; return; }
        u.ht = i; u.hs = 'go'; requestPath(S, u, i); return;
      }
      case 'none': if ((S.t + u.id) % 60 === 0) u.hs = 'seek'; return;
      case 'go': {
        if (u.path || u.wait) return;
        const ti = tileOf(S, u.x, u.y);
        if (ti === u.ht || (Math.abs(u.x - (u.ht % S.W + .5)) < .8 && Math.abs(u.y - (((u.ht / S.W) | 0) + .5)) < .8)) { u.hs = 'mine'; u.mt = 0; }
        else { u.hs = 'seek'; u.hx = -1; }
        return;
      }
      case 'mine': {
        if (S.t % 2) return;
        let i = tileOf(S, u.x, u.y); if (S.cry[i] <= 0 && S.cry[u.ht] > 0 && Math.hypot(u.x - (u.ht % S.W + .5), u.y - (((u.ht / S.W) | 0) + .5)) < 1.1) i = u.ht;
        if (S.cry[i] <= 0) { const j = findCrystal(S, i, 4, u); if (j >= 0 && u.car < T.harv) { u.ht = j; u.hs = 'go'; requestPath(S, u, j); } else u.hs = u.car > 0 ? 'ret' : 'seek'; return; }
        const take = Math.min(S.cry[i], 5); S.cry[i] -= take; S.cd.push(i); u.mining = 4;
        u.car = Math.min(T.harv, u.car + take * (P.ai != null ? DIFFS[P.ai].eco : 1)); u.hx = i;
        u.d = turnTo(u.d, u.d + .05, .05);
        if (u.car >= T.harv) u.hs = 'ret';
        return;
      }
      case 'ret': {
        let r = u.prf ? S.E[u.prf] : null; u.prf = 0; if (!r || r.dead || r.o !== u.o || r.t !== 'raff') r = nearestB(S, u.o, 'raff', u.x, u.y);
        if (!r) { u.hs = 'noraf'; return; }
        u.rf = r.id; const d = dockOf(r); u.hs = 'toraf'; requestPath(S, u, tileOf(S, d.x, d.y)); return;
      }
      case 'noraf': if ((S.t + u.id) % 45 === 0) u.hs = 'ret'; return;
      case 'toraf': case 'qwait': {
        const r = S.E[u.rf]; if (!r || r.dead) { u.rf = 0; u.hs = 'ret'; return; }
        if (u.path || u.wait) return;
        if (u.hs === 'qwait' && --u.qw > 0) return;
        const d = dockOf(r), dd = Math.hypot(u.x - d.x, u.y - d.y);
        const occ = r.dk && r.dk !== u.id && S.E[r.dk] && !S.E[r.dk].dead;
        if (dd < 2.3 && !occ) { r.dk = u.id; u.hs = 'unload'; S.ev.push({ t: 'unload', o: u.o, x: d.x, y: d.y }); return; }
        if (occ) { u.hs = 'qwait'; u.qw = 12; if (dd > 3.5) requestPath(S, u, tileOf(S, d.x, d.y + 2)); return; }
        u.hs = 'qwait'; u.qw = 3; requestPath(S, u, tileOf(S, d.x, d.y)); return;
      }
      case 'unload': {
        const r = S.E[u.rf]; if (!r || r.dead) { u.rf = 0; u.hs = 'ret'; return; }
        const d = dockOf(r); u.x += (d.x - u.x) * .25; u.y += (d.y - u.y) * .25; u.d = turnTo(u.d, -Math.PI / 2, .15);
        const space = P.cap - P.cry;
        if (space < 1) { if (S.t - (P.fullEv || -9999) > TPS * 15) { P.fullEv = S.t; S.ev.push({ t: 'full', o: u.o }); } return; }
        const amt = Math.min(u.car, 35, space); P.cry += amt; u.car -= amt; P.st.harv += amt;
        if (u.car <= .01) { u.car = 0; r.dk = 0; u.rf = 0; u.hs = 'seek'; const p = freeNear(S, d.x, d.y + 1.5, 3); if (p && u.hx < 0) requestPath(S, u, tileOf(S, p.x, p.y)); }
        return;
      }
    }
  }
  function repTick(S, u, T) {
    const r = S.E[u.rp]; if (!r || r.dead) { u.rp = 0; u.st = 'idle'; stopMove(u); return; }
    if (u.path || u.wait) return;
    const d = dockOf(r), dd = Math.hypot(u.x - d.x, u.y - d.y);
    if (dd > 1.3) { if ((S.t + u.id) % 20 === 0) requestPath(S, u, tileOf(S, d.x, d.y)); return; }
    if (r.cl && r.cl !== u.id && S.E[r.cl] && !S.E[r.cl].dead) return;
    r.cl = u.id; u.x += (d.x - u.x) * .25; u.y += (d.y - u.y) * .25;
    const P = S.P[u.o], amt = Math.min(T.hp - u.hp, T.hp * .012), cost = T.cost * .25 * amt / T.hp;
    if (amt <= 0) { r.cl = 0; u.rp = 0; u.st = 'idle'; const p = freeNear(S, d.x, d.y + 2, 4); if (p) { u.st = 'move'; requestPath(S, u, tileOf(S, p.x, p.y)); } return; }
    if (P.cry < cost || P.low && S.t % 2) return;
    P.cry -= cost; u.hp += amt; u.rpg = 3;
  }

  /* ---------- buildings ---------- */
  function buildingTick(S, b) {
    const T = BT[b.t], P = S.P[b.o];
    if (b.bp < 1) b.bp = Math.min(1, b.bp + 1 / (1.8 * TPS));
    if (b.cd > 0) b.cd--; if (b.fl > 0) b.fl--;
    if (b.rep) {
      const amt = Math.min(b.mhp - b.hp, b.mhp * .006), cost = T.cost * .3 * amt / b.mhp;
      if (amt <= 0) b.rep = 0; else if (P.cry >= cost) { P.cry -= cost; b.hp += amt; }
    }
    if (T.wt && b.bp >= 1) {
      let tg = b.tg ? S.E[b.tg] : null; if (tg && (tg.dead || distTo(center(b), tg) > T.rng + .3)) { tg = null; b.tg = 0; }
      if (!tg && (S.t + b.id) % 5 === 0) { const c = center(b), n = acquire(S, { x: c.x, y: c.y, o: b.o }, T.rng, T.wt); if (n && n.k === 'u') { tg = n; b.tg = n.id; } }
      if (!tg || P.low) return;
      const c = center(b), tc = center(tg), a = Math.atan2(tc.y - c.y, tc.x - c.x);
      b.tu = turnTo(b.tu, a, .22);
      if (Math.abs(wrapA(b.tu - a)) < .2 && b.cd <= 0) {
        b.cd = T.cd; b.fl = 3;
        for (const sd of T.twin ? [-.15, .15] : [0]) { const mx = c.x + Math.cos(b.tu) * .45 - Math.sin(b.tu) * sd, my = c.y + Math.sin(b.tu) * .45 + Math.cos(b.tu) * sd; S.PJ.push(proj(mx, my, tc.x, tc.y, tg.id, (T.wt === 'raket' ? 9 : 13) * DT, T.wt, T.dmg, b.o, 0, 0)); }
        S.ev.push({ t: 'fire', wt: T.wt, x: c.x, y: c.y, a: b.tu, r: .45, o: b.o, b: b.t });
      }
    }
  }

  /* ---------- projectiles ---------- */
  function projectiles(S) {
    let n = 0;
    for (const p of S.PJ) {
      p.px = p.x; p.py = p.y; p.a++;
      if (p.wt === 'granaat') {
        const f = p.a / p.n; p.pz = p.z; p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; p.z = Math.sin(Math.PI * Math.min(1, f)) * (1 + p.n * .06);
        if (p.a >= p.n) { splash(S, p); continue; }
      } else {
        if (p.tid) { const t = p.tid === -1 ? (S.kr && S.kr.st !== 'gone' ? S.kr : null) : S.E[p.tid]; if (t && !t.dead) { const c = center(t); p.tx = c.x; p.ty = c.y; } else p.tid = 0; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d <= p.sp || p.a > 120) {
          const t = p.tid === -1 ? S.kr : p.tid ? S.E[p.tid] : null;
          if (t && !t.dead) hurt(S, t, p.dmg, p.wt, p.o, { x: p.sx, y: p.sy });
          S.ev.push({ t: 'imp', x: p.tx, y: p.ty, wt: p.wt, hit: !!t }); continue;
        }
        p.x += dx / d * p.sp; p.y += dy / d * p.sp; p.ang = Math.atan2(dy, dx);
      }
      S.PJ[n++] = p;
    }
    S.PJ.length = n;
  }
  function splash(S, p) {
    const r = p.sr || 1.2;
    forNear(S, p.tx, p.ty, r + .5, v => { if (v.o === p.o || v.dead) return; const d = Math.hypot(v.x - p.tx, v.y - p.ty); if (d < r + UT[v.t].r * .5) hurt(S, v, p.dmg * (1 - .5 * Math.min(1, d / r)), 'granaat', p.o, { x: p.sx, y: p.sy }); });
    for (const b of S.B) { if (b.o === p.o || b.dead) continue; if (distTo({ x: p.tx, y: p.ty }, b) < r * .6) hurt(S, b, p.dmg * .8, 'granaat', p.o, { x: p.sx, y: p.sy }); }
    S.ev.push({ t: 'imp', x: p.tx, y: p.ty, wt: 'granaat', hit: true });
  }

  /* ---------- the sand creeper (zandkruiper): roams open sand, now and then swallows a unit; never goes onto rock ---------- */
  const krOk = (S, x, y) => { if (x < 1 || y < 1 || x >= S.W - 1 || y >= S.H - 1) return false; const t = S.ter[tileOf(S, x, y)]; return (t === T_SAND || t === T_DUNE) && !S.slab[tileOf(S, x, y)]; };
  function krDive(S, why) { const K = S.kr; K.st = 'gone'; K.t = Math.round(TPS * (why === 'eat' ? 70 + rnd(S) * 40 : 55 + rnd(S) * 30)); K.tg = 0; K.hurt = 0; }
  function krRise(S) {
    const K = S.kr;
    for (let tries = 0; tries < 60; tries++) {
      const x = 2 + rnd(S) * (S.W - 4), y = 2 + rnd(S) * (S.H - 4); if (!krOk(S, x, y)) continue;
      let ok = true; for (const b of S.B) if (!b.dead && Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y) < 9) { ok = false; break; }
      for (let r = 1; r <= 2 && ok; r++) for (let a = 0; a < 6; a++) if (!krOk(S, x + Math.cos(a) * r, y + Math.sin(a) * r)) ok = false;
      if (!ok) continue;
      K.x = K.px = x; K.y = K.py = y; K.st = 'roam'; K.t = Math.round(TPS * (18 + rnd(S) * 22)); K.life = Math.round(TPS * (70 + rnd(S) * 40)); K.wx = x; K.wy = y; K.d = rnd(S) * PI2; S.ev.push({ t: 'krrise', x, y }); return;
    }
    K.t = TPS * 10;
  }
  function krTick(S) {
    const K = S.kr; if (!K) return;
    K.px = K.x; K.py = K.y;
    if (K.st === 'gone') { if (--K.t <= 0) krRise(S); return; }
    let tx = K.wx, ty = K.wy, sp = .85 * DT;
    if (K.st === 'roam' && --K.life <= 0) { krDive(S, 'bored'); S.ev.push({ t: 'krdive', x: K.x, y: K.y }); return; }
    if (K.st === 'roam') {
      if (Math.hypot(K.wx - K.x, K.wy - K.y) < .8 || (S.t % 90 === 0)) { for (let k = 0; k < 12; k++) { const a = rnd(S) * PI2, r = 4 + rnd(S) * 9, x = K.x + Math.cos(a) * r, y = K.y + Math.sin(a) * r; if (krOk(S, x, y)) { K.wx = x; K.wy = y; break; } } }
      if (--K.t <= 0) {
        let best = null, bs = 1e9;
        for (const u of S.U) { if (u.dead) continue; const d = Math.hypot(u.x - K.x, u.y - K.y); if (d > 15 || !krOk(S, u.x, u.y)) continue; const sc = d * (UT[u.t].harv ? .55 : UT[u.t].cat === 'inf' ? 1.6 : 1); if (sc < bs) { bs = sc; best = u; } }
        if (best) { K.st = 'hunt'; K.tg = best.id; K.t = TPS * 32; S.ev.push({ t: 'krhunt', o: best.o, x: best.x, y: best.y, u: best.t }); }
        else K.t = TPS * 8;
      }
    } else if (K.st === 'hunt') {
      const u = S.E[K.tg];
      if (!u || u.dead || !krOk(S, u.x, u.y) || --K.t <= 0) { K.st = 'roam'; K.t = TPS * (12 + rnd(S) * 10); K.tg = 0; }
      else {
        tx = u.x; ty = u.y; sp = 1.42 * DT;
        if (Math.hypot(u.x - K.x, u.y - K.y) < .55) {
          S.ev.push({ t: 'swallow', x: u.x, y: u.y, o: u.o, u: u.t }); K.eat++;
          u.hp = 0; kill(S, u, -1); krDive(S, 'eat'); return;
        }
      }
    }
    const want = Math.atan2(ty - K.y, tx - K.x); K.d = turnTo(K.d, want, .12);
    for (const off of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4]) {
      const a = K.d + off, nx = K.x + Math.cos(a) * sp, ny = K.y + Math.sin(a) * sp;
      if (krOk(S, nx, ny) && krOk(S, nx + Math.cos(a) * .9, ny + Math.sin(a) * .9)) { K.x = nx; K.y = ny; if (off) K.d = turnTo(K.d, a, .25); return; }
    }
    if (K.st === 'roam') { K.wx = K.x - Math.cos(K.d) * 4; K.wy = K.y - Math.sin(K.d) * 4; }
  }

  /* ---------- crystal regrowth, fog, the end of the match ---------- */
  function regrow(S) {
    const n = Math.max(3, Math.round(S.ft.length / 45));
    for (let k = 0; k < n; k++) {
      const i = S.ft[Math.floor(rnd(S) * S.ft.length)]; if (i == null || S.cry[i] >= S.cmax[i]) continue;
      const W = S.W, nb = S.cry[i] > 0 || S.cry[i - 1] > 0 || S.cry[i + 1] > 0 || S.cry[i - W] > 0 || S.cry[i + W] > 0;
      if (nb || rnd(S) < .08) { S.cry[i] = Math.min(S.cmax[i], S.cry[i] + 9); S.cd.push(i); }
    }
  }
  const CIRC = []; for (let r = 0; r <= 12; r++) { const L = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) L.push([dx, dy]); CIRC.push(L); }
  function updateFog(S) {
    const h = S.human; if (h < 0 || !S.P[h]) return;
    const vis = S.vis, exp = S.exp, W = S.W, H = S.H; vis.fill(0);
    const stamp = (x, y, r) => { const cx = Math.floor(x), cy = Math.floor(y), L = CIRC[Math.min(12, Math.round(r))]; for (let k = 0; k < L.length; k++) { const tx = cx + L[k][0], ty = cy + L[k][1]; if (tx >= 0 && ty >= 0 && tx < W && ty < H) vis[ty * W + tx] = 1; } };
    for (const u of S.U) if (u.o === h && !u.dead) stamp(u.x, u.y, UT[u.t].sight);
    for (const b of S.B) if (b.o === h && !b.dead) stamp(b.x + b.w / 2, b.y + b.h / 2, BT[b.t].sight || 3 + Math.max(b.w, b.h) / 2);
    let ch = 0; for (let i = 0; i < S.N; i++) if (vis[i] && !exp[i]) { exp[i] = 1; ch = 1; }
    S.fogV++;
  }
  const realB = (S, o) => S.B.some(b => !b.dead && b.o === o);
  function checkEnd(S) {
    for (const P of S.P) {
      if (P.out) continue;
      const alive = P.nb ? S.U.some(u => !u.dead && u.o === P.i) : realB(S, P.i);
      if (!alive) { P.out = true; S.ev.push({ t: 'out', o: P.i }); for (const u of S.U) if (u.o === P.i && !u.dead) kill(S, u, -1); P.q = { b: [], i: [], v: [] }; P.ready = null; }
    }
    const h = S.human, H = S.P[h];
    if (S.obj && H) {
      for (const o of S.obj) {
        if (o.done || o.fail) continue;
        if (o.t === 'build') o.done = (H.ever[o.b] || 0) >= o.n;
        else if (o.t === 'collect') o.done = H.st.harv >= o.n;
        else if (o.t === 'survive') o.done = S.t >= o.min * 60 * TPS;
        else if (o.t === 'army') o.done = S.U.filter(u => !u.dead && u.o === h && UT[u.t].wt).length >= o.n;
        else if (o.t === 'destroy') o.done = S.P.every(P => P.i === h || P.out || !realB(S, P.i));
        else if (o.t === 'protect') { if (!S.U.some(u => !u.dead && u.o === h && u.t === o.ut) && !H.q.v.some(q => q.t === o.ut && q.p > .6)) o.fail = true; }
      }
      const need = S.obj.filter(o => o.t !== 'protect');
      if (S.obj.some(o => o.fail) || H.out) S.res = { win: false, t: S.t, why: S.obj.some(o => o.fail) ? 'protect' : 'out' };
      else if (need.every(o => o.done)) S.res = { win: true, t: S.t };
    } else {
      const alive = S.P.filter(P => !P.out);
      if (H && H.out) S.res = { win: false, t: S.t, winner: alive.length === 1 ? alive[0].i : -1, why: 'out' };
      else if (alive.length <= 1) S.res = { win: !!H && alive[0] === H, t: S.t, winner: alive.length ? alive[0].i : -1 };
    }
    if (S.res) S.ev.push({ t: 'end', win: S.res.win });
  }

  /* ---------- one tick ---------- */
  function step(S) {
    S.ev.length = 0; if (S.cd.length > 4000) { S.cd.length = 0; S.cdAll = 1; }
    if (S.res) return;
    S.t++;
    for (const u of S.U) { u.px = u.x; u.py = u.y; u.pd = u.d; u.pt = u.tu; }
    for (const b of S.B) b.pt = b.tu;
    buildHash(S);
    if (typeof AI !== 'undefined') for (const P of S.P) if (P.ai != null && !P.out) AI.think(S, P);
    production(S);
    runPaths(S);
    for (const u of S.U) if (!u.dead) unitTick(S, u);
    separate(S);
    for (const b of S.B) if (!b.dead) buildingTick(S, b);
    projectiles(S);
    krTick(S);
    if (S.t % 20 === 0) regrow(S);
    let n = 0; for (const u of S.U) { if (u.dead) { delete S.E[u.id]; continue; } S.U[n++] = u; } S.U.length = n;
    if (S.B.some(b => b.dead)) { S.B = S.B.filter(b => { if (b.dead) delete S.E[b.id]; return !b.dead; }); }
    if (S.rc) recalc(S);
    if (S.t % 3 === 0) updateFog(S);
    if (S.t % 15 === 0) { recalc(S); checkEnd(S); }
  }

  /* ---------- saving: the map is regenerated from its seed; the rest is plain JSON ---------- */
  const b64e = a => { let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); };
  const b64d = (s, n) => { const t = atob(s), a = new Uint8Array(n); for (let i = 0; i < n && i < t.length; i++) a[i] = t.charCodeAt(i); return a; };
  const SKIP = new Set(['ter', 'cmax', 'occ', 'E', 'ev', 'cd', 'ft', 'hash', 'vis', 'mark', 'gen', 'cry', 'slab', 'exp', 'bases', 'N', 'hc', 'hr']);
  function serialize(S) {
    const o = {}; for (const k in S) if (!SKIP.has(k)) o[k] = S[k];
    o.cry = b64e(S.cry); o.slab = b64e(S.slab); o.exp = b64e(S.exp);
    return JSON.stringify(o, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e4) / 1e4 : v);
  }
  function deserialize(str) {
    const o = typeof str === 'string' ? JSON.parse(str) : str; if (!o || o.v !== CORE_V) return null;
    const M = genMap(o.cfg.map), S = Object.assign({}, o);
    attachMap(S, M); S.cry = b64d(o.cry, S.N); S.slab = b64d(o.slab, S.N); S.exp = b64d(o.exp, S.N);
    for (const u of S.U) { S.E[u.id] = u; u.inq = 0; u.r = UT[u.t].r; }
    for (const b of S.B) { S.E[b.id] = b; for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) S.occ[j * S.W + i] = b.id; }
    S.pq = S.pq.filter(id => S.E[id]); for (const id of S.pq) S.E[id].inq = 1;
    for (const u of S.U) if (u.wait && !u.inq) { u.inq = 1; S.pq.push(u.id); }
    recalc(S); updateFog(S);
    return S;
  }
  const finite = S => S.U.every(u => [u.x, u.y, u.d, u.tu, u.hp, u.v, u.car].every(Number.isFinite)) && S.P.every(P => Number.isFinite(P.cry)) && S.PJ.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    && (!S.kr || (Number.isFinite(S.kr.x) && Number.isFinite(S.kr.y) && Number.isFinite(S.kr.t)));
  const Core = { addUnit, placeBuilding, raffAim, nearField, newGame, step, cmd, serialize, deserialize, techOk, placeTiles, findSpot, catOf, center, dockOf, distTo, tileOf, passT, findPath, unitCount, recalc, finite, krOk, freeNear, wrapA };
