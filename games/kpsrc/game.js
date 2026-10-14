  /* ---------- game ---------- */
  const { DT, REST, CRIT, RAC, LEVELS } = KP;
  const D = { sound: true, guide: true };
  const opt = Object.assign({}, D, store.get('kp.settings', {}));
  const saveOpt = () => store.set('kp.settings', opt);
  let prog = Object.assign({ unlocked: 1, stars: {}, best: {}, ko: 0, shots: 0, wins: 0, seen: '' }, store.get('kp.progress', {}));
  const saveProg = () => store.set('kp.progress', prog);
  Sfx.gate('kp', () => opt.sound);
  const wrap = $('#kpWrap'), cv = $('#kpCanvas'), ctx = cv.getContext('2d');
  const XL = -6.5;   // left camera bound (metres)
  let GF = .86;      // the ground line sits at this fraction of the screen height (lower in landscape)
  let W = 0, H = 0, dpr = 1, R = 100, raf = 0, running = false, lastT = 0, acc = 0, clock = 0, dirty = true;
  let S = null, lv = 0, th = 0, state = 'idle', stT = 0, winAt = 0, bonusI = 0, speed = 1;
  let sAim = 30, sMin = 10, sMax = 60, sFit = 20;
  const cam = { x: 0, s: 30, manual: false, shake: 0, sx: 0, sy: 0 };
  let pull = null, parts = [], pops = [], trail = [], oldTrail = [], qx = [], laugh = 0;
  const perf = { n: 0, sum: 0, max: 0, frames: [] };
  const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  /* sounds: throttled per name and panned by screen position */
  const lastS = {};
  function sfx(n, wx, gap = .06) {
    if (!opt.sound || !S) return;
    const t = performance.now(); if (t - (lastS[n] || 0) < gap * 1000) return; lastS[n] = t;
    const pan = wx == null ? 0 : Math.max(-.7, Math.min(.7, ((wx - cam.x) * cam.s) / (W || 1) * 1.4));
    Sfx.play(n, 0, pan);
  }

  /* ---------- sprites ---------- */
  const SPR = new Map();
  function sprite(key, wM, hM, ox, oy, fn, res = R) {
    let s = SPR.get(key); if (s) return s;
    const c = cnv(wM * res + 4, hM * res + 4), x = c.getContext('2d'); x.translate(2, 2); x.scale(res, res); x.translate(ox, oy); fn(x);
    s = { c, ox: ox + 2 / res, oy: oy + 2 / res, w: c.width / res, h: c.height / res }; SPR.set(key, s); return s;
  }
  function blit(s, X, Y, ang = 0, sx = 1, sy = 1) {
    if (!ang && sx === 1 && sy === 1) { ctx.drawImage(s.c, X - s.ox, Y - s.oy, s.w, s.h); return; }
    ctx.save(); ctx.translate(X, Y); if (ang) ctx.rotate(ang); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy); ctx.drawImage(s.c, -s.ox, -s.oy, s.w, s.h); ctx.restore();
  }
  const critSpr = (t, mood, r = CRIT[t].r) => sprite(`c${t}${mood}${r}`, 3.4 * r, 3.6 * r, 1.7 * r, 2.05 * r, x => { x.scale(r, r); drawCritter(x, t, mood); }, R * 1.6);
  const racSpr = (size, mood) => { const r = RAC[size].r; return sprite(`r${size}${mood}`, 3.0 * r, 2.75 * r, 1.12 * r, 1.55 * r, x => { x.scale(r, r); drawRaccoon(x, size, mood); }, R * 1.4); };
  function blockSpr(o, stage) {
    const m = .06, bw = o.t === 'circ' ? o.r * 2 : o.w, bh = o.t === 'circ' ? o.r * 2 : o.h, extra = o.t === 'prop' ? .45 : 0;
    const oy = o.t === 'tri' ? bh + m : bh / 2 + m + extra;
    return sprite(`b${o.t}${o.m}${bw}${bh}${o.dir || 0}${stage}`, bw + 2 * m, bh + 2 * m + extra, bw / 2 + m, oy, x => drawBlock(x, o, stage));
  }
  const terSpr = o => sprite(`t${th}${o.id}${o.w}${o.h}`, o.w + .2, (o.h || 0) + .6, o.w / 2 + .1, o.t === 'ter' ? o.h / 2 + .3 : o.h + .3, x => drawTerrain(x, o, th));
  let BG = null;
  function backgrounds() {
    const q = Math.min(2, dpr), key = th + ':' + q;
    if (BG && BG.key === key) return BG;
    BG = { key, far: stripFar(th, q), mid: stripMid(th, q), clouds: [0, 1, 2].map(i => cloudSprite(q, 11 + i * 7, th === 2 ? 'rgba(255,214,220,.9)' : 'rgba(255,255,255,.95)')), sky: null, skyH: 0 };
    return BG;
  }
  let GT = null;
  const groundT = () => { const k = th + ':' + R; if (!GT || GT.k !== k) GT = { k, c: groundTile(th, R) }; return GT.c; };

  /* ---------- level flow ---------- */
  function load(n) {
    lv = n; th = LEVELS[n].th; S = KP.Sim(n, onEv);
    state = 'intro'; stT = 0; winAt = 0; bonusI = 0; acc = 0; laugh = 0;
    pull = null; parts = []; pops = []; trail = []; oldTrail = []; qx = [];
    for (const o of S.objs) { const p = o.body.getPosition(); o.px = p.x; o.py = p.y; o.pa = o.body.getAngle(); }
    closeModals(); layout(); prewarm(); cam.manual = false; const [fx, fs] = fitView(); cam.x = fx; cam.s = fs;
    hud(); dirty = true;
    const L = LEVELS[n], fresh = [...new Set(L.c)].filter(t => !prog.seen.includes(t));
    banner(`${n + 1}. ${L.n}`, 1800);
    if (fresh.length && n > 0) setTimeout(() => { if (S && lv === n && current === 'kp') banner(`Nieuw: ${CRIT_NAMES[fresh[0]]}! ${CRIT_INFO[fresh[0]]}`, 3600); }, 1900);
    prog.seen = [...new Set(prog.seen + L.c)].join(''); saveProg();
  }
  // draw every sprite this level can need up front, so nothing is rendered for the first time mid-flight
  function prewarm() {
    if (SPR.size > 500) SPR.clear();
    for (const o of S.objs) {
      if (o.k === 'blk') for (let st = 0; st < 3; st++) blockSpr(o, st);
      else if (o.k === 'prop') blockSpr(o, 0);
      else if (o.k === 'rac') for (const m of ['n', 'blink', 'hurt']) racSpr(o.s, m);
      else if (o.k === 'ter') terSpr(o);
    }
    for (const t of new Set(S.queue)) for (const m of ['n', 'blink', 'fly', 'hit']) critSpr(t, m);
    groundT(); backgrounds();
  }
  function startTurn() { state = 'load'; stT = 0; cam.manual = false; sfx('kpHop', -1.5); }
  function launch() {
    if (!S || state !== 'aim' || !pull) return;
    const t = S.queue[0], [px, py] = S.clampPull(pull.x, pull.y, CRIT[t].r);
    pull = null;
    if (Math.hypot(px, py) < .45) { dirty = true; return; }
    const o = S.launch(px, py); if (!o) return;
    o.px = o.body.getPosition().x; o.py = o.body.getPosition().y; o.pa = 0;
    oldTrail = trail; trail = []; state = 'fly'; stT = 0; cam.manual = false; winAt = 0;
    prog.shots++; saveProg();
    sfx('kpLaunch', REST.x); vibrate(12);
  }
  function endTurn() {
    if (S.rac === 0) { state = 'bonus'; stT = 0; bonusI = 0; return; }
    if (!S.queue.length) { state = 'lose'; stT = 0; laugh = 1; sfx('kpLaugh', S.mid); return; }
    startTurn();
  }
  function finish(win) {
    state = 'done';
    const total = S.score, stars = win ? S.stars(total) : 0, old = prog.best[lv] || 0;
    if (win) {
      prog.stars[lv] = Math.max(prog.stars[lv] || 0, stars); prog.best[lv] = Math.max(old, total); prog.wins++;
      if (lv + 2 > prog.unlocked) prog.unlocked = Math.min(LEVELS.length, lv + 2);
    }
    saveProg(); hud();
    const last = lv + 1 >= LEVELS.length;
    $('#kpEndStars').innerHTML = win ? [0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${.15 + i * .28}s">★</span>`).join('') : `<img class="kp-endico" src="${makeIcons().rac}" alt="">`;
    $('#kpEndTitle').textContent = win ? (last ? 'De picknickmand is terug!' : ['Gelukt!', 'Goed gedaan!', 'Fantastisch!'][stars - 1]) : 'Helaas!';
    $('#kpEndText').innerHTML = win
      ? `Score <b>${fmtN(total)}</b>${total > old && old ? ' · 🎉 nieuw record' : old ? ` · record ${fmtN(Math.max(old, total))}` : ''}` + (last ? '<br>Alle wasberen zijn verslagen en de Bollen kunnen eindelijk picknicken. 🧺' : '')
      : `De wasberen lachen je uit… Er ${S.rac === 1 ? 'is nog 1 wasbeer' : 'zijn nog ' + S.rac + ' wasberen'} over. Probeer het nog eens!`;
    $('#kpEndNext').hidden = !win || last;
    $('#kpEndModal').classList.toggle('lost', !win);
    openModal('kpEndModal');
    if (opt.sound) { Sfx.play(win ? 'kpWin' : 'kpFail'); if (win) for (let i = 0; i < stars; i++) setTimeout(() => sfx('kpStar', null, .01), 650 + i * 280); }
  }

  /* ---------- events from the physics core: sound, particles, score popups ---------- */
  const MATSND = { w: ['kpWood', 'kpWoodBreak', 1.1], g: ['kpGlass', 'kpGlassBreak', .7], s: ['kpStone', 'kpStoneBreak', 1.6], p: ['kpWood', 'kpWood', 1.4] };
  const DEBRIS = { w: ['#d79a5a', '#a8682f', '#f2c48a'], g: ['#bfe9ff', '#ffffff', '#8fd3f5'], s: ['#a7abb3', '#73777f', '#d5d8de'], p: ['#c98a3c', '#e8343c', '#fff'] };
  function contactPoint(c, o) { try { const wm = c.getWorldManifold(null); if (wm && wm.points && wm.points[0]) return [wm.points[0].x, wm.points[0].y]; } catch (e) {} const p = o.body.getPosition(); return [p.x, p.y]; }
  function onEv(type, o, a, b, c) {
    if (type === 'hit') {
      const p = b, wx = o.body.getPosition().x;
      if (o.k === 'rac') { if (p > 1) { sfx('kpRacHit', wx, .12); o.ouch = clock; } }
      else if (p > MATSND[o.m][2]) sfx(MATSND[o.m][0], wx, .07);
      if (p > 2.5) { const [x, y] = contactPoint(c, o); burst(x, y, o.k === 'rac' ? 'fluffR' : o.m, Math.min(6, 1 + p / 4), .6 + Math.min(3, p / 6)); }
      if (p > 14) shake(Math.min(9, p * .3));
    } else if (type === 'break') {
      const p = o.body.getPosition(); sfx(MATSND[o.m][1], p.x, .05);
      const area = o.t === 'circ' ? o.r * o.r * 3 : o.w * o.h * (o.t === 'tri' ? .5 : 1);
      breakup(o, Math.min(14, 5 + area * 10));
      popup(p.x, p.y, '+' + KP.MAT[o.m].pts, o.m === 'g' ? '#bfeaff' : o.m === 's' ? '#e3e6ea' : '#ffd79a');
      if (o.m === 's') shake(4);
    } else if (type === 'ko') {
      const p = o.body.getPosition(), r = o.r;
      sfx('kpRacKo', p.x, .04); vibrate(18); prog.ko++;
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; addP({ k: 'dust', x: p.x + Math.cos(a) * r * .5, y: p.y + Math.sin(a) * r * .5, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 - .4, g: -.6, life: .9, size: r * (.5 + Math.random() * .4), col: '#eef0f4' }); }
      for (let i = 0; i < 5; i++) addP({ k: 'star', x: p.x, y: p.y - r * .4, vx: (Math.random() - .5) * 4, vy: -2 - Math.random() * 2.5, g: 5, life: 1, size: .16, col: '#ffd84a', rot: Math.random() * 3, vr: (Math.random() - .5) * 9 });
      popup(p.x, p.y - r, fmtN(5000), '#ffe066', true); hud();
    } else if (type === 'chit') {
      const p = o.body.getPosition(), v = o.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y);
      o.ouch = clock; if (sp > 4) { sfx('kpThump', p.x, .08); burst(p.x, p.y, 'fluff' + o.type, Math.min(7, 2 + sp / 4), 1 + sp / 8); }
    } else if (type === 'thump') {
      if (b > 3 && o.k === 'crit') { sfx('kpThump', o.body.getPosition().x, .15); }
    } else if (type === 'poof') {
      const p = o.body.getPosition(); sfx('kpPoof', p.x, .05);
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; addP({ k: 'dust', x: p.x, y: p.y, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, g: -.4, life: .6, size: o.r * .7, col: '#ffffff' }); }
      burst(p.x, p.y, 'fluff' + o.type, 5, 1.2);
    } else if (type === 'split') {
      const p = o.body.getPosition(); sfx('kpSplit', p.x); burst(p.x, p.y, 'fluffs', 8, 2);
    } else if (type === 'boost') {
      const p = o.body.getPosition(); sfx('kpBoost', p.x); burst(p.x, p.y, 'flufff', 6, 2);
      for (let i = 0; i < 10; i++) addP({ k: 'spark', x: p.x, y: p.y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, g: 0, life: .4, size: .08, col: '#d8ff9a' });
    } else if (type === 'dive') {
      const p = o.body.getPosition(); sfx('kpDive', p.x); burst(p.x, p.y, 'fluffk', 6, 1.5);
    } else if (type === 'boom') {
      const x = a, y = b; sfx('kpBoom', x); vibrate(50); shake(14);
      addP({ k: 'flash', x, y, vx: 0, vy: 0, g: 0, life: .35, size: 3.4, col: '#fff3c0' });
      addP({ k: 'ring', x, y, vx: 0, vy: 0, g: 0, life: .45, size: 3.4, col: '#ffffff' });
      for (let i = 0; i < 22; i++) { const an = Math.random() * TAU, sp = 2 + Math.random() * 7; addP({ k: 'spark', x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 3, life: .5 + Math.random() * .4, size: .07 + Math.random() * .06, col: Math.random() < .5 ? '#ffd84a' : '#ff7ab8' }); }
      for (let i = 0; i < 12; i++) { const an = Math.random() * TAU, sp = 1 + Math.random() * 2.5; addP({ k: 'fire', x: x + Math.cos(an) * .3, y: y + Math.sin(an) * .3, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - .6, g: -1, drag: 2.5, life: .55 + Math.random() * .3, size: .45 + Math.random() * .4, col: '#ffb040' }); }
      for (let i = 0; i < 14; i++) { const an = Math.random() * TAU, sp = .6 + Math.random() * 1.8; addP({ k: 'dust', x: x + Math.cos(an) * .4, y: y + Math.sin(an) * .4, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - .5, g: -.5, life: 1.1, size: .6 + Math.random() * .5, col: Math.random() < .5 ? '#d8c8c0' : '#b8aaa4' }); }
    }
    dirty = true;
  }
  function shake(a) { cam.shake = Math.min(14, Math.max(cam.shake, a)); }
  function addP(p) { p.max = p.life; parts.push(p); if (parts.length > 260) parts.splice(0, parts.length - 260); }
  function burst(x, y, kind, n, sp) {
    const fl = kind.startsWith('fluff'), col = fl ? (kind === 'fluffR' ? ['#c8ccd3', '#8a8f99', '#fff'] : [CPAL[kind[5]].b, CPAL[kind[5]].a, CPAL[kind[5]].c]) : DEBRIS[kind];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = sp * (.4 + Math.random());
      addP(fl ? { k: 'fluff', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .8, g: 1.2, drag: 2.2, life: .9 + Math.random() * .5, size: .05 + Math.random() * .05, col: col[i % 3], rot: Math.random() * 3, vr: (Math.random() - .5) * 6 }
        : { k: kind === 'g' ? 'shard' : 'chip', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 9, life: .6 + Math.random() * .4, size: .05 + Math.random() * .07, col: col[i % 3], rot: Math.random() * 3, vr: (Math.random() - .5) * 14 });
    }
  }
  function breakup(o, n) {
    const p = o.body.getPosition(), an = o.body.getAngle(), v = o.body.getLinearVelocity(), cs = Math.cos(an), sn = Math.sin(an);
    const bw = o.t === 'circ' ? o.r * 2 : o.w, bh = o.t === 'circ' ? o.r * 2 : o.h, col = DEBRIS[o.m];
    for (let i = 0; i < n; i++) {
      const lx = (Math.random() - .5) * bw, ly = (Math.random() - .5) * bh - (o.t === 'tri' ? bh / 2 : 0);
      const x = p.x + lx * cs - ly * sn, y = p.y + lx * sn + ly * cs, a = Math.random() * TAU, sp = 1 + Math.random() * 3.5;
      addP({ k: o.m === 'g' ? 'shard' : 'chip', x, y, vx: v.x * .3 + Math.cos(a) * sp, vy: v.y * .3 + Math.sin(a) * sp - 1.5, g: 9, life: .8 + Math.random() * .6, size: Math.min(.18, .05 + Math.random() * Math.min(bw, bh) * .45), long: o.m === 'w' ? 2.6 : 1, col: col[i % 3], rot: an + (Math.random() - .5), vr: (Math.random() - .5) * 12 });
    }
    for (let i = 0; i < 4; i++) addP({ k: 'dust', x: p.x + (Math.random() - .5) * bw * .6, y: p.y + (Math.random() - .5) * bh * .6, vx: (Math.random() - .5) * .8, vy: -.3, g: -.3, life: .8, size: .35 + Math.min(bw, bh) * .3, col: o.m === 'g' ? 'rgba(220,245,255,1)' : o.m === 's' ? '#c6c9cf' : '#e2c49a' });
  }
  function popup(x, y, txt, col, big) { const near = pops.filter(q => q.t < .5 && Math.abs(q.x - x) < 1.6 && Math.abs(q.y - y) < 1.2).length; pops.push({ x, y: y - near * .7, txt, col, big, t: 0 }); if (pops.length > 30) pops.shift(); }

  /* ---------- camera ---------- */
  const XR = () => S.right + 6;
  function clampX(x, s) {
    const half = W / (2 * s), l = XL, r = XR();
    if (r - l <= 2 * half) return (l + r) / 2;
    return Math.max(l + half, Math.min(r - half, x));
  }
  // whole level when it fits reasonably, otherwise the structure at aiming zoom (narrow portrait screens)
  function fitView() { return sFit >= sAim * .62 ? [clampX((XL + XR()) / 2, sFit), sFit] : [clampX(S.mid, sAim), sAim]; }
  function aimView() { return [clampX(REST.x - .6 + W / (2 * sAim) * .45, sAim), sAim]; }   // slingshot at about a quarter of the width
  function camTarget() {
    if (cam.manual && state !== 'intro') return null;
    if (state === 'intro') return stT < 1.5 ? fitView() : aimView();
    if (state === 'aim' || state === 'load') return aimView();
    if (state === 'fly') {
      const live = S.crits.filter(o => !o.dead);
      if (live.length) {
        const o = S.active && !S.active.dead ? S.active : live[live.length - 1], p = o.body.getPosition(), v = o.body.getLinearVelocity();
        let s = Math.min(sAim, H * GF * .95 / Math.max(1, 2.2 - p.y));
        s = Math.max(sMin, s);
        return [clampX(p.x + Math.max(-2, Math.min(4, v.x * .18)), s), s];
      }
      return [clampX(Math.max(cam.x, S.mid - 2), cam.s), cam.s];
    }
    return fitView();
  }
  function updateCam(dt) {
    const t = camTarget();
    if (t) { const k = 1 - Math.exp(-dt * (state === 'fly' ? 4.5 : 2.6)); cam.x += (t[0] - cam.x) * k; cam.s = Math.exp(Math.log(cam.s) + (Math.log(t[1]) - Math.log(cam.s)) * k); }
    cam.s = Math.max(sMin, Math.min(sMax, cam.s)); cam.x = clampX(cam.x, cam.s);
    if (cam.shake > .05) { cam.shake *= Math.exp(-dt * 7); cam.sx = (Math.random() - .5) * cam.shake; cam.sy = (Math.random() - .5) * cam.shake; } else cam.shake = cam.sx = cam.sy = 0;
  }
  const camY = () => H * (.5 - GF) / cam.s;
  const toScreen = (x, y) => [(x - cam.x) * cam.s + W / 2, (y - camY()) * cam.s + H / 2];
  const toWorld = (sx, sy) => [(sx - W / 2) / cam.s + cam.x, (sy - H / 2) / cam.s + camY()];

  /* ---------- update ---------- */
  function update(dt) {
    clock += dt; stT += dt;
    acc += dt * speed; let k = 0;
    while (acc >= DT && k < 4 * speed) {
      for (const o of S.objs) if (!o.dead && o.k !== 'ter') { const p = o.body.getPosition(); o.px = p.x; o.py = p.y; o.pa = o.body.getAngle(); }
      S.step(); acc -= DT; k++;
      if (state === 'fly') {
        const o = S.active;
        if (o && !o.dead && S.n % 3 === 0 && (!o.hit || S.n - o.hitN < 12)) { const p = o.body.getPosition(); trail.push([p.x, p.y, o.boost || o.dive ? 1 : 0]); }
        if (S.rac === 0 && !winAt) winAt = clock;
        if (S.turnTick() || (winAt && clock - winAt > 3.2)) endTurn();
      }
    }
    if (acc > DT * 2) acc = 0;
    if (state === 'intro' && stT > 3) startTurn();
    else if (state === 'load' && stT > .5) { state = 'aim'; stT = 0; }
    else if (state === 'bonus') {
      if (stT > .5) {
        if (bonusI < S.queue.length) {
          const i = bonusI++, x = qx[i] != null ? qx[i] : -1.9 - i * .95, r = CRIT[S.queue[i]].r;
          S.score += 10000; popup(x, -r * 2.4, fmtN(10000), '#ffe066', true); sfx('kpBonus', x);
          burst(x, -r, 'fluff' + S.queue[i], 8, 2); stT = 0; hud();
        } else if (stT > .9) finish(true);
      }
    } else if (state === 'lose' && stT > 2) finish(false);
    if (state === 'bonus' || (state === 'done' && S.rac === 0)) {
      if (Math.random() < dt * 14) addP({ k: 'confetti', x: cam.x + (Math.random() - .5) * W / cam.s, y: camY() - H / (2 * cam.s) - .3, vx: (Math.random() - .5) * 1.5, vy: 1 + Math.random(), g: .8, drag: .6, life: 4, size: .09, col: ['#ff5a7a', '#ffd23a', '#5ad1ff', '#7be05a', '#c48aff'][Math.floor(Math.random() * 5)], rot: Math.random() * 3, vr: (Math.random() - .5) * 10 });
    }
    for (const p of parts) {
      p.life -= dt; p.vy += p.g * dt; if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
      if ((p.k === 'chip' || p.k === 'shard') && p.y > -p.size * .5 && p.vy > 0) { p.y = -p.size * .5; p.vy *= -.25; p.vx *= .5; p.vr *= .5; }
    }
    parts = parts.filter(p => p.life > 0);
    for (const q of pops) q.t += dt; pops = pops.filter(q => q.t < 1.3);
    // waiting critters line up on the blanket, spaced by their size
    const skip = state === 'aim' || state === 'load' ? 1 : 0; let cx = -1.25, pr = 0;
    for (let i = 0; i < S.queue.length; i++) {
      const r = CRIT[S.queue[i]].r; let tx;
      if (i < skip) tx = -1.25 - r; else { cx -= pr + r + .1; pr = r; tx = cx; }
      qx[i] = qx[i] == null ? tx : qx[i] + (tx - qx[i]) * Math.min(1, dt * 6);
    }
    updateCam(dt);
    hudScore();
  }

  /* ---------- drawing ---------- */
  function draw() {
    const B = backgrounds(), T = THEMES[th];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!B.sky || B.skyH !== H) { B.sky = LG(ctx, 0, 0, 0, H, [[0, T.sky[0]], [.55, T.sky[1]], [1, T.sky[2]]]); B.skyH = H; }
    ctx.fillStyle = B.sky; ctx.fillRect(0, 0, W, H);
    const gy = (0 - camY()) * cam.s + H / 2;   // screen y of the ground line
    // sun / evening sun
    const sx = W * .8 - cam.x * cam.s * .02, sy = th === 2 ? gy - Math.min(H * .25, 140) : Math.max(60, gy - H * .75);
    const sr = th === 2 ? 46 : 30;
    ctx.fillStyle = RG(ctx, sx, sy, sr * .3, sx, sy, sr * 3, [[0, 'rgba(255,250,220,.55)'], [1, 'rgba(255,250,220,0)']]); ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
    ell(ctx, sx, sy, sr, sr); ctx.fillStyle = T.sun; ctx.fill();
    if (th === 2) { ctx.fillStyle = 'rgba(255,255,255,.8)'; const rn = seeded(3); for (let i = 0; i < 30; i++) { const x = rn() * W, y = rn() * (gy * .5); if (y < gy - 200) { ell(ctx, x, y, 1 + rn(), 1 + rn()); ctx.globalAlpha = .4 + .4 * Math.sin(clock * 2 + i); ctx.fill(); } } ctx.globalAlpha = 1; }
    // clouds
    for (let i = 0; i < 5; i++) {
      const c = B.clouds[i % 3], q = .5 + (i % 3) * .2, cw = c.width / Math.min(2, dpr) * q, ch = c.height / Math.min(2, dpr) * q, span = W + cw * 2;
      let x = ((i * 397 + clock * (4 + i * 2) - cam.x * cam.s * (.04 + i * .01)) % span + span) % span - cw;
      const y = Math.max(20, gy - H * .55) - 80 + (i * 61) % 170 - (gy - H) * .1;
      ctx.globalAlpha = th === 2 ? .7 : .92; ctx.drawImage(c, x, y, cw, ch);
    }
    ctx.globalAlpha = 1;
    // parallax strips
    const kk = Math.max(.5, Math.min(1.5, Math.pow(cam.s / sAim, .35) * Math.max(.7, Math.min(1.3, sAim / 36))));
    for (const [img, p, h0, lift] of [[B.far, .1, 320, 26], [B.mid, .32, 240, 6]]) {
      const w = STRIP_W * kk, h = h0 * kk, off = ((-(cam.x * cam.s * p)) % w + w) % w - w;
      for (let x = off; x < W; x += w) ctx.drawImage(img, x, gy - h + lift * kk, w + 1, h);
    }
    // world
    const s = cam.s, cy = camY();
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - cam.x * s + cam.sx), dpr * (H / 2 - cy * s + cam.sy));
    const x0 = cam.x - W / (2 * s) - 1, x1 = cam.x + W / (2 * s) + 1, yb = cy + H / (2 * s) + 1;
    const gt = groundT();
    for (let gx = Math.floor(x0 / 4) * 4; gx < x1; gx += 4) ctx.drawImage(gt, gx, 0, 4.01, 8);
    if (yb > 8) { ctx.fillStyle = T.e2; ctx.fillRect(x0, 7.99, x1 - x0, yb - 8); }
    ctx.save(); ctx.translate(-3.6, -.02); drawBlanket(ctx); ctx.restore();
    const a = Math.min(1, acc / DT);
    const pose = o => { if (o.k === 'ter') return [o.body.getPosition().x, o.body.getPosition().y, 0]; const p = o.body.getPosition(), an = o.body.getAngle(); if (o.px == null) return [p.x, p.y, an]; return [o.px + (p.x - o.px) * a, o.py + (p.y - o.py) * a, o.pa + (an - o.pa) * a]; };
    for (const o of S.objs) if (o.k === 'ter' && !o.dead) { const [x, y] = pose(o); if (x + o.w / 2 > x0 && x - o.w / 2 < x1) blit(terSpr(o), x, y); }
    // slingshot (back) and the critter on it
    const onSling = (state === 'aim' || state === 'load') && S.queue.length ? S.queue[0] : null;
    ctx.save(); ctx.translate(REST.x, 0); drawSlingBack(ctx); ctx.restore();
    let cp = null;
    if (onSling) {
      const r = CRIT[onSling].r;
      if (state === 'load') { const k2 = Math.min(1, stT / .5), sx0 = qx[0] != null ? qx[0] : -1.7; cp = [sx0 + (REST.x - sx0) * k2, (-r) + (REST.y - (-r)) * k2 - Math.sin(k2 * Math.PI) * 1.4]; }
      else { const pp = pull ? S.clampPull(pull.x, pull.y, r) : [0, 0]; cp = [REST.x + pp[0], REST.y + pp[1]]; }
      if (state === 'aim') band(TIPB, cp, r, true);
    }
    // blocks, props, raccoons
    for (const o of S.objs) {
      if (o.dead || o.k === 'ter' || o.k === 'crit') continue;
      const [x, y, an] = pose(o); if (x < x0 - 2 || x > x1 + 2) continue;
      if (o.k === 'rac') {
        const hurt = o.hp < o.max * .5 || clock - (o.ouch || -9) < .6, blink = !hurt && ((clock + o.id * 1.7) % 4.3) < .14;
        const sq = 1 + Math.sin(clock * 3 + o.id) * .025 + (laugh ? Math.abs(Math.sin(clock * 14 + o.id)) * .07 : 0);
        blit(racSpr(o.s, hurt ? 'hurt' : blink ? 'blink' : 'n'), x, y, an, 1 / Math.sqrt(sq), sq);
      } else {
        const stage = o.k === 'prop' ? 0 : o.hp < o.max * .34 ? 2 : o.hp < o.max * .7 ? 1 : 0;
        blit(blockSpr(o, stage), x, y, an);
      }
    }
    // waiting critters
    for (let i = 0; i < S.queue.length; i++) {
      if (i === 0 && onSling) continue; if (state === 'bonus' || state === 'done') { if (i < bonusI) continue; }
      const t = S.queue[i], r = CRIT[t].r, hop = state === 'bonus' || (state === 'done' && S.rac === 0) ? Math.abs(Math.sin(clock * 7 + i)) * .5 : Math.max(0, Math.sin(clock * 2.2 + i * 1.9)) ** 12 * .35;
      blit(critSpr(t, ((clock + i * 1.3) % 3.7) < .13 ? 'blink' : 'n'), qx[i] == null ? -1.9 - i * .95 : qx[i], -r - hop, 0);
    }
    // flying critters
    for (const o of S.crits) {
      if (o.dead) continue;
      const [x, y, an] = pose(o), v = o.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y);
      if (o.boost && S.n - o.boost < 40 || o.dive && !o.hit) { ctx.strokeStyle = o.dive ? 'rgba(200,190,255,.5)' : 'rgba(220,255,170,.6)'; ctx.lineWidth = o.r * .5; ctx.lineCap = 'round'; for (const k of [-.5, 0, .5]) { ctx.beginPath(); ctx.moveTo(x - v.x / sp * o.r * 1.2 + k * o.r * v.y / sp, y - v.y / sp * o.r * 1.2 - k * o.r * v.x / sp); ctx.lineTo(x - v.x / sp * o.r * 3.5 + k * o.r * v.y / sp, y - v.y / sp * o.r * 3.5 - k * o.r * v.x / sp); ctx.stroke(); } }
      const mood = clock - (o.ouch || -9) < .45 ? 'hit' : !o.hit ? 'fly' : ((clock * 1.3 + o.id) % 3) < .12 ? 'blink' : 'n';
      const st = !o.hit && sp > 3 ? 1 + Math.min(.12, sp * .004) : 1;
      if (!o.hit && sp > 3) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(v.y, v.x)); ctx.scale(st, 1 / st); ctx.rotate(-Math.atan2(v.y, v.x)); blit(critSpr(o.type, mood, o.r), 0, 0, 0); ctx.restore(); }
      else blit(critSpr(o.type, mood, o.r), x, y, an);
      if (o.type === 'n' && !o.boomed) fuse(x, y, an, o.r, o.hit ? Math.max(0, 1 - (S.n - o.hitN) / 105) : 1);
      if (o === S.active && S.canAbility() && o.type !== 'b') { const pr = o.r * (1.5 + .25 * Math.sin(clock * 10)); ell(ctx, x, y, pr, pr); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = .06; ctx.setLineDash([.18, .14]); ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.save(); ctx.translate(REST.x, 0); drawSlingFront(ctx); ctx.restore();
    if (onSling && cp) {
      const t = onSling, r = CRIT[t].r, pl = pull ? Math.hypot(...S.clampPull(pull.x, pull.y, r)) : 0;
      blit(critSpr(t, pl > 1.2 ? 'fly' : ((clock % 3.1) < .12 ? 'blink' : 'n')), cp[0], cp[1], 0);
      if (t === 'n') fuse(cp[0], cp[1], 0, r, 1);
    }
    if (onSling && state === 'aim') band(TIPF, cp, CRIT[onSling].r, false);
    else { ctx.strokeStyle = '#5a2418'; ctx.lineWidth = .1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(TIPB.x, TIPB.y); ctx.quadraticCurveTo(0, REST.y + .12, TIPF.x, TIPF.y); ctx.stroke(); }
    // trails and aiming guide
    for (const [tr, al] of [[oldTrail, .35], [trail, .85]]) for (let i = 0; i < tr.length; i++) { const [x, y] = tr[i]; ell(ctx, x, y, i % 3 ? .055 : .085, i % 3 ? .055 : .085); ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.fill(); }
    if (state === 'aim' && pull && opt.guide) {
      const r = CRIT[onSling].r, [px, py] = S.clampPull(pull.x, pull.y, r), [vx, vy] = S.velFor(px, py), l = Math.hypot(px, py);
      if (l > .45) for (let i = 1; i <= 13; i++) {
        const t = i * .065, x = REST.x + px + vx * t, y = REST.y + py + vy * t + 5 * t * t, f = 1 - i / 15;
        ell(ctx, x, y, .1 * f + .03, .1 * f + .03); ctx.fillStyle = `rgba(255,255,255,${.95 * f})`; ctx.fill(); ctx.strokeStyle = `rgba(60,40,20,${.35 * f})`; ctx.lineWidth = .025; ctx.stroke();
      }
    }
    drawParts();
    // screen space overlays
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const q of pops) {
      const [x, y] = toScreen(q.x, q.y - q.t * 1.2), k = q.t < .15 ? q.t / .15 : 1, al = q.t > .9 ? 1 - (q.t - .9) / .4 : 1;
      ctx.globalAlpha = Math.max(0, al); ctx.font = `800 ${(q.big ? 26 : 17) * (.6 + .4 * k)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,20,10,.75)'; ctx.strokeText(q.txt, x, y); ctx.fillStyle = q.col; ctx.fillText(q.txt, x, y);
    }
    ctx.globalAlpha = 1;
    // remaining critters, top left
    if (state !== 'intro' && S.queue.length > ((state === 'bonus' || state === 'done') ? bonusI : 0)) {
      let x = 12; const y = 14;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; rrect(ctx, 6, 6, 10 + Math.max(1, S.queue.length) * 30, 36, 18); ctx.fill();
      S.queue.forEach((t, i) => { if ((state === 'bonus' || state === 'done') && i < bonusI) return; const sp = critSpr(t, 'n'), k = 22 / (2 * CRIT[t].r * 1.15) * (i === 0 && (state === 'aim' || state === 'load') ? 1.15 : .95); ctx.drawImage(sp.c, x + 12 - sp.ox * k, y + 12 - sp.oy * k + 2, sp.w * k, sp.h * k); x += 30; });
      if (!S.queue.length) { ctx.font = '600 13px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('—', 20, 26); }
    }
    // first-time help: drag back from the slingshot
    if (state === 'aim' && !pull && prog.shots < 2 && lv === 0) {
      const [ax, ay] = toScreen(REST.x, REST.y), k2 = (clock % 2.2) / 2.2, e = k2 < .7 ? k2 / .7 : 1, hx = ax - 70 * e, hy = ay + 34 * e;
      ctx.globalAlpha = k2 < .85 ? 1 : 1 - (k2 - .85) / .15;
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
      ell(ctx, hx, hy, 15, 15); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.font = '700 14px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3; ctx.strokeText('Trek naar achteren en laat los', ax, ay - 64); ctx.fillText('Trek naar achteren en laat los', ax, ay - 64);
      ctx.globalAlpha = 1;
    }
    if (state === 'fly' && S.canAbility() && S.active.type !== 'b' && prog.shots < 40) {
      const [x, y] = toScreen(...pose(S.active)); ctx.font = '800 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.fillStyle = '#fff';
      const ty = Math.max(20, y - S.active.r * cam.s - 26); ctx.strokeText('Tik!', x, ty); ctx.fillText('Tik!', x, ty);
    }
  }
  function band(tip, cp, r, back) {
    ctx.lineCap = 'round';
    const ang = Math.atan2(cp[1] - REST.y, cp[0] - REST.x), l = Math.hypot(cp[0] - REST.x, cp[1] - REST.y);
    const ex = l > .05 ? cp[0] + Math.cos(ang) * r * .75 : cp[0] + (back ? -r * .7 : r * .7), ey = l > .05 ? cp[1] + Math.sin(ang) * r * .75 : cp[1];
    ctx.strokeStyle = '#3a160e'; ctx.lineWidth = back ? .16 : .18; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = back ? '#6a2a1a' : '#8a3622'; ctx.lineWidth = back ? .09 : .11; ctx.stroke();
    if (back) { ell(ctx, ex, ey, r * .42, r * .62, ang); ctx.fillStyle = '#5a3418'; ctx.fill(); }
  }
  function fuse(x, y, an, r, k) {
    const fx = x + (Math.cos(an) * .38 - Math.sin(an) * -1.42) * r, fy = y + (Math.sin(an) * .38 + Math.cos(an) * -1.42) * r;
    const f = .1 + .05 * Math.sin(clock * 40) + (1 - k) * .08;
    ctx.globalCompositeOperation = 'lighter';
    ell(ctx, fx, fy, f * 2.2, f * 2.2); ctx.fillStyle = 'rgba(255,170,60,.35)'; ctx.fill();
    star(ctx, fx, fy, f * 1.6, f * .5, 6, clock * 9); ctx.fillStyle = '#fff3a0'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < .3) addP({ k: 'spark', x: fx, y: fy, vx: (Math.random() - .5) * 1.5, vy: -Math.random() * 1.5, g: 3, life: .3, size: .04, col: '#ffd84a' });
  }
  function drawParts() {
    for (const p of parts) {
      const al = Math.min(1, p.life / p.max * 2.2);
      if (p.k === 'dust') { const k = 1 - p.life / p.max; ctx.globalAlpha = .55 * (1 - k); ell(ctx, p.x, p.y, p.size * (.6 + k * .8), p.size * (.6 + k * .8)); ctx.fillStyle = p.col; ctx.fill(); continue; }
      if (p.k === 'flash') { const k = 1 - p.life / p.max; ctx.globalAlpha = 1 - k; ctx.fillStyle = RG(ctx, p.x, p.y, 0, p.x, p.y, p.size * (.6 + k), [[0, 'rgba(255,255,230,1)'], [.4, 'rgba(255,200,90,.7)'], [1, 'rgba(255,120,60,0)']]); ell(ctx, p.x, p.y, p.size * (.6 + k), p.size * (.6 + k)); ctx.fill(); continue; }
      if (p.k === 'fire') { const k = 1 - p.life / p.max, r = p.size * (.5 + k * .9); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - k) * .8; ctx.fillStyle = RG(ctx, p.x, p.y, 0, p.x, p.y, r, [[0, 'rgba(255,250,200,1)'], [.45, 'rgba(255,170,60,.85)'], [1, 'rgba(255,80,40,0)']]); ell(ctx, p.x, p.y, r, r); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; continue; }
      if (p.k === 'ring') { const k = 1 - p.life / p.max; ctx.globalAlpha = 1 - k; ell(ctx, p.x, p.y, p.size * k, p.size * k); ctx.strokeStyle = p.col; ctx.lineWidth = .12 * (1 - k) + .02; ctx.stroke(); continue; }
      ctx.globalAlpha = al; ctx.fillStyle = p.col;
      if (p.k === 'spark') { ctx.globalCompositeOperation = 'lighter'; ell(ctx, p.x, p.y, p.size, p.size); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
      if (p.k === 'chip' || p.k === 'confetti') ctx.fillRect(-p.size * (p.long || 1) / 2, -p.size / 2, p.size * (p.long || 1), p.size * (p.k === 'confetti' ? .55 : 1));
      else if (p.k === 'shard') { ctx.beginPath(); ctx.moveTo(-p.size, p.size * .6); ctx.lineTo(p.size * .2, -p.size); ctx.lineTo(p.size, p.size * .7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = .015; ctx.stroke(); }
      else if (p.k === 'fluff') { ell(ctx, 0, 0, p.size * 1.6, p.size * .8); ctx.fill(); }
      else if (p.k === 'star') { star(ctx, 0, 0, p.size, p.size * .45); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- layout & loop ---------- */
  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = wrap.clientWidth; H = wrap.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    $('#kp').classList.toggle('land', W > H);
    GF = W > H ? .86 : .77;
    sAim = W > H ? Math.max(14, Math.min(W / 15, H / 10.5)) : Math.max(14, Math.min(W / 12.5, H / 13));
    const span = S ? XR() - XL : 40, tall = S ? (-S.top + 2.5) / GF : 10;
    sFit = Math.max(8, Math.min(sAim, W / span, H / tall));
    sMin = Math.max(7, Math.min(sFit, W / span)); sMax = sAim * 2.2;
    const nr = Math.max(40, Math.min(220, Math.round(sAim * dpr * 1.25 / 10) * 10));
    if (nr !== R) { R = nr; SPR.clear(); }
    BG = BG && BG.key === th + ':' + Math.min(2, dpr) ? BG : null;
    cam.s = Math.max(sMin, Math.min(sMax, cam.s)); dirty = true;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (!S) return;
    const live = current === 'kp' && !anyModal() && !document.hidden;
    const t0 = performance.now();
    if (live) update(dt);
    if (live || dirty) { draw(); dirty = false; }
    if (live) { const ms = performance.now() - t0; perf.n++; perf.sum += ms; perf.max = Math.max(perf.max, ms); perf.frames.push(dt * 1000); if (perf.frames.length > 240) perf.frames.shift(); }
  }

  /* ---------- input: aim, look around (drag / pinch / wheel), tap for abilities ---------- */
  const ptrs = new Map(); let gest = null;
  const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function nearPouch(x, y) {
    if (!S || state !== 'aim') return false;
    const [px, py] = toScreen(REST.x, REST.y), r = Math.max(52, 1.4 * cam.s);
    return Math.hypot(x - px, y - py) < r;
  }
  cv.addEventListener('pointerdown', e => {
    if (!S || current !== 'kp' || anyModal()) return;
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const [x, y] = local(e); ptrs.set(e.pointerId, [x, y]);
    if (ptrs.size === 2) {
      if (gest && gest.t === 'aim') pull = null;
      const [a, b] = [...ptrs.values()], mx = (a[0] + b[0]) / 2;
      gest = { t: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s0: cam.s, wx: toWorld(mx, 0)[0] }; cam.manual = true; return;
    }
    if (ptrs.size > 2) return;
    if (state === 'intro') { stT = Math.max(stT, 3); }
    if (state === 'aim' && nearPouch(x, y)) { gest = { t: 'aim', id: e.pointerId }; const [wx, wy] = toWorld(x, y); pull = { x: wx - REST.x, y: wy - REST.y, l: 0 }; sfx('kpStretch', 0, .2); return; }
    if (state === 'fly' && S.canAbility() && S.active.type !== 'b') { S.ability(); gest = { t: 'none' }; return; }
    gest = { t: 'pan', id: e.pointerId, x0: x, cx0: cam.x, moved: false };
  });
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !S) return;
    const [x, y] = local(e); ptrs.set(e.pointerId, [x, y]);
    if (!gest) return;
    if (gest.t === 'aim' && gest.id === e.pointerId && state === 'aim') {
      const [wx, wy] = toWorld(x, y), r = CRIT[S.queue[0]].r, [px, py] = S.clampPull(wx - REST.x, wy - REST.y, r), l = Math.hypot(px, py);
      if (Math.floor(l * 2) > Math.floor((pull ? pull.l : 0) * 2) && l > .6) sfx('kpStretch', 0, .25);
      pull = { x: wx - REST.x, y: wy - REST.y, l }; dirty = true;
    } else if (gest.t === 'pan' && gest.id === e.pointerId) {
      if (Math.abs(x - gest.x0) > 6) gest.moved = true;
      if (gest.moved) { cam.manual = true; cam.x = clampX(gest.cx0 - (x - gest.x0) / cam.s, cam.s); dirty = true; }
    } else if (gest.t === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2;
      cam.s = Math.max(sMin, Math.min(sMax, gest.s0 * d / gest.d0)); cam.x = clampX(gest.wx - (mx - W / 2) / cam.s, cam.s); dirty = true;
    }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (gest && gest.t === 'aim' && gest.id === e.pointerId) { gest = null; launch(); return; }
    if (gest && gest.t === 'pinch') { if (!ptrs.size) gest = null; else { const [id, p] = [...ptrs.entries()][0]; gest = { t: 'pan', id, x0: p[0], cx0: cam.x, moved: true }; } return; }
    if (!ptrs.size) gest = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { if (gest && gest.t === 'aim') { pull = null; gest = null; } up(e); });
  cv.addEventListener('wheel', e => { if (!S) return; e.preventDefault(); const [x] = local(e), wx = toWorld(x, 0)[0]; cam.manual = true; cam.s = Math.max(sMin, Math.min(sMax, cam.s * Math.exp(-e.deltaY * .0015))); cam.x = clampX(wx - (x - W / 2) / cam.s, cam.s); dirty = true; }, { passive: false });
  window.addEventListener('keydown', e => { if (current !== 'kp' || anyModal() || !S) return; if (e.key === ' ' && state === 'fly') { S.ability(); e.preventDefault(); } });
  window.addEventListener('resize', () => { if (current === 'kp') layout(); });

  /* ---------- HUD & dialogs ---------- */
  let shownScore = -1;
  let shownRac = -1;
  function hudScore() { if (S && S.score !== shownScore) { shownScore = S.score; $('#kpScore').textContent = fmtN(S.score); } if (S && S.rac !== shownRac) { shownRac = S.rac; $('#kpRac').textContent = S.rac; } }
  function hud() {
    if (!S) return;
    $('#kpLvl').textContent = lv + 1; $('#kpRac').textContent = S.rac;
    $('#kpBest').textContent = prog.best[lv] ? 'Record ' + fmtN(prog.best[lv]) : LEVELS[lv].n;
    shownScore = shownRac = -1; hudScore();
  }
  let banT = 0;
  function banner(t, ms) { const e = $('#kpBanner'); e.textContent = t; e.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => e.classList.remove('show'), ms || 1500); }
  let icons = null;
  function iconURL(fn, w, h) { const c = cnv(w * 2, h * 2), x = c.getContext('2d'); x.scale(2, 2); fn(x); return c.toDataURL(); }
  function makeIcons() {
    if (icons) return icons;
    icons = {};
    for (const t of 'bsfkn') icons[t] = iconURL(x => { x.translate(28, 34); x.scale(18, 18); drawCritter(x, t, 'n'); }, 56, 60);
    icons.rac = iconURL(x => { x.translate(26, 34); x.scale(17, 17); drawRaccoon(x, 1, 'n'); }, 56, 56);
    $('#kpRacIco').src = icons.rac;
    return icons;
  }
  function renderStart() {
    const I = makeIcons(), totalStars = Object.values(prog.stars).reduce((a, b) => a + b, 0);
    $('#kpCrits').innerHTML = 'bsfkn'.split('').map(t => `<div class="${prog.seen.includes(t) ? '' : 'unseen'}"><img src="${I[t]}" alt=""><b>${CRIT_NAMES[t]}</b><small>${prog.seen.includes(t) ? CRIT_INFO[t] : 'Nog niet ontmoet'}</small></div>`).join('');
    let html = '';
    LEVELS.forEach((L, i) => {
      if (i === 0 || LEVELS[i - 1].th !== L.th) html += `<div class="kp-th">${['🌳', '⚓', '🏰'][L.th]} ${THEMES[L.th].n}</div>`;
      const lock = i + 1 > prog.unlocked, st = prog.stars[i] || 0, next = !lock && !st;
      html += `<button data-n="${i}" class="t${L.th}${lock ? ' lock' : ''}${next ? ' next' : ''}" ${lock ? 'disabled' : ''}><b>${lock ? '🔒' : i + 1}</b><span>${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}</span></button>`;
    });
    $('#kpLevels').innerHTML = html;
    $('#kpStarSum').textContent = `${totalStars} / ${LEVELS.length * 3} ★`;
    $('#kpOptList').innerHTML = [['guide', 'Mikhulp (stippellijn)', [[true, 'Aan'], [false, 'Uit']]], ['sound', 'Geluid en muziek', [[true, 'Aan'], [false, 'Uit']]]].map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#kpResume').hidden = !(S && ['aim', 'load', 'fly', 'intro'].includes(state));
  }
  $('#kpLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b && !b.disabled) load(+b.dataset.n); });
  $('#kpOptList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); Sfx.refresh(); renderStart(); });
  $('#kpStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#kpResume').addEventListener('click', () => closeModals());
  $('#kpEndNext').addEventListener('click', () => load(Math.min(LEVELS.length - 1, lv + 1)));
  $('#kpEndRetry').addEventListener('click', () => load(lv));
  $('#kpEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('kpStartModal'); });
  $('#kpBack').addEventListener('click', () => leave());
  $('#kpMenu').addEventListener('click', () => { renderStart(); openModal('kpStartModal'); });
  $('#kpRetry').addEventListener('click', () => { if (S && state !== 'done') load(lv); });

  function enter() {
    show('kp'); layout();
    if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
    if (!S) load(Math.min(prog.unlocked, LEVELS.length) - 1);
    renderStart(); openModal('kpStartModal'); dirty = true;
  }
  function leave() { running = false; cancelAnimationFrame(raf); ptrs.clear(); gest = null; pull = null; closeModals(); show('menu'); refreshMenu(); }

  /* ---------- test hooks ---------- */
  window.__kp = {
    get S() { return S; }, get state() { return state; }, get cam() { return cam; }, get lv() { return lv; }, get prog() { return prog; }, get parts() { return parts.length; }, get perf() { return perf; },
    LEVELS, KP, opt, load, toScreen, toWorld, pouch: () => toScreen(REST.x, REST.y), get sAim() { return sAim; },
    set speed(v) { speed = v; }, skip() { if (state === 'intro') stT = 3; },
    // aim like a player would for a given angle (degrees) and power (0..1): screen point to drag the pouch to
    aimPoint(a, p) { const [px, py] = KP.pullFor(a, p); return toScreen(REST.x + px, REST.y + py); },
    shoot(a, p) { if (state !== 'aim') return false; const [px, py] = KP.pullFor(a, p); pull = { x: px, y: py, l: Math.hypot(px, py) }; launch(); return true; },
    ability: () => S && S.ability(), unlockAll() { prog.unlocked = LEVELS.length; saveProg(); }, solve: KP.solve, stability(n, steps = 600) {
      const T = KP.Sim(n), p0 = T.objs.map(o => { const p = o.body.getPosition(); return [p.x, p.y, o.body.getAngle(), o.hp]; });
      for (let i = 0; i < steps; i++) T.step();   // first as delivered (asleep), then woken up
      T.objs.forEach(o => o.k !== 'ter' && o.body.setAwake(true));
      for (let i = 0; i < steps; i++) T.step();
      let mv = 0, dmg = 0; T.objs.forEach((o, i) => { if (o.k === 'ter') return; if (o.dead) { dmg += 99; return; } const p = o.body.getPosition(); mv = Math.max(mv, Math.hypot(p.x - p0[i][0], p.y - p0[i][1])); dmg += p0[i][3] - o.hp; });
      return { moved: mv, dmg, rac: T.rac, racs: T.racs, awake: T.objs.filter(o => !o.dead && o.k !== 'ter' && o.body.isAwake()).length };
    }
  };
  return { enter, leave, hasSave: () => false };
