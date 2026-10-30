import { existsSync } from 'node:fs';
// Woef tegen Karel fuzz test: random real taps on the room, the backpack, hint, bark and close-up buttons, the back button,
// pause, restart, reload, turning the phone, the map and quick wins. Asserts: no errors, no hang, all numbers and timers
// finite, the render loop stops whenever nothing moves (start, map, pause, results).
//   node games/wkfuzz.mjs [path-to-index.html]   (ROUNDS=n, default 60)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'wktest', 'index.html'));
const ROUNDS = +(process.env.ROUNDS || 60);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const all = JSON.stringify({ lv: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [i, { s: 2, h: 1, k: 1 }])) });
await p.addInitScript(s => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); localStorage.setItem('wk.stats', s); sessionStorage.setItem('init', 1); } }, all);
await p.goto(target); await p.waitForTimeout(500);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ev = (f, a) => Promise.race([p.evaluate(f, a), new Promise((_, rej) => setTimeout(() => rej(new Error('hang')), 8000))]);
const wait = ms => p.waitForTimeout(ms);
const open = async () => { await ev(() => document.getElementById('tileWk').click()); await wait(300); };
let bad = [], idleChecks = 0, plays = 0, taps = 0, wins = 0;
const check = async tag => {
  const r = await ev(() => ({ fin: __wk.finite(), seq: !__wk.S || __wk.S.seq.every(e => Number.isFinite(e.at) && e.at - __wk.S.t < 2000 && e.at >= __wk.S.t - 1), inv: !__wk.S || __wk.S.inv.length <= 3 }));
  if (!r.fin) bad.push('niet eindig: ' + tag); if (!r.seq) bad.push('timer klopt niet: ' + tag); if (!r.inv) bad.push('rugzak te vol: ' + tag);
};
const idle = async tag => { await wait(400); idleChecks++; if (await ev(() => __wk.running())) bad.push('loop loopt nog: ' + tag); };
async function randomTap() {
  const k = rnd(); taps++;
  if (k < .55) { const pt = await ev(([x, y]) => __wk.screenAt(x, y), [rnd() * 14, rnd() * 9]); await p.touchscreen.tap(pt.x, pt.y); }
  else if (k < .7) { const s = Math.floor(rnd() * 3); await ev(s => { const e = document.querySelector(`#wkInv [data-s="${s}"]`); if (e) e.click(); }, s); }
  else if (k < .77) await ev(() => document.getElementById('wkHintBtn').click());
  else if (k < .84) await ev(() => { const e = document.getElementById('wkBark'); if (!e.hidden) e.click(); });
  else if (k < .92) await ev(r => { const bs = [...document.querySelectorAll('#wkCu.show [data-i], #wkCu.show .wk-cu-x')]; if (bs.length) bs[Math.floor(r * bs.length)].click(); }, rnd());
  else { const id = await ev(r => { const ids = __wk.L.objs.map(o => o.id); return ids[Math.floor(r * ids.length)]; }, rnd()); const pt = await ev(id => __wk.pointFor(id), id); if (pt) await p.touchscreen.tap(pt.x, pt.y); }
}
await open();
for (let r = 0; r < ROUNDS; r++) {
  const k = rnd();
  try {
    if (k < .5) {                                            // play a random level with random taps
      const lv = Math.floor(rnd() * 16); await ev(lv => { __wk.startLevel(lv); window.__wkSpeed = 1 + Math.floor(Math.random() * 3); }, lv); plays++;
      if (rnd() < .7) await ev(() => { const g = document.getElementById('wkGo'); if (g) g.click(); }); else await p.touchscreen.tap(400, 200);
      const n = 6 + Math.floor(rnd() * 14);
      for (let i = 0; i < n; i++) {
        await randomTap(); await wait(40 + rnd() * 250);
        const q = rnd();
        if (q < .06) { await ev(() => window.appBack()); await wait(200); if (await ev(() => document.getElementById('wkPauseModal').classList.contains('show'))) { const t0 = await ev(() => __wk.S.t); await idle('pauze'); if (t0 !== await ev(() => __wk.S.t)) bad.push('pauze staat niet stil'); await ev(() => document.getElementById('wkPResume').click()); } }
        else if (q < .09) { await ev(() => { __wk.openPause(); document.getElementById('wkPRestart').click(); }); await ev(() => { const g = document.getElementById('wkGo'); if (g) g.click(); }); }
        else if (q < .11) { await p.setViewportSize({ width: 412, height: 915 }); await wait(250); await randomTap(); await p.setViewportSize({ width: 915, height: 412 }); await wait(200); }
        else if (q < .12) { await p.reload(); await wait(500); await open(); if (await ev(() => !document.getElementById('wkContinue').hidden)) { await ev(() => document.getElementById('wkContinue').click()); await wait(200); } else break; }
        if (await ev(() => __wk.G && __wk.G.view !== 'play')) break;
      }
      if (await ev(() => __wk.G && __wk.G.view === 'play')) await check('level ' + (lv + 1));
      if (rnd() < .35 && await ev(() => __wk.G && __wk.G.view === 'play' && __wk.S && !__wk.S.done)) {     // a quick win: the solution through the input commands
        await ev(async () => {
          __wk.endIntro(); window.__wkSpeed = 8; const sol = __wk.L.sol;
          const settle = async () => { for (let i = 0; i < 400; i++) { const S = __wk.S; if (!S || S.done || (S.w.m === 'idle' && !S.w.q.length && !S.w.pend)) return; await new Promise(r => setTimeout(r, 16)); } };
          for (const s of sol) {
            for (let tr = 0; tr < 6 && __wk.S && !__wk.S.done && __wk.S.m.st === 'ok'; tr++) {
              await settle(); const a0 = __wk.S.acts;
              if (s[0] === 'wait') { await new Promise(r => setTimeout(r, s[1] / 60 * 1000 / 8 + 30)); break; }
              const c = s[0] === 'obj' ? { t: 'obj', id: s[1] } : s[0] === 'use' ? { t: 'obj', id: s[2], item: s[1] } : s[0] === 'walk' ? { t: 'walk', x: s[1], f: s[2] } : s[0] === 'bark' ? { t: 'bark' } : s[0] === 'comb' ? { t: 'comb', a: s[1], b: s[2] } : s[0] === 'pick' ? { t: 'pick', id: s[1], v: s[2] } : { t: 'cuX' };
              if (c.t === 'pick' && __wk.S.cu !== c.id) { __wk.doCmd({ t: 'obj', id: c.id }); await settle(); }
              __wk.doCmd(c); await settle(); if (__wk.S.acts > a0 || c.t === 'cuX') break;
            }
          }
        });
        for (let i = 0; i < 60 && !(await ev(() => document.getElementById('wkEndModal').classList.contains('show'))); i++) await wait(100);
        if (await ev(() => document.getElementById('wkEndModal').classList.contains('show'))) { wins++; await idle('resultaat'); if (rnd() < .5) await ev(() => window.appBack()); }
      }
      const q = rnd();
      if (q < .4) { await ev(() => __wk.openMap()); await idle('kaart'); }
      else if (q < .7) { await ev(() => __wk.openStart()); await idle('startscherm'); }
      else { await ev(() => __wk.quit()); await idle('menu'); await open(); }
    } else if (k < .62) {                                    // the map: worlds and nodes
      await ev(() => __wk.openMap());
      for (let i = 0; i < 4; i++) { await ev(r => { const bs = [...document.querySelectorAll('#wkWorlds button, #wkMapBox .wk-node')]; bs[Math.floor(r * bs.length)].click(); }, rnd()); await wait(120); if (await ev(() => __wk.G.view === 'play')) break; }
      if (await ev(() => __wk.G.view === 'play')) { await ev(() => __wk.openMap()); }
      await idle('kaart na klikken');
    } else if (k < .72) {                                    // reload in the middle of something
      await p.reload(); await wait(500); await open(); await idle('na herladen');
    } else if (k < .85) {                                    // leave with the back button from wherever we are
      for (let i = 0; i < 6 && (await ev(() => __wk.cur())) === 'wk'; i++) { await ev(() => window.appBack()); await wait(220); }
      if ((await ev(() => __wk.cur())) === 'wk') bad.push('terugknop komt niet bij het menu');
      await idle('terug naar menu'); await open();
    } else {                                                 // options on the start screen
      await ev(() => __wk.openStart());
      await ev(r => { const bs = [...document.querySelectorAll('#wkOpts button')]; bs[Math.floor(r * bs.length)].click(); }, rnd());
      await idle('opties');
    }
  } catch (e) { bad.push('fout/hang in ronde ' + r + ': ' + e.message); try { await p.reload(); await wait(500); await open(); } catch (e2) {} }
}
console.log(`${ROUNDS} rondes, ${plays}× gespeeld, ${taps} tikken, ${wins}× gewonnen, ${idleChecks}× gecontroleerd dat de loop stilstaat`);
console.log(bad.length ? 'FAIL\n' + [...new Set(bad)].slice(0, 12).join('\n') : 'PASS fuzz: geen hangers, alles eindig, timers kloppen, loop stopt als niets beweegt');
console.log('console/page errors:', errs.length ? errs.slice(0, 6).join('\n') : 'geen');
await b.close();
process.exit(bad.length || errs.length ? 1 : 0);
