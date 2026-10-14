  /* ================= game state, options, stats ================= */
  const D = { mode: 'cpu', level: 'normaal', layout: 'std', name1: 'Speler 1', name2: 'Speler 2', zoom: true, sound: true };
  const opt = Object.assign({}, D, store.get('wb.settings', {}));
  const saveOpt = () => store.set('wb.settings', opt);
  let stats = Object.assign({ played: 0, won: 0, lost: 0, draw: 0, duo: 0, sterk: 0, bestWord: 0, bestWordTxt: '', bestGame: 0 }, store.get('wb.stats', {}));
  const saveStats = () => store.set('wb.stats', stats);
  Sfx.gate('wb', () => opt.sound);
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const LEVELS = { makkelijk: 'Makkelijk', normaal: 'Normaal', sterk: 'Sterk' };
  let S = null, hand = [], sel = null, busy = false, token = 0, incoming = [], uid = 0, covered = false, prevEval = null;
  const scr = $('#wb'), wrap = $('#wbBoardWrap'), board = $('#wbBoard'), grid = $('#wbGrid'), rackEl = $('#wbRack');
  const seat = () => !S ? 0 : S.mode === 'cpu' ? 0 : S.turn;
  const name = p => !S ? '' : S.mode === 'cpu' ? (p ? 'Computer' : 'Jij') : S.names[p];
  const humanTurn = () => S && !S.over && (S.mode === '2p' || S.turn === 0);
  const canAct = () => humanTurn() && !busy && !covered && !!dict;
  const save = () => { if (!S || S.over) return; if (humanTurn()) S.racks[seat()] = hand.map(t => t.ch); store.set('wb.save', S); };
  const pending = () => hand.filter(t => t.at >= 0);
  function syncHand() {
    hand = S ? S.racks[seat()].map(ch => ({ id: 't' + (++uid), ch, at: -1, as: '' })) : []; sel = null; prevEval = null;
  }

  /* ================= board build & zoom ================= */
  const LBL = { d: '2L', t: '3L', D: '2W', T: '3W', '*': '★' };
  function buildBoard() {
    let h = ''; for (let i = 0; i < 225; i++) h += `<div class="wb-c" data-i="${i}"></div>`;
    grid.innerHTML = h;
  }
  function paintBonus() {
    const B = S ? S.bonus : STD;
    for (let i = 0; i < 225; i++) { const el = grid.children[i], k = B[i]; el.className = 'wb-c' + (k !== '.' ? ' b-' + (k === '*' ? 'st' : k === 'd' ? 'dl' : k === 't' ? 'tl' : k === 'D' ? 'dw' : 'tw') : ''); el.dataset.l = LBL[k] || ''; }
  }
  const Z = { s: 1, x: 0, y: 0 };
  let bsz = 300, frame = 8, cs = 19;
  function applyZ(anim) {
    const W = bsz; Z.s = Math.max(1, Math.min(2.8, Z.s));
    Z.x = Math.min(0, Math.max(W - W * Z.s, Z.x)); Z.y = Math.min(0, Math.max(W - W * Z.s, Z.y));
    board.classList.toggle('zanim', !!anim);
    board.style.transform = Z.s === 1 ? '' : `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`;
    wrap.classList.toggle('zoomed', Z.s > 1.01);
  }
  function zoomAt(s, px, py, anim = true) {        // px, py: point in board content coords to bring to the middle
    Z.s = s; Z.x = bsz / 2 - px * s; Z.y = bsz / 2 - py * s; applyZ(anim);
  }
  function ensureVisible(cells) {                // keep the tiles being placed inside the zoomed view
    if (Z.s <= 1.01 || !cells.length) return;
    const xs = cells.map(i => cellCenter(i)[0]), ys = cells.map(i => cellCenter(i)[1]), m = cs * .9;
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
    let nx = Z.x, ny = Z.y;
    if (x0 * Z.s + nx < 0) nx = -x0 * Z.s; if (x1 * Z.s + nx > bsz) nx = bsz - x1 * Z.s;
    if (y0 * Z.s + ny < 0) ny = -y0 * Z.s; if (y1 * Z.s + ny > bsz) ny = bsz - y1 * Z.s;
    if (nx !== Z.x || ny !== Z.y) { Z.x = nx; Z.y = ny; applyZ(true); }
  }
  const zoomOut = () => { if (Z.s > 1.01) { Z.s = 1; Z.x = Z.y = 0; applyZ(true); } };
  const cellCenter = i => [frame + (i % 15 + .5) * cs, frame + (Math.floor(i / 15) + .5) * cs];
  function fit() {
    if (current !== 'wb') return;
    const land = innerWidth > innerHeight * 1.1; scr.classList.toggle('land', land);
    const st = $('#wbStage'), main = $('#wbMain');
    let w, h;
    if (land) { st.style.height = ''; w = st.clientWidth; h = st.clientHeight; }
    else { w = main.clientWidth - 12; h = main.clientHeight - $('#wbStatus').offsetHeight - $('#wbDock').offsetHeight - 30; }
    const s = Math.max(200, Math.floor(Math.min(w, h)));
    if (!land) st.style.height = s + 'px';
    if (s === bsz && board.style.width) return;
    bsz = s; frame = Math.round(s * .022); cs = (s - frame * 2) / 15;
    wrap.style.width = wrap.style.height = s + 'px'; board.style.width = board.style.height = s + 'px';
    board.style.setProperty('--cs', cs + 'px'); board.style.setProperty('--fr', frame + 'px');
    Z.s = 1; applyZ(false); renderPreview();
  }
  window.addEventListener('resize', () => { if (current === 'wb') setTimeout(fit, 60); });
  function cellFromPoint(x, y) {
    const r = grid.getBoundingClientRect(); if (x < r.left || y < r.top || x >= r.right || y >= r.bottom) return -1;
    const c = Math.floor((x - r.left) / r.width * 15), rw = Math.floor((y - r.top) / r.height * 15);
    return rw * 15 + c;
  }

  /* ================= rendering ================= */
  const tileHtml = (ch, blankAs, cls, id) => {
    const isBlank = ch === '?' || ch !== ch.toLowerCase(), L = (ch === '?' ? (blankAs || '') : ch).toUpperCase();
    return `<div class="wb-t${isBlank ? ' bl' : ''}${cls ? ' ' + cls : ''}"${id ? ` data-id="${id}"` : ''}><span>${L}</span>${isBlank ? '' : `<sub>${val(ch.toLowerCase())}</sub>`}</div>`;
  };
  function renderBoard() {
    if (!S) return;
    const pend = new Map(pending().map(t => [t.at, t])), inc = new Map(incoming.map(t => [t.i, t])), last = new Set(S.last || []);
    for (let i = 0; i < 225; i++) {
      const el = grid.children[i]; let h = '';
      if (S.board[i]) h = tileHtml(S.board[i], '', last.has(i) ? 'last' : '');
      else if (inc.has(i)) { const t = inc.get(i); h = tileHtml(t.b ? t.c.toUpperCase() : t.c, '', 'last drop'); }
      else if (pend.has(i)) { const t = pend.get(i); h = tileHtml(t.ch, t.as, 'pend' + (t.bad ? ' bad' : ''), t.id); }
      if (el._h !== h) { el.innerHTML = h; el._h = h; }
    }
  }
  function renderRack() {
    const show = S && !(S.mode === '2p' && covered);
    let h = '';
    if (show) for (const t of hand) if (t.at < 0) h += tileHtml(t.ch, '', 'rk' + (sel === t.id ? ' sel' : ''), t.id);
    rackEl.innerHTML = h;
    rackEl.classList.toggle('off', !canAct());
  }
  function renderBar() {
    if (!S) return;
    for (const p of [0, 1]) {
      const el = $('#wbP' + p);
      el.querySelector('small').textContent = name(p);
      el.title = S.mode === 'cpu' && p === 1 ? 'Computer · ' + LEVELS[S.level] : name(p);
      el.querySelector('.av').textContent = S.mode === 'cpu' ? (p ? '🤖' : '🙂') : (p ? '😎' : '🙂');
      const b = el.querySelector('b'), v = S.scores[p];
      if (+b.dataset.v !== v) { countTo(b, +b.dataset.v || 0, v); b.dataset.v = v; }
      el.classList.toggle('on', !S.over && S.turn === p);
      el.classList.toggle('think', !S.over && busy && S.mode === 'cpu' && p === 1 && S.turn === 1);
    }
    $('#wbBag b').textContent = S.bag.length;
  }
  function countTo(el, a, b) {
    const t0 = performance.now(), dur = Math.min(900, 200 + Math.abs(b - a) * 12), me = el._cnt = {};
    const step = () => { if (el._cnt !== me) return; const k = Math.min(1, (performance.now() - t0) / dur); el.textContent = Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    step();
  }
  function lastSummary() {
    const h = S && S.hist[S.hist.length - 1]; if (!h) return '';
    if (h.k === 'w') return `${esc(name(h.p))}: <em>+${h.pts}</em> <b>${h.words.map(esc).join(', ')}</b>`;
    if (h.k === 's') return `${esc(name(h.p))} ruilde ${h.n} ${h.n === 1 ? 'letter' : 'letters'}`;
    return `${esc(name(h.p))} paste`;
  }
  function renderStatus() {
    if (!S) { $('#wbStatus').innerHTML = ''; return; }
    let right = '';
    if (S.over) right = 'Spel afgelopen';
    else if (busy && S.mode === 'cpu' && S.turn === 1) right = '<span class="wb-dots">Computer denkt na</span>';
    else if (humanTurn()) right = S.mode === 'cpu' ? 'Jouw beurt' : `Beurt: ${esc(name(S.turn))}`;
    const ls = lastSummary();
    $('#wbStatus').innerHTML = `<span class="ls">${ls || (S.hist.length ? '' : S.mode === 'cpu' ? (S.turn === 0 ? 'Jij begint' : 'De computer begint') : esc(name(S.turn)) + ' begint')}</span><span class="tr">${right}</span>`;
  }
  const histRow = h => `<li class="p${h.p}"><i></i><span><b>${esc(name(h.p))}</b> ${h.k === 'w' ? esc(h.words.join(', ')) + (h.bingo ? ' <em class="bg">alle 7!</em>' : '') : h.k === 's' ? `ruilde ${h.n} ${h.n === 1 ? 'letter' : 'letters'}` : 'paste'}</span><em>${h.k === 'w' ? '+' + h.pts : '–'}</em></li>`;
  function renderLog() {
    const el = $('#wbLog'); if (!S) { el.innerHTML = ''; return; }
    const H = S.hist.slice(-8).reverse();
    el.innerHTML = H.length ? `<ul>${H.map(histRow).join('')}</ul>` : `<p>${S.mode === 'cpu' ? 'Sleep letters uit je rek naar het bord, of tik een letter en daarna een vakje. Het eerste woord gaat over de ★.' : 'Om de beurt leggen: geef de telefoon na elke zet door.'}</p>`;
  }
  function renderActs() {
    const ok = canAct(), pend = pending().length;
    scr.querySelectorAll('#wbActs button').forEach(b => { b.disabled = !ok; });
    $('#wbMix').innerHTML = pend ? '<b>↩</b><small>Terug</small>' : '<b>⇆</b><small>Schudden</small>';
    $('#wbPlay').classList.toggle('ready', ok && pend > 0);
  }
  function renderPreview() {
    const el = $('#wbPrev'); if (!el) return;
    const ev = prevEval;
    if (!ev || ev.err || !S || !canAct()) { el.className = ''; $('#wbPlay small').textContent = ''; return; }
    const main = ev.words[0], end = main ? main.cells[main.cells.length - 1] : pending()[0].at;
    const [x, y] = cellCenter(end);
    el.style.left = Math.min(bsz - cs * .6, x + cs * .55) + 'px'; el.style.top = Math.max(cs * .4, y - cs * .58) + 'px';
    el.textContent = '+' + ev.score; el.className = 'show' + (ev.bingo ? ' bingo' : '');
    $('#wbPlay small').textContent = '+' + ev.score;
  }
  function updateEval() {
    const pend = pending();
    $('#wbPlay small').textContent = '';
    hand.forEach(t => { t.bad = false; });
    if (!pend.length || !S) { prevEval = null; renderPreview(); return; }
    if (pend.some(t => t.ch === '?' && !t.as)) { prevEval = null; renderPreview(); return; }
    prevEval = evaluate(S.board, pend.map(t => ({ i: t.at, c: t.ch === '?' ? t.as : t.ch, b: t.ch === '?' })), S.bonus);
    renderPreview();
  }
  function render() {
    renderBar(); renderBoard(); renderRack(); renderStatus(); renderLog(); renderActs(); renderPreview();
    $('#wbLoad').classList.toggle('show', !dict && current === 'wb');
  }
  // FLIP: animate tiles from where they were to where they are after fn()
  function flip(fn, extra) {
    const before = new Map(extra || []);
    scr.querySelectorAll('.wb-t[data-id]').forEach(el => { if (!before.has(el.dataset.id)) before.set(el.dataset.id, el.getBoundingClientRect()); });
    fn();
    scr.querySelectorAll('.wb-t[data-id]').forEach(el => {
      const r0 = before.get(el.dataset.id); if (!r0) return;
      const r1 = el.getBoundingClientRect(), k = board.contains(el) ? Z.s : 1;
      const dx = (r0.left - r1.left) / k, dy = (r0.top - r1.top) / k, sc = r0.width / r1.width;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sc - 1) < .03) return;
      el.style.transition = 'none'; el.style.transformOrigin = '0 0'; el.style.transform = `translate(${dx}px,${dy}px) scale(${sc})`; el.style.zIndex = 5;
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'transform .26s cubic-bezier(.2,.85,.25,1)'; el.style.transform = ''; setTimeout(() => { el.style.zIndex = ''; el.style.transition = ''; }, 300); }));
    });
  }
  function toast(msg, ms = 2400, kind = '') {
    const el = $('#wbToast'); el.innerHTML = msg; el.className = 'show' + (kind ? ' ' + kind : '');
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = ''; }, ms);
  }
  function floatScore(cells, pts, bingo) {
    const i = cells[cells.length - 1], [x, y] = cellCenter(i), el = document.createElement('div');
    el.className = 'wb-float' + (bingo ? ' bingo' : ''); el.textContent = '+' + pts; el.style.left = Math.max(cs * 1.4, Math.min(bsz - cs * 1.4, x)) + 'px'; el.style.top = Math.max(cs, y) + 'px';
    board.appendChild(el); setTimeout(() => el.remove(), 1500);
    if (bingo) { const b = document.createElement('div'); b.className = 'wb-bingo'; b.innerHTML = '<b>Alle 7!</b><small>+40 bonus</small>'; scr.appendChild(b); setTimeout(() => b.remove(), 1900); }
  }

  /* ================= placing tiles ================= */
  function placeTile(id, cell, viaDrag) {
    const t = hand.find(x => x.id === id); if (!t || !canAct()) return;
    if (S.board[cell] || pending().some(x => x.at === cell)) return;
    const wasAt = t.at;
    t.at = cell; sel = null; sfx('wbTile'); vibrate(8);
    if (opt.zoom && Z.s < 1.05 && wasAt < 0 && bsz / 15 < 34) { const [x, y] = cellCenter(cell); zoomAt(1.75, x, y); }
    else ensureVisible(pending().map(x => x.at));
    updateEval();
    if (!viaDrag) flip(() => { renderBoard(); renderRack(); }); else { renderBoard(); renderRack(); }
    renderActs(); renderPreview();
    if (t.ch === '?' && !t.as) openBlank(t);
  }
  function toRack(id, idx) {
    const t = hand.find(x => x.id === id); if (!t) return;
    t.at = -1; t.as = '';
    if (idx != null) { hand.splice(hand.indexOf(t), 1); const rackOrder = hand.filter(x => x.at < 0); const before = rackOrder[idx]; hand.splice(before ? hand.indexOf(before) : hand.length, 0, t); }
    updateEval(); save();
  }
  function recallAll() { if (!pending().length) return; flip(() => { for (const t of hand) { t.at = -1; t.as = ''; } updateEval(); renderBoard(); renderRack(); }); renderActs(); renderPreview(); sfx('wbShuffle'); }
  function mixRack() {
    flip(() => { const rest = hand.filter(t => t.at < 0); shuffle(rest); let k = 0; hand = hand.map(t => t.at < 0 ? rest[k++] : t); renderRack(); });
    sfx('wbShuffle'); save();
  }
  // blank chooser
  let blankFor = null;
  function openBlank(t) {
    blankFor = t.id;
    $('#wbBlankGrid').innerHTML = [...'abcdefghijklmnopqrstuvwxyz'].map(c => `<button data-c="${c}">${c.toUpperCase()}</button>`).join('');
    openModal('wbBlankModal');
  }
  $('#wbBlankGrid').addEventListener('click', e => {
    const b = e.target.closest('button[data-c]'); if (!b) return;
    const t = hand.find(x => x.id === blankFor); closeModals(); if (!t) return;
    t.as = b.dataset.c; sfx('wbTile'); updateEval(); renderBoard(); renderPreview();
  });
  const cancelBlank = () => { const t = hand.find(x => x.id === blankFor); blankFor = null; if (t && t.at >= 0 && !t.as) { flip(() => { toRack(t.id); renderBoard(); renderRack(); }); renderActs(); } };
  $('#wbBlankCancel').addEventListener('click', () => { closeModals(); cancelBlank(); });
  $('#wbBlankModal').addEventListener('click', e => { if (e.target.id === 'wbBlankModal') cancelBlank(); });

  /* ================= input: drag & drop, tap-tap, pinch / double-tap zoom ================= */
  let drag = null, gest = null, lastTap = { t: 0, x: 0, y: 0 };
  const ptrs = new Map();
  function startTileDrag(e, el) {
    const id = el.dataset.id; if (!canAct()) return false;
    drag = { id, el, pid: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, from: board.contains(el) ? 'board' : 'rack', touch: e.pointerType !== 'mouse', hov: -1 };
    return true;
  }
  function dragMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved) {
      if (dx * dx + dy * dy < 49) return;
      drag.moved = true;
      const g = document.createElement('div'), t = hand.find(x => x.id === drag.id), sz = Math.round(Math.min(64, Math.max(46, rackEl.clientHeight * .82)));
      g.className = 'wb-ghost'; g.innerHTML = tileHtml(t.ch, t.as, 'rk'); g.style.width = g.style.height = sz + 'px'; g.style.setProperty('--rs', sz + 'px');
      document.body.appendChild(g); drag.ghost = g; drag.sz = sz; drag.el.classList.add('lifted'); sfx('tap');
      if (sel) { sel = null; renderRack(); drag.el = scr.querySelector(`.wb-t[data-id="${drag.id}"]`) || drag.el; drag.el.classList.add('lifted'); }
    }
    const off = drag.touch ? drag.sz * .75 : 0, gx = e.clientX, gy = e.clientY - off;
    drag.ghost.style.transform = `translate(${gx - drag.sz / 2}px,${gy - drag.sz / 2}px) scale(1.06)`;
    const c = cellFromPoint(gx, gy), free = c >= 0 && !S.board[c] && !pending().some(x => x.at === c && x.id !== drag.id);
    const h = free ? c : -1;
    if (h !== drag.hov) { if (drag.hov >= 0) grid.children[drag.hov].classList.remove('hov'); if (h >= 0) grid.children[h].classList.add('hov'); drag.hov = h; }
    drag.gx = gx; drag.gy = gy;
  }
  function dragEnd(e, cancel) {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    const d = drag; drag = null;
    if (d.hov >= 0) grid.children[d.hov].classList.remove('hov');
    if (!d.moved) { if (!cancel) tapTile(d.id, d.from); return; }
    const gr = d.ghost.getBoundingClientRect(); d.ghost.remove();
    const extra = [[d.id, gr]], t = hand.find(x => x.id === d.id);
    const rr = rackEl.getBoundingClientRect();
    if (!cancel && d.hov >= 0) {
      flip(() => { if (t.at >= 0) t.at = -1; placeTile(d.id, d.hov, true); }, extra);
      return;
    }
    if (!cancel && d.gy > rr.top - 30) {             // dropped on / near the rack: put it there (reorder)
      const rest = hand.filter(x => x.at < 0 && x.id !== d.id), els = [...rackEl.children].filter(el => el.dataset.id !== d.id);
      let idx = els.findIndex(el => { const r = el.getBoundingClientRect(); return d.gx < r.left + r.width / 2; }); if (idx < 0) idx = rest.length;
      flip(() => { toRack(d.id, idx); renderBoard(); renderRack(); }, extra); renderActs(); renderPreview();
      if (d.from === 'board') sfx('tap');
      return;
    }
    flip(() => { if (d.from === 'board') toRack(d.id); renderBoard(); renderRack(); }, extra); renderActs(); renderPreview();
  }
  function tapTile(id, from) {
    const t = hand.find(x => x.id === id); if (!t || !canAct()) return;
    if (from === 'board') {
      if (t.ch === '?' && !t.as) { openBlank(t); return; }
      flip(() => { toRack(id); renderBoard(); renderRack(); }); renderActs(); renderPreview(); sfx('tap'); return;
    }
    sel = sel === id ? null : id; sfx('tap'); renderRack();
  }
  rackEl.addEventListener('pointerdown', e => { const el = e.target.closest('.wb-t[data-id]'); if (!el) return; e.preventDefault(); startTileDrag(e, el); });
  window.addEventListener('pointermove', e => { if (drag) dragMove(e); });
  window.addEventListener('pointerup', e => { if (drag) dragEnd(e); });
  window.addEventListener('pointercancel', e => { if (drag) dragEnd(e, true); });

  // board: pending-tile drags, taps, pan, pinch and double-tap zoom
  wrap.addEventListener('pointerdown', e => {
    if (!S) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      const el = e.target.closest('.wb-t.pend[data-id]');
      if (el && startTileDrag(e, el)) { gest = null; return; }
      gest = { kind: 'tap', x0: e.clientX, y0: e.clientY, zx: Z.x, zy: Z.y, t: performance.now() };
    } else if (ptrs.size === 2) {
      if (drag) dragEnd(null, true);
      const [a, b] = [...ptrs.values()], r = wrap.getBoundingClientRect();
      gest = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: Z.s, cx: ((a.x + b.x) / 2 - r.left - Z.x) / Z.s, cy: ((a.y + b.y) / 2 - r.top - Z.y) / Z.s };
    }
  });
  wrap.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gest || drag) return;
    if (gest.kind === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], r = wrap.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y);
      Z.s = Math.max(1, Math.min(2.8, gest.s0 * d / gest.d0));
      Z.x = (a.x + b.x) / 2 - r.left - gest.cx * Z.s; Z.y = (a.y + b.y) / 2 - r.top - gest.cy * Z.s; applyZ(false);
    } else if (gest.kind === 'tap' || gest.kind === 'pan') {
      const dx = e.clientX - gest.x0, dy = e.clientY - gest.y0;
      if (gest.kind === 'tap' && dx * dx + dy * dy > 64) gest.kind = 'pan';
      if (gest.kind === 'pan' && Z.s > 1) { Z.x = gest.zx + dx; Z.y = gest.zy + dy; applyZ(false); }
    }
  });
  const endPtr = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (gest && gest.kind === 'tap' && e.type === 'pointerup' && !ptrs.size) boardTap(e.clientX, e.clientY);
    if (!ptrs.size) gest = null; else if (gest && gest.kind === 'pinch') gest = { kind: 'done' };
  };
  wrap.addEventListener('pointerup', endPtr); wrap.addEventListener('pointercancel', endPtr);
  wrap.addEventListener('wheel', e => { if (!S) return; e.preventDefault(); const r = wrap.getBoundingClientRect(), px = (e.clientX - r.left - Z.x) / Z.s, py = (e.clientY - r.top - Z.y) / Z.s, s = Math.max(1, Math.min(2.8, Z.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); Z.x = e.clientX - r.left - px * s; Z.y = e.clientY - r.top - py * s; Z.s = s; applyZ(false); }, { passive: false });
  function boardTap(x, y) {
    const c = cellFromPoint(x, y);
    if (sel && c >= 0 && canAct() && !S.board[c] && !pending().some(t => t.at === c)) { placeTile(sel, c); return; }
    const now = performance.now();
    if (now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30) {
      lastTap.t = 0;
      if (Z.s > 1.05) { Z.s = 1; Z.x = Z.y = 0; applyZ(true); }
      else { const r = wrap.getBoundingClientRect(); zoomAt(2, (x - r.left - Z.x) / Z.s, (y - r.top - Z.y) / Z.s); }
      return;
    }
    lastTap = { t: now, x, y };
  }

  /* ================= turns ================= */
  function draw(p) { const r = S.racks[p]; while (r.length < 7 && S.bag.length) r.push(S.bag.pop()); }
  function wordSound(pts, bingo) { if (bingo) sfx('wbBingo'); else sfx(pts >= 30 ? 'wbWord3' : pts >= 15 ? 'wbWord2' : 'wbWord1'); }
  function commitMove(p, tiles) {
    const ev = evaluate(S.board, tiles, S.bonus), rack = S.racks[p]; zoomOut();
    for (const t of tiles) { S.board[t.i] = t.b ? t.c.toUpperCase() : t.c; const k = rack.indexOf(t.b ? '?' : t.c); if (k >= 0) rack.splice(k, 1); }
    S.scores[p] += ev.score; S.last = tiles.map(t => t.i); S.idle = 0; S.moves++;
    draw(p);
    S.hist.push({ p, k: 'w', words: ev.words.map(w => w.w), pts: ev.score, bingo: ev.bingo });
    if (S.mode === '2p' || p === 0) { if (ev.score > stats.bestWord) { stats.bestWord = ev.score; stats.bestWordTxt = ev.words[0].w; } S.best[p] = Math.max(S.best[p] || 0, ev.score); saveStats(); }
    wordSound(ev.score, ev.bingo); floatScore(ev.words[0].cells, ev.score, ev.bingo);
    if (!rack.length && !S.bag.length) { endGame('out', p); return; }
    nextTurn();
  }
  function doSwap(p, chars) {
    const rack = S.racks[p];
    for (const c of chars) { const k = rack.indexOf(c); if (k >= 0) rack.splice(k, 1); }
    draw(p); S.bag.push(...chars); shuffle(S.bag);
    S.hist.push({ p, k: 's', n: chars.length }); S.idle++; S.last = [];
    sfx('wbSwap');
    if (S.idle >= 6) { endGame('pass'); return; }
    nextTurn();
  }
  function doPass(p) {
    S.hist.push({ p, k: 'p' }); S.idle++; sfx('tap');
    if (S.idle >= 6) { endGame('pass'); return; }
    nextTurn();
  }
  function nextTurn() {
    S.turn ^= 1; syncHand(); save(); render(); startTurn();
  }
  function startTurn() {
    if (!S || S.over || current !== 'wb') return;
    if (!dict) { render(); return; }
    if (S.mode === 'cpu' && S.turn === 1) { setTimeout(() => cpuTurn(), 350); return; }
    if (S.mode === '2p') cover();
    render();
  }
  function cover() {
    covered = true;
    const h = S.hist[S.hist.length - 1];
    $('#wbCoverTitle').textContent = `Beurt voor ${name(S.turn)}`;
    $('#wbCoverSub').innerHTML = h ? lastSummary() : `${esc(name(S.turn))} begint. Geef de telefoon door en tik als je klaar bent.`;
    $('#wbCover').classList.add('show'); render();
  }
  $('#wbCover').addEventListener('click', e => { if (!e.target.closest('button')) return; covered = false; $('#wbCover').classList.remove('show'); sfx('tap'); render(); });

  async function cpuTurn() {
    if (!S || S.over || S.mode !== 'cpu' || S.turn !== 1 || busy || current !== 'wb') return;
    const my = ++token; busy = true; render();
    try {
      await loadDict(); if (my !== token) return;
      const t0 = performance.now(), rack = S.racks[1];
      const moves = await genMovesAsync(S.board, rack, S.bonus, () => my === token);
      if (my !== token || !moves) return;
      S.cpuMs = Math.round(performance.now() - t0);
      let m = choose(moves, rack, S.level, S.bag.length);
      if (m && S.level === 'sterk' && S.bag.length >= 7 && m.score < 8 && leaveValue(leftAfter(rack, m), S.bag.length) < -4) m = null;
      await sleep(Math.max(150, 650 - (performance.now() - t0))); if (my !== token) return;
      if (m) {
        const tiles = tilesOf(m); zoomOut(); await sleep(Z.s > 1 ? 300 : 0);
        for (const t of tiles) { incoming.push(t); renderBoard(); sfx('wbTile'); await sleep(180); if (my !== token) { incoming = []; return; } }
        await sleep(160); incoming = []; if (my !== token) return;
        busy = false; commitMove(1, tiles);
      } else if (S.bag.length >= 7) { busy = false; doSwap(1, swapPick(rack, S.level)); toast('De computer ruilt letters', 1800); }
      else { busy = false; doPass(1); toast('De computer past', 1800); }
    } finally { if (my === token) { busy = false; incoming = []; render(); } }
  }

  /* ================= human actions ================= */
  async function play() {
    if (!canAct()) return;
    const pend = pending();
    if (!pend.length) { toast('Sleep letters uit je rek naar het bord'); return; }
    if (pend.some(t => t.ch === '?' && !t.as)) { const t = pend.find(t => t.ch === '?' && !t.as); openBlank(t); return; }
    const tiles = pend.map(t => ({ i: t.at, c: t.ch === '?' ? t.as : t.ch, b: t.ch === '?' }));
    const ev = evaluate(S.board, tiles, S.bonus);
    if (ev.err) { bad(ev.err, pend.map(t => t.id)); return; }
    if (ev.bad.length) {
      const cells = new Set(ev.words.filter(w => !w.ok).flatMap(w => w.cells));
      bad(ev.bad.length === 1 ? `<b>${esc(ev.bad[0])}</b> staat niet in de woordenlijst` : `Niet in de woordenlijst: <b>${ev.bad.map(esc).join(', ')}</b>`, pend.filter(t => cells.has(t.at)).map(t => t.id), [...cells]);
      return;
    }
    const p = seat();
    S.racks[p] = pend.map(t => t.ch).concat(hand.filter(t => t.at < 0).map(t => t.ch));   // played tiles first, so the rest keeps its order
    hand = hand.filter(t => t.at < 0); prevEval = null; renderPreview();
    commitMove(p, tiles);
  }
  function bad(msg, ids, cells) {
    sfx('wbBad'); vibrate(40); toast(msg, 2800, 'err');
    for (const t of hand) t.bad = ids.includes(t.id);
    renderBoard();
    (cells || []).forEach(i => { const el = grid.children[i]; el.classList.remove('badw'); void el.offsetWidth; el.classList.add('badw'); setTimeout(() => el.classList.remove('badw'), 1400); });
    setTimeout(() => { hand.forEach(t => { t.bad = false; }); renderBoard(); }, 1400);
  }
  async function pass() {
    if (!canAct()) return;
    const yes = await askConfirm('Passen?', 'Weet je zeker dat je deze beurt overslaat?', 'Passen');
    if (!yes || !canAct()) return;
    for (const t of hand) { t.at = -1; t.as = ''; }
    doPass(seat());
  }
  let swapSel = new Set();
  function openSwap() {
    if (!canAct()) return;
    recallAll(); swapSel = new Set();
    renderSwap(); openModal('wbSwapModal');
  }
  function renderSwap() {
    const can = S.bag.length >= 7;
    $('#wbSwapRack').innerHTML = hand.map(t => tileHtml(t.ch, '', 'rk' + (swapSel.has(t.id) ? ' sel' : ''), t.id)).join('');
    $('#wbSwapNote').textContent = can ? 'Tik de letters aan die je terug in de zak wilt doen. Daarna is de ander aan de beurt.' : `Ruilen kan alleen als er nog minstens 7 letters in de zak zitten (nu ${S.bag.length}).`;
    $('#wbSwapGo').disabled = !can || !swapSel.size; $('#wbSwapGo').textContent = swapSel.size ? `Ruil ${swapSel.size} ${swapSel.size === 1 ? 'letter' : 'letters'}` : 'Ruilen';
    $('#wbSwapAll').hidden = !can;
  }
  $('#wbSwapRack').addEventListener('click', e => { const el = e.target.closest('.wb-t[data-id]'); if (!el || S.bag.length < 7) return; const id = el.dataset.id; if (swapSel.has(id)) swapSel.delete(id); else swapSel.add(id); sfx('tap'); renderSwap(); });
  $('#wbSwapAll').addEventListener('click', () => { swapSel = swapSel.size === hand.length ? new Set() : new Set(hand.map(t => t.id)); renderSwap(); });
  $('#wbSwapGo').addEventListener('click', () => {
    if (!canAct() || S.bag.length < 7 || !swapSel.size) return;
    const p = seat(), out = hand.filter(t => swapSel.has(t.id)).map(t => t.ch);
    S.racks[p] = hand.filter(t => !swapSel.has(t.id)).map(t => t.ch).concat(out);
    closeModals(); doSwap(p, out);
  });
  $('#wbSwapCancel').addEventListener('click', () => closeModals());
  async function tip() {
    if (!canAct()) return;
    recallAll(); busy = true; render(); const my = token;
    const moves = await genMovesAsync(S.board, hand.map(t => t.ch), S.bonus, () => my === token);
    busy = false; if (my !== token || !moves) return;
    if (!moves.length) { render(); toast('Er is geen woord mogelijk. Ruil letters of pas.', 2800); return; }
    let best = moves[0]; for (const m of moves) if (m.score > best.score) best = m;
    S.helped[seat()] = true;
    const tiles = tilesOf(best);
    flip(() => { for (const tl of tiles) { const t = hand.find(x => x.at < 0 && x.ch === (tl.b ? '?' : tl.c)); if (t) { t.at = tl.i; t.as = tl.b ? tl.c : ''; } } updateEval(); renderBoard(); renderRack(); });
    render(); sfx('magic'); toast(`Tip: <b>${esc(best.w.toUpperCase())}</b> voor ${best.score} punten`, 2600);
    save();
  }
  $('#wbActs').addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'play') play(); else if (a === 'mix') { if (pending().length) recallAll(); else if (canAct()) mixRack(); }
    else if (a === 'swap') openSwap(); else if (a === 'pass') pass(); else if (a === 'tip') tip();
  });

  /* ================= end of game ================= */
  function endGame(kind, outP) {
    const rem = [0, 1].map(p => S.racks[p].reduce((s, c) => s + val(c), 0)), adj = [0, 0];
    if (kind === 'out') { adj[outP] = rem[1 - outP]; adj[1 - outP] = -rem[1 - outP]; } else { adj[0] = -rem[0]; adj[1] = -rem[1]; }
    S.scores[0] += adj[0]; S.scores[1] += adj[1]; S.adj = adj; S.endKind = kind; S.outP = outP; S.over = true; S.turn = -1;
    const [a, b] = S.scores, win = a > b ? 0 : b > a ? 1 : -1; S.winner = win;
    if (S.mode === 'cpu') {
      if (win === 0) { stats.won++; if (S.level === 'sterk') stats.sterk++; } else if (win === 1) stats.lost++; else stats.draw++;
      stats.bestGame = Math.max(stats.bestGame, a);
    } else stats.bestGame = Math.max(stats.bestGame, a, b);
    saveStats(); store.del('wb.save'); covered = false; $('#wbCover').classList.remove('show');
    hand = []; sel = null; prevEval = null; render();
    setTimeout(() => sfx(S.mode === 'cpu' && win === 1 ? 'natLose' : 'wbEnd'), 500);
    setTimeout(() => showEnd(), 1300);
  }
  function showEnd() {
    if (!S || !S.over || current !== 'wb') return;
    const [a, b] = S.scores, win = S.winner;
    $('#wbEndEmoji').textContent = win < 0 ? '🤝' : S.mode === 'cpu' && win === 1 ? '🤖' : '🏆';
    $('#wbEndTitle').textContent = win < 0 ? 'Gelijkspel!' : S.mode === 'cpu' ? (win === 0 ? 'Je hebt gewonnen!' : 'De computer wint') : `${S.names[win]} wint!`;
    const why = S.endKind === 'out' ? `${name(S.outP)} ${S.mode === 'cpu' && S.outP === 0 ? 'hebt' : 'heeft'} alle letters weggespeeld.` : 'Beide spelers konden of wilden niet meer leggen.';
    const adjTxt = [0, 1].filter(p => S.adj[p]).map(p => `${esc(name(p))} ${S.adj[p] > 0 ? '+' : ''}${S.adj[p]}`).join(' · ');
    $('#wbEndText').innerHTML = `<div class="wb-endsc"><div><small>${esc(name(0))}</small><b>${a}</b></div><span>–</span><div><small>${esc(name(1))}</small><b>${b}</b></div></div>`
      + `<small>${esc(why)}${adjTxt ? '<br>Resterende letters: ' + adjTxt : ''}${S.helped.some(Boolean) ? '<br>Gespeeld met hulp (tip)' : ''}${S.best[0] ? `<br>Beste zet ${S.mode === 'cpu' ? 'van jou' : esc(name(0))}: ${S.best[0]} punten` : ''}</small>`;
    openModal('wbEndModal');
  }

  /* ================= history ================= */
  function renderHist() {
    const H = S ? S.hist.slice().reverse() : [];
    $('#wbHistList').innerHTML = H.length ? H.map(histRow).join('') : '<li class="none">Nog geen zetten</li>';
    $('#wbHistSum').textContent = S ? `${name(0)} ${S.scores[0]} · ${name(1)}${S.mode === 'cpu' ? ' (' + LEVELS[S.level].toLowerCase() + ')' : ''} ${S.scores[1]} · ${S.bag.length} letters in de zak` : '';
  }
  $('#wbHistBtn').addEventListener('click', () => { if (!S) return; renderHist(); openModal('wbHistModal'); });
  $('#wbHistClose').addEventListener('click', () => closeModals());
  $('#wbLog').addEventListener('click', () => { if (!S || !S.hist.length) return; renderHist(); openModal('wbHistModal'); });
  $('#wbStatus').addEventListener('click', () => { if (!S || !S.hist.length) return; renderHist(); openModal('wbHistModal'); });

  /* ================= start / options ================= */
  function renderStart() {
    const seg = (key, ch) => `<div class="seg">` + ch.map(([v, l]) => `<button data-key="${key}" data-val='${JSON.stringify(v)}' class="${opt[key] === v ? 'on' : ''}">${l}</button>`).join('') + `</div>`;
    $('#wbStartList').innerHTML = `<div class="opt"><div class="opt-label">Tegenstander</div>${seg('mode', [['cpu', '🤖 Computer'], ['2p', '👥 Met z\'n tweeën']])}</div>`
      + (opt.mode === 'cpu' ? `<div class="opt"><div class="opt-label">Niveau computer</div>${seg('level', Object.entries(LEVELS))}</div>`
        : `<div class="opt"><div class="opt-label">Namen</div><div class="names2"><input data-name="name1" maxlength="12" value="${esc(opt.name1)}" placeholder="Speler 1"><input data-name="name2" maxlength="12" value="${esc(opt.name2)}" placeholder="Speler 2"></div></div>`)
      + `<div class="opt"><div class="opt-label">Bord</div>${seg('layout', [['std', 'Standaard'], ['rnd', '🎲 Willekeurig bord']])}</div>`
      + `<div class="opt"><div class="opt-label">Inzoomen bij het leggen</div>${seg('zoom', [[true, 'Aan'], [false, 'Uit']])}</div>`
      + `<div class="opt"><div class="opt-label">Geluid en muziek</div>${seg('sound', [[true, 'Aan'], [false, 'Uit']])}</div>`
      + `<div class="stats"><div class="stat"><b>${stats.won}</b><small>Gewonnen</small></div><div class="stat"><b>${stats.bestWord}</b><small>Beste zet</small></div><div class="stat"><b>${stats.bestGame}</b><small>Hoogste score</small></div></div>`
      + `<p class="wb-credit">${dict ? `${dict.words.toLocaleString('nl-NL')} woorden` : 'Woordenlijst laden…'} · Woordenlijst: OpenTaal (BSD / CC BY 3.0)</p>`;
    $('#wbResume').hidden = !(S && !S.over);
  }
  $('#wbStartList').addEventListener('click', e => { const b = e.target.closest('button[data-key]'); if (!b) return; opt[b.dataset.key] = JSON.parse(b.dataset.val); saveOpt(); renderStart(); sfx('tap'); });
  $('#wbStartList').addEventListener('input', e => { const i = e.target.closest('input[data-name]'); if (i) { opt[i.dataset.name] = i.value.trim().slice(0, 12); saveOpt(); } });
  async function newGame(o) {
    if (!o && S && !S.over && S.hist.length) {
      const yes = await askConfirm('Nieuw spel?', 'Het lopende spel wordt gestopt.', 'Nieuw spel');
      if (!yes) { renderStart(); openModal('wbStartModal'); return; }
    }
    o = Object.assign({}, opt, o || {});
    closeModals(); token++; busy = false; incoming = []; covered = false; $('#wbCover').classList.remove('show');
    scr.querySelectorAll('.wb-float,.wb-bingo').forEach(el => el.remove()); $('#wbToast').className = '';
    const bag = newBag();
    S = { v: 1, mode: o.mode, level: o.level, names: [o.name1 || 'Speler 1', o.name2 || 'Speler 2'], bonus: o.layout === 'rnd' ? randomLayout() : STD, board: Array(225).fill(''),
      bag, racks: [bag.splice(0, 7), bag.splice(0, 7)], scores: [0, 0], turn: o.first != null ? o.first : Math.random() < .5 ? 0 : 1, idle: 0, moves: 0, hist: [], last: [], over: false, helped: [false, false], best: [0, 0] };
    if (S.mode === 'cpu') stats.played++; else stats.duo++;
    saveStats(); syncHand(); paintBonus(); Z.s = 1; applyZ(false);
    for (const id of ['#wbP0 b', '#wbP1 b']) { const el = $(id); el._cnt = null; el.dataset.v = 0; el.textContent = 0; }
    save(); render(); sfx('wbSwap');
    if (!dict) await loadDict().catch(() => {});
    render(); startTurn();
  }
  $('#wbGo').addEventListener('click', () => newGame());
  $('#wbResume').addEventListener('click', () => { closeModals(); startTurn(); });
  $('#wbStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#wbMenu').addEventListener('click', () => { renderStart(); openModal('wbStartModal'); });
  $('#wbBack').addEventListener('click', () => leave());
  $('#wbEndNew').addEventListener('click', () => newGame());
  $('#wbEndView').addEventListener('click', () => closeModals());
  $('#wbEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('wbStartModal'); });

  function enter() {
    show('wb');
    if (!grid.children.length) buildBoard();
    const saved = store.get('wb.save', null);
    if (!S && saved && saved.board && saved.racks) { S = saved; syncHand(); }
    paintBonus(); fit(); requestAnimationFrame(fit);
    if (S) [0, 1].forEach(p => { const el = $('#wbP' + p + ' b'); el._cnt = null; el.dataset.v = S.scores[p]; el.textContent = S.scores[p]; });
    render();
    const fresh = !S || S.over;
    if (fresh) { renderStart(); openModal('wbStartModal'); }
    setTimeout(() => loadDict().then(() => {
      if (current !== 'wb') return;
      render(); if ($('#wbStartModal').classList.contains('show')) renderStart();
      if (!fresh && S && !S.over && !anyModal()) startTurn();
    }).catch(() => { $('#wbLoad b').textContent = 'De woordenlijst kon niet worden geladen'; }), 50);
  }
  function leave() {
    token++; busy = false; incoming = [];
    if (drag) { if (drag.ghost) drag.ghost.remove(); drag = null; }
    save(); covered = false; $('#wbCover').classList.remove('show'); closeModals(); show('menu'); refreshMenu();
  }

  /* ================= test hooks ================= */
  function autoMove(level) {          // synchronous computer move for the player to move (tests / self-play)
    const p = S.turn, rack = S.racks[p];
    const m = choose(genMoves(S.board, rack, S.bonus), rack, level, S.bag.length);
    if (m) { if (humanTurn()) hand = []; commitMove(p, tilesOf(m)); return m; }
    if (S.bag.length >= 7) doSwap(p, swapPick(rack, level)); else doPass(p);
    return null;
  }
  window.__wb = { get S() { return S; }, get hand() { return hand; }, get dict() { return dict; }, get busy() { return busy; }, get Z() { return Z; }, get prev() { return prevEval; },
    loadDict, isWord, evaluate, genMoves, genMovesAsync, tilesOf, choose, STD, randomLayout, newGame, play, placeTile, recallAll, mixRack, tip, cpuTurn, autoMove, endGame, opt, stats: () => stats,
    setRack(chars) { S.racks[seat()] = chars.split(''); syncHand(); render(); }, setBoard(list) { for (const [i, c] of list) S.board[i] = c; render(); },
    pass: () => doPass(S.turn), swap: chars => doSwap(S.turn, chars), fit, zoomAt, applyZ };
  return { enter, leave, hasSave: () => !!store.get('wb.save', null) };
