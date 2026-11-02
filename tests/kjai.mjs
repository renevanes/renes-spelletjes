// Klaverjas computer players: the "beginnersfouten" suite (tests/kjpos.mjs) plus a short tournament smoke check.
//   node tests/kjai.mjs             # positions in the browser on build/web/index.html (APP_HTML), level Moeilijk,
//                                   # each position 3x; then 4 duplicate deals new vs old in Node (legal moves, timing)
//   node tests/kjai.mjs --compare   # also: the same positions for the old computer players and for "Normaal" (Node)
//   node tests/kjai.mjs --only id   # one position;  --node: skip the browser part (quick check of the source)
import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
import { POSITIONS, buildG, judge, shown } from './kjpos.mjs';
import { loadKj, rng } from './kjload.mjs';
import { playDeal, makeDeal } from './kjtourney.mjs';

const args = process.argv.slice(2), compare = args.includes('--compare'), onlyId = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const REPS = 3, list = POSITIONS.filter(p => !onlyId || p.id === onlyId);
let ok = true; const check = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) ok = false; };

// ---- 1. positions in the browser, with the build that ships ----
const R = rng(12345);
if (!args.includes('--node')) {
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kj.settings', JSON.stringify({ speed: 'turbo', level: 'moeilijk', rounds: 4, lv2: true })); });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(400);
for (const pos of list) {
  const got = [];
  for (let k = 0; k < REPS; k++) {
    const st = buildG(pos, R);
    got.push(await p.evaluate(({ st, pos }) => {
      const K = __kj; K.opt.level = 'moeilijk'; K.opt.variant = st.G.variant; K.opt.bidding = st.G.bidding; K.opt.under = pos.under || 'nee'; K.opt.roem = true;
      K.G = st.G; const t0 = performance.now();
      const c = pos.bid ? K.aiBidStrong(st.mover, st.forced, st.only) : K.aiPlay(st.mover);
      return { c, ms: performance.now() - t0 };
    }, { st, pos }));
  }
  const good = got.filter(g => judge(pos, g.c)).length;
  check(`${pos.id}: ${pos.note}`, good === REPS, `→ ${got.map(g => shown(pos, g.c)).join(' ')} (${Math.max(...got.map(g => g.ms)).toFixed(0)} ms)`);
}
const du = await p.evaluate(() => { const ms = __kj.AIP.ms; __kj.AIP.ms = 40; try { return __kj.duel(1); } finally { __kj.AIP.ms = ms; } });
check('test hook duel() still works', du && typeof du.diff === 'number', JSON.stringify(du));
check('no page errors', !errs.length, JSON.stringify(errs));
await b.close();
}

// ---- 2. optional: the same positions for the old computer players and for "Normaal" (Node, source files) ----
if (compare) {
  const rows = [];
  for (const [label, which, level] of [['oud Moeilijk', 'old', 'moeilijk'], ['nieuw Moeilijk', 'new', 'moeilijk'], ['nieuw Normaal', 'new', 'normaal'], ['oud Normaal', 'old', 'normaal']]) {
    const m = loadKj(which, { seed: 99, settings: { level } });
    let pass = 0; const fails = [];
    for (const pos of list) {
      let good = 0; const got = [];
      for (let k = 0; k < REPS; k++) {
        const st = buildG(pos, R); m.G = st.G;
        Object.assign(m.opt, { level, variant: st.G.variant, bidding: st.G.bidding, under: pos.under || 'nee', roem: true });
        const c = pos.bid ? m.bid(st.mover, st.forced, st.only) : m.aiPlay(st.mover);
        got.push(shown(pos, c)); if (judge(pos, c)) good++;
      }
      if (good === REPS) pass++; else fails.push(`${pos.id} (${got.join(' ')})`);
    }
    rows.push(`${label.padEnd(15)} ${pass}/${list.length}` + (fails.length ? `   fout: ${fails.join(', ')}` : ''));
  }
  console.log('\nBeginnersfouten (alle ' + REPS + ' keer goed):\n  ' + rows.join('\n  '));
}

// ---- 3. tournament smoke check: a few duplicate deals new vs old, real time budgets ----
if (!onlyId) {
  const o = { bidding: 'mix', variant: 'mix', roem: '1' };
  const mk = (which, seed) => { const m = loadKj(which, { seed, settings: { level: 'moeilijk' } }); const TP = { 11: 20, 9: 14, 1: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 }, NP = { 1: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 }; m.points = c => (Math.floor(c / 13) === m.G.trump ? TP : NP)[(c % 13) + 1]; return m; };
  const A = mk('new', 5), B = mk('old', 6);
  let net = 0, maxMs = 0, errors = 0;
  for (let i = 0; i < 4; i++) {
    const deal = makeDeal(77, i, o);
    for (const m of [A, B]) { m.opt.variant = deal.variant; m.opt.bidding = deal.bidding; }
    try {
      const r1 = playDeal([A, B], deal), r2 = playDeal([B, A], deal);
      net += (r1.score[0] - r1.score[1] + r2.score[1] - r2.score[0]) / 2;
      maxMs = Math.max(maxMs, r1.ms.maxPlay[0], r2.ms.maxPlay[1]);
    } catch (e) { errors++; console.log(e.stack); }
  }
  check('tournament smoke: 4 duplicate deals new vs old without errors or illegal cards', errors === 0, `new - old ${net >= 0 ? '+' : ''}${(net / 4).toFixed(1)} per deal`);
  check('tournament smoke: think time per card within budget', maxMs < 700, `max ${maxMs.toFixed(0)} ms`);
}
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
process.exit(ok ? 0 : 1);
