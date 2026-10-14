import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const p = await (await b.newContext({...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{ window.__calls=[]; window.Android={ setShortcuts:j=>__calls.push(['set',JSON.parse(j).map(x=>x.id)]), canPinShortcut:()=>true, pinShortcut:(id,l,png)=>{__calls.push(['pin',id,l,png.length]); return true;}, setBarColor(){}, keepScreenOn(){}, vibrate(){} }; });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname));
await p.waitForTimeout(1200);
// long-press Zeeslag tile
const t = await p.locator('#tileZs').boundingBox();
await p.mouse.move(t.x+40,t.y+30); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up(); await p.waitForTimeout(300);
console.log('modal open', await p.evaluate(()=>document.querySelector('#scModal').classList.contains('show')), 'current', await p.evaluate(()=>document.querySelector('.screen.active').id));
await p.screenshot({path:'sc_modal.png'});
await p.click('#scList button[data-pin="zs"]');
await p.click('#scModal [data-close]');
// simulate shortcut launch
await p.evaluate(()=>openGame('rs')); await p.waitForTimeout(500);
console.log('after openGame rs', await p.evaluate(()=>document.querySelector('.screen.active').id));
await p.evaluate(()=>openGame('patience')); await p.waitForTimeout(500);
console.log('after openGame patience', await p.evaluate(()=>document.querySelector('.screen.active').id));
await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>__calls)), errs);
await b.close();
