  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('nl-NL');
  /* ================= settings, progress ================= */
  const LV = LEVELS, NL = LV.length;
  const WORLDS = [['Oceaan', '🌊'], ['Bos', '🌲'], ['Snoepland', '🍭'], ['Woestijn', '🏜️'], ['IJsland', '❄️'], ['Ruimte', '🪐']];
  const opt = Object.assign({ sound: true, aim: true, cb: false, shake: true }, store.get('bs.settings', {}));
  const saveOpt = () => store.set('bs.settings', opt);
  Sfx.gate('bs', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  let stats = Object.assign({ played: 0, won: 0, lost: 0, stars: {}, best: {}, coins: 50, inv: null, endBest: 0, endGames: 0, three: 0, bigDrop: 0, pops: 0, boosts: 0 }, store.get('bs.stats', {}));
  stats.inv = Object.assign({ bomb: 2, rain: 2, aim: 1, plus: 2 }, stats.inv || {});
  const saveStats = () => store.set('bs.stats', stats);
  const BOOST = { bomb: { n: 'Bom', p: 40, i: '💣' }, rain: { n: 'Regenboog', p: 40, i: '🌈' }, aim: { n: 'Lang mikken', p: 30, i: '🎯' }, plus: { n: '+5 schoten', p: 50, i: '➕' } };
  const unlocked = () => { let n = 1; while (n < NL && stats.stars[n]) n++; return n; };
  const totalStars = () => Object.values(stats.stars).reduce((a, b) => a + b, 0);
  const levelOf = id => LV[id - 1];
  const TIPS = {
    aim: 'Sleep je vinger over het speelveld om te mikken en laat los om te schieten. Drie of meer bellen van dezelfde kleur knallen!',
    swap: 'Tik op de bellenblazer of op de bel in het schelpje om je huidige en je volgende bel te wisselen.',
    bounce: 'Mik schuin tegen de zijkant: de bel stuitert terug. Zo kom je ook op plekken achter andere bellen.',
    stars: 'Bevrijd de sterren! Knal een sterbel, of schiet de bellen weg waar hij aan hangt, dan valt hij naar beneden.',
    top: 'Maak de bovenste rij leeg. Alles wat eronder hangt, valt dan vanzelf mee.',
    bomb: 'Een bom ontploft als je hem raakt of als er bellen naast knallen. Alles eromheen gaat mee!',
    ceil: 'Let op: na een paar schoten zakt het plafond een rij. Komen de bellen over de stippellijn, dan is het voorbij.',
    rain: 'De regenboogbel past bij elke kleur. Maak er een groepje van drie mee!',
    stone: 'Steen heeft geen kleur. Laat er twee keer bellen naast knallen, of laat hem vallen.',
    ice: 'Een bevroren bel ontdooit als er een bel naast knalt. Daarna kun je hem gewoon knallen.',
    chg: 'Kameleonbellen wisselen na elk schot van kleur. Kies je moment!',
    fire: 'Je vuurbal is klaar! Tik op 🔥: hij brandt dwars door alle bellen heen.',
  };
  const GOAL = { clear: ['🫧', 'Ruim alles op'], stars: ['⭐', 'Bevrijd de sterren'], top: ['⬆️', 'Maak de bovenste rij leeg'] };

  /* ================= state ================= */
  let S = null, G = null, Lv = null, LO = null, D = null;
  const scr = $('#bs'), stage = $('#bsStage'), field = $('#bsField'), bgc = $('#bsBg'), bgImg = $('#bsBgImg'), gcv = $('#bsGrid'), lcv = $('#bsLaunch'), fcv = $('#bsFx');
  const gctx = gcv.getContext('2d'), lctx = lcv.getContext('2d'), fctx = fcv.getContext('2d');
  const now = () => performance.now() / 1000;
  const clamp01 = u => u < 0 ? 0 : u > 1 ? 1 : u;
  let DUR = 1;                                                   // animation time scale (tests can speed everything up)
  const snapD = () => ({ g: S.g.map(row => row.map(e => e && Object.assign({}, e))), par: S.par, drop: S.drop });
  const theme = () => !G ? 0 : G.mode === 'end' ? Math.floor((S ? S.pushes : 0) / 12) % 6 : (Lv ? Lv.w : 0);

  /* ================= layout ================= */
  function fit(force) {
    if (current !== 'bs' || !S) return;
    const land = innerWidth > innerHeight * 1.1; scr.classList.toggle('land', land);
    const r = stage.getBoundingClientRect(); if (r.width < 40 || r.height < 40) return;
    const hud = $('#bsHud'), hudH = land ? 0 : hud.offsetHeight + 8;
    const c = Math.min((r.width - 10) / FW, (r.height - hudH - 6) / FH, 64);
    const w = FW * c, h = FH * c, x = Math.round((r.width - w) / 2), y = Math.round(hudH + Math.max(0, (r.height - hudH - h) * (land ? .5 : .7)));
    const dpr = Math.min(+(window.__bsDpr || 2), devicePixelRatio || 1), dprB = Math.min(3, devicePixelRatio || 1);
    const sig = [r.width, r.height, c, x, y, dpr, land, theme()].join();
    if (LO && LO.sig === sig && !force) return;
    LO = { c, x, y, w, h, dpr, dprB, k: c * dpr, land, sig, th: theme(), W: r.width, H: r.height, lan: { x0: LX - 3.6, y0: LY - 2.2, w: 7.2, h: FH - (LY - 2.2) } };
    Object.assign(field.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    hud.style.width = land ? Math.max(120, x - 18) + 'px' : '';
    gcv.width = Math.round(w * dpr); gcv.height = Math.round((FH + 2) * c * dpr); Object.assign(gcv.style, { top: (-2 * c) + 'px', width: w + 'px', height: (FH + 2) * c + 'px' });
    fcv.width = Math.round(w * dpr); fcv.height = Math.round(h * dpr); Object.assign(fcv.style, { width: w + 'px', height: h + 'px' });
    const L0 = LO.lan; lcv.width = Math.round(L0.w * c * dpr); lcv.height = Math.round(L0.h * c * dpr);
    Object.assign(lcv.style, { left: L0.x0 * c + 'px', top: L0.y0 * c + 'px', width: L0.w * c + 'px', height: L0.h * c + 'px' });
    drawBg(); redrawGrid(); lanDirty = true; prevBox = null; fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fcv.width, fcv.height); requestDraw();
  }
  let bgGen = 0, bgUrl = '';
  function drawBg() {
    const W = LO.W, H = LO.H, k = LO.dprB, my = ++bgGen;
    bgc.width = Math.round(W * k); bgc.height = Math.round(H * k);
    const g = bgc.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
    drawScene(g, W, H, theme(), { x: LO.x, y: LO.y, w: LO.w, h: LO.h, k: LO.c });
    bgc.style.display = ''; bgImg.style.visibility = 'hidden';
    // the finished scenery becomes a plain image: cheaper for the compositor than a canvas
    if (bgc.toBlob && !window.__bsNoBgImg) bgc.toBlob(b => {
      if (!b || my !== bgGen) return; const url = URL.createObjectURL(b);
      bgImg.onload = () => { if (my !== bgGen) return; bgImg.style.visibility = ''; bgc.style.display = 'none'; if (bgUrl) URL.revokeObjectURL(bgUrl); bgUrl = url; };
      bgImg.src = url;
    });
  }
  function redrawGrid() {
    if (!LO || !D) return;
    const g = gctx, k = LO.k, oy = 2 * k; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, gcv.width, gcv.height);
    const ceil = S && (S.ceil || G.mode === 'end'), cyp = oy + D.drop * RH * k;
    const pg = g.createLinearGradient(0, 0, 0, cyp + .2 * k); pg.addColorStop(0, '#2b3247'); pg.addColorStop(1, '#4d5876');
    g.fillStyle = pg; g.fillRect(0, 0, gcv.width, cyp + .1 * k);
    if (ceil) { g.save(); g.beginPath(); g.rect(0, cyp - .16 * k, gcv.width, .26 * k); g.clip(); g.fillStyle = '#ffcf3a'; g.fillRect(0, cyp - .16 * k, gcv.width, .26 * k); g.fillStyle = '#2b3247'; for (let x = -k; x < gcv.width; x += .5 * k) { g.beginPath(); g.moveTo(x, cyp + .1 * k); g.lineTo(x + .25 * k, cyp - .16 * k); g.lineTo(x + .5 * k, cyp - .16 * k); g.lineTo(x + .25 * k, cyp + .1 * k); g.fill(); } g.restore(); }
    else { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, cyp + .02 * k, gcv.width, .06 * k); }
    if (S && S.goal === 'top' && G.mode !== 'end') { g.fillStyle = '#ffd84a'; g.fillRect(0, cyp + .04 * k, gcv.width, .07 * k); }
    for (let r = 0; r < ROWS; r++) { const row = D.g[r], n = rowLen(D, r), y = cyOf(D, r) * k + oy; for (let c = 0; c < n; c++) { const e = row[c]; if (!e) continue; const s = bubbleSprite(e, k, opt.cb); g.drawImage(s.cv, Math.round(cxOf(D, r, c) * k - s.a), Math.round(y - s.a)); } }
  }

  /* ================= the launcher (own little canvas, redrawn only when the aim or the bubbles change) ================= */
  let lanDirty = true, lastAng = Math.PI / 2, lan = null, mood = '';
  const DISH = [-2.3, .42];
  function drawLauncher(t) {
    lanDirty = false; if (!LO || !S) return;
    const g = lctx, k = LO.k, L0 = LO.lan; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, lcv.width, lcv.height);
    g.setTransform(k, 0, 0, k, (LX - L0.x0) * k, (LY - L0.y0) * k);
    const ang = aim && aim.ok ? aim.a : lastAng;
    g.save(); g.translate(DISH[0], DISH[1]); dish(g); g.restore();
    drawCritter(g, ang, ang, mood);
    const put = (e, x, y, sc) => { if (!e) return; const s = bubbleSprite(e.k === 'n' ? { k: K_N, c: e.c } : { k: e.k, c: e.c }, k, opt.cb), z = s.w / k * sc; g.drawImage(s.cv, x - z / 2, y - z / 2, z, z); };
    const mz = [Math.cos(ang) * MUZ, -Math.sin(ang) * MUZ], dp = [DISH[0] + .02, DISH[1] - .2];
    const u = lan ? clamp01((t - lan.t0) / Math.max(.001, lan.t1 - lan.t0)) : 1, e = u * u * (3 - 2 * u);
    if (lan && lan.kind === 'swap') {                            // the two bubbles trade places along an arc
      const arc = (a, b, s, h) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s - Math.sin(s * Math.PI) * h];
      const p1 = arc(dp, mz, e, .8), p2 = arc(mz, dp, e, -.5);
      put(S.nxt, p2[0], p2[1], .78 + .22 * (1 - e)); put(S.cur, p1[0], p1[1], .78 + .22 * e);
    } else if (lan && lan.kind === 'load') {                     // the next bubble hops into the tube, a new one pops up
      const p = [dp[0] + (mz[0] - dp[0]) * e, dp[1] + (mz[1] - dp[1]) * e - Math.sin(e * Math.PI) * .7];
      put(S.cur, p[0], p[1], .78 + .22 * e); put(S.nxt, dp[0], dp[1], .78 * e);
    } else { put(S.cur, mz[0], mz[1], 1); put(S.nxt, dp[0], dp[1], .78); }
    if (S.cur && S.cur.k === 'fire') { g.fillStyle = 'rgba(255,170,40,.25)'; g.beginPath(); g.arc(mz[0], mz[1], .75, 0, TAU); g.fill(); }
    // right-hand badge: shots left / shots until the ceiling drops / misses until a new row
    g.save(); g.translate(2.3, .3);
    let big = '', small = '', dots = null;
    if (G && G.mode === 'end') { dots = [S.missLeft, S.missN]; small = 'nieuwe rij'; }
    else if (S.ceil) { dots = [S.ceilIn, S.ceil]; small = 'plafond'; }
    else if (S.lim) { big = String(Math.max(0, S.lim + S.extra - S.shots)); small = 'schoten'; }
    const lowShots = !dots && S.lim && S.lim + S.extra - S.shots <= 5;
    const bgr = g.createRadialGradient(-.15, -.2, .05, 0, 0, .62); bgr.addColorStop(0, lowShots ? '#ff9a8a' : '#ffffff'); bgr.addColorStop(1, lowShots ? '#d8343c' : '#c9d7ee');
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(.04, .58, .5, .1, 0, 0, TAU); g.fill();
    g.fillStyle = bgr; g.beginPath(); g.arc(0, 0, .55, 0, TAU); g.fill(); g.strokeStyle = 'rgba(20,30,60,.35)'; g.lineWidth = .04; g.stroke();
    g.setTransform(1, 0, 0, 1, (LX - L0.x0 + 2.3) * k, (LY - L0.y0 + .3) * k);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (dots) {
      const n = Math.min(10, dots[1]), left = Math.max(0, dots[0]), rad = .085 * k, gap = .2 * k, cols = Math.min(n, 5), rows = Math.ceil(n / 5);
      for (let i = 0; i < n; i++) { const cx = ((i % 5) - (cols - 1) / 2) * gap, cy = (Math.floor(i / 5) - (rows - 1) / 2) * gap - .08 * k; g.fillStyle = i < left ? (left <= 1 ? '#e8343c' : '#2f7cf6') : 'rgba(30,40,70,.22)'; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill(); }
      g.font = `800 ${(.15 * k).toFixed(1)}px ${FONT}`; g.fillStyle = '#1d2a44'; g.fillText(small, 0, .3 * k);
    } else if (big) {
      g.font = `900 ${(.42 * k).toFixed(1)}px ${FONT}`; g.fillStyle = lowShots ? '#fff' : '#17233d'; g.fillText(big, 0, -.06 * k);
      g.font = `800 ${(.14 * k).toFixed(1)}px ${FONT}`; g.fillStyle = lowShots ? '#fff' : '#3a4a6a'; g.fillText(small, 0, .3 * k);
    }
    g.restore();
  }

  /* ================= the visual timeline =================
     Rules run instantly (core.js). What you see follows: the shot flies along its traced path, then at the moment of impact
     the drawn grid D is replaced by a copy of the logic grid, and the bubbles that popped or fell become short-lived
     effects. Every restore (resume, restart, level change) throws all of this away and rebuilds D from the logic state. */
  let sched = [], schedSorted = true, fx = [], flight = null, slide = null, pending = null, readyAt = 0, doneAt = 0, token = 0;
  let raf = 0, frames = [], tapAt = 0, tapLat = [], aim = null, aimDirty = false, prevBox = null, box = null, staticAim = false;
  const at = (t, fn) => { if (!Number.isFinite(t)) t = now(); sched.push([t, fn]); schedSorted = false; if (t > doneAt) doneAt = t; requestDraw(); };   // a bad time must never block the timeline
  const until = t => { if (Number.isFinite(t) && t > doneAt) doneAt = t; };
  function rebuildVisual() {
    token++; sched = []; fx = []; flight = null; slide = null; lan = null; pending = null; readyAt = 0; doneAt = now(); mood = '';
    D = S ? snapD() : null; gcv.style.transform = '';
    if (LO) { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fcv.width, fcv.height); } prevBox = null;
    redrawGrid(); lanDirty = true; hud(); renderTools(); requestDraw();
  }
  function flushSched() { if (!sched.length) return; sched.sort((a, b) => a[0] - b[0]); const l = sched; sched = []; for (const [, f] of l) { try { f(); } catch (e) { console.error(e); } } }
  function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
  const canShoot = () => !!(S && G && !G.preview && !G.over && !S.won && !S.lost && current === 'bs' && !anyModal() && now() >= readyAt);
  function busy(t) { return !!(sched.length || fx.length || flight || slide || lan || pending || aimDirty || lanDirty || (prevBox && !staticAim)) || t < readyAt; }
  function frame(ts) {
    raf = 0; frames.push(ts); if (frames.length > 900) frames.splice(0, 450);
    if (current !== 'bs' || !S || !LO) return;
    const t = now();
    if (sched.length) { if (!schedSorted) { sched.sort((a, b) => a[0] - b[0]); schedSorted = true; } let n = 0; while (sched.length && sched[0][0] <= t && n++ < 400) { const f = sched.shift()[1]; try { f(); } catch (e) { console.error(e); } } }
    if (pending) { if (canShoot()) { const a = pending.a; pending = null; fire(a); } else if (t > pending.until || !S || S.won || S.lost || G.over || anyModal()) pending = null; }
    if (slide) {
      const u = clamp01((t - slide.t0) / Math.max(.001, slide.t1 - slide.t0)), e = 1 - Math.pow(1 - u, 3);
      const off = slide.from * (1 - e); gcv.style.transform = u >= 1 ? '' : `translateY(${(off * LO.c).toFixed(1)}px)`;
      if (u >= 1) slide = null;
    }
    if (lan && t >= lan.t1) { lan = null; lanDirty = true; }
    if (lan || lanDirty) drawLauncher(t);
    drawFx(t);
    if (tapAt) { tapLat.push(performance.now() - tapAt); if (tapLat.length > 80) tapLat.shift(); tapAt = 0; }
    if (busy(t)) requestDraw();
  }
  /* ---------- the effects layer: only the area drawn last frame is cleared ---------- */
  const mark = (x, y, w, h) => { if (!box) box = [x, y, x + w, y + h]; else { if (x < box[0]) box[0] = x; if (y < box[1]) box[1] = y; if (x + w > box[2]) box[2] = x + w; if (y + h > box[3]) box[3] = y + h; } };
  function spr(s, x, y, sc = 1, al = 1) {
    const k = LO.k, w = s.w * sc, h = s.h * sc, px = x * k - s.a * sc, py = y * k - (s.b != null ? s.b : s.a) * sc;
    if (al < 1) fctx.globalAlpha = Math.max(0, al); fctx.drawImage(s.cv, px, py, w, h); if (al < 1) fctx.globalAlpha = 1;
    mark(px, py, w, h);
  }
  function pathAt(P, s) { const c = P.cum; let i = 1; while (i < c.length - 1 && c[i] < s) i++; const a = P.pts[i - 1], b = P.pts[i], d = c[i] - c[i - 1] || 1, u = clamp01((s - c[i - 1]) / d); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
  const withCum = tr => { const cum = [0]; for (let i = 1; i < tr.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(tr.pts[i][0] - tr.pts[i - 1][0], tr.pts[i][1] - tr.pts[i - 1][1])); return { pts: tr.pts, cum, len: cum[cum.length - 1] }; };
  let aimCache = null;
  function drawAim() {
    if (!(opt.aim || G.longAim)) return;
    const shot = S.cur || { k: 'n', c: 0 }, fire = shot.k === 'fire', key = aim.a.toFixed(5) + (fire ? 'f' : '') + S.shots + (G.longAim ? 'L' : '') + S.drop + S.par;
    if (!aimCache || aimCache.key !== key) { const tr = C_trace(S, aim.a, fire), P = withCum(tr); aimCache = { key, tr, P, cell: fire ? null : C_snap(S, tr.x, tr.y) }; }
    const { tr, P } = aimCache, long = G.longAim;
    let maxS = P.len; if (!long && tr.bounces.length) maxS = Math.min(P.len, tr.bounces[0] + 3.2);
    const dot = dotSprite(fire ? 'fire' : shot.k === 'n' ? shot.c : 'w', LO.k);
    let i = 0; for (let s = MUZ + .45; s < maxS - .25; s += .5, i++) { const [x, y] = pathAt(P, s); spr(dot, x, y, 1, Math.max(.3, 1 - (s - MUZ) / (maxS + 4))); }
    if (long && aimCache.cell) { const [r, c] = aimCache.cell, sp = bubbleSprite(shot.k === 'n' ? { k: K_N, c: shot.c } : { k: shot.k, c: shot.c }, LO.k, opt.cb); spr(sp, cxOf(S, r, c), cyOf(S, r), 1, .45); }
  }
  const GRAV = 34;
  function drawFx(t) {
    const g = fctx; g.setTransform(1, 0, 0, 1, 0, 0);
    if (prevBox) g.clearRect(prevBox[0] - 2, prevBox[1] - 2, prevBox[2] - prevBox[0] + 4, prevBox[3] - prevBox[1] + 4);
    box = null;
    const aimOn = !!(aim && aim.ok && !G.over && (opt.aim || G.longAim));
    if (aimOn) drawAim();
    const k = LO.k;
    for (let i = 0; i < fx.length; i++) {
      const f = fx[i]; let alive = true;
      if (t < f.t0) { if (f.ty === 'pop' || f.ty === 'fall') spr(bubbleSprite(f.e, k, opt.cb), f.x, f.y); continue; }
      const dt = t - f.t0;
      switch (f.ty) {
        case 'pop': {                                            // swell, fade, burst into droplets
          if (!f.burst) { f.burst = true; burst(f); }
          const u = dt / (.13 * DUR); if (u >= 1) { alive = false; break; }
          spr(bubbleSprite(f.e, k, opt.cb), f.x, f.y, 1 + .35 * u, 1 - u); break;
        }
        case 'fall': {
          const y = f.y + f.vy * dt + .5 * GRAV * dt * dt / (DUR * DUR), x = f.x + f.vx * dt;
          if (y > FH - .45) { alive = false; landed(f, x); break; }
          spr(bubbleSprite(f.e, k, opt.cb), x, y); break;
        }
        case 'part': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          spr(f.s, f.x + f.vx * dt, f.y + f.vy * dt + .5 * f.g * dt * dt, f.sc * (1 - .5 * u), 1 - u * u); break;
        }
        case 'ring': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          const r = (f.r0 + (f.r1 - f.r0) * (1 - (1 - u) * (1 - u))) * k, x = f.x * k, y = f.y * k;
          g.globalAlpha = (1 - u) * (f.a || .9); g.strokeStyle = f.col; g.lineWidth = Math.max(1, f.w * k * (1 - u * .6)); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.globalAlpha = 1;
          mark(x - r - g.lineWidth, y - r - g.lineWidth, 2 * (r + g.lineWidth), 2 * (r + g.lineWidth)); break;
        }
        case 'flash': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          const r = f.r * k * (.6 + .6 * u), x = f.x * k, y = f.y * k, gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, `rgba(255,250,210,${(1 - u).toFixed(3)})`); gr.addColorStop(.5, `rgba(255,170,60,${(.7 * (1 - u)).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,90,20,0)');
          g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); mark(x - r, y - r, 2 * r, 2 * r); break;
        }
        case 'text': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          spr(f.s, f.x, f.y - .9 * (1 - (1 - u) * (1 - u)), u < .15 ? .6 + u / .15 * .4 : 1, u > .65 ? (1 - u) / .35 : 1); break;
        }
      }
      if (!alive) fx.splice(i--, 1);
    }
    if (flight) drawFlight(t);
    staticAim = aimOn && !fx.length && !flight;
    prevBox = box; aimDirty = false;
  }
  function drawFlight(t) {
    const F = flight, u = (t - F.t0) / F.dur;
    if (u >= 1) { flight = null; return; }
    const s = F.s0 + (F.P.len - F.s0) * Math.max(0, u), [x, y] = pathAt(F.P, s), k = LO.k;
    if (F.fire) {                                                // a trail of embers
      if (Math.random() < .9) fx.push({ ty: 'part', x, y, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .2) * 1.2, g: -2, t0: t, life: .35, s: dropSprite('fire', k), sc: 1.6 + Math.random() });
      spr(bubbleSprite({ k: 'fire', c: 0 }, k, false), x, y, 1.15);
    } else spr(bubbleSprite(F.e.k === 'n' ? { k: K_N, c: F.e.c } : { k: F.e.k, c: F.e.c }, k, opt.cb), x, y);
  }
  function burst(f) {                                            // a pop: a ring and a spray of droplets in the bubble's colour
    const t = now(), k = LO.k, col = f.e.k === K_STONE ? 'stone' : f.e.k === K_BOMB || f.e.k === K_RAIN ? 'spark' : f.how === 'burn' ? 'fire' : f.e.c;
    const n = f.how === 'boom' ? 4 : 6;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 2.2 + Math.random() * 2.6; fx.push({ ty: 'part', x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, g: 12, t0: t, life: .38 + Math.random() * .2, s: dropSprite(col, k), sc: .8 + Math.random() * .6 }); }
    fx.push({ ty: 'ring', x: f.x, y: f.y, t0: t, life: .28, r0: .3, r1: .75, col: f.e.k === K_STONE ? '#d8d0c4' : PAL[f.e.c] ? PAL[f.e.c].l : '#fff', w: .07 });
    if (f.e.k === K_STAR) { fx.push({ ty: 'text', x: f.x, y: f.y, t0: t, life: .9, s: textSprite('⭐', '#ffd84a', .7, k) }); for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; fx.push({ ty: 'part', x: f.x, y: f.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 2, g: 6, t0: t, life: .6, s: dropSprite('spark', k), sc: 1.4 }); } }
  }
  let landN = 0, landPts = 0, landAt = 0;
  function landed(f, x) {
    const t = now(), k = LO.k;
    for (let i = 0; i < 3; i++) fx.push({ ty: 'part', x, y: FH - .45, vx: (Math.random() - .5) * 2.5, vy: -2 - Math.random() * 2, g: 14, t0: t, life: .4, s: dropSprite(f.e.c >= 0 ? f.e.c : 'spark', k), sc: .8 });
    if (f.e.k === K_STAR) fx.push({ ty: 'text', x, y: FH - 1, t0: t, life: .9, s: textSprite('⭐', '#ffd84a', .7, k) });
    if (f.pts && !f.shown) { f.shown = true; fx.push({ ty: 'text', x: Math.max(1.2, Math.min(FW - 1.2, x)), y: FH - 1.4, t0: t, life: 1.1, s: textSprite('+' + fmt(f.pts), '#7dffb0', .55, k) }); }
    if (f.snd) sfx('bsLand');
    void landN; void landPts; void landAt;
  }

  /* ================= shooting ================= */
  function syncD() { flushSched(); flight = null; if (S) { D = snapD(); redrawGrid(); } }
  function fire(a) {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return false;
    if (sched.length || flight) syncD();                        // catch the drawing up first: D must equal the logic grid
    hideTip();
    const shotE = S.cur, isFire = shotE.k === 'fire', t0 = now(), prevNxt = S.nxt;
    const ev = C_shoot(S, a), tr = ev.tr, P = withCum(tr), s0 = Math.min(MUZ, P.len), V = Math.max(isFire ? 24 : 30, (P.len - s0) / 1.1);   // long bank shots fly faster
    const dur = Math.max(.04, (P.len - s0) / V) * DUR, t1 = t0 + dur, tok = token;
    flight = { P, s0, t0, dur, e: shotE, fire: isFire };
    lastAng = a; mood = '';
    for (const b of tr.bounces) if (b > s0) at(t0 + (b - s0) / V * DUR, () => { sfx('bsWall'); });
    lan = { kind: 'load', t0, t1: t0 + .22 * DUR }; lanDirty = true; void prevNxt;
    sfx(isFire ? 'bsFire' : 'bsShoot'); if (isFire) shake(.4);
    const tPop = x => isFire ? t0 + Math.max(0, (x.d + P.len - s0) / V) * DUR : t1 + x.d * DUR;
    let tEnd = t1; for (const x of ev.removed) tEnd = Math.max(tEnd, tPop(x));
    const tFall = tEnd + .06 * DUR, rows = ev.push || (ev.drop ? 1 : 0), tSlide = tEnd + .25 * DUR;
    readyAt = rows ? tSlide + .38 * DUR : t1 + .01; until(readyAt);
    const plan = { ev, t0, t1, tEnd, tFall, tSlide, rows, tPop, tok };
    if (isFire) impact(plan); else at(t1, () => { if (tok === token) impact(plan); });
    if (S.won || S.lost) record();
    hud(); renderTools(); save(); requestDraw();
    return true;
  }
  function impact(p) {
    const { ev, t1, tEnd, tFall, tSlide, rows, tPop } = p, k = LO.k, t = now();
    D = snapD(); redrawGrid();
    if (rows) { slide = { t0: tSlide, t1: tSlide + .38 * DUR, from: -rows * RH }; gcv.style.transform = `translateY(${(-rows * RH * LO.c).toFixed(1)}px)`; at(tSlide, () => sfx('bsPush')); }
    // popping bubbles (with rising notes), exploding bombs, thawing ice, cracking stone
    const pops = ev.removed.slice().sort((a, b) => tPop(a) - tPop(b)), np = pops.length, base = Math.min(3, Math.max(0, ev.streak - 1));
    for (const x of pops) fx.push({ ty: 'pop', x: x.x, y: x.y, e: x.e, t0: tPop(x), how: x.how });
    const ns = Math.min(7, np);
    for (let j = 0; j < ns; j++) { const x = pops[Math.floor(j * np / ns)], how = x.how; at(tPop(x), () => { if (how === 'pop' || how === 'burn') sfx('bsPop' + Math.min(8, 1 + base + j)); }); }
    for (const [bx, by, tb] of ev.boom) { const tt = (ev.shot.k === 'fire' ? tPop({ d: tb }) : t1 + tb * DUR); at(tt, () => { fx.push({ ty: 'flash', x: bx, y: by, t0: now(), life: .45, r: 2.4 }); fx.push({ ty: 'ring', x: bx, y: by, t0: now(), life: .4, r0: .4, r1: 2.1, col: '#ffd27a', w: .14 }); sfx('bsBomb'); shake(.8); vibrate(25); }); }
    for (const [x, y, d] of ev.thaw) at(t1 + d * DUR, () => { const tt = now(); for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; fx.push({ ty: 'part', x, y, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6 - 1, g: 10, t0: tt, life: .45, s: dropSprite('ice', k), sc: 1.3 }); } fx.push({ ty: 'ring', x, y, t0: tt, life: .3, r0: .3, r1: .7, col: '#e8f8ff', w: .08 }); sfx('bsIce'); });
    for (const [x, y, d] of ev.crack) at(t1 + d * DUR, () => { const tt = now(); for (let i = 0; i < 4; i++) { const a = Math.random() * TAU; fx.push({ ty: 'part', x, y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 - 1, g: 14, t0: tt, life: .4, s: dropSprite('stone', k), sc: 1.2 }); } sfx('bsStone'); });
    if (ev.removed.some(x => x.e.k === K_STONE)) at(tEnd, () => sfx('bsStone'));
    if (ev.chg.length) at(t1 + .12 * DUR, () => { const tt = now(); for (const [x, y] of ev.chg) fx.push({ ty: 'ring', x, y, t0: tt, life: .35, r0: .2, r1: .62, col: '#ffffff', w: .07 }); sfx('bsChg'); });
    if (ev.placed && !ev.removed.length) { const [x, y] = ev.cxy; fx.push({ ty: 'ring', x, y, t0: t, life: .22, r0: .35, r1: .62, col: 'rgba(255,255,255,.8)', w: .06 }); sfx('bsStick'); }
    if (ev.shot.k === 'rain' && ev.removed.length) at(t1, () => sfx('bsRain'));
    // falling bubbles: they drop with gravity and splash at the bottom
    const nf = ev.falls.length;
    ev.falls.forEach((f, i) => fx.push({ ty: 'fall', x: f.x, y: f.y, e: f.e, t0: tFall + Math.random() * .05 * DUR, vx: (Math.random() - .5) * 1.6 / DUR, vy: (-1.2 - Math.random() * 2) / DUR, pts: i === nf - 1 ? ev.fallPts : 0, snd: i === 0 }));
    if (nf) { at(tFall + .1 * DUR, () => sfx('bsFall')); until(tFall + 1.3 * DUR); }
    // score popups, combo text, stars
    if (ev.pts && np) { let cx = 0, cy = 0; for (const x of pops) { cx += x.x; cy += x.y; } at(tEnd, () => fx.push({ ty: 'text', x: cx / np, y: cy / np, t0: now(), life: 1, s: textSprite('+' + fmt(ev.pts), '#ffffff', .55, LO.k) })); }
    if (ev.stars) at(tEnd + .05, () => sfx('bsStar'));
    if (ev.streak >= 2 && np) at(tEnd, () => combo(ev.streak >= 5 ? `Super combo ×${ev.streak}!` : `Combo ×${ev.streak}!`, ev.streak));
    if (nf >= 8) at(tFall + .2 * DUR, () => { combo(nf >= 15 ? 'Lawine!' : 'Wat een val!', 4); shake(.5); });
    if (ev.bonus) at(tEnd, () => combo('Leeg! +1.000', 5));
    stats.pops += np; if (nf > stats.bigDrop) stats.bigDrop = nf;
    until(tEnd + .5 * DUR);
    if (S.fire >= 1 && !G.fireReady) { G.fireReady = true; at(tEnd + .2, () => { sfx('bsFireOn'); if (!G.fireTold) { G.fireTold = true; showTip('fire'); } renderTools(); }); }
    if (S.won || S.lost) showResult(tFall + (nf ? .8 : .15) * DUR);
    hud(); renderTools();
    if (G.mode === 'end' && theme() !== LO.th) { LO.th = theme(); at(tSlide + .4, () => { if (LO) { LO.sig = ''; fit(true); } }); }
  }
  function combo(txt, lvl) { const el = $('#bsCombo'); el.textContent = txt; el.className = ''; void el.offsetWidth; el.className = 'show l' + Math.min(5, lvl); if (lvl >= 3) sfx('bsCombo'); }
  function shake(a) { if (!opt.shake) return; const el = field; el.classList.remove('bs-shake', 'bs-shake2'); void el.offsetWidth; el.classList.add(a > .6 ? 'bs-shake2' : 'bs-shake'); clearTimeout(shakeT); shakeT = setTimeout(() => el.classList.remove('bs-shake', 'bs-shake2'), 450); }
  let shakeT = 0;
  function requestShot(a) {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return;
    if (canShoot()) fire(a); else { pending = { a, until: now() + 1.6 }; requestDraw(); }
  }
  function doSwap() {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return;
    if (!C_swap(S)) { if (S.cur && S.cur.k !== 'n') toast(S.cur.k === 'fire' ? 'Schiet eerst je vuurbal af.' : 'Schiet eerst je ' + (S.cur.k === 'bomb' ? 'bom' : 'regenboogbel') + ' af.'); return; }
    hideTip(); sfx('bsSwap'); lan = { kind: 'swap', t0: now(), t1: now() + .2 * DUR }; lanDirty = true; save(); requestDraw();
  }

  /* ================= end of a game ================= */
  function record() {                                           // the result is booked the moment the deciding shot is fired
    G.over = true; store.del('bs.save');
    if (G.mode === 'end') {
      const sc = S.score, rec = sc > (stats.endBest || 0); stats.endGames++; if (rec) stats.endBest = sc;
      const coins = Math.min(60, Math.floor(sc / 400)); stats.coins += coins; G.res = { sc, rec, coins };
    } else if (S.won) {
      const st = starsFor(Lv, S.shots), id = G.id, prev = stats.stars[id] || 0;
      const coins = prev ? (st > prev ? (st - prev) * 5 : 2) : 10 + st * 5;
      if (st > prev) stats.stars[id] = st; if (st === 3 && prev < 3) stats.three = (stats.three || 0) + 1;
      const rec = S.score > (stats.best[id] || 0); if (rec) stats.best[id] = S.score;
      stats.won++; stats.coins += coins; G.res = { st, coins, rec };
    } else stats.lost++;
    saveStats();
  }
  function showResult(tDone) {                                     // ... and shown once the bubbles have settled
    const game = G, free = fn => () => { if (G !== game || current !== 'bs') return; if (anyModal()) { setTimeout(free(fn), 300); return; } fn(); };   // never on top of the pause menu
    if (G.mode === 'end') {
      at(tDone + .2, () => { if (G !== game || current !== 'bs') return; sfx('bsLose'); vibrate(40); mood = 'wow'; lanDirty = true; });
      at(tDone + 1, free(openEndless));
    } else if (S.won) {
      at(tDone + .15, () => { if (G !== game || current !== 'bs') return; confetti(); sfx('bsWin'); vibrate(30); mood = 'wow'; lanDirty = true; requestDraw(); });
      at(tDone + 1, free(openEnd));
    } else {
      at(tDone + .3, () => { if (G !== game || current !== 'bs') return; sfx('bsLose'); vibrate(40); });
      at(tDone + .8, free(openLose));
    }
  }
  function openEnd() {
    const { st, coins, rec } = G.res, nx = G.id + 1;
    $('#bsEndStars').innerHTML = [1, 2, 3].map(k => `<span class="${k <= st ? 'on' : ''}" style="animation-delay:${.15 + k * .2}s">★</span>`).join('');
    $('#bsEndTitle').textContent = G.id === NL ? 'Alle levels gehaald!' : ['Gelukt!', 'Prachtig geschoten!', 'Knallend gedaan!'][G.id % 3];
    const left = S.lim ? Math.max(0, S.lim + S.extra - S.shots) : 0;
    $('#bsEndText').innerHTML = `Score: <b>${fmt(S.score)}</b>${rec ? ' · <b>record!</b>' : ''}<br>${S.shots} schoten${left ? ` · ${left} over (+${fmt(S.bonus)})` : ''}<br><span class="bs-coin">🪙 +${coins}</span>`
      + (st < 3 ? `<br><small>3 sterren: in ${Lv.st[0]} schoten of minder.</small>` : '');
    $('#bsEndNext').hidden = nx > NL; $('#bsEndRetry').hidden = false; $('#bsEndMenu').textContent = 'Levels';
    $('#bsEndNext').textContent = 'Volgende ▶';
    openModal('bsEndModal');
  }
  function openEndless() {
    const { sc, rec, coins } = G.res;
    $('#bsEndStars').innerHTML = `<div class="bs-trophy">${rec ? '🏆' : '🫧'}</div>`;
    $('#bsEndTitle').textContent = rec ? 'Nieuw record!' : 'De bellen zijn over de lijn';
    $('#bsEndText').innerHTML = `Score: <b>${fmt(sc)}</b><br>Record: <b>${fmt(stats.endBest)}</b> · ${S.pushes} nieuwe rijen<br><span class="bs-coin">🪙 +${coins}</span>`;
    $('#bsEndNext').hidden = false; $('#bsEndNext').textContent = 'Opnieuw ▶'; $('#bsEndRetry').hidden = true; $('#bsEndMenu').textContent = 'Menu';
    openModal('bsEndModal');
  }
  function openLose() {
    if (!S || !S.lost) return;
    const shots = S.why === 'shots';
    $('#bsLoseTitle').textContent = shots ? 'Geen schoten meer' : 'Over de lijn!';
    $('#bsLoseText').innerHTML = shots ? `Nog net niet gelukt. Met <b>+5 schoten</b> kun je verder, of probeer het opnieuw. <small>(🪙 ${stats.coins})</small>` : 'De bellen zijn over de stippellijn gekomen. Probeer het nog eens!';
    const b = $('#bsLosePlus'); b.hidden = !shots;
    b.innerHTML = stats.inv.plus > 0 ? `➕ +5 schoten (${stats.inv.plus})` : `➕ +5 schoten · 🪙${BOOST.plus.p}`;
    b.disabled = stats.inv.plus <= 0 && stats.coins < BOOST.plus.p;
    openModal('bsLoseEndModal');
  }
  function confetti() {
    const box = $('#bsConf'), cols = PAL.map(p => p.b); box.innerHTML = '';
    for (let i = 0; i < 70; i++) { const e = document.createElement('i'), w = 6 + Math.random() * 6; e.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * .55).toFixed(0)}px;background:${cols[i % cols.length]};animation-duration:${(2.2 + Math.random() * 1.4).toFixed(2)}s;animation-delay:${(Math.random() * .6).toFixed(2)}s;--dx:${((Math.random() - .5) * 80).toFixed(0)}px;--r:${(360 + Math.random() * 720).toFixed(0)}deg`; box.appendChild(e); }
    clearTimeout(confT); confT = setTimeout(() => { box.innerHTML = ''; }, 4500);
  }
  let confT = 0;

  /* ================= boosters ================= */
  function ensure(k) {
    if (stats.inv[k] > 0) return true;
    const p = BOOST[k].p;
    if (stats.coins >= p) { stats.coins -= p; stats.inv[k]++; saveStats(); toast(`${BOOST[k].n} gekocht voor 🪙 ${p}`); return true; }
    toast(`Je hebt geen ${BOOST[k].n} meer. Speel levels om munten 🪙 te verdienen (kost ${p}).`, 3200); return false;
  }
  function consume(k) { stats.inv[k]--; stats.boosts++; G.boosts++; saveStats(); renderTools(); save(); }
  function useBoost(k) {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return false;
    hideTip();
    if (k === 'fire') {
      if (S.cur && S.cur.k === 'fire') { toast('Je vuurbal ligt al klaar. Mik en schiet!'); return false; }
      if (S.fire < 1) { toast(`Knal veel bellen achter elkaar om de vuurbal op te laden (${Math.round(S.fire * 100)}%).`); return false; }
      if (S.cur && S.cur.k !== 'n') { toast('Schiet eerst je ' + (S.cur.k === 'bomb' ? 'bom' : 'regenboogbel') + ' af.'); return false; }
      C_arm(S, 'fire'); S.fire = 0; G.fireReady = false; sfx('bsFireOn'); lan = { kind: 'load', t0: now(), t1: now() + .2 * DUR }; lanDirty = true; renderTools(); save(); requestDraw(); return true;
    }
    if (k === 'bomb' || k === 'rain') {
      if (S.cur && S.cur.k !== 'n') { toast(S.cur.k === k ? 'Die ligt al klaar. Mik en schiet!' : 'Schiet eerst je ' + (S.cur.k === 'fire' ? 'vuurbal' : S.cur.k === 'bomb' ? 'bom' : 'regenboogbel') + ' af.'); return false; }
      if (!ensure(k)) return false;
      C_arm(S, k); consume(k); sfx('bsBoost'); lan = { kind: 'load', t0: now(), t1: now() + .2 * DUR }; lanDirty = true; requestDraw(); return true;
    }
    if (k === 'aim') {
      if (G.longAim) { toast('Lang mikken staat al aan voor dit spel.'); return false; }
      if (!ensure('aim')) return false;
      G.longAim = true; consume('aim'); sfx('bsBoost'); toast('Lang mikken: je ziet de hele baan en waar je bel blijft plakken.'); return true;
    }
    if (k === 'plus') {
      if (!ensure('plus')) return false;
      if (G.mode === 'end') S.missLeft += 5; else if (S.ceil) S.ceilIn += 5; else S.extra += 5;
      consume('plus'); sfx('bsBoost'); lanDirty = true; requestDraw();
      toast(G.mode === 'end' ? 'De volgende rij komt 5 missers later.' : S.ceil ? 'Het plafond wacht 5 schoten langer.' : '5 extra schoten!'); hud(); return true;
    }
    return false;
  }
  let toastT = 0;
  function toast(t, ms = 2400) { const el = $('#bsToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  function renderTools() {
    if (!G) return;
    document.querySelectorAll('#bsTools button[data-b]').forEach(b => {
      const k = b.dataset.b, i = b.querySelector('i');
      if (k === 'fire') { const f = S ? Math.min(1, S.fire) : 0, armed = S && S.cur && S.cur.k === 'fire'; b.style.setProperty('--p', (armed ? 1 : f).toFixed(3)); b.classList.toggle('ready', !!S && (f >= 1 || armed)); i.textContent = armed ? '✓' : f >= 1 ? '!' : Math.round(f * 100) + '%'; i.classList.toggle('buy', false); return; }
      const n = stats.inv[k]; i.textContent = n > 0 ? n : '🪙' + BOOST[k].p; i.classList.toggle('buy', n <= 0);
      b.classList.toggle('on', (k === 'aim' && !!G.longAim) || (!!S && !!S.cur && S.cur.k === k));
      if (k === 'plus') b.querySelector('small').textContent = G.mode === 'end' || (S && S.ceil) ? 'Uitstel' : '+5';
    });
    $('#bsCoins').textContent = stats.coins;
  }
  function hud() {
    if (!S || !G) return;
    $('#bsTitle').textContent = G.mode === 'end' ? 'Eindeloos' : 'Level ' + G.id;
    $('#bsScore').textContent = fmt(S.score);
    const goalEl = $('#bsGoal'), starEl = $('#bsStarHud');
    if (G.mode === 'end') {
      goalEl.innerHTML = `<b>♾️</b><span><em>Eindeloos</em><small>🏆 ${fmt(Math.max(stats.endBest || 0, S.score))}</small></span>`;
      starEl.innerHTML = `<b>${S.pushes}</b><small>rijen</small>`;
    } else {
      const [ic, tx] = GOAL[S.goal] || GOAL.clear;
      const prog = S.goal === 'stars' ? `${S.stars}/${S.starsTotal} ⭐` : S.goal === 'top' ? `nog ${row0(S)}` : `nog ${count(S)}`;
      goalEl.innerHTML = `<b>${ic}</b><span><em>${tx}</em><small>${prog}</small></span>`;
      const st = starsFor(Lv, S.shots + (S.won ? 0 : 1)), sh = S.won ? starsFor(Lv, S.shots) : st;
      starEl.innerHTML = `<b class="bs-st">${[1, 2, 3].map(k => `<i class="${k <= sh ? 'on' : ''}">★</i>`).join('')}</b><small>${sh === 3 ? '≤ ' + Lv.st[0] : sh === 2 ? '≤ ' + Lv.st[1] : 'schoten'}</small>`;
    }
  }
  const TIP_SEEN = () => store.get('bs.tips', {});
  function showTip(key) {
    const el = $('#bsTip'); el.classList.remove('show');
    if (!key || !TIPS[key]) return;
    el.innerHTML = `<b>💡</b><span>${esc(TIPS[key])}</span>`;
    setTimeout(() => { if (current === 'bs') el.classList.add('show'); }, 350);
    const s = TIP_SEEN(); s[key] = 1; store.set('bs.tips', s);
  }
  const hideTip = () => $('#bsTip').classList.remove('show');

  /* ================= starting, saving ================= */
  let nextSeed = 0;
  const newSeed = () => { const s = nextSeed || ((Math.random() * 2 ** 31) >>> 0) || 1; nextSeed = 0; return s; };
  function begin() {
    closeModals(); $('#bsConf').innerHTML = ''; hideTip(); aim = null; down = null;
    LO = null; fit(true); rebuildVisual();
    if (G && !G.preview) { slide = { t0: now(), t1: now() + .5 * DUR, from: -3 * RH }; gcv.style.transform = `translateY(${(-3 * RH * (LO ? LO.c : 0)).toFixed(1)}px)`; readyAt = now() + .45 * DUR; }
    prewarm(); requestDraw();
  }
  function startLevel(id) {
    Lv = levelOf(id); if (!Lv) return;
    S = C_new(Lv, newSeed()); G = { mode: 'lvl', id, boosts: 0, longAim: false, over: false, fireReady: false, fireTold: !!TIP_SEEN().fire };
    stats.played++; saveStats();
    begin(); saveNow();
    showTip(Lv.tip || (id === 1 ? 'aim' : null));
  }
  function startEndless() {
    Lv = null; S = C_newEnd(newSeed()); G = { mode: 'end', id: 0, boosts: 0, longAim: false, over: false, fireReady: false, fireTold: !!TIP_SEEN().fire };
    stats.played++; saveStats();
    begin(); saveNow();
    toast('Eindeloos: na een paar missers schuift er een nieuwe rij bij. Hoe ver kom jij?', 3200);
  }
  function restart() { if (!G) return; if (G.mode === 'end') startEndless(); else startLevel(G.id); }
  let saveTm = 0;
  function saveNow() { clearTimeout(saveTm); saveTm = 0; if (!S || !G || G.preview || G.over || S.won || S.lost) return; store.set('bs.save', { S: C_ser(S), G: { mode: G.mode, id: G.id, boosts: G.boosts, longAim: G.longAim, fireTold: G.fireTold } }); }
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 300); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'bs') saveNow(); });
  function restoreSaved(sv) {
    const g = sv.G || {}; if (g.mode !== 'end' && !levelOf(g.id)) throw new Error('level');
    Lv = g.mode === 'end' ? null : levelOf(g.id); S = C_deser(sv.S);
    G = { mode: g.mode === 'end' ? 'end' : 'lvl', id: g.id || 0, boosts: g.boosts || 0, longAim: !!g.longAim, over: false, fireReady: S.fire >= 1, fireTold: !!g.fireTold };
    if (S.won || S.lost) throw new Error('over');
  }
  function preview() {                                           // the next level waits behind the start dialog
    const n = unlocked(); Lv = levelOf(n); S = C_new(Lv, 1); G = { mode: 'lvl', id: n, preview: true, boosts: 0, over: false };
    LO = null; fit(true); rebuildVisual();
  }
  let warmT = 0;
  function prewarm() {                                           // draw every sprite this game can need in small idle slices
    clearTimeout(warmT); if (!LO) return;
    const k = LO.k, jobs = [];
    for (let c = 0; c < 6; c++) { for (const kind of [K_N, K_STAR, K_ICE, K_CHG]) jobs.push(() => bubbleSprite({ k: kind, c }, k, opt.cb)); jobs.push(() => dropSprite(c, k)); jobs.push(() => dotSprite(c, k)); }
    for (const kind of [K_BOMB, K_RAIN, 'fire']) jobs.push(() => bubbleSprite({ k: kind, c: -1 }, k, false));
    jobs.push(() => bubbleSprite({ k: K_STONE, c: -1, h: 2 }, k, false), () => bubbleSprite({ k: K_STONE, c: -1, h: 1 }, k, false), () => dropSprite('spark', k), () => dropSprite('ice', k), () => dropSprite('stone', k), () => dropSprite('fire', k), () => dotSprite('fire', k), () => dotSprite('w', k));
    const step = () => { const t0 = performance.now(); while (jobs.length && performance.now() - t0 < 4) jobs.shift()(); if (jobs.length) warmT = setTimeout(step, 30); };
    warmT = setTimeout(step, 80);
  }

  /* ================= start dialog ================= */
  function renderStart() {
    const un = unlocked();
    let h = '';
    LV.forEach((L, i) => {
      if (i % 10 === 0) h += `<div class="bs-world">${WORLDS[L.w][1]} ${WORLDS[L.w][0]}</div>`;
      const n = i + 1, st = stats.stars[n] || 0, lock = n > un;
      h += `<button data-n="${n}" class="${lock ? 'lock' : ''}${n === un && !st ? ' next' : ''}"${lock ? ' aria-disabled="true"' : ''}>${lock ? '<b>🔒</b>' : `<b>${n}</b><span>${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</span>`}</button>`;
    });
    $('#bsLevels').innerHTML = h;
    $('#bsEndless').innerHTML = `<span class="bs-eico">♾️</span><span class="bs-etx"><b>Eindeloos</b><small>Hoe lang hou jij het vol? Record: ${fmt(stats.endBest || 0)}</small></span><em>Speel ▶</em>`;
    $('#bsShop').innerHTML = `<div class="bs-purse">🪙 <b>${stats.coins}</b><small>munten</small></div>` + Object.entries(BOOST).map(([k, b]) => `<button data-k="${k}"><b>${b.i}</b><span>${b.n}</span><small>× ${stats.inv[k]}</small><em>+1 · 🪙${b.p}</em></button>`).join('');
    $('#bsOptList').innerHTML = [['aim', 'Richtlijn'], ['cb', 'Kleurenblind-hulp'], ['shake', 'Schermschudden'], ['sound', 'Geluidseffecten'], ['music', 'Achtergrondmuziek']]
      .map(([k, l]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#bsStats').innerHTML = [['Levels', `${Object.keys(stats.stars).length}/${NL}`], ['Sterren', totalStars()], ['Record', fmt(stats.endBest || 0)]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    const live = S && G && !G.over && !G.preview;
    $('#bsResume').hidden = !live;
    $('#bsGo').textContent = live ? 'Verder ▶' : `Level ${un} ▶`;
    $('#bsGo').dataset.n = live ? '' : un;
  }
  function openStart() { aim = null; down = null; pending = null; renderStart(); openModal('bsStartModal'); }

  /* ================= input ================= */
  let down = null;
  const toF = e => { const r = field.getBoundingClientRect(); return { x: (e.clientX - r.left) / LO.c, y: (e.clientY - r.top) / LO.c }; };
  function setAim(p) {
    const dy = LY - p.y, ok = dy > .35, a = Math.max(AMIN, Math.min(Math.PI - AMIN, Math.atan2(Math.max(dy, .01), p.x - LX)));
    aim = { a, ok }; if (ok) lastAng = a; aimDirty = true; lanDirty = true; requestDraw();
  }
  const endAim = () => { if (aim) { aim = null; aimDirty = true; lanDirty = true; requestDraw(); } };
  stage.addEventListener('pointerdown', e => {
    if (!S || !G || !LO || G.preview || current !== 'bs' || anyModal()) return;
    if (e.target.closest && e.target.closest('#bsTip,#bsToast')) return;
    e.preventDefault(); if (G.over) return;
    const p = toF(e);
    const nearL = Math.hypot(p.x - LX, p.y - (LY + .2)) < 1.2 || Math.hypot(p.x - (LX + DISH[0]), p.y - (LY + DISH[1] - .1)) < .85;
    down = { id: e.pointerId, x: p.x, y: p.y, swap: nearL }; tapAt = performance.now(); hideTip();
    if (!nearL) { setAim(p); if (aim && aim.ok) sfx('bsAim'); }
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', e => {
    if (!down || down.id !== e.pointerId || !LO) return;
    const p = toF(e);
    if (down.swap) { if (Math.hypot(p.x - down.x, p.y - down.y) < .7) return; down.swap = false; }
    const was = aim && aim.ok; setAim(p); if (!was && aim.ok) sfx('bsAim');
  });
  stage.addEventListener('pointerup', e => {
    if (!down || down.id !== e.pointerId || !LO) return;
    const d = down; down = null;
    if (d.swap) { doSwap(); return; }
    setAim(toF(e)); const a = aim && aim.ok ? aim.a : null; endAim();
    if (a != null) requestShot(a);
  });
  stage.addEventListener('pointercancel', () => { down = null; endAim(); });
  $('#bsTools').addEventListener('click', e => { const b = e.target.closest('button[data-b]'); if (b) useBoost(b.dataset.b); });
  $('#bsTip').addEventListener('click', hideTip);
  $('#bsLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (!b) return; if (b.classList.contains('lock')) { menuToast('Haal eerst de levels ervoor.'); return; } startLevel(+b.dataset.n); });
  $('#bsEndless').addEventListener('click', () => startEndless());
  $('#bsShop').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k, p = BOOST[k].p;
    if (stats.coins < p) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); return; }
    stats.coins -= p; stats.inv[k]++; saveStats(); sfx('bsBoost'); renderStart(); renderTools();
  });
  $('#bsOptList').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); renderStart(); Sfx.refresh && Sfx.refresh();
    if (b.dataset.k === 'cb') { redrawGrid(); lanDirty = true; prewarm(); requestDraw(); }
  });
  $('#bsGo').addEventListener('click', () => { const n = $('#bsGo').dataset.n; if (n) startLevel(+n); else closeModals(); });
  $('#bsResume').addEventListener('click', () => closeModals());
  $('#bsStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#bsEndMenu').addEventListener('click', () => { closeModals(); if (G && G.mode === 'end') leave(); else openStart(); });
  $('#bsEndRetry').addEventListener('click', () => restart());
  $('#bsEndNext').addEventListener('click', () => { if (!G) return; if (G.mode === 'end') startEndless(); else if (G.id < NL) startLevel(G.id + 1); });
  $('#bsLoseRetry').addEventListener('click', () => restart());
  $('#bsLoseMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#bsLosePlus').addEventListener('click', () => {
    if (!S || !S.lost || S.why !== 'shots' || !ensure('plus')) return;
    S.lost = false; S.why = ''; S.extra += 5; G.over = false; consume('plus'); sfx('bsBoost'); closeModals(); lanDirty = true; hud(); readyAt = 0; saveNow(); requestDraw();
  });
  $('#bsBack').addEventListener('click', () => leave());
  $('#bsMenu').addEventListener('click', () => openStart());
  $('#bsRetry').addEventListener('click', async () => {
    if (!S || !G || G.preview) return;
    if (S.shots && !G.over && !(await askConfirm('Opnieuw beginnen?', G.mode === 'end' ? 'Je begint een nieuw eindeloos spel.' : 'Je begint dit level opnieuw.', 'Opnieuw'))) return;
    restart();
  });
  window.addEventListener('resize', () => { if (current === 'bs') setTimeout(() => fit(), 60); });

  function enter() {
    show('bs');
    const sv = store.get('bs.save', null);
    if ((!S || !G || G.preview || G.over) && sv && sv.S) { try { restoreSaved(sv); } catch (e) { S = null; G = null; store.del('bs.save'); } }
    if (S && G && !G.preview && !G.over) { LO = null; fit(true); rebuildVisual(); prewarm(); requestAnimationFrame(() => fit()); }
    else { preview(); renderTools(); openStart(); }
  }
  function leave() { $('#bsConf').innerHTML = ''; saveNow(); closeModals(); hideTip(); aim = null; down = null; pending = null; if (G && G.over) { S = null; G = null; } show('menu'); refreshMenu(); }

  /* ================= test hooks ================= */
  const client = (x, y) => { const r = field.getBoundingClientRect(); return { x: r.left + x * LO.c, y: r.top + y * LO.c }; };
  function floating(T) { const seen = new Set(), q = []; for (let c = 0; c < rowLen(T, 0); c++) if (T.g[0][c]) { seen.add(c); q.push([0, c]); } for (let i = 0; i < q.length; i++) for (const [a, b] of nbrs(T, q[i][0], q[i][1])) { const kk = a * 16 + b; if (!seen.has(kk) && T.g[a][b]) { seen.add(kk); q.push([a, b]); } } let n = 0; each(T, (e, r, c) => { if (!seen.has(r * 16 + c)) n++; }); return n; }
  window.__bs = {
    get S() { return S; }, get G() { return G; }, get D() { return D; }, get LO() { return LO; }, get fx() { return fx.length; }, get sched() { return sched.length; }, get flight() { return !!flight; }, get pending() { return !!pending; },
    LV, opt, stats: () => stats, startLevel, startEndless, useBoost, fit, restart, openStart,
    set seed(v) { nextSeed = v >>> 0; }, set dur(v) { DUR = +v || 1; }, get dur() { return DUR; },
    canShoot, busy: () => busy(now()), doneIn: () => Math.max(0, Math.max(doneAt, readyAt) - now()), readyIn: () => Math.max(0, readyAt - now()),
    finite: () => sched.every(s => Number.isFinite(s[0])) && fx.every(f => Number.isFinite(f.t0)) && Number.isFinite(readyAt) && Number.isFinite(doneAt) && (!flight || Number.isFinite(flight.t0 + flight.dur)),
    drawnKey: () => D && gridKey(D.g, D), logicKey: () => S && gridKey(S.g, S), floating: () => S ? floating(S) : 0,
    aimClient(a, dist = 4) { return client(LX + Math.cos(a) * dist, LY - Math.sin(a) * dist); }, launcherClient: () => client(LX, LY + .2),
    bot: () => S && botMove(S), frames: () => frames.slice(), tapLat: () => tapLat.slice(),
    giveCoins(n) { stats.coins += n; saveStats(); renderTools(); }, setFire(v) { S.fire = v; G.fireReady = false; renderTools(); },
    core: { shoot: C_shoot, trace: C_trace, snap: C_snap, newState: C_new, clone: C_clone, count, nbrs, cxOf, cyOf, rowLen, gridKey, starsFor },
  };
  return { enter, leave, hasSave: () => !!store.get('bs.save', null) };
