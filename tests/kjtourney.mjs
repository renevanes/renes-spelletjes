// Klaverjas tournament: two versions of the computer players against each other, duplicate format.
// Every deal is played twice with the same cards in the same seats: once A sits at "wij" (seats 0+2) and B at "zij"
// (seats 1+3), once the other way round, so the cards cancel out and only the playing (and bidding) counts.
// Bidding is included. Runs in Node (no browser) with worker threads.
//
//   node tests/kjtourney.mjs                         # 400 deals, new vs old (baseline = tests/fixtures/kj-baseline.js)
//   node tests/kjtourney.mjs --deals 100 --scale 3   # quicker: time budgets feel 3x shorter (like a slower phone)
//   node tests/kjtourney.mjs --a new --b new --bset dd=8      # new against a variant of itself (AIP overrides)
// Options: --deals N  --seed S  --workers W  --scale S (time runs S x faster: emulates a slower device)
//          --bidding vrij|verplicht|gedraaid|mix  --variant rotterdams|amsterdams|mix  --under nee|mag|moet  --roem 1|0
//          --a/--b new|old|file.js|file.html  --bidwith a|b (everybody bids like A or B: compares only the card play)
//          --playwith a|b|heur (everybody plays the cards like A, B or the new rule-of-thumb player: compares only the bidding)
//          --alevel/--blevel moeilijk|normaal|makkelijk  --aset/--bset k=v,k=v  --json file  --quiet
// Reports the mean score difference A - B per deal with a 95% confidence interval and A's win rate per play.
// The time budgets are real (performance.now), so results depend a little on the machine and on other load.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { loadKj, rng } from './kjload.mjs';

const DECK = []; for (let s = 0; s < 4; s++) for (const r of [7, 8, 9, 10, 11, 12, 13, 1]) DECK.push(s * 13 + r - 1);
const team = p => p % 2;

function parseArgs(argv) {
  const a = { deals: 400, seed: 1, workers: Math.max(1, Math.min(os.cpus().length, 8)), scale: 1, bidding: 'vrij', variant: 'rotterdams', under: 'nee', roem: '1',
    a: 'new', b: 'old', alevel: 'moeilijk', blevel: 'moeilijk', aset: '', bset: '', bidwith: '', playwith: '', json: '', quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'quiet') { a.quiet = true; continue; }
    if (!(k in a)) throw new Error('unknown option ' + argv[i]);
    a[k] = typeof a[k] === 'number' ? +argv[++i] : argv[++i];
  }
  return a;
}
const pick = (v, i, list) => v === 'mix' ? list[i % list.length] : v;

// one deal from start (bidding) to end; side[t] = module playing for team t
export function playDeal(side, deal, bidder = null, player = null) {
  const { hands, dealer, bidding, proposed, variant } = deal;
  const G = { round: 1, rounds: 16, dealer, total: [0, 0], log: [], variant, hands: hands.map(h => h.slice()), dealt: hands.map(h => h.slice()),
    trump: null, bidding, proposed: bidding === 'gedraaid' ? proposed : null, verzaakt: null, chooser: null, trick: [], played: [], lastTrick: null,
    pts: [0, 0], roem: [0, 0], tricks: [0, 0], phase: 'bid', bidTurn: (dealer + 1) % 4, passes: 0, bids: [], tricksLog: [], prevTricks: [] };
  G.leader = (dealer + 1) % 4; G.turn = G.leader;
  const ms = { bid: [0, 0], play: [0, 0], nPlay: [0, 0], maxPlay: [0, 0] };
  for (let guard = 0; G.phase === 'bid'; guard++) {
    if (guard > 12) throw new Error('bidding does not end');
    const p = G.bidTurn, m = bidder || side[team(p)], forced = G.bidding === 'verplicht' || G.passes >= 4;
    m.G = G; const t0 = performance.now();
    const s = m.bid(p, forced, G.bidding === 'gedraaid' ? G.proposed : null);
    ms.bid[team(p)] += performance.now() - t0;
    if (s >= 0) { G.bids.push({ p, s }); G.trump = s; G.chooser = p; G.phase = 'play'; }
    else { if (forced) throw new Error('forced bidder passed'); G.bids.push({ p, s: -1 }); G.passes++; G.bidTurn = (p + 1) % 4; }
  }
  while (G.hands.some(h => h.length)) {
    const p = G.turn, m = player || side[team(p)];
    m.G = G; const L = m.legal(p), t0 = performance.now();
    const c = L.length === 1 ? L[0] : m.aiPlay(p);
    if (L.length > 1) { const dt = performance.now() - t0; ms.play[team(p)] += dt; ms.nPlay[team(p)]++; ms.maxPlay[team(p)] = Math.max(ms.maxPlay[team(p)], dt); }
    if (!L.includes(c)) throw new Error(`illegal card ${c} by ${p}`);
    G.hands[p].splice(G.hands[p].indexOf(c), 1); G.trick.push({ p, c }); G.played.push(c);
    if (G.trick.length < 4) { G.turn = (p + 1) % 4; continue; }
    const w = m.winnerOf(G.trick), tm = team(w.p), r = G.roem != null && deal.roem ? m.roemOf(G.trick) : 0;
    const last = G.hands.every(h => !h.length), pts = G.trick.reduce((a, x) => a + m.points(x.c), 0) + (last ? 10 : 0);
    G.pts[tm] += pts; G.roem[tm] += r; G.tricks[tm]++;
    G.tricksLog.push({ t: G.trick.slice(), w: w.p, pts, roem: r });
    G.lastTrick = G.trick; G.trick = []; G.leader = w.p; G.turn = w.p;
  }
  const pl = team(G.chooser), op = 1 - pl, roem = G.roem.slice();
  if (G.tricks[pl] === 8) roem[pl] += 100; if (G.tricks[op] === 8) roem[op] += 100;
  const tot = t => G.pts[t] + roem[t], score = [tot(0), tot(1)];
  const nat = tot(pl) <= tot(op); if (nat) { score[op] = 162 + roem[0] + roem[1]; score[pl] = 0; }
  return { score, chooser: G.chooser, trump: G.trump, nat, ms };
}

export function makeDeal(seed, i, o) {
  const r = rng(seed * 100003 + i * 7919 + 17), d = DECK.slice();
  for (let k = d.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [d[k], d[j]] = [d[j], d[k]]; }
  return { hands: [0, 1, 2, 3].map(p => d.slice(p * 8, p * 8 + 8)), dealer: i % 4, proposed: Math.floor(r() * 4),
    bidding: pick(o.bidding, i, ['vrij', 'gedraaid', 'verplicht']), variant: pick(o.variant, i >> 1, ['rotterdams', 'amsterdams']), roem: o.roem !== '0' };
}

function loadSide(which, level, set, o, seed) {
  const m = loadKj(which, { seed, timeScale: o.scale, settings: { level, under: o.under, roem: o.roem !== '0', bidding: o.bidding, variant: 'rotterdams' } });
  const aip = m.x.AIP;
  for (const kv of set.split(',').filter(Boolean)) { const [k, v] = kv.split('='); if (!aip) throw new Error('no AIP in ' + which); aip[k] = isNaN(+v) ? v : +v; }
  // points of a card (same table in both versions)
  const TP = { 11: 20, 9: 14, 1: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 }, NP = { 1: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 };
  m.points = c => (Math.floor(c / 13) === m.G.trump ? TP : NP)[(c % 13) + 1];
  return m;
}

if (isMainThread && process.argv[1] && process.argv[1].endsWith('kjtourney.mjs')) {
  const o = parseArgs(process.argv.slice(2));
  const t0 = Date.now(), res = new Array(o.deals);
  let doneN = 0;
  const W = Math.min(o.workers, o.deals);
  if (!o.quiet) console.log(`Klaverjas duplicate: A=${o.a}(${o.alevel}${o.aset ? ' ' + o.aset : ''}) vs B=${o.b}(${o.blevel}${o.bset ? ' ' + o.bset : ''}), ${o.deals} deals, bidding ${o.bidding}, ${o.variant}, scale ${o.scale}, ${W} workers`);
  await Promise.all([...Array(W).keys()].map(w => new Promise((resolve, reject) => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { o, w, W } });
    wk.on('message', m => { res[m.i] = m; doneN++; if (!o.quiet && doneN % 20 === 0) console.log(`  ${doneN}/${o.deals}  ${summary(res.filter(Boolean)).line}  (${Math.round((Date.now() - t0) / 1000)} s)`); });
    wk.on('error', reject); wk.on('exit', resolve);
  })));
  const S = summary(res.filter(Boolean));
  console.log(S.text);
  if (o.json) writeFileSync(o.json, JSON.stringify({ options: o, summary: S.data, deals: res }, null, 1));
} else if (!isMainThread) {
  const { o, w, W } = workerData;
  const A = loadSide(o.a, o.alevel, o.aset, o, o.seed * 31 + w), B = loadSide(o.b, o.blevel, o.bset, o, o.seed * 37 + w + 1000);
  const H = o.playwith === 'heur' ? loadSide('new', 'normaal', '', o, o.seed * 41 + w) : null;
  for (let i = w; i < o.deals; i += W) {
    const deal = makeDeal(o.seed, i, o);
    for (const m of [A, B, H]) if (m) { m.opt.variant = deal.variant; m.opt.bidding = deal.bidding; }
    const bd = o.bidwith === 'a' ? A : o.bidwith === 'b' ? B : null, pw = o.playwith === 'a' ? A : o.playwith === 'b' ? B : o.playwith === 'heur' ? H : null;
    const r1 = playDeal([A, B], deal, bd, pw), r2 = playDeal([B, A], deal, bd, pw);
    const a1 = r1.score[0] - r1.score[1], a2 = r2.score[1] - r2.score[0];
    parentPort.postMessage({ i, a1, a2, net: (a1 + a2) / 2, c1: r1.chooser, c2: r2.chooser, t1: r1.trump, t2: r2.trump, nat1: r1.nat, nat2: r2.nat,
      msA: [r1.ms.play[0] + r2.ms.play[1], r1.ms.nPlay[0] + r2.ms.nPlay[1], Math.max(r1.ms.maxPlay[0], r2.ms.maxPlay[1])],
      msB: [r1.ms.play[1] + r2.ms.play[0], r1.ms.nPlay[1] + r2.ms.nPlay[0], Math.max(r1.ms.maxPlay[1], r2.ms.maxPlay[0])],
      bidA: r1.ms.bid[0] + r2.ms.bid[1], bidB: r1.ms.bid[1] + r2.ms.bid[0] });
  }
}

export function summary(rs) {
  const n = rs.length; if (!n) return { line: '', text: 'no results', data: {} };
  const nets = rs.map(r => r.net), mean = nets.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(nets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)), se = sd / Math.sqrt(n);
  const plays = rs.flatMap(r => [r.a1, r.a2]), wins = plays.filter(x => x > 0).length, ties = plays.filter(x => x === 0).length;
  const wr = (wins + ties / 2) / plays.length, wse = Math.sqrt(wr * (1 - wr) / plays.length);
  const pairsWon = nets.filter(x => x > 0).length, pairsLost = nets.filter(x => x < 0).length;
  const same = rs.filter(r => r.c1 === r.c2 && r.t1 === r.t2).length;
  const sumMs = (k) => { const t = rs.reduce((a, r) => a + r[k][0], 0), c = rs.reduce((a, r) => a + r[k][1], 0); return [t / Math.max(1, c), Math.max(...rs.map(r => r[k][2]))]; };
  const [aAvg, aMax] = sumMs('msA'), [bAvg, bMax] = sumMs('msB');
  const data = { deals: n, meanPerDeal: mean, ci95: [mean - 1.96 * se, mean + 1.96 * se], sd, winRate: wr, winRateCi95: [wr - 1.96 * wse, wr + 1.96 * wse],
    pairsWon, pairsLost, pairsEqual: n - pairsWon - pairsLost, sameContract: same, msA: { avg: aAvg, max: aMax }, msB: { avg: bAvg, max: bMax } };
  const f = x => (x >= 0 ? '+' : '') + x.toFixed(1);
  const line = `A ${f(mean)} ±${(1.96 * se).toFixed(1)} per deal, win ${(wr * 100).toFixed(1)}%`;
  const text = `\nResult over ${n} duplicate deals (${2 * n} plays):\n` +
    `  A - B score per deal: ${f(mean)}  (95% CI ${f(data.ci95[0])} .. ${f(data.ci95[1])}, sd ${sd.toFixed(1)})\n` +
    `  A wins ${(wr * 100).toFixed(1)}% of the plays (95% CI ${(data.winRateCi95[0] * 100).toFixed(1)}..${(data.winRateCi95[1] * 100).toFixed(1)}%), ties ${ties}\n` +
    `  duplicate pairs: A better ${pairsWon}, B better ${pairsLost}, equal ${data.pairsEqual}; same contract in both plays: ${same}\n` +
    `  think time per card (ms): A avg ${aAvg.toFixed(0)} max ${aMax.toFixed(0)}, B avg ${bAvg.toFixed(0)} max ${bMax.toFixed(0)}`;
  return { line, text, data };
}
