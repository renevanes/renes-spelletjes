  /* ---------- data & settings ---------- */
  const LEVELS = /*LEVELS*/;
  const WORLDS = [
    { id: 'bos', n: 'Het Bos', ic: '🌲', liq: 'water', foe: 'kever', dark: 0 },
    { id: 'grot', n: 'De Kristalgrot', ic: '💎', liq: 'water', foe: 'spin', dark: .5 },
    { id: 'mijn', n: 'De Oude Mijn', ic: '⛏️', liq: 'lava', foe: 'rat', dark: .42 },
    { id: 'ijs', n: 'De IJsberg', ic: '❄️', liq: 'ijswater', foe: 'pinguïn', dark: 0 },
    { id: 'burcht', n: 'De Burcht', ic: '🏰', liq: 'lava', foe: 'ridder', dark: .36 },
  ];
  const NAMES = ['Snel', 'Sterk', 'Schild'];
  const STEP = 1 / 120, G = 52, MAXF = 19, GLIDE = 2.4, DASH = 13.5;
  const SPD = [6.3, 4.3, 4.0], JV = 15.6, CLIMB = [4.8, 3.7, 3.7];
  const DIM = [[.6, .9], [.72, .92], [.64, .9]];
  const INV = 4;
  const ITEM = { kr: 'Rode sleutel', kb: 'Blauwe sleutel', ky: 'Gele sleutel', apple: 'Appel', bomb: 'Bom', gear: 'Tandwiel' };
  const KEYCOL = { r: '#e8484a', b: '#3f8cff', y: '#ffc531' };
  const CHCOL = { r: '#ff5a4e', g: '#56d364', b: '#4aa8ff', y: '#ffcc33', p: '#c77dff', o: '#ff9a3c', z: '#ffffff' };
  const D = { sound: true, music: true, ctl: 'normaal', shake: true };
  const saved = store.get('kb.settings', {}) || {};
  const opt = Object.assign({}, D, saved); if (saved.music === undefined) opt.music = saved.sound !== false;
  const saveOpt = () => store.set('kb.settings', opt);
  Sfx.gate('kb', () => opt.music !== false);
  // progress v2 (20 levels). Older saves (8 levels) keep their unlocks via a mapping and keep their trophies via `legacy`.
  let prog = store.get('kb.progress', null);
  if (!prog || prog.v !== 2) {
    const old = prog || {}, ob = Object.keys(old.best || {}).length, ou = Math.max(1, Math.min(8, old.unlocked || 1));
    const MAP = [1, 2, 3, 5, 6, 9, 10, 13];
    prog = { v: 2, unlocked: Math.min(LEVELS.length, Math.max(ou, MAP[ou - 1], ob >= 8 ? 14 : 1)), best: {}, stars: {}, gems: {}, deaths: old.deaths || 0, legacy: ob };
    if (store.get('kb.progress', null)) store.set('kb.progress', prog);
  }
  const saveProg = () => store.set('kb.progress', prog);

  /* ---------- tiles ---------- */
  const EM = 0, GR = 1, ST = 2, PL = 3, LA = 4, CK = 5, HD = 6, SK = 7, LQ = 8, IC = 9, CVL = 10, CVR = 11, FK = 12, EX = 13, MC = 14, BO = 15;
  const TCH = { '#': GR, 'X': ST, '=': PL, 'H': LA, '%': CK, '&': HD, '^': SK, '~': LQ, 'I': IC, '<': CVL, '>': CVR, '$': FK, 'E': EX, 'M': MC, 'O': BO };
  const SOLID = new Uint8Array(16); [GR, ST, CK, HD, IC, CVL, CVR, MC, BO].forEach(t => SOLID[t] = 1);
  const VGROUP = { gate: 1, lock: 1, ladder: 1, beam: 1 }, HGROUP = { bridge: 1, elev: 1, move: 1 };

  /* ---------- state ---------- */
  let L = null, lv = 0, world = 0, Wd = 0, Ht = 0, tile = null, dsol = null, dow = null, dlad = null, dhurt = null, bdrop = null;
  let gn = [], cur = 0, crates = [], plats = [], objs = [], foes = [], shots = [], items = [], bombs = [], parts = [], texts = [], fans = [], fires = [];
  let chan = {}, gemTotal = 0, gemGot = 0, state = 'idle', stateT = 0, time = 0, clock = 0, failMsg = '', switchT = 0, dirtyChunks = [], seed = 1, endInfo = null;
  let shake = 0, msgCd = {};
  const keys = { l: false, r: false, u: false, d: false, j: false };
  let jumpBuf = 0, actReq = false, aReq = false, bReq = false, nothingT = 0;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const TILE = { tile: 1 };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sfx = (n, x) => { if (!opt.sound) return; const p = x == null ? 0 : clamp((x - cam.x - vw / 2) / vw, -.6, .6); Sfx.play(n, null, p); };

  function mkGnome(k, c, r) {
    const [w, h] = DIM[k];
    return { k, x: c + .5 - w / 2, y: r + 1 - h, w, h, vx: 0, vy: 0, face: 1, onGround: true, support: TILE, climb: false, hearts: 3, inv: [], sel: 0,
      invul: 0, shieldUp: false, dashT: 0, dashCd: 0, stun: 0, hamT: 0, hamHit: true, throwT: 0, throwCd: 0, pushT: 0, pullT: 0, giveT: 0, useT: 0,
      anim: 0, airTop: r, coyote: 0, dropT: 0, home: false, dead: false, deadT: 0, blink: 1 + k, land: 0, lastDx: 0, lastDy: 0, glide: 0, hurtT: 0, idleT: 0, wave: 0 };
  }

  /* ---------- level loading ---------- */
  function load(n, quiet) {
    lv = n; L = LEVELS[n]; world = L.w; seed = 1234 + n * 77;
    Ht = L.m.length; Wd = Math.max(...L.m.map(r => r.length));
    const N = Wd * Ht;
    tile = new Uint8Array(N); dsol = new Uint8Array(N); dow = new Uint8Array(N); dlad = new Uint8Array(N); dhurt = new Uint8Array(N); bdrop = new Uint8Array(N);
    gn = []; crates = []; plats = []; objs = []; foes = []; shots = []; items = []; bombs = []; parts = []; texts = []; fans = []; fires = [];
    chan = {}; gemTotal = 0; gemGot = 0; time = 0; jumpBuf = 0; actReq = aReq = bReq = false; switchT = 0; shake = 0; msgCd = {}; endInfo = null;
    const st = [], groups = {};
    for (let r = 0; r < Ht; r++) for (let c = 0; c < Wd; c++) {
      const ch = L.m[r][c] || '.';
      if (TCH[ch] !== undefined) tile[r * Wd + c] = TCH[ch];
      else if (ch === '1' || ch === '2' || ch === '3') st[+ch - 1] = [c, r];
      else if (ch === 'C') crates.push({ kind: 'crate', x: c, y: r, w: 1, h: 1, vx: 0, vy: 0, onGround: true, support: TILE, float: false, lastDx: 0, lastDy: 0 });
      else if (ch === '*') { items.push({ it: 'gem', x: c + .5, y: r + .5, c, r, ph: c * .7 }); gemTotal++; }
      else if (L.o && L.o[ch]) (groups[ch] = groups[ch] || []).push([c, r]);
    }
    for (const ch in groups) {
      const spec = L.o[ch], a = spec.split(':'), t = a[0], cells = groups[ch];
      if (VGROUP[t] || HGROUP[t]) {
        const set = new Set(cells.map(([c, r]) => c + ',' + r)), seen = new Set();
        for (const [c, r] of cells) {
          if (seen.has(c + ',' + r)) continue;
          const run = []; let cc = c, rr = r;
          if (VGROUP[t]) { while (set.has(cc + ',' + (rr - 1))) rr--; while (set.has(cc + ',' + rr)) { run.push([cc, rr]); seen.add(cc + ',' + rr); rr++; } }
          else { while (set.has((cc - 1) + ',' + rr)) cc--; while (set.has(cc + ',' + rr)) { run.push([cc, rr]); seen.add(cc + ',' + rr); cc++; } }
          mkObj(t, a, run);
        }
      } else for (const cell of cells) mkObj(t, a, [cell]);
    }
    for (let i = 0; i < 3; i++) gn.push(mkGnome(i, st[i][0], st[i][1]));
    // background wall behind "inside" cells: anything with a ceiling above it in the same column
    const useBd = L.bd !== undefined ? L.bd === 1 : (world === 1 || world === 2 || world === 4);
    if (useBd) for (let c = 0; c < Wd; c++) { let roof = false; for (let r = 0; r < Ht; r++) { const t = tile[r * Wd + c]; if (SOLID[t] || t === FK) roof = true; else if (roof) bdrop[r * Wd + c] = 1; } }
    if (L.bd === 2) bdrop.fill(1);
    for (const f of fans) { let top = f.r - 1, n2 = 0; while (n2 < f.hgt && top >= 0 && !SOLID[tile[top * Wd + f.c]]) { top--; n2++; } f.top = top + 1; }
    updChannels(true);
    cur = 0; state = 'play'; stateT = 0;
    if (typeof onLoad === 'function') onLoad(quiet);
  }
  function mkObj(t, a, cells) {
    const [c, r] = cells[0], o = { t, cells, c, r, n: cells.length, a: 0 };
    switch (t) {
      case 'gate': case 'bridge': case 'ladder': o.ch = a[1]; o.inv = a[2] === 'inv'; break;
      case 'beam': o.ch = a[1]; o.inv = a[2] === 'inv'; break;
      case 'lock': o.col = a[1]; o.open = false; break;
      case 'lever': case 'button': o.ch = a[1]; o.on = a[2] === 'on'; o.a = o.on ? 1 : 0; break;
      case 'plate': case 'socket': o.ch = a[1]; o.on = false; break;
      case 'fan': o.ch = a[1] || ''; o.hgt = +(a[2] || 8); tile[r * Wd + c] = MC; fans.push(o); break;
      case 'fire': o.dir = a[1]; o.per = +a[2]; o.dur = +a[3]; o.ph = +(a[4] || 0); o.ch = a[5] || ''; o.len = +(a[6] || 3); tile[r * Wd + c] = MC; fires.push(o); break;
      case 'tele': o.tag = a[1]; o.cd = 0; break;
      case 'sign': o.text = a.slice(1).join(':'); break;
      case 'elev': case 'move': {
        const p = { kind: t, x: c, y: r, w: cells.length, h: .38, x0: c, y0: r, dx: 0, dy: 0, lastDx: 0, lastDy: 0, moving: 0 };
        if (t === 'elev') { p.ch = a[1]; p.ty = +a[2]; p.inv = a[3] === 'inv'; p.sp = +(a[4] || 2.6); }
        else { p.mx = +a[1]; p.my = +a[2]; p.sp = +(a[3] || 1.6); p.ch = a[4] || ''; p.u = 0; p.dirn = 1; }
        plats.push(p); return;
      }
      case 'key': items.push({ it: 'k' + a[1], x: c + .5, y: r + .5, ph: c }); return;
      case 'apple': case 'bomb': case 'gear': items.push({ it: t, x: c + .5, y: r + .5, ph: c }); return;
      case 'walker': case 'knight': foes.push(mkFoe(t === 'knight' ? 'knight' : 'walker', c, r, a)); return;
      case 'archer': case 'bat': case 'boss': foes.push(mkFoe(t, c, r, a)); return;
      default: return;
    }
    objs.push(o);
  }
  function mkFoe(t, c, r, a) {
    if (t === 'walker' || t === 'knight') { const h = t === 'knight' ? .94 : .62, w = t === 'knight' ? .7 : .82; return { t, x: c + .5 - w / 2, y: r + 1 - h, w, h, vx: (a[1] === 'l' ? -1 : 1) * 1.3, face: a[1] === 'l' ? -1 : 1, hp: t === 'knight' ? 2 : 1, stun: 0, inv: 0, dead: 0, anim: c * .3, onGround: true, support: TILE, vy: 0 }; }
    if (t === 'archer') return { t, x: c + .15, y: r + .05, w: .7, h: .95, c, r, face: a[1] === 'r' ? 1 : -1, cd: 1 + (c % 3) * .3, wind: 0, hp: 1, inv: 0, dead: 0, anim: 0 };
    if (t === 'bat') return { t, x0: c + .5, y0: r + .5, x: c + .1, y: r + .2, w: .8, h: .6, rng: +(a[1] || 3), ph: c * .37, hp: 1, inv: 0, dead: 0, anim: 0, stun: 0, face: 1 };
    return { t: 'boss', x: c + .5 - .8, y: r + 1 - 2.1, w: 1.6, h: 2.1, vx: 0, vy: 0, face: -1, hp: 10, maxHp: 10, inv: 0, dead: 0, anim: 0, cd: 2.5, wind: 0, onGround: true, support: TILE, stun: 0, xmin: c - 9, xmax: c + 3, target: null };
  }

  /* ---------- tile queries ---------- */
  const inb = (c, r) => c >= 0 && c < Wd && r >= 0 && r < Ht;
  const tAt = (c, r) => inb(c, r) ? tile[r * Wd + c] : (c < 0 || c >= Wd ? GR : EM);
  function solid(c, r) { if (c < 0 || c >= Wd) return true; if (r < 0 || r >= Ht) return false; const i = r * Wd + c; return SOLID[tile[i]] === 1 || dsol[i] > 0; }
  function ladder(c, r) { if (!inb(c, r)) return false; const i = r * Wd + c; return tile[i] === LA || dlad[i] > 0; }
  function oneway(c, r) { if (!inb(c, r)) return false; const i = r * Wd + c; return tile[i] === PL || dow[i] > 0 || ((tile[i] === LA || dlad[i] > 0) && !ladder(c, r - 1)); }
  const ov = (a, b, m = 0) => a.x + m < b.x + b.w && a.x + a.w - m > b.x && a.y + m < b.y + b.h && a.y + a.h - m > b.y;
  const cellIn = (e, c, r, m = 0) => e.x + m < c + 1 && e.x + e.w - m > c && e.y + m < r + 1 && e.y + e.h - m > r;
  function setTile(c, r, t) { tile[r * Wd + c] = t; dirtyChunks.push([c, r]); }

  /* ---------- channels & switch-controlled objects ---------- */
  const isOn = o => (!!chan[o.ch]) !== !!o.inv;
  function applyObj(o) {
    for (const [c, r] of o.cells) {
      const i = r * Wd + c;
      if (o.t === 'gate') dsol[i] = o.open ? 0 : 1;
      else if (o.t === 'lock') dsol[i] = o.open ? 0 : 1;
      else if (o.t === 'bridge') dow[i] = o.on ? 1 : 0;
      else if (o.t === 'ladder') dlad[i] = o.on ? 1 : 0;
      else if (o.t === 'beam') { dsol[i] = o.on ? 1 : 0; dhurt[i] = o.on ? 1 : 0; }
    }
  }
  function updChannels(init) {
    // levers and buttons work like two-way switches (each one flips its channel); plates and machines simply power it
    const nv = {}, par = {};
    for (const o of objs) { if ((o.t === 'lever' || o.t === 'button') && o.on) par[o.ch] = !par[o.ch]; else if ((o.t === 'socket' || o.t === 'plate') && o.on) nv[o.ch] = 1; }
    for (const k in par) if (par[k]) nv[k] = 1;
    for (const f of foes) if (f.t === 'boss' && f.dead) nv.z = 1;
    let changed = false;
    for (const k of new Set([...Object.keys(nv), ...Object.keys(chan)])) if (!!nv[k] !== !!chan[k]) changed = true;
    chan = nv;
    for (const o of objs) {
      if (o.t === 'gate') {
        const want = isOn(o);
        if (want !== o.open) {
          if (!want && !init && blockedCells(o.cells)) continue;   // never close on someone
          o.open = want; applyObj(o); if (!init) { sfx('kbGate', o.c); fxCells(o, '#ffe9a8'); }
        }
        if (init) { o.a = o.open ? 1 : 0; applyObj(o); }
      } else if (o.t === 'bridge' || o.t === 'ladder' || o.t === 'beam') {
        const want = o.t === 'beam' ? !isOn(o) : isOn(o);
        if (want !== o.on || init) { const was = o.on; o.on = want; applyObj(o); if (init) o.a = want ? 1 : 0; else if (was !== want) { sfx(o.t === 'beam' ? 'kbBeam' : 'kbGate', o.c); fxCells(o, CHCOL[o.ch] || '#fff'); } }
      } else if (o.t === 'lock' && init) applyObj(o);
    }
    if (changed && !init) vibrate(10);
  }
  function blockedCells(cells) {
    const all = gn.filter(e => !e.dead).concat(crates, foes.filter(f => !f.dead && f.w));
    for (const [c, r] of cells) for (const e of all) if (cellIn(e, c, r, .04)) return true;
    return false;
  }
  function fxCells(o, col) { for (const [c, r] of o.cells) for (let k = 0; k < 3; k++) spark(c + rnd2(), r + rnd2(), col, 1.5); }

  /* ---------- collision ---------- */
  function hitX(e) {
    const r0 = Math.floor(e.y + .04), r1 = Math.floor(e.y + e.h - .04), c0 = Math.floor(e.x), c1 = Math.floor(e.x + e.w - 1e-6);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (solid(c, r)) return c;
    return null;
  }
  function moveX(e, dx, pusher) {
    if (!dx) return 0;
    const x0 = e.x; e.x += dx; e.wall = 0;
    const c = hitX(e);
    if (c !== null) { e.x = dx > 0 ? c - e.w - 1e-4 : c + 1 + 1e-4; e.wall = dx > 0 ? 1 : -1; e.wallC = c; }
    for (const k of crates) {
      if (k === e || !ov(e, k, .02)) continue;
      if (e.y + e.h <= k.y + .08 || e.y >= k.y + k.h - .08) continue;
      const dir = Math.sign(k.x + .5 - e.x - e.w / 2) || Math.sign(dx);
      if (Math.sign(dx) !== dir) continue;
      if (pusher && e.k === 1 && e.onGround && k.onGround && !k.float && e.y + e.h > k.y + .45) {
        const need = dx > 0 ? e.x + e.w - k.x : e.x - (k.x + k.w), got = moveCrate(k, need);
        if (Math.abs(got - need) < 1e-6) { e.pushT = .15; if (!(e.pushSnd > clock)) { e.pushSnd = clock + .4; sfx('kbPush', k.x); } continue; }
      }
      e.x = dx > 0 ? k.x - e.w - 1e-4 : k.x + k.w + 1e-4; e.wall = dx > 0 ? 1 : -1; e.wallC = -1;
    }
    return e.x - x0;
  }
  function moveCrate(k, dx) {
    const x0 = k.x; k.x += dx;
    const c = hitX(k); if (c !== null) k.x = dx > 0 ? c - k.w : c + 1;
    for (const o of crates) if (o !== k && ov(k, o, .01)) k.x = dx > 0 ? Math.min(k.x, o.x - k.w) : Math.max(k.x, o.x + o.w);
    const d = k.x - x0; if (d) carryRiders(k, d, 0);
    return d;
  }
  function shieldTop(s) { return s.k === 2 && s.shieldUp && !s.climb && !s.dead ? s.y - .3 : null; }
  function moveY(e, dy) {
    const pb = e.y + e.h, pt = e.y; e.y += dy; e.onGround = false; e.support = null;
    const c0 = Math.floor(e.x + .03), c1 = Math.floor(e.x + e.w - .03);
    if (dy >= 0) {
      const nb = e.y + e.h; let best = Infinity, sup = null;
      const ow = !e.climb && !(e.dropT > 0);
      for (let r = Math.ceil(pb - 2e-3); r <= Math.floor(nb) && best === Infinity; r++)
        for (let c = c0; c <= c1; c++) if (solid(c, r) || (ow && oneway(c, r))) { best = r; sup = TILE; break; }
      for (const k of crates) if (k !== e && e.x < k.x + k.w - .02 && e.x + e.w > k.x + .02 && k.y >= pb - 2e-3 && k.y <= nb && k.y < best) { best = k.y; sup = k; }
      if (ow) for (const p of plats) if (e.x < p.x + p.w && e.x + e.w > p.x && p.y >= pb - 3e-3 && p.y <= nb + 1e-3 && p.y < best) { best = p.y; sup = p; }
      const s = gn[2];
      if (e.k !== undefined && e !== s && s) { const top = shieldTop(s); if (top !== null && e.x < s.x + s.w + .2 && e.x + e.w > s.x - .2 && top >= pb - 2e-3 && top <= nb && top < best) { best = top; sup = s; } }
      if (best < Infinity) { e.y = best - e.h; e.vy = 0; e.onGround = true; e.support = sup; }
    } else {
      for (let r = Math.floor(pt + 2e-3) - 1; r >= Math.floor(e.y); r--) {
        let hit = false; for (let c = c0; c <= c1; c++) if (solid(c, r)) { hit = true; break; }
        if (hit) { e.y = r + 1; e.vy = 0; e.bump = 1; break; }
      }
      for (const k of crates) if (k !== e && e.x < k.x + k.w - .02 && e.x + e.w > k.x + .02 && k.y + k.h <= pt + 2e-3 && k.y + k.h > e.y) { e.y = k.y + k.h; e.vy = 0; }
    }
  }
  // move everything standing on platform p along with it
  function carryRiders(p, dx, dy) {
    for (const list of [gn, crates, foes, bombs]) for (const e of list) {
      if (e.support !== p || e === p || e.dead) continue;
      if (dy) { e.y += dy; if (dy < 0 && headHit(e)) { e.y -= dy; e.support = null; e.onGround = false; continue; } }
      if (dx) { if (e.kind === 'crate') moveCrate(e, dx); else moveX(e, dx); }
      e.lastDx += dx; e.lastDy += dy;
    }
  }
  function headHit(e) { const r = Math.floor(e.y + .02); for (let c = Math.floor(e.x + .03); c <= Math.floor(e.x + e.w - .03); c++) if (solid(c, r)) return true; return false; }
  function ridersBlocked(p, dy) {
    for (const list of [gn, crates]) for (const e of list) if (e.support === p && !e.dead) { e.y += dy; const h = headHit(e) || (e.kind === 'crate' && ridersBlocked(e, dy)); e.y -= dy; if (h) return true; }
    return false;
  }

  /* ---------- platforms ---------- */
  function updPlat(p, dt) {
    let tx = p.x, ty = p.y;
    if (p.kind === 'elev') ty = isOn(p) ? p.y0 + p.ty : p.y0;
    else {
      if (!p.ch || chan[p.ch]) {
        if (p.wait > 0) p.wait -= dt;
        else { p.u += p.dirn * p.sp * dt / (Math.hypot(p.mx, p.my) || 1); if (p.u >= 1) { p.u = 1; p.dirn = -1; p.wait = 2.5; } else if (p.u <= 0) { p.u = 0; p.dirn = 1; p.wait = 2.5; } }
      }
      const e2 = .5 - .5 * Math.cos(p.u * Math.PI); tx = p.x0 + p.mx * e2; ty = p.y0 + p.my * e2;
    }
    let dx = 0, dy = 0;
    if (p.kind === 'elev') { const d = ty - p.y, m = p.sp * dt; dy = Math.abs(d) <= m ? d : Math.sign(d) * m; }
    else { dx = tx - p.x; dy = ty - p.y; }
    if (dy < 0 && ridersBlocked(p, dy)) dy = 0;
    if (dy > 0) { for (let c = Math.floor(p.x + .02); c <= Math.floor(p.x + p.w - .02); c++) if (solid(c, Math.floor(p.y + p.h + dy))) { dy = 0; break; } }
    const was = p.moving; p.moving = Math.abs(dy) + Math.abs(dx) > 1e-5 ? 1 : 0;
    if (p.kind === 'elev' && p.moving && !was) sfx('kbElev', p.x);
    p.x += dx; p.y += dy; p.dx = dx; p.dy = dy;
    if (dx || dy) carryRiders(p, dx, dy);
    // anyone caught inside the platform (e.g. fallen into its shaft) is scooped up onto it instead of getting stuck
    for (const list of [gn, crates]) for (const e of list) {
      if (e.dead || e.support === p || e.float || !(e.x < p.x + p.w && e.x + e.w > p.x && e.y < p.y + p.h && e.y + e.h > p.y + .06)) continue;
      const y0 = e.y; e.y = p.y - (e.h || 1); if (headHit(e)) { e.y = y0; continue; }
      e.vy = 0; e.onGround = true; e.support = p; e.airTop = e.y;
    }
  }

  /* ---------- crates ---------- */
  function crateFloorAt(c, r, self) { return solid(c, r) || oneway(c, r) || crates.some(o => o !== self && Math.abs(o.y - r) < .05 && Math.abs(o.x - c) < .99); }
  function updCrate(k, dt) {
    k.lastDx = 0; k.lastDy = 0;
    if (k.float) { k.bob = (k.bob || 0) + dt; return; }
    // conveyor
    if (k.onGround && k.support === TILE) { const cv = convAt(k); if (cv) moveCrate(k, cv * dt); }
    if (k.onGround && k.support === TILE) {
      const cc = Math.floor(k.x + .5), r = Math.round(k.y + 1);
      if (!crateFloorAt(cc, r, k) && !(crateFloorAt(Math.floor(k.x + .03), r, k) && crateFloorAt(Math.floor(k.x + .97), r, k))) {
        const nx = cc; if (!hitX({ x: nx, y: k.y, w: 1, h: 1 })) { carryRiders(k, nx - k.x, 0); k.x = nx; }
        k.onGround = false; k.support = null;
      }
    }
    if (k.onGround && k.support !== TILE) { if (k.support && (k.support.dead)) k.onGround = false; }
    k.vy = Math.min(MAXF, k.vy + G * dt);
    const y0 = k.y; moveY(k, k.vy * dt);
    if (k.y !== y0 && k.onGround === false) {
      // into liquid: float flush with the surface
      const c = Math.floor(k.x + .5), r = Math.floor(k.y + k.h - .5);
      if (tAt(c, r) === LQ) { let rs = r; while (tAt(c, rs - 1) === LQ) rs--; k.y = rs; k.x = c; k.float = true; k.onGround = true; k.vy = 0; k.support = TILE; sfx('kbSplash', c); splash(c + .5, rs + .1); }
    }
    const landed = k.onGround && k.y > y0 + .001;
    if (k.onGround && k.vy === 0 && k.wasAir) { sfx('kbLand', k.x); dust(k.x + .5, k.y + 1, 8); addShake(.08); for (const e of gn) if (!e.dead && ov(e, k, .08)) e.x = e.x + e.w / 2 < k.x + .5 ? k.x - e.w - .01 : k.x + 1.01; }
    k.wasAir = !k.onGround; if (landed) {}
    if (k.y > Ht + 3) crates.splice(crates.indexOf(k), 1);
  }
  function convAt(e) {
    const r = Math.floor(e.y + e.h + .05), c = Math.floor(e.x + e.w / 2), t = tAt(c, r);
    return t === CVL ? -2.3 : t === CVR ? 2.3 : 0;
  }

  /* ---------- gnomes ---------- */
  function updraft(e) {
    const cx = e.x + e.w / 2, b = e.y + e.h;
    for (const f of fans) {
      if (f.ch && !chan[f.ch]) continue;
      if (cx < f.c - .2 || cx > f.c + 1.2 || b > f.r + .05 || b < f.top - .5) continue;
      return 6 * clamp((b - f.top) / 2.2, 0, 1);
    }
    return 0;
  }
  const startClimb = e => { e.climb = true; e.vx = 0; e.vy = 0; e.onGround = false; e.support = null; e.shieldUp = false; e.dashT = 0; };
  function updGnome(e, dt) {
    e.lastDx = 0; e.lastDy = 0;
    if (e.dead) { e.deadT += dt; return; }
    const ctl = e === gn[cur] && state === 'play' && e.stun <= 0;
    e.invul -= dt; e.dashCd -= dt; e.throwCd -= dt; e.dropT -= dt; e.pushT -= dt; e.pullT -= dt; e.stun -= dt; e.giveT -= dt; e.useT -= dt; e.throwT -= dt; e.land -= dt; e.hurtT -= dt;
    e.blink -= dt; if (e.blink < -.12) e.blink = 2 + rnd2() * 3;
    if (e.hamT > 0) hammerTick(e, dt);
    const ix = ctl ? (keys.r ? 1 : 0) - (keys.l ? 1 : 0) : 0, cx = Math.floor(e.x + e.w / 2), x0 = e.x, y0 = e.y;
    if (ix || !e.onGround || e.climb) e.idleT = 0; else e.idleT += dt;
    if (ctl && !e.climb && e.dashT <= 0) {
      const body = ladder(cx, Math.floor(e.y + e.h * .5)) || ladder(cx, Math.floor(e.y + e.h - .05));
      if (keys.u && body) startClimb(e);
      else if (keys.d && e.onGround && e.support === TILE && ladder(cx, Math.floor(e.y + e.h + .02))) { startClimb(e); e.y += .06; }
    }
    if (e.climb) {
      e.x += (cx + .5 - e.w / 2 - e.x) * Math.min(1, dt * 14);
      const v = ctl ? (keys.d ? 1 : 0) - (keys.u ? 1 : 0) : 0;
      e.vx = 0; e.vy = 0; if (v) e.anim += dt * 1.4;
      if (ctl && e.k === 0 && jumpBuf > 0 && !v) { jumpBuf = 0; e.climb = false; e.vy = -JV * .75; e.vx = ix * SPD[0]; e.face = ix || e.face; sfx('kbJump', e.x); }
      else if (ix && !v) e.climb = false;
      else if (v < 0) {
        e.y -= CLIMB[e.k] * dt;
        if (headHit(e)) e.y = Math.floor(e.y + .02) + 1;
        const fr = Math.floor(e.y + e.h - .001);
        if (!ladder(cx, fr)) { e.y = fr + 1 - e.h; e.climb = false; e.onGround = true; e.support = TILE; }
      } else if (v > 0) {
        moveY(e, CLIMB[e.k] * dt);
        if (e.onGround) e.climb = false;
        else if (!ladder(cx, Math.floor(e.y + e.h * .5)) && !ladder(cx, Math.floor(e.y + e.h - .02))) e.climb = false;
      }
      e.airTop = e.y; e.lastDx = e.x - x0;
      if (e.climb) { e.onGround = false; hazards(e); return; }
    }
    if (e.dashT > 0) { dashTick(e, dt); hazards(e); return; }
    const onT = e.onGround && e.support === TILE, under = onT ? tAt(cx, Math.floor(e.y + e.h + .05)) : EM, ice = under === IC;
    const sp = SPD[e.k] * (e.pushT > 0 ? .6 : 1) * (e.k === 2 && e.shieldUp ? .88 : 1) * (e.hamT > 0 && e.onGround ? .25 : 1) * (e.throwT > 0 && e.onGround ? .3 : 1);
    const acc = e.onGround ? (ice ? 7 : 58) : 40;
    e.vx += clamp(ix * sp - e.vx, -acc * dt, acc * dt);
    if (ix && e.hamT <= 0 && e.throwT <= 0) e.face = ix;
    const carry = onT ? convAt(e) : 0;
    if (ctl && e.k === 0 && jumpBuf > 0 && (e.onGround || e.coyote > 0)) { e.vy = -JV; e.onGround = false; e.coyote = 0; jumpBuf = 0; e.support = null; sfx('kbJump', e.x); dust(e.x + e.w / 2, e.y + e.h, 4); }
    if (e.k === 0 && !(ctl && keys.j) && e.vy < -5) e.vy += G * 1.5 * dt;
    const glide = e.k === 2 && e.shieldUp;
    e.vy = Math.min(e.vy + G * dt, glide ? GLIDE : MAXF);
    if (glide) { const u = updraft(e); if (u > 0) { if (!e.inFan) sfx('kbFan', e.x); e.inFan = 1; e.vy += clamp(-u - e.vy, -70 * dt, 70 * dt); e.airTop = e.y; e.glide = 1; } else e.inFan = 0; }
    if (ctl && keys.d && e.onGround && e.support === TILE) { const r = Math.round(e.y + e.h); for (let c = Math.floor(e.x + .02); c <= Math.floor(e.x + e.w - .02); c++) if (oneway(c, r) && !ladder(c, r)) e.dropT = .2; }
    if (ctl && keys.d && e.onGround && e.support && e.support.kind) e.dropT = .2;
    moveX(e, (e.vx + carry) * dt, true);
    if (e.wall && Math.abs(ix) && e.k === 0 && e.onGround) {}
    const air = !e.onGround;
    moveY(e, e.vy * dt);
    if (e.onGround) { if (air) land(e); e.airTop = e.y; e.coyote = .08; e.glide = 0; } else { e.airTop = Math.min(e.airTop, e.y); e.coyote -= dt; if (glide && e.vy > 0) e.glide = 1; }
    if (e.onGround && Math.abs(e.vx) > .3) e.anim += dt * Math.abs(e.vx) / 4.2;
    e.lastDx += e.x - x0; e.lastDy += e.y - y0;
    hazards(e);
  }
  function land(e) {
    const drop = e.y - e.airTop;
    if (drop > .9) { e.land = .16; dust(e.x + e.w / 2, e.y + e.h, Math.min(10, 3 + drop * 1.5)); sfx('kbLand', e.x); }
    if ((e.k === 2 && e.shieldUp) || e.support === gn[2]) return;
    if (drop > 9.5) { e.hearts = 0; hurtFx(e); kill(e, `${NAMES[e.k]} viel veel te diep…`); }
    else if (drop > 6.2) { hurt(e, 1, 0); addShake(.25); }
  }
  function hazards(e) {
    if (e.dead || state !== 'play') return;
    const c0 = Math.floor(e.x + .05), c1 = Math.floor(e.x + e.w - .05), r0 = Math.floor(e.y + .05), r1 = Math.floor(e.y + e.h - .05);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      const t = tAt(c, r);
      if (t === SK && e.y + e.h > r + .5) { if (hurt(e, 1, 0)) { e.vy = -10; e.onGround = false; e.climb = false; } }
      else if (t === LQ && e.y + e.h > r + .3) { splash(e.x + e.w / 2, r + .2); sfx('kbSplash', c); e.hearts = 0; kill(e, `${NAMES[e.k]} is in het ${WORLDS[world].liq} gevallen!`); return; }
    }
    // magic barriers hurt on touch
    const cs = Math.floor(e.x - .08), ce = Math.floor(e.x + e.w + .08);
    for (let c = cs; c <= ce; c++) for (let r = r0; r <= r1; r++) if (inb(c, r) && dhurt[r * Wd + c]) { const dir = c + .5 < e.x + e.w / 2 ? 1 : -1; if (hurt(e, 1, dir)) { sparkBurst(c + .5, e.y + .5, '#bff', 10); } }
    if (e.y > Ht + 1.5) { e.hearts = 0; kill(e, `${NAMES[e.k]} is in de diepte gevallen!`); }
  }
  function hurt(e, n, dir) {
    if (e.invul > 0 || state !== 'play' || e.dead) return false;
    e.hearts = Math.max(0, e.hearts - n); e.invul = 1.3; e.hurtT = .35; sfx('kbHurt', e.x); vibrate(40); addShake(.3);
    if (dir) { e.vx = dir * 6; e.vy = -7; e.onGround = false; e.climb = false; e.dashT = 0; }
    hurtFx(e);
    if (e.hearts <= 0) kill(e, `${NAMES[e.k]} is uitgeschakeld!`);
    return true;
  }
  function kill(e, msg) {
    if (e.dead || state !== 'play') return;
    e.dead = true; e.deadT = 0; e.hearts = 0; state = 'fail'; stateT = 1.7; failMsg = msg; prog.deaths = (prog.deaths || 0) + 1; saveProg();
    sfx('kbFail'); vibrate(80); banner(msg, 1700); addShake(.4);
  }
  function win() {
    if (state !== 'play') return;
    state = 'win'; stateT = 2; sfx('kbWin');
    const t = Math.round(time * 10) / 10, gemsAll = gemGot >= gemTotal, par = time <= L.par;
    const stars = 1 + (gemsAll ? 1 : 0) + (par ? 1 : 0);
    const b = prog.best[lv]; prog.best[lv] = b == null ? t : Math.min(b, t);
    const rec = b != null && t < b;
    prog.stars[lv] = Math.max(prog.stars[lv] || 0, stars); prog.gems[lv] = Math.max(prog.gems[lv] || 0, gemGot);
    if (lv + 2 > prog.unlocked) prog.unlocked = Math.min(LEVELS.length, lv + 2);
    saveProg();
    endInfo = { t, stars, gemsAll, par, rec, first: b == null };
    for (const e of gn) sparkBurst(e.x + e.w / 2, e.y + .3, ['#7fc4ff', '#ff8a6a', '#7fe08a'][e.k], 18);
  }

  /* ---------- abilities ---------- */
  function interact(e) {
    const cx = Math.floor(e.x + e.w / 2), rb = Math.floor(e.y + e.h - .1), rt = Math.floor(e.y + .1);
    for (const o of objs) {
      if (o.t === 'lever' && o.c === cx && o.r >= rt && o.r <= rb) { o.on = !o.on; e.pullT = .35; sfx('kbLever', o.c); vibrate(12); updChannels(); sparkBurst(o.c + .5, o.r + .4, CHCOL[o.ch], 8); return true; }
      if (o.t === 'tele' && o.c === cx && o.r === rb && o.cd <= 0) { const to = objs.find(p => p.t === 'tele' && p.tag === o.tag && p !== o); if (to) { teleport(e, o, to); return true; } }
      if (o.t === 'sign' && Math.abs(o.c + .5 - (e.x + e.w / 2)) < .9 && o.r >= rt - 1 && o.r <= rb) { banner(o.text, 4200); return true; }
    }
    const lk = nearLock(e); if (lk) { const i = e.inv.indexOf('k' + lk.col); if (i >= 0) { e.sel = i; useItem(e); return true; } }
    const so = nearSocket(e); if (so && !so.on) { const i = e.inv.indexOf('gear'); if (i >= 0) { e.sel = i; useItem(e); return true; } }
    return false;
  }
  function teleport(e, a, b) {
    sfx('kbTele', a.c); sparkBurst(e.x + e.w / 2, e.y + e.h / 2, '#c9a7ff', 16);
    e.x = b.c + .5 - e.w / 2; e.y = b.r + 1 - e.h; e.vx = e.vy = 0; e.airTop = e.y; a.cd = b.cd = .6;
    sparkBurst(e.x + e.w / 2, e.y + e.h / 2, '#c9a7ff', 16); e.invul = Math.max(e.invul, .2);
  }
  function nearLock(e) {
    for (const o of objs) if (o.t === 'lock' && !o.open) for (const [c, r] of o.cells) if (r >= Math.floor(e.y) - 1 && r <= Math.floor(e.y + e.h - .05) && (Math.abs(c - (e.x + e.w)) < .35 || Math.abs(c + 1 - e.x) < .35)) return o;
    return null;
  }
  function nearSocket(e) { for (const o of objs) if (o.t === 'socket' && Math.abs(o.c + .5 - e.x - e.w / 2) < 1.1 && Math.abs(o.r + .5 - e.y - e.h / 2) < 1) return o; return null; }
  // ability buttons: A = Springen / Hamer / Schild vooruit, B = Kopstoot / Katapult / Schild omhoog
  function abilityA(e) {
    if (e.dead) return;
    if (e.k === 0) jumpBuf = .12;
    else if (e.climb) return;
    else if (e.k === 1) { if (e.hamT <= 0 && e.throwT <= 0) { e.hamT = .34; e.hamHit = false; sfx('kbSwing', e.x); } }
    else setShield(e, false);
  }
  function abilityB(e) {
    if (e.climb || e.dead) return;
    if (e.k === 0) startDash(e);
    else if (e.k === 1) throwNut(e);
    else setShield(e, true);
  }
  function setShield(e, up) { if (e.shieldUp === up) return; e.shieldUp = up; sfx(up ? 'kbShieldUp' : 'kbShield', e.x); if (typeof hud === 'function') hud(); }
  function startDash(e) {
    if (e.dashCd > 0 || !e.onGround || e.dashT > 0) return;
    e.dashT = .24; e.dashCd = .6; e.dashHit = false; e.vy = 0; sfx('kbDash', e.x); dust(e.x + e.w / 2, e.y + e.h, 5);
  }
  function dashTick(e, dt) {
    e.dashT -= dt; e.vx = e.face * DASH; e.vy = 0;
    const x0 = e.x; moveX(e, e.vx * dt); e.lastDx = e.x - x0;
    if (rnd2() < .5) parts.push({ x: e.x + e.w / 2 - e.face * .3, y: e.y + e.h * (.3 + rnd2() * .6), vx: -e.face * 2, vy: 0, life: .25, max: .25, col: 'rgba(255,255,255,.7)', s: .05, k: 'line', g: 0 });
    // buttons on the way
    for (const o of objs) if (o.t === 'button' && cellIn(e, o.c, o.r, -.15)) hitButton(o);
    // enemies
    for (const f of foes) if (!f.dead && f.t !== 'boss' && ov(e, f, -.1)) { damageFoe(f, 1, e.face); endDash(e, false); return; }
    for (const f of foes) if (!f.dead && f.t === 'boss' && ov(e, f, -.1)) { damageFoe(f, 1, e.face); endDash(e, false); return; }
    if (e.wall) {
      const c = e.wall > 0 ? Math.floor(e.x + e.w + .05) : Math.floor(e.x - .05); let broke = false;
      for (let r = Math.floor(e.y + .05); r <= Math.floor(e.y + e.h - .05); r++) if (tAt(c, r) === CK) { crumble(c, r); broke = true; }
      if (broke) { endDash(e, false); return; }
      endDash(e, true); return;
    }
    if (e.dashT <= 0) { e.dashT = 0; e.vx = e.face * SPD[0]; }
  }
  function endDash(e, bonk) {
    e.dashT = 0;
    if (bonk) { e.stun = .7; e.vx = -e.face * 3.5; e.vy = -5; e.onGround = false; sfx('kbBonk', e.x); addShake(.25); for (let i = 0; i < 4; i++) texts.push({ k: 'star', x: e.x + e.w / 2, y: e.y - .1, a: i * 1.57, life: .7 }); }
    else { e.vx = -e.face * 2.5; e.vy = -3; e.onGround = false; addShake(.18); }
  }
  function hammerTick(e, dt) {
    e.hamT -= dt;
    if (!e.hamHit && e.hamT < .17) {
      e.hamHit = true;
      const box = { x: e.face > 0 ? e.x + e.w - .15 : e.x - 1.05, y: e.y - .2, w: 1.2, h: e.h + .15 }; let hit = false;
      for (let c = Math.floor(box.x); c <= Math.floor(box.x + box.w); c++) for (let r = Math.floor(box.y); r <= Math.floor(box.y + box.h - .01); r++) { const t = tAt(c, r); if (t === CK || t === BO) { crumble(c, r); hit = true; } }
      for (const o of objs) if (o.t === 'button' && ov(box, { x: o.c, y: o.r, w: 1, h: 1 })) { hitButton(o); hit = true; }
      for (const f of foes) if (!f.dead && ov(box, f)) { damageFoe(f, f.t === 'boss' || f.t === 'knight' ? 1 : 2, e.face); hit = true; }
      if (hit) { sfx('kbHit', e.x); vibrate(25); addShake(.2); sparkBurst(box.x + box.w / 2, e.y + .4, '#fff1b0', 8); }
      else { const c = Math.floor(e.face > 0 ? box.x + box.w - .05 : box.x + .05); for (let r = Math.floor(e.y + .1); r <= Math.floor(e.y + e.h - .1); r++) if (solid(c, r)) { sfx('kbClank', e.x); sparkBurst(e.face > 0 ? c : c + 1, r + .5, '#fff', 5); break; } }
    }
  }
  function throwNut(e) {
    if (e.throwCd > 0 || e.hamT > 0) return;
    e.throwCd = .5; e.throwT = .3;
    shots.push({ kind: 'nut', x: e.x + e.w / 2 + e.face * .35, y: e.y + .38, vx: e.face * 13, vy: 0, g: 0, life: 1.1, own: 1, rot: 0 });
    sfx('kbThrow', e.x);
  }
  function hitButton(o) { if (o.flash > 0) return; o.on = !o.on; o.flash = .35; sfx('kbButton', o.c); sparkBurst(o.c + .5, o.r + .5, CHCOL[o.ch], 10); updChannels(); }
  function crumble(c0, r0) {
    const q = [[c0, r0]], want = tAt(c0, r0); let n = 0;
    while (q.length && n < 14) {
      const [c, r] = q.pop(); if (tAt(c, r) !== want || !inb(c, r)) continue; setTile(c, r, EM); n++;
      debris(c + .5, r + .5, want === HD ? ['#7d7f86', '#5a5c63', '#a3a5ac'] : want === BO ? ['#8d8a84', '#6e6a64', '#a9a49b'] : WALLDEB[world], 10);
      q.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
    }
    sfx('kbBreak', c0); addShake(.3); vibrate(20);
  }
  const WALLDEB = [['#9a8f80', '#7b7064', '#b8ab98'], ['#8a7ea8', '#665b85', '#b7a6e0'], ['#9a7a5a', '#6e543a', '#c09a6a'], ['#cfe6f5', '#9cc6e4', '#ffffff'], ['#8f8aa0', '#6a6578', '#b3aec3']];
  function damageFoe(f, n, dir) {
    if (f.dead || f.inv > 0) return;
    f.hp -= n; f.inv = f.t === 'boss' ? .9 : .25;
    if (f.t === 'boss') { sfx('kbBossHit', f.x); addShake(.3); sparkBurst(f.x + f.w / 2, f.y + .8, '#ffd27a', 14); }
    if (f.hp <= 0) {
      f.dead = .001; sfx(f.t === 'boss' ? 'kbBossDie' : 'kbDefeat', f.x); sparkBurst(f.x + f.w / 2, f.y + f.h / 2, '#ffffff', 14); poof(f.x + f.w / 2, f.y + f.h / 2);
      if (f.t === 'boss') { addShake(.8); for (let i = 0; i < 4; i++) debris(f.x + f.w / 2, f.y + 1, WALLDEB[4], 12); updChannels(); banner('🎉 De Steenreus is verslagen! De poort gaat open.', 2600); }
    } else if (f.t !== 'boss') { f.stun = .6; if (f.vx !== undefined) f.vx = Math.abs(f.vx) * dir; f.knock = dir * 4; sfx('kbHit', f.x); }
  }

  /* ---------- inventory ---------- */
  function pickup(e) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i], dx = it.x - (e.x + e.w / 2), dy = it.y - (e.y + e.h / 2);
      if (Math.abs(dx) > e.w / 2 + .3 || Math.abs(dy) > e.h / 2 + .3) continue;
      if (it.it === 'gem') { items.splice(i, 1); gemGot++; sfx('kbGem', it.x); sparkBurst(it.x, it.y, '#9ff3ff', 12); texts.push({ k: 'txt', t: `💎 ${gemGot}/${gemTotal}`, x: it.x, y: it.y - .3, life: 1.1 }); hudGems(); continue; }
      if (e.inv.length >= INV) { if (!msgCd.full || msgCd.full < clock) { msgCd.full = clock + 3; banner(`De zakken van ${NAMES[e.k]} zitten vol`, 1400); } continue; }
      items.splice(i, 1); e.inv.push(it.it); sfx('kbPickup', it.x); sparkBurst(it.x, it.y, '#fff3a0', 10);
      texts.push({ k: 'icon', it: it.it, x: it.x, y: it.y - .2, life: 1 });
      if (e === gn[cur]) e.sel = e.inv.length - 1;
      if (typeof hud === 'function') hud();
      if (!prog.seenInv) { prog.seenInv = 1; saveProg(); banner(`${ITEM[it.it]} opgepakt! Kies een vakje onderin en tik op <b>Gebruik</b> of <b>Geef</b>.`, 3800); }
    }
  }
  function useItem(e) {
    if (!e || e.dead || state !== 'play') return false;
    const it = e.inv[e.sel]; if (!it) { banner('Kies eerst een voorwerp', 1100); return false; }
    if (it[0] === 'k' && it.length === 2) {
      const lk = nearLock(e);
      if (lk && 'k' + lk.col === it) { lk.open = true; applyObj(lk); takeItem(e, e.sel); sfx('kbUnlock', lk.c); for (const [c, r] of lk.cells) debris(c + .5, r + .5, ['#c8903e', '#8a5a26', '#e8c070'], 6); banner('🔓 Open!', 1100); return true; }
      banner(lk ? 'Deze sleutel past niet op dit slot' : 'Ga eerst naast een deur met een slot staan', 1500); return false;
    }
    if (it === 'gear') {
      const so = nearSocket(e);
      if (so && !so.on) { so.on = true; takeItem(e, e.sel); sfx('kbGear', so.c); sparkBurst(so.c + .5, so.r + .5, CHCOL[so.ch], 14); updChannels(); banner('⚙️ Het tandwiel past! De machine draait.', 1800); return true; }
      banner('Zoek een machine waar dit tandwiel in past', 1500); return false;
    }
    if (it === 'apple') {
      if (e.hearts >= 3) { banner(`${NAMES[e.k]} is al helemaal gezond`, 1200); return false; }
      e.hearts++; takeItem(e, e.sel); sfx('kbEat', e.x); sparkBurst(e.x + e.w / 2, e.y + .3, '#ff7a8a', 12); texts.push({ k: 'txt', t: '+♥', x: e.x + e.w / 2, y: e.y - .2, life: 1, col: '#ff8a9a' }); return true;
    }
    if (it === 'bomb') {
      if (e.climb) return false;
      bombs.push({ x: e.x + e.w / 2 - .25, y: e.y + e.h - .5, w: .5, h: .5, vy: 0, fuse: 2.2, onGround: false, support: null, lastDx: 0, lastDy: 0 });
      takeItem(e, e.sel); sfx('kbFuse', e.x); banner('💣 Wegwezen!', 900); return true;
    }
    return false;
  }
  function takeItem(e, i) { e.inv.splice(i, 1); e.sel = clamp(e.sel, 0, Math.max(0, e.inv.length - 1)); if (typeof hud === 'function') hud(); }
  function giveItem(e) {
    if (!e || e.dead || state !== 'play') return false;
    const it = e.inv[e.sel]; if (!it) { banner('Kies eerst een voorwerp om te geven', 1200); return false; }
    let best = null, bd = 9;
    for (const o of gn) if (o !== e && !o.dead) { const dx = Math.abs(o.x + o.w / 2 - e.x - e.w / 2), dy = Math.abs(o.y + o.h - e.y - e.h); if (dx < 2 && dy < 1.4 && dx + dy < bd) { bd = dx + dy; best = o; } }
    if (!best) { banner('Ga naast een andere kabouter staan om iets te geven', 1600); return false; }
    if (best.inv.length >= INV) { banner(`De zakken van ${NAMES[best.k]} zitten vol`, 1400); return false; }
    takeItem(e, e.sel); best.inv.push(it); best.sel = best.inv.length - 1; e.giveT = .3; best.giveT = .3;
    texts.push({ k: 'fly', it, x: e.x + e.w / 2, y: e.y + .2, tx: best.x + best.w / 2, ty: best.y + .2, life: .45, max: .45 });
    sfx('kbGive', e.x); if (typeof hud === 'function') hud();
    return true;
  }

  /* ---------- bombs ---------- */
  function updBomb(b, dt) {
    b.vy = Math.min(MAXF, b.vy + G * dt); moveY(b, b.vy * dt); b.fuse -= dt;
    if (rnd2() < .6) parts.push({ x: b.x + .38, y: b.y - .02, vx: (rnd2() - .5) * 1.5, vy: -1.5 - rnd2(), life: .3, max: .3, col: rnd2() < .5 ? '#ffd27a' : '#ff8a3a', s: .035, g: .3, gl: 1 });
    if (b.fuse > 0) return;
    b.dead = true; const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (let c = Math.floor(cx - 2); c <= Math.floor(cx + 2); c++) for (let r = Math.floor(cy - 2); r <= Math.floor(cy + 2); r++) {
      const t = tAt(c, r); if ((t === CK || t === HD || t === BO) && Math.hypot(c + .5 - cx, r + .5 - cy) < 1.9) crumble(c, r);
    }
    for (const f of foes) if (!f.dead && Math.hypot(f.x + f.w / 2 - cx, f.y + f.h / 2 - cy) < 1.9 + f.w / 2) damageFoe(f, 2, Math.sign(f.x + f.w / 2 - cx) || 1);
    for (const e of gn) if (!e.dead && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 1.6) hurt(e, 1, Math.sign(e.x + e.w / 2 - cx) || 1);
    sfx('kbBomb', cx); addShake(.7); vibrate(60); explosionFx(cx, cy);
  }

  /* ---------- enemies ---------- */
  function updFoe(f, dt) {
    if (f.dead) { f.dead += dt; return; }
    f.anim += dt; f.inv -= dt;
    if (f.t === 'walker' || f.t === 'knight') {
      if (f.stun > 0) { f.stun -= dt; if (f.knock) { moveX(f, f.knock * dt); f.knock *= .9; } }
      else {
        let sp = 1.3;
        for (const e of gn) if (!e.dead && Math.abs(e.y + e.h - f.y - f.h) < .6) { const d = (e.x + e.w / 2 - f.x - f.w / 2) * Math.sign(f.vx); if (d > 0 && d < 4.5) sp = f.t === 'knight' ? 1.9 : 2.3; }
        f.vx = Math.sign(f.vx || 1) * sp; f.face = Math.sign(f.vx);
        const nx = f.x + f.vx * dt, front = f.vx > 0 ? nx + f.w : nx, fc = Math.floor(front), fr = Math.floor(f.y + f.h + .05), br = Math.floor(f.y + f.h - .1);
        const ground = solid(fc, fr) || oneway(fc, fr) || crates.some(k => fc >= Math.floor(k.x) && fc <= Math.floor(k.x + .99) && Math.abs(k.y - (f.y + f.h)) < .1) || plats.some(p => front > p.x && front < p.x + p.w && Math.abs(p.y - f.y - f.h) < .1);
        const blocked = solid(fc, br) || solid(fc, Math.floor(f.y + .1)) || !ground || tAt(fc, br) === SK || tAt(fc, fr) === LQ || crates.some(k => ov({ x: nx, y: f.y, w: f.w, h: f.h }, k, .02));
        if (blocked) f.vx = -f.vx; else f.x = nx;
      }
      f.vy = Math.min(MAXF, (f.vy || 0) + G * dt); moveY(f, f.vy * dt);
      if (f.y > Ht + 2 || tAt(Math.floor(f.x + f.w / 2), Math.floor(f.y + f.h - .2)) === LQ) { f.dead = .001; }
      contact(f);
    } else if (f.t === 'archer') {
      f.cd -= dt;
      if (f.wind > 0) { f.wind -= dt; if (f.wind <= 0) { shots.push({ kind: world === 3 ? 'snow' : 'arrow', x: f.x + f.w / 2 + f.face * .45, y: f.y + .45, vx: f.face * 8.5, vy: 0, g: 0, life: 2.4, own: 0 }); sfx(world === 3 ? 'kbSnow' : 'kbArrow', f.x); f.cd = 1.6; } }
      else if (f.cd <= 0 && state === 'play') for (const e of gn) {
        if (e.dead) continue; const ex = e.x + e.w / 2, d = (ex - f.x - f.w / 2) * f.face;
        if (d <= 0 || d > 11 || e.y + e.h < f.y + .3 || e.y > f.y + .8) continue;
        let clear = true; const r = Math.floor(f.y + .45); for (let c = Math.floor(f.x + f.w / 2) + f.face; c !== Math.floor(ex); c += f.face) if (solid(c, r)) { clear = false; break; }
        if (clear) { f.wind = .55; break; }
      }
      contact(f);
    } else if (f.t === 'bat') {
      if (f.stun > 0) f.stun -= dt; else f.ph += dt;
      const nx = f.x0 + Math.sin(f.ph * .9) * f.rng - f.w / 2, ny = f.y0 + Math.sin(f.ph * 2.3) * .45 - f.h / 2;
      f.face = nx > f.x ? 1 : -1; f.x = nx; f.y = ny;
      contact(f);
    } else if (f.t === 'boss') updBoss(f, dt);
  }
  function contact(f) {
    if (state !== 'play') return;
    for (const e of gn) {
      if (e.dead || !ov(e, f, .08)) continue;
      if (e.dashT > 0) continue;
      const dir = Math.sign(f.x + f.w / 2 - e.x - e.w / 2) || 1;
      if (e.k === 2 && !e.shieldUp && e.face === dir && !e.climb && f.t !== 'boss') {
        sfx('kbBlock', f.x); sparkBurst(e.x + e.w / 2 + dir * .4, e.y + .5, '#fff4c0', 6);
        if (f.t === 'bat') { f.ph -= .6; f.stun = .4; }
        else { f.vx = Math.abs(f.vx || 1) * dir; f.stun = .5; f.knock = dir * 4; const nx = dir > 0 ? e.x + e.w + .02 : e.x - f.w - .02; if (f.t !== 'archer' && !hitX({ x: nx, y: f.y, w: f.w, h: f.h })) f.x = nx; }
        continue;
      }
      hurt(e, 1, -dir);
    }
  }
  function updBoss(f, dt) {
    f.vy = Math.min(MAXF, f.vy + G * dt); moveY(f, f.vy * dt);
    if (state !== 'play') return;
    let tgt = null, bd = 99; for (const e of gn) if (!e.dead) { const d = Math.abs(e.x - f.x); if (d < bd) { bd = d; tgt = e; } }
    if (!tgt) return;
    const dir = Math.sign(tgt.x + tgt.w / 2 - f.x - f.w / 2) || 1, fast = f.hp <= f.maxHp / 2;
    if (f.wind > 0) {
      f.wind -= dt;
      if (f.wind <= 0) {
        const n = fast ? 2 : 1;
        for (let i = 0; i < n; i++) { const dx = (tgt.x + tgt.w / 2) - (f.x + f.w / 2) + (i ? dir * 1.6 : 0), tt = 1.05 + i * .15, vx = dx / tt, vy = (-(f.y + .3 - tgt.y - .3) - .5 * 22 * tt * tt) / tt;
          shots.push({ kind: 'rock', x: f.x + f.w / 2 + f.face * .6, y: f.y + .2, vx: clamp(vx, -9, 9), vy: clamp(vy, -16, -4), g: 22, life: 3, own: 0, rot: 0 }); }
        sfx('kbBossThrow', f.x); f.cd = fast ? 2.2 : 3;
      }
    } else {
      f.face = dir; f.cd -= dt;
      if (f.cd <= 0 && bd < 12) { f.wind = .8; }
      else if (bd > 1.2) { f.vx = dir * (fast ? 1.6 : 1.1); const nx = clamp(f.x + f.vx * dt, f.xmin, f.xmax); moveX(f, nx - f.x); f.anim += dt; }
    }
    for (const e of gn) if (!e.dead && ov(e, f, .1) && e.dashT <= 0) { const d = Math.sign(e.x + e.w / 2 - f.x - f.w / 2) || 1; hurt(e, 1, d * 1.6); }
  }
  /* ---------- projectiles ---------- */
  function updShot(p, dt) {
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot = (p.rot || 0) + dt * 14 * Math.sign(p.vx || 1);
    if (p.life <= 0) { p.dead = 1; return; }
    const pc = Math.floor(p.x), pr = Math.floor(p.y);
    if (solid(pc, pr) && !(inb(pc, pr) && dhurt[pr * Wd + pc])) { p.dead = 1; sparkBurst(p.x - Math.sign(p.vx) * .1, p.y, p.kind === 'snow' ? '#fff' : '#d8c09a', 6); if (p.kind === 'rock') { debris(p.x, p.y, WALLDEB[4], 6); sfx('kbRockHit', p.x); } else sfx('kbTick', p.x); return; }
    for (const k of crates) if (p.x > k.x && p.x < k.x + 1 && p.y > k.y && p.y < k.y + 1) { p.dead = 1; sparkBurst(p.x, p.y, '#d8c09a', 5); sfx('kbTick', p.x); return; }
    if (p.own) {
      for (const o of objs) if (o.t === 'button' && p.x > o.c && p.x < o.c + 1 && p.y > o.r && p.y < o.r + 1) { hitButton(o); p.dead = 1; return; }
      for (const f of foes) if (!f.dead && p.x > f.x - .1 && p.x < f.x + f.w + .1 && p.y > f.y && p.y < f.y + f.h) { damageFoe(f, 1, Math.sign(p.vx)); p.dead = 1; sparkBurst(p.x, p.y, '#ffe9a8', 6); return; }
      return;
    }
    let best = null, bx = -1e9;
    for (const e of gn) {
      if (e.dead) continue;
      const sh = e.k === 2 && !e.shieldUp && !e.climb, x0 = e.x - (sh && e.face < 0 ? .3 : 0), x1 = e.x + e.w + (sh && e.face > 0 ? .3 : 0), top = shieldTop(e);
      const y0 = top !== null ? top - .1 : e.y;
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > e.y + e.h) continue;
      const edge = p.vx < 0 ? x1 : -x0; if (!best || edge > bx) { best = e; bx = edge; }
    }
    if (!best) return;
    const e = best; p.dead = 1;
    const top = shieldTop(e);
    if ((e.k === 2 && !e.shieldUp && !e.climb && e.face === -Math.sign(p.vx) && Math.abs(p.vx) > 1) || (top !== null && p.vy > 0 && p.y < e.y + .1)) {
      sfx(p.kind === 'rock' ? 'kbRockHit' : 'kbBlock', p.x); sparkBurst(p.x, p.y, '#fff2b0', 10); if (p.kind === 'rock') debris(p.x, p.y, WALLDEB[4], 6);
    } else hurt(e, 1, Math.sign(p.vx) || 1);
  }

  /* ---------- fire jets ---------- */
  const DIRV = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  function updFire(o) {
    const on = (!o.ch || !chan[o.ch]) && ((time + o.ph) % o.per) < o.dur, warm = (!o.ch || !chan[o.ch]) && ((time + o.ph) % o.per) > o.per - .5;
    if (on && !o.on) sfx('kbFire', o.c);
    o.on = on; o.warm = warm; o.ext = 0;
    if (!on) return;
    const [dx, dy] = DIRV[o.dir];
    let n = 0, c = o.c, r = o.r;
    for (; n < o.len; n++) {
      c += dx; r += dy; if (solid(c, r)) break;
      let blocked = false;
      for (const e of gn) {
        if (e.dead || !cellIn(e, c, r, .1)) continue;
        const s = e.k === 2 && !e.climb && ((dy === 0 && !e.shieldUp && e.face === -dx) || (dy > 0 && e.shieldUp));
        if (s) { blocked = true; if (rnd2() < .3) sparkBurst(e.x + e.w / 2 - dx * .3, dy > 0 ? e.y - .3 : e.y + .5, '#ffcf6a', 2); }
      }
      if (blocked) { o.ext = n + .3; break; }
      for (const e of gn) if (!e.dead && cellIn(e, c, r, .12)) hurt(e, 1, dx || (e.x + e.w / 2 < c + .5 ? -1 : 1));
      for (const f of foes) if (!f.dead && f.t !== 'boss' && f.w && cellIn(f, c, r, .1)) damageFoe(f, 1, dx || 1);
      o.ext = n + 1;
    }
  }

  /* ---------- main step ---------- */
  function step(dt) {
    clock += dt;
    if (state === 'play') {
      time += dt; if (jumpBuf > 0) jumpBuf -= dt;
      const e = gn[cur];
      if (actReq) { actReq = false; if (!interact(e) && nothingT < clock) { nothingT = clock + 4; banner('Hier is niets om aan te trekken of te gebruiken', 1300); } }
      if (aReq) { aReq = false; abilityA(e); }
      if (bReq) { bReq = false; abilityB(e); }
      for (const o of objs) {
        if (o.t === 'plate') {
          let on = false;
          for (const b of gn) if (!b.dead && b.onGround && Math.abs(b.y + b.h - o.r - 1) < .06 && b.x < o.c + .85 && b.x + b.w > o.c + .15) on = true;
          for (const k of crates) if (Math.abs(k.y + 1 - o.r - 1) < .06 && k.x < o.c + .85 && k.x + 1 > o.c + .15) on = true;
          for (const f of foes) if (!f.dead && f.w && f.onGround && Math.abs(f.y + f.h - o.r - 1) < .06 && f.x < o.c + .85 && f.x + f.w > o.c + .15) on = true;
          if (on !== o.on) { o.on = on; sfx('kbPlate', o.c); updChannels(); }
        } else if (o.t === 'gate' && o.open !== isOn(o)) updChannels();
        else if (o.t === 'sign' && !e.dead && Math.abs(o.c + .5 - e.x - e.w / 2) < .6 && Math.abs(o.r + 1 - e.y - e.h) < 1.1 && !(o.shownT > clock)) { o.shownT = clock + 10; banner('📜 ' + o.text, 4500); }
        if (o.flash > 0) o.flash -= dt; if (o.cd > 0) o.cd -= dt;
      }
      for (const p of plats) updPlat(p, dt);
      for (const k of crates.slice()) updCrate(k, dt);
      for (const i of [2, 0, 1]) { updGnome(gn[i], dt); if (!gn[i].dead) pickup(gn[i]); }
      for (const f of foes) updFoe(f, dt);
      foes = foes.filter(f => !f.dead || f.dead < .8);
      for (const p of shots) updShot(p, dt); shots = shots.filter(p => !p.dead);
      for (const b of bombs) updBomb(b, dt); bombs = bombs.filter(b => !b.dead);
      for (const o of fires) updFire(o);
      // exit
      let all = state === 'play';
      for (const g2 of gn) {
        const h = !g2.dead && g2.onGround && tAt(Math.floor(g2.x + g2.w / 2), Math.floor(g2.y + g2.h - .1)) === EX;
        if (h && !g2.home) { g2.home = true; sfx('kbHome', g2.x); sparkBurst(g2.x + g2.w / 2, g2.y + .4, '#bfffbf', 10); if (g2 === gn[cur]) switchT = .7; if (typeof hud === 'function') hud(); }
        else if (!h && g2.home) { g2.home = false; if (typeof hud === 'function') hud(); }
        all = all && h;
      }
      if (switchT > 0) { switchT -= dt; if (switchT <= 0 && gn[cur].home) { const nx = [1, 2].map(k => (cur + k) % 3).find(k => !gn[k].home && !gn[k].dead); if (nx !== undefined) select(nx); } }
      if (all) win();
    } else if (state === 'fail') { stateT -= dt; for (const e of gn) e.deadT += dt; if (stateT <= 0) { state = 'over'; if (typeof showFail === 'function') showFail(); } }
    else if (state === 'win') { stateT -= dt; for (const e of gn) e.anim += dt; if (stateT <= 0) { state = 'done'; if (typeof showWin === 'function') showWin(); } }
    // gate / bridge animation
    for (const o of objs) {
      const want = o.t === 'gate' || o.t === 'lock' ? (o.open ? 1 : 0) : o.t === 'lever' || o.t === 'button' ? (o.on ? 1 : 0) : o.on ? 1 : 0;
      o.a += clamp(want - o.a, -dt * 3.2, dt * 3.2);
    }
    updParts(dt);
  }
  function select(i) {
    if (i === cur || state !== 'play' || !gn[i] || gn[i].dead) return;
    cur = i; switchT = 0; jumpBuf = 0; sfx('kbSwitch'); if (typeof onSelect === 'function') onSelect();
  }
