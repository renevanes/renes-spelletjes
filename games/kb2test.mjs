import { existsSync as require_exists } from 'node:fs';
// De Drie Kabouters v2 – full test.  node newgames/kb2test.mjs [path/to/index.html] [--noperf] [--noshots]
// Solves every level through the game's own input path (fixed-timestep __kb.step + __kb.keys/press/use/give),
// checks the individual mechanics, the UI flows (level select locks, death → retry, save/resume, sound/music options),
// measures frame rate under 6× CPU throttling and writes screenshots + a contact sheet to scratchpad/gfx.
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import { kbRun } from './kb2/driver.mjs';
import { SOL } from './kb2/solutions.mjs';
const S = new URL('../build/work', import.meta.url).pathname;
const args = process.argv.slice(2), TARGET = args.find(a => !a.startsWith('--')) || `${S}/kbtest/index.html`;
const NOPERF = args.includes('--noperf'), NOSHOTS = args.includes('--noshots');
const URL = 'file://' + TARGET, GFX = `${S}/gfx`;
let failures = 0; const ok = (cond, msg, extra) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}${extra ? '  ' + extra : ''}`); if (!cond) failures++; return cond; };
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const PORTRAIT = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const LANDSCAPE = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
async function openPage(ctxOpts, progress) {
  const ctx = await browser.newContext(ctxOpts), p = await ctx.newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.addInitScript(pr => { if (!sessionStorage.getItem('kbInit')) { sessionStorage.setItem('kbInit', '1'); localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99"}'); if (pr) localStorage.setItem('kb.progress', JSON.stringify(pr)); } }, progress || null);
  await p.goto(URL); await p.waitForTimeout(500);
  return { ctx, p };
}
const run = (p, cmd) => p.evaluate(kbRun, cmd);
async function runSol(p, lv, n = Infinity) {
  let last = null; const cmds = SOL[lv].filter(c => c[0] !== 'shot').slice(0, n);
  for (const c of cmds) { last = await run(p, c); if (last.err || last.state !== 'play') break; }
  return last;
}
const loadLv = (p, lv) => p.evaluate(l => { __kb.load(l - 1); __kb.manual = true; }, lv);
const hideBanner = p => p.evaluate(() => { document.querySelector('#kbBanner').classList.remove('show'); });

// ------------------------------------------------------------------ 1. fresh start, menu tile, level select locks, touch & keyboard input
{
  const { ctx, p } = await openPage(PORTRAIT);
  await p.tap('#tileKb'); await p.waitForTimeout(700);
  ok(await p.isVisible('#kbStartModal'), 'game opens from the menu tile with the level select');
  const lock = await p.evaluate(() => [...document.querySelectorAll('#kbLevels button[data-n]')].map(b => b.disabled));
  ok(lock.length === 20 && !lock[0] && lock.slice(1).every(Boolean), 'fresh profile: only level 1 unlocked, levels 2-20 locked', `${lock.filter(x => !x).length} open`);
  await p.click('#kbLevels button[data-n="0"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __kb.state === 'play' && __kb.lv === 0 && !document.querySelector('.modal.show')), 'level 1 starts from the level select');
  // touch: hold ▶ on the d-pad with a real pointer
  const x0 = await p.evaluate(() => __kb.gn[0].x);
  const box = await p.locator('#kbPanel [data-act="r"]').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up();
  const x1 = await p.evaluate(() => __kb.gn[0].x);
  ok(x1 > x0 + 1, 'touch control ▶ moves Snel', `${x0.toFixed(2)} → ${x1.toFixed(2)}`);
  const jb = await p.locator('#kbA').boundingBox(); let minY = 99;
  await p.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2); await p.mouse.down();
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(40); minY = Math.min(minY, await p.evaluate(() => __kb.gn[0].y)); }
  await p.mouse.up(); await p.waitForTimeout(500);
  ok(minY < 8.6, 'touch Spring button makes Snel jump', `top reached y=${minY.toFixed(2)}`);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.up('ArrowRight');
  ok(await p.evaluate(() => __kb.gn[0].x) > x1 + .8, 'keyboard ArrowRight moves the active gnome');
  await p.keyboard.press('2'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => __kb.cur) === 1, 'keyboard 2 selects Sterk');
  await p.tap('.kb-por[data-g="2"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => __kb.cur) === 2, 'tapping a portrait selects that gnome');
  // sound and music options
  await p.evaluate(() => { window.__plays = []; const o = __sfx.play; __sfx.play = function (n) { __plays.push(n); return o.apply(this, arguments); }; });
  await p.click('#kbLevelsBtn'); await p.waitForTimeout(200);
  await p.click('#kbOptList button[data-k="sound"][data-v="false"]'); await p.click('#kbOptList button[data-k="music"][data-v="false"]');
  ok(await p.evaluate(() => __kb.opt.sound === false && __kb.opt.music === false && JSON.parse(localStorage.getItem('kb.settings')).sound === false), 'Geluidseffecten / Achtergrondmuziek "Uit" are stored');
  await p.click('#kbLevels button[data-n="0"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { __plays.length = 0; __kb.manual = true; __kb.select(0); __kb.press('a'); __kb.keys.j = true; __kb.step(30); __kb.keys.j = false; __kb.step(120); });
  const offPlays = await p.evaluate(() => __plays.filter(n => n.startsWith('kb')).length);
  await p.evaluate(() => { __kb.manual = false; }); await p.waitForTimeout(1500);
  const musOff = await p.evaluate(() => __sfx._state());
  ok(offPlays === 0 && musOff.now !== 'kb', 'with sound and music off: no kb sounds, no kb music', JSON.stringify({ offPlays, now: musOff.now }));
  await p.click('#kbLevelsBtn'); await p.waitForTimeout(200);
  await p.click('#kbOptList button[data-k="sound"][data-v="true"]'); await p.click('#kbOptList button[data-k="music"][data-v="true"]');
  await p.click('#kbLevels button[data-n="0"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { __plays.length = 0; __kb.manual = true; __kb.select(0); __kb.press('a'); __kb.keys.j = true; __kb.step(30); __kb.keys.j = false; __kb.step(120); });
  const onPlays = await p.evaluate(() => __plays.filter(n => n.startsWith('kb')));
  await p.evaluate(() => { __kb.manual = false; });
  let musOn = null; for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); musOn = await p.evaluate(() => __sfx._state()); if (musOn.now === 'kb') break; }
  ok(onPlays.includes('kbJump') && musOn.now === 'kb', 'with sound and music on: jump sound plays and the kb music track runs', JSON.stringify({ onPlays: onPlays.slice(0, 4), now: musOn.now }));
  // all kb sounds render cleanly (no NaN, no clipping)
  const snd = await p.evaluate(() => __kb.sfxNames().map(n => { const d = __sfx._buf(n).getChannelData(0); let pk = 0, nan = 0, rms = 0; for (const x of d) { if (x !== x) nan++; pk = Math.max(pk, Math.abs(x)); rms += x * x; } return [n, { pk, nan, rms: Math.sqrt(rms / d.length), len: d.length }]; }));
  const badSnd = snd.filter(([, v]) => v.nan || v.pk > 1.001 || v.rms < .005);
  ok(snd.length >= 40 && !badSnd.length, `${snd.length} kb sound effects render without NaN / clipping`, badSnd.map(x => x[0]).join(','));
  ok(!p.errs.length, 'no console errors (input / options part)', p.errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------------ 2. mechanics
{
  const { ctx, p } = await openPage(PORTRAIT, { v: 2, unlocked: 20, best: {}, stars: {}, gems: {} });
  await p.tap('#tileKb'); await p.waitForTimeout(500);
  // dash breaks a cracked wall (L2)
  await loadLv(p, 2); await run(p, ['go', 8.5]); await run(p, ['face', 'r']);
  const before = await p.evaluate(() => __kb.tile(10, 8));
  await run(p, ['B']); await run(p, ['wait', .4]);
  ok(before === 5 && await p.evaluate(() => __kb.tile(10, 8)) === 0, 'Snel\'s kopstoot breaks the cracked wall');
  // hammer breaks boulders + apple heals (L2)
  await loadLv(p, 2); await runSol(p, 2, 11);
  ok(await p.evaluate(() => __kb.tile(29, 8) === 0 && __kb.foes.every(f => f.dead)), 'Sterk\'s hammer smashes the boulders and the beetle');
  ok(await p.evaluate(() => __kb.gn[1].inv.includes('apple')), 'Sterk picked up the apple');
  const heal = await p.evaluate(() => { const e = __kb.gn[1]; e.hearts = 1; __kb.select(1); const h0 = e.hearts; __kb.slot(e.inv.indexOf('apple')); __kb.use(); return [h0, e.hearts, e.inv.length]; });
  ok(heal[1] === heal[0] + 1 && heal[2] === 0, 'using the apple heals one heart and removes it from the inventory', JSON.stringify(heal));
  // give through the bars + key opens the door (L4)
  await loadLv(p, 4); await runSol(p, 4, 9);
  const preGive = await p.evaluate(() => [__kb.gn[0].inv.join(), __kb.gn[1].inv.join()]);
  await run(p, ['give', 'kr']);
  const postGive = await p.evaluate(() => [__kb.gn[0].inv.join(), __kb.gn[1].inv.join()]);
  ok(preGive[0] === 'kr' && postGive[0] === '' && postGive[1] === 'kr', 'Geef: Snel passes the red key through the bars to Sterk', JSON.stringify([preGive, postGive]));
  await run(p, ['sel', 1]); await run(p, ['go', 15.6]);
  const lockedBefore = await p.evaluate(() => !__kb.objs.find(o => o.t === 'lock').open);
  await run(p, ['act']);
  ok(lockedBefore && await p.evaluate(() => __kb.objs.find(o => o.t === 'lock').open && !__kb.gn[1].inv.length), 'the red key opens the red door and is used up');
  // glide (L3)
  await loadLv(p, 3); await runSol(p, 3, 3);
  const glide = await p.evaluate(() => { const e = __kb.gn[2]; __kb.keys.r = true; let vmax = 0, top = e.y; for (let i = 0; i < 420; i++) { __kb.step(1); vmax = Math.max(vmax, e.vy); top = Math.min(top, e.y); } __kb.keys.r = false; __kb.step(200); return { vmax, drop: e.y - top, hearts: e.hearts, onGround: e.onGround }; });
  ok(glide.vmax <= 2.45 && glide.drop > 5.5 && glide.hearts === 3 && glide.onGround, 'Schild glides with her mushroom up (slow fall, no damage)', JSON.stringify(glide));
  // Schild as a platform (L6)
  await loadLv(p, 6); await runSol(p, 6, 6);
  ok(await p.evaluate(() => __kb.gn[0].support === __kb.gn[2] && Math.abs(__kb.gn[0].y + __kb.gn[0].h - (__kb.gn[2].y - .3)) < .02), 'Snel stands on Schild\'s raised mushroom (stacking)');
  await run(p, SOL[6][6]);
  ok(await p.evaluate(() => __kb.gn[0].y + __kb.gn[0].h) <= 9.01, 'from her mushroom Snel reaches the 3-high block');
  // elevator (L9)
  await loadLv(p, 9); await runSol(p, 9, 15);
  const ey0 = await p.evaluate(() => __kb.plats[0].y); await run(p, ['act']); await run(p, ['until', 'K.plats[0].y < 7.001', 6]);
  ok(ey0 === 14 && await p.evaluate(() => Math.abs(__kb.plats[0].y - 7) < .01 && Math.abs(__kb.gn[0].y + __kb.gn[0].h - 7) < .02), 'lever sends the lift up with the gnomes on it', `${ey0} → 7`);
  // ranged throw hits a far button (L8)
  await loadLv(p, 8); await runSol(p, 8, 5);
  ok(await p.evaluate(() => !__kb.chan.r), 'button still off before the throw');
  await run(p, ['B']); await run(p, ['until', 'K.chan.r', 3]);
  ok(await p.evaluate(() => __kb.chan.r && __kb.objs.find(o => o.t === 'button').on), 'Sterk\'s slingshot hits the far button and the bridge extends');
  // bomb (L8)
  await loadLv(p, 8); await runSol(p, 8, 24);
  ok(await p.evaluate(() => __kb.tile(31, 13) === 0 && __kb.tile(31, 15) === 0), 'the bomb blows away the reinforced wall');
  // teleporter (L7) and fan (L14)
  await loadLv(p, 7); await runSol(p, 7, 8);
  ok(await p.evaluate(() => Math.abs(__kb.gn[0].x + __kb.gn[0].w / 2 - 16.5) < .1 && __kb.gn[0].y + __kb.gn[0].h === 7), 'teleporter moves Snel to the matching pad');
  await loadLv(p, 14); await runSol(p, 14, 4);
  ok(await p.evaluate(() => __kb.gn[2].y + __kb.gn[2].h < 9.8), 'the fan blows Schild up when her mushroom is raised');
  // death → retry (L1)
  await loadLv(p, 1); await run(p, ['go', 13.5]);
  ok(await p.evaluate(() => __kb.state) === 'fail', 'walking into the water is fatal');
  await p.evaluate(() => { __kb.step(300); __kb.manual = false; }); await p.waitForTimeout(300);
  ok(await p.isVisible('#kbEndModal') && (await p.textContent('#kbEndTitle')).includes('Oei'), 'the fail dialog appears');
  if (!NOSHOTS) await p.screenshot({ path: `${GFX}/kb2_fail.png` });
  await p.click('#kbEndRetry'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __kb.state === 'play' && __kb.gn[0].hearts === 3 && Math.abs(__kb.gn[0].x + __kb.gn[0].w / 2 - 3.5) < .01), 'Opnieuw restarts the level');
  ok(!p.errs.length, 'no console errors (mechanics part)', p.errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------------ 3. every level is solvable (recorded solutions), progress + end dialog
const perLevel = [];
{
  const { ctx, p } = await openPage(PORTRAIT);
  await p.tap('#tileKb'); await p.waitForTimeout(500);
  for (let lv = 1; lv <= 20; lv++) {
    await loadLv(p, lv);
    const r = await runSol(p, lv);
    const fin = await p.evaluate(() => { __kb.step(300); return { state: __kb.state, home: __kb.gn.every(g => g.home), t: +__kb.time.toFixed(1), gems: __kb.gemGot + '/' + __kb.gemTotal, end: __kb.endInfo }; });
    perLevel.push({ lv, ...fin });
    ok(fin.state === 'done' && fin.home, `level ${String(lv).padStart(2)} ${(await p.evaluate(l => __kb.LEVELS[l - 1].n, lv)).padEnd(22)} solved`, `t=${fin.t}s gems=${fin.gems} stars=${fin.end && fin.end.stars}${r && r.err ? ' ' + r.err : ''}`);
    if (lv === 1) {
      await p.evaluate(() => { __kb.manual = false; }); await p.waitForTimeout(500);
      ok(await p.isVisible('#kbEndModal') && (await p.$$('#kbEndStars span.on')).length === 3, 'end dialog shows 3 stars after level 1');
      if (!NOSHOTS) await p.screenshot({ path: `${GFX}/kb2_win.png` });
    }
  }
  ok(perLevel.filter(r => r.end && r.end.stars === 3 && r.end.gemsAll).length >= 1, 'at least one level completed with all gems and 3 stars', `${perLevel.filter(r => r.end && r.end.stars === 3).length}/20 three-star runs`);
  const prog = await p.evaluate(() => JSON.parse(localStorage.getItem('kb.progress')));
  ok(prog.unlocked === 20 && Object.keys(prog.best).length === 20, 'progress saved: 20 levels done');
  // save / resume
  await p.reload(); await p.waitForTimeout(600); await p.tap('#tileKb'); await p.waitForTimeout(500);
  const open = await p.evaluate(() => [...document.querySelectorAll('#kbLevels button[data-n]')].filter(b => !b.disabled).length);
  const starTxt = await p.textContent('#kbStarSum');
  ok(open === 20 && /60 \/ 60/.test(starTxt), 'after reload all levels are unlocked and stars are kept', `${open} open, ${starTxt}`);
  ok(!p.errs.length, 'no console errors (levels part)', p.errs.slice(0, 3).join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------------ 4. old save migration
{
  const { ctx, p } = await openPage(PORTRAIT, { unlocked: 5, best: { 0: 30, 1: 40, 2: 50, 3: 60 }, done: 4, deaths: 3 });
  await p.tap('#tileKb'); await p.waitForTimeout(500);
  const pr = await p.evaluate(() => __kb.prog);
  ok(pr.v === 2 && pr.unlocked >= 5 && pr.legacy === 4, 'an old 8-level save keeps its unlocks (mapped) and trophies', JSON.stringify({ unlocked: pr.unlocked, legacy: pr.legacy }));
  await ctx.close();
}

// ------------------------------------------------------------------ 5. screenshots per world (portrait + landscape) + dialogs
const SHOTS = [['bos', 3, 26], ['grot', 6, 9], ['mijn', 11, 7], ['ijs', 16, 12], ['burcht', 18, 14], ['steenreus', 20, 5]];
const shotFiles = [];
if (!NOSHOTS) {
  for (const [orient, opts] of [['portrait', PORTRAIT], ['landscape', LANDSCAPE]]) {
    const { ctx, p } = await openPage(opts, { v: 2, unlocked: 20, best: { 0: 31.5, 1: 40 }, stars: { 0: 3, 1: 2 }, gems: {} });
    await p.tap('#tileKb'); await p.waitForTimeout(500);
    if (orient === 'portrait') { await p.screenshot({ path: `${GFX}/kb2_levels.png` }); shotFiles.push(`${GFX}/kb2_levels.png`); }
    for (const [name, lv, n] of SHOTS) {
      await loadLv(p, lv); await runSol(p, lv, n);
      if (name === 'steenreus') await p.evaluate(() => { __kb.step(140); __kb.look.x = 6; __kb.look.on = true; });
      await p.evaluate(() => { __kb.step(20); __kb.draw(); }); await hideBanner(p); await p.waitForTimeout(350);
      const f = `${GFX}/kb2_${name}_${orient}.png`; await p.screenshot({ path: f }); shotFiles.push(f);
    }
    await ctx.close();
  }
  shotFiles.push(`${GFX}/kb2_win.png`, `${GFX}/kb2_fail.png`);
  execFileSync('python3', [`${S}/newgames/kb2/sheet.py`, `${GFX}/kb2_sheet.png`, '5', '300', ...shotFiles.filter(f => f.includes('portrait') || !f.includes('landscape'))]);
  execFileSync('python3', [`${S}/newgames/kb2/sheet.py`, `${GFX}/kb2_sheet_landscape.png`, '2', '700', ...shotFiles.filter(f => f.includes('landscape'))]);
  console.log('screenshots:', shotFiles.length, `+ ${GFX}/kb2_sheet.png, ${GFX}/kb2_sheet_landscape.png`);
}

// ------------------------------------------------------------------ 6. performance under 6× CPU throttling
if (!NOPERF) {
  const { ctx, p } = await openPage(PORTRAIT, { v: 2, unlocked: 20, best: {}, stars: {}, gems: {} });
  await p.addInitScript(() => {});
  await p.evaluate(() => { window.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); });
  await p.tap('#tileKb'); await p.waitForTimeout(25000);     // let the app finish rendering its sound bank in the background
  const cdp = await ctx.newCDPSession(p);
  for (const lv of [12, 11, 19, 5]) {
    await p.evaluate(l => { __kb.load(l - 1); }, lv); await p.waitForTimeout(800);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await p.evaluate(() => { __kb.keys.r = true; }); await p.waitForTimeout(7000);       // adaptive quality settles
    const r = await p.evaluate(async () => {
      __lt.length = 0; let n = 0, t0 = performance.now(), last = t0, worst = 0;
      await new Promise(res => { const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 5000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      __kb.keys.r = false;
      return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), worstFrameMs: Math.round(worst), longTasks: __lt.slice(), renderScale: +__kb.qScale.toFixed(2) };
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(`PERF  level ${lv} @6x CPU: ${JSON.stringify(r)}`);
  }
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
