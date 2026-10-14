import { existsSync as require_exists } from 'node:fs';
// Katapult end-to-end test: node kp1.mjs [path/to/index.html]
import { chromium, devices } from 'playwright';
const file = process.argv[2] || (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname);
const G = new URL('../build/gfx/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'ok   ' : 'FAIL ') + m); };
async function page(land) {
  const p = await (await b.newContext(land ? { ...devices['Pixel 7 landscape'] } : { ...devices['Pixel 7'] })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99"}'));
  await p.goto('file://' + file); await p.waitForTimeout(400);
  return p;
}
const waitState = (p, st, t = 30000) => p.waitForFunction(s => s.split('|').includes(__kp.state), st, { timeout: t });
const box = p => p.evaluate(() => { const r = document.querySelector('#kpCanvas').getBoundingClientRect(); return [r.left, r.top]; });
// a real pointer drag from the critter on the slingshot back to the aim point, then release
async function drag(p, a, pw, shot, again = 1) {
  await waitState(p, 'aim');
  // let the camera finish gliding back to the slingshot before grabbing it
  await p.waitForFunction(() => { const [x0] = __kp.pouch(); return new Promise(r => setTimeout(() => r(Math.abs(__kp.pouch()[0] - x0) < .5), 120)); }, null, { timeout: 8000 });
  const bb = await box(p), [ax, ay] = await p.evaluate(() => __kp.pouch()), [tx, ty] = await p.evaluate(([a, pw]) => __kp.aimPoint(a, pw), [a, pw]);
  await p.mouse.move(bb[0] + ax, bb[1] + ay); await p.mouse.down();
  for (let k = 1; k <= 10; k++) { await p.mouse.move(bb[0] + ax + (tx - ax) * k / 10, bb[1] + ay + (ty - ay) * k / 10); await p.waitForTimeout(16); }
  if (shot) await p.screenshot({ path: G + shot });
  await p.mouse.up();
  if (again && await p.evaluate(() => __kp.state) === 'aim') return drag(p, a, pw, shot, 0);
}
async function tapCanvas(p) { const bb = await box(p); await p.mouse.click(bb[0] + 200, bb[1] + 120); }

/* ---------- menu, start dialog, level select ---------- */
const p = await page(false);
await p.evaluate(() => document.querySelector('#tileKp').scrollIntoView({ block: 'center' }));
await p.waitForTimeout(300); await p.screenshot({ path: G + 'kp_menu.png' });
ok(await p.evaluate(() => !!document.querySelector('#tileKp img.gi')), 'menu tile has the vector icon');
await p.evaluate(() => document.querySelector('#statBtn').click()); await p.waitForTimeout(200);
ok(await p.evaluate(() => /Katapult/.test(document.querySelector('#statBody').textContent)), 'statistics row for Katapult');
await p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
await p.tap('#tileKp'); await p.waitForTimeout(400);
ok(await p.evaluate(() => document.querySelector('#kpStartModal').classList.contains('show')), 'start dialog opens');
ok(await p.evaluate(() => document.querySelectorAll('#kpLevels button').length === 20 && document.querySelectorAll('#kpLevels button.lock').length === 19), '20 levels, 19 locked');
await p.screenshot({ path: G + 'kp_start.png' });
await p.tap('#kpLevels button[data-n="0"]'); await p.waitForTimeout(500);
ok(await p.evaluate(() => __kp.state === 'intro' && !document.querySelector('.modal.show')), 'level 1 starts with the camera intro');
await p.screenshot({ path: G + 'kp_intro.png' });

/* ---------- stability: every level stands still for 10 s before the first shot ---------- */
const stab = await p.evaluate(() => __kp.LEVELS.map((_, i) => __kp.stability(i)));
const bad = stab.map((r, i) => [i + 1, r]).filter(([, r]) => r.moved > .03 || r.dmg > 0 || r.rac !== r.racs);
ok(!bad.length, `all 20 structures at rest for 10 s asleep + 10 s woken up (max settle ${Math.max(...stab.map(r => r.moved)).toFixed(4)} m)` + (bad.length ? JSON.stringify(bad) : ''));
// solver bot (same physics core) finds a win for the first levels in the browser too
const sv = await p.evaluate(() => [0, 1, 2].map(i => { const r = __kp.solve(i); return [r.win, r.used, r.of]; }));
ok(sv.every(r => r[0]), 'solver bot wins levels 1-3 in the browser ' + JSON.stringify(sv));
// and in the live game: nothing moves during 10 real seconds of aiming time
await waitState(p, 'aim');
const live0 = await p.evaluate(() => __kp.S.objs.filter(o => o.k !== 'ter').map(o => [o.body.getPosition().x, o.body.getPosition().y, o.hp]));
await p.waitForTimeout(10000);
const live1 = await p.evaluate(() => __kp.S.objs.filter(o => o.k !== 'ter').map(o => [o.body.getPosition().x, o.body.getPosition().y, o.hp]));
ok(live0.every((a, i) => Math.hypot(a[0] - live1[i][0], a[1] - live1[i][1]) < .001 && a[2] === live1[i][2]), 'live level 1: no movement or damage during 10 s');
await p.screenshot({ path: G + 'kp_aim_portrait.png' });

/* ---------- aiming + launch with a real pointer drag, collisions and breaking ---------- */
const cam0 = await p.evaluate(() => __kp.cam.x);
await drag(p, 24.5, .76, 'kp_pull.png');
ok(await p.evaluate(() => __kp.state === 'fly' && __kp.S.crits.length === 1), 'drag + release launches the critter');
await p.waitForTimeout(700); await p.screenshot({ path: G + 'kp_flight.png' });
ok(await p.evaluate(c => __kp.cam.x > c + 2, cam0), 'camera follows the critter');
await p.waitForTimeout(900); await p.screenshot({ path: G + 'kp_impact.png' });
await waitState(p, 'aim|bonus|done|lose', 30000);
let r = await p.evaluate(() => ({ broke: __kp.S.broke, ko: __kp.S.ko, score: __kp.S.score, st: __kp.state }));
ok(r.score > 0 && (r.broke > 0 || r.ko > 0), `impact breaks blocks / knocks out raccoons (broke ${r.broke}, ko ${r.ko}, score ${r.score})`);
if (r.st === 'aim') { await p.waitForTimeout(1500); ok(await p.evaluate(() => __kp.cam.x < 10), 'camera returns to the slingshot'); }
// finish the level (win): good shots for level 1 (found by the solver bot), retry if the physics plays out differently
await p.evaluate(() => { __kp.speed = 3; });
for (let tries = 0; tries < 4; tries++) {
  for (const [a, pw] of [[26, .76], [10, .85], [18, .8]]) { if (await p.evaluate(() => __kp.state) !== 'aim') break; await drag(p, a, pw); await waitState(p, 'aim|bonus|done|lose', 40000); }
  await waitState(p, 'done', 40000);
  if (await p.evaluate(() => __kp.S.rac === 0)) break;
  await p.tap('#kpEndRetry'); await p.evaluate(() => __kp.skip());
}
await p.waitForTimeout(900);
await p.screenshot({ path: G + 'kp_win.png' });
r = await p.evaluate(() => ({ modal: document.querySelector('#kpEndModal.show') && !document.querySelector('#kpEndModal').classList.contains('lost'), stars: document.querySelectorAll('#kpEndStars span.on').length, prog: JSON.parse(localStorage.getItem('kp.progress')) }));
ok(r.modal && r.stars >= 1, `win dialog with ${r.stars} star(s)`);
ok(r.prog && r.prog.stars[0] >= 1 && r.prog.unlocked === 2 && r.prog.best[0] > 0, 'stars, best score and unlock saved in kp.progress');

/* ---------- losing: shoot every critter straight up ---------- */
await p.tap('#kpEndRetry'); await p.waitForTimeout(300);
for (let i = 0; i < 3; i++) { await drag(p, 88, .45); await waitState(p, 'aim|lose|done', 40000); }
await waitState(p, 'done', 20000); await p.waitForTimeout(600);
ok(await p.evaluate(() => document.querySelector('#kpEndModal.show.lost') && document.querySelector('#kpEndNext').hidden), 'lose dialog when all critters are used');
await p.screenshot({ path: G + 'kp_lose.png' });

/* ---------- abilities (tap during the flight) ---------- */
await p.evaluate(() => { __kp.unlockAll(); __kp.speed = 1; });
async function ability(level, a, pw, wait, check, name) {
  await p.evaluate(n => __kp.load(n), level - 1); await p.evaluate(() => __kp.skip());
  await drag(p, a, pw);
  await p.waitForTimeout(wait);
  const before = await p.evaluate(() => { const v = __kp.S.active.body.getLinearVelocity(); return Math.hypot(v.x, v.y); });
  await tapCanvas(p); await p.waitForTimeout(60);
  await p.screenshot({ path: G + `kp_ab_${name}.png` });
  const res = await p.evaluate(check, before);
  ok(res === true, `ability ${name}: ${res}`);
  await p.waitForTimeout(700); await p.screenshot({ path: G + `kp_ab_${name}2.png` });
}
await ability(3, 45, .8, 550, () => __kp.S.crits.filter(o => !o.dead).length === 3 || 'crits ' + __kp.S.crits.length, 'split');
await ability(5, 25, .85, 400, b => { const v = __kp.S.active.body.getLinearVelocity(), s = Math.hypot(v.x, v.y); return s > b * 1.4 || `speed ${b.toFixed(1)} -> ${s.toFixed(1)}`; }, 'boost');
await ability(8, 40, .9, 900, () => { const o = __kp.S.active, v = o.body.getLinearVelocity(); return (o.dive > 0 && o.heavy && (v.y > 15 || o.hit)) || 'vy ' + v.y.toFixed(1); }, 'dive');
await ability(12, 17, .83, 650, () => (__kp.S.active.boomed === true && __kp.parts > 10) || `exploded ${__kp.S.active.boomed}, particles ${__kp.parts}`, 'boom');

/* ---------- pinch / drag to look around ---------- */
await p.evaluate(() => __kp.load(19)); await p.evaluate(() => __kp.skip()); await waitState(p, 'aim'); await p.waitForTimeout(800);
const c0 = await p.evaluate(() => [__kp.cam.x, __kp.cam.s]);
{ const bb = await box(p); await p.mouse.move(bb[0] + 330, bb[1] + 200); await p.mouse.down(); for (let k = 1; k <= 8; k++) { await p.mouse.move(bb[0] + 330 - k * 30, bb[1] + 200); await p.waitForTimeout(16); } await p.mouse.up(); }
const c1 = await p.evaluate(() => [__kp.cam.x, __kp.cam.s]);
ok(c1[0] > c0[0] + 3, `dragging pans the camera (${c0[0].toFixed(1)} -> ${c1[0].toFixed(1)})`);
const cdp = await p.context().newCDPSession(p), bb = await box(p);
const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x: bb[0] + x, y: bb[1] + y, id })) });
await tp('touchStart', [[150, 300], [250, 300]]); for (let k = 1; k <= 6; k++) await tp('touchMove', [[150 + k * 12, 300], [250 - k * 12, 300]]); await tp('touchEnd', []);
const c2 = await p.evaluate(() => [__kp.cam.x, __kp.cam.s]);
ok(c2[1] < c1[1] * .9, `pinch zooms out (${c1[1].toFixed(1)} -> ${c2[1].toFixed(1)} px/m)`);
await p.screenshot({ path: G + 'kp_zoomout.png' });
// back button leaves the game
await p.evaluate(() => window.appBack()); await p.waitForTimeout(300);
ok(await p.evaluate(() => document.querySelector('#menu').classList.contains('active')), 'back leaves the game');

/* ---------- landscape: themes and frame time ---------- */
const q = await page(true);
await q.tap('#tileKp'); await q.waitForTimeout(300);
await q.evaluate(() => { __kp.unlockAll(); __kp.load(13); __kp.skip(); }); await waitState(q, 'aim'); await q.waitForTimeout(1200);
await q.screenshot({ path: G + 'kp_land_haven.png' });
await q.evaluate(() => { __kp.load(19); __kp.skip(); }); await waitState(q, 'aim'); await q.waitForTimeout(1200);
await q.screenshot({ path: G + 'kp_land_castle.png' });
await q.evaluate(() => { __kp.perf.n = 0; __kp.perf.sum = 0; __kp.perf.max = 0; });
await drag(q, 14, 1, 'kp_land_pull.png'); await q.waitForTimeout(1300); await q.screenshot({ path: G + 'kp_land_impact.png' });
await q.waitForTimeout(2500);
const pf = await q.evaluate(() => ({ avg: __kp.perf.sum / __kp.perf.n, max: __kp.perf.max, n: __kp.perf.n }));
ok(pf.avg < 8, `frame work during a big collapse: avg ${pf.avg.toFixed(2)} ms, max ${pf.max.toFixed(1)} ms over ${pf.n} frames`);
await q.evaluate(() => { __kp.load(0); __kp.skip(); }); await waitState(q, 'aim'); await q.waitForTimeout(900);
await q.screenshot({ path: G + 'kp_land_park.png' });

ok(!errs.length, 'no console errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL OK');
await b.close();
