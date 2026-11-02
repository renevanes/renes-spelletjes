import { existsSync } from 'node:fs';
// Zandrijk browser test on the real UI with real touch input (Playwright + CDP touch events).
//   node games/zr1.mjs [path-to-index.html]      (default build/work/zrtest/index.html, or APP_HTML)
//   PART = all | main | portrait | save | camp | sound | perf   (comma separated)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'zrtest', 'index.html'));
const PARTS = (process.env.PART || 'all').split(','), want = p => PARTS.includes('all') || PARTS.includes(p);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(cond); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra !== '' ? ' ' + extra : ''}`); };
const LAND = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PORT = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
async function page(o = LAND, cfg = '{"seen":"9.99","mute":true}') {
  const ctx = await b.newContext(o), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(c => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', c); sessionStorage.setItem('init', 1); } }, cfg);
  await p.goto(target); await p.waitForTimeout(500);
  p.cdp = await ctx.newCDPSession(p); p.tp = new Map(); p.ctx = ctx;
  return p;
}
const ev = (p, f, a) => p.evaluate(f, a), wait = (p, ms) => p.waitForTimeout(ms);
const vis = (p, id) => ev(p, id => document.getElementById(id).classList.contains('show'), id);
async function touch(p, type, id, x, y) {
  if (type === 'end') p.tp.delete(id); else p.tp.set(id, { x, y, id });
  const pts = [...p.tp.values()].map(t => ({ x: t.x, y: t.y, id: t.id, radiusX: 4, radiusY: 4, force: 1 }));
  await p.cdp.send('Input.dispatchTouchEvent', { type: type === 'start' ? 'touchStart' : type === 'move' ? 'touchMove' : 'touchEnd', touchPoints: pts });
}
const tap = async (p, x, y) => { await touch(p, 'start', 1, x, y); await wait(p, 40); await touch(p, 'end', 1); await wait(p, 60); };
const tapEl = async (p, sel) => { const r = await ev(p, s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width }; }, sel); if (!r || !r.w) return false; await tap(p, r.x, r.y); return true; };
const unitXY = (p, id) => ev(p, id => { const u = __zr.S.E[id]; return u ? __zr.toClient(u.x, u.y) : null; }, id);
async function openGame(p) { await ev(p, () => document.querySelector('#tileZr').scrollIntoView({ block: 'center' })); await tapEl(p, '#tileZr'); await wait(p, 1200); }
const finite = p => ev(p, () => __zr.finite());

/* ================= main flow (landscape) ================= */
if (want('main')) {
  const p = await page();
  await openGame(p);
  ok('spel opent met het startscherm', await vis(p, 'zrStartModal') && await ev(p, () => __zr.cur() === 'zr'));
  ok('menulus staat stil in het startscherm', !(await ev(p, () => __zr.running())));
  await tapEl(p, '[data-m="skirm"]'); await wait(p, 300);
  ok('vrij spel: keuzescherm', await vis(p, 'zrSkirmModal'));
  await tapEl(p, '#zrFCards [data-f="1"]'); await wait(p, 150); await tapEl(p, '#zrSkOpts [data-k="kr"][data-v="false"]'); await wait(p, 150);
  await tapEl(p, '#zrSkGo'); await wait(p, 1500);
  ok('potje gestart als Stormclan', await ev(p, () => __zr.G.view === 'play' && __zr.S.P[0].fac === 1));
  ok('spellus draait', await ev(p, () => __zr.running()));
  // select a unit with a real tap
  const sol = await ev(p, () => __zr.S.U.find(u => u.o === 0 && u.t === 'sol').id);
  let pt = await unitXY(p, sol); await tap(p, pt.x, pt.y); await wait(p, 120);
  ok('tik op eenheid selecteert hem', (await ev(p, () => __zr.sel())).includes(sol));
  const verk = await ev(p, () => __zr.S.U.find(u => u.o === 0 && u.t === 'verk').id);
  pt = await unitXY(p, verk); await tap(p, pt.x, pt.y); await wait(p, 120);
  ok('tik op tweede eenheid voegt hem toe', (await ev(p, () => __zr.sel())).length === 2);
  // move: tap the ground
  const before = await ev(p, id => { const u = __zr.S.E[id]; return { x: u.x, y: u.y }; }, sol);
  const gx = await ev(p, () => { const r = document.getElementById('zrCv').getBoundingClientRect(); return { x: r.left + r.width * .3, y: r.top + r.height * .7 }; });
  await tap(p, gx.x, gx.y); await wait(p, 2500);
  const after = await ev(p, id => { const u = __zr.S.E[id]; return { x: u.x, y: u.y, st: u.st }; }, sol);
  ok('tik op de grond: eenheden rijden', Math.hypot(after.x - before.x, after.y - before.y) > .8, JSON.stringify(after));
  // attack: an enemy appears next to us; tap it
  const foe = await ev(p, id => { const S = __zr.S, u = S.E[id], q = __zr.Core.freeNear(S, u.x + 3, u.y, 5); const f = __zr.Core.addUnit(S, 1, 'lt', q.x, q.y, 0); f.st = 'hold'; S.exp.fill(1); __zr.Core.step(S); return f.id; }, sol);
  await wait(p, 300); pt = await unitXY(p, foe); await tap(p, pt.x, pt.y); await wait(p, 200);
  ok('tik op vijand: aanvallen', await ev(p, ([a, f]) => __zr.S.E[a].tg === f, [sol, foe]));
  await wait(p, 4000);
  ok('vijand krijgt schade', await ev(p, f => { const e = __zr.S.E[f]; return !e || e.hp < __zr.UT.lt.hp; }, foe));
  // stop button
  await ev(p, f => { const e = __zr.S.E[f]; if (e) e.hp = 1; }, foe); await wait(p, 600);
  await tapEl(p, '#zrStop'); await wait(p, 200);
  ok('stop-knop', await ev(p, id => { const u = __zr.S.E[id]; return !u || (u.st === 'idle' && !u.tg); }, sol));
  // deselect, then build a power plant through the build bar and place it with the ghost
  await tapEl(p, '#zrDesel'); await wait(p, 100);
  await tapEl(p, '#zrTabs [data-tab="b"]'); await wait(p, 200);
  await tapEl(p, '#zrBuild [data-t="cent"]'); await wait(p, 300);
  ok('bouwen: centrale in productie', await ev(p, () => __zr.S.P[0].q.b.length === 1 && __zr.S.P[0].q.b[0].t === 'cent'));
  await ev(p, () => { window.__zrSpeed = 8; }); for (let i = 0; i < 40 && !(await ev(p, () => __zr.S.P[0].ready)); i++) await wait(p, 200); await ev(p, () => { window.__zrSpeed = 0; });
  ok('centrale klaar ("Plaats!")', await ev(p, () => __zr.S.P[0].ready === 'cent' && document.querySelector('#zrBuild [data-t="cent"]').classList.contains('ready')));
  await tapEl(p, '#zrBuild [data-t="cent"]'); await wait(p, 300);
  ok('spook van het gebouw zichtbaar', await ev(p, () => !!__zr.G.placing && document.getElementById('zr').classList.contains('placing')));
  // tap a bad spot (sand far away): red, confirming fails
  const bad = await ev(p, () => { const S = __zr.S; for (let y = 2; y < S.H - 2; y++) for (let x = 2; x < S.W - 2; x++) if (S.ter[y * S.W + x] === 0 && S.exp[y * S.W + x]) return { x: x + 1, y: y + 1 }; return null; });
  if (bad) { await ev(p, w => { __zr.R.center(w.x, w.y); }, bad); await wait(p, 100); const c = await ev(p, w => __zr.toClient(w.x, w.y), bad); await tap(p, c.x, c.y); await wait(p, 150);
    ok('spook rood op zand', await ev(p, () => document.getElementById('zrPlaceOk').classList.contains('no'))); await tapEl(p, '#zrPlaceOk'); await wait(p, 150); ok('plaatsen op zand lukt niet', await ev(p, () => !!__zr.G.placing)); }
  const spot = await ev(p, () => { const S = __zr.S, b = S.B.find(b => b.o === 0); return __zr.Core.findSpot(S, 0, 'cent', b.x + 1, b.y + 1, false); });
  await ev(p, s => __zr.R.center(s.x + 1, s.y + 1), spot); await wait(p, 100);
  const sc = await ev(p, s => __zr.toClient(s.x + 1, s.y + 1), spot); await tap(p, sc.x, sc.y); await wait(p, 150);
  ok('spook groen op rots', await ev(p, () => !document.getElementById('zrPlaceOk').classList.contains('no')));
  // drag the ghost one tile and back
  await touch(p, 'start', 2, sc.x, sc.y); await touch(p, 'move', 2, sc.x + 30, sc.y); await touch(p, 'move', 2, sc.x, sc.y); await touch(p, 'end', 2); await wait(p, 100);
  ok('spook laat zich slepen', await ev(p, () => !!__zr.G.placing)); await tap(p, sc.x, sc.y); await wait(p, 150);
  await tapEl(p, '#zrPlaceOk'); await wait(p, 400);
  ok('centrale geplaatst', await ev(p, () => __zr.S.B.filter(b => b.o === 0 && b.t === 'cent').length === 1 && !__zr.G.placing), JSON.stringify(await ev(p, s => ({ g: __zr.G.ghost, spot: s, pl: __zr.G.placing, ok: __zr.G.placing && __zr.Core.placeTiles(__zr.S, 0, 'cent', __zr.G.ghost.x, __zr.G.ghost.y), n: __zr.S.B.filter(b => b.t === 'cent').length }), spot)));
  // barracks and a soldier from the infantry tab (a little help with the money and the time)
  await ev(p, () => { const S = __zr.S, P = S.P[0], b = S.B.find(b => b.o === 0 && b.t === 'bouw'); P.cry = 9000; P.ready = 'kaz'; const s = __zr.Core.findSpot(S, 0, 'kaz', b.x + 1, b.y + 1, false); __zr.cmd({ c: 'place', x: s.x, y: s.y }); P.ready = 'raff'; const s2 = __zr.Core.findSpot(S, 0, 'raff', b.x + 1, b.y + 1, false); __zr.cmd({ c: 'place', x: s2.x, y: s2.y }); });
  await tapEl(p, '#zrTabs [data-tab="i"]'); await wait(p, 300);
  const n0 = await ev(p, () => __zr.S.U.filter(u => u.o === 0 && u.t === 'sol').length);
  await tapEl(p, '#zrBuild [data-t="sol"]'); await tapEl(p, '#zrBuild [data-t="sol"]'); await wait(p, 200);
  ok('twee soldaten in de wachtrij (badge)', await ev(p, () => __zr.S.P[0].q.i.length === 2));
  await ev(p, () => { window.__zrSpeed = 6; }); await wait(p, 2600); await ev(p, () => { window.__zrSpeed = 0; });
  ok('soldaten getraind', await ev(p, n => __zr.S.U.filter(u => u.o === 0 && u.t === 'sol').length >= n + 2, n0));
  // long press on a build button cancels
  await tapEl(p, '#zrBuild [data-t="sol"]'); const lp = await ev(p, () => { const q = document.querySelector('#zrBuild [data-t="sol"]').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await touch(p, 'start', 3, lp.x, lp.y); await wait(p, 750); await touch(p, 'end', 3); await wait(p, 200);
  ok('lang drukken annuleert', await ev(p, () => __zr.S.P[0].q.i.length === 0));
  // double tap: all soldiers in view
  const sols = await ev(p, () => __zr.S.U.filter(u => u.o === 0 && u.t === 'sol').map(u => u.id));
  await ev(p, id => { const u = __zr.S.E[id]; __zr.R.cam.z = 30; __zr.R.center(u.x, u.y); }, sols[0]); await wait(p, 150);
  pt = await unitXY(p, sols[0]); await tap(p, pt.x, pt.y); await wait(p, 60); await tap(p, pt.x, pt.y); await wait(p, 200);
  const inView = await ev(p, () => { const v = __zr.R.view(); return __zr.S.U.filter(u => u.o === 0 && u.t === 'sol' && u.x >= v.x0 && u.x <= v.x1 && u.y >= v.y0 && u.y <= v.y1).length; });
  ok('dubbeltik kiest alle soldaten in beeld', (await ev(p, () => __zr.sel())).length === inView && inView >= 2, `${inView}`);
  // control group: hold "1" to save, deselect, tap "1" to select again
  const g1 = await ev(p, () => { const q = document.getElementById('zrGroup1').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await touch(p, 'start', 4, g1.x, g1.y); await wait(p, 750); await touch(p, 'end', 4); await wait(p, 200);
  const nSel = (await ev(p, () => __zr.sel())).length;
  await tapEl(p, '#zrDesel'); await wait(p, 100); ok('selectie leeg', (await ev(p, () => __zr.sel())).length === 0);
  await tapEl(p, '#zrGroup1'); await wait(p, 150);
  ok('groep 1 opslaan en terugroepen', (await ev(p, () => __zr.sel())).length === nSel && nSel > 0);
  // box select
  await ev(p, ids => { __zr.cmd({ c: 'stop', ids }); const us = ids.map(id => __zr.S.E[id]).filter(Boolean); __zr.R.cam.z = 30; __zr.R.center(us.reduce((a, u) => a + u.x, 0) / us.length, us.reduce((a, u) => a + u.y, 0) / us.length); }, sols); await wait(p, 300);
  await tapEl(p, '#zrDesel'); await tapEl(p, '#zrBox'); await wait(p, 100);
  const bx = await ev(p, ids => { const us = ids.map(id => __zr.S.E[id]).filter(Boolean); const xs = us.map(u => __zr.toClient(u.x, u.y)); return { x0: Math.min(...xs.map(q => q.x)) - 30, y0: Math.min(...xs.map(q => q.y)) - 30, x1: Math.max(...xs.map(q => q.x)) + 30, y1: Math.max(...xs.map(q => q.y)) + 30 }; }, sols);
  await touch(p, 'start', 5, bx.x0, bx.y0); for (let k = 1; k <= 5; k++) { await touch(p, 'move', 5, bx.x0 + (bx.x1 - bx.x0) * k / 5, bx.y0 + (bx.y1 - bx.y0) * k / 5); await wait(p, 20); } await touch(p, 'end', 5); await wait(p, 200);
  ok('kader selecteert eenheden', (await ev(p, () => __zr.sel())).length >= 2);
  // pinch zoom (two fingers) and two-finger pan
  const z0 = await ev(p, () => __zr.R.cam.z), c0 = await ev(p, () => ({ ...__zr.R.cam }));
  const cr = await ev(p, () => { const r = document.getElementById('zrCv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await touch(p, 'start', 6, cr.x - 40, cr.y); await touch(p, 'start', 7, cr.x + 40, cr.y);
  for (let k = 1; k <= 6; k++) { await touch(p, 'move', 6, cr.x - 40 - k * 15, cr.y); await touch(p, 'move', 7, cr.x + 40 + k * 15, cr.y); await wait(p, 20); }
  await touch(p, 'end', 6); await touch(p, 'end', 7); await wait(p, 200);
  const z1 = await ev(p, () => __zr.R.cam.z);
  ok('knijpen zoomt in', z1 > z0 * 1.4, `${z0.toFixed(1)} -> ${z1.toFixed(1)}`);
  await touch(p, 'start', 6, cr.x - 40, cr.y); await touch(p, 'start', 7, cr.x + 40, cr.y);
  for (let k = 1; k <= 6; k++) { await touch(p, 'move', 6, cr.x - 40 + k * 20, cr.y + k * 10); await touch(p, 'move', 7, cr.x + 40 + k * 20, cr.y + k * 10); await wait(p, 20); }
  await touch(p, 'end', 6); await touch(p, 'end', 7); await wait(p, 200);
  const c1 = await ev(p, () => ({ ...__zr.R.cam }));
  ok('twee vingers schuiven de kaart', Math.abs(c1.x - c0.x) + Math.abs(c1.y - c0.y) > .5);
  // one finger pan on empty ground
  await ev(p, () => { __zr.R.cam.z = 30; __zr.R.center(__zr.S.W / 2, __zr.S.H / 2); }); await wait(p, 100);
  const c2 = await ev(p, () => ({ ...__zr.R.cam }));
  await touch(p, 'start', 8, cr.x, cr.y); for (let k = 1; k <= 6; k++) { await touch(p, 'move', 8, cr.x - k * 25, cr.y - k * 10); await wait(p, 20); } await touch(p, 'end', 8); await wait(p, 200);
  const c3 = await ev(p, () => ({ ...__zr.R.cam }));
  ok('één vinger schuift de kaart (en geen tik)', c3.x > c2.x + 1 && c3.y > c2.y + .3, JSON.stringify([c2.x, c3.x]));
  // minimap: needs a radar
  ok('zonder radar geen kaartje', !(await ev(p, () => __zr.radarOn())));
  await ev(p, () => { const S = __zr.S, P = S.P[0], b = S.B.find(b => b.o === 0 && b.t === 'bouw'); P.cry = 9000; for (const t of ['cent', 'cent', 'radar']) { P.ready = t; const s = __zr.Core.findSpot(S, 0, t, b.x + 1, b.y + 1, false); __zr.cmd({ c: 'place', x: s.x, y: s.y }); } __zr.Core.recalc(S); });
  await wait(p, 600);
  ok('radar: kaartje aan', await ev(p, () => __zr.radarOn() && document.getElementById('zr').classList.contains('radar')));
  const mr = await ev(p, () => { const r = __zr.miniRect(); return { x: r.left + r.width * .85, y: r.top + r.height * .85 }; });
  const cb = await ev(p, () => ({ ...__zr.R.cam })); await tap(p, mr.x, mr.y); await wait(p, 300); const ca = await ev(p, () => ({ ...__zr.R.cam }));
  ok('tik op het kaartje verplaatst de camera', Math.hypot(ca.x - cb.x, ca.y - cb.y) > 3, `${cb.x.toFixed(1)},${cb.y.toFixed(1)} -> ${ca.x.toFixed(1)},${ca.y.toFixed(1)}`);
  // "alles aanvallen"
  await ev(p, () => { const S = __zr.S; S.exp.fill(1); }); await tapEl(p, '#zrAll'); await wait(p, 300);
  ok('alles aanvallen: het leger vertrekt', await ev(p, () => __zr.S.U.filter(u => u.o === 0 && __zr.UT[u.t].wt && u.st === 'amove').length >= 3));
  // a building: select, repair, rally point, sell (two taps)
  const kz = await ev(p, () => { const b = __zr.S.B.find(b => b.o === 0 && b.t === 'kaz'); b.hp = b.mhp * .5; __zr.R.center(b.x + 1, b.y + 1); return b.id; });
  await wait(p, 150); const kc = await ev(p, id => { const b = __zr.S.E[id]; return __zr.toClient(b.x + 1, b.y + 1); }, kz);
  await tapEl(p, '#zrDesel'); await tap(p, kc.x, kc.y); await wait(p, 200);
  ok('tik op eigen gebouw selecteert het', await ev(p, id => __zr.G.selB === id, kz));
  await tapEl(p, '#zrRep'); await wait(p, 200); ok('repareren aan', await ev(p, id => !!__zr.S.E[id].rep, kz));
  await tapEl(p, '#zrRally'); await tap(p, kc.x + 80, kc.y + 40); await wait(p, 200); ok('verzamelpunt gezet', await ev(p, id => !!__zr.S.E[id].rally, kz));
  const cy0 = await ev(p, () => __zr.S.P[0].cry);
  await tapEl(p, '#zrSell'); await wait(p, 100); ok('verkopen vraagt eerst "Zeker?"', await ev(p, id => !!__zr.S.E[id], kz));
  await tapEl(p, '#zrSell'); await wait(p, 300); ok('verkocht: gebouw weg, kristal erbij', await ev(p, ([id, c]) => !__zr.S.E[id] && __zr.S.P[0].cry > c, [kz, cy0]));
  // back button: pause, again: resume
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terugknop: pauze', await vis(p, 'zrPauseModal'));
  const t0 = await ev(p, () => __zr.S.t); await wait(p, 600);
  ok('pauze: tijd staat stil en de lus stopt', (await ev(p, () => __zr.S.t)) === t0 && !(await ev(p, () => __zr.running())));
  await ev(p, () => window.appBack()); await wait(p, 600);
  ok('terugknop in de pauze: verder spelen', !(await vis(p, 'zrPauseModal')) && await ev(p, () => __zr.running()));
  ok('alles eindig', await finite(p));
  // win: destroy the enemy
  await ev(p, () => { const S = __zr.S; for (const b of S.B) if (b.o === 1) { b.hp = 1; } for (const b of S.B.filter(b => b.o === 1)) __zr.Core.cmd(S, 1, { c: 'sell', b: b.id }); });
  for (let i = 0; i < 30 && !(await vis(p, 'zrEndModal')); i++) await wait(p, 200);
  ok('overwinning: eindscherm', await vis(p, 'zrEndModal') && (await ev(p, () => document.getElementById('zrEndTitle').textContent)) === 'Overwinning!');
  ok('statistiek: gewonnen telt', await ev(p, () => __zr.stats().wins === 1 && JSON.parse(localStorage.getItem('zr.stats')).wins === 1));
  ok('eindscherm: lus staat stil', !(await ev(p, () => __zr.running())));
  await ev(p, () => window.appBack()); await wait(p, 500);
  ok('terug vanaf eindscherm: startscherm', await vis(p, 'zrStartModal'));
  await ev(p, () => window.appBack()); await wait(p, 400);
  ok('terug vanaf startscherm: menu', await ev(p, () => __zr.cur() === 'menu'));
  await p.screenshot({ path: path.join(here, '..', 'build', 'gfx', 'zr_t_menu.png') });
  await p.ctx.close();
}

/* ================= save / resume after a reload ================= */
if (want('save')) {
  const p = await page();
  await openGame(p); await ev(p, () => __zr.startSkirmish({ fac: 2, opp: 2, diff: 0, size: 'klein', cry: 2500, seed: 4242 })); await wait(p, 400);
  await ev(p, () => { window.__zrSpeed = 6; }); await wait(p, 3000); await ev(p, () => { window.__zrSpeed = 0; });
  await ev(p, () => { const S = __zr.S; __zr.G.groups[1] = S.U.filter(u => u.o === 0).slice(0, 2).map(u => u.id); });
  await ev(p, () => __zr.openPause()); await wait(p, 300);
  const snap = await ev(p, () => { __zr.saveGame(); const S = __zr.S; return { t: S.t, n: S.U.length, b: S.B.length, cry: Math.floor(S.P[0].cry), fac: S.P[0].fac }; });
  await p.reload(); await wait(p, 800);
  ok('tegel heeft "Doorgaan"-badge', await ev(p, () => document.getElementById('tileZr').classList.contains('has-save')));
  await openGame(p); await wait(p, 300);
  ok('startscherm toont "Verder spelen"', await ev(p, () => !document.getElementById('zrContinue').hidden));
  await tapEl(p, '#zrContinue'); await wait(p, 800);
  const back = await ev(p, () => { const S = __zr.S; return { t: S.t, n: S.U.length, b: S.B.length, cry: Math.floor(S.P[0].cry), fac: S.P[0].fac, g: __zr.G.groups[1].length }; });
  ok('na herladen: zelfde potje terug', back.t === snap.t && back.n === snap.n && back.b === snap.b && back.fac === snap.fac && Math.abs(back.cry - snap.cry) <= 1, JSON.stringify([snap, back]));
  ok('na herladen: groepen bewaard', back.g === 2);
  ok('na herladen: pauze open', await vis(p, 'zrPauseModal'));
  await tapEl(p, '#zrPResume'); await wait(p, 1500);
  ok('na herladen: speelt verder', await ev(p, t => __zr.S.t > t, snap.t) && await finite(p));
  // leaving saves; the menu badge stays
  await ev(p, () => window.appBack()); await wait(p, 200); await tapEl(p, '#zrPQuit'); await wait(p, 300); await tapEl(p, '#zrStartBack'); await wait(p, 300);
  ok('weggaan: terug in het menu met badge', await ev(p, () => __zr.cur() === 'menu' && document.getElementById('tileZr').classList.contains('has-save')));
  await p.ctx.close();
}

/* ================= campaign ================= */
if (want('camp')) {
  const p = await page();
  await openGame(p); await tapEl(p, '[data-m="camp"]'); await wait(p, 300);
  ok('veldtocht: kaart met 9 missies', await vis(p, 'zrCampModal') && await ev(p, () => document.querySelectorAll('#zrNodes .zr-node').length === 9));
  ok('alleen de eerste missie per factie open', await ev(p, () => [...document.querySelectorAll('#zrNodes .zr-node')].map(n => n.classList.contains('lock') ? 1 : 0).join('') === '011011011'));
  await tapEl(p, '#zrNodes [data-i="1"]'); await wait(p, 200); ok('dichte missie opent niet', !(await vis(p, 'zrBriefModal')));
  await tapEl(p, '#zrNodes [data-i="0"]'); await wait(p, 300);
  ok('briefing met doelen', await vis(p, 'zrBriefModal') && await ev(p, () => document.querySelectorAll('#zrBriefObj div').length === 2));
  await tapEl(p, '#zrBriefGo'); await wait(p, 1500);
  ok('missie 1 gestart, doelen in beeld', await ev(p, () => __zr.G.view === 'play' && document.getElementById('zrObj').classList.contains('on')));
  // complete it quickly: a refinery and enough kristal
  await ev(p, () => { const S = __zr.S, P = S.P[0], b = S.B.find(b => b.t === 'bouw'); P.ready = 'raff'; const s = __zr.Core.findSpot(S, 0, 'raff', b.x + 1, b.y + 1, false); __zr.cmd({ c: 'place', x: s.x, y: s.y }); P.st.harv = 1600; });
  for (let i = 0; i < 40 && !(await vis(p, 'zrEndModal')); i++) await wait(p, 200);
  ok('missie gewonnen: eindscherm met sterren', await vis(p, 'zrEndModal') && await ev(p, () => document.querySelectorAll('#zrEndStars span.on').length >= 2));
  ok('volgende missie open', await ev(p, () => !!__zr.stats().camp[0] && !!document.getElementById('zrENext')));
  await p.screenshot({ path: path.join(here, '..', 'build', 'gfx', 'zr_t_win.png') });
  await tapEl(p, '#zrENext'); await wait(p, 1500);
  ok('volgende missie start', await ev(p, () => __zr.G.meta.mi === 1 && __zr.G.view === 'play'));
  await p.ctx.close();
}

/* ================= portrait ================= */
if (want('portrait')) {
  const p = await page(PORT);
  await openGame(p);
  ok('staand: startscherm', await vis(p, 'zrStartModal'));
  await ev(p, () => __zr.startMission(0)); await wait(p, 1500);
  const L = await ev(p, () => { const r = id => document.getElementById(id).getBoundingClientRect(); return { cv: r('zrCv'), side: r('zrSide'), mini: r('zrMiniBox'), W: innerWidth, H: innerHeight }; });
  ok('staand: bouwbalk onderaan, kaart erboven', L.side.top > L.H * .7 && L.cv.height > L.H * .6 && L.side.width >= L.W - 2, JSON.stringify({ side: L.side.top, cv: L.cv.height }));
  ok('staand: kaartje rechtsboven', L.mini.right > L.W - 20 && L.mini.top < 200);
  await tapEl(p, '#zrBuild [data-t="raff"]'); await wait(p, 200);
  ok('staand: bouwknop werkt', await ev(p, () => __zr.S.P[0].q.b.length === 1));
  const sol = await ev(p, () => __zr.S.U.find(u => u.o === 0 && u.t === 'sol').id), pt = await unitXY(p, sol); await tap(p, pt.x, pt.y); await wait(p, 100);
  ok('staand: tik selecteert', (await ev(p, () => __zr.sel())).includes(sol));
  await p.screenshot({ path: path.join(here, '..', 'build', 'gfx', 'zr_t_portrait.png') });
  // turn the phone
  await p.setViewportSize({ width: 915, height: 412 }); await wait(p, 500);
  const L2 = await ev(p, () => { const r = id => document.getElementById(id).getBoundingClientRect(); return { cv: r('zrCv'), side: r('zrSide') }; });
  ok('gedraaid naar liggend: zijbalk rechts', L2.side.left > 700 && L2.cv.width > 600);
  ok('na draaien alles eindig, geen fouten', await finite(p));
  await p.ctx.close();
}

/* ================= sound and music switches ================= */
if (want('sound')) {
  const p = await page(LAND, '{"seen":"9.99","mute":false}');
  await openGame(p);
  await ev(p, () => { window.__zrSnd = []; const s = window.__sfx, pl = s.play; s.play = (n, ...a) => { if (n.startsWith('zr')) __zrSnd.push(n); return pl.call(s, n, ...a); }; });
  await ev(p, () => __zr.startSkirmish({ fac: 0, opp: 1, diff: 1, size: 'klein', cry: 2500, seed: 9 })); await wait(p, 400);
  await tapEl(p, '#zrBuild [data-t="cent"]'); await wait(p, 300);
  ok('geluidseffecten aan: klik klinkt', await ev(p, () => __zrSnd.includes('zrClick')));
  for (let i = 0; i < 30 && !(await ev(p, () => window.__sfx._state().now === 'zr' || window.__sfx._state().busy === 'zr')); i++) await wait(p, 300);
  ok('muziek "zr" in het spel', await ev(p, () => window.__sfx._state().now === 'zr' || window.__sfx._state().busy === 'zr'), JSON.stringify(await ev(p, () => window.__sfx._state())));
  await ev(p, () => window.appBack()); await wait(p, 300);
  await tapEl(p, '#zrPOpts [data-k="sound"][data-v="false"]'); await wait(p, 100); await tapEl(p, '#zrPOpts [data-k="music"][data-v="false"]'); await wait(p, 1500);
  ok('instellingen bewaard', await ev(p, () => { const o = JSON.parse(localStorage.getItem('zr.settings')); return o.sound === false && o.music === false; }));
  ok('muziek uit', await ev(p, () => window.__sfx._state().now === null));
  await tapEl(p, '#zrPResume'); await ev(p, () => { __zrSnd.length = 0; }); await wait(p, 200);
  await tapEl(p, '#zrBuild [data-t="cent"]'); const sol = await ev(p, () => __zr.S.U.find(u => u.o === 0 && u.t === 'sol').id), pt = await unitXY(p, sol); await tap(p, pt.x, pt.y); await wait(p, 600);
  ok('geluidseffecten uit: stil', await ev(p, () => __zrSnd.length === 0), JSON.stringify(await ev(p, () => __zrSnd)));
  await p.ctx.close();
}

/* ================= performance: a big battle at 6x CPU throttling ================= */
if (want('perf')) {
  const p = await page({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await openGame(p); await ev(p, () => __zr.startSkirmish({ fac: 0, opp: 1, diff: 1, size: 'middel', cry: 2500, seed: 11, kr: false })); await wait(p, 600);
  await ev(p, () => {
    const S = __zr.S, C = __zr.Core, cx = Math.floor(S.W / 2), cy = Math.floor(S.H / 2), types = ['lt', 'zt', 'sol', 'raks', 'rw', 'verk']; S.exp.fill(1); S.P[1].A.next = 1e9;
    const spawn = (o, n) => { const ids = []; for (let k = 0; k < n; k++) { const q = C.freeNear(S, cx + (o ? 9 : -9) + (k % 6) * .8, cy - 5 + Math.floor(k / 6) % 10, 6); if (!q) continue; ids.push(C.addUnit(S, o, types[k % 6], q.x, q.y, o ? Math.PI : 0).id); } C.cmd(S, o, { c: 'amove', ids, x: cx + (o ? -8 : 8), y: cy }); };
    spawn(0, 60); spawn(1, 60); __zr.R.cam.z = 26; __zr.R.center(cx, cy);
    window.__keep = setInterval(() => { for (let o = 0; o < 2; o++) { const n = S.U.filter(u => u.o === o && u.t !== 'oog').length; if (n < 55) spawn(o, 60 - n); } }, 1500);
  });
  await wait(p, +(process.env.WARM || 30000));                   // warm-up: sound bank, sprites, quality settles
  await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await wait(p, 6000);
  const r = await ev(p, async () => { const t0 = performance.now(); let n = 0, worst = 0, last = t0;
    await new Promise(res => { const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 6000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const v = __zr.R.view(); return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), worst: Math.round(worst), q: __zr.quality(), units: __zr.S.U.length, inView: __zr.S.U.filter(u => u.x > v.x0 && u.x < v.x1 && u.y > v.y0 && u.y < v.y1).length, pj: __zr.S.PJ.length }; });
  await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok('fps bij 6× CPU-vertraging ≥ 50 (groot gevecht in beeld)', r.fps >= 50, JSON.stringify(r));
  await p.screenshot({ path: path.join(here, '..', 'build', 'gfx', 'zr_t_battle.png') });
  await ev(p, () => clearInterval(window.__keep));
  // the loop stops when paused
  await ev(p, () => __zr.openPause()); await wait(p, 600); ok('pauze: lus staat stil', !(await ev(p, () => __zr.running())));
  await p.ctx.close();
}
console.log('\nconsole/page errors:', errs.length ? errs.slice(0, 8).join('\n') : 'geen');
ok('geen consolefouten', errs.length === 0);
console.log(`\n${res.filter(Boolean).length} geslaagd, ${res.filter(r => !r).length} mislukt`);
await b.close();
process.exit(res.every(Boolean) ? 0 : 1);
