// Loads the rules + computer-player part of the Klaverjas module into Node (no browser), so tournaments and
// position tests can run fast. Used by tests/kjtourney.mjs and tests/kjai.mjs.
//   loadKj('new')   -> the module in app/src/main/assets/index.html (or APP_SRC)
//   loadKj('old')   -> the baseline in tests/fixtures/kj-baseline.js (main before "Klaverjas sterker")
//   loadKj('x.js' or 'x.html') -> a saved module slice or another copy of index.html
// Options: { seed, timeScale }  seed: deterministic Math.random; timeScale: performance.now() runs this many times
// faster than real time (2 = emulate a phone that is twice as slow: the AI gets half the samples in its time budget).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;

export function moduleSource(which) {
  if (which === 'old') return readFileSync(root + 'tests/fixtures/kj-baseline.js', 'utf8');
  if (which.endsWith('.js')) return readFileSync(which, 'utf8');                 // a saved module slice (for comparisons)
  const src = readFileSync(which.endsWith('.html') ? which : process.env.APP_SRC || root + 'app/src/main/assets/index.html', 'utf8');
  const a = src.indexOf('const Klaverjas = (() => {'), b = src.indexOf('  /* ---------- UI ---------- */', a);
  if (a < 0 || b < 0) throw new Error('Klaverjas module not found');
  return src.slice(a, b);
}

export function rng(seed) {                       // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function loadKj(which, { seed = 1, timeScale = 1, settings = {} } = {}) {
  const t0 = performance.now(), R = rng(seed);
  const math = Object.create(Math); math.random = R;
  const ctx = {
    Math: math, console, setTimeout, clearTimeout,
    performance: { now: () => (performance.now() - t0) * timeScale },
    crypto: { getRandomValues: a => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(R() * 4294967296); return a; } },
    store: { get: (k, d) => k === 'kj.settings' ? Object.assign({ lv2: true }, settings) : d, set() {}, del() {} },
    Sfx: { gate() {}, play() {} }, current: 'menu', anyModal: () => false,
    $: () => null, document: {}, window: {},
  };
  vm.createContext(ctx);
  const code = moduleSource(which) + `
  const __bid = (p, forced, only) => (opt.level === 'moeilijk' ? aiBidStrong : aiBid)(p, forced, only);
  return { get G() { return G; }, set G(v) { G = v; }, opt, legal, winnerOf, roemOf, aiPlay, aiHeur, aiStrong, aiBid, aiBidStrong, bid: __bid,
    x: Object.fromEntries(['aiEasy', 'makeSearch', 'makeBidSearch', 'AIP', 'qEval', 'qFeat', 'QF', 'QW', 'maskOf', 'knowledge', 'hPick', 'xFromGame', 'xH', 'bidState', 'playOut', 'suitStrength']
      .map(n => { try { return [n, eval(n)]; } catch { return [n, null]; } })), ev: s => eval(s) };
})();
Klaverjas;`;
  return vm.runInContext(code.replace('const Klaverjas = (() => {', 'var Klaverjas = (() => {'), ctx, { filename: which + '-klaverjas.js' });
}
