import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kj.settings', JSON.stringify({ speed: 'turbo', level: 'normaal', rounds: 4 })); });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(500);
await p.tap('#tileKj'); await p.waitForTimeout(600);
let ok = true; const check = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) ok = false; };
const playTricks = (max) => p.evaluate(async max => { const K = __kj, wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 800 && K.G.phase !== 'done'; i++) {
    if (max != null && K.G.tricks && K.G.tricks[0] + K.G.tricks[1] >= max && K.G.trick.length === 0) break;
    if (K.G.phase === 'bid' && K.G.bidTurn === 0) { const bt = document.querySelector('.kj-suits button'); if (bt) bt.click(); else document.querySelector('#kjBid button')?.click(); }
    if (K.G.phase === 'play' && K.G.turn === 0 && K.G.trick.length < 4) K.play(0, K.aiHeur(0));
    await wait(60);
  } }, max);
await playTricks(null); await p.waitForTimeout(1000);
await p.tap('#kjResNext'); await p.waitForTimeout(800);
await playTricks(4); await p.waitForTimeout(500);
const sb = () => p.evaluate(() => ({ w: document.querySelector('#kjWij').textContent, r0: document.querySelector('#kjR0').textContent, z: document.querySelector('#kjZij').textContent, r1: document.querySelector('#kjR1').textContent, G: { pts: __kj.G.pts, roem: __kj.G.roem, total: __kj.G.total } }));
let s = await sb(); console.log(JSON.stringify(s));
check('default: big = this hand', s.w.startsWith(String(s.G.pts[0])) && s.r0 === 'totaal ' + s.G.total[0]);
check('zij same', s.z.startsWith(String(s.G.pts[1])) && s.r1 === 'totaal ' + s.G.total[1]);
await p.locator('.kj-sb').screenshot({ path: 'gfx/kj_sb_potje.png' });
await p.screenshot({ path: 'gfx/kj_potje.png' });
await p.tap('#kjOptBtn'); await p.waitForTimeout(400);
check('option visible', await p.isVisible('#kjOptList button[data-key="scoreBig"][data-val=\'"totaal"\']'));
await p.locator('#kjOptList button[data-key="scoreBig"]').first().scrollIntoViewIfNeeded(); await p.screenshot({ path: 'gfx/kj_opt.png' });
await p.tap('#kjOptList button[data-key="scoreBig"][data-val=\'"totaal"\']'); await p.waitForTimeout(200);
s = await sb(); console.log(JSON.stringify(s));
check('switched: big = total', s.w === String(s.G.total[0]) && s.r0.startsWith('potje ' + s.G.pts[0]));
check('saved', JSON.parse(await p.evaluate(() => localStorage.getItem('kj.settings'))).scoreBig === 'totaal');
await p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'))); await p.waitForTimeout(200);
await p.locator('.kj-sb').screenshot({ path: 'gfx/kj_sb_totaal.png' });
// landscape
await p.tap('#kjOptBtn'); await p.waitForTimeout(300); await p.tap('#kjOptList button[data-key="scoreBig"][data-val=\'"potje"\']'); await p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
await p.setViewportSize({ width: 915, height: 412 }); await p.waitForTimeout(600); await p.screenshot({ path: 'gfx/kj_land.png' });
check('no errors', !errs.length, JSON.stringify(errs)); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close();
