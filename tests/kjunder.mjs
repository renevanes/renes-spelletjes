import { existsSync as require_exists } from 'node:fs';
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (require_exists('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('app.cfg', '{"seen":"9.99"}'); localStorage.setItem('kj.settings', JSON.stringify({ speed: 'turbo', level: 'normaal', rounds: 4 })); });
await p.goto('file://' + (process.env.APP_HTML || new URL('../build/web/index.html', import.meta.url).pathname)); await p.waitForTimeout(500);
await p.tap('#tileKj'); await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const K = __kj, G = K.G, C = (s, r) => s * 13 + r - 1, out = {};
  G.trump = 0; G.phase = 'play'; G.turn = 0;
  G.trick = [{ p: 2, c: C(3, 12) }, { p: 3, c: C(0, 11) }];                 // Maat ♣ vrouw, Rechts ♠ boer (troef)
  G.hands[0] = [C(0, 7), C(2, 7), C(2, 10)];                                 // ♠7, ♦7, ♦10 – no clubs
  const nm = c => ['♠', '♥', '♦', '♣'][Math.floor(c / 13)] + ((c % 13) + 1);
  for (const u of ['nee', 'mag', 'moet']) { K.opt.under = u; out[u] = { legal: K.legal(0).map(nm), hint: K.ruleHint() }; }
  K.opt.under = 'nee'; G.hands[0] = [C(0, 7), C(0, 8)]; out.onlyTrumps = { legal: K.legal(0).map(nm) };
  G.hands[0] = [C(0, 7), C(0, 9), C(2, 7)]; out.canOver = { legal: K.legal(0).map(nm), hint: K.ruleHint() };   // ♠9 > ♠boer? no: boer is highest, so cannot
  G.trick = [{ p: 2, c: C(3, 12) }, { p: 3, c: C(0, 12) }]; out.overQueen = { legal: K.legal(0).map(nm), hint: K.ruleHint() };     // ♠ vrouw on table: ♠9 can go over
  K.opt.under = 'nee'; return out;
});
console.log(JSON.stringify(r, null, 1));
let ok = true; const check = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); if (!c) ok = false; };
check('officieel: only diamonds allowed', JSON.stringify(r.nee.legal) === '["♦7","♦10"]');
check('officieel hint explains', r.nee.hint.includes('troefboer') && r.nee.hint.includes('andere kaart'));
check('mag: all allowed', r.mag.legal.length === 3);
check('moet: only trump', JSON.stringify(r.moet.legal) === '["♠7"]');
check('only trumps: may undertrump', r.onlyTrumps.legal.length === 2);
check('over queen: must play ♠9', JSON.stringify(r.overQueen.legal) === '["♠9"]' && r.overQueen.hint.includes('troefvrouw'));
check('no errors', !errs.length); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close();
