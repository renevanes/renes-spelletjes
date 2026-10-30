import { existsSync } from 'node:fs';
// Woef tegen Karel: screenshots for review -> build/gfx/wk_*.png   (then: python3 games/wksheet.py -> build/gfx/wk_sheet.png)
//   node games/wkshots.mjs [path-to-index.html]
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'wktest', 'index.html'));
const GFX = path.join(here, '..', 'build', 'gfx');
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [];
const some = JSON.stringify({ lv: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, { s: [3, 2, 3, 3, 1, 3, 2, 3, 3, 2, 3, 2][i], h: 0, k: 0 }])) });
async function page(vp) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(s => { if (!sessionStorage.getItem('i')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); localStorage.setItem('wk.stats', s); sessionStorage.setItem('i', 1); } }, some);
  await p.goto(target); await p.waitForTimeout(500); return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(GFX, `wk_${n}.png`) });
const ev = (p, f, a) => p.evaluate(f, a);
// a scene: start level lv, skip the intro, stop the clock, run a setup in the page, step n frames
async function scene(p, lv, setup, n = 60) {
  await ev(p, ([lv, setup, n]) => {
    __wk.startLevel(lv); __wk.endIntro(); __wk.manual(true);
    const S = __wk.S, L = __wk.L, C = __wk.Core, go = c => __wk.doCmd(c), step = k => __wk.step(k);
    const toPh = (ph, p = .5, max = 900) => { for (let i = 0; i < max; i++) { const z = C.zones(L, __wk.S)[0]; if (z && z.ph === ph && z.p >= p) return; __wk.step(1); } };
    if (setup) new Function('S', 'L', 'C', 'go', 'step', 'toPh', setup)(S, L, C, go, step, toPh);
    __wk.step(n);
  }, [lv, setup, n]);
  await p.waitForTimeout(120);
}
const p = await page({ width: 915, height: 412 });
// the menu tile and the icon
await ev(p, () => document.querySelector('#tileWk').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
await (await p.$('#tileWk')).screenshot({ path: path.join(GFX, 'wk_menu_tile.png') });
await (await p.$('#tileWk .art img')).screenshot({ path: path.join(GFX, 'wk_icon.png') });
await ev(p, () => document.getElementById('tileWk').click()); await p.waitForTimeout(400); await shot(p, 'start');
for (const w of [0, 1, 2]) { await ev(p, w => { __wk.opt.world = w; __wk.openMap(); }, w); await p.waitForTimeout(300); await shot(p, 'map_w' + (w + 1)); }
// the intro with Karel's taunt
await ev(p, () => __wk.startLevel(5)); await p.waitForTimeout(400); await shot(p, 'taunt');
// one picture per world, then the machines (most of them in their attack)
await scene(p, 0, "go({ t: 'walk', x: 2, f: 'g' }); step(30);", 10); await shot(p, 'world1');
await scene(p, 5, "toPh(2, .55);", 0); await shot(p, 'world2');
await scene(p, 10, "S.o.mA.r = 2; toPh(2, .4);", 0); await shot(p, 'world3');
await scene(p, 0, "toPh(2, .4); S.w.x = 6.4;", 0); await shot(p, 'm_vac');
await scene(p, 1, "go({ t: 'obj', id: 'cactus' }); for (let i = 0; i < 400 && !__wk.S.inv.length; i++) step(1); toPh(2, .5);", 0); await shot(p, 'm_bal');
await scene(p, 2, "toPh(2, .5); S.w.x = 6.3;", 0); await shot(p, 'm_tik');
await scene(p, 3, "S.w.x = 6; toPh(2, .5);", 0); await shot(p, 'm_kraan');
await scene(p, 4, "go({ t: 'obj', id: 'fridge' }); step(160); go({ t: 'obj', id: 'trap', item: 'worst' }); step(500);", 0); await shot(p, 'm_worst');
await scene(p, 6, "go({ t: 'obj', id: 'cart' }); step(500); toPh(2, .5);", 0); await shot(p, 'm_fan');
await scene(p, 7, "toPh(2, .45);", 0); await shot(p, 'm_kok');
await scene(p, 8, "go({ t: 'obj', id: 'curtain' }); step(200); toPh(2, .5);", 0); await shot(p, 'm_stempel');
await scene(p, 9, "toPh(2, .4);", 0); await shot(p, 'm_bubbel');
await scene(p, 11, "toPh(2, .5);", 0); await shot(p, 'm_tand');
await scene(p, 12, "toPh(2, .5);", 0); await shot(p, 'm_weer');
await scene(p, 13, "toPh(2, .5);", 0); await shot(p, 'm_wekker');
await scene(p, 14, "S.o.ramp.fix = 1; toPh(2, .5);", 0); await shot(p, 'm_taart');
await scene(p, 15, "toPh(2, .5);", 0); await shot(p, 'm_mega');
// a hit: Woef dizzy with stars
await scene(p, 6, "go({ t: 'obj', id: 'cart' }); step(500); go({ t: 'walk', x: 8.5, f: 'g' }); for (let i = 0; i < 900 && __wk.S.w.m !== 'dizzy'; i++) step(1);", 12); await shot(p, 'hit');
// a hint with the arrow and the close-ups
await scene(p, 4, "go({ t: 'obj', id: 'fridge' }); step(200);", 0); await ev(p, () => { for (let i = 0; i < 3; i++) document.getElementById('wkHintBtn').click(); __wk.step(20); }); await shot(p, 'hint');
await scene(p, 8, "S.o.curtain.open = 1; S.w.x = 12.6; S.w.f = 'up'; S.w.y = 4.7; go({ t: 'obj', id: 'panel' }); step(40); go({ t: 'pick', id: 'panel', v: 'b' });", 2); await p.waitForTimeout(300); await shot(p, 'closeup');
await scene(p, 13, "go({ t: 'obj', id: 'note' }); step(100);", 2); await p.waitForTimeout(300); await shot(p, 'look');
await scene(p, 2, "S.w.x = 9.8; S.w.f = 'up'; S.w.y = 4.7; go({ t: 'bark' }); step(20);", 0); await shot(p, 'bark');
// a machine breaking, Karel fleeing, the finale's cage
await scene(p, 7, "S.o.board.rec = 1; S.o.pot.pep = 1; step(260);", 0); await shot(p, 'sneeze');
await scene(p, 0, "S.o.basket.x = 7.3; S.o.basket.pushed = 1; S.o.mach.eat = 1; step(400); for (let i = 0; i < 300 && __wk.S.m.st !== 'gone'; i++) step(1);", 8); await shot(p, 'break');
await scene(p, 1, "go({ t: 'obj', id: 'cactus' }); step(500); __wk.S.w.x = 11.1; __wk.S.w.f = 'up2'; __wk.S.w.y = 4.7; go({ t: 'obj', id: 'mach', item: 'cactus' }); for (let i = 0; i < 900 && !(__wk.S.m.st !== 'ok' && __wk.S.m.bt > 175); i++) step(1);", 0); await shot(p, 'flee');
await scene(p, 15, "__wk.S.m.st = 'break'; __wk.S.m.bt = 0; __wk.S.o.shield.hide = 1; __wk.S.m.stage = 3; step(300);", 0); await shot(p, 'cage');
// the results
await scene(p, 3, "S.hints = 1; __wk.S.m.st = 'break'; __wk.S.m.bt = 280;", 40); await ev(p, () => __wk.manual(false)); await p.waitForTimeout(1500); await shot(p, 'results');
// portrait
const q = await page({ width: 412, height: 915 });
await ev(q, () => document.getElementById('tileWk').click()); await q.waitForTimeout(300); await shot(q, 'portrait_start');
await ev(q, () => { __wk.opt.world = 1; __wk.openMap(); }); await q.waitForTimeout(300); await shot(q, 'portrait_map');
await scene(q, 6, "go({ t: 'obj', id: 'cart' }); step(500); go({ t: 'obj', id: 'batt' }); step(400);", 0); await ev(q, () => document.getElementById('wkHintBtn').click()); await shot(q, 'portrait');
console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'screenshots ok');
await b.close();
