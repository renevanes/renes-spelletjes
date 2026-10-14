  /* ================= ui.js: screens, touch controls, the game loop, modes, stats ================= */
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STEP = 1000 / 60;
  const opt = Object.assign({ sound: true, easy: false, shake: true, vib: true, diff: 'normaal', inputs: true }, store.get('vd.settings', {}));
  Sfx.gate('vd', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('vd.settings', opt);
  const sfx = (n, a, pan) => { if (opt.sound) Sfx.play(n, a, pan); };
  let stats = Object.assign({ fights: 0, wins: 0, losses: 0, winsBy: {}, clears: 0, clearBy: {}, bestTime: 0, perfects: 0, superKO: 0, bossHard: 0, unlocked: 0, maxCombo: 0, conts: 0 }, store.get('vd.stats', {}));
  const saveStats = () => store.set('vd.stats', stats);
  let run = store.get('vd.run', null);                         // the arcade ladder in progress (resumable)
  const saveRun = () => { if (run) store.set('vd.run', run); else store.del('vd.run'); };
  const DIFF = [['makkelijk', 'Makkelijk'], ['normaal', 'Normaal'], ['moeilijk', 'Moeilijk']];
  const MODES = [['arcade', '🏆', 'Arcade', 'Versla alle vechters en de eindbaas'], ['vs2', '👥', 'Versus · 2 spelers', 'Samen op één telefoon, ieder een kant'],
    ['cpu', '🤖', 'Tegen de computer', 'Kies jezelf én je tegenstander'], ['train', '🎯', 'Training', 'Oefen je bewegingen op een pop']];
  const scr = $('#vd'), stageEl = $('#vdStage'), cv = $('#vdCv'), pad = $('#vdPad');
  const R = Draw.create(cv, stageEl);
  let G = null, M = null, AIs = [null, null], raf = 0, lastT = 0, acc = 0, tick = 0, frames = [], quality = 2, perfBad = 0, inputLog = [], lastBits = 0;
  const now = () => performance.now();
  // checked every frame of the loop, so kept cheap: the modal list is looked at every 6th frame (and every frame while one is
  // up), the orientation only on resize
  const SHOWN = document.getElementsByClassName('modal show'); let mUp = false, mT = 0;
  const modalUp = () => { if (mUp || ++mT % 6 === 0) mUp = SHOWN.length > 0; return mUp; };
  let portraitF = innerHeight > innerWidth * 1.05; const portraitNow = () => portraitF;
  addEventListener('resize', () => { portraitF = innerHeight > innerWidth * 1.05; });
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

  /* ---------- portraits (rendered from the rig once) ---------- */
  const PORT = {};
  function portrait(id, pal = 0) { const k = id + pal; if (!PORT[k]) { try { PORT[k] = Draw.portrait(CAST_BY[id], pal, 110, 110, 'guard').toDataURL(); } catch (e) { PORT[k] = ''; } } return PORT[k]; }

  /* ---------- view switching ---------- */
  function setView(v) {
    if (G) G.view = v;
    scr.classList.toggle('sel', v === 'sel'); scr.classList.toggle('fight', v === 'fight');
    scr.classList.toggle('land', v === 'sel' || v === 'fight' || v === 'vs');
    Sfx.track('vd', v === 'fight' || v === 'vs' ? 'vd' : 'vdm');
    if ((v === 'sel' || v === 'fight') && screen.orientation && screen.orientation.lock) { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
    layoutPad(); kick();
  }
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const d = Math.min(window.__vdDpr || quality, devicePixelRatio || 1);
    R.resize(r.width, r.height, d); layoutPad();
    if (G && G.view === 'sel') drawPreviews();
    if (G && G.view === 'start' && attractM) R.frame(attractM, { noHud: 1 });
    if (G && G.view === 'fight' && M && !raf) R.frame(M, hudOpt());
    kick();
  }
  window.addEventListener('resize', () => { if (current === 'vd') setTimeout(fit, 60); });

  /* ---------- the loop: fixed 60 Hz steps, rendering every animation frame, stopped when nothing moves ---------- */
  let rekick = false;
  function kick() { if (raf === -1) { rekick = true; return; } if (!raf && current === 'vd') { lastT = now(); raf = requestAnimationFrame(loop); } }   // raf: 0 idle, -1 inside the loop, else pending
  let pollT = 0;
  function pollResume() { clearTimeout(pollT); pollT = setTimeout(() => { if (current !== 'vd' || !G) return; if (G.view === 'fight' && (anyModal() || portraitNow())) { pollResume(); return; } kick(); }, 250); }
  function loop(ts) {
    raf = -1;                                                     // 'running': kick() inside the loop must not start a second chain
    rekick = false;
    try { loopBody(ts); } finally { if (raf === -1) { raf = 0; if (rekick && current === 'vd') raf = requestAnimationFrame(loop); } rekick = false; }
  }
  function loopBody(ts) {
    if (current !== 'vd' || !G) return;
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(100, Math.max(0, ts - lastT)); lastT = ts;
    if (G.view === 'fight' && M) {
      const paused = modalUp() || portraitNow();
      if (!paused) {
        acc += dt * (window.__vdSpeed || 1); let n = 0;
        while (acc >= STEP && n < 8) { acc -= STEP; n++; tick++; if (M.slow > 0 && tick % 3 && !window.__vdSpeed) continue; stepGame(); if (!G || G.view !== 'fight') return; }
        if (n >= 8) acc = 0;
        perfWatch(dt);
      } else acc = 0;
      R.frame(M, hudOpt());
      updateSuperBtns();
      if (paused) { pollResume(); return; }
      if (G.done && R.idle() && M.pt > 400) return;           // the results are up and nothing moves any more
    } else if (G.view === 'vs') { vsFrame(); if (!G || G.view !== 'vs') return; }
    else if (G.view === 'sel') { if (G.anim > 0) { G.anim--; drawPreviews(); } else return; }
    else return;
    raf = requestAnimationFrame(loop);
  }
  // adaptive quality: when frames come too slowly, step down (fewer pixels, then lighter fighter bitmaps); never back up
  // during a session. Level 0: up to 2x pixels; 1: 1.5x; 2: 1x, and fighters at 30 -> 20 poses/s with a raster budget.
  let pwT = 0, pwN = 0;
  function perfWatch(dt) {
    pwT += dt; pwN++;
    if (pwN < 40) return;
    const avg = pwT / pwN; pwT = 0; pwN = 0;
    if (avg > 19 && level < 2) { level++; quality = [2, 1.5, 1][level]; R.setLevel(level); fit(); }
  }
  let level = 0;
  const hudOpt = () => ({ inputs: G && G.mode === 'train' && opt.inputs ? inputLog : null, safeTop: 0 });

  /* ---------- touch controls ---------- */
  const PADS = [{ dir: 0, held: 0, pend: 0, q: [], cur: 0 }, { dir: 0, held: 0, pend: 0, q: [], cur: 0 }];
  const BMAP = { LP: Core.LP, HP: Core.HP, LK: Core.LK, HK: Core.HK, SP: Core.SP, SU: Core.SU };
  const ICON_P = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M6 9c0-1.7 1.3-3 3-3h7c1.7 0 3 1.3 3 3v5c0 2.8-2.2 5-5 5h-3.5C8 19 6 17 6 14.5z"/><path d="M9.5 6.5v4M13 6.5v4M16.3 7v3.5M6.2 12.2h4.3" stroke="rgba(0,0,0,.35)" stroke-width="1.5" fill="none"/></svg>';
  const ICON_K = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M8 3h5l.6 9.5 5.6 2.2c1.4.6 2 2 1.6 3.3l-.3 1H6.5L7 13z"/><path d="M7 16.5h13.2" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>';
  const BTNS = [['LP', 'p', ICON_P, 'Stoot'], ['HP', 'p h', ICON_P, 'Zwaar'], ['LK', 'k', ICON_K, 'Trap'], ['HK', 'k h', ICON_K, 'Zwaar'], ['SP', 's', '<b style="font-size:20px">✦</b>', 'Speciaal'], ['SU', 'u', '<b style="font-size:13px">SUPER</b>', '']];
  let layout = null;
  const btnEls = [[], []];
  for (let p = 0; p < 2; p++) for (const [k, cls, ic, lbl] of BTNS) { const b = document.createElement('div'); b.className = 'vd-b ' + cls; b.dataset.b = k; b.dataset.p = p; b.innerHTML = ic + (lbl ? `<small>${lbl}</small>` : ''); pad.appendChild(b); btnEls[p].push(b); }
  const sticks = [...pad.querySelectorAll('.vd-stick')];
  function layoutPad() {
    const W = R.W, H = R.H; if (!W || !H) return;
    const two = G && G.mode === 'vs2', s = Math.max(.72, Math.min(1.3, H / 412)), L = { two, s, pl: [] };
    for (let p = 0; p < 2; p++) {
      const human = G && (p === 0 || two) && G.view === 'fight';
      const mir = p === 1, mx = x => mir ? W - x : x;
      const br = (two ? 27 : 33) * s, sr = (two ? 46 : 56) * s;
      const cx = two ? W * .33 : W - 150 * s, cy = H - (two ? 78 : 96) * s, dx = (two ? .82 : 1) * s, ox = two ? (mir ? -1 : 1) : 1;
      const pos = { LP: [cx - 56 * dx * ox, cy - 34 * dx], HP: [cx + 18 * dx * ox, cy - 56 * dx], LK: [cx - 40 * dx * ox, cy + 40 * dx], HK: [cx + 36 * dx * ox, cy + 18 * dx],
        SP: [cx - 122 * dx * ox, cy + 34 * dx], SU: [cx + 70 * dx * ox, cy - 118 * dx] };
      const P = { human, br, sr, b: {}, stick: two ? [W * .1 + 10, H - 82 * s] : [W * .14 + 16, H - 98 * s], zone: two ? (mir ? [W * .5, W] : [0, W * .5]) : [0, W * .5] };
      if (mir) P.stick[0] = W - P.stick[0];
      btnEls[p].forEach(el => {
        const k = el.dataset.b; let [x, y] = pos[k]; if (two && mir) x = W - x;
        const r = k === 'SP' || k === 'SU' ? br * .82 : (k[0] === 'H' ? br * 1.04 : br);
        const vis = human && (k !== 'SP' || opt.easy);
        P.b[k] = vis ? [x, y, r] : null;
        el.style.display = vis ? 'flex' : 'none';
        Object.assign(el.style, { left: (x - r) + 'px', top: (y - r) + 'px', width: r * 2 + 'px', height: r * 2 + 'px' });
        el.querySelector('small') && (el.querySelector('small').style.fontSize = Math.max(8, 10 * s * (two ? .85 : 1)) + 'px');
      });
      const st = sticks[p]; st.style.display = human ? 'block' : 'none'; Object.assign(st.style, { width: P.sr * 2 + 'px', height: P.sr * 2 + 'px', marginLeft: -P.sr + 'px', marginTop: -P.sr + 'px', left: P.stick[0] + 'px', top: P.stick[1] + 'px' });
      L.pl.push(P);
    }
    layout = L;
  }
  const ptrs = new Map();
  function whoAt(x) { return layout && layout.two ? (x < R.W / 2 ? 0 : 1) : 0; }
  function nearestBtn(p, x, y) { let best = null, bd = 1e9; for (const [k, b] of Object.entries(layout.pl[p].b)) { if (!b) continue; const d = Math.hypot(x - b[0], y - b[1]); if (d < b[2] * 1.28 && d < bd) { bd = d; best = k; } } return best; }
  function setStick(p, ptr, x, y) {
    const P = layout.pl[p], dx = x - ptr.ox, dy = y - ptr.oy, d = Math.hypot(dx, dy), r = P.sr;
    let bits = 0;
    if (d > r * .26) { const a = Math.atan2(-dy, dx), sec = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
      bits = [Core.R, Core.R | Core.U, Core.U, Core.U | Core.L, Core.L, Core.L | Core.D, Core.D, Core.D | Core.R][sec]; }
    setDir(p, bits);
    const k = Math.min(1, r * .62 / Math.max(1, d)); sticks[p].firstChild.style.transform = `translate(${dx * k}px,${dy * k}px)`;
  }
  function press(p, k, on) {
    const bit = BMAP[k], el = btnEls[p].find(e => e.dataset.b === k);
    if (on) { PADS[p].held |= bit; snap(p); el && el.classList.add('on'); Sfx.play('__warm'); }
    else { PADS[p].held &= ~bit; snap(p); el && el.classList.remove('on'); }
  }
  pad.addEventListener('pointerdown', e => {
    if (!G || G.view !== 'fight' || !layout) return; e.preventDefault();
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, p = whoAt(x), P = layout.pl[p];
    if (!P.human) return;
    const b = nearestBtn(p, x, y);
    if (b) { ptrs.set(e.pointerId, { kind: 'b', p, b }); press(p, b, true); }
    else if (x >= P.zone[0] && x <= P.zone[1] && (!layout.two || Math.abs(x - P.stick[0]) < R.W * .22)) {
      if ([...ptrs.values()].some(q => q.kind === 's' && q.p === p)) return;
      const ox = Math.max(P.zone[0] + P.sr, Math.min(P.zone[1] - P.sr, x)), oy = Math.max(R.H * .25, Math.min(R.H - P.sr * .7, y));
      const q = { kind: 's', p, ox, oy }; ptrs.set(e.pointerId, q);
      Object.assign(sticks[p].style, { left: ox + 'px', top: oy + 'px' }); sticks[p].classList.add('on'); setStick(p, q, x, y);
    } else return;
    try { pad.setPointerCapture(e.pointerId); } catch (er) {}
  });
  pad.addEventListener('pointermove', e => {
    const q = ptrs.get(e.pointerId); if (!q || !layout) return;
    const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (q.kind === 's') setStick(q.p, q, x, y);
    else { const b = nearestBtn(q.p, x, y); if (b && b !== q.b) { press(q.p, q.b, false); q.b = b; press(q.p, b, true); } }
  });
  const ptrUp = e => {
    const q = ptrs.get(e.pointerId); if (!q) return; ptrs.delete(e.pointerId);
    if (q.kind === 's') { setDir(q.p, 0); sticks[q.p].firstChild.style.transform = ''; sticks[q.p].classList.remove('on'); if (layout) Object.assign(sticks[q.p].style, { left: layout.pl[q.p].stick[0] + 'px', top: layout.pl[q.p].stick[1] + 'px' }); }
    else press(q.p, q.b, false);
  };
  pad.addEventListener('pointerup', ptrUp); pad.addEventListener('pointercancel', ptrUp);
  function releaseAll() { ptrs.clear(); for (let p = 0; p < 2; p++) { PADS[p].dir = PADS[p].held = PADS[p].pend = 0; PADS[p].q.length = 0; sticks[p].firstChild.style.transform = ''; sticks[p].classList.remove('on'); } btnEls.flat().forEach(b => b.classList.remove('on')); KEYS.clear(); }
  // keyboard (desktop testing): P1 WASD + J I K O (L = Speciaal, Space = Super); P2 arrows + numpad 4 5 1 2 (6 = Speciaal, 3 = Super)
  const KEYS = new Set();
  const KMAP = [{ KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R', KeyJ: 'LP', KeyI: 'HP', KeyK: 'LK', KeyO: 'HK', KeyL: 'SP', Space: 'SU' },
    { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', Numpad4: 'LP', Numpad5: 'HP', Numpad1: 'LK', Numpad2: 'HK', Numpad6: 'SP', Numpad3: 'SU' }];
  document.addEventListener('keydown', e => {
    if (current !== 'vd' || !G) return;
    if (e.code === 'Escape' && G.view === 'fight' && !anyModal()) { openPause(); return; }
    if (G.view === 'vs' && (e.code === 'Enter' || e.code === 'Space')) { G.vsT = 999; return; }
    if (G.view !== 'fight' || anyModal()) return;
    for (let p = 0; p < 2; p++) { const k = KMAP[p][e.code]; if (!k) continue; e.preventDefault(); if (KEYS.has(e.code)) return; KEYS.add(e.code);
      if (k.length === 1) setDir(p, PADS[p].dir | Core[k]); else press(p, k, true); }
  });
  document.addEventListener('keyup', e => {
    if (!KEYS.has(e.code)) return; KEYS.delete(e.code);
    for (let p = 0; p < 2; p++) { const k = KMAP[p][e.code]; if (!k) continue; if (k.length === 1) setDir(p, PADS[p].dir & ~Core[k]); else press(p, k, false); }
  });
  // stick changes are queued so a quick motion (↓↘→) survives a slow frame: every simulation step takes one change
  // (button presses go through the same queue, so their order relative to the stick is kept)
  function snap(p) { const P = PADS[p]; P.q.push(P.dir | P.held); if (P.q.length > 8) P.q.shift(); }
  function setDir(p, bits) { const P = PADS[p]; if (P.dir === bits) return; P.dir = bits; snap(p); }
  function padBits(p) { const P = PADS[p]; const b = (P.q.length ? P.q.shift() : P.dir | P.held) | P.pend; P.pend = 0; return b; }
  function updateSuperBtns() {
    if (!M) return;
    for (let p = 0; p < 2; p++) { const el = btnEls[p][5], ready = M.P[p].meter >= 100; if (el.classList.contains('ready') !== ready) el.classList.toggle('ready', ready); }
  }

  /* ---------- one simulation step ---------- */
  const NUM = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
  function stepGame() {
    const ins = [0, 0];
    for (let p = 0; p < 2; p++) {
      if (window.__vdFreeze && p === 1) ins[p] = 0;
      else if (AIs[p]) ins[p] = AIs[p].input(M);
      else if (G.dummy && p === 1) ins[p] = G.dummy === 'cpu' ? 0 : Core.dummyBits(M, 1, G.dummy);
      else ins[p] = padBits(p);
    }
    if (G.mode === 'train') {                                  // input display for player 1
      const F = M.P[0], b = ins[0];
      if (b !== lastBits && M.phase === 'fight') { const d = Core.relDir(b, F.face), bb = ['LP', 'HP', 'LK', 'HK', 'SP', 'SU'].filter(k => (b & BMAP[k]) && !(lastBits & BMAP[k])).map(k => ({ LP: 'S', HP: 'S+', LK: 'T', HK: 'T+', SP: '✦', SU: 'SUPER' })[k]).join(' ');
        if (d !== 5 || bb) { inputLog.push({ d, b: bb }); inputLog.n = (inputLog.n || 0) + 1; if (inputLog.length > 14) inputLog.shift(); } }
      lastBits = b;
    }
    Core.step(M, ins);
    for (const e of M.ev) { R.event(M, e); feedback(e); const c = EVC[e.t] || (EVC[e.t] = [0, 0]); c[e.side ? 1 : 0]++; }
    if (M.over && !G.endAt) G.endAt = M.f + 80;
    if (G.endAt && M.f === G.endAt) matchOver();
  }
  const panOf = x => Math.max(-1, Math.min(1, (x - R.camX) / 500)) * .5;
  const human = side => G && (G.mode === 'vs2' || (side === 0));
  function feedback(e) {
    const a = e.a || {};
    switch (e.t) {
      case 'hit': sfx(a.heavy ? 'vdHitH' : 'vdHitL', 0, panOf(a.x)); if (opt.vib && (human(e.side) || human(1 - e.side))) vibrate(a.heavy ? 28 : 12);
        if (a.kind === 'p' && a.src === 'waf') sfx('vdCrunch'); break;
      case 'block': sfx('vdBlock', 0, panOf(a.x)); break;
      case 'swing': sfx(a.heavy ? 'vdWhooshH' : 'vdWhoosh'); break;
      case 'special': sfx({ proj: 'vdCast', aa: 'vdRise', rush: 'vdRush', grab: 'vdWhooshH', counter: 'vdChime', tele: 'vdTele', hop: 'vdRise', poke: 'vdRush' }[a.role] || 'vdCast'); break;
      case 'proj': sfx(a.k === 'laser' ? 'vdLaser' : a.k === 'golf' ? 'vdSplash' : 'vdProj'); break;
      case 'super': sfx('vdSuper'); if (opt.vib && human(e.side)) vibrate(40); break;
      case 'ko': sfx('vdKO'); if (opt.vib) vibrate(60); break;
      case 'round': sfx('vdBell'); break;
      case 'fight': sfx('vdFight'); break;
      case 'jump': sfx('vdJump'); break;
      case 'land': sfx('vdLand'); break;
      case 'down': sfx('vdThud'); break;
      case 'grab': sfx('vdGrab'); break;
      case 'throwhit': sfx('vdHitH'); break;
      case 'tech': sfx('vdBlock'); break;
      case 'tele': sfx('vdTele'); break;
      case 'counter': sfx('vdChime'); break;
      case 'clash': sfx('vdClash'); break;
      case 'dizzy': sfx('vdDizzy'); break;
      case 'timeup': sfx('vdBell'); break;
      case 'roundend': if (a.perfect) sfx('vdPerfect'); break;
      case 'matchend': { const w = e.side; if (G.mode === 'vs2' || G.mode === 'train') sfx('vdWin'); else sfx(w === 0 ? 'vdWin' : 'vdLose'); break; }
    }
  }

  /* ---------- starting fights ---------- */
  let EVC = {};                                                  // event counts per fight (tests)
  function newFight() {
    EVC = {};
    const [a, b] = G.picks, diff = G.mode === 'arcade' ? run.diff : opt.diff;
    const boss = G.mode === 'arcade' && b === 'nevel' && diff !== 'makkelijk' ? { hp: diff === 'moeilijk' ? 1.2 : 1.12, dmg: diff === 'moeilijk' ? 1.12 : 1.06 } : null;
    const easy = !!opt.easy;
    M = Core.newMatch({ p: [{ ch: a, easy, pal: 0 }, { ch: b, easy: G.mode === 'vs2' ? easy : false, pal: a === b ? 1 : 0, boost: boss }], stage: G.stage, train: G.mode === 'train' ? { inf: 1, meter: G.meter } : null, noIntro: G.mode === 'train' });
    AIs = [null, G.mode === 'arcade' || G.mode === 'cpu' ? AI.create(diff, (Math.random() * 1e9) | 0, 1) : null];
    G.dummy = G.mode === 'train' ? (G.dummyMode || 'stand') : null;
    if (G.mode === 'train' && G.dummy === 'cpu') AIs[1] = AI.create('normaal', 7, 1);
    G.endAt = 0; G.done = false; inputLog = []; lastBits = 0; tick = 0; acc = 0;
    R.setStage(G.stage); R.reset(); releaseAll();
    window.__vdM = M;
  }
  function startVs() { closeModals(); newFight(); G.vsT = 0; R.clearHud(); R.layersVisible(false); R.hiRes(true); setView('vs'); sfx('vdVs'); }
  function startFight() { R.hiRes(false); R.layersVisible(true); setView('fight'); R.reset(); fit(); kick(); }
  function restartFight() { closeModals(); newFight(); R.hiRes(false); R.layersVisible(true); setView('fight'); fit(); }
  /* ---------- the VS screen ---------- */
  stageEl.addEventListener('pointerdown', () => { if (G && G.view === 'vs' && G.vsT > 20) G.vsT = 999; });
  const VSC = { dex: ['#ff7a1a', '#5a2a0e'], truus: ['#7a3fb0', '#2a1240'], moer: ['#2a8ad0', '#0e2a4a'], sol: ['#1f9a4a', '#0e3a1e'], bram: ['#26346a', '#0e1230'], kiki: ['#5e45a0', '#1e1236'], sjaak: ['#e2262f', '#4a0e10'], nevel: ['#5a2a8a', '#140a22'] };
  function vsFrame() {
    G.vsT++; const t = G.vsT, g = R.g, W = R.W, H = R.H, d = R.cd;
    if (t > 150) { startFight(); return; }
    g.setTransform(d, 0, 0, d, 0, 0);
    const [a, b] = G.picks, ca = VSC[a], cb = VSC[b], u = Math.min(1, t / 18), e = 1 - Math.pow(1 - u, 3);
    let gr = g.createLinearGradient(0, 0, W * .5, H); gr.addColorStop(0, ca[0]); gr.addColorStop(1, ca[1]); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * .58, 0); g.lineTo(W * .42, H); g.lineTo(0, H); g.fill();
    gr = g.createLinearGradient(W, 0, W * .5, H); gr.addColorStop(0, cb[0]); gr.addColorStop(1, cb[1]); g.fillStyle = gr; g.beginPath(); g.moveTo(W * .58, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * .42, H); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.moveTo(W * .58, 0); g.lineTo(W * .42, H); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 14; i++) { const y = ((i * 53 + t * 6) % (H + 60)) - 30; g.fillRect(0, y, W, 3); }
    const sc = H / 230, A = CAST_BY[a], B = CAST_BY[b];
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    Draw.body(g, A, 0, t < 70 ? 'guard' : 'guard', (W * .22 - (1 - e) * W * .5) * d, (H * .98) * d, sc * d, 1, t);
    Draw.body(g, B, a === b ? 1 : 0, 'guard', (W * .78 + (1 - e) * W * .5) * d, (H * .98) * d, sc * d, -1, t);
    g.restore(); g.setTransform(d, 0, 0, d, 0, 0);
    const vs = Draw.text('VS', Math.round(H * .26), ['#fffbe0', '#ffd23a', '#ff6a1a'], { stroke: '#1e0a2e', sw: .1, italic: 1 }), vk = t < 24 ? 2.4 - (t / 24) * 1.4 : 1 + Math.sin(t / 6) * .03;
    g.drawImage(vs.c, W / 2 - vs.w * vk / 2, H * .42 - vs.h * vk / 2, vs.w * vk, vs.h * vk);
    const na = Draw.text(A.full, Math.round(H * .085), '#fff', { stroke: '#1e0a2e', sw: .18 }), nb = Draw.text(B.full, Math.round(H * .085), '#fff', { stroke: '#1e0a2e', sw: .18 });
    g.globalAlpha = e; g.drawImage(na.c, 16, H * .06); g.drawImage(nb.c, W - nb.w - 16, H * .06);
    if (t > 30) { const qa = Draw.text('“' + A.intro + '”', Math.round(H * .045), '#ffe9a8', { stroke: '#1e0a2e', sw: .2, w: 700, italic: 1 }), qb = Draw.text('“' + B.intro + '”', Math.round(H * .045), '#ffe9a8', { stroke: '#1e0a2e', sw: .2, w: 700, italic: 1 });
      g.globalAlpha = Math.min(1, (t - 30) / 12); g.drawImage(qa.c, 16, H * .06 + na.h); g.drawImage(qb.c, W - qb.w - 16, H * .06 + nb.h); }
    if (G.mode === 'arcade') { const st = Draw.text(`Gevecht ${run.idx + 1} van ${run.order.length}`, Math.round(H * .05), '#fff', { stroke: '#1e0a2e', sw: .2, w: 800 }); g.globalAlpha = .9; g.drawImage(st.c, W / 2 - st.w / 2, H * .86); }
    g.globalAlpha = 1;
  }

  /* ---------- character select ---------- */
  const gridEl = $('#vdGrid');
  function openSelect(mode) {
    G = Object.assign(G || {}, { mode, picks: [null, null], cur: 0, stage: null, stageSel: -1, anim: 40 });
    closeModals(); renderGrid(); setView('sel'); fit(); drawPreviews();
  }
  function selTitle() {
    const m = G.mode, c = G.cur;
    if (m === 'vs2') return c === 0 ? 'Speler 1: kies je vechter' : 'Speler 2: kies je vechter';
    if (m === 'cpu') return c === 0 ? 'Kies je vechter' : 'Kies je tegenstander';
    if (m === 'train') return c === 0 ? 'Kies je vechter' : 'Kies je oefenpop';
    return 'Kies je vechter';
  }
  function renderGrid() {
    gridEl.innerHTML = CAST.map(C => { const lock = C.boss && !stats.unlocked, a = G.picks[0] === C.id, b = G.picks[1] === C.id;
      return `<button class="vd-card${lock ? ' lock' : ''}${a ? ' p1' : ''}${b ? ' p2' : ''}" data-c="${C.id}"><img src="${portrait(C.id)}" alt=""><span>${lock ? '???' : esc(C.nm)}</span>${a ? '<i class="l">' + (G.mode === 'vs2' ? 'S1' : 'JIJ') + '</i>' : ''}${b ? '<i class="r">' + (G.mode === 'vs2' ? 'S2' : G.mode === 'train' ? 'POP' : 'CPU') + '</i>' : ''}</button>`; }).join('');
    $('#vdSelTitle').textContent = selTitle();
    const need2 = G.mode !== 'arcade', ready = G.picks[0] && (!need2 || G.picks[1]);
    $('#vdSelGo').disabled = !ready;
    $('#vdSelHint').textContent = !ready ? 'Tik op een vechter.' : G.mode === 'arcade' ? `Moeilijkheid: ${DIFF.find(d => d[0] === opt.diff)[1]}` : 'Klaar? Vecht!';
    const sb = $('#vdStageBtn'); sb.hidden = G.mode === 'arcade';
    sb.textContent = 'Arena: ' + (G.stageSel < 0 ? 'Willekeurig' : STAGES[G.stageSel].nm);
    sideInfo(0); sideInfo(1);
  }
  function sideInfo(i) {
    const el = i ? $('#vdSideR') : $('#vdSideL'), id = G.picks[i] || G.hover && G.cur === i && G.hover, info = el.querySelector('.vd-info');
    el.classList.toggle('p1', !i); el.classList.toggle('p2', !!i);
    el.style.visibility = (i === 1 && G.mode === 'arcade') ? 'hidden' : '';
    if (!id) { info.innerHTML = `<span class="vd-tag">${i ? (G.mode === 'vs2' ? 'Speler 2' : G.mode === 'train' ? 'Oefenpop' : 'Computer') : (G.mode === 'vs2' ? 'Speler 1' : 'Jij')}</span><b>?</b>`; return; }
    const C = CAST_BY[id], bars = ['Kracht', 'Snelheid', 'Techniek'].map((l, k) => `${l} ${'●'.repeat(C.stat[k])}${'○'.repeat(5 - C.stat[k])}`).join(' · ');
    info.innerHTML = `<span class="vd-tag">${i ? (G.mode === 'vs2' ? 'Speler 2' : G.mode === 'train' ? 'Oefenpop' : 'Computer') : (G.mode === 'vs2' ? 'Speler 1' : 'Jij')}</span><b>${esc(C.full)}</b><em>${esc(C.style)} · ${esc(C.from)}</em><small>${esc(C.bio)}</small><small style="color:#cfc6ef">${bars}</small>`;
  }
  function drawPreviews() {
    for (let i = 0; i < 2; i++) {
      const el = i ? $('#vdSideR') : $('#vdSideL'), c = el.querySelector('canvas'), id = G.picks[i] || (G.cur === i && G.hover);
      const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (r.width < 10 || r.height < 10) continue;
      if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
      if (!id || (i === 1 && G.mode === 'arcade')) continue;
      const C = CAST_BY[id], sc = c.height / 215, t = 40 - G.anim;
      const ph = G.picks[i] ? Math.min(1, t / 18) : 0;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(c.width / 2, c.height - 8 * sc, 50 * sc * C.W, 9 * sc, 0, 0, Math.PI * 2); g.fill();
      const pose = G.picks[i] ? Rig.lerpInto(Rig.P({}), Rig.pose(i ? 'guard' : 'guard'), Rig.pose('flex'), ph < 1 ? Math.sin(ph * Math.PI) : 0) : Rig.pose('guard');
      Draw.body(g, C, i && G.picks[0] === id ? 1 : 0, pose, c.width / 2, c.height - 8 * sc, sc, i ? -1 : 1, t);
    }
  }
  gridEl.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b || !G) return; const id = b.dataset.c, C = CAST_BY[id];
    if (C.boss && !stats.unlocked) { toast('Win eerst het Arcade-toernooi om deze vechter vrij te spelen.'); sfx('vdNo'); return; }
    const i = G.cur;
    G.picks[i] = id; sfx('vdOk'); G.anim = 40;
    if (G.mode !== 'arcade' && i === 0) G.cur = 1;
    renderGrid(); kick();
  });
  $('#vdSideL').addEventListener('click', () => { if (G && G.picks[0] && G.mode !== 'arcade' && !G.picks[1]) { G.picks[0] = null; G.cur = 0; renderGrid(); drawPreviews(); } });
  $('#vdSideR').addEventListener('click', () => { if (G && G.picks[1]) { G.picks[1] = null; G.cur = 1; renderGrid(); drawPreviews(); } });
  $('#vdStageBtn').addEventListener('click', () => { G.stageSel = G.stageSel + 1 >= STAGES.length ? -1 : G.stageSel + 1; sfx('vdSel'); renderGrid(); });
  $('#vdSelBack').addEventListener('click', () => { sfx('vdSel'); if (G && G.mode !== 'arcade' && G.picks[0] && G.cur === 1 && !G.picks[1]) { G.picks[0] = null; G.cur = 0; renderGrid(); drawPreviews(); return; } openStart(); });
  $('#vdSelGo').addEventListener('click', () => {
    if (!G || !G.picks[0]) return; sfx('vdOk');
    if (G.mode === 'arcade') { arcadeNew(G.picks[0]); return; }
    G.stage = G.stageSel >= 0 ? STAGES[G.stageSel].id : STAGES[(Math.random() * STAGES.length) | 0].id;
    if (G.mode === 'train') { G.meter = G.meter || 0; G.dummyMode = G.dummyMode || 'stand'; }
    startVs();
  });

  /* ---------- arcade ---------- */
  function ladder(me) {
    const others = CAST.filter(c => c.id !== me && !c.boss).map(c => c.id);
    for (let i = others.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [others[i], others[j]] = [others[j], others[i]]; }
    if (me === 'nevel') return others; return [...others, 'nevel'];
  }
  function arcadeNew(ch) { run = { ch, diff: opt.diff, order: ladder(ch), idx: 0, cont: 0, time: 0 }; saveRun(); arcadeNext(); }
  function arcadeNext() { const opp = run.order[run.idx]; G = Object.assign(G || {}, { mode: 'arcade', picks: [run.ch, opp], stage: CAST_BY[opp].stage }); startVs(); }

  /* ---------- the end of a match ---------- */
  function matchOver() {
    G.done = true; const w = M.winner, mode = G.mode, me = M.P[0];
    const roundsTxt = `${M.wins[0]} – ${M.wins[1]}`, mx = Math.max(M.P[0].maxCombo, M.P[1].maxCombo);
    if (mode !== 'train') {
      stats.fights++;
      const humans = mode === 'vs2' ? [0, 1] : [0];
      if (w >= 0 && humans.includes(w)) { stats.winsBy[M.P[w].C.id] = (stats.winsBy[M.P[w].C.id] || 0) + 1; }
      if (mode !== 'vs2') { if (w === 0) stats.wins++; else stats.losses++; }
      for (const r of M.rounds) if (r.w >= 0 && humans.includes(r.w)) { if (r.perfect) stats.perfects++; if (r.superKO) stats.superKO++; }
      stats.maxCombo = Math.max(stats.maxCombo, ...humans.map(i => M.P[i].maxCombo));
    }
    const secs = M.rounds.reduce((a, r) => a + r.time, 0) / 60;
    let title = '', text = '', btns = [], pic = w >= 0 ? portrait(M.P[w].C.id, w === 1 && M.P[0].C.id === M.P[1].C.id ? 1 : 0) : '';
    const quote = w >= 0 ? `<q>“${esc(M.P[w].C.quote)}”</q>` : '';
    const line = `Rondes <b>${roundsTxt}</b> · tijd <b>${fmtT(secs)}</b> · langste combo <b>${mx}</b>`;
    if (mode === 'arcade') {
      run.time += secs;
      if (w === 0) {
        run.idx++;
        if (run.idx >= run.order.length) {
          stats.clears++; stats.clearBy[run.ch] = 1; if (!stats.bestTime || run.time < stats.bestTime) stats.bestTime = Math.round(run.time);
          const newUnlock = !stats.unlocked; stats.unlocked = 1;
          if (run.diff === 'moeilijk') stats.bossHard = 1;
          title = '🏆 Kampioen!'; text = `${quote}<b>${esc(me.C.full)}</b> wint het toernooi! Totale tijd <b>${fmtT(run.time)}</b>${run.cont ? ` · ${run.cont}× doorgegaan` : ''}.${newUnlock ? '<br>🎩 <b>Graaf Nevel</b> is nu ook speelbaar!' : ''}`;
          run = null; btns = [['vdEMenu', 'Menu', 0], ['vdEAgain', 'Nog een toernooi ▶', 1]]; sfx('vdChamp');
        } else { title = `${esc(me.C.nm)} wint!`; text = `${quote}${line}${ladderHtml()}`; btns = [['vdEStop', 'Stoppen', 0], ['vdENext', 'Volgende tegenstander ▶', 1]]; }
      } else { title = w < 0 ? 'Gelijkspel!' : `${esc(M.P[1].C.nm)} wint...`; text = `${quote}${line}<br>Doorgaan? Je begint opnieuw tegen dezelfde tegenstander.${ladderHtml()}`; btns = [['vdEStop', 'Stoppen', 0], ['vdECont', 'Doorgaan ▶', 1]]; }
      saveRun();
    } else if (mode === 'train') { title = 'Training'; text = line; btns = [['vdEMenu', 'Menu', 0], ['vdERematch', 'Nog eens ▶', 1]]; }
    else {
      const who = w < 0 ? null : mode === 'vs2' ? (w ? 'Speler 2' : 'Speler 1') : (w ? 'De computer' : 'Jij');
      title = w < 0 ? 'Gelijkspel!' : `${esc(M.P[w].C.nm)} wint!`; text = `${quote}${who ? `<b>${who}</b> wint de wedstrijd. ` : ''}${line}`;
      btns = [['vdEMenu', 'Menu', 0], ['vdEPick', 'Andere vechters', 0], ['vdERematch', 'Revanche ▶', 1]];
    }
    saveStats();
    $('#vdEndPic').innerHTML = pic ? `<img src="${pic}" alt="">` : '';
    $('#vdEndTitle').innerHTML = title; $('#vdEndText').innerHTML = text;
    $('#vdEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    releaseAll(); openModal('vdEndModal');
  }
  function ladderHtml() { if (!run) return ''; return `<div class="vd-ladder">${run.order.map((id, i) => `<img src="${portrait(id)}" class="${i < run.idx ? 'done' : i === run.idx ? 'now' : ''}" alt="">`).join('')}</div>`; }
  $('#vdEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('vdOk');
    switch (b.id) {
      case 'vdENext': arcadeNext(); break;
      case 'vdECont': run.cont++; stats.conts++; saveStats(); saveRun(); arcadeNext(); break;
      case 'vdEStop': run = null; saveRun(); openStart(); break;
      case 'vdEAgain': openSelect('arcade'); break;
      case 'vdERematch': startVs(); break;
      case 'vdEPick': openSelect(G.mode); break;
      case 'vdEMenu': openStart(); break;
    }
  });

  /* ---------- pause, move list ---------- */
  function openPause() {
    if (!G || G.view !== 'fight' || !M) return;
    releaseAll(); sfx('vdSel');
    const tr = G.mode === 'train';
    $('#vdPTrain').innerHTML = tr ? `<div class="opt"><div class="opt-label">Oefenpop</div><div class="seg" data-o="dummyMode">${[['stand', 'Staan'], ['crouch', 'Hurken'], ['jump', 'Springen'], ['block', 'Blokken'], ['cpu', 'Vecht terug']].map(([v, l]) => `<button data-v="${v}" class="${G.dummyMode === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="opt"><div class="opt-label">Supermeter</div><div class="seg" data-o="meter">${[[1, 'Altijd vol'], [0, 'Normaal']].map(([v, l]) => `<button data-v="${v}" class="${(G.meter ? 1 : 0) === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="opt"><div class="opt-label">Invoer tonen</div><div class="seg" data-o="inputs">${[[true, 'Aan'], [false, 'Uit']].map(([v, l]) => `<button data-v="${v}" class="${opt.inputs === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : '';
    $('#vdPOpts').innerHTML = optRows(['easy', 'shake', 'sound', 'music']);
    if (!$('#vdPauseModal').classList.contains('show')) closeModals();
    openModal('vdPauseModal');
  }
  $('#vdPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#vdPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#vdPRestart').addEventListener('click', () => { restartFight(); });
  $('#vdPQuit').addEventListener('click', async () => {
    const msg = G.mode === 'arcade' ? 'Je toernooi wordt bewaard: je kunt later verder bij dit gevecht.' : 'Het gevecht stopt.';
    if (!(await askConfirm('Stoppen?', msg, 'Stoppen'))) { openPause(); return; }
    openStart();
  });
  $('#vdPTrain').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return; const k = b.parentElement.dataset.o, v = b.dataset.v;
    if (k === 'dummyMode') { G.dummyMode = v; G.dummy = v; AIs[1] = v === 'cpu' ? AI.create('normaal', 7, 1) : null; }
    if (k === 'meter') { G.meter = +v; M.train.meter = +v; }
    if (k === 'inputs') { opt.inputs = v === 'true'; saveOpt(); }
    openPause();
  });
  $('#vdPOpts').addEventListener('click', e => onOpt(e, openPause));
  $('#vdPMoves').addEventListener('click', () => openMoves(0));
  function moveRows(C) {
    Core.prep(C);
    const row = (nm, sub, inp, easy) => `<div class="vd-mv"><b>${esc(nm)}${sub ? `<small>${esc(sub)}</small>` : ''}</b>${easy && opt.easy ? `<kbd class="e">${esc(easy)}</kbd>` : ''}<kbd>${esc(inp)}</kbd></div>`;
    const ek = { n: 'Speciaal', f: '→ + Speciaal', d: '↓ + Speciaal' };
    let h = `<div class="vd-mvh">Speciale aanvallen</div>`;
    for (const s of C.sp) { const key = Object.keys(C.easy).find(k => C.easy[k] === s.id); h += row(s.nm, s.desc, `${INPUT_TXT[s.in]} + ${s.b === 'P' ? 'Stoot' : 'Trap'}`, key ? ek[key] : null); }
    h += `<div class="vd-mvh">Supertechniek (volle meter)</div>` + row(C.su.nm, C.su.desc, `${INPUT_TXT[C.su.in]} + ${C.su.b === 'P' ? 'Stoot' : 'Trap'}`, 'SUPER-knop');
    h += `<div class="vd-mvh">Basis</div>` + row('Worp', 'dichtbij, ook om los te breken', '→ of ← + Zware stoot') + row('Blokken', 'laag: hurkend blokken, sprongaanvallen: staand', '← (weg van de ander)')
      + row('Dash', 'snel vooruit of achteruit', '→→ of ←←') + row('Combo', 'lichte aanvallen achter elkaar, eindig met een special', 'Trap, Trap, ↓↘→ ...')
      + row('Veegtrap', 'gooit om, laag blokken', '↓ + Zware trap') + row('Opstoot', 'goed tegen springers', '↓ + Zware stoot');
    return h;
  }
  function openMoves(i) {
    G.movesI = i; const ids = M ? [M.P[0].C.id, M.P[1].C.id] : [G.picks[0]];
    $('#vdMovesTabs').innerHTML = ids.map((id, k) => `<button data-i="${k}" class="${k === i ? 'on' : ''}">${esc(CAST_BY[id].nm)}</button>`).join('');
    $('#vdMovesTitle').textContent = 'Bewegingen';
    $('#vdMovesList').innerHTML = moveRows(CAST_BY[ids[i]]);
    closeModals(); openModal('vdMovesModal');
  }
  $('#vdMovesTabs').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) openMoves(+b.dataset.i); });
  $('#vdMovesOk').addEventListener('click', () => { if (G && G.view === 'fight' && !G.done) openPause(); else closeModals(); });

  /* ---------- the start dialog ---------- */
  const OPTS = { easy: ['Makkelijke specials', 'met een Speciaal-knop'], shake: ['Schermschudden', ''], vib: ['Trillen bij treffers', ''], sound: ['Geluidseffecten', ''], music: ['Achtergrondmuziek', ''] };
  function optRows(keys) { return keys.map(k => `<div class="opt"><div class="opt-label">${OPTS[k][0]}${OPTS[k][1] ? ` <small>· ${OPTS[k][1]}</small>` : ''}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join(''); }
  function onOpt(e, again) {
    const b = e.target.closest('button[data-k]'); if (!b) return false;
    const k = b.dataset.k; opt[k] = b.dataset.v === 'true' || (b.dataset.v !== 'false' && b.dataset.v);
    if (k === 'diff') opt.diff = b.dataset.v;
    saveOpt(); R.optShake = opt.shake; Sfx.refresh && Sfx.refresh();
    if (k === 'easy' && M) { M.P[0].easy = opt.easy; if (G.mode === 'vs2') M.P[1].easy = opt.easy; layoutPad(); }
    sfx('vdSel'); again(); return true;
  }
  function renderStart() {
    const C = run && CAST_BY[run.ch];
    $('#vdContinue').hidden = !run;
    if (run) $('#vdContinue').innerHTML = `<img src="${portrait(run.ch)}" alt=""><span><b>Verder met je toernooi</b><small>${esc(C.nm)} · gevecht ${run.idx + 1} van ${run.order.length} · ${DIFF.find(d => d[0] === run.diff)[1]}</small></span><em>Verder ▶</em>`;
    $('#vdModes').innerHTML = MODES.map(([id, ic, nm, sub]) => `<button class="vd-mode" data-m="${id}"><span class="ic">${ic}</span><b>${nm}</b><small>${sub}</small></button>`).join('');
    $('#vdOpts').innerHTML = `<div class="opt"><div class="opt-label">Moeilijkheid computer</div><div class="seg">${DIFF.map(([v, l]) => `<button data-k="diff" data-v="${v}" class="${opt.diff === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>` + optRows(['easy', 'shake', 'vib', 'sound', 'music']);
    const all = CAST.every(c => stats.winsBy[c.id]);
    $('#vdStats').innerHTML = [['Gewonnen', `${stats.wins}/${stats.fights}`], ['Toernooien', stats.clears], ['Beste tijd', stats.bestTime ? fmtT(stats.bestTime) : '–']].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('')
      + `<div class="vd-trophy-line" style="grid-column:1/-1">Gewonnen met ${CAST.filter(c => stats.winsBy[c.id]).length}/${CAST.length} vechters${all ? ' 🎉' : ''} · ${stats.perfects} perfecte rondes · ${stats.superKO} superfinishes</div>`;
  }
  function openStart() {
    releaseAll(); closeModals();
    G = { view: 'start', mode: null, picks: [null, null] }; M = null; AIs = [null, null];
    setView('start'); fit(); attract();
    renderStart(); openModal('vdStartModal');
  }
  let attractM = null;
  function attract() {                                           // a still scene behind the dialog (drawn once, no loop)
    try {
      const st = STAGES[(Math.random() * STAGES.length) | 0].id, ids = CAST.filter(c => !c.boss || stats.unlocked).map(c => c.id), a = ids[(Math.random() * ids.length) | 0];
      let b = ids[(Math.random() * ids.length) | 0]; if (b === a) b = ids[(ids.indexOf(a) + 1) % ids.length];
      const Ma = Core.newMatch({ p: [{ ch: a }, { ch: b }], stage: st, noIntro: 1 }); Ma.phase = 'ready'; Ma.P[0].x = 520; Ma.P[1].x = 680;
      R.setStage(st); R.reset(); R.layersVisible(true); attractM = Ma; R.frame(Ma, { noHud: 1 });
    } catch (e) { console.error(e); }
  }
  $('#vdModes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; sfx('vdOk'); openSelect(b.dataset.m); });
  $('#vdContinue').addEventListener('click', () => { if (!run) return; sfx('vdOk'); G = { view: 'start', mode: 'arcade', picks: [null, null] }; arcadeNext(); });
  $('#vdOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#vdStartBack').addEventListener('click', () => { closeModals(); quit(); });
  $('#vdRotBack').addEventListener('click', () => { closeModals(); quit(); });
  let toastT = 0;
  function toast(t) { const el = $('#vdToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('vd'); R.optShake = opt.shake;
    requestAnimationFrame(() => fit());
    if (G && G.view === 'fight' && M && !G.done) { setView('fight'); fit(); R.frame(M, hudOpt()); openPause(); return; }
    openStart();
  }
  function quit() { attractM = null; if (raf > 0) cancelAnimationFrame(raf); raf = 0; clearTimeout(pollT); releaseAll(); closeModals(); G = null; M = null; AIs = [null, null]; scr.classList.remove('sel', 'fight', 'land'); show('menu'); refreshMenu(); }
  // back: during a fight it pauses; on the select screen it goes back to the start dialog
  function leave() {
    if (G && G.view === 'fight' && M && !G.done) { setTimeout(() => { if (current === 'vd' && !anyModal()) openPause(); }, 0); return; }
    if (G && G.view === 'sel') { setTimeout(() => { if (current === 'vd') openStart(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'vd' && G && G.view === 'fight' && !G.done && !anyModal()) openPause(); });

  /* ---------- test hooks ---------- */
  window.__vd = {
    get M() { return M; }, get G() { return G; }, get R() { return R; }, opt, stats: () => stats, run: () => run, PADS, get layout() { return layout; },
    frames: () => frames.slice(), running: () => raf > 0 || raf === -1, openStart, openSelect, openPause, startVs, quit, step: n => { for (let i = 0; i < n && M; i++) stepGame(); },
    finite: () => [acc, lastT, tick].every(Number.isFinite) && (!M || [M.timer, M.P[0].x, M.P[1].x, M.P[0].hp, M.P[1].hp].every(Number.isFinite)),
    nearlyWin(side = 0) { if (!M) return; const V = M.P[1 - side]; V.hp = Math.min(V.hp, 1); },
    btnCenter(p, k) { const b = layout && layout.pl[p].b[k]; if (!b) return null; const r = stageEl.getBoundingClientRect(); return { x: r.left + b[0], y: r.top + b[1] }; },
    stickCenter(p) { const r = stageEl.getBoundingClientRect(); return { x: r.left + layout.pl[p].stick[0], y: r.top + layout.pl[p].stick[1], r: layout.pl[p].sr }; },
    quality: () => quality, level: () => level,
    inputs: () => inputLog.length,
    cur: () => current,
    evc: (t, side) => (EVC[t] || [0, 0])[side == null ? 0 : side] + (side == null ? (EVC[t] || [0, 0])[1] : 0),
    freezeCpu(v) { window.__vdFreeze = !!v; }, cpuBoth(lvl = 'normaal') { AIs = [AI.create(lvl, 11, 0), AI.create(lvl, 12, 1)]; }, meter(p, v) { if (M) M.P[p].meter = v; },
  };
  return { enter, leave, hasSave: () => !!store.get('vd.run', null) };
