import { existsSync } from 'node:fs';
// Woef tegen Karel – browser test of the real UI:   node games/wk1.mjs [path-to-index.html]   (default: APP_HTML or build/work/wktest/index.html)
// env PART = all | main | resume | opts | portrait | solve | perf   (comma separated);  SHOTS=1 also saves screenshots to build/gfx/wk_*.png
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'wktest', 'index.html'));
const GFX = path.join(here, '..', 'build', 'gfx');
const PARTS = (process.env.PART || 'all').split(',');
const want = p => PARTS.includes('all') ? p !== 'perf' || !process.env.NOPERF : PARTS.includes(p);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const LAND = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PORT = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
async function page(o = LAND, cfg = '{"seen":"9.99","mute":true}', pre = null) {
  const ctx = await b.newContext(o), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(([c, pre]) => { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('app.cfg', c); if (pre) for (const [k, v] of Object.entries(pre)) localStorage.setItem(k, v); sessionStorage.setItem('init', 1); } }, [cfg, pre]);
  await p.goto(target); await p.waitForTimeout(500);
  p.cdp = await ctx.newCDPSession(p);
  return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const wait = (p, ms) => p.waitForTimeout(ms);
const vis = (p, id) => ev(p, id => document.getElementById(id).classList.contains('show'), id);
const shot = async (p, name) => { if (process.env.SHOTS) await p.screenshot({ path: path.join(GFX, `wk_${name}.png`) }); };
async function openGame(p) { await ev(p, () => document.querySelector('#tileWk').scrollIntoView({ block: 'center' })); await p.tap('#tileWk'); await wait(p, 500); }
const tapAt = async (p, pt) => { await p.touchscreen.tap(pt.x, pt.y); };
const tapObj = async (p, id) => { const pt = await ev(p, id => __wk.pointFor(id), id); if (!pt) throw new Error('object niet te zien: ' + id); await tapAt(p, pt); };
const idle = p => ev(p, () => { const S = __wk.S; return !S || S.done || (S.w.m === 'idle' && !S.w.goal && !S.w.pend && !S.w.q.length); });
async function waitIdle(p, max = 15000) { const t0 = Date.now(); await wait(p, 60); while (Date.now() - t0 < max) { if (await idle(p)) return true; await wait(p, 50); } return false; }
async function waitFor(p, f, max = 15000, a) { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await ev(p, f, a)) return true; await wait(p, 60); } return false; }
const slotOf = (p, it) => ev(p, it => __wk.S.inv.indexOf(it), it);

// one scripted solution step through the real input path (touch on the canvas, the inventory buttons, the close-up buttons)
async function realStep(p, s) {
  if (s[0] === 'wait') { await wait(p, s[1] / 60 * 1000 / (await ev(p, () => window.__wkSpeed || 1)) + 50); return true; }
  for (let tries = 0; tries < 8; tries++) {
    await waitIdle(p);
    // like a careful player: watch the machine and go right after its attack
    if (['obj', 'use', 'walk', 'bark'].includes(s[0])) await waitFor(p, () => { const z = __wk.Core.zones(__wk.L, __wk.S)[0]; return !z || (z.ph === 0 && z.p < .25); }, 6000);
    const a0 = await ev(p, () => __wk.S.acts), h0 = await ev(p, () => __wk.S.hits);
    switch (s[0]) {
      case 'obj': await tapObj(p, s[1]); break;
      case 'use': { const k = await slotOf(p, s[1]); if (k < 0) return false; await p.tap(`#wkInv [data-s="${k}"]`); await wait(p, 40); await tapObj(p, s[2]); break; }
      case 'walk': await tapAt(p, await ev(p, ([x, f]) => __wk.screenAt(x, __wk.L._fl[f].y - .4), [s[1], s[2]])); break;
      case 'bark': await p.tap('#wkBark'); break;
      case 'comb': { const a = await slotOf(p, s[1]), c = await slotOf(p, s[2]); await p.tap(`#wkInv [data-s="${a}"]`); await wait(p, 40); await p.tap(`#wkInv [data-s="${c}"]`); break; }
      case 'pick': {
        if (!(await waitFor(p, id => document.getElementById('wkCu').dataset.id === id, 3000, s[1]))) { await tapObj(p, s[1]); await waitIdle(p); await waitFor(p, id => document.getElementById('wkCu').dataset.id === id, 4000, s[1]); }
        const k = await ev(p, ([id, v]) => __wk.L.cu[id](__wk.S).opts.findIndex(o => o.v === v), [s[1], s[2]]);
        await p.tap(`#wkCu [data-i="${k}"]`); await wait(p, 60); return true;
      }
      case 'cuX': await p.tap('#wkCu .wk-cu-x'); await wait(p, 60); return true;
    }
    await waitIdle(p);
    await wait(p, 80);
    const a1 = await ev(p, () => __wk.S && (__wk.S.acts || __wk.S.done)), h1 = await ev(p, () => __wk.S && __wk.S.hits);
    if (await ev(p, () => !__wk.S || __wk.S.done || __wk.S.m.st !== 'ok')) return true;
    if (a1 > a0) return true;
    if (h1 === h0 && tries > 2) return false;
  }
  return false;
}

/* ================= main: tile, start, map, level 1 + 2 played with real taps, hints, results, back button ================= */
if (want('main')) {
  const p = await page();
  ok('menu-tegel met vector-icoon', await ev(p, () => !!document.querySelector('#tileWk') && (document.querySelector('#tileWk .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileWk h2').textContent === 'Woef tegen Karel'));
  await ev(p, () => document.querySelector('#tileWk').scrollIntoView({ block: 'center' })); await shot(p, 'menu_tile');
  await openGame(p);
  ok('startscherm opent, geen render-loop', await vis(p, 'wkStartModal') && !(await ev(p, () => __wk.running())));
  await shot(p, 'start');
  await p.tap('#wkPlay'); await wait(p, 400);
  ok('kaart: 5 machines in de garage, alleen 1 open, 2 werelden op slot', await ev(p, () => document.querySelectorAll('#wkMapBox .wk-node').length === 5 && document.querySelectorAll('#wkMapBox .wk-node.lock').length === 4 && document.querySelectorAll('#wkWorlds button.lock').length === 2));
  await shot(p, 'map');
  await p.tap('#wkMapBox [data-i="1"]'); await wait(p, 200);
  ok('machine 2 op slot: start niet', await ev(p, () => __wk.G.view === 'map'));
  await p.tap('#wkMapBox [data-i="0"]'); await wait(p, 400);
  ok('level 1: Karel plaagt eerst (intro), loop staat stil', await vis(p, 'wkIntro') && /Stofzuigbot/.test(await ev(p, () => document.getElementById('wkIntro').textContent)) && !(await ev(p, () => __wk.running())));
  await shot(p, 'taunt');
  await p.tap('#wkGo'); await wait(p, 300);
  ok('aan de slag: loop draait, HUD zichtbaar', await ev(p, () => __wk.running() && getComputedStyle(document.getElementById('wkSide')).display !== 'none' && !document.getElementById('wkIntro').classList.contains('show')));
  ok('Blaf!-knop nog verborgen in level 1', await ev(p, () => document.getElementById('wkBark').hidden));
  // tap-walk
  const x0 = await ev(p, () => __wk.S.w.x);
  await tapAt(p, await ev(p, () => __wk.screenAt(2.05, 7.9))); await wait(p, 100);
  ok('tikken op de vloer: Woef loopt', await ev(p, () => __wk.S.w.m === 'walk'));
  await waitIdle(p);
  const x1 = await ev(p, () => __wk.S.w.x);
  ok('... en komt aan (tegen de wasmand aan)', x1 > x0 + .5 && x1 < 2.5, `x ${x0.toFixed(2)} -> ${x1.toFixed(2)}`);
  // hints: vague, clearer, arrow
  await p.tap('#wkHintBtn'); await wait(p, 150);
  const h1 = await ev(p, () => document.getElementById('wkMsg').textContent);
  ok('hint 1: vaag', /zuigt alles op/.test(h1) && await ev(p, () => __wk.S.hints === 1 && !__wk.Core.arrow(__wk.L, __wk.S)), h1);
  await p.tap('#wkHintBtn'); await wait(p, 150);
  ok('hint 2: duidelijker, ster 2 weg', /wasmand/.test(await ev(p, () => document.getElementById('wkMsg').textContent)) && await ev(p, () => document.querySelectorAll('#wkStars i.on').length === 2));
  await p.tap('#wkHintBtn'); await wait(p, 300);
  ok('hint 3: een pijl wijst de wasmand aan', await ev(p, () => __wk.Core.arrow(__wk.L, __wk.S) === 'basket'));
  await shot(p, 'hint');
  // beat level 1: push the basket
  await ev(p, () => { window.__wkSpeed = 2; });
  await tapObj(p, 'basket'); await wait(p, 300);
  ok('tik op de wasmand: Woef gaat duwen', await waitFor(p, () => __wk.S.w.m === 'push', 3000));
  await waitFor(p, () => __wk.S.m.st === 'break', 12000); await wait(p, 300); await shot(p, 'break');
  ok('sokken verstoppen de Stofzuigbot: machine breekt', await ev(p, () => __wk.S.m.st !== 'ok'));
  await waitFor(p, () => __wk.S.m.st === 'gone', 5000); await wait(p, 150); await shot(p, 'boom');
  ok('resultaat met sterren', await waitFor(p, () => document.getElementById('wkEndModal').classList.contains('show'), 12000) && await ev(p, () => document.querySelectorAll('#wkEndPic .wk-bigstars i').length === 3 && document.querySelectorAll('#wkEndPic .wk-bigstars i.on').length === 2));
  await wait(p, 900); await shot(p, 'results');
  ok('loop staat stil op het resultaat', await waitFor(p, () => !__wk.running(), 4000));
  ok('voortgang bewaard (2 sterren, 3 hints)', await ev(p, () => { const s = JSON.parse(localStorage.getItem('wk.stats')); return s.lv[0].s === 2 && s.lv[0].h === 3 && s.beaten === 1 && !localStorage.getItem('wk.save'); }));
  // level 2: pick up, use an item from the inventory
  await p.tap('#wkENext'); await wait(p, 400); await p.tap('#wkGo'); await wait(p, 200);
  ok('Volgende: level 2 (Ballonbot)', await ev(p, () => __wk.G.lv === 1 && __wk.G.view === 'play'));
  await tapObj(p, 'cactus'); await waitFor(p, () => __wk.S.inv.includes('cactus'), 15000);
  ok('cactus opgepakt: in de rugzak', await ev(p, () => __wk.S.inv[0] === 'cactus' && !!document.querySelector('#wkInv [data-s="0"] img')));
  await p.tap('#wkInv [data-s="0"]'); await wait(p, 100);
  ok('ding gekozen: geselecteerd en Woef heeft het in zijn bek', await ev(p, () => __wk.sel === 'cactus' && document.querySelector('#wkInv [data-s="0"]').classList.contains('sel')));
  await shot(p, 'carry');
  await tapObj(p, 'mach'); await wait(p, 100);
  ok('cactus op de ballonnen: Woef loopt erheen', await ev(p, () => __wk.S.w.goal && __wk.S.w.goal.item === 'cactus'));
  let tries = 0; while (!(await waitFor(p, () => __wk.S.m.st !== 'ok' || !__wk.S.inv.includes('cactus'), 15000)) && tries++ < 3) {}
  for (let k = 0; k < 6 && await ev(p, () => __wk.S.inv.includes('cactus')); k++) { await waitIdle(p); await p.tap('#wkInv [data-s="0"]'); await tapObj(p, 'mach'); await waitFor(p, () => !__wk.S.inv.includes('cactus'), 15000); }
  ok('ballonnen knappen: machine valt', await waitFor(p, () => __wk.S.m.st !== 'ok', 6000));
  await waitFor(p, () => document.getElementById('wkEndModal').classList.contains('show'), 12000);
  ok('resultaat level 2', await vis(p, 'wkEndModal'));
  // back button: results -> map -> start -> menu
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terug op het resultaat -> kaart', await ev(p, () => __wk.G.view === 'map' && !document.querySelector('.modal.show')));
  ok('kaart: level 3 nu open, 2 gehaald met sterren', await ev(p, () => !document.querySelector('#wkMapBox [data-i="2"]').classList.contains('lock') && document.querySelectorAll('#wkMapBox [data-i="0"] u.on').length === 2));
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terug op de kaart -> startscherm', await vis(p, 'wkStartModal'));
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terug op het startscherm -> menu, loop gestopt', await ev(p, () => __wk.cur() === 'menu' && !__wk.running()));
  // back during play = pause, the game stands still
  await openGame(p); await p.tap('#wkPlay'); await wait(p, 300); await p.tap('#wkMapBox [data-i="2"]'); await wait(p, 300); await p.tap('#wkGo'); await wait(p, 300);
  ok('level 3: Blaf!-knop zichtbaar', await ev(p, () => !document.getElementById('wkBark').hidden));
  await p.tap('#wkBark'); await wait(p, 200);
  ok('Blaf!: Woef blaft', await ev(p, () => __wk.S.w.m === 'bark'));
  await waitIdle(p);
  await ev(p, () => window.appBack()); await wait(p, 300);
  ok('terugknop tijdens het spel = pauze', await vis(p, 'wkPauseModal'));
  const t0 = await ev(p, () => __wk.S.t); await wait(p, 400);
  ok('spel staat stil tijdens pauze, loop gestopt', t0 === await ev(p, () => __wk.S.t) && !(await ev(p, () => __wk.running())));
  await shot(p, 'pause');
  await p.tap('#wkPResume'); await wait(p, 300);
  ok('verder na pauze', await ev(p, () => __wk.running() && !document.querySelector('.modal.show')));
  // a close-up panel and the back button
  await ev(p, () => { __wk.startLevel(3); __wk.endIntro(); window.__wkSpeed = 3; }); await wait(p, 200);
  await tapObj(p, 'panel'); await waitFor(p, () => document.getElementById('wkCu').classList.contains('show'), 15000);
  ok('paneel: close-up met grote knoppen', await ev(p, () => document.querySelectorAll('#wkCu [data-i]').length === 3));
  await shot(p, 'closeup');
  await ev(p, () => window.appBack()); await wait(p, 200);
  ok('terugknop sluit eerst de close-up', await ev(p, () => !document.getElementById('wkCu').classList.contains('show') && !document.querySelector('.modal.show') && __wk.G.view === 'play'));
  // stats and trophies
  await ev(p, () => __wk.quit()); await wait(p, 300);
  await ev(p, () => document.getElementById('statBtn').click()); await wait(p, 300);
  ok('statistiek: regel Woef tegen Karel', await ev(p, () => /2\/16 machines/.test(document.getElementById('statBody').textContent)));
  await ev(p, () => { document.querySelector('#statModal [data-close]').click(); document.getElementById('trophyBtn').click(); }); await wait(p, 300);
  ok('trofee "Woef de held" verdiend', await ev(p, () => [...document.querySelectorAll('#trophyBody .trophy.on')].some(t => t.textContent.includes('Woef de held'))));
  await ev(p, () => document.querySelector('#trophyModal [data-close]').click());
  await p.close();
}

/* ================= save / resume after a reload ================= */
if (want('resume')) {
  const done = JSON.stringify({ lv: { 0: { s: 3, h: 0, k: 0 }, 1: { s: 3, h: 0, k: 0 }, 2: { s: 3, h: 0, k: 0 }, 3: { s: 3, h: 0, k: 0 } } });
  const p = await page(LAND, undefined, { 'wk.stats': done });
  await openGame(p); await p.tap('#wkPlay'); await wait(p, 300); await p.tap('#wkMapBox [data-i="4"]'); await wait(p, 300); await p.tap('#wkGo');
  await ev(p, () => { window.__wkSpeed = 3; });
  await tapObj(p, 'fridge'); await waitFor(p, () => __wk.S.inv.includes('worst'), 15000);
  await waitIdle(p); await p.tap('#wkInv [data-s="0"]'); await tapObj(p, 'trap'); await waitFor(p, () => __wk.S.o.trap.worst === 1, 15000);
  ok('worst op het luik: robot loopt erheen', await ev(p, () => __wk.S.o.mach.eat >= 1));
  await wait(p, 300);
  const before = await ev(p, () => ({ t: __wk.S.t, x: +__wk.S.o.mach.x.toFixed(2), eat: __wk.S.o.mach.eat, worst: __wk.S.o.trap.worst, fridge: __wk.S.o.fridge.empty, wx: +__wk.S.w.x.toFixed(2) }));
  await p.reload(); await wait(p, 600);
  ok('na herladen: tegel toont "Doorgaan"', await waitFor(p, () => document.querySelector('#tileWk').classList.contains('has-save'), 5000));
  await openGame(p);
  ok('startscherm: verder met machine 5', await waitFor(p, () => !document.getElementById('wkContinue').hidden && /machine 5/.test(document.getElementById('wkContinue').textContent), 5000));
  await p.tap('#wkContinue'); await wait(p, 300);
  const after = await ev(p, () => ({ t: __wk.S.t, x: +__wk.S.o.mach.x.toFixed(2), eat: __wk.S.o.mach.eat, worst: __wk.S.o.trap.worst, fridge: __wk.S.o.fridge.empty, wx: +__wk.S.w.x.toFixed(2), intro: __wk.G.intro, run: __wk.running() }));
  ok('kamer hersteld uit de logica (worst, koelkast, robot, Woef), geen intro', after.worst === 1 && after.fridge === 1 && after.eat >= 1 && !after.intro && after.run && Math.abs(after.t - before.t) < 400, JSON.stringify(before) + ' -> ' + JSON.stringify(after));
  await waitFor(p, () => __wk.S.o.mach.eat === 2, 15000);
  await tapObj(p, 'lever'); await waitFor(p, () => document.getElementById('wkEndModal').classList.contains('show'), 20000);
  ok('na hervatten verder te spelen tot het einde', await vis(p, 'wkEndModal'));
  ok('opslag weg na winst', await ev(p, () => !localStorage.getItem('wk.save')));
  await ev(p, () => __wk.quit()); await wait(p, 300);
  ok('menu-tegel: geen "Doorgaan" meer', await ev(p, () => !document.querySelector('#tileWk').classList.contains('has-save')));
  await p.close();
}

/* ================= sound and music options ================= */
if (want('opts')) {
  const p = await page(LAND, '{"seen":"9.99","mute":false,"music":"normaal"}');
  await openGame(p); await p.tap('#wkStartModal .sheet'); await wait(p, 2500);
  const on = await ev(p, () => __sfx._state());
  ok('menumuziek speelt (wkm)', on.now === 'wkm' || on.busy === 'wkm' || (on.cache || []).includes('wkm'), JSON.stringify(on));
  await p.tap('#wkOpts button[data-k="music"][data-v="false"]'); await wait(p, 1200);
  ok('Achtergrondmuziek uit: muziek stopt', await ev(p, () => __sfx._state().now === null && JSON.parse(localStorage.getItem('wk.settings')).music === false));
  await p.tap('#wkOpts button[data-k="sound"][data-v="false"]'); await wait(p, 200);
  ok('Geluidseffecten uit: bewaard', await ev(p, () => JSON.parse(localStorage.getItem('wk.settings')).sound === false && __wk.opt.sound === false));
  await p.tap('#wkOpts button[data-k="music"][data-v="true"]'); await p.tap('#wkOpts button[data-k="sound"][data-v="true"]'); await wait(p, 300);
  await p.tap('#wkPlay'); await wait(p, 300); await p.tap('#wkMapBox [data-i="0"]'); await wait(p, 300); await p.tap('#wkGo'); await wait(p, 3500);
  const pl = await ev(p, () => __sfx._state());
  ok('tijdens het spel: speelmuziek (wk)', pl.now === 'wk' || pl.busy === 'wk', JSON.stringify(pl));
  const snd = await ev(p, () => { const G = __sfx._G, r = {}; for (const n of Object.keys(G)) if (n.startsWith('wk')) { const d = __sfx._buf(n).getChannelData(0); let pk = 0, nan = 0, jump = 0; for (let i = 1; i < d.length; i++) { const x = d[i]; if (x !== x) nan++; pk = Math.max(pk, Math.abs(x)); jump = Math.max(jump, Math.abs(x - d[i - 1])); } r[n] = { pk: +pk.toFixed(2), nan, jump: +jump.toFixed(3), att: +Math.abs(d[0]).toFixed(4) }; } return r; });
  const names = Object.keys(snd), bad = names.filter(n => snd[n].nan || snd[n].pk > 1.6 || snd[n].att > .02 || snd[n].jump > .5);
  ok(`${names.length} geluiden: geen NaN, niet te luid, zachte aanzet (geen klik), geen sprongen`, names.length >= 50 && !bad.length, bad.map(n => n + JSON.stringify(snd[n])).join(' '));
  await p.close();
}

/* ================= portrait ================= */
if (want('portrait')) {
  const p = await page(PORT);
  await openGame(p); await shot(p, 'portrait_start'); await p.tap('#wkPlay'); await wait(p, 300); await shot(p, 'portrait_map');
  await p.tap('#wkMapBox [data-i="0"]'); await wait(p, 300); await p.tap('#wkGo'); await wait(p, 300);
  const lay = await ev(p, () => { const r = __wk.R, s = document.getElementById('wkSide').getBoundingClientRect(); return { rx: r.rx, ry: r.ry, rw: r.s * 14, rh: r.s * 9, W: innerWidth, H: innerHeight, side: s.top, sideH: s.height }; });
  ok('staand: de hele kamer past, knoppen eronder', lay.rx >= 0 && lay.rx + lay.rw <= lay.W + .5 && lay.ry + lay.rh < lay.side && lay.side + lay.sideH <= lay.H, JSON.stringify(lay));
  await tapAt(p, await ev(p, () => __wk.screenAt(2.4, 7.9))); await wait(p, 100);
  ok('staand: tikken = lopen', await ev(p, () => __wk.S.w.m === 'walk'));
  await waitIdle(p); await p.tap('#wkHintBtn'); await wait(p, 200); await shot(p, 'portrait');
  ok('staand: hint zichtbaar onder de kamer', await ev(p, () => { const m = document.getElementById('wkMsg').getBoundingClientRect(); return document.getElementById('wkMsg').classList.contains('show') && m.top >= __wk.R.ry + __wk.R.s * 9 - 1 && m.bottom <= document.getElementById('wkSide').getBoundingClientRect().top + 1; }));
  // rotate to landscape and back: the room follows
  await p.setViewportSize({ width: 915, height: 412 }); await wait(p, 300);
  ok('draaien naar liggend: kamer schaalt mee', await ev(p, () => __wk.R.s * 9 <= innerHeight + 1 && document.getElementById('wk').classList.contains('land')));
  await p.setViewportSize({ width: 412, height: 915 }); await wait(p, 300);
  // big text
  await ev(p, () => { document.documentElement.classList.add('big-text'); dispatchEvent(new Event('resize')); }); await wait(p, 300);
  ok('grote tekst: knoppen passen nog', await ev(p, () => { const s = document.getElementById('wkSide').getBoundingClientRect(); return s.bottom <= innerHeight && s.right <= innerWidth + 1; }));
  await shot(p, 'portrait_big');
  await p.close();
}

/* ================= every level solved through the real tap input (touch on the canvas, buttons) ================= */
if (want('solve')) {
  const all = JSON.stringify({ lv: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [i, { s: 3, h: 0, k: 0 }])) });
  const p = await page(LAND, undefined, { 'wk.stats': all });
  await openGame(p);
  const n = await ev(p, () => __wk.LEVELS.length), out = [];
  for (let i = 0; i < n; i++) {
    if (process.env.SOLVE_LEVELS && !process.env.SOLVE_LEVELS.split(',').includes(String(i + 1))) continue;
    await ev(p, i => { __wk.startLevel(i); window.__wkSpeed = 3; }, i); await wait(p, 150); await p.tap('#wkGo'); await wait(p, 100);
    const sol = await ev(p, () => __wk.L.sol); let okAll = true;
    for (const s of sol) { const r = await realStep(p, s); if (!r) { okAll = false; out.push(`${i + 1}: stap ${s.join(' ')} mislukt`); break; } }
    const won = okAll && await waitFor(p, () => document.getElementById('wkEndModal').classList.contains('show'), 25000);
    const info = await ev(p, () => __wk.S ? { hits: __wk.S.hits, stars: __wk.Core.stars(__wk.S) } : {});
    out.push(`${i + 1}:${won ? 'ok' : 'FOUT'}(${info.hits} geraakt)`);
    if (!won) okAll = false;
    if (!okAll) { ok(`level ${i + 1} via echte tikken`, false, out.slice(-2).join(' ')); }
  }
  ok(`alle ${n} levels opgelost via echte tikken op het scherm`, out.every(o => !/FOUT|mislukt/.test(o)), out.join(' '));
  await p.close();
}

/* ================= performance: 6x CPU throttle, after a 30 s warm-up, a busy level with Woef walking ================= */
if (want('perf')) {
  const all = JSON.stringify({ lv: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [i, { s: 3, h: 0, k: 0 }])) });
  const p = await page(LAND, '{"seen":"9.99","mute":false}', { 'wk.stats': all });
  await openGame(p);
  const out = [];
  for (const lv of (process.env.PERF_LEVELS || '16,11,3').split(',').map(Number)) {
    await ev(p, lv => { __wk.startLevel(lv - 1); }, lv); await wait(p, 200); await p.tap('#wkGo');
    // a little bot keeps Woef walking back and forth (always something moving)
    await ev(p, () => { clearInterval(window.__wkBot); let k = 0; window.__wkBot = setInterval(() => { const S = __wk.S, L = __wk.L; if (!S || S.w.m !== 'idle') return; const f = L.floors[0]; __wk.doCmd({ t: 'walk', f: f.id, x: (k++ % 2) ? f.x0 + .8 : Math.min(f.x1 - .8, f.x0 + 5) }); }, 200); });
    await wait(p, lv === 16 ? 30000 : 6000);
    await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await wait(p, 3000);
    const r = await ev(p, async () => { const t0 = performance.now(); let n = 0, worst = 0, last = t0; await new Promise(res => { const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 6000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), worst: Math.round(worst), q: __wk.quality(), running: __wk.running() }; });
    await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    out.push([lv, r]);
  }
  await ev(p, () => clearInterval(window.__wkBot));
  console.log('perf', JSON.stringify(out));
  ok('fps bij 6× CPU-vertraging ≥ 50 (na 30 s opwarmen, Woef loopt, machine beweegt)', out.every(([, r]) => r.fps >= 50 && r.running), JSON.stringify(out));
  await p.close();
}
console.log('\nconsole/page errors:', errs.length ? errs.slice(0, 8).join('\n') : 'geen');
ok('geen consolefouten', errs.length === 0);
console.log(`\n${res.filter(r => r.startsWith('PASS')).length} geslaagd, ${res.filter(r => r.startsWith('FAIL')).length} mislukt`);
await b.close();
process.exit(res.some(r => r.startsWith('FAIL')) ? 1 : 0);
