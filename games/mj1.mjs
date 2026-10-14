import { existsSync as require_exists } from 'node:fs';
// Mahjong test: node mj1.mjs [path-to-index.html]   (default: ../mjtest/index.html)
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'gfx');
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'mjtest', 'index.html'));
const SEEDS = +(process.env.SEEDS || 5);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
async function page(opts = {}, init) {
  const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 915 }, ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(cfg => { if (!localStorage.getItem('app.cfg') || cfg) localStorage.setItem('app.cfg', cfg || '{"seen":"9.99"}'); }, init || null);
  await p.goto(target); await p.waitForTimeout(400);
  return p;
}
const shot = (p, n, clip) => p.screenshot({ path: path.join(OUT, `mj_${n}.png`), ...(clip ? { clip } : {}) });
const vis = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
const ev = (p, f, a) => p.evaluate(f, a);
const openGame = async p => { await ev(p, () => document.querySelector('#tileMj').scrollIntoView({ block: 'center' })); await p.tap('#tileMj'); await p.waitForTimeout(350); };
// in-page tap on a tile through the real input path (pointer events on the effects canvas -> hit test -> rules)
const SYNTH = () => { window.__pick = () => { const M = __mj; return (M.S.sol && M.S.sol.find(([a, b]) => M.free[a] && M.free[b])) || M.pairs[0]; }; window.__tapAt = (x, y) => { const c = document.getElementById('mjFx'), o = { clientX: x, clientY: y, pointerId: 7, bubbles: true, isPrimary: true, pointerType: 'touch' }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); }; };
// solver bot: follows a solution (the deal's own, or one found by the independent solver) by tapping the tiles
const botRun = (p, opts = {}) => ev(p, async ({ useSolver }) => {
  const M = __mj, S = M.S, G = M.G; let moves = 0, wrong = 0;
  let sol = useSolver ? M.solve(G, S.faces, 200000) : S.sol, fallback = false;
  if (!sol) { sol = S.sol; fallback = true; }
  if (!sol) return { err: 'no solution' };
  sol = sol.map(x => x.slice());
  for (const [a, b] of sol) {
    for (const i of [a, b]) { const c = M.center(i); __tapAt(c.x, c.y); }
    if (S.faces[a] !== -1 || S.faces[b] !== -1) { wrong++; break; }
    moves++;
  }
  return { moves, wrong, fallback, left: S.faces.filter(f => f >= 0).length, over: S.over };
}, opts);
const waitEnd = async p => { for (let i = 0; i < 40 && !(await vis(p, 'mjEndModal')); i++) await p.waitForTimeout(100); return vis(p, 'mjEndModal'); };

let p;
try {
if (process.env.PERF_ONLY) throw 'skip';
p = await page();
await ev(p, SYNTH);
ok('menu tile + vector icon', await ev(p, () => !!document.querySelector('#tileMj') && (document.querySelector('#tileMj .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileMj h2').textContent === 'Mahjong'));
await ev(p, () => document.querySelector('#tileMj').scrollIntoView({ block: 'center' }));
{ const r = await ev(p, () => { const r = document.querySelector('#tileMj').getBoundingClientRect(); return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: Math.min(412, r.width + 12), height: r.height + 12 }; }); await shot(p, 'menu', r); }
await openGame(p);
ok('start modal opens', await vis(p, 'mjStartModal'));
ok('8 layouts + dagpuzzel in start modal', await ev(p, () => document.querySelectorAll('#mjLays button[data-lay]').length === 8 && document.querySelectorAll('#mjLays img').length === 8 && /Dagpuzzel/.test(document.getElementById('mjDaily').textContent)));
await shot(p, 'start');
ok('game generation always solvable (by construction, 50 deals per layout)', await ev(p, () => __mj.LAYOUTS.every(L => { const G = __mj.geo(L.id); for (let s = 1; s <= 50; s++) { const d = __mj.deal(L.id, s * 104729); if (!d || !__mj.checkSol(G, d.faces, d.sol)) return false; } return true; })));
ok('tile set: 4 of each normal tile, 1 of each flower/season', await ev(p, () => { const d = __mj.deal('schildpad', 99), c = {}; d.faces.forEach(f => c[f] = (c[f] || 0) + 1); return Object.keys(c).length === 42 && Object.entries(c).every(([f, n]) => n === (+f < 34 ? 4 : 1)); }));

// ---------- every layout, several seeds, solved by tapping ----------
await p.click('#mjLays button[data-lay="ruit"]'); await p.click('#mjGo'); await p.waitForTimeout(1200);
ok('start via UI', await ev(p, () => __mj.S && __mj.S.lay === 'ruit' && !document.getElementById('mjStartModal').classList.contains('show')));
// first game: real touchscreen taps from Playwright
{
  const sol = await ev(p, () => __mj.S.sol.map(x => x.slice())); let t0 = Date.now(), wrong = 0;
  for (const [a, bb] of sol) { for (const i of [a, bb]) { const c = await ev(p, i => __mj.center(i), i); await p.touchscreen.tap(c.x, c.y); } if (await ev(p, ([a, b]) => __mj.S.faces[a] !== -1 || __mj.S.faces[b] !== -1, [a, bb])) { wrong++; break; } }
  ok('Ruit solved with real touch taps', !wrong && await waitEnd(p), `${sol.length} pairs in ${Date.now() - t0} ms`);
  await shot(p, 'win');
  ok('win dialog shows time, hints and best time', await ev(p, () => /Gewonnen/.test(document.getElementById('mjEndTitle').textContent) && /\d+:\d\d/.test(document.getElementById('mjEndText').textContent) && /Beste tijd/.test(document.getElementById('mjEndText').textContent) && /Geen hints/.test(document.getElementById('mjEndText').textContent)));
  ok('stats + best time stored', await ev(p, () => { const s = __mj.stats(); return s.won === 1 && s.L.ruit.w === 1 && s.best.ruit != null && JSON.parse(localStorage.getItem('mj.stats')).best.ruit != null && !localStorage.getItem('mj.save'); }));
}
const solveRep = [];
for (const L of ['schildpad', 'piramide', 'burcht', 'draak', 'vlinder', 'bloem', 'brug', 'ruit']) {
  let good = 0, indep = 0, tot = 0; const t0 = Date.now();
  for (let k = 0; k < SEEDS; k++) {
    await ev(p, l => __mj.newGame(l), L); await p.waitForTimeout(30);
    if (await ev(p, () => !!__mj.solve(__mj.G, __mj.S.faces, 200000))) indep++;
    const r = await botRun(p, { useSolver: k % 2 === 1 });          // odd seeds: the independent solver's own solution
    tot++; if (r.left === 0 && r.over && !r.wrong) good++; else console.log(L, k, JSON.stringify(r));
  }
  await waitEnd(p);
  solveRep.push(`${L} ${good}/${tot}`);
  ok(`${L}: ${SEEDS} deals solved by tapping`, good === tot, `(independent solver found a solution for ${indep}/${tot}, ${Date.now() - t0} ms)`);
}
// daily puzzle: same deal for everyone on the same date, solvable, own record
{
  const d = await ev(p, () => __mj.dayStr()), dl = await ev(p, d => __mj.dailyLay(d), d);
  await ev(p, () => { __mj.newGame('ruit'); }); await p.waitForTimeout(100);
  await ev(p, () => document.getElementById('mjMenu').click()); await p.waitForTimeout(150);
  await p.click('#mjDaily'); await p.waitForTimeout(300);
  const f1 = await ev(p, () => __mj.S.faces.join());
  await ev(p, ([l, d]) => __mj.newGame(l, d), [dl, d]); const f2 = await ev(p, () => __mj.S.faces.join());
  ok('dagpuzzel: date-seeded and identical each time', f1 === f2 && await ev(p, d => __mj.S.daily === d, d), `layout ${dl}`);
  const r = await botRun(p);
  ok('dagpuzzel solved', r.left === 0 && await waitEnd(p) && /Dagpuzzel opgelost/.test(await ev(p, () => document.getElementById('mjEndTitle').textContent)));
  ok('dagpuzzel own record', await ev(p, d => __mj.stats().daily[d] != null && __mj.stats().dailyWon === 1, d));
  await ev(p, () => document.getElementById('mjEndMenu').click()); await p.waitForTimeout(200);
  ok('dagpuzzel card shows done', await ev(p, () => document.getElementById('mjDaily').classList.contains('done') && /✓/.test(document.getElementById('mjDaily').textContent)));
  await ev(p, () => document.getElementById('mjResume').click());
}

// ---------- rules: free tiles ----------
await ev(p, () => __mj.newGame('schildpad')); await p.waitForTimeout(1100);
const rules = await ev(p, () => {
  const M = __mj, G = M.G, S = M.S, alive = S.faces.map(f => f >= 0);
  const covered = [...Array(G.n).keys()].find(i => G.above[i].length && !M.free[i]);
  const sides = [...Array(G.n).keys()].find(i => !G.above[i].some(j => alive[j]) && G.left[i].some(j => alive[j]) && G.right[i].some(j => alive[j]));
  const tap = i => { const c = M.center(i); __tapAt(c.x, c.y); };
  // a covered tile's centre is drawn under the tile on top; tap it through tapTile directly (the hit test would find the top tile)
  M.tapTile(covered); const a = M.sel;
  tap(sides); const b = M.sel;
  const fr = [...Array(G.n).keys()].filter(i => M.free[i]);
  tap(fr[0]); const c = M.sel; tap(fr[0]); const d = M.sel;
  const x = fr.find(i => fr.some(j => j !== i && M.groupOf(S.faces[j]) !== M.groupOf(S.faces[i]))), y = fr.find(j => j !== x && M.groupOf(S.faces[j]) !== M.groupOf(S.faces[x]));
  tap(x); tap(y); const e = M.sel, left = S.faces.filter(f => f >= 0).length;
  return { covered, a, sides, b, c, d, e, x, y, left, freeN: fr.length, topHit: M.hit(M.center(covered).x - document.getElementById('mjStage').getBoundingClientRect().left, M.center(covered).y - document.getElementById('mjStage').getBoundingClientRect().top) };
});
ok('covered tile cannot be selected', rules.a === -1 && rules.topHit !== rules.covered, JSON.stringify(rules));
ok('tile blocked left and right cannot be selected', rules.b === -1);
ok('free tile selects, second tap deselects', rules.c >= 0 && rules.d === -1);
ok('no match: selection moves to the new tile, nothing removed', rules.e === rules.y && rules.left === 144);
await p.waitForTimeout(150); await shot(p, 'select');
const freeCount = await ev(p, () => { const M = __mj; return M.free.filter(Boolean).length; });
ok('free counter matches rules', freeCount === rules.freeN && freeCount === 35, freeCount);
ok('HUD counters', await ev(p, () => document.getElementById('mjLeft').textContent === '144' && +document.getElementById('mjPairs').textContent === __mj.pairs.length && __mj.pairs.length > 0));

// ---------- hint ----------
await p.tap('#mjTools button[data-t="hint"]'); await p.waitForTimeout(300);
const hp = await ev(p, () => { const M = __mj, h = M.hintP; return h && { ok: M.free[h[0]] && M.free[h[1]] && M.groupOf(M.S.faces[h[0]]) === M.groupOf(M.S.faces[h[1]]), hints: M.S.hints, anims: M.anims() }; });
ok('hint highlights a free matching pair, counted', hp && hp.ok && hp.hints === 1 && hp.anims > 0, JSON.stringify(hp));
await shot(p, 'hint');
// play the hinted pair, then undo
await ev(p, () => { const [a, b] = __mj.hintP; for (const i of [a, b]) { const c = __mj.center(i); __tapAt(c.x, c.y); } });
ok('hinted pair removed', await ev(p, () => __mj.S.faces.filter(f => f >= 0).length === 142 && document.getElementById('mjLeft').textContent === '142'));
await p.waitForTimeout(500);
const before = await ev(p, () => __mj.S.undo[__mj.S.undo.length - 1]);
await p.tap('#mjTools button[data-t="undo"]'); await p.waitForTimeout(150);
ok('undo puts the pair back', await ev(p, u => __mj.S.faces[u.a] === u.fa && __mj.S.faces[u.b] === u.fb && __mj.S.faces.filter(f => f >= 0).length === 144, before));
// unlimited undo: 6 moves, 6 undos
const u6 = await ev(p, () => { const M = __mj, f0 = M.S.faces.join(); for (let k = 0; k < 6; k++) { const [a, b] = M.S.sol.find(([a, b]) => M.free[a] && M.free[b]); M.tapTile(a); M.tapTile(b); } const mid = M.S.faces.filter(f => f >= 0).length; for (let k = 0; k < 6; k++) M.doUndo(); return { mid, back: M.S.faces.join() === f0, solOk: M.checkSol(M.G, M.S.faces, M.S.sol) }; });
ok('multiple undo back to the start', u6.mid === 132 && u6.back && u6.solOk, JSON.stringify(u6));

// ---------- shuffle ----------
const sh = await ev(p, () => { const M = __mj, ms = a => a.filter(f => f >= 0).sort((x, y) => x - y).join(); const f0 = M.S.faces.slice(); document.querySelector('#mjTools button[data-t="shuffle"]').click(); const f1 = M.S.faces; return { same: ms(f0) === ms(f1), changed: f0.join() !== f1.join(), count: M.S.shuffles, sol: M.checkSol(M.G, f1, M.S.sol), indep: !!M.solve(M.G, f1, 200000) }; });
ok('shuffle keeps the tiles, moves them, stays solvable', sh.same && sh.changed && sh.count === 1 && sh.sol && sh.indep, JSON.stringify(sh));
await ev(p, () => __mj.doUndo());
ok('shuffle can be undone', await ev(p, () => __mj.S.undo.length === 0));
// shuffle mid-game, many times: always solvable
const shMany = await ev(p, () => { const M = __mj; let okN = 0; for (let k = 0; k < 20; k++) { const pr = M.S.sol.find(([a, b]) => M.free[a] && M.free[b]); M.tapTile(pr[0]); M.tapTile(pr[1]); M.doShuffle(); if (M.checkSol(M.G, M.S.faces, M.S.sol)) okN++; } return okN; });
ok('20 shuffles during play all solvable', shMany === 20, shMany);

// ---------- stuck: no free pairs -> shuffle offered ----------
await ev(p, () => __mj.newGame('piramide')); await p.waitForTimeout(900);
const stuck = await ev(p, () => {
  const M = __mj, G = M.G, f = M.S.faces.slice(), fr = [...Array(G.n).keys()].filter(i => M.free[i]), used = new Set();
  for (const i of fr) {
    if (!used.has(M.groupOf(f[i]))) { used.add(M.groupOf(f[i])); continue; }
    const j = [...Array(G.n).keys()].find(j => !fr.includes(j) && !used.has(M.groupOf(f[j])));
    [f[i], f[j]] = [f[j], f[i]]; used.add(M.groupOf(f[i]));
  }
  M.setFaces(f);
  return { pairs: M.pairs.length, free: fr.length };
});
await p.waitForTimeout(200);
ok('stuck position detected, shuffle offered', stuck.pairs === 0 && await vis(p, 'mjStuckModal'), JSON.stringify(stuck));
ok('pairs counter warns', await ev(p, () => document.getElementById('mjPairsW').classList.contains('none')));
await shot(p, 'stuck');
await p.click('#mjStuckShuffle'); await p.waitForTimeout(300);
ok('shuffle from stuck dialog: moves again and solvable', await ev(p, () => !document.getElementById('mjStuckModal').classList.contains('show') && __mj.pairs.length > 0 && __mj.checkSol(__mj.G, __mj.S.faces, __mj.S.sol)));
const r2 = await botRun(p);
ok('stuck game finished after shuffle', r2.left === 0, JSON.stringify(r2));
await waitEnd(p);

// ---------- zoom / pan ----------
await ev(p, () => __mj.newGame('schildpad')); await p.waitForTimeout(1000);
const z0 = await ev(p, () => ({ ...__mj.V }));
const bd = await ev(p, () => __mj.bounds());
ok('portrait: turtle fits the width', bd.x >= 0 && bd.x + bd.w <= z0.cw + 1 && z0.W >= 23, `tile ${z0.W.toFixed(1)} px, board ${bd.w.toFixed(0)} of ${z0.cw} px`);
const empty = await ev(p, () => { const r = document.getElementById('mjStage').getBoundingClientRect(); return { x: r.left + 20, y: r.top + 30 }; });
await ev(p, ({ x, y }) => { __tapAt(x, y); __tapAt(x, y); }, empty); await p.waitForTimeout(400);
const z1 = await ev(p, () => ({ ...__mj.V }));
ok('double tap on the table zooms in', z1.s >= 1.9, z1.s);
await shot(p, 'zoom');
await ev(p, () => { const c = document.getElementById('mjFx'), r = c.getBoundingClientRect(), o = (x, y) => ({ clientX: r.left + x, clientY: r.top + y, pointerId: 3, bubbles: true }); c.dispatchEvent(new PointerEvent('pointerdown', o(300, 300))); for (let k = 1; k <= 10; k++) c.dispatchEvent(new PointerEvent('pointermove', o(300 - k * 12, 300 + k * 4))); c.dispatchEvent(new PointerEvent('pointerup', o(180, 340))); });
await p.waitForTimeout(100);
const z2 = await ev(p, () => ({ ...__mj.V, sel: __mj.sel }));
ok('drag pans the zoomed board (no tile selected by the drag)', Math.abs(z2.ox - z1.ox) > 40 && z2.sel === -1, `${z1.ox.toFixed(0)} -> ${z2.ox.toFixed(0)}`);
await p.tap('#mjZoomBtn'); await p.waitForTimeout(350);
ok('zoom button back to fit', await ev(p, () => __mj.V.s === 1));
// pinch with two pointers
await ev(p, () => { const c = document.getElementById('mjFx'), r = c.getBoundingClientRect(), o = (id, x, y) => ({ clientX: r.left + x, clientY: r.top + y, pointerId: id, bubbles: true }); c.dispatchEvent(new PointerEvent('pointerdown', o(1, 180, 400))); c.dispatchEvent(new PointerEvent('pointerdown', o(2, 230, 400))); for (let k = 1; k <= 8; k++) { c.dispatchEvent(new PointerEvent('pointermove', o(1, 180 - k * 10, 400))); c.dispatchEvent(new PointerEvent('pointermove', o(2, 230 + k * 10, 400))); } c.dispatchEvent(new PointerEvent('pointerup', o(1, 100, 400))); c.dispatchEvent(new PointerEvent('pointerup', o(2, 310, 400))); });
await p.waitForTimeout(200);
ok('pinch zooms', await ev(p, () => __mj.V.s > 2), await ev(p, () => __mj.V.s.toFixed(2)));
const zt = await ev(p, () => { const M = __mj, r = document.getElementById('mjStage').getBoundingClientRect(), inV = c => c.x > r.left + 10 && c.x < r.right - 10 && c.y > r.top + 10 && c.y < r.bottom - 10; const fr = M.free.map((f, i) => f ? i : -1).filter(i => i >= 0 && inV(M.center(i))); let good = 0; for (const i of fr) { const c = M.center(i); __tapAt(c.x, c.y); if (M.sel === i) good++; __tapAt(c.x, c.y); } return { n: fr.length, good, s: M.V.s.toFixed(2) }; });
ok('taps hit the right tile when zoomed', zt.n > 3 && zt.good === zt.n, JSON.stringify(zt));
await ev(p, () => __mj.zoomTo(1, 0, 0, false));

// ---------- pause ----------
await ev(p, () => document.getElementById('mjPauseBtn').click());
const t1 = await ev(p, () => __mj.S.time); await p.waitForTimeout(800); const t2 = await ev(p, () => __mj.S.time);
ok('pause stops the clock and hides the board', t1 === t2 && await vis(p, 'mjPause'));
await p.click('#mjPause'); await p.waitForTimeout(700);
ok('resume runs the clock', (await ev(p, () => __mj.S.time)) > t2);
await ev(p, () => document.getElementById('mjMenu').click()); const t3 = await ev(p, () => __mj.S.time); await p.waitForTimeout(700);
ok('clock stops while a dialog is open', t3 === await ev(p, () => __mj.S.time));
await ev(p, () => document.getElementById('mjResume').click());

// ---------- save / resume ----------
await ev(p, () => { const M = __mj; for (let k = 0; k < 2; k++) { const [a, b] = M.S.sol.find(([a, b]) => M.free[a] && M.free[b]); M.tapTile(a); M.tapTile(b); } });
const snap = await ev(p, () => __mj.S.faces.join() + '|' + __mj.S.undo.length);
await p.tap('#mjBack'); await p.waitForTimeout(250);
ok('saved + badge on the menu tile', await ev(p, () => !!localStorage.getItem('mj.save') && document.getElementById('tileMj').classList.contains('has-save')));
await p.reload(); await p.waitForTimeout(500); await ev(p, SYNTH);
ok('badge after reload', await ev(p, () => document.getElementById('tileMj').classList.contains('has-save')));
await openGame(p); await p.waitForTimeout(300);
ok('resumed after reload', await ev(p, s => __mj.S && __mj.S.faces.join() + '|' + __mj.S.undo.length === s && !document.getElementById('mjStartModal').classList.contains('show') && document.getElementById('mjLeft').textContent === '140', snap));
ok('undo works after reload', await ev(p, () => { __mj.doUndo(); return __mj.S.faces.filter(f => f >= 0).length === 142; }));
await p.evaluate(() => window.appBack()); await p.waitForTimeout(200);
ok('Android back leaves the game', await ev(p, () => document.getElementById('menu').classList.contains('active')));

// ---------- sounds and music ----------
const snd = await ev(p, () => Object.entries(__sfx._test()).filter(([k]) => k.startsWith('mj')));
ok('mj sounds render cleanly', snd.length === 9 && snd.every(([, v]) => !v.nan && v.pk > .3 && v.rms > .003), JSON.stringify(snd.map(([k, v]) => `${k}:${v.len}s/${v.ms}ms`)));
ok('mj music track exists', await ev(p, () => __sfx._music('mj').then(b => !!b && b.duration > 20)));
await openGame(p);
await ev(p, () => { window.__played = []; const o = __sfx.play; __sfx.play = function (n, ...a) { __played.push(n); return o.call(this, n, ...a); }; });
let mus; for (let i = 0; i < 80; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now === 'mj') break; }
ok('music plays in the game', mus.now === 'mj', JSON.stringify(mus));
await ev(p, () => { const M = __mj, [a, b] = __pick(); M.tapTile(a); M.tapTile(b); });
ok('sound on: mj sounds play', await ev(p, () => __played.includes('mjSel') && __played.includes('mjMatch')));
await ev(p, () => document.getElementById('mjMenu').click()); await p.waitForTimeout(150);
await p.click('#mjOptList button[data-k="sound"][data-v="false"]'); await p.click('#mjOptList button[data-k="music"][data-v="false"]');
await ev(p, () => document.getElementById('mjResume').click());
await ev(p, () => { __played.length = 0; const M = __mj, [a, b] = __pick(); M.tapTile(a); M.tapTile(b); M.hint(); M.doUndo(); M.doShuffle(); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now !== 'mj') break; }
ok('sound + music off: silent', await ev(p, () => !__played.some(n => n.startsWith('mj'))) && mus.now !== 'mj', JSON.stringify([await ev(p, () => __played), mus.now]));
ok('options saved', await ev(p, () => { const o = JSON.parse(localStorage.getItem('mj.settings')); return o.sound === false && o.music === false; }));
await ev(p, () => document.getElementById('mjMenu').click()); await p.waitForTimeout(100);
await p.click('#mjOptList button[data-k="sound"][data-v="true"]'); await p.click('#mjOptList button[data-k="music"][data-v="true"]');
// other options: free-tile highlight + tables
await p.click('#mjOptList button[data-k="table"][data-v=\'"hout"\']');
ok('table theme switches', await ev(p, () => document.getElementById('mjStage').className === 't-hout'));
await shot(p, 'opts');
await ev(p, () => document.getElementById('mjResume').click()); await p.waitForTimeout(300); await shot(p, 'hout');
await ev(p, () => document.getElementById('mjMenu').click()); await p.click('#mjOptList button[data-k="table"][data-v=\'"nacht"\']'); await p.click('#mjOptList button[data-k="hl"][data-v="false"]');
await ev(p, () => document.getElementById('mjResume').click()); await p.waitForTimeout(300); await shot(p, 'nacht');
await ev(p, () => document.getElementById('mjMenu').click()); await p.click('#mjOptList button[data-k="table"][data-v=\'"groen"\']'); await p.click('#mjOptList button[data-k="hl"][data-v="true"]');
await ev(p, () => document.getElementById('mjResume').click());

// ---------- trophies + statistics page ----------
await p.evaluate(() => window.appBack()); await p.waitForTimeout(200);
await p.click('#statBtn'); await p.waitForTimeout(200);
ok('statistics row', await ev(p, () => [...document.querySelectorAll('#statBody .st-row b')].some(b => b.textContent === 'Mahjong') && /gewonnen/.test(document.getElementById('statBody').textContent)));
await ev(p, () => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
await p.click('#trophyBtn'); await p.waitForTimeout(200);
ok('trophies: first win unlocked, others listed', await ev(p, () => { const t = [...document.querySelectorAll('#trophyBody .trophy')]; const f = n => t.find(x => x.querySelector('b').textContent === n); return f('Stenenspeler') && f('Stenenspeler').classList.contains('on') && f('Alle vormen') && f('Snelle schildpad') && f('Zonder hulp') && f('Dagpuzzelaar'); }));
await ev(p, () => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));

// ---------- screenshots of every layout ----------
await openGame(p);
for (const L of ['schildpad', 'piramide', 'burcht', 'draak', 'vlinder', 'bloem', 'brug', 'ruit']) { await ev(p, l => __mj.newGame(l), L); await p.waitForTimeout(1300); await shot(p, 'lay_' + L); }
} catch (e) { if (e !== 'skip') ok('exception', false, e.stack); }

// ---------- landscape ----------
try {
  if (process.env.PERF_ONLY) throw 'skip';
  const pl = await page({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  await ev(pl, SYNTH);
  await openGame(pl); await shot(pl, 'startL');
  await ev(pl, () => __mj.newGame('schildpad')); await pl.waitForTimeout(1200);
  const lb = await ev(pl, () => { const s = document.getElementById('mjStage').getBoundingClientRect(), t = document.getElementById('mjTools').getBoundingClientRect(), V = __mj.V; return { land: document.getElementById('mj').classList.contains('land'), s: [s.left, s.top, s.right, s.bottom], t: [t.left, t.top, t.right, t.bottom], W: V.W, fits: V.ox >= 0 && V.oy >= -1 && V.ox + V.W * 15.9 <= V.cw + 1, w: innerWidth, h: innerHeight }; });
  ok('landscape layout', lb.land && lb.t[0] >= lb.s[2] - 1 && lb.t[2] <= lb.w && lb.t[3] <= lb.h && lb.fits && lb.W > 28, JSON.stringify(lb));
  await shot(pl, 'schildpadL');
  await ev(pl, () => { const M = __mj, h = M.S.sol.find(([a, b]) => M.free[a] && M.free[b]); M.tapTile(h[0]); }); await pl.waitForTimeout(150); await shot(pl, 'selectL');
  await pl.tap('#mjTools button[data-t="hint"]'); await pl.waitForTimeout(400); await shot(pl, 'hintL');
  for (const L of ['piramide', 'burcht', 'draak', 'vlinder', 'bloem', 'brug', 'ruit']) { await ev(pl, l => __mj.newGame(l), L); await pl.waitForTimeout(1200); await shot(pl, 'lay_' + L + 'L'); }
  await ev(pl, () => __mj.newGame('brug')); await pl.waitForTimeout(800);
  const r = await botRun(pl); ok('landscape: solved by tapping', r.left === 0, JSON.stringify(r));
  await waitEnd(pl); await pl.waitForTimeout(200); await shot(pl, 'winL');
  // big text mode: bigger minimum tiles
  const pb = await page({}, JSON.stringify({ seen: '9.99', text: 'groot' }));
  await ev(pb, SYNTH); await openGame(pb); await ev(pb, () => __mj.newGame('schildpad')); await pb.waitForTimeout(1200);
  const bt = await ev(pb, () => ({ big: document.documentElement.classList.contains('big-text'), W: __mj.V.W, cw: __mj.V.cw }));
  ok('big text: tiles at least 30 px, board can be panned', bt.big && bt.W >= 30, JSON.stringify(bt));
  await shot(pb, 'bigtext');
} catch (e) { if (e !== 'skip') ok('landscape exception', false, e.stack); }

// ---------- performance: 6x CPU throttling, Schildpad ----------
// run 1: app sound muted (pure rendering); run 2: sound + music on, measured after the app's sound bank has been
// pre-rendered (that one-off background job right after the first touch is what a cold start costs on any game here)
for (const audio of [false, true]) {
  try {
    const tag = audio ? 'sound+music' : 'muted';
    const pp = await page({}, JSON.stringify({ seen: '9.99', mute: !audio }));
    await ev(pp, SYNTH); await openGame(pp); await ev(pp, () => __mj.newGame('schildpad')); await pp.waitForTimeout(1500);
    if (audio) { await pp.touchscreen.tap(30, 200); let st; for (let i = 0; i < 80; i++) { await pp.waitForTimeout(500); st = await ev(pp, () => __sfx._state()); if (st.now === 'mj') break; } await pp.waitForTimeout(+(process.env.WARM || 35000)); }
    const cdp = await pp.context().newCDPSession(pp); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const recFrames = ms => ev(pp, ms => new Promise(res => { const f = []; const st = performance.now(); const loop = t => { f.push(t); if (t - st < ms) requestAnimationFrame(loop); else res(f); }; requestAnimationFrame(loop); }), ms);
    const stat = f => { const d = f.slice(1).map((t, i) => t - f[i]).sort((a, b) => a - b); return { fps: +(1000 * d.length / (f[f.length - 1] - f[0])).toFixed(1), p95: +d[Math.floor(d.length * .95)].toFixed(1), max: +d[d.length - 1].toFixed(1) }; };
    const fr = recFrames(4000);
    for (let k = 0; k < 8; k++) {
      const pr = await ev(pp, () => { const M = __mj; return M.S.sol.find(([a, b]) => M.free[a] && M.free[b]).map(i => M.center(i)); });
      for (const c of pr) { await pp.touchscreen.tap(c.x, c.y); await pp.waitForTimeout(90); }
      await pp.waitForTimeout(150);
    }
    const st1 = stat(await fr);
    const lat = await ev(pp, () => __mj.tapLat()), latS = lat.slice().sort((a, b) => a - b);
    ok(`6x CPU (${tag}): taps answered < 100 ms`, latS[Math.floor(latS.length * .9)] < 100, `tap->drawn median ${latS[latS.length >> 1].toFixed(0)} ms, p90 ${latS[Math.floor(latS.length * .9)].toFixed(0)} ms, max ${latS[latS.length - 1].toFixed(0)} ms (${lat.length} taps)`);
    ok(`6x CPU (${tag}): match animations >= 50 fps`, st1.fps >= 50, JSON.stringify(st1));
    await ev(pp, () => __mj.hint()); const st2 = stat(await recFrames(2500));
    ok(`6x CPU (${tag}): hint glow >= 50 fps`, st2.fps >= 50, JSON.stringify(st2));
    if (!audio) {
      const frD = recFrames(1200); await ev(pp, () => __mj.newGame('schildpad')); const st3 = stat(await frD);
      ok('6x CPU: new deal animation >= 50 fps', st3.fps >= 50, JSON.stringify(st3));
      const frZ = recFrames(200); const tz = Date.now(); await ev(pp, () => __mj.zoomTo(2, 200, 300)); const st4 = stat(await frZ);
      while (!(await ev(pp, () => Math.abs(__mj.spW() - __mj.V.W) < .01)) && Date.now() - tz < 8000) await pp.waitForTimeout(20);
      ok('6x CPU: zoom animation (GPU transform) >= 50 fps', st4.fps >= 50, JSON.stringify(st4) + ` · sharp again after ${Date.now() - tz} ms`);
      await ev(pp, () => __mj.zoomTo(1, 0, 0, false)); await pp.waitForTimeout(1500);
      // win: petals over the whole screen
      const frW = recFrames(2500); await ev(pp, () => { const M = __mj; for (const [a, b] of M.S.sol.slice()) { M.tapTile(a); M.tapTile(b); } }); const st5 = stat(await frW);
      ok('6x CPU: win animation (petals) fps', st5.fps >= 45, JSON.stringify(st5));
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await pp.close();
  } catch (e) { ok('perf exception', false, e.stack); }
}

ok('no console errors', errs.length === 0, errs.slice(0, 5).join(' | '));
console.log('\n' + res.filter(r => r.startsWith('FAIL')).join('\n'));
console.log(res.filter(r => r.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASS', `(${res.length} checks)`);
await b.close();
