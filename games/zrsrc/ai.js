  /* ================= ai.js: the computer opponent (deterministic; uses the same commands as the player) ================= */
  const AI = (() => {
    // build order: the base grows step by step; later entries need the earlier tech
    const ORDER = ['cent', 'raff', 'kaz', 'cent', 'fab', 'toren', 'raff', 'radar', 'cent', 'silo', 'toren', 'rep', 'cent', 'rpaal', 'toren', 'rpaal', 'cent', 'fab'];
    function init(S, P) {
      const D = DIFFS[P.ai], by = S.B.find(b => b.o === P.i && b.t === 'bouw') || S.B.find(b => b.o === P.i);
      const bx = by ? by.x + by.w / 2 : P.base.x, byy = by ? by.y + by.h / 2 : P.base.y;
      const outpost = !S.B.some(b => b.o === P.i && b.t === 'bouw');
      P.A = { bo: 0, nt: P.i * 3, wave: 0, outpost, cap: outpost ? 6 + P.ai * 4 : 99, next: Math.round((P.aggro ? 75 : P.raid ? 120 : D.wave0) * TPS), size: P.raid ? 2 : D.size0, bx, by: byy, def: 0, hunt: 0, fails: 0 };
    }
    const enemies = (S, P) => S.P.filter(Q => Q !== P && !Q.out);
    function targetPlayer(S, P) {
      let best = null, bd = 1e9;
      for (const Q of enemies(S, P)) { const d = Math.hypot(Q.base.x - P.A.bx, Q.base.y - P.A.by) * (Q.i === S.human ? .9 : 1); if (d < bd) { bd = d; best = Q; } }
      return best;
    }
    function targetFor(S, P, Q, from) {                          // the nearest enemy building (or unit) of Q
      let best = null, bd = 1e9;
      for (const b of S.B) if (!b.dead && b.o === Q.i) { const d = Math.hypot(b.x - from.x, b.y - from.y) + (BT[b.t].wt ? 4 : 0); if (d < bd) { bd = d; best = b; } }
      if (!best) for (const u of S.U) if (!u.dead && u.o === Q.i) { const d = Math.hypot(u.x - from.x, u.y - from.y); if (d < bd) { bd = d; best = u; } }
      return best;
    }
    const have = (P, t) => (P.bc[t] || 0) + (P.ready === t ? 1 : 0) + P.q.b.filter(q => q.t === t).length;
    function pickBuilding(S, P) {
      const D = DIFFS[P.ai], A = P.A;
      if (!P.bc.bouw) return null;
      const spare = P.pw - P.pu;
      if (spare < 25 && have(P, 'cent') <= (P.bc.cent || 0)) return 'cent';
      if (!have(P, 'raff') && techOk(S, P.i, 'raff')) return 'raff';
      if (!have(P, 'kaz') && techOk(S, P.i, 'kaz')) return 'kaz';
      if (!have(P, 'fab') && techOk(S, P.i, 'fab')) return 'fab';
      if (P.cry > P.cap * .85 && have(P, 'silo') < 3 && techOk(S, P.i, 'silo')) return 'silo';
      // the build order: how many of each type should exist after step k
      while (A.bo < ORDER.length) {
        const t = ORDER[A.bo], want = ORDER.slice(0, A.bo + 1).filter(x => x === t).length;
        if (have(P, t) >= want) { A.bo++; continue; }
        if ((t === 'toren' || t === 'rpaal') && ORDER.slice(0, A.bo + 1).filter(x => x === 'toren' || x === 'rpaal').length > D.tow + 1) { A.bo++; continue; }
        if (!techOk(S, P.i, t)) { if ((TIER[t] || 1) > S.tier) { A.bo++; continue; } return null; }
        return t;
      }
      // after the order: more defence and power now and then
      const tw = have(P, 'toren') + have(P, 'rpaal');
      if (tw < D.tow * 2 && P.cry > 900) return techOk(S, P.i, 'rpaal') && tw % 2 ? 'rpaal' : 'toren';
      return null;
    }
    function placeReady(S, P) {
      const t = P.ready, A = P.A; let towards = t === 'raff' || t === 'silo' ? raffAim(S, A.bx, A.by) : null;
      if (t === 'toren' || t === 'rpaal') {
        const Q = targetPlayer(S, P); const ang = Q ? Math.atan2(Q.base.y - A.by, Q.base.x - A.bx) : 0, k = (S.t / 97 | 0) % 3 - 1;
        towards = { x: A.bx + Math.cos(ang + k * .7) * 6.5, y: A.by + Math.sin(ang + k * .7) * 6.5 };
      }
      const s = findSpot(S, P.i, t, A.bx, A.by, false, towards);
      if (s && cmd(S, P.i, { c: 'place', x: s.x, y: s.y })) { A.fails = 0; return; }
      if (++A.fails > 3) { cmd(S, P.i, { c: 'cancel', cat: 'b', ready: 1 }); A.fails = 0; A.bo++; }
    }
    function pickUnit(S, P, cat) {
      const D = DIFFS[P.ai], mix = D.mix.filter(t => t === 'sp' || (UT[t].cat === 'inf') === (cat === 'i'));
      const opts = mix.map(t => t === 'sp' ? FACTIONS[P.fac].sp : t).filter(t => techOk(S, P.i, t));
      if (!opts.length) { const f = cat === 'i' ? 'sol' : 'lt'; return techOk(S, P.i, f) ? f : null; }
      // counter the enemy a little: many vehicles -> more rockets
      const Q = targetPlayer(S, P); let veh = 0, inf = 0;
      if (Q) for (const u of S.U) if (u.o === Q.i && !u.dead) { if (UT[u.t].cat === 'veh') veh++; else inf++; }
      if (cat === 'i' && veh > inf * 1.5 && techOk(S, P.i, 'raks') && rnd(S) < .6) return 'raks';
      return opts[Math.floor(rnd(S) * opts.length)];
    }
    function think(S, P) {
      const A = P.A; if (!A) { init(S, P); return; }
      if (S.t < A.nt) return;
      const D = DIFFS[P.ai]; A.nt = S.t + D.think; const late = S.t > TPS * 60 * 20;
      if (P.ready) placeReady(S, P);
      // buildings
      if (!P.q.b.length && !P.ready) { const t = pickBuilding(S, P); if (t && (!late || t === 'cent' || !P.bc[t])) cmd(S, P.i, { c: 'build', t }); }
      // harvesters
      const harv = S.U.filter(u => !u.dead && u.o === P.i && UT[u.t].harv).length + P.q.v.filter(q => q.t === 'oog').length;
      const wantH = Math.min(P.ai === 2 ? 5 : 4, (P.bc.raff || 0) * D.harv + (P.ai === 2 && P.bc.raff ? 1 : 0) + (late ? 1 : 0));
      const building = P.q.b.length && P.cry < 500;
      if (harv < wantH && P.bc.fab && P.cry > 300 && techOk(S, P.i, 'oog') && !P.q.v.some(q => q.t === 'oog')) { cmd(S, P.i, { c: 'build', t: 'oog' }); if (P.q.v.length > 1) { const it = P.q.v.pop(); P.q.v.splice(1, 0, it); } }
      // units
      const army = S.U.filter(u => !u.dead && u.o === P.i && UT[u.t].wt);
      const nInf = army.filter(u => UT[u.t].cat === 'inf').length, nVeh = army.length - nInf;
      if (!building && army.length < A.cap + A.wave * (A.outpost ? 1 : 0)) {
        if (P.bc.kaz && P.q.i.length < 1 && P.cry > 120 && (nInf < nVeh * 1.3 + 3 || !P.bc.fab)) { const t = pickUnit(S, P, 'i'); if (t) cmd(S, P.i, { c: 'build', t }); }
        if (P.bc.fab && P.q.v.length < 1 && P.cry > 250) { const t = pickUnit(S, P, 'v'); if (t) cmd(S, P.i, { c: 'build', t }); }
      }
      for (const b of S.B) if (b.o === P.i && !b.dead && b.hp < b.mhp * .55 && !b.rep && P.cry > (late ? 900 : 300) && S.t - b.hit > TPS * 4) cmd(S, P.i, { c: 'brep', b: b.id });
      // defence: something of ours is under fire -> idle units near home go there
      let alarm = null;
      for (const b of S.B) if (b.o === P.i && !b.dead && S.t - b.hit < TPS * 3) { alarm = { x: b.ax, y: b.ay }; break; }
      if (!alarm) for (const u of S.U) if (u.o === P.i && !u.dead && UT[u.t].harv && S.t - u.hit < TPS * 3) { alarm = { x: u.ax, y: u.ay }; break; }
      if (alarm && S.t - A.def > TPS * 3) {
        A.def = S.t;
        const ids = army.filter(u => (u.st === 'idle' || (u.st === 'amove' && u.home)) && Math.hypot(u.x - A.bx, u.y - A.by) < 24).map(u => u.id);
        if (ids.length) { cmd(S, P.i, { c: 'amove', ids, x: alarm.x, y: alarm.y }); for (const id of ids) S.E[id].home = 1; }
      }
      // attack waves that grow
      const idle = army.filter(u => u.st === 'idle' && !u.rp);
      const Q = targetPlayer(S, P);
      if (Q && S.t >= A.next && (idle.length >= A.size || (S.t > A.next + TPS * 45 && idle.length >= Math.min(A.size, 3)))) {
        const from = { x: A.bx, y: A.by }, full = idle.length >= A.size;
        let tg = P.raid ? S.U.filter(u => !u.dead && u.o === Q.i && UT[u.t].harv).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0] : null;
        if (!tg && (late || A.wave % 3 === 2)) tg = S.B.filter(b => !b.dead && b.o === Q.i && (b.t === 'bouw' || b.t === 'raff' || b.t === 'fab')).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
        if (!tg) tg = targetFor(S, P, Q, from);
        if (tg) {
          const c = center(tg), ids = idle.slice(0, Math.max(A.size, idle.length - 2)).map(u => u.id);
          cmd(S, P.i, { c: 'amove', ids, x: c.x, y: c.y }); for (const id of ids) S.E[id].home = 0;
          A.wave++; A.next = S.t + Math.round((P.aggro ? 60 : P.raid ? 75 : late ? Math.min(D.gap, 60) : D.gap) * TPS); if (full) A.size = Math.min(P.raid ? 4 : D.maxW, A.size + (P.raid ? 1 : D.grow));
        }
      }
      // defenders go home again; units that finished a wave far from home keep pushing to the next target
      if ((S.t / D.think | 0) % 4 === 1) { const back = idle.filter(u => u.home && Math.hypot(u.x - A.bx, u.y - A.by) > 12); if (back.length) cmd(S, P.i, { c: 'move', ids: back.map(u => u.id), x: A.bx, y: A.by + 4 }); }
      if (Q && (S.t / D.think | 0) % 4 === 0) {
        const far = idle.filter(u => !u.home && Math.hypot(u.x - A.bx, u.y - A.by) > 16);
        if (far.length) { const tg = targetFor(S, P, Q, far[0]); if (tg) { const c = center(tg); cmd(S, P.i, { c: 'amove', ids: far.map(u => u.id), x: c.x, y: c.y }); } }
      }
      // no bouwplaats left: everything attacks
      if (!P.bc.bouw && !P.bc.fab && !P.bc.kaz && Q && idle.length && (S.t / D.think | 0) % 3 === 0) { const tg = targetFor(S, P, Q, idle[0]); if (tg) { const c = center(tg); cmd(S, P.i, { c: 'amove', ids: idle.map(u => u.id), x: c.x, y: c.y }); } }
      // idle harvesters go back to work
      for (const u of S.U) if (u.o === P.i && !u.dead && UT[u.t].harv && u.st === 'idle') cmd(S, P.i, { c: 'harvest', ids: [u.id] });
    }
    return { init, think };
  })();
