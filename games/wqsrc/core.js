  /* ================= data: the country table (inline), flags + map (gzip + base64, unpacked on first open) ================= */
  const CONT = { W: 'Hele wereld', EU: 'Europa', AF: 'Afrika', AS: 'Azië', NA: 'Noord-Amerika', SA: 'Zuid-Amerika', OC: 'Oceanië' };
  const CONT_ADJ = { W: '', EU: 'Europese', AF: 'Afrikaanse', AS: 'Aziatische', NA: 'Noord-Amerikaanse', SA: 'Zuid-Amerikaanse', OC: 'Oceanische' };
  const CONTS = ['EU', 'AF', 'AS', 'NA', 'SA', 'OC'];
  const sp = s => s ? s.split('|') : [];
  const C = DATA.c.map(r => ({ id: r[0], n: r[1], alt: sp(r[2]), cap: sp(r[3]), capAlt: sp(r[4]), ct: r[5].split('+'), t: r[6], note: r[7], x: !!r[8] }));
  const BY = Object.fromEntries(C.map(c => [c.id, c]));
  const MAIN = C.filter(c => !c.x);
  const SIMG = DATA.sim;
  const NOMIX = { IL: ['PS'], PS: ['IL'] };            // never each other's distractor in capital questions
  const FLAG_AR = { CH: 1, VA: 1, NP: 377 / 481 };
  const flagAr = id => FLAG_AR[id] || 4 / 3;

  /* ---- text matching: accents, case, spaces and dashes do not matter; small typos are forgiven ---- */
  const norm = s => String(s).toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\bsaint\b|\bst\b\.?|\bsint\b/g, 'st').replace(/[^a-z0-9]/g, '');
  function dist(a, b, max = 9) {                        // optimal string alignment distance (Damerau–Levenshtein with adjacent swaps)
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const n = a.length, m = b.length; let p2 = null, p = Array.from({ length: m + 1 }, (_, j) => j);
    for (let i = 1; i <= n; i++) {
      const c = [i]; let rowMin = i;
      for (let j = 1; j <= m; j++) {
        let v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        c.push(v); if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      p2 = p; p = c;
    }
    return p[m];
  }
  const tolFor = len => len >= 12 ? 3 : len >= 8 ? 2 : len >= 4 ? 1 : 0;
  // what a typed answer may be: every country (names) or every capital, each with its accepted spellings
  const namesOf = c => [c.n, ...c.alt];
  const capsOf = c => [...c.cap, ...c.capAlt];
  const answerKind = t => (t === 'cc' ? 'cap' : 'name');
  const formsOf = (c, kind) => (kind === 'cap' ? capsOf(c) : namesOf(c));
  let formIdx = null;
  function forms(kind) {
    formIdx = formIdx || {};
    if (!formIdx[kind]) formIdx[kind] = C.flatMap(c => formsOf(c, kind).map(f => ({ id: c.id, f, k: norm(f) }))).filter(x => x.k);
    return formIdx[kind];
  }
  // judge a typed answer: 'ok' (exact), 'typo' (close enough), 'other' (exactly another country / capital), 'no'
  function judge(input, id, kind) {
    const k = norm(input); if (!k) return { r: 'no' };
    const all = forms(kind), mine = all.filter(x => x.id === id);
    if (mine.some(x => x.k === k)) return { r: 'ok' };
    const other = all.find(x => x.k === k && x.id !== id);
    if (other) return { r: 'other', id: other.id };
    let best = 99; for (const x of mine) best = Math.min(best, dist(k, x.k, 4));
    const tol = tolFor(k.length);
    if (best > tol) return { r: 'no' };
    // forgive a typo only when no other answer is at least as close
    for (const x of all) if (x.id !== id && Math.abs(x.k.length - k.length) <= best && dist(k, x.k, best) <= best) return { r: 'no' };
    return { r: 'typo' };
  }
  // suggestions while typing: prefix matches first, then 'contains', then close ones
  function suggest(input, kind, pool, n = 4) {
    const k = norm(input); if (k.length < 2) return [];
    const seen = new Set(), out = [];
    const shown = x => { const c = BY[x.id]; if (kind !== 'cap') return c.n; const own = c.cap.find(cp => norm(cp) === x.k); return own || c.cap[0]; };
    const add = x => { const f = shown(x), key = norm(f); if (seen.has(key) || out.length >= n) return; seen.add(key); out.push({ id: x.id, f }); };
    const all = forms(kind).filter(x => pool.has(x.id));
    all.filter(x => x.k.startsWith(k)).sort((a, b) => a.k.length - b.k.length).forEach(add);
    all.filter(x => x.k.includes(k)).forEach(add);
    if (k.length >= 4) all.map(x => [x, dist(k, x.k.slice(0, k.length + 1), 2)]).filter(([, d]) => d <= 1 + (k.length >= 7)).sort((a, b) => a[1] - b[1]).forEach(([x]) => add(x));
    return out;
  }

  /* ---- random numbers (seeded for the daily quiz) ---- */
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---- question types ----
     fn: flag -> country     nf: country -> flag     cc: country -> capital     cn: capital -> country
     mn: highlighted on the map -> country           mt: country -> tap it on the map */
  const SKILL = { fn: 0, nf: 0, cc: 1, cn: 1, mn: 2, mt: 2 };
  const TYPEABLE = { fn: 1, cc: 1, cn: 1, mn: 1 };
  const hasCap = c => c.cap.length > 0;
  const okFor = (t, c) => (t === 'cc' || t === 'cn') ? hasCap(c) && !(t === 'cn' && norm(c.cap[0]).startsWith(norm(c.n).slice(0, 6))) : true;
  const inCont = (c, ct) => ct === 'W' || c.ct.includes(ct);
  function poolOf(cfg, t) {
    return C.filter(c => (!c.x || (cfg.extra && cfg.lvl === 3)) && c.t <= cfg.lvl && inCont(c, cfg.cont) && (!t || okFor(t, c)));
  }
  const mapNb = id => (MAPINFO.meta[id] && MAPINFO.meta[id].n) || [];
  // answer options: the right one + distractors that fit the level (look-alike flags, neighbours, same continent)
  function options(t, id, lvl, r, allowExtra) {
    const c = BY[id], k = lvl === 3 ? 6 : 4, nSim = lvl === 1 ? 0 : lvl === 2 ? 1 : 3;
    const ok = x => x.id !== id && (!x.x || allowExtra) && okFor(t === 'cn' ? 'cc' : t, x) && !(NOMIX[id] || []).includes(x.id)
      && !((t === 'cc') && norm(x.cap[0]) === norm(c.cap[0]));
    const pick = new Set();
    let sim = [];
    if (t === 'fn' || t === 'nf') sim = SIMG.filter(g => g.includes(id)).flat();
    else sim = mapNb(id).filter(n => BY[n] && BY[n].ct.some(q => c.ct.includes(q)));     // neighbours on the same continent (not Brazil for France)
    sim = shuffle([...new Set(sim)].filter(s => BY[s] && ok(BY[s])), r);
    for (const s of sim) { if (pick.size >= nSim) break; pick.add(s); }
    const same = shuffle(C.filter(x => ok(x) && x.ct.some(q => c.ct.includes(q)) && !pick.has(x.id)), r);
    // easier levels: well-known countries as distractors first
    const tierOk = lvl === 1 ? [x => x.t === 1, x => x.t <= 2, () => true] : lvl === 2 ? [x => x.t <= 2, () => true] : [() => true];
    for (const f of tierOk) for (const x of same) { if (pick.size >= k - 1) break; if (f(x)) pick.add(x.id); }
    if (pick.size < k - 1) for (const x of shuffle(C.filter(x => ok(x) && !pick.has(x.id) && x.t <= Math.max(lvl, 2)), r)) { if (pick.size >= k - 1) break; pick.add(x.id); }
    return shuffle([id, ...pick], r);
  }
  const TYPES_OF = { vlag: { fn: ['fn'], nf: ['nf'], mix: ['fn', 'nf'] }, hoofd: { cc: ['cc'], cn: ['cn'], mix: ['cc', 'cn'] } };
  function typesFor(cfg) {
    if (cfg.mode === 'vlag' || cfg.mode === 'hoofd') return TYPES_OF[cfg.mode][cfg.dir[cfg.mode]] || TYPES_OF[cfg.mode].mix;
    if (cfg.mode === 'kaart') return ['mn'];
    if (cfg.mode === 'wijs') return ['mt'];
    return ['fn', 'nf', 'cc', 'cn', 'mn', 'mt'];
  }
  const typed = (cfg, t) => !!(cfg.typing && TYPEABLE[t]);
  function makeQ(t, id, cfg, r, rep = 0) {
    const q = { t, c: id, rep };
    if (t === 'mt') return q;
    if (typed(cfg, t)) { q.typ = 1; return q; }
    q.o = options(t, id, cfg.lvl, r, cfg.extra && cfg.lvl === 3);
    return q;
  }
  // one pass over the pool: every country once, each with a question type that suits it
  function pass(cfg, r) {
    const types = typesFor(cfg), out = [];
    const pool = shuffle(poolOf(cfg), r);
    let k = Math.floor(r() * types.length);
    for (const c of pool) {
      const fit = types.filter(t => okFor(t, c)); if (!fit.length) continue;
      const t = types.length > 1 ? (fit.includes(types[k % types.length]) ? types[k % types.length] : fit[Math.floor(r() * fit.length)]) : fit[0];
      k++; out.push(makeQ(t, c.id, cfg, r));
    }
    return out;
  }
  function buildQuiz(cfg, r) {
    if (cfg.mode === 'dag') return dailyQuiz(cfg.day);
    if (cfg.mode === 'fout') return mistakeQuiz(cfg, r);
    const all = pass(cfg, r);
    const n = cfg.len === 'klok' ? all.length : cfg.len === 'alle' ? all.length : Math.min(+cfg.len, all.length);
    return all.slice(0, n);
  }
  function dailyQuiz(day) {
    const r = rng(hashStr('wq' + day)), cfg = { lvl: 2, cont: 'W', typing: false, extra: false };
    const types = shuffle(['fn', 'cc', 'mn', 'nf', 'cn', 'mt', 'fn', 'cc', 'mn', 'mt'], r);
    const pool = shuffle(poolOf(cfg), r), out = [];
    for (const t of types) { const i = pool.findIndex(c => okFor(t, c)); const c = pool.splice(i, 1)[0]; out.push(makeQ(t, c.id, cfg, r)); }
    return out;
  }
  // practice the mistakes: every (country, skill) that was answered wrong last time
  function weakList() {
    const out = [];
    for (const [id, v] of Object.entries(stats.m)) v.forEach((x, s) => { if (x === 1 && BY[id]) out.push([id, s, (stats.wr || {})[id + s] || 0]); });
    return out.sort((a, b) => b[2] - a[2]);
  }
  function mistakeQuiz(cfg, r) {
    const list = cfg.list || weakList().slice(0, 20).map(([id, s]) => [id, s]);
    const out = [];
    for (const [id, s] of list) {
      const c = BY[id]; if (!c) continue;
      const ts = [['fn', 'nf'], ['cc', 'cn'], ['mn', 'mt']][s].filter(t => okFor(t, c));
      if (!ts.length) continue;
      out.push(makeQ(ts[Math.floor(r() * ts.length)], id, Object.assign({}, cfg, { lvl: 2 }), r));
    }
    return shuffle(out, r);
  }

  /* ---- scoring & mastery ---- */
  // per country and skill (vlag, hoofdstad, kaart): 0 = nog niet gezien, 1 = fout (oefenen), 2 = gekend, 3 = goed gekend, 4 = meester
  const known = v => v >= 2;
  function learn(id, skill, ok) {
    const m = stats.m[id] || (stats.m[id] = [0, 0, 0]);
    m[skill] = ok ? (m[skill] === 0 ? 2 : Math.min(4, m[skill] + 1)) : 1;
    stats.wr = stats.wr || {};
    if (ok) delete stats.wr[id + skill]; else stats.wr[id + skill] = Date.now();
  }
  const lvlOf = (id, s) => ((stats.m[id] || [0, 0, 0])[s] || 0);
  // mastery of a set: skill 0/1/2, or 'all' (a country counts when all three are known)
  function mastery(ct, skill) {
    const set = MAIN.filter(c => inCont(c, ct) && (skill !== 1 || hasCap(c)));
    const kn = set.filter(c => skill === 'all' ? [0, 1, 2].every(s => known(lvlOf(c.id, s)) || (s === 1 && !hasCap(c))) : known(lvlOf(c.id, skill))).length;
    return { n: set.length, k: kn, pct: set.length ? Math.round(kn / set.length * 100) : 0 };
  }
  function points(q, streak, cfg) {
    let p = 100;
    if (q.typ) p += 50;
    if (cfg.lvl === 3) p += 25;
    if (streak >= 3) p += Math.min(150, (streak - 2) * 15);
    if (q.rep) p = Math.round(p / 2);
    return p;
  }
  const starsFor = pct => pct >= 95 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
  // the text of an answer option / the right answer for a question
  const answerText = (t, id) => (t === 'cc' ? BY[id].cap[0] : BY[id].n);
  const capText = c => c.cap.length > 1 ? c.cap.join(', ') : c.cap[0] || '';
