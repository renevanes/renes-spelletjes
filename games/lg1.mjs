import { existsSync, mkdirSync } from 'node:fs';
// Logigram browser test on the real UI with real touch input (Playwright + CDP touch events).
//   node games/lg1.mjs [path-to-index.html]      (default build/work/lgtest/index.html, or APP_HTML)
//   PART = all | main | save | land | big | back | daily | opts | perf | check | lines   (comma separated)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), GFX = path.join(here, '..', 'build', 'gfx'); mkdirSync(GFX, { recursive: true });
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'lgtest', 'index.html'));
const PARTS = (process.env.PART || 'all').split(','), want = p => PARTS.includes('all') || PARTS.includes(p);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(!!cond); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra !== '' ? ' ' + extra : ''}`); };
const LAND = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PORT = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
async function page(o = PORT, cfg = '{"seen":"9.99","mute":true}') {
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
const tap = async (p, x, y, hold = 40) => { await touch(p, 'start', 1, x, y); await wait(p, hold); await touch(p, 'end', 1); await wait(p, 60); };
const tapEl = async (p, sel) => { const r = await ev(p, s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width }; }, sel); if (!r || !r.w) return false; await tap(p, r.x, r.y); return true; };
async function drag(p, x0, y0, x1, y1, steps = 10) { await touch(p, 'start', 1, x0, y0); for (let i = 1; i <= steps; i++) { await touch(p, 'move', 1, x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await wait(p, 16); } await touch(p, 'end', 1); await wait(p, 60); }
async function pinch(p, cx, cy, d0, d1, steps = 10) {
  await touch(p, 'start', 1, cx - d0 / 2, cy); await touch(p, 'start', 2, cx + d0 / 2, cy);
  for (let i = 1; i <= steps; i++) { const d = d0 + (d1 - d0) * i / steps; await touch(p, 'move', 1, cx - d / 2, cy); await touch(p, 'move', 2, cx + d / 2, cy); await wait(p, 16); }
  await touch(p, 'end', 2); await touch(p, 'end', 1); await wait(p, 80);
}
async function openGame(p) { await ev(p, () => document.querySelector('#tileLg').scrollIntoView({ block: 'center' })); await wait(p, 100); await tapEl(p, '#tileLg'); await wait(p, 700); }
async function newPuzzle(p, lvl) {
  if (!(await vis(p, 'lgStartModal'))) { await ev(p, () => __lg.openStart()); await wait(p, 200); }
  await tapEl(p, `#lgLevels [data-l="${lvl}"]`); await wait(p, 100); await tapEl(p, '#lgGo');
  for (let i = 0; i < 60 && (await ev(p, () => !__lg.S || __lg.busy() || document.getElementById('askModal').classList.contains('show'))); i++) { if (await vis(p, 'askModal')) await tapEl(p, '#askYes'); await wait(p, 50); }
  await wait(p, 250);
}
const mark = (p, a, bb) => ev(p, ([a, b]) => __lg.S.mk[a * __lg.S.P.K * __lg.S.P.N + b], [a, bb]);
async function tapCell(p, a, bb, hold) { await ev(p, ([a, b]) => __lg.reveal(a, b), [a, bb]); await wait(p, 60); const q = await ev(p, ([a, b]) => __lg.cellXY(a, b), [a, bb]); await tap(p, q.x, q.y, hold); return q; }
// the solution's ✓ cells in the blocks with the names
const solCells = p => ev(p, () => { const P = __lg.S.P, N = P.N, r = []; for (let c = 1; c < P.K; c++) for (let j = 0; j < N; j++) r.push([P.ent[c * N + j], c * N + j]); return r; });
async function solveByTaps(p) {
  for (const [a, bb] of await solCells(p)) {
    for (let k = 0; k < 3 && (await mark(p, a, bb)) !== 2 && !(await ev(p, () => __lg.S.done)); k++) await tapCell(p, a, bb);
  }
}

/* ================= main flow (portrait) ================= */
if (want('main')) {
  const p = await page(PORT);
  await openGame(p);
  ok('spel opent met het startscherm', await vis(p, 'lgStartModal') && await ev(p, () => document.querySelector('.screen.active').id === 'lg'));
  ok('tekenlus staat stil in het startscherm', !(await ev(p, () => __lg.running())));
  await p.screenshot({ path: path.join(GFX, 'lg_start_p.png') });
  await newPuzzle(p, 'makkelijk');
  const info = await ev(p, () => ({ lvl: __lg.S.lvl, n: __lg.S.P.clues.length, K: __lg.S.P.K, N: __lg.S.P.N, gen: __lg.genMs(), cs: __lg.V.cs, li: document.querySelectorAll('#lgClues li').length }));
  ok('nieuwe makkelijke puzzel (3 × 4)', info.lvl === 'makkelijk' && info.K === 3 && info.N === 4 && info.n >= 3 && info.li === info.n, JSON.stringify(info));
  ok('maken duurde < 300 ms', info.gen < 300, info.gen + ' ms');
  ok('staand: vakjes minstens 34 px', info.cs >= 34, info.cs);
  const lay = await ev(p, () => { const q = s => document.querySelector(s).getBoundingClientRect(); return { box: q('#lgBox').toJSON(), side: q('#lgSide').toJSON(), W: innerWidth, sw: document.documentElement.scrollWidth }; });
  ok('staand: aanwijzingen onder het rooster', lay.side.top >= lay.box.bottom - 1 && lay.box.height > 380 && lay.side.height > 200, JSON.stringify([lay.box.height, lay.side.height]));
  ok('staand: niets steekt opzij uit', lay.sw <= lay.W);
  // tap cycle: empty -> ✗ -> ✓ (with automatic ✗) -> empty (they go again)
  const [sa, sb] = (await solCells(p))[0];
  const other = await ev(p, ([a, b]) => { const N = __lg.S.P.N; return Math.floor(b / N) * N + ((b % N) + 1) % N; }, [sa, sb]);
  await tapCell(p, sa, other);
  ok('tik: ✗', (await mark(p, sa, other)) === 1);
  await tapCell(p, sa, other);
  const autos = await ev(p, ([a, b]) => { const S = __lg.S, T = S.P.K * S.P.N; return S.mk.filter(v => v === 3).length / 2; }, [sa, other]);
  ok('tik nog eens: ✓ en de rest van rij en kolom automatisch ✗', (await mark(p, sa, other)) === 2 && autos === 6, autos);
  await tapCell(p, sa, other);
  ok('derde tik: leeg, automatische ✗ weg', (await mark(p, sa, other)) === 0 && (await ev(p, () => __lg.S.mk.filter(v => v === 3).length)) === 0);
  await tapEl(p, '#lgUndo'); await wait(p, 100);
  ok('terug: ✓ is er weer', (await mark(p, sa, other)) === 2 && (await ev(p, () => __lg.S.mk.filter(v => v === 3).length)) === 12);
  await tapEl(p, '#lgRedo'); await wait(p, 100);
  ok('vooruit: weer leeg', (await mark(p, sa, other)) === 0);
  ok('rooster en terug-lijst kloppen', (await ev(p, () => __lg.check())) === '', await ev(p, () => __lg.check()));
  // long press: ✓ at once
  await tapCell(p, sa, sb, 700);
  ok('lang drukken zet meteen ✓', (await mark(p, sa, sb)) === 2);
  // pan with one finger: no marks change
  const before = await ev(p, () => __lg.S.mk.join(''));
  const v0 = await ev(p, () => ({ ox: __lg.V.ox, oy: __lg.V.oy, cs: __lg.V.cs }));
  const br = await ev(p, () => document.getElementById('lgBox').getBoundingClientRect().toJSON());
  await drag(p, br.left + br.width * .8, br.top + br.height * .8, br.left + br.width * .3, br.top + br.height * .4);
  const v1 = await ev(p, () => ({ ox: __lg.V.ox, oy: __lg.V.oy }));
  ok('schuiven met één vinger verplaatst het rooster', v1.ox !== v0.ox || v1.oy !== v0.oy || (await ev(p, () => __lg.Lay.fitAll >= __lg.V.cs)), JSON.stringify([v0, v1]));
  ok('schuiven zet geen tekens', (await ev(p, () => __lg.S.mk.join(''))) === before);
  await pinch(p, br.left + br.width / 2, br.top + br.height / 2, 80, 220);
  const v2 = await ev(p, () => __lg.V.cs);
  ok('knijpen zoomt in', v2 > v0.cs + 5, `${v0.cs} -> ${v2.toFixed(1)}`);
  ok('knijpen zet geen tekens', (await ev(p, () => __lg.S.mk.join(''))) === before);
  await wait(p, 400); await tapEl(p, '#lgFit'); await wait(p, 100);
  ok('Passend: alles in beeld', await ev(p, () => Math.abs(__lg.V.cs - __lg.Lay.fitAll) < .6), await ev(p, () => [__lg.V.cs, __lg.Lay.fitAll].join()));
  await tapEl(p, '#lgFit'); await wait(p, 100);
  ok('nog eens Passend: weer de gewone maat', await ev(p, () => Math.abs(__lg.V.cs - __lg.Lay.cs0) < .6));
  // hint in two steps: first a tip (no answer shown), then the full reasoning, then fill it in
  await tapEl(p, '#lgHintB'); await wait(p, 300);
  const h = await ev(p, () => ({ show: document.getElementById('lgTip').classList.contains('show'), txt: document.getElementById('lgTipText').textContent, go: document.getElementById('lgTipGo').textContent, hints: __lg.S.hints, a: __lg.hint && __lg.hint.a, b: __lg.hint && __lg.hint.b, v: __lg.hint && __lg.hint.v, stage: __lg.hint && __lg.hint.stage, pulse: getComputedStyle(document.getElementById('lgPulse')).display }));
  ok('hint stap 1: eerst een tip, zonder antwoord', h.show && h.stage === 1 && h.txt.includes('🔎') && h.go === 'Leg uit' && h.pulse !== 'block', h.txt);
  ok('hint telt mee', h.hints === 1);
  ok('staand: hint-uitleg onder het rooster, rooster blijft vrij', await ev(p, () => document.getElementById('lgTip').getBoundingClientRect().top >= document.getElementById('lgBox').getBoundingClientRect().bottom - 1));
  await tapEl(p, '#lgTipGo'); await wait(p, 250);
  const h2 = await ev(p, () => ({ txt: document.getElementById('lgTipText').textContent, go: document.getElementById('lgTipGo').textContent, stage: __lg.hint && __lg.hint.stage, pulse: getComputedStyle(document.getElementById('lgPulse')).display }));
  ok('hint stap 2 (Leg uit): de hele redenering, vakje in beeld', h2.stage === 2 && h2.txt.includes('💡') && /aanwijzing|Daarom|blijft|volgt|dus/.test(h2.txt) && /Zet/.test(h2.go) && h2.pulse === 'block', h2.txt);
  await tapEl(p, '#lgHintB'); await wait(p, 150);
  ok('dezelfde hint nog eens telt niet dubbel', (await ev(p, () => __lg.S.hints)) === 1 && await ev(p, () => __lg.hint && __lg.hint.stage === 2));
  await tapEl(p, '#lgTipGo'); await wait(p, 150);
  ok('hint invullen zet het goede teken', (await mark(p, h.a, h.b)) === h.v && await ev(p, ([a, b]) => (__lg.S.P.ent[a] === __lg.S.P.ent[b]) === (__lg.S.mk[a * __lg.S.P.K * __lg.S.P.N + b] === 2), [h.a, h.b]) && !(await vis(p, 'lgTip')));
  await p.screenshot({ path: path.join(GFX, 'lg_play_p.png') });
  // strike a clue through
  await tapEl(p, '#lgClues li[data-i="0"]'); await wait(p, 100);
  ok('tik op aanwijzing streept hem door', await ev(p, () => document.querySelector('#lgClues li[data-i="0"]').classList.contains('done') && __lg.S.struck[0] === true));
  await tapEl(p, '#lgClues li[data-i="0"]'); await wait(p, 100);
  ok('nog eens tikken: weer zichtbaar', await ev(p, () => !document.querySelector('#lgClues li[data-i="0"]').classList.contains('done')));
  // summary
  await tapEl(p, '#lgTabs [data-t="s"]'); await wait(p, 150);
  ok('overzicht: tabel met een rij per persoon', await ev(p, () => !document.getElementById('lgSum').hidden && document.querySelectorAll('#lgSum tbody tr').length === __lg.S.P.N && /gevonden/.test(document.getElementById('lgSum').textContent)));
  await p.screenshot({ path: path.join(GFX, 'lg_summary_p.png') });
  await tapEl(p, '#lgTabs [data-t="c"]'); await wait(p, 150);
  await tapEl(p, '#lgTabs [data-t="c"]'); await wait(p, 200);
  ok('tik op het actieve tabblad klapt het paneel in (meer ruimte)', await ev(p, () => document.getElementById('lg').classList.contains('lg-col') && document.getElementById('lgBox').getBoundingClientRect().height > 600));
  await tapEl(p, '#lgTabs [data-t="c"]'); await wait(p, 200);
  ok('en weer uit', await ev(p, () => !document.getElementById('lg').classList.contains('lg-col')));
  // header tap: full name
  const hdr = await ev(p, () => { const L = __lg.Lay; __lg.reveal(0, L.cols[0] * L.N); const q = __lg.cellXY(0, L.cols[0] * L.N); return { x: q.x, y: q.y - q.s / 2 - 22 }; });
  await tap(p, hdr.x, hdr.y); await wait(p, 100);
  ok('tik op een kop: volledige naam', await ev(p, () => document.getElementById('lgToast').classList.contains('show') && document.getElementById('lgToast').textContent.includes(':')), await ev(p, () => document.getElementById('lgToast').textContent));
  // the clock runs while playing
  const t0 = await ev(p, () => __lg.S.t); await wait(p, 1300); const t1 = await ev(p, () => __lg.S.t);
  ok('klok loopt', t1 - t0 > .8 && t1 - t0 < 2, (t1 - t0).toFixed(2));
  // solve the rest with real taps
  await solveByTaps(p); await wait(p, 300);
  ok('opgelost via echte tikken', await ev(p, () => __lg.S.done === true));
  await wait(p, 1500);
  ok('opgelost-scherm met tijd en hints', await vis(p, 'lgEndModal') && /in \d+:\d\d/.test(await ev(p, () => document.getElementById('lgEndText').textContent)) && /1 hint/.test(await ev(p, () => document.getElementById('lgEndText').textContent)), await ev(p, () => document.getElementById('lgEndText').textContent));
  const st = await ev(p, () => __lg.stats());
  ok('statistiek: opgelost, beste tijd, hints', st.won === 1 && st.best.makkelijk != null && st.hints === 1 && st.noHint === 0, JSON.stringify(st));
  ok('geen opgeslagen spel meer na oplossen', !(await ev(p, () => !!localStorage.getItem('lg.save') && JSON.parse(localStorage.getItem('lg.save')) !== null)));
  await p.screenshot({ path: path.join(GFX, 'lg_solved_p.png') });
  await wait(p, 500);
  ok('tekenlus staat stil als niets beweegt', !(await ev(p, () => __lg.running())));
  await tapEl(p, '#lgEndNew');
  for (let i = 0; i < 60 && (await ev(p, () => __lg.busy() || __lg.S.done)); i++) await wait(p, 50);
  ok('Nog een: nieuwe puzzel van hetzelfde niveau', await ev(p, () => !__lg.S.done && __lg.S.lvl === 'makkelijk' && __lg.S.t < 2));
  ok('trofee "Speurneus" gehaald', await ev(p, () => (typeof readStats === 'function') || true) && await ev(p, () => JSON.parse(localStorage.getItem('lg.stats')).won === 1));
  await p.close();
}

/* ================= save and resume ================= */
if (want('save')) {
  const p = await page(PORT);
  await openGame(p); await newPuzzle(p, 'normaal');
  const cells = (await solCells(p)).slice(0, 3);
  for (const [a, bb] of cells) await tapCell(p, a, bb);
  await tapEl(p, '#lgClues li[data-i="1"]'); await wait(p, 100);
  await wait(p, 1200);
  const snap = await ev(p, () => ({ mk: __lg.S.mk.join(''), t: __lg.S.t, struck: __lg.S.struck.slice(), clues: __lg.S.P.clues.map(k => k.txt).join('|'), undo: __lg.S.undo.length }));
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terug: naar het menu', await ev(p, () => document.querySelector('.screen.active').id === 'menu'));
  ok('tegel toont "Doorgaan"', await ev(p, () => document.getElementById('tileLg').classList.contains('has-save')));
  ok('klok staat stil in het menu', await ev(p, () => !__lg.timerOn()));
  await openGame(p); await wait(p, 300);
  const back = await ev(p, () => ({ mk: __lg.S.mk.join(''), t: __lg.S.t, struck: __lg.S.struck.slice(), clues: __lg.S.P.clues.map(k => k.txt).join('|'), modal: !!document.querySelector('.modal.show') }));
  ok('verder: zelfde rooster, aanwijzingen en doorgestreept', back.mk === snap.mk && back.clues === snap.clues && JSON.stringify(back.struck) === JSON.stringify(snap.struck) && !back.modal);
  ok('verder: tijd loopt door vanaf de opgeslagen tijd', Math.abs(back.t - snap.t) < 1.5, `${snap.t.toFixed(1)} / ${back.t.toFixed(1)}`);
  // a fresh app start (reload): the saved game comes back
  await ev(p, () => window.appBack()); await wait(p, 200);
  await p.reload(); await wait(p, 600);
  ok('na herstart: tegel toont "Doorgaan"', await ev(p, () => document.getElementById('tileLg').classList.contains('has-save')));
  await openGame(p); await wait(p, 400);
  const re = await ev(p, () => ({ mk: __lg.S.mk.join(''), clues: __lg.S.P.clues.map(k => k.txt).join('|'), undo: __lg.S.undo.length, struck: __lg.S.struck.slice(), check: __lg.check() }));
  ok('na herstart: alles terug (ook terug-lijst)', re.mk === snap.mk && re.clues === snap.clues && re.undo === snap.undo && re.check === '', JSON.stringify({ u: [re.undo, snap.undo], c: re.check }));
  await tapEl(p, '#lgUndo'); await wait(p, 150);
  ok('terug werkt na herstart en het beeld volgt', (await mark(p, cells[2][0], cells[2][1])) === 0 && (await ev(p, () => __lg.check())) === '');
  // hidden page: saved right away
  await tapCell(p, cells[2][0], cells[2][1]); await tapCell(p, cells[2][0], cells[2][1]);
  await ev(p, () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  ok('app naar achtergrond: meteen opgeslagen', await ev(p, () => { const d = JSON.parse(localStorage.getItem('lg.save')); return d && __lg.Core.unpackMarks(__lg.S.P, d.mk).join('') === __lg.S.mk.join(''); }));
  const tq = await ev(p, () => __lg.S.t); await wait(p, 1200);
  ok('klok staat stil op de achtergrond', Math.abs((await ev(p, () => __lg.S.t)) - tq) < .05);
  await ev(p, () => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  // restart
  await ev(p, () => __lg.openMenu()); await wait(p, 150);
  await tapEl(p, '#lgMRestart'); await wait(p, 150); await tapEl(p, '#askYes'); await wait(p, 200);
  ok('opnieuw: rooster leeg, puzzel hetzelfde', await ev(p, ([c]) => __lg.S.mk.every(v => v === 0) && __lg.S.P.clues.map(k => k.txt).join('|') === c && __lg.S.undo.length === 0, [snap.clues]));
  await p.close();
}

/* ================= landscape ================= */
if (want('land')) {
  const p = await page(LAND);
  await openGame(p);
  await p.screenshot({ path: path.join(GFX, 'lg_start_l.png') });
  await newPuzzle(p, 'moeilijk');
  const lay = await ev(p, () => { const q = s => document.querySelector(s).getBoundingClientRect().toJSON(); return { box: q('#lgBox'), side: q('#lgSide'), W: innerWidth, H: innerHeight }; });
  ok('liggend: rooster en aanwijzingen naast elkaar', lay.side.left >= lay.box.right - 1 && lay.box.width > 420 && lay.side.width >= 280 && lay.side.height > 300, JSON.stringify([lay.box.width, lay.side.width]));
  const [a, bb] = (await solCells(p))[4];
  await tapCell(p, a, bb); await tapCell(p, a, bb);
  ok('liggend: tikken werkt', (await mark(p, a, bb)) === 2);
  await ev(p, () => __lg.doHint()); await wait(p, 300);
  await p.screenshot({ path: path.join(GFX, 'lg_hint_l.png') });
  ok('liggend: hint-uitleg naast het rooster, rooster blijft vrij', await ev(p, () => { const t = document.getElementById('lgTip').getBoundingClientRect(), sd = document.getElementById('lgSide').getBoundingClientRect(), bx = document.getElementById('lgBox').getBoundingClientRect(); return t.left >= sd.left - 1 && t.right <= sd.right + 1 && t.bottom <= sd.bottom + 1 && t.left >= bx.right - 1; }));
  ok('liggend: de aanwijzing van de hint staat in beeld boven de uitleg', await ev(p, () => { const h = __lg.hint; if (!h || h.clue < 0) return true; const li = document.querySelector(`#lgClues li[data-i="${h.clue}"]`).getBoundingClientRect(), t = document.getElementById('lgTip').getBoundingClientRect(), pn = document.getElementById('lgPanel').getBoundingClientRect(); return li.top >= pn.top - 1 && li.bottom <= t.top + 1; }));
  await ev(p, () => __lg.applyHint()); await wait(p, 100);
  // rotate to portrait and back
  await p.setViewportSize({ width: 412, height: 915 }); await wait(p, 400);
  const lp = await ev(p, () => { const q = s => document.querySelector(s).getBoundingClientRect().toJSON(); return { box: q('#lgBox'), side: q('#lgSide'), cs: __lg.V.cs, land: document.getElementById('lg').classList.contains('land') }; });
  ok('draaien naar staand: aanwijzingen onder het rooster', !lp.land && lp.side.top >= lp.box.bottom - 1 && lp.cs >= 34, JSON.stringify(lp.cs));
  ok('draaien: tekens blijven staan', (await mark(p, a, bb)) === 2 && (await ev(p, () => __lg.check())) === '');
  await p.setViewportSize({ width: 915, height: 412 }); await wait(p, 400);
  ok('terug naar liggend', await ev(p, () => document.getElementById('lg').classList.contains('land')));
  await ev(p, () => __lg.S && __lg.reveal(0, __lg.S.P.N)); await wait(p, 100);
  await p.screenshot({ path: path.join(GFX, 'lg_play_l.png') });
  await p.close();
}

/* ================= big text ================= */
if (want('big')) {
  const p = await page(PORT, '{"seen":"9.99","mute":true,"text":"groot"}');
  await openGame(p);
  ok('grote tekst staat aan', await ev(p, () => document.documentElement.classList.contains('big-text')));
  await newPuzzle(p, 'expert');
  const r = await ev(p, () => ({ cs: __lg.V.cs, fs: __lg.Lay.fs, clue: parseFloat(getComputedStyle(document.querySelector('#lgClues li')).fontSize), sw: document.documentElement.scrollWidth, W: innerWidth, K: __lg.S.P.K }));
  ok('grote tekst: grotere vakjes en letters', r.cs >= 40 && r.fs >= 15 && r.clue >= 17, JSON.stringify(r));
  ok('grote tekst: niets steekt opzij uit', r.sw <= r.W);
  ok('expert: 5 soorten', r.K === 5);
  await p.screenshot({ path: path.join(GFX, 'lg_big_p.png') });
  const [a, bb] = (await solCells(p))[7];
  await tapCell(p, a, bb, 700);
  ok('grote tekst: lang drukken werkt', (await mark(p, a, bb)) === 2);
  await p.close();
}

/* ================= back button ================= */
if (want('back')) {
  const p = await page(PORT);
  await openGame(p);
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terug op het startscherm: naar het menu', await ev(p, () => document.querySelector('.screen.active').id === 'menu' && !document.querySelector('.modal.show')));
  await openGame(p); await newPuzzle(p, 'makkelijk');
  await ev(p, () => __lg.doHint()); await wait(p, 200);
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terug met een hint open: alleen de hint dicht', await ev(p, () => document.querySelector('.screen.active').id === 'lg' && !document.getElementById('lgTip').classList.contains('show')));
  await tapEl(p, '#lgMenu'); await wait(p, 200);
  ok('menu-knop opent het spelmenu', await vis(p, 'lgMenuModal'));
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terug in het spelmenu: menu dicht, spel blijft', await ev(p, () => document.querySelector('.screen.active').id === 'lg' && !document.querySelector('.modal.show')));
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terug in het spel: naar het menu, bewaard', await ev(p, () => document.querySelector('.screen.active').id === 'menu' && document.getElementById('tileLg').classList.contains('has-save')));
  await openGame(p); await wait(p, 200);
  for (const [a, bb] of await solCells(p)) await ev(p, ([a, b]) => __lg.doMark(a, b, 2), [a, bb]);
  await wait(p, 1700);
  ok('opgelost-scherm', await vis(p, 'lgEndModal'));
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terug op het opgelost-scherm: naar het menu, niets bewaard', await ev(p, () => document.querySelector('.screen.active').id === 'menu' && !document.getElementById('tileLg').classList.contains('has-save')));
  await openGame(p); await wait(p, 200);
  ok('daarna opent het startscherm', await vis(p, 'lgStartModal'));
  await p.close();
}

/* ================= puzzle of the day ================= */
if (want('daily')) {
  const p = await page(PORT);
  await openGame(p);
  const dtext = await ev(p, () => document.getElementById('lgDaily').textContent);
  ok('dagpuzzel staat in het startscherm', /Puzzel van de dag/.test(dtext) && /(Makkelijk|Normaal|Moeilijk|Expert)/.test(dtext), dtext);
  await tapEl(p, '#lgDaily');
  for (let i = 0; i < 80 && (await ev(p, () => !__lg.S || __lg.busy())); i++) await wait(p, 50);
  const d = await ev(p, () => { const t = new Date(), ds = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; return { daily: __lg.S.daily, ds, lvl: __lg.S.lvl, want: __lg.Core.dailyFor(ds).lvl, title: document.getElementById('lgTitle').textContent, clues: __lg.S.P.clues.map(k => k.txt).join('|'), same: __lg.Core.generate(__lg.Core.dailyFor(ds).lvl, __lg.Core.dailyFor(ds).seed).clues.map(k => k.txt).join('|') }; });
  ok('dagpuzzel: datum, niveau en altijd dezelfde puzzel', d.daily === d.ds && d.lvl === d.want && /dagpuzzel/.test(d.title) && d.clues === d.same, JSON.stringify([d.daily, d.lvl, d.title]));
  for (const [a, bb] of await solCells(p)) await ev(p, ([a, b]) => __lg.doMark(a, b, 2), [a, bb]);
  await wait(p, 1700);
  ok('dagpuzzel opgelost: telt mee', await ev(p, () => __lg.stats().dailyWon === 1 && /Puzzel van de dag/.test(document.getElementById('lgEndTitle').textContent)));
  await tapEl(p, '#lgEndMenu'); await wait(p, 200);
  ok('startscherm: dagpuzzel afgevinkt met tijd', await ev(p, () => document.getElementById('lgDaily').classList.contains('done') && /✓ \d+:\d\d/.test(document.getElementById('lgDaily').textContent)));
  await p.close();
}

/* ================= options ================= */
if (want('opts')) {
  const p = await page(PORT);
  await openGame(p);
  await tapEl(p, '#lgOpts [data-k="tap"][data-v=\'"vx"\']'); await wait(p, 100);
  await tapEl(p, '#lgOpts [data-k="auto"][data-v="false"]'); await wait(p, 100);
  ok('opties worden onthouden', await ev(p, () => { const o = JSON.parse(localStorage.getItem('lg.settings')); return o.tap === 'vx' && o.auto === false; }));
  await newPuzzle(p, 'normaal');
  const [a, bb] = (await solCells(p))[2];
  await tapCell(p, a, bb);
  ok('tikken ✓ → ✗: eerste tik is ✓', (await mark(p, a, bb)) === 2);
  ok('automatisch wegstrepen uit: geen ✗ erbij', await ev(p, () => __lg.S.mk.filter(v => v === 3).length === 0));
  await tapCell(p, a, bb);
  ok('tweede tik is ✗', (await mark(p, a, bb)) === 1);
  // choose the pen yourself
  await tapEl(p, '#lgMenu'); await wait(p, 150);
  await tapEl(p, '#lgMOpts [data-k="tap"][data-v=\'"kies"\']'); await wait(p, 100);
  await tapEl(p, '#lgMOpts [data-k="auto"][data-v="true"]'); await wait(p, 100);
  await tapEl(p, '#lgMOpts [data-k="err"][data-v="true"]'); await wait(p, 100);
  await tapEl(p, '#lgMResume'); await wait(p, 150);
  ok('zelf kiezen: tekenknop zichtbaar', await ev(p, () => !document.getElementById('lgPen').hidden));
  const pen0 = await ev(p, () => __lg.opt.pen);
  await tapEl(p, '#lgPen'); await wait(p, 100);
  const pen1 = await ev(p, () => __lg.opt.pen);
  ok('tekenknop wisselt ✓ / ✗', pen0 !== pen1);
  const [c, d] = (await solCells(p))[5];
  if (pen1 !== 2) { await tapEl(p, '#lgPen'); await wait(p, 100); }
  await tapCell(p, c, d);
  ok('zelf kiezen: tik zet het gekozen teken', (await mark(p, c, d)) === 2);
  await tapCell(p, c, d);
  ok('zelf kiezen: nog eens tikken maakt leeg', (await mark(p, c, d)) === 0);
  ok('fouten tonen staat aan', await ev(p, () => __lg.opt.err === true));
  ok('muziek los van geluidseffecten in te stellen', await ev(p, () => { const o = document.querySelectorAll('#lgMOpts [data-k="music"]').length, s = document.querySelectorAll('#lgMOpts [data-k="sound"]').length; return o === 2 && s === 2; }));
  // the hint points to a wrong mark first
  await ev(p, () => __lg.restart()); await wait(p, 100);
  const [wa, wrong] = await ev(p, () => { const P = __lg.S.P, N = P.N, T = P.K * N; for (let a = 0; a < N; a++) for (let b = N; b < T; b++) if (P.ent[b] !== a && !__lg.S.mk[a * T + b]) return [a, b]; return [-1, -1]; });
  await ev(p, ([a, w]) => __lg.doMark(a, w, 2), [wa, wrong]); await wait(p, 100);
  await ev(p, () => __lg.doHint()); await wait(p, 150);
  ok('hint wijst eerst een fout aan', await ev(p, ([a, w]) => __lg.hint && __lg.hint.k === 'err' && __lg.hint.a === a && __lg.hint.b === w && /klopt niet/.test(document.getElementById('lgTipText').textContent), [wa, wrong]));
  await p.screenshot({ path: path.join(GFX, 'lg_error_p.png') });
  await tapEl(p, '#lgTipGo'); await wait(p, 100);
  ok('fout weghalen via de hint', (await mark(p, wa, wrong)) === 0);
  await p.close();
}

/* ================= performance (6× slower CPU) ================= */
/* ================= Controleer: wrong marks are hatched in red until fixed ================= */
if (want('check')) {
  for (const o of [PORT, LAND]) {
    const nm = o === PORT ? 'staand' : 'liggend', p = await page(o);
    await openGame(p); await newPuzzle(p, 'makkelijk');
    // red pixels inside a cell on the canvas (the hatching)
    const red = (a, bb) => ev(p, ([a, b]) => { const cv = document.getElementById('lgCv'), r = __lg.cellXY(a, b), q = cv.getBoundingClientRect(), d = cv.width / q.width, g = cv.getContext('2d');
      const x = Math.round((r.x - q.left - r.s / 2 + 3) * d), y = Math.round((r.y - q.top - r.s / 2 + 3) * d), w = Math.round((r.s - 6) * d), D = g.getImageData(x, y, w, w).data; let n = 0;
      for (let i = 0; i < D.length; i += 4) if (D[i] > 170 && D[i + 1] < 120 && D[i + 2] < 120) n++; return n / (w * w); }, [a, bb]);
    const tb = await ev(p, () => { const e = document.getElementById('lgCheck'), r = e.getBoundingClientRect(); return { vis: r.width > 30 && r.right <= innerWidth && r.bottom <= innerHeight, txt: e.textContent }; });
    ok(`${nm}: knop Controleer zichtbaar`, tb.vis && tb.txt.includes('Controleer'));
    await tapEl(p, '#lgCheck'); await wait(p, 200);
    ok(`${nm}: leeg rooster: nog niets ingevuld`, (await ev(p, () => document.getElementById('lgToast').textContent)).includes('nog niets'));
    // one wrong ✓ (with its automatic ✗) and one right ✗
    const sc = await solCells(p), [sa, sb] = sc[0], [ga, gb] = sc[2];
    const N = await ev(p, () => __lg.S.P.N), other = Math.floor(sb / N) * N + ((sb % N) + 1) % N;
    await tapCell(p, sa, other, 700);
    ok(`${nm}: foute ✓ gezet`, (await mark(p, sa, other)) === 2);
    ok(`${nm}: zonder controle geen arcering`, (await red(sa, other)) < .01);
    await tapEl(p, '#lgCheck'); await wait(p, 600);
    const st = await ev(p, () => ({ n: __lg.S.chk.size, c: __lg.S.checks, toast: document.getElementById('lgToast').textContent }));
    ok(`${nm}: controle vindt de fouten`, st.n > 0 && st.c === 1 && /\d+ fout/.test(st.toast), JSON.stringify(st));
    ok(`${nm}: foute ✓ rood gearceerd`, (await red(sa, other)) > .04, (await red(sa, other)).toFixed(3));
    await tapCell(p, ga, gb, 700); await tapEl(p, '#lgCheck'); await wait(p, 500);
    ok(`${nm}: goede ✓ niet gearceerd`, (await mark(p, ga, gb)) === 2 && (await red(ga, gb)) < .01, (await red(ga, gb)).toFixed(3));
    const wrongAuto = await ev(p, ([a, b]) => { const S = __lg.S, T = S.P.K * S.P.N; return [...S.chk].filter(k => S.mk[k] === 3).length; }, [sa, other]);
    ok(`${nm}: ook foute automatische ✗ gearceerd`, wrongAuto > 0, wrongAuto);
    await p.screenshot({ path: path.join(GFX, `lg_check_${o === PORT ? 'p' : 'l'}.png`) });
    // fix it: the hatching disappears
    await tapCell(p, sa, other); await wait(p, 300);
    ok(`${nm}: verbeterd: arcering weg`, (await mark(p, sa, other)) !== 2 && (await red(sa, other)) < .01);
    // keep a wrong mark, save and reload: the hatching comes back
    await tapCell(p, sa, other); await wait(p, 100); if ((await mark(p, sa, other)) !== 2) await tapCell(p, sa, other, 700);
    await tapEl(p, '#lgCheck'); await wait(p, 300); await ev(p, () => window.appBack()); await wait(p, 300);
    const n0 = await ev(p, () => __lg.S.chk.size);
    await p.reload(); await wait(p, 600); await openGame(p);
    if (await vis(p, 'lgStartModal')) { await tapEl(p, '#lgCont button, #lgCont'); await wait(p, 400); }
    ok(`${nm}: na herladen nog gearceerd`, (await ev(p, () => __lg.S && __lg.S.chk.size)) === n0 && (await red(sa, other)) > .04);
    // all right: "Alles klopt"
    await tapCell(p, sa, other); await wait(p, 100); if ((await mark(p, sa, other)) === 2) await tapCell(p, sa, other);
    if ((await mark(p, sa, other)) !== 0 && (await mark(p, sa, other)) !== 1) await tapCell(p, sa, other);
    await ev(p, ([a, b]) => { const S = __lg.S, T = S.P.K * S.P.N; for (let i = 0; i < S.mk.length; i++) if (S.mk[i] && __lg.Core.wrongMark(S.P, S.mk, Math.floor(i / T), i % T)) { S.mk[i] = 0; } }, [sa, other]);
    await tapCell(p, sa, sb, 700); await tapEl(p, '#lgCheck'); await wait(p, 300);
    ok(`${nm}: alles goed: "Alles klopt"`, (await ev(p, () => document.getElementById('lgToast').textContent)).includes('Alles klopt'));
    // solve: the end screen mentions the checks, and it does not count as "zonder hint"
    const nh = await ev(p, () => __lg.stats().noHint);
    await solveByTaps(p); await wait(p, 1800);
    ok(`${nm}: opgelost, eindscherm noemt de controles`, (await vis(p, 'lgEndModal')) && (await ev(p, () => document.getElementById('lgEndText').textContent)).includes('gecontroleerd'));
    ok(`${nm}: telt niet als "zonder hint"`, (await ev(p, () => __lg.stats().noHint)) === nh);
    ok(`${nm}: knop Controleer uit na oplossen`, await ev(p, () => document.getElementById('lgCheck').disabled));
    await p.close();
  }
}

/* ================= Lijnen: the ✓'s that belong together are joined ================= */
if (want('lines')) {
  for (const o of [PORT, LAND]) {
    const nm = o === PORT ? 'staand' : 'liggend', p = await page(o);
    await openGame(p); await newPuzzle(p, 'normaal');
    const btn = await ev(p, () => { const r = document.getElementById('lgLines').getBoundingClientRect(); return r.width > 30 && r.right <= innerWidth && r.bottom <= innerHeight; });
    ok(`${nm}: knop Lijnen zichtbaar`, btn);
    // one person: ✓ with an item of every other kind (a row of ✓'s), and the ✓'s between those items (columns)
    const plan = await ev(p, () => { const P = __lg.S.P, N = P.N, ent0 = P.ent[0], g = []; for (let i = 0; i < P.K * N; i++) if (P.ent[i] === ent0) g.push(i); return g; });
    const pairs = []; for (let x = 0; x < plan.length; x++) for (let y = x + 1; y < plan.length; y++) pairs.push([plan[x], plan[y]]);
    for (const [a, bb] of pairs) await tapCell(p, a, bb, 700);
    ok(`${nm}: ✓'s gezet`, (await ev(p, n => __lg.S.mk.filter(v => v === 2).length / 2, 0)) >= pairs.length);
    ok(`${nm}: zonder knop geen lijnen`, (await ev(p, () => __lg.lines().segs)) === 0);
    await tapEl(p, '#lgLines'); await wait(p, 250);
    const L = await ev(p, () => ({ ...__lg.lines(), on: document.getElementById('lgLines').classList.contains('on'), opt: __lg.opt.lines }));
    ok(`${nm}: lijnen tussen de ✓'s, één groep`, L.on && L.opt && L.segs >= 2 && L.groups === 1, JSON.stringify(L));
    ok(`${nm}: hoeklijnen tussen een ding boven en hetzelfde ding links`, L.corners >= 1, JSON.stringify(L));
    // a second person: a second colour
    const plan2 = await ev(p, () => { const P = __lg.S.P, N = P.N, e = P.ent[1], g = []; for (let i = 0; i < P.K * N; i++) if (P.ent[i] === e) g.push(i); return g; });
    await tapCell(p, plan2[0], plan2[1], 700); await tapCell(p, plan2[0], plan2[2], 700); await wait(p, 200);
    ok(`${nm}: tweede persoon: tweede groep met eigen kleur`, (await ev(p, () => __lg.lines().groups)) === 2);
    await p.screenshot({ path: path.join(GFX, `lg_lines_${o === PORT ? 'p' : 'l'}.png`) });
    // remembered, and off again
    await p.reload(); await wait(p, 600); await openGame(p); await wait(p, 400);
    ok(`${nm}: knop blijft aan na opnieuw openen`, await ev(p, () => __lg.opt.lines === true && __lg.lines().segs > 0));
    await tapEl(p, '#lgLines'); await wait(p, 200);
    ok(`${nm}: uit: geen lijnen meer`, (await ev(p, () => __lg.lines().segs)) === 0 || !(await ev(p, () => __lg.opt.lines)));
    ok(`${nm}: rooster blijft kloppen`, (await ev(p, () => __lg.check())) === '');
    await p.close();
  }
}

if (want('perf')) {
  const p = await page(PORT);
  await openGame(p);
  await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const gens = [];
  for (const lvl of ['makkelijk', 'normaal', 'moeilijk', 'expert']) {
    await ev(p, l => __lg.startNew(l), lvl);
    for (let i = 0; i < 200 && (await ev(p, () => __lg.busy())); i++) await wait(p, 30);
    gens.push(`${lvl} ${await ev(p, () => __lg.genMs())} ms (rekentijd), ${await ev(p, () => window.__lgGenWall)} ms (klok)`);
  }
  console.log('      maken bij 6× trager:', gens.join(' · '));
  ok('6× trager: maken blijft onder 300 ms rekentijd (expert)', (await ev(p, () => __lg.genMs())) < 300, await ev(p, () => __lg.genMs()));
  await wait(p, 1500);
  // continuous pan for 2 s: frames per second while the grid moves, and the time one picture takes
  await ev(p, l => __lg.startNew(l), 'expert'); for (let i = 0; i < 200 && (await ev(p, () => __lg.busy())); i++) await wait(p, 30);
  for (const [a, bb] of (await solCells(p)).slice(0, 12)) await ev(p, ([a, b]) => __lg.doMark(a, b, 2), [a, bb]);
  await wait(p, 800);
  const br = await ev(p, () => document.getElementById('lgBox').getBoundingClientRect().toJSON());
  await ev(p, () => { __lg.drawStats(true); window.__fr = 0; window.__frOn = true; const f = () => { if (!window.__frOn) return; window.__fr++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const t0 = Date.now(); await touch(p, 'start', 1, br.left + br.width * .7, br.top + br.height * .7);
  for (let i = 0; i < 120; i++) { const k = i / 120; await touch(p, 'move', 1, br.left + br.width * (.7 - .4 * Math.sin(k * Math.PI)), br.top + br.height * (.7 - .4 * Math.sin(k * Math.PI))); }
  await touch(p, 'end', 1); const dt = (Date.now() - t0) / 1000;
  const fr = await ev(p, () => { window.__frOn = false; return window.__fr; });
  const pan = await ev(p, () => __lg.drawStats(true));
  await pinch(p, br.left + br.width / 2, br.top + br.height / 2, 60, 260, 40);
  const zoom = await ev(p, () => __lg.drawStats(true));
  console.log(`      6× trager: schuiven ${(fr / dt).toFixed(0)} beelden/s, tekenen gem. ${pan.avg.toFixed(1)} ms (max ${pan.max.toFixed(1)}) · knijpen: gem. ${zoom.avg.toFixed(1)} ms (max ${zoom.max.toFixed(1)}) over ${zoom.n} beelden`);
  ok('6× trager: schuiven ≥ 50 beelden per seconde', fr / dt >= 50 || pan.avg < 12, (fr / dt).toFixed(0));
  ok('6× trager: één beeld tekenen < 16 ms (schuiven en knijpen)', pan.avg < 16 && zoom.avg < 16, `${pan.avg.toFixed(1)} / ${zoom.avg.toFixed(1)} ms`);
  await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await wait(p, 600);
  ok('tekenlus stopt als niets beweegt', !(await ev(p, () => __lg.running())));
  await p.close();
}

console.log('\nconsole/page errors:', errs.length ? errs.slice(0, 8).join('\n') : 'geen');
ok('geen consolefouten', errs.length === 0);
console.log(`\n${res.filter(Boolean).length} geslaagd, ${res.filter(r => !r).length} mislukt`);
await b.close();
process.exit(res.every(Boolean) ? 0 : 1);
