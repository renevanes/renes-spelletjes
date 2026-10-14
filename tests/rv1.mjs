import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const p = await (await b.newContext({...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d => { errs.push('native dialog: ' + d.message()); d.dismiss(); });
await p.addInitScript(()=>{ localStorage.setItem('app.cfg','{"seen":"9.99"}'); });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(800);
const vis = id => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
// 1. a game modal from a late timer must not appear on the menu
await p.tap('#tileMs'); await p.waitForTimeout(300); await p.tap('#msGo'); await p.waitForTimeout(200);
await p.evaluate(() => { __ms.reveal(0); const m = __ms.S.mine.findIndex(Boolean); __ms.reveal(m); appBack(); });
await p.waitForTimeout(3500); console.log('mines end modal shown on menu after leaving:', await vis('msEndModal'), await p.evaluate(() => document.querySelector('.screen.active').id));
// 2. start modal is not closed by tapping the backdrop; back leaves the game
await p.tap('#tileMs'); await p.waitForTimeout(300); await p.evaluate(() => { if (!document.getElementById('msStartModal').classList.contains('show')) document.getElementById('msNew').click(); }); await p.waitForTimeout(200);
await p.mouse.click(5, 5); await p.waitForTimeout(200); console.log('ms start still open after backdrop tap:', await vis('msStartModal'));
await p.evaluate(() => appBack()); await p.waitForTimeout(200); console.log('after back screen:', await p.evaluate(() => document.querySelector('.screen.active').id));
// 3. Patience: play a move, wipe Patience via settings with the in-app confirm, check it stays wiped after reload
await p.tap('#tilePatience'); await p.waitForTimeout(500); await p.evaluate(() => appBack()); await p.waitForTimeout(300);
console.log('patience save before wipe:', await p.evaluate(() => !!localStorage.getItem('patience.save')));
await p.click('#setBtn'); await p.waitForTimeout(300);
await p.click('#setBody [data-wipe="patience"]').catch(e => console.log('no wipe button', e.message.slice(0, 60)));
await p.waitForTimeout(300); console.log('ask dialog shown:', await vis('askModal'), await p.textContent('#askTitle'));
await p.click('#askYes'); await p.waitForTimeout(2500);
console.log('patience save after wipe+reload:', await p.evaluate(() => !!localStorage.getItem('patience.save')));
// 4. Klaverjas: new game in the middle of a trick must not freeze
await p.tap('#tileKj'); await p.waitForTimeout(800);
const r = await p.evaluate(async () => {
  const K = __kj; const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 60 && K.G.phase !== 'play'; i++) { if (K.G.phase === 'bid' && K.G.bidTurn === 0) { document.querySelector('#kjBid [data-s], #kjBid button')?.click(); } await wait(200); }
  return K.G.phase;
});
console.log('kj phase', r);
await p.evaluate(() => { const o = __kj.opt; o.collect = 'tik'; });
const r2 = await p.evaluate(async () => {
  const K = __kj; const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && K.G.trick.length < 4; i++) { if (K.G.phase === 'play' && K.G.turn === 0) K.play(0, K.legal(0)[0]); await wait(150); }
  const before = K.G.trick.length; document.querySelector('#kjNew, [data-kj="new"]');
  return before;
});
console.log('trick length before new game', r2);
await p.evaluate(() => { __kj.G = null; }); // simulate "Nieuw potje"
const r3 = await p.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); appBack(); await wait(200); document.getElementById('tileKj').click(); await wait(800);
  const K = __kj; for (let i = 0; i < 80 && !(K.G.phase === 'play' && K.G.turn === 0); i++) { if (K.G.phase === 'bid' && K.G.bidTurn === 0) document.querySelector('#kjBid button')?.click(); await wait(150); }
  const n = K.G.hands[0].length; if (K.G.phase === 'play' && K.G.turn === 0) K.play(0, K.legal(0)[0]); await wait(300); return [K.G.phase, n, K.G.hands[0].length]; });
console.log('kj after new game (phase, cards before, after play):', r3);
// 5. Sudoku moeilijk
console.log('sudoku moeilijk clues:', await p.evaluate(() => { const o = []; for (let i = 0; i < 10; i++) o.push(__sd.generate('moeilijk').puz.filter(Boolean).length); return o.join(','); }));
// 6. Kabouters: plate pit is walkable
await p.evaluate(() => appBack()); await p.waitForTimeout(300); await p.tap('#tileKb'); await p.waitForTimeout(500);
console.log('errs', errs);
await b.close();
