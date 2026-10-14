import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const errs=[];
for (const land of [false,true]) {
const p = await (await b.newContext(land?{...devices['Pixel 7 landscape']}:{...devices['Pixel 7']})).newPage();
p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname));
if(!land) await p.screenshot({path:'smoke_menu.png', fullPage:true});
await p.tap('#tilePatience'); await p.waitForTimeout(800); await p.screenshot({path:`smoke_pat${land?'L':''}.png`});
await p.evaluate(()=>window.appBack()); await p.waitForTimeout(300);
await p.tap('#tilePf'); await p.waitForTimeout(300); await p.click('#pfLevels button[data-n="1"]'); await p.waitForTimeout(400);
await p.evaluate(()=>{ __pf.keys.r=true; }); await p.waitForTimeout(2500);
await p.screenshot({path:`smoke_pf${land?'L':''}.png`});
await p.close();
}
console.log(errs);
await b.close();
