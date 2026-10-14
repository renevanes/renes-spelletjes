/* ================================================================
   SUDOKU – generated puzzles with a unique solution, three levels,
   pencil notes, highlighting, undo, hints and a saved game
   ================================================================ */
const Sudoku = (() => {
  const LEVELS = { makkelijk: { clues: 40, name: 'Makkelijk' }, normaal: { clues: 32, name: 'Normaal' }, moeilijk: { clues: 26, name: 'Moeilijk' } };
  const D = { level: 'makkelijk', sound: true, errors: 'direct', pencil: false };
  const opt = Object.assign({}, D, store.get('sd.settings', {}));
  const saveOpt = () => store.set('sd.settings', opt);
  let stats = Object.assign({ played: 0, won: 0, best: {}, noHelp: 0 }, store.get('sd.stats', {}));
  const saveStats = () => store.set('sd.stats', stats);
  Sfx.gate('sd', () => opt.sound);
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  let S = null, sel = -1, timer = 0, undo = [];
  const board = $('#sdBoard'), pad = $('#sdPad');
  const ROW = i => Math.floor(i / 9), COL = i => i % 9, BOX = i => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const PEERS = Array.from({ length: 81 }, (_, i) => { const p = []; for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) p.push(j); return p; });
  const UNITS = []; for (let k = 0; k < 9; k++) { UNITS.push([...Array(9)].map((_, j) => k * 9 + j)); UNITS.push([...Array(9)].map((_, j) => j * 9 + k)); UNITS.push([...Array(9)].map((_, j) => (Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + j % 3)); }

  /* ---------- generator / solver (bitmask, fewest-candidates first) ---------- */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function solve(g, limit, randomize) {
    const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0); let count = 0, first = null;
    for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; rows[ROW(i)] |= b; cols[COL(i)] |= b; boxes[BOX(i)] |= b; }
    const rec = () => {
      let best = -1, bestM = 0, bestN = 10;
      for (let i = 0; i < 81; i++) if (!g[i]) { const m = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3FE; let n = 0; for (let v = m; v; v &= v - 1) n++; if (n < bestN) { best = i; bestM = m; bestN = n; if (!n) return false; } }
      if (best < 0) { count++; if (!first) first = g.slice(); return count >= limit; }
      let ds = []; for (let d = 1; d <= 9; d++) if (bestM & (1 << d)) ds.push(d); if (randomize) shuffle(ds);
      const r = ROW(best), c = COL(best), bx = BOX(best);
      for (const d of ds) {
        const b = 1 << d; g[best] = d; rows[r] |= b; cols[c] |= b; boxes[bx] |= b;
        if (rec()) { g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b; return true; }
        g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b;
      }
      return false;
    };
    rec(); return { count, first };
  }
  function generate(level) {
    const sol = solve(new Array(81).fill(0), 1, true).first, puz = sol.slice(), target = LEVELS[level].clues;
    let clues = 81;
    for (const i of shuffle([...Array(41).keys()])) {        // remove symmetric pairs while the solution stays unique
      if (clues <= target) break;
      const j = 80 - i, a = puz[i], b = puz[j]; puz[i] = 0; puz[j] = 0;
      if (solve(puz.slice(), 2).count !== 1) { puz[i] = a; puz[j] = b; } else clues -= i === j ? 1 : 2;
    }
    return { puz, sol };
  }

  /* ---------- game ---------- */
  function newGame(level) {
    closeModals(); board.classList.add('busy');
    setTimeout(() => {
      const { puz, sol } = generate(level);
      S = { lvl: level, puz, sol, val: puz.slice(), notes: new Array(81).fill(0), time: 0, mistakes: 0, hints: 0, over: false, counted: false };
      undo = []; sel = puz.findIndex(v => !v); board.classList.remove('busy');
      stats.played++; S.counted = true; saveStats(); save(); render(); sfx('shuffle');
    }, 30);
  }
  const save = () => { if (S && !S.over) store.set('sd.save', S); };
  const fixed = i => S.puz[i] > 0;
  const wrong = i => S.val[i] && S.val[i] !== S.sol[i];
  function conflict(i) { const v = S.val[i]; return v && PEERS[i].some(j => S.val[j] === v); }
  function place(d) {
    if (!S || S.over || sel < 0 || fixed(sel)) { if (S && sel >= 0 && fixed(sel)) sfx('tap'); return; }
    const i = sel;
    if (opt.pencil && d) {
      if (S.val[i]) return;
      undo.push({ i, val: S.val[i], notes: S.notes[i] }); S.notes[i] ^= 1 << d; sfx('sdNote'); save(); render(); return;
    }
    if (d && S.val[i] === d) d = 0;                 // tapping the same number again clears it
    undo.push({ i, val: S.val[i], notes: S.notes[i], peers: d ? PEERS[i].filter(j => S.notes[j] & (1 << d)) : [] });
    if (undo.length > 300) undo.shift();
    S.val[i] = d; S.notes[i] = 0;
    if (!d) { sfx('tap'); save(); render(); return; }
    for (const j of PEERS[i]) S.notes[j] &= ~(1 << d);
    if (d !== S.sol[i]) { S.mistakes++; if (opt.errors === 'direct') { sfx('sdError'); vibrate(40); } else sfx('sdPlace'); }
    else {
      const done = UNITS.filter(u => u.includes(i) && u.every(j => S.val[j] === S.sol[j]));
      if (done.length) { sfx('sdLine'); flash(done.flat()); } else sfx('sdPlace');
    }
    save(); render(); checkWin();
  }
  function flash(cells) { requestAnimationFrame(() => cells.forEach((j, k) => { const el = board.children[j]; if (!el) return; el.style.animationDelay = (k % 9) * 35 + 'ms'; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); })); }
  function doUndo() {
    const u = undo.pop(); if (!u || !S || S.over) return;
    const d = S.val[u.i]; if (u.peers && d) for (const j of u.peers) S.notes[j] |= 1 << d;
    S.val[u.i] = u.val; S.notes[u.i] = u.notes; sel = u.i; sfx('tap'); save(); render();
  }
  function erase() { if (!S || S.over || sel < 0 || fixed(sel)) return; if (!S.val[sel] && !S.notes[sel]) return; undo.push({ i: sel, val: S.val[sel], notes: S.notes[sel] }); S.val[sel] = 0; S.notes[sel] = 0; sfx('tap'); save(); render(); }
  function hint() {
    if (!S || S.over) return;
    let i = sel >= 0 && !fixed(sel) && S.val[sel] !== S.sol[sel] ? sel : -1;
    if (i < 0) { const open = []; for (let k = 0; k < 81; k++) if (S.val[k] !== S.sol[k]) open.push(k); if (!open.length) return; i = open[Math.floor(Math.random() * open.length)]; }
    undo.push({ i, val: S.val[i], notes: S.notes[i], peers: PEERS[i].filter(j => S.notes[j] & (1 << S.sol[i])) });
    S.val[i] = S.sol[i]; S.notes[i] = 0; S.hints++; sel = i;
    for (const j of PEERS[i]) S.notes[j] &= ~(1 << S.sol[i]);
    sfx('magic'); save(); render(); flash([i]); checkWin();
  }
  function checkWin() {
    if (!S.val.every((v, i) => v === S.sol[i])) return;
    S.over = true; store.del('sd.save'); stats.won++;
    const t = Math.floor(S.time), b = stats.best[S.lvl]; S.newBest = b == null || t < b; if (S.newBest) stats.best[S.lvl] = t;
    if (!S.hints && !S.mistakes) stats.noHelp++;
    saveStats(); render(); sfx('pfWin'); vibrate(30);
    flash([...Array(81).keys()]);
    setTimeout(() => {
      $('#sdEndTitle').textContent = 'Sudoku opgelost!';
      $('#sdEndText').innerHTML = `${LEVELS[S.lvl].name} in <b>${fmt(S.time)}</b>${S.newBest ? ' · 🎉 nieuwe beste tijd' : ''}<br><small>${S.mistakes ? S.mistakes + (S.mistakes === 1 ? ' fout' : ' fouten') : 'Geen fouten'} · ${S.hints ? S.hints + (S.hints === 1 ? ' hint' : ' hints') : 'geen hints'}</small>`;
      openModal('sdEndModal');
    }, 1100);
  }

  /* ---------- rendering ---------- */
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function build() {
    let h = '';
    for (let i = 0; i < 81; i++) { const r = ROW(i), c = COL(i); h += `<div class="sd-c${c % 3 === 2 && c < 8 ? ' br' : ''}${r % 3 === 2 && r < 8 ? ' bb' : ''}" data-i="${i}"></div>`; }
    board.innerHTML = h;
    pad.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-d="${d}"><b>${d}</b><small></small></button>`).join('');
  }
  function render() {
    if (!S) return;
    if (board.children.length !== 81) build();
    const sv = sel >= 0 ? S.val[sel] : 0, showErr = opt.errors === 'direct';
    for (let i = 0; i < 81; i++) {
      const el = board.children[i], v = S.val[i], peer = sel >= 0 && i !== sel && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel));
      let cls = 'sd-c' + (COL(i) % 3 === 2 && COL(i) < 8 ? ' br' : '') + (ROW(i) % 3 === 2 && ROW(i) < 8 ? ' bb' : '') + (fixed(i) ? ' given' : v ? ' user' : '') + (i === sel ? ' sel' : peer ? ' peer' : '') + (v && sv && v === sv && i !== sel ? ' same' : '') + (v && !fixed(i) && ((showErr && wrong(i)) || conflict(i)) ? ' bad' : '');
      if (el.classList.contains('flash')) cls += ' flash';
      if (el.className !== cls) el.className = cls;
      const html = v ? String(v) : S.notes[i] ? `<span class="sd-n">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<i${S.notes[i] & (1 << d) ? (sv === d ? ' class="hl"' : '') + '>' + d : '>'}</i>`).join('')}</span>` : '';
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
    }
    const left = d => 9 - S.val.reduce((n, v, i) => n + (v === d && (!showErr || v === S.sol[i]) ? 1 : 0), 0);
    pad.querySelectorAll('button').forEach(b => { const d = +b.dataset.d, l = left(d); b.querySelector('small').textContent = l > 0 ? l : ''; b.classList.toggle('done', l <= 0); b.classList.toggle('hl', sv === d); });
    $('#sdPencil').classList.toggle('on', opt.pencil); $('#sdPencil').querySelector('small').textContent = opt.pencil ? 'Potlood aan' : 'Potlood';
    $('#sdLvl').textContent = LEVELS[S.lvl].name; $('#sdMist').textContent = S.mistakes; $('#sdMistW').hidden = opt.errors !== 'direct';
    hudTime(true);
  }
  let lastSec = -1;
  function hudTime(force) { if (!S) return; const s = Math.floor(S.time); if (force || s !== lastSec) { lastSec = s; $('#sdTime').textContent = fmt(S.time); } }
  function renderStart() {
    $('#sdLevels').innerHTML = Object.entries(LEVELS).map(([k, L]) => `<button data-lvl="${k}" class="${opt.level === k ? 'on' : ''}"><b>${L.name}</b><small>±${L.clues} cijfers gegeven</small><span>${stats.best[k] != null ? '⏱ ' + fmt(stats.best[k]) : '–'}</span></button>`).join('');
    $('#sdOptList').innerHTML = [['errors', 'Fouten', [['direct', 'Direct tonen'], ['uit', 'Pas bij dubbel']]], ['sound', 'Geluid en muziek', [[true, 'Aan'], [false, 'Uit']]]].map(([k, l, ch]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#sdStats').innerHTML = [['Gespeeld', stats.played], ['Opgelost', stats.won], ['Zonder hulp', stats.noHelp]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    $('#sdResume').hidden = !(S && !S.over);
  }

  /* ---------- input ---------- */
  board.addEventListener('pointerdown', e => { const c = e.target.closest('.sd-c'); if (!c || !S) return; sel = +c.dataset.i; render(); });
  pad.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (b) place(+b.dataset.d); });
  $('#sdTools').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]'); if (!b) return;
    const t = b.dataset.t;
    if (t === 'undo') doUndo(); else if (t === 'erase') erase(); else if (t === 'hint') hint();
    else if (t === 'pencil') { opt.pencil = !opt.pencil; saveOpt(); sfx('tap'); render(); }
  });
  window.addEventListener('keydown', e => {
    if (current !== 'sd' || anyModal() || !S) return;
    if (/^[1-9]$/.test(e.key)) place(+e.key);
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
    else if (e.key === 'n' || e.key === 'p') { opt.pencil = !opt.pencil; saveOpt(); render(); }
    else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) doUndo();
    else { const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key]; if (mv) { e.preventDefault(); sel = sel < 0 ? 0 : (sel + mv + 81) % 81; render(); } }
  });
  $('#sdLevels').addEventListener('click', e => { const b = e.target.closest('button[data-lvl]'); if (!b) return; opt.level = b.dataset.lvl; saveOpt(); renderStart(); });
  $('#sdOptList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); renderStart(); render(); });
  $('#sdGo').addEventListener('click', () => newGame(opt.level));
  $('#sdResume').addEventListener('click', () => closeModals());
  $('#sdStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#sdEndNew').addEventListener('click', () => newGame(S.lvl));
  $('#sdEndMenu').addEventListener('click', () => { closeModals(); renderStart(); openModal('sdStartModal'); });
  $('#sdBack').addEventListener('click', () => leave());
  $('#sdNew').addEventListener('click', () => { renderStart(); openModal('sdStartModal'); });

  function tick() { if (current === 'sd' && S && !S.over && !anyModal() && !document.hidden) { S.time += .25; hudTime(); if (Math.floor(S.time * 4) % 20 === 0) save(); } }
  function enter() {
    show('sd');
    const saved = store.get('sd.save', null);
    if (!S && saved && saved.sol) S = saved;
    build(); if (S) render();
    clearInterval(timer); timer = setInterval(tick, 250);
    if (!S || S.over) { renderStart(); openModal('sdStartModal'); }
  }
  function leave() { clearInterval(timer); save(); closeModals(); show('menu'); refreshMenu(); }
  window.__sd = { get S() { return S; }, newGame, place, hint, erase, doUndo, select: i => { sel = i; render(); }, solve, generate, opt };
  return { enter, leave, hasSave: () => !!store.get('sd.save', null) };
})();
$('#tileSd').addEventListener('click', () => Sudoku.enter());
(() => {   // menu tile art for Sudoku
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#fbf6e9'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffe08a'; g.fillRect(43, 43, 42, 42);
  g.strokeStyle = '#c9bfa8'; g.lineWidth = 1.5; for (let k = 1; k < 9; k++) if (k % 3) { g.beginPath(); g.moveTo(k * 14.2, 0); g.lineTo(k * 14.2, 128); g.moveTo(0, k * 14.2); g.lineTo(128, k * 14.2); g.stroke(); }
  g.strokeStyle = '#3a3226'; g.lineWidth = 3.5; for (let k = 0; k <= 3; k++) { g.beginPath(); g.moveTo(k * 42.6, 0); g.lineTo(k * 42.6, 128); g.moveTo(0, k * 42.6); g.lineTo(128, k * 42.6); g.stroke(); }
  g.font = '700 26px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [[0, 0, 5, 0], [2, 1, 3, 0], [4, 4, 7, 1], [6, 2, 9, 0], [1, 6, 8, 1], [7, 7, 1, 0], [3, 8, 4, 0], [8, 3, 2, 1], [5, 5, 6, 0]].forEach(([cx, cy, d, u]) => { g.fillStyle = u ? '#2a5bd7' : '#2b2418'; g.fillText(d, cx * 14.2 + 7.1, cy * 14.2 + 8); });
  $('#artSd').src = c.toDataURL();
})();
