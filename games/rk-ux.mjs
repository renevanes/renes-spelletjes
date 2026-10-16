import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {appBrowser,appPage,appURL} from '../tests/browser-util.mjs';

const html=await readFile(fileURLToPath(appURL));
const server=createServer((req,res)=>{
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await appBrowser();
try {
  const {page:p,errors}=await appPage(browser);
  await p.addInitScript(()=>window.addEventListener('error',event=>console.error(event.message)));
  await p.goto(`http://127.0.0.1:${server.address().port}/`);
  const saved=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('rk.save')));
  async function tap(selector){
    if(selector==='#rkNext'||selector==='#rkMapNext')await p.waitForFunction(selector=>!document.querySelector(selector).disabled,selector);
    const el=p.locator(selector);
    const hit=await el.evaluate(el=>{
      const r=el.getBoundingClientRect();
      const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {ok:r.width>=44&&r.height>=44&&el.contains(top),rect:r.toJSON(),top:top?.id||top?.className,viewport:[innerWidth,innerHeight]};
    });
    assert.ok(hit.ok,`${selector} must be a directly reachable touch target: ${JSON.stringify(hit)}`);
    const r=await el.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
  }
  async function autoAdvance(enabled){
    await p.locator('#rkPause').click();await p.locator('#rkPauseAutoAdvance').setChecked(enabled);
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoAdvance),enabled,'The pause option persists immediately');
    await p.locator('#rkContinue').click();
  }
  async function autoEndTurn(enabled){
    await p.locator('#rkPause').click();await p.locator('#rkPauseAutoEndTurn').setChecked(enabled);
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoEndTurn),enabled,'The turn-completion preference persists immediately');
    await p.locator('#rkContinue').click();
  }
  async function recordSaves(){await p.evaluate(()=>{
    window.__rkWrites=[];const write=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='rk.save')window.__rkWrites.push(JSON.parse(value));return write.call(this,key,value);};
  });}
  async function fixture(kind='reinforce'){
    if(await p.locator('#rk').evaluate(el=>el.classList.contains('active'))){
      if(await p.locator('#rkInspector').isVisible())await p.locator('#rkCloseInspector').click();
      await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();
    }
    await p.evaluate(kind=>{
      window.__noSave=true;
      const E=ReneRiskEngine,s=E.newGame(kind==='auto-human'?[{name:'Rene'},{name:'Medespeler'}]:[{name:'Rene'},{name:'Nova',ai:true},{name:'Atlas',ai:true}],23,kind==='manual'?{setup:'manual'}:['mission-win','fortify-win','auto-human'].includes(kind)?{goal:'mission'}:{});
      if(kind==='manual'){localStorage.setItem('rk.save',JSON.stringify(s));return;}
      s.territories=s.territories.map(()=>({owner:0,armies:3}));
      s.territories[1]={owner:1,armies:3};s.territories[E.byId.eastaus]={owner:2,armies:3};
      s.territories[0].armies=40;s.pool=4;
      if(kind==='attack'){
        s.phase='attack';s.pool=0;s.territories[1].owner=0;
        s.territories[E.byId.kamchatka]={owner:1,armies:2};s.territories[E.byId.japan].armies=1;
      } else if(['fortify','auto-ai'].includes(kind)){
        s.phase='fortify';s.pool=0;s.territories=s.territories.map(()=>({owner:1,armies:2}));
        s.territories[0]={owner:0,armies:12};s.territories[3]={owner:0,armies:1};s.territories[E.byId.eastaus]={owner:2,armies:3};
      } else if(kind==='no-attack'){
        s.phase='attack';s.pool=0;s.territories.forEach(t=>{if(t.owner===0)t.armies=1;});
      }
      if(['required','resume-ready','resume-required'].includes(kind)){
        const count=kind==='resume-required'?6:5;
        s.players[0].cards=Array.from({length:count},(_,i)=>i);s.deck=s.deck.filter(c=>!s.players[0].cards.includes(c));
        s.resumeAttack=kind!=='required';s.pool=1;
      }
      if(kind==='empty-reinforce')s.pool=0;
      if(kind==='mission-win'){
        s.territories=s.territories.map((t,i)=>({owner:i<18?0:i===41?2:1,armies:i>0&&i<18?2:1}));
        s.missions=['garrisons','territories','asia-africa'];s.pool=1;
      }
      if(kind==='auto-human'){
        s.territories=s.territories.map((t,i)=>({owner:i<21?0:1,armies:1}));s.territories[0].armies=12;
        s.phase='fortify';s.pool=0;s.conquered=true;s.missions=['garrisons','territories'];
        s.players[0].cards=[0,1];s.players[1].cards=[2,3];s.discard=s.deck.filter(c=>c>3);s.deck=[];
      }
      if(kind==='fortify-win'){
        s.territories=s.territories.map((t,i)=>({owner:i<18?0:i===41?2:1,armies:i<18?i===3?1:i===0?3:2:1}));
        s.missions=['garrisons','territories','asia-africa'];s.phase='fortify';s.pool=0;s.conquered=true;
      }
      if(!E.validState(s))throw new Error('Invalid UX fixture');
      localStorage.setItem('rk.save',JSON.stringify(s));
    },kind);
    await p.reload();await p.locator('#tileRk').click();
  }
  async function pickCountry(id,query){
    await tap('#rkPickCountry');
    if(query)await p.locator('#rkCountrySearch').fill(query);
    await tap(`#rkCountryResults [data-country="${id}"]`);
    assert.ok(await p.locator('#rkMapViewport').isVisible(),'A country choice returns directly to the map');
  }
  async function mapRoom(focused=false){
    const r=await p.locator('#rkMapViewport').evaluate(el=>{
      const map=el.getBoundingClientRect(),screen=document.getElementById('rk').getBoundingClientRect();
      return {fraction:map.width*map.height/(screen.width*screen.height),portrait:screen.height>screen.width,viewport:[screen.width,screen.height]};
    });
    const minimum=r.portrait ? .75 : focused ? .60 : .70;
    assert.ok(r.fraction>=minimum,`The world must retain ${minimum*100}% of the game screen: ${JSON.stringify(r)}`);
    assert.ok(await p.locator('#rkInspector').isHidden(),'Selecting a map country never opens an unsolicited detail panel');
  }
  async function compactFeedback(){
    assert.ok(await p.locator('#rkFeedback').isVisible(),'A confirmed action still provides feedback');
    const feedback=await p.locator('#rkFeedback').evaluate(el=>{
      const texts=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),lines=[];
      while(texts.nextNode()){const range=document.createRange();range.selectNodeContents(texts.currentNode);lines.push(...[...range.getClientRects()].filter(r=>r.width>0&&r.height>0));}
      return {height:el.getBoundingClientRect().height,lineTops:lines.map(r=>Math.round(r.top)),label:el.getAttribute('aria-label')};
    });
    assert.ok(feedback.height<=40,`Feedback must not cover the world: ${JSON.stringify(feedback)}`);
    assert.ok(new Set(feedback.lineTops).size<=1,`Visible action feedback fits one line: ${JSON.stringify(feedback)}`);
  }
  async function layout(){
    await p.waitForTimeout(60);
    assert.ok(await p.locator('#rk').evaluate(el=>el.scrollWidth<=el.clientWidth),'No horizontal overflow');
    await mapRoom();assert.ok(await p.locator('#rkScoreboard').isHidden(),'The player overview is kept off the map');
    assert.ok(await p.locator('#rkMapViewport').evaluate(el=>{
      const a=el.getBoundingClientRect(),b=document.getElementById('rkMap').getBoundingClientRect();
      return b.left>=a.left-1&&b.top>=a.top-1&&b.right<=a.right+1&&b.bottom<=a.bottom+1;
    }),'The entire world fits above the turn controls');
    await tap('#rkPickCountry');
    assert.ok(await p.locator('#rkCountryList').evaluate(el=>{
      const search=el.querySelector('.rk-country-search').getBoundingClientRect(),filters=el.querySelector('#rkCountryFilters').getBoundingClientRect(),count=el.querySelector('#rkCountryCount').getBoundingClientRect();
      const heading=el.querySelector('#rkCountryResults h3').getBoundingClientRect(),countries=el.querySelector('#rkCountryResults>div').getBoundingClientRect();
      return (search.bottom<=filters.top+1||search.right<=filters.left+1)&&Math.max(search.bottom,filters.bottom)<=count.top+1&&heading.bottom<=countries.top+1&&el.scrollWidth<=el.clientWidth+1;
    }),'Search, filters, headings and country cards must stay readable without overlap');
    await tap('#rkCloseCountries');
    await tap('#rkDockToggle');
    assert.ok(await p.locator('#rkInspector').evaluate(el=>{
      const fraction=innerHeight>innerWidth ? .45 : .5;
      return el.getBoundingClientRect().height<=innerHeight*fraction+1;
    }),'The requested detail sheet leaves at least half of the world visible');
    await tap('#rkCloseInspector');
  }

  // The world owns most of the screen; compact guidance and optional details stay reachable.
  await fixture();const initial=await saved();
  assert.match(await p.locator('#rkGuideTitle').innerText(),/4 legers plaatsen/);
  assert.ok(await p.locator('#rkMap [data-marker="0"]').evaluate(el=>el.classList.contains('eligible')));
  assert.ok(await p.locator('#rkMap [data-marker="1"]').evaluate(el=>el.classList.contains('unavailable')));
  for(const [width,height,big] of [[320,844,true],[390,844,false],[915,412,true],[1280,800,false]]){
    await p.setViewportSize({width,height});
    await p.evaluate(big=>document.documentElement.classList.toggle('big-text',big),big);
    await layout();
  }
  await p.setViewportSize({width:390,height:844});
  await tap('#rkPickCountry');await p.locator('#rkCountrySearch').fill('BRAZILIE');
  assert.equal(await p.locator('#rkCountryResults [data-country]').count(),1,'Search ignores accents and case');
  await p.locator('#rkCountrySearch').fill('bestaat niet');
  assert.equal(await p.locator('#rkCountryResults [data-country]').count(),0);
  assert.match(await p.locator('.rk-no-countries').innerText(),/Geen landen gevonden/);
  await p.locator('#rkCountrySearch').fill('');await tap('[data-country-filter="all"]');
  assert.equal(await p.locator('#rkCountryResults [data-country]').count(),42);
  assert.ok(await p.locator('#rkCountryResults [data-country="1"]').isDisabled());
  await tap('[data-country-filter="own"]');
  assert.equal(await p.locator('#rkCountryResults [data-country]').count(),40);
  assert.deepEqual(await saved(),initial,'Searching and filtering never change a saved game');
  assert.equal(await p.evaluate(()=>window.appBack()),true);
  assert.ok(await p.locator('#rkCountryList').isHidden());assert.ok(await p.locator('#rkGuide').isVisible());

  // Undo restores exactly the latest committed placement, including the pool and action log.
  await pickCountry(0,'alaska');await mapRoom(true);await p.locator('#rkAmountRange').fill('1');await tap('#rkActionreinforce');await compactFeedback();
  const first=await saved();assert.equal(first.pool,3);assert.equal(first.phase,'reinforce','A partial placement cannot advance the phase');
  await pickCountry(3,'alberta');assert.equal(await p.locator('#rkAmount').inputValue(),'1','The previous placement amount is remembered for another country');await tap('[data-action="all"]');await tap('#rkActionreinforce');
  assert.equal((await saved()).pool,0);assert.equal((await saved()).phase,'attack','The final human placement advances automatically');await p.waitForFunction(()=>!document.getElementById('rkNext').disabled);assert.ok(await p.locator('#rkNext').isEnabled());assert.match(await p.locator('#rkPhase').innerText(),/Fase 2\/3.*Aanvallen/i);
  await tap('#rkUndoPlacement');assert.deepEqual(await saved(),first,'Undo includes the automatic phase transition, reserve, dice state and action log');
  assert.equal(await p.locator('#rkMapEffects').locator('*').count(),0,'Undo also clears feedback for the cancelled placement');
  assert.ok(await p.locator('#rkNext').isDisabled());assert.ok(await p.locator('#rkUndoPlacement').isHidden());
  await pickCountry(0,'alaska');await tap('[data-action="all"]');await tap('#rkActionreinforce');
  await p.locator('#rkViewMenu > summary').click();await p.locator('#rkListTab').click();await tap('#rkNext');
  assert.equal((await saved()).phase,'fortify','The next explicit phase action progresses from attack to fortification');assert.ok(await p.locator('#rkUndoPlacement').isHidden(),'An explicit phase change invalidates the placement undo');assert.match(await p.locator('#rkPhase').innerText(),/Fase 3\/3.*Verplaatsen/i);assert.match(await p.locator('#rkNext').innerText(),/Einde van je beurt/i);assert.match(await p.locator('#rkNext').innerText(),/Beurt afronden/i);
  assert.ok(await p.locator('#rkCountryList').isHidden(),'Advancing the phase returns to the world');
  assert.ok(await p.locator('#rkPhaseSteps [data-phase="reinforce"]').evaluate(el=>el.classList.contains('complete')));

  // The option is persistent, shared by lobby and pause, and does not run actions when toggled.
  await fixture();await autoAdvance(false);const optedOut=await saved();
  await pickCountry(0,'alaska');await tap('#rkActionreinforce');
  const manuallyReady=await saved();assert.equal(manuallyReady.phase,'reinforce');assert.equal(manuallyReady.pool,0);assert.match(await p.locator('#rkPhase').innerText(),/Fase 1\/3.*Versterken/i);
  assert.equal(manuallyReady.rng,optedOut.rng);assert.ok(await p.locator('#rkNext').isEnabled());
  assert.match(await p.locator('#rkNext').innerText(),/Volgende fase/i);assert.match(await p.locator('#rkNext').getAttribute('aria-label'),/Naar de aanvalsfase/);
  await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();await p.reload();await p.locator('#tileRk').click();
  assert.deepEqual(await saved(),manuallyReady,'Resuming a ready reinforcement phase does not silently advance it');
  await p.locator('#rkPause').click();assert.equal(await p.locator('#rkPauseAutoAdvance').isChecked(),false);
  await p.locator('#rkNew').click();assert.equal(await p.locator('#rkAutoAdvance').isChecked(),false,'The lobby reflects the pause preference');
  await p.locator('#rkAutoAdvance').check();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoAdvance),true);
  await p.locator('#rkResume').click();assert.deepEqual(await saved(),manuallyReady,'Enabling automatic advance never performs an existing saved action');
  await p.locator('#rkPause').click();assert.ok(await p.locator('#rkPauseAutoAdvance').isChecked(),'The pause preference reflects the lobby');await p.locator('#rkContinue').click();
  await tap('#rkNext');assert.equal((await saved()).phase,'attack');assert.match(await p.locator('#rkNext').getAttribute('aria-label'),/Naar de verplaatsingsfase/);
  await fixture('empty-reinforce');const ready=await saved();await p.waitForTimeout(120);assert.deepEqual(await saved(),ready,'Loading a zero-reserve save remains passive even with automatic advance enabled');

  // Mandatory trades still precede placement, including the different elimination-card threshold.
  for(const kind of ['required','resume-required']){
    await fixture(kind);const beforeTrade=await saved();assert.equal(beforeTrade.phase,'reinforce');assert.ok(await p.locator('#rkInspector').isVisible());
    assert.ok(await p.locator('#rkNext').isDisabled());assert.equal(await p.locator('#rkActionreinforce').count(),0,'Mandatory cards cannot be bypassed by placing the reserve');
    await tap('#rkActiontrade');const traded=await saved();assert.equal(traded.phase,'reinforce');assert.ok(traded.pool>beforeTrade.pool);
    await pickCountry(0,'alaska');await tap('#rkActionreinforce');const afterTrade=await saved();
    assert.equal(afterTrade.phase,'attack');assert.equal(afterTrade.pool,0);assert.equal(afterTrade.resumeAttack,false);assert.equal(afterTrade.rng,beforeTrade.rng);
    await tap('#rkUndoPlacement');assert.deepEqual(await saved(),traded,'Undo after a traded placement keeps the completed trade while restoring reinforcement');
  }
  await fixture('resume-ready');const resumeReady=await saved();assert.ok(await p.locator('#rkInspector').isHidden(),'Five inherited cards do not force a trade while resuming an attack');
  await pickCountry(0,'alaska');await tap('#rkActionreinforce');const resumedAttack=await saved();
  assert.equal(resumedAttack.phase,'attack');assert.equal(resumedAttack.resumeAttack,false);assert.equal(resumedAttack.players[0].cards.length,5);assert.equal(resumedAttack.rng,resumeReady.rng);

  // A reinforcement that completes a mission ends the game instead of opening the attack phase.
  await fixture('mission-win');const almostWon=await saved();assert.equal(almostWon.territories.filter(t=>t.owner===0&&t.armies>=2).length,17);
  await pickCountry(0,'alaska');await tap('#rkActionreinforce');const won=await saved();
  assert.equal(won.phase,'won');assert.equal(won.winner,0);assert.equal(won.pool,0);assert.equal(won.rng,almostWon.rng);assert.ok(await p.locator('#rkNext').isDisabled());

  // Destination lists are optional; repeated source taps deselect without changing the game.
  await fixture('attack');const attack=await saved();
  await tap('#rkPickCountry');await tap('[data-country-filter="own"]');await p.locator('#rkCountrySearch').fill('japan');
  assert.ok(await p.locator('#rkCountryResults [data-country]').isDisabled(),'A garrison cannot be chosen as an attack source');
  await tap('#rkCloseCountries');await pickCountry(0,'alaska');
  const kamchatka=await p.evaluate(()=>ReneRiskEngine.byId.kamchatka);
  assert.ok(await p.locator('#rkTargetChoices').isHidden(),'Choosing a source leaves the world unobstructed');
  assert.equal(await p.locator('#rkTargetsToggle').getAttribute('aria-expanded'),'false');
  await tap('#rkTargetsToggle');assert.equal(await p.locator('#rkTargetsToggle').getAttribute('aria-expanded'),'true');
  assert.equal(await p.evaluate(()=>window.appBack()),true);assert.ok(await p.locator('#rkTargetChoices').isHidden(),'Android Back dismisses the optional destination list first');
  assert.equal(await p.locator('#rkFrom').inputValue(),'0','Dismissing the list preserves its chosen source');assert.deepEqual(await saved(),attack);
  await tap('#rkTargetsToggle');assert.equal(await p.locator('#rkTargetChoices button').count(),1);
  await tap(`#rkTargetChoices [data-quick-country="${kamchatka}"]`);
  assert.equal(await p.locator('#rkTarget').inputValue(),String(kamchatka));
  assert.ok(await p.locator('#rkActionblitz').isVisible());assert.ok(await p.locator('#rkTargetChoices').isHidden(),'Picking a destination immediately dismisses the optional list');assert.deepEqual(await saved(),attack);
  await tap('#rkActioncancel');await tap('#rkClearSelection');
  await pickCountry(0,'alaska');
  const source=await p.locator('#rkMap [data-marker="0"]').evaluate(el=>{const r=new DOMPoint(0,0).matrixTransform(el.getScreenCTM());return {x:r.x,y:r.y};});
  await p.touchscreen.tap(source.x,source.y);assert.equal(await p.locator('#rkFrom').inputValue(),'','Tapping the selected stack again clears the source');
  assert.ok(await p.locator('#rkTargetsToggle').isHidden());assert.deepEqual(await saved(),attack);
  await p.locator('#rkViewMenu > summary').click();await p.locator('#rkExpandMap').click();
  await tap('#rkPickCountry');await p.keyboard.press('Escape');
  assert.ok(await p.locator('#rkCountryList').isHidden());
  assert.equal(await p.locator('#rkExpandMap').getAttribute('aria-pressed'),'true','Escape closes the chooser before fullscreen');
  assert.equal(await p.evaluate(()=>window.appBack()),true);
  assert.equal(await p.locator('#rkExpandMap').getAttribute('aria-pressed'),'false');

  // A destination with one garrison is a valid fortification target, even though it is not a source.
  await fixture('fortify');const fortify=await saved();await pickCountry(0,'alaska');
  assert.ok(await p.locator('#rkTargetChoices').isHidden());await tap('#rkTargetsToggle');assert.equal(await p.locator('#rkTargetChoices button').count(),1);await tap('#rkTargetChoices [data-quick-country="3"]');
  assert.ok(await p.locator('#rkActionfortify').isVisible());assert.deepEqual(await saved(),fortify);
  await tap('#rkActioncancel');
  // Confirming a transfer completes one human turn atomically and keeps the handoff private.
  await fixture('auto-human');await p.locator('#rkBeginTurn').click();const humanFortify=await saved();
  const expectedHuman=await p.evaluate(s=>ReneRiskEngine.apply(ReneRiskEngine.apply(s,{type:'fortify',from:0,to:3,amount:2}),{type:'endTurn'}),humanFortify);
  assert.notEqual(expectedHuman.rng,humanFortify.rng,'The empty deck exercises the real reshuffle and card-draw RNG');
  await pickCountry(0,'alaska');await pickCountry(3,'alberta');await p.locator('#rkAmountRange').fill('2');
  assert.match(await p.locator('#rkContextHeading h3').innerText(),/Beurt afronden/i);assert.match(await p.locator('#rkActionfortify').getAttribute('aria-label'),/verplaatsen en beurt afronden/i);
  assert.deepEqual(await saved(),humanFortify,'A transfer preview does not complete the turn');await recordSaves();
  const confirm=await p.locator('#rkActionfortify').boundingBox(),confirmPoint={x:confirm.x+confirm.width/2,y:confirm.y+confirm.height/2};
  await p.touchscreen.tap(confirmPoint.x,confirmPoint.y);
  const handoffHit=await p.evaluate(pt=>{const el=document.elementFromPoint(pt.x,pt.y);return el?.closest('button')?.id||el?.id||el?.className;},confirmPoint);
  await p.touchscreen.tap(confirmPoint.x,confirmPoint.y);
  assert.deepEqual(await saved(),expectedHuman,'Transfer and turn completion persist the exact engine result once');
  assert.deepEqual(await p.evaluate(()=>window.__rkWrites),[expectedHuman],'No intermediate transfer state or repeated turn is saved');
  assert.equal((await saved()).players[0].cards.length,humanFortify.players[0].cards.length+1,'Exactly one conquest card is awarded');
  assert.ok(await p.locator('#rkHandoffModal').isVisible(),`Repeated transfer tap keeps the handoff open; second-tap target was ${handoffHit}`);
  assert.equal(await p.locator('.rk-mission,[data-card]').count(),0,'Neither human sees private information before accepting the next turn');
  console.log(`Auto-end handoff second-tap target: ${handoffHit}`);
  await p.reload();await p.locator('#tileRk').click();assert.deepEqual(await saved(),expectedHuman,'Resuming the completed turn never draws a second card');
  assert.ok(await p.locator('#rkHandoffModal').isVisible());assert.equal(await p.locator('.rk-mission,[data-card]').count(),0);
  await p.locator('#rkBeginTurn').click();assert.ok(await p.locator('#rkUndoPlacement').isHidden(),'The next human cannot undo the previous player’s transfer');
  await p.locator('#rkHand').click();assert.deepEqual(await p.locator('[data-card]').evaluateAll(nodes=>nodes.map(el=>Number(el.dataset.card))),expectedHuman.players[1].cards);

  // An automatic completion starts the computer, which continues through its existing actions.
  await fixture('auto-ai');const aiFortify=await saved();
  const expectedAI=await p.evaluate(s=>ReneRiskEngine.apply(ReneRiskEngine.apply(s,{type:'fortify',from:0,to:3,amount:2}),{type:'endTurn'}),aiFortify);
  await pickCountry(0,'alaska');await pickCountry(3,'alberta');await p.locator('#rkAmountRange').fill('2');await recordSaves();await tap('#rkActionfortify');
  assert.deepEqual((await p.evaluate(()=>window.__rkWrites))[0],expectedAI,'The computer receives the completed turn directly');
  await p.waitForFunction(before=>{const raw=localStorage.getItem('rk.save');if(raw===JSON.stringify(before))return false;window.__autoEndAI=JSON.parse(raw);return true;},expectedAI);
  await p.locator('#rkPause').click();const aiAction=await p.evaluate(()=>window.__autoEndAI);
  assert.equal(aiAction.current,1);assert.equal(aiAction.turn,expectedAI.turn);assert.equal(aiAction.phase,'reinforce');assert.equal(aiAction.pool,0);
  assert.deepEqual(aiAction.players[0].cards,expectedAI.players[0].cards,'Computer scheduling cannot award another card to the previous human');await p.locator('#rkPauseMenu').click();

  // The independent opt-out retains transfer undo, and settings or resume never finish a stored turn.
  await fixture('fortify');await autoEndTurn(false);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoAdvance),true);
  const manualFortify=await saved();await pickCountry(0,'alaska');await pickCountry(3,'alberta');await p.locator('#rkAmountRange').fill('2');await tap('#rkActionfortify');
  const moved=await saved(),expectedMoved=await p.evaluate(s=>ReneRiskEngine.apply(s,{type:'fortify',from:0,to:3,amount:2}),manualFortify);
  assert.deepEqual(moved,expectedMoved);await tap('#rkUndoPlacement');assert.deepEqual(await saved(),manualFortify);
  await pickCountry(0,'alaska');await pickCountry(3,'alberta');await p.locator('#rkAmountRange').fill('2');await tap('#rkActionfortify');
  await autoEndTurn(true);assert.deepEqual(await saved(),moved,'Enabling automatic completion does not finish an already committed transfer');
  await autoAdvance(false);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoEndTurn),true,'Changing reinforcement advance leaves turn completion independent');
  await p.locator('#rkPause').click();await p.locator('#rkNew').click();assert.ok(await p.locator('#rkAutoEndTurn').isChecked());assert.equal(await p.locator('#rkAutoAdvance').isChecked(),false);
  await p.locator('#rkAutoEndTurn').uncheck();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.settings')).autoAdvance),false);await p.locator('#rkResume').click();
  await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();await p.reload();await p.locator('#tileRk').click();assert.deepEqual(await saved(),moved);
  for(const [width,height] of [[320,844],[915,412]]){
    await p.setViewportSize({width,height});await p.evaluate(()=>document.documentElement.classList.add('big-text'));await p.locator('#rkPause').click();
    for(const id of ['rkPauseAutoAdvance','rkPauseAutoEndTurn']){
      assert.equal(await p.locator('#'+id).isChecked(),false,'Both independent preferences survive reload');
      const row=p.locator('#'+id).locator('..');await row.scrollIntoViewIfNeeded();
      assert.ok(await row.evaluate(el=>{const r=el.getBoundingClientRect();return r.height>=44&&r.width>=44&&r.top>=0&&r.bottom<=innerHeight+1&&el.scrollWidth<=el.clientWidth+1&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Each pause preference remains readable and reachable on small screens');
    }
    await p.locator('#rkContinue').scrollIntoViewIfNeeded();await tap('#rkContinue');
  }
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.documentElement.classList.remove('big-text'));
  await autoAdvance(true);await autoEndTurn(true);assert.deepEqual(await saved(),moved,'Rendering and toggling preferences never end an already fortified turn');

  // A transfer that wins a mission stays won and neither advances nor draws a conquest card.
  await fixture('fortify-win');const beforeWin=await saved(),statsBeforeWin=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.stats')||'{}'));
  await pickCountry(0,'alaska');await pickCountry(3,'alberta');await p.locator('#rkAmountRange').fill('1');await tap('#rkActionfortify');
  const wonByTransfer=await saved(),statsWon=await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.stats')));
  assert.equal(wonByTransfer.phase,'won');assert.equal(wonByTransfer.current,beforeWin.current);assert.equal(wonByTransfer.turn,beforeWin.turn);assert.equal(wonByTransfer.winner,0);
  assert.deepEqual(wonByTransfer.deck,beforeWin.deck);assert.deepEqual(wonByTransfer.players.map(p=>p.cards),beforeWin.players.map(p=>p.cards));assert.equal(wonByTransfer.rng,beforeWin.rng);
  assert.equal(statsWon.finished,(statsBeforeWin.finished||0)+1);assert.equal(statsWon.won,(statsBeforeWin.won||0)+1);
  await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();await p.reload();await p.locator('#tileRk').click();assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('rk.stats'))),statsWon,'Resuming a won transfer records no second result');

  await fixture('no-attack');assert.match(await p.locator('#rkGuideTitle').innerText(),/Geen aanval mogelijk/);assert.ok(await p.locator('#rkGuideTitle').isVisible(),'A phone still explains why no attacking army can be chosen');
  assert.ok(await p.locator('#rkNext').isEnabled());assert.ok(await p.locator('#rkPickCountry').isHidden());

  // Undo during manual setup restores both the current batch and the starting-army allowance.
  await fixture('manual');const manual=await saved();await tap('#rkPickCountry');
  const firstStartCountry=await p.locator('#rkCountryResults [data-country]').first().getAttribute('data-country');
  await tap(`#rkCountryResults [data-country="${firstStartCountry}"]`);await tap('#rkActionreinforce');
  assert.equal((await saved()).setupRemaining[0],manual.setupRemaining[0]-3);
  await tap('#rkUndoPlacement');assert.deepEqual(await saved(),manual);

  // Remembered placement amounts clamp to the remaining pool instead of overspending it.
  await fixture();await pickCountry(0,'alaska');await p.locator('#rkAmountRange').fill('3');await tap('#rkActionreinforce');
  const oneLeft=await saved();assert.equal(oneLeft.pool,1);await pickCountry(3,'alberta');
  assert.equal(await p.locator('#rkAmount').inputValue(),'1','The remembered amount is capped by the remaining reserve');
  assert.deepEqual(await saved(),oneLeft,'Remembering an amount never commits the preview');await tap('#rkActioncancel');

  // A reloaded game never offers a stale undo from a previous session.
  await fixture();await pickCountry(0,'alaska');await tap('#rkActionreinforce');
  const beforeReload=await saved();assert.ok(await p.locator('#rkUndoPlacement').isVisible());
  await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();await p.reload();await p.locator('#tileRk').click();
  assert.deepEqual(await saved(),beforeReload);assert.ok(await p.locator('#rkUndoPlacement').isHidden());
  assert.deepEqual(errors,[]);
  console.log('PASS: atomic automatic turn completion, single card/RNG draw, private handoff and computer scheduling; independent preferences and opt-out undo; winning transfers; automatic human reinforcement transitions and exact undo; persistent lobby/pause opt-out; passive resume; mandatory/elimination card thresholds; map-first layouts and compact feedback/details; optional destinations; repeated-tap deselection; remembered/clamped placements; contextual turn guide; complete-world layouts; searchable and filtered countries; touch target choices; exact single-placement undo and phase guards; date-line attacks; fortification; fullscreen Back; safe resume');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
