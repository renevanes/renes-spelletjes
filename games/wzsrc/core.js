  /* ================= the puzzle generator: pure logic, deterministic per seed (also runs in Node: wzsrc/load.mjs) =================
     A puzzle is a square grid of capital letters with the words of one theme hidden in it.
       Makkelijk  8x8   words only to the right and down                       geheim woord
       Normaal   10x10  + the two diagonals that read from left to right       geheim woord
       Moeilijk  12x12  all 8 directions, also backwards                       geheim woord
       Expert    14x14  all 8 directions, more words and overlap, decoys        (filler letters)
     Geheim woord: the words are packed so tightly that only a few cells stay free; those cells, read row by row, spell
     a hidden word (an unused word of the theme, or a compliment). Expert fills its free cells with letters from the
     theme instead, plus "decoys": almost-words (a word minus its last letter, or with one letter changed).
     IJ: always the two letters I and J (as in Woordbord); a word with IJ is found by selecting both cells.
     Guarantees (checked by verify() before a puzzle is returned, and by games/wzcore.test.mjs):
       - every word is in the grid exactly once, in all 8 directions together (no second, accidental copy);
       - no word of the list is part of another word of the same puzzle (forwards or backwards), no palindromes;
       - no blocklisted word anywhere: BLOCK in all 8 directions, BLOCK_FWD in the 4 reading directions (a word whose
         reverse contains one of those, like REGEN or KIP, is only placed in a reading direction). */
  const CORE_V = 1;
  const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];   // [dr, dc]; 0-3 read forwards
  const LEVELS = [
    { id: 'mk', name: 'Makkelijk', n: 8, dirs: 2, words: [7, 13], secret: [5, 14, 10], maxLen: 7, ov: .4, bal: 1.6, desc: '8×8 · naar rechts en naar beneden' },
    { id: 'nm', name: 'Normaal', n: 10, dirs: 4, words: [10, 19], secret: [6, 14, 11], maxLen: 9, ov: .9, bal: 2.6, desc: '10×10 · ook schuin' },
    { id: 'md', name: 'Moeilijk', n: 12, dirs: 8, words: [14, 27], secret: [6, 14, 12], maxLen: 11, ov: 1.2, bal: 1.4, desc: '12×12 · alle kanten op, ook achterstevoren' },
    { id: 'ex', name: 'Expert', n: 14, dirs: 8, words: [22, 28], secret: null, decoys: [6, 10], maxLen: 14, ov: 2.4, bal: .9, desc: '14×14 · veel woorden en lokwoorden' },
  ];
  const BLOCK = ['KUT', 'LUL', 'SEKS', 'SEX', 'NEUK', 'HOER', 'KANKER', 'TYFUS', 'TERING', 'KLOTE', 'PIEMEL', 'TIET', 'SLET', 'KONT', 'FUCK', 'SHIT',
    'NAZI', 'HITLER', 'FLIKKER', 'MONGOOL', 'HOMO', 'GVD', 'KDK', 'TRUT', 'BITCH', 'DIKZAK', 'SUKKEL', 'IDIOOT', 'DEBIEL'];
  const BLOCK_FWD = ['NEGER', 'PIK', 'PIS', 'KAK'];
  // compliments for the hidden word when no unused theme word has the right length (spaces are not in the grid)
  const GENERIC = ['GOED ZO', 'SUPER', 'TOPPER', 'BRAVO', 'PRIMA', 'GEWELDIG', 'FANTASTISCH', 'KNAP GEDAAN', 'GOED GEDAAN', 'LEKKER BEZIG', 'WAT GOED', 'JIJ BENT TOP',
    'GOED GEZOCHT', 'PRACHTIG', 'SCHITTEREND', 'UITSTEKEND', 'KAMPIOEN', 'SPEURNEUS', 'GEVONDEN', 'OPGELOST', 'HARTSTIKKE GOED', 'WAT KNAP', 'HELEMAAL GOED',
    'SUPER GEZOCHT', 'GOED GEKEKEN', 'ALLES GEVONDEN', 'GOED BEZIG', 'TOP GEDAAN', 'WAT SLIM', 'SLIMMERIK', 'GENIAAL', 'TOPPRESTATIE'];
  const REV = new Map(), rev = w => { let r = REV.get(w); if (r === undefined) { r = w.split('').reverse().join(''); if (REV.size > 5000) REV.clear(); REV.set(w, r); } return r; };
  const pal = w => w === rev(w);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wordsOf = th => th._w || (th._w = [...new Set(th.w.split(/\s+/).filter(Boolean))]);
  const RB = new Map(), revBad = w => { let v = RB.get(w); if (v === undefined) { v = BLOCK_FWD.some(b => rev(w).includes(b)); RB.set(w, v); } return v; };   // only in a reading direction
  const related = (a, b) => a.includes(b) || b.includes(a) || a.includes(rev(b)) || rev(a).includes(b);


  /* ---------- the lines of a grid: rows, columns and both diagonals, each in its reading direction ---------- */
  const LINES = {};
  function linesOf(n) {
    if (LINES[n]) return LINES[n];
    const out = [], at = Array.from({ length: n * n }, () => []);
    const run = (r, c, dr, dc) => { const cells = []; while (r >= 0 && r < n && c >= 0 && c < n) { cells.push(r * n + c); r += dr; c += dc; } if (cells.length >= 3) { cells.forEach(i => at[i].push(out.length)); out.push(cells); } };
    for (let r = 0; r < n; r++) run(r, 0, 0, 1);
    for (let c = 0; c < n; c++) run(0, c, 1, 0);
    for (let k = 0; k < n; k++) { run(0, k, 1, 1); if (k) run(k, 0, 1, 1); }
    for (let k = 0; k < n; k++) { run(n - 1, k, -1, 1); if (k < n - 1) run(k, 0, -1, 1); }
    out.at = at;                                           // at[cell] = the lines through that cell
    return (LINES[n] = out);
  }
  const lineStr = (g, cells) => { let s = ''; for (const i of cells) s += g[i] || '.'; return s; };
  const lineStrs = (g, n) => linesOf(n).map(cells => lineStr(g, cells));
  function countIn(strs, w, r = rev(w)) {
    let k = 0; const both = r !== w;
    for (const s of strs) { for (let i = s.indexOf(w); i >= 0; i = s.indexOf(w, i + 1)) k++; if (both) for (let i = s.indexOf(r); i >= 0; i = s.indexOf(r, i + 1)) k++; }
    return k;
  }
  const BLOCK_R = BLOCK.map(rev);
  function blocked(strs) {
    for (const s of strs) {
      for (let k = 0; k < BLOCK.length; k++) if (s.includes(BLOCK[k]) || s.includes(BLOCK_R[k])) return BLOCK[k];
      for (const b of BLOCK_FWD) if (s.includes(b)) return b;
    }
    return null;
  }
  function cellsOf(p, n) { const [dr, dc] = DIRS[p.d], out = []; for (let k = 0; k < p.w.length; k++) out.push((p.r + dr * k) * n + p.c + dc * k); return out; }
  function freeCells(P) { const used = new Uint8Array(P.n * P.n); for (const p of P.words) for (const i of cellsOf(p, P.n)) used[i] = 1; const out = []; for (let i = 0; i < used.length; i++) if (!used[i]) out.push(i); return out; }
  // every word exactly once, nothing rude, the hidden word right; returns a list of problems (empty = fine)
  function verify(P) {
    const strs = lineStrs(P.grid, P.n), bad = [];
    for (const p of P.words) {
      const k = countIn(strs, p.w); if (k !== 1) bad.push(p.w + ' x' + k);
      if (cellsOf(p, P.n).map(i => P.grid[i]).join('') !== p.w) bad.push(p.w + ' not at its place');
      if (P.words.some(q => q !== p && related(q.w, p.w))) bad.push(p.w + ' inside another word');
    }
    const b = blocked(strs); if (b) bad.push('blocked ' + b);
    if (P.grid.length !== P.n * P.n || P.grid.some(ch => !/^[A-Z]$/.test(ch || ''))) bad.push('empty cell');
    if (P.secret) { const free = freeCells(P); if (free.map(i => P.grid[i]).join('') !== P.secret.replace(/ /g, '')) bad.push('secret'); }
    return bad;
  }

  /* ---------- placing words ---------- */
  // a board under construction keeps its line strings up to date, so checking a new word only touches its own lines
  function board(n) {
    const g = new Array(n * n).fill(''), L = linesOf(n), strs = L.map(c => '.'.repeat(c.length));
    return {
      n, g, strs,
      set(cells, letters) { const touched = new Set(); cells.forEach((i, k) => { g[i] = letters[k]; for (const l of L.at[i]) touched.add(l); }); for (const l of touched) strs[l] = lineStr(g, L[l]); return [...touched]; },
    };
  }
  // the best spot for word w (or null): new cells it covers, letters it shares with words already there, edges, a little chance
  function bestSpot(g, n, w, dirs, R, ovW, minFree, free, db) {
    let best = null, bs = -1e9; const len = w.length, fwdOnly = revBad(w), last = n - 1;
    for (let d = 0; d < dirs; d++) {
      if (fwdOnly && d >= 4) continue;
      const dr = DIRS[d][0], dc = DIRS[d][1], step = dr * n + dc;
      const r0 = dr < 0 ? len - 1 : 0, r1 = dr > 0 ? n - len : last, c0 = dc < 0 ? len - 1 : 0, c1 = dc > 0 ? n - len : last;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        let ov = 0, edge = 0, k = 0, i = r * n + c, rr = r, cc = c;
        for (; k < len; k++, i += step, rr += dr, cc += dc) {
          const ch = g[i];
          if (ch) { if (ch !== w[k]) break; ov++; }
          else { if (rr === 0 || rr === last) edge++; if (cc === 0 || cc === last) edge++; }
        }
        if (k < len || ov > len - 2) continue;
        const nw = len - ov;
        if (free - nw < minFree) continue;
        const sc = nw + ov * ovW + edge * .2 + R() * 2.2 + (db ? db[d] : 0);
        if (sc > bs) { bs = sc; best = { r, c, d, ov, nw }; }
      }
    }
    return best;
  }
  // put word w at spot s; false (and nothing changed) if that makes a second copy of any word or something rude
  function tryPut(B, placed, w, s, decoy) {
    const n = B.n, cells = cellsOf({ w, r: s.r, c: s.c, d: s.d }, n), old = cells.map(i => B.g[i]);
    const touched = B.set(cells, w), loc = touched.map(l => B.strs[l]);
    let ok = (decoy || countIn(B.strs, w) === 1) && !blocked(loc);
    for (let k = 0; ok && k < placed.length; k++) if (countIn(loc, placed[k].w, placed[k].r_) !== placed[k].here(touched)) ok = false;
    if (!ok) { B.set(cells, old); return false; }
    return true;
  }
  function placeRec(n, w, s) {
    const p = { w, r: s.r, c: s.c, d: s.d }, cells = cellsOf(p, n), L = linesOf(n), own = new Set();
    for (const i of cells) for (const l of L.at[i]) own.add(l);
    // how often the word itself is in a set of lines: once in its own line, never in lines that only cross it
    const mine = L.findIndex(c => cells.every(i => c.includes(i)));
    Object.defineProperties(p, { r_: { value: rev(w) }, here: { value: lines => lines.includes(mine) ? 1 : 0 } });
    return p;
  }

  function attempt(Lv, th, R) {
    const n = Lv.n, N = n * n, B = board(n), g = B.g;
    const smin = Lv.secret ? Lv.secret[0] : 0, smax = Lv.secret ? Lv.secret[1] : N;
    // geheim woord: pick it first (a theme word that will not be hidden), then pack the others until exactly that many cells are left
    let hid = null;
    if (Lv.secret) { const opts = wordsOf(th).filter(w => w.length >= smin && w.length <= Lv.secret[2]); if (opts.length) hid = opts[Math.floor(R() * opts.length)]; }
    const pool = shuffle(wordsOf(th).filter(w => w.length >= 3 && w.length <= Lv.maxLen && !pal(w) && (!hid || (w !== hid && !related(w, hid)))), R);
    const placed = []; let free = N;
    const target = Lv.words[0] + Math.floor(R() * (Lv.words[1] - Lv.words[0] + 1));
    const stop = hid ? hid.length : smin + 1 + Math.floor(R() * (smax - smin - 1));
    while (placed.length < Lv.words[1]) {
      if (Lv.secret && free <= stop && placed.length >= Lv.words[0]) break;
      if (!Lv.secret && placed.length >= target) break;
      const cand = pool.filter(w => !placed.some(p => p.w === w || related(p.w, w)));
      if (!cand.length) break;
      // long words first while the grid is empty, shorter ones to plug the last holes
      const full = 1 - free / N, early = full < .55, lw = early ? .3 : 0;
      cand.sort((a, b) => (b.length - a.length) * (early ? 1 : -.4) + (R() - .5) * 5);
      const keepFree = !hid ? (Lv.secret ? smin : 0) : placed.length + 1 < Lv.words[0] ? hid.length + 3 : hid.length;
      // mix the directions: a direction that is used less than its share gets a bonus (words cross instead of lining up in rows)
      const cnt = new Array(Lv.dirs).fill(0); for (const p of placed) cnt[p.d]++;
      const db = cnt.map(c => Lv.bal * ((placed.length + 1) / Lv.dirs - c));
      let best = null;
      for (const w of cand.slice(0, Lv.secret && full >= .8 ? 16 : 6)) {
        const s = bestSpot(g, n, w, Lv.dirs, R, Lv.ov, keepFree, free, db);
        if (s) { s.v = s.nw + s.ov * Lv.ov + w.length * lw + (hid && free - s.nw === hid.length ? 4 : 0); if (!best || s.v > best.s.v) best = { w, s }; }
      }
      if (!best) break;
      if (!tryPut(B, placed, best.w, best.s)) { pool.splice(pool.indexOf(best.w), 1); continue; }   // never this word in this puzzle
      placed.push(placeRec(n, best.w, best.s)); free -= best.s.nw;
    }
    if (placed.length < Lv.words[0]) return null;
    const P = { v: CORE_V, n, lv: LEVELS.indexOf(Lv), th: th.id, words: placed.map(p => ({ w: p.w, r: p.r, c: p.c, d: p.d })), grid: g, secret: null, decoys: [] };
    const freeIdx = []; for (let i = 0; i < N; i++) if (!g[i]) freeIdx.push(i);
    if (Lv.secret) {
      if (free < smin || free > smax) return null;
      const themed = shuffle(wordsOf(th).filter(w => w.length === free && w !== hid && !placed.some(p => p.w === w)), R);
      if (hid && hid.length === free) themed.unshift(hid);
      for (const s of [...themed, ...shuffle(GENERIC.filter(w => w.replace(/ /g, '').length === free), R)]) {
        B.set(freeIdx, s.replace(/ /g, ''));
        if (placed.every(p => countIn(B.strs, p.w, p.r_) === 1) && !blocked(B.strs)) { P.secret = s; return P; }
      }
      return null;
    }
    // Expert: decoys (a word without its last letter or two, or with one letter changed), then filler letters from the theme's own words
    const want = Lv.decoys[0] + Math.floor(R() * (Lv.decoys[1] - Lv.decoys[0] + 1));
    for (let t = 0; t < want * 14 && P.decoys.length < want; t++) {
      const src = placed[Math.floor(R() * placed.length)].w; if (src.length < 5) continue;
      let dw;
      if (R() < .55) dw = src.slice(0, src.length - 1 - (R() < .3 ? 1 : 0));
      else { const k = 1 + Math.floor(R() * (src.length - 2)), al = 'AEIOURSTLNKD'.replace(src[k], ''); dw = src.slice(0, k) + al[Math.floor(R() * al.length)] + src.slice(k + 1); }
      if (placed.some(p => p.w === dw) || pal(dw) || revBad(dw)) continue;
      const s = bestSpot(g, n, dw, Lv.dirs, R, 1.5, 0, free);
      if (!s) continue;
      if (!tryPut(B, placed, dw, s, true)) continue;
      free -= s.nw; P.decoys.push({ w: dw, r: s.r, c: s.c, d: s.d });
    }
    const bag = placed.map(p => p.w).join('') + 'EEEAANNRRTTOOIISSLLDDKKGGMMUUBBPPVVHHWWZZJC';
    const rest = freeIdx.filter(i => !g[i]);
    for (let t = 0; t < 30; t++) {
      B.set(rest, rest.map(i => (t && g[i] && R() < .6) ? g[i] : bag[Math.floor(R() * bag.length)]));
      if (placed.every(p => countIn(B.strs, p.w, p.r_) === 1) && !blocked(B.strs)) return P;
    }
    return null;
  }
  // one puzzle: level 0-3, any 32-bit seed, optionally a theme id; the same input always gives the same puzzle
  function generate(lv, seed, themeId) {
    const Lv = LEVELS[lv], R = rng(seed);
    const fixed = themeId && THEMES.find(t => t.id === themeId);
    for (let k = 0; k < 400; k++) {
      const th = fixed || THEMES[Math.floor(R() * THEMES.length)];
      const P = attempt(Lv, th, R);
      if (P) { P.seed = seed >>> 0; P.tries = k + 1; return P; }
    }
    return null;
  }
  const dailySeed = day => hashStr('woordzoeker ' + day);

  /* ---------- selecting ---------- */
  // which word lies between two cells (either way round)? -1: none
  function wordAt(P, a, b) {
    for (let k = 0; k < P.words.length; k++) {
      const c = cellsOf(P.words[k], P.n), s = c[0], e = c[c.length - 1];
      if ((a === s && b === e) || (a === e && b === s)) return k;
    }
    return -1;
  }
  // the straight line of cells from a towards b, snapped to the nearest of the 8 directions (fr, fc: the finger, in cells)
  function snapLine(n, a, fr, fc) {
    const r0 = Math.floor(a / n), c0 = a % n, dr = fr - r0, dc = fc - c0;
    if (Math.hypot(dr, dc) < .5) return [a];
    const oct = ((Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) % 8) + 8) % 8;
    const sr = Math.round(Math.sin(oct * Math.PI / 4)), sc = Math.round(Math.cos(oct * Math.PI / 4));
    const along = sr && sc ? (dr * sr + dc * sc) / 2 : dr * sr + dc * sc;          // projection onto that direction, in steps
    const len = Math.max(0, Math.round(along)), out = [a];
    for (let k = 1; k <= len; k++) { const r = r0 + sr * k, c = c0 + sc * k; if (r < 0 || r >= n || c < 0 || c >= n) break; out.push(r * n + c); }
    return out;
  }
