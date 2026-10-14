  /* ================= ai.js: the computer opponent =================
     It only sees the opponent as it was `react` frames ago (a ring of snapshots) and plays through the same pad
     bits a person would: motions are typed out frame by frame, charge moves need real charge. Difficulty changes
     reaction time, how often it blocks / anti-airs / punishes / combos, and how well it tells low from high. */
  const AI = (() => {
    const LV = {
      makkelijk: { react: 26, block: .3, lowGuess: .45, aa: .14, punish: .18, combo: .15, throw: .04, tech: .05, aggr: .42, proj: .22, jump: .1, superP: .3, reversal: .08, think: 11, mash: .15 },
      normaal: { react: 15, block: .6, lowGuess: .75, aa: .45, punish: .5, combo: .5, throw: .12, tech: .25, aggr: .55, proj: .38, jump: .1, superP: .6, reversal: .3, think: 6, mash: .06 },
      moeilijk: { react: 9, block: .82, lowGuess: .92, aa: .75, punish: .8, combo: .82, throw: .2, tech: .45, aggr: .62, proj: .45, jump: .08, superP: .85, reversal: .5, think: 4, mash: .02 },
    };
    const PREF = { dex: 170, truus: 90, moer: 260, sol: 140, bram: 100, kiki: 150, sjaak: 110, nevel: 230 };
    const { U, D, L, R, LP, HP, LK, HK, SU } = Core;
    function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
    const MOT = { qcf: [2, 3, 6], qcb: [2, 1, 4], dp: [6, 2, 3], qcf2: [2, 3, 6, 2, 3, 6] };

    function create(level, seed, side) {
      const P = LV[level] || LV.normaal, rnd = rng(seed || 1), ring = [];
      const A = { P, side, q: [], next: 0, pjCool: 0, seen: -1, cancelSer: -1, blockSer: -1, blocking: 0, blockLow: false, aaSer: -1, jumpAtk: 0, techAt: -1, techSer: -1,
        idleDir: 5, walkT: 0, lastHp: 0, holdCharge: 0 };
      const snap = (M, F, O) => {
        const m = O.st === 'move' ? O.mv : null, h0 = m && m.hits.length ? m.hits[0] : null;
        let ph = '';
        if (m && h0) { const end = m.hits[m.hits.length - 1]; ph = O.mt < h0.f ? 'startup' : O.mt < end.f + end.n ? 'active' : 'recovery'; }
        else if (m && (m.pj || m.gr || m.tp || m.ct)) ph = 'other';
        let pd = 9999, plv = 'h', pser = 0;
        for (const p of M.pj) if (p.o !== F.side) { const dx = (p.x - F.x) * -Math.sign(p.vx); if (dx > -20 && dx < pd) { pd = dx; plv = p.lv; pser = p.ser; } }
        return { x: O.x, y: O.y, vx: O.vx, vy: O.vy, st: O.st, t: O.t, mser: O.mser, ph, mv: m, low: !!(m && m.hits.some(h => h.lv === 'l')), air: Core.airborne(O),
          rec: m ? (m.air ? 99 : m.tot - O.mt) : O.st === 'land' ? O.lr - O.t : 0, pd, plv, pser, throwing: !!(m && m.pj), crouch: Core.crouching(O), hp: O.hp };
      };
      const sp = (F, role) => F.C.sp.find(s => s.role === role);
      const btnOf = (s, heavy) => s.b === 'P' ? (heavy ? HP : LP) : (heavy ? HK : LK);
      function queueMotion(F, s, heavy) {
        const b = btnOf(s, heavy);
        if (s.in === 'cb') { if (!(F.cb >= 40 || (F.cbS >= 40 && F.cbT <= 8))) return false; A.q.push({ d: 6, b }); return true; }
        if (s.in === 'cd') { if (!(F.cd >= 40 || (F.cdS >= 40 && F.cdT <= 8))) return false; A.q.push({ d: 9, b }); return true; }
        const seq = MOT[s.in]; seq.forEach((d, i) => A.q.push({ d, b: i === seq.length - 1 ? b : 0 })); return true;
      }
      function queueSuper(F) { const s = F.C.su; MOT.qcf2.forEach((d, i) => A.q.push({ d, b: i === 5 ? btnOf(s, 1) : 0 })); }
      const press = (d, b) => A.q.push({ d, b });
      const bits = (F, d, b) => {
        const fw = F.face > 0 ? R : L, bk = F.face > 0 ? L : R; let x = b || 0;
        if (d >= 7) x |= U; if (d <= 3) x |= D; if (d % 3 === 0) x |= fw; if (d % 3 === 1) x |= bk; return x;
      };
      A.input = (M) => {
        const F = M.P[side], O = M.P[1 - side];
        ring.push(snap(M, F, O)); if (ring.length > 40) ring.shift();
        if (M.phase !== 'fight') { A.q.length = 0; return 0; }
        const S = ring[Math.max(0, ring.length - 1 - P.react)], dist = Math.abs(S.x - F.x), now = M.f;
        // ---- held by a throw: try to escape ----
        if (F.st === 'held') {
          if (A.techSer !== F.held.mser + M.f - F.t) { A.techSer = F.held.mser + M.f - F.t; A.techAt = rnd() < P.tech ? 2 + Math.floor(rnd() * 6) : -1; }
          return F.t === A.techAt ? bits(F, 4, HP) : 0;
        }
        // ---- cancels and combos (we can see our own hits straight away) ----
        if (F.st === 'move' && F.conn && F.mser !== A.cancelSer && !A.q.length) {
          A.cancelSer = F.mser; const m = F.mv;
          if (m.k === 'n' && !m.air) {
            const hit = F.conn === 1;
            if (hit && rnd() < P.combo) {
              if (m.ch && F.chain < 2 && rnd() < .55) press(m.crouch ? 2 : 5, rnd() < .5 ? LK : LP);
              else if (m.cn) { const s = (F.meter >= 100 && rnd() < P.superP) ? null : (sp(F, 'rush') || sp(F, 'proj') || sp(F, 'poke'));
                if (!s) queueSuper(F); else if (!queueMotion(F, s, 1)) press(m.crouch ? 2 : 5, LK); }
            } else if (!hit && m.ch && F.chain < 2 && rnd() < P.combo * .5) press(2, LK);
          } else if (m.k === 's' && F.conn === 1 && m.cn === 'u' && F.meter >= 100 && rnd() < P.superP) queueSuper(F);
        }
        if (A.q.length) { const e = A.q.shift(); return bits(F, e.d, e.b); }
        // ---- defence: projectiles (block, jump over, or answer with our own) and strikes we see coming ----
        const canAct = F.st === 'stand' || F.st === 'land' || F.st === 'block' || F.st === 'hit' || F.st === 'rise' || F.st === 'down';
        if (S.pd < 290 && S.pd > -10 && canAct) {
          const key = 'p' + S.pser;
          if (key !== A.blockKey) {
            A.blockKey = key; const r = rnd(); A.pjMode = r < P.block + .22 ? 'block' : r < P.block + .4 ? 'jump' : 'none';
            A.blockLow = S.plv === 'l' ? rnd() < P.lowGuess + .1 : rnd() > P.lowGuess + .1;
            if (A.pjMode === 'jump' && S.pd > 100 && F.st === 'stand') { const t = sp(F, 'tele'); if (t && rnd() < .5) queueMotion(F, t, 1); else press(Math.abs(S.x - F.x) < 330 ? 9 : 8, 0); A.pjMode = 'none'; }
          }
          if (A.pjMode === 'block' && F.st !== 'hit') return bits(F, A.blockLow ? 1 : 4, 0);
        } else if (S.mv && S.mv.hits.length && (S.ph === 'startup' || S.ph === 'active') && dist < 230 && canAct) {
          const key = 'm' + S.mser;
          if (key !== A.blockKey) { A.blockKey = key; A.blocking = rnd() < P.block; const over = S.air || S.mv.hits.some(h => h.lv === 'o');
            A.blockLow = over ? rnd() > P.lowGuess : S.low ? rnd() < P.lowGuess : rnd() > P.lowGuess; }
          if (A.blocking && F.st !== 'hit') return bits(F, A.blockLow ? 1 : 4, 0);
        } else if (S.air && S.vy < 0 && dist < 200 && canAct && A.aaGo === false && A.blockKey !== 'j' + S.mser + S.t) {
          // a jump-in we decided not to anti-air: block it standing (most of the time)
          if (rnd() < P.block) return bits(F, 4, 0);
        }
        if (F.st === 'block') return bits(F, A.blockLow ? 1 : 4, 0);
        if (!(F.st === 'stand' || F.st === 'land' || F.st === 'air')) { // wake-up reversal
          if (F.st === 'rise' && F.t >= 19 && dist < 140 && rnd() < P.reversal) { const s = sp(F, 'aa'); if (s && !s.v[1].gr) queueMotion(F, s, 1); }
          return 0;
        }
        // ---- in the air: a jump-in attack on the way down ----
        if (F.st === 'air') { if (!F.airAtk && F.vy < 0 && F.y < 95 && Math.abs(O.x - F.x) < 150) return bits(F, 5, rnd() < .6 ? HK : HP); return 0; }
        const me = F.C, pref = PREF[me.id] || 160;
        // ---- anti-air ----
        if (S.air && S.st !== 'fall' && (S.x - F.x) * F.face > -40 && dist < 240) {
          if (A.aaSer !== S.mser + ':' + Math.floor(now / 50)) { A.aaSer = S.mser + ':' + Math.floor(now / 50); A.aaGo = rnd() < P.aa; }
          if (A.aaGo) {
            const s = sp(F, 'aa');
            if (s && dist < 160 && S.y < 170) {
              if (s.in === 'cd' && !(F.cd >= 40 || F.cdS >= 40 && F.cdT < 8)) { if (dist < 90) { press(2, HP); return 0; } }
              else if (queueMotion(F, s, 1)) { A.aaGo = false; const e = A.q.shift(); return bits(F, e.d, e.b); }
            }
            if (dist < 95 && S.y < 150) { A.aaGo = false; return bits(F, 2, HP); }
            return bits(F, 4, 0);
          }
        }
        // ---- punish what whiffed ----
        if ((S.ph === 'recovery' && S.rec > 8) || (S.st === 'land' && S.rec > 4) || S.st === 'dizzy') {
          if (A.punSer !== S.mser + S.st) { A.punSer = S.mser + S.st; A.punGo = rnd() < (S.st === 'dizzy' ? .9 : P.punish); }
          if (A.punGo) {
            if (F.meter >= 100 && dist < 170 && rnd() < P.superP) { queueSuper(F); A.punGo = false; }
            else if (dist < 90 * me.reach + 20) { press(5, HP); A.punGo = false; }
            else if (dist < 120 * me.reach) { press(2, HK); A.punGo = false; }
            else { const s = sp(F, 'rush'); if (s && dist < 260 && queueMotion(F, s, 1)) A.punGo = false; }
            if (A.q.length) { const e = A.q.shift(); return bits(F, e.d, e.b); }
          }
        }
        // ---- neutral game ----
        if (now < A.next) return bits(F, A.idleDir, 0);
        A.next = now + P.think + Math.floor(rnd() * P.think);
        const r = rnd(), close = F.C.pw + O.C.pw + 26, myProj = !!F.proj;
        const ps = sp(F, 'proj'), pjRange = ps ? (ps.v[0].pj.life * ps.v[0].pj.vx + 40) : 0;
        if (me.charge) A.idleDir = 1;                          // the robot keeps its charge: crouching back
        else A.idleDir = 5;
        // super when it's close and safe-ish
        if (F.meter >= 100 && dist < 150 && r < P.superP * .25) { queueSuper(F); return 0; }
        if (dist <= close && S.st !== 'hit' && S.st !== 'block' && !S.air) {
          const g = sp(F, 'grab');
          if (r < P.throw) { press(rnd() < .5 ? 6 : 4, HP); return 0; }
          if (g && r < P.throw + .2) { queueMotion(F, g, rnd() < .5 ? 1 : 0); return 0; }
          const ct = sp(F, 'counter');
          if (ct && S.mv && S.ph === 'startup' && r < .3) { queueMotion(F, ct, 1); return 0; }
        }
        // pokes: only buttons that actually reach the front of the opponent
        const front = dist - 24 * O.C.W, reach = k => me.mv[k].hits[0].b[2];
        if (front < reach('cLK') + 6) {                          // close: quick pokes and little strings
          if (r < P.aggr) {
            const k = rnd(); if (k < .32) press(2, LK); else if (k < .5) press(5, LP); else if (k < .64) press(2, LP); else if (k < .78) press(5, HP); else if (k < .88) press(2, HK);
            else { const h = sp(F, 'hop') || sp(F, 'poke'); if (h) queueMotion(F, h, rnd() < .5 ? 1 : 0); else press(5, LK); }
            return 0;
          }
          A.idleDir = rnd() < .5 ? (me.charge ? 1 : 4) : 5; return bits(F, A.idleDir, 0);
        }
        if (S.throwing && dist > 140 && dist < 300 && r < P.punish * .6) { press(9, 0); return 0; }
        if (ps && !myProj && now > A.pjCool && dist > 190 && dist < pjRange && r < P.proj) { if (queueMotion(F, ps, rnd() < .5 ? 1 : 0)) { A.pjCool = now + 50 + Math.floor(rnd() * 90); return 0; } }
        const mid = ['sHK', 'cHK', 'sHP', 'sLK'].filter(k => reach(k) >= front - 4 && reach(k) <= front + 34);
        if (mid.length && r < P.aggr * .7) { const k = mid[Math.floor(rnd() * mid.length)]; press(k[0] === 'c' ? 2 : 5, { sHK: HK, cHK: HK, sHP: HP, sLK: LK }[k]); return 0; }
        if (dist < 230 && r < P.aggr * .2) { const s = rnd() < .5 ? sp(F, 'rush') : (sp(F, 'hop') || sp(F, 'tele')); if (s && queueMotion(F, s, rnd() < .5 ? 1 : 0)) return 0; }
        if (dist > 150 && dist < 280 && r < P.jump + (me.id === 'sol' || me.id === 'kiki' ? .05 : 0)) { press(9, 0); return 0; }
        // walk towards the distance this fighter likes (with some wobble), sometimes dash
        const want = pref * (.8 + rnd() * .5);
        if (dist > want + 30) {
          if (dist > 300 && rnd() < .12 && !me.charge) { press(6, 0); press(5, 0); press(6, 0); A.idleDir = 5; return 0; }
          A.idleDir = me.charge && rnd() < .5 ? 1 : 6;
        } else if (dist < want - 30) A.idleDir = me.charge ? 1 : (rnd() < .7 ? 4 : 5);
        else A.idleDir = me.charge ? 1 : (rnd() < P.aggr ? 6 : rnd() < .5 ? 5 : 4);
        return bits(F, A.idleDir, 0);
      };
      return A;
    }
    return { create, LV };
  })();
