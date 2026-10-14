import { existsSync as require_exists } from 'node:fs';
// Woordbord test: node wb1.mjs [path-to-index.html]
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'gfx');
const target = process.argv[2] ? 'file://' + path.resolve(process.argv[2]) : 'file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
async function page(opts = {}) {
  const ctx = await b.newContext({ ...devices['Pixel 7'], ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99"}'));
  await p.goto(target); await p.waitForTimeout(400);
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `wb_${n}.png`) });
const vis = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
const ev = (p, f, a) => p.evaluate(f, a);
const I = (r, c) => r * 15 + c;
// board-wide check: every run of 2+ letters is a word in the list
const boardValid = p => ev(p, () => { const B = __wb.S.board, bad = []; for (const d of [0, 1]) for (let l = 0; l < 15; l++) { let w = ''; for (let k = 0; k <= 15; k++) { const c = k < 15 ? B[d ? k * 15 + l : l * 15 + k] : ''; if (c) w += c; else { if (w.length > 1 && !__wb.isWord(w)) bad.push(w); w = ''; } } } return bad; });
const toastTxt = p => ev(p, () => document.getElementById('wbToast').textContent);
async function placeWord(p, r, c, word, dir = 0) {    // put rack tiles on the board via the module (letters must be in the rack)
  await ev(p, ({ r, c, word, dir }) => { const used = new Set(); [...word].forEach((ch, k) => { const lo = ch.toLowerCase(), blank = ch !== lo; const t = __wb.hand.find(x => !used.has(x.id) && x.at < 0 && x.ch === (blank ? '?' : lo)); used.add(t.id); __wb.placeTile(t.id, dir ? (r + k) * 15 + c : r * 15 + c + k); if (blank) { t.as = lo; document.querySelector('#wbBlankModal').classList.remove('show'); } }); }, { r, c, word, dir });
}
const recall = p => ev(p, () => __wb.recallAll());

let p;
try {
p = await page();
ok('tile icon', await ev(p, () => (document.querySelector('#tileWb .art img') || {}).src?.startsWith('data:image/svg')));
await p.evaluate(() => document.querySelector('#tileWb').scrollIntoView({ block: 'center' })); await shot(p, 'menu');
await p.tap('#tileWb'); await p.waitForTimeout(200);
ok('start modal', await vis(p, 'wbStartModal'));
let t0 = Date.now(); while (!(await ev(p, () => !!__wb.dict)) && Date.now() - t0 < 8000) await p.waitForTimeout(50);
const dinfo = await ev(p, () => ({ words: __wb.dict.words, nodes: __wb.dict.nodes, ms: __wb.dict.ms }));
ok('dictionary loads', dinfo.words > 290000, JSON.stringify(dinfo));
ok('words valid', await ev(p, () => ['huis', 'kat', 'fiets', 'zijn', 'ijsje', 'woorden'].map(w => __wb.isWord(w))).then(a => a.every(Boolean)));
ok('words invalid', await ev(p, () => ['xyzq', 'huiz', 'q', 'katx'].map(w => __wb.isWord(w))).then(a => !a.some(Boolean)));
ok('attribution shown', (await ev(p, () => document.getElementById('wbStartModal').textContent)).includes('Woordenlijst: OpenTaal (BSD / CC BY 3.0)'));
await shot(p, 'start');

// ---------- placement rules ----------
await ev(p, () => __wb.newGame({ mode: 'cpu', level: 'normaal', first: 0, layout: 'std', zoom: false }));
await p.waitForTimeout(300);
ok('new game, human first', await ev(p, () => __wb.S.turn === 0 && __wb.hand.length === 7 && __wb.S.bag.length === 90));
await ev(p, () => __wb.setRack('katersq'));
await placeWord(p, 0, 0, 'kat'); await ev(p, () => __wb.play());
ok('first move must cover centre', (await toastTxt(p)).includes('middelste'), await toastTxt(p));
await recall(p);
await ev(p, () => { const h = __wb.hand; __wb.placeTile(h[0].id, 7 * 15 + 6); __wb.placeTile(h[1].id, 7 * 15 + 8); __wb.play(); });
ok('gap rejected', (await toastTxt(p)).includes('gat'), await toastTxt(p));
await recall(p);
await ev(p, () => { const h = __wb.hand; __wb.placeTile(h[0].id, 7 * 15 + 7); __wb.placeTile(h[1].id, 8 * 15 + 8); __wb.play(); });
ok('diagonal rejected', (await toastTxt(p)).includes('rij of in één kolom'), await toastTxt(p));
await recall(p);
await placeWord(p, 7, 5, 'kast'); await p.waitForTimeout(50);
await ev(p, () => { const t = __wb.hand.find(x => x.ch === 'q' && x.at < 0); __wb.placeTile(t.id, 7 * 15 + 9); });   // KASTQ
const prevBad = await ev(p, () => __wb.prev && __wb.prev.score); await p.waitForTimeout(150);
await ev(p, () => __wb.play()); await p.waitForTimeout(120); await shot(p, 'invalid');
ok('invalid word named', (await toastTxt(p)).includes('KASTQ staat niet in de woordenlijst'), await toastTxt(p) + ' preview ' + prevBad);
await recall(p);
await placeWord(p, 7, 6, 'kat');
const prev = await ev(p, () => ({ txt: document.getElementById('wbPrev').textContent, show: document.getElementById('wbPrev').classList.contains('show') }));
ok('live score preview', prev.show && prev.txt === '+6', JSON.stringify(prev));
await ev(p, () => __wb.play()); await p.waitForTimeout(100);
ok('KAT accepted, 6 points', await ev(p, () => __wb.S.scores[0] === 6 && __wb.S.board[112] === 'a' && __wb.S.turn === 1 && __wb.S.racks[0].length === 7));
// computer answers
t0 = Date.now(); while ((await ev(p, () => __wb.S.turn)) !== 0 && Date.now() - t0 < 10000) await p.waitForTimeout(100);
ok('computer moved', await ev(p, () => __wb.S.hist.length === 2 && __wb.S.turn === 0), JSON.stringify(await ev(p, () => __wb.S.hist[1])) + ' cpu ' + (await ev(p, () => __wb.S.cpuMs)) + 'ms');
ok('board valid after cpu move', (await boardValid(p)).length === 0);
await shot(p, 'cpu1');
await ev(p, () => __wb.setRack('huisabe'));
await placeWord(p, 0, 0, 'huis'); await ev(p, () => __wb.play());
ok('not connected rejected', (await toastTxt(p)).includes('aansluiten'), await toastTxt(p));
await recall(p);

// ---------- scoring on known positions (pure rules) ----------
const sc = await ev(p, () => {
  const B = () => Array(225).fill(''), S = __wb.STD, put = (b, r, c, w, d) => { [...w].forEach((ch, k) => b[d ? (r + k) * 15 + c : r * 15 + c + k] = ch); return b; }, T = (r, c, w) => [...w].map((ch, k) => ({ i: r * 15 + c + k, c: ch.toLowerCase(), b: ch !== ch.toLowerCase() }));
  const a = __wb.evaluate(put(B(), 1, 0, 'ik', 1), T(0, 0, 'huis'), S);            // 3L + 3W + crossword HIK
  const bb = put(put(B(), 1, 0, 'ik', 1), 0, 0, 'huis');
  const c = __wb.evaluate(bb, T(0, 4, 'je'), S);                                   // HUISJE: old bonus squares do not count again
  const d = __wb.evaluate(B(), T(7, 4, 'fietsen'), S);                             // 7 tiles: +40
  const e = __wb.evaluate(put(B(), 7, 6, 'kat'), T(7, 9, 'eR'), S);                // blank R = 0 points
  return { a: a.score, aw: a.words.map(w => w.w + w.pts), c: c.score, d: d.score, db: d.bingo, e: e.score, row0: S.slice(0, 15), row7: S.slice(105, 120) };
});
ok('3L/3W + crossword = 70', sc.a === 70, JSON.stringify(sc.aw) + ' ' + sc.row0);
ok('multipliers only on new tiles (HUISJE = 15)', sc.c === 15, sc.c);
ok('7-tile bonus (FIETSEN 12 + 40)', sc.d === 52 && sc.db, sc.d + ' ' + sc.row7);
ok('blank scores 0 (KATER = 7)', sc.e === 7, sc.e);
ok('random board symmetric', await ev(p, () => { for (let k = 0; k < 10; k++) { const L = __wb.randomLayout(); for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) if (L[r * 15 + c] !== L[c * 15 + r] || L[r * 15 + c] !== L[(14 - r) * 15 + c] || L[r * 15 + c] !== L[r * 15 + 14 - c]) return false; if (L === __wb.STD && k > 3) return false; } return true; }));

// ---------- blank tile via the chooser ----------
await ev(p, () => __wb.newGame({ mode: 'cpu', level: 'normaal', first: 0, layout: 'std', zoom: false })); await p.waitForTimeout(200);
await ev(p, () => __wb.setRack('?atbcde'));
await ev(p, () => { const h = __wb.hand; __wb.placeTile(h[0].id, 7 * 15 + 6); });
await p.waitForTimeout(150);
ok('blank chooser opens', await vis(p, 'wbBlankModal')); await shot(p, 'blank');
await p.click('#wbBlankGrid button[data-c="k"]'); await p.waitForTimeout(100);
await ev(p, () => { const h = __wb.hand; __wb.placeTile(h.find(x => x.ch === 'a').id, 112); __wb.placeTile(h.find(x => x.ch === 't').id, 113); __wb.play(); });
await p.waitForTimeout(100);
ok('blank K: KAT = 3 points, board stores upper case', await ev(p, () => __wb.S.scores[0] === 3 && __wb.S.board[111] === 'K'), JSON.stringify(await ev(p, () => [__wb.S.scores, __wb.S.board[111]])));
t0 = Date.now(); while ((await ev(p, () => __wb.S.turn)) !== 0 && Date.now() - t0 < 10000) await p.waitForTimeout(100);

// ---------- swap & pass ----------
const before = await ev(p, () => ({ bag: __wb.S.bag.length, rack: __wb.S.racks[0].slice().sort().join('') }));
await p.click('#wbActs button[data-a="swap"]'); await p.waitForTimeout(150);
ok('swap dialog', await vis(p, 'wbSwapModal'));
for (const k of [0, 1, 2]) await p.click(`#wbSwapRack .wb-t:nth-child(${k + 1})`);
await shot(p, 'swap');
await p.click('#wbSwapGo'); await p.waitForTimeout(100);
const after = await ev(p, () => ({ bag: __wb.S.bag.length, rack: __wb.S.racks[0].length, h: __wb.S.hist[__wb.S.hist.length - 1], turn: __wb.S.turn }));
ok('swap: 3 tiles back, rack full, bag same, turn over', after.bag === before.bag && after.rack === 7 && after.h.k === 's' && after.h.n === 3 && after.turn === 1, JSON.stringify(after));
t0 = Date.now(); while ((await ev(p, () => __wb.S.turn)) !== 0 && Date.now() - t0 < 10000) await p.waitForTimeout(100);
await ev(p, () => { __wb.S.bag.splice(6); __wb.fit(); });
await p.click('#wbActs button[data-a="swap"]'); await p.waitForTimeout(100);
ok('swap blocked with < 7 in bag', await ev(p, () => document.getElementById('wbSwapGo').disabled && document.getElementById('wbSwapNote').textContent.includes('minstens 7')));
await p.click('#wbSwapCancel');
await p.click('#wbActs button[data-a="pass"]'); await p.waitForTimeout(150);
ok('pass asks confirmation', await vis(p, 'askModal'));
await p.click('#askYes'); await p.waitForTimeout(100);
ok('pass recorded', await ev(p, () => __wb.S.hist[__wb.S.hist.length - 1].k === 'p' && __wb.S.turn === 1));
t0 = Date.now(); while ((await ev(p, () => __wb.S.turn)) !== 0 && Date.now() - t0 < 10000) await p.waitForTimeout(100);

// ---------- end of game scoring ----------
const end1 = await ev(p, () => { const S = __wb.S; S.bag = []; S.racks[0] = []; S.racks[1] = ['q', 'x', 'e']; const s0 = S.scores.slice(); __wb.endGame('out', 0); return { d0: S.scores[0] - s0[0], d1: S.scores[1] - s0[1], over: S.over, save: localStorage.getItem('wb.save') }; });
ok('player out: +19 / -19', end1.d0 === 19 && end1.d1 === -19 && end1.over && !end1.save, JSON.stringify(end1));
await p.waitForTimeout(1600);
ok('end dialog', await vis(p, 'wbEndModal')); await shot(p, 'end');
await ev(p, () => __wb.newGame({ mode: 'cpu', first: 0, zoom: false })); await p.waitForTimeout(100);
const end2 = await ev(p, () => { const S = __wb.S; S.racks[0] = ['a', 'b']; S.racks[1] = ['z']; for (let k = 0; k < 6; k++) { __wb.S.turn = k % 2; __wb.pass(); } return { s: S.scores, over: S.over, kind: S.endKind }; });
ok('3 passes each ends the game, own tiles deducted', end2.over && end2.kind === 'pass' && end2.s[0] === -5 && end2.s[1] === -5, JSON.stringify(end2));
await p.waitForTimeout(1500);

// ---------- computer levels: legal moves + timing ----------
const lv = {};
for (const level of ['makkelijk', 'normaal', 'sterk']) {
  await ev(p, l => __wb.newGame({ mode: 'cpu', level: l, first: 1, zoom: false }), level);
  const ms = [], pts = []; let bad = [];
  for (let k = 0; k < 6; k++) {
    t0 = Date.now(); while ((await ev(p, () => __wb.S.turn !== 0 && !__wb.S.over)) && Date.now() - t0 < 15000) await p.waitForTimeout(60);
    if (await ev(p, () => __wb.S.over)) break;
    ms.push(await ev(p, () => __wb.S.cpuMs)); const h = await ev(p, () => __wb.S.hist[__wb.S.hist.length - 1]); pts.push(h.k === 'w' ? h.pts : h.k);
    bad = bad.concat(await boardValid(p));
    await ev(p, () => __wb.autoMove('normaal'));
  }
  lv[level] = { ms, pts };
  ok(`computer ${level}: legal words`, bad.length === 0 && pts.length >= 5, `gen ms ${JSON.stringify(ms)} points ${JSON.stringify(pts)} ${bad.join(',')}`);
}
const avg = a => a.reduce((s, x) => s + (typeof x === 'number' ? x : 0), 0) / a.length;
ok('levels differ in strength', avg(lv.sterk.pts) > avg(lv.makkelijk.pts), `avg makkelijk ${avg(lv.makkelijk.pts).toFixed(1)} normaal ${avg(lv.normaal.pts).toFixed(1)} sterk ${avg(lv.sterk.pts).toFixed(1)}`);

// ---------- full computer-vs-computer game ----------
await ev(p, () => __wb.newGame({ mode: '2p', name1: 'Anna', name2: 'Bert', first: 0, zoom: false }));
const full = await ev(p, () => { let n = 0, t = performance.now(), mx = 0; while (!__wb.S.over && n < 200) { const a = performance.now(); __wb.autoMove(n % 2 ? 'normaal' : 'sterk'); mx = Math.max(mx, performance.now() - a); n++; } return { n, over: __wb.S.over, scores: __wb.S.scores, kind: __wb.S.endKind, tiles: __wb.S.board.filter(Boolean).length, bag: __wb.S.bag.length, ms: Math.round(performance.now() - t), mx: Math.round(mx), hist: __wb.S.hist.length }; });
ok('cpu vs cpu game completes', full.over && full.n < 200, JSON.stringify(full));
ok('board valid at the end', (await boardValid(p)).length === 0);
await p.waitForTimeout(1500); await shot(p, 'fullgame');
ok('end dialog after full game', await vis(p, 'wbEndModal'));
await p.click('#wbEndView'); await p.waitForTimeout(150);
await p.click('#wbHistBtn'); await p.waitForTimeout(150); await shot(p, 'history');
ok('history lists moves', await ev(p, () => document.querySelectorAll('#wbHistList li').length) === full.hist);
await p.click('#wbHistClose');

// ---------- 2-player cover screen ----------
await ev(p, () => __wb.newGame({ mode: '2p', name1: 'Anna', name2: 'Bert', first: 0, zoom: false })); await p.waitForTimeout(200);
ok('cover before turn', await ev(p, () => document.getElementById('wbCover').classList.contains('show') && document.getElementById('wbCoverTitle').textContent.includes('Anna')));
await shot(p, 'cover');
await p.click('#wbCover button'); await p.waitForTimeout(100);
await ev(p, () => __wb.autoMove('sterk')); await p.waitForTimeout(150);
ok('cover for Bert', await ev(p, () => document.getElementById('wbCoverTitle').textContent.includes('Bert') && document.getElementById('wbRack').children.length === 0));
await p.click('#wbCover button');

// ---------- drag & drop with real pointer events ----------
await ev(p, () => { __wb.opt.zoom = true; __wb.newGame({ mode: 'cpu', level: 'normaal', first: 0, zoom: true }); }); await p.waitForTimeout(250);
await ev(p, () => __wb.setRack('katerns'));
const cellBox = i => ev(p, i => { const r = document.querySelectorAll('#wbGrid .wb-c')[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i);
const rackBox = k => ev(p, k => { const r = document.querySelectorAll('#wbRack .wb-t')[k].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, k);
async function dragTo(from, to, steps = 12) { await p.mouse.move(from.x, from.y); await p.mouse.down(); for (let i = 1; i <= steps; i++) { await p.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps); await p.waitForTimeout(10); } await p.mouse.up(); await p.waitForTimeout(350); }
let src = await rackBox(0), dst = await cellBox(I(7, 6));
await p.mouse.move(src.x, src.y); await p.mouse.down();
for (let i = 1; i <= 10; i++) { await p.mouse.move(src.x + (dst.x - src.x) * i / 10, src.y + (dst.y - src.y) * i / 10); await p.waitForTimeout(12); }
ok('drag ghost + hover cell', await ev(p, () => !!document.querySelector('.wb-ghost') && !!document.querySelector('#wbGrid .wb-c.hov')));
await shot(p, 'drag');
await p.mouse.up(); await p.waitForTimeout(400);
ok('drop on board', await ev(p, () => __wb.hand[0].at === 7 * 15 + 6), JSON.stringify(await ev(p, () => __wb.hand.map(t => t.at))));
ok('auto-zoom after first tile', await ev(p, () => __wb.Z.s > 1.5));
dst = await cellBox(I(7, 7)); src = await rackBox(0); await dragTo(src, dst);
dst = await cellBox(I(7, 8)); src = await rackBox(0); await dragTo(src, dst);
ok('drops at zoom land on the right cells', await ev(p, () => __wb.hand.slice(0, 3).map(t => t.at).join() === [111, 112, 113].join()), JSON.stringify(await ev(p, () => __wb.hand.map(t => t.at))));
await shot(p, 'zoomed');
// drag a pending tile back into the rack
src = await cellBox(I(7, 8)); const rk = await ev(p, () => { const r = document.getElementById('wbRack').getBoundingClientRect(); return { x: r.right - 10, y: r.top + r.height / 2 }; });
await dragTo(src, rk);
ok('drag from board back to rack', await ev(p, () => __wb.hand[2].at === -1 && document.querySelectorAll('#wbRack .wb-t').length === 5));
// tap-tap placement
await ev(p, () => { __wb.Z.s = 1; __wb.Z.x = __wb.Z.y = 0; __wb.applyZ(false); });
const tId = await ev(p, () => __wb.hand.find(t => t.ch === 't' && t.at < 0).id);
await p.click(`#wbRack .wb-t[data-id="${tId}"]`); await p.waitForTimeout(80);
ok('tap selects a rack tile', await ev(p, id => document.querySelector(`#wbRack .wb-t[data-id="${id}"]`).classList.contains('sel'), tId));
dst = await cellBox(I(7, 8)); await p.mouse.click(dst.x, dst.y); await p.waitForTimeout(350);
ok('tap on cell places it', await ev(p, id => __wb.hand.find(t => t.id === id).at === 113, tId));
ok('preview for KAT', await ev(p, () => document.getElementById('wbPrev').textContent === '+6'));
// tap a pending tile: back to rack, then recall/shuffle buttons
dst = await cellBox(I(7, 8)); await p.mouse.click(dst.x, dst.y); await p.waitForTimeout(300);
ok('tap pending tile returns it', await ev(p, id => __wb.hand.find(t => t.id === id).at === -1, tId));
await p.click('#wbMix'); await p.waitForTimeout(350);
ok('recall button', await ev(p, () => __wb.hand.every(t => t.at < 0)));
const order0 = await ev(p, () => __wb.hand.map(t => t.id).join());
await p.click('#wbMix'); await p.waitForTimeout(350);
ok('shuffle button', await ev(p, o => __wb.hand.map(t => t.id).join() !== o && __wb.hand.length === 7, order0));
// double-tap zoom
await ev(p, () => { __wb.Z.s = 1; __wb.Z.x = __wb.Z.y = 0; __wb.applyZ(false); }); await p.waitForTimeout(100);
const c0 = await cellBox(I(3, 3)); await p.mouse.dblclick(c0.x, c0.y); await p.waitForTimeout(400);
ok('double-tap zooms in', await ev(p, () => __wb.Z.s >= 1.9));
await p.mouse.dblclick(c0.x, c0.y); await p.waitForTimeout(400);
ok('double-tap zooms out', await ev(p, () => __wb.Z.s === 1));
// tip
await p.click('#wbActs button[data-a="tip"]'); await p.waitForTimeout(600);
ok('tip places the best move', await ev(p, () => __wb.hand.some(t => t.at >= 0) && __wb.S.helped[0] && __wb.prev && !__wb.prev.err && !__wb.prev.bad.length), await toastTxt(p));
await shot(p, 'tip');
await p.click('#wbPlay'); await p.waitForTimeout(300);
ok('play by button', await ev(p, () => __wb.S.turn === 1 && __wb.S.hist.length === 1));
t0 = Date.now(); while ((await ev(p, () => __wb.S.turn)) !== 0 && Date.now() - t0 < 10000) await p.waitForTimeout(100);
await p.waitForTimeout(400); await shot(p, 'portrait');

// ---------- save / resume ----------
const snap = await ev(p, () => JSON.stringify(__wb.S.board) + __wb.S.scores.join());
await p.click('#wbBack'); await p.waitForTimeout(250);
ok('saved + badge', await ev(p, () => !!localStorage.getItem('wb.save') && document.getElementById('tileWb').classList.contains('has-save')));
await p.reload(); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('#tileWb').scrollIntoView({ block: 'center' }));
await p.tap('#tileWb'); await p.waitForTimeout(600);
ok('resumed after reload', await ev(p, s => __wb.S && JSON.stringify(__wb.S.board) + __wb.S.scores.join() === s && !document.getElementById('wbStartModal').classList.contains('show'), snap), JSON.stringify(await ev(p, () => [__wb.S && __wb.S.scores, __wb.S && __wb.S.turn, __wb.S && __wb.S.hist.length, document.getElementById('wbStartModal').classList.contains('show')])) + ' snap ' + snap.slice(-12));

// ---------- sounds + music ----------
const snd = await ev(p, () => { const r = __sfx._test(); return Object.entries(r).filter(([k]) => k.startsWith('wb')); });
ok('wb sounds render', snd.length === 9 && snd.every(([, v]) => !v.nan && v.pk > .3 && v.rms > .005), JSON.stringify(snd).slice(0, 400));
let mus; for (let i = 0; i < 60; i++) { await p.waitForTimeout(250); mus = await ev(p, () => __sfx._state()); if (mus.now === 'wb') break; }
ok('music track wb', mus.now === 'wb' || (mus.cache || []).includes('wb'), JSON.stringify(mus));

// ---------- landscape ----------
const pl = await page({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
await pl.evaluate(() => document.querySelector('#tileWb').scrollIntoView({ block: 'center' }));
await pl.tap('#tileWb'); await pl.waitForTimeout(600);
await ev(pl, () => __wb.newGame({ mode: 'cpu', level: 'sterk', first: 0, zoom: false })); await pl.waitForTimeout(300);
for (let k = 0; k < 3; k++) { await ev(pl, () => __wb.autoMove('normaal')); t0 = Date.now(); while ((await ev(pl, () => __wb.S.turn)) !== 0 && Date.now() - t0 < 10000) await pl.waitForTimeout(100); }
await ev(pl, () => __wb.setRack('lopende'));
ok('landscape layout active', await ev(pl, () => document.getElementById('wb').classList.contains('land')));
t0 = Date.now(); while ((await ev(pl, () => __wb.S.turn)) !== 0 && Date.now() - t0 < 10000) await pl.waitForTimeout(100);
const lb = await ev(pl, () => { const b = document.getElementById('wbBoardWrap').getBoundingClientRect(), d = document.getElementById('wbDock').getBoundingClientRect(); return { b: [b.left, b.top, b.width, b.bottom], d: [d.left, d.top, d.right, d.bottom], h: innerHeight, w: innerWidth }; });
ok('landscape layout fits', lb.b[3] <= lb.h && lb.d[2] <= lb.w && lb.d[3] <= lb.h && lb.d[0] >= lb.b[0] + lb.b[2], JSON.stringify(lb));
await pl.waitForTimeout(300); await shot(pl, 'landscape');
} catch (e) { res.push('FAIL exception ' + e.stack); }
ok('no console errors', errs.length === 0, errs.slice(0, 5).join(' | '));
console.log(res.join('\n'));
console.log(res.filter(r => r.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASS');
await b.close();
