  /* ================= ui.js: screens, touch controls, the loop, progress, ghosts, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STEP = 1000 / 60, NL = LEVELS.length, PER = 8;
  const opt = Object.assign({ sound: true, ghost: true, big: false, shake: true, vib: true, outfit: 0, world: 0 }, store.get('dr.settings', {}));
  Sfx.gate('dr', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('dr.settings', opt);
  const sfx = (n, a, pan) => { if (opt.sound) Sfx.play(n, a, pan); };
  let stats = Object.assign({ runs: 0, done: 0, crashes: 0, flips: 0, perfects: 0, maxFlip: 0, maxCombo: 0, lv: {}, endless: 0, eruns: 0, style: 0, gold: 0, shoes: 0, levels: 0, worldShoes: 0 }, store.get('dr.stats', {}));
  const saveStats = () => {                                       // summary fields for the trophies and the stats screen
    let gold = 0, shoes = 0, levels = 0, ws = 0;
    for (let w = 0; w < WORLDS.length; w++) { let all = true; for (let i = w * PER; i < (w + 1) * PER; i++) { const r = stats.lv[i]; if (!r || r.c !== 7) all = false; } if (all) ws++; }
    for (const k in stats.lv) { const r = stats.lv[k]; if (r.m >= 3) gold++; shoes += popc(r.c || 0); if (r.t) levels++; }
    Object.assign(stats, { gold, shoes, levels, worldShoes: ws }); store.set('dr.stats', stats);
  };
  const popc = v => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };
  let run = store.get('dr.run', null);
  const saveRun = () => { if (run) store.set('dr.run', run); else store.del('dr.run'); };
  const scr = $('#dr'), stageEl = $('#drStage'), cv = $('#drCv'), pad = $('#drPad');
  const RD = Draw.create(cv);
  let GS = null, L = null, S = null, GH = null, GL = null, raf = 0, lastT = 0, acc = 0, quality = 0, frames = [], rec = null, EVC = {};
  const now = () => performance.now();
  const SHOWN = document.getElementsByClassName('modal show'); let mUp = false, mT = 0;
  const modalUp = () => { if (mUp || ++mT % 6 === 0) mUp = SHOWN.length > 0; return mUp; };
  let portraitF = innerHeight > innerWidth * 1.05; const portraitNow = () => portraitF;
  addEventListener('resize', () => { portraitF = innerHeight > innerWidth * 1.05; });
  const fmt = f => { const s = f / 60, m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
  const fmt1 = f => { const s = f / 60, m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  const MEDAL = ['', '🥉', '🥈', '🥇'], MNAME = ['Gehaald!', 'Brons!', 'Zilver!', 'Goud!'];
  const levelDef = i => LEVELS[i];
  const medalOf = (i, f) => { const M = LEVELS[i].medals; if (!M) return 1; return f <= M[0] ? 3 : f <= M[1] ? 2 : f <= M[2] ? 1 : 0; };
  const starsTotal = () => { let s = 0; for (const k in stats.lv) s += stats.lv[k].m || 0; return s; };
  const shoesTotal = () => { let s = 0; for (const k in stats.lv) s += popc(stats.lv[k].c || 0); return s; };
  const worldOpen = w => w === 0 || (starsTotal() >= WORLDS[w].need && !!(stats.lv[w * PER - 1] || {}).t);
  const levelOpen = i => worldOpen(Math.floor(i / PER)) && (i % PER === 0 || !!(stats.lv[i - 1] || {}).t);
  const endlessOpen = () => !!(stats.lv[2] || {}).t;
  // the shoe icon for the HUD and the cards
  const SHOE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24"><ellipse cx="1" cy="6" rx="11" ry="3" fill="#b87a10"/><path d="M-10 5L-9-6Q-6-9-2-6L2-1Q11 0 11 5Z" fill="#ffd23a" stroke="#c88a10" stroke-width="1"/><path d="M-5-4L0-1M-4-1L1 1" stroke="#fff" stroke-width="1.2"/><ellipse cx="-7" cy="-3" rx="1" ry="2.5" fill="#fff" opacity=".8"/></svg>');

  /* ---------- view switching and sizing ---------- */
  function setView(v) {
    if (GS) GS.view = v;
    scr.classList.toggle('play', v === 'play'); scr.classList.toggle('lv', v === 'lv');
    Sfx.track('dr', v === 'play' ? 'dr' : 'drm');
    if (v === 'play' && screen.orientation && screen.orientation.lock) { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
    layoutPad(); kick();
  }
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const d = Math.min(window.__drDpr || [1.75, 1.3, 1, .75, .62][quality], devicePixelRatio || 1);
    RD.resize(r.width, r.height, d); layoutPad();
    $('#drHud').style.setProperty('--s', Math.max(.8, Math.min(1.25, r.height / 412)).toFixed(3));
    if (S && !raf) drawStill();
  }
  window.addEventListener('resize', () => { if (current === 'dr') setTimeout(fit, 60); });
  function drawStill() { if (S && L) RD.frame(S, { still: 1, ghost: GH, outfit: OUTFITS[opt.outfit] }); }

  /* ---------- the loop: fixed 60 Hz steps, rendering every animation frame, stopped when nothing moves ---------- */
  let rekick = false;
  function kick() { if (raf === -1) { rekick = true; return; } if (!raf && current === 'dr' && GS && (GS.view === 'play' || GS.view === 'attract')) { lastT = now(); raf = requestAnimationFrame(loop); } }
  let pollT = 0;
  function pollResume() { clearTimeout(pollT); pollT = setTimeout(() => { if (current !== 'dr' || !GS || GS.view !== 'play') return; if (anyModal() || portraitNow()) { pollResume(); return; } kick(); }, 250); }
  function loop(ts) {
    raf = -1; rekick = false;
    try { loopBody(ts); } finally { if (raf === -1) { raf = 0; if (rekick && current === 'dr') raf = requestAnimationFrame(loop); } rekick = false; }
  }
  function loopBody(ts) {
    if (current !== 'dr' || !GS || !S) return;
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(100, Math.max(0, ts - lastT)); lastT = ts;
    if (GS.view === 'attract') { stepAttract(dt); raf = requestAnimationFrame(loop); return; }
    if (GS.view !== 'play') return;
    const paused = modalUp() || portraitNow() || GS.manual;
    if (!paused) {
      acc += dt * (window.__drSpeed || 1); let n = 0;
      while (acc >= STEP && n < 6) { acc -= STEP; n++; stepGame(); if (!GS || GS.view !== 'play') return; }
      if (n >= 6) acc = 0;
      perfWatch(dt);
    } else acc = 0;
    RD.frame(S, { ghost: opt.ghost ? GH : null, outfit: OUTFITS[opt.outfit], fade: fadeOf(), still: paused });
    hud();
    if (paused && !GS.manual) { pollResume(); return; }
    if (GS.manual) return;
    if (GS.resultsUp && RD.idle()) return;
    raf = requestAnimationFrame(loop);
  }
  const fadeOf = () => { if (!S) return 0; if (S.st === 9 || S.st === 10) { const d = S.dead, tot = S.st === 9 ? Core.C.DEAD : Core.C.DEADFALL; return d < 14 ? (14 - d) / 14 * .9 : 0; } return S.st === 0 && GS && GS.fadeIn > 0 ? GS.fadeIn / 14 * .9 : 0; };
  let pwT = 0, pwN = 0;
  function perfWatch(dt) {
    pwT += dt; pwN++; if (pwN < 45) return;
    const avg = pwT / pwN; pwT = 0; pwN = 0;
    if (avg > 18.3 && quality < 4) { quality++; RD.setQuality(quality); fit(); }
  }

  /* ---------- touch controls ---------- */
  const PAD = { held: 0, pend: 0 };
  const IC = {
    L: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M15.5 4 7 12l8.5 8z"/></svg>', R: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M8.5 4 17 12l-8.5 8z"/></svg>',
    J: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 3 4 12h5v8h6v-8h5z"/></svg>', S: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M3 17h13l-3-3 1.6-1.6L20.2 18l-5.6 5.6L13 22l3-3H3zM6 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"/></svg>',
    CCW: '<svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M7 8.5A7 7 0 1 1 5.6 15"/><path fill="#fff" d="M2.5 4.5 9.5 3.6 8 10.6z"/></svg>',
    CW: '<svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M17 8.5A7 7 0 1 0 18.4 15"/><path fill="#fff" d="M21.5 4.5 14.5 3.6 16 10.6z"/></svg>',
  };
  const BTNS = [['L', '', 'L', ''], ['R', '', 'R', ''], ['J', 'j', 'J', 'Springen'], ['S', 's', 'S', 'Glijden'], ['CCW', 'f', 'CCW', 'Salto'], ['CW', 'f', 'CW', 'Salto']];
  const BIT = { L: KB.L, R: KB.R, J: KB.J, S: KB.S, CCW: KB.CCW, CW: KB.CW };
  const btnEl = {};
  for (const [k, cls, ic, lbl] of BTNS) { const b = document.createElement('div'); b.className = 'dr-b ' + cls; b.dataset.b = k; b.innerHTML = IC[ic] + (lbl ? `<small>${lbl}</small>` : ''); pad.appendChild(b); btnEl[k] = b; }
  let layout = null;
  function layoutPad() {
    const W = RD.W, H = RD.H; if (!W || !H) return;
    const s = Math.max(.74, Math.min(1.3, H / 412)) * (opt.big ? 1.2 : 1), m = 14 + (opt.big ? 4 : 0);
    const r1 = 40 * s, rj = 50 * s, rs = 38 * s, rf = 33 * s;
    const P = {
      L: [m + r1 + 4, H - m - r1 - 6, r1], R: [m + r1 * 3 + 22 * s, H - m - r1 - 6, r1],
      J: [W - m - rj - 6, H - m - rj - 4, rj], S: [W - m - rj * 2 - rs - 26 * s, H - m - rs - 2, rs],
      CCW: [W - m - rj * 2 - rf - 18 * s, H - m - rs * 2 - rf - 30 * s, rf], CW: [W - m - rf - 10 * s, H - m - rj * 2 - rf - 26 * s, rf],
    };
    for (const k in P) { const [x, y, r] = P[k], el = btnEl[k]; Object.assign(el.style, { left: (x - r) + 'px', top: (y - r) + 'px', width: r * 2 + 'px', height: r * 2 + 'px' }); const sm = el.querySelector('small'); if (sm) sm.style.fontSize = Math.max(8, 10 * s) + 'px'; }
    layout = P;
  }
  const ptrs = new Map();
  function nearest(x, y, group) {
    let best = null, bd = 1e9;
    for (const k in layout) { if (group && !group.includes(k)) continue; const [bx, by, r] = layout[k], d = Math.hypot(x - bx, y - by); if (d < r * 1.3 && d < bd) { bd = d; best = k; } }
    // the left half below the middle steers even between the buttons
    if (!best && (!group || group.includes('L')) && x < RD.W * .3 && y > RD.H * .45) best = x < (layout.L[0] + layout.R[0]) / 2 ? 'L' : 'R';
    return best;
  }
  function press(k, on) {
    const bit = BIT[k];
    if (on) { PAD.held |= bit; PAD.pend |= bit; btnEl[k].classList.add('on'); Sfx.play('__warm'); }
    else { PAD.held &= ~bit; btnEl[k].classList.remove('on'); }
  }
  pad.addEventListener('pointerdown', e => {
    if (!GS || GS.view !== 'play' || !layout) return; e.preventDefault();
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, k = nearest(x, y);
    if (!k) return;
    ptrs.set(e.pointerId, k); press(k, true);
    try { pad.setPointerCapture(e.pointerId); } catch (er) {}
  });
  pad.addEventListener('pointermove', e => {
    const k0 = ptrs.get(e.pointerId); if (!k0 || !layout) return;
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const grp = k0 === 'L' || k0 === 'R' ? ['L', 'R'] : k0 === 'CW' || k0 === 'CCW' ? ['CW', 'CCW'] : null; if (!grp) return;
    const k = nearest(x, y, grp); if (k && k !== k0) { press(k0, false); ptrs.set(e.pointerId, k); press(k, true); }
  });
  const ptrUp = e => { const k = ptrs.get(e.pointerId); if (!k) return; ptrs.delete(e.pointerId); if (![...ptrs.values()].includes(k)) press(k, false); };
  pad.addEventListener('pointerup', ptrUp); pad.addEventListener('pointercancel', ptrUp);
  function releaseAll() { ptrs.clear(); PAD.held = PAD.pend = 0; for (const k in btnEl) btnEl[k].classList.remove('on'); KEYS.clear(); }
  // keyboard: arrows / WASD, space = jump, down/S = slide, Q/Z and E/X = flips, Esc/P = pause
  const KEYS = new Map();
  const KMAP = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'J', KeyW: 'J', Space: 'J', ArrowDown: 'S', KeyS: 'S', KeyQ: 'CCW', KeyZ: 'CCW', KeyE: 'CW', KeyX: 'CW' };
  document.addEventListener('keydown', e => {
    if (current !== 'dr' || !GS) return;
    if ((e.code === 'Escape' || e.code === 'KeyP') && GS.view === 'play' && !anyModal()) { openPause(); return; }
    if (GS.view !== 'play' || anyModal()) return;
    const k = KMAP[e.code]; if (!k) return; e.preventDefault(); if (KEYS.has(e.code)) return; KEYS.set(e.code, k); press(k, true);
  });
  document.addEventListener('keyup', e => { const k = KEYS.get(e.code); if (!k) return; KEYS.delete(e.code); if (![...KEYS.values()].includes(k)) press(k, false); });
  const padBits = () => { const b = PAD.held | PAD.pend; PAD.pend = 0; return b; };

  /* ---------- one simulation step ---------- */
  function stepGame() {
    const bits = GS.bot ? GS.bot() : padBits();
    if (rec) { if (rec.length && rec[rec.length - 2] === bits && rec[rec.length - 1] < 60000) rec[rec.length - 1]++; else rec.push(bits, 1); }
    const cpBefore = S.cp;
    Core.step(L, S, bits);
    for (const e of S.ev) { EVC[e.t] = (EVC[e.t] || 0) + 1; RD.event(S, e); feedback(e); }
    if (GH && GL) { if (!GH.done && GH.f < GH.max) Core.step(GL, GH, ghostBits()); }
    if (GS.fadeIn > 0) GS.fadeIn--;
    if (S.cp !== cpBefore && GS.mode === 'level') { saveProgressRun(); }
    // tutorial hints
    if (L.hints.length && GS.hintI < L.hints.length && S.x >= L.hints[GS.hintI].x - .5) { showHint(L.hints[GS.hintI]); GS.hintI++; }
    if (S.done && !GS.endAt) GS.endAt = S.f + (S.done === 2 ? 50 : 75);
    if (GS.endAt && S.f >= GS.endAt && !GS.resultsUp) results();
  }
  let ghostRle = null, gi = 0, gk = 0;
  function ghostBits() { if (!ghostRle) return 0; while (gi < ghostRle.length && gk >= ghostRle[gi + 1]) { gi += 2; gk = 0; } if (gi >= ghostRle.length) return 0; gk++; return ghostRle[gi]; }
  const panOf = x => Math.max(-1, Math.min(1, (x - RD.cam.x) / 10)) * .4;
  let stepT = 0;
  function feedback(e) {
    const a = e.a || {};
    switch (e.t) {
      case 'jump': sfx('drJump'); break;
      case 'land': { const v = a.v || 0; if (v > 3) sfx(v > 14 ? 'drLandH' : 'drLand'); break; }
      case 'slide': sfx('drSlide'); break;
      case 'walljump': sfx('drWall'); vib(10); break;
      case 'wall': case 'wallrun': sfx('drGrab'); break;
      case 'vault': sfx('drVault'); break;
      case 'grab': sfx('drGrab'); break;
      case 'climb': sfx('drClimb'); break;
      case 'spin': sfx('drFlip'); break;
      case 'flip': sfx('drFlip'); break;
      case 'flipland': if (a.perfect) sfx('drPerfect'); vib(14); break;
      case 'stumble': sfx('drLand'); trickText('Wankel!', 'bad'); break;
      case 'crash': sfx('drCrash'); vib(50); stats.crashes++; GS.crashes++; break;
      case 'fall': sfx(L.water ? 'drSplash' : 'drFall'); stats.crashes++; GS.crashes++; break;
      case 'respawn': sfx('drRespawn'); GS.fadeIn = 14; break;
      case 'spring': sfx('drSpring'); break;
      case 'coin': sfx('drCoin'); vib(8); break;
      case 'cp': sfx('drCheck'); trickText('🚩 Vlag!', '', GS.mode === 'level' && GS.lv < 3 ? 'hier begin je opnieuw' : '', true); break;
      case 'zip': sfx('drZip'); break;
      case 'bar': sfx('drGrab'); break;
      case 'barjump': sfx('drJump'); break;
      case 'crack': sfx('drCrack'); break;
      case 'crumble': sfx('drCrumble'); break;
      case 'crate': sfx('drCreak'); break;
      case 'cratehit': sfx('drThud'); break;
      case 'bump': sfx('drBump'); break;
      case 'bonk': sfx('drBump'); break;
      case 'finish': sfx('drFinish'); vib(30); break;
      case 'trick': trickText(a.name, a.combo > 1 ? '' : '', a.combo > 1 ? `combo ×${a.combo}` : '', /Perfect|Dubbele|Driedubbele|Wervel/.test(a.name)); break;
    }
    // footsteps follow the running speed
    if (S.st === 0 && Math.abs(S.gs) > 1.5) { stepT += Math.abs(S.gs) / 60; if (stepT > 1.15) { stepT = 0; sfx('drStep'); } }
  }
  const vib = ms => { if (opt.vib) vibrate(ms); };

  /* ---------- HUD (HTML, updated only when a value changes) ---------- */
  const H = { time: $('#drTime'), goal: $('#drGoal'), shoes: $('#drShoes'), flags: $('#drFlags'), tricks: $('#drTricks'), hint: $('#drHint') };
  let hudK = '', hudT = -1;
  function hud() {
    if (!S || !GS) return;
    const f = GS.mode === 'endless' ? S.f : (S.done ? S.fin : S.f), tt = Math.floor(f / 6);
    if (GS.mode === 'endless') { const m = Math.max(0, Math.floor(S.best - L.start.x)); if (tt !== hudT) { hudT = tt; H.time.textContent = m + ' m'; } }
    else if (tt !== hudT) {
      hudT = tt; H.time.textContent = fmt1(f);
      const M = L.medals; if (M) { const nx = f <= M[0] ? 0 : f <= M[1] ? 1 : f <= M[2] ? 2 : 3; H.goal.innerHTML = nx < 3 ? `<i>${MEDAL[3 - nx]}</i> ${fmt1(M[nx])}` : 'geen medaille'; }
    }
    const k = GS.mode === 'endless' ? 'e' + S.lives + '|' + Math.floor(S.style) : S.coins + '|' + S.cp;
    if (k !== hudK) {
      hudK = k;
      if (GS.mode === 'endless') { H.shoes.innerHTML = '❤️'.repeat(Math.max(0, S.lives)) + '<span style="opacity:.3">' + '❤️'.repeat(Math.max(0, 3 - S.lives)) + '</span>'; H.flags.textContent = '✨ ' + S.style; }
      else { H.shoes.innerHTML = L.coins.map((_, i) => `<img src="${SHOE}" class="${S.coins & (1 << i) ? '' : 'off'}" alt="">`).join(''); H.flags.textContent = L.cps.length ? `🚩 ${S.cp}/${L.cps.length}` : ''; H.flags.style.display = L.cps.length ? '' : 'none'; }
    }
  }
  function trickText(t, cls = '', sub = '', big = false) {
    const el = document.createElement('div'); el.className = 'drt' + (big ? ' big' : '') + (cls ? ' ' + cls : ''); el.innerHTML = esc(t) + (sub ? `<small>${esc(sub)}</small>` : '');
    H.tricks.appendChild(el); while (H.tricks.children.length > 3) H.tricks.firstChild.remove();
    setTimeout(() => el.remove(), 1450);
  }
  let hintT = 0;
  function showHint(h) {
    const ic = { j: ['j', '⤒'], s: ['s', '⤓'], f: ['f', '↻'], r: ['r', '▶'], c: ['c', '👟'], w: ['j', '⤒'] }[h.ic] || ['r', '💡'];
    H.hint.querySelector('i').className = ic[0]; H.hint.querySelector('i').textContent = ic[1]; H.hint.querySelector('span').textContent = h.t;
    H.hint.classList.add('show'); clearTimeout(hintT); hintT = setTimeout(() => H.hint.classList.remove('show'), 5200);
  }
  let toastT = 0;
  function toast(t) { const el = $('#drToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

  /* ---------- starting a level ---------- */
  const lvCache = {};
  function getLevel(i) { if (!lvCache[i]) lvCache[i] = buildLevel(LEVELS[i], i); return lvCache[i]; }
  function levelHash(L) { let h = 2166136261; for (let i = 0; i < L.t.length; i++) { h ^= L.t[i]; h = Math.imul(h, 16777619); } return (h >>> 0) + ':' + L.coins.length + ':' + L.cps.length + ':' + L.W; }
  function startLevel(i, resume) {
    closeModals(); releaseAll(); clearHint();
    L = getLevel(i); S = Core.newState(L); EVC = {};
    GS = { view: 'play', mode: 'level', lv: i, hintI: 0, endAt: 0, resultsUp: false, crashes: 0, resumed: !!resume, fadeIn: 14 };
    if (resume && run && run.lv === i) {
      S.cp = Math.min(run.cp || 0, L.cps.length); S.coins = run.coins || 0; S.style = run.style || 0; S.crashes = run.crashes || 0;
      Core.step(L, S, 0); S.f = run.f || 0; S.cp = Math.min(run.cp || 0, L.cps.length);
      if (S.cp > 0) { S.dead = 1; S.st = ST.FALL; Core.step(L, S, 0); }                   // put the runner at the flag
      S.f = run.f || 0; GS.hintI = L.hints.filter(h => h.x < S.x).length;
    }
    rec = GS.resumed ? null : [];
    // the ghost of the best run on this level
    GH = null; GL = null; ghostRle = null; gi = 0; gk = 0;
    const gs = store.get('dr.ghost', {})[i];
    if (opt.ghost && gs && gs.v === CORE_V && gs.h === levelHash(L) && !GS.resumed) { GL = L; GH = Core.newState(L, { noEv: true }); GH.max = gs.f + 120; ghostRle = gs.rle; }
    run = { lv: i, cp: S.cp, f: S.f, coins: S.coins, style: S.style, crashes: S.crashes }; saveRun();
    stats.runs++; saveStats();
    RD.setLevel(L, L.world); RD.reset(S); hudK = ''; hudT = -1; H.goal.innerHTML = '';
    setView('play'); fit(); hud(); kick();
    $('#dr').dataset.world = L.world;
  }
  function startEndless() {
    closeModals(); releaseAll(); clearHint();
    const seed = (Math.random() * 1e9) | 0;
    L = buildLevel(genEndless(seed), 99); L.world = Math.floor(Math.random() * 4); S = Core.newState(L, { endless: true, lives: 3 }); EVC = {};
    GS = { view: 'play', mode: 'endless', lv: -1, hintI: 0, endAt: 0, resultsUp: false, crashes: 0, fadeIn: 14 };
    rec = null; GH = null; GL = null; stats.eruns++; saveStats();
    RD.setLevel(L, L.world); RD.reset(S); hudK = ''; hudT = -1; H.goal.innerHTML = 'eindeloze run';
    setView('play'); fit(); hud(); kick();
  }
  function saveProgressRun() { if (!GS || GS.mode !== 'level' || !S || S.done) return; run = { lv: GS.lv, cp: S.cp, f: S.f, coins: S.coins, style: S.style, crashes: S.crashes }; saveRun(); }
  function clearHint() { H.hint.classList.remove('show'); H.tricks.innerHTML = ''; }

  /* ---------- the end of a run ---------- */
  function results() {
    GS.resultsUp = true; releaseAll();
    stats.flips += S.flips; stats.perfects += S.perfects; stats.maxFlip = Math.max(stats.maxFlip, S.maxFlip); stats.maxCombo = Math.max(stats.maxCombo, S.maxCombo);
    let pic = '🏁', title = '', text = '', btns = [];
    if (GS.mode === 'endless') {
      const m = Math.max(0, Math.floor(S.best - L.start.x)), rec0 = stats.endless || 0, nw = m > rec0;
      if (nw) stats.endless = m; stats.style = Math.max(stats.style || 0, S.style);
      pic = nw ? '🏆' : '🏃'; title = nw ? 'Nieuw record!' : 'Run voorbij';
      text = `<div class="dr-res"><div><b>${m} m</b><small>afstand</small></div><div><b>${S.style}</b><small>stijlpunten</small></div><div><b>${Math.max(m, rec0)} m</b><small>record</small></div></div>`;
      btns = [['drEMenu', 'Menu', 0], ['drEAgain', 'Nog een run ▶', 1]];
      if (nw) sfx('drMedal');
    } else {
      const i = GS.lv, f = S.fin, m = medalOf(i, f), old = stats.lv[i] || {}, first = !old.t, best = !old.t || f < old.t;
      const starsBefore = starsTotal(), shoesBefore = shoesTotal();
      const r = stats.lv[i] = { t: best ? f : old.t, m: Math.max(old.m || 0, m), c: (old.c || 0) | S.coins, s: Math.max(old.s || 0, S.style) };
      stats.done++;
      if (best && rec && !GS.resumed) { const gst = store.get('dr.ghost', {}); gst[i] = { v: CORE_V, h: levelHash(L), f, rle: rec }; try { store.set('dr.ghost', gst); } catch (e) {} }
      run = null; saveRun();
      const M = L.medals || [0, 0, 0];
      pic = m ? MEDAL[m] : '🏁'; title = m === 3 ? 'Goud!' : m === 2 ? 'Zilver!' : m === 1 ? 'Brons!' : 'Gehaald!';
      const coins = popc(S.coins);
      text = `<div class="dr-res"><div><b>${fmt(f)}</b><small>${best && !first ? '<span class="dr-new">nieuw record!</span>' : 'tijd'}</small></div><div><b>${coins}/${L.coins.length} <img src="${SHOE}" style="width:18px;vertical-align:-3px" alt=""></b><small>schoentjes</small></div><div><b>${S.style}</b><small>stijlpunten</small></div></div>`
        + `<div class="dr-medals">${[3, 2, 1].map(k => `<span class="${m >= k ? 'got' : ''}">${MEDAL[k]} ${fmt1(M[3 - k])}</span>`).join('')}</div>`
        + `<div>Beste tijd <b>${fmt(r.t)}</b>${GS.crashes ? ` · ${GS.crashes}× gevallen` : ''}${S.maxCombo > 2 ? ` · langste combo ×${S.maxCombo}` : ''}</div>`;
      const starsNow = starsTotal(), shoesNow = shoesTotal(), notes = [];
      for (let w = 1; w < WORLDS.length; w++) if (worldOpen(w) && !(stats.seenW || {})[w]) { stats.seenW = Object.assign(stats.seenW || {}, { [w]: 1 }); notes.push(`${WORLDS[w].emo} Nieuwe wereld open: <b>${WORLDS[w].full}</b>!`); }
      OUTFITS.forEach((O, k) => { if (k && shoesBefore < O.need && shoesNow >= O.need) notes.push(`👕 Nieuwe outfit: <b>${O.nm}</b>!`); });
      if (i === 2 && first) notes.push('♾️ De <b>Eindeloze run</b> is nu open!');
      if (notes.length) text += `<div style="margin-top:6px">${notes.join('<br>')}</div>`;
      const nextOpen = i + 1 < NL && levelOpen(i + 1);
      btns = [['drELevels', 'Levels', 0], ['drERetry', '↻ Opnieuw', 0]]; if (nextOpen) btns.push(['drENext', 'Volgende ▶', 1]); else btns[1][2] = 1;
      setTimeout(() => sfx(m ? 'drMedal' : 'drOk'), 350);
      if (i === NL - 1 && !old.t) notes.push('🌃 Je bent de koning van de daken!');
    }
    saveStats();
    const pe = $('#drEndPic'); pe.textContent = pic; pe.classList.remove('pop'); void pe.offsetWidth; pe.classList.add('pop');
    $('#drEndTitle').textContent = title; $('#drEndText').innerHTML = text;
    $('#drEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    openModal('drEndModal');
  }
  $('#drEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('drOk');
    switch (b.id) {
      case 'drENext': startLevel(GS.lv + 1); break;
      case 'drERetry': startLevel(GS.lv); break;
      case 'drELevels': openLevels(); break;
      case 'drEAgain': startEndless(); break;
      case 'drEMenu': openStart(); break;
    }
  });

  /* ---------- pause ---------- */
  const OPTS = { sound: ['Geluidseffecten', ''], music: ['Achtergrondmuziek', ''], ghost: ['Geest', 'je beste run rent mee'], big: ['Grote knoppen', ''], shake: ['Schermschudden', ''], vib: ['Trillen', ''] };
  function optRows(keys) { return keys.map(k => `<div class="opt"><div class="opt-label">${OPTS[k][0]}${OPTS[k][1] ? ` <small style="color:var(--muted)">· ${OPTS[k][1]}</small>` : ''}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join(''); }
  function onOpt(e, again) {
    const b = e.target.closest('button[data-k]'); if (!b) return false;
    const k = b.dataset.k; opt[k] = b.dataset.v === 'true';
    saveOpt(); RD.optShake = opt.shake; Sfx.refresh && Sfx.refresh(); layoutPad();
    if (k === 'ghost' && !opt.ghost) GH = null;
    sfx('drSel'); again(); return true;
  }
  function openPause() {
    if (!GS || GS.view !== 'play' || !S || GS.resultsUp) return;
    releaseAll(); sfx('drSel'); saveProgressRun();
    $('#drPInfo').innerHTML = GS.mode === 'endless' ? `Eindeloze run · ${Math.max(0, Math.floor(S.best - L.start.x))} m` : `Level ${GS.lv + 1}: <b>${esc(L.nm)}</b> · ${fmt1(S.f)}`;
    $('#drPCheck').style.display = GS.mode === 'level' ? '' : 'none';
    $('#drPOpts').innerHTML = optRows(['sound', 'music', 'ghost', 'big']);
    if (!$('#drPauseModal').classList.contains('show')) closeModals();
    openModal('drPauseModal');
  }
  $('#drPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#drPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#drPRestart').addEventListener('click', () => { if (GS.mode === 'endless') startEndless(); else { run = null; saveRun(); startLevel(GS.lv); } });
  $('#drPCheck').addEventListener('click', () => { closeModals(); if (S && S.st !== 9 && S.st !== 10 && !S.done) { S.st = 10; S.dead = 1; GS.crashes++; } kick(); });
  $('#drPLevels').addEventListener('click', () => { saveProgressRun(); openLevels(); });
  $('#drPQuit').addEventListener('click', () => { saveProgressRun(); openStart(); });
  $('#drPOpts').addEventListener('click', e => onOpt(e, openPause));

  /* ---------- level select ---------- */
  const lvGrid = $('#drLvGrid');
  function openLevels() {
    closeModals(); releaseAll(); clearHint();
    GS = Object.assign(GS || {}, { view: 'lv' }); if (GS.resultsUp) GS.resultsUp = false;
    attract(opt.world);
    setView('lv'); renderLevels();
  }
  function renderLevels() {
    const st = starsTotal(), sh = shoesTotal();
    $('#drLvSum').textContent = `⭐ ${st} · 👟 ${sh}/${NL * 3}`;
    $('#drWorlds').innerHTML = WORLDS.map((W, w) => `<button data-w="${w}" class="${w === opt.world ? 'on' : ''}${worldOpen(w) ? '' : ' lock'}">${W.emo} <span>${W.nm}</span>${worldOpen(w) ? '' : ' 🔒'}</button>`).join('');
    const w = opt.world, W = WORLDS[w];
    if (!worldOpen(w)) {
      const needLv = !(stats.lv[w * PER - 1] || {}).t, needSt = Math.max(0, W.need - st);
      lvGrid.innerHTML = `<div class="dr-wlock"><b>${W.emo} ${W.full}</b>${needLv ? `Haal eerst level ${w * PER} van ${WORLDS[w - 1].nm}.<br>` : ''}${needSt ? `Je hebt nog <b>${needSt}</b> ⭐ nodig (medailles: brons 1, zilver 2, goud 3).` : ''}</div>`;
      return;
    }
    let nextI = -1; for (let i = w * PER; i < (w + 1) * PER; i++) if (levelOpen(i) && !(stats.lv[i] || {}).t) { nextI = i; break; }
    lvGrid.innerHTML = Array.from({ length: PER }, (_, k) => {
      const i = w * PER + k; if (i >= NL) return '';
      const r = stats.lv[i] || {}, open = levelOpen(i);
      return `<button class="dr-card${open ? '' : ' lock'}${i === nextI ? ' next' : ''}" data-i="${i}" style="--c1:${W.col[0]};--c2:${W.col[1]}"><b>${i + 1}</b><span>${esc(LEVELS[i].n)}</span>${r.m ? `<i class="md">${MEDAL[r.m]}</i>` : ''}<em><span class="sh">${[0, 1, 2].map(j => `<img src="${SHOE}" class="${(r.c || 0) & (1 << j) ? '' : 'off'}" alt="">`).join('')}</span>${r.t ? fmt1(r.t) : ''}</em></button>`;
    }).join('');
  }
  $('#drWorlds').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; opt.world = +b.dataset.w; saveOpt(); sfx('drSel'); renderLevels(); attract(opt.world); });
  lvGrid.addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i;
    if (!levelOpen(i)) { sfx('drNo'); toast(i % PER === 0 ? 'Deze wereld is nog op slot.' : `Haal eerst level ${i}.`); return; }
    sfx('drOk'); if (run && run.lv === i) startLevel(i, true); else { run = null; saveRun(); startLevel(i); }
  });
  $('#drLvBack').addEventListener('click', () => { sfx('drSel'); openStart(); });
  $('#drRotBack').addEventListener('click', () => { saveProgressRun(); openLevels(); });

  /* ---------- the start dialog ---------- */
  function outfitCanvas(k) { const c = document.createElement('canvas'); c.width = 96; c.height = 110; RD.drawRunnerAt(0, c, OUTFITS[k], Object.assign(Rig.base(), { a1: .5, e1: 1.2, a2: -.4, e2: .9, t1: .25, t2: -.15, k1: .2, tilt: -.05 }), 1); return c; }
  function renderStart() {
    $('#drContinue').hidden = !run;
    if (run) $('#drContinue').innerHTML = `<span><b>Verder met level ${run.lv + 1}</b><small>${esc(LEVELS[run.lv].n)} · ${run.cp ? 'bij vlag ' + run.cp : 'vanaf de start'} · ${fmt1(run.f || 0)}</small></span><em>Verder ▶</em>`;
    const done = Object.values(stats.lv).filter(r => r.t).length;
    $('#drModes').innerHTML = `<button class="dr-mode main" data-m="levels"><span class="ic">🏙️</span><b>Levels</b><small>${done}/${NL} gehaald · ⭐ ${starsTotal()}</small></button>`
      + `<button class="dr-mode" data-m="endless"${endlessOpen() ? '' : ' disabled'}><span class="ic">♾️</span><b>Eindeloze run</b><small>${endlessOpen() ? `Hoe ver kom jij? Record: ${stats.endless || 0} m` : 'Haal eerst level 3'}</small></button>`;
    const sh = shoesTotal();
    const oc = $('#drOutfits'); oc.innerHTML = '';
    OUTFITS.forEach((O, k) => { const b = document.createElement('button'); const lock = sh < O.need; b.className = (opt.outfit === k ? 'on' : '') + (lock ? ' lock' : ''); b.dataset.o = k; b.appendChild(outfitCanvas(k)); const s = document.createElement('small'); s.textContent = lock ? `👟 ${O.need}` : O.nm; b.appendChild(s); oc.appendChild(b); });
    $('#drOutNote').textContent = `· verdien outfits met gouden schoentjes (${sh})`;
    $('#drOpts').innerHTML = optRows(['sound', 'music', 'ghost', 'big', 'shake', 'vib']);
    const gold = Object.values(stats.lv).filter(r => r.m >= 3).length;
    $('#drStats').innerHTML = [['Levels', `${done}/${NL}`], ['Goud', gold], ['Schoentjes', `${sh}/${NL * 3}`]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('')
      + `<div class="dr-line">${stats.flips} salto's · ${stats.perfects} perfecte landingen · beste combo ×${stats.maxCombo || 0}${stats.endless ? ` · eindeloos ${stats.endless} m` : ''}</div>`;
  }
  function openStart() {
    releaseAll(); closeModals(); clearHint();
    GS = { view: 'start' }; L = null; S = null; GH = null; rec = null;
    attract(opt.world);
    setView('start'); renderStart(); openModal('drStartModal');
  }
  // a little living scene behind the dialogs: the runner jogs over the first roofs of a world (no loop when nothing moves)
  let AT = null;
  function attract(w) {
    try {
      const i = Math.min(NL - 1, w * PER);
      L = getLevel(i); S = Core.newState(L); AT = { t: 0 }; GH = null;
      for (let k = 0; k < 40; k++) Core.step(L, S, KB.R);
      RD.setLevel(L, L.world); RD.reset(S); fit(); RD.frame(S, { outfit: OUTFITS[opt.outfit] });
      if (GS) { GS.view = GS.view === 'start' || GS.view === 'lv' ? GS.view : GS.view; }
    } catch (e) { console.error(e); }
  }
  function stepAttract() {}
  $('#drModes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b || b.disabled) return; sfx('drOk'); if (b.dataset.m === 'levels') openLevels(); else startEndless(); });
  $('#drContinue').addEventListener('click', () => { if (!run) return; sfx('drOk'); startLevel(run.lv, true); });
  $('#drOutfits').addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (!b) return; const k = +b.dataset.o; if (shoesTotal() < OUTFITS[k].need) { sfx('drNo'); toast(`Verzamel ${OUTFITS[k].need} gouden schoentjes voor deze outfit.`); return; } opt.outfit = k; saveOpt(); sfx('drOk'); renderStart(); if (S) drawStill(); });
  $('#drOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#drStartBack').addEventListener('click', () => { closeModals(); quit(); });

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('dr'); RD.optShake = opt.shake;
    requestAnimationFrame(() => fit());
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { setView('play'); fit(); drawStill(); openPause(); return; }
    openStart();
  }
  function quit() { if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); saveProgressRun(); releaseAll(); closeModals(); clearHint(); GS = null; S = null; L = null; GH = null; scr.classList.remove('play', 'lv'); show('menu'); refreshMenu(); }
  // back: during a run it pauses; on the level select it goes back to the start dialog
  function leave() {
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { setTimeout(() => { if (current === 'dr' && !anyModal()) openPause(); }, 0); return; }
    if (GS && GS.view === 'lv') { setTimeout(() => { if (current === 'dr') openStart(); }, 0); return; }
    if (GS && GS.view === 'play' && GS.resultsUp) { setTimeout(() => { if (current === 'dr') openLevels(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'dr' && GS && GS.view === 'play' && !GS.resultsUp && !anyModal()) openPause(); });

  /* ---------- test hooks ---------- */
  window.__dr = {
    get S() { return S; }, get L() { return L; }, get G() { return GS; }, get GH() { return GH; }, R: RD, opt, stats: () => stats, run: () => run, PAD, KB, ST, LEVELS, Core,
    frames: () => frames.slice(), running: () => raf > 0 || raf === -1, openStart, openLevels, startLevel, startEndless, openPause, quit, cur: () => current,
    hold(bits) { PAD.held = bits; }, step(n) { for (let i = 0; i < n && S && GS && GS.view === 'play' && !GS.resultsUp; i++) stepGame(); },
    manual(v) { if (GS) GS.manual = !!v; if (!v) kick(); },
    finite: () => [acc, lastT].every(Number.isFinite) && (!S || [S.x, S.y, S.vx, S.vy, S.gs, S.rot, S.f].every(Number.isFinite)),
    btnCenter(k) { const b = layout && layout[k]; if (!b) return null; const r = stageEl.getBoundingClientRect(); return { x: r.left + b[0], y: r.top + b[1], r: b[2] }; },
    evc: t => EVC[t] || 0, quality: () => quality, levelHash, Rig, OUTFITS,
  };
  return { enter, leave, hasSave: () => !!store.get('dr.run', null) };
