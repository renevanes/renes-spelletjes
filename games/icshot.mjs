import { existsSync as require_exists } from 'node:fs';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await b.newPage({ viewport: { width: 1100, height: 560 } });
await p.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99"}'));
await p.goto('file://' + process.argv[2]); await p.waitForTimeout(300);
await p.evaluate(() => { document.body.innerHTML = `<div style="display:flex;gap:20px;padding:20px;background:#eee"><img width=512 src="${GameIcons.url('bv')}"><img width=200 src="${GameIcons.url('sd')}"><img width=120 src="${GameIcons.url('bv','full')}"><img width=64 src="${GameIcons.url('bv')}"></div>`; });
await p.waitForTimeout(300); await p.screenshot({ path: process.argv[3] }); await b.close();
