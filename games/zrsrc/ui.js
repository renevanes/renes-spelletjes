  /* ================= ui.js: screens, touch controls, build bar, HUD, feedback, the loop, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STEP = 1000 / TPS, SPEEDS = [[.7, 'Langzaam'], [1, 'Normaal'], [1.5, 'Snel']];
  const opt = Object.assign({ sound: true, speed: 1, big: false, vib: true, adj: 0, fac: 0, opp: 1, diff: 1, size: 'middel', cry: 2500, kr: true, cf: 0 }, store.get('zr.settings', {}));
  Sfx.gate('zr', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('zr.settings', opt);
  let stats = Object.assign({ games: 0, wins: 0, losses: 0, skWins: 0, sk2Hard: 0, kills: 0, harv: 0, built: 0, made: 0, flee: 0, swallowed: 0, camp: {}, stars: 0, missions: 0, best: 0 }, store.get('zr.stats', {}));
  const saveStats = () => { let st = 0, ms = 0; for (const k in stats.camp) { st += stats.camp[k].s || 0; ms++; } stats.stars = st; stats.missions = ms; store.set('zr.stats', stats); };
  const scr = $('#zr'), stageEl = $('#zrStage'), cv = $('#zrCv'), miniCv = $('#zrMini');
  const RD = Draw.create(cv, $('#zrBg'), $('#zrFog'), $('#zrOv'));
  let GS = null, S = null, raf = 0, lastT = 0, acc = 0, quality = 0, frames = [];
  const now = () => performance.now();
  const SHOWN = document.getElementsByClassName('modal show');
  const modalUp = () => SHOWN.length > 0;
  const H = () => S ? S.P[S.human] : null;
  const FAC = i => FACTIONS[i];
  const vib = ms => { if (opt.vib) vibrate(ms); };

  /* ---------- sounds: only for things on screen, never too many at once ---------- */
  const lastS = {}, GAP = { zrGun: .07, zrGunS: .06, zrCannon: .08, zrRocket: .1, zrArty: .15, zrHit: .06, zrBoom: .09, zrPoof: .08, zrBeam: .35, zrZap: .12, zrCash: .5, zrSel: .05, zrAck: .12, zrKruip: 2, zrBoomBig: .25 };
  function sfx(n, x, y) {
    if (!opt.sound) return;
    let pan = 0;
    if (x != null && S) { const v = RD.view(); if (x < v.x0 - 3 || x > v.x1 + 3 || y < v.y0 - 3 || y > v.y1 + 3) return; pan = Math.max(-.8, Math.min(.8, ((x - v.x0) / (v.x1 - v.x0) - .5) * 1.4)); }
    const t = now() / 1000; if (GAP[n] && t - (lastS[n] || 0) < GAP[n]) return; lastS[n] = t;
    Sfx.play(n, undefined, pan);
  }

  /* ---------- sizing ---------- */
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const d = Math.min(window.__zrDpr || [1.75, 1.4, 1.1, .9, .75][quality], devicePixelRatio || 1);
    const z0 = RD.W ? RD.cam.z : 0, cx = RD.W ? RD.cam.x + RD.W / RD.cam.z / 2 : null, cy = RD.W ? RD.cam.y + RD.H / RD.cam.z / 2 : null;
    RD.resize(r.width, r.height, d);
    if (S && cx != null) { const [mn, mx] = RD.zoomLimits(); RD.cam.z = Math.max(mn, Math.min(mx, z0 || 36)); RD.center(cx, cy); }
    const mr = miniCv.getBoundingClientRect(); if (mr.width > 10) { miniCv.width = Math.round(mr.width * Math.min(2, devicePixelRatio || 1)); miniCv.height = Math.round(mr.height * Math.min(2, devicePixelRatio || 1)); }
    if (S && !raf) drawStill();
  }
  addEventListener('resize', () => { if (current === 'zr') setTimeout(() => { fit(); placeInfo(); }, 60); });
  function drawStill() { if (S) { RD.frame(S, 1, frameOpts(true)); miniTick(true); } else if (GS && GS.demo) drawDemo(); }
  const frameOpts = still => ({ sel: GS && GS.sel, selB: GS && GS.selB, ghost: GS && GS.placing ? ghostInfo() : null, box: GS && GS.box, marks: GS && GS.marks, speed: opt.speed, still });

  /* ---------- the loop: fixed 15 Hz steps, a frame for every animation frame, stopped in menus and in the pause ---------- */
  let rekick = false;
  function kick() { if (raf === -1) { rekick = true; return; } if (!raf && current === 'zr' && GS && GS.view === 'play' && S) { lastT = now(); raf = requestAnimationFrame(loop); } }
  let pollT = 0;
  function pollResume() { clearTimeout(pollT); pollT = setTimeout(() => { if (current !== 'zr' || !GS || GS.view !== 'play') return; if (modalUp() || document.hidden) { pollResume(); return; } kick(); }, 250); }
  function loop(ts) { raf = -1; rekick = false; try { loopBody(ts); } finally { if (raf === -1) { raf = 0; if (rekick && current === 'zr') raf = requestAnimationFrame(loop); } rekick = false; } }
  function loopBody(ts) {
    if (current !== 'zr' || !GS || GS.view !== 'play' || !S) return;
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(120, Math.max(0, ts - lastT)); lastT = ts;
    const paused = modalUp() || GS.manual;
    if (!paused) {
      acc += dt * (window.__zrSpeed || opt.speed); let n = 0;
      while (acc >= STEP && n < 4) { acc -= STEP; n++; stepGame(); if (!GS || GS.view !== 'play') return; }
      if (n >= 4) acc = 0;
      perfWatch(dt);
    } else acc = 0;
    for (const m of GS.marks) m.t += dt / 1000; while (GS.marks.length && GS.marks[0].t > .8) GS.marks.shift();
    RD.frame(S, Math.min(1, acc / STEP), frameOpts(paused));
    hud(); miniTick();
    if (paused && !GS.manual) { pollResume(); return; }
    if (GS.manual) return;
    if (GS.resultsUp) return;
    raf = requestAnimationFrame(loop);
  }
  let pwT = 0, pwN = 0;
  function perfWatch(dt) { pwT += dt; pwN++; if (pwN < 50) return; const avg = pwT / pwN; pwT = 0; pwN = 0; if (avg > 18.6 && quality < 4 && !window.__zrDpr) { quality++; RD.setQuality(quality); fit(); } }

  /* ---------- one simulation step ---------- */
  function stepGame() {
    if (S.res) { if (!GS.endAt) GS.endAt = now() + 2200; if (now() >= GS.endAt && !GS.resultsUp) finish(); return; }
    Core.step(S);
    for (const e of S.ev) { RD.event(e, S); feedback(e); }
    if (GS.sel.size) for (const id of GS.sel) { const u = S.E[id]; if (!u || u.dead) GS.sel.delete(id); }
    if (GS.selB && !S.E[GS.selB]) { GS.selB = 0; GS.rally = false; }
    for (const g of GS.groups) for (let i = g.length - 1; i >= 0; i--) if (!S.E[g[i]]) g.splice(i, 1);
    if (S.t % (20 * TPS) === 0) saveGame();
    const P = H(); if (P && P.low !== GS.low) { GS.low = P.low; if (P.low) { toast('Te weinig energie! Bouw een energiecentrale.', 'bad'); sfx('zrAlarm'); } }
    if (S.res && !GS.endAt) GS.endAt = now() + 2200;
  }
  function feedback(e) {
    const h = S.human, mine = e.o === h;
    switch (e.t) {
      case 'fire': if (!RD.visAt(e.x, e.y)) return; sfx(e.wt === 'kogel' ? (e.inf ? 'zrGunS' : 'zrGun') : e.wt === 'kanon' ? 'zrCannon' : e.wt === 'raket' ? 'zrRocket' : 'zrArty', e.x, e.y); return;
      case 'imp': if (RD.visAt(e.x, e.y)) sfx(e.wt === 'granaat' ? 'zrBoom' : 'zrHit', e.x, e.y); return;
      case 'beam': if (RD.visAt(e.x, e.y)) sfx('zrBeam', e.x, e.y); return;
      case 'zap': if (RD.visAt(e.pts[0].x, e.pts[0].y)) sfx('zrZap', e.pts[0].x, e.pts[0].y); return;
      case 'die':
        if (e.by === h && !mine) stats.kills++;
        if (RD.visAt(e.x, e.y) || mine) sfx(e.inf ? 'zrPoof' : 'zrBoom', e.x, e.y);
        if (mine && UT[e.u].harv && e.by !== -1) toast('Oogster verloren!', 'bad');
        return;
      case 'bdie': sfx('zrBoomBig', e.x, e.y); if (mine) { toast(`${BT[e.b].nm} verloren!`, 'bad'); vib(40); } else if (e.by === h) { toast(`Vijandelijke ${BT[e.b].nm.toLowerCase()} vernietigd!`, 'good'); stats.kills++; } return;
      case 'bready': if (mine) { toast('Bouw voltooid', 'good'); sfx('zrDone'); vib(15); renderBuild(true); } return;
      case 'uready': if (mine) { if (now() - (GS.lastReady || 0) > 2500) { toast('Eenheid klaar', 'good'); GS.lastReady = now(); } sfx('zrReady'); } return;
      case 'placed': if (mine) { sfx('zrBuild', e.x, e.y); stats.built++; if (e.b === 'raff') toast('Raffinaderij klaar, oogster onderweg', 'good'); } return;
      case 'attacked': if (mine) { toast(e.harv ? 'Onze oogster wordt aangevallen!' : 'Onze basis wordt aangevallen!', 'bad'); sfx('zrAlarm'); vib(30); GS.ping = { x: e.x, y: e.y, t: now() }; } return;
      case 'full': if (mine) { toast('Kristalopslag vol: bouw een opslagsilo', 'info'); } return;
      case 'unload': if (mine) sfx('zrCash', e.x, e.y); return;
      case 'krhunt': if (mine) { toast('Zandkruiper gesignaleerd! Rijd naar de rotsen!', 'bad'); sfx('zrKruip'); GS.ping = { x: e.x, y: e.y, t: now() }; } return;
      case 'krrise': if (RD.visAt(e.x, e.y)) sfx('zrKruip', e.x, e.y); return;
      case 'swallow': sfx('zrGulp', e.x, e.y); if (mine) { toast(`De zandkruiper heeft een ${UT[e.u].nm.toLowerCase()} opgeslokt!`, 'bad'); stats.swallowed++; vib(50); } return;
      case 'krflee': if (e.o === h) { toast('De zandkruiper duikt weg!', 'good'); stats.flee++; saveStats(); } return;
      case 'sold': if (mine) sfx('zrSell'); return;
      case 'out': if (e.o !== h) toast(`${FAC(S.P[e.o].fac).nm} is verslagen!`, 'good'); return;
    }
  }

  /* ---------- toasts (the "voice" of the base) ---------- */
  const toastBox = $('#zrToasts'), lastToast = {};
  function toast(t, cls = '') {
    if (lastToast[t] && now() - lastToast[t] < 4000) return; lastToast[t] = now();
    const el = document.createElement('div'); el.className = 'zr-t ' + cls; el.textContent = t; toastBox.appendChild(el);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => el.remove(), 2800);
  }

  /* ---------- HUD (HTML, only touched when a value changes) ---------- */
  const E = { cry: $('#zrCry'), pow: $('#zrPow'), obj: $('#zrObj'), info: $('#zrInfo'), cmd: $('#zrCmd'), place: $('#zrPlaceTxt'), placeOk: $('#zrPlaceOk'), sell: $('#zrSell'), rep: $('#zrRep'), box: $('#zrBox') };
  let hudK = '', objK = '', selK = '', buildT = 0;
  function hud() {
    const P = H(); if (!P) return;
    const k = Math.floor(P.cry) + '|' + P.cap + '|' + P.pw + '|' + P.pu;
    if (k !== hudK) {
      hudK = k; E.cry.querySelector('b').innerHTML = Math.floor(P.cry) + `<small>/${P.cap}</small>`; E.cry.classList.toggle('full', P.cry >= P.cap - 1);
      E.pow.querySelector('b').textContent = P.pu + ' / ' + P.pw; E.pow.classList.toggle('low', P.low);
      E.pow.querySelector('em').style.setProperty('--p', P.pu ? Math.min(100, Math.round(P.pu / Math.max(1, P.pw) * 100)) : 0);
    }
    if (S.obj && S.t % 8 === 0) {
      const ok = objText(); if (ok !== objK) { objK = ok; E.obj.innerHTML = ok; E.obj.classList.toggle('on', !!ok); const r = E.obj.getBoundingClientRect(); scr.style.setProperty('--toastY', ok ? Math.max(56, r.bottom - stageEl.getBoundingClientRect().top + 8) + 'px' : '56px'); }
    } else if (!S.obj && objK !== '-') { objK = '-'; E.obj.classList.remove('on'); scr.style.setProperty('--toastY', '56px'); }
    const sk = selKey(); if (sk !== selK) { selK = sk; renderSel(); placeInfo(); }
    updInfo();
    if (now() - buildT > 160) { buildT = now(); renderBuild(); }
    scr.classList.toggle('radar', radarOn());
  }
  const radarOn = () => { const P = H(); return !!(P && P.bc.radar && !P.low); };
  function objText() {
    const P = H(); return S.obj.filter(o => o.t !== 'protect' || o.fail).map(o => {
      let t = OBJ_TXT(o);
      if (o.t === 'collect') t += ` (${Math.min(o.n, Math.floor(P.st.harv))})`;
      if (o.t === 'survive') { const left = Math.max(0, o.min * 60 - S.t / TPS); t += ` (${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')})`; }
      if (o.t === 'army') t += ` (${Math.min(o.n, S.U.filter(u => u.o === S.human && UT[u.t].wt).length)})`;
      return o.done ? `<s>✓ ${esc(t)}</s>` : '🎯 ' + esc(t);
    }).join('<br>');
  }
  const selKey = () => GS.selB ? 'b' + GS.selB + ':' + (S.E[GS.selB] ? Math.round(S.E[GS.selB].hp / S.E[GS.selB].mhp * 20) + ':' + S.E[GS.selB].rep : '') + GS.sellSure : 'u' + [...GS.sel].join(',') + '|' + GS.groups.map(g => g.length).join(',');
  function renderSel() {
    const hasU = GS.sel.size > 0, b = GS.selB ? S.E[GS.selB] : null;
    E.cmd.classList.toggle('hasU', hasU); E.cmd.classList.toggle('hasB', !!b); E.cmd.classList.toggle('hasS', hasU || !!b);
    E.cmd.classList.toggle('noRally', !b || !(b.t === 'kaz' || b.t === 'fab'));
    E.sell.classList.toggle('sure', !!GS.sellSure); E.sell.querySelector('small').textContent = GS.sellSure ? 'Zeker?' : 'Verkoop';
    E.rep.classList.toggle('on', !!(b && b.rep));
    document.querySelectorAll('#zrCmd .zr-g').forEach((el, i) => { const em = el.querySelector('em'), n = GS.groups[i].length; em.textContent = n; em.classList.toggle('on', n > 0); });
  }

  /* ---------- the info card: what is this, what does it do, how is it doing ---------- */
  const SPD_NM = s => s >= 2.6 ? 'snel' : s >= 1.5 ? 'gemiddeld' : 'traag';
  const ARMOUR_NM = { inf: 'geen pantser', licht: 'licht pantser', zwaar: 'zwaar pantser' };
  const HS_NM = { seek: 'Zoekt kristal', go: 'Rijdt naar kristal', mine: 'Oogst kristal', ret: 'Naar de raffinaderij', toraf: 'Naar de raffinaderij', qwait: 'Wacht bij de raffinaderij', unload: 'Lost kristal', noraf: 'Geen raffinaderij! Bouw er een.', none: 'Geen kristal meer in de buurt' };
  const facOk = (t, fid) => !UT[t] || !UT[t].fac || UT[t].fac === fid;
  const names = ts => ts.map(t => (BT[t] || UT[t]).nm).join(', ');
  function strongVs(wt) { const m = MULT[wt]; let best = Object.keys(ARM_NM).filter(a => m[a] >= 1); if (!best.length) { const mx = Math.max(...Object.values(m)); best = Object.keys(m).filter(a => m[a] === mx); } return best.map(a => ARM_NM[a]).join(' en '); }
  function makesOf(t, fid) { const cat = t === 'kaz' ? 'inf' : t === 'fab' ? 'veh' : null; return cat ? Object.keys(UT).filter(u => UT[u].cat === cat && facOk(u, fid) && (TIER[u] || 1) <= S.tier) : []; }
  function unlocksOf(t, fid) { const mk = makesOf(t, fid); return [...Object.keys(BT), ...Object.keys(UT)].filter(x => x !== t && !mk.includes(x) && ((BT[x] || UT[x]).req || []).includes(t) && facOk(x, fid) && (TIER[x] || 1) <= S.tier); }
  function factsOf(t, fid, type) {
    const T = BT[t] || UT[t], f = [];
    if (type) { f.push(`💎 ${T.cost}`); if (T.bt) f.push(`⏱ ${T.bt} s`); }
    if (BT[t]) {
      if (T.pw > 0) f.push(`⚡ +${T.pw} energie`); else if (T.pw < 0) f.push(`⚡ −${-T.pw} energie`);
      if (T.cap) f.push(`📦 ${T.cap} opslag`);
      if (T.wt) f.push(`🎯 ${WNAME[T.wt]}, sterk tegen ${strongVs(T.wt)}`);
    } else {
      if (T.wt) f.push(`🎯 ${WNAME[T.wt]}, sterk tegen ${strongVs(T.wt)}`);
      if (T.harv) f.push(`💎 laadt ${T.harv}`);
      f.push(`🛡 ${ARMOUR_NM[T.arm]}`, `🏃 ${SPD_NM(T.spd)}`);
      if (T.regen) f.push('✚ herstelt zich');
    }
    return f;
  }
  function infoTarget() {
    if (!GS || !S) return null;
    if (GS.infoT) return { k: 'type', t: GS.infoT };
    if (GS.selB && S.E[GS.selB]) return { k: 'b', e: S.E[GS.selB] };
    if (GS.sel.size === 1) { const u = S.E[[...GS.sel][0]]; if (u) return { k: 'u', e: u }; }
    if (GS.sel.size > 1) return { k: 'multi' };
    if (GS.info === -1 && S.kr && S.kr.st !== 'gone') return { k: 'kr' };
    if (GS.info > 0) { const e = S.E[GS.info]; if (e && !e.dead && (e.k === 'b' ? S.exp[Core.tileOf(S, e.x, e.y)] : RD.visAt(e.x, e.y))) return { k: e.k, e }; }
    return null;
  }
  const iconKr = (() => { let c = null; return () => { if (c) return c; const k = Art.mk(96, 96), g = k.getContext('2d'), gr = g.createRadialGradient(40, 40, 6, 48, 52, 44); gr.addColorStop(0, '#f6d898'); gr.addColorStop(1, '#a8743a'); g.fillStyle = gr; g.beginPath(); g.ellipse(48, 54, 40, 26, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(110,70,30,.6)'; g.lineWidth = 3; for (const r of [14, 24, 34]) { g.beginPath(); g.ellipse(48, 54, r, r * .62, 0, 3.6, 5.8); g.stroke(); } g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(48, 46, 9, 6, 0, 0, 7); g.fill(); return (c = k.toDataURL()); }; })();
  function infoKey(I) {
    if (!I) return '';
    const P = H(), lvl = x => Math.round(x * 20);
    if (I.k === 'type') return 't' + I.t + Core.techOk(S, S.human, I.t) + opt.infoMin;
    if (I.k === 'kr') return 'kr' + opt.infoMin;
    if (I.k === 'multi') { let hp = 0, mh = 0; for (const id of GS.sel) { const u = S.E[id]; if (u) { hp += u.hp; mh += u.mhp || UT[u.t].hp; } } return 'm' + [...GS.sel].join(',') + ':' + lvl(hp / Math.max(1, mh)) + opt.infoMin; }
    const e = I.e, mh = e.mhp || UT[e.t].hp; let k = I.k + e.id + ':' + Math.round(e.hp / mh * 50) + ':' + opt.infoMin;
    if (e.o === S.human) {
      if (I.k === 'b') { const q = e.t === 'kaz' ? P.q.i : e.t === 'fab' ? P.q.v : e.t === 'bouw' ? P.q.b : null; k += ':' + lvl(e.bp) + e.rep + P.low + P.ready + (q && q[0] ? q[0].t + lvl(q[0].p) + q.length : ''); }
      else k += ':' + (e.hs || '') + Math.round((e.car || 0) / 25);
    }
    return k;
  }
  function renderInfo(I) {
    const el = E.info;
    if (!I) { el.classList.remove('on'); el.innerHTML = ''; return; }
    const P = H(), mine = !I.e || I.e.o === S.human, fac = I.e ? S.P[I.e.o].fac : P.fac, fid = FAC(fac).id;
    let icon, nm, desc, facts = [], stat = [], hp = null, tag = '', chips = '';
    if (I.k === 'kr') { icon = iconKr(); nm = 'Zandkruiper'; desc = INFO.kruiper; tag = '<span class="zr-itag bad">Gevaar</span>'; }
    else if (I.k === 'multi') {
      const c = {}; let h2 = 0, m2 = 0; for (const id of GS.sel) { const u = S.E[id]; if (!u) continue; c[u.t] = (c[u.t] || 0) + 1; h2 += u.hp; m2 += u.mhp || UT[u.t].hp; }
      icon = iconFor(Object.keys(c)[0] || 'sol'); nm = `${GS.sel.size} eenheden`; hp = h2 / Math.max(1, m2);
      chips = Object.entries(c).map(([t, n]) => `<button class="zr-ichip" data-t="${t}"><img src="${iconFor(t)}" alt="">${n}× ${esc(UT[t].nm)}</button>`).join('');
      desc = 'Tik op een soort om alleen die te kiezen.';
    } else {
      const t = I.k === 'type' ? I.t : I.e.t, T = BT[t] || UT[t];
      icon = iconFor(t, fac); nm = T.nm; desc = INFO[t] || T.tip || ''; facts = factsOf(t, fid, I.k === 'type');
      if (BT[t]) { const mk = makesOf(t, fid), un = unlocksOf(t, fid); if (mk.length) stat.push('<span class="zr-imk">Maakt: ' + esc(names(mk)) + '</span>'); if (un.length) stat.push('<span class="zr-imk">Nodig voor: ' + esc(names(un)) + '</span>'); }
      if (I.k === 'type') { const r = Core.techOk(S, S.human, t) ? '' : reqText(t); if (r) stat.unshift(`<span class="zr-iwarn">🔒 ${esc(r)}</span>`); }
      else {
        const e = I.e; hp = e.hp / (e.mhp || T.hp);
        if (!mine) tag = `<span class="zr-itag" style="--fc:${FAC(fac).col}">Vijand · ${esc(FAC(fac).nm)}</span>`;
        else if (I.k === 'b') {
          if (e.bp < 1) stat.unshift(`<span>🏗️ Wordt gebouwd: ${Math.round(e.bp * 100)}%</span>`);
          if (e.rep) stat.unshift('<span class="zr-igood">🔧 Wordt gerepareerd</span>');
          if (P.low && T.pw < 0) stat.unshift(`<span class="zr-iwarn">⚠ Te weinig energie: ${T.wt ? 'schiet niet' : t === 'radar' ? 'radar uit' : 'werkt langzaam'}</span>`);
          if (e.sl) facts.push('🧱 op beton');
          const q = t === 'kaz' ? P.q.i : t === 'fab' ? P.q.v : t === 'bouw' ? P.q.b : null;
          if (t === 'bouw' && P.ready) stat.unshift(`<span class="zr-igood">✓ ${esc(BT[P.ready].nm)} is klaar: tik hem aan in de bouwbalk om te plaatsen</span>`);
          else if (q && q[0]) stat.unshift(`<span>${t === 'kaz' ? 'Traint' : 'Bouwt'}: ${esc((BT[q[0].t] || UT[q[0].t]).nm)} ${Math.round(q[0].p * 100)}%${q.length > 1 ? ` (+${q.length - 1})` : ''}</span>`);
        } else if (T.harv) { stat.unshift(`<span>${esc(HS_NM[e.hs] || 'Wacht')} · lading ${Math.floor(e.car || 0)}/${T.harv}</span>`); }
      }
    }
    const hpCls = hp == null ? '' : hp > .6 ? 'ok' : hp > .3 ? 'mid' : 'low';
    el.innerHTML = `<img class="zr-iimg" src="${icon}" alt=""><div class="zr-ibody"><div class="zr-ihead"><b>${esc(nm)}</b><button class="zr-imin" aria-label="${opt.infoMin ? 'Meer uitleg' : 'Minder uitleg'}">${opt.infoMin ? '▸' : '▾'}</button>${I.k === 'type' || (!mine && I.k !== 'multi') || I.k === 'kr' ? '<button class="zr-iclose" aria-label="Sluiten">✕</button>' : ''}</div>${tag}`
      + (hp != null ? `<div class="zr-ihp ${hpCls}"><i style="width:${Math.max(2, Math.round(hp * 100))}%"></i><span>${Math.round(hp * 100)}%</span></div>` : '')
      + (opt.infoMin ? '' : `<p class="zr-idesc">${esc(desc)}</p>` + (facts.length ? `<div class="zr-ifacts">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : '') + (chips ? `<div class="zr-ichips">${chips}</div>` : ''))
      + (stat.length ? `<div class="zr-istat">${(opt.infoMin ? stat.slice(0, 1) : stat).join('')}</div>` : '') + '</div>';
    el.classList.add('on'); el.classList.toggle('min', !!opt.infoMin); placeInfo();
  }
  // keep the card just above the command buttons (they wrap to two rows on narrow screens)
  function placeInfo() { if (!E.info.classList.contains('on')) return; const st = stageEl.getBoundingClientRect(), c = E.cmd.getBoundingClientRect(); E.info.style.bottom = Math.round(c.height > 0 ? st.bottom - c.top + 6 : 8) + 'px'; }
  let infoK = '';
  function updInfo(force) {
    if (GS && GS.infoT && GS.infoTU && now() > GS.infoTU) { GS.infoT = null; GS.infoTU = 0; } const I = GS && GS.placing ? null : infoTarget(), k = infoKey(I); if (force || k !== infoK) { infoK = k; renderInfo(I); } }
  const clearInfo = () => { if (GS) { GS.info = 0; GS.infoT = null; } };

  /* ---------- the build bar ---------- */
  const buildEl = $('#zrBuild'), tabsEl = $('#zrTabs'), icons = {}, bldIcons = {};
  function iconFor(t, fac) {
    const f = fac ?? H().fac, key = f + t; if (icons[key]) return icons[key];
    const c = BT[t] ? Art.buildingIcon(RD.blds[f] || bldIcons[f] || (bldIcons[f] = Art.buildings(f)), t, 96) : Art.unitIcon(f, t, 96);
    return (icons[key] = c.toDataURL());
  }
  // soft hyphens so long names break nicely on two lines in the narrow build buttons
  const SHY = ['Energie|centrale', 'Raffina|derij', 'Opslag|silo', 'Beton|plaat', 'Voertuig|fabriek', 'Verdedigings|toren', 'Reparatie|plaats', 'Raket|paal', 'Raket|soldaat', 'Raket|werper', 'Zonne|straler', 'Bliksem|wagen', 'Verken|ner'];
  const shy = nm => { let h = esc(nm); for (const w of SHY) h = h.replace(w.replace('|', ''), w.replace('|', '&shy;')); return h; };
  const listFor = tab => (tab === 'b' ? BUILD_LIST : tab === 'i' ? INF_LIST : VEH_LIST).filter(t => (TIER[t] || 1) <= S.tier && (!UT[t] || !UT[t].fac || UT[t].fac === FAC(H().fac).id));
  let buildKey = '';
  function renderBuild(force) {
    const P = H(); if (!P) return;
    const tab = GS.tab, list = listFor(tab), q = P.q[tab];
    const k = tab + '|' + list.map(t => t + (Core.techOk(S, S.human, t) ? 1 : 0)).join(',') + '|' + P.ready + '|' + S.tier + '|' + P.fac;
    if (force || k !== buildKey) {
      buildKey = k;
      buildEl.innerHTML = list.map(t => { const T = BT[t] || UT[t]; return `<button class="zr-bi" data-t="${t}"><img src="${iconFor(t)}" alt=""><i class="zr-prog"></i><b>${shy(T.nm)}</b><small>${T.cost}</small><em></em></button>`; }).join('');
    }
    for (const el of buildEl.children) {
      const t = el.dataset.t, ok = Core.techOk(S, S.human, t), n = q.filter(x => x.t === t).length, head = q[0] && q[0].t === t ? q[0] : null;
      el.classList.toggle('lock', !ok); el.classList.toggle('ready', P.ready === t);
      el.classList.toggle('busy', !!head); el.classList.toggle('hold', !!(head && head.hold));
      if (head) el.querySelector('.zr-prog').style.setProperty('--p', Math.round(head.p * 100));
      const em = el.querySelector('em'); em.textContent = n; em.classList.toggle('on', n > (head ? 1 : 0) || (n && !head));
      const sm = el.querySelector('small'), want = P.ready === t ? 'Plaats!' : head && head.hold === 2 ? 'kristal…' : head && head.hold === 1 ? 'geen fabriek' : String((BT[t] || UT[t]).cost);
      if (sm.textContent !== want) sm.textContent = want;
    }
    tabsEl.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); const em = b.querySelector('em'), c = b.dataset.tab, busy = P.q[c].length, rd = c === 'b' && P.ready; em.textContent = rd ? '!' : busy || ''; em.classList.toggle('on', !!(rd || busy)); });
  }
  tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b || !GS) return; GS.tab = b.dataset.tab; sfx('zrClick'); renderBuild(true); });
  const reqText = t => { const T = BT[t] || UT[t], P = H(); if ((TIER[t] || 1) > S.tier) return 'nog niet in deze missie'; const miss = (T.req || []).filter(r => !P.bc[r]).map(r => BT[r].nm.toLowerCase()); return miss.length ? 'Nodig: ' + miss.join(' en ') : ''; };
  let bpT = 0, bpEl = null, bpLong = false;
  buildEl.addEventListener('pointerdown', e => { const b = e.target.closest('.zr-bi'); if (!b) return; bpEl = b; bpLong = false; clearTimeout(bpT); bpT = setTimeout(() => { bpLong = true; holdItem(b.dataset.t); }, 550); Sfx.play('__warm'); });
  const bpUp = () => { clearTimeout(bpT); };
  buildEl.addEventListener('pointerup', bpUp); buildEl.addEventListener('pointercancel', bpUp); buildEl.addEventListener('pointerleave', bpUp);
  buildEl.addEventListener('scroll', () => clearTimeout(bpT), { passive: true });
  buildEl.addEventListener('click', e => { const b = e.target.closest('.zr-bi'); if (!b || !S || bpLong) return; buildTap(b.dataset.t); });
  // hold a button: cancel what is queued, otherwise explain what it is
  function holdItem(t) {
    const P = H(), cat = Core.catOf(t);
    if ((cat === 'b' && P.ready === t) || P.q[cat].some(x => x.t === t)) { cancelItem(t); return; }
    GS.infoT = t; GS.infoTU = 0; GS.seenT[t] = 1; updInfo(true); sfx('zrClick'); vib(10);
  }
  function buildTap(t) {
    const P = H();
    if (!GS.seenT[t]) { GS.seenT[t] = 1; GS.infoT = t; GS.infoTU = now() + 7000; }
    if (!Core.techOk(S, S.human, t)) { GS.infoT = t; GS.infoTU = 0; updInfo(true); sfx('zrNo'); toast(reqText(t) || 'Nog niet beschikbaar', 'info'); return; }
    if (BT[t]) {
      if (P.ready === t) { startPlacing(t); return; }
      if (P.ready) { sfx('zrNo'); toast(`Plaats eerst de ${BT[P.ready].nm.toLowerCase()}`, 'info'); GS.tab = 'b'; renderBuild(true); return; }
    }
    if (!Core.cmd(S, S.human, { c: 'build', t })) { sfx('zrNo'); toast(Core.unitCount(S, S.human) >= UNIT_CAP - 1 ? `Maximaal ${UNIT_CAP} eenheden` : 'Wachtrij vol', 'info'); return; }
    sfx('zrClick'); renderBuild();
  }
  function cancelItem(t) {
    const P = H(), cat = Core.catOf(t);
    if (cat === 'b' && P.ready === t) { if (GS.placing) stopPlacing(); Core.cmd(S, S.human, { c: 'cancel', cat, ready: 1 }); }
    else { const q = P.q[cat]; let k = -1; for (let i = q.length - 1; i >= 0; i--) if (q[i].t === t) { k = i; break; } if (k < 0) return; Core.cmd(S, S.human, { c: 'cancel', cat, i: k }); }
    sfx('zrSell'); toast('Geannuleerd', 'info'); renderBuild(true);
  }

  /* ---------- placing a building: ghost (green / red) and a confirm button ---------- */
  function startPlacing(t) {
    const P = H(), T = BT[t], v = RD.view();
    let s = Core.findSpot(S, S.human, t, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, false) || Core.findSpot(S, S.human, t, P.base.x, P.base.y, false);
    if (!s) { const b = S.B.find(b => b.o === S.human) || P.base; s = { x: Math.round((b.x || P.base.x)), y: Math.round((b.y || P.base.y) + 3) }; }
    GS.placing = t; GS.ghost = { x: s.x, y: s.y }; GS.sel.clear(); GS.selB = 0; clearInfo();
    const c = { x: s.x + T.w / 2, y: s.y + T.h / 2 }; if (c.x < v.x0 + 1 || c.x > v.x1 - 1 || c.y < v.y0 + 1 || c.y > v.y1 - 1) RD.center(c.x, c.y);
    scr.classList.add('placing'); E.place.textContent = T.nm; updGhost(); sfx('zrClick');
  }
  function stopPlacing() { GS.placing = null; scr.classList.remove('placing'); }
  function ghostInfo() { const pt = Core.placeTiles(S, S.human, GS.placing, GS.ghost.x, GS.ghost.y); return { t: GS.placing, x: GS.ghost.x, y: GS.ghost.y, tiles: pt.tiles, ok: pt.ok, near: pt.near }; }
  function updGhost() { const g = ghostInfo(); E.placeOk.classList.toggle('no', !g.ok); }
  function moveGhost(w) { const T = BT[GS.placing]; GS.ghost.x = Math.round(w.x - T.w / 2); GS.ghost.y = Math.round(w.y - T.h / 2); updGhost(); }
  $('#zrPlaceOk').addEventListener('click', () => {
    if (!GS || !GS.placing) return; const g = ghostInfo();
    if (!g.ok) { sfx('zrNo'); toast(!g.near ? 'Te ver van je basis' : 'Alleen op vrije rots bouwen', 'info'); return; }
    if (Core.cmd(S, S.human, { c: 'place', x: g.x, y: g.y })) { stopPlacing(); renderBuild(true); vib(20); }
  });
  $('#zrPlaceNo').addEventListener('click', () => { if (GS && GS.placing) { stopPlacing(); sfx('zrClick'); } });

  /* ---------- touch on the map: tap, double tap, one-finger pan, two-finger pan + pinch, selection box ---------- */
  const ptrs = new Map(); let gest = null, lastTap = null;
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    if (!GS || GS.view !== 'play' || !S) return; e.preventDefault(); Sfx.play('__warm');
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const p = local(e); ptrs.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: now(), moved: false });
    if (ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()]; for (const q of ptrs.values()) q.moved = true;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; gest = { k: 'pinch', d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), z0: RD.cam.z, w: RD.toWorld(mx, my) }; GS.box = null; return;
    }
    if (GS.placing) { const w = RD.toWorld(p.x, p.y), T = BT[GS.placing]; if (w.x >= GS.ghost.x - .5 && w.x <= GS.ghost.x + T.w + .5 && w.y >= GS.ghost.y - .5 && w.y <= GS.ghost.y + T.h + .5) { gest = { k: 'ghost', dx: w.x - GS.ghost.x - T.w / 2, dy: w.y - GS.ghost.y - T.h / 2 }; return; } }
    if (GS.boxMode) { gest = { k: 'box' }; GS.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; return; }
    gest = { k: 'pan', cx: RD.cam.x, cy: RD.cam.y, sx: p.x, sy: p.y };
  });
  cv.addEventListener('pointermove', e => {
    const q = ptrs.get(e.pointerId); if (!q || !gest) return; const p = local(e); q.x = p.x; q.y = p.y;
    if (!q.moved && Math.hypot(p.x - q.x0, p.y - q.y0) > 9) q.moved = true;
    if (gest.k === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), [mn, mx] = RD.zoomLimits();
      RD.cam.z = Math.max(mn, Math.min(mx, gest.z0 * d / gest.d0)); const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      RD.cam.x = gest.w.x - cx / RD.cam.z; RD.cam.y = gest.w.y - cy / RD.cam.z; RD.clamp(); if (!raf) drawStill(); return;
    }
    if (!q.moved) return;
    if (gest.k === 'pan') { RD.cam.x = gest.cx - (p.x - gest.sx) / RD.cam.z; RD.cam.y = gest.cy - (p.y - gest.sy) / RD.cam.z; RD.clamp(); if (!raf) drawStill(); }
    else if (gest.k === 'box') { GS.box.x1 = p.x; GS.box.y1 = p.y; }
    else if (gest.k === 'ghost') { const w = RD.toWorld(p.x, p.y); moveGhost({ x: w.x - gest.dx, y: w.y - gest.dy }); if (!raf) drawStill(); }
  });
  const ptrEnd = e => {
    const q = ptrs.get(e.pointerId); if (!q) return; ptrs.delete(e.pointerId);
    if (!gest) return;
    if (gest.k === 'pinch') { if (ptrs.size === 1) { const r = [...ptrs.values()][0]; r.moved = true; gest = { k: 'pan', cx: RD.cam.x, cy: RD.cam.y, sx: r.x, sy: r.y }; } else if (!ptrs.size) gest = null; return; }
    if (ptrs.size) return;
    if (gest.k === 'box') { if (q.moved) finishBox(); else { GS.box = null; tap(q.x, q.y); } GS.boxMode = false; E.box.classList.remove('on'); GS.box = null; }
    else if (gest.k === 'ghost') { if (!q.moved) tap(q.x, q.y); }
    else if (!q.moved && e.type === 'pointerup') tap(q.x, q.y);
    gest = null;
  };
  cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', e => { if (!GS || GS.view !== 'play') return; e.preventDefault(); const p = local(e), w = RD.toWorld(p.x, p.y), [mn, mx] = RD.zoomLimits(); RD.cam.z = Math.max(mn, Math.min(mx, RD.cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); RD.cam.x = w.x - p.x / RD.cam.z; RD.cam.y = w.y - p.y / RD.cam.z; RD.clamp(); if (!raf) drawStill(); }, { passive: false });
  // what is under a tap?
  function pick(sx, sy) {
    const w = RD.toWorld(sx, sy), h = S.human, z = RD.cam.z; let best = null, bd = 1e9;
    for (const u of S.U) {
      if (u.o !== h && !RD.visAt(u.x, u.y)) continue;
      const d = Math.hypot(u.x - w.x, u.y - w.y) * z, lim = Math.max(22, UT[u.t].r * z * 1.35);
      if (d < lim && d < bd) { bd = d; best = u; }
    }
    if (best) return best;
    for (const b of S.B) if (w.x >= b.x && w.x < b.x + b.w && w.y >= b.y && w.y < b.y + b.h && (b.o === h || S.exp[Core.tileOf(S, w.x, w.y)])) return b;
    const K = S.kr; if (K && K.st !== 'gone' && RD.visAt(K.x, K.y) && Math.hypot(K.x - w.x, K.y - w.y) < 1.4) return K;
    return null;
  }
  function tap(sx, sy) {
    const w = RD.toWorld(sx, sy), h = S.human;
    if (GS.placing) { moveGhost(w); sfx('zrClick'); return; }
    if (GS.rally) { const b = S.E[GS.selB]; GS.rally = false; if (b) { Core.cmd(S, h, { c: 'rally', b: b.id, x: w.x, y: w.y }); toast('Verzamelpunt gezet', 'good'); mark(w, false); sfx('zrAck'); } return; }
    GS.sellSure = 0; GS.infoT = null;
    const e = pick(sx, sy), t = now();
    if (!(e && !GS.sel.size && (e === S.kr || (e.k && e.o !== h)))) GS.info = 0;
    if (e && e.k === 'u' && e.o === h) {
      if (GS.selB) GS.selB = 0;
      if (lastTap && lastTap.id === e.id && t - lastTap.t < 380) { selectType(e); lastTap = null; return; }
      lastTap = { id: e.id, t };
      if (GS.sel.has(e.id)) GS.sel.delete(e.id); else GS.sel.add(e.id);
      sfx('zrSel'); return;
    }
    lastTap = null;
    const ids = [...GS.sel];
    if (e && e.k === 'b' && e.o === h) {
      if (ids.length && e.t === 'rep' && ids.some(id => UT[S.E[id].t].cat === 'veh')) { Core.cmd(S, h, { c: 'repair', ids, b: e.id }); mark(Core.dockOf(e), false); sfx('zrAck'); toast('Naar de reparatieplaats', 'info'); return; }
      if (ids.length && e.t === 'raff' && ids.some(id => UT[S.E[id].t].harv)) { Core.cmd(S, h, { c: 'unload', ids, b: e.id }); mark(Core.dockOf(e), false); sfx('zrAck'); return; }
      GS.sel.clear(); GS.selB = e.id; sfx('zrSel'); return;
    }
    if (e && (e === S.kr || e.o !== h) && ids.length) {
      Core.cmd(S, h, { c: 'attack', ids, tg: e === S.kr ? -1 : e.id }); mark(e === S.kr ? e : Core.center(e), true); sfx('zrAck2'); return;
    }
    if (e && e.k && e.o !== h && !ids.length) { GS.info = GS.info === e.id ? 0 : e.id; GS.selB = 0; sfx('zrSel'); return; }
    if (e === S.kr && e) { GS.info = GS.info === -1 ? 0 : -1; GS.selB = 0; sfx('zrSel'); return; }
    if (ids.length) { Core.cmd(S, h, { c: 'move', ids, x: w.x, y: w.y }); mark(w, false); sfx('zrAck'); return; }
    if (GS.selB) { GS.selB = 0; }
  }
  function mark(p, atk) { GS.marks.push({ x: p.x, y: p.y, t: 0, atk }); }
  function selectType(u) {
    const v = RD.view(); GS.sel.clear();
    for (const x of S.U) if (x.o === S.human && x.t === u.t && x.x >= v.x0 && x.x <= v.x1 && x.y >= v.y0 && x.y <= v.y1) GS.sel.add(x.id);
    sfx('zrSel'); toast(`${GS.sel.size}× ${UT[u.t].nm}`, 'info');
  }
  function finishBox() {
    const b = GS.box, a = RD.toWorld(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1)), c = RD.toWorld(Math.max(b.x0, b.x1), Math.max(b.y0, b.y1));
    GS.sel.clear(); GS.selB = 0;
    const inBox = S.U.filter(u => u.o === S.human && u.x >= a.x && u.x <= c.x && u.y >= a.y && u.y <= c.y), army = inBox.filter(u => !UT[u.t].harv);
    for (const u of (army.length ? army : inBox)) GS.sel.add(u.id);
    if (GS.sel.size) { sfx('zrSel'); toast(`${GS.sel.size} geselecteerd`, 'info'); }
  }

  /* ---------- command buttons ---------- */
  E.box.addEventListener('click', () => { if (!GS) return; GS.boxMode = !GS.boxMode; E.box.classList.toggle('on', GS.boxMode); sfx('zrClick'); if (GS.boxMode) toast('Sleep een kader over je eenheden', 'info'); });
  $('#zrStop').addEventListener('click', () => { if (!GS || !GS.sel.size) return; Core.cmd(S, S.human, { c: 'stop', ids: [...GS.sel] }); sfx('zrAck'); });
  $('#zrDesel').addEventListener('click', () => { if (!GS) return; GS.sel.clear(); GS.selB = 0; GS.rally = false; clearInfo(); sfx('zrClick'); });
  E.info.addEventListener('click', e => {
    if (!GS || !S) return; const b = e.target.closest('button');
    if (b && b.classList.contains('zr-iclose')) { clearInfo(); sfx('zrClick'); updInfo(true); return; }
    if (b && b.classList.contains('zr-ichip')) { const t = b.dataset.t; for (const id of [...GS.sel]) if (!S.E[id] || S.E[id].t !== t) GS.sel.delete(id); sfx('zrSel'); selK = ''; updInfo(true); return; }
    if (b && b.classList.contains('zr-imin')) { opt.infoMin = !opt.infoMin; saveOpt(); sfx('zrClick'); updInfo(true); }
  });
  E.rep.addEventListener('click', () => { const b = GS && S.E[GS.selB]; if (!b) return; if (b.hp >= b.mhp) { toast('Dit gebouw is heel', 'info'); return; } Core.cmd(S, S.human, { c: 'brep', b: b.id }); sfx('zrClick'); selK = ''; });
  E.sell.addEventListener('click', () => {
    const b = GS && S.E[GS.selB]; if (!b) return;
    if (!GS.sellSure) { GS.sellSure = 1; selK = ''; sfx('zrClick'); setTimeout(() => { if (GS && GS.sellSure) { GS.sellSure = 0; selK = ''; } }, 2500); return; }
    GS.sellSure = 0; Core.cmd(S, S.human, { c: 'sell', b: b.id }); GS.selB = 0; selK = '';
  });
  $('#zrRally').addEventListener('click', () => { if (!GS || !GS.selB) return; GS.rally = true; toast('Tik waar nieuwe eenheden heen gaan', 'info'); sfx('zrClick'); });
  $('#zrAll').addEventListener('click', () => {
    if (!GS || !S) return; const h = S.human, army = S.U.filter(u => u.o === h && UT[u.t].wt);
    if (!army.length) { toast('Je hebt nog geen leger', 'info'); sfx('zrNo'); return; }
    const cx = army.reduce((a, u) => a + u.x, 0) / army.length, cy = army.reduce((a, u) => a + u.y, 0) / army.length;
    let tg = null, bd = 1e9;
    for (const b of S.B) if (b.o !== h && S.exp[b.y * S.W + b.x]) { const d = Math.hypot(b.x - cx, b.y - cy); if (d < bd) { bd = d; tg = Core.center(b); } }
    if (!tg) for (const u of S.U) if (u.o !== h && RD.visAt(u.x, u.y)) { const d = Math.hypot(u.x - cx, u.y - cy); if (d < bd) { bd = d; tg = u; } }
    if (!tg) { toast('Nog geen vijand gevonden. Verken eerst de kaart!', 'info'); sfx('zrNo'); return; }
    Core.cmd(S, h, { c: 'amove', ids: army.map(u => u.id), x: tg.x, y: tg.y }); mark(tg, true); sfx('zrAck2'); toast('Allemaal: aanvallen!', 'bad'); vib(25);
  });
  // control groups: tap = select (tap again: camera there); hold = save the current selection
  document.querySelectorAll('#zrCmd .zr-g').forEach(el => {
    let t = 0, long = false;
    el.addEventListener('pointerdown', () => { long = false; clearTimeout(t); t = setTimeout(() => { long = true; saveGroup(+el.dataset.g); }, 550); });
    const up = () => clearTimeout(t); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    el.addEventListener('click', () => { if (long || !GS) return; const g = +el.dataset.g, L = GS.groups[g];
      if (!L.length) { if (GS.sel.size) saveGroup(g); else toast('Kies eenheden en houd de knop vast om een groep te maken', 'info'); return; }
      const same = L.length === GS.sel.size && L.every(id => GS.sel.has(id));
      GS.sel = new Set(L); GS.selB = 0; sfx('zrSel');
      if (same) { const us = L.map(id => S.E[id]).filter(Boolean); if (us.length) RD.center(us.reduce((a, u) => a + u.x, 0) / us.length, us.reduce((a, u) => a + u.y, 0) / us.length); }
    });
  });
  function saveGroup(g) { if (!GS || !GS.sel.size) { toast('Kies eerst eenheden', 'info'); return; } GS.groups[g] = [...GS.sel]; toast(`Groep ${g + 1}: ${GS.sel.size} eenheden`, 'good'); sfx('zrDone'); vib(15); selK = ''; }
  // the minimap: tap or drag to move the camera
  const miniBox = $('#zrMiniBox');
  const miniGo = e => { if (!S || !radarOn()) return; const r = miniCv.getBoundingClientRect(), k = miniCv.width / r.width, w = RD.miniWorld((e.clientX - r.left) * k, (e.clientY - r.top) * k); if (!w) return; RD.center(w.x, w.y); if (!raf) drawStill(); miniTick(true); };
  let miniDrag = false;
  miniBox.addEventListener('pointerdown', e => { e.preventDefault(); miniDrag = true; try { miniBox.setPointerCapture(e.pointerId); } catch (er) {} miniGo(e); if (!radarOn()) toast('Bouw een radar voor het kaartje', 'info'); });
  miniBox.addEventListener('pointermove', e => { if (miniDrag) miniGo(e); });
  miniBox.addEventListener('pointerup', () => { miniDrag = false; }); miniBox.addEventListener('pointercancel', () => { miniDrag = false; });
  let miniT = 0;
  function miniTick(force) { if (!S) return; if (!force && now() - miniT < 250) return; miniT = now(); RD.mini(miniCv, S, radarOn(), GS && GS.sel); }
  // keyboard (desktop): space = pause, arrows pan, +/- zoom
  document.addEventListener('keydown', e => {
    if (current !== 'zr' || !GS || GS.view !== 'play' || anyModal()) return;
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') { e.preventDefault(); openPause(); return; }
    const d = 3; if (e.code === 'ArrowLeft') RD.cam.x -= d; else if (e.code === 'ArrowRight') RD.cam.x += d; else if (e.code === 'ArrowUp') RD.cam.y -= d; else if (e.code === 'ArrowDown') RD.cam.y += d;
    else if (e.key === '+' || e.key === '=') RD.cam.z = Math.min(72, RD.cam.z * 1.15); else if (e.key === '-') RD.cam.z = Math.max(RD.zoomLimits()[0], RD.cam.z / 1.15); else return;
    RD.clamp();
  });

  /* ---------- starting a match ---------- */
  function begin(cfg, meta, restored) {
    closeModals(); releaseInput();
    S = restored || Core.newGame(cfg);
    GS = { view: 'play', meta, sel: new Set(), selB: 0, info: 0, infoT: null, seenT: {}, groups: [[], [], []], tab: 'b', placing: null, ghost: null, box: null, boxMode: false, marks: [], endAt: 0, resultsUp: false, low: false, rally: false, sellSure: 0, t0: Date.now() };
    if (restored && restored._ui) { GS.groups = restored._ui.groups || GS.groups; delete restored._ui; }
    RD.setGame(S, true); hudK = objK = selK = buildKey = ''; GS.low = H().low;
    scr.classList.add('play'); scr.classList.remove('placing'); E.box.classList.remove('on');
    Sfx.track('zr', 'zr');
    fit();
    const P = H(), b = S.B.find(x => x.o === S.human && x.t === 'bouw') || S.B.find(x => x.o === S.human), u = S.U.find(x => x.o === S.human);
    RD.cam.z = 38; const c = b ? Core.center(b) : u || P.base; RD.center(c.x, c.y + (b ? 1.5 : 0));
    if (restored && meta.cam) { RD.cam.x = meta.cam.x; RD.cam.y = meta.cam.y; RD.cam.z = meta.cam.z; RD.clamp(); }
    renderBuild(true); renderSel(); hud(); miniTick(true);
    if (!restored) { stats.games++; saveStats(); toast(meta.mode === 'camp' ? MISSIONS[meta.mi].nm : `Vrij spel tegen ${S.P.length - 1} ${S.P.length > 2 ? 'facties' : 'factie'}`, 'info'); saveGame(); }
    kick();
  }
  function releaseInput() { ptrs.clear(); gest = null; }
  function startMission(i, adj = opt.adj) { begin(missionCfg(i, adj), { mode: 'camp', mi: i, adj }); }
  function startSkirmish(o) { const sk = Object.assign({ fac: opt.fac, opp: opt.opp, diff: opt.diff, size: opt.size, cry: opt.cry, kr: opt.kr }, o || {}); sk.seed = sk.seed ?? ((Math.random() * 1e9) >>> 0); begin(skirmishCfg(sk), { mode: 'skirm', sk }); }
  function restart() { if (!GS) return; const m = GS.meta; store.del('zr.save'); if (m.mode === 'camp') startMission(m.mi, m.adj); else startSkirmish(Object.assign({}, m.sk, { seed: m.sk.seed })); }

  /* ---------- saving: every 20 s of play, when pausing and when leaving ---------- */
  function saveGame() {
    if (!GS || GS.view !== 'play' || !S || S.res || window.__noSave) return;
    try { GS.meta.cam = { x: RD.cam.x, y: RD.cam.y, z: RD.cam.z }; store.set('zr.save', { v: CORE_V, meta: GS.meta, core: Core.serialize(S), groups: GS.groups, at: Date.now() }); } catch (e) {}
  }
  function loadSave() {
    const sv = store.get('zr.save', null); if (!sv || sv.v !== CORE_V) return null;
    try { const st = Core.deserialize(sv.core); if (!st) return null; st._ui = { groups: sv.groups }; return { st, meta: sv.meta }; } catch (e) { return null; }
  }
  function resume() {
    const L = loadSave(); if (!L) { store.del('zr.save'); toast('Dit potje kon niet worden geladen', 'bad'); renderStart(); return; }
    begin(null, L.meta, L.st); openPause();
  }

  /* ---------- the end ---------- */
  function finish() {
    GS.resultsUp = true; releaseInput(); stopPlacing();
    const r = S.res, P = H(), m = GS.meta, mins = S.t / TPS / 60;
    stats.harv += Math.floor(P.st.harv); stats.made += P.st.made; if (r.win) stats.wins++; else stats.losses++;
    let stars = 0, notes = [];
    if (m.mode === 'camp' && r.win) {
      const M = MISSIONS[m.mi]; stars = 1 + (mins <= M.par ? 1 : 0) + (P.st.blost === 0 ? 1 : 0);
      const old = stats.camp[m.mi] || {}; stats.camp[m.mi] = { s: Math.max(old.s || 0, stars), t: Math.min(old.t || 1e9, S.t) };
      if (!old.s && m.mi % 3 < 2) notes.push(`Nieuwe missie open: <b>${esc(MISSIONS[m.mi + 1].nm)}</b>`);
      if (!old.s && m.mi % 3 === 2) notes.push(`De veldtocht van de <b>${FAC(M.fac).nm}</b> is uitgespeeld!`);
    }
    if (m.mode === 'skirm' && r.win) { stats.skWins++; if (m.sk.opp === 2 && m.sk.diff === 2) stats.sk2Hard++; }
    saveStats(); store.del('zr.save');
    const pe = $('#zrEndPic'); pe.innerHTML = `<img src="${Art.emblemCanvas(r.win ? P.fac : (S.P.find(Q => Q.i === r.winner) || S.P[1] || P).fac, 128).toDataURL()}" alt="">`; pe.classList.remove('pop'); void pe.offsetWidth; pe.classList.add('pop');
    $('#zrEndTitle').textContent = r.win ? 'Overwinning!' : r.why === 'protect' ? 'Alle oogsters verloren' : 'Verloren';
    $('#zrEndStars').innerHTML = m.mode === 'camp' && r.win ? [1, 2, 3].map(k => `<span class="${stars >= k ? 'on' : ''}">⭐</span>`).join('') : '';
    const M = m.mode === 'camp' ? MISSIONS[m.mi] : null;
    $('#zrEndText').innerHTML = `<div class="zr-res"><div><b>${Math.floor(mins)}:${String(Math.floor(S.t / TPS % 60)).padStart(2, '0')}</b><small>tijd</small></div><div><b>${Math.floor(P.st.harv)}</b><small>kristal</small></div><div><b>${P.st.kills}</b><small>vernietigd</small></div><div><b>${P.st.lost + P.st.blost}</b><small>verloren</small></div></div>`
      + (M && r.win ? `<div>⭐ gewonnen · ${mins <= M.par ? '⭐' : '☆'} binnen ${M.par} min · ${P.st.blost === 0 ? '⭐' : '☆'} geen gebouw verloren</div>` : '')
      + (!r.win ? `<div>${r.why === 'protect' ? 'Je had geen oogster meer over.' : 'Je basis is verloren. Probeer het nog eens!'}</div>` : '')
      + (notes.length ? `<div style="margin-top:6px">${notes.join('<br>')}</div>` : '');
    const btns = m.mode === 'camp' ? [['zrEMissions', 'Missies', 0], ['zrERetry', '↻ Opnieuw', !r.win]].concat(r.win && m.mi % 3 < 2 ? [['zrENext', 'Volgende ▶', 1]] : []) : [['zrEMenu', 'Menu', 0], ['zrERetry', 'Nog een keer ▶', 1]];
    $('#zrEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    setTimeout(() => sfx(r.win ? 'zrWin' : 'zrLose'), 200);
    openModal('zrEndModal');
  }
  $('#zrEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('zrClick'); const m = GS.meta;
    if (b.id === 'zrENext') startMission(m.mi + 1, m.adj); else if (b.id === 'zrERetry') restart(); else if (b.id === 'zrEMissions') { toMenus(); openCamp(MISSIONS[m.mi].fac); } else if (b.id === 'zrEMenu') openStart();
  });

  /* ---------- pause ---------- */
  const OPTS = { sound: ['Geluidseffecten', ''], music: ['Achtergrondmuziek', ''], big: ['Grote knoppen', ''], vib: ['Trillen', ''] };
  function optRows(keys) {
    return keys.map(k => k === 'speed' ? `<div class="opt"><div class="opt-label">Spelsnelheid</div><div class="seg">${SPEEDS.map(([v, t]) => `<button data-k="speed" data-v="${v}" class="${opt.speed === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`
      : `<div class="opt"><div class="opt-label">${OPTS[k][0]}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  }
  function onOpt(e, again) {
    const b = e.target.closest('button[data-k]'); if (!b) return false;
    const k = b.dataset.k; opt[k] = k === 'speed' ? +b.dataset.v : b.dataset.v === 'true';
    saveOpt(); Sfx.refresh && Sfx.refresh(); scr.classList.toggle('big', !!opt.big); if (k === 'big') setTimeout(fit, 30);
    sfx('zrClick'); again(); return true;
  }
  function openPause() {
    if (!GS || GS.view !== 'play' || !S || GS.resultsUp) return;
    releaseInput(); saveGame();
    const m = GS.meta, mins = Math.floor(S.t / TPS / 60);
    $('#zrPInfo').innerHTML = (m.mode === 'camp' ? `Missie ${m.mi + 1}: <b>${esc(MISSIONS[m.mi].nm)}</b>` : `Vrij spel · ${esc(FAC(H().fac).nm)} tegen ${S.P.slice(1).map(P => esc(FAC(P.fac).nm)).join(' en ')} · ${DIFFS[m.sk.diff].nm.toLowerCase()}`) + ` · ${mins}:${String(Math.floor(S.t / TPS % 60)).padStart(2, '0')}`;
    const ob = $('#zrPObj'); if (S.obj) { ob.style.display = ''; ob.innerHTML = S.obj.filter(o => o.t !== 'protect' || true).map(o => `<div class="${o.done ? 'done' : o.fail ? 'fail' : ''}">${esc(OBJ_TXT(o))}</div>`).join(''); } else ob.style.display = 'none';
    $('#zrPOpts').innerHTML = optRows(['speed', 'sound', 'music', 'big']);
    if (!$('#zrPauseModal').classList.contains('show')) closeModals();
    openModal('zrPauseModal'); sfx('zrClick');
  }
  $('#zrPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#zrPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#zrPRestart').addEventListener('click', () => { askConfirm('Opnieuw beginnen?', 'Dit potje begint dan helemaal opnieuw.', 'Opnieuw').then(y => { if (y) restart(); else if (GS && GS.view === 'play') openPause(); }); });
  $('#zrPQuit').addEventListener('click', () => { saveGame(); openStart(); });
  $('#zrPOpts').addEventListener('click', e => onOpt(e, openPause));

  /* ---------- menus: start, campaign, briefing, skirmish ---------- */
  function toMenus() {
    if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); releaseInput();
    if (GS && GS.view === 'play' && S && !S.res && !GS.resultsUp) saveGame();
    GS = { view: 'start', demo: true }; S = null; scr.classList.remove('play', 'placing');
    Sfx.track('zr', 'zrm'); drawDemo();
  }
  let demoImg = null, demoKey = '';
  function drawDemo() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20) return;
    const k = Math.round(r.width) + 'x' + Math.round(r.height);
    if (!demoImg || demoKey !== k) {
      try {
        const D = Core.newGame(skirmishCfg({ fac: 0, opp: 2, diff: 1, size: 'klein', cry: 2500, kr: true, seed: 5 })); D.human = -1; D.P.forEach(P => { P.ai = 1; AI.init(D, P); P.A.next = 1e9; });
        for (let i = 0; i < 150 * TPS; i++) Core.step(D);
        RD.setGame(D, false); RD.resize(r.width, r.height, Math.min(1.5, devicePixelRatio || 1)); RD.cam.z = 34; const b = D.B.find(b => b.o === 0 && b.t === 'bouw') || D.B[0]; RD.center(b ? b.x + 4 : 20, b ? b.y + 2 : 20);
        RD.frame(D, 1, { still: true }); demoImg = RD.snapshot(); demoKey = k; const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(demoImg, 0, 0);
      } catch (e) { console.error(e); return; }
    } else { const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(demoImg, 0, 0, cv.width, cv.height); }
  }
  function heroArt() {
    const c = $('#zrHeroCv'), g = c.getContext('2d'), W = c.width, Hh = c.height;
    const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, '#3a1e5a'); sky.addColorStop(.45, '#e0623a'); sky.addColorStop(.75, '#f6b25a'); g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
    g.fillStyle = 'rgba(255,240,190,.9)'; g.beginPath(); g.arc(W * .78, Hh * .5, 26, 0, 7); g.fill();
    for (const [y, col, amp] of [[.62, '#c8803a', 10], [.74, '#e0a050', 14], [.86, '#f0c070', 9]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, Hh); for (let x = 0; x <= W; x += 8) g.lineTo(x, Hh * y + Math.sin(x / 47 + y * 9) * amp); g.lineTo(W, Hh); g.fill(); }
    const cr = Art.crystals(); for (const [x, y, s] of [[.12, .8, 64], [.2, .86, 50], [.88, .86, 58]]) g.drawImage(cr.list[12 + Math.floor(x * 10) % 4], W * x - s / 2, Hh * y - s / 2, s, s);
    for (const [f, t, x, y, s] of [[0, 'zt', .42, .82, 70], [1, 'bliks', .6, .86, 56], [2, 'kolos', .3, .9, 64]]) g.drawImage(Art.unitIcon(f, t, s), W * x - s / 2, Hh * y - s / 2);
  }
  function renderStart() {
    const sv = store.get('zr.save', null), cont = $('#zrContinue');
    cont.hidden = !sv;
    if (sv) { const m = sv.meta; cont.innerHTML = `<span><b>Verder spelen</b><small>${m.mode === 'camp' ? `Missie ${m.mi + 1}: ${esc(MISSIONS[m.mi].nm)}` : `Vrij spel · ${esc(FAC(m.sk.fac).nm)}`}</small></span><em>Verder ▶</em>`; }
    const done = Object.keys(stats.camp).length;
    $('#zrCampSum').textContent = `${done}/${MISSIONS.length} missies · ⭐ ${stats.stars || 0}/${MISSIONS.length * 3}`;
    $('#zrOpts').innerHTML = optRows(['speed', 'sound', 'music', 'big', 'vib']);
    $('#zrStats').innerHTML = [['Potjes', stats.games], ['Gewonnen', stats.wins], ['Missies', `${done}/9`], ['Sterren', stats.stars || 0]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('')
      + `<div class="dr-line" style="grid-column:1/-1;font-size:12.5px;color:var(--muted);text-align:center">${stats.harv} kristal verzameld · ${stats.kills} vijanden vernietigd${stats.swallowed ? ` · ${stats.swallowed}× opgeslokt` : ''}</div>`;
  }
  function openStart() { closeModals(); toMenus(); heroArt(); renderStart(); openModal('zrStartModal'); }
  $('#zrContinue').addEventListener('click', () => { sfx('zrClick'); resume(); });
  $('#zrModes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; sfx('zrClick'); if (b.dataset.m === 'camp') openCamp(); else openSkirm(); });
  $('#zrOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#zrStartBack').addEventListener('click', () => { closeModals(); quit(); });
  const embUrl = {}; const emb = f => embUrl[f] || (embUrl[f] = Art.emblemCanvas(f, 96).toDataURL());
  const missionOpen = i => i % 3 === 0 || !!stats.camp[i - 1];
  // campaign map: three regions with a winding trail of nodes
  const NODES = [[.12, .7], [.22, .45], [.33, .25], [.48, .2], [.6, .38], [.72, .2], [.62, .7], [.77, .62], [.88, .82]];
  function campMap() {
    const c = $('#zrCampCv'), g = c.getContext('2d'), W = c.width, Hh = c.height;
    const bg = g.createLinearGradient(0, 0, W, Hh); bg.addColorStop(0, '#e8c27e'); bg.addColorStop(1, '#d09a58'); g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
    const R = rng(77); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${R() < .5 ? '255,240,200' : '150,100,50'},.12)`; g.fillRect(R() * W, R() * Hh, 2, 2); }
    for (let k = 0; k < 14; k++) { const y = R() * Hh; g.strokeStyle = 'rgba(160,110,60,.25)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= W; x += 10) g.lineTo(x, y + Math.sin(x / 40 + k) * 8); g.stroke(); }
    for (const [x, y, r, f] of [[.2, .48, .2, 0], [.6, .27, .2, 1], [.76, .72, .18, 2]]) {
      g.fillStyle = 'rgba(150,126,104,.75)'; g.beginPath(); for (let a = 0; a < 6.3; a += .3) g.lineTo(W * x + Math.cos(a) * W * r * (.8 + .25 * Math.sin(a * 3 + f)), Hh * y + Math.sin(a) * Hh * r * 1.5 * (.8 + .2 * Math.cos(a * 2 + f))); g.fill();
      g.globalAlpha = .18; Art.emblem(g, FAC(f).emb, W * x, Hh * y, Hh * .22, FAC(f).col, FAC(f).dk); g.globalAlpha = 1;
    }
    for (let k = 0; k < 7; k++) g.drawImage(Art.crystals().list[8 + (k % 8)], W * (.05 + R() * .9) - 16, Hh * (.1 + R() * .8) - 16, 32, 32);
    g.strokeStyle = 'rgba(90,60,30,.7)'; g.setLineDash([6, 7]); g.lineWidth = 3; g.beginPath(); NODES.forEach(([x, y], i) => i ? g.lineTo(W * x, Hh * y) : g.moveTo(W * x, Hh * y)); g.stroke(); g.setLineDash([]);
    let next = -1; for (let i = 0; i < 9; i++) if (missionOpen(i) && !stats.camp[i] && (MISSIONS[i].fac === opt.cf)) { next = i; break; }
    $('#zrNodes').innerHTML = NODES.map(([x, y], i) => { const M = MISSIONS[i], F = FAC(M.fac), st = stats.camp[i], open = missionOpen(i); return `<button class="zr-node${open ? '' : ' lock'}${i === next ? ' next' : ''}" data-i="${i}" style="left:${x * 100}%;top:${y * 100}%;background:${F.col}">${i + 1}<i>${st ? '⭐'.repeat(st.s) : open ? '' : '🔒'}</i></button>`; }).join('');
  }
  function openCamp(f) {
    if (f != null) { opt.cf = f; saveOpt(); }
    closeModals(); campMap();
    $('#zrCampFacs').innerHTML = FACTIONS.map((F, i) => `<button data-f="${i}" class="${opt.cf === i ? 'on' : ''}" style="--fc:${F.col}"><img src="${emb(i)}" alt="">${F.nm}</button>`).join('');
    $('#zrCampList').innerHTML = MISSIONS.map((M, i) => M.fac !== opt.cf ? '' : (() => { const st = stats.camp[i], open = missionOpen(i); return `<button class="zr-mcard${open ? '' : ' lock'}" data-i="${i}" style="--fc:${FAC(M.fac).col}"><span class="n">${i % 3 + 1}</span><span><b>${esc(M.nm)}</b><small>${M.obj.filter(o => o.t !== 'protect').map(OBJ_TXT).join(' · ')}</small></span><span class="st">${open ? [1, 2, 3].map(k => st && st.s >= k ? '⭐' : '☆').join('') : '🔒'}</span></button>`; })()).join('');
    openModal('zrCampModal');
  }
  $('#zrCampFacs').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; sfx('zrClick'); openCamp(+b.dataset.f); });
  const pickMission = e => { const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i; if (!missionOpen(i)) { sfx('zrNo'); toastMenu(`Haal eerst missie ${i}: ${MISSIONS[i - 1].nm}`); return; } sfx('zrClick'); openBrief(i); };
  $('#zrNodes').addEventListener('click', pickMission); $('#zrCampList').addEventListener('click', pickMission);
  $('#zrCampBack').addEventListener('click', () => { sfx('zrClick'); openStart(); });
  const toastMenu = t => menuToast ? menuToast(t, 1800) : null;
  let briefI = 0;
  function openBrief(i) {
    briefI = i; const M = MISSIONS[i], F = FAC(M.fac);
    $('#zrBriefEmb').src = emb(M.fac); $('#zrBriefSub').textContent = `${F.nm} · missie ${i % 3 + 1} van 3`; $('#zrBriefTitle').textContent = M.nm;
    $('#zrBriefText').innerHTML = M.brief.split('\n\n').map(p => `<p>${esc(p)}</p>`).join('') + `<p style="color:var(--muted);font-size:13px">${M.enemies.length ? 'Tegenstander: ' + M.enemies.map(e => FAC(e.fac).nm).join(' en ') + ' · ' : 'Geen tegenstander · '}techniek niveau ${M.tier}${M.kr ? ' · zandkruiper in de buurt' : ''} · richttijd ${M.par} min</p>`;
    $('#zrBriefObj').innerHTML = M.obj.map(o => `<div>${esc(OBJ_TXT(o))}</div>`).join('');
    $('#zrBriefDiff').innerHTML = [[-1, 'Makkelijk'], [0, 'Normaal'], [1, 'Moeilijk']].map(([v, t]) => `<button data-v="${v}" class="${opt.adj === v ? 'on' : ''}">${t}</button>`).join('');
    closeModals(); openModal('zrBriefModal');
  }
  $('#zrBriefDiff').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; opt.adj = +b.dataset.v; saveOpt(); sfx('zrClick'); openBrief(briefI); });
  $('#zrBriefBack').addEventListener('click', () => { sfx('zrClick'); openCamp(MISSIONS[briefI].fac); });
  $('#zrBriefGo').addEventListener('click', () => { sfx('zrClick'); store.del('zr.save'); startMission(briefI, opt.adj); });
  function openSkirm() {
    closeModals();
    $('#zrFCards').innerHTML = FACTIONS.map((F, i) => `<button data-f="${i}" class="${opt.fac === i ? 'on' : ''}" style="--fc:${F.col}"><img src="${emb(i)}" alt=""><b>${F.nm}</b><small>${esc(UT[F.sp].nm)}</small></button>`).join('');
    const seg = (k, list) => `<div class="opt"><div class="opt-label">${{ opp: 'Tegenstanders', diff: 'Moeilijkheid', size: 'Kaart', cry: 'Startkristal', kr: 'Zandkruiper' }[k]}</div><div class="seg">${list.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${String(opt[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
    $('#zrSkOpts').innerHTML = seg('opp', [[1, '1'], [2, '2']]) + seg('diff', DIFFS.map((D, i) => [i, D.nm])) + seg('size', [['klein', 'Klein'], ['middel', 'Middel'], ['groot', 'Groot']]) + seg('cry', [[1000, '1000'], [2500, '2500'], [5000, '5000']]) + seg('kr', [[true, 'Aan'], [false, 'Uit']]);
    openModal('zrSkirmModal');
  }
  $('#zrFCards').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; opt.fac = +b.dataset.f; saveOpt(); sfx('zrClick'); openSkirm(); });
  $('#zrSkOpts').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, v = b.dataset.v; opt[k] = k === 'size' ? v : k === 'kr' ? v === 'true' : +v; saveOpt(); sfx('zrClick'); openSkirm(); });
  $('#zrSkBack').addEventListener('click', () => { sfx('zrClick'); openStart(); });
  $('#zrSkGo').addEventListener('click', () => { sfx('zrClick'); store.del('zr.save'); startSkirmish(); });
  // back from a non-game dialog (campaign, briefing, skirmish) lands on the start dialog again
  new MutationObserver(() => { if (current === 'zr' && GS && GS.view !== 'play' && !anyModal()) setTimeout(() => { if (current === 'zr' && GS && GS.view !== 'play' && !anyModal()) openStart(); }, 0); })
    .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('zr'); scr.classList.toggle('big', !!opt.big);
    requestAnimationFrame(() => fit());
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { scr.classList.add('play'); Sfx.track('zr', 'zr'); fit(); drawStill(); openPause(); return; }
    setTimeout(() => { if (current === 'zr') { fit(); openStart(); } }, 0);
  }
  function quit() { if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); saveGame(); releaseInput(); closeModals(); GS = null; S = null; scr.classList.remove('play', 'placing'); show('menu'); refreshMenu(); }
  // back: in a match it pauses; placing or a selection is cancelled first
  function leave() {
    if (GS && GS.view === 'play' && S && !GS.resultsUp) {
      if (GS.placing) { stopPlacing(); return; }
      if (GS.rally || GS.boxMode) { GS.rally = false; GS.boxMode = false; E.box.classList.remove('on'); return; }
      setTimeout(() => { if (current === 'zr' && !anyModal()) openPause(); }, 0); return;
    }
    if (GS && GS.view === 'play' && GS.resultsUp) { setTimeout(() => { if (current === 'zr') openStart(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'zr' && GS && GS.view === 'play' && S && !GS.resultsUp) { saveGame(); if (!anyModal()) openPause(); } });
  addEventListener('pagehide', () => { if (current === 'zr') saveGame(); });

  /* ---------- test hooks ---------- */
  window.__zr = {
    get S() { return S; }, get G() { return GS; }, R: RD, Art, opt, stats: () => stats, Core, AI, UT, BT, MISSIONS, FACTIONS, TPS,
    startMission, startSkirmish, openStart, openPause, openCamp, openSkirm, quit, saveGame, cur: () => current, frames: () => frames.slice(), quality: () => quality,
    running: () => raf > 0 || raf === -1, manual(v) { if (GS) GS.manual = !!v; if (!v) kick(); }, step(n) { for (let i = 0; i < n && S && !S.res; i++) stepGame(); },
    cmd: c => Core.cmd(S, S.human, c), toClient(x, y) { const r = cv.getBoundingClientRect(), p = RD.toScreen(x, y); return { x: r.left + p.x, y: r.top + p.y }; },
    finite: () => [acc, lastT].every(Number.isFinite) && (!S || Core.finite(S)) && [RD.cam.x, RD.cam.y, RD.cam.z].every(Number.isFinite),
    ptrs: () => ({ n: ptrs.size, g: gest && gest.k }), sel: () => GS && GS.sel ? [...GS.sel] : [],
 miniRect: () => miniCv.getBoundingClientRect(), radarOn,
  };
  return { enter, leave, hasSave: () => !!store.get('zr.save', null) };
