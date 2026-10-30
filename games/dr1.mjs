import { existsSync } from 'node:fs';
// Dakrenner browser test: node games/dr1.mjs [path-to-index.html]   (default: APP_HTML or build/work/drtest/index.html)
// env PART = all | main | finish | resume | opts | portrait | small | perf    (comma separated)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'drtest', 'index.html'));
const GFX = path.join(here, '..', 'build', 'gfx');
const PARTS = (process.env.PART || 'all').split(',');
const want = p => PARTS.includes('all') || PARTS.includes(p);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const LAND = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
async function page(o = LAND, cfg = '{"seen":"9.99","mute":true}', pre = null) {
  const ctx = await b.newContext(o), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(([c, pre]) => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', c); if (pre) for (const [k, v] of Object.entries(pre)) localStorage.setItem(k, v); sessionStorage.setItem('init', 1); } }, [cfg, pre]);
  await p.goto(target); await p.waitForTimeout(500);
  p.cdp = await ctx.newCDPSession(p); p.tp = new Map();
  return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const wait = (p, ms) => p.waitForTimeout(ms);
const vis = (p, id) => ev(p, id => document.getElementById(id).classList.contains('show'), id);
async function openGame(p) { await ev(p, () => document.querySelector('#tileDr').scrollIntoView({ block: 'center' })); await p.tap('#tileDr'); await wait(p, 500); }
// multi-touch through CDP (real touch events -> pointer events)
async function touch(p, type, id, x, y) {
  // CDP: touchStart / touchMove carry all fingers that are down; touchEnd carries only the finger that is lifted
  const was = p.tp.get(id); if (type === 'end') p.tp.delete(id); else p.tp.set(id, { x, y, id });
  const pt = t => ({ x: t.x, y: t.y, id: t.id, radiusX: 4, radiusY: 4, force: 1 });
  if (type === 'end') { if (was) await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(was)] }); return; }
  await p.cdp.send('Input.dispatchTouchEvent', { type: type === 'start' ? 'touchStart' : 'touchMove', touchPoints: [...p.tp.values()].map(pt) });
}
async function down(p, k, id) { const c = await ev(p, k => __dr.btnCenter(k), k); await touch(p, 'start', id, c.x, c.y); }
async function tapBtn(p, k, hold = 80, id = 20) { await down(p, k, id); await wait(p, hold); await touch(p, 'end', id); }
const shot = (p, name) => p.screenshot({ path: path.join(GFX, `dr_${name}.png`) });
const runTo = async (p, x, max = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await ev(p, x => __dr.S && __dr.S.x >= x, x)) return true; await wait(p, 50); } return false; };

/* ================= main: tile, start, level select, playing level 1 with real touches ================= */
if (want('main')) {
  const p = await page();
  ok('menu-tegel met vector-icoon', await ev(p, () => !!document.querySelector('#tileDr') && (document.querySelector('#tileDr .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileDr h2').textContent === 'Dakrenner'));
  await ev(p, () => document.querySelector('#tileDr').scrollIntoView({ block: 'center' })); await shot(p, 'menu_tile');
  await openGame(p);
  ok('startscherm opent', await vis(p, 'drStartModal') && await ev(p, () => document.querySelectorAll('#drModes [data-m]').length === 2 && document.querySelectorAll('#drOutfits button').length === 6));
  ok('eindeloze run nog op slot', await ev(p, () => document.querySelector('[data-m="endless"]').disabled));
  ok('startscherm: geen render-loop', !(await ev(p, () => __dr.running())));
  await p.tap('[data-m="levels"]'); await wait(p, 300);
  ok('levelkeuze: 8 levels per wereld, alleen level 1 open', await ev(p, () => document.querySelectorAll('#drLvGrid .dr-card').length === 8 && document.querySelectorAll('#drLvGrid .dr-card.lock').length === 7 && document.querySelectorAll('#drWorlds button.lock').length === 3));
  await shot(p, 'levels');
  await p.tap('#drLvGrid [data-i="1"]'); await wait(p, 200);
  ok('level 2 op slot: geen start', await ev(p, () => __dr.G.view === 'lv'));
  await p.tap('#drLvGrid [data-i="0"]'); await wait(p, 400);
  ok('level 1 start, HUD en knoppen zichtbaar', await ev(p, () => __dr.G.view === 'play' && getComputedStyle(document.getElementById('drHud')).display !== 'none' && document.querySelectorAll('.dr-b').length === 6 && __dr.running()));
  // run with the ▶ button (real touch), then jump with a second finger
  await down(p, 'R', 1); await wait(p, 700);
  const x1 = await ev(p, () => __dr.S.x);
  ok('▶ ingedrukt houden: de renner rent', x1 > 6 && await ev(p, () => __dr.S.gs > 5), `x ${x1.toFixed(1)}`);
  await tapBtn(p, 'J', 120, 2); await wait(p, 150);
  ok('springen met de knop (twee vingers tegelijk)', await ev(p, () => __dr.evc('jump') >= 1));
  await runTo(p, 22); await shot(p, 'play');
  // flip: jump and hold the flip button
  await tapBtn(p, 'J', 300, 2); await wait(p, 30);
  await down(p, 'CW', 3); await wait(p, 420); await touch(p, 'end', 3); await wait(p, 600);
  ok('salto-knop: er wordt gedraaid (salto of crash)', await ev(p, () => __dr.evc('spin') >= 1 && (__dr.evc('flipland') + __dr.evc('crash') + __dr.evc('stumble') + __dr.evc('land')) >= 1), JSON.stringify(await ev(p, () => ({ spin: __dr.evc('spin'), fl: __dr.evc('flipland'), crash: __dr.evc('crash') }))));
  // slide on the ground
  for (let i = 0; i < 40 && !(await ev(p, () => __dr.S.st === 0 && __dr.S.gs > 5)); i++) await wait(p, 50);
  const pre = await ev(p, () => ({ x: +__dr.S.x.toFixed(1), st: __dr.S.st, gs: +__dr.S.gs.toFixed(1) }));
  await tapBtn(p, 'S', 400, 4); await wait(p, 100);
  ok('glijden met de knop', await ev(p, () => __dr.evc('slide') >= 1), JSON.stringify(pre) + ' ' + JSON.stringify(await ev(p, () => ({ x: __dr.S.x, st: __dr.S.st, fall: __dr.evc('fall'), held: __dr.PAD.held }))));
  await touch(p, 'end', 1); await wait(p, 300);
  // a crash after the checkpoint brings you back to the flag
  await ev(p, () => { const S = __dr.S, P = __dr.L.cps[0]; S.x = P.x + 3; S.y = P.y - 3; S.st = 1; S.vy = 4; S.vx = 2; S.rot = Math.PI; S.rv = 0; S.cp = 1; });
  await wait(p, 300); await shot(p, 'crash');
  ok('op je hoofd landen = crash (ragdoll)', await ev(p, () => __dr.evc('crash') >= 1 && __dr.S.st === 9));
  await wait(p, 1800);
  ok('na de crash terug bij de vlag', await ev(p, () => __dr.S.st === 0 && Math.abs(__dr.S.x - __dr.L.cps[0].x) < .5 && __dr.evc('respawn') >= 1));
  // back = pause menu, the game stands still
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terugknop tijdens het spel = pauze', await vis(p, 'drPauseModal'));
  const f0 = await ev(p, () => __dr.S.f); await wait(p, 400); const f1 = await ev(p, () => __dr.S.f);
  ok('spel staat stil tijdens pauze, loop gestopt', f0 === f1 && !(await ev(p, () => __dr.running())));
  await shot(p, 'pause');
  await p.tap('#drPResume'); await wait(p, 300);
  ok('verder na pauze', await ev(p, () => !document.querySelector('.modal.show') && __dr.running()));
  // finish: let the test bot finish the level through the input path (fast forward)
  await ev(p, () => { __dr.manual(true); const S = __dr.S, L = __dr.L; S.x = L.finish.x - 6; S.y = L.finish.y; S.cp = L.cps.length; S.st = 0; S.gs = 9; for (let i = 0; i < 200 && !__dr.G.resultsUp; i++) { __dr.hold(__dr.KB.R); __dr.step(1); } __dr.hold(0); __dr.manual(false); });
  await wait(p, 1200);
  ok('finish -> resultaat met medaille', await vis(p, 'drEndModal') && await ev(p, () => /Goud|Zilver|Brons|Gehaald/.test(document.getElementById('drEndTitle').textContent) && /🥇|🥈|🥉|🏁/.test(document.getElementById('drEndPic').textContent)));
  await shot(p, 'results');
  ok('level 1 bewaard, level 2 open', await ev(p, () => { const s = JSON.parse(localStorage.getItem('dr.stats')); return s.lv[0] && s.lv[0].t > 0 && s.levels === 1; }));
  await p.tap('#drENext'); await wait(p, 400);
  ok('Volgende: level 2 start', await ev(p, () => __dr.G.lv === 1 && __dr.G.view === 'play'));
  await ev(p, () => window.appBack()); await wait(p, 200); await p.tap('#drPQuit'); await wait(p, 300);
  ok('Stoppen -> startscherm, loop stopt', await vis(p, 'drStartModal') && !(await ev(p, () => __dr.running())));
  // after a reload the progress is still there
  await p.reload(); await wait(p, 600); await openGame(p); await p.tap('[data-m="levels"]'); await wait(p, 300);
  ok('na herladen: level 1 gehaald, level 2 open', await ev(p, () => !document.querySelector('[data-i="1"]').classList.contains('lock') && !!document.querySelector('[data-i="0"] .md')));
  // stats and trophies
  await ev(p, () => __dr.quit()); await wait(p, 300);
  await ev(p, () => document.getElementById('statBtn').click()); await wait(p, 300);
  ok('statistiek: Dakrenner-regel', await ev(p, () => /1\/32 levels/.test(document.getElementById('statBody').textContent)));
  await ev(p, () => { document.querySelector('#statModal [data-close]').click(); document.getElementById('trophyBtn').click(); }); await wait(p, 300);
  ok('trofee "Dakrenner" verdiend', await ev(p, () => [...document.querySelectorAll('#trophyBody .trophy.on')].some(t => t.textContent.includes('Dakrenner'))));
  await ev(p, () => document.querySelector('#trophyModal [data-close]').click());
  ok('menu: geen render-loop meer', !(await ev(p, () => __dr.running())) && await ev(p, () => __dr.cur() === 'menu'));
  await p.close();
}

/* ================= save / resume ================= */
if (want('resume')) {
  const p = await page(LAND, undefined, { 'dr.stats': JSON.stringify({ lv: { 0: { t: 900, m: 2, c: 7 } } }) });
  await openGame(p); await p.tap('[data-m="levels"]'); await wait(p, 300); await p.tap('[data-i="1"]'); await wait(p, 300);
  await ev(p, () => { __dr.manual(true); const S = __dr.S, P = __dr.L.cps[0]; S.x = P.x - 2; S.y = P.y; S.gs = 8; for (let i = 0; i < 30; i++) { __dr.hold(__dr.KB.R); __dr.step(1); } __dr.hold(0); __dr.manual(false); });
  await wait(p, 200);
  ok('vlag gehaald in level 2', await ev(p, () => __dr.S.cp === 1));
  await ev(p, () => window.appBack()); await wait(p, 200); await p.tap('#drPQuit'); await wait(p, 300); await ev(p, () => __dr.quit()); await wait(p, 300);
  ok('menu-tegel toont "Doorgaan"', await ev(p, () => document.querySelector('#tileDr').classList.contains('has-save')));
  await p.reload(); await wait(p, 600);
  ok('na herladen nog steeds "Doorgaan"', await ev(p, () => document.querySelector('#tileDr').classList.contains('has-save')));
  await openGame(p);
  ok('startscherm: verder met level 2', await ev(p, () => !document.getElementById('drContinue').hidden && /level 2/.test(document.getElementById('drContinue').textContent)));
  await p.tap('#drContinue'); await wait(p, 400);
  ok('verder bij de vlag, met de tijd van toen', await ev(p, () => __dr.G.lv === 1 && Math.abs(__dr.S.x - __dr.L.cps[0].x) < 1 && __dr.S.f > 30));
  await p.close();
}

/* ================= the ghost of the best run ================= */
if (want('ghost')) {
  const sol = JSON.parse((await import('fs')).readFileSync(path.join(here, 'drsrc', 'solutions.json'), 'utf8'));
  const p = await page(LAND, undefined, { 'dr.stats': JSON.stringify({ lv: { 0: { t: 900, m: 2, c: 7 } } }) });
  await openGame(p);
  const r = await ev(p, rle => {
    __dr.startLevel(1); __dr.manual(true);
    for (let k = 0; k < rle.length; k += 2) for (let n = 0; n < rle[k + 1] && !__dr.S.done; n++) { __dr.hold(rle[k]); __dr.step(1); }
    __dr.hold(0); for (let n = 0; n < 120 && !__dr.G.resultsUp; n++) __dr.step(1);
    const saved = !!(JSON.parse(localStorage.getItem('dr.ghost') || '{}')[1]);
    document.getElementById('drERetry').click(); __dr.manual(true);
    for (let n = 0; n < 90; n++) __dr.step(1);                  // we stand still, the ghost runs
    const G = __dr.GH, S = __dr.S; return { saved, ghost: !!G, gx: G && G.x, sx: S.x };
  }, sol[2].rle);
  ok('geest: beste run bewaard en rent mee bij opnieuw spelen', r.saved && r.ghost && r.gx > r.sx + 4, JSON.stringify(r));
  const g2 = await ev(p, rle => { const G = __dr.GH; let i = 0, k = 0, f = 0; return G ? G.f : -1; }, null);
  await ev(p, () => { const S = __dr.S, G = __dr.GH; S.x = G.x - 2.5; S.y = G.y; __dr.manual(false); }); await wait(p, 200); await shot(p, 'ghost');
  ok('geest uit in de opties: geen geest', await ev(p, () => { __dr.openPause(); document.querySelector('#drPOpts button[data-k="ghost"][data-v="false"]').click(); document.getElementById('drPRestart').click(); return __dr.GH === null; }));
  await p.close();
}

/* ================= options: sound/music off is silent, big buttons ================= */
if (want('opts')) {
  const p = await page(LAND, '{"seen":"9.99","mute":false}', { 'dr.stats': JSON.stringify({ lv: { 0: { t: 900, m: 2, c: 7 }, 1: { t: 900, m: 1, c: 1 }, 2: { t: 900, m: 1, c: 1 } } }) });
  await ev(p, () => { window.__plays = []; const S = window.__sfx, o = S.play; S.play = (n, ...a) => { if (n.startsWith('dr')) window.__plays.push(n); return o.call(S, n, ...a); }; });
  await openGame(p);
  await p.tap('#drOpts button[data-k="sound"][data-v="false"]'); await wait(p, 100); await p.tap('#drOpts button[data-k="music"][data-v="false"]'); await wait(p, 100);
  await ev(p, () => { window.__plays.length = 0; });
  await p.tap('[data-m="levels"]'); await wait(p, 200); await p.tap('[data-i="0"]'); await wait(p, 300);
  await down(p, 'R', 1); await wait(p, 400); await tapBtn(p, 'J', 200, 2); await wait(p, 1200); await touch(p, 'end', 1);
  ok('geluidseffecten uit: stil', await ev(p, () => window.__plays.length === 0), await ev(p, () => window.__plays.slice(0, 5).join(',')));
  ok('muziek uit: geen muziek', await ev(p, () => !__sfx._state().now));
  await ev(p, () => window.appBack()); await wait(p, 200);
  await p.tap('#drPOpts button[data-k="sound"][data-v="true"]'); await wait(p, 100); await p.tap('#drPOpts button[data-k="music"][data-v="true"]'); await wait(p, 100);
  const r0 = await ev(p, () => __dr.btnCenter('J').r);
  await p.tap('#drPOpts button[data-k="big"][data-v="true"]'); await wait(p, 100);
  await p.tap('#drPResume'); await wait(p, 300);
  const r1 = await ev(p, () => __dr.btnCenter('J').r);
  ok('grote knoppen: knoppen worden groter', r1 > r0 * 1.15, `${r0.toFixed(0)} -> ${r1.toFixed(0)}`);
  await shot(p, 'bigbuttons');
  await down(p, 'R', 1); await wait(p, 500); await tapBtn(p, 'J', 200, 2); await wait(p, 4000); await touch(p, 'end', 1);
  ok('geluid aan: effecten klinken', await ev(p, () => window.__plays.some(n => n === 'drJump' || n === 'drStep')), await ev(p, () => [...new Set(window.__plays)].slice(0, 8).join(',')));
  ok('muziek aan: renmuziek speelt', await ev(p, () => __sfx._state().now === 'dr' || __sfx._state().busy === 'dr'), JSON.stringify(await ev(p, () => __sfx._state())));
  const r = await ev(p, () => Object.entries(__sfx._G).filter(([k]) => k.startsWith('dr')).map(([k]) => { const d = __sfx._buf(k).getChannelData(0); let pk = 0, nan = 0, jump = 0; for (let i = 1; i < d.length; i++) { if (d[i] !== d[i]) nan++; pk = Math.max(pk, Math.abs(d[i])); jump = Math.max(jump, Math.abs(d[i] - d[i - 1])); } return [k, +pk.toFixed(2), nan, +jump.toFixed(3), +(Math.abs(d[0]) + Math.abs(d[1])).toFixed(4)]; }));
  ok('geluiden: geen NaN, geen klikken (zachte start, geen sprongen)', r.length >= 25 && r.every(x => x[2] === 0 && x[3] < .35 && x[4] < .02), JSON.stringify(r.filter(x => !(x[2] === 0 && x[3] < .35 && x[4] < .02))));
  await ev(p, () => __dr.quit()); await openGame(p);
  ok('eindeloze run open na level 3', await ev(p, () => !document.querySelector('[data-m="endless"]').disabled));
  await p.tap('[data-m="endless"]'); await wait(p, 400);
  ok('eindeloze run: drie hartjes, afstand in meters', await ev(p, () => __dr.G.mode === 'endless' && /❤️/.test(document.getElementById('drShoes').innerHTML) && / m$/.test(document.getElementById('drTime').textContent)));
  await ev(p, () => { __dr.manual(true); const S = __dr.S; S.lives = 0; S.x += 30; S.best = Math.max(S.best, S.x); S.st = 10; S.dead = 1; for (let i = 0; i < 120 && !__dr.G.resultsUp; i++) __dr.step(1); __dr.manual(false); }); await wait(p, 800);
  ok('eindeloze run voorbij -> resultaat met afstand', await vis(p, 'drEndModal') && await ev(p, () => /m/.test(document.getElementById('drEndText').textContent) && JSON.parse(localStorage.getItem('dr.stats')).endless > 0));
  await shot(p, 'endless_results');
  await p.close();
}

/* ================= portrait: rotate hint, dialogs and level select still work ================= */
if (want('portrait')) {
  const p = await page({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await openGame(p);
  ok('staand: startscherm bruikbaar', await vis(p, 'drStartModal')); await shot(p, 'start_portrait');
  await p.tap('[data-m="levels"]'); await wait(p, 300);
  ok('staand: levelkeuze in 2 kolommen', await ev(p, () => getComputedStyle(document.getElementById('drLvGrid')).gridTemplateColumns.split(' ').length === 2));
  await shot(p, 'levels_portrait');
  await p.tap('[data-i="0"]'); await wait(p, 400);
  ok('staand tijdens spelen: "draai je telefoon" en spel staat stil', await ev(p, () => getComputedStyle(document.getElementById('drRot')).display === 'flex'));
  const f0 = await ev(p, () => __dr.S.f); await wait(p, 400); const f1 = await ev(p, () => __dr.S.f);
  ok('staand: tijd loopt niet', f0 === f1);
  await shot(p, 'portrait_hint');
  await p.setViewportSize({ width: 915, height: 412 }); await wait(p, 800);
  ok('gedraaid: hint weg, spel loopt', await ev(p, () => getComputedStyle(document.getElementById('drRot')).display === 'none') && (await ev(p, () => __dr.S.f)) > f1);
  await p.close();
}

/* ================= smaller phone: buttons inside the screen and not on top of each other ================= */
if (want('small')) {
  for (const [w, h, big] of [[800, 360, false], [915, 412, false], [800, 360, true]]) {
    const p = await page({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, undefined, big ? { 'dr.settings': '{"big":true}' } : null);
    await openGame(p); await p.tap('[data-m="levels"]'); await wait(p, 200); await p.tap('[data-i="0"]'); await wait(p, 500);
    const L = await ev(p, () => [...document.querySelectorAll('.dr-b')].map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
    const inside = L.every(r => r[0] >= 0 && r[1] >= 0 && r[2] <= w && r[3] <= h);
    let overlap = false; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], c = L[j]; if (a[0] < c[2] - 2 && c[0] < a[2] - 2 && a[1] < c[3] - 2 && c[1] < a[3] - 2) overlap = true; }
    const minR = Math.min(...L.map(r => (r[2] - r[0]) / 2));
    ok(`${w}×${h}${big ? ' grote knoppen' : ''}: knoppen binnen beeld, niet over elkaar, groot genoeg`, inside && !overlap && L.length === 6 && minR >= 24, `kleinste straal ${minR.toFixed(0)}px`);
    if (w === 800 && !big) await shot(p, 'small');
    await p.close();
  }
}

/* ================= performance (6x CPU throttle) in the busiest level, the bot playing ================= */
if (want('perf')) {
  const sol = JSON.parse((await import('fs')).readFileSync(path.join(here, 'drsrc', 'solutions.json'), 'utf8'));
  const p = await page(LAND, '{"seen":"9.99","mute":false}', { 'dr.stats': JSON.stringify({ lv: Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i, { t: 9999, m: 3, c: 7 }])) }) });
  await openGame(p); await p.tap('[data-m="levels"]'); await wait(p, 300);
  const lvls = (process.env.PERF_LEVELS || '32,27').split(',').map(Number);
  const out = [];
  for (const lv of lvls) {
    // the bot plays the level over and over (restarting at the finish); warm-up first: sound bank, music, adaptive quality, chunks
    await ev(p, ([lv, rle]) => { const go = () => { __dr.startLevel(lv - 1); let i = 0, k = 0, again = false; __dr.G.bot = () => { while (i < rle.length && k >= rle[i + 1]) { i += 2; k = 0; } if (i >= rle.length) { if (!again) { again = true; setTimeout(go, 1500); } return 0; } k++; return rle[i]; }; }; go(); }, [lv, sol[lv].rle]);
    await wait(p, lv === lvls[0] ? 30000 : 10000);
    await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await wait(p, 3000);         // the game adapts its quality in the first seconds
    const r = await ev(p, async () => { const t0 = performance.now(); let n = 0, worst = 0, last = t0; await new Promise(res => { const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 6000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), worst: Math.round(worst), q: __dr.quality(), lv: __dr.G.lv + 1 }; });
    await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    out.push([lv, r]);
  }
  console.log('perf', JSON.stringify(out));
  ok('fps bij 6× CPU-vertraging ≥ 55 (bot speelt, drukke levels)', out.every(([, r]) => r.fps >= 55), JSON.stringify(out));
  // input latency: a press is in the very next simulation step
  const lat = await ev(p, () => { __dr.manual(true); const S = __dr.S; S.st = 0; S.gs = 0; S.dead = 0; __dr.G.bot = null; __dr.hold(0); __dr.step(2); __dr.hold(__dr.KB.J); __dr.step(1); const st = __dr.S.st; __dr.hold(0); __dr.manual(false); return st; });
  ok('invoerlatentie: sprong in dezelfde stap (≤ 1 frame)', lat === 1);
  await p.close();
}
console.log('\nconsole/page errors:', errs.length ? errs.slice(0, 8).join('\n') : 'geen');
ok('geen consolefouten', errs.length === 0);
console.log(`\n${res.filter(r => r.startsWith('PASS')).length} geslaagd, ${res.filter(r => r.startsWith('FAIL')).length} mislukt`);
await b.close();
process.exit(res.some(r => r.startsWith('FAIL')) ? 1 : 0);
