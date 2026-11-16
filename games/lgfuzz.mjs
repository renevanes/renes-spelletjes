import { existsSync } from 'node:fs';
// Logigram fuzz test: random taps, long presses, drags, pinches, tool buttons, hints, clue taps, tabs, options,
// back/resume, rotation, reloads and restarts on the real UI (touch input). After every step the game state must be
// consistent (marks valid and symmetric, the undo list replays to the grid, clock and view finite) and nothing may throw.
//   node games/lgfuzz.mjs [index.html]     STEPS=700 SEED=1
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'lgtest', 'index.html'));
const STEPS = +(process.env.STEPS || 700);
let seed = +(process.env.SEED || 1);
const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = a => a[Math.floor(R() * a.length)];
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); sessionStorage.setItem('init', 1); } });
await p.goto(target); await p.waitForTimeout(500);
let cdp = await ctx.newCDPSession(p); const tp = new Map();
const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
async function touch(type, id, x, y) {
  if (type === 'end') tp.delete(id); else tp.set(id, { x, y, id });
  await cdp.send('Input.dispatchTouchEvent', { type: type === 'start' ? 'touchStart' : type === 'move' ? 'touchMove' : 'touchEnd', touchPoints: [...tp.values()].map(t => ({ x: t.x, y: t.y, id: t.id, radiusX: 4, radiusY: 4, force: 1 })) });
}
const tap = async (x, y, hold = 30) => { await touch('start', 1, x, y); await wait(hold); await touch('end', 1); await wait(30); };
const tapEl = async sel => { const r = await ev(s => { const e = document.querySelector(s); if (!e || e.offsetParent === null) return null; const q = e.getBoundingClientRect(); return q.width ? { x: q.left + q.width / 2, y: q.top + q.height / 2 } : null; }, sel); if (r) await tap(r.x, r.y); return !!r; };
const box = () => ev(() => document.getElementById('lgBox').getBoundingClientRect().toJSON());
async function ensureGame() {
  const st = await ev(() => ({ scr: document.querySelector('.screen.active').id, s: !!__lg.S, done: __lg.S && __lg.S.done, busy: __lg.busy(), start: document.getElementById('lgStartModal').classList.contains('show'), end: document.getElementById('lgEndModal').classList.contains('show'), ask: document.getElementById('askModal').classList.contains('show'), menu: document.getElementById('lgMenuModal').classList.contains('show') }));
  if (st.busy) { await wait(120); return; }
  if (st.ask) { await tapEl(R() < .5 ? '#askYes' : '#askNo'); return; }
  if (st.scr === 'menu') { await ev(() => document.getElementById('tileLg').scrollIntoView({ block: 'center' })); await tapEl('#tileLg'); await wait(250); return; }
  if (st.end) { await tapEl(R() < .5 ? '#lgEndNew' : '#lgEndMenu'); await wait(150); return; }
  if (st.menu) { await tapEl(pick(['#lgMResume', '#lgMResume', '#lgMNew', '#lgMOpts [data-k="tap"]', '#lgMOpts [data-k="auto"][data-v="false"]', '#lgMOpts [data-k="err"][data-v="true"]', '#lgMOpts [data-k="auto"][data-v="true"]'])); await wait(80); return; }
  if (st.start || !st.s || st.done) {
    if (!(await ev(() => document.getElementById('lgStartModal').classList.contains('show')))) { await ev(() => __lg.openStart()); await wait(100); }
    await tapEl(`#lgLevels [data-l="${pick(['makkelijk', 'normaal', 'normaal', 'moeilijk', 'expert'])}"]`);
    await tapEl(R() < .15 ? '#lgDaily' : R() < .2 && st.s && !st.done ? '#lgCont' : '#lgGo');
    for (let i = 0; i < 80 && (await ev(() => __lg.busy())); i++) await wait(40);
    if (await ev(() => document.getElementById('askModal').classList.contains('show'))) await tapEl('#askYes');
    for (let i = 0; i < 80 && (await ev(() => __lg.busy())); i++) await wait(40);
  }
}
const counts = {};
let bad = '', step = 0;
for (; step < STEPS && !bad && !errs.length; step++) {
  await ensureGame();
  if (!(await ev(() => !!__lg.S && !__lg.busy() && document.querySelector('.screen.active').id === 'lg'))) continue;
  const r = await box(), x = r.left + R() * r.width, y = r.top + R() * r.height;
  const act = pick(['tap', 'tap', 'tap', 'tap', 'cell', 'cell', 'cell', 'long', 'drag', 'pinch', 'undo', 'undo', 'redo', 'hint', 'hintgo', 'tipx', 'fit', 'pen', 'clue', 'tab', 'menu', 'back', 'rotate', 'reload', 'restart', 'solve', 'wheel']);
  counts[act] = (counts[act] || 0) + 1;
  switch (act) {
    case 'tap': await tap(x, y); break;
    case 'cell': { const q = await ev(() => { const P = __lg.S.P, N = P.N, a = Math.floor(Math.random() * N), c = 1 + Math.floor(Math.random() * (P.K - 1)), bb = c * N + Math.floor(Math.random() * N); __lg.reveal(a, bb); return [a, bb]; }); await wait(30); const c = await ev(([a, bb]) => __lg.cellXY(a, bb), q); await tap(c.x, c.y); break; }
    case 'long': await tap(x, y, 560); break;
    case 'drag': { await touch('start', 1, x, y); for (let i = 1; i <= 6; i++) { await touch('move', 1, x + (R() - .5) * 60 * i, y + (R() - .5) * 60 * i); await wait(12); } await touch('end', 1); break; }
    case 'pinch': { const d0 = 40 + R() * 100, d1 = 40 + R() * 200; await touch('start', 1, x - d0 / 2, y); await touch('start', 2, x + d0 / 2, y); for (let i = 1; i <= 5; i++) { const d = d0 + (d1 - d0) * i / 5; await touch('move', 1, x - d / 2, y); await touch('move', 2, x + d / 2, y); await wait(12); } await touch('end', 2); if (R() < .5) { await touch('move', 1, x + 30, y + 10); } await touch('end', 1); break; }
    case 'undo': await tapEl('#lgUndo'); break;
    case 'redo': await tapEl('#lgRedo'); break;
    case 'hint': await tapEl('#lgHintB'); break;
    case 'hintgo': await tapEl('#lgTipGo'); break;
    case 'tipx': await tapEl('#lgTipX'); break;
    case 'fit': await tapEl('#lgFit'); break;
    case 'pen': await tapEl('#lgPen'); break;
    case 'clue': { const n = await ev(() => document.querySelectorAll('#lgClues li').length); if (n) await tapEl(`#lgClues li[data-i="${Math.floor(R() * n)}"]`); break; }
    case 'tab': await tapEl(`#lgTabs [data-t="${pick(['c', 's'])}"]`); break;
    case 'menu': await tapEl('#lgMenu'); break;
    case 'back': await ev(() => window.appBack()); await wait(80); if (R() < .7) { await ev(() => document.getElementById('tileLg').scrollIntoView({ block: 'center' })); await tapEl('#tileLg'); await wait(200); } break;
    case 'rotate': { const land = await ev(() => innerWidth > innerHeight); await p.setViewportSize(land ? { width: 412, height: 915 } : { width: 915, height: 412 }); await wait(200); break; }
    case 'reload': await p.reload(); await wait(500); cdp = await ctx.newCDPSession(p); tp.clear(); break;
    case 'restart': await ev(() => __lg.restart()); break;
    case 'solve': if (R() < .3) await ev(() => { const P = __lg.S.P, N = P.N; for (let c = 1; c < P.K; c++) for (let j = 0; j < N; j++) __lg.doMark(P.ent[c * N + j], c * N + j, 2); }); break;
    case 'wheel': await p.mouse.move(x, y); await p.mouse.wheel(0, (R() - .5) * 400); break;
  }
  await wait(20);
  const c = await ev(() => __lg.S ? __lg.check() : '');
  if (c) bad = `stap ${step} (${act}): ${c}`;
  const fin = await ev(() => [__lg.V.cs, __lg.V.ox, __lg.V.oy, __lg.S ? __lg.S.t : 0].every(Number.isFinite));
  if (!fin) bad = `stap ${step} (${act}): niet eindig`;
}
// after all that: it settles (no endless drawing loop), and the saved game reads back
await wait(800);
const idle = await ev(() => !__lg.running());
const saveOk = await ev(() => { const d = localStorage.getItem('lg.save'); if (!d || !__lg.S || __lg.S.done) return true; const L = __lg.load(); return !!L && L.mk.join('') === __lg.S.mk.join(''); });
console.log('acties:', Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`${step} stappen · ${bad || 'staat steeds consistent'} · tekenlus stil: ${idle} · opslag klopt: ${saveOk} · fouten: ${errs.length ? errs.slice(0, 5).join('\n') : 'geen'}`);
await b.close();
const pass = !bad && !errs.length && idle && saveOk;
console.log(pass ? 'PASS lgfuzz' : 'FAIL lgfuzz');
process.exit(pass ? 0 : 1);
