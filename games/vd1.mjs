import { existsSync as require_exists } from 'node:fs';
// Vuistduel browser test: node vd1.mjs [path-to-index.html]   (default: ../vdtest/index.html)
// env PART = all | main | arcade | vs2 | train | opts | portrait | small | fuzz | perf | shots    (comma separated)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'vdtest', 'index.html'));
const GFX = path.join(here, '..', 'gfx');
const PARTS = (process.env.PART || 'all').split(',');
const want = p => PARTS.includes('all') || PARTS.includes(p);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
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
async function openGame(p) { await ev(p, () => document.querySelector('#tileVd').scrollIntoView({ block: 'center' })); await p.tap('#tileVd'); await wait(p, 500); }
// multi-touch through CDP (real touch events -> pointer events)
async function touch(p, type, id, x, y) {
  if (type === 'end') p.tp.delete(id); else p.tp.set(id, { x, y, id });
  const pts = [...p.tp.values()].map(t => ({ x: t.x, y: t.y, id: t.id, radiusX: 4, radiusY: 4, force: 1 }));
  const t = type === 'start' ? 'touchStart' : type === 'move' ? 'touchMove' : 'touchEnd';
  await p.cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: type === 'end' ? pts : pts });
}
async function tapBtn(p, pl, k, hold = 60) { const c = await ev(p, ([pl, k]) => __vd.btnCenter(pl, k), [pl, k]); if (!c) return false; await touch(p, 'start', 10 + pl, c.x, c.y); await wait(p, hold); await touch(p, 'end', 10 + pl); return true; }
async function stick(p, pl, dx, dy, id = 1) { const c = await ev(p, pl => __vd.stickCenter(pl), pl); if (!p.tp.has(id)) await touch(p, 'start', id, c.x, c.y); await touch(p, 'move', id, c.x + dx * c.r, c.y + dy * c.r); }
async function stickOff(p, id = 1) { if (p.tp.has(id)) await touch(p, 'end', id); }
async function pickAndFight(p, mode, a, b2) {
  await p.tap(`[data-m="${mode}"]`); await wait(p, 300);
  await p.tap(`[data-c="${a}"]`); await wait(p, 150); if (b2) { await p.tap(`[data-c="${b2}"]`); await wait(p, 150); }
  await p.tap('#vdSelGo'); await wait(p, 300);
  await ev(p, () => { __vd.G.vsT = 999; }); await wait(p, 200);
}
async function untilFight(p, max = 6000) { const t0 = Date.now(); while (Date.now() - t0 < max) { const s = await ev(p, () => __vd.M && __vd.M.phase); if (s === 'fight') return true; await wait(p, 100); } return false; }
async function winRound(p, shotKo) {      // last bit of health, then real punches until the KO, then wait for the next round or the end
  if (!(await untilFight(p, 15000))) return false;
  for (let k = 0; k < 6; k++) {
    await ev(p, () => { const M = __vd.M; __vd.nearlyWin(0); M.P[0].x = 560; M.P[1].x = 625; }); await wait(p, 120);
    await tapBtn(p, 0, k % 2 ? 'LP' : 'HP'); await wait(p, 500);
    if (await ev(p, () => __vd.M.phase !== 'fight')) break;
  }
  if (shotKo) await shot(p, 'ko');
  const t0 = Date.now(); while (Date.now() - t0 < 20000) { const s = await ev(p, () => __vd.M.phase + (document.querySelector('.modal.show') ? 'M' : '')); if (s === 'fight' || s.endsWith('M')) return true; await wait(p, 150); }
  return false;
}
const shot = (p, name) => p.screenshot({ path: path.join(GFX, `vd_${name}.png`) });

/* ================= main: tile, start, select by touch, touch controls in a fight ================= */
if (want('main')) {
  const p = await page();
  ok('menu-tegel met vector-icoon', await ev(p, () => !!document.querySelector('#tileVd') && (document.querySelector('#tileVd .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileVd h2').textContent === 'Vuistduel'));
  await ev(p, () => document.querySelector('#tileVd').scrollIntoView({ block: 'center' })); await shot(p, 'menu_tile');
  await openGame(p);
  ok('startscherm opent', await vis(p, 'vdStartModal') && await ev(p, () => document.querySelectorAll('#vdModes [data-m]').length === 4));
  ok('menu: geen render-loop als niets beweegt', !(await ev(p, () => __vd.running())));
  await shot(p, 'start');
  await p.tap('[data-m="cpu"]'); await wait(p, 300);
  ok('vechterskeuze zichtbaar (8 vechters, baas op slot)', await ev(p, () => document.querySelectorAll('#vdGrid .vd-card').length === 8 && document.querySelector('[data-c="nevel"]').classList.contains('lock')));
  await p.tap('[data-c="dex"]'); await wait(p, 200);
  ok('keuze per tik: speler gekozen, nu tegenstander', await ev(p, () => __vd.G.picks[0] === 'dex' && __vd.G.cur === 1 && document.querySelector('#vdSelTitle').textContent.includes('tegenstander')));
  await p.tap('[data-c="nevel"]'); await wait(p, 150);
  ok('baas op slot kan niet gekozen worden', await ev(p, () => __vd.G.picks[1] === null));
  await p.tap('[data-c="kiki"]'); await wait(p, 400); await shot(p, 'select');
  await p.tap('#vdSelGo'); await wait(p, 900); await shot(p, 'vs');
  ok('VS-scherm', await ev(p, () => __vd.G.view === 'vs'));
  ok('fight start na het VS-scherm', await untilFight(p, 9000));
  await ev(p, () => __vd.freezeCpu(true));
  // walk forward with the stick
  const x0 = await ev(p, () => __vd.M.P[0].x);
  await stick(p, 0, 1, 0); for (let i = 0; i < 15; i++) { await wait(p, 100); if (i >= 5 && await ev(p, x0 => __vd.M.P[0].x - x0 > 40, x0)) break; } await stickOff(p);
  const x1 = await ev(p, () => __vd.M.P[0].x);
  ok('lopen met de stick', x1 - x0 > 40, `${x0.toFixed(0)} -> ${x1.toFixed(0)}`);
  // jump
  await stick(p, 0, 0, -1); await wait(p, 160); const y = await ev(p, () => __vd.M.P[0].y); await stickOff(p); await wait(p, 800);
  ok('springen met de stick', y > 20, 'y ' + y.toFixed(0));
  // get close and punch
  await ev(p, () => { const M = __vd.M; M.P[0].x = 560; M.P[1].x = 630; }); await wait(p, 100);
  const hp0 = await ev(p, () => __vd.M.P[1].hp);
  await tapBtn(p, 0, 'LP'); await wait(p, 400);
  const hp1 = await ev(p, () => __vd.M.P[1].hp);
  ok('stootknop: stoot raakt', hp1 < hp0, `${hp0} -> ${hp1}`);
  await shot(p, 'fight_touch');
  // special via a quarter-circle motion on the stick + Trap
  await ev(p, () => { const M = __vd.M; M.P[0].x = 450; M.P[1].x = 760; window.__ev = []; const o = __vd.M; }); await wait(p, 300);
  await ev(p, () => { window.__pj = 0; const f = () => { if (__vd.M && __vd.M.ev.some(e => e.t === 'proj')) window.__pj++; if (window.__pjOn) requestAnimationFrame(f); }; window.__pjOn = 1; f(); window.__vdDbg = []; });
  await stick(p, 0, 0, 1); await wait(p, 30); await stick(p, 0, .7, .7); await wait(p, 30); await stick(p, 0, 1, 0);
  await tapBtn(p, 0, 'LK', 50); await stickOff(p); await wait(p, 400);
  const pj = await ev(p, () => __vd.evc('proj', 0));
  ok('special via ↓↘→ + Trap op het scherm (Golfslag)', pj > 0);
  await wait(p, 1500);
  // easy specials: turn on in the pause menu, then the Speciaal button does the special
  await p.tap('#vdPause'); await wait(p, 300);
  ok('pauzeknop opent pauzemenu', await vis(p, 'vdPauseModal'));
  const f0 = await ev(p, () => __vd.M.f); await wait(p, 400); const f1 = await ev(p, () => __vd.M.f);
  ok('spel staat stil tijdens pauze', f0 === f1);
  await p.tap('#vdPOpts button[data-k="easy"][data-v="true"]'); await wait(p, 200); await p.tap('#vdPResume'); await wait(p, 300);
  ok('Speciaal-knop verschijnt met Makkelijke specials', await ev(p, () => getComputedStyle(document.querySelector('.vd-b[data-b="SP"][data-p="0"]')).display !== 'none'));
  await ev(p, () => { const M = __vd.M; M.P[0].x = 450; M.P[1].x = 760; }); await wait(p, 600);
  await ev(p, () => { window.__sp = 0; const f = () => { if (__vd.M && __vd.M.ev.some(e => e.t === 'special')) window.__sp++; if (window.__spOn) requestAnimationFrame(f); }; window.__spOn = 1; f(); });
  await tapBtn(p, 0, 'SP'); await wait(p, 300);
  ok('Speciaal-knop doet een special', await ev(p, () => __vd.evc('special', 0) >= 2));
  await wait(p, 1200);
  // super when the meter is full
  await ev(p, () => { __vd.meter(0, 100); const M = __vd.M; M.P[0].x = 520; M.P[1].x = 640; window.__su = 0; const f = () => { if (__vd.M && (__vd.M.ev.some(e => e.t === 'super') || __vd.M.fl)) window.__su++; if (window.__suOn) requestAnimationFrame(f); }; window.__suOn = 1; f(); }); await wait(p, 200);
  ok('SUPER-knop licht op bij volle meter', await ev(p, () => document.querySelector('.vd-b[data-b="SU"][data-p="0"]').classList.contains('ready')));
  await tapBtn(p, 0, 'SU'); await wait(p, 250); await shot(p, 'super_flash'); await wait(p, 900);
  ok('super gaat af (flits, meter leeg)', await ev(p, () => __vd.evc('super', 0) === 1 && __vd.M.P[0].meter < 50));
  await wait(p, 600); await shot(p, 'super_hit');
  // back = pause menu; move list
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terugknop tijdens gevecht = pauze', await vis(p, 'vdPauseModal') && await ev(p, () => __vd.cur() === "vd"));
  await p.tap('#vdPMoves'); await wait(p, 300);
  ok('bewegingenlijst', await vis(p, 'vdMovesModal') && await ev(p, () => document.querySelectorAll('#vdMovesList .vd-mv').length >= 10 && document.querySelector('#vdMovesList').textContent.includes('Golfslag')));
  await shot(p, 'moves');
  await p.tap('#vdMovesOk'); await wait(p, 200); await p.tap('#vdPResume'); await wait(p, 300);
  ok('verder na pauze', await ev(p, () => !document.querySelector('.modal.show') && __vd.running()));
  // a KO through the real flow: last bit of health, then a real punch
  await winRound(p, true); await winRound(p, false);
  await wait(p, 1500);
  ok('wedstrijd gewonnen -> resultaatscherm', await vis(p, 'vdEndModal') && await ev(p, () => __vd.M.winner === 0));
  await shot(p, 'results');
  ok('statistiek bijgewerkt', await ev(p, () => __vd.stats().wins === 1 && __vd.stats().fights === 1 && __vd.stats().winsBy.dex === 1));
  await ev(p, () => window.appBack()); await wait(p, 400);
  ok('terug op het resultaatscherm = naar het menu', await ev(p, () => __vd.cur() === 'menu'));
  ok('menu: render-loop gestopt', !(await ev(p, () => __vd.running())));
  await p.close();
}

/* ================= arcade: the ladder moves on after a win, can be resumed ================= */
if (want('arcade')) {
  const p = await page();
  await openGame(p);
  await p.tap('[data-m="arcade"]'); await wait(p, 300); await p.tap('[data-c="sol"]'); await wait(p, 200); await p.tap('#vdSelGo'); await wait(p, 400);
  const order = await ev(p, () => __vd.run().order);
  ok('arcade-ladder: alle tegenstanders + baas als laatste', order.length === 7 && order[6] === 'nevel' && !order.includes('sol'), order.join(','));
  await ev(p, () => { __vd.G.vsT = 999; }); await untilFight(p);
  ok('eerste tegenstander', await ev(p, () => __vd.M.P[1].C.id === __vd.run().order[0]));
  await ev(p, () => __vd.freezeCpu(true));
  await winRound(p); await winRound(p);
  await wait(p, 1500);
  ok('arcade: gewonnen -> "Volgende tegenstander"', await vis(p, 'vdEndModal') && await ev(p, () => !!document.getElementById('vdENext')));
  ok('arcade-voortgang bewaard', await ev(p, () => JSON.parse(localStorage.getItem('vd.run')).idx === 1));
  await p.tap('#vdENext'); await wait(p, 300); await ev(p, () => { __vd.G.vsT = 999; }); await untilFight(p);
  ok('arcade: volgende tegenstander', await ev(p, () => __vd.M.P[1].C.id === __vd.run().order[1]));
  // leave and come back: the menu tile shows "Doorgaan" and the start dialog offers to continue
  await ev(p, () => __vd.quit()); await wait(p, 300);
  ok('menu-tegel toont "Doorgaan"', await ev(p, () => document.querySelector('#tileVd').classList.contains('has-save')));
  await openGame(p);
  ok('startscherm: verder met toernooi', await ev(p, () => !document.getElementById('vdContinue').hidden));
  await p.tap('#vdContinue'); await wait(p, 300);
  ok('toernooi gaat verder bij het juiste gevecht', await ev(p, () => __vd.G.picks[1] === __vd.run().order[1] && __vd.G.view === 'vs'));
  // a loss offers to continue
  await ev(p, () => { __vd.G.vsT = 999; }); await untilFight(p);
  await ev(p, () => __vd.freezeCpu(false));
  for (let r = 0; r < 3 && !(await vis(p, 'vdEndModal')); r++) { if (!(await untilFight(p, 15000))) break; await ev(p, () => { __vd.M.P[0].hp = 1; __vd.M.P[1].meter = 100; __vd.cpuBoth('moeilijk'); }); const t0 = Date.now(); while (Date.now() - t0 < 25000 && await ev(p, () => __vd.M.phase === 'fight')) await wait(p, 300); }
  await wait(p, 1500);
  ok('arcade: verloren -> "Doorgaan"', await vis(p, 'vdEndModal') && await ev(p, () => !!document.getElementById('vdECont')));
  await p.close();
}

/* ================= versus with two players on one phone ================= */
if (want('vs2')) {
  const p = await page();
  await openGame(p); await pickAndFight(p, 'vs2', 'bram', 'bram'); await untilFight(p);
  ok('versus 2 spelers: spiegelwedstrijd met tweede kleur', await ev(p, () => __vd.M.P[0].C.id === 'bram' && __vd.M.P[1].pal === 1 && __vd.G.mode === 'vs2'));
  ok('twee sets bedieningsknoppen', await ev(p, () => [...document.querySelectorAll('.vd-b[data-b="LP"]')].every(e => getComputedStyle(e).display !== 'none')));
  const x0 = await ev(p, () => __vd.M.P.map(F => F.x));
  await stick(p, 0, 1, 0, 1); await stick(p, 1, -1, 0, 2); await wait(p, 700);
  const x1 = await ev(p, () => __vd.M.P.map(F => F.x));
  await shot(p, '2p');
  await stickOff(p, 1); await stickOff(p, 2);
  ok('twee vingers tegelijk: beide spelers lopen', x1[0] - x0[0] > 30 && x0[1] - x1[1] > 30, JSON.stringify([x0, x1].map(a => a.map(v => v.toFixed(0)))));
  await ev(p, () => { const M = __vd.M; M.P[0].x = 540; M.P[1].x = 660; window.__sw = [0, 0]; const f = () => { if (__vd.M) for (const e of __vd.M.ev) if (e.t === 'swing') window.__sw[e.side]++; if (window.__swOn) requestAnimationFrame(f); }; window.__swOn = 1; f(); }); await wait(p, 200);
  const c0 = await ev(p, () => __vd.btnCenter(0, 'LK')), c1 = await ev(p, () => __vd.btnCenter(1, 'LK'));
  await touch(p, 'start', 21, c0.x, c0.y); await touch(p, 'start', 22, c1.x, c1.y); await wait(p, 80); await touch(p, 'end', 21); await touch(p, 'end', 22); await wait(p, 400);
  ok('beide spelers drukken tegelijk een knop', await ev(p, () => __vd.evc('swing', 0) > 0 && __vd.evc('swing', 1) > 0), JSON.stringify(await ev(p, () => [__vd.evc('swing', 0), __vd.evc('swing', 1)])));
  await p.close();
}

/* ================= training ================= */
if (want('train')) {
  const p = await page();
  await openGame(p); await pickAndFight(p, 'train', 'moer', 'sjaak'); await untilFight(p);
  ok('training: geen timer, pop staat', await ev(p, () => __vd.M.train && __vd.G.mode === 'train' && __vd.M.phase === 'fight'));
  await stick(p, 0, 1, 0); await wait(p, 300); await stickOff(p); await tapBtn(p, 0, 'LP'); await stick(p, 0, -1, 1); await wait(p, 200); await stickOff(p); await wait(p, 200);
  ok('invoer wordt getoond (training)', await ev(p, () => __vd.inputs() >= 2), await ev(p, () => __vd.inputs()) + ' regels');
  await ev(p, () => { const M = __vd.M; M.P[0].x = 560; M.P[1].x = 640; M.P[1].hp = 30; }); await wait(p, 100);
  await tapBtn(p, 0, 'HP'); await wait(p, 2200);
  ok('training: levenspunten vullen weer aan', await ev(p, () => __vd.M.P[1].hp === __vd.M.P[1].mhp && __vd.M.phase === 'fight'));
  await p.tap('#vdPause'); await wait(p, 300);
  ok('training-opties in pauze', await ev(p, () => document.querySelectorAll('#vdPTrain .seg button').length >= 7));
  await p.tap('#vdPTrain button[data-v="block"]'); await wait(p, 200); await p.tap('#vdPTrain button[data-v="1"]'); await wait(p, 200);
  await p.tap('#vdPMoves'); await wait(p, 300); await shot(p, 'train_moves'); await p.tap('#vdMovesOk'); await wait(p, 200); await p.tap('#vdPResume'); await wait(p, 300);
  await ev(p, () => { const M = __vd.M; M.P[0].x = 560; M.P[1].x = 630; window.__bl = 0; const f = () => { if (__vd.M && __vd.M.ev.some(e => e.t === 'block')) window.__bl++; if (window.__blOn) requestAnimationFrame(f); }; window.__blOn = 1; f(); }); await wait(p, 100);
  await tapBtn(p, 0, 'HP'); await wait(p, 600);
  ok('pop op "Blokken" blokt', await ev(p, () => __vd.evc('block', 1) > 0));
  ok('meter "Altijd vol"', await ev(p, () => __vd.M.P[0].meter === 100));
  await stick(p, 0, 1, 0); await wait(p, 100); await stickOff(p); await tapBtn(p, 0, 'LK'); await wait(p, 300);
  await shot(p, 'training');
  await p.close();
}

/* ================= options: sound/music off is silent, screen shake ================= */
if (want('opts')) {
  const p = await page(LAND, '{"seen":"9.99","mute":false}');
  await ev(p, () => { window.__plays = []; const S = window.__sfx, o = S.play; S.play = (n, ...a) => { if (n.startsWith("vd")) window.__plays.push(n); return o.call(S, n, ...a); }; });
  await openGame(p);
  await p.tap('#vdOpts button[data-k="sound"][data-v="false"]'); await wait(p, 100); await p.tap('#vdOpts button[data-k="music"][data-v="false"]'); await wait(p, 100);
  await p.tap('#vdOpts button[data-k="shake"][data-v="false"]'); await wait(p, 100);
  await ev(p, () => { window.__plays.length = 0; });
  await pickAndFight(p, 'cpu', 'dex', 'sol'); await untilFight(p);
  await ev(p, () => { __vd.cpuBoth('moeilijk'); }); await wait(p, 4000);
  ok('geluidseffecten uit: stil', await ev(p, () => window.__plays.length === 0), await ev(p, () => window.__plays.slice(0, 5).join(',')));
  ok('muziek uit: geen muziek', await ev(p, () => !__sfx._state().now));
  ok('schermschudden uit', await ev(p, () => __vd.R.shakeT === 0 && __vd.R.optShake === false));
  await ev(p, () => __vd.quit()); await openGame(p);
  await p.tap('#vdOpts button[data-k="sound"][data-v="true"]'); await wait(p, 100); await p.tap('#vdOpts button[data-k="music"][data-v="true"]'); await wait(p, 100);
  await pickAndFight(p, 'cpu', 'dex', 'sol'); await untilFight(p); await ev(p, () => { __vd.cpuBoth('moeilijk'); }); await wait(p, 4500);
  ok('geluid aan: effecten klinken', await ev(p, () => window.__plays.some(n => n.startsWith('vdHit') || n === 'vdBell' || n === 'vdWhoosh')));
  ok('muziek aan: vechtmuziek speelt', await ev(p, () => __sfx._state().now === 'vd' || __sfx._state().busy === 'vd'), JSON.stringify(await ev(p, () => __sfx._state())));
  const r = await ev(p, () => Object.entries(__sfx._G).filter(([k]) => k.startsWith('vd')).map(([k]) => { const d = __sfx._buf(k).getChannelData(0); let pk = 0, nan = 0, jump = 0; for (let i = 1; i < d.length; i++) { if (d[i] !== d[i]) nan++; pk = Math.max(pk, Math.abs(d[i])); jump = Math.max(jump, Math.abs(d[i] - d[i - 1])); } return [k, +pk.toFixed(2), nan, +jump.toFixed(3), +(Math.abs(d[0]) + Math.abs(d[1])).toFixed(4)]; }));
  ok('geluiden: geen NaN, geen klikken (zachte start, geen sprongen)', r.every(x => x[2] === 0 && x[3] < .35 && x[4] < .02), JSON.stringify(r.filter(x => !(x[2] === 0 && x[3] < .35 && x[4] < .02))));
  await p.close();
}

/* ================= portrait: rotate hint, the dialogs still work ================= */
if (want('portrait')) {
  const p = await page({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await openGame(p);
  ok('staand: startscherm bruikbaar', await vis(p, 'vdStartModal'));
  await shot(p, 'start_portrait');
  await p.tap('[data-m="cpu"]'); await wait(p, 400);
  ok('staand: "draai je telefoon"', await ev(p, () => getComputedStyle(document.getElementById('vdRot')).display === 'flex'));
  await shot(p, 'portrait_hint');
  await p.setViewportSize({ width: 915, height: 412 }); await wait(p, 400);
  ok('gedraaid: hint weg, keuzescherm', await ev(p, () => getComputedStyle(document.getElementById('vdRot')).display === 'none' && __vd.G.view === 'sel'));
  await p.tap('[data-c="truus"]'); await p.tap('[data-c="moer"]'); await p.tap('#vdSelGo'); await wait(p, 300); await ev(p, () => { __vd.G.vsT = 999; }); await untilFight(p);
  await p.setViewportSize({ width: 412, height: 915 }); await wait(p, 300);
  const f0 = await ev(p, () => __vd.M.f); await wait(p, 500); const f1 = await ev(p, () => __vd.M.f);
  ok('staand tijdens gevecht: spel pauzeert', f0 === f1);
  await p.setViewportSize({ width: 915, height: 412 }); await wait(p, 800);
  ok('weer dwars: spel loopt verder', await ev(p, () => __vd.M.f) > f1);
  await p.close();
}

/* ================= a smaller phone ================= */
if (want('small')) {
  const p = await page({ viewport: { width: 800, height: 360 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await openGame(p); await shot(p, 'start_small');
  await pickAndFight(p, 'cpu', 'sjaak', 'sol'); await untilFight(p); await wait(p, 1500);
  const L = await ev(p, () => { const out = []; for (const e of document.querySelectorAll('.vd-b')) { if (getComputedStyle(e).display === 'none') continue; const r = e.getBoundingClientRect(); out.push([r.left, r.top, r.right, r.bottom]); } return out; });
  const inside = L.every(r => r[0] >= 0 && r[1] >= 0 && r[2] <= 800 && r[3] <= 360);
  let overlap = false; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], c = L[j]; if (a[0] < c[2] - 2 && c[0] < a[2] - 2 && a[1] < c[3] - 2 && c[1] < a[3] - 2) overlap = true; }
  ok('800×360: knoppen binnen beeld en niet over elkaar', inside && !overlap && L.length >= 5, L.length + ' knoppen');
  await shot(p, 'small');
  await p.close();
}

/* ================= fuzz: random play, pausing, leaving, restarting ================= */
if (want('fuzz')) {
  const p = await page();
  await openGame(p);
  let bad = 0;
  for (let g = 0; g < 6; g++) {
    const ids = ['dex', 'truus', 'moer', 'sol', 'bram', 'kiki', 'sjaak'];
    await pickAndFight(p, g % 2 ? 'vs2' : 'cpu', ids[g % 7], ids[(g * 3 + 1) % 7]); await untilFight(p);
    for (let k = 0; k < 40; k++) {
      await ev(p, () => { for (let pl = 0; pl < 2; pl++) { const P = __vd.PADS[pl]; P.dir = [0, 1, 2, 4, 8, 5, 6, 9, 10][(Math.random() * 9) | 0]; if (Math.random() < .5) P.pend |= [16, 32, 64, 128, 256, 512][(Math.random() * 6) | 0]; } if (Math.random() < .2) __vd.meter((Math.random() * 2) | 0, 100); });
      await wait(p, 60);
      if (k === 15) { await ev(p, () => window.appBack()); await wait(p, 200); await ev(p, () => { const f = __vd.M.f; window.__pf = f; }); await wait(p, 200); if (await ev(p, () => __vd.M.f !== window.__pf)) bad++; await p.tap('#vdPResume'); }
      if (k === 30 && g === 2) { await p.tap('#vdPause'); await wait(p, 150); await p.tap('#vdPRestart'); await wait(p, 300); }
    }
    if (!(await ev(p, () => __vd.finite()))) bad++;
    if (g === 3) { await ev(p, () => window.appBack()); await wait(p, 150); await ev(p, () => window.appBack()); await wait(p, 200); await ev(p, () => __vd.quit()); await wait(p, 300);
      if (await ev(p, () => __vd.running())) bad++; await openGame(p); continue; }
    await ev(p, () => __vd.openStart()); await wait(p, 300);
    if (await ev(p, () => __vd.running())) bad++;
  }
  ok('fuzz: 6 gevechten met willekeurige invoer, pauze, herstart en weggaan: geen fouten, timers eindig, loop stopt', bad === 0 && !errs.length, 'bad ' + bad);
  await ev(p, () => __vd.quit()); await wait(p, 200);
  ok('na weggaan: geen loop meer', !(await ev(p, () => __vd.running())) && await ev(p, () => __vd.cur() === 'menu'));
  await p.close();
}

/* ================= performance (6x CPU throttle) and input latency ================= */
if (want('perf')) {
  const p = await page();
  await openGame(p); await pickAndFight(p, 'cpu', 'moer', 'kiki'); await untilFight(p);
  await ev(p, () => __vd.cpuBoth('moeilijk'));
  // latency in logic: from the press to the attack
  await ev(p, () => { __vd.freezeCpu(true); }); await wait(p, 200);
  await ev(p, () => { __vd.cpuBoth('moeilijk'); });
  await wait(p, 25000);                                          // warm-up (sound bank, sprites, music render)
  const cdp = p.cdp; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await wait(p, 5000);   // the game adapts its quality in the first seconds
  const r = await ev(p, async () => { const t0 = performance.now(); let n = 0, worst = 0, last = t0; const sup = setInterval(() => { __vd.meter(0, 100); __vd.meter(1, 100); }, 1500);
    await new Promise(res => { const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 6000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    clearInterval(sup); return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), worst: Math.round(worst), q: __vd.quality(), level: __vd.level(), pj: __vd.M.pj.length }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok('fps bij 6× CPU-vertraging ≥ 55 (druk gevecht)', r.fps >= 55, JSON.stringify(r));
  await p.close();
  const q = await page(); await openGame(q); await pickAndFight(q, 'train', 'dex', 'sol'); await wait(q, 800);
  const lats = [];
  for (let i = 0; i < 6; i++) { await ev(q, () => { const M = __vd.M; M.P[0].x = 400; M.P[1].x = 800; }); await wait(q, 700);
    lats.push(await ev(q, () => new Promise(res => { const M = __vd.M, F = M.P[0], f0 = M.f; __vd.PADS[0].pend |= [16, 32, 64, 128][Math.floor(Math.random() * 4)];
      const chk = () => { if (F.st === 'move') res(M.f - f0); else if (M.f - f0 > 30) res(99); else requestAnimationFrame(chk); }; chk(); }))); }
  ok('latentie invoer -> actie ≤ 2 frames (logica)', Math.max(...lats) <= 2, JSON.stringify(lats));
  await q.close();
}
console.log('\nconsole/page errors:', errs.length ? errs.slice(0, 8).join('\n') : 'geen');
ok('geen consolefouten', errs.length === 0);
console.log(`\n${res.filter(r => r.startsWith('PASS')).length} geslaagd, ${res.filter(r => r.startsWith('FAIL')).length} mislukt`);
await b.close();
