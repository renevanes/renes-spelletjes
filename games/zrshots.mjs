import { existsSync, mkdirSync } from 'node:fs';
// Zandrijk screenshots -> build/gfx/zr_*.png, then: python3 games/zrsheet.py
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), G = path.join(here, '..', 'build', 'gfx'); mkdirSync(G, { recursive: true });
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'zrtest', 'index.html'));
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [];
async function page(port) {
  const ctx = await b.newContext({ viewport: port ? { width: 412, height: 915 } : { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); localStorage.setItem('zr.stats', JSON.stringify({ games: 6, wins: 4, camp: { 0: { s: 3 }, 1: { s: 2 }, 3: { s: 3 } }, stars: 8, missions: 3, harv: 18400, kills: 96 })); });
  await p.goto(target); await p.waitForTimeout(600); return p;
}
const ev = (p, f, a) => p.evaluate(f, a), wait = (p, ms) => p.waitForTimeout(ms), shot = (p, n, clip) => p.screenshot({ path: path.join(G, `zr_${n}.png`), clip });
const open = async p => { await ev(p, () => document.getElementById('tileZr').click()); await wait(p, 1800); };
// a base grown by the computer (our side too), then handed to the player
async function grown(p, mins, o = {}) {
  await ev(p, ([mins, o]) => { __zr.startSkirmish(Object.assign({ fac: 0, opp: 1, diff: 1, size: 'middel', cry: 3000, seed: 77, kr: true }, o)); const S = __zr.S; S.P[0].ai = 1; __zr.AI.init(S, S.P[0]); S.P[0].A.next = 1e9; S.P[1].A.next = 1e9; __zr.manual(true); __zr.step(Math.round(mins * 60 * 15)); S.P[0].ai = null; __zr.R.P.length = 0; __zr.R.Z.length = 0; document.getElementById('zrToasts').innerHTML = ''; }, [mins, o]);
  await wait(p, 300);
}
const frame = (p, ms = 600) => ev(p, ms => new Promise(r => { __zr.manual(false); setTimeout(() => { __zr.manual(true); r(); }, ms); }), ms);

const p = await page();
await ev(p, () => document.getElementById('tileZr').scrollIntoView({ block: 'center' })); await wait(p, 300);
const tr = await ev(p, () => { const r = document.getElementById('tileZr').getBoundingClientRect(); return { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12 }; });
await shot(p, 'menu_tile', tr);
await open(p); await shot(p, 'start');
await ev(p, () => __zr.openSkirm()); await wait(p, 400); await shot(p, 'factions');
await ev(p, () => __zr.openCamp(0)); await wait(p, 400); await shot(p, 'campaign');
await ev(p, () => document.querySelector('#zrNodes [data-i="2"]').click()); await wait(p, 400); await shot(p, 'briefing');
// a base
await grown(p, 5);
await ev(p, () => { const S = __zr.S, b = S.B.find(b => b.o === 0 && b.t === 'bouw'); __zr.R.cam.z = 30; __zr.R.center(b.x + 3, b.y + 2); __zr.G.selB = S.B.find(b => b.o === 0 && b.t === 'fab')?.id || 0; });
await frame(p); await shot(p, 'base');
await shot(p, 'buildbar', await ev(p, () => { const r = document.getElementById('zrSide').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }));
await shot(p, 'minimap', await ev(p, () => { const r = document.getElementById('zrMiniBox').getBoundingClientRect(); return { x: r.left - 4, y: r.top - 4, width: r.width + 8, height: r.height + 8 }; }));
// harvesting
await ev(p, () => { const S = __zr.S, h = S.U.find(u => u.o === 0 && u.t === 'oog' && u.hs === 'mine') || S.U.find(u => u.o === 0 && u.t === 'oog'); __zr.R.cam.z = 44; __zr.R.center(h.x, h.y); });
await frame(p, 900); await shot(p, 'harvesting');
// placing a building
await ev(p, () => { const S = __zr.S, P = S.P[0]; P.ready = 'fab'; __zr.G.tab = 'b'; const b = S.B.find(b => b.o === 0 && b.t === 'bouw'); __zr.R.cam.z = 30; __zr.R.center(b.x + 2, b.y + 2); document.querySelector('#zrBuild [data-t="fab"]') ? document.querySelector('#zrBuild [data-t="fab"]').click() : 0; });
await frame(p, 500); await shot(p, 'placing');
await ev(p, () => document.getElementById('zrPlaceNo').click());
// the sand creeper hunting a harvester
await ev(p, () => {
  const S = __zr.S, C = __zr.Core; let best = null;
  for (let i = 0; i < S.N && !best; i++) { const x = i % S.W + .5, y = ((i / S.W) | 0) + .5; let open = true; for (let dy = -3; dy <= 3 && open; dy++) for (let dx = -4; dx <= 4; dx++) if (!C.krOk(S, x + dx, y + dy)) { open = false; break; } if (open && Math.hypot(x - S.W / 2, y - S.H / 2) < S.W / 3) best = { x, y }; }
  const u = C.addUnit(S, 0, 'oog', best.x + 1.6, best.y, Math.PI); u.st = 'idle';
  Object.assign(S.kr, { st: 'hunt', tg: u.id, x: best.x - 1.2, y: best.y, px: best.x - 1.2, py: best.y, d: 0, t: 999 }); S.exp.fill(1);
  __zr.R.cam.z = 40; __zr.R.center(best.x, best.y); window.__krU = u.id;
});
await frame(p, 700); await shot(p, 'kruiper');
// a big battle
await ev(p, () => {
  const S = __zr.S, C = __zr.Core, cx = Math.floor(S.W / 2) + 4, cy = Math.floor(S.H / 2), types = ['lt', 'zt', 'sol', 'raks', 'rw', 'verk', 'stral', 'lt'];
  S.kr.st = 'gone'; S.kr.t = 9999; const ids = [[], []];
  for (let o = 0; o < 2; o++) for (let k = 0; k < 50; k++) { const q = C.freeNear(S, cx + (o ? 6 : -6) + (k % 5) * .9, cy - 5 + Math.floor(k / 5), 6); if (!q) continue; ids[o].push(C.addUnit(S, o, o && types[k % 8] === 'stral' ? 'bliks' : types[k % 8], q.x, q.y, o ? Math.PI : 0).id); }
  C.cmd(S, 0, { c: 'amove', ids: ids[0], x: cx + 8, y: cy }); C.cmd(S, 1, { c: 'amove', ids: ids[1], x: cx - 8, y: cy }); S.exp.fill(1); __zr.R.cam.z = 30; __zr.R.center(cx, cy);
});
await frame(p, 4200); await shot(p, 'battle');
// pause and the win screen
await ev(p, () => __zr.openPause()); await wait(p, 300); await shot(p, 'pause');
await ev(p, () => { document.getElementById('zrPResume').click(); const S = __zr.S; for (const b of S.B.filter(b => b.o === 1)) __zr.Core.cmd(S, 1, { c: 'sell', b: b.id }); __zr.manual(false); window.__zrSpeed = 4; });
for (let i = 0; i < 30 && !(await ev(p, () => document.getElementById('zrEndModal').classList.contains('show'))); i++) await wait(p, 250);
await wait(p, 600); await shot(p, 'win');
// a campaign mission with objectives
await ev(p, () => { window.__zrSpeed = 0; __zr.startMission(4, 0); }); await wait(p, 800);
await ev(p, () => { __zr.manual(true); __zr.step(15 * 75); }); await frame(p, 500); await shot(p, 'mission');
// portrait
const q = await page(true); await open(q); await shot(q, 'portrait_start');
await grown(q, 4, { fac: 1, seed: 31 }); await ev(q, () => { const S = __zr.S, b = S.B.find(b => b.o === 0 && b.t === 'bouw'); __zr.R.cam.z = 30; __zr.R.center(b.x + 2, b.y + 3); __zr.G.tab = 'v'; }); await frame(q); await shot(q, 'portrait');
console.log('errors:', errs.length ? errs.join('\n') : 'geen');
await b.close();
