import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const errs=[];
for (const lvl of ['makkelijk','moeilijk']) {
const p = await (await b.newContext({...devices['Pixel 7']})).newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.addInitScript(()=>localStorage.setItem('app.cfg','{"seen":"9.99"}'));
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(400);
if (lvl==='makkelijk') await p.screenshot({path:'gfx/menu_new.png'});
await p.tap('#tileMs'); await p.waitForTimeout(400); await p.screenshot({path:`gfx/ms_start.png`});
await p.click(`#msLevels button[data-lvl="${lvl}"]`); await p.click('#msGo'); await p.waitForTimeout(300);
// tap center cell via real pointer events
const box = await p.locator('#msCanvas').boundingBox();
const v = await p.evaluate(()=>({...__ms.view, rows: __ms.S.rows, cols: __ms.S.cols}));
const cx = box.x + v.x + (Math.floor(v.cols/2)+.5)*v.s, cy = box.y + v.y + (Math.floor(v.rows/2)+.5)*v.s;
await p.mouse.click(cx, cy); await p.waitForTimeout(900);
const opened = await p.evaluate(()=>__ms.S.st.filter(x=>x===1).length);
// long press to flag a closed cell that is a mine (solver-ish): find a mine adjacent to opened area
await p.evaluate(()=>{ const S=__ms.S; let n=0; for (let i=0;i<S.mine.length && n<6;i++) if (S.mine[i] && S.st[i]===0) { __ms.flag(i); n++; } });
await p.waitForTimeout(500); await p.screenshot({path:`gfx/ms_${lvl}.png`});
// auto-solve: reveal all safe cells
await p.evaluate(()=>{ const S=__ms.S; for (let i=0;i<S.mine.length;i++) if (!S.mine[i] && S.st[i]===0) __ms.reveal(i); });
await p.waitForTimeout(800); await p.screenshot({path:`gfx/ms_${lvl}_win.png`});
await p.waitForTimeout(1200);
console.log(lvl, 'opened', opened, 'won', await p.evaluate(()=>__ms.S.won), 'end modal', await p.evaluate(()=>document.querySelector('#msEndModal').classList.contains('show')), await p.textContent('#msEndText'));
await p.close(); }
// loss test
const p = await (await b.newContext({...devices['Pixel 7']})).newPage(); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>localStorage.setItem('app.cfg','{"seen":"9.99"}')); await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(300);
await p.tap('#tileMs'); await p.waitForTimeout(300); await p.click('#msLevels button[data-lvl="normaal"]'); await p.click('#msGo');
await p.evaluate(()=>{ __ms.reveal(0); const S=__ms.S; const m=S.mine.indexOf(1); __ms.reveal(m); });
await p.waitForTimeout(700); await p.screenshot({path:'gfx/ms_boom.png'}); await p.waitForTimeout(3000);
console.log('lost modal', await p.evaluate(()=>document.querySelector('#msEndModal').classList.contains('show')));
console.log(errs); await b.close();
