import { existsSync as require_exists } from 'node:fs';
// Snoepmix end-to-end test: node sm1.mjs [path/to/index.html]
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
const idle = p => p.waitForFunction(() => !__sm.busy, null, { timeout: 20000 });
const base = (r, c) => 'roygb'[(c + 2 * r) % 5];
const rows = over => [...Array(8)].map((_, r) => [...Array(8)].map((_, c) => over[r * 8 + c] || base(r, c)).join(''));
async function setup(p, over, specials = []) {
  await p.evaluate(([rws, sp]) => { __sm.board(rws); sp.forEach(([i, k, s]) => __sm.set(i, k, s)); }, [rows(over), specials]);
  return p.evaluate(() => __sm.findGroups().length);
}

const p = await page(false);
await p.evaluate(() => document.querySelector('#tileSm').scrollIntoView({ block: 'center' }));
await p.waitForTimeout(300);
await p.screenshot({ path: G + 'sm_menu.png' });
ok(await p.evaluate(() => document.querySelector('#tileSm img.gi') !== null), 'menu tile has vector icon');
await p.evaluate(() => document.querySelector('#statBtn').click()); await p.waitForTimeout(200);
ok(await p.evaluate(() => /Snoepmix/.test(document.querySelector('#statBody').textContent)), 'statistics row for Snoepmix');
await p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
await p.tap('#tileSm'); await p.waitForTimeout(300);
ok(await p.evaluate(() => document.querySelector('#smStartModal').classList.contains('show')), 'start modal opens');
ok(await p.evaluate(() => document.querySelectorAll('#smLevels button').length === 20 && document.querySelectorAll('#smLevels button.lock').length === 19), '20 levels, 19 locked');
await p.screenshot({ path: G + 'sm_start.png' });
await p.tap('#smLevels button[data-n="0"]'); await p.waitForTimeout(400);
await p.screenshot({ path: G + 'sm_intro.png' });
await p.tap('#smLvGo'); await p.waitForTimeout(1600);
await p.screenshot({ path: G + 'sm_board.png' });
ok(await p.evaluate(() => !__sm.findGroups().length && !!__sm.findMove()), 'no initial matches, a move exists');

// a real swipe gesture on a valid move
const mv = await p.evaluate(() => __sm.findMove());
const [x0, y0] = await p.evaluate(i => __sm.cell(i), mv[0]), [x1, y1] = await p.evaluate(i => __sm.cell(i), mv[1]);
const bb = await p.evaluate(() => { const r = document.querySelector('#smCanvas').getBoundingClientRect(); return [r.left, r.top]; });
const cdp = await p.context().newCDPSession(p);
const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: bb[0] + x, y: bb[1] + y }] });
await touch('touchStart', x0, y0); for (let k = 1; k <= 5; k++) await touch('touchMove', x0 + (x1 - x0) * k / 5, y0 + (y1 - y0) * k / 5); await touch('touchEnd');
await p.waitForTimeout(260); await p.screenshot({ path: G + 'sm_cascade.png' });
await idle(p);
ok(await p.evaluate(() => __sm.S.moves === 15 && __sm.S.score > 0), 'swipe swap: valid move used, score ' + await p.evaluate(() => __sm.S.score));

// tap-tap invalid swap bounces back
await setup(p, {});
const m0 = await p.evaluate(() => __sm.S.moves);
const [ax, ay] = await p.evaluate(() => __sm.cell(0)), [bx, by] = await p.evaluate(() => __sm.cell(1));
await p.mouse.click(bb[0] + ax, bb[1] + ay); await p.mouse.click(bb[0] + bx, bb[1] + by);
await p.waitForTimeout(120); await idle(p);
ok(await p.evaluate(m => __sm.S.moves === m && __sm.S.bad && __sm.S.p[0].k === 0, m0), 'invalid tap-tap swap bounces back, no move used');

// specials from matches
async function special(name, over, a, bIdx, check) {
  const g = await setup(p, over); if (g) console.log('  setup has matches!', name);
  const made0 = await p.evaluate(() => __sm.S.made);
  await p.evaluate(([a, b]) => __sm.tryMove(a, b), [a, bIdx]);
  await p.waitForTimeout(430); await p.screenshot({ path: G + 'sm_' + name + '.png' });
  await idle(p);
  const r = await p.evaluate(m => ({ made: __sm.S.made - m }), made0);
  ok(r.made >= 1, `${name}: special created (${r.made})`);
}
const P = (r, c) => r * 8 + c;
await special('striped', { [P(4, 0)]: 'p', [P(4, 1)]: 'p', [P(4, 3)]: 'p', [P(3, 2)]: 'p' }, P(3, 2), P(4, 2));
await special('wrapped', { [P(4, 0)]: 'p', [P(4, 1)]: 'p', [P(5, 2)]: 'p', [P(6, 2)]: 'p', [P(3, 2)]: 'p' }, P(3, 2), P(4, 2));
await special('orbmake', { [P(4, 0)]: 'p', [P(4, 1)]: 'p', [P(4, 3)]: 'p', [P(4, 4)]: 'p', [P(3, 2)]: 'p' }, P(3, 2), P(4, 2));
// check what the special looks like right after creation (no cascade): build it and capture
await setup(p, {}, [[P(2, 1), 0, 1], [P(2, 3), 1, 2], [P(2, 5), 4, 3], [P(5, 2), 7, 4], [P(5, 5), 9, 0], [P(5, 4), 5, 3]]);
await p.waitForTimeout(300); await p.screenshot({ path: G + 'sm_specials.png' });

// special + special combos
async function combo(name, A, B) {
  await setup(p, {}, [[P(4, 3), A[0], A[1]], [P(4, 4), B[0], B[1]]]);
  const s0 = await p.evaluate(() => __sm.S.score), mv0 = await p.evaluate(() => __sm.S.moves);
  await p.evaluate(() => __sm.tryMove(35, 36));
  await p.waitForTimeout(450); await p.screenshot({ path: G + 'sm_combo_' + name + '.png' });
  await idle(p);
  const r = await p.evaluate(([s, m]) => ({ d: __sm.S.score - s, used: m - __sm.S.moves }), [s0, mv0]);
  ok(r.used === 1 && r.d > 500, `combo ${name}: +${r.d} points`);
}
await combo('stripe_stripe', [0, 1], [1, 2]);
await combo('stripe_wrap', [2, 1], [3, 3]);
await combo('wrap_wrap', [4, 3], [0, 3]);
await combo('orb_normal', [7, 4], [1, 0]);
await combo('orb_stripe', [7, 4], [2, 1]);
await combo('orb_wrap', [3, 3], [7, 4]);
await combo('orb_orb', [7, 4], [7, 4]);

// reshuffle + hint
await p.evaluate(() => __sm.reshuffle()); await p.waitForTimeout(800); await p.screenshot({ path: G + 'sm_shuffle.png' }); await idle(p);
ok(await p.evaluate(() => !__sm.findGroups().length && !!__sm.findMove()), 'reshuffle leaves no matches and a move');
await p.waitForTimeout(5600);
ok(await p.evaluate(() => !!__sm.hint), 'hint appears after 5 s idle');
await p.screenshot({ path: G + 'sm_hint.png' });

const mus = await p.waitForFunction(() => __sfx._state().now === 'sm', null, { timeout: 15000 }).then(() => true).catch(() => false);
ok(mus, 'music track sm renders and plays ' + JSON.stringify(await p.evaluate(() => __sfx._state())));
// win level 1 (score level): last move with enough points
await p.evaluate(() => { __sm.setMoves(1); __sm.addScore(25000); });
await p.evaluate(() => { const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); });
await idle(p); await p.waitForTimeout(1900);
ok(await p.evaluate(() => __sm.S.over && __sm.S.won && __sm.starsOf() === 3 && document.querySelector('#smEndModal').classList.contains('show')), 'level 1 won with 3 stars, end modal');
ok(await p.evaluate(() => __sm.prog.unlocked === 2 && __sm.prog.stars[0] === 3), 'progress saved, level 2 unlocked');
await p.screenshot({ path: G + 'sm_win.png' });

// lose level 2
await p.tap('#smEndNext'); await p.waitForTimeout(300); await p.tap('#smLvGo'); await p.waitForTimeout(1200);
await p.evaluate(() => { __sm.setMoves(1); const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); });
await idle(p); await p.waitForTimeout(1600);
ok(await p.evaluate(() => __sm.S.over && !__sm.S.won && document.querySelector('#smEndModal').classList.contains('show')), 'level 2 lost, end modal');
await p.screenshot({ path: G + 'sm_lose.png' });

// goal level with jelly: clear the jelly, then the sweet finale uses the remaining moves
await p.evaluate(() => { __sm.unlockAll(); __sm.startLevel(2); });
await p.waitForTimeout(300); await p.screenshot({ path: G + 'sm_intro_jelly.png' });
await p.tap('#smLvGo'); await p.waitForTimeout(1300);
await p.screenshot({ path: G + 'sm_jelly.png' });
await p.evaluate(() => { __sm.S.jelly.fill(0); const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); });
await p.waitForTimeout(1700); await p.screenshot({ path: G + 'sm_finale.png' }); await idle(p);
await p.waitForTimeout(1500);
ok(await p.evaluate(() => __sm.S.won && __sm.S.moves === 0), 'jelly level won, finale used the remaining moves');

// save / resume
await p.evaluate(() => __sm.startLevel(5)); await p.tap('#smLvGo'); await p.waitForTimeout(1300);
await p.screenshot({ path: G + 'sm_ice.png' });
await p.evaluate(() => __sm.startLevel(14)); await p.waitForTimeout(500); await p.screenshot({ path: G + 'sm_intro_rainbow.png' }); await p.tap('#smLvGo'); await p.waitForTimeout(1300); await p.screenshot({ path: G + 'sm_rainbow.png' });
await p.evaluate(() => __sm.startLevel(5)); await p.tap('#smLvGo'); await p.waitForTimeout(1300);
await p.evaluate(() => { const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); }); await idle(p);
const snap = await p.evaluate(() => ({ s: __sm.S.score, m: __sm.S.moves, k: __sm.S.p.map(q => q ? q.k : -1).join() }));
await p.tap('#smBack'); await p.waitForTimeout(300);
ok(await p.evaluate(() => document.querySelector('#tileSm').classList.contains('has-save')), 'menu shows Doorgaan badge');
console.log('  before reload', await p.evaluate(() => !!localStorage.getItem('sm.save')));
await p.evaluate(() => location.reload()); await p.waitForTimeout(600);
console.log('  after reload', await p.evaluate(() => !!localStorage.getItem('sm.save')));
await p.tap('#tileSm'); await p.waitForTimeout(300);
console.log('  state', await p.evaluate(() => [!!__sm.S, __sm.S && __sm.S.over, !!localStorage.getItem('sm.save'), document.querySelector('.screen.active').id, [...document.querySelectorAll('.modal.show')].map(m => m.id).join()]));
ok(await p.evaluate(() => !document.querySelector('#smResume').hidden), 'Verder button visible after reload');
await p.tap('#smResume'); await p.waitForTimeout(300);
ok(await p.evaluate(s => __sm.S.score === s.s && __sm.S.moves === s.m && __sm.S.p.map(q => q ? q.k : -1).join() === s.k, snap), 'resumed game is identical');

// the menu can't be opened halfway through an animation; the game pauses while a dialog is open
await p.evaluate(() => { const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); document.querySelector('#smMenu').click(); });
ok(await p.evaluate(() => __sm.busy && !document.querySelector('#smStartModal').classList.contains('show')), 'menu ignored during animation');
await idle(p);
await p.evaluate(() => { const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); }); await idle(p);
await p.evaluate(() => document.querySelector('#smRetry').click()); await p.waitForTimeout(6000);
ok(await p.evaluate(() => document.querySelector('#askModal').classList.contains('show') && !__sm.hint), 'game paused (no hint) while confirm dialog open');
await p.tap('#askNo'); await p.waitForTimeout(200);
// endless
await p.evaluate(() => { document.querySelector('#smMenu').click(); }); await p.waitForTimeout(200);
await p.tap('#smEndless'); await p.waitForTimeout(1300);
for (let k = 0; k < 3; k++) { await p.evaluate(() => { const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); }); await idle(p); }
const eb = await p.evaluate(() => ({ m: __sm.S.moves, nb: __sm.S.nextBonus }));
await p.evaluate(nb => __sm.addScore(nb), eb.nb);
await p.evaluate(() => { const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); }); await idle(p);
ok(await p.evaluate(m => __sm.S.moves === m - 1 + 5 || __sm.S.moves >= m + 4, eb.m), 'endless: bonus moves awarded');
await p.screenshot({ path: G + 'sm_endless.png' });
await p.evaluate(() => { __sm.setMoves(1); const m = __sm.findMove(); __sm.tryMove(m[0], m[1]); }); await idle(p); await p.waitForTimeout(1500);
ok(await p.evaluate(() => __sm.S.over && __sm.prog.endless > 0 && document.querySelector('#smEndModal').classList.contains('show')), 'endless over, record saved');
await p.screenshot({ path: G + 'sm_endless_end.png' });
ok(await p.evaluate(() => { const r = window.__sfx._test(); return Object.keys(r).filter(n => n.startsWith('sm')).every(n => r[n].nan === 0 && r[n].pk > 0); }), 'all sm sounds render');
await p.evaluate(() => document.querySelector('#smEndMenu').click()); await p.waitForTimeout(300);
await p.screenshot({ path: G + 'sm_levels.png' });

// landscape
const q = await page(true);
await q.evaluate(() => { localStorage.setItem('sm.progress', JSON.stringify({ unlocked: 7, stars: { 0: 3, 1: 2, 2: 1, 3: 3, 4: 2, 5: 1 }, best: {}, endless: 23450, played: 9, won: 6 })); });
await q.evaluate(() => location.reload()); await q.waitForTimeout(500);
await q.evaluate(() => document.querySelector('#tileSm').click()); await q.waitForTimeout(300);
await q.screenshot({ path: G + 'sm_startL.png' });
await q.evaluate(() => __sm.startLevel(18)); await q.waitForTimeout(300); await q.screenshot({ path: G + 'sm_introL.png' });
await q.evaluate(() => document.querySelector('#smLvGo').click()); await q.waitForTimeout(1500);
await q.screenshot({ path: G + 'sm_boardL.png' });
await q.evaluate(() => __sm.startLevel(14)); await q.evaluate(() => document.querySelector('#smLvGo').click()); await q.waitForTimeout(1500);
await q.screenshot({ path: G + 'sm_rainbowL.png' });
await q.evaluate(() => __sm.startLevel(16)); await q.evaluate(() => document.querySelector('#smLvGo').click()); await q.waitForTimeout(1500);
await q.screenshot({ path: G + 'sm_ingL.png' });

console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'no console errors');
console.log(fails.length ? fails.length + ' FAILED' : 'ALL PASSED');
await b.close();
