/* ================================================================
   DE DRIE KABOUTERS – original co-op puzzle platformer: switch between
   Snel (jumps), Sterk (hammer, pushes crates) and Schild (mushroom
   shield: blocks, glides, is a step) and bring all three to the exit
   ================================================================ */
const Gnomes = (() => {
/*LEVELS*/
  const RW = 14, NAMES = ['Snel', 'Sterk', 'Schild'], SPD = [6.2, 4.4, 4.2];
  const G = 60, MAXF = 22, GLIDE = 3.4, JV = 18.6, CLIMB = 3.6, STEP = 1 / 120, SHTOP = .26;
  const D = { sound: true, ctl: 'normaal' };
  const opt = Object.assign({}, D, store.get('kb.settings', {}));
  const saveOpt = () => store.set('kb.settings', opt);
  let prog = Object.assign({ unlocked: 1, best: {}, done: 0, deaths: 0 }, store.get('kb.progress', {}));
  const saveProg = () => store.set('kb.progress', prog);
  Sfx.gate('kb', () => opt.sound);
  const wrap = $('#kbWrap'), cv = $('#kbCanvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, T = 32, vw = 12, vhA = 12, raf = 0, running = false, lastT = 0, acc = 0, manual = false;
  let lv = 0, g = null, Wd = 0, gn = [], cur = 0, crates = [], spiders = [], archers = [], arrows = [], parts = [], exits = [];
  let lever = [false, false, false], act = [false, false, false], pressed = [false, false, false], keyCount = 0;
  let state = 'idle', stateT = 0, time = 0, clock = 0, cam = { x: 0, y: 0 }, theme = 'bos', newRec = false;
  const keys = { l: false, r: false, u: false, d: false, j: false }; let jumpBuf = 0, actReq = false;
  const sfx = (n, a, x) => { if (!opt.sound) return; const p = x == null ? 0 : Math.max(-.6, Math.min(.6, (x - cam.x - vw / 2) / vw)); Sfx.play(n, a, p); };

  /* ---------- level ---------- */
  const mkGnome = (k, c, r) => ({ k, x: c + .15, y: r + 1 - .92, w: .7, h: .92, vx: 0, vy: 0, onGround: true, climb: false, face: 1, hearts: 3, inv: 0, anim: 0, airTop: r, coyote: 0, dropT: 0, support: null, shieldUp: false, hamT: 0, hamHit: true, push: 0, lastDx: 0, home: false, pull: 0 });
  function load(n, quiet) {
    lv = n; const L = LEVELS[n]; theme = L.t || 'bos';
    g = L.m.map(r => r.split('')); Wd = g[0].length;
    gn = []; crates = []; spiders = []; archers = []; arrows = []; parts = []; exits = [];
    lever = [false, false, false]; act = [false, false, false]; pressed = [false, false, false]; keyCount = 0; time = 0; acc = 0;
    const st = [];
    for (let r = 0; r < RW; r++) for (let c = 0; c < Wd; c++) {
      const ch = g[r][c];
      if ('STY'.includes(ch)) { st['STY'.indexOf(ch)] = [c, r]; g[r][c] = '.'; }
      else if (ch === 'C') { crates.push({ x: c, y: r, w: 1, h: 1, vy: 0, onGround: true }); g[r][c] = '.'; }
      else if (ch === 'x') { spiders.push({ x: c + .1, y: r + .5, w: .8, h: .5, vx: 1.6, dead: 0, anim: Math.random() * 5 }); g[r][c] = '.'; }
      else if (ch === 'L' || ch === 'R') { archers.push({ c, r, face: ch === 'R' ? 1 : -1, cd: 1, wind: 0, dead: 0 }); g[r][c] = '.'; }
    }
    for (let r = 0; r < RW; r++) for (let c = 0; c < Wd; c++) if (g[r][c] === 'E' && (c === 0 || g[r][c - 1] !== 'E')) { let n2 = 0; while (g[r][c + n2] === 'E') n2++; exits.push({ c, r, n: n2 }); }
    for (let i = 0; i < 3; i++) gn.push(mkGnome(i, st[i][0], st[i][1]));
    cur = 0; state = 'play'; stateT = 0; held.clear(); recompute();
    snapCam(); hud(); closeModals();
    banner(quiet ? `${n + 1}. ${L.n}` : `<b>${n + 1}. ${L.n}</b><br>${L.h}`, quiet ? 1400 : 6000);
  }

  /* ---------- tiles ---------- */
  const at = (c, r) => (c < 0 || c >= Wd || r >= RW) ? '#' : r < 0 ? '.' : g[r][c];
  const solidCh = ch => ch === '#' || ch === 'X' || ch === '%' || ch === 'D' || (ch === 'a' && !act[1]) || (ch === 'c' && !act[2]) || (ch === 'g' && act[1]) || (ch === 'j' && act[2]);
  const solid = (c, r) => solidCh(at(c, r));
  const ladder = (c, r) => { const ch = at(c, r); return ch === 'H' || (ch === 'h' && act[1]) || (ch === 'i' && act[2]); };
  const oneway = (c, r) => at(c, r) === '=' || (ladder(c, r) && !ladder(c, r - 1));
  function hitsSolid(x, y, w, h) {
    for (let c = Math.floor(x); c <= Math.floor(x + w - 1e-6); c++) for (let r = Math.floor(y); r <= Math.floor(y + h - 1e-6); r++) if (solid(c, r)) return [c, r];
    return null;
  }
  const ov = (a, b, m = 0) => a.x < b.x + b.w && a.x + a.w > b.x && a.y + m < b.y + b.h && a.y + a.h - m > b.y;
  function openDoor(c, r) {
    let r0 = r; while (at(c, r0 - 1) === 'D') r0--;
    for (let rr = r0; at(c, rr) === 'D'; rr++) { g[rr][c] = '.'; burst(c + .5, rr + .5, '#a8743a', 8); }
    keyCount--; sfx('kbDoor', null, c); banner('🔓 De deur is open!', 1300); hud();
  }

  /* ---------- physics ---------- */
  function moveX(e, dx) {
    if (!dx) return;
    e.x += dx;
    let hit = hitsSolid(e.x, e.y + .03, e.w, e.h - .06);
    if (hit && at(hit[0], hit[1]) === 'D' && keyCount > 0) { openDoor(hit[0], hit[1]); hit = hitsSolid(e.x, e.y + .03, e.w, e.h - .06); }
    if (hit) { e.x = dx > 0 ? hit[0] - e.w - 1e-4 : hit[0] + 1 + 1e-4; e.vx = 0; }
    for (const k of crates) {
      if (!ov(e, k, .03)) continue;
      if (e.k === 1 && e.onGround && k.onGround && e.y + e.h > k.y + .5 && Math.sign(dx) === Math.sign(k.x + .5 - e.x - e.w / 2)) {
        const old = k.x; k.x = dx > 0 ? e.x + e.w : e.x - 1;
        if (hitsSolid(k.x, k.y + .02, 1, .96) || crates.some(o => o !== k && ov(k, o, .01)) || gn.some(o => o !== e && ov(k, o, .05) && o.y + o.h <= k.y + 1.01 && o.y + o.h > k.y + .3)) k.x = old;
        else { e.push = .12; if (Math.random() < dx * 2) sfx('pfCrate', null, k.x); continue; }
      }
      e.x = dx > 0 ? k.x - e.w - 1e-4 : k.x + 1 + 1e-4; e.vx = 0;
    }
  }
  function moveY(e, dy) {
    const pb = e.y + e.h, pt = e.y; e.y += dy; e.onGround = false; e.support = null;
    const c0 = Math.floor(e.x + .02), c1 = Math.floor(e.x + e.w - .02);
    if (dy >= 0) {
      const nb = e.y + e.h; let best = Infinity, sup = null;
      for (let r = Math.ceil(pb - 2e-3); r <= Math.floor(nb) && best === Infinity; r++)
        for (let c = c0; c <= c1; c++) if (solid(c, r) || (!e.climb && e.dropT <= 0 && oneway(c, r))) { best = r; sup = 'tile'; break; }
      for (const k of crates) if (k !== e && e.x < k.x + 1 && e.x + e.w > k.x && k.y >= pb - 2e-3 && k.y <= nb && k.y < best) { best = k.y; sup = k; }
      const s = gn[2];
      if (e !== s && s && s.shieldUp && !s.climb) { const top = s.y - SHTOP; if (e.x < s.x + s.w + .12 && e.x + e.w > s.x - .12 && top >= pb - 2e-3 && top <= nb && top < best) { best = top; sup = s; } }
      if (best < Infinity) { e.y = best - e.h; e.vy = 0; e.onGround = true; e.support = sup; }
    } else {
      const nt = e.y;
      for (let r = Math.floor(pt + 2e-3) - 1; r >= Math.floor(nt); r--) {
        let hit = false; for (let c = c0; c <= c1; c++) if (solid(c, r)) { hit = true; break; }
        if (hit) { e.y = r + 1; e.vy = 0; break; }
      }
      for (const k of crates) if (k !== e && e.x < k.x + 1 && e.x + e.w > k.x && k.y + 1 <= pt + 2e-3 && k.y + 1 >= e.y) { e.y = k.y + 1; e.vy = 0; }
    }
  }
  const crateFloor = (c, r, self) => solid(c, r) || oneway(c, r) || at(c, r) === 'w' || crates.some(o => o !== self && o.y === r && Math.abs(o.x - c) < .99);
  function updCrate(k, dt) {
    if (k.onGround) {
      const cc = Math.floor(k.x + .5), r = Math.round(k.y + 1);
      const l = crateFloor(Math.floor(k.x + .02), r, k), rr = crateFloor(Math.floor(k.x + .98), r, k);
      if (!l && !rr || !crateFloor(cc, r, k) && Math.abs(k.x - cc) < .5) {
        if (!crateFloor(cc, r, k)) { k.x = cc; k.onGround = false; for (const e of gn) if (ov(e, k, .05)) e.x = e.x + e.w / 2 < k.x + .5 ? k.x - e.w - 1e-3 : k.x + 1 + 1e-3; }
      }
      if (k.onGround) return;
    }
    k.vy = Math.min(MAXF, k.vy + G * dt); const pb = k.y + 1, nb = pb + k.vy * dt; k.y += k.vy * dt;
    for (let r = Math.ceil(pb - 2e-3); r <= Math.floor(nb); r++) {
      let hit = false; for (let c = Math.floor(k.x + .02); c <= Math.floor(k.x + .98); c++) if (crateFloor(c, r, k)) hit = true;
      if (hit) { k.y = r - 1; k.vy = 0; k.onGround = true; sfx('rsLand', null, k.x); burst(k.x + .5, k.y + 1, at(Math.floor(k.x + .5), r) === 'w' ? '#9fd8ff' : '#c9a070', 8); if (at(Math.floor(k.x + .5), r) === 'w') sfx('pfSplash', null, k.x); break; }
    }
    if (k.y > RW + 2) crates.splice(crates.indexOf(k), 1);
  }
  const startClimb = e => { e.climb = true; e.vx = 0; e.vy = 0; e.onGround = false; };
  function updGnome(e, dt) {
    const ctl = e === gn[cur] && state === 'play';
    e.inv = Math.max(0, e.inv - dt); e.dropT -= dt; e.push -= dt; e.pull -= dt;
    if (e.hamT > 0) hammerTick(e, dt);
    const ix = ctl ? (keys.r ? 1 : 0) - (keys.l ? 1 : 0) : 0, cx = Math.floor(e.x + e.w / 2), x0 = e.x;
    if (ctl && !e.climb) {
      const body = ladder(cx, Math.floor(e.y + e.h * .5)) || ladder(cx, Math.floor(e.y + e.h - .05));
      if (keys.u && body) startClimb(e);
      else if (keys.d && e.onGround && ladder(cx, Math.floor(e.y + e.h + .02))) { startClimb(e); e.y += .06; }
    }
    if (e.climb) {
      e.x += (cx + .5 - e.w / 2 - e.x) * Math.min(1, dt * 14);
      const v = ctl ? (keys.d ? 1 : 0) - (keys.u ? 1 : 0) : 0;
      e.vx = 0; e.vy = 0; if (v) e.anim += dt;
      if (ctl && e.k === 0 && jumpBuf > 0) { jumpBuf = 0; e.climb = false; e.vy = -JV * .8; e.vx = ix * SPD[0]; sfx('pfJump', null, e.x); }
      else if (ix && !v) e.climb = false;
      else if (v < 0) {
        e.y -= CLIMB * dt;
        const hs = hitsSolid(e.x + .05, e.y, e.w - .1, .1); if (hs) e.y = hs[1] + 1;
        const fr = Math.floor(e.y + e.h - .001);
        if (!ladder(cx, fr)) { e.y = fr + 1 - e.h; e.climb = false; e.onGround = true; }
      } else if (v > 0) {
        moveY(e, CLIMB * dt);
        if (e.onGround) e.climb = false;
        else if (!ladder(cx, Math.floor(e.y + e.h * .5)) && !ladder(cx, Math.floor(e.y + e.h - .02))) e.climb = false;
      }
      e.airTop = e.y; e.lastDx = e.x - x0;
      if (e.climb) { e.onGround = false; hazards(e); return; }
    }
    const sp = SPD[e.k] * (e.push > 0 ? .55 : 1) * (e.k === 2 && e.shieldUp ? .9 : 1) * (e.hamT > 0 && e.onGround ? .3 : 1);
    const a = e.onGround ? 60 : 32;
    e.vx += Math.max(-a * dt, Math.min(a * dt, ix * sp - e.vx));
    if (ix && e.hamT <= 0) e.face = ix;
    if (ctl && jumpBuf > 0 && e.k === 0 && (e.onGround || e.coyote > 0)) { e.vy = -JV; e.onGround = false; e.coyote = 0; jumpBuf = 0; e.support = null; sfx('pfJump', null, e.x); }
    if (e.k === 0 && !(ctl && keys.j) && e.vy < -7) e.vy += G * 1.4 * dt;
    e.vy = Math.min(e.vy + G * dt, e.k === 2 && e.shieldUp ? GLIDE : MAXF);
    if (ctl && keys.d && e.onGround && e.support === 'tile') { const r = Math.round(e.y + e.h); for (let c = Math.floor(e.x + .02); c <= Math.floor(e.x + e.w - .02); c++) if (at(c, r) === '=') e.dropT = .2; }
    const carry = e.support && e.support.k === 2 && e.support !== e ? e.support.lastDx : 0;
    moveX(e, e.vx * dt + carry);
    const air = !e.onGround;
    moveY(e, e.vy * dt);
    if (e.onGround) { if (air) land(e); e.airTop = e.y; e.coyote = .09; } else { e.airTop = Math.min(e.airTop, e.y); e.coyote -= dt; }
    if (e.onGround && Math.abs(e.vx) > .3) e.anim += dt * Math.abs(e.vx) / 4.5;
    e.lastDx = e.x - x0;
    hazards(e);
  }
  function land(e) {
    const drop = e.y - e.airTop;
    if (drop > 1.3) { burst(e.x + e.w / 2, e.y + e.h, theme === 'bos' ? '#b9d48a' : '#a9a2b0', 6, .5); sfx('rsLand', null, e.x); }
    if (e.k === 2 && e.shieldUp) return;
    if (drop > 7.5) { e.hearts = 0; hud(); sfx('pfHurt', null, e.x); fail(`${NAMES[e.k]} viel veel te diep…`); }
    else if (drop > 4.5) hurt(e, 1, 0);
  }
  function hazards(e) {
    const c0 = Math.floor(e.x + .05), c1 = Math.floor(e.x + e.w - .05), r0 = Math.floor(e.y + .05), r1 = Math.floor(e.y + e.h - .05);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      const ch = at(c, r);
      if (ch === 'k') { g[r][c] = '.'; keyCount++; sfx('pfCoin', null, c); burst(c + .5, r + .5, '#ffd84a', 12, 1, true); banner('🗝 Sleutel gevonden!', 1200); hud(); }
      else if (ch === 'f' && e.hearts < 3) { g[r][c] = '.'; e.hearts++; sfx('pfPower', null, c); burst(c + .5, r + .5, '#ff7a8a', 12, 1, true); hud(); }
      else if (ch === '^' && e.y + e.h > r + .55) { hurt(e, 1, 0); if (e.vy >= 0) { e.vy = -11; e.onGround = false; e.climb = false; } }
      else if (ch === 'w' && e.y + e.h > r + .35 && state === 'play') { burst(e.x + e.w / 2, r + .3, '#9fd8ff', 16); sfx('pfSplash', null, c); e.hearts = 0; hud(); fail(`${NAMES[e.k]} is in het water gevallen!`); }
    }
    if (e.y > RW + 1 && state === 'play') fail(`${NAMES[e.k]} is in de diepte gevallen!`);
  }
  function hurt(e, n, dir) {
    if (e.inv > 0 || state !== 'play') return false;
    e.hearts = Math.max(0, e.hearts - n); e.inv = 1.3; sfx('pfHurt', null, e.x); vibrate(40);
    if (dir) { e.vx = dir * 6; e.vy = -8; e.onGround = false; e.climb = false; }
    burst(e.x + e.w / 2, e.y + .4, '#ff5a6a', 10);
    hud();
    if (e.hearts <= 0) fail(`${NAMES[e.k]} is uitgeschakeld!`);
    return true;
  }
  function fail(msg) {
    if (state !== 'play') return; state = 'fail'; stateT = 1.9; prog.deaths++; saveProg(); sfx('pfDie'); vibrate(80); banner(msg, 1700);
  }
  function win() {
    if (state !== 'play') return; state = 'win'; stateT = 1.8; sfx('pfWin');
    const b = prog.best[lv], t = Math.round(time); prog.best[lv] = b == null ? t : Math.min(b, t); newRec = b == null || t < b;
    if (lv + 2 > prog.unlocked && lv + 1 < LEVELS.length) prog.unlocked = lv + 2; prog.done = Math.max(prog.done, Object.keys(prog.best).length); saveProg();
    for (const e of gn) burst(e.x + e.w / 2, e.y + .3, ['#ffd84a', '#7fe08a', '#7fc4ff'][e.k], 16, 1.2, true);
  }

  /* ---------- abilities ---------- */
  function doAction() {
    const e = gn[cur]; if (state !== 'play') return;
    const cx = Math.floor(e.x + e.w / 2);
    for (let r = Math.floor(e.y + .1); r <= Math.floor(e.y + e.h - .1); r++) {
      const ch = at(cx, r);
      if (ch === '!' || ch === '?') { const i = ch === '!' ? 1 : 2; lever[i] = !lever[i]; e.pull = .35; sfx('kbLever', null, cx); vibrate(12); burst(cx + .5, r + .4, i === 1 ? '#ffcf3a' : '#5ab8ff', 8, .6, true); return; }
    }
    if (e.k === 1) { if (e.hamT <= 0 && !e.climb) { e.hamT = .32; e.hamHit = false; } }
    else if (e.k === 2) { if (!e.climb) { e.shieldUp = !e.shieldUp; sfx('kbShield', null, e.x); hud(); } }
    else { banner('Snel kan springen en hendels overhalen', 1200); }
  }
  function hammerTick(e, dt) {
    e.hamT -= dt;
    if (!e.hamHit && e.hamT < .17) {
      e.hamHit = true;
      const box = { x: e.face > 0 ? e.x + e.w - .1 : e.x - 1.05, y: e.y - .15, w: 1.15, h: e.h + .1 }; let hit = false;
      for (let c = Math.floor(box.x); c <= Math.floor(box.x + box.w); c++) for (let r = Math.floor(box.y); r <= Math.floor(box.y + box.h - .01); r++) if (at(c, r) === '%') { crumble(c, r); hit = true; }
      for (const s of spiders) if (!s.dead && ov(box, s)) { s.dead = .001; hit = true; burst(s.x + .4, s.y + .25, '#6a4a8a', 14); sfx('pfStomp', null, s.x); }
      for (const a of archers) if (!a.dead && ov(box, { x: a.c + .15, y: a.r, w: .7, h: 1 })) { a.dead = .001; hit = true; burst(a.c + .5, a.r + .5, '#7a9a4a', 16); sfx('pfStomp', null, a.c); }
      sfx(hit ? 'kbHit' : 'kbSwing', null, e.x); if (hit) vibrate(25);
    }
  }
  function crumble(c0, r0) {
    const q = [[c0, r0]]; let n = 0;
    while (q.length && n < 20) {
      const [c, r] = q.pop(); if (at(c, r) !== '%') continue; g[r][c] = '.'; n++;
      for (let i = 0; i < 9; i++) parts.push({ x: c + Math.random(), y: r + Math.random(), vx: (Math.random() - .5) * 6, vy: -Math.random() * 6, life: .7 + Math.random() * .4, col: ['#8d8a84', '#6e6a64', '#a9a49b'][i % 3], s: .06 + Math.random() * .07, gr: 1, sq: 1 });
      q.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
    }
    sfx('pfCrumble', null, c0);
  }

  /* ---------- enemies ---------- */
  function updSpider(s, dt) {
    if (s.dead) { s.dead += dt; return; }
    s.anim += dt;
    const nx = s.x + s.vx * dt, front = s.vx > 0 ? nx + s.w : nx, fc = Math.floor(front), fr = Math.floor(s.y + s.h + .05), br = Math.floor(s.y + .1);
    const blocked = solid(fc, br) || !(solid(fc, fr) || oneway(fc, fr)) || at(fc, br) === '^' || crates.some(k => ov({ x: nx, y: s.y, w: s.w, h: s.h }, k, .02));
    if (blocked) s.vx = -s.vx; else s.x = nx;
    if (state === 'play') for (const e of gn) if (ov(e, s, .05)) touchSpider(e, s);
  }
  function touchSpider(e, s) {
    const dir = Math.sign(s.x + s.w / 2 - e.x - e.w / 2) || 1;
    if (e.k === 2 && !e.shieldUp && e.face === dir) { s.vx = Math.abs(s.vx) * dir; const nx = dir > 0 ? e.x + e.w + .02 : e.x - s.w - .02; if (!hitsSolid(nx, s.y, s.w, s.h)) s.x = nx; sfx('kbBlock', null, s.x); return; }
    if (hurt(e, 1, -dir)) s.vx = Math.abs(s.vx) * dir;
  }
  function updArcher(a, dt) {
    if (a.dead) { a.dead += dt; return; }
    a.cd -= dt;
    if (a.wind > 0) { a.wind -= dt; if (a.wind <= 0) { arrows.push({ x: a.c + .5 + a.face * .45, y: a.r + .48, vx: a.face * 9, t: 0 }); sfx('arrow', null, a.c); a.cd = 1.15; } return; }
    if (a.cd > 0 || state !== 'play') return;
    for (const e of gn) {
      const ex = e.x + e.w / 2, d = (ex - a.c - .5) * a.face;
      if (d <= 0 || d > 11 || e.y + e.h < a.r + .3 || e.y > a.r + .7) continue;
      let clear = true; for (let c = a.c + a.face; c !== Math.floor(ex); c += a.face) if (solid(c, a.r)) { clear = false; break; }
      if (clear) { a.wind = .45; break; }
    }
  }
  function updArrow(p, dt) {
    p.x += p.vx * dt; p.t += dt;
    if (solid(Math.floor(p.x), Math.floor(p.y)) || p.x < -1 || p.x > Wd + 1 || p.t > 3) { p.dead = 1; burst(p.x, p.y, '#c9a070', 5, .4); return; }
    for (const k of crates) if (p.x > k.x && p.x < k.x + 1 && p.y > k.y && p.y < k.y + 1) { p.dead = 1; sfx('kbBlock', null, p.x); return; }
    let best = null, bx = 0;
    for (const e of gn) {
      const sh = e.k === 2 && !e.shieldUp && !e.climb, x0 = e.x - (sh && e.face < 0 ? .3 : 0), x1 = e.x + e.w + (sh && e.face > 0 ? .3 : 0);
      if (p.x < x0 || p.x > x1 || p.y < e.y || p.y > e.y + e.h) continue;
      const edge = p.vx < 0 ? x1 : -x0; if (!best || edge > bx) { best = e; bx = edge; }
    }
    if (!best) return;
    const e = best, sh = e.k === 2 && !e.shieldUp && !e.climb; p.dead = 1;
    if (sh && e.face === -Math.sign(p.vx)) { sfx('kbBlock', null, p.x); burst(p.x, p.y, '#fff2b0', 8, .6, true); }
    else hurt(e, 1, Math.sign(p.vx));
  }

  /* ---------- switches & flow ---------- */
  function updSwitches() {
    pressed = [false, false, false];
    const test = b => { const r = Math.floor(b.y + b.h - .05); for (let c = Math.floor(b.x + .2); c <= Math.floor(b.x + b.w - .2); c++) { const ch = at(c, r); if (ch === '1') pressed[1] = true; else if (ch === '2') pressed[2] = true; } };
    gn.forEach(e => { if (e.onGround) test(e); }); crates.forEach(k => { if (k.onGround) test(k); });
    for (const i of [1, 2]) { const a = lever[i] || pressed[i]; if (a !== act[i]) { act[i] = a; sfx('kbGate'); vibrate(10); gateFx(i); } }
  }
  function gateFx(i) {
    const set = i === 1 ? 'agh' : 'cji';
    for (let r = 0; r < RW; r++) for (let c = 0; c < Wd; c++) if (set.includes(g[r][c])) for (let k = 0; k < 2; k++) parts.push({ x: c + Math.random(), y: r + Math.random(), vx: 0, vy: -1, life: .6, col: i === 1 ? '#ffe27a' : '#8fd0ff', s: .05, gl: 1 });
  }
  function step(dt) {
    clock += dt;
    if (state === 'play') {
      time += dt; if (jumpBuf > 0) jumpBuf -= dt;
      if (actReq) { actReq = false; doAction(); }
      updSwitches();
      for (const k of crates.slice()) updCrate(k, dt);
      for (const i of [2, 0, 1]) updGnome(gn[i], dt);
      for (const s of spiders) updSpider(s, dt); spiders = spiders.filter(s => !s.dead || s.dead < .5);
      for (const a of archers) updArcher(a, dt); archers = archers.filter(a => !a.dead || a.dead < .6);
      for (const p of arrows) updArrow(p, dt); arrows = arrows.filter(p => !p.dead);
      let all = state === 'play';
      for (const e of gn) { const h = e.onGround && at(Math.floor(e.x + e.w / 2), Math.floor(e.y + e.h - .1)) === 'E'; if (h && !e.home) { sfx('kbHome', null, e.x); e.home = true; hud(); } else if (!h && e.home) { e.home = false; hud(); } all = all && h; }
      if (all) win();
    } else if (state === 'fail') { stateT -= dt; if (stateT <= 0) load(lv, true); }
    else if (state === 'win') { stateT -= dt; for (const e of gn) e.anim += dt; if (stateT <= 0) { state = 'idle'; showWin(); } }
    for (const p of parts) { p.life -= dt; p.vy += (p.gr != null ? p.gr : .6) * 12 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    if (parts.length) parts = parts.filter(p => p.life > 0);
  }
  function burst(x, y, col, n, sp = 1, gl = false) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 5 * sp, vy: -Math.random() * 4 * sp, life: .5 + Math.random() * .3, col, s: .05 + Math.random() * .04, gl }); }

  /* ---------- camera ---------- */
  function camTarget() {
    const e = gn[cur], ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    const tx = vw >= Wd ? (Wd - vw) / 2 : Math.max(0, Math.min(Wd - vw, ex - vw / 2));
    const lo = Math.min(0, RW - vhA), hi = RW - vhA, ty = Math.max(lo, Math.min(hi, ey - vhA * .55));
    return [tx, ty];
  }
  function snapCam() { if (!gn.length) return; const [x, y] = camTarget(); cam.x = x; cam.y = y; }
  function camUpdate(dt) { if (!gn.length) return; const [x, y] = camTarget(), k = Math.min(1, dt * 7); cam.x += (x - cam.x) * k; cam.y += (y - cam.y) * k; }

  /* ---------- drawing: sprites ---------- */
  let SP = {}, spKey = '';
  const THEME = {
    bos: { dirt: ['#8a5a34', '#6b4226'], top: ['#7ccf4a', '#4f9a2c'], stone: ['#9aa0a8', '#5d636c'], edge: '#3d2a1c', below: '#4e331f' },
    grot: { dirt: ['#5a5466', '#3c3746'], top: ['#6a9a6a', '#3f6a4a'], stone: ['#6f7684', '#454b58'], edge: '#1d1a24', below: '#2a2633' },
    burcht: { dirt: ['#7a7286', '#4f485c'], top: ['#9c94a8', '#6a6278'], stone: ['#6d6680', '#433c54'], edge: '#1b1726', below: '#2c263a' },
  };
  function sprites() {
    const s = Math.max(8, Math.round(T * dpr)); if (spKey === s + theme) return; spKey = s + theme; SP = {};
    const th = THEME[theme];
    const mk = (fn, w = 1, h = 1) => { const c = document.createElement('canvas'); c.width = Math.ceil(s * w); c.height = Math.ceil(s * h); const x = c.getContext('2d'); x.scale(s, s); x.lineJoin = x.lineCap = 'round'; fn(x); return c; };
    let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const dirt = x => {
      if (theme === 'burcht') {
        x.fillStyle = th.dirt[1]; x.fillRect(0, 0, 1, 1);
        for (let row = 0; row < 2; row++) for (let k = -1; k < 2; k++) { const bx = k * .5 + (row ? .25 : 0) + .02, by = row * .5 + .02, q = x.createLinearGradient(0, by, 0, by + .46); q.addColorStop(0, th.dirt[0]); q.addColorStop(1, th.dirt[1]); x.fillStyle = q; x.beginPath(); x.roundRect ? x.roundRect(bx, by, .46, .46, .04) : x.rect(bx, by, .46, .46); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(bx + .03, by + .02, .4, .03); }
        return;
      }
      const q = x.createLinearGradient(0, 0, 0, 1); q.addColorStop(0, th.dirt[0]); q.addColorStop(1, th.dirt[1]); x.fillStyle = q; x.fillRect(0, 0, 1, 1);
      for (let i = 0; i < 7; i++) { x.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,230,200'},${.08 + rnd() * .1})`; x.beginPath(); x.ellipse(rnd(), rnd(), .05 + rnd() * .08, .04 + rnd() * .05, rnd() * 3, 0, 7); x.fill(); }
    };
    SP.ground = mk(dirt);
    SP.groundTop = mk(x => {
      dirt(x);
      const q = x.createLinearGradient(0, 0, 0, .3); q.addColorStop(0, th.top[0]); q.addColorStop(1, th.top[1]); x.fillStyle = q;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(1, 0); x.lineTo(1, .2); for (let i = 6; i >= 0; i--) x.lineTo(i / 6, .2 + (i % 2 ? .1 : .02)); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 0, 1, .04);
      if (theme === 'bos') { x.strokeStyle = th.top[0]; x.lineWidth = .03; for (let i = 0; i < 5; i++) { const gx = .1 + i * .2; x.beginPath(); x.moveTo(gx, .02); x.lineTo(gx - .03, -.08); x.stroke(); } }
    });
    SP.stone = mk(x => {
      const q = x.createLinearGradient(0, 0, 1, 1); q.addColorStop(0, th.stone[0]); q.addColorStop(1, th.stone[1]); x.fillStyle = q; x.fillRect(0, 0, 1, 1);
      x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(0, 0, 1, .05); x.fillRect(0, 0, .05, 1); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, .95, 1, .05); x.fillRect(.95, 0, .05, 1);
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = .025; x.beginPath(); x.moveTo(.2, .3); x.lineTo(.45, .38); x.lineTo(.6, .25); x.moveTo(.3, .75); x.lineTo(.7, .7); x.stroke();
    });
    SP.cracked = mk(x => {
      const q = x.createRadialGradient(.4, .35, .05, .5, .5, .7); q.addColorStop(0, '#b3aa9c'); q.addColorStop(1, '#6d665c'); x.fillStyle = q; x.beginPath(); x.roundRect ? x.roundRect(.02, .02, .96, .96, .16) : x.rect(.02, .02, .96, .96); x.fill();
      x.strokeStyle = '#3d3830'; x.lineWidth = .045; x.beginPath(); x.moveTo(.5, .02); x.lineTo(.42, .3); x.lineTo(.58, .48); x.lineTo(.4, .7); x.lineTo(.5, .98); x.moveTo(.58, .48); x.lineTo(.85, .55); x.moveTo(.42, .3); x.lineTo(.15, .25); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.ellipse(.3, .2, .15, .06, -.3, 0, 7); x.fill();
    });
    SP.plank = mk(x => {
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(.02, .24, .96, .06);
      const q = x.createLinearGradient(0, 0, 0, .24); q.addColorStop(0, '#d9a866'); q.addColorStop(1, '#94642f'); x.fillStyle = q; x.fillRect(0, 0, 1, .24);
      x.strokeStyle = 'rgba(70,40,15,.6)'; x.lineWidth = .02; x.beginPath(); x.moveTo(.5, 0); x.lineTo(.5, .24); x.stroke();
      x.fillStyle = '#5a3a1a'; [.12, .38, .62, .88].forEach(px => { x.beginPath(); x.arc(px, .12, .025, 0, 7); x.fill(); });
      x.strokeStyle = '#7a5530'; x.lineWidth = .05; x.beginPath(); x.moveTo(.15, .26); x.lineTo(.3, .5); x.moveTo(.85, .26); x.lineTo(.7, .5); x.stroke();
    });
    SP.ladder = mk(x => {
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(.2, 0, .08, 1); x.fillRect(.76, 0, .08, 1);
      for (const rx of [.16, .72]) { const q = x.createLinearGradient(rx, 0, rx + .1, 0); q.addColorStop(0, '#e0b070'); q.addColorStop(1, '#8a5a2a'); x.fillStyle = q; x.fillRect(rx, 0, .1, 1); }
      for (const ry of [.18, .5, .82]) { x.fillStyle = '#6b4422'; x.fillRect(.2, ry + .03, .6, .07); x.fillStyle = '#c99556'; x.fillRect(.2, ry, .6, .06); }
    });
    SP.spikes = mk(x => {
      x.fillStyle = '#4a4650'; x.fillRect(0, .88, 1, .12);
      for (let i = 0; i < 4; i++) { const bx = i * .25, q = x.createLinearGradient(bx, 0, bx + .25, 0); q.addColorStop(0, '#e8ecf2'); q.addColorStop(1, '#7c8490'); x.fillStyle = q; x.beginPath(); x.moveTo(bx + .02, .9); x.lineTo(bx + .125, .45); x.lineTo(bx + .23, .9); x.fill(); }
    });
    const gate = col => mk(x => {
      x.fillStyle = '#2d2a33'; x.fillRect(0, 0, 1, .1); x.fillRect(0, .9, 1, .1);
      for (let i = 0; i < 4; i++) { const bx = .1 + i * .24, q = x.createLinearGradient(bx, 0, bx + .1, 0); q.addColorStop(0, '#9aa2ae'); q.addColorStop(1, '#4b525e'); x.fillStyle = q; x.fillRect(bx, 0, .09, 1); x.fillStyle = '#3a3f48'; x.beginPath(); x.moveTo(bx - .02, 1); x.lineTo(bx + .045, 1.0); x.fill(); }
      x.fillStyle = '#5a606c'; x.fillRect(0, .45, 1, .08);
      x.fillStyle = col; x.beginPath(); x.arc(.5, .49, .08, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(.48, .47, .025, 0, 7); x.fill();
    });
    SP.gate1 = gate('#ffc531'); SP.gate2 = gate('#43a8ff');
    const bridge = col => mk(x => {
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, .3, 1, .08);
      const q = x.createLinearGradient(0, 0, 0, .3); q.addColorStop(0, '#c99a5a'); q.addColorStop(1, '#7a5228'); x.fillStyle = q; x.fillRect(0, 0, 1, .3);
      x.strokeStyle = 'rgba(60,35,15,.6)'; x.lineWidth = .025; for (const px of [.33, .66]) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, .3); x.stroke(); }
      x.strokeStyle = col; x.lineWidth = .04; x.beginPath(); x.moveTo(0, .02); x.lineTo(1, .02); x.stroke();
    });
    SP.bridge1 = bridge('#ffd54a'); SP.bridge2 = bridge('#5ab8ff');
    SP.crate = mk(x => {
      x.fillStyle = '#6b4220'; x.fillRect(0, 0, 1, 1);
      const q = x.createLinearGradient(0, 0, 1, 1); q.addColorStop(0, '#d6a25e'); q.addColorStop(1, '#9a6630'); x.fillStyle = q; x.fillRect(.07, .07, .86, .86);
      x.strokeStyle = 'rgba(80,45,15,.55)'; x.lineWidth = .02; for (const py of [.33, .66]) { x.beginPath(); x.moveTo(.07, py); x.lineTo(.93, py); x.stroke(); }
      x.strokeStyle = '#7a4c22'; x.lineWidth = .1; x.beginPath(); x.moveTo(.12, .12); x.lineTo(.88, .88); x.stroke();
      x.fillStyle = '#4a4a50'; [[.1, .1], [.9, .1], [.1, .9], [.9, .9]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, .04, 0, 7); x.fill(); });
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(.07, .07, .86, .04);
    });
    SP.door = mk(x => {
      const q = x.createLinearGradient(0, 0, 1, 0); q.addColorStop(0, '#7a4a22'); q.addColorStop(.5, '#a8743a'); q.addColorStop(1, '#6a3c1a'); x.fillStyle = q; x.fillRect(.04, 0, .92, 1);
      x.strokeStyle = 'rgba(50,25,10,.6)'; x.lineWidth = .025; for (const px of [.27, .5, .73]) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 1); x.stroke(); }
      x.fillStyle = '#3a3a44'; x.fillRect(.04, .15, .92, .08); x.fillRect(.04, .77, .92, .08);
    });
    SP.key = mk(x => {
      x.strokeStyle = '#8a5a06'; x.lineWidth = .05; const q = x.createLinearGradient(0, .3, 0, .7); q.addColorStop(0, '#fff3a6'); q.addColorStop(1, '#e0a012'); x.fillStyle = q;
      x.beginPath(); x.arc(.32, .5, .16, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#6b4a10'; x.beginPath(); x.arc(.32, .5, .06, 0, 7); x.fill();
      x.fillStyle = q; x.fillRect(.46, .46, .38, .08); x.fillRect(.7, .54, .06, .12); x.fillRect(.8, .54, .05, .09);
    });
    SP.food = mk(x => {
      x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(.5, .92, .25, .06, 0, 0, 7); x.fill();
      x.fillStyle = '#f2e6cf'; x.beginPath(); x.moveTo(.4, .9); x.lineTo(.43, .6); x.lineTo(.57, .6); x.lineTo(.6, .9); x.fill();
      const q = x.createRadialGradient(.42, .4, .03, .5, .5, .35); q.addColorStop(0, '#ff8a6a'); q.addColorStop(1, '#c8281e'); x.fillStyle = q; x.beginPath(); x.ellipse(.5, .62, .32, .26, 0, Math.PI, 0); x.fill();
      x.fillStyle = '#fff'; [[.38, .48, .05], [.56, .42, .04], [.66, .55, .035], [.46, .57, .03]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
      x.fillStyle = '#ff6a7a'; x.font = 'bold .22px sans-serif'; x.textAlign = 'center'; x.fillText('♥', .5, .3);
    });
  }

  /* ---------- drawing: backgrounds ---------- */
  let BG = null, bgKey = '';
  function backgrounds() {
    const cw = Math.max(64, Math.ceil(W * dpr)), ch = Math.max(64, Math.ceil(H * dpr)), key = theme + cw + 'x' + ch; if (bgKey === key) return; bgKey = key;
    const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; };
    const sky = mk(), far = mk(), mid = mk(), a = sky.getContext('2d'), b = far.getContext('2d'), m = mid.getContext('2d');
    let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const wrapDraw = (x, fn) => { for (const o of [-cw, 0, cw]) { x.save(); x.translate(o, 0); fn(x); x.restore(); } };
    const ridge = (x, base, amps, col, top) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, ch); for (let i = 0; i <= 64; i++) { const px = i / 64 * cw; let y = base; amps.forEach(([k, a2, p]) => y += Math.sin(i / 64 * Math.PI * 2 * k + p) * a2 * ch); x.lineTo(px, y); } x.lineTo(cw, ch); x.fill(); if (top) { x.strokeStyle = top; x.lineWidth = 2 * dpr; x.stroke(); } };
    if (theme === 'bos') {
      let q = a.createLinearGradient(0, 0, 0, ch); q.addColorStop(0, '#62b8ee'); q.addColorStop(.55, '#bfe6fb'); q.addColorStop(1, '#e6f6dd'); a.fillStyle = q; a.fillRect(0, 0, cw, ch);
      const sx = cw * .78, sy = ch * .16, sr = Math.min(cw, ch) * .07; q = a.createRadialGradient(sx, sy, sr * .3, sx, sy, sr * 4); q.addColorStop(0, 'rgba(255,250,210,.9)'); q.addColorStop(.25, 'rgba(255,245,200,.35)'); q.addColorStop(1, 'rgba(255,245,200,0)'); a.fillStyle = q; a.fillRect(0, 0, cw, ch); a.fillStyle = '#fffbe6'; a.beginPath(); a.arc(sx, sy, sr, 0, 7); a.fill();
      for (let i = 0; i < 5; i++) { const cx = rnd() * cw, cy = ch * (.08 + rnd() * .25), r = ch * (.03 + rnd() * .03); a.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 5; k++) { a.beginPath(); a.ellipse(cx + (k - 2) * r * .9, cy - Math.sin(k / 4 * Math.PI) * r * .6, r * 1.1, r * .8, 0, 0, 7); a.fill(); } }
      ridge(b, ch * .5, [[1, .05, 0], [3, .025, 1.3], [7, .01, .4]], '#a7d3b6');
      ridge(b, ch * .58, [[2, .04, 2], [5, .015, .7]], '#86c19a');
      ridge(m, ch * .7, [[1, .02, 1], [4, .01, 2]], '#4f9a5e');
      for (let i = 0; i < 22; i++) { const tx = rnd() * cw, ty = ch * (.62 + rnd() * .1), s = ch * (.08 + rnd() * .06); wrapDraw(m, x => { x.fillStyle = '#5a3a24'; x.fillRect(tx - s * .05, ty - s * .1, s * .1, s * .5); for (let k = 0; k < 3; k++) { x.fillStyle = ['#2f7a45', '#378a4f', '#40995a'][k]; x.beginPath(); x.moveTo(tx - s * (.45 - k * .1), ty - k * s * .32); x.lineTo(tx, ty - s * (.65 + k * .3)); x.lineTo(tx + s * (.45 - k * .1), ty - k * s * .32); x.fill(); } }); }
      ridge(m, ch * .8, [[3, .01, 0]], '#3f8a4c');
    } else if (theme === 'grot') {
      let q = a.createLinearGradient(0, 0, 0, ch); q.addColorStop(0, '#1a2230'); q.addColorStop(1, '#0b0f17'); a.fillStyle = q; a.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 6; i++) { const cx = rnd() * cw, cy = rnd() * ch, r = ch * (.15 + rnd() * .2); q = a.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, `rgba(${rnd() < .5 ? '80,160,200' : '140,90,200'},.12)`); q.addColorStop(1, 'rgba(0,0,0,0)'); a.fillStyle = q; a.fillRect(0, 0, cw, ch); }
      b.fillStyle = '#222b3a'; for (let i = 0; i < 26; i++) { const x0 = rnd() * cw, w = cw * (.02 + rnd() * .04), l = ch * (.1 + rnd() * .25); wrapDraw(b, x => { x.beginPath(); x.moveTo(x0 - w, 0); x.lineTo(x0, l); x.lineTo(x0 + w, 0); x.fill(); x.beginPath(); x.moveTo(x0 - w * 1.3, ch); x.lineTo(x0 + w * .2, ch - l * .8); x.lineTo(x0 + w * 1.3, ch); x.fill(); }); }
      m.fillStyle = '#161d29'; for (let i = 0; i < 7; i++) { const x0 = rnd() * cw, w = cw * (.03 + rnd() * .04); wrapDraw(m, x => { x.beginPath(); x.moveTo(x0 - w, 0); x.quadraticCurveTo(x0 - w * .3, ch * .5, x0 - w * 1.2, ch); x.lineTo(x0 + w * 1.2, ch); x.quadraticCurveTo(x0 + w * .3, ch * .5, x0 + w, 0); x.fill(); }); }
      for (let i = 0; i < 16; i++) { const x0 = rnd() * cw, y0 = ch * (.3 + rnd() * .6), s = ch * (.012 + rnd() * .02), col = rnd() < .5 ? [90, 220, 255] : [190, 120, 255]; wrapDraw(m, x => { q = x.createRadialGradient(x0, y0, 0, x0, y0, s * 5); q.addColorStop(0, `rgba(${col},.35)`); q.addColorStop(1, `rgba(${col},0)`); x.fillStyle = q; x.fillRect(x0 - s * 5, y0 - s * 5, s * 10, s * 10); x.fillStyle = `rgb(${col})`; x.beginPath(); x.moveTo(x0, y0 - s * 2); x.lineTo(x0 + s * .7, y0); x.lineTo(x0, y0 + s * 1.4); x.lineTo(x0 - s * .7, y0); x.fill(); }); }
    } else {
      let q = a.createLinearGradient(0, 0, 0, ch); q.addColorStop(0, '#2c2650'); q.addColorStop(.6, '#4a3560'); q.addColorStop(1, '#2a1f38'); a.fillStyle = q; a.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 60; i++) { a.fillStyle = `rgba(255,255,255,${.3 + rnd() * .5})`; a.fillRect(rnd() * cw, rnd() * ch * .5, dpr * (rnd() < .2 ? 2 : 1), dpr * (rnd() < .2 ? 2 : 1)); }
      const mx = cw * .2, my = ch * .17, mr = Math.min(cw, ch) * .06; q = a.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4); q.addColorStop(0, 'rgba(230,230,255,.35)'); q.addColorStop(1, 'rgba(230,230,255,0)'); a.fillStyle = q; a.fillRect(0, 0, cw, ch); a.fillStyle = '#eceaf8'; a.beginPath(); a.arc(mx, my, mr, 0, 7); a.fill();
      for (let i = 0; i < 9; i++) { const x0 = rnd() * cw, w = cw * (.04 + rnd() * .05), top = ch * (.3 + rnd() * .2); wrapDraw(b, x => { x.fillStyle = '#251e3a'; x.fillRect(x0, top, w, ch); x.beginPath(); x.moveTo(x0 - w * .15, top); x.lineTo(x0 + w / 2, top - w * 1.1); x.lineTo(x0 + w * 1.15, top); x.fill(); for (let k = 0; k < 3; k++) if (rnd() < .6) { x.fillStyle = 'rgba(255,200,90,.7)'; x.fillRect(x0 + w * .4, top + w * (.4 + k * .9), w * .2, w * .35); x.fillStyle = '#251e3a'; } }); }
      m.fillStyle = '#1d1730'; m.fillRect(0, ch * .62, cw, ch);
      for (let i = 0; i < 5; i++) { const x0 = (i + .5) / 5 * cw, w = cw * .045; m.fillStyle = '#191428'; m.fillRect(x0 - w / 2, ch * .3, w, ch); m.fillStyle = '#2a2240'; m.fillRect(x0 - w * .7, ch * .3, w * 1.4, ch * .03); m.fillStyle = '#9a2a3a'; m.beginPath(); m.moveTo(x0 + w * .7, ch * .36); m.lineTo(x0 + w * 1.6, ch * .36); m.lineTo(x0 + w * 1.6, ch * .52); m.lineTo(x0 + w * 1.15, ch * .47); m.lineTo(x0 + w * .7, ch * .52); m.fill(); m.fillStyle = '#e8b04a'; m.beginPath(); m.arc(x0 + w * 1.15, ch * .42, w * .15, 0, 7); m.fill(); }
    }
    BG = { sky, far, mid, cw };
  }
  let VG = null, vgKey = '';
  function vignette() {
    const k = cv.width + 'x' + cv.height; if (vgKey === k) return VG; vgKey = k;
    VG = document.createElement('canvas'); VG.width = cv.width; VG.height = cv.height; const x = VG.getContext('2d');
    const q = x.createRadialGradient(cv.width / 2, cv.height * .45, Math.min(cv.width, cv.height) * .4, cv.width / 2, cv.height * .45, Math.max(cv.width, cv.height) * .8); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = q; x.fillRect(0, 0, cv.width, cv.height);
    return VG;
  }

  /* ---------- drawing: characters ---------- */
  const GC = [
    { hat: ['#4aa0ff', '#1d56b8'], tun: ['#5cb0ff', '#2a6fd0'], pants: '#3a3f5c' },
    { hat: ['#ff5a44', '#a8251a'], tun: ['#e8664a', '#a83a24'], pants: '#4a3a2a' },
    { hat: ['#5fd06a', '#24803a'], tun: ['#6fcf74', '#2f8a3a'], pants: '#3c4a3a' },
  ];
  function drawGnome(x, e, alpha) {
    const C = GC[e.k], walk = e.onGround && Math.abs(e.vx) > .4, ph = e.anim * 9, air = !e.onGround && !e.climb, big = e.k === 1 ? 1.06 : 1;
    x.save(); x.globalAlpha = alpha; x.scale(e.climb ? 1 : e.face, 1);
    if (state === 'win') x.translate(0, -Math.abs(Math.sin(clock * 8 + e.k)) * .25);
    const bob = walk ? Math.abs(Math.sin(ph)) * .03 : 0;
    // legs
    const leg = (s, a) => { const fx = s * .09 + (walk ? Math.sin(a) * .12 : 0), fy = walk ? -.03 - Math.max(0, Math.cos(a)) * .05 : air ? -.1 : -.02; x.strokeStyle = C.pants; x.lineWidth = .1; x.beginPath(); x.moveTo(s * .08, -.24 - bob); x.lineTo(fx, fy); x.stroke(); x.fillStyle = '#4a2c16'; x.beginPath(); x.ellipse(fx + .04, fy + .01, .085, .05, 0, 0, 7); x.fill(); };
    if (e.climb) { const a = Math.sin(e.anim * 10) * .06; leg(-1, 0); leg(1, 0); x.translate(0, a * .3); }
    else { leg(-1, ph); leg(1, ph + Math.PI); }
    x.translate(0, -bob);
    // back arm
    const arm = (sx, sy, ex, ey) => { x.strokeStyle = C.tun[1]; x.lineWidth = .085; x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke(); x.fillStyle = '#f2c3a0'; x.beginPath(); x.arc(ex, ey, .045, 0, 7); x.fill(); };
    if (e.climb) arm(-.12, -.46, -.18, -.78 + Math.sin(e.anim * 10) * .06);
    else if (!(e.k === 2 && e.shieldUp)) arm(-.1, -.46, -.18 - (walk ? Math.sin(ph) * .08 : 0), -.3);
    // body
    let q = x.createLinearGradient(0, -.52, 0, -.18); q.addColorStop(0, C.tun[0]); q.addColorStop(1, C.tun[1]); x.fillStyle = q;
    x.beginPath(); x.moveTo(-.2 * big, -.18); x.quadraticCurveTo(-.22 * big, -.5, -.02, -.52); x.quadraticCurveTo(.2 * big, -.5, .2 * big, -.18); x.closePath(); x.fill();
    x.fillStyle = '#3a2412'; x.fillRect(-.2 * big, -.29, .4 * big, .06); x.fillStyle = '#ffd34a'; x.fillRect(.02, -.295, .07, .07);
    if (e.k === 0) { x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(-.14, -.48); x.quadraticCurveTo(-.3 - Math.min(.2, Math.abs(e.vx) * .04), -.46 + Math.sin(clock * 14) * .03, -.36 - Math.min(.25, Math.abs(e.vx) * .05), -.4); x.lineTo(-.12, -.42); x.fill(); }
    // head, beard, nose
    x.fillStyle = '#f6c9a6'; x.beginPath(); x.arc(.03, -.63, .15, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,120,120,.35)'; x.beginPath(); x.arc(.12, -.58, .04, 0, 7); x.fill();
    q = x.createLinearGradient(0, -.62, 0, -.3); q.addColorStop(0, '#ffffff'); q.addColorStop(1, '#d9d9e2'); x.fillStyle = q;
    x.beginPath(); x.moveTo(-.11, -.62); x.quadraticCurveTo(-.14, -.4, .05, -.29); x.quadraticCurveTo(.24, -.4, .19, -.6); x.quadraticCurveTo(.06, -.52, -.11, -.62); x.fill();
    if (!e.climb) { x.fillStyle = '#ea9474'; x.beginPath(); x.arc(.17, -.61, .055, 0, 7); x.fill(); x.fillStyle = '#222'; x.beginPath(); x.arc(.1, -.68, .022, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = .02; x.beginPath(); x.moveTo(.06, -.72); x.lineTo(.14, -.715); x.stroke(); }
    // hat
    const lean = -Math.max(-.12, Math.min(.12, e.vx * .018)) + (air ? .05 : 0);
    q = x.createLinearGradient(-.1, -1.1, .15, -.7); q.addColorStop(0, C.hat[0]); q.addColorStop(1, C.hat[1]); x.fillStyle = q;
    x.beginPath(); x.moveTo(-.18, -.7); x.quadraticCurveTo(-.12, -.95, -.2 + lean * 2, -1.12); x.quadraticCurveTo(.08, -.95, .22, -.7); x.closePath(); x.fill();
    x.fillStyle = C.hat[1]; x.beginPath(); x.ellipse(.02, -.71, .21, .045, 0, 0, 7); x.fill();
    // front arm + tools
    if (e.k === 1) {
      let a = -1.95; if (e.hamT > 0) { const k = 1 - e.hamT / .32; a = k < .4 ? -1.95 - k / .4 * .9 : -2.85 + Math.pow((k - .4) / .6, .6) * 3.6; }
      x.save(); x.translate(.06, -.46); x.rotate(a); arm(0, 0, .2, 0);
      x.strokeStyle = '#7a5530'; x.lineWidth = .05; x.beginPath(); x.moveTo(.1, 0); x.lineTo(.52, 0); x.stroke();
      q = x.createLinearGradient(.5, -.14, .62, .14); q.addColorStop(0, '#d8dde4'); q.addColorStop(1, '#6a7280'); x.fillStyle = q; x.beginPath(); x.roundRect ? x.roundRect(.46, -.14, .16, .28, .03) : x.rect(.46, -.14, .16, .28); x.fill();
      x.restore();
      if (e.hamT > 0 && e.hamT < .2) { x.strokeStyle = `rgba(255,255,255,${e.hamT * 3})`; x.lineWidth = .04; x.beginPath(); x.arc(.06, -.46, .6, -1.2, .9); x.stroke(); }
    } else if (e.k === 2) {
      const cap = (rx, ry) => { const q2 = x.createLinearGradient(0, -ry, 0, ry); q2.addColorStop(0, '#ff6a4a'); q2.addColorStop(1, '#b82a1c'); return q2; };
      if (e.shieldUp) {
        arm(.08, -.46, .04, -.92); x.strokeStyle = '#efe2c4'; x.lineWidth = .06; x.beginPath(); x.moveTo(.03, -.9); x.lineTo(.02, -1.0); x.stroke();
        x.save(); x.translate(.02, -1.0); x.fillStyle = '#f3e7cc'; x.beginPath(); x.ellipse(0, 0, .5, .06, 0, 0, 7); x.fill();
        x.fillStyle = cap(.5, .2); x.beginPath(); x.ellipse(0, 0, .5, .2, 0, Math.PI, 0); x.fill();
        x.fillStyle = '#fff'; [[-.28, -.06, .05], [-.05, -.13, .06], [.22, -.08, .05], [.38, -.03, .03]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
        x.restore();
      } else if (e.climb) {
        x.save(); x.translate(-.02, -.4); x.fillStyle = cap(); x.beginPath(); x.ellipse(0, 0, .2, .26, 0, 0, 7); x.fill(); x.restore();
      } else {
        arm(.08, -.46, .2, -.38);
        x.save(); x.translate(.27, -.42); x.fillStyle = '#f3e7cc'; x.beginPath(); x.ellipse(0, 0, .04, .3, 0, 0, 7); x.fill();
        x.fillStyle = cap(.13, .32); x.beginPath(); x.ellipse(0, 0, .14, .32, 0, -Math.PI / 2, Math.PI / 2); x.fill();
        x.fillStyle = '#fff'; [[.05, -.16, .04], [.08, .06, .045], [.04, .21, .03]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
        x.restore();
      }
    } else {
      if (e.climb) arm(.12, -.46, .18, -.78 - Math.sin(e.anim * 10) * .06);
      else if (e.pull > 0) arm(.1, -.46, .3, -.4 + e.pull * .4);
      else if (air) arm(.1, -.46, .22, -.8);
      else arm(.1, -.46, .18 + (walk ? Math.sin(ph) * .08 : 0), -.3);
    }
    if (e.k !== 0 && e.pull > 0) arm(.1, -.46, .3, -.4 + e.pull * .4);
    x.restore();
  }
  function drawSpider(x, s) {
    const f = s.vx > 0 ? 1 : -1, ph = s.anim * 14;
    x.save(); x.scale(f, 1); if (s.dead) { x.globalAlpha = Math.max(0, 1 - s.dead * 2); x.scale(1, Math.max(.2, 1 - s.dead * 2)); }
    x.strokeStyle = '#2a1f36'; x.lineWidth = .035;
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) { const bx = -.1 + i * .07, w = Math.sin(ph + i * 1.3 + (side > 0 ? 0 : 1.5)) * .05; x.beginPath(); x.moveTo(bx, -.24); x.lineTo(bx + side * (.14 + i * .02) + w, -.4); x.lineTo(bx + side * (.26 + i * .03) + w, 0); x.stroke(); }
    let q = x.createRadialGradient(-.1, -.3, .02, -.06, -.24, .22); q.addColorStop(0, '#7a5a9a'); q.addColorStop(1, '#2e2040'); x.fillStyle = q; x.beginPath(); x.ellipse(-.07, -.25, .21, .16, 0, 0, 7); x.fill();
    x.fillStyle = '#ffcc3a'; x.beginPath(); x.ellipse(-.1, -.3, .07, .03, -.3, 0, 7); x.fill();
    x.fillStyle = '#3a2a4e'; x.beginPath(); x.arc(.16, -.21, .1, 0, 7); x.fill();
    x.fillStyle = '#ff3a3a'; for (const [a, b] of [[.2, -.25], [.24, -.2], [.17, -.18]]) { x.beginPath(); x.arc(a, b, .022, 0, 7); x.fill(); }
    x.restore();
  }
  function drawArcher(x, a) {
    x.save(); x.scale(a.face, 1);
    if (a.dead) { x.globalAlpha = Math.max(0, 1 - a.dead * 1.7); x.rotate(-a.dead * 3); }
    x.fillStyle = '#3a2a1a'; x.beginPath(); x.ellipse(-.08, -.04, .08, .05, 0, 0, 7); x.ellipse(.1, -.04, .08, .05, 0, 0, 7); x.fill();
    let q = x.createLinearGradient(0, -.6, 0, -.1); q.addColorStop(0, '#7a6a3a'); q.addColorStop(1, '#4a3e20'); x.fillStyle = q; x.beginPath(); x.moveTo(-.2, -.08); x.lineTo(-.15, -.5); x.lineTo(.15, -.5); x.lineTo(.2, -.08); x.fill();
    x.fillStyle = '#8fbf5a'; x.beginPath(); x.arc(0, -.62, .15, 0, 7); x.fill();
    x.beginPath(); x.moveTo(-.12, -.66); x.lineTo(-.34, -.78); x.lineTo(-.1, -.58); x.fill();
    x.fillStyle = '#4a2a4a'; x.beginPath(); x.moveTo(-.19, -.6); x.quadraticCurveTo(-.1, -.95, .1, -.84); x.quadraticCurveTo(.2, -.72, .16, -.66); x.quadraticCurveTo(0, -.76, -.19, -.6); x.fill();
    x.fillStyle = '#ffe14a'; x.beginPath(); x.arc(.08, -.63, .03, 0, 7); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(.09, -.63, .013, 0, 7); x.fill();
    const pull = a.wind > 0 ? (1 - a.wind / .45) * .16 : 0;
    x.strokeStyle = '#8a5a2a'; x.lineWidth = .045; x.beginPath(); x.arc(.12, -.46, .32, -1.15, 1.15); x.stroke();
    const tx = .12 + Math.cos(1.15) * .32, ty = Math.sin(1.15) * .32;
    x.strokeStyle = '#ddd'; x.lineWidth = .012; x.beginPath(); x.moveTo(tx, -.46 - ty); x.lineTo(.2 - pull, -.46); x.lineTo(tx, -.46 + ty); x.stroke();
    x.strokeStyle = '#8fbf5a'; x.lineWidth = .07; x.beginPath(); x.moveTo(.05, -.44); x.lineTo(.4, -.46); x.stroke();
    if (a.wind > 0) { x.strokeStyle = '#6a4a22'; x.lineWidth = .025; x.beginPath(); x.moveTo(.2 - pull, -.46); x.lineTo(.62, -.46); x.stroke(); x.fillStyle = '#aab'; x.beginPath(); x.moveTo(.68, -.46); x.lineTo(.6, -.5); x.lineTo(.6, -.42); x.fill(); }
    x.restore();
  }
  function drawExit(x, ex) {
    const x0 = ex.c, x1 = ex.c + ex.n, yb = ex.r + 1, yt = ex.r - .9, mx = (x0 + x1) / 2;
    const pulse = .5 + .5 * Math.sin(clock * 3);
    let q = x.createRadialGradient(mx, yb - .6, .1, mx, yb - .6, ex.n * .8); q.addColorStop(0, `rgba(170,255,170,${.35 + pulse * .15})`); q.addColorStop(1, 'rgba(170,255,170,0)'); x.fillStyle = q; x.fillRect(x0 - 1, yt - 1, ex.n + 2, 3);
    q = x.createLinearGradient(0, yt, 0, yb); q.addColorStop(0, 'rgba(255,255,220,.05)'); q.addColorStop(1, `rgba(200,255,200,${.25 + pulse * .1})`); x.fillStyle = q; x.fillRect(x0 + .15, yt + .3, ex.n - .3, yb - yt - .3);
    for (const px of [x0 + .02, x1 - .2]) { q = x.createLinearGradient(px, 0, px + .18, 0); q.addColorStop(0, '#a8743a'); q.addColorStop(1, '#6a4420'); x.fillStyle = q; x.fillRect(px, yt + .1, .18, yb - yt - .1); }
    x.strokeStyle = '#7a5028'; x.lineWidth = .16; x.beginPath(); x.moveTo(x0 + .1, yt + .35); x.quadraticCurveTo(mx, yt - .55, x1 - .1, yt + .35); x.stroke();
    x.fillStyle = '#e8d2a0'; x.strokeStyle = '#6a4420'; x.lineWidth = .03; x.beginPath(); x.roundRect ? x.roundRect(mx - .45, yt - .28, .9, .32, .06) : x.rect(mx - .45, yt - .28, .9, .32); x.fill(); x.stroke();
    x.fillStyle = '#3a6a2a'; x.font = 'bold .22px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('UIT', mx, yt - .11);
    for (const px of [x0 + .11, x1 - .11]) { x.fillStyle = `rgba(255,220,120,${.6 + pulse * .4})`; x.beginPath(); x.arc(px, yt + .25, .07, 0, 7); x.fill(); }
  }

  /* ---------- drawing: frame ---------- */
  function draw() {
    if (!g) return;
    sprites(); backgrounds();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(BG.sky, 0, 0);
    for (const [layer, f] of [[BG.far, .12], [BG.mid, .3]]) { let o = -((cam.x * T * dpr * f) % BG.cw); if (o > 0) o -= BG.cw; ctx.drawImage(layer, Math.round(o), 0); ctx.drawImage(layer, Math.round(o + BG.cw), 0); }
    const s = T * dpr, ox = -cam.x * s, oy = -cam.y * s;
    ctx.setTransform(s, 0, 0, s, Math.round(ox), Math.round(oy));
    const th = THEME[theme];
    const c0 = Math.floor(cam.x) - 1, c1 = Math.ceil(cam.x + vw) + 1, r0 = Math.max(0, Math.floor(cam.y) - 1), r1 = Math.min(RW - 1, Math.ceil(cam.y + H / T) + 1);
    // out-of-map
    ctx.fillStyle = th.below; ctx.fillRect(c0, RW, c1 - c0 + 1, Math.max(1, H / T + 2));
    ctx.fillStyle = th.edge; if (c0 < 0) ctx.fillRect(c0, -20, -c0, RW + 40); if (c1 >= Wd) ctx.fillRect(Wd, -20, c1 - Wd + 2, RW + 40);
    for (const ex of exits) if (ex.c + ex.n >= c0 && ex.c <= c1) drawExit(ctx, ex);
    const isG = ch => ch === '#' || ch === 'X' || ch === '%' || ch === 'D';
    for (let r = r0; r <= r1; r++) for (let c = Math.max(0, c0); c <= Math.min(Wd - 1, c1); c++) {
      const ch = g[r][c];
      if (ch === '.' || ch === 'E') continue;
      if (ch === '#') ctx.drawImage(isG(at(c, r - 1)) ? SP.ground : SP.groundTop, c, r, 1.01, 1.01);
      else if (ch === 'X') ctx.drawImage(SP.stone, c, r, 1.01, 1.01);
      else if (ch === '%') ctx.drawImage(SP.cracked, c, r, 1, 1);
      else if (ch === 'D') ctx.drawImage(SP.door, c, r, 1, 1.01);
      else if (ch === '=') ctx.drawImage(SP.plank, c, r, 1.01, 1);
      else if (ch === 'H') ctx.drawImage(SP.ladder, c, r, 1, 1.01);
      else if (ch === 'h' || ch === 'i') { const on = act[ch === 'h' ? 1 : 2]; ctx.globalAlpha = on ? 1 : .18; ctx.drawImage(SP.ladder, c, r, 1, 1.01); ctx.globalAlpha = 1; }
      else if (ch === '^') ctx.drawImage(SP.spikes, c, r, 1, 1);
      else if (ch === 'a' || ch === 'c') { const on = act[ch === 'a' ? 1 : 2], sp = ch === 'a' ? SP.gate1 : SP.gate2; if (!on) ctx.drawImage(sp, c, r, 1, 1.01); else { ctx.globalAlpha = .22; ctx.drawImage(sp, c, r, 1, 1.01); ctx.globalAlpha = 1; } }
      else if (ch === 'g' || ch === 'j') { const on = act[ch === 'g' ? 1 : 2], sp = ch === 'g' ? SP.bridge1 : SP.bridge2; ctx.globalAlpha = on ? 1 : .2 + .08 * Math.sin(clock * 4); ctx.drawImage(sp, c, r, 1.01, 1); ctx.globalAlpha = 1; }
      else if (ch === 'w') {
        const top = at(c, r - 1) !== 'w', q = ctx.createLinearGradient(0, r, 0, r + 1); q.addColorStop(0, 'rgba(70,160,230,.85)'); q.addColorStop(1, 'rgba(20,70,150,.95)'); ctx.fillStyle = q;
        if (top) { ctx.beginPath(); ctx.moveTo(c, r + 1.01); for (let i = 0; i <= 4; i++) ctx.lineTo(c + i / 4, r + .12 + Math.sin(clock * 3 + (c + i / 4) * 3) * .05); ctx.lineTo(c + 1, r + 1.01); ctx.fill(); ctx.strokeStyle = 'rgba(220,245,255,.8)'; ctx.lineWidth = .04; ctx.beginPath(); for (let i = 0; i <= 4; i++) { const y = r + .12 + Math.sin(clock * 3 + (c + i / 4) * 3) * .05; i ? ctx.lineTo(c + i / 4, y) : ctx.moveTo(c, y); } ctx.stroke(); }
        else ctx.fillRect(c, r, 1, 1.01);
      }
      else if (ch === '!' || ch === '?') {
        const i = ch === '!' ? 1 : 2, on = lever[i];
        ctx.fillStyle = '#5a5a66'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(c + .25, r + .8, .5, .2, .05) : ctx.rect(c + .25, r + .8, .5, .2); ctx.fill();
        const a = on ? .6 : -.6; ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = .07; ctx.beginPath(); ctx.moveTo(c + .5, r + .85); ctx.lineTo(c + .5 + Math.sin(a) * .45, r + .85 - Math.cos(a) * .45); ctx.stroke();
        ctx.fillStyle = i === 1 ? '#ffc531' : '#43a8ff'; ctx.beginPath(); ctx.arc(c + .5 + Math.sin(a) * .47, r + .85 - Math.cos(a) * .47, .1, 0, 7); ctx.fill();
      }
      else if (ch === '1' || ch === '2') {
        const i = ch === '1' ? 1 : 2, dn = pressed[i];
        ctx.fillStyle = '#4a4a54'; ctx.fillRect(c + .05, r + .9, .9, .1);
        ctx.fillStyle = i === 1 ? '#ffc531' : '#43a8ff'; ctx.fillRect(c + .12, r + (dn ? .86 : .78), .76, dn ? .06 : .12);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(c + .14, r + (dn ? .86 : .78), .72, .025);
      }
      else if (ch === 'k') { const b = Math.sin(clock * 3 + c) * .06; ctx.drawImage(SP.key, c, r + b, 1, 1); const gl = (clock * 1.3 + c * .37) % 2.5; if (gl < .3) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,220,.9)'; ctx.beginPath(); ctx.arc(c + .3 + gl, r + .45 + b, .05, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } }
      else if (ch === 'f') ctx.drawImage(SP.food, c, r + Math.sin(clock * 2.5 + c) * .04, 1, 1);
    }
    for (const k of crates) if (k.x > c0 - 1 && k.x < c1 + 1) ctx.drawImage(SP.crate, k.x, k.y, 1, 1);
    for (const a of archers) { ctx.save(); ctx.translate(a.c + .5, a.r + 1); drawArcher(ctx, a); ctx.restore(); }
    for (const sp of spiders) { ctx.save(); ctx.translate(sp.x + sp.w / 2, sp.y + sp.h); drawSpider(ctx, sp); ctx.restore(); }
    for (const p of arrows) { const d = Math.sign(p.vx); ctx.strokeStyle = '#6a4a22'; ctx.lineWidth = .04; ctx.beginPath(); ctx.moveTo(p.x - d * .5, p.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.fillStyle = '#b8c0cc'; ctx.beginPath(); ctx.moveTo(p.x + d * .1, p.y); ctx.lineTo(p.x - d * .02, p.y - .05); ctx.lineTo(p.x - d * .02, p.y + .05); ctx.fill(); ctx.fillStyle = '#e04a3a'; ctx.beginPath(); ctx.moveTo(p.x - d * .5, p.y); ctx.lineTo(p.x - d * .42, p.y - .07); ctx.lineTo(p.x - d * .36, p.y); ctx.lineTo(p.x - d * .42, p.y + .07); ctx.fill(); }
    // gnomes (active one last)
    const order = [0, 1, 2].filter(i => i !== cur).concat([cur]);
    for (const i of order) {
      const e = gn[i], cx = e.x + e.w / 2, by = e.y + e.h;
      if (e.onGround) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx, by - .02, .3, .06, 0, 0, 7); ctx.fill(); }
      if (i === cur && state === 'play') { ctx.globalCompositeOperation = 'lighter'; const q = ctx.createRadialGradient(cx, by - .1, 0, cx, by - .1, .7); q.addColorStop(0, 'rgba(255,240,170,.28)'); q.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = q; ctx.fillRect(cx - .7, by - .8, 1.4, 1.4); ctx.globalCompositeOperation = 'source-over'; }
      ctx.save(); ctx.translate(cx, by + .02);
      const fl = e.inv > 0 && Math.floor(clock * 12) % 2 ? .45 : 1;
      drawGnome(ctx, e, (state === 'fail' && e.hearts <= 0) ? Math.max(.2, stateT / 1.9) : fl);
      ctx.restore();
      if (i === cur && state === 'play') { const ty = e.y - (e.k === 2 && e.shieldUp ? .55 : .35) - Math.abs(Math.sin(clock * 4)) * .12; ctx.fillStyle = '#fff4b0'; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = .03; ctx.beginPath(); ctx.moveTo(cx - .13, ty - .16); ctx.lineTo(cx + .13, ty - .16); ctx.lineTo(cx, ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (e.home && state === 'play') { ctx.fillStyle = '#7fe08a'; ctx.font = 'bold .32px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✓', cx, e.y - .2); }
    }
    for (const p of parts) {
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; if (p.gl) ctx.globalCompositeOperation = 'lighter';
      if (p.sq) ctx.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(vignette(), 0, 0);
  }
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5); W = wrap.clientWidth; H = wrap.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const land = W > H; wrap.classList.toggle('land', land);
    const ctlH = land ? 0 : (opt.ctl === 'groot' ? 210 : 186), avail = Math.max(100, H - ctlH);
    T = land ? Math.max(18, Math.min(H / 10.5, W / 15)) : Math.max(20, Math.min(avail / 10, W / 8.5));
    vw = W / T; vhA = avail / T; spKey = ''; bgKey = ''; vgKey = '';
    if (g) snapCam();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (current === 'kb' && !anyModal() && !document.hidden && g && !manual) {
      acc += dt; let n = 0; while (acc >= STEP && n < 10) { step(STEP); acc -= STEP; n++; } if (n >= 10) acc = 0; hudTime();
    }
    if (g) camUpdate(dt);
    draw();
  }

  /* ---------- HUD / UI ---------- */
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  let lastSec = -1;
  function hudTime() { const s2 = Math.floor(time); if (s2 !== lastSec) { lastSec = s2; } }
  const por = [...document.querySelectorAll('#kbHud .kb-por')];
  function portraits() {
    por.forEach((b, i) => {
      const c = document.createElement('canvas'); c.width = c.height = 72; const x = c.getContext('2d'); x.scale(72, 72); x.translate(.45, 1.28); x.scale(1.05, 1.05);
      drawGnome(x, Object.assign(mkGnome(i, 0, 0), { face: 1 }), 1);
      b.querySelector('img').src = c.toDataURL();
    });
  }
  function hud() {
    if (!gn.length) return;
    por.forEach((b, i) => { const e = gn[i]; b.classList.toggle('on', i === cur); b.classList.toggle('home', e.home); b.querySelector('.kb-h').innerHTML = [0, 1, 2].map(k => `<i class="${k < e.hearts ? 'f' : ''}">♥</i>`).join(''); });
    $('#kbKey').hidden = !keyCount; $('#kbKey').textContent = '🗝' + (keyCount > 1 ? '×' + keyCount : '');
    const e = gn[cur]; $('#kbAct').textContent = e.k === 1 ? '🔨' : e.k === 2 ? (e.shieldUp ? '🛡' : '🍄') : '✋';
    $('#kbJump').classList.toggle('off', e.k !== 0);
  }
  function select(i) { if (i === cur || state !== 'play') return; cur = i; sfx('kbSwitch'); hud(); }
  let banT = 0;
  function banner(t, ms) { const el = $('#kbBanner'); el.innerHTML = t; el.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => el.classList.remove('show'), ms || 1200); }
  function showWin() {
    $('#kbEndTitle').textContent = `Level ${lv + 1} gehaald!`;
    $('#kbEndText').innerHTML = `Alle drie de kabouters zijn veilig! Tijd <b>${fmt(time)}</b>${newRec ? ' · 🎉 nieuw record' : ''}`;
    $('#kbEndNext').hidden = lv + 1 >= LEVELS.length; if (lv + 1 >= LEVELS.length) $('#kbEndText').innerHTML += '<br>🏆 Je hebt de hele tocht volbracht!';
    openModal('kbEndModal');
  }
  function renderStart() {
    $('#kbLevels').innerHTML = LEVELS.map((L, i) => { const lock = i + 1 > prog.unlocked, b = prog.best[i]; return `<button data-n="${i}" ${lock ? 'disabled' : ''} class="${lock ? 'lock' : ''}"><b>${lock ? '🔒' : i + 1}</b><small>${L.n}</small><span>${b != null ? '⏱ ' + fmt(b) : ''}</span></button>`; }).join('');
    $('#kbOptList').innerHTML = [['sound', 'Geluid en muziek', [[true, 'Aan'], [false, 'Uit']]], ['ctl', 'Knoppen', [['normaal', 'Normaal'], ['groot', 'Groot']]]].map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  }
  $('#kbLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b && !b.disabled) load(+b.dataset.n); });
  $('#kbOptList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); applyCtl(); layout(); renderStart(); });
  $('#kbStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#kbEndNext').addEventListener('click', () => load(Math.min(LEVELS.length - 1, lv + 1)));
  $('#kbEndRetry').addEventListener('click', () => load(lv));
  $('#kbEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('kbStartModal'); });
  $('#kbBack').addEventListener('click', () => leave());
  $('#kbLevelsBtn').addEventListener('click', () => { renderStart(); openModal('kbStartModal'); });
  $('#kbRetry').addEventListener('click', () => { if (g && state === 'play') { prog.deaths++; saveProg(); load(lv, true); } });
  por.forEach((b, i) => b.addEventListener('click', () => select(i)));
  function applyCtl() { $('#kb').classList.toggle('big-ctl', opt.ctl === 'groot'); }
  // controls: hold buttons (multi-touch); jump/action/switch on press
  const held = new Map(), ctlEl = $('#kbCtl');
  const actAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('#kbCtl [data-act]'); return b ? b.dataset.act : null; };
  function recompute() { keys.l = keys.r = keys.u = keys.d = keys.j = false; for (const a of held.values()) if (a in keys) keys[a] = true; ctlEl.querySelectorAll('[data-act]').forEach(b => b.classList.toggle('on', [...held.values()].includes(b.dataset.act))); }
  function press(a) { if (a === 'j') jumpBuf = .12; else if (a === 'a') actReq = true; else if (a === 's') select((cur + 1) % 3); vibrate(8); }
  ctlEl.addEventListener('pointerdown', e => { const a = actAt(e.clientX, e.clientY); if (!a) return; e.preventDefault(); ctlEl.setPointerCapture(e.pointerId); held.set(e.pointerId, a); if ('jas'.includes(a)) press(a); recompute(); });
  ctlEl.addEventListener('pointermove', e => { if (!held.has(e.pointerId)) return; const a = actAt(e.clientX, e.clientY), was = held.get(e.pointerId); if (a && a !== was && 'lrud'.includes(a) && 'lrud'.includes(was)) { held.set(e.pointerId, a); recompute(); } });
  const rel = e => { held.delete(e.pointerId); recompute(); };
  ctlEl.addEventListener('pointerup', rel); ctlEl.addEventListener('pointercancel', rel);
  const KM = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', ' ': 'j' };
  window.addEventListener('keydown', e => { if (current !== 'kb' || anyModal()) return; const k = KM[e.key]; if (k) { if (k === 'j' && !keys.j) jumpBuf = .12; keys[k] = true; e.preventDefault(); } if (e.key === 'x' || e.key === 'e') actReq = true; if (e.key === 'Tab' || e.key === 'c') { e.preventDefault(); select((cur + 1) % 3); } if ('123'.includes(e.key)) select(+e.key - 1); });
  window.addEventListener('keyup', e => { const k = KM[e.key]; if (k) keys[k] = false; });
  window.addEventListener('resize', () => { if (current === 'kb') layout(); });

  function enter() {
    show('kb'); applyCtl(); layout();
    if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
    if (!g) load(Math.min(prog.unlocked, LEVELS.length) - 1, true);
    renderStart(); openModal('kbStartModal');
  }
  function leave() { running = false; cancelAnimationFrame(raf); held.clear(); recompute(); closeModals(); show('menu'); refreshMenu(); }
  portraits();
  window.__kb = { get gn() { return gn; }, get state() { return state; }, get cur() { return cur; }, get crates() { return crates; }, get spiders() { return spiders; }, get archers() { return archers; }, get act() { return act; }, get keyCount() { return keyCount; }, get g() { return g; }, get time() { return time; },
    load, keys, select, action: () => { actReq = true; }, jump: () => { jumpBuf = .12; }, set manual(v) { manual = v; }, step: n => { for (let i = 0; i < n; i++) step(STEP); }, STEP, LEVELS, draw: () => { camUpdate(1); draw(); } };
  return { enter, leave, hasSave: () => false };
})();
$('#tileKb').addEventListener('click', () => Gnomes.enter());
(() => {   // menu tile art for De Drie Kabouters
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  let q = g.createLinearGradient(0, 0, 0, 128); q.addColorStop(0, '#7cc8f2'); q.addColorStop(1, '#d9f1fb'); g.fillStyle = q; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#86c19a'; g.beginPath(); g.moveTo(0, 80); g.quadraticCurveTo(40, 52, 80, 74); g.quadraticCurveTo(110, 60, 128, 70); g.lineTo(128, 128); g.lineTo(0, 128); g.fill();
  g.fillStyle = '#7a5030'; g.fillRect(0, 104, 128, 24); g.fillStyle = '#6cc24a'; g.fillRect(0, 100, 128, 8);
  [['#4aa0ff', '#5cb0ff', 30, 0], ['#ff5a44', '#e8664a', 64, -4], ['#5fd06a', '#6fcf74', 98, 0]].forEach(([hat, tun, x, dy]) => {
    const y = 100 + dy; g.fillStyle = tun; g.beginPath(); g.moveTo(x - 12, y); g.quadraticCurveTo(x - 13, y - 22, x, y - 23); g.quadraticCurveTo(x + 13, y - 22, x + 12, y); g.fill();
    g.fillStyle = '#f6c9a6'; g.beginPath(); g.arc(x, y - 30, 9, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 8, y - 30); g.quadraticCurveTo(x - 8, y - 16, x, y - 12); g.quadraticCurveTo(x + 8, y - 16, x + 8, y - 30); g.quadraticCurveTo(x, y - 25, x - 8, y - 30); g.fill();
    g.fillStyle = '#ea9474'; g.beginPath(); g.arc(x + 2, y - 29, 3.5, 0, 7); g.fill();
    g.fillStyle = hat; g.beginPath(); g.moveTo(x - 11, y - 36); g.quadraticCurveTo(x - 6, y - 52, x - 9, y - 62); g.quadraticCurveTo(x + 6, y - 50, x + 12, y - 36); g.fill();
  });
  g.fillStyle = '#d8352a'; g.beginPath(); g.ellipse(112, 82, 12, 18, 0, -Math.PI / 2, Math.PI / 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(116, 76, 3, 0, 7); g.arc(117, 88, 2.5, 0, 7); g.fill();
  g.fillStyle = '#8a8f99'; g.save(); g.translate(76, 70); g.rotate(-.5); g.fillStyle = '#7a5530'; g.fillRect(0, -2, 20, 4); g.fillStyle = '#9aa2ae'; g.fillRect(18, -8, 8, 16); g.restore();
  $('#artKb').src = c.toDataURL();
})();
