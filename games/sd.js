/* ================================================================
   SUDOKU – generated puzzles with a unique solution, three levels,
   pencil notes, highlighting, undo, hints and a saved game
   ================================================================ */
const Sudoku = (() => {
  const LEVELS = { makkelijk: { clues: 40, name: 'Makkelijk', desc: 'alleen de enige plek', ok: g => g.ok && g.lvl === 1 },
    normaal: { clues: 32, name: 'Normaal', desc: 'soms een slimme stap', ok: g => g.ok && g.lvl <= 2 },
    moeilijk: { clues: 26, name: 'Moeilijk', desc: 'tweetallen en vaste cijfers', ok: g => g.ok && (g.lvl === 2 || g.lvl === 3) },
    expert: { clues: 17, name: 'Expert', desc: 'X-vleugel, Y-vleugel en meer', any: true, ok: g => g.ok && g.lvl >= 3 && g.n4 <= 1 },
    meester: { clues: 17, name: 'Meester', desc: 'ketens, kleuren en vliegers', any: true, ok: g => g.ok && g.lvl === 4 && g.n4 >= 2 } };
  const D = { level: 'makkelijk', sound: true, errors: 'direct', pencil: false };
  const opt = Object.assign({}, D, store.get('sd.settings', {}));
  const saveOpt = () => store.set('sd.settings', opt);
  let stats = Object.assign({ played: 0, won: 0, best: {}, noHelp: 0 }, store.get('sd.stats', {}));
  const saveStats = () => store.set('sd.stats', stats);
  Sfx.gate('sd', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  let S = null, sel = -1, timer = 0, undo = [];
  const board = $('#sdBoard'), pad = $('#sdPad');
  const ROW = i => Math.floor(i / 9), COL = i => i % 9, BOX = i => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const PEERS = Array.from({ length: 81 }, (_, i) => { const p = []; for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) p.push(j); return p; });
  const UNITS = []; for (let k = 0; k < 9; k++) { UNITS.push([...Array(9)].map((_, j) => k * 9 + j)); UNITS.push([...Array(9)].map((_, j) => j * 9 + k)); UNITS.push([...Array(9)].map((_, j) => (Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + j % 3)); }

  /* ---------- generator / solver (bitmask, fewest-candidates first) ---------- */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function solve(g, limit, randomize) {
    const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0); let count = 0, first = null;
    for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; rows[ROW(i)] |= b; cols[COL(i)] |= b; boxes[BOX(i)] |= b; }
    const rec = () => {
      let best = -1, bestM = 0, bestN = 10;
      for (let i = 0; i < 81; i++) if (!g[i]) { const m = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3FE; let n = 0; for (let v = m; v; v &= v - 1) n++; if (n < bestN) { best = i; bestM = m; bestN = n; if (!n) return false; } }
      if (best < 0) { count++; if (!first) first = g.slice(); return count >= limit; }
      let ds = []; for (let d = 1; d <= 9; d++) if (bestM & (1 << d)) ds.push(d); if (randomize) shuffle(ds);
      const r = ROW(best), c = COL(best), bx = BOX(best);
      for (const d of ds) {
        const b = 1 << d; g[best] = d; rows[r] |= b; cols[c] |= b; boxes[bx] |= b;
        if (rec()) { g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b; return true; }
        g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b;
      }
      return false;
    };
    rec(); return { count, first };
  }
  // a puzzle of the right kind: few enough clues, and solvable step by step with the techniques the hints can explain
  function tryOne(level) { const g = generate1(level); g.grade = grade(g.puz); g.good = LEVELS[level].ok(g.grade); return g; }
  const better = (a, b) => !a || (b.good && !a.good) || (b.good === a.good && b.grade.ok && !a.grade.ok) || (b.good === a.good && b.grade.ok === a.grade.ok && b.clues < a.clues);
  function generate(level, tries = 400) {
    let best = null;
    for (let k = 0; k < tries; k++) { const g = tryOne(level); if (better(best, g)) best = g; if (best.good && (LEVELS[level].any || best.clues <= LEVELS[level].clues + 2)) break; }
    return { puz: best.puz, sol: best.sol, grade: best.grade };
  }
  function generateAsync(level, done) {        // in small slices, so the screen keeps moving on a slow phone
    let best = null, k = 0; const t0 = performance.now();
    const run = () => {
      const end = performance.now() + 24;
      while (performance.now() < end) { const g = tryOne(level); k++; if (better(best, g)) best = g; if ((best.good && (LEVELS[level].any || best.clues <= LEVELS[level].clues + 2)) || k >= 600 || performance.now() - t0 > 8000) return done({ puz: best.puz, sol: best.sol, grade: best.grade }); }
      setTimeout(run, 0);
    };
    run();
  }
  function generate1(level) {
    const sol = solve(new Array(81).fill(0), 1, true).first, puz = sol.slice(), target = LEVELS[level].clues;
    let clues = 81;
    for (const i of shuffle([...Array(41).keys()])) {        // remove symmetric pairs while the solution stays unique
      if (clues <= target) break;
      const j = 80 - i, a = puz[i], b = puz[j]; puz[i] = 0; puz[j] = 0;
      if (solve(puz.slice(), 2).count !== 1) { puz[i] = a; puz[j] = b; } else clues -= i === j ? 1 : 2;
    }
    return { puz, sol, clues };
  }

  /* ---------- explained hints: a solver that works like a person and says why (in Dutch) ----------
     State: vals (81 digits, 0 = empty) and cand (81 bitmasks of the digits that can still go there).
     Every technique returns one step: { name, text, place: [i, d] | null, elim: [[i, d], …], hl: { … }, cand } */
  const BIT = d => 1 << d, POP = m => { let n = 0; for (; m; m &= m - 1) n++; return n; };
  const DIGS = m => { const r = []; for (let d = 1; d <= 9; d++) if (m & (1 << d)) r.push(d); return r; };
  const BOXN = ['linksboven', 'bovenaan in het midden', 'rechtsboven', 'links in het midden', 'in het midden', 'rechts in het midden', 'linksonder', 'onderaan in het midden', 'rechtsonder'];
  const boxName = k => k === 4 ? 'het middelste blok' : `het blok ${BOXN[k]}`;
  const uKind = u => u % 3, uIdx = u => Math.floor(u / 3);                       // UNITS: 3k = row k, 3k+1 = column k, 3k+2 = box k
  const uName = u => uKind(u) === 0 ? `rij ${uIdx(u) + 1}` : uKind(u) === 1 ? `kolom ${uIdx(u) + 1}` : boxName(uIdx(u));
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const cN = i => `R${ROW(i) + 1}K${COL(i) + 1}`;
  const and = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1];
  const or = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' of ' + a[a.length - 1];
  const cells = a => and(a.map(cN));
  const een = d => `de ${d}`;
  const combos = (arr, n) => { const out = [], cur = []; const rec = s => { if (cur.length === n) { out.push(cur.slice()); return; } for (let k = s; k < arr.length; k++) { cur.push(arr[k]); rec(k + 1); cur.pop(); } }; rec(0); return out; };
  // notes (optional): the player's pencil marks. A cell with notes counts as "already worked out" (only those digits are left),
  // but only when the right digit is still among them (sol), so a slip in the notes can never lead to a wrong hint
  function mkState(vals, elim, notes, sol) {
    const cand = new Array(81).fill(0), gone = elim ? elim.slice() : new Array(81).fill(0), mine = new Array(81).fill(0);
    for (let i = 0; i < 81; i++) if (!vals[i]) {
      let m = 0x3FE; for (const j of PEERS[i]) if (vals[j]) m &= ~BIT(vals[j]);
      m &= ~((elim && elim[i]) || 0);
      if (notes && notes[i] && sol && (notes[i] & BIT(sol[i]))) { mine[i] = m & ~notes[i]; m &= notes[i]; gone[i] |= mine[i]; }
      cand[i] = m;
    }
    return { vals, cand, gone, mine };
  }
  function applyStep(st, s) {
    for (const [i, d] of s.elim || []) { st.cand[i] &= ~BIT(d); st.gone[i] |= BIT(d); }
    if (s.place) { const [i, d] = s.place; st.vals[i] = d; st.cand[i] = 0; for (const j of PEERS[i]) st.cand[j] &= ~BIT(d); }
  }
  const unitDigits = (st, u) => { let m = 0; for (const j of UNITS[u]) if (st.vals[j]) m |= BIT(st.vals[j]); return m; };
  const where = (st, u, d) => UNITS[u].filter(j => !st.vals[j] && (st.cand[j] & BIT(d)));
  const elimText = el => { const by = new Map(); for (const [i, d] of el) { if (!by.has(d)) by.set(d, []); by.get(d).push(i); } return and([...by].map(([d, cs]) => `${een(d)} bij ${cells(cs)}`)); };
  const unitOrder = () => { const o = []; for (const t of [2, 0, 1]) for (let k = 0; k < 9; k++) o.push(k * 3 + t); return o; };   // boxes first: easiest to see
  const UORD = unitOrder();

  // 1. last empty cell of a row, column or box
  function fullHouse(st) {
    for (const u of UORD) {
      const e = UNITS[u].filter(j => !st.vals[j]); if (e.length !== 1) continue;
      const i = e[0], d = DIGS(0x3FE & ~unitDigits(st, u))[0]; if (!d) continue;
      return { name: 'Laatste vakje', place: [i, d], hl: { unit: UNITS[u], tgt: [i] },
        text: `In ${uName(u)} is nog maar één vakje leeg: ${cN(i)}. Van de cijfers 1 tot en met 9 mist ${uName(u)} alleen nog ${een(d)}, dus die moet daar.` };
    }
    return null;
  }
  // why can the digit d not go in cell e? (a d in the same row, column or box, or crossed out before)
  function blockOf(st, e, d) {
    for (const [same, word] of [[j => ROW(j) === ROW(e), 'rij'], [j => COL(j) === COL(e), 'kolom'], [j => BOX(j) === BOX(e), 'blok']]) {
      const j = PEERS[e].find(x => same(x) && st.vals[x] === d); if (j != null) return { j, word };
    }
    return null;
  }
  function blockersText(st, u, d, others) {
    const groups = new Map(), gone = [];
    for (const e of others) {
      const b = blockOf(st, e, d); if (!b) { gone.push(e); continue; }
      const key = b.j + b.word; if (!groups.has(key)) groups.set(key, { ...b, cs: [] }); groups.get(key).cs.push(e);
    }
    const lines = [...groups.values()].map(g => {
      const unit = g.word === 'rij' ? `rij ${ROW(g.j) + 1}` : g.word === 'kolom' ? `kolom ${COL(g.j) + 1}` : boxName(BOX(g.j));
      return `${unit} heeft al ${een(d)} (in ${cN(g.j)})`;
    });
    if (gone.length) lines.push(`bij ${cells(gone)} is ${een(d)} al weggestreept`);
    const src = [...groups.values()].map(g => g.j), ray = [];
    for (const g of groups.values()) for (let k = 0; k < 9; k++) { const x = g.word === 'rij' ? ROW(g.j) * 9 + k : g.word === 'kolom' ? k * 9 + COL(g.j) : UNITS[BOX(g.j) * 3 + 2][k]; if (!UNITS[u].includes(x)) ray.push(x); }
    return { lines, src, ray, gone };
  }
  // 2. hidden single: the only place for a digit in a box, row or column
  function hiddenSingle(st, only) {
    for (const u of UORD) {
      if (only != null && !UNITS[u].includes(only)) continue;
      const have = unitDigits(st, u);
      for (let d = 1; d <= 9; d++) {
        if (have & BIT(d)) continue;
        const w = where(st, u, d); if (w.length !== 1 || (only != null && w[0] !== only)) continue;
        const i = w[0], others = UNITS[u].filter(j => !st.vals[j] && j !== i), b = blockersText(st, u, d, others);
        return { name: `Enige plek in ${uName(u)}`, place: [i, d], hl: { unit: UNITS[u], src: b.src, ray: b.ray, no: others, tgt: [i] },
          text: `In ${uName(u)} moet ergens ${een(d)} komen. Kijk waar dat kan: ${b.lines.join('; ')}.` + (others.length ? ` Daardoor kan ${een(d)} niet in ${others.length === 1 ? 'het andere lege vakje' : `de ${others.length} andere lege vakjes`} van ${uName(u)} (rood gekruist).` : '') + ` Er blijft maar één plek over: ${cN(i)}.` };
      }
    }
    return null;
  }
  // 3. naked single: only one digit fits in a cell
  function nakedSingle(st, only) {
    for (let i = 0; i < 81; i++) {
      if (only != null && i !== only) continue;
      if (st.vals[i] || POP(st.cand[i]) !== 1) continue;
      const d = DIGS(st.cand[i])[0], rU = ROW(i) * 3, cU = COL(i) * 3 + 1, bU = BOX(i) * 3 + 2;
      const seen = new Set(), part = [], src = [];
      for (const u of [rU, cU, bU]) {
        const ds = []; for (const j of UNITS[u]) if (st.vals[j] && !seen.has(st.vals[j])) { seen.add(st.vals[j]); ds.push(st.vals[j]); src.push(j); }
        if (ds.length) part.push(part.length ? `${uName(u)} voegt daar ${and(ds.sort((a, b) => a - b))} aan toe` : `${uName(u)} heeft al ${and(ds.sort((a, b) => a - b))}`);
      }
      const goneAll = DIGS(st.gone[i]).filter(x => !seen.has(x) && x !== d), own = goneAll.filter(x => st.mine && (st.mine[i] & BIT(x))), gone = goneAll.filter(x => !own.includes(x));
      return { name: 'Enige cijfer dat past', place: [i, d], hl: { unit: [...UNITS[rU], ...UNITS[cU], ...UNITS[bU]], src, tgt: [i] },
        text: `Kijk naar ${cN(i)}. ${cap(part.join('; '))}.` + (own.length ? ` In je potlood heb je hier ${and(own.map(een))} al weggestreept.` : '') + (gone.length ? ` Eerder ${gone.length === 1 ? 'is' : 'zijn'} hier ook ${and(gone.map(een))} weggestreept.` : '') + ` Van 1 tot en met 9 blijft alleen ${een(d)} over, dus hier moet ${een(d)}.` };
    }
    return null;
  }
  // 4. pointing: in a box the digit is only in one row (column), so not in the rest of that row (column)
  function pointing(st) {
    for (let b = 0; b < 9; b++) for (let d = 1; d <= 9; d++) {
      const w = where(st, b * 3 + 2, d); if (w.length < 2) continue;
      for (const [same, line, lu] of [[j => ROW(j), 'rij', r => r * 3], [j => COL(j), 'kolom', c => c * 3 + 1]]) {
        if (!w.every(j => same(j) === same(w[0]))) continue;
        const L = lu(same(w[0])), el = UNITS[L].filter(j => BOX(j) !== b && !st.vals[j] && (st.cand[j] & BIT(d))).map(j => [j, d]);
        if (!el.length) continue;
        return { name: 'Vast in één ' + line, elim: el, cand: true, keyD: [d], hl: { unit: UNITS[b * 3 + 2], pat: w, ray: UNITS[L].filter(j => BOX(j) !== b) },
          text: `In ${boxName(b)} kan ${een(d)} alleen nog in ${line} ${same(w[0]) + 1} staan (de gele vakjes ${cells(w)}). Welk vakje het ook wordt: ${een(d)} van ${line} ${same(w[0]) + 1} komt in dit blok. Dus kan ${een(d)} nergens anders in ${line} ${same(w[0]) + 1}. Weg: ${elimText(el)}.` };
      }
    }
    return null;
  }
  // 5. claiming (box-line): in a row (column) the digit is only inside one box, so not in the rest of that box
  function claiming(st) {
    for (const u of UORD) {
      if (uKind(u) === 2) continue;
      for (let d = 1; d <= 9; d++) {
        const w = where(st, u, d); if (w.length < 2 || !w.every(j => BOX(j) === BOX(w[0]))) continue;
        const b = BOX(w[0]), el = UNITS[b * 3 + 2].filter(j => !UNITS[u].includes(j) && !st.vals[j] && (st.cand[j] & BIT(d))).map(j => [j, d]);
        if (!el.length) continue;
        return { name: `Vast in één blok`, elim: el, cand: true, keyD: [d], hl: { unit: UNITS[u], pat: w, ray: UNITS[b * 3 + 2].filter(j => !UNITS[u].includes(j)) },
          text: `In ${uName(u)} kan ${een(d)} alleen nog in ${boxName(b)} staan (${cells(w)}). Dan is ${een(d)} van ${boxName(b)} ook één van deze vakjes. In de rest van het blok kan ${een(d)} dus niet meer. Weg: ${elimText(el)}.` };
      }
    }
    return null;
  }
  const NUMW = ['', 'één', 'twee', 'drie', 'vier'];
  // 6. naked pair/triple: n cells in a unit that together can only hold n digits
  function nakedSub(st, n) {
    for (const u of UORD) {
      const e = UNITS[u].filter(j => !st.vals[j] && POP(st.cand[j]) >= 2 && POP(st.cand[j]) <= n); if (e.length < n) continue;
      for (const cs of combos(e, n)) {
        let m = 0; for (const j of cs) m |= st.cand[j]; if (POP(m) !== n) continue;
        const ds = DIGS(m), el = []; for (const j of UNITS[u]) if (!cs.includes(j) && !st.vals[j]) for (const d of ds) if (st.cand[j] & BIT(d)) el.push([j, d]);
        if (!el.length) continue;
        return { name: ['', '', 'Tweetal', 'Drietal', 'Viertal'][n], elim: el, cand: true, keyD: ds, hl: { unit: UNITS[u], pat: cs },
          text: `In ${uName(u)} kunnen ${cells(cs)} alleen ${or(ds)} worden. ${cap(NUMW[n])} vakjes en samen maar ${NUMW[n]} cijfers: ${and(ds)} komen dus precies in deze ${NUMW[n]} vakjes. Andere vakjes in ${uName(u)} kunnen geen ${or(ds)} meer worden. Weg: ${elimText(el)}.` };
      }
    }
    return null;
  }
  // 7. hidden pair/triple: n digits that in a unit can only go in the same n cells
  function hiddenSub(st, n) {
    for (const u of UORD) {
      const have = unitDigits(st, u), ds0 = []; for (let d = 1; d <= 9; d++) if (!(have & BIT(d))) { const w = where(st, u, d); if (w.length >= 2 && w.length <= n) ds0.push(d); }
      if (ds0.length < n) continue;
      for (const ds of combos(ds0, n)) {
        const cs = [...new Set(ds.flatMap(d => where(st, u, d)))]; if (cs.length !== n) continue;
        let keep = 0; for (const d of ds) keep |= BIT(d);
        const el = []; for (const j of cs) for (const d of DIGS(st.cand[j] & ~keep)) el.push([j, d]);
        if (!el.length) continue;
        return { name: 'Verborgen ' + ['', '', 'tweetal', 'drietal', 'viertal'][n], elim: el, cand: true, keyD: ds, hl: { unit: UNITS[u], pat: cs },
          text: `In ${uName(u)} kunnen ${and(ds.map(een))} alleen in ${cells(cs)}. ${cap(NUMW[n])} cijfers en maar ${NUMW[n]} vakjes: die vakjes zijn dus voor ${and(ds)}. Andere cijfers kunnen daar niet meer. Weg: ${elimText(el)}.` };
      }
    }
    return null;
  }
  // 8. X-wing (n = 2) and swordfish (n = 3)
  function fish(st, n) {
    for (let d = 1; d <= 9; d++) for (const [base, other, bw, ow] of [[ROW, COL, 'rij', 'kolom'], [COL, ROW, 'kolom', 'rij']]) {
      const lines = []; for (let k = 0; k < 9; k++) { const u = bw === 'rij' ? k * 3 : k * 3 + 1, w = where(st, u, d); if (w.length >= 2 && w.length <= n && !(unitDigits(st, u) & BIT(d))) lines.push({ k, w }); }
      if (lines.length < n) continue;
      for (const L of combos(lines, n)) {
        const covers = [...new Set(L.flatMap(x => x.w.map(other)))]; if (covers.length !== n) continue;
        const ks = L.map(x => x.k), el = [];
        for (const c of covers) for (let k = 0; k < 9; k++) { if (ks.includes(k)) continue; const j = bw === 'rij' ? k * 9 + c : c * 9 + k; if (!st.vals[j] && (st.cand[j] & BIT(d))) el.push([j, d]); }
        if (!el.length) continue;
        const bl = ks.map(k => `${bw} ${k + 1}`), cl = covers.sort((a, b) => a - b).map(c => `${ow} ${c + 1}`), pat = L.flatMap(x => x.w);
        const ray = []; for (const c of covers) for (let k = 0; k < 9; k++) { const j = bw === 'rij' ? k * 9 + c : c * 9 + k; if (!pat.includes(j)) ray.push(j); }
        return { name: ['', '', 'X-vleugel', 'Zwaardvis', 'Kwal'][n], elim: el, cand: true, keyD: [d], hl: { unit: L.flatMap(x => bw === 'rij' ? UNITS[x.k * 3] : UNITS[x.k * 3 + 1]), pat, ray },
          text: `Kijk naar ${een(d)}. In ${and(bl)} kan ${een(d)} alleen in ${and(cl)} (de gele vakjes). In elk van deze ${NUMW[n]} ${bw === 'rij' ? 'rijen' : 'kolommen'} moet ${een(d)} komen, en nooit twee keer in dezelfde ${ow}. Samen vullen ze dus ${n === 2 ? 'beide' : `alle ${NUMW[n]} de`} ${ow === 'rij' ? 'rijen' : 'kolommen'}: ${and(cl)} krijgen hun ${d} uit ${and(bl)}. In de rest van ${and(cl)} kan ${een(d)} dus niet meer. Weg: ${elimText(el)}.` };
      }
    }
    return null;
  }
  // 9. XY-wing: a pivot {a,b} with pincers {a,c} and {b,c}: c is in one of the pincers
  function xyWing(st) {
    const bi = []; for (let i = 0; i < 81; i++) if (!st.vals[i] && POP(st.cand[i]) === 2) bi.push(i);
    const sees = (x, y) => x !== y && (ROW(x) === ROW(y) || COL(x) === COL(y) || BOX(x) === BOX(y));
    for (const p of bi) {
      const [a, b] = DIGS(st.cand[p]);
      for (const q of bi) { if (!sees(p, q) || !(st.cand[q] & BIT(a)) || (st.cand[q] & BIT(b))) continue;
        const c = DIGS(st.cand[q] & ~BIT(a))[0];
        for (const r of bi) { if (r === q || !sees(p, r) || st.cand[r] !== (BIT(b) | BIT(c))) continue;
          const el = []; for (let j = 0; j < 81; j++) if (j !== p && j !== q && j !== r && !st.vals[j] && (st.cand[j] & BIT(c)) && sees(j, q) && sees(j, r)) el.push([j, c]);
          if (!el.length) continue;
          return { name: 'Y-vleugel', elim: el, cand: true, keyD: [a, b, c], hl: { pat: [p, q, r] },
            text: `${cN(p)} kan alleen ${een(a)} of ${een(b)} worden. Wordt het ${een(a)}, dan moet ${cN(q)} (${a} of ${c}) ${een(c)} worden. Wordt het ${een(b)}, dan moet ${cN(r)} (${b} of ${c}) ${een(c)} worden. Hoe dan ook staat er ${een(c)} in ${cN(q)} of in ${cN(r)}. Een vakje dat ze allebei ziet, kan dus geen ${c} zijn. Weg: ${elimText(el)}.` };
        }
      }
    }
    return null;
  }
  /* ---------- level 4 (Meester): wings and chains ---------- */
  const SEES = (x, y) => x !== y && (ROW(x) === ROW(y) || COL(x) === COL(y) || BOX(x) === BOX(y));
  const seenByAll = (st, d, ends, skip) => { const el = []; for (let j = 0; j < 81; j++) if (!st.vals[j] && (st.cand[j] & BIT(d)) && !skip.includes(j) && ends.every(e => SEES(j, e))) el.push([j, d]); return el; };
  // all units where the digit d has exactly two places: a "sterke koppeling" (one of the two must be d)
  function strongLinks(st, d) {
    const out = [];
    for (let u = 0; u < 27; u++) { if (unitDigits(st, u) & BIT(d)) continue; const w = where(st, u, d); if (w.length === 2) out.push({ u, a: w[0], b: w[1] }); }
    return out;
  }
  const lnk = L => `${uName(L.u)} (alleen ${cN(L.a)} of ${cN(L.b)})`;
  // skyscraper and 2-string kite: two strong links joined by a weak link (two ends that see each other)
  function twoLinks(st) {
    for (let d = 1; d <= 9; d++) {
      const L = strongLinks(st, d);
      for (let x = 0; x < L.length; x++) for (let y = x + 1; y < L.length; y++) {
        const A = L[x], B = L[y];
        for (const [a1, a2] of [[A.a, A.b], [A.b, A.a]]) for (const [b1, b2] of [[B.a, B.b], [B.b, B.a]]) {
          if (a1 === b1 || a2 === b2 || a1 === b2 || a2 === b1 || !SEES(a1, b1) || SEES(a2, b2)) continue;
          const el = seenByAll(st, d, [a2, b2], [a1, a2, b1, b2]); if (!el.length) continue;
          const sky = uKind(A.u) === uKind(B.u) && uKind(A.u) < 2, kite = uKind(A.u) + uKind(B.u) === 1 && BOX(a1) === BOX(b1);
          const name = sky ? 'Wolkenkrabber' : kite ? 'Vlieger' : 'Korte ketting';
          return { name, elim: el, cand: true, keyD: [d], hl: { pat: [a1, a2, b1, b2], unit: [...UNITS[A.u], ...UNITS[B.u]] },
            text: `Kijk naar ${een(d)}. In ${lnk(A)} moet één van de twee ${een(d)} zijn, en in ${lnk(B)} ook. ${cN(a1)} en ${cN(b1)} zien elkaar, dus die kunnen niet allebei ${een(d)} zijn. Is ${cN(a1)} geen ${d}, dan is ${cN(a2)} het; is ${cN(b1)} geen ${d}, dan is ${cN(b2)} het. Minstens één van ${cN(a2)} en ${cN(b2)} is dus ${een(d)}. Een vakje dat ze allebei ziet, kan geen ${d} zijn. Weg: ${elimText(el)}.` };
        }
      }
    }
    return null;
  }
  // XYZ-wing: a pivot {a,b,c} and pincers {a,c} and {b,c}: c is in one of the three
  function xyzWing(st) {
    for (let p = 0; p < 81; p++) {
      if (st.vals[p] || POP(st.cand[p]) !== 3) continue;
      const bi = PEERS[p].filter(j => !st.vals[j] && POP(st.cand[j]) === 2 && (st.cand[j] & st.cand[p]) === st.cand[j]);
      for (let x = 0; x < bi.length; x++) for (let y = x + 1; y < bi.length; y++) {
        const q = bi[x], r = bi[y]; if (st.cand[q] === st.cand[r]) continue;
        const cm = st.cand[q] & st.cand[r]; if (POP(cm) !== 1) continue;
        const c = DIGS(cm)[0], el = seenByAll(st, c, [p, q, r], [p, q, r]); if (!el.length) continue;
        const [a] = DIGS(st.cand[q] & ~cm), [b] = DIGS(st.cand[r] & ~cm);
        return { name: 'XYZ-vleugel', elim: el, cand: true, keyD: [a, b, c], hl: { pat: [p, q, r] },
          text: `${cN(p)} kan ${een(a)}, ${een(b)} of ${een(c)} worden. Wordt het ${een(a)}, dan moet ${cN(q)} (${a} of ${c}) ${een(c)} worden; wordt het ${een(b)}, dan moet ${cN(r)} (${b} of ${c}) ${een(c)} worden; anders is ${cN(p)} zelf ${een(c)}. In elk geval staat ${een(c)} in één van deze drie vakjes. Een vakje dat ze alle drie ziet, kan dus geen ${c} zijn. Weg: ${elimText(el)}.` };
      }
    }
    return null;
  }
  // W-wing: two cells {a,b} joined by a strong link on a: one of them is b
  function wWing(st) {
    const bi = []; for (let i = 0; i < 81; i++) if (!st.vals[i] && POP(st.cand[i]) === 2) bi.push(i);
    for (let x = 0; x < bi.length; x++) for (let y = x + 1; y < bi.length; y++) {
      const p = bi[x], q = bi[y]; if (st.cand[p] !== st.cand[q] || SEES(p, q)) continue;
      const [d1, d2] = DIGS(st.cand[p]);
      for (const [a, b] of [[d1, d2], [d2, d1]]) for (const L of strongLinks(st, a)) {
        for (const [e1, e2] of [[L.a, L.b], [L.b, L.a]]) {
          if (e1 === p || e1 === q || e2 === p || e2 === q || !SEES(e1, p) || !SEES(e2, q)) continue;
          const el = seenByAll(st, b, [p, q], [p, q]); if (!el.length) continue;
          return { name: 'W-vleugel', elim: el, cand: true, keyD: [a, b], hl: { pat: [p, q], src: [e1, e2], unit: UNITS[L.u] },
            text: `${cN(p)} en ${cN(q)} kunnen allebei alleen ${een(a)} of ${een(b)} worden. In ${lnk(L)} moet ${een(a)} komen. ${cN(e1)} ziet ${cN(p)} en ${cN(e2)} ziet ${cN(q)}. Zouden ${cN(p)} en ${cN(q)} allebei ${een(a)} zijn, dan kan ${een(a)} in ${uName(L.u)} nergens meer. Dus is minstens één van de twee ${een(b)}. Een vakje dat ze allebei ziet, kan geen ${b} zijn. Weg: ${elimText(el)}.` };
        }
      }
    }
    return null;
  }
  // coloring: follow the strong links of one digit and give the cells two colours: one colour is all d, the other none
  function coloring(st) {
    for (let d = 1; d <= 9; d++) {
      const L = strongLinks(st, d), adj = new Map(); if (L.length < 3) continue;
      for (const l of L) { for (const [x, y] of [[l.a, l.b], [l.b, l.a]]) { if (!adj.has(x)) adj.set(x, []); adj.get(x).push(y); } }
      const col = new Map();
      for (const s0 of adj.keys()) {
        if (col.has(s0)) continue;
        const comp = [s0]; col.set(s0, 0);
        for (let k = 0; k < comp.length; k++) for (const y of adj.get(comp[k])) if (!col.has(y)) { col.set(y, 1 - col.get(comp[k])); comp.push(y); }
        if (comp.length < 4) continue;
        const A = comp.filter(x => col.get(x) === 0), B = comp.filter(x => col.get(x) === 1);
        // two cells of the same colour that see each other: that colour cannot be d
        for (const [S1, S2, nm1, nm2] of [[A, B, 'blauwe', 'groene'], [B, A, 'groene', 'blauwe']]) {
          for (let x = 0; x < S1.length; x++) for (let y = x + 1; y < S1.length; y++) if (SEES(S1[x], S1[y])) {
            const el = S1.map(j => [j, d]);
            return { name: 'Kleurketen', elim: el, cand: true, keyD: [d], color: { a: A, b: B }, hl: { pat: comp },
              text: `Kijk naar ${een(d)}. Overal waar ${een(d)} maar op twee plekken kan, is precies één van die twee ${een(d)}. Volg die koppelingen en kleur de vakjes om en om blauw en groen: dan is óf elk blauw vakje ${een(d)}, óf elk groen vakje. Maar de ${nm1} vakjes ${cN(S1[x])} en ${cN(S1[y])} zien elkaar en kunnen niet allebei ${een(d)} zijn. Dus is geen enkel ${nm1.replace(/e$/, '')} vakje ${een(d)}. Weg: ${elimText(el)}.` };
          }
        }
        // a cell that sees both colours: whichever colour is right, it sees a d
        const el = []; for (let j = 0; j < 81; j++) if (!st.vals[j] && (st.cand[j] & BIT(d)) && !col.has(j) && A.some(a => SEES(a, j)) && B.some(b => SEES(b, j))) el.push([j, d]);
        if (el.length) {
          const ex = el[0][0], sa = A.find(a => SEES(a, ex)), sb = B.find(b => SEES(b, ex));
          return { name: 'Kleurketen', elim: el, cand: true, keyD: [d], color: { a: A, b: B }, hl: { pat: comp },
            text: `Kijk naar ${een(d)}. Overal waar ${een(d)} maar op twee plekken kan, is precies één van die twee ${een(d)}. Volg die koppelingen en kleur de vakjes om en om blauw en groen: dan is óf elk blauw vakje ${een(d)}, óf elk groen vakje. Een vakje dat een blauw én een groen vakje ziet (zoals ${cN(ex)}: het ziet ${cN(sa)} en ${cN(sb)}), ziet dus altijd ${een(d)} en kan zelf geen ${d} zijn. Weg: ${elimText(el)}.` };
        }
      }
    }
    return null;
  }
  // XY-chain: cells with two digits, each passing a digit to the next; the first and last share a digit x
  function xyChain(st) {
    const bi = []; for (let i = 0; i < 81; i++) if (!st.vals[i] && POP(st.cand[i]) === 2) bi.push(i);
    let found = null;
    const dfs = (path, ins, outD, start, x) => {
      if (found || path.length > 6) return;
      const last = path[path.length - 1];
      for (const n of bi) {
        if (path.includes(n) || !SEES(last, n) || !(st.cand[n] & BIT(outD))) continue;
        const nOut = DIGS(st.cand[n] & ~BIT(outD))[0], P = [...path, n], I = [...ins, outD];
        if (nOut === x && P.length >= 3) { const el = seenByAll(st, x, [start, n], P); if (el.length) { found = { P, I, x, el }; return; } }
        dfs(P, I, nOut, start, x);
      }
    };
    for (const s of bi) for (const x of DIGS(st.cand[s])) { dfs([s], [], DIGS(st.cand[s] & ~BIT(x))[0], s, x); if (found) break; }
    if (!found) return null;
    const { P, I, x, el } = found;
    const steps = P.map((c, k) => k === 0 ? `als ${cN(c)} geen ${x} is, is het ${een(I[0])}` : k < P.length - 1 ? `dan is ${cN(c)} ${een(I[k])}` : `dan is ${cN(c)} ${een(x)}`);
    return { name: 'XY-ketting', elim: el, cand: true, keyD: [x, ...I], hl: { pat: P },
      text: `Volg de vakjes met twee mogelijkheden: ${steps.join(', ')}. Dus: is ${cN(P[0])} geen ${x}, dan is ${cN(P[P.length - 1])} het wel. Eén van de twee uiteinden is altijd ${een(x)}. Een vakje dat ze allebei ziet, kan geen ${x} zijn. Weg: ${elimText(el)}.` };
  }
  const TECH = [[1, fullHouse], [1, hiddenSingle], [1, nakedSingle], [2, pointing], [2, claiming], [2, st => nakedSub(st, 2)], [2, st => hiddenSub(st, 2)], [2, st => nakedSub(st, 3)], [2, st => hiddenSub(st, 3)],
    [3, st => fish(st, 2)], [3, xyWing], [3, st => fish(st, 3)], [3, st => nakedSub(st, 4)], [3, st => hiddenSub(st, 4)],
    [4, twoLinks], [4, xyzWing], [4, wWing], [4, coloring], [4, xyChain], [4, st => fish(st, 4)]];
  function nextStep(st, maxLvl = 4) { for (const [l, f] of TECH) { if (l > maxLvl) break; const s = f(st); if (s) { s.lvl = l; return s; } } return null; }
  // how hard is a puzzle for a person? { ok: solved by these techniques, lvl: hardest technique needed, n2/n3: how often }
  function grade(puz) {
    const st = mkState(puz.slice(), null); let lvl = 1, n2 = 0, n3 = 0, n4 = 0;
    for (let n = 0; n < 400; n++) {
      if (st.vals.every(v => v)) return { ok: true, lvl, n2, n3, n4 };
      const s = nextStep(st); if (!s) return { ok: false, lvl, n2, n3, n4 };
      lvl = Math.max(lvl, s.lvl); if (s.lvl === 2) n2++; if (s.lvl >= 3) n3++; if (s.lvl === 4) n4++; applyStep(st, s);
    }
    return { ok: false, lvl, n2, n3, n4 };
  }
  // the steps of one hint: the eliminations needed and then the next number to fill in
  function hintSteps(vals, elim, prefer, notes, sol) {
    const st = mkState(vals.slice(), elim, notes, sol), steps = [];
    if (prefer != null && !vals[prefer]) { const s = hiddenSingle(st, prefer) || nakedSingle(st, prefer); if (s) { s.lvl = 1; s.cand0 = st.cand.slice(); return { steps: [s], ok: true }; } }
    for (let n = 0; n < 16; n++) {
      const s = nextStep(st); if (!s) break;
      s.cand0 = st.cand.slice(); steps.push(s); applyStep(st, s); if (s.place) return { steps, ok: true };
    }
    return { steps, ok: false, st };
  }

  /* ---------- game ---------- */
  function newGame(level) {
    closeModals(); board.classList.add('busy');
    closeHint(true);
    setTimeout(() => generateAsync(level, ({ puz, sol }) => {
      S = { lvl: level, puz, sol, val: puz.slice(), notes: new Array(81).fill(0), elim: new Array(81).fill(0), time: 0, mistakes: 0, hints: 0, over: false, counted: false };
      undo = []; sel = puz.findIndex(v => !v); board.classList.remove('busy');
      stats.played++; S.counted = true; saveStats(); save(); render(); sfx('shuffle');
    }), 30);
  }
  const save = () => { if (S && !S.over) store.set('sd.save', S); };
  const fixed = i => S.puz[i] > 0;
  const wrong = i => S.val[i] && S.val[i] !== S.sol[i];
  function conflict(i) { const v = S.val[i]; return v && PEERS[i].some(j => S.val[j] === v); }
  function place(d) {
    if (!S || S.over || sel < 0 || fixed(sel)) { if (S && sel >= 0 && fixed(sel)) sfx('tap'); return; }
    const i = sel;
    if (opt.pencil && d) {
      if (S.val[i]) { sfx('tap'); vibrate(15); return; }
      undo.push({ i, val: S.val[i], notes: S.notes[i] }); S.notes[i] ^= 1 << d; sfx('sdNote'); save(); render(); return;
    }
    if (d && S.val[i] === d) d = 0;                 // tapping the same number again clears it
    undo.push({ i, val: S.val[i], notes: S.notes[i], peers: d ? PEERS[i].filter(j => S.notes[j] & (1 << d)) : [] });
    if (undo.length > 300) undo.shift();
    S.val[i] = d; S.notes[i] = 0;
    if (!d) { sfx('tap'); save(); render(); return; }
    for (const j of PEERS[i]) S.notes[j] &= ~(1 << d);
    if (d !== S.sol[i]) { S.mistakes++; if (opt.errors === 'direct') { sfx('sdError'); vibrate(40); } else sfx('sdPlace'); }
    else {
      const done = UNITS.filter(u => u.includes(i) && u.every(j => S.val[j] === S.sol[j]));
      if (done.length) { sfx('sdLine'); flash(done.flat()); } else sfx('sdPlace');
    }
    save(); render(); checkWin();
  }
  function flash(cells) { requestAnimationFrame(() => cells.forEach((j, k) => { const el = board.children[j]; if (!el) return; el.style.animationDelay = (k % 9) * 35 + 'ms'; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); })); }
  function doUndo() {
    if (HX) closeHint();
    const u = undo.pop(); if (!u || !S || S.over) return;
    const d = S.val[u.i]; if (u.peers && d) for (const j of u.peers) S.notes[j] |= 1 << d;
    S.val[u.i] = u.val; S.notes[u.i] = u.notes; sel = u.i; sfx('tap'); save(); render();
  }
  function erase() { if (!S || S.over || sel < 0 || fixed(sel)) return; if (!S.val[sel] && !S.notes[sel]) return; undo.push({ i: sel, val: S.val[sel], notes: S.notes[sel] }); S.val[sel] = 0; S.notes[sel] = 0; sfx('tap'); save(); render(); }
  /* Controle: compare the filled-in numbers with the solution; wrong ones flash red stripes for a moment (not the pencil notes) */
  let toastT = 0, chkT = 0;
  function toast(t, ms = 2600) { const el = $('#sdToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  const CHK_MS = 3000;
  function clearCheck() { clearTimeout(chkT); if (chkMarks) { chkMarks = null; render(); } }
  let chkMarks = null;
  function check() {
    if (!S || S.over) return;
    if (HX) closeHint();
    const bad = []; let filled = 0;
    for (let i = 0; i < 81; i++) if (!fixed(i) && S.val[i]) { filled++; if (S.val[i] !== S.sol[i]) bad.push(i); }
    if (!filled) { toast('Je hebt nog geen cijfers ingevuld.'); sfx('tap'); return; }
    S.checks = (S.checks || 0) + 1;
    if (bad.length) {
      chkMarks = {}; for (const i of bad) chkMarks[i] = S.val[i];
      toast(`⚠️ ${bad.length} ${bad.length === 1 ? 'cijfer klopt' : 'cijfers kloppen'} niet`, CHK_MS);
      sfx('sdError'); vibrate(30); clearTimeout(chkT); chkT = setTimeout(clearCheck, CHK_MS);
    } else { chkMarks = null; toast(`✓ Alle ${filled} ingevulde ${filled === 1 ? 'cijfer klopt' : 'cijfers kloppen'}`, 2400); sfx('sdLine'); }
    save(); render();
  }

  /* hint: first wrong numbers, then the steps (with the reason why) to the next number; shown one step at a time */
  let HX = null;
  const hintBox = $('#sdHint');
  function hint() {
    if (!S || S.over) return;
    if (HX) { closeHint(); return; }
    if (!S.elim) S.elim = new Array(81).fill(0);
    const wrongs = []; for (let i = 0; i < 81; i++) if (!fixed(i) && S.val[i] && S.val[i] !== S.sol[i]) wrongs.push(i);
    let steps;
    if (wrongs.length) {
      const i = wrongs.includes(sel) ? sel : wrongs[0], v = S.val[i], twin = PEERS[i].find(j => S.val[j] === v);
      steps = [{ name: 'Dit cijfer klopt niet', err: i, hl: { tgt: [i], src: twin != null ? [twin] : [] },
        text: twin != null ? `In ${cN(i)} staat een ${v}, maar ${cN(twin)} ${ROW(twin) === ROW(i) ? 'in dezelfde rij' : COL(twin) === COL(i) ? 'in dezelfde kolom' : 'in hetzelfde blok'} heeft ook al een ${v}. Haal hem weg en kijk opnieuw.` + (wrongs.length > 1 ? ` (Er staan nog ${wrongs.length - 1} andere foute cijfers.)` : '')
          : `De ${v} in ${cN(i)} past nu nog, maar klopt niet met de oplossing: later loop je ermee vast. Haal hem weg en zoek met de volgende hint een cijfer dat zeker is.` + (wrongs.length > 1 ? ` (Er staan nog ${wrongs.length - 1} andere foute cijfers.)` : '') }];
    } else {
      const pref = sel >= 0 && !S.val[sel] ? sel : null, h = hintSteps(S.val, S.elim, pref, S.notes, S.sol);
      steps = h.steps;
      if (!h.ok) {           // a step beyond these techniques: say so honestly and give one number
        const st = h.st || mkState(S.val.slice(), S.elim, S.notes, S.sol); let i = -1, best = 10;
        for (let k = 0; k < 81; k++) if (!S.val[k] && POP(st.cand[k]) < best) { best = POP(st.cand[k]); i = k; }
        if (i < 0) return;
        steps.push({ name: 'Een heel lastige stap', place: [i, S.sol[i]], cand0: st.cand.slice(), cand: true, hl: { tgt: [i] }, keyD: [S.sol[i]],
          text: `Hier is een techniek nodig die verder gaat dan deze uitleg (zoals lange ketens). Het vakje met de minste mogelijkheden is ${cN(i)}: daar kan ${or(DIGS(st.cand[i]))}. Het juiste cijfer is ${een(S.sol[i])}.` });
      }
    }
    S.hints++; HX = { steps, k: 0 }; sel = -1;
    sfx('magic'); showHint(); save();
  }
  function showHint() {
    const s = HX.steps[HX.k], n = HX.steps.length, last = HX.k === n - 1;
    const go = s.err != null ? 'Weghalen' : s.place ? `Zet de ${s.place[1]}` : 'Wegstrepen';
    hintBox.innerHTML = `<div class="sd-hh">${n > 1 ? `<span class="sd-hstep">Stap ${HX.k + 1} van ${n}</span>` : ''}<b>${s.name}</b></div><p>${s.text}</p>`
      + `<div class="sd-hb"><button data-h="x">Sluiten</button>${HX.k ? '<button data-h="prev">‹ Vorige</button>' : ''}${last ? `<button class="go" data-h="go">${go}</button>` : '<button class="go" data-h="next">Volgende ›</button>'}</div>`;
    $('#sd').classList.add('hinting'); render();
  }
  // apply the eliminations that were explained (they are true) and, at the end, the number
  function closeHint(silent, apply) {
    if (!HX) return;
    const H = HX; HX = null; $('#sd').classList.remove('hinting'); hintBox.innerHTML = '';
    if (!S || silent) { render(); return; }
    const upto = apply ? H.steps.length : H.k + 1;
    for (let k = 0; k < upto; k++) for (const [i, d] of H.steps[k].elim || []) { S.elim[i] |= BIT(d); S.notes[i] &= ~BIT(d); }
    const s = H.steps[H.steps.length - 1];
    if (apply && s.err != null) { const i = s.err; undo.push({ i, val: S.val[i], notes: S.notes[i] }); S.val[i] = 0; sel = i; sfx('tap'); }
    else if (apply && s.place) {
      const [i, d] = s.place; sel = i;
      undo.push({ i, val: S.val[i], notes: S.notes[i], peers: PEERS[i].filter(j => S.notes[j] & BIT(d)) });
      S.val[i] = d; S.notes[i] = 0; for (const j of PEERS[i]) S.notes[j] &= ~BIT(d);
      sfx('sdPlace'); flash([i]);
    } else sfx('tap');
    save(); render(); checkWin();
  }
  hintBox.addEventListener('click', e => {
    const b = e.target.closest('button[data-h]'); if (!b || !HX) return;
    const a = b.dataset.h;
    if (a === 'next') { HX.k = Math.min(HX.steps.length - 1, HX.k + 1); sfx('tap'); showHint(); }
    else if (a === 'prev') { HX.k = Math.max(0, HX.k - 1); sfx('tap'); showHint(); }
    else if (a === 'go') closeHint(false, true);
    else closeHint();
  });
  function checkWin() {
    if (!S.val.every((v, i) => v === S.sol[i])) return;
    S.over = true; store.del('sd.save'); stats.won++;
    const t = Math.floor(S.time), b = stats.best[S.lvl]; S.newBest = b == null || t < b; if (S.newBest) stats.best[S.lvl] = t;
    if (!S.hints && !S.mistakes && !S.checks) stats.noHelp++;
    saveStats(); render(); sfx('pfWin'); vibrate(30);
    flash([...Array(81).keys()]);
    setTimeout(() => {
      $('#sdEndTitle').textContent = 'Sudoku opgelost!';
      $('#sdEndText').innerHTML = `${LEVELS[S.lvl].name} in <b>${fmt(S.time)}</b>${S.newBest ? ' · 🎉 nieuwe beste tijd' : ''}<br><small>${S.mistakes ? S.mistakes + (S.mistakes === 1 ? ' fout' : ' fouten') : 'Geen fouten'} · ${S.hints ? S.hints + (S.hints === 1 ? ' hint' : ' hints') : 'geen hints'}${S.checks ? ` · ${S.checks}× gecontroleerd` : ''}</small>`;
      openModal('sdEndModal');
    }, 1100);
  }

  /* ---------- rendering ---------- */
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function build() {
    let h = '';
    for (let i = 0; i < 81; i++) { const r = ROW(i), c = COL(i); h += `<div class="sd-c${c % 3 === 2 && c < 8 ? ' br' : ''}${r % 3 === 2 && r < 8 ? ' bb' : ''}" data-i="${i}"></div>`; }
    board.innerHTML = h;
    pad.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-d="${d}"><b>${d}</b><small></small></button>`).join('');
  }
  function render() {
    if (!S) return;
    if (board.children.length !== 81) build();
    const sv = sel >= 0 ? S.val[sel] : 0, showErr = opt.errors === 'direct', lamp = !HX && S.lamp ? S.lamp : 0;
    const hs = HX ? HX.steps[HX.k] : null, H = hs ? hs.hl || {} : null, set = k => new Set(H && H[k] || []);
    const hUnit = set('unit'), hRay = set('ray'), hSrc = set('src'), hPat = set('pat'), hNo = set('no'), hTgt = set('tgt'), hEl = new Map(), cA = new Set(hs && hs.color ? hs.color.a : []), cB = new Set(hs && hs.color ? hs.color.b : []);
    if (hs) for (const [i, d] of hs.elim || []) hEl.set(i, (hEl.get(i) || 0) | BIT(d));
    for (let i = 0; i < 81; i++) {
      const el = board.children[i], v = S.val[i], peer = sel >= 0 && i !== sel && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel));
      let cls = 'sd-c' + (COL(i) % 3 === 2 && COL(i) < 8 ? ' br' : '') + (ROW(i) % 3 === 2 && ROW(i) < 8 ? ' bb' : '') + (fixed(i) ? ' given' : v ? ' user' : '') + (H ? (hTgt.has(i) ? ' hx-tgt' : cA.has(i) ? ' hx-blue' : cB.has(i) ? ' hx-green' : hSrc.has(i) ? ' hx-src' : hPat.has(i) ? ' hx-pat' : hEl.has(i) ? ' hx-el' : hUnit.has(i) ? ' hx-unit' : hRay.has(i) ? ' hx-ray' : '') + (hNo.has(i) ? ' hx-no' : '') : '') + (H ? '' : i === sel ? ' sel' : peer && !lamp ? ' peer' : '') + (!H && !lamp && v && sv && v === sv && i !== sel ? ' same' : '') + (v && !fixed(i) && ((showErr && wrong(i)) || conflict(i)) ? ' bad' : '');
      if (el.classList.contains('flash')) cls += ' flash';
      if (lamp && v === lamp) cls += ' lamp';
      if (!H && chkMarks && v && chkMarks[i] === v) cls += ' chk';
      if (el.className !== cls) el.className = cls;
      const cm = hs && hs.cand && !v && hs.cand0 ? hs.cand0[i] : 0, key = new Set(hs && hs.keyD || []);
      const html = v ? String(v) : cm ? `<span class="sd-n hx">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => !(cm & BIT(d)) ? '<i></i>' : `<i class="${(hEl.get(i) || 0) & BIT(d) ? 'del' : hs.place && hs.place[0] === i && hs.place[1] === d ? 'ok' : (hPat.has(i) || hTgt.has(i)) && key.has(d) ? 'key' : ''}">${d}</i>`).join('')}</span>` : hs && hs.place && hs.place[0] === i ? `<span class="sd-ghost">${hs.place[1]}</span>` : S.notes[i] ? `<span class="sd-n">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<i${S.notes[i] & (1 << d) ? (d === lamp ? ' class="lp"' : sv === d ? ' class="hl"' : '') + '>' + d : '>'}</i>`).join('')}</span>` : '';
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
    }
    const left = d => 9 - S.val.reduce((n, v, i) => n + (v === d && (!showErr || v === S.sol[i]) ? 1 : 0), 0);
    pad.querySelectorAll('button').forEach(b => { const d = +b.dataset.d, l = left(d); b.querySelector('small').textContent = l > 0 ? l : ''; b.classList.toggle('done', l <= 0); b.classList.toggle('hl', sv === d); b.classList.toggle('lamp', lamp === d || (lampPick && !HX)); });
    const lb = $('#sdLamp'); lb.classList.toggle('on', !!S.lamp || lampPick); lb.querySelector('b').innerHTML = S.lamp ? `🔦<em>${S.lamp}</em>` : '🔦'; lb.querySelector('small').textContent = lampPick ? 'Kies cijfer' : 'Zaklamp';
    $('#sdPencil').classList.toggle('on', opt.pencil); $('#sdPencil').querySelector('small').textContent = opt.pencil ? 'Potlood aan' : 'Potlood';
    $('#sdLvl').textContent = LEVELS[S.lvl].name; $('#sdMist').textContent = S.mistakes; $('#sdMistW').hidden = opt.errors !== 'direct';
    hudTime(true);
  }
  let lastSec = -1;
  function hudTime(force) { if (!S) return; const s = Math.floor(S.time); if (force || s !== lastSec) { lastSec = s; $('#sdTime').textContent = fmt(S.time); } }
  function renderStart() {
    $('#sdLevels').innerHTML = Object.entries(LEVELS).map(([k, L]) => `<button data-lvl="${k}" class="${opt.level === k ? 'on' : ''}"><b>${L.name}</b><small>${L.desc}</small><span>${stats.best[k] != null ? '⏱ ' + fmt(stats.best[k]) : '–'}</span></button>`).join('');
    $('#sdOptList').innerHTML = [['errors', 'Fouten', [['direct', 'Direct tonen'], ['uit', 'Pas bij dubbel']]], ['sound', 'Geluidseffecten', [[true, 'Aan'], [false, 'Uit']]], ['music', 'Achtergrondmuziek', [[true, 'Aan'], [false, 'Uit']]]].map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#sdStats').innerHTML = [['Gespeeld', stats.played], ['Opgelost', stats.won], ['Zonder hulp', stats.noHelp]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    $('#sdResume').hidden = !(S && !S.over);
  }

  /* ---------- input ---------- */
  board.addEventListener('pointerdown', e => { const c = e.target.closest('.sd-c'); if (!c || !S) return; if (HX) closeHint(); sel = +c.dataset.i; render(); });
  /* Zaklamp: one digit stays lit, in the grid and in the pencil notes */
  let lampPick = false, lpT = 0, lpDone = false;
  function setLamp(d) { if (!S) return; lampPick = false; S.lamp = S.lamp === d ? 0 : d; sfx('tap'); vibrate(12); toast(S.lamp ? `🔦 Zaklamp op de ${d}: alle ${d}'en blijven oplichten` : 'Zaklamp uit', 2000); save(); render(); }
  function lampButton() {
    if (!S || S.over) return;
    if (HX) closeHint();
    if (S.lamp || lampPick) { lampPick = false; S.lamp = 0; toast('Zaklamp uit', 1400); }
    else { lampPick = true; toast('Tik op het cijfer dat je wilt blijven zien', 2400); }
    sfx('tap'); save(); render();
  }
  pad.addEventListener('pointerdown', e => { const b = e.target.closest('button[data-d]'); if (!b) return; lpDone = false; clearTimeout(lpT); lpT = setTimeout(() => { lpDone = true; setLamp(+b.dataset.d); }, 500); });
  const lpCancel = () => clearTimeout(lpT);
  pad.addEventListener('pointerup', lpCancel); pad.addEventListener('pointercancel', lpCancel); pad.addEventListener('pointerleave', lpCancel);
  pad.addEventListener('contextmenu', e => e.preventDefault());
  pad.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (!b) return; if (lpDone) { lpDone = false; return; } if (lampPick) { setLamp(+b.dataset.d); return; } place(+b.dataset.d); });
  $('#sdTools').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]'); if (!b) return;
    const t = b.dataset.t;
    if (t === 'undo') doUndo(); else if (t === 'erase') erase(); else if (t === 'hint') hint();
    else if (t === 'pencil') { opt.pencil = !opt.pencil; saveOpt(); sfx('tap'); render(); }
    else if (t === 'check') check();
    else if (t === 'lamp') lampButton();
  });
  window.addEventListener('keydown', e => {
    if (current !== 'sd' || anyModal() || !S) return;
    if (HX) { if (e.key === 'Escape') closeHint(); return; }
    if (/^[1-9]$/.test(e.key)) place(+e.key);
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
    else if (e.key === 'n' || e.key === 'p') { opt.pencil = !opt.pencil; saveOpt(); render(); }
    else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) doUndo();
    else { const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key]; if (mv) { e.preventDefault(); sel = sel < 0 ? 0 : (sel + mv + 81) % 81; render(); } }
  });
  $('#sdLevels').addEventListener('click', e => { const b = e.target.closest('button[data-lvl]'); if (!b) return; opt.level = b.dataset.lvl; saveOpt(); renderStart(); });
  $('#sdOptList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); renderStart(); render(); });
  $('#sdGo').addEventListener('click', () => newGame(opt.level));
  $('#sdResume').addEventListener('click', () => closeModals());
  $('#sdStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#sdEndNew').addEventListener('click', () => newGame(S.lvl));
  $('#sdEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('sdStartModal'); });
  $('#sdBack').addEventListener('click', () => leave());
  $('#sdNew').addEventListener('click', () => { renderStart(); openModal('sdStartModal'); });

  function tick() { if (current === 'sd' && S && !S.over && !anyModal() && !document.hidden) { S.time += .25; hudTime(); if (Math.floor(S.time * 4) % 20 === 0) save(); } }
  function enter() {
    show('sd');
    const saved = store.get('sd.save', null);
    if (!S && saved && saved.sol) { S = saved; delete S.chk; delete S.chkN; }
    build(); if (S) render();
    clearInterval(timer); timer = setInterval(tick, 250);
    if (!S || S.over) { renderStart(); openModal('sdStartModal'); }
  }
  function leave() { closeHint(); clearInterval(timer); save(); closeModals(); show('menu'); refreshMenu(); }
  window.__sd = { get S() { return S; }, get HX() { return HX; }, newGame, place, hint, check, setLamp, lampButton, closeHint, erase, doUndo, select: i => { sel = i; render(); }, solve, generate, grade, hintSteps, mkState, opt };
  return { enter, leave, back: () => { if (HX) { closeHint(); return; } leave(); }, hasSave: () => !!store.get('sd.save', null) };
})();
$('#tileSd').addEventListener('click', () => Sudoku.enter());
