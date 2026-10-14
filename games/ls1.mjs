import { existsSync as require_exists } from 'node:fs';
// Kleurbuisjes test: node ls1.mjs [path-to-index.html]   (default: ../lstest/index.html)
// env: PERF_ONLY=1 (only performance), NOPERF=1 (skip performance), WARM=ms (sound-bank warm-up before the audio perf run)
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'gfx');
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'lstest', 'index.html'));
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
async function page(opts = {}, cfg) {
  const ctx = await b.newContext({ ...devices['Pixel 7'], ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(cfg => { if (!localStorage.getItem('app.cfg') || cfg) localStorage.setItem('app.cfg', cfg || '{"seen":"9.99"}'); }, cfg || null);
  await p.goto(target); await p.waitForTimeout(400);
  return p;
}
const shot = (p, n, clip) => p.screenshot({ path: path.join(OUT, `ls_${n}.png`), ...(clip ? { clip } : {}) });
const vis = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
const ev = (p, f, a) => p.evaluate(f, a);
const openGame = async p => { await ev(p, () => document.querySelector('#tileLs').scrollIntoView({ block: 'center' })); await p.tap('#tileLs'); await p.waitForTimeout(400); };
const waitFor = async (p, fn, ms = 8000, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(p, fn, a)) return true; await p.waitForTimeout(80); } return false; };
const idle = p => waitFor(p, () => !__ls.busy() && !__ls.loopOn(), 15000);
const ALL = n => `localStorage.setItem('ls.stats', JSON.stringify({ stars: Object.fromEntries([...Array(${n})].map((_, i) => [i + 1, 1])) }))`;
// in-page tap through the real input path: pointer events on the stage -> hit test -> rules
const SYNTH = () => { window.__tapAt = (x, y) => { const c = document.getElementById('lsStage'), o = { clientX: x, clientY: y, pointerId: 7, bubbles: true, cancelable: true, isPrimary: true, pointerType: 'touch' }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); }; window.__tapId = i => { const c = __ls.center(i); __tapAt(c.x, c.y); }; };
// bot: plays the level's stored solver solution by tapping the tubes on screen; every pour must be accepted
const botLevel = (p, id) => ev(p, id => {
  const M = __ls; M.startLevel(id); const L = M.L, mv = M.decMoves(L.s); let wrong = 0;
  for (const [s, t] of mv) { const before = M.G.moves; __tapId(s); __tapId(t); if (M.G.moves !== before + 1) { wrong++; break; } }
  return { won: M.S.won, over: M.G.over, wrong, moves: M.G.moves, par: L.m, helped: M.G.helped, n: mv.length };
}, id);

let p;
try {
  if (process.env.PERF_ONLY) throw 'skip';
  p = await page();
  await ev(p, SYNTH);
  ok('menu tile + vector icon', await ev(p, () => !!document.querySelector('#tileLs') && (document.querySelector('#tileLs .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileLs h2').textContent === 'Kleurbuisjes'));
  await ev(p, () => document.querySelector('#tileLs').scrollIntoView({ block: 'center' }));
  { const r = await ev(p, () => { const r = document.querySelector('#tileLs').getBoundingClientRect(); return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: Math.min(412, r.width + 12), height: r.height + 12 }; }); await shot(p, 'menu', r); }
  await openGame(p);
  ok('tile opens the game with the start dialog', await ev(p, () => document.getElementById('ls').classList.contains('active')) && await vis(p, 'lsStartModal'));
  const lk = await ev(p, () => ({ n: document.querySelectorAll('#lsLevels button').length, open: [...document.querySelectorAll('#lsLevels button')].filter(b => !b.classList.contains('lock')).map(b => +b.dataset.n), daily: document.getElementById('lsDaily').classList.contains('lock') }));
  ok('fresh profile: 120 levels, only level 1 unlocked, daily puzzle locked', lk.n === 120 && lk.open.length === 1 && lk.open[0] === 1 && lk.daily, JSON.stringify(lk).slice(0, 80));
  ok('options in start dialog (Achtergrond, Kleurenblind-hulp, Geluidseffecten, Achtergrondmuziek)', await ev(p, () => ['cb', 'sound', 'music'].every(k => document.querySelectorAll(`#lsOptList button[data-k="${k}"]`).length === 2) && document.querySelectorAll('#lsOptList button[data-k="theme"]').length === 3 && /Kleurenblind-hulp/.test(document.getElementById('lsOptList').textContent)));
  await shot(p, 'start');
  await p.click('#lsLevels button[data-n="2"]', { force: true }); await p.waitForTimeout(150);
  ok('locked level does not start', await vis(p, 'lsStartModal') && await ev(p, () => __ls.G.preview));

  // ---------- level 1 with real touchscreen taps ----------
  await p.click('#lsLevels button[data-n="1"]'); await p.waitForTimeout(900);
  ok('level 1 starts with tip and pointing hand', await ev(p, () => __ls.G.id === 1 && !__ls.G.preview && document.getElementById('lsTip').classList.contains('show') && document.getElementById('lsHand').classList.contains('show')));
  await shot(p, 'l1');
  {
    const mv = await ev(p, () => __ls.decMoves(__ls.L.s));
    let c = await ev(p, i => __ls.center(i), mv[0][0]); await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(250);
    ok('tap lifts the tube', await ev(p, i => __ls.sel === i && __ls.VT[i].lift > .5, mv[0][0]));
    c = await ev(p, i => __ls.center(i), mv[0][1]); await p.touchscreen.tap(c.x, c.y);
    ok('second tap pours (rules state at once)', await ev(p, () => __ls.G.moves === 1 && __ls.S.T[2].length === 2));
    await p.waitForTimeout(470); await shot(p, 'pour1');
    await idle(p);
    ok('after the animation: picture == rules state, render loop stopped', await ev(p, () => __ls.check().length === 0 && !__ls.loopOn()), JSON.stringify(await ev(p, () => __ls.check())));
    for (const [s, t] of mv.slice(1)) { for (const i of [s, t]) { c = await ev(p, i => __ls.center(i), i); await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(90); } }
    ok('level 1 won with real taps (taps during animations are queued)', await ev(p, () => __ls.S.won && __ls.G.moves === 3));
    ok('win dialog after the last pour', await waitFor(p, () => document.getElementById('lsEndModal').classList.contains('show'), 9000));
    await p.waitForTimeout(700); await shot(p, 'win');
    ok('3 stars stored, save cleared', await ev(p, () => { const s = JSON.parse(localStorage.getItem('ls.stats')); return s.stars[1] === 3 && !localStorage.getItem('ls.save') && document.querySelectorAll('#lsEndStars span.on').length === 3; }));
  }
  await p.click('#lsEndNext'); await p.waitForTimeout(500);
  ok('Volgende starts level 2', await ev(p, () => __ls.G.id === 2 && !document.getElementById('lsEndModal').classList.contains('show')));

  // ---------- invalid pour ----------
  {
    const r = await ev(p, () => {
      const M = __ls; let pair = null; M.startLevel(2); for (let k = 0; k < 4 && !M.S.T.some((_, s) => M.S.T.some((_, t) => M.why(M.S, s, t) === 'colour')); k++) { const [s, t] = M.decMoves(M.L.s)[k]; M.tapTube(s); M.tapTube(t); }
      const S = M.S, m0 = M.G.moves;
      for (let s = 0; s < S.T.length && !pair; s++) for (let t = 0; t < S.T.length && !pair; t++) if (M.why(S, s, t) === 'colour') pair = [s, t];
      const before = JSON.stringify(S.T); __tapId(pair[0]); __tapId(pair[1]);
      return { pair, same: JSON.stringify(M.S.T) === before, moves: M.G.moves - m0, sel: M.sel, toast: document.getElementById('lsToast').classList.contains('show') && document.getElementById('lsToast').textContent, shake: !!M.VT[pair[1]].shake };
    });
    ok('invalid pour (top colour differs) is refused with a message and a shake', r.same && r.moves === 0 && r.sel === -1 && /dezelfde kleur/.test(r.toast) && r.shake, JSON.stringify(r));
    const r2 = await ev(p, () => { const M = __ls; M.startLevel(2); const e = M.S.T.findIndex(t => !t.length); __tapId(e); return { sel: M.sel, moves: M.G.moves }; });
    ok('an empty tube cannot be picked up', r2.sel === -1 && r2.moves === 0);
  }

  // ---------- every level and every daily puzzle solved by tapping (no help) ----------
  {
    const bad = []; let pours = 0; const t0 = Date.now(), parBad = [];
    for (let n = 1; n <= 120; n++) { const r = await botLevel(p, n); pours += r.n; if (!(r.won && r.over && !r.wrong && !r.helped && r.moves === r.par)) bad.push(n + ':' + JSON.stringify(r)); }
    ok('bot solves all 120 levels by tapping the tubes, no help, in exactly the par number of pours', !bad.length, `${pours} pours in ${Date.now() - t0} ms ${bad.slice(0, 4).join(' ')}`);
    ok('all levels unlocked + 3 stars stored', await ev(p, () => Object.keys(__ls.stats().stars).length === 120 && Object.values(__ls.stats().stars).every(s => s === 3)));
    const badD = [];
    for (let d = 0; d < 40; d++) {
      const r = await ev(p, d => { const M = __ls; let day = null; for (let k = 0; k < 80 && !day; k++) { const s = new Date(Date.UTC(2030, 0, 1 + k)).toISOString().slice(0, 10); if (M.levelOf('d' + s) === M.DLY[d]) day = s; }
        M.startLevel('d' + day); for (const [s, t] of M.decMoves(M.L.s)) { __tapId(s); __tapId(t); } return { won: M.S.won, day }; }, d);
      if (!r.won) badD.push(d);
    }
    ok('bot solves all 40 daily puzzles by tapping', !badD.length, badD.join(','));
    // independent check: the solver (fresh run, any weight) finds a way for every level from the start position
    const sv = await ev(p, () => { const M = __ls, out = []; const t0 = performance.now(); M.LV.concat(M.DLY).forEach(L => { const r = M.solve(M.newState(L), { w: 3, max: 200000 }); out.push(r ? 1 : 0); }); return { out, ms: Math.round(performance.now() - t0) }; });
    ok('solver confirms all 160 puzzles are solvable without help', sv.out.every(x => x === 1), `${sv.ms} ms`);
    const curve = await ev(p, () => { const M = __ls, f = L => ({ tubes: L.t.length, col: new Set(L.t.join('')).size, u: L.u, par: L.m }); return [1, 10, 30, 60, 90, 120].map(n => n + ':' + JSON.stringify(f(M.LV[n - 1]))); });
    ok('difficulty grows (colours, par)', true, curve.join(' '));
  }
  await p.waitForTimeout(300);
  for (const [n, nm] of [[4, 'early'], [52, 'mid'], [113, 'late']]) { await ev(p, n => __ls.startLevel(n), n); await p.waitForTimeout(900); await ev(p, () => document.getElementById('lsTip').classList.remove('show')); await shot(p, nm); }

  // ---------- stuck -> dialog -> Terug / Extra buisje / Opnieuw ----------
  {
    const STUCK = { t: ['abab', 'baab', 'bab'], u: 4, m: 1, s: 'ac' };
    await ev(p, L => { __ls.startLevel(30, L); }, STUCK); await p.waitForTimeout(300);
    ok('custom position is not stuck yet', !(await ev(p, () => __ls.stuck(__ls.S))) && !(await vis(p, 'lsStuckModal')));
    await ev(p, () => { __tapId(0); __tapId(2); });
    ok('the pour leads to a dead end (no move left)', await ev(p, () => __ls.stuck(__ls.S)));
    ok('"Geen zetten meer" dialog appears after the pour', await waitFor(p, () => document.getElementById('lsStuckModal').classList.contains('show'), 6000));
    await p.waitForTimeout(300); await shot(p, 'stuck');
    ok('dialog offers Terug, Extra buisje, Opnieuw', await ev(p, () => /Terug/.test(document.getElementById('lsStuckUndo').textContent) && !document.getElementById('lsStuckUndo').disabled && /Extra buisje/.test(document.getElementById('lsStuckTube').textContent) && !!document.getElementById('lsStuckRetry')));
    await p.click('#lsStuckUndo'); await p.waitForTimeout(300);
    ok('Terug from the dialog: position back, game goes on', await ev(p, () => !__ls.stuck(__ls.S) && __ls.G.moves === 0 && JSON.stringify(__ls.S.T) === JSON.stringify([[0, 1, 0, 1], [1, 0, 0, 1], [1, 0, 1]]) && !document.getElementById('lsStuckModal').classList.contains('show')));
    await idle(p); ok('picture == rules after Terug', (await ev(p, () => __ls.check())).length === 0);
    await ev(p, () => { __tapId(1); __tapId(2); });
    await waitFor(p, () => document.getElementById('lsStuckModal').classList.contains('show'), 6000);
    const inv0 = await ev(p, () => __ls.stats().inv.tube);
    await p.click('#lsStuckTube'); await p.waitForTimeout(500);
    ok('Extra buisje from the dialog: one more empty tube, no longer stuck', await ev(p, inv0 => __ls.S.T.length === 4 && !__ls.S.T[3].length && !__ls.stuck(__ls.S) && __ls.stats().inv.tube === inv0 - 1 && __ls.VT.length === 4, inv0));
    await idle(p); ok('picture == rules after Extra buisje', (await ev(p, () => __ls.check())).length === 0, JSON.stringify(await ev(p, () => __ls.check())));
    await ev(p, L => { __ls.startLevel(30, L); }, STUCK); await p.waitForTimeout(200); await ev(p, () => { __tapId(0); __tapId(2); });
    await waitFor(p, () => document.getElementById('lsStuckModal').classList.contains('show'), 6000);
    await p.click('#lsStuckRetry'); await p.waitForTimeout(300);
    ok('Opnieuw restarts the level', await ev(p, () => __ls.G.moves === 0 && !document.getElementById('lsStuckModal').classList.contains('show')));
  }

  // ---------- tools: Terug, Extra buisje, Tip ----------
  {
    await ev(p, () => __ls.startLevel(20)); await p.waitForTimeout(300);
    const mv = await ev(p, () => __ls.decMoves(__ls.L.s));
    const T0 = await ev(p, () => JSON.stringify(__ls.S.T));
    await ev(p, mv => { __tapId(mv[0][0]); __tapId(mv[0][1]); __tapId(mv[1][0]); __tapId(mv[1][1]); }, mv);
    const n0 = await ev(p, () => +document.querySelector('#lsTools button[data-b="undo"] i').textContent);
    await p.tap('#lsTools button[data-b="undo"]'); await p.waitForTimeout(100);
    await p.tap('#lsTools button[data-b="undo"]'); await p.waitForTimeout(100);
    ok('Terug (twice, during the animation): back to the start position, counter down', await ev(p, T0 => JSON.stringify(__ls.S.T) === T0 && __ls.G.moves === 0, T0) && await ev(p, n0 => +document.querySelector('#lsTools button[data-b="undo"] i').textContent === n0 - 2, n0));
    await idle(p); ok('picture == rules after Terug during animations', (await ev(p, () => __ls.check())).length === 0, JSON.stringify(await ev(p, () => __ls.check())));
    await p.tap('#lsTools button[data-b="undo"]'); await p.waitForTimeout(100);
    ok('Terug with nothing to undo: message, nothing used', await ev(p, n0 => +document.querySelector('#lsTools button[data-b="undo"] i').textContent === n0 - 2 && /niets om terug/.test(document.getElementById('lsToast').textContent), n0));
    const t0 = await ev(p, () => __ls.stats().inv.tube);
    await p.tap('#lsTools button[data-b="tube"]'); await p.waitForTimeout(600);
    ok('Extra buisje: an empty tube more, one used', await ev(p, t0 => __ls.S.T.length === __ls.L.t.length + 1 && __ls.stats().inv.tube === t0 - 1 && __ls.VT.length === __ls.S.T.length, t0));
    await shot(p, 'extratube');
    await p.tap('#lsTools button[data-b="tube"]'); await p.waitForTimeout(100);
    ok('Extra buisje twice in a level: refused', await ev(p, t0 => __ls.S.T.length === __ls.L.t.length + 1 && __ls.stats().inv.tube === t0 - 1, t0));
    await p.tap('#lsTools button[data-b="hint"]'); await p.waitForTimeout(300);
    const h = await ev(p, () => { const m = document.querySelectorAll('.ls-hint'); return { n: m.length, tips: __ls.G.tips }; });
    await shot(p, 'hint');
    ok('Tip shows a move (two markers)', h.n === 2 && h.tips === 1, JSON.stringify(h));
    // follow the tips until solved: the solver's moves always work
    const hr = await ev(p, () => { const M = __ls; let k = 0; M.G.tips = -999; while (!M.S.won && k++ < 200) { const r = M.useHint(); if (!r) return { k, fail: true }; __tapId(r[0]); __tapId(r[1]); } return { k, won: M.S.won, stars: M.G.res && M.G.res.st }; });
    ok('following the tips solves the level; help means at most 2 stars', hr.won && hr.stars <= 2, JSON.stringify(hr));
    await waitFor(p, () => document.getElementById('lsEndModal').classList.contains('show'), 9000);
  }

  // ---------- twists: hidden layers, frozen tube, small tube ----------
  {
    const hd = await ev(p, () => { const M = __ls; M.startLevel(30); const S = M.S, mv = M.decMoves(M.L.s); let okTop = true, seen = 0;
      const chk = () => S.T.forEach((t, i) => { if (t.length && S.hid[i][t.length - 1]) okTop = false; seen += S.hid[i].filter(Boolean).length; });
      chk(); const h0 = seen; for (const [s, t] of mv.slice(0, 6)) { __tapId(s); __tapId(t); chk(); }
      return { h0, okTop, after: S.hid.flat().filter(Boolean).length }; });
    ok('hidden layers: never on top, revealed as they come up', hd.h0 > 0 && hd.okTop && hd.after < hd.h0, JSON.stringify(hd));
    await p.waitForTimeout(600); await idle(p); await shot(p, 'hidden');
    const fz = await ev(p, () => { const M = __ls; M.startLevel(45); const S = M.S, f = S.frz.findIndex(x => x > 0), mv = M.decMoves(M.L.s);
      let tried = M.why(S, f, S.T.findIndex(t => !t.length)), steps = 0, thawedAt = -1;
      for (const [s, t] of mv) { __tapId(s); __tapId(t); steps++; if (thawedAt < 0 && S.done >= S.frz[f]) thawedAt = steps; }
      return { f, tried, thawedAt, won: S.won }; });
    ok('frozen tube: closed until a tube is complete, then usable', fz.f >= 0 && fz.tried === 'frozen' && fz.thawedAt > 0 && fz.won, JSON.stringify(fz));
    const sm = await ev(p, () => { const M = __ls; M.startLevel(72); const S = M.S, i = S.cap.findIndex(c => c < S.U); return { i, cap: S.cap[i], U: S.U, small: M.VT[i].small, h: M.VT[i].G.gh < M.VT[(i + 1) % S.T.length].G.gh }; });
    ok('small tube: room for one layer less, drawn shorter', sm.i >= 0 && sm.cap === sm.U - 1 && sm.small && sm.h, JSON.stringify(sm));
    await p.waitForTimeout(600); await ev(p, () => document.getElementById('lsTip').classList.remove('show')); await shot(p, 'small');
    // a completed tube gets its cork
    await ev(p, () => { const M = __ls; M.startLevel(8); const mv = M.decMoves(M.L.s); for (const [s, t] of mv) { if (M.S.done) break; __tapId(s); __tapId(t); } });
    ok('completed tube: cork on (after its pour)', await waitFor(p, () => __ls.VT.some(v => v.corked && v.cork.classList.contains('on')), 8000));
    await p.waitForTimeout(150); await shot(p, 'done');
  }

  // ---------- save / resume ----------
  {
    await ev(p, () => __ls.startLevel(12)); await p.waitForTimeout(200);
    await ev(p, () => { const mv = __ls.decMoves(__ls.L.s); for (const [s, t] of mv.slice(0, 3)) { __tapId(s); __tapId(t); } }); await p.waitForTimeout(400);
    const snap = await ev(p, () => JSON.stringify([__ls.S.T, __ls.G.moves]));
    await p.tap('#lsBack'); await p.waitForTimeout(300);
    ok('saved + badge on the menu tile', await ev(p, () => !!localStorage.getItem('ls.save') && document.getElementById('tileLs').classList.contains('has-save')));
    await p.reload(); await p.waitForTimeout(500); await ev(p, SYNTH);
    ok('badge after reload', await ev(p, () => document.getElementById('tileLs').classList.contains('has-save')));
    await openGame(p); await p.waitForTimeout(400);
    ok('resumed after reload (same tubes and moves)', await ev(p, s => __ls.G.id === 12 && JSON.stringify([__ls.S.T, __ls.G.moves]) === s && !document.getElementById('lsStartModal').classList.contains('show'), snap));
    await idle(p); ok('picture == rules after resume', (await ev(p, () => __ls.check())).length === 0);
    await ev(p, () => document.getElementById('lsMenu').click()); await p.waitForTimeout(150);
    ok('unlocked levels kept after reload', await ev(p, () => document.querySelectorAll('#lsLevels button.lock').length === 0 && !document.getElementById('lsDaily').classList.contains('lock')));
    ok('Verder button resumes', await ev(p, () => !document.getElementById('lsResume').hidden));
    await ev(p, () => document.getElementById('lsResume').click());
    await p.tap('#lsTools button[data-b="undo"]'); await p.waitForTimeout(150);
    ok('undo works after reload', await ev(p, () => __ls.G.moves === 2));
    const rest = await ev(p, () => { const mv = __ls.decMoves(__ls.L.s); for (const [s, t] of mv.slice(2)) { __tapId(s); __tapId(t); } return __ls.S.won; });
    ok('the resumed level can be finished', rest);
    await waitFor(p, () => document.getElementById('lsEndModal').classList.contains('show'), 9000);
    await p.evaluate(() => window.appBack()); await p.waitForTimeout(200);
    ok('Android back leaves the game', await ev(p, () => document.getElementById('menu').classList.contains('active') && !document.getElementById('tileLs').classList.contains('has-save')));
  }

  // ---------- sounds, music and options ----------
  {
    const snd = await ev(p, () => Object.entries(__sfx._test()).filter(([k]) => k.startsWith('ls')));
    ok('ls sounds render cleanly (no NaN, sensible level)', snd.length === 17 && snd.every(([, v]) => !v.nan && v.pk > .3 && v.rms > .003), JSON.stringify(snd.map(([k, v]) => `${k}:${v.len}s/${v.ms}ms`)));
    const starts = await ev(p, () => { const out = []; for (const n of Object.keys(__sfx._G).filter(k => k.startsWith('ls'))) { const d = __sfx._buf(n).getChannelData(0), m = Math.floor(__sfx._sr() * .0005); let mx = 0, pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); for (let i = 0; i < m; i++) mx = Math.max(mx, Math.abs(d[i])); out.push([n, +(mx / pk).toFixed(3)]); } return out; });
    ok('ls sounds start softly (first 0.5 ms < 0.2 of peak)', starts.every(([, m]) => m < .2), JSON.stringify(starts.filter(([, m]) => m >= .05)));
    ok('ls music track exists', await ev(p, () => __sfx._music('ls').then(b => !!b && b.duration > 15)));
    await openGame(p);
    await ev(p, () => { window.__played = []; const o = __sfx.play; __sfx.play = function (n, ...a) { __played.push(n); return o.call(this, n, ...a); }; });
    await ev(p, () => __ls.startLevel(3)); await p.waitForTimeout(200);
    let mus; for (let i = 0; i < 80; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now === 'ls') break; }
    ok('music plays in the game', mus.now === 'ls', JSON.stringify(mus));
    await ev(p, () => { const mv = __ls.decMoves(__ls.L.s); __tapId(mv[0][0]); __tapId(mv[0][1]); }); await p.waitForTimeout(1500);
    ok('sound on: pick + pour sounds play', await ev(p, () => __played.includes('lsPick') && __played.some(n => /^lsPour\d$/.test(n))), JSON.stringify(await ev(p, () => __played)));
    await ev(p, () => document.getElementById('lsMenu').click()); await p.waitForTimeout(150);
    await p.click('#lsOptList button[data-k="sound"][data-v="false"]'); await p.click('#lsOptList button[data-k="music"][data-v="false"]');
    await ev(p, () => document.getElementById('lsResume').click());
    await ev(p, () => { __played.length = 0; const mv = __ls.decMoves(__ls.L.s); __tapId(mv[1][0]); __tapId(mv[1][1]); __ls.useUndo(); __tapId(0); __tapId(0); }); await p.waitForTimeout(2000);
    for (let i = 0; i < 12; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now !== 'ls') break; }
    ok('sound + music off: silent', await ev(p, () => !__played.some(n => n.startsWith('ls'))) && mus.now !== 'ls', JSON.stringify([await ev(p, () => __played), mus.now]));
    ok('options saved', await ev(p, () => { const o = JSON.parse(localStorage.getItem('ls.settings')); return o.sound === false && o.music === false; }));
    await ev(p, () => document.getElementById('lsMenu').click()); await p.waitForTimeout(100);
    await p.click('#lsOptList button[data-k="sound"][data-v="true"]'); await p.click('#lsOptList button[data-k="music"][data-v="true"]');
    // colour-blind help: symbols drawn in the liquid
    await ev(p, () => { document.getElementById('lsResume').click(); __ls.startLevel(52); document.getElementById('lsTip').classList.remove('show'); }); await idle(p);
    const px = () => ev(p, () => { const c = __ls.VT[0].l; return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.reduce((a, x, i) => (a + x * (i % 7 + 1)) % 1000003, 0); });
    const a0 = await px();
    await ev(p, () => document.getElementById('lsMenu').click()); await p.click('#lsOptList button[data-k="cb"][data-v="true"]'); await ev(p, () => document.getElementById('lsResume').click()); await idle(p);
    const a1 = await px();
    ok('colour-blind help on: saved, symbols drawn in the layers', await ev(p, () => __ls.opt.cb === true && JSON.parse(localStorage.getItem('ls.settings')).cb === true) && a0 !== a1);
    await shot(p, 'cb');
    // themes
    for (const th of ['lagune', 'perzik', 'avond']) { await ev(p, () => document.getElementById('lsMenu').click()); await p.click(`#lsOptList button[data-k="theme"][data-v='"${th}"']`); await ev(p, () => document.getElementById('lsResume').click()); await p.waitForTimeout(400); if (th !== 'avond') await shot(p, 'theme_' + th); }
    ok('themes switch and are saved', await ev(p, () => JSON.parse(localStorage.getItem('ls.settings')).theme === 'avond'));
    await ev(p, () => document.getElementById('lsMenu').click()); await p.click('#lsOptList button[data-k="cb"][data-v="false"]'); await ev(p, () => document.getElementById('lsResume').click());
  }

  // ---------- statistics + trophies ----------
  await p.evaluate(() => window.appBack()); await p.waitForTimeout(200);
  await p.click('#statBtn'); await p.waitForTimeout(200);
  ok('statistics row', await ev(p, () => [...document.querySelectorAll('#statBody .st-row b')].some(b => b.textContent === 'Kleurbuisjes') && /120\/120 levels/.test(document.getElementById('statBody').textContent)));
  await ev(p, () => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
  await p.click('#trophyBtn'); await p.waitForTimeout(200);
  ok('trophies: Eerste druppel + Meestermenger unlocked', await ev(p, () => { const t = [...document.querySelectorAll('#trophyBody .trophy')]; const f = n => t.find(x => x.querySelector('b').textContent === n); return f('Eerste druppel') && !f('Eerste druppel').classList.contains('lock') && f('Meestermenger') && !f('Meestermenger').classList.contains('lock'); }));
  await ev(p, () => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
} catch (e) { if (e !== 'skip') ok('exception', false, e.stack); }

// ---------- landscape + big text ----------
try {
  if (process.env.PERF_ONLY) throw 'skip';
  const pl = await page({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  await ev(pl, SYNTH);
  await openGame(pl); await shot(pl, 'startL');
  const fits = [];
  for (const n of [1, 30, 72, 110]) {
    await ev(pl, ([n, all]) => { eval(all); __ls.startLevel(n); }, [n, ALL(120)]); await pl.waitForTimeout(400);
    fits.push(await ev(pl, () => { const M = __ls, r = document.getElementById('lsStage').getBoundingClientRect(), t = document.getElementById('lsTools').getBoundingClientRect();
      const inside = M.VT.every(v => v.hx >= 0 && v.hx + v.G.W <= r.width + 1 && v.hy - M.LY.lift >= -2 && v.hy + v.G.H <= r.height + 2);
      return { land: document.getElementById('ls').classList.contains('land'), toolsRight: t.left >= r.right - 1, inside, cell: Math.round(Math.min(...M.LY.slots.map(s => s.cw))), rows: M.LY.rows }; }));
  }
  ok('landscape: tools on the right, all tubes visible', fits.every(f => f.land && f.toolsRight && f.inside), JSON.stringify(fits));
  ok('landscape: tap targets >= 44 px wide', fits.every(f => f.cell >= 44), fits.map(f => f.cell).join(','));
  await ev(pl, () => __ls.startLevel(60)); await pl.waitForTimeout(400);
  await ev(pl, () => { document.getElementById('lsTip').classList.remove('show'); const mv = __ls.decMoves(__ls.L.s); for (const [s, t] of mv.slice(0, 4)) { __tapId(s); __tapId(t); } }); await idle(pl);
  await ev(pl, () => { const mv = __ls.decMoves(__ls.L.s); __ls.speed(.12); __tapId(mv[4][0]); __tapId(mv[4][1]); }); await pl.waitForTimeout(500); await shot(pl, 'land'); await ev(pl, () => __ls.speed(1));
  const r = await ev(pl, () => { const M = __ls; M.startLevel(110); for (const [s, t] of M.decMoves(M.L.s)) { __tapId(s); __tapId(t); } return M.S.won; });
  ok('landscape: level 110 solved by tapping', r);
  ok('landscape: win dialog', await waitFor(pl, () => document.getElementById('lsEndModal').classList.contains('show'), 90000));
  await pl.waitForTimeout(600); await shot(pl, 'winL');
  // portrait sizes
  const pp = await page();
  await ev(pp, SYNTH); await openGame(pp);
  const sz = [];
  for (const n of [1, 30, 72, 110, 120]) { await ev(pp, ([n, all]) => { eval(all); __ls.startLevel(n); }, [n, ALL(120)]); await pp.waitForTimeout(300); sz.push(await ev(pp, () => { const M = __ls, r = document.getElementById('lsStage').getBoundingClientRect(); return { n: M.S.T.length, rows: M.LY.rows, cell: Math.round(Math.min(...M.LY.slots.map(s => s.cw))), gw: Math.round(M.LY.gw), inside: M.VT.every(v => v.hx >= 0 && v.hx + v.G.W <= r.width + 1 && v.hy - M.LY.lift >= -2 && v.hy + v.G.H <= r.height + 2) }; })); }
  ok('portrait: 1-3 rows, all tubes visible, tap targets >= 44 px', sz.every(s => s.inside && s.cell >= 44), JSON.stringify(sz));
  // with the extra tube on the biggest level
  await ev(pp, () => { __ls.startLevel(110); __ls.useTube(); }); await pp.waitForTimeout(300);
  ok('portrait: biggest level + extra tube still fits', await ev(pp, () => { const M = __ls, r = document.getElementById('lsStage').getBoundingClientRect(); return M.S.T.length === 16 && M.VT.every(v => v.hx >= 0 && v.hx + v.G.W <= r.width + 1 && v.hy + v.G.H <= r.height + 2) && Math.min(...M.LY.slots.map(s => s.cw)) >= 44; }));
  // big-text mode
  const pb = await page({}, JSON.stringify({ seen: '9.99', text: 'groot' }));
  await ev(pb, SYNTH); await openGame(pb); await ev(pb, all => { eval(all); __ls.startLevel(113); }, ALL(120)); await pb.waitForTimeout(600);
  const bt = await ev(pb, () => { const M = __ls, r = document.getElementById('lsStage').getBoundingClientRect(); return { big: document.documentElement.classList.contains('big-text'), inside: M.VT.every(v => v.hy + v.G.H <= r.height + 2 && v.hx + v.G.W <= r.width + 1), cell: Math.round(Math.min(...M.LY.slots.map(s => s.cw))) }; });
  ok('big text: tubes still fit, tap targets >= 44 px', bt.big && bt.inside && bt.cell >= 44, JSON.stringify(bt));
  await ev(pb, () => document.getElementById('lsTip').classList.remove('show')); await shot(pb, 'bigtext');
} catch (e) { if (e !== 'skip') ok('landscape exception', false, e.stack); }

// ---------- performance: 6x CPU throttling ----------
if (!process.env.NOPERF) for (const audio of [false, true]) {
  try {
    const tag = audio ? 'sound+music' : 'muted';
    const pp = await page({}, JSON.stringify({ seen: '9.99', mute: !audio }));
    await ev(pp, SYNTH); await openGame(pp);
    await ev(pp, all => { eval(all); __ls.startLevel(110); }, ALL(120)); await pp.waitForTimeout(1500);
    if (audio) { await pp.touchscreen.tap(30, 120); let st; for (let i = 0; i < 80; i++) { await pp.waitForTimeout(500); st = await ev(pp, () => __sfx._state()); if (st.now === 'ls') break; } await pp.waitForTimeout(+(process.env.WARM || 32000)); }
    await ev(pp, () => { __ls.startLevel(110); document.getElementById('lsTip').classList.remove('show'); }); await pp.waitForTimeout(1200);
    const cdp = await pp.context().newCDPSession(pp); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const recFrames = ms => ev(pp, ms => new Promise(res => { const f = []; const st = performance.now(); const loop = t => { f.push(t); if (t - st < ms) requestAnimationFrame(loop); else res(f); }; requestAnimationFrame(loop); }), ms);
    const stat = f => { const d = f.slice(1).map((t, i) => t - f[i]).sort((a, b) => a - b); return { fps: +(1000 * d.length / (f[f.length - 1] - f[0])).toFixed(1), p95: +d[Math.floor(d.length * .95)].toFixed(1), max: +d[d.length - 1].toFixed(1) }; };
    const mv = await ev(pp, () => __ls.decMoves(__ls.L.s));
    // warm-up pour (first use of everything), then the measured pours with real touch taps
    for (const i of mv[0]) { const c = await ev(pp, i => __ls.center(i), i); await pp.touchscreen.tap(c.x, c.y); await pp.waitForTimeout(150); }
    await pp.waitForTimeout(1200);
    await ev(pp, () => __ls.tapLat().length = 0);
    const fr = recFrames(6000);
    for (let k = 1; k < 7; k++) { for (const i of mv[k]) { const c = await ev(pp, i => __ls.center(i), i); await pp.touchscreen.tap(c.x, c.y); await pp.waitForTimeout(130); } await pp.waitForTimeout(650); }
    const st1 = stat(await fr);
    const lat = await ev(pp, () => __ls.tapLat()), latS = lat.slice().sort((a, b) => a - b);
    ok(`6x CPU (${tag}): taps answered < 100 ms`, latS.length && latS[Math.floor(latS.length * .9)] < 100, `tap->drawn median ${latS[latS.length >> 1]?.toFixed(0)} ms, p90 ${latS[Math.floor(latS.length * .9)]?.toFixed(0)} ms, max ${latS[latS.length - 1]?.toFixed(0)} ms (${lat.length} taps)`);
    ok(`6x CPU (${tag}): pour animations >= 50 fps`, st1.fps >= 50, JSON.stringify(st1));
    if (!audio) {
      // a fast player: 3 pours per second (several pours at once), then the win confetti
      const frW = recFrames(7000); await ev(pp, () => new Promise(res => { const mv = __ls.decMoves(__ls.L.s).slice(__ls.G.moves); let i = 0; const go = () => { if (i < mv.length && i < 20) { __tapId(mv[i][0]); __tapId(mv[i][1]); i++; setTimeout(go, 330); } else res(); }; go(); })); const st2 = stat(await frW);
      ok('6x CPU: fast play (3 pours/s, pours overlapping) >= 50 fps', st2.fps >= 50, JSON.stringify(st2));
      await ev(pp, () => { const mv = __ls.decMoves(__ls.L.s).slice(__ls.G.moves); for (const [s, t] of mv) { __tapId(s); __tapId(t); } });
      const t0 = Date.now(); while (!(await ev(pp, () => document.querySelectorAll('#lsConf i').length)) && Date.now() - t0 < 60000) await pp.waitForTimeout(100);
      const st3 = stat(await recFrames(2500));
      ok('6x CPU: win confetti >= 50 fps', st3.fps >= 50, JSON.stringify(st3));
      // idle: nothing is redrawn
      await waitFor(pp, () => document.getElementById('lsEndModal').classList.contains('show'), 20000); await ev(pp, () => __ls.startLevel(50)); await pp.waitForTimeout(3000);
      ok('idle: the render loop stops', await ev(pp, () => !__ls.loopOn() && !__ls.busy()));
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await pp.close();
  } catch (e) { ok('perf exception', false, e.stack); }
}

ok('no console errors', errs.length === 0, errs.slice(0, 5).join(' | '));
console.log('\n' + res.filter(r => r.startsWith('FAIL')).join('\n'));
console.log(res.filter(r => r.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASS', `(${res.length} checks)`);
await b.close();
