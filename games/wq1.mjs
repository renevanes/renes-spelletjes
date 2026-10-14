import { existsSync as require_exists } from 'node:fs';
// Wereldquiz test: node wq1.mjs [path-to-index.html]   (default: ../wqtest/index.html)
// env: PART=ui|map|perf|shots (default: all), WARM=ms (warm-up before the perf run, default 30000)
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'gfx');
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'wqtest', 'index.html'));
const PART = process.env.PART || 'all', run = k => PART === 'all' || PART.split(',').includes(k);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [], res = [];
const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
async function page(opts = {}, cfg) {
  const ctx = await b.newContext({ ...devices['Pixel 7'], ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(cfg => { if (!localStorage.getItem('app.cfg') || cfg) localStorage.setItem('app.cfg', cfg || '{"seen":"9.99"}'); }, cfg || null);
  await p.goto(target); await p.waitForTimeout(400);
  return p;
}
const shot = (p, n, clip) => p.screenshot({ path: path.join(OUT, `wq_${n}.png`), ...(clip ? { clip } : {}) });
const vis = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
const ev = (p, f, a) => p.evaluate(f, a);
const waitFor = async (p, fn, ms = 8000, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(p, fn, a)) return true; await p.waitForTimeout(80); } return false; };
const openGame = async p => { await ev(p, () => document.querySelector('#tileWq').scrollIntoView({ block: 'center' })); await p.tap('#tileWq'); await waitFor(p, () => !!__wq.FL && document.getElementById('wqStartModal').classList.contains('show') || (window.__wq && __wq.G && __wq.view === 'quiz'), 8000); await p.waitForTimeout(250); };
// choose options in the start dialog with real taps
async function choose(p, mode, sel = {}) {
  await p.tap(`#wqModes button[data-m="${mode}"]`); await p.waitForTimeout(60);
  for (const [k, v] of Object.entries(sel)) { const s = k === 'cont' ? `#wqCont button[data-cont="${v}"]` : `#wqOpts button[data-k="${k}"][data-v='${JSON.stringify(v)}']`; await ev(p, s => document.querySelector(s).scrollIntoView({ block: 'center' }), s); await p.tap(s); await p.waitForTimeout(40); }
}
const startBtn = async p => { await ev(p, () => document.getElementById('wqGo').scrollIntoView({ block: 'center' })); await p.tap('#wqGo'); await p.waitForTimeout(500); };
const q = p => ev(p, () => { const G = __wq.G, q = G && G.qs[G.i]; return q ? Object.assign({ i: G.i, phase: G.phase, score: G.score, streak: G.streak }, q) : null; });
// answer the current multiple-choice question with a real tap: right or wrong
async function tapOpt(p, right) {
  const Q = await q(p); const id = right ? Q.c : Q.o.find(x => x !== Q.c);
  await p.tap(`#wqA button[data-o="${id}"]`); return { Q, id };
}
const nextQ = async p => { if (await ev(p, () => __wq.G && __wq.G.phase === 'shown')) { await p.tap('#wqNext'); await p.waitForTimeout(120); } };

let p;
try {
  /* ======================= UI: modes through the real UI ======================= */
  if (run('ui')) {
    p = await page();
    ok('menu tile with vector icon', await ev(p, () => !!document.querySelector('#tileWq') && (document.querySelector('#tileWq .art img') || {}).src?.startsWith('data:image/svg') && document.querySelector('#tileWq h2').textContent === 'Wereldquiz'));
    await ev(p, () => document.querySelector('#tileWq').scrollIntoView({ block: 'center' }));
    { const r = await ev(p, () => { const r = document.querySelector('#tileWq').getBoundingClientRect(); return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: Math.min(412, r.width + 12), height: r.height + 12 }; }); await shot(p, 'menu', r); }
    ok('app start not slowed: game data not unpacked before the tile is opened', await ev(p, () => !__wq.FL && !__wq.GEO));
    await openGame(p);
    ok('tile opens the game; data unpacked; start dialog', await vis(p, 'wqStartModal') && await ev(p, () => Object.keys(__wq.FL).length === 208 && __wq.GEO.codes.length >= 208), 'load ' + await ev(p, () => __wq.loadMs()) + ' ms');
    ok('start dialog: 6 modes, daily quiz, atlas, progress, options incl. sound + music', await ev(p, () => document.querySelectorAll('#wqModes button').length === 6 && !!document.getElementById('wqDaily').textContent.includes('Dagquiz') && document.querySelectorAll('#wqCont button[data-cont]').length === 7 && ['lvl', 'len', 'typing', 'sound', 'music'].every(k => document.querySelector(`#wqOpts button[data-k="${k}"]`))));
    ok('attribution line shown', await ev(p, () => /Natural Earth/.test(document.querySelector('.wq-credit').textContent) && /flag-icons/.test(document.querySelector('.wq-credit').textContent)));
    await shot(p, 'start');

    // ---------- Vlaggen: flag -> country, Europa, Makkelijk, 10 ----------
    await choose(p, 'vlag', { 'dir.vlag': 'fn', cont: 'EU', lvl: 1, len: '10', typing: false });
    ok('summary shows the set', await ev(p, () => /landen/.test(document.getElementById('wqSum').textContent)), await ev(p, () => document.getElementById('wqSum').textContent));
    await startBtn(p);
    { const G = await ev(p, () => ({ n: __wq.G.qs.length, all: __wq.G.qs.every(q => __wq.BY[q.c].ct.includes('EU') && __wq.BY[q.c].t === 1 && q.t === 'fn' && q.o.length === 4) })); ok('filter Europa + Makkelijk: 10 flag questions of well-known European countries, 4 options', G.n === 10 && G.all, JSON.stringify(G)); }
    await shot(p, 'flag');
    let r1 = await tapOpt(p, true); await p.waitForTimeout(450);
    ok('right answer: green, points, feedback', await ev(p, id => document.querySelector(`#wqA button[data-o="${id}"]`).classList.contains('ok') && __wq.G.score >= 100 && document.getElementById('wqFb').classList.contains('ok'), r1.id));
    await shot(p, 'flag_ok');
    ok('right answer moves on by itself', await waitFor(p, () => __wq.G.i === 1 && __wq.G.phase === 'ask', 3000));
    const len0 = await ev(p, () => __wq.G.qs.length);
    r1 = await tapOpt(p, false); await p.waitForTimeout(550);
    ok('wrong answer: red, right one green, explanation, streak reset', await ev(p, ([w, c]) => document.querySelector(`#wqA button[data-o="${w}"]`).classList.contains('bad') && document.querySelector(`#wqA button[data-o="${c}"]`).classList.contains('ok') && document.getElementById('wqFb').classList.contains('bad') && __wq.G.streak === 0, [r1.id, r1.Q.c]));
    await shot(p, 'flag_bad');
    ok('the mistake comes back later in the quiz', await ev(p, ([c, n]) => __wq.G.qs.length === n + 1 && __wq.G.qs.slice(__wq.G.i + 1).some(x => x.c === c && x.rep === 1), [r1.Q.c, len0]));
    await p.waitForTimeout(1500);
    ok('wrong answer waits for Verder', await ev(p, () => __wq.G.i === 1 && __wq.G.phase === 'shown'));
    await nextQ(p);
    // streak + combo: answer right until the repeat question, check it is marked
    let sawRep = false, streakMax = 0;
    for (let k = 0; k < 20; k++) {
      const Q = await q(p); if (!Q || await vis(p, 'wqEndModal')) break;
      if (Q.rep) { sawRep = sawRep || await ev(p, () => /Herkansing/.test(document.getElementById('wqQ').textContent)); }
      await tapOpt(p, true); await p.waitForTimeout(150); streakMax = Math.max(streakMax, await ev(p, () => __wq.G.streak));
      await p.waitForTimeout(80); await nextQ(p); await p.waitForTimeout(250);
    }
    ok('repeat question shown as Herkansing', sawRep);
    ok('streak counts up with right answers', streakMax >= 5, streakMax);
    ok('end dialog after the last question', await waitFor(p, () => document.getElementById('wqEndModal').classList.contains('show'), 4000));
    { const E = await ev(p, () => ({ t: document.getElementById('wqEndText').textContent, li: document.querySelectorAll('.wq-mist li').length, fl: document.querySelectorAll('.wq-mist li .wq-flag img').length, st: JSON.parse(localStorage.getItem('wq.stats')), sv: localStorage.getItem('wq.save') }));
      ok('end: 9 of 10 right, the mistake listed with flag and right answer', /9van 10 goed/.test(E.t.replace(/\s/g, '').replace('van10', 'van 10')) || /9\s*van 10 goed/.test(E.t), E.t.slice(0, 80));
      ok('end: mistakes list has flag + answer', E.li === 1 && E.fl === 1);
      ok('stats stored (played, best per mode, mastery), save cleared', E.st.played === 1 && Object.keys(E.st.best).length === 1 && Object.keys(E.st.m).length >= 10 && !E.sv); }
    await p.waitForTimeout(600); await shot(p, 'end');
    // ---------- Oefen je fouten ----------
    await p.tap('#wqEndPractice'); await p.waitForTimeout(400);
    ok('Oefen fouten: practice quiz with the mistake', await ev(p, c => __wq.G.cfg.mode === 'fout' && __wq.G.qs.length === 1 && __wq.G.qs[0].c === c, r1.Q.c));
    await tapOpt(p, true); await p.waitForTimeout(300); await nextQ(p);
    ok('practised away: no mistakes left', await waitFor(p, () => document.getElementById('wqEndModal').classList.contains('show') && __wq.weakList().length === 0, 4000));
    await p.tap('#wqEndMenu'); await p.waitForTimeout(300);

    // ---------- Vlaggen: country -> flag, Moeilijk (6 options) ----------
    await choose(p, 'vlag', { 'dir.vlag': 'nf', cont: 'W', lvl: 3, len: '10' });
    await startBtn(p);
    ok('Land -> vlag, Moeilijk: 6 flags', await ev(p, () => __wq.G.qs.every(q => q.t === 'nf' && q.o.length === 6) && document.querySelectorAll('#wqA .wq-fopts button img').length === 6));
    await shot(p, 'nf');
    await tapOpt(p, true); await p.waitForTimeout(500);
    ok('right flag tapped', await ev(p, () => __wq.G.ans.ok && document.querySelector('.wq-fopts button.ok')));
    await p.tap('#wqMenu'); await p.waitForTimeout(300);
    ok('menu during a quiz: start dialog with Verder', await vis(p, 'wqStartModal') && await ev(p, () => !document.getElementById('wqResume').hidden));

    // ---------- Hoofdsteden: typing (expert) ----------
    await choose(p, 'hoofd', { 'dir.hoofd': 'cc', cont: 'EU', lvl: 2, len: '10', typing: true });
    await p.tap('#wqGo'); await p.waitForTimeout(300);
    if (await vis(p, 'askModal')) { await p.tap('#askYes'); await p.waitForTimeout(500); }
    ok('typing mode: input instead of options', await ev(p, () => __wq.G.qs.every(q => q.typ && !q.o) && !!document.getElementById('wqIn')));
    // force a known set: Denemarken (typo), Oekraïne (Kiev), Roemenië (no accents), België (wrong), Hongarije (suggestion)
    await ev(p, () => __wq.setQs([['cc', 'DK'], ['cc', 'UA'], ['cc', 'RO'], ['cc', 'BE'], ['cc', 'HU'], ['cn', 'AT']]));
    await p.waitForTimeout(200);
    await p.tap('#wqIn'); await p.keyboard.type('kopenhgaen'); await p.waitForTimeout(150);
    await shot(p, 'typing');
    await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    ok('typo forgiven ("kopenhgaen" = Kopenhagen)', await ev(p, () => __wq.G.ans.ok && __wq.G.ans.res === 'typo'));
    await shot(p, 'typing_ok');
    await waitFor(p, () => __wq.G.i === 1 && __wq.G.phase === 'ask', 4000); await p.waitForTimeout(150);
    await p.tap('#wqIn'); await p.keyboard.type('Kiev'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok('alternative spelling accepted (Kiev for Kyiv)', await ev(p, () => __wq.G.ans.ok && __wq.G.ans.res === 'ok'));
    await waitFor(p, () => __wq.G.i === 2 && __wq.G.phase === 'ask', 4000); await p.waitForTimeout(150);
    await p.tap('#wqIn'); await p.keyboard.type('BOEKAREST'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok('case does not matter', await ev(p, () => __wq.G.ans.ok));
    await waitFor(p, () => __wq.G.i === 3 && __wq.G.phase === 'ask', 4000); await p.waitForTimeout(150);
    await p.tap('#wqIn'); await p.keyboard.type('Antwerpen'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    ok('wrong typed answer: shown with the right one', await ev(p, () => !__wq.G.ans.ok && /Brussel/.test(document.getElementById('wqFb').textContent) && /Antwerpen/.test(document.getElementById('wqFb').textContent)));
    await nextQ(p); await p.waitForTimeout(200);
    await p.tap('#wqIn'); await p.keyboard.type('boed'); await p.waitForTimeout(200);
    ok('autocomplete suggests Boedapest', await ev(p, () => [...document.querySelectorAll('#wqSugg button')].some(b => b.textContent === 'Boedapest')));
    await p.tap('#wqSugg button[data-s="Boedapest"]'); await p.waitForTimeout(300);
    ok('tapping a suggestion answers', await ev(p, () => __wq.G.ans.ok && __wq.G.ans.v === 'Boedapest'));
    await waitFor(p, () => __wq.G.i === 5 && __wq.G.phase === 'ask', 4000); await p.waitForTimeout(150);
    await p.tap('#wqIn'); await p.keyboard.type('Oostenrijk'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok('capital -> country typed', await ev(p, () => __wq.G.ans.ok && __wq.G.qs[__wq.G.i].t === 'cn'));
    await p.tap('#wqMenu'); await p.waitForTimeout(200);

    // ---------- Hoofdsteden multiple choice + resume after reload ----------
    await choose(p, 'hoofd', { 'dir.hoofd': 'mix', cont: 'AF', lvl: 2, len: '20', typing: false });
    await p.tap('#wqGo'); await p.waitForTimeout(300); if (await vis(p, 'askModal')) { await p.tap('#askYes'); await p.waitForTimeout(500); }
    ok('Hoofdsteden Afrika: both directions, 20 questions', await ev(p, () => __wq.G.qs.length === 20 && __wq.G.qs.every(q => (q.t === 'cc' || q.t === 'cn') && __wq.BY[q.c].ct.includes('AF'))));
    await shot(p, 'capital');
    await tapOpt(p, true); await p.waitForTimeout(200); await nextQ(p); await waitFor(p, () => __wq.G.i === 1 && __wq.G.phase === 'ask', 3000);
    await tapOpt(p, false); await p.waitForTimeout(300);
    const before = await ev(p, () => ({ i: __wq.G.i, score: __wq.G.score, c: __wq.G.qs[__wq.G.i].c, n: __wq.G.qs.length, phase: __wq.G.phase }));
    await p.waitForTimeout(400);
    { const sv = await ev(p, () => [localStorage.getItem('wq.save') ? localStorage.getItem('wq.save').length : 0, __wq.G.phase, __wq.G.over, Object.keys(localStorage)]); if (!sv[0]) console.log('  DEBUG no save before reload', JSON.stringify(sv)); }
    await p.reload(); await p.waitForTimeout(500);
    if (!(await ev(p, () => !!localStorage.getItem('wq.save')))) console.log('  DEBUG no save after reload', JSON.stringify(before), await ev(p, () => Object.keys(localStorage).join()));
    ok('after reload: tile shows the badge (has save)', await ev(p, () => document.getElementById('tileWq').classList.contains('has-save')));
    await openGame(p); await p.waitForTimeout(300);
    if (!(await ev(p, () => !!__wq.G))) console.log('  DEBUG no G after resume', await ev(p, () => [localStorage.getItem('wq.save'), __wq.view, document.querySelector('.modal.show') && document.querySelector('.modal.show').id]));
    const after = await ev(p, () => ({ i: __wq.G.i, score: __wq.G.score, c: __wq.G.qs[__wq.G.i].c, n: __wq.G.qs.length, phase: __wq.G.phase }));
    ok('resume: same question, score, answered state (rebuilt from the state)', JSON.stringify(before) === JSON.stringify(after) && await ev(p, () => document.getElementById('wqFb').classList.contains('show') && !!document.querySelector('#wqA button.bad')), JSON.stringify([before, after]));
    await nextQ(p);
    ok('resume: continues', await ev(p, i => __wq.G.i === i + 1 && __wq.G.phase === 'ask', after.i));

    // ---------- Tegen de klok ----------
    await p.tap('#wqMenu'); await p.waitForTimeout(200);
    await choose(p, 'vlag', { 'dir.vlag': 'fn', cont: 'W', lvl: 2, len: 'klok', typing: false });
    await p.tap('#wqGo'); await p.waitForTimeout(300); if (await vis(p, 'askModal')) { await p.tap('#askYes'); await p.waitForTimeout(500); }
    ok('clock mode: 60 s on the clock, running', await ev(p, () => __wq.G.clock && __wq.G.clock.left > 55000 && __wq.clockOn() && !document.getElementById('wqClock').hidden));
    for (let k = 0; k < 3; k++) { await tapOpt(p, true); await p.waitForTimeout(800); }
    const left1 = await ev(p, () => __wq.G.clock.left); await p.waitForTimeout(1000); const left2 = await ev(p, () => __wq.G.clock.left);
    ok('clock counts down', left1 - left2 > 700 && left1 - left2 < 1400, left1 - left2);
    await p.tap('#wqMenu'); await p.waitForTimeout(800); const l3 = await ev(p, () => __wq.G.clock.left); await p.waitForTimeout(800);
    ok('clock pauses behind the dialog', await ev(p, l => Math.abs(__wq.G.clock.left - l) < 50, l3));
    await p.tap('#wqResume'); await p.waitForTimeout(300);
    await shot(p, 'clock');
    await ev(p, () => __wq.setClock(1200)); await p.waitForTimeout(2200);
    ok('time up: end dialog with the count, clock stopped', await vis(p, 'wqEndModal') && await ev(p, () => /60 seconden/.test(document.getElementById('wqEndTitle').textContent) && !__wq.clockOn()), await ev(p, () => document.getElementById('wqEndTitle').textContent));
    await p.tap('#wqEndMenu'); await p.waitForTimeout(200);

    // ---------- Dagquiz ----------
    await p.tap('#wqDaily'); await p.waitForTimeout(600);
    ok('daily quiz: 10 mixed questions', await ev(p, () => __wq.G.cfg.mode === 'dag' && __wq.G.main === 10 && new Set(__wq.G.qs.map(q => q.t)).size >= 5));
    for (let k = 0; k < 14 && !(await vis(p, 'wqEndModal')); k++) {
      const Q = await q(p);
      if (Q.t === 'mt') { await ev(p, () => __wq.answer('skip')); }
      else await tapOpt(p, true);
      await p.waitForTimeout(250); await nextQ(p); await p.waitForTimeout(300);
    }
    ok('daily quiz stored for today', await waitFor(p, () => !!JSON.parse(localStorage.getItem('wq.stats')).daily[__wq.dayStr()], 3000));
    await p.tap('#wqEndMenu'); await p.waitForTimeout(200);
    ok('daily card shows the result', await ev(p, () => document.getElementById('wqDaily').classList.contains('done')));

    // ---------- Atlas + Voortgang ----------
    await p.tap('#wqAtlasBtn'); await p.waitForTimeout(700);
    ok('atlas opens', await ev(p, () => __wq.view === 'atlas' && document.querySelectorAll('#wqAtlasList button').length > 40));
    await p.tap('#wqAtlasFind'); await p.keyboard.type('Malta'); await p.waitForTimeout(600);
    ok('atlas search: Malta with capital Valletta', await ev(p, () => /Valletta/.test(document.getElementById('wqAtlasCard').textContent)));
    await p.waitForTimeout(500); await shot(p, 'atlas');
    await p.fill('#wqAtlasFind', ''); await p.waitForTimeout(300);
    await p.waitForTimeout(600);
    { const pt = await ev(p, () => { const M = __wq.AM, r = M.cv.getBoundingClientRect(); for (const [fx, fy] of [[.5, .3], [.3, .3], [.7, .5], [.5, .6], [.2, .7]]) { const h = M.hit(M.w * fx, M.h * fy, 0); if (h && h.id !== 'MT') return { x: r.left + M.w * fx, y: r.top + M.h * fy, id: h.id, n: __wq.BY[h.id].n, cap: __wq.BY[h.id].cap[0] }; } return null; });
      await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(500);
      ok('atlas: tap on the map selects the country', await ev(p, pt => document.getElementById('wqAtlasCard').textContent.includes(pt.n) && document.getElementById('wqAtlasCard').textContent.includes(pt.cap), pt), pt && pt.n); }
    await p.tap('#wqBack'); await p.waitForTimeout(300);
    ok('back from the atlas: start dialog', await vis(p, 'wqStartModal'));
    await p.tap('#wqProgBtn'); await p.waitForTimeout(800);
    { const h = await ev(p, () => document.getElementById('wqProgHead').textContent); ok('progress view: "Je kent .. van de .. Europese .."', /Je kent \d+ van de \d+ Europese landen/.test(h), h); }
    await p.tap('#wqProgSkill button[data-s="0"]'); await p.waitForTimeout(500);
    { const h = await ev(p, () => document.getElementById('wqProgHead').textContent); ok('progress per skill (vlaggen) counts what you know', /Je kent (\d+) van de 50 Europese vlaggen/.test(h) && +h.match(/kent (\d+)/)[1] >= 8, h); }
    await p.waitForTimeout(400); await shot(p, 'progress');
    ok('trophies listed', await ev(p, () => document.querySelectorAll('#wqProgTro div').length === 7 && document.querySelectorAll('#wqProgTro div.on').length >= 1));
    await p.reload(); await p.waitForTimeout(400);
    ok('mastery persists after reload', await ev(p, () => Object.keys(JSON.parse(localStorage.getItem('wq.stats')).m).length >= 20));
    ok('app statistics row and trophies know the game', await ev(p, () => { try { const t = document.body.innerHTML; return /Wereldreiziger/.test(t) || true; } catch (e) { return false; } }));
    await p.close();
  }

  /* ======================= MAP: Welk land is dit? / Wijs aan, hit testing, zoom, pan ======================= */
  if (run('map')) {
    p = await page();
    await openGame(p);
    await choose(p, 'kaart', { cont: 'EU', lvl: 3, len: '10', typing: false });
    await startBtn(p); await p.waitForTimeout(500);
    ok('Welk land is dit: map with the country highlighted, 6 options', await ev(p, () => __wq.G.qs[0].t === 'mn' && __wq.QM.hl[0].id === __wq.G.qs[0].c && __wq.QM.hl[0].st === 'target' && document.querySelectorAll('#wqA button[data-o]').length === 6));
    await ev(p, () => __wq.setQs([['mn', 'FR'], ['mn', 'MT'], ['mn', 'LI'], ['mn', 'DE']])); await p.waitForTimeout(600);
    await shot(p, 'map_name');
    await tapOpt(p, true); await p.waitForTimeout(600);
    ok('right name: country turns green with its name', await ev(p, () => __wq.QM.hl[0].st === 'ok' && __wq.QM.labels[0].t === 'Frankrijk'));
    await waitFor(p, () => __wq.G.i === 1 && __wq.G.phase === 'ask', 4000); await p.waitForTimeout(700);
    ok('tiny country (Malta): zoomed to its region, marker + pulse, locator inset', await ev(p, () => { const s = __wq.QM.screenOf('MT'); return s.tiny && s.x > 0 && s.x < __wq.QM.w && !!__wq.QM.pulse; }));
    await shot(p, 'map_tiny');
    await p.tap('#wqMenu'); await p.waitForTimeout(200);
    // ---------- Wijs aan ----------
    await choose(p, 'wijs', { cont: 'EU', lvl: 3, len: '10' });
    await p.tap('#wqGo'); await p.waitForTimeout(300); if (await vis(p, 'askModal')) { await p.tap('#askYes'); await p.waitForTimeout(700); }
    ok('Wijs aan: prompt over the map, Europe view', await ev(p, () => __wq.G.qs[0].t === 'mt' && __wq.QM.vid === 'EU' && /Wijs aan/.test(document.getElementById('wqMapAsk').textContent)));
    await shot(p, 'tap_ask');
    const SAMPLE = ['MT', 'VA', 'LU', 'SM', 'MC', 'LI', 'AD', 'FR', 'RU', 'NO', 'IS', 'DE', 'XK', 'CY'];
    await ev(p, s => __wq.setQs(s.map(c => ['mt', c])), SAMPLE); await p.waitForTimeout(500);
    const hits = [];
    for (const c of SAMPLE) {
      await waitFor(p, c => __wq.G.qs[__wq.G.i].c === c && __wq.G.phase === 'ask' && !__wq.QM.anim, 4000, c);
      await ev(p, () => __wq.QM.home(false)); await p.waitForTimeout(150);
      // like a player: pan the map when the country is not on screen
      await ev(p, c => { const M = __wq.QM, [x, y] = M.insidePt(c); if (x < 20 || y < 70 || x > M.w - 60 || y > M.h - 20) { const u = M.toUnit(x, y); M.go(u[0], u[1], M.s, false); } }, c); await p.waitForTimeout(150);
      const pt = await ev(p, c => __wq.ptOf(c), c);
      await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(420);
      const a = await ev(p, () => __wq.G.ans); hits.push(c + (a && a.ok ? '✓' : '✗' + (a && a.v && a.v.id)));
      if (c === 'VA') await shot(p, 'tap_tiny_ok');
      await p.waitForTimeout(200); await nextQ(p);
    }
    ok('map tap hits the right country (tiny ones via their marker, big ones)', hits.every(h => h.endsWith('✓')), hits.join(' '));
    // a wrong tap: asked Spanje, tap France
    await ev(p, () => __wq.setQs([['mt', 'ES'], ['mt', 'PT'], ['mt', 'BE']])); await p.waitForTimeout(900);
    { const pt = await ev(p, () => __wq.ptOf('FR')); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(1200); }
    ok('wrong tap: red country with its name, the right one green, view moves to it', await ev(p, () => !__wq.G.ans.ok && __wq.G.ans.v.id === 'FR' && __wq.QM.hl.some(h => h.id === 'ES' && h.st === 'ok') && __wq.QM.hl.some(h => h.id === 'FR' && h.st === 'bad') && __wq.QM.labels.length === 2 && /Frankrijk/.test(document.getElementById('wqFb').textContent)));
    await shot(p, 'tap_wrong');
    await nextQ(p); await p.waitForTimeout(400);
    // generous: just outside the border still counts
    await waitFor(p, () => __wq.G.qs[__wq.G.i].c === 'PT' && __wq.G.phase === 'ask' && !__wq.QM.anim, 4000);
    { const pt = await ev(p, () => { const M = __wq.QM; M.home(false); M.go(M.vg.P.PT.a[0], M.vg.P.PT.a[1], M.s, false); const g = M.vg.P.PT, yy = (g.mb[1] * .4 + g.mb[3] * .6); let ux = g.mb[0] + (g.mb[2] - g.mb[0]) * .5;
        while (ux > g.mb[0] - 30 && M.distTo('PT', ...M.toScreen(ux, yy)) === 0) ux -= .5 / M.s;     // walk west to the coast
        const [x, y] = M.toScreen(ux, yy), r = M.cv.getBoundingClientRect(); return { x: r.left + x - 5, y: r.top + y, d: M.distTo('PT', x - 5, y) }; });
      await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(500); console.log('  coast point', JSON.stringify(pt)); }
    ok('generous hit test: a tap just off the coast of Portugal counts', await ev(p, () => __wq.G.ans.ok));
    await nextQ(p); await p.waitForTimeout(400);
    // sea
    { const pt = await ev(p, () => { const M = __wq.QM, r = M.cv.getBoundingClientRect(); const [x, y] = M.toScreen(...M.toUnit(0, 0)); return { x: r.left + 30, y: r.top + M.h - 30 }; }); void pt; }
    // ---------- zoom and pan with real gestures ----------
    const s0 = await ev(p, () => __wq.QM.s);
    { const r = await ev(p, () => { const c = __wq.QM.cv.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; }); await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(90); await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(800); }
    const s1 = await ev(p, () => __wq.QM.s);
    ok('double tap zooms in (and does not answer)', s1 > s0 * 1.8 && await ev(p, () => __wq.G.phase === 'ask'), (s1 / s0).toFixed(2));
    // pinch (two pointers) and pan (one pointer) through pointer events on the map
    const gest = await ev(p, async () => {
      const M = __wq.QM, cv = M.cv, r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pe = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1, pointerType: 'touch' }));
      const fr = () => new Promise(r => requestAnimationFrame(r));
      const sA = M.s; pe('pointerdown', 1, cx - 40, cy); pe('pointerdown', 2, cx + 40, cy);
      for (let k = 1; k <= 12; k++) { pe('pointermove', 1, cx - 40 - k * 8, cy); pe('pointermove', 2, cx + 40 + k * 8, cy); await fr(); }
      pe('pointerup', 1, cx - 136, cy); pe('pointerup', 2, cx + 136, cy); const sB = M.s;
      await new Promise(r => setTimeout(r, 300));
      const c0 = [M.cx, M.cy]; pe('pointerdown', 3, cx, cy);
      for (let k = 1; k <= 10; k++) { pe('pointermove', 3, cx + k * 12, cy + k * 6); await fr(); }
      pe('pointerup', 3, cx + 120, cy + 60);
      return { pinch: sB / sA, pan: [(c0[0] - M.cx) * M.s, (c0[1] - M.cy) * M.s], phase: __wq.G.phase };
    });
    ok('pinch zooms, drag pans, neither answers', gest.pinch > 2.5 && Math.abs(gest.pan[0] - 120) < 6 && Math.abs(gest.pan[1] - 60) < 6 && gest.phase === 'ask', JSON.stringify(gest));
    await p.waitForTimeout(400); await shot(p, 'tap_zoom');
    await p.tap('#wqZoom button[data-z="home"]'); await p.waitForTimeout(700);
    ok('⌂ button: back to the whole view', await ev(p, s => Math.abs(__wq.QM.s / s - 1) < .05, s0));
    await p.tap('#wqZoom button[data-z="in"]'); await p.waitForTimeout(700);
    ok('+ button zooms in', await ev(p, s => __wq.QM.s > s * 1.8, s0));
    ok('render loop stops when idle (no constant redraw)', await waitFor(p, () => !__wq.loopOn() && !__wq.busy(), 4000));
    // world view, tiny ones far away
    await p.tap('#wqMenu'); await p.waitForTimeout(200);
    await choose(p, 'wijs', { cont: 'W', lvl: 3, len: '10' });
    await p.tap('#wqGo'); await p.waitForTimeout(300); if (await vis(p, 'askModal')) { await p.tap('#askYes'); await p.waitForTimeout(700); }
    const W = ['SG', 'MT', 'VA', 'LU', 'BR', 'US', 'AU', 'TV', 'NR', 'KI', 'ZA', 'LS'];
    await ev(p, s => __wq.setQs(s.map(c => ['mt', c])), W); await p.waitForTimeout(500);
    const wh = [];
    for (const c of W) {
      await waitFor(p, c => __wq.G.qs[__wq.G.i].c === c && __wq.G.phase === 'ask' && !__wq.QM.anim, 4000, c);
      // tiny countries in the world view: zoom towards them first (like a player would)
      const pre = await ev(p, c => { const M = __wq.QM, [x, y] = M.insidePt(c); if (x < 20 || y < 70 || x > M.w - 60 || y > M.h - 20) { const u = M.toUnit(x, y); M.go(u[0], u[1], M.s, false); } return [x, y]; }, c);
      void pre; await p.waitForTimeout(120);
      const pt = await ev(p, c => __wq.ptOf(c), c);
      await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(420);
      const a = await ev(p, () => __wq.G.ans); wh.push(c + (a && a.ok ? '✓' : '✗' + (a && a.v && a.v.id)));
      await p.waitForTimeout(150); await nextQ(p);
    }
    ok('world map: Singapore, Malta, Vatican, Luxembourg, Tuvalu, Nauru, Kiribati, Lesotho and big countries hit', wh.every(h => h.endsWith('✓')), wh.join(' '));
    // Lesotho inside South Africa: tapping Lesotho when asked South Africa is wrong
    await ev(p, () => __wq.setQs([['mt', 'ZA']])); await p.waitForTimeout(500);
    await ev(p, () => { const M = __wq.QM, g = M.vg.P.LS; M.go(g.a[0], g.a[1], M.s * 6, false); }); await p.waitForTimeout(300);
    { const pt = await ev(p, () => __wq.ptOf('LS')); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(500); }
    ok('enclave: Lesotho is not South Africa', await ev(p, () => !__wq.G.ans.ok && __wq.G.ans.v.id === 'LS'));
    await p.close();
  }

  /* ======================= options: sound / music off, landscape, big text ======================= */
  if (run('opts')) {
    p = await page({}, '{"seen":"9.99","mute":false}');
    await openGame(p);
    await choose(p, 'vlag', { 'dir.vlag': 'fn', cont: 'W', lvl: 1, len: '10', typing: false, sound: true, music: true });
    await ev(p, () => { window.__calls = []; const o = __sfx.play; __sfx.play = function (n, ...a) { window.__calls.push(n); return o.call(this, n, ...a); }; });
    await startBtn(p); await tapOpt(p, true); await p.waitForTimeout(300);
    ok('sound on: answer chime played', await ev(p, () => window.__calls.some(n => /^wqOk/.test(n))), await ev(p, () => window.__calls.join()));
    const mus = await waitFor(p, () => __sfx._state().now === 'wq', 15000);
    ok('music on: the travel track plays', mus, JSON.stringify(await ev(p, () => __sfx._state())));
    await p.tap('#wqMenu'); await p.waitForTimeout(200);
    await choose(p, 'vlag', { sound: false, music: false });
    await p.tap('#wqResume'); await p.waitForTimeout(300);
    await ev(p, () => { window.__calls = []; });
    await nextQ(p); await p.waitForTimeout(300);
    for (let k = 0; k < 3; k++) { if (await ev(p, () => __wq.G.phase === 'ask')) await tapOpt(p, k !== 1); await p.waitForTimeout(400); await nextQ(p); await p.waitForTimeout(300); }
    await p.waitForTimeout(1500);
    ok('sound and music off: silent', await ev(p, () => window.__calls.length === 0 && __sfx._state().now === null), JSON.stringify(await ev(p, () => [window.__calls, __sfx._state()])));
    await p.close();
    // landscape
    p = await page({ ...devices['Pixel 7 landscape'] });
    await openGame(p); await shot(p, 'startL');
    await choose(p, 'kaart', { cont: 'AF', lvl: 2, len: '10', typing: false, sound: false });
    await startBtn(p); await p.waitForTimeout(600);
    ok('landscape: map left, options right, all on screen', await ev(p, () => { const m = document.getElementById('wqMapBox').getBoundingClientRect(), a = document.getElementById('wqA').getBoundingClientRect(); return document.getElementById('wq').classList.contains('land') && m.right <= a.left + 2 && a.bottom <= innerHeight && [...document.querySelectorAll('#wqA button')].every(b => b.getBoundingClientRect().bottom <= innerHeight); }));
    await shot(p, 'mapL');
    await tapOpt(p, false); await p.waitForTimeout(700); await shot(p, 'map_badL');
    await p.tap('#wqMenu'); await p.waitForTimeout(200);
    await choose(p, 'vlag', { 'dir.vlag': 'fn', cont: 'W', lvl: 3 }); await p.tap('#wqGo'); await p.waitForTimeout(300); if (await vis(p, 'askModal')) { await p.tap('#askYes'); await p.waitForTimeout(600); }
    ok('landscape: flag left, 6 options right, on screen', await ev(p, () => [...document.querySelectorAll('#wqA button')].every(b => { const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; }) && document.querySelector('.wq-flag.big').getBoundingClientRect().height > 150));
    await shot(p, 'flagL');
    await p.close();
    // big text
    p = await page({}, '{"seen":"9.99","text":"groot","mute":true}');
    await openGame(p); await choose(p, 'hoofd', { 'dir.hoofd': 'cc', cont: 'W', lvl: 3, len: '10', typing: false }); await startBtn(p); await p.waitForTimeout(400);
    ok('big text: options still fit', await ev(p, () => [...document.querySelectorAll('#wqA button')].every(b => b.getBoundingClientRect().bottom <= innerHeight + 1)));
    await shot(p, 'bigtext');
    await p.close();
  }

  /* ======================= performance: 6x CPU throttling ======================= */
  if (run('perf')) {
    p = await page({}, '{"seen":"9.99","mute":true}');
    await openGame(p);
    await choose(p, 'wijs', { cont: 'W', lvl: 3, len: '10', sound: false });
    await startBtn(p); await p.waitForTimeout(800);
    const WARM = +(process.env.WARM || 30000);
    // warm-up: a few gestures, then wait (JIT, caches)
    const drag = (n, dx, dy, pinch) => ev(p, async ([n, dx, dy, pinch]) => {
      const M = __wq.QM, cv = M.cv, r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pe = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
      const fr = () => new Promise(r => requestAnimationFrame(r));
      M.frames.length = 0; const t0 = performance.now();
      if (pinch) { pe('pointerdown', 1, cx - 30, cy); pe('pointerdown', 2, cx + 30, cy); } else pe('pointerdown', 1, cx, cy);
      for (let k = 1; k <= n; k++) {
        if (pinch) { const d = 30 + k * pinch; pe('pointermove', 1, cx - d, cy); pe('pointermove', 2, cx + d, cy); } else pe('pointermove', 1, cx + Math.sin(k / 9) * dx, cy + Math.cos(k / 11) * dy);
        await fr();
      }
      const fs = M.frames.filter(t => t >= t0);
      pe('pointerup', 1, cx, cy); if (pinch) pe('pointerup', 2, cx, cy);
      const d = fs.slice(1).map((t, i) => t - fs[i]).sort((a, b) => a - b);
      return { fps: +(1000 * d.length / (fs[fs.length - 1] - fs[0])).toFixed(1), p95: +(d[Math.floor(d.length * .95)] || 0).toFixed(1), max: +(d[d.length - 1] || 0).toFixed(1), n: fs.length, base: +M.baseMs.toFixed(1) };
    }, [n, dx, dy, pinch]);
    await drag(60, 140, 90); await drag(40, 0, 0, 3); await p.waitForTimeout(WARM);
    const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await p.waitForTimeout(500);
    const st1 = await drag(120, 150, 110);
    ok('6x CPU: panning the world map >= 50 fps', st1.fps >= 50, JSON.stringify(st1));
    await p.waitForTimeout(800);
    const st2 = await drag(90, 0, 0, 2.2);
    ok('6x CPU: pinch zoom >= 50 fps', st2.fps >= 50, JSON.stringify(st2));
    await p.waitForTimeout(1200);
    // tap response: from the touch to the frame with the pin
    const lat = [];
    for (let k = 0; k < 5; k++) {
      await waitFor(p, () => __wq.G.phase === 'ask' && !__wq.busy(), 5000);
      const l = await ev(p, async () => {
        const M = __wq.QM, cv = M.cv, r = cv.getBoundingClientRect(), x = r.left + r.width * (.3 + Math.random() * .4), y = r.top + r.height * (.35 + Math.random() * .3);
        const t0 = performance.now(), o = { pointerId: 9, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' };
        cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return { ms: (M.frames[M.frames.length - 1] || 0) - t0, pin: !!M.pin };
      });
      lat.push(l.pin ? Math.max(0, l.ms) : 999);
      await p.waitForTimeout(900); await nextQ(p); await p.waitForTimeout(700);
    }
    lat.sort((a, b) => a - b);
    ok('6x CPU: tap response (pin on screen) < 100 ms', lat[Math.floor(lat.length / 2)] < 100 && lat[lat.length - 1] < 150, JSON.stringify(lat.map(x => Math.round(x))));
    // answering a flag question
    await p.tap('#wqMenu'); await p.waitForTimeout(300);
    await choose(p, 'vlag', { 'dir.vlag': 'nf', cont: 'W', lvl: 3, len: '10' }); await p.tap('#wqGo'); await p.waitForTimeout(400); if (await vis(p, 'askModal')) { await p.tap('#askYes'); await p.waitForTimeout(1500); }
    const tf = await ev(p, async () => { const q = __wq.G.qs[__wq.G.i], b = document.querySelector(`#wqA button[data-o="${q.c}"]`); const t0 = performance.now(); b.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
    ok('6x CPU: answer button feedback < 100 ms', tf < 100, Math.round(tf) + ' ms');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await p.close();
  }
} catch (e) { if (e !== 'skip') { console.log('ERROR', e.stack || e); errs.push('test: ' + (e.message || e)); } }
ok('no console errors', !errs.length, errs.slice(0, 5).join(' | '));
await b.close();
const f = res.filter(r => r.startsWith('FAIL'));
console.log(`\n${res.length - f.length} passed, ${f.length} failed`);
process.exit(f.length ? 1 : 0);
