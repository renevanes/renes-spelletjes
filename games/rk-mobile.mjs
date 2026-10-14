import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { appBrowser, appPage, appURL } from '../tests/browser-util.mjs';
// A real origin keeps the reload checks independent of Chromium's file-URL storage handling.
const html = await readFile(fileURLToPath(appURL));
const server = createServer((req,res)=>{
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser = await appBrowser();
try {
  const {page:p,context,errors} = await appPage(browser);
  await p.goto(`http://127.0.0.1:${server.address().port}/`);
  await p.locator('#tileRk').click();
  await p.locator('#rkPlayerCount').selectOption('6');
  await p.locator('#rkGoal').selectOption('domination');
  await p.locator('#rkCardMode').selectOption('fixed');
  await p.locator('#rkStart').click();
  const start=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  assert.deepEqual(start.rules,{goal:'domination',cards:'fixed'});
  assert.equal(await p.locator('#rkOwnership').getAttribute('aria-pressed'),'true');
  assert.match(await p.locator('#rkRound').innerText(),/70%/);
  assert.ok(await p.locator('#rk').evaluate(el=>el.classList.contains('rk-dock-collapsed')));
  await p.setViewportSize({width:915,height:412});
  await p.waitForTimeout(100);
  const railBox = await p.locator('#rkScoreboard').boundingBox(), zoomBox = await p.locator('#rkWorldView').boundingBox();
  assert.ok(railBox.y+railBox.height <= zoomBox.y, 'Six-player rail must leave the zoom controls clear');
  assert.ok(await p.locator('#rkScoreboard').evaluate(el=>el.scrollHeight>el.clientHeight),'All six players remain reachable by scrolling');
  await p.locator('#rkScoreboard').evaluate(el=>el.scrollTop=el.scrollHeight);
  assert.equal(await p.locator('#rkScoreboard .rk-score').count(),6);
  await p.setViewportSize({width:390,height:844});
  const own=start.territories.findIndex(t=>t.owner===0);
  await p.locator(`#rkMap [data-marker="${own}"]`).click();
  const total=Number(await p.locator('#rkAmount').inputValue());
  await p.locator('#rkAmountRange').fill('1');
  assert.equal(await p.locator('#rkAmount').inputValue(),'1');
  await p.locator('[data-action="more"]').click();
  assert.equal(Number(await p.locator('#rkAmountRange').inputValue()),Math.min(2,total));
  await p.locator('[data-action="all"]').click();
  await p.locator('#rkActionreinforce').click();
  assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')))).territories[own].armies,start.territories[own].armies+total);
  await p.locator('#rkDockToggle').click();
  assert.equal(await p.locator('#rkActionadvance').isVisible(),false);
  await p.locator('#rkDockToggle').click();
  const beforeReload = await p.evaluate(()=>localStorage.getItem('rk.save'));
  await p.locator('#rkBack').click();
  assert.equal(await p.evaluate(()=>localStorage.getItem('rk.save')),beforeReload);
  await p.reload();await p.locator('#tileRk').click();
  assert.equal(await p.evaluate(()=>localStorage.getItem('rk.save')),beforeReload,'Reload must retain the complete game, including rules, armies and RNG');
  assert.equal(await p.locator('#rkStartModal').isVisible(),false);

  // A blitz with one committed troop must leave all other troops in reserve.
  await p.evaluate(()=>{
    window.__noSave=true;
    const E=ReneRiskEngine,s=E.newGame([{name:'Rene'},{name:'CPU',ai:true}],7);
    s.phase='attack';s.pool=0;s.territories[0]={owner:0,armies:40};s.territories[1]={owner:1,armies:1000};
    localStorage.setItem('rk.save',JSON.stringify(s));
  });
  await p.reload();await p.locator('#tileRk').click();
  await p.locator('#rkMap [data-marker="0"]').click();await p.locator('#rkMap [data-marker="1"]').click();
  await p.locator('#rkCommitRange').fill('1');
  assert.equal(await p.locator('#rkCommitCount').innerText(),'1');
  await p.locator('#rkActionblitz').click();
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rk.save')).territories[0].armies===39);
  await p.waitForTimeout(250);
  assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')))).territories[0].armies,39);
  assert.equal(await p.locator('#rkActionstop').count(),0);
  await p.setViewportSize({width:915,height:412});
  await p.locator('#rkDockToggle').click();await p.waitForTimeout(100);
  assert.ok((await p.locator('#rkMap').boundingBox()).width>650,'Landscape board should fill most of the screen');
  await p.screenshot({path:'games/rk-mobile-landscape.png'});

  // Required card exchange is visible even when other controls are folded away.
  await p.locator('#rkBack').click();
  await p.evaluate(()=>{
    window.__noSave=true;const E=ReneRiskEngine,s=E.newGame([{name:'Rene'},{name:'CPU',ai:true}],11,{cards:'fixed',goal:'domination'});
    const cards=[0,1,2,3,4];s.players[0].cards=cards;s.deck=s.deck.filter(c=>!cards.includes(c));
    localStorage.setItem('rk.save',JSON.stringify(s));
  });
  await p.reload();await p.locator('#tileRk').click();
  assert.equal(await p.locator('#rkDockToggle').getAttribute('aria-expanded'),'true');
  assert.equal(await p.locator('.rk-card-hand').evaluate(el=>el.open),true);
  assert.equal(await p.locator('#rkActiontrade').isEnabled(),true);
  const pool=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')).pool);
  await p.locator('#rkActiontrade').click();
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')).pool),pool+10);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')).players[0].cards.length),2);
  assert.deepEqual(errors,[]);await context.close();
  console.log('Risk mobile: direct troop sliders, reserves, fair blitz, fixed cards, short mode, folding and resume passed');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
