// Dakrenner test bot: finds an input script for every level with a beam search over the real (deterministic) core,
// collecting all three golden shoes on the way, and writes drsrc/solutions.json (run-length encoded input bits per level)
// plus the medal times derived from the bot's time.
//   node drsolve.mjs                 all levels (keeps solutions that still replay correctly)
//   node drsolve.mjs 3,4 [beam] [force]   only levels 3 and 4 (1-based)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { load } from './drsrc/load.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'drsrc', 'solutions.json'), PART = process.env.DR_PART ? OUT.replace('.json', '.' + process.env.DR_PART + '.json') : null;
const D = load(), { Core, KB, ST, LEVELS, buildLevel } = D;
const args = process.argv.slice(2);
const only = args[0] && args[0] !== 'all' ? args[0].split(',').map(Number) : null;
const BEAM = +(args[1] || 260), FORCE = args.includes('force');
const MAC = 4;
const ACT = [KB.R, KB.R | KB.J, KB.R | KB.S, 0, KB.L, KB.L | KB.J, KB.J, KB.S, KB.R | KB.J | KB.S];

export function replay(L, rle, o = {}) {
  const S = Core.newState(L, { noEv: true, ...o }); let f = 0;
  for (let i = 0; i < rle.length; i += 2) for (let k = 0; k < rle[i + 1]; k++) { Core.step(L, S, rle[i]); f++; if (S.done) return { S, f }; }
  for (let k = 0; k < 120 && !S.done; k++) Core.step(L, S, 0);
  return { S, f };
}
function targetsOf(L) {
  const t = [];
  L.coins.forEach((c, i) => t.push({ x: c.x, y: c.y, coin: i }));
  L.cps.forEach((c, i) => t.push({ x: c.x, y: c.y - 1, cp: i }));
  L.wps.forEach(w => t.push({ x: w.x, y: w.y - 1, wp: 1 }));
  t.sort((a, b) => a.x - b.x || (a.wp ? -1 : 1));
  t.push({ x: L.finish.x, y: L.finish.y - 1, fin: 1 });
  return t;
}
function reached(S, tg) {
  if (tg.coin != null) return !!(S.coins & (1 << tg.coin));
  if (tg.cp != null) return S.cp > tg.cp;
  if (tg.fin) return !!S.done;
  return Math.abs(S.x - tg.x) < 1 && Math.abs(S.y - 1 - tg.y) < 1.4;
}
export function solve(L, beam = BEAM, maxSec = 240) {
  const tg = targetsOf(L);
  const root = { S: Core.newState(L, { noEv: true }), p: null, a: 0, t: 0 };
  let B = [root], best = null, top = -1e9, topAt = 0;
  const maxSteps = Math.ceil(maxSec * 60 / MAC);
  for (let step = 0; step < maxSteps; step++) {
    const seen = new Map();
    for (const n of B) {
      for (const a of ACT) {
        const S = Core.clone(n.S); S.noEv = true; let bad = false;
        for (let k = 0; k < MAC; k++) { Core.step(L, S, a); if (S.st === ST.CRASH || S.st === ST.FALL) { bad = true; break; } if (S.done) break; }
        if (bad) continue;
        let t = n.t; while (t < tg.length && reached(S, tg[t])) t++;
        const node = { S, p: n, a, t };
        if (S.done) { if (t >= tg.length && (!best || S.fin < best.S.fin)) best = node; continue; }
        const T = tg[Math.min(t, tg.length - 1)];
        const dx = Math.abs(S.x - T.x), dy = Math.abs(S.y - 1 - T.y); node.sc = t * 1000 - (dx > 4 ? dx + Math.max(0, S.y - 1 - T.y) * .15 : Math.hypot(dx, dy * 1.3)) + Math.abs(S.vx) * .05;
        const key = `${t}|${Math.round(S.x * 2.5)}|${Math.round(S.y * 2.5)}|${Math.round(S.vx / 1.5)}|${Math.round(S.vy / 3)}|${S.st}|${S.coins}|${S.wallS * (S.st === ST.WALL)}`;
        const o = seen.get(key); if (!o || o.sc < node.sc) seen.set(key, node);
      }
    }
    if (best) break;
    // keep the best states, plus a reserve of the best ones that stand safely (waiting for a platform or a laser)
    const all = [...seen.values()].sort((a, b) => b.sc - a.sc), nb = Math.round(beam * .7);
    // (one per tile column, so states that backed up for a run-up survive too)
    B = all.slice(0, nb); const cols = new Set();
    for (let i = nb, k = 0; i < all.length && k < beam - nb; i++) { const n = all[i], st = n.S.st, col = n.t * 10000 + Math.floor(n.S.x) * 4 + (n.S.gs > 4 ? 1 : n.S.gs < -1 ? 2 : 0); if (st !== ST.AIR && !cols.has(col)) { cols.add(col); B.push(n); k++; } }
    if (B.length && B[0].sc > top + .5) { top = B[0].sc; topAt = step; }
    else if (step - topAt > 240) return { ok: false, why: 'stuck', at: { x: B[0].S.x.toFixed(1), y: B[0].S.y.toFixed(1), t: B[0].t, of: tg.length, tgt: tg[Math.min(B[0].t, tg.length - 1)] } };
    if (!B.length) return { ok: false, why: 'dead end at step ' + step };
  }
  if (!best) return { ok: false, why: 'timeout', at: B[0] && { x: B[0].S.x.toFixed(1), y: B[0].S.y.toFixed(1), t: B[0].t, of: tg.length } };
  const acts = []; for (let n = best; n.p; n = n.p) acts.push(n.a); acts.reverse();
  const rle = []; for (const a of acts) { if (rle.length && rle[rle.length - 2] === a) rle[rle.length - 1] += MAC; else rle.push(a, MAC); }
  return { ok: true, rle, frames: best.S.fin, coins: best.S.coins };
}
export function medalsFor(frames) {
  const s = frames / 60, gold = Math.ceil((s * 1.12 + .8)), silver = Math.ceil(gold * 1.3), bronze = Math.ceil(gold * 1.75);
  return [gold * 60, silver * 60, bronze * 60];
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && args[0] === 'merge') {
  // merge the partial results of parallel runs (DR_PART=a node drsolve.mjs 1,2 & DR_PART=b node drsolve.mjs 3,4 & ...)
  const sol = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  for (const f of fs.readdirSync(path.dirname(OUT))) if (/^solutions\..+\.json$/.test(f)) { Object.assign(sol, JSON.parse(fs.readFileSync(path.join(path.dirname(OUT), f), 'utf8'))); fs.unlinkSync(path.join(path.dirname(OUT), f)); }
  fs.writeFileSync(OUT, JSON.stringify(sol)); console.log('merged', Object.keys(sol).length, 'levels');
} else if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const sol = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  let fails = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (only && !only.includes(i + 1)) continue;
    const L = buildLevel(LEVELS[i], i), key = String(i + 1), all = (1 << L.coins.length) - 1;
    if (!FORCE && sol[key]) { const r = replay(L, sol[key].rle); if (r.S.done && (r.S.coins & all) === all) { console.log(`level ${key} ${LEVELS[i].n}: kept (${(r.S.fin / 60).toFixed(2)} s)`); continue; } }
    const t0 = Date.now(); const r = solve(L);
    if (!r.ok) { console.log(`level ${key} ${LEVELS[i].n}: FAILED ${r.why} ${JSON.stringify(r.at || '')}`); fails++; continue; }
    sol[key] = { n: LEVELS[i].n, rle: r.rle, frames: r.frames, medals: medalsFor(r.frames) };
    console.log(`level ${key} ${LEVELS[i].n}: ${(r.frames / 60).toFixed(2)} s, ${r.rle.length / 2} runs, ${((Date.now() - t0) / 1000).toFixed(1)} s search`);
    if (PART) { const o = fs.existsSync(PART) ? JSON.parse(fs.readFileSync(PART, 'utf8')) : {}; o[key] = sol[key]; fs.writeFileSync(PART, JSON.stringify(o)); }
    else fs.writeFileSync(OUT, JSON.stringify(sol));
  }
  if (!PART) fs.writeFileSync(OUT, JSON.stringify(sol));
  console.log(fails ? `${fails} levels unsolved` : 'all solved');
}
