  /*CORE-START*/
  /* ---------- letters: own Dutch set (102 letters + 2 blanks) ---------- */
  const N15 = 15, CENTER = 112, BINGO = 40;
  const SET = { e: [16, 1], n: [8, 1], a: [7, 1], o: [6, 1], i: [5, 1], t: [6, 2], r: [6, 2], d: [5, 2], s: [5, 2],
    l: [4, 3], k: [3, 3], g: [3, 3], u: [3, 3], p: [3, 3], m: [3, 3], b: [2, 4], h: [2, 4], v: [2, 4], j: [2, 4], f: [2, 4],
    w: [2, 5], z: [2, 5], c: [2, 5], x: [1, 8], y: [1, 8], q: [1, 10], '?': [2, 0] };
  const VAL = new Uint8Array(26); for (const k in SET) if (k !== '?') VAL[k.charCodeAt(0) - 97] = SET[k][1];
  const val = ch => ch === '?' || ch !== ch.toLowerCase() ? 0 : VAL[ch.charCodeAt(0) - 97];   // board: upper case = blank
  const VOW = 'aeiouy';
  function newBag() { const b = []; for (const k in SET) for (let n = 0; n < SET[k][0]; n++) b.push(k); return shuffle(b); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------- bonus squares: own symmetric layout, '.' none, d = 2L, t = 3L, D = 2W, T = 3W, * = start ---------- */
  const OCT4 = [[0, 0, 't'], [0, 7, 'd'], [1, 1, 'D'], [2, 2, 'd'], [3, 7, 'D'], [4, 4, 'D'], [5, 5, 't'], [6, 6, 'd']];   // on a diagonal or axis: 4 copies
  const OCT8 = [[0, 3, 'T'], [1, 5, 't'], [2, 6, 'd'], [4, 6, 'd']];                                                   // elsewhere in the octant: 8 copies
  const sym = (r, c) => [[r, c], [c, r], [r, 14 - c], [c, 14 - r], [14 - r, c], [14 - c, r], [14 - r, 14 - c], [14 - c, 14 - r]];
  function layoutOf(list) { const b = Array(225).fill('.'); for (const [r, c, k] of list) for (const [y, x] of sym(r, c)) b[y * 15 + x] = k; b[CENTER] = '*'; return b.join(''); }
  const STD = layoutOf(OCT4.concat(OCT8));
  function layoutOk(b) {
    for (let i = 0; i < 225; i++) {
      const k = b[i]; if (k === '.' || k === '*') continue;
      const r = Math.floor(i / 15), c = i % 15;
      if ((k === 'T' || k === 'D') && Math.abs(r - 7) + Math.abs(c - 7) < (k === 'T' ? 7 : 3)) return false;
      const word = x => x === 'D' || x === 'T', bon = x => x !== '.' && x !== '*';   // a word bonus never touches another bonus square
      if ((c < 14 && bon(b[i + 1]) && (word(k) || word(b[i + 1]) || k === b[i + 1])) || (r < 14 && bon(b[i + 15]) && (word(k) || word(b[i + 15]) || k === b[i + 15]))) return false;
      if ([i - 15, i + 15, c > 0 ? i - 1 : -1, c < 14 ? i + 1 : -1].filter(j => j >= 0 && j < 225 && b[j] !== '.').length > 1) return false;   // no clusters
    }
    return true;
  }
  function randomLayout() {
    const c4 = [], c8 = [];
    for (let r = 0; r < 7; r++) { c4.push([r, r], [r, 7]); for (let c = r + 1; c < 7; c++) c8.push([r, c]); }
    for (let tries = 0; tries < 4000; tries++) {
      const a = shuffle(c4.slice()), b = shuffle(c8.slice());
      const L = layoutOf(OCT4.map((o, i) => [a[i][0], a[i][1], o[2]]).concat(OCT8.map((o, i) => [b[i][0], b[i][1], o[2]])));
      if (layoutOk(L)) return L;
    }
    return STD;
  }
  const LMUL = k => k === 'd' ? 2 : k === 't' ? 3 : 1, WMUL = k => k === 'D' ? 2 : k === 'T' ? 3 : 1;

  /* ---------- dictionary: front-coded sorted word list, gzip + base64; unpacked into a trie on first use ----------
     trie node n: L[n] bits 0-4 letter, bit 5 = a word ends here, bit 6 = has children (first child is n + 1); N[n] = next sibling */
  let dict = null, dictP = null;
  function buildTrie(u8) {
    const cap = u8.length + 2, L = new Uint8Array(cap), N = new Int32Array(cap), path = new Int32Array(17);
    let cnt = 1, d = 0, prevLen = 0, fresh = false, words = 0;
    for (let p = 0; p < u8.length; p++) {
      const b = u8[p];
      if (b < 97) { if (p) { L[path[d]] |= 32; words++; prevLen = d; } d = b - 48; fresh = true; continue; }
      const n = cnt++; L[n] = b - 97;
      if (fresh && prevLen > d) N[path[d + 1]] = n; else L[path[d]] |= 64;
      fresh = false; path[++d] = n;
    }
    if (d) { L[path[d]] |= 32; words++; }
    return { L: L.subarray(0, cnt), N: N.subarray(0, cnt), nodes: cnt, words };
  }
  function loadDict() {
    if (dictP) return dictP;
    dictP = (async () => {
      const t0 = performance.now(), bin = atob(DICT), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const raw = new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      const d = buildTrie(raw); d.ms = Math.round(performance.now() - t0); dict = d; return d;
    })();
    dictP.catch(() => { dictP = null; });
    return dictP;
  }
  function child(n, x) {
    const L = dict.L; if (!(L[n] & 64)) return 0;
    for (let j = n + 1; j; j = dict.N[j]) { const l = L[j] & 31; if (l === x) return j; if (l > x) return 0; }
    return 0;
  }
  function isWord(w) {
    w = w.toLowerCase(); if (w.length < 2) return false;
    let n = 0; for (let i = 0; i < w.length; i++) { n = child(n, w.charCodeAt(i) - 97); if (!n) return false; }
    return (dict.L[n] & 32) !== 0;
  }

  /* ---------- rules: check and score a placement ----------
     board: 225 x ('' | 'a'..'z' | 'A'..'Z' = blank), tiles: [{ i, c: 'a'..'z', b: blank }] */
  function evaluate(board, tiles, bonus) {
    if (!tiles.length) return { err: 'Leg eerst letters op het bord' };
    const at = new Map(tiles.map(t => [t.i, t])); if (at.size !== tiles.length) return { err: 'Twee letters op één vakje' };
    for (const t of tiles) if (board[t.i]) return { err: 'Dat vakje is al bezet' };
    const rows = new Set(tiles.map(t => Math.floor(t.i / 15))), cols = new Set(tiles.map(t => t.i % 15));
    if (rows.size > 1 && cols.size > 1) return { err: 'Leg je letters op één rij of in één kolom' };
    const ch = i => at.has(i) ? (at.get(i).b ? at.get(i).c.toUpperCase() : at.get(i).c) : board[i];
    let dir = rows.size === 1 && cols.size === 1 ? -1 : rows.size === 1 ? 0 : 1;
    const step = d => d ? 15 : 1;
    const wordAt = (i, d) => {                          // the full word through cell i in direction d
      const s = step(d), line = d ? i % 15 : Math.floor(i / 15), same = j => (d ? j % 15 : Math.floor(j / 15)) === line;
      let a = i; while (a - s >= 0 && same(a - s) && ch(a - s)) a -= s;
      let b = i; while (b + s < 225 && same(b + s) && ch(b + s)) b += s;
      const cells = []; for (let j = a; j <= b; j += s) cells.push(j); return cells;
    };
    const sorted = tiles.map(t => t.i).sort((x, y) => x - y);
    if (dir < 0) dir = wordAt(sorted[0], 0).length > 1 ? 0 : 1;
    const s = step(dir);
    for (let j = sorted[0]; j <= sorted[sorted.length - 1]; j += s) if (!ch(j)) return { err: 'Er zit een gat tussen je letters' };
    const empty = board.every(x => !x);
    if (empty) {
      if (!at.has(CENTER)) return { err: 'Het eerste woord moet over het middelste vakje ★ gaan' };
      if (tiles.length < 2) return { err: 'Het eerste woord moet minstens twee letters hebben' };
    } else {
      const nb = i => { const r = Math.floor(i / 15), c = i % 15; return (r > 0 && board[i - 15]) || (r < 14 && board[i + 15]) || (c > 0 && board[i - 1]) || (c < 14 && board[i + 1]); };
      if (!tiles.some(t => nb(t.i))) return { err: 'Je woord moet aansluiten op letters die al op het bord liggen' };
    }
    const words = [], main = wordAt(sorted[0], dir);
    if (main.length > 1) words.push(main);
    for (const t of tiles) { const w = wordAt(t.i, 1 - dir); if (w.length > 1) words.push(w); }
    if (!words.length) return { err: 'Een woord moet minstens twee letters hebben' };
    let total = 0;
    const out = words.map(cells => {
      let sum = 0, wm = 1;
      for (const j of cells) { const v = val(ch(j)); if (at.has(j)) { sum += v * LMUL(bonus[j]); wm *= WMUL(bonus[j]); } else sum += v; }
      const w = cells.map(ch).join(''); total += sum * wm;
      return { w: w.toUpperCase(), cells, pts: sum * wm, ok: dict ? isWord(w) : true };
    });
    const bingo = tiles.length === 7;
    if (bingo) total += BINGO;
    return { words: out, score: total, bingo, dir, bad: out.filter(w => !w.ok).map(w => w.w) };
  }

  /* ---------- move generator (Appel & Jacobson: anchors, cross-checks, trie walk) ---------- */
  const ALL = (1 << 26) - 1;
  function generator(board, rack, bonus) {
    const g = new Int8Array(225).fill(-1), gv = new Uint8Array(225), LM = new Uint8Array(225), WM = new Uint8Array(225);
    let empty = true;
    for (let i = 0; i < 225; i++) { LM[i] = LMUL(bonus[i]); WM[i] = WMUL(bonus[i]); const c = board[i]; if (c) { empty = false; const lo = c.toLowerCase(); g[i] = lo.charCodeAt(0) - 97; gv[i] = c === lo ? VAL[g[i]] : 0; } }
    const cnt = new Int8Array(27); for (const c of rack) cnt[c === '?' ? 26 : c.charCodeAt(0) - 97]++;
    const nRack = rack.length, L = dict.L, NX = dict.N;
    const moves = [], seen1 = new Set();
    const cross = new Int32Array(225), csum = new Int16Array(225), anchor = new Uint8Array(225);
    const W = new Int8Array(16), NEWF = new Uint8Array(16), BL = new Uint8Array(16), PL = new Int8Array(16), PB = new Uint8Array(16);
    let dir = 0, line = 0;
    const cell = (l, p) => dir ? p * 15 + l : l * 15 + p;
    function prepare(d) {
      dir = d;
      for (let l = 0; l < 15; l++) for (let p = 0; p < 15; p++) {
        const i = cell(l, p); anchor[i] = 0; if (g[i] >= 0) continue;
        const nbr = (l > 0 && g[cell(l - 1, p)] >= 0) || (l < 14 && g[cell(l + 1, p)] >= 0) || (p > 0 && g[cell(l, p - 1)] >= 0) || (p < 14 && g[cell(l, p + 1)] >= 0);
        anchor[i] = nbr || (empty && i === CENTER) ? 1 : 0;
        // perpendicular word through (l, p): runs over l
        let a = l; while (a > 0 && g[cell(a - 1, p)] >= 0) a--;
        let b = l; while (b < 14 && g[cell(b + 1, p)] >= 0) b++;
        if (a === l && b === l) { cross[i] = ALL; csum[i] = -1; continue; }
        let n = 0, sum = 0, mask = 0;
        for (let k = a; k < l && n >= 0; k++) { const j = cell(k, p); sum += gv[j]; n = child(n, g[j]) || -1; }
        for (let k = l + 1; k <= b; k++) sum += gv[cell(k, p)];
        if (n >= 0 && (L[n] & 64)) for (let j = n + 1; j; j = NX[j]) {
          let m = j; for (let k = l + 1; k <= b && m; k++) m = child(m, g[cell(k, p)]);
          if (m && (L[m] & 32)) mask |= 1 << (L[j] & 31);
        }
        cross[i] = mask; csum[i] = sum;
      }
    }
    function record(start, end) {
      let main = 0, wm = 1, crossT = 0, nn = 0, w = '', key = 0, nw = 0;
      for (let p = start; p < end; p++) {
        const i = cell(line, p), x = W[p];
        if (NEWF[p]) {
          const v = BL[p] ? 0 : VAL[x], lm = LM[i], m = WM[i];
          main += v * lm; wm *= m; nn++; nw |= 1 << (p - start); key = i * 64 + x * 2 + BL[p];
          if (csum[i] >= 0) crossT += (csum[i] + v * lm) * m;
          w += BL[p] ? String.fromCharCode(65 + x) : String.fromCharCode(97 + x);
        } else { main += gv[i]; w += board[i]; }
      }
      if (nn === 1) { if (seen1.has(key)) return; seen1.add(key); }
      moves.push({ d: dir, l: line, s: start, w, nw, n: nn, score: main * wm + crossT + (nn === 7 ? BINGO : 0) });
    }
    function extend(n, p, anc, start) {
      if (p < 15 && g[cell(line, p)] >= 0) { const c = child(n, g[cell(line, p)]); if (c) { W[p] = g[cell(line, p)]; NEWF[p] = 0; extend(c, p + 1, anc, start); } return; }
      if (p > anc && (L[n] & 32)) record(start, p);
      if (p >= 15 || !(L[n] & 64)) return;
      const mask = cross[cell(line, p)]; if (!mask) return;
      for (let j = n + 1; j; j = NX[j]) {
        const x = L[j] & 31; if (!(mask & (1 << x))) continue;
        if (cnt[x]) { cnt[x]--; W[p] = x; NEWF[p] = 1; BL[p] = 0; extend(j, p + 1, anc, start); cnt[x]++; }
        if (cnt[26]) { cnt[26]--; W[p] = x; NEWF[p] = 1; BL[p] = 1; extend(j, p + 1, anc, start); cnt[26]++; }
      }
    }
    function left(n, depth, anc, limit) {
      for (let k = 0; k < depth; k++) { const p = anc - depth + k; W[p] = PL[k]; NEWF[p] = 1; BL[p] = PB[k]; }
      extend(n, anc, anc, anc - depth);
      if (depth >= limit || !(L[n] & 64)) return;
      for (let j = n + 1; j; j = NX[j]) {
        const x = L[j] & 31;
        if (cnt[x]) { cnt[x]--; PL[depth] = x; PB[depth] = 0; left(j, depth + 1, anc, limit); cnt[x]++; }
        if (cnt[26]) { cnt[26]--; PL[depth] = x; PB[depth] = 1; left(j, depth + 1, anc, limit); cnt[26]++; }
      }
    }
    function genLine(l) {
      line = l;
      for (let p = 0; p < 15; p++) {
        if (!anchor[cell(l, p)]) continue;
        if (p > 0 && g[cell(l, p - 1)] >= 0) {          // existing letters directly left of the anchor form the prefix
          let a = p - 1; while (a > 0 && g[cell(l, a - 1)] >= 0) a--;
          let n = 0; for (let k = a; k < p && n >= 0; k++) { W[k] = g[cell(l, k)]; NEWF[k] = 0; n = child(n, g[cell(l, k)]) || -1; }
          if (n > 0) extend(n, p, p, a);
        } else {
          let lim = 0; while (p - lim - 1 >= 0 && g[cell(l, p - lim - 1)] < 0 && !anchor[cell(l, p - lim - 1)]) lim++;
          left(0, 0, p, Math.min(lim, nRack - 1));
        }
      }
    }
    return { moves, prepare, genLine };
  }
  const tilesOf = m => { const t = []; for (let k = 0; k < m.w.length; k++) if (m.nw & (1 << k)) { const i = m.d ? (m.s + k) * 15 + m.l : m.l * 15 + m.s + k, c = m.w[k]; t.push({ i, c: c.toLowerCase(), b: c !== c.toLowerCase() }); } return t; };
  function genMoves(board, rack, bonus) {
    const G = generator(board, rack, bonus);
    for (let d = 0; d < 2; d++) { G.prepare(d); for (let l = 0; l < 15; l++) G.genLine(l); }
    return G.moves;
  }
  async function genMovesAsync(board, rack, bonus, alive) {      // same, but yields to the UI every few ms
    const G = generator(board, rack, bonus); let t = performance.now();
    for (let d = 0; d < 2; d++) {
      G.prepare(d);
      for (let l = 0; l < 15; l++) {
        G.genLine(l);
        if (performance.now() - t > 10) { await new Promise(r => setTimeout(r, 0)); if (alive && !alive()) return null; t = performance.now(); }
      }
    }
    return G.moves;
  }

  /* ---------- computer opponent ---------- */
  const LEAVE = { e: 1.5, n: 1, s: 1.5, r: 1, t: .6, d: .6, a: .5, l: .4, i: -.4, o: -.5, k: 0, g: -.3, p: -.4, m: -.2, u: -1.5, b: -1, h: -.6, v: -1.2, j: -1.2, f: -1, w: -1.4, z: -1.2, c: -2, x: -2.5, y: -3, q: -6 };
  function leaveValue(left, bagN) {
    if (!left.length) return bagN ? 4 : 12;
    if (!bagN) return -2.2 * left.reduce((s, c) => s + val(c), 0);
    let s = 0, v = 0, n = 0; const seen = {};
    for (const c of left) {
      if (c === '?') { s += 7; continue; }
      s += LEAVE[c] || 0; n++; if (VOW.includes(c)) v++;
      seen[c] = (seen[c] || 0) + 1; if (seen[c] > 1) s -= VOW.includes(c) ? 2.5 : 2;
    }
    s -= 1.5 * Math.abs(v - Math.round(n * .42));
    return s;
  }
  const leftAfter = (rack, m) => { const r = rack.slice(); for (const t of tilesOf(m)) r.splice(r.indexOf(t.b ? '?' : t.c), 1); return r; };
  const mainLen = m => m.w.length;
  function choose(moves, rack, level, bagN) {
    if (!moves.length) return null;
    if (level === 'sterk') {
      let best = null, bv = -1e9;
      for (const m of moves) { const v = m.score + leaveValue(leftAfter(rack, m), bagN); if (v > bv) { bv = v; best = m; } }
      return best;
    }
    const by = moves.slice().sort((a, b) => b.score - a.score);
    if (level === 'normaal') { const top = by.slice(0, Math.max(1, Math.ceil(by.length * .3))); return top[Math.floor(Math.random() * top.length)]; }
    let pool = by.filter(m => mainLen(m) <= 5);                  // makkelijk: short words with modest scores
    if (pool.length < 4) pool = by;
    const lo = Math.floor(pool.length * .35), hi = Math.max(lo + 1, Math.ceil(pool.length * .85));
    pool = pool.slice(lo, hi);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function swapPick(rack, level) {           // which tiles the computer throws back
    if (level !== 'sterk') return shuffle(rack.slice()).slice(0, 3 + Math.floor(Math.random() * (rack.length - 2)));
    const keep = [], out = [];
    const order = rack.slice().sort((a, b) => (b === '?' ? 99 : LEAVE[b] || 0) - (a === '?' ? 99 : LEAVE[a] || 0));
    for (const c of order) { if (keep.length < 3 && (c === '?' || (LEAVE[c] || 0) >= .5) && !keep.includes(c)) keep.push(c); else out.push(c); }
    return out.length ? out : rack.slice();
  }
  /*CORE-END*/
