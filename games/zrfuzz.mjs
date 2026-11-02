import { existsSync } from 'node:fs';
// Zandrijk fuzz test: random real touches on the map (taps, double taps, drags, pinches), the build bar, the command
// buttons, the minimap, the back button, pause, turning the phone, reloads and fast-forwarded play. Asserts: no errors,
// no hang, all numbers finite, units never inside walls for long, the render loop stops in menus, the pause and results.
//   node games/zrfuzz.mjs [path-to-index.html]   (ROUNDS=n, default 40)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'zrtest', 'index.html'));
const ROUNDS = +(process.env.ROUNDS || 40);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); sessionStorage.setItem('init', 1); } });
await p.goto(target); await p.waitForTimeout(500);
const cdp = await ctx.newCDPSession(p), tp = new Map();
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ev = (f, a) => Promise.race([p.evaluate(f, a), new Promise((_, rej) => setTimeout(() => rej(new Error('hang')), 10000))]);
const wait = ms => p.waitForTimeout(ms);
async function touch(type, id, x, y) {
  if (type === 'end') tp.delete(id); else tp.set(id, { x, y, id });
  await cdp.send('Input.dispatchTouchEvent', { type: type === 'start' ? 'touchStart' : type === 'move' ? 'touchMove' : 'touchEnd', touchPoints: [...tp.values()].map(t => ({ x: t.x, y: t.y, id: t.id, radiusX: 4, radiusY: 4, force: 1 })) });
}
const tap = async (x, y) => { await touch('start', 1, x, y); await wait(25); await touch('end', 1); };
const open = async () => { await ev(() => document.getElementById('tileZr').click()); await wait(600); };
let bad = [], idleChecks = 0, matches = 0, actions = 0, ends = 0;
const check = async tag => { const r = await ev(() => ({ fin: __zr.finite(), walls: !__zr.S || __zr.S.U.filter(u => !__zr.Core.passT(__zr.S, __zr.Core.tileOf(__zr.S, u.x, u.y))).length })); if (!r.fin) bad.push('niet eindig: ' + tag); if (r.walls > 3) bad.push(`${r.walls} eenheden in een muur: ${tag}`); };
const idle = async tag => { await wait(450); idleChecks++; if (await ev(() => __zr.running())) bad.push('lus loopt nog: ' + tag); };
const stageRect = () => ev(() => { const r = document.getElementById('zrCv').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
async function randomAction() {
  const k = rnd(); actions++; const R = await stageRect(), px = () => R.x + 10 + rnd() * (R.w - 20), py = () => R.y + 10 + rnd() * (R.h - 20);
  if (k < .3) await tap(px(), py());                                                       // tap the map
  else if (k < .4) { const id = await ev(r => { const us = __zr.S.U.filter(u => u.o === 0); return us.length ? us[Math.floor(r * us.length)].id : 0; }, rnd()); if (id) { const c = await ev(id => { const u = __zr.S.E[id]; return u ? __zr.toClient(u.x, u.y) : null; }, id); if (c) { await tap(c.x, c.y); if (rnd() < .4) { await wait(50); await tap(c.x, c.y); } } } }
  else if (k < .5) { const x = px(), y = py(); await touch('start', 2, x, y); for (let i = 1; i <= 4; i++) { await touch('move', 2, x + (rnd() - .5) * 200, y + (rnd() - .5) * 120); await wait(15); } await touch('end', 2); }
  else if (k < .56) { const x = px(), y = py(), s = rnd() < .5 ? 1 : -1; await touch('start', 3, x - 30, y); await touch('start', 4, x + 30, y); for (let i = 1; i <= 4; i++) { await touch('move', 3, x - 30 - s * i * 12, y); await touch('move', 4, x + 30 + s * i * 12, y); await wait(15); } await touch('end', 3); await touch('end', 4); }
  else if (k < .72) await ev(r => { const bs = [...document.querySelectorAll('#zrBuild .zr-bi, #zrTabs button')]; if (bs.length) bs[Math.floor(r * bs.length)].click(); }, rnd());
  else if (k < .84) await ev(r => { const bs = [...document.querySelectorAll('#zrCmd button, #zrPlace button')].filter(b => b.offsetParent); if (bs.length) bs[Math.floor(r * bs.length)].click(); }, rnd());
  else if (k < .89) { const m = await ev(() => { const r = __zr.miniRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); if (m.w > 5) await tap(m.x + rnd() * m.w, m.y + rnd() * m.h); }
  else if (k < .93) await ev(() => window.appBack());
  else await ev(r => { __zr.cmd({ c: 'build', t: ['cent', 'raff', 'kaz', 'sol', 'lt', 'fab'][Math.floor(r * 6)] }); }, rnd());
  await wait(30 + rnd() * 120);
}
await open();
for (let r = 0; r < ROUNDS; r++) {
  try {
    const k = rnd();
    if (k < .55) {                                          // a match with random play
      matches++;
      if (rnd() < .5) await ev(s => __zr.startSkirmish({ fac: s % 3, opp: 1 + (s % 2), diff: s % 3, size: ['klein', 'middel', 'groot'][s % 3], cry: 5000, seed: s }), Math.floor(rnd() * 1e6));
      else await ev(i => __zr.startMission(i, 0), Math.floor(rnd() * 9));
      await wait(500);
      await ev(() => { window.__zrSpeed = 3; });
      const n = 10 + Math.floor(rnd() * 20);
      for (let i = 0; i < n; i++) {
        await randomAction();
        const q = rnd();
        if (q < .05) { await ev(() => __zr.openPause()); const t0 = await ev(() => __zr.S && __zr.S.t); await idle('pauze'); if (t0 !== await ev(() => __zr.S && __zr.S.t)) bad.push('pauze staat niet stil'); await ev(() => { const b = document.getElementById('zrPResume'); if (document.getElementById('zrPauseModal').classList.contains('show')) b.click(); }); }
        else if (q < .08) { await p.setViewportSize({ width: 412, height: 915 }); await wait(250); await randomAction(); await p.setViewportSize({ width: 915, height: 412 }); await wait(250); }
        else if (q < .1) { await ev(() => __zr.saveGame()); await p.reload(); await wait(700); await open(); if (await ev(() => !document.getElementById('zrContinue').hidden)) { await ev(() => document.getElementById('zrContinue').click()); await wait(500); await ev(() => document.getElementById('zrPResume').click()); await ev(() => { window.__zrSpeed = 3; }); } else break; }
        if (await ev(() => !__zr.G || __zr.G.view !== 'play')) break;
        if (await ev(() => document.getElementById('zrEndModal').classList.contains('show'))) break;
        if (await ev(() => document.getElementById('zrPauseModal').classList.contains('show'))) await ev(() => document.getElementById('zrPResume').click());
      }
      if (await ev(() => __zr.G && __zr.G.view === 'play')) {
        await check('potje');
        if (rnd() < .3) {                                   // play it out fast: the computer takes over our side
          await ev(() => { const S = __zr.S; S.P[0].ai = 2; __zr.AI.init(S, S.P[0]); window.__zrSpeed = 40; });
          for (let i = 0; i < 60 && !(await ev(() => document.getElementById('zrEndModal').classList.contains('show'))); i++) await wait(250);
          if (await ev(() => document.getElementById('zrEndModal').classList.contains('show'))) { ends++; await idle('eindscherm'); }
          await ev(() => { window.__zrSpeed = 0; });
        }
      }
      await ev(() => { window.__zrSpeed = 0; });
      const q = rnd();
      if (q < .5) { await ev(() => __zr.openStart()); await idle('startscherm'); }
      else { await ev(() => __zr.quit()); await idle('menu'); await open(); }
    } else if (k < .75) {                                   // menus: campaign, briefing, skirmish dialogs
      await ev(() => __zr.openStart());
      for (let i = 0; i < 6; i++) { await ev(r => { const bs = [...document.querySelectorAll('.modal.show button')].filter(b => !/Go$|Continue|PResume|StartBack/.test(b.id)); if (bs.length) bs[Math.floor(r * bs.length)].click(); }, rnd()); await wait(120); if (await ev(() => __zr.cur() !== 'zr')) { await open(); break; } }
      if (await ev(() => __zr.G && __zr.G.view === 'play')) await ev(() => __zr.openStart());
      if (await ev(() => __zr.cur() === 'zr')) await idle('menu-dialogen');
    } else {                                                // back button storm
      for (let i = 0; i < 4; i++) { await ev(() => window.appBack()); await wait(150); }
      if (await ev(() => __zr.cur() !== 'zr')) await open();
    }
  } catch (e) { bad.push('fout in ronde ' + r + ': ' + e.message); try { await ev(() => 1); } catch (e2) { break; } }
}
await check('einde');
console.log(`zrfuzz: ${ROUNDS} rondes, ${matches} potjes, ${actions} acties, ${ends} uitgespeeld, ${idleChecks} rustcontroles`);
console.log('problemen:', bad.length ? bad.join('\n') : 'geen');
console.log('console/page errors:', errs.length ? errs.slice(0, 8).join('\n') : 'geen');
await b.close();
process.exit(bad.length || errs.length ? 1 : 0);
