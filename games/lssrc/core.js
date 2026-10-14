  /* ================= rules: pure logic without DOM (the level generator lsgen.mjs runs this same code) =================
     Glass tubes hold layers of coloured liquid (U units per colour, U = 4 or 5). Pour = the top run of one colour goes
     into another tube when that one is empty or has the same colour on top, as much as fits. A tube that holds all U units
     of one colour is complete: it gets a cork and stays closed. Twists: narrow tubes (room for U - 1, never complete),
     frozen tubes (closed until k tubes are complete), hidden layers ("?", shown once they come to the top).
     Level: { t: ['abca', ...] (bottom -> top, a = colour 0), u: 4|5, n: [narrow tube indices], f: { tube: k }, h: ['0110', ...]
              (1 = hidden), m: par (moves of the solver's solution), s: 'acbd..' (solution, 2 letters per pour: from, to) } */
  const colOf = ch => ch.charCodeAt(0) - 97;
  function newState(L) {
    const U = L.u || 4, T = L.t.map(s => [...s].map(colOf)), nar = L.n || [];
    const st = {
      U, T, cap: T.map((_, i) => nar.includes(i) ? U - 1 : U), frz: T.map((_, i) => (L.f && +L.f[i]) || 0),
      hid: T.map((t, i) => t.map((_, j) => !!(L.h && L.h[i] && L.h[i][j] === '1'))),
      nc: new Set(T.flat()).size, done: 0, extra: false, won: false,
    };
    st.done = countDone(st); reveal(st); st.won = isWon(st);
    return st;
  }
  const clone = S => Object.assign({}, S, { T: S.T.map(t => t.slice()), cap: S.cap.slice(), frz: S.frz.slice(), hid: S.hid.map(h => h.slice()) });
  const top = t => t.length ? t[t.length - 1] : -1;
  function runLen(t) { const c = top(t); let n = 0; for (let i = t.length - 1; i >= 0 && t[i] === c; i--) n++; return n; }
  const isMono = t => t.length > 0 && runLen(t) === t.length;
  const isDone = (S, i) => S.T[i].length === S.U && isMono(S.T[i]);
  const frozen = (S, i) => S.frz[i] > 0 && S.done < S.frz[i];
  function countDone(S) { let n = 0; for (let i = 0; i < S.T.length; i++) if (isDone(S, i)) n++; return n; }
  function isWon(S) { for (let i = 0; i < S.T.length; i++) if (S.T[i].length && !isDone(S, i)) return false; return true; }
  function reveal(S) {                                          // the top run of every tube is always visible
    const out = [];
    S.T.forEach((t, i) => { const c = top(t); for (let j = t.length - 1; j >= 0 && t[j] === c; j--) if (S.hid[i][j]) { S.hid[i][j] = false; out.push([i, j]); } });
    return out;
  }
  // why a pour is not possible (null = it is)
  function why(S, s, t) {
    if (s === t) return 'same';
    if (s < 0 || t < 0 || s >= S.T.length || t >= S.T.length) return 'none';
    if (frozen(S, s) || frozen(S, t)) return 'frozen';
    const A = S.T[s], B = S.T[t];
    if (!A.length) return 'empty';
    if (isDone(S, s)) return 'corked';
    if (B.length >= S.cap[t]) return 'full';
    if (B.length && top(B) !== top(A)) return 'colour';
    return null;
  }
  // pour s -> t; returns { n, c, done: [completed tubes], thaw: [thawed tubes], rev: [[tube, layer], ...] } or { err }
  function pour(S, s, t) {
    const err = why(S, s, t); if (err) return { err };
    const A = S.T[s], B = S.T[t], c = top(A), n = Math.min(runLen(A), S.cap[t] - B.length);
    for (let k = 0; k < n; k++) { A.pop(); S.hid[s].pop(); B.push(c); S.hid[t].push(false); }
    const before = S.done; S.done = countDone(S);
    const done = isDone(S, t) ? [t] : [], thaw = [];
    if (S.done > before) for (let i = 0; i < S.T.length; i++) if (S.frz[i] > before && S.frz[i] <= S.done) thaw.push(i);
    const rev = reveal(S); S.won = isWon(S);
    return { n, c, done, thaw, rev };
  }
  function legal(S) { const out = []; for (let s = 0; s < S.T.length; s++) for (let t = 0; t < S.T.length; t++) if (!why(S, s, t)) out.push([s, t]); return out; }
  // a pour that changes nothing worth having: a whole one-colour tube into an empty tube of the same kind
  const pointless = (S, s, t) => !S.T[t].length && isMono(S.T[s]) && S.cap[t] <= S.cap[s];
  const stuck = S => !S.won && !legal(S).some(([s, t]) => !pointless(S, s, t));
  function addTube(S) { S.T.push([]); S.hid.push([]); S.cap.push(S.U); S.frz.push(0); S.extra = true; }

  /* ================= solver: A* over pours with canonical states =================
     h = (number of colour runs) - (number of colours): one pour joins at most two runs, so h never overestimates and with
     w = 1 the solution is optimal. Tubes of the same kind (capacity, frozen-until) are interchangeable, so a state is
     stored sorted per kind. Returns the list of pours [[s, t], ...], or null (no solution / budget used up: res.why). */
  function solve(S0, o = {}) {
    const w = o.w || 1, max = o.max || 200000, deadline = o.ms ? Date.now() + o.ms : 0;
    const n = S0.T.length, U = S0.U, cap = S0.cap, frz = S0.frz;
    const kind = cap.map((c, i) => c + (frz[i] ? 'f' + frz[i] : ''));
    const ch = t => String.fromCharCode(...t.map(c => 97 + c));
    const runsOf = T => { let r = 0; for (const t of T) for (let i = 0; i < t.length; i++) if (!i || t[i] !== t[i - 1]) r++; return r; };
    const nc = new Set(S0.T.flat()).size;
    const doneOf = T => { let d = 0; for (const t of T) if (t.length === U) { let m = true; for (let i = 1; i < U; i++) if (t[i] !== t[0]) { m = false; break; } if (m) d++; } return d; };
    const key = T => { const p = T.map((t, i) => kind[i] + ':' + ch(t)); p.sort(); return p.join('|'); };
    const start = { T: S0.T.map(t => t.slice()), g: 0, p: null, mv: null }; start.k = key(start.T);
    start.h = runsOf(start.T) - nc; start.d = doneOf(start.T);
    if (start.h === 0) return Object.assign([], { exp: 0 });
    const heap = [start], seen = new Map([[start.k, 0]]);
    const less = (a, b) => (a.g + w * a.h) - (b.g + w * b.h) || a.h - b.h;
    const push = x => { heap.push(x); let i = heap.length - 1; while (i) { const j = (i - 1) >> 1; if (less(heap[j], heap[i]) <= 0) break; [heap[i], heap[j]] = [heap[j], heap[i]]; i = j; } };
    const popH = () => { const r = heap[0], x = heap.pop(); if (heap.length) { heap[0] = x; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m]) < 0) m = l; if (rr < heap.length && less(heap[rr], heap[m]) < 0) m = rr; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return r; };
    let exp = 0;
    while (heap.length) {
      const N = popH();
      if (seen.get(N.k) < N.g) continue;
      if (++exp > max || (deadline && !(exp & 255) && Date.now() > deadline)) { const r = null; solve.why = 'budget'; solve.exp = exp; return r; }
      const T = N.T, d = N.d;
      const fz = i => frz[i] > 0 && d < frz[i];
      for (let s = 0; s < n; s++) {
        const A = T[s]; if (!A.length || fz(s)) continue;
        const c = A[A.length - 1]; let run = 0; for (let i = A.length - 1; i >= 0 && A[i] === c; i--) run++;
        if (run === A.length && A.length === U) continue;                       // complete (corked)
        const emptyKinds = new Set();
        for (let t = 0; t < n; t++) {
          if (t === s || fz(t)) continue;
          const B = T[t]; if (B.length >= cap[t]) continue;
          if (B.length) { if (B[B.length - 1] !== c) continue; }
          else {
            if (run === A.length && cap[t] <= cap[s]) continue;                  // pointless
            if (emptyKinds.has(kind[t])) continue; emptyKinds.add(kind[t]);     // one empty tube per kind is enough
          }
          const k = Math.min(run, cap[t] - B.length);
          const T2 = T.slice(); T2[s] = A.slice(0, A.length - k); T2[t] = B.concat(Array(k).fill(c));
          const g = N.g + 1, ky = key(T2), old = seen.get(ky);
          if (old !== undefined && old <= g) continue;
          seen.set(ky, g);
          const M = { T: T2, g, p: N, mv: [s, t], h: runsOf(T2) - nc, d: doneOf(T2), k: ky };
          if (M.h === 0) { const path = []; for (let x = M; x.p; x = x.p) path.push(x.mv); path.reverse(); path.exp = exp; solve.exp = exp; return path; }
          push(M);
        }
      }
    }
    solve.why = 'none'; solve.exp = exp; return null;
  }
  const encMoves = mv => mv.map(([s, t]) => String.fromCharCode(97 + s, 97 + t)).join('');
  const decMoves = s => { const out = []; for (let i = 0; i + 1 < s.length; i += 2) out.push([colOf(s[i]), colOf(s[i + 1])]); return out; };
