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
    const el=p.locator(selector);
    const hit=await el.evaluate(el=>{
      const r=el.getBoundingClientRect();
      const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {ok:r.width>=44&&r.height>=44&&el.contains(top),rect:r.toJSON(),top:top?.id||top?.className,viewport:[innerWidth,innerHeight]};
    });
    assert.ok(hit.ok,`${selector} must be a directly reachable touch target: ${JSON.stringify(hit)}`);
    const r=await el.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
  }
  async function fixture(kind='reinforce'){
    if(await p.locator('#rk').evaluate(el=>el.classList.contains('active'))){
      if(await p.locator('#rkInspector').isVisible())await p.locator('#rkCloseInspector').click();
      await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();
    }
    await p.evaluate(kind=>{
      window.__noSave=true;
      const E=ReneRiskEngine,s=E.newGame([{name:'Rene'},{name:'Nova',ai:true},{name:'Atlas',ai:true}],23,kind==='manual'?{setup:'manual'}:{});
      if(kind==='manual'){localStorage.setItem('rk.save',JSON.stringify(s));return;}
      s.territories=s.territories.map(()=>({owner:0,armies:3}));
      s.territories[1]={owner:1,armies:3};s.territories[E.byId.eastaus]={owner:2,armies:3};
      s.territories[0].armies=40;s.pool=4;
      if(kind==='attack'){
        s.phase='attack';s.pool=0;s.territories[1].owner=0;
        s.territories[E.byId.kamchatka]={owner:1,armies:2};s.territories[E.byId.japan].armies=1;
      } else if(kind==='fortify'){
        s.phase='fortify';s.pool=0;s.territories=s.territories.map(()=>({owner:1,armies:2}));
        s.territories[0]={owner:0,armies:12};s.territories[3]={owner:0,armies:1};s.territories[E.byId.eastaus]={owner:2,armies:3};
      } else if(kind==='no-attack'){
        s.phase='attack';s.pool=0;s.territories.forEach(t=>{if(t.owner===0)t.armies=1;});
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
  async function layout(){
    await p.waitForTimeout(60);
    assert.ok(await p.locator('#rk').evaluate(el=>el.scrollWidth<=el.clientWidth),'No horizontal overflow');
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
  }

  // The guide, complete world and country chooser remain readable on phones and tablets.
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
  await pickCountry(0,'alaska');await p.locator('#rkAmountRange').fill('1');await tap('#rkActionreinforce');
  const first=await saved();assert.equal(first.pool,3);
  await pickCountry(3,'alberta');await tap('#rkActionreinforce');
  assert.equal((await saved()).pool,0);assert.ok(await p.locator('#rkNext').isEnabled());
  await tap('#rkUndoPlacement');assert.deepEqual(await saved(),first);
  assert.equal(await p.locator('#rkMapEffects').locator('*').count(),0,'Undo also clears feedback for the cancelled placement');
  assert.ok(await p.locator('#rkNext').isDisabled());assert.ok(await p.locator('#rkUndoPlacement').isHidden());
  await pickCountry(0,'alaska');await tap('#rkActionreinforce');
  await p.locator('#rkViewMenu > summary').click();await p.locator('#rkListTab').click();await tap('#rkNext');
  assert.equal((await saved()).phase,'attack');assert.ok(await p.locator('#rkUndoPlacement').isHidden());
  assert.ok(await p.locator('#rkCountryList').isHidden(),'Advancing the phase returns to the world');
  assert.ok(await p.locator('#rkPhaseSteps [data-phase="reinforce"]').evaluate(el=>el.classList.contains('complete')));

  // Readable target buttons make even the date-line sea connection a two-choice interaction.
  await fixture('attack');const attack=await saved();
  await tap('#rkPickCountry');await tap('[data-country-filter="own"]');await p.locator('#rkCountrySearch').fill('japan');
  assert.ok(await p.locator('#rkCountryResults [data-country]').isDisabled(),'A garrison cannot be chosen as an attack source');
  await tap('#rkCloseCountries');await pickCountry(0,'alaska');
  const kamchatka=await p.evaluate(()=>ReneRiskEngine.byId.kamchatka);
  assert.equal(await p.locator('#rkTargetChoices button').count(),1);
  await tap(`#rkTargetChoices [data-quick-country="${kamchatka}"]`);
  assert.equal(await p.locator('#rkTarget').inputValue(),String(kamchatka));
  assert.ok(await p.locator('#rkActionblitz').isVisible());assert.deepEqual(await saved(),attack);
  await tap('#rkActioncancel');await tap('#rkClearSelection');
  await p.locator('#rkViewMenu > summary').click();await p.locator('#rkExpandMap').click();
  await tap('#rkPickCountry');await p.keyboard.press('Escape');
  assert.ok(await p.locator('#rkCountryList').isHidden());
  assert.equal(await p.locator('#rkExpandMap').getAttribute('aria-pressed'),'true','Escape closes the chooser before fullscreen');
  assert.equal(await p.evaluate(()=>window.appBack()),true);
  assert.equal(await p.locator('#rkExpandMap').getAttribute('aria-pressed'),'false');

  // A destination with one garrison is a valid fortification target, even though it is not a source.
  await fixture('fortify');const fortify=await saved();await pickCountry(0,'alaska');
  assert.equal(await p.locator('#rkTargetChoices button').count(),1);await tap('#rkTargetChoices [data-quick-country="3"]');
  assert.ok(await p.locator('#rkActionfortify').isVisible());assert.deepEqual(await saved(),fortify);
  await tap('#rkActioncancel');
  await fixture('no-attack');assert.match(await p.locator('#rkGuideTitle').innerText(),/Geen aanval mogelijk/);
  assert.ok(await p.locator('#rkNext').isEnabled());assert.ok(await p.locator('#rkPickCountry').isHidden());

  // Undo during manual setup restores both the current batch and the starting-army allowance.
  await fixture('manual');const manual=await saved();await tap('#rkPickCountry');
  const firstStartCountry=await p.locator('#rkCountryResults [data-country]').first().getAttribute('data-country');
  await tap(`#rkCountryResults [data-country="${firstStartCountry}"]`);await tap('#rkActionreinforce');
  assert.equal((await saved()).setupRemaining[0],manual.setupRemaining[0]-3);
  await tap('#rkUndoPlacement');assert.deepEqual(await saved(),manual);

  // A reloaded game never offers a stale undo from a previous session.
  await fixture();await pickCountry(0,'alaska');await tap('#rkActionreinforce');
  const beforeReload=await saved();assert.ok(await p.locator('#rkUndoPlacement').isVisible());
  await p.locator('#rkPause').click();await p.locator('#rkPauseMenu').click();await p.reload();await p.locator('#tileRk').click();
  assert.deepEqual(await saved(),beforeReload);assert.ok(await p.locator('#rkUndoPlacement').isHidden());
  assert.deepEqual(errors,[]);
  console.log('PASS: contextual turn guide; complete-world layouts; searchable and filtered countries; touch target choices; exact single-placement undo and phase guards; date-line attacks; fortification; fullscreen Back; safe resume');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
