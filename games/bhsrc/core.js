  /* ================= rules: pure logic without DOM (the level generator bhgen.mjs runs this same code) =================
     The lot is a grid of w x h cells. A vehicle covers len cells in a row (len 2 = minibus 4 seats, 3 = bus 6 seats,
     4 = long bus 10 seats) and faces one of four directions. Tapped, it drives straight ahead; when nothing is in the
     way it leaves the lot and parks in the first free bay at the stop. The queue boards in order: the front passenger
     takes the matching bus that arrived first; a full bus drives off and frees its bay. All bays taken while the front
     passenger fits none of them = stuck. */
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];              // N, E, S, W
  const CAP = { 2: 4, 3: 6, 4: 10 };
  function cellsOf(v) { const out = [], vert = v.d === 0 || v.d === 2; for (let i = 0; i < v.len; i++) out.push(vert ? [v.x, v.y + i] : [v.x + i, v.y]); return out; }
  function frontOf(v) { return v.d === 1 ? [v.x + v.len - 1, v.y] : v.d === 2 ? [v.x, v.y + v.len - 1] : [v.x, v.y]; }
  function newState(L) {
    const V = L.v.map((a, i) => ({ id: i, x: a[0], y: a[1], d: a[2], len: a[3], c: a[4], cap: CAP[a[3]], lock: a[5] || 0, hid: !!a[6] }));
    return {
      w: L.w, h: L.h, n: V.length, V, obs: (L.o || []).map(o => o.slice()),
      q: typeof L.q === 'string' ? [...L.q].map(Number) : (L.q || []).slice(), qi: 0,
      gone: V.map(() => false), bays: Array(L.b + (L.lb ? 1 : 0) + 1).fill(null),
      B: L.b, lb: L.lb || 0, extra: false, dep: 0, exits: 0, seq: 0, lost: false, won: false,
    };
  }
  const xSlot = S => S.bays.length - 1;                          // the temporary extra bay (booster)
  const lbSlot = S => S.lb ? S.B : -1;                           // the bay behind a barrier that opens after lb departures
  function slotOpen(S, i) { return i < S.B || (i === lbSlot(S) && S.dep >= S.lb) || (i === xSlot(S) && S.extra); }
  // first free bay; S.pref (set by the screen) may reorder the ordinary bays, e.g. to use one that is visibly empty
  function freeSlot(S) {
    if (S.pref) for (const i of S.pref) if (i < S.B && !S.bays[i]) return i;
    for (let i = 0; i < S.bays.length; i++) if (!S.bays[i] && slotOpen(S, i)) return i;
    return -1;
  }
  function occGrid(S) {
    const g = new Int16Array(S.w * S.h).fill(-1);
    for (const [x, y] of S.obs) g[y * S.w + x] = -2;
    for (const v of S.V) if (!S.gone[v.id]) for (const [x, y] of cellsOf(v)) g[y * S.w + x] = v.id;
    return g;
  }
  // the way ahead: free to the edge, or blocked after `steps` empty cells by `hit` (a vehicle id, or -2 = obstacle)
  function pathOf(S, id, g = occGrid(S)) {
    const v = S.V[id], [dx, dy] = DIRS[v.d]; let [x, y] = frontOf(v), steps = 0;
    for (;;) {
      x += dx; y += dy;
      if (x < 0 || y < 0 || x >= S.w || y >= S.h) return { free: true, steps };
      const o = g[y * S.w + x]; if (o !== -1) return { free: false, steps, hit: o, at: [x, y] };
      steps++;
    }
  }
  function resolve(S, ev) {                                      // board as long as the front passenger fits a parked bus
    while (S.qi < S.q.length) {
      const c = S.q[S.qi]; let best = -1;
      for (let i = 0; i < S.bays.length; i++) { const b = S.bays[i]; if (b && S.V[b.v].c === c && b.n < S.V[b.v].cap && (best < 0 || b.t < S.bays[best].t)) best = i; }
      if (best < 0) break;
      const b = S.bays[best]; b.n++;
      if (ev) ev.push({ k: 'board', p: S.qi, v: b.v, slot: best, n: b.n });
      S.qi++;
      if (b.n === S.V[b.v].cap) {
        S.bays[best] = null; S.dep++; if (best === xSlot(S)) S.extra = false;
        if (ev) { ev.push({ k: 'dep', v: b.v, slot: best }); if (S.lb && S.dep === S.lb) ev.push({ k: 'lbopen', slot: lbSlot(S) }); }
      }
    }
    S.won = S.qi >= S.q.length && S.gone.every(Boolean);
    S.lost = !S.won && S.qi < S.q.length && freeSlot(S) < 0;
  }
  // a tap on vehicle id. crane: lifted straight out (booster), ignoring the way ahead and locks
  function tap(S, id, ev = null, crane = false) {
    if (S.lost || S.won || S.gone[id]) return { k: 'none' };
    const v = S.V[id];
    if (!crane && v.lock > S.exits) return { k: 'locked', left: v.lock - S.exits };
    if (!crane) { const p = pathOf(S, id); if (!p.free) return Object.assign({ k: 'bump' }, p); }
    const slot = freeSlot(S); if (slot < 0) return { k: 'full' };
    S.gone[id] = true; S.exits++; S.bays[slot] = { v: id, n: 0, t: S.seq++ };
    if (ev) ev.push({ k: 'park', v: id, slot, crane });
    resolve(S, ev);
    return { k: 'exit', slot };
  }
  function clone(S) { return Object.assign({}, S, { gone: S.gone.slice(), bays: S.bays.map(b => b && Object.assign({}, b)) }); }
  function movable(S, g = occGrid(S)) { const out = []; for (const v of S.V) if (!S.gone[v.id] && v.lock <= S.exits && pathOf(S, v.id, g).free) out.push(v.id); return out; }
  function keyOf(S) {
    let k = ''; for (let i = 0; i < S.n; i++) k += S.gone[i] ? '1' : '0';
    // bays by arrival order (that decides who boards first) and kind of bay, not by number: equivalent states meet
    const bs = []; S.bays.forEach((b, i) => { if (b) bs.push([b.t, (i === xSlot(S) ? 'x' : i === lbSlot(S) ? 'l' : '') + b.v + ':' + b.n]); });
    bs.sort((a, b) => a[0] - b[0]); for (const b of bs) k += ',' + b[1];
    return k + (S.extra ? 'X' : '');
  }
  // exact search over tap orders (depth first, repeated states skipped). Returns the taps, null = unsolvable, undefined = gave up
  function solve(S0, budget = 250000) {
    const seen = new Set(); let nodes = 0;
    function rec(S) {
      if (S.won) return [];
      if (S.lost) return null;
      if (++nodes > budget) throw 0;
      const k = keyOf(S); if (seen.has(k)) return null; seen.add(k);
      const first = col => { for (let i = S.qi; i < S.q.length; i++) if (S.q[i] === col) return i - S.qi; return 1e9; };
      const ms = movable(S).map(id => [id, first(S.V[id].c)]).sort((a, b) => a[1] - b[1]);
      for (const [id] of ms) { const T = clone(S); tap(T, id); const r = rec(T); if (r) { r.unshift(id); return r; } }
      return null;
    }
    try { return rec(clone(S0)); } catch (e) { if (e === 0) return undefined; throw e; }
  }
