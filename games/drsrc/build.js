  /* ================= build.js: worlds, the level language and the level builder (no DOM; also runs in Node) ================= */
  // A level is a list of pieces placed from left to right: buildings (R), gaps (G) and ramps (U/D, gentle Ug/Dg).
  // Items (boxes, pipes to slide under, springs, coins, checkpoints, hazards...) are attached to a piece; their dx is counted
  // from the piece's first column and dy upwards from the piece's roof surface. One tile = one metre.
  const TH = 26;                                                  // rows in every level (y grows downwards)
  const T = { E: 0, S: 1, UP: 2, DN: 3, UG1: 4, UG2: 5, DG1: 6, DG2: 7, CR: 8, BR: 9, BL: 10, SP: 11, PL: 12 };
  // materials (how a solid tile is drawn)
  const MAT = { FAC: 0, ROOF: 1, BOX: 2, PIPE: 3, WALL: 4, GIRD: 5, CONT: 6, BELT: 7, CRUMB: 8, PLANK: 9, SIGN: 10 };
  const WORLDS = [
    { nm: 'Oude stad', full: 'Daken van de oude stad', need: 0, col: ['#ffb36b', '#c4503a'], emo: '🏘️' },
    { nm: 'Bouwplaats', full: 'De bouwplaats', need: 9, col: ['#ffd23a', '#d86a1a'], emo: '🏗️' },
    { nm: 'Haven', full: 'Haven & kranen', need: 21, col: ['#6fd0ff', '#1f5fa8'], emo: '⚓', water: 1 },
    { nm: 'Neonstad', full: 'Nachtstad met neon', need: 36, col: ['#ff6ad5', '#4a1a8a'], emo: '🌃' },
  ];
  // ---- pieces ----
  const R = (w, h, ...it) => ({ k: 'R', w, h, it });              // a building w wide with its roof h tiles above the bottom (null: same height)
  const G = (w, ...it) => ({ k: 'G', w, it });                    // a gap (a fall = back to the last flag)
  const U = (n, ...it) => ({ k: 'U', n, it }), D = (n, ...it) => ({ k: 'D', n, it });           // 45° ramp up / down by n
  const Ug = (n, ...it) => ({ k: 'Ug', n, it }), Dg = (n, ...it) => ({ k: 'Dg', n, it });       // gentle ramp (2n wide)
  // ---- items ----
  const box = (dx, w = 1, hh = 1, look = 0) => ({ k: 'box', dx, w, hh, look });   // solid block on the roof (1 high: vault over it)
  const wall = (dx, w, hh, look = 0) => ({ k: 'box', dx, w, hh, look, wall: 1 });
  const blk = (dx, dy, w, hh, look = 0) => ({ k: 'blk', dx, dy, w, hh, look });   // floating solid block (bottom dy above the roof)
  const low = (dx, w, clr = 1, th = 1) => ({ k: 'low', dx, w, clr, th });        // a pipe / beam to slide under (clearance clr)
  const coin = (dx, dy = 1.3) => ({ k: 'coin', dx, dy });
  const cp = dx => ({ k: 'cp', dx }), fin = dx => ({ k: 'fin', dx });
  const spring = (dx, pw = 1, dir = 0) => ({ k: 'spring', dx, pw, dir });
  const spikes = (dx, w = 1) => ({ k: 'spikes', dx, w });
  const crum = (dx, w, dy = 0) => ({ k: 'crum', dx, w, dy });                    // crumbling roof tiles
  const plank = (dx, w, dy) => ({ k: 'plank', dx, w, dy });                      // scaffolding plank (land on it from above)
  const belt = (dx, w, dir = 1) => ({ k: 'belt', dx, w, dir });                  // conveyor belt in the roof
  const saw = (dx, dy, r = .8, mdx = 0, mdy = 0, per = 120, ph = 0) => ({ k: 'saw', dx, dy, r, mdx, mdy, per, ph });
  const laser = (dx, hh = 4, per = 150, on = .5, ph = 0) => ({ k: 'laser', dx, hh, per, on, ph });
  const vent = (dx, w, hh, dy = 0) => ({ k: 'vent', dx, w, hh, dy });           // updraft above a grate
  const crate = (dx, trig = 3.5, drop = 8) => ({ k: 'crate', dx, trig, drop });   // falls when you come close
  const bar = (dx, dy) => ({ k: 'bar', dx, dy });                                // a swing bar: grab it, swing, jump off
  const zip = (dx, dy, dx2, dy2) => ({ k: 'zip', dx, dy, dx2, dy2 });          // a cable to slide down
  const plat = (dx, dy, w, mdx, mdy, per = 240, ph = 0, look = 0) => ({ k: 'plat', dx, dy, w, mdx, mdy, per, ph, look });
  const hint = (dx, t, ic = '') => ({ k: 'hint', dx, t, ic });
  const wp = (dx, dy = 0) => ({ k: 'wp', dx, dy });                              // a waypoint for the test bot only
  const deco = (dx, kind, dy = 0) => ({ k: 'deco', dx, kind, dy });

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* builds the static level data: tiles, materials, building ids and the item lists */
  function buildLevel(def, idx = 0) {
    let W = 6;
    for (const p of def.p) W += p.k === 'R' || p.k === 'G' ? p.w : p.k === 'Ug' || p.k === 'Dg' ? p.n * 2 : p.n;
    W += 14;
    const H = TH, t = new Uint8Array(W * H), mat = new Uint8Array(W * H), bid = new Uint16Array(W * H);
    const L = { W, H, t, mat, bid, nm: def.n, world: def.w, idx, water: !!(WORLDS[def.w] || {}).water, bld: [], coins: [], cps: [], springs: [], saws: [], lasers: [], vents: [], crates: [],
      bars: [], zips: [], plats: [], hints: [], wps: [], deco: [], crum: [], start: null, finish: null, seed: def.seed || (idx * 7919 + 17) };
    const set = (c, r, v, m = 0, b = 0) => { if (c < 0 || c >= W || r < 0 || r >= H) return; const i = r * W + c; t[i] = v; mat[i] = m; bid[i] = b; };
    let cx = 2, top = H - (def.p[0].k === 'R' && def.p[0].h != null ? def.p[0].h : 6), bcount = 0, cur = null;
    const top00 = top;
    // a starting roof to the left (the start is on the first building)
    for (let c = 0; c < 2; c++) for (let r = top; r < H; r++) set(c, r, T.S, MAT.FAC, 0);
    const busy = new Set();
    for (const p of def.p) {
      const x0 = cx, top0 = p.k === 'R' && p.h != null ? H - p.h : top;
      if (p.k === 'R') {
        top = top0; bcount++;
        cur = { x0: cx, x1: cx + p.w, top, id: bcount, look: p.look || 0 }; L.bld.push(cur);
        for (let c = cx; c < cx + p.w; c++) for (let r = top; r < H; r++) set(c, r, T.S, MAT.FAC, bcount);
        cx += p.w;
      } else if (p.k === 'G') { cx += p.w; cur = null; }
      else if (p.k === 'U' || p.k === 'D' || p.k === 'Ug' || p.k === 'Dg') {
        const b = cur ? cur.id : ++bcount;
        if (!cur) { cur = { x0: cx, x1: cx, top, id: b, look: 0 }; L.bld.push(cur); }
        const up = p.k[0] === 'U', g = p.k.length > 1;
        for (let i = 0; i < p.n; i++) {
          if (!g) {
            const r = up ? top - 1 - i : top + i;
            set(cx, r, up ? T.UP : T.DN, MAT.ROOF, b); for (let rr = r + 1; rr < H; rr++) set(cx, rr, T.S, MAT.FAC, b); cx++;
          } else {
            const r = up ? top - 1 - i : top + i;
            for (let k = 0; k < 2; k++) { set(cx, r, up ? (k ? T.UG2 : T.UG1) : (k ? T.DG2 : T.DG1), MAT.ROOF, b); for (let rr = r + 1; rr < H; rr++) set(cx, rr, T.S, MAT.FAC, b); cx++; }
          }
        }
        top += up ? -p.n : p.n; cur.x1 = cx;
      }
      for (const it of p.it || []) {
        const X = x0 + (it.dx || 0), Y = top0;
        for (let c = X - 1; c <= X + (it.w || 1); c++) busy.add(c);
        switch (it.k) {
          case 'box': for (let c = X; c < X + it.w; c++) for (let r = Y - it.hh; r < Y; r++) set(c, r, T.S, it.wall ? MAT.WALL : MAT.BOX, it.look); break;
          case 'blk': for (let c = X; c < X + it.w; c++) for (let r = Y - it.dy - it.hh; r < Y - it.dy; r++) set(c, r, T.S, MAT.WALL, it.look); break;
          case 'low': for (let c = X; c < X + it.w; c++) for (let r = Y - it.clr - it.th; r < Y - it.clr; r++) set(c, r, T.S, MAT.PIPE, c === X ? 1 : c === X + it.w - 1 ? 2 : 0); break;
          case 'coin': L.coins.push({ x: X + .5, y: Y - it.dy }); break;
          case 'cp': L.cps.push({ x: X + .5, y: Y }); break;
          case 'fin': L.finish = { x: X + .5, y: Y }; break;
          case 'spring': L.springs.push({ x: X + .5, y: Y, pw: it.pw, dir: it.dir }); break;
          case 'spikes': for (let c = X; c < X + it.w; c++) set(c, Y - 1, T.SP, 0, 0); break;
          case 'crum': for (let c = X; c < X + it.w; c++) { set(c, Y - it.dy, T.CR, MAT.CRUMB, 0); L.crum.push((Y - it.dy) * W + c); } break;
          case 'plank': for (let c = X; c < X + it.w; c++) set(c, Y - it.dy, T.PL, MAT.PLANK, c === X ? 1 : c === X + it.w - 1 ? 2 : 0); break;
          case 'belt': for (let c = X; c < X + it.w; c++) set(c, Y, it.dir > 0 ? T.BR : T.BL, MAT.BELT, c === X ? 1 : c === X + it.w - 1 ? 2 : 0); break;
          case 'saw': L.saws.push({ x0: X + .5, y0: Y - it.dy, x1: X + .5 + it.mdx, y1: Y - it.dy - it.mdy, r: it.r, per: it.per, ph: it.ph }); break;
          case 'laser': L.lasers.push({ x: X + .5, y0: Y - it.hh, y1: Y, per: it.per, on: Math.round(it.per * it.on), ph: Math.round(it.per * it.ph) }); break;
          case 'vent': L.vents.push({ x0: X, x1: X + it.w, y0: Y - it.dy - it.hh, y1: Y - it.dy }); break;
          case 'crate': L.crates.push({ x: X + .5, y0: Y - it.drop - 1, y1: Y, trig: X + .5 - it.trig }); break;
          case 'bar': L.bars.push({ x: X + .5, y: Y - it.dy }); break;
          case 'zip': L.zips.push({ x0: X + .5, y0: Y - it.dy, x1: x0 + it.dx2 + .5, y1: Y - it.dy2 }); break;
          case 'plat': L.plats.push({ x: X, y: Y - it.dy, w: it.w, mx: it.mdx, my: -it.mdy, per: it.per, ph: it.ph, look: it.look }); break;
          case 'hint': L.hints.push({ x: X, t: it.t, ic: it.ic }); break;
          case 'wp': L.wps.push({ x: X + .5, y: Y - it.dy }); break;
          case 'deco': L.deco.push({ x: X + .5, y: Y - it.dy, kind: it.kind, s: 1 }); break;
        }
      }
    }
    // the last stretch: a roof to run out on and a wall at the very end
    for (let c = cx; c < W; c++) for (let r = top; r < H; r++) set(c, r, T.S, MAT.FAC, bcount + 1);
    L.bld.push({ x0: cx, x1: W, top, id: bcount + 1, look: 0 });
    if (!L.finish) L.finish = { x: cx + 3.5, y: top };
    L.start = { x: 3.5, y: top00 };
    // automatic roof decoration (drawn behind the runner, never in the way): chimneys, antennas, water towers, ...
    const rnd = rng(L.seed);
    for (const b of L.bld) {
      if (b.x1 - b.x0 < 4) continue;
      for (let c = b.x0 + 1; c < b.x1 - 1; c++) {
        if (busy.has(c) || rnd() > .2) continue;
        if (t[(b.top - 1) * W + c] !== T.E || t[b.top * W + c] !== T.S) continue;
        L.deco.push({ x: c + .5, y: b.top, kind: 'auto', s: rnd(), w: def.w }); c += 3;
      }
    }
    L.crIdx = new Int16Array(W * H).fill(-1); L.crum.forEach((ti, i) => { L.crIdx[ti] = i; });
    L.medals = def.medals || null;
    return L;
  }
