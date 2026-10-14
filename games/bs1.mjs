import { existsSync as require_exists } from 'node:fs';
// Bellenschieter test: node bs1.mjs [path-to-index.html]   (default: ../bstest/index.html)
// env: PART=main|bot|perf (default: all), LEVELS=1-60 (bot range)
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'bstest', 'index.html'));
const PART = process.env.PART || 'all';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
async function page(dev = 'Pixel 7', cfg = '{"seen":"9.99","mute":true}') {
  const ctx = await b.newContext({ ...devices[dev] }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(c => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', c); sessionStorage.setItem('init', 1); } }, cfg);
  await p.goto(target); await p.waitForTimeout(400); await p.evaluate(HELP); return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const vis = (p, id) => ev(p, id => document.getElementById(id).classList.contains('show'), id);
const openGame = async p => { await ev(p, () => document.querySelector('#tileBs').scrollIntoView({ block: 'center' })); await p.tap('#tileBs'); await p.waitForTimeout(450); };
// in-page helpers: shots go through the real pointer handlers on the stage
const HELP = () => {
  const st = () => document.getElementById('bsStage');
  window.__T = {
    pe(type, x, y, id = 9) { st().dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true })); },
    shoot(a) { const c = __bs.aimClient(a, 5); this.pe('pointerdown', c.x, c.y); this.pe('pointerup', c.x, c.y); },
    swap() { const c = __bs.launcherClient(); this.pe('pointerdown', c.x, c.y); this.pe('pointerup', c.x, c.y); },
    wait: ms => new Promise(r => setTimeout(r, ms)),
    async ready(max = 8000) { const t0 = performance.now(); while (performance.now() - t0 < max) { if (__bs.canShoot() || __bs.S.won || __bs.S.lost || __bs.G.over) return true; await this.wait(10); } return false; },
    async settle(max = 12000) { const t0 = performance.now(); while (performance.now() - t0 < max) { if (!__bs.busy() && !__bs.sched && !__bs.fx) return true; await this.wait(30); } return false; },
    angleTo(r, c) {                                   // the middle of the run of angles whose shot snaps into cell (r, c)
      const S = __bs.S, C = __bs.core, fire = S.cur.k === 'fire', A = 9 * Math.PI / 180, N = 3000; let run = null, best = null;
      for (let i = 0; i <= N; i++) { const a = A + (Math.PI - 2 * A) * i / N, tr = C.trace(S, a, fire), s = C.snap(S, tr.x, tr.y), hit = s && s[0] === r && s[1] === c;
        if (hit) { if (!run) run = [a, a]; else run[1] = a; } else if (run) { if (!best || run[1] - run[0] > best[1] - best[0]) best = run; run = null; } }
      if (run && (!best || run[1] - run[0] > best[1] - best[0])) best = run;
      return best ? (best[0] + best[1]) / 2 : null;
    },
    custom(L) { const LV = __bs.LV, keep = LV[0]; LV[0] = Object.assign({ id: 1, w: 0, name: 'test', goal: 'clear', pal: [0, 1, 2, 3], seed: 1, cl: 0, lim: 60, st: [10, 20] }, L); __bs.startLevel(1); LV[0] = keep; },
    check() { return { same: __bs.drawnKey() === __bs.logicKey(), floating: __bs.floating(), finite: __bs.finite() }; },
    fxPixels() { const c = document.getElementById('bsFx'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i]) n++; return n; },
  };
};
const ready = p => ev(p, () => __T.ready()), settle = p => ev(p, () => __T.settle());
async function scenario(p, name, L, setup, shoot, verify) {
  await ev(p, L => { __bs.dur = 1; __T.custom(L); }, L); await p.waitForTimeout(700); await ready(p);
  if (setup) await ev(p, setup);
  const a = await ev(p, shoot);
  if (a === null) { ok(name, false, 'no angle'); return; }
  await ev(p, a => __T.shoot(a), a); await p.waitForTimeout(60);
  const mid = await ev(p, () => ({ flight: __bs.flight, fx: __bs.fx }));
  await settle(p);
  const r = await ev(p, verify); const c = await ev(p, () => __T.check());
  ok(name, r.ok && c.same && !c.floating && c.finite && (mid.flight || mid.fx > 0), JSON.stringify({ ...r, ...c }));
}

let p;
if (PART === 'all' || PART === 'main') {
  p = await page();
  ok('menu tile + vector icon', await ev(p, () => !!document.querySelector('#tileBs') && (document.querySelector('#tileBs .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileBs h2').textContent === 'Bellenschieter'));
  await openGame(p);
  ok('tile opens the game with the start dialog', await ev(p, () => document.getElementById('bs').classList.contains('active')) && await vis(p, 'bsStartModal'));
  const lk = await ev(p, () => ({ n: document.querySelectorAll('#bsLevels button').length, open: [...document.querySelectorAll('#bsLevels button')].filter(b => !b.classList.contains('lock')).map(b => +b.dataset.n), worlds: document.querySelectorAll('.bs-world').length, endless: !!document.querySelector('#bsEndless') }));
  ok('fresh profile: 60 levels in 6 worlds, only level 1 unlocked, endless available', lk.n === 60 && lk.open.length === 1 && lk.open[0] === 1 && lk.worlds === 6 && lk.endless, JSON.stringify({ n: lk.n, open: lk.open }));
  ok('options: Richtlijn, Kleurenblind-hulp, Schermschudden, Geluidseffecten, Achtergrondmuziek', await ev(p, () => ['aim', 'cb', 'shake', 'sound', 'music'].every(k => document.querySelectorAll(`#bsOptList button[data-k="${k}"]`).length === 2) && /Geluidseffecten/.test(document.getElementById('bsOptList').textContent) && /Achtergrondmuziek/.test(document.getElementById('bsOptList').textContent)));
  await p.click('#bsLevels button[data-n="2"]', { force: true }); await p.waitForTimeout(150);
  ok('locked level does not start', await vis(p, 'bsStartModal') && await ev(p, () => __bs.G.preview));
  ok('preview shows level 1 behind the dialog, no input while it is open', await ev(p, () => __bs.G.id === 1 && !__bs.canShoot()));

  // ---------- level 1 with real touch: a drag aims (dotted line), release shoots ----------
  await p.click('#bsLevels button[data-n="1"]'); await p.waitForTimeout(900);
  ok('level 1 starts with its tip', await ev(p, () => __bs.G.id === 1 && !__bs.G.preview && document.getElementById('bsTip').classList.contains('show')));
  {
    const cdp = await p.context().newCDPSession(p);
    const a0 = await ev(p, () => __bs.aimClient(Math.PI / 2 + .5, 4)), a1 = await ev(p, () => __bs.aimClient(Math.PI / 2 - .25, 5));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a0.x, y: a0.y }] }); await p.waitForTimeout(120);
    const px0 = await ev(p, () => __T.fxPixels());
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a0.x + (a1.x - a0.x) * i / 6, y: a0.y + (a1.y - a0.y) * i / 6 }] }); await p.waitForTimeout(30); }
    await p.waitForTimeout(80);
    const s0 = await ev(p, () => __bs.S.shots), px1 = await ev(p, () => __T.fxPixels());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(60);
    const fired = await ev(p, () => ({ shots: __bs.S.shots, flight: __bs.flight }));
    ok('real touch drag shows the aim line and release shoots', px0 > 0 && px1 > 0 && s0 === 0 && fired.shots === 1, JSON.stringify({ px0, px1, ...fired }));
    await settle(p);
    // a plain touchscreen tap also aims and shoots at that point
    await ready(p); const c = await ev(p, () => __bs.aimClient(Math.PI / 2 + .1, 5)); await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(50);
    ok('touchscreen tap shoots', await ev(p, () => __bs.S.shots === 2)); await settle(p);
    // tapping the launcher swaps current and next
    const before = await ev(p, () => [__bs.S.cur.c, __bs.S.nxt.c]); const lc = await ev(p, () => __bs.launcherClient()); await p.touchscreen.tap(lc.x, lc.y); await p.waitForTimeout(300);
    const after = await ev(p, () => [__bs.S.cur.c, __bs.S.nxt.c, __bs.S.shots]);
    ok('tap on the launcher swaps current and next bubble', after[0] === before[1] && after[1] === before[0] && after[2] === 2, JSON.stringify({ before, after }));
    ok('drawn grid == logic grid, nothing floating, times finite', await ev(p, () => { const c = __T.check(); return c.same && !c.floating && c.finite; }));
  }
  // render loop stops when idle
  { await settle(p); await p.waitForTimeout(300); const f0 = await ev(p, () => __bs.frames().length); await p.waitForTimeout(1200); const f1 = await ev(p, () => __bs.frames().length); ok('render loop stops when nothing moves', f1 - f0 <= 1, `${f1 - f0} frames in 1.2 s idle`); }
  // shots only offer colours still on the board
  { const r = await ev(p, () => { const S = __bs.S, cols = new Set(); for (const row of S.g) for (const e of row) if (e && [0, 1, 6].includes(e.k)) cols.add(e.c); return { cur: S.cur.c, nxt: S.nxt.c, cols: [...cols] }; }); ok('current and next only use colours still on the board', r.cols.includes(r.cur) && r.cols.includes(r.nxt), JSON.stringify(r)); }

  // ---------- rules: snapping, popping 3+, falling, bouncing, specials ----------
  await scenario(p, 'shot snaps into the free cell it was aimed at', { rows: ['0.........1'] }, () => { __bs.S.cur = { k: 'n', c: 3 }; }, () => __T.angleTo(0, 5),
    () => ({ ok: !!__bs.S.g[0][5] && __bs.S.g[0][5].c === 3 && __bs.S.shots === 1 }));
  await scenario(p, '3 of one colour pop', { rows: ['00........1'] }, () => { __bs.S.cur = { k: 'n', c: 0 }; }, () => __T.angleTo(0, 2),
    () => ({ ok: !__bs.S.g[0][0] && !__bs.S.g[0][1] && !__bs.S.g[0][2] && !!__bs.S.g[0][10] && __bs.S.score > 0, score: __bs.S.score }));
  await scenario(p, 'two of a colour do not pop (stick)', { rows: ['0.........1'] }, () => { __bs.S.cur = { k: 'n', c: 0 }; }, () => __T.angleTo(0, 1),
    () => ({ ok: !!__bs.S.g[0][0] && !!__bs.S.g[0][1] && __bs.S.streak === 0 }));
  await scenario(p, 'bubbles that no longer hang on anything fall (bonus points)', { rows: ['00......111', '2.........'] }, () => { __bs.S.cur = { k: 'n', c: 0 }; }, () => __T.angleTo(0, 2),
    () => ({ ok: !__bs.S.g[1][0] && __bs.S.falls === 1 && __bs.S.score >= 30 + 25, falls: __bs.S.falls, score: __bs.S.score }));
  await scenario(p, 'wall bounce: the shot comes off the side wall and lands where traced', { rows: ['1.........1'] }, () => { __bs.S.cur = { k: 'n', c: 2 }; },
    () => { const a = 9 * Math.PI / 180 + .12, tr = __bs.core.trace(__bs.S, a, false); window.__exp = __bs.core.snap(__bs.S, tr.x, tr.y); window.__bn = tr.bounces.length; return a; },
    () => { const [r, c] = window.__exp; return { ok: window.__bn >= 1 && !!__bs.S.g[r][c] && __bs.S.g[r][c].c === 2, bounces: window.__bn, cell: window.__exp }; });
  await scenario(p, 'bomb in the grid explodes when hit and clears its surroundings', { rows: ['11111111111', '1111@11111'] }, () => { __bs.S.cur = { k: 'n', c: 2 }; window.__n0 = __bs.core.count(__bs.S); }, () => __T.angleTo(2, 4),
    () => ({ ok: __bs.S.g[1][4] === null && __bs.core.count(__bs.S) <= window.__n0 - 6, n: __bs.core.count(__bs.S), n0: window.__n0 }));
  await scenario(p, 'rainbow bubble joins any colour', { rows: ['0%........1'] }, () => { __bs.S.cur = { k: 'n', c: 0 }; }, () => __T.angleTo(0, 2),
    () => ({ ok: !__bs.S.g[0][0] && !__bs.S.g[0][1] && !__bs.S.g[0][2] }));
  await scenario(p, 'stone cracks after a pop next to it', { rows: ['#00.......1'] }, () => { __bs.S.cur = { k: 'n', c: 0 }; }, () => __T.angleTo(0, 3),
    () => ({ ok: !!__bs.S.g[0][0] && __bs.S.g[0][0].k === 4 && __bs.S.g[0][0].h === 1 }));
  await scenario(p, 'cracked stone breaks after the second pop', { rows: ['#00.......1'] }, () => { __bs.S.cur = { k: 'n', c: 0 }; __bs.S.g[0][0].h = 1; }, () => __T.angleTo(0, 3),
    () => ({ ok: !__bs.S.g[0][0] }));
  await scenario(p, 'ice thaws after a pop next to it', { rows: ['~00.......1'], pal: [3] }, () => { __bs.S.cur = { k: 'n', c: 0 }; window.__ic = __bs.S.g[0][0].k; }, () => __T.angleTo(0, 3),
    () => ({ ok: window.__ic === 5 && __bs.S.g[0][0] && __bs.S.g[0][0].k === 0 && __bs.S.g[0][0].c === 3 }));
  await scenario(p, 'colour changer switches colour after a shot', { rows: ['?.........1'], pal: [2, 4] }, () => { __bs.S.cur = { k: 'n', c: 1 }; window.__cc = __bs.S.g[0][0].c; }, () => __T.angleTo(0, 9),
    () => ({ ok: __bs.S.g[0][0].k === 6 && __bs.S.g[0][0].c !== window.__cc && [2, 4].includes(__bs.S.g[0][0].c) }));
  await scenario(p, 'star bubble is freed and the stars goal is reached', { rows: ['.*5.......1'], pal: [5], goal: 'stars' }, () => { __bs.S.cur = { k: 'n', c: 5 }; window.__st = __bs.S.starsTotal; }, () => __T.angleTo(0, 3),
    () => ({ ok: window.__st === 1 && __bs.S.stars === 1 && __bs.S.won }));
  await scenario(p, 'fire ball burns straight through', { rows: ['x'.repeat(11), 'x'.repeat(10), 'x'.repeat(11), 'x'.repeat(10)], pal: [0, 1, 2], cl: 0 }, () => { __bs.setFire(1); __bs.useBoost('fire'); window.__n0 = __bs.core.count(__bs.S); window.__k = __bs.S.cur.k; }, () => Math.PI / 2,
    () => ({ ok: window.__k === 'fire' && __bs.core.count(__bs.S) <= window.__n0 - 6 && __bs.S.cur.k === 'n', n: __bs.core.count(__bs.S), n0: window.__n0 }));
  await scenario(p, 'bomb booster explodes where it lands', { rows: ['x'.repeat(11), 'x'.repeat(10), 'x'.repeat(11)], pal: [0, 1, 2, 3], cl: 0 }, () => { window.__inv = __bs.stats().inv.bomb; __bs.useBoost('bomb'); window.__n0 = __bs.core.count(__bs.S); window.__k = __bs.S.cur.k; }, () => Math.PI / 2,
    () => ({ ok: window.__k === 'bomb' && __bs.core.count(__bs.S) <= window.__n0 - 6 && (__bs.stats().inv.bomb === window.__inv - 1 || window.__inv === 0) }));
  await scenario(p, 'rainbow booster matches the colour it lands next to', { rows: ['00........1'] }, () => { __bs.useBoost('rain'); window.__k = __bs.S.cur.k; }, () => __T.angleTo(0, 2),
    () => ({ ok: window.__k === 'rain' && !__bs.S.g[0][0] && !__bs.S.g[0][1] && !__bs.S.g[0][2] }));
  {                                                   // long aim booster + +5 shots
    await ev(p, () => { __T.custom({ rows: ['0.........1'], lim: 10 }); }); await p.waitForTimeout(600);
    const r = await ev(p, () => { const a = __bs.useBoost('aim'), l0 = __bs.S.lim + __bs.S.extra, b2 = __bs.useBoost('plus'); return { a, long: __bs.G.longAim, plus: __bs.S.lim + __bs.S.extra - l0, b2 }; });
    ok('boosters: long aim switches on, +5 adds five shots', r.a && r.long && r.plus === 5, JSON.stringify(r));
  }
  {                                                   // descending ceiling in a level
    await ev(p, () => { __bs.dur = .05; __T.custom({ rows: ['x'.repeat(11), 'x'.repeat(10)], pal: [0, 1, 2, 3, 4, 5], lim: 0, ceil: 3 }); });
    await p.waitForTimeout(300);
    for (let i = 0; i < 3; i++) { await ready(p); await ev(p, () => __T.shoot(Math.PI / 2 + .3)); await p.waitForTimeout(30); }
    await settle(p);
    const r = await ev(p, () => ({ drop: __bs.S.drop, ...__T.check() }));
    ok('ceiling level: the ceiling comes down a row every N shots', r.drop === 1 && r.same && !r.floating, JSON.stringify(r));
    await ev(p, () => { __bs.dur = 1; });
  }

  // ---------- endless: rows push after misses; game over at the line ----------
  {
    await ev(p, () => { __bs.seed = 31; __bs.startEndless(); }); await p.waitForTimeout(700); await ready(p);
    const missAngle = () => { const S = __bs.S, C = __bs.core; for (let i = 0; i < 400; i++) { const a = 9 * Math.PI / 180 + (Math.PI - .32) * ((i * 0.618) % 1), T = C.clone(S); const e = C.shoot(T, a); if (!e.removed.length) return a; } return Math.PI / 2; };
    const p0 = await ev(p, () => __bs.S.pushes);
    await ev(p, () => { __bs.S.missLeft = 1; }); const a = await ev(p, missAngle); await ev(p, a => __T.shoot(a), a);
    let mid = false; for (let i = 0; i < 160 && !mid; i++) { mid = await ev(p, () => !!document.getElementById('bsGrid').style.transform); await p.waitForTimeout(25); }
    await settle(p);
    const r = await ev(p, () => ({ pushes: __bs.S.pushes, missLeft: __bs.S.missLeft, missN: __bs.S.missN, ...__T.check(), tf: document.getElementById('bsGrid').style.transform }));
    ok('endless: a miss with no misses left pushes a new row (slides in)', r.pushes === p0 + 1 && r.missLeft === r.missN && mid && r.same && !r.tf, JSON.stringify(r));
    await ev(p, () => { __bs.dur = .1; });
    let n = 0; while (n++ < 40 && !(await ev(p, () => __bs.S.lost))) { await ready(p); await ev(p, () => { __bs.S.missLeft = 1; }); const a2 = await ev(p, missAngle); await ev(p, a => __T.shoot(a), a2); await p.waitForTimeout(40); }
    await ev(p, () => { __bs.dur = 1; });
    const lost = await ev(p, () => __bs.S.lost);
    const shown = await (async () => { for (let i = 0; i < 40; i++) { if (await vis(p, 'bsEndModal')) return true; await p.waitForTimeout(150); } return false; })();
    const st = await ev(p, () => ({ best: __bs.stats().endBest, score: __bs.S.score, games: __bs.stats().endGames, save: localStorage.getItem('bs.save') }));
    ok('endless: game over when bubbles cross the line, record saved, dialog shown', lost && shown && st.best === st.score && st.games === 1 && !st.save, JSON.stringify({ lost, shown, ...st, shots: n }));
    await p.click('#bsEndNext'); await p.waitForTimeout(400);
    ok('endless: Opnieuw starts a new game', await ev(p, () => __bs.G.mode === 'end' && !__bs.S.lost && __bs.S.shots === 0 && !document.getElementById('bsEndModal').classList.contains('show')));
  }

  // ---------- win flow, stars, unlocks ----------
  {
    await ev(p, () => { __bs.dur = .05; __bs.seed = 5; __bs.startLevel(1); }); await p.waitForTimeout(200);
    await ev(p, async () => { for (let i = 0; i < 40 && !__bs.S.won && !__bs.S.lost; i++) { await __T.ready(); const m = __bs.bot(); if (m.swap) __T.swap(); __T.shoot(m.ang); await __T.wait(20); } });
    let shown = false; for (let i = 0; i < 40 && !shown; i++) { shown = await vis(p, 'bsEndModal'); await p.waitForTimeout(100); }
    const r = await ev(p, () => ({ won: __bs.S.won, stars: __bs.stats().stars[1], on: document.querySelectorAll('#bsEndStars span.on').length, save: localStorage.getItem('bs.save') }));
    ok('level won by shooting: stars + coins stored, win dialog, save cleared', r.won && shown && r.stars >= 1 && r.on === r.stars && !r.save, JSON.stringify(r));
    await p.click('#bsEndNext'); await p.waitForTimeout(400);
    ok('Volgende starts level 2 (now unlocked)', await ev(p, () => __bs.G.id === 2 && !__bs.G.preview));
    await ev(p, () => { __bs.dur = 1; });
  }
  // ---------- lose by shots, +5 continue ----------
  {
    await ev(p, () => { __bs.dur = .05; __bs.seed = 6; __bs.startLevel(3); __bs.S.extra = 2 - __bs.S.lim; }); await p.waitForTimeout(200);
    for (let i = 0; i < 2; i++) { await ready(p); await ev(p, () => __T.shoot(Math.PI / 2 + .02)); await p.waitForTimeout(30); }
    let shown = false; for (let i = 0; i < 40 && !shown; i++) { shown = await vis(p, 'bsLoseEndModal'); await p.waitForTimeout(100); }
    ok('out of shots: lose dialog with +5 option', shown && await ev(p, () => __bs.S.lost && __bs.S.why === 'shots' && !document.getElementById('bsLosePlus').hidden));
    await p.click('#bsLosePlus'); await p.waitForTimeout(300);
    ok('+5 schoten continues the level', await ev(p, () => !__bs.S.lost && !__bs.G.over && __bs.S.lim + __bs.S.extra - __bs.S.shots === 5 && __bs.canShoot()));
    await ev(p, () => { __bs.dur = 1; });
  }

  // ---------- save / resume after a reload, with the tile badge ----------
  {
    await ev(p, () => { __bs.seed = 8; __bs.startLevel(2); }); await p.waitForTimeout(700);
    for (let i = 0; i < 2; i++) { await ready(p); await ev(p, () => { const m = __bs.bot(); __T.shoot(m.ang); }); await p.waitForTimeout(100); }
    await settle(p);
    const k0 = await ev(p, () => ({ key: __bs.logicKey(), shots: __bs.S.shots, score: __bs.S.score, cur: __bs.S.cur.c }));
    await p.reload(); await p.waitForTimeout(500); await ev(p, HELP);
    ok('menu tile shows the resume badge', await ev(p, () => document.getElementById('tileBs').classList.contains('has-save')));
    await openGame(p); await p.waitForTimeout(400);
    const k1 = await ev(p, () => ({ key: __bs.logicKey(), shots: __bs.S.shots, score: __bs.S.score, cur: __bs.S.cur.c, start: document.getElementById('bsStartModal').classList.contains('show'), ...__T.check() }));
    ok('reload resumes the same level state, drawn from the logic', k1.key === k0.key && k1.shots === k0.shots && k1.score === k0.score && k1.cur === k0.cur && !k1.start && k1.same, JSON.stringify({ s0: k0.shots, s1: k1.shots, same: k1.same }));
    await ready(p); await ev(p, () => { const m = __bs.bot(); __T.shoot(m.ang); }); await p.waitForTimeout(80);
    ok('resumed game accepts a shot', await ev(p, () => __bs.S.shots === 3));
    await settle(p);
    // pause: menu dialog blocks input; Verder resumes
    await p.click('#bsMenu'); await p.waitForTimeout(250);
    const s0 = await ev(p, () => __bs.S.shots); await ev(p, () => __T.shoot(Math.PI / 2)); await p.waitForTimeout(250);
    ok('menu dialog pauses: no shots while it is open', await ev(p, s0 => __bs.S.shots === s0 && !__bs.canShoot(), s0) && await vis(p, 'bsStartModal'));
    await p.click('#bsResume'); await p.waitForTimeout(250); await ready(p); await ev(p, () => __T.shoot(Math.PI / 2 + .2)); await p.waitForTimeout(80);
    ok('Verder resumes and shooting works again', await ev(p, s0 => __bs.S.shots === s0 + 1, s0));
    await settle(p);
    // back button leaves (saves), coming back resumes
    await ev(p, () => window.appBack()); await p.waitForTimeout(300);
    ok('back leaves to the menu and keeps the save', await ev(p, () => document.getElementById('menu').classList.contains('active') && !!localStorage.getItem('bs.save')));
  }

  // ---------- options ----------
  {
    await openGame(p); await p.click('#bsMenu'); await p.waitForTimeout(200);
    await p.click('#bsOptList button[data-k="aim"][data-v="false"]'); await p.click('#bsResume'); await p.waitForTimeout(300); await settle(p);
    const c = await ev(p, () => __bs.aimClient(Math.PI / 2, 4)); await ev(p, c => __T.pe('pointerdown', c.x, c.y), c); await p.waitForTimeout(150);
    const off = await ev(p, () => __T.fxPixels()); await ev(p, c => __T.pe('pointercancel', c.x, c.y), c); await p.waitForTimeout(100);
    await ev(p, () => { __bs.opt.aim = true; }); await ev(p, c => __T.pe('pointerdown', c.x, c.y), c); await p.waitForTimeout(150);
    const on = await ev(p, () => __T.fxPixels()); await ev(p, c => __T.pe('pointercancel', c.x, c.y), c); await p.waitForTimeout(150);
    ok('option Richtlijn: no aim dots when off, dots when on', off === 0 && on > 0, JSON.stringify({ off, on }));
    await p.click('#bsMenu'); await p.waitForTimeout(200);
    const g0 = await ev(p, () => document.getElementById('bsGrid').toDataURL().length);
    await p.click('#bsOptList button[data-k="cb"][data-v="true"]'); await p.waitForTimeout(150);
    const g1 = await ev(p, () => document.getElementById('bsGrid').toDataURL().length);
    ok('option Kleurenblind-hulp redraws the bubbles with symbols', g0 !== g1 && await ev(p, () => JSON.parse(localStorage.getItem('bs.settings')).cb === true));
    await p.click('#bsOptList button[data-k="cb"][data-v="false"]'); await p.click('#bsResume'); await p.waitForTimeout(200);
  }
  await p.close();
  // sound and music: a real (unmuted) profile; sound off -> no bs sounds; music off -> no bs track
  {
    p = await page('Pixel 7', '{"seen":"9.99"}');
    await ev(p, () => { window.__played = []; const o = window.__sfx.play; window.__sfx.play = function (n, ...a) { if (/^bs/.test(n)) window.__played.push(n); return o.call(this, n, ...a); }; });
    await openGame(p); await p.click('#bsLevels button[data-n="1"]'); await p.waitForTimeout(600); await ready(p);
    await ev(p, () => { const m = __bs.bot(); __T.shoot(m.ang); }); await settle(p);
    const on = await ev(p, () => window.__played.slice());
    let mus = null; for (let i = 0; i < 60 && mus !== 'bs'; i++) { mus = await ev(p, () => window.__sfx._state().now); await p.waitForTimeout(500); }
    ok('sound effects play (shoot/pop) and the music track runs', on.includes('bsShoot') && mus === 'bs', JSON.stringify({ on: on.slice(0, 8), mus }));
    await p.click('#bsMenu'); await p.waitForTimeout(150);
    await p.click('#bsOptList button[data-k="sound"][data-v="false"]'); await p.click('#bsOptList button[data-k="music"][data-v="false"]'); await p.click('#bsResume'); await p.waitForTimeout(400);
    await ev(p, () => { window.__played = []; }); await ready(p); await ev(p, () => { const m = __bs.bot(); __T.shoot(m.ang); }); await settle(p);
    for (let i = 0; i < 10; i++) { if (!(await ev(p, () => window.__sfx._state().now))) break; await p.waitForTimeout(300); }
    const off = await ev(p, () => ({ n: window.__played.length, mus: window.__sfx._state().now }));
    ok('sound off: silent; music off: track stops', off.n === 0 && !off.mus, JSON.stringify(off));
    await p.close();
  }
  // landscape + big text
  {
    p = await page('Pixel 7 landscape');
    await openGame(p); await p.click('#bsLevels button[data-n="1"]'); await p.waitForTimeout(800);
    const r = await ev(p, () => { const s = document.getElementById('bsStage').getBoundingClientRect(), f = document.getElementById('bsField').getBoundingClientRect(), t = document.getElementById('bsTools').getBoundingClientRect(); return { land: document.getElementById('bs').classList.contains('land'), fin: f.left >= s.left - 1 && f.right <= s.right + 1 && f.top >= s.top - 1 && f.bottom <= s.bottom + 1, fh: f.height, tw: t.width, sw: document.documentElement.scrollWidth <= innerWidth + 1 }; });
    await ready(p); await ev(p, () => { const m = __bs.bot(); __T.shoot(m.ang); }); await settle(p);
    ok('landscape: field fits, tools on the side, shooting works', r.land && r.fin && r.fh > 300 && r.tw < 120 && r.sw && await ev(p, () => __bs.S.shots === 1 && __T.check().same), JSON.stringify(r));
    await p.close();
    p = await page('Pixel 7', '{"seen":"9.99","mute":true,"text":"groot"}');
    await openGame(p); await p.click('#bsLevels button[data-n="1"]'); await p.waitForTimeout(700);
    ok('big-text mode: HUD and field still fit', await ev(p, () => { const s = document.getElementById('bsStage').getBoundingClientRect(), f = document.getElementById('bsField').getBoundingClientRect(), h = document.getElementById('bsHud').getBoundingClientRect(); return f.bottom <= s.bottom + 1 && h.bottom <= f.top + 2 && document.documentElement.scrollWidth <= innerWidth + 1; }));
    await p.close();
  }
}

// ---------- a bot plays every level through the real shooting path and must win within the shot limit ----------
if (PART === 'all' || PART === 'bot') {
  p = await page();
  await openGame(p); await ev(p, () => { const st = __bs.stats(); for (let i = 1; i <= 60; i++) st.stars[i] = st.stars[i] || 1; __bs.dur = .02; });
  const [lo, hi] = (process.env.LEVELS || '1-60').split('-').map(Number);
  const fails = [], rows = [];
  const t0 = Date.now();
  for (let lv = lo; lv <= hi; lv++) {
    let r = null;
    for (let attempt = 0; attempt < 3 && !(r && r.won); attempt++) {
      r = await ev(p, async ({ lv, seed }) => {
        __bs.seed = seed; __bs.startLevel(lv); const L = __bs.LV[lv - 1]; let issues = 0;
        await __T.ready();
        for (let i = 0; i < 300 && !__bs.S.won && !__bs.S.lost; i++) {
          if (!(await __T.ready())) { issues++; break; }
          const s0 = __bs.S.shots, m = __bs.bot(); if (m.swap) __T.swap(); __T.shoot(m.ang);
          if (__bs.S.shots !== s0 + 1) { issues++; await __T.wait(30); }
        }
        await __T.settle(4000);
        const c = __T.check();
        return { lv, seed, won: __bs.S.won, lost: __bs.S.lost, shots: __bs.S.shots, lim: L.lim, ceil: L.ceil || 0, extra: __bs.S.extra, boosts: __bs.G.boosts, issues, same: c.same, floating: c.floating };
      }, { lv, seed: 4242 + lv * 31 + attempt * 977 });
      if (!r.won) console.log('  retry', JSON.stringify(r));
    }
    rows.push(r);
    if (!(r.won && !r.extra && !r.boosts && (!r.lim || r.shots <= r.lim) && !r.issues && r.same && !r.floating)) fails.push(r);
  }
  console.log('levels:', rows.map(r => `${r.lv}:${r.shots}/${r.lim || 'c' + r.ceil}`).join(' '));
  ok(`bot wins every level ${lo}-${hi} within its shot limit through the real input (no boosters)`, !fails.length, fails.length ? JSON.stringify(fails) : `${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await p.close();
}

// ---------- performance: 6x CPU throttle, after warm-up, while aiming, shooting and popping ----------
if (PART === 'all' || PART === 'perf') {
  p = await page();
  await openGame(p); await ev(p, () => { const st = __bs.stats(); for (let i = 1; i <= 60; i++) st.stars[i] = 1; __bs.seed = 3; __bs.startLevel(28); });
  await p.waitForTimeout(2500);
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const out = await ev(p, async () => {
    const W = __T.wait, ivs = [], lat = [];
    let last = 0, on = false; const tick = t => { if (on && last) ivs.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
    for (let k = 0; k < 8 && !__bs.S.won && !__bs.S.lost; k++) {
      await __T.ready();
      const m = __bs.bot(); if (m.swap) { __T.swap(); await W(250); }
      on = true; last = 0; requestAnimationFrame(tick);
      const a0 = __bs.aimClient(m.ang + .4, 4), a1 = __bs.aimClient(m.ang, 5);
      __T.pe('pointerdown', a0.x, a0.y);
      for (let i = 1; i <= 12; i++) { await new Promise(r => requestAnimationFrame(r)); __T.pe('pointermove', a0.x + (a1.x - a0.x) * i / 12, a0.y + (a1.y - a0.y) * i / 12); }
      const t0 = performance.now(); __T.pe('pointerup', a1.x, a1.y);
      await new Promise(r => requestAnimationFrame(() => r())); lat.push(performance.now() - t0);
      await W(1300); on = false;
    }
    ivs.sort((a, b) => a - b);
    const mean = ivs.reduce((a, b) => a + b, 0) / ivs.length;
    return { n: ivs.length, fps: 1000 / mean, p95: ivs[Math.floor(ivs.length * .95)], max: ivs[ivs.length - 1], lat: Math.max(...lat), tapLat: Math.max(...__bs.tapLat()) };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok('performance at 6x CPU throttle: >= 50 fps while aiming/shooting/popping, input < 100 ms', out.fps >= 50 && out.lat < 100, JSON.stringify({ fps: +out.fps.toFixed(1), p95: +out.p95.toFixed(1), max: +out.max.toFixed(1), frames: out.n, shotToFrameMs: +out.lat.toFixed(1), tapLatMs: +out.tapLat.toFixed(1) }));
  await p.close();
}

ok('no console errors', !errs.length, errs.slice(0, 5).join(' | '));
console.log(`\n${res.filter(r => r.startsWith('PASS')).length} passed, ${res.filter(r => r.startsWith('FAIL')).length} failed`);
await b.close();
