import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const land = process.argv[2] === 'land', file = process.argv[3] || 'app/src/main';
const b = await chromium.launch({executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)});
const p = await (await b.newContext(land ? {...devices['Pixel 7 landscape']} : {...devices['Pixel 7']})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.addInitScript(()=>localStorage.setItem('app.cfg','{"seen":"9.99"}'));
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); void file; await p.waitForTimeout(400);
if (!land) await p.screenshot({path:'gfx/sd_menu.png'});
await p.tap('#tileSd'); await p.waitForTimeout(400); await p.screenshot({path:`gfx/sd_start${land?'L':''}.png`});
// generator quality
console.log(await p.evaluate(() => { const out = {}; for (const l of ['makkelijk', 'normaal', 'moeilijk']) { const r = []; for (let k = 0; k < 6; k++) { const t = performance.now(); const { puz, sol } = __sd.generate(l); const ms = performance.now() - t; const u = __sd.solve(puz.slice(), 2).count; const ok = __sd.solve(puz.slice(), 1).first.join() === sol.join(); r.push(`${puz.filter(Boolean).length}c ${Math.round(ms)}ms u${u}${ok ? '' : ' BAD'}`); } out[l] = r.join(' | '); } return out; }));
await p.tap('#sdGo'); await p.waitForTimeout(500);
// play like a person: tap cells and the number pad
const S0 = await p.evaluate(() => ({ puz: __sd.S.puz, sol: __sd.S.sol }));
const empties = S0.puz.map((v, i) => v ? -1 : i).filter(i => i >= 0);
const tapCell = i => p.tap(`#sdBoard .sd-c[data-i="${i}"]`), tapNum = d => p.tap(`#sdPad button[data-d="${d}"]`);
await tapCell(empties[0]); await tapNum(S0.sol[empties[0]]);
await tapCell(empties[1]); await tapNum(S0.sol[empties[1]] % 9 + 1);           // a wrong number
await p.tap('#sdTools [data-t="pencil"]'); await tapCell(empties[2]); for (const d of [1, 4, 7, S0.sol[empties[2]]]) await tapNum(d); await p.tap('#sdTools [data-t="pencil"]');
await tapCell(empties[3]); await p.waitForTimeout(150);
await p.screenshot({path:`gfx/sd_play${land?'L':''}.png`});
console.log('mistakes', await p.textContent('#sdMist'), 'bad cells', await p.evaluate(()=>document.querySelectorAll('.sd-c.bad').length), 'notes', await p.evaluate(()=>document.querySelectorAll('.sd-n').length));
await p.tap('#sdTools [data-t="undo"]'); await p.tap('#sdTools [data-t="undo"]'); await p.tap('#sdTools [data-t="undo"]'); await p.tap('#sdTools [data-t="undo"]'); await p.tap('#sdTools [data-t="undo"]');
console.log('after undo bad', await p.evaluate(()=>document.querySelectorAll('.sd-c.bad').length), 'val', await p.evaluate(i=>__sd.S.val[i], empties[1]));
await p.tap('#sdTools [data-t="hint"]');
// leave and come back: saved game resumes
await p.tap('#sdBack'); await p.waitForTimeout(200); console.log('badge', await p.evaluate(()=>document.querySelector('#tileSd').classList.contains('has-save')));
await p.tap('#tileSd'); await p.waitForTimeout(300); console.log('resumed', await p.evaluate(()=>!!__sd.S && !document.querySelector('#sdStartModal').classList.contains('show')));
await p.evaluate(() => { const S = __sd.S; for (let i = 0; i < 81; i++) if (S.val[i] !== S.sol[i]) { __sd.select(i); __sd.place(S.sol[i]); } });
await p.waitForTimeout(1500); await p.screenshot({path:`gfx/sd_win${land?'L':''}.png`});
console.log('win', await p.textContent('#sdEndText'), errs);
await b.close();
