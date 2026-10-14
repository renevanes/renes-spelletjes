  /* ================= tiles ================= */
  // 42 faces: 0-8 dots 1-9, 9-17 bamboo 1-9, 18-26 characters 1-9, 27-30 winds (O Z W N), 31-33 dragons (rood, groen, wit),
  // 34-37 flowers, 38-41 seasons. Match group: a normal face is its own group (4 tiles); all flowers match, all seasons match.
  const NFACE = 42;
  const groupOf = f => f < 34 ? f : f < 38 ? 34 : 35;
  const GROUP_FACES = g => g < 34 ? [g, g, g, g] : g === 34 ? [34, 35, 36, 37] : [38, 39, 40, 41];
  const SUIT = f => f < 9 ? 'dots' : f < 18 ? 'bam' : f < 27 ? 'char' : f < 31 ? 'wind' : f < 34 ? 'drag' : f < 38 ? 'flower' : 'season';
  const NAMES_SUIT = { dots: 'Stenen', bam: 'Bamboe', char: 'Karakters' };
  const FACE_NAME = f => f < 27 ? `${NAMES_SUIT[SUIT(f)]} ${f % 9 + 1}` : f < 31 ? ['Oostenwind', 'Zuidenwind', 'Westenwind', 'Noordenwind'][f - 27] : f < 34 ? ['Rode draak', 'Groene draak', 'Witte draak'][f - 31] : f < 38 ? ['Pruimenbloesem', 'Orchidee', 'Chrysant', 'Pioen'][f - 34] : ['Lente', 'Zomer', 'Herfst', 'Winter'][f - 38];

  /* ================= random ================= */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const shuf = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ================= layouts =================
     Positions on a half-tile grid: a tile covers 2×2 cells, [x, y, z] is its top-left cell and its layer.
     hm(): a height map at whole-tile resolution; a digit is the stack height on that spot.
     A row starting with '>' is shifted half a tile to the right, '^' in front of a map shifts the whole map half a tile down. */
  function hm(rows, P = [], ox = 0, oy = 0, z0 = 0) {
    rows.forEach((row, r) => {
      let sx = 0; if (row[0] === '>') { sx = 1; row = row.slice(1); }
      [...row].forEach((ch, c) => { const h = ch === '.' || ch === ' ' ? 0 : parseInt(ch, 36); for (let z = 0; z < h; z++) P.push([ox + c * 2 + sx, oy + r * 2, z0 + z]); });
    });
    return P;
  }
  const rect = (P, x0, y0, cols, rows, z) => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) P.push([x0 + c * 2, y0 + r * 2, z]); return P; };
  const LAYOUTS = [
    { id: 'schildpad', name: 'Schildpad', sub: 'De klassieke piramide', build() {
      const P = [];
      [[1, 12], [3, 8], [2, 10], [1, 12], [1, 12], [2, 10], [3, 8], [1, 12]].forEach(([x0, n], r) => rect(P, x0 * 2, r * 2, n, 1, 0));
      P.push([0, 7, 0], [26, 7, 0], [28, 7, 0]);
      rect(P, 8, 2, 6, 6, 1); rect(P, 10, 4, 4, 4, 2); rect(P, 12, 6, 2, 2, 3); P.push([13, 7, 4]);
      return P;
    } },
    { id: 'piramide', name: 'Piramide', sub: 'Lagen die half over elkaar liggen', build() {
      const P = [];
      rect(P, 0, 0, 9, 6, 0); rect(P, 1, 1, 8, 5, 1); rect(P, 2, 2, 7, 4, 2); rect(P, 3, 3, 6, 3, 3); rect(P, 5, 5, 4, 1, 4);
      return P;
    } },
    { id: 'burcht', name: 'Burcht', sub: 'Muren, torens en een slottoren', build() {
      const P = [];
      rect(P, 0, 0, 10, 8, 0);
      for (let c = 0; c < 10; c++) for (let r = 0; r < 8; r++) if (c === 0 || c === 9 || r === 0 || r === 7) P.push([c * 2, r * 2, 1]);
      rect(P, 6, 4, 4, 4, 1); rect(P, 8, 6, 2, 2, 2);
      for (const [c, r] of [[0, 0], [9, 0], [0, 7], [9, 7]]) P.push([c * 2, r * 2, 2], [c * 2, r * 2, 3]);
      P.push([9, 0, 2], [9, 14, 2], [0, 7, 2], [18, 7, 2]);
      return P;
    } },
    { id: 'draak', name: 'Draak', sub: 'Een kronkelend lijf met een kop', build() {
      return hm([
        '...........1.1.',
        '.........122221',
        '.11.....1234431',
        '1221...1234432.',
        '12321.1234421..',
        '.12343432.221..',
        '..123321..1221.',
        '...1221....11..',
      ]);
    } },
    { id: 'vlinder', name: 'Vlinder', sub: 'Twee grote vleugels', build() {
      const P = hm([
        '1221.....1221',
        '22321...12322',
        '123321.123321',
        '.12332.23321.',
        '..1222.2221..',
        '.12321.12321.',
        '.1231...1321.',
        '..11.....11..',
      ]);
      for (let r = 0; r < 6; r++) P.push([12, 1 + r * 2, 0], [12, 1 + r * 2, 1]);
      P.push([12, 3, 2], [12, 5, 2], [12, 7, 2], [12, 9, 2]);
      return P;
    } },
    { id: 'bloem', name: 'Bloem', sub: 'Een hart met blaadjes eromheen', build() {
      return hm([
        '...1221...',
        '..123321..',
        '12.1221.21',
        '2332442332',
        '.23455432.',
        '2332442332',
        '12.1221.21',
        '..123321..',
        '...1221...',
      ]);
    } },
    { id: 'brug', name: 'Brug', sub: 'Snel gespeeld: 88 stenen', small: true, build() {
      const P = [];
      rect(P, 0, 0, 12, 4, 0); rect(P, 0, 0, 2, 4, 1); rect(P, 20, 0, 2, 4, 1); rect(P, 8, 2, 4, 2, 1);
      rect(P, 0, 2, 2, 2, 2); rect(P, 20, 2, 2, 2, 2); rect(P, 8, 3, 4, 1, 2); P.push([1, 3, 3], [21, 3, 3], [1, 3, 4], [21, 3, 4]);
      return P;
    } },
    { id: 'ruit', name: 'Ruit', sub: 'Het kleinste: 72 stenen', small: true, build() {
      const P = [], rows = (lens, y0, z) => lens.forEach((n, k) => { for (let c = 0; c < n; c++) P.push([7 - n + c * 2, (y0 + k) * 2, z]); });
      rows([3, 4, 5, 6, 7, 6, 5, 4, 3], 0, 0); rows([1, 2, 3, 4, 5, 4, 3, 2, 1], 0, 1); rows([1, 2, 1], 3, 2);
      return P;
    } },
  ];
  const LAY = id => LAYOUTS.find(l => l.id === id) || LAYOUTS[0];

  /* ================= geometry: who blocks whom ================= */
  const GEO = {};
  function geo(id) {
    if (GEO[id]) return GEO[id];
    const raw = LAY(id).build();
    // stable draw order: layer, then from the top-right to the bottom-left (a tile's left and bottom edge show its thickness)
    const pos = raw.slice().sort((a, b) => a[2] - b[2] || (a[1] - a[0]) - (b[1] - b[0]) || a[1] - b[1]);
    const key = (x, y, z) => x + ',' + y + ',' + z, at = new Map(pos.map((p, i) => [key(...p), i]));
    const find = (x, y, z, dxs, dys) => { const o = []; for (const dx of dxs) for (const dy of dys) { const j = at.get(key(x + dx, y + dy, z)); if (j != null) o.push(j); } return o; };
    const left = [], right = [], above = [], below = [];
    pos.forEach(([x, y, z], i) => {
      left.push(find(x, y, z, [-2], [-1, 0, 1])); right.push(find(x, y, z, [2], [-1, 0, 1]));
      above.push(find(x, y, z + 1, [-1, 0, 1], [-1, 0, 1]));
    });
    pos.forEach((_, i) => below.push([])); above.forEach((a, i) => a.forEach(j => below[j].push(i)));
    let mx = 0, my = 0, mz = 0; for (const [x, y, z] of pos) { mx = Math.max(mx, x + 2); my = Math.max(my, y + 2); mz = Math.max(mz, z); }
    return (GEO[id] = { pos, n: pos.length, left, right, above, below, w: mx, h: my, layers: mz + 1 });
  }
  function isFree(G, alive, i) {
    if (!alive[i]) return false;
    for (const j of G.above[i]) if (alive[j]) return false;
    let l = true; for (const j of G.left[i]) if (alive[j]) { l = false; break; }
    if (l) return true;
    for (const j of G.right[i]) if (alive[j]) return false;
    return true;
  }
  const freeList = (G, alive) => { const o = []; for (let i = 0; i < G.n; i++) if (isFree(G, alive, i)) o.push(i); return o; };
  function movePairs(G, faces) {          // all matching pairs of free tiles
    const alive = faces.map(f => f >= 0), by = {}, out = [];
    for (const i of freeList(G, alive)) (by[groupOf(faces[i])] = by[groupOf(faces[i])] || []).push(i);
    for (const k in by) { const a = by[k]; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) out.push([a[i], a[j]]); }
    return out;
  }

  /* ================= dealing: reverse construction =================
     Take tiles away from the full layout two at a time, always two that are free at that moment, until it is empty.
     Giving each of those pairs two matching faces makes that order a solution of the deal. */
  function removalOrder(G, alive0, r) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const alive = alive0.slice(); let left = alive.filter(Boolean).length; const order = [];
      while (left > 0) {
        const fr = freeList(G, alive);
        if (fr.length < 2) break;
        // a little preference for high tiles keeps the stacks from ending as lone towers (fewer restarts)
        const pick = () => { let best = -1, bs = -1; for (let k = 0; k < 3; k++) { const c = fr[Math.floor(r() * fr.length)]; const s = G.pos[c][2] + r() * 1.5; if (s > bs) { bs = s; best = c; } } return best; };
        const a = pick(); let b = pick(), guard = 0; while (b === a && guard++ < 20) b = fr[Math.floor(r() * fr.length)];
        if (b === a) b = fr.find(x => x !== a);
        order.push([a, b]); alive[a] = alive[b] = false; left -= 2;
      }
      if (left === 0) return order;
    }
    return null;
  }
  function facePairs(n, r) {               // n tiles of a full set: whole groups of 4, a random choice of groups for smaller layouts
    const groups = shuf([...Array(36).keys()], r), pairs = [];
    let need = n;
    for (const g of groups) {
      if (need <= 0) break;
      const fs = shuf(GROUP_FACES(g).slice(), r);
      pairs.push([fs[0], fs[1]]); need -= 2; if (need >= 2) { pairs.push([fs[2], fs[3]]); need -= 2; }
    }
    return pairs;
  }
  function deal(id, seed) {
    const G = geo(id), r = rng(seed), alive = new Array(G.n).fill(true);
    const order = removalOrder(G, alive, r); if (!order) return null;
    const pairs = shuf(facePairs(G.n, r), r), faces = new Array(G.n).fill(-1);
    order.forEach(([a, b], k) => { faces[a] = pairs[k][0]; faces[b] = pairs[k][1]; });
    return { faces, sol: order };
  }
  // shuffle what is left so that it can still be solved: same tiles, new places, new solution
  function reshuffle(id, faces, r) {
    const G = geo(id), alive = faces.map(f => f >= 0);
    const order = removalOrder(G, alive, r); if (!order) return null;
    const by = {}; faces.forEach(f => { if (f >= 0) (by[groupOf(f)] = by[groupOf(f)] || []).push(f); });
    const pairs = []; for (const k in by) { const a = shuf(by[k], r); for (let i = 0; i + 1 < a.length; i += 2) pairs.push([a[i], a[i + 1]]); }
    shuf(pairs, r);
    const nf = faces.map(f => f >= 0 ? -2 : -1);
    order.forEach(([a, b], k) => { nf[a] = pairs[k][0]; nf[b] = pairs[k][1]; });
    return { faces: nf, sol: order };
  }
  // is this list of pairs (in this order) a valid way to clear the board?
  function checkSol(G, faces, sol) {
    if (!sol) return false;
    const alive = faces.map(f => f >= 0); let left = alive.filter(Boolean).length;
    for (const [a, b] of sol) {
      if (!alive[a] || !alive[b] || groupOf(faces[a]) !== groupOf(faces[b]) || !isFree(G, alive, a) || !isFree(G, alive, b)) return false;
      alive[a] = alive[b] = false; left -= 2;
    }
    return left === 0;
  }

  /* ================= solver (hints after the player left the known solution, and the tests) =================
     Depth-first: obviously safe moves first, then the pairs that open up the most; a few restarts with some noise. */
  function solve(G, faces0, budget = 30000) {
    const tries = [0, .8, 1.6, 2.4, 3.2, 4], per = Math.ceil(budget / tries.length);
    for (let k = 0; k < tries.length; k++) { const r = solve1(G, faces0, per, tries[k], rng(977 + k * 131)); if (r) return r; }
    return null;
  }
  function solve1(G, faces0, budget, noise, rnd) {
    const faces = faces0.slice(), alive = faces.map(f => f >= 0), path = [], seen = new Set();
    let nodes = 0, left = alive.filter(Boolean).length;
    const remain = {}; faces.forEach(f => { if (f >= 0) remain[groupOf(f)] = (remain[groupOf(f)] || 0) + 1; });
    const keyOf = () => { let s = ''; for (let i = 0; i < alive.length; i += 30) { let v = 0; for (let j = i; j < Math.min(i + 30, alive.length); j++) v = v * 2 + (alive[j] ? 1 : 0); s += v.toString(36) + '.'; } return s; };
    const weight = t => {                     // how much taking tile t away opens up
      let s = G.pos[t][2] * .6;
      for (const j of G.below[t]) if (alive[j]) s += 3;
      for (const j of G.left[t]) if (alive[j]) s += 1.5;
      for (const j of G.right[t]) if (alive[j]) s += 1.5;
      return s;
    };
    function rec() {
      if (left === 0) return true;
      if (++nodes > budget) return false;
      const k = keyOf(); if (seen.has(k)) return false; seen.add(k);
      const by = {}; for (let i = 0; i < G.n; i++) if (isFree(G, alive, i)) (by[groupOf(faces[i])] = by[groupOf(faces[i])] || []).push(i);
      const moves = [];
      for (const g in by) {
        const a = by[g]; if (a.length < 2) continue;
        if (a.length === remain[g] && (a.length === 2 || a.length === 4)) { moves.length = 0; moves.push({ p: [a[0], a[1]], s: 1e9 }); break; }   // safe: nobody else needs these
        const w = a.map(weight);
        for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
          let s = w[i] + w[j];
          if (a.length === 3) s -= w[3 - i - j] * .5;              // keep the least useful of three for later
          if (remain[g] === 4 && a.length === 2) s -= 1;            // the other two of this group are still buried
          moves.push({ p: [a[i], a[j]], s: s + (noise ? rnd() * noise * 3 : 0) });
        }
      }
      moves.sort((x, y) => y.s - x.s);
      for (const { p: [a, b] } of moves) {
        const g = groupOf(faces[a]);
        alive[a] = alive[b] = false; left -= 2; remain[g] -= 2; path.push([a, b]);
        if (rec()) return true;
        alive[a] = alive[b] = true; left += 2; remain[g] += 2; path.pop();
        if (nodes > budget) return false;
      }
      return false;
    }
    return rec() ? path : null;
  }
