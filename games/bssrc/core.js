  /* ================= rules (pure: no DOM, no timing; the level generator runs this same file in Node) =================
     Field units: 1 = one bubble diameter. Hex rows: row r is shifted half a bubble to the right when (r + par) is odd,
     shifted rows hold one bubble less. A shot is traced exactly (ray against circles, wall bounces), snaps into the
     nearest free cell that hangs on something, and is resolved instantly; the visuals replay the returned events. */
  const NC = 11, LIMIT = 14, ROWS = LIMIT + 3, RH = Math.sqrt(3) / 2, FW = NC;
  const R_HIT = .8, R_FIRE = .92, BOOM_R = 1.8, AMIN = 9 * Math.PI / 180, POP_STEP = .045;
  const LX = FW / 2, LY = .5 + (LIMIT - 1) * RH + 1.95, DEAD = (LIMIT - 1) * RH + 1, MUZ = 1.45, FH = LY + 1.3;
  const K_N = 0, K_STAR = 1, K_BOMB = 2, K_RAIN = 3, K_STONE = 4, K_ICE = 5, K_CHG = 6, NCOL = 6;

  function rnd(o) { let t = o.seed = (o.seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const mkR = seed => { const o = { seed: seed | 0 }; return () => rnd(o); };
  const isOff = (S, r) => ((r + S.par) & 1) === 1;
  const rowLen = (S, r) => isOff(S, r) ? NC - 1 : NC;
  const cxOf = (S, r, c) => c + .5 + (isOff(S, r) ? .5 : 0);
  const cyOf = (S, r) => (r + S.drop) * RH + .5;
  const valid = (S, r, c) => r >= 0 && r < ROWS && c >= 0 && c < rowLen(S, r);
  const key = (r, c) => r * 16 + c;
  function nbrs(S, r, c) {
    const o = [], add = (a, b) => { if (valid(S, a, b)) o.push([a, b]); };
    add(r, c - 1); add(r, c + 1);
    if (isOff(S, r)) { add(r - 1, c); add(r - 1, c + 1); add(r + 1, c); add(r + 1, c + 1); }
    else { add(r - 1, c - 1); add(r - 1, c); add(r + 1, c - 1); add(r + 1, c); }
    return o;
  }
  const mc = e => e && (e.k === K_N || e.k === K_STAR || e.k === K_CHG) ? e.c : -1;     // matchable colour, -1 = none
  function each(S, fn) { for (let r = 0; r < ROWS; r++) { const row = S.g[r], n = rowLen(S, r); for (let c = 0; c < n; c++) if (row[c]) fn(row[c], r, c); } }
  function count(S) { let n = 0; each(S, () => n++); return n; }
  function lowest(S) { let lo = -1; each(S, (e, r) => { if (r + S.drop > lo) lo = r + S.drop; }); return lo; }
  function row0(S) { let n = 0; for (let c = 0; c < rowLen(S, 0); c++) if (S.g[0][c]) n++; return n; }
  function present(S) {                                          // colours a shot may have: those still on the board
    const has = new Array(NCOL).fill(0), ice = new Array(NCOL).fill(0);
    each(S, e => { const m = mc(e); if (m >= 0) has[m]++; else if (e.k === K_ICE) ice[e.c]++; });
    let l = []; for (let c = 0; c < NCOL; c++) if (has[c]) l.push(c);
    if (!l.length) for (let c = 0; c < NCOL; c++) if (ice[c]) l.push(c);
    if (!l.length) l = S.pal.slice();
    return l;
  }
  const pick = S => { const l = present(S); return { k: 'n', c: l[Math.floor(rnd(S) * l.length) % l.length] }; };
  function fixShots(S) {
    const l = present(S), fix = s => { if (s && s.k === 'n' && !l.includes(s.c)) s.c = l[Math.floor(rnd(S) * l.length) % l.length]; };
    fix(S.cur); fix(S.nxt); fix(S.stash);
  }

  /* ---------- levels ----------
     row strings: '.' empty, '0'-'5' a colour, 'x' a colour from the level palette (clustered), '*' star,
     '#' stone, '~' ice, '@' bomb, '%' rainbow, '?' colour changer */
  function cellFrom(S, ch, r, c, R, cl) {
    const rc = () => {
      if (R() < cl) {                                            // copy a neighbour that is already placed: pleasant clusters
        const n = nbrs(S, r, c).filter(([a, b]) => (a < r || (a === r && b < c)) && mc(S.g[a][b]) >= 0);
        if (n.length) { const [a, b] = n[Math.floor(R() * n.length) % n.length]; return S.g[a][b].c; }
      }
      return S.pal[Math.floor(R() * S.pal.length) % S.pal.length];
    };
    if (ch >= '0' && ch <= '5') return { k: K_N, c: +ch };
    switch (ch) {
      case 'x': return { k: K_N, c: rc() };
      case '*': return { k: K_STAR, c: S.pal[Math.floor(R() * S.pal.length) % S.pal.length] };
      case '#': return { k: K_STONE, c: -1, h: 2 };
      case '~': return { k: K_ICE, c: rc() };
      case '@': return { k: K_BOMB, c: -1 };
      case '%': return { k: K_RAIN, c: -1 };
      case '?': return { k: K_CHG, c: S.pal[Math.floor(R() * S.pal.length) % S.pal.length] };
    }
    return null;
  }
  function blank(mode) {
    const S = { v: 1, mode, lv: 0, g: [], par: 0, drop: 0, seed: 1, pal: [0, 1, 2, 3], goal: 'clear', lim: 0, ceil: 0, ceilIn: 0, extra: 0, shots: 0, score: 0,
      streak: 0, maxStreak: 0, pops: 0, falls: 0, bigDrop: 0, fire: 0, stars: 0, starsTotal: 0, cur: null, nxt: null, stash: null, won: false, lost: false, why: '',
      pushes: 0, missN: 0, missLeft: 0, bonus: 0 };
    for (let r = 0; r < ROWS; r++) S.g.push(new Array(NC).fill(null));
    return S;
  }
  function newState(L, seed) {
    const S = blank('lvl'); S.lv = L.id; S.seed = (seed >>> 0) || 1; S.pal = L.pal.slice(); S.goal = L.goal || 'clear';
    S.lim = L.lim || 0; S.ceil = L.ceil || 0; S.ceilIn = S.ceil;
    const R = mkR(L.seed || 7), cl = L.cl == null ? .45 : L.cl;
    L.rows.forEach((row, r) => { for (let c = 0; c < row.length && c < rowLen(S, r); c++) { const e = cellFrom(S, row[c], r, c, R, cl); if (e) S.g[r][c] = e; } });
    (L.sp || []).forEach((row, r) => {                           // specials on top of a coloured picture keep its colour
      for (let c = 0; c < row.length && c < rowLen(S, r); c++) {
        const ch = row[c]; if (ch === '.' || ch === ' ') continue;
        const base = S.g[r][c], col = mc(base) >= 0 ? base.c : S.pal[Math.floor(R() * S.pal.length) % S.pal.length];
        const other = S.pal.filter(x => x !== col), sc = other.length ? other[Math.floor(R() * other.length) % other.length] : col;   // a star stands out
        S.g[r][c] = ch === '*' ? { k: K_STAR, c: sc } : ch === '~' ? { k: K_ICE, c: col } : ch === '?' ? { k: K_CHG, c: col } : cellFrom(S, ch, r, c, R, cl);
      }
    });
    each(S, e => { if (e.k === K_STAR) S.starsTotal++; });
    S.cur = pick(S); S.nxt = pick(S);
    return S;
  }
  const missFor = S => Math.max(3, 6 - Math.floor(S.pushes / 7));
  function newEndless(seed) {
    const S = blank('end'); S.seed = (seed >>> 0) || 1; S.pal = [0, 1, 2, 3];
    for (let i = 0; i < 6; i++) pushRow(S, true);
    S.pushes = 0; S.missN = S.missLeft = missFor(S);
    S.cur = pick(S); S.nxt = pick(S);
    return S;
  }
  function pushRow(S, init) {                                    // endless: a new row slides in from the top
    S.g.pop(); S.g.unshift(new Array(NC).fill(null)); S.par ^= 1;
    if (!init) S.pushes++;
    const ncol = Math.min(6, 4 + Math.floor(S.pushes / 9)); S.pal = [0, 1, 2, 3, 4, 5].slice(0, ncol);
    const n = rowLen(S, 0), sp = S.pushes;
    for (let c = 0; c < n; c++) {
      const u = rnd(S);
      if (sp > 6 && u < .03) { S.g[0][c] = { k: K_BOMB, c: -1 }; continue; }
      if (sp > 10 && u < .05) { S.g[0][c] = { k: K_STONE, c: -1, h: 2 }; continue; }
      if (sp > 4 && u < .075) { S.g[0][c] = { k: K_STAR, c: S.pal[Math.floor(rnd(S) * ncol)] }; continue; }
      if (sp > 14 && u < .095) { S.g[0][c] = { k: K_ICE, c: S.pal[Math.floor(rnd(S) * ncol)] }; continue; }
      if (sp > 18 && u < .11) { S.g[0][c] = { k: K_CHG, c: S.pal[Math.floor(rnd(S) * ncol)] }; continue; }
      if (sp > 8 && u < .125) { S.g[0][c] = { k: K_RAIN, c: -1 }; continue; }
      let col = S.pal[Math.floor(rnd(S) * ncol)];
      const left = c > 0 && S.g[0][c - 1], below = nbrs(S, 0, c).filter(([a]) => a === 1).map(([a, b]) => S.g[a][b]).filter(e => mc(e) >= 0);
      const v = rnd(S);
      if (v < .32 && mc(left) >= 0) col = left.c; else if (v < .55 && below.length) col = below[Math.floor(rnd(S) * below.length)].c;
      S.g[0][c] = { k: K_N, c: col };
    }
  }

  /* ---------- tracing a shot: ray against circles, bouncing off the side walls ---------- */
  function trace(S, ang, fire) {
    const yc = S.drop * RH + .5, cells = [];
    each(S, (e, r, c) => cells.push([r, c, cxOf(S, r, c), cyOf(S, r)]));
    let x = LX, y = LY, dx = Math.cos(ang), dy = -Math.sin(ang), hit = null, len = 0;
    const pts = [[x, y]], bounces = [], burn = [], burnt = new Set();
    if (!(dy < -1e-6)) dy = -1e-6;
    for (let seg = 0; seg < 60; seg++) {
      const tw = dx > 1e-9 ? (FW - .5 - x) / dx : dx < -1e-9 ? (.5 - x) / dx : Infinity;
      const tc = Math.max(0, (yc - y) / dy);
      let th = Infinity, hc = null;
      if (!fire) for (const q of cells) {
        const fx = x - q[2], fy = y - q[3], b = fx * dx + fy * dy, cc = fx * fx + fy * fy - R_HIT * R_HIT;
        if (cc > 0 && b > 0) continue;
        const disc = b * b - cc; if (disc < 0) continue;
        const t = Math.max(0, -b - Math.sqrt(disc)); if (t < th) { th = t; hc = q; }
      }
      const t = Math.max(0, Math.min(tw, tc, th));
      if (fire) for (const q of cells) {
        const k = key(q[0], q[1]); if (burnt.has(k)) continue;
        const s = Math.max(0, Math.min(t, (q[2] - x) * dx + (q[3] - y) * dy)), ex = x + dx * s - q[2], ey = y + dy * s - q[3];
        if (ex * ex + ey * ey < R_FIRE * R_FIRE) { burnt.add(k); burn.push([q[0], q[1], len + s]); }
      }
      x += dx * t; y += dy * t; len += t; pts.push([x, y]);
      if (t === th) { hit = [hc[0], hc[1]]; break; }
      if (t === tc || t !== tw) break;
      dx = -dx; bounces.push(len);
    }
    return { pts, len, hit, x, y, bounces, burn };
  }
  function attachable(S, r, c) { return r === 0 || nbrs(S, r, c).some(([a, b]) => S.g[a][b]); }
  function snap(S, px, py) {                                     // nearest free cell that hangs on the ceiling or a bubble
    let best = null, bd = 1e9;
    for (let pass = 0; pass < 2 && !best; pass++) for (let r = 0; r < ROWS; r++) {
      const y = cyOf(S, r); if (!pass && Math.abs(y - py) > 1.7) continue;
      for (let c = 0; c < rowLen(S, r); c++) {
        if (S.g[r][c]) continue;
        const d = (cxOf(S, r, c) - px) ** 2 + (y - py) ** 2;
        if (d < bd && (pass || attachable(S, r, c))) { bd = d; best = [r, c]; }
      }
    }
    return best;
  }

  /* ---------- resolving a shot ---------- */
  function groupD(S, r0, c0, col) {                              // flood fill with distances; rainbow bubbles join any colour
    const seen = new Set([key(r0, c0)]), out = [[r0, c0, 0]];
    for (let i = 0; i < out.length; i++) {
      const [r, c, d] = out[i];
      for (const [a, b] of nbrs(S, r, c)) {
        const k = key(a, b); if (seen.has(k)) continue; const e = S.g[a][b];
        if (e && (e.k === K_RAIN || mc(e) === col)) { seen.add(k); out.push([a, b, d + 1]); }
      }
    }
    return out;
  }
  function clone(S) { const T = Object.assign({}, S); T.g = S.g.map(row => row.map(e => e && Object.assign({}, e))); T.pal = S.pal.slice(); T.cur = S.cur && Object.assign({}, S.cur); T.nxt = S.nxt && Object.assign({}, S.nxt); T.stash = S.stash && Object.assign({}, S.stash); return T; }
  function swapShots(S) { if (!S.cur || !S.nxt || S.stash || S.cur.k !== 'n') return false; const t = S.cur; S.cur = S.nxt; S.nxt = t; return true; }
  function armSpecial(S, k) { if (!S.cur || S.won || S.lost) return false; if (S.cur.k !== 'n') { S.cur = { k }; return true; } S.stash = S.cur; S.cur = { k }; return true; }
  const starsFor = (L, shots) => !L || !L.st ? 3 : shots <= L.st[0] ? 3 : shots <= L.st[1] ? 2 : 1;
  function shoot(S, ang) {
    ang = Math.max(AMIN, Math.min(Math.PI - AMIN, +ang || Math.PI / 2));
    const shot = S.cur || { k: 'n', c: 0 }, fire = shot.k === 'fire', tr = trace(S, ang, fire);
    const ev = { ang, shot, tr, cell: null, cxy: null, placed: false, removed: [], falls: [], thaw: [], crack: [], chg: [], boom: [], stars: 0, pts: 0, fallPts: 0, starPts: 0, push: 0, drop: false, miss: false, streak: 0, won: false, lost: false };
    const removed = new Map();
    const del = (r, c, d, how) => { const k = key(r, c), e = S.g[r][c]; if (!e || removed.has(k)) return false; const x = { r, c, e, d, how, x: cxOf(S, r, c), y: cyOf(S, r) }; removed.set(k, x); ev.removed.push(x); S.g[r][c] = null; return true; };
    const bombs = [], exploded = new Set();
    const qBomb = (r, c, t, center) => { const k = key(r, c); if (exploded.has(k)) return; exploded.add(k); bombs.push([r, c, t, center ? cxOf(S, r, c) : null, center ? cyOf(S, r) : null]); if (!center) del(r, c, t, 'boom'); };
    if (fire) {
      for (const [r, c, s] of tr.burn.sort((a, b) => a[2] - b[2])) { const e = S.g[r][c]; if (!e) continue; const d = s - tr.len; if (e.k === K_BOMB) qBomb(r, c, d); else del(r, c, d, 'burn'); }
    } else {
      const cell = snap(S, tr.x, tr.y);
      if (cell) {
        const [r0, c0] = cell; ev.cell = cell; ev.cxy = [cxOf(S, r0, c0), cyOf(S, r0)];
        if (shot.k === 'bomb') qBomb(r0, c0, 0, true);
        else {
          S.g[r0][c0] = shot.k === 'rain' ? { k: K_RAIN, c: -1 } : { k: K_N, c: shot.c }; ev.placed = true;
          let grp = [];
          if (shot.k === 'rain') { const cols = new Set(); for (const [a, b] of nbrs(S, r0, c0)) { const m = mc(S.g[a][b]); if (m >= 0) cols.add(m); } for (const col of cols) { const g = groupD(S, r0, c0, col); if (g.length > grp.length) grp = g; } }
          else grp = groupD(S, r0, c0, shot.c);
          if (grp.length >= 3) for (const [r, c, d] of grp) del(r, c, d * POP_STEP, 'pop');
          for (const [a, b] of nbrs(S, r0, c0)) { const e = S.g[a][b]; if (e && e.k === K_BOMB) qBomb(a, b, .06); }
        }
        for (const x of ev.removed.slice()) for (const [a, b] of nbrs(S, x.r, x.c)) { const e = S.g[a][b]; if (e && e.k === K_BOMB) qBomb(a, b, x.d + .06); }
      }
    }
    for (let i = 0; i < bombs.length; i++) {                     // explosions, chained
      const [br, bc, t0, ox, oy] = bombs[i], bx = ox != null ? ox : removed.get(key(br, bc)).x, by = oy != null ? oy : removed.get(key(br, bc)).y;
      ev.boom.push([bx, by, t0]);
      const R = ox != null ? BOOM_R + .5 : BOOM_R;              // the bomb booster reaches a little further
      each(S, (e, r, c) => { const d = Math.hypot(cxOf(S, r, c) - bx, cyOf(S, r) - by); if (d <= R) { if (e.k === K_BOMB) qBomb(r, c, t0 + .14); else del(r, c, t0 + d * .035, 'boom'); } });
    }
    const touched = new Set();                                   // pops crack stones and thaw ice next to them
    for (const x of ev.removed.slice()) for (const [a, b] of nbrs(S, x.r, x.c)) {
      const e = S.g[a][b], k = key(a, b); if (!e || touched.has(k)) continue;
      if (e.k === K_ICE) { touched.add(k); e.k = K_N; ev.thaw.push([cxOf(S, a, b), cyOf(S, a), x.d + .08, e.c]); }
      else if (e.k === K_STONE) { touched.add(k); e.h = (e.h || 2) - 1; if (e.h <= 0) del(a, b, x.d + .1, 'crack'); else ev.crack.push([cxOf(S, a, b), cyOf(S, a), x.d + .08]); }
    }
    const conn = new Set(), q = [];                              // everything that no longer hangs on the ceiling falls
    for (let c = 0; c < rowLen(S, 0); c++) if (S.g[0][c]) { conn.add(key(0, c)); q.push([0, c]); }
    for (let i = 0; i < q.length; i++) for (const [a, b] of nbrs(S, q[i][0], q[i][1])) { const k = key(a, b); if (!conn.has(k) && S.g[a][b]) { conn.add(k); q.push([a, b]); } }
    each(S, (e, r, c) => { if (!conn.has(key(r, c))) { ev.falls.push({ r, c, e, x: cxOf(S, r, c), y: cyOf(S, r) }); S.g[r][c] = null; } });
    const nPop = ev.removed.length, nFall = ev.falls.length;
    ev.stars = ev.removed.filter(x => x.e.k === K_STAR).length + ev.falls.filter(x => x.e.k === K_STAR).length;
    if (nPop) S.streak++; else S.streak = 0;
    S.maxStreak = Math.max(S.maxStreak, S.streak); ev.streak = S.streak; ev.miss = !nPop;
    const mult = 1 + .5 * Math.min(6, Math.max(0, S.streak - 1));
    ev.pts = Math.round((nPop * 10 + Math.max(0, nPop - 5) * 20) * mult);
    ev.fallPts = nFall ? Math.round((20 * nFall + 5 * nFall * nFall) * mult) : 0;
    ev.starPts = ev.stars * 250;
    S.score += ev.pts + ev.fallPts + ev.starPts; S.stars += ev.stars; S.pops += nPop; S.falls += nFall; S.bigDrop = Math.max(S.bigDrop, nFall);
    if (!fire) S.fire = Math.min(1, S.fire + (nPop + 2 * nFall) / 110 * (S.streak >= 3 ? 1.4 : 1));
    each(S, (e, r, c) => { if (e.k === K_CHG) { const i = S.pal.indexOf(e.c); e.c = S.pal[(i + 1) % S.pal.length]; ev.chg.push([cxOf(S, r, c), cyOf(S, r), e.c]); } });
    S.shots++;
    if (S.mode === 'lvl' && S.ceil) { if (--S.ceilIn <= 0) { S.drop++; S.ceilIn = S.ceil; ev.drop = true; } }
    if (S.mode === 'end') {
      if (ev.miss && --S.missLeft <= 0) { pushRow(S); ev.push = 1; S.missN = S.missLeft = missFor(S); }
      if (!count(S)) { for (let i = 0; i < 4; i++) pushRow(S); ev.push += 4; S.score += 1000; ev.bonus = 1000; S.missN = S.missLeft = missFor(S); }
      else for (let i = 0; i < 2 && count(S) < 26; i++) { pushRow(S); ev.push++; }   // a nearly empty board is topped up
    }
    if (S.stash) { S.cur = S.stash; S.stash = null; } else { S.cur = S.nxt; S.nxt = pick(S); }
    fixShots(S);
    if (S.mode === 'lvl') {
      const n = count(S), done = S.goal === 'stars' ? S.stars >= S.starsTotal : S.goal === 'top' ? row0(S) === 0 : n === 0;
      if (done) { S.won = true; ev.won = true; if (S.lim) { S.bonus = Math.max(0, S.lim + S.extra - S.shots) * 100; S.score += S.bonus; } }
    }
    if (!S.won) {
      if (lowest(S) >= LIMIT) { S.lost = true; S.why = 'line'; ev.lost = true; }
      else if (S.mode === 'lvl' && S.lim && S.shots >= S.lim + S.extra) { S.lost = true; S.why = 'shots'; ev.lost = true; }
    }
    return ev;
  }

  /* ---------- save format ---------- */
  const ENC = e => !e ? '.' : e.k === K_N ? 'abcdef'[e.c] : e.k === K_STAR ? 'ABCDEF'[e.c] : e.k === K_ICE ? 'ghijkl'[e.c] : e.k === K_CHG ? 'GHIJKL'[e.c] : e.k === K_BOMB ? '@' : e.k === K_RAIN ? '%' : e.h === 1 ? '$' : '#';
  function DEC(ch) {
    let i;
    if ((i = 'abcdef'.indexOf(ch)) >= 0) return { k: K_N, c: i };
    if ((i = 'ABCDEF'.indexOf(ch)) >= 0) return { k: K_STAR, c: i };
    if ((i = 'ghijkl'.indexOf(ch)) >= 0) return { k: K_ICE, c: i };
    if ((i = 'GHIJKL'.indexOf(ch)) >= 0) return { k: K_CHG, c: i };
    return ch === '@' ? { k: K_BOMB, c: -1 } : ch === '%' ? { k: K_RAIN, c: -1 } : ch === '#' ? { k: K_STONE, c: -1, h: 2 } : ch === '$' ? { k: K_STONE, c: -1, h: 1 } : null;
  }
  const gridKey = (g, S) => g.map((row, r) => row.slice(0, rowLen(S, r)).map(ENC).join('')).join('/');
  function serialize(S) { const o = Object.assign({}, S); o.g = gridKey(S.g, S); return JSON.parse(JSON.stringify(o)); }
  function deserialize(o) {
    const S = Object.assign(blank(o.mode), o); S.g = [];
    const rows = String(o.g || '').split('/');
    for (let r = 0; r < ROWS; r++) { const row = new Array(NC).fill(null), s = rows[r] || ''; for (let c = 0; c < s.length && c < NC; c++) row[c] = DEC(s[c]); S.g.push(row); }
    if (!S.cur) S.cur = pick(S); if (!S.nxt) S.nxt = pick(S);
    return S;
  }

  /* ---------- a simple bot (used to prove the levels are winnable; it shoots through the normal rules) ---------- */
  function evalMove(S0, T, ev) {
    if (T.won) return 1e6 - T.shots * 10 + T.score / 1e4;
    if (T.lost) return -1e6;
    let v = ev.removed.length * 10 + ev.falls.length * 15 + (T.stars - S0.stars) * 90;
    if (T.goal === 'top') v += 22 * (row0(S0) - row0(T));
    if (T.goal === 'stars') {                                   // fewer bubbles on top of the stars is better
      const cover = S => { let n = 0; each(S, (e, r, c) => { if (e.k === K_STAR) { const x = cxOf(S, r, c); each(S, (f, a, b) => { if (a > r && Math.abs(cxOf(S, a, b) - x) < (a - r) * .6 + .6) n++; }); } }); return n; };
      v += (cover(S0) - cover(T)) * 1.5;
    }
    if (ev.placed && !ev.removed.length) {
      const [r, c] = ev.cell; let same = 0, near = 0;
      for (const [a, b] of nbrs(T, r, c)) { const e = T.g[a][b]; if (!e) continue; near++; if (ev.shot.k === 'n' && mc(e) === ev.shot.c) same++; }
      v += same * 5 - (r + T.drop) * .5 - (near - same) * .5;
    }
    const lo = lowest(T), danger = T.mode === 'end' || T.ceil ? LIMIT - 5 : LIMIT - 3;
    if (lo >= danger) v -= (lo - danger + 1) * (T.ceil || T.mode === 'end' ? 30 : 12);
    return v;
  }
  function botMove(S, n = 161) {
    let best = null;
    const opts = [{ swap: false, shot: S.cur }];
    if (S.cur && S.cur.k === 'n' && S.nxt && S.nxt.k === 'n' && S.nxt.c !== S.cur.c && !S.stash) opts.push({ swap: true, shot: S.nxt });
    for (const o of opts) {
      const fire = o.shot.k === 'fire', runs = [];
      for (let i = 0; i < n; i++) {
        const a = AMIN + (Math.PI - 2 * AMIN) * (i + .5) / n, tr = trace(S, a, fire), cell = fire ? 'f' + Math.round(i / 6) : (snap(S, tr.x, tr.y) || []).join();
        const last = runs[runs.length - 1]; if (last && last.k === cell) { last.i1 = i; last.a1 = a; } else runs.push({ k: cell, i0: i, i1: i, a0: a, a1: a });
      }
      for (const run of runs) {
        const a = (run.a0 + run.a1) / 2, T = clone(S); if (o.swap) swapShots(T);
        const ev = shoot(T, a); let v = evalMove(S, T, ev) + Math.min(3, run.i1 - run.i0) * .2;
        if (!best || v > best.v) best = { v, ang: a, swap: o.swap, w: run.i1 - run.i0 + 1 };
      }
    }
    return best;
  }
