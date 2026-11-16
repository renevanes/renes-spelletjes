import { existsSync, mkdirSync } from 'node:fs';
// Logigram screenshots -> build/gfx/lg_*.png, then: python3 games/lgsheet.py  (contact sheet build/gfx/lg_sheet.png)
import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), G = path.join(here, '..', 'build', 'gfx'); mkdirSync(G, { recursive: true });
const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'lgtest', 'index.html'));
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const errs = [];
async function page(port, cfg = '{"seen":"9.99","mute":true}') {
  const ctx = await b.newContext({ viewport: port ? { width: 412, height: 915 } : { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(c => { localStorage.setItem('app.cfg', c); localStorage.setItem('lg.stats', JSON.stringify({ played: 31, won: 27, wonBy: { makkelijk: 9, normaal: 11, moeilijk: 5, expert: 2 }, best: { makkelijk: 74, normaal: 252, moeilijk: 611, expert: 1340 }, hints: 14, noHint: 19, hardNoHint: 2, expert: 2, dailyWon: 6, daily: {}, time: 9000 })); }, cfg);
  await p.goto(target); await p.waitForTimeout(600); return p;
}
const ev = (p, f, a) => p.evaluate(f, a), wait = (p, ms) => p.waitForTimeout(ms), shot = (p, n, clip) => p.screenshot({ path: path.join(G, `lg_${n}.png`), clip });
const open = async p => { await ev(p, () => document.getElementById('tileLg').click()); await wait(p, 700); };
async function puzzle(p, lvl, seed, steps = 0) {
  await ev(p, ([l, s]) => __lg.startNew(l, null, s), [lvl, seed]);
  for (let i = 0; i < 100 && (await ev(p, () => __lg.busy() || !__lg.S)); i++) await wait(p, 40);
  // play a few logical steps (as the hints would), without counting them
  await ev(p, n => { for (let i = 0; i < n; i++) { const h = __lg.Core.hint(__lg.S.P, __lg.S.mk); if (!h || h.k !== 'step') break; __lg.doMark(h.a, h.b, h.v); } __lg.S.t = 151 + n * 3; }, steps);
  await wait(p, 600);
}
// menu tile and the icon
{
  const p = await page(true);
  await ev(p, () => document.getElementById('tileLg').scrollIntoView({ block: 'center' })); await wait(p, 300);
  await shot(p, 'menu_tile', await ev(p, () => { const r = document.getElementById('tileLg').getBoundingClientRect(); return { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12 }; }));
  await ev(p, () => { const i = new Image(); i.id = 'bigIcon'; i.src = document.querySelector('#tileLg .art img').src; i.style.cssText = 'position:fixed;left:40px;top:190px;width:320px;height:320px;padding:10px;box-sizing:border-box;background:#0f1b29;z-index:99999'; document.body.appendChild(i); }); await wait(p, 300);
  await shot(p, 'icon', { x: 40, y: 190, width: 320, height: 320 });
  await ev(p, () => document.getElementById('bigIcon').remove());
  await open(p); await shot(p, 'start_p');
  await puzzle(p, 'normaal', 1234, 26); await shot(p, 'play_p');
  await ev(p, () => __lg.doHint()); await wait(p, 500); await shot(p, 'hint_p');
  await ev(p, () => { __lg.applyHint(); document.querySelector('#lgTabs [data-t="s"]').click(); }); await wait(p, 400); await shot(p, 'summary_p');
  await ev(p, () => document.querySelector('#lgTabs [data-t="c"]').click()); await wait(p, 200);
  await ev(p, () => __lg.openMenu()); await wait(p, 300); await shot(p, 'menu_p');
  await ev(p, () => { document.getElementById('lgMResume').click(); const P = __lg.S.P, N = P.N; for (let c = 1; c < P.K; c++) for (let j = 0; j < N; j++) __lg.doMark(P.ent[c * N + j], c * N + j, 2); }); await wait(p, 2000); await shot(p, 'solved_p');
  await puzzle(p, 'expert', 777, 10); await ev(p, () => document.getElementById('lgFit').click()); await wait(p, 300); await shot(p, 'fit_p');
  await p.close();
}
// landscape
{
  const p = await page(false);
  await open(p); await shot(p, 'start_l');
  await puzzle(p, 'moeilijk', 4321, 40); await shot(p, 'play_l');
  await ev(p, () => __lg.doHint()); await wait(p, 500); await shot(p, 'hint_l');
  await puzzle(p, 'expert', 99, 30); await shot(p, 'expert_l');
  await p.close();
}
// big text
{
  const p = await page(true, '{"seen":"9.99","mute":true,"text":"groot"}');
  await open(p); await puzzle(p, 'makkelijk', 55, 8); await shot(p, 'big_p');
  await p.close();
}
console.log(errs.length ? 'fouten: ' + errs.join('\n') : 'screenshots klaar, geen fouten');
await b.close();
