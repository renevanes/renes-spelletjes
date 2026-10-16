import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {appBrowser,appPage,appURL} from '../tests/browser-util.mjs';
const html=await readFile(fileURLToPath(appURL));
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await appBrowser();
try {
  const {page:p,context,errors}=await appPage(browser);
  await p.goto(`http://127.0.0.1:${server.address().port}/`);
  const touch=await context.newCDPSession(p);
  const saved=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  async function menu(){if(await p.locator('#rkInspector').isVisible())await p.locator('#rkCloseInspector').click();await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();}
  async function fixture(fn){await menu();await p.evaluate(fn);await p.reload();await p.locator('#tileRk').click();}
  async function point(id){return p.locator(`#rkMap [data-marker="${id}"]`).evaluate(el=>{const p=new DOMPoint(0,0).matrixTransform(el.getScreenCTM());return{x:p.x,y:p.y};});}
  async function tapCountry(id,offset=0){const pt=await point(id),box=await p.locator('#rkMapViewport').boundingBox();assert.ok(pt.x>=box.x&&pt.x<=box.x+box.width&&pt.y>=box.y&&pt.y<=box.y+box.height,`Country ${id} must be reachable on the actual map`);await p.touchscreen.tap(pt.x+offset,pt.y);}
  async function drag(from,to){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});await p.waitForTimeout(40);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  async function free(id){
    const hit=await p.locator(id).evaluate(el=>{
      const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {ok:r.width>=44&&r.height>=44&&el.contains(top),rect:r.toJSON(),top:top?.id||top?.className,viewport:[innerWidth,innerHeight]};
    });
    assert.ok(hit.ok,`${id} must be a large, directly reachable action without scrolling: ${JSON.stringify(hit)}`);
  }
  async function narrowFits(){assert.ok(await p.locator('#rk').evaluate(el=>el.scrollWidth<=el.clientWidth),'All controls fit the phone width');}
  async function phaseFits(){
    const fit=await p.locator('#rkContextHeading .rk-focus-phase').evaluate(el=>{
      const r=el.getBoundingClientRect(),header=el.parentElement.getBoundingClientRect();
      return {text:el.textContent,font:getComputedStyle(el).fontFamily,width:el.clientWidth,scrollWidth:el.scrollWidth,rect:r.toJSON(),header:header.toJSON(),viewport:[innerWidth,innerHeight]};
    });
    assert.ok(fit.width>0&&fit.scrollWidth<=fit.width+1&&fit.rect.left>=fit.header.left-1&&fit.rect.right<=fit.header.right+1,`The full phase remains readable inside its action header: ${JSON.stringify(fit)}`);
  }
  async function broadPhaseFits(){
    const badge=p.locator('#rkContextHeading .rk-focus-phase');
    const original=await badge.evaluate(el=>{const original=el.style.fontFamily;el.style.fontFamily='"DejaVu Sans", sans-serif';return original;});
    try {await phaseFits();}
    finally {await badge.evaluate((el,font)=>el.style.fontFamily=font,original);}
  }
  async function mapRoom(focused=false){
    const layout=await p.locator('#rkMapViewport').evaluate(el=>{
      const r=el.getBoundingClientRect(),screen=document.getElementById('rk').getBoundingClientRect();
      return {fraction:r.width*r.height/(screen.width*screen.height),portrait:screen.height>screen.width,viewport:[screen.width,screen.height]};
    });
    const minimum=layout.portrait ? .75 : focused ? .60 : .70;
    assert.ok(layout.fraction>=minimum,`The world retains ${minimum*100}% of the screen${focused?' during an action':''}: ${JSON.stringify(layout)}`);
    assert.ok(await p.locator('#rkInspector').isHidden(),'A map interaction never opens a detail window automatically');
    if(focused){await phaseFits();if(await p.evaluate(()=>innerWidth===320&&document.documentElement.classList.contains('big-text')))await broadPhaseFits();}
  }

  await p.locator('#tileRk').click();assert.ok(await p.locator('#rkAutoAdvance').isChecked(),'Automatic advance starts enabled in the lobby');assert.ok(await p.locator('#rkAutoEndTurn').isChecked(),'Automatic turn completion starts enabled independently');await p.locator('#rkPlayerCount').selectOption('6');await p.locator('#rkGoal').selectOption('domination');await p.locator('#rkCardMode').selectOption('fixed');await p.locator('#rkStart').click();
  const initial=await saved();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoAdvance),true);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoEndTurn),true);assert.deepEqual(initial.rules,{goal:'domination',cards:'fixed',dice:'balanced',setup:'auto'});
  assert.equal(await p.locator('#rkOwnership').getAttribute('aria-pressed'),'true');assert.match(await p.locator('#rkRound').innerText(),/70%/);
  assert.equal(await p.locator('#rkControls').isVisible(),false,'The world starts without an action form');
  await p.setViewportSize({width:915,height:412});await p.waitForTimeout(80);
  await mapRoom();assert.ok(await p.locator('#rkScoreboard').isHidden(),'Player details leave the map unobstructed until requested');
  await free('#rkDockToggle');await p.locator('#rkDockToggle').click();
  assert.ok(await p.locator('#rkInspector').isVisible());assert.equal(await p.locator('#rkScoreboard .rk-score').count(),6);
  assert.ok(await p.locator('#rkInspector').evaluate(el=>el.getBoundingClientRect().height<=innerHeight*.5+1),'The requested details leave at least half of the landscape map visible');
  await p.locator('#rkCloseInspector').click();
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(50);
  const own=initial.territories.findIndex(t=>t.owner===0),other=initial.territories.findIndex((t,i)=>t.owner===0&&i!==own);
  await tapCountry(own);assert.match(await p.locator('#rkContextHeading .rk-focus-phase').innerText(),/Fase 1\/3.*Versterken/i);assert.ok(parseInt(await p.locator('#rkZoomLabel').innerText())>100,'Choosing a country focuses the action');
  for(const [width,height,big] of [[320,844,true],[390,844,false],[915,412,true]]){await p.setViewportSize({width,height});await p.evaluate(big=>document.documentElement.classList.toggle('big-text',big),big);await mapRoom(true);await free('#rkActionreinforce');}
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.documentElement.classList.remove('big-text'));
  await free('#rkActionreinforce');await free('[data-action="all"]');await p.locator('#rkAmountRange').fill('1');assert.equal(await p.locator('#rkAmount').inputValue(),'1');
  assert.deepEqual(await saved(),initial,'Deployment is only a preview until confirmed');
  await p.locator('#rkActioncancel').click();assert.deepEqual(await saved(),initial);assert.equal(await p.locator('#rkZoomLabel').innerText(),'100%','Cancel restores the original camera');
  await tapCountry(own);assert.equal(await p.evaluate(()=>window.appBack()),true);assert.equal(await p.locator('#rkControls').isVisible(),false,'Android Back cancels the preview before leaving');assert.ok(await p.locator('#rk').evaluate(el=>el.classList.contains('active')));assert.deepEqual(await saved(),initial);
  // A real finger drag from the reserve also previews, rather than silently committing all troops.
  const pool=await p.locator('#rkPool').boundingBox();await drag({x:pool.x+pool.width/2,y:pool.y+pool.height/2},await point(own));
  assert.equal(await p.locator('#rkActionreinforce').isVisible(),true);assert.deepEqual(await saved(),initial);
  await p.locator('#rkAmountRange').fill('1');await p.locator('[data-action="more"]').click();assert.equal(Number(await p.locator('#rkAmount').inputValue()),2);
  await p.locator('[data-action="less"]').click();await p.locator('#rkActionreinforce').click();
  let s=await saved();assert.equal(s.territories[own].armies,initial.territories[own].armies+1);assert.equal(s.pool,initial.pool-1);assert.equal(s.phase,'reinforce','A partial placement stays in the reinforcement phase');
  await tapCountry(other);await p.locator('[data-action="all"]').click();
  const confirmRect=await p.locator('#rkActionreinforce').boundingBox(),confirmPoint={x:confirmRect.x+confirmRect.width/2,y:confirmRect.y+confirmRect.height/2};
  await p.touchscreen.tap(confirmPoint.x,confirmPoint.y);
  const firstTap=await p.evaluate(pt=>({save:JSON.parse(localStorage.getItem('rk.save')),under:document.elementFromPoint(pt.x,pt.y)?.closest('button')?.id,nextDisabled:document.getElementById('rkNext').disabled,mapNextDisabled:document.getElementById('rkMapNext').disabled}),confirmPoint);
  await p.touchscreen.tap(confirmPoint.x,confirmPoint.y);
  assert.equal(firstTap.under,'rkNext','The second physical tap covers the newly exposed phase button');
  assert.ok(firstTap.nextDisabled&&firstTap.mapNextDisabled,'Both phase controls briefly protect the automatic transition');
  assert.equal(firstTap.save.phase,'attack');assert.deepEqual(await saved(),firstTap.save,'A rapid second tap at the placement position cannot skip attack or change the saved dice state');
  s=await saved();assert.equal(s.pool,0);assert.equal(s.phase,'attack','The last human placement advances to attack without another tap');assert.equal(s.rng,initial.rng,'Advancing phases never rolls the dice');assert.match(await p.locator('#rkPhase').innerText(),/Fase 2\/3.*Aanvallen/i);assert.equal(s.territories[other].armies,initial.territories[other].armies+initial.pool-1);await p.waitForFunction(()=>!document.getElementById('rkNext').disabled);
  await free('#rkNext');await p.locator('#rkNext').click();
  s=await saved();assert.equal(s.phase,'fortify','A deliberate phase action works again after the brief tap guard');assert.equal(s.rng,firstTap.save.rng);
  const beforeReload=s;await menu();await p.reload();await p.locator('#tileRk').click();assert.deepEqual(await saved(),beforeReload);

  // A stack can be dragged directly from the world overview, without a preparatory source tap.
  await fixture(()=>{window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'Nova',ai:true}],7);s.phase='attack';s.pool=0;s.territories[0]={owner:0,armies:40};s.territories[1]={owner:1,armies:1000};localStorage.setItem('rk.save',JSON.stringify(s));});
  await p.setViewportSize({width:915,height:412});await p.waitForTimeout(50);const preBattle=await saved();await tapCountry(0,12);
  assert.equal(await p.locator('#rkFrom').inputValue(),'0','A generous marker hit still selects the intended source');
  await p.locator('#rkClearSelection').click();const originZoom=await p.locator('#rkZoomLabel').innerText();
  assert.equal(originZoom,'100%');await drag(await point(0),await point(1));
  assert.equal(await p.locator('#rkFrom').inputValue(),'0');assert.equal(await p.locator('#rkTarget').inputValue(),'1');
  assert.ok(await p.locator('#rkTargetChoices').isHidden(),'Dragging opens the battle without a destination panel');
  await free('#rkActionblitz');assert.match(await p.locator('#rkContextHeading .rk-focus-phase').innerText(),/Fase 2\/3.*Aanvallen/i);assert.ok(await p.locator('#rkActors .rk-avatar').evaluateAll(nodes=>nodes.every(el=>!el.getClientRects().length)),'Battle actors keep their names and counts without map-covering portraits');assert.equal(await p.locator('#rkNext').isVisible(),false,'An active battle cannot accidentally skip the phase');
  for(const [width,height,big] of [[320,844,true],[390,844,false],[915,412,true]]){await p.setViewportSize({width,height});await p.evaluate(big=>document.documentElement.classList.toggle('big-text',big),big);await narrowFits();await mapRoom(true);await free('[data-action="previousDice"]');await free('[data-action="nextDice"]');await free('#rkActionblitz');}
  await p.evaluate(()=>document.documentElement.classList.remove('big-text'));
  assert.deepEqual(await saved(),preBattle);await p.locator('#rkCommitRange').fill('1');assert.match(await p.locator('#rkReserve').innerText(),/39 blijven achter/);
  await p.locator('[data-action="nextDice"]').click();assert.ok(await p.locator('#rkActionattack').isVisible());await p.locator('[data-action="previousDice"]').click();assert.ok(await p.locator('#rkActionblitz').isVisible());assert.deepEqual(await saved(),preBattle);
  await p.locator('#rkActionblitz').click();s=await saved();assert.equal(s.territories[0].armies,39);assert.match(await p.locator('.rk-result').innerText(),/Jij −1/);
  await p.locator('#rkActioncancel').click();assert.equal(await p.locator('#rkZoomLabel').innerText(),originZoom);if(await p.locator('#rkClearSelection').isVisible())await p.locator('#rkClearSelection').click();assert.equal(await p.locator('#rkZoomLabel').innerText(),'100%');

  // Conquest, resume halfway through occupation, one-tap continuation, then a single fortification.
  await fixture(()=>{window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'Nova',ai:true},{name:'Atlas',ai:true}],23,{dice:'balanced'});s.phase='attack';s.pool=0;s.territories[0]={owner:0,armies:40};s.territories[1]={owner:1,armies:3};s.territories[2]={owner:1,armies:1};localStorage.setItem('rk.save',JSON.stringify(s));});
  await tapCountry(0);await tapCountry(1);await free('#rkActionblitz');await p.locator('#rkActionblitz').click();
  const captured=await saved();assert.match(await p.locator('#rkContextHeading .rk-focus-phase').innerText(),/Fase 2\/3.*Bezetten/i);assert.ok(captured.pending);assert.ok(await p.locator('#rkActionoccupy').isVisible());
  await p.locator('#rkAmountRange').fill(String(captured.pending.min));
  assert.equal(Number(await p.locator('#rkToCount').innerText()),captured.pending.min);assert.deepEqual(await saved(),captured,'Changing occupation never moves troops early');
  await menu();await p.reload();await p.locator('#tileRk').click();assert.deepEqual(await saved(),captured);assert.ok((await p.locator('#rkBattleRoute').getAttribute('d')).length>0,'Resuming a capture restores its map route');
  for(const [width,height,big] of [[320,844,true],[390,844,false],[915,412,true]]){await p.setViewportSize({width,height});await p.evaluate(big=>document.documentElement.classList.toggle('big-text',big),big);await narrowFits();await mapRoom(true);await free('#rkActionoccupy');await free('[data-action="all"]');await free('[data-action="less"]');await free('[data-action="more"]');}
  await p.evaluate(()=>document.documentElement.classList.remove('big-text'));await p.locator('[data-action="all"]').click();
  const remain=Number(await p.locator('#rkFromCount').innerText()),arrive=Number(await p.locator('#rkToCount').innerText());assert.ok(remain>=1);assert.equal(arrive+remain,captured.territories[0].armies+captured.territories[1].armies);assert.equal(await p.locator('#rkMap [data-marker="0"] .rk-preview-armies').textContent(),String(remain));
  await p.locator('#rkActionoccupy').click();s=await saved();assert.equal(s.phase,'attack','Occupation never completes the turn automatically');assert.equal(s.current,captured.current);assert.equal(s.turn,captured.turn);assert.equal(s.territories[0].armies,remain);assert.equal(s.territories[1].armies,arrive);assert.ok(await p.locator('#rkHand').evaluate(el=>el.classList.contains('rk-card-earned')));
  await tapCountry(2);assert.equal(await p.locator('#rk').getAttribute('data-interaction'),'attack','The captured stack attacks the next country with one tap');assert.equal(await p.locator('#rkFrom').inputValue(),'1');await p.locator('#rkActioncancel').click();
  await p.locator('#rkPause').click();await p.locator('#rkPauseAutoEndTurn').uncheck();assert.ok(await p.locator('#rkPauseAutoAdvance').isChecked(),'Turn completion and reinforcement preferences remain independent');await p.locator('#rkContinue').click();
  await p.locator('#rkNext').click();await tapCountry(1);await tapCountry(0);const preFortify=await saved();assert.match(await p.locator('#rkContextHeading .rk-focus-phase').innerText(),/Fase 3\/3.*Verplaatsen/i);
  for(const [width,height,big] of [[320,844,true],[390,844,false],[915,412,true]]){await p.setViewportSize({width,height});await p.evaluate(big=>document.documentElement.classList.toggle('big-text',big),big);await mapRoom(true);await free('#rkActionfortify');}
  await p.evaluate(()=>document.documentElement.classList.remove('big-text'));await p.locator('#rkAmountRange').fill('2');assert.deepEqual(await saved(),preFortify);
  await p.locator('#rkActioncancel').click();assert.deepEqual(await saved(),preFortify,'Cancelling a transfer does not use the fortification');
  await tapCountry(1);await tapCountry(0);await p.locator('#rkAmountRange').fill('2');const from=Number(await p.locator('#rkFromCount').innerText()),to=Number(await p.locator('#rkToCount').innerText());await free('#rkActionfortify');await p.locator('#rkActionfortify').click();s=await saved();assert.equal(s.territories[1].armies,from);assert.equal(s.territories[0].armies,to);assert.equal(s.fortified,true);
  await tapCountry(1);assert.equal(await p.locator('#rkActionfortify').count(),0,'A used fortification cannot open a second move');
  await free('#rkUndoPlacement');await p.locator('#rkUndoPlacement').click();assert.deepEqual(await saved(),preFortify,'Undo restores the exact state before the fortification');
  await drag(await point(1),await point(0));assert.deepEqual(await saved(),preFortify,'A direct fortification drag only previews the transfer');await p.locator('#rkAmountRange').fill('2');await p.locator('#rkActionfortify').click();assert.equal((await saved()).fortified,true,'Undo makes the single transfer available again');
  await p.locator('#rkNext').click();assert.ok(await p.locator('#rkUndoPlacement').isHidden());assert.equal((await saved()).players[0].cards.length,1);

  // Forced trading is a readable card dialog, with no phase shortcut around it.
  await fixture(()=>{window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'CPU',ai:true}],11,{cards:'fixed',goal:'domination'});s.players[0].cards=[0,1,2,3,4];s.deck=s.deck.filter(c=>![0,1,2,3,4].includes(c));localStorage.setItem('rk.save',JSON.stringify(s));});
  assert.ok(await p.locator('#rkInspector').isVisible());assert.equal(await p.locator('.rk-cards button').count(),5);
  const chosen=await p.locator('.rk-cards button[aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.id));
  for (const id of chosen) await p.locator('#'+id).click();
  assert.equal(await p.locator('.rk-cards button[aria-pressed="true"]').count(),0,'Players can clear the suggested set');assert.ok(await p.locator('#rkActiontrade').isDisabled());
  for (const id of chosen) await p.locator('#'+id).click();
  await free('#rkActiontrade');const poolBefore=(await saved()).pool;await p.locator('#rkActiontrade').click();assert.equal((await saved()).pool,poolBefore+10);assert.equal((await saved()).players[0].cards.length,2);
  assert.equal(await p.locator('#rkInspector').isVisible(),false);

  // Manual setup and capitals retain the same touch-to-preview-to-confirm interaction.
  await fixture(()=>{window.__noSave=true;localStorage.setItem('rk.save',JSON.stringify(ReneRiskEngine.newGame([{name:'Rene'},{name:'CPU',ai:true}],31,{setup:'manual',goal:'capital',dice:'balanced'})));});
  assert.match(await p.locator('#rkPhase').innerText(),/Voorbereiding.*Startlegers/i);s=await saved();const startCountry=s.territories.findIndex(t=>t.owner===0);await tapCountry(startCountry);await free('#rkActionreinforce');await p.locator('#rkActionreinforce').click();const deployed=await saved();assert.equal(deployed.phase,'deploy','Placing a manual starting batch never skips the setup handoff');assert.equal(deployed.current,0);assert.equal(deployed.pool,0);await menu();await p.reload();await p.locator('#tileRk').click();assert.deepEqual(await saved(),deployed);assert.ok(await p.locator('#rkNext').isEnabled());
  await fixture(()=>{window.__noSave=true;localStorage.setItem('rk.save',JSON.stringify(ReneRiskEngine.newGame([{name:'Rene'},{name:'CPU',ai:true}],41,{goal:'capital',dice:'balanced'})));});
  s=await saved();const capital=s.territories.findIndex(t=>t.owner===0);await tapCountry(capital);await free('#rkActioncapital');await p.locator('#rkActioncapital').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rk.save')).phase==='reinforce');assert.equal(await p.locator('#rkMap .rk-capital').evaluateAll(nodes=>nodes.filter(n=>n.textContent==='♛').length),2);assert.ok((await saved()).pool>=5);

  // A lone garrison cannot open an attack. Cards remain accessible outside reinforcement.
  await fixture(()=>{window.__noSave=true;const s=ReneRiskEngine.newGame([{name:'Rene'},{name:'Nova',ai:true}],43);s.phase='attack';s.pool=0;s.territories[0]={owner:0,armies:1};s.territories[1]={owner:1,armies:1000};s.players[0].cards=[0,1,2];s.deck=s.deck.filter(c=>![0,1,2].includes(c));localStorage.setItem('rk.save',JSON.stringify(s));});
  const guarded=await saved();await tapCountry(0);assert.equal(await p.locator('#rkActionblitz').count(),0);assert.deepEqual(await saved(),guarded);await p.locator('#rkHand').click();assert.ok(await p.locator('#rkInspector').isVisible());assert.equal(await p.locator('.rk-cards button').count(),3);assert.equal(await p.locator('#rkActiontrade').count(),0);await p.keyboard.press('Escape');assert.equal(await p.locator('#rkInspector').isVisible(),false);
  await p.locator('#rkHand').click();assert.equal(await p.evaluate(()=>window.appBack()),true);assert.equal(await p.locator('#rkInspector').isVisible(),false,'Android Back closes the card overview before leaving');assert.ok(await p.locator('#rk').evaluate(el=>el.classList.contains('active')));

  // A pass-and-play handoff must contain neither cards nor a secret mission in the DOM.
  await fixture(()=>{window.__noSave=true;localStorage.setItem('rk.save',JSON.stringify(ReneRiskEngine.newGame([{name:'Rene'},{name:'Medespeler'}],51,{goal:'mission'})));});
  await p.locator('#rkHandoffModal.show').waitFor();assert.equal(await p.locator('.rk-mission').count(),0);assert.equal(await p.locator('[data-card]').count(),0);
  await p.locator('#rkBeginTurn').click();await p.locator('#rkDockToggle').click();await p.locator('.rk-mission summary').click();assert.equal(await p.locator('.rk-mission p').innerText(),await p.evaluate(()=>ReneRiskEngine.mission(JSON.parse(localStorage.getItem('rk.save'))).text));
  await menu();await p.reload();await p.locator('#tileRk').click();assert.equal(await p.locator('.rk-mission').count(),0);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: rapid repeated placement taps cannot skip attack; map-first touch layouts and compact requested details; direct army dragging; previews/cancellation/camera restore; dice modes; resumed conquest; one-tap attack chains; fortification/cards; narrow large-text controls; setup/capitals/private handoffs');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
