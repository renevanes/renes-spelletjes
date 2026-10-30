  /* ================= ui.js: screens, tap input, the loop, HUD, close-ups, map, results, save/resume ================= */
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const STEP = 1000 / 60;
  const opt = Object.assign({ sound: true, world: 0 }, store.get('wk.settings', {}));
  Sfx.gate('wk', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('wk.settings', opt);
  const sfx = (n, a, pan) => { if (opt.sound) Sfx.play(n, a, pan); };
  let stats = Object.assign({ lv: {}, plays: 0, wins: 0, hints: 0, hits: 0, beaten: 0, stars: 0, nohint: 0, three: 0, caught: 0, w2: 0 }, store.get('wk.stats', {}));
  const doneLv = i => !!(stats.lv[i] && stats.lv[i].s);
  const starsTotal = () => { let s = 0; for (const k in stats.lv) s += stats.lv[k].s || 0; return s; };
  function saveStats() {
    let beaten = 0, nohint = 0, three = 0; for (const k in stats.lv) { const r = stats.lv[k]; if (r.s) beaten++; if (r.s && r.h === 0) nohint++; if (r.s >= 3) three++; }
    let w2 = 1; for (let i = PER; i < 2 * PER; i++) if (!doneLv(i)) w2 = 0;
    Object.assign(stats, { beaten, nohint, three, stars: starsTotal(), w2 }); store.set('wk.stats', stats);
  }
  const worldOf = i => Math.min(WORLDS.length - 1, Math.floor(i / PER));
  const worldLevels = w => { const a = []; for (let i = w * PER; i < (w === WORLDS.length - 1 ? NL : (w + 1) * PER); i++) a.push(i); return a; };
  const worldOpen = w => w === 0 || (starsTotal() >= WORLDS[w].need && doneLv(w * PER - 1));
  const levelOpen = i => { const w = worldOf(i); return worldOpen(w) && (i === w * PER || doneLv(i - 1)); };
  const TIPS = { 0: 'Tik op de vloer om te lopen. Tik op iets om het te gebruiken of te duwen.', 1: 'Pak iets op. Tik dan op het ding in je rugzak, en daarna waar je het wilt gebruiken.', 2: 'Nieuw: de Blaf!-knop 🐶. Daarmee kan Woef iemand laten schrikken.', 3: 'Sommige dingen hebben knoppen. Loop erheen en kies!', 9: 'Tik op twee dingen in je rugzak om ze samen te voegen.' };
  const TAUNT = ['Hihi! Raak!', 'Mwahaha!', 'Haha! Dat zag je niet aankomen!', 'Probeer het nog maar eens, Woef!', 'Hahaha! Mijn machine is de beste!'];

  const scr = $('#wk'), stageEl = $('#wkStage'), cv = $('#wkCv'), R = Art.create(cv);
  const H = { top: $('#wkTop'), title: $('#wkTitle'), stars: $('#wkStars'), side: $('#wkSide'), inv: $('#wkInv'), hint: $('#wkHintBtn'), bark: $('#wkBark'), msg: $('#wkMsg'), cu: $('#wkCu'), intro: $('#wkIntro'), map: $('#wkMap'), toast: $('#wkToast') };
  let GS = null, L = null, S = null, sel = null, raf = 0, lastT = 0, acc = 0, frames = [], quality = 0, lastPh = 0, saveT = 0;
  const now = () => performance.now();
  let run = store.get('wk.save', null);
  const saveRun = () => { if (GS && GS.view === 'play' && S && !S.done && GS.lv != null) { run = { lv: GS.lv, S }; try { store.set('wk.save', run); } catch (e) {} } };
  const clearRun = () => { run = null; store.del('wk.save'); };

  /* ---------- layout: the room is as big as possible, the controls beside it (landscape) or below it (portrait) ---------- */
  let port = false;
  function fit() {
    const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const W = r.width, Hh = r.height, big = document.documentElement.classList.contains('big-text');
    port = Hh > W * 1.05;
    const d = Math.min(window.__wkDpr || [2, 1.6, 1.25, 1, .85, .72][quality], devicePixelRatio || 1);
    R.resize(W, Hh, d);
    let s, rx, ry;
    if (port) {
      const topH = 54, botH = big ? 112 : 96, msgH = big ? 96 : 80;
      s = Math.min((W - 8) / 14, (Hh - topH - botH - msgH) / 9); rx = (W - 14 * s) / 2; ry = topH + Math.max(0, (Hh - topH - botH - msgH - 9 * s) / 3);
      scr.classList.add('port'); scr.classList.remove('land');
      Object.assign(H.msg.style, { left: '10px', right: '10px', top: (ry + 9 * s + 8) + 'px', width: 'auto', bottom: 'auto' });
    } else {
      const side = big ? 112 : 98;
      s = Math.min((W - side - 18) / 14, (Hh - 10) / 9); rx = 8 + (W - side - 8 - 14 * s) / 2; ry = (Hh - 9 * s) / 2;
      scr.classList.add('land'); scr.classList.remove('port');
      Object.assign(H.msg.style, { left: (rx + 14 * s * .25) + 'px', width: (14 * s * .55) + 'px', right: 'auto', top: (ry + 8) + 'px', bottom: 'auto' });
    }
    R.setRoom(rx, ry, s);
    scr.style.setProperty('--rx', rx + 'px'); scr.style.setProperty('--ry', ry + 'px'); scr.style.setProperty('--rw', 14 * s + 'px'); scr.style.setProperty('--rh', 9 * s + 'px');
    if (S && L) draw(0);
  }
  window.addEventListener('resize', () => { if (current === 'wk') setTimeout(fit, 60); });

  /* ---------- the loop: fixed 60 Hz logic, a frame per animation frame, stopped when nothing moves ---------- */
  const stopped = () => !GS || GS.view !== 'play' || !S || GS.intro || GS.manual || anyModal();
  function kick() { if (!raf && current === 'wk' && !stopped()) { lastT = now(); raf = requestAnimationFrame(loop); } }
  function loop(ts) {
    raf = 0;
    if (current !== 'wk' || stopped()) { if (S && L && GS && GS.view === 'play') draw(0); return; }
    frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    const dt = Math.min(100, Math.max(0, ts - lastT)); lastT = ts;
    if (!S.done) {
      acc += dt * (window.__wkSpeed || 1); let n = 0;
      while (acc >= STEP && n < 8) { acc -= STEP; n++; stepGame(); if (!S || GS.view !== 'play') return; }
      if (n >= 8) acc = 0;
      perfWatch(dt);
    }
    draw(dt);
    if (stopped()) return;
    if (S.done && R.idle()) return;
    raf = requestAnimationFrame(loop);
  }
  let pwT = 0, pwN = 0;
  function perfWatch(dt) { pwT += dt; pwN++; if (pwN < 60) return; const avg = pwT / pwN; pwT = 0; pwN = 0; if (avg > 18.2 && quality < 5) { quality++; fit(); } }
  function draw(dt) { if (!S || !L) return; R.frame(L, S, { dt, sel, arrow: Core.arrow(L, S) }); }

  /* ---------- one logic step and what it means for sound and HUD ---------- */
  const ATK = { suck: 'wkSuck', drop: 'wkDrip', tickle: 'wkGiggle', mag: 'wkMag', bump: 'wkBoing', splash: 'wkSplash', wind: 'wkWhoosh', pie: 'wkWhoosh', stamp: 'wkStamp', bubble: 'wkBubble', zap: 'wkZap', bonk: 'wkBoing', rain: 'wkRain', ring: 'wkRing' };
  function stepGame() {
    const acts = S.acts, hits = S.hits;
    Core.step(L, S);
    handle(S.ev);
    const z = Core.zones(L, S)[0], ph = z ? z.ph : 0;
    if (ph !== lastPh) { if (ph === 1) sfx('wkWarn'); if (ph === 2 && ATK[z.kind]) sfx(ATK[z.kind], 0, Math.max(-1, Math.min(1, ((z.x0 + z.x1) / 2 - 7) / 7)) * .5); lastPh = ph; }
    const W = S.w;
    if (W.m === 'walk' && W.mt % 17 === 1) sfx('wkStep', 0, (W.x - 7) / 14);
    if (W.m === 'climb' && W.mt % 18 === 1) sfx('wkClimb');
    if (W.m === 'push' && W.mt % 26 === 1) sfx('wkPush');
    if (S.acts !== acts || S.hits !== hits) { saveRun(); hudStars(); }
    if (++saveT >= 300) { saveT = 0; saveRun(); }
    if (S.done && !GS.resultsUp) results();
  }
  const FX = { pop: 'wkPop', throw: 'wkWhoosh', suck: 'wkSuck', sock: 'wkPlop', squeak: 'wkSqueak', giggle: 'wkGiggle', click: 'wkClick', clunk: 'wkClank', crash: 'wkCrash', bonk: 'wkThud', clank: 'wkClank', nom: 'wkNom', door: 'wkDoor', place: 'wkPlace', lever: 'wkLever', crashbelow: 'wkCrash', valve: 'wkValve', splashfuse: 'wkFizz', whirr: 'wkWhirr', cook: 'wkCook', sniff: 'wkSniff', sneeze: 'wkSneeze', buzz: 'wkNo', alarm: 'wkAlarm', curtain: 'wkWhoosh', pry: 'wkClick', pour: 'wkPour', bigbubble: 'wkBubble', zapself: 'wkZap', turn: 'wkClick', fish: 'wkPick', jam: 'wkCrash', flap: 'wkFlap', keydrop: 'wkTing', unlock: 'wkClick', freeze: 'wkFreeze', tick: 'wkTick', yawn: 'wkYawn', unwind: 'wkUnwind', roll: 'wkRoll', domino: 'wkDomino', button: 'wkClick' };
  let hitN = 0;
  function handle(evs) {
    for (const e of evs) {
      R.event(L, S, e); const a = e.a || {};
      switch (e.t) {
        case 'say': msg(a.who, a.text); if (a.who === 'k') sfx('wkKarel'); break;
        case 'take': sfx('wkPick'); hudInv(); break;
        case 'inv': hudInv(); break;
        case 'no': sfx('wkNo'); break;
        case 'bark': sfx('wkBark'); break;
        case 'hop': sfx('wkHop'); break;
        case 'reach': sfx('wkReach'); break;
        case 'push': sfx('wkPush'); break;
        case 'pushed': sfx('wkThud'); break;
        case 'hit': stats.hits++; sfx('wkDizzy'); vib(30); if (hitN++ % 2 === 0 && !msgBusy()) msg('k', TAUNT[(S.hits + S.t) % TAUNT.length]); break;
        case 'fx': if (FX[a.k]) sfx(FX[a.k]); if (a.k === 'beep') sfx('wkBeep', a.n); if (a.k === 'beep' || a.k === 'buzz') renderCu(); break;
        case 'cu': renderCu(); break;
        case 'stage': sfx('wkStage'); break;
        case 'break': sfx('wkRumble'); vib(40); hideCu(); sel = null; hudInv(); break;
        case 'boom': sfx('wkBreak'); vib(60); break;
        case 'cheer': sfx('wkWin'); break;
        case 'flee': sfx('wkFlee'); msg('k', L.lose, 'angry'); break;
        case 'cage': sfx('wkCage'); vib(40); msg('k', 'Hé! Mijn eigen kooi?! Laat me eruit!', 'angry'); break;
        case 'sorry': msg('k', L.lose, 'sulk'); break;
      }
    }
  }
  const vib = ms => { try { vibrate(ms); } catch (e) {} };

  /* ---------- commands from the touch input (the same path the tests use) ---------- */
  function doCmd(c) {
    if (!S || !L || S.done) return false;
    S.ev = []; const acts = S.acts, ok = Core.cmd(L, S, c); handle(S.ev); S.ev = [];
    if (S.acts !== acts) saveRun();
    if (!S.cu) hideCu(); else renderCu();
    hudInv(); kick(); return ok;
  }
  cv.addEventListener('pointerdown', e => {
    if (!GS || GS.view !== 'play' || !S || GS.intro || anyModal() || S.m.st !== 'ok') return;
    const r = stageEl.getBoundingClientRect(), [ux, uy] = R.toRoom(e.clientX - r.left, e.clientY - r.top);
    if (ux < -.3 || ux > 14.3 || uy < -.3 || uy > 9.3) { if (S.cu) doCmd({ t: 'cuX' }); return; }
    e.preventDefault(); Sfx.play('__warm');
    const item = sel; sel = null;
    doCmd({ t: 'tap', x: ux, y: uy, item });
    tapMark(e.clientX - r.left, e.clientY - r.top);
  });
  function tapMark(x, y) { const m = document.createElement('i'); m.className = 'wk-tap'; m.style.left = x + 'px'; m.style.top = y + 'px'; stageEl.appendChild(m); setTimeout(() => m.remove(), 450); }
  H.inv.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b || !S || GS.intro || S.m.st !== 'ok') return;
    const it = S.inv[+b.dataset.s]; if (!it) { if (sel) { sel = null; hudInv(); } return; }
    if (sel === it) { sel = null; sfx('wkSel'); }
    else if (sel) { const a = sel; sel = null; doCmd({ t: 'comb', a, b: it }); }
    else { sel = it; sfx('wkSel'); msg('w', `Waar wil je ${ITEMS[it]} gebruiken? Tik erop!`, 'o', 1); }
    hudInv(); draw(0);
  });
  H.bark.addEventListener('click', () => { if (!S || GS.intro || S.m.st !== 'ok') return; Sfx.play('__warm'); sel = null; hudInv(); doCmd({ t: 'bark' }); });
  H.hint.addEventListener('click', () => {
    if (!S || GS.intro || S.m.st !== 'ok') return;
    const h = Core.hint(L, S); stats.hints++; sfx('wkHint');
    msg('h', h.t, 'hint', 0, 1); hudStars(); saveRun(); hudInv(); kick(); draw(0);
  });

  /* ---------- HUD ---------- */
  function hudInv() {
    if (!S) return;
    const arrow = Core.arrow(L, S), pulse = arrow && arrow.startsWith('inv:') ? arrow.slice(4) : null;
    const k = S.inv.join(',') + '|' + sel + '|' + pulse;
    if (H.inv.dataset.k === k) return; H.inv.dataset.k = k;
    H.inv.innerHTML = [0, 1, 2].map(i => { const it = S.inv[i]; return `<button data-s="${i}" class="${it ? '' : 'empty'}${it && it === sel ? ' sel' : ''}${it && it === pulse ? ' pulse' : ''}" aria-label="${it ? esc(ITEMS[it]) : 'leeg'}">${it ? `<img src="${Art.icon(it)}" alt="">` : ''}</button>`; }).join('');
  }
  function hudStars() {
    if (!S) return;
    const k = Core.stars(S) + '|' + S.hints + '|' + S.hits; if (H.stars.dataset.k === k) return; H.stars.dataset.k = k;
    const a = S.hints <= 1, b = S.hits <= 2;
    H.stars.innerHTML = `<i class="on">★</i><i class="${a ? 'on' : ''}" title="hints">★</i><i class="${b ? 'on' : ''}" title="geraakt">★</i>`;
  }
  let msgT = 0, msgPri = 0;
  const msgBusy = () => msgPri > now();
  function msg(who, text, mood, quiet, pri) {
    if (!text) return;
    if (msgPri > now() && !pri && who !== 'h') { if (who === 'k') return; }
    const av = who === 'h' ? '<span class="wk-bulb">💡</span>' : `<img src="${Art.facePic(who === 'k' ? 'k' : 'w', who === 'k' ? (mood === 'sulk' ? 'sulk' : mood === 'angry' ? 'angry' : 'taunt') : 'o')}" alt="">`;
    H.msg.className = 'show ' + (who === 'k' ? 'k' : who === 'h' ? 'h' : 'w');
    H.msg.innerHTML = av + `<span>${esc(text)}</span>`;
    clearTimeout(msgT); msgT = setTimeout(() => { H.msg.classList.remove('show'); }, Math.min(7000, 2600 + text.length * 55) * (who === 'h' ? 1.5 : 1));
    if (pri || who === 'h') msgPri = now() + 2200;
  }
  function toast(t) { H.toast.textContent = t; H.toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => H.toast.classList.remove('show'), 2200); }

  /* ---------- close-ups: panels with big buttons, pictures to look at ---------- */
  function hideCu() { H.cu.classList.remove('show'); H.cu.dataset.id = ''; }
  function renderCu() {
    if (!S || !S.cu || !L.cu || !L.cu[S.cu]) { hideCu(); return; }
    const d = L.cu[S.cu](S);
    let h = `<div class="wk-cu-top"><b>${esc(d.title)}</b><button class="wk-cu-x" aria-label="Sluiten">✕</button></div>`;
    if (d.text) h += `<p>${esc(d.text)}</p>`;
    if (d.look) h += `<img class="wk-look" src="${Art.look(d.look, d.code || '')}" alt="">`;
    if (d.n) h += `<div class="wk-dots">${Array.from({ length: d.n }, (_, i) => `<i class="${i < (d.code || '').length ? 'on' : ''}"></i>`).join('')}</div>`;
    if (d.opts) h += `<div class="wk-opts${d.clock ? ' clock' : ''}">${d.opts.map((o, i) => `<button data-i="${i}" class="${d.sel === o.v ? 'sel' : ''}" style="${o.col ? `--c:${o.col}` : ''}"><b>${esc(o.lab)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('')}</div>`;
    H.cu.innerHTML = h; H.cu.dataset.id = S.cu; H.cu.classList.add('show');
  }
  H.cu.addEventListener('click', e => {
    if (!S) return;
    if (e.target.closest('.wk-cu-x')) { sfx('wkSel'); doCmd({ t: 'cuX' }); return; }
    const b = e.target.closest('[data-i]'); if (!b || !S.cu) return;
    const d = L.cu[S.cu](S), o = d.opts[+b.dataset.i]; if (!o) return;
    doCmd({ t: 'pick', id: S.cu, v: o.v });
  });

  /* ---------- starting a level ---------- */
  function startLevel(i, resume) {
    closeModals(); hideCu(); H.msg.classList.remove('show');
    L = Core.prep(LEVELS[i]); sel = null; lastPh = 0; hitN = 0;
    let fresh = true;
    if (resume && run && run.lv === i && run.S) { const S2 = JSON.parse(JSON.stringify(run.S)); if (Core.sanitize(L, S2)) { S = S2; fresh = false; } }
    if (fresh) S = Core.newState(i);
    GS = { view: 'play', lv: i, intro: fresh, resultsUp: false };
    R.setLevel(L); setView('play'); fit();
    H.title.innerHTML = `<b>${i + 1}. ${esc(L.n)}</b>`; H.bark.hidden = !L.bark; H.inv.dataset.k = ''; H.stars.dataset.k = '';
    hudInv(); hudStars();
    if (fresh) { stats.plays++; saveStats(); showIntro(); }
    else { msg('w', 'Daar ben ik weer! Waar was ik gebleven?'); }
    saveRun(); draw(0); kick();
  }
  function showIntro() {
    const tip = TIPS[GS.lv];
    H.intro.innerHTML = `<div class="wk-intro-card"><img src="${Art.fullPic('k', 'taunt')}" alt=""><div class="wk-bubble"><small>Karel</small>${L.intro.map(t => `<p>${esc(t)}</p>`).join('')}</div>
      <h3>${GS.lv + 1}. ${esc(L.n)}</h3>${tip ? `<div class="wk-tip">${esc(tip)}</div>` : ''}<button class="btn primary" id="wkGo">Aan de slag! ▶</button></div>`;
    H.intro.classList.add('show'); sfx('wkKarel');
  }
  function endIntro() { if (!GS || !GS.intro) return; GS.intro = false; H.intro.classList.remove('show'); sfx('wkOk'); kick(); if (GS.lv === 0) msg('w', 'Ik ben Woef! Ik ga die machine slim verslaan.'); }
  H.intro.addEventListener('click', e => { if (e.target.closest('#wkGo') || e.target === H.intro || e.target.closest('.wk-intro-card')) endIntro(); });

  /* ---------- the end of a level ---------- */
  function results() {
    GS.resultsUp = true; hideCu();
    const i = GS.lv, st = Core.stars(S), old = stats.lv[i] || {}, first = !old.s, before = starsTotal(), wOpen = WORLDS.map((_, w) => worldOpen(w));
    stats.lv[i] = { s: Math.max(old.s || 0, st), h: Math.min(old.h == null ? 99 : old.h, S.hints), k: Math.min(old.k == null ? 99 : old.k, S.hits) };
    stats.wins++; if (L.final) stats.caught = (stats.caught || 0) + 1;
    clearRun(); saveStats();
    const notes = []; WORLDS.forEach((W, w) => { if (!wOpen[w] && worldOpen(w)) notes.push(`${W.emo} Nieuwe wereld open: <b>${W.full}</b>!`); });
    if (i + 1 < NL && worldOf(i + 1) > worldOf(i) && !worldOpen(worldOf(i + 1))) notes.push(`🔒 Voor ${WORLDS[worldOf(i + 1)].full} heb je ${WORLDS[worldOf(i + 1)].need} ⭐ nodig. Je hebt er ${starsTotal()}.`);
    if (i === NL - 2 && first) notes.push('🏁 De grote finale is open!');
    const nextOpen = i + 1 < NL && levelOpen(i + 1);
    const crit = [['Machine verslagen', true], [`Weinig hints (${S.hints}× gebruikt, max 1)`, S.hints <= 1], [`Bijna niet geraakt (${S.hits}×, max 2)`, S.hits <= 2]];
    $('#wkEndPic').innerHTML = `<img src="${Art.fullPic('w', 'cheer')}" alt=""><div class="wk-bigstars">${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}" style="animation-delay:${.15 + k * .25}s">★</i>`).join('')}</div>`;
    $('#wkEndTitle').textContent = L.final ? 'Karel is gevangen!' : st === 3 ? 'Super gedaan!' : st === 2 ? 'Goed gedaan!' : 'Machine verslagen!';
    $('#wkEndText').innerHTML = (L.final ? `<p class="wk-endstory">Karel zit in zijn eigen kooi. Hij moppert nog even... en zegt dan sorry. Woef is de held van de stad!</p>` : '')
      + `<div class="wk-crit">${crit.map(([t, ok]) => `<div class="${ok ? 'ok' : ''}"><i>${ok ? '★' : '☆'}</i>${esc(t)}</div>`).join('')}</div>`
      + `<div class="wk-karel"><img src="${Art.facePic('k', L.final ? 'sulk' : 'angry')}" alt=""><span>${esc(L.lose)}</span></div>`
      + (notes.length ? `<div class="wk-notes">${notes.join('<br>')}</div>` : '');
    const btns = [['wkEMap', 'Kaart', 0], ['wkERetry', '↻ Opnieuw', 0]]; if (nextOpen) btns.push(['wkENext', 'Volgende ▶', 1]); else btns[0][2] = 1;
    $('#wkEndBtns').innerHTML = btns.map(([id, l, p]) => `<button class="btn${p ? ' primary' : ''}" id="${id}">${l}</button>`).join('');
    openModal('wkEndModal');
    for (let k = 1; k <= st; k++) setTimeout(() => sfx('wkStar', k), 250 + k * 250);
  }
  $('#wkEndModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('wkOk');
    if (b.id === 'wkENext') startLevel(GS.lv + 1); else if (b.id === 'wkERetry') startLevel(GS.lv); else if (b.id === 'wkEMap') openMap();
  });

  /* ---------- pause ---------- */
  const OPTS = { sound: 'Geluidseffecten', music: 'Achtergrondmuziek' };
  const optRows = keys => keys.map(k => `<div class="opt"><div class="opt-label">${OPTS[k]}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
  function onOpt(e, again) { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = b.dataset.v === 'true'; saveOpt(); Sfx.refresh && Sfx.refresh(); sfx('wkSel'); again(); }
  function openPause() {
    if (!GS || GS.view !== 'play' || !S || GS.resultsUp) return;
    saveRun(); hideCu(); sfx('wkSel');
    $('#wkPInfo').innerHTML = `Level ${GS.lv + 1}: <b>${esc(L.n)}</b>`;
    $('#wkPOpts').innerHTML = optRows(['sound', 'music']);
    if (!$('#wkPauseModal').classList.contains('show')) closeModals();
    openModal('wkPauseModal');
  }
  $('#wkPause').addEventListener('click', e => { e.stopPropagation(); openPause(); });
  $('#wkPResume').addEventListener('click', () => { closeModals(); kick(); });
  $('#wkPRestart').addEventListener('click', () => { clearRun(); startLevel(GS.lv); });
  $('#wkPMap').addEventListener('click', () => { saveRun(); openMap(); });
  $('#wkPQuit').addEventListener('click', () => { saveRun(); openStart(); });
  $('#wkPOpts').addEventListener('click', e => onOpt(e, openPause));

  /* ---------- the level map ---------- */
  function setView(v) {
    if (GS) GS.view = v;
    scr.classList.toggle('play', v === 'play'); scr.classList.toggle('map', v === 'map');
    Sfx.track('wk', v === 'play' ? 'wk' : 'wkm');
  }
  function openMap() {
    closeModals(); hideCu(); H.msg.classList.remove('show'); H.intro.classList.remove('show');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    GS = { view: 'map' }; S = null; L = null;
    setView('map'); renderMap();
  }
  function renderMap() {
    const w = Math.min(opt.world || 0, WORLDS.length - 1), W = WORLDS[w], st = starsTotal();
    $('#wkMapSum').textContent = `⭐ ${st}/${NL * 3}`;
    $('#wkWorlds').innerHTML = WORLDS.map((X, k) => `<button data-w="${k}" class="${k === w ? 'on' : ''}${worldOpen(k) ? '' : ' lock'}">${X.emo} <span>${X.nm}</span>${worldOpen(k) ? '' : ' 🔒'}</button>`).join('');
    const box = $('#wkMapBox'); box.style.setProperty('--c1', W.col[0]); box.style.setProperty('--c2', W.col[1]);
    if (!worldOpen(w)) {
      const needLv = !doneLv(w * PER - 1), needSt = Math.max(0, W.need - st);
      box.innerHTML = `<div class="wk-wlock"><b>${W.emo} ${W.full}</b>${needLv ? `Versla eerst machine ${w * PER} in ${WORLDS[w - 1].full}.<br>` : ''}${needSt ? `Je hebt nog <b>${needSt}</b> ⭐ nodig. Haal meer sterren: gebruik weinig hints en laat je niet raken!` : ''}</div>`;
      return;
    }
    const lv = worldLevels(w), n = lv.length, pts = lv.map((_, k) => [8 + k * 84 / (n - 1), k % 2 ? 66 : 32]);
    let next = -1; for (const i of lv) if (levelOpen(i) && !doneLv(i)) { next = i; break; }
    box.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.2" stroke-dasharray="1 3.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`
      + lv.map((i, k) => { const r = stats.lv[i] || {}, open = levelOpen(i); return `<button class="wk-node${open ? '' : ' lock'}${i === next ? ' next' : ''}${LEVELS[i].final ? ' final' : ''}" data-i="${i}" style="left:${pts[k][0]}%;top:${pts[k][1]}%"><span class="wk-th"><img src="${Art.thumb(i)}" alt="">${open ? '' : '<em>🔒</em>'}</span><b>${LEVELS[i].final ? '🏁' : i + 1}</b><small>${esc(LEVELS[i].n.replace(/^(De|Het) /, ''))}</small><i>${[1, 2, 3].map(s => `<u class="${(r.s || 0) >= s ? 'on' : ''}">★</u>`).join('')}</i></button>`; }).join('');
  }
  $('#wkWorlds').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; opt.world = +b.dataset.w; saveOpt(); sfx('wkSel'); renderMap(); });
  $('#wkMapBox').addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i;
    if (!levelOpen(i)) { sfx('wkNo'); toast(i === NL - 1 ? 'Versla eerst alle andere machines.' : `Versla eerst machine ${i}.`); return; }
    sfx('wkOk'); if (run && run.lv === i) startLevel(i, true); else { clearRun(); startLevel(i); }
  });
  $('#wkMapBack').addEventListener('click', () => { sfx('wkSel'); openStart(); });

  /* ---------- the start dialog ---------- */
  function renderStart() {
    $('#wkContinue').hidden = !run;
    if (run && LEVELS[run.lv]) $('#wkContinue').innerHTML = `<img src="${Art.thumb(run.lv)}" alt=""><span><b>Verder met machine ${run.lv + 1}</b><small>${esc(LEVELS[run.lv].n)}</small></span><em>▶</em>`;
    $('#wkHero').innerHTML = `<img src="${Art.fullPic('w', 'o')}" alt=""><b>tegen</b><img src="${Art.fullPic('k', 'taunt')}" alt="">`;
    $('#wkOpts').innerHTML = optRows(['sound', 'music']);
    const beaten = Object.values(stats.lv).filter(r => r.s).length;
    $('#wkStats').innerHTML = [['Machines', `${beaten}/${NL}`], ['Sterren', `${starsTotal()}/${NL * 3}`], ['Karel', stats.caught ? 'gevangen!' : 'nog vrij']].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
  }
  function openStart() {
    closeModals(); hideCu(); H.msg.classList.remove('show'); H.intro.classList.remove('show');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    GS = { view: 'start' }; S = null; L = null; R.setLevel(null);
    setView('start'); renderStart(); openModal('wkStartModal'); drawBack();
  }
  function drawBack() { const c2 = cv.getContext('2d'); fit(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.fillStyle = '#3b2418'; c2.fillRect(0, 0, cv.width, cv.height); }
  $('#wkContinue').addEventListener('click', () => { if (!run) return; sfx('wkOk'); startLevel(run.lv, true); });
  $('#wkPlay').addEventListener('click', () => { sfx('wkOk'); if (run && run.lv != null) opt.world = worldOf(run.lv); else { let w = 0; for (let k = 0; k < WORLDS.length; k++) if (worldOpen(k)) w = k; opt.world = w; } openMap(); });
  $('#wkOpts').addEventListener('click', e => onOpt(e, renderStart));
  $('#wkStartBack').addEventListener('click', () => { closeModals(); quit(); });

  /* ---------- entering and leaving ---------- */
  function enter() {
    show('wk'); requestAnimationFrame(() => fit());
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { setView('play'); fit(); draw(0); openPause(); return; }
    openStart();
  }
  function quit() { if (raf) cancelAnimationFrame(raf); raf = 0; saveRun(); closeModals(); hideCu(); GS = null; S = null; L = null; scr.classList.remove('play', 'map'); show('menu'); refreshMenu(); }
  // back: while playing it pauses; on the map it goes to the start dialog; after the results to the map
  function leave() {
    if (GS && GS.view === 'play' && S && !GS.resultsUp) { if (S.cu) { doCmd({ t: 'cuX' }); return; } setTimeout(() => { if (current === 'wk' && !anyModal()) openPause(); }, 0); return; }
    if (GS && GS.view === 'map') { setTimeout(() => { if (current === 'wk') openStart(); }, 0); return; }
    if (GS && GS.view === 'play' && GS.resultsUp) { setTimeout(() => { if (current === 'wk') openMap(); }, 0); return; }
    quit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'wk' && GS && GS.view === 'play' && S && !GS.resultsUp) { saveRun(); if (!anyModal() && !GS.intro) openPause(); } });

  /* ---------- test hooks ---------- */
  window.__wk = {
    get S() { return S; }, get L() { return L; }, get G() { return GS; }, get sel() { return sel; }, R, Core, LEVELS, opt, stats: () => stats, run: () => run,
    frames: () => frames.slice(), running: () => raf > 0, startLevel, openMap, openStart, openPause, quit, endIntro, cur: () => current, doCmd,
    step(n) { for (let i = 0; i < n && S && !S.done; i++) stepGame(); draw(0); }, manual(v) { if (GS) GS.manual = !!v; if (!v) kick(); },
    finite: () => [acc, lastT].every(Number.isFinite) && (!S || Core.finite(S)),
    screenOf(id) { if (!L || !S) return null; const d = L._od[id], o = S.o[id]; if (!d || o.hide) return null; const r = stageEl.getBoundingClientRect(), [x, y] = R.toScreen(o.x, o.y - d.h / 2); return { x: r.left + x, y: r.top + y }; },
    pointFor(id) {                                             // a screen point where a tap really lands on this object
      if (!L || !S) return null; const d = L._od[id], o = S.o[id]; if (!d || o.hide) return null;
      const r = stageEl.getBoundingClientRect();
      for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) { const ux = o.x + (i - 3) / 7 * d.w, uy = o.y - d.h / 2 + (j - 3) / 7 * d.h; if (Core.pick(L, S, ux, uy) === id) { const [x, y] = R.toScreen(ux, uy); return { x: r.left + x, y: r.top + y }; } }
      const [x, y] = R.toScreen(o.x, o.y - d.h / 2); return { x: r.left + x, y: r.top + y };
    },
    screenAt(ux, uy) { const r = stageEl.getBoundingClientRect(), [x, y] = R.toScreen(ux, uy); return { x: r.left + x, y: r.top + y }; },
    quality: () => quality,
  };
  return { enter, leave, hasSave: () => !!store.get('wk.save', null) };
