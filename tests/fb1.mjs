import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
for (const withNative of [true, false]) {
  const p = await (await b.newContext({...devices['Pixel 7']})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(n => { localStorage.setItem('app.cfg','{"seen":"9.99"}'); if (n) window.Android = { setShortcuts(){}, setBarColor(){}, keepScreenOn(){}, vibrate(){}, setUpdateMode(){}, sendFeedback: j => { window.__fb = JSON.parse(j); setTimeout(() => onFeedbackSent(window.__fbOk !== false), 50); return true; }, shareText: (s, t) => { window.__share = t; } }; }, withNative);
  await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(600);
  await p.click('#fbBtn'); await p.waitForTimeout(300);
  await p.click('#fbType button[data-v="probleem"]'); await p.click('#fbStars button[data-r="4"]');
  await p.selectOption('#fbGame', 'klaverjas'); await p.fill('#fbMsg', 'De computer speelt raar troef uit'); await p.fill('#fbContact', 'Rene');
  if (withNative) await p.screenshot({ path: 'gfx/fb_modal.png' });
  await p.click('#fbSend'); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ sent: window.__fb && { type: __fb.type, game: __fb.game, rating: __fb.rating, msg: __fb.msg, v: __fb.v, tech: !!__fb.tech }, queue: JSON.parse(localStorage.getItem('app.fbQueue') || '[]').length, toast: document.querySelector('#menuToast').textContent }));
  console.log(withNative ? 'native:' : 'browser:', JSON.stringify(r), errs);
}
await b.close();
