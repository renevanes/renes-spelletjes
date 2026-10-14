import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'));
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(500);
let ok = true; const check = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) ok = false; };
await p.tap('#tileWq'); await p.waitForTimeout(900);
check('continent chooser visible at the top', await p.isVisible('#wqCont button[data-cont="EU"]'));
const box = await p.locator('#wqCont').boundingBox(); check('chooser above the fold', box && box.y + box.height < 700, JSON.stringify(box));
await p.screenshot({ path: 'gfx/wq_cont_start.png' });
await p.tap('#wqCont button[data-cont="EU"]'); await p.waitForTimeout(200);
check('Europa selected + saved', await p.evaluate(() => __wq.opt.cont === 'EU' && JSON.parse(localStorage.getItem('wq.settings')).cont === 'EU'));
check('Start button names Europa', (await p.textContent('#wqGo')).includes('Europa'), await p.textContent('#wqGo'));
await p.screenshot({ path: 'gfx/wq_cont_eu.png' });
for (const mode of ['vlag', 'hoofd', 'land', 'wijs', 'reis']) {
  const exists = await p.evaluate(m => !!document.querySelector(`#wqModes button[data-m="${m}"]`), mode);
  if (!exists) { console.log('skip mode', mode); continue; }
  await p.evaluate(m => { document.querySelector(`#wqModes button[data-m="${m}"]`).click(); }, mode); await p.waitForTimeout(150);
  await p.tap('#wqGo'); await p.waitForTimeout(400); if (await p.isVisible('#askYes')) { await p.tap('#askYes'); } await p.waitForTimeout(1200);
  const r = await p.evaluate(() => ({ mode: __wq.G.cfg.mode, t: document.getElementById('wqTitle').textContent, qs: __wq.G.qs.map(q => q.c), conts: __wq.G.qs.map(q => __wq.BY[q.c].ct) }));
  const allEU = r.conts.every(ct => ct.includes('EU'));
  check(`mode ${mode}: started + all questions European`, r.mode === mode && allEU && r.qs.length > 0, r.mode + ' ' + r.qs.slice(0, 10).join(','));
  check(`mode ${mode}: title shows Europa`, r.t.includes('Europa'), r.t);
  if (mode === 'vlag' || mode === 'wijs') await p.screenshot({ path: `gfx/wq_cont_${mode}.png` });
  await p.evaluate(() => window.appBack()); await p.waitForTimeout(400);
  if (!(await p.isVisible('#wqStartModal'))) { await p.evaluate(() => __wq.renderStart && document.getElementById('wqStartModal').classList.add('show')); }
  await p.evaluate(() => { const y = document.getElementById('askYes'); if (document.getElementById('askModal').classList.contains('show')) y.click(); }); await p.waitForTimeout(300);
}
await p.setViewportSize({ width: 915, height: 412 }); await p.waitForTimeout(400);
await p.evaluate(() => { document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); __wq.renderStart(); document.getElementById('wqStartModal').classList.add('show'); }); await p.waitForTimeout(300);
await p.screenshot({ path: 'gfx/wq_cont_land.png' });
check('no console errors', !errs.length, JSON.stringify(errs)); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close();
