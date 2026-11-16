// Woordzoeker: tests of the word lists and the puzzle generator (Node, no browser).
//   node games/wzcore.test.mjs [puzzles per level, default 500]
// The checks below do NOT use the generator's own verify(): every grid is searched again, brute force, in all 8 directions.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { fileURLToPath } from 'url';
import { load } from './wzsrc/load.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const W = load(), N = +(process.argv[2] || 500);
let fails = 0; const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra !== '' ? ' ' + extra : ''}`); };

/* ---------- the word lists ---------- */
// spelling: the OpenTaal list that Woordbord uses (front-coded, gzip, base64; see games/wbwords.py)
const raw = zlib.gunzipSync(Buffer.from(fs.readFileSync(path.join(here, 'wbdict.b64'), 'utf8').trim(), 'base64')).toString();
const dict = new Set(); { let prev = '', i = 0; while (i < raw.length) { const cp = raw.charCodeAt(i++) - 48; let j = i; while (j < raw.length && raw[j] >= 'a') j++; const w = prev.slice(0, cp) + raw.slice(i, j); dict.add(w); prev = w; i = j; } }
// proper names (not in the lower-case list) and two plain words that Woordbord's filter drops as abbreviations (bijl., luit.)
const NAMES = new Set(`AMSTERDAM ROTTERDAM UTRECHT GRONINGEN LEEUWARDEN ZWOLLE LELYSTAD ARNHEM NIJMEGEN HAARLEM BREDA TILBURG EINDHOVEN MAASTRICHT
  MIDDELBURG ALKMAAR ENSCHEDE DEVENTER APELDOORN AMERSFOORT DORDRECHT SCHIEDAM ZAANDAM EDAM VOLENDAM VENLO ROERMOND HEERLEN ALMERE ZEIST HILVERSUM
  HENGELO SNEEK HARLINGEN ZUTPHEN VLISSINGEN WAGENINGEN EMMEN MEPPEL
  VENUS MERCURIUS JUPITER SATURNUS NEPTUNUS POOLSTER PASEN KONINGSDAG PINKSTEREN MOEDERDAG VADERDAG HALLOWEEN DOORNROOSJE REPELSTEELTJE
  NEDERLAND DUITSLAND FRANKRIJK SPANJE PORTUGAL GRIEKENLAND ENGELAND SCHOTLAND IERLAND IJSLAND NOORWEGEN FINLAND DENEMARKEN OOSTENRIJK ZWITSERLAND
  HONGARIJE TURKIJE LUXEMBURG CYPRUS ESTLAND LETLAND LITOUWEN SLOWAKIJE BULGARIJE MONACO ANDORRA MEXICO PERU EGYPTE MAROKKO KENIA JAPAN CHINA INDIA
  THAILAND SURINAME CUBA NEPAL VIETNAM BIJL LUIT`.split(/\s+/).filter(Boolean));
const rev = w => [...w].reverse().join('');
ok(`${W.THEMES.length} thema's (≥ 25)`, W.THEMES.length >= 25);
ok('thema-id\'s uniek', new Set(W.THEMES.map(t => t.id)).size === W.THEMES.length);
let tot = 0;
for (const t of W.THEMES) {
  const ws = t.w.split(/\s+/).filter(Boolean); tot += ws.length;
  const bad = [];
  if (ws.length < 30) bad.push('only ' + ws.length + ' words');
  if (new Set(ws).size !== ws.length) bad.push('duplicates ' + ws.filter((w, i) => ws.indexOf(w) !== i));
  for (const w of ws) {
    if (!/^[A-Z]{3,14}$/.test(w)) bad.push('form ' + w);
    if (!dict.has(w.toLowerCase()) && !NAMES.has(w)) bad.push('spelling? ' + w);
    if (w === rev(w)) bad.push('palindrome ' + w);
    for (const b of W.BLOCK) if (w.includes(b) || rev(w).includes(b)) bad.push(`${w} contains ${b}`);
    for (const b of W.BLOCK_FWD) if (w.includes(b)) bad.push(`${w} contains ${b}`);
  }
  const forLv = W.LEVELS.map(L => ws.filter(w => w.length <= L.maxLen).length);
  if (forLv[0] < 15) bad.push('too few short words for Makkelijk: ' + forLv[0]);
  if (!t.name || !t.ic) bad.push('name/icon');
  ok(`thema ${t.id}: ${ws.length} woorden, goed gespeld, netjes`, !bad.length, bad.join(', '));
}
console.log(`  ${tot} woorden in totaal`);
const genBad = W.GENERIC.flatMap(g => g.split(' ').filter(w => !dict.has(w.toLowerCase())).map(w => g + ': ' + w))
  .concat(W.GENERIC.filter(g => W.BLOCK.some(b => g.replace(/ /g, '').includes(b) || rev(g.replace(/ /g, '')).includes(b))));
ok('complimenten (geheim woord) goed gespeld en netjes', !genBad.length, genBad.join(', '));

/* ---------- brute-force search in a grid ---------- */
const D8 = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
function occurrences(grid, n, w) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (let d = 0; d < 8; d++) {
    const [dr, dc] = D8[d]; let k = 0;
    for (; k < w.length; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= n || cc < 0 || cc >= n || grid[rr * n + cc] !== w[k]) break; }
    if (k === w.length) out.push({ r, c, d });
  }
  return out;
}

/* ---------- 500 puzzles per level ---------- */
for (let lv = 0; lv < 4; lv++) {
  const L = W.LEVELS[lv], times = [], problems = [], wc = [], secLen = [], themesSeen = new Set();
  let secrets = 0, themed = 0, decoys = 0, fwdOnly = 0;
  for (let s = 1; s <= N; s++) {
    const seed = (s * 2654435761 + lv * 97) >>> 0;
    const th = s % 2 ? W.THEMES[s % W.THEMES.length].id : undefined;          // the app picks the theme; the daily puzzle lets the generator pick
    const t0 = performance.now(); const P = W.generate(lv, seed, th); times.push(performance.now() - t0);
    if (!P) { problems.push(seed + ': no puzzle'); continue; }
    const n = P.n, g = P.grid, pr = m => problems.push(`${lv}/${seed} ${m}`);
    themesSeen.add(P.th); wc.push(P.words.length);
    if (n !== L.n || g.length !== n * n || !g.every(ch => /^[A-Z]$/.test(ch))) pr('grid');
    if (P.words.length < L.words[0] || P.words.length > L.words[1]) pr('word count ' + P.words.length);
    const theme = W.THEMES.find(t => t.id === P.th), tw = new Set(W.wordsOf(theme));
    const used = new Uint8Array(n * n);
    for (const p of P.words) {
      if (!tw.has(p.w)) pr('not a theme word ' + p.w);
      if (p.w.length > L.maxLen) pr('too long ' + p.w);
      if (p.d >= L.dirs) pr('direction not allowed on this level ' + p.w + ' ' + p.d);
      if (W.BLOCK_FWD.some(b => rev(p.w).includes(b))) { fwdOnly++; if (p.d >= 4) pr('backwards but its reverse is rude ' + p.w); }
      const occ = occurrences(g, n, p.w);
      // exactly once: the place where it was put, and nowhere else in any direction
      if (occ.length !== 1) pr(`${p.w} found ${occ.length}x ${JSON.stringify(occ)}`);
      else if (occ[0].r !== p.r || occ[0].c !== p.c || occ[0].d !== p.d) pr(`${p.w} somewhere else`);
      W.cellsOf(p, n).forEach(i => { used[i] = 1; });
      for (const q of P.words) if (q !== p && (q.w.includes(p.w) || q.w.includes(rev(p.w)))) pr(`${p.w} inside ${q.w}`);
    }
    for (const b of W.BLOCK) if (occurrences(g, n, b).length) pr('rude word ' + b);
    for (const b of W.BLOCK_FWD) if (occurrences(g, n, b).some(o => o.d < 4)) pr('rude word ' + b);
    const left = []; for (let i = 0; i < n * n; i++) if (!used[i]) left.push(g[i]);
    if (L.secret) {
      if (!P.secret) pr('no hidden word');
      else {
        secrets++; secLen.push(left.length);
        if (left.join('') !== P.secret.replace(/ /g, '')) pr(`hidden word ${P.secret} vs leftovers ${left.join('')}`);
        if (tw.has(P.secret)) themed++; else if (!W.GENERIC.includes(P.secret)) pr('hidden word from nowhere ' + P.secret);
        if (P.words.some(p => p.w === P.secret)) pr('hidden word is also in the list');
        if (left.length < L.secret[0] || left.length > L.secret[1]) pr('hidden word length ' + left.length);
      }
    } else {
      if (P.secret) pr('Expert has no hidden word');
      decoys += P.decoys.length;
      for (const d of P.decoys) if (P.words.some(p => p.w === d.w)) pr('decoy is a real word ' + d.w);
    }
    if (W.verify(P).length) pr('verify: ' + W.verify(P).join(', '));
    if (s <= 20) { const Q = W.generate(lv, seed, th); if (Q.grid.join('') !== g.join('') || JSON.stringify(Q.words) !== JSON.stringify(P.words)) pr('not deterministic'); }
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length, p99 = times[Math.floor(times.length * .99)], mx = times[times.length - 1];
  const mean = a => (a.reduce((x, y) => x + y, 0) / (a.length || 1)).toFixed(1);
  console.log(`  ${L.name}: ${N} puzzels · woorden gem. ${mean(wc)} (${Math.min(...wc)}-${Math.max(...wc)}) · ${themesSeen.size} thema's` +
    (L.secret ? ` · geheim woord ${secrets}× (lengte gem. ${mean(secLen)}, ${themed} uit het thema)` : ` · lokwoorden gem. ${(decoys / N).toFixed(1)}`) +
    ` · ${fwdOnly} woorden alleen leesrichting · tijd gem. ${avg.toFixed(2)} ms, p99 ${p99.toFixed(1)} ms, max ${mx.toFixed(1)} ms`);
  ok(`${L.name}: elk woord precies één keer, geen tweede kopie, niets onaardigs, geheim woord klopt`, !problems.length, problems.slice(0, 8).join(' | '));
  ok(`${L.name}: snel genoeg (gem. < 15 ms hier, ≈ < 100 ms op een trage telefoon)`, avg < 15, avg.toFixed(2));
  if (L.secret) ok(`${L.name}: altijd een geheim woord`, secrets === N);
  else ok(`${L.name}: lokwoorden`, decoys / N >= L.decoys[0] * .7, (decoys / N).toFixed(1));
}

/* ---------- daily puzzle and selection helpers ---------- */
ok('dagpuzzel: zelfde datum, zelfde puzzel; andere datum, andere puzzel', W.generate(1, W.dailySeed('2026-11-16')).grid.join('') === W.generate(1, W.dailySeed('2026-11-16')).grid.join('') && W.generate(1, W.dailySeed('2026-11-16')).grid.join('') !== W.generate(1, W.dailySeed('2026-11-17')).grid.join(''));
{
  const n = 10, at = (r, c) => r * n + c;
  const t = [[[0, 0], [0, 4.2], [0, 4]], [[0, 0], [4.3, 3.8], [4, 4]], [[5, 5], [5.4, 1], [5, 1]], [[5, 5], [1.2, 8.7], [1, 9]], [[2, 2], [2.1, 2.2], [2, 2]], [[0, 0], [-3, -3], [0, 0]], [[9, 9], [9, 20], [9, 9]]];
  const bad = t.filter(([[r0, c0], [fr, fc], [r1, c1]]) => { const l = W.snapLine(n, at(r0, c0), fr, fc); return l[l.length - 1] !== at(r1, c1); });
  ok('vegen: rechte lijn in een van de 8 richtingen, binnen het rooster', !bad.length, JSON.stringify(bad));
  const P = W.generate(2, 12345), p = P.words[0], c = W.cellsOf(p, P.n);
  ok('woord herkend van begin naar eind en andersom', W.wordAt(P, c[0], c[c.length - 1]) === 0 && W.wordAt(P, c[c.length - 1], c[0]) === 0 && W.wordAt(P, c[0], c[1]) === -1);
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
