import { existsSync as require_exists } from 'node:fs';
// node shots.mjs "lv:n,lv:n,..." [land] -> gfx/kb2_s_<lv>.png after running n solution commands
import { chromium } from 'playwright';
import { kbRun } from './driver.mjs';
import { SOL } from './solutions.mjs';
const S = new URL('../../build/work', import.meta.url).pathname;
const land = process.argv.includes('land');
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await (await b.newContext(land ? { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kb.progress', JSON.stringify({ v: 2, unlocked: 20, best: {}, stars: {}, gems: {} })); });
await p.goto('file://' + S + '/kbtest/index.html'); await p.waitForTimeout(400);
await p.tap('#tileKb'); await p.waitForTimeout(500);
for (const spec of process.argv[2].split(',')) {
  const [lv, n] = spec.split(':').map(Number);
  await p.evaluate(l => { __kb.load(l - 1); __kb.manual = true; }, lv);
  for (const cmd of (SOL[lv] || []).slice(0, n)) if (cmd[0] !== 'shot') await p.evaluate(kbRun, cmd);
  await p.evaluate(() => { __kb.step(30); __kb.draw(); document.querySelector('#kbBanner').classList.remove('show'); });
  await p.waitForTimeout(350);
  await p.screenshot({ path: `${S}/gfx/kb2_s_${lv}_${n}${land ? 'L' : ''}.png` });
}
console.log('errors', errs);
await b.close();
