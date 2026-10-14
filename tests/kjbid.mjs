import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const LAND = process.argv[2] === 'land'; const p = await (await b.newContext({ ...devices['Pixel 7'], ...(LAND ? { viewport: { width: 915, height: 412 } } : {}) })).newPage(); const tag = LAND ? 'L' : '';
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kj.settings', JSON.stringify({ speed: 'normaal', level: 'normaal', rounds: 4 })); });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(500);
await p.tap('#tileKj'); await p.waitForTimeout(300);
let ok = true; const check = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) ok = false; };
// force a deal where the player is 3rd to choose and the computers pass
const st = () => p.evaluate(() => ({ ph: __kj.G.phase, bt: __kj.G.bidTurn, bids: __kj.G.bids, info: document.querySelector('#kjBidInfo').innerText, show: document.querySelector('#kjBidInfo').classList.contains('show'), seats: [...document.querySelectorAll('.kj-seat')].map(e => e.innerText.replace(/\n/g, ' ')), bid: document.querySelector('#kjBid').innerText.replace(/\n/g, ' ') }));
let s = await st(); console.log(JSON.stringify(s));
check('overview shown in bid phase', s.show && s.ph === 'bid');
await p.screenshot({ path: `gfx/kjbid${tag}_1.png` });
let shot = 2;
for (let i = 0; i < 40; i++) { await p.waitForTimeout(400); s = await st(); if (s.bids && s.bids.length >= 1 && shot === 2) { await p.screenshot({ path: `gfx/kjbid${tag}_2.png` }); shot = 3; console.log(JSON.stringify(s)); } if (s.ph !== 'bid' || s.bt === 0) break; }
console.log(JSON.stringify(s));
if (s.ph === 'bid' && s.bt === 0) {
  await p.screenshot({ path: `gfx/kjbid${tag}_me.png` });
  check('my panel says who passed / first', /gepast|eerste/.test(s.bid), s.bid);
  check('overview says it is my turn', s.info.includes('jij bent aan de beurt') || s.info.includes('jij moet'), s.info);
  await p.evaluate(() => document.querySelector('#kjBid button[data-s="-1"]')?.click());
  await p.waitForTimeout(300); s = await st(); check('my pass recorded', (s.bids || []).some(x => x.p === 0 && x.s < 0), JSON.stringify(s.bids));
}
let seatsAtPlay = [];
for (let i = 0; i < 80; i++) { await p.waitForTimeout(150); s = await st(); if (s.ph !== 'bid') { seatsAtPlay = s.seats; break; } if (s.bt === 0) { await p.screenshot({ path: `gfx/kjbid${tag}_forced.png` }); await p.evaluate(() => document.querySelector('#kjBid button[data-s="1"]').click()); } }
await p.waitForTimeout(250); await p.screenshot({ path: `gfx/kjbid${tag}_after.png` });
s = await st(); console.log(JSON.stringify(s));
check('overview hidden in play', !s.show);
check('"komt uit" shown at start of play', seatsAtPlay.some(x => x.includes('komt uit')), JSON.stringify(seatsAtPlay));
check('no errors', !errs.length, JSON.stringify(errs)); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close();
