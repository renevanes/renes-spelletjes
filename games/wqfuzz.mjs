import { existsSync as require_exists } from 'node:fs';
// Wereldquiz robustness fuzz: node wqfuzz.mjs [path-to-index.html] [actions]   (default ../wqtest/index.html, 400 actions)
// Random real taps on answers / Verder / map (taps, double taps, pinch, pan, zoom buttons), typing, mode switches through the
// start dialog, atlas + progress, menu / back / reopen, reloads + resume, clock games. After every action: the state is
// consistent (question index, phase, answer), the screen shows that state, timers bounded; at checkpoints (after a pause):
// render loop stopped, no animation running, the clock only runs in a clock game on screen. No page errors, no hang.
import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(process.argv[2] || path.join(here, '..', 'wqtest', 'index.html'));
const N = +(process.argv[3] || 400);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const ctx = await b.newContext({ ...devices['Pixel 7'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { if (!localStorage.getItem('app.cfg')) localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); });
let seed = 20261014; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = n => Math.floor(rnd() * n), pick = a => a[ri(a.length)];
const ev = (f, a) => Promise.race([p.evaluate(f, a), new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate hang')), 15000))]);
const vis = id => ev(id => { const e = document.getElementById(id); return !!e && e.classList.contains('show'); }, id);
const issues = []; const count = {};
const issue = (what, x) => { issues.push(what); console.log('ISSUE', what, JSON.stringify(x || '').slice(0, 300)); };
const acts = []; const act = x => { acts.push(x); if (acts.length > 6) acts.shift(); };
const tapSel = async sel => { act(sel); const r = await ev(sel => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return b.width && b.height ? { x: b.left + b.width / 2, y: b.top + b.height / 2, dis: e.disabled } : null; }, sel); if (!r) return false; await p.touchscreen.tap(r.x, r.y); return true; };
async function openTile() { await ev(() => document.querySelector('#tileWq').scrollIntoView({ block: 'center' })); await tapSel('#tileWq'); for (let k = 0; k < 60; k++) { if (await ev(() => !!(window.__wq && __wq.FL) && (document.getElementById('wqStartModal').classList.contains('show') || __wq.view === 'quiz'))) return; await p.waitForTimeout(100); } issue('tile did not open'); }
async function startRandom() {
  if (!(await vis('wqStartModal'))) { await tapSel('#wqMenu'); await p.waitForTimeout(150); }
  if (!(await vis('wqStartModal'))) return;
  await tapSel(`#wqModes button[data-m="${pick(['vlag', 'hoofd', 'kaart', 'wijs', 'reis', 'reis', 'fout'])}"]`); await p.waitForTimeout(60);
  for (const k of ['dir.vlag', 'dir.hoofd', 'cont', 'lvl', 'len', 'typing', 'extra']) {
    if (rnd() < .5) continue;
    const bs = await ev(k => [...document.querySelectorAll(`#wqOpts button[data-k="${k}"]`)].map(b => b.dataset.v), k); if (!bs.length) continue;
    const v = k === 'len' ? pick(['"10"', '"10"', '"20"', '"klok"', '"alle"']) : pick(bs); if (!bs.includes(v)) continue;
    await tapSel(`#wqOpts button[data-k="${k}"][data-v='${v}']`); await p.waitForTimeout(40);
  }
  if (rnd() < .12) { await tapSel('#wqDaily'); count.daily = (count.daily || 0) + 1; } else await tapSel('#wqGo');
  await p.waitForTimeout(250);
  if (await vis('askModal')) { await tapSel(rnd() < .8 ? '#askYes' : '#askNo'); await p.waitForTimeout(300); }
  count.start = (count.start || 0) + 1;
}
async function answer() {
  const Q = await ev(() => { const G = __wq.G, q = G && !G.over && G.qs[G.i]; return q && __wq.view === 'quiz' ? { t: q.t, c: q.c, o: q.o, typ: q.typ, phase: G.phase, n: __wq.BY[q.c].n, cap: __wq.BY[q.c].cap[0] } : null; });
  if (!Q || await ev(() => !!document.querySelector('.modal.show'))) return false;
  if (Q.phase !== 'ask') { if (rnd() < .8) await tapSel('#wqNext'); return true; }
  const right = rnd() < .6;
  if (Q.t === 'mt') {
    if (rnd() < .1) { await tapSel('#wqA .wq-skip'); return true; }
    const pt = await ev(([c, right]) => { const M = __wq.QM, r = M.wrap.getBoundingClientRect(); if (right) { const q = __wq.ptOf(c); if (q.inView) return q; } return { x: r.left + 10 + Math.random() * (r.width - 70), y: r.top + 60 + Math.random() * (r.height - 80) }; }, [Q.c, right]);
    act('maptap'); await p.touchscreen.tap(pt.x, pt.y); count.mapTap = (count.mapTap || 0) + 1; return true;
  }
  if (Q.typ) {
    const txt = right ? (Q.t === 'cc' ? Q.cap : Q.n) : pick(['Parijs', 'xyz', 'Nederlnd', 'Kiev', 'Bern', 'a']);
    if (!(await tapSel('#wqIn'))) return true;
    await p.keyboard.type(txt.slice(0, 1 + ri(txt.length))); await p.waitForTimeout(40);
    if (rnd() < .3 && await ev(() => !!document.querySelector('#wqSugg button'))) await tapSel('#wqSugg button'); else { await p.keyboard.type(txt.slice(0)); await p.keyboard.press('Enter'); }
    count.typed = (count.typed || 0) + 1; return true;
  }
  const id = right ? Q.c : pick(Q.o.filter(x => x !== Q.c));
  await tapSel(`#wqA button[data-o="${id}"]`); count.opt = (count.opt || 0) + 1; return true;
}
async function mapGesture() {
  const M = await ev(() => { const M = __wq.view === 'quiz' ? __wq.QM : __wq.AM; if (!M || !M.vg || !M.w) return null; const r = M.wrap.getBoundingClientRect(); return r.width > 50 && r.height > 50 ? { x: r.left, y: r.top, w: r.width, h: r.height, quiz: __wq.view === 'quiz' } : null; });
  if (!M) return false;
  const k = ri(5);
  if (k === 0) { const x = M.x + M.w * (.2 + rnd() * .6), y = M.y + M.h * (.3 + rnd() * .5); await p.touchscreen.tap(x, y); await p.waitForTimeout(70); await p.touchscreen.tap(x, y); count.dbl = (count.dbl || 0) + 1; }
  else if (k === 1) { await tapSel(`#wqZoom button[data-z="${pick(['in', 'out', 'home'])}"]`); count.zoomBtn = (count.zoomBtn || 0) + 1; }
  else {
    await ev(async ([pinch, n]) => {
      const M = __wq.view === 'quiz' ? __wq.QM : __wq.AM, el = M.wrap, r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pe = (type, id, x, y) => (document.elementFromPoint(x, y) && el.contains(document.elementFromPoint(x, y)) ? document.elementFromPoint(x, y) : el).dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
      const fr = () => new Promise(r => requestAnimationFrame(r));
      const dx = (Math.random() - .5) * 300, dy = (Math.random() - .5) * 300, z = (Math.random() - .4) * 5;
      pe('pointerdown', 1, cx, cy); if (pinch) pe('pointerdown', 2, cx + 40, cy);
      for (let k = 1; k <= n; k++) { pe('pointermove', 1, cx + dx * k / n, cy + dy * k / n); if (pinch) pe('pointermove', 2, cx + 40 + z * k * 6, cy); await fr(); }
      if (Math.random() < .1) { pe('pointercancel', 1, cx + dx, cy + dy); if (pinch) pe('pointercancel', 2, cx, cy); }
      else { pe('pointerup', 1, cx + dx, cy + dy); if (pinch) pe('pointerup', 2, cx + 40, cy); }
    }, [k === 4, 6 + ri(14)]);
    count.gesture = (count.gesture || 0) + 1;
  }
  return true;
}
// state <-> screen consistency (checked after every action)
const consistent = () => ev(() => {
  const out = [], G = __wq.G, v = __wq.view;
  if (__wq.timers() > 12) out.push('timers ' + __wq.timers());
  if (G && !G.over) {
    if (!(G.i >= 0 && G.i < G.qs.length)) out.push('index ' + G.i + '/' + G.qs.length);
    if (!['ask', 'shown', 'timeup'].includes(G.phase)) out.push('phase ' + G.phase);
    if (G.phase === 'shown' && !G.ans) out.push('shown without answer');
    if (!Number.isFinite(G.score) || G.score < 0) out.push('score ' + G.score);
    if (G.clock && !(G.clock.left >= 0 && G.clock.left <= 60000)) out.push('clock ' + G.clock.left);
    if (v === 'quiz' && !document.querySelector('.modal.show') && (document.querySelector('.screen.active') || {}).id === 'wq') {
      const q = G.qs[G.i], fb = document.getElementById('wqFb').classList.contains('show');
      if (G.phase === 'ask' && fb) out.push('feedback shown while asking');
      if (G.phase === 'shown' && !fb) out.push('answered but no feedback');
      const main = document.getElementById('wqMain');
      if (!main.classList.contains('t-' + q.t)) out.push('screen shows another question type ' + main.className + ' vs ' + q.t);
      if (q.o && q.t !== 'mt' && !q.typ) { const ids = [...document.querySelectorAll('#wqA button[data-o]')].map(b => b.dataset.o); if (ids.join() !== q.o.join()) out.push('options on screen differ'); }
      if (G.phase === 'ask' && [...document.querySelectorAll('#wqA button[data-o]')].some(b => b.disabled)) out.push('options disabled while asking');
    }
  }
  if (__wq.clockOn() && !(G && G.clock && !G.over)) out.push('clock interval without a clock game');
  return out;
});
async function checkpoint(tag) {
  const t0 = Date.now(); let idle = false;
  while (Date.now() - t0 < 6000) { if (await ev(() => !__wq.loopOn() && !__wq.busy())) { idle = true; break; } await p.waitForTimeout(100); }
  if (!idle) issue('render loop / animation still running 6 s after the last action (' + tag + ')', await ev(() => ({ q: __wq.QM && [__wq.QM.raf, !!__wq.QM.anim, __wq.QM.gest, __wq.QM.rebaseT, !!__wq.QM.pulse], a: __wq.AM && [__wq.AM.raf, !!__wq.AM.anim, __wq.AM.gest, __wq.AM.rebaseT] })));
  const st = await ev(() => ({ clock: __wq.clockOn(), G: !!__wq.G && !__wq.G.over, c: !!(__wq.G && __wq.G.clock), view: __wq.view, modal: !!document.querySelector('.modal.show'), cur: document.querySelector('.screen.active') && document.querySelector('.screen.active').id }));
  if (st.clock && (!st.c || st.view !== 'quiz')) issue('clock interval running outside a clock game on screen', st);
  // the game still reacts: a quiz on screen accepts an answer
  if (st.G && st.view === 'quiz' && !st.modal && st.cur === 'wq') {
    const r0 = await ev(() => __wq.G.phase); if (r0 === 'ask') { const t1 = Date.now(); await answer(); await p.waitForTimeout(400); const ph = await ev(() => __wq.G && __wq.G.phase); if (ph === 'ask' && await ev(() => __wq.G.qs[__wq.G.i].t !== 'mt' && !document.querySelector('.modal.show'))) { if (!(await ev(() => __wq.G.qs[__wq.G.i].typ))) issue('answer not accepted at checkpoint', { ms: Date.now() - t1, acts, info: await ev(() => { const G = __wq.G, q = G.qs[G.i]; const b = document.querySelector(`#wqA button[data-o]`); const r = b && b.getBoundingClientRect(); const e = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { t: q.t, typ: q.typ, ph: G.phase, cls: document.getElementById('wqMain').className, top: e && (e.id || e.className || e.tagName), r: r && [r.left, r.top, r.width, r.height], scr: document.querySelector('.screen.active').id }; }) }); } }
  }
  count.checks = (count.checks || 0) + 1;
}
await p.goto(target); await p.waitForTimeout(400);
await openTile(); await startRandom();
const t0 = Date.now();
for (let a = 0; a < N; a++) {
  const cur = await ev(() => document.querySelector('.screen.active') && document.querySelector('.screen.active').id);
  if (cur !== 'wq') { await openTile(); continue; }
  const r = rnd();
  try {
    if (await vis('wqEndModal')) { await tapSel(pick(['#wqEndAgain', '#wqEndMenu', '#wqEndPractice', '#wqEndAgain'])); await p.waitForTimeout(250); if (await vis('askModal')) await tapSel('#askYes'); count.ends = (count.ends || 0) + 1; }
    else if (await vis('askModal')) { await tapSel(pick(['#askYes', '#askNo'])); }
    else if (await vis('wqStartModal')) { if (rnd() < .25) { await tapSel(pick(['#wqAtlasBtn', '#wqProgBtn'])); count.views = (count.views || 0) + 1; } else if (rnd() < .2 && await ev(() => !document.getElementById('wqResume').hidden)) await tapSel('#wqResume'); else await startRandom(); }
    else if (r < .5) await answer();
    else if (r < .68) await mapGesture();
    else if (r < .75) { await tapSel('#wqNext'); }
    else if (r < .8) { await tapSel('#wqMenu'); count.menu = (count.menu || 0) + 1; }
    else if (r < .84) { await tapSel('#wqBack'); count.back = (count.back || 0) + 1; }
    else if (r < .87) { act('reload'); await p.reload(); await p.waitForTimeout(350); count.reload = (count.reload || 0) + 1; const badge = await ev(() => document.getElementById('tileWq').classList.contains('has-save')), sv = await ev(() => !!localStorage.getItem('wq.save')); if (badge !== sv) issue('badge does not match the save', { badge, sv }); await openTile(); }
    else if (r < .9) { await ev(() => __wq.view === 'atlas' || __wq.view === 'prog') ? await mapGesture() : await tapSel('#wqMenu'); }
    else if (r < .93) { await ev(() => { if (__wq.G && __wq.G.clock) __wq.setClock(300 + Math.random() * 1500); }); }
    else { const vs = await ev(() => __wq.view); if (vs === 'atlas') { await tapSel(`#wqAtlasList button:nth-child(${1 + ri(20)})`); } else if (vs === 'prog') await tapSel(`#wqProgBars button:nth-child(${1 + ri(6)})`); else await answer(); }
  } catch (e) { issue('action failed: ' + e.message.split('\n')[0]); }
  await p.waitForTimeout(ri(4) === 0 ? 0 : 40 + ri(350));
  const bad = await consistent(); if (bad.length) issue('inconsistent after action ' + a, [bad, acts, await ev(() => { const G = __wq.G; return G && { ph: G.phase, ans: G.ans && G.ans.kind, fb: document.getElementById('wqFb').className, t: G.qs[G.i].t, view: __wq.view }; })]);
  if (a % 25 === 24) await checkpoint('a' + a);
  if (Date.now() - t0 > 6.5 * 60000) { console.log('time limit, stopping at', a); break; }
}
await checkpoint('end');
console.log('actions', JSON.stringify(count), 'in', Math.round((Date.now() - t0) / 1000), 's');
console.log(errs.length ? 'PAGE ERRORS ' + errs.slice(0, 5).join(' | ') : 'no page errors');
console.log(issues.length ? `FAIL ${issues.length} issues` : 'PASS fuzz: no issues');
await b.close();
process.exit(issues.length || errs.length ? 1 : 0);
