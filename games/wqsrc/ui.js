  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ================= settings, progress ================= */
  const opt = Object.assign({ sound: true, mode: 'vlag', dir: { vlag: 'fn', hoofd: 'cc' }, cont: 'W', lvl: 1, len: '10', typing: false, extra: false }, store.get('wq.settings', {}));
  opt.dir = Object.assign({ vlag: 'fn', hoofd: 'cc' }, opt.dir);
  if (!CONT[opt.cont]) opt.cont = 'W';
  Sfx.gate('wq', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const saveOpt = () => store.set('wq.settings', opt);
  const sfx = n => { if (opt.sound) { Sfx.play(n); if (window.__wq) window.__wq.sfxCalls.push(n); } };
  let stats = Object.assign({ played: 0, answered: 0, correct: 0, bestStreak: 0, best: {}, m: {}, wr: {}, daily: {}, dailyN: 0, tr: {}, flags: 0, caps: 0, maps: 0, time: 0 }, store.get('wq.stats', {}));
  const saveStats = () => store.set('wq.stats', stats);
  const MODES = {
    vlag: { e: '🏳️', n: 'Vlaggen', d: 'Raad het land bij de vlag, of de vlag bij het land' },
    hoofd: { e: '🏛️', n: 'Hoofdsteden', d: 'Van land naar hoofdstad en terug' },
    kaart: { e: '🗺️', n: 'Welk land is dit?', d: 'Herken het land op de kaart' },
    wijs: { e: '📍', n: 'Wijs aan', d: 'Tik het land aan op de kaart' },
    reis: { e: '✈️', n: 'Wereldreis', d: 'Alles door elkaar' },
    fout: { e: '🔁', n: 'Oefen je fouten', d: '' },
    dag: { e: '📅', n: 'Dagquiz', d: '' },
  };
  const LVL = { 1: 'Makkelijk', 2: 'Normaal', 3: 'Moeilijk' };
  const ASK = { fn: 'Welk land hoort bij deze vlag?', nf: 'Welke vlag hoort bij', cc: 'Wat is de hoofdstad van', cn: 'Van welk land is dit de hoofdstad?', mn: 'Welk land is dit?', mt: 'Wijs aan op de kaart:' };

  /* ================= loading the packed data ================= */
  let FL = null, loadP = null, loadMs = 0;
  const flagUrls = {};
  async function gunzip(b64) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  function load() {
    if (FL && GEO) return Promise.resolve();
    if (loadP) return loadP;
    loadP = (async () => {
      const t0 = performance.now(), [f, m] = await Promise.all([gunzip(FLAGS), gunzip(MAPBIN)]);
      FL = JSON.parse(new TextDecoder().decode(f)); GEO = decodeMap(m); loadMs = Math.round(performance.now() - t0);
    })();
    loadP.catch(() => { loadP = null; });
    return loadP;
  }
  const flagUrl = id => flagUrls[id] || (flagUrls[id] = URL.createObjectURL(new Blob([FL[id] || ''], { type: 'image/svg+xml' })));
  const flagCls = id => id === 'NP' ? ' np' : flagAr(id) === 1 ? ' sq' : '';
  const flag = (id, cls = '') => `<span class="wq-flag${flagCls(id)} ${cls}"><img src="${flagUrl(id)}" alt="" draggable="false"></span>`;
  function preloadFlags(ids) { for (const id of ids) { const im = new Image(); im.src = flagUrl(id); if (im.decode) im.decode().catch(() => {}); } }

  /* ================= state ================= */
  let G = null, view = 'none', QM = null, AM = null, tok = 0;
  const scr = $('#wq'), main = $('#wqMain'), qEl = $('#wqQ'), aEl = $('#wqA'), fb = $('#wqFb');
  const timers = new Set();
  const later = (fn, ms) => { const my = tok, id = setTimeout(() => { timers.delete(id); if (my === tok) fn(); }, Math.max(0, Math.min(60000, +ms || 0))); timers.add(id); return id; };
  const clearLater = () => { timers.forEach(clearTimeout); timers.clear(); tok++; };
  const cfgOf = () => ({ mode: opt.mode, dir: Object.assign({}, opt.dir), cont: opt.cont, lvl: opt.lvl, len: opt.len, typing: opt.typing && opt.mode !== 'wijs', extra: !!opt.extra && opt.lvl === 3 });
  const isClock = () => G && G.cfg.len === 'klok' && G.cfg.mode !== 'dag' && G.cfg.mode !== 'fout';
  const markSet = () => new Set(C.filter(c => !c.x || (G && G.cfg.extra)).map(c => c.id));

  /* ================= starting a quiz ================= */
  function startQuiz(cfg) {
    clearLater(); closeModals(); hideFb(); $('#wqConf').innerHTML = '';
    const r = cfg.mode === 'dag' ? rng(hashStr(cfg.day)) : Math.random;
    const qs = buildQuiz(cfg, r);
    if (!qs.length) { menuToast(cfg.mode === 'fout' ? 'Je hebt geen fouten om te oefenen. Goed bezig!' : 'Geen landen gevonden voor deze keuze.'); openStart(); return; }
    G = { cfg, qs, i: 0, main: qs.length, done: 0, score: 0, streak: 0, best: 0, ok: 0, okMain: 0, bad: 0, log: [], phase: 'ask', ans: null, t0: Date.now(), time: 0, last: Date.now(),
      clock: cfg.len === 'klok' && cfg.mode !== 'dag' && cfg.mode !== 'fout' ? { left: 60000, total: 60000 } : null, over: false };
    stats.time = stats.time || 0;
    setView('quiz'); showQ(); save(); startClock();
  }
  function setView(v) {
    view = v;
    scr.classList.toggle('v-quiz', v === 'quiz'); scr.classList.toggle('v-atlas', v === 'atlas'); scr.classList.toggle('v-prog', v === 'prog');
    if (v !== 'quiz') hideFb();
    hud();
  }

  /* ================= showing a question (always built from the state G) ================= */
  function showQ() {
    if (!G) return;
    const q = G.qs[G.i]; if (!q) return;
    const c = BY[q.c], answered = G.phase === 'shown';
    const isMap = q.t === 'mn' || q.t === 'mt';
    main.className = 't-' + q.t + (q.typ ? ' typ' : '') + (isMap ? ' map' : '') + (q.o && q.o.length > 4 ? ' o6' : '');
    let h = '';
    if (q.rep) h += '<div class="wq-rep">🔁 Herkansing</div>';
    if (q.t === 'fn') h += `<div class="wq-ask">${ASK.fn}</div><div class="wq-flagbox">${flag(q.c, 'big')}</div>`;
    else if (q.t === 'nf') h += `<div class="wq-ask">${ASK.nf}</div><div class="wq-big">${esc(c.n)}?</div>`;
    else if (q.t === 'cc') h += `<div class="wq-capcard">${flag(q.c, 'mid')}<div><div class="wq-ask">${ASK.cc}</div><div class="wq-big">${esc(c.n)}?</div></div></div>`;
    else if (q.t === 'cn') h += `<div class="wq-capcard cn"><span class="wq-pin">🏛️</span><div><div class="wq-ask">${ASK.cn}</div><div class="wq-big">${esc(c.cap[0])}</div></div></div>`;
    else if (q.t === 'mn') h += `<div class="wq-ask">${ASK.mn}</div>`;
    qEl.innerHTML = h; fitBig();
    $('#wqMapAsk').innerHTML = q.t === 'mt' ? `<span>${ASK.mt}</span><b>${esc(c.n)}</b>${q.rep ? '<em>🔁</em>' : ''}` : '';
    // answers
    let a = '';
    if (q.t === 'mt') a = `<div class="wq-mtbar"><button class="wq-skip" data-a="skip">Weet ik niet</button></div>`;
    else if (q.typ) {
      const pl = q.t === 'cc' ? 'Typ de hoofdstad…' : 'Typ het land…';
      a = `<form class="wq-type" autocomplete="off"><input id="wqIn" type="text" enterkeyhint="done" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" placeholder="${pl}"><button type="submit" class="wq-go">OK</button></form><div class="wq-sugg" id="wqSugg"></div><button class="wq-skip" data-a="skip">Weet ik niet</button>`;
    } else if (q.t === 'nf') a = `<div class="wq-fopts n${q.o.length}">${q.o.map((id, i) => `<button data-o="${id}" style="--d:${i * 40}ms">${flag(id)}</button>`).join('')}</div>`;
    else a = `<div class="wq-opts n${q.o.length}">${q.o.map((id, i) => `<button data-o="${id}" style="--d:${i * 40}ms"><span>${esc(answerText(q.t, id))}</span></button>`).join('')}</div>`;
    aEl.innerHTML = a;
    main.classList.remove('in'); void main.offsetWidth; main.classList.add('in');
    hud();
    if (isMap) setupMap(q); else if (QM) { QM.hl = []; QM.pin = null; QM.labels = []; QM.pulse = null; }
    if (answered) renderAnswered(false);
    else {
      hideFb();
      if (q.typ) { const inp = $('#wqIn'); if (inp) { inp.value = ''; setTimeout(() => { if (G && G.qs[G.i] === q && G.phase === 'ask' && view === 'quiz' && !anyModal()) try { inp.focus({ preventScroll: true }); } catch (e) {} }, 60); } }
    }
    // the next question's flags already decoding
    const nq = G.qs[G.i + 1]; if (nq) preloadFlags([nq.c, ...(nq.t === 'nf' ? nq.o : [])]);
  }
  // long names: a smaller font instead of breaking a word in the middle ("Denemarke-n")
  function fitBig() {
    qEl.querySelectorAll('.wq-big').forEach(el => {
      el.style.fontSize = ''; el.classList.remove('brk');
      let fs = parseFloat(getComputedStyle(el).fontSize) || 30;
      for (let k = 0; k < 10 && el.scrollWidth > el.clientWidth + 1 && fs > 17; k++) { fs -= 2; el.style.fontSize = fs + 'px'; }
      if (el.scrollWidth > el.clientWidth + 1) el.classList.add('brk');
    });
  }
  function setupMap(q) {
    if (!QM) QM = makeMap($('#wqMapW'), { onTap: mapTap });
    const c = BY[q.c], cont = G.cfg.cont, vid = q.t === 'mt' ? (cont !== 'W' && G.cfg.mode !== 'fout' ? cont : G.cfg.mode === 'fout' ? c.ct[0] : 'W') : c.ct[0];
    const focus = cont !== 'W' && G.cfg.mode !== 'fout' && G.cfg.mode !== 'dag' ? new Set(C.filter(x => inCont(x, cont)).map(x => x.id)) : null;
    const ms = markSet();
    QM.interactive = true;
    QM.hl = []; QM.pin = null; QM.labels = []; QM.pulse = null;
    requestAnimationFrame(() => {
      if (!G || G.qs[G.i] !== q) return;
      const same = QM.vid === vid && QM.focusKey === (cont + (focus ? 1 : 0));
      if (!same) { QM.focusKey = cont + (focus ? 1 : 0); QM.setView(vid, { focus, markSet: ms, hitSet: ms }); } else { QM.markSet = ms; QM.hitSet = ms; QM.resize(); }
      if (q.t === 'mn') {
        const g = QM.vg.P[q.c]; QM.hl = [{ id: q.c, st: 'target' }];
        const span = (QM.vg.box[2] - QM.vg.box[0]) * (vid === 'EU' ? .26 : .2);
        QM.fit(g.mb, false, .45, span);
        if (g.size * QM.s < 30) QM.pulse = { id: q.c, t0: performance.now(), d: 2600 };
      } else if (G.phase === 'ask') QM.home(same);              // every new question starts from the whole region
      if (G.phase === 'shown') renderAnsweredMap(false);
      QM.req();
    });
  }

  /* ================= answering ================= */
  aEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !G || G.phase !== 'ask') return;
    if (b.dataset.o) { answer('opt', b.dataset.o, b); return; }
    if (b.dataset.a === 'skip') { answer('skip'); return; }
    if (b.dataset.s) { const inp = $('#wqIn'); if (inp) inp.value = b.dataset.s; answer('typ', b.dataset.s); }
  });
  aEl.addEventListener('submit', e => { e.preventDefault(); const inp = $('#wqIn'); if (inp && inp.value.trim()) answer('typ', inp.value.trim()); });
  aEl.addEventListener('input', e => {
    if (e.target.id !== 'wqIn' || !G) return;
    const q = G.qs[G.i], pool = new Set(C.filter(c => (!c.x || G.cfg.extra) && (q.t !== 'cc' || hasCap(c))).map(c => c.id));
    const s = suggest(e.target.value, answerKind(q.t), pool, 4);
    $('#wqSugg').innerHTML = s.map(x => `<button data-s="${esc(x.f)}">${esc(x.f)}</button>`).join('');
  });
  let pendTap = null;
  function mapTap(x, y, info) {
    if (!G || view !== 'quiz') return;
    const q = G.qs[G.i]; if (!q || q.t !== 'mt' || G.phase !== 'ask') return;
    const [ux, uy] = QM.toUnit(x, y);
    QM.pin = [ux, uy]; QM.req(); sfx('wqTap');
    clearTimeout(pendTap);
    // wait a moment: a second tap (double tap) zooms in instead
    const my = tok;
    pendTap = setTimeout(() => { pendTap = null; if (my !== tok || !G || G.qs[G.i] !== q || G.phase !== 'ask') return; commitTap(q, x, y, ux, uy); }, 290);
    info.undo = () => { clearTimeout(pendTap); pendTap = null; QM.pin = null; QM.req(); };
  }
  function commitTap(q, x, y, ux, uy) {
    const d = QM.distTo(q.c, x, y), h = QM.hit(x, y, 14);
    // generous: on (or very near) the right country counts, also when a neighbour is a bit closer
    // ... but a tap well inside another country (an enclave like Lesotho, or a neighbour) is that country
    const inOther = h && h.id !== q.c && h.d === 0, tol = inOther ? 4 : QM.screenOf(q.c).tiny ? 22 : 12, ok = d <= tol;
    answer('map', { ok, id: ok ? q.c : h ? h.id : null, pt: [ux, uy] });
  }
  function answer(kind, val, btn) {
    if (!G || G.phase !== 'ask' || G.over) return;
    const q = G.qs[G.i]; let ok = false, given = '', res = null;
    if (kind === 'opt') { ok = val === q.c; given = q.t === 'nf' ? BY[val].n : answerText(q.t, val); }
    else if (kind === 'typ') { res = judge(val, q.c, answerKind(q.t)).r; ok = res === 'ok' || res === 'typo'; given = val; }
    else if (kind === 'map') { ok = val.ok; given = val.id ? BY[val.id].n : 'de zee'; }
    else { ok = false; given = ''; }
    const t = Date.now(); G.time += Math.min(60, (t - (G.last || t)) / 1000); G.last = t;
    G.phase = 'shown'; G.ans = { kind, v: kind === 'opt' ? val : kind === 'map' ? { id: val.id, pt: val.pt } : val, ok, res, given };
    learn(q.c, SKILL[q.t], ok);
    let pts = 0;
    if (ok) { G.streak++; G.best = Math.max(G.best, G.streak); pts = points(q, G.streak, G.cfg); G.score += pts; G.ok++; if (!q.rep) G.okMain++; }
    else {
      G.streak = 0; G.bad++;
      // the same country comes back a few questions later (at most twice)
      if ((q.rep || 0) < 2) { const at = Math.min(G.qs.length, G.i + 3 + Math.floor(Math.random() * 3)); G.qs.splice(at, 0, makeQ(q.t, q.c, G.cfg.mode === 'fout' || G.cfg.mode === 'dag' ? Object.assign({}, G.cfg, { lvl: 2 }) : G.cfg, Math.random, (q.rep || 0) + 1)); }
    }
    G.ans.pts = pts;
    if (!q.rep) G.done++;
    G.log.push({ t: q.t, c: q.c, ok, g: given, rep: q.rep || 0 });
    stats.answered++; if (ok) stats.correct++; if (G.best > stats.bestStreak) stats.bestStreak = G.best;
    saveStats(); save();
    if (ok) { sfx('wqOk' + Math.min(5, 1 + Math.floor((G.streak - 1) / 2))); vibrate(12); } else { sfx('wqBad'); vibrate(35); }
    if (ok && G.streak >= 5 && G.streak % 5 === 0) later(() => { sfx('wqCombo'); combo(G.streak); }, 260);
    renderAnswered(true, btn);
  }
  // the answered state, built from G.ans (also after a resume)
  function renderAnswered(fresh) {
    const q = G.qs[G.i], A = G.ans; if (!q || !A) return;
    aEl.querySelectorAll('button[data-o]').forEach(b => {
      const id = b.dataset.o; b.disabled = true;
      b.classList.toggle('ok', id === q.c); b.classList.toggle('bad', A.kind === 'opt' && id === A.v && !A.ok); b.classList.toggle('dim', id !== q.c && !(A.kind === 'opt' && id === A.v));
      if (!fresh) b.classList.add('still');
    });
    const inp = $('#wqIn'); if (inp) { inp.value = A.kind === 'typ' ? A.v : ''; inp.disabled = true; inp.classList.toggle('ok', A.ok); inp.classList.toggle('bad', !A.ok); try { inp.blur(); } catch (e) {} }
    aEl.querySelectorAll('.wq-skip,.wq-go,.wq-sugg button').forEach(b => { b.disabled = true; });
    hud(fresh);
    if (fresh && A.ok && A.pts) floatPts(A.pts);
    showFb(fresh);
    if (q.t === 'mn' || q.t === 'mt') renderAnsweredMap(fresh);
  }
  function renderAnsweredMap(fresh) {
    if (!QM || !QM.vg) return;
    const q = G.qs[G.i], A = G.ans, c = BY[q.c];
    if (q.t === 'mn') { QM.hl = [{ id: q.c, st: A.ok ? 'ok' : 'target' }]; QM.labels = [{ id: q.c, t: c.n, st: A.ok ? 'ok' : 'info' }]; QM.req(); return; }
    const wrongId = A.kind === 'map' && !A.ok && A.v && A.v.id;
    QM.hl = [{ id: q.c, st: 'ok' }].concat(wrongId ? [{ id: wrongId, st: 'bad' }] : []);
    QM.labels = [{ id: q.c, t: c.n, st: 'ok' }].concat(wrongId ? [{ id: wrongId, t: BY[wrongId].n, st: 'bad' }] : []);
    QM.pin = A.kind === 'map' && A.v && A.v.pt ? [A.v.pt[0], A.v.pt[1], A.ok ? '#3ddc84' : '#ff6b6b'] : null;
    QM.pulse = { id: q.c, t0: performance.now(), d: 2200 };
    // show where it is: the right country (and where you tapped), clear of the answer panel
    const g = QM.vg.P[q.c]; let b = g.mb.slice();
    if (QM.pin) { b = [Math.min(b[0], QM.pin[0]), Math.min(b[1], QM.pin[1]), Math.max(b[2], QM.pin[0]), Math.max(b[3], QM.pin[1])]; }
    const span = (QM.vg.box[2] - QM.vg.box[0]) * .16, sc = QM.screenOf(q.c);
    const visible = sc && sc.x > 30 && sc.x < QM.w - 30 && sc.y > 40 && sc.y < QM.h - fbH() - 20 && sc.size > 14 && (!QM.pin || true);
    if (!visible || !A.ok) QM.fit(b, fresh, .35, span, fbH());
    QM.req();
  }
  const fbH = () => (fb.classList.contains('show') || G.phase === 'shown') && !scr.classList.contains('land') ? Math.min(170, fb.offsetHeight || 150) : 0;
  function showFb(fresh) {
    const q = G.qs[G.i], A = G.ans, c = BY[q.c];
    let title, line = '', extra = '';
    if (A.ok) title = (A.res === 'typo' ? 'Goed! (let op de spelling)' : ['Goed zo!', 'Prima!', 'Helemaal goed!', 'Knap!', 'Top!'][G.ok % 5]);
    else title = A.kind === 'skip' ? 'Dat is niet erg!' : A.kind === 'map' ? (A.v && A.v.id ? `Dat is ${esc(BY[A.v.id].n)}.` : 'Dat is de zee!') : 'Helaas…';
    const capLine = hasCap(c) ? ` · hoofdstad <b>${esc(capText(c))}</b>` : '';
    if (q.t === 'cc') line = `${flag(q.c, 'xs')}<span><b>${esc(capText(c))}</b> is de hoofdstad van ${esc(c.n)}.</span>`;
    else if (q.t === 'cn') line = `${flag(q.c, 'xs')}<span>${esc(c.cap[0])} is de hoofdstad van <b>${esc(c.n)}</b>.</span>`;
    else if (q.t === 'mt' || q.t === 'mn') line = `${flag(q.c, 'xs')}<span>${A.ok ? '' : 'Hier ligt '}<b>${esc(c.n)}</b>${capLine}</span>`;
    else line = `${flag(q.c, 'xs')}<span><b>${esc(c.n)}</b>${capLine}</span>`;
    if (A.kind === 'typ' && A.res === 'typo') extra = `<small>Je typte “${esc(A.v)}”; zo schrijf je het: <b>${esc(q.t === 'cc' ? c.cap[0] : c.n)}</b>.</small>`;
    else if (A.kind === 'typ' && !A.ok) extra = `<small>Jouw antwoord: “${esc(A.v)}”</small>`;
    if (!A.ok && c.note) extra += `<small class="nt">💡 ${esc(c.note)}</small>`;
    else if (A.ok && c.note && q.t !== 'fn' && q.t !== 'nf' && /hoofdstad|regering/.test(c.note) && (q.t === 'cc' || q.t === 'cn')) extra += `<small class="nt">💡 ${esc(c.note)}</small>`;
    fb.className = 'show ' + (A.ok ? 'ok' : 'bad') + (fresh ? ' fresh' : '');
    fb.innerHTML = `<div class="wq-fbt"><b>${A.ok ? '✓' : '✗'} ${title}</b>${A.pts ? `<em>+${A.pts}</em>` : ''}</div><div class="wq-fbl">${line}</div>${extra}<button class="wq-next" id="wqNext">${G.i + 1 >= G.qs.length && !isClock() ? 'Uitslag ▶' : 'Verder ▶'}</button>`;
    // a right answer moves on by itself; a wrong one waits so you can look (in the clock game it moves on too)
    if (fresh) {
      const ms = A.ok ? (isClock() ? 650 : (A.res === 'typo' || extra ? 2200 : q.t === 'mt' ? 1500 : 1100)) : isClock() ? 1700 : 0;
      if (ms) { const i = G.i; later(() => { if (G && G.i === i && G.phase === 'shown' && view === 'quiz' && !anyModal()) next(); }, ms); }
    }
  }
  const hideFb = () => { fb.className = ''; };
  fb.addEventListener('click', e => { if (e.target.closest('#wqNext')) next(); });
  function next() {
    if (!G || G.phase !== 'shown') return;
    clearLater();
    if (G.clock && G.clock.left <= 0) { finish(); return; }
    G.i++; G.phase = 'ask'; G.ans = null;
    if (G.i >= G.qs.length) {
      if (isClock()) { G.qs.push(...pass(G.cfg, Math.random)); }
      else { finish(); return; }
    }
    sfx('wqSel');
    showQ(); save(); startClock();
  }
  window.addEventListener('keydown', e => { if (current !== 'wq' || e.key !== 'Enter' || !G || G.phase !== 'shown' || view !== 'quiz' || anyModal() || e.target.id === 'wqIn') return; e.preventDefault(); next(); });

  /* ================= the bar: progress, score, streak, clock ================= */
  function hud(bump) {
    const t = $('#wqTitle'), pg = $('#wqProg'), sc = $('#wqScore'), sk = $('#wqStreak'), ck = $('#wqClock'), bar = $('#wqBar i');
    if (view === 'atlas') { t.textContent = '📖 Atlas'; [pg, sc, sk, ck].forEach(e => { e.hidden = true; }); bar.style.width = '0'; return; }
    if (view === 'prog') { t.textContent = '📊 Voortgang'; [pg, sc, sk, ck].forEach(e => { e.hidden = true; }); bar.style.width = '0'; return; }
    if (!G) { t.textContent = 'Wereldquiz'; [pg, sc, sk, ck].forEach(e => { e.hidden = true; }); bar.style.width = '0'; return; }
    const m = G.cfg.mode, q = G.qs[G.i];
    t.textContent = m === 'dag' ? '📅 Dagquiz' : MODES[m].e + ' ' + (m === 'fout' ? 'Fouten' : MODES[m].n) + (m !== 'fout' && G.cfg.cont && G.cfg.cont !== 'W' ? ' · ' + CONT[G.cfg.cont] : '');
    pg.hidden = !!G.clock; sc.hidden = false; sk.hidden = G.streak < 2; ck.hidden = !G.clock;
    if (!G.clock) { pg.textContent = q && q.rep ? '🔁' : `${Math.min(G.main, G.done + (G.phase === 'ask' ? 1 : 0))}/${G.main}`; bar.style.width = (G.done / G.main * 100) + '%'; }
    sc.innerHTML = `<b>${G.score}</b>`;
    sk.innerHTML = `🔥<b>${G.streak}</b>`;
    if (bump && G.streak >= 2) { sk.classList.remove('bump'); void sk.offsetWidth; sk.classList.add('bump'); }
    if (G.clock) clockHud();
  }
  function floatPts(p) {
    const e = document.createElement('i'); e.className = 'wq-float'; e.textContent = '+' + p;
    const r = $('#wqScore').getBoundingClientRect(), sr = scr.getBoundingClientRect();
    e.style.left = (r.left - sr.left + r.width / 2) + 'px'; e.style.top = (r.bottom - sr.top + 4) + 'px';
    scr.appendChild(e); setTimeout(() => e.remove(), 1300);
  }
  function combo(n) {
    const e = document.createElement('div'); e.className = 'wq-combo'; e.innerHTML = `<b>${n} op rij!</b><small>🔥 combo-bonus</small>`;
    scr.appendChild(e); setTimeout(() => e.remove(), 1700);
  }
  // ---- the clock: only runs while the quiz is on screen (not behind a dialog, not in the background) ----
  let clockI = 0, clockLast = 0, lastTick = 99;
  function startClock() {
    stopClock(); if (!G || !G.clock || G.over) return;
    clockLast = performance.now(); clockI = setInterval(clockStep, 200); clockHud();
  }
  function stopClock() { clearInterval(clockI); clockI = 0; }
  function clockStep() {
    const t = performance.now(), dt = Math.min(1000, t - clockLast); clockLast = t;
    if (!G || !G.clock || G.over) { stopClock(); return; }
    if (current !== 'wq' || view !== 'quiz' || anyModal() || document.hidden) return;
    G.clock.left = Math.max(0, G.clock.left - dt);
    const s = Math.ceil(G.clock.left / 1000);
    if (s <= 5 && s !== lastTick && s > 0) sfx('wqTick'); lastTick = s;
    clockHud();
    if (G.clock.left <= 0) { stopClock(); sfx('wqTime'); toast('⏰ De tijd is om!'); later(() => { if (G && !G.over) finish(); }, G.phase === 'shown' ? 900 : 700); G.phase = G.phase === 'ask' ? 'timeup' : G.phase; }
    else if (Math.round(G.clock.left / 200) % 15 === 0) save();
  }
  function clockHud() {
    if (!G || !G.clock) return;
    const s = Math.ceil(G.clock.left / 1000), ck = $('#wqClock');
    ck.innerHTML = `⏱<b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b>`; ck.classList.toggle('low', s <= 10);
    $('#wqBar i').style.width = (G.clock.left / G.clock.total * 100) + '%'; $('#wqBar').classList.toggle('clock', true);
  }

  /* ================= the end ================= */
  const bestKey = cfg => [cfg.mode + (cfg.mode === 'vlag' || cfg.mode === 'hoofd' ? '-' + cfg.dir[cfg.mode] : ''), cfg.cont, cfg.lvl, cfg.len, cfg.typing ? 'typ' : ''].join('|');
  function finish() {
    if (!G || G.over) return;
    clearLater(); stopClock(); hideFb();
    G.over = true; store.del('wq.save');
    const cfg = G.cfg, n = G.clock ? G.done : G.main, okN = G.clock ? G.okMain : G.okMain, pct = n ? Math.round(okN / n * 100) : 0;
    stats.played++; stats.time = (stats.time || 0) + Math.round(G.time);
    let rec = false, prev = null;
    if (cfg.mode === 'dag') {
      if (!stats.daily[cfg.day]) { stats.dailyN = (stats.dailyN || 0) + 1; rec = true; }
      prev = stats.daily[cfg.day]; stats.daily[cfg.day] = { ok: Math.max(okN, prev ? prev.ok : 0), n, score: Math.max(G.score, prev ? prev.score : 0) };
      const ks = Object.keys(stats.daily).sort(); while (ks.length > 90) delete stats.daily[ks.shift()];
    } else if (cfg.mode !== 'fout') {
      const k = bestKey(cfg); prev = stats.best[k];
      if (!prev || G.score > prev.s) { stats.best[k] = { s: G.score, ok: okN, n }; rec = !!prev || G.score > 0; }
      const kb = Object.keys(stats.best); if (kb.length > 300) delete stats.best[kb[0]];
    }
    updateTrophies(); saveStats();
    G.res = { n, okN, pct, rec, st: starsFor(pct), prev };
    openEnd(); sfx('wqEnd');
    if (pct >= 80 && n >= 5) confetti();
  }
  function updateTrophies() {
    const tr = stats.tr || (stats.tr = {});
    if (mastery('EU', 0).k === mastery('EU', 0).n) tr.fEU = 1;
    if (mastery('W', 0).k === mastery('W', 0).n) tr.fAll = 1;
    if (CONTS.some(ct => { const m = mastery(ct, 1); return m.k === m.n; })) tr.cap = 1;
    stats.flags = mastery('W', 0).k; stats.caps = mastery('W', 1).k; stats.maps = mastery('W', 2).k;
    if (stats.maps >= 100) tr.map100 = 1;
  }
  function openEnd() {
    const R = G.res, cfg = G.cfg;
    $('#wqEndStars').innerHTML = [1, 2, 3].map(k => `<span class="${k <= R.st ? 'on' : ''}" style="animation-delay:${.15 + k * .18}s">★</span>`).join('');
    $('#wqEndTitle').textContent = G.clock ? (R.okN ? `${R.okN} goed in 60 seconden!` : 'De tijd is om!') : R.pct === 100 ? 'Alles goed!' : R.pct >= 80 ? 'Geweldig!' : R.pct >= 60 ? 'Goed gedaan!' : R.pct >= 40 ? 'Aardig!' : 'Blijven oefenen!';
    const wrongs = []; const seen = new Set();
    for (const L of G.log) if (!L.ok && !seen.has(L.c + L.t)) { seen.add(L.c + L.t); wrongs.push(L); }
    const what = t => t === 'cc' ? 'hoofdstad' : t === 'cn' ? 'land bij hoofdstad' : t === 'mn' || t === 'mt' ? 'kaart' : 'vlag';
    $('#wqEndText').innerHTML = `<div class="wq-endsc"><div><b>${R.okN}</b><small>van ${R.n} goed</small></div><div><b>${G.score}</b><small>punten</small></div><div><b>${G.best}</b><small>beste reeks</small></div></div>`
      + (R.rec ? `<div class="wq-rec">${cfg.mode === 'dag' ? '📅 Dagquiz gespeeld!' : '🏆 Nieuw record!'}</div>` : R.prev && cfg.mode !== 'dag' ? `<small class="wq-prev">Je record: ${R.prev.s} punten</small>` : '')
      + (wrongs.length ? `<h4>Dit ging nog mis</h4><ul class="wq-mist">${wrongs.slice(0, 30).map(L => { const c = BY[L.c]; return `<li>${flag(L.c, 'xs')}<span><b>${esc(c.n)}</b>${hasCap(c) ? ` <small>· ${esc(capText(c))}</small>` : ''}${L.g && L.g !== c.n ? `<s>${esc(L.g)}</s>` : ''}</span><em>${what(L.t)}</em></li>`; }).join('')}</ul>` : '<p class="wq-allok">Geen enkele fout. Knap gedaan! 🌟</p>');
    $('#wqEndPractice').hidden = !wrongs.length;
    $('#wqEndPractice').dataset.list = JSON.stringify(wrongs.map(L => [L.c, SKILL[L.t]]));
    openModal('wqEndModal');
  }
  function confetti() {
    const box = $('#wqConf'); box.innerHTML = '';
    const cols = ['#ffcf3f', '#ff6b6b', '#4fd88a', '#5ab0ff', '#c38bff', '#ffffff'];
    for (let i = 0; i < 70; i++) { const e = document.createElement('i'); e.style.left = (Math.random() * 100) + '%'; e.style.background = cols[i % cols.length]; e.style.width = (6 + Math.random() * 6) + 'px'; e.style.height = (8 + Math.random() * 8) + 'px'; e.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); e.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg'); e.style.animationDuration = (1.8 + Math.random() * 1.6) + 's'; e.style.animationDelay = (Math.random() * .5) + 's'; box.appendChild(e); }
    setTimeout(() => { box.innerHTML = ''; }, 4200);
  }
  let toastT = 0;
  function toast(t, ms = 2400) { const el = $('#wqToast'); el.innerHTML = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }

  /* ================= save / resume ================= */
  let saveTm = 0;
  function saveNow() { clearTimeout(saveTm); saveTm = 0; if (!G || G.over) return; store.set('wq.save', Object.assign({}, G, { phase: G.phase === 'timeup' ? 'ask' : G.phase, v: 1 })); }
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 200); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'wq') saveNow(); });
  window.addEventListener('pagehide', () => { if (saveTm) saveNow(); });
  function restoreSaved(sv) {
    if (!sv || sv.v !== 1 || !Array.isArray(sv.qs) || !sv.qs.length || !sv.cfg) throw new Error('save');
    if (sv.qs.some(q => !BY[q.c] || !SKILL.hasOwnProperty(q.t) || (q.o && q.o.some(o => !BY[o])))) throw new Error('save');
    G = Object.assign({}, sv, { last: Date.now(), over: false });
    G.i = Math.max(0, Math.min(G.qs.length - 1, G.i | 0));
    if (G.phase !== 'shown' || !G.ans) { G.phase = 'ask'; G.ans = null; }
  }

  /* ================= start dialog ================= */
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function renderStart() {
    const live = G && !G.over;
    const weak = weakList().length;
    $('#wqModes').innerHTML = ['vlag', 'hoofd', 'kaart', 'wijs', 'reis', 'fout'].map(k => {
      const M = MODES[k], d = k === 'fout' ? (weak ? `${weak} ${weak === 1 ? 'fout' : 'fouten'} om te oefenen` : 'Nog geen fouten') : M.d;
      return `<button data-m="${k}" class="${opt.mode === k ? 'on' : ''}${k === 'fout' && !weak ? ' off' : ''}"><span class="e">${M.e}</span><b>${M.n}</b><small>${d}</small></button>`;
    }).join('');
    const day = dayStr(), dd = stats.daily[day], dn = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#wqDaily').innerHTML = `<span class="ico">📅</span><span class="tx"><b>Dagquiz</b><small>${esc(dn)} · 10 vragen, voor iedereen dezelfde</small></span><em>${dd ? `✓ ${dd.ok}/${dd.n}` : 'Speel ▶'}</em>`;
    $('#wqDaily').classList.toggle('done', !!dd);
    // werelddeel: a prominent choice at the top of the dialog (with the number of countries at the chosen level)
    const CE = { W: '🌐', EU: '🏰', AF: '🦒', AS: '🏯', NA: '🗽', SA: '🦜', OC: '🦘' };
    const cb = $('#wqCont');
    if (cb) {
      const showC = opt.mode !== 'fout';
      cb.hidden = !showC;
      if (showC) cb.innerHTML = `<div class="wq-ct">Waar wil je spelen?</div><div class="wq-cg">` + Object.entries(CONT).map(([k, v]) => { const n = poolOf(Object.assign(cfgOf(), { cont: k })).length; return `<button data-cont="${k}" class="${opt.cont === k ? 'on' : ''}${k === 'W' ? ' w' : ''}"><span>${CE[k]}</span><b>${v}</b><small>${n} landen</small></button>`; }).join('') + `</div>`;
    }
    const m = opt.mode, rows = [];
    if (m === 'vlag') rows.push(['dir.vlag', 'Vraag', [['fn', 'Vlag → land'], ['nf', 'Land → vlag'], ['mix', 'Beide']]]);
    if (m === 'hoofd') rows.push(['dir.hoofd', 'Vraag', [['cc', 'Land → stad'], ['cn', 'Stad → land'], ['mix', 'Beide']]]);
    if (m !== 'fout') {
      rows.push(['lvl', 'Niveau', [[1, 'Makkelijk'], [2, 'Normaal'], [3, 'Moeilijk']]]);
      rows.push(['len', 'Aantal vragen', [['10', '10'], ['20', '20'], ['alle', 'Alle'], ['klok', '⏱ 60 s']]]);
      if (m !== 'wijs') rows.push(['typing', 'Antwoorden', [[false, 'Kiezen'], [true, 'Typen (expert)']]]);
      if (opt.lvl === 3) rows.push(['extra', 'Gebieden (Groenland, Taiwan…)', [[false, 'Uit'], [true, 'Mee']]]);
    }
    rows.push(['sound', 'Geluidseffecten', [[true, 'Aan'], [false, 'Uit']]], ['music', 'Achtergrondmuziek', [[true, 'Aan'], [false, 'Uit']]]);
    const val = k => k.startsWith('dir.') ? opt.dir[k.slice(4)] : opt[k];
    $('#wqOpts').innerHTML = rows.map(([k, l, ch]) => `<div class="opt${k === 'cont' ? ' wrapseg' : ''}"><div class="opt-label">${l}</div><div class="seg">${ch.map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${val(k) === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    // what you will get
    const cfg = cfgOf(), n = m === 'fout' ? Math.min(20, weak) : poolOf(cfg).length;
    const bk = stats.best[bestKey(cfg)];
    $('#wqSum').innerHTML = m === 'fout' ? (weak ? `${Math.min(20, weak)} vragen over landen die je eerder fout had.` : 'Je hebt nu geen fouten om te oefenen.')
      : `${n} ${n === 1 ? 'land' : 'landen'} · ${LVL[cfg.lvl].toLowerCase()}${cfg.len === 'klok' ? ' · zoveel mogelijk in 60 seconden' : ` · ${cfg.len === 'alle' ? n : Math.min(+cfg.len, n)} vragen`}${bk ? ` · record <b>${bk.s}</b>` : ''}`;
    const mw = mastery('W', 'all');
    $('#wqStats').innerHTML = [['Quizzen', stats.played], ['Beste reeks', stats.bestStreak], ['Vlaggen', `${mastery('W', 0).k}<small>/${mastery('W', 0).n}</small>`]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    void mw;
    $('#wqResume').hidden = !live;
    $('#wqGo').textContent = m === 'fout' && !weak ? 'Geen fouten' : m !== 'fout' && opt.cont !== 'W' ? `Start ${({ NA: 'N-Amerika', SA: 'Z-Amerika' })[opt.cont] || CONT[opt.cont]} ▶` : 'Start ▶';
    $('#wqGo').disabled = m === 'fout' && !weak;
  }
  function openStart() {
    stopClock();
    if (pendTap) { clearTimeout(pendTap); pendTap = null; }
    if (view !== 'quiz' && G && !G.over) setView('quiz');
    if (view !== 'quiz') setView('none');
    if (G && !G.over) { showQ(); }
    renderStart(); openModal('wqStartModal');
  }
  $('#wqModes').addEventListener('click', e => {
    const b = e.target.closest('button[data-m]'); if (!b) return;
    if (b.dataset.m === 'fout' && !weakList().length) { menuToast('Je hebt nog geen fouten om te oefenen.'); return; }
    opt.mode = b.dataset.m; saveOpt(); sfx('wqSel'); renderStart();
  });
  $('#wqCont').addEventListener('click', e => {
    const b = e.target.closest('button[data-cont]'); if (!b) return;
    opt.cont = b.dataset.cont; saveOpt(); renderStart();
  });
  $('#wqOpts').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    const k = b.dataset.k, v = JSON.parse(b.dataset.v);
    if (k.startsWith('dir.')) opt.dir[k.slice(4)] = v; else opt[k] = v;
    saveOpt(); renderStart(); Sfx.refresh && Sfx.refresh();
  });
  $('#wqDaily').addEventListener('click', async () => { if (G && !G.over && !(await askConfirm('Dagquiz spelen?', 'Je stopt de quiz die nu loopt.', 'Dagquiz'))) { openStart(); return; } load().then(() => startQuiz({ mode: 'dag', day: dayStr(), cont: 'W', lvl: 2, len: '10', typing: false, extra: false, dir: { vlag: 'mix', hoofd: 'mix' } })); });
  $('#wqGo').addEventListener('click', async () => {
    if (G && !G.over && !(await askConfirm('Nieuwe quiz?', 'Je stopt de quiz die nu loopt.', 'Nieuwe quiz'))) { openStart(); return; }
    await load(); startQuiz(cfgOf());
  });
  $('#wqResume').addEventListener('click', () => { closeModals(); setView('quiz'); showQ(); startClock(); });
  $('#wqStartBack').addEventListener('click', () => { closeModals(); exit(); });
  $('#wqAtlasBtn').addEventListener('click', () => { closeModals(); openAtlas(); });
  $('#wqProgBtn').addEventListener('click', () => { closeModals(); openProg(); });
  $('#wqEndMenu').addEventListener('click', () => { closeModals(); G = null; openStart(); });
  $('#wqEndAgain').addEventListener('click', () => { const cfg = G ? G.cfg : cfgOf(); closeModals(); startQuiz(cfg.mode === 'fout' ? Object.assign({}, cfg, { list: null }) : cfg); });
  $('#wqEndPractice').addEventListener('click', () => { let list = []; try { list = JSON.parse($('#wqEndPractice').dataset.list || '[]'); } catch (e) {} closeModals(); startQuiz({ mode: 'fout', list, cont: 'W', lvl: 2, len: '20', typing: false, extra: !!(G && G.cfg.extra), dir: opt.dir }); });
  $('#wqBack').addEventListener('click', () => leave());
  $('#wqMenu').addEventListener('click', () => openStart());
  $('#wqZoom').addEventListener('click', e => { const b = e.target.closest('button[data-z]'); if (!b || !QM || !QM.vg) return; const z = b.dataset.z; if (z === 'home') QM.home(true); else QM.zoomAt(QM.w / 2, QM.h / 2, z === 'in' ? 2 : .5, true); });

  /* ================= atlas: browse the countries ================= */
  let atlasCont = 'EU', atlasSel = null, atlasFind = '';
  function ensureAM(host) {
    if (!AM) { const w = document.createElement('div'); w.className = 'wq-mapw'; AM = makeMap(w, { onTap: amTap, inset: false }); }
    if (AM.wrap.parentNode !== host) host.appendChild(AM.wrap);
  }
  function openAtlas(id) {
    load().then(() => {
      clearLater(); stopClock(); setView('atlas'); $('#wqConf').innerHTML = '';
      if (id && BY[id]) { atlasSel = id; if (!inCont(BY[id], atlasCont)) atlasCont = BY[id].ct[0]; }
      ensureAM($('#wqAtlasMap'));
      renderAtlas(true);
    });
  }
  function atlasSet() { const f = norm(atlasFind); return C.filter(c => (atlasCont === 'W' || inCont(c, atlasCont)) && (!f || norm(c.n).includes(f) || c.alt.some(a => norm(a).includes(f)) || c.cap.some(a => norm(a).includes(f)))).sort((a, b) => a.n.localeCompare(b.n, 'nl')); }
  function renderAtlas(newView) {
    $('#wqAtlasCont').innerHTML = Object.entries(CONT).map(([k, v]) => `<button data-c="${k}" class="${k === atlasCont ? 'on' : ''}">${v}</button>`).join('');
    const list = atlasSet();
    $('#wqAtlasList').innerHTML = list.map(c => `<button data-id="${c.id}" class="${c.id === atlasSel ? 'on' : ''}">${flag(c.id, 'xs')}<span><b>${esc(c.n)}</b><small>${esc(c.cap[0] || '–')}${c.x ? ' · gebied' : ''}</small></span>${mdots(c.id)}</button>`).join('') || '<p class="wq-none">Niets gevonden.</p>';
    atlasCard();
    requestAnimationFrame(() => {
      if (view !== 'atlas') return;
      const vid = atlasCont;
      if (newView || AM.vid !== vid) AM.setView(vid, { focus: vid === 'W' ? null : new Set(C.filter(c => inCont(c, vid)).map(c => c.id)) });
      else AM.resize();
      AM.hl = atlasSel ? [{ id: atlasSel, st: 'target' }] : []; AM.labels = atlasSel ? [{ id: atlasSel, t: BY[atlasSel].n, st: 'info' }] : []; AM.pin = null;
      if (atlasSel && AM.vg.P[atlasSel]) { const g = AM.vg.P[atlasSel]; AM.fit(g.mb, !newView, .6, (AM.vg.box[2] - AM.vg.box[0]) * .18); if (g.size * AM.s < 30) AM.pulse = { id: atlasSel, t0: performance.now(), d: 2400 }; }
      AM.req();
    });
  }
  const mdots = id => `<i class="wq-md">${[0, 1, 2].map(s => `<u class="l${lvlOf(id, s)}"></u>`).join('')}</i>`;
  function atlasCard() {
    const c = atlasSel && BY[atlasSel];
    if (!c) { $('#wqAtlasCard').innerHTML = `<p class="wq-hint">Tik op een land op de kaart of in de lijst.</p>`; return; }
    const sk = ['Vlag', 'Hoofdstad', 'Kaart'].map((n, s) => { const v = lvlOf(c.id, s); return `<span class="l${v}">${['○', '✗', '✓', '✓', '★'][v]} ${n}</span>`; }).join('');
    $('#wqAtlasCard').innerHTML = `${flag(c.id, 'mid')}<div class="tx"><b>${esc(c.n)}</b><span>${hasCap(c) ? `Hoofdstad: <b>${esc(capText(c))}</b>` : 'Geen eigen hoofdstad'}</span><span>${c.ct.map(x => CONT[x]).join(' en ')}${c.x ? ' · gebied, geen land' : ''}</span>${c.note ? `<small>💡 ${esc(c.note)}</small>` : ''}<div class="sk">${sk}</div></div>`;
  }
  function amTap(x, y) {
    if (view === 'atlas') {
      const h = AM.hit(x, y, 16); if (!h) return;
      atlasSel = h.id; sfx('wqTap'); atlasCard();
      $('#wqAtlasList').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === atlasSel));
      const b = $('#wqAtlasList').querySelector(`button[data-id="${atlasSel}"]`); if (b) b.scrollIntoView({ block: 'nearest' });
      AM.hl = [{ id: h.id, st: 'target' }]; AM.labels = [{ id: h.id, t: BY[h.id].n, st: 'info' }]; AM.req();
    } else if (view === 'prog') {
      const h = AM.hit(x, y, 16); if (!h) return;
      const c = BY[h.id]; sfx('wqTap');
      AM.hl = [{ id: h.id, st: 'sel' }]; AM.labels = [{ id: h.id, t: c.n, st: 'sel' }]; AM.req();
      toast(`${flag(h.id, 'xs')} <b>${esc(c.n)}</b>: ${['vlag', 'hoofdstad', 'kaart'].map((n, s) => `${n} ${['–', '✗', '✓', '✓', '★'][lvlOf(h.id, s)]}`).join(' · ')}`, 2600);
    }
  }
  $('#wqAtlasCont').addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (!b) return; atlasCont = b.dataset.c; if (atlasSel && !inCont(BY[atlasSel], atlasCont)) atlasSel = null; renderAtlas(true); });
  $('#wqAtlasList').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (!b) return; atlasSel = b.dataset.id; sfx('wqSel'); $('#wqAtlasList').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); atlasCard(); renderAtlas(false); });
  $('#wqAtlasFind').addEventListener('input', e => { atlasFind = e.target.value; const list = atlasSet(); if (list.length === 1) atlasSel = list[0].id; renderAtlas(false); });

  /* ================= progress: mastery per continent, as a map ================= */
  let progCont = 'EU', progSkill = 'all';
  const SKN = ['vlaggen', 'hoofdsteden', 'landen op de kaart'];
  const MCOL = ['#d3dbe1', '#ff9a7a', '#c6e79c', '#86d37a', '#2fae62'];
  function lvlAll(id) { const c = BY[id]; const v = [0, 1, 2].filter(s => s !== 1 || hasCap(c)).map(s => lvlOf(id, s)); return v.some(x => x === 1) ? 1 : Math.min(...v); }
  function openProg() { load().then(() => { clearLater(); stopClock(); setView('prog'); $('#wqConf').innerHTML = ''; ensureAM($('#wqProgMap')); renderProg(true); }); }
  function renderProg(newView) {
    const skill = progSkill;
    $('#wqProgSkill').innerHTML = [['all', 'Alles'], [0, 'Vlaggen'], [1, 'Hoofdsteden'], [2, 'Kaart']].map(([k, v]) => `<button data-s="${k}" class="${k === skill ? 'on' : ''}">${v}</button>`).join('');
    $('#wqProgCont').innerHTML = Object.entries(CONT).map(([k, v]) => `<button data-c="${k}" class="${k === progCont ? 'on' : ''}">${v}</button>`).join('');
    const m = mastery(progCont, skill), adj = CONT_ADJ[progCont];
    const what = skill === 'all' ? 'landen (vlag, hoofdstad én kaart)' : SKN[skill];
    $('#wqProgHead').innerHTML = `Je kent <b>${m.k}</b> van de <b>${m.n}</b> ${progCont === 'W' ? '' : adj + ' '}${what}<i><u style="width:${m.pct}%"></u></i><em>${m.pct}%</em>`;
    $('#wqProgBars').innerHTML = CONTS.map(ct => { const x = mastery(ct, skill); return `<button data-c="${ct}" class="${ct === progCont ? 'on' : ''}"><span>${CONT[ct]}</span><i><u style="width:${x.pct}%"></u></i><em>${x.k}/${x.n}</em></button>`; }).join('');
    const T = trophyList();
    $('#wqProgTro').innerHTML = T.map(t => `<div class="${t.ok ? 'on' : ''}"><span>${t.e}</span><b>${t.n}</b><small>${t.d}</small><em>${t.ok ? '✓' : t.p}</em></div>`).join('');
    requestAnimationFrame(() => {
      if (view !== 'prog') return;
      const colorFn = id => { const c = BY[id]; if (!c || (progCont !== 'W' && !inCont(c, progCont))) return null; const v = skill === 'all' ? lvlAll(id) : skill === 1 && !hasCap(c) ? null : lvlOf(id, skill); return v == null ? null : MCOL[v]; };
      const focus = progCont === 'W' ? null : new Set(C.filter(c => inCont(c, progCont)).map(c => c.id));
      const ms = new Set(MAIN.map(c => c.id));
      if (newView || AM.vid !== progCont) AM.setView(progCont, { focus, colorFn, markSet: ms, hitSet: ms });
      else { AM.restyle({ focus, colorFn, markSet: ms, hitSet: ms }); AM.resize(); }
      AM.hl = []; AM.labels = []; AM.pin = null; AM.req();
    });
  }
  function trophyList() {
    const fe = mastery('EU', 0), fw = mastery('W', 0), mw = mastery('W', 2), capBest = Math.max(...CONTS.map(ct => mastery(ct, 1).pct)), tr = stats.tr || {};
    return [
      { e: '🌍', n: 'Wereldreiziger', d: 'Speel een quiz helemaal uit', ok: stats.played >= 1, p: '0/1' },
      { e: '🏳️', n: 'Vlaggen van Europa', d: 'Ken alle vlaggen van Europa', ok: !!tr.fEU, p: `${fe.k}/${fe.n}` },
      { e: '🔥', n: 'Twintig op rij', d: '20 goede antwoorden achter elkaar', ok: stats.bestStreak >= 20, p: `${stats.bestStreak}/20` },
      { e: '🏛️', n: 'Hoofdstedenkenner', d: 'Ken alle hoofdsteden van een werelddeel', ok: !!tr.cap, p: capBest + '%' },
      { e: '🗺️', n: 'Kaartmeester', d: 'Ken 100 landen op de kaart', ok: !!tr.map100, p: `${mw.k}/100` },
      { e: '📅', n: 'Dagelijkse reiziger', d: 'Speel 7 dagquizzen', ok: (stats.dailyN || 0) >= 7, p: `${stats.dailyN || 0}/7` },
      { e: '🌐', n: 'Vlaggenmeester', d: 'Ken alle vlaggen van de wereld', ok: !!tr.fAll, p: `${fw.k}/${fw.n}` },
    ];
  }
  $('#wqProgSkill').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (!b) return; progSkill = b.dataset.s === 'all' ? 'all' : +b.dataset.s; renderProg(false); });
  $('#wqProgCont').addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (!b) return; progCont = b.dataset.c; renderProg(true); });
  $('#wqProgBars').addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (!b) return; progCont = b.dataset.c; renderProg(true); });

  /* ================= layout ================= */
  function layout() {
    if (current !== 'wq') return;
    const land = innerWidth > innerHeight * 1.1; scr.classList.toggle('land', land);
    if (view === 'quiz' && G) fitBig();
    if (view === 'quiz' && QM && QM.vg && G && G.qs[G.i] && /^m/.test(G.qs[G.i].t)) { QM.resize(); QM.req(); }
    if ((view === 'atlas' || view === 'prog') && AM && AM.vg) { AM.resize(); AM.req(); }
  }
  window.addEventListener('resize', () => { if (current === 'wq') setTimeout(layout, 60); });

  /* ================= entering / leaving ================= */
  function enter() {
    show('wq'); layout();
    const ld = $('#wqLoad'); ld.classList.add('show');
    load().then(() => {
      ld.classList.remove('show');
      if (current !== 'wq') return;
      const sv = store.get('wq.save', null);
      if ((!G || G.over) && sv) { try { restoreSaved(sv); } catch (e) { G = null; store.del('wq.save'); } }
      if (G && !G.over) { setView('quiz'); layout(); showQ(); startClock(); }
      else { G = null; setView('none'); openStart(); }
    }, () => { ld.classList.remove('show'); menuToast('De kaart en vlaggen konden niet geladen worden.'); show('menu'); });
  }
  // back: from the atlas / progress view to the start dialog, otherwise to the menu
  function leave() {
    if ((view === 'atlas' || view === 'prog') && !anyModal()) { openStart(); return; }
    exit();
  }
  function exit() {
    saveNow(); stopClock(); clearLater(); closeModals(); hideFb();
    if (pendTap) { clearTimeout(pendTap); pendTap = null; }
    $('#wqConf').innerHTML = '';
    if (G && G.over) G = null;
    if (view !== 'quiz') setView('none');
    show('menu'); refreshMenu();
  }

  /* ================= test hooks ================= */
  window.__wq = {
    get G() { return G; }, get view() { return view; }, get QM() { return QM; }, get AM() { return AM; }, get FL() { return FL; }, get GEO() { return GEO; }, opt, stats: () => stats, loadMs: () => loadMs,
    C, BY, MAIN, CONT, norm, dist, judge, suggest, poolOf, buildQuiz, options, dailyQuiz, weakList, mastery, viewGeo, VIEWS, startQuiz, cfgOf, answer, next, finish, load, dayStr, openAtlas, openProg, renderStart,
    loopOn: () => !!((QM && QM.raf) || (AM && AM.raf)), busy: () => !!((QM && QM.busy()) || (AM && AM.busy())), timers: () => timers.size, clockOn: () => !!clockI,
    showQ, makeQ, sfxCalls: [],
    setQs(list) { if (!G) return; clearLater(); closeModals(); $('#wqConf').innerHTML = ''; G.over = false; setView('quiz'); G.qs = list.map(([t, c]) => makeQ(t, c, G.cfg, Math.random)); G.main = G.qs.length; G.i = 0; G.done = 0; G.phase = 'ask'; G.ans = null; hideFb(); showQ(); },
    setClock(ms) { if (G && G.clock) { G.clock.left = ms; clockHud(); } },
    // screen (page) point of a country on the quiz map (inside it, or its marker)
    ptOf(id, m) { const M = m === 'atlas' ? AM : QM; const [x, y] = M.insidePt(id), r = M.wrap.getBoundingClientRect(); return { x: r.left + x, y: r.top + y, inView: x >= 0 && y >= 0 && x <= M.w && y <= M.h }; },
  };
  return { enter, leave, hasSave: () => !!store.get('wq.save', null) };
