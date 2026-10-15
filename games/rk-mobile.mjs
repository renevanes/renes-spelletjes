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
  assert.deepEqual(start.rules,{goal:'domination',cards:'fixed',dice:'balanced',setup:'auto'});
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
  assert.match(await p.locator('#rkReserve').innerText(),/39 blijven achter/);
  await p.locator('#rkActionblitz').click();
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rk.save')).territories[0].armies===39);
  await p.waitForTimeout(250);
  assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')))).territories[0].armies,39);
  assert.equal(await p.locator('#rkActionstop').count(),0);
  assert.match(await p.locator('.rk-result').innerText(),/Jij −1/);
  await p.setViewportSize({width:915,height:412});
  await p.locator('#rkDockToggle').click();await p.waitForTimeout(100);
  assert.ok((await p.locator('#rkMap').boundingBox()).width>650,'Landscape board should fill most of the screen');
  await p.screenshot({path:'games/rk-mobile-landscape.png'});

  // Dragging the reserve directly onto the map places troops once; a cancelled drag does nothing.
  await p.locator('#rkBack').click();
  await p.evaluate(()=>{
    window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'Nova',ai:true},{name:'Atlas',ai:true}],23,{dice:'balanced'});
    s.territories[0]={owner:0,armies:30};s.territories[1]={owner:1,armies:12};
    localStorage.setItem('rk.save',JSON.stringify(s));
  });
  await p.reload();await p.locator('#tileRk').click();
  const draft=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  const poolBox=await p.locator('#rkPool').boundingBox();
  await p.mouse.move(poolBox.x+poolBox.width/2,poolBox.y+poolBox.height/2);await p.mouse.down();
  await p.mouse.move(10,400,{steps:8});await p.mouse.up();
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save'))),draft);
  const marker=await p.locator('#rkMap [data-marker="0"]').boundingBox();
  const touch=await context.newCDPSession(p);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:poolBox.x+poolBox.width/2,y:poolBox.y+poolBox.height/2,id:1}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:marker.x+marker.width/2,y:marker.y+marker.height/2,id:1}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const placed=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  assert.equal(placed.territories[0].armies,draft.territories[0].armies+draft.pool);
  assert.equal(placed.pool,0);assert.ok(await p.locator('#rkNext').isEnabled());
  await p.locator('#rkNext').click();
  await p.locator('#rkMap [data-marker="0"]').click();await p.locator('#rkMap [data-marker="1"]').click();
  // The main battle button is reachable without scrolling in landscape.
  assert.ok(await p.locator('#rkActionblitz').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  const preview=await p.evaluate(()=>localStorage.getItem('rk.save'));
  await p.locator('[data-action="focus"]').click();
  assert.equal(await p.evaluate(()=>localStorage.getItem('rk.save')),preview,'Looking at a battle does not roll dice');
  await p.locator('#rkWorldView').click();await p.locator('#rkActionblitz').click();
  const captured=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  assert.ok(captured.pending);
  const occupy=Math.min(captured.pending.max,captured.pending.min+1);
  await p.locator('#rkAmountRange').fill(String(occupy));
  const remain=Number(await p.locator('#rkFromCount').innerText()),arrive=Number(await p.locator('#rkToCount').innerText());
  assert.equal(arrive,occupy);assert.ok(remain>=1);
  assert.equal(remain+arrive,captured.territories[0].armies+captured.territories[1].armies,'The preview conserves troops already moved by conquest');
  assert.equal(await p.locator('#rkMap [data-marker="0"] .rk-preview-armies').textContent(),String(remain));
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save'))),captured,'The slider previews without saving the move');
  await p.setViewportSize({width:390,height:844});
  await p.locator('#rkActionoccupy').click();
  const occupied=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  assert.equal(occupied.territories[0].armies,remain);assert.equal(occupied.territories[1].armies,arrive);
  await p.setViewportSize({width:320,height:844});
  await p.evaluate(()=>document.documentElement.classList.add('big-text'));
  assert.ok(await p.locator('#rkFeedback').isVisible());
  assert.ok(await p.locator('#rk').evaluate(el=>el.scrollWidth<=el.clientWidth),'An active conquest notification must fit the narrow screen with large text');
  await p.evaluate(()=>document.documentElement.classList.remove('big-text'));
  await p.setViewportSize({width:390,height:844});
  assert.equal(await p.locator('#rkFrom').inputValue(),'1','The captured country becomes the next attacking country');
  assert.ok(await p.locator('#rkHand').evaluate(el=>el.classList.contains('rk-card-earned')));
  await p.locator('#rkNext').click();
  await p.setViewportSize({width:915,height:412});await p.locator('#rkWorldView').click();
  await p.locator('#rkMap [data-marker="1"]').click();
  await p.locator('#rkMap [data-marker="0"]').click();
  await p.locator('#rkAmountRange').fill('2');
  const fortifiedFrom=Number(await p.locator('#rkFromCount').innerText()),fortifiedTo=Number(await p.locator('#rkToCount').innerText());
  await p.locator('#rkActionfortify').click();
  const fortified=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  assert.equal(fortified.territories[1].armies,fortifiedFrom);assert.equal(fortified.territories[0].armies,fortifiedTo);assert.ok(fortified.fortified);
  await p.locator('#rkNext').click();
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')).players[0].cards.length),1,'A conquest earns one card when the turn ends');

  // A depleted attacking country has zero usable troops; cards remain viewable outside drafting.
  await p.locator('#rkBack').click();
  await p.evaluate(()=>{
    window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'Nova',ai:true}],43);
    s.phase='attack';s.pool=0;s.territories[0]={owner:0,armies:1};s.territories[1]={owner:1,armies:1000};
    s.players[0].cards=[0,1,2];s.deck=s.deck.filter(c=>![0,1,2].includes(c));localStorage.setItem('rk.save',JSON.stringify(s));
  });
  await p.reload();await p.locator('#tileRk').click();await p.locator('#rkMap [data-marker="0"]').click();await p.locator('#rkMap [data-marker="1"]').click();
  assert.equal(await p.locator('#rkChance').innerText(),'0%');assert.equal(await p.locator('#rkFromCount').innerText(),'0');assert.ok(await p.locator('#rkActionblitz').isDisabled());
  const cardView=await p.evaluate(()=>localStorage.getItem('rk.save'));
  await p.locator('#rkHand').click();assert.ok(await p.locator('.rk-card-hand').evaluate(el=>el.open));
  assert.equal(await p.locator('.rk-cards button').count(),3);assert.equal(await p.locator('#rkActiontrade').count(),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('rk.save')),cardView);

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
  // Resume during manual deployment without granting extra starting armies.
  await p.locator('#rkBack').click();
  await p.evaluate(()=>{
    window.__noSave=true; const E=ReneRiskEngine,s=E.newGame([{name:'Rene'},{name:'CPU',ai:true}],31,{setup:'manual',goal:'capital',dice:'balanced'});
    localStorage.setItem('rk.save',JSON.stringify(s));
  });
  await p.reload();await p.locator('#tileRk').click();
  assert.match(await p.locator('#rkControls').innerText(),/Startlegers plaatsen/);
  const starting=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  const startCountry=starting.territories.findIndex(t=>t.owner===0);
  await p.locator('#rkFrom').selectOption(String(startCountry));
  await p.locator('#rkActionreinforce').click();
  const deployed=await p.evaluate(()=>localStorage.getItem('rk.save'));
  await p.locator('#rkBack').click();await p.reload();await p.locator('#tileRk').click();
  assert.equal(await p.evaluate(()=>localStorage.getItem('rk.save')),deployed);
  assert.ok(await p.locator('#rkActionadvance').isEnabled());

  // Choose a capital, finish the opening with AI, and see its crown and bonus.
  await p.locator('#rkBack').click();
  await p.evaluate(()=>{
    window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'CPU',ai:true}],41,{goal:'capital',dice:'balanced'});
    localStorage.setItem('rk.save',JSON.stringify(s));
  });
  await p.reload();await p.locator('#tileRk').click();
  const firstCapital=await p.evaluate(()=>ReneRiskEngine.owned(JSON.parse(localStorage.getItem('rk.save')))[0]);
  await p.locator('#rkFrom').selectOption(String(firstCapital));await p.locator('#rkActioncapital').click();
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rk.save')).phase==='reinforce');
  assert.equal(await p.locator('#rkMap .rk-capital').evaluateAll(nodes=>nodes.filter(n=>n.textContent==='♛').length),2);
  const capitalState=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  assert.ok(capitalState.pool>=5);

  // Hidden missions must be absent from the DOM until a local player opens their turn.
  await p.locator('#rkBack').click();
  await p.evaluate(()=>{
    window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'Medespeler'}],51,{goal:'mission'});
    localStorage.setItem('rk.save',JSON.stringify(s));
  });
  await p.reload();await p.locator('#tileRk').click();
  await p.locator('#rkHandoffModal.show').waitFor();
  assert.equal(await p.locator('.rk-mission').count(),0);
  await p.locator('#rkBeginTurn').click();await p.locator('.rk-mission summary').click();
  assert.equal(await p.locator('.rk-mission p').innerText(),await p.evaluate(()=>ReneRiskEngine.mission(JSON.parse(localStorage.getItem('rk.save'))).text));
  assert.ok(await p.locator('.rk-mission p').isVisible());
  await p.locator('#rkBack').click();await p.reload();await p.locator('#tileRk').click();
  assert.equal(await p.locator('.rk-mission').count(),0);
  assert.deepEqual(errors,[]);await context.close();
  console.log('Risk mobile: touch-drag deployment, combat/occupation/fortify previews, phase controls, cards, capitals, manual setup, hidden missions, six players and resume passed');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
