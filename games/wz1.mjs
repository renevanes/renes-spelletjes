import { existsSync, writeFileSync } from 'node:fs';
// Woordzoeker browser test on the real UI with real touch input (Playwright + CDP touch events).
//   node games/wz1.mjs [path-to-index.html]      (default build/work/wztest/index.html, or APP_HTML)
//   PART = all | solve | hint | save | land | big | back | perf   (comma separated)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'wztest', 'index.html'));
const PARTS = (process.env.PART || 'all').split(','), want = p => PARTS.includes('all') || PARTS.includes(p);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(!!cond); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra !== '' ? ' ' + extra : ''}`); };
const PORT = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const LAND = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
async function page(o = PORT, cfg = '{"seen":"9.99","mute":true}') {
  const ctx = await b.newContext(o), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(c => { if (!localStorage.getItem('wz.test.init')) { localStorage.clear(); localStorage.setItem('app.cfg', c); localStorage.setItem('wz.test.init', '1'); } }, cfg);
  await p.goto(target); await ready(p);
  p.cdp = await ctx.newCDPSession(p); p.tp = new Map(); p.ctx = ctx;
  return p;
}
const ev = (p, f, a) => p.evaluate(f, a), wait = (p, ms) => p.waitForTimeout(ms);
// before a reload: Chromium hands localStorage writes to the browser process a moment later; a quick reload can lose them
const reload = async p => {
  // wait until another page of the same origin sees the latest save, then reload
  const want = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('wz.')).sort().map(k => k + '=' + localStorage.getItem(k)).join('|'));
  const probe = path.join(path.dirname(new URL(target).pathname), 'wzprobe.html'); writeFileSync(probe, '<!doctype html><title>probe</title>');
  const q = await p.ctx.newPage();
  for (let i = 0; i < 40; i++) { await q.goto('file://' + probe); if ((await q.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('wz.')).sort().map(k => k + '=' + localStorage.getItem(k)).join('|'))) === want) break; await q.waitForTimeout(250); }
  await q.close(); await p.reload(); await ready(p);
};
const ready = async p => { await p.waitForFunction(() => window.__wz && document.querySelector('.screen.active') && document.getElementById('tileWz'), null, { timeout: 20000 }); await p.waitForTimeout(300); };
const vis = (p, id) => ev(p, id => document.getElementById(id).classList.contains('show'), id);
async function touch(p, type, id, x, y) {
  if (type === 'end') p.tp.delete(id); else p.tp.set(id, { x, y, id });
  const pts = [...p.tp.values()].map(t => ({ x: t.x, y: t.y, id: t.id, radiusX: 4, radiusY: 4, force: 1 }));
  await p.cdp.send('Input.dispatchTouchEvent', { type: type === 'start' ? 'touchStart' : type === 'move' ? 'touchMove' : 'touchEnd', touchPoints: pts });
}
const tap = async (p, x, y) => { await touch(p, 'start', 1, x, y); await wait(p, 40); await touch(p, 'end', 1); await wait(p, 60); };
const tapEl = async (p, sel) => { const r = await ev(p, s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width }; }, sel); if (!r || !r.w) return false; await tap(p, r.x, r.y); return true; };
const xy = (p, i) => ev(p, i => __wz.xy(i), i);
// a real swipe from cell a to cell b (with a few in-between points)
async function swipe(p, a, b2, steps = 6) {
  const A = await xy(p, a), B = await xy(p, b2);
  await touch(p, 'start', 2, A.x, A.y); await wait(p, 16);
  for (let k = 1; k <= steps; k++) { await touch(p, 'move', 2, A.x + (B.x - A.x) * k / steps, A.y + (B.y - A.y) * k / steps); await wait(p, 16); }
  await touch(p, 'end', 2); await wait(p, 40);
}
const ends = (p, k) => ev(p, k => { const c = __wz.cellsOf(__wz.P.words[k], __wz.P.n); return [c[0], c[c.length - 1]]; }, k);
async function openGame(p) { await ev(p, () => document.querySelector('#tileWz').scrollIntoView({ block: 'center' })); await tapEl(p, '#tileWz'); await wait(p, 600); }
const check = p => ev(p, () => __wz.check());
const idle = async p => { for (let i = 0; i < 40 && (await ev(p, () => __wz.loopOn())); i++) await wait(p, 100); return !(await ev(p, () => __wz.loopOn())); };

/* ================= solve a whole puzzle by touch, then the hidden word ================= */
if (want('solve')) {
  const p = await page();
  await openGame(p);
  ok('spel opent met het startscherm', await vis(p, 'wzStartModal') && await ev(p, () => __wz.cur() === 'wz'));
  ok('effectenlus staat stil achter het startscherm', await idle(p));
  await tapEl(p, '#wzLevels [data-lv="0"]'); await wait(p, 100);
  await tapEl(p, '#wzGo'); await wait(p, 500);
  ok('Makkelijk gestart', await ev(p, () => __wz.P.lv === 0 && __wz.P.n === 8 && __wz.G.phase === 'play' && !document.querySelector('.modal.show')));
  ok('klok loopt', await ev(p, () => __wz.clockOn()));
  const n = await ev(p, () => __wz.P.words.length);
  // a wrong swipe first: gentle feedback, nothing found
  const wrong = await ev(p, () => { const P = __wz.P; for (let a = 0; a < P.n * P.n; a++) for (const b of [a + 2, a + 3]) if (b < P.n * P.n && Math.floor(a / P.n) === Math.floor(b / P.n) && __wz.wordAt(P, a, b) < 0) return [a, b]; });
  await swipe(p, wrong[0], wrong[1]); await wait(p, 100);
  ok('verkeerde veeg: niets gevonden, zachte reactie', await ev(p, () => __wz.G.found.length === 0 && __wz.G.wrong === 1 && __wz.busy() > 0));
  // the first word by tapping its first and last letter
  let [a, z] = await ends(p, 0);
  let A = await xy(p, a); await tap(p, A.x, A.y); await wait(p, 60);
  ok('tik op de eerste letter: wacht op de laatste', await ev(p, () => __wz.G.found.length === 0));
  A = await xy(p, z); await tap(p, A.x, A.y); await wait(p, 100);
  ok('tik eerste en laatste letter vindt het woord', await ev(p, () => __wz.G.found.includes(0)));
  // the others by swiping (every second one backwards: from the last to the first letter)
  for (let k = 1; k < n; k++) { [a, z] = await ends(p, k); if (k % 2) await swipe(p, a, z); else await swipe(p, z, a); await wait(p, 60); }
  const st = await ev(p, () => ({ f: __wz.G.found.length, ph: __wz.G.phase, sec: __wz.P.secret }));
  ok('alle woorden gevonden met vegen', st.f === n, JSON.stringify(st));
  ok('lijst: alles doorgestreept', await ev(p, () => document.querySelectorAll('#wzList .wz-w.f').length === __wz.P.words.length));
  ok('geheim woord: letters verschijnen', st.ph === 'secret' && await ev(p, () => !document.getElementById('wzSecret').hidden && document.querySelectorAll('#wzTiles button').length === __wz.leftover().length));
  ok('rooster en lijst kloppen met de logica', (await check(p)).length === 0, JSON.stringify(await check(p)));
  // a wrong guess first (if the letters allow one), then the right one, all by tapping tiles
  const L = await ev(p, () => __wz.leftover());
  const tapTiles = async word => { const used = []; for (const ch of word) { const t = await ev(p, ([ch, used]) => [...document.querySelectorAll('#wzTiles button')].find(b => b.textContent === ch && !b.classList.contains('used') && !used.includes(+b.dataset.t)).dataset.t, [ch, used]); used.push(+t); await tapEl(p, `#wzTiles button[data-t="${t}"]`); } };
  const wrongW = L.split('').reverse().join('');
  if (wrongW !== L) { await tapTiles(wrongW); await wait(p, 120); ok('verkeerd geraden: rood, letters terug', await ev(p, () => document.getElementById('wzSlots').classList.contains('bad'))); await wait(p, 900); ok('vakjes weer leeg', await ev(p, () => __wz.G.slots.length === 0)); }
  await tapTiles(L); await wait(p, 200);
  ok('geheim woord geraden', await ev(p, () => __wz.G.secOk === true && __wz.G.phase === 'done'));
  await wait(p, 2000);
  ok('eindscherm met tijd en record', await vis(p, 'wzEndModal') && /Tijd/.test(await ev(p, () => document.getElementById('wzEndStats').textContent)));
  const S = await ev(p, () => __wz.stats());
  ok('statistiek: opgelost, woorden, geheim woord, beste tijd', S.solved === 1 && S.words === n && S.secrets === 1 && S.best.mk > 0, JSON.stringify(S));
  ok('opgeslagen spel weg na het oplossen', await ev(p, () => !Object.keys(localStorage).some(k => k.endsWith('wz.save'))));
  ok('trofee "Woordspeurder" verdiend', await ev(p, () => { document.getElementById('trophyBtn').click(); const on = [...document.querySelectorAll('#trophyBody .trophy.on')].some(t => /Woordspeurder/.test(t.textContent)); document.getElementById('trophyModal').classList.remove('show'); return on; }));
  await tapEl(p, '#wzEndNext'); await wait(p, 400);
  ok('nieuwe puzzel na "Nieuwe puzzel"', await ev(p, () => __wz.G.phase === 'play' && __wz.G.found.length === 0 && __wz.P.lv === 0));
  // Expert (no hidden word): finish through commit() of the last words, the end comes straight away
  await ev(p, () => __wz.begin(3, 4242)); await wait(p, 300);
  await ev(p, () => { const P = __wz.P; for (let k = 0; k < P.words.length - 1; k++) __wz.commit(__wz.cellsOf(P.words[k], P.n)); });
  [a, z] = await ends(p, await ev(p, () => __wz.P.words.length - 1)); await swipe(p, a, z); await wait(p, 1700);
  ok('Expert: geen geheim woord, meteen het eindscherm', await vis(p, 'wzEndModal') && await ev(p, () => __wz.G.phase === 'done' && !__wz.P.secret));
  ok('Expert zonder hints telt mee', (await ev(p, () => __wz.stats().expNoHint)) === 1);
  await p.ctx.close();
}

/* ================= hint ================= */
if (want('hint')) {
  const p = await page();
  await openGame(p); await tapEl(p, '#wzLevels [data-lv="1"]'); await tapEl(p, '#wzGo'); await wait(p, 400);
  await tapEl(p, '#wzHint'); await wait(p, 150);
  const h = await ev(p, () => ({ hints: __wz.G.hints, k: __wz.G.lastHint, lv: __wz.G.hint[__wz.G.lastHint], busy: __wz.busy(), loop: __wz.loopOn() }));
  ok('hint: eerste letter licht op', h.hints === 1 && h.lv === 1 && h.busy > 0 && h.loop, JSON.stringify(h));
  ok('hint: woord gemarkeerd in de lijst', await ev(p, k => document.querySelector(`#wzList [data-k="${k}"]`).classList.contains('hint'), h.k));
  await tapEl(p, '#wzHint'); await wait(p, 100);
  ok('nog een hint: zelfde woord, een letter meer', await ev(p, k => __wz.G.lastHint === k && __wz.G.hint[k] === 2 && __wz.G.hints === 2, h.k));
  ok('hint-teller in de knop', (await ev(p, () => document.getElementById('wzHintN').textContent)) === '2');
  ok('effectenlus stopt na de hint', await idle(p));
  const [a, z] = await ends(p, h.k); await swipe(p, a, z); await wait(p, 100);
  ok('woord met hint gevonden: hint weg', await ev(p, k => __wz.G.found.includes(k) && !document.querySelector(`#wzList [data-k="${k}"]`).classList.contains('hint'), h.k));
  await tapEl(p, '#wzHint'); await wait(p, 100);
  ok('volgende hint kiest een ander woord', await ev(p, k => __wz.G.lastHint !== k && !__wz.G.found.includes(__wz.G.lastHint), h.k));
  ok('hints in de statistiek', (await ev(p, () => __wz.stats().hints)) === 3, await ev(p, () => __wz.stats().hints));
  ok('geen fouten in de weergave', (await check(p)).length === 0, JSON.stringify(await check(p)));
  await p.ctx.close();
}

/* ================= save / resume ================= */
if (want('save')) {
  const p = await page();
  await openGame(p); await tapEl(p, '#wzLevels [data-lv="2"]'); await tapEl(p, '#wzGo'); await wait(p, 400);
  for (const k of [0, 3]) { const [a, z] = await ends(p, k); await swipe(p, a, z); await wait(p, 60); }
  await tapEl(p, '#wzHint'); await wait(p, 1200);
  const before = await ev(p, () => ({ seed: __wz.P.seed, found: __wz.G.found.slice(), hints: __wz.G.hints, t: __wz.G.time, grid: __wz.P.grid.join('') }));
  ok('twee woorden gevonden', before.found.length === 2);
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terug-knop: naar het menu, spel bewaard', await ev(p, () => __wz.cur() === 'menu' && Object.keys(localStorage).some(k => k.endsWith('wz.save'))));
  ok('tegel toont "Doorgaan"', await ev(p, () => document.getElementById('tileWz').classList.contains('has-save')));
  ok('klok staat stil in het menu', !(await ev(p, () => __wz.clockOn())));
  await reload(p);
  ok('na herladen: tegel toont nog "Doorgaan"', await ev(p, () => document.getElementById('tileWz').classList.contains('has-save')));
  await openGame(p); await wait(p, 300);
  const after = await ev(p, () => ({ seed: __wz.P.seed, found: __wz.G.found.slice(), hints: __wz.G.hints, t: __wz.G.time, grid: __wz.P.grid.join(''), modal: !!document.querySelector('.modal.show') }));
  ok('verder waar je was: zelfde puzzel, woorden, hints en tijd', after.seed === before.seed && after.grid === before.grid && JSON.stringify(after.found) === JSON.stringify(before.found) && after.hints === before.hints && after.t >= before.t - .01 && !after.modal, JSON.stringify([before.t, after.t]));
  ok('beeld opnieuw opgebouwd uit de logica', (await check(p)).length === 0, JSON.stringify(await check(p)));
  // pausing: hidden page saves and stops the clock
  await ev(p, () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const t1 = await ev(p, () => __wz.G.time); await wait(p, 1300); const t2 = await ev(p, () => __wz.G.time);
  ok('verborgen: klok staat stil', Math.abs(t2 - t1) < .01, `${t1} ${t2}`);
  await ev(p, () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await wait(p, 1200); ok('weer zichtbaar: klok loopt', (await ev(p, () => __wz.G.time)) > t2);
  // restart: everything back to zero, the view rebuilt
  await tapEl(p, '#wzRetry'); await wait(p, 200);
  ok('opnieuw vraagt bevestiging', await vis(p, 'askModal'));
  await tapEl(p, '#askYes'); await wait(p, 300);
  ok('opnieuw: niets gevonden, tijd 0, beeld klopt', await ev(p, () => __wz.G.found.length === 0 && __wz.G.time < 1 && __wz.G.hints === 0) && (await check(p)).length === 0);
  // a hidden-word game saved halfway through the guessing
  await ev(p, () => { const P = __wz.P; for (const w of P.words) __wz.commit(__wz.cellsOf(w, P.n)); }); await wait(p, 200);
  const tiles = await ev(p, () => __wz.G.tiles.slice()), L = await ev(p, () => __wz.leftover());
  const first = await ev(p, ([L, tiles]) => tiles.find(t => L[t] === L[0]), [L, tiles]);
  await tapEl(p, `#wzTiles button[data-t="${first}"]`); await wait(p, 100);
  await ev(p, () => window.appBack()); await wait(p, 200); await reload(p); await openGame(p); await wait(p, 300);
  ok('geheim woord half ingevuld: na herladen hetzelfde', await ev(p, ([tiles, first]) => __wz.G.phase === 'secret' && JSON.stringify(__wz.G.tiles) === JSON.stringify(tiles) && __wz.G.slots.length === 1 && __wz.G.slots[0] === first, [tiles, first]) && (await check(p)).length === 0, JSON.stringify(await check(p)));
  await p.ctx.close();
}

/* ================= landscape ================= */
if (want('land')) {
  const p = await page(LAND);
  await openGame(p); await tapEl(p, '#wzLevels [data-lv="3"]'); await tapEl(p, '#wzGo'); await wait(p, 400);
  const L = await ev(p, () => { const bx = document.getElementById('wzBox').getBoundingClientRect(), sd = document.getElementById('wzSide').getBoundingClientRect(); return { land: document.getElementById('wz').classList.contains('land'), side: bx.right <= sd.left + 1, cs: __wz.LY.cs, fits: bx.bottom <= innerHeight + 1 && sd.right <= innerWidth + 1, scroll: document.documentElement.scrollWidth <= innerWidth + 1 }; });
  ok('liggend: rooster en lijst naast elkaar', L.land && L.side && L.fits && L.scroll, JSON.stringify(L));
  ok('liggend Expert: letters groot genoeg (≥ 22 px)', L.cs >= 22, L.cs.toFixed(1));
  const [a, z] = await ends(p, 2); await swipe(p, a, z); await wait(p, 100);
  ok('liggend: woord gevonden met vegen', await ev(p, () => __wz.G.found.includes(2)));
  // turn the phone: the view follows and stays right
  await p.setViewportSize({ width: 412, height: 915 }); await wait(p, 400);
  ok('gedraaid naar staand: rooster boven, lijst onder', await ev(p, () => { const bx = document.getElementById('wzBox').getBoundingClientRect(), sd = document.getElementById('wzSide').getBoundingClientRect(); return !document.getElementById('wz').classList.contains('land') && bx.bottom <= sd.top + 1 && __wz.LY.cs >= 26; }));
  ok('staand Expert: vakjes ≥ 26 px', (await ev(p, () => __wz.LY.cs)) >= 26, (await ev(p, () => __wz.LY.cs)).toFixed(1));
  ok('na draaien klopt het beeld', (await check(p)).length === 0, JSON.stringify(await check(p)));
  await p.ctx.close();
}

/* ================= big text ================= */
if (want('big')) {
  const p = await page(PORT, '{"seen":"9.99","mute":true,"text":"groot"}');
  await openGame(p); await tapEl(p, '#wzLevels [data-lv="3"]'); await tapEl(p, '#wzGo'); await wait(p, 400);
  const B = await ev(p, () => { const w = document.querySelector('#wzList .wz-w'), s = document.getElementById('wzSide').getBoundingClientRect(); return { big: document.documentElement.classList.contains('big-text'), fs: parseFloat(getComputedStyle(w).fontSize), cs: __wz.LY.cs, scroll: document.documentElement.scrollWidth <= innerWidth + 1, side: s.height }; });
  ok('grote tekst: lijst groter (≥ 16 px)', B.big && B.fs >= 16, JSON.stringify(B));
  ok('grote tekst: rooster blijft leesbaar en alles past', B.cs >= 26 && B.scroll && B.side > 150, JSON.stringify(B));
  const [a, z] = await ends(p, 0); await swipe(p, a, z); await wait(p, 100);
  ok('grote tekst: vegen werkt', await ev(p, () => __wz.G.found.includes(0)));
  await p.ctx.close();
}

/* ================= back button ================= */
if (want('back')) {
  const p = await page();
  await openGame(p);
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terug in het startscherm: naar het menu', await ev(p, () => __wz.cur() === 'menu' && !document.querySelector('.modal.show')));
  await openGame(p); await tapEl(p, '#wzGo'); await wait(p, 300);
  const [a, z] = await ends(p, 0); await swipe(p, a, z); await wait(p, 60);
  await tapEl(p, '#wzRetry'); await wait(p, 150);
  await ev(p, () => window.appBack()); await wait(p, 150);
  ok('terug sluit de vraag, het spel blijft', await ev(p, () => __wz.cur() === 'wz' && !document.querySelector('.modal.show') && __wz.G.found.length === 1));
  await tapEl(p, '#wzMenu'); await wait(p, 150);
  ok('menu-knop opent het startscherm met "Verder spelen"', await vis(p, 'wzStartModal') && await ev(p, () => !document.getElementById('wzCont').hidden));
  ok('klok staat stil zolang het startscherm open is', await (async () => { const t1 = await ev(p, () => __wz.G.time); await wait(p, 1100); return Math.abs((await ev(p, () => __wz.G.time)) - t1) < .01; })());
  await tapEl(p, '#wzCont'); await wait(p, 150);
  ok('"Verder spelen" sluit het startscherm', await ev(p, () => !document.querySelector('.modal.show') && __wz.cur() === 'wz'));
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terug tijdens het spel: naar het menu', await ev(p, () => __wz.cur() === 'menu'));
  // daily puzzle: the same for everybody (same date = same grid)
  await openGame(p); if (!(await vis(p, 'wzStartModal'))) { await tapEl(p, '#wzMenu'); await wait(p, 150); }
  await tapEl(p, '#wzDaily'); await wait(p, 200);
  if (await vis(p, 'askModal')) { await tapEl(p, '#askYes'); await wait(p, 300); }
  const d1 = await ev(p, () => ({ g: __wz.P.grid.join(''), d: __wz.G.daily, lv: __wz.P.lv }));
  const d2 = await ev(p, () => { const d = new Date(); const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return __wz.generate(1, (() => { let h = 2166136261; const t = 'woordzoeker ' + s; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })()).grid.join(''); });
  ok('puzzel van de dag: Normaal, vast rooster per datum', d1.lv === 1 && !!d1.d && d1.g === d2);
  ok('dagpuzzel in de titel', /Dagpuzzel/.test(await ev(p, () => document.getElementById('wzSub').textContent)));
  await p.ctx.close();
}

/* ================= performance: generation and dragging on a slow phone (CPU 6x slower) ================= */
if (want('perf')) {
  const p = await page();
  await openGame(p); await tapEl(p, '#wzLevels [data-lv="3"]'); await tapEl(p, '#wzGo'); await wait(p, 400);
  await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const gen = await ev(p, () => __wz.LEVELS.map((L, lv) => { const ms = []; for (let s = 1; s <= 12; s++) { const t = performance.now(); __wz.generate(lv, s * 99991 + lv); ms.push(performance.now() - t); } ms.sort((a, b) => a - b); return { lv: L.name, avg: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(1), max: +ms[ms.length - 1].toFixed(1) }; }));
  console.log('  generation at 6x CPU throttling:', JSON.stringify(gen));
  ok('puzzel maken op een trage telefoon: gemiddeld < 100 ms per niveau', gen.every(g => g.avg < 100), JSON.stringify(gen.map(g => g.avg)));
  // animation while a hint pulses and a found word sparkles: frames must keep up (≥ 50 fps)
  await wait(p, 300);
  const f0 = (await ev(p, () => __wz.frames())).length;
  await ev(p, () => { __wz.useHint(); const P = __wz.P; __wz.commit(__wz.cellsOf(P.words[0], P.n)); });
  await wait(p, 2000);
  const fr = await ev(p, () => __wz.frames()), dt = fr.slice(f0 + 1).map((t, i) => t - fr[f0 + i]).filter(x => x < 1000);
  dt.sort((a, b) => a - b);
  const fps = 1000 / dt[dt.length >> 1], slow = dt.filter(x => x > 25).length;
  console.log('  animation at 6x: frames', dt.length, 'median fps', fps.toFixed(0), 'slower than 25 ms:', slow);
  ok('animatie vloeiend bij 6x trager (≥ 50 fps, ≤ 10% trage beelden)', fps >= 50 && slow <= dt.length * .1, fps.toFixed(0));
  // a long drag across the Expert grid: what one drag frame costs to draw, and how fast a move shows up
  const A = await xy(p, 0), Bp = await xy(p, 14 * 14 - 1), d0 = (await ev(p, () => __wz.drawMs())).length, lat = [];
  await touch(p, 'start', 5, A.x, A.y);
  for (let k = 1; k <= 40; k++) { const t = Date.now(); await touch(p, 'move', 5, A.x + (Bp.x - A.x) * (k % 20) / 20, A.y + (Bp.y - A.y) * (k % 20) / 20); lat.push(Date.now() - t); await wait(p, 16); }
  await touch(p, 'end', 5);
  const dm = (await ev(p, () => __wz.drawMs())).slice(d0).sort((a, b) => a - b), p90 = dm[Math.floor(dm.length * .9)] || 0;
  lat.sort((a, b) => a - b);
  console.log('  drag at 6x: draws', dm.length, 'p90 draw', p90.toFixed(1), 'ms; input p90', lat[Math.floor(lat.length * .9)], 'ms');
  ok('slepen bij 6x trager: tekenen ≤ 8 ms per beeld, invoer ≤ 50 ms', dm.length > 5 && p90 <= 8 && lat[Math.floor(lat.length * .9)] <= 50);
  await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok('effectenlus stopt als niets beweegt', await idle(p));
  await p.ctx.close();
}

await b.close();
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'errors []');
ok('geen fouten in de console', errs.length === 0);
const nf = res.filter(r => !r).length;
console.log(`${res.length - nf}/${res.length} passed`);
process.exit(nf ? 1 : 0);
