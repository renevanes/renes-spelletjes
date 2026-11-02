// Klaverjas: how long the computer players take per turn in the browser, with optional CPU throttling.
//   node tests/kjtiming.mjs [rate=1] [speed=normaal] [warmup s=35]
// e.g. `node tests/kjtiming.mjs 6 normaal 120` (6x slower CPU; the first ~30 s after the first tap the app pre-renders
// its sound bank, so measuring starts after the warm-up). Plays Moeilijk with the human seat on autopilot and prints the
// time per computer turn (incl. the normal turn delay), the thinking time and the longest slice of thinking work.
import { existsSync } from 'node:fs';
import { chromium, devices } from 'playwright';
const rate = +(process.argv[2] || 1), speed = process.argv[3] || 'normaal', warm = +(process.argv[4] || 35);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(s => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kj.settings', JSON.stringify({ speed: s, level: 'moeilijk', rounds: 16, lv2: true, bidding: 'vrij' })); }, speed);
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(500);
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await p.evaluate(() => {
  window.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ entryTypes: ['longtask'] });
  window.__turns = []; let last = { k: '', t: performance.now() };      // how long each state lasts (a computer turn ends when it acts)
  setInterval(() => { const G = __kj.G; if (!G) return; const k = G.phase + ':' + (G.phase === 'bid' ? 'b' + G.bidTurn + ':' + (G.bids || []).length : 't' + G.turn + ':' + G.played.length + ':' + G.trick.length);
    if (k !== last.k) { window.__turns.push({ k: last.k, ms: performance.now() - last.t }); last = { k, t: performance.now() }; } }, 5);
});
await p.tap('#tileKj'); await p.waitForTimeout(300);
const t0 = Date.now(); let reset = false, r0 = 0;
for (let i = 0; i < 20000 && Date.now() - t0 < 600000; i++) {
  if (!reset && Date.now() - t0 > warm * 1000) { reset = true; r0 = await p.evaluate(() => __kj.G.round); await p.evaluate(() => { window.__turns.length = 0; window.__lt.length = 0; if (__kj.thinkLog) __kj.thinkLog.length = 0; }); }
  const st = await p.evaluate(() => { const G = __kj.G; if (!G) return 'none';
    if (document.querySelector('#kjResModal.show')) return 'res';
    if (G.phase === 'bid' && G.bidTurn === 0) { const bt = document.querySelector('#kjBid button[data-s="-1"]') || document.querySelector('.kj-suits button'); bt && bt.click(); return 'bid'; }
    if (G.phase === 'play' && G.turn === 0 && G.trick.length < 4) { __kj.play(0, __kj.aiHeur(0)); return 'me'; } return 'wait'; });
  if (st === 'res') { const n = await p.evaluate(() => __kj.G.round); if (reset && n >= r0 + 2) break; await p.tap('#kjResNext'); }
  await p.waitForTimeout(40);
}
const r = await p.evaluate(() => ({ turns: window.__turns, lt: window.__lt, think: (__kj.thinkLog || []).slice() }));
const ai = r.turns.filter(t => /b[123]:/.test(t.k) || /t[123]:\d+:[0-3]$/.test(t.k));
const play = ai.filter(t => t.k.startsWith('play')), bid = ai.filter(t => t.k.startsWith('bid'));
const st = a => a.length ? `n ${a.length}, avg ${(a.reduce((x, y) => x + y.ms, 0) / a.length).toFixed(0)} ms, max ${Math.max(...a.map(x => x.ms)).toFixed(0)} ms` : 'none';
console.log(`CPU x${rate}, speed ${speed}: computer card turns ${st(play)}; bid turns ${st(bid)}; longest main-thread task ${Math.max(0, ...r.lt).toFixed(0)} ms (${r.lt.length} long tasks > 50 ms)`);
const th = r.think; if (th.length) console.log(`thinking: n ${th.length}, avg ${(th.reduce((a, x) => a + x.ms, 0) / th.length).toFixed(0)} ms, max ${Math.max(...th.map(x => x.ms)).toFixed(0)} ms; longest slice ${Math.max(...th.map(x => x.longest)).toFixed(0)} ms`);
console.log('errors', JSON.stringify(errs));
await b.close();
process.exit(errs.length ? 1 : 0);
