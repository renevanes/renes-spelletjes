import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const p = await (await b.newContext({...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname));
await p.tap('#tileAir'); await p.waitForTimeout(300); await p.tap('#ahStartGo'); await p.waitForTimeout(1500);
const cv = await p.$('#ahCanvas') || await p.$('canvas:visible');
const rc = await p.evaluate(()=>{ const c=[...document.querySelectorAll('canvas')].find(c=>c.offsetParent); const r=c.getBoundingClientRect(); return {l:r.left,t:r.top}; });
for (const [name, cx, cy, press] of [['onder-links + speler drukt', 0, 1, true], ['onder-rechts', 1, 1, false], ['boven-links (computer)', 0, 0, false], ['boven-rechts (computer)', 1, 0, false], ['onder-rechts + speler drukt', 1, 1, true]]) {
  const T = await p.evaluate(([cx,cy])=>{ const T=__air.T, P=__air.puck; P.x = cx? T.R-P.r-1 : T.L+P.r+1; P.y = cy? T.B-P.r-1 : T.Tp+P.r+1; P.vx=0; P.vy=0; return {L:T.L,R:T.R,Tp:T.Tp,B:T.B,cx:T.cx}; }, [cx,cy]);
  if (press) { // hold the finger in the corner, pushing the stick into the puck
    const x = rc.l + (cx ? T.R-5 : T.L+5), y = rc.t + T.B - 5;
    await p.mouse.move(rc.l+T.cx, rc.t+T.B-60); await p.mouse.down(); await p.mouse.move(x, y, {steps:8});
  }
  let free = false, t=0;
  for (; t<60; t++) { await p.waitForTimeout(100); const d = await p.evaluate(([cx,cy])=>{ const T=__air.T,P=__air.puck; return Math.hypot(P.x-(cx?T.R:T.L), P.y-(cy?T.B:T.Tp)); },[cx,cy]); if (d > __dummy(0)) {} if (d > 120) { free = true; break; } }
  if (press) await p.mouse.up();
  console.log(name.padEnd(30), free ? `los na ${(t+1)/10}s` : 'VAST na 6s', 'score', await p.evaluate(()=>__air.score.join('-')));
}
function __dummy(x){return x}
console.log(errs);
await b.close();
