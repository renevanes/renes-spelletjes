/* ================================================================
   MAHJONG – solitaire with the 144 traditional tiles: tap two free, matching
   tiles to take them away. Eight layouts, deals made by reverse construction
   (always solvable), shuffle that stays solvable, hints, undo, daily puzzle.
   ================================================================ */
const Mahjong = (() => {
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

  /* ================= tile artwork (drawn once per size into sprites) ================= */
  const CJK = '"Noto Serif CJK SC","Noto Serif CJK TC","Noto Serif CJK JP","Source Han Serif SC","Songti SC","SimSun","Noto Sans CJK SC","Noto Sans CJK JP",serif';
  const SANS = 'system-ui,Roboto,"Segoe UI",sans-serif';
  const C = { blue: '#1f4f9e', green: '#18804a', red: '#c42630', navy: '#172a4e', ink: '#1f2733', gold: '#c9921c' };
  const TABLES = {
    groen: { name: 'Groen vilt', back: ['#33a07a', '#17604a'], edge: '#0f4434' },
    hout: { name: 'Hout', back: ['#c4583c', '#7e2a1c'], edge: '#5a1c12' },
    nacht: { name: 'Nacht', back: ['#4a7fd0', '#22457e'], edge: '#16305a' },
  };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(v + (255 - v) * k); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const darken = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(v * (1 - k)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

  // a circle of the dots suit: coloured rim, ivory ring, coloured centre with a tiny highlight
  function dot(c, x, y, r, col) {
    const g = c.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    g.addColorStop(0, lighten(col, .35)); g.addColorStop(1, col);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    if (r < 2.2) return;
    c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(x, y, r * .66, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * .47, 0, 7); c.fill();
    if (r > 5) { c.strokeStyle = '#fbf6ea'; c.lineWidth = r * .07; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74); c.lineTo(x + Math.cos(a) * r * .93, y + Math.sin(a) * r * .93); c.stroke(); } }
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(x - r * .14, y - r * .14, r * .14, 0, 7); c.fill();
  }
  // a bamboo stick: rounded stem with three joints
  function stick(c, x, y, len, th, col, ang = 0) {
    c.save(); c.translate(x, y); c.rotate(ang);
    const g = c.createLinearGradient(-th / 2, 0, th / 2, 0); g.addColorStop(0, darken(col, .25)); g.addColorStop(.45, lighten(col, .25)); g.addColorStop(1, darken(col, .3));
    c.fillStyle = g; rr(c, -th / 2, -len / 2, th, len, th / 2); c.fill();
    c.fillStyle = darken(col, .45);
    for (const k of [-.5, 0, .5]) { const yy = k * (len - th) * .92; c.fillRect(-th * .62, yy - th * .16, th * 1.24, th * .32); }
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-th * .18, -len / 2 + th * .6, th * .16, len - th * 1.2);
    c.restore();
  }
  const DOTS = {    // [x, y, colour] in the face box (0..1), radius factor
    1: [[[.5, .5, 'X']], .36], 2: [[[.5, .27, 'g'], [.5, .73, 'b']], .2], 3: [[[.25, .2, 'b'], [.5, .5, 'r'], [.75, .8, 'g']], .16],
    4: [[[.29, .27, 'b'], [.71, .27, 'g'], [.29, .73, 'g'], [.71, .73, 'b']], .17],
    5: [[[.27, .22, 'b'], [.73, .22, 'g'], [.5, .5, 'r'], [.27, .78, 'g'], [.73, .78, 'b']], .15],
    6: [[[.29, .18, 'g'], [.71, .18, 'g'], [.29, .52, 'r'], [.71, .52, 'r'], [.29, .82, 'r'], [.71, .82, 'r']], .14],
    7: [[[.22, .13, 'g'], [.5, .24, 'g'], [.78, .35, 'g'], [.29, .62, 'r'], [.71, .62, 'r'], [.29, .87, 'r'], [.71, .87, 'r']], .12],
    8: [[[.29, .13, 'b'], [.71, .13, 'b'], [.29, .38, 'b'], [.71, .38, 'b'], [.29, .62, 'b'], [.71, .62, 'b'], [.29, .87, 'b'], [.71, .87, 'b']], .12],
    9: [[[.2, .17, 'b'], [.5, .17, 'b'], [.8, .17, 'b'], [.2, .5, 'r'], [.5, .5, 'r'], [.8, .5, 'r'], [.2, .83, 'g'], [.5, .83, 'g'], [.8, .83, 'g']], .12],
  };
  const BAMS = {    // [x, y, colour, len, angle]
    2: [[.5, .27, 'g'], [.5, .73, 'b']], 3: [[.5, .27, 'g'], [.3, .73, 'g'], [.7, .73, 'g']],
    4: [[.3, .27, 'g'], [.7, .27, 'b'], [.3, .73, 'b'], [.7, .73, 'g']], 5: [[.22, .27, 'g'], [.78, .27, 'g'], [.5, .5, 'r'], [.22, .73, 'g'], [.78, .73, 'g']],
    6: [[.2, .27, 'g'], [.5, .27, 'g'], [.8, .27, 'g'], [.2, .73, 'b'], [.5, .73, 'b'], [.8, .73, 'b']],
    7: [[.5, .17, 'r', .9], [.2, .5, 'g', .9], [.5, .5, 'g', .9], [.8, .5, 'g', .9], [.2, .83, 'g', .9], [.5, .83, 'g', .9], [.8, .83, 'g', .9]],
    8: [[.17, .27, 'g'], [.39, .27, 'g', 1, .32], [.61, .27, 'g', 1, -.32], [.83, .27, 'g'], [.17, .73, 'g'], [.39, .73, 'g', 1, -.32], [.61, .73, 'g', 1, .32], [.83, .73, 'g']],
    9: [[.2, .17, 'g', .9], [.5, .17, 'r', .9], [.8, .17, 'g', .9], [.2, .5, 'g', .9], [.5, .5, 'r', .9], [.8, .5, 'g', .9], [.2, .83, 'g', .9], [.5, .83, 'r', .9], [.8, .83, 'g', .9]],
  };
  const COL = { b: C.blue, g: C.green, r: C.red };
  const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const WIND = ['東', '南', '西', '北'], WINDL = ['O', 'Z', 'W', 'N'];

  function glyph(c, ch, x, y, size, col, weight = 700) {
    c.font = `${weight} ${size}px ${CJK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(ch, x, y);
  }
  function index(c, txt, w, h, col, chip) {        // little help index in the top-left corner
    const s = Math.max(7, h * .2);
    c.font = `800 ${s}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (chip) { c.fillStyle = col; c.beginPath(); c.arc(s * .62, s * .62, s * .56, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillText(txt, s * .62, s * .66); return; }
    c.fillStyle = col; c.fillText(txt, s * .5, s * .58);
  }
  function bird(c, w, h) {           // one of bamboo: an original little bird on a bamboo twig
    const u = Math.min(w, h * .8);
    c.save(); c.translate(w / 2, h / 2);
    stick(c, -u * .05, u * .42, u * .95, u * .1, C.green, Math.PI / 2 - .25);
    // tail
    const tail = [[C.blue, .55], [C.green, .25], [C.red, -.05]];
    tail.forEach(([col, a]) => { c.save(); c.rotate(a); c.fillStyle = col; c.beginPath(); c.ellipse(u * .26, u * .12, u * .26, u * .07, .5, 0, 7); c.fill(); c.restore(); });
    // body
    let g = c.createLinearGradient(0, -u * .3, 0, u * .25); g.addColorStop(0, '#3fae6a'); g.addColorStop(1, '#16683c');
    c.fillStyle = g; c.beginPath(); c.ellipse(-u * .04, u * .02, u * .25, u * .19, -.35, 0, 7); c.fill();
    c.fillStyle = '#e8b33a'; c.beginPath(); c.ellipse(-u * .08, u * .08, u * .12, u * .08, -.4, 0, 7); c.fill();
    // wing
    c.fillStyle = C.blue; c.beginPath(); c.ellipse(u * .04, -u * .02, u * .15, u * .08, -.6, 0, 7); c.fill();
    // head + crest + beak + eye
    c.fillStyle = '#2f9a5e'; c.beginPath(); c.arc(-u * .22, -u * .2, u * .12, 0, 7); c.fill();
    c.fillStyle = C.red; c.beginPath(); c.moveTo(-u * .27, -u * .3); c.quadraticCurveTo(-u * .3, -u * .48, -u * .14, -u * .44); c.quadraticCurveTo(-u * .2, -u * .36, -u * .17, -u * .3); c.fill();
    c.fillStyle = '#e8902a'; c.beginPath(); c.moveTo(-u * .33, -u * .22); c.lineTo(-u * .46, -u * .17); c.lineTo(-u * .32, -u * .15); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-u * .24, -u * .22, u * .04, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(-u * .245, -u * .22, u * .022, 0, 7); c.fill();
    c.restore();
  }
  function blossom(c, x, y, r, col, petals = 5, mid = '#f6d15a') {
    c.fillStyle = col;
    for (let k = 0; k < petals; k++) { const a = k * Math.PI * 2 / petals - Math.PI / 2; c.beginPath(); c.arc(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, 0, 7); c.fill(); }
    c.fillStyle = mid; c.beginPath(); c.arc(x, y, r * .3, 0, 7); c.fill();
  }
  function leaf(c, x, y, len, wd, ang, col) { c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * .5, -wd, len, 0); c.quadraticCurveTo(len * .5, wd, 0, 0); c.fill(); c.restore(); }
  function flower(c, k, w, h) {
    const u = Math.min(w, h * .8), cx = w / 2, cy = h / 2 + h * .04;
    c.lineCap = 'round';
    if (k === 0) {        // plum blossom on a branch
      c.strokeStyle = '#6b4226'; c.lineWidth = u * .07; c.beginPath(); c.moveTo(cx - u * .4, cy + u * .45); c.quadraticCurveTo(cx - u * .05, cy + u * .1, cx + u * .1, cy - u * .45); c.stroke();
      c.lineWidth = u * .045; c.beginPath(); c.moveTo(cx - u * .1, cy + u * .15); c.quadraticCurveTo(cx + u * .2, cy + u * .05, cx + u * .38, cy + u * .2); c.stroke();
      blossom(c, cx + u * .1, cy - u * .3, u * .2, '#ec6f96'); blossom(c, cx - u * .2, cy + u * .05, u * .17, '#f28fae'); blossom(c, cx + u * .3, cy + u * .18, u * .15, '#ec6f96');
    } else if (k === 1) { // orchid
      leaf(c, cx - u * .05, cy + u * .48, u * .7, u * .07, -2.1, '#2f8a4a'); leaf(c, cx + u * .02, cy + u * .48, u * .62, u * .07, -1.1, '#3d9c56'); leaf(c, cx, cy + u * .48, u * .5, u * .06, -1.6, '#2a7a40');
      c.fillStyle = '#9b4fc2'; for (const a of [-1.9, -.6, .7, 1.9, 3.14]) { c.save(); c.translate(cx, cy - u * .12); c.rotate(a); c.beginPath(); c.ellipse(0, -u * .16, u * .09, u * .17, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = '#f2d14b'; c.beginPath(); c.arc(cx, cy - u * .12, u * .07, 0, 7); c.fill(); c.fillStyle = '#c23b6e'; c.beginPath(); c.arc(cx, cy - u * .06, u * .05, 0, 7); c.fill();
    } else if (k === 2) { // chrysanthemum
      c.strokeStyle = '#3d8a46'; c.lineWidth = u * .05; c.beginPath(); c.moveTo(cx, cy + u * .5); c.lineTo(cx, cy); c.stroke();
      leaf(c, cx, cy + u * .32, u * .3, u * .09, -.5, '#3d8a46'); leaf(c, cx, cy + u * .38, u * .3, u * .09, -2.6, '#3d8a46');
      for (let k2 = 0; k2 < 16; k2++) { c.save(); c.translate(cx, cy - u * .12); c.rotate(k2 * Math.PI / 8); c.fillStyle = k2 % 2 ? '#f0a020' : '#f7c23a'; c.beginPath(); c.ellipse(0, -u * .2, u * .055, u * .14, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = '#c86a10'; c.beginPath(); c.arc(cx, cy - u * .12, u * .09, 0, 7); c.fill();
    } else {              // peony
      leaf(c, cx - u * .05, cy + u * .25, u * .36, u * .1, 2.5, '#2f7d44'); leaf(c, cx + u * .05, cy + u * .25, u * .36, u * .1, .6, '#2f7d44');
      const py = cy - u * .06;
      for (const [r, col] of [[.3, '#b81f3c'], [.22, '#d9364f'], [.14, '#ef5a6c']]) for (let k2 = 0; k2 < 7; k2++) { const a = k2 * Math.PI * 2 / 7 + r * 9; c.fillStyle = col; c.beginPath(); c.arc(cx + Math.cos(a) * u * r * .55, py + Math.sin(a) * u * r * .55, u * r * .55, 0, 7); c.fill(); }
      c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(cx, py, u * .06, 0, 7); c.fill();
    }
  }
  function season(c, k, w, h) {
    const u = Math.min(w, h * .8), cx = w / 2, cy = h / 2 + h * .04;
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (k === 0) {        // spring: a tulip
      c.strokeStyle = '#3c8a3e'; c.lineWidth = u * .06; c.beginPath(); c.moveTo(cx, cy + u * .5); c.quadraticCurveTo(cx + u * .04, cy + u * .1, cx, cy - u * .05); c.stroke();
      leaf(c, cx, cy + u * .45, u * .5, u * .12, -1.15, '#4a9c45'); leaf(c, cx, cy + u * .48, u * .42, u * .1, -2.0, '#3c8a3e');
      const g = c.createLinearGradient(cx - u * .2, 0, cx + u * .2, 0); g.addColorStop(0, '#c4162b'); g.addColorStop(.5, '#f04a4a'); g.addColorStop(1, '#b3122a');
      c.fillStyle = g; c.beginPath(); c.moveTo(cx - u * .2, cy - u * .35); c.lineTo(cx - u * .1, cy - u * .2); c.lineTo(cx, cy - u * .38); c.lineTo(cx + u * .1, cy - u * .2); c.lineTo(cx + u * .2, cy - u * .35);
      c.quadraticCurveTo(cx + u * .24, cy, cx, cy); c.quadraticCurveTo(cx - u * .24, cy, cx - u * .2, cy - u * .35); c.fill();
    } else if (k === 1) { // summer: the sun
      c.strokeStyle = '#f08a1c'; c.lineWidth = u * .055;
      for (let k2 = 0; k2 < 12; k2++) { const a = k2 * Math.PI / 6; c.beginPath(); c.moveTo(cx + Math.cos(a) * u * .27, cy + Math.sin(a) * u * .27); c.lineTo(cx + Math.cos(a) * u * (k2 % 2 ? .37 : .43), cy + Math.sin(a) * u * (k2 % 2 ? .37 : .43)); c.stroke(); }
      const g = c.createRadialGradient(cx - u * .06, cy - u * .06, u * .02, cx, cy, u * .23); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#f39a1e');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, u * .22, 0, 7); c.fill();
    } else if (k === 2) { // autumn: a maple leaf
      c.save(); c.translate(cx, cy); const s = u * .46;
      const pts = [[0, -1], [.18, -.55], [.42, -.68], [.36, -.3], [.78, -.38], [.62, -.08], [.86, .1], [.4, .22], [.46, .44], [.08, .32], [0, .5], [-.08, .32], [-.46, .44], [-.4, .22], [-.86, .1], [-.62, -.08], [-.78, -.38], [-.36, -.3], [-.42, -.68], [-.18, -.55]];
      const g = c.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#f3a03a'); g.addColorStop(1, '#c8401e');
      c.fillStyle = g; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)); c.closePath(); c.fill();
      c.strokeStyle = '#8a2a12'; c.lineWidth = u * .03; c.beginPath(); c.moveTo(0, s * .9); c.lineTo(0, -s * .6); c.moveTo(0, s * .1); c.lineTo(s * .5, -s * .2); c.moveTo(0, s * .1); c.lineTo(-s * .5, -s * .2); c.stroke();
      c.restore();
    } else {              // winter: a snowflake
      c.save(); c.translate(cx, cy); c.strokeStyle = '#2f78c8'; c.lineWidth = u * .055; const s = u * .4;
      for (let k2 = 0; k2 < 6; k2++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s); c.moveTo(0, -s * .55); c.lineTo(s * .22, -s * .75); c.moveTo(0, -s * .55); c.lineTo(-s * .22, -s * .75); c.moveTo(0, -s * .25); c.lineTo(s * .16, -s * .38); c.moveTo(0, -s * .25); c.lineTo(-s * .16, -s * .38); c.stroke(); }
      c.fillStyle = '#7fb6ee'; c.beginPath(); c.arc(0, 0, u * .06, 0, 7); c.fill(); c.restore();
    }
  }
  // the picture of face f in a box of w × h (canvas units), origin top-left
  function drawFace(c, f, w, h, idx) {
    c.save();
    const s = SUIT(f), n = f % 9 + 1;
    if (idx && (s === 'dots' || s === 'bam') && n > 1) {     // keep the corner index clear of the picture
      if (idx) index(c, n, w, h, s === 'dots' ? C.blue : C.green);
      const k = .14; c.translate(w * .04, h * k); w *= .96; h *= 1 - k; idx = false;
    }
    if (s === 'dots') {
      if (n === 1) {
        const r = Math.min(w, h) * .4, x = w / 2, y = h / 2;
        c.fillStyle = C.green; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(x, y, r * .82, 0, 7); c.fill();
        c.strokeStyle = C.blue; c.lineWidth = r * .1; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55); c.lineTo(x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72); c.stroke(); }
        dot(c, x, y, r * .5, C.red);
      } else { const [list, rf] = DOTS[n], R = Math.min(w, h * .78) * rf; for (const [x, y, k] of list) dot(c, x * w, y * h, R, COL[k]); }
      if (idx) index(c, n, w, h, C.blue);
    } else if (s === 'bam') {
      if (n === 1) bird(c, w, h);
      else for (const [x, y, k, lf = 1, ang = 0] of BAMS[n]) stick(c, x * w, y * h, h * (n >= 7 ? .27 : .38) * lf, Math.max(1.6, w * (n >= 6 ? .13 : .15)), COL[k], ang);
      if (idx) index(c, n, w, h, C.green);
    } else if (s === 'char') {
      glyph(c, NUM[n - 1], w / 2, h * .29, h * .36, C.ink, 900);
      glyph(c, '萬', w / 2, h * .7, h * .41, C.red, 700);
      if (idx) index(c, n, w, h, C.red);
    } else if (s === 'wind') {
      glyph(c, WIND[f - 27], w / 2, h * .52, h * .58, C.navy, 900);
      if (idx) index(c, WINDL[f - 27], w, h, C.navy);
    } else if (s === 'drag') {
      if (f === 31) glyph(c, '中', w / 2, h * .52, h * .62, C.red, 900);
      else if (f === 32) glyph(c, '發', w / 2, h * .53, h * .58, C.green, 900);
      else {
        const m = w * .14, lw = Math.max(1.2, w * .07);
        c.strokeStyle = C.blue; c.lineWidth = lw; rr(c, m, m * 1.1, w - m * 2, h - m * 2.2, w * .08); c.stroke();
        c.lineWidth = lw * .5; rr(c, m + lw * 1.6, m * 1.1 + lw * 1.6, w - m * 2 - lw * 3.2, h - m * 2.2 - lw * 3.2, w * .05); c.stroke();
        c.fillStyle = C.blue; for (const [x, y] of [[m, m * 1.1], [w - m, m * 1.1], [m, h - m * 1.1], [w - m, h - m * 1.1]]) { c.beginPath(); c.arc(x, y, lw * 1.1, 0, 7); c.fill(); }
      }
    } else if (s === 'flower') { flower(c, f - 34, w, h); if (idx) index(c, f - 33, w, h, C.red, true); }
    else { season(c, f - 38, w, h); if (idx) index(c, f - 37, w, h, C.blue, true); }
    c.restore();
  }

  /* sprite of a whole tile: soft shadow, two-tone thickness (coloured back + ivory) on the left and bottom, ivory face
     geometry (CSS px): face W × H, thickness t; sprite = W + t + 2p wide, face at (p + t, p) */
  // sprite sets per tile size; SP is the set the board is drawn with (scaled a little while a new size is still being made)
  const SETS = new Map(); let SP = { W: 0, map: new Map() };
  function spriteGeom(W, dpr) { const H = W * 4 / 3, t = W * .14, p = Math.ceil(W * .2); return { W, H, t, p, dpr }; }
  function makeSprite(f, g, table, mode) {
    const { W, H, t, p, dpr } = g, T = TABLES[table] || TABLES.groen;
    const cv = document.createElement('canvas'); cv.width = Math.ceil((W + t + p * 2) * dpr); cv.height = Math.ceil((H + t + p * 2) * dpr);
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const r = W * .13, fx = p + t, fy = p;
    // shadow of the whole block (light from the top right)
    c.save(); c.shadowColor = 'rgba(0,0,0,.42)'; c.shadowBlur = W * .16 * dpr; c.shadowOffsetX = -t * .7 * dpr; c.shadowOffsetY = t * .9 * dpr;
    c.fillStyle = T.back[1]; rr(c, p, p + t * .3, W + t * .7, H + t * .7, r); c.fill(); c.restore();
    // thickness: stacked slices, back colour below, ivory above
    const steps = Math.max(4, Math.ceil(t * dpr * 1.5));
    for (let k = 0; k <= steps; k++) {
      const q = k / steps, x = p + t * q, y = p + t * (1 - q);
      c.fillStyle = q < .42 ? (q < .1 ? T.edge : T.back[1]) : q < .5 ? T.back[0] : (q < .62 ? '#d9cba8' : '#e8dcbf');
      rr(c, x, y, W, H, r); c.fill();
    }
    // the face
    const g1 = c.createLinearGradient(fx + W, fy, fx, fy + H); g1.addColorStop(0, '#fffdf7'); g1.addColorStop(.55, '#f8f1e1'); g1.addColorStop(1, '#ece0c4');
    c.fillStyle = g1; rr(c, fx, fy, W, H, r); c.fill();
    const g2 = c.createLinearGradient(fx + W, fy, fx, fy + H); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(.5, 'rgba(255,255,255,.1)'); g2.addColorStop(1, 'rgba(120,90,40,.35)');
    c.strokeStyle = g2; c.lineWidth = Math.max(.8, W * .035); rr(c, fx + c.lineWidth / 2, fy + c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth, r * .9); c.stroke();
    // picture, inset
    const m = W * .1;
    c.save(); c.translate(fx + m, fy + m * 1.05); drawFace(c, f, W - m * 2, H - m * 2.1, g.idx); c.restore();
    if (mode === 'dim') {
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(48,36,20,.3)'; c.fillRect(0, 0, cv.width, cv.height); c.globalCompositeOperation = 'source-over';
    }
    return cv;
  }
  function spriteSet(W, dpr, table, idx) {
    const key = `${W.toFixed(2)}|${dpr}|${table}|${idx}`;
    let st = SETS.get(key);
    if (!st) {
      st = Object.assign(spriteGeom(W, dpr), { key, table, idx, map: new Map() }); SETS.set(key, st);
      for (const k of [...SETS.keys()]) { if (SETS.size <= 3) break; if (k !== key && SETS.get(k) !== SP) SETS.delete(k); }
    }
    return st;
  }
  function sprite(f, mode, set = SP) {
    const k = f * 2 + (mode === 'dim' ? 1 : 0);
    let s = set.map.get(k); if (!s) { s = makeSprite(f, set, set.table, mode); set.map.set(k, s); }
    return s;
  }

  /* ================= settings, stats ================= */
  const D = { lay: 'schildpad', hl: true, idx: true, table: 'groen', sound: true };
  const opt = Object.assign({}, D, store.get('mj.settings', {}));
  if (!TABLES[opt.table]) opt.table = 'groen';
  const saveOpt = () => store.set('mj.settings', opt);
  Sfx.gate('mj', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  let stats = Object.assign({ played: 0, won: 0, noHelp: 0, best: {}, L: {}, daily: {}, dailyWon: 0, dailyBest: null }, store.get('mj.stats', {}));
  const saveStats = () => store.set('mj.stats', stats);
  const LS = id => stats.L[id] || (stats.L[id] = { p: 0, w: 0 });
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DAILY_LAYS = ['schildpad', 'draak', 'vlinder', 'burcht', 'bloem', 'piramide'];
  const dailyLay = d => DAILY_LAYS[Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5) % DAILY_LAYS.length];

  /* ================= state ================= */
  let S = null, G = null, free = [], pairs = [], left = 0, sel = -1, hintP = null, paused = false, timer = 0, lastSec = -1, saveT = 0;
  const bad = new Map();                                     // tile -> time until it flashes red
  const scr = $('#mj'), stage = $('#mjStage'), cv = $('#mjCv'), fxc = $('#mjFx'), ctx = cv.getContext('2d'), fctx = fxc.getContext('2d');
  const T = .14, HR = 4 / 3;                                 // thickness / layer shift (× W), face height (× W)
  let FL = [], FT = [], KW = 1, KH = 1;
  function setupGeo() {
    G = geo(S.lay);
    let mz = 0; for (const p of G.pos) mz = Math.max(mz, p[2]);
    FL = G.pos.map(([x, , z]) => x / 2 + (z + 1) * T); FT = G.pos.map(([, y, z]) => y * HR / 2 - z * T + mz * T);
    KW = Math.max(...FL) + 1 + .1; KH = Math.max(...FT) + HR + T + .1;
  }
  // recompute free tiles and pairs; partial: only redraw the given tiles and those whose free state changed
  function refresh(partial, extra = []) {
    const alive = S.faces.map(f => f >= 0), was = free; left = alive.filter(Boolean).length;
    free = alive.map((a, i) => a && isFree(G, alive, i));
    pairs = movePairs(G, S.faces);
    const os = sel; if (sel >= 0 && !free[sel]) sel = -1;
    if (hintP && !(free[hintP[0]] && free[hintP[1]])) hintP = null;
    hud(true);
    if (partial && was.length === free.length) { const d = extra.concat([os, sel]); for (let i = 0; i < G.n; i++) if (was[i] !== free[i]) d.push(i); markTiles(d); }
    else requestDraw();
  }
  function hud(force) {
    if (!S) return;
    const s = Math.floor(S.time); if (force || s !== lastSec) { lastSec = s; $('#mjTime').textContent = fmt(S.time); }
    if (force) { $('#mjLeft').textContent = left; $('#mjPairs').textContent = pairs.length; $('#mjPairsW').classList.toggle('none', !pairs.length && left > 0); $('#mjLay').textContent = S.daily ? 'Dagpuzzel' : LAY(S.lay).name; }
  }

  /* ================= view: fit, zoom, pan ================= */
  const V = { W: 30, s: 1, fitW: 30, ox: 0, oy: 0, cw: 1, ch: 1, dpr: 1, fd: 1, gest: false };
  function fit(keep) {
    if (current !== 'mj' || !S) return;
    scr.classList.toggle('land', innerWidth > innerHeight * 1.1);
    const r = stage.getBoundingClientRect(); if (r.width < 10) return;
    V.cw = r.width; V.ch = r.height; V.dpr = Math.min(3, devicePixelRatio || 1);
    V.fd = Math.min(V.dpr, +(window.__mjFxRes || 1.75));     // the short-lived effects layer needs less resolution than the tiles
    cv.width = Math.round(V.cw * V.dpr); cv.height = Math.round(V.ch * V.dpr); fxc.width = Math.round(V.cw * V.fd); fxc.height = Math.round(V.ch * V.fd);
    fxPrev = [];
    const big = document.documentElement.classList.contains('big-text');
    V.fitW = Math.max(big ? 30 : 23, Math.min((V.cw - 14) / KW, (V.ch - 14) / KH, 88));
    if (!keep) V.s = 1;
    V.W = V.fitW * V.s; clampView(true); requestDraw();
  }
  const bw = () => KW * V.W, bh = () => KH * V.W;
  function clampView(center) {
    const w = bw(), h = bh();
    if (w <= V.cw) V.ox = (V.cw - w) / 2 + V.W * .05; else V.ox = center ? (V.cw - w) / 2 : Math.max(V.cw - w - 6, Math.min(6, V.ox));
    if (h <= V.ch) V.oy = (V.ch - h) / 2; else V.oy = center ? (V.ch - h) / 2 : Math.max(V.ch - h - 6, Math.min(6, V.oy));
  }
  // zooming: the drawn board is moved with a GPU transform first (smooth even on slow phones), then redrawn sharp
  let zoomT = 0;
  function zoomTo(s, cx, cy, anim = true) {
    s = Math.max(1, Math.min(3, s, 110 / V.fitW));
    const bx = (cx - V.ox) / V.W, by = (cy - V.oy) / V.W;
    V.s = s; V.W = V.fitW * s; V.ox = cx - bx * V.W; V.oy = cy - by * V.W; clampView(false);
    $('#mjZoomBtn small').textContent = s > 1.05 ? 'Uitzoomen' : 'Inzoomen';
    if (!anim || !R) { requestDraw(); return; }
    clearTimeout(zoomT); cv.style.transition = 'transform .2s cubic-bezier(.2,.8,.3,1)'; cssView(); kick();
    zoomT = setTimeout(() => { cv.style.transition = ''; requestDraw(); }, 210);
  }
  const faceRect = i => [V.ox + FL[i] * V.W, V.oy + FT[i] * V.W, V.W, V.W * HR];
  function hit(x, y) {                                       // topmost tile under a stage point
    const W = V.W, t = W * T, H = W * HR;
    for (let i = G.n - 1; i >= 0; i--) {
      if (S.faces[i] < 0) continue;
      const fx = V.ox + FL[i] * W, fy = V.oy + FT[i] * W;
      if ((x >= fx && x <= fx + W && y >= fy && y <= fy + H) || (x >= fx - t && x <= fx - t + W && y >= fy + t && y <= fy + t + H)) return i;
    }
    return -1;
  }

  /* ================= drawing =================
     The tiles live on one canvas that is only redrawn when something changes: completely after a new deal, a shuffle
     or a zoom, and otherwise only around the tiles that changed (a tap redraws one or two small rectangles). */
  let drawRaf = 0, lastFull = 0, tapAt = 0, tapEv = 0, tapLat = [], drawMs = 0, full = true, R = null;
  const dirty = new Set();
  function requestDraw() { full = true; schedule(); }
  function markTiles(list) { for (const i of list) if (i >= 0) dirty.add(i); schedule(); }
  function schedule() { if (!drawRaf) drawRaf = requestAnimationFrame(() => { drawRaf = 0; drawTiles(); kick(); }); }
  function cssView() {                                       // show the last drawing moved/scaled to the current view
    if (!R) return; const k = V.W / R.W;
    cv.style.transform = `translate(${V.ox - R.ox * k}px,${V.oy - R.oy * k}px) scale(${k})`;
  }
  function viewChanged() {                                   // during pan / pinch: redraw when the phone keeps up, else move the picture
    if (drawMs < 9 || performance.now() - lastFull > 160) requestDraw(); else { cssView(); kick(); }
  }
  function spriteBox(i, lift) {                              // where tile i's sprite goes, device px
    const k = V.W / SP.W, dpr = V.dpr, fx = V.ox + FL[i] * V.W, fy = V.oy + FT[i] * V.W + lift;
    return [(fx - (SP.p + SP.t) * k) * dpr, (fy - SP.p * k) * dpr, (V.W + SP.t * 2 + SP.p * 2) * k * dpr, (V.W * HR + SP.t * 2 + SP.p * 2) * k * dpr, fx, fy];
  }
  function drawTile(c, i, now) {
    const f = S.faces[i], W = V.W, H = W * HR, dpr = V.dpr, k = V.W / SP.W;
    const img = sprite(f, opt.hl && !free[i] ? 'dim' : 'n'), [dx, dy, , , fx, fy] = spriteBox(i, i === sel ? -W * .07 : 0);
    if (k === 1) c.drawImage(img, Math.round(dx), Math.round(dy)); else c.drawImage(img, dx, dy, img.width * k, img.height * k);
    const bt = bad.get(i);
    if (i === sel || (bt && bt > now)) {
      c.save(); c.scale(dpr, dpr); rr(c, fx, fy, W, H, W * .13);
      c.fillStyle = i === sel ? 'rgba(255,200,40,.3)' : 'rgba(230,40,40,.3)'; c.fill();
      c.lineWidth = Math.max(2, W * .07); c.strokeStyle = i === sel ? '#ffc928' : '#e8473a'; c.stroke(); c.restore();
    }
  }
  let buildT = 0;
  function useSprites() {                                    // switch to sprites of the current size; build them in slices if that takes long
    const T = spriteSet(V.W, V.dpr, opt.table, opt.idx); if (T === SP) return;
    const need = []; for (let i = 0; i < G.n; i++) if (S.faces[i] >= 0) { const k = S.faces[i] * 2 + (opt.hl && !free[i] ? 1 : 0); if (!T.map.has(k) && !need.includes(k)) need.push(k); }
    if (!need.length || !SP.W || SP.table !== T.table || SP.idx !== T.idx || SP.dpr !== T.dpr) { SP = T; return; }
    clearTimeout(buildT);
    const step = () => {
      if (spriteSet(V.W, V.dpr, opt.table, opt.idx) !== T) return;
      const t0 = performance.now();
      while (need.length && performance.now() - t0 < 6) { const k = need.pop(); if (!T.map.has(k)) T.map.set(k, makeSprite(k >> 1, T, T.table, k & 1 ? 'dim' : 'n')); }
      if (need.length) buildT = setTimeout(step, 0); else requestDraw();
    };
    buildT = setTimeout(step, 0);
  }
  function drawTiles() {
    const t0 = performance.now(), c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    if (!S) { c.clearRect(0, 0, cv.width, cv.height); return; }
    const same = R && R.W === V.W && R.ox === V.ox && R.oy === V.oy;
    if (full || !same) {
      if (!V.gest || !SP.W) useSprites();
      c.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < G.n; i++) if (S.faces[i] >= 0) { const [bx, by, bw2, bh2] = spriteBox(i, 0); if (bx < cv.width && by < cv.height && bx + bw2 > 0 && by + bh2 > -V.W * V.dpr) drawTile(c, i, t0); }
      R = { W: V.W, ox: V.ox, oy: V.oy }; cv.style.transform = ''; lastFull = performance.now();
    } else if (dirty.size) {
      const boxes = [...dirty].map(i => spriteBox(i, -V.W * .08)).map(([x, y, w, h]) => [Math.floor(x) - 1, Math.floor(y) - 1, Math.ceil(w + V.W * .08 * V.dpr) + 2, Math.ceil(h + V.W * .08 * V.dpr) + 2]);
      for (const [x, y, w, h] of boxes) {
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.clearRect(x, y, w, h);
        for (let i = 0; i < G.n; i++) {
          if (S.faces[i] < 0) continue;
          const [bx, by, bw2, bh2] = spriteBox(i, i === sel ? -V.W * .07 : 0);
          if (bx < x + w && bx + bw2 > x && by < y + h && by + bh2 > y) drawTile(c, i, t0);
        }
        c.restore();
      }
    }
    full = false; dirty.clear();
    const t1 = performance.now(); drawMs = t1 - t0;
    if (tapAt) { tapLat.push(t1 - tapAt); if (tapLat.length > 60) tapLat.shift(); tapAt = 0; }
  }

  /* ---------- effects layer: flying pairs, sparkles, hint glow, petals ----------
     Only the rectangles drawn in the previous frame are cleared (a full-screen clear every frame is too slow on older phones). */
  const anims = []; let fxRaf = 0, frames = [], fxPrev = [], fxNow = [];
  const fxMark = (x, y, w, h) => fxNow.push([x, y, w, h]);
  function kick() { if (!fxRaf) fxRaf = requestAnimationFrame(fxFrame); }
  function fxFrame(now) {
    fxRaf = 0; frames.push(now); if (frames.length > 600) frames.splice(0, 300);
    const c = fctx, d = V.fd; c.setTransform(1, 0, 0, 1, 0, 0);
    for (const [x, y, w, h] of fxPrev) c.clearRect(Math.floor(x * d) - 2, Math.floor(y * d) - 2, Math.ceil(w * d) + 4, Math.ceil(h * d) + 4);
    c.setTransform(d, 0, 0, d, 0, 0); fxNow = [];
    let ended = false;
    for (let k = anims.length - 1; k >= 0; k--) if (anims[k](c, now) === false) { anims.splice(k, 1); ended = true; }
    fxPrev = fxNow;
    if (anims.length || ended) kick();                    // one more frame after the last one ends: clear what it drew
  }
  const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  function drawSprite(c, f, x, y, sc = 1, a = 1, rot = 0) {      // x, y: face centre (CSS px)
    if (!(f >= 0) || a <= 0) return;
    const img = sprite(f, 'n'), k = V.W / SP.W, w = img.width / V.dpr * k * sc, h = img.height / V.dpr * k * sc;
    const ox = (SP.p + SP.t + V.W / k / 2) * k * sc, oy = (SP.p + V.W * HR / k / 2) * k * sc;
    c.save(); c.globalAlpha = a; c.translate(x, y); if (rot) c.rotate(rot); c.drawImage(img, -ox, -oy, w, h); c.restore();
    const m = Math.max(w, h) * .25; fxMark(x - ox - m, y - oy - m, w + m * 2, h + m * 2);
  }
  function star(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); fxMark(x - r, y - r, r * 2, r * 2); }
  const GLOW = new Map();
  function glow(col) {                                       // a soft glowing frame around one tile face, drawn once per size
    const key = col + '|' + V.W.toFixed(1) + '|' + V.dpr; let g = GLOW.get(key);
    if (!g) {
      if (GLOW.size > 8) GLOW.clear();
      const W = V.W, H = W * HR, m = W * .45, d = V.dpr; g = document.createElement('canvas'); g.width = Math.ceil((W + m * 2) * d); g.height = Math.ceil((H + m * 2) * d);
      const c = g.getContext('2d'); c.scale(d, d); c.shadowColor = `rgb(${col})`; c.shadowBlur = W * .45 * d; c.lineWidth = Math.max(2.5, W * .09); c.strokeStyle = `rgba(${col},.95)`;
      rr(c, m - 1, m - 1, W + 2, H + 2, W * .14); c.stroke(); c.shadowBlur = 0; c.fillStyle = `rgba(${col},.16)`; c.fill();
      g.m = m; GLOW.set(key, g);
    }
    return g;
  }
  function drawGlow(c, i, col, a) {
    const g = glow(col), [x, y, w, h] = faceRect(i);
    c.globalAlpha = Math.max(0, Math.min(1, a)); c.drawImage(g, x - g.m, y - g.m, w + g.m * 2, h + g.m * 2); c.globalAlpha = 1;
    fxMark(x - g.m, y - g.m, w + g.m * 2, h + g.m * 2);
  }
  function matchAnim(a, b, fa, fb) {
    const t0 = performance.now(), d = 430, A = faceRect(a), B = faceRect(b);
    const ca = [A[0] + A[2] / 2, A[1] + A[3] / 2], cb = [B[0] + B[2] / 2, B[1] + B[3] / 2];
    const dist = Math.hypot(ca[0] - cb[0], ca[1] - cb[1]), mid = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2 - V.W * .6];
    const pull = Math.min(.42, V.W * 1.6 / Math.max(1, dist));            // fly towards each other, but not all the way across the board
    const sparks = Array.from({ length: 14 }, (_, k) => ({ a: k / 14 * Math.PI * 2 + Math.random() * .4, v: .6 + Math.random() * .8, r: .08 + Math.random() * .08, from: Math.random() < .5 ? 0 : 1 }));
    anims.push((c, now) => {
      const p = Math.min(1, (now - t0) / d), e = ease(p), lift = Math.sin(Math.min(1, p * 1.4) * Math.PI / 2) * V.W * .55;
      const alpha = p < .55 ? 1 : 1 - (p - .55) / .45, sc = 1 + .16 * Math.sin(p * Math.PI);
      [[ca, cb, fa, -1], [cb, ca, fb, 1]].forEach(([p0, p1, f, sg]) => drawSprite(c, f, p0[0] + (p1[0] - p0[0]) * pull * e, p0[1] + (p1[1] - p0[1]) * pull * e - lift, sc, alpha, sg * .12 * e));
      if (p > .35) {
        const q = (p - .35) / .65;
        for (const s of sparks) { const o = s.from ? cb : ca, x = o[0] + (mid[0] - o[0]) * pull + Math.cos(s.a) * s.v * V.W * 1.3 * q, y = o[1] - lift + Math.sin(s.a) * s.v * V.W * 1.3 * q; star(c, x, y, V.W * s.r * (1 - q * .5), `rgba(255,${210 + Math.floor(40 * s.v)},120,${(1 - q) * .95})`); }
      }
      return p < 1;
    });
    kick();
  }
  function hintAnim() {
    const t0 = performance.now(), d = 3600, p0 = hintP;
    anims.push((c, now) => {
      if (hintP !== p0 || !S) return false;
      const p = (now - t0) / d; if (p >= 1) { hintP = null; return false; }
      const a = (.55 + .45 * Math.sin((now - t0) / 1000 * Math.PI * 2.4)) * (p > .85 ? (1 - p) / .15 : 1);
      for (const i of p0) drawGlow(c, i, '120,255,170', a);
    });
    kick();
  }
  function flashAnim(list, col = '255,214,90') {
    const t0 = performance.now();
    anims.push((c, now) => { const p = (now - t0) / 650; if (p >= 1) return false; for (const i of list) if (S.faces[i] >= 0) drawGlow(c, i, col, 1 - p); });
    kick();
  }
  function dealAnim() { cv.classList.remove('deal', 'shuf'); void cv.offsetWidth; cv.classList.add('deal'); }
  function petals() {
    const t0 = performance.now(), cols = ['#ffb7c9', '#ffd1dc', '#fff3f6', '#f28fae', '#ffe28a'];
    const P = Array.from({ length: 70 }, () => ({ x: Math.random() * V.cw, y: -20 - Math.random() * V.ch * .6, vy: 40 + Math.random() * 70, vx: -15 + Math.random() * 30, r: 4 + Math.random() * 6, a: Math.random() * 6, va: -2 + Math.random() * 4, ph: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
    anims.push((c, now) => {
      const t = (now - t0) / 1000; if (t > 4.2) return false;
      c.globalAlpha = t > 3.4 ? (4.2 - t) / .8 : 1;
      for (const q of P) {
        const x = q.x + q.vx * t + Math.sin(t * 1.6 + q.ph) * 18, y = q.y + q.vy * t; if (y < -12 || y > V.ch + 12) continue;
        const a = q.a + q.va * t, sy = .55 + .45 * Math.sin(t * 3 + q.ph), ca = Math.cos(a), sa = Math.sin(a);
        c.setTransform(ca * V.fd, sa * V.fd, -sa * sy * V.fd, ca * sy * V.fd, x * V.fd, y * V.fd); c.fillStyle = q.c;
        c.beginPath(); c.ellipse(0, 0, q.r, q.r * .62, 0, 0, 7); c.fill(); fxMark(x - q.r - 1, y - q.r - 1, q.r * 2 + 2, q.r * 2 + 2);
      }
      c.setTransform(V.fd, 0, 0, V.fd, 0, 0); c.globalAlpha = 1;
    });
    kick();
  }

  /* ================= game ================= */
  function newGame(lay, daily) {
    closeModals(); setPause(false);
    lay = LAY(lay).id;
    let seed = daily ? hashStr('mahjong-' + daily) : (Math.random() * 4294967296) >>> 0, d = null;
    for (let k = 0; k < 20 && !d; k++) d = deal(lay, seed + k * 7919);
    S = { lay, daily: daily || null, seed, faces: d.faces, sol: d.sol, time: 0, hints: 0, shuffles: 0, undo: [], over: false };
    stats.played++; LS(lay).p++; saveStats(); saveNow();
    sel = -1; hintP = null; bad.clear(); anims.length = 0;
    setupGeo(); fit(); refresh(); dealAnim(); sfx('mjShuffle');
    if (V.fitW < 30 && !opt.zoomTip) { opt.zoomTip = 1; saveOpt(); setTimeout(() => toast('Tip: dubbeltik op de tafel of knijp met twee vingers om in te zoomen. Met één vinger schuif je het bord.', 4500), 900); }
  }
  let saveTm = 0;
  const saveNow = () => { clearTimeout(saveTm); saveTm = 0; if (S && !S.over) store.set('mj.save', Object.assign({}, S, { undo: S.undo.map(u => Object.assign({}, u, { sol: undefined })) })); };
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 350); };     // after the animation, not during the tap
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'mj') saveNow(); });
  function updateSol(sol, a, b) {                  // keep the known solution when the player's move fits in it
    if (!sol) return null;
    const i = sol.findIndex(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    let ns;
    if (i >= 0) ns = sol.filter((_, k) => k !== i);
    else {
      const ia = sol.findIndex(p => p[0] === a || p[1] === a), ib = sol.findIndex(p => p[0] === b || p[1] === b);
      if (ia < 0 || ib < 0) return null;
      ns = sol.slice(); ns[Math.max(ia, ib)] = [sol[ia][0] === a ? sol[ia][1] : sol[ia][0], sol[ib][0] === b ? sol[ib][1] : sol[ib][0]]; ns.splice(Math.min(ia, ib), 1);
    }
    return checkSol(G, S.faces, ns) ? ns : null;
  }
  function tapTile(i) {
    if (!S || S.over || paused || i < 0 || S.faces[i] < 0) return;
    tapAt = tapEv || performance.now(); tapEv = 0;
    if (!free[i]) { bad.set(i, performance.now() + 380); sfx('mjBlock'); vibrate(12); markTiles([i]); setTimeout(() => markTiles([i]), 400); return; }
    if (sel < 0) { sel = i; sfx('mjSel'); markTiles([i]); return; }
    if (sel === i) { sel = -1; sfx('mjDesel'); markTiles([i]); return; }
    if (groupOf(S.faces[sel]) === groupOf(S.faces[i])) { match(sel, i); return; }
    const o = sel; bad.set(o, performance.now() + 380); setTimeout(() => markTiles([o]), 400);
    sel = i; sfx('mjNo'); markTiles([o, i]);
  }
  function match(a, b) {
    const fa = S.faces[a], fb = S.faces[b];
    S.undo.push({ k: 'm', a, b, fa, fb, sol: S.sol });
    S.faces[a] = S.faces[b] = -1; sel = -1;
    S.sol = updateSol(S.sol, a, b);
    sfx('mjMatch'); matchAnim(a, b, fa, fb); refresh(true, [a, b]);
    if (!left) return win();
    save();
    if (!pairs.length) setTimeout(() => { if (S && !S.over && !pairs.length && current === 'mj') openStuck(); }, 650);
  }
  function openStuck() { markTiles([sel]); sel = -1; sfx('mjNo'); openModal('mjStuckModal'); }
  function doUndo() {
    if (!S || S.over) return;
    const u = S.undo.pop(); if (!u) { toast('Er is nog niets om terug te zetten'); return; }
    if (u.k === 'm') { S.faces[u.a] = u.fa; S.faces[u.b] = u.fb; } else S.faces = u.faces;
    S.sol = u.sol || null; const os = sel; sel = -1; hintP = null;
    sfx('mjUndo'); if (u.k === 'm') refresh(true, [u.a, u.b, os]); else refresh(); save();
    flashAnim(u.k === 'm' ? [u.a, u.b] : []);
  }
  function hint() {
    if (!S || S.over) return;
    if (!S.sol || !checkSol(G, S.faces, S.sol)) S.sol = solve(G, S.faces, 25000);
    let p = S.sol ? (S.sol.find(([a, b]) => free[a] && free[b]) || null) : null;
    if (!p) p = pairs[0] || null;
    if (!p) { openStuck(); return; }
    S.hints++; hintP = p; markTiles([sel]); sel = -1; sfx('mjHint'); hintAnim(); save();
    if (!S.sol) toast('Deze zet kan, maar het spel is misschien niet meer helemaal op te lossen. Zet anders een paar zetten terug.', 3600);
  }
  function doShuffle() {
    if (!S || S.over || !left) return;
    const res = reshuffle(S.lay, S.faces, rng((Math.random() * 4294967296) >>> 0)); if (!res) { toast('Schudden lukte niet'); return; }
    S.undo.push({ k: 's', faces: S.faces.slice(), sol: S.sol });
    S.faces = res.faces; S.sol = res.sol; S.shuffles++; sel = -1; hintP = null;
    closeModals(); sfx('mjShuffle'); refresh(); save();
    cv.classList.remove('shuf'); void cv.offsetWidth; cv.classList.add('shuf');
  }
  function win() {
    S.over = true; store.del('mj.save');
    const t = Math.floor(S.time), L = LS(S.lay), b = stats.best[S.lay];
    stats.won++; L.w++; S.newBest = b == null || t < b; if (S.newBest) stats.best[S.lay] = t;
    if (!S.hints && !S.shuffles) stats.noHelp++;
    if (S.daily) {
      const prev = stats.daily[S.daily]; if (prev == null) stats.dailyWon++;
      S.newDaily = prev == null || t < prev; if (S.newDaily) stats.daily[S.daily] = t;
      if (stats.dailyBest == null || t < stats.dailyBest) stats.dailyBest = t;
      const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()];
    }
    saveStats(); hud(true); sfx('mjWin'); vibrate(30);
    const game = S;
    setTimeout(() => { if (S === game && current === 'mj') petals(); }, 380);
    setTimeout(() => {
      if (S !== game || current !== 'mj') return;
      const L2 = LAY(S.lay).name, best = stats.best[S.lay];
      $('#mjEndTitle').textContent = S.daily ? 'Dagpuzzel opgelost!' : 'Gewonnen!';
      $('#mjEndText').innerHTML = `<div class="mj-endt"><b>${fmt(S.time)}</b><small>${esc(L2)}${S.newBest ? ' · 🎉 nieuwe beste tijd' : ''}</small></div>`
        + `<p>${S.hints ? S.hints + (S.hints === 1 ? ' hint' : ' hints') : 'Geen hints'} · ${S.shuffles ? S.shuffles + '× geschud' : 'niet geschud'}<br>Beste tijd ${esc(L2)}: <b>${fmt(best)}</b>${S.daily && !S.newDaily ? `<br>Vandaag eerder: ${fmt(stats.daily[S.daily])}` : ''}</p>`;
      openModal('mjEndModal');
    }, 1700);
  }
  let toastT = 0;
  function toast(t, ms = 2200) { const el = $('#mjToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  function setPause(on) {
    paused = !!on && !!S && !S.over; $('#mjPause').classList.toggle('show', paused);
    if (paused && sel >= 0) { markTiles([sel]); sel = -1; }
  }

  /* ================= start dialog ================= */
  const PV = {};
  function preview(id) {
    const key = id + '|' + opt.table; if (PV[key]) return PV[key];
    const g = geo(id), Tb = TABLES[opt.table], dpr = 2;
    let mz = 0; for (const p of g.pos) mz = Math.max(mz, p[2]);
    const fl = g.pos.map(([x, , z]) => x / 2 + (z + 1) * T), ft = g.pos.map(([, y, z]) => y * HR / 2 - z * T + mz * T);
    const kw = Math.max(...fl) + 1, kh = Math.max(...ft) + HR + T, W = Math.min(150 / kw, 84 / kh);
    const c = document.createElement('canvas'); c.width = Math.ceil(kw * W * dpr) + 2; c.height = Math.ceil(kh * W * dpr) + 2;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const t = W * T, H = W * HR, shade = ['#f7f0dd', '#fbf3df', '#fff6dc', '#fff8d6', '#fffbd0', '#fffdcc'];
    g.pos.forEach(([, , z], i) => {
      const fx = fl[i] * W, fy = ft[i] * W;
      x.fillStyle = Tb.back[1]; rr(x, fx - t, fy + t, W, H, W * .15); x.fill();
      x.fillStyle = '#d8caa6'; rr(x, fx - t * .5, fy + t * .5, W, H, W * .15); x.fill();
      x.fillStyle = shade[Math.min(5, z)]; rr(x, fx, fy, W, H, W * .15); x.fill();
      x.strokeStyle = 'rgba(110,90,50,.45)'; x.lineWidth = .5; x.stroke();
    });
    return (PV[key] = c.toDataURL());
  }
  function renderStart() {
    const d = dayStr(), dl = dailyLay(d), done = stats.daily[d];
    const dn = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#mjDaily').innerHTML = `<img src="${preview(dl)}" alt=""><span><b>📅 Dagpuzzel</b><small>${esc(dn)} · ${LAY(dl).name}</small><small>Iedereen krijgt vandaag dezelfde stenen</small></span><em>${done != null ? '✓ ' + fmt(done) : 'Speel ▶'}</em>`;
    $('#mjDaily').classList.toggle('done', done != null);
    $('#mjLays').innerHTML = LAYOUTS.map(L => `<button data-lay="${L.id}" class="${opt.lay === L.id ? 'on' : ''}"><img src="${preview(L.id)}" alt=""><b>${L.name}</b><small>${geo(L.id).n} stenen</small><span>${stats.best[L.id] != null ? '⏱ ' + fmt(stats.best[L.id]) : '–'}</span></button>`).join('');
    $('#mjOptList').innerHTML = [['hl', 'Vrije stenen oplichten', [[true, 'Aan'], [false, 'Uit']]], ['idx', 'Hulpcijfers in de hoek', [[true, 'Aan'], [false, 'Uit']]],
      ['table', 'Tafel', Object.entries(TABLES).map(([k, v]) => [k, v.name])], ['sound', 'Geluidseffecten', [[true, 'Aan'], [false, 'Uit']]], ['music', 'Achtergrondmuziek', [[true, 'Aan'], [false, 'Uit']]]]
      .map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#mjStats').innerHTML = [['Gespeeld', stats.played], ['Gewonnen', stats.won], ['Zonder hulp', stats.noHelp]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    $('#mjResume').hidden = !(S && !S.over);
  }
  function applyTable() { stage.className = 't-' + opt.table; }

  /* ================= input ================= */
  const ptrs = new Map(); let gest = null, lastTap = { t: 0, x: 0, y: 0 };
  const sp = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  fxc.addEventListener('pointerdown', e => {
    if (!S) return; e.preventDefault();
    const p = sp(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) gest = { kind: 'tap', x0: p.x, y0: p.y, ox: V.ox, oy: V.oy };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gest = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: V.s, bx: ((a.x + b.x) / 2 - V.ox) / V.W, by: ((a.y + b.y) / 2 - V.oy) / V.W }; V.gest = true; }
  });
  fxc.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !gest) return;
    const p = sp(e); ptrs.set(e.pointerId, p);
    if (gest.kind === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      V.s = Math.max(1, Math.min(3, 110 / V.fitW, gest.s0 * d / gest.d0)); V.W = V.fitW * V.s;
      V.ox = (a.x + b.x) / 2 - gest.bx * V.W; V.oy = (a.y + b.y) / 2 - gest.by * V.W; clampView(false); viewChanged();
    } else if (gest.kind === 'tap' || gest.kind === 'pan') {
      const dx = p.x - gest.x0, dy = p.y - gest.y0;
      if (gest.kind === 'tap' && dx * dx + dy * dy > 81) gest.kind = 'pan';
      if (gest.kind === 'pan' && (bw() > V.cw || bh() > V.ch)) { V.ox = gest.ox + dx; V.oy = gest.oy + dy; clampView(false); viewChanged(); }
    }
  });
  const endPtr = e => {
    if (!ptrs.has(e.pointerId)) return;
    const p = sp(e); ptrs.delete(e.pointerId);
    if (gest && gest.kind === 'tap' && e.type === 'pointerup' && !ptrs.size) { tapEv = e.timeStamp; boardTap(p.x, p.y); tapEv = 0; }
    if (!ptrs.size) { if (gest && gest.kind === 'pinch') { $('#mjZoomBtn small').textContent = V.s > 1.05 ? 'Uitzoomen' : 'Inzoomen'; } gest = null; if (V.gest) { V.gest = false; requestDraw(); } }
    else if (gest && gest.kind === 'pinch') gest = { kind: 'done' };
  };
  fxc.addEventListener('pointerup', endPtr); fxc.addEventListener('pointercancel', endPtr);
  fxc.addEventListener('wheel', e => { if (!S) return; e.preventDefault(); const p = sp(e); zoomTo(V.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), p.x, p.y, false); }, { passive: false });
  function boardTap(x, y) {
    if (!S || S.over) return;
    const i = hit(x, y);
    if (i >= 0) { lastTap.t = 0; tapTile(i); return; }
    const now = performance.now();
    if (now - lastTap.t < 340 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) { lastTap.t = 0; zoomTo(V.s > 1.05 ? 1 : 2, x, y); return; }
    lastTap = { t: now, x, y };
    if (sel >= 0) { markTiles([sel]); sel = -1; sfx('mjDesel'); }
  }
  $('#mjTools').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]'); if (!b || !S) return;
    const t = b.dataset.t; if (paused) setPause(false);
    if (t === 'undo') doUndo(); else if (t === 'hint') hint(); else if (t === 'shuffle') doShuffle();
    else if (t === 'zoom') zoomTo(V.s > 1.05 ? 1 : 2, V.cw / 2, V.ch / 2);
  });
  $('#mjPauseBtn').addEventListener('click', () => { if (S && !S.over) setPause(!paused); });
  $('#mjPause').addEventListener('click', () => setPause(false));
  $('#mjLays').addEventListener('click', e => { const b = e.target.closest('button[data-lay]'); if (!b) return; opt.lay = b.dataset.lay; saveOpt(); sfx('mjSel'); renderStart(); });
  $('#mjDaily').addEventListener('click', () => { const d = dayStr(); newGame(dailyLay(d), d); });
  $('#mjOptList').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); applyTable(); renderStart(); requestDraw(); Sfx.refresh && Sfx.refresh();
  });
  $('#mjGo').addEventListener('click', () => newGame(opt.lay));
  $('#mjResume').addEventListener('click', () => closeModals());
  $('#mjStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#mjEndNew').addEventListener('click', () => newGame(S && !S.daily ? S.lay : opt.lay));
  $('#mjEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('mjStartModal'); });
  $('#mjStuckUndo').addEventListener('click', () => { closeModals(); doUndo(); });
  $('#mjStuckShuffle').addEventListener('click', () => doShuffle());
  $('#mjBack').addEventListener('click', () => leave());
  $('#mjMenu').addEventListener('click', () => { renderStart(); openModal('mjStartModal'); });
  window.addEventListener('resize', () => { if (current === 'mj') setTimeout(() => fit(true), 60); });
  window.addEventListener('keydown', e => {
    if (current !== 'mj' || anyModal() || !S) return;
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) doUndo(); else if (e.key === 'h') hint(); else if (e.key === 's') doShuffle(); else if (e.key === ' ' || e.key === 'p') setPause(!paused);
  });

  function tick() {
    if (current !== 'mj' || !S || S.over || anyModal() || document.hidden || paused) return;
    S.time += .25; hud(); if (++saveT % 20 === 0) saveNow();
  }
  function enter() {
    show('mj'); applyTable();
    const saved = store.get('mj.save', null);
    if (!S && saved && saved.faces && saved.lay) S = saved;
    if (S) { setupGeo(); sel = -1; hintP = null; fit(); refresh(); requestAnimationFrame(() => fit(true)); }
    clearInterval(timer); timer = setInterval(tick, 250);
    if (!S || S.over) { renderStart(); openModal('mjStartModal'); }
  }
  function leave() { clearInterval(timer); saveNow(); anims.length = 0; setPause(false); closeModals(); show('menu'); refreshMenu(); }

  /* ================= test hooks ================= */
  const center = i => { const r = stage.getBoundingClientRect(), [x, y, w, h] = faceRect(i); return { x: r.left + x + w / 2, y: r.top + y + h / 2 }; };
  window.__mj = {
    get S() { return S; }, get G() { return G; }, get V() { return V; }, get sel() { return sel; }, get hintP() { return hintP; }, get free() { return free; }, get pairs() { return pairs; }, get paused() { return paused; },
    LAYOUTS, geo, deal, reshuffle, checkSol, solve, movePairs, isFree, groupOf, opt, stats: () => stats, newGame, tapTile, hint, doUndo, doShuffle, fit, zoomTo, center, hit, dayStr, dailyLay,
    setFaces(f) { S.faces = f; S.sol = null; sel = -1; refresh(); if (left && !pairs.length) openStuck(); },
    tapLat: () => tapLat.slice(), frames: () => frames.slice(), drawTiles, anims: () => anims.length, drawMs: () => drawMs, spW: () => SP.W,
    bounds: () => ({ x: V.ox, y: V.oy, w: bw(), h: bh() }),
  };
  return { enter, leave, hasSave: () => !!store.get('mj.save', null) };
})();
$('#tileMj').addEventListener('click', () => Mahjong.enter());
