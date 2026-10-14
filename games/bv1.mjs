import { existsSync as require_exists } from 'node:fs';
// Blokval test: node bv1.mjs [path-to-index.html]
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'gfx');
const target = process.argv[2] ? 'file://' + path.resolve(process.argv[2]) : 'file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
async function page(opts = {}) {
  const ctx = await b.newContext({ ...devices['Pixel 7'], ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99"}'));
  await p.goto(target); await p.waitForTimeout(400);
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `bv_${n}.png`) });
const vis = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
const ev = (p, f, a) => p.evaluate(f, a);

let p;
try {
p = await page();
ok('tile icon', await ev(p, () => (document.querySelector('#tileBv .art img') || {}).src?.startsWith('data:image/svg')));
await p.evaluate(() => document.querySelector('#tileBv').scrollIntoView()); await shot(p, 'menu');
await p.tap('#tileBv'); await p.waitForTimeout(400);
ok('start modal', await vis(p, 'bvStartModal')); await shot(p, 'start');
await p.click('#bvGo'); await p.waitForTimeout(250);
ok('countdown', await ev(p, () => __bv.countdown > 0)); await shot(p, 'countdown');
await p.waitForTimeout(1500);
ok('countdown done', await ev(p, () => __bv.countdown <= 0));
// sounds render without NaN / silence, music track renders and plays
const snd = await ev(p, () => { const r = __sfx._test(); return Object.entries(r).filter(([k]) => k.startsWith('bv')).map(([k, v]) => [k, v]); });
ok('bv sounds render', snd.length === 14 && snd.every(([, v]) => !v.nan && v.pk > .5 && v.rms > .01), JSON.stringify(snd).slice(0, 300));
let mus; for (let i = 0; i < 40; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now === 'bv') break; }
ok('music track bv', mus.now === 'bv' || (mus.cache || []).includes('bv'), JSON.stringify(mus));

// gravity moves piece down
const y0 = await ev(p, () => __bv.S.cur.y); await p.waitForTimeout(1200);
ok('gravity', await ev(p, y => __bv.S.cur.y > y, y0));

// gestures with real pointer events on the canvas
const box = await p.locator('#bvCanvas').boundingBox();
let v = await ev(p, () => __bv.view);
const cx = box.x + v.bx + 5 * v.c, cy = box.y + v.by + 10 * v.c;
await ev(p, () => __bv.setCur(3));
let r0 = await ev(p, () => __bv.S.cur.r);
await p.mouse.click(cx, cy); await p.waitForTimeout(80);
ok('tap rotates', await ev(p, r => __bv.S.cur.r === (r + 1) % 4, r0));
let x0 = await ev(p, () => __bv.S.cur.x);
await p.mouse.move(cx, cy); await p.mouse.down();
for (let i = 1; i <= 10; i++) { await p.mouse.move(cx - i * v.c * .3, cy + 2); await p.waitForTimeout(12); }
await p.mouse.up(); await p.waitForTimeout(60);
ok('drag left moves', await ev(p, x => __bv.S.cur.x <= x - 2, x0), `x ${x0}→${await ev(p, () => __bv.S.cur.x)}`);
await ev(p, () => __bv.setCur(6));
await p.mouse.move(cx, cy - 40); await p.mouse.down();
for (let i = 1; i <= 4; i++) { await p.mouse.move(cx, cy - 40 - i * 20); await p.waitForTimeout(8); }
await p.mouse.up(); await p.waitForTimeout(60);
ok('swipe up holds', await ev(p, () => __bv.S.hold === 6), `hold=${await ev(p, () => __bv.S.hold)}`);
const pc0 = await ev(p, () => __bv.S.pieces);
await p.mouse.move(cx, cy - 100); await p.mouse.down();
for (let i = 1; i <= 3; i++) await p.mouse.move(cx, cy - 100 + i * 70);
await p.mouse.up(); await p.waitForTimeout(80);
ok('flick down hard-drops', await ev(p, n => __bv.S.pieces === n + 1, pc0));

// quad: rows with a gap in column 9, vertical I dropped there
await ev(p, () => { const S = __bv.S; S.grid.fill(0); S.score = 0; S.lines = 8; S.level = 1; S.b2b = false; S.combo = -1;
  __bv.setRows(['....T.....', '...TTT....', 'JJJLLLSSZ.', 'IIIIOOTTT.', 'ZZSSLLJJO.', 'TTTOOIIII.']); __bv.setCur(1); });
await ev(p, () => { __bv.rotate(1); for (let i = 0; i < 6; i++) __bv.move(1); });
const pre = await ev(p, () => ({ x: __bv.S.cur.x, r: __bv.S.cur.r }));
await ev(p, () => __bv.hardDrop()); await p.waitForTimeout(140); await shot(p, 'clear');
await p.waitForTimeout(500);
let st = await ev(p, () => ({ lines: __bv.S.lines, score: __bv.S.score, level: __bv.S.level, q4: __bv.S.q4 }));
ok('quad clear', st.lines === 12 && st.q4 === 1, JSON.stringify({ pre, st }));
ok('level up at 10 lines', st.level === 2);
ok('score quad (800 + hard drop)', st.score >= 800, st.score);
await shot(p, 'levelup');

// back-to-back quad
await ev(p, () => { const S = __bv.S; S.grid.fill(0); __bv.setRows(['IIIIOOTTT.', 'ZZSSLLJJO.', 'TTTOOIIII.', 'JJJLLLSSZ.']); __bv.setCur(1); __bv.rotate(1); for (let i = 0; i < 6; i++) __bv.move(1); });
const sc0 = await ev(p, () => __bv.S.score);
await ev(p, () => __bv.hardDrop()); await p.waitForTimeout(600);
const sc1 = await ev(p, () => __bv.S.score);
ok('back-to-back bonus', sc1 - sc0 >= 1800, `+${sc1 - sc0}`);

// hold swap and once-per-piece rule
await ev(p, () => { __bv.S.hold = 0; __bv.S.holdUsed = false; __bv.setCur(5); });
await ev(p, () => __bv.hold()); const h1 = await ev(p, () => ({ hold: __bv.S.hold, cur: __bv.S.cur.t }));
const again = await ev(p, () => __bv.hold());
ok('hold', h1.hold === 5 && again === false, JSON.stringify(h1));

// keyboard
await ev(p, () => { __bv.S.grid.fill(0); __bv.setCur(3); }); x0 = await ev(p, () => __bv.S.cur.x);
await p.keyboard.press('ArrowRight'); await p.keyboard.press('x');
ok('keyboard', await ev(p, x => __bv.S.cur.x === x + 1 && __bv.S.cur.r === 1, x0));
// wall kick: T at right wall rotated
await ev(p, () => { __bv.setCur(3); __bv.rotate(1); for (let i = 0; i < 9; i++) __bv.move(1); });
ok('wall kick', await ev(p, () => __bv.rotate(1)));

// a nicer mid-game picture
await ev(p, () => { const S = __bv.S; S.grid.fill(0); __bv.setRows(['.....T....', 'S...TTL...', 'SS.ZZ.L..O', 'JS.IZZLLOO', 'JJJIOOTTTI', 'LLLIOO.T.I', 'LZZIJJJ.SI', 'LOZZJSSSSI']); S.hold = 4; __bv.setCur(7); __bv.rotate(1); __bv.move(-2); });
await p.waitForTimeout(300); await shot(p, 'play');
// pause modal
await p.click('#bvPause'); await p.waitForTimeout(200);
ok('pause modal', await vis(p, 'bvPauseModal')); const t0 = await ev(p, () => __bv.S.time); await p.waitForTimeout(500);
ok('time frozen while paused', await ev(p, t => __bv.S.time === t, t0)); await shot(p, 'pause');
await p.click('#bvPauseGo'); await p.waitForTimeout(100);
ok('resume countdown', await ev(p, () => __bv.countdown > 0));
await p.waitForTimeout(1500);

// save / resume after reload
const snap = await ev(p, () => ({ score: __bv.S.score, lines: __bv.S.lines, hold: __bv.S.hold })); ok('alive before leaving', await ev(p, () => !__bv.S.over), JSON.stringify(await ev(p, () => [__bv.S.over, __bv.S.cur, __bv.S.grid.join('')])));
await p.click('#bvBack'); await p.waitForTimeout(200);
ok('menu badge', await ev(p, () => document.querySelector('#tileBv').classList.contains('has-save')));
await p.waitForTimeout(1500);   // Chromium commits localStorage to disk lazily; reloading sooner can lose it in headless tests
await p.reload(); await p.waitForTimeout(400);
ok('save survives reload', await ev(p, () => document.querySelector('#tileBv').classList.contains('has-save')));
await p.tap('#tileBv'); await p.waitForTimeout(300);
ok('state before resume', true, JSON.stringify(await ev(p, () => ({ save: !!localStorage.getItem('bv.save') }))));
ok('resume button', await ev(p, () => !document.querySelector('#bvResume').hidden));
await p.click('#bvResume'); await p.waitForTimeout(200);
const snap2 = await ev(p, () => ({ score: __bv.S.score, lines: __bv.S.lines, hold: __bv.S.hold }));
ok('resumed state', JSON.stringify(snap) === JSON.stringify(snap2), JSON.stringify([snap, snap2]));
await p.waitForTimeout(1400);

// game over
await ev(p, () => { const S = __bv.S; for (let y = 0; y < 22; y++) for (let x = 0; x < 10; x++) S.grid[y * 10 + x] = x === 0 ? 0 : 1 + (x + y) % 7; __bv.setCur(2); });
await p.waitForTimeout(700); await shot(p, 'gameover_anim');
await p.waitForTimeout(1200);
ok('game over → end modal', await vis(p, 'bvEndModal'), await p.textContent('#bvEndTitle'));
ok('save removed', await ev(p, () => !localStorage.getItem('bv.save')));
await shot(p, 'end');

// sprint finish
await p.click('#bvEndMenu'); await p.waitForTimeout(150);
await p.click('#bvModes button[data-mode="sprint"]'); await p.click('#bvGo'); await ev(p, () => __bv.skip());
await ev(p, () => { const S = __bv.S; S.lines = 39; S.time = 75.4; __bv.setRows(['IIIIOOTTT.']); __bv.setCur(1); __bv.rotate(1); for (let i = 0; i < 6; i++) __bv.move(1); __bv.hardDrop(); });
await p.waitForTimeout(500); await shot(p, 'sprint_win'); await p.waitForTimeout(1300);
ok('sprint finish', await vis(p, 'bvEndModal'), (await p.textContent('#bvEndTitle')) + ' / ' + (await p.textContent('#bvEndText')));
ok('sprint best stored', await ev(p, () => __bv.stats().best.sprint != null));
// ultra time-out
await p.click('#bvEndMenu'); await p.waitForTimeout(150);
await p.click('#bvModes button[data-mode="ultra"]'); await p.click('#bvGo'); await ev(p, () => __bv.skip());
await ev(p, () => { __bv.S.time = 119.8; __bv.S.score = 4321; }); await p.waitForTimeout(2000);
ok('ultra finish', await vis(p, 'bvEndModal'), await p.textContent('#bvEndTitle'));
ok('ultra best', await ev(p, () => __bv.stats().best.ultra === 4321));
await p.click('#bvEndMenu'); await p.waitForTimeout(150); await shot(p, 'start_records');

// buttons mode
await p.click('#bvOptList button[data-k="ctl"][data-v=\'"knoppen"\']'); await p.click('#bvModes button[data-mode="klassiek"]'); await p.click('#bvGo'); await ev(p, () => __bv.skip());
await ev(p, () => { __bv.setRows(['.....T....', 'S...TTL...', 'SS.ZZ.L..O', 'JS.IZZLLOO']); __bv.setCur(4); });
x0 = await ev(p, () => __bv.S.cur.x);
await p.tap('#bvPad button[data-a="L"]'); await p.waitForTimeout(60);
ok('button left', await ev(p, x => __bv.S.cur.x === x - 1, x0));
await p.tap('#bvPad button[data-a="CW"]'); ok('button rotate', await ev(p, () => __bv.S.cur.r === 1));
await p.waitForTimeout(200); await shot(p, 'buttons');
await p.close();

// landscape, both control modes
for (const ctl of ['gebaren', 'knoppen']) {
  p = await page({ viewport: { width: 915, height: 412 }, isMobile: true });
  await ev(p, c => localStorage.setItem('bv.settings', JSON.stringify({ ctl: c })), ctl); await p.reload(); await p.waitForTimeout(300);
  await p.tap('#tileBv'); await p.waitForTimeout(300); await p.click('#bvGo'); await ev(p, () => __bv.skip());
  await ev(p, () => { const S = __bv.S; __bv.setRows(['.....T....', 'S...TTL...', 'SS.ZZ.L..O', 'JS.IZZLLOO', 'JJJIOOTTTI']); S.hold = 2; S.score = 12340; S.lines = 17; S.level = 2; __bv.setCur(3); });
  await p.waitForTimeout(400); await shot(p, 'land_' + ctl);
  v = await ev(p, () => __bv.view);
  ok('landscape fits ' + ctl, v.land && v.by >= 0 && v.by + 20 * v.c <= v.H && v.holdR.x >= 0 && v.nextR.x + v.nextR.w <= v.W, JSON.stringify({ c: v.c, by: v.by }));
  await p.close();
}
// small phone
p = await page({ viewport: { width: 360, height: 640 } });
await p.tap('#tileBv'); await p.waitForTimeout(300); await p.click('#bvGo'); await ev(p, () => __bv.skip()); await p.waitForTimeout(200); await shot(p, 'small');
await p.close();

// Android back: play → pause dialog → leave; statistics + trophies
p = await page();
await p.tap('#tileBv'); await p.waitForTimeout(300); await p.click('#bvGo'); await ev(p, () => __bv.skip());
await ev(p, () => { __bv.S.q4 = 1; __bv.stats().quads = Math.max(1, __bv.stats().quads); __bv.S.grid.fill(0); });
await ev(p, () => window.appBack()); await p.waitForTimeout(100);
ok('back pauses', await vis(p, 'bvPauseModal'));
await ev(p, () => window.appBack()); await p.waitForTimeout(200);
ok('back again leaves', await ev(p, () => document.querySelector('#menu').classList.contains('active')));
await p.click('#statBtn'); await p.waitForTimeout(200);
ok('stats row', (await p.textContent('#statBody')).includes('Blokval'));
await ev(p, () => window.appBack()); await p.click('#trophyBtn'); await p.waitForTimeout(200);
ok('trophies listed', await ev(p, () => { const t = document.querySelector('#trophyModal').textContent; return t.includes('Vierdubbel') && t.includes('Hogesnelheidsbouwer'); }));
await p.close();
} catch (e) { res.push('FAIL exception ' + e.message.split('\n')[0]); }
console.log(res.join('\n'));
console.log('errors:', errs.length ? errs : 'none');
await b.close();
