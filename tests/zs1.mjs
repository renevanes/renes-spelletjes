import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const land = process.argv[2]==='land';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const p = await (await b.newContext(land?{...devices['Pixel 7 landscape']}:{...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname));
await p.tap('#tileZs'); await p.waitForTimeout(300);
if(!land) await p.screenshot({path:'zs_start.png'});
await p.click('#zsGo'); await p.waitForTimeout(300);
// manual placement: place first ship by tapping a cell
await p.click('#zsArea .zs-board .zs-cell[data-r="1"][data-c="1"]'); await p.waitForTimeout(100);
await p.click('#zsArea [data-a="rot"]'); await p.click('#zsArea .zs-board .zs-cell[data-r="3"][data-c="8"]'); await p.waitForTimeout(100);
await p.screenshot({path:`zs_place${land?'L':''}.png`});
await p.click('#zsArea [data-a="rand"]'); await p.click('#zsArea [data-a="done"]'); await p.waitForTimeout(300);
// play: random shots by tapping until over
let n=0;
while (n<300) { const st = await p.evaluate(()=>({ph:__zs.S.phase, turn:__zs.S.turn})); if (st.ph==='over') break;
  if (st.turn===0) { const cell = await p.evaluate(()=>{ const b=__zs.S.boards[1]; const o=[]; for(let r=0;r<10;r++)for(let c=0;c<10;c++) if(!b.shots[r][c]) o.push([r,c]); return o[Math.floor(Math.random()*o.length)]; });
    const busy = await p.evaluate(()=>0); await p.click(`#zsArea .zs-board.target .zs-cell[data-r="${cell[0]}"][data-c="${cell[1]}"]`).catch(()=>{}); n++; if(n===25) await p.screenshot({path:`zs_play${land?'L':''}.png`}); }
  await p.waitForTimeout(250); }
await p.waitForTimeout(1500); await p.screenshot({path:`zs_end${land?'L':''}.png`});
console.log('shots', n, await p.evaluate(()=>__zs.S.phase), await p.textContent('#zsEndTitle'), errs);
await b.close();
