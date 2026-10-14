import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args:['--autoplay-policy=no-user-gesture-required']});
const p = await (await b.newContext({...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.addInitScript(()=>{ localStorage.setItem('app.cfg','{"seen":"9.99"}'); localStorage.setItem('pf.progress', JSON.stringify({unlocked:12,best:{},tips:{1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,11:1,12:1,wall:1}})); });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(500);
await p.mouse.click(5,300); await p.waitForTimeout(300);
const st = () => p.evaluate(()=>__sfx._state());
// sfx bank test
const t = await p.evaluate(()=>{ const r = __sfx._test(); const bad = Object.entries(r).filter(([k,v])=>v.nan||v.pk===0||v.pk>1.01); return {n:Object.keys(r).length, bad, slow:Object.entries(r).filter(([k,v])=>v.ms>150).map(([k,v])=>k+':'+v.ms)}; });
console.log('sfx', JSON.stringify(t));
await p.tap('#tilePf'); await p.waitForTimeout(300); await p.evaluate(()=>__pf.startLevel(1)); 
for (let i=0;i<8;i++){ await p.waitForTimeout(1000); const s=await st(); if (s.now) { console.log('pf after',i+1,'s', JSON.stringify(s)); break; } }
await p.evaluate(()=>__pf.startLevel(3)); await p.evaluate(()=>{ const L=__pf.L,P=__pf.P; P.x=L.arena.x0+6*16; P.y=150; P.inv=99; });
for (let i=0;i<8;i++){ await p.waitForTimeout(1000); const s=await st(); if (s.now==='pfBoss') { console.log('boss after',i+1,'s', JSON.stringify(s)); break; } if(i===7) console.log('boss?',JSON.stringify(s)); }
await p.evaluate(()=>window.appBack()); await p.waitForTimeout(1500); console.log('menu', JSON.stringify(await st()));
await p.tap('#tilePatience'); await p.waitForTimeout(4000); console.log('patience', JSON.stringify(await st()));
await p.evaluate(()=>window.appBack()); await p.waitForTimeout(500);
// music off setting
await p.click('#setBtn'); await p.waitForTimeout(300); await p.click('#setBody button[data-app="music"][data-val=\'"uit"\']'); await p.evaluate(()=>document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'))); await p.tap('#tileZs'); await p.waitForTimeout(2500); console.log('zs music off', JSON.stringify(await st()));
await p.evaluate(()=>window.appBack()); await p.waitForTimeout(300); await p.evaluate(()=>document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'))); await p.click('#setBtn'); await p.waitForTimeout(300); await p.click('#setBody button[data-app="music"][data-val=\'"zacht"\']'); await p.evaluate(()=>document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'))); await p.tap('#tileZs'); await p.waitForTimeout(5000); console.log('zs music on', JSON.stringify(await st()));
console.log(errs); await b.close();
