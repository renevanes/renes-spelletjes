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
