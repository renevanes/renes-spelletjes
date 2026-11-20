// Sudoku: hints that explain why (step by step, with the technique), graded puzzles per level, the expert level.
//   node tests/sd2.mjs            (APP_HTML=… to test another file)
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const APP = process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname;
const GFX = new URL('../build/gfx/', import.meta.url).pathname; mkdirSync(GFX, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
let fails = 0; const errs = [];
const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== '' ? ' ' + x : '')); if (!c) fails++; };
const PORT = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const LAND = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
async function page(o) {
  const p = await (await b.newContext(o)).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('i')) { localStorage.clear(); localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); sessionStorage.setItem('i', 1); } });
  await p.goto('file://' + APP); await p.waitForTimeout(400); return p;
}
const ev = (p, f, a) => p.evaluate(f, a), wait = (p, ms) => p.waitForTimeout(ms);
async function newGame(p, lvl) {
  await ev(p, l => { window.__sdT = performance.now(); __sd.newGame(l); }, lvl);
  for (let k = 0; k < 400 && await ev(p, l => !__sd.S || __sd.S.lvl !== l || document.getElementById('sdBoard').classList.contains('busy'), lvl); k++) await wait(p, 25);
  return ev(p, () => Math.round(performance.now() - window.__sdT));
}
const card = p => ev(p, () => { const h = document.getElementById('sdHint'); return { on: document.getElementById('sd').classList.contains('hinting'), txt: h.textContent, btns: [...h.querySelectorAll('button')].map(b => b.dataset.h) }; });
const click = (p, h) => p.click(`#sdHint button[data-h="${h}"]`);
// one full hint: open, read every step, apply. Returns what happened.
async function oneHint(p) {
  await p.click('#sdTools [data-t="hint"]'); await wait(p, 60);
  const names = [];
  for (let k = 0; k < 20; k++) {
    const c = await card(p); names.push(await ev(p, () => __sd.HX && __sd.HX.steps[__sd.HX.k].name));
    if (/undefined|NaN|\[object/.test(c.txt) || c.txt.length < 40) return { bad: 'tekst: ' + c.txt };
    if (c.btns.includes('next')) { await click(p, 'next'); await wait(p, 30); continue; }
    const fin = await ev(p, () => { const s = __sd.HX.steps[__sd.HX.steps.length - 1]; return s.place ? { i: s.place[0], d: s.place[1] } : null; });
    await click(p, 'go'); await wait(p, 40);
    if (fin) { const v = await ev(p, i => [__sd.S.val[i], __sd.S.sol[i]], fin.i); if (v[0] !== v[1]) return { bad: 'fout ingevuld' }; }
    return { names, steps: names.length };
  }
  return { bad: 'te veel stappen' };
}

/* ---- 1. levels: graded puzzles, quick enough ---- */
let p = await page(PORT);
await p.tap('#tileSd'); await wait(p, 300);
const lv = await ev(p, () => [...document.querySelectorAll('#sdLevels button')].map(b => b.dataset.lvl));
ok(lv.join() === 'makkelijk,normaal,moeilijk,expert,meester', 'vijf niveaus, met Expert en Meester', lv.join());
for (const [lvl, want] of [['makkelijk', g => g.ok && g.lvl === 1], ['normaal', g => g.ok && g.lvl <= 2], ['moeilijk', g => g.ok && (g.lvl === 2 || g.lvl === 3)], ['expert', g => g.ok && g.lvl >= 3 && g.n4 <= 1], ['meester', g => g.ok && g.lvl === 4 && g.n4 >= 2]]) {
  const ms = [], gs = [];
  for (let k = 0; k < 4; k++) { ms.push(await newGame(p, lvl)); gs.push(await ev(p, () => __sd.grade(__sd.S.puz))); }
  ok(gs.every(want), `${lvl}: elke puzzel is met uit te leggen stappen op te lossen en past bij het niveau`, JSON.stringify(gs.map(g => g.lvl + (g.ok ? '' : '!'))));
  ok(Math.max(...ms) < 4000, `${lvl}: maken duurt kort`, ms.join('/') + ' ms');
  ok(await ev(p, () => __sd.S.sol.every((v, i) => !__sd.S.puz[i] || __sd.S.puz[i] === v) && __sd.solve(__sd.S.puz.slice(), 2).count === 1), `${lvl}: precies één oplossing`);
}

/* ---- 2. a hard puzzle solved with nothing but hints: every step explained and right ---- */
await newGame(p, 'expert');
const seen = new Set(); let n = 0, multi = 0, problem = '';
while (n < 81 && !(await ev(p, () => __sd.S.over))) { const r = await oneHint(p); if (r.bad) { problem = r.bad; break; } r.names.forEach(x => seen.add(x.replace(/ in .*| één .*/, ''))); if (r.steps > 1) multi++; n++; }
ok(!problem && await ev(p, () => __sd.S.over && __sd.S.val.every((v, i) => v === __sd.S.sol[i])), 'expert: helemaal opgelost met alleen hints, elke stap goed', problem || `${n} hints`);
ok(multi > 0 && [...seen].some(x => /vleugel|Zwaardvis|Wolkenkrabber|Vlieger|Korte ketting|Kleurketen|XY-ketting|Kwal|Viertal/.test(x)), 'expert: uitleg in meerdere stappen, met een expert- of meestertechniek', [...seen].join(', '));
await wait(p, 1300); if (await ev(p, () => document.getElementById('sdEndModal').classList.contains('show'))) await p.click('#sdEndNew'); await wait(p, 200);
for (let r = 0; r < 2; r++) {
  await newGame(p, 'meester'); const seen4 = new Set(); let n4 = 0, bad4 = '';
  while (n4 < 81 && !(await ev(p, () => __sd.S.over))) { const r = await oneHint(p); if (r.bad) { bad4 = r.bad; break; } r.names.forEach(x => seen4.add(x)); n4++; }
  ok(!bad4 && await ev(p, () => __sd.S.over), `meester ${r + 1}: opgelost met alleen hints, elke stap goed`, bad4 || `${n4} hints`);
  ok([...seen4].some(x => /Wolkenkrabber|Vlieger|Korte ketting|Kleurketen|W-vleugel|XYZ-vleugel|XY-ketting|Kwal/.test(x)), `meester ${r + 1}: met een meestertechniek`, [...seen4].filter(x => !/Enige|Laatste/.test(x)).join(', '));
  await wait(p, 1300); if (await ev(p, () => document.getElementById('sdEndModal').classList.contains('show'))) await p.click('#sdEndNew'); await wait(p, 200);
}

/* ---- 3. a wrong number: the hint says so first, and can take it away ---- */
await newGame(p, 'moeilijk');
const e = await ev(p, () => { const S = __sd.S, i = S.puz.findIndex(v => !v); __sd.select(i); __sd.place(S.sol[i] % 9 + 1); return i; });
await p.click('#sdTools [data-t="hint"]'); await wait(p, 60);
let c = await card(p);
ok(c.on && c.txt.includes('klopt niet') && c.btns.includes('go'), 'fout cijfer: de hint wijst het eerst aan', c.txt.slice(0, 80));
await click(p, 'go'); await wait(p, 60);
ok(await ev(p, i => __sd.S.val[i] === 0 && !document.getElementById('sd').classList.contains('hinting'), e), 'weghalen werkt');

/* ---- 4. a selected cell: explain that cell when it can be done in one step ---- */
const pick = await ev(p, () => { const S = __sd.S, st = __sd.mkState(S.val.slice(), S.elim); for (let i = 0; i < 81; i++) if (!S.val[i]) { const h = __sd.hintSteps(S.val, S.elim, i); if (h.steps.length === 1 && h.steps[0].place[0] === i) return i; } return -1; });
await ev(p, i => __sd.select(i), pick); await p.click('#sdTools [data-t="hint"]'); await wait(p, 60);
ok(pick >= 0 && await ev(p, i => __sd.HX.steps.at(-1).place[0] === i, pick), 'gekozen vakje: de hint gaat over dat vakje');
await p.screenshot({ path: GFX + 'sd_hint_single.png' });
ok(await ev(p, () => window.appBack()) && await ev(p, () => !__sd.HX && document.querySelector('.screen.active').id === 'sd'), 'terugknop sluit eerst de hint');

/* ---- 5. find an advanced step and look at it (portrait and landscape) ---- */
async function toAdvanced(p, lvl = 'expert', want = 3) {
  await newGame(p, lvl);
  for (let k = 0; k < 81; k++) {
    const adv = await ev(p, w => { const S = __sd.S, h = __sd.hintSteps(S.val, S.elim, null); return h.steps.some(s => s.lvl >= w); }, want);
    if (adv) return true;
    await ev(p, () => { const S = __sd.S, h = __sd.hintSteps(S.val, S.elim, null); for (const s of h.steps) for (const [i, d] of s.elim || []) S.elim[i] |= 1 << d; const s = h.steps.at(-1); if (s && s.place) { __sd.select(s.place[0]); __sd.place(s.place[1]); } });
  }
  return false;
}
ok(await toAdvanced(p), 'staand: een moeilijke stap gevonden');
await ev(p, () => __sd.select(-1)); await p.click('#sdTools [data-t="hint"]'); await wait(p, 80);
let k3 = await ev(p, () => __sd.HX.steps.findIndex(s => s.lvl >= 3));
for (let k = 0; k < k3; k++) { await click(p, 'next'); await wait(p, 30); }
c = await card(p);
const look = await ev(p, () => ({ del: document.querySelectorAll('#sdBoard .sd-n.hx i.del').length, pat: document.querySelectorAll('#sdBoard .hx-pat').length, pad: getComputedStyle(document.getElementById('sdPad')).display, fit: document.getElementById('sdHint').getBoundingClientRect().bottom <= innerHeight + 1 }));
ok(look.del > 0 && look.pat >= 3 && look.pad === 'none' && look.fit, 'staand: patroon geel, af te strepen cijfers rood, uitleg past op het scherm', JSON.stringify(look));
ok(/Stap \d van \d/.test(c.txt), 'staand: stappen genummerd', c.txt.slice(0, 60));
await p.screenshot({ path: GFX + 'sd_hint_adv.png' });
if (c.btns.includes('next')) { await click(p, 'next'); await wait(p, 40); }
await p.screenshot({ path: GFX + 'sd_hint_adv2.png' });
// close half way: the explained eliminations are kept (they are true) and saved
const elim0 = await ev(p, () => __sd.S.elim.reduce((a, m) => a + (m ? 1 : 0), 0));
await click(p, 'x'); await wait(p, 60);
const elim1 = await ev(p, () => __sd.S.elim.reduce((a, m) => a + (m ? 1 : 0), 0));
ok(elim1 > elim0 && await ev(p, () => __sd.S.elim.every((m, i) => !(m & (1 << __sd.S.sol[i])))), 'sluiten: uitgelegde afstrepingen blijven, nooit het juiste cijfer', `${elim0} -> ${elim1}`);
await ev(p, () => window.appBack()); await wait(p, 200); await p.tap('#tileSd'); await wait(p, 300);
ok(await ev(p, n => __sd.S.elim.reduce((a, m) => a + (m ? 1 : 0), 0) === n, elim1), 'opgeslagen en terug: afstrepingen bewaard');
await p.close();

p = await page(LAND);
await p.tap('#tileSd'); await wait(p, 300);
ok(await toAdvanced(p), 'liggend: een moeilijke stap gevonden');
await p.click('#sdTools [data-t="hint"]'); await wait(p, 80);
k3 = await ev(p, () => __sd.HX.steps.findIndex(s => s.lvl >= 3)); for (let k = 0; k < k3; k++) { await click(p, 'next'); await wait(p, 30); }
const lk = await ev(p, () => { const h = document.getElementById('sdHint').getBoundingClientRect(), bd = document.getElementById('sdBoard').getBoundingClientRect(); return { fit: h.bottom <= innerHeight + 1 && h.right <= innerWidth + 1, side: h.left >= bd.right - 1, sw: document.documentElement.scrollWidth <= innerWidth }; });
ok(lk.fit && lk.side && lk.sw, 'liggend: uitleg naast het bord, past', JSON.stringify(lk));
await p.screenshot({ path: GFX + 'sd_hint_land.png' });
await p.close();
p = await page(PORT); await p.tap('#tileSd'); await wait(p, 300);
ok(await toAdvanced(p, 'meester', 4), 'meester: een meesterstap gevonden');
await ev(p, () => __sd.select(-1)); await p.click('#sdTools [data-t="hint"]'); await wait(p, 80);
const k4 = await ev(p, () => __sd.HX.steps.findIndex(s => s.lvl === 4)); for (let k = 0; k < k4; k++) { await click(p, 'next'); await wait(p, 30); }
c = await card(p); ok(c.txt.length > 100, 'meester: uitleg van de meesterstap', c.txt.slice(0, 90));
await p.screenshot({ path: GFX + 'sd_hint_meester.png' });
await p.close();

/* ---- Controle: only filled-in numbers, wrong ones flash red for a moment ---- */
for (const o of [PORT, LAND]) {
  const nm = o === PORT ? 'staand' : 'liggend';
  p = await page(o); await p.tap('#tileSd'); await wait(p, 300);
  await ev(p, () => { __sd.opt.errors = 'uit'; }); await newGame(p, 'normaal');
  const vis = await ev(p, () => { const r = document.getElementById('sdCheck').getBoundingClientRect(); return r.width > 36 && r.right <= innerWidth && r.bottom <= innerHeight; });
  ok(vis, `${nm}: knop Controle zichtbaar`);
  await p.click('#sdCheck'); await wait(p, 100);
  ok((await p.textContent('#sdToast')).includes('nog geen'), `${nm}: leeg: nog geen cijfers ingevuld`);
  const [g1, g2, w1, n1] = await ev(p, () => { const S = __sd.S, e = []; for (let i = 0; i < 81; i++) if (!S.puz[i]) e.push(i); return e.slice(0, 4); });
  await ev(p, ([g1, g2, w1, n1]) => { const S = __sd.S; __sd.select(g1); __sd.place(S.sol[g1]); __sd.select(g2); __sd.place(S.sol[g2]); __sd.select(w1); __sd.place(S.sol[w1] % 9 + 1);
    __sd.opt.pencil = true; __sd.select(n1); for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 9]) if (d !== S.sol[n1] && (d % 3 === 0 || d === 1)) __sd.place(d); __sd.opt.pencil = false; }, [g1, g2, w1, n1]);
  await p.click('#sdCheck'); await wait(p, 400);
  const r = await ev(p, ([g1, w1, n1]) => ({ w: document.querySelector(`.sd-c[data-i="${w1}"]`).className, g: document.querySelector(`.sd-c[data-i="${g1}"]`).className, n: document.querySelector(`.sd-c[data-i="${n1}"]`).className, t: document.getElementById('sdToast').textContent, c: __sd.S.checks }), [g1, w1, n1]);
  ok(r.w.includes('chk') && !r.g.includes('chk') && r.c === 1 && /1 cijfer klopt niet/.test(r.t), `${nm}: fout cijfer licht rood op, goede niet`, r.t);
  ok(!r.n.includes('chk') && !/potlood/.test(r.t), `${nm}: potloodnotities worden niet gecontroleerd`);
  await p.screenshot({ path: GFX + `sd_check_${o === PORT ? 'p' : 'l'}.png` });
  await wait(p, 3000);
  ok(!(await ev(p, i => document.querySelector(`.sd-c[data-i="${i}"]`).className.includes('chk'), w1)), `${nm}: arcering na een paar seconden weg`);
  ok(await ev(p, () => !('chk' in JSON.parse(localStorage.getItem('sd.save') || '{}'))), `${nm}: niet bewaard`);
  await ev(p, w1 => { __sd.select(w1); __sd.place(__sd.S.sol[w1]); }, w1);
  await p.click('#sdCheck'); await wait(p, 200);
  ok((await p.textContent('#sdToast')).includes('kloppen'), `${nm}: alles goed: "Alle … cijfers kloppen"`, await p.textContent('#sdToast'));
  if (o === PORT) {
    const nh = await ev(p, () => JSON.parse(localStorage.getItem('sd.stats') || '{}').noHelp || 0);
    await ev(p, () => { const S = __sd.S; for (let i = 0; i < 81; i++) if (S.val[i] !== S.sol[i]) { __sd.select(i); __sd.place(S.sol[i]); } }); await wait(p, 1400);
    ok((await p.textContent('#sdEndText')).includes('gecontroleerd') && (await ev(p, () => JSON.parse(localStorage.getItem('sd.stats')).noHelp || 0)) === nh, 'eindscherm noemt de controle, telt niet als zonder hulp');
  }
  await p.close();
}

/* ---- Zaklamp: one digit stays lit ---- */
for (const o of [PORT, LAND]) {
  const nm = o === PORT ? 'staand' : 'liggend';
  p = await page(o); await p.tap('#tileSd'); await wait(p, 300); await newGame(p, 'normaal');
  const vis = await ev(p, () => { const r = document.getElementById('sdLamp').getBoundingClientRect(); return r.width > 36 && r.right <= innerWidth && r.bottom <= innerHeight; });
  ok(vis, `${nm}: knop Zaklamp zichtbaar`);
  const d = await ev(p, () => { const S = __sd.S, c = {}; S.puz.forEach(v => { if (v) c[v] = (c[v] || 0) + 1; }); return +Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; });
  await p.tap('#sdLamp'); await wait(p, 100);
  ok((await p.textContent('#sdLamp small')).includes('Kies') && await ev(p, () => document.querySelectorAll('#sdPad button.lamp').length === 9), `${nm}: zaklamp vraagt om een cijfer`);
  const before = await ev(p, () => __sd.S.val.join(''));
  await p.tap(`#sdPad button[data-d="${d}"]`); await wait(p, 150);
  const st = await ev(p, d => { const S = __sd.S, c = i => document.querySelector(`.sd-c[data-i="${i}"]`).className; let lampOk = true, darkOk = true, litOk = true;
    for (let i = 0; i < 81; i++) { const v = S.val[i], cl = c(i), blocked = !v && __sd.S.val.some((x, j) => x === d && j !== i && (Math.floor(j / 9) === Math.floor(i / 9) || j % 9 === i % 9 || (Math.floor(j / 27) === Math.floor(i / 27) && Math.floor(j % 9 / 3) === Math.floor(i % 9 / 3))));
      if (v === d && !cl.includes('lamp')) lampOk = false; if (blocked && !cl.includes('dark')) darkOk = false; if (!v && !blocked && !cl.includes('lit')) litOk = false; }
    return { lamp: S.lamp, lampOk, darkOk, litOk, badge: document.querySelector('#sdLamp em')?.textContent }; }, d);
  ok(st.lamp === d && st.lampOk && st.darkOk && st.litOk && st.badge === String(d), `${nm}: cijfer ${d} licht op, plekken waar het kan licht, de rest donker`, JSON.stringify(st));
  ok((await ev(p, () => __sd.S.val.join(''))) === before, `${nm}: kiezen zet geen cijfer in het rooster`);
  // stays on while selecting and placing other numbers
  await ev(p, () => { const S = __sd.S, i = S.puz.findIndex(v => !v); __sd.select(i); __sd.place(S.sol[i]); }); await wait(p, 100);
  ok(await ev(p, d => __sd.S.lamp === d && document.querySelectorAll('.sd-c.lamp').length >= 1, d), `${nm}: blijft aan bij selecteren en invullen`);
  await p.screenshot({ path: GFX + `sd_lamp_${o === PORT ? 'p' : 'l'}.png` });
  // long press on another number: lamp switches
  const d2 = d % 9 + 1, box = await ev(p, d2 => { const r = document.querySelector(`#sdPad button[data-d="${d2}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, d2);
  const cnt = await ev(p, () => __sd.S.val.join(''));
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await wait(p, 700); await p.mouse.up(); await wait(p, 150);
  ok(await ev(p, ([d2, c]) => __sd.S.lamp === d2 && __sd.S.val.join('') === c, [d2, cnt]), `${nm}: cijfer vasthouden zet de zaklamp op dat cijfer`);
  await p.tap('#sdLamp'); await wait(p, 100);
  ok(await ev(p, () => !__sd.S.lamp && !document.querySelector('.sd-c.lit, .sd-c.dark')), `${nm}: zaklamp uit`);
  await p.close();
}

/* ---- 6. the start dialog explains the techniques ---- */
p = await page(PORT); await p.tap('#tileSd'); await wait(p, 300);
await p.click('.sd-tech summary'); await wait(p, 100);
ok((await p.textContent('.sd-tech')).includes('X-vleugel') && await ev(p, () => document.querySelector('.sd-tech').open), 'startscherm: uitleg van de technieken');
await p.screenshot({ path: GFX + 'sd_tech.png', fullPage: false });
await p.close();

ok(errs.length === 0, 'geen fouten in de console', JSON.stringify(errs.slice(0, 3)));
await b.close();
console.log(fails ? fails + ' mislukt' : 'ALL PASS');
process.exit(fails ? 1 : 0);
