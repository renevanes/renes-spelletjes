import { existsSync as require_exists } from 'node:fs';
// Kleurbuisjes undo / restore fuzz test: node lsfuzz.mjs [path-to-index.html] [actions-per-level]
// Random taps (often while pours are still animating) mixed with Terug, Extra buisje, Tip, Opnieuw and reload + resume.
// After every action: all scheduled times finite; at regular checkpoints (when the animations had time to finish):
// picture == rules state, timeline empty, render loop stopped, and the game still accepts a move.
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'lstest', 'index.html'));
const PER = +(process.argv[3] || 45);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ ...devices['Pixel 7'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); });
let seed = 20261013; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = n => Math.floor(rnd() * n);
const ev = (f, a) => p.evaluate(f, a);
const SYNTH = () => { window.__tapAt = (x, y) => { const c = document.getElementById('lsStage'), o = { clientX: x, clientY: y, pointerId: 7, bubbles: true, cancelable: true, isPrimary: true, pointerType: 'touch' }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); }; window.__tapId = i => { const c = __ls.center(i); __tapAt(c.x, c.y); }; };
async function boot() { await p.goto(target); await p.waitForTimeout(300); await ev(SYNTH); await ev(() => { localStorage.setItem('ls.stats', JSON.stringify({ stars: Object.fromEntries([...Array(120)].map((_, i) => [i + 1, 1])), inv: { undo: 5000, tube: 500 } })); }); }
await boot();
await ev(() => openGame('ls')); await p.waitForTimeout(300);
const issues = []; let actions = 0, checks = 0, taps = 0, midTaps = 0, undos = 0, tubes = 0, restarts = 0, reloads = 0, hints = 0, wins = 0, stucks = 0;
const issue = (lv, what, x) => { issues.push({ lv, what, x }); console.log('ISSUE', lv, what, JSON.stringify(x || '').slice(0, 300)); };
const finiteTL = () => ev(() => { const t = __ls.timeline(); return [...t.sched, ...t.pours.flat(), ...t.busy].every(Number.isFinite); });
async function checkpoint(lv) {
  checks++;
  const t0 = Date.now(); let idle = false;
  while (Date.now() - t0 < 8000) { if (await ev(() => !__ls.busy() && !__ls.loopOn())) { idle = true; break; } await p.waitForTimeout(60); }
  if (!idle) { issue(lv, 'still animating / redrawing 8 s after the last action', await ev(() => ({ busy: __ls.busy(), loop: __ls.loopOn(), tl: __ls.timeline() }))); return; }
  const st = await ev(() => ({ bad: __ls.check(), tl: __ls.timeline(), won: __ls.S.won, over: __ls.G.over, stuck: __ls.stuck(__ls.S), dlg: document.getElementById('lsStuckModal').classList.contains('show'), end: document.getElementById('lsEndModal').classList.contains('show') }));
  if (st.bad.length) issue(lv, 'picture != rules', st.bad);
  if (st.tl.sched.length || st.tl.pours.length) issue(lv, 'timeline not empty when idle', st.tl);
  if (![...st.tl.busy].every(Number.isFinite)) issue(lv, 'non-finite busy time', st.tl.busy);
  if (st.stuck && !st.dlg && !st.over) issue(lv, 'stuck without dialog', st);
  if (st.dlg && !st.stuck) issue(lv, 'stuck dialog but not stuck', st);
  if (st.won) { if (!st.end) await p.waitForTimeout(2200); wins++; return 'won'; }
  if (st.stuck) { stucks++; await ev(() => { document.getElementById('lsStuckUndo').click(); }); await p.waitForTimeout(80); return; }
  // the game still accepts a move: make one legal pour by tapping, check it happened, then take it back
  const r = await ev(() => { const M = __ls, S = M.S; document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    const mv = M.legal(S).find(([s, t]) => !(S.T[t].length === 0 && S.T[s].every(c => c === S.T[s][0])));
    if (!mv) return { none: true };
    if (M.sel >= 0) __tapId(M.sel);
    const m0 = M.G.moves; __tapId(mv[0]); __tapId(mv[1]); return { ok: M.G.moves === m0 + 1, mv }; });
  if (r.none) return;
  if (!r.ok) issue(lv, 'a legal pour was not accepted', r);
  await p.waitForTimeout(ri(500));
  await ev(() => __ls.useUndo());
}
const LEVELS = [3, 14, 30, 45, 58, 72, 96, 110, 'd'];
for (const lv of LEVELS) {
  await ev(lv => { document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); __ls.startLevel(lv === 'd' ? 'd' + __ls.dayStr() : lv); document.getElementById('lsTip').classList.remove('show'); }, lv);
  await p.waitForTimeout(200);
  for (let k = 0; k < PER; k++) {
    actions++;
    const x = rnd();
    let act;
    if (x < .42) act = 'tap'; else if (x < .56) act = 'burst'; else if (x < .72) act = 'undo'; else if (x < .77) act = 'tube'; else if (x < .82) act = 'hint'; else if (x < .87) act = 'restart'; else if (x < .91) act = 'reload'; else act = 'good';
    if (act === 'tap') { await ev(n => { const i = Math.floor(Math.random() * __ls.S.T.length); __tapId(i); }, 0); taps++; }
    else if (act === 'good' || act === 'burst') {
      // one or several sensible pours in quick succession (they overlap on screen), sometimes taking one back at once
      const n = act === 'good' ? 1 : 2 + ri(3);
      for (let j = 0; j < n; j++) {
        await ev(() => { const M = __ls, S = M.S; const ms = M.legal(S).filter(([s, t]) => S.T[t].length || !S.T[s].every(c => c === S.T[s][0])); if (!ms.length || M.G.over) return; if (M.sel >= 0) __tapId(M.sel); const m = ms[Math.floor(Math.random() * ms.length)]; __tapId(m[0]); __tapId(m[1]); });
        midTaps++; await p.waitForTimeout(ri(220));
        if (rnd() < .25) { await ev(() => __ls.useUndo()); undos++; }
      }
    }
    else if (act === 'undo') { await ev(() => __ls.useUndo()); undos++; }
    else if (act === 'tube') { await ev(() => __ls.useTube()); tubes++; }
    else if (act === 'hint') { await ev(() => { __ls.G.tips = 0; const r = __ls.useHint(); if (r && Math.random() < .7) { __tapId(r[0]); __tapId(r[1]); } }); hints++; }
    else if (act === 'restart') {
      if (rnd() < .5) { await ev(() => document.getElementById('lsRetry').click()); await p.waitForTimeout(120); await ev(() => { const y = document.getElementById('askYes'); if (document.getElementById('askModal').classList.contains('show')) y.click(); }); }
      else await ev(() => __ls.startLevel(__ls.G.id));
      restarts++;
    }
    else if (act === 'reload') {
      await p.waitForTimeout(ri(400));
      await ev(() => window.appBack()); await p.waitForTimeout(100);
      await p.reload(); await p.waitForTimeout(350); await ev(SYNTH);
      await ev(() => openGame('ls')); await p.waitForTimeout(250);
      const resumed = await ev(() => !__ls.G.preview || document.getElementById('lsStartModal').classList.contains('show'));
      if (!resumed) issue(lv, 'no resume after reload');
      if (await ev(() => __ls.G.preview)) { await ev(lv => { document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); __ls.startLevel(lv === 'd' ? 'd' + __ls.dayStr() : lv); }, lv); }
      reloads++;
    }
    if (!(await finiteTL())) issue(lv, 'non-finite time in the timeline right after ' + act, await ev(() => __ls.timeline()));
    // keep going while things move, or wait and verify
    if (rnd() < .45) { const r = await checkpoint(lv); if (r === 'won') await ev(lv => { document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); __ls.startLevel(lv === 'd' ? 'd' + __ls.dayStr() : lv); }, lv); }
    else await p.waitForTimeout(ri(260));
    if (issues.length > 12) break;
  }
  const r = await checkpoint(lv);
  // finally: the stored solution still wins from a fresh start of this level (game not broken)
  const fin = await ev(() => { const M = __ls; document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); M.startLevel(M.G.id); for (const [s, t] of M.decMoves(M.L.s)) { __tapId(s); __tapId(t); } return M.S.won; });
  if (!fin) issue(lv, 'solution no longer wins after the fuzzing');
  await p.waitForTimeout(400);
  console.log(`level ${lv}: done (${actions} actions so far, ${issues.length} issues)`); void r;
  if (issues.length > 12) break;
}
console.log(JSON.stringify({ actions, checks, taps, midTaps, undos, tubes, hints, restarts, reloads, wins, stucks, issues: issues.length }));
console.log('errors', errs.slice(0, 5));
console.log(!issues.length && !errs.length ? 'FUZZ PASS' : 'FUZZ FAIL');
await b.close();
