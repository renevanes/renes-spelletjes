import { existsSync, readFileSync } from 'node:fs';
// Dakrenner solvability test: every level is finished by its recorded input script (drsrc/solutions.json, made by drsolve.mjs).
//  1. in Node, through the deterministic core: finish, all three golden shoes, no crash, within the gold time;
//  2. in the browser (test copy or APP_HTML), through the game's real input path: the same bits are "held" exactly like the
//     touch buttons hold them, the game loop's own step function runs, and the results screen must show the medal.
//   node games/drsolv.mjs [path-to-index.html]        (NODE_ONLY=1 skips the browser part)
import path from 'path'; import { fileURLToPath } from 'url';
import { load } from './drsrc/load.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const sol = JSON.parse(readFileSync(path.join(here, 'drsrc', 'solutions.json'), 'utf8'));
const { Core, LEVELS, buildLevel, ST } = load();
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); };
const nodeRes = {};
for (let i = 0; i < LEVELS.length; i++) {
  const s = sol[i + 1]; if (!s) { ok(`level ${i + 1}: oplossing aanwezig`, false); continue; }
  const L = buildLevel(LEVELS[i], i), S = Core.newState(L, { noEv: true });
  for (let k = 0; k < s.rle.length && !S.done; k += 2) for (let n = 0; n < s.rle[k + 1] && !S.done; n++) Core.step(L, S, s.rle[k]);
  nodeRes[i] = S.fin;
  ok(`level ${String(i + 1).padStart(2)} ${LEVELS[i].n.padEnd(26)} (Node)`, S.done === 1 && S.coins === 7 && S.crashes === 0 && S.fin <= s.medals[0] && s.frames === S.fin, `${(S.fin / 60).toFixed(2)} s · goud ${(s.medals[0] / 60).toFixed(0)} s · zilver ${(s.medals[1] / 60).toFixed(0)} s · brons ${(s.medals[2] / 60).toFixed(0)} s`);
}
if (!process.env.NODE_ONLY) {
  const { chromium } = await import('playwright');
  const target = 'file://' + path.resolve(process.argv[2] || process.env.APP_HTML || path.join(here, '..', 'build', 'work', 'drtest', 'index.html'));
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
  const p = await (await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99","mute":true}'); });
  await p.goto(target); await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('tileDr').click()); await p.waitForTimeout(300);
  let golds = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    const s = sol[i + 1]; if (!s) continue;
    const r = await p.evaluate(([i, rle]) => {
      __dr.startLevel(i); __dr.manual(true);
      for (let k = 0; k < rle.length; k += 2) for (let n = 0; n < rle[k + 1]; n++) { if (__dr.S.done) break; __dr.hold(rle[k]); __dr.step(1); }
      __dr.hold(0); for (let n = 0; n < 200 && !__dr.G.resultsUp; n++) __dr.step(1);
      const st = JSON.parse(localStorage.getItem('dr.stats')); const lv = st.lv[i] || {};
      return { done: __dr.S.done, fin: __dr.S.fin, coins: __dr.S.coins, crashes: __dr.S.crashes, results: document.getElementById('drEndModal').classList.contains('show'), title: document.getElementById('drEndTitle').textContent, medal: lv.m, shoes: lv.c };
    }, [i, s.rle]);
    if (r.medal === 3) golds++;
    ok(`level ${String(i + 1).padStart(2)} (browser, echte invoer): finish, 3 schoentjes, resultaatscherm`, r.done === 1 && r.coins === 7 && r.results && r.fin === nodeRes[i] && r.shoes === 7, `${r.title} · ${(r.fin / 60).toFixed(2)} s`);
    await p.evaluate(() => document.getElementById('drEndModal').classList.remove('show'));
  }
  ok('goud gehaald in alle levels', golds === LEVELS.length, `${golds}/${LEVELS.length}`);
  const open = await p.evaluate(() => { __dr.openLevels(); return [...document.querySelectorAll('#drWorlds button')].filter(b => !b.classList.contains('lock')).length; });
  ok('alle werelden open na alle levels', open === 4);
  ok('geen consolefouten', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
}
console.log(`\n${pass} geslaagd, ${fail} mislukt`); process.exit(fail ? 1 : 0);
