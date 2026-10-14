import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('zs.settings', '{"sound":false}'); } });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(500);
let ok = true; const check = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) ok = false; };
const st = () => p.evaluate(() => __sfx._state());
const cfg = () => p.evaluate(() => JSON.parse(localStorage.getItem('app.cfg')));
// menu quick panel
await p.tap('#muteBtn'); await p.waitForTimeout(300);
check('sound panel opens', await p.isVisible('#sndModal'));
check('panel has both rows', (await p.textContent('#sndBody')).includes('Achtergrondmuziek') && (await p.textContent('#sndBody')).includes('Geluidseffecten'));
await p.tap('#sndBody button[data-app="music"][data-val=\'"uit"\']'); await p.waitForTimeout(150);
check('music off saved', (await cfg()).music === 'uit'); check('icon 🔔', (await p.textContent('#muteBtn')) === '🔔');
await p.tap('#sndBody button[data-app="sfxVol"][data-val=\'"uit"\']'); await p.waitForTimeout(150);
check('sfx off saved', (await cfg()).sfxVol === 'uit'); check('icon 🔇', (await p.textContent('#muteBtn')) === '🔇');
await p.tap('#sndBody button[data-app="music"][data-val=\'"normaal"\']'); await p.tap('#sndBody button[data-app="sfxVol"][data-val=\'"normaal"\']'); await p.waitForTimeout(150);
check('icon back 🔊', (await p.textContent('#muteBtn')) === '🔊');
await p.tap('#sndModal [data-close]'); await p.waitForTimeout(300);
// Zeeslag: old setting "sound off" migrates to music off too; then music on separately
await p.tap('#tileZs'); await p.waitForTimeout(800);
const zsTxt = await p.textContent('#zsStartList');
check('zs rows', zsTxt.includes('Geluidseffecten') && zsTxt.includes('Achtergrondmuziek'));
check('zs migrated music off', await p.isVisible('#zsStartList button[data-key="music"][data-val="false"].on'));
await p.waitForTimeout(1500); check('zs no music while off', !(await st()).now, JSON.stringify(await st()));
await p.tap('#zsStartList button[data-key="music"][data-val="true"]'); await p.waitForTimeout(150);
let s; for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); s = await st(); if (s.now === 'zs') break; }
check('zs music on, effects still off', s.now === 'zs' && JSON.parse(await p.evaluate(() => localStorage.getItem('zs.settings'))).sound === false, JSON.stringify(s));
await p.tap('#zsStartList button[data-key="music"][data-val="false"]'); await p.waitForTimeout(1200);
check('zs music off again', !(await st()).now);
await p.evaluate(() => window.appBack()); await p.waitForTimeout(600);
// Mijnenveger
await p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
await p.evaluate(() => openGame('ms')); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('#msOptBtn').click()); await p.waitForTimeout(300);
check('ms music row', await p.isVisible('#msMusicOpt button[data-mus="false"]'));
await p.tap('#msMusicOpt button[data-mus="false"]'); await p.waitForTimeout(150);
check('ms music saved', JSON.parse(await p.evaluate(() => localStorage.getItem('ms.settings'))).music === false);
await p.evaluate(() => window.appBack()); await p.waitForTimeout(300); await p.evaluate(() => window.appBack()); await p.waitForTimeout(300);
// Spoorsprinter
await p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
await p.evaluate(() => openGame('rs')); await p.waitForTimeout(600);
check('rs music button', (await p.textContent('#rsMusic')).includes('🎵'));
await p.tap('#rsMusic'); await p.waitForTimeout(200);
check('rs music saved', JSON.parse(await p.evaluate(() => localStorage.getItem('rs.data'))).music === false, await p.textContent('#rsMusic'));
await p.evaluate(() => window.appBack()); await p.waitForTimeout(300);
// every game's options mention both
const html = await p.evaluate(() => document.documentElement.outerHTML);
check('no "Geluid en muziek" left', !html.includes('Geluid en muziek'));
// settings page has Uit for effects
await p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
await p.evaluate(() => { if (window.appBack) window.appBack(); }); await p.waitForTimeout(300);
await p.tap('#setBtn'); await p.waitForTimeout(400);
check('settings effects Uit', await p.isVisible('#setBody button[data-app="sfxVol"][data-val=\'"uit"\']'));
check('no console errors', !errs.length, JSON.stringify(errs));
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close();
