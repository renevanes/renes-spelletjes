import { existsSync as require_exists } from 'node:fs';
// Bellenschieter screenshots -> scratchpad/gfx/bs_*.png + contact sheet bs_sheet.png   (node bsgfx.mjs [index.html])
import { chromium, devices } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url'; import { execSync } from 'child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(here, '..', 'gfx');
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'bstest', 'index.html'));
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], shots = [];
async function page(dev, cfg) {
  const p = await (await b.newContext({ ...devices[dev] })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(c => { localStorage.setItem('app.cfg', c); }, cfg || '{"seen":"9.99","mute":true}');
  await p.goto(target); await p.waitForTimeout(400); return p;
}
const shot = async (p, n) => { await p.screenshot({ path: path.join(OUT, `bs_${n}.png`) }); shots.push(n); };
const open = async p => { await p.evaluate(() => document.querySelector('#tileBs').scrollIntoView({ block: 'center' })); await p.tap('#tileBs'); await p.waitForTimeout(500); };
const unlockAll = p => p.evaluate(() => { const st = __bs.stats(); for (let i = 1; i <= 60; i++) st.stars[i] = 1 + (i % 3); });
const tapAt = (p, c) => p.evaluate(({ x, y }) => { const s = document.getElementById('bsStage'), o = { clientX: x, clientY: y, pointerId: 5, bubbles: true, pointerType: 'touch' }; s.dispatchEvent(new PointerEvent('pointerdown', o)); s.dispatchEvent(new PointerEvent('pointerup', o)); }, c);
async function botShots(p, n, wait = 700) { for (let i = 0; i < n; i++) { const st = await p.evaluate(() => __bs.S.won || __bs.S.lost); if (st) break; const m = await p.evaluate(() => __bs.bot()); if (m.swap) { await tapAt(p, await p.evaluate(() => __bs.launcherClient())); await p.waitForTimeout(240); } await tapAt(p, await p.evaluate(a => __bs.aimClient(a, 5), m.ang)); await p.waitForTimeout(wait); } }
const only = process.env.ONLY;
let p = await page('Pixel 7');
await p.evaluate(() => document.querySelector('#tileBs').scrollIntoView({ block: 'center' }));
{ const r = await p.evaluate(() => { const r = document.querySelector('#tileBs').getBoundingClientRect(); return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: Math.min(412, r.width + 12), height: r.height + 12 }; }); await p.screenshot({ path: path.join(OUT, 'bs_menu.png'), clip: r }); shots.push('menu'); }
await open(p); await shot(p, 'start');
await unlockAll(p); await p.evaluate(() => __bs.openStart()); await p.waitForTimeout(300); await shot(p, 'start_all');
await p.evaluate(() => { __bs.seed = 77; __bs.startLevel(1); }); await p.waitForTimeout(900); await shot(p, 'l1');
const lvls = only ? only.split(',').map(Number) : [6, 10, 12, 14, 22, 28, 33, 37, 42, 47, 52, 58];
for (const lv of lvls) { await p.evaluate(lv => { __bs.seed = 99; __bs.startLevel(lv); }, lv); await p.waitForTimeout(800); await shot(p, 'lv' + lv); }
// mid-level, aiming with the line, popping + falling
await p.evaluate(() => { __bs.seed = 5; __bs.startLevel(10); }); await p.waitForTimeout(700); await botShots(p, 4);
await p.waitForTimeout(800); await shot(p, 'mid');
{ const m = await p.evaluate(() => __bs.bot()); const c = await p.evaluate(a => __bs.aimClient(a, 4), m.ang); await p.evaluate(({ x, y }) => document.getElementById('bsStage').dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 6, bubbles: true, pointerType: 'touch' })), c); await p.waitForTimeout(200); await shot(p, 'aim');
  await p.evaluate(({ x, y }) => document.getElementById('bsStage').dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 6, bubbles: true, pointerType: 'touch' })), c); }
await p.waitForTimeout(390); await shot(p, 'pop');
// long aim booster + bomb booster
await p.evaluate(() => { __bs.seed = 8; __bs.startLevel(19); }); await p.waitForTimeout(700); await p.evaluate(() => { __bs.useBoost('aim'); __bs.useBoost('bomb'); });
{ const c = await p.evaluate(() => __bs.aimClient(Math.PI / 2 - .5, 4)); await p.evaluate(({ x, y }) => document.getElementById('bsStage').dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 6, bubbles: true, pointerType: 'touch' })), c); await p.waitForTimeout(250); await shot(p, 'longaim');
  await p.evaluate(({ x, y }) => document.getElementById('bsStage').dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 6, bubbles: true, pointerType: 'touch' })), c); await p.waitForTimeout(330); await shot(p, 'bomb'); }
// fire ball
await p.evaluate(() => { __bs.seed = 3; __bs.startLevel(41); }); await p.waitForTimeout(700); await p.evaluate(() => { __bs.setFire(1); __bs.useBoost('fire'); }); await p.waitForTimeout(300);
await tapAt(p, await p.evaluate(() => __bs.aimClient(Math.PI / 2 + .1, 4))); await p.waitForTimeout(230); await shot(p, 'fire');
// colour-blind symbols
await p.evaluate(() => { __bs.opt.cb = true; __bs.seed = 4; __bs.startLevel(51); }); await p.waitForTimeout(800); await shot(p, 'cb'); await p.evaluate(() => { __bs.opt.cb = false; });
// win
await p.evaluate(() => { __bs.seed = 11; __bs.startLevel(1); }); await p.waitForTimeout(600); await botShots(p, 30, 650); await p.waitForTimeout(2600); await shot(p, 'win');
// lose (shots)
await p.evaluate(() => { __bs.seed = 12; __bs.startLevel(3); __bs.S.extra = -__bs.S.lim + 2; }); await p.waitForTimeout(600);
for (let i = 0; i < 2; i++) { await tapAt(p, await p.evaluate(() => __bs.aimClient(Math.PI / 2 + .02, 4))); await p.waitForTimeout(700); } await p.waitForTimeout(1600); await shot(p, 'lose');
// endless
await p.evaluate(() => { __bs.seed = 21; __bs.startEndless(); }); await p.waitForTimeout(800); await botShots(p, 8, 700); await p.waitForTimeout(900); await shot(p, 'endless');
await p.evaluate(() => { const S = __bs.S; S.missLeft = 1; }); await tapAt(p, await p.evaluate(() => __bs.aimClient(Math.PI / 2, 4))); await p.waitForTimeout(700); await shot(p, 'push');
await p.close();
// landscape
p = await page('Pixel 7 landscape'); await open(p); await shot(p, 'startL'); await unlockAll(p);
await p.evaluate(() => { __bs.seed = 9; __bs.startLevel(25); }); await p.waitForTimeout(800); await botShots(p, 3); await p.waitForTimeout(600); await shot(p, 'land');
await p.evaluate(() => { __bs.seed = 9; __bs.startEndless(); }); await p.waitForTimeout(800); await shot(p, 'landEnd');
await p.close();
// big text
p = await page('Pixel 7', '{"seen":"9.99","mute":true,"text":"groot"}'); await open(p); await p.evaluate(() => { __bs.seed = 9; __bs.startLevel(1); }); await p.waitForTimeout(800); await shot(p, 'bigtext'); await p.close();
console.log('errors', errs);
await b.close();
const list = shots.filter(n => n !== 'menu' && n !== 'startL' && n !== 'land' && n !== 'landEnd').map(n => path.join(OUT, `bs_${n}.png`));
execSync(`python3 -c "
import sys
from PIL import Image
fs=sys.argv[1:]; ims=[Image.open(f) for f in fs]; W=206; H=int(W*915/412)
cols=8; rows=(len(ims)+cols-1)//cols
o=Image.new('RGB',(cols*W,rows*H),(30,30,30))
for i,im in enumerate(ims): o.paste(im.resize((W,H)),((i%cols)*W,(i//cols)*H))
L=[Image.open('${OUT}/bs_'+n+'.png') for n in ['land','landEnd','startL']]
LW=W*cols//3; LH=int(LW*412/915); o2=Image.new('RGB',(cols*W,rows*H+LH),(30,30,30)); o2.paste(o,(0,0))
for i,im in enumerate(L): o2.paste(im.resize((LW,LH)),(i*LW,rows*H))
o2.save('${OUT}/bs_sheet.png')" ${list.join(' ')}`);
console.log('sheet ok', shots.length);
