// node wbsrc/coretest.mjs : unit tests of the Woordbord core (dictionary, rules, generator)
import fs from 'fs';
const here = new URL('.', import.meta.url).pathname;
const core = fs.readFileSync(here + 'core.js', 'utf8');
const DICT = fs.readFileSync(here + '../wbdict.b64', 'utf8').trim();
const api = new Function('DICT', 'atob', core + '; return { loadDict, isWord, evaluate, genMoves, genMovesAsync, tilesOf, choose, STD, randomLayout, layoutOk, newBag, val, get dict() { return dict; }, leaveValue, swapPick };')(DICT, s => Buffer.from(s, 'base64').toString('latin1'));
let fails = 0; const ok = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + ' ' + x); if (!c) fails++; };
const t0 = performance.now(); const d = await api.loadDict();
ok('dict load', d.words > 290000, `words=${d.words} nodes=${d.nodes} ${Math.round(performance.now() - t0)}ms`);
const words = fs.readFileSync(here + '../wbdict.txt', 'utf8').split('\n').filter(Boolean);
ok('all words found', words.every(api.isWord));
ok('valid', ['huis', 'kat', 'fiets', 'ijs', 'zijn', 'qua'].every(api.isWord));
ok('invalid', !['xyzq', 'huiz', 'a', 'kattt', 'fietsx'].some(api.isWord));
// non-words: random strings are rejected unless listed
const set = new Set(words); let bad = 0; for (let k = 0; k < 20000; k++) { const w = Array.from({ length: 2 + k % 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(''); if (api.isWord(w) !== set.has(w)) bad++; }
ok('random strings agree with list', bad === 0);
ok('std layout symmetric+ok', api.layoutOk(api.STD), [...api.STD].filter(c => c !== '.').length + ' bonus');
const cnt = k => [...api.STD].filter(c => c === k).length; console.log('  2L', cnt('d'), '3L', cnt('t'), '2W', cnt('D'), '3W', cnt('T'));
for (let k = 0; k < 20; k++) { const L = api.randomLayout(); if (!api.layoutOk(L) || ['d', 't', 'D', 'T'].some(c => [...L].filter(x => x === c).length !== cnt(c))) { ok('random layout', false); break; } }
ok('bag', api.newBag().length === 104);
const B = () => Array(225).fill(''); const I = (r, c) => r * 15 + c;
const put = (b, r, c, w, dir = 0) => { [...w].forEach((ch, k) => b[dir ? I(r + k, c) : I(r, c + k)] = ch); return b; };
const T = (r, c, w, dir = 0) => [...w].map((ch, k) => ({ i: dir ? I(r + k, c) : I(r, c + k), c: ch.toLowerCase(), b: ch !== ch.toLowerCase() }));
const S = api.STD;
// first move rules
let e = api.evaluate(B(), T(0, 0, 'kat'), S); ok('first not over centre rejected', e.err && e.err.includes('middelste'), e.err);
e = api.evaluate(B(), T(7, 7, 'k'), S); ok('first single tile rejected', !!e.err, e.err);
e = api.evaluate(B(), [{ i: I(7, 6), c: 'k' }, { i: I(7, 8), c: 't' }], S); ok('gap rejected', e.err && e.err.includes('gat'), e.err);
e = api.evaluate(B(), [{ i: I(7, 7), c: 'k' }, { i: I(8, 8), c: 'a' }], S); ok('diagonal rejected', e.err && e.err.includes('rij'), e.err);
// centre is a plain start square: KAT = 3+1+2 = 6 (row 7: (7,7)='*', (7,6)?(7,8)?)
console.log('  row7', S.slice(105, 120));
e = api.evaluate(B(), T(7, 6, 'kat'), S); ok('kat on centre', !e.err && e.score === 6 && !e.bad.length, JSON.stringify(e.words));
e = api.evaluate(B(), T(7, 5, 'xyzq'), S); ok('invalid word reported', !e.err && e.bad[0] === 'XYZQ', JSON.stringify(e.bad));
// not connected
let b = put(B(), 7, 6, 'kat');
e = api.evaluate(b, T(0, 0, 'huis'), S); ok('not connected rejected', e.err && e.err.includes('aansluiten'), e.err);
// extend KAT -> KATTEN? use KATER: add E,R at (7,9),(7,10): (7,10)? check bonus
e = api.evaluate(b, T(7, 9, 'er'), S); ok('extend kat->kater', !e.err && e.words.length === 1 && e.words[0].w === 'KATER', JSON.stringify(e.words) + ' bonus ' + S[I(7, 9)] + S[I(7, 10)]);
// multipliers: build a word on (0,3)=3W: HUIS at row 0 col 0..3 : (0,0)=3L, (0,3)=3W
// connect: need board tiles; put a column so it connects: board has S at (1,3)? place KAT vertical at col 3 rows 1..3? custom board
b = put(B(), 1, 3, 'ei', 1);  // E at (1,3), I at (2,3)  -> placing HUIS on row 0 cols 0..3 makes S above E: 'sei'? use different
b = put(B(), 1, 0, 'ik', 1);   // I at (1,0), K at (2,0): placing H at (0,0)... 'hik' is a word
e = api.evaluate(b, T(0, 0, 'huis'), S);
// HUIS: H(4)*3L=12 + U3 + I1 + S2 = 18, word x3 (0,3)=T => 54; crossword HIK: H new on 3L: 12 + I1 + K3 = 16 (no word mult on (0,0)) => 70
ok('3L/3W + crossword', !e.err && e.score === 70, JSON.stringify(e.words) + ' ' + e.score + ' ' + S.slice(0, 15));
// multiplier only for new tiles: extend HUIS -> HUISJE? put HUIS on board, add JE at (0,4),(0,5)
b = put(b, 0, 0, 'huis');
e = api.evaluate(b, T(0, 4, 'je'), S);
const exp = (4 + 3 + 1 + 2 + 4 * (S[I(0, 4)] === 'd' ? 2 : S[I(0, 4)] === 't' ? 3 : 1) + 1 * (S[I(0, 5)] === 'd' ? 2 : S[I(0, 5)] === 't' ? 3 : 1)) * (S[I(0, 4)] === 'D' ? 2 : 1);
ok('old bonus squares not reused', !e.err && e.words[0].w === 'HUISJE' && e.score === exp, e.score + ' vs ' + exp);
// blank scores 0
b = put(B(), 7, 6, 'kat');
e = api.evaluate(b, T(7, 9, 'eR'), S); ok('blank = 0 points', !e.err && e.score === e.words[0].pts && e.words[0].pts === 3 + 1 + 2 + 1, JSON.stringify(e.words));
// bingo +40: first move 7 letters over centre: 'kastjes'? check word
const seven = ['fietsen', 'huizen', 'gekocht', 'kastjes', 'handige'].find(w => w.length === 7 && api.isWord(w));
e = api.evaluate(B(), T(7, 4, seven), S);
const base = [...seven].reduce((s, c, k) => s + api.val(c) * (S[I(7, 4 + k)] === 'd' ? 2 : S[I(7, 4 + k)] === 't' ? 3 : 1), 0) * [...seven].reduce((m, c, k) => m * (S[I(7, 4 + k)] === 'D' ? 2 : S[I(7, 4 + k)] === 'T' ? 3 : 1), 1);
ok('7-tile bonus', !e.err && e.bingo && e.score === base + 40, seven + ' ' + e.score + ' base ' + base);
// generator on an empty board
let t = performance.now(); let mv = api.genMoves(B(), [...'kateirs'], S);
ok('gen empty board', mv.length > 50, `${mv.length} moves ${Math.round(performance.now() - t)}ms best ${Math.max(...mv.map(m => m.score))}`);
const check = (board, m) => { const tl = api.tilesOf(m); const r = api.evaluate(board, tl, S); return !r.err && !r.bad.length && r.score === m.score ? null : { m, r }; };
let wrong = mv.map(m => check(B(), m)).filter(Boolean); ok('all generated moves legal + score matches evaluate', !wrong.length, JSON.stringify(wrong.slice(0, 2)));
// random self-play: generate, verify every move against evaluate, apply the best
for (let game = 0; game < 3; game++) {
  let board = B(), bag = api.newBag(), racks = [bag.splice(0, 7), bag.splice(0, 7)], turn = 0, idle = 0, tmax = 0, total = 0, nm = 0, badc = 0;
  while (idle < 4) {
    const rack = racks[turn]; t = performance.now();
    const moves = api.genMoves(board, rack, S); const dt = performance.now() - t; tmax = Math.max(tmax, dt); total += moves.length;
    for (const m of moves.length > 400 ? moves.filter((_, k) => k % Math.ceil(moves.length / 400) === 0) : moves) if (check(board, m)) { badc++; if (badc < 3) console.log(JSON.stringify(check(board, m))); }
    const m = api.choose(moves, rack, ['sterk', 'normaal', 'makkelijk'][game], bag.length);
    if (!m) { idle++; turn ^= 1; continue; }
    idle = 0; nm++;
    for (const tl of api.tilesOf(m)) { board[tl.i] = tl.b ? tl.c.toUpperCase() : tl.c; rack.splice(rack.indexOf(tl.b ? '?' : tl.c), 1); }
    while (rack.length < 7 && bag.length) rack.push(bag.pop());
    if (!rack.length) break;
    turn ^= 1;
  }
  ok('self-play game ' + game, badc === 0, `moves=${nm} gen=${total} maxGen=${Math.round(tmax)}ms tilesOnBoard=${board.filter(Boolean).length}`);
}
// blanks worst case
t = performance.now(); mv = api.genMoves(put(put(B(), 7, 4, 'fietsen'), 3, 8, 'huizen', 1), [...'??esnra'], S);
ok('2 blanks timing', true, `${mv.length} moves ${Math.round(performance.now() - t)}ms`);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
