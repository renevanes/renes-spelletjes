/* ================================================================
   GOUDGRAVER – original dig-and-collect mine game: grab all the gold,
   dig holes to trap the moles, then climb out via the hidden ladder
   ================================================================ */
const Goldmine = (() => {
  const COLS = 28, ROWS = 16;
/*LEVELS*/
  const D = { sound: true, ctl: 'normaal' };
  const opt = Object.assign({}, D, store.get('gg.settings', {}));
  const saveOpt = () => store.set('gg.settings', opt);
  let prog = Object.assign({ unlocked: 1, best: {}, done: 0, deaths: 0, gold: 0 }, store.get('gg.progress', {}));
  const saveProg = () => store.set('gg.progress', prog);
  Sfx.gate('gg', () => opt.sound);
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a, P ? Math.max(-.6, Math.min(.6, (P.c - cam.x - vw / 2) / vw)) : 0); };
  const wrap = $('#ggWrap'), cv = $('#ggCanvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, T = 24, vw = 14, vh = 16, top0 = 0, raf = 0, running = false, lastT = 0;
  let lv = 0, g = null, holes = new Map(), P = null, moles = [], goldLeft = 0, revealed = false, state = 'idle', stateT = 0, time = 0, parts = [], cam = { x: 0, y: 0 }, spawns = [], clock = 0;
  const keys = { l: false, r: false, u: false, d: false }; let digReq = 0;
  const SPD = { run: .17, climb: .19, hang: .2, fall: .1 }, MSPD = { run: .27, climb: .31, hang: .3, fall: .13 };

  /* ---------- level & grid ---------- */
  function load(n) {
    lv = n; const L = LEVELS[n]; g = L.m.map(r => r.split('')); holes = new Map(); moles = []; parts = []; spawns = []; revealed = false; time = 0; goldLeft = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = g[r][c];
      if (ch === 'P') { P = ent(c, r, 'p'); g[r][c] = ' '; }
      else if (ch === 'M') { moles.push(Object.assign(ent(c, r, 'm'), { home: [c, r] })); spawns.push([c, r]); g[r][c] = ' '; }
      else if (ch === '$') goldLeft++;
    }
    for (let c = 0; c < COLS; c++) if (g[0][c] === ' ' || g[1][c] === ' ') spawns.push([c, 0]);
    state = 'play'; stateT = 0; cam.x = Math.max(0, Math.min(COLS - vw, P.c - vw / 2)); paintStatic(); hud(); closeModals();
    banner(`${n + 1}. ${L.n}`, 1500);
  }
  const ent = (c, r, kind) => ({ c, r, mv: null, face: 1, anim: 0, kind, trapped: 0, carry: false, dead: 0, noFall: 0, drop: 0 });
  const K = (c, r) => c + ',' + r;
  const base = (c, r) => { const ch = g[r][c]; return ch === 'S' ? (revealed ? 'H' : ' ') : (ch === 'P' || ch === 'M') ? ' ' : ch; };
  const holeOpen = (c, r) => { const h = holes.get(K(c, r)); return h && h.t >= .25; };
  const solid = (c, r) => { if (c < 0 || c >= COLS || r >= ROWS) return true; if (r < 0) return false; const b = base(c, r); return b === '@' || (b === '#' && !holeOpen(c, r)); };
  const ladder = (c, r) => r >= 0 && r < ROWS && c >= 0 && c < COLS && base(c, r) === 'H';
  const rope = (c, r) => r >= 0 && r < ROWS && c >= 0 && c < COLS && base(c, r) === '-';
  const moleAt = (c, r, not) => moles.find(m => m !== not && !m.dead && ((m.c === c && m.r === r) || (m.mv && m.c + m.mv.dc === c && m.r + m.mv.dr === r)));
  function supported(e) {
    const { c, r } = e;
    if (r >= ROWS - 1 || e.noFall > 0) return true;
    if (ladder(c, r) || (rope(c, r) && !e.drop)) return true;
    if (solid(c, r + 1) || ladder(c, r + 1)) return true;
    const m = moleAt(c, r + 1, e); if (m && !m.mv) return true;
    return false;
  }
  function start(e, dc, dr, type) {
    const S = e.kind === 'p' ? SPD : MSPD, f = e.kind === 'm' ? 1 / (1 + lv * .025) : 1;
    e.mv = { dc, dr, t: 0, dur: S[type] * f, type }; if (dc) e.face = dc;
  }

  /* ---------- player ---------- */
  function tryDig(d) {
    const tc = P.c + d, tr = P.r + 1;
    P.face = d;
    if (tc < 0 || tc >= COLS || tr >= ROWS || base(tc, tr) !== '#' || holes.has(K(tc, tr))) return false;
    const above = base(tc, P.r); if (!(above === ' ' || above === 'X') || g[P.r][tc] === '$' || moleAt(tc, P.r) || moleAt(tc, tr)) return false;
    holes.set(K(tc, tr), { c: tc, r: tr, t: 0 }); P.dig = .26; P.digDir = d; sfx('ggDig');
    for (let i = 0; i < 8; i++) parts.push({ x: tc + .5, y: tr + .2, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, life: .5, col: '#b8643a', s: .08 });
    return true;
  }
  function updatePlayer(dt) {
    if (P.dig > 0) { P.dig -= dt; return; }
    if (P.mv) {
      P.mv.t += dt / P.mv.dur; P.anim += dt;
      if (P.mv.t >= 1) { P.c += P.mv.dc; P.r += P.mv.dr; const was = P.mv.type; P.mv = null; arrive(); if (was !== 'fall') P.drop = 0; }
      return;
    }
    if (!supported(P)) { start(P, 0, 1, 'fall'); return; }
    P.drop = 0;
    if (digReq) { const d = digReq; digReq = 0; if (!rope(P.c, P.r) && tryDig(d)) return; }
    const { c, r } = P;
    if (keys.u && ladder(c, r) && r > 0 && !solid(c, r - 1)) return start(P, 0, -1, 'climb');
    if (keys.u && ladder(c, r) && r === 0 && !goldLeft) return win();
    if (keys.d) {
      if (rope(c, r) && !solid(c, r + 1)) { P.drop = 1; return start(P, 0, 1, 'fall'); }
      if ((ladder(c, r) || ladder(c, r + 1)) && !solid(c, r + 1)) return start(P, 0, 1, 'climb');
    }
    const d = keys.r && !keys.l ? 1 : keys.l && !keys.r ? -1 : 0;
    if (d && !solid(c + d, r)) return start(P, d, 0, rope(c + d, r) ? 'hang' : 'run');
    if (d) P.face = d;
  }
  function arrive() {
    const { c, r } = P;
    if (g[r][c] === '$') {
      g[r][c] = ' '; goldLeft--; prog.gold++; sfx('pfCoin'); for (let i = 0; i < 10; i++) parts.push({ x: c + .5, y: r + .5, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, life: .6, col: '#ffd84a', s: .06, gl: 1 }); hud();
      if (!goldLeft) { revealed = true; paintStatic(); sfx('ggReveal'); banner('🪜 De uitgang is open! Klim naar boven', 2200); for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) if (g[rr][cc] === 'S') for (let i = 0; i < 4; i++) parts.push({ x: cc + .5, y: rr + .5, vx: (Math.random() - .5) * 2, vy: -Math.random() * 2, life: .9, col: '#ffe9a0', s: .05, gl: 1 }); }
    }
    if (!goldLeft && r === 0) win();
  }

  /* ---------- moles ---------- */
  function path(m) {
    const tx = P.mv ? P.c + (P.mv.t > .5 ? P.mv.dc : 0) : P.c, ty = P.mv ? P.r + (P.mv.t > .5 ? P.mv.dr : 0) : P.r;
    const sx = m.c, sy = m.r, prev = new Map([[K(sx, sy), null]]), q = [[sx, sy]];
    const supAt = (c, r) => r >= ROWS - 1 || ladder(c, r) || rope(c, r) || solid(c, r + 1) || ladder(c, r + 1);
    while (q.length) {
      const [c, r] = q.shift(); if (c === tx && r === ty) break;
      const n = [];
      if (!supAt(c, r)) n.push([c, r + 1]);
      else {
        for (const d of [-1, 1]) if (!solid(c + d, r)) n.push([c + d, r]);
        if (ladder(c, r) && r > 0 && !solid(c, r - 1)) n.push([c, r - 1]);
        if ((ladder(c, r) || ladder(c, r + 1) || rope(c, r)) && !solid(c, r + 1)) n.push([c, r + 1]);
      }
      for (const [nc, nr] of n) { const k = K(nc, nr); if (prev.has(k) || nr < 0 || nr >= ROWS) continue; if (moleAt(nc, nr, m) && !(nc === tx && nr === ty)) continue; prev.set(k, [c, r]); q.push([nc, nr]); }
    }
    let k = K(tx, ty); if (!prev.has(k)) return null;
    let cur = [tx, ty], p = prev.get(k);
    while (p && !(p[0] === sx && p[1] === sy)) { cur = p; p = prev.get(K(...p)); }
    return p ? [cur[0] - sx, cur[1] - sy] : null;
  }
  function updateMole(m, dt) {
    if (m.dead) { m.dead -= dt; if (m.dead <= 0) respawn(m); return; }
    if (m.noFall > 0) m.noFall -= dt;
    if (m.trapped > 0) {
      m.trapped -= dt;
      if (m.trapped <= 0) { if (!solid(m.c, m.r - 1) && !moleAt(m.c, m.r - 1, m)) { m.noFall = .9; start(m, 0, -1, 'climb'); } else m.trapped = .3; }
      return;
    }
    if (m.mv) {
      m.mv.t += dt / m.mv.dur; m.anim += dt;
      if (m.mv.t >= 1) {
        m.c += m.mv.dc; m.r += m.mv.dr; m.mv = null;
        if (holeOpen(m.c, m.r) && m.noFall <= 0) {
          m.trapped = 2.6; sfx('ggTrap'); vibrate(15);
          if (m.carry && m.r > 0 && base(m.c, m.r - 1) === ' ' && g[m.r - 1][m.c] !== '$') { g[m.r - 1][m.c] = '$'; m.carry = false; }
          return;
        }
        if (g[m.r][m.c] === '$' && !m.carry && Math.random() < .55) { g[m.r][m.c] = ' '; m.carry = true; m.drop = 6 + Math.floor(Math.random() * 12); }
        else if (m.carry && --m.drop <= 0 && base(m.c, m.r) === ' ' && g[m.r][m.c] !== '$' && supported(m) && !ladder(m.c, m.r)) { g[m.r][m.c] = '$'; m.carry = false; }
      }
      return;
    }
    if (!supported(m)) { start(m, 0, 1, 'fall'); return; }
    if (m.wait > 0) { m.wait -= dt; return; }
    let st = Math.random() < .08 ? null : path(m);
    if (!st) { const d = Math.sign(P.c - m.c) || (Math.random() < .5 ? -1 : 1); st = !solid(m.c + d, m.r) && !moleAt(m.c + d, m.r, m) ? [d, 0] : null; }
    if (!st) { m.wait = .3; return; }
    const [dc, dr] = st; if (moleAt(m.c + dc, m.r + dr, m)) { m.wait = .2; return; }
    start(m, dc, dr, dr < 0 ? 'climb' : dr > 0 ? (ladder(m.c, m.r) || ladder(m.c, m.r + 1) ? 'climb' : 'fall') : rope(m.c + dc, m.r) ? 'hang' : 'run');
  }
  function respawn(m) {
    const free = spawns.filter(([c, r]) => !solid(c, r) && !moleAt(c, r, m) && Math.abs(c - P.c) + Math.abs(r - P.r) > 6);
    const [c, r] = free.length ? free[Math.floor(Math.random() * free.length)] : m.home;
    Object.assign(m, { c, r, mv: null, trapped: 0, carry: false, dead: 0, noFall: 0, wait: .6 });
    for (let i = 0; i < 10; i++) parts.push({ x: c + .5, y: r + .5, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, life: .6, col: '#c9a37a', s: .07 });
  }
  function killMole(m) { m.dead = 1.6; m.trapped = 0; m.mv = null; sfx('ggSquash'); for (let i = 0; i < 12; i++) parts.push({ x: m.c + .5, y: m.r + .5, vx: (Math.random() - .5) * 4, vy: -Math.random() * 4, life: .6, col: '#6b5a4a', s: .08 }); if (m.carry) { m.carry = false; } }

  /* ---------- holes, collisions, flow ---------- */
  function updateHoles(dt) {
    for (const [k, h] of holes) {
      const was = h.t; h.t += dt;
      if (was < 5.6 && h.t >= 5.6) sfx('ggFill');
      if (h.t >= 6.2) {
        holes.delete(k);
        if (P.c === h.c && P.r === h.r && !P.mv) { die('Ingemetseld!'); }
        for (const m of moles) if (!m.dead && m.c === h.c && m.r === h.r) killMole(m);
      }
    }
  }
  const pos = e => e.mv ? [e.c + e.mv.dc * Math.min(1, e.mv.t), e.r + e.mv.dr * Math.min(1, e.mv.t)] : [e.c, e.r];
  function collide() {
    const [px, py] = pos(P);
    for (const m of moles) { if (m.dead) continue; const [mx, my] = pos(m); if (m.trapped > 0 && py < my - .4) continue; if (Math.abs(mx - px) < .62 && Math.abs(my - py) < .62) return die('Gepakt door een mol!'); }
  }
  function die(why) {
    if (state !== 'play') return; state = 'dead'; stateT = 1.5; prog.deaths++; saveProg(); sfx('pfDie'); vibrate(80); banner(why, 1400);
  }
  function win() {
    if (state !== 'play') return; state = 'win'; stateT = 1.8; sfx('pfWin');
    const b = prog.best[lv]; const t = Math.round(time); prog.best[lv] = b == null ? t : Math.min(b, t); L_newRec = b == null || t < b;
    if (lv + 2 > prog.unlocked && lv + 1 < LEVELS.length) prog.unlocked = lv + 2; prog.done = Math.max(prog.done, Object.keys(prog.best).length); saveProg();
  }
  let L_newRec = false;
  function update(dt) {
    clock += dt;
    if (state === 'play') { time += dt; updateHoles(dt); updatePlayer(dt); for (const m of moles) updateMole(m, dt); collide(); }
    else if (state === 'dead') { stateT -= dt; if (stateT <= 0) load(lv); }
    else if (state === 'win') { stateT -= dt; if (stateT <= 0) { state = 'idle'; showWin(); } }
    for (const p of parts) { p.life -= dt; p.vy += 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } parts = parts.filter(p => p.life > 0);
    const [px, py] = pos(P), tx = Math.max(0, Math.min(COLS - vw, px + .5 - vw / 2)), ty = Math.max(0, Math.min(ROWS - vh, py + .5 - vh / 2));
    cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 6);
  }

  /* ---------- drawing ---------- */
  let SP = {}, spKey = '';
  const stat = document.createElement('canvas'), sx = stat.getContext('2d');
  function sprites() {
    const s = Math.max(8, Math.round(T * dpr)); if (spKey === s + '') return; spKey = s + ''; SP = {};
    const mk = (fn, w = 1, h = 1) => { const c = document.createElement('canvas'); c.width = Math.ceil(s * w); c.height = Math.ceil(s * h); const x = c.getContext('2d'); x.scale(s, s); x.lineJoin = x.lineCap = 'round'; fn(x); return c; };
    const brick = fake => x => {
      x.fillStyle = fake ? '#8a4a2c' : '#9b4f2c'; x.fillRect(0, 0, 1, 1);
      for (let row = 0; row < 2; row++) for (let k = -1; k < 2; k++) {
        const bx = k * .5 + (row ? .25 : 0) + .02, by = row * .5 + .03, q = x.createLinearGradient(0, by, 0, by + .44); q.addColorStop(0, fake ? '#c97a52' : '#d4865a'); q.addColorStop(1, fake ? '#9a5132' : '#a5552f');
        x.fillStyle = q; x.beginPath(); x.roundRect ? x.roundRect(bx, by, .46, .44, .05) : x.rect(bx, by, .46, .44); x.fill();
        x.fillStyle = 'rgba(255,220,180,.25)'; x.fillRect(bx + .03, by + .02, .4, .04);
      }
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, .96, 1, .04);
    };
    SP.brick = mk(brick(false)); SP.fake = mk(brick(true));
    SP.stone = mk(x => {
      let q = x.createLinearGradient(0, 0, 1, 1); q.addColorStop(0, '#8f949c'); q.addColorStop(1, '#4f545c'); x.fillStyle = q; x.fillRect(0, 0, 1, 1);
      x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(0, 0, 1, .06); x.fillRect(0, 0, .06, 1); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, .94, 1, .06); x.fillRect(.94, 0, .06, 1);
      x.strokeStyle = 'rgba(30,30,35,.5)'; x.lineWidth = .03; x.beginPath(); x.moveTo(.3, .15); x.lineTo(.42, .45); x.lineTo(.36, .7); x.moveTo(.42, .45); x.lineTo(.65, .55); x.stroke();
    });
    SP.ladder = mk(x => {
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(.2, 0, .08, 1); x.fillRect(.76, 0, .08, 1);
      for (const rx of [.16, .72]) { const q = x.createLinearGradient(rx, 0, rx + .1, 0); q.addColorStop(0, '#e0b070'); q.addColorStop(1, '#8a5a2a'); x.fillStyle = q; x.fillRect(rx, 0, .1, 1); }
      for (const ry of [.18, .5, .82]) { x.fillStyle = '#6b4422'; x.fillRect(.2, ry + .03, .6, .07); x.fillStyle = '#c99556'; x.fillRect(.2, ry, .6, .06); }
    });
    SP.rope = mk(x => {
      x.strokeStyle = '#6b4a24'; x.lineWidth = .1; x.beginPath(); x.moveTo(0, .16); x.lineTo(1, .16); x.stroke();
      x.strokeStyle = '#c9a060'; x.lineWidth = .06; x.beginPath(); x.moveTo(0, .15); x.lineTo(1, .15); x.stroke();
      x.strokeStyle = 'rgba(80,50,20,.7)'; x.lineWidth = .025; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(i / 6, .11); x.lineTo(i / 6 + .1, .2); x.stroke(); }
    });
    SP.gold = mk(x => {
      x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(.5, .9, .32, .07, 0, 0, 7); x.fill();
      const bar = (bx, by) => { x.beginPath(); x.moveTo(bx, by + .16); x.lineTo(bx + .06, by); x.lineTo(bx + .34, by); x.lineTo(bx + .4, by + .16); x.closePath(); const q = x.createLinearGradient(0, by, 0, by + .16); q.addColorStop(0, '#fff3a6'); q.addColorStop(1, '#d99a12'); x.fillStyle = q; x.fill(); x.strokeStyle = '#8a5a06'; x.lineWidth = .02; x.stroke(); };
      bar(.12, .72); bar(.48, .72); bar(.3, .56);
    });
  }
  function paintStatic() {
    sprites();
    const s = T * dpr; stat.width = Math.ceil(COLS * s); stat.height = Math.ceil(ROWS * s);
    sx.setTransform(s, 0, 0, s, 0, 0);
    let q = sx.createLinearGradient(0, 0, 0, ROWS); q.addColorStop(0, '#3b2a36'); q.addColorStop(1, '#1c1418'); sx.fillStyle = q; sx.fillRect(0, 0, COLS, ROWS);
    // rock texture in the background
    let seed = 7 + lv; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 160; i++) { const x = rnd() * COLS, y = rnd() * ROWS, r = .2 + rnd() * .7; sx.fillStyle = `rgba(${rnd() < .5 ? '255,220,200' : '0,0,0'},${.03 + rnd() * .04})`; sx.beginPath(); sx.ellipse(x, y, r * 1.4, r, rnd() * 3, 0, 7); sx.fill(); }
    for (let i = 0; i < 14; i++) { const x = rnd() * COLS, y = rnd() * ROWS; sx.fillStyle = `rgba(120,200,255,${.06 + rnd() * .06})`; sx.beginPath(); sx.moveTo(x, y - .25); sx.lineTo(x + .12, y); sx.lineTo(x, y + .25); sx.lineTo(x - .12, y); sx.fill(); }
    // support beams
    sx.fillStyle = 'rgba(90,60,35,.35)'; for (let c = 3; c < COLS; c += 7) sx.fillRect(c, 0, .18, ROWS);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const b = base(c, r);
      if (b === '@') sx.drawImage(SP.stone, c, r, 1, 1);
      else if (b === 'H') sx.drawImage(SP.ladder, c, r, 1, 1);
      else if (b === '-') sx.drawImage(SP.rope, c, r, 1, 1);
    }
  }
  // the miner (player): origin bottom-centre of his cell, 1 unit = 1 tile
  function drawMiner(x, e) {
    const mv = e.mv, type = mv ? mv.type : (rope(e.c, e.r) ? 'hang' : ladder(e.c, e.r) && !supportedFloor(e) ? 'climb' : 'stand');
    const ph = e.anim * 14, f = e.face;
    x.save(); x.scale(f, 1); x.lineCap = x.lineJoin = 'round';
    const dead = state === 'dead';
    if (dead) { x.translate(0, -.1); x.rotate(-1.4 * Math.min(1, (1.5 - stateT) * 3)); }
    const leg = (side, a) => { x.strokeStyle = '#2d4f8a'; x.lineWidth = .12; x.beginPath(); x.moveTo(side * .07, -.38); x.lineTo(side * .07 + Math.sin(a) * .13, -.08 - Math.max(0, Math.cos(a)) * .05); x.stroke(); x.fillStyle = '#5a3a1c'; x.beginPath(); x.ellipse(side * .07 + Math.sin(a) * .13 + .03, -.05, .08, .05, 0, 0, 7); x.fill(); };
    if (type === 'run' || type === 'stand') { const a = type === 'run' ? ph : 0; leg(-1, a); leg(1, a + Math.PI); }
    else if (type === 'climb') { const a = Math.sin(ph * .8) * .12; x.strokeStyle = '#2d4f8a'; x.lineWidth = .12; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * .07, -.38); x.lineTo(s * .1, -.1 + s * a); x.stroke(); } }
    else { x.strokeStyle = '#2d4f8a'; x.lineWidth = .12; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * .07, -.38); x.lineTo(s * .09 + (type === 'fall' ? s * .05 : 0), -.12); x.stroke(); } }
    // body
    x.fillStyle = '#d33a2f'; x.beginPath(); x.roundRect ? x.roundRect(-.15, -.68, .3, .34, .08) : x.rect(-.15, -.68, .3, .34); x.fill();
    x.fillStyle = '#2d5fa8'; x.beginPath(); x.roundRect ? x.roundRect(-.15, -.5, .3, .18, .05) : x.rect(-.15, -.5, .3, .18); x.fill(); x.fillRect(-.1, -.66, .05, .18); x.fillRect(.05, -.66, .05, .18);
    // arms
    x.strokeStyle = '#d33a2f'; x.lineWidth = .09;
    if (type === 'hang' || type === 'fall' || type === 'climb') { const a = Math.sin(ph * .8) * .06; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * .12, -.64); x.lineTo(s * .14, -.88 + (type === 'climb' ? s * a : 0)); x.stroke(); x.fillStyle = '#f0c49a'; x.beginPath(); x.arc(s * .14, -.9 + (type === 'climb' ? s * a : 0), .045, 0, 7); x.fill(); } }
    else if (e.dig > 0) { const k = 1 - e.dig / .26, a = -1.6 + k * 2.4; x.save(); x.translate(.1, -.62); x.rotate(a); x.strokeStyle = '#d33a2f'; x.beginPath(); x.moveTo(0, 0); x.lineTo(.2, 0); x.stroke(); x.strokeStyle = '#7a5530'; x.lineWidth = .04; x.beginPath(); x.moveTo(.18, 0); x.lineTo(.44, 0); x.stroke(); x.strokeStyle = '#b8c0c8'; x.lineWidth = .05; x.beginPath(); x.moveTo(.44, -.12); x.quadraticCurveTo(.5, 0, .44, .12); x.stroke(); x.restore(); }
    else { const a = type === 'run' ? Math.sin(ph) * .5 : 0; x.beginPath(); x.moveTo(.1, -.64); x.lineTo(.12 + Math.sin(a) * .14, -.42); x.stroke(); x.beginPath(); x.moveTo(-.1, -.64); x.lineTo(-.12 - Math.sin(a) * .14, -.42); x.stroke(); }
    // head + helmet with lamp
    x.fillStyle = '#f0c49a'; x.beginPath(); x.arc(.02, -.78, .12, 0, 7); x.fill();
    x.fillStyle = '#5a3820'; x.beginPath(); x.ellipse(.08, -.73, .07, .025, 0, 0, 7); x.fill();
    x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(.07, -.8, .018, 0, 7); x.fill();
    const q = x.createLinearGradient(0, -.98, 0, -.8); q.addColorStop(0, '#ffe066'); q.addColorStop(1, '#e0a812'); x.fillStyle = q; x.beginPath(); x.arc(.01, -.83, .14, Math.PI, 0); x.fill(); x.fillRect(-.16, -.84, .34, .04);
    x.fillStyle = '#fffbe0'; x.beginPath(); x.arc(.12, -.9, .035, 0, 7); x.fill();
    if (!(e.dig > 0) && type !== 'hang' && type !== 'climb') { x.strokeStyle = '#7a5530'; x.lineWidth = .035; x.beginPath(); x.moveTo(-.18, -.42); x.lineTo(-.06, -.74); x.stroke(); x.strokeStyle = '#9aa3ad'; x.lineWidth = .04; x.beginPath(); x.moveTo(-.16, -.8); x.quadraticCurveTo(-.06, -.72, .02, -.76); x.stroke(); }
    x.restore();
  }
  const supportedFloor = e => solid(e.c, e.r + 1);
  function drawMole(x, m) {
    const ph = m.anim * 12, type = m.mv ? m.mv.type : 'stand';
    x.save(); x.scale(m.face, 1); x.lineCap = x.lineJoin = 'round';
    if (m.trapped > 0) { x.translate(0, .1 + Math.sin(clock * 20) * .02); }
    // feet
    if (type === 'run' || type === 'stand') for (const s of [-1, 1]) { x.fillStyle = '#e8a0a8'; x.beginPath(); x.ellipse(s * .14 + (type === 'run' ? Math.sin(ph + (s > 0 ? Math.PI : 0)) * .06 : 0), -.04, .08, .045, 0, 0, 7); x.fill(); }
    // body
    const q = x.createRadialGradient(-.06, -.5, .02, 0, -.38, .36); q.addColorStop(0, '#7a6a5e'); q.addColorStop(1, '#3a2e28'); x.fillStyle = q; x.beginPath(); x.ellipse(0, -.36, .28, .32, 0, 0, 7); x.fill();
    x.fillStyle = '#b9a492'; x.beginPath(); x.ellipse(.08, -.3, .14, .18, 0, 0, 7); x.fill();
    // hands
    x.fillStyle = '#f0a8b0'; const up = type === 'climb' || type === 'hang' || type === 'fall' || m.trapped > 0;
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * .26 + .04, up ? -.68 : -.3 + (type === 'run' ? Math.sin(ph + s) * .04 : 0), .07, .05, 0, 0, 7); x.fill(); }
    // snout, eyes, hard hat
    x.fillStyle = '#e88a96'; x.beginPath(); x.ellipse(.27, -.46, .07, .055, 0, 0, 7); x.fill();
    x.fillStyle = '#111'; x.beginPath(); x.arc(.12, -.52, .025, 0, 7); x.fill();
    if (m.trapped > 0) { x.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { const a = clock * 5 + i * 2.1; x.beginPath(); x.arc(Math.cos(a) * .2, -.82 + Math.sin(a) * .05, .03, 0, 7); x.fill(); } }
    x.fillStyle = '#ff8a1f'; x.beginPath(); x.arc(0, -.6, .2, Math.PI, 0); x.fill(); x.fillRect(-.24, -.61, .48, .04);
    if (m.carry) { x.fillStyle = '#c9a050'; x.beginPath(); x.ellipse(-.24, -.22, .12, .13, 0, 0, 7); x.fill(); x.fillStyle = '#8a6020'; x.font = 'bold .14px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', -.24, -.21); }
    x.restore();
  }
  function draw() {
    if (!g) return;
    sprites();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#120d10'; ctx.fillRect(0, 0, cv.width, cv.height);
    const s = T * dpr, ox = Math.round((-cam.x * T + boardX) * dpr), oy = Math.round((-cam.y * T + top0) * dpr);
    ctx.drawImage(stat, ox, oy);
    ctx.setTransform(s, 0, 0, s, ox, oy); ctx.imageSmoothingEnabled = true;
    const c0 = Math.max(0, Math.floor(cam.x) - 1), c1 = Math.min(COLS - 1, Math.ceil(cam.x + vw) + 1);
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
      const ch = g[r][c], b = base(c, r);
      if (b === '#' || b === 'X') {
        const h = holes.get(K(c, r));
        if (!h) { ctx.drawImage(b === 'X' ? SP.fake : SP.brick, c, r, 1.01, 1.01); continue; }
        let k = 0; if (h.t < .25) k = 1 - h.t / .25; else if (h.t > 5.6) k = Math.min(1, (h.t - 5.6) / .6);
        if (k > 0) { ctx.save(); ctx.beginPath(); ctx.rect(c, r + 1 - k, 1, k); ctx.clip(); ctx.drawImage(SP.brick, c, r, 1.01, 1.01); ctx.restore(); }
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(c, r + 1 - .08, 1, .08);
      }
      if (ch === 'S' && revealed) { const a = Math.min(1, .3 + (clock % 100) * 0); ctx.globalAlpha = a; ctx.drawImage(SP.ladder, c, r, 1, 1); ctx.globalAlpha = 1; }
      if (ch === '$') { const bob = Math.sin(clock * 3 + c) * .03; ctx.drawImage(SP.gold, c, r + bob, 1, 1); const gl = (clock * 1.5 + c * .37 + r * .61) % 3; if (gl < .3) { ctx.globalCompositeOperation = 'lighter'; const gx = c + .4 + gl, gy = r + .7; ctx.fillStyle = 'rgba(255,255,220,.9)'; ctx.beginPath(); ctx.moveTo(gx, gy - .12); ctx.lineTo(gx + .03, gy); ctx.lineTo(gx, gy + .12); ctx.lineTo(gx - .03, gy); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } }
    }
    if (revealed) for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) if (g[r][c] === 'S') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,230,140,${.12 + .08 * Math.sin(clock * 4)})`; ctx.fillRect(c, r, 1, 1); ctx.globalCompositeOperation = 'source-over'; }
    // characters
    for (const m of moles) { if (m.dead) continue; const [mx, my] = pos(m); ctx.save(); ctx.translate(mx + .5, my + 1); if (m.trapped > 0) { ctx.beginPath(); ctx.rect(-1, -2, 2, 1.85); ctx.clip(); } drawMole(ctx, m); ctx.restore(); }
    if (state !== 'idle' || P) { const [px, py] = pos(P); ctx.save(); ctx.translate(px + .5, py + 1); if (!(state === 'dead' && Math.floor(clock * 10) % 2 && stateT < .6)) drawMiner(ctx, P); ctx.restore();
      // head lamp glow
      ctx.globalCompositeOperation = 'lighter'; const lx = px + .5 + P.face * .25, ly = py + .15; const gg2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, 2.2); gg2.addColorStop(0, 'rgba(255,240,180,.22)'); gg2.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = gg2; ctx.fillRect(lx - 2.2, ly - 2.2, 4.4, 4.4); ctx.globalCompositeOperation = 'source-over'; }
    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; if (p.gl) ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
    // vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(cv.width / 2, cv.height * .45, Math.min(cv.width, cv.height) * .35, cv.width / 2, cv.height * .45, Math.max(cv.width, cv.height) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  let boardX = 0;
  function layout() {
    dpr = window.devicePixelRatio || 1; W = wrap.clientWidth; H = wrap.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const land = W > H; wrap.classList.toggle('land', land);
    const ctlH = land ? 0 : (opt.ctl === 'groot' ? 200 : 176);
    if (land) { T = Math.min((W - 40) / COLS, H / ROWS); }
    else { T = Math.max(20, Math.min((H - ctlH) / ROWS, W / 13)); }
    vw = Math.min(COLS, W / T); vh = Math.min(ROWS, (H - ctlH) / T);
    boardX = vw >= COLS ? (W - COLS * T) / 2 : 0; top0 = land ? (H - ROWS * T) / 2 : Math.max(0, (H - ctlH - ROWS * T) / 2);
    spKey = ''; if (g) paintStatic();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(1 / 30, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (current === 'gg' && !anyModal() && !document.hidden && g) { update(dt / 2); update(dt / 2); hudTime(); }
    draw();
  }

  /* ---------- HUD / UI ---------- */
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  let lastSec = -1;
  function hudTime() { const s = Math.floor(time); if (s !== lastSec) { lastSec = s; $('#ggTime').textContent = fmt(time); } }
  function hud() { $('#ggGold').textContent = goldLeft; $('#ggLevel').textContent = lv + 1; }
  let banT = 0;
  function banner(t, ms) { const e = $('#ggBanner'); e.textContent = t; e.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => e.classList.remove('show'), ms || 1200); }
  function showWin() {
    $('#ggEndTitle').textContent = `Level ${lv + 1} gehaald!`;
    $('#ggEndText').innerHTML = `Tijd <b>${fmt(time)}</b>${L_newRec ? ' · 🎉 nieuw record' : ''}`;
    $('#ggEndNext').hidden = lv + 1 >= LEVELS.length; if (lv + 1 >= LEVELS.length) $('#ggEndText').innerHTML += '<br>🏆 Je hebt alle mijnen leeggehaald!';
    openModal('ggEndModal');
  }
  function renderStart() {
    $('#ggLevels').innerHTML = LEVELS.map((L, i) => { const lock = i + 1 > prog.unlocked, b = prog.best[i]; return `<button data-n="${i}" ${lock ? 'disabled' : ''} class="${lock ? 'lock' : ''}"><b>${lock ? '🔒' : i + 1}</b><small>${L.n}</small><span>${b != null ? '⏱ ' + fmt(b) : ''}</span></button>`; }).join('');
    $('#ggOptList').innerHTML = [['sound', 'Geluid en muziek', [[true, 'Aan'], [false, 'Uit']]], ['ctl', 'Knoppen', [['normaal', 'Normaal'], ['groot', 'Groot']]]].map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  }
  $('#ggLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b && !b.disabled) load(+b.dataset.n); });
  $('#ggOptList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); applyCtl(); layout(); renderStart(); });
  $('#ggStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#ggEndNext').addEventListener('click', () => load(Math.min(LEVELS.length - 1, lv + 1)));
  $('#ggEndRetry').addEventListener('click', () => load(lv));
  $('#ggEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('ggStartModal'); });
  $('#ggBack').addEventListener('click', () => leave());
  $('#ggLevelsBtn').addEventListener('click', () => { renderStart(); openModal('ggStartModal'); });
  $('#ggRetry').addEventListener('click', () => { if (g && state === 'play') { prog.deaths++; saveProg(); load(lv); } });
  function applyCtl() { $('#gg').classList.toggle('big-ctl', opt.ctl === 'groot'); }
  // controls: hold buttons (multi-touch), dig on press
  const held = new Map(), ctlEl = $('#ggCtl');
  const actAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('#ggCtl [data-act]'); return b ? b.dataset.act : null; };
  function recompute() { keys.l = keys.r = keys.u = keys.d = false; for (const a of held.values()) if (a in keys) keys[a] = true; ctlEl.querySelectorAll('[data-act]').forEach(b => b.classList.toggle('on', [...held.values()].includes(b.dataset.act))); }
  ctlEl.addEventListener('pointerdown', e => { const a = actAt(e.clientX, e.clientY); if (!a) return; e.preventDefault(); ctlEl.setPointerCapture(e.pointerId); held.set(e.pointerId, a); if (a === 'dl' || a === 'dr') { digReq = a === 'dl' ? -1 : 1; vibrate(8); } recompute(); });
  ctlEl.addEventListener('pointermove', e => { if (!held.has(e.pointerId)) return; const a = actAt(e.clientX, e.clientY); if (a && a !== held.get(e.pointerId) && a !== 'dl' && a !== 'dr') { held.set(e.pointerId, a); recompute(); } });
  const rel = e => { held.delete(e.pointerId); recompute(); };
  ctlEl.addEventListener('pointerup', rel); ctlEl.addEventListener('pointercancel', rel);
  window.addEventListener('keydown', e => { if (current !== 'gg') return; const k = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[e.key]; if (k) { keys[k] = true; e.preventDefault(); } if (e.key === 'z' || e.key === 'q') digReq = -1; if (e.key === 'x' || e.key === 'e') digReq = 1; });
  window.addEventListener('keyup', e => { const k = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[e.key]; if (k) keys[k] = false; });
  window.addEventListener('resize', () => { if (current === 'gg') layout(); });

  function enter() {
    show('gg'); applyCtl(); layout();
    if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
    if (!g) { load(Math.min(prog.unlocked, LEVELS.length) - 1); }
    renderStart(); openModal('ggStartModal');
  }
  function leave() { running = false; cancelAnimationFrame(raf); held.clear(); recompute(); closeModals(); show('menu'); refreshMenu(); }
  window.__gg = { get P() { return P; }, get moles() { return moles; }, get g() { return g; }, get state() { return state; }, get goldLeft() { return goldLeft; }, load, keys, dig: d => { digReq = d; }, get holes() { return holes; }, LEVELS };
  return { enter, leave, hasSave: () => false };
})();
$('#tileGg').addEventListener('click', () => Goldmine.enter());
