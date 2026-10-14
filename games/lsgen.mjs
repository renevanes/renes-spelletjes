// Kleurbuisjes level generator: node lsgen.mjs  ->  lssrc/levels.json
// Every level is a random deal of the colour layers over the tubes (plus empty tubes), run through the exact A* solver of
// lssrc/core.js (the same code the game uses): unsolvable deals are thrown away, the solver's pour count is the par for
// the stars. For each level many solvable candidates are made; a casual-player bot (random sensible pours) plays each one
// a number of times, and the candidate whose bot win rate is closest to the level's target is kept -> a gentle curve.
// Twists (all original): hidden layers ("?", shown once they come to the top), a frozen tube (opens when k tubes are
// complete), small tubes (room for one layer less, they can never be completed).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'lssrc', 'core.js'), 'utf8');
const C = new Function(src + '\nreturn { newState, pour, solve, legal, stuck, pointless, encMoves, decMoves, clone, why };')();

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const ri = (r, n) => Math.floor(r() * n);
const shuffle = (r, a) => { for (let i = a.length - 1; i > 0; i--) { const j = ri(r, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ch = c => String.fromCharCode(97 + c);

// one random deal for plan P = { nc, e, u, nar: [contents of small tubes: 'full' | 'empty'], frz: k, hid: 'top' | 'low' }
function deal(P, r) {
  const U = P.u, units = []; for (let c = 0; c < P.nc; c++) for (let k = 0; k < U; k++) units.push(c);
  shuffle(r, units);
  const tubes = [], nar = [];
  for (const kind of P.nar || []) { if (kind === 'full') { nar.push(tubes.length); tubes.push(units.splice(0, U - 1)); } }
  while (units.length) tubes.push(units.splice(0, U));
  // never a finished tube or a tube of one colour at the start
  for (const t of tubes) if (t.length >= 2 && t.every(x => x === t[0])) return null;
  for (let e = 0; e < P.e; e++) tubes.push([]);
  for (const kind of P.nar || []) if (kind === 'empty') { nar.push(tubes.length); tubes.push([]); }
  // shuffle the tube order (empty tubes stay at the end, it reads better)
  const full = tubes.map((t, i) => i).filter(i => tubes[i].length), order = shuffle(r, full.slice()).concat(tubes.map((t, i) => i).filter(i => !tubes[i].length));
  const L = { t: order.map(i => tubes[i].map(ch).join('')), u: U };
  const n2 = order.map((i, k) => nar.includes(i) ? k : -1).filter(k => k >= 0); if (n2.length) L.n = n2;
  if (P.frz) {                                                   // a frozen tube with liquid in it, never the only messy one
    const cand = L.t.map((t, i) => i).filter(i => L.t[i].length >= 2 && !(L.n || []).includes(i));
    const i = cand[ri(r, cand.length)]; L.f = { [i]: P.frz };
  }
  if (P.hid) L.h = L.t.map(t => [...t].map((_, j) => (P.hid === 'top' ? j < t.length - 1 : j < Math.min(2, t.length - 1)) ? '1' : '0').join(''));
  return L;
}
// casual bot: picks a random sensible pour, prefers pours onto the same colour; returns true if it wins
function casual(L, r, maxMoves = 160) {
  const S = C.newState(L); let last = null;
  for (let k = 0; k < maxMoves && !S.won; k++) {
    let ms = C.legal(S).filter(([s, t]) => !C.pointless(S, s, t) && !(last && s === last[1] && t === last[0]));
    if (!ms.length) return false;
    const onto = ms.filter(([s, t]) => S.T[t].length);
    if (onto.length && r() < .7) ms = onto;
    const m = ms[ri(r, ms.length)]; C.pour(S, m[0], m[1]); last = m;
  }
  return S.won;
}
// the par: the shortest solution if the exact search finishes in time, otherwise a near-shortest one
function par(L) {
  const S = C.newState(L);
  for (const [w, max] of [[1, 400000], [1.3, 400000], [1.6, 400000], [2, 800000], [3, 800000]]) { const sol = C.solve(S, { w, max }); if (sol) return sol; }
  throw new Error('no solution');
}
function make(P, seed, label) {
  const r = rng(seed); let best = null, tries = 0;
  const cand = P.cand || 24;
  for (let got = 0; got < cand && tries < cand * 60; tries++) {
    const L = deal(P, r); if (!L) continue;
    const S = C.newState(L);
    const sol = C.solve(S, { w: 3, max: 150000 });          // quick check: solvable at all? (the par comes later)
    if (!sol || sol.length < (P.minPar || 3)) continue;
    got++;
    const runs = 24; let w = 0; for (let k = 0; k < runs; k++) if (casual(L, r)) w++;
    const wr = w / runs, sc = Math.abs(wr - P.target) + (P.wantLong ? -sol.length * .002 : 0);
    if (!best || sc < best.sc) best = { L, sol, wr, sc };
  }
  if (!best) throw new Error('no level for ' + label);
  best.sol = par(best.L); best.L.m = best.sol.length; best.L.s = C.encMoves(best.sol);
  return best;
}

// ---------- the plan: 120 levels ----------
const PLAN = [];
const add = (n, P) => { for (let k = 0; k < n; k++) PLAN.push(Object.assign({}, P, { tip: k === 0 ? P.tip : undefined })); };
add(1, { fixed: { t: ['aabb', 'bbaa', ''], u: 4 }, tip: 'tap' });
add(2, { nc: 3, e: 2, u: 4, target: .97, tip: 'rule' });
add(3, { nc: 4, e: 2, u: 4, target: .92 });
add(4, { nc: 5, e: 2, u: 4, target: .85, tip: 'tools' });
add(6, { nc: 6, e: 2, u: 4, target: .78 });
add(6, { nc: 7, e: 2, u: 4, target: .7 });
add(7, { nc: 8, e: 2, u: 4, target: .62 });
add(1, { nc: 6, e: 2, u: 4, target: .75, hid: 'low', tip: 'hid' });     // 30
add(7, { nc: 8, e: 2, u: 4, target: .58, hidEvery: 2 });
add(7, { nc: 9, e: 2, u: 4, target: .52, hidEvery: 2 });
add(1, { nc: 7, e: 2, u: 4, target: .65, frz: 1, tip: 'frz' });       // 45
add(6, { nc: 9, e: 2, u: 4, target: .5, mix: ['hid', 'frz'] });
add(6, { nc: 10, e: 2, u: 4, target: .46, mix: ['hid', 'frz'] });
add(1, { nc: 6, e: 2, u: 5, target: .6, tip: 'u5' });                // 58
add(6, { nc: 7, e: 2, u: 5, target: .5, mix: [null, 'hid'] });
add(7, { nc: 8, e: 2, u: 5, target: .44, mix: ['hid', 'frz', null] });
add(1, { nc: 8, e: 2, u: 4, target: .55, nar: ['full'], tip: 'nar' }); // 72
add(8, { nc: 10, e: 2, u: 4, target: .44, mix: ['nar', 'hid', 'nar', 'frz'] });
add(8, { nc: 9, e: 2, u: 5, target: .4, mix: ['hid', 'nar', 'frz', null] });
add(8, { nc: 11, e: 2, u: 4, target: .4, mix: ['hid', 'nar', 'frz', 'hidnar'] });
add(8, { nc: 10, e: 2, u: 5, target: .36, mix: ['hid', 'nar', 'frz', 'hidfrz'] });
add(8, { nc: 12, e: 2, u: 4, target: .34, mix: ['hid', 'frz', 'nar', 'hidnar', null, 'hidfrz', 'nare'] });
add(8, { nc: 11, e: 2, u: 5, target: .32, mix: ['hid', 'nar', 'hidfrz', 'frz', 'hidnar'] });
const twist = (P, k) => {
  const Q = Object.assign({}, P);
  let m = P.mix ? P.mix[k % P.mix.length] : P.hidEvery ? (k % P.hidEvery === 0 ? 'hid' : null) : null;
  if (m && m.includes('hid')) Q.hid = 'top';
  if (m && m.includes('frz')) Q.frz = 1 + (k % 2);
  if (m === 'nar' || m === 'hidnar') Q.nar = ['full'];
  if (m === 'nare') { Q.nar = ['empty']; Q.e = 1; Q.nc = P.nc - 2; }   // one normal empty tube + one small empty tube: tight
  return Q;
};
const out = { levels: [], daily: [] };
const t0 = Date.now();
let k = 0;
PLAN.forEach((P0, i) => {
  let L, wr = 1;
  if (P0.fixed) { L = Object.assign({}, P0.fixed); const sol = C.solve(C.newState(L)); L.m = sol.length; L.s = C.encMoves(sol); }
  else { const P = twist(P0, k++); ({ L, wr } = make(P, 7000 + i * 37, 'level ' + (i + 1))); }
  if (P0.tip) L.tip = P0.tip;
  if (C.decMoves(L.s).length !== L.m) throw new Error('bad solution ' + (i + 1));
  out.levels.push(L);
  console.log(`L${String(i + 1).padStart(3)} tubes ${L.t.length} col ${new Set(L.t.join('')).size} u ${L.u}${L.n ? ' small ' + L.n.length : ''}${L.f ? ' frozen' : ''}${L.h ? ' hidden' : ''} par ${L.m} bot ${(wr * 100).toFixed(0)}%${L.tip ? ' tip ' + L.tip : ''}`);
});
// daily puzzles: a pool from the middle-to-late plan, with twists
for (let d = 0; d < 40; d++) {
  const P0 = PLAN[40 + (d * 13) % 75], P = twist(P0, d + 3); P.cand = 16; P.target = Math.min(.6, P0.target + .05);
  const { L } = make(P, 90000 + d * 101, 'daily ' + d);
  out.daily.push(L);
}
fs.writeFileSync(path.join(here, 'lssrc', 'levels.json'), JSON.stringify(out));
console.log('written', out.levels.length, 'levels +', out.daily.length, 'daily in', Date.now() - t0, 'ms', fs.statSync(path.join(here, 'lssrc', 'levels.json')).size, 'bytes');
