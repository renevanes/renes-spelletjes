import { existsSync as require_exists } from 'node:fs';
// dev runner: node run.mjs <levels comma list> [land] [shots] [v]
import { chromium } from 'playwright';
import { kbRun } from './driver.mjs';
import { SOL } from './solutions.mjs';
const S = new URL('../../build/work', import.meta.url).pathname;
const args = process.argv.slice(2), land = args.includes('land'), shots = args.includes('shots'), V = args.includes('v');
const levels = (args[0] || '1').split(',').map(Number);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext(land ? { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kb.progress', JSON.stringify({ v: 2, unlocked: 20, best: {}, stars: {}, gems: {} })); });
await p.goto('file://' + S + '/kbtest/index.html'); await p.waitForTimeout(500);
await p.tap('#tileKb'); await p.waitForTimeout(600);
if (shots) await p.screenshot({ path: `${S}/gfx/kb2_dev_start${land ? 'L' : ''}.png` });
for (const lv of levels) {
  await p.evaluate(l => { __kb.load(l - 1); __kb.manual = true; }, lv);
  await p.waitForTimeout(200);
  if (shots) { await p.evaluate(() => __kb.draw()); await p.screenshot({ path: `${S}/gfx/kb2_dev_${lv}a${land ? 'L' : ''}.png` }); }
  const log = []; let n = 0;
  for (const cmd of SOL[lv] || []) {
    if (cmd[0] === 'shot') { await p.evaluate(() => __kb.draw()); await p.screenshot({ path: `${S}/gfx/kb2_dev_${lv}${cmd[1]}${land ? 'L' : ''}.png` }); continue; }
    const r = await p.evaluate(kbRun, cmd); n++;
    log.push(`${String(n).padStart(3)} ${JSON.stringify(cmd)} → ${JSON.stringify(r)}`);
    if (r.err || r.state !== 'play') break;
  }
  const fin = await p.evaluate(() => { __kb.step(300); return { state: __kb.state, t: __kb.time.toFixed(1), gems: __kb.gemGot + '/' + __kb.gemTotal, end: __kb.endInfo }; });
  console.log(`LEVEL ${lv}: ${fin.state} t=${fin.t} gems=${fin.gems} ${JSON.stringify(fin.end)}`);
  if (V || (fin.state !== 'done' && fin.state !== 'win')) console.log(log.join('\n'));
  if (shots) { await p.evaluate(() => { __kb.manual = false; }); await p.waitForTimeout(400); await p.screenshot({ path: `${S}/gfx/kb2_dev_${lv}z${land ? 'L' : ''}.png` }); }
}
console.log('errors:', errs.slice(0, 8));
await b.close();
