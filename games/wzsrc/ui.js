  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ================= settings, progress ================= */
  const opt = Object.assign({ sound: true, lv: 1, theme: '' }, store.get('wz.settings', {}));
  if (!(opt.lv >= 0 && opt.lv < LEVELS.length)) opt.lv = 1;
  if (opt.theme && !THEMES.some(t => t.id === opt.theme)) opt.theme = '';
  const saveOpt = () => store.set('wz.settings', opt);
  Sfx.gate('wz', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = n => { if (opt.sound) Sfx.play(n); };
  const stats = Object.assign({ played: 0, solved: 0, words: 0, hints: 0, secrets: 0, best: {}, byLv: {}, daily: {}, dailyWon: 0, expNoHint: 0, fast: 0, time: 0, recent: [] }, store.get('wz.stats', {}));
  const saveStats = () => store.set('wz.stats', stats);
  const COLS = ['#ff8a7a', '#ffc94d', '#6fd6e8', '#9adf8c', '#c99cf0', '#ffa86b', '#7fb6ff', '#ff8fc0', '#c6e36a', '#a99cff', '#5fe0bf', '#ffb3a6'];
  const thOf = id => THEMES.find(t => t.id === id) || THEMES[0];
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtTime = s => { s = Math.max(0, Math.round(Number.isFinite(s) ? s : 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const T = () => performance.now() / 1000;

  /* ================= state =================
     P: the puzzle (pure data from generate()), G: this game (found words in the order found, hints, time, phase).
     Everything on screen is drawn from P and G: after resume, restart or a resize the view is rebuilt from them. */
  let P = null, G = null, LY = null;
  const scr = $('#wz'), main = $('#wzMain'), box = $('#wzBox'), cvB = $('#wzBoard'), cvF = $('#wzFx'), bctx = cvB.getContext('2d'), fctx = cvF.getContext('2d');
  const newG = (daily = null) => ({ found: [], hints: 0, hint: {}, lastHint: -1, time: 0, phase: 'play', daily, tiles: null, slots: [], secOk: null, wrong: 0 });

  /* ================= layout: the grid as big as fits, the word list below (portrait) or beside it (landscape) ================= */
  let fitKey = '';
  function colW() {
    const big = document.documentElement.classList.contains('big-text'), m = Math.max(...P.words.map(p => p.w.length));
    return Math.round(Math.min(220, Math.max(86, m * (big ? 12.4 : 10.2) + (big ? 38 : 32))));
  }
  function fit(force) {
    if (current !== 'wz' || !P) return;
    const land = innerWidth > innerHeight * 1.1; scr.classList.toggle('land', land);
    const m = main.getBoundingClientRect(); if (m.width < 60 || m.height < 60) return;
    const big = document.documentElement.classList.contains('big-text'), cw = colW();
    const key = [m.width, m.height, land, big, P.n, P.seed, P.words.length, cw].join();
    if (!force && key === fitKey && LY) return;
    fitKey = key;
    $('#wzList').style.setProperty('--wzcol', cw + 'px');
    let gs;
    if (land) gs = Math.min(m.height - 12, m.width * .62);
    else {
      const cols = Math.max(1, Math.floor((m.width - 24 + 6) / (cw + 6))), rows = Math.ceil(P.words.length / cols), rowH = big ? 36 : 31;
      const need = (G && G.phase === 'secret' ? 230 : 44 + rows * rowH + 14);
      gs = Math.min(m.width - 16, m.height - 14 - Math.min(need, m.height * .42));
    }
    gs = Math.floor(Math.max(140, Math.min(gs, 640)));
    box.style.width = box.style.height = gs + 'px';
    const pad = Math.max(6, gs * .025), dpr = Math.min(2.5, devicePixelRatio || 1);
    LY = { gs, pad, cs: (gs - 2 * pad) / P.n, dpr, land };
    for (const c of [cvB, cvF]) { c.width = Math.round(gs * dpr); c.height = Math.round(gs * dpr); }
    paintBoard(); requestFx();
    if (G && G.phase !== 'play') renderSecret();
  }
  const cellXY = i => [LY.pad + (i % P.n + .5) * LY.cs, LY.pad + (Math.floor(i / P.n) + .5) * LY.cs];

  /* ================= drawing ================= */
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function capsulePath(g, a, b, w) {
    const [x0, y0] = cellXY(a), [x1, y1] = cellXY(b), len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), r = w / 2;
    g.save(); g.translate(x0, y0); g.rotate(ang);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(len, -r); g.arc(len, 0, r, -Math.PI / 2, Math.PI / 2); g.lineTo(0, r); g.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5); g.closePath();
    g.restore();
  }
  function capsule(g, a, b, col, fillA, lineA, scale = 1) {
    capsulePath(g, a, b, LY.cs * .8 * scale);
    g.fillStyle = hexA(col, fillA); g.fill();
    if (lineA) { g.lineWidth = Math.max(1.5, LY.cs * .07); g.strokeStyle = hexA(col, lineA); g.stroke(); }
  }
  let painted = { found: -1, phase: '' };
  function paintBoard() {
    if (!LY || !P) return;
    const g = bctx, { gs, dpr, cs } = LY, n = P.n;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvB.width, cvB.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // faint cell rows, like squared paper
    g.fillStyle = 'rgba(120,90,40,.055)';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((r + c) % 2 === 0) g.fillRect(LY.pad + c * cs, LY.pad + r * cs, cs, cs);
    const done = G && G.phase !== 'play';
    // the letters that are left over (geheim woord): a warm glow
    if (done && P.secret) for (const i of freeCells(P)) { const [x, y] = cellXY(i); g.fillStyle = 'rgba(255,196,60,.42)'; rr(g, x - cs * .42, y - cs * .42, cs * .84, cs * .84, cs * .2); g.fill(); }
    // found words: coloured capsules under the letters
    if (G) G.found.forEach((k, j) => { const c = cellsOf(P.words[k], n); capsule(g, c[0], c[c.length - 1], COLS[j % COLS.length], .5, .95); });
    // letters of hinted words: a dashed ring
    if (G && G.phase === 'play') for (const [k, lv] of Object.entries(G.hint)) {
      if (G.found.includes(+k)) continue;
      cellsOf(P.words[+k], n).slice(0, lv).forEach(i => { const [x, y] = cellXY(i); g.beginPath(); g.arc(x, y, cs * .4, 0, 7); g.setLineDash([cs * .12, cs * .08]); g.lineWidth = Math.max(1.5, cs * .07); g.strokeStyle = 'rgba(230,150,0,.95)'; g.stroke(); g.setLineDash([]); });
    }
    g.fillStyle = '#1e2c38'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${Math.round(cs * .6)}px system-ui,Roboto,"Segoe UI",sans-serif`;
    for (let i = 0; i < n * n; i++) { const [x, y] = cellXY(i); g.fillText(P.grid[i], x, y + cs * .04); }
    painted = { found: G ? G.found.length : 0, phase: G ? G.phase : '' };
    void gs;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // the effects layer: the live selection, the first tapped letter, hint pulses, pops and sparkles. It only runs while something moves.
  let raf = 0, anims = [], parts = [], frames = [], drawHist = [];
  const requestFx = () => { if (!raf) raf = requestAnimationFrame(frameFx); };
  function frameFx(ts) {
    raf = 0; frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    if (current !== 'wz' || !LY || !P) { anims = []; parts = []; return; }
    const t0 = performance.now(), more = drawFx(); drawHist.push(performance.now() - t0); if (drawHist.length > 400) drawHist.splice(0, 200);
    if (more) requestFx();
  }
  function drawFx() {
    const g = fctx, { dpr, cs } = LY, t = T();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvF.width, cvF.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let busy = false;
    anims = anims.filter(A => Number.isFinite(A.t0) && t < A.t0 + A.dur);
    for (const A of anims) {
      const u = Math.max(0, Math.min(1, (t - A.t0) / A.dur)); busy = true;
      if (A.k === 'pop') { capsule(g, A.a, A.b, A.col, .45 * (1 - u), .9 * (1 - u), 1 + .35 * u); }
      else if (A.k === 'bad') { const sh = Math.sin(u * Math.PI * 5) * cs * .08 * (1 - u); g.save(); g.translate(sh, 0); capsule(g, A.a, A.b, '#ff6a5a', .35 * (1 - u), .8 * (1 - u)); g.restore(); }
      else if (A.k === 'hint') {
        const p = .5 + .5 * Math.sin((t - A.t0) * 7), fade = Math.min(1, (A.t0 + A.dur - t) / .4);
        A.cells.forEach((i, j) => { const [x, y] = cellXY(i); g.beginPath(); g.arc(x, y, cs * (.46 + .08 * p), 0, 7); g.fillStyle = `rgba(255,214,60,${(.5 - j * .08) * fade})`; g.fill(); g.lineWidth = 2.5; g.strokeStyle = `rgba(255,170,0,${.9 * fade})`; g.stroke(); });
      }
    }
    if (parts.length) {
      busy = true;
      parts = parts.filter(q => t < q.t0 + q.life);
      for (const q of parts) {
        const u = (t - q.t0) / q.life, x = q.x + q.vx * u * q.life - 0, y = q.y + q.vy * u * q.life + 60 * (u * q.life) ** 2, s = q.s * (1 - u * .6);
        g.fillStyle = hexA(q.col, 1 - u); g.beginPath();
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr2 = k % 2 ? s * .38 : s; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
        g.closePath(); g.fill();
      }
    }
    // the first letter after a tap (waiting for the last one)
    if (pend >= 0) { const [x, y] = cellXY(pend); g.beginPath(); g.arc(x, y, cs * .44, 0, 7); g.fillStyle = hexA(COLS[(G ? G.found.length : 0) % COLS.length], .55); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(30,44,56,.6)'; g.stroke(); }
    // the live selection while dragging
    if (drag && drag.sel.length) { const s = drag.sel, col = COLS[(G ? G.found.length : 0) % COLS.length]; capsule(g, s[0], s[s.length - 1], col, .55, 1); }
    // letters on top of the effects stay readable: redraw those that are covered
    const cover = new Set();
    if (drag) drag.sel.forEach(i => cover.add(i)); if (pend >= 0) cover.add(pend);
    for (const A of anims) if (A.k === 'hint') A.cells.forEach(i => cover.add(i));
    if (cover.size) {
      g.fillStyle = '#1e2c38'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${Math.round(cs * .6)}px system-ui,Roboto,"Segoe UI",sans-serif`;
      for (const i of cover) { const [x, y] = cellXY(i); g.fillText(P.grid[i], x, y + cs * .04); }
    }
    return busy;
  }
  function sparkle(cells, col, n = 14) {
    const t = T();
    for (let k = 0; k < n; k++) {
      const i = cells[Math.floor(Math.random() * cells.length)], [x, y] = cellXY(i), a = Math.random() * 6.28, sp = LY.cs * (1.2 + Math.random() * 2);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - LY.cs, s: LY.cs * (.12 + Math.random() * .12), col: k % 3 ? col : '#fff6c0', t0: t, life: .5 + Math.random() * .4 });
    }
    if (parts.length > 160) parts.splice(0, parts.length - 160);
    requestFx();
  }
  function confetti() {
    const el = $('#wzConf'); el.innerHTML = '';
    for (let i = 0; i < 46; i++) {
      const e = document.createElement('i'), w = 7 + Math.random() * 6;
      e.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * .55).toFixed(0)}px;background:${COLS[i % COLS.length]};animation-duration:${(2.2 + Math.random() * 1.4).toFixed(2)}s;animation-delay:${(Math.random() * .6).toFixed(2)}s;--dx:${((Math.random() - .5) * 80).toFixed(0)}px;--r:${(360 + Math.random() * 720).toFixed(0)}deg`;
      el.appendChild(e);
    }
    clearTimeout(confT); confT = setTimeout(() => { el.innerHTML = ''; }, 4500);
  }
  let confT = 0;

  /* ================= the word list and the header ================= */
  function renderList() {
    if (!P) return;
    const order = P.words.map((p, k) => k).sort((a, b) => P.words[a].w.localeCompare(P.words[b].w));
    $('#wzList').innerHTML = order.map(k => {
      const j = G ? G.found.indexOf(k) : -1, f = j >= 0;
      return `<div class="wz-w${f ? ' f' : ''}${G && G.phase === 'play' && !f && G.hint[k] ? ' hint' : ''}" data-k="${k}"${f ? ` style="--c:${COLS[j % COLS.length]}"` : ''}><i></i><span>${esc(P.words[k].w)}</span></div>`;
    }).join('');
    hud();
  }
  function hud() {
    if (!P) return;
    const th = thOf(P.th);
    $('#wzTitle').textContent = `${th.ic} ${th.name}`;
    $('#wzSub').textContent = LEVELS[P.lv].name + (G && G.daily ? ' · Dagpuzzel' : '') + (G && G.preview ? '' : '');
    $('#wzCount').textContent = `${G ? G.found.length : 0}/${P.words.length}`;
    $('#wzTheme').textContent = P.secret ? '🤫 met geheim woord' : P.lv === 3 ? '🎭 met lokwoorden' : '';
    const hn = $('#wzHintN'); hn.textContent = G && G.hints ? G.hints : ''; hn.classList.toggle('on', !!(G && G.hints));
    const sec = !!(G && (G.phase === 'secret' || (G.phase === 'done' && P.secret && G.tiles)));
    $('#wzSecret').hidden = !sec; $('#wzList').hidden = sec;
    showClock();
  }
  function showClock() { $('#wzClock').textContent = fmtTime(G ? G.time : 0); }
  let toastT = 0;
  function toast(t, ms = 2400) { const el = $('#wzToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }

  /* ================= the clock: runs only while you can play ================= */
  let clockT = 0, lastTick = 0;
  const running = () => current === 'wz' && P && G && !G.preview && (G.phase === 'play' || G.phase === 'secret') && !document.hidden && !anyModal();
  function tick() {
    const t = performance.now(), dt = (t - lastTick) / 1000; lastTick = t;
    if (G && running() && dt > 0 && dt < 5) G.time += dt;
    if (G && !Number.isFinite(G.time)) G.time = 0;
    showClock();
  }
  function startClock() { lastTick = performance.now(); clearInterval(clockT); clockT = setInterval(tick, 500); showClock(); }
  function stopClock() { if (clockT) tick(); clearInterval(clockT); clockT = 0; }

  /* ================= playing ================= */
  function pickTheme() {
    if (opt.theme) return opt.theme;
    const recent = stats.recent || [], free = THEMES.filter(t => !recent.includes(t.id));
    const th = (free.length ? free : THEMES)[Math.floor(Math.random() * (free.length || THEMES.length))].id;
    stats.recent = [th, ...recent.filter(x => x !== th)].slice(0, 8);
    return th;
  }
  function begin(p, daily) {
    if (!p) { toast('Er ging iets mis bij het maken van de puzzel. Probeer het nog eens.'); return; }
    closeModals(); $('#wzConf').innerHTML = ''; clearTimeout(toastT); $('#wzToast').classList.remove('show');
    P = p; G = newG(daily); pend = -1; drag = null; anims = []; parts = [];
    stats.played++; saveStats();
    LY = null; renderList(); fit(true); startClock(); saveNow();
    scr.classList.remove('intro'); void scr.offsetWidth; scr.classList.add('intro');
  }
  function newPuzzle(lv = opt.lv, theme) {
    const seed = (Math.random() * 4294967296) >>> 0;
    begin(generate(lv, seed, theme || pickTheme()) || generate(lv, seed ^ 0x5bd1e995), null);
  }
  function startDaily() { const d = dayStr(); begin(generate(1, dailySeed(d)), d); }
  function restart() { if (!P || !G) return; const daily = G.daily; G = newG(daily); pend = -1; drag = null; anims = []; parts = []; rebuild(); startClock(); save(); }
  function rebuild() { closeModals(); renderList(); renderSecret(); LY = null; fit(true); hud(); }

  // a straight selection from cell a to cell b: a word of the list (once), a word found before, or nothing
  function commit(cells) {
    if (!P || !G || G.phase !== 'play' || cells.length < 2) return -1;
    const a = cells[0], b = cells[cells.length - 1], k = wordAt(P, a, b);
    if (k >= 0 && P.words[k].w.length === cells.length) {
      if (G.found.includes(k)) { sfx('wzDup'); toast(`${P.words[k].w} had je al gevonden.`, 1600); return k; }
      found(k); return k;
    }
    G.wrong++;
    anims.push({ k: 'bad', a, b, t0: T(), dur: .5 }); requestFx(); sfx('wzNo'); vibrate(8);
    if (cells.length >= 3 && G.wrong <= 2) toast('Dat woord staat niet in de lijst.', 1600);
    return -1;
  }
  function found(k) {
    const j = G.found.length, col = COLS[j % COLS.length], c = cellsOf(P.words[k], P.n);
    G.found.push(k); if (G.lastHint === k) G.lastHint = -1;
    stats.words++; saveStats();
    paintBoard(); renderList();
    const el = $(`#wzList [data-k="${k}"]`), lst = $('#wzList');
    if (el) { el.classList.add('new'); const top = el.offsetTop - lst.offsetTop; if (top < lst.scrollTop || top + el.offsetHeight > lst.scrollTop + lst.clientHeight) lst.scrollTop = top - lst.clientHeight / 2; }   // only the list scrolls
    anims.push({ k: 'pop', a: c[0], b: c[c.length - 1], col, t0: T(), dur: .45 }); sparkle(c, col, 12);
    sfx('wzFound'); vibrate(12);
    if (G.found.length === P.words.length) allFound(); else save();
  }
  function allFound() {
    const game = G;
    sfx('wzAll'); vibrate(25);
    P.words.forEach((p, j) => setTimeout(() => { if (G === game && current === 'wz' && LY) { const c = cellsOf(p, P.n); sparkle(c, COLS[j % COLS.length], 4); } }, j * 40));
    if (P.secret) { G.phase = 'secret'; startSecret(); save(); }
    else finish();
  }

  /* ---------- the hidden word ---------- */
  const leftover = () => freeCells(P).map(i => P.grid[i]).join('');
  function startSecret() {
    const L = leftover(); let order = L.split('').map((_, i) => i);
    for (let t = 0; t < 8; t++) { for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } if (order.map(i => L[i]).join('') !== L) break; }
    G.tiles = order; G.slots = []; G.secOk = null;
    paintBoard(); hud(); renderSecret(); fit(true);
  }
  function renderSecret() {
    if (!P || !G || !(G.phase === 'secret' || G.phase === 'done') || !G.tiles) return;
    const L = leftover(); let j = 0;
    $('#wzSlots').className = '';
    // all slots on one line: as wide as fits (a phrase keeps a small gap per space)
    const avail = ($('#wzSecret').clientWidth || 360) - 8, nL = P.secret.replace(/ /g, '').length, nS = P.secret.length - nL;
    const big = document.documentElement.classList.contains('big-text'), sw = Math.max(18, Math.min(big ? 34 : 30, (avail - 4 * (nL + nS - 1) - nS * 10) / nL));
    $('#wzSlots').style.setProperty('--sw', sw.toFixed(1) + 'px');
    $('#wzSlots').innerHTML = P.secret.split('').map(ch => ch === ' ' ? '<b class="sp"></b>' : (() => { const t = G.slots[j++]; return t === undefined ? '<b></b>' : `<b class="on" data-s="${j - 1}">${L[t]}</b>`; })()).join('');
    $('#wzTiles').innerHTML = G.tiles.map(t => `<button data-t="${t}" class="${G.slots.includes(t) ? 'used' : ''}">${L[t]}</button>`).join('');
    $('#wzSecTxt').textContent = `Alle woorden gevonden! De ${L.length} letters die over zijn, vormen samen ${P.secret.includes(' ') ? 'een paar woorden' : 'een woord'}. Tik ze in de goede volgorde.`;
  }
  let secBusy = 0;
  function tapTile(t) {
    if (!G || G.phase !== 'secret' || secBusy || G.slots.includes(t) || !G.tiles.includes(t)) return;
    const L = leftover(); if (G.slots.length >= L.length) return;
    G.slots.push(t); sfx('wzSlot'); renderSecret(); save();
    if (G.slots.length === L.length) checkSecret();
  }
  function checkSecret() {
    const L = leftover(), guess = G.slots.map(t => L[t]).join(''), game = G;
    if (guess === L) { secretDone(true); return; }
    $('#wzSlots').classList.add('bad'); sfx('wzNo'); vibrate(10); secBusy = 1;
    setTimeout(() => { secBusy = 0; if (G !== game || G.phase !== 'secret') return; G.slots = []; renderSecret(); save(); }, 750);
  }
  function secretDone(ok) {
    if (!G || G.phase !== 'secret') return;
    const L = leftover();
    if (!ok) { const used = new Set(); G.slots = L.split('').map(ch => { const t = G.tiles.find(x => !used.has(x) && L[x] === ch); used.add(t); return t; }); }
    G.secOk = ok; renderSecret(); $('#wzSlots').classList.add('good');
    if (ok) { stats.secrets++; saveStats(); sfx('wzSecret'); sparkle(freeCells(P), '#ffd84a', 26); }
    else sfx('wzHint');
    finish();
  }
  function secretHint() {
    const L = leftover(); let j = 0; while (j < G.slots.length && L[G.slots[j]] === L[j]) j++;
    if (j >= L.length) return;
    G.slots.length = j;
    const t = G.tiles.find(x => !G.slots.includes(x) && L[x] === L[j]);
    G.slots.push(t); G.hints++; stats.hints++; saveStats();
    sfx('wzHint'); renderSecret(); hud(); save();
    if (G.slots.length === L.length) checkSecret();
  }

  /* ---------- hints: the first letter of a word lights up; asking again for the same word shows one letter more ---------- */
  function useHint() {
    if (!P || !G || G.preview || anyModal()) return false;
    if (G.phase === 'secret') { if (!secBusy) secretHint(); return true; }
    if (G.phase !== 'play') return false;
    let k = G.lastHint;
    if (k < 0 || G.found.includes(k) || (G.hint[k] || 0) >= P.words[k].w.length - 1) {
      const left = P.words.map((_, i) => i).filter(i => !G.found.includes(i));
      if (!left.length) return false;
      const fresh = left.filter(i => !G.hint[i]);
      k = (fresh.length ? fresh : left)[Math.floor(Math.random() * (fresh.length || left.length))];
    }
    G.hint[k] = Math.min(P.words[k].w.length - 1, (G.hint[k] || 0) + 1); G.lastHint = k;
    G.hints++; stats.hints++; saveStats();
    const cells = cellsOf(P.words[k], P.n).slice(0, G.hint[k]);
    anims = anims.filter(A => A.k !== 'hint'); anims.push({ k: 'hint', cells, t0: T(), dur: 2.8 });
    pend = -1; sfx('wzHint'); paintBoard(); renderList(); requestFx(); save();
    return k;
  }

  /* ---------- the end ---------- */
  function finish() {
    const game = G, lv = LEVELS[P.lv].id, t = Math.max(1, Math.round(G.time));
    G.phase = 'done'; stopClock(); pend = -1; drag = null;
    stats.solved++; stats.byLv[lv] = (stats.byLv[lv] || 0) + 1; stats.time = (stats.time || 0) + t;
    const prev = stats.best[lv] || 0, rec = !prev || t < prev; if (rec) stats.best[lv] = t;
    if (G.daily && !stats.daily[G.daily]) { stats.dailyWon++; stats.daily[G.daily] = t; const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()]; }
    if (P.lv === 3 && !G.hints) stats.expNoHint = (stats.expNoHint || 0) + 1;
    if (P.lv >= 1 && t <= 180) stats.fast = (stats.fast || 0) + 1;
    saveStats(); store.del('wz.save');
    G.res = { t, rec, prev };
    paintBoard(); hud();
    setTimeout(() => { if (G === game && current === 'wz') confetti(); }, 250);
    setTimeout(() => { if (G === game && current === 'wz') openEnd(); }, P.secret ? 1700 : 1300);
  }
  function openEnd() {
    if (!G || !G.res) return;
    const { t, rec, prev } = G.res, lvn = LEVELS[P.lv].name;
    $('#wzEndEmoji').textContent = rec && prev ? '🏆' : G.secOk ? '🤫' : '🎉';
    $('#wzEndTitle').textContent = G.daily ? 'Dagpuzzel opgelost!' : rec && prev ? 'Nieuw record!' : 'Opgelost!';
    $('#wzEndStats').innerHTML = `<div><b>${fmtTime(t)}</b><small>Tijd</small></div><div><b>${G.hints}</b><small>${G.hints === 1 ? 'Hint' : 'Hints'}</small></div><div class="${rec ? 'rec' : ''}"><b>${fmtTime(stats.best[LEVELS[P.lv].id])}</b><small>Beste ${esc(lvn.toLowerCase())}</small></div>`;
    let tx = `Alle ${P.words.length} woorden gevonden.`;
    if (P.secret) tx += `<br>Geheim woord: <b>${esc(P.secret)}</b>` + (G.secOk ? ' <span class="wz-gold">geraden! 🤫</span>' : '');
    if (rec && prev) tx += `<br><span class="wz-gold">${fmtTime(prev - t)} sneller dan je vorige record</span>`;
    $('#wzEndText').innerHTML = tx;
    openModal('wzEndModal');
  }

  /* ================= input: drag from the first to the last letter, or tap the first and then the last ================= */
  let drag = null, pend = -1;
  function cellAt(e) {
    const r = cvF.getBoundingClientRect(), k = LY.gs / (r.width || LY.gs), x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;   // k: the board may be scaled (intro animation)
    const fc = (x - LY.pad) / LY.cs - .5, fr = (y - LY.pad) / LY.cs - .5, c = Math.round(fc), rw = Math.round(fr);
    return { fr, fc, i: rw >= 0 && rw < P.n && c >= 0 && c < P.n ? rw * P.n + c : -1 };
  }
  cvF.addEventListener('pointerdown', e => {
    if (!P || !G || !LY || G.phase !== 'play' || G.preview || anyModal() || drag) return;
    e.preventDefault();
    const h = cellAt(e); if (h.i < 0) return;
    try { cvF.setPointerCapture(e.pointerId); } catch (er) { /* no capture: fine */ }
    drag = { id: e.pointerId, a: h.i, fr: Math.floor(h.i / P.n), fc: h.i % P.n, sel: [h.i], moved: false };
    requestFx();
  });
  cvF.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id || !P) return;
    const h = cellAt(e);
    if (!drag.moved && Math.hypot(h.fr - drag.fr, h.fc - drag.fc) < .55) return;
    if (!drag.moved) { drag.moved = true; pend = -1; }
    const sel = snapLine(P.n, drag.a, h.fr, h.fc);
    if (sel.length !== drag.sel.length || sel[sel.length - 1] !== drag.sel[drag.sel.length - 1]) { drag.sel = sel; if (sel.length > 1) sfx('wzTick' + Math.min(8, sel.length - 1)); requestFx(); }
  });
  function endDrag(e, cancel) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    if (cancel || !G || G.phase !== 'play') { requestFx(); return; }
    if (d.moved) { if (d.sel.length >= 2) commit(d.sel); requestFx(); return; }
    // a tap: the first letter, then the last one
    const i = d.a;
    if (pend < 0) { pend = i; sfx('wzTap'); }
    else if (pend === i) pend = -1;
    else {
      const r = Math.floor(i / P.n), c = i % P.n, line = snapLine(P.n, pend, r, c);
      if (line[line.length - 1] === i) { pend = -1; commit(line); }
      else { pend = i; sfx('wzTap'); }
    }
    requestFx();
  }
  cvF.addEventListener('pointerup', e => endDrag(e, false));
  cvF.addEventListener('pointercancel', e => endDrag(e, true));
  cvF.addEventListener('lostpointercapture', e => { if (drag && e.pointerId === drag.id) endDrag(e, false); });

  // buttons in the game answer on pointerup: Chrome drops the click of a tap that comes right after a swipe on the grid (it is taken as
  // stopping a fling), and of quick taps in a row. click stays for mouse and keyboard.
  function onTap(root, sel, fn) {
    let dn = null, last = 0;
    root.addEventListener('pointerdown', e => { dn = e.target.closest(sel); });
    root.addEventListener('pointercancel', () => { dn = null; });
    root.addEventListener('pointerup', e => { const el = e.target.closest(sel); if (el && el === dn) { last = performance.now(); fn(el); } dn = null; });
    root.addEventListener('touchend', e => { if (performance.now() - last < 100 && e.cancelable) e.preventDefault(); }, { passive: false });   // no ghost click on what appears under the finger
    root.addEventListener('click', e => { const el = e.target.closest(sel); if (el && performance.now() - last > 600) fn(el); });
  }
  onTap($('#wzTiles'), 'button[data-t]', b => tapTile(+b.dataset.t));
  onTap($('#wzSlots'), 'b[data-s]', b => { if (!G || G.phase !== 'secret' || secBusy) return; G.slots.length = +b.dataset.s; sfx('wzTap'); renderSecret(); save(); });
  onTap($('#wzSecClear'), 'button', () => { if (!G || G.phase !== 'secret' || secBusy) return; G.slots = []; renderSecret(); save(); });
  onTap($('#wzSecShow'), 'button', () => { if (!G || G.phase !== 'secret' || secBusy) return; secretDone(false); });
  $('#wzList').addEventListener('click', e => { const w = e.target.closest('.wz-w'); if (w && w.classList.contains('f')) { const k = +w.dataset.k, j = G.found.indexOf(k), c = cellsOf(P.words[k], P.n); anims.push({ k: 'pop', a: c[0], b: c[c.length - 1], col: COLS[j % COLS.length], t0: T(), dur: .5 }); requestFx(); } });
  onTap($('#wzHint'), 'button', () => { if (G && G.phase === 'done') return; useHint(); });
  onTap($('#wzBack'), 'button', () => leave());
  onTap($('#wzMenu'), 'button', () => openStart());
  onTap($('#wzRetry'), 'button', async () => {
    if (!P || !G || G.preview || G.phase === 'done') return;
    if ((G.found.length || G.hints) && !(await askConfirm('Opnieuw beginnen?', 'Je begint deze puzzel opnieuw: alle gevonden woorden en de tijd gaan terug naar nul.', 'Opnieuw'))) return;
    restart();
  });
  window.addEventListener('resize', () => { if (current === 'wz') setTimeout(() => fit(), 60); });

  /* ================= save / resume ================= */
  let saveTm = 0;
  const live = () => !!(P && G && !G.preview && G.phase !== 'done');
  function saveNow() {
    clearTimeout(saveTm); saveTm = 0;
    if (!live()) return;
    store.set('wz.save', { v: CORE_V, P: Object.assign({}, P, { grid: P.grid.join('') }), G: Object.assign({}, G, { res: undefined }) });
  }
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 300); };
  document.addEventListener('visibilitychange', () => { if (current !== 'wz') return; if (document.hidden) { tick(); saveNow(); } else lastTick = performance.now(); });
  function restoreSaved(sv) {
    const p = Object.assign({}, sv.P, { grid: String(sv.P.grid).split('') });
    if (!LEVELS[p.lv] || !THEMES.some(t => t.id === p.th) || verify(p).length) throw new Error('save');
    const g = Object.assign(newG(), sv.G);
    g.found = [...new Set((g.found || []).filter(k => Number.isInteger(k) && k >= 0 && k < p.words.length))];
    if (!Number.isFinite(g.time) || g.time < 0) g.time = 0;
    if (!['play', 'secret'].includes(g.phase)) g.phase = 'play';
    if (g.phase === 'secret' && (!p.secret || g.found.length !== p.words.length)) g.phase = 'play';
    if (g.phase === 'play' && g.found.length === p.words.length) g.phase = p.secret ? 'secret' : 'play';
    const L = freeCells(p).length;
    if (g.phase === 'secret' && !(Array.isArray(g.tiles) && g.tiles.length === L && new Set(g.tiles).size === L && g.tiles.every(t => t >= 0 && t < L))) { g.tiles = null; }
    g.slots = Array.isArray(g.slots) && g.tiles ? g.slots.filter((t, i, a) => g.tiles.includes(t) && a.indexOf(t) === i) : [];
    g.hint = g.hint && typeof g.hint === 'object' ? g.hint : {};
    P = p; G = g; pend = -1; drag = null; anims = []; parts = [];
    if (G.phase === 'secret' && !G.tiles) startSecret();
  }
  function preview() {                                            // a puzzle behind the start dialog
    P = generate(opt.lv, 20240 + opt.lv); G = Object.assign(newG(), { preview: true }); pend = -1; drag = null;
    LY = null; renderList(); fit(true);
  }

  /* ================= start dialog ================= */
  function renderStart() {
    const img = $('#wzHeroImg'); if (!img.src && typeof GameIcons !== 'undefined') img.src = GameIcons.url('wz');
    const lv = live();
    $('#wzCont').hidden = !lv;
    if (lv) $('#wzCont').innerHTML = `<span class="ic">${thOf(P.th).ic}</span><span class="tx"><b>Verder spelen</b><small>${esc(thOf(P.th).name)} · ${LEVELS[P.lv].name} · ${G.found.length}/${P.words.length} gevonden · ${fmtTime(G.time)}</small></span><em>Verder ▶</em>`;
    const d = dayStr(), dn = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }), done = stats.daily[d];
    $('#wzDaily').innerHTML = `<span class="ic">📅</span><span class="tx"><b>Puzzel van de dag</b><small>${esc(dn)} · Normaal · voor iedereen dezelfde</small></span><em>${done ? '✓ ' + fmtTime(done) : 'Speel ▶'}</em>`;
    $('#wzDaily').classList.toggle('done', !!done);
    $('#wzLevels').innerHTML = LEVELS.map((L, i) => `<button data-lv="${i}" class="${opt.lv === i ? 'on' : ''}"><b>${L.name}</b><small>${L.desc}</small><em>${stats.best[L.id] ? '🏆 ' + fmtTime(stats.best[L.id]) : '&nbsp;'}</em></button>`).join('');
    const th = opt.theme ? thOf(opt.theme) : null;
    $('#wzThemeSum').textContent = 'Thema: ' + (th ? `${th.ic} ${th.name}` : '🎲 Verrassing');
    $('#wzThemes').innerHTML = `<button data-th="" class="${!opt.theme ? 'on' : ''}">🎲 Verrassing</button>` + THEMES.map(t => `<button data-th="${t.id}" class="${opt.theme === t.id ? 'on' : ''}">${t.ic} ${esc(t.name)}</button>`).join('');
    $('#wzOpts').innerHTML = [['sound', 'Geluidseffecten'], ['music', 'Achtergrondmuziek']]
      .map(([k, l]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${(opt[k] !== false) === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#wzStats').innerHTML = [['Opgelost', stats.solved], ['Woorden', stats.words], ['Geheime woorden', stats.secrets]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    $('#wzGo').textContent = `${LEVELS[opt.lv].name} ▶`;
  }
  function openStart() { pend = -1; drag = null; requestFx(); renderStart(); openModal('wzStartModal'); }
  async function confirmNew() { return !(live() && (G.found.length || G.hints)) || await askConfirm('Nieuwe puzzel?', 'Je stopt met de puzzel die je nu speelt.', 'Nieuwe puzzel'); }
  $('#wzLevels').addEventListener('click', e => { const b = e.target.closest('button[data-lv]'); if (!b) return; opt.lv = +b.dataset.lv; saveOpt(); renderStart(); });
  $('#wzThemes').addEventListener('click', e => { const b = e.target.closest('button[data-th]'); if (!b) return; opt.theme = b.dataset.th; saveOpt(); renderStart(); });
  $('#wzOpts').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = b.dataset.v === 'true'; saveOpt(); renderStart(); Sfx.refresh && Sfx.refresh(); });
  $('#wzGo').addEventListener('click', async () => { if (await confirmNew()) newPuzzle(opt.lv); else openStart(); });
  $('#wzDaily').addEventListener('click', async () => { if (G && G.daily === dayStr() && live()) { closeModals(); return; } if (await confirmNew()) startDaily(); else openStart(); });
  $('#wzCont').addEventListener('click', () => { closeModals(); lastTick = performance.now(); });
  $('#wzStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#wzEndMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#wzEndNext').addEventListener('click', () => { const d = G && G.daily; newPuzzle(d ? 1 : P ? P.lv : opt.lv); });

  function enter() {
    show('wz');
    const sv = store.get('wz.save', null);
    if ((!P || !G || G.preview || G.phase === 'done') && sv && sv.P) { try { restoreSaved(sv); } catch (e) { P = null; G = null; store.del('wz.save'); } }
    if (live()) { rebuild(); startClock(); requestAnimationFrame(() => fit()); if (G.phase === 'play' && G.found.length === P.words.length) allFound(); }
    else { preview(); openStart(); }
  }
  function leave() {
    tick(); saveNow(); stopClock(); closeModals();
    $('#wzConf').innerHTML = ''; clearTimeout(toastT); $('#wzToast').classList.remove('show');
    drag = null; pend = -1; anims = []; parts = [];
    if (G && (G.phase === 'done' || G.preview)) { P = null; G = null; }
    show('menu'); refreshMenu();
  }

  /* ================= test hooks ================= */
  window.__wz = {
    get P() { return P; }, get G() { return G; }, get LY() { return LY; }, LEVELS, THEMES, opt, stats: () => stats,
    generate, verify, cellsOf, freeCells, wordAt, snapLine, newPuzzle, startDaily, restart, useHint, commit, tapTile, leftover, fit, enter, leave,
    cur: () => current, loopOn: () => !!raf, clockOn: () => !!clockT, frames: () => frames.slice(), busy: () => anims.length + parts.length,
    begin: (lv, seed, th) => begin(generate(lv, seed, th), null),
    // the middle of cell i on the screen
    xy(i) { const r = cvF.getBoundingClientRect(), k = r.width / LY.gs, [x, y] = cellXY(i); return { x: r.left + x * k, y: r.top + y * k }; },
    drawMs: () => drawHist.slice(),
    // the view must agree with the rules state (call when nothing moves)
    check() {
      const bad = [];
      if (!P) return bad;
      if (!LY || ![LY.gs, LY.cs, LY.pad].every(Number.isFinite)) bad.push('layout');
      if (G && !Number.isFinite(G.time)) bad.push('time');
      if (anims.some(A => !Number.isFinite(A.t0) || !Number.isFinite(A.dur))) bad.push('anim time');
      if (G && painted.found !== G.found.length) bad.push('board paints ' + painted.found + ' of ' + G.found.length);
      if (G && painted.phase !== G.phase) bad.push('board phase ' + painted.phase + ' vs ' + G.phase);
      const items = [...document.querySelectorAll('#wzList .wz-w')];
      if (items.length !== P.words.length) bad.push('list length');
      for (const el of items) { const k = +el.dataset.k; if (el.classList.contains('f') !== !!(G && G.found.includes(k))) bad.push('list ' + P.words[k].w); }
      if (G && new Set(G.found).size !== G.found.length) bad.push('found twice');
      if ($('#wzCount').textContent !== `${G ? G.found.length : 0}/${P.words.length}`) bad.push('count');
      if (G && ($('#wzSecret').hidden !== !(G.phase === 'secret' || (G.phase === 'done' && P.secret && G.tiles)))) bad.push('secret panel');
      const shown = id => getComputedStyle($(id)).display !== 'none';
      if (shown('#wzSecret') === shown('#wzList')) bad.push('list and hidden-word panel both ' + (shown('#wzList') ? 'shown' : 'hidden'));
      if (G && G.phase === 'secret') { const L = leftover(); if (document.querySelectorAll('#wzTiles button').length !== L.length) bad.push('tiles'); if (document.querySelectorAll('#wzSlots b.on').length !== G.slots.length) bad.push('slots'); }
      return bad;
    },
  };
  return { enter, leave, hasSave: () => !!store.get('wz.save', null) };
