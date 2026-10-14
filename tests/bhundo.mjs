import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); });
await p.goto('file://' + (process.argv[2] || (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname))); await p.waitForTimeout(500);
await p.evaluate(() => openGame('bh')); await p.waitForTimeout(500);
const LVL = +(process.argv[3] || 27);
const res = await p.evaluate(async LVL => {
  const H = __bh, wait = ms => new Promise(r => setTimeout(r, ms));
  const idle = async () => { let i = 0; for (; i < 160 && (H.doneIn() > 0 || H.walkers > 0); i++) await wait(50); return i; };
  H.giveCoins(100000);
  const issues = []; let actions = 0;
  for (let game = 0; game < 3; game++) {
    H.startLevel(LVL); await wait(300); document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    for (let step = 0; step < 25; step++) {
      const S = H.S, G = H.G;
      const lose = document.getElementById('bhLoseEndModal').classList.contains('show');
      if (S.won) break;
      let act;
      if (S.lost || lose) act = 'undo';
      else act = Math.random() < .3 && G.undo.length ? 'undo' : 'tap';
      if (act === 'undo') H.useBoost('undo');
      else { const ids = S.V.filter(v => !S.gone[v.id]).map(v => v.id); H.tapVehicle(ids[Math.floor(Math.random() * ids.length)]); }
      actions++;
      const it = await idle(); await wait(300); if (it >= 160) issues.push({ game, step, act, what: 'still busy after 6 s', doneIn: H.doneIn(), walkers: H.walkers });
      // invariants
      const S2 = H.S, VIS = H.VIS; if (!Number.isFinite(H.doneIn())) issues.push({ game, step, act, what: 'timeline NaN' }); if (H.busy()) { await wait(1200); if (H.busy()) issues.push({ game, step, act, what: 'never stops redrawing' }); }
      const front = S2.q[S2.qi];
      const match = S2.bays.some(bb => bb && S2.V[bb.v].c === front && bb.n < S2.V[bb.v].cap);
      if (S2.qi < S2.q.length && match) issues.push({ game, step, act, what: 'front passenger fits a parked bus but did not board', qi: S2.qi, front, bays: S2.bays.map(x => x && [x.v, S2.V[x.v].c, x.n]) });
      S2.bays.forEach((bb, i) => { if (bb && (!VIS[bb.v] || VIS[bb.v].m !== 'bay' || VIS[bb.v].seats !== bb.n)) issues.push({ game, step, act, what: 'visual bay mismatch', i, logic: [bb.v, bb.n], vis: VIS[bb.v] && { m: VIS[bb.v].m, seats: VIS[bb.v].seats } }); });
      const loseNow = document.getElementById('bhLoseEndModal').classList.contains('show');
      if (S2.lost && !loseNow) issues.push({ game, step, act, what: 'lost but no dialog' });
      if (!S2.lost && !S2.won && loseNow) issues.push({ game, step, act, what: 'dialog but not lost' });
      if (issues.length > 6) return { actions, issues };
    }
  }
  return { actions, issues };
}, LVL);
console.log(JSON.stringify(res, null, 0).slice(0, 3000)); console.log('errors', errs); await b.close();
