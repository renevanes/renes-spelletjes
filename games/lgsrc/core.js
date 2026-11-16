  /* ================= core.js: puzzle model, logical solver, generator, Dutch clue text, hints, marks (no DOM) ================= */
  const NO = 1, YES = 2, AUTO = 3;          // marks: 0 empty, 1 ✗, 2 ✓, 3 ✗ set automatically
  const LEVELS = {
    makkelijk: { name: 'Makkelijk', K: 3, N: 4, max: 1, ord: [0, 1], w: { is: 3, not: 5, nor: 2, ext: 1.2 } },
    normaal: { name: 'Normaal', K: 4, N: 4, max: 2, ord: [1, 1], w: { is: 1.5, not: 3, nor: 2, or: 3, cmp: 3, ext: .8, list: 1 }, need: [2, 0] },
    moeilijk: { name: 'Moeilijk', K: 4, N: 5, max: 3, ord: [1, 2], w: { is: .8, not: 2, nor: 2, or: 3, cmp: 3, dif: 2.2, list: 1.2, pair: 1.6, ext: .5 }, need: [2, 1] },
    expert: { name: 'Expert', K: 5, N: 5, max: 3, ord: [2, 2], w: { is: .3, not: 1.4, nor: 2, or: 3, cmp: 3, dif: 3, list: 1.6, pair: 2, ext: .4 }, need: [3, 3], maxIs: 1 },
  };
  const LVL_KEYS = Object.keys(LEVELS);
  const CLUE_LVL = { is: 1, not: 1, nor: 1, ext: 1, or: 2, cmp: 2, list: 2, dif: 3, pair: 3 };
  // removal order when minimising: simple clues go first, so the harder ones stay
  const SIMPLE = { is: 0, ext: 1, not: 2, nor: 3, list: 4, or: 5, cmp: 6, pair: 7, dif: 8 };

  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const shuffle = (R, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const joinOr = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' of ' + a[a.length - 1];
  const joinEn = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1];
  // the daily puzzle: a seed from the date and a level per weekday (Sunday = 0)
  const DAILY_LVL = ['moeilijk', 'makkelijk', 'normaal', 'normaal', 'moeilijk', 'normaal', 'expert'];
  const dailyFor = date => ({ seed: hashStr('logigram:' + date), lvl: DAILY_LVL[new Date(date + 'T12:00:00').getDay()] });

  /* ---------- building a puzzle: categories, items, a hidden solution ---------- */
  function makeItem(cat, raw, grp) {
    if (cat.ord) return null;
    if (cat.color) return { n: raw[0], adj: raw[1], sw: raw[2], lab: raw[0], sh: raw[0] };
    const [n, g, em, sh] = raw, it = { n, g: g || '', em: em || '', lab: sh || n, sh: sh || n };
    return it;
  }
  function pickCats(R, grp, L) {
    const pool = CATS.filter(c => c.g.includes(grp));
    for (let t = 0; t < 50; t++) {
      const nOrd = L.ord[0] + Math.floor(R() * (L.ord[1] - L.ord[0] + 1));
      const ord = shuffle(R, pool.filter(c => c.ord)), plain = shuffle(R, pool.filter(c => !c.ord));
      const out = [];
      const ok = c => !out.some(o => (o.ex || []).includes(c.id) || (c.ex || []).includes(o.id));
      for (const c of ord) if (out.length < nOrd && ok(c)) out.push(c);
      for (const c of plain) if (out.length < L.K - 1 && ok(c)) out.push(c);
      if (out.length === L.K - 1) return shuffle(R, out);
    }
    throw new Error('geen categorieën');
  }
  function buildBase(R, lvl) {
    const L = LEVELS[lvl], K = L.K, N = L.N, grp = R() < .62 ? 'c' : 'a';
    const names = shuffle(R, NAMES[grp].slice()).slice(0, N).sort((a, b) => a.localeCompare(b, 'nl'));
    const cats = [{ id: 'naam', anchor: true, label: GROUP[grp].label, pl: GROUP[grp].pl, items: names.map(n => ({ n, lab: n, sh: n })) }];
    for (const C of pickCats(R, grp, L)) {
      let items;
      if (C.ord) {
        const vals = C.ord.vals[grp](R, N);
        items = vals.map(v => ({ n: C.ord.n(v), val: v, lab: C.ord.lab(v), sh: C.ord.sh(v) }));
      } else {
        items = shuffle(R, C.items.slice()).slice(0, N).map(r => makeItem(C, r, grp));
        if (!C.color) items.sort((a, b) => a.lab.localeCompare(b.lab, 'nl'));
        else items.sort((a, b) => C.items.findIndex(r => r[0] === a.n) - C.items.findIndex(r => r[0] === b.n));
      }
      cats.push({ id: C.id, ord: !!C.ord, label: C.label, pl: C.pl, items });
    }
    // the hidden solution: ent[g] = the person (index in category 0) that item g belongs to
    const ent = [];
    for (let c = 0; c < K; c++) { const p = c ? shuffle(R, [...Array(N).keys()]) : [...Array(N).keys()]; for (let i = 0; i < N; i++) ent.push(p[i]); }
    return { v: 1, lvl, K, N, grp, cats, ent, clues: [] };
  }
  const catOf = (P, g) => Math.floor(g / P.N);
  const itemOf = (P, g) => P.cats[catOf(P, g)].items[g % P.N];
  const inv = P => { const r = []; for (let c = 0; c < P.K; c++) { r.push([]); for (let i = 0; i < P.N; i++) r[c][P.ent[c * P.N + i]] = c * P.N + i; } return r; };
  const ordCats = P => P.cats.map((c, i) => c.ord ? i : -1).filter(i => i >= 0);

  /* ---------- Dutch phrases ---------- */
  function fill(t, it) {
    const g = it.g, def = g === 'pl' ? 'de ' + it.n : g ? g + ' ' + it.n : it.n, ind = g === 'pl' ? it.n : g ? 'een ' + it.n : it.n;
    return t.replace(/\{n\}/g, it.n).replace(/\{def\}/g, def).replace(/\{ind\}/g, ind).replace(/\{adj\}/g, it.adj || '');
  }
  const tpl = (P, x) => typeof x === 'object' && x ? x[P.grp] : x;
  // predicate [verb, complement, tail] about the person who has item g
  function pred(P, g, yes = true) {
    const c = P.cats[catOf(P, g)], it = itemOf(P, g);
    if (c.anchor) return ['is', yes ? it.n : 'niet ' + it.n, ''];
    const C = CAT[c.id];
    return [C.v, fill(yes ? C.o : C.no, it), C.p || ''];
  }
  const sent = a => a.filter(Boolean).join(' ');
  function ref(P, g) {
    const c = P.cats[catOf(P, g)], it = itemOf(P, g);
    if (c.anchor) return it.n;
    const C = CAT[c.id];
    if (C.ord && C.ord.refFirst && it.val === 1) return C.ord.refFirst;
    return fill(tpl(P, C.ref), it);
  }
  // short name of an item, for hints and the summary: Anna, de kat, Delft, rood, 8 jaar
  function nm(P, g) {
    const c = P.cats[catOf(P, g)], it = itemOf(P, g);
    if (c.anchor || c.ord) return it.lab;
    if (it.g === 'de' || it.g === 'het') return it.g + ' ' + it.n;
    if (it.g === 'pl') return 'de ' + it.n;
    return it.n;
  }
  // "Anna heeft een kat" / "degene uit Delft woont niet op nummer 4" (the person's name is the subject when it can be)
  function stmt(P, x, y, yes, capital = true) {
    if (catOf(P, y) === 0 && catOf(P, x) !== 0) [x, y] = [y, x];
    const s = ref(P, x) + ' ' + sent(pred(P, y, yes));
    return capital ? cap(s) : s;
  }
  // "heeft een kat of een hond", "woont noch in Delft, noch in Gouda"
  function twoOf(P, b1, b2, kind) {
    const c = P.cats[catOf(P, b1)], C = CAT[c.id], i1 = itemOf(P, b1), i2 = itemOf(P, b2);
    if (C[kind]) return sent([C.v, C[kind](i1, i2), C.p]);
    const o1 = fill(C.o, i1), o2 = fill(C.o, i2);
    return sent([C.v, kind === 'or' ? `${o1} of ${o2}` : `noch ${o1}, noch ${o2}`, C.p]);
  }
  function clueText(P, k) {
    const t = k.t, R = ref.bind(null, P);
    switch (t) {
      case 'is': return stmt(P, k.a, k.b, true) + '.';
      case 'not': return stmt(P, k.a, k.b, false) + '.';
      case 'nor': {
        const [b1, b2] = k.bs.slice().sort((x, y) => x - y);
        if (catOf(P, b1) === 0) return `Noch ${R(b1)}, noch ${R(b2)} ${sent(pred(P, k.a))}.`;
        return cap(R(k.a)) + ' ' + twoOf(P, b1, b2, 'nor') + '.';
      }
      case 'or': {
        const [b1, b2] = catOf(P, k.bs[0]) === catOf(P, k.bs[1]) ? k.bs.slice().sort((x, y) => x - y) : k.bs;
        if (catOf(P, b1) === catOf(P, b2)) {
          if (catOf(P, b1) === 0) return `${cap(R(k.a))} is ${R(b1)} of ${R(b2)}.`;
          return cap(R(k.a)) + ' ' + twoOf(P, b1, b2, 'or') + '.';
        }
        return `${cap(R(k.a))} ${sent(pred(P, b1))} of ${sent(pred(P, b2))}, maar niet allebei.`;
      }
      case 'ext': { const O = CAT[P.cats[catOf(P, k.b)].id].ord; return `${cap(R(k.a))} ${k.b % P.N === 0 ? O.min : O.max}.`; }
      case 'cmp': {
        const O = CAT[P.cats[k.o].id].ord, [x, y, ph] = k.f ? [k.b, k.a, O.gt] : [k.a, k.b, O.lt];
        return `${cap(R(x))} ${ph[0]} ${R(y)}${ph[1] ? ' ' + ph[1] : ''}.`;
      }
      case 'dif': {
        const O = CAT[P.cats[k.o].id].ord, [x, y, ph] = k.f ? [k.b, k.a, O.dlt(k.d)] : [k.a, k.b, O.dgt(k.d)];
        return `${cap(R(x))} ${ph[0]} ${R(y)}${ph[1] ? ' ' + ph[1] : ''}.`;
      }
      case 'list': {
        const G = GROUP[P.grp], refs = k.xs.map(R), n = k.xs.length;
        if (n === P.N) return `De ${NUMW[n]} ${G.pl} zijn ${joinEn(refs)}.`;
        return `${cap(joinEn(refs))} zijn ${NUMW[n]} verschillende ${G.pl}.`;
      }
      case 'pair': {
        const [x1, x2] = k.xs, [y1, y2] = k.ys, C = CAT[P.cats[catOf(P, y1)].id];
        const o1 = fill(C.o, itemOf(P, y1)), o2 = fill(C.o, itemOf(P, y2));
        return `Van ${R(x1)} en ${R(x2)} ${C.v} de een ${sent([o1, C.p])} en de ander ${C.pRep ? sent([o2, C.p]) : o2}.`;
      }
    }
    return '';
  }

  /* ---------- the truth of a clue for a complete assignment (ent: item -> person) ---------- */
  function holds(P, k, ent) {
    const N = P.N, valOf = (g, o) => { const e = ent[g]; for (let i = 0; i < N; i++) if (ent[o * N + i] === e) return P.cats[o].items[i].val; return NaN; };
    switch (k.t) {
      case 'is': case 'ext': return ent[k.a] === ent[k.b];
      case 'not': return ent[k.a] !== ent[k.b];
      case 'nor': return ent[k.a] !== ent[k.bs[0]] && ent[k.a] !== ent[k.bs[1]];
      case 'or': return catOf(P, k.bs[0]) === catOf(P, k.bs[1]) ? (ent[k.a] === ent[k.bs[0]] || ent[k.a] === ent[k.bs[1]]) : ((ent[k.a] === ent[k.bs[0]]) !== (ent[k.a] === ent[k.bs[1]]));
      case 'cmp': return valOf(k.a, k.o) < valOf(k.b, k.o);
      case 'dif': return valOf(k.a, k.o) - valOf(k.b, k.o) === k.d;
      case 'list': return new Set(k.xs.map(g => ent[g])).size === k.xs.length;
      case 'pair': { const e1 = ent[k.xs[0]], e2 = ent[k.xs[1]], f1 = ent[k.ys[0]], f2 = ent[k.ys[1]]; return e1 !== e2 && ((e1 === f1 && e2 === f2) || (e1 === f2 && e2 === f1)); }
    }
    return false;
  }

  /* ---------- the logical solver ----------
     State M (T x T, T = K·N, symmetric): 0 unknown, NO, YES for "item a and item b belong to the same person".
     Techniques, always the simplest one that makes progress first (level = difficulty):
       1  direct clues (is / is niet / noch / de eerste-laatste), elimination inside a block, transfer through a ✓ to other blocks
       2  of-clues, ouder/jonger, lists (all different), "no common option" across a third category
       3  exact differences (precies N, direct voor/na), pairs (de een … de ander), lists that name everybody
     No guessing: every deduction follows from one clue or from the grid. Options:
       max   highest technique level         M     start state (copied)          clues  [[index, clue], …] (default all)
       first stop at the first new deduction and return it as {a, b, v, why, lvl}      trace  keep every step */
  function solve(P, o = {}) {
    const K = P.K, N = P.N, T = K * N, max = o.max ?? 3, M = o.M ? Int8Array.from(o.M) : new Int8Array(T * T);
    const clues = o.clues || P.clues.map((c, i) => [i, c]);
    const need = K * (K - 1) / 2 * N, used = [0, 0, 0, 0], steps = o.trace ? [] : null;
    let yes = 0, contra = false, stop = false, step = null, lvl = 1;
    for (let a = 0; a < T; a++) for (let b = a + 1; b < T; b++) if (M[a * T + b] === YES && ((a / N) | 0) !== ((b / N) | 0)) yes++;
    const C = g => (g / N) | 0;
    function ded(a, b, v, why) {
      if (stop) return false;
      const m = M[a * T + b];
      if (m === v) return false;
      if (m) { contra = true; stop = true; return false; }
      M[a * T + b] = M[b * T + a] = v; if (v === YES) yes++;
      used[lvl]++;
      if (steps) steps.push({ a, b, v, why, lvl });
      if (o.first) { step = { a, b, v, why, lvl }; stop = true; }
      return true;
    }
    const bad = () => { contra = true; stop = true; return false; };
    function elim() {
      let any = false;
      for (let ca = 0; ca < K; ca++) for (let cb = 0; cb < K; cb++) {
        if (ca === cb) continue;
        for (let i = 0; i < N; i++) {
          const x = ca * N + i; let nYes = 0, y1 = -1, nUnk = 0, unk = -1;
          for (let j = 0; j < N; j++) { const m = M[x * T + cb * N + j]; if (m === YES) { nYes++; y1 = cb * N + j; } else if (!m) { nUnk++; unk = cb * N + j; } }
          if (nYes > 1 || (!nYes && !nUnk)) return bad();
          if (nYes === 1 && nUnk) { for (let j = 0; j < N; j++) if (!M[x * T + cb * N + j]) any = ded(x, cb * N + j, NO, ['ey', x, y1]) || any; }
          else if (!nYes && nUnk === 1) any = ded(x, unk, YES, ['el', x, cb]) || any;
          if (stop) return any;
        }
      }
      return any;
    }
    function trans() {
      let any = false;
      for (let x = 0; x < T; x++) for (let y = (C(x) + 1) * N; y < T; y++) {
        if (M[x * T + y] !== YES) continue;
        const cx = C(x), cy = C(y);
        for (let z = 0; z < T; z++) {
          const cz = C(z); if (cz === cx || cz === cy) continue;
          const mx = M[x * T + z], my = M[y * T + z];
          if (mx && !my) any = ded(y, z, mx, ['tr', y, x, z]) || any;
          else if (my && !mx) any = ded(x, z, my, ['tr', x, y, z]) || any;
          else if (mx && my && mx !== my) return bad();
          if (stop) return any;
        }
      }
      return any;
    }
    function cross() {
      let any = false;
      for (let x = 0; x < T; x++) for (let y = (C(x) + 1) * N; y < T; y++) {
        if (M[x * T + y]) continue;
        const cx = C(x), cy = C(y);
        for (let cz = 0; cz < K; cz++) {
          if (cz === cx || cz === cy) continue;
          let okz = false;
          for (let j = 0; j < N; j++) { const z = cz * N + j; if (M[x * T + z] !== NO && M[y * T + z] !== NO) { okz = true; break; } }
          if (!okz) { any = ded(x, y, NO, ['cr', x, y, cz]) || any; break; }
        }
        if (stop) return any;
      }
      return any;
    }
    const opts = (g, oc) => { if (C(g) === oc) return [g % N]; const r = []; for (let k = 0; k < N; k++) if (M[g * T + oc * N + k] !== NO) r.push(k); return r; };
    function prop(ci, k, lv) {
      let any = false;
      const d = (a, b, v, why = ['c', ci]) => { any = ded(a, b, v, why) || any; };
      switch (k.t) {
        case 'is': case 'ext': if (lv === 1) d(k.a, k.b, YES); break;
        case 'not': if (lv === 1) d(k.a, k.b, NO); break;
        case 'nor': if (lv === 1) { d(k.a, k.bs[0], NO); d(k.a, k.bs[1], NO); } break;
        case 'or': {
          if (lv !== 2) break;
          const [b1, b2] = k.bs, cb = C(b1);
          if (cb === C(b2)) { for (let j = 0; j < N; j++) { const w = cb * N + j; if (w !== b1 && w !== b2) d(k.a, w, NO); } }
          else {
            d(b1, b2, NO);
            const m1 = M[k.a * T + b1], m2 = M[k.a * T + b2];
            if (m1) d(k.a, b2, m1 === YES ? NO : YES, ['cw', ci, k.a, b1, m1]);
            if (m2) d(k.a, b1, m2 === YES ? NO : YES, ['cw', ci, k.a, b2, m2]);
          }
          break;
        }
        case 'cmp': case 'dif': {
          if (lv !== CLUE_LVL[k.t]) break;
          if (C(k.a) !== C(k.b)) d(k.a, k.b, NO);
          const oc = k.o, V = P.cats[oc].items.map(it => it.val);
          const okA = (ka, pb) => k.t === 'cmp' ? pb.some(m => ka < m) : pb.some(m => V[ka] - V[m] === k.d);
          const okB = (kb, pa) => k.t === 'cmp' ? pa.some(m => m < kb) : pa.some(m => V[m] - V[kb] === k.d);
          const pa = opts(k.a, oc), pb = opts(k.b, oc);
          if (!pa.length || !pb.length) return bad();
          for (const ka of pa) if (!okA(ka, pb)) d(k.a, oc * N + ka, NO, ['co', ci, k.b]);
          const pa2 = opts(k.a, oc);
          for (const kb of pb) if (!okB(kb, pa2)) d(k.b, oc * N + kb, NO, ['co', ci, k.a]);
          break;
        }
        case 'list': {
          if (lv === 2) { for (let i = 0; i < k.xs.length; i++) for (let j = i + 1; j < k.xs.length; j++) if (C(k.xs[i]) !== C(k.xs[j])) d(k.xs[i], k.xs[j], NO); }
          else if (lv === 3 && k.xs.length === N) {
            for (let z = 0; z < T; z++) {
              if (k.xs.includes(z)) continue;
              let n = 0, last = -1;
              for (const L of k.xs) if (C(L) !== C(z) && M[z * T + L] !== NO) { n++; last = L; }
              if (!n) return bad();
              if (n === 1) d(z, last, YES, ['lc', ci, z]);
              if (stop) break;
            }
          }
          break;
        }
        case 'pair': {
          if (lv !== 3) break;
          const [x1, x2] = k.xs, [y1, y2] = k.ys, A = C(x1), B = C(y1);
          for (let j = 0; j < N; j++) { const w = B * N + j; if (w !== y1 && w !== y2) { d(x1, w, NO); d(x2, w, NO); } }
          for (let j = 0; j < N; j++) { const w = A * N + j; if (w !== x1 && w !== x2) { d(w, y1, NO); d(w, y2, NO); } }
          const m = (p, q) => M[p * T + q];
          let ev = null, cs = 0;
          for (const [p, q, v, c] of [[x1, y1, YES, 1], [x2, y2, YES, 1], [x1, y2, NO, 1], [x2, y1, NO, 1], [x1, y2, YES, 2], [x2, y1, YES, 2], [x1, y1, NO, 2], [x2, y2, NO, 2]]) if (m(p, q) === v) { ev = [p, q, v]; cs = c; break; }
          if (cs) {
            const why = ['cw', ci, ev[0], ev[1], ev[2]];
            if (cs === 1) { d(x1, y1, YES, why); d(x2, y2, YES, why); d(x1, y2, NO, why); d(x2, y1, NO, why); }
            else { d(x1, y2, YES, why); d(x2, y1, YES, why); d(x1, y1, NO, why); d(x2, y2, NO, why); }
          }
          break;
        }
      }
      return any;
    }
    const clueTech = lv => () => { let any = false; for (const [ci, k] of clues) { if (CLUE_LVL[k.t] > lv && !(k.t === 'list' && lv === 3)) continue; any = prop(ci, k, lv) || any; if (stop) break; } return any; };
    const TECH = [[1, clueTech(1)], [1, elim], [1, trans], [2, clueTech(2)], [2, cross], [3, clueTech(3)]];
    while (!stop && (yes < need || o.full)) {
      let prog = false;
      for (const [lv, fn] of TECH) { if (lv > max) break; lvl = lv; if (fn()) { prog = true; break; } if (stop) break; }
      if (!prog) break;
    }
    return { M, solved: !contra && yes >= need, contra, step, steps, used, yes };
  }
  const known = M => { let n = 0; for (let i = 0; i < M.length; i++) if (M[i]) n++; return n; };

  /* ---------- random true clues ---------- */
  function randClue(P, R, t, I) {
    const K = P.K, N = P.N, ent = P.ent, ords = ordCats(P);
    const it = (c, e) => I[c][e], rc = (ex = []) => { const l = [...Array(K).keys()].filter(c => !ex.includes(c)); return l.length ? pick(R, l) : -1; };
    const re = (ex = []) => { const l = [...Array(N).keys()].filter(e => !ex.includes(e)); return pick(R, l); };
    const anchorFirst = () => R() < .55 ? 0 : rc();
    switch (t) {
      case 'is': { const e = re(), a = anchorFirst(), b = rc([a]); return { t, a: it(a, e), b: it(b, e) }; }
      case 'not': { const e1 = re(), e2 = re([e1]), a = anchorFirst(), b = rc([a]); return { t, a: it(a, e1), b: it(b, e2) }; }
      case 'nor': { const e = re(), a = rc(), b = R() < .35 && a !== 0 ? 0 : rc([a, 0]); if (b < 0) return null; const e1 = re([e]), e2 = re([e, e1]); return { t, a: it(a, e), bs: shuffle(R, [it(b, e1), it(b, e2)]) }; }
      case 'or': {
        const e = re(), a = anchorFirst();
        if (R() < .5) { const b = R() < .3 && a !== 0 ? 0 : rc([a, 0]); if (b < 0) return null; return { t, a: it(a, e), bs: shuffle(R, [it(b, e), it(b, re([e]))]) }; }
        const b = rc([a]), c = rc([a, b]); if (c < 0) return null;
        const bs = R() < .5 ? [it(b, e), it(c, re([e]))] : [it(b, re([e])), it(c, e)];
        return { t, a: it(a, e), bs: R() < .5 ? bs : bs.reverse() };
      }
      case 'ext': { if (!ords.length) return null; const o = pick(R, ords), k = R() < .5 ? 0 : N - 1, b = o * N + k, a = rc([o]); return { t, a: it(a, ent[b]), b }; }
      case 'cmp': case 'dif': {
        if (!ords.length) return null;
        const o = pick(R, ords), e1 = re(), e2 = re([e1]), ca = R() < .5 ? 0 : rc([o]), cb = R() < .5 ? ca : rc([o]);
        let a = it(ca, e1), b = it(cb, e2);
        const va = P.cats[o].items[it(o, e1) % N].val, vb = P.cats[o].items[it(o, e2) % N].val;
        let d = va - vb; if (d < 0) { [a, b] = [b, a]; d = -d; }
        return t === 'cmp' ? { t, a: b, b: a, o, f: R() < .5 ? 1 : 0 } : { t, a, b, o, d, f: R() < .5 ? 1 : 0 };
      }
      case 'list': {
        const n = LEVELS[P.lvl].max >= 3 && R() < .65 ? N : Math.max(3, N - 1);
        const es = shuffle(R, [...Array(N).keys()]).slice(0, n), used = {};
        const xs = es.map(e => { let c, tries = 0; do { c = Math.floor(R() * K); tries++; } while ((used[c] || 0) >= (c === 0 ? 1 : 1) && tries < 20); used[c] = (used[c] || 0) + 1; return it(c, e); });
        return { t, xs: shuffle(R, xs) };
      }
      case 'pair': {
        const A = R() < .85 ? 0 : rc(), B = rc([A, 0]); if (B < 0) return null;
        const e1 = re(), e2 = re([e1]);
        return { t, xs: [it(A, e1), it(A, e2)], ys: shuffle(R, [it(B, e1), it(B, e2)]) };
      }
    }
    return null;
  }
  const clueKey = k => k.t + ':' + [k.a, k.b, ...(k.bs || []).slice().sort(), ...(k.xs || []).slice().sort(), ...(k.ys || []).slice().sort(), k.d].join(',');

  /* ---------- the generator: add clues until the logic solver finishes, then drop every clue that is not needed ----------
     A generator function, so the app can run it in small slices (the screen never freezes) and Node can run it at once. */
  function* genIter(lvl, seed) {
    const L = LEVELS[lvl];
    let best = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const R = rng((seed + attempt * 0x9E3779B1) >>> 0);
      const P = buildBase(R, lvl), I = inv(P), T = P.K * P.N;
      const types = Object.keys(L.w).filter(t => ordCats(P).length || !['ext', 'cmp', 'dif'].includes(t)), wsum = types.reduce((s, t) => s + L.w[t], 0);
      const wpick = () => { let r = R() * wsum; for (const t of types) { r -= L.w[t]; if (r <= 0) return t; } return types[types.length - 1]; };
      let M = new Int8Array(T * T), chosen = [], keys = new Set(), fails = 0, solved = false;
      while (chosen.length < 70) {
        const k = randClue(P, R, wpick(), I); if (!k) continue;
        const key = clueKey(k); if (keys.has(key)) continue;
        if (!holds(P, k, P.ent)) throw new Error('onware aanwijzing ' + JSON.stringify(k));
        const r = solve(P, { M, clues: [...chosen.map((c, i) => [i, c]), [chosen.length, k]], max: L.max });
        if (r.contra) throw new Error('tegenspraak in de oplosser');
        if (known(r.M) === known(M) && fails++ < 300) continue;
        keys.add(key); chosen.push(k); M = r.M;
        if (r.solved) { solved = true; break; }
        if (chosen.length % 3 === 0) yield;
      }
      if (!solved) continue;
      yield;
      // minimise: try to drop each clue, simplest first
      let cur = chosen.map((c, i) => i);
      const order = cur.slice().sort((a, b) => (SIMPLE[chosen[a].t] - SIMPLE[chosen[b].t]) || (R() - .5));
      for (const i of order) {
        const trial = cur.filter(j => j !== i);
        if (solve(P, { clues: trial.map(j => [j, chosen[j]]), max: L.max }).solved) cur = trial;
        yield;
      }
      const clues = shuffle(R, cur.map(j => chosen[j]));
      P.clues = clues;
      const tr = solve(P, { max: L.max });
      const need = L.need || [0, 0], nIs = clues.filter(c => c.t === 'is').length;
      P.grade = { l1: tr.used[1], l2: tr.used[2], l3: tr.used[3], n: clues.length, attempt };
      const fits = tr.solved && tr.used[2] + tr.used[3] >= need[0] && tr.used[3] >= need[1] && (L.maxIs == null || nIs <= L.maxIs);
      const score = (tr.used[2] + 2 * tr.used[3]) - (L.maxIs != null ? Math.max(0, nIs - L.maxIs) * 5 : 0);
      if (tr.solved && (!best || score > best.score)) best = { P, score };
      if (fits) { best = { P }; break; }
    }
    if (!best) throw new Error('geen puzzel gevonden');
    const P = best.P;
    P.seed = seed >>> 0;
    for (const k of P.clues) k.txt = clueText(P, k);
    return P;
  }
  function generate(lvl, seed) { const it = genIter(lvl, seed); let r; while (!(r = it.next()).done); return r.value; }

  /* ---------- marks (the player's grid) ---------- */
  const T_ = P => P.K * P.N;
  const newMarks = P => new Array(T_(P) * T_(P)).fill(0);
  // the next mark for a tap: 'xv' empty → ✗ → ✓ → empty, 'vx' empty → ✓ → ✗ → empty, 'kies' the chosen pen (tap again to clear)
  function nextMark(cur, mode, pen) {
    if (mode === 'vx') return cur === 0 ? YES : cur === YES ? NO : 0;
    if (mode === 'kies') return (cur === pen || (pen === NO && cur === AUTO)) ? 0 : pen;
    return cur === 0 ? NO : cur === YES ? 0 : YES;
  }
  // set one cell; with auto, a ✓ crosses out the rest of its row and column inside the block (and takes those back when it goes)
  function setMark(P, mk, a, b, v, auto) {
    const T = T_(P), N = P.N, A = catOf(P, a), B = catOf(P, b), ch = [];
    const put = (x, y, nv) => { const o = mk[x * T + y]; if (o === nv) return; mk[x * T + y] = mk[y * T + x] = nv; ch.push([x, y, o, nv]); };
    const old = mk[a * T + b];
    put(a, b, v);
    if (auto && v === YES) {
      for (let j = 0; j < N; j++) { const y = B * N + j; if (y !== b && !mk[a * T + y]) put(a, y, AUTO); }
      for (let i = 0; i < N; i++) { const x = A * N + i; if (x !== a && !mk[x * T + b]) put(x, b, AUTO); }
    }
    if (old === YES && v !== YES) {
      const just = (x, y) => { for (let i = 0; i < N; i++) if (mk[(A * N + i) * T + y] === YES || mk[x * T + B * N + i] === YES) return true; return false; };
      for (let j = 0; j < N; j++) { const y = B * N + j; if (y !== b && mk[a * T + y] === AUTO && !just(a, y)) put(a, y, 0); }
      for (let i = 0; i < N; i++) { const x = A * N + i; if (x !== a && mk[x * T + b] === AUTO && !just(x, b)) put(x, b, 0); }
    }
    return ch;
  }
  const undoChanges = (P, mk, ch) => { const T = T_(P); for (let i = ch.length - 1; i >= 0; i--) { const [x, y, o] = ch[i]; mk[x * T + y] = mk[y * T + x] = o; } };
  const redoChanges = (P, mk, ch) => { const T = T_(P); for (const [x, y, , n] of ch) mk[x * T + y] = mk[y * T + x] = n; };
  const wrongMark = (P, mk, a, b) => { const m = mk[a * T_(P) + b], same = P.ent[a] === P.ent[b]; return (m === YES && !same) || ((m === NO || m === AUTO) && same); };
  // solved: every block with the names holds exactly the right ✓ marks
  function isSolved(P, mk) {
    const T = T_(P), N = P.N;
    for (let c = 1; c < P.K; c++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const g = c * N + j; if ((mk[i * T + g] === YES) !== (P.ent[g] === i)) return false; }
    return true;
  }
  // all pairs of items in different categories, block by block (for drawing, saving and checks)
  function pairs(P) { const r = [], T = T_(P); for (let a = 0; a < T; a++) for (let b = (catOf(P, a) + 1) * P.N; b < T; b++) r.push([a, b]); return r; }
  const packMarks = (P, mk) => pairs(P).map(([a, b]) => mk[a * T_(P) + b]).join('');
  function unpackMarks(P, s) { const mk = newMarks(P), T = T_(P); pairs(P).forEach(([a, b], i) => { const v = +(s || '')[i] || 0; mk[a * T + b] = mk[b * T + a] = v > 3 ? 0 : v; }); return mk; }
  // what the player's ✓ marks already link together (directly or through other ✓): per person, per category, the item or -1
  function summary(P, mk) {
    const T = T_(P), N = P.N, par = [...Array(T).keys()], f = x => par[x] === x ? x : (par[x] = f(par[x]));
    for (const [a, b] of pairs(P)) if (mk[a * T + b] === YES) par[f(a)] = f(b);
    return [...Array(N).keys()].map(i => P.cats.map((c, ci) => { if (!ci) return i; const l = []; for (let j = 0; j < N; j++) if (f(ci * N + j) === f(i)) l.push(ci * N + j); return l.length === 1 ? l[0] : -1; }));
  }

  /* ---------- hints: the next logical step from what the player already has, with the reason in words ---------- */
  function hint(P, mk) {
    const T = T_(P);
    for (const pass of [0, 1]) for (const [a, b] of pairs(P)) if ((mk[a * T + b] === AUTO) === !!pass && wrongMark(P, mk, a, b)) return { k: 'err', a, b, v: mk[a * T + b] === YES ? YES : NO, text: mk[a * T + b] === YES ? 'Dit ✓ klopt niet. Haal het weg en kijk nog eens naar de aanwijzingen.' : 'Dit ✗ klopt niet. Haal het weg en kijk nog eens naar de aanwijzingen.', refs: [], clue: -1 };
    const M = new Int8Array(T * T); for (let i = 0; i < T * T; i++) M[i] = mk[i] === YES ? YES : mk[i] ? NO : 0;
    const r = solve(P, { M, first: true, max: 3, full: true });
    if (!r.step) return null;
    return Object.assign({ k: 'step' }, r.step, explain(P, r.step, r.M));
  }
  function explain(P, s, M) {
    const T = T_(P), N = P.N, w = s.why, st = (x, y, v, c = true) => stmt(P, x, y, v === YES, c), conclusion = st(s.a, s.b, s.v, false);
    const okOpts = (g, oc) => { const r = []; for (let k = 0; k < N; k++) if (M[g * T + oc * N + k] !== NO) r.push(oc * N + k); return r; };
    switch (w[0]) {
      case 'c': return { text: `Uit aanwijzing ${w[1] + 1} volgt: ${conclusion}.`, refs: [], clue: w[1] };
      case 'cw': return { text: `${st(w[2], w[3], w[4])}. Met aanwijzing ${w[1] + 1} volgt dan: ${conclusion}.`, refs: [[w[2], w[3]]], clue: w[1] };
      case 'co': {
        const k = P.clues[w[1]], other = w[2], oc = k.o;
        if (catOf(P, other) === oc) return { text: `Uit aanwijzing ${w[1] + 1} volgt: ${conclusion}.`, refs: [], clue: w[1] };
        const l = []; for (let j = 0; j < N; j++) if (M[other * T + oc * N + j] !== NO) l.push(oc * N + j);
        if (l.length === N) return { text: `Uit aanwijzing ${w[1] + 1} volgt: ${conclusion}.`, refs: [], clue: w[1] };
        return { text: `Bij ${ref(P, other)} is alleen nog ${joinOr(l.map(g => nm(P, g)))} mogelijk. Met aanwijzing ${w[1] + 1} volgt dan: ${conclusion}.`, refs: l.map(g => [other, g]), clue: w[1] };
      }
      case 'lc': return { text: `Volgens aanwijzing ${w[1] + 1} is elk ${GROUP[P.grp].sg} precies één van de genoemden. Voor ${ref(P, w[2])} blijft alleen ${ref(P, w[2] === s.a ? s.b : s.a)} over. Daarom geldt: ${conclusion}.`, refs: [], clue: w[1] };
      case 'ey': return { text: `${st(w[1], w[2], YES)}. Daarom geldt: ${conclusion}.`, refs: [[w[1], w[2]]], clue: -1 };
      case 'el': {
        const x = w[1], y = x === s.a ? s.b : s.a, c = P.cats[w[2]];
        return { text: `Bij ${nm(P, x)} blijft alleen ${nm(P, y)} over: alle andere ${c.pl} vallen af. Daarom geldt: ${conclusion}.`, refs: [], clue: -1 };
      }
      case 'tr': return { text: `${st(w[1], w[2], YES)} en ${st(w[2], w[3], M[w[2] * T + w[3]], false)}. Daarom geldt: ${conclusion}.`, refs: [[w[1], w[2]], [w[2], w[3]]], clue: -1 };
      case 'cr': {
        const [x, y, cz] = w.slice(1), ox = okOpts(x, cz), oy = okOpts(y, cz);
        return { text: `Bij de ${P.cats[cz].pl} blijft voor ${ref(P, x)} alleen ${joinOr(ox.map(g => nm(P, g)))} over en voor ${ref(P, y)} alleen ${joinOr(oy.map(g => nm(P, g)))}. Daarom geldt: ${conclusion}.`, refs: [...ox.map(g => [x, g]), ...oy.map(g => [y, g])], clue: -1 };
      }
    }
    return { text: conclusion + '.', refs: [], clue: -1 };
  }

  const Core = { NO, YES, AUTO, LEVELS, LVL_KEYS, CLUE_LVL, rng, hashStr, dailyFor, buildBase, generate, genIter, solve, holds, clueText, stmt, ref, nm, pred, catOf, itemOf, inv,
    newMarks, nextMark, setMark, undoChanges, redoChanges, wrongMark, isSolved, pairs, packMarks, unpackMarks, summary, hint, explain, randClue, known };
