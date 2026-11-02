// Mijnenveger: levens (niet meteen af), statistieken en winkansen per niveau en aantal levens,
// oude statistieken en een oud bewaard potje blijven werken. Echte tikken op het canvas.
import { existsSync } from 'node:fs';
import { chromium, devices } from 'playwright';
const APP = process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
let fails = 0; const errs = [];
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

async function page(init, landscape) {
  const ctx = await b.newContext(landscape ? { viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(init => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); if (init) for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v); }, init || null);
  await p.goto('file://' + APP); await p.waitForTimeout(400);
  return p;
}
const shown = (p, id) => p.evaluate(id => document.querySelector(id).classList.contains('show'), id);
async function tapCell(p, i) {
  const box = await p.locator('#msCanvas').boundingBox();
  const v = await p.evaluate(() => ({ ...__ms.view, cols: __ms.S.cols }));
  const r = Math.floor(i / v.cols), c = i % v.cols;
  await p.mouse.click(box.x + v.x + (c + .5) * v.s, box.y + v.y + (r + .5) * v.s);
  await p.waitForTimeout(60);
}

// 1. Levens kiezen en doorspelen na een mijn
let p = await page();
await p.tap('#tileMs'); await p.waitForTimeout(300);
ok(await p.isVisible('#msLivesOpt'), 'startscherm: keuze voor levens');
const labels = await p.$$eval('#msLivesOpt button', x => x.map(e => e.textContent));
ok(labels.length === 4 && labels[0].includes('klassiek'), 'levens: 1 (klassiek), 2, 3, 5 — ' + labels.join(' | '));
await p.click('#msLevels button[data-lvl="normaal"]');
await p.click('#msLivesOpt button[data-lives="3"]');
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('ms.settings')).lives === 3), 'keuze bewaard');
await p.click('#msGo'); await p.waitForTimeout(300);
ok(await p.isVisible('#msLives') && (await p.textContent('#msLives')) === '❤️❤️❤️', 'drie hartjes in beeld');
await tapCell(p, 0);
const mine = await p.evaluate(() => __ms.S.mine.findIndex((m, i) => m && __ms.S.st[i] === 0));
await tapCell(p, mine); await p.waitForTimeout(250);
let S = await p.evaluate(() => ({ over: __ms.S.over, hits: __ms.S.hits, st: __ms.S.st[__ms.S.mine.findIndex((m, i) => m && __ms.S.st[i] === 3)] }));
ok(!S.over && S.hits === 1 && S.st === 3, 'mijn geraakt met levens: niet af, de mijn ligt open');
ok((await p.textContent('#msLives')) === '❤️❤️🖤', 'een hartje minder');
ok((await p.textContent('#msToast')).includes('Nog 2 levens') && await p.evaluate(() => document.querySelector('#msToast').classList.contains('show')), 'melding: nog 2 levens');
ok((await p.textContent('#msLeft')) === '39', 'bekende mijn telt als gevonden (39 over)');
await tapCell(p, mine); await p.waitForTimeout(100);
ok(await p.evaluate(m => __ms.S.st[m] === 3 && __ms.S.hits === 1, mine), 'nog eens op de open mijn tikken: niets');
// Opslaan en verdergaan met levens
await p.reload(); await p.waitForTimeout(400);
await p.tap('#tileMs'); await p.waitForTimeout(300);
ok(await p.evaluate(() => __ms.S.lives === 3 && __ms.S.hits === 1 && __ms.S.st.includes(3)) && (await p.textContent('#msLives')) === '❤️❤️🖤', 'na herladen: levens en open mijn terug');
// Akkoord (chord) op een getal naast de bekende mijn telt die mijn als vlag
const chordOk = await p.evaluate(() => { const S = __ms.S; const nb = i => { const r = Math.floor(i / S.cols), c = i % S.cols, o = []; for (let a = -1; a <= 1; a++) for (let d = -1; d <= 1; d++) { if (!a && !d) continue; const rr = r + a, cc = c + d; if (rr >= 0 && cc >= 0 && rr < S.rows && cc < S.cols) o.push(rr * S.cols + cc); } return o; };
  const m = S.st.indexOf(3); for (const j of nb(m)) if (!S.mine[j] && S.adj[j] === 1) { if (S.st[j] !== 1) __ms.reveal(j); const before = S.st.filter(v => v === 1).length; __ms.chord(j); return { hits: S.hits, more: S.st.filter(v => v === 1).length >= before, over: S.over }; } return null; });
ok(!chordOk || (chordOk.hits === 1 && !chordOk.over), 'akkoord naast een bekende mijn: geen extra leven kwijt');
// Nog twee mijnen: af
for (let k = 0; k < 2; k++) { const m = await p.evaluate(() => __ms.S.mine.findIndex((x, i) => x && __ms.S.st[i] === 0)); await tapCell(p, m); await p.waitForTimeout(150); }
ok(await p.evaluate(() => __ms.S.over && !__ms.S.won && __ms.S.hits === 3), 'derde mijn: levens op, af');
await p.waitForTimeout(3600);
ok(await shown(p, '#msEndModal') && (await p.textContent('#msEndText')).includes('levens zijn op'), 'eindscherm: je levens zijn op');
ok((await p.textContent('#msEndOdds')).includes('Jouw winkans op normaal · 3 levens: 0% (0 van 1)'), 'eindscherm toont de winkans: ' + await p.textContent('#msEndOdds'));
let st = await p.evaluate(() => __ms.stats);
ok(st.g['normaal|3'].p === 1 && st.g['normaal|3'].w === 0 && st.hist.length === 1 && st.hist[0].lv === 3 && st.hist[0].c > 0, 'verlies bijgehouden per niveau en levens, met % vrij');

// 2. Winnen met levens, winkans en beste tijd per aantal levens
await p.click('#msEndNew'); await p.waitForTimeout(200);
await tapCell(p, 0);
await p.evaluate(() => { const S = __ms.S; const m = S.mine.findIndex((x, i) => x && S.st[i] === 0); __ms.reveal(m); S.time = 95; for (let i = 0; i < S.mine.length; i++) if (!S.mine[i] && S.st[i] === 0) __ms.reveal(i); });
await p.waitForTimeout(1700);
ok(await shown(p, '#msEndModal') && (await p.textContent('#msEndText')).includes('1× geraakt'), 'gewonnen met levens: geraakt-teller in de uitslag');
ok((await p.textContent('#msEndOdds')).includes('50% (1 van 2)'), 'winkans bijgewerkt: 50%');
st = await p.evaluate(() => __ms.stats);
ok(st.g['normaal|3'].best === 95 && st.best.normaal == null, 'beste tijd telt per aantal levens (niet bij klassiek)');
// Statistiekenscherm
await p.click('#msEndStats'); await p.waitForTimeout(200);
ok(await shown(p, '#msStatsModal'), 'statistieken openen vanaf de uitslag');
ok((await p.textContent('#msStOdds')).includes('50%') && (await p.textContent('#msStOdds')).includes('3 levens'), 'winkans voor normaal · 3 levens');
const grid = await p.$$eval('#msStGrid .stat', x => x.map(e => e.textContent));
ok(grid.some(t => t.includes('Beste tijd') && t.includes('1:35')) && grid.some(t => t.includes('Zonder raken')) && grid.some(t => t.includes('Vrij bij verlies')), 'getallen: beste tijd, zonder raken, vrij bij verlies');
ok((await p.$$eval('#msStHist .dots i', x => x.map(e => e.className))).join() === ',w', 'laatste potjes: verloren, gewonnen');
const rows = await p.$$eval('#msStTable .r', x => x.map(e => e.textContent));
ok(rows.length === 4 && rows[2].includes('50%') && rows[0].includes('–'), 'tabel winkans per aantal levens');
await p.click('#msStLvl button[data-stl="makkelijk"]'); await p.waitForTimeout(80);
ok((await p.textContent('#msStOdds')).includes('Nog niet gespeeld'), 'ander niveau: nog niet gespeeld');
// Terugknop sluit de statistieken
await p.click('#msStClose'); await p.waitForTimeout(200);
ok(!(await shown(p, '#msStatsModal')) && await shown(p, '#msStartModal'), 'sluiten: terug naar het startscherm');
ok((await p.textContent('#msLevels button[data-lvl="normaal"]')).includes('winkans 50%'), 'startscherm: winkans bij het niveau');
await p.screenshot({ path: 'gfx/ms_start_lives.png' });
await p.click('#msStatsBtn'); await p.waitForTimeout(150);
await p.click('#msStLvl button[data-stl="normaal"]'); await p.click('#msStLives button[data-stv="3"]'); await p.waitForTimeout(100);
await p.screenshot({ path: 'gfx/ms_stats.png' });
await p.click('#msStClose');

// 3. Klassiek (1 leven): meteen af; opgeven telt als verloren
await p.click('#msLivesOpt button[data-lives="1"]'); await p.click('#msLevels button[data-lvl="makkelijk"]'); await p.click('#msGo'); await p.waitForTimeout(200);
ok(!(await p.isVisible('#msLives')), 'klassiek: geen hartjes');
await tapCell(p, 40);
await p.click('#msNew'); await p.waitForTimeout(150); await p.click('#msGo'); await p.waitForTimeout(150);
st = await p.evaluate(() => __ms.stats);
ok(st.g['makkelijk|1'].p === 1 && st.hist.at(-1).q === 1 && st.streak === 0, 'begonnen potje weggezet: telt als verloren (opgegeven)');
await tapCell(p, 40);
await p.evaluate(() => { const S = __ms.S; __ms.reveal(S.mine.indexOf(1)); });
ok(await p.evaluate(() => __ms.S.over && __ms.S.hits === 1), 'klassiek: eerste mijn = af');
await p.close();

// 4. Oude statistieken en een oud bewaard potje (zonder levens)
const old = { 'ms.stats': JSON.stringify({ played: 7, won: 3, best: { makkelijk: 41, moeilijk: 400 }, streak: 2 }) };
p = await page(old);
await p.evaluate(() => { const S = { lvl: 'makkelijk', rows: 9, cols: 9, mines: 10, mine: Array(81).fill(0), adj: Array(81).fill(0), st: Array(81).fill(0), first: false, over: false, won: false, time: 12, counted: true, lost: -1 }; for (let i = 0; i < 10; i++) S.mine[i * 8] = 1; S.st[80] = 1; localStorage.setItem('ms.save', JSON.stringify(S)); });
await p.reload(); await p.waitForTimeout(400);
await p.tap('#tileMs'); await p.waitForTimeout(300);
ok(await p.evaluate(() => __ms.S.lives === 1 && __ms.S.hits === 0 && !__ms.S.over), 'oud bewaard potje: verder met 1 leven');
st = await p.evaluate(() => __ms.stats);
ok(st.played === 7 && st.won === 3 && st.g['makkelijk|1'].best === 41 && st.g['moeilijk|1'].best === 400, 'oude statistieken en beste tijden overgenomen');
await p.evaluate(() => __ms.openStats()); await p.waitForTimeout(100);
ok((await p.textContent('#msStTotal')).includes('3 van 7 gewonnen (43%)'), 'totaal blijft: 3 van 7');
await p.close();

// 5. Liggend: statistieken passen
p = await page(null, true);
await p.tap('#tileMs'); await p.waitForTimeout(300); await p.click('#msStatsBtn'); await p.waitForTimeout(150);
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await p.isVisible('#msStClose'), 'liggend: statistieken zonder zijwaarts scrollen, Sluiten bereikbaar');
await p.screenshot({ path: 'gfx/ms_stats_land.png' });
await p.close();

ok(errs.length === 0, 'geen fouten in de console ' + JSON.stringify(errs));
await b.close();
console.log(fails ? fails + ' mislukt' : 'ALL PASS');
process.exit(fails ? 1 : 0);
