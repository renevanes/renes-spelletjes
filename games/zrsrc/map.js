  /* ================= map.js: seeded desert map generator (no DOM) ================= */
  // xorshift32: returns a function giving [0, 1); its state can be read with .s and restored
  function rng(seed) { let s = (seed >>> 0) || 0x9e3779b9; const f = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; f.get = () => s; f.set = v => { s = v >>> 0 || 1; }; return f; }
  const hash2 = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2246822519)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  function vnoise(x, y, s) {                       // smooth value noise in [0, 1)
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  const fbm = (x, y, s) => (vnoise(x, y, s) * .55 + vnoise(x * 2.1, y * 2.1, s + 17) * .3 + vnoise(x * 4.3, y * 4.3, s + 31) * .15);

  function genMap(p) {
    const W = p.w, H = p.h, N = W * H, R = rng(p.seed * 7919 + 13), sd = p.seed | 0;
    const ter = new Uint8Array(N), cry = new Uint8Array(N), cmax = new Uint8Array(N);
    const n = p.n || 2, m = Math.max(7, Math.round(Math.min(W, H) * .16));
    // base positions (start plateaus)
    let bases;
    if (n === 2) { const flip = R() < .5; bases = flip ? [[m + 1, H - m - 1], [W - m - 2, m]] : [[m + 1, m + 1], [W - m - 2, H - m - 2]]; }
    else { bases = [[m + 1, m + 1], [W - m - 1, Math.round(m + H * .12)], [Math.round(W * .42), H - m - 1]]; }
    bases = bases.slice(0, n).map(([x, y]) => ({ x, y }));
    const baseR = Math.max(6.5, Math.min(8.5, Math.min(W, H) * .13));
    const dBase = (x, y) => { let b = 1e9; for (const B of bases) b = Math.min(b, Math.hypot(x - B.x, y - B.y)); return b; };
    // rock patches
    const rockAmt = p.rock ?? .3, thr = .62 - rockAmt * .35;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, v = fbm(x / 9, y / 9, sd + 3);
      if (v > thr) ter[i] = T_ROCK;
    }
    // base plateaus: rock with a wobbly edge
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      for (const B of bases) { const d = Math.hypot(x - B.x, y - B.y), ang = Math.atan2(y - B.y, x - B.x); if (d < baseR + Math.sin(ang * 3 + sd) * 1.2 + vnoise(x / 3, y / 3, sd + 9) * 1.5) ter[y * W + x] = T_ROCK; }
    }
    // cliffs inside the rock patches, away from the bases
    const cl = p.cliffs ?? .4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (ter[i] !== T_ROCK || dBase(x, y) < baseR + 3) continue;
      const v = vnoise(x / 4.2, y / 4.2, sd + 21);
      if (v > 1 - cl * .55) ter[i] = T_CLIFF;
    }
    // dune ridges in the open sand
    const du = p.dunes ?? 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (ter[i] !== T_SAND || dBase(x, y) < baseR + 2.5) continue;
      const v = fbm(x / 7 + y / 19, y / 5.5, sd + 41), w = vnoise(x / 6, y / 6, sd + 47);
      if (Math.abs(v - .5) < .028 * du && w > .45) ter[i] = T_DUNE;
    }
    // crystal fields: two near every base (fair), a few in the middle
    const fields = [];
    const cx = W / 2, cy = H / 2;
    for (const B of bases) {
      const a0 = Math.atan2(cy - B.y, cx - B.x);
      for (const da of [-.75, .75]) {
        const a = a0 + da + (R() - .5) * .3, d = baseR + 4.5 + R() * 3;
        fields.push({ x: B.x + Math.cos(a) * d, y: B.y + Math.sin(a) * d, r: 2.6 + R() * .8 });
      }
    }
    const nMid = Math.max(1, Math.round(W * H / 1100));
    for (let k = 0; k < nMid; k++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = 5 + R() * (W - 10), y = 5 + R() * (H - 10);
        if (dBase(x, y) < baseR + 7 || fields.some(f => Math.hypot(f.x - x, f.y - y) < 8)) continue;
        fields.push({ x, y, r: 3 + R() * 1.6 }); break;
      }
    }
    const rich = p.rich ?? 1;
    for (const f of fields) {
      const r = f.r, x0 = Math.floor(f.x - r - 1), x1 = Math.ceil(f.x + r + 1), y0 = Math.floor(f.y - r - 1), y1 = Math.ceil(f.y + r + 1);
      for (let y = Math.max(1, y0); y <= Math.min(H - 2, y1); y++) for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++) {
        const i = y * W + x, d = Math.hypot(x + .5 - f.x, y + .5 - f.y) / (r * (.8 + vnoise(x / 2, y / 2, sd + 61) * .45));
        if (d >= 1) continue;
        if (ter[i] === T_ROCK && dBase(x, y) < baseR + 1.5) continue;     // never on the start plateau
        ter[i] = T_SAND;
        const v = Math.min(250, Math.round((70 + 180 * (1 - d)) * rich));
        cry[i] = Math.max(cry[i], v); cmax[i] = cry[i];
      }
    }
    // two players: point-symmetric map (same distances, same crystal) so the start is fair
    const sym = n === 2;
    if (sym) {
      for (let i = N - 1; i > (N - 1) / 2; i--) { ter[i] = ter[N - 1 - i]; cry[i] = cry[N - 1 - i]; cmax[i] = cmax[N - 1 - i]; }
      const half = fields.filter(f => Math.floor(f.y) * W + Math.floor(f.x) <= (N - 1) / 2);
      fields.length = 0; for (const f of half) fields.push(f, { x: W - f.x, y: H - f.y, r: f.r });
    }
    // keep a sand ring of 1 tile around the map edge passable-ish (no cliffs on the border)
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (ter[y * W + x] >= T_DUNE) ter[y * W + x] = T_SAND;
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (ter[y * W + x] >= T_DUNE) ter[y * W + x] = T_SAND;
    // connectivity: everything that matters must be reachable from base 0
    const pass = i => ter[i] <= T_ROCK;
    const reach = new Uint8Array(N);
    const flood = () => {
      reach.fill(0); const q = new Int32Array(N); let h = 0, t = 0; const s0 = bases[0].y * W + bases[0].x; reach[s0] = 1; q[t++] = s0;
      while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!reach[j] && pass(j)) { reach[j] = 1; q[t++] = j; } } }
    };
    const carve = (x, y) => {               // dig a 2-wide corridor from (x, y) to the nearest reachable tile
      let best = -1, bd = 1e9;
      for (let j = 0; j < N; j++) if (reach[j]) { const d = Math.hypot(j % W - x, ((j / W) | 0) - y); if (d < bd) { bd = d; best = j; } }
      if (best < 0) return;
      const tx = best % W, ty = (best / W) | 0, steps = Math.ceil(bd * 2) + 1;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round(x + (tx - x) * s / steps), py = Math.round(y + (ty - y) * s / steps);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; for (const j of sym ? [qy * W + qx, N - 1 - (qy * W + qx)] : [qy * W + qx]) { if (ter[j] === T_CLIFF) ter[j] = T_ROCK; else if (ter[j] === T_DUNE) ter[j] = T_SAND; } }
      }
    };
    for (let pass2 = 0; pass2 < 6; pass2++) {
      flood(); let fixed = false;
      for (const B of bases) if (!reach[B.y * W + B.x]) { carve(B.x, B.y); fixed = true; }
      for (const f of fields) { const i = Math.floor(f.y) * W + Math.floor(f.x); if (!reach[i]) { carve(Math.floor(f.x), Math.floor(f.y)); fixed = true; } }
      if (!fixed) break;
    }
    // isolated pockets of open ground become dunes/cliffs so nothing can be built or spawned out of reach
    flood();
    for (let i = 0; i < N; i++) if (!reach[i] && pass(i)) { ter[i] = ter[i] === T_ROCK ? T_CLIFF : T_DUNE; cry[i] = 0; cmax[i] = 0; }
    let sand = 0; for (let i = 0; i < N; i++) if (ter[i] === T_SAND) sand++;
    return { w: W, h: H, ter, cry, cmax, bases, fields, sandFrac: sand / N };
  }
