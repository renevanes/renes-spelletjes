// Zeeslag: statistieken en winkansen per computerniveau, met z'n tweeën per tweetal namen,
// opgegeven potjes, oude statistieken blijven gelden. Het laatste schot gaat via een echte tik.
import { existsSync } from 'node:fs';
import { chromium, devices } from 'playwright';
const APP = process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
let fails = 0; const errs = [];
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function page(init, land) {
  const p = await (await b.newContext(land ? { ...devices['Pixel 7 landscape'] } : { ...devices['Pixel 7'] })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(init => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); if (init) for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v); }, init || null);
  await p.goto('file://' + APP); await p.waitForTimeout(400);
  return p;
}
const shown = (p, id) => p.evaluate(id => document.querySelector(id).classList.contains('show'), id);
// Start een potje tegen de computer op een niveau, vloot willekeurig, klaar
async function start(p, level) {
  if (!(await shown(p, '#zsStartModal'))) { await p.click('#zsOptBtn'); await p.waitForTimeout(150); }
  await p.click(`#zsStartList button[data-key="mode"][data-val='"cpu"']`);
  await p.click(`#zsStartList button[data-key="level"][data-val='"${level}"']`);
  await p.click('#zsGo'); await p.waitForTimeout(200);
  await p.click('#zsArea [data-a="rand"]'); await p.click('#zsArea [data-a="done"]'); await p.waitForTimeout(300);
}
// Alle vijandelijke schepen raken op één vakje na (met een paar missers), dan het laatste schot met een echte tik
async function winByTap(p) {
  const last = await p.evaluate(() => { const S = __zs.S, b = S.boards[1]; const cells = b.ships.flatMap(s => s.cells); const lastC = cells.pop();
    for (const [r, c] of cells) { __zs.fire(b, r, c); S.shots[0]++; S.hits[0]++; }
    let m = 0; for (let r = 0; r < 10 && m < 6; r++) for (let c = 0; c < 10 && m < 6; c++) if (!b.shots[r][c] && !cells.concat([lastC]).some(([y, x]) => y === r && x === c)) { __zs.fire(b, r, c); S.shots[0]++; m++; }
    return lastC; });
  await p.click(`#zsArea .zs-board.target .zs-cell[data-r="${last[0]}"][data-c="${last[1]}"]`);
  await p.waitForTimeout(2200);
}

let p = await page();
await p.tap('#tileZs'); await p.waitForTimeout(300);
ok(await p.isVisible('#zsStatsBtn') && (await p.textContent('.zs-odds-line')).includes('Jouw winkans'), 'startscherm: winkans per niveau en knop Statistieken');
// 1. Winnen op normaal
await start(p, 'normaal');
await winByTap(p);
ok(await shown(p, '#zsEndModal') && await p.evaluate(() => __zs.S.phase === 'over' && __zs.S.winner === 0), 'laatste schip gezonken met een tik: gewonnen');
ok((await p.textContent('#zsEndOdds')).includes('normale computer: 100% (1 van 1)'), 'uitslag toont winkans: ' + await p.textContent('#zsEndOdds'));
let st = await p.evaluate(() => __zs.stats);
ok(st.g.normaal.p === 1 && st.g.normaal.w === 1 && st.g.normaal.best === 23 && st.hist.length === 1 && st.played === 1 && st.won === 1, 'winst bijgehouden: per niveau, minste schoten 23, totalen');
// 2. Verliezen op normaal
await p.click('#zsEndNew'); await p.waitForTimeout(200);
await p.click('#zsArea [data-a="rand"]'); await p.click('#zsArea [data-a="done"]'); await p.waitForTimeout(300);
await p.evaluate(() => { const S = __zs.S; for (const s of S.boards[0].ships) for (const [r, c] of s.cells) __zs.fire(S.boards[0], r, c); __zs.fire(S.boards[1], ...S.boards[1].ships[4].cells[0]); __zs.fire(S.boards[1], ...S.boards[1].ships[4].cells[1]); S.shots[0] = 9; S.hits[0] = 2; __zs.end(1); });
await p.waitForTimeout(3600);
ok(await shown(p, '#zsEndModal') && (await p.textContent('#zsEndOdds')).includes('50% (1 van 2)'), 'verloren: winkans 50%');
st = await p.evaluate(() => __zs.stats);
ok(st.g.normaal.streak === 0 && st.g.normaal.top === 1 && st.g.normaal.sunkL === 1 && st.hist[1].w === 0 && st.hist[1].k === 1, 'verlies: reeks weer 0, 1 schip gezonken bijgehouden');
// 3. Opgeven telt als verloren
await p.click('#zsEndNew'); await p.waitForTimeout(200);
await p.click('#zsArea [data-a="rand"]'); await p.click('#zsArea [data-a="done"]'); await p.waitForTimeout(300);
await p.click('#zsOptBtn'); await p.waitForTimeout(150); await p.click('#zsGo'); await p.waitForTimeout(200);
st = await p.evaluate(() => __zs.stats);
ok(st.g.normaal.p === 3 && st.hist[2].q === 1, 'lopend potje weggelegd: telt als verloren (opgegeven)');
// 4. Statistiekenscherm
await p.click('#zsArea [data-a="rand"]'); await p.click('#zsArea [data-a="done"]'); await p.waitForTimeout(200);
await p.evaluate(() => __zs.openStats()); await p.waitForTimeout(150);
ok(await shown(p, '#zsStatsModal') && (await p.textContent('#zsStBody .ms-odds')).includes('33%'), 'statistieken: winkans normaal 33%');
const grid = await p.$$eval('#zsStBody .stat', x => x.map(e => e.textContent));
ok(grid.some(t => t.includes('Minste schoten') && t.includes('23')) && grid.some(t => t.includes('Raak')) && grid.some(t => t.includes('Gezonken bij verlies')), 'getallen: minste schoten, raak, gezonken bij verlies');
ok((await p.$$eval('#zsStBody .dots i', x => x.map(e => e.className))).join() === 'w,,q', 'laatste potjes: gewonnen, verloren, opgegeven');
ok((await p.$$eval('#zsStBody .ms-lvtable .r', x => x.length)) === 3, 'tabel winkans per niveau');
await p.click('#zsStTab button[data-st="moeilijk"]'); await p.waitForTimeout(80);
ok((await p.textContent('#zsStBody')).includes('Nog niet gespeeld'), 'moeilijk: nog niet gespeeld');
await p.screenshot({ path: 'gfx/zs_stats_empty.png' });
await p.click('#zsStTab button[data-st="normaal"]'); await p.waitForTimeout(80);
await p.screenshot({ path: 'gfx/zs_stats.png' });
await p.click('#zsStClose'); await p.waitForTimeout(150);
ok(!(await shown(p, '#zsStatsModal')), 'sluiten');
// 5. Met z'n tweeën: per tweetal namen
await p.click('#zsOptBtn'); await p.waitForTimeout(150);
await p.click(`#zsStartList button[data-key="mode"][data-val='"2p"']`);
await p.fill('#zsStartList input[data-name="name1"]', 'Anna'); await p.fill('#zsStartList input[data-name="name2"]', 'Bram');
await p.click('#zsGo'); await p.waitForTimeout(200);
await p.evaluate(() => { const S = __zs.S; __zs.randomize(S.boards[0]); __zs.randomize(S.boards[1]); S.phase = 'play'; for (const s of S.boards[0].ships) for (const [r, c] of s.cells) __zs.fire(S.boards[0], r, c); __zs.end(1); });
await p.waitForTimeout(900);
ok((await p.textContent('#zsEndOdds')).includes('Anna – Bram: 0 – 1'), 'samen: stand tussen de namen');
st = await p.evaluate(() => __zs.stats);
ok(st.duo['Anna|Bram'].p === 1 && st.duo['Anna|Bram'].w[1] === 1 && st.g.normaal.p === 4, 'samen telt niet mee bij de computer');
await p.click('#zsEndStats'); await p.waitForTimeout(150);
ok((await p.textContent('#zsStTab button.on')).includes('Samen') && (await p.textContent('#zsStBody')).includes('Anna 0 – 1 Bram'), 'statistieken: tabblad Samen met de stand');
await p.close();

// 6. Oude statistieken blijven, liggend past het
p = await page({ 'zs.stats': JSON.stringify({ played: 12, won: 5, shots: 400, hits: 120 }) }, true);
await p.tap('#tileZs'); await p.waitForTimeout(300);
await p.evaluate(() => __zs.openStats()); await p.waitForTimeout(150);
ok((await p.textContent('#zsStBody')).includes('5 van 12 gewonnen (42%)'), 'oude totalen blijven: 5 van 12');
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await p.isVisible('#zsStClose'), 'liggend: past, Sluiten bereikbaar');
await p.close();

ok(errs.length === 0, 'geen fouten in de console ' + JSON.stringify(errs));
await b.close();
console.log(fails ? fails + ' mislukt' : 'ALL PASS');
process.exit(fails ? 1 : 0);
