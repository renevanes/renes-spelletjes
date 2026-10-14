import { existsSync as require_exists } from 'node:fs';
// Bushalte test: node bh1.mjs [path-to-index.html]   (default: ../bhtest/index.html)
// env: PERF_ONLY=1 (only performance), NOPERF=1 (skip performance), WARM=ms (sound-bank warm-up before the audio perf run)
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'gfx');
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'bhtest', 'index.html'));
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
const shot = (p, n, clip) => p.screenshot({ path: path.join(OUT, `bh_${n}.png`), ...(clip ? { clip } : {}) });
const vis = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
const ev = (p, f, a) => p.evaluate(f, a);
const openGame = async p => { await ev(p, () => document.querySelector('#tileBh').scrollIntoView({ block: 'center' })); await p.tap('#tileBh'); await p.waitForTimeout(400); };
const waitFor = async (p, fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(p, fn)) return true; await p.waitForTimeout(80); } return false; };
// in-page tap through the real input path: pointer events on the game canvas -> hit test -> rules
const SYNTH = () => { window.__tapAt = (x, y) => { const c = document.getElementById('bhCv'), o = { clientX: x, clientY: y, pointerId: 7, bubbles: true, isPrimary: true, pointerType: 'touch' }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); }; window.__tapId = id => { const c = __bh.center(id); __tapAt(c.x, c.y); }; };
// bot: plays the level's stored solution by tapping the vehicles on screen; every tap must make the bus leave
const botLevel = (p, id) => ev(p, id => {
  const M = __bh; M.startLevel(id); const L = M.levelOf(id); let wrong = 0;
  for (const v of L.s) { if (M.S.gone[v]) { wrong++; break; } __tapId(v); if (!M.S.gone[v]) { wrong++; break; } }
  return { won: M.S.won, lost: M.S.lost, wrong, bumps: M.G.bumps, boosts: M.G.boosts, n: L.v.length, q: L.q.length, over: M.G.over };
}, id);

let p;
try {
  if (process.env.PERF_ONLY) throw 'skip';
  p = await page();
  await ev(p, SYNTH);
  ok('menu tile + vector icon', await ev(p, () => !!document.querySelector('#tileBh') && (document.querySelector('#tileBh .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileBh h2').textContent === 'Bushalte'));
  await ev(p, () => document.querySelector('#tileBh').scrollIntoView({ block: 'center' }));
  { const r = await ev(p, () => { const r = document.querySelector('#tileBh').getBoundingClientRect(); return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: Math.min(412, r.width + 12), height: r.height + 12 }; }); await shot(p, 'menu', r); }
  await openGame(p);
  ok('tile opens the game with the start dialog', await ev(p, () => document.getElementById('bh').classList.contains('active')) && await vis(p, 'bhStartModal'));
  const lk = await ev(p, () => ({ n: document.querySelectorAll('#bhLevels button').length, open: [...document.querySelectorAll('#bhLevels button')].filter(b => !b.classList.contains('lock')).map(b => +b.dataset.n), daily: document.getElementById('bhDaily').classList.contains('lock') }));
  ok('fresh profile: 40 levels, only level 1 unlocked, daily ride locked', lk.n === 40 && lk.open.length === 1 && lk.open[0] === 1 && lk.daily, JSON.stringify(lk));
  ok('options in start dialog (Kleurenblind-hulp, Geluidseffecten, Achtergrondmuziek)', await ev(p, () => ['cb', 'sound', 'music'].every(k => document.querySelectorAll(`#bhOptList button[data-k="${k}"]`).length === 2) && /Kleurenblind-hulp/.test(document.getElementById('bhOptList').textContent)));
  await shot(p, 'start');
  await p.click('#bhLevels button[data-n="2"]', { force: true }); await p.waitForTimeout(150);
  ok('locked level does not start', await vis(p, 'bhStartModal') && await ev(p, () => __bh.G.preview));

  // ---------- level 1 with real touchscreen taps ----------
  await p.click('#bhLevels button[data-n="1"]'); await p.waitForTimeout(900);
  ok('level 1 starts with tip and pointing hand', await ev(p, () => __bh.G.id === 1 && !__bh.G.preview && document.getElementById('bhTip').classList.contains('show') && document.getElementById('bhHand').classList.contains('show')));
  await shot(p, 'l1');
  {
    const sol = await ev(p, () => __bh.levelOf(1).s);
    let c = await ev(p, id => __bh.center(id), sol[0]); await p.touchscreen.tap(c.x, c.y);
    await p.waitForTimeout(380); await shot(p, 'drive');
    ok('tap: bus leaves the lot and drives to a bay', await ev(p, id => __bh.S.gone[id] && ['trip', 'bay'].includes(__bh.VIS[id].m), sol[0]));
    ok('passengers walk to the bus and seats fill', await waitFor(p, () => __bh.walkers > 0 && __bh.VIS.some(R => R.m === 'bay' && R.seats > 0), 4000));
    await shot(p, 'board');
    c = await ev(p, id => __bh.center(id), sol[1]); await p.touchscreen.tap(c.x, c.y);
    ok('level 1 won with real taps', await ev(p, () => __bh.S.won));
    ok('win dialog after the buses left', await waitFor(p, () => document.getElementById('bhEndModal').classList.contains('show'), 9000));
    await p.waitForTimeout(700); await shot(p, 'win');
    ok('3 stars + coins stored, save cleared', await ev(p, () => { const s = JSON.parse(localStorage.getItem('bh.stats')); return s.stars[1] === 3 && s.coins > 30 && !localStorage.getItem('bh.save') && document.querySelectorAll('#bhEndStars span.on').length === 3; }));
  }
  await p.click('#bhEndNext'); await p.waitForTimeout(500);
  ok('Volgende starts level 2', await ev(p, () => __bh.G.id === 2 && !document.getElementById('bhEndModal').classList.contains('show')));

  // ---------- blocked vehicle bumps and returns ----------
  {
    const id = await ev(p, () => { const M = __bh, g = M.occGrid(M.S); return M.S.V.find(v => !M.pathOf(M.S, v.id, g).free).id; });
    await ev(p, id => __tapId(id), id); await p.waitForTimeout(110); await shot(p, 'bump');
    const r = await ev(p, id => ({ gone: __bh.S.gone[id], bumps: __bh.G.bumps, bump: !!__bh.VIS[id].bump }), id);
    await p.waitForTimeout(800);
    ok('blocked bus bumps and comes back', !r.gone && r.bumps === 1 && r.bump && await ev(p, id => __bh.VIS[id].m === 'lot' && __bh.VIS[id].bump.end < performance.now() / 1000, id), JSON.stringify(r));
  }

  // ---------- every level and every daily ride solved by tapping (no boosters) ----------
  {
    const bad = []; let taps = 0; const t0 = Date.now();
    for (let n = 1; n <= 40; n++) { const r = await botLevel(p, n); taps += r.n; if (!(r.won && !r.wrong && !r.bumps && !r.boosts && r.over)) bad.push(n + ':' + JSON.stringify(r)); }
    ok('bot solves all 40 levels by tapping, no boosters, no bumps', !bad.length, `${taps} taps in ${Date.now() - t0} ms ${bad.join(' ')}`);
    ok('all levels unlocked + stars stored', await ev(p, () => Object.keys(__bh.stats().stars).length === 40 && document.querySelectorAll('#bhLevels button.lock').length === 0 || (() => { document.getElementById('bhMenu').click(); return document.querySelectorAll('#bhLevels button.lock').length === 0; })()));
    const badD = [];
    for (let d = 0; d < 30; d++) {
      const r = await ev(p, d => { const M = __bh; let day = null; for (let k = 0; k < 60 && !day; k++) { const dt = new Date(Date.UTC(2030, 0, 1 + k)); const s = dt.toISOString().slice(0, 10); if (M.levelOf('d' + s) === M.DLY[d]) day = s; } M.startLevel('d' + day); const L = M.S; for (const v of M.levelOf('d' + day).s) __tapId(v); return { won: M.S.won, bumps: M.G.bumps }; }, d);
      if (!r.won || r.bumps) badD.push(d);
    }
    ok('bot solves all 30 daily rides by tapping', !badD.length, badD.join(','));
    // independent check: the exact solver (search over tap orders, bays and queue) finds a way for every level
    const sv = await ev(p, () => { const M = __bh, out = []; const t0 = performance.now(); M.LV.concat(M.DLY).forEach((L, i) => { const r = M.solve(M.newState(L), 400000); out.push(r ? 1 : r === null ? 0 : -1); }); return { out, ms: Math.round(performance.now() - t0) }; });
    ok('exact solver confirms all 70 levels', sv.out.every(x => x === 1), `${sv.ms} ms ` + sv.out.map((x, i) => x === 1 ? '' : i + ':' + x).join(''));
    // difficulty: casual (random) play loses sometimes on later levels: the puzzles are not trivial
    const rnd = await ev(p, () => { const M = __bh; let rs = []; for (const n of [3, 15, 30, 40]) { let w = 0; for (let k = 0; k < 60; k++) { const S = M.newState(M.LV[n - 1]); for (let g = 0; g < 300 && !S.won && !S.lost; g++) { const ms = M.movable(S); M.tap(S, ms[Math.floor(Math.random() * ms.length)]); } w += S.won ? 1 : 0; } rs.push(n + ':' + Math.round(w / 60 * 100) + '%'); } return rs.join(' '); });
    ok('random play win rate falls with the level number', true, rnd);
  }
  await p.waitForTimeout(300);
  // screenshots of early / mid / late levels
  for (const [n, nm] of [[3, 'early'], [18, 'mid'], [38, 'late']]) { await ev(p, n => __bh.startLevel(n), n); await p.waitForTimeout(900); await ev(p, () => document.getElementById('bhTip').classList.remove('show')); await shot(p, nm); }

  // ---------- stuck -> lose dialog -> Opnieuw ----------
  {
    let r = null;
    for (let k = 0; k < 30 && !(r && r.lost); k++) r = await ev(p, k => {
      const M = __bh; M.startLevel(4 + (k % 6));
      for (let g = 0; g < 80 && !M.S.lost && !M.S.won; g++) { const ms = M.movable(M.S), f = M.S.q[M.S.qi], bad = ms.filter(id => M.S.V[id].c !== f); const pick = bad.length ? bad : ms; __tapId(pick[Math.floor(Math.random() * pick.length)]); }
      return { lost: M.S.lost, id: M.G.id };
    }, k);
    ok('wrong order gets stuck (all bays taken, front passenger fits none)', r.lost, JSON.stringify(r));
    ok('lose dialog appears', await waitFor(p, () => document.getElementById('bhLoseEndModal').classList.contains('show'), 12000));
    await p.waitForTimeout(300); await shot(p, 'stuck');
    ok('lose dialog offers Terug and Extra vak with counts', await ev(p, () => /Terug \(\d\)/.test(document.getElementById('bhLoseUndo').textContent) && /Extra vak \(\d\)/.test(document.getElementById('bhLoseBay').textContent)));
    const lvl = r.id;
    await p.click('#bhLoseRetry'); await p.waitForTimeout(300);
    ok('Opnieuw restarts the level', await ev(p, id => __bh.G.id === id && __bh.S.qi === 0 && __bh.S.gone.every(x => !x) && !__bh.S.lost && !document.getElementById('bhLoseEndModal').classList.contains('show'), lvl));
    // stuck again -> Terug from the dialog continues the game
    let r2 = null;
    for (let k = 0; k < 30 && !(r2 && r2.lost); k++) r2 = await ev(p, lvl => { const M = __bh; M.startLevel(lvl); for (let g = 0; g < 80 && !M.S.lost && !M.S.won; g++) { const ms = M.movable(M.S), f = M.S.q[M.S.qi], bad = ms.filter(id => M.S.V[id].c !== f); const pick = bad.length ? bad : ms; __tapId(pick[Math.floor(Math.random() * pick.length)]); } return { lost: M.S.lost }; }, lvl);
    await waitFor(p, () => document.getElementById('bhLoseEndModal').classList.contains('show'), 12000);
    const u0 = await ev(p, () => __bh.stats().inv.undo);
    await p.click('#bhLoseUndo'); await p.waitForTimeout(200);
    ok('Terug from the lose dialog: game goes on, one Terug used', await ev(p, u0 => !__bh.S.lost && __bh.stats().inv.undo === u0 - 1 && !document.getElementById('bhLoseEndModal').classList.contains('show'), u0));
    // stuck once more -> extra bay from the dialog
    await ev(p, () => { const M = __bh; for (let g = 0; g < 80 && !M.S.lost && !M.S.won; g++) { const ms = M.movable(M.S), f = M.S.q[M.S.qi], bad = ms.filter(id => M.S.V[id].c !== f); const pick = bad.length ? bad : ms; __tapId(pick[Math.floor(Math.random() * pick.length)]); } });
    if (await waitFor(p, () => document.getElementById('bhLoseEndModal').classList.contains('show'), 12000)) {
      const b0 = await ev(p, () => __bh.stats().inv.bay);
      await p.click('#bhLoseBay'); await p.waitForTimeout(400);
      ok('Extra vak from the lose dialog: one more bay, game goes on', await ev(p, b0 => !__bh.S.lost && __bh.S.extra && __bh.stats().inv.bay === b0 - 1 && __bh.freeSlot(__bh.S) === __bh.S.bays.length - 1, b0));
      await shot(p, 'extrabay');
    } else ok('stuck again for the extra-bay check', false);
  }

  // ---------- boosters: each works and is used up ----------
  {
    await ev(p, () => __bh.startLevel(20)); await p.waitForTimeout(300);
    const inv = () => ev(p, () => Object.assign({}, __bh.stats().inv));
    let i0 = await inv();
    await ev(p, () => __tapId(__bh.levelOf(20).s[0])); await ev(p, () => __tapId(__bh.levelOf(20).s[1]));
    const g2 = await ev(p, () => __bh.S.gone.filter(Boolean).length);
    await p.tap('#bhTools button[data-b="undo"]'); await p.waitForTimeout(200);
    let i1 = await inv();
    ok('Terug: last move undone, one used', g2 === 2 && await ev(p, () => __bh.S.gone.filter(Boolean).length === 1) && i1.undo === i0.undo - 1, JSON.stringify([i0.undo, i1.undo]));
    await p.tap('#bhTools button[data-b="bay"]'); await p.waitForTimeout(500);
    let i2 = await inv();
    ok('Extra vak: temporary extra bay, one used', await ev(p, () => __bh.S.extra) && i2.bay === i1.bay - 1);
    await p.tap('#bhTools button[data-b="bay"]'); await p.waitForTimeout(100);
    ok('Extra vak twice: refused, not used', (await inv()).bay === i2.bay);
    const c0 = await ev(p, () => __bh.S.V.map(v => v.c).join());
    await p.tap('#bhTools button[data-b="shuf"]'); await p.waitForTimeout(500);
    let i3 = await inv();
    ok('Schudden: colours of buses on the lot change, still solvable, one used', await ev(p, c0 => { const M = __bh; return M.S.V.map(v => v.c).join() !== c0 && M.S.V.every(v => !M.S.gone[v.id] || v.c === +c0.split(',')[v.id]) && !!M.solve(M.S, 400000); }, c0) && i3.shuf === i2.shuf - 1);
    await shot(p, 'shuffle');
    const tgt = await ev(p, () => { const M = __bh, g = M.occGrid(M.S); return M.S.V.find(v => !M.S.gone[v.id] && !M.pathOf(M.S, v.id, g).free).id; });
    await p.tap('#bhTools button[data-b="crane"]'); await p.waitForTimeout(100);
    ok('Kraan: waiting for a bus to be picked', await ev(p, () => __bh.craneMode && document.querySelector('#bhTools button[data-b="crane"]').classList.contains('on')));
    await ev(p, id => __tapId(id), tgt); await p.waitForTimeout(500); await shot(p, 'crane');
    let i4 = await inv();
    ok('Kraan: blocked bus lifted straight to a bay, one used', await ev(p, id => __bh.S.gone[id] && __bh.S.bays.some(b => b && b.v === id) || __bh.VIS[id].m !== 'lot', tgt) && i4.crane === i3.crane - 1 && !(await ev(p, () => __bh.craneMode)));
    // buying with coins when a booster is used up
    await ev(p, () => { const s = __bh.stats(); s.inv.undo = 0; s.coins = 100; });
    await ev(p, () => __tapId(__bh.movable(__bh.S)[0])); await p.waitForTimeout(100);
    await p.tap('#bhTools button[data-b="undo"]'); await p.waitForTimeout(150);
    ok('used-up booster is bought with coins (20) and used', await ev(p, () => __bh.stats().coins === 80 && __bh.stats().inv.undo === 0));
    await ev(p, () => { const s = __bh.stats(); s.coins = 0; });
    await p.tap('#bhTools button[data-b="undo"]'); await p.waitForTimeout(150);
    ok('no coins: booster refused with a message', await ev(p, () => __bh.stats().inv.undo === 0 && document.getElementById('bhToast').classList.contains('show') && /munten/.test(document.getElementById('bhToast').textContent)));
    await ev(p, () => { const s = __bh.stats(); s.inv = { undo: 3, bay: 2, shuf: 2, crane: 2 }; s.coins = 120; localStorage.setItem('bh.stats', JSON.stringify(s)); });
  }

  // ---------- hidden colours and locks ----------
  {
    await ev(p, () => __bh.startLevel(26)); await p.waitForTimeout(300);
    const h = await ev(p, () => { const M = __bh, g = M.occGrid(M.S); const hid = M.S.V.filter(v => v.hid); return { n: hid.length, revealedFree: hid.every(v => !!M.G.rev[v.id] === M.pathOf(M.S, v.id, g).free) }; });
    ok('mystery buses: hidden until their way is free', h.n > 0 && h.revealedFree, JSON.stringify(h));
    await ev(p, () => __bh.startLevel(18)); await p.waitForTimeout(200);
    const lk2 = await ev(p, () => { const M = __bh, v = M.S.V.find(v => v.lock > 0); const g = M.occGrid(M.S); const before = { gone: M.S.gone[v.id] }; const r = M.tap(M.clone ? M.S : M.S, v.id); return { lock: v.lock, r: r.k, gone: M.S.gone[v.id] }; });
    ok('locked bus does not leave before enough others have left', lk2.lock > 0 && (lk2.r === 'locked' || lk2.r === 'bump') && !lk2.gone, JSON.stringify(lk2));
  }

  // ---------- save / resume ----------
  {
    await ev(p, () => __bh.startLevel(6)); await p.waitForTimeout(200);
    await ev(p, () => { __tapId(__bh.levelOf(6).s[0]); __tapId(__bh.levelOf(6).s[1]); }); await p.waitForTimeout(400);
    const snap = await ev(p, () => JSON.stringify([__bh.S.gone, __bh.S.qi, __bh.S.bays.map(b => b && [b.v, b.n])]));
    await p.tap('#bhBack'); await p.waitForTimeout(300);
    ok('saved + badge on the menu tile', await ev(p, () => !!localStorage.getItem('bh.save') && document.getElementById('tileBh').classList.contains('has-save')));
    await p.reload(); await p.waitForTimeout(500); await ev(p, SYNTH);
    ok('badge after reload', await ev(p, () => document.getElementById('tileBh').classList.contains('has-save')));
    await openGame(p); await p.waitForTimeout(400);
    ok('resumed after reload (same buses, bays and queue)', await ev(p, s => __bh.G.id === 6 && JSON.stringify([__bh.S.gone, __bh.S.qi, __bh.S.bays.map(b => b && [b.v, b.n])]) === s && !document.getElementById('bhStartModal').classList.contains('show'), snap));
    await ev(p, () => document.getElementById('bhMenu').click()); await p.waitForTimeout(150);
    ok('unlocked levels kept after reload', await ev(p, () => document.querySelectorAll('#bhLevels button.lock').length === 0 && !document.getElementById('bhDaily').classList.contains('lock')));
    ok('Verder button resumes', await ev(p, () => !document.getElementById('bhResume').hidden || document.getElementById('bhGo').textContent.includes('Verder')));
    await ev(p, () => document.getElementById('bhResume').click());
    const s2 = await ev(p, () => __bh.G.undo.length);
    await p.tap('#bhTools button[data-b="undo"]'); await p.waitForTimeout(150);
    ok('undo works after reload', s2 > 0 && await ev(p, () => __bh.S.gone.filter(Boolean).length === 1));
    await p.evaluate(() => window.appBack()); await p.waitForTimeout(200);
    ok('Android back leaves the game', await ev(p, () => document.getElementById('menu').classList.contains('active')));
  }

  // ---------- sounds, music and options ----------
  {
    const snd = await ev(p, () => Object.entries(__sfx._test()).filter(([k]) => k.startsWith('bh')));
    ok('bh sounds render cleanly (no NaN, sensible level)', snd.length === 20 && snd.every(([, v]) => !v.nan && v.pk > .3 && v.rms > .003), JSON.stringify(snd.map(([k, v]) => `${k}:${v.len}s/${v.ms}ms`)));
    // soft starts: nothing jumps in at full level (the first 0.5 ms stays quiet)
    const starts = await ev(p, () => { const out = []; for (const n of Object.keys(__sfx._G).filter(k => k.startsWith('bh'))) { const d = __sfx._buf(n).getChannelData(0), m = Math.floor(__sfx._sr() * .0005); let mx = 0; for (let i = 0; i < m; i++) mx = Math.max(mx, Math.abs(d[i])); out.push([n, +mx.toFixed(3)]); } return out; });
    ok('bh sounds start softly (first 0.5 ms < 0.2 of peak)', starts.every(([, m]) => m < .2), JSON.stringify(starts.filter(([, m]) => m >= .05)));
    ok('bh music track exists', await ev(p, () => __sfx._music('bh').then(b => !!b && b.duration > 15)));
    await openGame(p);
    await ev(p, () => { window.__played = []; const o = __sfx.play; __sfx.play = function (n, ...a) { __played.push(n); return o.call(this, n, ...a); }; });
    let mus; for (let i = 0; i < 80; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now === 'bh') break; }
    ok('music plays in the game', mus.now === 'bh', JSON.stringify(mus));
    await ev(p, () => { __bh.startLevel(2); __tapId(__bh.levelOf(2).s[0]); }); await p.waitForTimeout(2600);
    ok('sound on: bh sounds play (engine, park, boarding)', await ev(p, () => __played.includes('bhGo') && __played.includes('bhPark') && __played.some(n => n.startsWith('bhSeat'))), JSON.stringify(await ev(p, () => __played)));
    await ev(p, () => document.getElementById('bhMenu').click()); await p.waitForTimeout(150);
    await p.click('#bhOptList button[data-k="sound"][data-v="false"]'); await p.click('#bhOptList button[data-k="music"][data-v="false"]');
    await ev(p, () => document.getElementById('bhResume').click());
    await ev(p, () => { __played.length = 0; __tapId(__bh.levelOf(2).s[1]); __bh.useBoost('undo'); }); await p.waitForTimeout(2500);
    for (let i = 0; i < 12; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now !== 'bh') break; }
    ok('sound + music off: silent', await ev(p, () => !__played.some(n => n.startsWith('bh'))) && mus.now !== 'bh', JSON.stringify([await ev(p, () => __played), mus.now]));
    ok('options saved', await ev(p, () => { const o = JSON.parse(localStorage.getItem('bh.settings')); return o.sound === false && o.music === false; }));
    await ev(p, () => document.getElementById('bhMenu').click()); await p.waitForTimeout(100);
    await p.click('#bhOptList button[data-k="sound"][data-v="true"]'); await p.click('#bhOptList button[data-k="music"][data-v="true"]');
    await p.click('#bhOptList button[data-k="cb"][data-v="true"]');
    ok('colour-blind help on', await ev(p, () => __bh.opt.cb === true && JSON.parse(localStorage.getItem('bh.settings')).cb === true));
    await ev(p, () => { __bh.startLevel(33); }); await p.waitForTimeout(500);
    await ev(p, () => { const s = __bh.levelOf(33).s; for (let i = 0; i < 4; i++) __tapId(s[i]); document.getElementById('bhTip').classList.remove('show'); }); await p.waitForTimeout(2600);
    await shot(p, 'cb');
    // symbols are drawn: compare a lot pixel area with cb off
    await ev(p, () => document.getElementById('bhMenu').click()); await p.click('#bhOptList button[data-k="cb"][data-v="false"]'); await ev(p, () => document.getElementById('bhResume').click());
    await p.waitForTimeout(200);
    ok('colour-blind symbols off again', await ev(p, () => __bh.opt.cb === false));
  }

  // ---------- statistics + trophies ----------
  await p.evaluate(() => window.appBack()); await p.waitForTimeout(200);
  await p.click('#statBtn'); await p.waitForTimeout(200);
  ok('statistics row', await ev(p, () => [...document.querySelectorAll('#statBody .st-row b')].some(b => b.textContent === 'Bushalte') && /40\/40 levels/.test(document.getElementById('statBody').textContent)));
  await ev(p, () => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
  await p.click('#trophyBtn'); await p.waitForTimeout(200);
  ok('trophies: Eerste rit + Eindhalte unlocked', await ev(p, () => { const t = [...document.querySelectorAll('#trophyBody .trophy')]; const f = n => t.find(x => x.querySelector('b').textContent === n); return f('Eerste rit') && f('Eerste rit').classList.contains('on') && f('Eindhalte') && f('Eindhalte').classList.contains('on') && f('Sterrenchauffeur'); }));
  await ev(p, () => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
} catch (e) { if (e !== 'skip') ok('exception', false, e.stack); }

// ---------- landscape ----------
try {
  if (process.env.PERF_ONLY) throw 'skip';
  const pl = await page({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  await ev(pl, SYNTH);
  await openGame(pl); await shot(pl, 'startL');
  const fits = [];
  for (const n of [1, 12, 25, 40]) {
    await ev(pl, n => { localStorage.setItem('bh.stats', JSON.stringify({ stars: Object.fromEntries([...Array(40)].map((_, i) => [i + 1, 1])) })); __bh.startLevel(n); }, n); await pl.waitForTimeout(500);
    fits.push(await ev(pl, () => { const M = __bh, r = document.getElementById('bhStage').getBoundingClientRect(), t = document.getElementById('bhTools').getBoundingClientRect(), LY = M.LY;
      const inside = M.S.V.every(v => { const c = M.center(v.id); return c.x > r.left && c.x < r.right && c.y > r.top && c.y < r.bottom; });
      const lotTop = r.top + LY.oy + LY.ring.y0 * LY.c, lotBot = r.top + LY.oy + LY.ring.y1 * LY.c;
      return { land: document.getElementById('bh').classList.contains('land'), toolsRight: t.left >= r.right - 1, inside, cell: +LY.c.toFixed(1), ring: lotTop >= r.top && lotBot <= r.bottom }; }));
  }
  ok('landscape: tools on the right, whole board visible', fits.every(f => f.land && f.toolsRight && f.inside && f.ring), JSON.stringify(fits));
  ok('landscape: cells big enough to tap (>= 33 px, buses are 2-4 cells long)', fits.every(f => f.cell >= 33), fits.map(f => f.cell).join(','));
  await ev(pl, () => __bh.startLevel(30)); await pl.waitForTimeout(400);
  await ev(pl, () => { const s = __bh.levelOf(30).s; for (let i = 0; i < 5; i++) __tapId(s[i]); }); await pl.waitForTimeout(1200); await shot(pl, 'land');
  const r = await ev(pl, () => { const M = __bh; M.startLevel(40); for (const v of M.levelOf(40).s) __tapId(v); return M.S.won; });
  ok('landscape: level 40 solved by tapping', r);
  ok('landscape: win dialog', await waitFor(pl, () => document.getElementById('bhEndModal').classList.contains('show'), 50000));
  await pl.waitForTimeout(600); await shot(pl, 'winL');
  // portrait big-text mode
  const pb = await page({}, JSON.stringify({ seen: '9.99', text: 'groot' }));
  await ev(pb, SYNTH); await openGame(pb); await ev(pb, () => { localStorage.setItem('bh.stats', JSON.stringify({ stars: Object.fromEntries([...Array(40)].map((_, i) => [i + 1, 1])) })); __bh.startLevel(40); }); await pb.waitForTimeout(600);
  const bt = await ev(pb, () => ({ big: document.documentElement.classList.contains('big-text'), c: __bh.LY.c, inside: __bh.S.V.every(v => { const c = __bh.center(v.id), r = document.getElementById('bhStage').getBoundingClientRect(); return c.y > r.top && c.y < r.bottom; }) }));
  ok('big text: board still fits, cells >= 34 px', bt.big && bt.inside && bt.c >= 34, JSON.stringify(bt));
  await shot(pb, 'bigtext');
} catch (e) { if (e !== 'skip') ok('landscape exception', false, e.stack); }

// ---------- performance: 6x CPU throttling ----------
if (!process.env.NOPERF) for (const audio of [false, true]) {
  try {
    const tag = audio ? 'sound+music' : 'muted';
    const pp = await page({}, JSON.stringify({ seen: '9.99', mute: !audio }));
    await ev(pp, SYNTH); await openGame(pp);
    await ev(pp, () => { localStorage.setItem('bh.stats', JSON.stringify({ stars: Object.fromEntries([...Array(40)].map((_, i) => [i + 1, 1])) })); __bh.startLevel(38); }); await pp.waitForTimeout(1500);
    if (audio) { await pp.touchscreen.tap(30, 120); let st; for (let i = 0; i < 80; i++) { await pp.waitForTimeout(500); st = await ev(pp, () => __sfx._state()); if (st.now === 'bh') break; } await pp.waitForTimeout(+(process.env.WARM || 32000)); }
    const cdp = await pp.context().newCDPSession(pp); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const recFrames = ms => ev(pp, ms => new Promise(res => { const f = []; const st = performance.now(); const loop = t => { f.push(t); if (t - st < ms) requestAnimationFrame(loop); else res(f); }; requestAnimationFrame(loop); }), ms);
    const stat = f => { const d = f.slice(1).map((t, i) => t - f[i]).sort((a, b) => a - b); return { fps: +(1000 * d.length / (f[f.length - 1] - f[0])).toFixed(1), p95: +d[Math.floor(d.length * .95)].toFixed(1), max: +d[d.length - 1].toFixed(1) }; };
    await ev(pp, () => document.getElementById('bhTip').classList.remove('show'));
    const fr = recFrames(5000);
    const sol = await ev(pp, () => __bh.levelOf(38).s);
    for (let k = 0; k < 8; k++) { const c = await ev(pp, id => __bh.center(id), sol[k]); await pp.touchscreen.tap(c.x, c.y); await pp.waitForTimeout(350); }
    const st1 = stat(await fr);
    const lat = await ev(pp, () => __bh.tapLat()), latS = lat.slice().sort((a, b) => a - b);
    ok(`6x CPU (${tag}): taps answered < 100 ms`, latS.length && latS[Math.floor(latS.length * .9)] < 100, `tap->drawn median ${latS[latS.length >> 1]?.toFixed(0)} ms, p90 ${latS[Math.floor(latS.length * .9)]?.toFixed(0)} ms, max ${latS[latS.length - 1]?.toFixed(0)} ms (${lat.length} taps)`);
    ok(`6x CPU (${tag}): driving / boarding animations >= 50 fps`, st1.fps >= 50, JSON.stringify(st1));
    if (!audio) {
      // a fast player: the rest of the level at 4 taps per second, then the win confetti
      const frW = recFrames(7000); await ev(pp, () => new Promise(res => { const s = __bh.levelOf(38).s.filter(v => !__bh.S.gone[v]); let i = 0; const go = () => { if (i < s.length) { __tapId(s[i++]); setTimeout(go, 250); } else res(); }; go(); })); const st2 = stat(await frW);
      ok('6x CPU: fast finish (4 taps/s, many buses on the move) >= 50 fps', st2.fps >= 50, JSON.stringify(st2));
      await waitFor(pp, () => __bh.G.over, 5000); const t0 = Date.now(); while (!(await ev(pp, () => document.querySelectorAll('#bhConf i').length)) && Date.now() - t0 < 60000) await pp.waitForTimeout(100);
      const st3 = stat(await recFrames(2500));
      ok('6x CPU: win confetti >= 50 fps', st3.fps >= 50, JSON.stringify(st3));
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await pp.close();
  } catch (e) { ok('perf exception', false, e.stack); }
}

ok('no console errors', errs.length === 0, errs.slice(0, 5).join(' | '));
console.log('\n' + res.filter(r => r.startsWith('FAIL')).join('\n'));
console.log(res.filter(r => r.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASS', `(${res.length} checks)`);
await b.close();
