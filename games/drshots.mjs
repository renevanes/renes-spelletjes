import { existsSync, readFileSync } from 'node:fs';
// Dakrenner screenshots -> build/gfx/dr_*.png (then: python3 games/drsheet.py for the contact sheet)
//   node games/drshots.mjs [path-to-index.html]
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
import { load } from './drsrc/load.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'drtest', 'index.html'));
const GFX = path.join(here, '..', 'build', 'gfx');
const sol = JSON.parse(readFileSync(path.join(here, 'drsrc', 'solutions.json'), 'utf8'));
const { Core, LEVELS, buildLevel } = load();
// the first frame of a level's bot run where pred(S) holds (+ an offset)
function frameWhere(lv, pred, off = 0) {
  const L = buildLevel(LEVELS[lv - 1], lv - 1), S = Core.newState(L, { noEv: true }), rle = sol[lv].rle; let f = 0;
  for (let k = 0; k < rle.length; k += 2) for (let n = 0; n < rle[k + 1]; n++) { Core.step(L, S, rle[k]); f++; if (pred(S, L)) return f + off; }
  return Math.floor(f / 2);
}
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [];
async function page(o = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, pre = {}) {
  const ctx = await b.newContext(o), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(pre => { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); for (const [k, v] of Object.entries(pre)) localStorage.setItem(k, v); }, pre);
  await p.goto(target); await p.waitForTimeout(400); return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(GFX, `dr_${n}.png`) });
// play a level with the bot in real time (fast-forwarded) up to frame f, then hold still and take the picture
async function playTo(p, lv, f, extra = null, settle = 0) {
  await p.evaluate(([lv, rle, extra]) => {
    __dr.startLevel(lv - 1); let i = 0, k = 0, n = 0; const X = extra ? new Function('S', 'n', 'bits', extra) : null;
    __dr.G.bot = () => { n++; while (i < rle.length && k >= rle[i + 1]) { i += 2; k = 0; } let bits = i < rle.length ? rle[i] : 0; k++; if (X) bits = X(__dr.S, n, bits) ?? bits; return bits; };
    window.__drSpeed = 4;
  }, [lv, sol[lv].rle, extra]);
  for (let t = 0; t < 400; t++) { const cur = await p.evaluate(() => __dr.S.f); if (cur >= f - 40) break; await p.waitForTimeout(40); }
  await p.evaluate(() => { window.__drSpeed = 1; });
  for (let t = 0; t < 200; t++) { const cur = await p.evaluate(() => __dr.S.f); if (cur >= f) break; await p.waitForTimeout(10); }
  await p.evaluate(() => { __dr.manual(true); __dr.R.snap(__dr.S); __dr.R.frame(__dr.S, { still: 1, ghost: __dr.GH, outfit: __dr.OUTFITS[__dr.opt.outfit] }); }); await p.waitForTimeout(60 + settle);
}
const all = JSON.stringify({ lv: Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i, { t: 900 + i * 30, m: [3, 2, 3, 1][i % 4], c: [7, 3, 7, 5, 1, 7][i % 6] }])) });

/* the menu tile, the start dialog and the level select */
{ const p = await page(undefined, { 'dr.stats': JSON.stringify({ lv: { 0: { t: 840, m: 3, c: 7 }, 1: { t: 960, m: 2, c: 3 }, 2: { t: 1100, m: 1, c: 1 } } }) });
  await p.evaluate(() => document.querySelector('#tileDr').scrollIntoView({ block: 'center' })); await shot(p, 'menu_tile');
  await p.evaluate(() => document.getElementById('tileDr').click()); await p.waitForTimeout(500); await shot(p, 'start');
  await p.evaluate(() => document.querySelector('[data-m="levels"]').click()); await p.waitForTimeout(400); await shot(p, 'levels'); await p.close(); }
{ const p = await page(undefined, { 'dr.stats': all }); await p.evaluate(() => { document.getElementById('tileDr').click(); }); await p.waitForTimeout(300);
  for (const w of [1, 3]) { await p.evaluate(w => { __dr.opt.world = w; __dr.openLevels(); }, w); await p.waitForTimeout(400); await shot(p, 'levels_w' + (w + 1)); }
  await p.close(); }
/* the four worlds, moves and tricks */
{ const p = await page(undefined, { 'dr.stats': all, 'dr.settings': '{"outfit":0}' });
  await p.evaluate(() => document.getElementById('tileDr').click()); await p.waitForTimeout(300);
  const list = [
    ['world1', 3, frameWhere(3, S => S.st === 3, 4)],
    ['world2', 11, frameWhere(11, S => S.ride >= 0, 20)],
    ['world3', 18, frameWhere(18, S => S.st === 7, 25)],
    ['world4', 25, frameWhere(25, (S, L) => L.lasers.some(Z => Math.abs(Z.x - S.x) < 3 && Core.laserOn(Z, S.f)), 0)],
    ['slide', 2, frameWhere(2, S => S.st === 2 && S.under, 6)],
    ['wallrun', 5, frameWhere(5, S => S.st === 3, 3)],
    ['vault', 2, frameWhere(2, S => S.st === 6, 6)],
    ['bar', 14, frameWhere(14, S => S.st === 8, 10)],
    ['zip', 22, frameWhere(22, S => S.st === 7, 20)],
    ['crane', 19, frameWhere(19, S => S.ride >= 0, 30)],
    ['saws', 15, frameWhere(15, (S, L) => L.saws.some(Q => Math.abs(Core.sawPos(Q, S.f)[0] - S.x) < 4), 0)],
    ['vents', 21, frameWhere(21, (S, L) => L.vents.some(V => S.x > V.x0 && S.x < V.x1 && S.y < V.y1 - 2), 0)],
    ['crumble', 7, frameWhere(7, S => S.cr.some(v => v > 8), 0)],
    ['neon', 29, frameWhere(29, S => S.st === 7, 30)],
  ];
  for (const [nm, lv, f] of list) { await playTo(p, lv, f); await shot(p, nm); await p.evaluate(() => __dr.manual(false)); }
  // a flip: the bot jumps off the high roof in "Salto!" and we hold the turn button
  const f4 = frameWhere(4, S => S.st === 1 && S.x > 16.3, 0);
  await playTo(p, 4, f4 + 15, 'return S.st === 1 && n >= ' + f4 + ' && n < ' + (f4 + 30) + ' ? bits | 32 : bits;'); await shot(p, 'flip');
  await p.evaluate(() => __dr.manual(false)); await p.waitForTimeout(900); await shot(p, 'flip_land');
  // a crash: the head first onto the roof
  await p.evaluate(() => { __dr.startLevel(0); }); await p.waitForTimeout(600);
  await p.evaluate(() => { const S = __dr.S; S.x = 9; S.y = 17.6; S.st = 1; S.vy = 6; S.vx = 5; S.rot = Math.PI; S.rv = 6; }); await p.waitForTimeout(650); await shot(p, 'crash');
  // the ghost of a best run
  await p.evaluate(() => { __dr.manual(false); __dr.openLevels(); }); await p.close(); }
/* results, pause */
{ const p = await page(undefined, { 'dr.stats': JSON.stringify({ lv: { 0: { t: 900, m: 2, c: 3 } } }) });
  await p.evaluate(() => document.getElementById('tileDr').click()); await p.waitForTimeout(300);
  await playTo(p, 2, 300); await p.evaluate(() => __dr.manual(false)); await p.evaluate(() => __dr.openPause()); await p.waitForTimeout(300); await shot(p, 'pause');
  await p.evaluate(() => document.getElementById('drPResume').click());
  await playTo(p, 2, sol[2].frames + 90); await p.evaluate(() => __dr.manual(false)); await p.waitForTimeout(1500); await shot(p, 'results');
await p.close(); }
/* portrait */
{ const p = await page({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { 'dr.stats': all });
  await p.evaluate(() => document.getElementById('tileDr').click()); await p.waitForTimeout(500); await shot(p, 'portrait_start');
  await p.evaluate(() => document.querySelector('[data-m="levels"]').click()); await p.waitForTimeout(400); await shot(p, 'portrait_levels');
  await p.evaluate(() => document.querySelector('[data-i="0"]').click()); await p.waitForTimeout(500); await shot(p, 'portrait'); await p.close(); }
console.log('errors:', errs.slice(0, 5));
await b.close();
