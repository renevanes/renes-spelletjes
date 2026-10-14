  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ================= settings, progress ================= */
  const LV = LEVELS.levels, DLY = LEVELS.daily, NL = LV.length;
  const opt = Object.assign({ sound: true, cb: false }, store.get('bh.settings', {}));
  const saveOpt = () => store.set('bh.settings', opt);
  Sfx.gate('bh', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  let stats = Object.assign({ played: 0, won: 0, lost: 0, stars: {}, coins: 30, inv: null, daily: {}, dailyWon: 0, boosts: 0, three: 0 }, store.get('bh.stats', {}));
  stats.inv = Object.assign({ undo: 3, bay: 2, shuf: 2, crane: 2 }, stats.inv || {});
  const saveStats = () => store.set('bh.stats', stats);
  const BOOST = { undo: { n: 'Terug', p: 20, i: '↶' }, bay: { n: 'Extra vak', p: 60, i: '🅿️' }, shuf: { n: 'Schudden', p: 40, i: '🔀' }, crane: { n: 'Kraan', p: 50, i: '🏗️' } };
  const unlocked = () => { let n = 1; while (n < NL && stats.stars[n]) n++; return n; };
  const DAILY_FROM = 9, dailyOpen = () => !!stats.stars[DAILY_FROM - 1];
  const totalStars = () => Object.values(stats.stars).reduce((a, b) => a + b, 0);
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayIdx = d => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5) % DLY.length;
  const levelOf = id => typeof id === 'number' ? LV[id - 1] : DLY[dayIdx(String(id).slice(1))];
  const TIPS = {
    tap: 'Tik op een bus. Hij rijdt rechtuit weg, de kant op van de pijl, en parkeert in een vak bij de halte.',
    block: 'Staat er iets in de weg, dan botst de bus en rijdt hij weer terug. Haal eerst weg wat ervoor staat.',
    board: 'Passagiers stappen in de bus met hun eigen kleur, in de volgorde van de rij. Is een bus vol, dan rijdt hij weg.',
    bays: 'Let op de vakken bij de halte! Zijn ze allemaal bezet en past de voorste passagier in geen enkele bus, dan zit je vast.',
    long: 'Nieuw: de gelede bus. Daar passen wel 10 passagiers in!',
    obs: 'Pionnen, paaltjes, bloembakken en wegafzettingen blijven staan. Daar kan geen bus langs.',
    hid: 'Grijze bussen met een vraagteken laten hun kleur pas zien als hun weg vrij is.',
    lock: 'Een bus met een slotje rijdt pas weg als er eerst nog zoveel andere bussen zijn weggereden als het getal op het slotje.',
    lb: 'Het vak achter de slagboom gaat open als er genoeg volle bussen zijn vertrokken.',
  };

  /* ================= state ================= */
  let S = null, G = null, L = null, LY = null, K = 1, dpr = 1, dprB = 1, craneMode = false;
  const scr = $('#bh'), stage = $('#bhStage'), bg = $('#bhBg'), cv = $('#bhCv'), ctx = cv.getContext('2d'), bctx = bg.getContext('2d');
  const now = () => performance.now() / 1000;
  const SPEED = 11;                                              // cells per second on the road

  /* ================= layout (world units = cells; the lot is at 0..w, 0..h) ================= */
  function layoutWorld(land) {
    const w = S.w, h = S.h, RW = 1, rc = .56, nb = S.bays.length, bayW = 1.2;
    const depth = Math.max(2.5, vLen(Math.max(...S.V.map(v => v.len))) + .45);
    const ring = { x0: -rc, y0: -rc, x1: w + rc, y1: h + rc };
    const roadY = land ? ring.y1 : ring.y0;
    const bx0 = land ? ring.x1 + RW / 2 + 1.1 + bayW / 2 : w / 2 - nb * bayW / 2 + bayW / 2;
    const mouth = roadY - RW / 2 - .1, top = mouth - depth;
    const bays = [...Array(nb)].map((_, i) => ({ x: bx0 + i * bayW, top, mouth, kind: i === nb - 1 ? 'x' : (S.lb && i === S.B ? 'l' : 'n') }));
    const QH = 2.3, outerX0 = ring.x0 - RW / 2 - .1, outerX1 = ring.x1 + RW / 2 + .1;
    const px0 = land ? bays[0].x - bayW / 2 - .2 : Math.min(outerX0, bays[0].x - bayW / 2 - .2), px1 = land ? bays[nb - 1].x + bayW / 2 + .35 : Math.max(outerX1, bays[nb - 1].x + bayW / 2 + .2);
    const plat = { x0: px0, x1: px1, y0: top - QH, y1: top };
    const shelter = { x: px0 + .2, y: plat.y0 + .22, w: 1.25, h: 1.55 };
    // the queue: a snake of two rows on the platform, the front at the shelter end
    const fx = shelter.x + shelter.w + .42, ex = px1 - .38, r1 = top - .5, r2 = top - 1.45;
    const snake = mkPath([[fx, r1], [ex, r1], [ex + .45, (r1 + r2) / 2], [ex, r2], [fx - .1, r2]], .45);
    const SP = .45, cap = Math.max(4, Math.floor(snake.len / SP) + 1);
    const queue = { pos: i => snake.at(Math.max(0, i) * SP), cap, rope: [[fx - .05, (r1 + r2) / 2 + .05, ex - .15, (r1 + r2) / 2 + .05]], front: [fx, r1] };
    const bx = [Math.min(outerX0 - .2, px0 - .1), Math.max(outerX1 + .2, px1 + .1)], by = [Math.min(plat.y0 - .12, ring.y0 - RW / 2 - .25), ring.y1 + RW / 2 + .3];
    const solid = [[outerX0, ring.y0 - RW / 2 - .1, outerX1, ring.y1 + RW / 2 + .1], [px0, plat.y0, px1, plat.y1], [bays[0].x - bayW / 2 - .1, top, bays[nb - 1].x + bayW / 2 + .1, mouth + .2],
      [-1e3, roadY - RW / 2 - .1, 1e3, roadY + RW / 2 + .1]];
    if (land) solid[3][0] = ring.x1 - 1;
    return { land, w, h, RW, ring, roadY, bays, bayW, depth, plat, shelter, sign: { x: shelter.x + shelter.w + .05, y: top - .3 }, queue, bx0: bx[0], bx1: bx[1], by0: by[0], by1: by[1], solid };
  }
  function fit(force) {
    if (current !== 'bh' || !S) return;
    const land = innerWidth > innerHeight * 1.1, was = LY && LY.land; scr.classList.toggle('land', land);
    const r = stage.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    // scenery at full screen resolution; the live layer (redrawn while things move) at most 2x: plenty sharp, much cheaper
    dprB = Math.min(3, devicePixelRatio || 1); dpr = Math.min(+(window.__bhDpr || 2), dprB);
    const ly = layoutWorld(land), bw = ly.bx1 - ly.bx0, bh = ly.by1 - ly.by0;
    const c = Math.min(r.width / bw, r.height / bh, 62);
    ly.c = c; ly.ox = (r.width - bw * c) / 2 - ly.bx0 * c; ly.oy = (r.height - bh * c) / 2 - ly.by0 * c; ly.cw = r.width; ly.ch = r.height;
    ly.xEdge = (r.width - ly.ox) / c;
    const same = LY && !force && LY.c === ly.c && LY.ox === ly.ox && LY.oy === ly.oy && LY.land === ly.land && LY.lvKey === lvKey();
    LY = ly; LY.lvKey = lvKey(); K = c * dpr;
    if (same && bg.width === Math.round(r.width * dprB) && cv.width === Math.round(r.width * dpr)) { requestDraw(); return; }
    bg.width = Math.round(r.width * dprB); bg.height = Math.round(r.height * dprB); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); underSig = '';
    drawBg(); needFull = true; if (was !== land || force) syncVisual(); requestDraw();
  }
  const lvKey = () => G ? String(G.id) + (S.lb ? 'l' : '') : '';
  function drawBg() {
    const g = bctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bg.width, bg.height);
    const KB = LY.c * dprB; g.setTransform(KB, 0, 0, KB, LY.ox * dprB, LY.oy * dprB);
    drawScene(g, LY, S, KB, LY.cw / LY.c, LY.ch / LY.c);
    // the finished scenery becomes a plain image: a canvas on screen is copied again for every frame of the live layer
    const img = $('#bhBgImg'), my = ++bgGen; bg.style.display = ''; img.style.visibility = 'hidden';
    if (bg.toBlob && !window.__bhNoBgImg) bg.toBlob(b => {
      if (!b || my !== bgGen) return;
      const url = URL.createObjectURL(b);
      img.onload = () => { if (my !== bgGen) return; img.style.visibility = ''; bg.style.display = 'none'; if (bgUrl) URL.revokeObjectURL(bgUrl); bgUrl = url; };
      img.src = url;
    });
  }
  let bgGen = 0, bgUrl = '';

  /* ================= paths: polylines with rounded corners, followed by arc length ================= */
  function mkPath(pts, rad = .62) {
    const P = [];
    for (const p of pts) { const q = P[P.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) P.push(p); }
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1], cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), dot = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]);
      if (Math.abs(cr) < 1e-6 && dot > 0) { P.splice(i, 1); i--; }
    }
    const out = [P[0]];
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1], la = Math.hypot(b[0] - a[0], b[1] - a[1]), lb = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const r = Math.min(rad, la * (i === 1 ? .9 : .5), lb * (i === P.length - 2 ? .9 : .5));
      const p1 = [b[0] - (b[0] - a[0]) / la * r, b[1] - (b[1] - a[1]) / la * r], p2 = [b[0] + (c[0] - b[0]) / lb * r, b[1] + (c[1] - b[1]) / lb * r];
      out.push(p1);
      for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
    }
    if (P.length > 1) out.push(P[P.length - 1]);
    const cum = [0]; for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    const len = cum[cum.length - 1];
    function at(s) {
      if (out.length < 2) return [out[0][0], out[0][1], 0];
      s = Math.max(0, Math.min(len, s)); let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const d = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / d, A = out[lo], B = out[hi];
      return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, Math.atan2(B[1] - A[1], B[0] - A[0])];
    }
    return { len, at };
  }
  // speed profile: accelerate, cruise, brake (a, d = fractions of the time); returns the fraction of the way
  function trap(u, a, d) {
    u = Math.max(0, Math.min(1, u)); const vm = 1 / (1 - a / 2 - d / 2);
    if (u < a) return vm * u * u / (2 * a);
    if (u <= 1 - d || d === 0) return Math.min(1, vm * (a / 2 + (u - a)));
    const r = 1 - u; return 1 - vm * r * r / (2 * d);
  }
  const easeOut = u => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3), easeIn = u => Math.pow(Math.max(0, Math.min(1, u)), 2);
  function lotPose(v) { const vert = v.d % 2 === 0; return [v.x + (vert ? .5 : v.len / 2), v.y + (vert ? v.len / 2 : .5), v.d * Math.PI / 2]; }
  function parkPose(v, slot) { const b = LY.bays[slot]; return [b.x, b.top + .14 + vLen(v.len) / 2, 0]; }
  function routeTo(v, slot) {
    const [cx, cy] = lotPose(v), { x0, y0, x1, y1 } = LY.ring, b = LY.bays[slot], ry = LY.roadY, [px, py] = parkPose(v, slot), d = v.d;
    const pts = [[cx, cy], [d === 1 ? x1 : d === 3 ? x0 : cx, d === 0 ? y0 : d === 2 ? y1 : cy]];
    if (!LY.land) {
      if (d === 1) pts.push([x1, y0]); else if (d === 3) pts.push([x0, y0]);
      else if (d === 2) { const sx = (cx - x0) + Math.abs(b.x - x0) <= (x1 - cx) + Math.abs(x1 - b.x) ? x0 : x1; pts.push([sx, y1], [sx, y0]); }
    } else {
      if (d === 0) pts.push([x1, y0], [x1, y1]); else if (d === 1) pts.push([x1, y1]); else if (d === 3) pts.push([x0, y1]);
    }
    pts.push([b.x, ry], [px, py]);
    return mkPath(pts);
  }

  /* ================= the visual timeline =================
     The rules run instantly on a tap; what you see follows a little later: a bus drives to its bay, passengers walk in
     one after the other (in queue order), a full bus reverses out and drives off, and the next bus waits until its bay
     is clear. Each vehicle has a visual record; scheduled callbacks move things from one phase to the next. */
  let VIS = [], sched = [], walkers = [], FX = [], bayFree = [], parkedAt = [], lastBoard = [], chan = 0, doneAt = 0, qFront = 0, qSm = 0, depVis = 0, lbOpenAt = Infinity, xShowAt = -1, endT = 0;
  let raf = 0, frames = [], tapAt = 0, tapLat = [], lastT = 0;
  let schedSorted = true;
  const at = (t, fn) => { if (!Number.isFinite(t)) t = now(); sched.push([t, fn]); schedSorted = false; doneAt = Math.max(doneAt, t); };   // a bad time must never block the timeline
  function syncVisual() {
    if (!S) return;
    const t = now(); sched = []; walkers = []; doneAt = t; chan = t; endT = 0;
    bayFree = S.bays.map(() => 0); parkedAt = []; lastBoard = [];
    VIS = S.V.map(v => ({ m: S.gone[v.id] ? 'off' : 'lot', revAt: 0 }));
    S.bays.forEach((b, i) => { if (b) { VIS[b.v] = { m: 'bay', slot: i, seats: b.n, revAt: 0 }; parkedAt[b.v] = t; lastBoard[b.v] = t; } });   // after undo/resume: already parked, so boarding can be timed
    qFront = qSm = S.qi; depVis = S.dep; lbOpenAt = S.lb && S.dep >= S.lb ? 0 : Infinity; xShowAt = S.extra || S.bays[S.bays.length - 1] ? 0 : -1;
    needFull = true; hud(); requestDraw();
  }
  function scheduleEvents(ev, t0, crane) {
    for (const e of ev) {
      const v = S.V[e.v];
      if (e.k === 'park') {
        const R = VIS[e.v], from = R.m === 'lot' ? lotPose(v) : lotPose(v);
        if (e.crane) {
          const to = parkPose(v, e.slot), dur = 1.25, ts = Math.max(t0, bayFree[e.slot] - .9);
          VIS[e.v] = { m: 'crane', from, to, t0: ts, dur, slot: e.slot, revAt: 0 };
          parkedAt[e.v] = ts + dur; at(ts + .02, () => sfx('bhCrane'));
        } else {
          const P = routeTo(v, e.slot), [, py] = parkPose(v, e.slot), sw = Math.max(0, P.len - (LY.roadY - py) - 1.5);
          const Dfull = .45 + P.len / SPEED, tAtWait = t0 + Dfull * (sw / P.len) * .95;
          let trip;
          if (bayFree[e.slot] <= tAtWait) trip = { m: 'trip', P, t0, one: Dfull, slot: e.slot };
          else { const D1 = .35 + sw / SPEED, t2 = Math.max(t0 + D1, bayFree[e.slot]), D2 = .45 + (P.len - sw) / (SPEED * .7); trip = { m: 'trip', P, t0, sw, D1, t2, D2, slot: e.slot }; }
          trip.revAt = 0; VIS[e.v] = trip;
          parkedAt[e.v] = trip.one ? t0 + trip.one : trip.t2 + trip.D2;
          puff(from, v);
        }
        const tp = parkedAt[e.v]; doneAt = Math.max(doneAt, tp);
        at(tp, () => { VIS[e.v] = { m: 'bay', slot: e.slot, seats: 0, revAt: 0, pulse: now() }; sfx('bhPark'); });
        lastBoard[e.v] = tp;
      } else if (e.k === 'board') {
        const ts = Math.max(chan, parkedAt[e.v] + .08), slot = e.slot, p = e.p, cap = v.cap, n = e.n, dist = Math.abs(LY.bays[slot].x - LY.queue.front[0]) + 1;
        const dur = .3 + dist * .045;
        chan = ts + .11;
        at(ts, () => { qFront = Math.max(qFront, p + 1); walkers.push({ p, col: S.q[p], vr: vari(p), slot, v: e.v, t0: now(), dur }); hud(); });
        at(ts + dur, () => { const R = VIS[e.v]; if (R && R.m === 'bay') { R.seats = Math.max(R.seats, n); R.pulse = now(); } sfx('bhSeat' + Math.min(6, 1 + Math.floor((n - 1) / cap * 6))); });
        lastBoard[e.v] = ts + dur;
      } else if (e.k === 'dep') {
        const ts = lastBoard[e.v] + .28, slot = e.slot, b = LY.bays[slot], [px, py] = parkPose(v, slot), ry = LY.roadY;
        const back = mkPath([[px, py], [b.x, ry], [b.x - 1.7, ry]], .9), fwd = mkPath([[b.x - 1.7, ry], [LY.xEdge + 2.5, ry]]);
        const db = .5 + back.len / (SPEED * .45), df = .4 + fwd.len / (SPEED * 1.1);
        bayFree[slot] = ts + db * .8;
        at(ts, () => { VIS[e.v] = { m: 'leave', back, fwd, t0: now(), db, df, slot, revAt: 0 }; depVis++; sfx('bhFull'); hud(); });
        at(ts + db + .1 + df, () => { if (VIS[e.v] && VIS[e.v].m === 'leave') VIS[e.v].m = 'off'; });
      } else if (e.k === 'lbopen') {
        at(Math.max(chan, doneAt - 1), () => { lbOpenAt = now(); sfx('bhOpen'); });
      }
    }
  }
  const vari = p => ((p * 2654435761) >>> 0) % 97;
  function revealCheck(delay = .35) {
    const g = occGrid(S), t = now();
    for (const v of S.V) if (v.hid && !G.rev[v.id] && !S.gone[v.id] && pathOf(S, v.id, g).free) {
      G.rev[v.id] = 1; const R = VIS[v.id]; R.revAt = t + delay;
      at(t + delay, () => { const [x, y] = lotPose(v); sparkle(x, y, PAL[v.c].b, 8); sfx('bhReveal'); if (VIS[v.id]) VIS[v.id].pop = now(); });
    }
  }

  /* ================= drawing ================= */
  function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
  function busy(t) {
    if (sched.length || walkers.length || t < doneAt + .05 || Math.abs(qSm - qFront) > .002 || (lbOpenAt > 0 && lbOpenAt < Infinity && t < lbOpenAt + .7) || (xShowAt > 0 && t < xShowAt + .6)) return true;
    for (const R of VIS) if (R.m === 'trip' || R.m === 'leave' || R.m === 'crane' || (R.bump && t < R.bump.end) || (R.shake && t < R.shake.t0 + R.shake.dur) || (R.pulse && t < R.pulse + .3) || (R.pop && t < R.pop + .45)) return true;
    return false;
  }
  function frame(ts) {
    raf = 0; frames.push(ts); if (frames.length > 900) frames.splice(0, 450);
    if (current !== 'bh' || !S || !LY) return;
    const t = now(), dt = Math.min(.1, Math.max(0, t - (lastT || t))); lastT = t;
    if (sched.length) { if (!schedSorted) { sched.sort((a, b) => a[0] - b[0]); schedSorted = true; } while (sched.length && sched[0][0] <= t) sched.shift()[1](); }
    qSm += (qFront - qSm) * (1 - Math.exp(-dt * 12)); if (Math.abs(qFront - qSm) < .004) qSm = qFront;
    draw(t);
    if (tapAt) { tapLat.push(performance.now() - tapAt); if (tapLat.length > 80) tapLat.shift(); tapAt = 0; }
    if (busy(t)) requestDraw(); else lastT = 0;
  }
  function setW(x, y, rot = 0, sc = 1) {                       // world -> device transform at (x, y)
    const cs = Math.cos(rot) * sc * K, sn = Math.sin(rot) * sc * K;
    ctx.setTransform(cs, sn, -sn, cs, (LY.ox + x * LY.c) * dpr, (LY.oy + y * LY.c) * dpr);
  }
  function poseOf(id, t) {                                       // [x, y, rot (sprite), scale, z]
    const v = S.V[id], R = VIS[id];
    if (R.m === 'lot') {
      let [x, y, a] = lotPose(v), sc = 1;
      if (R.bump) {
        const b = R.bump; let o = 0;
        if (t < b.t0 + b.d1) o = b.dist * easeIn((t - b.t0) / b.d1); else if (t < b.end) o = b.dist * (1 - easeOut((t - b.t0 - b.d1) / (b.end - b.t0 - b.d1)));
        x += DIRS[v.d][0] * o; y += DIRS[v.d][1] * o;
      }
      if (R.shake && t < R.shake.t0 + R.shake.dur) { const u = (t - R.shake.t0) / R.shake.dur, o = Math.sin(u * Math.PI * 7) * R.shake.amp * (1 - u); x += -DIRS[v.d][1] * o; y += DIRS[v.d][0] * o; }
      if (R.pop && t < R.pop + .45) sc = 1 + .12 * Math.sin((t - R.pop) / .45 * Math.PI);
      return [x, y, a, sc, 0];
    }
    if (R.m === 'trip') {
      let s;
      if (R.one) s = R.P.len * trap((t - R.t0) / R.one, .22, .32);
      else if (t < R.t0 + R.D1) s = R.sw * trap((t - R.t0) / R.D1, .3, .4);
      else if (t < R.t2) s = R.sw; else s = R.sw + (R.P.len - R.sw) * trap((t - R.t2) / R.D2, .3, .45);
      const [x, y, h] = R.P.at(s); return [x, y, h + Math.PI / 2, 1, 2];
    }
    if (R.m === 'crane') {
      const u = Math.max(0, Math.min(1, (t - R.t0) / R.dur)), m = Math.max(0, Math.min(1, (u - .22) / .6)), e = m < .5 ? 2 * m * m : 1 - Math.pow(-2 * m + 2, 2) / 2;
      let a0 = R.from[2], a1 = R.to[2]; while (a0 - a1 > Math.PI) a0 -= Math.PI * 2; while (a1 - a0 > Math.PI) a0 += Math.PI * 2;
      const lift = u < .22 ? u / .22 : u > .85 ? (1 - u) / .15 : 1;
      return [R.from[0] + (R.to[0] - R.from[0]) * e, R.from[1] + (R.to[1] - R.from[1]) * e - lift * .25, a0 + (a1 - a0) * e, 1 + .18 * lift, 3];
    }
    if (R.m === 'bay') { const [x, y] = parkPose(v, R.slot); const sc = R.pulse && t < R.pulse + .3 ? 1 + .04 * Math.sin((t - R.pulse) / .3 * Math.PI) : 1; return [x, y, 0, sc, 1]; }
    if (R.m === 'leave') {
      const tt = t - R.t0;
      if (tt < R.db) { const [x, y, h] = R.back.at(R.back.len * trap(tt / R.db, .35, .4)); return [x, y, h + Math.PI * 1.5, 1, 2]; }
      const u = Math.max(0, (tt - R.db - .1) / R.df), [x, y, h] = R.fwd.at(R.fwd.len * Math.pow(Math.min(1, u), 1.7)); return [x, y, h + Math.PI / 2, 1, 2];
    }
    return null;
  }
  /* ---------- what moves: DOM sprites + one effects canvas ----------
     Every vehicle and every waiting passenger is a small canvas element that is painted once (again only when it
     changes: a seat filled, a colour revealed) and moved with a CSS transform, which the phone's compositor does for
     free. The bays' barrier/extra bay live on #bhUnder (redrawn only when they change), puffs, sparks and the crane
     cable on #bhCv with dirty rectangles. Nothing large is repainted while buses drive around. */
  const world = $('#bhWorld');
  let VEL = [], PEL = new Map(), underEls = null, underSig = '', prevItems = new Map(), needFull = true, fxId = 0, KD = 1;
  function clearWorld() { world.textContent = ''; VEL = []; PEL = new Map(); underEls = null; underSig = ''; qBox = null; }
  function setTf(e, tf) { if (e._tf !== tf) { e.style.transform = tf; e._tf = tf; } }
  function vehicleState(id, t) {
    const v = S.V[id], R = VIS[id];
    const hidden = v.hid && (!G.rev[id] || t < R.revAt) && R.m === 'lot';
    const mode = hidden ? 'hid' : (R.m === 'bay' || R.m === 'leave') ? 'bay' : 'lot';
    const seats = mode === 'bay' ? (R.m === 'leave' ? v.cap : (R.seats || 0)) : 0;
    const badge = R.m === 'lot' && v.lock > S.exits ? v.lock - S.exits : 0;
    return { hidden, mode, seats, badge, a0: R.m === 'lot' || R.m === 'trip' || R.m === 'crane' ? lotPose(v)[2] : 0 };
  }
  const px = v => (v * LY.c).toFixed(2) + 'px';
  function renderVehicle(e, id, st) {                            // body image + seat heads + upright badge, as child images
    const v = S.V[id], spr = vehicleSprite(v.len, v.c, st.mode, false, KD);
    e._w = spr.w * LY.c; e._h = spr.h * LY.c; e.style.width = px(spr.w); e.style.height = px(spr.h); e._tf = '';
    let h = `<img src="${urlOf(spr)}" style="left:0;top:0;width:${px(spr.w)};height:${px(spr.h)}">`;
    const cx = spr.w / 2, cy = spr.h / 2;
    if (st.mode === 'bay') {                                     // seats: rings that turn into little heads (pure CSS, no images)
      const sp = seatPos(v.len, v.cap);
      for (let i = 0; i < sp.length; i++) { const [sx, sy] = sp[i], vr = vari(i * 7 + id); h += `<b class="seat${i < st.seats ? ' on' : ''}" style="left:${px(cx + sx - .11)};top:${px(cy + sy - .11)};width:${px(.22)};height:${px(.22)};--sk:${SKIN[vr % SKIN.length]};--hr:${HAIR[(vr >> 2) % HAIR.length]}"></b>`; }
    }
    const rot = st.a0 ? `transform:rotate(${(-st.a0).toFixed(4)}rad)` : '';
    if (st.hidden || opt.cb) { const bu = badgeUrl(st.hidden ? 'hid' : 'cb', v.c, KD), sy = badgeY(v.len, st.mode); h += `<img src="${bu.url}" style="left:${px(cx - bu.w / 2)};top:${px(cy + sy - bu.h / 2)};width:${px(bu.w)};height:${px(bu.h)};${rot}">`; }
    if (st.badge) { const bu = badgeUrl('lock', st.badge, KD); h += `<img src="${bu.url}" style="left:${px(cx - bu.w / 2)};top:${px(cy - bu.h / 2)};width:${px(bu.w)};height:${px(bu.h)};${rot}">`; }
    e.innerHTML = h;
  }
  // only the seats changed: swap those images, keep the rest
  function updateSeats(e, id, st) {                              // only the seats changed
    const seats = e.querySelectorAll('.seat'); for (let i = 0; i < seats.length; i++) { const on = i < st.seats; if (seats[i].classList.contains('on') !== on) seats[i].classList.toggle('on', on); }
  }
  function syncVehicle(id, t) {
    const R = VIS[id]; let e = VEL[id];
    const p = R && R.m !== 'off' ? poseOf(id, t) : null;
    if (!p) { if (e && !e.hidden) e.hidden = true; return; }
    if (!e) { e = VEL[id] = document.createElement('div'); e.className = 'bh-v'; e._sig = ''; world.appendChild(e); }
    const st = vehicleState(id, t), sig = [st.mode, st.seats, st.badge, st.hidden ? 1 : 0, opt.cb ? 1 : 0, st.a0, S.V[id].c, KD].join();
    if (e._sig !== sig) {
      const base = sig.replace(/^(\w+),\d+,/, '$1,');
      if (e._base === base && st.mode === 'bay') updateSeats(e, id, st); else renderVehicle(e, id, st);
      e._sig = sig; e._base = base;
    }
    const [x, y, a, sc, z] = p, X = LY.ox + x * LY.c - e._w / 2, Y = LY.oy + y * LY.c - e._h / 2;
    setTf(e, `translate(${X.toFixed(2)}px,${Y.toFixed(2)}px) rotate(${a.toFixed(4)}rad)${sc !== 1 ? ` scale(${sc.toFixed(3)})` : ''}`);
    const zi = String(10 + z * 10); if (e._z !== zi) { e.style.zIndex = zi; e._z = zi; }
    const mv = R.m === 'trip' || R.m === 'leave' || R.m === 'crane' || !!(R.bump && t < R.bump.end) || !!(R.shake && t < R.shake.t0 + R.shake.dur);
    if (e._mv !== mv) { e.classList.toggle('mv', mv); e._mv = mv; }            // only moving buses get their own layer
    if (e.hidden) e.hidden = false;
  }
  function placePerson(e, x, y, s, al, z) {
    setTf(e, `translate(${(LY.ox + x * LY.c - e._ax).toFixed(2)}px,${(LY.oy + y * LY.c - e._ay).toFixed(2)}px)${s !== 1 ? ` scale(${s.toFixed(3)})` : ''}`);
    const o = al < 1 ? al.toFixed(3) : ''; if (e._o !== o) { e.style.opacity = o; e._o = o; }
    const zi = String(z); if (e._z !== zi) { e.style.zIndex = zi; e._z = zi; }
  }
  /* the waiting queue lives on a small canvas over the platform: redrawn only while it moves up (cheap, it is small);
     a passenger who walks to a bus becomes an image that a CSS transition carries to the door */
  const qcv = $('#bhQ'), qctx = qcv.getContext('2d'); let qBox = null, qSig = '', qTick = 0;
  function fitQueue() {
    const P = LY.plat, x0 = LY.ox + P.x0 * LY.c - 2, y0 = LY.oy + (P.y0 - .15) * LY.c, w = (P.x1 - P.x0) * LY.c + 4, h = (P.y1 - P.y0 + .3) * LY.c;
    qBox = { x0, y0 }; Object.assign(qcv.style, { left: x0 + 'px', top: y0 + 'px', width: w + 'px', height: h + 'px' });
    qcv.width = Math.round(w * dpr); qcv.height = Math.round(h * dpr); qSig = '';
  }
  function syncQueue(t) {
    if (!qBox) fitQueue();
    const Q = LY.queue, n = S.q.length, last = Math.min(n, qFront + Q.cap), moving = Math.abs(qSm - qFront) > .002;
    const sig = [qSm.toFixed(3), qFront, n, opt.cb ? 1 : 0, qcv.width].join();
    // while it shuffles forward the queue is repainted at most every other frame (30 per second is smooth for small figures)
    if (sig !== qSig && (!moving || !(qTick++ & 1) || Math.abs(qSm - qFront) < .05)) {
      qSig = sig; const g = qctx, k = LY.c * dpr; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, qcv.width, qcv.height);
      const W = (x, y, s = 1) => g.setTransform(k * s, 0, 0, k * s, (LY.ox + x * LY.c - qBox.x0) * dpr, (LY.oy + y * LY.c - qBox.y0) * dpr);
      for (let p = last - 1; p >= qFront; p--) {
        const [x, y0] = Q.pos(p - qSm), hop = moving ? Math.abs(Math.sin((p - qSm) * Math.PI)) * .06 : 0, front = p === qFront, s = front ? 1.12 : 1;
        if (front) { W(x, y0); g.fillStyle = 'rgba(255,240,150,.6)'; g.beginPath(); g.ellipse(0, 0, .3, .1, 0, 0, 7); g.fill(); }
        const spr = personSprite(S.q[p], vari(p), opt.cb, KD); W(x, y0 - hop, s); g.drawImage(spr.cv, -spr.ax, -spr.ay, spr.w, spr.h);
      }
      if (n > last) {                                            // more people waiting than fit on the platform
        const [x0, y0] = Q.pos(Q.cap - 1); W(x0 - .5, y0 - .38);
        g.fillStyle = 'rgba(30,40,55,.88)'; rr(g, -.42, -.2, .84, .4, .2); g.fill();
        g.fillStyle = '#fff'; g.font = `800 .26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+' + (n - last), 0, .01);
      }
    }
    const keep = new Set();
    for (const w of walkers) {                                   // one CSS transition from the queue to the bus door
      keep.add(w.p); if (PEL.has(w.p)) continue;
      const spr = personSprite(w.col, w.vr, opt.cb, KD), e = document.createElement('img'), [fx, fy] = Q.front, b = LY.bays[w.slot];
      e.className = 'bh-p'; e.src = urlOf(spr); e._ax = spr.ax * LY.c; e._ay = spr.ay * LY.c;
      Object.assign(e.style, { width: px(spr.w), height: px(spr.h), transformOrigin: `${e._ax}px ${e._ay}px`, zIndex: 900 });
      placePerson(e, fx, fy, 1.12, 1, 900); world.appendChild(e); PEL.set(w.p, e); void e.offsetWidth;
      e.style.transition = `transform ${w.dur.toFixed(2)}s cubic-bezier(.45,0,.4,1), opacity ${(w.dur * .3).toFixed(2)}s linear ${(w.dur * .7).toFixed(2)}s`;
      placePerson(e, b.x + .26, b.top + .42, .55, .01, 900);
    }
    for (const [p, e] of PEL) if (!keep.has(p)) { e.remove(); PEL.delete(p); }
  }
  function drawUnder(t) {                                        // the extra bay (booster) and the barrier bay, as DOM elements
    const nb = S.bays.length, xb = LY.bays[nb - 1], bw = LY.bayW;
    const xOn = xShowAt >= 0 && (S.extra || S.bays[nb - 1] || VIS.some(R => R.slot === nb - 1 && (R.m === 'trip' || R.m === 'bay' || R.m === 'crane' || (R.m === 'leave' && t < R.t0 + R.db))));
    const open = S.lb && t >= lbOpenAt, left = S.lb ? Math.max(0, S.lb - depVis) : 0;
    const sig = [xOn ? 1 : 0, S.lb ? 1 : 0, open ? 1 : 0, left, LY.c, LY.ox, LY.oy].join(); if (sig === underSig) return; underSig = sig;
    if (!underEls) { underEls = { x: document.createElement('div'), boom: document.createElement('div'), cnt: document.createElement('div') }; underEls.x.className = 'bh-xbay'; underEls.x.innerHTML = '<b>+</b>'; underEls.boom.className = 'bh-boom'; underEls.cnt.className = 'bh-lbc'; for (const e of Object.values(underEls)) world.appendChild(e); }
    const U = underEls, P = (x, y) => `translate(${(LY.ox + x * LY.c).toFixed(1)}px,${(LY.oy + y * LY.c).toFixed(1)}px)`;
    U.x.hidden = !xOn;
    if (xOn) { Object.assign(U.x.style, { width: px(bw), height: px(xb.mouth - xb.top + .05), fontSize: px(.42) }); U.x.style.transform = P(xb.x - bw / 2, xb.top); }
    U.boom.hidden = U.cnt.hidden = !S.lb;
    if (S.lb) {
      const b2 = LY.bays[S.B];
      Object.assign(U.boom.style, { width: px(bw - .14), height: px(.13) }); U.boom.style.transform = P(b2.x - bw / 2 + .08, b2.mouth - .19) + (open ? ' rotate(-84deg)' : '');
      U.cnt.classList.toggle('open', !!open); U.cnt.innerHTML = `<b>${left || '✓'}</b><small>bussen</small>`;
      Object.assign(U.cnt.style, { width: px(.95), height: px(.95), fontSize: px(.4) }); U.cnt.style.transform = P(b2.x - .475, b2.top + (b2.mouth - b2.top) * .45 - .475);
    }
  }
  function syncCrane(t) {                                       // the crane's cable and hook
    let on = false;
    for (let id = 0; id < S.n; id++) {
      const R = VIS[id]; if (!R || R.m !== 'crane') continue;
      const [x, y] = poseOf(id, t); on = true;
      if (!cableEl) { cableEl = document.createElement('div'); cableEl.className = 'bh-cable'; cableEl.innerHTML = '<i></i>'; world.appendChild(cableEl); }
      cableEl.hidden = false; setTf(cableEl, `translate(${(LY.ox + x * LY.c).toFixed(1)}px,${(LY.oy + y * LY.c - LY.ch).toFixed(1)}px)`);
    }
    if (!on && cableEl) cableEl.hidden = true;
  }
  let drawMs = 0, drawn = 0, cableEl = null;
  function draw(t) {
    const t0 = performance.now();
    for (let i = walkers.length - 1; i >= 0; i--) if (t >= walkers[i].t0 + walkers[i].dur) walkers.splice(i, 1);
    if (needFull) { clearWorld(); cableEl = null; KD = LY.c * dprB; needFull = false; }
    for (let id = 0; id < S.n; id++) syncVehicle(id, t);
    syncQueue(t); drawUnder(t); syncCrane(t);
    drawn = world.childElementCount; drawMs = performance.now() - t0;
  }

  /* ---------- effects: little CSS-animated elements, the compositor plays them ---------- */
  let fxUntil = 0;
  function fxEl(cls, x, y, life, css = '', html = '') {
    const e = document.createElement('i'); e.className = 'bh-fx ' + cls; if (html) e.innerHTML = html;
    e.style.cssText = `left:${(LY.ox + x * LY.c).toFixed(1)}px;top:${(LY.oy + y * LY.c).toFixed(1)}px;animation-duration:${life}s;${css}`;
    world.appendChild(e); setTimeout(() => e.remove(), life * 1000 + 150); fxUntil = Math.max(fxUntil, now() + life);
  }
  function puff(pose, v) {
    const [x, y, a] = pose, bx = x - Math.sin(a) * (vLen(v.len) / 2), by = y + Math.cos(a) * (vLen(v.len) / 2), r = LY.c * .32;
    for (let i = 0; i < 3; i++) fxEl('puff', bx + (Math.random() - .5) * .2, by + (Math.random() - .5) * .2, .55, `width:${r.toFixed(1)}px;height:${r.toFixed(1)}px;animation-delay:${(i * .03).toFixed(2)}s;--dx:${((Math.random() - .5) * LY.c * .4).toFixed(1)}px;--dy:${((Math.random() - .5) * LY.c * .4).toFixed(1)}px`);
  }
  function sparkle(x, y, col, n = 12) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = (.5 + Math.random() * .9) * LY.c, sz = (.2 + Math.random() * .14) * LY.c;
      fxEl('spark', x, y, .5 + Math.random() * .3, `width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;color:${i % 3 ? col : '#fff6c0'};--dx:${(Math.cos(a) * s).toFixed(1)}px;--dy:${(Math.sin(a) * s).toFixed(1)}px`); }
  }
  function bang(x, y) { const z = LY.c * 1; fxEl('bang', x, y - .1, .55, `width:${z.toFixed(1)}px;height:${z.toFixed(1)}px;font-size:${(z * .42).toFixed(1)}px`, '!'); }
  function confetti() {                                          // CSS confetti: moved by the compositor, the canvas stays still
    const box = $('#bhConf'), cols = PAL.map(p => p.b); box.innerHTML = '';
    for (let i = 0; i < 70; i++) {
      const e = document.createElement('i'), w = 6 + Math.random() * 6;
      e.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * .55).toFixed(0)}px;background:${cols[i % cols.length]};animation-duration:${(2.2 + Math.random() * 1.4).toFixed(2)}s;animation-delay:${(Math.random() * .6).toFixed(2)}s;--dx:${((Math.random() - .5) * 80).toFixed(0)}px;--r:${(360 + Math.random() * 720).toFixed(0)}deg`;
      box.appendChild(e);
    }
    clearTimeout(confT); confT = setTimeout(() => { box.innerHTML = ''; }, 4500);
  }
  let confT = 0;


  /* ================= game ================= */
  function snapshot() { return { gone: S.gone.slice(), bays: S.bays.map(b => b && Object.assign({}, b)), qi: S.qi, dep: S.dep, exits: S.exits, seq: S.seq, extra: S.extra, cols: S.V.map(v => v.c), rev: G.rev.slice(), xu: G.xUses }; }
  function restore(sn) {
    S.gone = sn.gone.slice(); S.bays = sn.bays.map(b => b && Object.assign({}, b)); S.qi = sn.qi; S.dep = sn.dep; S.exits = sn.exits; S.seq = sn.seq; S.extra = sn.extra;
    S.V = S.V.map((v, i) => Object.assign({}, v, { c: sn.cols[i] }));
    G.rev = sn.rev.slice();
    if ((G.xUses || 0) > (sn.xu || 0) && !S.bays[S.bays.length - 1]) S.extra = true;      // a bought extra bay stays
    resolve(S);
  }
  function startLevel(id) {
    closeModals(); setCrane(false); $('#bhConf').innerHTML = '';
    L = levelOf(id); if (!L) return;
    S = newState(L); G = { id, moves: 0, bumps: 0, boosts: 0, xUses: 0, rev: S.V.map(() => 0), undo: [], over: false, lostShown: false };
    stats.played++; saveStats();
    LY = null; fit(true); syncVisual(); revealCheck(0); hud(); renderTools(); saveNow();
    scr.classList.remove('intro'); void scr.offsetWidth; scr.classList.add('intro');
    showTip(); handHint(); prewarm();
  }
  // draw (and encode) every sprite this level will need in small slices while nothing much happens,
  // so the first bus to park or the first new passenger in line costs nothing during the animation
  let warmT = 0, warmLeft = 0;
  function prewarm() {
    clearTimeout(warmT); if (!LY) return;
    const k = LY.c * dprB, jobs = [], seen = new Set(), add = (key, f) => { if (!seen.has(key)) { seen.add(key); jobs.push(f); } };
    for (const v of S.V) { for (const m of ['lot', 'bay', ...(v.hid ? ['hid'] : [])]) add('v' + v.len + m + v.c, () => urlOf(vehicleSprite(v.len, v.c, m, false, k))); }
    S.q.forEach((c, p) => add('p' + c + '|' + vari(p), () => urlOf(personSprite(c, vari(p), opt.cb, k))));
    warmLeft = jobs.length;
    const step = () => { const t0 = performance.now(); while (jobs.length && performance.now() - t0 < 5) jobs.shift()(); warmLeft = jobs.length; if (jobs.length) warmT = setTimeout(step, 24); };
    warmT = setTimeout(step, 60);
  }
  function showTip() {
    const el = $('#bhTip'); el.classList.remove('show');
    if (!L.tip || !TIPS[L.tip]) return;
    el.innerHTML = `<b>💡</b><span>${esc(TIPS[L.tip])}</span>`;
    if (LY) { const b0 = LY.bays[0]; el.style.top = Math.max(8, LY.oy + (b0.top + .35) * LY.c) + 'px'; }      // over the (still empty) bays
    setTimeout(() => el.classList.add('show'), 350);
  }
  const hideTip = () => $('#bhTip').classList.remove('show');
  function handHint() {
    const h = $('#bhHand'); h.classList.remove('show');
    if (!(G.id === 1 || G.id === 2) || G.moves) return;
    const id = L.s[0], c = center(id), r = stage.getBoundingClientRect();
    h.style.left = (c.x - r.left) + 'px'; h.style.top = (c.y - r.top) + 'px'; h.classList.add('show');
  }
  const hideHand = () => $('#bhHand').classList.remove('show');
  function hud() {
    if (!S || !G) return;
    $('#bhTitle').textContent = typeof G.id === 'number' ? 'Level ' + G.id : 'Dagrit';
    $('#bhLeft').textContent = Math.max(0, S.q.length - Math.min(qFront, S.q.length));
  }
  function tapVehicle(id) {
    if (!S || !G || G.over || G.preview || S.lost || S.won || id < 0 || S.gone[id]) return;
    tapAt = tapAt || performance.now(); hideHand(); hideTip();
    if (craneMode) { doCrane(id); return; }
    const sn = snapshot(), ev = [], t = now(), v = S.V[id];
    setPref(t);
    const r = tap(S, id, ev); S.pref = null;
    G.moves++;
    if (r.k === 'exit') {
      G.undo.push(sn); if (G.undo.length > 40) G.undo.shift();
      sfx('bhGo'); scheduleEvents(ev, t); revealCheck(); afterMove();
    } else if (r.k === 'bump') {
      G.bumps++; sfx('bhTap');
      const dist = r.steps + .1, d1 = .1 + r.steps * .045, R = VIS[id];
      R.bump = { t0: t, d1, dist, end: t + d1 + .32 };
      const [x, y] = lotPose(v), [fx, fy] = frontOf(v), cx = fx + .5 + DIRS[v.d][0] * (r.steps + .5), cy = fy + .5 + DIRS[v.d][1] * (r.steps + .5);
      at(t + d1, () => { bang(cx, cy); sfx('bhBump'); vibrate(18); if (r.hit >= 0 && VIS[r.hit] && VIS[r.hit].m === 'lot') VIS[r.hit].shake = { t0: now(), dur: .3, amp: .05 }; });
      void x; void y;
    } else if (r.k === 'locked') {
      sfx('bhLock'); vibrate(12); VIS[id].shake = { t0: t, dur: .4, amp: .07 };
      toast(r.left === 1 ? 'Deze bus mag pas weg als er eerst nog 1 andere bus is weggereden.' : `Deze bus mag pas weg als er eerst nog ${r.left} andere bussen zijn weggereden.`);
    }
    save(); requestDraw();
  }
  function afterMove() {
    hud(); renderTools();
    if (S.won) win();
    else if (S.lost) { const t0 = doneAt; at(t0 + .35, () => { if (S && S.lost && current === 'bh') openLose(); }); }
  }
  function doCrane(id) {
    setCrane(false);
    if (freeSlot(S) < 0) { toast('Er is geen vrij vak voor de kraan.'); return; }
    if (!ensure('crane')) return;
    const sn = snapshot(), ev = [], t = now();
    setPref(t); const r = tap(S, id, ev, true); S.pref = null; if (r.k !== 'exit') return;
    G.undo.push(sn); consume('crane');
    scheduleEvents(ev, t); revealCheck(); afterMove(); save(); requestDraw();
  }
  function setPref(t) {                                         // prefer ordinary bays that are (or soonest will be) visibly empty
    const ids = [...Array(S.B).keys()];
    S.pref = ids.sort((a, b) => Math.max(t, bayFree[a] || 0) - Math.max(t, bayFree[b] || 0) || a - b);
  }
  function setCrane(on) { craneMode = !!on; scr.classList.toggle('crane', craneMode); renderTools(); }
  function ensure(k) {
    if (stats.inv[k] > 0) return true;
    const p = BOOST[k].p;
    if (stats.coins >= p) { stats.coins -= p; stats.inv[k]++; saveStats(); toast(`${BOOST[k].n} gekocht voor 🪙 ${p}`); renderTools(); return true; }
    toast(`Je hebt geen ${BOOST[k].n} meer. Haal levels om munten 🪙 te verdienen (${BOOST[k].n} kost ${p}).`, 3200); return false;
  }
  function consume(k) { stats.inv[k]--; stats.boosts++; G.boosts++; saveStats(); renderTools(); save(); }
  function useBoost(k) {
    if (!S || !G || G.over || G.preview) return false;
    hideTip(); hideHand();
    if (k === 'crane') {
      if (craneMode) { setCrane(false); return false; }
      if (S.lost) { toast('Alle vakken zijn bezet. Gebruik Terug of een extra vak.'); return false; }
      if (freeSlot(S) < 0) { toast('Er is geen vrij vak voor de kraan.'); return false; }
      if (stats.inv.crane <= 0 && stats.coins < BOOST.crane.p) { ensure('crane'); return false; }
      setCrane(true); toast('Tik op de bus die de kraan moet optillen.'); return true;
    }
    setCrane(false);
    if (k === 'undo') {
      if (!G.undo.length) { toast('Er is nog niets om terug te zetten.'); return false; }
      if (!ensure('undo')) return false;
      restore(G.undo.pop()); consume('undo'); G.over = false; sfx('bhUndo'); closeModals(); syncVisual(); revealCheck(0);
      for (const R of VIS) if (R.m === 'lot' || R.m === 'bay') R.pop = now();
      requestDraw(); save(); return true;
    }
    if (k === 'bay') {
      if (S.extra || S.bays[S.bays.length - 1]) { toast('Het extra vak is al open.'); return false; }
      if (!ensure('bay')) return false;
      S.extra = true; G.xUses = (G.xUses || 0) + 1; resolve(S); consume('bay'); xShowAt = now(); closeModals(); sfx('bhBoost');
      const b = LY.bays[S.bays.length - 1]; sparkle(b.x, (b.top + b.mouth) / 2, '#ffd34d', 18); requestDraw(); save(); return true;
    }
    if (k === 'shuf') {
      if (S.lost) { toast('Alle vakken zijn bezet: schudden helpt nu niet. Gebruik Terug of een extra vak.', 3000); return false; }
      const res = shuffleColours(); if (!res) { toast('Schudden lukt nu niet: er is geen andere verdeling die op te lossen is. Probeer Terug.', 3200); return false; }
      if (!ensure('shuf')) return false;
      G.undo.push(snapshot()); S.V = res; consume('shuf'); sfx('bhShuffle');
      for (const v of S.V) if (!S.gone[v.id]) { VIS[v.id].pop = now() + Math.random() * .15; const [x, y] = lotPose(v); if (!v.hid || G.rev[v.id]) sparkle(x, y, PAL[v.c].b, 5); }
      requestDraw(); save(); return true;
    }
    return false;
  }
  // new colours for the buses still on the lot (same size buses swap colours, so every passenger still has a seat),
  // only accepted when the exact solver finds a way to finish from there
  function shuffleColours() {
    const t0 = performance.now(), ids = S.V.filter(v => !S.gone[v.id]).map(v => v.id);
    const groups = {}; for (const id of ids) (groups[S.V[id].len] = groups[S.V[id].len] || []).push(id);
    for (let k = 0; k < 40 && performance.now() - t0 < 600; k++) {
      const nc = S.V.map(v => v.c);
      for (const g of Object.values(groups)) { const cs = g.map(id => nc[id]); for (let i = cs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cs[i], cs[j]] = [cs[j], cs[i]]; } g.forEach((id, i) => { nc[id] = cs[i]; }); }
      if (ids.every(id => nc[id] === S.V[id].c)) continue;
      const V2 = S.V.map((v, i) => Object.assign({}, v, { c: nc[i] })), T = clone(S); T.V = V2;
      if (solve(T, 6000)) return V2;
    }
    return null;
  }
  function starsFor() { return Math.max(1, 3 - (G.boosts ? 1 : 0) - (G.bumps >= 3 ? 1 : 0)); }
  function win() {
    G.over = true; setCrane(false); store.del('bh.save');
    const st = starsFor(), id = G.id; let coins = 0;
    stats.won++;
    if (typeof id === 'number') {
      const prev = stats.stars[id] || 0;
      coins = prev ? (st > prev ? (st - prev) * 5 : 2) : 10 + st * 5;
      if (st > prev) stats.stars[id] = st;
      if (st === 3 && prev < 3) stats.three = (stats.three || 0) + 1;
    } else { const d = String(id).slice(1); if (!stats.daily[d]) { stats.dailyWon++; coins = 25; } else coins = 3; stats.daily[d] = Math.max(stats.daily[d] || 0, st); const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()]; }
    stats.coins += coins; saveStats();
    G.res = { st, coins };
    const game = G, t = Math.max(doneAt, now());
    at(t + .1, () => { if (G !== game || current !== 'bh') return; confetti(); sfx('bhWin'); vibrate(30); });
    at(t + 1.5, () => { if (G !== game || current !== 'bh') return; openEnd(); });
    requestDraw();
  }
  function openEnd() {
    const { st, coins } = G.res, daily = typeof G.id !== 'number', nx = daily ? 0 : G.id + 1;
    $('#bhEndStars').innerHTML = [1, 2, 3].map(k => `<span class="${k <= st ? 'on' : ''}" style="animation-delay:${.15 + k * .2}s">★</span>`).join('');
    $('#bhEndTitle').textContent = daily ? 'Dagrit gehaald!' : G.id === NL ? 'Alle levels gehaald!' : 'Iedereen is onderweg!';
    $('#bhEndText').innerHTML = `${S.n} ${S.n === 1 ? 'bus' : 'bussen'} · ${S.q.length} passagiers<br>Botsingen: <b>${G.bumps}</b> · Hulpjes: <b>${G.boosts}</b><br><span class="bh-coin">🪙 +${coins}</span>`
      + (st < 3 ? `<br><small>${G.boosts ? 'Zonder hulpjes' : 'Met minder dan 3 botsingen'} krijg je meer sterren.</small>` : '');
    $('#bhEndNext').hidden = daily || nx > NL; $('#bhEndNext').textContent = 'Volgende ▶';
    openModal('bhEndModal');
  }
  function openLose() {
    if (!S || !S.lost) return;
    if (!G.lostShown) { G.lostShown = true; stats.lost++; saveStats(); sfx('bhLose'); vibrate(40); }
    const lab = k => stats.inv[k] > 0 ? `${BOOST[k].i} ${BOOST[k].n} (${stats.inv[k]})` : `${BOOST[k].i} ${BOOST[k].n} · 🪙${BOOST[k].p}`;
    $('#bhLoseUndo').innerHTML = lab('undo'); $('#bhLoseBay').innerHTML = lab('bay');
    $('#bhLoseUndo').disabled = !G.undo.length || (stats.inv.undo <= 0 && stats.coins < BOOST.undo.p);
    $('#bhLoseBay').disabled = stats.inv.bay <= 0 && stats.coins < BOOST.bay.p;
    $('#bhLoseCoins').textContent = stats.coins;
    openModal('bhLoseEndModal');
  }
  let toastT = 0;
  function toast(t, ms = 2400) { const el = $('#bhToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  function renderTools() {
    document.querySelectorAll('#bhTools button[data-b]').forEach(b => {
      const k = b.dataset.b, n = stats.inv[k];
      b.querySelector('i').textContent = n > 0 ? n : '🪙' + BOOST[k].p; b.querySelector('i').classList.toggle('buy', n <= 0);
      b.classList.toggle('on', k === 'crane' && craneMode);
    });
    $('#bhCoins').textContent = stats.coins;
  }

  /* ================= save / resume ================= */
  let saveTm = 0;
  function saveNow() { clearTimeout(saveTm); saveTm = 0; if (!S || !G || G.over || G.preview) return; store.set('bh.save', { G: Object.assign({}, G, { undo: G.undo.slice(-15) }), C: snapshot() }); }
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 300); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'bh') saveNow(); });
  function restoreSaved(sv) {
    L = levelOf(sv.G.id); if (!L) throw new Error('level');
    S = newState(L); G = Object.assign({ rev: S.V.map(() => 0), undo: [] }, sv.G); restore(sv.C);
  }
  function preview() {                                           // the next level behind the start dialog
    const n = unlocked(); L = LV[n - 1]; S = newState(L); G = { id: n, preview: true, moves: 0, bumps: 0, boosts: 0, rev: S.V.map(() => 0), undo: [], over: false };
    LY = null; fit(true); syncVisual();
  }

  /* ================= start dialog ================= */
  function renderStart() {
    const un = unlocked();
    $('#bhLevels').innerHTML = LV.map((_, i) => {
      const n = i + 1, st = stats.stars[n] || 0, lock = n > un;
      return `<button data-n="${n}" class="${lock ? 'lock' : ''}${n === un && !st ? ' next' : ''}"${lock ? ' aria-disabled="true"' : ''}>${lock ? '<b>🔒</b>' : `<b>${n}</b><span>${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</span>`}</button>`;
    }).join('');
    const d = dayStr(), dn = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }), done = stats.daily[d];
    const dlock = !dailyOpen();
    $('#bhDaily').innerHTML = `<span class="bh-dico">📅</span><span class="bh-dtx"><b>Dagrit</b><small>${dlock ? 'Elke dag een nieuwe puzzel, vanaf level ' + DAILY_FROM : esc(dn) + ' · elke dag een nieuwe puzzel'}</small></span><em>${dlock ? '🔒' : done ? '✓ ' + '★'.repeat(done) : 'Speel ▶'}</em>`;
    $('#bhDaily').classList.toggle('done', !!done); $('#bhDaily').classList.toggle('lock', dlock);
    $('#bhShop').innerHTML = `<div class="bh-purse">🪙 <b id="bhCoins2">${stats.coins}</b><small>munten</small></div>` + Object.entries(BOOST).map(([k, b]) => `<button data-k="${k}"><b>${b.i}</b><span>${b.n}</span><small>× ${stats.inv[k]}</small><em>+1 · 🪙${b.p}</em></button>`).join('');
    $('#bhOptList').innerHTML = [['cb', 'Kleurenblind-hulp', [[true, 'Aan'], [false, 'Uit']]], ['sound', 'Geluidseffecten', [[true, 'Aan'], [false, 'Uit']]], ['music', 'Achtergrondmuziek', [[true, 'Aan'], [false, 'Uit']]]]
      .map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#bhStats').innerHTML = [['Levels', `${Object.keys(stats.stars).length}/${NL}`], ['Sterren', totalStars()], ['Dagritten', stats.dailyWon]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    const live = S && G && !G.over && !G.preview;
    $('#bhResume').hidden = !live;
    $('#bhGo').textContent = live ? 'Verder ▶' : `Level ${un} ▶`;
    $('#bhGo').dataset.n = live ? '' : un;
  }

  /* ================= input ================= */
  let down = null;
  const sp = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function hitVehicle(px, py) {
    if (!LY) return -1;
    const x = (px - LY.ox) / LY.c, y = (py - LY.oy) / LY.c; let best = -1, bd = .45;
    for (const v of S.V) {
      if (S.gone[v.id]) continue;
      const vert = v.d % 2 === 0, x1 = v.x + (vert ? 1 : v.len), y1 = v.y + (vert ? v.len : 1);
      const d = Math.hypot(Math.max(v.x - x, 0, x - x1), Math.max(v.y - y, 0, y - y1)); if (d < bd) { bd = d; best = v.id; }
    }
    return best;
  }
  cv.addEventListener('pointerdown', e => { if (!S) return; e.preventDefault(); down = Object.assign(sp(e), { id: e.pointerId, t: e.timeStamp }); });
  cv.addEventListener('pointerup', e => {
    if (!down || down.id !== e.pointerId) return;
    const p = sp(e), d = Math.hypot(p.x - down.x, p.y - down.y); down = null;
    if (d > 14) return;
    tapAt = performance.now(); const id = hitVehicle(p.x, p.y);
    if (id >= 0) tapVehicle(id); else { tapAt = 0; if (craneMode) { setCrane(false); toast('Kraan geannuleerd.'); } }
  });
  cv.addEventListener('pointercancel', () => { down = null; });
  $('#bhTools').addEventListener('click', e => { const b = e.target.closest('button[data-b]'); if (b) useBoost(b.dataset.b); });
  $('#bhTip').addEventListener('click', hideTip);
  $('#bhLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (!b) return; if (b.classList.contains('lock')) { menuToast('Haal eerst de levels ervoor.'); return; } startLevel(+b.dataset.n); });
  $('#bhDaily').addEventListener('click', () => { if (!dailyOpen()) { menuToast(`De dagrit gaat open als je level ${DAILY_FROM - 1} hebt gehaald.`); return; } startLevel('d' + dayStr()); });
  $('#bhShop').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k, p = BOOST[k].p;
    if (stats.coins < p) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); return; }
    stats.coins -= p; stats.inv[k]++; saveStats(); sfx('bhBoost'); renderStart(); renderTools();
  });
  $('#bhOptList').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); renderStart(); needFull = true; requestDraw(); Sfx.refresh && Sfx.refresh();
  });
  $('#bhGo').addEventListener('click', () => { const n = $('#bhGo').dataset.n; if (n) startLevel(+n); else closeModals(); });
  $('#bhResume').addEventListener('click', () => closeModals());
  $('#bhStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#bhEndMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#bhEndRetry').addEventListener('click', () => startLevel(G.id));
  $('#bhEndNext').addEventListener('click', () => { if (typeof G.id === 'number' && G.id < NL) startLevel(G.id + 1); });
  $('#bhLoseRetry').addEventListener('click', () => startLevel(G.id));
  $('#bhLoseUndo').addEventListener('click', () => useBoost('undo'));
  $('#bhLoseBay').addEventListener('click', () => useBoost('bay'));
  $('#bhLoseMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#bhBack').addEventListener('click', () => leave());
  $('#bhMenu').addEventListener('click', () => openStart());
  $('#bhRetry').addEventListener('click', async () => {
    if (!S || !G || G.preview) return;
    if (G.moves && !G.over && !S.lost && !(await askConfirm('Opnieuw beginnen?', 'Je begint dit level opnieuw. Gebruikte hulpjes krijg je niet terug.', 'Opnieuw'))) return;
    startLevel(G.id);
  });
  function openStart() { setCrane(false); renderStart(); openModal('bhStartModal'); }
  window.addEventListener('resize', () => { if (current === 'bh') setTimeout(() => { fit(); handHint2(); }, 60); });
  const handHint2 = () => { if ($('#bhHand').classList.contains('show')) handHint(); };
  window.addEventListener('keydown', e => { if (current !== 'bh' || anyModal() || !S) return; if (e.key === 'z' && (e.ctrlKey || e.metaKey)) useBoost('undo'); });

  function enter() {
    show('bh');
    const sv = store.get('bh.save', null);
    if ((!S || !G || G.preview || G.over) && sv && sv.G) { try { restoreSaved(sv); } catch (e) { S = null; store.del('bh.save'); } }
    if (S && G && !G.preview) { LY = null; fit(true); syncVisual(); revealCheck(0); renderTools(); requestAnimationFrame(() => fit()); prewarm(); }
    if (!S || !G || G.over || G.preview) { preview(); renderTools(); openStart(); }
    else if (S.lost) setTimeout(openLose, 250);
    else showTip();
  }
  function leave() { $('#bhConf').innerHTML = ''; saveNow(); setCrane(false); closeModals(); hideTip(); hideHand(); if (G && G.over) { S = null; G = null; } show('menu'); refreshMenu(); }

  /* ================= test hooks ================= */
  function center(id) {                                          // screen position (client px) of a vehicle on the lot
    const v = S.V[id], [x, y] = lotPose(v), r = stage.getBoundingClientRect();
    return { x: r.left + LY.ox + x * LY.c, y: r.top + LY.oy + y * LY.c };
  }
  window.__bh = {
    get S() { return S; }, get G() { return G; }, get LY() { return LY; }, get VIS() { return VIS; }, get walkers() { return walkers.length; }, get craneMode() { return craneMode; },
    LV, DLY, newState, tap, solve, movable, pathOf, occGrid, freeSlot, opt, stats: () => stats, startLevel, useBoost, tapVehicle, center, hitVehicle, fit,
    busy: () => busy(now()), warmLeft: () => warmLeft, doneIn: () => Math.max(0, doneAt - now()), frames: () => frames.slice(), tapLat: () => tapLat.slice(), drawInfo: () => ({ drawMs, drawn }), dayStr, levelOf, snapshot,
    giveCoins(n) { stats.coins += n; saveStats(); renderTools(); },
  };
  return { enter, leave, hasSave: () => !!store.get('bh.save', null) };
