  /* ---------- view & camera ---------- */
  const wrap = $('#kbWrap'), cv = $('#kbCanvas'), ctx = cv.getContext('2d', { alpha: false }), scr = $('#kb');
  let W = 0, H = 0, T = 32, Rt = 64, rq = 2, qScale = 1, vw = 12, vh = 12, raf = 0, running = false, lastT = 0, acc = 0, manual = false;
  const cam = { x: 0, y: 0 }, look = { x: 0, y: 0, on: false };
  let perf = { n: 0, t: 0, slow: 0 };
  function layout() {
    const land = window.innerWidth > window.innerHeight;
    scr.classList.toggle('land', land);
    W = wrap.clientWidth; H = wrap.clientHeight; if (!W || !H) return;
    rq = Math.min(window.devicePixelRatio || 1, 1.6) * qScale;
    const t0 = land ? clamp(H / 9.8, 26, 64) : clamp(Math.min(W / 8.8, H / 10.5), 26, 60);
    Rt = Math.max(12, Math.round(t0 * rq)); T = Rt / rq;
    cv.width = Math.round(W * rq); cv.height = Math.round(H * rq); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    vw = W / T; vh = H / T;
    if (L) { buildArt(Rt); buildParallax(W, H); prerenderChunks(); snapCam(); }
  }
  function camTarget() {
    const e = gn[cur]; if (!e) return [0, 0];
    const lx = (e.dashT > 0 ? 2 : 1.2) * e.face, ex = e.x + e.w / 2 + lx + look.x, ey = e.y + e.h / 2 + look.y;
    const bottomPad = scr.classList.contains('land') ? .9 : 0;
    const tx = vw >= Wd ? (Wd - vw) / 2 : clamp(ex - vw / 2, 0, Wd - vw);
    const top = Math.min(0, Ht + bottomPad - vh, -Math.max(0, vh - Ht - bottomPad - 2)), ty = clamp(ey - vh * (bottomPad ? .42 : .5), Math.max(-4, top), Math.max(Math.max(-4, top), Ht + bottomPad - vh + 1.5));
    return [tx, ty];
  }
  function snapCam() { if (!gn.length) return; const [x, y] = camTarget(); cam.x = x; cam.y = y; }
  function camUpdate(dt) { if (!gn.length) return; const [x, y] = camTarget(), k = look.on ? 1 : 1 - Math.exp(-dt * 6); cam.x += (x - cam.x) * k; cam.y += (y - cam.y) * k; }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (current !== 'kb') return;
    if (!anyModal() && !document.hidden && L && !manual) {
      acc += dt; let n = 0; while (acc >= STEP && n < 12) { step(STEP); acc -= STEP; n++; } if (n >= 12) acc = 0;
      hudTime();
    }
    if (L) camUpdate(dt);
    draw(manual ? 0 : dt);
    // adaptive quality: when the phone can't keep up, render fewer pixels (only ever downwards, so it never hitches back and forth)
    if (!manual && !anyModal() && dt > 0) {
      perf.t += dt; perf.n++;
      if (perf.t > 2) {
        const fps = perf.n / perf.t;
        if (fps < 45 && qScale > .6) { qScale = Math.max(.6, qScale - .2); layout(); }
        perf.n = 0; perf.t = 0;
      }
    }
  }

  /* ---------- HUD ---------- */
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const por = [...document.querySelectorAll('#kbHud .kb-por')], slots = [...document.querySelectorAll('#kbInv [data-s]')];
  const ICONS = {}, PORT = [];
  function iconURL(it) {
    if (ICONS[it]) return ICONS[it];
    const c = mkCv(64, 64), x = c.getContext('2d'); x.scale(64, 64); x.lineJoin = x.lineCap = 'round'; drawItem(x, it, .5, .52, 1.55);
    return (ICONS[it] = c.toDataURL());
  }
  function portraits() {
    for (let i = 0; i < 3; i++) {
      const c = mkCv(144, 144), x = c.getContext('2d'); x.scale(1.5, 1.5); x.translate(46, 124); x.scale(100, 100); x.lineJoin = x.lineCap = 'round';
      drawGnome(x, Object.assign(mkGnome(i, 0, 0), { face: 1, blink: 1 }), 1, true);
      PORT[i] = c.toDataURL(); por[i].querySelector('img').src = PORT[i];
    }
  }
  let lastSec = -1;
  function hudTime() { const s2 = Math.floor(time); if (s2 !== lastSec) { lastSec = s2; $('#kbTime').textContent = '⏱ ' + fmt(time); } }
  function hudGems() { $('#kbGems').textContent = `💎 ${gemGot}/${gemTotal}`; $('#kbGems').hidden = !gemTotal; }
  const BTN = [
    { a: ['⤒', 'Spring'], b: ['💨', 'Kopstoot'] },
    { a: ['🔨', 'Hamer'], b: ['🌰', 'Katapult'] },
    { a: ['🛡', 'Vooruit'], b: ['☂', 'Omhoog'] },
  ];
  function hud() {
    if (!gn.length) return;
    por.forEach((b, i) => {
      const e = gn[i]; b.classList.toggle('on', i === cur); b.classList.toggle('home', e.home); b.classList.toggle('dead', e.dead);
      b.querySelector('.kb-h').innerHTML = [0, 1, 2].map(k => `<i class="${k < e.hearts ? 'f' : ''}">♥</i>`).join('');
      b.querySelector('.kb-iv').innerHTML = e.inv.map(it => `<img src="${iconURL(it)}" alt="">`).join('');
    });
    const e = gn[cur], B = BTN[e.k];
    slots.forEach((s, i) => { const it = e.inv[i]; s.innerHTML = it ? `<img src="${iconURL(it)}" alt="${ITEM[it]}">` : ''; s.classList.toggle('sel', !!it && i === e.sel); s.setAttribute('aria-label', it ? ITEM[it] : 'Leeg vak'); });
    $('#kbUse').disabled = $('#kbGive').disabled = !e.inv.length;
    $('#kbInvName').textContent = e.inv[e.sel] ? ITEM[e.inv[e.sel]] : `Zakken van ${NAMES[e.k]}`;
    $('#kbA').innerHTML = `<b>${B.a[0]}</b><small>${B.a[1]}</small>`; $('#kbB').innerHTML = `<b>${B.b[0]}</b><small>${B.b[1]}</small>`;
    $('#kbA').classList.toggle('on2', e.k === 2 && !e.shieldUp); $('#kbB').classList.toggle('on2', e.k === 2 && e.shieldUp);
    hudGems();
  }
  function onSelect() { hud(); look.x = look.y = 0; look.on = false; $('#kbLook').hidden = true; }
  let banT = 0;
  function banner(t, ms) { const el = $('#kbBanner'); el.innerHTML = t; el.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => el.classList.remove('show'), ms || 1200); }
  function onLoad(quiet) {
    exits = [];
    for (let r = 0; r < Ht; r++) for (let c = 0; c < Wd; c++) if (tile[r * Wd + c] === EX && tAt(c - 1, r) !== EX) { let n2 = 0; while (tAt(c + n2, r) === EX) n2++; exits.push({ c, r, n: n2 }); }
    ART = null; chunks.clear(); PX = null; amb = []; look.x = look.y = 0; look.on = false; $('#kbLook').hidden = true;
    buildDecor(); held.clear(); recompute();
    $('#kbLvName').textContent = `${lv + 1}. ${L.n}`; lastSec = -1; hudTime();
    if (W) { buildArt(Rt); buildParallax(W, H); prerenderChunks(); }
    snapCam(); hud(); closeModals();
    banner(quiet ? `<b>${lv + 1}. ${L.n}</b>` : `<b>${lv + 1}. ${L.n}</b><br>${L.h}`, quiet ? 1300 : 6500);
  }
  function starsHtml(n, big) { return [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}"${big ? ` style="animation-delay:${.2 + i * .25}s"` : ''}>★</span>`).join(''); }
  function showWin() {
    const I = endInfo || { t: time, stars: 1 };
    $('#kbEndStars').innerHTML = starsHtml(I.stars, true); $('#kbEndStars').hidden = false;
    $('#kbEndTitle').textContent = lv + 1 >= LEVELS.length ? 'De Steenreus is verslagen!' : ['Gehaald!', 'Goed gedaan!', 'Fantastisch!'][I.stars - 1];
    const best = prog.best[lv];
    $('#kbEndText').innerHTML = `<span class="kb-er ok">✓ Alle drie de kabouters zijn bij de uitgang</span>`
      + `<span class="kb-er ${I.gemsAll ? 'ok' : ''}">${I.gemsAll ? '✓' : '○'} Edelstenen: ${gemGot} van ${gemTotal}</span>`
      + `<span class="kb-er ${I.par ? 'ok' : ''}">${I.par ? '✓' : '○'} Tijd ${fmt(I.t)} (doel ${fmt(L.par)})</span>`
      + `<span class="kb-er sub">${I.rec ? '🎉 Nieuw record! ' : ''}Beste tijd ${fmt(best)}</span>`
      + (lv + 1 >= LEVELS.length ? '<span class="kb-er sub">🏆 Je hebt de hele tocht volbracht!</span>' : '');
    $('#kbEndNext').hidden = lv + 1 >= LEVELS.length; $('#kbEndRetry').classList.remove('primary');
    $('#kbEndModal').classList.remove('lost'); openModal('kbEndModal');
  }
  function showFail() {
    $('#kbEndStars').hidden = true;
    $('#kbEndTitle').textContent = 'Oei!';
    $('#kbEndText').innerHTML = `<span class="kb-er">${failMsg}</span><span class="kb-er sub">Alle drie de kabouters moeten heelhuids bij de uitgang komen. Probeer het nog eens!</span>`;
    $('#kbEndNext').hidden = true; $('#kbEndRetry').classList.add('primary');
    $('#kbEndModal').classList.add('lost'); openModal('kbEndModal');
  }
  function renderStart() {
    let html = '', sum = 0;
    WORLDS.forEach((Wo, wi) => {
      const ids = LEVELS.map((l, i) => i).filter(i => LEVELS[i].w === wi); if (!ids.length) return;
      html += `<div class="kb-world w${wi}"><div class="kb-wh"><span>${Wo.ic}</span><b>${Wo.n}</b><small>${ids.reduce((a, i) => a + (prog.stars[i] || 0), 0)}/${ids.length * 3} ★</small></div><div class="kb-levels">`;
      for (const i of ids) {
        const lock = i + 1 > prog.unlocked, s = prog.stars[i] || 0, b = prog.best[i]; sum += s;
        html += `<button data-n="${i}" ${lock ? 'disabled' : ''} class="${lock ? 'lock' : ''}${i === lv && L ? ' cur' : ''}"><b>${lock ? '🔒' : i + 1}</b><small>${LEVELS[i].n}</small><span class="st">${lock ? '' : [0, 1, 2].map(k => `<i class="${k < s ? 'on' : ''}">★</i>`).join('')}</span><em>${b != null ? '⏱ ' + fmt(b) : ''}</em></button>`;
      }
      html += '</div></div>';
    });
    $('#kbLevels').innerHTML = html; $('#kbStarSum').textContent = `${sum} / ${LEVELS.length * 3} ★`;
    $('#kbOptList').innerHTML = [['sound', 'Geluidseffecten', [[true, 'Aan'], [false, 'Uit']]], ['music', 'Achtergrondmuziek', [[true, 'Aan'], [false, 'Uit']]], ['ctl', 'Knoppen', [['normaal', 'Normaal'], ['groot', 'Groot']]], ['shake', 'Scherm schudden', [[true, 'Aan'], [false, 'Uit']]]]
      .map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#kbHelp').querySelectorAll('img[data-g]').forEach(im => { im.src = PORT[+im.dataset.g] || ''; });
  }
  $('#kbLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b && !b.disabled) load(+b.dataset.n); });
  $('#kbOptList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); applyCtl(); Sfx.refresh(); layout(); renderStart(); });
  $('#kbStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#kbEndNext').addEventListener('click', () => load(Math.min(LEVELS.length - 1, lv + 1)));
  $('#kbEndRetry').addEventListener('click', () => load(lv, true));
  $('#kbEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('kbStartModal'); });
  $('#kbBack').addEventListener('click', () => leave());
  $('#kbLevelsBtn').addEventListener('click', () => { renderStart(); openModal('kbStartModal'); });
  $('#kbRetry').addEventListener('click', () => { if (L && (state === 'play' || state === 'fail' || state === 'over')) load(lv, true); });
  por.forEach((b, i) => b.addEventListener('click', () => select(i)));
  slots.forEach((s, i) => s.addEventListener('click', () => { const e = gn[cur]; if (e && e.inv[i]) { e.sel = i; sfx('kbTick'); hud(); } }));
  $('#kbUse').addEventListener('click', () => { if (useItem(gn[cur])) hud(); });
  $('#kbGive').addEventListener('click', () => { if (giveItem(gn[cur])) hud(); });
  $('#kbLook').addEventListener('click', () => { look.x = look.y = 0; look.on = false; $('#kbLook').hidden = true; });
  function applyCtl() { scr.classList.toggle('big-ctl', opt.ctl === 'groot'); }

  /* ---------- input: hold buttons (multi-touch), keyboard, drag to look around ---------- */
  const held = new Map(), ctlEl = $('#kbPanel');
  const actAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('#kbPanel [data-act]'); return b ? b.dataset.act : null; };
  function recompute() {
    keys.l = keys.r = keys.u = keys.d = keys.j = false;
    for (const a of held.values()) { if (a in keys) keys[a] = true; if (a === 'a') keys.j = true; }
    const hv = [...held.values()]; ctlEl.querySelectorAll('[data-act]').forEach(b => b.classList.toggle('on', hv.includes(b.dataset.act)));
    if ((keys.l || keys.r || keys.u || keys.d) && look.on) { look.x = look.y = 0; look.on = false; $('#kbLook').hidden = true; }
  }
  function press(a) {
    if (a === 'a') aReq = true; else if (a === 'b') bReq = true; else if (a === 'x') actReq = true;
    else if (a === 's') { const nx = [1, 2].map(k => (cur + k) % 3).find(k => !gn[k].dead); if (nx !== undefined) select(nx); }
    vibrate(8);
  }
  ctlEl.addEventListener('pointerdown', e => { const a = actAt(e.clientX, e.clientY); if (!a) return; e.preventDefault(); try { ctlEl.setPointerCapture(e.pointerId); } catch (er) {} held.set(e.pointerId, a); if ('abxs'.includes(a)) press(a); recompute(); });
  ctlEl.addEventListener('pointermove', e => { if (!held.has(e.pointerId)) return; const a = actAt(e.clientX, e.clientY), was = held.get(e.pointerId); if (a && a !== was && 'lrud'.includes(a) && 'lrud'.includes(was)) { held.set(e.pointerId, a); recompute(); } });
  const rel = e => { held.delete(e.pointerId); recompute(); };
  ctlEl.addEventListener('pointerup', rel); ctlEl.addEventListener('pointercancel', rel);
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    drag.moved = true; drag.x = e.clientX; drag.y = e.clientY;
    look.on = true; look.x = clamp(look.x - dx / T, -Wd, Wd); look.y = clamp(look.y - dy / T, -Ht, Ht); $('#kbLook').hidden = false;
  });
  cv.addEventListener('pointerup', () => { drag = null; }); cv.addEventListener('pointercancel', () => { drag = null; });
  const KM = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' };
  window.addEventListener('keydown', e => {
    if (current !== 'kb' || anyModal() || e.repeat && !KM[e.key]) return;
    const k = KM[e.key];
    if (k) { held.set('k' + k, k); recompute(); e.preventDefault(); return; }
    const kk = e.key.toLowerCase();
    if (e.key === ' ') { e.preventDefault(); if (!held.has('ka')) { held.set('ka', 'a'); press('a'); recompute(); } }
    else if (kk === 'x' || kk === 'z') { press('b'); }
    else if (kk === 'e' || kk === 'enter') { press('x'); }
    else if (e.key === 'Tab' || kk === 'c') { e.preventDefault(); press('s'); }
    else if ('123'.includes(e.key)) select(+e.key - 1);
    else if (kk === 'f') { if (useItem(gn[cur])) hud(); }
    else if (kk === 'g') { if (giveItem(gn[cur])) hud(); }
    else if (kk === 'v') { const g2 = gn[cur]; if (g2.inv.length) { g2.sel = (g2.sel + 1) % g2.inv.length; hud(); } }
    else if (kk === 'r') $('#kbRetry').click();
  });
  window.addEventListener('keyup', e => { const k = KM[e.key]; if (k) { held.delete('k' + k); recompute(); } if (e.key === ' ') { held.delete('ka'); recompute(); } });
  window.addEventListener('resize', () => { if (current === 'kb') layout(); });

  function enter() {
    show('kb'); applyCtl(); layout();
    if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
    if (!L) load(Math.min(prog.unlocked, LEVELS.length) - 1, true);
    renderStart(); openModal('kbStartModal');
  }
  function leave() { running = false; cancelAnimationFrame(raf); held.clear(); recompute(); closeModals(); show('menu'); refreshMenu(); }
  portraits();
  window.__kb = {
    get gn() { return gn; }, get state() { return state; }, get cur() { return cur; }, get crates() { return crates; }, get foes() { return foes; }, get objs() { return objs; }, get plats() { return plats; },
    get chan() { return chan; }, get items() { return items; }, get time() { return time; }, get lv() { return lv; }, get gemGot() { return gemGot; }, get gemTotal() { return gemTotal; }, get endInfo() { return endInfo; },
    get prog() { return prog; }, get opt() { return opt; }, get cam() { return cam; }, look, focus: (x, y) => { const e = gn[cur]; look.x = x - (e.x + e.w / 2 + 1.2 * e.face); look.y = y - (e.y + e.h / 2); look.on = true; camUpdate(1); }, get W() { return W; }, get T() { return T; }, get qScale() { return qScale; }, set qScale(v) { qScale = v; layout(); },
    tile: (c, r) => tAt(c, r), load, keys, held, select, press, recompute, use: () => useItem(gn[cur]), give: () => giveItem(gn[cur]), slot: i => { gn[cur].sel = i; hud(); },
    set manual(v) { manual = v; }, step: n => { for (let i = 0; i < n; i++) step(STEP); }, STEP, LEVELS, WORLDS,
    draw: () => { camUpdate(1); hudTime(); draw(0); }, DBG, chunkTime: () => { const t0 = performance.now(); chunks.clear(); prerenderChunks(); return [chunks.size, Math.round(performance.now() - t0)]; }, artTime: () => { const t0 = performance.now(); ART = null; buildArt(Rt); return Math.round(performance.now() - t0); }, layout, sfxNames: () => Object.keys(Sfx._G).filter(n => n.startsWith('kb')),
  };
  return { enter, leave, hasSave: () => false };
