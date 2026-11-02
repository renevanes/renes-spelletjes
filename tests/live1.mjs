// Statistieken tijdens het spel.
// Mijnenveger: live regel, knop Kansen, kansen kloppen exact (vergeleken met alles uitproberen), met Kansen geen beste tijd.
// Zeeslag: live winkans en cijfers per vloot, getrokken liggingen kloppen met alle schoten, uit te zetten, snel genoeg.
import { existsSync } from 'node:fs';
import { chromium, devices } from 'playwright';
const APP = process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
let fails = 0; const errs = [];
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function page(land) {
  const ctx = await b.newContext(land ? { ...devices['Pixel 7 landscape'] } : { ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('app.cfg', '{"seen":"9.99"}'));
  await p.goto('file://' + APP); await p.waitForTimeout(400);
  return { p, ctx };
}

/* ================= Mijnenveger ================= */
let { p, ctx } = await page();
await p.tap('#tileMs'); await p.waitForTimeout(300);
ok(await p.isVisible('#msLiveOpt'), 'startscherm: optie Statistieken tijdens het spel');
await p.click('#msLevels button[data-lvl="makkelijk"]'); await p.click('#msGo'); await p.waitForTimeout(200);
ok(await p.isVisible('#msLive') && (await p.textContent('#msLiveTxt')).includes('eerste tik is veilig'), 'live regel in beeld, voor de eerste tik');
const box = await p.locator('#msCanvas').boundingBox(), v = await p.evaluate(() => __ms.view);
await p.mouse.click(box.x + v.x + 4.5 * v.s, box.y + v.y + 4.5 * v.s); await p.waitForTimeout(400);
const t1 = await p.textContent('#msLiveTxt');
ok(/Vrij \d+% · \d+ te gaan · mijnkans \d+%/.test(t1), 'na de eerste tik: ' + t1);
const dens = await p.evaluate(() => { const S = __ms.S, u = S.st.filter(x => x === 0 || x === 2).length; return Math.round(S.mines / u * 100); });
ok(t1.includes('mijnkans ' + dens + '%'), 'mijnkans = mijnen over / dichte vakjes');
ok(await p.evaluate(() => !__ms.S.helped), 'zonder Kansen: gewoon potje');
await p.click('#msKans'); await p.waitForTimeout(250);
ok(await p.getAttribute('#msKans', 'aria-pressed') === 'true' && await p.evaluate(() => __ms.S.helped), 'Kansen aan: knop ingedrukt, potje telt als met hulp');
ok((await p.textContent('#msToast')).includes('telt niet als beste tijd'), 'melding: telt niet als beste tijd');
const t2 = await p.textContent('#msLiveTxt');
ok(/zeker veilig|beste gok \d+% veilig/.test(t2), 'live regel met Kansen: ' + t2);
// Exact: vergelijk met alle mogelijke liggingen uitproberen, op 25 eindspellen met weinig dichte vakjes
const cmp = await p.evaluate(() => {
  const out = []; let worst = 0, checked = 0;
  for (let g = 0; g < 25; g++) {
    __ms.newGame('makkelijk'); const S = __ms.S; __ms.reveal(40);
    // open veilige vakjes in willekeurige volgorde tot er weinig dichte over zijn
    const safe = []; for (let i = 0; i < 81; i++) if (!S.mine[i] && S.st[i] === 0) safe.push(i);
    safe.sort(() => Math.random() - .5);
    for (const i of safe) { if (S.st.filter(x => x === 0).length <= 16 + (g % 3)) break; if (S.st[i] === 0) __ms.reveal(i); }
    if (S.over) continue;
    // af en toe een mijn als bekend markeren (zoals na een geraakt leven)
    if (g % 4 === 0) { const m = S.mine.findIndex((x, i) => x && S.st[i] === 0); if (m >= 0) S.st[m] = 3; }
    const P = __ms.mineProbs(), unk = []; for (let i = 0; i < 81; i++) if (S.st[i] === 0 || S.st[i] === 2) unk.push(i);
    let M = S.mines - S.st.filter(x => x === 3).length;
    const cons = []; const nb = i => { const r = Math.floor(i / 9), c = i % 9, o = []; for (let a = -1; a <= 1; a++) for (let d = -1; d <= 1; d++) { if (!a && !d) continue; const y = r + a, x = c + d; if (y >= 0 && x >= 0 && y < 9 && x < 9) o.push(y * 9 + x); } return o; };
    for (let i = 0; i < 81; i++) if (S.st[i] === 1) cons.push([i, nb(i)]);
    const cnt = new Float64Array(81); let tot = 0;
    const mine = new Uint8Array(81); for (let i = 0; i < 81; i++) if (S.st[i] === 3) mine[i] = 1;
    const rec = (k, left) => {
      if (left === 0 || k === unk.length) {
        if (left) return;
        for (const [i, ns] of cons) { let s = 0; for (const j of ns) s += mine[j]; if (s !== S.adj[i]) return; }
        tot++; for (const j of unk) if (mine[j]) cnt[j]++; return;
      }
      if (unk.length - k < left) return;
      mine[unk[k]] = 1; rec(k + 1, left - 1); mine[unk[k]] = 0; rec(k + 1, left);
    };
    rec(0, M);
    if (!tot) continue;
    for (const j of unk) { worst = Math.max(worst, Math.abs(cnt[j] / tot - P.p[j])); }
    checked++; out.push(P.exact);
  }
  return { worst, checked, exact: out.every(Boolean) };
});
ok(cmp.checked >= 15 && cmp.exact && cmp.worst < 1e-6, `kansen exact gelijk aan alles uitproberen (${cmp.checked} eindspellen, grootste verschil ${cmp.worst.toExponential(1)})`);
// Met Kansen gewonnen: geen beste tijd
await p.evaluate(() => { __ms.opt.kans = true; __ms.newGame('makkelijk'); const S = __ms.S; __ms.reveal(40); S.time = 3; for (let i = 0; i < 81; i++) if (!S.mine[i] && S.st[i] === 0) __ms.reveal(i); });
await p.waitForTimeout(1700);
ok(await p.evaluate(() => __ms.S.won && __ms.S.helped && __ms.grp('makkelijk', 1).best == null && __ms.stats.best.makkelijk == null), 'met Kansen gewonnen: geen beste tijd');
ok((await p.textContent('#msEndText')).includes('Met Kansen gespeeld'), 'uitslag zegt: met Kansen gespeeld');
// Live uitzetten: regel weg en bord krijgt de ruimte
await p.click('#msEndMenu'); await p.waitForTimeout(150);
const h0 = await p.evaluate(() => document.querySelector('#msWrap').clientHeight);
await p.click('#msLiveOpt button[data-live="false"]'); await p.click('#msGo'); await p.waitForTimeout(200);
ok(!(await p.isVisible('#msLive')) && await p.evaluate(h => document.querySelector('#msWrap').clientHeight > h, h0), 'live uit: regel weg, bord groter');
ok(await p.evaluate(() => !__ms.S.helped), 'live uit: nieuw potje telt gewoon (ook al stond Kansen aan)');
// Snelheid van de kansberekening op moeilijk, 6× trager
await p.click('#msOptBtn'); await p.click('#msLiveOpt button[data-live="true"]'); await p.click('#msLevels button[data-lvl="moeilijk"]'); await p.click('#msGo'); await p.waitForTimeout(200);
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
const ms = await p.evaluate(() => { const S = __ms.S; __ms.reveal(240); let worst = 0, n = 0; for (let k = 0; k < 40 && !S.over; k++) { const i = S.mine.findIndex((x, j) => !x && S.st[j] === 0 && Math.random() < .05); if (i < 0) continue; __ms.reveal(i); const t0 = performance.now(); __ms.mineProbs(); worst = Math.max(worst, performance.now() - t0); n++; } return { worst, n }; });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
ok(ms.n > 10 && ms.worst < 120, `kansen op moeilijk bij 6× trager: hoogstens ${Math.round(ms.worst)} ms per zet (${ms.n} zetten)`);
await p.screenshot({ path: 'gfx/ms_live.png' });
await p.close();

/* ================= Zeeslag ================= */
({ p, ctx } = await page());
await p.tap('#tileZs'); await p.waitForTimeout(300);
ok(await p.isVisible(`#zsStartList button[data-key="live"]`), 'Zeeslag: optie Statistieken tijdens het spel');
await p.click(`#zsStartList button[data-key="level"][data-val='"normaal"']`);
await p.click('#zsGo'); await p.waitForTimeout(200); await p.click('#zsArea [data-a="rand"]'); await p.click('#zsArea [data-a="done"]');
await p.waitForTimeout(2500);
let txt = await p.textContent('#zsLive');
ok(/Jij \d+%/.test(txt) && /\d+% Computer/.test(txt), 'live winkans in beeld: ' + txt.replace(/\s+/g, ' ').slice(0, 60));
ok(txt.includes('Jij: 0 schoten') && txt.includes('nog 17 vakjes te raken'), 'cijfers per vloot');
// Een paar echte tikken: cijfers lopen mee, en de kans wordt opnieuw berekend
for (let k = 0; k < 3; k++) {
  await p.waitForFunction(() => __zs.S.turn === 0 && !document.querySelector('#zsMsg.show'), null, { timeout: 15000 }).catch(() => {});
  const cell = await p.evaluate(() => { const b = __zs.S.boards[1]; for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if (!b.shots[r][c] && (r + c) % 3 === 0) return [r, c]; });
  await p.click(`#zsArea .zs-board.target .zs-cell[data-r="${cell[0]}"][data-c="${cell[1]}"]`); await p.waitForTimeout(1500);
}
await p.waitForTimeout(2500);
const L = await p.evaluate(() => ({ live: __zs.live, shots: __zs.S.shots.slice() }));
ok(L.live && L.live.key === L.shots[0] + L.shots[1] && L.live.n >= 20, `winkans na de laatste zet opnieuw berekend (${L.live && L.live.n} proefpotjes)`);
ok((await p.textContent('#zsLive')).includes(`Jij: ${L.shots[0]} schot`), 'schoten tellen mee');
// Getrokken liggingen kloppen altijd met de schoten (raak = schip, mis = water, gezonken blijft)
const cons = await p.evaluate(() => {
  let bad = 0, nulls = 0;
  for (let g = 0; g < 30; g++) {
    const b = __zs.emptyBoard(); __zs.randomize(b);
    for (let k = 0; k < 20 + g * 2; k++) { const r = Math.floor(Math.random() * 10), c = Math.floor(Math.random() * 10); __zs.fire(b, r, c); }
    for (let t = 0; t < 10; t++) {
      const h = __zs.sampleHidden(b); if (!h) { nulls++; continue; }
      const at = (bb, r, c) => bb.ships.find(s => s.cells.some(([y, x]) => y === r && x === c));
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const v = b.shots[r][c], s = at(h, r, c); if (v === 2 && !s) bad++; if ((v === 1 || v === 3) && s) bad++; }
      h.ships.forEach((s, i) => { if (b.ships[i].sunk && JSON.stringify(s.cells) !== JSON.stringify(b.ships[i].cells)) bad++; if (!b.ships[i].sunk && s.cells.every(([y, x]) => b.shots[y][x] === 2)) bad++; });
    }
  }
  return { bad, nulls };
});
ok(cons.bad === 0 && cons.nulls < 30, `300 getrokken liggingen kloppen met de schoten (${cons.nulls} keer geen ligging gevonden)`);
// Ijking: normaal tegen normaal met elk 16 van de 17 vakjes geraakt → ongeveer gelijk; jij bijna klaar → hoog
const cal = await p.evaluate(() => {
  const S = __zs.S, A = __zs.copyBoard(S.boards[0]), B = __zs.copyBoard(S.boards[1]);
  const all = b => b.ships.flatMap(s => s.cells);
  all(B).slice(0, 16).forEach(([r, c]) => __zs.fire(B, r, c));
  let w = 0; for (let k = 0; k < 200; k++) { const h = __zs.sampleHidden(B); w += __zs.playOut([__zs.copyBoard(A), h], 0, ['normaal', 'normaal']) === 0 ? 1 : 0; }
  return w / 200;
});
ok(cal > .9, `bijna alle schepen van de ander geraakt en jij aan de beurt: winkans ${Math.round(cal * 100)}%`);
// 6× trager: één proefpotje (ook tegen de moeilijke computer) is kort, en er wordt in stukjes van ~8 ms gerekend
const cdp2 = await ctx.newCDPSession(p); await cdp2.send('Emulation.setCPUThrottlingRate', { rate: 6 });
const per = await p.evaluate(() => { const S = __zs.S; let worst = 0; for (let k = 0; k < 25; k++) { const t0 = performance.now(); const h = __zs.sampleHidden(S.boards[1]); __zs.playOut([__zs.copyBoard(S.boards[0]), h], 0, ['normaal', 'moeilijk']); worst = Math.max(worst, performance.now() - t0); } return worst; });
await cdp2.send('Emulation.setCPUThrottlingRate', { rate: 1 });
ok(per < 40, `6× trager: langste proefpotje ${Math.round(per)} ms (rekenen in stukjes, het spel blijft soepel)`);
await p.screenshot({ path: 'gfx/zs_live.png' });
// Uitzetten
await p.click('#zsOptBtn'); await p.waitForTimeout(150); await p.click(`#zsStartList button[data-key="live"][data-val='false']`);
await p.click('#zsResume'); await p.waitForTimeout(200);
ok(!(await p.isVisible('#zsLive')), 'live uit: balk weg');
await p.close();
// Liggend
({ p, ctx } = await page(true));
await p.tap('#tileZs'); await p.waitForTimeout(300); await p.click('#zsGo'); await p.waitForTimeout(200); await p.click('#zsArea [data-a="rand"]'); await p.click('#zsArea [data-a="done"]'); await p.waitForTimeout(2500);
const fit = await p.evaluate(() => { const a = document.querySelector('#zsArea').getBoundingClientRect(), t = document.querySelector('.zs-wrap-target').getBoundingClientRect(), l = document.querySelector('#zsLive').getBoundingClientRect(); return t.bottom <= a.bottom + 1 && l.top >= a.top - 1 && document.documentElement.scrollWidth <= innerWidth + 1; });
ok(fit, 'liggend: winkansbalk en borden passen');
await p.screenshot({ path: 'gfx/zs_live_land.png' });
await p.close();

ok(errs.length === 0, 'geen fouten in de console ' + JSON.stringify(errs));
await b.close();
console.log(fails ? fails + ' mislukt' : 'ALL PASS');
process.exit(fails ? 1 : 0);
