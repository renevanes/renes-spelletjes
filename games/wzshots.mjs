import { existsSync, mkdirSync } from 'node:fs';
// Woordzoeker screenshots -> build/gfx/wz_*.png, then: python3 games/wzsheet.py
//   node games/wzshots.mjs [path-to-index.html]
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), G = path.join(here, '..', 'build', 'gfx'); mkdirSync(G, { recursive: true });
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'wztest', 'index.html'));
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [];
const STATS = JSON.stringify({ played: 31, solved: 27, words: 412, hints: 9, secrets: 18, best: { mk: 74, nm: 166, md: 341, ex: 612 }, byLv: { mk: 6, nm: 12, md: 7, ex: 2 }, daily: {}, dailyWon: 4, recent: [] });
async function page(port, cfg = '{"seen":"9.99","mute":true}') {
  const ctx = await b.newContext({ viewport: port ? { width: 412, height: 915 } : { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(([c, s]) => { localStorage.setItem('app.cfg', c); localStorage.setItem('wz.stats', s); }, [cfg, STATS]);
  await p.goto(target); await p.waitForFunction(() => window.__wz, null, { timeout: 20000 }); await p.waitForTimeout(400); return p;
}
const ev = (p, f, a) => p.evaluate(f, a), wait = (p, ms) => p.waitForTimeout(ms), shot = (p, n, clip) => p.screenshot({ path: path.join(G, `wz_${n}.png`), clip });
const open = async p => { await ev(p, () => document.getElementById('tileWz').click()); await wait(p, 500); };
// find some words (by index), give a hint, freeze the clock at a nice time
const play = (p, lv, seed, th, found, o = {}) => ev(p, ([lv, seed, th, found, o]) => {
  __wz.begin(lv, seed, th); const P = __wz.P;
  for (const k of found) if (k < P.words.length) __wz.commit(__wz.cellsOf(P.words[k], P.n));
  if (o.hint) __wz.useHint();
  __wz.G.time = o.t || 95;
}, [lv, seed, th, found, o]);
// a live selection, drawn as during a swipe
const dragTo = async (p, k, part = 1) => {
  const ends = await ev(p, ([k, part]) => { const c = __wz.cellsOf(__wz.P.words[k], __wz.P.n); return [__wz.xy(c[0]), __wz.xy(c[Math.max(1, Math.round((c.length - 1) * part))])]; }, [k, part]);
  p.cdp = p.cdp || await p.context().newCDPSession(p); const T = (type, pts) => p.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await T('touchStart', [{ x: ends[0].x, y: ends[0].y, id: 9 }]); for (let j = 1; j <= 5; j++) { await T('touchMove', [{ x: ends[0].x + (ends[1].x - ends[0].x) * j / 5, y: ends[0].y + (ends[1].y - ends[0].y) * j / 5, id: 9 }]); await wait(p, 20); }
  p.release = () => T('touchEnd', []);
};

// portrait
let p = await page(true);
await ev(p, () => document.getElementById('tileWz').scrollIntoView({ block: 'center' })); await wait(p, 200);
const tr = await ev(p, () => { const r = document.getElementById('tileWz').getBoundingClientRect(); return { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12 }; });
await shot(p, 'menu_tile', tr);
await open(p); await shot(p, 'start');
await ev(p, () => { document.getElementById('wzThemeBox').open = true; document.querySelector('.wz-help').open = false; document.querySelector('#wzStartModal .sheet').scrollTop = 260; }); await wait(p, 150); await shot(p, 'themes');
await ev(p, () => { document.getElementById('wzThemeBox').open = false; document.querySelector('.wz-help').open = true; document.querySelector('#wzStartModal .sheet').scrollTop = 330; }); await wait(p, 150); await shot(p, 'howto');
await play(p, 0, 31, 'dieren', [0, 2, 4], { t: 48 }); await wait(p, 900); await shot(p, 'makkelijk');
await play(p, 1, 77, 'fruit', [0, 1, 3, 5, 7], { t: 131 }); await wait(p, 900);
await dragTo(p, 2, .6); await wait(p, 120); await shot(p, 'normaal_drag'); await p.release(); await wait(p, 600);
await play(p, 2, 5150, 'ruimte', [0, 2, 3, 5, 8, 9, 12], { hint: true, t: 204 }); await wait(p, 500); await shot(p, 'moeilijk_hint');
await play(p, 3, 4242, 'zee', [1, 4, 6, 9, 11, 15, 18, 20], { t: 377 }); await wait(p, 900); await shot(p, 'expert');
// the hidden word: everything found, two letters placed
await play(p, 1, 2024, 'feest', [], { t: 251 });
await ev(p, () => { const P = __wz.P; P.words.forEach(w => __wz.commit(__wz.cellsOf(w, P.n))); }); await wait(p, 900);
await ev(p, () => { const L = __wz.leftover(), G = __wz.G; for (let j = 0; j < 2; j++) __wz.tapTile(G.tiles.find(t => L[t] === L[j] && !G.slots.includes(t))); __wz.G.time = 251; }); await wait(p, 400);
await shot(p, 'secret');
await ev(p, () => { const L = __wz.leftover(), G = __wz.G; for (let j = G.slots.length; j < L.length; j++) __wz.tapTile(G.tiles.find(t => L[t] === L[j] && !G.slots.includes(t))); }); await wait(p, 2200);
await shot(p, 'solved');
await p.close();
// big text
p = await page(true, '{"seen":"9.99","mute":true,"text":"groot"}');
await open(p); await play(p, 2, 9911, 'speelgoed', [0, 3, 4, 7], { t: 160 }); await wait(p, 900); await shot(p, 'bigtext');
await p.close();
// landscape
p = await page(false);
await open(p); await play(p, 3, 1234, 'vervoer', [0, 2, 3, 6, 9, 10, 14], { t: 288 }); await wait(p, 900); await shot(p, 'landscape');
await play(p, 1, 818, 'kleuren', [], { t: 12 });
await ev(p, () => { const P = __wz.P; P.words.forEach(w => __wz.commit(__wz.cellsOf(w, P.n))); }); await wait(p, 900); await shot(p, 'landscape_secret');
await ev(p, () => { __wz.G.time = 3; }); await ev(p, () => document.getElementById('wzMenu').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await wait(p, 400); await shot(p, 'landscape_start');
await p.close();
await b.close();
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'errors []');
