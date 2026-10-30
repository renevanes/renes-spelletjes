  /* ================= core.js: deterministic room logic at 60 steps per second (no DOM, no randomness) =================
     Core.newState(i)              a fresh state for level i (plain JSON: it is saved as it is)
     Core.cmd(L, S, c)             a player command: {t:'tap',x,y,item} | {t:'obj',id,item} | {t:'walk',x,f} | {t:'bark'}
                                   | {t:'comb',a,b} | {t:'pick',id,v} | {t:'cuX'}
     Core.step(L, S)               one step; S.ev holds what happened (for sound and pictures)
     Core.hint(L, S)  Core.stars(S)  Core.sanitize(L, S)  Core.pick(L, S, x, y)  Core.zones(L, S) */
  const CORE_V = 1, MAXINV = 3;
  const Core = (() => {
    const WALK = 4.2 / TPS, CLIMB = 3.4 / TPS, PUSHV = 2.3 / TPS, HOP = 24, ACT = 20, ACTX = 9, BARK = 42, BARKX = 12, DIZZY = 80, KBT = 22, INVUL = 50;
    const NO = ['Hmm, dat werkt niet.', 'Nee, dat helpt niet.', 'Dat past daar niet.', 'Iets anders proberen...'];
    const fin = v => typeof v === 'number' && isFinite(v);
    function prep(L) {
      if (L._p) return L;
      L._fl = {}; for (const f of L.floors) L._fl[f.id] = f;
      L._od = {}; for (const d of L.objs) L._od[d.id] = d;
      L.ladders = L.ladders || []; L._edges = [];
      for (const l of L.ladders) L._edges.push({ a: l.a, b: l.b, xa: l.x, xb: l.x, t: 'climb' }, { a: l.b, b: l.a, xa: l.x, xb: l.x, t: 'climb' });
      for (const a of L.floors) for (const b of L.floors)
        if (a !== b && Math.abs(a.y - b.y) < .01 && b.x0 >= a.x1 - .01 && b.x0 - a.x1 <= 1.7)
          L._edges.push({ a: a.id, b: b.id, xa: a.x1 - .2, xb: b.x0 + .2, t: 'hop' }, { a: b.id, b: a.id, xa: b.x0 + .2, xb: a.x1 - .2, t: 'hop' });
      L._p = 1; return L;
    }
    const objY = (L, d) => d.y != null ? d.y : L._fl[d.f].y;
    function newState(li) {
      const L = prep(LEVELS[li]);
      const S = { v: CORE_V, lv: li, t: 0, acts: 0, hits: 0, hints: 0, hl: {}, arrow: null, inv: [], o: {}, m: { st: 'ok', bt: 0, stage: 0 }, seq: [], cu: null, done: 0, ev: [] };
      for (const d of L.objs) S.o[d.id] = { x: d.x, y: objY(L, d), hide: d.hide ? 1 : 0 };
      const f = L._fl[L.start.f];
      S.w = { x: L.start.x, f: f.id, y: f.y, face: 1, m: 'idle', mt: 0, q: [], goal: null, kb: null, inv: 0, pend: null, hx: 0 };
      if (L.init) L.init(S);
      return S;
    }
    const ev = (S, t, a) => S.ev.push({ t, a: a || {} });
    function api(L, S) {
      return {
        say(who, text) { ev(S, 'say', { who, text }); },
        fx(t, a) { ev(S, 'fx', Object.assign({ k: t }, a || {})); },
        give(it) { if (S.inv.length >= MAXINV) { ev(S, 'say', { who: 'w', text: 'Mijn rugzak zit vol! Gebruik eerst iets.' }); return false; } S.inv.push(it); ev(S, 'take', { it }); return true; },
        drop(it) { const i = S.inv.indexOf(it); if (i >= 0) S.inv.splice(i, 1); ev(S, 'inv', {}); },
        has: it => S.inv.includes(it),
        after(n, name, arg) { S.seq.push({ at: S.t + Math.max(1, n | 0), n: name, a: arg === undefined ? null : arg }); },
        win() { if (S.m.st !== 'ok') return; S.m.st = 'break'; S.m.bt = 0; S.cu = null; ev(S, 'break', {}); },
        stage() { S.m.stage++; ev(S, 'stage', { n: S.m.stage }); },
        cu(id) { S.cu = id; ev(S, 'cu', { id }); },
        no() { ev(S, 'no', {}); ev(S, 'say', { who: 'w', text: NO[S.acts % NO.length] }); },
      };
    }
    // the walkable part of floor f around x (objects that block are walls)
    function range(L, S, f, x, skip) {
      const F = L._fl[f]; let lo = F.x0 + .25, hi = F.x1 - .25;
      for (const d of L.objs) {
        if (!d.block || d.f !== f || d.id === skip) continue;
        const o = S.o[d.id]; if (o.hide || o.nob) continue;
        const a = o.x - d.w / 2 - .35, b = o.x + d.w / 2 + .35;
        if (b <= x + .001) lo = Math.max(lo, b); else if (a >= x - .001) hi = Math.min(hi, a);
      }
      return [lo, hi];
    }
    function route(L, from, to) {
      if (from === to) return [];
      const prev = { [from]: null }, Q = [from];
      while (Q.length) { const f = Q.shift(); if (f === to) break; for (const e of L._edges) if (e.a === f && !(e.b in prev)) { prev[e.b] = e; Q.push(e.b); } }
      if (!(to in prev)) return null;
      const path = []; let f = to; while (prev[f]) { path.unshift(prev[f]); f = prev[f].a; }
      return path;
    }
    function plan(L, S, f, x) {
      const r = route(L, S.w.f, f); if (!r) return null;
      const q = []; for (const e of r) { q.push({ t: 'walk', x: e.xa }); q.push({ t: e.t, x: e.xb, f: e.b }); }
      q.push({ t: 'walk', x }); return q;
    }
    function stand(L, S, d, o) {
      const f = d.sf || d.f, F = L._fl[f], lo = F.x0 + .25, hi = F.x1 - .25;
      if (d.sx != null) return { f, x: clamp(d.sx, lo, hi) };
      if (d.push != null && !o.pushed) { const dir = Math.sign(d.push - o.x) || 1; return { f, x: clamp(o.x - dir * (d.w / 2 + .45), lo, hi) }; }
      if (d.front) return { f, x: clamp(o.x, lo, hi) };
      const side = S.w.x <= o.x ? -1 : 1; let x = o.x + side * (d.w / 2 + .45);
      if (x < lo || x > hi) x = o.x - side * (d.w / 2 + .45);
      return { f, x: clamp(x, lo, hi) };
    }
    // which object is at room point (x, y)? (a generous box, the smallest one wins)
    function pick(L, S, x, y) {
      prep(L); let best = null, ba = 1e9, near = null, nd = .6;
      for (const d of L.objs) {
        const o = S.o[d.id]; if (o.hide || d.nt) continue;
        const x0 = o.x - d.w / 2, x1 = o.x + d.w / 2, y1 = o.y, y0 = o.y - d.h, p = .3;
        if (x >= x0 - p && x <= x1 + p && y >= y0 - p && y <= y1 + p) { const a = d.w * d.h; if (a < ba) { ba = a; best = d.id; } }
        else { const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1), dd = Math.hypot(dx, dy); if (dd < nd) { nd = dd; near = d.id; } }
      }
      return best || near;
    }
    function floorAt(L, x, y) {
      let best = null, bd = 1e9;
      for (const F of L.floors) {
        const dx = x < F.x0 ? F.x0 - x : x > F.x1 ? x - F.x1 : 0, dy = F.y - y;
        const d = (dy >= -.6 ? dy : 4 - dy * 2) + dx * 3;           // prefer the floor just below the tap
        if (d < bd) { bd = d; best = F.id; }
      }
      return best;
    }
    function cmd(L, S, c) {
      prep(L); if (!S.ev) S.ev = [];
      if (!c || S.done) return false;
      if (c.t === 'cuX') { S.cu = null; return true; }
      if (S.m.st !== 'ok') return false;
      if (c.t === 'pick') { if (S.cu !== c.id || !L.pick) return false; L.pick(S, api(L, S), c.id, c.v); S.acts++; return true; }
      if (c.t === 'comb') {
        if (!S.inv.includes(c.a) || !S.inv.includes(c.b) || c.a === c.b) return false;
        S.acts++; const A = api(L, S);
        if (!(L.comb && L.comb(S, A, c.a, c.b))) { ev(S, 'no', {}); A.say('w', 'Die twee passen niet bij elkaar.'); }
        return true;
      }
      if (c.t === 'tap') {
        if (!fin(c.x) || !fin(c.y)) return false;
        const id = pick(L, S, c.x, c.y);
        c = id ? { t: 'obj', id, item: c.item || null } : { t: 'walk', x: c.x, f: floorAt(L, c.x, c.y) };
      }
      if (c.t === 'obj') { const d = L._od[c.id]; if (!d || S.o[c.id].hide) return false; if (c.item && !S.inv.includes(c.item)) return false; }
      if (c.t === 'walk' && (!L._fl[c.f] || !fin(c.x))) return false;
      if (!['obj', 'walk', 'bark'].includes(c.t)) return false;
      S.cu = null;
      const W = S.w;
      if (['dizzy', 'climb', 'hop', 'act', 'bark'].includes(W.m)) { W.pend = c; return true; }
      return start(L, S, c);
    }
    function start(L, S, c) {
      const W = S.w; W.goal = null; W.q = []; W.pend = null;
      if (c.t === 'bark') { W.m = 'bark'; W.mt = 0; ev(S, 'bark', {}); return true; }
      if (c.t === 'walk') {
        const q = plan(L, S, c.f, c.x); if (!q) { W.m = 'idle'; return false; }
        W.q = q; W.goal = { t: 'walk' }; nextWp(L, S); return true;
      }
      const d = L._od[c.id], o = S.o[c.id];
      if (!c.item && d.far && !(d.push != null && !o.pushed)) {        // a remark from a distance
        if (Math.abs(o.x - W.x) > .2) W.face = Math.sign(o.x - W.x);
        W.m = 'idle'; W.mt = 0; exec(L, S, { t: 'tap', id: c.id }); return true;
      }
      if (!L._fl[d.sf || d.f]) { W.m = 'idle'; W.mt = 0; exec(L, S, { t: c.item ? 'use' : 'tap', id: c.id, item: c.item || null }); return true; }
      const sp = stand(L, S, d, o), q = plan(L, S, sp.f, sp.x);
      if (!q) { W.m = 'idle'; api(L, S).say('w', 'Daar kan ik niet bij.'); return false; }
      W.q = q; W.goal = { t: c.item ? 'use' : 'tap', id: c.id, item: c.item || null, push: d.push != null && !o.pushed && !c.item };
      nextWp(L, S); return true;
    }
    function nextWp(L, S) {
      const W = S.w; W.mt = 0;
      if (!W.q.length) {                                            // arrived
        const g = W.goal;
        if (!g || g.t === 'walk') { if (g) S.acts++; W.goal = null; W.m = 'idle'; return; }
        const o = S.o[g.id]; if (Math.abs(o.x - W.x) > .1) W.face = Math.sign(o.x - W.x);
        if (g.push) { W.m = 'push'; W.goal = null; W.pushId = g.id; ev(S, 'push', {}); }
        else { W.m = 'act'; ev(S, 'reach', { use: !!g.item }); }
        return;
      }
      const wp = W.q[0];
      if (wp.t === 'walk') W.m = 'walk';
      else if (wp.t === 'climb') { W.m = 'climb'; W.f = null; W.lf = wp.f; ev(S, 'climb', {}); }
      else { W.m = 'hop'; W.hx = W.x; W.hy = W.y; W.f = null; W.lf = wp.f; ev(S, 'hop', {}); }
    }
    function exec(L, S, g) {
      if (S.m.st !== 'ok') return;
      const A = api(L, S), d = L._od[g.id], o = S.o[g.id]; S.acts++;
      if (!d || o.hide) return;
      if (g.t === 'use') { if (!S.inv.includes(g.item)) return; if (!(L.use && L.use(S, A, g.item, g.id))) A.no(); return; }
      if (L.tap && L.tap(S, A, g.id)) return;
      if (d.take) { if (A.give(d.take)) { o.hide = 1; ev(S, 'got', { id: g.id }); } return; }
      if (d.cu) { A.cu(g.id); return; }
      A.say('w', d.say || 'Hmm...');
    }
    function setIdle(W) { W.m = 'idle'; W.mt = 0; }
    function woef(L, S, A) {
      const W = S.w; W.mt++;
      switch (W.m) {
        case 'idle': if (W.pend) { const c = W.pend; W.pend = null; start(L, S, c); } break;
        case 'walk': {
          const wp = W.q[0]; if (!wp) { nextWp(L, S); break; }
          const [lo, hi] = range(L, S, W.f, W.x), tx = clamp(wp.x, lo, hi), dx = tx - W.x;
          if (Math.abs(dx) > .01) W.face = Math.sign(dx);
          if (Math.abs(dx) <= WALK) {
            W.x = tx;
            if (Math.abs(tx - wp.x) > .05) { W.q = []; W.goal = null; setIdle(W); A.say('w', 'Daar kan ik niet langs.'); break; }
            W.q.shift(); nextWp(L, S);
          } else W.x += Math.sign(dx) * WALK;
          break;
        }
        case 'climb': {
          const wp = W.q[0], ty = L._fl[wp.f].y, dy = ty - W.y;
          if (Math.abs(dy) <= CLIMB) { W.y = ty; W.f = wp.f; W.q.shift(); nextWp(L, S); } else W.y += Math.sign(dy) * CLIMB;
          break;
        }
        case 'hop': {
          const wp = W.q[0], k = Math.min(1, W.mt / HOP), ty = L._fl[wp.f].y;
          W.x = W.hx + (wp.x - W.hx) * k; W.y = W.hy + (ty - W.hy) * k - Math.sin(Math.PI * k) * .8; W.face = Math.sign(wp.x - W.hx) || W.face;
          if (k >= 1) { W.x = wp.x; W.y = ty; W.f = wp.f; W.q.shift(); nextWp(L, S); }
          break;
        }
        case 'act':
          if (W.mt === ACTX && W.goal) { const g = W.goal; W.goal = null; exec(L, S, g); }
          if (W.m === 'act' && W.mt >= ACT) { setIdle(W); if (W.pend) { const c = W.pend; W.pend = null; start(L, S, c); } }
          break;
        case 'push': {
          const id = W.pushId, d = L._od[id], o = S.o[id]; if (!d) { setIdle(W); break; }
          const dir = Math.sign(d.push - o.x) || 1, off = d.w / 2 + .45;
          W.x += dir * PUSHV; o.x = W.x + dir * off; W.face = dir;
          if ((dir > 0 && o.x >= d.push) || (dir < 0 && o.x <= d.push)) {
            o.x = d.push; W.x = o.x - dir * off; o.pushed = 1; setIdle(W); S.acts++; ev(S, 'pushed', { id });
            if (L.pushed) L.pushed(S, A, id);
          }
          break;
        }
        case 'bark':
          if (W.mt === BARKX) { S.acts++; if (!(typeof L.bark === 'function' && L.bark(S, A))) ev(S, 'barknone', {}); }
          if (W.mt >= BARK) { setIdle(W); if (W.pend) { const c = W.pend; W.pend = null; start(L, S, c); } }
          break;
        case 'dizzy':
          if (W.kb) { const k = Math.min(1, W.mt / KBT), e = 1 - (1 - k) * (1 - k); W.x = W.kb.x0 + (W.kb.x1 - W.kb.x0) * e; if (k >= 1) W.kb = null; }
          if (W.mt >= DIZZY) { setIdle(W); W.inv = S.t + INVUL; }
          break;
      }
    }
    function zones(L, S) { if (S.m.st !== 'ok' || !L.hazard) return []; return L.hazard(S) || []; }
    function hit(L, S, z) {
      const W = S.w; S.hits++;
      const dir = W.x < z.cx ? -1 : 1, [lo, hi] = range(L, S, W.f, W.x, W.m === 'push' ? W.pushId : null);
      const tx = clamp(dir < 0 ? z.x0 - .7 : z.x1 + .7, lo, hi);
      W.kb = { x0: W.x, x1: tx }; W.m = 'dizzy'; W.mt = 0; W.q = []; W.goal = null; W.pend = null; W.face = -dir; S.cu = null;
      ev(S, 'hit', { kind: z.kind });
    }
    function step(L, S) {
      prep(L); S.ev = []; if (S.done) return;
      S.t++;
      const A = api(L, S), W = S.w, M = S.m;
      if (S.seq.length) {
        const due = S.seq.filter(e => e.at <= S.t);
        if (due.length) { S.seq = S.seq.filter(e => e.at > S.t); for (const e of due) if (L.ev && L.ev[e.n]) L.ev[e.n](S, A, e.a); }
      }
      if (L.tick) L.tick(S, A);
      if (M.st !== 'ok') {
        M.bt++;
        if (M.bt === 100) { M.st = 'gone'; ev(S, 'boom', {}); }
        if (M.bt === 125) { W.q = []; W.goal = null; W.pend = null; if (W.f) { W.m = 'cheer'; W.mt = 0; } ev(S, 'cheer', {}); }
        if (M.bt === 140) ev(S, L.final ? 'cage' : 'flee', {});
        if (L.final && M.bt === 260) ev(S, 'sorry', {});
        if (M.bt === (L.final ? 480 : 300)) { S.done = 1; ev(S, 'done', {}); }
        if (W.m === 'idle' && M.bt > 125 && W.f) { W.m = 'cheer'; W.mt = 0; }
      }
      woef(L, S, A);
      if (W.f && W.m !== 'dizzy' && W.m !== 'cheer' && S.t >= W.inv) {
        for (const z of zones(L, S)) if (z.ph === 2 && (z.f === W.f) && W.x > z.x0 && W.x < z.x1) { hit(L, S, z); break; }
      }
    }
    function hint(L, S) {
      const st = Math.max(0, Math.min(L.hints.length - 1, L.stage ? L.stage(S) : 0));
      const n = Math.min(3, (S.hl[st] || 0) + 1); S.hl[st] = n; S.hints++;
      const h = L.hints[st][n - 1], t = typeof h === 'string' ? h : h.t;
      if (n === 3) S.arrow = { st, at: h.at };
      return { st, n, t, at: n === 3 ? h.at : null };
    }
    function arrow(L, S) { if (!S.arrow || S.m.st !== 'ok') return null; const st = L.stage ? L.stage(S) : 0; return st === S.arrow.st ? S.arrow.at : null; }
    const stars = S => 1 + (S.hints <= 1 ? 1 : 0) + (S.hits <= 2 ? 1 : 0);
    // after loading a saved game: put Woef on solid ground and drop half-finished moves (the rest is the saved logic state)
    function sanitize(L, S) {
      prep(L);
      if (!S || S.v !== CORE_V || !S.w || !S.o || !S.m) return false;
      for (const d of L.objs) if (!S.o[d.id]) return false;
      const W = S.w; S.ev = []; S.cu = null;
      if (!W.f || !L._fl[W.f]) { const f = W.lf && L._fl[W.lf] ? W.lf : L.start.f; const wp = W.q && W.q[0]; W.f = f; if (wp && fin(wp.x) && wp.f === f) W.x = wp.x; }
      if (!fin(W.x)) W.x = L.start.x;
      const F = L._fl[W.f]; W.x = clamp(W.x, F.x0 + .25, F.x1 - .25); W.y = F.y;
      if (W.m === 'push' && W.pushId) { const d = L._od[W.pushId], o = S.o[W.pushId]; if (d && fin(o.x)) { o.x = clamp(o.x, Math.min(d.x, d.push), Math.max(d.x, d.push)); } }
      W.q = []; W.goal = null; W.kb = null; W.pend = null; W.mt = 0; W.m = S.m.st === 'ok' ? 'idle' : 'cheer'; if (!fin(W.inv)) W.inv = 0;
      if (!Array.isArray(S.inv)) S.inv = []; S.inv = S.inv.filter(i => ITEMS[i]).slice(0, MAXINV);
      if (!Array.isArray(S.seq)) S.seq = []; S.seq = S.seq.filter(e => e && fin(e.at) && L.ev && L.ev[e.n]);
      for (const k of ['t', 'hits', 'hints', 'acts']) if (!fin(S[k])) S[k] = 0;
      for (const id in S.o) { const o = S.o[id]; for (const k in o) if (typeof o[k] === 'number' && !fin(o[k])) o[k] = 0; }
      return true;
    }
    const finite = S => !!S && [S.t, S.w.x, S.w.y].every(fin) && Object.values(S.o).every(o => fin(o.x) && fin(o.y));
    return { newState, cmd, step, hint, arrow, stars, sanitize, pick, zones, range, prep, finite, floorAt, stand, C: { WALK, ACT, BARK, DIZZY, HOP, MAXINV } };
  })();
