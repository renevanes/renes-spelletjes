import assert from 'node:assert/strict';
import { appBrowser, appPage, appURL } from './browser-util.mjs';

const browser = await appBrowser();
try {
  const { context, page: p, errors } = await appPage(browser);
  const count = await p.locator('#menu .tile').count();
  assert.equal(count, 22);
  assert.doesNotMatch(await p.locator('meta[name=viewport]').getAttribute('content'), /maximum-scale|user-scalable=no/);
  await p.locator('#gameSearch').fill('wereldmacht');
  assert.equal(await p.locator('#menu .tile:visible').count(), 1);
  await p.locator('#clearGameSearch').click();
  await p.locator('[data-category="multiplayer"]').click();
  assert.equal(await p.locator('#menu .tile:visible').count(), 5);
  await p.locator('#resetGameFilters').click();
  await p.locator('#chooseFavorites').click();
  await p.locator('[data-favorite="rk"]').click();
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.activeElement.id === 'chooseFavorites');
  assert.match(await p.locator('#favoritesRow').innerText(), /Wereldmacht/);
  assert.equal(await p.locator('#dailyRow [data-daily]').count(), 4);
  await p.locator('#dailyRow [data-daily="wq"]').click();
  assert.equal(await p.locator('.screen.active').getAttribute('id'), 'wq');
  await p.evaluate(() => window.appBack());
  await p.evaluate(() => window.appBack());

  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForFunction(() => document.documentElement.classList.contains('reduced-motion'));
  await p.locator('#setBtn').click();
  await p.waitForFunction(() => document.activeElement.closest('.modal')?.id === 'setModal');
  await p.keyboard.press('Shift+Tab');
  assert.equal(await p.evaluate(() => document.activeElement.closest('.modal')?.id), 'setModal');
  assert.equal(await p.locator('#menu').getAttribute('inert'), '');
  await p.locator('#setModal [data-app="motion"]').getByText('Normaal', { exact: true }).click();
  await p.waitForFunction(() => !document.documentElement.classList.contains('reduced-motion'));
  assert.equal(await p.evaluate(() => document.activeElement.closest('.modal')?.id), 'setModal');
  await p.locator('#setModal [data-app="motion"]').getByText('Minder', { exact: true }).click();
  await p.waitForFunction(() => document.documentElement.classList.contains('reduced-motion'));
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.activeElement.id === 'setBtn');

  const before = await p.evaluate(() => JSON.stringify(localStorage));
  await p.evaluate(() => window.onBackupLoaded('{"format":"renes-spelletjes-backup","data":null}'));
  assert.equal(await p.evaluate(() => JSON.stringify(localStorage)), before);
  assert.ok(await p.locator('#menuToast').innerText());
  await p.evaluate(() => { window.backupResult = window.onBackupLoaded(RenePersistence.createBackup(localStorage, '1.53')); });
  await p.locator('#askModal.show').waitFor();
  await p.locator('#askNo').click();
  await p.evaluate(() => window.backupResult);
  assert.equal(await p.evaluate(() => JSON.stringify(localStorage)), before);

  await p.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  await p.evaluate(() => {
    const backup = JSON.parse(RenePersistence.createBackup(localStorage, '1.53'));
    backup.data['sd.stats'] = '{"won":7}';
    window.backupResult = window.onBackupLoaded(JSON.stringify(backup));
  });
  await p.locator('#askYes').click();
  await p.evaluate(() => window.backupResult);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('sd.stats')).won), 7);
  assert.equal(await p.evaluate(() => localStorage.getItem('unrelated')), 'keep');
  await p.waitForTimeout(1000);

  await p.evaluate(() => {
    localStorage.setItem('app.profiles', JSON.stringify([{ id: 'p0', name: 'Rene', avatar: '🦊' }, { id: 'pabc', name: 'Alex', avatar: '🐻' }]));
    localStorage.setItem('p_pabc.bs.settings', '{"aim":false,"cb":false}');
  });
  await p.locator('#setBtn').click();
  await p.locator('#setModal [data-app="colorblind"]').getByText('Aan', { exact: true }).click();
  await p.waitForTimeout(750);
  assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('p_pabc.bs.settings'))), { aim: false, cb: true });
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('bh.settings')).cb), true);
  for (const width of [320, 390, 768, 1280]) {
    await p.setViewportSize({ width, height: 844 });
    assert.ok(await p.locator('#menu').evaluate(el => el.scrollWidth <= el.clientWidth), `Menu overflow at ${width}`);
  }
  assert.deepEqual(errors, []);
  await context.close();

  const failed = await browser.newContext();
  await failed.addInitScript(() => {
    localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}');
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'rk.save') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const f = await failed.newPage();
  await f.goto(appURL);
  await f.locator('#tileRk').click();
  await f.locator('#rkStart').click();
  assert.ok(await f.locator('#saveWarning').isVisible());
  assert.equal(await f.evaluate(() => localStorage.getItem('rk.save')), null);
  await failed.close();
  console.log('PASS: discovery, daily quiz, keyboard dialogs, motion, backup validation/restore, profile color help, responsive menu and quota warning');
} finally {
  await browser.close();
}
