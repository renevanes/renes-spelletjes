import { existsSync } from 'node:fs';
// Dakrenner fuzz test: random buttons in real time, pausing, the back button, restarting, back to the flag, level changes,
// the endless run, turning the phone and reloading. Asserts: no errors, no hang, all numbers finite, the render loop stops
// whenever nothing moves (menus, level select, pause).     node games/drfuzz.mjs [path-to-index.html]   (ROUNDS=n)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'drtest', 'index.html'));
const ROUNDS = +(process.env.ROUNDS || 60);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const all = JSON.stringify({ lv: Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i, { t: 99999, m: 2, c: 3 }])) });
await p.addInitScript(s => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); localStorage.setItem('dr.stats', s); sessionStorage.setItem('init', 1); } }, all);
await p.goto(target); await p.waitForTimeout(500);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ev = (f, a) => Promise.race([p.evaluate(f, a), new Promise((_, rej) => setTimeout(() => rej(new Error('hang')), 8000))]);
const wait = ms => p.waitForTimeout(ms);
const open = async () => { await ev(() => document.getElementById('tileDr').click()); await wait(300); };
const BITS = [2, 2, 2, 6, 6, 10, 1, 5, 34, 38, 18, 22, 0, 4, 8, 3, 63];
let bad = [], idleChecks = 0, plays = 0;
const check = async tag => { const f = await ev(() => __dr.finite()); if (!f) bad.push('niet eindig: ' + tag); };
const idle = async tag => { await wait(350); idleChecks++; if (await ev(() => __dr.running())) bad.push('loop loopt nog: ' + tag); };
await open();
for (let r = 0; r < ROUNDS; r++) {
  const k = rnd();
  try {
    if (k < .45) {                                               // play a random level for a while with random buttons
      const lv = Math.floor(rnd() * 32); await ev(lv => { __dr.startLevel(lv); }, lv); plays++;
      const n = 3 + Math.floor(rnd() * 8);
      for (let i = 0; i < n; i++) { await ev(b => __dr.hold(b), BITS[Math.floor(rnd() * BITS.length)]); await wait(60 + rnd() * 400);
        const q = rnd();
        if (q < .1) { await ev(() => window.appBack()); await wait(200); const f0 = await ev(() => __dr.S.f); await wait(250); if (f0 !== await ev(() => __dr.S.f)) bad.push('pauze staat niet stil'); await idle('pauze'); await ev(() => document.getElementById('drPResume').click()); }
        else if (q < .15) { await ev(() => { __dr.openPause(); document.getElementById('drPRestart').click(); }); }
        else if (q < .2) { await ev(() => { __dr.openPause(); document.getElementById('drPCheck').click(); }); }
        else if (q < .23) { await p.setViewportSize({ width: 412, height: 915 }); await wait(300); await p.setViewportSize({ width: 915, height: 412 }); await wait(200); }
      }
      await ev(() => __dr.hold(0)); await check('level ' + (lv + 1));
      if (rnd() < .3) { await ev(() => { const S = __dr.S, L = __dr.L; if (S && L && !S.done) { S.x = L.finish.x - 2; S.y = L.finish.y; S.st = 0; S.gs = 8; S.dead = 0; S.ride = -1; S.cp = L.cps.length; } __dr.hold(2); }); await wait(2500); await ev(() => __dr.hold(0));
        if (!(await ev(() => document.getElementById('drEndModal').classList.contains('show')))) bad.push('geen resultaat na finish ' + JSON.stringify(await ev(() => ({ st: __dr.S && __dr.S.st, done: __dr.S && __dr.S.done, x: __dr.S && __dr.S.x, fx: __dr.L && __dr.L.finish.x, view: __dr.G && __dr.G.view, modal: [...document.querySelectorAll('.modal.show')].map(m => m.id), run: __dr.running() }))));
        await idle('resultaat'); }
      const q = rnd();
      if (q < .4) { await ev(() => __dr.openLevels()); await idle('levelkeuze'); }
      else if (q < .7) { await ev(() => __dr.openStart()); await idle('startscherm'); }
      else { await ev(() => __dr.quit()); await idle('menu'); await open(); }
    } else if (k < .55) {                                        // the endless run
      await ev(() => __dr.startEndless()); plays++;
      for (let i = 0; i < 5; i++) { await ev(b => __dr.hold(b), BITS[Math.floor(rnd() * BITS.length)]); await wait(100 + rnd() * 400); }
      await ev(() => __dr.hold(0)); await check('eindeloos'); await ev(() => __dr.openStart()); await idle('startscherm na eindeloos');
    } else if (k < .65) {                                        // menus: worlds, outfits, options
      await ev(() => __dr.openLevels()); for (let i = 0; i < 3; i++) await ev(w => document.querySelector(`#drWorlds [data-w="${w}"]`).click(), Math.floor(rnd() * 4));
      await idle('werelden'); await ev(() => __dr.openStart()); await ev(o => document.querySelector(`#drOutfits [data-o="${o}"]`).click(), Math.floor(rnd() * 6));
      await ev(() => document.querySelector('#drOpts button[data-k="ghost"][data-v="' + (Math.random() < .5) + '"]').click()); await idle('opties');
    } else if (k < .72) {                                        // reload in the middle of something
      await p.reload(); await wait(500); await open(); await idle('na herladen');
    } else if (k < .8) {                                         // leave with the back button from wherever we are
      for (let i = 0; i < 4 && (await ev(() => __dr.cur())) === 'dr'; i++) { await ev(() => window.appBack()); await wait(250); }
      if ((await ev(() => __dr.cur())) === 'dr') { await ev(() => __dr.quit()); }
      await idle('terug naar menu'); await open();
    } else {                                                     // hammer the buttons with real (multi)touch while playing
      const lv = Math.floor(rnd() * 32); await ev(lv => __dr.startLevel(lv), lv); plays++;
      const cdp = await ctx.newCDPSession(p);
      for (let i = 0; i < 12; i++) {
        const ks = ['L', 'R', 'J', 'S', 'CW', 'CCW'].filter(() => rnd() < .4); const cs = [];
        for (const k of ks) cs.push(await ev(k => __dr.btnCenter(k), k));
        const pts = cs.filter(Boolean).map((c, j) => ({ x: c.x + (rnd() - .5) * 20, y: c.y + (rnd() - .5) * 20, id: j + 1, radiusX: 4, radiusY: 4, force: 1 }));
        if (pts.length) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts }); await wait(40 + rnd() * 200); for (const pt of pts) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt] }); }
        await wait(30 + rnd() * 120);
      }
      await check('aanraken'); if (await ev(() => __dr.PAD.held) !== 0) bad.push('knop blijft hangen na loslaten');
      await ev(() => __dr.openLevels()); await idle('na aanraken');
    }
  } catch (e) { bad.push('fout/hang in ronde ' + r + ': ' + e.message); try { await p.reload(); await wait(500); await open(); } catch (e2) {} }
}
console.log(`${ROUNDS} rondes, ${plays} keer gespeeld, ${idleChecks} keer gecontroleerd dat de loop stilstaat`);
console.log(bad.length ? 'FAIL\n' + bad.slice(0, 12).join('\n') : 'PASS fuzz: geen hangers, alles eindig, loop stopt als niets beweegt');
console.log('console/page errors:', errs.length ? errs.slice(0, 6).join('\n') : 'geen');
await b.close();
process.exit(bad.length || errs.length ? 1 : 0);
