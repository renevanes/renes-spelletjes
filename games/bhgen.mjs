// Bushalte level generator: node bhgen.mjs  ->  bhsrc/levels.json
// Levels are built by construction so that a known tap order always wins:
//  1. vehicles are placed in reverse leaving order; each new one needs a clear way out past the ones already placed
//     (those leave after it), so tapping them in leaving order always works on the lot;
//  2. the passenger queue is written while "playing" that order with the real rules (core.js): the next passenger is
//     either for a bus already parked at the stop, or for one that the planned player taps next (possibly after first
//     parking a few other buses that are in the way: that is what fills the bays and makes it a puzzle);
//  3. many candidates per level; a casual-player bot (greedy with randomness) plays each a few hundred times and the
//     candidate whose win rate is closest to the level's target is kept -> a smooth difficulty curve.
// The exact solver (core.js solve) confirms every level again, and the browser test plays every stored solution by tapping.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'bhsrc', 'core.js'), 'utf8');
const C = new Function(src + '\nreturn { DIRS, CAP, cellsOf, frontOf, newState, tap, resolve, clone, movable, solve, pathOf, occGrid, freeSlot };')();

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const ri = (r, n) => Math.floor(r() * n);
const pickW = (r, ws) => { let t = ws.reduce((a, b) => a + b, 0) * r(); for (let i = 0; i < ws.length; i++) { t -= ws[i]; if (t < 0) return i; } return ws.length - 1; };
const shuffle = (r, a) => { for (let i = a.length - 1; i > 0; i--) { const j = ri(r, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function placeAll(P, r) {
  const { w, h } = P, occ = new Int16Array(w * h).fill(-1), obs = [];
  const inner = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) inner.push([x, y]);
  shuffle(r, inner);
  for (const [x, y] of inner) { if (obs.length >= (P.obs || 0)) break; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { if (r() < .7) continue; } if (obs.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 2)) continue; obs.push([x, y, ri(r, 4)]); occ[y * w + x] = -2; }
  const placed = [];                                            // placed[0] leaves last
  for (let a = 0; a < (P.tries || 4000) && placed.length < P.n; a++) {
    const len = [2, 3, 4][pickW(r, P.sizes)], d = ri(r, 4), vert = d % 2 === 0;
    const x = ri(r, vert ? w : w - len + 1), y = ri(r, vert ? h - len + 1 : h);
    if (x < 0 || y < 0) continue;
    const v = { x, y, d, len }, cells = C.cellsOf(v);
    if (cells.some(([cx, cy]) => occ[cy * w + cx] !== -1)) continue;
    const [dx, dy] = C.DIRS[d]; let [fx, fy] = C.frontOf(v), ok = true;
    for (;;) { fx += dx; fy += dy; if (fx < 0 || fy < 0 || fx >= w || fy >= h) break; if (occ[fy * w + fx] !== -1) { ok = false; break; } }
    if (!ok) continue;
    // no vehicle right in front of another one's nose pointing back at it (looks like a pointless stand-off)
    for (const cl of cells) occ[cl[1] * w + cl[0]] = placed.length;
    placed.push(v);
  }
  if (placed.length < P.n) return null;
  return { obs, order: placed.slice().reverse() };             // order[0] leaves first
}

function buildQueue(P, base, order, r) {
  // play the planned order with the real rules while writing the queue
  const L = Object.assign({}, base, { q: [] }), S = C.newState(L), n = order.length;
  let k = 0, guard = 0;
  while (!(k >= n && S.qi >= S.q.length && S.bays.every(b => !b)) && guard++ < 5000) {
    const parked = S.bays.filter(Boolean).map(b => S.V[b.v].c);
    let free = 0; for (let i = 0; i < S.bays.length; i++) if (!S.bays[i] && (i < S.B || (i === S.B && S.lb && S.dep >= S.lb))) free++;
    // dig options: tap order[k..k+j], the last one is the one the next passenger is for
    const digs = [];
    for (let j = 0; k + j < n && j < free; j++) {
      const c = S.V[order[k + j]].c;
      if (parked.includes(c)) break;                            // that passenger would board the parked bus instead
      let first = true; for (let m = 0; m < j; m++) if (S.V[order[k + m]].c === c) first = false;
      if (first) digs.push(j);
    }
    const fillOk = parked.length > 0;
    let dig = digs.length && (!fillOk || r() > P.pFill);
    if (dig) {
      const ws = digs.map(j => Math.pow(P.deep, j)), j = digs[pickW(r, ws)];
      for (let m = 0; m <= j; m++) { const res = C.tap(S, order[k + m]); if (res.k !== 'exit') throw new Error('plan tap failed ' + res.k); }
      k += j + 1;
      const c = S.V[order[k - 1]].c, run = 1 + ri(r, P.run);
      for (let m = 0; m < run; m++) { S.q.push(c); C.resolve(S); if (!S.bays.some(b => b && S.V[b.v].c === c)) break; }
    } else if (fillOk) {
      const bs = S.bays.filter(Boolean), b = bs[ri(r, bs.length)], c = S.V[b.v].c, run = 1 + ri(r, P.run);
      for (let m = 0; m < run; m++) { S.q.push(c); C.resolve(S); if (!S.bays.some(x => x && S.V[x.v].c === c)) break; }
    } else throw new Error('generator stuck');
  }
  if (!S.won) throw new Error('plan did not finish');
  return S.q.join('');
}

function greedy(L, r) {                                          // a casual player: matching colour first, else something needed soon
  const S = C.newState(L);
  for (let g = 0; g < 400; g++) {
    if (S.won) return 1; if (S.lost) return 0;
    const ms = C.movable(S); if (!ms.length) return 0;
    const f = S.q[S.qi], m = ms.filter(id => S.V[id].c === f);
    let id;
    if (m.length) id = m[ri(r, m.length)];
    else {
      const look = S.q.slice(S.qi, S.qi + 24), ws = ms.map(i => { const p = look.indexOf(S.V[i].c); return p < 0 ? .25 : 1 + 6 / (1 + p); });
      id = ms[pickW(r, ws)];
    }
    C.tap(S, id);
  }
  return 0;
}

function gen(P, seed) {
  const r = rng(seed);
  const pl = placeAll(P, r); if (!pl) return null;
  const { obs, order } = pl, n = order.length;
  // colours: every colour used, spread over the vehicles
  const cols = []; for (let i = 0; i < n; i++) cols.push(i % P.K); shuffle(r, cols);
  // vehicles listed by position (the stored order does not give the solution away)
  const ids = order.map((v, i) => i).sort((a, b) => order[a].y - order[b].y || order[a].x - order[b].x);
  const pos = new Map(ids.map((oi, ni) => [oi, ni]));
  const V = ids.map(oi => { const v = order[oi]; return [v.x, v.y, v.d, v.len, cols[oi], 0, 0]; });
  const sol = order.map((_, oi) => pos.get(oi));
  // locks: a planned k-th vehicle may wait for up to k-1 others
  if (P.locks) { const cand = shuffle(r, [...Array(n).keys()].filter(k => k >= 3)); for (const k of cand.slice(0, P.locks)) V[sol[k]][5] = Math.max(2, k - ri(r, 3)); }
  const base = { w: P.w, h: P.h, b: P.b, lb: P.lb || 0, o: obs, v: V };
  // hidden colours: only on vehicles that are not free at the start
  if (P.hid) {
    const S0 = C.newState(Object.assign({}, base, { q: '' })), g = C.occGrid(S0);
    const blocked = shuffle(r, [...Array(n).keys()].filter(i => !C.pathOf(S0, i, g).free));
    for (const i of blocked.slice(0, Math.round(n * P.hid))) V[i][6] = 1;
  }
  let q; try { q = buildQueue(P, base, sol, r); } catch (e) { return null; }
  const L = Object.assign({}, base, { q, s: sol });
  // the plan must win with the real rules, tap by tap
  const S = C.newState(L); for (const id of sol) { const res = C.tap(S, id); if (res.k !== 'exit') return null; } if (!S.won) return null;
  const S0 = C.newState(L), free0 = C.movable(S0).length;
  return { L, free0 };
}

function rate(L, seed, runs = 240) { const r = rng(seed); let w = 0; for (let i = 0; i < runs; i++) w += greedy(L, r); return w / runs; }

// ---------- the level plan: size, colours, bays, twists, target win rate of the casual bot ----------
const PLAN = [];
const add = (o) => PLAN.push(Object.assign({ sizes: [5, 4, 0], obs: 0, hid: 0, locks: 0, lb: 0, pFill: .55, deep: .6, run: 3, cand: 40 }, o));
add({ w: 4, h: 4, n: 2, K: 2, b: 3, target: 1, tip: 'tap', fixed: true });
add({ w: 4, h: 5, n: 4, K: 2, b: 3, target: 1, tip: 'block' });
add({ w: 5, h: 5, n: 5, K: 3, b: 4, target: .97, tip: 'board' });
add({ w: 5, h: 5, n: 6, K: 3, b: 3, target: .9, tip: 'bays', pFill: .4, deep: 1 });
add({ w: 5, h: 6, n: 7, K: 3, b: 4, target: .85 });
add({ w: 6, h: 6, n: 8, K: 3, b: 4, target: .78, sizes: [4, 4, 1], tip: 'long' });
add({ w: 6, h: 6, n: 9, K: 4, b: 4, target: .72, sizes: [4, 4, 1] });
add({ w: 6, h: 6, n: 8, K: 3, b: 4, target: .75, obs: 3, tip: 'obs' });
add({ w: 6, h: 6, n: 10, K: 4, b: 4, target: .62, sizes: [4, 4, 1], obs: 1 });
add({ w: 6, h: 6, n: 9, K: 4, b: 5, target: .75, sizes: [3, 4, 2], obs: 2 });
add({ w: 6, h: 7, n: 11, K: 4, b: 4, target: .55, sizes: [4, 4, 1], obs: 2 });
add({ w: 6, h: 7, n: 10, K: 4, b: 4, target: .58, hid: .35, tip: 'hid', sizes: [4, 4, 1] });
add({ w: 6, h: 7, n: 12, K: 4, b: 4, target: .5, hid: .3, sizes: [4, 4, 2], obs: 1 });
add({ w: 7, h: 7, n: 12, K: 5, b: 5, target: .5, obs: 2, sizes: [4, 4, 2] });
add({ w: 6, h: 7, n: 11, K: 4, b: 5, target: .65, hid: .4, obs: 2, sizes: [3, 4, 2] });
add({ w: 7, h: 7, n: 13, K: 5, b: 5, target: .45, hid: .3, sizes: [4, 4, 2], obs: 1 });
add({ w: 7, h: 7, n: 14, K: 5, b: 5, target: .42, obs: 3, sizes: [4, 4, 2] });
add({ w: 7, h: 7, n: 12, K: 4, b: 4, target: .5, locks: 2, tip: 'lock', sizes: [4, 4, 1], obs: 1 });
add({ w: 7, h: 7, n: 14, K: 5, b: 5, target: .4, locks: 2, hid: .25, sizes: [4, 4, 2] });
add({ w: 7, h: 7, n: 13, K: 5, b: 5, target: .55, hid: .3, obs: 3, sizes: [3, 4, 2] });
add({ w: 7, h: 8, n: 15, K: 5, b: 5, target: .38, locks: 2, obs: 2, sizes: [4, 4, 2] });
add({ w: 7, h: 8, n: 15, K: 5, b: 5, target: .36, hid: .35, obs: 2, sizes: [4, 4, 2] });
add({ w: 7, h: 8, n: 16, K: 6, b: 5, target: .34, locks: 2, sizes: [4, 4, 2] });
add({ w: 7, h: 8, n: 15, K: 6, b: 5, target: .32, hid: .3, locks: 1, obs: 2, sizes: [4, 4, 2] });
add({ w: 7, h: 8, n: 14, K: 5, b: 4, lb: 3, target: .45, tip: 'lb', obs: 2, sizes: [3, 4, 2] });
add({ w: 8, h: 8, n: 16, K: 6, b: 4, lb: 3, target: .32, hid: .3, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 17, K: 6, b: 5, target: .3, locks: 2, obs: 3, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 17, K: 6, b: 5, target: .28, hid: .35, locks: 2, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 16, K: 6, b: 4, lb: 4, target: .28, obs: 3, hid: .3, sizes: [4, 4, 2] });
add({ w: 7, h: 8, n: 15, K: 5, b: 5, target: .45, hid: .4, obs: 2, locks: 1, sizes: [3, 4, 2] });
add({ w: 8, h: 8, n: 18, K: 6, b: 5, target: .25, hid: .3, locks: 2, obs: 2, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 18, K: 7, b: 5, target: .24, locks: 3, obs: 3, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 18, K: 7, b: 4, lb: 4, target: .22, hid: .35, obs: 2, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 19, K: 7, b: 5, target: .2, hid: .3, locks: 2, obs: 2, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 17, K: 6, b: 5, target: .35, hid: .4, locks: 2, obs: 3, sizes: [3, 4, 2] });
add({ w: 8, h: 8, n: 19, K: 7, b: 5, target: .18, hid: .35, locks: 3, obs: 2, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 20, K: 7, b: 5, lb: 4, target: .17, hid: .3, locks: 2, obs: 2, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 19, K: 8, b: 5, target: .16, hid: .35, locks: 3, obs: 3, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 20, K: 8, b: 5, lb: 5, target: .15, hid: .35, locks: 3, obs: 2, sizes: [4, 4, 2] });
add({ w: 8, h: 8, n: 21, K: 8, b: 5, target: .12, hid: .4, locks: 3, obs: 2, sizes: [4, 4, 2] });

// level 1 is hand-made: two buses, both free
const L1 = { w: 4, h: 4, b: 3, lb: 0, o: [], v: [[1, 0, 0, 3, 0, 0, 0], [2, 2, 1, 2, 1, 0, 0]], q: '0000001111', s: [0, 1] };

function make(P, seedBase, label) {
  let best = null, tries = 0;
  for (let c = 0; c < P.cand && tries < P.cand * 30; tries++) {
    const g = gen(P, seedBase * 7919 + tries * 104729 + 17); if (!g) continue; c++;
    const wr = rate(g.L, seedBase + tries);
    const maxFree = P.n <= 6 ? 3 : 4;
    const sc = Math.abs(wr - P.target) + Math.max(0, P.target * .7 - wr) + Math.max(0, g.free0 - maxFree) * .06;
    if (!best || sc < best.sc) best = { ...g, wr, sc };
  }
  if (!best) throw new Error('no level for ' + label);
  return best;
}

// later levels: a little more forgiving targets and more candidates, so no level is much harder than its neighbours
PLAN.forEach((P, i) => { if (i >= 20) { P.target = Math.min(.5, P.target + .05); P.cand = 70; } });
const out = { levels: [], daily: [] };
const t0 = Date.now();
PLAN.forEach((P, i) => {
  let L, wr, free0;
  if (P.fixed) { L = L1; wr = rate(L, 1); free0 = 2; }
  else ({ L, wr, free0 } = make(P, 1000 + i * 31, 'level ' + (i + 1)));
  if (P.tip) L.tip = P.tip;
  const S = C.newState(L), sol = C.solve(S, 400000);
  console.log(`L${String(i + 1).padStart(2)} ${L.w}x${L.h} veh ${L.v.length} col ${new Set(L.v.map(v => v[4])).size} bays ${L.b}${L.lb ? '+' + L.lb : ''} pas ${L.q.length} free0 ${free0} bot-win ${(wr * 100).toFixed(0)}% (target ${(P.target * 100).toFixed(0)}%) solver ${sol ? 'ok ' + sol.length : sol === null ? 'UNSOLVABLE' : 'gave up'}`);
  if (sol === null) throw new Error('unsolvable level ' + (i + 1));
  out.levels.push(L);
});
// daily rides: a pool of extra levels in the middle-to-hard range
for (let d = 0; d < 30; d++) {
  const P = Object.assign({}, PLAN[14 + (d * 7) % 24]); delete P.tip; P.cand = 16; P.target = Math.min(.5, P.target + .08);
  const { L, wr } = make(P, 50000 + d * 101, 'daily ' + d);
  const sol = C.solve(C.newState(L), 400000); if (sol === null) throw new Error('unsolvable daily ' + d);
  out.daily.push(L);
  if (d % 10 === 9) console.log(`daily ${d + 1}: bot-win ${(wr * 100).toFixed(0)}%`);
}
fs.writeFileSync(path.join(here, 'bhsrc', 'levels.json'), JSON.stringify(out));
console.log('written', out.levels.length, 'levels +', out.daily.length, 'daily in', Date.now() - t0, 'ms', fs.statSync(path.join(here, 'bhsrc', 'levels.json')).size, 'bytes');
