import { existsSync } from 'node:fs';
// Woordzoeker fuzz test: random swipes, taps and button presses with real touch input; after every round the view must agree
// with the rules state, the clock and animation times must be finite, and nothing may throw.
//   node games/wzfuzz.mjs [path-to-index.html]   (ROUNDS=n, SEED=n)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'wztest', 'index.html'));
const ROUNDS = +(process.env.ROUNDS || 80);
let seed = +(process.env.SEED || 20261116); const R = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; }, pick = a => a[Math.floor(R() * a.length)];
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { if (!localStorage.getItem('wz.test.init')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); localStorage.setItem('wz.test.init', '1'); } });
await p.goto(target); await p.waitForFunction(() => window.__wz, null, { timeout: 20000 }); await p.waitForTimeout(300);
const cdp = await ctx.newCDPSession(p);
const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const tap = async (x, y) => { await T('touchStart', [{ x, y, id: 1 }]); await wait(30); await T('touchEnd', []); await wait(40); };
const tapSel = async s => { const r = await ev(s => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const q = e.getBoundingClientRect(); return q.width ? { x: q.left + q.width / 2, y: q.top + q.height / 2 } : null; }, s); if (r) await tap(r.x, r.y); return !!r; };
const box = () => ev(() => { const q = document.getElementById('wzFx').getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; });
await ev(() => document.getElementById('tileWz').click()); await wait(400);
await ev(() => document.getElementById('wzGo').click()); await wait(400);
const stats = { swipes: 0, taps: 0, found: 0, hints: 0, solved: 0, secrets: 0, restarts: 0, menus: 0, leaves: 0, turns: 0, bad: [] };
for (let round = 0; round < ROUNDS; round++) {
  const scr = await ev(() => __wz.cur());
  if (scr !== 'wz') { await ev(() => document.getElementById('tileWz').click()); await wait(300); }
  if (await ev(() => !!document.querySelector('.modal.show'))) {
    // a dialog: continue, start a new puzzle (any level), or answer the question
    const m = await ev(() => document.querySelector('.modal.show').id);
    if (m === 'askModal') await ev(s => document.querySelector(s).click(), R() < .5 ? '#askYes' : '#askNo');   // the app's shared dialog (not part of this game)
    else if (m === 'wzStartModal') { if (R() < .4 && await tapSel('#wzCont')) { /* continue */ } else { await ev(lv => document.querySelector(`#wzLevels [data-lv="${lv}"]`).click(), Math.floor(R() * 4)); await tapSel('#wzGo'); } }
    else if (m === 'wzEndModal') await tapSel(R() < .7 ? '#wzEndNext' : '#wzEndMenu');
    else await ev(() => window.appBack());
    await wait(250);
  }
  const before = await ev(() => __wz.G && __wz.G.found.length);
  for (let k = 0; k < 14; k++) {
    if (await ev(() => __wz.cur() !== 'wz' || !!document.querySelector('.modal.show'))) break;   // only play on the game screen itself
    const r = R(), B = await box(), ph = await ev(() => __wz.G && __wz.G.phase);
    if (ph === 'secret' && r < .5) {                                         // play with the hidden word
      const q = R();
      if (q < .6) await tapSel(`#wzTiles button:nth-child(${1 + Math.floor(R() * 10)})`);
      else if (q < .75) await tapSel('#wzSlots b.on');
      else if (q < .85) await tapSel('#wzSecClear');
      else if (q < .9) await tapSel('#wzSecShow');
      else { const L = await ev(() => __wz.leftover()); for (const ch of L) { const t = await ev(ch => { const b = [...document.querySelectorAll('#wzTiles button')].find(b => b.textContent === ch && !b.classList.contains('used')); return b ? b.dataset.t : null; }, ch); if (t == null) break; await tapSel(`#wzTiles button[data-t="${t}"]`); } }
      continue;
    }
    if (r < .38) {                                                          // a random swipe (sometimes off the board, sometimes very short)
      const x0 = B.x + R() * B.w, y0 = B.y + R() * B.h, x1 = x0 + (R() - .5) * B.w * 1.4, y1 = y0 + (R() - .5) * B.h * 1.4, n = 2 + Math.floor(R() * 6);
      await T('touchStart', [{ x: x0, y: y0, id: 2 }]); for (let j = 1; j <= n; j++) { await T('touchMove', [{ x: x0 + (x1 - x0) * j / n, y: y0 + (y1 - y0) * j / n, id: 2 }]); await wait(8); } await T('touchEnd', []);
      stats.swipes++;
    } else if (r < .62) {                                                   // a real word (or a near miss): swipe it, sometimes backwards
      const w = await ev(() => { const P = __wz.P, G = __wz.G; if (!P || !G) return null; const left = P.words.map((_, k) => k).filter(k => !G.found.includes(k)); const k = left.length && Math.random() < .85 ? left[Math.floor(Math.random() * left.length)] : Math.floor(Math.random() * P.words.length); const c = __wz.cellsOf(P.words[k], P.n); return [__wz.xy(c[0]), __wz.xy(c[c.length - 1 - (Math.random() < .1 ? 1 : 0)])]; });
      if (w) { const [A, Z] = R() < .5 ? w : [w[1], w[0]]; await T('touchStart', [{ x: A.x, y: A.y, id: 3 }]); for (let j = 1; j <= 5; j++) { await T('touchMove', [{ x: A.x + (Z.x - A.x) * j / 5, y: A.y + (Z.y - A.y) * j / 5, id: 3 }]); await wait(10); } await T('touchEnd', []); stats.swipes++; }
    } else if (r < .8) { await tap(B.x + R() * B.w, B.y + R() * B.h); stats.taps++; }       // taps: first letter, last letter
    else if (r < .86) { await tapSel('#wzHint'); stats.hints++; }
    else if (r < .89) { await tapSel('#wzRetry'); stats.restarts++; }
    else if (r < .92) { await tapSel('#wzMenu'); stats.menus++; }
    else if (r < .94) { await ev(() => window.appBack()); stats.leaves++; }
    else if (r < .96) { const land = R() < .5; await p.setViewportSize(land ? { width: 915, height: 412 } : { width: 412, height: 915 }); stats.turns++; }
    else if (r < .98) { await tapSel('#wzList .wz-w.f'); }
    else { await ev(() => { document.dispatchEvent(new Event('visibilitychange')); }); }
    await wait(20 + R() * 60);
  }
  // let everything settle, then the view must match the state
  await wait(700);
  const st = await ev(() => ({ cur: __wz.cur(), check: __wz.check(), t: __wz.G ? __wz.G.time : 0, found: __wz.G ? __wz.G.found.length : 0, ph: __wz.G && __wz.G.phase, sec: __wz.stats().secrets, solved: __wz.stats().solved }));
  if (st.cur === 'wz' && st.check.length) stats.bad.push(`round ${round}: ${st.check.join(', ')}`);
  if (!Number.isFinite(st.t)) stats.bad.push(`round ${round}: time ${st.t}`);
  stats.found += Math.max(0, st.found - (before || 0)); stats.solved = st.solved; stats.secrets = st.sec;
  if ((await ev(() => __wz.loopOn())) && !(await ev(() => __wz.busy()))) { await wait(400); if ((await ev(() => __wz.loopOn())) && !(await ev(() => __wz.busy()))) stats.bad.push(`round ${round}: loop runs while idle`); }
  // every few rounds: solve the rest by code to reach the hidden word and the end screen more often
  if (round % 6 === 5 && st.cur === 'wz' && st.ph === 'play') await ev(() => { const P = __wz.P, G = __wz.G; if (!P || !G || G.phase !== 'play') return; P.words.forEach((w, k) => { if (!G.found.includes(k) && Math.random() < .9) __wz.commit(__wz.cellsOf(w, P.n)); }); });
}
await b.close();
console.log('fuzz:', JSON.stringify({ ...stats, bad: stats.bad.length }));
if (stats.bad.length) console.log(stats.bad.slice(0, 10).join('\n'));
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 10).join('\n') : 'errors []');
const okAll = !errs.length && !stats.bad.length && stats.swipes >= ROUNDS / 2 && stats.found >= ROUNDS / 4 && stats.solved >= 2;
console.log(okAll ? 'ALL PASS' : 'FAIL');
process.exit(okAll ? 0 : 1);
