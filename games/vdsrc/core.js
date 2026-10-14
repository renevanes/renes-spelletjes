  /* ================= core.js: the deterministic 60 Hz fight simulation (no DOM, no randomness) =================
     step(M, [in0, in1]) advances one frame. Inputs are bit masks with ABSOLUTE directions; the core turns them into
     directions relative to the fighter (numpad notation: 6 = forward, 4 = back, 2 = down, 8 = up). Every press goes into
     a 64-frame history that the motion detector and the 7-frame input buffer read. */
  const Core = (() => {
    const SW = 1200, WALL = 34, MAXSEP = 540, GRAV = .78, BUF = 7, TIMER = 60 * 60;
    const U = 1, D = 2, L = 4, R = 8, LP = 16, HP = 32, LK = 64, HK = 128, SP = 256, SU = 512, BTN = LP | HP | LK | HK;
    const DB = (...ds) => ds.reduce((a, d) => a | (1 << d), 0);
    const BACKS = DB(1, 4, 7), DOWNS = DB(1, 2, 3), UPS = DB(7, 8, 9), FWDS = DB(3, 6, 9);
    const LIGHT = { sLP: 1, sLK: 1, cLP: 1, cLK: 1 };

    /* ---------- moves: normals generated from the base table, specials in two strengths, the super, the throw ---------- */
    function prep(C) {
      if (C.mv) return C;
      const mv = C.mv = {}, wo = (C.W - 1) * 22, H = C.H;
      const sb = (b, reach) => [b[0] * reach + wo, b[1] * H, b[2] * reach + wo, b[3] * H];
      for (const [k, n] of Object.entries(BASE_NORMALS)) {
        const heavy = !LIGHT[k] && k[2] !== 'L', s = Math.max(3, n.s + (heavy ? C.spd : 0)), r = n.r == null ? 0 : Math.max(5, n.r + C.spd * 2);
        const reach = 1 + (C.reach - 1) * (k.endsWith('K') ? 1.2 : .8);
        const m = { id: k, nm: n.nm, k: 'n', air: n.air || 0, tot: n.air ? 999 : s + n.a + r, ch: n.ch || 0, cn: n.cn || 0, aa: n.aa || 0, an: k, heavy,
          hits: [{ f: s, n: n.a, b: sb(n.b, reach), d: Math.round(n.d * C.pow), hs: n.hs, bs: n.bs, lv: n.lv, kd: n.kd || 0, st: n.st, pu: n.pu, la: n.la || null, ch: 0, jg: n.aa ? 1 : 0 }], vel: [] };
        if (k[0] === 'c') m.crouch = 1;
        if (C.nov && C.nov[k]) { const o = C.nov[k]; if (o.s) { m.hits[0].f = o.s; } if (o.d) m.hits[0].d = o.d; if (o.r != null || o.s) m.tot = m.hits[0].f + m.hits[0].n + (o.r != null ? o.r : r); if (o.x) { m.hits[0].b[2] += o.x; m.hits[0].b[0] += o.x * .5; } if (o.kd) { m.hits[0].kd = 1; m.hits[0].la = [3, 7]; } }
        mv[k] = m;
      }
      const fix = (m, id, kind, sp) => {
        Object.assign(m, { id, k: kind, nm: sp.nm, role: sp.role }); m.hits = m.hits || []; m.vel = m.vel || []; m.an = m.an || id; m.heavy = 1;
        m.hits.forEach(h => { h.b = [h.b[0] + wo, h.b[1] * H, h.b[2] + wo, h.b[3] * H]; });
        if (m.pj) { m.pj.y *= H; m.pj.x += wo; }
        if (m.gr && m.gr.b) m.gr.b = [m.gr.b[0] + wo, m.gr.b[1] * H, m.gr.b[2] + wo, m.gr.b[3] * H];
        if (m.air && !m.tot) m.tot = 999;
        return m;
      };
      C.sp.forEach(sp => { sp.v = [fix(sp.mk(0), sp.id, 's', sp), fix(sp.mk(1), sp.id, 's', sp)]; });
      C.su.v = fix(C.su.mk(), C.su.id, 'u', C.su);
      mv.thr = { id: 'thr', nm: 'Worp', k: 't', hits: [], vel: [], an: 'grab', tot: 30 };
      C.pw = 21 * C.W; C.stunMax = Math.round(560 * (C.hp / 1000));
      return C;
    }

    /* ---------- fighters and matches ---------- */
    function fighter(C, side) {
      prep(C);
      return { C, side, x: 0, y: 0, vx: 0, vy: 0, px: 0, face: side ? -1 : 1, hp: C.hp, mhp: C.hp, meter: 0, stun: 0, stunT: 0, dizzyLock: 0,
        st: 'stand', t: 0, mv: null, str: 0, mt: 0, mser: 0, hmask: 0, conn: 0, cnEnd: 0, chain: 0, hsT: 0, lr: 0, freeze: 0, shake: 0,
        inv: 0, tinv: 0, armLeft: 0, airAtk: 0, jug: 0, fallBy: 0, kd: 0, ko: 0, crouch: 0, guard: 0, walk: 0, jdir: 0,
        combo: 0, comboDmg: 0, calm: 0, maxCombo: 0, maxComboDmg: 0, dmgTaken: 0, roundDmg: 0,
        hist: new Int8Array(64), hbtn: new Int16Array(64), hn: 0, inb: 0, cb: 0, cd: 0, cbS: 0, cbT: 99, cdS: 0, cdT: 99,
        proj: null, grab: null, held: null, thr: null, easy: false, ser: 0, lastHit: null, hid: 0, rel: 0, suKO: 0 };
    }
    function newMatch(o) {
      const P = o.p.map((p, i) => { const F = fighter(CAST_BY[p.ch], i); F.easy = !!p.easy; F.pal = p.pal || 0;
        if (p.boost) { F.mhp = F.hp = Math.round(F.C.hp * p.boost.hp); F.dmgMul = p.boost.dmg; } return F; });
      const M = { f: 0, phase: o.noIntro ? 'ready' : 'intro', pt: 0, round: 1, wins: [0, 0], timer: TIMER, P, pj: [], ev: [], fl: null, slow: 0,
        winner: -1, over: 0, train: o.train || null, stage: o.stage, rounds: [], seq: 0, roundT: 0, noIntro: !!o.noIntro };
      resetRound(M);
      return M;
    }
    function resetRound(M) {
      M.P.forEach((F, i) => {
        Object.assign(F, { x: SW / 2 + (i ? 150 : -150), y: 0, vx: 0, vy: 0, px: 0, face: i ? -1 : 1, hp: F.mhp, st: M.phase === 'intro' ? 'intro' : 'stand', t: 0,
          mv: null, mt: 0, hmask: 0, conn: 0, chain: 0, hsT: 0, freeze: 0, inv: 0, tinv: 0, airAtk: 0, jug: 0, kd: 0, ko: 0, crouch: 0, guard: 0,
          combo: 0, comboDmg: 0, calm: 0, stun: 0, stunT: 0, dizzyLock: 0, proj: null, grab: null, held: null, thr: null, hid: 0, roundDmg: 0, suKO: 0, cb: 0, cd: 0 });
        if (M.train && M.train.meter) F.meter = 100;
      });
      M.pj.length = 0; M.timer = TIMER; M.fl = null; M.slow = 0; M.roundT = 0;
    }
    const other = (M, F) => M.P[1 - F.side];

    /* ---------- input history and motion detection ---------- */
    function relDir(bits, face) {
      const fw = face > 0 ? R : L, bk = face > 0 ? L : R;
      let h = (bits & fw) && !(bits & bk) ? 1 : (bits & bk) && !(bits & fw) ? -1 : 0, v = (bits & U) && !(bits & D) ? 1 : (bits & D) && !(bits & U) ? -1 : 0;
      return 5 + h + v * 3;
    }
    const dirAt = (F, i) => F.hist[(F.hn - 1 - i) & 63];
    const btnAt = (F, i) => F.hbtn[(F.hn - 1 - i) & 63];
    // during hit-stop / the super flash, time stands still for the history too: repeated directions are merged and presses
    // are added to the last entry, so motions and the input buffer made during the freeze still count afterwards
    function record(F, bits, frozen) {
      const d = relDir(bits, F.face), prev = F.inb, edge = bits & ~prev & (BTN | SP | SU), last = (F.hn - 1) & 63;
      if (frozen && F.hn && F.hist[last] === d) F.hbtn[last] |= edge;
      else { F.hist[F.hn & 63] = d; F.hbtn[F.hn & 63] = edge; F.hn++; }
      F.inb = bits;
      // charge (robot): frames held back / down, kept for 10 frames after letting go
      if ((1 << d) & BACKS) { F.cb++; F.cbT = 0; } else { if (F.cb) { F.cbS = F.cb; F.cb = 0; } F.cbT++; }
      if ((1 << d) & DOWNS) { F.cd++; F.cdT = 0; } else { if (F.cd) { F.cdS = F.cd; F.cd = 0; } F.cdT++; }
    }
    // pattern: list of direction masks matched in order, inside the last `win` frames
    function seq(F, pats, win) {
      let k = pats.length - 1;
      for (let i = 0; i < win && k >= 0; i++) if (pats[k] & (1 << dirAt(F, i))) k--;
      return k < 0;
    }
    const P_QCF = [DB(2), DB(3), DB(6)], P_QCB = [DB(2), DB(1), DB(4)], P_DP = [DB(6), DB(2, 1), DB(3)], P_SU = [DB(2), DB(3, 6), DB(2), DB(6)];
    function motion(F, kind) {
      switch (kind) {
        case 'qcf': return seq(F, P_QCF, 20) && ((1 << dirAt(F, 0)) & DB(6, 3, 9, 5) || (1 << dirAt(F, 1)) & DB(6));
        case 'qcb': return seq(F, P_QCB, 20);
        case 'dp': return seq(F, P_DP, 22) && dirAt(F, 0) !== 6;
        case 'qcf2': return seq(F, P_SU, 36);
        case 'cb': return (F.cb >= 40 || (F.cbS >= 40 && F.cbT <= 10)) && ((1 << dirAt(F, 0)) & FWDS);
        case 'cd': return (F.cd >= 40 || (F.cdS >= 40 && F.cdT <= 10)) && ((1 << dirAt(F, 0)) & UPS);
      }
      return false;
    }
    // most recent unused press (within the buffer) of any of `mask`; returns its age or -1
    function pressed(F, mask, win = BUF) { for (let i = 0; i < win; i++) if (btnAt(F, i) & mask) return i; return -1; }
    function consume(F) { for (let i = 0; i < BUF; i++) F.hbtn[(F.hn - 1 - i) & 63] = 0; }

    /* ---------- boxes ---------- */
    const box = (F, b, out) => { if (F.face > 0) { out[0] = F.x + b[0]; out[2] = F.x + b[2]; } else { out[0] = F.x - b[2]; out[2] = F.x - b[0]; } out[1] = F.y + b[1]; out[3] = F.y + b[3]; return out; };
    const ov = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const HB = [new Float64Array(4), new Float64Array(4), new Float64Array(4)], TB = new Float64Array(4), TB2 = new Float64Array(4);
    function airborne(F) { return F.y > 0 || F.st === 'air' || F.st === 'fall' || (F.st === 'move' && F.mv.air); }
    function crouching(F) {
      if (F.st === 'stand' || F.st === 'block' || F.st === 'hit') return F.crouch;
      if (F.st === 'move') return F.mv.crouch || (F.mv.lo && F.mt >= F.mv.lo[0] && F.mt <= F.mv.lo[1]) ? 1 : 0;
      return 0;
    }
    function invuln(F) {
      if (F.inv > 0 || F.hid) return true;
      if (F.st === 'down' || F.st === 'rise' || F.st === 'held' || F.st === 'thrown' || F.st === 'throw' || F.st === 'ko' || F.st === 'win' || F.st === 'intro') return true;
      if (F.st === 'move' && F.mv.inv && F.mt >= F.mv.inv[0] && F.mt <= F.mv.inv[1]) return true;
      return false;
    }
    // hurtboxes into HB; returns how many
    function hurt(F, A, h) {
      if (invuln(F)) return 0;
      const C = F.C, W = C.W, H = C.H;
      if (F.st === 'fall') {
        if (!(F.fallBy === A.mser && A.st === 'move') && !(h && h.jg && F.jug > 0)) return 0;
        set(HB[0], F.x - 30 * W, F.y, F.x + 30 * W, F.y + 70 * H); return 1;
      }
      if (airborne(F)) { set(HB[0], F.x - 22 * W, F.y + 14, F.x + 22 * W, F.y + 140 * H); return addExt(F, 1); }
      if (crouching(F)) { set(HB[0], F.x - 26 * W, 0, F.x + 28 * W, 108 * H); return addExt(F, 1); }
      set(HB[0], F.x - 24 * W, 0, F.x + 24 * W, 148 * H);
      const hx = F.face > 0 ? 4 : -4; set(HB[1], F.x + hx - 15 * W, 146 * H, F.x + hx + 15 * W, 186 * H);
      return addExt(F, 2);
    }
    function set(b, a, c, d, e) { b[0] = a; b[1] = c; b[2] = d; b[3] = e; }
    function addExt(F, n) {                      // an attacking limb can be hit too (whiff punishes)
      if (F.st !== 'move' || F.mv.k !== 'n' || !F.mv.hits.length) return n;
      const h = F.mv.hits[0]; if (F.mt < h.f || F.mt > h.f + h.n + 8) return n;
      const b = box(F, h.b, HB[n]); if (F.face > 0) b[2] -= 10; else b[0] += 10; return n + 1;
    }

    /* ---------- starting moves ---------- */
    function startMove(M, F, m, str) {
      F.st = 'move'; F.mv = m; F.str = str || 0; F.mt = 0; F.hmask = 0; F.conn = 0; F.mser = ++M.seq; F.hid = 0; F.t = 0;
      F.armLeft = m.arm ? m.arm[2] : 0; F.ctr = 0;
      if (!m.air || F.y <= 0) F.vx = 0;
      if (m.k === 'u') { F.meter -= m.cost || 100; M.fl = { side: F.side, t: m.fl || 40, n: m.fl || 40, nm: m.nm }; push(M, 'super', F.side, m); }
      else if (m.k === 's') { push(M, 'special', F.side, m); F.meter = Math.min(100, F.meter + .5); }
      else push(M, 'swing', F.side, m);
      if (m.tinv) F.tinv = Math.max(F.tinv, m.tinv[1]);
    }
    const SPS = { P: LP | HP, K: LK | HK };
    function trySuper(M, F) {
      const su = F.C.su; if (F.meter < 100 || (su.v.pj && F.proj)) return false;
      const age = pressed(F, SPS[su.b], 4);
      if ((age >= 0 && motion(F, su.in)) || pressed(F, SU, 4) >= 0) { consume(F); startMove(M, F, su.v, 1); return true; }
      return false;
    }
    function trySpecial(M, F, O, ground) {
      const C = F.C;
      if (trySuper(M, F)) return true;
      // the "Makkelijke specials" button: Speciaal + direction
      if (F.easy && pressed(F, SP, 4) >= 0) {
        const d = dirAt(F, 0), key = (1 << d) & FWDS ? 'f' : (1 << d) & (DOWNS | UPS) ? 'd' : 'n';
        const sp = C.sp.find(s => s.id === C.easy[key]) || C.sp[0];
        if (!(sp.v[1].pj && F.proj)) { consume(F); startMove(M, F, sp.v[1], 1); return true; }
      }
      // motion specials (dragon-punch motion first, like the genre does)
      const order = ['dp', 'cd', 'cb', 'qcf', 'qcb'];
      for (const kind of order) for (const sp of C.sp) {
        if (sp.in !== kind) continue;
        const mask = SPS[sp.b], age = pressed(F, mask, 5); if (age < 0) continue;
        if (!motion(F, kind)) continue;
        const heavy = btnAt(F, age) & (HP | HK) ? 1 : 0, m = sp.v[heavy];
        if (m.pj && F.proj) continue;
        if (m.gr && m.gr.air && !ground) continue;
        consume(F); if (kind === 'cb') F.cbS = F.cb = 0; if (kind === 'cd') F.cdS = F.cd = 0;
        startMove(M, F, m, heavy); return true;
      }
      return false;
    }
    function canThrowTarget(F, O) {
      if (O.y > 0 || O.tinv > 0 || invuln(O) || O.hid) return false;
      if (!(O.st === 'stand' || O.st === 'land' || O.st === 'jumpsq' || O.st === 'dash' || (O.st === 'move' && !O.mv.air))) return false;
      return Math.abs(O.x - F.x) <= F.C.pw + O.C.pw + 24;
    }
    function tryNormal(M, F, O, air) {
      const age = pressed(F, BTN); if (age < 0) return false;
      const b = btnAt(F, age), d = dirAt(F, 0);
      if (air) {
        const k = b & HK ? 'jHK' : b & HP ? 'jHP' : b & LK ? 'jLK' : 'jLP';
        consume(F); F.airAtk = 1; startMove(M, F, F.C.mv[k], 0); return true;
      }
      // throw: Zware stoot + forward/back when close
      if ((b & HP) && (d === 6 || d === 4) && canThrowTarget(F, O)) { consume(F); startThrow(M, F, O, { d: Math.round(120 * F.C.pow), n: 34, sw: d === 4, tech: 1 }); return true; }
      const cr = (1 << d) & DOWNS;
      const k = (cr ? 'c' : 's') + (b & HK ? 'HK' : b & HP ? 'HP' : b & LK ? 'LK' : 'LP');
      consume(F); startMove(M, F, F.C.mv[k], 0); return true;
    }
    function tryCancel(M, F, O) {
      if (!F.conn || F.mt > F.cnEnd) return false;
      const m = F.mv;
      if (m.k === 's') return m.cn === 'u' && F.conn === 1 ? trySuper(M, F) : false;
      if (m.k !== 'n' || m.air) return false;
      if (m.cn === 'c' || m.cn === 's') { if (trySpecial(M, F, O, true)) return true; }
      if (m.cn === 'c' && F.chain < 3) {
        const age = pressed(F, BTN); if (age < 0) return false;
        const b = btnAt(F, age), cr = (1 << dirAt(F, 0)) & DOWNS, heavy = b & (HP | HK);
        if (heavy && F.conn !== 1) return false;
        const k = (cr ? 'c' : 's') + (b & HK ? 'HK' : b & HP ? 'HP' : b & LK ? 'LK' : 'LP');
        consume(F); const ch = F.chain + 1; startMove(M, F, F.C.mv[k], 0); F.chain = heavy ? 9 : ch; return true;
      }
      return false;
    }

    /* ---------- throws (normal, command grabs, the counter and the air catch all use this) ---------- */
    function startThrow(M, F, O, thr) {
      F.st = 'throw'; F.t = 0; F.thr = thr; F.grab = O; F.vx = 0; F.mv = null;
      O.st = 'held'; O.t = 0; O.held = F; O.vx = O.vy = 0; O.px = 0; O.mv = null; O.hid = 0;
      thr.y0 = O.y; thr.x0 = O.x;
      push(M, 'grab', F.side, thr);
    }
    function runThrow(M, F) {
      const O = F.grab, T = F.thr; F.t++;
      if (!O || O.st !== 'held') { toStand(F); return; }
      const rel = T.n - 12, u = Math.min(1, F.t / rel), dist = F.C.pw + O.C.pw + 6;
      if (T.tech && F.t <= 9 && O.t >= 1) {                     // escape: the held fighter presses the throw too
        const age = pressed(O, HP, 9);
        if (age >= 0) { const d = dirAt(O, 0); if (d === 4 || d === 6) { consume(O);
          toStand(F); toStand(O); F.px = -4 * F.face; O.px = 4 * F.face; O.tinv = 10; push(M, 'tech', O.side); return; } }
      }
      if (T.air) { O.x = F.x + F.face * dist; O.y = T.y0 * (1 - u) + 30 * Math.sin(Math.PI * u); }
      else if (T.sw) { const a = Math.PI * u; O.x = F.x + F.face * dist * Math.cos(a); O.y = Math.sin(a) * 90; }
      else { O.x = F.x + F.face * (dist + 14 * u); O.y = Math.sin(Math.PI * u) * (T.su ? 120 : 50); }
      if (T.su) { O.y = Math.abs(Math.sin(Math.PI * 2 * u)) * 110; O.x = F.x + F.face * dist * Math.cos(Math.PI * 2 * u); }
      clampX(M, O);
      const parts = T.su ? [Math.round(rel * .35), Math.round(rel * .7), rel] : [rel];
      for (let i = 0; i < parts.length; i++) if (F.t === parts[i]) {
        const d = Math.round(T.d / parts.length);
        damage(M, F, O, d, false, T.su ? 'u' : T.k || 't'); push(M, 'throwhit', O.side, { d, x: O.x, y: O.y + 80, last: i === parts.length - 1 });
        if (i < parts.length - 1) { F.freeze = O.freeze = 6; }
      }
      if (F.t === rel) {
        if (T.sw) { F.face = -F.face; O.x = F.x + F.face * dist; }
        O.held = null; O.st = 'fall'; O.t = 0; O.kd = 1; O.jug = 0; O.vx = F.face * 3.2; O.vy = 6; O.y = Math.max(O.y, 20); O.fallBy = -1;
        if (O.hp <= 0) koFall(M, O, F);
        F.freeze = O.freeze = 8;
      }
      if (F.t >= T.n) { F.grab = null; F.thr = null; toStand(F); }
    }

    /* ---------- hits ---------- */
    function push(M, t, side, a) { M.ev.push({ t, side, a }); }
    function damage(M, A, B, d, chipOnly, kind) {
      if (A.dmgMul) d = Math.round(d * A.dmgMul);
      if (M.train && M.train.inf) { B.hp = Math.max(1, B.hp - d); }
      else B.hp = Math.max(0, B.hp - d);
      B.roundDmg += d; B.dmgTaken += d;
      if (!chipOnly) { B.combo++; B.comboDmg += d; B.calm = 0; if (B.combo > A.maxCombo) A.maxCombo = B.combo; if (B.comboDmg > A.maxComboDmg) A.maxComboDmg = B.comboDmg; }
      if (B.hp <= 0 && kind === 'u') A.suKO = 1;
    }
    function blockOK(B, back, lv) {
      if (!(B.st === 'stand' || B.st === 'block' || (B.st === 'land' && B.t >= 1))) return false;
      if (!(B.inb & back)) return false;
      const cr = B.inb & D ? 1 : 0;
      if (lv === 'l' && !cr) return false;
      if (lv === 'o' && cr) return false;
      return true;
    }
    // A hits B with hit h (A may be a projectile: then src is the projectile object)
    function applyHit(M, A, B, h, idx, src, ak) {
      const back = (src ? src.vx > 0 : A.face > 0) ? R : L, away = src ? Math.sign(src.vx) || 1 : A.face;
      const kind = src ? 'p' : ak;
      if (!src) { A.hmask |= 1 << idx; A.conn = A.conn || 2; A.cnEnd = h.f + h.n + 9; }
      // counter stance (Oma Truus): melee high/mid strikes get caught
      if (!src && B.st === 'move' && B.mv.ct && B.mt >= B.mv.ct.f0 && B.mt <= B.mv.ct.f1 && h.lv !== 'l' && kind !== 'u') {
        push(M, 'counter', B.side, { x: (A.x + B.x) / 2, y: 120 });
        startThrow(M, B, A, { d: B.mv.ct.d, n: 34, sw: 0, k: 's' }); B.face = A.x > B.x ? 1 : -1; return;
      }
      // armour (Sterke Sjaak): absorbs a hit, takes half the damage
      if (B.st === 'move' && B.mv.arm && B.armLeft > 0 && B.mt >= B.mv.arm[0] && B.mt <= B.mv.arm[1]) {
        B.armLeft--; const d = Math.round(h.d * .5); damage(M, A, B, d, true, kind); push(M, 'armor', B.side, { x: B.x, y: B.y + 110 });
        if (!src) { A.freeze = h.st; } B.freeze = h.st; B.shake = h.st; if (B.hp <= 0) koFall(M, B, A); return;
      }
      if (blockOK(B, back, h.lv)) {
        B.st = 'block'; B.t = 0; B.hsT = h.bs; B.crouch = B.inb & D ? 1 : 0; B.mv = null;
        const chip = h.ch ? Math.max(1, Math.round(h.d * h.ch)) : 0;
        if (chip) { damage(M, A, B, chip, true, kind); if (B.hp <= 0) { koFall(M, B, A); } }
        pushback(M, A, B, h.pu * .8, away, src);
        const st = Math.max(5, h.st - 3);
        if (!src) A.freeze = st; B.freeze = st; B.shake = st;
        (src ? M.P[src.o] : A).meter = Math.min(100, (src ? M.P[src.o] : A).meter + 2); B.meter = Math.min(100, B.meter + 1);
        push(M, 'block', B.side, { x: B.x + away * -20, y: B.y + (B.crouch ? 70 : 110), heavy: h.d >= 60, src: kind });
        return;
      }
      // hit
      const owner = src ? M.P[src.o] : A;
      const counter = !src && B.st === 'move' && B.mv.hits.length && B.mt < B.mv.hits[0].f + B.mv.hits[0].n;
      const minS = kind === 'u' ? .6 : .3, sc = B.combo <= 1 ? 1 : Math.max(minS, 1 - .11 * (B.combo - 1));
      let d = Math.round(h.d * sc * (counter ? 1.2 : 1)); if (d < 1) d = 1;
      const wasAir = airborne(B) || B.st === 'fall', wasCr = crouching(B);
      B.mv = null; B.hid = 0;
      damage(M, owner, B, d, false, kind);
      owner.meter = Math.min(100, owner.meter + (kind === 'n' ? 4 : kind === 'u' ? 0 : 6)); B.meter = Math.min(100, B.meter + 3);
      if (B.dizzyLock <= 0 && B.st !== 'dizzy') { B.stun += d; B.stunT = 0; }
      const st = h.st || 10;
      if (!src) A.freeze = st; B.freeze = st; B.shake = st;
      const launch = h.kd || wasAir || B.hp <= 0 || (src && src.kd && src.hits <= 1);
      if (launch) {
        const la = h.la || (h.kd ? [3, 7] : [2.4, 5.5]);
        B.st = 'fall'; B.t = 0; B.kd = h.kd || h.jg || B.hp <= 0 || (src && src.kd) ? 1 : 0; if (wasAir && !h.kd && !h.jg) B.kd = 0;
        B.vx = away * la[0]; B.vy = la[1]; B.y = Math.max(B.y, 1);
        if (!(B.fallBy === (src ? -2 : A.mser) && wasAir)) B.jug = h.jg ? (wasAir ? Math.max(0, B.jug - 1) : 1) : 0;
        B.fallBy = src ? -2 : A.mser;
        if (B.hp <= 0) koFall(M, B, owner);
      } else {
        B.st = 'hit'; B.t = 0; B.hsT = h.hs + (counter ? 4 : 0); B.crouch = wasCr; B.vx = 0;
        pushback(M, A, B, h.pu, away, src);
      }
      push(M, 'hit', B.side, { id: src ? src.k : ak + ':' + (A.mvId || ''), x: B.x - away * 18, y: B.y + (wasCr ? 70 : h.b ? Math.min(150, (h.b[1] + h.b[3]) / 2) : 100), d, heavy: d >= 60 || kind === 'u', kind, counter, combo: B.combo, src: src ? src.k : null });
    }
    function pushback(M, A, B, pu, away, src) {
      const v = pu * .9;
      if (atWall(B, away) && !src) A.px = -away * v; else B.px = away * v;
    }
    const atWall = (F, dir) => dir > 0 ? F.x >= SW - WALL - F.C.pw - 1 : F.x <= WALL + F.C.pw + 1;
    function koFall(M, B, A) {
      B.hp = 0; B.ko = 1; B.st = 'fall'; B.kd = 1; B.t = 0; B.mv = null; B.held = null;
      if (B.y < 1) { B.y = 1; } B.vy = Math.max(B.vy, 8); B.vx = (A.x < B.x ? 1 : -1) * 3.6;
      if (M.phase === 'fight') { M.phase = 'ko'; M.pt = 0; M.slow = 70; push(M, 'ko', B.side, { x: B.x, y: B.y + 100, su: A.suKO }); }
    }

    /* ---------- the per-fighter update ---------- */
    function toStand(F) { F.st = 'stand'; F.t = 0; F.mv = null; F.chain = 0; F.hid = 0; F.vx = 0; F.ctr = 0; }
    function threat(M, F, O) {
      if (O.st === 'move' && O.mv.hits.length && Math.abs(O.x - F.x) < 280) return true;
      if (O.proj && Math.abs(O.proj.x - F.x) < 300 && Math.sign(O.proj.vx) === Math.sign(F.x - O.proj.x)) return true;
      return false;
    }
    function update(M, F, O, ctl) {
      const d = ctl ? dirAt(F, 0) : 5;
      if (F.inv > 0) F.inv--; if (F.tinv > 0) F.tinv--; if (F.dizzyLock > 0) F.dizzyLock--;
      if (F.stunT++ > 70 && F.stun > 0) F.stun = Math.max(0, F.stun - 3);
      F.guard = 0;
      switch (F.st) {
        case 'intro': case 'win': case 'lose': F.t++; F.vx = 0; break;
        case 'stand': {
          F.t++; F.airAtk = 0;
          if (F.combo && F.calm++ > 2) { F.combo = 0; F.comboDmg = 0; }
          if (ctl) {
            if (trySpecial(M, F, O, true) || tryNormal(M, F, O, false)) { if (F.st === 'move') runMove(M, F, O); break; }
            if ((1 << d) & UPS) { F.st = 'jumpsq'; F.t = 0; F.jdir = d === 9 ? 1 : d === 7 ? -1 : 0; F.vx = 0; break; }
            // dash: forward or back tapped twice
            if ((d === 6 || d === 4) && dirAt(F, 1) !== d) {
              for (let i = 2; i < 14; i++) { const e = dirAt(F, i); if (e === d) { let gap = false; for (let j = 1; j < i; j++) if (dirAt(F, j) !== d) gap = true; if (gap) { F.st = 'dash'; F.t = 0; F.jdir = d === 6 ? 1 : -1; push(M, 'dash', F.side); } break; } if (e !== 5) break; }
              if (F.st === 'dash') break;
            }
            F.crouch = (1 << d) & DOWNS ? 1 : 0;
            if (F.crouch) F.vx = 0;
            else if (d === 6) F.vx = F.C.walkF * F.face;
            else if (d === 4) { if (threat(M, F, O)) { F.guard = 1; F.vx = 0; } else F.vx = -F.C.walkB * F.face; }
            else F.vx = 0;
            if (F.crouch && ((1 << d) & BACKS) && threat(M, F, O)) F.guard = 1;
            F.walk = F.vx ? Math.sign(F.vx * F.face) : 0;
          } else { F.vx = 0; F.walk = 0; F.crouch = 0; }
          break;
        }
        case 'jumpsq':
          F.t++;
          if (ctl && trySpecial(M, F, O, true)) { if (F.st === 'move') runMove(M, F, O); break; }
          if (F.t >= 4) { F.st = 'air'; F.t = 0; F.vy = F.C.jvy; F.vx = F.jdir * F.C.jvx * F.face; F.y = .5; push(M, 'jump', F.side); }
          break;
        case 'air':
          F.t++;
          if (ctl && !F.airAtk && tryNormal(M, F, O, true)) { runMove(M, F, O); break; }
          airPhys(M, F);
          break;
        case 'land':
          F.t++; F.vx = 0;
          if (F.t >= F.lr) toStand(F);
          break;
        case 'dash': {
          F.t++; const n = F.jdir > 0 ? 16 : 20, sp = F.jdir > 0 ? 7.2 : 6.2;
          F.vx = F.jdir * F.face * sp * Math.max(0, 1 - F.t / n) * 1.6;
          if (F.jdir < 0 && F.t <= 7) F.inv = Math.max(F.inv, 1);
          if (F.t >= n) toStand(F);
          break;
        }
        case 'move':
          if (ctl && tryCancel(M, F, O)) { if (F.st === 'move') runMove(M, F, O); break; }
          runMove(M, F, O);
          break;
        case 'hit': case 'block':
          F.t++; F.vx = 0;
          if (F.t >= F.hsT) {
            if (F.st === 'hit' && F.stun >= F.C.stunMax && F.hp > 0) { F.st = 'dizzy'; F.t = 0; F.stun = 0; F.dizzyLock = 400; push(M, 'dizzy', F.side, { x: F.x, y: F.y + 190 }); }
            else { const cr = F.crouch; toStand(F); F.crouch = cr; F.tinv = Math.max(F.tinv, 3); if (ctl) { if ((trySpecial(M, F, O, true) || tryNormal(M, F, O, false)) && F.st === 'move') runMove(M, F, O); } }
          }
          break;
        case 'dizzy':
          F.t++; F.vx = 0; if (F.t >= 130) { toStand(F); F.combo = 0; F.comboDmg = 0; }
          break;
        case 'fall':
          F.t++; airPhys(M, F);
          break;
        case 'down':
          F.t++; F.vx = 0;
          if (F.ko) { if (F.t >= 40) { F.st = 'ko'; F.t = 0; } break; }
          if (F.t >= 32) { F.st = 'rise'; F.t = 0; push(M, 'rise', F.side); }
          break;
        case 'rise':
          F.t++; if (F.t >= 22) { toStand(F); F.inv = 3; F.tinv = 8; F.combo = 0; F.comboDmg = 0; F.jug = 0; }
          break;
        case 'ko': F.t++; F.vx = 0; break;
        case 'throw': runThrow(M, F); break;
        case 'held': F.t++; break;
      }
    }
    function airPhys(M, F) {
      F.vy -= GRAV; F.y += F.vy; F.x += F.vx;
      if (F.y <= 0) {
        F.y = 0; F.vy = 0;
        if (F.st === 'fall') {
          if (F.kd) { F.st = 'down'; F.t = 0; F.vx = 0; F.px = F.px * .5; push(M, 'down', F.side, { x: F.x }); }
          else { F.st = 'land'; F.t = 0; F.lr = 6; F.vx = 0; push(M, 'land', F.side); }
          F.jug = 0;
        } else if (F.st === 'move') { const lr = F.mv.lr || 4; F.mv = null; F.st = 'land'; F.t = 0; F.lr = lr; F.vx = 0; push(M, 'land', F.side); }
        else { F.st = 'land'; F.t = 0; F.lr = 3; F.vx = 0; push(M, 'land', F.side); }
      }
    }
    function runMove(M, F, O) {
      const m = F.mv; F.mt++; F.t++;
      for (let i = 0; i < m.vel.length; i++) {
        const v = m.vel[i];
        if (F.mt >= v[0] && F.mt <= v[1]) { if (v[2] !== null) F.vx = v[2] * F.face; if (F.mt === v[0] && v[3] !== null) { F.vy = v[3]; if (F.y <= 0) F.y = .5; } }
        else if (!m.air && F.mt === v[1] + 1) F.vx = 0;
      }
      if (m.pj && F.mt === m.pj.f && !F.proj) spawnProj(M, F, m.pj);
      if (m.gr && F.mt === m.gr.f) {
        const g = m.gr;
        if (g.air) {
          if (airborne(O) && O.st !== 'fall' && !invuln(O) && O.y > 20) {
            box(F, g.b, TB); set(TB2, O.x - 20, O.y, O.x + 20, O.y + 140);
            if (ov(TB, TB2)) { startThrow(M, F, O, { d: g.d, n: g.n, air: 1, k: 's' }); return; }
          }
        } else if (!airborne(O) && !invuln(O) && O.st !== 'hit' && O.st !== 'block' && Math.abs(O.x - F.x) <= F.C.pw + O.C.pw + g.rng) {
          startThrow(M, F, O, { d: g.d, n: g.n, sw: 0, su: g.su, k: m.k }); return;
        }
      }
      if (m.tp && F.mt === m.tp.f) teleport(M, F, O, m.tp.mode);
      F.hid = m.hid && F.mt >= m.hid[0] && F.mt <= m.hid[1] ? 1 : 0;
      if (m.air) { if (F.y > 0) airPhys(M, F); return; }
      if (F.mt >= m.tot) toStand(F);
    }
    function teleport(M, F, O, mode) {
      const s = O.x >= F.x ? 1 : -1, gap = F.C.pw + O.C.pw + (mode === 'behind' ? 26 : 46);
      let x = mode === 'behind' ? O.x + s * gap : O.x - s * gap;
      const lo = WALL + F.C.pw, hi = SW - WALL - F.C.pw;
      if (x < lo || x > hi) x = O.x - s * gap;
      F.x = Math.max(lo, Math.min(hi, x)); F.face = O.x >= F.x ? 1 : -1;
      push(M, 'tele', F.side, { x: F.x });
    }
    function spawnProj(M, F, pj) {
      const p = { o: F.side, k: pj.k, x: F.x + F.face * pj.x, y: F.y + pj.y, vx: pj.vx * F.face, vy: pj.vy || 0, g: pj.g || 0, w: pj.w, h: pj.h,
        d: pj.d, hs: pj.hs, bs: pj.bs, lv: pj.lv || 'h', ch: pj.ch == null ? .15 : pj.ch, life: pj.life, hits: pj.hits || 1, gap: pj.gap || 0, cool: 0,
        st: pj.st || 9, kd: pj.kd || 0, t: 0, dead: 0, pu: 7, b: null, f: 0, n: 1, ser: ++M.seq };
      F.proj = p; M.pj.push(p); push(M, 'proj', F.side, p);
    }
    const PB = new Float64Array(4);
    function updateProj(M) {
      for (const p of M.pj) {
        if (p.dead) continue;
        p.t++; p.x += p.vx; p.y += p.vy; p.vy -= p.g; p.life--;
        if (p.g && p.y <= 0) { p.dead = 1; push(M, 'pjgone', p.o, p); continue; }
        if (p.life <= 0 || p.x < -60 || p.x > SW + 60) { p.dead = 1; push(M, 'pjgone', p.o, p); continue; }
      }
      // clashes
      for (let i = 0; i < M.pj.length; i++) for (let j = i + 1; j < M.pj.length; j++) {
        const a = M.pj[i], b = M.pj[j]; if (a.dead || b.dead || a.o === b.o) continue;
        if (Math.abs(a.x - b.x) < a.w + b.w && Math.abs(a.y - b.y) < a.h + b.h) {
          const na = a.hits, nb = b.hits; a.hits -= nb; b.hits -= na;
          if (a.hits <= 0) a.dead = 1; if (b.hits <= 0) b.dead = 1;
          push(M, 'clash', a.o, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        }
      }
      for (const p of M.pj) {
        if (p.dead) continue;
        if (p.cool > 0) { p.cool--; continue; }
        const B = M.P[1 - p.o], A = M.P[p.o];
        const n = hurt(B, A, null); if (!n) continue;
        set(PB, p.x - p.w, p.y - p.h, p.x + p.w, p.y + p.h);
        let hit = false; for (let i = 0; i < n; i++) if (ov(PB, HB[i])) { hit = true; break; }
        if (!hit) continue;
        const h = { d: p.d, hs: p.hs, bs: p.bs, lv: p.lv, ch: p.ch, st: p.st, pu: p.pu, kd: p.kd && p.hits <= 1 ? 1 : 0, la: p.kd && p.hits <= 1 ? [3, 8] : null, b: null };
        applyHit(M, A, B, h, 0, p);
        p.hits--; if (p.hits <= 0) { p.dead = 1; push(M, 'pjgone', p.o, p); } else { p.cool = p.gap; p.vx *= .5; }
      }
      for (let i = M.pj.length - 1; i >= 0; i--) if (M.pj[i].dead) { const p = M.pj[i]; if (M.P[p.o].proj === p) M.P[p.o].proj = null; M.pj.splice(i, 1); }
    }
    function clampX(M, F) { const lo = WALL + F.C.pw, hi = SW - WALL - F.C.pw; if (F.x < lo) F.x = lo; if (F.x > hi) F.x = hi; }
    const solid = F => !(F.st === 'held' || F.hid || (F.st === 'move' && F.mv.thru && F.mt >= F.mv.thru[0] && F.mt <= F.mv.thru[1]));
    function physics(M) {
      const [A, B] = M.P;
      for (const F of M.P) {
        if (F.freeze > 0) continue;
        if (F.y <= 0 && F.st !== 'air' && F.st !== 'fall') F.x += F.vx;
        F.x += F.px; F.px *= .8; if (Math.abs(F.px) < .05) F.px = 0;
        clampX(M, F);
      }
      // push boxes
      if (solid(A) && solid(B)) {
        const ya0 = A.y, ya1 = A.y + (airborne(A) ? 120 : 150 * A.C.H), yb0 = B.y, yb1 = B.y + (airborne(B) ? 120 : 150 * B.C.H);
        const over = A.C.pw + B.C.pw - Math.abs(A.x - B.x);
        if (over > 0 && ya0 < yb1 && yb0 < ya1) {
          let s = A.x < B.x ? -1 : A.x > B.x ? 1 : (A.face > 0 ? -1 : 1);
          const aw = atWall(A, s), bw = atWall(B, -s);
          if (aw && !bw) B.x -= s * over; else if (bw && !aw) A.x += s * over; else { A.x += s * over / 2; B.x -= s * over / 2; }
          clampX(M, A); clampX(M, B);
        }
      }
      // the camera can't show them further apart than MAXSEP
      const sep = Math.abs(A.x - B.x) - MAXSEP;
      if (sep > 0) {
        const s = A.x < B.x ? 1 : -1, am = A.vx * -s > 0 || A.px * -s > 0, bm = B.vx * s > 0 || B.px * s > 0;
        if (am && !bm) A.x += s * sep; else if (bm && !am) B.x -= s * sep; else { A.x += s * sep / 2; B.x -= s * sep / 2; }
      }
      // facing
      for (const F of M.P) {
        const O = M.P[1 - F.side];
        if ((F.st === 'stand' || F.st === 'land' || F.st === 'jumpsq') && Math.abs(O.x - F.x) > 2) F.face = O.x > F.x ? 1 : -1;
      }
    }
    const HA = new Float64Array(4);
    function hits(M) {
      const pend = [];
      for (const A of M.P) {
        if (A.st !== 'move' || A.freeze > 0) continue;
        const B = M.P[1 - A.side], hs = A.mv.hits;
        for (let i = 0; i < hs.length; i++) {
          const h = hs[i]; if (A.hmask & (1 << i)) continue;
          if (A.mt < h.f || A.mt >= h.f + h.n) continue;
          const n = hurt(B, A, h); if (!n) break;
          box(A, h.b, HA); let hit = false;
          for (let k = 0; k < n; k++) if (ov(HA, HB[k])) { hit = true; break; }
          if (hit) { pend.push([A, B, h, i, A.mv.k, A.mv.id]); break; }
        }
      }
      for (const [A, B, h, i, k, id] of pend) { A.mvId = id; applyHit(M, A, B, h, i, null, k); }
    }

    /* ---------- the match ---------- */
    function step(M, inputs) {
      M.ev.length = 0; M.f++;
      const ctl = M.phase === 'fight';
      M.P.forEach((F, i) => record(F, ctl ? inputs[i] | 0 : 0, F.freeze > 0 || !!M.fl));
      if (M.fl) { if (--M.fl.t <= 0) M.fl = null; return; }
      if (M.slow > 0) M.slow--;
      const [A, B] = M.P;
      for (const F of M.P) {
        const O = M.P[1 - F.side];
        if (F.freeze > 0) { F.freeze--; if (F.shake > 0) F.shake--; continue; }
        update(M, F, O, ctl && F.hp > 0);
      }
      if (A.st === 'held' && A.held && A.held.grab !== A) toStand(A);
      if (B.st === 'held' && B.held && B.held.grab !== B) toStand(B);
      physics(M);
      if (M.phase === 'fight' || M.phase === 'ko') { hits(M); updateProj(M); }
      else if (M.pj.length) { M.pj.forEach(p => { p.dead = 1; }); updateProj(M); }
      phase(M);
    }
    function phase(M) {
      M.pt++;
      const [A, B] = M.P;
      switch (M.phase) {
        case 'intro':
          if (M.pt === 1) push(M, 'intro', 0);
          if (M.pt >= 120) { A.st = B.st = 'stand'; A.t = B.t = 0; M.phase = 'ready'; M.pt = 0; }
          break;
        case 'ready':
          if (M.pt === 1) push(M, 'round', M.round, { n: M.round, final: M.wins[0] === 1 && M.wins[1] === 1 });
          if (M.pt === 56) { push(M, 'fight', 0); M.phase = 'fight'; M.pt = 0; }
          break;
        case 'fight':
          M.roundT++;
          if (M.train) {
            for (const F of M.P) { if (F.st === 'stand' || F.st === 'air' || F.st === 'block') { if (F.calm > 50 || (F.combo === 0 && F.hp < F.mhp && F.st === 'stand' && F.t > 50)) { F.hp = F.mhp; } }
              if (M.train.meter) F.meter = 100; }
            break;
          }
          if (--M.timer <= 0) { M.timer = 0; M.phase = 'timeup'; M.pt = 0; push(M, 'timeup', 0); }
          break;
        case 'ko':
          if (M.pt === 1 && A.hp <= 0 && B.hp <= 0) push(M, 'doubleko', 0);
          if (M.pt === 110) for (const F of M.P) if (F.hp > 0) { F.st = 'win'; F.t = 0; F.mv = null; F.vx = 0; F.px = 0; F.y = 0; F.thr = null; F.grab = null; }
          if (M.pt >= 220) endRound(M);
          break;
        case 'timeup':
          if (M.pt === 60) { const w = winnerByHp(M); for (const F of M.P) { if (F.st === 'held' || F.st === 'throw') continue; if (w === F.side) { F.st = 'win'; F.t = 0; F.mv = null; } else if (w >= 0 && F.y <= 0 && F.st !== 'down') { F.st = 'lose'; F.t = 0; F.mv = null; } } }
          if (M.pt >= 190) endRound(M);
          break;
      }
    }
    const winnerByHp = M => { const [a, b] = M.P.map(F => F.hp / F.mhp); return Math.abs(a - b) < 1e-9 ? -1 : a > b ? 0 : 1; };
    function endRound(M) {
      const [A, B] = M.P;
      let w = A.hp <= 0 && B.hp <= 0 ? -1 : A.hp <= 0 ? 1 : B.hp <= 0 ? 0 : winnerByHp(M);
      const info = { w, perfect: w >= 0 && M.P[w].hp === M.P[w].mhp, superKO: w >= 0 && M.P[w].suKO && M.P[1 - w].hp <= 0, time: M.roundT, timeout: A.hp > 0 && B.hp > 0 };
      M.rounds.push(info);
      if (w >= 0) M.wins[w]++; else { M.wins[0]++; M.wins[1]++; }
      push(M, 'roundend', w, info);
      if (M.wins[0] >= 2 || M.wins[1] >= 2) {
        M.over = 1; M.phase = 'over'; M.pt = 0;
        M.winner = M.wins[0] >= 2 && M.wins[1] >= 2 ? -1 : M.wins[0] >= 2 ? 0 : 1;
        push(M, 'matchend', M.winner);
        return;
      }
      M.round++; M.phase = 'ready'; M.pt = 0; resetRound(M);
    }
    // a training dummy that blocks everything ("Blokken")
    function dummyBits(M, side, mode) {
      const F = M.P[side], O = M.P[1 - side], fw = O.x > F.x ? R : L, bk = fw === R ? L : R;
      if (mode === 'crouch') return D;
      if (mode === 'jump') return U;
      if (mode === 'block') {
        let low = false, any = false;
        if (O.st === 'move' && O.mv.hits.length) { any = true; low = O.mv.hits.some(h => h.lv === 'l'); }
        for (const p of M.pj) if (p.o !== side) { any = true; if (p.lv === 'l') low = true; }
        if (O.st === 'air' || (O.st === 'move' && O.mv.air)) return bk;
        return any || F.st === 'block' ? bk | (low ? D : 0) : 0;
      }
      return 0;
    }
    return { SW, WALL, MAXSEP, TIMER, U, D, L, R, LP, HP, LK, HK, SP, SU, BTN, prep, newMatch, step, relDir, motion, hurt, HB, box, airborne, crouching, invuln, dummyBits, seq, dirAt, other };
  })();
