// Opens every game from the menu (portrait and landscape), goes back, and fails on any page/console error.
// Usage: node tests/tiles.mjs [path/to/index.html]   (default: build/web/index.html)
import { existsSync } from 'node:fs';
import { chromium, devices } from 'playwright';
const file = process.argv[2] || process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname;
const exe = process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const b = await chromium.launch({ executablePath: exe });
const errs = [];
let opened = 0;
for (const land of [false, true]) {
  const p = await (await b.newContext(land ? { ...devices['Pixel 7 landscape'] } : { ...devices['Pixel 7'] })).newPage();
  p.on('pageerror', e => errs.push(`${land ? 'L' : 'P'} pageerror: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errs.push(`${land ? 'L' : 'P'} console: ${m.text()}`); });
  await p.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'));
  await p.goto('file://' + file); await p.waitForTimeout(600);
  const ids = await p.evaluate(() => [...document.querySelectorAll('button.tile[id^="tile"]')].map(t => t.id));
  for (const id of ids) {
    await p.evaluate(id => document.getElementById(id).click(), id); await p.waitForTimeout(700);
    const scr = await p.evaluate(() => (document.querySelector('.screen.active') || {}).id || '?');
    if (scr === 'menu') errs.push(`${land ? 'L' : 'P'} ${id}: did not open`); else opened++;
    for (let i = 0; i < 4 && (await p.evaluate(() => (document.querySelector('.screen.active') || {}).id)) !== 'menu'; i++) {
      await p.evaluate(() => { const y = document.getElementById('askYes'); if (document.getElementById('askModal').classList.contains('show')) y.click(); else window.appBack(); });
      await p.waitForTimeout(300);
    }
    if ((await p.evaluate(() => (document.querySelector('.screen.active') || {}).id)) !== 'menu') errs.push(`${land ? 'L' : 'P'} ${id}: back did not return to the menu`);
  }
  await p.close();
}
await b.close();
console.log(`tiles: ${opened} game openings checked`);
if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); }
console.log('ALL PASS');
