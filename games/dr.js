/* ================================================================
   DAKRENNER – an original 2D parkour platformer over the roofs of the city: run with momentum, jump, slide,
   vault, run up walls, grab ledges, swing on bars, ride cables and land your flips on your feet. 32 levels in
   four worlds with medals, golden shoes, a ghost of your best run and an endless run. Crashes are cartoons.
   ================================================================ */
const Dakrenner = (() => {
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

  /* ================= levels.js: the handmade levels and the endless-run generator ================= */
  const MEDALS = [[960,1260,1680],[900,1200,1620],[1080,1440,1920],[1020,1380,1800],[1140,1500,2040],[780,1020,1380],[1080,1440,1920],[1380,1800,2460],[1020,1380,1800],[660,900,1200],[1020,1380,1800],[1320,1740,2340],[1080,1440,1920],[720,960,1260],[1200,1560,2100],[1320,1740,2340],[1080,1440,1920],[1080,1440,1920],[1140,1500,2040],[840,1140,1500],[1140,1500,2040],[900,1200,1620],[960,1260,1680],[1020,1380,1800],[1260,1680,2220],[1080,1440,1920],[1080,1440,1920],[900,1200,1620],[1440,1920,2520],[1380,1800,2460],[780,1020,1380],[1260,1680,2220]];          // per level [gold, silver, bronze] in frames, measured from the test bot's run (drsolve.mjs)
  const LEVELS = [
    /* ---------- world 1: the old town ---------- */
    { n: 'Eerste stappen', w: 0, p: [
      R(16, 5, hint(1, 'Houd ▶ ingedrukt om te rennen.', 'r')),
      G(2, hint(-7, 'Tik op Springen om over het gat te springen. Langer vasthouden = hoger!', 'j')),
      R(12, 5, coin(6, 2.6)), G(3), R(10, 6, hint(1, 'Pak de gouden schoentjes!', 'c'), coin(5, 1.2)), G(3),
      R(14, 5, cp(2)), G(4), R(8, 5), G(3), R(10, 6), G(2), R(8, 7), G(4), R(12, 5, coin(4, 3)), G(3), R(16, 6, fin(11)),
    ] },
    { n: 'Bukken en glijden', w: 0, p: [
      R(16, 5, hint(2, 'Houd Glijden ingedrukt om onder de buis door te glijden.', 's'), low(10, 3)),
      G(3), R(18, 5, low(5, 3), coin(6, .5), hint(10, 'Ren hard tegen een laag blok: je springt er vanzelf overheen!', 'r'), box(14, 1, 1, 1)), G(3),
      R(18, 6, cp(1), box(6), low(11, 4), coin(13, .5)),
      G(4), R(20, 6, box(3), low(8, 3), box(14), coin(14, 2.2)), G(3), R(16, 6, low(3, 3), box(10), box(11)), G(3), R(16, 6, fin(12)),
    ] },
    { n: 'Muurloop', w: 0, p: [
      R(14, 5, hint(3, 'Spring tegen de hoge muur: je rent er een stukje tegenop en grijpt de rand!', 'j')),
      R(12, 9, coin(6, 1.3)), G(3), R(10, 8), D(3), R(6, null, hint(0, 'Spring vlak voor de muur, dan kom je het hoogst.', 'j')), R(14, 10, cp(3), coin(10, 1.3)),
      G(4), R(8, 7), R(10, 11, coin(4, 2.2)), G(3), R(10, 9), R(10, 14), G(3), R(8, 12), D(3), R(12, null), G(3), R(16, 9, fin(10)),
    ] },
    { n: 'Salto!', w: 0, p: [
      R(14, 12, hint(2, 'Houd in de lucht ↻ of ↺ ingedrukt voor een salto. Laat los als je weer rechtop bent!', 'f')),
      G(2), R(12, 6, hint(4, 'Land op je voeten: dan krijg je extra vaart!', 'f'), coin(9, 1.3)),
      R(6, 9), G(3), R(12, 4, cp(3), coin(8, 3.5)), R(4, null, spring(1)), R(16, 9, hint(-3, 'Een springveer! Daarmee spring je extra hoog.', 'j'), coin(8, 1.3)),
      G(3), R(10, 6), R(4, null, spring(1)), R(10, 12), G(2), R(16, 5), G(3), R(16, 4, fin(11)),
    ] },
    { n: 'Schoorsteenklimmen', w: 0, p: [
      R(16, 5, hint(5, 'In een smalle schacht: spring heen en weer tegen de muren omhoog!', 'j'), blk(12, 3, 1, 10, 1)),
      R(10, 14, wp(1), coin(5, 1.3)), G(3), R(12, 12, cp(2)),
      R(3, 12, blk(-1, 2, 1, 10, 1)), R(8, 21, wp(1), coin(4, 1.3)), G(4), R(14, 17, coin(7, 2.4)), G(3), R(10, 13), G(3), R(12, 11, blk(8, 3, 1, 9, 1)), R(8, 19, wp(1)), G(4), R(16, 14, fin(10)),
    ] },
    { n: 'Pannendaken', w: 0, p: [
      R(8, 6), U(3, hint(-4, 'Houd Glijden ingedrukt op een schuin dak: zo ga je steeds sneller!', 's')), R(3, null), D(5), R(6, null), G(4),
      R(6, 7, coin(3, 1.3)), Ug(3), R(2, null), Dg(3), R(4, null), G(5, coin(2, 3)),
      R(10, 6, cp(3)), U(4), R(2, null), D(6), R(4, null), G(6), R(8, 5, coin(4, 1.3)), U(3), G(5), R(8, 7), Ug(2), R(2, null), D(5), R(4, null), G(5), R(10, 6), U(2), G(4), R(14, 7, fin(9)),
    ] },
    { n: 'Brokkelige dakpannen', w: 0, p: [
      R(14, 6, hint(4, 'Pas op: deze dakpannen brokkelen af. Blijf rennen!', 'r')),
      G(8, crum(0, 8)), R(10, 6, coin(5, 1.3)), G(10, crum(0, 3), crum(5, 2), coin(5, 2.2)), R(12, 6, cp(2), spring(9)),
      R(8, 11), G(9, crum(0, 9, 1)), R(10, 9, coin(7, 1.3)), G(4), R(10, 6), G(12, crum(0, 4), crum(7, 5)), R(8, 6, spring(5)), R(10, 11), G(3), R(16, 8, fin(10)),
    ] },
    { n: 'Over de grachten', w: 0, p: [
      R(14, 6, box(7), low(11, 2)), G(4), R(10, 9, coin(5, 1.3)), G(3), R(8, 7), D(2), R(8, null, low(1, 4)), R(10, 9),
      G(3), R(14, 6, cp(2), blk(8, 3, 1, 9, 1)), R(10, 14, wp(1), coin(5, 1.3)), G(2), R(6, 13), D(6), R(4, null), G(7, coin(3, 2)),
      R(12, 6, cp(3), crum(5, 3)), R(4, null, spring(1)), R(8, 11), G(4), R(10, 9, box(3), box(7)), G(3), R(16, 7, fin(10)),
    ] },
    /* ---------- world 2: the building site ---------- */
    { n: 'Steigers', w: 1, p: [
      R(12, 5, hint(3, 'Op steigerplanken kun je van onderaf springen en erop landen.', 'j')),
      G(14, plank(0, 4, 2), plank(5, 4, 4), plank(10, 4, 3), coin(7, 5.5)), R(10, 8, cp(4)),
      G(12, plank(1, 3, 0), plank(5, 3, 2), plank(9, 3, 1), coin(10, 2.4)), R(8, 6), R(10, 11, plank(-4, 3, -2.5), coin(6, 1.3)),
      G(4), R(12, 7, cp(2)), G(14, plank(1, 3, 1), plank(5, 3, 3), plank(9, 3, 5)), R(10, 12), G(10, plank(2, 3, -2), plank(6, 3, -4)), R(16, 7, fin(10)),
    ] },
    { n: 'Lopende band', w: 1, p: [
      R(10, 5), R(14, 5, belt(1, 12, 1), hint(1, 'Een lopende band: hiermee ga je extra snel!', 'r')), G(6),
      R(16, 5, belt(2, 12, -1), hint(2, 'Deze band gaat de andere kant op. Spring eroverheen of ren hard!', 'j'), coin(8, 2.4)), G(3),
      R(12, 7, cp(2), belt(4, 7, 1)), G(7, coin(3, 3)), R(10, 6, low(3, 4)), R(16, 6, belt(0, 10, -1), box(13), coin(13, 2.2)), G(3), R(12, 7, cp(2), belt(2, 9, 1)), G(8), R(8, 6, low(2, 3)), R(16, 9, belt(1, 12, -1)), G(4), R(10, 8, belt(0, 8, 1)), G(7), R(14, 6, fin(9)),
    ] },
    { n: 'Kraanwerk', w: 1, p: [
      R(14, 6, hint(5, 'Spring op de lading van de kraan en laat je meevoeren.', 'j')),
      G(14, plat(1, 0, 4, 7, 0, 260, 0, 1), coin(8, 2.5)), R(10, 6, cp(3)),
      G(12, plat(1, -1, 3, 0, 5, 220, .5, 1), coin(2, 6)), R(8, 10), G(14, plat(1, 0, 4, 8, 0, 280, .25, 1)), R(10, 10, coin(5, 1.3)), G(4), R(12, 8, cp(2)), G(16, plat(1, 0, 3, 5, 0, 200, 0, 1), plat(9, 2, 3, 0, 4, 200, .5, 1)), R(10, 11), G(3), R(14, 7, fin(9)),
    ] },
    { n: 'Vallende kisten', w: 1, p: [
      R(22, 6, hint(2, 'Kijk uit voor vallende kisten. Blijf doorrennen!', 'r'), crate(14, 4)), G(3),
      R(18, 6, crate(5, 4), crate(12, 4), coin(9, 1.3)), G(4), R(16, 7, cp(2), crate(10, 4), low(12, 3)),
      G(3), R(12, 8, coin(6, 3)), G(3), R(20, 6, crate(6, 4), box(11), crate(16, 4), coin(16, 2.3)), G(3), R(12, 7, cp(2)), R(14, 7, crate(4, 4), crate(9, 4), low(11, 2)), G(4), R(8, 9), G(3), R(16, 7, crate(5, 4), crate(11, 4)), G(3), R(14, 6, fin(9)),
    ] },
    { n: 'Springplanken', w: 1, p: [
      R(12, 5, spring(8)), R(10, 11, coin(5, 1.3)), G(6), R(12, 5, cp(3), spring(9, 1, 1), hint(5, 'Een groene veer lanceert je ook vooruit. Probeer een salto!', 'f')),
      G(10, coin(5, 5)), R(10, 6, spring(6)), R(6, 12), G(4), R(8, 9, coin(4, 1.3)), G(3), R(12, 6, cp(2), spring(8, 1, 1)), G(9), R(8, 6, spring(4)), R(8, 12), G(5), R(10, 8), G(3), R(16, 6, fin(10)),
    ] },
    { n: 'Rekstok', w: 1, p: [
      R(14, 6, hint(5, 'Spring naar de stang: je zwaait mee. Tik op Springen om los te laten!', 'j')),
      G(7, bar(3, 3.3)), R(10, 6, coin(5, 1.3)), G(8, bar(3, 3.3), coin(5, 4)), R(10, 6, cp(2)),
      G(12, bar(3, 3.3), bar(8, 3.3)), R(12, 7, coin(6, 1.3)), G(4), R(12, 6, cp(2)), G(9, bar(3, 3.3)), R(6, 8), G(14, bar(3, 3.3), bar(9, 3.3)), R(10, 7), G(3), R(14, 6, fin(9)),
    ] },
    { n: 'Zaagwerk', w: 1, p: [
      R(20, 6, hint(3, 'Zaagbladen! Spring eroverheen of wacht tot ze weg zijn.', 'j'), saw(12, .7, .7)), G(3),
      R(18, 6, saw(6, 3.3, .8, 0, -2.6, 140), coin(10, 1.3), saw(14, .7, .7)), G(4), R(14, 6, cp(2)),
      R(16, 6, saw(4, 1, .8, 6, 0, 180), low(12, 3), coin(14, .5)), G(5, saw(2.5, 1, .9, 0, -4, 150)), R(12, 6, coin(6, 2.4)), G(3), R(12, 6, cp(2)), R(18, 6, saw(5, 1, .8, 0, -3, 120), saw(10, 1, .8, 0, -3, 120, .5), saw(15, .7, .7)), G(4, saw(1.5, 2, .8, 0, -3, 130)), R(12, 7), G(3), R(14, 6, fin(9)),
    ] },
    { n: 'Hoogbouw', w: 1, p: [
      R(12, 5, plank(6, 3, 2)), R(10, 9, coin(5, 1.3)), R(8, 13), G(10, plat(1, -2, 3, 0, 5, 220, 0, 1)), R(14, 16, cp(2)),
      G(9, bar(3, 3.3), coin(3, 5.5)), R(10, 15, crate(6, 4)), G(4, plank(0, 4, -3)), R(8, 11), D(4), R(12, null, belt(0, 8, 1), coin(9, 2.4)),
      G(4), R(14, 8, cp(2), spring(10)), R(10, 14), G(4), R(12, 12, saw(6, .7, .7)), G(6, plank(1, 4, 2)), R(10, 13, crate(6, 4)), G(8, bar(3, 3.3)), R(16, 12, fin(10)),
    ] },
    /* ---------- world 3: the harbour ---------- */
    { n: 'Containerkade', w: 2, p: [
      R(14, 5, hint(4, 'Val niet in het water! Dan begin je bij de laatste vlag.', 'j')),
      G(4), R(10, 7, coin(5, 1.3)), G(4), R(12, 5), R(8, 9), G(5, coin(2, 2)), R(12, 7, cp(2)), G(4), R(6, 9), G(3), R(10, 11, coin(5, 1.3)), D(4), G(5), R(12, 6, cp(2)), G(5), R(8, 8, box(4)), G(3), R(6, 10), G(5), R(10, 7, low(3, 3)), G(4), R(16, 6, fin(10)),
    ] },
    { n: 'Kabelbaan', w: 2, p: [
      R(14, 9, hint(4, 'Spring naar de kabel: je glijdt vanzelf naar beneden. Tik op Springen om los te laten.', 'j')),
      G(18, zip(1, 3.4, 16, -2)), R(10, 6, coin(5, 1.3)), R(8, 11), G(20, zip(1, 3.4, 18, -3), coin(10, 1.5)),
      R(10, 7, cp(3)), R(6, 10), G(16, zip(1, 3.4, 15, -1)), R(12, 8, coin(6, 1.3)), G(4), R(10, 9, cp(2)), R(8, 13), G(22, zip(1, 3.4, 10, 0), zip(12, -.4, 21, -2.5)), R(12, 9), G(4), R(14, 6, fin(9)),
    ] },
    { n: 'Havenkranen', w: 2, p: [
      R(14, 6), G(16, plat(1, 0, 4, 9, 0, 300, 0, 1), coin(8, 2.4)), R(10, 6, cp(3)),
      G(10, plat(4, 0, 3, 0, 6, 240, .5, 1)), R(8, 12, coin(4, 1.3)), G(16, plat(1, 1, 4, 9, 0, 300, .3, 1), plat(1, -4, 3, 9, 0, 300, .8, 1)),
      R(10, 9), G(5, coin(2.5, 2.4)), R(12, 7, cp(2)), G(18, plat(1, 0, 3, 6, 0, 240, 0, 1), plat(10, 2, 3, 6, 0, 240, .5, 1)), R(10, 9), G(3), R(16, 7, fin(10)),
    ] },
    { n: 'Stangen boven het water', w: 2, p: [
      R(14, 7), G(8, bar(3, 3.3)), R(6, 7), G(14, bar(3, 3.3), bar(9, 3.6), coin(6, 4.5)), R(10, 8, cp(2)),
      G(9, bar(3, 3.3)), R(6, 8, coin(3, 1.3)), G(16, bar(3, 3.3), bar(8, 3.5), bar(13, 3.2)), R(12, 7, coin(6, 2.4)), G(4), R(12, 8, cp(2)), G(12, bar(3, 3.3), bar(8, 3.3)), R(6, 9), G(9, bar(3, 3.3)), R(8, 8), G(4), R(14, 7, fin(9)),
    ] },
    { n: 'Scheepsventilatoren', w: 2, p: [
      R(14, 6, hint(5, 'Een luchtstroom tilt je omhoog. Spring erin!', 'j')),
      G(6, vent(1, 4, 6, -4)), R(10, 10, coin(5, 1.3)), G(8, vent(2, 4, 9, -8)), R(12, 9, cp(2)),
      R(4, 4, vent(0, 4, 11, 0)), R(10, 14, coin(5, 1.3)), G(5), R(10, 11), G(6, vent(1, 4, 8, -6), coin(3, 3)), R(12, 9, cp(2)), G(10, vent(3, 4, 12, -8)), R(10, 13), G(5), R(8, 10), G(8, vent(2, 4, 9, -6)), R(14, 11, fin(9)),
    ] },
    { n: 'Glibberige kade', w: 2, p: [
      R(12, 6, belt(3, 8, -1)), G(9, crum(0, 9)), R(10, 6, coin(5, 1.3)), G(4), R(14, 8, cp(2), belt(2, 10, 1)),
      G(8, crum(0, 3, -1), crum(5, 3, -1), coin(4, 2)), R(10, 7), G(10, zip(1, 3.2, 9, 0)), R(12, 7, belt(0, 8, -1), coin(9, 2.4)), G(4), R(12, 7, cp(2), belt(2, 8, 1)), G(10, crum(0, 10)), R(10, 7, belt(0, 6, -1)), G(12, zip(1, 3.2, 11, 0)), R(10, 6), G(4), R(14, 7, fin(9)),
    ] },
    { n: 'Het grote schip', w: 2, p: [
      R(12, 6), G(4), R(40, 8, low(6, 3), box(12), box(13), coin(13, 2.2), spring(20), blk(22, 5, 6, 1), coin(25, 6.5), crate(32, 4), cp(17)),
      G(5), R(10, 11), G(14, zip(1, 3.4, 13, -1)), R(10, 9, coin(5, 1.3)), G(4), R(36, 9, cp(2), low(5, 4), box(12), box(16), spring(22), crate(28, 4), low(31, 3)), G(4), R(16, 7, fin(10)),
    ] },
    { n: 'Storm in de haven', w: 2, p: [
      R(12, 7), G(8, bar(3, 3.3)), R(8, 7, coin(4, 1.3)), G(14, plat(1, 0, 3, 9, 0, 260, 0, 1)), R(10, 7, cp(2)),
      G(18, zip(1, 3.4, 16, -1)), R(6, 9), R(3, 9, blk(-1, 2, 1, 10, 1)), R(8, 17, wp(1), coin(4, 1.3)), G(6), R(10, 12, crum(2, 4)),
      G(6, vent(1, 4, 8, -6)), R(12, 12, cp(2), coin(8, 2.4)), G(12, bar(3, 3.3), bar(8, 3.3)), R(16, 10, fin(10)),
    ] },
    /* ---------- world 4: neon night city ---------- */
    { n: 'Neonlichten', w: 3, p: [
      R(18, 6, hint(5, 'Laserhekken! Ren erdoor als ze uit zijn.', 'r'), laser(12, 4, 150, .5)), G(3),
      R(18, 6, laser(6, 4, 120, .45, .3), coin(10, 1.3), laser(14, 2, 100, .6)), G(4), R(14, 7, cp(2)),
      R(16, 7, laser(5, 4, 160, .5, .5), low(9, 3), coin(10, .5)), G(4), R(12, 8, laser(6, 2, 90, .5), coin(6, 3)), G(3), R(12, 7, cp(2)), R(20, 7, laser(4, 4, 140, .5), laser(9, 4, 140, .5, .3), laser(14, 4, 140, .5, .6)), G(4), R(10, 8, laser(5, 2, 80, .5)), G(3), R(14, 7, fin(9)),
    ] },
    { n: 'Ventilatoren', w: 3, p: [
      R(14, 6), G(6, vent(1, 4, 8, -4)), R(10, 11, coin(5, 1.3)), G(10, vent(3, 4, 10, -7), coin(5, 6)), R(10, 13, cp(3)),
      G(8, vent(2, 4, 12, -10)), R(8, 14), G(5), R(10, 10, coin(5, 1.3)), G(6, vent(1, 4, 7, -4)), R(12, 11, cp(2)), G(12, vent(2, 3, 9, -6), vent(8, 3, 9, -6)), R(10, 12, laser(5, 4, 140, .5)), G(8, vent(2, 4, 12, -9)), R(14, 13, fin(9)),
    ] },
    { n: 'Laserdans', w: 3, p: [
      R(24, 6, laser(6, 4, 120, .5), laser(11, 4, 120, .5, .5), laser(16, 4, 120, .5), coin(11, 2.6)), G(3),
      R(12, 7, cp(2)), G(10, bar(3, 3.3)), R(18, 7, laser(5, 2, 80, .5), laser(10, 2, 80, .5, .5), low(13, 3), coin(14, .5)),
      G(4), R(16, 8, laser(4, 4, 140, .4), laser(9, 4, 140, .4, .45), coin(12, 1.3)), G(3), R(12, 7, cp(2)), R(22, 7, laser(3, 2, 70, .5), laser(7, 2, 70, .5, .5), laser(11, 4, 120, .45), laser(16, 2, 70, .5), laser(19, 2, 70, .5, .5)), G(5, bar(2, 3.3)), R(14, 7, fin(9)),
    ] },
    { n: 'Zagen in de nacht', w: 3, p: [
      R(16, 6, saw(9, 1, .8, 0, 0, 120), saw(13, 3.5, .8, 0, -2.6, 130)), G(4, saw(2, 1.5, .9, 0, -3, 110)), R(12, 7, coin(6, 1.3)),
      G(3), R(16, 7, cp(2), laser(6, 4, 130, .5), saw(11, 1, .8, 4, 0, 160)), G(5, bar(2, 3.3)), R(12, 8, coin(6, 2.4)),
      G(4), R(18, 8, saw(5, .7, .7), laser(10, 2, 90, .5), saw(14, .7, .7), coin(14, 2.4)), G(3), R(12, 8, cp(2)), G(6, saw(3, 3.5, .9, 0, 0, 100)), R(16, 8, saw(4, 1, .8, 7, 0, 150), low(12, 3)), G(4, saw(1.5, 2, .8, 0, -3, 110)), R(14, 7, fin(9)),
    ] },
    { n: 'Wolkenkrabbers', w: 3, p: [
      R(16, 6, blk(12, 3, 1, 12, 1)), R(10, 17, wp(1), coin(5, 1.3)), G(22, zip(1, 3.4, 21, -2)), R(12, 12, cp(3)),
      R(10, 12), G(3), R(8, 12, blk(4, 3, 1, 10, 1)), R(10, 20, wp(1), coin(5, 1.3)), G(24, zip(1, 3.4, 22, -4), coin(12, -1.6)), R(12, 10, cp(2)), R(12, 10, blk(8, 3, 1, 12, 1)), R(10, 19, wp(1)), G(5), R(8, 16), G(20, zip(1, 3.4, 19, -3)), R(16, 13, fin(10)),
    ] },
    { n: 'Daklichtjes', w: 3, p: [
      R(12, 6, spring(8)), R(10, 12), G(10, crum(0, 10)), R(10, 12, coin(5, 1.3)), G(6, vent(1, 4, 6, -5)), R(12, 10, cp(2), spring(8, 1, 1)),
      G(12, coin(6, 6)), R(10, 8), G(8, crum(0, 3), crum(5, 3), coin(4, 2)), R(12, 8, laser(6, 4, 150, .5)), G(4), R(12, 8, cp(2)), R(4, null, spring(1)), R(10, 13), G(10, crum(0, 10)), R(8, 13, laser(4, 4, 120, .5)), G(6, vent(1, 4, 6, -4)), R(14, 11, fin(10)),
    ] },
    { n: 'Middernachtsrun', w: 3, p: [
      R(10, 14), D(6), R(4, null), G(7), R(10, 7, belt(0, 9, 1), coin(5, 2.2)), G(7), R(10, 7, low(3, 5)), U(3), G(6),
      R(12, 9, cp(2)), D(4), R(4, null, coin(2, 1.3)), G(8), R(12, 5, low(4, 4), coin(10, 3)), R(6, 5, belt(0, 6, 1)), G(8), R(10, 7, cp(2)), R(8, 12), D(5), R(4, null), G(8), R(10, 6, belt(0, 10, 1)), G(7), R(8, 6, low(2, 3)), U(3), G(7), R(16, 7, fin(10)),
    ] },
    { n: 'Koning van de daken', w: 3, p: [
      R(14, 6, low(6, 3), box(11)), G(6, vent(1, 4, 8, -4)), R(10, 11, laser(5, 4, 120, .5), coin(8, 1.3)), G(14, zip(1, 3.4, 13, -1)), R(10, 11, cp(2)),
      G(9, bar(3, 3.3)), R(8, 11, saw(4, .7, .7)), G(12, plat(1, 0, 3, 7, 0, 240, 0, 1), coin(6, 2.5)), R(14, 11, cp(2), blk(10, 3, 1, 10, 1)), R(10, 19, wp(1), coin(5, 1.3)),
      G(6), R(8, 15), D(5), R(4, null), G(8), R(10, 8, crum(3, 3), spring(8)), R(10, 13), G(4), R(18, 11, fin(12)),
    ] },
  ];
  if (MEDALS) LEVELS.forEach((L, i) => { if (MEDALS[i]) L.medals = MEDALS[i]; });

  /* the endless run: an ever longer rooftop route from safe pieces */
  function genEndless(seed, n = 140) {
    const r = rng(seed), p = [R(20, 6)];
    let h = 6;
    const pick = a => a[Math.floor(r() * a.length)];
    for (let i = 0; i < n; i++) {
      const lvl = Math.min(1, i / 60), k = r();
      const nh = Math.max(3, Math.min(10, h + pick([-2, -1, 0, 0, 1, 1, 2]))), w = 8 + Math.floor(r() * 10);
      const gap = 2 + Math.floor(r() * (2 + lvl * 2.5));
      const it = [];
      if (k < .25) it.push(box(2 + Math.floor(r() * (w - 4))));
      else if (k < .45 && w > 8) it.push(low(2 + Math.floor(r() * (w - 6)), 3));
      else if (k < .55 && lvl > .3) it.push(spikes(3 + Math.floor(r() * (w - 6)), 1));
      if (r() < .35) it.push(coin(Math.floor(w / 2), 1.3 + r() * 1.5));
      p.push(G(nh > h ? Math.min(gap, 3) : gap)); p.push(R(w, nh, ...it)); h = nh;
    }
    return { n: 'Eindeloze run', w: 0, p, seed };
  }

  /* ================= core.js: the deterministic 60 Hz parkour simulation (no DOM; also runs in Node) ================= */
  // Input bits: one byte per step, the same for touch, keyboard, the test bot and the ghost replay.
  const KB = { L: 1, R: 2, J: 4, S: 8, CCW: 16, CW: 32 };
  const ST = { RUN: 0, AIR: 1, SLIDE: 2, WALL: 3, LEDGE: 4, CLIMB: 5, VAULT: 6, ZIP: 7, BAR: 8, CRASH: 9, FALL: 10, FIN: 11 };
  const CORE_V = 3;                                               // bump when the physics change (old ghosts are dropped)
  const Core = (() => {
    const DT = 1 / 60, TAU = Math.PI * 2;
    const C = {
      GRAV: 34, MAXFALL: 22, RUN_ACC: 24, RUN_MAX: 9.5, FRICT: 30, TURN: 46, OVER: 3.2, AIR_ACC: 17, AIR_TURN: 26, AIR_MAX: 9.5,
      JUMP: 12.4, COY: 7, JBUF: 8, SLIDE_FR: 2.6, CRAWL: 2.6, WALL_SLIDE: 4.5, WALLRUN_T: 26, WALLRUN_G: .36, WJ_VX: 8.4, WJ_VY: 12.2,
      VAULT_T: 14, CLIMB_T: 17, SPRING_V: 20.5, BOOST: 2.6, TOP: 15.5, ROT_V: 14, ROT_A: 120,
      HW: .3, HS: 1.6, HL: .8, STEP: .45, CR_FALL: 30, CR_BACK: 300, DEAD: 80, DEADFALL: 46,
    };
    const isSlope = v => v >= 2 && v <= 7;
    const slopeOff = (v, u) => v === 2 ? 1 - u : v === 3 ? u : v === 4 ? 1 - u / 2 : v === 5 ? .5 - u / 2 : v === 6 ? u / 2 : .5 + u / 2;
    const A45 = Math.PI / 4, AG = Math.atan(.5);
    const slopeAng = v => v === 2 ? -A45 : v === 3 ? A45 : v === 4 || v === 5 ? -AG : AG;
    const norm = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

    function newState(L, o = {}) {
      const S = {
        f: 0, x: L.start.x, y: L.start.y, vx: 0, vy: 0, gs: 0, ga: 0, st: ST.RUN, stT: 0, face: 1, h: C.HS, belt: 0,
        rot: 0, rv: 0, ra: 0, wr: 0, coy: 0, jb: 0, prev: 0, jumped: 0, cut: 0, wallS: 0, wallT: 0, wallCoy: 0, wallLock: 0, wallLockS: 0, awayT: 0,
        ride: -1, hcx: 0, hcy: 0, hs: 0, vx0: 0, vy0: 0, vx1: 0, vy1: 0, zi: -1, zs: 0, zv: 0, zipLock: 0, bi: -1, th: 0, om: 0, barLock: 0, ledgeLock: 0,
        cp: 0, coins: 0, dead: 0, done: 0, fin: 0, style: 0, combo: 0, comboT: 0, maxCombo: 0, under: 0, crashes: 0, flips: 0, perfects: 0, maxFlip: 0,
        lives: o.lives || 0, endless: !!o.endless, best: 0, air: 0,
        cr: new Int16Array(L.crum.length), cz: new Float32Array(L.crates.length * 3), ev: [], noEv: !!o.noEv,
      };
      return S;
    }
    function clone(S) {
      const N = Object.assign({}, S); N.cr = S.cr.slice(); N.cz = S.cz.slice(); N.ev = []; return N;
    }
    const ev = (S, t, a) => { if (!S.noEv) S.ev.push({ t, a: a || null }); };

    /* ---------- the world ---------- */
    function tile(L, c, r) { if (c < 0) return 1; if (c >= L.W || r < 0 || r >= L.H) return 0; return L.t[r * L.W + c]; }
    function solid(L, S, c, r) {
      if (c < 0) return true; if (c >= L.W || r < 0 || r >= L.H) return false;
      const v = L.t[r * L.W + c];
      if (v === 1 || v === 9 || v === 10) return true;
      if (v === 8) return S.cr[L.crIdx[r * L.W + c]] < C.CR_FALL;
      return false;
    }
    // highest walkable surface under the feet with y in [y0, y1]; centre column for slopes, the whole width for flat tiles
    const PF = { y: 0, a: 0, belt: 0 };
    function colSurf(L, S, c, x, y0, y1, yPrev, center) {
      const r0 = Math.max(0, Math.floor(y0)), r1 = Math.min(L.H - 1, Math.floor(y1));
      for (let r = r0; r <= r1; r++) {
        const v = tile(L, c, r);
        if (v === 0 || v === 11) continue;
        if (isSlope(v)) { if (!center) return null; const sy = r + slopeOff(v, x - c); return sy >= y0 - 1e-6 && sy <= y1 ? [sy, slopeAng(v), 0] : null; }
        if (v === 12) { if (r >= y0 - 1e-6 && r <= y1 && yPrev <= r + .02) return [r, 0, 0]; continue; }
        if (v === 8 && S.cr[L.crIdx[r * L.W + c]] >= C.CR_FALL) continue;
        return r >= y0 - 1e-6 && r <= y1 ? [r, 0, v === 9 ? 1 : v === 10 ? -1 : 0] : null;
      }
      return null;
    }
    function floorAt(L, S, x, y0, y1, yPrev) {
      const cc = Math.floor(x);
      const cs = colSurf(L, S, cc, x, y0, y1, yPrev, true);
      if (cs && cs[1] !== 0) { PF.y = cs[0]; PF.a = cs[1]; PF.belt = 0; return true; }
      // is the centre column a slope (above the range)? then only the centre counts
      let best = cs ? cs[0] : Infinity, a = 0, belt = cs ? cs[2] : 0;
      const cl = Math.floor(x - C.HW + .02), cr = Math.floor(x + C.HW - .02);
      for (let c = cl; c <= cr; c++) {
        if (c === cc) continue;
        const s = colSurf(L, S, c, x, y0, y1, yPrev, false);
        if (s && s[0] < best) { best = s[0]; belt = s[2]; }
      }
      if (best === Infinity) return false;
      PF.y = best; PF.a = a; PF.belt = belt; return true;
    }
    // does a solid tile block a box [x-HW, x+HW] x [yTop, yBot]?
    function boxHit(L, S, x0, x1, yTop, yBot) {
      const c0 = Math.floor(x0), c1 = Math.floor(x1 - 1e-6), r0 = Math.floor(yTop), r1 = Math.floor(yBot - 1e-6);
      for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (solid(L, S, c, r)) return true;
      return false;
    }
    const canStand = (L, S) => !boxHit(L, S, S.x - C.HW + .02, S.x + C.HW - .02, S.y - C.HS, S.y - .02);
    function platPos(P, f) { const k = (1 - Math.cos(TAU * (f / P.per + P.ph))) / 2; return [P.x + P.mx * k, P.y + P.my * k]; }
    function sawPos(Q, f) { const k = (1 - Math.cos(TAU * (f / Q.per + Q.ph))) / 2; return [Q.x0 + (Q.x1 - Q.x0) * k, Q.y0 + (Q.y1 - Q.y0) * k]; }
    const laserOn = (Z, f) => ((f + Z.ph) % Z.per) < Z.on;

    /* ---------- tricks and style ---------- */
    function trick(S, name, pts) {
      S.combo = S.comboT > 0 ? S.combo + 1 : 1; S.comboT = 160; S.maxCombo = Math.max(S.maxCombo, S.combo);
      const mult = Math.min(5, 1 + (S.combo - 1) * .5), p = Math.round(pts * mult);
      S.style += p; ev(S, 'trick', { name, pts: p, combo: S.combo });
    }

    /* ---------- state changes ---------- */
    function toAir(S) { S.st = ST.AIR; S.stT = 0; S.ride = -1; S.air = 0; }
    function crash(S, why) {
      if (S.st === ST.CRASH || S.st === ST.FALL || S.st === ST.FIN) return;
      ev(S, 'crash', { why, vx: S.vx, vy: S.vy, rot: S.rot, rv: S.rv, st: S.st });
      S.st = ST.CRASH; S.dead = C.DEAD; S.combo = 0; S.comboT = 0; S.crashes++; S.rv = 0;
      if (S.endless) S.lives--;
    }
    function fallOut(S) { ev(S, 'fall', null); S.st = ST.FALL; S.dead = C.DEADFALL; S.combo = 0; S.comboT = 0; S.crashes++; if (S.endless) S.lives--; }
    function respawn(L, S) {
      const P = S.cp > 0 ? L.cps[S.cp - 1] : L.start;
      Object.assign(S, { x: P.x, y: P.y, vx: 0, vy: 0, gs: 0, ga: 0, st: ST.RUN, stT: 0, face: 1, h: C.HS, rot: 0, rv: 0, ra: 0, coy: 0, jb: 0, jumped: 0, cut: 0,
        wallS: 0, wallT: 0, wallCoy: 0, wallLock: 0, ride: -1, zi: -1, bi: -1, belt: 0, under: 0, air: 0, wr: 0 });
      S.cr.fill(0);
      L.crates.forEach((K, i) => { if (K.x > P.x - 1) { S.cz[i * 3] = K.y0; S.cz[i * 3 + 1] = 0; S.cz[i * 3 + 2] = 0; } });
      ev(S, 'respawn', null);
    }
    function land(L, S, y, a, belt, bits) {
      // landing quality: upright or lined up with the slope is good; head first or on your back is a crash
      const r = norm(S.rot), diff = Math.min(Math.abs(r), Math.abs(norm(S.rot - a)));
      const flips = Math.abs(S.ra) > TAU - 1.2 ? Math.round(Math.abs(S.ra) / TAU) : 0;
      S.y = y; S.ga = a; S.belt = belt;
      const impact = S.vy;
      S.gs = S.vx * Math.cos(a) + Math.max(0, S.vy) * Math.sin(a);
      if (diff > 1.3) { S.vx = S.gs * Math.cos(a); crash(S, 'land'); return; }
      S.wr = 0; S.st = S.done ? ST.FIN : (bits & KB.S) ? ST.SLIDE : ST.RUN; S.h = (bits & KB.S) && !S.done ? C.HL : C.HS; S.stT = 0; S.coy = 0; S.air = 0;
      if (diff > .62) { S.gs *= .55; ev(S, 'stumble', null); }
      else if (flips >= 1) {
        const perfect = diff < .3, back = (S.ra < 0) === (S.face > 0);
        S.flips += flips; S.maxFlip = Math.max(S.maxFlip, flips);
        if (perfect) { S.perfects++; const d = S.gs >= 0 ? 1 : -1; S.gs = d * Math.min(C.TOP, Math.abs(S.gs) + C.BOOST + flips * .6); }
        const nm = flips === 1 ? (back ? 'Achterwaartse salto' : 'Salto') : flips === 2 ? 'Dubbele salto' : flips === 3 ? 'Driedubbele salto' : 'Wervelwind';
        trick(S, nm + (perfect ? ' · Perfect!' : '!'), Math.round((flips === 1 ? 100 : flips === 2 ? 260 : flips === 3 ? 480 : 800) * (perfect ? 1.5 : 1)));
        ev(S, 'flipland', { flips, perfect });
      }
      S.rot = 0; S.rv = 0; S.ra = 0;
      ev(S, 'land', { v: impact });
    }

    /* ---------- one step ---------- */
    function step(L, S, bits) {
      if (!S.noEv) S.ev.length = 0;
      S.f++;
      const pressed = bits & ~S.prev; S.prev = bits;
      if (pressed & KB.J) S.jb = C.JBUF; else if (S.jb > 0) S.jb--;
      if (S.comboT > 0 && --S.comboT === 0) S.combo = 0;
      if (S.wallLock > 0) S.wallLock--; if (S.zipLock > 0) S.zipLock--; if (S.barLock > 0) S.barLock--; if (S.ledgeLock > 0) S.ledgeLock--;
      // crumbling tiles and falling crates
      for (let i = 0; i < S.cr.length; i++) { const v = S.cr[i]; if (v > 0) { S.cr[i] = v + 1; if (v + 1 === C.CR_FALL) ev(S, 'crumble', { i }); if (v + 1 >= C.CR_BACK) { const ti = L.crum[i], c = ti % L.W, r = (ti / L.W) | 0; if (!(S.x + C.HW > c && S.x - C.HW < c + 1 && S.y > r && S.y - S.h < r + 1)) S.cr[i] = 0; else S.cr[i] = C.CR_BACK - 10; } } }
      for (let i = 0; i < L.crates.length; i++) {
        const K = L.crates[i], z = i * 3;
        if (S.cz[z + 2] === 0) { S.cz[z] = K.y0; if (S.x > K.trig && S.st !== ST.CRASH) { S.cz[z + 2] = 1; ev(S, 'crate', { i }); } }
        else if (S.cz[z + 2] === 1) { S.cz[z + 1] = Math.min(24, S.cz[z + 1] + 40 * DT); S.cz[z] += S.cz[z + 1] * DT; if (S.cz[z] + 1 >= K.y1) { S.cz[z] = K.y1 - 1; S.cz[z + 2] = 2; ev(S, 'cratehit', { i }); } }
        else if (S.cz[z + 2] < 30) S.cz[z + 2]++;
      }
      if (S.st === ST.CRASH || S.st === ST.FALL) {
        if (S.st === ST.CRASH) { S.vy = Math.min(C.MAXFALL, S.vy + C.GRAV * DT); }
        if (--S.dead <= 0) { if (S.endless && S.lives <= 0) { S.done = 2; S.dead = 0; return; } respawn(L, S); }
        return;
      }
      const dir = ((bits & KB.R) ? 1 : 0) - ((bits & KB.L) ? 1 : 0);
      S.stT++;
      switch (S.st) {
        case ST.RUN: case ST.SLIDE: case ST.FIN: ground(L, S, bits, dir, pressed); break;
        case ST.AIR: air(L, S, bits, dir, pressed); break;
        case ST.WALL: wallSt(L, S, bits, dir); break;
        case ST.LEDGE: ledgeSt(L, S, bits, dir, pressed); break;
        case ST.CLIMB: climbSt(L, S); break;
        case ST.VAULT: vaultSt(L, S); break;
        case ST.ZIP: zipSt(L, S, bits); break;
        case ST.BAR: barSt(L, S, bits, dir); break;
      }
      if (S.st === ST.CRASH || S.st === ST.FALL) return;
      if (S.y > L.H + 3) { fallOut(S); return; }
      hazards(L, S);
      pickups(L, S);
      if (S.endless) S.best = Math.max(S.best, S.x);
    }

    function startJump(L, S, fromGround) {
      const a = S.ga;
      S.vx = S.gs * Math.cos(a); S.vy = Math.min(0, S.gs * Math.sin(a)) - C.JUMP;
      if (S.ride >= 0) { const P = L.plats[S.ride], p0 = platPos(P, S.f - 1), p1 = platPos(P, S.f); S.vx += (p1[0] - p0[0]) * 60; S.vy += Math.min(0, (p1[1] - p0[1]) * 60); }
      S.vx += S.belt * 3.2;
      toAir(S); S.h = C.HS; S.jb = 0; S.coy = 0; S.jumped = 1; S.cut = 0;
      ev(S, 'jump', { slide: fromGround === 2 });
    }

    function ground(L, S, bits, dir, pressed) {
      if (S.st === ST.FIN) { dir = 0; bits = 0; }
      const sa = Math.sin(S.ga);
      // sliding: down = keep going (faster downhill); let go = stand up when there is room
      if (S.st === ST.RUN && (bits & KB.S)) { S.st = ST.SLIDE; S.h = C.HL; S.stT = 0; if (Math.abs(S.gs) > 4) ev(S, 'slide', null); }
      else if (S.st === ST.SLIDE && !(bits & KB.S) && S.stT > 8 && canStand(L, S)) { S.st = ST.RUN; S.h = C.HS; }
      if (S.st === ST.SLIDE) {
        S.gs += C.GRAV * sa * DT;
        const sp = Math.abs(S.gs);
        if (sp > C.CRAWL + .3) S.gs -= Math.sign(S.gs) * C.SLIDE_FR * DT * (Math.abs(sa) > .1 ? .3 : 1);
        else if (dir) { S.gs = dir * C.CRAWL; S.face = dir; }
        else S.gs *= .85;
        if (Math.abs(S.gs) > C.TOP + 3) S.gs = Math.sign(S.gs) * (C.TOP + 3);
        // passing under something low counts as a trick
        const low = boxHit(L, S, S.x - .1, S.x + .1, S.y - C.HS, S.y - C.HL - .05);
        if (low) S.under = 1; else if (S.under) { S.under = 0; if (Math.abs(S.gs) > 4) trick(S, 'Eronderdoor!', 40); }
      } else {
        S.gs += C.GRAV * sa * DT * .5;
        if (dir) {
          S.face = dir;
          const v = S.gs * dir;
          if (v < 0) S.gs += dir * C.TURN * DT;
          else if (v < C.RUN_MAX) S.gs = dir * Math.min(C.RUN_MAX, v + C.RUN_ACC * DT);
          else S.gs = dir * Math.max(C.RUN_MAX, v - C.OVER * DT);
        } else { const d = C.FRICT * DT; S.gs = Math.abs(S.gs) <= d ? 0 : S.gs - Math.sign(S.gs) * d; }
      }
      if (S.jb > 0 && S.st !== ST.FIN && (S.st === ST.RUN || canStand(L, S))) { startJump(L, S, S.st === ST.SLIDE ? 2 : 1); return air(L, S, bits, dir, 0, true); }
      // moving platform under the feet
      if (S.ride >= 0) {
        const P = L.plats[S.ride], p0 = platPos(P, S.f - 1), p1 = platPos(P, S.f);
        S.x += p1[0] - p0[0]; S.y = p1[1];
      }
      // move along the ground
      const vx = S.gs * Math.cos(S.ga) + S.belt * 3.2;
      S.vx = vx; S.vy = S.gs * Math.sin(S.ga);
      if (moveX(L, S, vx * DT, true)) {
        const s = vx > 0 ? 1 : -1;
        if (S.st === ST.RUN && Math.abs(S.gs) > 5 && tryVault(L, S, s)) return;
        if (Math.abs(S.gs) > 6) ev(S, 'bump', null);
        S.gs = 0;
      }
      if (S.ride >= 0) {
        const P = L.plats[S.ride], p = platPos(P, S.f);
        if (S.x < p[0] - C.HW * .7 || S.x > p[0] + P.w + C.HW * .7) { S.ride = -1; leaveGround(S); return; }
        S.y = p[1]; S.ga = 0; S.belt = 0;
      } else {
        const snap = Math.abs(vx) * DT + .1;
        if (floorAt(L, S, S.x, S.y - C.STEP, S.y + snap, S.y)) { S.y = PF.y; S.ga = PF.a; S.belt = PF.belt; }
        else { leaveGround(S); return; }
        // crumbling tiles start to crack when stood on
        const r = Math.floor(S.y + .01);
        for (let c = Math.floor(S.x - C.HW + .02); c <= Math.floor(S.x + C.HW - .02); c++) {
          if (tile(L, c, r) === 8) { const i = L.crIdx[r * L.W + c]; if (S.cr[i] === 0) { S.cr[i] = 1; ev(S, 'crack', { i }); } }
        }
      }
      if (S.st === ST.SLIDE && S.ga === 0 && Math.abs(S.gs) < .05 && !(bits & KB.S) && !canStand(L, S)) S.gs = S.face * C.CRAWL;   // stuck low: crawl out
      // springs and updrafts
      springs(L, S);
      if (S.st === ST.RUN || S.st === ST.SLIDE) for (const V of L.vents) if (S.x > V.x0 && S.x < V.x1 && S.y > V.y0 && S.y <= V.y1 + .05) { leaveGround(S); S.vy = -5; S.jumped = 0; break; }
    }
    function leaveGround(S) {
      const a = S.ga; S.vx = S.gs * Math.cos(a) + S.belt * 3.2; S.vy = S.gs * Math.sin(a);
      if (S.st === ST.SLIDE) S.h = C.HL;
      toAir(S); S.coy = C.COY; S.jumped = 0; S.belt = 0;
    }
    // horizontal move with collision; returns true when a wall stopped us
    function moveX(L, S, dx, grounded) {
      if (!dx) return false;
      const nx = S.x + dx, s = dx > 0 ? 1 : -1, yTop = S.y - S.h + .02, yBot = S.y - (grounded || S.st === ST.AIR ? C.STEP : .02);
      const edge = s > 0 ? nx + C.HW : nx - C.HW, c = Math.floor(edge);
      const r0 = Math.floor(yTop), r1 = Math.floor(yBot - 1e-6);
      for (let r = r0; r <= r1; r++) if (solid(L, S, c, r)) { S.x = s > 0 ? c - C.HW - 1e-4 : c + 1 + C.HW + 1e-4; S.wallS = s; return true; }
      S.x = nx; return false;
    }
    // the top of the wall in column c: a full tile with two free tiles above it, between yA and yB
    function cornerIn(L, S, c, yA, yB) {
      for (let r = Math.max(1, Math.ceil(yA - 1e-6)); r <= Math.floor(yB); r++) {
        if (solid(L, S, c, r) && !solid(L, S, c, r - 1) && !solid(L, S, c, r - 2) && !isSlope(tile(L, c, r - 1)) && tile(L, c, r - 1) !== 11) return r;
      }
      return -1;
    }
    function tryVault(L, S, s) {
      const c = s > 0 ? Math.floor(S.x + C.HW + .01) : Math.floor(S.x - C.HW - .01);
      const r = cornerIn(L, S, c, S.y - 1.2, S.y - .5);
      if (r < 0) return false;
      const sp = Math.max(6.5, Math.abs(S.gs)), x1 = S.x + s * Math.max(1.7, sp * C.VAULT_T * DT);
      for (let k = 1; k <= 4; k++) { const x = S.x + (x1 - S.x) * k / 4; if (boxHit(L, S, x - C.HW + .02, x + C.HW - .02, r - C.HS - .1, r - .05)) return false; }
      S.st = ST.VAULT; S.stT = 0; S.vx0 = S.x; S.vy0 = S.y; S.vx1 = x1; S.vy1 = r - .2; S.gs = s * sp; S.face = s; S.ride = -1;
      ev(S, 'vault', null); trick(S, 'Hup, erover!', 50);
      return true;
    }
    function vaultSt(L, S) {
      const k = Math.min(1, S.stT / C.VAULT_T), e = 1 - (1 - k) * (1 - k);
      S.x = S.vx0 + (S.vx1 - S.vx0) * k; S.y = S.vy0 + (S.vy1 - S.vy0) * Math.min(1, e * 1.6);
      if (k >= 1) { const s = Math.sign(S.gs); S.vx = s * Math.abs(S.gs) * 1.02; S.vy = -2.5; toAir(S); S.jumped = 0; }
    }
    function tryLedge(L, S, s) {
      if (S.ledgeLock > 0 || (S.vy < -6 && S.st !== ST.WALL)) return false;
      const c = s > 0 ? Math.floor(S.x + C.HW + .05) : Math.floor(S.x - C.HW - .05);
      const r = cornerIn(L, S, c, S.y - 2.15, S.y - .4);
      if (r < 0) return false;
      if (r > S.y - 1.15) {                                        // a low edge (chest high): pull yourself straight up onto it
        S.st = ST.CLIMB; S.stT = 6; S.hcx = c; S.hcy = r; S.hs = s; S.face = s; S.vx0 = S.x; S.vy0 = S.y; S.vx1 = s > 0 ? c + .4 : c + .6; S.vy1 = r; S.vx = S.vy = 0; S.rot = 0; S.rv = 0; S.ra = 0;
        ev(S, 'climb', null); return true;
      }
      // room to hang: nothing solid at the hands in our own column
      if (boxHit(L, S, S.x - C.HW + .02, S.x + C.HW - .02, r - .3, r + 1.5)) return false;
      S.st = ST.LEDGE; S.stT = 0; S.hcx = c; S.hcy = r; S.hs = s; S.face = s; S.vx = S.vy = 0; S.rot = 0; S.rv = 0; S.ra = 0;
      S.x = s > 0 ? c - C.HW - .01 : c + 1 + C.HW + .01; S.y = r + 1.55;
      ev(S, 'grab', null);
      return true;
    }
    function ledgeSt(L, S, bits, dir, pressed) {
      const s = S.hs;
      if (S.stT > 3 && (dir === s || S.jb > 0)) { S.st = ST.CLIMB; S.stT = 0; S.vx0 = S.x; S.vy0 = S.y; S.vx1 = s > 0 ? S.hcx + .4 : S.hcx + .6; S.vy1 = S.hcy; S.jb = 0; ev(S, 'climb', null); return; }
      if (dir === -s || (pressed & KB.S)) { toAir(S); S.vx = -s * 1.5; S.vy = 0; S.ledgeLock = 18; }
    }
    function climbSt(L, S) {
      const k = Math.min(1, S.stT / C.CLIMB_T);
      const ky = Math.min(1, k / .6), kx = Math.max(0, (k - .35) / .65);
      S.y = S.vy0 + (S.vy1 - S.vy0) * (1 - (1 - ky) * (1 - ky)); S.x = S.vx0 + (S.vx1 - S.vx0) * kx;
      if (k >= 1) { S.st = ST.RUN; S.wr = 0; S.stT = 0; S.gs = S.hs * 3.5; S.ga = 0; S.h = C.HS; S.y = S.vy1; if (floorAt(L, S, S.x, S.y - .3, S.y + .3, S.y)) S.y = PF.y; }
    }
    function springs(L, S) {
      for (const P of L.springs) {
        if (Math.abs(S.x - P.x) < .62 && S.y >= P.y - .35 && S.y <= P.y + .05 && (S.vy >= 0 || S.st !== ST.AIR)) {
          if (S.st !== ST.AIR) { S.vx = S.gs * Math.cos(S.ga); }
          toAir(S); S.vy = -C.SPRING_V * P.pw; S.jumped = 0; S.h = C.HS; S.y = Math.min(S.y, P.y - .36);
          if (P.dir) S.vx = P.dir * Math.max(Math.abs(S.vx), 11);
          ev(S, 'spring', { x: P.x }); trick(S, 'Boing!', 20); return true;
        }
      }
      return false;
    }

    function air(L, S, bits, dir, pressed, justJumped) {
      if (!justJumped) {
        S.air++;
        // coyote time and the jump buffer
        if (S.jb > 0 && S.coy > 0) { S.gs = S.vx; S.ga = 0; startJump(L, S, 1); }
        else if (S.jb > 0 && S.wallCoy > 0) { wallJump(S, S.wallS); }
        if (S.coy > 0) S.coy--; if (S.wallCoy > 0) S.wallCoy--;
        // steering
        if (dir) {
          const v = S.vx * dir;
          if (v < 0) S.vx += dir * C.AIR_TURN * DT;
          else if (v < C.AIR_MAX) S.vx = dir * Math.min(C.AIR_MAX, v + C.AIR_ACC * DT);
          if (!(bits & (KB.CW | KB.CCW))) S.face = dir;
        }
        // variable jump height
        if (S.jumped && !S.cut && !(bits & KB.J) && S.vy < -3) { S.vy *= .5; S.cut = 1; }
        let g = C.GRAV;
        for (const V of L.vents) if (S.x > V.x0 && S.x < V.x1 && S.y > V.y0 && S.y - .8 < V.y1) { S.vy = Math.max(-11, S.vy - 78 * DT); g = 0; S.cut = 1; break; }
        S.vy = Math.min(C.MAXFALL, S.vy + g * DT);
        // flips: hold a turn button; let go and the body settles back upright
        if (bits & KB.CW) S.rv = Math.min(C.ROT_V, S.rv + C.ROT_A * DT);
        else if (bits & KB.CCW) S.rv = Math.max(-C.ROT_V, S.rv - C.ROT_A * DT);
        else {
          S.rv *= .7;
          if (Math.abs(S.rv) < 1.5) { const tgt = Math.round(S.rot / TAU) * TAU; if (Math.abs(S.rot - tgt) < .75) S.rot += (tgt - S.rot) * .16; }
        }
        if ((pressed & (KB.CW | KB.CCW))) ev(S, 'spin', null);
        const before = Math.floor(Math.abs(S.ra) / TAU + .25);
        S.rot += S.rv * DT; S.ra += S.rv * DT;
        if (Math.floor(Math.abs(S.ra) / TAU + .25) > before) ev(S, 'flip', { n: Math.floor(Math.abs(S.ra) / TAU + .25) });
      }
      if (S.h < C.HS && canStand(L, S)) S.h = C.HS;
      // horizontal
      const vx0 = S.vx;
      if (moveX(L, S, S.vx * DT, false)) {
        const s = S.wallS;
        if (tryLedge(L, S, s)) return;
        // wall: run up it when fast and rising, else slide down
        const c = s > 0 ? Math.floor(S.x + C.HW + .05) : Math.floor(S.x - C.HW - .05);
        if (!(S.wallLock > 0 && S.wallLockS === s) && solid(L, S, c, Math.floor(S.y - 1.2)) && (Math.abs(vx0) > 1 || dir === s)) {
          S.st = ST.WALL; S.stT = 0; S.wallT = S.vy < 3 && Math.abs(vx0) > 4 && !S.wr ? C.WALLRUN_T : 0; if (S.wallT) S.wr = 1; S.face = s; S.awayT = 0;
          if (S.wallT) { S.vy = Math.min(S.vy, -8.5); ev(S, 'wallrun', null); trick(S, 'Muurloop!', 30); } else ev(S, 'wall', null);
          S.rot = 0; S.rv = 0; S.ra = 0; S.vx = 0; S.h = C.HS;
          return;
        }
        S.vx = 0;
      }
      // vertical
      const yPrev = S.y;
      S.y += S.vy * DT;
      if (S.vy < 0) {
        const rTop = Math.floor(S.y - S.h);
        if (boxHit(L, S, S.x - C.HW + .04, S.x + C.HW - .04, S.y - S.h, S.y - S.h + .01)) { S.y = rTop + 1 + S.h; S.vy = 0; S.cut = 1; ev(S, 'bonk', null); }
        // pushed up out of a roof edge we are rising past (a forgiving ledge assist)
        else if (floorAt(L, S, S.x, S.y - C.STEP, S.y, yPrev) && PF.y < S.y) S.y = PF.y;
      } else {
        // moving platforms (one-way)
        for (let i = 0; i < L.plats.length; i++) {
          const P = L.plats[i], p0 = platPos(P, S.f - 1), p1 = platPos(P, S.f);
          if (S.x > p1[0] - C.HW * .7 && S.x < p1[0] + P.w + C.HW * .7 && yPrev <= p0[1] + .06 && S.y >= p1[1]) {
            S.ride = i; land(L, S, p1[1], 0, 0, bits); if (S.st === ST.RUN || S.st === ST.SLIDE) S.gs = S.vx; return;
          }
        }
        if (floorAt(L, S, S.x, Math.min(yPrev, S.y) - C.STEP, S.y, yPrev)) {
          land(L, S, PF.y, PF.a, PF.belt, bits);
          if (S.jb > 0 && (S.st === ST.RUN || S.st === ST.SLIDE)) { startJump(L, S, 1); }
          else if (S.st === ST.RUN || S.st === ST.SLIDE) springs(L, S);
          return;
        }
      }
      if (springs(L, S)) return;
      // grab a cable or a swing bar
      if (S.zipLock <= 0) for (let i = 0; i < L.zips.length; i++) {
        const Z = L.zips[i], hx = S.x, hy = S.y - 1.75, dx = Z.x1 - Z.x0, dy = Z.y1 - Z.y0, len = Math.hypot(dx, dy);
        const u = ((hx - Z.x0) * dx + (hy - Z.y0) * dy) / len;
        if (u < -.2 || u > len - .8) continue;
        const px = Z.x0 + dx * u / len, py = Z.y0 + dy * u / len;
        if (Math.hypot(hx - px, hy - py) < .5 && hy >= py - .3) {
          S.st = ST.ZIP; S.zi = i; S.zs = Math.max(0, u); S.zv = Math.max(5, (S.vx * dx + Math.max(0, S.vy) * dy) / len); S.rot = 0; S.rv = 0; S.ra = 0; S.face = 1;
          ev(S, 'zip', null); return;
        }
      }
      if (S.barLock <= 0) for (let i = 0; i < L.bars.length; i++) {
        const B = L.bars[i], hx = S.x, hy = S.y - 1.7;
        if (Math.hypot(hx - B.x, hy - B.y) < .6) {
          S.st = ST.BAR; S.bi = i; S.th = Math.atan2(S.x - B.x, S.y - .9 - B.y);
          S.om = (S.vx * Math.cos(S.th) - S.vy * Math.sin(S.th)) / 1.1; S.rot = -S.th; S.rv = 0; S.ra = 0;
          ev(S, 'bar', null); return;
        }
      }
      if (S.ga !== 0) S.ga = 0;
    }
    function wallJump(S, s) {
      S.vx = -s * C.WJ_VX; S.vy = -C.WJ_VY; toAir(S); S.face = -s; S.wallLock = 12; S.wallLockS = s; S.wallCoy = 0; S.jb = 0; S.jumped = 1; S.cut = 0; S.h = C.HS;
      ev(S, 'walljump', null); trick(S, 'Muursprong!', 40);
    }
    function wallSt(L, S, bits, dir) {
      const s = S.wallS, c = s > 0 ? Math.floor(S.x + C.HW + .05) : Math.floor(S.x - C.HW - .05);
      if (S.jb > 0) { wallJump(S, s); return; }
      if (S.wallT > 0) { S.vy += C.GRAV * C.WALLRUN_G * DT; if (--S.wallT === 0 || S.vy > 0) S.wallT = 0; }
      else S.vy = Math.min(C.WALL_SLIDE, S.vy + C.GRAV * .6 * DT);
      if (dir === -s) { if (++S.awayT > 6) { toAir(S); S.vx = -s * 2.5; S.wallCoy = 6; return; } } else S.awayT = 0;
      const yPrev = S.y; S.y += S.vy * DT;
      if (S.vy < 0 && boxHit(L, S, S.x - C.HW + .04, S.x + C.HW - .04, S.y - S.h, S.y - S.h + .01)) { S.y = Math.floor(S.y - S.h) + 1 + S.h; S.vy = 0; }
      if (tryLedge(L, S, s)) return;
      if (S.vy >= 0 && floorAt(L, S, S.x, yPrev - C.STEP, S.y, yPrev)) { S.y = PF.y; S.st = ST.RUN; S.wr = 0; S.gs = 0; S.ga = PF.a; S.stT = 0; ev(S, 'land', { v: S.vy }); return; }
      // the wall ended (we rose above it or slid below it)
      if (!solid(L, S, c, Math.floor(S.y - 1.2)) && !solid(L, S, c, Math.floor(S.y - .6))) { toAir(S); S.vx = s * 2; S.wallCoy = 6; }
    }
    function zipSt(L, S, bits) {
      const Z = L.zips[S.zi], dx = Z.x1 - Z.x0, dy = Z.y1 - Z.y0, len = Math.hypot(dx, dy), sn = dy / len;
      S.zv = Math.min(16, S.zv + (C.GRAV * sn * .75 - .8) * DT); S.zs += S.zv * DT;
      const hx = Z.x0 + dx * S.zs / len, hy = Z.y0 + dy * S.zs / len;
      S.x = hx; S.y = hy + 1.75; S.vx = S.zv * dx / len; S.vy = S.zv * dy / len;
      if (S.jb > 0 || S.zs >= len - .25) {
        toAir(S); S.zipLock = 24; S.jumped = 0;
        if (S.jb > 0) { S.vy -= 9; S.jb = 0; S.jumped = 1; S.cut = 0; ev(S, 'jump', null); }
        trick(S, 'Kabelbaan!', 40);
      }
    }
    function barSt(L, S, bits, dir) {
      const B = L.bars[S.bi], R0 = 1.1;
      S.om += (-(C.GRAV / R0) * Math.sin(S.th) * .55 + dir * 5.5 * (Math.cos(S.th) > 0 ? 1 : .4)) * DT;
      S.om *= .997; S.om = Math.max(-11, Math.min(11, S.om));
      const th0 = S.th; S.th += S.om * DT; S.ra += -(S.th - th0);
      S.rot = -S.th; S.x = B.x + Math.sin(S.th) * .9; S.y = B.y + Math.cos(S.th) * .9 + .8;
      if (S.om > .5) S.face = 1; else if (S.om < -.5) S.face = -1;
      if (S.jb > 0) {
        const v = S.om * R0 * 1.3;
        S.vx = v * Math.cos(S.th); S.vy = -v * Math.sin(S.th) - 4; S.rv = -S.om * .9; S.ra = 0;
        toAir(S); S.barLock = 22; S.jb = 0; S.jumped = 0; S.h = C.HS;
        // never release into a wall
        if (boxHit(L, S, S.x - C.HW, S.x + C.HW, S.y - S.h, S.y - .02)) { S.x = B.x; S.y = B.y + 1.75; }
        ev(S, 'barjump', null); trick(S, 'Zwaai!', 50);
      }
    }

    /* ---------- hazards and pickups ---------- */
    function hazards(L, S) {
      const x0 = S.x - .22, x1 = S.x + .22, y0 = S.y - S.h + .15, y1 = S.y - .04;
      for (let c = Math.floor(x0); c <= Math.floor(x1); c++) for (let r = Math.floor(y0); r <= Math.floor(y1); r++) {
        if (tile(L, c, r) === 11 && y1 > r + .5 && x1 > c + .1 && x0 < c + .9) { crash(S, 'spikes'); return; }
      }
      for (const Q of L.saws) { const p = sawPos(Q, S.f), cx = Math.max(x0, Math.min(x1, p[0])), cy = Math.max(y0, Math.min(y1, p[1])); if (Math.hypot(cx - p[0], cy - p[1]) < Q.r * .82) { crash(S, 'saw'); return; } }
      for (const Z of L.lasers) if (laserOn(Z, S.f) && x1 > Z.x - .1 && x0 < Z.x + .1 && y1 > Z.y0 && y0 < Z.y1) { crash(S, 'laser'); return; }
      for (let i = 0; i < L.crates.length; i++) { if (S.cz[i * 3 + 2] !== 1) continue; const K = L.crates[i], ky = S.cz[i * 3]; if (x1 > K.x - .45 && x0 < K.x + .45 && y1 > ky + .1 && y0 < ky + .95) { crash(S, 'crate'); return; } }
    }
    function pickups(L, S) {
      for (let i = 0; i < L.coins.length; i++) {
        if (S.coins & (1 << i)) continue; const Q = L.coins[i];
        if (Math.abs(S.x - Q.x) < .8 && Math.abs(S.y - S.h / 2 - Q.y) < S.h / 2 + .45) { S.coins |= 1 << i; ev(S, 'coin', { i }); }
      }
      for (let i = S.cp; i < L.cps.length; i++) { const P = L.cps[i]; if (S.x >= P.x && Math.abs(S.y - P.y) < 4) { S.cp = i + 1; ev(S, 'cp', { i }); } }
      if (!S.done && !S.endless && S.x >= L.finish.x && S.y < L.finish.y + 3) {
        S.done = 1; S.fin = S.f; S.st = (S.st === ST.RUN || S.st === ST.SLIDE) ? ST.FIN : S.st; ev(S, 'finish', null);
      }
    }
    return { C, DT, newState, clone, step, platPos, sawPos, laserOn, tile, solid, isSlope, slopeOff, slopeAng, floorAt, PF, canStand, norm };
  })();

  /* ================= rig.js: the runner – a procedural 2D skeleton, poses, animation and a cartoon ragdoll ================= */
  // Units are tiles (the runner is 1.6 tall). Limb angles: 0 = straight down, positive = towards the facing direction.
  const OUTFITS = [
    { nm: 'Straatrenner', need: 0, hood: ['#26c2b4', '#14877d'], trim: '#e9fffb', pants: '#2b3556', shoe: ['#ffffff', '#ff7a2a'], hat: 'beanie', hatc: ['#f4b43a', '#c98418'], pom: '#fff3d6', phones: '#e8453c', skin: ['#d9a07a', '#b97f5a'] },
    { nm: 'Zonsondergang', need: 10, hood: ['#ff7466', '#cc4a40'], trim: '#ffe0a0', pants: '#3a2f4a', shoe: ['#ffe066', '#7a3ad0'], hat: 'beanie', hatc: ['#8a5ae0', '#5a34a8'], pom: '#ffd0f0', phones: '#ffffff', skin: ['#d9a07a', '#b97f5a'] },
    { nm: 'Bouwvakker', need: 25, hood: ['#ff8f1f', '#d0650a'], trim: '#f4ffb0', pants: '#3b5f99', shoe: ['#8a5a32', '#4a2c16'], hat: 'helmet', hatc: ['#ffd23a', '#d8a010'], pom: '#fff', phones: '#3a3a3a', skin: ['#d9a07a', '#b97f5a'] },
    { nm: 'Matroos', need: 45, hood: ['#f4f6fb', '#c8d0e0'], trim: '#2a5ec8', pants: '#1f2a4a', shoe: ['#ffffff', '#2a5ec8'], hat: 'cap', hatc: ['#ffffff', '#1f2a4a'], pom: '#2a5ec8', phones: '#e8453c', skin: ['#d9a07a', '#b97f5a'], stripe: '#2a5ec8' },
    { nm: 'Neon', need: 65, hood: ['#2a2440', '#171326'], trim: '#ff4fd8', pants: '#14111f', shoe: ['#5ef0ff', '#ff4fd8'], hat: 'beanie', hatc: ['#2a2440', '#171326'], pom: '#5ef0ff', phones: '#5ef0ff', skin: ['#d9a07a', '#b97f5a'], glow: 1 },
    { nm: 'Goud', need: 90, hood: ['#ffd76a', '#d8a020'], trim: '#fff6c8', pants: '#f4efe2', shoe: ['#ffe9a0', '#d8a020'], hat: 'beanie', hatc: ['#ffcc3a', '#c89010'], pom: '#ffffff', phones: '#fff6c8', skin: ['#d9a07a', '#b97f5a'] },
  ];
  const Rig = (() => {
    const TAU = Math.PI * 2;
    const LEN = { th: .46, sh: .44, ua: .3, fa: .28, torso: .52, neck: .1, head: .21 };
    const base = () => ({ lean: 0, hip: .9, t1: .08, k1: .1, t2: -.08, k2: .1, a1: .15, e1: .3, a2: -.15, e2: .3, tilt: 0, f1: 0, f2: 0 });
    const mix = (a, b, k) => { const o = {}; for (const n in a) o[n] = a[n] + (b[n] - a[n]) * k; return o; };
    // the pose of the runner for a simulation state (+ a little animation state in A)
    function pose(S, A, t) {
      const sp = Math.abs(S.st === 0 || S.st === 2 || S.st === 11 ? S.gs : S.vx);
      let P = base();
      switch (S.st) {
        case 0: case 11: {                                         // run / idle / finish
          if (sp < .4) {
            const b = Math.sin(t * 2.4) * .015;
            P = Object.assign(base(), { hip: .9 + b, a1: .12 + b, a2: -.1 - b, e1: .35, e2: .35, tilt: -b });
            if (S.st === 11) { const j = Math.abs(Math.sin(t * 7)); P = Object.assign(base(), { hip: .9 + j * .08, a1: 2.7 + Math.sin(t * 7) * .15, e1: .2, a2: -2.7 - Math.sin(t * 7) * .15, e2: .2, t1: .05, t2: -.05, tilt: -.15 }); }
          } else {
            const ph = A.ph, k = Math.min(1, sp / 9.5), spr = Math.max(0, (sp - 10) / 5);
            const amp = .45 + .55 * k + spr * .15, s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
            P.lean = .08 + .2 * k + spr * .14 - S.ga * .4;
            P.hip = .9 - .035 * Math.abs(Math.cos(ph)) * k - .03 * k;
            P.t1 = s1 * amp * .95 + .15 * k; P.t2 = s2 * amp * .95 + .15 * k;
            P.k1 = .25 + (Math.cos(ph) > 0 ? 1.4 * k * Math.max(0, -s1 + .3) : .25 * k) ; P.k2 = .25 + (Math.cos(ph + Math.PI) > 0 ? 1.4 * k * Math.max(0, -s2 + .3) : .25 * k);
            P.a1 = -s1 * (.5 + .7 * k) + .1; P.a2 = -s2 * (.5 + .7 * k) + .1; P.e1 = 1.1 + .4 * k; P.e2 = 1.1 + .4 * k;
            P.tilt = -.05 * k;
            if (S.st === 11) P.a1 = 2.4, P.a2 = 2.6, P.e1 = .2, P.e2 = .2;
          }
          if (A.land > 0) { const q = A.land; P.hip -= .22 * q; P.k1 += 1.0 * q; P.k2 += 1.0 * q; P.t1 += .5 * q; P.t2 += .3 * q; P.lean += .3 * q; P.a1 = P.a1 * (1 - q) + .9 * q; P.a2 = P.a2 * (1 - q) - .4 * q; }
          break;
        }
        case 2: {                                                  // slide (or crawl when slow)
          if (sp > 3) P = Object.assign(base(), { lean: -1.05, hip: .34, t1: 1.45, k1: .12, t2: .95, k2: 1.7, a1: .8, e1: .4, a2: -1.15, e2: .15, tilt: .55 });
          else { const c = Math.sin(A.ph * 1.4) * .25; P = Object.assign(base(), { lean: .95, hip: .5, t1: .9 + c, k1: 1.9, t2: .9 - c, k2: 1.9, a1: 1.1 - c, e1: .5, a2: 1.1 + c, e2: .5, tilt: -.6 }); }
          break;
        }
        case 1: {                                                  // in the air: jump, fall, tuck while flipping
          const up = S.vy < 0, k = Math.max(-1, Math.min(1, S.vy / 12));
          if (up) P = Object.assign(base(), { lean: .12, hip: .9, t1: .75, k1: 1.25, t2: -.3, k2: .55, a1: 2.3, e1: .35, a2: -.9, e2: .6, tilt: -.1 });
          else P = Object.assign(base(), { lean: .05, hip: .9, t1: .35 + .2 * k, k1: .5, t2: -.15, k2: .35, a1: 1.6 + .5 * k, e1: .4, a2: -1.2 - .4 * k, e2: .4, tilt: .05 });
          const tuck = Math.min(1, Math.abs(S.rv) / 6);
          if (tuck > 0) P = mix(P, { lean: .62, hip: .8, t1: 2.15, k1: 2.35, t2: 1.95, k2: 2.25, a1: 1.55, e1: .75, a2: 1.35, e2: .85, tilt: .35, f1: 0, f2: 0 }, tuck);
          break;
        }
        case 3: {                                                  // wall: run up it or slide down
          if (S.wallT > 0) { const ph = A.ph * 1.3, s = Math.sin(ph); P = Object.assign(base(), { lean: -.15, hip: .9, t1: 1.35 + s * .5, k1: 1.2 - s * .5, t2: 1.35 - s * .5, k2: 1.2 + s * .5, a1: 2.6 + s * .3, e1: .4, a2: -1.2 - s * .3, e2: .6, tilt: -.3 }); }
          else P = Object.assign(base(), { lean: -.2, hip: .88, t1: 1.0, k1: 1.5, t2: .6, k2: 1.1, a1: 2.5, e1: .5, a2: 1.9, e2: .9, tilt: -.25 });
          break;
        }
        case 4: P = Object.assign(base(), { lean: .1, hip: .92, t1: .25, k1: .5, t2: .05, k2: .25, a1: 2.95, e1: .05, a2: 2.85, e2: .1, tilt: -.2 }); break;
        case 5: { const k = Math.min(1, S.stT / 17), h = { lean: .1, hip: .92, t1: .25, k1: .5, t2: .05, k2: .25, a1: 2.95, e1: .05, a2: 2.85, e2: .1, tilt: -.2 }, c = { lean: .9, hip: .55, t1: 1.6, k1: 2.3, t2: 1.0, k2: 1.6, a1: .7, e1: .3, a2: .4, e2: .3, tilt: -.2 };
          P = Object.assign(base(), k < .55 ? mix(h, c, k / .55) : mix(c, base(), (k - .55) / .45)); break; }
        case 6: { const k = Math.min(1, S.stT / 14); P = Object.assign(base(), { lean: .9 - k * .5, hip: .8, t1: 1.5, k1: 1.4, t2: 1.2, k2: 1.7, a1: .25, e1: .1, a2: 1.6, e2: .6, tilt: -.4 }); break; }
        case 7: P = Object.assign(base(), { lean: -.05, hip: .9, t1: .55, k1: .4, t2: .35, k2: .5, a1: 3.0, e1: .1, a2: 2.9, e2: .15, tilt: -.25 }); break;
        case 8: { const w = Math.max(-1, Math.min(1, S.om / 6)); P = Object.assign(base(), { lean: 0, hip: .9, t1: .15 + w * .5, k1: .2 + Math.max(0, -w) * .9, t2: .1 + w * .4, k2: .15 + Math.max(0, -w) * .8, a1: 3.05, e1: .05, a2: 3.0, e2: .05, tilt: .1 }); break; }
        default: break;
      }
      return P;
    }
    // joints in world units: J = { hip, neck, head, k1, f1, k2, f2, s, e1, h1, e2, h2 } (each [x, y])
    function joints(P, x, y, face, rot, J = {}) {
      const d = face, cx = x, cy = y - .85, cr = Math.cos(rot), sr = Math.sin(rot);
      const tf = (lx, ly) => { const X = lx * d, Y = ly - (-.85); /* relative to the centre */ const ry = ly + .85; return [cx + X * cr - (ly + .85) * sr, cy + X * sr + (ly + .85) * cr]; };
      const hip = [0, -P.hip];
      const neck = [hip[0] + Math.sin(P.lean) * LEN.torso, hip[1] - Math.cos(P.lean) * LEN.torso];
      const head = [neck[0] + Math.sin(P.lean + P.tilt) * (LEN.neck + LEN.head * .9), neck[1] - Math.cos(P.lean + P.tilt) * (LEN.neck + LEN.head * .9)];
      const sh = [neck[0] - Math.sin(P.lean) * .04, neck[1] + Math.cos(P.lean) * .04];
      const limb = (o, a, l) => [o[0] + Math.sin(a) * l, o[1] + Math.cos(a) * l];
      const k1 = limb(hip, P.t1, LEN.th), f1 = limb(k1, P.t1 - P.k1, LEN.sh), k2 = limb(hip, P.t2, LEN.th), f2 = limb(k2, P.t2 - P.k2, LEN.sh);
      const e1 = limb(sh, P.a1, LEN.ua), h1 = limb(e1, P.a1 + P.e1, LEN.fa), e2 = limb(sh, P.a2, LEN.ua), h2 = limb(e2, P.a2 + P.e2, LEN.fa);
      const all = { hip, neck, head, s: sh, k1, f1, k2, f2, e1, h1, e2, h2 };
      for (const k in all) J[k] = tf(all[k][0], all[k][1]);
      J.face = face; J.rot = rot; J.lean = P.lean * face + rot; J.tilt = (P.lean + P.tilt) * face + rot; J.ft1 = (P.t1 - P.k1) * face; J.ft2 = (P.t2 - P.k2) * face;
      return J;
    }
    /* ---------- drawing (g is scaled to world units) ---------- */
    function cap(g, a, b, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    function cap3(g, a, b, c, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.stroke(); }
    function shoe(g, f, k, face, O, dark) {
      const a = Math.atan2(f[1] - k[1], f[0] - k[0]) - Math.PI / 2;
      g.save(); g.translate(f[0], f[1]); g.rotate(a);
      g.fillStyle = dark ? O.shoe[1] : O.shoe[1]; g.beginPath(); g.ellipse(face * .06, .045, .15, .055, 0, 0, TAU); g.fill();
      g.fillStyle = dark ? shade(O.shoe[0], .8) : O.shoe[0]; g.beginPath(); g.ellipse(face * .05, 0, .13, .065, 0, 0, TAU); g.fill();
      g.restore();
    }
    const SH = {};
    function shade(c, k) { const key = c + k; if (SH[key]) return SH[key]; const n = parseInt(c.slice(1), 16); const r = Math.round(((n >> 16) & 255) * k), gg = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k); return (SH[key] = `rgb(${Math.min(255, r)},${Math.min(255, gg)},${Math.min(255, b)})`); }
    let LOW = false;
    function draw(g, J, O, alpha = 1, ghost = false, low = false) {
      LOW = low || ghost;
      g.save(); if (alpha < 1) g.globalAlpha = alpha;
      g.lineCap = 'round'; g.lineJoin = 'round';
      const f = J.face, gh = ghost;
      const C = gh ? { hood: ['#cfe6ff', '#9ec2ec'], trim: '#ffffff', pants: '#8aa6d0', shoe: ['#ffffff', '#cfe0ff'], hatc: ['#e6f2ff', '#b8d2f0'], pom: '#fff', phones: '#e6f2ff', skin: ['#e8f2ff', '#bcd2ee'], hat: O.hat } : O;
      // back limbs
      cap3(g, J.hip, J.k2, J.f2, .17, shade(C.pants, .78)); shoe(g, J.f2, J.k2, f, C, 1);
      cap3(g, J.s, J.e2, J.h2, .13, C.hood[1]);
      g.fillStyle = C.skin[1]; g.beginPath(); g.arc(J.h2[0], J.h2[1], .065, 0, TAU); g.fill();
      // torso (hoodie)
      const nx = J.neck[0] - J.hip[0], ny = J.neck[1] - J.hip[1], ln = Math.hypot(nx, ny) || 1, px = -ny / ln, py = nx / ln;
      g.fillStyle = C.hood[0];
      g.beginPath();
      g.moveTo(J.hip[0] + px * .15, J.hip[1] + py * .15);
      g.quadraticCurveTo(J.hip[0] + nx * .5 + px * .2, J.hip[1] + ny * .5 + py * .2, J.neck[0] + px * .14, J.neck[1] + py * .14);
      g.lineTo(J.neck[0] - px * .14, J.neck[1] - py * .14);
      g.quadraticCurveTo(J.hip[0] + nx * .5 - px * .2, J.hip[1] + ny * .5 - py * .2, J.hip[0] - px * .15, J.hip[1] - py * .15);
      g.closePath(); g.fill();
      // belly shade + hood on the back + a stripe
      const bx = -f * px, by = -f * py;
      if (!LOW) { g.fillStyle = C.hood[1]; g.beginPath(); g.ellipse(J.neck[0] - bx * .1 - nx * .08, J.neck[1] - by * .1 - ny * .08, .11, .08, Math.atan2(ny, nx), 0, TAU); g.fill(); }
      g.strokeStyle = C.trim; g.lineWidth = .045; g.beginPath(); g.moveTo(J.hip[0] + nx * .25 + bx * .15, J.hip[1] + ny * .25 + by * .15); g.lineTo(J.hip[0] + nx * .75 + bx * .15, J.hip[1] + ny * .75 + by * .15); g.stroke();
      if (C.stripe && !gh) { g.strokeStyle = C.stripe; g.lineWidth = .04; g.beginPath(); for (const k of [.3, .55, .8]) { g.moveTo(J.hip[0] + nx * k + px * .15, J.hip[1] + ny * k + py * .15); g.lineTo(J.hip[0] + nx * k - px * .15, J.hip[1] + ny * k - py * .15); } g.stroke(); }
      g.fillStyle = C.hood[1]; g.beginPath(); g.ellipse(J.hip[0], J.hip[1], .15, .07, Math.atan2(ny, nx) + Math.PI / 2, 0, TAU); g.fill();
      // front leg
      cap3(g, J.hip, J.k1, J.f1, .18, C.pants); shoe(g, J.f1, J.k1, f, C, 0);
      // head
      head(g, J, C, gh);
      // front arm
      cap3(g, J.s, J.e1, J.h1, .135, C.hood[0]);
      g.fillStyle = C.trim; g.beginPath(); g.arc(J.e1[0] + (J.h1[0] - J.e1[0]) * .72, J.e1[1] + (J.h1[1] - J.e1[1]) * .72, .07, 0, TAU); g.fill();
      g.fillStyle = C.skin[0]; g.beginPath(); g.arc(J.h1[0], J.h1[1], .07, 0, TAU); g.fill();
      g.restore();
    }
    function head(g, J, C, gh) {
      const [hx, hy] = J.head, f = J.face, r = LEN.head;
      g.save(); g.translate(hx, hy); g.rotate(J.tilt); g.scale(f, 1);
      // neck
      g.fillStyle = C.skin[1]; g.fillRect(-.05, .1, .1, .12);
      // face
      g.fillStyle = C.skin[0]; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(r * .92, r * .12, .045, .05, 0, 0, TAU); g.fill();                 // nose
      if (!gh) {
        g.fillStyle = '#2a1a14'; g.beginPath(); g.ellipse(r * .52, -r * .08, .028, .038, 0, 0, TAU); g.fill();
        if (!LOW) {
          g.fillStyle = '#fff'; g.beginPath(); g.arc(r * .55, -r * .13, .01, 0, TAU); g.fill();
          g.strokeStyle = '#7a3a2a'; g.lineWidth = .022; g.beginPath(); g.arc(r * .5, r * .3, .06, .2, 1.4); g.stroke();
          g.fillStyle = 'rgba(255,120,110,.35)'; g.beginPath(); g.arc(r * .35, r * .32, .045, 0, TAU); g.fill();
        }
      }
      // hat
      if (C.hat === 'helmet') {
        g.fillStyle = C.hatc[0]; g.beginPath(); g.ellipse(-r * .05, -r * .25, r * 1.08, r * .95, 0, Math.PI, 0); g.fill();
        g.fillRect(-r * 1.15, -r * .3, r * 2.45, r * .2);
        g.fillStyle = C.hatc[1]; g.fillRect(-r * .15, -r * 1.15, r * .25, r * .9);
      } else if (C.hat === 'cap') {
        g.fillStyle = C.hatc[0]; g.beginPath(); g.ellipse(-r * .05, -r * .3, r * 1.0, r * .82, 0, Math.PI, 0); g.fill();
        g.fillStyle = C.hatc[1]; g.beginPath(); g.ellipse(r * .75, -r * .32, r * .65, r * .14, -.05, 0, TAU); g.fill();
        g.fillRect(-r * 1.02, -r * .42, r * 1.9, r * .14);
      } else {
        g.fillStyle = C.hatc[0]; g.beginPath(); g.ellipse(-r * .1, -r * .32, r * 1.04, r * .98, 0, Math.PI * .98, Math.PI * 2.02); g.fill();
        g.fillStyle = C.hatc[1]; g.beginPath(); g.roundRect ? g.roundRect(-r * 1.12, -r * .5, r * 2.1, r * .34, r * .12) : g.rect(-r * 1.12, -r * .5, r * 2.1, r * .34); g.fill();
        if (!LOW) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = .015; g.beginPath(); for (let i = -3; i <= 3; i++) { g.moveTo(i * r * .25, -r * .52); g.lineTo(i * r * .25, -r * .2); } g.stroke(); }
        g.fillStyle = C.pom; g.beginPath(); g.arc(-r * .3, -r * 1.32, r * .3, 0, TAU); g.fill();
      }
      // headphones: band over the top and a cup on the ear
      g.strokeStyle = C.phones; g.lineWidth = .05; g.beginPath(); g.arc(-r * .05, -r * .1, r * 1.12, Math.PI * 1.08, Math.PI * 1.98); g.stroke();
      g.fillStyle = gh ? C.phones : shade(C.phones, .7); g.beginPath(); g.ellipse(-r * .2, r * .02, r * .36, r * .42, 0, 0, TAU); g.fill();
      g.fillStyle = C.phones; g.beginPath(); g.ellipse(-r * .14, r * .02, r * .27, r * .34, 0, 0, TAU); g.fill();
      if (C.glow && !gh) { g.strokeStyle = 'rgba(94,240,255,.8)'; g.lineWidth = .02; g.beginPath(); g.ellipse(-r * .14, r * .02, r * .2, r * .26, 0, 0, TAU); g.stroke(); }
      g.restore();
    }
    /* ---------- the ragdoll (visual only): verlet points + sticks, bumping into the level ---------- */
    const RD_P = ['hip', 'neck', 'head', 'k1', 'f1', 'k2', 'f2', 'e1', 'h1', 'e2', 'h2'];
    const RD_S = [['hip', 'neck'], ['neck', 'head'], ['hip', 'k1'], ['k1', 'f1'], ['hip', 'k2'], ['k2', 'f2'], ['neck', 'e1'], ['e1', 'h1'], ['neck', 'e2'], ['e2', 'h2'], ['head', 'hip', .9], ['k1', 'k2', .5], ['f1', 'neck', .4], ['f2', 'neck', .4], ['h1', 'hip', .3], ['h2', 'hip', .3]];
    function ragdoll(J, vx, vy, spin) {
      const R = { p: {}, s: [], t: 0 };
      for (const k of RD_P) { const [x, y] = J[k]; const ox = (y - J.hip[1]) * spin * (1 / 60), oy = -(x - J.hip[0]) * spin * (1 / 60); R.p[k] = { x, y, px: x - vx / 60 - ox, py: y - vy / 60 - oy }; }
      for (const [a, b, st] of RD_S) R.s.push([a, b, Math.hypot(R.p[a].x - R.p[b].x, R.p[a].y - R.p[b].y), st || 1]);
      R.face = J.face; return R;
    }
    function ragStep(R, solidAt, dt) {
      R.t += dt;
      for (const k in R.p) { const q = R.p[k], vx = (q.x - q.px) * .995, vy = (q.y - q.py) * .995; q.px = q.x; q.py = q.y; q.x += vx; q.y += vy + 34 * dt * dt; }
      for (let it = 0; it < 4; it++) {
        for (const [a, b, l, st] of R.s) { const A = R.p[a], B = R.p[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-6, k = (d - l) / d * .5 * st; A.x += dx * k; A.y += dy * k; B.x -= dx * k; B.y -= dy * k; }
        for (const k in R.p) {
          const q = R.p[k];
          if (solidAt(q.x, q.y)) {                                 // push out upwards (or sideways) and rub
            const ty = Math.floor(q.y);
            if (!solidAt(q.x, ty - .01)) { q.y = ty - .001; const vx = q.x - q.px; q.px = q.x - vx * .55; if (q.py < q.y) q.py = q.y + (q.y - q.py) * .3; }
            else if (!solidAt(q.px, q.y)) { q.x = q.px; }
            else { q.x = q.px; q.y = q.py; }
          }
        }
      }
    }
    function ragJoints(R, J = {}) {
      for (const k of RD_P) J[k] = [R.p[k].x, R.p[k].y];
      J.s = [J.neck[0] + (J.hip[0] - J.neck[0]) * .07, J.neck[1] + (J.hip[1] - J.neck[1]) * .07];
      J.face = R.face; const a = Math.atan2(J.neck[0] - J.hip[0], -(J.neck[1] - J.hip[1])); J.rot = a; J.lean = a; J.tilt = Math.atan2(J.head[0] - J.neck[0], -(J.head[1] - J.neck[1]));
      return J;
    }
    return { pose, joints, draw, ragdoll, ragStep, ragJoints, base, mix, shade };
  })();

  /* ================= draw.js: camera, parallax city, pre-rendered level chunks, objects, effects ================= */
  const THEME = [
    { sky: ['#5fb8f2', '#a8dcff', '#ffe5bd'], sun: '#fff4c8', far: ['#b4cce4', '#a2bcd8'], mid: ['#8aa2c2', '#7890b2'], near: ['#5f6f8e', '#4f5e7c'],
      fac: ['#f2dcb6', '#e8a272', '#d97a5c', '#f2c56c', '#cfd9a8', '#ecb6a2', '#bcd3e0'], win: ['#3d6690', '#26476b'], frame: '#fffaf0', shut: ['#3f8a5a', '#3a6aa8', '#a8463a'],
      coping: '#f7f0e2', edge: 'rgba(60,30,20,.22)', roof: ['#c9573c', '#93362a'], box: ['#b9c2c9', '#7c868f'], wall: ['#b8573f', '#8c3e2c'], pipe: ['#9aa6b0', '#5f6b75'], deco: 'rgba(60,50,60,.55)' },
    { sky: ['#ffa86a', '#ffcf8f', '#fff0c8'], sun: '#fff3c0', far: ['#e3b796', '#d6a585'], mid: ['#b98a74', '#a67a66'], near: ['#7a5a52', '#6a4c46'],
      fac: ['#b9b5ad', '#a9a49b', '#c4bfb4', '#9f9a92'], win: ['#2c2b33', '#1c1b22'], frame: '#8a857c', shut: ['#ff8a1f'], coping: '#d8d3c8', edge: 'rgba(30,25,20,.25)', roof: ['#b98a52', '#86602f'],
      box: ['#d9a35a', '#a8742e'], wall: ['#9a958c', '#6f6a62'], pipe: ['#e0782a', '#a8501a'], deco: 'rgba(70,45,35,.5)' },
    { sky: ['#4fb6ec', '#9fdcff', '#e6f8ff'], sun: '#ffffff', far: ['#9cc4dc', '#8cb6d2'], mid: ['#6f93b0', '#5f84a2'], near: ['#4a6680', '#3e5870'],
      fac: ['#d24a33', '#2a78c0', '#2f9a62', '#eaa23c', '#7d4cb3', '#d8d0bd', '#1f9aa8'], win: ['#1d3550', '#122436'], frame: '#c9d2da', shut: ['#fff'], coping: '#e0e6ea', edge: 'rgba(10,20,40,.28)', roof: ['#8a96a0', '#5d6870'],
      box: ['#e0a03a', '#a86f1c'], wall: ['#7d8a96', '#56626e'], pipe: ['#ffcc33', '#c89810'], deco: 'rgba(30,45,70,.5)' },
    { sky: ['#0a0a26', '#1e1450', '#4a2066'], sun: '#fff8e0', far: ['#2a2458', '#251f4e'], mid: ['#1c1840', '#171436'], near: ['#100e26', '#0c0a1e'],
      fac: ['#23264a', '#2a2150', '#1e2b4a', '#2e2446', '#252a52'], win: ['#141630', '#0d0f22'], frame: '#3a3f6a', shut: ['#5ef0ff', '#ff5ad8', '#ffd84a', '#9a7aff'],
      coping: '#4a5288', edge: 'rgba(0,0,0,.35)', roof: ['#3a3f6a', '#262a4a'], box: ['#5a6288', '#3a4064'], wall: ['#34395e', '#252946'], pipe: ['#6a72a0', '#454b72'], deco: 'rgba(5,5,20,.55)' },
  ];
  const NEON_WORDS = ['SNACKBAR', 'OPEN', 'PIZZA', 'HOTEL', 'BIOS', 'DISCO', 'FRIET', 'LEKKER', 'IJS', 'NACHT', 'SUPER', 'DANSEN'];
  const Draw = (() => {
    const TAU = Math.PI * 2, CW = 16, CH = 8, MG = .3;
    const hsh = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    function create(cv) {
      let g = cv.getContext('2d', { alpha: false });
      const R = { W: 0, H: 0, dpr: 1, cam: { x: 0, y: 0, vh: 12.5, sx: 0, sy: 0 }, L: null, th: THEME[0], wi: 0, chunks: new Map(), cu: 40, shake: 0, st: { paints: 0, paintMs: 0 }, optShake: true, t: 0, q: 1 };
      const rag = { R: null, J: {} };
      const J = {}, GJ = {};
      /* ---------- particles (pooled, no allocations per frame) ---------- */
      const NP = 260, P = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), l: new Float32Array(NP), ml: new Float32Array(NP), s: new Float32Array(NP), k: new Uint8Array(NP), c: new Array(NP).fill('#fff'), g: new Float32Array(NP) };
      let pn = 0;
      function part(k, x, y, vx, vy, life, s, col, grav = 0) {
        let i = -1; for (let j = 0; j < NP; j++) { const q = (pn + j) % NP; if (P.l[q] <= 0) { i = q; break; } }
        if (i < 0) i = pn; pn = (i + 1) % NP;
        P.k[i] = k; P.x[i] = x; P.y[i] = y; P.vx[i] = vx; P.vy[i] = vy; P.l[i] = life; P.ml[i] = life; P.s[i] = s; P.c[i] = col; P.g[i] = grav;
      }
      let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const dust = (x, y, n, sp = 1, col = 'rgba(235,225,210,.85)') => { for (let i = 0; i < n; i++) part(0, x + (rnd() - .5) * .5, y - .05, (rnd() - .5) * 3 * sp, -rnd() * 1.4 * sp, .35 + rnd() * .3, .12 + rnd() * .12, col, -.3); };
      const sparks = (x, y, n, col = '#ffd27a') => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = 2 + rnd() * 5; part(1, x, y, Math.cos(a) * v, Math.sin(a) * v - 1, .3 + rnd() * .3, .05, col, 1); } };
      const stars = (x, y, n, col = '#fff3a0') => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = 1.5 + rnd() * 3; part(2, x, y, Math.cos(a) * v, Math.sin(a) * v, .5 + rnd() * .3, .13 + rnd() * .08, col, .2); } };
      const confetti = (x, y, n) => { const cols = ['#ff5a6a', '#ffd23a', '#5ad06a', '#4aa8ff', '#c46aff', '#fff']; for (let i = 0; i < n; i++) part(3, x + (rnd() - .5) * 3, y - rnd() * 2, (rnd() - .5) * 6, -4 - rnd() * 6, 1.6 + rnd() * .8, .12, cols[i % cols.length], .55); };
      const splash = (x, y) => { for (let i = 0; i < 26; i++) part(4, x + (rnd() - .5) * .8, y, (rnd() - .5) * 5, -3 - rnd() * 7, .8, .08 + rnd() * .06, i % 3 ? '#bfe9ff' : '#ffffff', 1.2); };
      const debris = (x, y, col) => { for (let i = 0; i < 7; i++) part(5, x + rnd(), y + rnd() * .3, (rnd() - .5) * 2, rnd() * 2, .9, .12 + rnd() * .1, col, 1.2); };

      /* ---------- sizing ---------- */
      R.resize = (w, h, dpr) => {
        R.W = w; R.H = h; R.dpr = dpr;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        R.lock = R.q >= 1;                                           // lower quality: fixed zoom, chunks blitted 1:1 on whole pixels
        R.cu = Math.max(16, Math.round(h / (R.lock ? 13 : 12) * dpr));  // chunk resolution: device px per tile (at the closest zoom)
        R.chunks.clear(); R.bg = null; R.sky = null; R.bb = null;
      };
      R.setLevel = (L, wi) => { R.L = L; R.wi = wi; R.th = THEME[wi]; R.chunks.clear(); R.bg = null; R.sky = null; neonCache = null; };
      R.setQuality = q => { R.q = q; };
      R.view = () => R.lock ? R.H / (R.cu / R.dpr) : 12.5;

      /* ---------- camera ---------- */
      R.reset = S => {
        rag.R = null; for (let i = 0; i < NP; i++) P.l[i] = 0;
        if (S) { R.cam.x = S.x + 3; R.cam.y = S.y - 2.5; R.cam.vh = 12.5; R.cam.lx = 3; }
      };
      function camera(S, dt) {
        const C = R.cam, L = R.L, sp = Math.hypot(S.vx, S.vy * .4);
        const want = R.lock ? R.H / (R.cu / R.dpr) : 12.2 + Math.min(3, Math.max(0, sp - 8) * .45);
        C.vh = R.lock ? want : C.vh + (want - C.vh) * Math.min(1, dt * 1.6);
        const aspect = R.W / Math.max(1, R.H), vw = C.vh * aspect;
        const look = S.st === 9 || S.st === 10 ? 0 : Math.max(-3, Math.min(vw * .22, S.vx * .32 + (S.face || 1) * 1.2));
        C.lx = C.lx == null ? look : C.lx + (look - C.lx) * Math.min(1, dt * 2.2);
        const tx = S.x + C.lx, ty = S.y - 1.2 - C.vh * .12;
        C.x += (tx - C.x) * Math.min(1, dt * 8); C.y += (ty - C.y) * Math.min(1, dt * (Math.abs(ty - C.y) > 2.5 ? 10 : 3.6));
        C.x = Math.max(vw / 2 - 1, Math.min(L.W - vw / 2 + 1, C.x));
        C.y = Math.min(L.H + .6 - C.vh / 2, Math.max(C.vh / 2 - 6, C.y));
      }

      /* ---------- sky and parallax layers ---------- */
      function makeSky() {
        const W = R.W, H = R.H, d = R.dpr, T = R.th, c = document.createElement('canvas'); const kk = R.q === 0 ? .6 : .5; c.width = Math.max(2, Math.round(W * d * kk)); c.height = Math.max(2, Math.round(H * d * kk));
        const x = c.getContext('2d'), sw = c.width, sh = c.height;
        const gr = x.createLinearGradient(0, 0, 0, sh); gr.addColorStop(0, T.sky[0]); gr.addColorStop(.6, T.sky[1]); gr.addColorStop(1, T.sky[2]); x.fillStyle = gr; x.fillRect(0, 0, sw, sh);
        if (R.wi === 3) {
          for (let i = 0; i < 90; i++) { const a = hsh(i, 7); x.fillStyle = `rgba(255,255,255,${.25 + hsh(i, 9) * .6})`; const s = hsh(i, 3) < .1 ? 2 : 1; x.fillRect(hsh(i, 1) * sw, hsh(i, 2) * sh * .7, s * d * .5 + .5, s * d * .5 + .5); }
          const mx = sw * .78, my = sh * .2, mr = sh * .09;
          const mg = x.createRadialGradient(mx, my, mr * .5, mx, my, mr * 3); mg.addColorStop(0, 'rgba(255,240,200,.35)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = mg; x.fillRect(0, 0, sw, sh);
          x.fillStyle = T.sun; x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill(); x.fillStyle = 'rgba(30,20,60,.18)'; x.beginPath(); x.arc(mx - mr * .3, my - mr * .2, mr * .25, 0, TAU); x.arc(mx + mr * .35, my + mr * .3, mr * .18, 0, TAU); x.fill();
        } else {
          const mx = sw * (R.wi === 1 ? .2 : .82), my = sh * (R.wi === 1 ? .55 : .2), mr = sh * (R.wi === 1 ? .14 : .08);
          const mg = x.createRadialGradient(mx, my, mr * .4, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,250,220,.6)'); mg.addColorStop(1, 'rgba(255,250,220,0)'); x.fillStyle = mg; x.fillRect(0, 0, sw, sh);
          x.fillStyle = T.sun; x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill();
        }
        R.sky = c;
      }
      // one horizontally repeating strip per layer, drawn once per level / size
      function makeBg() {
        const H = R.H, d = R.dpr * (R.q === 0 ? .6 : .5), SW = Math.round(Math.max(900, R.W * 1.2)), wi = R.wi, T = R.th;
        R.bg = [.1, .24, .45].map((f, li) => {
          const c = document.createElement('canvas'), hh = Math.round(H * (.62 + li * .1)); c.width = Math.round(SW * d); c.height = Math.round(hh * d);
          const x = c.getContext('2d'); x.scale(d, d);
          const col = li === 0 ? T.far : li === 1 ? T.mid : T.near, unit = H / 12 * (.45 + li * .2);
          let px = 0, k = li * 1000 + wi * 77;
          const hr = (a, b) => hsh(k++, a * 13 + b);
          while (px < SW) {
            const w = unit * (1.8 + hr(1, 2) * 2.6), h = unit * (2.5 + hr(3, 4) * (li === 0 ? 6 : 4.5)) * (wi === 3 ? 1.5 : 1), y = hh - h;
            x.fillStyle = hr(5, 6) < .5 ? col[0] : col[1];
            if (wi === 0) {                                          // Dutch gables, towers and a windmill
              const kind = hr(7, 8);
              if (kind < .12 && li === 0) { x.fillRect(px + w * .35, y - unit * 3, w * .3, h + unit * 3); x.beginPath(); x.moveTo(px + w * .3, y - unit * 3); x.lineTo(px + w * .5, y - unit * 6); x.lineTo(px + w * .7, y - unit * 3); x.fill(); }
              else if (kind < .2 && li === 1) { const mx = px + w / 2, my = y + unit * .5; x.beginPath(); x.moveTo(mx - unit * .8, hh); x.lineTo(mx - unit * .45, my); x.lineTo(mx + unit * .45, my); x.lineTo(mx + unit * .8, hh); x.fill(); x.save(); x.translate(mx, my); x.rotate(hr(9, 1)); x.fillRect(-unit * .12, -unit * 2.6, unit * .24, unit * 5.2); x.fillRect(-unit * 2.6, -unit * .12, unit * 5.2, unit * .24); x.restore(); }
              else { x.fillRect(px, y, w, h); const gs = hr(2, 9); x.beginPath(); if (gs < .4) { x.moveTo(px, y); x.lineTo(px + w / 2, y - w * .45); x.lineTo(px + w, y); } else if (gs < .75) { for (let s = 0; s < 3; s++) x.rect(px + w * (s * .17), y - unit * .5 * s, w * (1 - s * .34), unit * .5); } x.fill(); }
              if (li === 2) { x.fillStyle = 'rgba(255,240,200,.18)'; for (let wy = y + unit * .6; wy < hh - unit * .4; wy += unit) for (let wx = px + unit * .35; wx < px + w - unit * .5; wx += unit * .9) x.fillRect(wx, wy, unit * .4, unit * .55); }
            } else if (wi === 1) {                                   // cranes and half-built frames
              const kind = hr(7, 8);
              if (kind < .22 && li < 2) { const mx = px + w / 2, top = y - unit * 3; x.fillRect(mx - unit * .15, top, unit * .3, hh - top); x.fillRect(mx - unit * 4, top, unit * 7, unit * .25); x.fillRect(mx - unit * .5, top - unit * .8, unit * 1, unit * .8); x.fillRect(mx + unit * 2.5, top + unit * .25, unit * .04 + 1, unit * 2.2); x.fillRect(mx - unit * 3.8, top + unit * .25, unit * .9, unit * .6); }
              else { x.fillRect(px, y, w, h); x.fillStyle = 'rgba(0,0,0,.12)'; for (let fy = y + unit; fy < hh; fy += unit * 1.2) x.fillRect(px, fy, w, unit * .12); }
            } else if (wi === 2) {                                   // ships, gantry cranes, container stacks
              const kind = hr(7, 8);
              if (kind < .25 && li > 0) { const top = y - unit * 2; x.fillRect(px, top, unit * .35, hh - top); x.fillRect(px + w - unit * .35, top, unit * .35, hh - top); x.fillRect(px - unit, top, w + unit * 3, unit * .45); x.fillRect(px + w * .4, top + unit * .45, unit * .6, unit * .5); }
              else if (kind < .4 && li === 0) { x.beginPath(); x.moveTo(px, hh - unit * 1.2); x.lineTo(px + w * 1.6, hh - unit * 1.2); x.lineTo(px + w * 1.45, hh); x.lineTo(px + w * .1, hh); x.fill(); x.fillRect(px + w * .9, hh - unit * 3, w * .4, unit * 1.8); }
              else { const bh = unit * .9; for (let yy = hh - bh; yy > y; yy -= bh) { x.fillStyle = hr(yy | 0, 3) < .5 ? col[0] : col[1]; x.fillRect(px, yy, w, bh - 1); } }
            } else {                                                 // night towers with windows and neon
              x.fillRect(px, y, w, h);
              if (hr(9, 9) < .3) { x.fillRect(px + w * .45, y - unit * 1.5, unit * .08 + 1, unit * 1.5); }
              const lit = li === 0 ? .25 : li === 1 ? .35 : .45;
              for (let wy = y + unit * .4; wy < hh - unit * .3; wy += unit * .55) for (let wx = px + unit * .25; wx < px + w - unit * .3; wx += unit * .45) { const q = hsh(wx | 0, wy | 0); if (q < lit) { x.fillStyle = q < lit * .25 ? 'rgba(255,90,216,.55)' : q < lit * .5 ? 'rgba(94,240,255,.5)' : 'rgba(255,226,140,.45)'; x.fillRect(wx, wy, unit * .2, unit * .26); } }
              x.fillStyle = col[0];
            }
            px += w + unit * (li === 0 ? hr(4, 4) * 1.5 : hr(4, 4) * .8);
          }
          return { c, f, w: SW, h: hh };
        });
      }
      let clouds = null;
      function drawBack() {
        const W = R.W, H = R.H, C = R.cam, k = R.q === 0 ? .6 : R.q >= 3 ? .5 : .5, d = R.dpr * k;
        if (!R.bb) { R.bb = document.createElement('canvas'); R.bb.width = Math.max(2, Math.round(W * d)); R.bb.height = Math.max(2, Math.round(H * d)); R.bbg = R.bb.getContext('2d', { alpha: false }); }
        const g0 = g; g = R.bbg; const cvw = R.bb.width, cvh = R.bb.height;
        try { drawBackInto(W, H, C, d, cvw, cvh); } finally { g = g0; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(R.bb, 0, 0, cv.width, cv.height);
      }
      function drawBackInto(W, H, C, d, cvw, cvh) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (!R.sky) makeSky(); g.drawImage(R.sky, 0, 0, cvw, cvh);
        if (R.wi !== 3 && R.q < 3) {
          if (!clouds) clouds = Array.from({ length: 6 }, (_, i) => ({ x: hsh(i, 1), y: .08 + hsh(i, 2) * .3, s: .6 + hsh(i, 3) * .8 }));
          g.fillStyle = R.wi === 1 ? 'rgba(255,240,220,.7)' : 'rgba(255,255,255,.75)';
          for (const q of clouds) {
            const span = W + 300, x = (((q.x * span - C.x * H / 12 * .04 - R.t * 6 * q.s) % span) + span) % span - 150, y = q.y * H, s = q.s * H / 9;
            g.beginPath(); g.ellipse(x * d, y * d, s * 1.2 * d, s * .35 * d, 0, 0, TAU); g.ellipse((x + s * .5) * d, (y - s * .2) * d, s * .6 * d, s * .4 * d, 0, 0, TAU); g.ellipse((x - s * .4) * d, (y - s * .1) * d, s * .5 * d, s * .3 * d, 0, 0, TAU); g.fill();
          }
        }
        if (!R.bg) makeBg();
        const u = H / C.vh;
        for (const b of R.bg) {
          const off = ((C.x * u * b.f) % b.w + b.w) % b.w, y = H - b.h * (1 - b.f * .2) + (R.L.H * .62 - C.y) * u * b.f * .35 + H * .06;
          for (let x = -off; x < W; x += b.w) g.drawImage(b.c, Math.round(x * d), Math.round(y * d), Math.round(b.w * d), Math.round(b.h * d));
          if (y + b.h < H) { g.fillStyle = b.f === .45 ? R.th.near[1] : b.f === .24 ? R.th.mid[1] : R.th.far[1]; g.fillRect(0, Math.round((y + b.h) * d) - 1, cvw, cvh); }
        }
      }

      /* ---------- the level, pre-rendered in chunks ---------- */
      const tileAt = (c, r) => { const L = R.L; if (c < 0 || c >= L.W || r < 0 || r >= L.H) return 0; return L.t[r * L.W + c]; };
      const matAt = (c, r) => { const L = R.L; if (c < 0 || c >= L.W || r < 0 || r >= L.H) return 0; return L.mat[r * L.W + c]; };
      const bidAt = (c, r) => { const L = R.L; if (c < 0 || c >= L.W || r < 0 || r >= L.H) return 0; return L.bid[r * L.W + c]; };
      const solidT = v => v === 1 || v === 9 || v === 10;
      function facCol(b) { const f = R.th.fac; return f[Math.floor(hsh(b, R.wi + 3) * f.length)]; }
      // a chunk with nothing in it (open sky) is never painted or drawn
      const EMPTY = {};
      function chunkUsed(ci, cj) {
        const L = R.L, x0 = ci * CW - 3, x1 = (ci + 1) * CW + 3, y0 = cj * CH - 3, y1 = (cj + 1) * CH + 7;
        for (let c = Math.max(0, x0); c < Math.min(L.W, x1); c++) for (let r = Math.max(0, y0); r < Math.min(L.H, y1); r++) if (L.t[r * L.W + c]) return true;
        const near = (xa, xb, ya) => xb > x0 && xa < x1 && ya < y1;                // things that hang down to the bottom (poles)
        for (const q of L.deco) if (near(q.x - 2, q.x + 2, q.y + 1) && q.y - 4 < y1) return true;
        for (const Z of L.zips) if (near(Math.min(Z.x0, Z.x1), Math.max(Z.x0, Z.x1), Math.min(Z.y0, Z.y1) - 1)) return true;
        for (const B of L.bars) if (near(B.x - 1, B.x + 1, B.y - 1)) return true;
        for (const Z of L.lasers) if (near(Z.x - 1, Z.x + 1, Z.y0 - 3) && Z.y1 > y0) return true;
        for (const V of L.vents) if (near(V.x0, V.x1, V.y1 - 1) && V.y1 > y0) return true;
        for (const Pl of L.plats) if (Pl.look === 1 && near(Math.min(Pl.x, Pl.x + Pl.mx) - 2, Math.max(Pl.x, Pl.x + Pl.mx) + Pl.w + 2, Math.min(Pl.y, Pl.y + Pl.my) - 5) && Math.min(Pl.y, Pl.y + Pl.my) - 4 < y1) return true;
        for (let c = Math.max(0, x0); c < Math.min(L.W, x1); c++) for (let r = 0; r < Math.min(L.H, y1); r++) if (L.t[r * L.W + c] === 12) return true;   // scaffolding poles
        return false;
      }
      function chunk(ci, cj) {
        const key = ci * 1000 + cj; let c = R.chunks.get(key); if (c) return c;
        if (!chunkUsed(ci, cj)) { R.chunks.set(key, EMPTY); return EMPTY; }
        if (R.chunks.size > 64) R.chunks.delete(R.chunks.keys().next().value);
        const t0 = performance.now(); R.st.paints++;
        c = document.createElement('canvas'); const cu = R.cu; c.width = Math.ceil((CW + MG * 2) * cu); c.height = Math.ceil((CH + MG * 2) * cu);
        const x = c.getContext('2d'); x.setTransform(cu, 0, 0, cu, (-ci * CW + MG) * cu, (-cj * CH + MG) * cu);
        paintArea(x, ci * CW - 1, cj * CH - 1, (ci + 1) * CW + 1, (cj + 1) * CH + 1);
        R.chunks.set(key, c); R.st.paintMs += performance.now() - t0; return c;
      }
      function paintArea(x, c0, r0, c1, r1) {
        const L = R.L, T = R.th, wi = R.wi;
        c0 = Math.max(0, c0); c1 = Math.min(L.W, c1); r0 = Math.max(0, r0); r1 = Math.min(L.H, r1);
        x.lineCap = 'butt'; x.lineJoin = 'miter';
        // static decorations behind the buildings' front (antennas, chimneys, tanks)
        for (const q of L.deco) if (q.x > c0 - 4 && q.x < c1 + 4) decoItem(x, q);
        // poles under scaffolding planks, cables, bars, crane rails
        for (let c = c0; c < c1; c++) for (let r = r0 - 2; r < r1; r++) if (tileAt(c, r) === 12) { x.fillStyle = 'rgba(90,70,50,.7)'; const e = matAt(c, r) === 0 ? 0 : 1; if (bidAt(c, r) !== 0 || c % 3 === 0) x.fillRect(c + .45, r + .2, .1, L.H - r); }
        // the buildings: facade columns
        for (let c = c0; c < c1; c++) {
          for (let r = Math.max(0, r0 - 1); r < r1; r++) {
            const v = tileAt(c, r); if (!v) continue;
            const m = matAt(c, r);
            if ((v === 1) && m === 0) {
              let r2 = r; while (r2 + 1 < r1 + 1 && r2 + 1 < L.H && tileAt(c, r2 + 1) === 1 && matAt(c, r2 + 1) === 0 && bidAt(c, r2 + 1) === bidAt(c, r)) r2++;
              x.fillStyle = facCol(bidAt(c, r)); x.fillRect(c - .01, r - .01, 1.02, r2 - r + 1.02);
              r = r2;
            } else if (v >= 2 && v <= 7) slopeTile(x, c, r, v);
          }
        }
        // facade details per building
        for (const b of L.bld) { if (b.x1 < c0 - 1 || b.x0 > c1 + 1) continue; facade(x, b, c0, r0, c1, r1); }
        // exposed edges: coping on tops, shade on sides
        for (let c = c0; c < c1; c++) for (let r = r0; r < r1; r++) {
          const v = tileAt(c, r); if (v !== 1 || matAt(c, r) !== 0) continue;
          const up = tileAt(c, r - 1);
          if (!solidT(up) && !(up >= 2 && up <= 7)) {
            x.fillStyle = T.coping; const l = !solidT(tileAt(c - 1, r)) && !(tileAt(c - 1, r) >= 2 && tileAt(c - 1, r) <= 7) ? .12 : 0, rr = !solidT(tileAt(c + 1, r)) && !(tileAt(c + 1, r) >= 2 && tileAt(c + 1, r) <= 7) ? .12 : 0;
            x.fillRect(c - l, r - .02, 1 + l + rr, .2); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(c - l, r + .18, 1 + l + rr, .06);
            if (wi === 3) { x.fillStyle = 'rgba(94,240,255,.55)'; x.fillRect(c - l, r + .2, 1 + l + rr, .03); }
          }
          if (!solidT(tileAt(c - 1, r)) && !(tileAt(c - 1, r) >= 2 && tileAt(c - 1, r) <= 7)) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(c, r, .08, 1); }
          if (!solidT(tileAt(c + 1, r)) && !(tileAt(c + 1, r) >= 2 && tileAt(c + 1, r) <= 7)) { x.fillStyle = T.edge; x.fillRect(c + .88, r, .12, 1); }
        }
        // special tiles
        for (let c = c0; c < c1; c++) for (let r = r0; r < r1; r++) {
          const v = tileAt(c, r), m = matAt(c, r);
          if (v === 1 && m !== 0) solidItem(x, c, r, m, bidAt(c, r));
          else if (v === 9 || v === 10) beltTile(x, c, r, bidAt(c, r));
          else if (v === 11) spikeTile(x, c, r);
          else if (v === 12) plankTile(x, c, r, bidAt(c, r));
        }
        // static items: cables, bars, laser posts, vent grates, crane rails
        for (const Z of L.zips) if (Math.max(Z.x0, Z.x1) > c0 - 2 && Math.min(Z.x0, Z.x1) < c1 + 2) {
          x.strokeStyle = '#3a3a44'; x.lineWidth = .07; x.beginPath(); x.moveTo(Z.x0, Z.y0); x.lineTo(Z.x1, Z.y1); x.stroke();
          for (const [px, py] of [[Z.x0, Z.y0], [Z.x1, Z.y1]]) { x.fillStyle = '#5a5f6a'; x.fillRect(px - .1, py - .3, .2, L.H); x.fillStyle = '#7a808c'; x.fillRect(px - .25, py - .35, .5, .2); }
        }
        for (const B of L.bars) if (B.x > c0 - 3 && B.x < c1 + 3) {
          x.fillStyle = '#556070'; x.fillRect(B.x - .75, B.y - .05, .12, L.H); x.fillRect(B.x + .63, B.y - .05, .12, L.H);
          x.strokeStyle = '#c8ccd4'; x.lineWidth = .11; x.lineCap = 'round'; x.beginPath(); x.moveTo(B.x - .7, B.y); x.lineTo(B.x + .7, B.y); x.stroke(); x.lineCap = 'butt';
          x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(B.x - .6, B.y - .04, 1.2, .025);
        }
        for (const Z of L.lasers) if (Z.x > c0 - 2 && Z.x < c1 + 2) {
          x.fillStyle = '#3a3f50'; x.fillRect(Z.x - .22, Z.y0 - .35, .44, .4); x.fillRect(Z.x - .22, Z.y1 - .3, .44, .3);
          x.fillStyle = '#ff3a5a'; x.fillRect(Z.x - .08, Z.y0 - .02, .16, .06); x.fillRect(Z.x - .08, Z.y1 - .34, .16, .06);
          x.fillStyle = '#4a5064'; x.fillRect(Z.x - .05, Z.y0 - 2.5, .1, 2.2);
        }
        for (const V of L.vents) if (V.x1 > c0 - 1 && V.x0 < c1 + 1) {
          x.fillStyle = '#4a5260'; x.fillRect(V.x0 + .05, V.y1 - .18, V.x1 - V.x0 - .1, .2);
          x.fillStyle = '#20242c'; for (let q = V.x0 + .2; q < V.x1 - .1; q += .25) x.fillRect(q, V.y1 - .15, .1, .14);
        }
        for (const Pl of L.plats) { const x0 = Math.min(Pl.x, Pl.x + Pl.mx), x1 = Math.max(Pl.x, Pl.x + Pl.mx) + Pl.w; if (x1 < c0 - 2 || x0 > c1 + 2) continue;
          if (Pl.look === 1) { const ry = Math.min(Pl.y, Pl.y + Pl.my) - 4.5; x.fillStyle = '#e8b030'; x.fillRect(x0 - 1, ry, x1 - x0 + 2, .35); x.fillStyle = 'rgba(0,0,0,.2)'; for (let q = x0 - 1; q < x1 + 1; q += .5) x.fillRect(q, ry + .05, .25, .25); } }
      }
      function slopeTile(x, c, r, v) {
        const T = R.th, o = u => r + Core.slopeOff(v, u);
        x.fillStyle = facCol(bidAt(c, r));
        x.beginPath(); x.moveTo(c - .01, o(0)); x.lineTo(c + 1.01, o(1)); x.lineTo(c + 1.01, r + 1.02); x.lineTo(c - .01, r + 1.02); x.fill();
        // roof covering along the slope
        x.strokeStyle = T.roof[0]; x.lineWidth = .3; x.beginPath(); x.moveTo(c - .02, o(0) + .13); x.lineTo(c + 1.02, o(1) + .13); x.stroke();
        x.strokeStyle = T.roof[1]; x.lineWidth = .05; x.beginPath(); x.moveTo(c, o(0) + .26); x.lineTo(c + 1, o(1) + .26); x.stroke();
        if (R.wi === 0) { x.strokeStyle = 'rgba(90,20,10,.4)'; x.lineWidth = .03; for (let k = .25; k < 1; k += .25) { x.beginPath(); x.moveTo(c + k, o(k) - .02); x.lineTo(c + k, o(k) + .28); x.stroke(); } }
        else if (R.wi === 1 || R.wi === 2) { x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = .04; for (let k = .1; k < 1; k += .2) { x.beginPath(); x.moveTo(c + k, o(k) + .02); x.lineTo(c + k + .08, o(k + .08) + .02); x.stroke(); } }
        else { x.strokeStyle = 'rgba(94,240,255,.5)'; x.lineWidth = .03; x.beginPath(); x.moveTo(c, o(0) + .02); x.lineTo(c + 1, o(1) + .02); x.stroke(); }
      }
      function facade(x, b, c0, r0, c1, r1) {
        const T = R.th, wi = R.wi, w = b.x1 - b.x0, top = b.top;
        const inFac = (c, r) => tileAt(c, r) === 1 && matAt(c, r) === 0 && bidAt(c, r) === b.id;
        if (wi === 0) {
          const step = w >= 6 ? 1.7 : 1.5, n = Math.max(1, Math.floor((w - .6) / step)), off = (w - n * step) / 2;
          const shut = T.shut[Math.floor(hsh(b.id, 5) * T.shut.length)], hasSh = hsh(b.id, 6) < .5;
          x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(b.x0, top + .55, w, .1);
          for (let r = top + 1.1; r < R.L.H; r += 2.1) for (let i = 0; i < n; i++) {
            const wx = b.x0 + off + i * step + step / 2 - .3, wy = r;
            if (wx > c1 + 1 || wx < c0 - 2 || wy > r1 + 1 || wy < r0 - 2) continue;
            if (!inFac(Math.floor(wx + .3), Math.floor(wy + .5)) || !inFac(Math.floor(wx + .3), Math.floor(wy + 1.1))) continue;
            x.fillStyle = T.frame; x.fillRect(wx - .07, wy - .07, .74, 1.14);
            const lit = hsh(Math.floor(wx * 3), Math.floor(wy)) < .18;
            x.fillStyle = lit ? '#ffe7a0' : T.win[0]; x.fillRect(wx, wy, .6, 1);
            x.fillStyle = lit ? '#ffd270' : T.win[1]; x.fillRect(wx, wy + .55, .6, .45);
            x.fillStyle = T.frame; x.fillRect(wx + .27, wy, .06, 1); x.fillRect(wx, wy + .45, .6, .06);
            x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(wx + .05, wy + .05, .08, .35);
            if (hasSh) { x.fillStyle = shut; x.fillRect(wx - .3, wy - .05, .22, 1.1); x.fillRect(wx + .68, wy - .05, .22, 1.1); }
            x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(wx - .1, wy + 1.06, .8, .08);
          }
        } else if (wi === 1) {
          for (let r = top + 2.4; r < R.L.H; r += 2.4) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(b.x0, r, w, .3); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(b.x0, r - .05, w, .05); }
          for (let r = top + .6; r < R.L.H; r += 2.4) for (let cc = b.x0 + .5; cc < b.x1 - .9; cc += 2.2) {
            if (!inFac(Math.floor(cc + .7), Math.floor(r + .8)) || !inFac(Math.floor(cc + .7), Math.floor(r + 1.4))) continue;
            x.fillStyle = T.win[0]; x.fillRect(cc, r, 1.5, 1.5);
            x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(cc, r, 1.5, .1);
            if (hsh(Math.floor(cc), Math.floor(r)) < .3) { x.fillStyle = 'rgba(255,138,31,.55)'; x.fillRect(cc, r, 1.5, 1.5); x.strokeStyle = 'rgba(255,200,120,.5)'; x.lineWidth = .03; for (let q = .2; q < 1.5; q += .25) { x.beginPath(); x.moveTo(cc + q, r); x.lineTo(cc + q, r + 1.5); x.stroke(); } }
          }
          x.fillStyle = 'rgba(0,0,0,.12)'; for (let cc = b.x0 + 2.85; cc < b.x1 - .5; cc += 4.4) x.fillRect(cc, top, .25, R.L.H - top);
        } else if (wi === 2) {
          const bh = 2.6;
          for (let r = top, k = 0; r < R.L.H; r += bh, k++) {
            if (r > r1 + 1 || r + bh < r0 - 1) continue;
            const col = T.fac[Math.floor(hsh(b.id * 7 + k, 11) * T.fac.length)];
            for (let c = b.x0; c < b.x1; c++) { if (!inFac(c, Math.floor(r + .3))) continue; x.fillStyle = col; x.fillRect(c - .01, r, 1.02, bh); }
            x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(b.x0, r + bh - .12, w, .12); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(b.x0, r, w, .06);
            x.fillStyle = 'rgba(0,0,0,.12)'; for (let q = b.x0 + .3; q < b.x1 - .1; q += .3) x.fillRect(q, r + .15, .06, bh - .35);
            const segs = Math.max(1, Math.round(w / 6)), sw = w / segs;
            for (let s = 0; s <= segs; s++) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(b.x0 + s * sw - .08, r, .16, bh); }
            if (hsh(b.id, k) < .5) { x.fillStyle = 'rgba(255,255,255,.55)'; x.font = 'bold .5px sans-serif'; x.fillText(['HAVN', 'MAAS', 'ZEE', 'RTM', 'KADE'][Math.floor(hsh(k, b.id) * 5)], b.x0 + .5, r + .9); }
          }
        } else {
          for (let r = top + .6; r < R.L.H - .3; r += .9) for (let cc = b.x0 + .35; cc < b.x1 - .5; cc += .8) {
            if (r > r1 + 1 || r < r0 - 2 || cc > c1 + 1 || cc < c0 - 2) continue;
            if (!inFac(Math.floor(cc + .2), Math.floor(r + .3))) continue;
            const q = hsh(Math.floor(cc * 5), Math.floor(r * 3) + b.id);
            x.fillStyle = q < .06 ? '#d86ac8' : q < .14 ? '#6ad4e0' : q < .3 ? '#e8c47a' : T.win[(Math.floor(r) + Math.floor(cc)) % 2];
            x.fillRect(cc, r, .42, .55);
          }
          if (w >= 6 && hsh(b.id, 21) < .75) {                      // a neon sign on the facade
            const word = NEON_WORDS[Math.floor(hsh(b.id, 22) * NEON_WORDS.length)], sx = b.x0 + w / 2, sy = top + 1.6;
            if (inFac(Math.floor(sx), Math.floor(sy + .6))) {
              const col = ['#ff4fd8', '#5ef0ff', '#ffd84a', '#7aff8a'][Math.floor(hsh(b.id, 23) * 4)];
              x.fillStyle = 'rgba(10,8,25,.9)'; const tw = Math.min(w - 1.2, word.length * .62 + .6); x.fillRect(sx - tw / 2, sy - .1, tw, 1.2);
              x.save(); x.font = 'bold .8px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 8; x.fillStyle = col; x.fillText(word, sx, sy + .52, tw - .3); x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(word, sx, sy + .52, tw - .3); x.restore();
            }
          }
        }
      }
      function solidItem(x, c, r, m, look) {
        const T = R.th, wi = R.wi;
        if (m === 2) {                                             // a box on the roof: AC unit, crate, chimney, ...
          const kind = wi === 0 ? (look === 1 ? 'chim' : 'ac') : wi === 1 ? 'crate' : wi === 2 ? 'drum' : 'ac';
          if (kind === 'chim') { x.fillStyle = T.wall[0]; x.fillRect(c + .05, r, .9, 1); x.fillStyle = T.wall[1]; for (let k = 0; k < 4; k++) x.fillRect(c + .05, r + k * .25 + .22, .9, .04); x.fillStyle = '#5a5050'; x.fillRect(c - .02, r, 1.04, .16); }
          else if (kind === 'crate') { x.fillStyle = T.box[0]; x.fillRect(c + .03, r + .03, .94, .97); x.strokeStyle = T.box[1]; x.lineWidth = .08; x.strokeRect(c + .07, r + .07, .86, .89); x.beginPath(); x.moveTo(c + .1, r + .1); x.lineTo(c + .9, r + .92); x.stroke(); }
          else if (kind === 'drum') { x.fillStyle = T.box[0]; x.fillRect(c + .1, r + .02, .8, .98); x.fillStyle = T.box[1]; x.fillRect(c + .1, r + .3, .8, .07); x.fillRect(c + .1, r + .66, .8, .07); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(c + .2, r + .05, .08, .9); }
          else { x.fillStyle = T.box[0]; x.fillRect(c + .02, r + .05, .96, .95); x.fillStyle = T.box[1]; x.beginPath(); x.arc(c + .5, r + .52, .3, 0, TAU); x.fill(); x.strokeStyle = T.box[0]; x.lineWidth = .05; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(c + .5, r + .52); x.lineTo(c + .5 + Math.cos(k * 2.1) * .28, r + .52 + Math.sin(k * 2.1) * .28); x.stroke(); } x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(c + .02, r + .05, .96, .06); }
        } else if (m === 4) {                                      // walls and floating blocks
          x.fillStyle = T.wall[0]; x.fillRect(c - .01, r - .01, 1.02, 1.02);
          x.fillStyle = T.wall[1];
          if (wi === 0) { x.fillRect(c, r + .47, 1, .06); x.fillRect(c + (r % 2 ? .25 : .75), r, .06, .5); x.fillRect(c + (r % 2 ? .75 : .25), r + .5, .06, .5); }
          else if (wi === 1) { x.fillRect(c, r + .9, 1, .1); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(c, r, 1, .05); }
          else if (wi === 2) { for (let q = .15; q < 1; q += .3) x.fillRect(c + q, r, .06, 1); }
          else { x.fillRect(c, r + .9, 1, .1); x.fillStyle = 'rgba(94,240,255,.25)'; x.fillRect(c + .1, r + .2, .8, .05); }
          const up = tileAt(c, r - 1); if (!solidT(up)) { x.fillStyle = T.coping; x.fillRect(c - .04, r - .02, 1.08, .14); }
        } else if (m === 3) {                                      // pipe / beam to slide under
          const y0 = r, k = look;
          x.fillStyle = 'rgba(70,70,80,.6)'; if (k === 1 || k === 2) x.fillRect(c + .45, y0 - 6, .1, 6);
          const gr = x.createLinearGradient(0, y0, 0, y0 + 1); gr.addColorStop(0, T.pipe[0]); gr.addColorStop(.45, '#ffffff'); gr.addColorStop(.55, T.pipe[0]); gr.addColorStop(1, T.pipe[1]);
          x.fillStyle = gr; x.fillRect(c - .01, y0 + .1, 1.02, .8);
          if (k === 1 || k === 2) { x.fillStyle = T.pipe[1]; x.fillRect(c + (k === 1 ? .05 : .7), y0, .25, 1); }
          x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(c, y0 + .84, 1, .06);
          if ((c + r) % 3 === 0) { x.fillStyle = '#ffd23a'; x.fillRect(c + .3, y0 + .35, .4, .3); x.fillStyle = '#222'; x.fillRect(c + .38, y0 + .43, .24, .14); }
        } else if (m === 5) { x.fillStyle = '#e07a2a'; x.fillRect(c, r + .1, 1, .8); }
      }
      function beltTile(x, c, r, look) {
        x.fillStyle = '#3a3d46'; x.fillRect(c - .01, r, 1.02, 1); x.fillStyle = '#23252c'; x.fillRect(c, r, 1, .22);
        x.fillStyle = '#6a6f7c'; for (let q = .25; q < 1; q += .5) { x.beginPath(); x.arc(c + q, r + .55, .18, 0, TAU); x.fill(); }
        x.fillStyle = '#ffd23a'; x.fillRect(c, r + .9, 1, .1);
      }
      function spikeTile(x, c, r) {
        x.fillStyle = '#7a808c'; x.fillRect(c, r + .85, 1, .15);
        x.fillStyle = '#c8ced8'; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(c + k * .25, r + .88); x.lineTo(c + k * .25 + .125, r + .42); x.lineTo(c + k * .25 + .25, r + .88); x.fill(); }
        x.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 4; k++) x.fillRect(c + k * .25 + .11, r + .48, .03, .2);
      }
      function plankTile(x, c, r, look) {
        x.fillStyle = '#c08a4a'; x.fillRect(c - .01, r, 1.02, .25); x.fillStyle = '#8a5a2a'; x.fillRect(c, r + .2, 1, .06); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(c, r, 1, .04);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(c + .48, r + .02, .03, .2);
      }
      function decoItem(x, q) {
        const T = R.th, wi = R.wi, k = q.kind === 'auto' ? Math.floor(q.s * 4) : q.kind;
        x.fillStyle = T.deco; x.strokeStyle = T.deco; const X = q.x, Y = q.y - .02;
        if (wi === 0) {
          if (k === 0) { x.fillRect(X - .3, Y - 1.5, .6, 1.5); x.fillRect(X - .38, Y - 1.62, .76, .18); }                             // chimney
          else if (k === 1) { x.lineWidth = .06; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 2.6); for (let i = 0; i < 3; i++) { x.moveTo(X - .6 + i * .15, Y - 2.4 + i * .35); x.lineTo(X + .6 - i * .15, Y - 2.4 + i * .35); } x.stroke(); }   // TV antenna
          else if (k === 2) { x.beginPath(); x.moveTo(X - .8, Y); x.lineTo(X, Y - .9); x.lineTo(X + .8, Y); x.fill(); x.fillRect(X - .25, Y - .55, .5, .4); }   // dormer
          else { x.fillRect(X - .7, Y - .5, 1.4, .5); x.fillRect(X - .5, Y - .7, 1, .2); }
        } else if (wi === 1) {
          if (k === 0) { x.beginPath(); x.moveTo(X - .35, Y); x.lineTo(X, Y - .8); x.lineTo(X + .35, Y); x.fill(); }                   // cone
          else if (k === 1) { x.fillRect(X - .8, Y - .7, 1.6, .7); }                                                                   // brick pallet
          else if (k === 2) { x.lineWidth = .08; x.beginPath(); x.moveTo(X - 1, Y); x.lineTo(X - 1, Y - 2.2); x.lineTo(X + 1, Y - 2.2); x.lineTo(X + 1, Y); x.moveTo(X - 1, Y - 1.1); x.lineTo(X + 1, Y - 1.1); x.stroke(); }   // scaffold frame
          else { x.fillRect(X - .5, Y - .9, 1, .9); }
        } else if (wi === 2) {
          if (k === 0) { x.fillRect(X - .2, Y - .45, .4, .45); x.fillRect(X - .28, Y - .55, .56, .12); }                               // bollard
          else if (k === 1) { x.lineWidth = .06; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 2); x.stroke(); x.beginPath(); x.arc(X, Y - 1.6, .3, 0, TAU); x.lineWidth = .1; x.stroke(); }   // life ring
          else if (k === 2) { x.fillRect(X - .6, Y - .9, .55, .9); x.fillRect(X + .05, Y - .9, .55, .9); }                            // drums
          else { x.lineWidth = .07; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 3); x.lineTo(X + .9, Y - 2.6); x.stroke(); }        // flag pole
        } else {
          if (k === 0) { x.fillRect(X - .5, Y - .8, 1, .8); }                                                                         // AC unit
          else if (k === 1) { x.lineWidth = .06; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y - 3); x.stroke(); }                       // antenna
          else if (k === 2) { x.beginPath(); x.arc(X, Y - .9, .55, Math.PI * .8, Math.PI * 1.9); x.fill(); x.fillRect(X - .05, Y - .9, .1, .9); }   // dish
          else { x.fillRect(X - 1.2, Y - 2.6, 2.4, 1.3); x.fillRect(X - 1, Y - 1.3, .1, 1.3); x.fillRect(X + .9, Y - 1.3, .1, 1.3); }   // billboard
        }
      }
      function drawLevel() {
        const paintedBefore = R.st.paints, C = R.cam, aspect = R.W / R.H, vw = C.vh * aspect, x0 = C.x - vw / 2, x1 = C.x + vw / 2, y0 = C.y - C.vh / 2, y1 = C.y + C.vh / 2;
        for (let cj = Math.max(0, Math.floor(y0 / CH)); cj <= Math.min(Math.floor((R.L.H - 1) / CH), Math.floor(y1 / CH)); cj++)
          for (let ci = Math.max(0, Math.floor(x0 / CW)); ci <= Math.floor(x1 / CW); ci++) {
            if (ci * CW > R.L.W) continue;
            const c = chunk(ci, cj); if (c === EMPTY) continue;
            if (R.lock) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, Math.round(R.ox + (ci * CW - MG) * R.cu), Math.round(R.oy + (cj * CH - MG) * R.cu)); }
            else g.drawImage(c, ci * CW - MG, cj * CH - MG, CW + MG * 2, CH + MG * 2);
          }
        if (R.lock) g.setTransform(R.cu, 0, 0, R.cu, R.ox, R.oy);
        // paint one chunk ahead per frame (never two in one frame), so running into new ground doesn't stutter
        if (R.st.paints === paintedBefore && R.lastDt < .021) {
          const dir = R.cam.lx >= 0 ? 1 : -1;
          outer: for (let k = 0; k < 3; k++) {
            const ci = Math.floor((dir > 0 ? x1 : x0) / CW) + dir * k;
            if (ci < 0 || ci * CW > R.L.W) break;
            for (let cj = Math.max(0, Math.floor(y0 / CH) - 1); cj <= Math.min(Math.floor((R.L.H - 1) / CH), Math.floor(y1 / CH) + 1); cj++) if (!R.chunks.has(ci * 1000 + cj)) { chunk(ci, cj); break outer; }
          }
        }
      }

      /* ---------- moving and living things ---------- */
      let neonCache = null;
      function drawObjects(S) {
        const L = R.L, C = R.cam, f = S.f, t = R.t, vw = C.vh * R.W / R.H, xa = C.x - vw / 2 - 2, xb = C.x + vw / 2 + 2;
        // crumbling tiles
        for (let i = 0; i < L.crum.length; i++) {
          const ti = L.crum[i], c = ti % L.W, r = (ti / L.W) | 0; if (c < xa || c > xb) continue;
          const v = S.cr[i]; if (v >= Core.C.CR_FALL) continue;
          const sh = v > 0 ? Math.sin(v * 1.7) * .05 * (v / Core.C.CR_FALL + .3) : 0;
          g.fillStyle = '#b58a5a'; g.fillRect(c + sh + .02, r, .96, .5); g.fillStyle = '#8a6038'; g.fillRect(c + sh + .02, r + .4, .96, .1);
          g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(c + sh + .02, r, .96, .06);
          g.strokeStyle = v > 0 ? '#3a2410' : 'rgba(60,36,16,.5)'; g.lineWidth = .04; g.beginPath(); g.moveTo(c + .3 + sh, r); g.lineTo(c + .45 + sh, r + .25); g.lineTo(c + .35 + sh, r + .5); if (v > 10) { g.moveTo(c + .7 + sh, r); g.lineTo(c + .62 + sh, r + .3); } g.stroke();
        }
        // conveyor arrows
        for (let c = Math.max(0, Math.floor(xa)); c < Math.min(L.W, xb); c++) for (let r = Math.max(0, Math.floor(C.y - C.vh / 2)); r < Math.min(L.H, C.y + C.vh / 2 + 1); r++) {
          const v = L.t[r * L.W + c]; if (v !== 9 && v !== 10) continue;
          const d = v === 9 ? 1 : -1, ph = ((t * 1.6 * d) % .5 + .5) % .5;
          g.fillStyle = '#ffd23a'; for (let q = ph; q < 1; q += .5) { const xx = c + q; g.beginPath(); g.moveTo(xx - .08 * d, r + .03); g.lineTo(xx + .08 * d, r + .11); g.lineTo(xx - .08 * d, r + .19); g.fill(); }
        }
        // springs
        for (const P of L.springs) {
          if (P.x < xa || P.x > xb) continue;
          const near = Math.abs(S.x - P.x) < .8 && S.y > P.y - .6 && S.vy < -10 ? 1 : 0, k = R.sp && R.sp.x === P.x ? Math.max(0, 1 - (t - R.sp.t) * 5) : 0;
          const h = .45 - k * .25 + near * .05;
          g.fillStyle = '#4a5060'; g.fillRect(P.x - .45, P.y - .12, .9, .12);
          g.strokeStyle = '#c8ccd4'; g.lineWidth = .06; g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(P.x + (i % 2 ? .25 : -.25), P.y - .12 - h * i / 6); g.stroke();
          g.fillStyle = P.dir ? '#5ad06a' : '#ff5a4a'; g.fillRect(P.x - .5, P.y - .2 - h, 1, .14); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(P.x - .5, P.y - .2 - h, 1, .04);
          if (P.dir) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(P.x - .12, P.y - .18 - h); g.lineTo(P.x + .15, P.y - .13 - h); g.lineTo(P.x - .12, P.y - .08 - h); g.fill(); }
        }
        // moving platforms / crane loads
        for (let i = 0; i < L.plats.length; i++) {
          const Pl = L.plats[i], [px, py] = Core.platPos(Pl, f); if (px + Pl.w < xa || px > xb) continue;
          if (Pl.look === 1) {
            const ry = Math.min(Pl.y, Pl.y + Pl.my) - 4.2;
            g.strokeStyle = '#2a2a30'; g.lineWidth = .05; g.beginPath(); g.moveTo(px + .3, ry); g.lineTo(px + Pl.w / 2, py - 1.3); g.lineTo(px + Pl.w - .3, ry); g.moveTo(px + Pl.w / 2, py - 1.3); g.lineTo(px + .15, py - .05); g.moveTo(px + Pl.w / 2, py - 1.3); g.lineTo(px + Pl.w - .15, py - .05); g.stroke();
            g.fillStyle = '#e8b030'; g.fillRect(px + .1, ry - .15, Pl.w - .2, .3);
            const col = ['#d24a33', '#2a78c0', '#2f9a62'][i % 3]; g.fillStyle = col; g.fillRect(px, py, Pl.w, .9); g.fillStyle = 'rgba(0,0,0,.18)'; for (let q = px + .25; q < px + Pl.w - .1; q += .3) g.fillRect(q, py + .1, .06, .7); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(px, py, Pl.w, .07);
          } else {
            g.fillStyle = '#7a8090'; g.fillRect(px, py, Pl.w, .35); g.fillStyle = '#ffd23a'; for (let q = 0; q < Pl.w; q += .5) g.fillRect(px + q, py + .22, .25, .13); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px, py, Pl.w, .06);
            g.strokeStyle = 'rgba(40,40,50,.6)'; g.lineWidth = .04; g.beginPath(); g.moveTo(px + .2, py); g.lineTo(px + .2, py - 6); g.moveTo(px + Pl.w - .2, py); g.lineTo(px + Pl.w - .2, py - 6); g.stroke();
          }
        }
        // saws
        for (const Q of L.saws) {
          const [sx, sy] = Core.sawPos(Q, f); if (sx < xa || sx > xb) continue;
          if (Q.x0 !== Q.x1 || Q.y0 !== Q.y1) { g.strokeStyle = 'rgba(40,40,50,.5)'; g.lineWidth = .08; g.beginPath(); g.moveTo(Q.x0, Q.y0); g.lineTo(Q.x1, Q.y1); g.stroke(); }
          g.save(); g.translate(sx, sy); g.rotate(f * .25);
          g.fillStyle = '#c8ced8'; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rr = k % 2 ? Q.r * .82 : Q.r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fill();
          g.fillStyle = '#8a929e'; g.beginPath(); g.arc(0, 0, Q.r * .55, 0, TAU); g.fill(); g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(0, 0, Q.r * .2, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-Q.r * .5, -.03, Q.r, .06);
          g.restore();
        }
        // lasers
        for (const Z of L.lasers) {
          if (Z.x < xa || Z.x > xb) continue;
          const on = Core.laserOn(Z, f), soon = !on && ((f + Z.ph) % Z.per) > Z.per - 36;
          if (on) { g.fillStyle = 'rgba(255,60,90,.28)'; g.fillRect(Z.x - .18, Z.y0, .36, Z.y1 - Z.y0 - .3); g.fillStyle = '#ff3a5a'; g.fillRect(Z.x - .07, Z.y0, .14, Z.y1 - Z.y0 - .3); g.fillStyle = '#ffd0d8'; g.fillRect(Z.x - .025, Z.y0, .05, Z.y1 - Z.y0 - .3); }
          else if (soon && (f >> 2) % 2) { g.fillStyle = 'rgba(255,60,90,.35)'; g.fillRect(Z.x - .02, Z.y0, .04, Z.y1 - Z.y0 - .3); }
        }
        // vents: rising streaks
        for (const V of L.vents) {
          if (V.x1 < xa || V.x0 > xb) continue;
          g.fillStyle = 'rgba(255,255,255,.22)';
          for (let k = 0; k < 7; k++) { const q = ((t * 1.3 + k * .37) % 1), yy = V.y1 - q * (V.y1 - V.y0), xx = V.x0 + .2 + ((k * .618) % 1) * (V.x1 - V.x0 - .4); g.fillRect(xx, yy, .05, .6 * (1 - q) + .1); }
        }
        // crates
        for (let i = 0; i < L.crates.length; i++) {
          const K = L.crates[i]; if (K.x < xa || K.x > xb) continue; const st = S.cz[i * 3 + 2], y = st === 0 ? K.y0 : S.cz[i * 3];
          if (st >= 2 && st > 12) continue;
          g.strokeStyle = '#2a2a30'; g.lineWidth = .04; if (st < 1) { g.beginPath(); g.moveTo(K.x, y - 4); g.lineTo(K.x, y); g.stroke(); }
          const a = st >= 2 ? 1 - (st - 2) / 10 : 1; g.globalAlpha = a;
          g.fillStyle = '#c8873a'; g.fillRect(K.x - .45, y, .9, .95); g.strokeStyle = '#7a4a1a'; g.lineWidth = .07; g.strokeRect(K.x - .4, y + .05, .8, .85); g.beginPath(); g.moveTo(K.x - .38, y + .07); g.lineTo(K.x + .38, y + .88); g.stroke();
          g.globalAlpha = 1;
        }
        // golden shoes
        for (let i = 0; i < L.coins.length; i++) {
          if (S.coins & (1 << i)) continue; const Q = L.coins[i]; if (Q.x < xa || Q.x > xb) continue;
          const b = Math.sin(t * 3 + i) * .1, y = Q.y + b;
          g.fillStyle = 'rgba(255,220,80,.25)'; g.beginPath(); g.arc(Q.x, y, .5 + Math.sin(t * 5 + i) * .05, 0, TAU); g.fill();
          goldShoe(g, Q.x, y, .5, Math.sin(t * 2 + i) * .15);
        }
        // checkpoints and the finish
        for (let i = 0; i < L.cps.length; i++) { const P = L.cps[i]; if (P.x < xa || P.x > xb) continue; flag(P.x, P.y, i < S.cp, t + i); }
        const F = L.finish;
        if (F.x > xa - 4 && F.x < xb + 4) finish(F.x, F.y, t);
        // water in the harbour
        if (L.water) {
          const wy = L.H - 1.3, x0 = C.x - vw / 2 - 1, x1 = C.x + vw / 2 + 1;
          g.fillStyle = 'rgba(30,110,170,.88)'; g.beginPath(); g.moveTo(x0, L.H + 3);
          for (let xx = x0; xx <= x1 + .5; xx += .5) g.lineTo(xx, wy + Math.sin(xx * 1.3 + t * 2) * .08 + Math.sin(xx * .6 - t * 1.2) * .06);
          g.lineTo(x1, L.H + 3); g.fill();
          g.fillStyle = 'rgba(255,255,255,.45)'; for (let xx = Math.floor(x0); xx < x1; xx += 1.7) g.fillRect(xx + ((t * .4) % 1.7), wy + .08 + Math.sin(xx + t) * .05, .5, .05);
        }
      }
      function goldShoe(x, cx, cy, s, a) {
        x.save(); x.translate(cx, cy); x.rotate(a); x.scale(s, s);
        x.fillStyle = '#b87a10'; x.beginPath(); x.ellipse(.05, .3, .62, .16, 0, 0, TAU); x.fill();
        const gr = x.createLinearGradient(0, -.4, 0, .3); gr.addColorStop(0, '#fff2a0'); gr.addColorStop(1, '#f0a818');
        x.fillStyle = gr; x.beginPath(); x.moveTo(-.55, .25); x.lineTo(-.5, -.3); x.quadraticCurveTo(-.3, -.45, -.1, -.3); x.lineTo(.1, -.05); x.quadraticCurveTo(.6, .0, .62, .25); x.closePath(); x.fill();
        x.strokeStyle = '#fff'; x.lineWidth = .06; x.beginPath(); x.moveTo(-.25, -.2); x.lineTo(0, -.05); x.moveTo(-.2, -.05); x.lineTo(.08, .07); x.stroke();
        x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(-.38, -.15, .06, .14, .3, 0, TAU); x.fill();
        x.restore();
      }
      function flag(x, y, on, t) {
        g.fillStyle = '#e8e8ee'; g.fillRect(x - .05, y - 2.4, .1, 2.4); g.fillStyle = '#5a5f6a'; g.fillRect(x - .2, y - .12, .4, .12);
        g.fillStyle = on ? '#3ad06a' : '#9aa0aa';
        g.beginPath(); g.moveTo(x + .05, y - 2.35);
        for (let k = 0; k <= 4; k++) g.lineTo(x + .05 + k * .25, y - 2.35 + Math.sin(t * 6 + k) * .06 * k / 4 + k * .02);
        for (let k = 4; k >= 0; k--) g.lineTo(x + .05 + k * .25, y - 1.75 + Math.sin(t * 6 + k) * .06 * k / 4 - k * .02);
        g.fill();
        if (on) { g.fillStyle = '#fff'; g.font = 'bold .4px sans-serif'; g.fillText('✓', x + .38, y - 1.9); }
      }
      function finish(x, y, t) {
        g.fillStyle = '#e8e8ee'; g.fillRect(x - 2.2, y - 3.6, .18, 3.6); g.fillRect(x + 2.02, y - 3.6, .18, 3.6);
        g.fillStyle = '#1a1a22'; g.fillRect(x - 2.2, y - 3.9, 4.4, .9);
        for (let i = 0; i < 16; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) { g.fillStyle = '#ffffff'; g.fillRect(x - 2.2 + i * .275, y - 3.9 + j * .3, .275, .3); }
        g.fillStyle = '#ffd23a'; g.fillRect(x - 1.15, y - 4.15, 2.3, .45); g.fillStyle = '#3a2400'; g.font = 'bold .36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FINISH', x, y - 3.92); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        const cols = ['#ff5a6a', '#ffd23a', '#5ad06a', '#4aa8ff']; for (let k = 0; k < 9; k++) { g.fillStyle = cols[k % 4]; const xx = x - 2 + k * .5, yy = y - 2.9 + Math.sin(t * 3 + k) * .05; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + .4, yy); g.lineTo(xx + .2, yy + .4); g.fill(); }
      }

      /* ---------- the runner (and the ghost) ---------- */
      const A = { ph: 0, land: 0, lastX: 0, rot: 0 }, GA = { ph: 0, land: 0, lastX: 0, rot: 0 };
      function anim(S, An, dt) {
        const sp = S.st === 0 || S.st === 2 || S.st === 11 ? Math.abs(S.gs) : Math.abs(S.vx);
        An.ph += dt * (2.2 + sp * .95); if (An.ph > 1e4) An.ph -= 1e4;
        if (An.land > 0) An.land = Math.max(0, An.land - dt * 6);
        // the body angle shown eases in after a landing (the core snaps upright)
        const want = S.rot; let d = want - An.rot; if (S.st === 1 || S.st === 8) An.rot = want; else An.rot += d * Math.min(1, dt * 18);
      }
      function drawRunner(S, An, Jo, O, alpha, ghost) {
        if (S.st === 9 && !ghost) return;
        const P = Rig.pose(S, An, R.t), sl = S.st === 2 ? 0 : 0;
        Rig.joints(P, S.x, S.y + sl, S.face || 1, An.rot, Jo);
        Rig.draw(g, Jo, O, alpha, ghost, R.q >= 3);
      }
      function drawRag(O) {
        if (!rag.R) return;
        Rig.ragJoints(rag.R, rag.J); Rig.draw(g, rag.J, O, 1, false);
        if (rag.R.t > .35) {                                       // cartoon stars around the head
          const [hx, hy] = rag.J.head;
          for (let k = 0; k < 4; k++) { const a = R.t * 5 + k * TAU / 4; star(hx + Math.cos(a) * .42, hy - .32 + Math.sin(a) * .12, .11, '#ffe24a'); }
        }
      }
      function star(x, y, r, col) { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
      const solidW = (x, y) => { const L = R.L, c = Math.floor(x), r = Math.floor(y); if (c < 0 || c >= L.W || r < 0 || r >= L.H) return false; const v = L.t[r * L.W + c]; if (v === 1 || v === 9 || v === 10) return true; if (v >= 2 && v <= 7) return y - r >= Core.slopeOff(v, x - c); return false; };

      /* ---------- events from the simulation ---------- */
      R.event = (S, e) => {
        const a = e.a || {};
        switch (e.t) {
          case 'land': if ((a.v || 0) > 6) { A.land = Math.min(1, (a.v - 4) / 10); dust(S.x, S.y, 5 + Math.min(8, a.v / 2)); } break;
          case 'jump': dust(S.x, S.y, 4, .7); break;
          case 'slide': dust(S.x, S.y, 6, 1.2); break;
          case 'walljump': dust(S.x + (S.vx > 0 ? -.3 : .3), S.y - 1, 6, 1); break;
          case 'vault': dust(S.x, S.y, 4); break;
          case 'spring': R.sp = { x: a.x, t: R.t }; break;
          case 'coin': { const Q = R.L.coins[a.i]; stars(Q.x, Q.y, 14, '#ffe060'); break; }
          case 'cp': { const P = R.L.cps[a.i]; confetti(P.x, P.y - 2, 18); break; }
          case 'crumble': { const ti = R.L.crum[a.i]; debris(ti % R.L.W, (ti / R.L.W) | 0, '#a87a4a'); break; }
          case 'cratehit': { const K = R.L.crates[a.i]; dust(K.x, K.y1, 10, 1.6, 'rgba(200,150,90,.8)'); break; }
          case 'crash': {
            const P = Rig.pose(S, A, R.t); Rig.joints(P, S.x, S.y, S.face || 1, A.rot, J);
            rag.R = Rig.ragdoll(J, a.vx * .7, Math.min(a.vy, 4) - 3, (a.rv || 0) * .4 + (S.face || 1) * 4);
            stars(J.head[0], J.head[1], 10); if (R.optShake) R.shake = .5; break;
          }
          case 'fall': if (R.L.water) splash(S.x, R.L.H - 1.3); break;
          case 'respawn': rag.R = null; dust(S.x, S.y, 10, 1.2, 'rgba(255,255,255,.9)'); A.rot = 0; break;
          case 'finish': confetti(S.x + 2, S.y - 3, 60); break;
          case 'flipland': if (a.perfect) stars(S.x, S.y - .8, 12, '#ffffff'); break;
          case 'bump': if (R.optShake) R.shake = Math.max(R.shake, .2); dust(S.x + (S.face || 1) * .3, S.y - .6, 4); break;
        }
      };
      R.landPuff = (S, v) => { A.land = Math.min(1, v); };
      R.snap = S => { for (let i = 0; i < 90; i++) camera(S, 1 / 30); };

      /* ---------- a frame ---------- */
      let lastT = 0;
      R.frame = (S, o = {}) => {
        const now = performance.now() / 1000, dt = lastT ? Math.min(.05, Math.max(0, now - lastT)) : 1 / 60; lastT = now; R.lastDt = dt;
        if (!o.still) R.t += dt;
        if (!R.L || !R.W) return;
        if (!o.still) { camera(S, dt); anim(S, A, dt); if (o.ghost) anim(o.ghost, GA, dt); }
        if (rag.R && !o.still) Rig.ragStep(rag.R, solidW, dt);
        if (S.st === 7 && !o.still && rnd() < .6) sparks(S.x + (rnd() - .5) * .2, S.y - 1.78, 1, rnd() < .5 ? '#ffd27a' : '#fff4c0');
        const DB = R.dbg || {};
        if (!DB.back) drawBack(); else { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#88c'; g.fillRect(0, 0, cv.width, cv.height); }
        const C = R.cam, u = R.H / C.vh, d = R.dpr;
        let sx = 0, sy = 0; if (R.shake > 0) { R.shake = Math.max(0, R.shake - dt * 1.5); const k = R.shake * R.shake * .25; sx = Math.sin(R.t * 61) * k; sy = Math.cos(R.t * 53) * k; }
        R.ox = Math.round((R.W / 2 - (C.x + sx) * u) * d); R.oy = Math.round((R.H / 2 - (C.y + sy) * u) * d);
        g.setTransform(u * d, 0, 0, u * d, R.lock ? R.ox : (R.W / 2 - (C.x + sx) * u) * d, R.lock ? R.oy : (R.H / 2 - (C.y + sy) * u) * d);
        if (!DB.level) drawLevel();
        if (!DB.obj) drawObjects(S);
        if (o.ghost && !o.ghost.done) drawRunner(o.ghost, GA, GJ, OUTFITS[0], .38, true);
        // speed lines behind the runner
        const sp = Math.abs(S.vx);
        if (sp > 11 && S.st !== 9) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .04; g.beginPath(); for (let k = 0; k < 5; k++) { const yy = S.y - .3 - k * .32, len = (sp - 10) * .25 * (1 + ((k * 7 + Math.floor(R.t * 30)) % 3) * .3); const xx = S.x - Math.sign(S.vx) * (.5 + (k % 2) * .3); g.moveTo(xx, yy); g.lineTo(xx - Math.sign(S.vx) * len, yy); } g.stroke(); }
        if (!DB.runner) drawRunner(S, A, J, o.outfit || OUTFITS[0], 1, false);
        drawRag(o.outfit || OUTFITS[0]);
        // particles
        for (let i = 0; i < NP; i++) {
          if (P.l[i] <= 0) continue;
          if (!o.still) { P.l[i] -= dt; P.vy[i] += P.g[i] * 30 * dt; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; }
          const k = P.k[i], a = Math.max(0, P.l[i] / P.ml[i]);
          g.globalAlpha = k === 3 ? Math.min(1, a * 2) : a; g.fillStyle = P.c[i];
          if (k === 0) { g.beginPath(); g.arc(P.x[i], P.y[i], P.s[i] * (1.6 - a * .6), 0, TAU); g.fill(); }
          else if (k === 1) g.fillRect(P.x[i] - P.s[i], P.y[i] - P.s[i], P.s[i] * 2, P.s[i] * 2);
          else if (k === 2) star(P.x[i], P.y[i], P.s[i], P.c[i]);
          else if (k === 3) { g.save(); g.translate(P.x[i], P.y[i]); g.rotate(P.l[i] * 8); g.fillRect(-P.s[i], -P.s[i] * .5, P.s[i] * 2, P.s[i]); g.restore(); }
          else g.fillRect(P.x[i] - P.s[i], P.y[i] - P.s[i], P.s[i] * 2, P.s[i] * 2);
        }
        g.globalAlpha = 1;
        if (o.fade > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(10,8,20,${o.fade})`; g.fillRect(0, 0, cv.width, cv.height); }
      };
      R.idle = () => { if (R.shake > 0 || rag.R) return false; for (let i = 0; i < NP; i++) if (P.l[i] > 0) return false; return true; };
      R.ragOn = () => !!rag.R;
      R.drawRunnerAt = (x, cv2, O, pose, face = 1) => {          // a portrait of the runner for menus
        const gg = cv2.getContext('2d'), w = cv2.width, h = cv2.height, s = h / 2.2;
        gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, w, h); gg.setTransform(s, 0, 0, s, w / 2, h * .94);
        const Jx = Rig.joints(pose || Rig.base(), 0, 0, face, 0, {}); Rig.draw(gg, Jx, O, 1, false);
      };
      return R;
    }
    return { create };
  })();

  /* ================= ui.js: screens, touch controls, the loop, progress, ghosts, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STEP = 1000 / 60, NL = LEVELS.length, PER = 8;
  const opt = Object.assign({ sound: true, ghost: true, big: false, shake: true, vib: true, outfit: 0, world: 0 }, store.get('dr.settings', {}));
  Sfx.gate('dr', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('dr.settings', opt);
  const sfx = (n, a, pan) => { if (opt.sound) Sfx.play(n, a, pan); };
  let stats = Object.assign({ runs: 0, done: 0, crashes: 0, flips: 0, perfects: 0, maxFlip: 0, maxCombo: 0, lv: {}, endless: 0, eruns: 0, style: 0, gold: 0, shoes: 0, levels: 0, worldShoes: 0 }, store.get('dr.stats', {}));
  const saveStats = () => {                                       // summary fields for the trophies and the stats screen
    let gold = 0, shoes = 0, levels = 0, ws = 0;
    for (let w = 0; w < WORLDS.length; w++) { let all = true; for (let i = w * PER; i < (w + 1) * PER; i++) { const r = stats.lv[i]; if (!r || r.c !== 7) all = false; } if (all) ws++; }
    for (const k in stats.lv) { const r = stats.lv[k]; if (r.m >= 3) gold++; shoes += popc(r.c || 0); if (r.t) levels++; }
    Object.assign(stats, { gold, shoes, levels, worldShoes: ws }); store.set('dr.stats', stats);
  };
  const popc = v => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };
  let run = store.get('dr.run', null);
  const saveRun = () => { if (run) store.set('dr.run', run); else store.del('dr.run'); };
  const scr = $('#dr'), stageEl = $('#drStage'), cv = $('#drCv'), pad = $('#drPad');
  const RD = Draw.create(cv);
  let GS = null, L = null, S = null, GH = null, GL = null, raf = 0, lastT = 0, acc = 0, quality = 0, frames = [], rec = null, EVC = {};
  const now = () => performance.now();
  const SHOWN = document.getElementsByClassName('modal show'); let mUp = false, mT = 0;
  const modalUp = () => { if (mUp || ++mT % 6 === 0) mUp = SHOWN.length > 0; return mUp; };
  let portraitF = innerHeight > innerWidth * 1.05; const portraitNow = () => portraitF;
  addEventListener('resize', () => { portraitF = innerHeight > innerWidth * 1.05; });
  const fmt = f => { const s = f / 60, m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
  const fmt1 = f => { const s = f / 60, m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  const MEDAL = ['', '🥉', '🥈', '🥇'], MNAME = ['Gehaald!', 'Brons!', 'Zilver!', 'Goud!'];
  const levelDef = i => LEVELS[i];
  const medalOf = (i, f) => { const M = LEVELS[i].medals; if (!M) return 1; return f <= M[0] ? 3 : f <= M[1] ? 2 : f <= M[2] ? 1 : 0; };
  const starsTotal = () => { let s = 0; for (const k in stats.lv) s += stats.lv[k].m || 0; return s; };
  const shoesTotal = () => { let s = 0; for (const k in stats.lv) s += popc(stats.lv[k].c || 0); return s; };
  const worldOpen = w => w === 0 || (starsTotal() >= WORLDS[w].need && !!(stats.lv[w * PER - 1] || {}).t);
  const levelOpen = i => worldOpen(Math.floor(i / PER)) && (i % PER === 0 || !!(stats.lv[i - 1] || {}).t);
  const endlessOpen = () => !!(stats.lv[2] || {}).t;
  // the shoe icon for the HUD and the cards
  const SHOE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24"><ellipse cx="1" cy="6" rx="11" ry="3" fill="#b87a10"/><path d="M-10 5L-9-6Q-6-9-2-6L2-1Q11 0 11 5Z" fill="#ffd23a" stroke="#c88a10" stroke-width="1"/><path d="M-5-4L0-1M-4-1L1 1" stroke="#fff" stroke-width="1.2"/><ellipse cx="-7" cy="-3" rx="1" ry="2.5" fill="#fff" opacity=".8"/></svg>');

  /* ---------- view switching and sizing ---------- */
  function setView(v) {
    if (GS) GS.view = v;
    scr.classList.toggle('play', v === 'play'); scr.classList.toggle('lv', v === 'lv');
    Sfx.track('dr', v === 'play' ? 'dr' : 'drm');
    if (v === 'play' && screen.orientation && screen.orientation.lock) { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
    layoutPad(); kick();
  }
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const d = Math.min(window.__drDpr || [1.75, 1.3, 1, .75, .62][quality], devicePixelRatio || 1);
    RD.resize(r.width, r.height, d); layoutPad();
    $('#drHud').style.setProperty('--s', Math.max(.8, Math.min(1.25, r.height / 412)).toFixed(3));
    if (S && !raf) drawStill();
  }
  window.addEventListener('resize', () => { if (current === 'dr') setTimeout(fit, 60); });
  function drawStill() { if (S && L) RD.frame(S, { still: 1, ghost: GH, outfit: OUTFITS[opt.outfit] }); }

  /* ---------- the loop: fixed 60 Hz steps, rendering every animation frame, stopped when nothing moves ---------- */
  let rekick = false;
  function kick() { if (raf === -1) { rekick = true; return; } if (!raf && current === 'dr' && GS && (GS.view === 'play' || GS.view === 'attract')) { lastT = now(); raf = requestAnimationFrame(loop); } }
  let pollT = 0;
  function pollResume() { clearTimeout(pollT); pollT = setTimeout(() => { if (current !== 'dr' || !GS || GS.view !== 'play') return; if (anyModal() || portraitNow()) { pollResume(); return; } kick(); }, 250); }
  function loop(ts) {
    raf = -1; rekick = false;
    try { loopBody(ts); } finally { if (raf === -1) { raf = 0; if (rekick && current === 'dr') raf = requestAnimationFrame(loop); } rekick = false; }
  }
  function loopBody(ts) {
    if (current !== 'dr' || !GS || !S) return;
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(100, Math.max(0, ts - lastT)); lastT = ts;
    if (GS.view === 'attract') { stepAttract(dt); raf = requestAnimationFrame(loop); return; }
    if (GS.view !== 'play') return;
    const paused = modalUp() || portraitNow() || GS.manual;
    if (!paused) {
      acc += dt * (window.__drSpeed || 1); let n = 0;
      while (acc >= STEP && n < 6) { acc -= STEP; n++; stepGame(); if (!GS || GS.view !== 'play') return; }
      if (n >= 6) acc = 0;
      perfWatch(dt);
    } else acc = 0;
    RD.frame(S, { ghost: opt.ghost ? GH : null, outfit: OUTFITS[opt.outfit], fade: fadeOf(), still: paused });
    hud();
    if (paused && !GS.manual) { pollResume(); return; }
    if (GS.manual) return;
    if (GS.resultsUp && RD.idle()) return;
    raf = requestAnimationFrame(loop);
  }
  const fadeOf = () => { if (!S) return 0; if (S.st === 9 || S.st === 10) { const d = S.dead, tot = S.st === 9 ? Core.C.DEAD : Core.C.DEADFALL; return d < 14 ? (14 - d) / 14 * .9 : 0; } return S.st === 0 && GS && GS.fadeIn > 0 ? GS.fadeIn / 14 * .9 : 0; };
  let pwT = 0, pwN = 0;
  function perfWatch(dt) {
    pwT += dt; pwN++; if (pwN < 45) return;
    const avg = pwT / pwN; pwT = 0; pwN = 0;
    if (avg > 18.3 && quality < 4) { quality++; RD.setQuality(quality); fit(); }
  }

  /* ---------- touch controls ---------- */
  const PAD = { held: 0, pend: 0 };
  const IC = {
    L: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M15.5 4 7 12l8.5 8z"/></svg>', R: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M8.5 4 17 12l-8.5 8z"/></svg>',
    J: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 3 4 12h5v8h6v-8h5z"/></svg>', S: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M3 17h13l-3-3 1.6-1.6L20.2 18l-5.6 5.6L13 22l3-3H3zM6 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"/></svg>',
    CCW: '<svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M7 8.5A7 7 0 1 1 5.6 15"/><path fill="#fff" d="M2.5 4.5 9.5 3.6 8 10.6z"/></svg>',
    CW: '<svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M17 8.5A7 7 0 1 0 18.4 15"/><path fill="#fff" d="M21.5 4.5 14.5 3.6 16 10.6z"/></svg>',
  };
  const BTNS = [['L', '', 'L', ''], ['R', '', 'R', ''], ['J', 'j', 'J', 'Springen'], ['S', 's', 'S', 'Glijden'], ['CCW', 'f', 'CCW', 'Salto'], ['CW', 'f', 'CW', 'Salto']];
  const BIT = { L: KB.L, R: KB.R, J: KB.J, S: KB.S, CCW: KB.CCW, CW: KB.CW };
  const btnEl = {};
  for (const [k, cls, ic, lbl] of BTNS) { const b = document.createElement('div'); b.className = 'dr-b ' + cls; b.dataset.b = k; b.innerHTML = IC[ic] + (lbl ? `<small>${lbl}</small>` : ''); pad.appendChild(b); btnEl[k] = b; }
  let layout = null;
  function layoutPad() {
    const W = RD.W, H = RD.H; if (!W || !H) return;
    const s = Math.max(.74, Math.min(1.3, H / 412)) * (opt.big ? 1.2 : 1), m = 14 + (opt.big ? 4 : 0);
    const r1 = 40 * s, rj = 50 * s, rs = 38 * s, rf = 33 * s;
    const P = {
      L: [m + r1 + 4, H - m - r1 - 6, r1], R: [m + r1 * 3 + 22 * s, H - m - r1 - 6, r1],
      J: [W - m - rj - 6, H - m - rj - 4, rj], S: [W - m - rj * 2 - rs - 26 * s, H - m - rs - 2, rs],
      CCW: [W - m - rj * 2 - rf - 18 * s, H - m - rs * 2 - rf - 30 * s, rf], CW: [W - m - rf - 10 * s, H - m - rj * 2 - rf - 26 * s, rf],
    };
    for (const k in P) { const [x, y, r] = P[k], el = btnEl[k]; Object.assign(el.style, { left: (x - r) + 'px', top: (y - r) + 'px', width: r * 2 + 'px', height: r * 2 + 'px' }); const sm = el.querySelector('small'); if (sm) sm.style.fontSize = Math.max(8, 10 * s) + 'px'; }
    layout = P;
  }
  const ptrs = new Map();
  function nearest(x, y, group) {
    let best = null, bd = 1e9;
    for (const k in layout) { if (group && !group.includes(k)) continue; const [bx, by, r] = layout[k], d = Math.hypot(x - bx, y - by); if (d < r * 1.3 && d < bd) { bd = d; best = k; } }
    // the left half below the middle steers even between the buttons
    if (!best && (!group || group.includes('L')) && x < RD.W * .3 && y > RD.H * .45) best = x < (layout.L[0] + layout.R[0]) / 2 ? 'L' : 'R';
    return best;
  }
  function press(k, on) {
    const bit = BIT[k];
    if (on) { PAD.held |= bit; PAD.pend |= bit; btnEl[k].classList.add('on'); Sfx.play('__warm'); }
    else { PAD.held &= ~bit; btnEl[k].classList.remove('on'); }
  }
  pad.addEventListener('pointerdown', e => {
    if (!GS || GS.view !== 'play' || !layout) return; e.preventDefault();
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, k = nearest(x, y);
    if (!k) return;
    ptrs.set(e.pointerId, k); press(k, true);
    try { pad.setPointerCapture(e.pointerId); } catch (er) {}
  });
  pad.addEventListener('pointermove', e => {
    const k0 = ptrs.get(e.pointerId); if (!k0 || !layout) return;
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const grp = k0 === 'L' || k0 === 'R' ? ['L', 'R'] : k0 === 'CW' || k0 === 'CCW' ? ['CW', 'CCW'] : null; if (!grp) return;
    const k = nearest(x, y, grp); if (k && k !== k0) { press(k0, false); ptrs.set(e.pointerId, k); press(k, true); }
  });
  const ptrUp = e => { const k = ptrs.get(e.pointerId); if (!k) return; ptrs.delete(e.pointerId); if (![...ptrs.values()].includes(k)) press(k, false); };
  pad.addEventListener('pointerup', ptrUp); pad.addEventListener('pointercancel', ptrUp);
  function releaseAll() { ptrs.clear(); PAD.held = PAD.pend = 0; for (const k in btnEl) btnEl[k].classList.remove('on'); KEYS.clear(); }
  // keyboard: arrows / WASD, space = jump, down/S = slide, Q/Z and E/X = flips, Esc/P = pause
  const KEYS = new Map();
  const KMAP = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'J', KeyW: 'J', Space: 'J', ArrowDown: 'S', KeyS: 'S', KeyQ: 'CCW', KeyZ: 'CCW', KeyE: 'CW', KeyX: 'CW' };
  document.addEventListener('keydown', e => {
    if (current !== 'dr' || !GS) return;
    if ((e.code === 'Escape' || e.code === 'KeyP') && GS.view === 'play' && !anyModal()) { openPause(); return; }
    if (GS.view !== 'play' || anyModal()) return;
    const k = KMAP[e.code]; if (!k) return; e.preventDefault(); if (KEYS.has(e.code)) return; KEYS.set(e.code, k); press(k, true);
  });
  document.addEventListener('keyup', e => { const k = KEYS.get(e.code); if (!k) return; KEYS.delete(e.code); if (![...KEYS.values()].includes(k)) press(k, false); });
  const padBits = () => { const b = PAD.held | PAD.pend; PAD.pend = 0; return b; };

  /* ---------- one simulation step ---------- */
  function stepGame() {
    const bits = GS.bot ? GS.bot() : padBits();
    if (rec) { if (rec.length && rec[rec.length - 2] === bits && rec[rec.length - 1] < 60000) rec[rec.length - 1]++; else rec.push(bits, 1); }
    const cpBefore = S.cp;
    Core.step(L, S, bits);
    for (const e of S.ev) { EVC[e.t] = (EVC[e.t] || 0) + 1; RD.event(S, e); feedback(e); }
    if (GH && GL) { if (!GH.done && GH.f < GH.max) Core.step(GL, GH, ghostBits()); }
    if (GS.fadeIn > 0) GS.fadeIn--;
    if (S.cp !== cpBefore && GS.mode === 'level') { saveProgressRun(); }
    // tutorial hints
    if (L.hints.length && GS.hintI < L.hints.length && S.x >= L.hints[GS.hintI].x - .5) { showHint(L.hints[GS.hintI]); GS.hintI++; }
    if (S.done && !GS.endAt) GS.endAt = S.f + (S.done === 2 ? 50 : 75);
    if (GS.endAt && S.f >= GS.endAt && !GS.resultsUp) results();
  }
  let ghostRle = null, gi = 0, gk = 0;
  function ghostBits() { if (!ghostRle) return 0; while (gi < ghostRle.length && gk >= ghostRle[gi + 1]) { gi += 2; gk = 0; } if (gi >= ghostRle.length) return 0; gk++; return ghostRle[gi]; }
  const panOf = x => Math.max(-1, Math.min(1, (x - RD.cam.x) / 10)) * .4;
  let stepT = 0;
  function feedback(e) {
    const a = e.a || {};
    switch (e.t) {
      case 'jump': sfx('drJump'); break;
      case 'land': { const v = a.v || 0; if (v > 3) sfx(v > 14 ? 'drLandH' : 'drLand'); break; }
      case 'slide': sfx('drSlide'); break;
      case 'walljump': sfx('drWall'); vib(10); break;
      case 'wall': case 'wallrun': sfx('drGrab'); break;
      case 'vault': sfx('drVault'); break;
      case 'grab': sfx('drGrab'); break;
      case 'climb': sfx('drClimb'); break;
      case 'spin': sfx('drFlip'); break;
      case 'flip': sfx('drFlip'); break;
      case 'flipland': if (a.perfect) sfx('drPerfect'); vib(14); break;
      case 'stumble': sfx('drLand'); trickText('Wankel!', 'bad'); break;
      case 'crash': sfx('drCrash'); vib(50); stats.crashes++; GS.crashes++; break;
      case 'fall': sfx(L.water ? 'drSplash' : 'drFall'); stats.crashes++; GS.crashes++; break;
      case 'respawn': sfx('drRespawn'); GS.fadeIn = 14; break;
      case 'spring': sfx('drSpring'); break;
      case 'coin': sfx('drCoin'); vib(8); break;
      case 'cp': sfx('drCheck'); trickText('🚩 Vlag!', '', GS.mode === 'level' && GS.lv < 3 ? 'hier begin je opnieuw' : '', true); break;
      case 'zip': sfx('drZip'); break;
      case 'bar': sfx('drGrab'); break;
      case 'barjump': sfx('drJump'); break;
      case 'crack': sfx('drCrack'); break;
      case 'crumble': sfx('drCrumble'); break;
      case 'crate': sfx('drCreak'); break;
      case 'cratehit': sfx('drThud'); break;
      case 'bump': sfx('drBump'); break;
      case 'bonk': sfx('drBump'); break;
      case 'finish': sfx('drFinish'); vib(30); break;
      case 'trick': trickText(a.name, a.combo > 1 ? '' : '', a.combo > 1 ? `combo ×${a.combo}` : '', /Perfect|Dubbele|Driedubbele|Wervel/.test(a.name)); break;
    }
    // footsteps follow the running speed
    if (S.st === 0 && Math.abs(S.gs) > 1.5) { stepT += Math.abs(S.gs) / 60; if (stepT > 1.15) { stepT = 0; sfx('drStep'); } }
  }
  const vib = ms => { if (opt.vib) vibrate(ms); };

  /* ---------- HUD (HTML, updated only when a value changes) ---------- */
  const H = { time: $('#drTime'), goal: $('#drGoal'), shoes: $('#drShoes'), flags: $('#drFlags'), tricks: $('#drTricks'), hint: $('#drHint') };
  let hudK = '', hudT = -1;
  function hud() {
    if (!S || !GS) return;
    const f = GS.mode === 'endless' ? S.f : (S.done ? S.fin : S.f), tt = Math.floor(f / 6);
    if (GS.mode === 'endless') { const m = Math.max(0, Math.floor(S.best - L.start.x)); if (tt !== hudT) { hudT = tt; H.time.textContent = m + ' m'; } }
    else if (tt !== hudT) {
      hudT = tt; H.time.textContent = fmt1(f);
      const M = L.medals; if (M) { const nx = f <= M[0] ? 0 : f <= M[1] ? 1 : f <= M[2] ? 2 : 3; H.goal.innerHTML = nx < 3 ? `<i>${MEDAL[3 - nx]}</i> ${fmt1(M[nx])}` : 'geen medaille'; }
    }
    const k = GS.mode === 'endless' ? 'e' + S.lives + '|' + Math.floor(S.style) : S.coins + '|' + S.cp;
    if (k !== hudK) {
      hudK = k;
      if (GS.mode === 'endless') { H.shoes.innerHTML = '❤️'.repeat(Math.max(0, S.lives)) + '<span style="opacity:.3">' + '❤️'.repeat(Math.max(0, 3 - S.lives)) + '</span>'; H.flags.textContent = '✨ ' + S.style; }
      else { H.shoes.innerHTML = L.coins.map((_, i) => `<img src="${SHOE}" class="${S.coins & (1 << i) ? '' : 'off'}" alt="">`).join(''); H.flags.textContent = L.cps.length ? `🚩 ${S.cp}/${L.cps.length}` : ''; H.flags.style.display = L.cps.length ? '' : 'none'; }
    }
  }
  function trickText(t, cls = '', sub = '', big = false) {
    const el = document.createElement('div'); el.className = 'drt' + (big ? ' big' : '') + (cls ? ' ' + cls : ''); el.innerHTML = esc(t) + (sub ? `<small>${esc(sub)}</small>` : '');
    H.tricks.appendChild(el); while (H.tricks.children.length > 3) H.tricks.firstChild.remove();
    setTimeout(() => el.remove(), 1450);
  }
  let hintT = 0;
  function showHint(h) {
    const ic = { j: ['j', '⤒'], s: ['s', '⤓'], f: ['f', '↻'], r: ['r', '▶'], c: ['c', '👟'], w: ['j', '⤒'] }[h.ic] || ['r', '💡'];
    H.hint.querySelector('i').className = ic[0]; H.hint.querySelector('i').textContent = ic[1]; H.hint.querySelector('span').textContent = h.t;
    H.hint.classList.add('show'); clearTimeout(hintT); hintT = setTimeout(() => H.hint.classList.remove('show'), 5200);
  }
  let toastT = 0;
  function toast(t) { const el = $('#drToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

  /* ---------- starting a level ---------- */
  const lvCache = {};
  function getLevel(i) { if (!lvCache[i]) lvCache[i] = buildLevel(LEVELS[i], i); return lvCache[i]; }
  function levelHash(L) { let h = 2166136261; for (let i = 0; i < L.t.length; i++) { h ^= L.t[i]; h = Math.imul(h, 16777619); } return (h >>> 0) + ':' + L.coins.length + ':' + L.cps.length + ':' + L.W; }
  function startLevel(i, resume) {
    closeModals(); releaseAll(); clearHint();
    L = getLevel(i); S = Core.newState(L); EVC = {};
    GS = { view: 'play', mode: 'level', lv: i, hintI: 0, endAt: 0, resultsUp: false, crashes: 0, resumed: !!resume, fadeIn: 14 };
    if (resume && run && run.lv === i) {
      S.cp = Math.min(run.cp || 0, L.cps.length); S.coins = run.coins || 0; S.style = run.style || 0; S.crashes = run.crashes || 0;
      Core.step(L, S, 0); S.f = run.f || 0; S.cp = Math.min(run.cp || 0, L.cps.length);
      if (S.cp > 0) { S.dead = 1; S.st = ST.FALL; Core.step(L, S, 0); }                   // put the runner at the flag
      S.f = run.f || 0; GS.hintI = L.hints.filter(h => h.x < S.x).length;
    }
    rec = GS.resumed ? null : [];
    // the ghost of the best run on this level
    GH = null; GL = null; ghostRle = null; gi = 0; gk = 0;
    const gs = store.get('dr.ghost', {})[i];
    if (opt.ghost && gs && gs.v === CORE_V && gs.h === levelHash(L) && !GS.resumed) { GL = L; GH = Core.newState(L, { noEv: true }); GH.max = gs.f + 120; ghostRle = gs.rle; }
    run = { lv: i, cp: S.cp, f: S.f, coins: S.coins, style: S.style, crashes: S.crashes }; saveRun();
    stats.runs++; saveStats();
    RD.setLevel(L, L.world); RD.reset(S); hudK = ''; hudT = -1; H.goal.innerHTML = '';
    setView('play'); fit(); hud(); kick();
    $('#dr').dataset.world = L.world;
  }
  function startEndless() {
    closeModals(); releaseAll(); clearHint();
    const seed = (Math.random() * 1e9) | 0;
    L = buildLevel(genEndless(seed), 99); L.world = Math.floor(Math.random() * 4); S = Core.newState(L, { endless: true, lives: 3 }); EVC = {};
    GS = { view: 'play', mode: 'endless', lv: -1, hintI: 0, endAt: 0, resultsUp: false, crashes: 0, fadeIn: 14 };
    rec = null; GH = null; GL = null; stats.eruns++; saveStats();
    RD.setLevel(L, L.world); RD.reset(S); hudK = ''; hudT = -1; H.goal.innerHTML = 'eindeloze run';
    setView('play'); fit(); hud(); kick();
  }
  function saveProgressRun() { if (!GS || GS.mode !== 'level' || !S || S.done) return; run = { lv: GS.lv, cp: S.cp, f: S.f, coins: S.coins, style: S.style, crashes: S.crashes }; saveRun(); }
  function clearHint() { H.hint.classList.remove('show'); H.tricks.innerHTML = ''; }

  /* ---------- the end of a run ---------- */
  function results() {
    GS.resultsUp = true; releaseAll();
    stats.flips += S.flips; stats.perfects += S.perfects; stats.maxFlip = Math.max(stats.maxFlip, S.maxFlip); stats.maxCombo = Math.max(stats.maxCombo, S.maxCombo);
    let pic = '🏁', title = '', text = '', btns = [];
    if (GS.mode === 'endless') {
      const m = Math.max(0, Math.floor(S.best - L.start.x)), rec0 = stats.endless || 0, nw = m > rec0;
      if (nw) stats.endless = m; stats.style = Math.max(stats.style || 0, S.style);
      pic = nw ? '🏆' : '🏃'; title = nw ? 'Nieuw record!' : 'Run voorbij';
      text = `<div class="dr-res"><div><b>${m} m</b><small>afstand</small></div><div><b>${S.style}</b><small>stijlpunten</small></div><div><b>${Math.max(m, rec0)} m</b><small>record</small></div></div>`;
      btns = [['drEMenu', 'Menu', 0], ['drEAgain', 'Nog een run ▶', 1]];
      if (nw) sfx('drMedal');
    } else {
      const i = GS.lv, f = S.fin, m = medalOf(i, f), old = stats.lv[i] || {}, first = !old.t, best = !old.t || f < old.t;
      const starsBefore = starsTotal(), shoesBefore = shoesTotal();
      const r = stats.lv[i] = { t: best ? f : old.t, m: Math.max(old.m || 0, m), c: (old.c || 0) | S.coins, s: Math.max(old.s || 0, S.style) };
      stats.done++;
      if (best && rec && !GS.resumed) { const gst = store.get('dr.ghost', {}); gst[i] = { v: CORE_V, h: levelHash(L), f, rle: rec }; try { store.set('dr.ghost', gst); } catch (e) {} }
      run = null; saveRun();
      const M = L.medals || [0, 0, 0];
      pic = m ? MEDAL[m] : '🏁'; title = m === 3 ? 'Goud!' : m === 2 ? 'Zilver!' : m === 1 ? 'Brons!' : 'Gehaald!';
      const coins = popc(S.coins);
      text = `<div class="dr-res"><div><b>${fmt(f)}</b><small>${best && !first ? '<span class="dr-new">nieuw record!</span>' : 'tijd'}</small></div><div><b>${coins}/${L.coins.length} <img src="${SHOE}" style="width:18px;vertical-align:-3px" alt=""></b><small>schoentjes</small></div><div><b>${S.style}</b><small>stijlpunten</small></div></div>`
        + `<div class="dr-medals">${[3, 2, 1].map(k => `<span class="${m >= k ? 'got' : ''}">${MEDAL[k]} ${fmt1(M[3 - k])}</span>`).join('')}</div>`
        + `<div>Beste tijd <b>${fmt(r.t)}</b>${GS.crashes ? ` · ${GS.crashes}× gevallen` : ''}${S.maxCombo > 2 ? ` · langste combo ×${S.maxCombo}` : ''}</div>`;
      const starsNow = starsTotal(), shoesNow = shoesTotal(), notes = [];
      for (let w = 1; w < WORLDS.length; w++) if (worldOpen(w) && !(stats.seenW || {})[w]) { stats.seenW = Object.assign(stats.seenW || {}, { [w]: 1 }); notes.push(`${WORLDS[w].emo} Nieuwe wereld open: <b>${WORLDS[w].full}</b>!`); }
      OUTFITS.forEach((O, k) => { if (k && shoesBefore < O.need && shoesNow >= O.need) notes.push(`👕 Nieuwe outfit: <b>${O.nm}</b>!`); });
      if (i === 2 && first) notes.push('♾️ De <b>Eindeloze run</b> is nu open!');
      if (notes.length) text += `<div style="margin-top:6px">${notes.join('<br>')}</div>`;
      const nextOpen = i + 1 < NL && levelOpen(i + 1);
      btns = [['drELevels', 'Levels', 0], ['drERetry', '↻ Opnieuw', 0]]; if (nextOpen) btns.push(['drENext', 'Volgende ▶', 1]); else btns[1][2] = 1;
      setTimeout(() => sfx(m ? 'drMedal' : 'drOk'), 350);
      if (i === NL - 1 && !old.t) notes.push('🌃 Je bent de koning van de daken!');
    }
    saveStats();
    const pe = $('#drEndPic'); pe.textContent = pic; pe.classList.remove('pop'); void pe.offsetWidth; pe.classList.add('pop');
    $('#drEndTitle').textContent = title; $('#drEndText').innerHTML = text;
    $('#drEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    openModal('drEndModal');
  }
  $('#drEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('drOk');
    switch (b.id) {
      case 'drENext': startLevel(GS.lv + 1); break;
      case 'drERetry': startLevel(GS.lv); break;
      case 'drELevels': openLevels(); break;
      case 'drEAgain': startEndless(); break;
      case 'drEMenu': openStart(); break;
    }
  });

  /* ---------- pause ---------- */
  const OPTS = { sound: ['Geluidseffecten', ''], music: ['Achtergrondmuziek', ''], ghost: ['Geest', 'je beste run rent mee'], big: ['Grote knoppen', ''], shake: ['Schermschudden', ''], vib: ['Trillen', ''] };
  function optRows(keys) { return keys.map(k => `<div class="opt"><div class="opt-label">${OPTS[k][0]}${OPTS[k][1] ? ` <small style="color:var(--muted)">· ${OPTS[k][1]}</small>` : ''}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join(''); }
  function onOpt(e, again) {
    const b = e.target.closest('button[data-k]'); if (!b) return false;
    const k = b.dataset.k; opt[k] = b.dataset.v === 'true';
    saveOpt(); RD.optShake = opt.shake; Sfx.refresh && Sfx.refresh(); layoutPad();
    if (k === 'ghost' && !opt.ghost) GH = null;
    sfx('drSel'); again(); return true;
  }
  function openPause() {
    if (!GS || GS.view !== 'play' || !S || GS.resultsUp) return;
    releaseAll(); sfx('drSel'); saveProgressRun();
    $('#drPInfo').innerHTML = GS.mode === 'endless' ? `Eindeloze run · ${Math.max(0, Math.floor(S.best - L.start.x))} m` : `Level ${GS.lv + 1}: <b>${esc(L.nm)}</b> · ${fmt1(S.f)}`;
    $('#drPCheck').style.display = GS.mode === 'level' ? '' : 'none';
    $('#drPOpts').innerHTML = optRows(['sound', 'music', 'ghost', 'big']);
    if (!$('#drPauseModal').classList.contains('show')) closeModals();
    openModal('drPauseModal');
  }
  $('#drPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#drPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#drPRestart').addEventListener('click', () => { if (GS.mode === 'endless') startEndless(); else { run = null; saveRun(); startLevel(GS.lv); } });
  $('#drPCheck').addEventListener('click', () => { closeModals(); if (S && S.st !== 9 && S.st !== 10 && !S.done) { S.st = 10; S.dead = 1; GS.crashes++; } kick(); });
  $('#drPLevels').addEventListener('click', () => { saveProgressRun(); openLevels(); });
  $('#drPQuit').addEventListener('click', () => { saveProgressRun(); openStart(); });
  $('#drPOpts').addEventListener('click', e => onOpt(e, openPause));

  /* ---------- level select ---------- */
  const lvGrid = $('#drLvGrid');
  function openLevels() {
    closeModals(); releaseAll(); clearHint();
    GS = Object.assign(GS || {}, { view: 'lv' }); if (GS.resultsUp) GS.resultsUp = false;
    attract(opt.world);
    setView('lv'); renderLevels();
  }
  function renderLevels() {
    const st = starsTotal(), sh = shoesTotal();
    $('#drLvSum').textContent = `⭐ ${st} · 👟 ${sh}/${NL * 3}`;
    $('#drWorlds').innerHTML = WORLDS.map((W, w) => `<button data-w="${w}" class="${w === opt.world ? 'on' : ''}${worldOpen(w) ? '' : ' lock'}">${W.emo} <span>${W.nm}</span>${worldOpen(w) ? '' : ' 🔒'}</button>`).join('');
    const w = opt.world, W = WORLDS[w];
    if (!worldOpen(w)) {
      const needLv = !(stats.lv[w * PER - 1] || {}).t, needSt = Math.max(0, W.need - st);
      lvGrid.innerHTML = `<div class="dr-wlock"><b>${W.emo} ${W.full}</b>${needLv ? `Haal eerst level ${w * PER} van ${WORLDS[w - 1].nm}.<br>` : ''}${needSt ? `Je hebt nog <b>${needSt}</b> ⭐ nodig (medailles: brons 1, zilver 2, goud 3).` : ''}</div>`;
      return;
    }
    let nextI = -1; for (let i = w * PER; i < (w + 1) * PER; i++) if (levelOpen(i) && !(stats.lv[i] || {}).t) { nextI = i; break; }
    lvGrid.innerHTML = Array.from({ length: PER }, (_, k) => {
      const i = w * PER + k; if (i >= NL) return '';
      const r = stats.lv[i] || {}, open = levelOpen(i);
      return `<button class="dr-card${open ? '' : ' lock'}${i === nextI ? ' next' : ''}" data-i="${i}" style="--c1:${W.col[0]};--c2:${W.col[1]}"><b>${i + 1}</b><span>${esc(LEVELS[i].n)}</span>${r.m ? `<i class="md">${MEDAL[r.m]}</i>` : ''}<em><span class="sh">${[0, 1, 2].map(j => `<img src="${SHOE}" class="${(r.c || 0) & (1 << j) ? '' : 'off'}" alt="">`).join('')}</span>${r.t ? fmt1(r.t) : ''}</em></button>`;
    }).join('');
  }
  $('#drWorlds').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; opt.world = +b.dataset.w; saveOpt(); sfx('drSel'); renderLevels(); attract(opt.world); });
  lvGrid.addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i;
    if (!levelOpen(i)) { sfx('drNo'); toast(i % PER === 0 ? 'Deze wereld is nog op slot.' : `Haal eerst level ${i}.`); return; }
    sfx('drOk'); if (run && run.lv === i) startLevel(i, true); else { run = null; saveRun(); startLevel(i); }
  });
  $('#drLvBack').addEventListener('click', () => { sfx('drSel'); openStart(); });
  $('#drRotBack').addEventListener('click', () => { saveProgressRun(); openLevels(); });

  /* ---------- the start dialog ---------- */
  function outfitCanvas(k) { const c = document.createElement('canvas'); c.width = 96; c.height = 110; RD.drawRunnerAt(0, c, OUTFITS[k], Object.assign(Rig.base(), { a1: .5, e1: 1.2, a2: -.4, e2: .9, t1: .25, t2: -.15, k1: .2, tilt: -.05 }), 1); return c; }
  function renderStart() {
    $('#drContinue').hidden = !run;
    if (run) $('#drContinue').innerHTML = `<span><b>Verder met level ${run.lv + 1}</b><small>${esc(LEVELS[run.lv].n)} · ${run.cp ? 'bij vlag ' + run.cp : 'vanaf de start'} · ${fmt1(run.f || 0)}</small></span><em>Verder ▶</em>`;
    const done = Object.values(stats.lv).filter(r => r.t).length;
    $('#drModes').innerHTML = `<button class="dr-mode main" data-m="levels"><span class="ic">🏙️</span><b>Levels</b><small>${done}/${NL} gehaald · ⭐ ${starsTotal()}</small></button>`
      + `<button class="dr-mode" data-m="endless"${endlessOpen() ? '' : ' disabled'}><span class="ic">♾️</span><b>Eindeloze run</b><small>${endlessOpen() ? `Hoe ver kom jij? Record: ${stats.endless || 0} m` : 'Haal eerst level 3'}</small></button>`;
    const sh = shoesTotal();
    const oc = $('#drOutfits'); oc.innerHTML = '';
    OUTFITS.forEach((O, k) => { const b = document.createElement('button'); const lock = sh < O.need; b.className = (opt.outfit === k ? 'on' : '') + (lock ? ' lock' : ''); b.dataset.o = k; b.appendChild(outfitCanvas(k)); const s = document.createElement('small'); s.textContent = lock ? `👟 ${O.need}` : O.nm; b.appendChild(s); oc.appendChild(b); });
    $('#drOutNote').textContent = `· verdien outfits met gouden schoentjes (${sh})`;
    $('#drOpts').innerHTML = optRows(['sound', 'music', 'ghost', 'big', 'shake', 'vib']);
    const gold = Object.values(stats.lv).filter(r => r.m >= 3).length;
    $('#drStats').innerHTML = [['Levels', `${done}/${NL}`], ['Goud', gold], ['Schoentjes', `${sh}/${NL * 3}`]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('')
      + `<div class="dr-line">${stats.flips} salto's · ${stats.perfects} perfecte landingen · beste combo ×${stats.maxCombo || 0}${stats.endless ? ` · eindeloos ${stats.endless} m` : ''}</div>`;
  }
  function openStart() {
    releaseAll(); closeModals(); clearHint();
    GS = { view: 'start' }; L = null; S = null; GH = null; rec = null;
    attract(opt.world);
    setView('start'); renderStart(); openModal('drStartModal');
  }
  // a little living scene behind the dialogs: the runner jogs over the first roofs of a world (no loop when nothing moves)
  let AT = null;
  function attract(w) {
    try {
      const i = Math.min(NL - 1, w * PER);
      L = getLevel(i); S = Core.newState(L); AT = { t: 0 }; GH = null;
      for (let k = 0; k < 40; k++) Core.step(L, S, KB.R);
      RD.setLevel(L, L.world); RD.reset(S); fit(); RD.frame(S, { outfit: OUTFITS[opt.outfit] });
      if (GS) { GS.view = GS.view === 'start' || GS.view === 'lv' ? GS.view : GS.view; }
    } catch (e) { console.error(e); }
  }
  function stepAttract() {}
  $('#drModes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b || b.disabled) return; sfx('drOk'); if (b.dataset.m === 'levels') openLevels(); else startEndless(); });
  $('#drContinue').addEventListener('click', () => { if (!run) return; sfx('drOk'); startLevel(run.lv, true); });
  $('#drOutfits').addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (!b) return; const k = +b.dataset.o; if (shoesTotal() < OUTFITS[k].need) { sfx('drNo'); toast(`Verzamel ${OUTFITS[k].need} gouden schoentjes voor deze outfit.`); return; } opt.outfit = k; saveOpt(); sfx('drOk'); renderStart(); if (S) drawStill(); });
  $('#drOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#drStartBack').addEventListener('click', () => { closeModals(); quit(); });

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('dr'); RD.optShake = opt.shake;
    requestAnimationFrame(() => fit());
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { setView('play'); fit(); drawStill(); openPause(); return; }
    openStart();
  }
  function quit() { if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); saveProgressRun(); releaseAll(); closeModals(); clearHint(); GS = null; S = null; L = null; GH = null; scr.classList.remove('play', 'lv'); show('menu'); refreshMenu(); }
  // back: during a run it pauses; on the level select it goes back to the start dialog
  function leave() {
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { setTimeout(() => { if (current === 'dr' && !anyModal()) openPause(); }, 0); return; }
    if (GS && GS.view === 'lv') { setTimeout(() => { if (current === 'dr') openStart(); }, 0); return; }
    if (GS && GS.view === 'play' && GS.resultsUp) { setTimeout(() => { if (current === 'dr') openLevels(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'dr' && GS && GS.view === 'play' && !GS.resultsUp && !anyModal()) openPause(); });

  /* ---------- test hooks ---------- */
  window.__dr = {
    get S() { return S; }, get L() { return L; }, get G() { return GS; }, get GH() { return GH; }, R: RD, opt, stats: () => stats, run: () => run, PAD, KB, ST, LEVELS, Core,
    frames: () => frames.slice(), running: () => raf > 0 || raf === -1, openStart, openLevels, startLevel, startEndless, openPause, quit, cur: () => current,
    hold(bits) { PAD.held = bits; }, step(n) { for (let i = 0; i < n && S && GS && GS.view === 'play' && !GS.resultsUp; i++) stepGame(); },
    manual(v) { if (GS) GS.manual = !!v; if (!v) kick(); },
    finite: () => [acc, lastT].every(Number.isFinite) && (!S || [S.x, S.y, S.vx, S.vy, S.gs, S.rot, S.f].every(Number.isFinite)),
    btnCenter(k) { const b = layout && layout[k]; if (!b) return null; const r = stageEl.getBoundingClientRect(); return { x: r.left + b[0], y: r.top + b[1], r: b[2] }; },
    evc: t => EVC[t] || 0, quality: () => quality, levelHash, Rig, OUTFITS,
  };
  return { enter, leave, hasSave: () => !!store.get('dr.run', null) };

})();
$('#tileDr').addEventListener('click', () => Dakrenner.enter());
