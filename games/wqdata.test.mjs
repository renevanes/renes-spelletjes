// Wereldquiz data test: node wqdata.test.mjs
// Completeness (every country has a flag, map geometry / marker anchor, Dutch name, capital(s), continent, tier), the
// spot-check list of names and capitals, and the quiz logic of wqsrc/core.js (answer matching, options, quiz sets).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const rd = f => fs.readFileSync(path.join(here, 'wqsrc', f));
const DATA = JSON.parse(rd('countries.json')), MAPINFO = JSON.parse(rd('mapinfo.json')), FLAGS = JSON.parse(rd('flags.json')), BIN = rd('map.bin');
let fails = 0, passes = 0;
const ok = (name, cond, extra = '') => { if (cond) passes++; else { fails++; console.log('FAIL', name, extra); } };

// ---------- completeness ----------
const rows = DATA.c, main = rows.filter(r => !r[8]), ids = rows.map(r => r[0]);
ok('196 countries in the main set (193 UN + VA + PS + XK)', main.length === 196, main.length);
ok('ids unique', new Set(ids).size === ids.length);
const UNOBS = ['VA', 'PS'];
ok('UN observers present', UNOBS.every(i => ids.includes(i)));
// map: decode like the game does
const dec = (() => { let p = 0; const u8 = BIN; const vu = () => { let v = 0, m = 1, b; do { b = u8[p++]; v += (b & 127) * m; m *= 128; } while (b & 128); return v; }; const zz = () => { const v = vu(); return v % 2 ? -(v + 1) / 2 : v / 2; }; const n = vu(), rings = {}; for (const c of MAPINFO.codes) { const nr = vu(), R = []; for (let k = 0; k < nr; k++) { const np = vu(), a = []; let x = 0, y = 0; for (let i = 0; i < np; i++) { x += zz(); y += zz(); a.push([x / 100, y / 100]); } R.push(a); } rings[c] = R; } return { n, rings, end: p }; })();
ok('map decodes completely', dec.n === MAPINFO.codes.length && dec.end === BIN.length);
const CT = new Set(['EU', 'AF', 'AS', 'NA', 'SA', 'OC']);
const problems = [];
for (const r of rows) {
  const [id, n, alt, cap, capAlt, ct, tier, note, x] = r;
  if (!FLAGS[id] || !/^<svg[^>]*viewBox/.test(FLAGS[id])) problems.push(id + ' flag');
  // Vatican City (0.44 km²) is smaller than the 1/100 degree grid: it is always drawn as a marker at its anchor
  if (id === 'VA' ? Math.hypot(MAPINFO.meta.VA.a[0] - 12.453, MAPINFO.meta.VA.a[1] - 41.904) > .05 : !dec.rings[id] || !dec.rings[id].length || !dec.rings[id].every(R => R.length >= 3)) problems.push(id + ' geometry');
  const m = MAPINFO.meta[id]; if (!m || !m.a || !Number.isFinite(m.a[0]) || !Number.isFinite(m.a[1])) problems.push(id + ' anchor');
  if (!n || n === id || n.length < 3) problems.push(id + ' name');
  if (!x && !cap) problems.push(id + ' capital');
  if (!ct.split('+').every(c => CT.has(c))) problems.push(id + ' continent');
  if (![1, 2, 3].includes(tier)) problems.push(id + ' tier');
}
ok('every country: flag, geometry, marker anchor, Dutch name, capital, continent, tier', !problems.length, problems.join(', '));
// the marker anchor of small countries lies on (or very near) their land
const near = (id, [lo, la]) => dec.rings[id].some(R => R.some(([x, y]) => Math.hypot(x - lo, y - la) < 1.2));
// (Kiribati: the anchor is the capital's atoll Tarawa, which is too small to survive the simplification; Vatican: marker only)
const anch = main.filter(r => MAPINFO.meta[r[0]].s < 1 && !['VA', 'KI'].includes(r[0])).filter(r => !near(r[0], MAPINFO.meta[r[0]].a)).map(r => r[0]);
ok('anchors of small countries are on their land', !anch.length, anch.join(','));
// continent counts
const cnt = {}; for (const r of main) for (const c of r[5].split('+')) cnt[c] = (cnt[c] || 0) + 1;
ok('continent sizes (AF 54, SA 12, OC 14, NA 23)', cnt.AF === 54 && cnt.SA === 12 && cnt.OC === 14 && cnt.NA === 23, JSON.stringify(cnt));
// flag aspect ratios: square Switzerland / Vatican, Nepal cropped to its own shape
const vb = id => FLAGS[id].match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
ok('flag shapes: CH and VA square, NP its own shape, the rest 4:3', vb('CH')[2] === vb('CH')[3] && vb('VA')[2] === vb('VA')[3] && Math.abs(vb('NP')[2] / vb('NP')[3] - .784) < .01 && main.filter(r => !['CH', 'VA', 'NP'].includes(r[0])).every(r => Math.abs(vb(r[0])[2] / vb(r[0])[3] - 4 / 3) < .01));

// ---------- spot check: names and capitals (Dutch usage) ----------
const BY = Object.fromEntries(rows.map(r => [r[0], r]));
const SPOT = [
  ['NL', 'Nederland', 'Amsterdam'], ['BE', 'België', 'Brussel'], ['DE', 'Duitsland', 'Berlijn'], ['FR', 'Frankrijk', 'Parijs'], ['GB', 'Verenigd Koninkrijk', 'Londen'],
  ['DK', 'Denemarken', 'Kopenhagen'], ['RU', 'Rusland', 'Moskou'], ['PL', 'Polen', 'Warschau'], ['CZ', 'Tsjechië', 'Praag'], ['AT', 'Oostenrijk', 'Wenen'],
  ['PT', 'Portugal', 'Lissabon'], ['GR', 'Griekenland', 'Athene'], ['IT', 'Italië', 'Rome'], ['CH', 'Zwitserland', 'Bern'], ['RO', 'Roemenië', 'Boekarest'],
  ['RS', 'Servië', 'Belgrado'], ['UA', 'Oekraïne', 'Kyiv'], ['MK', 'Noord-Macedonië', 'Skopje'], ['BY', 'Belarus', 'Minsk'], ['VA', 'Vaticaanstad', 'Vaticaanstad'],
  ['CN', 'China', 'Peking'], ['JP', 'Japan', 'Tokio'], ['KR', 'Zuid-Korea', 'Seoel'], ['MM', 'Myanmar', 'Naypyidaw'], ['TL', 'Oost-Timor', 'Dili'],
  ['IL', 'Israël', 'Jeruzalem'], ['PS', 'Palestina', 'Oost-Jeruzalem'], ['KZ', 'Kazachstan', 'Astana'], ['SA', 'Saoedi-Arabië', 'Riyad'], ['TR', 'Turkije', 'Ankara'],
  ['EG', 'Egypte', 'Caïro'], ['CI', 'Ivoorkust', 'Yamoussoukro'], ['SZ', 'Eswatini', 'Mbabane'], ['ZA', 'Zuid-Afrika', 'Pretoria'], ['CD', 'Congo-Kinshasa', 'Kinshasa'],
  ['NG', 'Nigeria', 'Abuja'], ['TZ', 'Tanzania', 'Dodoma'], ['BI', 'Burundi', 'Gitega'], ['US', 'Verenigde Staten', 'Washington'], ['MX', 'Mexico', 'Mexico-Stad'],
  ['BR', 'Brazilië', 'Brasilia'], ['BO', 'Bolivia', 'Sucre'], ['AU', 'Australië', 'Canberra'], ['NZ', 'Nieuw-Zeeland', 'Wellington'], ['PW', 'Palau', 'Ngerulmud'],
];
const badSpot = SPOT.filter(([id, n, c]) => !BY[id] || BY[id][1] !== n || BY[id][3].split('|')[0] !== c).map(([id]) => id + ':' + (BY[id] ? BY[id][1] + '/' + BY[id][3] : '-'));
ok(`spot check of ${SPOT.length} names and capitals`, !badSpot.length, badSpot.join(', '));
ok('multi-capital countries accept every capital', BY.ZA[3].split('|').join() === 'Pretoria,Kaapstad,Bloemfontein' && BY.BO[3].split('|').join() === 'Sucre,La Paz');
ok('Kiev accepted for Kyiv', BY.UA[4].split('|').includes('Kiev'));

// ---------- the quiz logic of core.js, run in a sandbox ----------
const stats = { m: {}, wr: {} };
const ctx = vm.createContext({ DATA, MAPINFO, stats, Math, JSON, Object, Array, Set, Map, String, Number, Date });
vm.runInContext(fs.readFileSync(path.join(here, 'wqsrc', 'core.js'), 'utf8') + '\nthis.API = { C, BY, judge, suggest, options, poolOf, buildQuiz, dailyQuiz, norm, rng, mastery, learn, weakList, okFor };', ctx);
const A = ctx.API;
const J = (s, id, k = 'name') => A.judge(s, id, k).r;
ok('exact name', J('Nederland', 'NL') === 'ok' && J('nederland', 'NL') === 'ok' && J('Holland', 'NL') === 'ok');
ok('accents do not matter', J('Belgie', 'BE') === 'ok' && J('Oekraine', 'UA') === 'ok' && J('caïro', 'EG', 'cap') === 'ok' && J('Cairo', 'EG', 'cap') === 'ok' && J('Bogota', 'CO', 'cap') === 'ok' && J('Sao Tome', 'ST', 'cap') === 'ok');
ok('small typos forgiven', J('Nederlnad', 'NL') === 'typo' && J('Duitsladn', 'DE') === 'typo' && J('Kopenhage', 'DK', 'cap') === 'typo' && J('Boedapets', 'HU', 'cap') === 'typo' && J('Ouagadougu', 'BF', 'cap') === 'typo');
ok('another country is wrong (no typo tolerance into a real answer)', J('Niger', 'NG') === 'other' && J('Nigeria', 'NE') === 'other' && J('Iran', 'IQ') === 'other' && J('Oostenrijk', 'AU') === 'other' && J('Mali', 'MW') === 'other');
ok('nonsense is wrong', J('Frankrijk', 'NL') === 'other' && J('xyz', 'NL') === 'no' && J('', 'NL') === 'no' && J('Tel Aviv', 'IL', 'cap') === 'no');
ok('alternative capitals', J('Kiev', 'UA', 'cap') === 'ok' && J('Kaapstad', 'ZA', 'cap') === 'ok' && J('La Paz', 'BO', 'cap') === 'ok' && J('Washington DC', 'US', 'cap') === 'ok' && J('Ramallah', 'PS', 'cap') === 'ok');
ok('dashes and spaces', J('Port au Prince', 'HT', 'cap') === 'ok' && J('Guinee Bissau', 'GW') === 'ok' && J('Bosnie Herzegovina', 'BA') === 'ok' && J("St. George's", 'GD', 'cap') === 'ok');
{ const s = A.suggest('ams', 'cap', new Set(A.C.map(c => c.id))); ok('suggestions: prefix', s.length && s[0].f === 'Amsterdam', JSON.stringify(s)); }
{ const s = A.suggest('kopen', 'cap', new Set(A.C.map(c => c.id))); ok('suggestions: Kopenhagen', s.some(x => x.f === 'Kopenhagen'), JSON.stringify(s)); }
// options
let optBad = [];
const r = A.rng(7);
for (const c of A.C.filter(c => !c.x)) for (const t of ['fn', 'nf', 'cc', 'cn', 'mn']) for (const lvl of [1, 2, 3]) {
  if (!A.okFor(t, c)) continue;
  const o = A.options(t, c.id, lvl, r, false), want = lvl === 3 ? 6 : 4;
  if (o.length !== want || new Set(o).size !== want || !o.includes(c.id) || o.some(x => A.BY[x].x)) optBad.push(t + c.id + lvl + ':' + o.join());
  if (t === 'cc' && new Set(o.map(x => A.norm(A.BY[x].cap[0]))).size !== want) optBad.push('dupcap ' + c.id);
  if ((t === 'cc' || t === 'cn') && ((c.id === 'IL' && o.includes('PS')) || (c.id === 'PS' && o.includes('IL')))) optBad.push('IL/PS ' + c.id);
}
ok('options: right count, unique, contain the answer, no territories, no duplicate capitals, IL/PS never mixed', !optBad.length, optBad.slice(0, 8).join(' | '));
{ let sim = 0, n = 0; for (let k = 0; k < 200; k++) { const o = A.options('fn', 'TD', 3, r, false); n++; if (o.includes('RO')) sim++; } ok('hard flag questions use look-alikes (Tsjaad -> Roemenië)', sim > 120, sim + '/' + n); }
{ let sim = 0; for (let k = 0; k < 100; k++) if (A.options('fn', 'ID', 3, r, false).filter(x => ['MC', 'PL', 'SG'].includes(x)).length >= 2) sim++; ok('Indonesië gets Monaco/Polen/Singapore as distractors', sim > 60, sim); }
// filters
const P = (cont, lvl, extra = false) => A.poolOf({ cont, lvl, extra }).map(c => c.id);
ok('Europa, Makkelijk = only well-known European countries', P('EU', 1).every(id => A.BY[id].t === 1 && A.BY[id].ct.includes('EU')) && P('EU', 1).includes('NL') && !P('EU', 1).includes('VA'));
ok('Europa, Moeilijk = all 50 incl. micro-states', P('EU', 3).length === 50 && ['VA', 'SM', 'MC', 'LI', 'AD', 'MT', 'XK'].every(i => P('EU', 3).includes(i)));
ok('Hele wereld, Moeilijk = 196; with territories 208', P('W', 3).length === 196 && P('W', 3, true).length === 208);
ok('Zuid-Amerika = 12, Oceanië = 14, Afrika = 54', P('SA', 3).length === 12 && P('OC', 3).length === 14 && P('AF', 3).length === 54);
ok('Makkelijk < Normaal < Moeilijk', P('W', 1).length < P('W', 2).length && P('W', 2).length < 196, [P('W', 1).length, P('W', 2).length]);
{ const q = A.buildQuiz({ mode: 'hoofd', dir: { hoofd: 'cn' }, cont: 'EU', lvl: 3, len: 'alle', typing: false }, A.rng(3)); ok('capital -> country skips "Luxemburg is the capital of Luxemburg"', !q.some(x => ['LU', 'MC', 'SM', 'VA'].includes(x.c)) && q.length > 40, q.length); }
{ const q = A.buildQuiz({ mode: 'vlag', dir: { vlag: 'mix' }, cont: 'AF', lvl: 2, len: '20', typing: false }, A.rng(4)); ok('quiz of 20, unique countries, both directions', q.length === 20 && new Set(q.map(x => x.c)).size === 20 && q.some(x => x.t === 'fn') && q.some(x => x.t === 'nf') && q.every(x => A.BY[x.c].ct.includes('AF'))); }
{ const a = A.dailyQuiz('2026-10-13'), b = A.dailyQuiz('2026-10-13'), c = A.dailyQuiz('2026-10-14'); ok('daily quiz: 10 questions, same for everyone on a day, different the next day', a.length === 10 && JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c) && new Set(a.map(x => x.t)).size >= 5); }
// mastery and mistakes
A.learn('NL', 0, true); A.learn('BE', 0, false); A.learn('BE', 1, true);
ok('mastery: right = known, wrong = practise', stats.m.NL[0] === 2 && stats.m.BE[0] === 1 && A.weakList().length === 1 && A.weakList()[0][0] === 'BE');
A.learn('BE', 0, true); ok('mistake practised away', A.weakList().length === 0 && stats.m.BE[0] === 2);
ok('mastery count Europe', A.mastery('EU', 0).k === 2 && A.mastery('EU', 0).n === 50);
console.log('\nSpot-checked:', SPOT.map(([id, n, c]) => `${n} – ${c}`).join('; '));
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
