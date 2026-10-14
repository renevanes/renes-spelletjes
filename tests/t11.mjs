import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args:['--autoplay-policy=no-user-gesture-required']});
const errs=[];
for (const map of ['weide','woestijn','sneeuw','vulkaan']) {
  const p = await (await b.newContext({...devices['Pixel 7']})).newPage(); p.on('pageerror',e=>errs.push(map+': '+e.message)); p.on('console', m=>{ if(m.type()==='error') errs.push(map+' console: '+m.text()); });
  await p.addInitScript(m=>(localStorage.setItem('app.cfg','{"seen":"9.99"}'),localStorage.setItem('td.settings', JSON.stringify({map:m, diff:'normaal', waves:20, sound:true}))), map);
  await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname));
  if (map==='weide') { await p.tap('#aboutBtn'); await p.waitForTimeout(200); await p.screenshot({path:'about.png'}); await p.evaluate(()=>document.querySelector('#aboutModal .sheet').scrollTop=2000); await p.screenshot({path:'about2.png'}); await p.tap('#aboutModal [data-close]'); }
  await p.tap('#tileTd'); await p.waitForTimeout(300); await p.tap('#tdStartGo'); await p.waitForTimeout(200);
  // panel refresh test
  const r = await p.evaluate(async ()=>{ const TD=__td,S=TD.S; S.gold=60; let spot; for(let r=6;r<15&&!spot;r++) for(let c=0;c<9;c++){ const k=c+','+r; if(!TD.pathTiles.has(k)&&!TD.deco.has(k)&&!TD.neutral.has(k)){spot=[c,r];break;} }
    TD.build('pijl',...spot); const t=S.towers[0]; const T=TD.T, rc=document.querySelector('#tdCanvas').getBoundingClientRect(); return {x:rc.left+T.ox+(t.c+.5)*T.ts, y:rc.top+T.oy+(t.r+.5)*T.ts, nz:TD.neutral.size}; });
  await p.mouse.click(r.x, r.y); await p.waitForTimeout(100);
  const dis1 = await p.evaluate(()=>document.querySelector('#tdPanel [data-a="up"]').disabled);
  await p.evaluate(()=>{ __td.S.gold += 100; __td.startWave(); });  // hud() gets called
  await p.waitForTimeout(200);
  const dis2 = await p.evaluate(()=>document.querySelector('#tdPanel [data-a="up"]')?.disabled);
  await p.evaluate(()=>{ __td.S.gold=3000; });
  await p.waitForTimeout(1600);
  await p.screenshot({path:`nz_${map}.png`});
  console.log(map, 'neutral tiles', r.nz, 'upgrade disabled before/after', dis1, dis2);
  await p.close();
}
console.log(errs);
await b.close();
