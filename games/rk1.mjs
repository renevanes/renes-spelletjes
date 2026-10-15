import assert from 'node:assert/strict';
import { appBrowser, appPage, appURL } from '../tests/browser-util.mjs';

const browser = await appBrowser();
try {
  const { context, page: p, errors } = await appPage(browser);
  await p.locator('#tileRk').click();
  assert.equal(await p.locator('#rkMap').getAttribute('data-geographic'), 'natural-earth');
  assert.ok(await p.locator('#rkMap .rk-country-shape').evaluateAll(paths => paths.every(path => path.getAttribute('d').length > 250)));
  assert.ok(await p.locator('#rkMapViewport').evaluate(el => el.scrollWidth <= el.clientWidth+1 && el.scrollHeight <= el.clientHeight+1), 'The whole world must fit on first entry');
  await p.locator('#rkPlayerCount').selectOption('6');
  await p.locator('#rkHumanCount').selectOption('6');
  assert.equal(await p.locator('#rkNames input').count(), 6);
  await p.locator('#rkSound').uncheck();
  await p.locator('#rkMusic').uncheck();
  await p.locator('#rkStart').click();
  await p.locator('#rkHandoffModal.show').waitFor();
  assert.equal(await p.locator('#rkControls [data-card]').count(), 0);
  await p.locator('#rkBeginTurn').click();
  assert.equal(await p.locator('#rkMap [data-country]').count(), 42);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('rk.settings')).music), false);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('rk.settings')).sound), false);
  await p.locator('#rkBack').click();
  assert.ok(await p.locator('#tileRk').evaluate(el => el.classList.contains('has-save')));

  // A controlled battle exercises the actual controls and automatic persistence.
  await p.evaluate(() => {
    window.__noSave = true; // Do not let pagehide overwrite the fixture we are about to load.
    const E = ReneRiskEngine, s = E.newGame([{ name: 'Rene', ai: false }, { name: 'Computer 1', ai: true }, { name: 'Computer 2', ai: true }], 7);
    s.territories = s.territories.map(() => ({ owner: 0, armies: 3 }));
    s.territories[E.byId.nw] = { owner: 1, armies: 1 };
    s.territories[E.byId.eastaus] = { owner: 2, armies: 1 };
    s.territories[E.byId.alaska].armies = 40;
    s.pool = 3;
    localStorage.setItem('rk.save', JSON.stringify(s));
  });
  await p.reload();
  await p.locator('#tileRk').click();
  await p.locator('#rkStartModal').waitFor({state:'hidden'});
  await p.locator('#rkMap [data-marker="0"]').click();
  assert.equal(await p.locator('#rkFrom').inputValue(),'0');
  await p.locator('#rkAmount').fill('3');
  await p.locator('#rkActionreinforce').click();
  await p.locator('#rkActionadvance').click();
  await p.locator('#rkMap [data-marker="1"]').click();
  assert.equal(await p.locator('#rkTarget').inputValue(),'1');
  for (let i = 0; i < 20 && !(await p.locator('#rkActionoccupy').count()); i++) await p.locator('#rkActionattack').click();
  await p.locator('#rkActionoccupy').click();
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('rk.save')));
  assert.equal(saved.territories[1].owner, 0);
  assert.ok(saved.territories[0].armies >= 1);
  assert.ok(await p.evaluate(() => ReneRiskEngine.validState(JSON.parse(localStorage.getItem('rk.save')))));
  assert.ok(await p.locator('#rkBattle .rk-die svg circle').count() > 0, 'Dice show actual pips');
  await p.locator('#rkHelp').click();
  await p.waitForFunction(() => document.activeElement.closest('.modal')?.id === 'rkHelpModal');
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.activeElement.id === 'rkHelp');
  await p.locator('#rkPause').click();
  await p.locator('#rkContinue').click();
  await p.locator('#rkBack').click();
  await p.reload();
  await p.locator('#tileRk').click();
  assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('rk.save'))), saved);
  if (!(await p.locator('#rkListTab').isVisible())) await p.locator('#rkViewMenu > summary').click();
  await p.locator('#rkListTab').click();
  await p.locator('#rkCountryList [data-country="0"]').focus();
  await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(() => document.activeElement.dataset.country), '0');
  if (!(await p.locator('#rkMapTab').isVisible())) await p.locator('#rkViewMenu > summary').click();
  await p.locator('#rkMapTab').click();
  await p.locator('#rkWorldView').click();
  const mapsamples = await p.evaluate(() => {
    const project = (lon,lat) => {
      const l = lon*Math.PI/180, f = lat*Math.PI/180, f2=f*f, f4=f**4;
      return new DOMPoint(720+l*(.8707-.131979*f2+f4*(-.013791+f4*(.003971*f2-.001529*f4)))*252,432-f*(1.007226+f2*(.015085+f4*(-.044475+.028874*f2-.005916*f4)))*252);
    };
    return [['alaska',-152,64],['brazil',-55,-15],['westeu',2,47],['northeu',10,51],['northaf',3,28],['india',78,22],['japan',138,37],['westaus',120,-25]].map(([id,lon,lat]) => ({id,inside:document.querySelector(`#rkMap [data-country="${ReneRiskEngine.byId[id]}"] path`).isPointInFill(project(lon,lat))}));
  });
  assert.ok(mapsamples.every(s => s.inside), `Geographic areas must contain their real-world locations: ${JSON.stringify(mapsamples)}`);
  assert.ok(await p.evaluate(() => ReneWereldMap.contacts.every(([a,b]) => ReneRiskEngine.territories[ReneRiskEngine.byId[a]].neighbors.includes(ReneRiskEngine.byId[b]))), 'Every drawn land border allows a legal attack');
  // Selecting a piece on the geographic map must select that same game territory.
  await p.locator('#rkMap [data-marker="0"]').click();
  assert.equal(await p.locator('#rkFrom').inputValue(), '0');
  if (!(await p.locator('#rkExpandMap').isVisible())) await p.locator('#rkViewMenu > summary').click();
  await p.locator('#rkExpandMap').click();
  await p.setViewportSize({width:915,height:412});
  await p.waitForFunction(() => { const el = document.getElementById("rkMapViewport"); return el.scrollWidth <= el.clientWidth+1 && el.scrollHeight <= el.clientHeight+1; });
  assert.ok(await p.locator('#rkMapViewport').evaluate(el => el.scrollWidth <= el.clientWidth+1 && el.scrollHeight <= el.clientHeight+1));
  // The fullscreen board hides the global phase bar, so its encounter must retain a phase action.
  const australia = await p.evaluate(()=>[ReneRiskEngine.byId.westaus,ReneRiskEngine.byId.eastaus]);
  await p.locator(`#rkMap [data-marker="${australia[0]}"]`).click();
  await p.locator(`#rkMap [data-marker="${australia[1]}"]`).click();
  await p.locator('#rkActionadvance').scrollIntoViewIfNeeded();
  assert.ok(await p.locator('#rkActionadvance').isVisible(),'Fullscreen combat retains a way to advance the phase');
  await p.locator('#rkMap [data-marker="0"]').click();
  await p.locator('#rkViewMenu > summary').click();
  await p.locator('[data-continent="eu"]').click();
  assert.ok(parseInt(await p.locator('#rkZoomLabel').innerText()) > 100);
  assert.ok(await p.locator('#rkMap .rk-region-labels').isVisible());
  await p.locator('#rkWorldView').click();
  assert.equal(await p.locator('#rkZoomLabel').innerText(),'100%');
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('#rkExpandMap').getAttribute('aria-pressed'),'false');
  await p.setViewportSize({width:390,height:844});
  await p.locator('#rkWorldView').click();
  if (!(await p.locator('#rkOwnership').isVisible())) await p.locator('#rkViewMenu > summary').click();
  await p.locator('#rkOwnership').click();
  assert.equal(await p.locator('#rkOwnership').getAttribute('aria-pressed'),'false');
  if (!(await p.locator('#rkOwnership').isVisible())) await p.locator('#rkViewMenu > summary').click();
  await p.locator('#rkOwnership').click();
  if (await p.locator('#rkViewMenu').evaluate(el => el.open)) await p.locator('#rkViewMenu > summary').click();
  const touch = await context.newCDPSession(p), box = await p.locator('#rkMapViewport').boundingBox();
  const centerY = box.y+box.height/2;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.35,y:centerY,id:1},{x:box.x+box.width*.65,y:centerY,id:2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.15,y:centerY,id:1},{x:box.x+box.width*.85,y:centerY,id:2}]});
  await p.waitForTimeout(50);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(parseInt(await p.locator('#rkZoomLabel').innerText())>150,'Pinch zoom enlarges the map');
  const panBefore = await p.locator('#rkMapViewport').evaluate(el => el.scrollLeft);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.65,y:centerY,id:1}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.35,y:centerY,id:1}]});
  await p.waitForTimeout(50);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await p.locator('#rkMapViewport').evaluate(el => el.scrollLeft) > panBefore,'Dragging moves the map');
  assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('rk.save'))),saved,'Map gestures do not change armies or saved games');
  await p.locator('#rkWorldView').click();
  const width = await p.locator('#rkMap').evaluate(el => el.getBoundingClientRect().width);
  await p.locator('#rkZoomIn').click();
  assert.ok(await p.locator('#rkMap').evaluate(el => el.getBoundingClientRect().width) > width);
  await p.locator('#rkWorldView').click();
  await p.evaluate(() => document.documentElement.classList.add('big-text'));
  for (const [width, height] of [[320, 844], [390, 844], [915, 412], [1280, 800]]) {
    await p.setViewportSize({ width, height });
    await p.waitForFunction(() => { const el=document.getElementById('rkMapViewport'); return el.scrollWidth<=el.clientWidth+1 && el.scrollHeight<=el.clientHeight+1; });
    assert.ok(await p.locator('#rk').evaluate(el => el.scrollWidth <= el.clientWidth), `Game overflow at ${width}×${height}`);
    assert.ok(await p.locator('#rkMapViewport').evaluate(el => el.scrollWidth <= el.clientWidth+1 && el.scrollHeight <= el.clientHeight+1), `Whole map at ${width}×${height}`);
  }
  await p.screenshot({ path: 'games/rk-landscape.png', fullPage: true });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: 'games/rk-portrait.png', fullPage: true });
  await p.locator('#rkBack').click();

  // Switching profiles never overwrites another player's save while the game is idle.
  await p.evaluate(() => localStorage.setItem('app.profile', '"pabc"'));
  await p.reload();
  await p.locator('#tileRk').click();
  await p.locator('#rkStartModal.show').waitFor();
  await p.locator('#rkStart').click();
  assert.ok(await p.evaluate(() => !!localStorage.getItem('p_pabc.rk.save')));
  assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('rk.save'))), saved);
  await p.locator('#rkBack').click();
  await p.evaluate(() => localStorage.setItem('app.profile', '"p0"'));
  await p.reload();
  await p.locator('#tileRk').click();
  assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('rk.save'))), saved);
  await p.locator('#rkBack').click();

  // AI advances while playing, then stops on pause and when leaving the game.
  await p.evaluate(() => {
    window.__noSave = true;
    const E = ReneRiskEngine, s = E.newGame([{ name: 'Rene', ai: false }, { name: 'Computer', ai: true }], 19);
    s.current = 1; s.pool = E.reinforcements(s);
    localStorage.setItem('rk.save', JSON.stringify(s));
  });
  await p.reload();
  await p.locator('#tileRk').click();
  const beforeAI = await p.evaluate(() => localStorage.getItem('rk.save'));
  await p.waitForFunction(before => localStorage.getItem('rk.save') !== before, beforeAI);
  await p.locator('#rkPause').click();
  const paused = await p.evaluate(() => localStorage.getItem('rk.save'));
  await p.waitForTimeout(600);
  assert.equal(await p.evaluate(() => localStorage.getItem('rk.save')), paused);
  await p.locator('#rkPauseMenu').click();
  await p.waitForTimeout(600);
  assert.equal(await p.evaluate(() => localStorage.getItem('rk.save')), paused);
  assert.deepEqual(errors, []);
  await context.close();

  const audio = await browser.newContext();
  const a = await audio.newPage(), audioErrors = [];
  a.on('pageerror', error => audioErrors.push(error.message));
  await a.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99","mute":false}'));
  await a.goto(appURL);
  await a.locator('#tileRk').click();
  await a.locator('#rkStart').click();
  await a.waitForFunction(() => __sfx._state().now === 'rk', null, { timeout: 20000 });
  await a.locator('#rkPause').click();
  await a.locator('#rkNew').click();
  await a.locator('#rkMusic').uncheck();
  await a.waitForFunction(() => __sfx._state().now === null);
  assert.equal(await a.evaluate(() => JSON.parse(localStorage.getItem('rk.settings')).sound), true);
  assert.deepEqual(audioErrors, []);
  await audio.close();

  // Sample both the idle board and scrolling the enlarged geographic board under 6× CPU throttling.
  const perf = await appPage(browser);
  await perf.page.goto(appURL);
  await perf.page.locator('#tileRk').click();
  await perf.page.locator('#rkStart').click();
  const cdp = await perf.context.newCDPSession(perf.page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await perf.page.waitForTimeout(30000); // Let the app finish its sound-bank warm-up.
  const fps = await perf.page.evaluate(() => new Promise(resolve => {
    let frames = 0, start;
    const sample = now => {
      start ??= now; frames++;
      if (now - start >= 3000) resolve(frames * 1000 / (now - start));
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  assert.ok(fps >= 50, `Frame delivery at 6× CPU: ${fps.toFixed(1)} fps`);
  await perf.page.locator('#rkZoomIn').click();
  await perf.page.locator('#rkZoomIn').click();
  const panFPS = await perf.page.evaluate(() => new Promise(resolve => {
    const viewport = document.getElementById('rkMapViewport');
    let frames = 0, start;
    const sample = now => {
      start ??= now; frames++;
      viewport.scrollLeft = (viewport.scrollWidth-viewport.clientWidth)*(1+Math.sin((now-start)/700))/2;
      if (now-start>=3000) resolve(frames*1000/(now-start));
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  assert.ok(panFPS >= 50, `Geographic map panning at 6× CPU: ${panFPS.toFixed(1)} fps`);
  assert.deepEqual(perf.errors, []);
  await perf.context.close();
  console.log(`PASS: geographic hit-testing, full-world view, map combat, pinch/drag, continent zoom, fullscreen, dice, resume/profiles/audio; ${fps.toFixed(1)} fps idle and ${panFPS.toFixed(1)} fps panning at 6× CPU`);
} finally {
  await browser.close();
}
