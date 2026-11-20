/* ================================================================
   SUDOKU – generated puzzles with a unique solution, three levels,
   pencil notes, highlighting, undo, hints and a saved game
   ================================================================ */
const Sudoku = (() => {
  const LEVELS = { makkelijk: { clues: 40, name: 'Makkelijk', desc: 'alleen de enige plek', ok: g => g.ok && g.lvl === 1 },
    normaal: { clues: 32, name: 'Normaal', desc: 'soms een slimme stap', ok: g => g.ok && g.lvl <= 2 },
    moeilijk: { clues: 26, name: 'Moeilijk', desc: 'tweetallen en vaste cijfers', ok: g => g.ok && g.lvl >= 2 },
    expert: { clues: 25, name: 'Expert', desc: 'X-vleugel, Y-vleugel en meer', ok: g => g.ok && g.lvl === 3 } };
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
    for (let k = 0; k < tries; k++) { const g = tryOne(level); if (better(best, g)) best = g; if (best.good && best.clues <= LEVELS[level].clues + 2) break; }
    return { puz: best.puz, sol: best.sol, grade: best.grade };
  }
  function generateAsync(level, done) {        // in small slices, so the screen keeps moving on a slow phone
    let best = null, k = 0; const t0 = performance.now();
    const run = () => {
      const end = performance.now() + 24;
      while (performance.now() < end) { const g = tryOne(level); k++; if (better(best, g)) best = g; if ((best.good && best.clues <= LEVELS[level].clues + 2) || k >= 600 || performance.now() - t0 > 8000) return done({ puz: best.puz, sol: best.sol, grade: best.grade }); }
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
  function mkState(vals, elim) {
    const cand = new Array(81).fill(0);
    for (let i = 0; i < 81; i++) if (!vals[i]) { let m = 0x3FE; for (const j of PEERS[i]) if (vals[j]) m &= ~BIT(vals[j]); cand[i] = m & ~((elim && elim[i]) || 0); }
    return { vals, cand, gone: elim ? elim.slice() : new Array(81).fill(0) };
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
      const gone = DIGS(st.gone[i]).filter(x => !seen.has(x) && x !== d);
      return { name: 'Enige cijfer dat past', place: [i, d], hl: { unit: [...UNITS[rU], ...UNITS[cU], ...UNITS[bU]], src, tgt: [i] },
        text: `Kijk naar ${cN(i)}. ${cap(part.join('; '))}.` + (gone.length ? ` Eerder ${gone.length === 1 ? 'is' : 'zijn'} hier ook ${and(gone.map(een))} weggestreept.` : '') + ` Van 1 tot en met 9 blijft alleen ${een(d)} over, dus hier moet ${een(d)}.` };
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
        return { name: n === 2 ? 'Tweetal' : 'Drietal', elim: el, cand: true, keyD: ds, hl: { unit: UNITS[u], pat: cs },
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
        return { name: n === 2 ? 'Verborgen tweetal' : 'Verborgen drietal', elim: el, cand: true, keyD: ds, hl: { unit: UNITS[u], pat: cs },
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
        return { name: n === 2 ? 'X-vleugel' : 'Zwaardvis', elim: el, cand: true, keyD: [d], hl: { unit: L.flatMap(x => bw === 'rij' ? UNITS[x.k * 3] : UNITS[x.k * 3 + 1]), pat, ray },
          text: `Kijk naar ${een(d)}. In ${and(bl)} kan ${een(d)} alleen in ${and(cl)} (de gele vakjes). In elk van deze ${NUMW[n]} ${bw === 'rij' ? 'rijen' : 'kolommen'} moet ${een(d)} komen, en nooit twee keer in dezelfde ${ow}. Samen vullen ze dus ${n === 2 ? 'beide' : 'alle drie de'} ${ow === 'rij' ? 'rijen' : 'kolommen'}: ${and(cl)} krijgen hun ${d} uit ${and(bl)}. In de rest van ${and(cl)} kan ${een(d)} dus niet meer. Weg: ${elimText(el)}.` };
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
  const TECH = [[1, fullHouse], [1, hiddenSingle], [1, nakedSingle], [2, pointing], [2, claiming], [2, st => nakedSub(st, 2)], [2, st => hiddenSub(st, 2)], [2, st => nakedSub(st, 3)], [2, st => hiddenSub(st, 3)], [3, st => fish(st, 2)], [3, xyWing], [3, st => fish(st, 3)]];
  function nextStep(st, maxLvl = 3) { for (const [l, f] of TECH) { if (l > maxLvl) break; const s = f(st); if (s) { s.lvl = l; return s; } } return null; }
  // how hard is a puzzle for a person? { ok: solved by these techniques, lvl: hardest technique needed, n2/n3: how often }
  function grade(puz) {
    const st = mkState(puz.slice(), null); let lvl = 1, n2 = 0, n3 = 0;
    for (let n = 0; n < 400; n++) {
      if (st.vals.every(v => v)) return { ok: true, lvl, n2, n3 };
      const s = nextStep(st); if (!s) return { ok: false, lvl, n2, n3 };
      lvl = Math.max(lvl, s.lvl); if (s.lvl === 2) n2++; if (s.lvl === 3) n3++; applyStep(st, s);
    }
    return { ok: false, lvl, n2, n3 };
  }
  // the steps of one hint: the eliminations needed and then the next number to fill in
  function hintSteps(vals, elim, prefer) {
    const st = mkState(vals.slice(), elim), steps = [];
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
      const pref = sel >= 0 && !S.val[sel] ? sel : null, h = hintSteps(S.val, S.elim, pref);
      steps = h.steps;
      if (!h.ok) {           // a step beyond these techniques: say so honestly and give one number
        const st = h.st || mkState(S.val.slice(), S.elim); let i = -1, best = 10;
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
    if (!S.hints && !S.mistakes) stats.noHelp++;
    saveStats(); render(); sfx('pfWin'); vibrate(30);
    flash([...Array(81).keys()]);
    setTimeout(() => {
      $('#sdEndTitle').textContent = 'Sudoku opgelost!';
      $('#sdEndText').innerHTML = `${LEVELS[S.lvl].name} in <b>${fmt(S.time)}</b>${S.newBest ? ' · 🎉 nieuwe beste tijd' : ''}<br><small>${S.mistakes ? S.mistakes + (S.mistakes === 1 ? ' fout' : ' fouten') : 'Geen fouten'} · ${S.hints ? S.hints + (S.hints === 1 ? ' hint' : ' hints') : 'geen hints'}</small>`;
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
    const sv = sel >= 0 ? S.val[sel] : 0, showErr = opt.errors === 'direct';
    const hs = HX ? HX.steps[HX.k] : null, H = hs ? hs.hl || {} : null, set = k => new Set(H && H[k] || []);
    const hUnit = set('unit'), hRay = set('ray'), hSrc = set('src'), hPat = set('pat'), hNo = set('no'), hTgt = set('tgt'), hEl = new Map();
    if (hs) for (const [i, d] of hs.elim || []) hEl.set(i, (hEl.get(i) || 0) | BIT(d));
    for (let i = 0; i < 81; i++) {
      const el = board.children[i], v = S.val[i], peer = sel >= 0 && i !== sel && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel));
      let cls = 'sd-c' + (COL(i) % 3 === 2 && COL(i) < 8 ? ' br' : '') + (ROW(i) % 3 === 2 && ROW(i) < 8 ? ' bb' : '') + (fixed(i) ? ' given' : v ? ' user' : '') + (H ? (hTgt.has(i) ? ' hx-tgt' : hSrc.has(i) ? ' hx-src' : hPat.has(i) ? ' hx-pat' : hEl.has(i) ? ' hx-el' : hUnit.has(i) ? ' hx-unit' : hRay.has(i) ? ' hx-ray' : '') + (hNo.has(i) ? ' hx-no' : '') : '') + (H ? '' : i === sel ? ' sel' : peer ? ' peer' : '') + (!H && v && sv && v === sv && i !== sel ? ' same' : '') + (v && !fixed(i) && ((showErr && wrong(i)) || conflict(i)) ? ' bad' : '');
      if (el.classList.contains('flash')) cls += ' flash';
      if (el.className !== cls) el.className = cls;
      const cm = hs && hs.cand && !v && hs.cand0 ? hs.cand0[i] : 0, key = new Set(hs && hs.keyD || []);
      const html = v ? String(v) : cm ? `<span class="sd-n hx">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => !(cm & BIT(d)) ? '<i></i>' : `<i class="${(hEl.get(i) || 0) & BIT(d) ? 'del' : hs.place && hs.place[0] === i && hs.place[1] === d ? 'ok' : (hPat.has(i) || hTgt.has(i)) && key.has(d) ? 'key' : ''}">${d}</i>`).join('')}</span>` : hs && hs.place && hs.place[0] === i ? `<span class="sd-ghost">${hs.place[1]}</span>` : S.notes[i] ? `<span class="sd-n">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<i${S.notes[i] & (1 << d) ? (sv === d ? ' class="hl"' : '') + '>' + d : '>'}</i>`).join('')}</span>` : '';
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
    }
    const left = d => 9 - S.val.reduce((n, v, i) => n + (v === d && (!showErr || v === S.sol[i]) ? 1 : 0), 0);
    pad.querySelectorAll('button').forEach(b => { const d = +b.dataset.d, l = left(d); b.querySelector('small').textContent = l > 0 ? l : ''; b.classList.toggle('done', l <= 0); b.classList.toggle('hl', sv === d); });
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
  pad.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (b) place(+b.dataset.d); });
  $('#sdTools').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]'); if (!b) return;
    const t = b.dataset.t;
    if (t === 'undo') doUndo(); else if (t === 'erase') erase(); else if (t === 'hint') hint();
    else if (t === 'pencil') { opt.pencil = !opt.pencil; saveOpt(); sfx('tap'); render(); }
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
    if (!S && saved && saved.sol) S = saved;
    build(); if (S) render();
    clearInterval(timer); timer = setInterval(tick, 250);
    if (!S || S.over) { renderStart(); openModal('sdStartModal'); }
  }
  function leave() { closeHint(); clearInterval(timer); save(); closeModals(); show('menu'); refreshMenu(); }
  window.__sd = { get S() { return S; }, get HX() { return HX; }, newGame, place, hint, closeHint, erase, doUndo, select: i => { sel = i; render(); }, solve, generate, grade, hintSteps, mkState, opt };
  return { enter, leave, back: () => { if (HX) { closeHint(); return; } leave(); }, hasSave: () => !!store.get('sd.save', null) };
})();
$('#tileSd').addEventListener('click', () => Sudoku.enter());
