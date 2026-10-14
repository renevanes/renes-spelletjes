import assert from 'node:assert/strict';
import { appBrowser, appPage, appURL } from '../tests/browser-util.mjs';

const browser = await appBrowser();
try {
  const { context, page: p, errors } = await appPage(browser);
  await p.locator('#tileRk').click();
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
  await p.locator('#rkFrom').selectOption('0');
  await p.locator('#rkAmount').fill('3');
  await p.locator('#rkActionreinforce').click();
  await p.locator('#rkActionadvance').click();
  await p.locator('#rkTarget').selectOption('1');
  for (let i = 0; i < 20 && !(await p.locator('#rkActionoccupy').count()); i++) await p.locator('#rkActionattack').click();
  await p.locator('#rkActionoccupy').click();
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('rk.save')));
  assert.equal(saved.territories[1].owner, 0);
  assert.ok(saved.territories[0].armies >= 1);
  assert.ok(await p.evaluate(() => ReneRiskEngine.validState(JSON.parse(localStorage.getItem('rk.save')))));
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
  await p.locator('#rkListTab').click();
  await p.locator('#rkCountryList [data-country="0"]').focus();
  await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(() => document.activeElement.dataset.country), '0');
  await p.locator('#rkMapTab').click();
  const width = await p.locator('#rkMap').evaluate(el => el.getBoundingClientRect().width);
  await p.locator('#rkZoomIn').click();
  assert.ok(await p.locator('#rkMap').evaluate(el => el.getBoundingClientRect().width) > width);
  await p.evaluate(() => document.documentElement.classList.add('big-text'));
  for (const [width, height] of [[320, 844], [390, 844], [915, 412], [1280, 800]]) {
    await p.setViewportSize({ width, height });
    assert.ok(await p.locator('#rk').evaluate(el => el.scrollWidth <= el.clientWidth), `Game overflow at ${width}×${height}`);
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
  await a.locator('#rkNew').click();
  await a.locator('#rkMusic').uncheck();
  await a.waitForFunction(() => __sfx._state().now === null);
  assert.equal(await a.evaluate(() => JSON.parse(localStorage.getItem('rk.settings')).sound), true);
  assert.deepEqual(audioErrors, []);
  await audio.close();

  // The static board has no render loop; sample frame delivery under 6× CPU throttling.
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
  assert.deepEqual(perf.errors, []);
  await perf.context.close();
  console.log(`PASS: Wereldmacht setup, local handoff, combat/occupation, pause/resume, profile isolation, audio options, zoom/list, portrait/landscape; ${fps.toFixed(1)} fps at 6× CPU (static board)`);
} finally {
  await browser.close();
}
