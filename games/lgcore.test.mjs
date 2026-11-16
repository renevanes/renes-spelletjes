// Logigram core tests (Node, no DOM): node games/lgcore.test.mjs      (COUNT=300 puzzles per level by default)
// For every generated puzzle: all clues are true, the solution is unique (exhaustive search), the logic solver
// (no guessing) finds it at the level's technique limit, no clue can be left out, the clue sentences are well-formed
// Dutch, and hints from an empty grid lead step by step to the solution. Also: a table of expected sentences,
// the marks logic (auto ✗, undo), the daily seed, and generation time per puzzle.
import { load } from './lgsrc/load.mjs';
const { Core, CAT, dur } = load();
const COUNT = +(process.env.COUNT || 300), UNIQ_DROP = +(process.env.UNIQ_DROP || 25);
let pass = 0, fail = 0; const fails = [];
const ok = (name, cond, extra = '') => { if (cond) pass++; else { fail++; fails.push(name + ' ' + extra); } if (!cond || process.env.V) console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra !== '' ? ' ' + extra : ''}`); };
const { YES, NO, AUTO } = Core;

/* ---------- exhaustive search: number of solutions (stops at limit) ---------- */
function perms(n) { const r = [], a = [...Array(n).keys()]; const rec = k => { if (k === n) { r.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; } }; rec(0); return r; }
const PERMS = {};
function countSolutions(P, clues, limit = 2) {
  const K = P.K, N = P.N, ps = PERMS[N] || (PERMS[N] = perms(N)), ent = new Array(K * N).fill(-1);
  for (let i = 0; i < N; i++) ent[i] = i;
  const cats = k => { const g = [k.a, k.b, ...(k.bs || []), ...(k.xs || []), ...(k.ys || [])].filter(x => x != null).map(x => Math.floor(x / N)); if (k.o != null) g.push(k.o); return Math.max(...g); };
  const byDepth = [...Array(K)].map(() => []); for (const k of clues) byDepth[cats(k)].push(k);
  for (const k of byDepth[0]) if (!Core.holds(P, k, ent)) return 0;
  let n = 0;
  const rec = c => {
    if (c === K) { n++; return n >= limit; }
    for (const p of ps) {
      for (let i = 0; i < N; i++) ent[c * N + i] = p[i];
      if (byDepth[c].every(k => Core.holds(P, k, ent)) && rec(c + 1)) return true;
    }
    for (let i = 0; i < N; i++) ent[c * N + i] = -1;
    return false;
  };
  rec(1); return n;
}

/* ---------- sentence checks ---------- */
const BAD = [/\s{2,}/, / [,.]/, /undefined|NaN|null|\{|\}/, /(?<!de )\been (een|druiven|aardbeien|kersen)\b|\b(de de|het het|geen een)\b/i, /\bniet geen\b/, /\.\./, /^\s|\s$/];
function badSentence(s) { if (!/^[A-ZÀ-Ý]/.test(s)) return 'geen hoofdletter'; if (!/[.]$/.test(s)) return 'geen punt'; for (const r of BAD) if (r.test(s)) return 'patroon ' + r; return ''; }

/* ---------- a fixed puzzle with a table of expected sentences ---------- */
{
  const P = { v: 1, lvl: 'moeilijk', K: 4, N: 4, grp: 'c', clues: [],
    cats: [
      { id: 'naam', anchor: true, label: 'Kind', pl: 'kinderen', items: ['Anna', 'Bram', 'Cas', 'Daan'].map(n => ({ n, lab: n, sh: n })) },
      { id: 'dier', label: 'Huisdier', pl: 'huisdieren', items: [['kat', 'de'], ['hond', 'de'], ['konijn', 'het'], ['goudvis', 'de']].map(([n, g]) => ({ n, g, lab: n, sh: n })) },
      { id: 'fruit', label: 'Fruit', pl: 'fruitsoorten', items: [['appel', 'de'], ['druiven', 'pl'], ['peer', 'de'], ['banaan', 'de']].map(([n, g]) => ({ n, g, lab: n, sh: n })) },
      { id: 'jaar', ord: true, label: 'Leeftijd', pl: 'leeftijden', items: [7, 8, 10, 12].map(v => ({ n: String(v), val: v, lab: v + ' jaar', sh: v + ' jr' })) },
    ],
    ent: [0, 1, 2, 3, /*dier*/ 1, 0, 3, 2, /*fruit*/ 2, 0, 1, 3, /*jaar*/ 3, 2, 0, 1] };
  const g = (c, i) => c * 4 + i, A = 0, B = 1, C = 2, D = 3, kat = g(1, 0), hond = g(1, 1), konijn = g(1, 2), vis = g(1, 3), appel = g(2, 0), druif = g(2, 1), peer = g(2, 2), j7 = g(3, 0), j8 = g(3, 1), j10 = g(3, 2), j12 = g(3, 3);
  const T = [
    [{ t: 'is', a: A, b: hond }, 'Anna heeft een hond.'],
    [{ t: 'is', a: kat, b: A }, 'Anna heeft een kat.'],
    [{ t: 'not', a: B, b: konijn }, 'Bram heeft geen konijn.'],
    [{ t: 'not', a: kat, b: druif }, 'Het baasje van de kat neemt geen druiven mee.'],
    [{ t: 'is', a: druif, b: kat }, 'Degene met de druiven heeft een kat.'],
    [{ t: 'is', a: C, b: j10 }, 'Cas is 10 jaar.'],
    [{ t: 'is', a: j8, b: appel }, 'De 8-jarige neemt een appel mee.'],
    [{ t: 'nor', a: A, bs: [vis, konijn] }, 'Anna heeft noch een konijn, noch een goudvis.'],
    [{ t: 'nor', a: druif, bs: [B, A] }, 'Noch Anna, noch Bram neemt druiven mee.'],
    [{ t: 'nor', a: D, bs: [j8, j7] }, 'Daan is noch 7, noch 8 jaar.'],
    [{ t: 'or', a: B, bs: [kat, hond] }, 'Bram heeft een kat of een hond.'],
    [{ t: 'or', a: peer, bs: [C, D] }, 'Degene met de peer is Cas of Daan.'],
    [{ t: 'or', a: A, bs: [hond, peer] }, 'Anna heeft een hond of neemt een peer mee, maar niet allebei.'],
    [{ t: 'ext', a: A, b: j12 }, 'Anna is de oudste.'],
    [{ t: 'ext', a: hond, b: j7 }, 'Het baasje van de hond is de jongste.'],
    [{ t: 'cmp', a: C, b: A, o: 3, f: 0 }, 'Cas is jonger dan Anna.'],
    [{ t: 'cmp', a: C, b: A, o: 3, f: 1 }, 'Anna is ouder dan Cas.'],
    [{ t: 'cmp', a: konijn, b: appel, o: 3, f: 0 }, 'Het baasje van het konijn is jonger dan degene met de appel.'],
    [{ t: 'dif', a: A, b: C, o: 3, d: 2, f: 0 }, 'Anna is precies 2 jaar ouder dan Cas.'],
    [{ t: 'dif', a: A, b: C, o: 3, d: 2, f: 1 }, 'Cas is precies 2 jaar jonger dan Anna.'],
    [{ t: 'list', xs: [A, hond, druif, j10] }, 'De vier kinderen zijn Anna, het baasje van de hond, degene met de druiven en de 10-jarige.'],
    [{ t: 'list', xs: [B, kat, j7] }, 'Bram, het baasje van de kat en de 7-jarige zijn drie verschillende kinderen.'],
    [{ t: 'pair', xs: [A, B], ys: [kat, hond] }, 'Van Anna en Bram heeft de een een kat en de ander een hond.'],
    [{ t: 'pair', xs: [A, B], ys: [appel, druif] }, 'Van Anna en Bram neemt de een een appel mee en de ander druiven.'],
    [{ t: 'pair', xs: [C, D], ys: [j8, j12] }, 'Van Cas en Daan is de een 8 jaar en de ander 12 jaar.'],
  ];
  for (const [k, want] of T) { const got = Core.clueText(P, k); ok(`zin: ${want}`, got === want, `kreeg: "${got}"`); }
  ok('zin: stelling met naam als onderwerp', Core.stmt(P, kat, B, false) === 'Bram heeft geen kat');
  ok('zin: stelling zonder hoofdletter', Core.stmt(P, druif, appel, false, false).startsWith('degene met de druiven'));
  ok('zin: korte naam', Core.nm(P, kat) === 'de kat' && Core.nm(P, druif) === 'de druiven' && Core.nm(P, j8) === '8 jaar');
  // other categories: one sentence each through the real templates
  const one = (id, raw, grp, want, kind = 'pos') => {
    const C = CAT[id], it = C.ord ? (() => { const v = raw; return { n: C.ord.n(v), val: v, lab: C.ord.lab(v), sh: C.ord.sh(v) }; })() : C.color ? { n: raw[0], adj: raw[1], sw: raw[2], lab: raw[0], sh: raw[0] } : { n: raw[0], g: raw[1] || '', lab: raw[0], sh: raw[0] };
    const Q = { K: 2, N: 1, grp, cats: [{ id: 'naam', anchor: true, items: [{ n: 'Anna', lab: 'Anna' }] }, { id, ord: !!C.ord, items: [it] }], ent: [0, 0], clues: [] };
    const got = kind === 'ref' ? Core.ref(Q, 1) : Core.stmt(Q, 0, 1, kind === 'pos');
    ok(`zin (${id}): ${want}`, got === want, `kreeg: "${got}"`);
  };
  one('stad', ['Delft'], 'c', 'Anna woont in Delft'); one('stad', ['Delft'], 'c', 'Anna woont niet in Delft', 'neg'); one('stad', ['Delft'], 'c', 'degene uit Delft', 'ref');
  one('sport', ['hockey'], 'c', 'Anna speelt hockey'); one('sport', ['hockey'], 'c', 'Anna speelt geen hockey', 'neg'); one('sport', ['hockey'], 'c', 'degene die hockey speelt', 'ref');
  one('trui', ['rood', 'rode', '#f00'], 'c', 'Anna draagt een rode trui'); one('trui', ['geel', 'gele', '#ff0'], 'c', 'Anna draagt geen gele trui', 'neg'); one('trui', ['wit', 'witte'], 'c', 'degene met de witte trui', 'ref');
  one('les', ['tekenles'], 'c', 'Anna zit op tekenles'); one('les', ['tekenles'], 'c', 'Anna zit niet op tekenles', 'neg');
  one('reis', ['fiets', 'de'], 'c', 'Anna komt met de fiets'); one('reis', ['fiets', 'de'], 'c', 'degene die met de fiets komt', 'ref');
  one('knuf', ['knuffeluil', 'de'], 'c', 'Anna heeft een knuffeluil'); one('knuf', ['knuffeluil', 'de'], 'c', 'degene met de knuffeluil', 'ref');
  one('baan', ['bakker'], 'a', 'Anna is bakker'); one('baan', ['bakker'], 'a', 'Anna is geen bakker', 'neg'); one('baan', ['bakker'], 'a', 'de bakker', 'ref');
  one('dier', ['hond', 'de'], 'a', 'de eigenaar van de hond', 'ref');
  one('auto', ['grijs', 'grijze'], 'a', 'Anna rijdt in een grijze auto'); one('auto', ['grijs', 'grijze'], 'a', 'Anna rijdt niet in een grijze auto', 'neg');
  one('drank', ['thee'], 'a', 'Anna drinkt geen thee', 'neg'); one('muziek', ['viool'], 'a', 'degene die viool speelt', 'ref');
  one('geld', 12, 'c', 'Anna heeft €12 gespaard'); one('geld', 12, 'c', 'Anna heeft niet €12 gespaard', 'neg'); one('geld', 12, 'c', 'degene met €12', 'ref');
  one('bed', 19 * 60 + 30, 'c', 'Anna gaat om 19:30 naar bed'); one('bed', 20 * 60, 'c', 'degene die om 20:00 naar bed gaat', 'ref');
  one('dag', 2, 'c', 'Anna komt op woensdag spelen'); one('dag', 2, 'c', 'Anna komt niet op woensdag spelen', 'neg');
  one('vrij', 4, 'a', 'Anna is op vrijdag vrij'); one('vrij', 4, 'a', 'degene die op vrijdag vrij is', 'ref');
  one('race', 2, 'c', 'Anna werd tweede'); one('race', 1, 'c', 'de winnaar van de race', 'ref'); one('race', 3, 'c', 'degene die derde werd', 'ref');
  one('huis', 14, 'a', 'Anna woont op nummer 14'); one('huis', 14, 'a', 'de bewoner van nummer 14', 'ref'); one('huis', 14, 'c', 'degene van nummer 14', 'ref');
  one('op', 6 * 60 + 45, 'a', 'Anna staat om 6:45 op'); one('op', 6 * 60 + 45, 'a', 'degene die om 6:45 opstaat', 'ref');
  one('uit', 25, 'a', 'Anna gaf €25 uit'); one('uit', 25, 'a', 'degene die €25 uitgaf', 'ref');
  one('lang', 135, 'c', 'Anna is 135 cm lang'); one('lang', 135, 'c', 'degene van 135 cm', 'ref');
  one('jaar', 45, 'a', 'de 45-jarige', 'ref');
  ok('duur in woorden', [[15, 'een kwartier'], [30, 'een half uur'], [45, 'drie kwartier'], [60, 'een uur'], [75, 'een uur en een kwartier'], [90, 'anderhalf uur'], [120, 'twee uur'], [150, 'tweeënhalf uur'], [165, 'twee uur en drie kwartier'], [180, 'drie uur']].every(([m, w]) => dur(m) === w), [15, 30, 45, 60, 75, 90, 120, 150, 165, 180].map(dur).join(' | '));
  const dd = CAT.dag.ord, rc = CAT.race.ord, bd = CAT.bed.ord;
  ok('vergelijkingen', dd.dgt(1).join(' ') === 'komt een dag na spelen' && dd.dlt(2)[0] === 'komt twee dagen vóór' && rc.dgt(1)[0] === 'finishte direct na' && rc.dlt(2)[0] === 'finishte twee plaatsen vóór' && bd.dgt(30)[0] === 'gaat precies een half uur later naar bed dan');
  // solver on this fixed puzzle: sound steps
  P.clues = [{ t: 'pair', xs: [A, B], ys: [kat, hond] }, { t: 'cmp', a: C, b: A, o: 3 }];
  const r = Core.solve(P, { max: 3, trace: true });
  ok('oplosser: elke stap klopt met de oplossing', r.steps.every(s => (s.v === YES) === (P.ent[s.a] === P.ent[s.b])));
}

/* ---------- marks: auto ✗, taking a ✓ back, undo / redo, tap cycles ---------- */
{
  const P = Core.generate('normaal', 4242), T = P.K * P.N, N = P.N;
  const mk = Core.newMarks(P);
  const a = 0, b = N + 1;
  const ch = Core.setMark(P, mk, a, b, YES, true);
  let autos = 0; for (let j = 0; j < N; j++) if (j !== 1 && mk[a * T + N + j] === AUTO) autos++; for (let i = 1; i < N; i++) if (mk[i * T + b] === AUTO) autos++;
  ok('✓ zet automatisch ✗ in rij en kolom van het blok', autos === 2 * (N - 1) && ch.length === 1 + 2 * (N - 1));
  ok('automatische ✗ alleen in dat blok', mk[a * T + 2 * N] === 0);
  Core.setMark(P, mk, 1, N + 2, YES, true);
  const ch2 = Core.setMark(P, mk, a, b, 0, true);
  ok('✓ weghalen haalt niet meer nodige automatische ✗ weg', mk[a * T + N] === 0 && mk[a * T + N + 2] === AUTO && mk[2 * T + b] === 0, JSON.stringify(ch2));
  Core.undoChanges(P, mk, ch2);
  ok('terug zet alles weer', mk[a * T + b] === YES && mk[a * T + N] === AUTO);
  Core.redoChanges(P, mk, ch2);
  ok('vooruit doet het opnieuw', mk[a * T + b] === 0 && mk[a * T + N] === 0);
  ok('symmetrisch', Core.pairs(P).every(([x, y]) => mk[x * T + y] === mk[y * T + x]));
  const packed = Core.packMarks(P, mk), un = Core.unpackMarks(P, packed);
  ok('opslaan en teruglezen', un.every((v, i) => v === mk[i]) && packed.length === Core.pairs(P).length);
  ok('tikken ✗→✓→leeg', Core.nextMark(0, 'xv') === NO && Core.nextMark(NO, 'xv') === YES && Core.nextMark(AUTO, 'xv') === YES && Core.nextMark(YES, 'xv') === 0);
  ok('tikken ✓→✗→leeg', Core.nextMark(0, 'vx') === YES && Core.nextMark(YES, 'vx') === NO && Core.nextMark(NO, 'vx') === 0);
  ok('tikken met gekozen teken', Core.nextMark(0, 'kies', YES) === YES && Core.nextMark(YES, 'kies', YES) === 0 && Core.nextMark(AUTO, 'kies', NO) === 0 && Core.nextMark(YES, 'kies', NO) === NO);
  // hint on a wrong mark
  const m2 = Core.newMarks(P); let wa = -1, wb = -1;
  for (const [x, y] of Core.pairs(P)) if (P.ent[x] !== P.ent[y]) { wa = x; wb = y; break; }
  Core.setMark(P, m2, wa, wb, YES, false);
  const h = Core.hint(P, m2);
  ok('hint wijst eerst een fout aan', h && h.k === 'err' && h.a === wa && h.b === wb);
  ok('summary van lege marks is leeg', Core.summary(P, Core.newMarks(P)).every(r => r.slice(1).every(v => v === -1)));
}

/* ---------- the daily puzzle ---------- */
{
  const d1 = Core.dailyFor('2026-11-16'), d2 = Core.dailyFor('2026-11-16'), d3 = Core.dailyFor('2026-11-17');
  ok('dagpuzzel: zelfde datum = zelfde puzzel', d1.seed === d2.seed && JSON.stringify(Core.generate(d1.lvl, d1.seed).clues) === JSON.stringify(Core.generate(d2.lvl, d2.seed).clues));
  ok('dagpuzzel: andere datum = andere puzzel', d1.seed !== d3.seed);
  ok('dagpuzzel: niveau per weekdag', d1.lvl === 'makkelijk' && Core.dailyFor('2026-11-22').lvl === 'moeilijk' && Core.dailyFor('2026-11-21').lvl === 'expert', [d1.lvl, d3.lvl].join());
}

/* ---------- many generated puzzles per level ---------- */
const report = [];
for (const lvl of Core.LVL_KEYS) {
  const L = Core.LEVELS[lvl], times = [], clueN = [], typeN = {}, grades = { l2: 0, l3: 0 };
  let truthBad = 0, notUnique = 0, notLogic = 0, redundant = 0, uniqRed = 0, uniqChecked = 0, sentBad = 0, hintBad = 0, hintSteps = 0, hintTexts = 0, solverWrong = 0, needMiss = 0;
  const sentEx = [];
  for (let s = 0; s < COUNT; s++) {
    const seed = (s * 2654435761 + 12345 + lvl.length) >>> 0;
    const t0 = performance.now(); const P = Core.generate(lvl, seed); times.push(performance.now() - t0);
    clueN.push(P.clues.length); for (const k of P.clues) typeN[k.t] = (typeN[k.t] || 0) + 1;
    if (P.clues.some(k => !Core.holds(P, k, P.ent))) truthBad++;
    if (countSolutions(P, P.clues) !== 1) notUnique++;
    const r = Core.solve(P, { max: L.max, trace: true });
    if (!r.solved) notLogic++;
    if (r.steps.some(st => (st.v === YES) !== (P.ent[st.a] === P.ent[st.b]))) solverWrong++;
    grades.l2 += r.used[2]; grades.l3 += r.used[3];
    if (L.need && (r.used[2] + r.used[3] < L.need[0] || r.used[3] < L.need[1])) needMiss++;
    for (let i = 0; i < P.clues.length; i++) {
      const rest = P.clues.map((k, j) => [j, k]).filter(([j]) => j !== i);
      if (Core.solve(P, { clues: rest, max: L.max }).solved) redundant++;
      if (s < UNIQ_DROP) { uniqChecked++; if (countSolutions(P, rest.map(x => x[1])) === 1) uniqRed++; }
    }
    for (const k of P.clues) { const e = badSentence(k.txt); if (e) { sentBad++; if (sentEx.length < 5) sentEx.push(e + ': ' + k.txt); } }
    // hints from an empty grid: every hint is a correct deduction and together they solve the puzzle
    if (s < Math.max(40, COUNT / 3)) {
      const mk = Core.newMarks(P), T = P.K * P.N; let n = 0, bad = false;
      while (n < 2000) {
        const h = Core.hint(P, mk); if (!h) break; n++;
        if (h.k !== 'step' || (h.v === YES) !== (P.ent[h.a] === P.ent[h.b]) || mk[h.a * T + h.b]) { bad = true; break; }
        const e = badSentence(h.text); hintTexts++; if (e) { bad = true; if (sentEx.length < 8) sentEx.push('hint ' + e + ': ' + h.text); break; }
        Core.setMark(P, mk, h.a, h.b, h.v, false);
      }
      const full = Core.pairs(P).every(([a, b]) => mk[a * T + b]);
      if (bad || !full || !Core.isSolved(P, mk)) hintBad++;
      hintSteps += n;
    }
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length, med = times[times.length >> 1], p95 = times[Math.floor(times.length * .95)], mx = times[times.length - 1];
  ok(`${lvl}: alle aanwijzingen waar`, truthBad === 0, truthBad);
  ok(`${lvl}: precies één oplossing (uitgeprobeerd)`, notUnique === 0, notUnique);
  ok(`${lvl}: met logica op te lossen (niveau ≤ ${L.max})`, notLogic === 0, notLogic);
  ok(`${lvl}: oplosser maakt geen foute stap`, solverWrong === 0, solverWrong);
  ok(`${lvl}: geen overbodige aanwijzing (voor de logica)`, redundant === 0, redundant);
  ok(`${lvl}: zinnen goed gevormd`, sentBad === 0, sentEx.join(' | '));
  ok(`${lvl}: hints lossen de puzzel stap voor stap op`, hintBad === 0, hintBad + ' ' + sentEx.join(' | '));
  ok(`${lvl}: moeilijkheid gehaald (≥ 97%)`, needMiss <= COUNT * .03, needMiss);
  ok(`${lvl}: snel genoeg (gem. < 60 ms in Node)`, avg < 60, avg.toFixed(1));
  report.push(`${lvl.padEnd(9)} ${COUNT} puzzels · ${L.K}×${L.N} · aanwijzingen gem. ${(clueN.reduce((a, b) => a + b, 0) / COUNT).toFixed(1)} (${Math.min(...clueN)}–${Math.max(...clueN)}) · tijd gem. ${avg.toFixed(1)} ms, mediaan ${med.toFixed(1)}, p95 ${p95.toFixed(1)}, max ${mx.toFixed(1)} · stappen niveau 2/3 gem. ${(grades.l2 / COUNT).toFixed(1)}/${(grades.l3 / COUNT).toFixed(1)} · voor uniekheid overbodig ${uniqRed}/${uniqChecked} · moeilijkheid gemist ${needMiss} · hints ${hintTexts}\n           soorten: ${Object.entries(typeN).map(([t, n]) => t + ' ' + n).join(', ')}`);
}
console.log('\n' + report.join('\n'));
console.log(`\n${pass} geslaagd, ${fail} mislukt`);
if (fails.length) console.log(fails.join('\n'));
process.exit(fail ? 1 : 0);
