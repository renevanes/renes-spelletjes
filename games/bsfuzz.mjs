import { existsSync as require_exists } from 'node:fs';
// Bellenschieter robustness fuzz: random aims and shots (also rapid bursts and taps during animations), drags that are
// cancelled, pause/resume through the menu dialog, boosters, restart, level changes, endless games, leaving and coming
// back, and page reloads. After every action it waits until the animations are done and checks:
//   drawn grid == logic grid, nothing floating, all scheduled times finite, the timeline queue is empty,
//   the render loop has stopped, and (when a game is running) the game accepts a shot.
// Usage: node bsfuzz.mjs [index.html]   env: STEPS=220, SEED=1, MODE=mix|lvl|end
import { chromium, devices } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'bstest', 'index.html'));
const STEPS = +process.env.STEPS || 220, MODE = process.env.MODE || 'mix';
let seed = +process.env.SEED || 1; const R = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const pick = a => a[Math.floor(R() * a.length)];
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ ...devices['Pixel 7'] }), p = await ctx.newPage();
const errs = [], issues = []; let actions = 0, checks = 0, verified = 0;
p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { if (!sessionStorage.getItem('i')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); sessionStorage.setItem('i', 1); } });
const HELP = () => {
  const st = () => document.getElementById('bsStage');
  window.__F = {
    pe(type, x, y, id = 4) { st().dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true })); },
    shoot(a) { const c = __bs.aimClient(a, 3 + Math.random() * 4); this.pe('pointerdown', c.x, c.y); this.pe('pointerup', c.x, c.y); },
    wait: ms => new Promise(r => setTimeout(r, ms)),
    live: () => !!(__bs.S && __bs.G && !__bs.G.preview && !__bs.G.over && !__bs.S.won && !__bs.S.lost),
    modal: () => !!document.querySelector('.modal.show'),
    async settle(max = 15000) { const t0 = performance.now(); while (performance.now() - t0 < max) { if (!__bs.busy() && !__bs.sched && !__bs.fx) return true; await this.wait(40); } return false; },
  };
};
await p.goto(target); await p.waitForTimeout(400); await p.evaluate(HELP);
const ev = (f, a) => p.evaluate(f, a);
async function openGame() { await ev(() => { if (!document.getElementById('bs').classList.contains('active')) openGame('bs'); }); await p.waitForTimeout(350); }
await openGame();
await ev(() => { const st = __bs.stats(); for (let i = 1; i <= 60; i++) st.stars[i] = 1; __bs.giveCoins(5000); });
async function newGame() { if (MODE === 'end' || (MODE === 'mix' && R() < .3)) await ev(() => __bs.startEndless()); else await ev(lv => __bs.startLevel(lv), 1 + Math.floor(R() * 60)); await p.waitForTimeout(150); }
await newGame();

const ACTS = ['shot', 'shot', 'shot', 'shot', 'burst', 'burst', 'tapAnim', 'drag', 'pause', 'boost', 'restart', 'level', 'leave', 'reload', 'speed'];
for (let step = 0; step < STEPS; step++) {
  const act = pick(ACTS); actions++;
  // a finished game (dialog up) or a dialog left open: start something new
  const state = await ev(() => ({ live: __F.live(), modal: __F.modal(), over: !__bs.G || __bs.G.over || __bs.G.preview }));
  if (!state.live) { await newGame(); continue; }
  try {
    if (act === 'shot') await ev(a => __F.shoot(a), .2 + R() * 2.7);
    else if (act === 'burst') await ev(async n => { for (let i = 0; i < n; i++) { __F.shoot(.2 + Math.random() * 2.7); await __F.wait(Math.random() * 90); } }, 2 + Math.floor(R() * 5));
    else if (act === 'tapAnim') await ev(async () => { __F.shoot(.3 + Math.random() * 2.5); for (let i = 0; i < 6; i++) { await __F.wait(Math.random() * 60); const c = Math.random() < .5 ? __bs.launcherClient() : __bs.aimClient(Math.random() * 3, 3); __F.pe('pointerdown', c.x, c.y, 7); __F.pe('pointerup', c.x, c.y, 7); } });
    else if (act === 'drag') await ev(async () => { const a = __bs.aimClient(.5 + Math.random() * 2, 4); __F.pe('pointerdown', a.x, a.y, 8); for (let i = 0; i < 8; i++) { await __F.wait(16); __F.pe('pointermove', a.x + (Math.random() - .5) * 200, a.y + (Math.random() - .3) * 300, 8); } const l = __bs.launcherClient(); if (Math.random() < .5) __F.pe('pointercancel', l.x, l.y, 8); else __F.pe('pointerup', l.x, l.y + 40, 8); });
    else if (act === 'pause') { await ev(a => __F.shoot(a), .3 + R() * 2.5); await p.waitForTimeout(R() * 300); await p.click('#bsMenu'); await p.waitForTimeout(100 + R() * 600); await ev(() => __F.shoot(1.5)); const resumeVis = await ev(() => !document.getElementById('bsResume').hidden && document.getElementById('bsStartModal').classList.contains('show')); if (resumeVis && R() < .7) await p.click('#bsResume'); else if (await ev(() => document.getElementById('bsStartModal').classList.contains('show'))) await p.click('#bsGo'); }
    else if (act === 'boost') { await ev(a => __F.shoot(a), .3 + R() * 2.5); await p.waitForTimeout(R() * 200); await ev(k => { if (k === 'fire') __bs.setFire(1); const bt = document.querySelector(`#bsTools button[data-b="${k}"]`); bt.click(); }, pick(['bomb', 'rain', 'aim', 'plus', 'fire'])); await ev(a => __F.shoot(a), .3 + R() * 2.5); }
    else if (act === 'restart') { await ev(a => __F.shoot(a), .3 + R() * 2.5); await p.waitForTimeout(R() * 250); await p.click('#bsRetry'); await p.waitForTimeout(120); if (await ev(() => document.getElementById('askModal').classList.contains('show'))) await p.click('#askYes'); }
    else if (act === 'level') { await ev(a => __F.shoot(a), .3 + R() * 2.5); await p.waitForTimeout(R() * 250); await newGame(); }
    else if (act === 'leave') { await ev(a => __F.shoot(a), .3 + R() * 2.5); await p.waitForTimeout(R() * 250); await ev(() => window.appBack()); await p.waitForTimeout(200); await p.click('#tileBs', { force: true }).catch(() => openGame()); await p.waitForTimeout(300); if (await ev(() => document.getElementById('bsStartModal').classList.contains('show'))) await newGame(); }
    else if (act === 'reload') { await ev(a => __F.shoot(a), .3 + R() * 2.5); await p.waitForTimeout(R() * 300); await p.reload(); await p.waitForTimeout(400); await ev(HELP); await openGame(); await p.waitForTimeout(200); if (await ev(() => document.getElementById('bsStartModal').classList.contains('show'))) await newGame(); }
    else if (act === 'speed') await ev(d => { __bs.dur = d; }, pick([1, 1, .5, .25]));
  } catch (e) { issues.push({ step, act, what: 'action threw: ' + e.message.split('\n')[0] }); }
  // ---- after the dust settles ----
  const done = await ev(() => __F.settle());
  const c = await ev(async () => {
    const f0 = __bs.frames().length; await __F.wait(350); const f1 = __bs.frames().length;
    return { same: __bs.drawnKey() === __bs.logicKey(), floating: __bs.floating(), finite: __bs.finite(), sched: __bs.sched, fx: __bs.fx, idle: f1 - f0, live: __F.live(), modal: __F.modal(), can: __bs.canShoot(), pending: __bs.pending, mode: __bs.G && __bs.G.mode, id: __bs.G && __bs.G.id, shots: __bs.S && __bs.S.shots };
  });
  checks++;
  const bad = [];
  if (!done) bad.push('animations never finished');
  if (!c.same) bad.push('drawn grid != logic grid');
  if (c.floating) bad.push('floating bubbles: ' + c.floating);
  if (!c.finite) bad.push('non-finite times');
  if (c.sched || c.fx) bad.push('queue not empty');
  if (c.idle > 1) bad.push('render loop still running when idle (' + c.idle + ' frames)');
  if (c.live && !c.modal && !c.can) bad.push('live game does not accept a shot');
  if (c.live && c.modal && !(await ev(() => document.querySelector('.modal.show').id === 'bsStartModal' || document.querySelector('.modal.show').id === 'askModal'))) bad.push('unexpected dialog during a live game');
  if (bad.length) issues.push({ step, act, bad, c });
  // every few steps prove the game really takes a shot
  if (c.live && !c.modal && step % 5 === 0) {
    const s0 = c.shots; await ev(() => __F.shoot(1 + Math.random())); await p.waitForTimeout(30);
    const s1 = await ev(() => __bs.S.shots); if (s1 !== s0 + 1 && !(await ev(() => !__F.live()))) issues.push({ step, act: 'verify', bad: ['shot not accepted'], s0, s1 }); else verified++;
  }
  if (issues.length > 8) break;
  if (step % 20 === 0) console.log(`step ${step} ${act} mode=${c.mode} lv=${c.id} shots=${c.shots} issues=${issues.length}`);
}
console.log(JSON.stringify({ actions, checks, verifiedShots: verified, issues: issues.slice(0, 8), errors: errs.slice(0, 5) }, null, 1));
console.log(issues.length || errs.length ? 'FUZZ FAIL' : 'FUZZ PASS');
await b.close();
